<?php
// Bundle Creator (OTO2, spec 12.2): 3-12 saved games packed into one product with a bundle cover,
// contents, a "how to use" page and a Master Code that only the whole bundle reveals.
// Every account sees the page; only accounts with the 'bulk' plan get the builder.
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';

$user = require_login();
$owned = has_plan($user, 'bulk');
$pro = has_plan($user, 'pro');
$games = [];
if ($owned) {
    foreach (db_all("SELECT id, title, code, difficulty, puzzle_count, status, data FROM projects WHERE user_id = ? ORDER BY updated_at DESC", [$user['id']]) as $p) {
        $games[] = [
            'id' => (int)$p['id'], 'title' => $p['title'], 'code' => $p['code'], 'difficulty' => $p['difficulty'],
            'puzzles' => (int)$p['puzzle_count'], 'ready' => $p['status'] === 'ready',
            'data' => json_decode((string)$p['data'], true),
        ];
    }
}
$defaults = ['paper' => $user['paper'], 'inkSaver' => (bool)$user['ink_saver'], 'shop' => $user['shop_name']];
$upgrade = upgrade_url('bulk');

page_head('Bundles', '', ['user' => $user, 'nav' => 'projects']);
?>
<main class="page" style="max-width:1000px">
  <div class="page-head">
    <div>
      <h1>Bundle Creator <?php if (!$owned): ?><span class="badge warn">Locked</span><?php endif; ?></h1>
      <p>Pack 3 to 12 of your games into one product, with a bundle cover, contents and a Master Code that only the whole bundle reveals.</p>
    </div>
    <a class="btn ghost" href="dashboard.php">Back to projects</a>
  </div>

<?php if (!$owned): ?>
  <div class="card card-pad section">
    <h3 style="margin-bottom:10px">Bundle Creator is part of Bulk Creator</h3>
    <ul class="mk-features">
      <li><b>Seasonal sets, difficulty ladders, a whole year of games</b>: 3 to 12 games in one listing.</li>
      <li><b>Bundle cover, contents and a "How to use this bundle" page</b>, in the same aged-paper style.</li>
      <li><b>Master Code:</b> every game hands out one secret letter; together they open the bundle's final code, with its own certificate.</li>
      <li><b>One PDF or separate files</b> for Etsy, or one KDP book with all host pages at the back.</li>
    </ul>
    <div class="mk-actions">
      <?php if ($upgrade !== ''): ?><a class="btn primary" href="<?= h($upgrade) ?>" target="_blank" rel="noopener">Upgrade to Bulk Creator</a><?php endif; ?>
      <span class="small muted">Already bought it? Open the access link from your purchase receipt while signed in.</span>
    </div>
  </div>
<?php else: ?>
  <div class="card card-pad section">
    <h3 style="margin-bottom:12px">1. Name and format</h3>
    <div class="row">
      <label class="field"><span>Bundle name</span><input type="text" id="bd-name" maxlength="60" placeholder="e.g. The Winter Escape Collection"></label>
      <label class="field"><span>Format</span>
        <select id="bd-format">
          <option value="single">Etsy: one PDF with every game</option>
          <option value="zip">Etsy: one PDF per game, in a ZIP</option>
          <option value="kdp">Amazon KDP book (8.5×11, host pages at the back)</option>
        </select>
      </label>
    </div>
    <div class="row">
      <label class="field" id="bd-paper-field"><span>Paper</span>
        <select id="bd-paper"><option value="letter">Letter</option><option value="a4">A4</option></select>
      </label>
      <label class="field"><span>Print style</span>
        <select id="bd-print"><option value="aged">Aged paper</option><option value="ink">Ink saver (white)</option></select>
      </label>
    </div>
  </div>

  <div class="card card-pad section">
    <h3 style="margin-bottom:6px">2. Games, in bundle order</h3>
    <p class="small muted" style="margin-bottom:12px">Only games whose puzzles are built can go in. Use the arrows to change the order.</p>
    <div id="bd-games"></div>
  </div>

  <div class="card card-pad section">
    <h3 style="margin-bottom:6px">3. Master Code</h3>
    <p class="small muted" style="margin-bottom:12px">One letter per game, A to Z: game 1 gives the first letter, game 2 the second, and so on. The letters are printed on each game's certificate, so players only collect them by finishing the games.</p>
    <div class="code-input-row">
      <input type="text" id="bd-master" class="big-input mono" maxlength="20" autocomplete="off" spellcheck="false" placeholder="e.g. SNOW">
      <span class="code-count" id="bd-master-count"></span>
    </div>
  </div>

  <div class="card card-pad section">
    <div id="bd-checks"></div>
    <button class="btn primary lg" id="bd-run" type="button">Make the bundle</button>
    <div class="progress hidden" id="bd-progress" style="margin-top:14px">
      <div class="progress-track"><div class="progress-fill" id="bd-fill"></div></div>
      <div class="progress-text"><span id="bd-status"></span><span id="bd-count"></span></div>
    </div>
    <div id="bd-result" style="margin-top:14px"></div>
  </div>
<?php endif; ?>
</main>
<?php
if ($owned) {
    $flags = JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE;
    echo '<script>window.BUNDLE = ' . json_encode(['games' => $games, 'defaults' => $defaults, 'pro' => $pro], $flags) . ';window.ASSET_VERSION = ' . json_encode(asset_version()) . ';</script>' . "\n";
    $scripts = ['assets/vendor/jspdf.umd.min.js', 'assets/vendor/pdf-lib.min.js', 'assets/vendor/jszip.min.js', 'assets/js/pdf/paper.js', 'assets/js/pdf/pdf.js',
        'assets/js/themes.js', 'assets/js/story.js', 'assets/js/engine/glyphs.js', 'assets/js/engine/slither.js', 'assets/js/engine/generator.js'];
    foreach ($scripts as $src) echo '<script src="' . h($src) . '?v=' . h(asset_version()) . '"></script>' . "\n";
    if ($pro) {
        foreach (['mosaic', 'pdf-mosaic', 'pdf-party', 'library'] as $f) echo '<script src="pro.php?f=' . $f . '&amp;v=' . h(asset_version()) . '"></script>' . "\n";
    }
    echo '<script src="bulk.php?f=bundle&amp;v=' . h(asset_version()) . '"></script>' . "\n";
}
page_foot();
