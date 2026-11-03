<?php
// Owner page: every Mosaic image is approved by eye before customers can use it (spec section 11).
// New icons are drawn in the browser: SVG -> alpha channel -> 18x18 grid, threshold 0.45.
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';

$user = require_login();
if (empty($user['is_admin'])) { http_response_code(403); exit('Admins only.'); }
$errors = [];

function valid_rows($rows): bool
{
    if (!is_array($rows) || !$rows || count($rows) > 18) return false;
    $w = strlen((string)$rows[0]);
    if ($w < 4 || $w > 18) return false;
    foreach ($rows as $r) if (!is_string($r) || strlen($r) !== $w || !preg_match('/^[#.]+$/', $r)) return false;
    return true;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    if (!csrf_valid($_POST['csrf'] ?? null)) {
        $errors[] = 'Your session expired. Please try again.';
    } elseif ($action === 'seed') {
        $seed = json_decode((string)file_get_contents(__DIR__ . '/pro/library/seed.json'), true) ?: [];
        $added = 0;
        foreach ($seed as $m) {
            if (db_one('SELECT name FROM library_images WHERE name = ?', [$m['name']])) continue;
            db_exec('INSERT INTO library_images (name, theme, similar, grid_rows, source, svg, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [$m['name'], $m['theme'], json_encode($m['similar']), json_encode($m['rows']), $m['source'], '', 'pending', now(), now()]);
            $added++;
        }
        flash("$added images added for review.");
        redirect('admin-library.php');
    } elseif ($action === 'status') {
        $status = in_array($_POST['status'] ?? '', ['approved', 'rejected', 'pending'], true) ? $_POST['status'] : 'pending';
        db_exec('UPDATE library_images SET status = ?, updated_at = ? WHERE name = ?', [$status, now(), (string)($_POST['name'] ?? '')]);
        redirect('admin-library.php?show=' . urlencode((string)($_GET['show'] ?? 'pending')));
    } elseif ($action === 'add') {
        $name = strtoupper(trim((string)($_POST['name'] ?? '')));
        $theme = strtolower(trim((string)($_POST['theme'] ?? '')));
        $rows = json_decode((string)($_POST['rows'] ?? ''), true);
        $similar = array_values(array_filter(preg_split('/[\s,]+/', strtoupper((string)($_POST['similar'] ?? '')))));
        if (!preg_match('/^[A-Z]{3,12}$/', $name)) $errors[] = 'The name must be one word of 3 to 12 letters: it becomes the chapter word.';
        elseif (db_one('SELECT name FROM library_images WHERE name = ?', [$name])) $errors[] = 'That name already exists.';
        if (!preg_match('/^[a-z]{2,30}$/', $theme)) $errors[] = 'Enter a theme id, e.g. christmas.';
        if (!valid_rows($rows)) $errors[] = 'Draw the grid from an SVG first.';
        if (!trim((string)($_POST['source'] ?? ''))) $errors[] = 'Enter the icon set and its licence, so it can be checked later.';
        if (!$errors) {
            db_exec('INSERT INTO library_images (name, theme, similar, grid_rows, source, svg, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [$name, $theme, json_encode($similar), json_encode($rows), trim((string)$_POST['source']), (string)($_POST['svg'] ?? ''), 'pending', now(), now()]);
            flash('Image added for review.');
            redirect('admin-library.php');
        }
    }
}

$show = in_array($_GET['show'] ?? '', ['pending', 'approved', 'rejected'], true) ? $_GET['show'] : 'pending';
$counts = [];
foreach (db_all('SELECT status, COUNT(*) AS n FROM library_images GROUP BY status') as $r) $counts[$r['status']] = (int)$r['n'];
$images = db_all('SELECT * FROM library_images WHERE status = ? ORDER BY theme, name', [$show]);

$f = flash();
page_head('Image library', '', ['user' => $user, 'nav' => 'admin']);
?>
<main class="page" style="max-width:1080px">
  <div class="page-head"><div><h1>Image library</h1><p>Customers only see approved images. Check that each one is easy to recognise at this size. <a href="admin.php">Accounts</a></p></div></div>
  <?php if ($f): ?><div class="alert <?= h($f['kind']) ?>"><?= h($f['msg']) ?></div><?php endif; ?>
  <?php foreach ($errors as $e): ?><div class="alert err"><?= h($e) ?></div><?php endforeach; ?>

  <details class="card card-pad section">
    <summary><b>Add an icon</b></summary>
    <form method="post" id="add-form" style="margin-top:14px">
      <?= csrf_field() ?>
      <input type="hidden" name="action" value="add">
      <input type="hidden" name="rows" id="add-rows">
      <input type="hidden" name="svg" id="add-svg">
      <div class="row">
        <label class="field"><span>Name (the chapter word)</span><input type="text" name="name" maxlength="12" required></label>
        <label class="field"><span>Theme id</span><input type="text" name="theme" placeholder="christmas" required></label>
      </div>
      <div class="row">
        <label class="field"><span>Looks like (names, for decoys)</span><input type="text" name="similar" placeholder="DEER, MOOSE"></label>
        <label class="field"><span>Icon set and licence</span><input type="text" name="source" placeholder="Phosphor Icons, MIT" required></label>
      </div>
      <label class="field"><span>SVG file (silhouette icon)</span><input type="file" id="add-file" accept=".svg,image/svg+xml"></label>
      <label class="field"><span>Threshold <b id="add-th-label">0.45</b></span><input type="range" id="add-th" min="0.2" max="0.8" step="0.01" value="0.45"></label>
      <div class="library-compare" id="add-preview"></div>
      <button class="btn primary" type="submit">Add for review</button>
    </form>
  </details>

  <div class="library-tabs">
    <?php foreach (['pending' => 'To review', 'approved' => 'Approved', 'rejected' => 'Rejected'] as $k => $label): ?>
      <a class="btn sm <?= $show === $k ? 'dark' : 'ghost' ?>" href="?show=<?= h($k) ?>"><?= h($label) ?> (<?= (int)($counts[$k] ?? 0) ?>)</a>
    <?php endforeach; ?>
    <form method="post" style="display:inline"><?= csrf_field() ?><input type="hidden" name="action" value="seed"><button class="btn sm ghost" type="submit">Import placeholder images</button></form>
  </div>

  <?php if (!$images): ?><div class="card card-pad section muted">Nothing here.</div><?php endif; ?>
  <div class="library-grid">
    <?php foreach ($images as $m): ?>
    <div class="card library-card">
      <div class="library-compare">
        <?php if ($m['svg']): ?><div class="library-svg"><?= '<img alt="Original icon" src="data:image/svg+xml;base64,' . base64_encode($m['svg']) . '">' ?></div><?php endif; ?>
        <canvas data-rows="<?= h($m['grid_rows']) ?>"></canvas>
      </div>
      <b><?= h($m['name']) ?></b>
      <div class="small muted"><?= h($m['theme']) ?> · <?= h($m['source']) ?></div>
      <div class="small" data-review="<?= h($m['grid_rows']) ?>"></div>
      <form method="post" class="inline" style="margin-top:8px">
        <?= csrf_field() ?>
        <input type="hidden" name="action" value="status">
        <input type="hidden" name="name" value="<?= h($m['name']) ?>">
        <?php if ($show !== 'approved'): ?><button class="btn sm primary" name="status" value="approved">Approve</button><?php endif; ?>
        <?php if ($show !== 'rejected'): ?><button class="btn sm ghost" name="status" value="rejected">Reject</button><?php endif; ?>
      </form>
    </div>
    <?php endforeach; ?>
  </div>
</main>
<script src="assets/js/engine/glyphs.js?v=<?= h(asset_version()) ?>"></script>
<script src="assets/js/engine/slither.js?v=<?= h(asset_version()) ?>"></script>
<script src="assets/js/engine/generator.js?v=<?= h(asset_version()) ?>"></script>
<script src="pro.php?f=mosaic&amp;v=<?= h(asset_version()) ?>"></script>
<?php page_foot(['assets/js/ui.js', 'assets/js/admin-library.js']); ?>
