// Bulk story prompt for bundles (OTO2, spec 12.2): stories for several new games at once.
// Games go to the AI in small lots (2-3 per prompt) as labelled text blocks instead of JSON,
// because long JSON replies break easily. The reader tolerates small slips, checks each game
// on its own and against the others, keeps the good ones, and writes the fix or "continue" prompt.
'use strict';
(function (root) {
  const Story = root.Story, Themes = root.Themes;
  const L = Story.LIMITS;
  const LOT = 3;
  const CHAPTERS = 2;
  const STORY_QS = 12;
  const AUDIENCE = {
    easy: ['children aged 11-13', 'Simple, lively sentences a 12-year-old reads easily. Fun and gentle: no violence, nothing truly frightening.'],
    medium: ['teenagers aged 14-17', 'Lively and a little witty, with light suspense. No graphic violence, no romance beyond friendship.'],
    hard: ['adults', 'Atmospheric and clever, with real suspense. Tasteful: no gore, no graphic violence.']
  };

  // ---------------------------------------------------------------- prompt
  function gameBrief(g) {
    const t = Themes.theme(g.themeId), p = Themes.plot(g.plotId), a = AUDIENCE[g.difficulty] || AUDIENCE.medium;
    return [
      `GAME ${g.n}`,
      `- Theme: ${t ? t.label : 'an original theme'}. Setting ideas: ${t ? t.setting : 'your choice'}`,
      p ? `- Story type: ${p.label}. ${p.brief}${g.difficulty === 'easy' && p.kids ? ' ' + p.kids : ''}` : '',
      `- Audience: ${a[0]}. ${a[1]}`,
      `- Trivia questions (13-20) are about: ${t ? t.trivia : 'the theme'}.`,
      t && t.avoid ? `- Never use: ${t.avoid}.` : ''
    ].filter(Boolean).join('\n');
  }

  function format(n) {
    return [
      `=== GAME ${n} ===`,
      'TITLE: ...', 'TAGLINE: ...', 'PROLOGUE: ...', 'MISSION: ...',
      ...Array.from({ length: CHAPTERS }, (_, i) => [`CHAPTER ${i + 1} NAME: ...`, `CHAPTER ${i + 1} INTRO: ...`, `CHAPTER ${i + 1} RIDDLE: ...`, `CHAPTER ${i + 1} WORD: ...`]).flat(),
      'PUZZLE TITLES:', '1. ...', '2. ...', '(one numbered line per letter of the code)',
      'FINAL LOCK: ...', 'ENDING: ...', 'CERTIFICATE: ...', 'TEAM NAME: ...',
      'QUESTIONS:', '1. [story] ...?', 'A) ...', 'B) ...', 'C) ...', 'ANSWER: B',
      `(20 questions in this shape; 1-${STORY_QS} [story], ${STORY_QS + 1}-20 [trivia])`,
      'CODE CHECK: WORD = W-O-R-D (4) | WORD = W-O-R-D (4) | total 8',
      `=== END GAME ${n} ===`
    ].join('\n');
  }

  // lot: [{ n, themeId, plotId, difficulty }]; ctx: { bundleName, avoidCodes, avoidTitles }
  function buildPrompt(lot, ctx) {
    const nums = lot.map((g) => g.n);
    const avoid = [...ctx.avoidCodes, ...ctx.avoidTitles.map((t) => `"${t}"`)];
    return `You are writing the stories for ${lot.length} printable escape-room games in the bundle "${ctx.bundleName || 'Escape Game Collection'}". Write every game completely, one after another, in the exact text format at the end.

How each game works: players solve logic puzzles, and each solved puzzle reveals ONE capital letter. Read in order, the letters spell a SECRET CODE of ${CHAPTERS} words, one word per chapter. Saying the code at the end opens the final lock and wins the game.

== THE GAMES ==
${lot.map(gameBrief).join('\n\n')}

== THE SECRET CODE (each game) ==
- ${CHAPTERS} common English words, ${Story.AUTO_LETTERS[0]} to ${Story.AUTO_LETTERS[1]} letters in total, only A-Z, each word 4 to 7 letters. Words the audience knows and can spell: no names, abbreviations or made-up words.
- Each word is a natural key to that game's problem; the ending explains why.
- Every game in this bundle needs its own code and its own title.${avoid.length ? ` Do not reuse any of these: ${avoid.join(', ')}.` : ''}

== WHAT TO WRITE (each game) ==
- TITLE (max ${L.title.words} words), TAGLINE (max ${L.tagline.words} words).
- PROLOGUE (${L.prologue.min}-${L.prologue.words} words): the problem and why the code matters, with at least 6 concrete details (names, colors, numbers, objects, places, times) the questions can ask about.
- MISSION (${L.mission.min}-${L.mission.words} words): solve the puzzles, collect the ${CHAPTERS} words and say the code before something bad happens.
- For each chapter: NAME (max ${L.chapterName.words} words); INTRO (${L.chapterIntro.min}-${L.chapterIntro.words} words, at least 3 new details); RIDDLE (max ${L.riddle.words} words) whose answer is exactly that chapter's word and that never contains the word; WORD in capitals.
- PUZZLE TITLES: one per letter of the code, in code order, max ${L.puzzleTitle.words} words each, built from places and objects in that chapter's intro.
- FINAL LOCK (${L.finalLock.min}-${L.finalLock.words} words): the tense moment just before the code is spoken.
- ENDING (${L.ending.min}-${L.ending.words} words): read aloud by the Game Host; explains why the code was the answer and congratulates the players.
- CERTIFICATE (max ${L.certificate.words} words), TEAM NAME (max ${L.teamName.words} words).
- QUESTIONS: exactly 20, read by the Game Host when players want a hint. 1-${STORY_QS} [story]: answered in the prologue, mission or a chapter intro (never the final lock or ending), each about a different detail. ${STORY_QS + 1}-20 [trivia]: well-known facts about the game's trivia topic. Exactly 3 options (A, B, C), exactly one correct, wrong options plausible, options max ${L.option.words} words, questions max ${L.question.words} words. No "all of the above".

== STAY IN THE STORY, NO SPOILERS ==
- Only the mission may mention puzzles. Everything else stays in the story world: never mention puzzles, riddles, letters or how the game works.
- Never use a code word (or its plural) in the riddles, puzzle titles, final lock or questions. Avoid it in the title, tagline, prologue, mission and intros too. The ending may use it.
- Names, numbers, colors and times stay consistent inside each game.
- Each game is its own story with its own characters, places and problem. Keep one warm narrator voice across the bundle.

== ORIGINALITY AND LANGUAGE ==
100% original writing in English with American spelling. No copyrighted or trademarked characters, brands, places or names.

== FORMAT ==
Plain text only: no JSON, no markdown, no bold. One block per game, exactly like this (replace every "..."):

${format(nums[0])}

Then ${nums.slice(1).map((n) => `=== GAME ${n} ===`).join(', then ')}${nums.length > 1 ? ' in the same shape' : ''}. After the last block write === ALL DONE ===
If you run out of space, stop at the end of a complete game block; I will ask you to continue.`;
  }

  function continuePrompt(lot, done) {
    const left = lot.filter((g) => !done.includes(g.n));
    return `Please continue. Write ${left.map((g) => `GAME ${g.n}`).join(' and ')} now, complete, in exactly the same format (=== GAME ${left[0].n} === ... === END GAME ${left[0].n} ===). Do not repeat the games you already finished. After the last block write === ALL DONE ===`;
  }

  function fixPrompt(n, errors) {
    return `Please fix GAME ${n} and send its complete block again (=== GAME ${n} === ... === END GAME ${n} ===), in the same format. Change only what is needed:\n`
      + errors.map((e) => '- ' + e.ai.replace(/"chapters\[(\d)\]\.(\w+)"/g, (m, i, f) => `CHAPTER ${+i + 1} ${f.toUpperCase()}`).replace(/"puzzleTitles\[(\d+)\]"/g, (m, i) => `PUZZLE TITLE ${+i + 1}`).replace(/"questions\[(\d+)\]"/g, (m, i) => `QUESTION ${+i + 1}`)).join('\n');
  }

  // ---------------------------------------------------------------- reader
  // Splits a reply into game blocks: { n: { text, complete } }. A block without its END line
  // was cut off (the AI ran out of space) unless another game block follows it.
  function splitGames(reply) {
    const text = String(reply || '').replace(/\r/g, '').replace(/[*_#`]+/g, '');
    const heads = [...text.matchAll(/^\s*=+\s*GAME\s+(\d+)\s*=+\s*$/gim)];
    const out = {};
    heads.forEach((h, k) => {
      const n = +h[1];
      const start = h.index + h[0].length;
      const end = k + 1 < heads.length ? heads[k + 1].index : text.length;
      let body = text.slice(start, end);
      const endRe = new RegExp(`^\\s*=+\\s*END\\s+GAME\\s+${n}\\s*=+\\s*$`, 'im');
      const m = body.match(endRe);
      const complete = !!m || k + 1 < heads.length;
      if (m) body = body.slice(0, m.index);
      body = body.replace(/^\s*=+\s*ALL\s+DONE\s*=+\s*$/gim, '');
      out[n] = { text: `=== GAME ${n} ===\n${body.trim()}\n=== END GAME ${n} ===`, body: body.trim(), complete: !!m || complete };
    });
    return out;
  }

  const FIELDS = { TITLE: 'title', TAGLINE: 'tagline', PROLOGUE: 'prologue', MISSION: 'mission', 'FINAL LOCK': 'finalLock', ENDING: 'ending', CERTIFICATE: 'certificate', 'TEAM NAME': 'teamName', 'PUZZLE TITLES': '#titles', QUESTIONS: '#questions', 'CODE CHECK': '#check' };

  // Recognises a label at the start of a line: "TITLE:", "Chapter 1 - Word:", "Team name -", etc.
  function labelOf(line) {
    const m = line.match(/^\s*[-•>]*\s*([A-Za-z][A-Za-z ]*?(?:\s*\d+\s*[-–:]?\s*[A-Za-z]+)?)\s*[:–-]\s*(.*)$/);
    if (!m) return null;
    const key = m[1].toUpperCase().replace(/[-–]/g, ' ').replace(/\s+/g, ' ').trim();
    const ch = key.match(/^CHAPTER (\d) (NAME|INTRO|RIDDLE|WORD)$/);
    if (ch) return { field: `#ch${+ch[1] - 1}.${ch[2].toLowerCase()}`, value: m[2] };
    if (FIELDS[key]) return { field: FIELDS[key], value: m[2] };
    return null;
  }

  // Reads one game block into the story shape used by the app.
  function parseGame(body) {
    const raw = { chapters: [], puzzleTitles: [], questions: [] };
    let field = null, q = null;
    const add = (f, v) => {
      if (!v) return;
      const chm = f.match(/^#ch(\d)\.(\w+)$/);
      if (chm) { const c = raw.chapters[+chm[1]] = raw.chapters[+chm[1]] || {}; c[chm[2]] = c[chm[2]] ? `${c[chm[2]]} ${v}` : v; return; }
      raw[f] = raw[f] ? `${raw[f]} ${v}` : v;
    };
    for (const lineRaw of body.split('\n')) {
      const line = lineRaw.trim();
      if (!line || /^\(.*\)$/.test(line)) continue;
      if (field === '#titles' || field === '#questions') {
        const lab = labelOf(line);
        const isList = /^\(?[A-C]\s*[).:]/i.test(line) || /^\d+\s*[.)]/.test(line) || /^(ANSWER|CORRECT( ANSWER)?)\s*[:\-]/i.test(line);
        if (lab && !isList) { field = lab.field; add(field, lab.value.trim()); continue; }
      } else {
        const lab = labelOf(line);
        if (lab) { field = lab.field; if (field !== '#titles' && field !== '#questions') add(field, lab.value.trim()); continue; }
      }
      if (field === '#titles') {
        const m = line.match(/^\d+\s*[.)]\s*(.+)$/);
        if (m) raw.puzzleTitles.push(m[1].trim());
        continue;
      }
      if (field === '#questions') {
        let m;
        if ((m = line.match(/^\d+\s*[.)]\s*(?:\[(story|trivia)\])?\s*(.+)$/i))) { q = { q: m[2].trim(), options: [], answer: -1, kind: (m[1] || '').toLowerCase() || (raw.questions.length < STORY_QS ? 'story' : 'trivia') }; raw.questions.push(q); continue; }
        if (q && (m = line.match(/^\(?([A-C])\s*[).:]\s*(.+)$/i))) { q.options['ABC'.indexOf(m[1].toUpperCase())] = m[2].trim(); continue; }
        if (q && (m = line.match(/^(?:ANSWER|CORRECT(?: ANSWER)?)\s*[:\-]\s*\(?([A-C])\b/i))) { q.answer = m[1].toUpperCase().charCodeAt(0) - 65; continue; }
        if (q && !q.options.length) q.q += ' ' + line;
        continue;
      }
      if (field && field !== '#check') add(field, line);
    }
    raw.questions.forEach((x) => { x.options = Array.from({ length: Math.max(3, x.options.length) }, (_, i) => x.options[i] || '').filter((o, i) => i < 3 || o); });
    raw.chapters = raw.chapters.filter(Boolean);
    return Story.normalise(raw);
  }

  // Checks one game: the usual story checks plus the bundle's own rules.
  function check(story, others) {
    const { errors, warnings } = Story.validate(story, { chapterCount: CHAPTERS, hasGlyph: (ch) => !root.Glyphs || root.Glyphs.has(ch) });
    const code = story.chapters.map((c) => c.word).join(' ');
    const clash = others.find((o) => o.code === code);
    if (code && clash) errors.push({ msg: `The code ${code} is already used by "${clash.title}".`, ai: `The code ${code} is already used by another game in this bundle. Choose different code words.` });
    const sameTitle = others.find((o) => o.title.toLowerCase() === story.title.toLowerCase());
    if (story.title && sameTitle) errors.push({ msg: `The title "${story.title}" is already used in this bundle.`, ai: 'Another game in this bundle has the same title. Choose a different title.' });
    return { errors, warnings, code };
  }

  root.BulkBatch = { LOT, CHAPTERS, buildPrompt, continuePrompt, fixPrompt, splitGames, parseGame, check };
})(window);
