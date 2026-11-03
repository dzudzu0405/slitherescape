// Puzzle generator, hint data and verifier (spec sections 4.3-4.6).
(function (root) {
  'use strict';
  const S = root.Slither;
  const Glyphs = root.Glyphs;

  // Difficulty presets: logic level; `density` = share of the clues near the letter to keep
  // (the solver may need more); `farBonus` = how much denser the numbers elsewhere may be
  // than those near the letter; `leak` = largest share of the loop that plain level-1 rules
  // may reveal before any trial.
  const LEVELS = {
    easy: { level: 1, density: 0.40, farBonus: 0, leak: 1.0 },
    medium: { level: 2, density: 0.30, farBonus: 0.20, leak: 0.55 },
    hard: { level: 3, density: 0.24, farBonus: 0.10, leak: 0.45 }
  };

  // ------------------------------------------------------------------ RNG
  function hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h;
  }
  function rng(seed) {
    let a = (typeof seed === 'string' ? hashString(seed) : seed) >>> 0;
    const next = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.int = (n) => Math.floor(next() * n);
    next.pick = (arr) => arr[Math.floor(next() * arr.length)];
    next.shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
    return next;
  }

  // ------------------------------------------------------------------ placement
  // Forward mode: the letter itself is the inside of the loop.
  function placeForward(glyph, W, H, r) {
    if (glyph.w > W || glyph.h > H) return null;
    const ox = r.int(W - glyph.w + 1), oy = r.int(H - glyph.h + 1);
    const inside = new Uint8Array(W * H);
    for (let y = 0; y < glyph.h; y++) for (let x = 0; x < glyph.w; x++) {
      if (glyph.cells[y * glyph.w + x]) inside[(oy + y) * W + ox + x] = 1;
    }
    return { inside, letterMask: inside.slice(), ox, oy };
  }

  // Reverse mode: the loop encloses a frame; the letter is cut out of it and joined to
  // the outside by a one-cell tail under the foot of a stroke (spec section 3).
  function placeReverse(glyph, W, H, r) {
    // Frame needs one free cell around the letter on every side.
    if (glyph.w + 2 > W || glyph.h + 2 > H) return null;
    const maxM = (W - glyph.w - 2 >= 2 && H - glyph.h - 2 >= 2) ? 1 : 0;
    const m = r.int(maxM + 1);
    const fx0 = m, fy0 = m, fx1 = W - 1 - m, fy1 = H - 1 - m; // frame bounds, inclusive
    // Letter sits exactly one row above the frame's bottom row so the tail is one cell.
    const oy = fy1 - glyph.h;
    const minX = fx0 + 1, maxX = fx1 - glyph.w;
    if (oy < fy0 + 1 || maxX < minX) return null;
    const ox = minX + r.int(maxX - minX + 1);
    const letterMask = new Uint8Array(W * H);
    for (let y = 0; y < glyph.h; y++) for (let x = 0; x < glyph.w; x++) {
      if (glyph.cells[y * glyph.w + x]) letterMask[(oy + y) * W + ox + x] = 1;
    }
    const feet = [];
    for (let x = 0; x < glyph.w; x++) if (glyph.cells[(glyph.h - 1) * glyph.w + x]) feet.push(ox + x);
    r.shuffle(feet);
    for (const tx of feet) {
      const inside = new Uint8Array(W * H);
      for (let y = fy0; y <= fy1; y++) for (let x = fx0; x <= fx1; x++) inside[y * W + x] = 1;
      for (let i = 0; i < W * H; i++) if (letterMask[i]) inside[i] = 0;
      inside[fy1 * W + tx] = 0; // the tail
      if (Glyphs.checkMask(inside, W, H) === null) return { inside, letterMask, ox, oy, tail: fy1 * W + tx };
    }
    return null;
  }

  // ------------------------------------------------------------------ clue removal
  function solvesTo(g, clues, level, solution) {
    const solver = new S.Solver(g, clues, level);
    const res = solver.solve();
    if (!res.solved) return false;
    for (let e = 0; e < g.E; e++) if (res.state.edges[e] !== solution[e]) return false;
    return true;
  }

  // Share of loop edges that plain level-1 rules find on their own: high means the
  // letter shape is visible straight from the clues.
  function leakScore(g, clues, solution) {
    const solver = new S.Solver(g, clues, 1);
    const res = solver.solve();
    let total = 0, found = 0;
    for (let e = 0; e < g.E; e++) {
      if (solution[e] !== 1) continue;
      total++;
      if (res.state.edges[e] === 1) found++;
    }
    return total ? found / total : 0;
  }

  // Chooses which clues stay. Every non-zero clue touches the loop, so if the far-away
  // zeros are removed first the remaining numbers draw the letter's outline. Instead:
  // 1. thin the clues near the letter, most crowded first, down to the target density;
  // 2. thin the zeros elsewhere only down to the density the letter area ended up with,
  //    so the numbers look evenly spread and the shape can't be read at a glance;
  // 3. if a lower logic level could still solve it, keep removing until it can't.
  function reduceClues(g, full, solution, preset, r) {
    const { W, H, NC } = g;
    const clues = full.slice();
    const near = [], far = [];
    for (let i = 0; i < NC; i++) (full[i] > 0 ? near : far).push(i);

    const crowding = (i) => {
      const row = (i / W) | 0, col = i % W;
      // Share of neighbours with a clue, plus a little noise: raw counts would treat border
      // cells as sparse and leave lines of numbers along the edges of the grid.
      let n = 0, all = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const rr = row + dr, cc = col + dc;
        if (rr < 0 || rr >= H || cc < 0 || cc >= W) continue;
        all++;
        if (clues[rr * W + cc] >= 0) n++;
      }
      return n / all + r() * 0.35;
    };
    const kept = (list) => list.reduce((n, i) => n + (clues[i] >= 0 ? 1 : 0), 0);
    const tryRemove = (i) => {
      const saved = clues[i];
      clues[i] = -1;
      if (solvesTo(g, clues, preset.level, solution)) return true;
      clues[i] = saved;
      return false;
    };
    // Always removes the most crowded remaining clue, re-measuring after each removal, so the
    // numbers thin out evenly instead of whole areas emptying at once. A clue the solver
    // needs stays.
    const thin = (list, targetCount, extraKey) => {
      let open = list.filter((i) => clues[i] >= 0);
      let left = open.length;
      while (open.length && left > targetCount) {
        let bestI = -1, bestKey = -Infinity;
        for (const i of open) {
          const k = crowding(i) + (extraKey ? extraKey(i) : 0);
          if (k > bestKey) { bestKey = k; bestI = i; }
        }
        open = open.filter((i) => i !== bestI);
        if (tryRemove(bestI)) left--;
      }
    };

    // 3s mark corners very visibly, so they go a little earlier.
    thin(near, Math.ceil(near.length * preset.density), (i) => (full[i] === 3 ? 0.25 : 0));
    const nearDensity = near.length ? kept(near) / near.length : preset.density;
    // Zeros right next to the outline would trace it too, so that ring is thinned as far as
    // the solver allows, while the zeros further out keep their density and fill the grid.
    const touchesNear = (i) => {
      const row = (i / W) | 0, col = i % W;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = row + dr, cc = col + dc;
        if (rr >= 0 && rr < H && cc >= 0 && cc < W && full[rr * W + cc] > 0) return true;
      }
      return false;
    };
    const ring = far.filter(touchesNear), outer = far.filter((i) => !touchesNear(i));
    const farDensity = Math.min(1, nearDensity + preset.farBonus);
    thin(ring, Math.ceil(ring.length * nearDensity * 0.5), null);
    thin(outer, Math.ceil(outer.length * farDensity), null);

    // The puzzle must still need its own logic level.
    if (preset.level > 1) {
      const tooEasy = () => new S.Solver(g, clues, preset.level - 1).solve().solved;
      const order = r.shuffle(near.concat(far).filter((i) => clues[i] >= 0));
      order.sort((a, b) => crowding(b) - crowding(a));
      for (const i of order) {
        if (!tooEasy()) break;
        tryRemove(i);
      }
    }
    return clues;
  }

  // ------------------------------------------------------------------ hints
  // Hint 1 shows ~20% of the loop, Hint 2 ~50%, as one run from a random start.
  function makeHints(g, solution, r) {
    const order = S.loopOrder(g, solution);
    const start = r.int(order.length);
    const rot = order.slice(start).concat(order.slice(0, start));
    return [rot.slice(0, Math.max(1, Math.round(rot.length * 0.2))), rot.slice(0, Math.max(2, Math.round(rot.length * 0.5)))];
  }

  // ------------------------------------------------------------------ main entry
  // opts: { letter, W, H, difficulty: 'easy'|'medium'|'hard', reverse: bool, seed, variant }
  function generate(opts) {
    const preset = LEVELS[opts.difficulty] || LEVELS.medium;
    const { W, H } = opts;
    const g = S.grid(W, H);
    const r = rng(opts.seed);
    const variants = Glyphs.variants(opts.letter).filter((v) => opts.reverse ? v.w + 2 <= W && v.h + 2 <= H : v.w <= W && v.h <= H);
    if (!variants.length) throw new Error(`Letter ${opts.letter} does not fit a ${W}x${H} grid`);
    // Random variant from the seed; `variant` (how many times this letter appeared before)
    // shifts it so repeated letters in one game look different.
    const startVariant = (r.int(variants.length) + (opts.variant || 0) * 7) % variants.length;

    let best = null;
    const tries = opts.tries || 12;
    for (let t = 0; t < tries; t++) {
      const glyph = variants[(startVariant + t) % variants.length];
      const placed = opts.reverse ? placeReverse(glyph, W, H, r) : placeForward(glyph, W, H, r);
      if (!placed || Glyphs.checkMask(placed.inside, W, H) !== null) continue;
      const solution = S.edgesFromMask(g, placed.inside);
      const full = S.cluesFromEdges(g, solution);
      if (!solvesTo(g, full, preset.level, solution)) continue;
      const clues = reduceClues(g, full, solution, preset, r);
      const leak = opts.difficulty === 'easy' ? 0 : leakScore(g, clues, solution);
      const clueCount = clues.reduce((n, c) => n + (c >= 0 ? 1 : 0), 0);
      // Prefer layouts that really need this level's logic.
      const tooEasy = preset.level > 1 && new S.Solver(g, clues, preset.level - 1).solve().solved;
      const cand = { glyph, placed, solution, clues, leak, clueCount, tooEasy };
      if (!best || (best.tooEasy && !tooEasy) || (best.tooEasy === tooEasy && leak < best.leak)) best = cand;
      if (!tooEasy && leak <= preset.leak) break;
    }
    if (!best) throw new Error(`Could not build a puzzle for ${opts.letter}`);

    const puzzle = {
      letter: opts.letter,
      W, H,
      difficulty: opts.difficulty,
      level: preset.level,
      reverse: !!opts.reverse,
      variant: best.glyph.name,
      clues: Array.from(best.clues),
      inside: Array.from(best.placed.inside),
      letterMask: Array.from(best.placed.letterMask),
      solution: Array.from(best.solution),
      hints: makeHints(g, best.solution, r),
      clueCount: best.clueCount,
      leak: Math.round(best.leak * 100) / 100,
      seed: opts.seed
    };
    puzzle.verify = verify(puzzle);
    return puzzle;
  }

  // Puzzle from a ready-made shape instead of a letter (Mosaic pieces in SlitherEscape PRO).
  // opts: { mask: [0|1...], W, H, difficulty, seed, tries }
  function generateMask(opts) {
    const preset = LEVELS[opts.difficulty] || LEVELS.medium;
    const { W, H } = opts;
    const inside = Uint8Array.from(opts.mask);
    const why = Glyphs.checkMask(inside, W, H);
    if (why !== null) throw new Error(`Shape cannot be a single loop: ${why}`);
    const g = S.grid(W, H);
    const r = rng(opts.seed);
    const solution = S.edgesFromMask(g, inside);
    const full = S.cluesFromEdges(g, solution);
    if (!solvesTo(g, full, preset.level, solution)) throw new Error('Shape cannot be solved by logic at this level');
    let best = null;
    const tries = opts.tries || 6;
    for (let t = 0; t < tries; t++) {
      const clues = reduceClues(g, full, solution, preset, r);
      const leak = opts.difficulty === 'easy' ? 0 : leakScore(g, clues, solution);
      const tooEasy = preset.level > 1 && new S.Solver(g, clues, preset.level - 1).solve().solved;
      const clueCount = clues.reduce((n, c) => n + (c >= 0 ? 1 : 0), 0);
      if (!best || (best.tooEasy && !tooEasy) || (best.tooEasy === tooEasy && leak < best.leak)) best = { clues, leak, tooEasy, clueCount };
      if (!tooEasy && leak <= preset.leak) break;
    }
    const puzzle = {
      kind: 'piece',
      W, H,
      difficulty: opts.difficulty,
      level: preset.level,
      reverse: false,
      clues: Array.from(best.clues),
      inside: Array.from(inside),
      letterMask: Array.from(inside),
      solution: Array.from(solution),
      hints: makeHints(g, solution, r),
      clueCount: best.clueCount,
      leak: Math.round(best.leak * 100) / 100,
      seed: opts.seed
    };
    puzzle.verify = verify(puzzle);
    return puzzle;
  }

  // ------------------------------------------------------------------ verifier
  // Independent checks before export. Returns { ok, unique, method, problems: [] }.
  function verify(p) {
    const g = S.grid(p.W, p.H);
    const problems = [];
    const solution = Int8Array.from(p.solution);
    const clues = Int8Array.from(p.clues);
    const inside = Uint8Array.from(p.inside);

    // Rules: degrees 0/2, one loop, clues match.
    if (!S.isValidSolution(g, clues, solution)) problems.push('solution is not a single loop matching the clues');
    // The loop encloses exactly the expected region.
    const fromMask = S.edgesFromMask(g, inside);
    for (let e = 0; e < g.E; e++) if (fromMask[e] !== solution[e]) { problems.push('loop does not trace the letter'); break; }
    // The letter cells are what the players see: inside (forward) or the cut-out (reverse).
    if (p.kind !== 'piece' && !Glyphs.variants(p.letter).some((v) => v.name === p.variant)) problems.push('unknown glyph');
    for (let i = 0; i < g.NC; i++) {
      if (!p.reverse && p.letterMask[i] !== inside[i]) { problems.push('shaded area is not the letter'); break; }
      if (p.reverse && p.letterMask[i] && inside[i]) { problems.push('letter overlaps the shaded frame'); break; }
    }
    // Uniqueness: count solutions; fall back to the logic proof if the search is too big.
    let unique = false, method = 'count';
    const n = S.countSolutions(g, clues, 2, 300000, 3);
    if (n === 1) unique = true;
    else if (n === -1) {
      method = 'logic';
      const res = new S.Solver(g, clues, 3).solve();
      unique = res.solved && res.state.edges.every((v, e) => v === solution[e]);
    }
    if (!unique) problems.push(n === 0 ? 'no solution' : 'more than one solution');
    return { ok: problems.length === 0, unique, method, problems };
  }

  // Small demo puzzle for the How to Play page: a random blob on a 4x4 grid.
  function example(seed) {
    const r = rng(seed);
    const W = 4, H = 4, g = S.grid(W, H);
    for (let t = 0; t < 200; t++) {
      const inside = new Uint8Array(W * H);
      let cell = r.int(W * H);
      inside[cell] = 1;
      const target = 5 + r.int(3);
      let count = 1;
      for (let k = 0; k < 60 && count < target; k++) {
        const cells = [];
        for (let i = 0; i < W * H; i++) if (inside[i]) cells.push(i);
        const c = r.pick(cells);
        const nb = [c - W, c + W, c % W ? c - 1 : -1, c % W < W - 1 ? c + 1 : -1].filter((x) => x >= 0 && x < W * H && !inside[x]);
        if (!nb.length) continue;
        const add = r.pick(nb);
        inside[add] = 1;
        if (Glyphs.checkMask(inside, W, H) !== null) inside[add] = 0; else count++;
      }
      if (count < 5) continue;
      const solution = S.edgesFromMask(g, inside);
      const full = S.cluesFromEdges(g, solution);
      const clues = reduceClues(g, full, solution, { level: 1, density: 0.5, farBonus: 0 }, r);
      if (S.countSolutions(g, clues, 2) !== 1) continue;
      return { W, H, clues: Array.from(clues), inside: Array.from(inside), solution: Array.from(solution) };
    }
    throw new Error('Could not build the example puzzle');
  }

  root.Generator = { LEVELS, rng, hashString, generate, generateMask, verify, example };
})(typeof self !== 'undefined' ? self : globalThis);
