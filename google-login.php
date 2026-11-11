<?php
// Sends the visitor to Google's account picker.
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';

if (!is_installed()) redirect('install.php');
if (!google_configured()) {
    flash('Google sign-in is not set up yet.', 'err');
    redirect('login.php');
}
redirect(google_auth_url());
