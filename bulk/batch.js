// Bulk story prompt for bundles (OTO2, spec 12.2): stories for several new games at once.
// Games go to the AI in small lots (2-3 per prompt) as labelled text blocks instead of JSON,
// because long JSON replies break easily. The reader tolerates small slips, checks each game
// on its own and against the others, keeps the good ones, and writes the fix or "continue" prompt.
'use strict';
(function (root) {
  const Story = root.Story, Themes = root.Themes;
  const L = Story.AIM;
  const LOT = 3;
  const CHAPTERS = 2;
  const STORY_QS = 12;
  const AUDIENCE = {
    easy: ['children aged 11-13', 'Simple, lively sentences a 12-year-old reads easily. Fun and gentle: no violence, nothing truly frightening.'],
    medium: ['teenagers aged 14-17', 'Lively and a little witty, with light suspense. No graphic violence, no romance beyond friendship.'],
    hard: ['adults', 'Atmospheric and clever, with real suspense. Tasteful: no gore, no graphic violence.']
  };

  // ---------------------------------------------------------------- game types
  // classic: two letter chapters. mixed (PRO): a letter chapter, then a picture chapter.
  // mosaic (PRO): one picture chapter whose name is the whole code.
  const TYPE_LABEL = { classic: 'Classic (letters only)', mixed: 'Letters + Mosaic picture', mosaic: 'Mosaic picture only' };
  const typesOf = (g) => (g.type === 'mosaic' ? ['mosaic'] : g.type === 'mixed' ? ['letter', 'mosaic'] : ['letter', 'letter']);
  const hasPicture = (g) => g.type === 'mixed' || g.type === 'mosaic';
  // The pictures a game may use, as library entries (name, similar, ...).
  const picturesOf = (g) => (root.ProLibrary || []).filter((m) => (g.pictures || []).includes(m.name));

  // ---------------------------------------------------------------- prompt
  function gameBrief(g) {
    const t = Themes.theme(g.themeId), p = Themes.plot(g.plotId), a = AUDIENCE[g.difficulty] || AUDIENCE.medium;
    const pics = picturesOf(g), names = pics.map((m) => m.name);
    const alike = [];
    pics.forEach((m) => (m.similar || []).forEach((o) => { if (names.includes(o) && m.name < o) alike.push(`${m.name}/${o}`); }));
    const kind = g.type === 'mosaic'
      ? '- Game type: ONE PICTURE. A single chapter, and it is a PICTURE chapter: the name of the picture is the whole secret code.'
      : g.type === 'mixed'
        ? '- Game type: LETTERS + PICTURE. Chapter 1 is a LETTER chapter; chapter 2 is a PICTURE chapter.'
        : '- Game type: CLASSIC. Two LETTER chapters.';
    return [
      `GAME ${g.n}`,
      kind,
      hasPicture(g) ? `- Pictures for the picture chapter (choose ONE, write its name exactly, do not invent others): ${names.join(', ')}.` : '',
      alike.length ? `- These pairs look too alike, never use both: ${alike.join(', ')}.` : '',
      `- Theme: ${t ? t.label : 'an original theme'}. Setting ideas: ${t ? t.setting : 'your choice'}`,
      p ? `- Story type: ${p.label}. ${p.brief}${g.difficulty === 'easy' && p.kids ? ' ' + p.kids : ''}` : '',
      `- Audience: ${a[0]}. ${a[1]}`,
      `- Trivia questions (13-20) are about: ${t ? t.trivia : 'the theme'}.`,
      t && t.avoid ? `- Never use: ${t.avoid}.` : ''
    ].filter(Boolean).join('\n');
  }

  function format(g) {
    const types = typesOf(g), n = g.n;
    const letters = types.filter((t) => t === 'letter').length;
    const check = letters === 2 ? 'CODE CHECK: WORD = W-O-R-D (4) | WORD = W-O-R-D (4) | total 8' : 'CODE CHECK: WORD = W-O-R-D (4) | total 4';
    return [
      `=== GAME ${n} ===`,
      'TITLE: ...', 'TAGLINE: ...', 'PROLOGUE: ...', 'MISSION: ...',
      ...types.map((t, i) => [`CHAPTER ${i + 1} NAME: ...`, `CHAPTER ${i + 1} INTRO: ...`, `CHAPTER ${i + 1} WORD: ${t === 'mosaic' ? '(the picture\'s name, from GAME ' + n + '\'s list)' : '...'}`]).flat(),
      ...(letters ? [check,
        'PUZZLE TITLES:', '1. [W] ...', '2. [O] ...',
        `(one line per letter of the ${letters === 2 ? 'code' : 'letter word'}, in order, with that letter in brackets: as many lines as the CODE CHECK total${types.includes('mosaic') ? '; the picture gets no titles' : ''})`] : []),
      'FINAL LOCK: ...', 'ENDING: ...', 'CERTIFICATE: ...', 'TEAM NAME: ...',
      'QUESTIONS:', '1. [story] ...?', 'A) ...', 'B) ...', 'C) ...', 'ANSWER: B',
      `(20 questions in this shape; 1-${STORY_QS} [story], ${STORY_QS + 1}-20 [trivia])`,
      `=== END GAME ${n} ===`
    ].join('\n');
  }

  // lot: [{ n, type, pictures, themeId, plotId, difficulty }]; ctx: { bundleName, avoidCodes, avoidTitles }
  function buildPrompt(lot, ctx) {
    const nums = lot.map((g) => g.n);
    const avoid = [...ctx.avoidCodes, ...ctx.avoidTitles.map((t) => `"${t}"`)];
    const has = (type) => lot.some((g) => (g.type || 'classic') === type);
    const anyPicture = lot.some(hasPicture);
    const sameShape = !anyPicture;
    const codeRules = [];
    if (has('classic')) codeRules.push(`${anyPicture ? 'CLASSIC games: ' : ''}2 common English words, ${Story.AUTO_LETTERS[0]} to ${Story.AUTO_LETTERS[1]} letters in total, only A-Z, each word 4 to 7 letters. Words the audience knows and can spell: no names, abbreviations or made-up words.`);
    if (has('mixed')) codeRules.push('LETTERS + PICTURE games: chapter 1\'s word is one common English word of 4 to 7 letters, only A-Z, that the audience can spell; chapter 2\'s word is the name of one picture from that game\'s list.');
    if (has('mosaic')) codeRules.push('ONE PICTURE games: the code is the name of one picture from that game\'s list, nothing else.');
    return `You are writing the stories for ${lot.length} printable escape-room games in the bundle "${ctx.bundleName || 'Escape Game Collection'}". Write every game completely, one after another, in the exact text format at the end.

How each game works: players solve logic puzzles to get a SECRET CODE, one word per chapter. In a LETTER chapter each solved puzzle reveals ONE capital letter, and read in order the letters spell the chapter's word.${anyPicture ? ' In a PICTURE chapter the solved puzzles are the pieces of one big picture: players assemble it, and the name of what it shows is the chapter\'s word.' : ''} Saying the code at the end opens the final lock and wins the game.

== THE GAMES ==
${lot.map(gameBrief).join('\n\n')}

== THE SECRET CODE (each game) ==
${codeRules.map((r) => '- ' + r).join('\n')}
- Each word is a natural key to that game's problem; the ending explains why.
- Every game in this bundle needs its own code${anyPicture ? ', its own picture' : ''} and its own title.${avoid.length ? ` Do not reuse any of these: ${avoid.join(', ')}.` : ''}

== WHAT TO WRITE (each game) ==
- Word counts are checked by a computer and a reply over any maximum is sent back. Count the words of every short field (title, tagline, names, puzzle titles, certificate, team name, questions, options) before you write it.
- TITLE (max ${L.title.words} words), TAGLINE (max ${L.tagline.words} words).
- PROLOGUE (${L.prologue.min}-${L.prologue.words} words): the problem and why the code matters, with at least 6 concrete details (names, colors, numbers, objects, places, times) the questions can ask about.
- MISSION (${L.mission.min}-${L.mission.words} words): solve the puzzles, ${anyPicture ? 'collect the words (or assemble the picture and name it)' : 'collect the 2 words'} and say the code before something bad happens.
- For each chapter: NAME (max ${L.chapterName.words} words); INTRO (${L.chapterIntro.min}-${L.chapterIntro.words} words, at least 3 new details); WORD in capitals.${anyPicture ? ' A picture chapter\'s intro leads up to the picture without naming it.' : ''}
- CODE CHECK, written straight after the chapter words: spell each ${anyPicture ? 'LETTER ' : ''}word letter by letter and add up the total.${has('mosaic') ? ' A ONE PICTURE game has no CODE CHECK.' : ''}
- PUZZLE TITLES: exactly one per letter of the ${anyPicture ? 'LETTER words' : 'code'}, in order, so exactly as many as the CODE CHECK total (a 9-letter code has 9 titles). Start each with its letter in brackets, like "1. [W] ...". Max ${L.puzzleTitle.words} words each, built from places and objects in that chapter's intro.${anyPicture ? ' Picture chapters get no titles; a ONE PICTURE game has no PUZZLE TITLES at all.' : ''}
- FINAL LOCK (${L.finalLock.min}-${L.finalLock.words} words): the tense moment just before the code is spoken.
- ENDING (${L.ending.min}-${L.ending.words} words): read aloud by the Game Host; explains why the code was the answer and congratulates the players.
- CERTIFICATE (max ${L.certificate.words} words), TEAM NAME (max ${L.teamName.words} words).
- QUESTIONS: exactly 20, read by the Game Host when players want a hint. 1-${STORY_QS} [story]: answered in the prologue, mission or a chapter intro (never the final lock or ending), each about a different detail. ${STORY_QS + 1}-20 [trivia]: well-known facts about the game's trivia topic. Exactly 3 options (A, B, C), exactly one correct, wrong options plausible, options max ${L.option.words} words, questions max ${L.question.words} words. No "all of the above".

== STAY IN THE STORY, NO SPOILERS ==
- Only the mission may mention puzzles. Everything else stays in the story world: never mention puzzles, letters or how the game works.
- Never use a code word (or its plural) in the puzzle titles, final lock or questions. Avoid it in the title, tagline, prologue, mission and intros too. The ending may use it.
- Names, numbers, colors and times stay consistent inside each game.
- Each game is its own story with its own characters, places and problem. Keep one warm narrator voice across the bundle.

== ORIGINALITY AND LANGUAGE ==
100% original writing in English with American spelling. No copyrighted or trademarked characters, brands, places or names.

== FORMAT ==
Plain text only: no JSON, no markdown, no bold. ${sameShape ? 'One block per game, exactly like this (replace every "..."):' : 'One block per game, each exactly in its own shape below (replace every "..."):'}

${sameShape ? format(lot[0]) : lot.map(format).join('\n\n')}

${sameShape && nums.length > 1 ? `Then ${nums.slice(1).map((n) => `=== GAME ${n} ===`).join(', then ')} in the same shape. ` : ''}After the last block write === ALL DONE ===
If you run out of space, stop at the end of a complete game block; I will ask you to continue.`;
  }

  function continuePrompt(lot, done) {
    const left = lot.filter((g) => !done.includes(g.n));
    return `Please continue. Write ${left.map((g) => `GAME ${g.n}`).join(' and ')} now, complete, in exactly the same format (=== GAME ${left[0].n} === ... === END GAME ${left[0].n} ===). Do not repeat the games you already finished. After the last block write === ALL DONE ===`;
  }

  function fixPrompt(n, errors) {
    return `Please fix GAME ${n} and send its complete block again (=== GAME ${n} === ... === END GAME ${n} ===), in the same format. Change only what is needed:\n`
      + errors.map((e) => '- ' + e.ai.replace(/"chapters\[(\d)\]\.(\w+)"/g, (m, i, f) => `CHAPTER ${+i + 1} ${f.toUpperCase()}`).replace(/"puzzleTitles\[(\d+)\]"/g, (m, i) => `PUZZLE TITLE ${+i + 1}`).replace(/Return exactly (\d+) puzzleTitles, one per letter of the code/, 'Write exactly $1 PUZZLE TITLES, one per letter of the code, each starting with its letter in brackets').replace(/"questions\[(\d+)\]"/g, (m, i) => `QUESTION ${+i + 1}`)).join('\n');
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
  function parseGame(body, game) {
    const raw = { chapters: [], puzzleTitles: [], questions: [], titleTags: [] };
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
        if (m) {
          const tag = m[1].match(/^[[(]\s*([A-Za-z])\s*[\])]\s*[-–:.]?\s*(.+)$/);
          raw.puzzleTitles.push(tag ? tag[2].trim() : m[1].trim());
          raw.titleTags.push(tag ? tag[1].toUpperCase() : '');
        }
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
    const story = Story.normalise(raw);
    const types = typesOf(game || {});
    story.chapters.forEach((c, i) => { c.type = types[i] === 'mosaic' ? 'mosaic' : 'letter'; });
    story.puzzleTitles = lineUp(story.puzzleTitles, raw.titleTags, story.chapters.filter((c) => !Story.isMosaic(c)).map((c) => c.word).join(''));
    return story;
  }

  // Too many puzzle titles for the code: keep one per letter. With letter tags, the titles whose
  // tags spell the code in order; without, the first ones. Too few is left for the fix request.
  function lineUp(titles, tags, code) {
    const n = code.length;
    if (!n || titles.length <= n) return titles;
    const keep = [];
    if (tags.every(Boolean)) {
      let j = 0;
      for (let i = 0; i < titles.length && j < n; i++) if (tags[i] === code[j]) { keep.push(titles[i]); j++; }
      if (keep.length === n) return keep;
    }
    return titles.slice(0, n);
  }

  // Checks one game: the usual story checks plus the bundle's own rules.
  function check(story, others, game) {
    const g = game || {};
    const { errors, warnings } = Story.validate(story, {
      chapterCount: typesOf(g).length,
      images: hasPicture(g) ? picturesOf(g) : undefined,
      hasGlyph: (ch) => !root.Glyphs || root.Glyphs.has(ch)
    });
    // A picture may appear in only one game of the bundle: the Answer Boards would give it away.
    story.chapters.filter(Story.isMosaic).forEach((c) => {
      const o = others.find((x) => (x.pictures || []).includes(c.word));
      if (o) errors.push({ msg: `The picture ${c.word} is already used by "${o.title}".`, ai: `The picture ${c.word} is already used by another game in this bundle. Choose a different picture from this game's list.` });
    });
    const code = story.chapters.map((c) => c.word).join(' ');
    const clash = others.find((o) => o.code === code);
    if (code && clash) errors.push({ msg: `The code ${code} is already used by "${clash.title}".`, ai: `The code ${code} is already used by another game in this bundle. Choose different code words.` });
    const sameTitle = others.find((o) => o.title.toLowerCase() === story.title.toLowerCase());
    if (story.title && sameTitle) errors.push({ msg: `The title "${story.title}" is already used in this bundle.`, ai: 'Another game in this bundle has the same title. Choose a different title.' });
    return { errors, warnings, code };
  }

  root.BulkBatch = { LOT, CHAPTERS, TYPE_LABEL, typesOf, hasPicture, buildPrompt, continuePrompt, fixPrompt, splitGames, parseGame, check };
})(window);
