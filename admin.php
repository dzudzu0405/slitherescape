<?php
// Owner page: create accounts and grant plans by hand (until WarriorPlus is connected).
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
