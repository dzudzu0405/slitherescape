<?php
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';

$user = require_login();
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_valid($_POST['csrf'] ?? null)) {
        $errors[] = 'Your session expired. Please try again.';
    } elseif (($_POST['action'] ?? '') === 'profile') {
        $shop = trim($_POST['shop_name'] ?? '');
        $email = strtolower(trim($_POST['email'] ?? ''));
        $paper = in_array($_POST['paper'] ?? '', ['letter', 'a4', 'kdp'], true) ? $_POST['paper'] : 'letter';
        $ink = ($_POST['ink_saver'] ?? '0') === '1' ? 1 : 0;
        if (mb_strlen($shop) > 120) $errors[] = 'The shop name can be at most 120 characters.';
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'Enter a valid email address.';
        elseif (db_one('SELECT id FROM users WHERE email = ? AND id <> ?', [$email, $user['id']])) $errors[] = 'Another account already uses that email.';
        if (!$errors) {
            db_exec('UPDATE users SET shop_name = ?, email = ?, paper = ?, ink_saver = ?, updated_at = ? WHERE id = ?', [$shop, $email, $paper, $ink, now(), $user['id']]);
            flash('Saved.');
            redirect('account.php');
        }
    } elseif (($_POST['action'] ?? '') === 'password') {
        $row = db_one('SELECT password_hash FROM users WHERE id = ?', [$user['id']]);
        $new = (string)($_POST['new'] ?? '');
        if (!password_verify((string)($_POST['current'] ?? ''), $row['password_hash'])) $errors[] = 'Your current password is not correct.';
        if (strlen($new) < 8) $errors[] = 'The new password needs at least 8 characters.';
        if ($new !== ($_POST['confirm'] ?? '')) $errors[] = 'The two new passwords do not match.';
        if (!$errors) {
            db_exec('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [password_hash($new, PASSWORD_DEFAULT), now(), $user['id']]);
            session_regenerate_id(true);
            flash('Password changed.');
            redirect('account.php');
        }
    }
}

$f = flash();
page_head('Account', '', ['user' => $user, 'nav' => 'account']);
?>
<main class="page" style="max-width:720px">
  <div class="page-head"><div><h1>Account</h1><p>Your shop details are used as the default for every new game.</p></div></div>
  <?php if ($f): ?><div class="alert <?= h($f['kind']) ?>"><?= h($f['msg']) ?></div><?php endif; ?>
  <?php foreach ($errors as $e): ?><div class="alert err"><?= h($e) ?></div><?php endforeach; ?>

  <form class="card card-pad section" method="post">
    <?= csrf_field() ?>
    <input type="hidden" name="action" value="profile">
    <h3 style="margin-bottom:14px">Shop and PDF defaults</h3>
    <label class="field">
      <span>Shop name</span>
      <input type="text" name="shop_name" maxlength="120" value="<?= h($user['shop_name']) ?>">
      <div class="hint">Printed on the cover and in the PDF footer, e.g. "© <?= h($user['shop_name'] ?: 'Your Shop Name') ?> · For personal &amp; classroom use".</div>
    </label>
    <div class="row">
      <label class="field">
        <span>Default paper size</span>
        <select name="paper">
          <option value="letter" <?= $user['paper'] === 'letter' ? 'selected' : '' ?>>Letter (US, Etsy)</option>
          <option value="a4" <?= $user['paper'] === 'a4' ? 'selected' : '' ?>>A4 (Etsy)</option>
          <option value="kdp" <?= $user['paper'] === 'kdp' ? 'selected' : '' ?>>KDP 8.5×11 in with bleed</option>
        </select>
      </label>
      <label class="field">
        <span>Default background</span>
        <select name="ink_saver">
          <option value="0" <?= !$user['ink_saver'] ? 'selected' : '' ?>>Aged paper</option>
          <option value="1" <?= $user['ink_saver'] ? 'selected' : '' ?>>Ink saver (white)</option>
        </select>
      </label>
    </div>
    <div class="hint" style="margin:-6px 0 14px">Used for every new game. You can still change them per game under Advanced options.</div>
    <label class="field">
      <span>Login email</span>
      <input type="email" name="email" required value="<?= h($user['email']) ?>">
    </label>
    <button class="btn primary" type="submit">Save changes</button>
  </form>

  <form class="card card-pad section" method="post">
    <?= csrf_field() ?>
    <input type="hidden" name="action" value="password">
    <h3 style="margin-bottom:14px">Change password</h3>
    <label class="field"><span>Current password</span><input type="password" name="current" required autocomplete="current-password"></label>
    <div class="row">
      <label class="field"><span>New password</span><input type="password" name="new" required minlength="8" autocomplete="new-password"></label>
      <label class="field"><span>Confirm new password</span><input type="password" name="confirm" required minlength="8" autocomplete="new-password"></label>
    </div>
    <button class="btn" type="submit">Change password</button>
  </form>
  <?= legal_links() ?>
</main>
<?php page_foot(['assets/js/ui.js']); ?>
