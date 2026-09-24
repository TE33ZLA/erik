/* Corporate Ladder — turn-based battles against finance monsters. */
(function (root) {
  'use strict';
  const { GAME, QS, QVIEW, ART, SFX, UI, RENDER, FIN } = root;
  const esc = RENDER.esc;
  const S = () => GAME.store.state;
  let B = null;

  const AUDITOR = { name: 'The Auditor', title: 'Hunts down your weakest topics', body: 'box', color: '#8d99ae', acc: ['glasses', 'tie'], mouth: 'flat', item: '📋',
    lines: { intro: 'Your ledger has some weak entries. Let us audit them.', hit: ['That entry reconciles. Noted.', 'Hmm. Correct. Annoyingly.'], taunt: ['Another discrepancy!', 'That will need a correcting journal entry.'], win: 'Your books balance. Audit complete.', lose: 'Audit failed. We reconvene after revision.' } };
  const TUTOR = { name: 'Professor Pip', title: 'Friendly topic tutor', body: 'round', color: '#8fd3c1', acc: ['glasses', 'bowtie'], mouth: 'grin', item: '📚',
    lines: { intro: 'Let us practise one topic until it clicks.', hit: ['Lovely work!', 'Exactly right!'], taunt: ['Close! Read the working and try the next one.', 'Mistakes are how we learn. Keep going!'], win: 'Topic mastered for today. Well done!', lose: 'Have a look at the briefing notes, then come back.' } };

  function heartsHTML() {
    let h = '';
    for (let i = 0; i < B.heartsMax; i++) h += `<span class="heart${i < B.hearts ? '' : ' lost'}" aria-hidden="true">♥</span>`;
    return `${h}<span class="sr-only">${B.hearts} of ${B.heartsMax} hearts</span>${B.shield ? '<span class="shield-on" title="Shield active">🛡️</span>' : ''}`;
  }
  function hpHTML() {
    const pct = Math.max(0, (B.hp / B.hpMax) * 100);
    return `<i style="width:${pct}%"></i><span>${Math.max(0, Math.ceil(B.hp))} / ${B.hpMax}</span>`;
  }
  function itemsHTML() {
    const it = S().items;
    return `<button class="item-btn" data-act="use-shield" ${it.shield > 0 && !B.shield ? '' : 'disabled'} title="Block the next lost heart">🛡️<span>Shield</span><b>${it.shield}</b></button>
      <button class="item-btn" data-act="use-potion" ${it.potion > 0 && B.hearts < B.heartsMax ? '' : 'disabled'} title="Restore 2 hearts">🧪<span>Potion</span><b>${it.potion}</b></button>
      <button class="item-btn" data-act="open-calc" title="Financial calculator">🧮<span>Calculator</span></button>
      <button class="item-btn" data-act="open-sheet" title="Formula sheet">📘<span>Formulas</span></button>
      <button class="item-btn" data-act="flee" title="Leave the battle">🚪<span>Leave</span></button>`;
  }
  function bubble(text, cls) {
    const b = document.getElementById('bubble');
    if (!b) return;
    b.className = 'bubble ' + (cls || '');
    b.textContent = text;
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  }
  function pickLine(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* ---------------- start ---------------- */
  function setup(p) {
    let pack = null, node = null, poolItems = [], enemy, n = 6, boss = false, title, color;
    if (p.nodeId) {
      const f = GAME.nodeById(p.nodeId);
      pack = f.pack; node = f.node;
      boss = node.kind === 'boss';
      enemy = node.enemy; n = node.n || (boss ? 10 : 6);
      poolItems = QS.pool(pack, node.topics, { boss });
      title = node.name; color = pack.color;
    } else {
      // review / practice across packs
      const targets = p.topics || null; // [{pack, topic}]
      root.PACKS.forEach((pk) => {
        const ts = targets ? targets.filter((t) => t.pack === pk.id).map((t) => t.topic) : '*';
        if (targets && !ts.length) return;
        poolItems = poolItems.concat(QS.pool(pk, ts, { boss: false }));
      });
      enemy = p.practice ? TUTOR : AUDITOR;
      n = p.n || 8;
      title = p.title || (p.practice ? 'Topic practice' : 'Smart Review');
      color = '#6b7a8f';
    }
    B = { p, pack, node, boss, enemy, title, color, n, hpMax: n * 10, hp: n * 10, hearts: 5, heartsMax: 5, streak: 0, best: 0, mistakes: 0, correct: 0, qn: 0,
      pool: poolItems, recent: [], q: null, phase: 'intro', shield: false, enraged: false, xp: 0, coins: 0, hintUsed: false, fiftyUsed: false, assisted: false, weak: !!p.review };
    return B;
  }

  GAME.screens.battle = (p) => {
    setup(p);
    const s = S();
    GAME.after = (el) => {
      bubble(B.enemy.lines.intro);
      if (B.boss) { SFX.play('boss'); el.querySelector('.arena').classList.add('boss-in'); }
      setTimeout(nextQuestion, 350);
      GAME.keyHandler = keys;
      GAME.cleanup = () => { B = null; };
    };
    return `<section class="battle${B.boss ? ' is-boss' : ''}" style="--floor:${B.color}">
      <div class="battle-head"><button class="linkbtn" data-act="flee">← ${B.pack ? 'Floor ' + B.pack.floor : 'Tower'}</button><h1 class="battle-title">${esc(B.title)}</h1><span class="battle-kind">${B.boss ? 'Boss fight' : B.p.review ? 'Smart Review' : B.p.practice ? 'Practice' : 'Battle'}</span></div>
      <div class="arena" id="arena"><span class="arena-deco" aria-hidden="true">${B.pack ? B.pack.icon : '🌙'}</span><span class="arena-sky" aria-hidden="true"></span>
        <div class="fighter me"><div class="ava-wrap" id="me">${ART.avatarSVG(s.avatar)}</div><div class="hearts" id="hearts">${heartsHTML()}</div></div>
        <div class="combo" id="combo" aria-live="polite"></div>
        <div class="fighter foe">
          <div class="bubble" id="bubble" role="status"></div>
          <div class="mon-wrap" id="foe">${ART.monsterSVG(B.enemy, { boss: B.boss })}</div>
          <div class="nameplate"><b>${esc(B.enemy.name)}</b><small>${esc(B.enemy.title || '')}</small></div>
          <div class="hpbar" id="hp" role="progressbar" aria-label="Enemy health" aria-valuemin="0" aria-valuemax="${B.hpMax}" aria-valuenow="${B.hp}">${hpHTML()}</div>
        </div>
      </div>
      <div id="qzone" class="qzone"><div class="qcard loading">Get ready…</div></div>
      <div class="itembar" id="itembar">${itemsHTML()}</div>
    </section>`;
  };

  /* ---------------- flow ---------------- */
  function nextQuestion() {
    if (!B) return;
    B.qn++;
    B.hintUsed = false; B.fiftyUsed = false; B.assisted = false;
    let q = null, tries = 0;
    while (!q && tries < 12) {
      const item = QS.pick(B.pool, { recent: new Set(B.recent), hard: B.enraged || (B.boss && B.qn > 3), easy: !B.boss && B.qn <= 2, weak: B.weak });
      q = QS.instantiate(item);
      if (q) { B.recent.push(item.src.id); if (B.recent.length > 8) B.recent.shift(); }
      tries++;
    }
    B.q = q;
    B.phase = 'ask';
    const zone = document.getElementById('qzone');
    zone.innerHTML = QVIEW.card(q, { num: B.qn, tools: { hint: S().items.hint, fifty: S().items.fifty } });
    const input = zone.querySelector('#ans');
    if (input) setTimeout(() => input.focus({ preventScroll: true }), 50);
    if (S().settings.autoRead) UI.speak(QVIEW.speechFor(q));
  }

  function answer(given) {
    if (!B || B.phase !== 'ask') return;
    const q = B.q;
    const res = QS.check(q, given);
    if (res.invalid) { UI.toast(esc(res.note), 'warn'); return; }
    B.phase = 'feedback';
    UI.stopSpeaking();
    QS.record(q, res);
    const st = S().stats;
    const cardEl = document.querySelector('#qzone .qcard');
    if (q.mode === 'choice') QVIEW.markOptions(cardEl, q, given);
    else QVIEW.markOptions(cardEl, q, -1);
    let gain = '';
    if (res.ok) {
      B.correct++; B.streak++; st.streak++; st.bestStreak = Math.max(st.bestStreak, st.streak); B.best = Math.max(B.best, B.streak);
      let dmg = q.level === 3 ? 15 : 10;
      const crit = B.streak >= 3;
      if (crit) dmg *= 1.5;
      if (B.assisted) dmg *= 0.5;
      dmg = Math.round(dmg);
      const xp = 8 + 4 * q.level, coins = 3 * q.level;
      B.xp += xp; B.coins += coins;
      gain = `+${xp} XP · +$${coins}`;
      attack(dmg, crit);
      SFX.play('correct');
      bubble(pickLine(B.enemy.lines.hit), 'hurt');
    } else {
      B.mistakes++; B.streak = 0; st.streak = 0;
      SFX.play('wrong');
      enemyAttack();
      bubble(pickLine(B.enemy.lines.taunt), 'taunt');
    }
    updateCombo();
    const fb = cardEl.querySelector('.feedback');
    fb.innerHTML = QVIEW.feedback(q, res, { gain, nextLabel: B.hp <= 0 || B.hearts <= 0 ? 'Continue' : 'Next question' });
    fb.hidden = false;
    fb.className = 'feedback ' + (res.ok ? 'good' : 'bad');
    B.lastRes = res;
    GAME.checkAchievements({ type: 'answer', ok: res.ok });
    GAME.store.save();
    setTimeout(() => { const nb = document.getElementById('next-btn'); if (nb) nb.focus({ preventScroll: false }); fb.scrollIntoView({ block: 'nearest', behavior: document.documentElement.classList.contains('reduce-motion') ? 'auto' : 'smooth' }); }, 60);
  }

  function attack(dmg, crit) {
    const me = document.getElementById('me'), foe = document.getElementById('foe');
    me.classList.remove('lunge'); void me.offsetWidth; me.classList.add('lunge');
    setTimeout(() => {
      B.hp -= dmg;
      foe.classList.remove('hit'); void foe.offsetWidth; foe.classList.add('hit');
      SFX.play(crit ? 'crit' : 'hit');
      UI.floatText(foe, (crit ? 'COMBO −' : '−') + dmg, crit ? 'crit' : 'dmg');
      const hp = document.getElementById('hp');
      hp.innerHTML = hpHTML(); hp.setAttribute('aria-valuenow', Math.max(0, B.hp));
      if (B.boss && !B.enraged && B.hp <= B.hpMax / 2 && B.hp > 0) {
        B.enraged = true;
        document.getElementById('arena').classList.add('enraged');
        setTimeout(() => { bubble('Enough! Now I get serious!', 'taunt'); SFX.play('boss'); }, 500);
      }
    }, 220);
  }

  function enemyAttack() {
    const me = document.getElementById('me'), foe = document.getElementById('foe');
    foe.classList.remove('lunge-l'); void foe.offsetWidth; foe.classList.add('lunge-l');
    setTimeout(() => {
      if (B.shield) {
        B.shield = false;
        UI.floatText(me, 'Blocked!', 'block');
        S().items.shield = S().items.shield; // already spent when activated
      } else {
        B.hearts = Math.max(0, B.hearts - 1);
        me.classList.remove('hurt'); void me.offsetWidth; me.classList.add('hurt');
        UI.floatText(me, '−♥', 'heart');
        SFX.play('hurt');
      }
      document.getElementById('hearts').innerHTML = heartsHTML();
      document.getElementById('itembar').innerHTML = itemsHTML();
    }, 220);
  }

  function updateCombo() {
    const c = document.getElementById('combo');
    if (!c) return;
    c.innerHTML = B.streak >= 2 ? `<span class="combo-pill${B.streak >= 3 ? ' hot' : ''}">🔥 ${B.streak} in a row${B.streak >= 3 ? ' · ×1.5 damage' : ''}</span>` : '';
  }

  function next() {
    if (!B || B.phase !== 'feedback') return;
    if (B.hp <= 0) return victory();
    if (B.hearts <= 0) return defeat();
    nextQuestion();
  }

  function starsFor(m) { return m <= 1 ? 3 : m <= 3 ? 2 : 1; }

  function payVault() {
    const v = S().vault;
    if (v.bal <= 0) return 0;
    const i = v.bal * FIN.ear(v.apr, v.m);
    v.bal += i; v.earned += i;
    return i;
  }

  function victory() {
    B.phase = 'end';
    const s = S();
    const foe = document.getElementById('foe');
    foe.classList.add('defeated');
    bubble(B.enemy.lines.win, 'win');
    SFX.play('victory');
    UI.confetti({ particleCount: B.boss ? 180 : 100 });
    const stars = starsFor(B.mistakes);
    const winXP = B.boss ? 120 : B.p.review || B.p.practice ? 40 : 50;
    const winCoins = (B.boss ? 60 : 25) + stars * 10;
    B.xp += winXP; B.coins += winCoins;
    const levelled = GAME.addXP(B.xp);
    GAME.addCoins(B.coins);
    const interest = payVault();
    s.stats.battles++; s.stats.wins++;
    if (B.p.review) s.stats.reviews++;
    let improved = false;
    if (B.node) {
      const rec = s.nodes[B.node.id] || (s.nodes[B.node.id] = { stars: 0, wins: 0, plays: 0 });
      rec.plays++; rec.wins++;
      if (stars > rec.stars) { rec.stars = stars; improved = true; }
      s.last.floor = B.pack.id;
    }
    GAME.store.save();
    GAME.checkAchievements({ type: 'win', mistakes: B.mistakes, boss: B.boss });
    const zone = document.getElementById('qzone');
    const nextNode = B.node ? nextStop(B.pack, B.node) : null;
    zone.innerHTML = `<article class="qcard result win">
      <h2>Victory!</h2>
      <p class="stars" aria-label="${stars} of 3 stars">${[1, 2, 3].map((k) => `<span class="${k <= stars ? 'on' : ''}">★</span>`).join('')}</p>
      <p>${esc(B.enemy.name)} is defeated. You answered <b>${B.correct}</b> correctly with <b>${B.mistakes}</b> mistake${B.mistakes === 1 ? '' : 's'}. Best streak: <b>${B.best}</b>.</p>
      <ul class="rewards"><li>+${B.xp} XP</li><li>+$${B.coins}</li>${interest > 0 ? `<li>🏦 Vault interest +$${interest.toFixed(2)}</li>` : ''}${improved && stars === 3 ? '<li>⭐ New 3-star record</li>' : ''}</ul>
      ${stars < 3 ? `<p class="muted">3 stars need at most 1 mistake.</p>` : ''}
      <div class="fb-actions">${nextNode ? `<button class="btn primary" data-act="play-node" data-node="${nextNode.id}">Next stop: ${esc(nextNode.name)} ▶</button>` : ''}
        <button class="btn" data-act="replay">Play again</button>
        <button class="btn" data-act="${B.pack ? 'goto-floor' : 'goto-tower'}" data-floor="${B.pack ? B.pack.id : ''}">${B.pack ? 'Back to floor' : 'Back to tower'}</button></div>
    </article>`;
    document.getElementById('itembar').innerHTML = '';
    if (levelled) GAME.renderTop();
    GAME.renderTop();
    setTimeout(() => { const b = zone.querySelector('.btn.primary, .btn'); if (b) b.focus(); }, 80);
  }

  function defeat() {
    B.phase = 'end';
    const s = S();
    bubble(B.enemy.lines.lose, 'taunt');
    SFX.play('defeat');
    document.getElementById('me').classList.add('down');
    GAME.addXP(B.xp);
    GAME.addCoins(B.coins + 5);
    s.stats.battles++;
    if (B.node) { const rec = s.nodes[B.node.id] || (s.nodes[B.node.id] = { stars: 0, wins: 0, plays: 0 }); rec.plays++; }
    GAME.store.save();
    GAME.renderTop();
    const zone = document.getElementById('qzone');
    zone.innerHTML = `<article class="qcard result lose">
      <h2>Liquidated!</h2>
      <p>You ran out of hearts, but every question still taught you something. You keep <b>+${B.xp} XP</b> and <b>$${B.coins + 5}</b>.</p>
      <p>Tip: open the <b>briefing notes</b> for this floor, or buy a 🧪 potion in the Company Store before the rematch.</p>
      <div class="fb-actions"><button class="btn primary" data-act="replay">Try again</button>
      ${B.pack ? `<button class="btn" data-act="open-briefing" data-floor="${B.pack.id}">Read the briefing</button><button class="btn" data-act="goto-floor" data-floor="${B.pack.id}">Back to floor</button>` : '<button class="btn" data-act="goto-tower">Back to tower</button>'}</div>
    </article>`;
    document.getElementById('itembar').innerHTML = '';
  }

  function nextStop(pack, node) {
    const i = pack.nodes.findIndex((n) => n.id === node.id);
    return pack.nodes[i + 1] || null;
  }

  /* ---------------- items ---------------- */
  function useHint() {
    if (!B || B.phase !== 'ask' || B.hintUsed || S().items.hint <= 0) return;
    const q = B.q;
    S().items.hint--; B.hintUsed = true;
    const box = document.querySelector('#qzone .hintbox');
    let h = '<h4>📜 Hint</h4>';
    if (q.formula) h += QVIEW.formulaCard(q.formula, true);
    if (q.steps && q.steps.length > 1) h += `<p class="hint-step"><b>First step:</b> ${UI.rich(q.steps[0])}</p>`;
    else if (!q.formula) h += `<p>${UI.rich(q.why ? 'Think about this: ' + q.why.split('. ')[0] + '.' : 'Re-read the question and underline each number.')}</p>`;
    box.innerHTML = h; box.hidden = false;
    const btn = document.querySelector('[data-act="use-hint"]');
    if (btn) { btn.disabled = true; btn.querySelector('b').textContent = S().items.hint; }
    SFX.play('page');
    GAME.store.save();
  }
  function useFifty() {
    if (!B || B.phase !== 'ask' || B.fiftyUsed || S().items.fifty <= 0 || B.q.mode !== 'choice') return;
    const q = B.q;
    const wrong = q.options.map((o, i) => (o.correct ? -1 : i)).filter((i) => i >= 0);
    const remove = wrong.sort(() => Math.random() - 0.5).slice(0, Math.max(0, q.options.length - 2));
    document.querySelectorAll('#qzone .opt').forEach((b, i) => { if (remove.includes(i)) { b.disabled = true; b.classList.add('gone'); } });
    S().items.fifty--; B.fiftyUsed = true;
    const btn = document.querySelector('[data-act="use-fifty"]');
    if (btn) { btn.disabled = true; btn.querySelector('b').textContent = S().items.fifty; }
    SFX.play('page');
    GAME.store.save();
  }
  function useShield() {
    if (!B || B.shield || S().items.shield <= 0 || B.phase === 'end') return;
    S().items.shield--; B.shield = true;
    document.getElementById('hearts').innerHTML = heartsHTML();
    document.getElementById('itembar').innerHTML = itemsHTML();
    UI.toast('🛡️ Shield up: your next mistake costs no heart.');
    SFX.play('coin');
    GAME.store.save();
  }
  function usePotion() {
    if (!B || S().items.potion <= 0 || B.hearts >= B.heartsMax || B.phase === 'end') return;
    S().items.potion--; B.hearts = Math.min(B.heartsMax, B.hearts + 2);
    document.getElementById('hearts').innerHTML = heartsHTML();
    document.getElementById('itembar').innerHTML = itemsHTML();
    UI.floatText(document.getElementById('me'), '+♥♥', 'heal');
    SFX.play('coin');
    GAME.store.save();
  }
  function toChoice() {
    if (!B || B.phase !== 'ask' || B.q.mode !== 'input') return;
    QS.toChoice(B.q);
    B.assisted = true;
    const cardEl = document.querySelector('#qzone .qcard');
    cardEl.querySelector('.answers').innerHTML = QVIEW.answers(B.q);
  }

  /* ---------------- input ---------------- */
  function keys(ev) {
    if (!B || UI.modalStack.length || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const tag = (ev.target.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || tag === 'select';
    const k = (ev.key || '').toLowerCase();
    if (B.phase === 'ask' && B.q && B.q.mode === 'choice' && !typing) {
      let idx = -1;
      if (B.q.tf) { if (k === 't' || k === '1') idx = 0; if (k === 'f' || k === '2') idx = 1; }
      else if (/^[1-6]$/.test(k)) idx = +k - 1;
      else if (/^[a-f]$/.test(k)) idx = k.charCodeAt(0) - 97;
      if (idx >= 0 && idx < B.q.options.length) {
        const b = document.querySelectorAll('#qzone .opt')[idx];
        if (b && !b.disabled) { ev.preventDefault(); answer(idx); }
        return;
      }
    }
    if (B.phase === 'feedback' && ev.key === 'Enter' && !typing && !(ev.target.closest && ev.target.closest('button, summary, a'))) { ev.preventDefault(); next(); return; }
    if (typing) return;
    if (k === 'h') useHint();
    else if (k === 's') GAME.actions['speak-q']();
  }

  Object.assign(GAME.actions, {
    answer: (el) => { if (GAME.current.name === 'battle') answer(+el.dataset.i); else if (GAME.onAnswer) GAME.onAnswer(+el.dataset.i); },
    'submit-num': (form) => { const v = form.querySelector('#ans').value; if (GAME.current.name === 'battle') answer(v); else if (GAME.onAnswer) GAME.onAnswer(v); },
    next: () => { if (GAME.current.name === 'battle') next(); else if (GAME.onNext) GAME.onNext(); },
    'use-hint': () => useHint(),
    'use-fifty': () => useFifty(),
    'use-shield': () => useShield(),
    'use-potion': () => usePotion(),
    'to-choice': () => { if (GAME.current.name === 'battle') toChoice(); else if (GAME.onToChoice) GAME.onToChoice(); },
    'speak-q': () => { const q = GAME.current.name === 'battle' ? B && B.q : GAME.activeQ; if (q) UI.speak(QVIEW.speechFor(q)); },
    'speak-fb': () => { const q = GAME.current.name === 'battle' ? B && B.q : GAME.activeQ; const res = GAME.current.name === 'battle' ? B && B.lastRes : GAME.activeRes; if (q && res) UI.speak(QVIEW.speechForFeedback(q, res)); },
    replay: () => { if (B) GAME.go('battle', B.p); },
    flee: () => {
      if (B && B.phase !== 'end' && B.qn > 1) {
        const m = UI.modal({ title: 'Leave this battle?', body: `<p>Your progress in this fight will be lost. XP from answers so far is kept.</p><div class="fb-actions"><button class="btn primary" data-act="flee-yes">Leave</button><button class="btn" data-act="modal-close">Stay and fight</button></div>` });
        return m;
      }
      GAME.actions['flee-yes']();
    },
    'flee-yes': () => {
      UI.closeModal();
      if (B && B.xp) { GAME.addXP(B.xp); GAME.addCoins(B.coins); GAME.store.save(); }
      const pack = B && B.pack;
      if (pack) GAME.go('floor', { id: pack.id }); else GAME.go('tower');
    },
  });

  root.BATTLE = { get state() { return B; } };
})(typeof window !== 'undefined' ? window : globalThis);
