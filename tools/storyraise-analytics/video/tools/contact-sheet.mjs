// Tile snapshot frames into one labeled contact sheet for storyboard review.
//
//   node video/tools/contact-sheet.mjs [snapshots-dir] [out.png]
//
// Reads every PNG in the directory (sorted by the timestamp in its name), scales
// each to 640x360, stamps its time and scene title, and writes a 3-column grid.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { TOOLS_DIR } from '../../scripts/lib/identity.mjs';

const VIDEO = path.join(TOOLS_DIR, 'video');
const dir = path.resolve(process.argv[2] || path.join(VIDEO, 'snapshots'));
const out = path.resolve(process.argv[3] || path.join(TOOLS_DIR, '.cache', 'contact-sheet.png'));
const timeline = JSON.parse(fs.readFileSync(path.join(VIDEO, 'timeline.json'), 'utf8'));

const W = 640;
const H = 360;
const GAP = 16;
const COLS = 3;
const LABEL = 44;

const timeOf = (file) => {
    const m = file.match(/(\d+(?:\.\d+)?)s?\.png$/) || file.match(/(\d+(?:[._]\d+)?)/);
    return m ? Number(m[1].replace('_', '.')) : 0;
};
const sceneAt = (t) => [...timeline.scenes].reverse().find((s) => s.start <= t) || timeline.scenes[0];
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort((a, b) => timeOf(a) - timeOf(b));
if (!files.length) throw new Error(`no PNG snapshots in ${dir}`);

const rows = Math.ceil(files.length / COLS);
const sheetW = COLS * W + (COLS + 1) * GAP;
const sheetH = rows * (H + LABEL) + (rows + 1) * GAP;

const tiles = await Promise.all(files.map(async (file, i) => {
    const t = timeOf(file);
    const scene = sceneAt(t);
    const label = Buffer.from(`<svg width="${W}" height="${LABEL}" xmlns="http://www.w3.org/2000/svg">
      <text x="4" y="30" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#e9e2f5">${t.toFixed(1)}s  ${esc(scene.id)}  ${esc(scene.title)}</text></svg>`);
    const image = await sharp(path.join(dir, file)).resize(W, H).png().toBuffer();
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const left = GAP + col * (W + GAP);
    const top = GAP + row * (H + LABEL + GAP);
    return [{ input: label, left, top }, { input: image, left, top: top + LABEL }];
}));

fs.mkdirSync(path.dirname(out), { recursive: true });
await sharp({ create: { width: sheetW, height: sheetH, channels: 3, background: '#0b0910' } })
    .composite(tiles.flat())
    .png()
    .toFile(out);
console.log(`${files.length} frames -> ${out}`);
