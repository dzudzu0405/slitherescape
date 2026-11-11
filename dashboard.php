<?php
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';

$user = require_login();
$projects = db_all('SELECT id, title, status, code, difficulty, puzzle_count, chapter_count, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC', [$user['id']]);

$statusBadge = [
    'ready' => ['ok', 'Ready to export'],
    'story' => ['warn', 'Puzzles not built'],
    'draft' => ['', 'No story yet'],
];
$audience = ['easy' => 'Kids', 'medium' => 'Teens', 'hard' => 'Adults'];

$icons = [
    'copy' => '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M13 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/></svg>',
    'trash' => '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 6h12M8 6V4h4v2M6 6l1 11h6l1-11"/></svg>',
];

$f = flash();
page_head('Projects', '', ['user' => $user, 'nav' => 'projects']);
?>
<main class="page">
  <?php if ($f): ?><div class="alert <?= h($f['kind']) ?>"><?= h($f['msg']) ?></div><?php endif; ?>
  <div class="page-head">
    <div>
      <h1>Your projects</h1>
      <p><?= count($projects) ?> game<?= count($projects) === 1 ? '' : 's' ?> · Each project keeps its story, settings and seed so you can reopen, edit and re-export it.</p>
    </div>
    <div class="toolbar">
      <?php if ($projects): ?><input type="text" id="search" placeholder="Search by title or code…"><?php endif; ?>
      <a class="btn ghost" href="bundle.php">Make a bundle<?= has_plan($user, 'bulk') ? '' : ' <span class="nav-lock">&#128274;</span>' ?></a>
      <a class="btn primary" href="editor.php">+ New game</a>
    </div>
  </div>

  <?php if (!$projects): ?>
    <div class="card card-pad empty">
      <h2>No games yet</h2>
      <p class="muted">Create your first printable escape game in three clicks.</p>
      <a class="btn primary lg" href="editor.php">+ New game</a>
    </div>
  <?php else: ?>
  <div class="project-grid" id="projects">
    <?php foreach ($projects as $p): [$cls, $label] = $statusBadge[$p['status']] ?? $statusBadge['draft']; ?>
    <article class="card project-card" data-search="<?= h(strtolower($p['title'] . ' ' . $p['code'])) ?>">
      <a class="project-cover" href="editor.php?id=<?= (int)$p['id'] ?>">
        <div>
          <div class="cover-title"><?= h($p['title']) ?></div>
          <?php if ($p['code']): ?><div class="cover-code"><?= h($p['code']) ?></div><?php endif; ?>
        </div>
      </a>
      <div class="project-body">
        <h3><a href="editor.php?id=<?= (int)$p['id'] ?>"><?= h($p['title']) ?></a></h3>
        <span class="badge <?= $cls ?>" style="align-self:flex-start"><span class="dot"></span><?= h($label) ?></span>
        <div class="project-meta">
          <span class="badge dark"><?= h($audience[$p['difficulty']] ?? 'Teens') ?></span>
          <?php if ($p['puzzle_count']): ?><span class="badge"><?= (int)$p['puzzle_count'] ?> puzzles</span><?php endif; ?>
          <?php if ($p['chapter_count']): ?><span class="badge"><?= (int)$p['chapter_count'] ?> chapters</span><?php endif; ?>
        </div>
      </div>
      <div class="project-foot">
        <span class="muted">Edited <?= h(time_ago($p['updated_at'])) ?></span>
        <div class="project-actions">
          <button class="icon-btn" title="Duplicate with a new seed" data-duplicate="<?= (int)$p['id'] ?>"><?= $icons['copy'] ?></button>
          <button class="icon-btn" title="Delete" data-delete="<?= (int)$p['id'] ?>" data-name="<?= h($p['title']) ?>"><?= $icons['trash'] ?></button>
        </div>
      </div>
    </article>
    <?php endforeach; ?>
    <a class="new-card" href="editor.php"><span class="plus">+</span>New game</a>
  </div>
  <?php endif; ?>
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
<?php page_foot(['assets/js/ui.js', 'assets/js/dashboard.js']); ?>
