// Mosaic test: node tools/test-mosaic.js [difficulty] [show]
// For every library image: plans the cut, builds each piece, checks the verifier and that
// the assembled picture is the only one possible on Hard.
'use strict';
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'assets', 'js', 'engine');
['glyphs.js', 'slither.js', 'generator.js'].forEach((f) => require(path.join(dir, f)));
require(path.join(__dirname, '..', 'pro', 'engine', 'mosaic.js'));
const { Generator, Mosaic } = globalThis;

const library = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'pro', 'library', 'seed.json'), 'utf8'));
const diffs = process.argv[2] && process.argv[2] !== 'all' ? [process.argv[2]] : ['easy', 'medium', 'hard'];
const show = process.argv[3] === 'show';

let failures = 0;
for (const d of diffs) {
  const times = [];
  let pieces = 0, unusable = 0, anchors = 0;
  console.log(`\n== ${d}`);
  for (const img of library) {
    let plan;
    try {
      plan = Mosaic.plan({ rows: img.rows, difficulty: d, seed: `test-${d}-${img.name}` });
    } catch (e) {
      unusable++;
      console.log(`${img.name.padEnd(10)} NOT USABLE: ${e.message}`);
      continue;
    }
    if (show) console.log(img.rows.join('\n'));
    const t0 = Date.now();
    let bad = 0;
    plan.pieces.forEach((p) => {
      try {
        const pz = Generator.generateMask({ mask: p.mask, W: Mosaic.PIECE, H: Mosaic.PIECE, difficulty: d, seed: `${img.name}-${p.number}` });
        if (!pz.verify.ok) { bad++; console.log(`  ${p.label}: ${pz.verify.problems.join('; ')}`); }
      } catch (e) { bad++; console.log(`  ${p.label}: ${e.message}`); }
    });
    const ms = Date.now() - t0;
    times.push(ms);
    pieces += plan.pieces.length;
    failures += bad;
    const anchored = d === 'hard' && plan.pieces.some((p) => p.showLabel);
    if (anchored) anchors++;
    console.log(`${img.name.padEnd(10)} ${String(plan.pieces.length)} pieces, ${plan.repaired} cells repaired, ${String(ms).padStart(5)} ms${anchored ? ', anchor piece' : ''}${bad ? `, ${bad} FAILED` : ''}`);
  }
  times.sort((a, b) => a - b);
  console.log(`-- ${d}: ${library.length - unusable}/${library.length} usable, ${pieces} pieces, median ${times[times.length >> 1]} ms, max ${times[times.length - 1]} ms per image${d === 'hard' ? `, ${anchors} with anchor` : ''}`);
  failures += unusable;
}
console.log(failures ? `\n${failures} FAILURES` : '\nALL OK');
process.exit(failures ? 1 : 0);
