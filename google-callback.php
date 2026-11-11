<?php
// Google sends the buyer back here after they pick an account.
// A new account is only made when a purchase link was opened first; otherwise the email must
// already have an account (made by an earlier link or by the owner in admin.php).
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';

if (!is_installed()) redirect('install.php');
if (!google_configured()) redirect('login.php');

if (isset($_GET['error'])) {
    flash('Google sign-in was cancelled.', 'err');
    redirect('login.php');
}

try {
    $google = google_account((string)($_GET['code'] ?? ''), (string)($_GET['state'] ?? ''));
} catch (RuntimeException $e) {
    flash($e->getMessage(), 'err');
    redirect('login.php');
}

$user = db_one('SELECT id FROM users WHERE email = ?', [$google['email']]);
if (!$user) {
    if (!pending_plans()) {
        flash('There is no account for ' . $google['email'] . '. Open the access link from your purchase receipt first, then sign in.', 'err');
        redirect('login.php');
    }
    // Google accounts get a random, unknown password: they always sign in with Google.
    db_exec('INSERT INTO users (email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)',
        [$google['email'], password_hash(bin2hex(random_bytes(24)), PASSWORD_DEFAULT), now(), now()]);
    $user = db_one('SELECT id FROM users WHERE email = ?', [$google['email']]);
}

$granted = apply_pending_plans((int)$user['id']);
log_in((int)$user['id'], true);
if ($granted) flash(implode(', ', $granted) . ' ' . (count($granted) > 1 ? 'are' : 'is') . ' active on your account.');
redirect('dashboard.php');
