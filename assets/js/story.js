// Story module: builds the AI prompt, parses the pasted reply and validates it (spec section 5).
(function (root) {
  'use strict';

  // Word limits per field so each part fits its printed page. `min` keeps pages from
  // looking empty; going under it is only a warning.
  const LIMITS = {
    title: { words: 8 },
    tagline: { words: 15 },
    prologue: { words: 150, min: 90 },
    mission: { words: 50, min: 20 },
    chapterName: { words: 6 },
    chapterIntro: { words: 110, min: 50 },
    riddle: { words: 35 },
    puzzleTitle: { words: 7 },
    finalLock: { words: 90, min: 35 },
    ending: { words: 150, min: 70 },
    certificate: { words: 25 },
    teamName: { words: 6 },
    question: { words: 28 },
    option: { words: 8 },
    partyLetter: { words: 150, min: 80 },
    roleName: { words: 4 },
    reward: { words: 12 }
  };
  const ROLES = ['leader', 'scribe', 'hintKeeper', 'timekeeper', 'codebreaker', 'assembler'];
  const STORY_QUESTIONS = 12;

  const QUESTION_COUNT = 20;

  function wordCount(s) {
    return String(s || '').trim().split(/\s+/).filter(Boolean).length;
  }

  // Split a total letter count into `chapters` word lengths, e.g. 11 / 2 -> [5, 6].
  function suggestWordLengths(total, chapters) {
    const base = Math.floor(total / chapters);
    const out = Array(chapters).fill(base);
    for (let i = 0; i < total - base * chapters; i++) out[chapters - 1 - i]++;
    return out;
  }

  // Letter range used when the seller leaves the puzzle count on Auto.
  const AUTO_LETTERS = [9, 12];
  // Seller-chosen code: 2-3 words (one per chapter), 8-20 letters (one puzzle per letter).
  const CODE_LETTERS = [8, 20];

  // Uppercases and keeps only A-Z and single spaces. Returns { text, words, letters }.
  function parseCode(raw) {
    const text = String(raw || '').toUpperCase().replace(/[^A-Z\s]/g, '').replace(/\s+/g, ' ').trim();
    const words = text ? text.split(' ') : [];
    return { text, words, letters: words.join('').length };
  }

  // Returns an error sentence for a seller-chosen code, or null when it is usable.
  function codeError(raw) {
    const c = parseCode(raw);
    if (!c.text) return null;
    if (/[^A-Za-z\s]/.test(String(raw).trim())) return 'Use letters A–Z only (no numbers or punctuation).';
    if (c.words.length < 2 || c.words.length > 3) return 'Use 2 or 3 words: each word becomes one chapter.';
    if (c.letters > CODE_LETTERS[1]) return `That is ${c.letters} letters; the maximum is ${CODE_LETTERS[1]}.`;
    if (c.letters < CODE_LETTERS[0]) return `That is ${c.letters} letters; use at least ${CODE_LETTERS[0]}.`;
    return null;
  }

  const isMosaic = (c) => !!c && c.type === 'mosaic';
  // Puzzle titles belong to letter chapters only: Mosaic pieces are numbered, not titled.
  const titleCount = (story) => story.chapters.reduce((n, c) => n + (isMosaic(c) ? 0 : c.word.length), 0);

  // puzzleCount / chapterCount may be null ("Auto"): the AI then picks a code of
  // AUTO_LETTERS length in 2 words, and the app takes the count from the code.
  // `code` (optional, already validated) fixes the exact words instead.
  // themeId / plotId come from Themes; themeId 'other' uses the seller's customTheme text.
  // PRO: chapterTypes ('letter' | 'mosaic' per chapter) with `images` (the pictures available),
  // and partyKit, which asks for the Party Props Kit texts.
  function buildPrompt({ themeId, customTheme, plotId, difficulty, puzzleCount, chapterCount, code, chapterTypes, images, partyKit }) {
    const T = root.Themes;
    const theme = T && T.theme(themeId);
    const plot = T && T.plot(plotId);
    const types = chapterTypes && chapterTypes.includes('mosaic') ? chapterTypes : null;
    const given = code && !types ? parseCode(code) : null;
    if (given) { puzzleCount = given.letters; chapterCount = given.words.length; }
    if (types) { chapterCount = types.length; puzzleCount = null; }
    const chapters = chapterCount || 2;
    const letters = puzzleCount || null; // null = the AI chooses within AUTO_LETTERS
    const L = LIMITS;
    const ordinal = ['first', 'second', 'third'];

    const audience = {
      easy: ['children aged 11-13', 'Simple, lively sentences a 12-year-old reads easily. Fun and gentle: no violence, nothing truly frightening.'],
      medium: ['teenagers aged 14-17', 'Lively and a little witty, with light suspense. No graphic violence, no romance beyond friendship.'],
      hard: ['adults', 'Atmospheric and clever, with real suspense. Tasteful: no gore, no graphic violence.']
    }[difficulty] || ['teenagers aged 14-17', 'Lively, with light suspense.'];

    // ---- brief
    const brief = [];
    if (theme) {
      brief.push(`Theme: ${theme.label}`);
      brief.push(`Setting ideas: ${theme.setting}`);
    } else {
      brief.push(`Theme: ${(customTheme || '').trim() || 'an original theme of your choice'}`);
    }
    if (plot) brief.push(`Story type: ${plot.label}. ${plot.brief}`);
    brief.push(`Audience: ${audience[0]}. ${audience[1]}`);
    if (difficulty === 'easy' && plot && plot.kids) brief.push(`For this age: ${plot.kids}`);
    brief.push('Language: English, with American spelling (color, harbor, favorite).');

    // ---- code rules
    let codeRules;
    if (types) {
      const names = (images || []).map((m) => m.name);
      const alike = [];
      (images || []).forEach((m) => (m.similar || []).forEach((o) => { if (names.includes(o) && m.name < o) alike.push(`${m.name}/${o}`); }));
      codeRules = [
        ...types.map((t, i) => (t === 'mosaic'
          ? `Chapter ${i + 1} is a PICTURE chapter: its word is the name of the picture the players assemble.`
          : `Chapter ${i + 1} is a LETTER chapter: its word is a common English word of 4 to 7 letters, using only A-Z, that ${audience[0]} can spell.`)),
        `Pictures you may choose from (use these names exactly, each at most once, and do not invent others): ${names.join(', ')}.`,
        alike.length ? `Never use two pictures that look alike: ${alike.join(', ')}.` : '',
        'Together the words are the secret code. They need not form a phrase, but each one must be a natural key to the story\'s problem, and the ending explains why.'
      ].filter(Boolean);
    } else if (given) {
      codeRules = [
        `The code is FIXED: "${given.text}". Do not change, respell, translate or reorder it.`,
        ...given.words.map((w, i) => `Chapter ${i + 1}'s word is ${w} (${w.length} letters).`),
        'Build the whole story so that this code is the natural answer to its problem.'
      ];
    } else {
      const total = letters ? `exactly ${letters} letters in total` : `${AUTO_LETTERS[0]} to ${AUTO_LETTERS[1]} letters in total`;
      codeRules = [
        `Choose ${chapters} common English words, ${total}, using only the letters A-Z.`,
        letters ? `Suggested split: ${suggestWordLengths(letters, chapters).join(' + ')} letters (any split works if the total is ${letters}).` : 'Each word has 4 to 7 letters.',
        `Pick words ${audience[0]} know and can spell. No names, no abbreviations, no made-up words.`,
        'Read together, the words form one meaningful phrase (for example adjective + noun, or a short command). Never a list of unrelated words.',
        'That phrase is the answer to the story\'s problem, in a way that fits the story type.'
      ];
      if (theme) codeRules.push(`For inspiration only (invent your own): ${theme.codeIdeas}.`);
    }

    // Which puzzle titles belong to which chapter, when the word lengths are known.
    let titleOrder = 'The titles follow the letters in order: the first titles are scenes from chapter 1, then chapter 2, and so on.';
    let titleCount = 'one item per letter of the code';
    const hasLetters = !types || types.includes('letter');
    if (types) {
      titleOrder = 'Picture chapters get no titles.';
      titleCount = hasLetters ? 'one item per letter of the LETTER chapters only' : 'an empty list, []';
    } else if (given) {
      let start = 1;
      titleOrder = 'The titles follow the letters in order: ' + given.words.map((w, i) => {
        const range = `titles ${start}-${start + w.length - 1}`;
        start += w.length;
        return `${range} are scenes from chapter ${i + 1}`;
      }).join(', ') + '.';
      titleCount = `exactly ${given.letters} items`;
    } else if (letters) {
      titleCount = `exactly ${letters} items`;
    }

    const avoid = theme ? ` In particular, do not use: ${theme.avoid}.` : '';
    const trivia = theme ? theme.trivia : 'the theme';
    const totalRule = given ? `exactly ${given.letters}` : letters ? `exactly ${letters}` : `between ${AUTO_LETTERS[0]} and ${AUTO_LETTERS[1]}`;

    // ---- JSON skeleton (valid JSON, so copying it never breaks the reply)
    const wordsForSkeleton = given ? given.words : Array.from({ length: chapters }, (_, i) => `WORD${i + 1}`);
    const skeleton = {
      title: '...',
      tagline: '...',
      prologue: '...',
      mission: '...',
      chapters: wordsForSkeleton.map((w, i) => (types && types[i] === 'mosaic'
        ? { name: '...', intro: '...', word: 'PICTURE NAME' }
        : { name: '...', intro: '...', riddle: '...', word: w })),
      puzzleTitles: hasLetters ? ['...', '...', '...'] : [],
      finalLock: '...',
      ending: '...',
      certificate: '...',
      teamName: '...',
      questions: [
        { q: '...?', options: ['...', '...', '...'], answer: 0, kind: 'story' },
        { q: '...?', options: ['...', '...', '...'], answer: 2, kind: 'trivia' }
      ],
      ...(partyKit ? { party: { letter: '...', roles: { leader: '...', scribe: '...', hintKeeper: '...', timekeeper: '...', codebreaker: '...', ...(types ? { assembler: '...' } : {}) }, reward: '...' } } : {}),
      codeCheck: given
        ? given.words.map((w) => `${w} = ${w.split('').join('-')} (${w.length})`).join(' | ') + ` | total ${given.letters}`
        : '...'
    };
    // One line per field (and per chapter/question) keeps the skeleton short and readable.
    const line = (v) => JSON.stringify(v).replace(/","/g, '", "').replace(/":/g, '": ');
    const skeletonText = '{\n' + Object.entries(skeleton).map(([k, v]) => {
      if (Array.isArray(v) && v.length && typeof v[0] === 'object') {
        return `  "${k}": [\n${v.map((x) => '    ' + line(x)).join(',\n')}\n  ]`;
      }
      return `  "${k}": ${line(v)}`;
    }).join(',\n') + '\n}';
    const checkExample = given ? '' : '\n"codeCheck" spells each code word letter by letter with its count, then the total. Format example only: "MOON = M-O-O-N (4) | LIGHT = L-I-G-H-T (5) | total 9".';

    const howItWorks = types
      ? `players solve logic puzzles to get a SECRET CODE of ${chapters} words, one word per chapter. In a LETTER chapter, each solved puzzle reveals one capital letter and the letters spell the word. In a PICTURE chapter, the solved puzzles are pieces of one big picture: the players assemble it, and the name of what it shows is the word. Saying the code at the end opens the final lock and wins the game.`
      : `players solve logic puzzles, and each solved puzzle reveals ONE capital letter. Read in order, the letters spell a SECRET CODE of ${chapters} words, one word per chapter. Saying the code at the end opens the final lock and wins the game.`;
    const partyItem = partyKit
      ? `\n12. party: texts for the printed party props.\n   - letter (${L.partyLetter.min}-${L.partyLetter.words} words): a letter from a character in the story that opens the game and ends by telling the players to pick up their Code Sheet.\n   - roles: a themed title (max ${L.roleName.words} words) for each player role. Keep the keys; only the titles change.\n   - reward (max ${L.reward.words} words): the name of a prize that fits the story, such as a VIP pass.`
      : '';
    return `You are writing the story for a printable escape-room game for ${audience[0]}.
How the game works: ${howItWorks}

== BRIEF ==
${brief.join('\n')}

== THE SECRET CODE ==
${codeRules.map((r) => '- ' + r).join('\n')}

== WHAT TO WRITE ==
1. title (max ${L.title.words} words): catchy and original.
2. tagline (max ${L.tagline.words} words): one intriguing line for the cover.
3. prologue (${L.prologue.min}-${L.prologue.words} words): sets up the problem and why the code matters. Plant at least 6 concrete details players can be asked about later: names, colors, numbers, objects, places, times.
4. mission (${L.mission.min}-${L.mission.words} words): tells the players to solve the puzzles, collect the ${chapters} words and say the code before something bad happens.
5. chapters: exactly ${chapters}, in the order of the code. For each:
   - name (max ${L.chapterName.words} words)
   - intro (${L.chapterIntro.min}-${L.chapterIntro.words} words): narration that leads into this chapter's puzzles and raises the stakes, with at least 3 new concrete details.
   - riddle (max ${L.riddle.words} words): printed on the players' Code Sheet; its answer is exactly this chapter's word. Fair and solvable for ${audience[0]}. It must not contain the word or any form of it.${types ? ' Letter chapters only: picture chapters have no riddle.' : ''}
   - word: this chapter's code word in CAPITALS.
6. puzzleTitles (${titleCount}): one short scene title per letter, max ${L.puzzleTitle.words} words each, built from places and objects in that chapter's intro. ${titleOrder}
7. finalLock (${L.finalLock.min}-${L.finalLock.words} words): the tense moment just before the players speak the code.
8. ending (${L.ending.min}-${L.ending.words} words): read aloud by the Game Host once the code is cracked; explains why the code was the answer, resolves the story and congratulates the players.
9. certificate (max ${L.certificate.words} words): one sentence of praise printed on the certificate of completion.
10. teamName (max ${L.teamName.words} words): a fun name for the players' team.
11. questions: exactly ${QUESTION_COUNT} multiple-choice questions. The Game Host reads one aloud whenever players want a hint.
   - Questions 1-${STORY_QUESTIONS}, kind "story": the answer is stated in the prologue, the mission or a chapter intro. Never ask about the final lock or the ending. Each question asks about a different detail.
   - Questions ${STORY_QUESTIONS + 1}-${QUESTION_COUNT}, kind "trivia": about ${trivia}. Well-known facts that ${audience[0]} can answer or reasonably guess; nothing disputed or likely to change.
   - Exactly 3 options each, exactly 1 correct. Wrong options are plausible, never jokes. Options max ${L.option.words} words, questions max ${L.question.words} words. No "all of the above" or "none of the above".
   - "answer" is the position of the correct option: 0, 1 or 2.${partyItem}

== STAY IN THE STORY ==
- Only the mission may mention puzzles. The prologue, chapter intros, final lock and ending stay inside the story world: never mention puzzles, riddles, letters, word lengths, how many puzzles there are, or how the game works.
- Details stay consistent: every name, number, color and time means the same thing everywhere, and any times mentioned add up. Puzzle titles and the ending must not contradict the intros.

== NO SPOILERS ==
- Never use a code word (or its plural) in the riddles, puzzle titles, final lock or questions: that would give the answer away.
- Never hint at what a code word means or how long it is in the story text.
- Avoid the code words in the title, tagline, prologue, mission and chapter intros too. Only if a code word is the theme's own name may it appear there naturally, never highlighted as a clue.
- The ending may use the code freely.

== ORIGINALITY ==
100% original writing. No copyrighted or trademarked characters, brands, places or names (for example Harry Potter, Disney, Marvel, Pokemon).${avoid}

== OUTPUT FORMAT ==
Reply with ONE JSON object and nothing else: no text before or after it, no markdown code fences.
Inside the text, write dialogue and quotations with single quotes ('like this'), never with double quotes, so the JSON stays valid.
Use exactly these keys (replace every "..." with your text; "puzzleTitles" needs ${titleCount} and "questions" needs ${QUESTION_COUNT}):
${skeletonText}${checkExample}

== CHECK BEFORE YOU ANSWER ==
- "codeCheck" spells every code word letter by letter${types ? '' : `, and the letter total is ${totalRule}`}.
- "puzzleTitles" has ${types ? titleCount : 'exactly one item per letter of the code'}.
- "questions" has exactly ${QUESTION_COUNT} items: ${STORY_QUESTIONS} story questions first, then ${QUESTION_COUNT - STORY_QUESTIONS} trivia questions, each with exactly 3 options.
- Every word count is inside its limits.
- No code word appears where it is not allowed, and the story text never mentions puzzles, letters or riddles (only the mission may mention puzzles).
- Puzzle titles repeat the intros' numbers, colors and names exactly.
- The JSON is valid: double quotes only around keys and values, no trailing commas.`;
  }

  // Escapes double quotes that an AI left unescaped inside string values (dialogue).
  // A quote inside a string is treated as closing only when what follows looks like JSON
  // structure: `,` then a key/value, `:` then a value, or `}` / `]` / end of text.
  function repairInnerQuotes(body) {
    let out = '', inStr = false;
    for (let i = 0; i < body.length; i++) {
      const ch = body[i];
      if (!inStr) {
        out += ch;
        if (ch === '"') inStr = true;
        continue;
      }
      if (ch === '\\') { out += ch + (body[i + 1] || ''); i++; continue; }
      if (ch === '"') {
        const rest = body.slice(i + 1);
        const closes = /^\s*($|[}\]])/.test(rest) || /^\s*,\s*["{[\]}0-9tfn-]/.test(rest) || /^\s*:\s*["{[0-9tfn-]/.test(rest);
        if (closes) { out += ch; inStr = false; } else out += '\\"';
        continue;
      }
      out += ch === '\n' ? '\\n' : ch;
    }
    return out;
  }

  // Pull the JSON object out of whatever the user pasted (fences, chatter before/after),
  // then repair the usual AI mistakes: smart quotes, trailing commas, unescaped quotes.
  function extractJson(text) {
    let t = String(text || '').trim();
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('No JSON block found in the pasted text.');
    const body = t.slice(start, end + 1).replace(/[“”]/g, '"');
    const noTrailing = (s) => s.replace(/,\s*([}\]])/g, '$1');
    const attempts = [body, noTrailing(body), noTrailing(repairInnerQuotes(body))];
    let firstError = null;
    for (const a of attempts) {
      try { return JSON.parse(a); } catch (e) { firstError = firstError || e; }
    }
    throw new Error('Invalid JSON: ' + firstError.message + '. The reply may be cut off: ask the AI to send the complete JSON again.');
  }

  // Normalise loose AI output into the story shape used by the app.
  function normalise(raw) {
    const s = raw || {};
    const str = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());
    return {
      title: str(s.title),
      tagline: str(s.tagline),
      prologue: str(s.prologue),
      mission: str(s.mission),
      chapters: (Array.isArray(s.chapters) ? s.chapters : []).map((c) => ({
        name: str(c && c.name),
        intro: str(c && c.intro),
        riddle: str(c && c.riddle),
        word: str(c && c.word).toUpperCase().replace(/\s+/g, ''),
        type: c && c.type === 'mosaic' ? 'mosaic' : 'letter'
      })),
      puzzleTitles: (Array.isArray(s.puzzleTitles) ? s.puzzleTitles : []).map(str),
      finalLock: str(s.finalLock),
      ending: str(s.ending),
      certificate: str(s.certificate),
      teamName: str(s.teamName),
      party: s.party && typeof s.party === 'object' ? {
        letter: str(s.party.letter),
        roles: ROLES.reduce((o, k) => { o[k] = str(s.party.roles && s.party.roles[k]); return o; }, {}),
        reward: str(s.party.reward)
      } : null,
      questions: (Array.isArray(s.questions) ? s.questions : []).map((q) => {
        let answer = q && q.answer;
        if (typeof answer === 'string') {
          const letter = answer.trim().toUpperCase();
          answer = /^[ABC]$/.test(letter) ? letter.charCodeAt(0) - 65 : parseInt(letter, 10);
        }
        return {
          q: str(q && (q.q || q.question)),
          options: (Array.isArray(q && q.options) ? q.options : []).map(str),
          answer: Number.isInteger(answer) ? answer : -1,
          kind: str(q && q.kind) || 'story'
        };
      })
    };
  }

  // Returns { errors: [..], warnings: [..] }. Each error has `msg` for the seller
  // and `ai`, a sentence used to build the fix request sent back to the AI.
  // `code` (optional): the seller's fixed code; the story must use it exactly.
  // PRO: `images` (allowed pictures) applies to chapters marked as Mosaic; partyKit requires the kit texts.
  function validate(story, { puzzleCount, chapterCount, hasGlyph, code, images, partyKit }) {
    const anyMosaic = story.chapters.some(isMosaic);
    const given = code && !anyMosaic ? parseCode(code) : null;
    if (anyMosaic) puzzleCount = null;
    if (given) { puzzleCount = given.letters; chapterCount = given.words.length; }
    const errors = [];
    const warnings = [];
    const err = (msg, ai) => errors.push({ msg, ai: ai || msg });
    const over = (field, text, limit, label, min) => {
      const n = wordCount(text);
      if (!text) err(`${label} is missing.`, `The field "${field}" is missing or empty.`);
      else if (n > limit) err(`${label} has ${n} words; the limit is ${limit}.`, `Shorten "${field}" to at most ${limit} words (currently ${n}).`);
      else if (min && n < min) warnings.push(`${label} has only ${n} words (${min}+ fills the page better).`);
    };

    over('title', story.title, LIMITS.title.words, 'Game title');
    over('tagline', story.tagline, LIMITS.tagline.words, 'Tagline');
    over('prologue', story.prologue, LIMITS.prologue.words, 'Prologue', LIMITS.prologue.min);
    over('mission', story.mission, LIMITS.mission.words, 'Mission', LIMITS.mission.min);
    over('finalLock', story.finalLock, LIMITS.finalLock.words, 'Final Lock text', LIMITS.finalLock.min);
    over('ending', story.ending, LIMITS.ending.words, 'Ending', LIMITS.ending.min);
    over('certificate', story.certificate, LIMITS.certificate.words, 'Certificate line');
    over('teamName', story.teamName, LIMITS.teamName.words, 'Team name');

    // Code rules.
    const words = story.chapters.map((c) => c.word);
    if (chapterCount ? story.chapters.length !== chapterCount : (story.chapters.length < 2 || story.chapters.length > 3)) {
      const need = chapterCount || '2';
      err(`There are ${story.chapters.length} chapters; ${chapterCount ? 'exactly ' + need : '2 or 3'} are needed.`, `Return exactly ${need} chapters (one code word each).`);
    }
    words.forEach((w, i) => {
      if (!/^[A-Z]+$/.test(w)) err(`Chapter ${i + 1} word "${w}" may only contain letters A–Z.`, `Chapter ${i + 1} word "${w}" must contain only letters A-Z.`);
    });
    const letterWords = story.chapters.filter((c) => !isMosaic(c)).map((c) => c.word);
    const total = letterWords.join('').length;
    if (anyMosaic) {
      const used = story.chapters.filter(isMosaic).map((c) => c.word);
      used.forEach((w) => {
        const m = images && images.find((x) => x.name === w);
        if (images && !m) err(`"${w}" is not a picture in the library.`, `"${w}" is not one of the available pictures. Choose only from: ${images.map((x) => x.name).join(', ')}.`);
        if (m && used.some((o) => (m.similar || []).includes(o))) err(`The pictures ${w} and ${used.find((o) => m.similar.includes(o))} look too alike for one game.`, `Do not use pictures that look alike: replace ${w}.`);
      });
      if (new Set(used).size !== used.length) err('The same picture is used twice.', 'Use each picture at most once.');
      letterWords.forEach((w) => { if (w.length < 3 || w.length > 10) err(`The letter word "${w}" has ${w.length} letters; use 4 to 7.`, `Letter chapter word "${w}" must have 4 to 7 letters.`); });
    } else if (given && words.join(' ') !== given.text) {
      err(`The AI changed your code: it wrote "${words.join(' ')}" instead of "${given.text}".`, `The chapter words must be exactly ${given.words.map((w) => `"${w}"`).join(', ')}, in this order. Keep the code unchanged.`);
    } else if (given) {
      // Seller's own code: already checked against CODE_LETTERS when it was entered.
    } else if (puzzleCount && total !== puzzleCount) {
      err(`The code has ${total} letters; it needs exactly ${puzzleCount} (one per puzzle).`, `The code words must total exactly ${puzzleCount} letters (currently ${total}).`);
    } else if (total < 8 || total > 15) {
      err(`The code has ${total} letters; it must have 8–15.`, `The code must have ${AUTO_LETTERS[0]} to ${AUTO_LETTERS[1]} letters in total (currently ${total}).`);
    }
    const titlesNeeded = puzzleCount || total;
    if (hasGlyph) {
      const missing = [...new Set(letterWords.join('').split(''))].filter((ch) => !hasGlyph(ch));
      if (missing.length) err(`No glyph available for: ${missing.join(', ')}.`, `Avoid the letters ${missing.join(', ')} in the code.`);
    }
    story.chapters.forEach((c, i) => {
      over(`chapters[${i}].name`, c.name, LIMITS.chapterName.words, `Chapter ${i + 1} name`);
      over(`chapters[${i}].intro`, c.intro, LIMITS.chapterIntro.words, `Chapter ${i + 1} intro`, LIMITS.chapterIntro.min);
      if (!isMosaic(c)) over(`chapters[${i}].riddle`, c.riddle, LIMITS.riddle.words, `Chapter ${i + 1} riddle`);
    });

    if (partyKit) {
      const p = story.party;
      if (!p) err('The Party Kit texts are missing.', 'Add the "party" object with "letter", "roles" and "reward".');
      else {
        over('party.letter', p.letter, LIMITS.partyLetter.words, 'Party letter', LIMITS.partyLetter.min);
        over('party.reward', p.reward, LIMITS.reward.words, 'Party reward');
        ROLES.filter((k) => k !== 'assembler' || anyMosaic).forEach((k) => over(`party.roles.${k}`, p.roles[k], LIMITS.roleName.words, `Role title "${k}"`));
      }
    }

    // No spoilers. A code word (or its plural) in a riddle, puzzle title, the Final Lock or a
    // question gives the answer away: error. In the opening text it is only a warning, since a
    // code like HAPPY HALLOWEEN naturally shares words with its theme. The ending may use it.
    const hardFields = [['finalLock', 'the Final Lock text', story.finalLock]];
    if (story.party) hardFields.push(['party.letter', 'the party letter', story.party.letter], ['party.reward', 'the party reward', story.party.reward]);
    const softFields = [['title', 'the title', story.title], ['tagline', 'the tagline', story.tagline],
      ['prologue', 'the prologue', story.prologue], ['mission', 'the mission', story.mission]];
    story.chapters.forEach((c, i) => {
      hardFields.push([`chapters[${i}].riddle`, `chapter ${i + 1} riddle`, c.riddle]);
      softFields.push([`chapters[${i}].name`, `chapter ${i + 1} name`, c.name], [`chapters[${i}].intro`, `chapter ${i + 1} intro`, c.intro]);
    });
    story.puzzleTitles.forEach((t, i) => hardFields.push([`puzzleTitles[${i}]`, `puzzle ${i + 1} title`, t]));
    story.questions.forEach((q, i) => hardFields.push([`questions[${i}]`, `question ${i + 1}`, [q.q].concat(q.options).join(' ')]));
    // Narration should stay in the story world; game talk belongs in the mission only.
    const narration = [['the prologue', story.prologue], ['the Final Lock text', story.finalLock]]
      .concat(story.chapters.map((c, i) => [`chapter ${i + 1} intro`, c.intro]));
    narration.forEach(([label, text]) => {
      if (/\b(puzzles?|riddles?|letters?)\b/i.test(text || '')) warnings.push(`${label} mentions the game itself (puzzles, riddles or letters). Consider rewording so the story stays immersive.`);
    });
    const list = (hits) => hits.slice(0, 3).map((h) => h[1]).join(', ') + (hits.length > 3 ? ` and ${hits.length - 3} more` : '');
    words.filter((w) => /^[A-Z]{2,}$/.test(w)).forEach((w) => {
      const re = new RegExp(`\\b${w}(S|ES)?\\b`, 'i');
      const hard = hardFields.filter(([, , text]) => re.test(text || ''));
      const soft = softFields.filter(([, , text]) => re.test(text || ''));
      if (hard.length) {
        err(`The code word "${w}" is given away in ${list(hard)}.`,
          `The code word "${w}" must not appear in ${hard.map((h) => `"${h[0]}"`).join(', ')}. Reword those parts without it.`);
      }
      if (soft.length) warnings.push(`The code word "${w}" also appears in ${list(soft)}. Fine if it is just the theme's name; otherwise reword it so the code stays secret.`);
    });

    // Puzzle titles.
    if (story.puzzleTitles.length !== titlesNeeded) {
      err(`There are ${story.puzzleTitles.length} puzzle titles; exactly ${titlesNeeded} are needed (one per letter).`, `Return exactly ${titlesNeeded} puzzleTitles, one per letter of the code (currently ${story.puzzleTitles.length}).`);
    }
    story.puzzleTitles.forEach((t, i) => {
      if (!t) err(`Puzzle ${i + 1} title is empty.`, `puzzleTitles[${i}] is empty.`);
      else if (wordCount(t) > LIMITS.puzzleTitle.words) err(`Puzzle ${i + 1} title is longer than ${LIMITS.puzzleTitle.words} words.`, `Shorten puzzleTitles[${i}] to at most ${LIMITS.puzzleTitle.words} words.`);
    });

    // Questions.
    if (story.questions.length !== QUESTION_COUNT) {
      err(`There are ${story.questions.length} questions; exactly ${QUESTION_COUNT} are needed.`, `Return exactly ${QUESTION_COUNT} questions (currently ${story.questions.length}).`);
    }
    story.questions.forEach((q, i) => {
      const n = i + 1;
      if (!q.q) err(`Question ${n} has no text.`);
      else if (wordCount(q.q) > LIMITS.question.words) err(`Question ${n} is longer than ${LIMITS.question.words} words.`, `Shorten question ${n} to at most ${LIMITS.question.words} words.`);
      if (q.options.length !== 3) err(`Question ${n} has ${q.options.length} options; exactly 3 are needed.`, `Question ${n} must have exactly 3 options.`);
      if (q.options.some((o) => !o)) err(`Question ${n} has an empty option.`);
      if (q.options.some((o) => wordCount(o) > LIMITS.option.words)) err(`Question ${n} has an option that is too long.`, `Shorten the options of question ${n} to at most ${LIMITS.option.words} words each.`);
      if (new Set(q.options.map((o) => o.toLowerCase())).size !== q.options.length) err(`Question ${n} has duplicate options.`);
      if (!(q.answer >= 0 && q.answer < q.options.length)) err(`Question ${n} has no valid correct answer.`, `Question ${n} needs "answer" = 0, 1 or 2.`);
    });
    const storyQs = story.questions.filter((q) => q.kind === 'story').length;
    if (story.questions.length === QUESTION_COUNT && storyQs < 8) {
      warnings.push(`Only ${storyQs} questions are about the story. About 12 is better, so players are rewarded for reading it.`);
    }

    return { errors, warnings };
  }

  function fixRequest(errors) {
    if (!errors.length) return '';
    return 'Please fix your previous JSON and return the complete corrected JSON only:\n'
      + errors.map((e) => '- ' + e.ai).join('\n');
  }

  root.Story = { ROLES, isMosaic, titleCount, LIMITS, AUTO_LETTERS, CODE_LETTERS, parseCode, codeError, QUESTION_COUNT, wordCount, suggestWordLengths, buildPrompt, extractJson, normalise, validate, fixRequest };
})(typeof self !== 'undefined' ? self : globalThis);
