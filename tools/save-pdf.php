<?php
// Dev helper: saves a PDF posted from the browser into tools/out/ for review.
// Only answers requests from the local machine; not part of the deployed app.
if (!in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true)) { http_response_code(403); exit; }
$name = preg_replace('/[^a-z0-9.\-]/i', '', $_GET['name'] ?? 'out.pdf');
@mkdir(__DIR__ . '/out');
file_put_contents(__DIR__ . '/out/' . $name, file_get_contents('php://input'));
echo 'saved ' . $name;
