/* Corporate Ladder — question core shared by the game and the validator:
 * number parsing, answer tolerance, answer checking with mistake diagnosis,
 * and multiple-choice construction for numeric questions.
 */
(function (root) {
  'use strict';
  const { FMT } = root;

  /** Parse what a player typed: "$1,234.56", "−47,350", "(47,350)", "12.68%", "1 234". */
  function parseNumber(str) {
    if (typeof str === 'number') return str;
    let s = String(str || '').trim();
    if (!s) return NaN;
    let neg = false;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
    s = s.replace(/[−–—]/g, '-').replace(/[$,\s%]/g, '').replace(/years?|yrs?|days?|units?|x$/gi, '');
    if (s.startsWith('-')) { neg = !neg; s = s.slice(1); }
    if (s.startsWith('+')) s = s.slice(1);
    if (!/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return NaN;
    const v = parseFloat(s);
    return neg ? -v : v;
  }

  function display(v, q) { return FMT.answerText(v, q.unit || '', q.dp === undefined ? 2 : q.dp); }

  /** A listed mistake this close to the answer is a rounding difference, not a different method:
   *  it is never offered as a distractor and never narrows the acceptance window. */
  function nearMiss(q, v) {
    const dp = q.dp === undefined ? 2 : q.dp;
    return Math.abs(v - q.answer) < Math.max(2.01 * Math.pow(10, -dp), Math.abs(q.answer) * 0.0005);
  }

  /** Acceptance window for a numeric answer. Never wide enough to accept a listed mistake. */
  function tolerance(q) {
    const dp = q.dp === undefined ? 2 : q.dp;
    const floor = 0.5 * Math.pow(10, -dp);
    let tol = q.tol !== undefined ? q.tol : Math.max(1.01 * Math.pow(10, -dp), Math.abs(q.answer) * 0.001);
    (q.mistakes || []).forEach((m) => {
      const d = Math.abs(m.v - q.answer);
      if (d > floor && !nearMiss(q, m.v)) tol = Math.min(tol, Math.max(floor, 0.4 * d));
    });
    return Math.max(tol, floor * 1.0001);
  }

  /** Check a typed answer. Returns {ok, invalid, note, mistake}. */
  function checkNumeric(input, q) {
    const v = parseNumber(input);
    if (!Number.isFinite(v)) return { ok: false, invalid: true, note: 'Type a number, for example 1234.56' };
    const tol = tolerance(q);
    const a = q.answer;
    if (Math.abs(v - a) <= tol) return { ok: true, value: v };
    if (q.unit === '%' && Math.abs(v * 100 - a) <= tol && Math.abs(a) >= 0.5) return { ok: true, value: v * 100, note: 'Correct. Next time type it as a percentage, e.g. ' + display(a, q) };
    if (q.unit === '$m' && Math.abs(v / 1e6 - a) <= tol) return { ok: true, value: v / 1e6, note: 'Correct. This answer is in millions, e.g. ' + display(a, q) };
    // diagnose
    let best = null, bestD = Infinity;
    (q.mistakes || []).forEach((m) => {
      const d = Math.abs(v - m.v);
      const mt = Math.max(0.5 * Math.pow(10, -(q.dp === undefined ? 2 : q.dp)), Math.abs(m.v) * 0.001);
      if (d <= mt && d < bestD) { best = m; bestD = d; }
    });
    if (best) return { ok: false, value: v, mistake: best, note: best.why };
    if (a !== 0 && Math.abs(-v - a) <= tol) return { ok: false, value: v, note: 'Right size, wrong sign. Check whether the answer should be negative or positive.' };
    return { ok: false, value: v };
  }

  /** Build 4 answer options for a numeric question: the answer plus plausible distractors. */
  function buildChoices(q, rng) {
    const dp = q.dp === undefined ? 2 : q.dp;
    const tol = tolerance(q);
    const shown = new Set([display(q.answer, q)]);
    const out = [{ v: q.answer, correct: true }];
    const add = (v, why) => {
      if (!Number.isFinite(v) || out.length >= 4) return;
      if (Math.abs(v - q.answer) <= tol || nearMiss(q, v)) return;
      if (Math.abs(q.answer) > 0 && Math.abs(v) > 50 * Math.abs(q.answer) + 10) return; // absurd
      const d = display(v, q);
      if (shown.has(d)) return;
      shown.add(d);
      out.push({ v, why });
    };
    (q.mistakes || []).forEach((m) => add(m.v, m.why));
    const a = q.answer;
    const bumps = q.unit === '%' ? [0.5, -0.5, 1, -1, 1.5, -1.5, 2, -2].map((x) => a + x * (Math.abs(a) > 20 ? 2 : 1))
      : [1.08, 0.92, 1.15, 0.85, 1.25, 0.8, 1.35, 0.7].map((k) => a * k + (a === 0 ? k : 0));
    const order = rng ? rng.shuffle(bumps) : bumps;
    for (const b of order) {
      const rounded = Math.round(b * Math.pow(10, dp)) / Math.pow(10, dp);
      add(rounded, null);
    }
    const final = rng ? rng.shuffle(out) : out;
    return { options: final.map((o) => ({ v: o.v, text: display(o.v, q), tex: FMT.answerTex(o.v, q.unit || '', dp), why: o.why || null, correct: !!o.correct })), answer: final.findIndex((o) => o.correct) };
  }

  root.QCORE = { parseNumber, tolerance, nearMiss, checkNumeric, buildChoices, display };
})(typeof window !== 'undefined' ? window : globalThis);
