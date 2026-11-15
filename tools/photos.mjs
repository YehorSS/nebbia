// Web sizes and credits for the chosen photographs. Originals (full resolution from Wikimedia Commons) are in orig/,
// their credits in assets/credits.json (written by the design skill's assets.mjs --get). node tools/photos.mjs
import sharp from 'sharp';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const OUT = 'public/photos';
mkdirSync(OUT, { recursive: true });
// name: [file, crop?] — the fog street loses its right edge, where a petrol station sign stands
const PICK = {
  fog: ['nebbia-notturna-a-milano', { left: 0, top: 0, width: 2260, height: 1456 }],
  gasometro: ['gasometro-bovisa'],
  yard: ['milan-bovisa'],
  board: ['tabellone-bovisa'],
  platform: ['stazione-di-milano-nord-bovisa-1'],
  park: ['parco-sempione04'],
};
const credits = JSON.parse(readFileSync('assets/credits.json', 'utf8'));
const list = [];
for (const [name, [file, crop]] of Object.entries(PICK)) {
  const c = credits.find(x => x.file === `assets/${file}.jpg`);
  if (!c) throw new Error(`no credit for ${file}`);
  const src = () => { const s = sharp(`orig/${file}.jpg`).rotate(); return crop ? s.extract(crop) : s; };
  const { width, height } = crop ?? await sharp(`orig/${file}.jpg`).metadata();
  // the author's rule: high-resolution sources, 960/1600/2560 widths, quality 82–88
  for (const w of [960, 1600, 2560]) await src().resize({ width: Math.min(w, width), withoutEnlargement: true }).webp({ quality: 84 }).toFile(`${OUT}/${name}-${w}.webp`);
  list.push({ name, w: width, h: height, creator: c.creator, license: c.license, page: c.page });
}
writeFileSync('src/photos.json', JSON.stringify(list, null, 1));
console.log(list.map(l => `${l.name} ${l.w}×${l.h}: ${l.creator} · ${l.license}`).join('\n'));
