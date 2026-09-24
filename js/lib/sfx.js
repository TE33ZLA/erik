/* Corporate Ladder — tiny synthesised sound effects (Web Audio, no files). */
(function (root) {
  'use strict';
  let ctx = null, master = null, enabled = true, volume = 0.45;

  function ensure() {
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, t0, dur, type, gain, slideTo) {
    const c = ensure(); if (!c) return;
    const now = c.currentTime + (t0 || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, now);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
    const peak = gain || 0.18;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(peak, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g); g.connect(master);
    o.start(now); o.stop(now + dur + 0.03);
  }

  function noise(t0, dur, gain, freq) {
    const c = ensure(); if (!c) return;
    const now = c.currentTime + (t0 || 0);
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 1400;
    const g = c.createGain(); g.gain.value = gain || 0.2;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(now);
  }

  const N = { C4: 261.63, E4: 329.63, G4: 392.0, A4: 440, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, E6: 1318.5 };

  const SOUNDS = {
    click() { tone(660, 0, 0.05, 'triangle', 0.08); },
    correct() { tone(N.C5, 0, 0.09, 'triangle', 0.16); tone(N.E5, 0.08, 0.09, 'triangle', 0.16); tone(N.G5, 0.16, 0.16, 'triangle', 0.18); },
    wrong() { tone(220, 0, 0.18, 'sawtooth', 0.12, 140); tone(150, 0.14, 0.22, 'sawtooth', 0.1, 90); },
    hit() { noise(0, 0.16, 0.28, 1800); tone(120, 0, 0.14, 'sine', 0.3, 55); },
    crit() { noise(0, 0.22, 0.32, 2600); tone(180, 0, 0.2, 'square', 0.18, 60); tone(N.E6, 0.05, 0.12, 'triangle', 0.1); },
    hurt() { tone(300, 0, 0.12, 'square', 0.12, 120); noise(0.02, 0.12, 0.18, 900); },
    coin() { tone(N.B5, 0, 0.07, 'square', 0.1); tone(N.E6, 0.06, 0.18, 'square', 0.1); },
    buy() { tone(N.G5, 0, 0.06, 'square', 0.1); tone(N.C6, 0.05, 0.06, 'square', 0.1); noise(0.1, 0.08, 0.12, 5000); tone(N.E6, 0.12, 0.2, 'triangle', 0.08); },
    levelup() { [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(f, i * 0.09, 0.16, 'square', 0.12)); tone(N.C6, 0.36, 0.4, 'triangle', 0.14); },
    victory() { [N.G4, N.C5, N.E5, N.G5, N.E5, N.G5, N.C6].forEach((f, i) => tone(f, i * 0.1, 0.18, 'square', 0.11)); },
    defeat() { [N.G4, N.E4, N.C4].forEach((f, i) => tone(f, i * 0.18, 0.3, 'triangle', 0.14)); tone(110, 0.5, 0.6, 'sawtooth', 0.08, 70); },
    boss() { tone(70, 0, 0.9, 'sawtooth', 0.12, 45); noise(0, 0.9, 0.12, 300); },
    tick() { tone(1200, 0, 0.03, 'square', 0.05); },
    page() { noise(0, 0.08, 0.06, 3000); },
    open() { tone(N.E5, 0, 0.06, 'triangle', 0.08); tone(N.A5, 0.05, 0.1, 'triangle', 0.08); },
  };

  root.SFX = {
    play(name) { if (!enabled) return; const f = SOUNDS[name]; if (f) { try { f(); } catch (e) { /* audio can fail silently */ } } },
    unlock() { ensure(); },
    setEnabled(v) { enabled = !!v; },
    setVolume(v) { volume = v; if (master) master.gain.value = v; },
    get enabled() { return enabled; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
