<?php
// Privacy Policy and Terms: the operator details the owner fills in on admin.php,
// plus the shared page frame and the footer links that point to both pages.
declare(strict_types=1);

const LEGAL_DEFAULT_UPDATED = '2026-11-11';

// Operator details shown on the legal pages. Blank fields fall back to a visible
// placeholder so a missing detail is obvious instead of silently empty.
function legal_info(): array
{
    return [
        'name' => setting('legal_name'),
        'email' => setting('legal_email'),
        'country' => setting('legal_country'),
        'updated' => setting('legal_updated', LEGAL_DEFAULT_UPDATED),
    ];
}

function legal_complete(): bool
{
    $l = legal_info();
    return $l['name'] !== '' && $l['email'] !== '' && $l['country'] !== '';
}

// Value or a highlighted "[set in Admin]" marker.
function legal_value(string $key): string
{
    $v = legal_info()[$key];
    return $v !== '' ? h($v) : '<span class="legal-missing">[' . h(ucfirst($key)) . ' — set it in Admin]</span>';
}

function legal_email_link(): string
{
    $email = legal_info()['email'];
    return $email !== '' ? '<a href="mailto:' . h($email) . '">' . h($email) . '</a>' : legal_value('email');
}

function legal_links(): string
{
    return '<nav class="legal-links"><a href="privacy.php">Privacy Policy</a><span aria-hidden="true">·</span><a href="terms.php">Terms of Service</a></nav>';
}

// Public page frame (no sign-in needed: Google's consent screen links here).
function legal_page_start(string $title): void
{
    page_head($title, 'legal', ['bare' => true]);
    ?>
<header class="legal-top">
  <a class="brand" href="index.php"><?= brand_logo() ?><span>SlitherEscape <em>Studio</em></span></a>
  <?= legal_links() ?>
</header>
<main class="legal-page">
  <h1><?= h($title) ?></h1>
  <p class="legal-updated">Last updated: <?= h(date('F j, Y', strtotime(legal_info()['updated']))) ?></p>
<?php
}

function legal_page_end(): void
{
    ?>
</main>
<footer class="legal-foot"><?= legal_links() ?></footer>
<?php
    page_foot();
}
