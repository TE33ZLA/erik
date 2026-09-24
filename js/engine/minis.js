/* Corporate Ladder — mini-games: rapid sorting, Timeline Tapper and SML Sniper. */
(function (root) {
  'use strict';
  const { GAME, UI, SFX, RENDER, CHARTS, FIN, L, T, makeRng } = root;
  const esc = RENDER.esc;
  const S = () => GAME.store.state;
  const R = String.raw;
  let M = null;

  function timerSeconds(base) {
    const t = S().settings.timers;
    if (t === 'off') return 0;
    return t === 'relaxed' ? base * 2 : base;
  }

  /* ---------------- item makers ---------------- */
  function rapidItem(spec, rng) {
    const hasItems = !!(spec.items && spec.items.length);
    if (spec.gen && (!hasItems || rng.chance(0.5))) {
      // A generator may reject a draw (returns null); try a few more before falling back.
      for (let i = 0; i < 8; i++) {
        let it = null;
        try { it = spec.gen(rng); } catch (e) { it = null; }
        if (it) return normalise(spec, it);
      }
    }
    if (!hasItems) return null;
    if (!M.deck || !M.deck.length) M.deck = rng.shuffle(spec.items.slice());
    return normalise(spec, M.deck.pop());
  }
  function normalise(spec, it) {
    if (it.opts) return { t: it.t, opts: it.opts, a: it.a, why: it.why };
    const bins = spec.bins;
    return { t: it.t, opts: bins.map((b) => b.label), a: bins.findIndex((b) => b.id === it.bin), why: it.why };
  }

  function timelineItem(rng) {
    const kinds = ['pv-ann', 'pv-ann', 'pv-perp', 'pv-growperp', 'pv-due', 'fv-ann', 'fv-due'];
    const kind = rng.pick(kinds);
    const k = rng.int(1, 5), len = rng.int(3, 5);
    let cfs = {}, ask, ans, why, N;
    if (kind === 'pv-ann' || kind === 'pv-due') {
      for (let t = k; t < k + len; t++) cfs[t] = 'C';
      N = k + len;
      if (kind === 'pv-ann') { ask = R`Where does the **ordinary annuity** formula \(PV = \frac{C}{r}\left(1 - \frac{1}{(1+r)^{n}}\right)\) put the value of these cash flows?`; ans = k - 1; why = R`It lands **one period before the first cash flow**: \(t = ${k - 1}\). Then divide by \((1+r)^{${k - 1}}\) to bring it to today.`; }
      else { ask = R`Where does the **annuity due** formula (ordinary \(\times (1+r)\)) put the value of these cash flows?`; ans = k; why = R`Multiplying by \((1+r)\) moves the value forward one period, onto the **first cash flow**: \(t = ${k}\).`; }
    } else if (kind === 'pv-perp' || kind === 'pv-growperp') {
      for (let t = k; t <= k + 2; t++) cfs[t] = kind === 'pv-perp' ? 'C' : (t === k ? 'C₁' : t === k + 1 ? 'C₁(1+g)' : 'C₁(1+g)²');
      cfs[k + 3] = '… ∞';
      N = k + 3;
      ask = kind === 'pv-perp' ? R`Where does the **perpetuity** formula \(PV = \frac{C}{r}\) put the value of this stream?` : R`Where does the **growing perpetuity** formula \(PV = \frac{C_1}{r - g}\) put the value of this stream?`;
      ans = k - 1;
      why = R`Perpetuity formulas also value cash flows **one period before the first one**: \(t = ${k - 1}\).`;
    } else {
      const a = rng.int(0, 2), b = a + len - 1;
      for (let t = a; t <= b; t++) cfs[t] = 'C';
      N = b + 2;
      if (kind === 'fv-ann') { ask = R`Where does the **future value of an ordinary annuity** formula \(FV = \frac{C}{r}\left((1+r)^{n} - 1\right)\) put the value?`; ans = b; why = R`The FV formula lands **on the last cash flow**: \(t = ${b}\).`; }
      else { ask = R`Where does the **future value of an annuity due** formula (ordinary FV \(\times (1+r)\)) put the value?`; ans = b + 1; why = R`Multiplying by \((1+r)\) pushes it **one period after the last cash flow**: \(t = ${b + 1}\).`; }
    }
    return { t: ask, cfs, N, a: ans, why, kind };
  }
  function smlItem(rng, market) {
    const beta = rng.step(0.3, 2.0, 0.05);
    const req = FIN.capm(market.rf, beta, market.rm);
    const fair = rng.chance(0.15);
    const delta = fair ? 0 : (rng.chance(0.5) ? 1 : -1) * rng.step(0.01, 0.04, 0.0025);
    const er = req + delta;
    const name = rng.pick(['Koala', 'Wombat', 'Magpie', 'Quokka', 'Numbat', 'Echidna', 'Dingo', 'Galah', 'Bilby', 'Possum', 'Emu', 'Lorikeet']) + ' ' + rng.pick(['Ltd', 'Corp', 'Co', 'Group', 'Holdings']);
    const a = delta > 0 ? 0 : delta < 0 ? 2 : 1;
    const why = R`Required return \(= r_f + \beta(E[R_M] - r_f) = ${L.pct(market.rf, 1)} + ${beta} \times ${L.pct(market.rm - market.rf, 1)} = ${L.pct(req, 2)}\). Expected \(${L.pct(er, 2)}\) is ${delta > 0 ? '**above** the SML, so it is **undervalued** (buy)' : delta < 0 ? '**below** the SML, so it is **overvalued** (sell)' : '**on** the SML, so it is **fairly priced**'}.`;
    return { t: R`**${name}**: \(\beta = ${beta}\), expected return \(${L.pct(er, 2)}\). What should you do?`, opts: ['Undervalued: buy', 'Fairly priced: hold', 'Overvalued: sell'], a, why, beta, er, name };
  }

  /* ---------------- screen ---------------- */
  GAME.screens.mini = (p) => {
    const f = GAME.nodeById(p.nodeId);
    const pack = f.pack, node = f.node;
    const spec = pack.minis[node.mini];
    const rng = makeRng(Math.floor(Math.random() * 2 ** 31));
    M = { pack, node, spec, rng, round: 0, total: spec.rounds || (spec.game === 'sml' ? 8 : 10), score: 0, streak: 0, best: 0, correct: 0, lives: 3, missed: [], phase: 'intro', timer: null, deck: null };
    if (spec.game === 'sml') M.market = { rf: rng.step(0.02, 0.05, 0.005), rm: 0 };
    if (M.market) M.market.rm = M.market.rf + rng.step(0.05, 0.08, 0.005);
    M.history = [];
    GAME.keyHandler = keys;
    GAME.cleanup = () => { clearTimer(); M = null; };
    const secs = timerSeconds(spec.seconds || 12);
    return `<section class="mini" style="--floor:${pack.color}">
      <div class="battle-head"><button class="linkbtn" data-act="mini-quit">← Floor ${pack.floor}</button><h1 class="battle-title">${esc(spec.title || node.name)}</h1><span class="battle-kind">Mini-game</span></div>
      <div class="mini-hud" id="hud"></div>
      <div class="mini-stage" id="stage">
        <article class="qcard mini-intro">
          <p class="mini-lead">${UI.rich(spec.intro || '')}</p>
          <ul class="mini-rules"><li>${M.total} rounds, 3 lives.</li><li>${secs ? `About ${secs} seconds per card. Change timers in Settings.` : 'No timer: take your time.'}</li><li>Keys: 1, 2, 3… pick an answer. Enter continues.</li></ul>
          <button class="btn primary big" data-act="mini-start">Start ▶</button>
        </article>
      </div>
    </section>`;
  };

  function hud() {
    const h = document.getElementById('hud');
    if (!h || !M) return;
    h.innerHTML = `<span>Round <b>${Math.min(M.round, M.total)}</b> / ${M.total}</span><span>Score <b>${M.score}</b></span><span>${M.streak >= 2 ? `🔥 <b>${M.streak}</b>` : 'Streak <b>' + M.streak + '</b>'}</span><span class="lives" aria-label="${M.lives} lives">${'♥'.repeat(M.lives)}<span class="lost">${'♥'.repeat(3 - M.lives)}</span></span>`;
  }

  function clearTimer() { if (M && M.timer) { clearTimeout(M.timer); M.timer = null; } }

  function nextRound() {
    if (!M) return;
    clearTimer();
    if (M.round >= M.total || M.lives <= 0) return finish();
    M.round++;
    M.phase = 'ask';
    const g = M.spec.game;
    M.item = g === 'timeline' ? timelineItem(M.rng) : g === 'sml' ? smlItem(M.rng, M.market) : rapidItem(M.spec, M.rng);
    if (!M.item) { M.round--; M.total = M.round; return finish(); } // nothing left to ask
    hud();
    const stage = document.getElementById('stage');
    let visual = '';
    if (g === 'timeline') {
      let ticks = '';
      for (let t = 0; t <= M.item.N; t++) ticks += `<button class="tick-btn" data-act="mini-pick" data-i="${t}"><span class="tv">${M.item.cfs[t] !== undefined ? esc(M.item.cfs[t]) : '&nbsp;'}</span><span class="tmark" aria-hidden="true"></span><span class="tt">t = ${t}</span></button>`;
      visual = `<div class="tapline" role="group" aria-label="Pick a time on the timeline">${ticks}</div>`;
    } else if (g === 'sml') {
      const pts = M.history.map((h) => ({ name: '', beta: h.beta, er: h.er, state: h.ok ? 'done' : 'missed' }));
      pts.push({ name: M.item.name.split(' ')[0], beta: M.item.beta, er: M.item.er, focus: true });
      visual = CHARTS.smlChart({ rf: M.market.rf, rm: M.market.rm, points: pts }) + `<p class="muted small"> ${UI.rich(R`\(r_f = ${L.pct(M.market.rf, 1)}\), \(E[R_M] = ${L.pct(M.market.rm, 1)}\)`)}</p>`;
    }
    const secs = timerSeconds(M.spec.seconds || (g === 'sml' ? 20 : g === 'timeline' ? 20 : 12));
    const optsHTML = g === 'timeline' ? '' : `<div class="opts rapid" role="group" aria-label="Answers">${M.item.opts.map((o, i) => `<button class="opt" data-act="mini-pick" data-i="${i}"><span class="key" aria-hidden="true">${i + 1}</span><span class="otext">${UI.rich(o)}</span></button>`).join('')}</div>`;
    stage.innerHTML = `<article class="qcard mini-card">
      ${secs ? `<div class="timer" aria-hidden="true"><i id="tbar"></i></div>` : ''}
      <div class="qtext big">${UI.rich(M.item.t)}</div>
      ${visual}${optsHTML}
      <div class="feedback" hidden aria-live="polite"></div>
    </article>`;
    if (secs) {
      const bar = document.getElementById('tbar');
      requestAnimationFrame(() => { bar.style.transition = `width ${secs}s linear`; bar.style.width = '0%'; });
      M.timer = setTimeout(() => pick(-1), secs * 1000);
    }
    if (S().settings.autoRead) UI.speak(UI.say(M.item.t));
  }

  function pick(i) {
    if (!M || M.phase !== 'ask') return;
    clearTimer();
    M.phase = 'feedback';
    const ok = i === M.item.a;
    const g = M.spec.game;
    const stage = document.getElementById('stage');
    const card = stage.querySelector('.qcard');
    const bar = document.getElementById('tbar');
    if (bar) { const w = getComputedStyle(bar).width; bar.style.transition = 'none'; bar.style.width = w; }
    const btns = card.querySelectorAll(g === 'timeline' ? '.tick-btn' : '.opt');
    btns.forEach((b, k) => { b.disabled = true; if (k === M.item.a) b.classList.add('right'); else if (k === i) b.classList.add('wrong'); });
    if (ok) {
      M.correct++; M.streak++; M.best = Math.max(M.best, M.streak);
      M.score += 100 + Math.min(10, M.streak - 1) * 20;
      SFX.play('correct');
    } else {
      M.streak = 0; M.lives--;
      M.missed.push({ t: M.item.t, why: M.item.why, right: g === 'timeline' ? 't = ' + M.item.a : M.item.opts[M.item.a] });
      SFX.play('wrong');
    }
    if (g === 'sml') M.history.push({ beta: M.item.beta, er: M.item.er, ok });
    hud();
    const fb = card.querySelector('.feedback');
    fb.className = 'feedback ' + (ok ? 'good' : 'bad');
    fb.innerHTML = `<h3 class="fb-h ${ok ? 'good' : 'bad'}">${ok ? '✅ Correct!' : i < 0 ? '⏱️ Out of time.' : '❌ Not quite.'}</h3><div class="fb-why">${UI.rich(M.item.why || '')}</div>
      <div class="fb-actions"><button class="btn primary" data-act="mini-next" id="next-btn">${M.round >= M.total || M.lives <= 0 ? 'See results' : 'Next'} ▶</button><button class="icon-btn" data-act="mini-speak" aria-label="Read the explanation aloud">🔊</button></div>`;
    fb.hidden = false;
    setTimeout(() => { const n = document.getElementById('next-btn'); if (n) n.focus({ preventScroll: true }); fb.scrollIntoView({ block: 'nearest' }); }, 50);
  }

  function finish() {
    if (!M) return;
    clearTimer();
    M.phase = 'end';
    const s = S();
    const played = M.round;
    const acc = played ? M.correct / played : 0;
    const completed = M.lives > 0;
    const stars = !completed ? 0 : acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : 1;
    const xp = 6 * M.correct + (completed ? 20 : 0), coins = 2 * M.correct + stars * 5;
    GAME.addXP(xp); GAME.addCoins(coins);
    const rec = s.nodes[M.node.id] || (s.nodes[M.node.id] = { stars: 0, wins: 0, plays: 0, best: 0 });
    rec.plays++; if (completed) rec.wins++;
    rec.stars = Math.max(rec.stars, stars);
    rec.best = Math.max(rec.best || 0, M.score);
    s.stats.minis[M.node.id] = (s.stats.minis[M.node.id] || 0) + 1;
    s.stats.answered += played; s.stats.correct += M.correct;
    GAME.store.save();
    GAME.checkAchievements({ type: 'mini' });
    GAME.renderTop();
    if (stars >= 2) { SFX.play('victory'); UI.confetti(); } else SFX.play(completed ? 'coin' : 'defeat');
    document.getElementById('hud').innerHTML = '';
    document.getElementById('stage').innerHTML = `<article class="qcard result ${completed ? 'win' : 'lose'}">
      <h2>${completed ? 'Round complete!' : 'Out of lives!'}</h2>
      ${completed ? `<p class="stars" aria-label="${stars} of 3 stars">${[1, 2, 3].map((k) => `<span class="${k <= stars ? 'on' : ''}">★</span>`).join('')}</p>` : ''}
      <p>Score <b>${M.score}</b> · ${M.correct} of ${played} correct · best streak ${M.best}${rec.best === M.score && M.score > 0 ? ' · <b>new best!</b>' : ''}</p>
      <ul class="rewards"><li>+${xp} XP</li><li>+$${coins}</li></ul>
      ${M.missed.length ? `<details class="fb-steps" open><summary>Review the ones you missed</summary><ul class="missed">${M.missed.map((m) => `<li><div>${UI.rich(m.t)}</div><div class="muted">Answer: <b>${UI.rich(m.right)}</b></div><div>${UI.rich(m.why || '')}</div></li>`).join('')}</ul></details>` : ''}
      <div class="fb-actions"><button class="btn primary" data-act="mini-again">Play again</button><button class="btn" data-act="goto-floor" data-floor="${M.pack.id}">Back to floor</button></div>
    </article>`;
  }

  function keys(ev) {
    if (!M || UI.modalStack.length) return;
    const tag = (ev.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    if (M.phase === 'ask' && /^[0-9]$/.test(ev.key)) {
      const i = M.spec.game === 'timeline' ? +ev.key : +ev.key - 1;
      const n = M.spec.game === 'timeline' ? M.item.N + 1 : M.item.opts.length;
      if (i >= 0 && i < n) { ev.preventDefault(); pick(i); }
    } else if (M.phase === 'feedback' && ev.key === 'Enter' && !(ev.target.closest && ev.target.closest('button'))) { ev.preventDefault(); nextRound(); }
    else if (M.phase === 'intro' && ev.key === 'Enter' && !(ev.target.closest && ev.target.closest('button'))) { ev.preventDefault(); nextRound(); }
  }

  Object.assign(GAME.actions, {
    'mini-start': () => { SFX.play('open'); nextRound(); },
    'mini-pick': (el) => pick(+el.dataset.i),
    'mini-next': () => nextRound(),
    'mini-speak': () => { if (M && M.item) UI.speak(UI.say(M.item.t) + '. ' + UI.say(M.item.why || '')); },
    'mini-again': () => { if (M) GAME.go('mini', { nodeId: M.node.id }); },
    'mini-quit': () => { const id = M && M.pack.id; GAME.go('floor', { id }); },
  });

  root.MINIS = { get state() { return M; } };
})(typeof window !== 'undefined' ? window : globalThis);
