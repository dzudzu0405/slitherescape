<?php
// Shared page chrome for SlitherEscape Studio.

const APP_NAME = 'SlitherEscape Studio';

function h($s): string
{
    return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
}

function brand_logo(): string
{
    // Dot grid with a closed loop: the Slitherlink motif.
    return '<svg class="logo" viewBox="0 0 32 32" aria-hidden="true">'
        . '<rect x="1" y="1" width="30" height="30" rx="7" fill="#3B2412"/>'
        . '<path d="M8 8H16V12H24V24H12V16H8Z" fill="none" stroke="#EEDDBA" stroke-width="2.4" stroke-linejoin="round"/>'
        . '<g fill="#C9A877">'
        . '<circle cx="8" cy="8" r="1.4"/><circle cx="16" cy="8" r="1.4"/><circle cx="24" cy="8" r="1.4"/>'
        . '<circle cx="8" cy="16" r="1.4"/><circle cx="16" cy="16" r="1.4"/><circle cx="24" cy="16" r="1.4"/>'
        . '<circle cx="8" cy="24" r="1.4"/><circle cx="16" cy="24" r="1.4"/><circle cx="24" cy="24" r="1.4"/>'
        . '</g></svg>';
}

function page_head(string $title, string $bodyClass = '', array $opts = []): void
{
    $user = $opts['user'] ?? null;
    ?><!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= h($title) ?> · <?= APP_NAME ?></title>
<meta name="csrf-token" content="<?= h(csrf_token()) ?>">
<link rel="stylesheet" href="assets/css/app.css?v=<?= h(asset_version()) ?>">
</head>
<body class="<?= h($bodyClass) ?>">
<?php if (empty($opts['bare'])): ?>
<header class="topbar">
  <a class="brand" href="dashboard.php"><?= brand_logo() ?><span>SlitherEscape <em>Studio</em></span></a>
  <?php if (!empty($opts['center'])): ?><div class="topbar-center"><?= $opts['center'] ?></div><?php endif; ?>
  <nav class="topnav">
    <a href="dashboard.php" class="<?= ($opts['nav'] ?? '') === 'projects' ? 'active' : '' ?>">Projects</a>
    <a href="account.php" class="<?= ($opts['nav'] ?? '') === 'account' ? 'active' : '' ?>">Account</a>
    <?php if ($user): ?>
    <span class="user-chip" title="<?= h($user['email']) ?>"><?= h(mb_strtoupper(mb_substr($user['shop_name'] ?: $user['email'], 0, 1))) ?></span>
    <form method="post" action="logout.php" class="logout-form"><?= csrf_field() ?><button type="submit">Log out</button></form>
    <?php endif; ?>
  </nav>
</header>
<?php endif; ?>
<?php
}

// Cache-busting token so browsers pick up new CSS/JS after an update is uploaded.
function asset_version(): string
{
    static $v = null;
    if ($v === null) {
        // Newest change across all scripts and styles, so any updated file busts the cache.
        $root = __DIR__ . '/../assets/';
        $files = array_merge(glob($root . 'js/*.js') ?: [], glob($root . 'js/*/*.js') ?: [], glob($root . 'css/*.css') ?: []);
        $v = (string)max(array_map('filemtime', $files) ?: [0]);
    }
    return $v;
}

function page_foot(array $scripts = []): void
{
    foreach ($scripts as $src) {
        echo '<script src="' . h($src) . '?v=' . h(asset_version()) . '"></script>' . "\n";
    }
    echo "</body>\n</html>\n";
}
