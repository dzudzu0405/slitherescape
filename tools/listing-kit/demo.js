// Local test page for the Listing Kit module: pick a PDF and a theme, or run the sample cases with ?auto.
'use strict';
const $ = (id) => document.getElementById(id);
const K = window.ListingKit;

function card(name, node, url) {
  const fig = document.createElement('figure');
  fig.appendChild(node);
  const cap = document.createElement('figcaption');
  const label = document.createElement('span');
  label.textContent = name;
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.textContent = 'Tải về';
  cap.append(label, link);
  fig.appendChild(cap);
  $('out').appendChild(fig);
}

async function save(name, blob) {
  // Only the local test server has this route.
  try { await fetch('/save/' + name, { method: 'POST', body: blob }); } catch (e) { /* the download link still works */ }
}

async function outputImage(prefix, name, A) {
  const c = K.renderImage(name, A);
  const file = `${prefix}-${name}.jpg`;
  const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.92));
  card(file, c, URL.createObjectURL(blob));
  await save(file, blob);
}

async function runGame(data, { prefix, themeId, customText, material, images, video }) {
  const t0 = performance.now();
  const game = await K.analyzePdf(data);
  const tAnalyzed = performance.now();
  const visual = K.resolveVisual({ themeId, customText, title: game.title, material });
  const A = await K.createAssets(game, visual, window.DEMO_PUZZLE);
  const tAssets = performance.now();
  for (const name of images || K.imageNames) await outputImage(prefix, name, A);
  const tImages = performance.now();
  const result = {
    prefix, title: game.title, audience: game.audience, puzzles: game.puzzles, puzzlesOnCover: game.puzzlesOnCover,
    minutes: game.minutes, players: game.players, paper: game.paper, counts: game.counts,
    tagline: game.tagline, mission: game.mission, chapters: game.chapters, pageCount: game.pageCount, soloAllowed: game.soloAllowed,
    usedPages: A.usedPages, hostGuideShown: !!A.images.hostGuide, imageCount: (images || K.imageNames).length,
    visual: { id: visual.id, source: visual.source, material: visual.material, motif: visual.motif },
    ms: { analyze: Math.round(tAnalyzed - t0), assets: Math.round(tAssets - tAnalyzed), images: Math.round(tImages - tAssets) },
  };
  // The secret code must not appear in the text of any page a listing may show.
  const squash = (s) => s.replace(/\s+/g, '').toUpperCase();
  const code = game.secretCode ? squash(game.secretCode) : null;
  result.spoilerCheck = code
    ? { codeFound: true, leakedOnPages: game.pages.filter((p) => K.SAFE_KINDS.has(p.kind) && squash(p.text).includes(code)).map((p) => p.number) }
    : { codeFound: false };
  if (video) {
    const t = performance.now();
    const blob = await K.encodeVideo(A, (f) => { $('status').textContent = `${prefix}: đang xuất video ${Math.round(f * 100)}%`; });
    result.ms.video = Math.round(performance.now() - t);
    result.videoBytes = blob.size;
    const file = `${prefix}-video.mp4`;
    const url = URL.createObjectURL(blob);
    const v = document.createElement('video');
    v.src = url; v.controls = true; v.loop = true; v.muted = true; v.playsInline = true;
    card(file, v, url);
    await save(file, blob);
  }
  return result;
}

const fetchPdf = async (path) => new Uint8Array(await (await fetch(path)).arrayBuffer());

async function runSamples() {
  const report = { games: [] };
  const christmas = '../out/sample-christmas-letter.pdf', halloween = '../out/sample-ai-story-halloween.pdf';
  report.games.push(await runGame(await fetchPdf(christmas), { prefix: 'christmas', themeId: 'christmas', video: true }));
  report.games.push(await runGame(await fetchPdf(halloween), { prefix: 'halloween', themeId: 'other', customText: 'a haunted manor', video: true }));
  // Same game in the other export formats: white ink-saver pages on A4, and the KDP trim size.
  report.games.push(await runGame(await fetchPdf('../out/sample-christmas-a4-inksaver.pdf'), { prefix: 'a4-inksaver', themeId: 'christmas' }));
  report.games.push(await runGame(await fetchPdf('../out/sample-christmas-kdp.pdf'), { prefix: 'kdp', themeId: 'christmas' }));
  // Every built-in theme needs its own look, and free text must resolve sensibly.
  report.themesWithoutVisual = Themes.THEMES.filter((t) => !K.VISUALS[t.id]).map((t) => t.id);
  report.keywordCases = ['Haunted carnival', 'Pirate ship rescue', 'A day at the office', 'Friendship club', 'Lunar base', 'Start of summer'].map((customText) => {
    const v = K.resolveVisual({ themeId: 'other', customText });
    return { customText, id: v.id, source: v.source, material: v.material, motif: v.motif };
  });
  return report;
}

async function runForm() {
  const file = $('pdf').files[0];
  if (!file) { $('status').textContent = 'Hãy chọn một file PDF đã xuất từ SlitherEscape.'; return; }
  $('out').textContent = '';
  $('status').textContent = 'Đang đọc PDF…';
  const result = await runGame(new Uint8Array(await file.arrayBuffer()), {
    prefix: 'listing',
    themeId: $('theme').value,
    customText: $('custom').value,
    material: $('material').value,
    video: true,
  });
  $('status').textContent = `Xong: ${result.title}, nền ${result.visual.material} (${result.visual.source}).`;
}

function buildForm() {
  for (const t of Themes.THEMES) $('theme').add(new Option(t.label, t.id));
  for (const m of K.materials) $('material').add(new Option(m, m));
  $('run').addEventListener('click', () => runForm().catch((e) => { $('status').textContent = 'Lỗi: ' + e.message; }));
}

buildForm();
if (location.search.includes('auto')) {
  $('status').textContent = 'Đang chạy các game mẫu…';
  runSamples().then((r) => {
    window.__report = r;
    $('status').textContent = 'Xong các game mẫu.';
  }).catch((e) => {
    window.__report = { error: e.message, stack: e.stack };
    $('status').textContent = 'Lỗi: ' + e.message;
  });
} else {
  $('status').textContent = 'Chọn file PDF rồi bấm Tạo bộ listing.';
}
