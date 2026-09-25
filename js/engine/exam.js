/* Corporate Ladder — The Boardroom: MST-style practice exams. */
(function (root) {
  'use strict';
  const { GAME, UI, SFX, RENDER, QS, QVIEW } = root;
  const esc = RENDER.esc;
  const S = () => GAME.store.state;
  let E = null;
  const setup = { floors: null, n: 20, timer: 0 };

  GAME.screens.exam = () => {
    const packs = root.PACKS.filter((p) => !p.noExam);
    if (!setup.floors) setup.floors = packs.map((p) => p.id);
    const floors = packs.map((p) => `<label class="check"><input type="checkbox" data-exam-floor="${p.id}" ${setup.floors.includes(p.id) ? 'checked' : ''}><span><b>${GAME.floorName(p)}</b> · ${esc(p.week)}: ${esc(p.topic)}</span></label>`).join('');
    const seg = (key, opts, cur) => `<div class="seg" role="radiogroup">${opts.map(([v, l]) => `<button class="seg-btn${cur === v ? ' on' : ''}" role="radio" aria-checked="${cur === v}" data-act="exam-set" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
    return `<section class="page exam-setup">
      <header class="page-head"><button class="linkbtn" data-act="goto-tower">← Tower</button><p class="eyebrow">Penthouse</p><h1>The Boardroom</h1>
        <p>A practice exam in the style of the BFC2140 mid-semester test. <b>Section A</b> holds concept questions worth 0.5 marks each. <b>Section B</b> holds calculations worth 2 marks each. All questions are multiple choice. You see the answers at the end.</p></header>
      <div class="two-col">
        <section class="card"><h2>Which floors?</h2><div class="checks">${floors}</div>
          <div class="fb-actions"><button class="btn tiny" data-act="exam-all">All</button><button class="btn tiny" data-act="exam-mst">Mid-semester (Weeks 1–4)</button><button class="btn tiny" data-act="exam-none">None</button></div></section>
        <section class="card"><h2>Format</h2>
          <div class="set-row"><span class="set-lbl">Questions</span>${seg('n', [[10, '10'], [20, '20 (like the MST)'], [30, '30']], setup.n)}</div>
          <div class="set-row"><span class="set-lbl">Timer</span>${seg('timer', [[0, 'No timer'], [150, '2.5 min per question'], [90, '90 s per question']], setup.timer)}</div>
          <p class="muted small">Have your calculator ready: the 🧮 button works during the exam, and so does the 📘 formula sheet.</p>
          <button class="btn primary big wide" data-act="exam-start">Start the exam ▶</button></section>
      </div>
    </section>`;
  };

  function build() {
    const packs = root.PACKS.filter((p) => setup.floors.includes(p.id));
    const n = setup.n;
    const nA = Math.round(n / 2), nB = n - nA;
    const used = new Set();
    const qs = [];
    const pickFrom = (section, count) => {
      const pools = packs.map((p) => QS.pool(p, '*', { section, boss: false })).filter((x) => x.length);
      if (!pools.length) return;
      let k = Math.floor(Math.random() * pools.length), guard = 0;
      while (qs.filter((q) => q.xsec === section).length < count && guard++ < count * 20) {
        const pool = pools[k % pools.length];
        k++;
        const fresh = pool.filter((it) => !used.has(it.src.id));
        const item = QS.pick(fresh.length ? fresh : pool, { recent: used });
        const q = QS.instantiate(item, undefined, 'mcq');
        if (!q) continue;
        used.add(item.src.id);
        q.xsec = section;
        q.marks = section === 'A' ? 0.5 : 2;
        qs.push(q);
      }
    };
    pickFrom('A', nA);
    pickFrom('B', nB);
    return qs;
  }

  GAME.screens['exam-result'] = () => GAME.screens.exam();

  GAME.screens['exam-run'] = () => {
    const qs = build();
    if (!qs.length) { GAME.after = () => UI.toast('Pick at least one floor.', 'warn'); return GAME.screens.exam(); }
    E = { qs, ans: qs.map(() => null), flags: qs.map(() => false), i: 0, t0: Date.now(), deadline: setup.timer ? Date.now() + setup.timer * 1000 * qs.length : 0, tick: null };
    GAME.after = () => {
      show(0);
      if (E.deadline) E.tick = setInterval(clock, 1000);
      clock();
    };
    GAME.cleanup = () => { if (E && E.tick) clearInterval(E.tick); E = null; GAME.onAnswer = null; GAME.activeQ = null; };
    GAME.keyHandler = keys;
    GAME.onAnswer = (i) => choose(i);
    return `<section class="page exam-run">
      <div class="exam-bar"><button class="linkbtn" data-act="exam-quit">✕ Quit</button><b>The Boardroom</b><span id="exam-clock" class="exam-clock" aria-live="off"></span><button class="btn primary tiny" data-act="exam-submit">Submit</button></div>
      <nav class="palette" id="palette" aria-label="Questions"></nav>
      <div id="exam-q"></div>
      <div class="exam-nav"><button class="btn" data-act="exam-prev">◀ Previous</button><button class="btn" data-act="exam-flag" id="flag-btn">🚩 Flag</button><button class="btn primary" data-act="exam-next">Next ▶</button></div>
    </section>`;
  };

  function palette() {
    const el = document.getElementById('palette');
    if (!el) return;
    let lastSec = null;
    el.innerHTML = E.qs.map((q, k) => {
      const lab = q.xsec !== lastSec ? `<span class="pal-sec">Section ${q.xsec}</span>` : '';
      lastSec = q.xsec;
      return `${lab}<button class="pal${k === E.i ? ' cur' : ''}${E.ans[k] !== null ? ' done' : ''}${E.flags[k] ? ' flag' : ''}" data-act="exam-go" data-i="${k}" aria-label="Question ${k + 1}${E.ans[k] !== null ? ', answered' : ''}${E.flags[k] ? ', flagged' : ''}">${k + 1}</button>`;
    }).join('');
  }
  function show(i) {
    E.i = Math.max(0, Math.min(E.qs.length - 1, i));
    const q = E.qs[E.i];
    GAME.activeQ = q;
    const box = document.getElementById('exam-q');
    box.innerHTML = QVIEW.card(q, { num: E.i + 1, total: E.qs.length }).replace('<div class="qmeta">', `<div class="qmeta"><span class="sec-badge">Section ${q.xsec} · ${q.marks} mark${q.marks === 1 ? '' : 's'}</span>`);
    const chosen = E.ans[E.i];
    box.querySelectorAll('.opt').forEach((b, k) => { b.classList.toggle('chosen', k === chosen); b.setAttribute('aria-pressed', k === chosen); });
    document.getElementById('flag-btn').classList.toggle('on', E.flags[E.i]);
    palette();
  }
  function choose(i) {
    if (!E) return;
    E.ans[E.i] = i;
    document.querySelectorAll('#exam-q .opt').forEach((b, k) => { b.classList.toggle('chosen', k === i); b.setAttribute('aria-pressed', k === i); });
    palette();
    SFX.play('click');
  }
  function clock() {
    const c = document.getElementById('exam-clock');
    if (!E || !c) return;
    if (!E.deadline) { c.textContent = `${E.ans.filter((a) => a !== null).length}/${E.qs.length} answered`; return; }
    const left = Math.max(0, Math.round((E.deadline - Date.now()) / 1000));
    c.textContent = `⏱ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    c.classList.toggle('low', left < 120);
    if (left <= 0) { clearInterval(E.tick); UI.toast('Time is up. Marking your paper.', 'warn'); submit(true); }
  }

  function submit(force) {
    if (!E) return;
    const blank = E.ans.filter((a) => a === null).length;
    if (!force && blank) {
      UI.modal({ title: 'Submit now?', body: `<p>You have <b>${blank}</b> unanswered question${blank === 1 ? '' : 's'}. Unanswered questions score zero.</p><div class="fb-actions"><button class="btn primary" data-act="exam-submit-yes">Submit</button><button class="btn" data-act="modal-close">Keep working</button></div>` });
      return;
    }
    UI.closeModal();
    if (E.tick) clearInterval(E.tick);
    const s = S();
    let marks = 0, max = 0, right = 0;
    const byTopic = {};
    const review = E.qs.map((q, k) => {
      const a = E.ans[k];
      const res = a === null ? { ok: false, yourText: '(no answer)' } : QS.check(q, a);
      if (a !== null) QS.record(q, res);
      max += q.marks;
      if (res.ok) { marks += q.marks; right++; }
      const tk = q.topicLabel + '|' + q.pack;
      const t = byTopic[tk] || (byTopic[tk] = { label: q.topicLabel, pack: q.pack, topic: q.topic, a: 0, c: 0 });
      t.a++; if (res.ok) t.c++;
      return { q, res };
    });
    const pct = Math.round((marks / max) * 100);
    const band = pct >= 80 ? ['HD', 'High Distinction'] : pct >= 70 ? ['D', 'Distinction'] : pct >= 60 ? ['C', 'Credit'] : pct >= 50 ? ['P', 'Pass'] : ['N', 'Fail'];
    s.stats.exams.push({ t: Date.now(), n: E.qs.length, pct, marks, max });
    if (s.stats.exams.length > 30) s.stats.exams.shift();
    GAME.addXP(5 * right + 30); GAME.addCoins(2 * right);
    GAME.store.save();
    GAME.checkAchievements({ type: 'exam', pct });
    if (pct >= 80) { SFX.play('victory'); UI.confetti({ particleCount: 160 }); } else SFX.play(pct >= 50 ? 'coin' : 'defeat');
    const mins = Math.round((Date.now() - E.t0) / 60000);
    const topics = Object.values(byTopic).sort((x, y) => x.c / x.a - y.c / y.a);
    const qs = E.qs;
    E = null;
    GAME.cleanup = null;
    GAME.keyHandler = null;
    const el = document.getElementById('screen');
    el.innerHTML = `<section class="page exam-result">
      <header class="page-head"><p class="eyebrow">The Boardroom · results</p><h1>${marks} / ${max} marks</h1>
        <p class="grade grade-${band[0]}"><b>${pct}%</b> · ${band[0]} (${band[1]}) · ${right} of ${qs.length} correct · ${mins} min</p></header>
      <div class="two-col">
        <section class="card"><h2>By topic (weakest first)</h2><ul class="mastery">${topics.map((t) => `<li><div class="tm-top"><span>${esc(t.label)}</span><span class="muted small">${t.c}/${t.a}</span></div><div class="tm-row"><span class="pbar${t.c / t.a < 0.6 ? ' weak' : ''}"><i style="width:${Math.round((t.c / t.a) * 100)}%"></i></span><button class="chip-btn" data-act="practice" data-pack="${t.pack}" data-topic="${esc(t.topic)}">Practise</button></div></li>`).join('')}</ul></section>
        <section class="card"><h2>Next steps</h2><p>Wrong answers are now in your 📒 Mistake Ledger with full working.</p><div class="fb-actions"><button class="btn primary" data-act="exam-again">New exam</button><button class="btn" data-act="goto" data-s="journal">Open the ledger</button><button class="btn" data-act="goto-tower">Back to tower</button></div></section>
      </div>
      <h2 class="sec-h">Review every question</h2>
      <ol class="review">${review.map(({ q, res }, k) => `<li class="rev ${res.ok ? 'ok' : 'no'}"><details${res.ok ? '' : ' open'}><summary><span class="rev-n">${k + 1}</span> ${res.ok ? '✅' : '❌'} <span class="muted small">Section ${q.xsec} · ${esc(q.topicLabel)}</span></summary>
        <div class="rev-body"><div class="qtext">${UI.rich(q.q)}</div>${root.CHARTS.visuals(q, {})}
          <p>Your answer: ${UI.rich(res.yourText || '—')} · Correct: <b>${UI.rich(QS.correctText(q))}</b></p>
          ${res.note && !res.ok ? `<p class="fb-note">🔎 ${UI.rich(res.note)}</p>` : ''}${q.why ? `<div class="fb-why">${UI.rich(q.why)}</div>` : ''}
          ${q.steps && q.steps.length ? `<ol class="steps">${q.steps.map((st) => `<li>${UI.rich(st)}</li>`).join('')}</ol>` : ''}${QVIEW.method(q)}</div></details></li>`).join('')}</ol>
    </section>`;
    GAME.current = { name: 'exam-result', params: {} };
    GAME.renderTop();
    root.scrollTo(0, 0);
  }

  function readFloors() {
    const boxes = document.querySelectorAll('[data-exam-floor]');
    if (boxes.length) setup.floors = [...boxes].filter((c) => c.checked).map((c) => c.dataset.examFloor);
  }

  function keys(ev) {
    if (!E || UI.modalStack.length || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const tag = (ev.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    const k = (ev.key || '').toLowerCase();
    const q = E.qs[E.i];
    let idx = -1;
    if (q.tf) { if (k === 't') idx = 0; if (k === 'f') idx = 1; }
    else if (/^[a-f]$/.test(k)) idx = k.charCodeAt(0) - 97;
    if (/^[1-6]$/.test(k)) idx = +k - 1;
    if (idx >= 0 && idx < q.options.length) { ev.preventDefault(); choose(idx); return; }
    if (ev.key === 'ArrowRight') show(E.i + 1);
    if (ev.key === 'ArrowLeft') show(E.i - 1);
  }

  Object.assign(GAME.actions, {
    'goto-exam': () => GAME.go('exam'),
    'exam-set': (el) => { readFloors(); setup[el.dataset.k] = +el.dataset.v; GAME.refresh(); },
    'exam-all': () => { setup.floors = root.PACKS.filter((p) => !p.noExam).map((p) => p.id); GAME.refresh(); },
    'exam-none': () => { setup.floors = []; GAME.refresh(); },
    'exam-mst': () => { setup.floors = root.PACKS.filter((p) => ['w1', 'w2', 'w3', 'w4'].includes(p.id)).map((p) => p.id); GAME.refresh(); },
    'exam-start': () => {
      setup.floors = [...document.querySelectorAll('[data-exam-floor]')].filter((c) => c.checked).map((c) => c.dataset.examFloor);
      if (!setup.floors.length) { UI.toast('Pick at least one floor.', 'warn'); return; }
      SFX.unlock(); SFX.play('open');
      GAME.go('exam-run');
    },
    'exam-go': (el) => show(+el.dataset.i),
    'exam-prev': () => show(E.i - 1),
    'exam-next': () => show(E.i + 1),
    'exam-flag': () => { E.flags[E.i] = !E.flags[E.i]; document.getElementById('flag-btn').classList.toggle('on', E.flags[E.i]); palette(); },
    'exam-submit': () => submit(false),
    'exam-submit-yes': () => submit(true),
    'exam-again': () => GAME.go('exam'),
    'exam-quit': () => UI.modal({ title: 'Quit the exam?', body: '<p>Your answers will not be marked.</p><div class="fb-actions"><button class="btn danger" data-act="exam-quit-yes">Quit</button><button class="btn" data-act="modal-close">Keep going</button></div>' }),
    'exam-quit-yes': () => { UI.closeModal(); GAME.go('tower'); },
  });
})(typeof window !== 'undefined' ? window : globalThis);
