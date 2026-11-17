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
  const SAFE_KINDS = new Set(['cover', 'prologue', 'howTo', 'codeSheet', 'chapter', 'puzzle', 'pieces', 'assembly', 'finalLock', 'certificate']);

  function classify(text, index) {
    if (/for the game host only/i.test(text)) return 'host';
    if (index === 0) return 'cover';
    if (/certificate of completion/i.test(text)) return 'certificate';
    if (/puzzle\s+\d+\s+of\s+\d+/i.test(text)) return 'puzzle';
    // Mosaic pages, by the sentences only they carry (How to Play and the Code Sheet mention the boards too).
    // The Answer Board lists the picture's name among decoys, so it is checked first and never shown.
    if (/which of these is your finished picture/i.test(text)) return 'answerBoard';
    if (/picture pieces/i.test(text) && /cut along the dashed lines/i.test(text)) return 'pieces';
    if (/assembly board/i.test(text) && /glue a piece here/i.test(text)) return 'assembly';
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
    const bytes = data.slice();
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
    const pieceCount = pages.filter((p) => p.kind === 'pieces').reduce((n, p) => n + (p.text.match(/\bpiece\s+\d+/gi) || []).length, 0);
    const chapterTypes = [];
    pages.forEach((p) => {
      if (p.kind === 'chapter') chapterTypes.push('letter');
      else if (p.kind === 'pieces' && chapterTypes.length) chapterTypes[chapterTypes.length - 1] = 'picture';
    });
    const view = pages[0].page.getViewport({ scale: 1 });
    const paper = Math.abs(view.width - 612) < 3 ? 'US LETTER' : Math.abs(view.width - 595) < 3 ? 'A4' : Math.abs(view.width - 621) < 3 ? 'KDP 8.5x11' : 'READY TO PRINT';
    const counts = {};
    pages.forEach((p) => { counts[p.kind] = (counts[p.kind] || 0) + 1; });
    const prologue = pages.find((p) => p.kind === 'prologue');
    const mission = prologue && prologue.text.match(/your mission\s+(.+?)(?:\s*©|$)/i);
    return {
      ...facts,
      mission: mission ? mission[1].trim() : '',
      puzzles: facts.puzzlesOnCover || puzzles.length + pieceCount,
      chapters: chapterTypes.length || 1,
      chapterTypes: chapterTypes.length ? chapterTypes : ['letter'],
      hasPictures: chapterTypes.includes('picture'),
      hasLetters: !chapterTypes.length || chapterTypes.includes('letter'),
      pageCount: pages.length,
      paper, pages, counts, secretCode, bytes,
    };
  }

  async function renderPdfPage(entry, dpi = 150) {
    const vp = entry.page.getViewport({ scale: dpi / 72, rotation: 0 });
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

  // Canva export: while REC is an array, text is recorded as a box instead of drawn, so the picture
  // underneath has no words and every word becomes an editable text box. Turned text (seals, the
  // KDP spine) is not recorded and stays in the picture.
  let REC = null;
  function recText(ctx, e) {
    if (!REC) return false;
    const m = ctx.getTransform();
    if (Math.abs(m.b) > 0.01 || Math.abs(m.c) > 0.01) return false;
    const k = m.a;
    REC.push({ type: 'text', lines: 1, ...e, x: k * e.x + m.e, y: m.d * e.y + m.f, w: e.w * k, size: e.size * k,
      lineH: (e.lineH || 0) * k, spacing: (e.spacing || 0) * k, alpha: ctx.globalAlpha });
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    return true;
  }

  // A card, button or band that holds only text: drawn, or recorded as a shape in Canva mode.
  function box(ctx, x, y, w, h, r, fill, shadow) {
    const m = ctx.getTransform();
    if (REC && Math.abs(m.b) < 0.01 && Math.abs(m.c) < 0.01) {
      const k = m.a;
      REC.push({ type: 'shape', x: k * x + m.e, y: m.d * y + m.f, w: w * k, h: h * k, r: r * k, fill, shadow: !!shadow, alpha: ctx.globalAlpha });
      return;
    }
    ctx.save();
    if (shadow) { ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 12; }
    ctx.fillStyle = fill;
    if (r) { roundRect(ctx, x, y, w, h, r); ctx.fill(); } else ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

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
    if (recText(ctx, { text, x, y, w: ctx.measureText(text).width, size, weight, family, fill, align: 'center', spacing })) return size;
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
    const lineH = size * 1.28;
    if (recText(ctx, { text, x, y, w: maxW, size, weight, family, fill, align: 'center', lines: lines.length, lineH })) return y + lines.length * lineH;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = fill;
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
    ctx.shadowColor = THEME.textShadow;
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

  // Light backgrounds are drawn in their own colours (no theme tint) and need dark text.
  const LIGHT = {
    oak(x, r) {
      let top = 0;
      while (top < H) {
        const h = 260 + r() * 120;
        const t = r() * 16; const g = [222 + t, 198 + t, 160 + t].map(Math.round);
        x.fillStyle = `rgb(${g.join(',')})`;
        x.fillRect(0, top, W, h);
        for (let i = 0; i < 26; i++) {
          x.strokeStyle = `rgba(150, 110, 60, ${0.05 + r() * 0.08})`;
          x.lineWidth = 1 + r() * 3;
          const y = top + r() * h;
          x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(W * 0.3, y + (r() - 0.5) * 30, W * 0.7, y + (r() - 0.5) * 30, W, y + (r() - 0.5) * 20); x.stroke();
        }
        x.fillStyle = 'rgba(110, 76, 40, .35)';
        x.fillRect(0, top + h - 3, W, 4);
        top += h;
      }
    },
    marble(x, r) {
      x.fillStyle = '#f4f2ee';
      x.fillRect(0, 0, W, H);
      for (let i = 0; i < 14; i++) {
        let px = r() * W, py = r() * H, a = r() * Math.PI * 2;
        x.strokeStyle = `rgba(120, 120, 128, ${0.08 + r() * 0.14})`;
        x.lineWidth = 1 + r() * 4;
        x.beginPath(); x.moveTo(px, py);
        for (let k = 0; k < 30; k++) { a += (r() - 0.5) * 0.6; px += Math.cos(a) * 40; py += Math.sin(a) * 40; x.lineTo(px, py); }
        x.stroke();
      }
    },
    kraft(x, r) {
      x.fillStyle = '#c9a57a';
      x.fillRect(0, 0, W, H);
      for (let i = 0; i < 9000; i++) {
        x.fillStyle = r() < 0.5 ? 'rgba(120, 84, 44, .18)' : 'rgba(240, 220, 190, .18)';
        x.fillRect(r() * W, r() * H, 1 + r() * 5, 1 + r() * 1.5);
      }
    },
    pattern(x, r, motif, tint) {
      x.fillStyle = '#f7f1e6';
      x.fillRect(0, 0, W, H);
      const step = 190;
      for (let gy = 0; gy * step < H + step; gy++) {
        for (let gx = 0; gx * step < W + step; gx++) {
          const cx = gx * step + (gy % 2) * step / 2 + (r() - 0.5) * 50, cy = gy * step + (r() - 0.5) * 50;
          x.save(); x.globalAlpha = 0.24;
          drawMotif(x, motif, cx, cy, 60 + r() * 40, tint);
          x.restore();
        }
      }
    },
  };
  const isLight = (material) => !!LIGHT[material];

  function makeBackground(material, tint, motif, accent) {
    if (isLight(material)) {
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const x = c.getContext('2d');
      LIGHT[material](x, rng(7), motif, accent);
      const v = x.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.95);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(60,40,20,.18)');
      x.fillStyle = v;
      x.fillRect(0, 0, W, H);
      return c;
    }
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
    ctx.strokeStyle = THEME.sealGold;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, r - 16, 0, Math.PI * 2);
    ctx.stroke();
    fitText(ctx, String(GAME.puzzles), 0, -r * 0.04, r * 1.2, r * 0.82, 900, HEAD, THEME.sealInk);
    fitText(ctx, 'PUZZLES', 0, r * 0.26, r * 1.4, r * 0.25, 800, HEAD, THEME.sealGold, 3);
    fitText(ctx, '+ HOST KIT', 0, r * 0.52, r * 1.3, r * 0.17, 800, HEAD, THEME.sealInk, 2);
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
    box(ctx, 0, 56, W, 96, 0, THEME.accent);
    const kicker = ['A SLITHERLINK ESCAPE GAME', GAME.audience.toUpperCase()].filter(Boolean).join('  ·  ');
    fitText(ctx, kicker, W / 2, 122, W - 160, 50, 800, HEAD, THEME.accentInk, 4);
    ctx.save();
    ctx.shadowColor = THEME.textShadow;
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
      fitText(ctx, (A.puzzleLabels && A.puzzleLabels[i]) || `PUZZLE ${i + 1}`, cx, cy - shown / 2 - 18, 400, 40, 800, HEAD, THEME.ink, 3);
      drawPage(ctx, img, cx, cy, shown * img.width / img.height, 0);
    });
  }

  function drawMessage(ctx, A) {
    ctx.drawImage(A.bg, 0, 0, W, H);
    drawMotif(ctx, THEME.motif, W / 2, 400, 380, THEME.gold);
    ctx.save();
    ctx.shadowColor = THEME.textShadow;
    ctx.shadowBlur = 16;
    fitText(ctx, 'INSTANT DOWNLOAD', W / 2, 760, W - 240, 150, 900, HEAD, THEME.ink, 2);
    ctx.restore();
    fitText(ctx, `${GAME.pageCount}-PAGE PDF  ·  ${GAME.paper}`, W / 2, 880, W - 300, 64, 800, HEAD, THEME.gold, 3);
    fitText(ctx, 'No physical item will be shipped', W / 2, 970, W - 300, 58, 400, SC, THEME.ink);
    const steps = ['BUY', 'DOWNLOAD', 'PRINT', 'PLAY'];
    const w = 390, gap = 36, left = (W - steps.length * w - (steps.length - 1) * gap) / 2;
    steps.forEach((s, i) => {
      const x = left + i * (w + gap);
      box(ctx, x, 1120, w, 200, 14, THEME.accent);
      fitText(ctx, String(i + 1), x + w / 2, 1200, w, 64, 900, HEAD, THEME.sealGold);
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
      ...(GAME.hasPictures ? ['Picture pieces and boards'] : []),
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
      if (!recText(ctx, { text: item, x: 200, y, w: ctx.measureText(item).width, size: 52, weight: 800, family: HEAD, fill: THEME.ink, align: 'left' })) ctx.fillText(item, 200, y);
    });
    const P = A.images;
    [
      { img: P.puzzles[0] || P.howTo, x: 1190, y: 620, w: 500, rot: -5 },
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
    const types = GAME.chapterTypes || [];
    heading(ctx, A, GAME.hasPictures ? (GAME.hasLetters ? 'LETTERS AND PICTURES BUILD THE CODE' : 'THE PICTURES NAME THE SECRET CODE') : 'LETTERS BUILD THE SECRET CODE');
    const words = exampleWords(Math.min(GAME.chapters, 3));
    const rowH = 240, top = words.length === 2 ? 380 : 270;
    words.forEach((word, i) => {
      const y = top + i * rowH;
      fitText(ctx, types[i] === 'picture' ? `CHAPTER ${i + 1}: NAME THE PICTURE` : `CHAPTER ${i + 1} SPELLS A WORD`, W / 2, y, W - 300, 46, 800, HEAD, THEME.gold, 3);
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
      if (!recText(ctx, { text: t, x: xs[0] + 170, y, w: ctx.measureText(t).width, size: 54, weight: 400, family: SC, fill: THEME.pencil, align: 'left' })) ctx.fillText(t, xs[0] + 170, y);
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
    heading(ctx, A, 'FROM CODE SHEET TO FINAL LOCK', GAME.hasPictures && !GAME.hasLetters ? 'Players note every picture, then face the last door' : 'Players track every letter, then face the last door');
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
      const fs2 = fittedSize(ctx, t, 640, 56, 800, HEAD);
      setFont(ctx, 800, fs2, HEAD);
      if (!recText(ctx, { text: t, x: cx - 300, y, w: ctx.measureText(t).width, size: fs2, weight: 800, family: HEAD, fill: THEME.ink, align: 'left' })) ctx.fillText(t, cx - 300, y);
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
    ctx.shadowColor = THEME.textShadow;
    ctx.shadowBlur = 16;
    fitText(ctx, 'PERFECT FOR', W / 2, 570, W - 240, 130, 900, HEAD, THEME.ink, 2);
    ctx.restore();
    const key = /kid/i.test(GAME.audience) ? 'kids' : /adult/i.test(GAME.audience) ? 'adults' : 'teens';
    const w = 800, h = 280, gap = 50, left = (W - 2 * w - gap) / 2;
    OCCASIONS[key].forEach((t, i) => {
      const x = left + (i % 2) * (w + gap), y = 680 + (i >> 1) * (h + gap);
      box(ctx, x, y, w, h, 16, THEME.accent);
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
      box(ctx, x, y, w, h, 16, THEME.paper, true);
      fitText(ctx, value, x + w / 2, y + 280, w - 80, 190, 900, HEAD, THEME.loop);
      fitText(ctx, label, x + w / 2, y + 400, w - 80, 60, 800, HEAD, THEME.pencil, 3);
    });
  }

  function drawBoard(ctx, cx, cy, size, glued = 3, pop = 1) {
    const n = 3, c = size / n, x0 = cx - size / 2, y0 = cy - size / 2;
    ctx.fillStyle = THEME.paper;
    ctx.strokeStyle = THEME.paperEdge;
    ctx.lineWidth = 4;
    roundRect(ctx, x0 - 14, y0 - 14, size + 28, size + 28, 10);
    ctx.fill();
    ctx.stroke();
    [0, 1, 4, 3, 7].slice(0, glued).forEach((k, i) => {
      const last = i === glued - 1, a = last ? clamp01(pop) : 1;
      if (a <= 0) return;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = THEME.shade;
      const px = x0 + (k % n) * c, py = y0 + Math.floor(k / n) * c, k2 = last ? 0.6 + 0.4 * a : 1;
      ctx.translate(px + c / 2, py + c / 2);
      ctx.scale(k2, k2);
      ctx.fillRect(-c / 2 + 4, -c / 2 + 4, c - 8, c - 8);
      ctx.restore();
    });
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = THEME.paperEdge;
    ctx.lineWidth = 2;
    for (let i = 0; i <= n; i++) {
      ctx.beginPath(); ctx.moveTo(x0 + i * c, y0); ctx.lineTo(x0 + i * c, y0 + size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0, y0 + i * c); ctx.lineTo(x0 + size, y0 + i * c); ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  function drawHowItWorks(ctx, A) {
    ctx.drawImage(A.bg, 0, 0, W, H);
    const p = A.puzzle;
    const pictureOnly = GAME.hasPictures && !GAME.hasLetters;
    fitText(ctx, pictureOnly ? 'EVERY PUZZLE IS A PICTURE PIECE' : 'EVERY PUZZLE HIDES A LETTER', W / 2, 140, W - 140, 104, 900, HEAD, THEME.ink, 1);
    const cell = 80, gridW = p.W * cell, top = 480;
    const cols = [340, 1000, 1660];
    const labels = ['1. SOLVE THE NUMBERS', '2. CLOSE THE LOOP', pictureOnly ? '3. BUILD THE PICTURE' : '3. CRACK THE CODE'];
    labels.forEach((l, i) => fitText(ctx, l, cols[i], 370, 590, 52, 800, HEAD, THEME.gold, 2));
    drawPuzzle(ctx, p, A.loop, cols[0] - gridW / 2, top, cell, { loop: 0, shade: 0 });
    drawPuzzle(ctx, p, A.loop, cols[1] - gridW / 2, top, cell, { loop: 1, shade: 1 });
    if (pictureOnly) {
      drawBoard(ctx, cols[2], 690, 300);
      fitText(ctx, 'Each shaded piece is glued', cols[2], 920, 560, 50, 400, SC, THEME.ink);
      fitText(ctx, 'on the board. Name the picture', cols[2], 990, 560, 50, 400, SC, THEME.ink);
      fitText(ctx, 'to open the last lock!', cols[2], 1060, 560, 50, 400, SC, THEME.ink);
    } else {
      drawLetterBoxes(ctx, cols[2], 680, 92, 5, 2, p.letter, 1);
      fitText(ctx, 'Each letter fills a box.', cols[2], 880, 560, 50, 400, SC, THEME.ink);
      fitText(ctx, 'The final code', cols[2], 950, 560, 50, 400, SC, THEME.ink);
      fitText(ctx, 'opens the last lock!', cols[2], 1020, 560, 50, 400, SC, THEME.ink);
    }
    if (GAME.hasPictures && GAME.hasLetters) fitText(ctx, 'Picture chapters: the solved puzzles are pieces of one big picture, and its name is the word.', W / 2, 1300, W - 200, 44, 400, SC, THEME.ink);
    fitText(ctx, 'Example puzzle shown. Your game has its own puzzles and its own code.', W / 2, 1420, W - 200, 46, 400, SC, THEME.gold);
  }

  // Second video scene: the loop draws itself, the letter appears and drops into the code.
  function drawReveal(ctx, A, t) {
    ctx.drawImage(A.bg, 0, 0, W, H);
    const p = A.puzzle;
    const pictureOnly = GAME.hasPictures && !GAME.hasLetters;
    fitText(ctx, pictureOnly ? 'EVERY PUZZLE IS A PICTURE PIECE' : 'EVERY PUZZLE HIDES A LETTER', W / 2, 150, W - 140, 104, 900, HEAD, THEME.ink, 1);
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
    fitText(ctx, pictureOnly ? 'Shade it and cut it out!' : 'Shade it. A letter appears!', cx, 640, textW, 66, 800, HEAD, THEME.gold);
    ctx.globalAlpha = c3;
    fitText(ctx, pictureOnly ? 'Name the picture to open the lock' : 'Letters unlock the final code', cx, 1080, textW, 60, 800, HEAD, THEME.ink);
    ctx.restore();
    if (pictureOnly) drawBoard(ctx, cx, 870, 260, 3, easeOut(span(t, 3.0, 3.4)));
    else drawLetterBoxes(ctx, cx, 810, 130, 5, 2, p.letter, easeOut(span(t, 3.0, 3.4)));
  }

  function drawEndCard(ctx, A) {
    ctx.drawImage(A.bg, 0, 0, W, H);
    drawPage(ctx, A.images.cover, 560, 830, 760, -2);
    const cx = 1420;
    fitText(ctx, `${GAME.puzzles} PUZZLES`, cx, 560, 860, 120, 900, HEAD, THEME.ink, 1);
    fitText(ctx, 'ONE SECRET CODE', cx, 680, 860, 84, 900, HEAD, THEME.gold, 1);
    if (GAME.audience) fitText(ctx, GAME.audience.toUpperCase(), cx, 820, 860, 66, 800, HEAD, THEME.ink, 2);
    if (GAME.minutes) fitText(ctx, `${GAME.minutes} MINUTES`, cx, 905, 860, 62, 800, HEAD, THEME.ink, 2);
    if (GAME.players) fitText(ctx, GAME.players, cx, 985, 860, 56, 800, HEAD, THEME.ink, 2);
    ctx.fillStyle = THEME.accent;
    roundRect(ctx, cx - 370, 1050, 740, 130, 14);
    ctx.fill();
    fitText(ctx, 'INSTANT DOWNLOAD', cx, 1135, 660, 66, 900, HEAD, THEME.accentInk, 2);
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

  // Up to six puzzle pages for the listing: letter puzzles first, then Mosaic piece pages.
  function gridPages(game) {
    return game.pages.filter((x) => x.kind === 'puzzle').concat(game.pages.filter((x) => x.kind === 'pieces')).slice(0, 6);
  }

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
    THEME = { ...BASE_COLORS, ...visual, textShadow: 'rgba(0,0,0,.7)' };
    // The puzzle seal is always light-on-red, whatever the background.
    THEME.sealInk = THEME.ink; THEME.sealGold = THEME.gold;
    if (isLight(visual.material)) Object.assign(THEME, { ink: '#2b1d12', gold: visual.accent, textShadow: 'rgba(255,255,255,0)' });
    USED_PAGES = [];
    const first = (kind) => {
      const p = game.pages.find((x) => x.kind === kind);
      return p ? pageImage(p) : null;
    };
    const [cover, howTo, codeSheet, finalLock, certificate, prologue, hostGuide, puzzles] = await Promise.all([
      first('cover'), first('howTo'), first('codeSheet'), first('finalLock'), first('certificate'), first('prologue'),
      hostGuideTop(game),
      Promise.all(gridPages(game).map(pageImage)),
    ]);
    const puzzleLabels = gridPages(game).map((p, i) => (p.kind === 'pieces' ? 'PICTURE PIECES' : `PUZZLE ${i + 1}`));
    const layer = document.createElement('canvas');
    layer.width = W; layer.height = H;
    const probe = document.createElement('canvas').getContext('2d');
    return {
      images: { cover, howTo, codeSheet, finalLock, certificate, prologue, hostGuide, puzzles },
      puzzleLabels,
      usedPages: USED_PAGES,
      puzzle, loop: traceLoop(puzzle),
      bg: makeBackground(visual.material, visual.tint, THEME.motif, visual.accent),
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

  const imageNames = () => Object.keys(IMAGES);

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
  async function encodeWith(A, config, onProgress, spec = VIDEO) {
    const { fps, seconds, width, height } = spec;
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
        if (spec.draw) spec.draw(ctx, A, i / fps);
        else { ctx.scale(width / W, height / H); drawVideoFrame(ctx, A, i / fps); }
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

  async function encodeVideo(A, onProgress, spec = VIDEO) {
    if (!('VideoEncoder' in window)) throw new Error('This browser cannot make videos (no WebCodecs). Please use a recent Chrome or Edge.');
    const { fps, width, height } = spec;
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
        return await encodeWith(A, config, onProgress, spec);
      } catch (e) {
        if (!(e instanceof EncoderStalled)) throw e;
        // This encoder stopped answering: start over with the next one.
      }
    }
    throw new Error('The video encoder in this browser stopped responding. Please update Chrome or Edge, or turn off the video and make the images only.');
  }

  // Platform kits --------------------------------------------------------------------------------
  // Every platform gets its own image sizes and ready-to-paste listing text, built from the same
  // scenes as the Etsy images. Text never contains the secret code.

  const newCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const canvasBlob = (c, type = 'image/jpeg', q = 0.9) => new Promise((res) => c.toBlob(res, type, q));
  const pictureOnly = () => GAME.hasPictures && !GAME.hasLetters;
  const ageKey = () => (/kid/i.test(GAME.audience) ? 'kids' : /adult/i.test(GAME.audience) ? 'adults' : 'teens');
  const themeName = () => { const t = THEME.id && root.Themes && root.Themes.theme(THEME.id); return t ? t.label : ''; };
  const GRADES = { kids: 'Grades 5-7', teens: 'Grades 8-12', adults: 'Grades 11-12 and Adults' };
  const AGE_WORDS = { kids: 'Kids', teens: 'Teens', adults: 'Adults' };
  // Cuts at a word boundary and drops a dangling separator.
  const clip = (s, n) => (s.length <= n ? s : s.slice(0, n + 1).replace(/\s+\S*$/, '').replace(/[\s|,·:–-]+$/, ''));

  // Text in a band above or below a scene: up to two centred lines, shrunk to fit.
  function bandText(ctx, text, cx, y0, bandH, maxW, fill, weight, family, maxPx) {
    if (!text || bandH < 20) return;
    let px = Math.min(maxPx, bandH * 0.42);
    setFont(ctx, weight, px, family);
    let lines = wrapLines(ctx, text, maxW);
    while ((lines.length > 2 || (lines.length === 2 && px * 2.3 > bandH)) && px > 18) {
      px -= 2;
      setFont(ctx, weight, px, family);
      lines = wrapLines(ctx, text, maxW);
    }
    const lh = px * 1.15, total = lines.length * lh;
    if (recText(ctx, { text, x: cx, y: y0 + (bandH - total) / 2 + px * 0.85, w: lines.length === 1 ? ctx.measureText(lines[0]).width : maxW, size: px, weight, family, fill, align: 'center', lines: Math.min(2, lines.length), lineH: lh })) return;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = fill;
    lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, cx, y0 + (bandH - total) / 2 + px * 0.85 + i * lh));
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }

  // A 2000x1600 scene placed on the theme background at another size, with a headline band above and
  // a short line below. Wide formats (Amazon A+) get the scene alone.
  function framed(A, scene, w, h, top, bottom, sceneText) {
    const c = newCanvas(w, h), x = c.getContext('2d');
    const s = Math.max(w / W, h / H);
    x.drawImage(A.bg, (w - W * s) / 2, (h - H * s) / 2, W * s, H * s);
    const pad = Math.round(Math.min(w, h) * 0.045);
    const bands = (top ? 1 : 0) + (bottom ? 1 : 0);
    let sw = w - pad * 2, sh = sw * H / W;
    const minBand = h * 0.085;
    if (h - sh - pad * 2 < bands * minBand) { sh = h - pad * 2 - bands * minBand; sw = sh * W / H; }
    const free = Math.max(0, h - sh - pad * 2);
    // No headline: the scene sits in the middle, with the short line in the space below it.
    const topH = top ? (bottom ? free * 0.6 : free) : (bottom ? free * 0.4 : free / 2);
    const botH = bottom ? free - topH : 0;
    const sx = (w - sw) / 2, sy = pad + topH, r = pad * 0.35;
    if (REC && sceneText) {
      REC.push({ type: 'image', data: scene.toDataURL('image/jpeg', 0.88), x: sx, y: sy, w: sw, h: sh, r, alpha: 1 });
      REC.push({ type: 'shape', x: sx, y: sy, w: sw, h: sh, r, fill: null, stroke: THEME.gold, line: Math.max(2, pad * 0.07), alpha: 1 });
      const k = sw / W;
      sceneText.forEach((e) => REC.push(e.type === 'text'
        ? { ...e, x: sx + e.x * k, y: sy + e.y * k, w: e.w * k, size: e.size * k, lineH: e.lineH * k, spacing: e.spacing * k }
        : { ...e, x: sx + e.x * k, y: sy + e.y * k, w: e.w * k, h: e.h * k, r: e.r * k }));
    } else {
      x.save();
      x.shadowColor = 'rgba(0,0,0,.45)';
      x.shadowBlur = pad * 0.6;
      x.shadowOffsetY = pad * 0.2;
      roundRect(x, sx, sy, sw, sh, r);
      x.fillStyle = '#000';
      x.fill();
      x.restore();
      x.save();
      roundRect(x, sx, sy, sw, sh, r);
      x.clip();
      x.drawImage(scene, sx, sy, sw, sh);
      x.restore();
      x.strokeStyle = THEME.gold;
      x.lineWidth = Math.max(2, pad * 0.07);
      roundRect(x, sx, sy, sw, sh, r);
      x.stroke();
    }
    x.save();
    x.shadowColor = THEME.textShadow;
    x.shadowBlur = 12;
    bandText(x, top, w / 2, pad * 0.5, topH + pad * 0.3, w - pad * 2, THEME.ink, 900, HEAD, w * 0.075);
    x.restore();
    bandText(x, bottom, w / 2, sy + sh + pad * 0.2, botH + pad * 0.6, w - pad * 2, THEME.gold, 400, SC, w * 0.05);
    return c;
  }

  function frameOf(A, name, w, h, top, bottom) {
    const scene = renderImage(name, A);
    const c = framed(A, scene, w, h, top, bottom);
    scene.width = scene.height = 0;
    return c;
  }

  // Which scenes each platform uses, at which size, with which words.
  function imageSpecs(platform) {
    const t = GAME.title, a = GAME.audience, p = GAME.puzzles, age = ageKey();
    const how = pictureOnly() ? 'SOLVE · SHADE · BUILD THE PICTURE' : 'SOLVE · SHADE · CRACK THE CODE';
    const forWho = { kids: 'A CLASSROOM & PARTY ESCAPE GAME', teens: 'FOR CLASSROOMS, PARTIES & GAME NIGHTS', adults: 'FOR GAME NIGHTS & TEAM BUILDING' }[age];
    switch (platform) {
      case 'pinterest': return { size: [1000, 1500], prefix: 'pin', list: [
        ['01-hero', 'PRINTABLE ESCAPE ROOM GAME', `${a} · ${p} puzzles · Instant download`],
        ['04-how-it-works', how, t],
        ['02-included', 'EVERYTHING YOU NEED TO HOST', `${GAME.pageCount}-page printable PDF`],
        ['13-occasions', forWho, t],
        ['14-at-a-glance', `${GAME.minutes} MINUTES OF PUZZLE FUN`, 'Print at home · Instant download'],
      ] };
      case 'instagram': return { size: [1080, 1350], prefix: 'slide', list: [
        ['01-hero', t, 'Swipe to look inside'],
        ['03-story', null, '2 / 8'], ['04-how-it-works', null, '3 / 8'], ['05-secret-code', null, '4 / 8'],
        ['06-earn-hints', null, '5 / 8'], ['02-included', null, '6 / 8'], ['14-at-a-glance', null, '7 / 8'],
        ['15-instant-download', null, 'Link in bio'],
      ] };
      case 'shopify': return { size: [2048, 2048], prefix: 'product', list: [
        ['01-hero', t, 'Printable escape game · Instant download'],
        ['02-included', 'WHAT YOU GET', `${GAME.pageCount}-page printable PDF`],
        ['04-how-it-works', 'HOW IT WORKS', 'No apps, no prep: print and play'],
        ['08-puzzle-grid', `${p} LOGIC PUZZLES`, 'Every puzzle has exactly one solution'],
        ['06-earn-hints', 'HINTS THAT KEEP IT FAIR', 'Two hints for every puzzle'],
        ['12-certificate', 'A CERTIFICATE FOR THE WINNERS', 'Name, date, time and hints'],
        ['14-at-a-glance', 'AT A GLANCE', a],
        ['15-instant-download', 'INSTANT DOWNLOAD', 'Buy · Download · Print · Play'],
      ] };
      case 'tpt': return { size: [1500, 1500], prefix: 'thumbnail', list: [
        ['01-hero', 'PRINTABLE ESCAPE ROOM', `${GRADES[age]} · ${p} logic puzzles`],
        ['04-how-it-works', 'LOGIC + READING + TEAMWORK', 'No prep: print and play'],
        ['02-included', "WHAT'S INCLUDED", `${GAME.pageCount} pages · answer key included`],
        ['14-at-a-glance', 'AT A GLANCE', t],
      ] };
      case 'kdp': return { size: [970, 600], prefix: 'a-plus', list: [
        ['04-how-it-works', null, null], ['02-included', null, null], ['14-at-a-glance', null, null],
      ] };
      default: return null;
    }
  }

  // Listing text ---------------------------------------------------------------------------------

  function includedList() {
    return [
      `${GAME.puzzles} Slitherlink logic puzzles${GAME.hasPictures ? ' (picture chapters included)' : ''}`,
      'Story and mission pages',
      'How to Play page with a worked example',
      'Code Sheet and Final Lock',
      ...(GAME.hasPictures ? ['Picture pieces with an Assembly Board'] : []),
      'Step-by-step Game Host guide',
      '20 hint questions about the story and theme',
      `${GAME.puzzles * 2} cut-out hint cards`,
      'Full answer key',
      'Certificate of completion',
    ];
  }

  function howItWorks() {
    return pictureOnly()
      ? ['Solve each logic puzzle by drawing one closed loop.', 'Shade the inside: it is a piece of a picture.', 'Glue the pieces on the board and name the picture.', 'Say the name at the Final Lock to escape!']
      : ['Solve each logic puzzle by drawing one closed loop.', 'Shade the inside: a capital letter appears.', 'Collect the letters on the Code Sheet.', 'Say the secret code at the Final Lock to escape!'];
  }

  function details() {
    return [
      `Players: ${GAME.audience}`,
      GAME.minutes ? `Playing time: about ${GAME.minutes} minutes` : '',
      GAME.players ? `Group size: ${GAME.players.toLowerCase()}` : '',
      `Format: ${GAME.pageCount}-page PDF, ${{ "US LETTER": "US Letter", "READY TO PRINT": "print-ready" }[GAME.paper] || GAME.paper}`,
    ].filter(Boolean);
  }

  function themeTags() {
    const th = themeName().toLowerCase().replace(/&/g, 'and');
    const tags = { christmas: ['christmas game', 'xmas party game'], halloween: ['halloween game', 'spooky party game'], easter: ['easter game', 'easter activity'],
      valentine: ['valentines game', 'valentine activity'], thanksgiving: ['thanksgiving game', 'fall party game'], newyear: ['new years eve game', 'nye party game'],
      pirates: ['pirate party game', 'treasure hunt game'], egypt: ['ancient egypt game', 'egypt activity'], space: ['space party game', 'outer space game'],
      jungle: ['jungle party game', 'safari game'], ocean: ['under the sea game', 'ocean party game'], dinosaurs: ['dinosaur party game', 'dino activity'],
      school: ['back to school game', 'classroom game'], lab: ['science party game', 'stem activity'], museum: ['museum heist game', 'mystery game'],
      detective: ['detective game', 'mystery party game'], castle: ['medieval party game', 'knight party game'], wizard: ['wizard party game', 'magic party game'] };
    return (tags[THEME.id] || [th ? `${th} game` : 'mystery game']).slice();
  }

  // Short, natural words for each theme in titles, tags and hashtags ("Pirates & Treasure" -> "Pirate").
  const THEME_WORD = {
    christmas: 'Christmas', halloween: 'Halloween', easter: 'Easter', valentine: "Valentine's", thanksgiving: 'Thanksgiving',
    newyear: "New Year's Eve", pirates: 'Pirate', egypt: 'Ancient Egypt', space: 'Space', jungle: 'Jungle', ocean: 'Under the Sea',
    dinosaurs: 'Dinosaur', school: 'School', lab: 'Science', museum: 'Museum Heist', detective: 'Detective', castle: 'Medieval', wizard: 'Wizard',
  };
  const themeWord = () => THEME_WORD[THEME.id] || '';
  // "Pirate Party Game", "Classroom Escape Game" (school), "Mystery Party Game" (no theme).
  const themeGame = () => (THEME.id === 'school' ? 'Classroom Escape Game' : `${themeWord() || 'Mystery'} Party Game`);
  const plainAudience = () => GAME.audience.toLowerCase().replace('–', '-');
  const minutesNum = () => parseInt(String(GAME.minutes || '').split(/[–-]/)[1] || GAME.minutes || '60', 10);

  function etsyText() {
    const age = ageKey();
    // Etsy search weighs the start of a title: the words buyers type come first, the game's own name after.
    const title = clip([`Printable Escape Room Game for ${AGE_WORDS[age]}`, themeGame(), GAME.title, `${GAME.puzzles} Logic Puzzles`, 'Instant Download'].join(', '), 140);
    const ageTags = { kids: ['kids escape room', 'kids party game', 'classroom activity'], teens: ['teen escape room', 'teen party game', 'classroom activity'],
      adults: ['adult escape room', 'adult party game', 'team building game'] }[age];
    const tags = [...new Set(['escape room game', 'printable escape', 'escape room kit', 'logic puzzle game', ...themeTags(), ...ageTags,
      'family game night', 'puzzle hunt', 'instant download', 'printable game'].map((x) => x.slice(0, 20).trim()))].slice(0, 13);
    const desc = [
      // The first lines show in search previews: say what it is before the story.
      `Printable escape room game for ${plainAudience()}: solve ${GAME.puzzles} logic puzzles, ${pictureOnly() ? 'build the hidden picture' : 'collect the letters'} and crack the secret code. Print at home and play today.`,
      '',
      GAME.tagline ? `"${GAME.tagline}"` : '',
      GAME.mission || '',
      '',
      'HOW IT WORKS',
      ...howItWorks().map((x, i) => `${i + 1}. ${x}`),
      '',
      "WHAT'S INCLUDED",
      ...includedList().map((x) => `• ${x}`),
      '',
      'DETAILS',
      ...details().map((x) => `• ${x}`),
      '• Every puzzle is checked by computer: exactly one solution, no guessing',
      '• Prints on US Letter; for A4, choose "Fit to page" in the print settings',
      '',
      'This is a digital download. No physical item will be shipped.',
      'For personal use. Please do not share or resell the files.',
    ].filter((x, i, a) => !(x === '' && a[i - 1] === '')).join('\n');
    return [`TITLE (${title.length}/140)`, title, '', `TAGS (${tags.length}/13, each up to 20 characters)`, tags.join(', '), '', 'DESCRIPTION', desc].join('\n');
  }

  function pinterestText() {
    const t = GAME.title, tw = themeWord();
    const steps = pictureOnly() ? 'Solve the logic puzzles, shade the pieces and build the hidden picture.' : 'Solve the logic puzzles, shade the letters and crack the secret code.';
    const base = `Printable escape room game for ${plainAudience()}: ${GAME.puzzles} logic puzzles, a story to solve, hint cards and a host guide. Print at home and play${GAME.minutes ? ` in about ${GAME.minutes} minutes` : ''}.`;
    const pins = [
      [`${t}: Printable Escape Room Game for ${AGE_WORDS[ageKey()]}`, `${base} Instant download PDF.`],
      [`How a Printable Escape Room Works${tw ? ` (${tw} Theme)` : ''}`, `${steps} ${base}`],
      ['Everything You Need to Host an Escape Room Party', `Story pages, Code Sheet, hint cards, answer key and a certificate. ${base}`],
      [`${themeGame()} Idea for ${AGE_WORDS[ageKey()]}`, `A no-prep ${tw ? tw.toLowerCase() + ' ' : ''}activity for parties, classrooms and game nights. ${base}`],
      [`Printable Escape Room: ${GAME.minutes || '60'} Minutes of Puzzle Fun`, `Teams race to escape. ${base}`],
    ];
    return pins.map(([title, desc], i) => `PIN ${i + 1} (pin-${i + 1}.jpg)\nTitle (${clip(title, 100).length}/100): ${clip(title, 100)}\nDescription: ${clip(desc, 500)}`).join('\n\n')
      + `\n\nBoard ideas: Escape Room Games · Party Games${tw ? ` · ${tw} Party Ideas` : ''} · Printable Activities`
      + '\nLink each pin to your listing (Etsy, Shopify or TpT page).';
  }

  function instagramText() {
    const tw = themeWord().toLowerCase().replace(/[^a-z]/g, '');
    // Instagram favours a few relevant hashtags over long lists: five to use, more to rotate.
    const main = ['#escaperoom', '#printableescaperoom', THEME.id === 'school' ? '#classroomgames' : tw ? `#${tw}party` : '#partygame', { kids: '#kidsactivities', teens: '#teenparty', adults: '#gamenight' }[ageKey()], '#puzzlegame'];
    const spare = ['#escapegame', '#logicpuzzle', '#partyideas', '#familygamenight', '#printables', '#classroomgames', '#puzzlehunt', '#escaperoomathome'].filter((t) => !main.includes(t));
    const caption = [
      `${GAME.title} 🔐`,
      GAME.tagline || '',
      '',
      `A printable escape room for ${plainAudience()}: ${GAME.puzzles} logic puzzles, one secret code${GAME.minutes ? `, about ${GAME.minutes} minutes of play` : ''}.`,
      'Print it, gather your team and race to the Final Lock.',
      '',
      'Swipe to look inside 👉',
      'Instant download: link in bio.',
    ].join('\n');
    const reels = [
      ['reel-teaser.mp4 (11 s)', `${hook().charAt(0) + hook().slice(1).toLowerCase()} 🔐 A printable escape room with ${GAME.puzzles} logic puzzles. Link in bio.`],
      ['reel-flip-through.mp4 (12 s)', `Take a look inside ${GAME.title} 👀 Story, puzzles, Code Sheet and a certificate for the winners. Instant download: link in bio.`],
      ['reel-how-it-works.mp4 (15 s)', `How a paper escape room works: solve, shade, ${pictureOnly() ? 'build the picture' : 'crack the code'}. ${GAME.audience}${GAME.minutes ? `, about ${GAME.minutes} minutes` : ''}. Link in bio.`],
    ];
    return ['CAROUSEL CAPTION', caption, '', 'HASHTAGS (use these 5)', main.join(' '), '', 'MORE TO ROTATE ON OTHER POSTS', spare.join(' '), '',
      'REELS (1080x1920, also for TikTok and YouTube Shorts)', ...reels.map(([file, cap]) => `• ${file}\n  Caption: ${cap}\n  Hashtags: ${main.slice(0, 3).join(' ')}`), '',
      'TIPS',
      '• Add a trending sound inside Instagram when you post a reel: the videos have no music on purpose.',
      '• Choose reel-cover.jpg as the cover so your profile grid looks tidy.',
      '• Post the three reels on different days, and the carousel (slide-1.jpg to slide-8.jpg, 1080x1350) in between.'].join('\n');
  }

  function shopifyText() {
    const tw = themeWord();
    const title = `${GAME.title} - Printable Escape Room Game`;
    const li = (xs) => `<ul>\n${xs.map((x) => `  <li>${x}</li>`).join('\n')}\n</ul>`;
    const html = [
      `<p><strong>Printable escape room game for ${plainAudience()}.</strong> Solve ${GAME.puzzles} logic puzzles, ${pictureOnly() ? 'build the hidden picture' : 'collect the letters'} and crack the secret code. Print at home and play today.</p>`,
      GAME.tagline ? `<p><em>${GAME.tagline}</em></p>` : '',
      GAME.mission ? `<p>${GAME.mission}</p>` : '',
      '<h3>How it works</h3>', `<ol>\n${howItWorks().map((x) => `  <li>${x}</li>`).join('\n')}\n</ol>`,
      "<h3>What's included</h3>", li(includedList()),
      '<h3>Details</h3>', li(details()),
      '<p>This is a digital download: no physical item will be shipped. You will get a download link right after checkout.</p>',
    ].filter(Boolean).join('\n');
    const seoTitle = clip(`${GAME.title} | Printable Escape Room Game for ${AGE_WORDS[ageKey()]}`, 70);
    const meta = clip(`Printable escape room for ${plainAudience()}: ${GAME.puzzles} logic puzzles, a story, hints and a host guide. Print at home. Instant download.`, 160);
    return ['PRODUCT TITLE', title, '', 'PRODUCT TYPE', 'Printable game (digital download)', '', 'TAGS',
      ['escape room', 'printable game', 'party game', 'logic puzzles', 'instant download', tw && tw.toLowerCase(), AGE_WORDS[ageKey()].toLowerCase()].filter(Boolean).join(', '),
      '', `SEO TITLE (${seoTitle.length}/70)`, seoTitle, '', `META DESCRIPTION (${meta.length}/160)`, meta, '',
      'SHIPPING', 'Untick "This is a physical product" and attach the PDF with a digital downloads app.', '',
      'DESCRIPTION (paste in the HTML view)', html].join('\n');
  }

  function tptText() {
    const age = ageKey(), tw = themeWord();
    const title = clip(`${tw ? tw + ' ' : ''}Escape Room: ${GAME.title} | Logic Puzzles ${GRADES[age].replace('Grades ', 'Gr. ')}`, 80);
    const long = minutesNum() > 60;
    const holiday = ['christmas', 'halloween', 'easter', 'valentine', 'thanksgiving', 'newyear'].includes(THEME.id);
    const desc = [
      `Engage your students with a no-prep printable escape room! ${GAME.title} turns logic puzzles into a story-driven challenge for ${GRADES[age].toLowerCase()}.`,
      '',
      'WHY TEACHERS LOVE IT',
      '• No prep: print and play',
      '• Builds logical reasoning, perseverance and teamwork',
      '• Hint questions check reading comprehension of the story',
      '• Works for small groups, whole class or competing teams',
      long
        ? `• About ${GAME.minutes} minutes: plan one long lesson or two class periods. Great for end-of-term days, clubs, sub plans${holiday ? ' and the days before a holiday' : ''}`
        : `• About ${GAME.minutes || '45'} minutes: fits one lesson. Great for review days, clubs, sub plans${holiday ? ' and the days before a holiday' : ''}`,
      '',
      'HOW IT WORKS',
      ...howItWorks().map((x, i) => `${i + 1}. ${x}`),
      '',
      "WHAT'S INCLUDED",
      ...includedList().map((x) => `• ${x}`),
      '',
      'Please see the PREVIEW file for sample pages.',
    ].join('\n');
    const subjects = ['Critical Thinking', 'Math', 'Reading'].concat(holiday ? ['Holidays/Seasonal'] : []);
    return [`TITLE (${title.length}/80)`, title, '', 'GRADE LEVELS', GRADES[age], '', 'SUBJECTS (pick from TpT\'s list)', subjects.join(', '),
      '', 'RESOURCE TYPE', 'Games, Activities, Printables', '', 'DESCRIPTION', desc, '',
      'FILES', 'thumbnail-1.jpg to thumbnail-4.jpg (square, 1500x1500). preview.pdf: sample pages marked PREVIEW (no answers).'].join('\n');
  }

  function kdpText() {
    const age = ageKey(), tw = themeWord();
    const audienceLong = { kids: 'Kids Ages 11-13', teens: 'Teens Ages 14-17', adults: 'Adults' }[age];
    const subtitle = `An Escape Room Puzzle Book for ${audienceLong}: ${GAME.puzzles} Slitherlink Logic Puzzles, One Secret Code`;
    const html = [
      GAME.tagline ? `<p><i>${GAME.tagline}</i></p>` : '',
      `<p><b>${GAME.title}</b> is an escape room in a book. ${GAME.mission || ''}</p>`,
      '<p><b>How it works</b></p>', `<ol>${howItWorks().map((x) => `<li>${x}</li>`).join('')}</ol>`,
      "<p><b>Inside this book</b></p>", `<ul>${includedList().map((x) => `<li>${x}</li>`).join('')}</ul>`,
      `<p>For ${plainAudience()}${GAME.minutes ? `, about ${GAME.minutes} minutes of play` : ''}. Perfect for game nights, parties and classrooms.</p>`,
    ].filter(Boolean).join('\n');
    // The title and subtitle are already searched: the seven boxes add new words instead.
    const who = { kids: 'kids', teens: 'teens', adults: 'adults' }[age];
    const keywords = [
      `logic puzzles for ${who}`,
      tw ? `${tw.toLowerCase().replace("'s", 's')} activity book for ${who}` : `mystery activity book for ${who}`,
      'brain teaser games for groups',
      `puzzle book gift for ${who}`,
      'party game for game night',
      'loop puzzles and codes',
      'classroom team building activity',
    ].map((k) => k.slice(0, 50));
    const cats = age === 'adults'
      ? ['Games & Activities > Puzzles', 'Games & Activities > Logic & Brain Teasers', 'Games & Activities > Group Games']
      : ['Juvenile Nonfiction > Games & Activities > Puzzles', 'Juvenile Nonfiction > Games & Activities > General', 'Games & Activities > Logic & Brain Teasers'];
    const note = /KDP/.test(GAME.paper) ? '' : `\nNOTE: this PDF is ${GAME.paper}. For Amazon, export the KDP 8.5x11 version from the editor and make the kit from that PDF: the cover's spine width depends on its page count.`;
    const thin = GAME.pageCount < 24 ? `\nNOTE: KDP paperbacks need at least 24 pages (this PDF has ${GAME.pageCount}). Use a bundle to reach 24.` : '';
    return ['BOOK TITLE (must match the cover)', GAME.title, '', `SUBTITLE (${subtitle.length + GAME.title.length}/200 with the title)`, subtitle, '',
      'DESCRIPTION (KDP accepts this HTML)', html, '', 'KEYWORDS (7 boxes, up to 50 characters each)', ...keywords.map((k, i) => `${i + 1}. ${k}`), '',
      'SUGGESTED CATEGORIES (choose the closest in KDP)', ...cats.map((c) => `• ${c}`), '',
      'COVER', `cover.pdf: full paperback cover, 8.5x11 trim, white paper, ${GAME.pageCount} pages, bleed included. Leave the lower right of the back cover free: Amazon prints the barcode there.`,
      'A+ CONTENT', 'a-plus-1.jpg to a-plus-3.jpg (970x600).' + note + thin].join('\n');
  }

  const TEXTS = { etsy: etsyText, pinterest: pinterestText, instagram: instagramText, shopify: shopifyText, tpt: tptText, kdp: kdpText };

  // Canva (PPTX) ----------------------------------------------------------------------------------
  // One slide per image: the picture without words, and every word as a text box on top.

  const CANVA_FACE = (family) => (family === SC ? 'IM Fell English SC' : family === ITALIC ? 'IM Fell English' : 'Playfair Display');
  const hex6 = (c) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c.slice(1).toUpperCase() : '3B2412');

  // A picture with its words recorded: [canvas, text boxes].
  function recorded(draw) {
    REC = [];
    try {
      const c = draw();
      return [c, REC];
    } finally {
      REC = null;
    }
  }

  function frameRecorded(A, name, w, h, top, bottom) {
    const [scene, sceneText] = recorded(() => renderImage(name, A));
    const out = recorded(() => framed(A, scene, w, h, top, bottom, sceneText));
    scene.width = scene.height = 0;
    return out;
  }

  async function canvaPptx(platform, A, game, say) {
    if (!root.JSZip) await loadScript('assets/vendor/jszip.min.js');
    if (!root.PptxGenJS) await loadScript('assets/vendor/pptxgen.min.js');
    const spec = imageSpecs(platform);
    const jobs = platform === 'etsy'
      ? imageNames().map((name) => () => recorded(() => renderImage(name, A)))
      : spec.list.map(([scene, top, bottom]) => () => frameRecorded(A, scene, spec.size[0], spec.size[1], top, bottom));
    const [pw, ph] = platform === 'etsy' ? [W, H] : spec.size;
    const inW = 10, inH = 10 * ph / pw, k = inW / pw;
    const pptx = new root.PptxGenJS();
    pptx.defineLayout({ name: 'KIT', width: inW, height: inH });
    pptx.layout = 'KIT';
    pptx.title = `${game.title} - ${platform} listing images`;
    for (const [i, job] of jobs.entries()) {
      say(`Canva file, slide ${i + 1} of ${jobs.length}`);
      const [canvas, words] = job();
      const slide = pptx.addSlide();
      // A picture, not a slide background: Canva's PPTX import drops background images.
      slide.addImage({ data: canvas.toDataURL('image/jpeg', 0.88).replace(/^data:/, ''), x: 0, y: 0, w: inW, h: inH });
      canvas.width = canvas.height = 0;
      words.filter((t) => t.alpha > 0.3).forEach((t) => {
        if (t.type === 'image') {
          slide.addImage({ data: t.data.replace(/^data:/, ''), x: t.x * k, y: t.y * k, w: t.w * k, h: t.h * k, rounding: false });
          return;
        }
        if (t.type === 'shape') {
          const opts = { x: t.x * k, y: t.y * k, w: t.w * k, h: t.h * k,
            // Spelled out as fully transparent: some importers fill a shape that has no fill at all.
            fill: t.fill ? { color: hex6(t.fill) } : { color: 'FFFFFF', transparency: 100 },
            line: t.stroke ? { color: hex6(t.stroke), width: t.line * k * 72 } : { color: 'FFFFFF', transparency: 100, width: 0 } };
          if (t.r) opts.rectRadius = Math.min(t.r, Math.min(t.w, t.h) / 2) * k; // inches
          if (t.shadow) opts.shadow = { type: 'outer', blur: 10, offset: 4, angle: 90, color: '000000', opacity: 0.4 };
          slide.addShape(t.r ? 'roundRect' : 'rect', opts);
          return;
        }
        if (!t.text) return;
        const multi = t.lines > 1;
        // Canva measures fonts a little differently: single lines get room to spare.
        const boxW = multi ? t.w * 1.04 : t.w + Math.max(t.size * 0.8, t.w * 0.25);
        // Kept inside the slide, so Canva never gets a box hanging off the edge.
        const bw = Math.min(boxW, pw);
        const left = Math.max(0, Math.min(pw - bw, t.align === 'center' ? t.x - bw / 2 : t.x));
        const boxH = (multi ? t.lines * t.lineH : t.size * 1.2) + t.size * 0.35;
        slide.addText(t.text, {
          x: left * k, y: Math.max(0, t.y - t.size * 0.92) * k, w: bw * k, h: boxH * k,
          fontFace: CANVA_FACE(t.family), fontSize: Math.max(4, t.size * k * 72), bold: t.family === HEAD && t.weight >= 700,
          italic: t.family === ITALIC, color: hex6(t.fill), align: t.align, valign: 'top', margin: 0, wrap: multi, fit: 'none',
          lineSpacing: multi ? t.lineH * k * 72 : undefined, charSpacing: t.spacing ? t.spacing * k * 72 : undefined,
        });
      });
      await new Promise((r) => setTimeout(r));
    }
    return pptx.write({ outputType: 'blob' });
  }

  // Platform files --------------------------------------------------------------------------------

  const PLATFORMS = [
    ['etsy', 'Etsy'], ['pinterest', 'Pinterest'], ['instagram', 'Instagram'], ['shopify', 'Shopify'], ['tpt', 'Teachers Pay Teachers'], ['kdp', 'Amazon KDP'],
  ];

  async function loadScript(src) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = new URL(src, document.baseURI).href;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Could not load ' + src));
      document.head.appendChild(s);
    });
  }
  async function pdfLib() {
    if (!root.PDFLib) await loadScript('assets/vendor/pdf-lib.min.js');
    return root.PDFLib;
  }

  // TpT preview: the player pages people want to see, each stamped PREVIEW. No host pages, no answers.
  async function tptPreview(game) {
    const { PDFDocument, StandardFonts, rgb, degrees } = await pdfLib();
    const src = await PDFDocument.load(game.bytes);
    const want = ['cover', 'prologue', 'howTo', 'codeSheet'].map((k) => game.pages.find((p) => p.kind === k))
      .concat(game.pages.filter((p) => p.kind === 'puzzle' || p.kind === 'pieces').slice(0, 2))
      .concat([game.pages.find((p) => p.kind === 'certificate')]).filter(Boolean);
    const out = await PDFDocument.create();
    const font = await out.embedFont(StandardFonts.HelveticaBold);
    const pages = await out.copyPages(src, want.map((p) => p.number - 1));
    pages.forEach((pg) => {
      out.addPage(pg);
      const { width, height } = pg.getSize();
      const size = Math.min(width, height) / 6;
      const tw = font.widthOfTextAtSize('PREVIEW', size);
      pg.drawText('PREVIEW', { x: width / 2 - tw / 2 * 0.72, y: height / 2 - tw / 2 * 0.69, size, font, color: rgb(0.6, 0.12, 0.1), opacity: 0.22, rotate: degrees(45) });
      pg.drawText('Preview pages. The full game includes every puzzle, hint cards, the Host Guide and the answer key.',
        { x: 30, y: 12, size: 8, font, color: rgb(0.45, 0.2, 0.1), opacity: 0.9 });
    });
    out.setTitle(`${game.title} - Preview`);
    return new Blob([await out.save()], { type: 'application/pdf' });
  }

  // KDP paperback cover: back cover, spine and front cover on one page with 0.125" bleed, 8.5x11 trim,
  // white paper (0.002252" per page). The front is the game's own cover page; spine text only from 79 pages.
  async function kdpCover(A, game) {
    const DPI = 300, IN = (x) => Math.round(x * DPI);
    const pages = Math.max(game.pageCount, 24);
    const spine = pages * 0.002252, bleed = 0.125;
    const wIn = bleed * 2 + 8.5 * 2 + spine, hIn = 11 + bleed * 2;
    const c = newCanvas(IN(wIn), IN(hIn)), x = c.getContext('2d');
    const s = Math.max(c.width / W, c.height / H);
    x.drawImage(A.bg, (c.width - W * s) / 2, (c.height - H * s) / 2, W * s, H * s);
    // Front: the cover page, stretched over the right panel and its bleed.
    const coverEntry = game.pages.find((p) => p.kind === 'cover');
    const { canvas: front } = await renderPdfPage(coverEntry, DPI);
    const fx = IN(bleed + 8.5 + spine);
    x.drawImage(front, fx, 0, c.width - fx, c.height);
    front.width = front.height = 0;
    // Spine.
    if (pages >= 79) {
      x.save();
      x.translate(IN(bleed + 8.5 + spine / 2), c.height / 2);
      x.rotate(Math.PI / 2);
      fitText(x, GAME.title.toUpperCase(), 0, IN(spine) * 0.3, IN(9), IN(spine) * 0.6, 800, HEAD, THEME.ink, 2);
      x.restore();
    }
    // Back: blurb, what's inside and facts, kept 0.5" inside the trim; the barcode corner stays free.
    const bx = IN(bleed + 0.6), bw = IN(8.5 - 1.2), cx = bx + bw / 2;
    x.save();
    x.shadowColor = THEME.textShadow;
    x.shadowBlur = 14;
    fitText(x, GAME.title.toUpperCase(), cx, IN(bleed + 1.3), bw, IN(0.5), 900, HEAD, THEME.ink, 2);
    x.restore();
    let y = IN(bleed + 1.9);
    if (GAME.tagline) y = drawWrapped(x, `“${GAME.tagline}”`, cx, y, bw, IN(0.26), 400, ITALIC, THEME.gold, 2) + IN(0.25);
    if (GAME.mission) y = drawWrapped(x, GAME.mission, cx, y, bw * 0.92, IN(0.2), 400, ITALIC, THEME.ink, 6) + IN(0.35);
    fitText(x, 'INSIDE THIS BOOK', cx, y, bw, IN(0.24), 800, HEAD, THEME.gold, 3);
    y += IN(0.35);
    x.textAlign = 'left';
    setFont(x, 400, IN(0.19), SC);
    x.fillStyle = THEME.ink;
    includedList().forEach((item) => { x.fillText(`•  ${item}`, bx + IN(0.6), y); y += IN(0.3); });
    y += IN(0.25);
    const facts = [GAME.audience.toUpperCase(), GAME.minutes ? `${GAME.minutes} MINUTES` : '', GAME.players].filter(Boolean).join('   ·   ');
    fitText(x, facts, cx, y, bw, IN(0.2), 800, HEAD, THEME.ink, 2);
    const blob = await canvasBlob(c, 'image/jpeg', 0.92);
    c.width = c.height = 0;
    const { PDFDocument } = await pdfLib();
    const doc = await PDFDocument.create();
    const img = await doc.embedJpg(await blob.arrayBuffer());
    const page = doc.addPage([wIn * 72, hIn * 72]);
    page.drawImage(img, { x: 0, y: 0, width: wIn * 72, height: hIn * 72 });
    doc.setTitle(`${game.title} - KDP cover`);
    return { blob: new Blob([await doc.save()], { type: 'application/pdf' }), wIn, hIn, spine, pages };
  }

  // Makes the files of one platform: [{ name, blob }]. Etsy reuses the 15 images and the video made
  // by the page; 'video' is that Etsy video blob (or null).
  async function buildPlatform(platform, A, game, opts = {}) {
    const files = [];
    const add = (name, blob) => files.push({ name, blob });
    const say = opts.onStep || (() => {});
    if (platform === 'etsy') {
      (opts.etsyImages || []).forEach((f) => add(f.name, f.blob));
      if (opts.etsyVideo) add('video.mp4', opts.etsyVideo);
    }
    const spec = imageSpecs(platform);
    if (spec) {
      for (const [i, [scene, top, bottom]] of spec.list.entries()) {
        say(`${scene.replace(/^\d+-/, '')} (${i + 1} of ${spec.list.length})`);
        const c = frameOf(A, scene, spec.size[0], spec.size[1], top, bottom);
        add(`${spec.prefix}-${i + 1}.jpg`, await canvasBlob(c, 'image/jpeg', 0.9));
        c.width = c.height = 0;
        await new Promise((r) => setTimeout(r));
      }
    }
    if (platform === 'instagram') {
      say('Reel cover');
      const cover = reelCover(A);
      add('reel-cover.jpg', await canvasBlob(cover, 'image/jpeg', 0.9));
      cover.width = cover.height = 0;
      if (opts.withVideo) {
        for (const [name, secs, fn] of REELS) {
          add(`${name}.mp4`, await encodeVideo(A, (f) => say(`${name.replace('reel-', '').replace(/-/g, ' ')} reel ${Math.round(f * 100)}%`), reelSpec(secs, fn)));
        }
      }
    }
    if (platform === 'tpt') { say('preview PDF'); add('preview.pdf', await tptPreview(game)); }
    if (platform === 'kdp') { say('paperback cover'); add('cover.pdf', (await kdpCover(A, game)).blob); }
    say('Canva file');
    add(`${platform}-canva.pptx`, await canvaPptx(platform, A, game, say));
    add(`${platform}-listing.txt`, new Blob([TEXTS[platform]()], { type: 'text/plain;charset=utf-8' }));
    return files;
  }

  // Vertical reels (Instagram Reels, TikTok, YouTube Shorts) -------------------------------------
  // Drawn natively at 1080x1920. Words stay inside the safe area: clear of the caption strip at the
  // bottom and the like/comment buttons on the right. Each reel ends on a frame close to its first,
  // so it loops cleanly.
  const RW = 1080, RH = 1920, SAFE = { left: 70, right: 920, top: 230, bottom: 1560 };
  const safeW = SAFE.right - SAFE.left, safeX = (SAFE.left + SAFE.right) / 2;

  function reelBg(ctx, A) {
    const s = Math.max(RW / W, RH / H);
    ctx.drawImage(A.bg, (RW - W * s) / 2, (RH - H * s) / 2, W * s, H * s);
  }

  // Big words with the theme's glow; up to three lines.
  function reelWords(ctx, text, y, px, fill, alpha) {
    if (!text || alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp01(alpha);
    ctx.shadowColor = THEME.textShadow;
    ctx.shadowBlur = 18;
    let size = px;
    setFont(ctx, 900, size, HEAD);
    let lines = wrapLines(ctx, text, safeW);
    while (lines.length > 3 && size > 30) { size -= 4; setFont(ctx, 900, size, HEAD); lines = wrapLines(ctx, text, safeW); }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = fill || THEME.ink;
    lines.forEach((l, i) => ctx.fillText(l, safeX, y + i * size * 1.12));
    ctx.restore();
  }

  function reelLabel(ctx, text, y, alpha) {
    if (!text || alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp01(alpha);
    fitText(ctx, text, safeX, y, safeW, 46, 400, SC, THEME.gold, 3);
    ctx.restore();
  }

  // Scenes with a fade in and out: [start, end, draw(ctx, A, local t)].
  function playScenes(ctx, A, t, scenes) {
    reelBg(ctx, A);
    for (const [a, b, draw] of scenes) {
      if (t < a - 0.01 || t > b + 0.01) continue;
      const alpha = Math.min(span(t, a, a + 0.35), 1 - span(t, b - 0.35, b));
      if (alpha <= 0) continue;
      ctx.save();
      ctx.globalAlpha = alpha;
      draw(ctx, A, t - a, alpha);
      ctx.restore();
    }
  }

  const hook = () => (pictureOnly() ? 'CAN YOU BUILD THE PICTURE?' : 'CAN YOU CRACK THIS CODE?');

  // The demo puzzle centred at width w; o as in drawPuzzle.
  function reelPuzzle(ctx, A, cy, w, o) {
    const p = A.puzzle, cell = Math.floor(w / p.W);
    drawPuzzle(ctx, p, A.loop, RW / 2 - (p.W * cell) / 2, cy - (p.H * cell) / 2, cell, o);
    return (p.H * cell) / 2;
  }

  // The reveal under the puzzle: a letter in the code boxes, or a piece on the board.
  function reelReveal(ctx, A, y, pop) {
    if (pictureOnly()) drawBoard(ctx, RW / 2, y + 125, 230, 3, pop);
    else drawLetterBoxes(ctx, RW / 2, y, 120, 5, 2, A.puzzle.letter, pop);
  }

  function reelCta(ctx, A, k) {
    reelWords(ctx, GAME.title.toUpperCase(), 360, 78, THEME.ink, k);
    ctx.save();
    ctx.globalAlpha = clamp01(k);
    drawPage(ctx, A.images.cover, RW / 2, 900, 520, -3);
    drawSeal(ctx, RW / 2 + 250, 1130, 120, 0.9);
    ctx.restore();
    const facts = [GAME.audience.toUpperCase(), GAME.minutes ? `${GAME.minutes} MINUTES` : ''].filter(Boolean).join('  ·  ');
    reelLabel(ctx, facts, 1330, k);
    ctx.save();
    ctx.globalAlpha = clamp01(k);
    ctx.fillStyle = THEME.accent;
    roundRect(ctx, safeX - 330, 1380, 660, 120, 16);
    ctx.fill();
    fitText(ctx, 'INSTANT DOWNLOAD', safeX, 1438, 600, 54, 900, HEAD, THEME.sealInk, 2);
    fitText(ctx, 'LINK IN BIO', safeX, 1484, 600, 34, 800, HEAD, THEME.sealGold, 4);
    ctx.restore();
  }

  // 11 s teaser: hook, the loop draws itself, the reveal, three real pages, the call to action.
  function reelTeaser(ctx, A, t) {
    const P = A.images;
    const peek = [[P.cover, 'A STORY TO SOLVE'], [P.codeSheet, 'A CODE TO CRACK'], [P.certificate, 'A CERTIFICATE TO WIN']].filter(([img]) => img);
    const scenes = [
      [0, 6.6, (c, a, s) => {
        reelWords(c, hook(), 330, 92, THEME.ink, 1);
        const half = reelPuzzle(c, A, 900, 640, { loop: easeInOut(span(s, 1.0, 4.6)), shade: span(s, 4.6, 5.2) });
        reelReveal(c, A, 900 + half + 50, easeOut(span(s, 5.2, 5.8)));
      }],
    ];
    peek.forEach(([img, label], i) => {
      const a = 6.4 + i * 0.9;
      scenes.push([a, a + 1.25, (c, a2, s) => {
        const slide = 1 - easeOut(span(s, 0, 0.4));
        reelLabel(c, label, 330, 1);
        drawPage(c, img, RW / 2 + slide * 500, 930, img.width > img.height ? 900 : 760, (i % 2 ? 2.5 : -2.5) + slide * 8);
      }]);
    });
    scenes.push([6.4 + peek.length * 0.9, 11, (c, a2) => reelCta(c, a2, 1)]);
    playScenes(ctx, A, t, scenes);
  }

  // 12 s flip-through: the real pages, one after another, then the call to action.
  function reelFlip(ctx, A, t) {
    const P = A.images;
    const pages = [
      [P.cover, 'THE COVER'], [P.prologue, 'THE STORY'], [P.howTo, 'HOW TO PLAY'], [P.codeSheet, 'THE CODE SHEET'],
      [P.puzzles[0], `${GAME.puzzles} LOGIC PUZZLES`], [P.puzzles[1] || P.puzzles[0], `${GAME.puzzles} LOGIC PUZZLES`],
      [P.finalLock, 'THE FINAL LOCK'], [P.certificate, 'A CERTIFICATE TO WIN'],
    ].filter(([img]) => img);
    const step = 1.05, start = 1.4;
    const scenes = [[0, 1.8, (c) => {
      reelWords(c, 'AN ESCAPE ROOM… ON PAPER', 700, 104, THEME.ink, 1);
      reelLabel(c, 'Print it. Solve it. Escape.', 1080, 1);
    }]];
    pages.forEach(([img, label], i) => {
      const a = start + i * step;
      scenes.push([a, a + step + 0.35, (c, A2, s) => {
        const slide = 1 - easeOut(span(s, 0, 0.45));
        const w = img.width > img.height ? 900 : 760;
        reelLabel(c, label, 330, 1);
        drawPage(c, img, RW / 2 + slide * 500, 930, w, (i % 2 ? 2.5 : -2.5) + slide * 8);
      }]);
    });
    const end = start + pages.length * step;
    scenes.push([end, 12, (c, a2) => reelCta(c, a2, 1)]);
    playScenes(ctx, A, t, scenes);
  }

  // 15 s how-it-works: three steps, the numbers, the call to action.
  function reelHow(ctx, A, t) {
    const last = pictureOnly() ? '3. BUILD THE PICTURE' : '3. CRACK THE CODE';
    playScenes(ctx, A, t, [
      [0, 2.2, (c) => {
        reelWords(c, 'HOW IT WORKS', 700, 120, THEME.ink, 1);
        reelLabel(c, GAME.title, 1010, 1);
      }],
      [2.0, 5.2, (c, a) => {
        reelWords(c, '1. SOLVE THE NUMBERS', 330, 76, THEME.ink, 1);
        reelPuzzle(c, a, 950, 700, { loop: 0, shade: 0 });
        reelLabel(c, 'Each number counts the lines around it', 1480, 1);
      }],
      [5.0, 8.4, (c, a, s) => {
        reelWords(c, '2. CLOSE THE LOOP', 330, 76, THEME.ink, 1);
        reelPuzzle(c, a, 950, 700, { loop: easeInOut(span(s, 0.3, 2.4)), shade: span(s, 2.4, 3.0) });
        reelLabel(c, pictureOnly() ? 'Shade the inside: a piece of a picture' : 'Shade the inside: a letter appears', 1480, 1);
      }],
      [8.2, 11.4, (c, a, s) => {
        reelWords(c, last, 330, 76, THEME.ink, 1);
        reelPuzzle(c, a, 820, 520, { loop: 1, shade: 1 });
        reelReveal(c, a, pictureOnly() ? 1160 : 1210, easeOut(span(s, 0.3, 0.8)));
        reelLabel(c, pictureOnly() ? 'Name the picture to open the lock' : 'The letters open the Final Lock', 1520, 1);
      }],
      [11.2, 13.4, (c, a, s) => {
        reelWords(c, 'WHAT YOU GET', 330, 84, THEME.ink, 1);
        const rows = [[String(GAME.puzzles), 'LOGIC PUZZLES'], [GAME.audience.toUpperCase(), 'PLAYERS'], [GAME.minutes || '60', 'MINUTES OF PLAY']];
        rows.forEach(([big, small], i) => {
          const k = easeOut(span(s, 0.2 + i * 0.25, 0.6 + i * 0.25)), y = 520 + i * 330;
          c.save();
          c.globalAlpha *= k;
          c.fillStyle = THEME.paper;
          roundRect(c, safeX - 380, y, 760, 270, 18);
          c.fill();
          fitText(c, big, safeX, y + 150, 680, 110, 900, HEAD, THEME.loop, 1);
          fitText(c, small, safeX, y + 225, 680, 40, 800, HEAD, THEME.pencil, 3);
          c.restore();
        });
      }],
      [13.2, 15, (c, a) => reelCta(c, a, 1)],
    ]);
  }

  const REELS = [
    ['reel-teaser', 11, reelTeaser],
    ['reel-flip-through', 12, reelFlip],
    ['reel-how-it-works', 15, reelHow],
  ];
  const reelSpec = (seconds, fn) => ({ fps: 24, seconds, width: RW, height: RH, draw: (ctx, A, t) => fn(ctx, A, t) });

  // Cover for the profile grid: the hook, the title and the game's cover.
  function reelCover(A) {
    const c = newCanvas(RW, RH), x = c.getContext('2d');
    reelBg(x, A);
    reelWords(x, hook(), 330, 92, THEME.ink, 1);
    drawPage(x, A.images.cover, RW / 2, 980, 640, -2);
    drawSeal(x, RW / 2 + 290, 1270, 130, 0.95);
    reelLabel(x, GAME.title, 1490, 1);
    return c;
  }

  root.ListingKit = {
    PLATFORMS, buildPlatform, platformText: (p) => TEXTS[p](),
    reelNames: REELS.map((r) => r[0]),
    reelFrame(A, name, t) { const r = REELS.find((x) => x[0] === name); const c = newCanvas(RW, RH); r[2](c.getContext('2d'), A, t); return c; },
    reelCover: (A) => reelCover(A),
    lightMaterials: Object.keys(LIGHT),
    analyzePdf, resolveVisual, createAssets, renderImage, encodeVideo,
    videoFrame(A, t) { const c = document.createElement('canvas'); c.width = W; c.height = H; drawVideoFrame(c.getContext('2d'), A, t); return c; },
    VIDEO_SECONDS: VIDEO.seconds,
    imageNames: Object.keys(IMAGES), materials: Object.keys(MATERIALS).concat(Object.keys(LIGHT)), SAFE_KINDS, VISUALS,
  };
})(window);
