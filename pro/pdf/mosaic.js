// SlitherEscape PRO: printed pages of a Mosaic chapter (spec section 11): the piece sheets,
// the Assembly Board (2x2 or 3x3 squares), the Answer Board and the finished pictures in the
// answer key.
(function (root) {
  'use strict';
  const { C, NUMBER_WORDS } = root.PdfBuilder;

  const CELL = 20; // pt per cell: 200 pt pieces, so a finished picture is 400 pt across
  const PER_PAGE = 4;

  const slotsOf = (g, ci) => g.slots.map((s, i) => ({ s, i })).filter((x) => x.s.chapter === ci);
  // Pieces per side of a chapter's board: 2 (20x20) or 3 (30x30).
  const gridOf = (g, ci) => root.Mosaic.gridOf(g.mosaics[ci]);

  // Pieces must print at the size of the board cells on every paper, so glueing them works.
  function cellFor(b, n) {
    return Math.min(CELL, (b.geometry(false).box.w - 8) / (10 * (n || 2)));
  }

  function chapterPages(g, ci) {
    return 1 + Math.ceil(slotsOf(g, ci).length / PER_PAGE) + 2;
  }

  function arrowUp(b, x, y) {
    const doc = b.doc;
    doc.setDrawColor(...C.brown);
    doc.setFillColor(...C.brown);
    doc.setLineWidth(1);
    doc.line(x, y + 9, x, y + 2);
    doc.triangle(x - 3, y + 3, x, y - 2, x + 3, y + 3, 'F');
    b.font('Fell', 9, C.brown, 'italic');
    b.text('this way up', x + 7, y + 7);
  }

  function piecePages(b, ci) {
    const g = b.g, doc = b.doc;
    const list = slotsOf(g, ci);
    const cell = cellFor(b, gridOf(g, ci));
    const size = cell * 10;
    for (let k = 0; k < list.length; k += PER_PAGE) {
      const box = b.newPage();
      const cx = b.geo.W / 2;
      b.font('FellSC', 11, C.brown);
      b.text(`Chapter ${NUMBER_WORDS[ci]} · Picture pieces`, cx, box.y + 6, { align: 'center' });
      b.font('Fell', 10.5, C.brown, 'italic');
      b.text('Solve, shade the inside of the loop, then cut along the dashed lines.', cx, box.y + 21, { align: 'center' });
      const gapX = 22, gapY = 42;
      const x0 = cx - size - gapX / 2, y0 = box.y + 56;
      list.slice(k, k + PER_PAGE).forEach(({ s, i }, j) => {
        const x = x0 + (j % 2) * (size + gapX);
        const y = y0 + Math.floor(j / 2) * (size + gapY);
        b.font('FellSC', 11.5, C.red);
        const label = s.showLabel ? `Piece ${i + 1} · place at ${s.label}` : `Piece ${i + 1}`;
        b.text(label, x, y - 8);
        arrowUp(b, x + size - 54, y - 16);
        b.panel(x, y, size, size);
        b.grid(g.puzzles[i], x, y, cell);
        doc.setDrawColor(...C.brown);
        doc.setLineWidth(0.6);
        doc.setLineDashPattern([4, 3], 0);
        doc.rect(x, y, size, size);
        doc.setLineDashPattern([], 0);
      });
    }
  }

  function drawCells(b, cells, w, x, y, cell, color) {
    const doc = b.doc;
    doc.setFillColor(...color);
    const h = cells.length / w;
    for (let r = 0; r < h; r++) {
      // Rows of cells are drawn as single strips to keep the file small.
      for (let c = 0; c < w;) {
        if (!cells[r * w + c]) { c++; continue; }
        let e = c;
        while (e < w && cells[r * w + e]) e++;
        doc.rect(x + c * cell, y + r * cell, (e - c) * cell + 0.15, cell + 0.15, 'F');
        c = e;
      }
    }
  }

  function assemblyBoard(b, ci) {
    const g = b.g, doc = b.doc;
    const plan = g.mosaics[ci];
    const n = gridOf(g, ci);
    const box = b.newPage();
    const cx = b.geo.W / 2;
    const cell = cellFor(b, n);
    const size = cell * 10;
    b.font('FellSC', 12, C.red);
    b.text(`Chapter ${NUMBER_WORDS[ci]}`, cx, box.y + 8, { align: 'center' });
    b.font('Fell', 28, C.ink);
    b.text('Assembly Board', cx, box.y + 38, { align: 'center' });
    b.divider(cx, box.y + 52, 150);
    const x0 = cx - size * n / 2, y0 = box.y + 92;
    b.font('FellSC', 14, C.brown);
    'ABC'.slice(0, n).split('').forEach((l, k) => b.text(l, x0 + size * k + size / 2, y0 - 8, { align: 'center' }));
    for (let k = 0; k < n; k++) b.text(String(k + 1), x0 - 12, y0 + size * k + size / 2 + 4, { align: 'center' });
    plan.slots.forEach((slot, s) => {
      const x = x0 + (s % n) * size, y = y0 + Math.floor(s / n) * size;
      if (slot.type === 'solid') drawCells(b, slot.cells, 10, x, y, cell, C.shade);
      doc.setDrawColor(...C.brown);
      doc.setLineWidth(slot.type === 'puzzle' ? 0.8 : 1.2);
      doc.rect(x, y, size, size);
      if (slot.type === 'puzzle') {
        b.font('Fell', 10, C.tan, 'italic');
        b.text('glue a piece here', x + size / 2, y + size / 2 + 3, { align: 'center' });
      }
    });
    b.font('Fell', 12, C.ink, 'italic');
    b.para('Glue each piece into its square with the arrow pointing up. The shaded parts join up across the lines. Squares already filled in are printed for you.', box.x + 34, y0 + size * n + 26, box.w - 68, { align: 'center' });
  }

  function answerBoard(b, ci) {
    const g = b.g;
    const c = g.story.chapters[ci];
    const box = b.newPage();
    const cx = b.geo.W / 2;
    const options = g.answerBoards[ci];
    b.font('FellSC', 12, C.red);
    b.text(`Chapter ${NUMBER_WORDS[ci]}`, cx, box.y + 8, { align: 'center' });
    b.font('Fell', 28, C.ink);
    b.text('Answer Board', cx, box.y + 38, { align: 'center' });
    b.divider(cx, box.y + 52, 150);
    b.font('Fell', 12.5, C.ink, 'italic');
    let y = b.para('Which of these is your finished picture? Its name is the word of this chapter.', box.x + 40, box.y + 78, box.w - 80, { align: 'center' }) + 12;
    const cols = 2, rows = Math.ceil(options.length / cols);
    const areaH = box.y + box.h - y - 90;
    const rowH = areaH / rows;
    const colW = box.w / cols;
    // Every picture on the board shares one cell size, sized for the biggest of them.
    const longest = Math.max(20, ...options.map((m) => Math.max(m.rows.length, m.rows[0].length)));
    const cell = Math.min(6.6 * 20 / longest, (rowH - 26) / longest, (colW - 16) / longest);
    options.forEach((m, k) => {
      const x = box.x + (k % cols) * colW, top = y + Math.floor(k / cols) * rowH;
      const grid = root.Mosaic.parseRows(m.rows);
      const dx = x + (colW - grid.w * cell) / 2, dy = top + (rowH - 22 - grid.h * cell) / 2;
      drawCells(b, grid.cells, grid.w, dx, dy, cell, C.ink);
      b.font('FellSC', 12.5, C.red);
      b.text(m.name, x + colW / 2, top + rowH - 6, { align: 'center' });
    });
    y = box.y + box.h - 62;
    b.font('FellSC', 12, C.brown);
    b.text('The word of this chapter', cx, y, { align: 'center' });
    const size = Math.min(30, (box.w - 40) / (c.word.length * 1.18));
    b.letterBoxes(cx, y + 10, [c.word.length], size);
  }

  function chapter(b, ci) {
    piecePages(b, ci);
    assemblyBoard(b, ci);
    answerBoard(b, ci);
  }

  // Finished pictures for the host: one page, one panel per picture chapter.
  function answerPictures(b) {
    const g = b.g;
    const box = b.newPage({ host: true });
    const cx = b.geo.W / 2;
    b.font('Fell', 26, C.ink);
    b.text('The Finished Pictures', cx, box.y + 22, { align: 'center' });
    b.divider(cx, box.y + 36, 160);
    const list = g.story.chapters.map((c, ci) => ({ c, ci })).filter((x) => x.c.type === 'mosaic');
    const rowH = (box.h - 56) / Math.max(2, list.length);
    list.forEach(({ c, ci }, k) => {
      const top = box.y + 56 + k * rowH;
      const plan = g.mosaics[ci];
      const n = gridOf(g, ci);
      const cell = Math.min(10 * 2 / n, (rowH - 40) / (10 * n));
      const size = cell * 10;
      const x0 = cx - size * n / 2;
      b.font('FellSC', 13, C.red);
      b.text(`Chapter ${NUMBER_WORDS[ci]}: ${c.word}`, cx, top + 10, { align: 'center' });
      plan.slots.forEach((slot, s) => {
        const x = x0 + (s % n) * size, y = top + 20 + Math.floor(s / n) * size;
        drawCells(b, slot.cells, 10, x, y, cell, C.shade);
        b.doc.setDrawColor(...C.brown);
        b.doc.setLineWidth(0.5);
        b.doc.rect(x, y, size, size);
      });
    });
  }

  root.PdfPro = Object.assign(root.PdfPro || {}, { chapterPages, chapter, answerPictures });
})(typeof self !== 'undefined' ? self : globalThis);
