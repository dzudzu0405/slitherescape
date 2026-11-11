<?php
// Public Privacy Policy. Describes what this app actually stores; keep it in step with the code
// (users, projects, entitlements, login_attempts tables, the session cookies and the IndexedDB hand-off).
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';

if (!is_installed()) redirect('install.php');

legal_page_start('Privacy Policy');
?>
  <p>This policy explains what information SlitherEscape Studio (the "Service") collects when you use it, why, and what you can do about it. The Service is operated by <?= legal_value('name') ?> ("we", "us"). Questions: <?= legal_email_link() ?>.</p>

  <h2>Who the Service is for</h2>
  <p>The Service is a tool for sellers who create printable escape games and sell them on marketplaces such as Etsy and Amazon KDP. It is meant for adults (18 or older). The people who later play the printed games do not use the Service, and we collect nothing about them.</p>

  <h2>What we collect</h2>
  <table class="legal-table">
    <thead><tr><th>Information</th><th>Where it comes from</th><th>Why we keep it</th></tr></thead>
    <tbody>
      <tr><td>Email address</td><td>You, or your Google account if you sign in with Google</td><td>To identify your account and contact you about it</td></tr>
      <tr><td>Password (stored only as a one-way hash)</td><td>You, when you sign in with an email and password</td><td>To let you sign in</td></tr>
      <tr><td>Shop name and print preferences</td><td>You, on the Account page</td><td>To print your shop name on your games and pre-fill your settings</td></tr>
      <tr><td>Your projects: stories, codes, puzzles and settings</td><td>You, while you build games</td><td>To save your work so you can reopen and re-export it</td></tr>
      <tr><td>Plans on your account (FE, PRO, Bulk Creator, Marketing Studio) and when they were added</td><td>The purchase link you opened, or us</td><td>To unlock the features you bought</td></tr>
      <tr><td>IP address of failed sign-in attempts</td><td>Your browser</td><td>To block password guessing; deleted after 24 hours</td></tr>
    </tbody>
  </table>
  <p>When you sign in with Google, we ask Google only for the basic sign-in permissions (your Google account identity and email address). We keep your email address and nothing else from your Google account, and we never see your Google password.</p>

  <h2>What we do not collect</h2>
  <ul>
    <li><b>Payment details.</b> Purchases are handled by WarriorPlus. We never receive your card or bank details; WarriorPlus's own privacy policy applies to the payment.</li>
    <li><b>Your AI conversations.</b> The Service does not call any AI service. It shows you a prompt to copy into an AI tool of your choice, and you paste the reply back. That AI tool's own terms and privacy policy apply to anything you send it.</li>
    <li><b>Your finished files.</b> PDFs, listing images and videos are created in your own browser and downloaded to your device. They are not uploaded to us. To pass a PDF from the editor to Marketing Studio, the browser keeps it for a moment in its own storage (IndexedDB) on your device and then removes it.</li>
  </ul>

  <h2>Cookies</h2>
  <p>We use only the cookies the Service needs to work, and no advertising or analytics cookies:</p>
  <ul>
    <li><b>se_session</b>: keeps you signed in and protects forms against forgery. With "Keep me signed in" it lasts 30 days; otherwise until you close the browser.</li>
    <li><b>se_remember</b>: remembers that you chose "Keep me signed in" (30 days).</li>
  </ul>

  <h2>Who we share it with</h2>
  <p>We do not sell or rent your information, and we do not share it for advertising. It is shared only with:</p>
  <ul>
    <li><b>Our hosting provider</b>, which stores the Service's database and files on our behalf.</li>
    <li><b>Google</b>, only if you choose to sign in with Google.</li>
    <li><b>Authorities</b>, if the law requires it.</li>
  </ul>

  <h2>How long we keep it</h2>
  <p>We keep your account, projects and plans while your account exists. If you ask us to delete your account, we delete it together with your projects within 30 days, except where the law requires us to keep a record of a purchase. Failed sign-in records are deleted after 24 hours.</p>

  <h2>Your choices and rights</h2>
  <p>You can see and change your email, shop name and (if you sign in with a password) your password on the Account page, and delete any project from your Projects page. To get a copy of your information, correct it, or delete your account, email <?= legal_email_link() ?>. Depending on where you live (for example in the EU, the UK or California), you may have further rights, such as to object to or restrict how we use your information, or to complain to your local data protection authority.</p>

  <h2>Security</h2>
  <p>Passwords are stored only as secure hashes, forms are protected against cross-site request forgery, repeated wrong passwords are blocked, and the connection is encrypted with HTTPS. No system is perfectly secure, so please use a strong password and keep your purchase links private.</p>

  <h2>International transfers</h2>
  <p>Our servers and the services above may be located outside your country. By using the Service you understand that your information may be processed there, under the safeguards described in this policy.</p>

  <h2>Changes to this policy</h2>
  <p>If we change this policy, we will update the date at the top of this page. If a change is significant, we will tell you by email or in the Service.</p>

  <h2>Contact</h2>
  <p><?= legal_value('name') ?> · <?= legal_email_link() ?> · <?= legal_value('country') ?></p>
<?php legal_page_end(); ?>
