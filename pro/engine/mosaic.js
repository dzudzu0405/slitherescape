// SlitherEscape PRO: turns one library image into a Mosaic plan (spec section 11).
// One image sits on a 20x20 board cut 2x2 into 10x10 pieces. Blank and solid pieces are
// pre-printed on the Assembly Board; every other piece becomes a Slitherlink puzzle.
(function (root) {
  'use strict';
  const Glyphs = root.Glyphs;

  const BOARD = 20, PIECE = 10, SLOTS = 4;
  const MAX_REPAIR = 4; // cells a single piece may be changed by
  const SLOT_LABELS = ['A1', 'B1', 'A2', 'B2'];

  // Library images are stored as rows of '#' and '.'.
  function parseRows(rows) {
    const h = rows.length, w = rows[0].length;
    const cells = new Uint8Array(w * h);
    rows.forEach((row, y) => { for (let x = 0; x < w; x++) if (row[x] === '#') cells[y * w + x] = 1; });
    return { w, h, cells };
  }

  // ------------------------------------------------------------------ repair
  // Regions of 4-connected cells with the given value; `border` also reports touching the edge.
  function regions(cells, w, h, value) {
    const seen = new Uint8Array(w * h);
    const out = [];
    for (let i = 0; i < w * h; i++) {
      if (seen[i] || cells[i] !== value) continue;
      const list = [], stack = [i];
      let border = false;
      seen[i] = 1;
      while (stack.length) {
        const c = stack.pop();
        list.push(c);
        const x = c % w, y = (c / w) | 0;
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) border = true;
        [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].forEach(([nx, ny]) => {
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
          const n = ny * w + nx;
          if (!seen[n] && cells[n] === value) { seen[n] = 1; stack.push(n); }
        });
      }
      out.push({ list, border });
    }
    return out;
  }

  // Shortest straight-ish bridge between the two nearest cells of two regions.
  function bridge(a, b, w) {
    let best = null;
    a.forEach((p) => b.forEach((q) => {
      const d = Math.abs(p % w - q % w) + Math.abs(((p / w) | 0) - ((q / w) | 0));
      if (!best || d < best.d) best = { p, q, d };
    }));
    const cells = [];
    let x = best.p % w, y = (best.p / w) | 0;
    const tx = best.q % w, ty = (best.q / w) | 0;
    while (x !== tx) { x += Math.sign(tx - x); if (x !== tx || y !== ty) cells.push(y * w + x); }
    while (y !== ty) { y += Math.sign(ty - y); if (y !== ty) cells.push(y * w + x); }
    return cells;
  }

  // Makes a piece a valid single-loop shape: fills holes, joins parts, adds a cell at a
  // corner touch. Returns { cells, changed } or null when it needs more than MAX_REPAIR cells.
  function repair(input, w, h) {
    const cells = input.slice();
    let changed = 0;
    for (let round = 0; round < MAX_REPAIR + 2; round++) {
      if (Glyphs.checkMask(cells, w, h) === null) return { cells, changed };
      const holes = regions(cells, w, h, 0).filter((r) => !r.border);
      if (holes.length) {
        holes.forEach((r) => { r.list.forEach((c) => { cells[c] = 1; changed++; }); });
      } else {
        const parts = regions(cells, w, h, 1).sort((a, b) => b.list.length - a.list.length);
        if (parts.length > 1) {
          bridge(parts[0].list, parts[1].list, w).forEach((c) => { cells[c] = 1; changed++; });
        } else {
          // Corner touch: fill one of the two empty cells of the checkerboard block.
          let fixed = false;
          const at = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? cells[y * w + x] : 0);
          for (let y = -1; y < h && !fixed; y++) for (let x = -1; x < w && !fixed; x++) {
            const a = at(x, y), b = at(x + 1, y), c = at(x, y + 1), d = at(x + 1, y + 1);
            if (a === d && b === c && a !== b) {
              const opts = a === 0 ? [[x, y], [x + 1, y + 1]] : [[x + 1, y], [x, y + 1]];
              const free = opts.find(([px, py]) => px >= 0 && py >= 0 && px < w && py < h);
              if (!free) return null;
              cells[free[1] * w + free[0]] = 1;
              changed++;
              fixed = true;
            }
          }
          if (!fixed) return null;
        }
      }
      if (changed > MAX_REPAIR) return null;
    }
    return null;
  }

  // ------------------------------------------------------------------ assembly check
  // Runs of shaded cells along one side of a piece.
  function side(cells, which) {
    const out = new Uint8Array(PIECE);
    for (let i = 0; i < PIECE; i++) {
      const idx = which === 'top' ? i : which === 'bottom' ? (PIECE - 1) * PIECE + i : which === 'left' ? i * PIECE : i * PIECE + PIECE - 1;
      out[i] = cells[idx];
    }
    return out;
  }

  // Two sides join when every shaded run on one meets a shaded run on the other.
  function runsMeet(a, b) {
    const oneWay = (p, q) => {
      for (let i = 0; i < PIECE;) {
        if (!p[i]) { i++; continue; }
        let hit = false, j = i;
        while (j < PIECE && p[j]) { if (q[j]) hit = true; j++; }
        if (!hit) return false;
        i = j;
      }
      return true;
    };
    return oneWay(a, b) && oneWay(b, a);
  }

  const isEmpty = (s) => s.every((v) => !v);

  function arrangementFits(bySlot) {
    const [a1, b1, a2, b2] = bySlot;
    return runsMeet(side(a1, 'right'), side(b1, 'left'))
      && runsMeet(side(a2, 'right'), side(b2, 'left'))
      && runsMeet(side(a1, 'bottom'), side(a2, 'top'))
      && runsMeet(side(b1, 'bottom'), side(b2, 'top'))
      && isEmpty(side(a1, 'top')) && isEmpty(side(b1, 'top'))
      && isEmpty(side(a2, 'bottom')) && isEmpty(side(b2, 'bottom'))
      && isEmpty(side(a1, 'left')) && isEmpty(side(a2, 'left'))
      && isEmpty(side(b1, 'right')) && isEmpty(side(b2, 'right'));
  }

  function permutations(list) {
    if (list.length < 2) return [list.slice()];
    const out = [];
    list.forEach((x, i) => {
      permutations(list.slice(0, i).concat(list.slice(i + 1))).forEach((rest) => out.push([x].concat(rest)));
    });
    return out;
  }

  // Counts the different finished pictures the loose pieces can make (spec: must be 1).
  // `anchored` slots stay in place, as if their coordinates were printed.
  function countPictures(slotCells, looseSlots, anchored) {
    const moving = looseSlots.filter((s) => !(anchored || []).includes(s));
    const seen = new Set();
    permutations(moving).forEach((order) => {
      const bySlot = slotCells.slice();
      moving.forEach((slot, k) => { bySlot[slot] = slotCells[order[k]]; });
      if (arrangementFits(bySlot)) seen.add(bySlot.map((c) => Array.prototype.join.call(c, '')).join('|'));
    });
    return seen.size;
  }

  // ------------------------------------------------------------------ placement
  function cutAt(img, ox, oy) {
    const board = new Uint8Array(BOARD * BOARD);
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (img.cells[y * img.w + x]) board[(oy + y) * BOARD + ox + x] = 1;
    const slots = [];
    for (let s = 0; s < SLOTS; s++) {
      const sx = (s % 2) * PIECE, sy = (s >> 1) * PIECE;
      const cells = new Uint8Array(PIECE * PIECE);
      for (let y = 0; y < PIECE; y++) for (let x = 0; x < PIECE; x++) cells[y * PIECE + x] = board[(sy + y) * BOARD + sx + x];
      slots.push(cells);
    }
    return slots;
  }

  const countCells = (c) => c.reduce((n, v) => n + v, 0);

  // Every legal way to place the image, best first: most puzzle pieces, fewest changed cells,
  // and no piece that is nearly solid (its loop would just run around the border).
  function placements(rows) {
    const img = parseRows(rows);
    if (img.w > BOARD - 2 || img.h > BOARD - 2) throw new Error('Image must fit inside 18x18');
    const out = [];
    for (let oy = 1; oy + img.h <= BOARD - 1; oy++) for (let ox = 1; ox + img.w <= BOARD - 1; ox++) {
      const raw = cutAt(img, ox, oy);
      let repaired = 0, ok = true, dull = 0;
      const slots = [];
      for (let s = 0; s < SLOTS && ok; s++) {
        const n = countCells(raw[s]);
        if (n === 0 || n === PIECE * PIECE) { slots.push({ cells: raw[s], type: n ? 'solid' : 'blank' }); continue; }
        const fix = repair(raw[s], PIECE, PIECE);
        if (!fix) { ok = false; break; }
        repaired += fix.changed;
        const size = countCells(fix.cells);
        if (size < 4 || size > 90) dull++; // barely a loop, or one that hugs the border
        slots.push({ cells: fix.cells, type: 'puzzle' });
      }
      if (!ok) continue;
      const puzzles = slots.filter((p) => p.type === 'puzzle').length;
      if (puzzles < 2) continue;
      out.push({ ox, oy, slots, repaired, puzzles, dull });
    }
    out.sort((a, b) => (b.puzzles - a.puzzles) || (a.dull - b.dull) || (a.repaired - b.repaired));
    return out;
  }

  // The plan for one chapter. opts: { rows, difficulty, seed }
  // Hard needs a single possible picture without coordinates: try other placements, then
  // print the coordinates of one anchor piece (spec section 11).
  function plan(opts) {
    const r = root.Generator.rng(opts.seed);
    const list = placements(opts.rows);
    if (!list.length) throw new Error('This image has no usable placement');
    // Several equally good placements exist, so a new seed gives a different cut.
    const top = list.filter((p) => p.puzzles === list[0].puzzles && p.dull === list[0].dull && p.repaired <= list[0].repaired + 1);
    const ordered = r.shuffle(top.slice()).concat(list.filter((p) => !top.includes(p)));
    const hard = opts.difficulty === 'hard';
    let chosen = null, anchor = null;
    for (const p of ordered.slice(0, 200)) {
      const cells = p.slots.map((s) => s.cells);
      const loose = p.slots.map((s, i) => (s.type === 'puzzle' ? i : -1)).filter((i) => i >= 0);
      if (!hard || countPictures(cells, loose) === 1) { chosen = p; break; }
    }
    if (!chosen) {
      for (const p of ordered.slice(0, 200)) {
        const cells = p.slots.map((s) => s.cells);
        const loose = p.slots.map((s, i) => (s.type === 'puzzle' ? i : -1)).filter((i) => i >= 0);
        const a = loose.find((s) => countPictures(cells, loose, [s]) === 1);
        if (a !== undefined) { chosen = p; anchor = a; break; }
      }
    }
    if (!chosen) throw new Error('This image cannot be assembled in only one way');

    // Pieces are handed out in shuffled order, so the numbering gives nothing away.
    const loose = chosen.slots.map((s, i) => (s.type === 'puzzle' ? i : -1)).filter((i) => i >= 0);
    const order = r.shuffle(loose.slice());
    return {
      ox: chosen.ox, oy: chosen.oy,
      repaired: chosen.repaired,
      slots: chosen.slots.map((s, i) => ({ slot: i, label: SLOT_LABELS[i], type: s.type, cells: Array.from(s.cells) })),
      pieces: order.map((slot, k) => ({ number: k + 1, slot, label: SLOT_LABELS[slot], showLabel: !hard || slot === anchor, mask: Array.from(chosen.slots[slot].cells) }))
    };
  }

  // Quality numbers for the admin review screen.
  function review(rows) {
    const list = placements(rows);
    const best = list[0];
    return {
      placements: list.length,
      puzzles: best ? best.puzzles : 0,
      repaired: best ? best.repaired : 0,
      usable: list.length > 0
    };
  }

  root.Mosaic = { BOARD, PIECE, SLOT_LABELS, parseRows, repair, placements, countPictures, plan, review };
})(typeof self !== 'undefined' ? self : globalThis);
