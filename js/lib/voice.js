/* Corporate Ladder — read-aloud voices.
 * Browsers offer very different voices. The newest ones (Microsoft Edge "Natural" voices, Apple "Premium" and
 * "Enhanced" voices, Google voices) sound close to a real person; the old built-in ones sound robotic.
 * rank() scores each voice so "Automatic" picks the most human-sounding English voice (Australian first),
 * and speak() reads one sentence at a time, which sounds smoother and avoids Chrome cutting long text off.
 */
(function (root) {
  'use strict';

  // Old or novelty voices that sound robotic (macOS novelty voices, Windows desktop voices, eSpeak).
  const NOVELTY = /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|junior|kathy|organ|princess|ralph|superstar|trinoids|whisper|wobble|zarvox|fred|agnes|bruce|vicki|victoria)\b/i;
  const QUIRKY = /\b(eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley)\b/i;

  function langScore(lang) {
    const l = String(lang || '').replace('_', '-').toLowerCase();
    if (!l.startsWith('en')) return -1000;
    if (l === 'en-au') return 12;
    if (l === 'en-gb') return 8;
    if (l === 'en-nz' || l === 'en-ie') return 6;
    if (l === 'en-us') return 5;
    return 2;
  }

  const ANDROID = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent || '');

  /** How natural a voice sounds: 60 and above counts as "natural". env: {android} (for tests). */
  function rank(v, env) {
    const android = env && 'android' in env ? env.android : ANDROID;
    const name = String(v.name || '');
    let s = langScore(v.lang);
    if (s < 0) return s;
    if (android) s += 50;                                  // Android voices come from Google's speech engine
    if (/natural|neural/i.test(name)) s += 100;           // Microsoft Edge online neural voices
    else if (/\(premium\)/i.test(name)) s += 90;           // Apple, downloaded
    else if (/siri/i.test(name)) s += 85;
    else if (/\(enhanced\)/i.test(name)) s += 80;          // Apple, downloaded
    else if (/-network\b|network/i.test(name)) s += 65;    // Android Google voices that stream
    else if (/^google\b/i.test(name)) s += 62;             // Chrome's Google voices
    else if (/-local\b/i.test(name)) s += 40;              // Android Google voices on the device
    if (NOVELTY.test(name)) s -= 120;
    else if (QUIRKY.test(name)) s -= 40;
    else if (/^microsoft\b/i.test(name) && !/natural|neural|online/i.test(name)) s -= 30;   // Windows desktop voices
    if (/espeak/i.test(name)) s -= 80;
    if (v.localService === false) s += 4;
    if (v.default) s += 1;
    return s;
  }
  const isNatural = (v) => rank(v) >= 60;

  /** English voices, most natural first. */
  function list(voices) {
    return (voices || []).filter((v) => langScore(v.lang) >= 0).map((v) => ({ v, r: rank(v) }))
      .sort((a, b) => b.r - a.r || String(a.v.name).localeCompare(String(b.v.name))).map((x) => x.v);
  }
  function best(voices) { return list(voices)[0] || null; }

  /** A short, friendly name for a voice: "Natasha (Australian, natural)". */
  const ACCENT = { 'en-au': 'Australian', 'en-gb': 'British', 'en-us': 'American', 'en-nz': 'New Zealand', 'en-ie': 'Irish', 'en-in': 'Indian', 'en-za': 'South African', 'en-ca': 'Canadian' };
  function label(v) {
    if (!v) return '';
    let n = String(v.name).replace(/^Microsoft\s+/i, '').replace(/\s+Online\s*\((Natural|Neural)\)/i, '').replace(/\s*-\s*English.*$/i, '')
      .replace(/\s*\((Premium|Enhanced)\)/i, '').trim();
    const acc = ACCENT[String(v.lang || '').replace('_', '-').toLowerCase()] || v.lang;
    const q = /natural|neural/i.test(v.name) ? 'natural' : /premium/i.test(v.name) ? 'premium' : /enhanced/i.test(v.name) ? 'enhanced' : isNatural(v) ? 'good' : 'older style';
    return `${n} (${acc}, ${q})`;
  }

  /** Split text into sentence-sized pieces (long sentences split at commas). */
  function chunks(text, max) {
    max = max || 220;
    const out = [];
    // (no look-behind in these patterns: older Safari cannot parse it)
    String(text || '').replace(/\s+/g, ' ').trim().replace(/([.!?…;:])\s+(?=\S)/g, '$1\u0000').split('\u0000').forEach((sent) => {
      if (sent.length <= max) { if (sent) out.push(sent); return; }
      let cur = '';
      sent.replace(/,\s+/g, ',\u0000').split('\u0000').forEach((part) => {
        if (cur && (cur + ' ' + part).length > max) { out.push(cur); cur = part; } else cur = cur ? cur + ' ' + part : part;
      });
      if (cur) out.push(cur);
    });
    return out;
  }

  /* ---------------- speaking (browser only) ---------------- */
  let gen = 0;
  function synth() { return root.speechSynthesis || null; }
  function voices() { const s = synth(); return (s && s.getVoices && s.getVoices()) || []; }
  function pick(wanted) {
    const all = voices();
    return (wanted && all.find((x) => x.name === wanted)) || best(all);
  }
  /** Speak text. opts: {voice (name), rate, onend}. Returns false when read-aloud is unavailable. */
  function speak(text, opts) {
    const s = synth();
    if (!s || !root.SpeechSynthesisUtterance) return false;
    opts = opts || {};
    const my = ++gen;
    s.cancel();
    const v = pick(opts.voice);
    const parts = chunks(text);
    if (!parts.length) { if (opts.onend) opts.onend(); return true; }
    parts.forEach((p, i) => {
      const u = new root.SpeechSynthesisUtterance(p);
      u.rate = opts.rate || 0.95;
      u.pitch = 1;
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-AU';
      if (i === parts.length - 1) u.onend = () => { if (my === gen && opts.onend) opts.onend(); };
      u.onerror = (e) => { if (my === gen && e && e.error !== 'interrupted' && e.error !== 'canceled' && opts.onend) opts.onend(); };
      s.speak(u);
    });
    return true;
  }
  function stop() { gen++; const s = synth(); if (s) s.cancel(); }
  /** Run fn now and whenever the browser finishes loading its voices (one listener at a time). */
  function onVoices(fn) {
    const s = synth();
    fn();
    if (s) s.onvoiceschanged = fn;
  }
  // Chrome loads its voice list lazily: ask early so the best voice is ready for the first read.
  if (synth() && synth().getVoices) try { synth().getVoices(); } catch (e) { /* ignore */ }

  root.VOICE = { rank, isNatural, list, best, label, chunks, speak, stop, voices, pick, onVoices };
})(typeof window !== 'undefined' ? window : globalThis);
