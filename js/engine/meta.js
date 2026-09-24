/* Corporate Ladder — store & vault, mistake ledger, performance review, achievements, settings, help. */
(function (root) {
  'use strict';
  const { GAME, UI, ART, SFX, RENDER, FIN, QS, QVIEW, makeRng, QCORE } = root;
  const esc = RENDER.esc;
  const S = () => GAME.store.state;
  const money = (v) => '$' + v.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  /* ================= Company Store ================= */
  const ITEMS = [
    { id: 'hint', icon: '📜', name: 'Hint scroll', price: 30, desc: 'Shows the formula and the first step of the working.' },
    { id: 'fifty', icon: '✂️', name: '50/50', price: 40, desc: 'Removes two wrong options from a multiple-choice question.' },
    { id: 'shield', icon: '🛡️', name: 'Shield', price: 50, desc: 'Your next mistake in a battle costs no heart.' },
    { id: 'potion', icon: '🧪', name: 'Potion', price: 40, desc: 'Restores 2 hearts during a battle.' },
  ];
  const FREQ = [{ m: 1, w: 'annually' }, { m: 2, w: 'semi-annually' }, { m: 4, w: 'quarterly' }, { m: 12, w: 'monthly' }, { m: 365, w: 'daily' }];
  const freqWord = (m) => (FREQ.find((f) => f.m === m) || { w: m + ' times a year' }).w;

  function makeOffers() {
    const rng = makeRng(Math.floor(Math.random() * 2 ** 31));
    for (let k = 0; k < 200; k++) {
      const base = rng.step(0.03, 0.08, 0.001);
      const fs = rng.sample(FREQ, 3);
      const offers = fs.map((f, i) => ({ apr: +(base + [0.003, 0, -0.002][i] * (rng.chance(0.5) ? 1 : -1)).toFixed(4), m: f.m }));
      const ears = offers.map((o) => FIN.ear(o.apr, o.m));
      const sorted = ears.slice().sort((a, b) => b - a);
      if (sorted[0] - sorted[1] < 0.0003) continue;
      const bestApr = offers.reduce((b, o, i) => (o.apr > offers[b].apr ? i : b), 0);
      const bestEar = ears.indexOf(sorted[0]);
      if (bestApr === bestEar && rng.chance(0.6)) continue; // usually make the highest APR a trap
      return offers;
    }
    return [{ apr: 0.05, m: 12 }, { apr: 0.051, m: 1 }, { apr: 0.0495, m: 365 }];
  }

  GAME.screens.shop = () => {
    const s = S();
    const v = s.vault;
    if (!v.offers || (s.stats.battles - (v.offersAt || 0) >= 3 && v.picked)) { v.offers = makeOffers(); v.offersAt = s.stats.battles; v.picked = false; GAME.store.save(); }
    const items = ITEMS.map((it) => `<article class="shop-item"><span class="si-ico" aria-hidden="true">${it.icon}</span><div><b>${esc(it.name)}</b><p class="muted small">${esc(it.desc)}</p></div><div class="si-buy"><span class="muted small">You have <b>${s.items[it.id]}</b></span><button class="btn" data-act="buy-item" data-id="${it.id}" ${s.wallet >= it.price ? '' : 'disabled'}>Buy $${it.price}</button></div></article>`).join('');
    const hats = ART.HATS.map((h) => {
      const own = s.owned.hats.includes(h.id), worn = s.avatar.hat === h.id;
      const prev = ART.avatarSVG(Object.assign({}, s.avatar, { hat: h.id }));
      return `<article class="ward-item${worn ? ' worn' : ''}"><span class="ward-prev" aria-hidden="true">${prev}</span><b>${esc(h.name)}</b>${own ? `<button class="btn tiny" data-act="wear-hat" data-id="${h.id}">${worn ? 'Take off' : 'Wear'}</button>` : `<button class="btn tiny" data-act="buy-hat" data-id="${h.id}" ${s.wallet >= h.price ? '' : 'disabled'}>Buy $${h.price}</button>`}</article>`;
    }).join('');
    const suits = ART.SUITS.map((su) => {
      const own = su.price === 0 || s.owned.suits.includes(su.id), worn = s.avatar.suit === su.color;
      return `<article class="ward-item${worn ? ' worn' : ''}"><span class="ward-prev" aria-hidden="true">${ART.avatarSVG(Object.assign({}, s.avatar, { suit: su.color }))}</span><b>${esc(su.name)} suit</b>${own ? `<button class="btn tiny" data-act="wear-suit" data-id="${su.id}" ${worn ? 'disabled' : ''}>${worn ? 'Wearing' : 'Wear'}</button>` : `<button class="btn tiny" data-act="buy-suit" data-id="${su.id}" ${s.wallet >= su.price ? '' : 'disabled'}>Buy $${su.price}</button>`}</article>`;
    }).join('');
    const offers = v.offers.map((o, i) => `<button class="offer" data-act="pick-offer" data-i="${i}" ${v.picked ? 'disabled' : ''}><b>Account ${'ABC'[i]}</b><span>${UI.rich(`\\(${(o.apr * 100).toFixed(2)}\\%\\) p.a.`)}</span><small>compounded ${freqWord(o.m)}</small></button>`).join('');
    const curEar = FIN.ear(v.apr, v.m);
    return `<section class="page">
      <header class="page-head"><button class="linkbtn" data-act="goto-tower">← Tower</button><h1>Company Store</h1><p>Wallet: <b>${money(s.wallet)}</b>. Earn money by answering questions and winning battles.</p></header>
      <div class="shop-grid">
        <section class="card vault-card"><h2>🏦 Savings Vault</h2>
          <p>Money in the vault earns <b>compound interest</b> every time you win a battle (one compounding year per win).</p>
          <div class="vault-row"><div><span class="muted small">Balance</span><b class="big-num">${money(+v.bal.toFixed(2))}</b></div><div><span class="muted small">Interest earned so far</span><b>${money(+v.earned.toFixed(2))}</b></div></div>
          <p class="small">Current account: ${UI.rich(`\\(${(v.apr * 100).toFixed(2)}\\%\\)`)} p.a. compounded ${freqWord(v.m)} · ${UI.rich(`\\(EAR = \\left(1 + \\frac{${(v.apr).toFixed(4)}}{${v.m}}\\right)^{${v.m}} - 1 = ${(curEar * 100).toFixed(3)}\\%\\)`)}</p>
          <form class="vault-form" data-submit="vault-move" autocomplete="off"><label for="vault-amt">Amount</label><input id="vault-amt" inputmode="decimal" placeholder="e.g. 100">
            <button class="btn" type="submit" name="dir" value="in" data-dir="in">Deposit</button><button class="btn" type="button" data-act="vault-out">Withdraw</button></form>
          <h3>Switch accounts</h3>
          <p class="small">${v.picked ? 'You have chosen for now. New offers arrive after 3 more battles.' : 'Three banks want your money. Pick the account that pays the <b>highest EAR</b>. (Tip: the highest APR is not always the best.)'}</p>
          <div class="offers">${offers}</div>
        </section>
        <section class="card"><h2>Battle items</h2><div class="shop-items">${items}</div></section>
        <section class="card"><h2>Wardrobe: hats</h2><div class="ward-grid">${hats}</div></section>
        <section class="card"><h2>Wardrobe: suits</h2><div class="ward-grid">${suits}</div></section>
      </div>
    </section>`;
  };

  /* ================= Mistake Ledger ================= */
  GAME.screens.journal = () => {
    const s = S();
    const rows = s.journal.map((j, i) => {
      const q = QS.fromJournal(j);
      if (!q) return '';
      const pack = GAME.packById(j.pack);
      return `<li class="ledger-row"><div class="lr-top"><span class="chip">Floor ${pack ? pack.floor : '?'} · ${esc(QS.topicLabel(j.pack, j.topic))}</span><span class="muted small">${new Date(j.t).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span></div>
        <div class="lr-q">${UI.rich(q.q)}</div>
        <p class="small">You said ${UI.rich(j.your || '—')} · correct: <b>${UI.rich(j.right)}</b></p>
        <div class="fb-actions"><button class="btn tiny primary" data-act="ledger-retry" data-i="${i}">Retry</button><button class="btn tiny" data-act="ledger-remove" data-i="${i}">Remove</button></div></li>`;
    }).join('');
    return `<section class="page">
      <header class="page-head"><button class="linkbtn" data-act="goto-tower">← Tower</button><h1>Mistake Ledger</h1>
        <p>Every question you got wrong is recorded here (the latest 80). Retry an entry and answer it correctly to strike it off. The numbers stay the same, so you can check your working.</p>
        ${s.journal.length ? `<div class="fb-actions"><button class="btn primary" data-act="smart-review">🌙 Smart Review of these topics</button><button class="btn" data-act="ledger-clear">Clear the ledger</button></div>` : ''}</header>
      ${s.journal.length ? `<ol class="ledger">${rows}</ol>` : '<div class="card empty"><p>No mistakes recorded. Either you are brilliant, or it is time to start a battle.</p></div>'}
    </section>`;
  };

  function retryModal(index) {
    const j = S().journal[index];
    const q = QS.fromJournal(j);
    if (!q) return;
    GAME.activeQ = q; GAME.activeRes = null;
    const m = UI.modal({ title: 'Retry a mistake', body: QVIEW.card(q, {}), wide: true, onClose: () => { GAME.onAnswer = GAME.onNext = GAME.onToChoice = null; GAME.activeQ = null; } });
    const answer = (given) => {
      if (GAME.activeRes) return;
      const res = QS.check(q, given);
      if (res.invalid) { UI.toast(esc(res.note), 'warn'); return; }
      res.fromJournal = true;
      QS.record(q, res);
      GAME.activeRes = res;
      const card = m.el.querySelector('.qcard');
      QVIEW.markOptions(card, q, q.mode === 'choice' ? given : -1);
      const fb = card.querySelector('.feedback');
      fb.className = 'feedback ' + (res.ok ? 'good' : 'bad');
      fb.innerHTML = QVIEW.feedback(q, res, { lead: res.ok ? 'Fixed! Struck off the ledger.' : 'Still not right. Study the working below.', nextLabel: 'Done' });
      fb.hidden = false;
      SFX.play(res.ok ? 'correct' : 'wrong');
      if (res.ok) { GAME.addXP(10); GAME.checkAchievements({ type: 'fix' }); }
      GAME.store.save();
    };
    GAME.onAnswer = answer;
    GAME.onNext = () => { UI.closeModal(m); GAME.refresh(); };
    GAME.onToChoice = () => { QS.toChoice(q); m.el.querySelector('.answers').innerHTML = QVIEW.answers(q); };
  }

  /* ================= Performance Review ================= */
  GAME.screens.stats = () => {
    const s = S();
    const st = s.stats;
    const acc = st.answered ? Math.round((st.correct / st.answered) * 100) : 0;
    const exams = st.exams.slice(-5).reverse();
    const rep = QS.topicReport();
    const tried = rep.filter((t) => t.a > 0).sort((a, b) => a.m - b.m);
    const untried = rep.filter((t) => t.a === 0);
    const floors = root.PACKS.map((p) => {
      const pr = GAME.helpers.floorProgress(p);
      const ts = rep.filter((t) => t.pack.id === p.id);
      const a = ts.reduce((x, t) => x + t.a, 0), c = ts.reduce((x, t) => x + t.c, 0);
      return `<tr><th scope="row">${p.floor}. ${esc(p.title)}</th><td>★ ${pr.got}/${pr.max}</td><td>${a ? Math.round((c / a) * 100) + '%' : '—'}</td><td>${a}</td></tr>`;
    }).join('');
    const topicRow = (t) => `<li><div class="tm-top"><span>${esc(t.label)} <small class="muted">· Floor ${t.pack.floor}</small></span><span class="muted small">${t.c}/${t.a} · ${Math.round(t.m * 100)}%</span></div><div class="tm-row"><span class="pbar${t.m < 0.6 ? ' weak' : ''}"><i style="width:${Math.round(t.m * 100)}%"></i></span><button class="chip-btn" data-act="practice" data-pack="${t.pack.id}" data-topic="${esc(t.topic)}">Practise</button></div></li>`;
    return `<section class="page">
      <header class="page-head"><button class="linkbtn" data-act="goto-tower">← Tower</button><h1>Performance Review</h1><p>Mastery is estimated from your answers. Weakest topics are listed first: those are the best use of your study time.</p></header>
      <div class="tiles">
        <div class="tile"><b>${st.answered}</b><span>questions answered</span></div>
        <div class="tile"><b>${acc}%</b><span>correct overall</span></div>
        <div class="tile"><b>${st.bestStreak}</b><span>best streak</span></div>
        <div class="tile"><b>${st.wins}</b><span>battles won</span></div>
        <div class="tile"><b>${exams.length ? Math.max(...st.exams.map((x) => x.pct)) + '%' : '—'}</b><span>best exam score</span></div>
      </div>
      <div class="two-col">
        <section class="card"><h2>Weakest topics first</h2>${tried.length ? `<ul class="mastery">${tried.map(topicRow).join('')}</ul>` : '<p class="muted">Answer some questions to see your mastery.</p>'}
          ${untried.length ? `<details><summary>${untried.length} topics not tried yet</summary><ul class="plain">${untried.map((t) => `<li>${esc(t.label)} <small class="muted">· Floor ${t.pack.floor}</small> <button class="chip-btn" data-act="practice" data-pack="${t.pack.id}" data-topic="${esc(t.topic)}">Try</button></li>`).join('')}</ul></details>` : ''}</section>
        <section class="card"><h2>By floor</h2><div class="viz-scroll"><table class="qtable"><thead><tr><th scope="col">Floor</th><th scope="col">Stars</th><th scope="col">Correct</th><th scope="col">Answered</th></tr></thead><tbody>${floors}</tbody></table></div>
          ${exams.length ? `<h3>Recent Boardroom exams</h3><ul class="plain">${exams.map((x) => `<li>${new Date(x.t).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}: <b>${x.pct}%</b> (${x.marks}/${x.max} marks, ${x.n} questions)</li>`).join('')}</ul>` : ''}</section>
      </div>
    </section>`;
  };

  /* ================= Achievements ================= */
  GAME.screens.achievements = () => {
    const s = S();
    return `<section class="page">
      <header class="page-head"><button class="linkbtn" data-act="goto-tower">← Tower</button><h1>Achievements</h1><p>${Object.keys(s.ach).length} of ${GAME.ACH.length} unlocked.</p></header>
      <div class="ach-grid">${GAME.ACH.map((a) => `<article class="ach${s.ach[a.id] ? ' got' : ''}"><span class="ach-ico" aria-hidden="true">${s.ach[a.id] ? a.icon : '🔒'}</span><b>${esc(a.name)}</b><p class="small">${esc(a.desc)}</p>${s.ach[a.id] ? `<span class="muted small">Unlocked ${new Date(s.ach[a.id]).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>` : ''}</article>`).join('')}</div>
    </section>`;
  };

  /* ================= Settings ================= */
  function seg(key, opts, cur) {
    return `<div class="seg" role="radiogroup" aria-label="${esc(key)}">${opts.map(([v, l]) => `<button class="seg-btn${String(cur) === String(v) ? ' on' : ''}" role="radio" aria-checked="${String(cur) === String(v)}" data-act="set" data-k="${key}" data-v="${esc(String(v))}">${l}</button>`).join('')}</div>`;
  }
  function toggle(key, cur, label) {
    return `<button class="toggle${cur ? ' on' : ''}" role="switch" aria-checked="${!!cur}" data-act="set" data-k="${key}" data-v="${cur ? 'false' : 'true'}"><span class="knob" aria-hidden="true"></span>${label}</button>`;
  }
  GAME.screens.settings = () => {
    const st = S().settings;
    GAME.after = (el) => {
      const size = el.querySelector('#set-size'), rate = el.querySelector('#set-rate');
      size.addEventListener('input', () => { st.size = +size.value; el.querySelector('#size-val').textContent = Math.round(st.size * 100) + '%'; GAME.applySettings(); GAME.store.save(); });
      rate.addEventListener('input', () => { st.rate = +rate.value; el.querySelector('#rate-val').textContent = st.rate.toFixed(2) + '×'; GAME.store.save(); });
      const vs = el.querySelector('#set-voice');
      const fill = () => {
        const voices = (root.speechSynthesis && root.speechSynthesis.getVoices()) || [];
        const en = voices.filter((v) => /^en/i.test(v.lang));
        vs.innerHTML = `<option value="">Automatic (English, Australian if available)</option>` + en.map((v) => `<option value="${esc(v.name)}"${v.name === st.voice ? ' selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('');
      };
      fill();
      if (root.speechSynthesis) root.speechSynthesis.onvoiceschanged = fill;
      vs.addEventListener('change', () => { st.voice = vs.value; GAME.store.save(); });
    };
    return `<section class="page settings">
      <header class="page-head"><button class="linkbtn" data-act="goto-tower">← Tower</button><h1>Settings</h1><p>Make the game comfortable to read. Changes apply straight away.</p></header>
      <section class="card"><h2>Reading</h2>
        <div class="set-row"><span class="set-lbl">Font</span>${seg('font', [['lexend', '<span style="font-family:Lexend,system-ui">Lexend</span>'], ['atkinson', '<span style="font-family:\'Atkinson Hyperlegible Next\',\'Atkinson Hyperlegible\',system-ui">Atkinson Hyperlegible</span>'], ['opendyslexic', '<span style="font-family:OpenDyslexic,system-ui">OpenDyslexic</span>'], ['system', 'System']], st.font)}</div>
        <div class="set-row"><label class="set-lbl" for="set-size">Text size <b id="size-val">${Math.round(st.size * 100)}%</b></label><input type="range" id="set-size" min="0.85" max="1.5" step="0.05" value="${st.size}"></div>
        <div class="set-row"><span class="set-lbl">Line spacing</span>${seg('spacing', [['normal', 'Normal'], ['relaxed', 'Relaxed'], ['extra', 'Extra']], st.spacing)}</div>
        <div class="set-row"><span class="set-lbl">Letter spacing</span>${seg('letter', [['normal', 'Normal'], ['wide', 'Wide']], st.letter)}</div>
        <div class="set-row"><span class="set-lbl">Theme</span>${seg('theme', [['auto', 'Match device'], ['light', 'Light'], ['dark', 'Dark']], st.theme)}</div>
        <div class="set-row"><span class="set-lbl">Paper tint (light theme)</span>${seg('tint', [['ledger', 'Ledger green'], ['cream', 'Cream'], ['blue', 'Pale blue'], ['peach', 'Peach'], ['white', 'White']], st.tint)}</div>
        <div class="set-row">${toggle('hl', st.hl, 'Highlight numbers in questions')}</div>
        <div class="set-row">${toggle('givens', st.givens, 'Show the “Given” panel with each value in LaTeX')}</div>
        <div class="set-row">${toggle('ruler', st.ruler, 'Reading ruler (a tinted band follows your pointer)')}</div>
        <p class="sample-text">Sample: A bond pays a 6% coupon semi-annually. Its price is ${UI.rich('\\(P = \\frac{C}{i}\\left(1 - \\frac{1}{(1+i)^{n}}\\right) + \\frac{FV}{(1+i)^{n}}\\)')} with ${UI.rich('\\(C = \\$30\\)')}.</p>
      </section>
      <section class="card"><h2>Sound and read-aloud</h2>
        <div class="set-row">${toggle('sound', st.sound, 'Sound effects')}</div>
        <div class="set-row">${toggle('autoRead', st.autoRead, 'Read each question aloud automatically')}</div>
        <div class="set-row"><label class="set-lbl" for="set-rate">Reading speed <b id="rate-val">${(st.rate || 0.9).toFixed(2)}×</b></label><input type="range" id="set-rate" min="0.6" max="1.3" step="0.05" value="${st.rate || 0.9}"></div>
        <div class="set-row"><label class="set-lbl" for="set-voice">Voice</label><select id="set-voice"></select></div>
        <div class="set-row"><button class="btn" data-act="test-voice">🔊 Test the voice</button></div>
      </section>
      <section class="card"><h2>Play</h2>
        <div class="set-row"><span class="set-lbl">Calculation answers</span>${seg('answer', [['mixed', 'Mixed'], ['mcq', 'Multiple choice'], ['type', 'Type the number']], st.answer)}</div>
        <div class="set-row"><span class="set-lbl">Mini-game timers</span>${seg('timers', [['off', 'Off'], ['relaxed', 'Relaxed (double time)'], ['standard', 'Standard']], st.timers)}</div>
        <div class="set-row"><span class="set-lbl">Motion</span>${seg('motion', [['auto', 'Match device'], ['reduce', 'Reduce'], ['full', 'Full']], st.motion)}</div>
      </section>
      <section class="card"><h2>Your progress</h2>
        <p class="small">Progress saves in this browser automatically. To move it to another device, copy your save code and load it there.</p>
        <div class="fb-actions"><button class="btn" data-act="save-copy">Copy save code</button></div>
        <label for="save-code">Save code</label><textarea id="save-code" rows="3" placeholder="Paste a save code here to load it"></textarea>
        <div class="fb-actions"><button class="btn" data-act="save-load">Load this save code</button><button class="btn danger" data-act="reset-ask">Reset all progress…</button></div>
        <div id="reset-zone"></div>
      </section>
    </section>`;
  };

  /* ================= Help ================= */
  function helpHTML() {
    return `<div class="help">
      <h3>The goal</h3><p>Each floor of the tower is one week of BFC2140. Walk the route on each floor, beat the <b>boss</b>, and climb to the Boardroom. Your title rises from Intern to <b>CFO</b> as you earn XP.</p>
      <h3>Battles</h3><p>Answer questions to damage the monster. A wrong answer costs a heart (you have 5). Three right answers in a row start a <b>combo</b> (×1.5 damage). Hard questions (●●●) hit harder. After every answer you get the explanation and a full <b>worked solution</b>.</p>
      <h3>Answering</h3><ul><li>Multiple choice: click an option, or press <kbd>A</kbd>–<kbd>D</kbd> / <kbd>1</kbd>–<kbd>4</kbd> (<kbd>T</kbd>/<kbd>F</kbd> for true/false).</li><li>Typed answers: type the number and press <kbd>Enter</kbd>. <code>1,338.23</code>, <code>$1338.23</code> and <code>(47,350)</code> all work. Percentages go in as <code>12.68</code>.</li><li><kbd>Enter</kbd> moves to the next question. <kbd>H</kbd> uses a hint. <kbd>S</kbd> reads the question aloud.</li></ul>
      <h3>Tools</h3><ul><li>🧮 <b>Calculator</b>: TVM solver, cash flows (NPV/IRR), statistics, and a scientific mode. It uses the HP10bII+ sign convention.</li><li>📘 <b>Formula sheet</b>: the exam formula sheet, searchable.</li><li>📒 <b>Mistake Ledger</b>: retry anything you got wrong. 🌙 <b>Smart Review</b> targets your weakest topics.</li><li>🎓 <b>Boardroom</b>: a timed or untimed MST-style practice exam.</li></ul>
      <h3>Reading support</h3><p>In ⚙️ Settings you can switch the font (Lexend, Atkinson Hyperlegible or OpenDyslexic), make text bigger, add spacing, change the paper tint, turn off timers, and have questions read aloud. All maths is typeset in LaTeX.</p>
      <h3>Credits</h3><p class="small">Maths by KaTeX. Confetti by canvas-confetti. Fonts: Lexend, Atkinson Hyperlegible Next, Bungee and IBM Plex Mono (Google Fonts), and OpenDyslexic (via Fontsource). Monsters and sounds are generated in code. Questions are based on the BFC2140 lectures, tutorials and practice tests.</p>
    </div>`;
  }

  /* ================= actions ================= */
  Object.assign(GAME.actions, {
    'buy-item': (el) => {
      const it = ITEMS.find((x) => x.id === el.dataset.id); const s = S();
      if (!it || s.wallet < it.price) return;
      s.wallet -= it.price; s.items[it.id]++;
      SFX.play('buy'); UI.toast(`Bought ${it.icon} ${esc(it.name)}.`);
      GAME.store.save(); GAME.refresh();
    },
    'buy-hat': (el) => {
      const h = ART.HATS.find((x) => x.id === el.dataset.id); const s = S();
      if (!h || s.wallet < h.price) return;
      s.wallet -= h.price; s.owned.hats.push(h.id); s.avatar.hat = h.id;
      SFX.play('buy'); GAME.store.save(); GAME.refresh();
    },
    'wear-hat': (el) => { const s = S(); s.avatar.hat = s.avatar.hat === el.dataset.id ? null : el.dataset.id; SFX.play('click'); GAME.store.save(); GAME.refresh(); },
    'buy-suit': (el) => {
      const su = ART.SUITS.find((x) => x.id === el.dataset.id); const s = S();
      if (!su || s.wallet < su.price) return;
      s.wallet -= su.price; s.owned.suits.push(su.id); s.avatar.suit = su.color;
      SFX.play('buy'); GAME.store.save(); GAME.refresh();
    },
    'wear-suit': (el) => { const su = ART.SUITS.find((x) => x.id === el.dataset.id); if (su) { S().avatar.suit = su.color; SFX.play('click'); GAME.store.save(); GAME.refresh(); } },
    'vault-move': (form) => {
      const amt = QCORE.parseNumber(form.querySelector('#vault-amt').value);
      const s = S();
      if (!Number.isFinite(amt) || amt <= 0) { UI.toast('Type an amount above zero.', 'warn'); return; }
      if (amt > s.wallet) { UI.toast(`You only have ${money(s.wallet)} in your wallet.`, 'warn'); return; }
      s.wallet -= Math.round(amt * 100) / 100; s.vault.bal += Math.round(amt * 100) / 100;
      s.wallet = Math.round(s.wallet * 100) / 100;
      SFX.play('coin'); GAME.store.save(); GAME.checkAchievements({ type: 'vault' }); GAME.refresh();
    },
    'vault-out': () => {
      const inp = document.getElementById('vault-amt');
      const amt = QCORE.parseNumber(inp && inp.value);
      const s = S();
      if (!Number.isFinite(amt) || amt <= 0) { UI.toast('Type an amount above zero.', 'warn'); return; }
      if (amt > s.vault.bal + 1e-9) { UI.toast(`The vault holds ${money(+s.vault.bal.toFixed(2))}.`, 'warn'); return; }
      s.vault.bal -= amt; s.wallet = Math.floor((s.wallet + amt) * 100) / 100;
      SFX.play('coin'); GAME.store.save(); GAME.refresh();
    },
    'pick-offer': (el) => {
      const s = S(); const v = s.vault;
      if (v.picked) return;
      const i = +el.dataset.i;
      const o = v.offers[i];
      const ears = v.offers.map((x) => FIN.ear(x.apr, x.m));
      const best = ears.indexOf(Math.max(...ears));
      v.apr = o.apr; v.m = o.m; v.picked = true;
      const list = v.offers.map((x, k) => `${'ABC'[k]}: ${(ears[k] * 100).toFixed(3)}%`).join(' · ');
      if (i === best) { v.best = true; UI.toast(`🔍 Best choice! EARs were ${list}.`, 'good', 5200); SFX.play('levelup'); }
      else UI.toast(`Account ${'ABC'[best]} paid more. EARs were ${list}.`, 'warn', 5600);
      GAME.store.save(); GAME.checkAchievements({ type: 'vault' }); GAME.refresh();
    },
    'ledger-retry': (el) => retryModal(+el.dataset.i),
    'ledger-remove': (el) => { S().journal.splice(+el.dataset.i, 1); GAME.store.save(); GAME.refresh(); },
    'ledger-clear': () => {
      UI.modal({ title: 'Clear the ledger?', body: '<p>This removes every recorded mistake. Your stats stay.</p><div class="fb-actions"><button class="btn danger" data-act="ledger-clear-yes">Clear it</button><button class="btn" data-act="modal-close">Keep it</button></div>' });
    },
    'ledger-clear-yes': () => { S().journal = []; GAME.store.save(); UI.closeModal(); GAME.refresh(); },
    set: (el) => {
      const st = S().settings;
      const k = el.dataset.k; let v = el.dataset.v;
      if (v === 'true') v = true; else if (v === 'false') v = false;
      st[k] = v;
      GAME.applySettings(); GAME.store.save();
      SFX.play('click');
      const y = root.scrollY;
      GAME.refresh();
      root.scrollTo(0, y);
      const again = document.querySelector(`[data-act="set"][data-k="${k}"]${typeof v === 'boolean' ? '' : `[data-v="${String(v)}"]`}`);
      if (again) again.focus({ preventScroll: true });
    },
    'test-voice': () => UI.speak('The present value of an annuity is C over r, times one minus one over one plus r to the power of n.'),
    'save-copy': () => {
      const code = GAME.store.exportCode();
      const ta = document.getElementById('save-code');
      ta.value = code;
      const done = () => UI.toast('Save code copied. Paste it into Settings on your other device.');
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, () => { ta.select(); UI.toast('Copy the selected code with Ctrl+C (or Cmd+C).'); });
      else { ta.select(); UI.toast('Copy the selected code with Ctrl+C (or Cmd+C).'); }
    },
    'save-load': () => {
      const code = document.getElementById('save-code').value;
      try { GAME.store.importCode(code); GAME.applySettings(); UI.toast('Save loaded. Welcome back!', 'good'); GAME.go('tower'); }
      catch (e) { UI.toast(esc(e.message), 'warn', 4200); }
    },
    'reset-ask': () => {
      document.getElementById('reset-zone').innerHTML = `<div class="confirm"><p><b>Really start again?</b> This deletes your XP, money, stars, stats and ledger in this browser.</p><div class="fb-actions"><button class="btn danger" data-act="reset-yes">Yes, reset everything</button><button class="btn" data-act="reset-no">Cancel</button></div></div>`;
    },
    'reset-no': () => { document.getElementById('reset-zone').innerHTML = ''; },
    'reset-yes': () => { GAME.store.reset(); GAME.applySettings(); GAME.go('title'); },
    'open-help': () => UI.modal({ title: '❓ How to play', body: helpHTML(), wide: true }),
  });
})(typeof window !== 'undefined' ? window : globalThis);
