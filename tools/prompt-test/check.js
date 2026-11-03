// Grades AI replies with the app's own parser, validator and puzzle engine.
// Usage: node tools/prompt-test/check.js [a b c d]
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..', 'assets', 'js');
['themes.js', 'story.js', 'engine/glyphs.js', 'engine/slither.js', 'engine/generator.js'].forEach((f) => require(path.join(root, f)));
const { Story, Generator } = globalThis;

const cases = JSON.parse(fs.readFileSync(path.join(__dirname, 'cases.json'), 'utf8'));
const SIZES = { easy: [7, 9], medium: [10, 12], hard: [12, 13] };
const words = (s) => Story.wordCount(s);
const keys = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(cases);

for (const k of keys) {
  const c = cases[k];
  console.log(`\n===== ${k}: ${c.themeId}${c.customTheme ? ' (' + c.customTheme + ')' : ''} / ${c.plotId} / ${c.difficulty}${c.code ? ' / code ' + c.code : ''}`);
  const file = path.join(__dirname, k + '.reply.txt');
  if (!fs.existsSync(file)) { console.log('no reply file'); continue; }
  const text = fs.readFileSync(file, 'utf8');

  // 1. Strict JSON, then the app's tolerant parser.
  let strict = true;
  try { JSON.parse(text.trim()); } catch (e) { strict = false; console.log('strict JSON: NO -', e.message.slice(0, 90)); }
  if (strict) console.log('strict JSON: yes');
  let raw;
  try { raw = Story.extractJson(text); } catch (e) { console.log('APP PARSER FAILED:', e.message); continue; }
  const s = Story.normalise(raw);

  // 2. App validator.
  const v = Story.validate(s, { puzzleCount: c.puzzleCount || null, chapterCount: c.chapterCount || null, code: c.code || null, hasGlyph: (ch) => globalThis.Glyphs.has(ch) });
  console.log(`validator: ${v.errors.length} errors, ${v.warnings.length} warnings`);
  v.errors.forEach((e) => console.log('  ERROR  ', e.msg));
  v.warnings.forEach((w) => console.log('  warning', w));

  // 3. Content overview.
  const code = s.chapters.map((x) => x.word).join(' ');
  console.log(`title: ${s.title}\ntagline: ${s.tagline}\ncode: ${code} (${code.replace(/ /g, '').length} letters) | codeCheck: ${raw.codeCheck}`);
  console.log(`words: prologue ${words(s.prologue)}, mission ${words(s.mission)}, intros ${s.chapters.map((x) => words(x.intro)).join('/')}, finalLock ${words(s.finalLock)}, ending ${words(s.ending)}`);
  s.chapters.forEach((x, i) => console.log(`riddle ${i + 1} (${x.word}): ${x.riddle}`));
  const kinds = s.questions.map((q) => q.kind[0]).join('');
  const pos = [0, 0, 0];
  s.questions.forEach((q) => { if (q.answer >= 0 && q.answer < 3) pos[q.answer]++; });
  console.log(`questions: ${s.questions.length}, kinds ${kinds}, answer positions A/B/C ${pos.join('/')}`);

  // 4. Are story answers actually stated in the text players read?
  const readable = [s.prologue, s.mission].concat(s.chapters.map((x) => x.intro)).join(' ').toLowerCase();
  const stop = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'and', 'by', 'for', 'with', 'from', 'her', 'his', 'their', 'its', 'it', 'was', 'were', 'is', 'that', 'they', 'she', 'he']);
  s.questions.filter((q) => q.kind === 'story').forEach((q) => {
    const correct = q.options[q.answer] || '';
    const terms = correct.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter((w) => w && !stop.has(w));
    const found = terms.filter((w) => readable.includes(w));
    if (found.length < Math.ceil(terms.length / 2)) console.log(`  UNSUPPORTED? "${q.q}" -> "${correct}"`);
  });

  // 5. Build every puzzle from the code.
  const [W, H] = SIZES[c.difficulty];
  let ok = 0, failed = 0;
  const t0 = Date.now();
  s.chapters.forEach((ch, ci) => ch.word.split('').forEach((letter, li) => {
    try {
      const p = Generator.generate({ letter, W, H, difficulty: c.difficulty, reverse: c.difficulty === 'hard' && ci === 0 && li === ch.word.length - 1, seed: `${k}-${ci}-${li}` });
      if (p.verify.ok) ok++; else failed++;
    } catch (e) { failed++; console.log('  puzzle failed:', letter, e.message); }
  }));
  console.log(`puzzles: ${ok} ok, ${failed} failed in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
