<?php
// Marketing Studio (OTO3): listing images and a page-flip video made from an exported game PDF.
// Every account sees this page; only accounts with the 'marketing' plan get the Listing Kit itself.
// With ?f=<name> it serves one gated script from marketing/ (blocked from direct access by .htaccess).
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';

const MARKETING_FILES = ['kit' => 'listing-kit.js', 'demo' => 'demo-puzzle.js'];

if (isset($_GET['f'])) {
    if (!is_installed()) { http_response_code(503); exit; }
    $user = current_user();
    if (!$user) { http_response_code(401); exit; }
    if (!has_plan($user, 'marketing')) { http_response_code(403); exit; }
    $f = (string)$_GET['f'];
    if (!isset(MARKETING_FILES[$f])) { http_response_code(404); exit; }
    header('Content-Type: application/javascript; charset=utf-8');
    header('Cache-Control: private, max-age=86400');
    header('X-Content-Type-Options: nosniff');
    readfile(__DIR__ . '/marketing/' . MARKETING_FILES[$f]);
    exit;
}

$user = require_login();
$owned = has_plan($user, 'marketing');
$themeId = '';
if (isset($_GET['project'])) {
    $p = db_one('SELECT data FROM projects WHERE id = ? AND user_id = ?', [(int)$_GET['project'], $user['id']]);
    $themeId = (string)((json_decode((string)($p['data'] ?? ''), true) ?: [])['themeId'] ?? '');
}
$upgrade = upgrade_url('marketing');

page_head('Marketing Studio', '', ['user' => $user, 'nav' => 'marketing']);
?>
<style>
  @font-face { font-family: "Playfair Display"; src: url(assets/fonts/playfair-900.woff2) format("woff2"); font-weight: 900; }
  @font-face { font-family: "Playfair Display"; src: url(assets/fonts/playfair-800.woff2) format("woff2"); font-weight: 800; }
  @font-face { font-family: "DejaVu Serif"; src: url(assets/fonts/DejaVuSerif-Bold.ttf); font-weight: 700; }
  @font-face { font-family: "IM Fell SC"; src: url(assets/fonts/IMFellEnglishSC-Regular.ttf); }
  @font-face { font-family: "IM Fell Italic"; src: url(assets/fonts/IMFellEnglish-Italic.ttf); }
</style>
<main class="page" style="max-width:1100px">
  <div class="page-head">
    <div>
      <h1>Marketing Studio <?php if (!$owned): ?><span class="badge warn">Locked</span><?php endif; ?></h1>
      <p>Turn an exported game PDF into listing images and a page-flip video for Etsy, Amazon and Pinterest.</p>
    </div>
  </div>

<?php if (!$owned): ?>
  <div class="card card-pad section mk-locked">
    <h3 style="margin-bottom:10px">Marketing Studio is not on your account yet</h3>
    <ul class="mk-features">
      <li><b>15 listing images</b> in your game's own style: cover mockup, what's included, how it works, the secret code, hints, ways to play, certificate and more.</li>
      <li><b>Page-flip video</b> (MP4) that shows the pages of your game, ready for Etsy and Pinterest.</li>
      <li><b>No spoilers:</b> answer pages and the host's question pages never appear in your listing.</li>
      <li>Works with every game, variant and bundle you make, right in your browser.</li>
    </ul>
    <div class="mk-actions">
      <?php if ($upgrade !== ''): ?><a class="btn primary" href="<?= h($upgrade) ?>" target="_blank" rel="noopener">Upgrade to Marketing Studio</a><?php endif; ?>
      <span class="small muted">Already bought it? Open the access link from your purchase receipt while signed in.</span>
    </div>
  </div>
<?php else: ?>
  <div class="card card-pad section">
    <h3 style="margin-bottom:6px">1. Your game PDF</h3>
    <p class="small muted" style="margin-bottom:14px">Export the game from the editor first, then choose that PDF here. Nothing is uploaded: everything is made in your browser.</p>
    <div class="row">
      <label class="field"><span>Game PDF</span><input type="file" id="mk-pdf" accept="application/pdf"></label>
      <label class="field"><span>Theme</span><select id="mk-theme"></select></label>
    </div>
    <div class="row">
      <label class="field"><span>Your own theme words <span class="optional">optional</span></span><input type="text" id="mk-custom" placeholder="e.g. a haunted carnival"></label>
      <label class="field"><span>Background</span><select id="mk-material"><option value="">Automatic</option></select></label>
    </div>
    <label class="toggle small" style="margin:4px 0 16px"><input type="checkbox" id="mk-video" checked><span class="track"></span> Also make the page-flip video (about a minute, uses a lot of processor)</label>
    <button class="btn primary lg" id="mk-run" type="button">Make listing images</button>
  </div>
  <div class="alert info hidden" id="mk-status"></div>
  <div class="mk-grid" id="mk-out"></div>
<?php endif; ?>
</main>
<script>window.MARKETING = <?= json_encode(['themeId' => $themeId], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>; window.LISTING_KIT_VENDOR = 'assets/vendor/pdfjs/';</script>
<?php
if ($owned) {
    foreach (['assets/vendor/mp4-muxer.min.js', 'assets/js/themes.js'] as $src) echo '<script src="' . h($src) . '?v=' . h(asset_version()) . '"></script>' . "\n";
    foreach (['demo', 'kit'] as $f) echo '<script src="marketing.php?f=' . $f . '&amp;v=' . h(asset_version()) . '"></script>' . "\n";
    page_foot(['assets/js/handoff.js', 'assets/js/marketing.js']);
} else {
    page_foot();
}
