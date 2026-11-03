<?php
// One-time installer: checks the server, creates the tables and the owner account,
// and writes config.php. With ?reset it resets the owner's password instead.
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';

$isLocal = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);
$mode = isset($_GET['reset']) ? 'reset' : (is_installed() ? 'done' : 'install');
$errors = [];
$success = false;
$old = $_POST;

// ------------------------------------------------------------------ server checks
$checks = [
    ['PHP 8.0 or newer', version_compare(PHP_VERSION, '8.0.0', '>='), 'This server runs PHP ' . PHP_VERSION . '. Choose PHP 8.x in cPanel → Select PHP Version.'],
    ['PDO MySQL extension', extension_loaded('pdo_mysql') || ($isLocal && extension_loaded('pdo_sqlite')), 'Enable "pdo_mysql" in cPanel → Select PHP Version → Extensions.'],
    ['mbstring extension', extension_loaded('mbstring'), 'Enable "mbstring" in cPanel → Select PHP Version → Extensions.'],
    ['App folder is writable', is_writable(__DIR__), 'Set the folder permission to 755 in File Manager so config.php can be written.'],
];
$checksOk = !in_array(false, array_column($checks, 1), true);

function write_config(array $cfg): bool
{
    $php = "<?php\n// Written by install.php. Keep this file private.\nreturn " . var_export($cfg, true) . ";\n";
    return file_put_contents(CONFIG_FILE, $php, LOCK_EX) !== false;
}

function protect_data_dir(): void
{
    @mkdir(DATA_DIR . '/sessions', 0700, true);
    @file_put_contents(DATA_DIR . '/.htaccess', "Require all denied\nDeny from all\n");
    @file_put_contents(DATA_DIR . '/index.html', '');
}

// ------------------------------------------------------------------ install
if ($mode === 'install' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_valid($_POST['csrf'] ?? null)) {
        $errors[] = 'Your session expired. Please submit the form again.';
    }
    $driver = ($isLocal && ($_POST['driver'] ?? '') === 'sqlite') ? 'sqlite' : 'mysql';
    $db = $driver === 'sqlite'
        ? ['driver' => 'sqlite', 'path' => DATA_DIR . '/local.sqlite']
        : [
            'driver' => 'mysql',
            'host' => trim($_POST['db_host'] ?? 'localhost') ?: 'localhost',
            'port' => (int)($_POST['db_port'] ?? 3306) ?: 3306,
            'name' => trim($_POST['db_name'] ?? ''),
            'user' => trim($_POST['db_user'] ?? ''),
            'pass' => (string)($_POST['db_pass'] ?? ''),
        ];
    $email = strtolower(trim($_POST['email'] ?? ''));
    $pass = (string)($_POST['password'] ?? '');
    $shop = trim($_POST['shop_name'] ?? '');

    if (!$checksOk) $errors[] = 'Fix the server requirements above first.';
    if ($driver === 'mysql' && ($db['name'] === '' || $db['user'] === '')) $errors[] = 'Enter the database name and user from cPanel → MySQL Databases.';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'Enter a valid email address.';
    if (strlen($pass) < 8) $errors[] = 'The password needs at least 8 characters.';
    if ($pass !== ($_POST['password2'] ?? '')) $errors[] = 'The two passwords do not match.';

    if (!$errors) {
        try {
            if ($driver === 'sqlite') protect_data_dir();
            $pdo = db_connect($db);
            foreach (schema_sql($driver) as $sql) $pdo->exec($sql);
            $exists = $pdo->prepare('SELECT id FROM users WHERE email = ?');
            $exists->execute([$email]);
            $hash = password_hash($pass, PASSWORD_DEFAULT);
            if ($row = $exists->fetch()) {
                $pdo->prepare('UPDATE users SET password_hash = ?, shop_name = ?, is_admin = 1, updated_at = ? WHERE id = ?')
                    ->execute([$hash, $shop, now(), $row['id']]);
            } else {
                $pdo->prepare('INSERT INTO users (email, password_hash, shop_name, is_admin, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)')
                    ->execute([$email, $hash, $shop, now(), now()]);
            }
            protect_data_dir();
            if (!write_config(['db' => $db, 'secret' => bin2hex(random_bytes(32)), 'installed_at' => now()])) {
                $errors[] = 'Could not write config.php. Check the folder permission (755) and try again.';
            } else {
                $success = true;
            }
        } catch (PDOException $e) {
            $errors[] = 'Could not connect to the database: ' . $e->getMessage()
                . ' — check the name, user and password, and that the user is added to the database with ALL PRIVILEGES.';
        }
    }
}

// ------------------------------------------------------------------ password reset
// Proves access to the server by asking for the database password from config.php.
if ($mode === 'reset' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!is_installed()) {
        $errors[] = 'The app is not installed yet.';
    } elseif (!csrf_valid($_POST['csrf'] ?? null)) {
        $errors[] = 'Your session expired. Please submit the form again.';
    } else {
        $db = config()['db'];
        $email = strtolower(trim($_POST['email'] ?? ''));
        $pass = (string)($_POST['password'] ?? '');
        $proof = ($db['driver'] ?? 'mysql') === 'sqlite' ? $isLocal : hash_equals((string)$db['pass'], (string)($_POST['db_pass'] ?? ''));
        if (!$proof) $errors[] = 'The database password is not correct.';
        if (strlen($pass) < 8) $errors[] = 'The new password needs at least 8 characters.';
        if ($pass !== ($_POST['password2'] ?? '')) $errors[] = 'The two passwords do not match.';
        if (!$errors) {
            $n = db_exec('UPDATE users SET password_hash = ?, updated_at = ? WHERE email = ?', [password_hash($pass, PASSWORD_DEFAULT), now(), $email]);
            if ($n) $success = true; else $errors[] = 'No account uses that email address.';
        }
    }
}

page_head($mode === 'reset' ? 'Reset password' : 'Install', 'auth', ['bare' => true]);
?>
<main class="auth-box" style="max-width:520px">
  <div class="auth-brand">
    <?= brand_logo() ?>
    <h1>SlitherEscape <em>Studio</em></h1>
    <p><?= $mode === 'reset' ? 'Reset the owner password' : 'Installation' ?></p>
  </div>
  <div class="card">
  <?php if ($mode === 'done'): ?>
    <div class="alert ok">SlitherEscape Studio is already installed.</div>
    <p class="small muted">To change the database settings, edit <span class="mono">config.php</span> in File Manager. To start over, delete <span class="mono">config.php</span> and open this page again.</p>
    <a class="btn primary lg block" href="login.php">Go to login</a>

  <?php elseif ($success && $mode === 'install'): ?>
    <div class="alert ok"><b>Installed.</b> Your tables and owner account are ready.</div>
    <p class="small">For safety you can now delete <span class="mono">install.php</span> in File Manager. Keep it if you want to use the password reset later.</p>
    <a class="btn primary lg block" href="login.php">Log in</a>

  <?php elseif ($success && $mode === 'reset'): ?>
    <div class="alert ok">Password changed.</div>
    <a class="btn primary lg block" href="login.php">Log in</a>

  <?php elseif ($mode === 'reset'): ?>
    <?php foreach ($errors as $e): ?><div class="alert err"><?= h($e) ?></div><?php endforeach; ?>
    <form method="post">
      <?= csrf_field() ?>
      <p class="small muted">To prove you own this server, enter the MySQL password you used during installation (it is in <span class="mono">config.php</span>).</p>
      <label class="field"><span>Database password</span><input type="password" name="db_pass" autocomplete="off"></label>
      <label class="field"><span>Account email</span><input type="email" name="email" required value="<?= h($old['email'] ?? '') ?>"></label>
      <div class="row">
        <label class="field"><span>New password</span><input type="password" name="password" required minlength="8" autocomplete="new-password"></label>
        <label class="field"><span>Repeat it</span><input type="password" name="password2" required minlength="8" autocomplete="new-password"></label>
      </div>
      <button class="btn primary lg block" type="submit">Reset password</button>
    </form>

  <?php else: ?>
    <h3 style="margin-bottom:10px">1. Server check</h3>
    <ul class="checklist" style="margin-bottom:18px">
      <?php foreach ($checks as [$label, $ok, $fix]): ?>
      <li><span class="check-icon <?= $ok ? 'ok' : 'err' ?>"><?= $ok ? '✓' : '×' ?></span><div><b><?= h($label) ?></b><?php if (!$ok): ?><small><?= h($fix) ?></small><?php endif; ?></div></li>
      <?php endforeach; ?>
    </ul>

    <?php foreach ($errors as $e): ?><div class="alert err"><?= h($e) ?></div><?php endforeach; ?>
    <form method="post" autocomplete="off">
      <?= csrf_field() ?>
      <h3 style="margin-bottom:6px">2. Database</h3>
      <p class="small muted">Create a database and a user in cPanel → MySQL Databases, and add the user to the database with ALL PRIVILEGES.</p>
      <?php if ($isLocal && !extension_loaded('pdo_mysql')): ?>
        <label class="toggle small" style="margin-bottom:12px"><input type="checkbox" name="driver" value="sqlite" checked><span class="track"></span> Local test: use SQLite instead of MySQL</label>
      <?php endif; ?>
      <div class="row">
        <label class="field"><span>Database name</span><input type="text" name="db_name" placeholder="cpaneluser_slither" value="<?= h($old['db_name'] ?? '') ?>"></label>
        <label class="field"><span>Database user</span><input type="text" name="db_user" placeholder="cpaneluser_admin" value="<?= h($old['db_user'] ?? '') ?>"></label>
      </div>
      <div class="row">
        <label class="field"><span>Database password</span><input type="password" name="db_pass" autocomplete="new-password"></label>
        <label class="field"><span>Host</span><input type="text" name="db_host" value="<?= h($old['db_host'] ?? 'localhost') ?>"></label>
      </div>

      <h3 style="margin:8px 0 6px">3. Your account</h3>
      <label class="field"><span>Shop name</span><input type="text" name="shop_name" placeholder="Printed on every PDF footer" value="<?= h($old['shop_name'] ?? '') ?>"></label>
      <label class="field"><span>Email</span><input type="email" name="email" required value="<?= h($old['email'] ?? '') ?>"></label>
      <div class="row">
        <label class="field"><span>Password</span><input type="password" name="password" required minlength="8" autocomplete="new-password"></label>
        <label class="field"><span>Repeat password</span><input type="password" name="password2" required minlength="8" autocomplete="new-password"></label>
      </div>
      <button class="btn primary lg block" type="submit" <?= $checksOk ? '' : 'disabled' ?>>Install</button>
    </form>
  <?php endif; ?>
  </div>
</main>
<?php page_foot(); ?>
