// SlitherEscape PRO: the Party Props Kit (spec section 11.1), a separate PDF in the same
// paper style. Every item ties into a real game mechanic and comes from the story.
// Each prop is numbered and named at the top of its page with one line on how to use it,
// and page 1 lists the whole kit, so a buyer can tell at a glance what every sheet is for.
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
  const players = (g) => Math.max(1, g.kit.players || 4);
  const roundUp = (n, per) => Math.max(per, Math.ceil(n / per) * per);

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

  // ------------------------------------------------------------------ page furniture

  // New page with the variant code in the footer and, for a prop, its number, name and how-to.
  function page(b, prop) {
    const box = b.newPage();
    const f = b.geo.frame;
    b.font('Fell', 8, C.tan, 'italic');
    b.text(`Variant ${b.g.seed}`, f.x + f.w / 2, f.y + f.h - 14, { align: 'center' });
    if (!prop) return box;
    if (!prop.firstPage) prop.firstPage = b.pageNo;
    prop.lastPage = b.pageNo;
    const cx = b.geo.W / 2;
    b.font('FellSC', 15, C.red);
    b.text(`Prop ${prop.n} of ${prop.total} · ${prop.name}`, cx, box.y + 4, { align: 'center' });
    b.font('Fell', 11, C.brown, 'italic');
    const y = b.para(prop.how, box.x + 30, box.y + 22, box.w - 60, { align: 'center', lineHeight: 1.25 });
    const top = y + 8;
    return { x: box.x, y: top, w: box.w, h: box.y + box.h - top };
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

  // Dashed outline around one cut-out item.
  function cutBox(b, x, y, w, h) {
    const doc = b.doc;
    doc.setDrawColor(...C.brown);
    doc.setLineWidth(0.6);
    doc.setLineDashPattern([4, 3], 0);
    doc.rect(x, y, w, h);
    doc.setLineDashPattern([], 0);
  }

  // Fill-in line: "Label: ____________".
  function blank(b, label, x, y, w) {
    b.font('Fell', 12, C.ink);
    b.text(`${label}: ${'_'.repeat(Math.max(8, Math.round((w - label.length * 6.5) / 6.2)))}`, x, y);
  }

  // A sheet of cut-out items in a grid.
  function gridPages(b, prop, items, cols, rows, draw) {
    const per = cols * rows;
    for (let k = 0; k < items.length; k += per) {
      const area = page(b, prop);
      cutLines(b, area, cols, rows);
      const cw = area.w / cols, ch = area.h / rows;
      items.slice(k, k + per).forEach((it, j) => draw(it, area.x + (j % cols) * cw, area.y + Math.floor(j / cols) * ch, cw, ch));
    }
  }

  const teamList = (g) => (g.kit.play === 'teams' ? Array.from({ length: g.kit.teams }, (_, i) => i + 1) : [0]);

  // ------------------------------------------------------------------ props

  function invitations(b, prop) {
    const g = b.g;
    const items = Array.from({ length: roundUp(players(g), 2) }, (_, i) => i);
    gridPages(b, prop, items, 1, 2, (_, x, y, w, h) => {
      const cx = x + w / 2;
      b.motif(g.motif, cx, y + 30, 40, C.brown);
      b.font('Fell', 30, C.ink);
      b.text('You are invited!', cx, y + 76, { align: 'center' });
      b.font('FellSC', 13, C.red);
      let ty = b.para(`Join ${g.story.teamName} for an escape-room party`, x + 30, y + 98, w - 60, { align: 'center', lineHeight: 1.15 });
      b.font('Fell', 12, C.brown, 'italic');
      ty = b.para(`${g.story.title}: ${g.story.tagline}`, x + 40, ty + 6, w - 80, { align: 'center', lineHeight: 1.25 });
      const fx = x + 60, fw = w - 120;
      const rowsY = Math.max(ty + 18, y + h - 128);
      ['For', 'Date', 'Time', 'Place', 'RSVP'].forEach((label, i) => blank(b, label, fx, rowsY + i * 24, fw));
    });
  }

  function agentIds(b, prop) {
    const g = b.g, doc = b.doc;
    const items = Array.from({ length: roundUp(players(g), 4) }, (_, i) => i);
    // 3 x 4 inch badges fit a standard badge holder.
    const bw = 216, bh = 288, gap = 18;
    for (let k = 0; k < items.length; k += 4) {
      const area = page(b, prop);
      const ox = area.x + (area.w - (bw * 2 + gap)) / 2;
      const oy = area.y + Math.max(0, (area.h - (bh * 2 + gap)) / 2);
      items.slice(k, k + 4).forEach((_, j) => {
        const x = ox + (j % 2) * (bw + gap), y = oy + (j >> 1) * (bh + gap), cx = x + bw / 2;
        cutBox(b, x, y, bw, bh);
        doc.setFillColor(...C.red);
        doc.rect(x + 8, y + 8, bw - 16, 34, 'F');
        b.font('FellSC', 16, C.white);
        b.text('Agent ID', cx, y + 31, { align: 'center' });
        b.font('FellSC', 10.5, C.brown);
        b.para(g.story.teamName, x + 14, y + 58, bw - 28, { align: 'center', lineHeight: 1.1 });
        // Photo box.
        doc.setDrawColor(...C.brown);
        doc.setLineWidth(0.8);
        doc.roundedRect(cx - 40, y + 76, 80, 92, 4, 4, 'S');
        b.font('Fell', 9, C.tan, 'italic');
        b.text('Photo or drawing', cx, y + 125, { align: 'center' });
        b.font('Fell', 11, C.ink);
        ['Name', 'Agent No.', 'Role'].forEach((label, i) => b.text(`${label}: ${'_'.repeat(label.length > 6 ? 14 : 18)}`, x + 18, y + 196 + i * 24));
        b.font('Fell', 8.5, C.brown, 'italic');
        b.text(g.story.title, cx, y + bh - 12, { align: 'center' });
      });
    }
  }

  function doorSign(b, prop) {
    const g = b.g;
    const box = page(b, prop);
    const cx = b.geo.W / 2;
    b.motif(g.motif, cx, box.y + 70, 90, C.brown);
    b.font('FellSC', 14, C.red);
    b.text('Headquarters of', cx, box.y + 170, { align: 'center' });
    b.font('Fell', 44, C.ink);
    const y = b.para(g.story.teamName, box.x + 16, box.y + 224, box.w - 32, { align: 'center', lineHeight: 1.08 });
    b.divider(cx, y + 8, 210);
    b.font('Fell', 20, C.brown, 'italic');
    b.para(g.story.title, box.x + 30, y + 44, box.w - 60, { align: 'center' });
    b.font('FellSC', 13, C.red);
    b.text('Do not enter until the code is cracked', cx, box.y + box.h - 16, { align: 'center' });
  }

  function missionLetter(b, prop) {
    const g = b.g, doc = b.doc;
    const box = page(b, prop);
    const cx = b.geo.W / 2;
    const text = (g.story.party && g.story.party.letter) || `${g.story.mission} Pick up your Code Sheet and begin.`;
    b.font('FellSC', 13, C.brown);
    b.text('A letter for you', cx, box.y + 22, { align: 'center' });
    b.divider(cx, box.y + 38, 170);
    b.font('Fell', 15, C.ink);
    const y = b.para(text, box.x + 36, box.y + 76, box.w - 72, { lineHeight: 1.55 });
    // Wax seal.
    const sy = Math.min(y + 70, box.y + box.h - 50);
    doc.setFillColor(...C.red);
    doc.circle(cx, sy, 34, 'F');
    doc.setDrawColor(...C.white);
    doc.setLineWidth(1);
    doc.circle(cx, sy, 27, 'S');
    b.motif(g.motif, cx, sy, 30, C.white);
  }

  function rolePages(b, prop) {
    const g = b.g, doc = b.doc;
    gridPages(b, prop, roleCards(g), 2, 2, (roles, x, y, cw, ch) => {
      b.motif(g.motif, x + cw / 2, y + 30, 32, C.tan);
      b.font('FellSC', 15, C.red);
      const ty = b.para(roles.map((r) => roleTitle(g, r)).join(' & '), x + 14, y + 66, cw - 28, { align: 'center', lineHeight: 1.1 });
      doc.setDrawColor(...C.brown);
      doc.setLineWidth(0.7);
      doc.line(x + 26, ty + 22, x + cw - 26, ty + 22);
      b.font('Fell', 9, C.brown, 'italic');
      b.text('Your name', x + cw / 2, ty + 33, { align: 'center' });
      b.font('Fell', roles.length > 2 ? 9.5 : 11, C.ink);
      let py = ty + 50;
      roles.forEach((r) => { py = b.para(POWERS[r], x + 16, py, cw - 32, { align: 'center', lineHeight: 1.22 }) + 4; });
    });
  }

  function chapterLabels(b, prop) {
    const g = b.g;
    const labels = [];
    teamList(g).forEach((team) => g.story.chapters.forEach((c, ci) => labels.push({ team, ci })));
    gridPages(b, prop, labels, 1, 4, (l, x, y, w, h) => {
      const cx = x + w / 2;
      b.font('Fell', 25, C.ink);
      b.text(`Chapter ${ROMAN[l.ci]}`, cx, y + h / 2 - 14, { align: 'center' });
      b.font('Fell', 12.5, C.brown, 'italic');
      b.text(l.ci === 0 ? 'Open when the Host starts the game' : `Open only when the Host confirms Word ${l.ci}`, cx, y + h / 2 + 8, { align: 'center' });
      if (l.team) { b.font('FellSC', 11, C.red); b.text(`Team ${l.team}: ____________________`, cx, y + h / 2 + 30, { align: 'center' }); }
    });
  }

  function hintLabels(b, prop) {
    const g = b.g;
    const labels = [];
    teamList(g).forEach((team) => g.puzzles.forEach((p, i) => [1, 2].forEach((hint) => labels.push({ team, i, hint }))));
    gridPages(b, prop, labels, 2, 5, (l, x, y, w, h) => {
      const cx = x + w / 2;
      b.font('FellSC', 14, C.red);
      b.text(`${puzzleName(g, l.i)} · Hint ${l.hint}`, cx, y + h / 2 - 8, { align: 'center' });
      b.font('Fell', 10, C.brown, 'italic');
      b.text('Open only after a correct answer', cx, y + h / 2 + 8, { align: 'center' });
      if (l.team) { b.font('Fell', 9.5, C.brown); b.text(`Team ${l.team}`, cx, y + h / 2 + 22, { align: 'center' }); }
    });
  }

  // Together mode: one fold-over sign per puzzle, placed around the room.
  function stationSigns(b, prop) {
    const g = b.g, doc = b.doc;
    const items = g.puzzles.map((p, i) => i);
    for (let k = 0; k < items.length; k += 2) {
      const box = page(b, prop);
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
        b.text('Fold back on the dotted line', cx, y + h / 2 - 8, { align: 'center' });
        b.font('FellSC', 11, C.brown);
        b.text(`Station · Chapter ${NUMBER_WORDS[slot.chapter]}`, cx, y + h / 2 + 20, { align: 'center' });
        b.font('Fell', 44, C.ink);
        b.text(String(i + 1), cx, y + h / 2 + 64, { align: 'center' });
        b.font('Fell', 14, C.brown, 'italic');
        const title = slot.kind === 'piece' ? `Picture piece ${i + 1}` : g.story.puzzleTitles[slot.titleIndex] || puzzleName(g, i);
        b.para(title, box.x + 30, y + h / 2 + 86, box.w - 60, { align: 'center' });
      });
    }
  }

  function scoreSheet(b, prop) {
    const g = b.g, doc = b.doc;
    const box = page(b, prop);
    const y0 = box.y + 10;
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
    b.para('A wrong answer means a 2-minute wait before trying a different question. For extra tension, add a 2-minute penalty for every hint card received. The last columns match the Certificate of Completion.', box.x + 20, y0 + 56 + rows * rowH, box.w - 40, { align: 'center' });
  }

  function treasure(b, prop) {
    const g = b.g, doc = b.doc;
    const box = page(b, prop);
    const cx = b.geo.W / 2;
    const h = box.h * 0.44;
    doc.setDrawColor(...C.brown);
    doc.setLineWidth(1.2);
    doc.roundedRect(box.x + 10, box.y + 4, box.w - 20, h - 8, 8, 8, 'S');
    b.motif('key', cx, box.y + 52, 52, C.brown);
    b.font('Fell', 32, C.ink);
    b.text('Treasure Box', cx, box.y + 114, { align: 'center' });
    b.font('FellSC', 15, C.red);
    b.text('Open with the Unlock Phrase', cx, box.y + 144, { align: 'center' });
    b.font('Fell', 12, C.brown, 'italic');
    b.text(g.story.title, cx, box.y + 166, { align: 'center' });
    // Reward cards: one per player, four to a page.
    const top = box.y + h + 10, ch = (box.h - h - 10) / 2, cw = box.w / 2;
    cutLines(b, { x: box.x, y: top, w: box.w, h: ch * 2 }, 2, 2);
    for (let i = 0; i < 4; i++) {
      const x = box.x + (i % 2) * cw, y = top + (i >> 1) * ch;
      b.motif(g.motif, x + cw / 2, y + 26, 24, C.tan);
      b.font('FellSC', 14, C.red);
      b.para(reward(g), x + 14, y + 56, cw - 28, { align: 'center', lineHeight: 1.1 });
      b.font('Fell', 10, C.brown, 'italic');
      b.text(`Awarded to ${g.story.teamName}`, x + cw / 2, y + ch - 14, { align: 'center' });
    }
  }

  function decorations(b, prop) {
    const g = b.g, doc = b.doc;
    // Bunting spells the title, unless the title contains a word of the code.
    const code = g.story.chapters.map((c) => c.word);
    const title = g.story.title.toUpperCase();
    const safe = !code.some((w) => new RegExp(`\\b${w}S?\\b`).test(title));
    const letters = (safe ? title : 'ESCAPE').replace(/[^A-Z0-9]/g, '').slice(0, 24).split('');
    for (let k = 0; k < letters.length; k += 12) {
      const box = page(b, prop);
      const fw = box.w / 4, fh = (box.h - 4) / 3;
      letters.slice(k, k + 12).forEach((ch, j) => {
        const x = box.x + (j % 4) * fw + 4, y = box.y + 4 + Math.floor(j / 4) * fh;
        doc.setDrawColor(...C.brown);
        doc.setLineWidth(1);
        doc.setLineDashPattern([4, 3], 0);
        doc.lines([[fw - 8, 0], [-(fw - 8) / 2, fh - 12], [-(fw - 8) / 2, -(fh - 12)]], x, y, [1, 1], 'S', true);
        doc.setLineDashPattern([], 0);
        b.font('Fell', 42, C.red);
        b.text(ch, x + (fw - 8) / 2, y + fh * 0.42, { align: 'center' });
      });
    }
    const box = page(b, prop);
    const cx = b.geo.W / 2;
    b.motif(g.motif, cx, box.y + box.h * 0.18, 80, C.brown);
    b.font('Fell', 56, C.ink);
    const y = b.para('We cracked the code!', box.x + 10, box.y + box.h * 0.4, box.w - 20, { align: 'center', lineHeight: 1.08 });
    b.divider(cx, y + 6, 220);
    b.font('Fell', 18, C.brown, 'italic');
    b.para(`${g.story.teamName} · ${g.story.title}`, box.x + 20, y + 40, box.w - 40, { align: 'center' });
  }

  function thankYouTags(b, prop) {
    const g = b.g, doc = b.doc;
    const items = Array.from({ length: roundUp(players(g), 8) }, (_, i) => i);
    gridPages(b, prop, items, 2, 4, (_, x, y, w, h) => {
      const cx = x + w / 2;
      // Hole for the ribbon.
      doc.setDrawColor(...C.brown);
      doc.setLineWidth(0.8);
      doc.circle(x + 18, y + 18, 5, 'S');
      b.motif(g.motif, cx, y + 26, 22, C.tan);
      b.font('Fell', 24, C.ink);
      b.text('Thank you!', cx, y + 64, { align: 'center' });
      b.font('Fell', 10.5, C.brown, 'italic');
      b.para(`for helping ${g.story.teamName} crack the code`, x + 18, y + 82, w - 36, { align: 'center', lineHeight: 1.2 });
      b.font('Fell', 10.5, C.ink);
      b.text(`From: ${'_'.repeat(20)}`, cx, y + h - 16, { align: 'center' });
    });
  }

  // ------------------------------------------------------------------ the kit

  // In the order a host uses them. Station signs only exist when everyone plays together.
  function propsFor(g) {
    const list = [
      { name: 'Party Invitations', draw: invitations, how: 'Fill in the blanks, cut along the dashed line and send them a week before the party.',
        prep: 'Fill in, cut out, send', when: 'A week before' },
      { name: 'Agent ID Badges', draw: agentIds, how: 'Print on card. Cut out one per player, add a photo or a drawing, and slip it into a badge holder.',
        prep: 'Print on card, cut out', when: 'As guests arrive' },
      { name: 'Door Sign', draw: doorSign, how: 'Tape it to the door of the game room before the players arrive.',
        prep: 'Tape to the door', when: 'Before the game' },
      { name: 'Mission Letter', draw: missionLetter, how: 'Read it aloud, or hand it to the Team Leader, to start the game.',
        prep: 'Fold like a letter', when: 'Start of the game' },
      { name: 'Role Cards', draw: rolePages, how: 'Cut out and give one card to each player. Players write their own name on it.',
        prep: 'Cut out', when: 'Start of the game' },
      { name: 'Chapter Envelope Labels', draw: chapterLabels, how: 'Stick one label on each envelope and put that chapter\'s pages inside.',
        prep: 'Stick on envelopes, fill them', when: 'One per chapter' },
      { name: 'Hint Envelope Labels', draw: hintLabels, how: 'Stick each label on a small envelope and put the matching hint card inside.',
        prep: 'Stick on envelopes, add hint cards', when: 'When players earn a hint' },
      g.kit.play === 'teams' ? null : { name: 'Puzzle Station Signs', draw: stationSigns, how: 'Cut on the dashed line, fold back on the dotted line and stand one sign next to each puzzle.',
        prep: 'Cut, fold, stand by each puzzle', when: 'During the game' },
      { name: 'Score & Time Sheet', draw: scoreSheet, how: 'The Game Host fills in one row per team while the game runs.',
        prep: 'Keep with the Host', when: 'During the game' },
      { name: 'Treasure Box Label & Reward Cards', draw: treasure, how: 'Tape the label on a box of prizes. Hand out the reward cards when the code is cracked.',
        prep: 'Tape on a box, cut out cards', when: 'After the Final Lock' },
      { name: 'Bunting & Photo Sign', draw: decorations, how: 'Cut out the flags and hang them on a string. Hold up the photo sign for the team photo.',
        prep: 'Cut out, string together', when: 'Decorate the room' },
      { name: 'Thank-You Tags', draw: thankYouTags, how: 'Cut out and tie one to each guest\'s prize or goodie bag as they leave.',
        prep: 'Cut out, punch the hole', when: 'As guests leave' }
    ].filter(Boolean);
    list.forEach((p, i) => { p.n = i + 1; p.total = list.length; });
    return list;
  }

  // Page 1: what's in the kit, drawn last so page numbers are known.
  function contentsPage(b, props) {
    const doc = b.doc;
    const current = b.pageNo;
    doc.setPage(1);
    b.pageNo = 1;
    b.logPage = 1;
    const geo = b.geometry(false);
    const box = geo.box, cx = geo.W / 2;
    b.font('Fell', 28, C.ink);
    b.text('Your Party Props Kit', cx, box.y + 18, { align: 'center' });
    b.divider(cx, box.y + 32, 180);
    b.font('Fell', 11, C.brown, 'italic');
    let y = b.para(`Everything below turns ${b.g.story.title} into an escape-room party. Print on plain paper; card works best for badges, signs and tags. Cut along dashed lines, fold along dotted lines.`, box.x + 20, box.y + 54, box.w - 40, { align: 'center' }) + 12;
    const cols = [['#', 0.06], ['Prop', 0.3], ['Pages', 0.1], ['Get it ready', 0.3], ['When', 0.24]];
    const head = (yy) => {
      let x = box.x;
      doc.setFillColor(...C.red);
      doc.rect(box.x, yy - 13, box.w, 19, 'F');
      b.font('FellSC', 11.5, C.white);
      cols.forEach(([label, f]) => { b.text(label, x + 5, yy, {}); x += box.w * f; });
    };
    head(y);
    y += 14;
    props.forEach((p, i) => {
      const pages = p.firstPage === p.lastPage ? String(p.firstPage) : `${p.firstPage}-${p.lastPage}`;
      const cells = [String(p.n), p.name, pages, p.prep, p.when];
      b.font('Fell', 12, C.ink);
      const hgt = Math.max(...cells.map((c, k) => b.measure(c, box.w * cols[k][1] - 10))) + 14;
      if (i % 2 === 0) { doc.setFillColor(...C.panel); doc.rect(box.x, y, box.w, hgt, 'F'); }
      let x = box.x;
      cells.forEach((c, k) => {
        b.font(k === 1 ? 'FellSC' : 'Fell', 12, k === 1 ? C.red : C.ink);
        b.para(c, x + 5, y + 17, box.w * cols[k][1] - 10, { lineHeight: 1.2 });
        x += box.w * cols[k][1];
      });
      y += hgt;
    });
    doc.setDrawColor(...C.brown);
    doc.setLineWidth(0.6);
    doc.line(box.x, y + 2, box.x + box.w, y + 2);
    b.font('Fell', 10.5, C.brown, 'italic');
    b.para('Every sheet says its prop number and name at the top, so you can match it to this list.', box.x + 20, y + 22, box.w - 40, { align: 'center' });
    doc.setPage(current);
    b.pageNo = current;
    b.logPage = null;
  }

  // Host Guide section printed in the main PDF when a kit goes with the game.
  function hostSection(g, heading_, bullets) {
    heading_('Getting the party ready');
    bullets([
      'Page 1 of the Party Kit lists every prop, which pages it is on and when to use it.',
      'Send the invitations about a week before. Hand out the Agent ID badges as guests arrive.',
      g.kit.play === 'teams'
        ? `Give each of the ${g.kit.teams} teams its own chapter and hint envelopes, labelled with the team name.`
        : 'Set one station sign per puzzle around the room and place the puzzle next to it.',
      'Put each later chapter in its labelled envelope and hide the envelopes. Hand one over only when the previous word is right.',
      `Hand out the ${g.kit.players} role cards and let the players write their names.`,
      'Open the game with the mission letter, fill a box with the reward cards and any prizes, and give each guest a thank-you tag at the end.'
    ]);
  }

  // Names in order, for the editor's "what you get" list.
  function propNames(kit) {
    return propsFor({ kit: kit || { play: 'together' } }).map((p) => p.name);
  }

  // opts.recordText: draw no text and return the text as a list, for the Canva (PPTX) export.
  function buildKit(game, onProgress, opts = {}) {
    const props = propsFor(game);
    const kitGame = Object.assign({}, game, {
      recordText: !!opts.recordText,
      customSteps(b, steps) {
        steps.push(['Contents', () => page(b)]);
        props.forEach((p) => steps.push([p.name, () => p.draw(b, p)]));
        steps.push(['Contents', () => contentsPage(b, props)]);
      }
    });
    return build(kitGame, onProgress);
  }

  // ------------------------------------------------------------------ Canva (PPTX) export
  // The kit is built once with its text recorded instead of drawn. Each textless page becomes a
  // slide background, and every recorded line or paragraph becomes an editable text box on top,
  // so the file opens in Canva (or PowerPoint) with all wording editable.

  const FONT_FACES = { Fell: 'IM Fell English', FellSC: 'IM Fell English SC', Digits: 'DejaVu Serif', Elite: 'Special Elite', Courier: 'Courier Prime',
    Sniglet: 'Sniglet', Comic: 'Comic Neue', Cinzel: 'Cinzel Decorative', Crimson: 'Crimson Text' };

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = new URL(src, document.baseURI).href;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Could not load ' + src));
      document.head.appendChild(s);
    });
  }

  const hexOf = (c) => {
    if (typeof c === 'string' && /^#?[0-9a-f]{6}$/i.test(c)) return c.replace('#', '').toUpperCase();
    return '3B2412';
  };

  async function buildKitPptx(game, onProgress) {
    const progress = onProgress || (() => {});
    const doc = await buildKit(game, (p, t) => progress(p * 0.45, t), { recordText: true });
    const log = doc.textLog || [];
    const bytes = doc.output('arraybuffer');

    progress(0.47, 'Loading the slide maker');
    if (!root.JSZip) await loadScript('assets/vendor/jszip.min.js');
    if (!root.PptxGenJS) await loadScript('assets/vendor/pptxgen.min.js');
    const pdfjs = await import(new URL('assets/vendor/pdfjs/pdf.min.mjs', document.baseURI).href);
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('assets/vendor/pdfjs/pdf.worker.min.mjs', document.baseURI).href;
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;

    const first = (await pdf.getPage(1)).getViewport({ scale: 1 });
    const W = first.width / 72, H = first.height / 72;
    const pptx = new root.PptxGenJS();
    pptx.defineLayout({ name: 'KIT', width: W, height: H });
    pptx.layout = 'KIT';
    pptx.title = `${game.story.title} - Party Kit`;
    pptx.author = game.shop || '';

    for (let n = 1; n <= pdf.numPages; n++) {
      progress(0.5 + 0.45 * (n - 1) / pdf.numPages, `Slide ${n} of ${pdf.numPages}`);
      const pg = await pdf.getPage(n);
      const vp = pg.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(vp.width);
      canvas.height = Math.round(vp.height);
      // 'print' renders without requestAnimationFrame, so a background tab doesn't stall the export.
      await pg.render({ canvasContext: canvas.getContext('2d'), viewport: vp, intent: 'print' }).promise;
      const slide = pptx.addSlide();
      // A full-page picture behind the text, not a slide background: Canva's PPTX import drops
      // background images but keeps pictures.
      slide.addImage({ data: canvas.toDataURL('image/jpeg', 0.86).replace(/^data:/, ''), x: 0, y: 0, w: W, h: H });
      log.filter((t) => t.page === n && t.text).forEach((t) => {
        const multi = t.lines > 1;
        // Canva and PowerPoint measure the font a little differently: give single lines room.
        const extra = multi ? 4 : Math.max(12, t.w * 0.25);
        const left = t.align === 'center' ? t.x - extra / 2 : t.align === 'right' ? t.x - extra : t.x;
        slide.addText(t.text, {
          x: left / 72, y: (t.y - t.size * 0.86) / 72, w: (t.w + extra) / 72,
          h: (t.lines * t.lineHeight + t.size * 0.45) / 72,
          fontFace: FONT_FACES[t.font] || 'IM Fell English', fontSize: t.size,
          bold: t.font === 'Digits', italic: t.style === 'italic', color: hexOf(t.color),
          align: t.align || 'left', valign: 'top', margin: 0, wrap: multi, fit: 'none',
          lineSpacing: multi ? t.lineHeight : undefined
        });
      });
    }
    progress(0.97, 'Packing the file');
    const blob = await pptx.write({ outputType: 'blob' });
    return { blob, slides: pdf.numPages };
  }

  root.PdfPro = Object.assign(root.PdfPro || {}, { hostSection, buildKit, buildKitPptx, roleCards, propNames });
})(typeof self !== 'undefined' ? self : globalThis);
