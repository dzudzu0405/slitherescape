<?php
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';

if (!is_installed()) {
    redirect('install.php');
}
if (current_user()) {
    redirect('dashboard.php');
}

$error = '';
$email = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = strtolower(trim($_POST['email'] ?? ''));
    $ip = client_ip();
    if (!csrf_valid($_POST['csrf'] ?? null)) {
        $error = 'Your session expired. Please try again.';
    } elseif (login_blocked($ip)) {
        $error = 'Too many failed attempts. Please wait 15 minutes and try again.';
    } else {
        $user = db_one('SELECT id, password_hash FROM users WHERE email = ?', [$email]);
        if ($user && password_verify((string)($_POST['password'] ?? ''), $user['password_hash'])) {
            if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
                db_exec('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash((string)$_POST['password'], PASSWORD_DEFAULT), $user['id']]);
            }
            $granted = apply_pending_plans((int)$user['id']);
            log_in((int)$user['id'], !empty($_POST['remember']));
            if ($granted) flash(implode(', ', $granted) . ' ' . (count($granted) > 1 ? 'are' : 'is') . ' active on your account.');
            redirect('dashboard.php');
        }
        record_failed_login($ip);
        $error = 'Wrong email or password.';
    }
}

$f = flash();
$pending = array_map(fn($p) => ACCESS_PLANS[$p], pending_plans());
$google = google_configured();
page_head('Log in', 'auth', ['bare' => true]);
?>
<main class="auth-box">
  <div class="auth-brand">
    <?= brand_logo() ?>
    <h1>SlitherEscape <em>Studio</em></h1>
    <p>Printable escape games built from Slitherlink puzzles</p>
  </div>
  <div class="card">
    <?php if ($f): ?><div class="alert <?= h($f['kind']) ?>"><?= h($f['msg']) ?></div><?php endif; ?>
    <?php if ($error): ?><div class="alert err"><?= h($error) ?></div><?php endif; ?>
    <?php if ($pending): ?><div class="alert info">Sign in to activate <b><?= h(implode(', ', $pending)) ?></b>.</div><?php endif; ?>
    <?php if ($google): ?>
    <a class="btn lg block google-btn" href="google-login.php">
      <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.5z"/></svg>
      Continue with Google
    </a>
    <div class="auth-or"><span>or sign in with email</span></div>
    <?php endif; ?>
    <form method="post" autocomplete="on">
      <?= csrf_field() ?>
      <label class="field">
        <span>Email</span>
        <input type="email" name="email" required autofocus value="<?= h($email) ?>">
      </label>
      <label class="field">
        <span>Password</span>
        <input type="password" name="password" required autocomplete="current-password">
      </label>
      <label class="toggle small" style="margin: 2px 0 18px">
        <input type="checkbox" name="remember" value="1" checked><span class="track"></span> Keep me signed in
      </label>
      <button class="btn primary lg block" type="submit">Log in</button>
    </form>
  </div>
  <p class="auth-foot">Forgot your password? Open <span class="mono">install.php?reset</span> on your site.</p>
</main>
<?php page_foot(); ?>
