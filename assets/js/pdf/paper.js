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

  // Detective Notebook paper: aged cream graph paper with moody dark edges, one faint
  // fingerprint in a corner, a few ink spatters and a coffee ring.
  function noir(w, h, seed) {
    const r = rng(seed);
    const s = w / 1000;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#EFE6D2';
    ctx.fillRect(0, 0, w, h);
    blotches(ctx, w, h, 5, r, [196, 172, 128], [250, 244, 230], 0.22);
    blotches(ctx, w, h, 20, r, [200, 178, 136], [252, 247, 235], 0.10);
    // Graph paper: fine squares, every fifth line a little darker.
    const step = 30 * s;
    for (let k = 0, x = 0; x < w; k++, x += step) {
      ctx.strokeStyle = k % 5 ? 'rgba(110, 88, 58, 0.13)' : 'rgba(110, 88, 58, 0.24)';
      ctx.lineWidth = (k % 5 ? 0.9 : 1.3) * s;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let k = 0, y = 0; y < h; k++, y += step) {
      ctx.strokeStyle = k % 5 ? 'rgba(110, 88, 58, 0.13)' : 'rgba(110, 88, 58, 0.24)';
      ctx.lineWidth = (k % 5 ? 0.9 : 1.3) * s;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    // Fingerprint: broken, wobbly loops around a core, low in one corner.
    const fx = (r() < 0.5 ? 0.2 : 0.8) * w, fy = h * (0.78 + r() * 0.08);
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate((r() - 0.5) * 0.8);
    ctx.strokeStyle = 'rgba(60, 44, 30, 0.10)';
    ctx.lineWidth = 3.2 * s;
    for (let i = 1; i <= 16; i++) {
      const rx = i * 5.6 * s, ry = rx * 1.32;
      ctx.setLineDash([(18 + r() * 40) * s, (4 + r() * 9) * s]);
      ctx.beginPath();
      for (let k = 0; k <= 60; k++) {
        const a = (k / 60) * Math.PI * 2;
        const wob = 1 + 0.05 * Math.sin(a * 3 + i) + 0.03 * Math.sin(a * 7 + i * 2);
        const px = Math.cos(a) * rx * wob, py = Math.sin(a) * ry * wob - (a > Math.PI ? 0 : i * 0.6 * s);
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();
    // Ink spatters: a blot and a few droplets.
    const sx = r() * w * 0.7 + w * 0.15, sy = (r() < 0.5 ? 0.06 : 0.94) * h;
    ctx.fillStyle = 'rgba(30, 24, 20, 0.16)';
    ctx.beginPath(); ctx.arc(sx, sy, (6 + r() * 5) * s, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 9; i++) {
      const a = r() * Math.PI * 2, d = (14 + r() * 40) * s;
      ctx.beginPath(); ctx.arc(sx + Math.cos(a) * d, sy + Math.sin(a) * d, (0.8 + r() * 2.4) * s, 0, Math.PI * 2); ctx.fill();
    }
    // Coffee ring, opposite corner to the fingerprint.
    const cx = fx < w / 2 ? 0.8 * w : 0.2 * w, cy = h * 0.14, rad = (62 + r() * 20) * s;
    ctx.save();
    ctx.filter = `blur(${2 * s}px)`;
    ctx.strokeStyle = 'rgba(120, 78, 34, 0.12)';
    ctx.lineWidth = 6 * s;
    ctx.setLineDash([rad * 1.7, rad * 0.3]);
    ctx.beginPath(); ctx.arc(cx, cy, rad, r() * 6, r() * 6 + Math.PI * 1.85); ctx.stroke();
    ctx.restore();
    // Grain and dark edges.
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 12; d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.8; }
    ctx.putImageData(img, 0, 0);
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.hypot(w, h) * 0.56);
    vg.addColorStop(0, 'rgba(50, 36, 22, 0)');
    vg.addColorStop(1, 'rgba(50, 36, 22, 0.42)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
    return cv.toDataURL('image/jpeg', 0.84);
  }

  // Draws a motif (paths in a 32x32 box, as in the PDF builder) centred at (x, y).
  function motifPath(ctx, m, x, y, size, rot) {
    const k = size / 32;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.translate(-size / 2, -size / 2);
    const run = (cmds, fill) => {
      ctx.beginPath();
      for (const c of cmds) {
        if (c[0] === 'M') ctx.moveTo(c[1] * k, c[2] * k);
        else if (c[0] === 'L') ctx.lineTo(c[1] * k, c[2] * k);
        else if (c[0] === 'C') ctx.bezierCurveTo(c[1] * k, c[2] * k, c[3] * k, c[4] * k, c[5] * k, c[6] * k);
        else if (c[0] === 'Z') ctx.closePath();
        else if (c[0] === 'O') { ctx.moveTo((c[1] + c[3]) * k, c[2] * k); ctx.arc(c[1] * k, c[2] * k, c[3] * k, 0, Math.PI * 2); }
      }
      if (fill) ctx.fill(); else ctx.stroke();
    };
    if (m.fill) run(m.fill, true);
    run(m.stroke, false);
    ctx.restore();
  }

  // Seasonal style: a pale wash of the theme colour, soft light and dark patches, and the game's
  // motif scattered over the page in two sizes, rotated at random, like faint gift wrap.
  function seasonal(w, h, seed, look) {
    const r = rng(seed);
    const s = w / 1000;
    const [tr, tg, tb] = look.tint || [214, 190, 150];
    const shade = (t, a) => `rgba(${Math.round(tr * t)}, ${Math.round(tg * t)}, ${Math.round(tb * t)}, ${a})`;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    // Pale base: the tint mixed far towards white.
    const base = [tr, tg, tb].map((v) => Math.round(v * 0.09 + 255 * 0.91));
    ctx.fillStyle = `rgb(${base.join(',')})`;
    ctx.fillRect(0, 0, w, h);
    blotches(ctx, w, h, 5, r, [tr, tg, tb], [255, 255, 255], 0.05);
    // Scattered motifs on a jittered grid, so they never clump or leave big holes.
    const shapes = look.motifs || (look.motif ? [look.motif] : []);
    if (shapes.length) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const step = 118 * s;
      for (let gy = -0.5; gy * step < h + step; gy++) {
        for (let gx = -0.5; gx * step < w + step; gx++) {
          const off = (Math.round(gy) % 2) * step / 2;
          const x = gx * step + off + (r() - 0.5) * step * 0.5;
          const y = gy * step + (r() - 0.5) * step * 0.5;
          const big = r() < 0.45;
          const size = (big ? 46 + r() * 18 : 22 + r() * 10) * s;
          ctx.strokeStyle = shade(0.7, big ? 0.22 : 0.17);
          ctx.fillStyle = shade(0.7, big ? 0.12 : 0.09);
          ctx.lineWidth = Math.max(1, size / 18);
          motifPath(ctx, shapes[Math.floor(r() * shapes.length)], x, y, size, (r() - 0.5) * 1.2);
          // A tiny dot between motifs.
          if (r() < 0.7) {
            ctx.beginPath();
            ctx.arc(x + step * 0.5, y + step * 0.32, (2 + r() * 2) * s, 0, Math.PI * 2);
            ctx.fillStyle = shade(0.62, 0.14);
            ctx.fill();
          }
        }
      }
    }
    // Light grain and a gentle darker edge in the theme colour.
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 6; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    ctx.putImageData(img, 0, 0);
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.hypot(w, h) * 0.58);
    vg.addColorStop(0, shade(0.7, 0));
    vg.addColorStop(1, shade(0.7, 0.10));
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
    return cv.toDataURL('image/jpeg', 0.86);
  }

  // Returns a JPEG data URL. `w`,`h` in pixels; `seed` makes each page different.
  // look: { kind: 'aged' | 'seasonal' | 'noir', tint: [r, g, b], motifs: [...] } (tint, motifs: seasonal).
  function texture(w, h, seed, look = {}) {
    if (look.kind === 'noir') return noir(w, h, seed);
    if (look.kind === 'seasonal') return seasonal(w, h, seed, look);
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
