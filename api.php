<?php
// JSON API for projects. POST only, JSON body { action, ... }, header X-CSRF-Token.
//   save      { id?, title, data }  -> { id, updated }
//   duplicate { id }                -> { id }   (copy with a new seed and no puzzles)
//   delete    { id }                -> { ok }
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';

if (!is_installed()) json_out(['error' => 'Not installed'], 503);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['error' => 'POST only'], 405);
$user = current_user();
if (!$user) json_out(['error' => 'Your session has ended. Please log in again.'], 401);
if (!csrf_valid($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null)) json_out(['error' => 'Security token expired. Reload the page.'], 403);

const MAX_PROJECT_BYTES = 4 * 1024 * 1024;

$raw = file_get_contents('php://input');
if (strlen($raw) > MAX_PROJECT_BYTES + 1024) json_out(['error' => 'Project is too large to save.'], 413);
$in = json_decode($raw, true);
if (!is_array($in)) json_out(['error' => 'Invalid request.'], 400);

function own_project(int $id, int $userId): array
{
    $p = db_one('SELECT * FROM projects WHERE id = ? AND user_id = ?', [$id, $userId]);
    if (!$p) json_out(['error' => 'Project not found.'], 404);
    return $p;
}

// Dashboard summary columns, derived from the saved editor state.
function summarise(array $data): array
{
    $chapters = $data['story']['chapters'] ?? [];
    $words = array_values(array_filter(array_map(fn($c) => strtoupper((string)($c['word'] ?? '')), is_array($chapters) ? $chapters : [])));
    $count = array_sum(array_map('strlen', $words));
    $puzzles = is_array($data['puzzles'] ?? null) ? $data['puzzles'] : [];
    $built = count(array_filter($puzzles, fn($p) => is_array($p) && !empty($p['verify']['ok'])));
    $status = !$words ? 'draft' : (($count > 0 && $built === $count) ? 'ready' : 'story');
    $diff = in_array($data['settings']['difficulty'] ?? '', ['easy', 'medium', 'hard'], true) ? $data['settings']['difficulty'] : 'medium';
    return [
        'status' => $status,
        'code' => substr(implode(' ', $words), 0, 40),
        'difficulty' => $diff,
        'puzzle_count' => $count,
        'chapter_count' => count($words),
    ];
}

function new_seed(): string
{
    return strtoupper(bin2hex(random_bytes(2)) . '-' . bin2hex(random_bytes(2)));
}

$action = $in['action'] ?? '';
$uid = (int)$user['id'];

switch ($action) {
    case 'save': {
        $data = $in['data'] ?? null;
        if (!is_array($data)) json_out(['error' => 'Nothing to save.'], 400);
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (strlen($json) > MAX_PROJECT_BYTES) json_out(['error' => 'Project is too large to save.'], 413);
        $title = trim((string)($in['title'] ?? '')) ?: 'Untitled game';
        $title = mb_substr($title, 0, 200);
        $s = summarise($data);
        $id = (int)($in['id'] ?? 0);
        if ($id) {
            own_project($id, $uid);
            db_exec('UPDATE projects SET title = ?, status = ?, code = ?, difficulty = ?, puzzle_count = ?, chapter_count = ?, data = ?, updated_at = ? WHERE id = ? AND user_id = ?',
                [$title, $s['status'], $s['code'], $s['difficulty'], $s['puzzle_count'], $s['chapter_count'], $json, now(), $id, $uid]);
        } else {
            db_exec('INSERT INTO projects (user_id, title, status, code, difficulty, puzzle_count, chapter_count, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [$uid, $title, $s['status'], $s['code'], $s['difficulty'], $s['puzzle_count'], $s['chapter_count'], $json, now(), now()]);
            $id = (int)db()->lastInsertId();
        }
        json_out(['id' => $id, 'status' => $s['status']]);
    }

    case 'duplicate': {
        $p = own_project((int)($in['id'] ?? 0), $uid);
        $data = json_decode($p['data'], true) ?: [];
        // Same story, new seed: the copy rebuilds a completely different set of puzzles.
        $data['settings']['seed'] = new_seed();
        $data['puzzles'] = [];
        $s = summarise($data);
        $title = mb_substr($p['title'] . ' (copy)', 0, 200);
        db_exec('INSERT INTO projects (user_id, title, status, code, difficulty, puzzle_count, chapter_count, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [$uid, $title, $s['status'], $s['code'], $s['difficulty'], $s['puzzle_count'], $s['chapter_count'], json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), now(), now()]);
        json_out(['id' => (int)db()->lastInsertId()]);
    }

    case 'delete': {
        $p = own_project((int)($in['id'] ?? 0), $uid);
        db_exec('DELETE FROM projects WHERE id = ? AND user_id = ?', [$p['id'], $uid]);
        json_out(['ok' => true]);
    }

    default:
        json_out(['error' => 'Unknown action.'], 400);
}
