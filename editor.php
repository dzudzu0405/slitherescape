<?php
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';

$user = require_login();
// Account-level PDF defaults (set once on the Account page).
$defaults = ['paper' => $user['paper'], 'inkSaver' => (bool)$user['ink_saver'], 'shop' => $user['shop_name']];

$project = null;
if (isset($_GET['id'])) {
    $project = db_one('SELECT id, title, data FROM projects WHERE id = ? AND user_id = ?', [(int)$_GET['id'], $user['id']]);
    if (!$project) {
        flash('That project does not exist or was deleted.', 'err');
        redirect('dashboard.php');
    }
}
$title = $project['title'] ?? 'New game';
$pro = has_plan($user, 'pro');
$boot = [
    'id' => $project ? (int)$project['id'] : 0,
    'title' => $title,
    'data' => $project ? json_decode($project['data'], true) : null,
];

$center = '<input class="project-title-input" id="project-title" value="' . h($title) . '" aria-label="Project name">'
    . '<span class="save-state" id="save-state"><span class="dot"></span><span>' . ($project ? 'Saved' : 'Not saved yet') . '</span></span>';

page_head($title, 'editor', ['user' => $user, 'nav' => 'projects', 'center' => $center]);
$jsonFlags = JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE;
?>
<script>
window.ACCOUNT_DEFAULTS = <?= json_encode($defaults, $jsonFlags) ?>;
window.PROJECT = <?= json_encode($boot, $jsonFlags) ?>;
window.ASSET_VERSION = <?= json_encode(asset_version()) ?>;
window.PRO = <?= json_encode(['enabled' => $pro, 'upgradeUrl' => (string)(config()['upgrade_url'] ?? '')], $jsonFlags) ?>;
</script>
<main class="workspace">

  <!-- ================= START ================= -->
  <section class="flowpage" id="screen-start">
    <div class="flow-head">
      <h1>Create a new escape game</h1>
      <p>Pick who it's for, a theme and a story type, and let your AI write the story. We build the puzzles and the PDF.</p>
    </div>

    <div class="card card-pad section">
      <h3 class="q-title"><span class="n">1</span>Who is it for?</h3>
      <div class="diff-grid" id="aud-grid">
        <button class="diff" data-diff="easy">
          <span class="check"></span>
          <h4>Kids</h4><div class="age">Ages 11–13 · Easy</div>
        </button>
        <button class="diff on" data-diff="medium">
          <span class="check"></span>
          <h4>Teens</h4><div class="age">Ages 14–17 · Medium</div>
        </button>
        <button class="diff" data-diff="hard">
          <span class="check"></span>
          <h4>Adults</h4><div class="age">Grown-ups · Hard</div>
        </button>
      </div>
    </div>

    <div class="card card-pad section" id="mode-section">
      <h3 class="q-title"><span class="n">2</span>Choose the game type</h3>
      <div class="diff-grid" id="mode-grid">
        <button class="diff on" data-mode="letter"><span class="check"></span><h4>Classic letters</h4><div class="age">Each puzzle reveals one letter</div></button>
        <button class="diff" data-mode="mosaic"><span class="check"></span><h4>Mosaic <span class="badge warn pro-tag">PRO</span></h4><div class="age">Nine puzzles are the pieces of one big picture</div></button>
        <button class="diff" data-mode="mixed"><span class="check"></span><h4>Mixed <span class="badge warn pro-tag">PRO</span></h4><div class="age">Each chapter picks its own type</div></button>
      </div>
      <div class="mode-options hidden" id="mode-options">
        <label class="field"><span>Chapters</span>
          <select id="mode-chapters"><option value="2">2 chapters</option><option value="3">3 chapters</option></select>
        </label>
        <div class="mode-chapter-types" id="mode-chapter-types"></div>
      </div>
      <div class="kit-row" id="kit-row">
        <label class="toggle small"><input type="checkbox" id="kit-on"><span class="track"></span> Add the Party Props Kit <span class="badge warn pro-tag">PRO</span></label>
        <div class="kit-options hidden" id="kit-options">
          <label class="field"><span>Players</span><select id="kit-players"><option>2</option><option>3</option><option selected>4</option><option>5</option><option>6</option></select></label>
          <label class="field"><span>How they play</span><select id="kit-play"><option value="together">Together</option><option value="teams">Competing teams</option></select></label>
          <label class="field hidden" id="kit-teams-field"><span>Teams</span><select id="kit-teams"><option>2</option><option>3</option><option>4</option></select></label>
        </div>
      </div>
      <div class="alert info hidden" id="pro-note"></div>
    </div>

    <div class="card card-pad section">
      <h3 class="q-title"><span class="n">3</span>Pick a theme</h3>
      <div id="theme-grid"></div>
    </div>

    <div class="card card-pad section">
      <h3 class="q-title"><span class="n">4</span>Pick a story type</h3>
      <div class="plot-grid" id="plot-grid"></div>
    </div>

    <div class="card card-pad section" id="code-section">
      <h3 class="q-title"><span class="n">5</span>Your secret code <span class="optional">optional</span></h3>
      <div class="code-input-row">
        <input type="text" id="code-input" class="big-input mono" maxlength="40" autocomplete="off" spellcheck="false" placeholder="e.g. HAPPY HALLOWEEN">
        <span class="code-count" id="code-count">0/20 letters</span>
      </div>
      <p class="code-note"><em>Choose words that fit the theme and story type you picked above. 2 or 3 words, up to 20 letters in total. Leave empty and the AI will choose the code.</em></p>
      <div class="code-preview" id="code-preview"></div>
    </div>

    <div class="card card-pad section">
      <h3 class="q-title"><span class="n">6</span>Get the story from your AI</h3>
      <div class="ai-steps">
        <div class="ai-step">
          <p class="small muted">Copy the prompt and paste it into ChatGPT or Claude.</p>
          <button class="btn dark lg" id="copy-prompt">Copy prompt</button>
          <details class="see-prompt">
            <summary>See the prompt</summary>
            <textarea class="prompt-box" id="prompt-box" readonly></textarea>
          </details>
        </div>
        <div class="ai-step">
          <p class="small muted">Paste the AI's whole reply here.</p>
          <textarea class="paste-box" id="paste-box" placeholder='{"title": "..."}'></textarea>
        </div>
      </div>
      <div class="check-result" id="check-result"></div>
      <div class="create-row">
        <button class="btn primary lg" id="create-game">Create game</button>
        <button class="btn ghost sm" id="demo-error">Try a broken reply</button>
      </div>
    </div>

    <div class="or-divider"><span>or start from a ready-made story</span></div>
    <div class="template-grid" id="template-grid"></div>

    <details class="card card-pad section advanced" id="advanced">
      <summary><span><b>Advanced options</b> <span class="small muted">— optional, sensible defaults are already set</span></span></summary>
      <div class="adv-grid">
        <label class="field">
          <span>Puzzles</span>
          <select id="adv-count">
            <option value="">Auto (9–12, set by the code)</option>
            <?php for ($i = 8; $i <= 15; $i++): ?><option value="<?= $i ?>"><?= $i ?> puzzles</option><?php endfor; ?>
          </select>
        </label>
        <label class="field">
          <span>Chapters</span>
          <select id="adv-chapters">
            <option value="">Auto (2)</option>
            <option value="2">2 chapters</option>
            <option value="3">3 chapters</option>
          </select>
        </label>
        <div class="field">
          <div class="field-label">Grid (columns × rows)</div>
          <div class="inline">
            <input type="number" id="adv-w" min="6" max="15" placeholder="Auto" style="width:84px">
            <span>×</span>
            <input type="number" id="adv-h" min="7" max="16" placeholder="Auto" style="width:84px">
          </div>
        </div>
        <label class="field" id="adv-reverse-field">
          <span>Reverse-mode puzzles (Adults)</span>
          <select id="adv-reverse">
            <option value="1">1 (default)</option>
            <option value="0">None</option>
            <option value="2">2</option>
          </select>
        </label>
        <label class="field">
          <span>Paper size</span>
          <select id="adv-paper">
            <option value="">Account default</option>
            <option value="letter">Letter</option>
            <option value="a4">A4</option>
            <option value="kdp">KDP 8.5×11 in with bleed</option>
          </select>
        </label>
        <label class="field">
          <span>Background</span>
          <select id="adv-ink">
            <option value="">Account default</option>
            <option value="aged">Aged paper</option>
            <option value="white">Ink saver (white)</option>
          </select>
        </label>
        <div class="field adv-wide">
          <div class="field-label">Ornament</div>
          <div class="motifs" id="motifs"></div>
        </div>
      </div>
    </details>
  </section>

  <!-- ================= RESULT ================= -->
  <section class="flowpage hidden" id="screen-result">
    <div class="card card-pad building" id="building">
      <div class="building-spinner"></div>
      <div class="building-text">
        <h3>Building your game…</h3>
        <div class="progress">
          <div class="progress-track"><div class="progress-fill" id="gen-fill"></div></div>
          <div class="progress-text"><span id="gen-status">Starting…</span><span id="gen-count"></span></div>
        </div>
      </div>
    </div>

    <div id="result-body" class="hidden">
      <div class="result-hero">
        <div class="cover-preview" id="cover-preview"></div>
        <div class="result-info">
          <span class="badge ok"><span class="dot"></span>Ready to print</span>
          <h1 id="r-title"></h1>
          <div class="r-code" id="r-code"></div>
          <div class="project-meta" id="r-meta"></div>
          <button class="btn primary lg download" id="export-pdf">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 3v10m0 0l-4-4m4 4l4-4M4 16h12"/></svg>
            Download PDF
          </button>
          <div class="progress hidden" id="export-progress">
            <div class="progress-track"><div class="progress-fill" id="export-fill"></div></div>
            <div class="progress-text"><span id="export-status">Building pages…</span><span></span></div>
          </div>
          <button class="btn lg download hidden" id="export-kit">Download Party Kit</button>
          <div class="r-links">
            <button class="btn ghost sm" id="btn-edit">Edit text</button>
            <button class="btn ghost sm" id="btn-regen">New puzzles</button>
            <button class="btn ghost sm" id="btn-restart">Start over</button>
          </div>
          <details class="verifier">
            <summary id="verifier-summary"></summary>
            <ul class="checklist" id="checklist"></ul>
          </details>
        </div>
      </div>

      <div class="card card-pad section hidden" id="edit-panel">
        <div class="panel-head">
          <div><h2>Edit text</h2><p>Changes are saved automatically. Changing a code word rebuilds the puzzles.</p></div>
          <button class="btn primary" id="edit-done">Done</button>
        </div>
        <div class="story-form" id="story-form"></div>
      </div>

      <div class="section">
        <div class="preview-head">
          <h2>Puzzles</h2>
          <label class="toggle small"><input type="checkbox" id="show-solution"><span class="track"></span> Show solutions</label>
        </div>
        <div id="puzzle-chapters"></div>
      </div>

      <details class="card card-pad section">
        <summary class="pages-summary"><b>What's in the PDF</b> <span class="small muted" id="page-total"></span></summary>
        <ul class="page-list" id="page-list"></ul>
      </details>
    </div>
  </section>
</main>

<div class="toast" id="toast"></div>
<?php
$scripts = ['assets/vendor/jspdf.umd.min.js', 'assets/js/pdf/paper.js', 'assets/js/pdf/pdf.js', 'assets/js/ui.js', 'assets/js/themes.js', 'assets/js/story.js', 'assets/js/templates.js'];
foreach ($scripts as $src) echo '<script src="' . h($src) . '?v=' . h(asset_version()) . '"></script>' . "\n";
if ($pro) {
    // Engine helpers the Mosaic planner needs on this page, then the gated PRO files.
    foreach (['assets/js/engine/glyphs.js', 'assets/js/engine/slither.js', 'assets/js/engine/generator.js'] as $src) echo '<script src="' . h($src) . '?v=' . h(asset_version()) . '"></script>' . "\n";
    foreach (['mosaic', 'pdf-mosaic', 'pdf-party', 'packs', 'library'] as $f) echo '<script src="pro.php?f=' . $f . '&amp;v=' . h(asset_version()) . '"></script>' . "\n";
}
page_foot(['assets/js/editor.js']);
?>
