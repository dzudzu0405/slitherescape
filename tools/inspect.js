// node tools/inspect.js LETTER difficulty [reverse]
'use strict';
const path = require('path');
const dir = path.join(__dirname, '..', 'assets', 'js', 'engine');
['glyphs.js', 'slither.js', 'generator.js'].forEach((f) => require(path.join(dir, f)));
const { Generator, Slither } = globalThis;
const SIZES = { easy: [7, 9], medium: [10, 12], hard: [12, 13] };
const [L = 'G', d = 'medium', rev] = process.argv.slice(2);
const [W, H] = SIZES[d];
let t = Date.now();
const p = Generator.generate({ letter: L, W, H, difficulty: d, reverse: rev === 'rev', seed: 'inspect-' + L + d });
const tGen = Date.now() - t - 0;
t = Date.now();
const g = Slither.grid(W, H);
const n = Slither.countSolutions(g, Int8Array.from(p.clues), 2, 2000000);
console.log(`total ${tGen} ms (incl. verify ${p.verify.method}); full count -> ${n} in ${Date.now() - t} ms`);
for (let r = 0; r < H; r++) {
  let a = '', b = '';
  for (let c = 0; c < W; c++) {
    const i = r * W + c;
    a += (p.clues[i] < 0 ? '.' : p.clues[i]) + ' ';
    b += (p.inside[i] ? '#' : '.') + ' ';
  }
  console.log(a + '   ' + b);
}
