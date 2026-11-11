// Listing Kit (Marketing Studio, OTO3): an exported game PDF + a theme in, listing images and an MP4 out. Runs entirely in the browser.
// Public API: ListingKit.analyzePdf(), resolveVisual(), createAssets(), renderImages(), encodeVideo().
'use strict';
(function (root) {
  const W = 2000, H = 1600;
  const HEAD = '"Playfair Display", Georgia, serif';
  const SC = '"IM Fell SC", Georgia, serif';
  const ITALIC = '"IM Fell Italic", Georgia, serif';
  const BASE_COLORS = { accentInk: '#f7ecd6', ink: '#fbf5e8', paper: '#efe0c0', paperEdge: '#7a5230', pencil: '#3b2412', loop: '#7a2e1e', shade: '#d9bf8c' };

  // Set per render; the kit renders one game at a time.
  let GAME, THEME, USED_PAGES;

  // Theme -> visuals ----------------------------------------------------------------------------

  const VISUALS = {
    christmas: { material: 'wood', tint: '#173a2e', accent: '#a63526', gold: '#e7c27d' },
    halloween: { material: 'chalkboard', tint: '#1f1a2b', accent: '#c9591a', gold: '#f2b04f' },
    easter: { material: 'linen', tint: '#2f4a3a', accent: '#b0577d', gold: '#f0d48a' },
    valentine: { material: 'linen', tint: '#3a1620', accent: '#b8324e', gold: '#f2c0a8' },
    thanksgiving: { material: 'wood', tint: '#3a2414', accent: '#a84e1b', gold: '#e8b860' },
    newyear: { material: 'night', tint: '#10162e', accent: '#96741f', gold: '#f0d27a' },
    pirates: { material: 'wood', tint: '#2a2016', accent: '#8f2f22', gold: '#dcb56b' },
    egypt: { material: 'stone', tint: '#3a2c18', accent: '#2b6f7a', gold: '#e8c46e' },
    space: { material: 'night', tint: '#0b1030', accent: '#5a3fb5', gold: '#9fd3ff' },
    jungle: { material: 'stone', tint: '#15352a', accent: '#a85c19', gold: '#d9d27a' },
    ocean: { material: 'linen', tint: '#0e3044', accent: '#17787f', gold: '#f0d8a0' },
    dinosaurs: { material: 'stone', tint: '#2e3018', accent: '#a0531f', gold: '#dcc878' },
    school: { material: 'chalkboard', tint: '#18302a', accent: '#b5412f', gold: '#f0d060' },
    lab: { material: 'chalkboard', tint: '#12303a', accent: '#17786a', gold: '#a8e6d0' },
    museum: { material: 'stone', tint: '#2a2a2e', accent: '#8a2f3a', gold: '#d9bf88' },
    detective: { material: 'chalkboard', tint: '#1e1e22', accent: '#a33b2b', gold: '#e0c080' },
    castle: { material: 'stone', tint: '#25252c', accent: '#6a2f7a', gold: '#d9bf88' },
    wizard: { material: 'night', tint: '#1b1338', accent: '#6f3fa8', gold: '#e9c86e' },
  };
  const NEUTRAL = { material: 'wood', tint: '#2a2016', accent: '#7a2e1e', gold: '#e3bf7a', motif: 'key' };

  // Whole words only, so "office" never matches "ice" and "start" never matches "star".
  const KEYWORDS = [
    [/\b(christmas|xmas|santa|elf|elves|north pole|reindeer|sleigh|snow\w*|winter|frost\w*)\b/, 'christmas'],
    [/\b(hallowe+n|ghosts?|haunt\w*|vampires?|witch\w*|zombies?|spook\w*|monsters?|curse\w*|graveyard)\b/, 'halloween'],
    [/\b(easter|bunny|bunnies)\b/, 'easter'],
    [/\b(valentines?|love|hearts?|wedding)\b/, 'valentine'],
    [/\b(thanksgiving|harvest|turkey|autumn)\b/, 'thanksgiving'],
    [/\b(new year|countdown|fireworks?)\b/, 'newyear'],
    [/\b(pirates?|treasures?|ships?|island|voyage)\b/, 'pirates'],
    [/\b(egypt\w*|pharaohs?|pyramids?|mummy|mummies|tomb)\b/, 'egypt'],
    [/\b(space|galax\w*|planets?|astronauts?|aliens?|rockets?|lunar|mars)\b/, 'space'],
    [/\b(jungle|rainforest|expedition|temple|safari)\b/, 'jungle'],
    [/\b(ocean|sea|underwater|mermaids?|submarine)\b/, 'ocean'],
    [/\b(dinosaurs?|jurassic|fossils?|prehistoric)\b/, 'dinosaurs'],
    [/\b(school|classroom|teacher|homework)\b/, 'school'],
    [/\b(science|lab|laboratory|chemistry|experiment)\b/, 'lab'],
    [/\b(museum|gallery|heist|artifacts?)\b/, 'museum'],
    [/\b(detectives?|mystery|murder|crime|sherlock)\b/, 'detective'],
    [/\b(castle|knights?|medieval|dragons?|kingdom)\b/, 'castle'],
    [/\b(wizards?|magic|spells?|sorcer\w*|academy)\b/, 'wizard'],
  ];

  // A theme the seller picked always wins; free text falls back to keywords, then a neutral look.
  function resolveVisual({ themeId, customText, title, material }) {
    const known = root.Themes && root.Themes.theme(themeId);
    let id = null, source = 'neutral';
    if (known && VISUALS[themeId]) {
      id = themeId;
      source = 'theme';
    } else {
      // What the seller typed outranks words that happen to be in the game's title.
      const match = (text) => KEYWORDS.find(([re]) => re.test((text || '').toLowerCase()));
      const hit = match(customText) || match(title);
      if (hit) { id = hit[1]; source = 'keyword'; }
    }
    const base = id ? VISUALS[id] : NEUTRAL;
    const theme = id && root.Themes.theme(id);
    return { id, source, ...base, material: material || base.material, motif: theme ? theme.motif : NEUTRAL.motif };
  }

  // Reading the PDF -----------------------------------------------------------------------------

  // Only these kinds may appear in a listing. Host pages and unknown pages never do, so nothing can spoil the code.
  const SAFE_KINDS = new Set(['cover', 'prologue', 'howTo', 'codeSheet', 'chapter', 'puzzle', 'finalLock', 'certificate']);

  function classify(text, index) {
    if (/for the game host only/i.test(text)) return 'host';
    if (index === 0) return 'cover';
    if (/certificate of completion/i.test(text)) return 'certificate';
    if (/puzzle\s+\d+\s+of\s+\d+/i.test(text)) return 'puzzle';
    if (/how to play/i.test(text)) return 'howTo';
    if (/code sheet/i.test(text)) return 'codeSheet';
    if (/the final lock/i.test(text)) return 'finalLock';
    if (/prologue/i.test(text)) return 'prologue';
    if (/\bchapter\b/i.test(text)) return 'chapter';
    return 'unknown';
  }

  function coverFacts(items, text) {
    const size = (it) => Math.hypot(it.transform[2], it.transform[3]);
    const words = items.filter((it) => it.str.trim());
    const biggest = Math.max(...words.map(size));
    const isTitle = (it) => size(it) >= biggest * 0.9;
    const title = words.filter(isTitle).map((it) => it.str.trim()).join(' ');
    const lastTitle = words.map(isTitle).lastIndexOf(true);
    const rest = words.slice(lastTitle + 1).map((it) => it.str.trim()).join(' ').replace(/\s+/g, ' ');
    const m = text.match(/([A-Za-z]+(?:\s+\d+\s*[-–]\s*\d+)?)\s*·\s*(\d+)\s*Puzzles\s*·\s*(\d+\s*[-–]\s*\d+)\s*Minutes/i);
    const tagline = m && rest.includes(m[1]) ? rest.slice(0, rest.indexOf(m[1])).trim() : '';
    const range = text.match(/for\s+(\d+\s+to\s+\d+)\s+players/i);
    const groups = /for\s+groups/i.test(text);
    return {
      title,
      tagline,
      audience: m ? m[1].replace('-', '–') : '',
      puzzlesOnCover: m ? Number(m[2]) : null,
      minutes: m ? m[3].replace(/\s/g, '').replace('-', '–') : '',
      players: range ? `${range[1].replace(/\s+to\s+/, '–')} PLAYERS OR TEAMS` : groups ? 'GROUPS OR TEAMS' : '',
      playersValue: range ? range[1].replace(/\s+to\s+/, '–') : groups ? 'GROUPS' : '',
      playersLabel: range ? 'PLAYERS OR TEAMS' : groups ? 'OR COMPETING TEAMS' : '',
      soloAllowed: !!range && /^1\b/.test(range[1]),
    };
  }

  async function analyzePdf(data) {
    const pdfjs = await import(new URL((root.LISTING_KIT_VENDOR || 'vendor/') + 'pdf.min.mjs', document.baseURI).href);
    pdfjs.GlobalWorkerOptions.workerSrc = new URL((root.LISTING_KIT_VENDOR || 'vendor/') + 'pdf.worker.min.mjs', document.baseURI).href;
    const doc = await pdfjs.getDocument({ data }).promise;
    const pages = [];
    let facts = null, secretCode = null;
    for (let i = 0; i < doc.numPages; i++) {
      const page = await doc.getPage(i + 1);
      const content = await page.getTextContent();
      const text = content.items.map((it) => it.str).join(' ').replace(/\s+/g, ' ');
      const kind = classify(text, i);
      pages.push({ number: i + 1, kind, text, page, items: content.items });
      if (i === 0) facts = coverFacts(content.items, text);
      const code = text.match(/The code is ([A-Z][A-Z ]+[A-Z])\b/);
      if (code) secretCode = code[1];
    }
    const puzzles = pages.filter((p) => p.kind === 'puzzle');
    const view = pages[0].page.getViewport({ scale: 1 });
    const paper = Math.abs(view.width - 612) < 3 ? 'US LETTER' : Math.abs(view.width - 595) < 3 ? 'A4' : 'READY TO PRINT';
    const counts = {};
    pages.forEach((p) => { counts[p.kind] = (counts[p.kind] || 0) + 1; });
    const prologue = pages.find((p) => p.kind === 'prologue');
    const mission = prologue && prologue.text.match(/your mission\s+(.+?)(?:\s*©|$)/i);
    return {
      ...facts,
      mission: mission ? mission[1].trim() : '',
      puzzles: puzzles.length,
      chapters: counts.chapter || 1,
      pageCount: pages.length,
      paper, pages, counts, secretCode,
    };
  }

  async function renderPdfPage(entry) {
    const vp = entry.page.getViewport({ scale: 150 / 72 });
    const c = document.createElement('canvas');
    c.width = Math.floor(vp.width);
    c.height = Math.floor(vp.height);
    // The print intent skips requestAnimationFrame, so rendering keeps going while the tab is in the background.
    await entry.page.render({ canvasContext: c.getContext('2d', { alpha: false }), viewport: vp, intent: 'print' }).promise;
    return { canvas: c, vp };
  }

  async function pageImage(entry) {
    if (!SAFE_KINDS.has(entry.kind)) throw new Error(`Page ${entry.number} (${entry.kind}) must not be used in a listing`);
    USED_PAGES.push(`${entry.number}:${entry.kind}`);
    return (await renderPdfPage(entry)).canvas;
  }

  // The host guide is a host page, so only its top part is shown: everything above the first line that
  // discusses the code. Returns null when that cannot be proven spoiler-free, and the layout goes without.
  async function hostGuideTop(game) {
    const entry = game.pages.find((p) => p.kind === 'host' && /host guide/i.test(p.text));
    if (!entry) return null;
    const { canvas, vp } = await renderPdfPage(entry);
    const lines = entry.items.filter((it) => it.str.trim()).map((it) => ({
      y: vp.convertToViewportPoint(it.transform[4], it.transform[5])[1],
      str: it.str,
    }));
    const danger = lines.filter((l) => /checking the code|the code is|read aloud/i.test(l.str)).map((l) => l.y);
    const limit = Math.min(vp.height * 0.6, danger.length ? Math.min(...danger) - 45 : Infinity);
    if (limit < vp.height * 0.2) return null;
    const squash = (s) => s.replace(/\s+/g, '').toUpperCase();
    const kept = squash(lines.filter((l) => l.y < limit + 12).map((l) => l.str).join(' '));
    if (game.secretCode && kept.includes(squash(game.secretCode))) return null;
    const h = Math.floor(limit);
    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = h;
    const x = out.getContext('2d');
    x.drawImage(canvas, 0, 0, canvas.width, h, 0, 0, canvas.width, h);
    const fade = x.createLinearGradient(0, h * 0.72, 0, h);
    fade.addColorStop(0, 'rgba(0,0,0,1)');
    fade.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalCompositeOperation = 'destination-in';
    x.fillStyle = fade;
    x.fillRect(0, 0, out.width, h);
    USED_PAGES.push(`${entry.number}:hostGuideTop`);
    return out;
  }

  // Helpers -------------------------------------------------------------------------------------

  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const span = (t, a, b) => clamp01((t - a) / (b - a));
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

  function setFont(ctx, weight, px, family, spacing) {
    ctx.font = `${weight} ${px}px ${family}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing || 0}px`;
  }

  function fittedSize(ctx, text, maxW, px, weight, family, spacing) {
    let size = px;
    setFont(ctx, weight, size, family, spacing);
    while (ctx.measureText(text).width > maxW && size > 20) {
      size -= 2;
      setFont(ctx, weight, size, family, spacing);
    }
    return size;
  }

  // Draws centred text, shrinking it until it fits maxW.
  function fitText(ctx, text, x, y, maxW, px, weight, family, fill, spacing) {
    const size = fittedSize(ctx, text, maxW, px, weight, family, spacing);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    return size;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  function wrapLines(ctx, text, maxW) {
    const lines = [];
    let line = '';
    for (const word of text.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  // Centred paragraph that shrinks until it fits maxLines. Returns the y just below the last line.
  function drawWrapped(ctx, text, x, y, maxW, px, weight, family, fill, maxLines) {
    let size = px, lines;
    do {
      ctx.font = `${weight} ${size}px ${family}`;
      lines = wrapLines(ctx, text, maxW);
      if (lines.length <= maxLines) break;
      size -= 2;
    } while (size > 22);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = fill;
    const lineH = size * 1.28;
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineH));
    return y + lines.length * lineH;
  }

  function paperCard(ctx, x, y, w, h) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)';
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = THEME.paper;
    roundRect(ctx, x, y, w, h, 16);
    ctx.fill();
    ctx.restore();
  }

  function heading(ctx, A, main, sub) {
    ctx.drawImage(A.bg, 0, 0, W, H);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.7)';
    ctx.shadowBlur = 16;
    fitText(ctx, main, W / 2, 140, W - 140, 104, 900, HEAD, THEME.ink, 1);
    ctx.restore();
    if (sub) fitText(ctx, sub, W / 2, 218, W - 200, 54, 400, SC, THEME.gold);
  }

  // Materials: a grey light map tinted with the theme colour, so one material serves every theme and ships no stock image.

  function noise(ctx, r, nx, ny, alpha, rotDeg) {
    const c = document.createElement('canvas');
    c.width = nx; c.height = ny;
    const x = c.getContext('2d');
    const img = x.createImageData(nx, ny);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 255 * r();
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.translate(W / 2, H / 2);
    ctx.rotate((rotDeg || 0) * Math.PI / 180);
    ctx.drawImage(c, -W, -W, W * 2, W * 2);
    ctx.restore();
  }

  const MATERIALS = {
    wood(ctx, r) {
      const stops = [0];
      while (stops[stops.length - 1] < H) stops.push(stops[stops.length - 1] + 300 + r() * 110);
      stops.forEach((top, i) => {
        const h = stops[i + 1] === undefined ? H - top : stops[i + 1] - top;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, top, W, h);
        ctx.clip();
        const g = 95 + r() * 45;
        ctx.fillStyle = `rgb(${g},${g},${g})`;
        ctx.fillRect(0, top, W, h);
        noise(ctx, r, 12, 90, 0.5);
        noise(ctx, r, 24, 340, 0.4);
        noise(ctx, r, 60, 900, 0.22);
        ctx.restore();
        ctx.fillStyle = 'rgba(0,0,0,.75)';
        ctx.fillRect(0, top - 3, W, 6);
        ctx.fillStyle = 'rgba(255,255,255,.1)';
        ctx.fillRect(0, top + 3, W, 3);
      });
    },
    stone(ctx, r) {
      ctx.fillStyle = '#6e6e6e';
      ctx.fillRect(0, 0, W, H);
      noise(ctx, r, 10, 10, 0.55);
      noise(ctx, r, 40, 40, 0.42);
      noise(ctx, r, 160, 160, 0.3);
      noise(ctx, r, 700, 700, 0.2);
      ctx.strokeStyle = 'rgba(0,0,0,.42)';
      ctx.lineCap = 'round';
      for (let i = 0; i < 16; i++) {
        let x = r() * W, y = r() * H, a = r() * Math.PI * 2;
        ctx.lineWidth = 1.5 + r() * 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let s = 0; s < 14; s++) {
          a += (r() - 0.5) * 1.1;
          x += Math.cos(a) * 42;
          y += Math.sin(a) * 42;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    },
    chalkboard(ctx, r) {
      ctx.fillStyle = '#5a5a5a';
      ctx.fillRect(0, 0, W, H);
      noise(ctx, r, 8, 8, 0.3);
      for (let i = 0; i < 9; i++) noise(ctx, r, 9, 130, 0.1 + r() * 0.1, -35 + r() * 70);
      noise(ctx, r, 800, 800, 0.1);
    },
    linen(ctx, r) {
      ctx.fillStyle = '#707070';
      ctx.fillRect(0, 0, W, H);
      noise(ctx, r, 14, 14, 0.25);
      noise(ctx, r, 6, 1000, 0.34);
      noise(ctx, r, 1000, 6, 0.34);
    },
    night(ctx, r) {
      ctx.fillStyle = '#4a4a4a';
      ctx.fillRect(0, 0, W, H);
      noise(ctx, r, 6, 6, 0.55);
      noise(ctx, r, 18, 18, 0.3);
    },
  };

  function makeBackground(material, tint) {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true });
    const r = rng(7);
    MATERIALS[material](x, r);
    const img = x.getImageData(0, 0, W, H);
    const d = img.data;
    const [tr, tg, tb] = hex(tint);
    for (let i = 0; i < d.length; i += 4) {
      const light = (d[i] / 255) * 2.1 + 0.2;
      const grain = (r() - 0.5) * 9;
      d[i] = tr * light + grain;
      d[i + 1] = tg * light + grain;
      d[i + 2] = tb * light + grain;
    }
    x.putImageData(img, 0, 0);
    if (material === 'night') {
      for (let i = 0; i < 520; i++) {
        x.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.7})`;
        x.beginPath();
        x.arc(r() * W, r() * H, 0.8 + r() * r() * 3.4, 0, Math.PI * 2);
        x.fill();
      }
    }
    const v = x.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,.55)');
    x.fillStyle = v;
    x.fillRect(0, 0, W, H);
    return c;
  }

  function drawPage(ctx, img, cx, cy, w, rotDeg) {
    const h = w * img.height / img.width;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotDeg * Math.PI / 180);
    ctx.shadowColor = 'rgba(0,0,0,.6)';
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 12;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  // Six arms, each with a chevron, so the flake stays symmetric at poster size.
  function snowflakePath() {
    const pt = (r, deg, side) => {
      const a = deg * Math.PI / 180;
      return `${(16 + r * Math.sin(a) + side * Math.cos(a)).toFixed(2)} ${(16 - r * Math.cos(a) + side * Math.sin(a)).toFixed(2)}`;
    };
    let d = '';
    for (let k = 0; k < 6; k++) {
      const deg = k * 60;
      d += `M16 16L${pt(13.5, deg, 0)}M${pt(12, deg, -3.4)}L${pt(8.6, deg, 0)}L${pt(12, deg, 3.4)}`;
    }
    return d;
  }

  // 32x32 motifs, matching the set the game's own pages use.
  const MOTIF_PATHS = {
    snowflake: [snowflakePath()],
    moon: ['M21 4a12 12 0 1 0 7 19A10 10 0 0 1 21 4z'],
    star: ['M16 3l3.6 8.4 9 .8-6.8 6 2 8.8L16 22.4 8.2 27l2-8.8-6.8-6 9-.8z'],
    heart: ['M16 27S4 19.5 4 11.5A6 6 0 0 1 16 9a6 6 0 0 1 12 2.5C28 19.5 16 27 16 27z'],
    compass: ['M28 16a12 12 0 1 1-24 0a12 12 0 1 1 24 0z', 'M16 6l3 10-3 10-3-10zM6 16l10-3 10 3-10 3z'],
    leaf: ['M6 26C6 12 14 5 27 5c0 13-7 21-21 21zM6 26L18 14'],
    key: ['M15.5 16a5.5 5.5 0 1 1-11 0a5.5 5.5 0 1 1 11 0zM15.5 16H28M24 16v4M28 16v5'],
  };

  function drawMotif(ctx, name, cx, cy, size, color) {
    const s = size / 32;
    ctx.save();
    ctx.translate(cx - size / 2, cy - size / 2);
    ctx.scale(s, s);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    (MOTIF_PATHS[name] || MOTIF_PATHS.key).forEach((d) => ctx.stroke(new Path2D(d)));
    ctx.restore();
  }

  // The certificate is landscape on Letter and A4 but portrait in the KDP format.
  const certWidth = (img, landscapeW) => (img && img.width < img.height ? landscapeW * 0.72 : landscapeW);

  function drawSeal(ctx, cx, cy, r, scale) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.shadowColor = 'rgba(0,0,0,.6)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = THEME.accent;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = THEME.gold;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, r - 16, 0, Math.PI * 2);
    ctx.stroke();
    fitText(ctx, String(GAME.puzzles), 0, -r * 0.04, r * 1.2, r * 0.82, 900, HEAD, THEME.ink);
    fitText(ctx, 'PUZZLES', 0, r * 0.26, r * 1.4, r * 0.25, 800, HEAD, THEME.gold, 3);
    fitText(ctx, '+ HOST KIT', 0, r * 0.52, r * 1.3, r * 0.17, 800, HEAD, THEME.ink, 2);
    ctx.restore();
  }

  // Puzzle geometry ------------------------------------------------------------------------------

  // Walks the boundary of the inside cells into one ordered vertex list, so the loop can be drawn progressively.
  function traceLoop(p) {
    const inside = (c, r) => c >= 0 && r >= 0 && c < p.W && r < p.H && p.inside[r * p.W + c] === 1;
    const adj = new Map();
    const link = (a, b) => {
      const ka = a.join(), kb = b.join();
      if (!adj.has(ka)) adj.set(ka, []);
      if (!adj.has(kb)) adj.set(kb, []);
      adj.get(ka).push(b);
      adj.get(kb).push(a);
    };
    for (let r = 0; r <= p.H; r++) for (let c = 0; c < p.W; c++) if (inside(c, r) !== inside(c, r - 1)) link([c, r], [c + 1, r]);
    for (let r = 0; r < p.H; r++) for (let c = 0; c <= p.W; c++) if (inside(c, r) !== inside(c - 1, r)) link([c, r], [c, r + 1]);
    const start = adj.keys().next().value.split(',').map(Number);
    const path = [start];
    let prev = null, cur = start;
    do {
      const next = adj.get(cur.join()).find((v) => !prev || v.join() !== prev.join());
      path.push(next);
      prev = cur;
      cur = next;
    } while (cur.join() !== start.join());
    return path;
  }

  function strokePartial(ctx, pts, frac) {
    const n = pts.length - 1;
    const upto = frac * n;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i <= Math.floor(upto); i++) ctx.lineTo(pts[i][0], pts[i][1]);
    const f = upto - Math.floor(upto);
    if (f > 0 && upto < n) {
      const a = pts[Math.floor(upto)], b = pts[Math.floor(upto) + 1];
      ctx.lineTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f);
    }
    ctx.stroke();
  }

  // o: { loop: 0..1 share of the loop drawn, shade: 0..1 letter fill }
  function drawPuzzle(ctx, p, loop, x, y, cell, o) {
    const pad = cell * 0.42;
    const px = (c) => x + c * cell, py = (r) => y + r * cell;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.45)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = THEME.paper;
    roundRect(ctx, x - pad, y - pad, p.W * cell + pad * 2, p.H * cell + pad * 2, cell * 0.14);
    ctx.fill();
    ctx.restore();
    if (o.shade > 0) {
      ctx.save();
      ctx.globalAlpha = o.shade;
      ctx.fillStyle = THEME.shade;
      for (let r = 0; r < p.H; r++) for (let c = 0; c < p.W; c++) {
        if (p.inside[r * p.W + c]) ctx.fillRect(px(c) - 0.5, py(r) - 0.5, cell + 1, cell + 1);
      }
      ctx.restore();
    }
    ctx.fillStyle = THEME.pencil;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${cell * 0.55}px "DejaVu Serif", Georgia, serif`;
    for (let r = 0; r < p.H; r++) for (let c = 0; c < p.W; c++) {
      const v = p.clues[r * p.W + c];
      if (v >= 0) ctx.fillText(String(v), px(c) + cell / 2, py(r) + cell / 2 + cell * 0.03);
    }
    ctx.textBaseline = 'alphabetic';
    if (o.loop > 0) {
      ctx.strokeStyle = THEME.loop;
      ctx.lineWidth = cell * 0.09;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      strokePartial(ctx, loop.map(([c, r]) => [px(c), py(r)]), o.loop);
    }
    ctx.fillStyle = THEME.pencil;
    for (let r = 0; r <= p.H; r++) for (let c = 0; c <= p.W; c++) {
      ctx.beginPath();
      ctx.arc(px(c), py(r), cell * 0.055, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawLetterBoxes(ctx, cx, y, size, count, filledAt, letter, pop) {
    const gap = size * 0.16;
    const total = count * size + (count - 1) * gap;
    for (let i = 0; i < count; i++) {
      const bx = cx - total / 2 + i * (size + gap);
      ctx.fillStyle = THEME.paper;
      ctx.strokeStyle = THEME.paperEdge;
      ctx.lineWidth = size * 0.05;
      roundRect(ctx, bx, y, size, size, size * 0.06);
      ctx.fill();
      ctx.stroke();
      if (i === filledAt && pop > 0) {
        ctx.save();
        ctx.globalAlpha = clamp01(pop);
        ctx.translate(bx + size / 2, y + size / 2);
        ctx.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop);
        ctx.fillStyle = THEME.loop;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `900 ${size * 0.72}px ${HEAD}`;
        ctx.fillText(letter, 0, size * 0.04);
        ctx.textBaseline = 'alphabetic';
        ctx.restore();
      }
    }
  }

  // Scenes (2000x1600 design space) --------------------------------------------------------------

  // Long titles take two lines; the collage then shrinks towards the bottom edge to make room.
  function titleLayout(ctx) {
    const title = GAME.title.toUpperCase();
    if (fittedSize(ctx, title, W - 120, 124, 900, HEAD, 1) >= 100) return { lines: [title], collage: 1 };
    const words = title.split(' ');
    let best = 1, bestDiff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const diff = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
      if (diff < bestDiff) { bestDiff = diff; best = i; }
    }
    return { lines: [words.slice(0, best).join(' '), words.slice(best).join(' ')], collage: 0.88 };
  }

  function header(ctx, A) {
    ctx.drawImage(A.bg, 0, 0, W, H);
    ctx.fillStyle = THEME.accent;
    ctx.fillRect(0, 56, W, 96);
    const kicker = ['A SLITHERLINK ESCAPE GAME', GAME.audience.toUpperCase()].filter(Boolean).join('  ·  ');
    fitText(ctx, kicker, W / 2, 122, W - 160, 50, 800, HEAD, THEME.accentInk, 4);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.7)';
    ctx.shadowBlur = 16;
    const { lines } = A.title;
    if (lines.length === 1) fitText(ctx, lines[0], W / 2, 292, W - 120, 124, 900, HEAD, THEME.ink, 1);
    else lines.forEach((l, i) => fitText(ctx, l, W / 2, 268 + i * 118, W - 160, 112, 900, HEAD, THEME.ink, 1));
    ctx.restore();
  }

  // Back to front. Pages that fly in later land on top of earlier ones.
  function heroLayout(A) {
    const P = A.images, k = A.title.collage;
    const list = [
      { img: P.puzzles[0], x: 245, y: 640, w: 430, rot: -6 },
      { img: P.puzzles[1], x: 1755, y: 640, w: 430, rot: 6 },
      { img: P.howTo, x: 240, y: 1210, w: 430, rot: 4 },
      { img: P.finalLock, x: 1760, y: 1210, w: 430, rot: -4 },
      { img: P.puzzles[2], x: 640, y: 720, w: 450, rot: -3 },
      { img: P.codeSheet, x: 1360, y: 720, w: 450, rot: 3 },
      { img: P.puzzles[3], x: 610, y: 1250, w: 450, rot: 3 },
      { img: P.certificate, x: 1390, y: 1290, w: certWidth(P.certificate, 620), rot: -3 },
      { img: P.cover, x: 1000, y: 985, w: 640, rot: -1.5 },
    ];
    return list.filter((pg) => pg.img).map((pg) => ({ ...pg, x: W / 2 + (pg.x - W / 2) * (k === 1 ? 1 : 0.97), y: H - (H - pg.y) * k - (k === 1 ? 0 : 20), w: pg.w * k }));
  }

  function drawHero(ctx, A, t) {
    header(ctx, A);
    const r = rng(11);
    heroLayout(A).forEach((pg, i) => {
      const t0 = 0.15 + i * 0.22;
      const dirX = pg.x - W / 2 || 1, dirY = pg.y - H / 2 + 300;
      const len = Math.hypot(dirX, dirY);
      const spin = (r() - 0.5) * 50;
      const k = easeOut(span(t, t0, t0 + 0.6));
      if (k <= 0) return;
      const fly = (1 - k) * 1700;
      drawPage(ctx, pg.img, pg.x + dirX / len * fly, pg.y + dirY / len * fly, pg.w, pg.rot + spin * (1 - k));
    });
    const s = easeOut(span(t, 2.3, 2.7));
    if (s > 0) drawSeal(ctx, 1700, 1320, 200, s);
  }

  function drawPuzzleGrid(ctx, A) {
    ctx.drawImage(A.bg, 0, 0, W, H);
    fitText(ctx, `${GAME.puzzles} LOGIC PUZZLES, ONE SECRET CODE`, W / 2, 130, W - 140, 92, 900, HEAD, THEME.ink, 1);
    fitText(ctx, 'Every puzzle checked by computer: exactly one solution, no guessing', W / 2, 200, W - 200, 50, 400, SC, THEME.gold);
    const cols = [W / 2 - 540, W / 2, W / 2 + 540], rows = [590, 1250];
    const shown = 590;
    A.images.puzzles.slice(0, 6).forEach((img, i) => {
      const cx = cols[i % 3], cy = rows[i < 3 ? 0 : 1];
      fitText(ctx, `PUZZLE ${i + 1}`, cx, cy - shown / 2 - 18, 400, 40, 800, HEAD, THEME.ink, 3);
      drawPage(ctx, img, cx, cy, shown * img.width / img.height, 0);
    });
  }

  function drawMessage(ctx, A) {
    ctx.drawImage(A.bg, 0, 0, W, H);
    drawMotif(ctx, THEME.motif, W / 2, 400, 380, THEME.gold);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.7)';
    ctx.shadowBlur = 16;
    fitText(ctx, 'INSTANT DOWNLOAD', W / 2, 760, W - 240, 150, 900, HEAD, THEME.ink, 2);
    ctx.restore();
    fitText(ctx, `${GAME.pageCount}-PAGE PDF  ·  ${GAME.paper}`, W / 2, 880, W - 300, 64, 800, HEAD, THEME.gold, 3);
    fitText(ctx, 'No physical item will be shipped', W / 2, 970, W - 300, 58, 400, SC, THEME.ink);
    const steps = ['BUY', 'DOWNLOAD', 'PRINT', 'PLAY'];
    const w = 390, gap = 36, left = (W - steps.length * w - (steps.length - 1) * gap) / 2;
    steps.forEach((s, i) => {
      const x = left + i * (w + gap);
      ctx.fillStyle = THEME.accent;
      roundRect(ctx, x, 1120, w, 200, 14);
      ctx.fill();
      fitText(ctx, String(i + 1), x + w / 2, 1200, w, 64, 900, HEAD, THEME.gold);
      fitText(ctx, s, x + w / 2, 1280, w - 40, 54, 800, HEAD, THEME.accentInk, 2);
    });
  }

  function drawIncluded(ctx, A) {
    heading(ctx, A, 'EVERYTHING YOU NEED', `One ${GAME.pageCount}-page printable PDF`);
    const items = [
      `${GAME.puzzles} Slitherlink puzzles`,
      'Story and mission pages',
      'How to Play with an example',
      'Code Sheet and Final Lock',
      'Step-by-step Host Guide',
      '20 hint questions',
      `${GAME.puzzles * 2} cut-out hint cards`,
      'Full answer key',
      'Certificate of completion',
    ];
    ctx.textBaseline = 'alphabetic';
    items.forEach((item, i) => {
      const y = 390 + i * 124;
      ctx.strokeStyle = THEME.gold;
      ctx.lineWidth = 11;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(100, y - 18);
      ctx.lineTo(122, y + 4);
      ctx.lineTo(164, y - 42);
      ctx.stroke();
      setFont(ctx, 800, 52, HEAD);
      ctx.textAlign = 'left';
      ctx.fillStyle = THEME.ink;
      ctx.fillText(item, 200, y);
    });
    const P = A.images;
    [
      { img: P.puzzles[0], x: 1190, y: 620, w: 500, rot: -5 },
      { img: P.codeSheet, x: 1660, y: 620, w: 500, rot: 5 },
      { img: P.certificate, x: 1510, y: 1270, w: certWidth(P.certificate, 700), rot: 3 },
      { img: P.cover, x: 1400, y: 930, w: 590, rot: -2 },
    ].forEach((pg) => { if (pg.img) drawPage(ctx, pg.img, pg.x, pg.y, pg.w, pg.rot); });
  }

  function drawStory(ctx, A) {
    heading(ctx, A, 'A STORY WORTH SOLVING', GAME.title);
    if (A.images.prologue) drawPage(ctx, A.images.prologue, 540, 930, 800, -2);
    const cx = 1430, w = 880;
    let y = 480;
    if (GAME.tagline) y = drawWrapped(ctx, `“${GAME.tagline}”`, cx, y, w, 76, 400, ITALIC, THEME.ink, 4) + 70;
    if (GAME.mission) {
      fitText(ctx, 'YOUR MISSION', cx, y, w, 58, 800, HEAD, THEME.gold, 3);
      drawWrapped(ctx, GAME.mission, cx, y + 92, w, 54, 400, ITALIC, THEME.ink, 8);
    }
  }

  function drawWordBoxes(ctx, cx, y, size, word) {
    const gap = size * 0.16;
    const total = word.length * size + (word.length - 1) * gap;
    [...word].forEach((ch, i) => {
      const bx = cx - total / 2 + i * (size + gap);
      ctx.fillStyle = THEME.paper;
      ctx.strokeStyle = THEME.paperEdge;
      ctx.lineWidth = size * 0.05;
      roundRect(ctx, bx, y, size, size, size * 0.06);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = THEME.loop;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${size * 0.68}px ${HEAD}`;
      ctx.fillText(ch, bx + size / 2, y + size / 2 + size * 0.03);
    });
    ctx.textBaseline = 'alphabetic';
    return total;
  }

  // Example words for the code image, never a word from the game's real code.
  function exampleWords(count) {
    const real = (GAME.secretCode || '').split(/\s+/);
    return ['LOCK', 'CLUE', 'DOOR', 'MAZE', 'PATH', 'GATE'].filter((w) => !real.includes(w)).slice(0, count);
  }

  function drawCodeBuild(ctx, A) {
    heading(ctx, A, 'LETTERS BUILD THE SECRET CODE');
    const words = exampleWords(Math.min(GAME.chapters, 3));
    const rowH = 240, top = words.length === 2 ? 380 : 270;
    words.forEach((word, i) => {
      const y = top + i * rowH;
      fitText(ctx, `CHAPTER ${i + 1} SPELLS A WORD`, W / 2, y, W - 300, 46, 800, HEAD, THEME.gold, 3);
      drawWordBoxes(ctx, W / 2, y + 34, 124, word);
    });
    const y = top + words.length * rowH + 20;
    ctx.strokeStyle = THEME.gold;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(300, y);
    ctx.lineTo(W - 300, y);
    ctx.stroke();
    fitText(ctx, 'TOGETHER THEY OPEN THE FINAL LOCK', W / 2, y + 90, W - 200, 62, 900, HEAD, THEME.ink, 2);
    const all = words.join(' ');
    const size = Math.min(112, Math.floor((W - 240) / (all.length * 1.16)));
    let x = W / 2 - (all.length * size * 1.16) / 2;
    words.forEach((word) => {
      const wide = word.length * size * 1.16;
      drawWordBoxes(ctx, x + wide / 2 - size * 0.08, y + 130, size, word);
      x += wide + size * 1.16;
    });
    fitText(ctx, 'Example code shown. Your game has its own secret code.', W / 2, 1520, W - 200, 46, 400, SC, THEME.gold);
  }

  function drawClock(ctx, cx, cy, r) {
    ctx.strokeStyle = THEME.loop;
    ctx.lineWidth = r * 0.11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - r * 0.68);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * 0.48, cy + r * 0.2);
    ctx.stroke();
  }

  function drawHints(ctx, A) {
    heading(ctx, A, 'STUCK? EARN A HINT', 'Hints are never free. Players win them with a right answer.');
    const w = 590, top = 320, h = 1050, xs = [50, 705, 1360];
    xs.forEach((x) => paperCard(ctx, x, top, w, h));
    const title = (x, t) => drawWrapped(ctx, t, x + w / 2, top + 90, w - 70, 56, 900, HEAD, THEME.pencil, 2);
    title(xs[0], '1. The Host reads a question');
    ctx.textAlign = 'left';
    setFont(ctx, 400, 56, SC);
    [['A', 'The first door'], ['B', 'The old clock'], ['C', 'The black cat']].forEach(([k, t], i) => {
      const y = top + 370 + i * 200;
      ctx.fillStyle = i === 1 ? THEME.loop : THEME.pencil;
      ctx.beginPath();
      ctx.arc(xs[0] + 100, y - 18, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = THEME.paper;
      ctx.textAlign = 'center';
      setFont(ctx, 800, 54, HEAD);
      ctx.fillText(k, xs[0] + 100, y);
      ctx.textAlign = 'left';
      ctx.fillStyle = THEME.pencil;
      setFont(ctx, 400, 54, SC);
      ctx.fillText(t, xs[0] + 170, y);
    });
    drawWrapped(ctx, 'A question about the story or the theme', xs[0] + w / 2, top + 930, w - 70, 48, 400, SC, THEME.pencil, 2);
    title(xs[1], '2. Right answer? Get a hint card');
    const cell = 56, p = A.puzzle;
    drawPuzzle(ctx, p, A.loop, xs[1] + (w - p.W * cell) / 2, top + 330, cell, { loop: 0.2, shade: 0 });
    drawWrapped(ctx, 'Part of the loop is drawn for you', xs[1] + w / 2, top + 930, w - 70, 48, 400, SC, THEME.pencil, 2);
    title(xs[2], '3. Wrong answer? Wait 2 minutes');
    drawClock(ctx, xs[2] + w / 2, top + 500, 170);
    drawWrapped(ctx, 'Then try a different question. Every puzzle has two hints.', xs[2] + w / 2, top + 800, w - 80, 54, 400, SC, THEME.pencil, 4);
    fitText(ctx, 'Example shown. Questions come from your game’s story and theme.', W / 2, 1490, W - 200, 46, 400, SC, THEME.gold);
  }

  function drawPeople(ctx, cx, cy, count, color) {
    ctx.fillStyle = color;
    const gap = 92, left = cx - ((count - 1) * gap) / 2;
    for (let i = 0; i < count; i++) {
      const x = left + i * gap;
      ctx.beginPath();
      ctx.arc(x, cy - 44, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 46, cy + 66);
      ctx.quadraticCurveTo(x - 46, cy, x, cy);
      ctx.quadraticCurveTo(x + 46, cy, x + 46, cy + 66);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawModes(ctx, A) {
    heading(ctx, A, 'PLAY IT YOUR WAY', 'The same game, three ways to hand it out');
    const modes = [
      { title: 'TOGETHER', people: 3, text: 'Split the puzzles between players and share one Code Sheet.' },
      { title: 'TEAMS', people: 4, text: 'Every team gets its own copy. The first to open the lock wins.' },
    ];
    if (GAME.soloAllowed) modes.unshift({ title: 'SOLO', people: 1, text: 'One player, every puzzle, at your own pace.' });
    else heading(ctx, A, 'PLAY IT YOUR WAY', 'The same game, two ways to hand it out');
    const gap = 50, w = modes.length === 3 ? 590 : 760;
    const left = (W - modes.length * w - (modes.length - 1) * gap) / 2;
    modes.forEach((m, i) => {
      const x = left + i * (w + gap), top = 360;
      paperCard(ctx, x, top, w, 930);
      drawPeople(ctx, x + w / 2, top + 240, m.people, THEME.loop);
      fitText(ctx, m.title, x + w / 2, top + 450, w - 60, 80, 900, HEAD, THEME.pencil, 2);
      drawWrapped(ctx, m.text, x + w / 2, top + 580, w - 90, 56, 400, SC, THEME.pencil, 5);
    });
  }

  function drawCodePages(ctx, A) {
    heading(ctx, A, 'FROM CODE SHEET TO FINAL LOCK', 'Players track every letter, then face the last door');
    const P = A.images, h = 1130;
    if (P.codeSheet) drawPage(ctx, P.codeSheet, 560, 930, h * P.codeSheet.width / P.codeSheet.height, -2);
    if (P.finalLock) drawPage(ctx, P.finalLock, 1440, 930, h * P.finalLock.width / P.finalLock.height, 2);
  }

  function drawHintCards(ctx, A) {
    heading(ctx, A, 'HINT CARDS READY TO CUT', `Two for every puzzle, ${GAME.puzzles * 2} in this game`);
    const p = A.puzzle, cell = 62, cards = [['HINT 1', 0.2, 300], ['HINT 2', 0.5, 1080]];
    cards.forEach(([label, loop, x], i) => {
      const w = 620, top = 330, h = 950;
      paperCard(ctx, x, top, w, h);
      ctx.save();
      ctx.setLineDash([22, 16]);
      ctx.strokeStyle = THEME.paperEdge;
      ctx.lineWidth = 4;
      roundRect(ctx, x + 22, top + 22, w - 44, h - 44, 10);
      ctx.stroke();
      ctx.restore();
      fitText(ctx, label, x + w / 2, top + 110, w - 80, 64, 900, HEAD, THEME.loop, 3);
      drawPuzzle(ctx, p, A.loop, x + (w - p.W * cell) / 2, top + 190, cell, { loop, shade: 0 });
      fitText(ctx, i ? 'About half of the loop' : 'A first piece of the loop', x + w / 2, top + 880, w - 80, 48, 400, SC, THEME.pencil);
    });
    fitText(ctx, 'Example shown. Your cards match your puzzles. Six cards to a page, with cut lines.', W / 2, 1400, W - 180, 48, 400, SC, THEME.gold);
  }

  function drawHostGuide(ctx, A) {
    heading(ctx, A, 'A GUIDE THAT RUNS THE GAME', 'Everything the Game Host needs, step by step');
    const img = A.images.hostGuide;
    if (img) drawPage(ctx, img, 560, 830, 1000, -1);
    const items = ['What to print', 'How to set up', 'Ways to play', 'How long it takes', 'How to give hints', 'An ending to read aloud'];
    const cx = img ? 1500 : W / 2;
    items.forEach((t, i) => {
      const y = 430 + i * 170;
      drawMotif(ctx, THEME.motif, cx - 370, y - 18, 70, THEME.gold);
      ctx.textAlign = 'left';
      ctx.fillStyle = THEME.ink;
      setFont(ctx, 800, fittedSize(ctx, t, 640, 56, 800, HEAD), HEAD);
      ctx.fillText(t, cx - 300, y);
    });
  }

  function drawCertificate(ctx, A) {
    heading(ctx, A, 'A CERTIFICATE FOR EVERY ESCAPE', 'With name, date, time taken and hints used');
    const img = A.images.certificate;
    if (img) drawPage(ctx, img, W / 2, 910, Math.min(1500, 1200 * img.width / img.height), -1.5);
  }

  const OCCASIONS = {
    kids: ['CLASSROOMS', 'BIRTHDAY PARTIES', 'HOMESCHOOL DAYS', 'RAINY AFTERNOONS'],
    teens: ['CLASSROOMS', 'YOUTH GROUPS', 'SLEEPOVERS', 'FAMILY GAME NIGHT'],
    adults: ['GAME NIGHTS', 'TEAM BUILDING', 'DINNER PARTIES', 'FAMILY GATHERINGS'],
  };

  function drawOccasions(ctx, A) {
    ctx.drawImage(A.bg, 0, 0, W, H);
    drawMotif(ctx, THEME.motif, W / 2, 310, 220, THEME.gold);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.7)';
    ctx.shadowBlur = 16;
    fitText(ctx, 'PERFECT FOR', W / 2, 570, W - 240, 130, 900, HEAD, THEME.ink, 2);
    ctx.restore();
    const key = /kid/i.test(GAME.audience) ? 'kids' : /adult/i.test(GAME.audience) ? 'adults' : 'teens';
    const w = 800, h = 280, gap = 50, left = (W - 2 * w - gap) / 2;
    OCCASIONS[key].forEach((t, i) => {
      const x = left + (i % 2) * (w + gap), y = 680 + (i >> 1) * (h + gap);
      ctx.fillStyle = THEME.accent;
      roundRect(ctx, x, y, w, h, 16);
      ctx.fill();
      fitText(ctx, t, x + w / 2, y + h / 2 + 24, w - 80, 70, 900, HEAD, THEME.accentInk, 2);
    });
  }

  function drawAtAGlance(ctx, A) {
    heading(ctx, A, 'AT A GLANCE', GAME.title);
    const ages = GAME.audience.match(/\d+\s*[-–]\s*\d+/);
    const tiles = [
      ages ? [ages[0], 'YEARS OLD'] : [GAME.audience.toUpperCase(), 'AUDIENCE'],
      [String(GAME.puzzles), 'PUZZLES'],
      [GAME.minutes, 'MINUTES OF PLAY'],
      [GAME.playersValue, GAME.playersLabel],
    ].filter(([v]) => v);
    const w = 820, h = 500, gap = 50, left = (W - 2 * w - gap) / 2;
    tiles.forEach(([value, label], i) => {
      const x = left + (i % 2) * (w + gap), y = 340 + (i >> 1) * (h + gap);
      paperCard(ctx, x, y, w, h);
      fitText(ctx, value, x + w / 2, y + 280, w - 80, 190, 900, HEAD, THEME.loop);
      fitText(ctx, label, x + w / 2, y + 400, w - 80, 60, 800, HEAD, THEME.pencil, 3);
    });
  }

  function drawHowItWorks(ctx, A) {
    ctx.drawImage(A.bg, 0, 0, W, H);
    const p = A.puzzle;
    fitText(ctx, 'EVERY PUZZLE HIDES A LETTER', W / 2, 140, W - 140, 104, 900, HEAD, THEME.ink, 1);
    const cell = 80, gridW = p.W * cell, top = 480;
    const cols = [340, 1000, 1660];
    const labels = ['1. SOLVE THE NUMBERS', '2. CLOSE THE LOOP', '3. CRACK THE CODE'];
    labels.forEach((l, i) => fitText(ctx, l, cols[i], 370, 590, 52, 800, HEAD, THEME.gold, 2));
    drawPuzzle(ctx, p, A.loop, cols[0] - gridW / 2, top, cell, { loop: 0, shade: 0 });
    drawPuzzle(ctx, p, A.loop, cols[1] - gridW / 2, top, cell, { loop: 1, shade: 1 });
    drawLetterBoxes(ctx, cols[2], 680, 92, 5, 2, p.letter, 1);
    fitText(ctx, 'Each letter fills a box.', cols[2], 880, 560, 50, 400, SC, THEME.ink);
    fitText(ctx, 'The final code', cols[2], 950, 560, 50, 400, SC, THEME.ink);
    fitText(ctx, 'opens the last lock!', cols[2], 1020, 560, 50, 400, SC, THEME.ink);
    fitText(ctx, 'Example puzzle shown. Your game has its own puzzles and its own code.', W / 2, 1420, W - 200, 46, 400, SC, THEME.gold);
  }

  // Second video scene: the loop draws itself, the letter appears and drops into the code.
  function drawReveal(ctx, A, t) {
    ctx.drawImage(A.bg, 0, 0, W, H);
    const p = A.puzzle;
    fitText(ctx, 'EVERY PUZZLE HIDES A LETTER', W / 2, 150, W - 140, 104, 900, HEAD, THEME.ink, 1);
    const cell = 120, x = 110, y = 300;
    const loop = easeInOut(span(t, 0.3, 2.3));
    const shade = span(t, 2.3, 2.8);
    drawPuzzle(ctx, p, A.loop, x, y, cell, { loop, shade });
    const cx = 1490, textW = 840;
    const c1 = span(t, 0.2, 0.6), c2 = span(t, 2.3, 2.7), c3 = span(t, 3.0, 3.4);
    ctx.save();
    ctx.globalAlpha = c1;
    fitText(ctx, 'Draw one closed loop', cx, 520, textW, 76, 800, HEAD, THEME.ink);
    ctx.globalAlpha = c2;
    fitText(ctx, 'Shade it. A letter appears!', cx, 640, textW, 66, 800, HEAD, THEME.gold);
    ctx.globalAlpha = c3;
    fitText(ctx, 'Letters unlock the final code', cx, 1080, textW, 60, 800, HEAD, THEME.ink);
    ctx.restore();
    drawLetterBoxes(ctx, cx, 810, 130, 5, 2, p.letter, easeOut(span(t, 3.0, 3.4)));
  }

  function drawEndCard(ctx, A) {
    ctx.drawImage(A.bg, 0, 0, W, H);
    drawPage(ctx, A.images.cover, 560, 830, 760, -2);
    const cx = 1420;
    fitText(ctx, `${GAME.puzzles} PUZZLES`, cx, 560, 860, 120, 900, HEAD, THEME.ink, 1);
    fitText(ctx, 'ONE SECRET CODE', cx, 680, 860, 84, 900, HEAD, THEME.gold, 1);
    if (GAME.minutes) fitText(ctx, `${GAME.minutes} MINUTES`, cx, 840, 860, 66, 800, HEAD, THEME.ink, 2);
    if (GAME.players) fitText(ctx, GAME.players, cx, 930, 860, 56, 800, HEAD, THEME.ink, 2);
    ctx.fillStyle = THEME.accent;
    roundRect(ctx, cx - 370, 1030, 740, 130, 14);
    ctx.fill();
    fitText(ctx, 'INSTANT DOWNLOAD', cx, 1115, 660, 66, 900, HEAD, THEME.accentInk, 2);
  }

  // Video timeline: fly-in, then the reveal, then the end card. Crossfades are 0.4s.
  // 24 fps at 1080 px wide: what Etsy and Pinterest show, with about half the encoding work of 30 fps at 1280.
  const VIDEO = { fps: 24, seconds: 10, width: 1080, height: 864 };
  const SCENE_B = 3.6, SCENE_C = 8.0;

  function drawVideoFrame(ctx, A, t) {
    drawHero(ctx, A, t);
    const b = span(t, SCENE_B, SCENE_B + 0.4);
    if (b > 0) {
      ctx.save();
      drawReveal(A.layer, A, t - SCENE_B - 0.3);
      ctx.globalAlpha = b;
      ctx.drawImage(A.layer.canvas, 0, 0, W, H);
      ctx.restore();
    }
    const c = span(t, SCENE_C, SCENE_C + 0.4);
    if (c > 0) {
      ctx.save();
      drawEndCard(A.layer, A);
      ctx.globalAlpha = c;
      ctx.drawImage(A.layer.canvas, 0, 0, W, H);
      ctx.restore();
    }
  }

  // Output ---------------------------------------------------------------------------------------

  // Renders only the pages the layouts use and activates this game and theme for drawing.
  async function createAssets(game, visual, puzzle) {
    await Promise.all([
      document.fonts.load(`900 100px "Playfair Display"`),
      document.fonts.load(`800 100px "Playfair Display"`),
      document.fonts.load(`700 100px "DejaVu Serif"`),
      document.fonts.load(`400 100px "IM Fell SC"`),
      document.fonts.load(`400 100px "IM Fell Italic"`),
    ]);
    GAME = game;
    THEME = { ...BASE_COLORS, ...visual };
    USED_PAGES = [];
    const first = (kind) => {
      const p = game.pages.find((x) => x.kind === kind);
      return p ? pageImage(p) : null;
    };
    const [cover, howTo, codeSheet, finalLock, certificate, prologue, hostGuide, puzzles] = await Promise.all([
      first('cover'), first('howTo'), first('codeSheet'), first('finalLock'), first('certificate'), first('prologue'),
      hostGuideTop(game),
      Promise.all(game.pages.filter((x) => x.kind === 'puzzle').slice(0, 6).map(pageImage)),
    ]);
    const layer = document.createElement('canvas');
    layer.width = W; layer.height = H;
    const probe = document.createElement('canvas').getContext('2d');
    return {
      images: { cover, howTo, codeSheet, finalLock, certificate, prologue, hostGuide, puzzles },
      usedPages: USED_PAGES,
      puzzle, loop: traceLoop(puzzle),
      bg: makeBackground(visual.material, visual.tint),
      layer: layer.getContext('2d'),
      title: titleLayout(probe),
    };
  }

  // In listing order: draw them in, explain the game, show what is inside, then close the sale.
  const IMAGES = {
    '01-hero': (c, A) => drawHero(c, A, Infinity),
    '02-included': drawIncluded,
    '03-story': drawStory,
    '04-how-it-works': drawHowItWorks,
    '05-secret-code': drawCodeBuild,
    '06-earn-hints': drawHints,
    '07-ways-to-play': drawModes,
    '08-puzzle-grid': drawPuzzleGrid,
    '09-code-sheet': drawCodePages,
    '10-hint-cards': drawHintCards,
    '11-host-guide': drawHostGuide,
    '12-certificate': drawCertificate,
    '13-occasions': drawOccasions,
    '14-at-a-glance': drawAtAGlance,
    '15-instant-download': drawMessage,
  };

  function renderImage(name, A) {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    IMAGES[name](c.getContext('2d'), A);
    return c;
  }

  class EncoderStalled extends Error {}

  // Waits until `test()` is true, checking whenever the encoder hands back a chunk.
  // Throws EncoderStalled when nothing comes back for `ms` milliseconds.
  function waitFor(encoder, test, ms) {
    return new Promise((resolve, reject) => {
      if (test()) { resolve(); return; }
      // 'dequeue' events plus a light poll, for browsers that do not fire the event.
      let timer, poll, last = encoder.encodeQueueSize;
      const done = (fn) => { clearTimeout(timer); clearInterval(poll); encoder.removeEventListener('dequeue', check); fn(); };
      const arm = () => { clearTimeout(timer); timer = setTimeout(() => done(() => reject(new EncoderStalled('stalled'))), ms); };
      const check = () => {
        if (test()) { done(resolve); return; }
        if (encoder.encodeQueueSize !== last) { last = encoder.encodeQueueSize; arm(); }
      };
      encoder.addEventListener('dequeue', check);
      poll = setInterval(check, 50);
      arm();
    });
  }

  // One full encode with one encoder setting. Frames are handed over as plain RGBA pixels read back
  // from a CPU canvas, and at most a few are queued at a time: GPU-backed canvas frames and long
  // queues made some encoders return a chunk or two and then stop answering without any error.
  async function encodeWith(A, config, onProgress) {
    const { fps, seconds, width, height } = VIDEO;
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
    ctx.imageSmoothingQuality = 'high';
    const muxer = new Mp4Muxer.Muxer({
      target: new Mp4Muxer.ArrayBufferTarget(),
      video: { codec: 'avc', width, height, frameRate: fps },
      fastStart: 'in-memory',
    });
    let failure = null;
    const encoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => { failure = e; },
    });
    encoder.configure(config);
    const total = fps * seconds;
    try {
      for (let i = 0; i < total; i++) {
        if (failure) throw failure;
        ctx.save();
        ctx.scale(width / W, height / H);
        drawVideoFrame(ctx, A, i / fps);
        ctx.restore();
        const pixels = ctx.getImageData(0, 0, width, height).data;
        const frame = new VideoFrame(pixels, {
          format: 'RGBX', codedWidth: width, codedHeight: height,
          timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps),
        });
        encoder.encode(frame, { keyFrame: i % fps === 0 });
        frame.close();
        await waitFor(encoder, () => encoder.encodeQueueSize <= 2, 20000);
        // Yield every frame so the page (and the rest of the computer) stays responsive.
        onProgress((i + 1) / total);
        await new Promise((r) => setTimeout(r));
      }
      let timer;
      const stalled = new Promise((_, reject) => { timer = setTimeout(() => reject(new EncoderStalled('stalled')), 30000); });
      try { await Promise.race([encoder.flush(), stalled]); } finally { clearTimeout(timer); }
      if (failure) throw failure;
      muxer.finalize();
      return new Blob([muxer.target.buffer], { type: 'video/mp4' });
    } finally {
      if (encoder.state !== 'closed') { try { encoder.close(); } catch (e) { /* already failed */ } }
    }
  }

  async function encodeVideo(A, onProgress) {
    if (!('VideoEncoder' in window)) throw new Error('This browser cannot make videos (no WebCodecs). Please use a recent Chrome or Edge.');
    const { fps, width, height } = VIDEO;
    const base = { codec: 'avc1.640028', width, height, bitrate: 5_000_000, framerate: fps };
    // Software first (most predictable), then whatever the browser picks, then hardware.
    const configs = [];
    for (const hw of ['prefer-software', undefined, 'prefer-hardware']) {
      const config = hw ? { ...base, hardwareAcceleration: hw } : base;
      try { if ((await VideoEncoder.isConfigSupported(config)).supported) configs.push(config); } catch (e) { /* not supported */ }
    }
    if (!configs.length) throw new Error('This browser has no H.264 video encoder. Please use a recent Chrome or Edge.');
    for (const config of configs) {
      try {
        return await encodeWith(A, config, onProgress);
      } catch (e) {
        if (!(e instanceof EncoderStalled)) throw e;
        // This encoder stopped answering: start over with the next one.
      }
    }
    throw new Error('The video encoder in this browser stopped responding. Please update Chrome or Edge, or turn off the video and make the images only.');
  }

  root.ListingKit = {
    analyzePdf, resolveVisual, createAssets, renderImage, encodeVideo,
    imageNames: Object.keys(IMAGES), materials: Object.keys(MATERIALS), SAFE_KINDS, VISUALS,
  };
})(window);
