<?php
// Serves SlitherEscape PRO scripts and the approved image library, only to accounts that own PRO.
// The files themselves live in pro/, which .htaccess blocks from direct access.
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';

const PRO_FILES = [
    'mosaic' => 'engine/mosaic.js',
    'pdf-mosaic' => 'pdf/mosaic.js',
    'pdf-party' => 'pdf/party.js',
    'packs' => 'library/packs.js',
];

if (!is_installed()) { http_response_code(503); exit; }
$user = current_user();
if (!$user) { http_response_code(401); exit; }
if (!has_plan($user, 'pro')) { http_response_code(403); exit; }

header('Content-Type: application/javascript; charset=utf-8');
header('Cache-Control: private, max-age=86400');
header('X-Content-Type-Options: nosniff');

// A fresh install has an empty library, which left the Mosaic prompt with no pictures to choose from.
// The pictures shipped in pro/library/seed.json were all reviewed before release, so the first
// request loads them as approved. After that the owner manages them in admin-library.php as before.
function seed_library_if_empty(): void
{
    $row = db_one('SELECT COUNT(*) AS n FROM library_images');
    if ($row && (int)$row['n'] > 0) return;
    $seed = json_decode((string)@file_get_contents(__DIR__ . '/pro/library/seed.json'), true) ?: [];
    foreach ($seed as $m) {
        if (empty($m['name']) || empty($m['rows'])) continue;
        db_exec('INSERT INTO library_images (name, theme, similar, grid_rows, source, svg, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [$m['name'], $m['theme'], json_encode($m['similar'] ?? []), json_encode($m['rows']), $m['source'] ?? '', '', 'approved', now(), now()]);
    }
}

$f = (string)($_GET['f'] ?? '');
if ($f === 'library') {
    header('Cache-Control: no-store');
    seed_library_if_empty();
    $rows = db_all("SELECT name, theme, similar, grid_rows FROM library_images WHERE status = 'approved' ORDER BY theme, name");
    $list = array_map(fn($r) => [
        'name' => $r['name'],
        'theme' => $r['theme'],
        'similar' => json_decode($r['similar'], true) ?: [],
        'rows' => json_decode($r['grid_rows'], true) ?: [],
    ], $rows);
    echo 'window.ProLibrary = ' . json_encode($list, JSON_UNESCAPED_UNICODE) . ";\n";
    exit;
}
if (!isset(PRO_FILES[$f])) { http_response_code(404); exit; }
readfile(__DIR__ . '/pro/' . PRO_FILES[$f]);
