// Image library review: draws grids and turns an uploaded SVG into an 18x18 grid.
(function () {
  'use strict';
  const SIZE = 18, SAMPLE = 8;

  function drawGrid(canvas, rows) {
    const cell = 9, w = rows[0].length, h = rows.length, n = 20;
    canvas.width = canvas.height = n * cell;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFCF6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const ox = Math.floor((n - w) / 2), oy = Math.floor((n - h) / 2);
    ctx.fillStyle = '#3B2412';
    rows.forEach((row, y) => { for (let x = 0; x < w; x++) if (row[x] === '#') ctx.fillRect((ox + x) * cell, (oy + y) * cell, cell, cell); });
    ctx.strokeStyle = '#E4D6BD';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= n; i++) {
      ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, n * cell); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(n * cell, i * cell); ctx.stroke();
    }
  }

  document.querySelectorAll('canvas[data-rows]').forEach((c) => drawGrid(c, JSON.parse(c.dataset.rows)));

  document.querySelectorAll('[data-review]').forEach((el) => {
    const r = window.Mosaic.review(JSON.parse(el.dataset.review));
    el.textContent = r.usable ? `${r.puzzles} puzzle pieces, ${r.repaired} cells changed` : 'No usable placement';
    if (!r.usable) el.style.color = 'var(--err)';
  });

  // ---------------------------------------------------------------- SVG to grid
  const file = document.getElementById('add-file');
  if (!file) return;
  const th = document.getElementById('add-th'), thLabel = document.getElementById('add-th-label');
  const preview = document.getElementById('add-preview');
  let svgText = '';

  function raster(img, threshold) {
    const px = SIZE * SAMPLE;
    const cv = document.createElement('canvas');
    cv.width = cv.height = px;
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0, px, px);
    const data = ctx.getImageData(0, 0, px, px).data;
    const rows = [];
    for (let r = 0; r < SIZE; r++) {
      let row = '';
      for (let c = 0; c < SIZE; c++) {
        let a = 0;
        for (let y = 0; y < SAMPLE; y++) for (let x = 0; x < SAMPLE; x++) a += data[((r * SAMPLE + y) * px + c * SAMPLE + x) * 4 + 3];
        row += a / (255 * SAMPLE * SAMPLE) >= threshold ? '#' : '.';
      }
      rows.push(row);
    }
    let top = 0, bottom = SIZE - 1;
    while (top < SIZE && !rows[top].includes('#')) top++;
    if (top === SIZE) return null;
    while (!rows[bottom].includes('#')) bottom--;
    const body = rows.slice(top, bottom + 1);
    let left = 0, right = SIZE - 1;
    while (body.every((row) => row[left] === '.')) left++;
    while (body.every((row) => row[right] === '.')) right--;
    return body.map((row) => row.slice(left, right + 1));
  }

  function render() {
    thLabel.textContent = (+th.value).toFixed(2);
    if (!svgText) return;
    const img = new Image();
    img.onload = () => {
      const rows = raster(img, +th.value);
      if (!rows) return;
      document.getElementById('add-rows').value = JSON.stringify(rows);
      document.getElementById('add-svg').value = svgText;
      const r = window.Mosaic.review(rows);
      preview.innerHTML = '';
      const orig = document.createElement('div');
      orig.className = 'library-svg';
      orig.appendChild(img);
      const canvas = document.createElement('canvas');
      drawGrid(canvas, rows);
      const note = document.createElement('div');
      note.className = 'small';
      note.textContent = r.usable ? `${r.puzzles} puzzle pieces, ${r.repaired} cells changed` : 'No usable placement: try another threshold or icon';
      preview.append(orig, canvas, note);
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
  }

  file.addEventListener('change', async () => {
    if (!file.files[0]) return;
    svgText = await file.files[0].text();
    // Browsers need a size to draw an SVG onto a canvas.
    if (!/<svg[^>]*\swidth=/i.test(svgText)) svgText = svgText.replace(/<svg/i, '<svg width="512" height="512"');
    render();
  });
  th.addEventListener('input', render);
})();
