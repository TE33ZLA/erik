/* Screenshots of the pictures in lessons, for checking them by eye.
 * Usage: node tools/lesson-pics.js <pack> [lessonId] [--out dir] [--all]
 *   Writes <out>/<lesson>-c<card>-desk.png (1100 px wide, light) and -phone.png (390 px, dark) for every card with a picture
 *   (with --all, every learn/recap card, so you can see which ones still lack one). Needs Playwright
 *   (set NODE_PATH if it is installed elsewhere, and CHROMIUM=/path/to/chrome to pick a browser).
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const packId = args[0];
const lessonId = args[1] && !args[1].startsWith('--') ? args[1] : null;
const outIx = args.indexOf('--out');
const OUT = outIx >= 0 ? args[outIx + 1] : path.join(ROOT, 'tmp-pics');
const ALL = args.includes('--all');
if (!packId) { console.log('usage: node tools/lesson-pics.js <pack> [lessonId] [--out dir] [--all]'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' };
function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(res);
    });
    srv.listen(0, () => resolve(srv));
  });
}
(async () => {
  const srv = await serve();
  const port = srv.address().port;
  let exe = process.env.CHROMIUM;
  if (!exe && fs.existsSync('/opt/pw-browsers')) { const d = fs.readdirSync('/opt/pw-browsers').find((x) => x.startsWith('chromium-')); if (d) exe = `/opt/pw-browsers/${d}/chrome-linux/chrome`; }
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const errors = [];
  for (const [mode, W, scheme] of [['desk', 1100, 'light'], ['phone', 390, 'dark']]) {
    const page = await (await browser.newContext({ viewport: { width: W, height: 900 }, colorScheme: scheme })).newPage();
    page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
    await page.route('**/*', (route) => {
      const u = route.request().url();
      if (u.includes('katex@0.18.9/dist/katex.min.js')) return route.fulfill({ path: ROOT + '/node_modules/katex/dist/katex.min.js', contentType: 'application/javascript' });
      if (u.includes('canvas-confetti')) return route.fulfill({ path: ROOT + '/node_modules/canvas-confetti/dist/confetti.browser.js', contentType: 'application/javascript' });
      if (u.startsWith('https://fonts.')) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
      if (u.startsWith('http://localhost')) return route.continue();
      return route.abort();
    });
    await page.goto(`http://localhost:${port}/index.html`);
    await page.waitForTimeout(500);
    const ids = await page.evaluate(({ packId, lessonId, ALL }) => {
      const s = GAME.store.state; s.name = 'Erik'; s.started = true; s.settings.sound = false; GAME.applySettings(); GAME.go('tower');
      const pack = PACKS.find((p) => p.id === packId);
      const esc = RENDER.esc;
      const rich = (t) => RENDER.rich(t || '', { highlight: false });
      const out = [];
      let html = '<section class="lesson" style="--floor:' + pack.color + '">';
      Object.entries(pack.lessons || {}).forEach(([lid, L]) => {
        if (lessonId && lid !== lessonId) return;
        const keyV = (L.cards.find((k) => k.viz && [].concat(k.viz).some((v) => v && v.key)) || L.cards.find((k) => k.viz) || {}).viz;
        L.cards.forEach((c, i) => {
          const v = c.viz || (c.kind === 'recap' ? keyV : null);
          if (!v && !(ALL && (c.kind === 'learn' || c.kind === 'recap'))) return;
          const id = `${lid}-c${i}`;
          out.push(id);
          html += `<article class="lcard ${c.kind}" id="${id}"><p class="lkind">${esc(lid)} · card ${i} · ${esc(c.kind)}${c.viz ? '' : c.kind === 'recap' && v ? ' (key picture)' : ' · NO PICTURE'}</p>${c.title ? `<h2>${rich(c.title)}</h2>` : ''}${(c.body || '').split(/\n\s*\n/).map((p) => `<p>${rich(p)}</p>`).join('')}${v ? VIZ.render(v) : ''}${c.points ? `<ul class="lpoints">${c.points.map((p) => `<li>${rich(p)}</li>`).join('')}</ul>` : ''}</article>`;
        });
      });
      document.getElementById('screen').innerHTML = html + '</section>';
      return out;
    }, { packId, lessonId, ALL });
    await page.waitForTimeout(500);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    if (wide) errors.push(`${mode}: the page is wider than the screen`);
    for (const id of ids) {
      const el = await page.$('#' + id);
      await el.screenshot({ path: path.join(OUT, `${id}-${mode}.png`) });
    }
    console.log(`${mode}: ${ids.length} cards -> ${OUT}`);
  }
  console.log(errors.length ? errors.join('\n') : 'no page errors');
  await browser.close();
  srv.close();
})();
