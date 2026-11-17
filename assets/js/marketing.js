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
    const extra = files.filter((f) => !/\.(jpg|txt)$/.test(f.name)).map((f) => f.name);
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
    actions.append(zipBtn, copyBtn, view);
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
      const A = await K.createAssets(game, visual, window.DEMO_PUZZLE);
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

  // Coming from the editor's "Make listing images & video" button: the PDF is already built,
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
