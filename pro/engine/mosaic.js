// SlitherEscape PRO: turns one library image into a Mosaic plan (spec section 11).
// An image up to 20x20 sits on a 20x20 board cut 2x2 into 10x10 pieces; a larger image, up to
// 30x30, sits on a 30x30 board cut 3x3. Blank and solid pieces are pre-printed on the Assembly
// Board; every other piece becomes a Slitherlink puzzle.
(function (root) {
  'use strict';
  const Glyphs = root.Glyphs;

  const PIECE = 10, BOARD = 20, MAX_BOARD = 30;
  const MAX_REPAIR = 4; // cells a single piece may be changed by
  // A wrong arrangement this close to the true one could fool players.
  const SEAM_TOLERANCE = 2, EDGE_TOLERANCE = 2;
  const SLOT_LABELS = ['A1', 'B1', 'A2', 'B2'];

  // Pieces per side: 2 for images that fit 20x20, 3 for bigger ones.
  const gridFor = (w, h) => (w > BOARD || h > BOARD ? 3 : 2);
  const labelOf = (slot, n) => 'ABC'[slot % n] + (Math.floor(slot / n) + 1);

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

  const differ = (p, q) => p.reduce((n, v, i) => n + (v !== q[i] ? 1 : 0), 0);
  const sideSum = (c, which) => side(c, which).reduce((n, v) => n + v, 0);

  // Cells along the inner lines where the shading breaks off: 0 means perfectly joined.
  function seamBreaks(bySlot, n) {
    n = n || 2;
    let total = 0;
    for (let s = 0; s < n * n; s++) {
      if (s % n < n - 1) total += differ(side(bySlot[s], 'right'), side(bySlot[s + 1], 'left'));
      if (s < n * (n - 1)) total += differ(side(bySlot[s], 'bottom'), side(bySlot[s + n], 'top'));
    }
    return total;
  }

  // Shaded cells lying along the board's edge. A piece turned the wrong way round pushes its
  // straight cut edge out here, so this gives away most wrong arrangements.
  function edgeCells(bySlot, n) {
    n = n || 2;
    let total = 0;
    for (let s = 0; s < n * n; s++) total += edgeOf(bySlot[s], s, n);
    return total;
  }

  function edgeOf(cells, s, n) {
    let e = 0;
    if (s < n) e += sideSum(cells, 'top');
    if (s >= n * (n - 1)) e += sideSum(cells, 'bottom');
    if (s % n === 0) e += sideSum(cells, 'left');
    if (s % n === n - 1) e += sideSum(cells, 'right');
    return e;
  }

  // Counts the finished pictures players could believe in (spec: must be 1): the true one, plus
  // any other arrangement whose lines join about as cleanly and that touches the board's edge
  // about as little. `anchored` slots stay in place, as if their coordinates were printed.
  // With up to 9 loose pieces every arrangement can't be tried, so pieces are placed slot by slot
  // and a branch stops as soon as it breaks too many lines. Counting stops at `cap` pictures.
  function countPictures(slotCells, looseSlots, anchored, n, cap) {
    n = n || 2;
    cap = cap || Infinity;
    const moving = looseSlots.filter((s) => !(anchored || []).includes(s)).sort((a, b) => a - b);
    const isMoving = new Set(moving);
    const key = (cells) => cells.map((c) => Array.prototype.join.call(c, '')).join('|');
    const limit = seamBreaks(slotCells, n) + SEAM_TOLERANCE;
    const edgeLimit = edgeCells(slotCells, n) + EDGE_TOLERANCE;
    const seen = new Set([key(slotCells)]);
    // Seams and edges that involve fixed slots only never change.
    let fixedSeam = 0, fixedEdge = 0;
    for (let s = 0; s < n * n; s++) {
      if (isMoving.has(s)) continue;
      fixedEdge += edgeOf(slotCells[s], s, n);
      if (s % n < n - 1 && !isMoving.has(s + 1)) fixedSeam += differ(side(slotCells[s], 'right'), side(slotCells[s + 1], 'left'));
      if (s < n * (n - 1) && !isMoving.has(s + n)) fixedSeam += differ(side(slotCells[s], 'bottom'), side(slotCells[s + n], 'top'));
    }
    const bySlot = slotCells.slice();
    const used = new Array(moving.length).fill(false);
    // Lines a newly placed slot closes: with every fixed neighbour, and with moving ones placed before it.
    const cost = (s, placed) => {
      const c = bySlot[s];
      let seam = 0;
      const near = (t) => !isMoving.has(t) || placed.has(t);
      if (s % n > 0 && near(s - 1)) seam += differ(side(bySlot[s - 1], 'right'), side(c, 'left'));
      if (s % n < n - 1 && near(s + 1)) seam += differ(side(c, 'right'), side(bySlot[s + 1], 'left'));
      if (s >= n && near(s - n)) seam += differ(side(bySlot[s - n], 'bottom'), side(c, 'top'));
      if (s < n * (n - 1) && near(s + n)) seam += differ(side(c, 'bottom'), side(bySlot[s + n], 'top'));
      return { seam, edge: edgeOf(c, s, n) };
    };
    const placed = new Set();
    (function walk(k, seam, edge) {
      if (seen.size >= cap) return;
      if (k === moving.length) { seen.add(key(bySlot)); return; }
      const s = moving[k];
      for (let i = 0; i < moving.length; i++) {
        if (used[i]) continue;
        bySlot[s] = slotCells[moving[i]];
        const c = cost(s, placed);
        if (seam + c.seam > limit || edge + c.edge > edgeLimit) continue;
        used[i] = true; placed.add(s);
        walk(k + 1, seam + c.seam, edge + c.edge);
        used[i] = false; placed.delete(s);
        if (seen.size >= cap) return;
      }
      bySlot[s] = slotCells[s];
    })(0, fixedSeam, fixedEdge);
    return seen.size;
  }

  // ------------------------------------------------------------------ placement
  function cutAt(img, ox, oy, n) {
    const size = n * PIECE;
    const board = new Uint8Array(size * size);
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (img.cells[y * img.w + x]) board[(oy + y) * size + ox + x] = 1;
    const slots = [];
    for (let s = 0; s < n * n; s++) {
      const sx = (s % n) * PIECE, sy = Math.floor(s / n) * PIECE;
      const cells = new Uint8Array(PIECE * PIECE);
      for (let y = 0; y < PIECE; y++) for (let x = 0; x < PIECE; x++) cells[y * PIECE + x] = board[(sy + y) * size + sx + x];
      slots.push(cells);
    }
    return slots;
  }

  const countCells = (c) => c.reduce((n, v) => n + v, 0);

  // Every legal way to place the image, best first: most puzzle pieces, fewest changed cells,
  // and no piece that is nearly solid (its loop would just run around the border).
  function placements(rows) {
    const img = parseRows(rows);
    if (img.w > MAX_BOARD || img.h > MAX_BOARD) throw new Error('Image must fit inside 30x30');
    const n = gridFor(img.w, img.h), size = n * PIECE;
    const out = [];
    for (let oy = 0; oy + img.h <= size; oy++) for (let ox = 0; ox + img.w <= size; ox++) {
      const raw = cutAt(img, ox, oy, n);
      let repaired = 0, ok = true, dull = 0;
      const slots = [];
      for (let s = 0; s < n * n && ok; s++) {
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
      out.push({ ox, oy, n, slots, repaired, puzzles, dull });
    }
    out.sort((a, b) => (b.puzzles - a.puzzles) || (a.dull - b.dull) || (a.repaired - b.repaired));
    return out;
  }

  // The plan for one chapter. opts: { rows, difficulty, seed }
  // Hard needs a single possible picture without coordinates: try other placements, then
  // print the coordinates of one anchor piece, or of two on a 3x3 board (spec section 11).
  function plan(opts) {
    const r = root.Generator.rng(opts.seed);
    const list = placements(opts.rows);
    if (!list.length) throw new Error('This image has no usable placement');
    const n = list[0].n;
    // Several equally good placements exist, so a new seed gives a different cut.
    const top = list.filter((p) => p.puzzles === list[0].puzzles && p.dull === list[0].dull && p.repaired <= list[0].repaired + 1);
    const ordered = r.shuffle(top.slice()).concat(list.filter((p) => !top.includes(p)));
    const hard = opts.difficulty === 'hard';
    const tries = ordered.slice(0, n === 2 ? 200 : 40);
    const unique = (p, anchors) => {
      const cells = p.slots.map((s) => s.cells);
      const loose = p.slots.map((s, i) => (s.type === 'puzzle' ? i : -1)).filter((i) => i >= 0);
      return countPictures(cells, loose, anchors, n, 2) === 1;
    };
    const looseOf = (p) => p.slots.map((s, i) => (s.type === 'puzzle' ? i : -1)).filter((i) => i >= 0);
    let chosen = null, anchors = [];
    for (const p of tries) {
      if (!hard || unique(p, [])) { chosen = p; break; }
    }
    if (!chosen) {
      for (const p of tries) {
        const a = looseOf(p).find((s) => unique(p, [s]));
        if (a !== undefined) { chosen = p; anchors = [a]; break; }
      }
    }
    if (!chosen && n > 2) {
      for (const p of tries) {
        const loose = looseOf(p);
        for (let i = 0; i < loose.length && !chosen; i++) for (let j = i + 1; j < loose.length && !chosen; j++) {
          if (unique(p, [loose[i], loose[j]])) { chosen = p; anchors = [loose[i], loose[j]]; }
        }
        if (chosen) break;
      }
    }
    if (!chosen) throw new Error('This image cannot be assembled in only one way');

    // Pieces are handed out in shuffled order, so the numbering gives nothing away.
    const loose = looseOf(chosen);
    const order = r.shuffle(loose.slice());
    return {
      ox: chosen.ox, oy: chosen.oy, grid: n,
      repaired: chosen.repaired,
      slots: chosen.slots.map((s, i) => ({ slot: i, label: labelOf(i, n), type: s.type, cells: Array.from(s.cells) })),
      pieces: order.map((slot, k) => ({ number: k + 1, slot, label: labelOf(slot, n), showLabel: !hard || anchors.includes(slot), mask: Array.from(chosen.slots[slot].cells) }))
    };
  }

  // Pieces per side of a saved plan; plans made before 3x3 boards existed have no `grid`.
  const gridOf = (p) => p.grid || Math.round(Math.sqrt(p.slots.length));

  // The picture as players end up with it, after repairs, cropped to its shape.
  function assembledRows(p) {
    const n = gridOf(p), size = n * PIECE;
    const rows = [];
    for (let y = 0; y < size; y++) {
      let row = '';
      for (let x = 0; x < size; x++) {
        const slot = p.slots[Math.floor(y / PIECE) * n + Math.floor(x / PIECE)];
        row += slot.cells[(y % PIECE) * PIECE + (x % PIECE)] ? '#' : '.';
      }
      rows.push(row);
    }
    const body = rows.filter((r) => r.includes('#'));
    let left = 0, right = size - 1;
    while (body.every((r) => r[left] === '.')) left++;
    while (body.every((r) => r[right] === '.')) right--;
    return body.map((r) => r.slice(left, right + 1));
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

  root.Mosaic = { BOARD, MAX_BOARD, PIECE, SLOT_LABELS, gridFor, gridOf, labelOf, parseRows, repair, placements, countPictures, plan, assembledRows, review };
})(typeof self !== 'undefined' ? self : globalThis);
