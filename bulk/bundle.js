// Bundle Creator (OTO2, spec 12.2). Builds every chosen game from its saved project, adds bundle pages
// (cover, contents, how to use, Master Code card and certificate, host answer) and packs the result
// as one PDF, a ZIP of PDFs, or a KDP book with every host page moved to the back.
'use strict';
(function () {
  const { games: GAMES, defaults: DEFAULTS, pro: PRO } = window.BUNDLE;
  const PB = window.PdfBuilder, C = PB.C;
  const MIN_GAMES = 3, MAX_GAMES = 12;
  const ETSY_FILES = 5, ETSY_MB = 20, KDP_MIN_PAGES = 24;
  const PRESETS = {
    easy: { audience: 'Kids 11-13', long: 'children aged 11 to 13', minutes: [4, 6] },
    medium: { audience: 'Teens 14-17', long: 'teenagers aged 14 to 17', minutes: [5, 8] },
    hard: { audience: 'Adults', long: 'adults', minutes: [8, 12] }
  };
  const isMosaic = (c) => !!c && c.type === 'mosaic';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fileTitle = (t) => (t || 'Game').replace(/[^A-Za-z0-9 ]+/g, ' ').trim().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('-') || 'Game';
  const codeOf = (g) => (g.data && g.data.story ? g.data.story.chapters.map((c) => c.word).join(' ') : g.code || '');

  // Order of the games in the bundle: ids, in the seller's order.
  let order = [];
  let running = false;

  // ---------------------------------------------------------------- game list
  function usable(g) {
    if (!g.ready || !g.data || !g.data.story) return 'puzzles not built yet';
    if (g.data.story.chapters.some(isMosaic) && !PRO) return 'Mosaic game: needs SlitherEscape PRO';
    return '';
  }

  function renderGames() {
    const byId = Object.fromEntries(GAMES.map((g) => [g.id, g]));
    const picked = order.map((id) => byId[id]);
    const rest = GAMES.filter((g) => !order.includes(g.id));
    const row = (g, k) => {
      const why = usable(g);
      const on = k >= 0;
      const p = PRESETS[g.difficulty] || PRESETS.medium;
      return `<li class="bd-game${on ? ' on' : ''}${why ? ' off' : ''}">
        <label><input type="checkbox" data-pick="${g.id}"${on ? ' checked' : ''}${why ? ' disabled' : ''}>
          ${on ? `<span class="bd-num">${k + 1}</span>` : ''}<b>${esc(g.title)}</b></label>
        <span class="small muted">${esc(codeOf(g))} · ${esc(p.audience)} · ${g.puzzles} puzzles${why ? ` · <span class="bd-why">${esc(why)}</span>` : ''}</span>
        ${on ? `<span class="bd-move"><button class="icon-btn" data-up="${g.id}" title="Move up"${k === 0 ? ' disabled' : ''}>&uarr;</button><button class="icon-btn" data-down="${g.id}" title="Move down"${k === picked.length - 1 ? ' disabled' : ''}>&darr;</button></span>` : ''}
      </li>`;
    };
    $('bd-games').innerHTML = GAMES.length
      ? `<ul class="bd-list">${picked.map((g, k) => row(g, k)).join('')}${rest.map((g) => row(g, -1)).join('')}</ul>`
      : '<p class="muted">You have no saved games yet. Make a few games first, then come back to bundle them.</p>';
    renderChecks();
  }

  $('bd-games').addEventListener('click', (e) => {
    const up = e.target.closest('[data-up]'), down = e.target.closest('[data-down]');
    if (!up && !down) return;
    const id = +(up || down).dataset[up ? 'up' : 'down'];
    const i = order.indexOf(id), j = i + (up ? -1 : 1);
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    renderGames();
  });
  $('bd-games').addEventListener('change', (e) => {
    const box = e.target.closest('[data-pick]');
    if (!box) return;
    const id = +box.dataset.pick;
    order = box.checked ? order.concat(id) : order.filter((x) => x !== id);
    renderGames();
  });

  // ---------------------------------------------------------------- checks
  function settings() {
    const format = $('bd-format').value;
    return {
      name: $('bd-name').value.trim(),
      format,
      paper: format === 'kdp' ? 'kdp' : $('bd-paper').value,
      inkSaver: $('bd-print').value === 'ink',
      master: $('bd-master').value.toUpperCase().replace(/[^A-Z]/g, ''),
      games: order.map((id) => GAMES.find((g) => g.id === id))
    };
  }

  function problems(st) {
    const errs = [], warns = [];
    if (!st.name) errs.push('Give the bundle a name.');
    if (st.games.length < MIN_GAMES) errs.push(`Choose at least ${MIN_GAMES} games (${st.games.length} chosen).`);
    if (st.games.length > MAX_GAMES) errs.push(`A bundle holds at most ${MAX_GAMES} games (${st.games.length} chosen).`);
    const codes = {};
    st.games.forEach((g) => { const c = codeOf(g); (codes[c] = codes[c] || []).push(g.title); });
    Object.entries(codes).filter(([, t]) => t.length > 1).forEach(([c, t]) => errs.push(`Two games share the secret code ${c}: ${t.join(' and ')}. Change the code in one of them.`));
    const titles = {};
    st.games.forEach((g) => { titles[g.title] = (titles[g.title] || 0) + 1; });
    Object.entries(titles).filter(([, n]) => n > 1).forEach(([t]) => errs.push(`Two games are both called "${t}". Rename one of them in the editor.`));
    if (st.games.length && st.master.length !== st.games.length) errs.push(`The Master Code needs exactly ${st.games.length} letters, one per game (it has ${st.master.length}).`);
    if (st.format === 'zip' && st.games.length + 1 > ETSY_FILES) warns.push(`Etsy allows ${ETSY_FILES} files per listing; this ZIP holds ${st.games.length + 1} PDFs. Upload the ZIP itself, or choose "one PDF with every game".`);
    if (new Set(st.games.map((g) => g.difficulty)).size > 1) warns.push('The games have different difficulty levels. That suits a difficulty ladder; for a family set, check the ages on each cover.');
    return { errs, warns };
  }

  function renderChecks() {
    if (running) return;
    const st = settings();
    const n = st.games.length;
    $('bd-master-count').textContent = n ? `${st.master.length}/${n} letters` : '';
    $('bd-paper-field').classList.toggle('hidden', st.format === 'kdp');
    const { errs, warns } = problems(st);
    $('bd-checks').innerHTML = errs.map((e) => `<div class="alert err">${esc(e)}</div>`).join('') + warns.map((w) => `<div class="alert info">${esc(w)}</div>`).join('');
    $('bd-run').disabled = errs.length > 0;
    $('bd-run').textContent = n ? `Make the bundle (${n} games)` : 'Make the bundle';
  }
  ['bd-name', 'bd-master'].forEach((id) => $(id).addEventListener('input', renderChecks));
  ['bd-format', 'bd-paper', 'bd-print'].forEach((id) => $(id).addEventListener('change', renderChecks));

  // ---------------------------------------------------------------- one game, from its saved project
  let worker = null, jobId = 0;
  const waiting = new Map();
  function example(seed) {
    if (!worker) {
      worker = new Worker('assets/js/engine/worker.js?v=' + encodeURIComponent(window.ASSET_VERSION || ''));
      worker.onmessage = (e) => { const h = waiting.get(e.data.id); if (!h) return; waiting.delete(e.data.id); e.data.type === 'example' ? h.resolve(e.data.example) : h.reject(new Error(e.data.message)); };
    }
    return new Promise((resolve, reject) => {
      const id = ++jobId;
      waiting.set(id, { resolve, reject });
      worker.postMessage({ type: 'example', id, seed: seed + '-example' });
    });
  }

  function slotsOf(data) {
    const out = [];
    let title = 0;
    data.story.chapters.forEach((c, ci) => {
      if (isMosaic(c)) {
        const plan = (data.mosaics || {})[ci];
        (plan ? plan.pieces : []).forEach((p) => out.push({ kind: 'piece', chapter: ci, slot: p.slot, label: p.label, showLabel: p.showLabel, mask: p.mask }));
        return;
      }
      c.word.split('').forEach((ch, li) => out.push({ kind: 'letter', letter: ch, chapter: ci, pos: li, len: c.word.length, titleIndex: title++ }));
    });
    return out;
  }

  // Same picture-and-decoys rule as the editor's Answer Board.
  function answerBoards(data) {
    const lib = window.ProLibrary || [];
    const used = data.story.chapters.filter(isMosaic).map((c) => c.word);
    const r = window.Generator.rng(data.settings.seed + '-board');
    const boards = {};
    data.story.chapters.forEach((c, ci) => {
      if (!isMosaic(c)) return;
      const img = lib.find((m) => m.name === c.word);
      if (!img) throw new Error(`the picture ${c.word} is no longer in the library`);
      const size = data.settings.difficulty === 'hard' ? 8 : 6;
      const free = lib.filter((m) => !used.includes(m.name));
      const near = free.filter((m) => (img.similar || []).includes(m.name));
      const theme = r.shuffle(free.filter((m) => m.theme === img.theme && !near.includes(m)));
      const rest = r.shuffle(free.filter((m) => m.theme !== img.theme && !near.includes(m)));
      boards[ci] = r.shuffle([img].concat(near, theme, rest).slice(0, size));
      if (!boards[ci].includes(img)) boards[ci][0] = img;
      boards[ci] = boards[ci].map((m) => (m === img ? Object.assign({}, m, { rows: window.Mosaic.assembledRows(data.mosaics[ci]) }) : m));
    });
    return boards;
  }

  async function gameOf(g, st, k) {
    const data = g.data;
    const slots = slotsOf(data);
    const puzzles = data.puzzles || [];
    const bad = slots.length !== puzzles.length || puzzles.some((p, i) => !p || !p.verify || !p.verify.ok || !p.verify.unique || (slots[i].kind === 'letter' && p.letter !== slots[i].letter));
    if (bad) throw new Error('some puzzles are missing or failed their checks; open the game and use "New puzzles"');
    const set = data.settings;
    const p = PRESETS[set.difficulty] || PRESETS.medium;
    const theme = window.Themes.theme(data.themeId);
    const motif = set.motif && set.motif !== 'auto' ? set.motif : (theme ? theme.motif : 'key');
    const hasMosaic = data.story.chapters.some(isMosaic);
    return {
      story: data.story, puzzles, slots, mosaics: data.mosaics || {},
      answerBoards: hasMosaic ? answerBoards(data) : {},
      partyKit: false, kit: {},
      example: await example(set.seed),
      paper: st.paper, inkSaver: st.inkSaver, motif, shop: DEFAULTS.shop,
      audience: p.audience, audienceLong: p.long,
      minutes: [p.minutes[0] * slots.length, p.minutes[1] * slots.length],
      seed: set.seed,
      bundleLetter: st.master[k], bundleIndex: k + 1, bundleTotal: st.games.length, bundleName: st.name
    };
  }

  // ---------------------------------------------------------------- bundle pages
  // Drawn with the game builder, so fonts, paper and ornaments match the games exactly.
  function bundlePages(st, built, motif, which) {
    const n = built.length;
    const steps = (b, list) => {
      const g = b.g, doc = b.doc;
      // Closing pages come from their own small PDF, so a page number there would restart at 1.
      const plainFooter = () => {
        const f = b.geo.frame;
        b.font('Fell', 8.5, C.brown, 'italic');
        b.text(`© ${DEFAULTS.shop || 'Your Shop Name'} · ${st.name}`, f.x + 26, f.y + f.h - 14);
      };
      const front = () => {
        list.push(['Bundle cover', () => {
          const box = b.newPage({ noFooter: true });
          const cx = b.geo.W / 2;
          let y = box.y + box.h * 0.13;
          b.font('FellSC', 13, C.brown);
          b.text('A Slitherlink Escape Collection', cx, y, { align: 'center' });
          b.divider(cx, y + 16, 170);
          b.font('Fell', 42, C.ink);
          y = b.para(st.name, box.x + 20, y + 68, box.w - 40, { align: 'center', lineHeight: 1.08 });
          b.font('Fell', 17, C.brown, 'italic');
          b.text(`${n} complete escape games · one Master Code`, cx, y + 14, { align: 'center' });
          b.motif(motif, cx, y + 92, 90, C.brown);
          y += 168;
          b.font('Fell', 14, C.ink);
          built.forEach((x, i) => { b.text(`${i + 1}. ${x.game.story.title}`, cx, y + i * 21, { align: 'center' }); });
          b.font('Fell', 11, C.brown);
          b.text(`© ${DEFAULTS.shop || 'Your Shop Name'}`, cx, box.y + box.h + 18, { align: 'center' });
        }]);
        list.push(['Contents', () => {
          const box = b.newPage();
          const cx = b.geo.W / 2;
          b.font('Fell', 30, C.ink);
          b.text('Contents', cx, box.y + 24, { align: 'center' });
          b.divider(cx, box.y + 40, 160);
          let y = box.y + 84;
          built.forEach((x, i) => {
            const gm = x.game;
            b.font('FellSC', 15, C.red);
            b.text(`Game ${i + 1}`, box.x + 10, y);
            b.font('Fell', 16, C.ink);
            b.text(gm.story.title, box.x + 90, y);
            b.font('Fell', 11.5, C.brown, 'italic');
            b.text(`${gm.audience} · ${gm.puzzles.length} puzzles · ${gm.minutes[0]}-${gm.minutes[1]} minutes · ${x.pages} pages`, box.x + 90, y + 16);
            y += Math.min(46, (box.h - 150) / n);
          });
          y += 10;
          b.font('Fell', 12.5, C.ink);
          b.para(st.format === 'kdp'
            ? 'After the games: the Master Code certificate, then the Host Section with every game\'s host guide, hint questions, hint cards and answer key.'
            : 'Each game is complete on its own pages: player pages first, then the pages for the Game Host. The Master Code certificate and its answer come at the very end.', box.x + 10, y, box.w - 20);
        }]);
        list.push(['How to use this bundle', () => {
          const box = b.newPage();
          const cx = b.geo.W / 2;
          b.font('Fell', 28, C.ink);
          b.text('How to Use This Bundle', cx, box.y + 24, { align: 'center' });
          b.divider(cx, box.y + 40, 180);
          let y = box.y + 76;
          const items = [
            ['Play the games in any order', `Every game is a complete escape game with its own story, puzzles, hints and answer key. Print one game at a time; the Game Host keeps the host pages of that game.`],
            ['Collect the Master Code', `Each game's certificate shows one secret letter of the Master Code. Write it in the matching box of the Master Code card: game 1 gives letter 1, game 2 gives letter 2, and so on.`],
            ['Open the final lock', `When all ${n} letters are on the card, read the Master Code out loud to the Game Host. If it is right, the Host awards the Master Code certificate.`],
            ['For the Game Host', `The Master Code and which game gives each letter are on the last page${st.format === 'kdp' ? ' of the Host Section' : ''}. Keep it away from the players.`]
          ];
          items.forEach(([h, t]) => {
            b.font('FellSC', 15, C.red);
            b.text(h, box.x + 10, y);
            b.font('Fell', 13, C.ink);
            y = b.para(t, box.x + 10, y + 18, box.w - 20) + 16;
          });
        }]);
        list.push(['Master Code card', () => {
          const box = b.newPage();
          const cx = b.geo.W / 2;
          b.font('Fell', 30, C.ink);
          b.text('Master Code Card', cx, box.y + 24, { align: 'center' });
          b.divider(cx, box.y + 40, 170);
          b.font('Fell', 13.5, C.ink, 'italic');
          let y = b.para('Finish a game, then copy the letter from its certificate into the box with the same number.', box.x + 40, box.y + 74, box.w - 80, { align: 'center' });
          const size = Math.min(46, (box.w - 40) / (n * 1.2));
          b.letterBoxes(cx, y + 30, [n], size);
          const step = size * 1.18, x0 = cx - (n * step - (step - size)) / 2;
          b.font('FellSC', 11, C.brown);
          for (let i = 0; i < n; i++) b.text(`Game ${i + 1}`, x0 + i * step + size / 2, y + 30 + size + 16, { align: 'center' });
          y += size + 90;
          built.forEach((x, i) => {
            b.font('Fell', 12, C.ink);
            b.text(`${i + 1}. ${x.game.story.title}`, box.x + 60, y + i * 19);
          });
          b.motif(motif, cx, box.y + box.h - 60, 60, C.tan);
        }]);
      };
      const back = (target) => {
        target.push(['Master certificate', () => {
          const landscape = !b.paper.kdp;
          const box = b.newPage({ landscape, noFooter: true });
          const cx = b.geo.W / 2, f = b.geo.frame;
          doc.setDrawColor(...C.brown); doc.setLineWidth(0.8);
          doc.rect(f.x + 12, f.y + 12, f.w - 24, f.h - 24);
          let y = box.y + (landscape ? 40 : box.h * 0.12);
          b.font('FellSC', 15, C.brown);
          b.text(st.name, cx, y, { align: 'center' });
          b.font('Fell', landscape ? 44 : 36, C.ink);
          b.text('Master Code Certificate', cx, y + 54, { align: 'center' });
          b.divider(cx, y + 74, 260);
          b.motif(motif, cx, y + 112, 40, C.tan);
          b.font('Fell', 17, C.ink, 'italic');
          b.text('This certifies that', cx, y + 162, { align: 'center' });
          doc.setDrawColor(...C.brown); doc.line(cx - 210, y + 212, cx + 210, y + 212);
          b.font('Fell', 15, C.ink, 'italic');
          b.para(`escaped all ${n} games of ${st.name} and cracked the Master Code.`, box.x + 90, y + 244, box.w - 180, { align: 'center' });
          const fy = box.y + box.h - (landscape ? 30 : 90);
          doc.line(cx - 120, fy, cx + 120, fy);
          b.font('FellSC', 11, C.brown);
          b.text('Date', cx, fy + 16, { align: 'center' });
        }]);
        target.push(['Master Code answer', () => {
          const box = b.newPage({ host: true, noFooter: true });
          plainFooter();
          const cx = b.geo.W / 2;
          b.font('Fell', 28, C.ink);
          b.text('Master Code Answer', cx, box.y + 24, { align: 'center' });
          b.divider(cx, box.y + 40, 170);
          const size = Math.min(40, (box.w - 40) / (n * 1.2));
          b.letterBoxes(cx, box.y + 70, [n], size, { letters: st.master.split('') });
          let y = box.y + 70 + size + 40;
          built.forEach((x, i) => {
            b.font('Fell', 13, C.ink);
            b.text(`Letter ${i + 1}: ${st.master[i]}  ·  ${x.game.story.title} (printed on its certificate)`, box.x + 20, y + i * 20);
          });
          y += n * 20 + 20;
          b.font('Fell', 12.5, C.ink, 'italic');
          b.para('When the players read this code to you, award the Master Code certificate.', box.x + 20, y, box.w - 40);
        }]);
      };
      const hostDivider = () => list.push(['Host section', () => {
        const box = b.newPage({ host: true, noFooter: true });
        plainFooter();
        const cx = b.geo.W / 2;
        b.font('FellSC', 14, C.red);
        b.text('Stop! For the Game Host only', cx, box.y + box.h * 0.36, { align: 'center' });
        b.font('Fell', 40, C.ink);
        b.text('Host Section', cx, box.y + box.h * 0.36 + 56, { align: 'center' });
        b.divider(cx, box.y + box.h * 0.36 + 76, 200);
        b.font('Fell', 13, C.brown, 'italic');
        b.para('Host guides, hint questions, hint cards and answer keys for every game, in bundle order. Players: no peeking!', box.x + 60, box.y + box.h * 0.36 + 110, box.w - 120, { align: 'center' });
      }]);
      if (which === 'front') front();
      if (which === 'back') back(list);
      if (which === 'host-divider') hostDivider();
      // KDP books split the two closing pages: the certificate with the players, the answer at the back.
      if (which === 'player-back' || which === 'host-back') { const l = []; back(l); list.push(l[which === 'player-back' ? 0 : 1]); }
    };
    return {
      story: { title: st.name, chapters: [], questions: [] }, puzzles: [], paper: st.paper, inkSaver: st.inkSaver,
      motif, shop: DEFAULTS.shop, seed: 'bundle-' + st.name, customSteps: steps
    };
  }

  async function pagesPdf(st, built, motif, which) {
    const doc = await PB.build(bundlePages(st, built, motif, which));
    return new Uint8Array(doc.output('arraybuffer'));
  }

  // ---------------------------------------------------------------- packing
  async function merge(parts, paper) {
    const { PDFDocument } = window.PDFLib;
    const out = await PDFDocument.create();
    const cache = new Map();
    for (const part of parts) {
      if (part.blank) { out.addPage([paper.w, paper.h]); continue; }
      if (!cache.has(part.bytes)) cache.set(part.bytes, await PDFDocument.load(part.bytes));
      const src = cache.get(part.bytes);
      const idx = part.pages || src.getPageIndices();
      // KDP: a page built as a right-hand (odd) page must land on an odd page of the book, or its gutter flips.
      if (part.align) {
        const next = out.getPageCount() + 1;
        if (next % 2 !== part.align % 2) out.addPage([paper.w, paper.h]);
      }
      (await out.copyPages(src, idx)).forEach((p) => out.addPage(p));
    }
    out.setTitle(parts.title || '');
    out.setAuthor(DEFAULTS.shop || '');
    return { bytes: await out.save(), pages: out.getPageCount() };
  }

  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a - 1 + i); // 1-based inclusive -> indices

  async function run() {
    const st = settings();
    if (problems(st).errs.length || running) return;
    running = true;
    $('bd-run').disabled = true;
    $('bd-progress').classList.remove('hidden');
    $('bd-result').innerHTML = '';
    const fill = $('bd-fill'), stat = $('bd-status'), cnt = $('bd-count');
    const total = st.games.length + 2;
    const show = (step, f, text) => { const pct = 100 * (step + f) / total; fill.style.width = pct + '%'; stat.textContent = text; cnt.textContent = `${Math.round(pct)}%`; };
    try {
      const paper = PB.PAPERS[st.paper];
      const built = [];
      for (const [k, g] of st.games.entries()) {
        try {
          const game = await gameOf(g, st, k);
          const doc = await PB.build(game, (f, t) => show(k, f, `Game ${k + 1} of ${st.games.length}: ${g.title} · ${t}`));
          built.push({ game, bytes: new Uint8Array(doc.output('arraybuffer')), pages: doc.getNumberOfPages(), map: game.pageMap });
        } catch (e) {
          throw new Error(`${g.title}: ${e.message}`);
        }
      }
      const motif = built[0].game.motif;
      show(st.games.length, 0, 'Bundle cover, contents and Master Code pages');
      const front = await pagesPdf(st, built, motif, 'front');
      const base = fileTitle(st.name);
      const files = [];
      if (st.format === 'kdp') {
        const certOnly = await pagesPdf(st, built, motif, 'player-back');
        const divider = await pagesPdf(st, built, motif, 'host-divider');
        const answer = await pagesPdf(st, built, motif, 'host-back');
        const parts = [{ bytes: front, align: 1 }];
        // Player part: every game's player pages and certificate; each game starts on a right-hand page.
        built.forEach((x) => {
          parts.push({ bytes: x.bytes, pages: range(1, x.map.playerTo), align: 1 });
          parts.push({ bytes: x.bytes, pages: [x.map.certificate - 1], align: x.map.certificate });
        });
        parts.push({ bytes: certOnly, align: 1 });
        parts.push({ bytes: divider, align: 1 });
        // Host part: each game's host pages (guide to answer key), keeping their own page parity.
        built.forEach((x) => parts.push({ bytes: x.bytes, pages: range(x.map.playerTo + 1, x.map.certificate - 1), align: x.map.playerTo + 1 }));
        parts.push({ bytes: answer, align: 1 });
        parts.title = st.name;
        show(st.games.length + 1, 0, 'Putting the book together');
        const book = await merge(parts, paper);
        files.push({ name: `${base}_KDP-8.5x11.pdf`, bytes: book.bytes, pages: book.pages });
      } else if (st.format === 'single') {
        const back = await pagesPdf(st, built, motif, 'back');
        const parts = [{ bytes: front }, ...built.map((x) => ({ bytes: x.bytes })), { bytes: back }];
        parts.title = st.name;
        show(st.games.length + 1, 0, 'Putting the bundle together');
        const one = await merge(parts, paper);
        files.push({ name: `${base}_${st.paper === 'a4' ? 'A4' : 'Letter'}${st.inkSaver ? '_Ink-Saver' : ''}.pdf`, bytes: one.bytes, pages: one.pages });
      } else {
        const back = await pagesPdf(st, built, motif, 'back');
        const start = await merge(Object.assign([{ bytes: front }, { bytes: back }], { title: st.name }), paper);
        files.push({ name: `00_${base}_Start-Here.pdf`, bytes: start.bytes, pages: start.pages });
        built.forEach((x, i) => files.push({ name: `${String(i + 1).padStart(2, '0')}_${fileTitle(x.game.story.title)}.pdf`, bytes: x.bytes, pages: x.pages }));
      }

      // Marketplace limits (spec 12.2): Etsy 20 MB per file, KDP at least 24 pages.
      const notes = [];
      files.forEach((f) => { const mb = f.bytes.length / 1048576; if (st.format !== 'kdp' && mb > ETSY_MB) notes.push(`${f.name} is ${mb.toFixed(1)} MB, over Etsy's ${ETSY_MB} MB per file. Choose "one PDF per game" or the ink saver print style.`); });
      if (st.format === 'kdp' && files[0].pages < KDP_MIN_PAGES) notes.push(`KDP needs at least ${KDP_MIN_PAGES} pages; this book has ${files[0].pages}.`);

      show(st.games.length + 1, 0.8, 'Saving');
      let blob, name;
      if (files.length === 1) {
        blob = new Blob([files[0].bytes], { type: 'application/pdf' });
        name = files[0].name;
      } else {
        const zip = new JSZip();
        files.forEach((f) => zip.file(f.name, f.bytes));
        blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
        name = `${base}_bundle.zip`;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      fill.style.width = '100%'; cnt.textContent = '';
      stat.textContent = 'Bundle ready';
      $('bd-result').innerHTML = `<div class="alert ok">Downloaded <b>${esc(name)}</b> (${(blob.size / 1048576).toFixed(1)} MB). <a href="${url}" download="${esc(name)}">Download again</a></div>
        <ul class="bv-list">${files.map((f) => `<li>${esc(f.name)} · ${f.pages} pages · ${(f.bytes.length / 1048576).toFixed(1)} MB</li>`).join('')}</ul>
        ${notes.map((x) => `<div class="alert err">${esc(x)}</div>`).join('')}`;
    } catch (e) {
      console.error(e);
      stat.textContent = 'Could not make the bundle';
      $('bd-result').innerHTML = `<div class="alert err">${esc(e.message)}</div>`;
    } finally {
      running = false;
      renderChecks();
    }
  }
  $('bd-run').addEventListener('click', run);

  // Start: account paper and print style, then the list.
  if (DEFAULTS.paper === 'a4') $('bd-paper').value = 'a4';
  if (DEFAULTS.inkSaver) $('bd-print').value = 'ink';
  renderGames();
})();
