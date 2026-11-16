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
      <p>Make 3 to 12 new games at once, or pack games you already made, into one product, with a bundle cover, contents and a Master Code that only the whole bundle reveals.</p>
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
    <h3 style="margin-bottom:6px">Where do the games come from?</h3>
    <p class="small muted" style="margin-bottom:12px">Make a whole bundle of brand-new games in one go, or pack games you have already made.</p>
    <div class="bd-types bd-src">
      <label class="bd-type"><input type="radio" name="bd-src" value="new" checked><b>Make new games with AI</b><span>Up to 12 brand-new games at once, each with its own story, secret code and questions. The prompt is written for you.<?= $pro ? ' Classic or Mosaic.' : '' ?></span></label>
      <label class="bd-type"><input type="radio" name="bd-src" value="saved"><b>Use games I already made</b><span>Pick from your saved projects. No AI prompt needed.</span></label>
    </div>
  </div>

  <div class="card card-pad section">
    <h3 style="margin-bottom:6px">Kind of bundle</h3>
    <p class="small muted" style="margin-bottom:12px">Pick a ready-made kind and the Builder chooses matching games, puts them in order and plans any missing ones as new games. You can change everything afterwards.</p>
    <div class="bd-types">
      <label class="bd-type"><input type="radio" name="bd-type" value="custom" checked><b>My own selection</b><span>Any games, in any order.</span></label>
      <label class="bd-type"><input type="radio" name="bd-type" value="theme"><b>Seasonal or themed set</b><span>Games that share one theme, like a Christmas collection.</span></label>
      <label class="bd-type"><input type="radio" name="bd-type" value="ladder"><b>Difficulty ladder</b><span>Easy to Hard: kids 11-13, then teens, then adults.</span></label>
      <label class="bd-type"><input type="radio" name="bd-type" value="year"><b>A whole year</b><span>12 games, one for every month, holidays included.</span></label>
    </div>
    <label class="field hidden" id="bd-type-theme" style="margin-top:12px;max-width:320px"><span>Theme</span><select id="bd-type-theme-sel"></select></label>
    <div class="alert info hidden" id="bd-type-note" style="margin-top:12px"></div>
  </div>

  <div class="card card-pad section">
    <h3 style="margin-bottom:12px"><span class="bd-step"></span>Name and format</h3>
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
        <select id="bd-print"><option value="aged">Aged paper</option><option value="white">Ink saver (white)</option><option value="clean">Clean &amp; Bright</option><option value="seasonal">Seasonal pattern</option><option value="noir">Detective Notebook</option></select>
      </label>
    </div>
  </div>

  <div class="card card-pad section" id="bd-games-card">
    <h3 style="margin-bottom:6px"><span class="bd-step"></span>Games, in bundle order</h3>
    <p class="small muted" style="margin-bottom:12px">Only games whose puzzles are built can go in. Use the arrows to change the order.</p>
    <div id="bd-games"></div>
  </div>

  <div class="card card-pad section" id="nb-card">
    <h3 style="margin-bottom:6px"><span class="bd-step"></span>New games from your AI <span class="optional" id="nb-optional">optional</span></h3>
    <p class="small muted" style="margin-bottom:12px"><span id="nb-lead">Need more games for this bundle?</span> Choose how many games and a theme for each, copy the prompt into ChatGPT or Claude, and paste the whole reply back. Games go to the AI in prompts of <?= 3 ?> so every reply stays complete. Finished games are saved to your projects and added to the bundle list.</p>
    <div class="row">
      <label class="field"><span>How many new games</span>
        <select id="nb-count"><?php for ($i = 0; $i <= 12; $i++): ?><option value="<?= $i ?>"><?= $i ?: 'None' ?></option><?php endfor; ?></select>
      </label>
      <label class="field"><span>Same theme for every game?</span><select id="nb-theme"></select></label>
<?php if ($pro): ?>
      <label class="field"><span>Same game type for every game? <span class="badge warn">PRO</span></span>
        <select id="nb-type">
          <option value="">No, I pick a type for each game</option>
          <optgroup label="Yes, every game is:">
            <option value="classic">Classic (letters only)</option>
            <option value="mixed">Letters + Mosaic picture</option>
            <option value="mosaic">Mosaic picture only</option>
          </optgroup>
        </select>
      </label>
<?php endif; ?>
    </div>
    <div id="nb-rows"></div>
    <button class="btn primary hidden" id="nb-start" type="button">Make the prompt</button>
    <div class="hidden" id="nb-work">
      <div class="nb-lots" id="nb-lots"></div>
      <div class="nb-lot">
        <div><b id="nb-lot-head"></b><div class="small muted" id="nb-lot-sub"></div></div>
        <button class="btn primary" id="nb-copy" type="button">Copy prompt</button>
      </div>
      <details class="nb-prompt"><summary class="small">See the prompt</summary><pre id="nb-prompt"></pre></details>
      <label class="field" style="margin-top:12px"><span>Paste the AI's whole reply here</span>
        <textarea id="nb-reply" rows="6" class="mono" placeholder="=== GAME 1 ===&#10;TITLE: ..."></textarea>
      </label>
      <button class="btn" id="nb-read" type="button">Read the reply</button>
      <div id="nb-help" style="margin-top:12px"></div>
      <table class="admin-table nb-table" style="margin-top:12px"><thead><tr><th>Game</th><th>Theme</th><th>Status</th><th></th></tr></thead><tbody id="nb-table"></tbody></table>
      <div id="nb-edit" class="hidden" style="margin-top:12px">
        <label class="field"><span id="nb-edit-label">Edit the game's text</span><textarea id="nb-edit-text" rows="12" class="mono"></textarea></label>
        <button class="btn primary" id="nb-edit-check" type="button">Check this game</button>
        <button class="btn ghost" id="nb-edit-close" type="button">Close</button>
      </div>
      <div class="nb-build">
        <button class="btn primary" id="nb-build" type="button" disabled>Build puzzles and add the games</button>
        <span class="small muted" id="nb-build-status"></span>
      </div>
    </div>
  </div>

  <div class="card card-pad section">
    <h3 style="margin-bottom:6px"><span class="bd-step"></span>Master Code</h3>
    <p class="small muted" style="margin-bottom:12px">One letter per game, A to Z: game 1 gives the first letter, game 2 the second, and so on. The letters are printed on each game's certificate, so players only collect them by finishing the games.</p>
    <div class="code-input-row">
      <input type="text" id="bd-master" class="big-input mono" maxlength="20" autocomplete="off" spellcheck="false" placeholder="e.g. SNOW">
      <span class="code-count" id="bd-master-count"></span>
      <button class="btn" id="bd-master-next" type="button">Suggest another</button>
    </div>
    <p class="small muted" id="bd-master-hint" style="margin-top:8px"></p>
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
        'assets/js/ui.js', 'assets/js/themes.js', 'assets/js/story.js', 'assets/js/engine/glyphs.js', 'assets/js/engine/slither.js', 'assets/js/engine/generator.js'];
    foreach ($scripts as $src) echo '<script src="' . h($src) . '?v=' . h(asset_version()) . '"></script>' . "\n";
    if ($pro) {
        foreach (['mosaic', 'pdf-mosaic', 'pdf-party', 'library'] as $f) echo '<script src="pro.php?f=' . $f . '&amp;v=' . h(asset_version()) . '"></script>' . "\n";
    }
    foreach (['batch', 'bundle'] as $f) echo '<script src="bulk.php?f=' . $f . '&amp;v=' . h(asset_version()) . '"></script>' . "\n";
}
page_foot();
