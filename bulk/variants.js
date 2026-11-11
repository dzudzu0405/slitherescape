// Bulk Creator (OTO2), spec 12.1: one story -> many variants (difficulty x paper x print style),
// each with its own puzzles, answer key and variant code, delivered as one ZIP of PDFs.
'use strict';
(function () {
  const DIFFS = [['easy', 'Easy', 'EAS', 'Kids 11–13'], ['medium', 'Medium', 'MED', 'Teens 14–17'], ['hard', 'Hard', 'HRD', 'Adults']];
  const PAPERS = [['letter', 'Letter', 'LTR'], ['a4', 'A4', 'A4'], ['kdp', 'KDP 8.5×11', 'KDP']];
  const PRINTS = [['aged', 'Aged paper', false], ['ink', 'Ink saver (white)', true]];
  const FILE_PAPER = { letter: 'Letter', a4: 'A4', kdp: 'KDP-8.5x11' };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const seed = () => Array.from({ length: 2 }, () => Math.floor(Math.random() * 0x10000).toString(16).toUpperCase().padStart(4, '0')).join('-');
  // Title Case words joined by hyphens: "The Christmas Eve Lockdown" -> "The-Christmas-Eve-Lockdown"
  const fileTitle = (t) => (t || 'Escape-Game').replace(/[^A-Za-z0-9 ]+/g, ' ').trim().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('-') || 'Escape-Game';

  let box, running = false;

  function chosen(name) {
    return [...box.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);
  }

  // Every combination the seller ticked, with its variant code (spec: e.g. MED-LTR-02).
  function variants() {
    const list = [];
    for (const d of DIFFS) {
      if (!chosen('bv-diff').includes(d[0])) continue;
      for (const p of PAPERS) {
        if (!chosen('bv-paper').includes(p[0])) continue;
        for (const pr of PRINTS) {
          if (!chosen('bv-print').includes(pr[0])) continue;
          list.push({ difficulty: d[0], diffLabel: d[1], paper: p[0], paperLabel: p[1], inkSaver: pr[2], printLabel: pr[1], prefix: `${d[2]}-${p[2]}` });
        }
      }
    }
    // Numbered per difficulty+paper, so aged and ink-saver copies of one size get 01 and 02.
    const counts = {};
    list.forEach((v) => { counts[v.prefix] = (counts[v.prefix] || 0) + 1; v.code = `${v.prefix}-${String(counts[v.prefix]).padStart(2, '0')}`; });
    return list;
  }

  function warnings(list, game) {
    const out = [];
    if (game.difficulty !== 'easy' && list.some((v) => v.difficulty === 'easy')) {
      out.push(`The story was written for ${DIFFS.find((d) => d[0] === game.difficulty)[3].toLowerCase()}. Read it again before selling the Easy version to kids aged 11–13: it may be too scary or too hard to read.`);
    }
    if (list.length > 12) out.push(`${list.length} variants take a while to build. Keep this tab open until the ZIP is ready.`);
    return out;
  }

  function render() {
    const game = window.EditorBulk.current();
    if (!game) { box.innerHTML = '<p class="small muted">Build the game first.</p>'; return; }
    const check = (name, value, label, on) => `<label class="bv-opt"><input type="checkbox" name="${name}" value="${value}"${on ? ' checked' : ''}> ${esc(label)}</label>`;
    box.innerHTML = `
      <div class="bv-groups">
        <div><h4>Difficulty</h4>${DIFFS.map((d) => check('bv-diff', d[0], `${d[1]} · ${d[3]}`, d[0] === game.difficulty)).join('')}</div>
        <div><h4>Paper</h4>${PAPERS.map((p) => check('bv-paper', p[0], p[1], p[0] === game.paper)).join('')}</div>
        <div><h4>Print style</h4>${PRINTS.map((p) => check('bv-print', p[0], p[1], p[2] === game.inkSaver)).join('')}</div>
      </div>
      <p class="small muted bv-note">The story and the 20 questions stay the same. Each variant gets new puzzles, its own answer key and a variant code on every page.${game.hasMosaic ? ' Mosaic pictures keep their size; difficulty changes the clues and whether squares are printed on the pieces.' : ''}</p>
      <div id="bv-summary"></div>
      <button class="btn primary" id="bv-run" type="button">Make variants</button>
      <div class="progress hidden" id="bv-progress">
        <div class="progress-track"><div class="progress-fill" id="bv-fill"></div></div>
        <div class="progress-text"><span id="bv-status"></span><span id="bv-count"></span></div>
      </div>
      <div id="bv-result"></div>`;
    box.addEventListener('change', summary);
    box.querySelector('#bv-run').addEventListener('click', run);
    summary();
  }

  function summary() {
    if (running) return;
    const game = window.EditorBulk.current();
    const list = variants();
    const warn = warnings(list, game);
    box.querySelector('#bv-summary').innerHTML = (list.length
      ? `<ul class="bv-list">${list.map((v) => `<li><span class="mono">${v.code}</span> ${esc(v.diffLabel)} · ${esc(v.paperLabel)} · ${esc(v.printLabel)}</li>`).join('')}</ul>`
      : '<p class="small muted">Tick at least one option in each column.</p>')
      + warn.map((w) => `<div class="alert info">${esc(w)}</div>`).join('');
    const btn = box.querySelector('#bv-run');
    btn.disabled = !list.length;
    btn.textContent = list.length ? `Make ${list.length} variant${list.length > 1 ? 's' : ''} (ZIP)` : 'Make variants';
  }

  async function run() {
    const list = variants();
    if (!list.length || running) return;
    const game = window.EditorBulk.current();
    running = true;
    const btn = box.querySelector('#bv-run');
    btn.disabled = true;
    box.querySelectorAll('input').forEach((i) => { i.disabled = true; });
    box.querySelector('#bv-progress').classList.remove('hidden');
    box.querySelector('#bv-result').innerHTML = '';
    const fill = box.querySelector('#bv-fill'), stat = box.querySelector('#bv-status'), count = box.querySelector('#bv-count');
    const zip = new JSZip();
    const base = fileTitle(game.title);
    const done = [], failed = [];
    for (const [k, v] of list.entries()) {
      const show = (f, text) => {
        fill.style.width = (100 * (k + f) / list.length) + '%';
        stat.textContent = `${v.code} (${k + 1} of ${list.length}): ${text}`;
        count.textContent = `${Math.round(100 * (k + f) / list.length)}%`;
      };
      try {
        const out = await window.EditorBulk.buildVariant({ ...v, seed: seed() }, (f, text) => show(f, text));
        const name = `${base}_${v.diffLabel}_${FILE_PAPER[v.paper]}${v.inkSaver ? '_Ink-Saver' : ''}_${v.code}.pdf`;
        zip.file(name, out.doc.output('arraybuffer'));
        done.push({ v, name, pages: out.pages, puzzles: out.puzzles });
      } catch (e) {
        failed.push({ v, msg: e.message });
      }
      await new Promise((r) => setTimeout(r));
    }
    stat.textContent = 'Packing the ZIP…';
    let html = '';
    if (done.length) {
      // A short index of which file is which. No secret code in it: the ZIP may be passed on as is.
      zip.file('VARIANTS.txt', [`${game.title}`, '', ...done.map((d) => `${d.v.code}  ${d.v.diffLabel}, ${d.v.paperLabel}, ${d.v.printLabel}: ${d.pages} pages, ${d.puzzles} puzzles  ->  ${d.name}`), '',
        'Each variant has its own puzzles and answer key. Use the answer key whose variant code matches the pages you printed.'].join('\r\n'));
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      const url = URL.createObjectURL(blob);
      const zipName = `${base}_variants.zip`;
      const a = document.createElement('a');
      a.href = url; a.download = zipName;
      document.body.appendChild(a); a.click(); a.remove();
      html += `<div class="alert ok">Downloaded <b>${esc(zipName)}</b> (${(blob.size / 1048576).toFixed(1)} MB): ${done.length} PDF${done.length > 1 ? 's' : ''}. <a href="${url}" download="${esc(zipName)}">Download again</a></div>`;
      html += `<ul class="bv-list">${done.map((d) => `<li><span class="mono">${d.v.code}</span> ${esc(d.name)} · ${d.pages} pages</li>`).join('')}</ul>`;
    }
    if (failed.length) html += `<div class="alert err">${failed.length} variant(s) could not be built: ${failed.map((f) => `${esc(f.v.code)} (${esc(f.msg)})`).join('; ')}. Try them again.</div>`;
    box.querySelector('#bv-result').innerHTML = html;
    fill.style.width = '100%';
    stat.textContent = failed.length ? `${done.length} of ${list.length} variants ready` : `All ${list.length} variants ready`;
    count.textContent = '';
    running = false;
    box.querySelectorAll('input').forEach((i) => { i.disabled = false; });
    summary();
  }

  function init() {
    box = document.getElementById('bulk-variants');
    if (!box || !window.EditorBulk || !window.JSZip) return;
    render();
    // The panel lives on the result screen: refresh it whenever the game there changes.
    const result = document.getElementById('result-body');
    if (result) new MutationObserver(() => { if (!running && !result.classList.contains('hidden')) render(); }).observe(result, { attributes: true, attributeFilter: ['class'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
