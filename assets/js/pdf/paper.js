// Aged-paper backgrounds drawn on a canvas (spec section 7): uneven blotchy colour,
// darker edges and corners, yellow stains, fold lines and crumple creases.
// Generated in the browser, so no texture files need a commercial licence.
(function (root) {
  'use strict';

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Smooth blotches: random values on a coarse grid, scaled up with smoothing.
  function blotches(ctx, w, h, cells, r, dark, light, alpha) {
    const gw = cells, gh = Math.max(2, Math.round(cells * h / w));
    const small = document.createElement('canvas');
    small.width = gw; small.height = gh;
    const sctx = small.getContext('2d');
    const img = sctx.createImageData(gw, gh);
    for (let i = 0; i < gw * gh; i++) {
      const v = r();
      const c = v < 0.5 ? dark : light;
      img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2];
      img.data[i * 4 + 3] = Math.round(Math.abs(v - 0.5) * 2 * 255 * alpha);
    }
    sctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(small, 0, 0, w, h);
  }

  function crease(ctx, x0, y0, x1, y1, strength, s) {
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len * 2.2 * s, ny = dx / len * 2.2 * s;
    ctx.save();
    ctx.filter = `blur(${1.6 * s}px)`;
    ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(95, 62, 25, ${0.22 * strength})`;
    ctx.lineWidth = 3.2 * s;
    ctx.beginPath(); ctx.moveTo(x0 + nx, y0 + ny); ctx.lineTo(x1 + nx, y1 + ny); ctx.stroke();
    ctx.strokeStyle = `rgba(255, 250, 235, ${0.45 * strength})`;
    ctx.lineWidth = 2.2 * s;
    ctx.beginPath(); ctx.moveTo(x0 - nx * 0.6, y0 - ny * 0.6); ctx.lineTo(x1 - nx * 0.6, y1 - ny * 0.6); ctx.stroke();
    ctx.restore();
  }

  // Returns a JPEG data URL. `w`,`h` in pixels; `seed` makes each page different.
  function texture(w, h, seed) {
    const r = rng(seed);
    const s = w / 1000; // scale factor for line widths
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');

    ctx.fillStyle = '#EEDDBA';
    ctx.fillRect(0, 0, w, h);

    // Uneven colour at three scales.
    blotches(ctx, w, h, 5, r, [176, 132, 74], [250, 240, 214], 0.30);
    blotches(ctx, w, h, 14, r, [186, 142, 82], [252, 244, 222], 0.22);
    blotches(ctx, w, h, 42, r, [170, 128, 72], [250, 242, 220], 0.10);

    // Yellow-brown stains: soft, irregular blobs (a wobbly outline, heavily blurred) with a
    // faint, broken tide line, so they read as water marks rather than circles.
    const stains = 3 + Math.floor(r() * 4);
    for (let i = 0; i < stains; i++) {
      const x = r() * w, y = r() * h, rad = (50 + r() * 150) * s;
      const pts = 28, phase = [r() * 6, r() * 6, r() * 6];
      const shape = () => {
        ctx.beginPath();
        for (let k = 0; k <= pts; k++) {
          const a = (k / pts) * Math.PI * 2;
          const wob = 1 + 0.16 * Math.sin(a * 2 + phase[0]) + 0.1 * Math.sin(a * 3 + phase[1]) + 0.06 * Math.sin(a * 5 + phase[2]);
          const px = x + Math.cos(a) * rad * wob, py = y + Math.sin(a) * rad * wob * 0.85;
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
      };
      ctx.save();
      ctx.filter = `blur(${14 * s}px)`;
      ctx.fillStyle = `rgba(190, 142, 64, ${0.10 + r() * 0.08})`;
      shape(); ctx.fill();
      ctx.filter = `blur(${3 * s}px)`;
      ctx.strokeStyle = `rgba(150, 102, 42, ${0.08 + r() * 0.08})`;
      ctx.lineWidth = 3 * s;
      ctx.setLineDash([rad * 0.6, rad * 0.25]);
      shape(); ctx.stroke();
      ctx.restore();
    }

    // Fold lines: one across, sometimes one down.
    crease(ctx, 0, h * (0.45 + r() * 0.1), w, h * (0.45 + r() * 0.1), 1, s);
    if (r() < 0.6) crease(ctx, w * (0.45 + r() * 0.1), 0, w * (0.45 + r() * 0.1), h, 0.8, s);

    // Crumple creases: short wandering polylines.
    const creases = 18 + Math.floor(r() * 14);
    for (let i = 0; i < creases; i++) {
      let x = r() * w, y = r() * h;
      let ang = r() * Math.PI * 2;
      const segs = 2 + Math.floor(r() * 4);
      const str = 0.25 + r() * 0.45;
      for (let k = 0; k < segs; k++) {
        const len = (40 + r() * 140) * s;
        ang += (r() - 0.5) * 1.2;
        const nx = x + Math.cos(ang) * len, ny = y + Math.sin(ang) * len;
        crease(ctx, x, y, nx, ny, str, s * 0.7);
        x = nx; y = ny;
      }
    }

    // Grain.
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (r() - 0.5) * 14;
      d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.8;
    }
    ctx.putImageData(img, 0, 0);

    // Darker edges and corners.
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.56);
    vg.addColorStop(0, 'rgba(120, 80, 35, 0)');
    vg.addColorStop(1, 'rgba(120, 80, 35, 0.38)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
    const edge = 26 * s;
    [[0, 0, w, edge, 0, 0, 0, edge], [0, h - edge, w, edge, 0, h, 0, h - edge], [0, 0, edge, h, 0, 0, edge, 0], [w - edge, 0, edge, h, w, 0, w - edge, 0]]
      .forEach(([x, y, ww, hh, gx0, gy0, gx1, gy1]) => {
        const g = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
        g.addColorStop(0, 'rgba(110, 70, 30, 0.30)');
        g.addColorStop(1, 'rgba(110, 70, 30, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, ww, hh);
      });

    return cv.toDataURL('image/jpeg', 0.82);
  }

  root.Paper = { texture };
})(typeof self !== 'undefined' ? self : globalThis);
