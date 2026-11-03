<?php
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';

// Logging out only via POST with a CSRF token, so a link on another site can't do it.
if ($_SERVER['REQUEST_METHOD'] === 'POST' && csrf_valid($_POST['csrf'] ?? null)) {
    log_out();
}
redirect('login.php');
