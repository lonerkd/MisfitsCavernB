#!/usr/bin/env node
// Exports the chosen mark (.cavern-intelligence/brand/mark/*.svg) as the
// icon files the app and the iPhone need, on the night-ink ground:
//
//   node scripts/brand-export.mjs   → .cavern-intelligence/brand/mark/export/
//
// apple-touch-icon (180, the full mark), icon-192 / icon-512 (manifest),
// icon-maskable-512 (Android's safe zone), favicon-32 / -16 and favicon.svg
// (the small cut). Opaque squares — iOS rounds the corners itself.
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
console.log(`${out}: apple-touch-icon, icon-192, icon-512, icon-maskable-512, favicon-32, favicon-16, favicon.svg`);
