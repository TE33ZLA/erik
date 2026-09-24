/* Corporate Ladder — boot: event routing, top bar, live-update snapshot. */
(function (root) {
  'use strict';
  const { GAME, UI, SFX } = root;
  let booted = false;

  function bindEvents() {
    document.addEventListener('click', (ev) => {
      const el = ev.target.closest('[data-act]');
      if (!el || el.disabled) return;
      const fn = GAME.actions[el.dataset.act];
      if (!fn) return;
      if (el.tagName === 'A') ev.preventDefault();
      fn(el, ev);
    });
    document.addEventListener('submit', (ev) => {
      const f = ev.target;
      const act = f.dataset && f.dataset.submit;
      if (!act) return;
      ev.preventDefault();
      const fn = GAME.actions[act];
      if (fn) fn(f, ev);
    });
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        if (UI.modalStack.length) { ev.preventDefault(); UI.closeModal(); return; }
        if (root.CALC && root.CALC.open) { ev.preventDefault(); root.CALC.toggle(false); return; }
        if (UI.speaking) { UI.stopSpeaking(); return; }
      }
      if (GAME.keyHandler) GAME.keyHandler(ev);
    });
    document.addEventListener('pointerdown', () => SFX.unlock(), { once: true });
    if (root.matchMedia) {
      const mq = root.matchMedia('(prefers-reduced-motion: reduce)');
      if (mq.addEventListener) mq.addEventListener('change', () => GAME.applySettings());
    }
  }

  Object.assign(GAME.actions, {
    'modal-close': () => UI.closeModal(),
    'toggle-sound': (el) => {
      const s = GAME.store.state.settings;
      s.sound = !s.sound;
      GAME.applySettings(); GAME.store.save();
      el.textContent = s.sound ? '🔊' : '🔇';
      el.setAttribute('aria-pressed', String(!s.sound));
      UI.toast(s.sound ? 'Sound on' : 'Sound off');
    },
  });

  function start(hot) {
    if (booted) return;
    booted = true;
    GAME.store.load(hot && hot.state ? hot : null);
    GAME.applySettings();
    bindEvents();
    const snd = document.querySelector('[data-act="toggle-sound"]');
    if (snd) snd.textContent = GAME.store.state.settings.sound ? '🔊' : '🔇';
    if (!root.PACKS || !root.PACKS.length) { document.getElementById('screen').innerHTML = '<p class="card">The question packs failed to load. Please reload the page.</p>'; return; }
    const safeScreens = ['tower', 'floor', 'codex', 'shop', 'journal', 'stats', 'achievements', 'settings', 'exam'];
    if (!GAME.store.state.started) GAME.go('title');
    else if (hot && hot.screen && safeScreens.includes(hot.screen.name)) GAME.go(hot.screen.name, hot.screen.params);
    else GAME.go('tower');
    try {
      if (root.claude && root.claude.hot && root.claude.hot.snapshot) {
        root.claude.hot.snapshot(() => ({ state: GAME.store.state, screen: GAME.current }));
      }
    } catch (e) { /* live updates are optional */ }
    root.addEventListener('beforeunload', () => { try { root.localStorage && root.localStorage.setItem('corporate-ladder-save-v1', JSON.stringify(GAME.store.state)); } catch (e) { /* ignore */ } });
  }

  function boot() {
    const hot = root.claude && root.claude.hot;
    if (hot && typeof hot.ready === 'function') {
      try { hot.ready(start); } catch (e) { start(null); }
      setTimeout(() => start(null), 1500); // never leave the player on a blank page
    } else start(hot && hot.data ? hot.data : null);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? window : globalThis);
