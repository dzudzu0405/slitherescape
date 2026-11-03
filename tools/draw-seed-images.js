// Draws the placeholder Mosaic images from simple shapes, so the app can be built and
// tested before a licensed icon set is imported. All shapes are original.
// Usage: node tools/draw-seed-images.js   -> writes pro/library/seed.json
// Every image still has to be approved by eye in admin-library.php.
'use strict';
const fs = require('fs');
const path = require('path');

const SIZE = 18;
// Shapes use a 0-100 box. poly: [x,y,...]; circle: [cx,cy,r]; ellipse: [cx,cy,rx,ry]; cut: removes.
const poly = (...p) => ({ poly: p });
const circle = (x, y, r) => ({ ellipse: [x, y, r, r] });
const ellipse = (x, y, rx, ry) => ({ ellipse: [x, y, rx, ry] });
const cut = (s) => Object.assign({ cut: true }, s);

const IMAGES = [
  ['TREE', 'christmas', [poly(50, 2, 74, 34, 62, 34, 84, 62, 66, 62, 94, 86, 6, 86, 34, 62, 16, 62, 38, 34, 26, 34), poly(42, 86, 58, 86, 58, 99, 42, 99)], ['BELL', 'CANDLE']],
  ['BELL', 'christmas', [circle(50, 34, 26), poly(24, 34, 76, 34, 90, 78, 10, 78), circle(50, 88, 11), poly(44, 2, 56, 2, 56, 12, 44, 12)], ['TREE', 'CANDLE']],
  ['GIFT', 'christmas', [poly(8, 32, 92, 32, 92, 96, 8, 96), circle(34, 18, 15), circle(66, 18, 15), cut(circle(34, 18, 5)), cut(circle(66, 18, 5))], ['CANDLE', 'BELL']],
  ['SNOWMAN', 'christmas', [circle(50, 68, 30), circle(50, 26, 20), poly(26, 12, 74, 12, 74, 6, 26, 6), poly(34, 6, 66, 6, 66, -2, 34, -2)], ['BELL', 'CANDLE']],
  ['CANDLE', 'christmas', [poly(36, 34, 64, 34, 64, 98, 36, 98), ellipse(50, 16, 10, 16)], ['TREE', 'BELL']],
  ['GHOST', 'halloween', [circle(50, 34, 32), poly(18, 34, 82, 34, 82, 98, 67, 82, 50, 98, 33, 82, 18, 98), cut(ellipse(38, 32, 6, 8)), cut(ellipse(62, 32, 6, 8))], ['PUMPKIN', 'TOMBSTONE']],
  ['PUMPKIN', 'halloween', [ellipse(50, 58, 46, 38), poly(44, 22, 56, 22, 62, 4, 50, 4), cut(poly(26, 46, 40, 46, 33, 34)), cut(poly(60, 46, 74, 46, 67, 34)), cut(poly(30, 68, 70, 68, 60, 80, 40, 80))], ['GHOST', 'TOMBSTONE']],
  ['BAT', 'halloween', [poly(50, 30, 42, 18, 40, 34, 16, 18, 2, 40, 10, 72, 22, 56, 36, 76, 50, 58, 64, 76, 78, 56, 90, 72, 98, 40, 84, 18, 60, 34, 58, 18)], ['GHOST', 'WITCHHAT']],
  ['WITCHHAT', 'halloween', [poly(52, 2, 74, 74, 26, 74), ellipse(50, 80, 48, 13)], ['TOMBSTONE', 'PUMPKIN']],
  ['TOMBSTONE', 'halloween', [circle(50, 34, 32), poly(18, 34, 82, 34, 82, 88, 18, 88), poly(6, 86, 94, 86, 94, 99, 6, 99)], ['GHOST', 'WITCHHAT']],
  ['ANCHOR', 'pirates', [circle(50, 13, 12), poly(44, 22, 56, 22, 56, 84, 44, 84), poly(26, 32, 74, 32, 74, 42, 26, 42), poly(6, 54, 20, 54, 44, 82, 56, 82, 80, 54, 94, 54, 88, 76, 58, 98, 42, 98, 12, 76), cut(circle(50, 13, 5))], ['SWORD', 'KEY']],
  ['SHIP', 'pirates', [poly(6, 62, 94, 62, 80, 94, 20, 94), poly(46, 4, 54, 4, 54, 62, 46, 62), poly(54, 10, 88, 54, 54, 54), poly(46, 18, 46, 54, 18, 54)], ['ANCHOR', 'SWORD']],
  ['SWORD', 'pirates', [poly(44, 2, 56, 2, 58, 66, 42, 66), poly(22, 64, 78, 64, 78, 74, 22, 74), poly(44, 74, 56, 74, 56, 90, 44, 90), circle(50, 93, 7)], ['ANCHOR', 'KEY']],
  ['KEY', 'pirates', [circle(50, 22, 22), cut(circle(50, 22, 9)), poly(44, 42, 56, 42, 56, 98, 44, 98), poly(56, 70, 76, 70, 76, 80, 56, 80), poly(56, 86, 70, 86, 70, 96, 56, 96)], ['SWORD', 'ANCHOR']],
  ['PARROT', 'pirates', [circle(48, 26, 22), poly(66, 18, 90, 34, 66, 40), poly(28, 34, 68, 40, 58, 78, 34, 78), poly(38, 76, 54, 76, 50, 99, 36, 99)], ['SHIP', 'KEY']],
  ['ROCKET', 'space', [ellipse(50, 40, 20, 38), poly(30, 58, 10, 88, 32, 78), poly(70, 58, 90, 88, 68, 78), poly(38, 78, 62, 78, 56, 98, 44, 98), cut(circle(50, 34, 8))], ['UFO', 'PLANET']],
  ['PLANET', 'space', [circle(50, 50, 30), poly(2, 74, 94, 18, 98, 28, 6, 84)], ['MOON', 'STAR']],
  ['MOON', 'space', [circle(46, 50, 44), cut(circle(66, 40, 36))], ['PLANET', 'STAR']],
  ['STAR', 'space', [poly(50, 2, 62, 36, 98, 38, 69, 60, 80, 96, 50, 75, 20, 96, 31, 60, 2, 38, 38, 36)], ['PLANET', 'MOON']],
  ['UFO', 'space', [ellipse(50, 58, 48, 16), ellipse(50, 42, 22, 24), poly(30, 72, 40, 72, 30, 96, 20, 96), poly(60, 72, 70, 72, 80, 96, 70, 96)], ['ROCKET', 'PLANET']],
  ['CROWN', 'wizard', [poly(6, 22, 28, 52, 50, 10, 72, 52, 94, 22, 86, 88, 14, 88)], ['CASTLE', 'SHIELD']],
  ['CASTLE', 'wizard', [poly(6, 96, 6, 12, 20, 12, 20, 26, 32, 26, 32, 12, 46, 12, 46, 26, 54, 26, 54, 12, 68, 12, 68, 26, 80, 26, 80, 12, 94, 12, 94, 96, 62, 96, 62, 66, 38, 66, 38, 96)], ['CROWN', 'SHIELD']],
  ['SHIELD', 'wizard', [poly(10, 8, 90, 8, 90, 50, 76, 76, 50, 98, 24, 76, 10, 50)], ['CROWN', 'CASTLE']],
  ['MUSHROOM', 'wizard', [ellipse(50, 42, 46, 36), cut(poly(0, 46, 100, 46, 100, 100, 0, 100)), poly(36, 44, 64, 44, 70, 96, 30, 96)], ['SHIELD', 'CROWN']],
  ['POTION', 'wizard', [circle(50, 66, 32), poly(40, 8, 60, 8, 60, 44, 40, 44), poly(34, 4, 66, 4, 66, 12, 34, 12)], ['MUSHROOM', 'CROWN']]
];

function inShape(s, x, y) {
  if (s.ellipse) {
    const [cx, cy, rx, ry] = s.ellipse;
    return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  }
  const p = s.poly;
  let hit = false;
  for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
    if ((p[i + 1] > y) !== (p[j + 1] > y) && x < ((p[j] - p[i]) * (y - p[i + 1])) / (p[j + 1] - p[i + 1]) + p[i]) hit = !hit;
  }
  return hit;
}

// Averages 5x5 samples per cell, then applies the 0.45 threshold from the spec.
function raster(shapes) {
  const rows = [];
  for (let r = 0; r < SIZE; r++) {
    let row = '';
    for (let c = 0; c < SIZE; c++) {
      let n = 0;
      for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) {
        const x = ((c + (a + 0.5) / 5) / SIZE) * 100, y = ((r + (b + 0.5) / 5) / SIZE) * 100;
        let on = false;
        shapes.forEach((s) => { if (inShape(s, x, y)) on = !s.cut; });
        if (on) n++;
      }
      row += n / 25 >= 0.45 ? '#' : '.';
    }
    rows.push(row);
  }
  // Crop to the bounding box.
  let top = 0, bottom = rows.length - 1;
  while (!rows[top].includes('#')) top++;
  while (!rows[bottom].includes('#')) bottom--;
  const body = rows.slice(top, bottom + 1);
  let left = 0, right = SIZE - 1;
  while (body.every((row) => row[left] === '.')) left++;
  while (body.every((row) => row[right] === '.')) right--;
  return body.map((row) => row.slice(left, right + 1));
}

const out = IMAGES.map(([name, theme, shapes, similar]) => ({ name, theme, similar, source: 'SlitherEscape original placeholder', rows: raster(shapes) }));
const file = path.join(__dirname, '..', 'pro', 'library', 'seed.json');
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(out, null, 1));
console.log(`${out.length} images -> ${file}`);
