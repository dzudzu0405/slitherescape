// Builds the Mosaic library from our own drawings: node tools/build-library.js
// pro/library/drawn/<theme>.txt -> pro/library/seed.json, which Admin > Image library imports.
// Each drawing is a line "NAME | LOOK,ALIKES" followed by rows of # and . (see tools/test-drawings.js).
'use strict';
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'pro', 'library');
const out = [];
fs.readdirSync(path.join(dir, 'drawn')).filter((f) => f.endsWith('.txt')).sort().forEach((f) => {
  const theme = f.replace('.txt', '');
  fs.readFileSync(path.join(dir, 'drawn', f), 'utf8').replace(/\r/g, '').trim().split(/\n\s*\n/).forEach((block) => {
    const [head, ...rows] = block.split('\n');
    const [name, similar] = head.split('|').map((s) => s.trim());
    if (out.some((m) => m.name === name)) throw new Error(`${name} is drawn twice`);
    out.push({ name, theme, similar: similar ? similar.split(',') : [], source: 'SlitherEscape original drawing', file: '', rows });
  });
});
fs.writeFileSync(path.join(dir, 'seed.json'), JSON.stringify(out, null, 1));
console.log(`${out.length} images`);
