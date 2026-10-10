#!/usr/bin/env node
// Exports the chosen mark (.cavern-intelligence/brand/mark/*.svg) as the
// icon files the app and the iPhone need, on the night-ink ground:
//
//   node scripts/brand-export.mjs   → .cavern-intelligence/brand/mark/export/
//
// apple-touch-icon (180, the full mark), icon-192 / icon-512 (manifest),
// icon-maskable-512 (Android's safe zone), favicon-32 / -16 and favicon.svg
// (the small cut). Opaque squares — iOS rounds the corners itself.
//
// Also the iPhone launch screens, straight into public/splash/ (one per
// screen in lib/pwa/splash-devices.json): the mark centred on night ink.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const dir = '.cavern-intelligence/brand/mark';
const out = `${dir}/export`;
const INK = '#040710';
mkdirSync(out, { recursive: true });

// A mark placed on a square ground: `scale` is the share of the side it fills.
const onGround = (file, size, scale, radius = 0) => {
  const src = readFileSync(`${dir}/${file}.svg`, 'utf8');
  const viewBox = src.match(/viewBox="([^"]+)"/)[1];
  const inner = src.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<title>.*?<\/title>/, '');
  const side = size * scale, off = (size - side) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${INK}"/>
  <svg x="${off}" y="${off}" width="${side}" height="${side}" viewBox="${viewBox}">${inner}</svg>
</svg>`;
};
const png = (svg, name) => sharp(Buffer.from(svg)).png().toFile(`${out}/${name}.png`);

await png(onGround('the-cavern-mark', 180, 0.8), 'apple-touch-icon');
await png(onGround('the-cavern-mark', 192, 0.8), 'icon-192');
await png(onGround('the-cavern-mark', 512, 0.8), 'icon-512');
await png(onGround('the-cavern-mark', 512, 0.62), 'icon-maskable-512');
await png(onGround('the-cavern-mark-small', 32, 0.94, 6), 'favicon-32');
await png(onGround('the-cavern-mark-small', 16, 0.98, 3), 'favicon-16');
writeFileSync(`${out}/favicon.svg`, onGround('the-cavern-mark-small', 64, 0.94, 12) + '\n');
// Launch screens: the mark at a third of the short side, a little above centre.
const splashDir = 'public/splash';
mkdirSync(splashDir, { recursive: true });
const devices = JSON.parse(readFileSync('lib/pwa/splash-devices.json', 'utf8'));
const mark = readFileSync(`${dir}/the-cavern-mark.svg`, 'utf8');
const markBox = mark.match(/viewBox="([^"]+)"/)[1];
const markInner = mark.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<title>.*?<\/title>/, '');
for (const d of devices) {
  const w = d.width * d.ratio, h = d.height * d.ratio, side = Math.round(w / 3);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${INK}"/><svg x="${(w - side) / 2}" y="${Math.round(h * 0.42 - side / 2)}" width="${side}" height="${side}" viewBox="${markBox}">${markInner}</svg></svg>`;
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toFile(`${splashDir}/splash-${w}x${h}.png`);
}
console.log(`public/splash: ${devices.length} launch screens`);
console.log(`${out}: apple-touch-icon, icon-192, icon-512, icon-maskable-512, favicon-32, favicon-16, favicon.svg`);
