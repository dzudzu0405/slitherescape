// Engine test: node tools/test-engine.js [difficulty] [letters] [seedPrefix]
// Generates one puzzle per letter, checks the verifier and prints timing and clue stats.
'use strict';
const path = require('path');
const dir = path.join(__dirname, '..', 'assets', 'js', 'engine');
require(path.join(dir, 'glyphs.js'));
require(path.join(dir, 'slither.js'));
require(path.join(dir, 'generator.js'));
const { Generator } = globalThis;

const SIZES = { easy: [7, 9], medium: [10, 12], hard: [12, 13] };
const diffs = process.argv[2] ? [process.argv[2]] : ['easy', 'medium', 'hard'];
const letters = (process.argv[3] || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ').split('');
const prefix = process.argv[4] || 'test';

let failures = 0;
for (const d of diffs) {
  const [W, H] = SIZES[d];
  const times = [];
  console.log(`\n== ${d} ${W}x${H}`);
  for (const L of letters) {
    for (const reverse of d === 'hard' ? [false, true] : [false]) {
      const t0 = Date.now();
      let p;
      try {
        p = Generator.generate({ letter: L, W, H, difficulty: d, reverse, seed: `${prefix}-${d}-${L}-${reverse}` });
      } catch (e) {
        failures++;
        console.log(`${L}${reverse ? ' (rev)' : ''}: ERROR ${e.message}`);
        continue;
      }
      const ms = Date.now() - t0;
      times.push(ms);
      const v = p.verify;
      if (!v.ok) failures++;
      console.log(`${L}${reverse ? ' (rev)' : '      '} ${String(ms).padStart(6)} ms  clues ${String(p.clueCount).padStart(3)}/${W * H} (${Math.round(100 * p.clueCount / (W * H))}%)  leak ${p.leak}  ${p.variant.padEnd(7)} ${v.ok ? 'OK' : 'FAIL ' + v.problems.join('; ')} [${v.method}]`);
    }
  }
  times.sort((a, b) => a - b);
  console.log(`-- ${d}: median ${times[times.length >> 1]} ms, max ${times[times.length - 1]} ms`);
}
const ex = Generator.example('example');
console.log('\nexample 4x4 clues:', ex.clues.map((c) => (c < 0 ? '.' : c)).join(''));
console.log(failures ? `\n${failures} FAILURES` : '\nALL OK');
process.exit(failures ? 1 : 0);
