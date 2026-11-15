// Full-page snapshots at 1440 and 390 in Italian and English, with a plan loaded from a share link;
// fails on console errors or sideways scroll. PW_FROM=<a package.json that has playwright> node scripts/shots.mjs <dir>
import { createRequire } from 'module';
import { spawn } from 'child_process';
import { mkdirSync } from 'fs';

const require = createRequire(process.env.PW_FROM ?? import.meta.url);
const { chromium } = require('playwright');
const out = process.argv[2] ?? 'shots';
mkdirSync(out, { recursive: true });
const PLAN = process.env.PLAN ?? 'sab5,sab2,sab9,sab3';
const server = spawn('npx', ['vite', 'preview', '--port', '5198', '--strictPort'], { shell: true, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
const browser = await chromium.launch();
const problems = [];
try {
  for (const lang of (process.env.LANGS ?? 'it,en').split(',')) for (const [w, h] of [[1440, 900], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    page.on('console', m => { if (m.type() === 'error') problems.push(`${lang} ${w}: ${m.text()}`); });
    page.on('pageerror', e => problems.push(`${lang} ${w}: ${e.message}`));
    await page.addInitScript(l => { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); localStorage.setItem('nebbia-lang', l); sessionStorage.setItem('seeded', '1'); } }, lang);
    await page.goto(`http://localhost:5198/nebbia/#piano=${PLAN}`);
    await page.waitForLoadState('networkidle');
    await page.click('[data-open="sab2"]');
    // lazy pictures load as they come into view
    for (let y = 0; y < await page.evaluate(() => document.body.scrollHeight); y += h) { await page.evaluate(v => scrollTo(0, v), y); await page.waitForTimeout(120); }
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(400);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (over > 0) problems.push(`${lang} ${w}: page scrolls sideways by ${over}px`);
    await page.screenshot({ path: `${out}/page-${w}-${lang}.png`, fullPage: true });
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
}
console.log(problems.length ? problems.join('\n') : 'clean');
process.exit(problems.length ? 1 : 0);
