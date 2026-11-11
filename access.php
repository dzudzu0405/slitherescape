<?php
// Purchase link from WarriorPlus: access.php?k=<key>. Signed in → the plan is added now;
// signed out → the plan is remembered and added right after the buyer signs in.
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';

if (!is_installed()) redirect('install.php');

$plan = plan_for_key((string)($_GET['k'] ?? ''));
if ($plan === null) {
    http_response_code(404);
    page_head('Link not valid', 'auth', ['bare' => true]);
    ?>
<main class="auth-box">
  <div class="auth-brand"><?= brand_logo() ?><h1>SlitherEscape <em>Studio</em></h1></div>
  <div class="card">
    <div class="alert err">This access link is not valid any more.</div>
    <p class="small muted">Please use the link from your purchase receipt, or contact the seller for a new one.</p>
    <a class="btn primary block" href="login.php">Go to sign in</a>
  </div>
</main>
<?php
    page_foot();
    exit;
}

$user = current_user();
if ($user) {
    grant_plan((int)$user['id'], $plan, 'link');
    flash(ACCESS_PLANS[$plan] . ' is active on your account.');
    redirect('dashboard.php');
}

add_pending_plan($plan);
redirect('login.php');
