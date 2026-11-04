// Checks our own Mosaic drawings: node tools/test-drawings.js christmas
// Each drawing in pro/library/drawn/<theme>.txt must be one solid shape that fits the board,
// cut cleanly and build puzzles at every level. Pairs that look alike are listed too.
'use strict';
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'assets', 'js', 'engine');
['glyphs.js', 'slither.js', 'generator.js'].forEach((f) => require(path.join(dir, f)));
require(path.join(__dirname, '..', 'pro', 'engine', 'mosaic.js'));
const { Generator, Glyphs, Mosaic } = globalThis;

const LEVELS = ['easy', 'medium', 'hard'];
const ALIKE = 0.72; // share of cells two centred drawings have in common

function parse(file) {
  return fs.readFileSync(file, 'utf8').replace(/\r/g, '').trim().split(/\n\s*\n/).map((block) => {
    const [head, ...rows] = block.split('\n');
    const [name, similar] = head.split('|').map((s) => s.trim());
    return { name, similar: similar ? similar.split(',') : [], rows };
  });
}

function overlap(a, b) {
  const place = (m) => {
    const ox = 10 - (m.rows[0].length >> 1), oy = 10 - (m.rows.length >> 1);
    const set = new Set();
    m.rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') set.add((oy + y) * 20 + ox + x); }));
    return set;
  };
  const A = place(a), B = place(b);
  let both = 0;
  A.forEach((c) => { if (B.has(c)) both++; });
  return both / (A.size + B.size - both);
}

const theme = process.argv[2] || 'christmas';
const list = parse(path.join(__dirname, '..', 'pro', 'library', 'drawn', `${theme}.txt`));
const names = list.map((m) => m.name);
let failures = 0;
const fail = (m, why) => { failures++; console.log(`${m.name.padEnd(12)} FAIL ${why}`); };

for (const m of list) {
  const w = m.rows[0].length, h = m.rows.length;
  if (!/^[A-Z]{3,12}$/.test(m.name)) fail(m, 'name must be one word of 3 to 12 letters');
  if (m.rows.some((r) => r.length !== w || !/^[#.]+$/.test(r))) { fail(m, 'rows differ in width'); continue; }
  if (w > 20 || h > 20) { fail(m, `size ${w}x${h} is over 20x20`); continue; }
  if (Math.max(w, h) < 19) console.log(`${m.name.padEnd(12)} note: longest side is only ${Math.max(w, h)}`);
  m.similar.filter((s) => !names.includes(s)).forEach((s) => fail(m, `look-alike ${s} is not in this theme`));
  const cells = Uint8Array.from(m.rows.join('').split('').map((c) => (c === '#' ? 1 : 0)));
  const shape = Glyphs.checkMask(cells, w, h);
  if (shape) { fail(m, `drawing ${shape}`); continue; }
  const notes = [];
  for (const d of LEVELS) {
    try {
      const plan = Mosaic.plan({ rows: m.rows, difficulty: d, seed: `draw-${d}-${m.name}` });
      let bad = 0;
      plan.pieces.forEach((p) => {
        const pz = Generator.generateMask({ mask: p.mask, W: Mosaic.PIECE, H: Mosaic.PIECE, difficulty: d, seed: `${m.name}-${p.number}` });
        if (!pz.verify.ok) bad++;
      });
      if (bad) fail(m, `${d}: ${bad} pieces failed`);
      const anchored = d === 'hard' && plan.pieces.some((p) => p.showLabel);
      notes.push(`${d[0]}:${plan.pieces.length}p/${plan.repaired}c${anchored ? '/anchor' : ''}`);
    } catch (e) { fail(m, `${d}: ${e.message}`); }
  }
  console.log(`${m.name.padEnd(12)} ${w}x${h}  ${notes.join(' ')}`);
}

for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
  const v = overlap(list[i], list[j]);
  if (v >= ALIKE) console.log(`alike ${Math.round(v * 100)}%: ${list[i].name} / ${list[j].name}`);
}
console.log(failures ? `\n${failures} FAILURES` : `\nALL OK (${list.length} drawings)`);
process.exit(failures ? 1 : 0);
