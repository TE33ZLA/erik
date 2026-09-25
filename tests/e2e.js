/* End-to-end check: plays every battle and mini-game on every floor in headless Chromium,
 * then renders every generator 25 times and every static question once, failing on KaTeX
 * errors, NaN/undefined text, wrong answer keys or JavaScript errors.
 * Needs Playwright:  npm i -D playwright && npx playwright install chromium
 * Run:  node tests/e2e.js            (set CHROMIUM=/path/to/chrome to use another browser)
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
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
const PAGE = process.env.PAGE || 'index.html';
(async () => {
  const srv = await serve();
  const port = srv.address().port;
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const page = await (await browser.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
  page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
  await page.route('**/*', (route) => {
    const u = route.request().url();
    if (u.includes('katex@0.18.9/dist/katex.min.js')) return route.fulfill({ path: ROOT + '/node_modules/katex/dist/katex.min.js', contentType: 'application/javascript' });
    if (u.includes('canvas-confetti')) return route.fulfill({ path: ROOT + '/node_modules/canvas-confetti/dist/confetti.browser.js', contentType: 'application/javascript' });
    if (u.startsWith('https://fonts.')) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    if (u.startsWith('http://localhost') || u.startsWith('file://')) return route.continue();
    return route.abort();
  });
  await page.goto(`http://localhost:${port}/${PAGE}`);
  await page.waitForTimeout(600);
  await page.evaluate(() => { const s = GAME.store.state; s.name = 'Bot'; s.started = true; s.settings.sound = false; s.settings.timers = 'off'; s.settings.motion = 'reduce'; GAME.applySettings(); GAME.go('tower'); });
  const packs = await page.evaluate(() => PACKS.map(p => ({ id: p.id, nodes: p.nodes.map(n => ({ id: n.id, kind: n.kind })) })));
  console.log('packs:', packs.map(p => p.id + '(' + p.nodes.length + ')').join(' '));
  const domCheck = async (where) => {
    const bad = await page.evaluate(() => {
      const z = document.querySelector('#screen');
      const out = [];
      z.querySelectorAll('.katex-error').forEach(e => out.push('katex-error: ' + (e.getAttribute('title') || e.textContent).slice(0, 140)));
      const txt = z.innerText;
      if (/\bNaN\b/.test(txt)) out.push('NaN in text: ' + txt.slice(txt.indexOf('NaN') - 60, txt.indexOf('NaN') + 20).replace(/\s+/g, ' '));
      if (/\bundefined\b/.test(txt)) out.push('undefined in text: ' + txt.slice(txt.indexOf('undefined') - 60, txt.indexOf('undefined') + 20).replace(/\s+/g, ' '));
      if (/\[object Object\]/.test(txt)) out.push('[object Object] in text');
      const plain = z.cloneNode(true); plain.querySelectorAll('.katex, code, kbd, textarea, input').forEach((k) => k.remove());
      const raw = plain.textContent.match(/.{0,40}(\\[a-zA-Z$%]|\{,\}).{0,20}/);
      if (raw) out.push('raw LaTeX in text: ' + raw[0].replace(/\s+/g, ' '));
      return out;
    });
    bad.forEach(b => errors.push(where + ' :: ' + b));
  };
  let played = 0, questions = 0;
  for (const p of packs) {
    for (const n of p.nodes) {
      if (n.kind === 'lesson') {
        await page.evaluate((id) => GAME.go('lesson', { nodeId: id }), n.id);
        await page.waitForTimeout(200);
        for (let k = 0; k < 120; k++) {
          await page.waitForTimeout(30);
          const st = await page.evaluate(() => {
            const L = LESSON.state; if (!L) return null;
            if (L.finished || L.i >= L.cards.length) return { done: true };
            const c = L.cards[L.i]; const s = L.st[L.i] || {};
            const r = { i: L.i, kind: c.kind };
            if (c.kind === 'check') { const q = s.q; r.missing = !q; r.cdone = !!s.done; r.mode = q && q.mode; r.idx = q && q.mode === 'choice' ? q.options.findIndex((o) => o.correct) : -1; r.ans = q && q.answer; }
            if (c.kind === 'guided') { r.gdone = !!s.done; const pt = c.parts[s.part || 0]; r.pchoice = !!(pt && pt.choices); r.pans = pt && pt.answer; }
            return r;
          });
          if (!st || st.done) break;
          await domCheck(n.id + ' card' + st.i);
          if (st.kind === 'check' && st.missing) { errors.push(n.id + ' card' + st.i + ' :: check question missing'); await page.evaluate(() => { const L = LESSON.state; L.st[L.i].done = true; }); }
          else if (st.kind === 'check' && !st.cdone) {
            if (st.mode === 'choice') { const opts = await page.$$('#lesson-card .opt'); if (st.idx < 0 || !opts[st.idx]) { errors.push(n.id + ' card' + st.i + ' :: no correct option'); break; } await opts[st.idx].click(); }
            else {
              await page.fill('#lesson-card #ans', String(st.ans)); await page.click('#lesson-card .numform button[type=submit]'); await page.waitForTimeout(40);
              const ok = await page.evaluate(() => { const L = LESSON.state; const s = L.st[L.i]; return !!(s.done && s.ok); });
              if (!ok) errors.push(n.id + ' card' + st.i + ' :: exact answer ' + st.ans + ' was marked wrong');
            }
            await page.waitForTimeout(40); await domCheck(n.id + ' card' + st.i + ' fb');
            questions++;
            continue;
          }
          if (st.kind === 'guided' && !st.gdone) {
            if (st.pchoice) { const opts = await page.$$('#lesson-card [data-act="lesson-part-pick"]'); await opts[st.pans].click(); }
            else { await page.fill('#lesson-card #pans', String(st.pans)); await page.click('#lesson-card .numform button[type=submit]'); }
            const bad = await page.evaluate(() => { const L = LESSON.state; const s = L.st[L.i]; const r = s.res && s.res[s.part]; return r && r.tries && !r.done ? true : false; });
            if (bad) errors.push(n.id + ' card' + st.i + ' :: guided answer ' + st.pans + ' was marked wrong');
            continue;
          }
          const nb = await page.$('#lesson-next');
          if (!nb || await nb.isDisabled()) { errors.push(n.id + ' card' + st.i + ' :: Next is disabled'); break; }
          await nb.click();
        }
        const fin = await page.evaluate(() => !!document.querySelector('#lesson-card .finish'));
        if (!fin) errors.push(n.id + ' :: lesson did not reach its finish card');
        played++;
        continue;
      }
      if (n.kind === 'mini') {
        await page.evaluate((id) => GAME.go('mini', { nodeId: id }), n.id);
        await page.waitForTimeout(150);
        await page.click('[data-act="mini-start"]');
        for (let k = 0; k < 40; k++) {
          await page.waitForTimeout(60);
          const st = await page.evaluate(() => { const M = MINIS.state; return M ? { phase: M.phase, a: M.item && M.item.a, game: M.spec.game } : null; });
          if (!st || st.phase === 'end') break;
          if (st.phase === 'ask') {
            await domCheck(n.id);
            const sel = st.game === 'timeline' ? '.tick-btn' : '#stage .opt';
            const btns = await page.$$(sel);
            const pickWrong = Math.random() < 0.1 && btns.length > 1;
            const idx = pickWrong ? (st.a + 1) % btns.length : st.a;
            if (!btns[idx]) { errors.push(n.id + ' :: mini answer index ' + idx + ' missing (have ' + btns.length + ')'); break; }
            await btns[idx].click();
            questions++;
          } else if (st.phase === 'feedback') { await domCheck(n.id + ' fb'); await page.click('#next-btn'); }
        }
        played++;
        continue;
      }
      await page.evaluate((id) => GAME.go('battle', { nodeId: id }), n.id);
      await page.waitForTimeout(500);
      for (let k = 0; k < 60; k++) {
        await page.waitForTimeout(40);
        const st = await page.evaluate(() => { const B = BATTLE.state; if (!B) return null; const q = B.q; return { phase: B.phase, mode: q && q.mode, key: q && q.key, idx: q && q.mode === 'choice' ? q.options.findIndex(o => o.correct) : -1, ans: q && q.answer, n: q && q.options ? q.options.length : 0 }; });
        if (!st || st.phase === 'end') break;
        if (st.phase === 'ask') {
          await domCheck(n.id + ' ' + st.key);
          const wrong = Math.random() < 0.15;
          if (st.mode === 'choice') {
            if (st.idx < 0) { errors.push(n.id + ' ' + st.key + ' :: no correct option!'); }
            const opts = await page.$$('#qzone .opt');
            if (opts.length !== st.n) errors.push(n.id + ' ' + st.key + ' :: option count mismatch');
            await opts[wrong ? (st.idx + 1) % opts.length : Math.max(0, st.idx)].click();
          } else {
            const v = wrong ? String(st.ans * 1.37 + 3) : String(st.ans);
            await page.fill('#qzone #ans', v);
            await page.click('#qzone .numform button[type=submit]');
            await page.waitForTimeout(50);
            const ok = await page.evaluate(() => BATTLE.state.phase === 'feedback' && BATTLE.state.lastRes && BATTLE.state.lastRes.ok);
            if (!wrong && !ok) errors.push(n.id + ' ' + st.key + ' :: exact answer ' + v + ' was marked WRONG');
          }
          questions++;
        } else if (st.phase === 'feedback') {
          await page.waitForTimeout(260);
          await domCheck(n.id + ' fb ' + st.key);
          const nb = await page.$('#next-btn');
          if (nb) await nb.click(); else break;
        }
      }
      played++;
    }
    console.log('done', p.id, 'questions so far', questions, 'errors', errors.length);
  }
  // render sweep: every generator x25 seeds and every static question
  const sweep = await page.evaluate(() => {
    const out = []; let count = 0;
    const box = document.createElement('div'); box.style.cssText = 'position:absolute;left:-9999px;width:900px'; document.body.appendChild(box);
    for (const p of PACKS) {
      for (const g of p.generators) for (let s = 1; s <= 25; s++) {
        const q = QS.instantiate({ type: 'g', pack: p, src: g }, s * 7777, s % 2 ? 'mcq' : 'type');
        if (!q) { out.push(g.id + ' null'); continue; }
        box.innerHTML = QVIEW.card(q, { num: 1 }) + QVIEW.feedback(q, { ok: false, note: 'x', yourText: '1' }, {});
        count++;
        box.querySelectorAll('.katex-error').forEach(e => out.push(g.id + '#' + s + ' katex: ' + (e.getAttribute('title') || '').slice(0, 120)));
        const t = box.innerText;
        const plain = box.cloneNode(true); plain.querySelectorAll('.katex, code, kbd').forEach((k) => k.remove());
        const raw = plain.textContent.match(/.{0,40}(\\[a-zA-Z$%]|\{,\}).{0,20}/); if (raw) out.push(g.id + '#' + s + ' raw LaTeX: ' + raw[0].replace(/\s+/g, ' '));
        if (/\bNaN\b|\bundefined\b|\[object Object\]/.test(t)) out.push(g.id + '#' + s + ' bad text: ' + t.match(/.{0,50}(NaN|undefined|\[object Object\]).{0,20}/s)[0].replace(/\s+/g, ' '));
        if (q.mode === 'choice' && q.options.filter(o => o.correct).length !== 1) out.push(g.id + '#' + s + ' correct options: ' + q.options.filter(o => o.correct).length);
      }
      for (const sq of p.questions) {
        const q = QS.instantiate({ type: 's', pack: p, src: sq });
        box.innerHTML = QVIEW.card(q, { num: 1 }) + QVIEW.feedback(q, { ok: false, note: null, yourText: '1' }, {});
        count++;
        box.querySelectorAll('.katex-error').forEach(e => out.push(sq.id + ' katex: ' + (e.getAttribute('title') || '').slice(0, 120)));
        const t = box.innerText; if (/\bNaN\b|\bundefined\b/.test(t)) out.push(sq.id + ' bad text');
      }
      // briefing
      box.innerHTML = p.briefing.map(b => b.points.map(x => UI.rich(x)).join('')).join('');
      box.querySelectorAll('.katex-error').forEach(e => out.push(p.id + ' briefing katex: ' + (e.getAttribute('title') || '').slice(0, 120)));
    }
    box.remove();
    return { out, count };
  });
  console.log('render sweep:', sweep.count, 'renders,', sweep.out.length, 'problems');
  sweep.out.slice(0, 40).forEach(x => console.log('  SWEEP', x));
  console.log(`played ${played} nodes, ${questions} questions`);
  console.log(errors.length ? errors.slice(0, 60).join('\n') : 'NO ERRORS');
  await browser.close();
  srv.close();
  process.exit(errors.length || sweep.out.length ? 1 : 0);
})().catch((e) => { console.error('SCRIPT FAIL', e); process.exit(1); });
