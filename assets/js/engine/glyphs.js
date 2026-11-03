// Glyph library: capital letters drawn on the cell grid (spec section 4.2).
// A glyph is valid when its cells are 4-connected, it has no holes (every empty cell
// reaches the border) and it has no checkerboard 2x2 pinch. Letters with holes use a
// stencil cut; diagonals are drawn as edge-connected staircases.
(function (root) {
  'use strict';

  // Base designs, '#' = inside the loop. Most are 5x7; B is 7x9 (5x7 reads as 8/E), Q is 6x7.
  const BASE = {
    A: ['.#.#.', '##.##', '#...#', '#####', '#...#', '#...#', '#...#'],
    B: ['######.', '#....##', '#......', '#....##', '######.', '#....##', '#......', '#....##', '######.'],
    C: ['.####', '##...', '#....', '#....', '#....', '##...', '.####'],
    D: ['####.', '#..##', '#...#', '#....', '#...#', '#..##', '####.'],
    E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
    G: ['.####', '##...', '#....', '#..##', '#...#', '##..#', '.####'],
    H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
    J: ['#####', '...#.', '...#.', '...#.', '...#.', '#..#.', '####.'],
    K: ['#...#', '#..##', '#.##.', '###..', '#.##.', '#..##', '#...#'],
    L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    M: ['#...#', '##.##', '#####', '#.#.#', '#...#', '#...#', '#...#'],
    N: ['#...#', '##..#', '###.#', '#.###', '#..##', '#...#', '#...#'],
    O: ['.#.#.', '##.##', '#...#', '#...#', '#...#', '##.##', '.###.'],
    P: ['####.', '#..##', '#....', '#..##', '####.', '#....', '#....'],
    Q: ['.#.#..', '##.##.', '#...#.', '#...#.', '#..##.', '##.##.', '.#####'],
    R: ['####.', '#..##', '#....', '#..##', '####.', '#.##.', '#..##'],
    S: ['#####', '#....', '#....', '#####', '....#', '....#', '#####'],
    T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    U: ['#...#', '#...#', '#...#', '#...#', '#...#', '##.##', '.###.'],
    V: ['#...#', '#...#', '#...#', '##.##', '.#.#.', '.###.', '..#..'],
    W: ['#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '#####', '.#.#.'],
    X: ['#...#', '##.##', '.###.', '..#..', '.###.', '##.##', '#...#'],
    Y: ['#...#', '##.##', '.###.', '..#..', '..#..', '..#..', '..#..'],
    Z: ['#####', '....#', '...##', '..##.', '.##..', '##...', '#####']
  };

  // Second hand-drawn style for letters that have a clearly different common form.
  const ALT = {
    A: ['#####', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'].map((r, i) => (i === 0 ? '##.##' : r)),
    C: ['#####', '#....', '#....', '#....', '#....', '#....', '#####'],
    D: ['###..', '#.##.', '#..##', '#...#', '#....', '#..##', '####.'],
    E: ['#####', '#....', '#....', '###..', '#....', '#....', '#####'],
    F: ['#####', '#....', '#....', '###..', '#....', '#....', '#....'],
    G: ['#####', '#....', '#....', '#.###', '#...#', '#...#', '#####'],
    H: ['#...#', '#...#', '#####', '#...#', '#...#', '#...#', '#...#'],
    I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '####.'],
    K: ['#...#', '#..##', '#.##.', '###..', '##...', '###..', '#.###'],
    L: ['#....', '#....', '#....', '#....', '#....', '#....', '####.'],
    M: ['##.##', '#####', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
    N: ['##..#', '###.#', '#.#.#', '#.###', '#..##', '#...#', '#...#'],
    O: ['##.##', '#...#', '#...#', '#...#', '#...#', '#...#', '#####'],
    P: ['#####', '#...#', '#....', '#...#', '#####', '#....', '#....'],
    R: ['#####', '#...#', '#....', '#...#', '#####', '#..#.', '#..##'],
    S: ['.####', '##...', '##...', '.###.', '...##', '...##', '####.'],
    T: ['#####', '#.#.#', '..#..', '..#..', '..#..', '..#..', '.###.'],
    U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '#####'],
    V: ['#...#', '#...#', '##.##', '.#.#.', '.#.#.', '.###.', '..#..'],
    W: ['#...#', '#...#', '#...#', '#.#.#', '#####', '##.##', '#...#'],
    Y: ['#...#', '#...#', '##.##', '.###.', '..#..', '..#..', '.###.'],
    Z: ['#####', '....#', '...##', '.###.', '##...', '#....', '#####']
  };

  // Largest variant kept, so every letter still fits the Easy 7x9 grid in some form.
  const MAX_W = 8, MAX_H = 10;

  // Rows/columns that can be doubled to make wider/taller variants without changing the letter.
  // Doubling a row or column keeps connectivity, holes and pinches unchanged.
  function dupColumn(rows, c) {
    return rows.map((r) => r.slice(0, c + 1) + r[c] + r.slice(c + 1));
  }
  function dupRow(rows, r) {
    return rows.slice(0, r + 1).concat([rows[r]], rows.slice(r + 1));
  }

  function toGlyph(letter, rows, name) {
    const h = rows.length, w = rows[0].length;
    const cells = new Uint8Array(w * h);
    rows.forEach((row, r) => { for (let c = 0; c < w; c++) cells[r * w + c] = row[c] === '#' ? 1 : 0; });
    return { letter, name, w, h, cells, rows };
  }

  // Validity check for a cell mask inside a w x h box (outside the box counts as empty).
  function checkMask(cells, w, h) {
    const at = (r, c) => (r >= 0 && r < h && c >= 0 && c < w ? cells[r * w + c] : 0);
    let first = -1, count = 0;
    for (let i = 0; i < w * h; i++) if (cells[i]) { count++; if (first < 0) first = i; }
    if (!count) return 'empty';
    // 1. Inside cells 4-connected.
    const seen = new Uint8Array(w * h);
    const stack = [first];
    seen[first] = 1;
    let n = 0;
    while (stack.length) {
      const i = stack.pop(); n++;
      const r = (i / w) | 0, c = i % w;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const rr = r + dr, cc = c + dc;
        if (at(rr, cc) && !seen[rr * w + cc]) { seen[rr * w + cc] = 1; stack.push(rr * w + cc); }
      }
    }
    if (n !== count) return 'not connected';
    // 2. No holes: flood the outside (padded by one ring) and make sure it reaches every empty cell.
    const W2 = w + 2, H2 = h + 2;
    const out = new Uint8Array(W2 * H2);
    const st = [0];
    out[0] = 1;
    while (st.length) {
      const i = st.pop();
      const r = (i / W2) | 0, c = i % W2;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || rr >= H2 || cc < 0 || cc >= W2) continue;
        const j = rr * W2 + cc;
        if (!out[j] && !at(rr - 1, cc - 1)) { out[j] = 1; st.push(j); }
      }
    }
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      if (!at(r, c) && !out[(r + 1) * W2 + c + 1]) return 'has a hole';
    }
    // 3. No checkerboard 2x2 (the loop would touch itself at a corner).
    for (let r = -1; r < h; r++) for (let c = -1; c < w; c++) {
      const a = at(r, c), b = at(r, c + 1), d = at(r + 1, c), e = at(r + 1, c + 1);
      if (a === e && b === d && a !== b) return 'diagonal pinch';
    }
    return null;
  }

  // Each design yields: itself, every single doubled column (thicker stroke or wider
  // counter), every doubled row except the first/last (taller top or bottom part), and
  // a wide+tall combination. Duplicates and invalid shapes are dropped.
  function expand(letter, rows, style) {
    const w = rows[0].length, h = rows.length;
    const out = [[rows, `${style}`]];
    for (let c = 0; c < w; c++) out.push([dupColumn(rows, c), `${style} col${c + 1}`]);
    for (let r = 1; r < h - 1; r++) out.push([dupRow(rows, r), `${style} row${r + 1}`]);
    out.push([dupRow(dupColumn(rows, Math.floor(w / 2)), Math.floor(h / 2) - 1), `${style} wide+tall`]);
    return out;
  }

  const LIBRARY = {};
  const REJECTED = [];
  Object.keys(BASE).forEach((letter) => {
    const designs = [[BASE[letter], 'regular']];
    if (ALT[letter]) designs.push([ALT[letter], 'alt']);
    const seen = new Set();
    const list = [];
    designs.forEach(([rows, style]) => {
      if (checkMask(toGlyph(letter, rows, style).cells, rows[0].length, rows.length) !== null) {
        REJECTED.push(`${letter} ${style}`);
        return;
      }
      expand(letter, rows, style).forEach(([v, name]) => {
        const key = v.join('/');
        if (seen.has(key) || v[0].length > MAX_W || v.length > MAX_H) return;
        seen.add(key);
        const g = toGlyph(letter, v, name);
        if (checkMask(g.cells, g.w, g.h) === null) list.push(g);
      });
    });
    LIBRARY[letter] = list;
  });

  function variants(letter) { return LIBRARY[letter] || []; }
  function has(letter) { return variants(letter).length > 0; }

  root.Glyphs = { BASE, ALT, LIBRARY, REJECTED, variants, has, checkMask, toGlyph };
})(typeof self !== 'undefined' ? self : globalThis);
