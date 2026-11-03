// SlitherEscape PRO: the Party Props Kit (spec section 11.1), a separate PDF in the same
// paper style. Every item ties into a real game mechanic and comes from the story.
(function (root) {
  'use strict';
  const { C, NUMBER_WORDS, build } = root.PdfBuilder;
  const ROMAN = ['I', 'II', 'III'];

  // Fixed powers per role; only the titles change with the theme.
  const POWERS = {
    leader: 'Speaks the code aloud at the Final Lock. Nobody else may say it.',
    scribe: 'The only player who writes on the Code Sheet.',
    hintKeeper: 'The only player who may ask the Host for a hint question, and who keeps the hint envelopes received.',
    timekeeper: 'Runs the 2-minute wait after a wrong answer and watches the total time.',
    codebreaker: 'Leads the puzzle solving. Everyone may solve, but you never stop.',
    assembler: 'Cuts out the picture pieces and glues them onto the Assembly Board.'
  };
  const DEFAULT_TITLES = { leader: 'Team Leader', scribe: 'Scribe', hintKeeper: 'Hint Keeper', timekeeper: 'Timekeeper', codebreaker: 'Codebreaker', assembler: 'Assembler' };

  const roleTitle = (g, k) => (g.story.party && g.story.party.roles[k]) || DEFAULT_TITLES[k];
  const reward = (g) => (g.story.party && g.story.party.reward) || `${g.story.teamName} Champion Pass`;
  const hasMosaic = (g) => g.story.chapters.some((c) => c.type === 'mosaic');
  const puzzleName = (g, i) => `${g.slots[i].kind === 'piece' ? 'Piece' : 'Puzzle'} ${i + 1}`;

  // One card per player. With fewer players than roles the extra duties are shared out in turn;
  // with more players, the extras are Codebreakers.
  function roleCards(g) {
    const order = ['leader', 'scribe'].concat(hasMosaic(g) ? ['assembler'] : [], ['hintKeeper', 'timekeeper', 'codebreaker']);
    const n = g.kit.players;
    const cards = Array.from({ length: n }, () => []);
    order.forEach((role, i) => cards[i % n].push(role));
    for (let i = order.length; i < n; i++) cards[i].push('codebreaker');
    return cards;
  }

  // Page with the variant code the spec asks for in the footer.
  function page(b, opts) {
    const box = b.newPage(opts);
    const f = b.geo.frame;
    b.font('Fell', 8, C.tan, 'italic');
    b.text(`Variant ${b.g.seed}`, f.x + f.w / 2, f.y + f.h - 14, { align: 'center' });
    return box;
  }

  function heading(b, box, title, note) {
    const cx = b.geo.W / 2;
    b.font('Fell', 26, C.ink);
    b.text(title, cx, box.y + 22, { align: 'center' });
    b.divider(cx, box.y + 36, 150);
    if (note) {
      b.font('Fell', 11, C.brown, 'italic');
      b.para(note, box.x + 30, box.y + 56, box.w - 60, { align: 'center' });
    }
    return box.y + (note ? 78 : 54);
  }

  function missionLetter(b) {
    const g = b.g, doc = b.doc;
    const box = page(b);
    const cx = b.geo.W / 2;
    const text = (g.story.party && g.story.party.letter) || `${g.story.mission} Pick up your Code Sheet and begin.`;
    b.font('FellSC', 13, C.brown);
    b.text('A letter for you', cx, box.y + 30, { align: 'center' });
    b.divider(cx, box.y + 46, 170);
    b.font('Fell', 15, C.ink);
    const y = b.para(text, box.x + 36, box.y + 88, box.w - 72, { lineHeight: 1.55 });
    // Wax seal.
    const sy = Math.min(y + 70, box.y + box.h - 60);
    doc.setFillColor(...C.red);
    doc.circle(cx, sy, 34, 'F');
    doc.setDrawColor(...C.white);
    doc.setLineWidth(1);
    doc.circle(cx, sy, 27, 'S');
    b.motif(g.motif, cx, sy, 30, C.white);
  }

  function doorSign(b) {
    const g = b.g;
    const box = page(b);
    const cx = b.geo.W / 2;
    b.motif(g.motif, cx, box.y + 90, 90, C.brown);
    b.font('FellSC', 14, C.red);
    b.text('Headquarters of', cx, box.y + 190, { align: 'center' });
    b.font('Fell', 44, C.ink);
    const y = b.para(g.story.teamName, box.x + 16, box.y + 244, box.w - 32, { align: 'center', lineHeight: 1.08 });
    b.divider(cx, y + 8, 210);
    b.font('Fell', 20, C.brown, 'italic');
    b.para(g.story.title, box.x + 30, y + 44, box.w - 60, { align: 'center' });
    b.font('FellSC', 13, C.red);
    b.text('Do not enter until the code is cracked', cx, box.y + box.h - 16, { align: 'center' });
  }

  function cutLines(b, box, cols, rows) {
    const doc = b.doc;
    doc.setDrawColor(...C.brown);
    doc.setLineWidth(0.6);
    doc.setLineDashPattern([4, 3], 0);
    for (let c = 1; c < cols; c++) doc.line(box.x + (box.w * c) / cols, box.y - 4, box.x + (box.w * c) / cols, box.y + box.h);
    for (let r = 1; r < rows; r++) doc.line(box.x - 8, box.y + (box.h * r) / rows, box.x + box.w + 8, box.y + (box.h * r) / rows);
    doc.setLineDashPattern([], 0);
  }

  function rolePages(b) {
    const g = b.g, doc = b.doc;
    const cards = roleCards(g);
    for (let k = 0; k < cards.length; k += 4) {
      const box = page(b);
      cutLines(b, box, 2, 2);
      const cw = box.w / 2, ch = box.h / 2;
      cards.slice(k, k + 4).forEach((roles, j) => {
        const x = box.x + (j % 2) * cw, y = box.y + (j >> 1) * ch;
        b.motif(g.motif, x + cw / 2, y + 34, 34, C.tan);
        b.font('FellSC', 15, C.red);
        const ty = b.para(roles.map((r) => roleTitle(g, r)).join(' & '), x + 14, y + 72, cw - 28, { align: 'center', lineHeight: 1.1 });
        doc.setDrawColor(...C.brown);
        doc.setLineWidth(0.7);
        doc.line(x + 26, ty + 24, x + cw - 26, ty + 24);
        b.font('Fell', 9, C.brown, 'italic');
        b.text('Your name', x + cw / 2, ty + 35, { align: 'center' });
        b.font('Fell', roles.length > 2 ? 9.5 : 11, C.ink);
        let py = ty + 54;
        roles.forEach((r) => { py = b.para(POWERS[r], x + 16, py, cw - 32, { align: 'center', lineHeight: 1.22 }) + 4; });
      });
    }
  }

  // A sheet of cut-out labels.
  function labelPages(b, title, labels, cols, rows, draw) {
    const per = cols * rows;
    for (let k = 0; k < labels.length; k += per) {
      const box = page(b);
      b.font('FellSC', 11, C.brown);
      b.text(title, b.geo.W / 2, box.y + 6, { align: 'center' });
      const area = { x: box.x, y: box.y + 16, w: box.w, h: box.h - 16 };
      cutLines(b, area, cols, rows);
      const cw = area.w / cols, ch = area.h / rows;
      labels.slice(k, k + per).forEach((l, j) => draw(l, area.x + (j % cols) * cw, area.y + Math.floor(j / cols) * ch, cw, ch));
    }
  }

  const teamList = (g) => (g.kit.play === 'teams' ? Array.from({ length: g.kit.teams }, (_, i) => i + 1) : [0]);

  function chapterLabels(b) {
    const g = b.g;
    const labels = [];
    teamList(g).forEach((team) => g.story.chapters.forEach((c, ci) => labels.push({ team, ci })));
    labelPages(b, 'Chapter envelopes: stick one on each envelope', labels, 1, 4, (l, x, y, w, h) => {
      const cx = x + w / 2;
      b.font('Fell', 25, C.ink);
      b.text(`Chapter ${ROMAN[l.ci]}`, cx, y + h / 2 - 14, { align: 'center' });
      b.font('Fell', 12.5, C.brown, 'italic');
      b.text(l.ci === 0 ? 'Open when the Host starts the game' : `Open only when the Host confirms Word ${l.ci}`, cx, y + h / 2 + 8, { align: 'center' });
      if (l.team) { b.font('FellSC', 11, C.red); b.text(`Team ${l.team}: ____________________`, cx, y + h / 2 + 30, { align: 'center' }); }
    });
  }

  function hintLabels(b) {
    const g = b.g;
    const labels = [];
    teamList(g).forEach((team) => g.puzzles.forEach((p, i) => [1, 2].forEach((hint) => labels.push({ team, i, hint }))));
    labelPages(b, 'Hint envelopes: one for each hint card', labels, 2, 5, (l, x, y, w, h) => {
      const cx = x + w / 2;
      b.font('FellSC', 14, C.red);
      b.text(`${puzzleName(g, l.i)} · Hint ${l.hint}`, cx, y + h / 2 - 8, { align: 'center' });
      b.font('Fell', 10, C.brown, 'italic');
      b.text('Open only after a correct answer', cx, y + h / 2 + 8, { align: 'center' });
      if (l.team) { b.font('Fell', 9.5, C.brown); b.text(`Team ${l.team}`, cx, y + h / 2 + 22, { align: 'center' }); }
    });
  }

  // Together mode: one fold-over sign per puzzle, placed around the room.
  function stationSigns(b) {
    const g = b.g, doc = b.doc;
    if (g.kit.play === 'teams') return;
    const items = g.puzzles.map((p, i) => i);
    for (let k = 0; k < items.length; k += 2) {
      const box = page(b);
      const h = box.h / 2;
      doc.setDrawColor(...C.brown);
      doc.setLineWidth(0.6);
      doc.setLineDashPattern([4, 3], 0);
      doc.line(box.x - 8, box.y + h, box.x + box.w + 8, box.y + h);
      doc.setLineDashPattern([1, 3], 0);
      [0, 1].forEach((j) => doc.line(box.x - 8, box.y + j * h + h / 2, box.x + box.w + 8, box.y + j * h + h / 2));
      doc.setLineDashPattern([], 0);
      items.slice(k, k + 2).forEach((i, j) => {
        // The upper half of each strip folds behind, so the sign stands on the table.
        const y = box.y + j * h, cx = b.geo.W / 2;
        const slot = g.slots[i];
        b.font('Fell', 9.5, C.brown, 'italic');
        b.text('Cut on the dashed line, fold back on the dotted line', cx, y + h / 2 - 8, { align: 'center' });
        b.font('FellSC', 11, C.brown);
        b.text(`Station · Chapter ${NUMBER_WORDS[slot.chapter]}`, cx, y + h / 2 + 22, { align: 'center' });
        b.font('Fell', 48, C.ink);
        b.text(String(i + 1), cx, y + h / 2 + 72, { align: 'center' });
        b.font('Fell', 15, C.brown, 'italic');
        const title = slot.kind === 'piece' ? `Picture piece ${i + 1}` : g.story.puzzleTitles[slot.titleIndex] || puzzleName(g, i);
        b.para(title, box.x + 30, y + h / 2 + 96, box.w - 60, { align: 'center' });
      });
    }
  }

  function scoreSheet(b) {
    const g = b.g, doc = b.doc;
    const box = page(b);
    const y0 = heading(b, box, 'Score Sheet', 'Fill one row per team. The last columns match the Certificate of Completion.');
    const cols = ['Team', 'Start', 'Hints received', 'Wrong answers', 'Penalty min', 'Unlocked at', 'Total time'];
    const widths = [0.24, 0.1, 0.14, 0.14, 0.12, 0.13, 0.13];
    const rows = g.kit.play === 'teams' ? g.kit.teams : 1;
    const rowH = 54;
    let x = box.x;
    doc.setDrawColor(...C.brown);
    doc.setLineWidth(0.8);
    cols.forEach((label, c) => {
      const w = box.w * widths[c];
      b.font('FellSC', 10, C.red);
      b.para(label, x + 3, y0 + 13, w - 6, { align: 'center', lineHeight: 1.05 });
      doc.rect(x, y0, w, 36);
      for (let r = 0; r < rows; r++) doc.rect(x, y0 + 36 + r * rowH, w, rowH);
      x += w;
    });
    b.font('Fell', 11, C.brown, 'italic');
    b.para('A wrong answer means a 2-minute wait before trying a different question. For extra tension, add a 2-minute penalty for every hint card received.', box.x + 20, y0 + 56 + rows * rowH, box.w - 40, { align: 'center' });
  }

  function treasure(b) {
    const g = b.g, doc = b.doc;
    const box = page(b);
    const cx = b.geo.W / 2;
    const h = box.h * 0.46;
    doc.setDrawColor(...C.brown);
    doc.setLineWidth(1.2);
    doc.roundedRect(box.x + 10, box.y + 8, box.w - 20, h - 12, 8, 8, 'S');
    b.motif('key', cx, box.y + 60, 56, C.brown);
    b.font('Fell', 32, C.ink);
    b.text('Treasure Box', cx, box.y + 124, { align: 'center' });
    b.font('FellSC', 15, C.red);
    b.text('Open with the Unlock Phrase', cx, box.y + 156, { align: 'center' });
    b.font('Fell', 12, C.brown, 'italic');
    b.text(g.story.title, cx, box.y + 180, { align: 'center' });
    // Reward cards: one per player.
    const n = 4;
    const top = box.y + h + 10, ch = (box.h - h - 10) / 2, cw = box.w / 2;
    cutLines(b, { x: box.x, y: top, w: box.w, h: ch * 2 }, 2, 2);
    for (let i = 0; i < n; i++) {
      const x = box.x + (i % 2) * cw, y = top + (i >> 1) * ch;
      b.motif(g.motif, x + cw / 2, y + 28, 26, C.tan);
      b.font('FellSC', 14, C.red);
      b.para(reward(g), x + 14, y + 60, cw - 28, { align: 'center', lineHeight: 1.1 });
      b.font('Fell', 10, C.brown, 'italic');
      b.text(`Awarded to ${g.story.teamName}`, x + cw / 2, y + ch - 14, { align: 'center' });
    }
  }

  function decorations(b) {
    const g = b.g, doc = b.doc;
    // Bunting spells the title, unless the title contains a word of the code.
    const code = g.story.chapters.map((c) => c.word);
    const title = g.story.title.toUpperCase();
    const safe = !code.some((w) => new RegExp(`\\b${w}S?\\b`).test(title));
    const letters = (safe ? title : 'ESCAPE').replace(/[^A-Z0-9]/g, '').slice(0, 24).split('');
    for (let k = 0; k < letters.length; k += 12) {
      const box = page(b);
      b.font('FellSC', 10, C.brown);
      b.text('Bunting: cut out the flags and hang them on a string', b.geo.W / 2, box.y + 6, { align: 'center' });
      const fw = box.w / 4, fh = (box.h - 16) / 3;
      letters.slice(k, k + 12).forEach((ch, j) => {
        const x = box.x + (j % 4) * fw + 4, y = box.y + 18 + Math.floor(j / 4) * fh;
        doc.setDrawColor(...C.brown);
        doc.setLineWidth(1);
        doc.setLineDashPattern([4, 3], 0);
        doc.lines([[fw - 8, 0], [-(fw - 8) / 2, fh - 12], [-(fw - 8) / 2, -(fh - 12)]], x, y, [1, 1], 'S', true);
        doc.setLineDashPattern([], 0);
        b.font('Fell', 42, C.red);
        b.text(ch, x + (fw - 8) / 2, y + fh * 0.42, { align: 'center' });
      });
    }
    const box = page(b);
    const cx = b.geo.W / 2;
    b.motif(g.motif, cx, box.y + box.h * 0.2, 80, C.brown);
    b.font('Fell', 56, C.ink);
    const y = b.para('We cracked the code!', box.x + 10, box.y + box.h * 0.42, box.w - 20, { align: 'center', lineHeight: 1.08 });
    b.divider(cx, y + 6, 220);
    b.font('Fell', 18, C.brown, 'italic');
    b.para(`${g.story.teamName} · ${g.story.title}`, box.x + 20, y + 40, box.w - 40, { align: 'center' });
  }

  // Host Guide section printed in the main PDF when a kit goes with the game.
  function hostSection(g, heading_, bullets) {
    heading_('Getting the party ready');
    bullets([
      g.kit.play === 'teams'
        ? `Give each of the ${g.kit.teams} teams its own chapter and hint envelopes, labelled with the team name.`
        : 'Set one station sign per puzzle around the room and place the puzzle next to it.',
      'Put each later chapter in its labelled envelope and hide the envelopes. Hand one over only when the previous word is right.',
      `Hand out the ${g.kit.players} role cards and let the players write their names.`,
      'Open the game with the mission letter, and fill a box with the reward cards and any prizes.'
    ]);
  }

  function buildKit(game, onProgress) {
    const kitGame = Object.assign({}, game, {
      customSteps(b, steps) {
        steps.push(['Mission letter', () => missionLetter(b)]);
        steps.push(['Door sign', () => doorSign(b)]);
        steps.push(['Role cards', () => rolePages(b)]);
        steps.push(['Chapter envelopes', () => chapterLabels(b)]);
        steps.push(['Hint envelopes', () => hintLabels(b)]);
        steps.push(['Stations', () => stationSigns(b)]);
        steps.push(['Score sheet', () => scoreSheet(b)]);
        steps.push(['Treasure box', () => treasure(b)]);
        steps.push(['Decorations', () => decorations(b)]);
      }
    });
    return build(kitGame, onProgress);
  }

  root.PdfPro = Object.assign(root.PdfPro || {}, { hostSection, buildKit, roleCards });
})(typeof self !== 'undefined' ? self : globalThis);
