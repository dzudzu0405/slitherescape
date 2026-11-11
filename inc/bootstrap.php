<?php
// App bootstrap: config, database, session, CSRF and auth helpers.
declare(strict_types=1);

require_once __DIR__ . '/layout.php';

const CONFIG_FILE = __DIR__ . '/../config.php';
const DATA_DIR = __DIR__ . '/../data';
// Bump when schema_sql() gains tables, so existing installs pick them up on the next visit.
const SCHEMA_VERSION = 3;
const PLANS = ['pro' => 'SlitherEscape PRO', 'bulk' => 'Bulk Creator', 'marketing' => 'Marketing Studio'];
// Purchase links: the FE link gives an account, each OTO link adds its plan.
const ACCESS_PLANS = ['fe' => 'Slitherlink Escape Game Builder (FE)'] + PLANS;

require_once __DIR__ . '/access.php';
require_once __DIR__ . '/legal.php';

function is_installed(): bool
{
    return is_file(CONFIG_FILE);
}

function config(): array
{
    static $cfg = null;
    if ($cfg === null) {
        $cfg = is_installed() ? require CONFIG_FILE : [];
    }
    return $cfg;
}

// ------------------------------------------------------------------ database

function db_connect(array $db): PDO
{
    $opts = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    if (($db['driver'] ?? 'mysql') === 'sqlite') {
        // Local testing only; cPanel installs use MySQL.
        $pdo = new PDO('sqlite:' . $db['path'], null, null, $opts);
        $pdo->exec('PRAGMA foreign_keys = ON');
        return $pdo;
    }
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $db['host'], (int)($db['port'] ?? 3306), $db['name']);
    return new PDO($dsn, $db['user'], $db['pass'], $opts);
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $pdo = db_connect(config()['db']);
    }
    return $pdo;
}

function db_one(string $sql, array $args = []): ?array
{
    $st = db()->prepare($sql);
    $st->execute($args);
    $row = $st->fetch();
    return $row === false ? null : $row;
}

function db_all(string $sql, array $args = []): array
{
    $st = db()->prepare($sql);
    $st->execute($args);
    return $st->fetchAll();
}

function db_exec(string $sql, array $args = []): int
{
    $st = db()->prepare($sql);
    $st->execute($args);
    return $st->rowCount();
}

function now(): string
{
    return gmdate('Y-m-d H:i:s');
}

// Table definitions for each driver.
function schema_sql(string $driver): array
{
    if ($driver === 'sqlite') {
        return [
            'CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                shop_name TEXT NOT NULL DEFAULT \'\',
                paper TEXT NOT NULL DEFAULT \'letter\',
                ink_saver INTEGER NOT NULL DEFAULT 0,
                is_admin INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL)',
            'CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT \'draft\',
                code TEXT NOT NULL DEFAULT \'\',
                difficulty TEXT NOT NULL DEFAULT \'medium\',
                puzzle_count INTEGER NOT NULL DEFAULT 0,
                chapter_count INTEGER NOT NULL DEFAULT 0,
                data TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL)',
            'CREATE INDEX IF NOT EXISTS projects_user ON projects(user_id, updated_at)',
            'CREATE TABLE IF NOT EXISTS login_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ip TEXT NOT NULL,
                attempted_at TEXT NOT NULL)',
            'CREATE TABLE IF NOT EXISTS entitlements (
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                plan TEXT NOT NULL,
                source TEXT NOT NULL DEFAULT \'manual\',
                created_at TEXT NOT NULL,
                PRIMARY KEY (user_id, plan))',
            'CREATE TABLE IF NOT EXISTS settings (
                name TEXT NOT NULL PRIMARY KEY,
                value TEXT NOT NULL)',
            'CREATE TABLE IF NOT EXISTS library_images (
                name TEXT NOT NULL PRIMARY KEY,
                theme TEXT NOT NULL,
                similar TEXT NOT NULL,
                grid_rows TEXT NOT NULL,
                source TEXT NOT NULL,
                svg TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT \'pending\',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL)',
        ];
    }
    return [
        'CREATE TABLE IF NOT EXISTS users (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(190) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            shop_name VARCHAR(120) NOT NULL DEFAULT \'\',
            paper VARCHAR(10) NOT NULL DEFAULT \'letter\',
            ink_saver TINYINT(1) NOT NULL DEFAULT 0,
            is_admin TINYINT(1) NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS projects (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            user_id INT UNSIGNED NOT NULL,
            title VARCHAR(200) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT \'draft\',
            code VARCHAR(40) NOT NULL DEFAULT \'\',
            difficulty VARCHAR(10) NOT NULL DEFAULT \'medium\',
            puzzle_count SMALLINT NOT NULL DEFAULT 0,
            chapter_count TINYINT NOT NULL DEFAULT 0,
            data MEDIUMTEXT NOT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            KEY projects_user (user_id, updated_at),
            CONSTRAINT projects_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS login_attempts (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            ip VARCHAR(45) NOT NULL,
            attempted_at DATETIME NOT NULL,
            KEY login_attempts_ip (ip, attempted_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        'CREATE TABLE IF NOT EXISTS entitlements (
            user_id INT UNSIGNED NOT NULL,
            plan VARCHAR(20) NOT NULL,
            source VARCHAR(20) NOT NULL DEFAULT \'manual\',
            created_at DATETIME NOT NULL,
            PRIMARY KEY (user_id, plan),
            CONSTRAINT entitlements_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        'CREATE TABLE IF NOT EXISTS settings (
            name VARCHAR(60) NOT NULL PRIMARY KEY,
            value TEXT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        'CREATE TABLE IF NOT EXISTS library_images (
            name VARCHAR(20) NOT NULL PRIMARY KEY,
            theme VARCHAR(30) NOT NULL,
            similar TEXT NOT NULL,
            grid_rows TEXT NOT NULL,
            source VARCHAR(200) NOT NULL,
            svg MEDIUMTEXT NOT NULL,
            status VARCHAR(10) NOT NULL DEFAULT \'pending\',
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            KEY library_status (status, theme)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    ];
}

// Adds new tables to an existing install once per schema version.
function ensure_schema(): void
{
    static $done = false;
    if ($done || !is_installed()) return;
    $done = true;
    $mark = DATA_DIR . '/schema-version';
    if (is_file($mark) && (int)file_get_contents($mark) >= SCHEMA_VERSION) return;
    foreach (schema_sql(config()['db']['driver'] ?? 'mysql') as $sql) db()->exec($sql);
    @file_put_contents($mark, (string)SCHEMA_VERSION);
}

// ------------------------------------------------------------------ session

function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    // Sessions live inside the app so shared-hosting cleanup jobs don't log people out.
    $dir = DATA_DIR . '/sessions';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    if (is_dir($dir) && is_writable($dir)) {
        session_save_path($dir);
    }
    $lifetime = 60 * 60 * 24 * 30;
    ini_set('session.gc_maxlifetime', (string)$lifetime);
    ini_set('session.use_strict_mode', '1');
    session_name('se_session');
    session_set_cookie_params([
        'lifetime' => !empty($_COOKIE['se_remember']) ? $lifetime : 0,
        'path' => '/',
        'secure' => is_https(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function is_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
        || (($_SERVER['SERVER_PORT'] ?? '') === '443');
}

// ------------------------------------------------------------------ CSRF

function csrf_token(): string
{
    start_session();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function csrf_field(): string
{
    return '<input type="hidden" name="csrf" value="' . h(csrf_token()) . '">';
}

function csrf_valid(?string $token): bool
{
    start_session();
    return is_string($token) && !empty($_SESSION['csrf']) && hash_equals($_SESSION['csrf'], $token);
}

// ------------------------------------------------------------------ auth

function current_user(): ?array
{
    static $user = false;
    if ($user !== false) {
        return $user;
    }
    start_session();
    $user = null;
    ensure_schema();
    if (!empty($_SESSION['uid'])) {
        $user = db_one('SELECT id, email, shop_name, paper, ink_saver, is_admin FROM users WHERE id = ?', [$_SESSION['uid']]);
    }
    return $user;
}

// Plans the account owns. Admins can use everything, so the owner can test each plan.
function has_plan(array $user, string $plan): bool
{
    if (!empty($user['is_admin'])) return true;
    return (bool)db_one('SELECT 1 AS x FROM entitlements WHERE user_id = ? AND plan = ?', [$user['id'], $plan]);
}

// Page guard: sends visitors to the installer or the login page.
function require_login(): array
{
    if (!is_installed()) {
        redirect('install.php');
    }
    $user = current_user();
    if (!$user) {
        redirect('login.php');
    }
    return $user;
}

function log_in(int $userId, bool $remember): void
{
    start_session();
    session_regenerate_id(true);
    $_SESSION['uid'] = $userId;
    if ($remember) {
        setcookie('se_remember', '1', ['expires' => time() + 60 * 60 * 24 * 30, 'path' => '/', 'secure' => is_https(), 'httponly' => true, 'samesite' => 'Lax']);
        // Re-send the session cookie with a lifetime so it survives closing the browser.
        setcookie(session_name(), session_id(), ['expires' => time() + 60 * 60 * 24 * 30, 'path' => '/', 'secure' => is_https(), 'httponly' => true, 'samesite' => 'Lax']);
    }
}

function log_out(): void
{
    start_session();
    $_SESSION = [];
    session_destroy();
    setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => '/']);
    setcookie('se_remember', '', ['expires' => time() - 3600, 'path' => '/']);
}

// Simple brute-force guard: at most 8 failed logins per IP in 15 minutes.
function login_blocked(string $ip): bool
{
    $since = gmdate('Y-m-d H:i:s', time() - 15 * 60);
    $row = db_one('SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND attempted_at > ?', [$ip, $since]);
    return (int)($row['n'] ?? 0) >= 8;
}

function record_failed_login(string $ip): void
{
    db_exec('INSERT INTO login_attempts (ip, attempted_at) VALUES (?, ?)', [$ip, now()]);
    db_exec('DELETE FROM login_attempts WHERE attempted_at < ?', [gmdate('Y-m-d H:i:s', time() - 24 * 3600)]);
}

// ------------------------------------------------------------------ responses

function redirect(string $to): never
{
    header('Location: ' . $to);
    exit;
}

function json_out(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function flash(?string $msg = null, string $kind = 'ok'): ?array
{
    start_session();
    if ($msg !== null) {
        $_SESSION['flash'] = ['msg' => $msg, 'kind' => $kind];
        return null;
    }
    $f = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);
    return $f;
}

function client_ip(): string
{
    return substr((string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'), 0, 45);
}

// "3 hours ago" style label for UTC timestamps from the database.
function time_ago(string $utc): string
{
    $t = strtotime($utc . ' UTC');
    $d = time() - $t;
    if ($d < 60) return 'just now';
    if ($d < 3600) return floor($d / 60) . ' min ago';
    if ($d < 86400) return floor($d / 3600) . ' h ago';
    if ($d < 172800) return 'yesterday';
    if ($d < 86400 * 30) return floor($d / 86400) . ' days ago';
    return gmdate('j M Y', $t);
}
