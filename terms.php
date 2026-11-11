<?php
// Public Terms of Service. Plan names come from ACCESS_PLANS so they match the purchase links.
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';

if (!is_installed()) redirect('install.php');

legal_page_start('Terms of Service');
?>
  <p>These terms are an agreement between you and <?= legal_value('name') ?> ("we", "us") for the use of SlitherEscape Studio (the "Service"). By creating an account or using the Service you accept these terms. If you do not accept them, do not use the Service. Our <a href="privacy.php">Privacy Policy</a> explains how we handle your information.</p>

  <h2>1. The Service and your plans</h2>
  <p>The Service lets you create printable escape games built from Slitherlink puzzles and export them as PDF files. Features depend on the plans on your account:</p>
  <ul>
    <?php foreach (ACCESS_PLANS as $label): ?><li><?= h($label) ?></li><?php endforeach; ?>
  </ul>
  <p>Each plan is a one-time purchase that gives you access to its features for as long as the Service is offered. Features of plans you have not bought may be shown but stay locked.</p>

  <h2>2. Your account</h2>
  <ul>
    <li>You must be at least 18 years old and give a valid email address.</li>
    <li>Your account and your purchase links are for you (one person or one business) only. Do not share, resell or publish them, and do not let others use your account.</li>
    <li>You are responsible for keeping your password safe and for what happens under your account. Tell us at <?= legal_email_link() ?> if you think someone else has used it.</li>
  </ul>

  <h2>3. Commercial license for what you create</h2>
  <p>As long as you follow these terms, you may sell, give away and print the games you export from the Service (PDF files, and the listing images and videos made with Marketing Studio), including on Etsy, Amazon KDP, Teachers Pay Teachers, your own shop and similar marketplaces. You do not owe us any royalty. You may put your own shop name on them.</p>
  <p>This license covers finished games. It does not allow you to:</p>
  <ul>
    <li>resell, share or give away the Service itself, its code, or access to it;</li>
    <li>extract and sell or share on their own the puzzle generator, the Mosaic picture library, the fonts, page designs or templates, for example as a separate puzzle pack, clip-art set or template kit;</li>
    <li>offer a service that makes games for others using your account (for example "games made to order" for other sellers);</li>
    <li>claim that you created the Service.</li>
  </ul>

  <h2>4. Your content and your responsibility</h2>
  <p>You own the stories, codes and other text you add, including text written by an AI tool you choose to use. You are responsible for that content and for what you sell. In particular you agree:</p>
  <ul>
    <li>not to use characters, brands, names or other material protected by someone else's copyright or trademark unless you have the right to;</li>
    <li>to check AI-written text before you publish it, because AI tools can produce errors or text similar to existing works;</li>
    <li>to follow the rules of each marketplace you sell on, and the laws on consumer protection and product listings that apply to you;</li>
    <li>not to use the Service for anything illegal, hateful, sexually explicit or harmful, especially in games for children.</li>
  </ul>
  <p>You allow us to store and process your content only as needed to run the Service for you.</p>

  <h2>5. Acceptable use</h2>
  <p>Do not try to break into, overload or reverse-engineer the Service, get around plan locks, use bots to create content in bulk outside the features we provide, or access other users' data. We may suspend an account that does this.</p>

  <h2>6. Payments and refunds</h2>
  <p>Plans are sold through WarriorPlus. Prices are shown on the sales page at the time you buy. Refunds are handled through WarriorPlus according to the refund terms shown on the sales page. If a refund is given, the plan it covered is removed from your account.</p>

  <h2>7. Changes and availability</h2>
  <p>We work to keep the Service available and to improve it, and we may change or add features over time. We will not remove the core features of a plan you bought without good reason. The Service may sometimes be unavailable for maintenance or because of problems outside our control. Keep your own copies of the files you export.</p>

  <h2>8. Ending your use</h2>
  <p>You can stop using the Service at any time and ask us to delete your account. We may suspend or close an account that seriously or repeatedly breaks these terms, for example by sharing purchase links or reselling the Service. Games you exported and sold before that remain yours to sell, unless they themselves break these terms.</p>

  <h2>9. Disclaimer</h2>
  <p>The Service is provided "as is" and "as available". We test the puzzles carefully, but we do not promise that the Service or the content it produces will be error-free, or that your games will sell. You are responsible for checking your games before you sell them.</p>

  <h2>10. Limitation of liability</h2>
  <p>To the extent the law allows, we are not liable for indirect or consequential losses such as lost profits, lost sales or lost data, and our total liability to you for any claim is limited to the amount you paid for the Service in the 12 months before the claim. Nothing in these terms limits liability that cannot be limited by law.</p>

  <h2>11. Changes to these terms</h2>
  <p>We may update these terms. We will change the date at the top of this page, and tell you by email or in the Service if a change is significant. If you keep using the Service after a change, the new terms apply.</p>

  <h2>12. Governing law</h2>
  <p>These terms are governed by the laws of <?= legal_value('country') ?>, without affecting any mandatory consumer rights you have where you live.</p>

  <h2>13. Contact</h2>
  <p><?= legal_value('name') ?> · <?= legal_email_link() ?></p>
<?php legal_page_end(); ?>
