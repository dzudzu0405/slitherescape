// PDF renderer (spec sections 2 and 7). Builds the whole printable game with jsPDF in
// the browser: cover, prologue, how to play, code sheet, chapters with puzzle pages,
// final lock, host guide, hint questions, hint cards, answer key and certificate.
(function (root) {
  'use strict';

  // ------------------------------------------------------------------ constants
  const IN = 72;
  const PAPERS = {
    letter: { w: 8.5 * IN, h: 11 * IN, kdp: false, label: 'Letter' },
    a4: { w: 595.28, h: 841.89, kdp: false, label: 'A4' },
    // KDP interior with bleed: +0.125" width (outer edge), +0.125" top and bottom.
    kdp: { w: 8.5 * IN + 9, h: 11 * IN + 18, kdp: true, label: 'KDP 8.5x11' }
  };
  const C = {
    ink: [59, 36, 18], brown: [122, 82, 48], tan: [201, 168, 119], shade: [217, 191, 140],
    red: [122, 46, 30], paper: [238, 221, 186], panel: [246, 236, 214], white: [255, 255, 255]
  };
  const NUMBER_WORDS = ['One', 'Two', 'Three', 'Four', 'Five'];
  const FONT_FILES = [
    ['IMFellEnglish-Regular.ttf', 'Fell', 'normal'],
    ['IMFellEnglish-Italic.ttf', 'Fell', 'italic'],
    ['IMFellEnglishSC-Regular.ttf', 'FellSC', 'normal'],
    ['DejaVuSerif-Bold.ttf', 'Digits', 'normal']
  ];
  // Fixed How to Play text (spec section 2).
  const RULES = [
    'Each puzzle is a grid of dots. Connect neighbouring dots with straight lines (across or down, never diagonally) to draw one single closed loop.',
    'The loop may not cross itself, branch, or touch itself at a corner.',
    'A number tells you how many of the four sides of that square are part of the loop. Squares without a number can have any number of sides used.',
    'Every puzzle has exactly one solution, and it can be found by logic alone - no guessing needed.',
    'When the loop is complete, shade the inside: it forms a capital letter. Write it in the box at the bottom of the page and on your Code Sheet.',
    'Tip: mark sides you know are empty with a small x. Use a pencil!',
    'Stuck? Ask your Game Host for a hint. The Host reads you a multiple-choice question about the story or the theme. Answer correctly to receive the hint card. Answer wrongly and you must wait 2 minutes before trying a different question. Each puzzle has two hints.'
  ];
  const MOSAIC_RULE = 'Picture chapters: every puzzle is a piece of one big picture. Shade the inside of each loop, cut the pieces out and glue them onto the Assembly Board. Pieces never rotate: keep the arrow pointing up. Find the finished picture on the Answer Board: its name is the word of that chapter.';
  const PARTY_RULE = 'Everyone has a role. Check your role card: it says what only you can do during the game.';
  const REVERSE_NOTE = 'Reverse puzzle: the loop runs around a large frame. When it is complete, shade the inside of the loop - your letter is the UNSHADED shape left inside the frame.';

  // Motifs as simple paths in a 32x32 box: M/L/C/Z segments, circles as ['O', cx, cy, r].
  const MOTIFS = {
    snowflake: { stroke: [['M', 16, 3], ['L', 16, 29], ['M', 4.7, 9.5], ['L', 27.3, 22.5], ['M', 4.7, 22.5], ['L', 27.3, 9.5],
      ['M', 12, 5], ['L', 16, 8], ['L', 20, 5], ['M', 12, 27], ['L', 16, 24], ['L', 20, 27],
      ['M', 5.5, 14], ['L', 9, 12], ['L', 7.5, 8.2], ['M', 26.5, 18], ['L', 23, 20], ['L', 24.5, 23.8],
      ['M', 26.5, 14], ['L', 23, 12], ['L', 24.5, 8.2], ['M', 5.5, 18], ['L', 9, 20], ['L', 7.5, 23.8]] },
    star: { stroke: [['M', 16, 3], ['L', 19.6, 11.4], ['L', 28.6, 12.2], ['L', 21.8, 18.2], ['L', 23.8, 27], ['L', 16, 22.4], ['L', 8.2, 27], ['L', 10.2, 18.2], ['L', 3.4, 12.2], ['L', 12.4, 11.4], ['Z']] },
    heart: { stroke: [['M', 16, 27], ['C', 16, 27, 4, 19.5, 4, 11.5], ['C', 4, 8, 6.7, 5.5, 10, 5.5], ['C', 12.6, 5.5, 15, 7, 16, 9], ['C', 17, 7, 19.4, 5.5, 22, 5.5], ['C', 25.3, 5.5, 28, 8, 28, 11.5], ['C', 28, 19.5, 16, 27, 16, 27], ['Z']] },
    compass: { stroke: [['O', 16, 16, 12], ['M', 6, 16], ['L', 16, 13], ['L', 26, 16], ['L', 16, 19], ['Z']], fill: [['M', 16, 6], ['L', 19, 16], ['L', 16, 26], ['L', 13, 16], ['Z']] },
    leaf: { stroke: [['M', 6, 26], ['C', 6, 12, 14, 5, 27, 5], ['C', 27, 18, 20, 26, 6, 26], ['Z'], ['M', 6, 26], ['L', 18, 14]] },
    moon: { stroke: [['M', 20, 4.5], ['C', 13, 4, 6, 9.5, 6, 17], ['C', 6, 24, 12, 29, 19, 29], ['C', 23, 29, 26.5, 27, 28.5, 24], ['C', 21, 25.5, 14.5, 20, 14.5, 13], ['C', 14.5, 9.5, 17, 6, 20, 4.5], ['Z']] },
    key: { stroke: [['O', 10, 16, 5.5], ['M', 15.5, 16], ['L', 28, 16], ['M', 24, 16], ['L', 24, 20], ['M', 28, 16], ['L', 28, 21]] }
  };

  const isMosaic = (c) => !!c && c.type === 'mosaic';

  // ------------------------------------------------------------------ small helpers
  function rng(seed) {
    let a = 0;
    for (let i = 0; i < seed.length; i++) a = (Math.imul(a, 31) + seed.charCodeAt(i)) >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function toBase64(buf) {
    const bytes = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }

  let fontCache = null;
  async function loadFonts(base) {
    if (fontCache) return fontCache;
    fontCache = await Promise.all(FONT_FILES.map(async ([file, name, style]) => {
      const res = await fetch(base + file);
      if (!res.ok) throw new Error('Could not load font ' + file);
      return { file, name, style, data: toBase64(await res.arrayBuffer()) };
    }));
    return fontCache;
  }

  // Balanced shuffle of the correct-answer position over A/B/C (spec section 6),
  // balanced within each printed page of 10 questions.
  function shuffleAnswers(questions, seed) {
    const r = rng(seed + '-answers');
    const targets = [];
    for (let p = 0; p < questions.length; p += 10) {
      const block = [];
      for (let i = p; i < Math.min(p + 10, questions.length); i++) block.push((i - p) % 3);
      for (let i = block.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [block[i], block[j]] = [block[j], block[i]]; }
      targets.push(...block);
    }
    return questions.map((q, i) => {
      const correct = q.options[q.answer];
      const others = q.options.filter((_, k) => k !== q.answer);
      const options = [];
      for (let k = 0, o = 0; k < 3; k++) options.push(k === targets[i] ? correct : others[o++]);
      return { q: q.q, options, answer: targets[i], kind: q.kind };
    });
  }

  // ------------------------------------------------------------------ builder
  function Builder(game, doc, textures) {
    this.g = game;
    this.doc = doc;
    this.paper = PAPERS[game.paper] || PAPERS.letter;
    this.textures = textures;
    this.pageNo = 0;
    this.cmaps = {};
    FONT_FILES.forEach(([, name, style]) => {
      try { this.cmaps[name + style] = doc.internal.getFont(name, style).metadata.cmap.unicode.codeMap; } catch (_) { /* fallback font */ }
    });
  }

  const B = Builder.prototype;

  // Replace characters the current font cannot draw (IM Fell lacks arrows, for example).
  B.clean = function (text) {
    const map = this.cmaps[this.fontKey];
    let s = String(text == null ? '' : text).replace(/→/g, '->').replace(/←/g, '<-').replace(/\s+/g, ' ').trim();
    // Typographic quotes: IM Fell draws the straight " as a closing quote.
    s = s.replace(/(^|[\s(\[{—–-])"/g, '$1“').replace(/"/g, '”')
      .replace(/(^|[\s(\[{—–-])'(?=\w)/g, '$1‘').replace(/'/g, '’');
    if (!map) return s;
    let out = '';
    for (const ch of s) {
      if (map[ch.codePointAt(0)] || ch === ' ') { out += ch; continue; }
      const base = ch.normalize('NFKD').replace(/[̀-ͯ]/g, '');
      out += [...base].every((c) => map[c.codePointAt(0)]) ? base : '';
    }
    return out;
  };

  B.font = function (name, size, color, style = 'normal') {
    this.doc.setFont(name, style);
    this.doc.setFontSize(size);
    this.doc.setTextColor(...(color || C.ink));
    this.fontKey = name + style;
    this.fontSize = size;
  };

  B.text = function (str, x, y, opts = {}) {
    this.doc.text(this.clean(str), x, y, opts);
  };

  // Wrapped paragraph. Returns the y below it.
  B.para = function (str, x, y, w, opts = {}) {
    const lh = (opts.lineHeight || 1.32) * this.fontSize;
    const lines = this.doc.splitTextToSize(this.clean(str), w);
    lines.forEach((ln, i) => {
      const ax = opts.align === 'center' ? x + w / 2 : x;
      this.doc.text(ln, ax, y + i * lh, { align: opts.align === 'center' ? 'center' : 'left' });
    });
    return y + lines.length * lh;
  };

  B.measure = function (str, w) {
    return this.doc.splitTextToSize(this.clean(str), w).length * 1.32 * this.fontSize;
  };

  // Page frame and content box; KDP pages alternate the gutter side.
  B.geometry = function (landscape) {
    const p = this.paper;
    const W = landscape ? p.h : p.w, H = landscape ? p.w : p.h;
    let fl = 26, fr = 26, ft = 26, fb = 26;
    if (p.kdp && !landscape) {
      const right = this.pageNo % 2 === 1; // odd pages are right-hand pages
      ft = fb = 9 + 26;
      fl = right ? 50 : 9 + 26;
      fr = right ? 9 + 26 : 50;
    }
    const frame = { x: fl, y: ft, w: W - fl - fr, h: H - ft - fb };
    const box = { x: frame.x + 26, y: frame.y + 30, w: frame.w - 52, h: frame.h - 30 - 44 };
    return { W, H, frame, box };
  };

  B.newPage = function (opts = {}) {
    const doc = this.doc;
    const landscape = !!opts.landscape;
    if (this.pageNo > 0) doc.addPage([this.paper.w, this.paper.h], landscape ? 'landscape' : 'portrait');
    this.pageNo++;
    const geo = this.geometry(landscape);
    this.geo = geo;
    if (!this.g.inkSaver) {
      const list = landscape ? this.textures.landscape : this.textures.portrait;
      const tex = list[(this.pageNo - 1) % list.length];
      doc.addImage(tex.data, 'JPEG', 0, 0, geo.W, geo.H, tex.alias, 'FAST');
    }
    this.frame(geo.frame);
    if (opts.host) {
      this.font('FellSC', 9, C.red);
      this.text('For the Game Host only', geo.W / 2, geo.frame.y + 17, { align: 'center' });
    }
    if (!opts.noFooter) this.footer();
    return geo.box;
  };

  B.footer = function () {
    const { frame } = this.geo;
    const y = frame.y + frame.h - 14;
    this.font('Fell', 8.5, C.brown, 'italic');
    this.text(`© ${this.g.shop || 'Your Shop Name'} · For personal & classroom use`, frame.x + 26, y);
    // Bulk variants print their code on every page so a host never mixes up answer keys.
    const code = this.g.variantCode ? ` · ${this.g.variantCode}` : '';
    this.text(`${this.g.story.title}${code} · ${this.pageNo}`, frame.x + frame.w - 26, y, { align: 'right' });
  };

  // ------------------------------------------------------------------ ornaments
  B.frame = function (f) {
    const doc = this.doc;
    doc.setDrawColor(...C.brown);
    doc.setLineWidth(1.3);
    doc.rect(f.x, f.y, f.w, f.h);
    doc.setLineWidth(0.5);
    doc.rect(f.x + 4.5, f.y + 4.5, f.w - 9, f.h - 9);
    [[f.x, f.y], [f.x + f.w, f.y], [f.x, f.y + f.h], [f.x + f.w, f.y + f.h]].forEach(([x, y]) => this.diamond(x, y, 5.5, C.brown));
  };

  B.diamond = function (x, y, r, color) {
    const doc = this.doc;
    doc.setFillColor(...color);
    doc.triangle(x - r, y, x, y - r, x + r, y, 'F');
    doc.triangle(x - r, y, x, y + r, x + r, y, 'F');
  };

  B.divider = function (cx, y, w) {
    const doc = this.doc;
    doc.setDrawColor(...C.brown);
    doc.setLineWidth(0.6);
    doc.line(cx - w / 2, y, cx - 10, y);
    doc.line(cx + 10, y, cx + w / 2, y);
    this.diamond(cx, y, 4.2, C.brown);
    doc.setFillColor(...C.brown);
    doc.circle(cx - w / 2 - 3, y, 1.1, 'F');
    doc.circle(cx + w / 2 + 3, y, 1.1, 'F');
  };

  // Draws a motif centred at (cx, cy) with the given size.
  B.motif = function (name, cx, cy, size, color) {
    const m = MOTIFS[name] || MOTIFS.key;
    const doc = this.doc;
    const s = size / 32, ox = cx - size / 2, oy = cy - size / 2;
    const run = (cmds, style) => {
      let start = null, cur = null, segs = [];
      const flush = (closed) => {
        if (start && segs.length) doc.lines(segs, start[0], start[1], [1, 1], style, closed);
        segs = []; start = null;
      };
      for (const c of cmds) {
        if (c[0] === 'O') { flush(false); doc.circle(ox + c[1] * s, oy + c[2] * s, c[3] * s, style); continue; }
        if (c[0] === 'M') { flush(false); start = [ox + c[1] * s, oy + c[2] * s]; cur = start.slice(); continue; }
        if (c[0] === 'L') { const p = [ox + c[1] * s, oy + c[2] * s]; segs.push([p[0] - cur[0], p[1] - cur[1]]); cur = p; continue; }
        if (c[0] === 'C') {
          const p1 = [ox + c[1] * s, oy + c[2] * s], p2 = [ox + c[3] * s, oy + c[4] * s], p = [ox + c[5] * s, oy + c[6] * s];
          segs.push([p1[0] - cur[0], p1[1] - cur[1], p2[0] - cur[0], p2[1] - cur[1], p[0] - cur[0], p[1] - cur[1]]);
          cur = p; continue;
        }
        if (c[0] === 'Z') flush(true);
      }
      flush(false);
    };
    doc.setDrawColor(...(color || C.brown));
    doc.setFillColor(...(color || C.brown));
    doc.setLineWidth(Math.max(0.6, size / 26));
    doc.setLineCap('round');
    doc.setLineJoin('round');
    if (m.fill) run(m.fill, 'F');
    run(m.stroke, 'S');
  };

  // Light panel behind grids so the paper texture never fights the numbers.
  B.panel = function (x, y, w, h) {
    if (this.g.inkSaver) return;
    const doc = this.doc;
    doc.setGState(new doc.GState({ opacity: 0.62 }));
    doc.setFillColor(...C.panel);
    doc.roundedRect(x, y, w, h, 6, 6, 'F');
    doc.setGState(new doc.GState({ opacity: 1 }));
  };

  B.letterBoxes = function (cx, y, words, size, opts = {}) {
    const doc = this.doc;
    const gap = size * 0.18, wordGap = size * 0.8;
    const total = words.reduce((t, w) => t + w * size + (w - 1) * gap, 0) + (words.length - 1) * wordGap;
    let x = cx - total / 2;
    let n = opts.startNumber || 1;
    words.forEach((len) => {
      for (let i = 0; i < len; i++) {
        doc.setDrawColor(...C.brown);
        doc.setLineWidth(1.1);
        if (!this.g.inkSaver) { doc.setFillColor(...C.white); doc.setGState(new doc.GState({ opacity: 0.55 })); doc.rect(x, y, size, size, 'F'); doc.setGState(new doc.GState({ opacity: 1 })); }
        doc.rect(x, y, size, size);
        if (opts.letters) {
          this.font('FellSC', size * 0.7, C.red);
          this.text(opts.letters[n - 1], x + size / 2, y + size * 0.74, { align: 'center' });
        }
        if (opts.numbers) {
          this.font('Fell', Math.max(6.5, size * 0.26), C.brown);
          this.text(String(n), x + size / 2, y + size + size * 0.32, { align: 'center' });
        }
        n++;
        x += size + gap;
      }
      x += wordGap - gap;
    });
  };

  // ------------------------------------------------------------------ grids
  // Draws a puzzle grid with its top-left at (x, y). opts: shade, loop, hintEdges.
  B.grid = function (p, x, y, cell, opts = {}) {
    const doc = this.doc;
    const W = p.W, H = p.H, NH = (H + 1) * W;
    const edgeLine = (e) => {
      if (e < NH) { const r = Math.floor(e / W), c = e % W; return [x + c * cell, y + r * cell, x + (c + 1) * cell, y + r * cell]; }
      const e2 = e - NH, r = Math.floor(e2 / (W + 1)), c = e2 % (W + 1);
      return [x + c * cell, y + r * cell, x + c * cell, y + (r + 1) * cell];
    };
    if (opts.shade) {
      doc.setFillColor(...C.shade);
      for (let i = 0; i < W * H; i++) if (p.inside[i]) doc.rect(x + (i % W) * cell, y + Math.floor(i / W) * cell, cell + 0.2, cell + 0.2, 'F');
    }
    const lineEdges = opts.loop ? p.solution.map((v, e) => (v === 1 ? e : -1)).filter((e) => e >= 0) : (opts.hintEdges || []);
    if (lineEdges.length) {
      doc.setDrawColor(...C.red);
      doc.setLineWidth(Math.max(1.2, cell * 0.09));
      doc.setLineCap('round');
      lineEdges.forEach((e) => { const l = edgeLine(e); doc.line(l[0], l[1], l[2], l[3]); });
    }
    doc.setFillColor(...C.ink);
    const dot = Math.max(0.9, cell * 0.055);
    for (let r = 0; r <= H; r++) for (let c = 0; c <= W; c++) doc.circle(x + c * cell, y + r * cell, dot, 'F');
    this.font('Digits', cell * 0.55, C.ink);
    for (let i = 0; i < W * H; i++) {
      const v = p.clues[i];
      if (v < 0) continue;
      doc.text(String(v), x + (i % W) * cell + cell / 2, y + Math.floor(i / W) * cell + cell / 2 + cell * 0.2, { align: 'center' });
    }
  };

  // ------------------------------------------------------------------ pages
  B.coverPage = function () {
    const g = this.g, s = g.story;
    const box = this.newPage({ noFooter: true });
    const cx = this.geo.W / 2;
    let y = box.y + box.h * 0.16;
    this.font('FellSC', 13, C.brown);
    this.text('A Slitherlink Escape Game', cx, y, { align: 'center' });
    this.divider(cx, y + 16, 150);
    this.font('Fell', 46, C.ink);
    y = this.para(s.title, box.x + 20, y + 72, box.w - 40, { align: 'center', lineHeight: 1.08 });
    this.font('Fell', 17, C.brown, 'italic');
    y = this.para(s.tagline, box.x + 50, y + 8, box.w - 100, { align: 'center' });
    this.motif(g.motif, cx, y + 90, 110, C.brown);
    y += 200;
    this.divider(cx, y, 220);
    this.font('FellSC', 14, C.brown);
    this.text(`${g.audience} · ${g.puzzles.length} Puzzles · ${g.minutes[0]}-${g.minutes[1]} Minutes`, cx, y + 26, { align: 'center' });
    this.font('Fell', 12, C.brown, 'italic');
    this.text(`${s.chapters.length} chapters · one secret code · for groups or competing teams`, cx, y + 46, { align: 'center' });
    this.font('Fell', 11, C.brown);
    this.text(`© ${g.shop || 'Your Shop Name'}`, cx, box.y + box.h + 18, { align: 'center' });
  };

  B.prologuePage = function () {
    const s = this.g.story;
    const box = this.newPage();
    const cx = this.geo.W / 2;
    this.font('FellSC', 12, C.brown);
    this.text('The Story Begins', cx, box.y + 14, { align: 'center' });
    this.font('Fell', 34, C.ink);
    this.text('Prologue', cx, box.y + 52, { align: 'center' });
    this.divider(cx, box.y + 70, 160);
    this.font('Fell', 14, C.ink);
    let y = this.para(s.prologue, box.x + 18, box.y + 106, box.w - 36, { lineHeight: 1.45 });
    y += 26;
    this.divider(cx, y, 120);
    this.font('FellSC', 18, C.red);
    this.text('Your Mission', cx, y + 34, { align: 'center' });
    this.font('Fell', 14, C.ink, 'italic');
    y = this.para(s.mission, box.x + 40, y + 60, box.w - 80, { align: 'center', lineHeight: 1.45 });
    this.motif(this.g.motif, cx, Math.min(y + 70, box.y + box.h - 40), 52, C.tan);
  };

  B.howToPlayPage = function () {
    const g = this.g, doc = this.doc;
    const box = this.newPage();
    const cx = this.geo.W / 2;
    this.font('Fell', 32, C.ink);
    this.text('How to Play', cx, box.y + 26, { align: 'center' });
    this.divider(cx, box.y + 42, 160);
    let y = box.y + 70;
    const mosaic = g.story.chapters.some(isMosaic);
    const onlyMosaic = g.story.chapters.every(isMosaic);
    const rules = RULES.slice();
    if (onlyMosaic) rules[4] = 'When the loop is complete, shade the inside. On its own, the shape will not look like anything: it is one piece of a bigger picture.';
    if (mosaic) rules.splice(5, 0, MOSAIC_RULE);
    if (g.partyKit) rules.push(PARTY_RULE);
    const tight = rules.length > RULES.length;
    rules.forEach((rule, i) => {
      this.font('FellSC', 13, C.red);
      this.text(String(i + 1) + '.', box.x + 6, y);
      this.font('Fell', tight ? 11 : 12, C.ink);
      y = this.para(rule, box.x + 26, y, box.w - 30, { lineHeight: tight ? 1.22 : 1.3 }) + (tight ? 4 : 6);
    });
    if (g.puzzles.some((p) => p.reverse)) {
      this.font('Fell', 11.5, C.brown, 'italic');
      y = this.para(REVERSE_NOTE, box.x + 26, y + 2, box.w - 30) + 4;
    }
    this.font('Fell', 12, C.ink, 'italic');
    y = this.para(mosaic ? 'Each chapter gives one word. Put the words together, in order, to make the final code.' : "Each chapter's letters spell one word. Put the words together, in order, to make the final code.", box.x + 26, y + 2, box.w - 30) + 10;

    // Worked example: the same small puzzle unsolved and solved.
    const ex = g.example;
    if (ex) {
      const room = box.y + box.h - y - 30;
      const cell = Math.min(34, room / ex.H, (box.w / 2 - 50) / ex.W);
      const gw = cell * ex.W, gh = cell * ex.H;
      const xs = [cx - gw - 30, cx + 30];
      ['Example puzzle', 'Solved'].forEach((label, k) => {
        this.font('FellSC', 12, C.brown);
        this.text(label, xs[k] + gw / 2, y + 12, { align: 'center' });
        this.panel(xs[k] - 10, y + 20, gw + 20, gh + 20);
        this.grid(ex, xs[k], y + 30, cell, k === 1 ? { shade: true, loop: true } : {});
      });
      doc.setDrawColor(...C.brown);
    }
  };

  B.codeSheetPage = function () {
    const s = this.g.story;
    const box = this.newPage();
    const cx = this.geo.W / 2;
    this.font('Fell', 32, C.ink);
    this.text('Code Sheet', cx, box.y + 26, { align: 'center' });
    this.divider(cx, box.y + 42, 160);
    this.font('Fell', 12.5, C.ink, 'italic');
    const allMosaic = s.chapters.every(isMosaic);
    // One picture: its name is the whole code, so one row of boxes is enough.
    if (allMosaic && s.chapters.length === 1) {
      const y1 = this.para('Assemble the picture, then find its name on the Answer Board. That name is the final code.', box.x + 40, box.y + 70, box.w - 80, { align: 'center' }) + 30;
      this.font('FellSC', 18, C.ink);
      this.text('The Final Code', cx, y1, { align: 'center' });
      const n = s.chapters[0].word.length;
      this.letterBoxes(cx, y1 + 16, [n], Math.min(32, (box.w - 40) / (n * 1.18)));
      return;
    }
    let y = this.para(allMosaic ? 'Write each word here once you have named the finished picture of its chapter.' : 'Write each letter in its box as you solve the puzzles. The small number under a box is the puzzle it comes from.', box.x + 30, box.y + 70, box.w - 60, { align: 'center' }) + 16;
    // Fit the longest chapter word (codes can reach 20 letters).
    const longest = Math.max(...s.chapters.map((c) => c.word.length));
    const size = Math.min(32, (box.w - 40) / (longest * 1.18));
    s.chapters.forEach((c, ci) => {
      this.font('FellSC', 15, C.red);
      this.text(`Chapter ${NUMBER_WORDS[ci]}: ${c.name}`, cx, y, { align: 'center' });
      this.font('Fell', 12.5, C.ink, 'italic');
      if (isMosaic(c)) {
        y = this.para('Assemble the picture, then find its name on the Answer Board.', box.x + 50, y + 20, box.w - 100, { align: 'center' }) + 8;
        this.letterBoxes(cx, y, [c.word.length], size);
        y += size + 26;
        return;
      }
      y = this.para(`"${c.riddle}"`, box.x + 50, y + 20, box.w - 100, { align: 'center' }) + 8;
      const first = this.g.slots.findIndex((sl) => sl.chapter === ci);
      this.letterBoxes(cx, y, [c.word.length], size, { numbers: true, startNumber: first + 1 });
      y += size + 40;
    });
    this.divider(cx, y - 8, 200);
    this.font('FellSC', 18, C.ink);
    this.text('The Final Code', cx, y + 22, { align: 'center' });
    const words = s.chapters.map((c) => c.word.length);
    const total = words.reduce((a, b) => a + b, 0);
    const fsize = Math.min(32, (box.w - 30) / (total * 1.18 + (words.length - 1) * 0.8));
    this.letterBoxes(cx, y + 38, words, fsize);
  };

  B.chapterIntroPage = function (ci) {
    const c = this.g.story.chapters[ci];
    const box = this.newPage();
    const cx = this.geo.W / 2;
    let y = box.y + box.h * 0.12;
    this.font('FellSC', 16, C.red);
    this.text(`Chapter ${NUMBER_WORDS[ci]}`, cx, y, { align: 'center' });
    this.font('Fell', 36, C.ink);
    y = this.para(c.name, box.x + 20, y + 44, box.w - 40, { align: 'center', lineHeight: 1.1 });
    this.divider(cx, y + 2, 180);
    this.font('Fell', 14, C.ink);
    y = this.para(c.intro, box.x + 30, y + 40, box.w - 60, { lineHeight: 1.5 }) + 30;
    this.motif(this.g.motif, cx, y + 36, 64, C.brown);
    this.font('FellSC', 13, C.brown);
    if (isMosaic(c)) {
      const n = this.g.slots.filter((sl) => sl.chapter === ci).length;
      this.text(`${n} pieces · one picture · one word`, cx, y + 100, { align: 'center' });
    } else {
      this.text(`${c.word.length} puzzles · ${c.word.length} letters · one word`, cx, y + 100, { align: 'center' });
    }
  };

  B.puzzlePage = function (i) {
    const g = this.g, p = g.puzzles[i], slot = g.slots[i];
    const box = this.newPage();
    const cx = this.geo.W / 2;
    this.font('FellSC', 11, C.brown);
    this.text(`Chapter ${NUMBER_WORDS[slot.chapter]} · Puzzle ${i + 1} of ${g.puzzles.length}`, cx, box.y + 6, { align: 'center' });
    this.font('Fell', 24, C.ink);
    this.text(g.story.puzzleTitles[slot.titleIndex] || `Puzzle ${i + 1}`, cx, box.y + 36, { align: 'center' });
    this.divider(cx, box.y + 50, 140);

    const bottom = p.reverse ? 132 : 86;
    const top = box.y + 72;
    const availH = box.y + box.h - bottom - top - 20;
    const cell = Math.min(42, (box.w - 30) / p.W, availH / p.H);
    const gw = cell * p.W, gh = cell * p.H;
    const gx = cx - gw / 2, gy = top + (availH - gh) / 2 + 10;
    this.panel(gx - 14, gy - 14, gw + 28, gh + 28);
    this.grid(p, gx, gy, cell);

    let y = box.y + box.h - bottom + 6;
    if (p.reverse) {
      this.font('Fell', 11, C.red, 'italic');
      y = this.para(REVERSE_NOTE, box.x + 40, y, box.w - 80, { align: 'center' }) + 4;
    }
    const size = 40;
    const bx = cx + 40;
    this.font('FellSC', 13, C.brown);
    this.text(`Word ${slot.chapter + 1}, letter ${slot.pos + 1} of ${slot.len}`, bx - 16, y + size / 2 + 2, { align: 'right' });
    this.font('Fell', 10, C.brown, 'italic');
    this.text('Write it on your Code Sheet too', bx - 16, y + size / 2 + 16, { align: 'right' });
    this.letterBoxes(bx + size / 2, y, [1], size);
  };

  B.finalLockPage = function () {
    const s = this.g.story;
    const box = this.newPage();
    const cx = this.geo.W / 2;
    this.font('FellSC', 13, C.red);
    this.text('The Last Door', cx, box.y + box.h * 0.1, { align: 'center' });
    this.font('Fell', 40, C.ink);
    this.text('The Final Lock', cx, box.y + box.h * 0.1 + 44, { align: 'center' });
    this.divider(cx, box.y + box.h * 0.1 + 62, 180);
    this.font('Fell', 14, C.ink);
    let y = this.para(s.finalLock, box.x + 40, box.y + box.h * 0.1 + 100, box.w - 80, { align: 'center', lineHeight: 1.5 }) + 30;
    // Padlock drawing.
    const doc = this.doc;
    doc.setDrawColor(...C.brown); doc.setLineWidth(3);
    doc.roundedRect(cx - 34, y + 40, 68, 54, 6, 6, 'S');
    doc.lines([[0, -36, 44, -36, 44, 0]], cx - 22, y + 40, [1, 1], 'S'); // shackle
    doc.setFillColor(...C.brown); doc.circle(cx, y + 62, 5, 'F'); doc.rect(cx - 2, y + 64, 4, 14, 'F');
    y += 130;
    const words = s.chapters.map((c) => c.word.length);
    const total = words.reduce((a, b) => a + b, 0);
    const size = Math.min(36, (box.w - 30) / (total * 1.18 + (words.length - 1) * 0.8));
    this.letterBoxes(cx, y, words, size);
    this.font('Fell', 13, C.brown, 'italic');
    this.para('When every box is filled, say the code aloud to your Game Host.', box.x + 40, y + size + 40, box.w - 80, { align: 'center' });
  };

  // Host guide flows over as many pages as it needs.
  B.hostGuide = function () {
    const g = this.g, s = g.story;
    const firstPage = this.pageNo + 1;
    let box = this.newPage({ host: true });
    const cx = () => this.geo.W / 2;
    let y = box.y + 26;
    this.font('Fell', 32, C.ink);
    this.text('Host Guide', cx(), y, { align: 'center' });
    this.divider(cx(), y + 16, 160);
    y += 46;
    const ensure = (need) => {
      if (y + need > box.y + box.h) { box = this.newPage({ host: true }); y = box.y + 10; }
    };
    const heading = (t) => { ensure(60); this.font('FellSC', 15, C.red); this.text(t, box.x, y); y += 20; };
    const para = (t, style) => {
      this.font('Fell', 12, C.ink, style || 'normal');
      ensure(this.measure(t, box.w) + 6);
      y = this.para(t, box.x, y, box.w) + 8;
    };
    const bullets = (items) => items.forEach((t) => {
      this.font('Fell', 12, C.ink);
      ensure(this.measure(t, box.w - 16) + 4);
      this.diamond(box.x + 4, y - 4, 2.6, C.brown);
      y = this.para(t, box.x + 14, y, box.w - 14) + 3;
    });
    const pages = g.pageMap;
    const total = g.puzzles.length;

    heading('Overview');
    const anyMosaic = s.chapters.some(isMosaic);
    const howWords = anyMosaic
      ? `${s.chapters.some((c) => !isMosaic(c)) ? "In a letter chapter, every solved puzzle reveals one letter of the chapter's word. " : ''}In a picture chapter, the solved puzzles are pieces of one picture; players glue them onto the Assembly Board, find the finished picture on the Answer Board, and its name is the chapter's word. The words together form`
      : "Every solved puzzle reveals one letter; each chapter's letters spell a word, and the words together form";
    para(`${s.title} is a printable escape game for ${g.audienceLong}. Players solve ${total} Slitherlink puzzles in ${s.chapters.length} chapters. ${howWords} the secret code that opens the Final Lock. Expect about ${g.minutes[0]} to ${g.minutes[1]} minutes of play.`);
    heading('What to print');
    bullets([
      `For the players: pages ${pages.playerFrom}-${pages.playerTo} (cover, story, How to Play, Code Sheet, chapters and puzzles, Final Lock), plus the certificate on page ${pages.certificate}.`,
      `For you only: this guide (${pages.guide}), the hint questions (${pages.questions}), the hint cards (${pages.cards}) and the answer key (${pages.answers}).`,
      'Teams playing against each other need one full set of player pages per team.'
    ]);
    heading('Before the game');
    bullets([
      'Cut out the hint cards along the dashed lines. Put each puzzle\'s two cards in an envelope labelled with the puzzle number, Hint 1 on top.',
      'Keep the questions, envelopes and answer key with you, out of sight.',
      'Give every player a pencil and an eraser. Set a visible timer if you like.',
      ...(anyMosaic ? ['Picture chapters need scissors and a glue stick.'] : []),
      'Read the Prologue aloud to start the game.'
    ]);
    if (g.partyKit && root.PdfPro) root.PdfPro.hostSection(g, heading, bullets);
    heading('Ways to play');
    bullets([
      'Together: share one set of pages. Split the puzzles between the players and fill in a single Code Sheet.',
      'Teams: each team gets its own set. The first team to say the correct code wins. Optionally add a 2-minute penalty for every hint card a team receives.'
    ]);
    heading('Giving hints');
    bullets([
      'When players ask for a hint, read them an unused question from the hint question pages and tick it off.',
      'Correct answer: hand over the next hint card for the puzzle they choose (Hint 1 before Hint 2).',
      'Wrong answer: they must wait 2 minutes before trying a different question.',
      'Hint 1 draws about a fifth of the loop; Hint 2 draws about half.'
    ]);
    heading('Checking the code');
    para(`When the players say the code, compare it with the answer key. The code is ${s.chapters.map((c) => c.word).join(' ')}. If it is right, read the ending below and hand out the certificate.`);
    heading('The ending - read aloud');
    para(s.ending, 'italic');

    // The guide quotes later page numbers, so it must fill exactly the planned page count:
    // pad with a notes page; build() re-runs with a larger count if it overflowed.
    this.guideUsed = this.pageNo - firstPage + 1;
    while (this.pageNo - firstPage + 1 < g.guidePages) {
      const nb = this.newPage({ host: true });
      this.font('Fell', 26, C.ink);
      this.text('Notes', this.geo.W / 2, nb.y + 22, { align: 'center' });
      this.doc.setDrawColor(...C.tan); this.doc.setLineWidth(0.5);
      for (let ly = nb.y + 64; ly < nb.y + nb.h - 10; ly += 26) this.doc.line(nb.x, ly, nb.x + nb.w, ly);
    }
  };

  B.questionPages = function () {
    const g = this.g;
    const qs = shuffleAnswers(g.story.questions, g.seed);
    const doc = this.doc;
    let box, y;
    qs.forEach((q, i) => {
      if (i % 10 === 0) {
        box = this.newPage({ host: true });
        this.font('Fell', 26, C.ink);
        this.text(i === 0 ? 'Hint Questions' : 'Hint Questions (continued)', this.geo.W / 2, box.y + 22, { align: 'center' });
        this.font('Fell', 11, C.brown, 'italic');
        this.text('Read an unused question aloud, then tick its box. The correct answer is circled.', this.geo.W / 2, box.y + 40, { align: 'center' });
        y = box.y + 66;
      }
      // Tick box and number.
      doc.setDrawColor(...C.brown); doc.setLineWidth(0.8);
      doc.rect(box.x, y - 9, 10, 10);
      this.font('FellSC', 12, C.red);
      this.text(`${i + 1}.`, box.x + 16, y);
      this.font('Fell', 12, C.ink);
      y = this.para(q.q, box.x + 36, y, box.w - 40) + 2;
      // Options laid out by their real width, wrapping when needed.
      let x = box.x + 36;
      const maxX = box.x + box.w;
      q.options.forEach((opt, k) => {
        const label = `${'ABC'[k]}. ${opt}`;
        this.font('Fell', 11.5, k === q.answer ? C.red : C.ink, k === q.answer ? 'normal' : 'normal');
        const w = doc.getTextWidth(this.clean(label));
        if (x + w > maxX && x > box.x + 36) { x = box.x + 36; y += 18; }
        this.text(label, x, y);
        if (k === q.answer) {
          doc.setDrawColor(...C.red); doc.setLineWidth(0.9);
          doc.ellipse(x + w / 2, y - 4, w / 2 + 7, 9, 'S');
        }
        x += w + 28;
      });
      y += 30;
    });
  };

  B.hintCardPages = function () {
    const g = this.g, doc = this.doc;
    const cards = [];
    g.puzzles.forEach((p, i) => [0, 1].forEach((h) => cards.push({ p, i, h })));
    for (let k = 0; k < cards.length; k += 6) {
      const box = this.newPage({ host: true });
      const cw = box.w / 2, ch = (box.h - 10) / 3;
      // Cut lines.
      doc.setDrawColor(...C.brown); doc.setLineWidth(0.6);
      doc.setLineDashPattern([4, 3], 0);
      doc.line(box.x + cw, box.y - 6, box.x + cw, box.y + ch * 3 + 4);
      for (let r = 1; r < 3; r++) doc.line(box.x - 10, box.y + r * ch, box.x + box.w + 10, box.y + r * ch);
      doc.setLineDashPattern([], 0);
      cards.slice(k, k + 6).forEach((card, j) => {
        const x = box.x + (j % 2) * cw, y = box.y + Math.floor(j / 2) * ch;
        const p = card.p;
        this.font('FellSC', 12, C.red);
        const slot = g.slots[card.i];
        this.text(`${slot.kind === 'piece' ? 'Piece' : 'Puzzle'} ${card.i + 1} · Hint ${card.h + 1}`, x + cw / 2, y + 18, { align: 'center' });
        this.font('Fell', 9.5, C.brown, 'italic');
        this.text(slot.kind === 'piece' ? `Chapter ${NUMBER_WORDS[slot.chapter]}` : g.story.puzzleTitles[slot.titleIndex] || '', x + cw / 2, y + 31, { align: 'center' });
        const cell = Math.min((cw - 40) / p.W, (ch - 62) / p.H);
        const gw = cell * p.W;
        this.grid(p, x + (cw - gw) / 2, y + 42, cell, { hintEdges: p.hints[card.h] });
      });
    }
  };

  B.answerPages = function () {
    const g = this.g, s = g.story;
    let box = this.newPage({ host: true });
    const cx = this.geo.W / 2;
    this.font('Fell', 30, C.ink);
    this.text('Answer Key', cx, box.y + 24, { align: 'center' });
    if (g.variantCode) {
      this.font('FellSC', 11, C.red);
      this.text(`For variant ${g.variantCode} only`, box.x + box.w, box.y + 6, { align: 'right' });
    }
    this.divider(cx, box.y + 40, 160);
    this.font('FellSC', 14, C.brown);
    this.text('The secret code', cx, box.y + 72, { align: 'center' });
    const words = s.chapters.map((c) => c.word.length);
    const letters = s.chapters.map((c) => c.word).join('').split('');
    const total = letters.length;
    const size = Math.min(34, (box.w - 30) / (total * 1.18 + (words.length - 1) * 0.8));
    this.letterBoxes(cx, box.y + 86, words, size, { letters });
    let y = box.y + 86 + size + 36;
    this.font('Fell', 12, C.ink);
    s.chapters.forEach((c, ci) => {
      this.text(`Chapter ${NUMBER_WORDS[ci]} (${c.name}): ${c.word}`, cx, y, { align: 'center' });
      y += 18;
    });
    y += 14;
    // Solutions, four per page (spec section 2); the first page fits its four under the code.
    const cw = box.w / 2;
    const drawSolution = (i, x, top, ch) => {
      const p = g.puzzles[i];
      this.font('FellSC', 12, C.red);
      const slot = g.slots[i];
      this.text(slot.kind === 'piece' ? `Piece ${i + 1} · goes at ${slot.label}` : `Puzzle ${i + 1} · Letter ${p.letter}${p.reverse ? ' (reverse)' : ''}`, x + cw / 2, top + 14, { align: 'center' });
      const cell = Math.min((cw - 36) / p.W, (ch - 34) / p.H);
      this.grid(p, x + (cw - cell * p.W) / 2, top + 24, cell, { shade: true, loop: true });
    };
    let i = 0, top = y;
    for (;;) {
      const ch = (box.y + box.h - top) / 2;
      for (let k = 0; k < 4 && i < g.puzzles.length; k++) drawSolution(i++, box.x + (k % 2) * cw, top + Math.floor(k / 2) * ch, ch);
      if (i >= g.puzzles.length) break;
      box = this.newPage({ host: true });
      top = box.y;
    }
    if (root.PdfPro && s.chapters.some(isMosaic)) root.PdfPro.answerPictures(this);
  };

  B.certificatePage = function () {
    const g = this.g, s = g.story, doc = this.doc;
    const landscape = !this.paper.kdp;
    const box = this.newPage({ landscape, noFooter: true });
    const cx = this.geo.W / 2;
    const f = this.geo.frame;
    doc.setDrawColor(...C.brown); doc.setLineWidth(0.8);
    doc.rect(f.x + 12, f.y + 12, f.w - 24, f.h - 24);
    // Content block is laid out top-down, then the fields sit near the bottom.
    let y = box.y + (landscape ? 40 : box.h * 0.12);
    this.font('FellSC', 15, C.brown);
    this.text(s.title, cx, y, { align: 'center' });
    this.font('Fell', landscape ? 46 : 38, C.ink);
    this.text('Certificate of Completion', cx, y + 54, { align: 'center' });
    this.divider(cx, y + 74, 240);
    this.motif(g.motif, cx, y + 112, 40, C.tan);
    this.font('Fell', 17, C.ink, 'italic');
    this.text('This certifies that', cx, y + 162, { align: 'center' });
    doc.setDrawColor(...C.brown); doc.setLineWidth(0.8);
    doc.line(cx - 210, y + 212, cx + 210, y + 212);
    this.font('FellSC', 17, C.red);
    this.text(`of ${s.teamName}`, cx, y + 240, { align: 'center' });
    this.font('Fell', 15, C.ink, 'italic');
    this.para(s.certificate, box.x + 90, y + 276, box.w - 180, { align: 'center' });
    y = box.y + box.h - (landscape ? 30 : 90);
    const fields = ['Date', 'Time taken', 'Hints used'];
    const fw = Math.min(150, (box.w - 160) / 3);
    fields.forEach((label, k) => {
      const fx = cx - fw * 1.5 + k * fw - (landscape ? 40 : 0);
      doc.setDrawColor(...C.brown); doc.line(fx + 14, y, fx + fw - 14, y);
      this.font('FellSC', 11, C.brown);
      this.text(label, fx + fw / 2, y + 16, { align: 'center' });
    });
    // Seal.
    const sx = box.x + box.w - 60, sy = box.y + box.h - 40;
    doc.setDrawColor(...C.red); doc.setLineWidth(1.6);
    doc.circle(sx, sy, 42, 'S');
    doc.setLineWidth(0.7);
    doc.circle(sx, sy, 36, 'S');
    this.motif(g.motif, sx, sy - 6, 30, C.red);
    this.font('FellSC', 11, C.red);
    this.text('Escaped', sx, sy + 22, { align: 'center' });
    this.font('Fell', 10, C.brown, 'italic');
    this.text(`© ${g.shop || 'Your Shop Name'}`, box.x, box.y + box.h + 6);
    // Bundle games: the certificate hands over this game's letter of the bundle's Master Code.
    if (g.bundleLetter) {
      // Top-left corner: clear of the centred title and of the fields along the bottom.
      const lx = box.x + 14, ly = box.y + 14;
      doc.setDrawColor(...C.red); doc.setLineWidth(1.2);
      doc.rect(lx, ly, 30, 34);
      this.font('Digits', 20, C.red);
      this.text(g.bundleLetter, lx + 15, ly + 25, { align: 'center' });
      this.font('FellSC', 10.5, C.red);
      this.text('Master Code', lx + 38, ly + 14);
      this.font('Fell', 9.5, C.brown, 'italic');
      this.text(`letter ${g.bundleIndex} of ${g.bundleTotal}`, lx + 38, ly + 28);
    }
  };

  // ------------------------------------------------------------------ build
  // game: { story, puzzles, slots, example, paper, inkSaver, motif, shop, audience,
  //         audienceLong, minutes:[lo,hi], seed }
  async function build(game, onProgress, opts = {}) {
    const progress = onProgress || (() => {});
    const tick = () => new Promise((r) => setTimeout(r, 0));
    const { jsPDF } = root.jspdf;
    const paper = PAPERS[game.paper] || PAPERS.letter;

    progress(0.02, 'Loading fonts');
    const fonts = await loadFonts(opts.fontBase || 'assets/fonts/');

    const textures = { portrait: [], landscape: [] };
    if (!game.inkSaver) {
      progress(0.06, 'Ageing the paper');
      const px = 900;
      for (let k = 0; k < 4; k++) {
        textures.portrait.push({ data: root.Paper.texture(px, Math.round(px * paper.h / paper.w), 1000 + k * 77 + game.seed.length), alias: 'paper' + k });
        await tick();
      }
      textures.landscape.push({ data: root.Paper.texture(Math.round(px * paper.h / paper.w), px, 4242), alias: 'paperL' });
    }

    let result = await render(game, fonts, textures, paper, jsPDF, 2, progress, tick);
    if (result.guideUsed > 2) result = await render(game, fonts, textures, paper, jsPDF, result.guideUsed, progress, tick);
    progress(1, 'Done');
    return result.doc;
  }

  // Letter chapters: intro + one page per puzzle. PRO supplies the Mosaic layout.
  function chapterPageCount(game, ci) {
    const c = game.story.chapters[ci];
    return isMosaic(c) ? root.PdfPro.chapterPages(game, ci) : 1 + c.word.length;
  }

  async function render(game, fonts, textures, paper, jsPDF, guidePages, progress, tick) {
    const doc = new jsPDF({ unit: 'pt', format: [paper.w, paper.h], orientation: 'portrait', compress: true });
    fonts.forEach((f) => { doc.addFileToVFS(f.file, f.data); doc.addFont(f.file, f.name, f.style); });
    doc.setProperties({ title: game.story.title, subject: 'Printable escape game', creator: game.shop || '', author: game.shop || '' });
    const b = new Builder(game, doc, textures);
    const s = game.story;

    // Page numbers for the host guide, computed from the fixed page order.
    const n = game.puzzles.length;
    const chapterPages = s.chapters.reduce((t, c, ci) => t + chapterPageCount(game, ci), 0);
    const playerTo = 4 + chapterPages + 1;
    game.guidePages = guidePages;
    const qPages = Math.ceil(s.questions.length / 10);
    const cardPages = Math.ceil(n * 2 / 6);
    const guideFrom = playerTo + 1;
    const qFrom = guideFrom + guidePages;
    const cardsFrom = qFrom + qPages;
    const answersFrom = cardsFrom + cardPages;
    const answerPages = Math.ceil(n / 4) + (s.chapters.some(isMosaic) ? 1 : 0);
    const range = (a, cnt) => (cnt > 1 ? `pages ${a}-${a + cnt - 1}` : `page ${a}`);
    game.pageMap = {
      playerFrom: 1, playerTo, guide: range(guideFrom, guidePages), questions: range(qFrom, qPages),
      cards: range(cardsFrom, cardPages), answers: range(answersFrom, answerPages),
      certificate: answersFrom + answerPages
    };

    const steps = [
      ['Cover', () => b.coverPage()],
      ['Prologue', () => b.prologuePage()],
      ['How to Play', () => b.howToPlayPage()],
      ['Code Sheet', () => b.codeSheetPage()]
    ];
    let idx = 0;
    s.chapters.forEach((c, ci) => {
      steps.push([`Chapter ${ci + 1}`, () => b.chapterIntroPage(ci)]);
      if (isMosaic(c)) {
        idx += game.slots.filter((sl) => sl.chapter === ci).length;
        steps.push([`Chapter ${ci + 1} pieces`, () => root.PdfPro.chapter(b, ci)]);
        return;
      }
      for (let k = 0; k < c.word.length; k++) { const i = idx++; steps.push([`Puzzle ${i + 1}`, () => b.puzzlePage(i)]); }
    });
    steps.push(['Final Lock', () => b.finalLockPage()]);
    steps.push(['Host guide', () => b.hostGuide()]);
    steps.push(['Hint questions', () => b.questionPages()]);
    steps.push(['Hint cards', () => b.hintCardPages()]);
    steps.push(['Answer key', () => b.answerPages()]);
    steps.push(['Certificate', () => b.certificatePage()]);
    // PRO: the Party Kit is its own PDF, built with the same page styles.
    if (game.customSteps) { steps.length = 0; game.customSteps(b, steps); }

    for (let k = 0; k < steps.length; k++) {
      progress(0.1 + 0.88 * k / steps.length, steps[k][0]);
      steps[k][1]();
      await tick();
    }
    return { doc, guideUsed: b.guideUsed };
  }

  root.PdfBuilder = { build, PAPERS, shuffleAnswers, Builder, C, NUMBER_WORDS, loadFonts };
})(typeof self !== 'undefined' ? self : globalThis);
