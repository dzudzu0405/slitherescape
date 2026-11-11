<?php
// Serves Bulk Creator (OTO2) scripts from bulk/ only to accounts that own the 'bulk' plan.
// bulk/ itself is blocked from direct access by .htaccess.
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';

const BULK_FILES = ['variants' => 'variants.js', 'bundle' => 'bundle.js', 'batch' => 'batch.js'];

if (!is_installed()) { http_response_code(503); exit; }
$user = current_user();
if (!$user) { http_response_code(401); exit; }
if (!has_plan($user, 'bulk')) { http_response_code(403); exit; }
$f = (string)($_GET['f'] ?? '');
if (!isset(BULK_FILES[$f]) || !is_file(__DIR__ . '/bulk/' . BULK_FILES[$f])) { http_response_code(404); exit; }
header('Content-Type: application/javascript; charset=utf-8');
header('Cache-Control: private, max-age=86400');
header('X-Content-Type-Options: nosniff');
readfile(__DIR__ . '/bulk/' . BULK_FILES[$f]);
