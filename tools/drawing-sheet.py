# Dev helper: picture sheet of our own Mosaic drawings.
# python tools/drawing-sheet.py christmas out.png          sheet with names
# python tools/drawing-sheet.py christmas out.png key.txt  numbered in shuffled order, for a blind test
import os
import random
import sys

from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CELL, BOX, COLS = 8, 190, 5

# Several themes may be given with commas, which also hides any shared theme in a blind test.
theme, out = sys.argv[1], sys.argv[2]
key = sys.argv[3] if len(sys.argv) > 3 else None
blocks = []
for one in theme.split(','):
    with open(os.path.join(ROOT, 'pro', 'library', 'drawn', one + '.txt'), encoding='utf8') as f:
        blocks += f.read().replace('\r', '').strip().split('\n\n')
COLS = max(COLS, round(len(blocks) ** 0.5))
items = [(b.split('\n')[0].split('|')[0].strip(), b.split('\n')[1:]) for b in blocks]
if key:
    random.Random(theme).shuffle(items)
    with open(key, 'w', encoding='utf8') as f:
        f.write('\n'.join(f'{i + 1} {name}' for i, (name, _) in enumerate(items)) + '\n')

rows = (len(items) + COLS - 1) // COLS
sheet = Image.new('RGB', (COLS * BOX, rows * BOX), (255, 252, 246))
d = ImageDraw.Draw(sheet)
for k, (name, grid) in enumerate(items):
    x0, y0 = (k % COLS) * BOX, (k // COLS) * BOX
    ox, oy = x0 + (BOX - len(grid[0]) * CELL) // 2, y0 + 4 + (166 - len(grid) * CELL) // 2
    for y, row in enumerate(grid):
        for x, ch in enumerate(row):
            if ch == '#':
                d.rectangle([ox + x * CELL, oy + y * CELL, ox + (x + 1) * CELL - 1, oy + (y + 1) * CELL - 1], fill=(59, 36, 18))
    d.text((x0 + 8, y0 + BOX - 16), str(k + 1) if key else name, fill=(122, 46, 30))
sheet.save(out)
print(out, sheet.size)
