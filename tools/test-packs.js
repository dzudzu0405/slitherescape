// Theme Pack test: every ready-made game must pass the same checks as an AI reply.
'use strict';
const fs = require('fs');
const path = require('path');
const js = path.join(__dirname, '..', 'assets', 'js');
['themes.js', 'story.js', 'engine/glyphs.js'].forEach((f) => require(path.join(js, f)));
require(path.join(__dirname, '..', 'pro', 'library', 'packs.js'));
const { Story, Themes, ProPacks } = globalThis;
const library = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'pro', 'library', 'seed.json'), 'utf8'));

let failures = 0;
ProPacks.forEach((pack) => {
  const s = Story.normalise(pack.story);
  const { errors, warnings } = Story.validate(s, { code: s.chapters.map((c) => c.word).join(' '), hasGlyph: (ch) => globalThis.Glyphs.has(ch), images: library, partyKit: true });
  if (!Themes.theme(pack.themeId) || !Themes.plot(pack.plotId)) errors.push({ msg: `unknown theme or plot: ${pack.themeId}/${pack.plotId}` });
  console.log(`${s.title} [${pack.themeId}]: ${s.chapters.map((c) => c.word).join(' ')} - ${errors.length} errors, ${warnings.length} warnings`);
  errors.forEach((e) => console.log('  ERROR  ', e.msg));
  warnings.forEach((w) => console.log('  warning', w));
  failures += errors.length;
});
console.log(failures ? `\n${failures} FAILURES` : '\nALL OK');
process.exit(failures ? 1 : 0);
