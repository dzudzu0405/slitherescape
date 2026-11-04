// Editor: start screen (audience, theme, AI story) -> result screen (preview, download).
// Puzzle generation and PDF export are previews here; the real engine (glyphs, solvers,
// verifier, renderer) plugs into buildGame() and exportPdf().
(function () {
  'use strict';
  const { $, $$, toast } = window.UI;
  const Story = window.Story;
  const DEFAULTS = window.ACCOUNT_DEFAULTS || { paper: 'letter', inkSaver: false, shop: '' };

  const PRESETS = {
    easy: { label: 'Easy', audience: 'Kids 11–13', w: 7, h: 9, minutes: [4, 6], reverse: false },
    medium: { label: 'Medium', audience: 'Teens 14–17', w: 10, h: 12, minutes: [5, 8], reverse: false },
    hard: { label: 'Hard', audience: 'Adults', w: 12, h: 13, minutes: [8, 12], reverse: true }
  };

  const MOTIFS = {
    snowflake: { label: 'Snowflake', words: /snow|christmas|xmas|winter|santa|frost|ice|elf|north pole/, svg: '<path d="M16 3v26M4.7 9.5l22.6 13M4.7 22.5l22.6-13M12 5l4 3 4-3M12 27l4-3 4 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' },
    moon: { label: 'Moon', words: /hallowe|ghost|haunt|vampire|witch|zombie|night|spook|monster|curse/, svg: '<path d="M21 4a12 12 0 1 0 7 19A10 10 0 0 1 21 4z" fill="none" stroke="currentColor" stroke-width="1.6"/>' },
    star: { label: 'Star', words: /space|star|galax|planet|astronaut|alien|rocket|wizard|magic/, svg: '<path d="M16 3l3.6 8.4 9 .8-6.8 6 2 8.8L16 22.4 8.2 27l2-8.8-6.8-6 9-.8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' },
    heart: { label: 'Heart', words: /valentin|love|heart|wedding|friend/, svg: '<path d="M16 27S4 19.5 4 11.5A6 6 0 0 1 16 9a6 6 0 0 1 12 2.5C28 19.5 16 27 16 27z" fill="none" stroke="currentColor" stroke-width="1.6"/>' },
    compass: { label: 'Compass', words: /pirate|treasure|map|explor|egypt|pharaoh|jungle|adventure|island|ship|temple|time travel/, svg: '<circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M16 6l3 10-3 10-3-10z" fill="currentColor" opacity=".8"/><path d="M6 16l10-3 10 3-10 3z" fill="none" stroke="currentColor" stroke-width="1.2"/>' },
    leaf: { label: 'Leaf', words: /forest|garden|nature|spring|easter|autumn|fall|farm|science|plant/, svg: '<path d="M6 26C6 12 14 5 27 5c0 13-7 21-21 21zM6 26L18 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' },
    key: { label: 'Key', words: /./, svg: '<circle cx="10" cy="16" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M15.5 16H28M24 16v4M28 16v5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' }
  };

  const Themes = window.Themes;

  const PRO = window.PRO || { enabled: false, upgradeUrl: '' };
  const library = () => window.ProLibrary || [];

  const state = {
    themeId: null,
    plotId: null,
    settings: { difficulty: 'medium', count: null, chapters: null, w: null, h: null, reverse: 1, paper: '', ink: '', motif: 'auto', seed: newSeed(),
      mode: 'letter', modeChapters: 2, chapterTypes: ['letter', 'mosaic'], kit: false, kitPlayers: 4, kitPlay: 'together', kitTeams: 2 },
    story: null,
    puzzles: [],
    mosaics: {},
    titleTouched: false
  };

  // ---------------------------------------------------------------- helpers
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const codeSpaced = () => (state.story ? state.story.chapters.map((c) => c.word).join(' ') : '');
  const puzzleCount = () => gameSlots().length;

  // Chapter types chosen on the start screen, or null for a classic letters game.
  function chapterTypes() {
    const st = state.settings;
    if (st.mode === 'mosaic') return Array(st.modeChapters).fill('mosaic');
    if (st.mode === 'mixed') return st.chapterTypes.slice(0, st.modeChapters);
    return null;
  }

  // Themes without their own pictures, or that suit a neighbour's too, borrow from these.
  const RELATED_IMAGES = {
    pirates: ['ocean'], ocean: ['pirates'], castle: ['wizard'], wizard: ['castle'], jungle: ['dinosaurs', 'easter'],
    dinosaurs: ['jungle'], museum: ['egypt', 'dinosaurs'], lab: ['space'], space: ['lab'], newyear: ['christmas', 'space'],
    thanksgiving: ['easter', 'christmas'], school: ['space', 'wizard'], detective: ['pirates', 'halloween']
  };

  // Pictures offered to the AI: the chosen theme's and its neighbours', or all when too few.
  function imagesForPrompt() {
    const themes = [state.themeId].concat(RELATED_IMAGES[state.themeId] || []);
    const own = library().filter((m) => themes.includes(m.theme));
    return own.length >= 3 ? own : library();
  }

  function newSeed() {
    const hex = () => Math.floor(Math.random() * 0x10000).toString(16).toUpperCase().padStart(4, '0');
    return `${hex()}-${hex()}`;
  }

  // Settings after applying presets and account defaults.
  function effective() {
    const st = state.settings;
    const p = PRESETS[st.difficulty];
    let motif = st.motif;
    if (motif === 'auto') {
      const theme = Themes.theme(state.themeId);
      if (theme) {
        motif = theme.motif;
      } else {
        // Custom theme: guess from its words.
        const text = ($('#theme-input').value + ' ' + (state.story ? state.story.title : '')).toLowerCase();
        motif = Object.keys(MOTIFS).find((k) => MOTIFS[k].words.test(text));
      }
    }
    return {
      w: st.w || p.w,
      h: st.h || p.h,
      reverse: p.reverse ? st.reverse : 0,
      paper: st.paper || DEFAULTS.paper,
      inkSaver: st.ink ? st.ink === 'white' : !!DEFAULTS.inkSaver,
      motif
    };
  }

  // ---------------------------------------------------------------- saving
  // Autosave: every change marks the project dirty and saves after a short pause.
  // A new game is only stored once it has a story, so empty drafts don't pile up.
  const project = { id: (window.PROJECT && window.PROJECT.id) || 0 };
  let dirty = false, saving = false, saveTimer = null;

  function setSaveState(text, isDirty) {
    const el = $('#save-state');
    el.classList.toggle('dirty', !!isDirty);
    el.lastElementChild.textContent = text;
  }

  function serialize() {
    return {
      version: 1,
      themeId: state.themeId,
      plotId: state.plotId,
      customTheme: $('#theme-input').value,
      code: $('#code-input').value,
      settings: state.settings,
      mosaics: state.mosaics,
      titleTouched: state.titleTouched,
      story: state.story,
      puzzles: state.puzzles
    };
  }

  async function save() {
    clearTimeout(saveTimer);
    if (saving) { saveTimer = setTimeout(save, 800); return; }
    if (!project.id && !state.story) { setSaveState('Not saved yet', false); dirty = false; return; }
    saving = true;
    dirty = false;
    setSaveState('Saving…', true);
    try {
      const res = await window.UI.api('save', { id: project.id, title: $('#project-title').value, data: serialize() });
      if (!project.id) {
        project.id = res.id;
        history.replaceState(null, '', 'editor.php?id=' + res.id);
      }
      setSaveState(dirty ? 'Unsaved' : 'Saved', dirty);
    } catch (err) {
      dirty = true;
      if (err.status === 401) {
        setSaveState('Logged out', true);
        toast('Your session ended. Log in again in another tab, then keep working here.');
        saveTimer = setTimeout(save, 15000);
      } else {
        setSaveState('Save failed', true);
        toast('Could not save: ' + err.message);
        saveTimer = setTimeout(save, 10000);
      }
    } finally {
      saving = false;
    }
  }

  function markDirty() {
    dirty = true;
    setSaveState(project.id || state.story ? 'Unsaved' : 'Not saved yet', true);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 1200);
  }

  window.addEventListener('beforeunload', (e) => {
    if (dirty && (project.id || state.story)) { save(); e.preventDefault(); e.returnValue = ''; }
  });

  // One slot per puzzle, in game order: a letter of a letter chapter or a piece of a Mosaic chapter.
  function gameSlots() {
    if (!state.story) return [];
    const out = [];
    let title = 0;
    state.story.chapters.forEach((c, ci) => {
      if (Story.isMosaic(c)) {
        const plan = state.mosaics[ci];
        (plan ? plan.pieces : []).forEach((p) => out.push({ kind: 'piece', chapter: ci, slot: p.slot, label: p.label, showLabel: p.showLabel, mask: p.mask }));
        return;
      }
      c.word.split('').forEach((ch, li) => out.push({ kind: 'letter', letter: ch, chapter: ci, pos: li, len: c.word.length, titleIndex: title++ }));
    });
    return out;
  }
  const slotName = (slot) => (slot.kind === 'piece' ? `piece ${slot.label}` : `letter ${slot.letter}`);

  function showScreen(name) {
    $('#screen-start').classList.toggle('hidden', name !== 'start');
    $('#screen-result').classList.toggle('hidden', name !== 'result');
    $('.workspace').scrollTop = 0;
  }

  // ---------------------------------------------------------------- start screen
  $('#aud-grid').addEventListener('click', (e) => {
    const b = e.target.closest('.diff');
    if (!b) return;
    state.settings.difficulty = b.dataset.diff;
    $$('#aud-grid .diff').forEach((x) => x.classList.toggle('on', x === b));
    $('#adv-reverse-field').classList.toggle('hidden', !PRESETS[b.dataset.diff].reverse);
    renderPrompt(); markDirty();
  });

  // ---------------------------------------------------------------- game type (PRO)
  function offerUpgrade(what) {
    const box = $('#pro-note');
    box.classList.remove('hidden');
    box.innerHTML = `<b>${esc(what)}</b> is part of SlitherEscape PRO.${PRO.upgradeUrl ? ` <a href="${esc(PRO.upgradeUrl)}" target="_blank" rel="noopener">Upgrade to PRO</a>` : ' Contact support to upgrade.'}`;
  }

  function renderMode() {
    const st = state.settings;
    $$('#mode-grid .diff').forEach((b) => {
      b.classList.toggle('on', b.dataset.mode === st.mode);
      b.classList.toggle('locked', !PRO.enabled && b.dataset.mode !== 'letter');
    });
    const types = chapterTypes();
    $('#mode-options').classList.toggle('hidden', !types);
    $('#mode-chapters').value = String(st.modeChapters);
    $('#mode-chapter-types').innerHTML = st.mode !== 'mixed' ? '' : Array.from({ length: st.modeChapters }, (_, i) =>
      `<label class="field"><span>Chapter ${i + 1}</span><select data-chapter-type="${i}">
        <option value="letter" ${st.chapterTypes[i] !== 'mosaic' ? 'selected' : ''}>Letters</option>
        <option value="mosaic" ${st.chapterTypes[i] === 'mosaic' ? 'selected' : ''}>Mosaic picture</option>
      </select></label>`).join('');
    // Mosaic words are picture names, so the seller's code and the puzzle count don't apply.
    $('#code-section').classList.toggle('hidden', !!types);
    renderCode();
    $('#kit-on').checked = !!st.kit;
    $('#kit-options').classList.toggle('hidden', !st.kit);
    $('#kit-players').value = String(st.kitPlayers);
    $('#kit-play').value = st.kitPlay;
    $('#kit-teams').value = String(st.kitTeams);
    $('#kit-teams-field').classList.toggle('hidden', st.kitPlay !== 'teams');
    if (PRO.enabled) {
      const note = $('#pro-note');
      const empty = types && !library().length;
      note.classList.toggle('hidden', !empty);
      if (empty) note.textContent = 'No pictures have been approved yet. Approve some in Admin > Image library first.';
    }
  }

  $('#mode-grid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-mode]');
    if (!b) return;
    if (!PRO.enabled && b.dataset.mode !== 'letter') { offerUpgrade(b.dataset.mode === 'mosaic' ? 'Mosaic' : 'Mixed mode'); return; }
    state.settings.mode = b.dataset.mode;
    renderMode(); renderPrompt(); markDirty();
  });
  $('#mode-chapters').addEventListener('change', (e) => { state.settings.modeChapters = +e.target.value; renderMode(); renderPrompt(); markDirty(); });
  $('#mode-chapter-types').addEventListener('change', (e) => {
    const i = e.target.dataset.chapterType;
    if (i === undefined) return;
    state.settings.chapterTypes[+i] = e.target.value;
    renderPrompt(); markDirty();
  });
  $('#kit-on').addEventListener('change', (e) => {
    if (!PRO.enabled) { e.target.checked = false; offerUpgrade('The Party Props Kit'); return; }
    state.settings.kit = e.target.checked;
    renderMode(); renderPrompt(); markDirty();
    if (state.story) renderResult();
  });
  const kitBind = (id, key, num) => $('#' + id).addEventListener('change', (e) => { state.settings[key] = num ? +e.target.value : e.target.value; renderMode(); markDirty(); });
  kitBind('kit-players', 'kitPlayers', true);
  kitBind('kit-play', 'kitPlay', false);
  kitBind('kit-teams', 'kitTeams', true);

  function renderThemes() {
    const groups = [];
    Themes.THEMES.forEach((t) => {
      let g = groups.find((x) => x.name === t.group);
      if (!g) groups.push(g = { name: t.group, items: [] });
      g.items.push(t);
    });
    groups.push({ name: 'Other', items: [Themes.OTHER_THEME] });
    const tile = (t) => `<button type="button" class="theme-tile ${state.themeId === t.id ? 'on' : ''}" data-theme="${t.id}">${t.icon}<span>${esc(t.label)}</span></button>`;
    $('#theme-grid').innerHTML = groups.map((g) =>
      `<div class="theme-group"><div class="theme-group-name">${esc(g.name)}</div><div class="theme-tiles">${g.items.map(tile).join('')}</div></div>`
    ).join('');
    $('#other-theme').classList.toggle('hidden', state.themeId !== 'other');
  }
  $('#theme-grid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-theme]');
    if (!b) return;
    state.themeId = b.dataset.theme;
    renderThemes(); renderPrompt(); renderMotifs(); markDirty();
    if (state.themeId === 'other') $('#theme-input').focus();
  });
  $('#theme-input').addEventListener('input', () => { renderPrompt(); renderMotifs(); markDirty(); });

  function renderPlots() {
    $('#plot-grid').innerHTML = Themes.PLOTS.map((p) =>
      `<button type="button" class="plot-tile ${state.plotId === p.id ? 'on' : ''}" data-plot="${p.id}"><b>${esc(p.label)}</b><small>${esc(p.hint)}</small></button>`
    ).join('');
  }
  $('#plot-grid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-plot]');
    if (!b) return;
    state.plotId = b.dataset.plot;
    renderPlots(); renderPrompt(); markDirty();
  });

  // ---- optional seller code
  // The seller's code if it is filled in and valid, otherwise null.
  function sellerCode() {
    const raw = $('#code-input').value;
    return raw.trim() && !Story.codeError(raw) ? Story.parseCode(raw).text : null;
  }

  function renderCode() {
    const raw = $('#code-input').value;
    const c = Story.parseCode(raw);
    const max = Story.CODE_LETTERS[1];
    const count = $('#code-count');
    count.textContent = `${c.letters}/${max} letters`;
    count.classList.toggle('over', c.letters > max);
    const err = raw.trim() ? Story.codeError(raw) : null;
    const box = $('#code-preview');
    if (!raw.trim()) box.innerHTML = '';
    else if (err) box.innerHTML = `<span class="err">${esc(err)}</span>`;
    else {
      box.innerHTML = c.words.map((w) => `<div class="word-boxes">${w.split('').map((ch) => `<span>${ch}</span>`).join('')}</div>`).join('')
        + `<span class="ok">${c.words.length} chapters · ${c.letters} puzzles</span>`;
    }
    // A fixed code decides the puzzle and chapter counts.
    const fixed = !!sellerCode() || !!chapterTypes();
    ['#adv-count', '#adv-chapters'].forEach((id) => { $(id).disabled = fixed; });
    $('#adv-count').title = fixed ? (chapterTypes() ? 'Set by the game type' : 'Set by your secret code') : '';
  }

  $('#code-input').addEventListener('input', () => { renderCode(); renderPrompt(); markDirty(); });

  function renderPrompt() {
    const st = state.settings;
    $('#prompt-box').value = Story.buildPrompt({
      themeId: state.themeId, customTheme: $('#theme-input').value, plotId: state.plotId,
      difficulty: st.difficulty, puzzleCount: st.count, chapterCount: st.chapters, code: sellerCode(),
      chapterTypes: chapterTypes(), images: imagesForPrompt(), partyKit: !!st.kit
    });
  }

  $('#copy-prompt').addEventListener('click', async () => {
    const missing = !state.themeId ? ['#theme-grid', 'Pick a theme first']
      : state.themeId === 'other' && !$('#theme-input').value.trim() ? ['#theme-input', 'Describe your custom theme first']
      : !state.plotId ? ['#plot-grid', 'Pick a story type first']
      : !chapterTypes() && $('#code-input').value.trim() && Story.codeError($('#code-input').value) ? ['#code-input', 'Fix your secret code first, or leave it empty'] : null;
    if (missing) {
      $(missing[0]).scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (missing[0] === '#theme-input' || missing[0] === '#code-input') $(missing[0]).focus();
      toast(missing[1]);
      return;
    }
    renderPrompt();
    try {
      await navigator.clipboard.writeText($('#prompt-box').value);
    } catch (_) {
      $('.see-prompt').open = true;
      $('#prompt-box').select();
      document.execCommand('copy');
    }
    toast('Prompt copied. Paste it into ChatGPT or Claude.');
  });

  function showCheck(errors, warnings) {
    const box = $('#check-result');
    if (!errors.length) {
      box.innerHTML = warnings.length ? `<div class="alert info">${warnings.map(esc).join('<br>')}</div>` : '';
      return;
    }
    const req = Story.fixRequest(errors);
    box.innerHTML = `<div class="alert err"><b>The AI reply needs ${errors.length} fix${errors.length > 1 ? 'es' : ''}:</b><ul>${errors.map((e) => `<li>${esc(e.msg)}</li>`).join('')}</ul>
      <div class="inline" style="margin-top:10px"><button class="btn sm dark" id="copy-fix">Copy a fix request for the AI</button>
      <span class="small">Paste it into the same AI chat, then paste the new reply here.</span></div></div>`;
    $('#copy-fix').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(req); } catch (_) { /* ignore */ }
      toast('Fix request copied');
    });
  }

  function acceptStory(raw, opts = {}) {
    const story = Story.normalise(raw);
    const types = opts.fixedCount ? null : chapterTypes();
    // The AI writes only the words; which chapters are pictures comes from the chosen game type.
    if (!opts.fixedCount) story.chapters.forEach((c, i) => { c.type = types && types[i] === 'mosaic' ? 'mosaic' : 'letter'; });
    const { errors, warnings } = Story.validate(story, {
      puzzleCount: opts.fixedCount ? null : state.settings.count,
      chapterCount: opts.fixedCount ? null : types ? types.length : state.settings.chapters,
      code: opts.fixedCount ? null : sellerCode(),
      hasGlyph: () => true,
      images: library(),
      partyKit: !opts.fixedCount && !!state.settings.kit
    });
    showCheck(errors, warnings);
    if (errors.length) {
      $('#check-result').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    state.story = story;
    state.mosaics = {};
    if (!state.titleTouched) $('#project-title').value = story.title;
    markDirty();
    buildGame();
    return true;
  }

  $('#create-game').addEventListener('click', () => {
    const text = $('#paste-box').value.trim();
    if (!text) {
      $('#check-result').innerHTML = '<div class="alert info">Paste the AI reply first, or pick a ready-made story below.</div>';
      $('#paste-box').focus();
      return;
    }
    let raw;
    try {
      raw = Story.extractJson(text);
    } catch (e) {
      showCheck([{ msg: e.message, ai: 'Reply with valid JSON only, no markdown fences and no extra text.' }], []);
      return;
    }
    acceptStory(raw);
  });

  function templates() {
    return window.STORY_TEMPLATES.concat(window.ProPacks || []);
  }

  $('#demo-error').addEventListener('click', () => {
    const broken = JSON.parse(JSON.stringify(window.STORY_TEMPLATES[0].story));
    broken.chapters[1].word = 'SLEIGH2';
    broken.puzzleTitles.pop();
    broken.questions[3].options.push('Extra option');
    $('#paste-box').value = JSON.stringify(broken, null, 2);
    $('#create-game').click();
  });

  function renderTemplates() {
    const locked = PRO.enabled ? '' : `<div class="card template-card locked" data-pack-locked="1">
        <h3>Theme Packs <span class="badge warn pro-tag">PRO</span></h3>
        <p class="small muted">Ready-made picture games with stories, questions and party props.</p>
        <button class="btn sm" style="margin-top:6px">See what's inside</button>
      </div>`;
    $('#template-grid').innerHTML = templates().map((t, i) => {
      const s = t.story;
      const total = s.chapters.reduce((n, c) => n + (c.type === 'mosaic' ? 4 : c.word.length), 0);
      return `<div class="card template-card" data-template="${i}">
        <h3>${esc(s.title)}</h3>
        <div class="code">${esc(s.chapters.map((c) => c.word).join(' '))}</div>
        <p class="small muted">${esc(s.tagline)}</p>
        <div class="project-meta"><span class="badge">${total} puzzles</span><span class="badge">${s.chapters.length} chapters</span></div>
        <button class="btn primary sm" style="margin-top:6px">Use this story</button>
      </div>`;
    }).join('') + locked;
  }
  $('#template-grid').addEventListener('click', (e) => {
    if (e.target.closest('[data-pack-locked]')) { offerUpgrade('Theme Packs'); $('#mode-section').scrollIntoView({ behavior: 'smooth' }); return; }
    const card = e.target.closest('[data-template]');
    if (!card) return;
    const t = templates()[+card.dataset.template];
    state.themeId = t.themeId;
    state.plotId = t.plotId;
    renderThemes(); renderPlots();
    if (sellerCode()) toast('Ready-made stories keep their own code, so your secret code was not used');
    // A template fixes its own code, so the advanced puzzle/chapter counts don't apply.
    acceptStory(t.story, { fixedCount: true });
  });

  // ---------------------------------------------------------------- advanced
  function renderMotifs() {
    const auto = effective().motif;
    $('#motifs').innerHTML =
      `<button type="button" class="motif auto ${state.settings.motif === 'auto' ? 'on' : ''}" data-motif="auto">Auto<br><span class="small muted">${esc(MOTIFS[auto].label)}</span></button>` +
      Object.entries(MOTIFS).map(([k, m]) =>
        `<button type="button" class="motif ${k === state.settings.motif ? 'on' : ''}" data-motif="${k}"><svg viewBox="0 0 32 32">${m.svg}</svg>${m.label}</button>`
      ).join('');
  }
  $('#motifs').addEventListener('click', (e) => {
    const b = e.target.closest('.motif');
    if (!b) return;
    state.settings.motif = b.dataset.motif;
    renderMotifs(); markDirty();
  });

  const advBind = (id, key, num) => $('#' + id).addEventListener('change', (e) => {
    const v = e.target.value;
    state.settings[key] = v === '' ? null : num ? +v : v;
    renderPrompt(); markDirty();
  });
  advBind('adv-count', 'count', true);
  advBind('adv-chapters', 'chapters', true);
  advBind('adv-w', 'w', true);
  advBind('adv-h', 'h', true);
  advBind('adv-reverse', 'reverse', true);
  advBind('adv-paper', 'paper', false);
  advBind('adv-ink', 'ink', false);

  $('#project-title').addEventListener('input', () => { state.titleTouched = true; markDirty(); });

  // ---------------------------------------------------------------- puzzles (engine)
  // Generation runs in a Web Worker (assets/js/engine/worker.js); see generator.js.
  let worker = null;
  let jobId = 0;
  const pending = new Map(); // job id -> { onPuzzle, onDone, onError }

  function getWorker() {
    if (worker) return worker;
    worker = new Worker('assets/js/engine/worker.js?v=' + encodeURIComponent(window.ASSET_VERSION || ''));
    worker.onmessage = (e) => {
      const m = e.data, h = pending.get(m.id);
      if (!h) return;
      if (m.type === 'puzzle') h.onPuzzle(m.index, m.puzzle);
      else if (m.type === 'error') h.onError(m.index, m.message);
      else if (m.type === 'example') { pending.delete(m.id); h.onExample(m.example); }
      else if (m.type === 'done') { pending.delete(m.id); h.onDone(); }
    };
    worker.onerror = (e) => {
      pending.forEach((h) => h.onError(-1, e.message || 'Puzzle engine crashed'));
      pending.clear();
      worker = null;
    };
    return worker;
  }

  function runJobs(jobs, handlers) {
    const id = ++jobId;
    pending.set(id, handlers);
    getWorker().postMessage({ type: 'build', id, jobs });
  }

  // One generator job per letter. Reverse-mode puzzles (Adults only) go last in a chapter;
  // repeated letters get different glyph variants.
  function jobFor(i, slot, seed, seen) {
    if (slot.kind === 'piece') {
      return { index: i, mask: slot.mask, W: 10, H: 10, difficulty: state.settings.difficulty, seed: `${seed}-${i}-piece` };
    }
    const eff = effective();
    const occurrence = seen ? (seen[slot.letter] = (seen[slot.letter] || 0) + 1) - 1 : 0;
    return {
      index: i, letter: slot.letter, W: eff.w, H: eff.h, difficulty: state.settings.difficulty,
      reverse: eff.reverse > 0 && slot.pos === slot.len - 1 && slot.chapter < eff.reverse,
      seed: `${seed}-${i}-${slot.letter}`, variant: occurrence
    };
  }

  function drawPuzzle(canvas, p, showSolution) {
    const cell = 18, pad = 6;
    canvas.width = p.W * cell + pad * 2;
    canvas.height = p.H * cell + pad * 2;
    const ctx = canvas.getContext('2d');
    const X = (c) => pad + c * cell, Y = (r) => pad + r * cell;
    const ins = (r, c) => r >= 0 && r < p.H && c >= 0 && c < p.W && p.inside[r * p.W + c] === 1;
    if (showSolution) {
      ctx.fillStyle = '#D9BF8C';
      for (let r = 0; r < p.H; r++) for (let c = 0; c < p.W; c++) if (ins(r, c)) ctx.fillRect(X(c), Y(r), cell, cell);
      ctx.strokeStyle = '#7A2E1E'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let r = 0; r <= p.H; r++) for (let c = 0; c < p.W; c++) if (ins(r - 1, c) !== ins(r, c)) { ctx.moveTo(X(c), Y(r)); ctx.lineTo(X(c + 1), Y(r)); }
      for (let r = 0; r < p.H; r++) for (let c = 0; c <= p.W; c++) if (ins(r, c - 1) !== ins(r, c)) { ctx.moveTo(X(c), Y(r)); ctx.lineTo(X(c), Y(r + 1)); }
      ctx.stroke();
    }
    ctx.fillStyle = '#3B2412';
    for (let r = 0; r <= p.H; r++) for (let c = 0; c <= p.W; c++) { ctx.beginPath(); ctx.arc(X(c), Y(r), 1.5, 0, 7); ctx.fill(); }
    ctx.font = 'bold 11px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    p.clues.forEach((v, i) => {
      if (v < 0) return;
      ctx.fillText(String(v), X(i % p.W) + cell / 2, Y(Math.floor(i / p.W)) + cell / 2 + 0.5);
    });
  }

  // Plans the cut of every picture chapter that has no plan yet. Returns an error sentence or null.
  function planMosaics() {
    const chapters = state.story.chapters;
    for (let ci = 0; ci < chapters.length; ci++) {
      if (!Story.isMosaic(chapters[ci]) || state.mosaics[ci]) continue;
      if (!window.Mosaic) return 'This game uses Mosaic chapters, which need SlitherEscape PRO.';
      const img = library().find((m) => m.name === chapters[ci].word);
      if (!img) return `The picture ${chapters[ci].word} is no longer in the library.`;
      try {
        state.mosaics[ci] = window.Mosaic.plan({ rows: img.rows, difficulty: state.settings.difficulty, seed: `${state.settings.seed}-m${ci}` });
      } catch (e) {
        return `${chapters[ci].word}: ${e.message}`;
      }
    }
    return null;
  }

  // The picture printed on the Answer Board plus decoys: first those that look alike, then
  // the same theme, then any other. Never another picture of this game.
  function answerBoards() {
    const lib = library();
    const used = state.story.chapters.filter(Story.isMosaic).map((c) => c.word);
    const r = window.Generator ? window.Generator.rng(state.settings.seed + '-board') : null;
    const boards = {};
    state.story.chapters.forEach((c, ci) => {
      if (!Story.isMosaic(c)) return;
      const img = lib.find((m) => m.name === c.word);
      const size = state.settings.difficulty === 'hard' ? 8 : 6;
      const free = lib.filter((m) => !used.includes(m.name));
      const near = free.filter((m) => (img.similar || []).includes(m.name));
      const theme = r.shuffle(free.filter((m) => m.theme === img.theme && !near.includes(m)));
      const rest = r.shuffle(free.filter((m) => m.theme !== img.theme && !near.includes(m)));
      boards[ci] = r.shuffle([img].concat(near, theme, rest).slice(0, size));
      // The true picture must survive the cut even when many decoys look alike.
      if (!boards[ci].includes(img)) boards[ci][0] = img;
      // Repairs can change a few cells, so the board shows exactly what players assemble.
      boards[ci] = boards[ci].map((m) => (m === img ? Object.assign({}, m, { rows: window.Mosaic.assembledRows(state.mosaics[ci]) }) : m));
    });
    return boards;
  }

  function drawPicture(canvas, plan) {
    const cell = 5;
    canvas.width = canvas.height = cell * 20;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFCF6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#3B2412';
    plan.slots.forEach((slot, s) => {
      const ox = (s % 2) * 10, oy = (s >> 1) * 10;
      slot.cells.forEach((v, i) => { if (v) ctx.fillRect((ox + i % 10) * cell, (oy + Math.floor(i / 10)) * cell, cell, cell); });
    });
    ctx.strokeStyle = '#C9A877';
    ctx.beginPath();
    ctx.moveTo(50, 0); ctx.lineTo(50, 100); ctx.moveTo(0, 50); ctx.lineTo(100, 50);
    ctx.stroke();
  }

  // ---------------------------------------------------------------- build
  let building = false;
  function buildGame() {
    if (building || !state.story) return;
    const planError = planMosaics();
    if (planError) {
      showScreen('start');
      showCheck([{ msg: planError, ai: planError }], []);
      $('#check-result').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    building = true;
    showScreen('result');
    $('#building').classList.remove('hidden');
    $('#result-body').classList.add('hidden');
    const slots = gameSlots();
    const seen = {};
    const jobs = slots.map((slot, i) => jobFor(i, slot, state.settings.seed, seen));
    state.puzzles = [];
    const errors = [];
    let done = 0;
    const started = Date.now();
    $('#gen-fill').style.width = '0';
    $('#gen-status').textContent = `Puzzle 1 of ${slots.length}: ${slotName(slots[0])}`;
    $('#gen-count').textContent = '0%';
    const finish = () => {
      building = false;
      $('#building').classList.add('hidden');
      $('#result-body').classList.remove('hidden');
      renderResult();
      markDirty();
      if (errors.length) toast(`${errors.length} puzzle${errors.length > 1 ? 's' : ''} could not be built: ${errors[0]}`);
      else toast(`${slots.length} puzzles built in ${((Date.now() - started) / 1000).toFixed(1)} s`);
    };
    runJobs(jobs, {
      onPuzzle(i, p) {
        state.puzzles[i] = p;
        done++;
        const next = slots[done];
        $('#gen-fill').style.width = (100 * done / slots.length) + '%';
        $('#gen-status').textContent = next ? `Puzzle ${done + 1} of ${slots.length}: ${slotName(next)}` : 'Final checks…';
        $('#gen-count').textContent = `${Math.round(100 * done / slots.length)}%`;
      },
      onError(i, msg) { errors.push(msg); done++; if (i < 0) finish(); },
      onDone: finish
    });
  }

  // ---------------------------------------------------------------- result
  function pageList() {
    const s = state.story;
    const n = puzzleCount();
    const pages = [['Cover', 1], ['Prologue and mission', 1], ['How to Play (rules + example)', 1], ['Code Sheet', 1]];
    s.chapters.forEach((c, ci) => {
      pages.push([`Chapter ${ci + 1}: ${c.name} — intro`, 1]);
      if (Story.isMosaic(c)) {
        const pieces = state.mosaics[ci] ? state.mosaics[ci].pieces.length : 4;
        pages.push([`Chapter ${ci + 1} — ${pieces} picture pieces`, Math.ceil(pieces / 4)]);
        pages.push([`Chapter ${ci + 1} — Assembly Board`, 1]);
        pages.push([`Chapter ${ci + 1} — Answer Board`, 1]);
      } else {
        pages.push([`Chapter ${ci + 1} — ${c.word.length} puzzle pages`, c.word.length]);
      }
    });
    pages.push(['Final Lock', 1]);
    pages.push(['Host guide', 2, true]);
    pages.push(['20 hint questions', 2, true]);
    pages.push([`Cut-out hint cards (${n * 2} cards)`, Math.ceil(n * 2 / 6), true]);
    pages.push(['Answer key', Math.ceil(n / 4) + (s.chapters.some(Story.isMosaic) ? 1 : 0), true]);
    pages.push(['Certificate (landscape)', 1]);
    return pages;
  }

  function checks() {
    const s = state.story;
    const n = puzzleCount();
    const out = [];
    // The code was checked when the story was loaded; here only the text limits matter.
    const { errors } = Story.validate(s, { code: s.chapters.map((c) => c.word).join(' '), hasGlyph: () => true, images: library() });
    out.push([errors.length ? 'err' : 'ok', 'Story and word limits', errors.length ? errors.slice(0, 3).map((e) => e.msg).join(' ') : 'Every part fits its printed page']);
    const built = state.puzzles.filter(Boolean);
    const slots = gameSlots();
    out.push([built.length === n ? 'ok' : 'err', `${built.length} of ${n} puzzles built`, built.length === n ? 'Every letter and picture piece has its puzzle' : 'Use "New puzzles" to try again']);
    const wrongLetter = state.puzzles.filter((p, i) => p && slots[i] && slots[i].kind === 'letter' && p.letter !== slots[i].letter).length;
    out.push([wrongLetter ? 'err' : 'ok', 'Letters match the code', wrongLetter ? `${wrongLetter} puzzle(s) spell the wrong letter` : 'Each loop traces its letter of the code']);
    const wrongPiece = state.puzzles.filter((p, i) => p && slots[i] && slots[i].kind === 'piece' && p.inside.join('') !== slots[i].mask.join('')).length;
    if (slots.some((x) => x.kind === 'piece')) out.push([wrongPiece ? 'err' : 'ok', 'Pieces match the pictures', wrongPiece ? `${wrongPiece} piece(s) do not match` : 'Each loop traces its part of the picture']);
    const broken = built.filter((p) => !p.verify || p.verify.problems.some((x) => x !== 'more than one solution' && x !== 'no solution'));
    out.push([broken.length ? 'err' : 'ok', 'Valid Slitherlink', broken.length ? broken[0].verify.problems.join('; ') : 'One closed loop, every dot has degree 0 or 2, clues match the loop']);
    const notUnique = built.filter((p) => !p.verify || !p.verify.unique);
    out.push([notUnique.length ? 'err' : 'ok', 'Unique solution', notUnique.length ? `${notUnique.length} puzzle(s) failed the solution count` : 'The solution counter confirms exactly one solution per puzzle']);
    out.push(['ok', 'Answers shuffled', 'Correct answers spread evenly over A, B and C']);
    if (s.chapters.some(Story.isMosaic) && !window.PdfPro) out.push(['err', 'SlitherEscape PRO', 'This game has Mosaic chapters, so downloading it needs SlitherEscape PRO']);
    return out;
  }

  function renderResult() {
    const s = state.story;
    const eff = effective();
    const p = PRESETS[state.settings.difficulty];
    const n = puzzleCount();
    const lo = p.minutes[0] * n, hi = p.minutes[1] * n;
    const pages = pageList();
    const total = pages.reduce((t, x) => t + x[1], 0);
    const paper = { letter: 'Letter', a4: 'A4', kdp: 'KDP 8.5×11' }[eff.paper];

    $('#r-title').textContent = s.title;
    $('#r-code').textContent = codeSpaced();
    $('#r-meta').innerHTML = [
      `<span class="badge dark">${p.audience}</span>`, `<span class="badge">${n} puzzles</span>`,
      `<span class="badge">${s.chapters.length} chapters</span>`, `<span class="badge">${lo}–${hi} min</span>`,
      `<span class="badge">${total} pages · ${paper}</span>`, `<span class="badge">${eff.inkSaver ? 'Ink saver' : 'Aged paper'}</span>`
    ].join('');

    $('#cover-preview').innerHTML = `
      <div class="cv-kicker">A Slitherlink Escape Game</div>
      <div class="cv-title">${esc(s.title)}</div>
      <div class="cv-tag">${esc(s.tagline)}</div>
      <svg class="cv-motif" viewBox="0 0 32 32">${MOTIFS[eff.motif].svg}</svg>
      <div class="cv-meta">${p.audience} · ${n} Puzzles · ${lo}–${hi} Minutes</div>
      <div class="cv-shop">© ${esc(DEFAULTS.shop)}</div>`;

    const list = checks();
    const bad = list.filter((c) => c[0] === 'err').length;
    $('#verifier-summary').textContent = bad ? `${bad} check${bad > 1 ? 's' : ''} failed — open for details` : `✓ All ${list.length} checks passed`;
    $('#verifier-summary').classList.toggle('bad', bad > 0);
    $('#checklist').innerHTML = list.map(([k, t, d]) =>
      `<li><span class="check-icon ${k}">${k === 'ok' ? '✓' : '×'}</span><div><b>${esc(t)}</b><small>${esc(d)}</small></div></li>`).join('');
    $('#export-pdf').disabled = bad > 0;
    $('#export-kit').classList.toggle('hidden', !state.settings.kit || !window.PdfPro);
    $('#export-kit').disabled = bad > 0;

    let from = 1;
    $('#page-list').innerHTML = pages.map(([name, count, host]) => {
      const a = from; from += count;
      return `<li class="${host ? 'host' : ''}"><span>${esc(name)}</span><span>${count > 1 ? `p. ${a}–${from - 1}` : `p. ${a}`}</span></li>`;
    }).join('');
    $('#page-total').textContent = `— ${total} pages`;

    renderPuzzles();
  }

  const REGEN_ICON = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M16 10a6 6 0 1 1-2-4.5M16 3v4h-4"/></svg>';

  function renderPuzzles() {
    const slots = gameSlots();
    const show = $('#show-solution').checked;
    let i = 0;
    $('#puzzle-chapters').innerHTML = state.story.chapters.map((c, ci) => `<div class="chapter-block">
      <h3>Chapter ${ci + 1}: ${esc(c.name)} <small>${esc(c.word)}${Story.isMosaic(c) ? ' · Mosaic picture' : ''}</small></h3>
      ${Story.isMosaic(c) && state.mosaics[ci] ? `<div class="mosaic-preview"><canvas data-picture="${ci}"></canvas><span class="small muted">The finished picture, as players assemble it. Pieces are numbered in shuffled order.</span></div>` : ''}
      <div class="puzzle-grid">${slots.filter((x) => x.chapter === ci).map(() => {
        const n = i++, p = state.puzzles[n], slot = slots[n];
        const tag = slot.kind === 'piece' ? slot.label : slot.letter;
        if (!p) {
          return `<div class="card puzzle-card"><div class="puzzle-thumb"><span class="letter-tag">${esc(tag)}</span><div class="small" style="padding:60px 0;color:var(--err)">Not built</div></div>
          <div class="puzzle-foot"><span class="badge err">Failed</span><button class="icon-btn" title="Try again" data-regen="${n}">${REGEN_ICON}</button></div></div>`;
        }
        const ok = p.verify && p.verify.ok;
        return `<div class="card puzzle-card">
          <div class="puzzle-thumb">
            <span class="letter-tag">${esc(tag)}</span>
            ${p.reverse ? '<span class="badge warn mode-tag">Reverse</span>' : ''}
            <canvas data-puzzle="${n}"></canvas>
          </div>
          <div class="puzzle-info">
            <div class="t">${n + 1}. ${esc(slot.kind === 'piece' ? `Piece for square ${slot.label}` : state.story.puzzleTitles[slot.titleIndex] || '')}</div>
            <div class="s">${slot.kind === 'piece' ? (slot.showLabel ? 'Square printed on the piece' : 'Players work out the square') : `Word ${ci + 1}, letter ${slot.pos + 1} of ${slot.len}`} · ${p.clueCount} clues</div>
          </div>
          <div class="puzzle-foot">
            ${ok ? '<span class="badge ok"><span class="dot"></span>Unique</span>' : '<span class="badge err">Check failed</span>'}
            <button class="icon-btn" title="New version of this puzzle" data-regen="${n}">${REGEN_ICON}</button>
          </div>
        </div>`;
      }).join('')}</div>
    </div>`).join('');
    $$('canvas[data-puzzle]').forEach((cv) => drawPuzzle(cv, state.puzzles[+cv.dataset.puzzle], show));
    $$('canvas[data-picture]').forEach((cv) => drawPicture(cv, state.mosaics[+cv.dataset.picture]));
  }
  $('#show-solution').addEventListener('change', renderPuzzles);
  $('#puzzle-chapters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-regen]');
    if (!b) return;
    const n = +b.dataset.regen;
    b.disabled = true;
    b.closest('.puzzle-card').style.opacity = '.5';
    let failed = false;
    runJobs([jobFor(n, gameSlots()[n], newSeed())], {
      onPuzzle(i, p) { state.puzzles[i] = p; },
      onError(i, msg) { failed = true; toast(`Puzzle ${n + 1}: ${msg}`); },
      onDone() { renderResult(); markDirty(); if (!failed) toast(`Puzzle ${n + 1} replaced`); }
    });
  });

  $('#btn-regen').addEventListener('click', () => {
    state.settings.seed = newSeed();
    state.mosaics = {};
    buildGame();
  });
  $('#btn-restart').addEventListener('click', () => {
    $('#edit-panel').classList.add('hidden');
    showScreen('start');
  });

  // Small example puzzle for the How to Play page, generated once per seed.
  function exampleFor(seed) {
    if (state.example && state.example.seed === seed) return Promise.resolve(state.example.data);
    return new Promise((resolve, reject) => {
      const id = ++jobId;
      pending.set(id, {
        onExample(data) { state.example = { seed, data }; resolve(data); },
        onError(i, msg) { reject(new Error(msg)); }
      });
      getWorker().postMessage({ type: 'example', id, seed: seed + '-example' });
    });
  }

  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'escape-game';

  async function gameForPdf() {
    const eff = effective();
    const p = PRESETS[state.settings.difficulty];
    const n = puzzleCount();
    const audienceLong = { easy: 'children aged 11 to 13', medium: 'teenagers aged 14 to 17', hard: 'adults' }[state.settings.difficulty];
    const hasMosaic = state.story.chapters.some(Story.isMosaic);
    return {
      story: state.story,
      puzzles: state.puzzles,
      slots: gameSlots(),
      mosaics: state.mosaics,
      answerBoards: hasMosaic ? answerBoards() : {},
      partyKit: !!state.settings.kit && !!window.PdfPro,
      kit: { players: state.settings.kitPlayers, play: state.settings.kitPlay, teams: state.settings.kitTeams },
      example: await exampleFor(state.settings.seed),
      paper: eff.paper,
      inkSaver: eff.inkSaver,
      motif: eff.motif,
      shop: DEFAULTS.shop,
      audience: p.audience.replace('–', '-'),
      audienceLong,
      minutes: [p.minutes[0] * n, p.minutes[1] * n],
      seed: state.settings.seed
    };
  }

  $('#export-kit').addEventListener('click', async () => {
    const btn = $('#export-kit');
    const status = (pct, text) => {
      $('#export-fill').style.width = Math.round(pct * 100) + '%';
      $('#export-status').textContent = text;
    };
    btn.disabled = true;
    $('#export-progress').classList.remove('hidden');
    status(0, 'Preparing…');
    try {
      const doc = await window.PdfPro.buildKit(await gameForPdf(), (pct, text) => status(pct, `${text}…`));
      const file = `${slug(state.story.title)}-party-kit-${effective().paper}.pdf`;
      doc.save(file);
      status(1, `Downloaded ${file} (${doc.getNumberOfPages()} pages)`);
    } catch (err) {
      console.error(err);
      status(0, 'Export failed: ' + err.message);
    } finally {
      btn.disabled = false;
    }
  });

  $('#export-pdf').addEventListener('click', async () => {
    const btn = $('#export-pdf');
    const status = (pct, text) => {
      $('#export-fill').style.width = Math.round(pct * 100) + '%';
      $('#export-status').textContent = text;
    };
    btn.disabled = true;
    $('#export-progress').classList.remove('hidden');
    status(0, 'Preparing…');
    try {
      const eff = effective();
      const game = await gameForPdf();
      const doc = await window.PdfBuilder.build(game, (pct, text) => status(pct, `${text}…`));
      const file = `${slug(state.story.title)}-${eff.paper}.pdf`;
      doc.save(file);
      status(1, `Downloaded ${file} (${doc.getNumberOfPages()} pages)`);
    } catch (err) {
      console.error(err);
      status(0, 'Export failed: ' + err.message);
    } finally {
      btn.disabled = false;
    }
  });

  // ---------------------------------------------------------------- edit text
  function counter(limit, value) {
    const n = Story.wordCount(value);
    return `<span class="count ${n > limit ? 'over' : ''}" data-limit="${limit}">${n}/${limit} words</span>`;
  }
  function fieldText(path, label, value, limit, rows) {
    const control = rows
      ? `<textarea data-path="${path}" rows="${rows}">${esc(value)}</textarea>`
      : `<input type="text" data-path="${path}" value="${esc(value)}">`;
    return `<div class="field"><div class="field-label">${label}${counter(limit, value)}</div>${control}</div>`;
  }

  let wordsAtEditStart = '';
  function renderStoryForm() {
    const s = state.story;
    const L = Story.LIMITS;
    let idx = 0;
    const chapters = s.chapters.map((c, ci) => {
      if (Story.isMosaic(c)) {
        return `<div class="chapter">
          <div class="chapter-head"><h4>Chapter ${ci + 1} · Mosaic picture</h4><span class="badge">${esc(c.word)}</span></div>
          ${fieldText(`chapters.${ci}.name`, 'Chapter name', c.name, L.chapterName.words)}
          ${fieldText(`chapters.${ci}.intro`, 'Chapter intro', c.intro, L.chapterIntro.words, 4)}
        </div>`;
      }
      const titles = c.word.split('').map((ch, li) => {
        const i = idx++;
        return `<div class="title-row">
          <span class="letter">${esc(ch)}</span>
          <span class="pos">Puzzle ${i + 1}<br>Word ${ci + 1}, letter ${li + 1} of ${c.word.length}</span>
          <input type="text" data-path="puzzleTitles.${i}" value="${esc(s.puzzleTitles[i])}" placeholder="Puzzle ${i + 1} title">
        </div>`;
      }).join('');
      return `<div class="chapter">
        <div class="chapter-head"><h4>Chapter ${ci + 1}</h4><div class="word-boxes">${c.word.split('').map((ch) => `<span>${esc(ch)}</span>`).join('')}</div></div>
        <div class="row">
          ${fieldText(`chapters.${ci}.name`, 'Chapter name', c.name, L.chapterName.words)}
          <div class="field"><div class="field-label">Code word<span class="count">${c.word.length} letters</span></div><input type="text" class="mono" data-path="chapters.${ci}.word" value="${esc(c.word)}"></div>
        </div>
        ${fieldText(`chapters.${ci}.intro`, 'Chapter intro', c.intro, L.chapterIntro.words, 4)}
        ${fieldText(`chapters.${ci}.riddle`, 'Riddle hinting the word (Code Sheet)', c.riddle, L.riddle.words, 2)}
        <div class="field-label">Puzzle titles</div>
        <div class="title-list">${titles}</div>
      </div>`;
    }).join('');

    const questions = s.questions.map((q, qi) => `<div class="q">
      <span class="q-num">${qi + 1}.</span>
      <div>
        <input type="text" data-path="questions.${qi}.q" value="${esc(q.q)}">
        <div class="q-opts">${q.options.map((o, oi) => `
          <label class="q-opt ${q.answer === oi ? 'correct' : ''}">
            <input type="radio" name="q${qi}" data-answer="${qi}" value="${oi}" ${q.answer === oi ? 'checked' : ''} title="Correct answer">
            <input type="text" data-path="questions.${qi}.options.${oi}" value="${esc(o)}">
          </label>`).join('')}
        </div>
      </div>
      <span class="badge q-kind">${q.kind === 'trivia' ? 'Trivia' : 'Story'}</span>
    </div>`).join('');

    $('#story-form').innerHTML = `
      <h3 class="q-title" style="margin-top:4px">Cover and opening</h3>
      <div class="row">
        ${fieldText('title', 'Game title', s.title, L.title.words)}
        ${fieldText('teamName', "Players' team name", s.teamName, L.teamName.words)}
      </div>
      ${fieldText('tagline', 'Cover tagline', s.tagline, L.tagline.words)}
      ${fieldText('prologue', 'Prologue', s.prologue, L.prologue.words, 6)}
      ${fieldText('mission', 'Mission', s.mission, L.mission.words, 2)}
      <h3 class="q-title" style="margin-top:22px">Chapters and code</h3>
      ${chapters}
      <h3 class="q-title" style="margin-top:22px">Ending</h3>
      ${fieldText('finalLock', 'Final Lock page', s.finalLock, L.finalLock.words, 3)}
      ${fieldText('ending', 'Ending read aloud by the host', s.ending, L.ending.words, 5)}
      ${fieldText('certificate', 'Certificate line', s.certificate, L.certificate.words)}
      <details class="collapsible" style="margin-top:22px">
        <summary><h3 style="margin:0">20 hint questions</h3><span class="small muted">The selected dot marks the correct answer</span></summary>
        <div class="q-list">${questions}</div>
      </details>`;
  }

  function setPath(obj, path, value) {
    const keys = path.split('.');
    let o = obj;
    for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
    o[keys[keys.length - 1]] = value;
  }

  $('#btn-edit').addEventListener('click', () => {
    wordsAtEditStart = codeSpaced();
    renderStoryForm();
    $('#edit-panel').classList.remove('hidden');
    $('#edit-panel').scrollIntoView({ behavior: 'smooth' });
  });
  $('#edit-done').addEventListener('click', () => {
    $('#edit-panel').classList.add('hidden');
    if (!state.titleTouched) $('#project-title').value = state.story.title;
    if (codeSpaced() !== wordsAtEditStart) {
      // New letters mean new puzzles; keep titles aligned with the new letter count.
      const n = Story.titleCount(state.story);
      state.story.puzzleTitles = Array.from({ length: n }, (_, i) => state.story.puzzleTitles[i] || '');
      buildGame();
    } else {
      renderResult();
    }
  });

  $('#story-form').addEventListener('input', (e) => {
    const el = e.target;
    if (!el.dataset.path) return;
    let v = el.value;
    if (el.dataset.path.endsWith('.word')) {
      v = v.toUpperCase().replace(/[^A-Z]/g, '');
      el.value = v;
    }
    setPath(state.story, el.dataset.path, v);
    const count = el.parentElement.querySelector('.count[data-limit]');
    if (count) {
      const n = Story.wordCount(v), lim = +count.dataset.limit;
      count.textContent = `${n}/${lim} words`;
      count.classList.toggle('over', n > lim);
    }
    markDirty();
  });
  $('#story-form').addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.answer !== undefined) {
      state.story.questions[+el.dataset.answer].answer = +el.value;
      el.closest('.q-opts').querySelectorAll('.q-opt').forEach((o) => o.classList.toggle('correct', o.contains(el)));
      markDirty();
    }
  });

  // ---------------------------------------------------------------- init
  $('#adv-reverse-field').classList.add('hidden');
  renderMode();
  renderThemes();
  renderPlots();
  renderTemplates();
  renderMotifs();
  renderPrompt();

  // Reopen a saved project: restore every choice, then show the result screen
  // (or rebuild the puzzles if the saved set is missing or stale, e.g. after Duplicate).
  function restore(data) {
    if (!data) return;
    state.themeId = data.themeId || null;
    state.plotId = data.plotId || null;
    Object.assign(state.settings, data.settings || {});
    state.titleTouched = !!data.titleTouched;
    $('#theme-input').value = data.customTheme || '';
    $('#code-input').value = data.code || '';
    const st = state.settings;
    $$('#aud-grid .diff').forEach((b) => b.classList.toggle('on', b.dataset.diff === st.difficulty));
    $('#adv-reverse-field').classList.toggle('hidden', !PRESETS[st.difficulty].reverse);
    $('#adv-count').value = st.count || '';
    $('#adv-chapters').value = st.chapters || '';
    $('#adv-w').value = st.w || '';
    $('#adv-h').value = st.h || '';
    $('#adv-reverse').value = String(st.reverse ?? 1);
    $('#adv-paper').value = st.paper || '';
    $('#adv-ink').value = st.ink || '';
    state.mosaics = data.mosaics && !Array.isArray(data.mosaics) ? data.mosaics : {};
    renderMode(); renderThemes(); renderPlots(); renderCode(); renderMotifs(); renderPrompt();
    if (!data.story) return;
    state.story = Story.normalise(data.story);
    const puzzles = Array.isArray(data.puzzles) ? data.puzzles : [];
    const slots = gameSlots();
    const planned = state.story.chapters.every((c, ci) => !Story.isMosaic(c) || state.mosaics[ci]);
    const complete = planned && puzzles.length === slots.length && puzzles.every((p, i) => p && (slots[i].kind === 'piece' ? p.kind === 'piece' : p.letter === slots[i].letter));
    if (complete) {
      state.puzzles = puzzles;
      showScreen('result');
      $('#building').classList.add('hidden');
      $('#result-body').classList.remove('hidden');
      renderResult();
    } else {
      buildGame();
    }
  }

  restore(window.PROJECT && window.PROJECT.data);
  dirty = false;
})();
