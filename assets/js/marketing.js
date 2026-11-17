// Marketing Studio page: runs the Listing Kit on a game PDF the seller picks, for the platforms they tick.
'use strict';
(function () {
  const K = window.ListingKit;
  const $ = (id) => document.getElementById(id);
  const status = (text) => { const s = $('mk-status'); s.textContent = text; s.classList.toggle('hidden', !text); };
  // "05-secret-code" -> "Secret code"
  const label = (name) => { const t = name.replace(/^\d+-/, '').replace(/-/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1); };
  const slug = (s) => (s || 'game').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'game';
  const PLATFORM_LABEL = Object.fromEntries(K.PLATFORMS);

  function card(file, title, node, url, grid) {
    const fig = document.createElement('figure');
    fig.className = 'card mk-item';
    fig.appendChild(node);
    const cap = document.createElement('figcaption');
    const span = document.createElement('span');
    span.textContent = title;
    const a = document.createElement('a');
    a.className = 'btn ghost sm';
    a.href = url;
    a.download = file;
    a.textContent = 'Download';
    cap.append(span, a);
    fig.appendChild(cap);
    grid.appendChild(fig);
    return fig;
  }

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  }

  // Platform kits made in this run: { etsy: [{ name, blob }], pinterest: [...], ... }.
  let kits = {}, zipBase = 'listing', working = false;

  async function zipOf(groups) {
    const zip = new JSZip();
    // Images, videos and PDFs are already compressed: store them as they are; text gets deflated.
    for (const [platform, files] of groups) {
      const folder = groups.length > 1 ? zip.folder(platform) : zip;
      files.forEach((f) => folder.file(f.name, f.blob, { compression: /\.txt$/.test(f.name) ? 'DEFLATE' : 'STORE' }));
    }
    return zip.generateAsync({ type: 'blob' });
  }

  async function busy(btn, text, job) {
    const old = btn.textContent;
    btn.disabled = true;
    btn.textContent = text;
    try { await job(); } finally { btn.disabled = false; btn.textContent = old; }
  }

  function showZip() {
    const done = Object.entries(kits);
    const files = done.reduce((n, [, f]) => n + f.length, 0);
    $('mk-zip-row').classList.toggle('hidden', !done.length);
    $('mk-zip-label').textContent = `Download all (ZIP${files ? `, ${files} files` : ''})`;
    $('mk-zip-note').textContent = working ? 'More platforms are still being made; they join the ZIP when they are ready.'
      : done.map(([p]) => PLATFORM_LABEL[p]).join(' · ');
  }

  $('mk-zip').addEventListener('click', () => {
    const groups = Object.entries(kits);
    if (!groups.length) return;
    const btn = $('mk-zip');
    const lbl = $('mk-zip-label').textContent;
    btn.disabled = true;
    $('mk-zip-label').textContent = 'Packing the ZIP…';
    zipOf(groups).then((blob) => download(blob, `${zipBase}-listing-kit.zip`)).finally(() => {
      btn.disabled = false;
      $('mk-zip-label').textContent = lbl;
    });
  });

  // One card per platform: a few thumbnails, its files, a ZIP button and a copy-text button.
  function kitCard(platform, files) {
    const box = document.createElement('div');
    box.className = 'card card-pad mk-kit';
    const head = document.createElement('div');
    head.className = 'mk-kit-head';
    const h = document.createElement('h3');
    h.textContent = PLATFORM_LABEL[platform];
    const meta = document.createElement('span');
    meta.className = 'small muted';
    const imgs = files.filter((f) => /\.jpg$/.test(f.name)).length;
    const extra = files.filter((f) => !/\.(jpg|txt)$/.test(f.name)).map((f) => (/\.pptx$/.test(f.name) ? 'Canva file' : f.name));
    meta.textContent = [`${imgs} images`, ...extra, 'listing text'].join(' · ');
    head.append(h, meta);
    const strip = document.createElement('div');
    strip.className = 'mk-kit-strip';
    files.filter((f) => /\.jpg$/.test(f.name)).slice(0, 5).forEach((f) => {
      const img = new Image();
      img.src = URL.createObjectURL(f.blob);
      img.alt = f.name;
      img.title = f.name;
      strip.appendChild(img);
    });
    const actions = document.createElement('div');
    actions.className = 'mk-kit-actions';
    const zipBtn = document.createElement('button');
    zipBtn.className = 'btn primary';
    zipBtn.type = 'button';
    zipBtn.textContent = `Download ${PLATFORM_LABEL[platform]} kit (ZIP)`;
    zipBtn.addEventListener('click', () => busy(zipBtn, 'Packing…', async () => download(await zipOf([[platform, files]]), `${zipBase}-${platform}-kit.zip`)));
    const txt = files.find((f) => /\.txt$/.test(f.name));
    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn';
    copyBtn.type = 'button';
    copyBtn.textContent = 'Copy listing text';
    copyBtn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(await txt.blob.text()); copyBtn.textContent = 'Copied'; } catch (e) { copyBtn.textContent = 'Could not copy'; }
      setTimeout(() => { copyBtn.textContent = 'Copy listing text'; }, 1600);
    });
    const view = document.createElement('a');
    view.className = 'btn ghost';
    view.href = `#mk-sec-${platform}`;
    view.textContent = 'See the full kit';
    actions.append(zipBtn);
    // The Canva file sits next to the ZIP: upload it to Canva and every word, card and button is editable.
    const pptx = files.find((f) => /\.pptx$/.test(f.name));
    if (pptx) {
      const canva = document.createElement('a');
      canva.className = 'btn mk-canva-btn';
      canva.href = URL.createObjectURL(pptx.blob);
      canva.download = `${zipBase}-${pptx.name}`;
      canva.title = 'Upload this PowerPoint file to Canva: every word, card and button is editable';
      canva.textContent = 'Download for Canva (PPTX)';
      actions.append(canva);
    }
    actions.append(copyBtn, view);
    box.append(head, strip, actions);
    $('mk-kits').appendChild(box);
  }

  // "pin-1.jpg" -> "Pin 1", "etsy-listing.txt" -> "Listing text"
  const fileTitle = (name) => {
    const n = name.replace(/^.*?-(\d\d-)/, '$1').replace(/\.[a-z0-9]+$/, '');
    if (/listing$/.test(n)) return 'Listing text';
    if (/^\d\d-/.test(n)) return label(n);
    return n.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
  };

  // Everything in one platform's kit, as it will be downloaded.
  function kitSection(platform, files) {
    const sec = document.createElement('section');
    sec.className = 'mk-section';
    sec.id = `mk-sec-${platform}`;
    const h = document.createElement('h2');
    h.textContent = `${PLATFORM_LABEL[platform]} listing kit`;
    const grid = document.createElement('div');
    grid.className = 'mk-grid';
    sec.append(h, grid);
    for (const f of files) {
      const url = URL.createObjectURL(f.blob);
      if (/\.jpg$/.test(f.name)) {
        const img = new Image();
        img.src = url;
        img.alt = fileTitle(f.name);
        card(f.name, fileTitle(f.name), img, url, grid);
      } else if (/\.mp4$/.test(f.name)) {
        const v = document.createElement('video');
        Object.assign(v, { src: url, controls: true, loop: true, muted: true, playsInline: true });
        card(f.name, `${fileTitle(f.name)} (MP4)`, v, url, grid).classList.add(/reel/.test(f.name) ? 'mk-reel' : 'mk-video');
      } else if (/\.pdf$/.test(f.name)) {
        const box = document.createElement('a');
        box.className = 'mk-pdf';
        box.href = url;
        box.target = '_blank';
        box.rel = 'noopener';
        box.innerHTML = '<span class="mk-pdf-icon">PDF</span><span>Open to view</span>';
        card(f.name, `${fileTitle(f.name)} (PDF)`, box, url, grid);
      } else if (/\.pptx$/.test(f.name)) {
        // Downloaded from the kit card above, next to the ZIP.
      } else if (/\.txt$/.test(f.name)) {
        const det = document.createElement('details');
        det.className = 'card mk-text';
        det.open = true;
        const sum = document.createElement('summary');
        sum.textContent = 'Listing text (ready to paste)';
        const pre = document.createElement('pre');
        f.blob.text().then((t) => { pre.textContent = t; });
        det.append(sum, pre);
        sec.appendChild(det);
      }
    }
    $('mk-out').appendChild(sec);
  }

  async function run() {
    const file = $('mk-pdf').files[0];
    if (!file) { status('Choose the PDF you exported from the editor first.'); return; }
    const chosen = K.PLATFORMS.map(([p]) => p).filter((p) => $(`mk-p-${p}`).checked);
    if (!chosen.length) { status('Tick at least one platform.'); return; }
    const withVideo = $('mk-video').checked;
    $('mk-run').disabled = true;
    $('mk-out').textContent = '';
    $('mk-kits').textContent = '';
    kits = {};
    working = true;
    showZip();
    try {
      status('Reading the PDF…');
      const game = await K.analyzePdf(new Uint8Array(await file.arrayBuffer()));
      const visual = K.resolveVisual({ themeId: $('mk-theme').value, customText: $('mk-custom').value, title: game.title, material: $('mk-material').value });
      const A = await K.createAssets(game, visual, window.DEMO_PUZZLE, brand.on ? brand : null);
      const base = slug(game.title);
      zipBase = base;
      // Etsy's 15 scenes at full size, only when Etsy is ticked. Kept as JPEG, not canvas: 15 live
      // 2000x1600 canvases hold enough graphics memory to stall the video encoder.
      const etsyImages = [];
      let etsyVideo = null;
      if (chosen.includes('etsy')) {
        for (const [i, name] of K.imageNames.entries()) {
          status(`Etsy: image ${i + 1} of ${K.imageNames.length}… (keep this tab open)`);
          const c = K.renderImage(name, A);
          etsyImages.push({ name: `${base}-${name}.jpg`, blob: await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.92)) });
          c.width = c.height = 0;
          await new Promise((r) => setTimeout(r));
        }
        if (withVideo) etsyVideo = await K.encodeVideo(A, (f) => status(`Etsy: page-flip video ${Math.round(f * 100)}%… (about a minute; keep this tab open)`));
      }
      for (const p of chosen) {
        const files = await K.buildPlatform(p, A, game, {
          etsyImages, etsyVideo, withVideo,
          onStep: (what) => status(`${PLATFORM_LABEL[p]}: ${what}… (keep this tab open)`),
        });
        kits[p] = files;
        kitCard(p, files);
        kitSection(p, files);
        showZip();
      }
      status(`Done: listing kits for ${chosen.map((p) => PLATFORM_LABEL[p]).join(', ')}. Download one platform or all of them below.`);
      $('mk-zip-row').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      status('Could not make the listing: ' + e.message);
    } finally {
      working = false;
      showZip();
      $('mk-run').disabled = false;
    }
  }

  // Brand: logo (or shop name) in a corner of every picture, brand colours on the accents.
  // Saved to the account a moment after each change.
  const brand = Object.assign({ on: false, shop: '', color: '#7a2e1e', color2: '#e3bf7a', logo: '' }, (window.MARKETING && window.MARKETING.brand) || {});
  let brandTimer = null;
  function showBrand() {
    $('mk-brand-on').checked = !!brand.on;
    $('mk-brand-body').classList.toggle('hidden', !brand.on);
    $('mk-shop').value = brand.shop || '';
    $('mk-color').value = brand.color;
    $('mk-color2').value = brand.color2;
    const prev = $('mk-logo-preview');
    prev.textContent = '';
    if (brand.logo) { const img = new Image(); img.src = brand.logo; img.alt = 'Your logo'; prev.appendChild(img); }
    else { const t = document.createElement('span'); t.className = 'small muted'; t.textContent = 'No logo'; prev.appendChild(t); }
    $('mk-logo-remove').classList.toggle('hidden', !brand.logo);
  }
  function saveBrand() {
    clearTimeout(brandTimer);
    $('mk-brand-saved').textContent = 'Saving…';
    brandTimer = setTimeout(async () => {
      try {
        await window.UI.api('brand', { brand });
        $('mk-brand-saved').textContent = 'Saved to your account, so it is ready next time.';
      } catch (e) {
        $('mk-brand-saved').textContent = 'Could not save: ' + e.message;
      }
    }, 600);
  }
  // Logos are scaled down to 600 px on the long side: plenty for a corner badge, small to store.
  function readLogo(file) {
    return new Promise((resolve, reject) => {
      if (!/^image\/(png|jpeg)$/.test(file.type)) { reject(new Error('Please choose a PNG or JPG file.')); return; }
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const k = Math.min(1, 600 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        let data = c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9);
        if (data.length > 680000) data = c.toDataURL('image/jpeg', 0.85);
        if (data.length > 680000) { reject(new Error('That logo is too large. Try a smaller PNG.')); return; }
        resolve(data);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file could not be read as an image.')); };
      img.src = url;
    });
  }
  $('mk-brand-on').addEventListener('change', () => { brand.on = $('mk-brand-on').checked; showBrand(); saveBrand(); });
  $('mk-shop').addEventListener('input', () => { brand.shop = $('mk-shop').value; saveBrand(); });
  $('mk-color').addEventListener('input', () => { brand.color = $('mk-color').value; saveBrand(); });
  $('mk-color2').addEventListener('input', () => { brand.color2 = $('mk-color2').value; saveBrand(); });
  $('mk-logo').addEventListener('change', async () => {
    const file = $('mk-logo').files[0];
    $('mk-logo').value = '';
    if (!file) return;
    try { brand.logo = await readLogo(file); showBrand(); saveBrand(); } catch (e) { $('mk-brand-saved').textContent = e.message; }
  });
  $('mk-logo-remove').addEventListener('click', () => { brand.logo = ''; showBrand(); saveBrand(); });
  showBrand();

  // Platform picker.
  $('mk-platforms').innerHTML = K.PLATFORMS.map(([p, name]) => `<label class="mk-platform"><input type="checkbox" id="mk-p-${p}" checked> ${name}</label>`).join('');
  try {
    const saved = JSON.parse(localStorage.getItem('mk-platforms') || 'null');
    if (Array.isArray(saved)) K.PLATFORMS.forEach(([p]) => { $(`mk-p-${p}`).checked = saved.includes(p); });
  } catch (e) { /* no saved choice */ }
  $('mk-platforms').addEventListener('change', () => {
    try { localStorage.setItem('mk-platforms', JSON.stringify(K.PLATFORMS.map(([p]) => p).filter((p) => $(`mk-p-${p}`).checked))); } catch (e) { /* private mode */ }
  });

  for (const t of window.Themes.THEMES) $('mk-theme').add(new Option(t.label, t.id));
  $('mk-theme').add(new Option('Other (use my own words)', 'other'));
  $('mk-theme').value = (window.MARKETING && window.MARKETING.themeId) || 'other';
  if (!$('mk-theme').value) $('mk-theme').value = 'other';
  for (const m of K.materials) $('mk-material').add(new Option(m.charAt(0).toUpperCase() + m.slice(1), m));
  $('mk-run').addEventListener('click', run);

  // Coming from the editor's "Make listing kits" button: the PDF is already built,
  // so put it in the file field and start right away.
  if (new URLSearchParams(location.search).get('from') === 'editor' && window.Handoff) {
    window.Handoff.take().then((item) => {
      if (!item || !item.pdf) {
        status('Choose the PDF of your game to start. (The game from the editor was not found; it is kept for 10 minutes.)');
        return;
      }
      const dt = new DataTransfer();
      dt.items.add(new File([item.pdf], item.name || 'game.pdf', { type: 'application/pdf' }));
      $('mk-pdf').files = dt.files;
      if (item.themeId && [...$('mk-theme').options].some((o) => o.value === item.themeId)) $('mk-theme').value = item.themeId;
      run();
    });
  }
})();
