<?php
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';

$user = require_login();
$rows = db_all('SELECT id, title, status, code, difficulty, puzzle_count, chapter_count, data, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC', [$user['id']]);

$statusBadge = [
    'ready' => ['ok', 'Ready to export'],
    'story' => ['warn', 'Puzzles not built'],
    'draft' => ['', 'No story yet'],
];
$audience = ['easy' => 'Kids 11–13', 'medium' => 'Teens 14–17', 'hard' => 'Adults'];
$modes = ['letter' => 'Letters', 'mosaic' => 'Mosaic', 'mixed' => 'Mixed'];

$icons = [
    'copy' => '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M13 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/></svg>',
    'trash' => '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 6h12M8 6V4h4v2M6 6l1 11h6l1-11"/></svg>',
    'search' => '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="9" r="5.5"/><path d="M13 13l4 4"/></svg>',
];

// Walks the border between inside and outside cells into closed loops, so the loop can be drawn as one stroke.
function puzzle_loops(array $p): array
{
    $W = (int)$p['W'];
    $H = (int)$p['H'];
    $in = fn(int $c, int $r): bool => $c >= 0 && $r >= 0 && $c < $W && $r < $H && !empty($p['inside'][$r * $W + $c]);
    $adj = [];
    $link = function (array $a, array $b) use (&$adj): void {
        $adj[implode(',', $a)][] = $b;
        $adj[implode(',', $b)][] = $a;
    };
    for ($r = 0; $r <= $H; $r++) for ($c = 0; $c < $W; $c++) if ($in($c, $r) !== $in($c, $r - 1)) $link([$c, $r], [$c + 1, $r]);
    for ($r = 0; $r < $H; $r++) for ($c = 0; $c <= $W; $c++) if ($in($c, $r) !== $in($c - 1, $r)) $link([$c, $r], [$c, $r + 1]);
    $seen = [];
    $loops = [];
    foreach (array_keys($adj) as $startKey) {
        if (isset($seen[$startKey])) continue;
        $start = array_map('intval', explode(',', $startKey));
        $loop = [$start];
        $prev = null;
        $cur = $start;
        do {
            $seen[implode(',', $cur)] = true;
            $next = null;
            foreach ($adj[implode(',', $cur)] as $v) {
                if ($prev === null || $v !== $prev) { $next = $v; break; }
            }
            if ($next === null) break;
            $loop[] = $next;
            $prev = $cur;
            $cur = $next;
        } while ($cur !== $start && count($loop) <= 4 * $W * $H);
        $loops[] = $loop;
    }
    return $loops;
}

// A solved puzzle as inline SVG: shaded letter, the loop, dots and (optionally) the clue numbers.
function puzzle_svg(array $p, bool $clues, string $class): string
{
    $W = (int)$p['W'];
    $H = (int)$p['H'];
    $cell = 10;
    $pad = 6;
    $vw = $W * $cell + 2 * $pad;
    $vh = $H * $cell + 2 * $pad;
    $out = '<svg class="' . h($class) . '" viewBox="0 0 ' . $vw . ' ' . $vh . '" aria-hidden="true">';
    $out .= '<g transform="translate(' . $pad . ' ' . $pad . ')"><g class="ps-shade">';
    for ($r = 0; $r < $H; $r++) for ($c = 0; $c < $W; $c++) {
        if (!empty($p['inside'][$r * $W + $c])) $out .= '<rect x="' . ($c * $cell) . '" y="' . ($r * $cell) . '" width="' . $cell . '" height="' . $cell . '"/>';
    }
    $out .= '</g>';
    if ($clues) {
        $out .= '<g class="ps-clue">';
        for ($r = 0; $r < $H; $r++) for ($c = 0; $c < $W; $c++) {
            $v = (int)($p['clues'][$r * $W + $c] ?? -1);
            if ($v >= 0) $out .= '<text x="' . ($c * $cell + 5) . '" y="' . ($r * $cell + 7.3) . '">' . $v . '</text>';
        }
        $out .= '</g>';
    }
    $d = '';
    foreach (puzzle_loops($p) as $loop) {
        foreach ($loop as $i => [$x, $y]) $d .= ($i ? 'L' : 'M') . ($x * $cell) . ' ' . ($y * $cell);
        $d .= 'Z';
    }
    $out .= '<path class="ps-loop" pathLength="1" d="' . $d . '"/><g class="ps-dot">';
    for ($r = 0; $r <= $H; $r++) for ($c = 0; $c <= $W; $c++) $out .= '<circle cx="' . ($c * $cell) . '" cy="' . ($r * $cell) . '" r="0.9"/>';
    return $out . '</g></g></svg>';
}

$projects = [];
$stats = ['games' => count($rows), 'ready' => 0, 'puzzles' => 0, 'themes' => []];
$showcase = null;
foreach ($rows as $row) {
    $data = json_decode($row['data'], true) ?: [];
    $puzzles = array_values(array_filter($data['puzzles'] ?? [], fn($p) => is_array($p) && isset($p['W'], $p['H'], $p['inside'])));
    // Prefer a letter puzzle for the thumbnail: it shows what SlitherEscape is about at a glance.
    $letters = array_values(array_filter($puzzles, fn($p) => ($p['kind'] ?? 'letter') !== 'mosaic' && !empty($p['letter'])));
    $thumb = $letters[0] ?? $puzzles[0] ?? null;
    if (!$showcase && $letters) $showcase = ['puzzle' => $letters[0], 'title' => $row['title'], 'id' => (int)$row['id']];
    $themeId = (string)($data['themeId'] ?? '');
    $stats['ready'] += $row['status'] === 'ready' ? 1 : 0;
    $stats['puzzles'] += (int)$row['puzzle_count'];
    if ($themeId !== '' && $themeId !== 'other') $stats['themes'][$themeId] = true;
    elseif (!empty($data['customTheme'])) $stats['themes']['custom:' . strtolower((string)$data['customTheme'])] = true;
    $projects[] = $row + [
        'thumb' => $thumb,
        'themeId' => $themeId,
        'customTheme' => (string)($data['customTheme'] ?? ''),
        'mode' => (string)($data['settings']['mode'] ?? 'letter'),
    ];
}
$latest = $projects[0] ?? null;

$ownedPlans = [];
foreach (PLANS as $plan => $label) $ownedPlans[$plan] = has_plan($user, $plan);
$planInfo = [
    'pro' => 'Mosaic picture puzzles, mixed chapters, Party Kit and Theme Packs.',
    'bulk' => 'Create many games in one go.',
    'marketing' => 'Listing images and videos for your shop.',
];

$name = trim((string)$user['shop_name']) ?: strtok((string)$user['email'], '@');
$f = flash();
page_head('Dashboard', 'dash', ['user' => $user, 'nav' => 'projects']);
?>
<main class="page dash-page">
  <?php if ($f): ?><div class="alert <?= h($f['kind']) ?>"><?= h($f['msg']) ?></div><?php endif; ?>

  <section class="dash-hero card">
    <div class="dash-hero-text">
      <p class="dash-kicker">Welcome back</p>
      <h1><?= h($name) ?></h1>
      <p class="dash-lead">Turn any theme into a printable escape game. Every puzzle is a real Slitherlink with exactly one solution, and every solved loop reveals a letter of the secret code.</p>
      <div class="dash-hero-actions">
        <a class="btn primary lg" href="editor.php">+ New escape game</a>
        <?php if ($latest): ?><a class="btn lg" href="editor.php?id=<?= (int)$latest['id'] ?>">Continue “<?= h(mb_strimwidth($latest['title'], 0, 34, '…')) ?>”</a><?php endif; ?>
      </div>
    </div>
    <div class="dash-hero-art">
      <?php if ($showcase): ?>
        <a class="dash-showcase" href="editor.php?id=<?= $showcase['id'] ?>" title="Open <?= h($showcase['title']) ?>">
          <?= puzzle_svg($showcase['puzzle'], true, 'ps ps-hero') ?>
          <span class="dash-showcase-cap">Letter <b><?= h($showcase['puzzle']['letter']) ?></b> · from <?= h($showcase['title']) ?></span>
        </a>
      <?php else: ?>
        <div class="dash-showcase dash-showcase-empty">
          <svg class="ps ps-hero" viewBox="0 0 102 122" aria-hidden="true"><g transform="translate(6 6)">
            <path class="ps-loop" pathLength="1" d="M20 0H70V20H50V90H40V20H20Z"/>
          </g></svg>
          <span class="dash-showcase-cap">Close the loop, find the letter</span>
        </div>
      <?php endif; ?>
    </div>
  </section>

  <section class="dash-stats" aria-label="Your numbers">
    <div class="dash-stat card"><b><?= $stats['games'] ?></b><span>Games</span></div>
    <div class="dash-stat card"><b><?= $stats['ready'] ?></b><span>Ready to export</span></div>
    <div class="dash-stat card"><b><?= $stats['puzzles'] ?></b><span>Puzzles built</span></div>
    <div class="dash-stat card"><b><?= count($stats['themes']) ?></b><span>Themes used</span></div>
  </section>

  <section class="dash-steps card">
    <div class="dash-section-head"><h2>How it works</h2><span class="badge">4 steps</span></div>
    <ol>
      <li><span class="dash-step-n">1</span><div><b>Pick a theme and audience</b><p>Choose from 18 themes or type your own, then Kids, Teens or Adults.</p></div></li>
      <li><span class="dash-step-n">2</span><div><b>Write the story with your AI</b><p>Copy our prompt into ChatGPT or Claude and paste the reply back. We check it for you.</p></div></li>
      <li><span class="dash-step-n">3</span><div><b>Build the puzzles</b><p>Each puzzle is checked by computer: one solution, solvable by logic alone.</p></div></li>
      <li><span class="dash-step-n">4</span><div><b>Export and sell</b><p>Print-ready PDF in US Letter, A4 or KDP size, with host guide, hints and answers.</p></div></li>
    </ol>
  </section>

  <section class="dash-projects">
    <div class="dash-section-head">
      <h2>Your games</h2>
      <?php if ($projects): ?>
      <div class="dash-tools">
        <div class="dash-filter" role="group" aria-label="Filter by status">
          <button type="button" class="on" data-filter="all">All <span><?= count($projects) ?></span></button>
          <button type="button" data-filter="ready">Ready <span><?= $stats['ready'] ?></span></button>
          <button type="button" data-filter="progress">In progress <span><?= count($projects) - $stats['ready'] ?></span></button>
        </div>
        <label class="dash-search"><?= $icons['search'] ?><input type="text" id="search" placeholder="Search title, code or theme…" aria-label="Search games"></label>
      </div>
      <?php endif; ?>
    </div>

    <?php if (!$projects): ?>
      <div class="card card-pad empty">
        <h2>No games yet</h2>
        <p class="muted">Your first printable escape game is a few clicks away.</p>
        <a class="btn primary lg" href="editor.php">+ New escape game</a>
      </div>
    <?php else: ?>
    <div class="project-grid" id="projects">
      <?php foreach ($projects as $p): [$cls, $label] = $statusBadge[$p['status']] ?? $statusBadge['draft']; ?>
      <article class="card project-card" data-status="<?= $p['status'] === 'ready' ? 'ready' : 'progress' ?>"
        data-search="<?= h(mb_strtolower($p['title'] . ' ' . $p['code'] . ' ' . $p['themeId'] . ' ' . $p['customTheme'])) ?>">
        <a class="project-cover" href="editor.php?id=<?= (int)$p['id'] ?>" aria-label="Open <?= h($p['title']) ?>">
          <?php if ($p['thumb']): ?>
            <?= puzzle_svg($p['thumb'], false, 'ps ps-thumb') ?>
          <?php else: ?>
            <div class="cover-title"><?= h($p['title']) ?></div>
          <?php endif; ?>
          <span class="badge <?= $cls ?>"><span class="dot"></span><?= h($label) ?></span>
        </a>
        <div class="project-body">
          <h3><a href="editor.php?id=<?= (int)$p['id'] ?>"><?= h($p['title']) ?></a></h3>
          <div class="project-theme muted" data-theme-id="<?= h($p['themeId']) ?>" data-custom="<?= h($p['customTheme']) ?>"></div>
          <div class="project-meta">
            <span class="badge dark"><?= h($audience[$p['difficulty']] ?? 'Teens 14–17') ?></span>
            <?php if ($p['puzzle_count']): ?><span class="badge"><?= (int)$p['puzzle_count'] ?> puzzles</span><?php endif; ?>
            <?php if ($p['chapter_count']): ?><span class="badge"><?= (int)$p['chapter_count'] ?> chapters</span><?php endif; ?>
            <?php if ($p['mode'] !== 'letter' && isset($modes[$p['mode']])): ?><span class="badge pro"><?= h($modes[$p['mode']]) ?></span><?php endif; ?>
          </div>
          <?php if ($p['code']): ?><div class="project-code" title="Secret code"><?= h($p['code']) ?></div><?php endif; ?>
        </div>
        <div class="project-foot">
          <span class="muted">Edited <?= h(time_ago($p['updated_at'])) ?></span>
          <div class="project-actions">
            <a class="btn sm" href="editor.php?id=<?= (int)$p['id'] ?>">Open</a>
            <button class="icon-btn" title="Duplicate with a new seed" aria-label="Duplicate" data-duplicate="<?= (int)$p['id'] ?>"><?= $icons['copy'] ?></button>
            <button class="icon-btn" title="Delete" aria-label="Delete" data-delete="<?= (int)$p['id'] ?>" data-name="<?= h($p['title']) ?>"><?= $icons['trash'] ?></button>
          </div>
        </div>
      </article>
      <?php endforeach; ?>
      <a class="new-card" href="editor.php"><span class="plus">+</span>New escape game</a>
    </div>
    <p class="muted dash-none hidden" id="no-match">No games match your search.</p>
    <?php endif; ?>
  </section>

  <section class="dash-plans">
    <div class="dash-section-head"><h2>Your plan</h2></div>
    <div class="dash-plan-grid">
      <div class="dash-plan card on">
        <div class="dash-plan-top"><b>SlitherEscape Studio</b><span class="badge ok"><span class="dot"></span>Active</span></div>
        <p>Letter puzzles, AI story prompt, every export size, host guide and certificate.</p>
      </div>
      <?php foreach (PLANS as $plan => $label): $has = $ownedPlans[$plan]; ?>
      <div class="dash-plan card <?= $has ? 'on' : '' ?>">
        <div class="dash-plan-top"><b><?= h($label) ?></b><?= $has ? '<span class="badge ok"><span class="dot"></span>Active</span>' : '<span class="badge">Not on your account</span>' ?></div>
        <p><?= h($planInfo[$plan] ?? '') ?></p>
      </div>
      <?php endforeach; ?>
    </div>
  </section>
</main>

<div class="modal-backdrop hidden" id="confirm-delete">
  <div class="modal">
    <div class="modal-head"><h2>Delete project?</h2></div>
    <div class="modal-body"><p><b id="delete-name"></b> will be permanently deleted, including its story and generated puzzles. This cannot be undone.</p></div>
    <div class="modal-foot">
      <button type="button" class="btn ghost" data-close-modal>Cancel</button>
      <button type="button" class="btn primary" id="delete-confirm">Delete project</button>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>
<?php page_foot(['assets/js/ui.js', 'assets/js/themes.js', 'assets/js/dashboard.js']); ?>
