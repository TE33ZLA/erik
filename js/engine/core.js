/* Corporate Ladder — engine core: state, saving, settings, levels, achievements, UI helpers. */
(function (root) {
  'use strict';
  const { RENDER, SFX } = root;
  const esc = RENDER.esc;
  const KEY = 'corporate-ladder-save-v1';

  /* ---------------- default state ---------------- */
  function defaults() {
    return {
      v: 1,
      name: '',
      started: false,
      avatar: { suit: '#2451b7', skin: '#e8b894', hair: 'short', hairColor: '#3b2a20', hat: null },
      xp: 0,
      wallet: 60,
      vault: { bal: 0, apr: 0.04, m: 1, earned: 0, offers: null, best: false },
      items: { hint: 3, fifty: 2, shield: 1, potion: 1 },
      owned: { hats: [], suits: ['navy', 'charcoal'] },
      nodes: {},
      stats: { answered: 0, correct: 0, streak: 0, bestStreak: 0, topics: {}, qs: {}, formulas: {}, battles: 0, wins: 0, minis: {}, exams: [], calcUses: 0, codexOpens: 0, fixed: 0, reviews: 0 },
      journal: [],
      ach: {},
      settings: {
        font: 'lexend', size: 1, spacing: 'relaxed', letter: 'normal', hl: true, givens: true,
        theme: 'auto', tint: 'ledger', answer: 'mixed', timers: 'relaxed', motion: 'auto', sound: true,
        rate: 0.9, autoRead: false, voice: '', ruler: false,
      },
      last: { floor: 'w1' },
    };
  }

  function merge(base, over) {
    if (!over || typeof over !== 'object' || Array.isArray(over)) return over === undefined ? base : over;
    const out = Array.isArray(base) ? [] : Object.assign({}, base);
    Object.keys(over).forEach((k) => {
      const b = base ? base[k] : undefined;
      out[k] = b && typeof b === 'object' && !Array.isArray(b) ? merge(b, over[k]) : over[k];
    });
    return out;
  }

  const store = {
    state: defaults(),
    _t: null,
    load(hot) {
      let data = null;
      if (hot && hot.state) data = hot.state;
      else {
        try { const raw = root.localStorage && root.localStorage.getItem(KEY); if (raw) data = JSON.parse(raw); } catch (e) { data = null; }
      }
      this.state = data ? merge(defaults(), data) : defaults();
    },
    save() {
      clearTimeout(this._t);
      this._t = setTimeout(() => { try { root.localStorage && root.localStorage.setItem(KEY, JSON.stringify(this.state)); } catch (e) { /* storage may be blocked */ } }, 250);
    },
    exportCode() {
      const json = JSON.stringify(this.state);
      const b64 = btoa(unescape(encodeURIComponent(json)));
      return 'CLADDER1.' + b64;
    },
    importCode(code) {
      const c = String(code || '').trim().replace(/\s+/g, '');
      if (!c.startsWith('CLADDER1.')) throw new Error('That does not look like a Corporate Ladder save code.');
      const json = decodeURIComponent(escape(atob(c.slice(9))));
      const data = JSON.parse(json);
      if (!data || data.v !== 1) throw new Error('This save code is from a different version.');
      this.state = merge(defaults(), data);
      this.save();
    },
    reset() { this.state = defaults(); try { root.localStorage && root.localStorage.removeItem(KEY); } catch (e) { /* ignore */ } },
  };

  /* ---------------- levels ---------------- */
  const TITLES = ['Intern', 'Graduate', 'Junior Analyst', 'Analyst', 'Senior Analyst', 'Associate', 'Manager', 'Senior Manager', 'Director', 'CFO', 'Finance Legend'];
  const xpFor = (L) => 50 * L * (L - 1);
  function levelOf(xp) { return Math.max(1, Math.floor((1 + Math.sqrt(1 + (4 * xp) / 50)) / 2)); }
  function titleOf(level) { return TITLES[Math.min(level, TITLES.length) - 1]; }

  /* ---------------- achievements ---------------- */
  const ACH = [
    { id: 'first', name: 'First Blood', icon: '🩸', desc: 'Answer your first question correctly.', test: (s) => s.stats.correct >= 1 },
    { id: 'streak5', name: 'On a Roll', icon: '🔥', desc: 'Get 5 answers right in a row.', test: (s) => s.stats.bestStreak >= 5 },
    { id: 'streak10', name: 'Compounding Genius', icon: '📈', desc: 'Get 10 answers right in a row.', test: (s) => s.stats.bestStreak >= 10 },
    { id: 'flawless', name: 'Clean Audit', icon: '🧾', desc: 'Win a battle without a single mistake.', test: (s, e) => e && e.type === 'win' && e.mistakes === 0 },
    { id: 'boss', name: 'Boss Slayer', icon: '👑', desc: 'Defeat a floor boss.', test: (s, e) => e && e.type === 'win' && e.boss },
    { id: 'floor', name: 'Floor Cleared', icon: '🏢', desc: 'Earn a star on every stop of one floor.', test: (s) => root.PACKS.some((p) => p.nodes.every((n) => (s.nodes[n.id] || {}).stars > 0)) },
    { id: 'tower', name: 'Top of the Tower', icon: '🏙️', desc: 'Defeat every floor boss.', test: (s) => root.PACKS.every((p) => p.nodes.filter((n) => n.kind === 'boss').every((n) => (s.nodes[n.id] || {}).wins > 0)) },
    { id: 'stars30', name: 'Perfectionist', icon: '⭐', desc: 'Earn 3 stars on 10 different stops.', test: (s) => Object.values(s.nodes).filter((n) => n.stars >= 3).length >= 10 },
    { id: 'calc', name: 'Button Masher', icon: '🧮', desc: 'Use the calculator 10 times.', test: (s) => s.stats.calcUses >= 10 },
    { id: 'codex', name: 'Bookworm', icon: '📘', desc: 'Open the Formula Codex.', test: (s) => s.stats.codexOpens >= 1 },
    { id: 'exam80', name: 'Exam Ready', icon: '🎓', desc: 'Score 80% or more on a 20-question Boardroom exam.', test: (s) => s.stats.exams.some((x) => x.n >= 20 && x.pct >= 80) },
    { id: 'exam100', name: 'Top of the Class', icon: '🏆', desc: 'Score 100% on a Boardroom exam of 10+ questions.', test: (s) => s.stats.exams.some((x) => x.n >= 10 && x.pct >= 100) },
    { id: 'vault', name: 'Nest Egg', icon: '🏦', desc: 'Grow your savings vault to $1,000.', test: (s) => s.vault.bal >= 1000 },
    { id: 'ear', name: 'Rate Detective', icon: '🔍', desc: 'Choose the savings account with the highest EAR.', test: (s) => s.vault.best },
    { id: 'q100', name: 'Century', icon: '💯', desc: 'Answer 100 questions.', test: (s) => s.stats.answered >= 100 },
    { id: 'q500', name: 'Grinder', icon: '⚙️', desc: 'Answer 500 questions.', test: (s) => s.stats.answered >= 500 },
    { id: 'fix10', name: 'Learning From Mistakes', icon: '🩹', desc: 'Fix 10 mistakes from your Mistake Ledger.', test: (s) => s.stats.fixed >= 10 },
    { id: 'lvl10', name: 'Chief Financial Officer', icon: '💼', desc: 'Reach level 10.', test: (s) => levelOf(s.xp) >= 10 },
    { id: 'arcade', name: 'Arcade Regular', icon: '🕹️', desc: 'Play every mini-game.', test: (s) => root.PACKS.every((p) => p.nodes.filter((n) => n.kind === 'mini').every((n) => (s.nodes[n.id] || {}).plays > 0)) },
    { id: 'review', name: 'Night Shift', icon: '🌙', desc: 'Finish a Smart Review session.', test: (s) => s.stats.reviews >= 1 },
  ];

  function checkAchievements(ev) {
    const s = store.state;
    const got = [];
    ACH.forEach((a) => {
      if (s.ach[a.id]) return;
      let ok = false;
      try { ok = a.test(s, ev); } catch (e) { ok = false; }
      if (ok) { s.ach[a.id] = Date.now(); got.push(a); }
    });
    got.forEach((a, i) => setTimeout(() => { UI.toast(`<b>${a.icon} Achievement:</b> ${esc(a.name)}`, 'ach', 4200); SFX.play('levelup'); }, 600 + i * 900));
    if (got.length) store.save();
    return got;
  }

  /* ---------------- settings → document ---------------- */
  function applySettings() {
    const s = store.state.settings;
    const r = document.documentElement;
    r.style.setProperty('--fs', String(s.size));
    r.dataset.font = s.font;
    r.dataset.spacing = s.spacing;
    r.dataset.letter = s.letter;
    r.dataset.tint = s.tint;
    r.classList.toggle('no-hl', !s.hl);
    const reduce = s.motion === 'reduce' || (s.motion === 'auto' && root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
    r.classList.toggle('reduce-motion', !!reduce);
    r.classList.toggle('gt-light', s.theme === 'light');
    r.classList.toggle('gt-dark', s.theme === 'dark');
    if (s.font === 'opendyslexic' && !document.getElementById('od-font')) {
      const l = document.createElement('link');
      l.id = 'od-font'; l.rel = 'stylesheet'; l.href = 'css/opendyslexic.css';
      document.head.appendChild(l);
    }
    SFX.setEnabled(s.sound);
    // reading ruler: a soft band that follows the pointer to help keep your place in a line
    let ruler = document.getElementById('ruler');
    if (s.ruler && !ruler) {
      ruler = document.createElement('div');
      ruler.id = 'ruler';
      ruler.setAttribute('aria-hidden', 'true');
      document.body.appendChild(ruler);
      document.addEventListener('pointermove', (e) => { const r = document.getElementById('ruler'); if (r) r.style.transform = `translateY(${e.clientY - r.offsetHeight / 2}px)`; }, { passive: true });
    }
    if (ruler) ruler.hidden = !s.ruler;
  }

  /* ---------------- UI helpers ---------------- */
  const UI = {
    rich(str) { const s = store.state.settings; return RENDER.rich(str, { highlight: s.hl, name: store.state.name || 'you' }); },
    say(str) { return RENDER.speech(str, { name: store.state.name || 'you' }); },
    modalStack: [],
    modal(opts) {
      const rootEl = document.getElementById('modal-root');
      const wrap = document.createElement('div');
      wrap.className = 'modal-back' + (opts.side ? ' side' : '');
      const id = 'm' + Math.random().toString(36).slice(2, 7);
      wrap.innerHTML = `<div class="modal${opts.wide ? ' wide' : ''}${opts.cls ? ' ' + opts.cls : ''}" role="dialog" aria-modal="true" aria-labelledby="${id}">
        <header class="modal-head"><h2 id="${id}">${opts.title}</h2><button class="icon-btn" data-act="modal-close" aria-label="Close">✕</button></header>
        <div class="modal-body">${opts.body || ''}</div></div>`;
      rootEl.appendChild(wrap);
      const m = { el: wrap, body: wrap.querySelector('.modal-body'), onClose: opts.onClose, prevFocus: document.activeElement };
      UI.modalStack.push(m);
      wrap.addEventListener('mousedown', (e) => { if (e.target === wrap && !opts.sticky) UI.closeModal(m); });
      setTimeout(() => { const f = wrap.querySelector(opts.focus || 'input, button:not([data-act="modal-close"]), [tabindex]'); (f || wrap.querySelector('.modal')).focus && (f || wrap.querySelector('button')).focus(); }, 30);
      if (opts.onOpen) opts.onOpen(m);
      return m;
    },
    closeModal(m) {
      m = m || UI.modalStack[UI.modalStack.length - 1];
      if (!m) return;
      UI.modalStack = UI.modalStack.filter((x) => x !== m);
      m.el.remove();
      if (m.onClose) m.onClose();
      if (m.prevFocus && m.prevFocus.focus) try { m.prevFocus.focus(); } catch (e) { /* ignore */ }
    },
    toast(html, kind, ms) {
      const rootEl = document.getElementById('toast-root');
      const t = document.createElement('div');
      t.className = 'toast ' + (kind || '');
      t.setAttribute('role', 'status');
      t.innerHTML = html;
      rootEl.appendChild(t);
      setTimeout(() => t.classList.add('out'), ms || 2600);
      setTimeout(() => t.remove(), (ms || 2600) + 500);
    },
    speaking: false,
    speak(text) {
      const synth = root.speechSynthesis;
      if (!synth) { UI.toast('Read-aloud is not available in this browser.'); return; }
      if (UI.speaking) { synth.cancel(); UI.speaking = false; document.documentElement.classList.remove('speaking'); return; }
      const u = new root.SpeechSynthesisUtterance(text);
      u.rate = store.state.settings.rate || 0.9;
      u.lang = 'en-AU';
      const voices = synth.getVoices ? synth.getVoices() : [];
      const want = store.state.settings.voice;
      const v = voices.find((x) => x.name === want) || voices.find((x) => /en[-_]AU/i.test(x.lang)) || voices.find((x) => /^en/i.test(x.lang));
      if (v) u.voice = v;
      u.onend = u.onerror = () => { UI.speaking = false; document.documentElement.classList.remove('speaking'); };
      synth.cancel();
      UI.speaking = true;
      document.documentElement.classList.add('speaking');
      synth.speak(u);
    },
    stopSpeaking() { if (root.speechSynthesis) root.speechSynthesis.cancel(); UI.speaking = false; document.documentElement.classList.remove('speaking'); },
    confetti(opts) {
      if (document.documentElement.classList.contains('reduce-motion') || typeof root.confetti !== 'function') return;
      try { root.confetti(Object.assign({ particleCount: 90, spread: 70, origin: { y: 0.6 }, disableForReducedMotion: true, colors: ['#2451b7', '#f2c14e', '#1e8a4c', '#e0487a', '#3fa7e0'] }, opts || {})); } catch (e) { /* ignore */ }
    },
    floatText(anchor, text, cls) {
      if (!anchor) return;
      const b = anchor.getBoundingClientRect();
      const f = document.createElement('div');
      f.className = 'float-txt ' + (cls || '');
      f.textContent = text;
      f.style.left = b.left + b.width / 2 + 'px';
      f.style.top = b.top + b.height * 0.3 + 'px';
      document.body.appendChild(f);
      setTimeout(() => f.remove(), 1300);
    },
    esc,
  };

  /* ---------------- game-wide helpers ---------------- */
  const GAME = {
    store,
    get S() { return store.state; },
    UI,
    ACH,
    levelOf, titleOf, xpFor, TITLES,
    checkAchievements,
    applySettings,
    screens: {},
    actions: {},
    keyHandler: null,
    current: { name: null, params: null },
    packById(id) { return root.PACKS.find((p) => p.id === id); },
    nodeById(id) { for (const p of root.PACKS) { const n = p.nodes.find((x) => x.id === id); if (n) return { pack: p, node: n }; } return null; },
    go(name, params) {
      UI.stopSpeaking();
      if (GAME.cleanup) { try { GAME.cleanup(); } catch (e) { /* ignore */ } GAME.cleanup = null; }
      GAME.keyHandler = null;
      GAME.current = { name, params: params || {} };
      const fn = GAME.screens[name];
      if (!fn) throw new Error('No screen ' + name);
      const el = document.getElementById('screen');
      el.innerHTML = fn(params || {});
      el.dataset.screen = name;
      GAME.renderTop();
      if (GAME.after) { const a = GAME.after; GAME.after = null; a(el); }
      root.scrollTo && root.scrollTo(0, 0);
      const h = el.querySelector('h1, h2');
      if (h) { h.setAttribute('tabindex', '-1'); try { h.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    },
    refresh() { GAME.go(GAME.current.name, GAME.current.params); },
    addXP(n) {
      const s = store.state;
      const before = levelOf(s.xp);
      s.xp += Math.max(0, Math.round(n));
      const after = levelOf(s.xp);
      if (after > before) {
        setTimeout(() => { UI.toast(`<b>Promotion!</b> You are now a <b>${esc(titleOf(after))}</b> (level ${after}).`, 'level', 4200); SFX.play('levelup'); UI.confetti({ particleCount: 140 }); }, 400);
      }
      return after > before;
    },
    addCoins(n) { store.state.wallet += Math.max(0, Math.round(n)); },
    renderTop() {
      const bar = document.getElementById('topbar');
      if (!bar) return;
      const s = store.state;
      const lvl = levelOf(s.xp);
      const lo = xpFor(lvl), hi = xpFor(lvl + 1);
      const pct = Math.max(0, Math.min(100, ((s.xp - lo) / (hi - lo)) * 100));
      bar.querySelector('.tb-player').innerHTML = s.started
        ? `<span class="tb-ava" aria-hidden="true">${root.ART.avatarSVG(s.avatar)}</span><span class="tb-who"><b>${esc(s.name || 'You')}</b><small>Lv ${lvl} · ${esc(titleOf(lvl))}</small><span class="xpbar" role="progressbar" aria-label="Experience to next level" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><i style="width:${pct}%"></i></span></span>`
        : '';
      bar.querySelector('.tb-coins').innerHTML = s.started ? `<span class="coin" aria-hidden="true">$</span><span class="num">${s.wallet.toLocaleString('en-AU')}</span><span class="sr-only"> dollars</span>` : '';
    },
  };

  root.GAME = GAME;
  root.UI = UI;
})(typeof window !== 'undefined' ? window : globalThis);
