<?php
// Purchase links and Google sign-in.
// Each plan has one secret link (access.php?k=...). Opening it while signed in adds the plan;
// opening it signed out remembers the plan and asks the buyer to sign in with Google first.
// The owner can make a new link for any plan in admin.php, which stops the old one working.
declare(strict_types=1);

// ------------------------------------------------------------------ settings

function setting(string $name, string $default = ''): string
{
    $row = db_one('SELECT value FROM settings WHERE name = ?', [$name]);
    return $row ? (string)$row['value'] : $default;
}

function set_setting(string $name, string $value): void
{
    db_exec('DELETE FROM settings WHERE name = ?', [$name]);
    db_exec('INSERT INTO settings (name, value) VALUES (?, ?)', [$name, $value]);
}

// Full URL of a file in the app folder, e.g. https://example.com/studio/access.php.
function app_url(string $path): string
{
    $dir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
    $host = (string)($_SERVER['HTTP_HOST'] ?? 'localhost');
    return (is_https() ? 'https' : 'http') . '://' . $host . $dir . '/' . ltrim($path, '/');
}

// ------------------------------------------------------------------ purchase links

function access_key(string $plan): string
{
    $key = setting('access_key_' . $plan);
    if ($key === '') $key = new_access_key($plan);
    return $key;
}

function new_access_key(string $plan): string
{
    $key = bin2hex(random_bytes(16));
    set_setting('access_key_' . $plan, $key);
    return $key;
}

function access_url(string $plan): string
{
    return app_url('access.php?k=' . access_key($plan));
}

function plan_for_key(string $key): ?string
{
    if ($key === '') return null;
    foreach (array_keys(ACCESS_PLANS) as $plan) {
        $saved = setting('access_key_' . $plan);
        if ($saved !== '' && hash_equals($saved, $key)) return $plan;
    }
    return null;
}

// Sales page for a plan, shown on locked features. Set per plan in admin.php,
// falling back to 'upgrade_url' in config.php.
function upgrade_url(string $plan): string
{
    $url = setting('upgrade_url_' . $plan);
    return $url !== '' ? $url : (string)(config()['upgrade_url'] ?? '');
}

// The FE plan is the account itself; OTO plans are rows in entitlements.
function grant_plan(int $userId, string $plan, string $source): void
{
    if (!isset(PLANS[$plan])) return;
    if (!db_one('SELECT 1 AS x FROM entitlements WHERE user_id = ? AND plan = ?', [$userId, $plan])) {
        db_exec('INSERT INTO entitlements (user_id, plan, source, created_at) VALUES (?, ?, ?, ?)', [$userId, $plan, $source, now()]);
    }
}

function pending_plans(): array
{
    start_session();
    return array_values(array_filter((array)($_SESSION['pending_plans'] ?? []), fn($p) => isset(ACCESS_PLANS[$p])));
}

function add_pending_plan(string $plan): void
{
    start_session();
    $_SESSION['pending_plans'] = array_values(array_unique(array_merge(pending_plans(), [$plan])));
}

// Grants the plans from links opened before signing in. Returns their names.
function apply_pending_plans(int $userId): array
{
    $names = [];
    foreach (pending_plans() as $plan) {
        grant_plan($userId, $plan, 'link');
        $names[] = ACCESS_PLANS[$plan];
    }
    unset($_SESSION['pending_plans']);
    return $names;
}

// ------------------------------------------------------------------ Google sign-in

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

function google_configured(): bool
{
    return setting('google_client_id') !== '' && setting('google_client_secret') !== '';
}

function google_redirect_uri(): string
{
    return app_url('google-callback.php');
}

function google_auth_url(): string
{
    start_session();
    $_SESSION['google_state'] = bin2hex(random_bytes(16));
    $_SESSION['google_nonce'] = bin2hex(random_bytes(16));
    return GOOGLE_AUTH_URL . '?' . http_build_query([
        'client_id' => setting('google_client_id'),
        'redirect_uri' => google_redirect_uri(),
        'response_type' => 'code',
        'scope' => 'openid email profile',
        'state' => $_SESSION['google_state'],
        'nonce' => $_SESSION['google_nonce'],
        'prompt' => 'select_account',
    ]);
}

// POSTs a form and returns the decoded JSON reply. Uses cURL when the host has it.
function http_post_form(string $url, array $fields): array
{
    $body = http_build_query($fields);
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
        ]);
        $raw = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);
        if ($raw === false) throw new RuntimeException('Could not reach Google: ' . $err);
    } else {
        $raw = @file_get_contents($url, false, stream_context_create(['http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content' => $body,
            'timeout' => 15,
            'ignore_errors' => true,
        ]]));
        if ($raw === false) throw new RuntimeException('Could not reach Google. Ask your host to enable cURL or allow_url_fopen.');
    }
    $data = json_decode((string)$raw, true);
    return is_array($data) ? $data : [];
}

// Swaps the code from Google's redirect for the signed-in Google account.
// The ID token comes straight from Google's token endpoint over HTTPS with our client secret,
// so its claims are checked here without verifying the JWT signature (OpenID Connect 3.1.3.7).
function google_account(string $code, string $state): array
{
    start_session();
    $expected = (string)($_SESSION['google_state'] ?? '');
    $nonce = (string)($_SESSION['google_nonce'] ?? '');
    unset($_SESSION['google_state'], $_SESSION['google_nonce']);
    if ($expected === '' || !hash_equals($expected, $state)) {
        throw new RuntimeException('The sign-in link expired. Please try again.');
    }
    $token = http_post_form(GOOGLE_TOKEN_URL, [
        'code' => $code,
        'client_id' => setting('google_client_id'),
        'client_secret' => setting('google_client_secret'),
        'redirect_uri' => google_redirect_uri(),
        'grant_type' => 'authorization_code',
    ]);
    if (empty($token['id_token'])) {
        throw new RuntimeException('Google did not sign you in' . (isset($token['error']) ? ' (' . $token['error'] . ')' : '') . '. Please try again.');
    }
    $parts = explode('.', (string)$token['id_token']);
    $claims = count($parts) === 3 ? json_decode((string)base64_decode(strtr($parts[1], '-_', '+/')), true) : null;
    if (!is_array($claims)
        || !in_array($claims['iss'] ?? '', ['https://accounts.google.com', 'accounts.google.com'], true)
        || ($claims['aud'] ?? '') !== setting('google_client_id')
        || (int)($claims['exp'] ?? 0) < time()
        || !hash_equals($nonce, (string)($claims['nonce'] ?? ''))) {
        throw new RuntimeException('Google returned a sign-in we could not check. Please try again.');
    }
    if (empty($claims['email']) || empty($claims['email_verified'])) {
        throw new RuntimeException('Your Google account has no verified email address.');
    }
    return ['email' => strtolower((string)$claims['email']), 'name' => (string)($claims['name'] ?? '')];
}
