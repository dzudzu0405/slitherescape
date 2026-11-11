// Marketing Studio page: runs the Listing Kit on a game PDF the seller picks.
'use strict';
(function () {
  const K = window.ListingKit;
  const $ = (id) => document.getElementById(id);
  const status = (text) => { const s = $('mk-status'); s.textContent = text; s.classList.toggle('hidden', !text); };
  // "05-secret-code" -> "Secret code"
  const label = (name) => { const t = name.replace(/^\d+-/, '').replace(/-/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1); };
  const slug = (s) => (s || 'game').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'game';

  function card(file, title, node, url, first) {
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
    if (first) $('mk-out').prepend(fig); else $('mk-out').appendChild(fig);
    return fig;
  }

  async function run() {
    const file = $('mk-pdf').files[0];
    if (!file) { status('Choose the PDF you exported from the editor first.'); return; }
    $('mk-run').disabled = true;
    $('mk-out').textContent = '';
    try {
      status('Reading the PDF…');
      const game = await K.analyzePdf(new Uint8Array(await file.arrayBuffer()));
      const visual = K.resolveVisual({ themeId: $('mk-theme').value, customText: $('mk-custom').value, title: game.title, material: $('mk-material').value });
      const A = await K.createAssets(game, visual, window.DEMO_PUZZLE);
      const base = slug(game.title);
      for (const [i, name] of K.imageNames.entries()) {
        status(`Drawing image ${i + 1} of ${K.imageNames.length}…`);
        const c = K.renderImage(name, A);
        const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.92));
        // Show the JPEG, not the canvas: 15 live 2000x1600 canvases hold enough graphics memory
        // to stall the video encoder that runs next.
        c.width = c.height = 0;
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.src = url;
        img.alt = label(name);
        card(`${base}-${name}.jpg`, label(name), img, url);
        await new Promise((r) => setTimeout(r));
      }
      if ($('mk-video').checked) {
        const blob = await K.encodeVideo(A, (f) => status(`Images are ready below. Making the page-flip video… ${Math.round(f * 100)}% (about a minute; keep this tab open)`));
        const url = URL.createObjectURL(blob);
        const v = document.createElement('video');
        Object.assign(v, { src: url, controls: true, loop: true, muted: true, playsInline: true });
        const fig = card(`${base}-page-flip.mp4`, 'Page-flip video (MP4)', v, url, true);
        fig.classList.add('mk-video');
        fig.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      status(`Done: ${K.imageNames.length} images${$('mk-video').checked ? ' and a video' : ''} for "${game.title}". Download the ones you want below.`);
    } catch (e) {
      status('Could not make the listing: ' + e.message);
    } finally {
      $('mk-run').disabled = false;
    }
  }

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
