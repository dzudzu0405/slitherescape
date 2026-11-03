// Measures how much the clue layout gives the letter away, without solving.
// A simulated player looks only at WHERE the non-zero clues sit and compares that with
// the outline band of every letter at every position. Random guessing scores ~4%.
// Usage: node tools/leak-test.js [seedsPerLetter] [difficulty]
'use strict';
const path = require('path');
const dir = path.join(__dirname, '..', 'assets', 'js', 'engine');
['glyphs.js', 'slither.js', 'generator.js'].forEach((f) => require(path.join(dir, f)));
const { Generator, Slither, Glyphs } = globalThis;

const SIZES = { easy: [7, 9], medium: [10, 12], hard: [12, 13] };
const seeds = +process.argv[2] || 2;
const diffs = process.argv[3] ? [process.argv[3]] : ['easy', 'medium', 'hard'];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Outline bands of every design of a letter at every position in the grid.
function bands(W, H) {
  const g = Slither.grid(W, H);
  const out = {};
  for (const L of LETTERS) {
    out[L] = [];
    const designs = Glyphs.variants(L).filter((v) => /^(regular|alt)$/.test(v.name) && v.w <= W && v.h <= H);
    for (const v of designs) {
      for (let oy = 0; oy <= H - v.h; oy++) for (let ox = 0; ox <= W - v.w; ox++) {
        const inside = new Uint8Array(W * H);
        for (let y = 0; y < v.h; y++) for (let x = 0; x < v.w; x++) if (v.cells[y * v.w + x]) inside[(oy + y) * W + ox + x] = 1;
        const clues = Slither.cluesFromEdges(g, Slither.edgesFromMask(g, inside));
        const band = [];
        for (let i = 0; i < W * H; i++) if (clues[i] > 0) band.push(i);
        out[L].push({ set: new Set(band), size: band.length });
      }
    }
  }
  return out;
}

// Best overlap between the visible non-zero clues and each letter's band.
function guess(p, table, useZeros) {
  const seen = [], zeros = [];
  p.clues.forEach((c, i) => { if (c > 0) seen.push(i); else if (c === 0) zeros.push(i); });
  const scores = LETTERS.map((L) => {
    let best = -1;
    for (const b of table[L]) {
      let hit = 0;
      for (const i of seen) if (b.set.has(i)) hit++;
      // A visible 0 inside a letter's band speaks against that letter at that position.
      let miss = 0;
      if (useZeros) for (const i of zeros) if (b.set.has(i)) miss++;
      const j = (hit - miss) / (seen.length + b.size - hit);
      if (j > best) best = j;
    }
    return { L, s: best };
  }).sort((a, b) => b.s - a.s);
  return scores.findIndex((x) => x.L === p.letter) + 1;
}

for (const d of diffs) {
  const [W, H] = SIZES[d];
  const table = bands(W, H);
  const g = Slither.grid(W, H);
  let n = 0, top1 = 0, top3 = 0, zTop1 = 0, clues = 0, bandD = 0, outD = 0, zeros = 0, l1 = 0, l2 = 0, bad = 0, ms = 0;
  for (const L of LETTERS) for (let s = 0; s < seeds; s++) {
    const t0 = Date.now();
    const p = Generator.generate({ letter: L, W, H, difficulty: d, seed: `leak-${d}-${L}-${s}` });
    ms += Date.now() - t0;
    n++;
    if (!p.verify.ok) bad++;
    const rank = guess(p, table);
    if (rank === 1) top1++;
    if (rank <= 3) top3++;
    if (guess(p, table, true) === 1) zTop1++;
    const full = Slither.cluesFromEdges(g, Int8Array.from(p.solution));
    let bk = 0, bt = 0, ok = 0, ot = 0;
    for (let i = 0; i < W * H; i++) {
      if (full[i] > 0) { bt++; if (p.clues[i] >= 0) bk++; } else { ot++; if (p.clues[i] >= 0) { ok++; zeros++; } }
    }
    clues += p.clueCount / (W * H); bandD += bk / bt; outD += ok / ot;
    const c = Int8Array.from(p.clues);
    if (new Slither.Solver(g, c, 1).solve().solved) l1++;
    if (d === 'hard' && new Slither.Solver(g, c, 2).solve().solved) l2++;
  }
  const pct = (x) => Math.round(100 * x / n) + '%';
  console.log(`${d.padEnd(6)} n=${n} | guessed ${pct(top1)}, top-3 ${pct(top3)}, using zeros too ${pct(zTop1)} | clues ${pct(clues)} | density near letter ${pct(bandD)} vs elsewhere ${pct(outD)} | solvable L1 ${l1}, L2 ${l2} | verify failures ${bad} | ${Math.round(ms / n)} ms each`);
}
