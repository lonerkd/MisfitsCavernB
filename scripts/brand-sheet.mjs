#!/usr/bin/env node
// The brand concept sheet: every candidate mark in .cavern-intelligence/brand/
// concepts/*.svg on the Cavern and Paper themes, as an iPhone icon, at
// favicon size and in the landing lockup, rendered with the app's own fonts.
//
//   node scripts/brand-sheet.mjs   → .cavern-intelligence/brand/concepts/sheet.png
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
  .replace(/id="(c2?)"/g, `id="$1${id}"`).replace(/url\(#(c2?)\)/g, `url(#$1${id})`)
  .replaceAll('#e0ddae', 'var(--lit)').replaceAll('#e8431a', 'var(--shade)')
  .replace('<svg ', '<svg class="m" ');
const marks = [['peaks', 'A · Peaks — the M', 'Two peaks; light from the upper left, the turned-away faces in sinopia shadow, a long cast shadow.'],
               ['moon', 'B · Moon crest — the C', 'A crescent opening right is the C; one sinopia star.'],
               ['moon-peaks', 'C · Moon over peaks — C + M', 'Both: the crescent C with the lit peaks rising inside it.']];
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
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
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
.night{--lit:#e0ddae;--shade:#e8431a;background:#040710}
.paper{--lit:#1f1a14;--shade:#b3361a;background:#f6f1e7}
.sin{--lit:#040710;--shade:#f6f1e7;background:#e8431a}
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
<h1>THE CAVERN — MARK CONCEPTS</h1>
<div class="sub">CAVERN THEME (NIGHT INK · VANILLA · SINOPIA) · PAPER THEME · IPHONE ICON (DARK / SINOPIA) · FAVICON · LANDING LOCKUP · 2026-10-06</div>
<main>${marks.map(col).join('')}</main></body></html>`;
const b = await chromium.launch(process.env.MC_LOCAL_CHROMIUM ? { executablePath: process.env.MC_LOCAL_CHROMIUM } : {});
const p = await b.newPage({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 1.5 });
await p.setContent(html); await p.waitForTimeout(300);
await p.screenshot({ path: `${dir}/sheet.png`, fullPage: true });
await b.close();
console.log('ok');
