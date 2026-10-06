#!/usr/bin/env node
// The brand concept sheet: every candidate mark in .cavern-intelligence/brand/
// concepts/*.svg on the Cavern and Paper themes, as an iPhone icon, at
// favicon size and in the landing lockup, rendered with the app's own fonts.
//
//   node scripts/brand-sheet.mjs   → .cavern-intelligence/brand/concepts/<sheet>.png
//                                     (final.png: the chosen mark · sheet.png: round one · rockies.png: two · rockies-3.png: three · rockies-4.png: four · rockies-5.png: five)
//
// MC_LOCAL_CHROMIUM points at a Chromium when Playwright's own isn't installed.
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
const dir = '.cavern-intelligence/brand/concepts';
const font = readFileSync('app/fonts/bebas-neue-latin-400-normal.woff2').toString('base64');
const mono = readFileSync('app/fonts/dm-mono-latin-400-normal.woff2').toString('base64');
const serif = readFileSync('app/fonts/cormorant-garamond-latin-300-italic.woff2').toString('base64');
// Inline each mark with themeable fills: vanilla → --lit, sinopia → --shade.
const mark = (f, id) => readFileSync(`${dir}/${f}.svg`, 'utf8')
  .replace(/<title>.*?<\/title>|<!--[\s\S]*?-->/g, '')
  .replace(/id="([\w-]+)"/g, `id="$1-${id}"`).replace(/url\(#([\w-]+)\)/g, `url(#$1-${id})`)
  .replaceAll('#e0ddae', 'var(--lit)').replaceAll('#e8431a', 'var(--shade)')
  .replaceAll('#c4c093', 'var(--lit2)').replaceAll('#336467', 'var(--slate)').replaceAll('#24484b', 'var(--slate2)').replaceAll('#9fb8b6', 'var(--cool)').replaceAll('#b8320f', 'var(--shade2)')
  .replaceAll('#fbf8e8', 'var(--snow)').replaceAll('#f3a184', 'var(--snowshade)').replaceAll('#040710', 'var(--ink)')
  .replace('<svg ', '<svg class="m" ');
const SHEETS = {
  final: ['THE MARK — R13', [
    ['../mark/the-cavern-mark', 'The mark', 'Assiniboine and Rundle make the M, lit by the crescent — the C. For 48 px and up.'],
    ['../mark/the-cavern-mark-small', 'The small cut', 'Two tones, no snow detail, a larger crescent: favicon, browser tab, the island (16–48 px).'],
    ['../mark/the-cavern-mark-mono', 'One colour', 'currentColor: print, embossing, stamps, any background.']]],
  sheet: ['ROUND ONE', [
    ['peaks', 'A · Peaks — the M', 'Two peaks; light from the upper left, the turned-away faces in sinopia shadow, a long cast shadow.'],
    ['moon', 'B · Moon crest — the C', 'A crescent opening right is the C; one sinopia star.'],
    ['moon-peaks', 'C · Moon over peaks — C + M', 'Both: the crescent C with the lit peaks rising inside it.']]],
  rockies: ['ROUND TWO — THE ROCKIES', [
    ['peaks-moon', 'A + moon', 'Your sketch: the peaks of A with a small crescent in the distance beside them.'],
    ['rockies-1-notch', 'R1 · Rockies, moon in the notch', 'Jagged ridgelines, snow caps, light from the upper left; the moon rises in the notch of the M, behind the ridges.'],
    ['rockies-2-rundle', 'R2 · Rundle strata', 'R1 with the tilted rock bands of the Front Ranges (Mount Rundle) and alpenglow on the shaded snow; the moon behind the right shoulder.'],
    ['rockies-3-woodcut', 'R3 · Woodcut', 'A national-park badge engraving: lit faces solid, shaded faces hatched in sinopia.'],
    ['rockies-4-foothills', 'R4 · Over the foothills', 'R2 with a line of spruce along the foothills, the way the Front Ranges rise out of the Alberta forest.']]],
  'rockies-3': ['ROUND THREE — ASSINIBOINE & RUNDLE', [
    ['rockies-5-assiniboine-rundle', 'R5 · Assiniboine & Rundle', 'A pyramid and a tilted slab make the M: lit faces in vanilla, shadows in slate, snow on the summits and the dip slope, a small sinopia moon in the sky between them.'],
    ['rockies-6-sinopia', 'R6 · Alpenglow', 'R5 with the shadows in the brand red, as alpenglow; the moon in vanilla.'],
    ['rockies-7-strata', 'R7 · Rundle strata', 'R5 with the rock bands of the slab drawn along its dip, and the moon rising behind the summit.'],
    ['rockies-8-engraved', 'R8 · Engraved', 'One colour, for print, embossing and stamps: the outline, ridges, snow and strata as lines; the moon solid.']]],
  'rockies-4': ['ROUND FOUR', [
    ['rockies-9-woodcut-foothills', 'R9 · R1 + A\'s moon + R3 + R4', 'R1\'s peaks, the moon where A had it, R3\'s woodcut shading, R4\'s spruce along the foothills.'],
    ['rockies-10-alpenglow-moon', 'R10 · Alpenglow, moon beside the summit', 'R6 as drawn, with the moon where A had it. Peaks = M, crescent = C: the old MC, hidden in the landscape.'],
    ['rockies-11-alpenglow-balanced', 'R11 · Alpenglow, balanced', 'R10 with the mountains balanced — equal summits, a gentler slab — so the M reads first.'],
    ['rockies-12-alpenglow-mc', 'R12 · Alpenglow, MC', 'R11 a little smaller, with a larger crescent rising low at its right like the next letter: M · C.']]],
  'rockies-5': ['ROUND FIVE — LIT BY THE MOON', [
    ['rockies-10-alpenglow-moon', 'R10 · Before', 'Lit from the upper left while the moon sits at the upper right — the light and its source disagree.'],
    ['rockies-13-moonlit', 'R13 · Moonlit', 'R10 relit by its own moon: the faces toward it vanilla (the pyramid\'s east face, the slab\'s cliff), the faces away in sinopia.'],
    ['rockies-14-moonlit-mc', 'R14 · Moonlit, MC', 'R13 a little smaller, the crescent larger and lower at its right like the next letter: M · C.']]],
};
let n = 0;
const col = ([f, title, note]) => `
<section>
  <h2>${title}</h2><p class="note">${note}</p>
  <div class="tile night big">${mark(f, n++)}</div>
  <div class="tile paper big">${mark(f, n++)}</div>
  <div class="row">
    <div class="ios night">${mark(f, n++)}</div>
    <div class="ios sin">${mark(f, n++)}</div>
    <div class="fav"><div class="night f32">${mark(f, n++)}</div><div class="night f16">${mark(f, n++)}</div><span>32 · 16 px</span></div>
  </div>
  <div class="hero night"><div class="lockup">${mark(f, n++)}<div><div class="word">THE CAVERN</div><div class="by">by Misfits Cavern</div></div></div>
  <div class="welcome">Welcome back, misfit.</div></div>
</section>`;
const page = (heading, marks) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Bebas;src:url(data:font/woff2;base64,${font})}
@font-face{font-family:Mono;src:url(data:font/woff2;base64,${mono})}
@font-face{font-family:Serif;font-style:italic;src:url(data:font/woff2;base64,${serif})}
*{box-sizing:border-box;margin:0}
body{background:#0a0d16;color:#e0ddae;font-family:Mono,monospace;padding:40px;width:1500px}
h1{font-family:Bebas;font-size:44px;letter-spacing:6px}
.sub{opacity:.6;font-size:12px;letter-spacing:2px;margin:6px 0 28px}
main{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}
h2{font-family:Bebas;font-size:26px;letter-spacing:3px}
.note{font-size:11px;opacity:.65;min-height:34px;margin:4px 0 12px;line-height:1.5}
.night{color:#e0ddae;--lit:#e0ddae;--shade:#e8431a;--snow:#fbf8e8;--snowshade:#f3a184;--ink:#040710;--lit2:#c4c093;--slate:#336467;--slate2:#24484b;--cool:#9fb8b6;--shade2:#b8320f;background:#040710}
.paper{color:#1f1a14;--lit:#1f1a14;--shade:#b3361a;--snow:#7d7462;--snowshade:#d9876a;--ink:#f6f1e7;--lit2:#4a4236;--slate:#336467;--slate2:#24484b;--cool:#a8bdbb;--shade2:#8a2a10;background:#f6f1e7}
.sin{color:#040710;--lit:#040710;--shade:#f6f1e7;--snow:#3a2a24;--snowshade:#fbd9cc;--ink:#e8431a;--lit2:#2a1a14;--slate:#f6f1e7;--slate2:#e9dccb;--cool:#fbe3d8;--shade2:#f0d2c4;background:#e8431a}
.tile{border-radius:14px;display:grid;place-items:center;margin-bottom:12px;border:1px solid #e0ddae1f}
.big{height:260px}.big .m{width:200px;height:200px}
.row{display:flex;gap:12px;align-items:center;margin-bottom:12px}
.ios{width:120px;height:120px;border-radius:27px;display:grid;place-items:center;box-shadow:0 6px 24px #0008}
.ios .m{width:92px;height:92px}
.fav{display:flex;gap:10px;align-items:center;font-size:10px;opacity:.9}
.f32{width:32px;height:32px;border-radius:6px;display:grid;place-items:center}.f32 .m{width:28px;height:28px}
.f16{width:16px;height:16px;border-radius:3px;display:grid;place-items:center}.f16 .m{width:15px;height:15px}
.hero{border-radius:14px;padding:26px 22px;border:1px solid #e0ddae1f}
.lockup{display:flex;align-items:center;gap:14px}.lockup .m{width:64px;height:64px;flex:none}
.word{font-family:Bebas;font-size:48px;letter-spacing:5px;line-height:.9}
.by{font-family:Serif;font-style:italic;font-size:18px;opacity:.75;margin-top:4px}
.welcome{margin-top:18px;font-family:Bebas;font-size:22px;letter-spacing:3px;color:#e8431a}
</style></head><body>
<h1>THE CAVERN — MARK CONCEPTS · ${heading}</h1>
<div class="sub">CAVERN THEME (NIGHT INK · VANILLA · SINOPIA) · PAPER THEME · IPHONE ICON (DARK / SINOPIA) · FAVICON · LANDING LOCKUP · 2026-10-06</div>
<main>${marks.map(col).join('')}</main></body></html>`;
const b = await chromium.launch(process.env.MC_LOCAL_CHROMIUM ? { executablePath: process.env.MC_LOCAL_CHROMIUM } : {});
for (const [name, [heading, marks]] of Object.entries(SHEETS)) {
  const p = await b.newPage({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 1.5 });
  await p.setContent(page(heading, marks)); await p.waitForTimeout(300);
  await p.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
  await p.close();
  console.log(`${dir}/${name}.png`);
}
await b.close();
