<?php
// Owner page: purchase links, Google sign-in settings, and accounts with their plans.
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';

$user = require_login();
if (empty($user['is_admin'])) { http_response_code(403); exit('Admins only.'); }
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    if (!csrf_valid($_POST['csrf'] ?? null)) {
        $errors[] = 'Your session expired. Please try again.';
    } elseif ($action === 'create') {
        $email = strtolower(trim($_POST['email'] ?? ''));
        $pass = (string)($_POST['password'] ?? '');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'Enter a valid email address.';
        elseif (db_one('SELECT id FROM users WHERE email = ?', [$email])) $errors[] = 'That email already has an account.';
        if (strlen($pass) < 8) $errors[] = 'The password needs at least 8 characters.';
        if (!$errors) {
            db_exec('INSERT INTO users (email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)', [$email, password_hash($pass, PASSWORD_DEFAULT), now(), now()]);
            flash('Account created.');
            redirect('admin.php');
        }
    } elseif ($action === 'plan') {
        $id = (int)($_POST['user_id'] ?? 0);
        $plan = (string)($_POST['plan'] ?? '');
        if (isset(PLANS[$plan]) && db_one('SELECT id FROM users WHERE id = ?', [$id])) {
            if (($_POST['grant'] ?? '') === '1') {
                if (!db_one('SELECT 1 AS x FROM entitlements WHERE user_id = ? AND plan = ?', [$id, $plan])) {
                    db_exec('INSERT INTO entitlements (user_id, plan, source, created_at) VALUES (?, ?, ?, ?)', [$id, $plan, 'manual', now()]);
                }
            } else {
                db_exec('DELETE FROM entitlements WHERE user_id = ? AND plan = ?', [$id, $plan]);
            }
            flash('Plan updated.');
        }
        redirect('admin.php');
    } elseif ($action === 'regen') {
        $plan = (string)($_POST['plan'] ?? '');
        if (isset(ACCESS_PLANS[$plan])) {
            new_access_key($plan);
            flash('New link made for ' . ACCESS_PLANS[$plan] . '. The old link no longer works; update it in WarriorPlus.');
        }
        redirect('admin.php');
    } elseif ($action === 'sales') {
        foreach (PLANS as $plan => $label) {
            $url = trim((string)($_POST['sales'][$plan] ?? ''));
            if ($url !== '' && !preg_match('~^https?://~i', $url)) { $errors[] = "The sales page for $label must start with https://"; continue; }
            set_setting('upgrade_url_' . $plan, $url);
        }
        if (!$errors) { flash('Sales pages saved.'); redirect('admin.php'); }
    } elseif ($action === 'google') {
        $id = trim((string)($_POST['client_id'] ?? ''));
        $secret = trim((string)($_POST['client_secret'] ?? ''));
        set_setting('google_client_id', $id);
        // A blank secret keeps the saved one, so it never has to be shown on the page.
        if ($secret !== '' || $id === '') set_setting('google_client_secret', $secret);
        flash($id === '' ? 'Google sign-in turned off.' : 'Google sign-in saved.');
        redirect('admin.php');
    }
}

$users = db_all('SELECT id, email, is_admin, created_at FROM users ORDER BY id DESC LIMIT 500');
$owned = [];
foreach (db_all('SELECT user_id, plan FROM entitlements') as $e) $owned[$e['user_id']][$e['plan']] = true;

$f = flash();
page_head('Admin', '', ['user' => $user, 'nav' => 'admin']);
?>
<main class="page" style="max-width:920px">
  <div class="page-head"><div><h1>Accounts</h1><p>Create accounts and grant plans by hand. <a href="admin-library.php">Review the image library</a></p></div></div>
  <?php if ($f): ?><div class="alert <?= h($f['kind']) ?>"><?= h($f['msg']) ?></div><?php endif; ?>
  <?php foreach ($errors as $e): ?><div class="alert err"><?= h($e) ?></div><?php endforeach; ?>

  <div class="card card-pad section">
    <h3 style="margin-bottom:6px">Purchase links</h3>
    <p class="small muted" style="margin-bottom:14px">Put each link in the WarriorPlus delivery page of its product. A buyer who opens the FE link and signs in gets an account; an OTO link adds that plan to the account. If a link leaks, make a new one: the old link stops working, and buyers who already used it keep their plan.</p>
    <?php foreach (ACCESS_PLANS as $plan => $label): ?>
    <form method="post" style="margin-bottom:10px">
      <?= csrf_field() ?>
      <input type="hidden" name="action" value="regen">
      <input type="hidden" name="plan" value="<?= h($plan) ?>">
      <label class="field" style="margin-bottom:0"><span><?= h($label) ?></span>
        <div class="link-row">
          <input type="text" readonly value="<?= h(access_url($plan)) ?>" onclick="this.select()">
          <button class="btn ghost sm" type="button" onclick="navigator.clipboard.writeText(this.previousElementSibling.value); this.textContent='Copied'">Copy</button>
          <button class="btn ghost sm" type="submit" onclick="return confirm('Make a new link? The old one stops working.')">New link</button>
        </div>
      </label>
    </form>
    <?php endforeach; ?>
  </div>

  <form class="card card-pad section" method="post">
    <?= csrf_field() ?>
    <input type="hidden" name="action" value="sales">
    <h3 style="margin-bottom:6px">Sales pages</h3>
    <p class="small muted" style="margin-bottom:14px">Customers who don't own a plan see its features locked, with an upgrade button to this page.</p>
    <?php foreach (PLANS as $plan => $label): ?>
    <label class="field"><span><?= h($label) ?></span><input type="url" name="sales[<?= h($plan) ?>]" value="<?= h(setting('upgrade_url_' . $plan)) ?>" placeholder="https://warriorplus.com/o2/..."></label>
    <?php endforeach; ?>
    <button class="btn primary" type="submit">Save</button>
  </form>

  <form class="card card-pad section" method="post">
    <?= csrf_field() ?>
    <input type="hidden" name="action" value="google">
    <h3 style="margin-bottom:6px">Google sign-in <?= google_configured() ? '<span class="badge ok">On</span>' : '<span class="badge">Off</span>' ?></h3>
    <p class="small muted" style="margin-bottom:14px">In Google Cloud Console → APIs &amp; Services → Credentials, create an OAuth client ID of type "Web application" and add this Authorized redirect URI:<br><span class="mono"><?= h(google_redirect_uri()) ?></span></p>
    <div class="row">
      <label class="field"><span>Client ID</span><input type="text" name="client_id" value="<?= h(setting('google_client_id')) ?>" autocomplete="off"></label>
      <label class="field"><span>Client secret</span><input type="password" name="client_secret" placeholder="<?= setting('google_client_secret') !== '' ? 'Saved — leave blank to keep' : '' ?>" autocomplete="new-password"></label>
    </div>
    <?php if (!function_exists('curl_init') && !ini_get('allow_url_fopen')): ?><div class="alert err">This server has neither cURL nor allow_url_fopen, so it cannot talk to Google. Enable cURL in cPanel → Select PHP Version → Extensions.</div><?php endif; ?>
    <button class="btn primary" type="submit">Save</button>
  </form>

  <form class="card card-pad section" method="post">
    <?= csrf_field() ?>
    <input type="hidden" name="action" value="create">
    <h3 style="margin-bottom:14px">New account</h3>
    <div class="row">
      <label class="field"><span>Email</span><input type="email" name="email" required></label>
      <label class="field"><span>Temporary password</span><input type="text" name="password" required minlength="8" autocomplete="off"></label>
    </div>
    <button class="btn primary" type="submit">Create account</button>
  </form>

  <div class="card card-pad section">
    <table class="admin-table">
      <thead><tr><th>Email</th><th>Joined</th><?php foreach (PLANS as $label): ?><th><?= h($label) ?></th><?php endforeach; ?></tr></thead>
      <tbody>
      <?php foreach ($users as $u): ?>
        <tr>
          <td><?= h($u['email']) ?><?= $u['is_admin'] ? ' <span class="badge dark">Admin</span>' : '' ?></td>
          <td class="small muted"><?= h(time_ago($u['created_at'])) ?></td>
          <?php foreach (PLANS as $plan => $label): $has = !empty($owned[$u['id']][$plan]); ?>
          <td>
            <form method="post">
              <?= csrf_field() ?>
              <input type="hidden" name="action" value="plan">
              <input type="hidden" name="user_id" value="<?= (int)$u['id'] ?>">
              <input type="hidden" name="plan" value="<?= h($plan) ?>">
              <input type="hidden" name="grant" value="<?= $has ? '0' : '1' ?>">
              <button class="btn sm <?= $has ? 'primary' : 'ghost' ?>" type="submit"><?= $has ? 'Active' : 'Grant' ?></button>
            </form>
          </td>
          <?php endforeach; ?>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</main>
<?php page_foot(['assets/js/ui.js']); ?>
