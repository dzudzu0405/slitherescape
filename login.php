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
            log_in((int)$user['id'], !empty($_POST['remember']));
            redirect('dashboard.php');
        }
        record_failed_login($ip);
        $error = 'Wrong email or password.';
    }
}

page_head('Log in', 'auth', ['bare' => true]);
?>
<main class="auth-box">
  <div class="auth-brand">
    <?= brand_logo() ?>
    <h1>SlitherEscape <em>Studio</em></h1>
    <p>Printable escape games built from Slitherlink puzzles</p>
  </div>
  <div class="card">
    <?php if ($error): ?><div class="alert err"><?= h($error) ?></div><?php endif; ?>
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
