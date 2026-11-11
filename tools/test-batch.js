// Tests the bundle's bulk story reader (bulk/batch.js) without an AI: the built-in template stories
// are written out in the labelled block format, with the slips AIs make, then read back.
// Run: node tools/test-batch.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

global.window = global;
for (const f of ['assets/js/themes.js', 'assets/js/story.js', 'assets/js/engine/glyphs.js', 'assets/js/templates.js', 'bulk/batch.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), { filename: f });
}
const B = window.BulkBatch;
let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.log('FAIL', msg); } };

// Writes a story as an AI would. `messy` adds bold labels, other separators and answer styles.
function block(n, s, messy) {
  const lab = (t) => (messy ? `**${t.charAt(0) + t.slice(1).toLowerCase()}**` : t);
  const lines = [`=== GAME ${n} ===`, `${lab('TITLE')}: ${s.title}`, `${lab('TAGLINE')}: ${s.tagline}`,
    // The prologue goes on its own lines, split mid-text, as many AIs write it.
    `${lab('PROLOGUE')}:`, s.prologue.slice(0, s.prologue.indexOf(' ', 200)), s.prologue.slice(s.prologue.indexOf(' ', 200) + 1),
    `${lab('MISSION')}: ${s.mission}`];
  s.chapters.forEach((c, i) => {
    const sep = messy ? ' - ' : ' ';
    lines.push(`CHAPTER ${i + 1}${sep}NAME: ${c.name}`, `CHAPTER ${i + 1}${sep}INTRO: ${c.intro}`, `CHAPTER ${i + 1}${sep}RIDDLE: ${c.riddle}`, `Chapter ${i + 1}${sep}Word: ${messy ? c.word.toLowerCase() : c.word}`);
  });
  lines.push('PUZZLE TITLES:', ...s.puzzleTitles.map((t, i) => `${i + 1}. ${t}`));
  lines.push(`FINAL LOCK: ${s.finalLock}`, `ENDING: ${s.ending}`, `CERTIFICATE: ${s.certificate}`, `TEAM NAME: ${s.teamName}`, 'QUESTIONS:');
  s.questions.forEach((q, i) => {
    lines.push(`${i + 1}. [${q.kind}] ${q.q}`, ...q.options.map((o, k) => `${messy ? `(${'ABC'[k]})` : 'ABC'[k] + ')'} ${o}`),
      messy ? `Correct answer: ${'ABC'[q.answer]}` : `ANSWER: ${'ABC'[q.answer]}`, '');
  });
  lines.push(`CODE CHECK: ${s.chapters.map((c) => `${c.word} = ${c.word.split('').join('-')} (${c.word.length})`).join(' | ')}`);
  return lines.join('\n');
}

const letterTemplates = window.STORY_TEMPLATES.filter((t) => t.story.chapters.length === 2 && t.story.chapters.every((c) => c.type !== 'mosaic'));
ok(letterTemplates.length >= 1, 'need at least one two-chapter letter template');
const src = letterTemplates[0].story;

// 1) Clean reply with two games, the second written messily; then a cut-off third game.
const s2 = JSON.parse(JSON.stringify(src));
s2.title = 'The Frozen Clocktower'; s2.chapters[0].word = 'FROST'; s2.chapters[1].word = 'LANTERN';
s2.puzzleTitles = Array.from({ length: 12 }, (_, i) => `Clock room ${i + 1}`);
const reply = `Sure! Here are your games.\n\n${block(4, src)}\n=== END GAME 4 ===\n\n${block(5, s2, true)}\n=== END GAME 5 ===\n\n${block(6, src).slice(0, 900)}`;
const games = B.splitGames(reply);
ok(Object.keys(games).join() === '4,5,6', 'finds games 4, 5 and 6');
ok(games[4].complete && games[5].complete, 'games 4 and 5 are complete');
ok(!games[6].complete, 'game 6 is cut off');

const g4 = B.parseGame(games[4].body);
ok(JSON.stringify(g4.chapters.map((c) => c.word)) === JSON.stringify(src.chapters.map((c) => c.word)), 'game 4 code read back');
ok(g4.prologue === src.prologue.replace(/\s+/g, ' ').trim(), 'multi-line prologue joined');
ok(g4.questions.length === 20 && g4.questions.every((q, i) => q.answer === src.questions[i].answer && q.options.join() === src.questions[i].options.join()), 'game 4 questions, options and answers');
const c4 = B.check(g4, []);
ok(c4.errors.length === 0, 'game 4 passes the story checks: ' + c4.errors.map((e) => e.msg).join(' / '));

const g5 = B.parseGame(games[5].body);
ok(g5.title === 'The Frozen Clocktower' && g5.chapters.map((c) => c.word).join(' ') === 'FROST LANTERN', 'messy labels and lowercase words read');
ok(g5.questions.length === 20 && g5.questions.every((q, i) => q.answer === src.questions[i].answer), 'messy answers (Correct answer, (A)) read');

// 2) Cross-checks: same code and same title as an earlier game are errors.
const dup = B.check(g4, [{ code: src.chapters.map((c) => c.word).join(' '), title: 'Other' }, { code: 'X Y', title: src.title }]);
ok(dup.errors.some((e) => /already used by/.test(e.msg)), 'duplicate code is an error');
ok(dup.errors.some((e) => /title .* already used/.test(e.msg)), 'duplicate title is an error');

// 3) Broken game: missing questions and a code word in the final lock give fix lines for the AI.
const bad = JSON.parse(JSON.stringify(src));
bad.questions = bad.questions.slice(0, 15);
bad.finalLock = bad.finalLock + ' ' + src.chapters[0].word.toLowerCase() + '!';
const gb = B.parseGame(B.splitGames(block(7, bad) + '\n=== END GAME 7 ===')[7].body);
const cb = B.check(gb, []);
ok(cb.errors.length >= 2, 'broken game has errors');
const fix = B.fixPrompt(7, cb.errors);
ok(/=== GAME 7 ===/.test(fix) && /20 questions/.test(fix), 'fix prompt names the game and the problem');

// 4) Prompts.
const lot = [{ n: 1, themeId: 'christmas', plotId: 'lockdown', difficulty: 'medium' }, { n: 2, themeId: 'halloween', plotId: 'haunted', difficulty: 'easy' }];
const prompt = B.buildPrompt(lot, { bundleName: 'Holiday Set', avoidCodes: ['MAGIC SLEIGH'], avoidTitles: ['The Christmas Eve Lockdown'] });
ok(/GAME 1/.test(prompt) && /GAME 2/.test(prompt) && /=== ALL DONE ===/.test(prompt), 'prompt lists the games and the end marker');
ok(/MAGIC SLEIGH/.test(prompt) && /The Christmas Eve Lockdown/.test(prompt), 'prompt tells the AI what not to reuse');
ok(!/json/i.test(prompt.replace(/no JSON/i, '')), 'prompt asks for plain text, not JSON');
ok(/GAME 2 now/.test(B.continuePrompt(lot, [1])), 'continue prompt asks for the missing game');

console.log(failures ? `${failures} FAILED` : 'ALL OK');
process.exit(failures ? 1 : 0);
