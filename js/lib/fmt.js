/* Corporate Ladder — formatting + seeded randomness.
 * L.*  -> LaTeX strings (use inside \( \) or \[ \])
 * T.*  -> plain-text strings for prose and speech
 * makeRng(seed) -> deterministic random helpers so any generated question can be rebuilt from its seed.
 */
(function (root) {
  'use strict';

  function fixed(x, dp) {
    if (!Number.isFinite(x)) return String(x);
    const k = Math.pow(10, dp);
    let v = Math.round((Math.abs(x) + 1e-12) * k) / k;
    return v.toFixed(dp);
  }
  function groupDigits(intStr, sep) {
    return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  }
  function trimZeros(s) {
    return s.indexOf('.') >= 0 ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
  }
  /** core number formatter; sep = '{,}' for LaTeX or ',' for text */
  function fmtNum(x, dp, sep, trim) {
    if (!Number.isFinite(x)) return x > 0 ? '\\infty' : String(x);
    const neg = x < 0 && Math.abs(x) >= 0.5 * Math.pow(10, -dp);
    let s = fixed(x, dp);
    if (trim) s = trimZeros(s);
    const [i, d] = s.split('.');
    const body = groupDigits(i, sep) + (d !== undefined ? '.' + d : '');
    return { neg, body };
  }

  const L = {
    /** 1234.5 -> 1{,}234.50 */
    num(x, dp = 2) { const r = fmtNum(x, dp, '{,}', false); return typeof r === 'string' ? r : (r.neg ? '-' : '') + r.body; },
    /** trimmed: 1234.500 -> 1{,}234.5 (max dp decimals) */
    numT(x, dp = 4) { const r = fmtNum(x, dp, '{,}', true); return typeof r === 'string' ? r : (r.neg ? '-' : '') + r.body; },
    /** money: \$1{,}234.56 ; negative -\$1{,}234.56 */
    money(x, dp = 2) { const r = fmtNum(x, dp, '{,}', false); return typeof r === 'string' ? r : (r.neg ? '-' : '') + '\\$' + r.body; },
    moneyT(x, dp = 2) { const r = fmtNum(x, dp, '{,}', true); return typeof r === 'string' ? r : (r.neg ? '-' : '') + '\\$' + r.body; },
    /** rate (decimal) as percent: 0.1268 -> 12.68\% */
    pct(r, dp = 2) { return L.num(r * 100, dp) + '\\%'; },
    pctT(r, dp = 4) { return L.numT(r * 100, dp) + '\\%'; },
    /** rate as a decimal for substitution into formulas: 0.07 -> 0.07 */
    dec(r, dp = 6) { return L.numT(r, dp); },
    /** growth/discount factor: 1+r -> 1.07 */
    onePlus(r, dp = 6) { return L.numT(1 + r, dp); },
    /** big numbers in millions: 2.5e6 -> \$2.5\text{m} */
    mil(x, dp = 3) { return L.moneyT(x / 1e6, dp) + '\\text{m}'; },
  };

  const T = {
    num(x, dp = 2) { const r = fmtNum(x, dp, ',', false); return typeof r === 'string' ? r : (r.neg ? '−' : '') + r.body; },
    numT(x, dp = 4) { const r = fmtNum(x, dp, ',', true); return typeof r === 'string' ? r : (r.neg ? '−' : '') + r.body; },
    money(x, dp = 2) { const r = fmtNum(x, dp, ',', false); return typeof r === 'string' ? r : (r.neg ? '−' : '') + '$' + r.body; },
    moneyT(x, dp = 2) { const r = fmtNum(x, dp, ',', true); return typeof r === 'string' ? r : (r.neg ? '−' : '') + '$' + r.body; },
    pct(r, dp = 2) { return T.num(r * 100, dp) + '%'; },
    pctT(r, dp = 4) { return T.numT(r * 100, dp) + '%'; },
    mil(x, dp = 3) { return T.moneyT(x / 1e6, dp) + 'm'; },
  };

  /** Format an answer value for display in LaTeX according to its unit. */
  function answerTex(v, unit, dp) {
    switch (unit) {
      case '$': return L.money(v, dp);
      case '%': return L.num(v, dp) + '\\%';
      case 'yrs': return L.num(v, dp) + '\\text{ years}';
      case 'days': return L.num(v, dp) + '\\text{ days}';
      case 'units': return L.num(v, dp) + '\\text{ units}';
      case 'x': return L.num(v, dp) + '\\times';
      case '$m': return L.money(v, dp) + '\\text{m}';
      default: return L.num(v, dp);
    }
  }
  function answerText(v, unit, dp) {
    switch (unit) {
      case '$': return T.money(v, dp);
      case '%': return T.num(v, dp) + '%';
      case 'yrs': return T.num(v, dp) + ' years';
      case 'days': return T.num(v, dp) + ' days';
      case 'units': return T.num(v, dp) + ' units';
      case 'x': return T.num(v, dp) + '×';
      case '$m': return T.money(v, dp) + 'm';
      default: return T.num(v, dp);
    }
  }

  /* ---------- seeded RNG (mulberry32) ---------- */
  function makeRng(seed) {
    let a = (seed >>> 0) || 1;
    const next = () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const R = {
      seed,
      next,
      /** integer in [lo, hi] */
      int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
      /** multiple of `step` in [lo, hi] (floating safe) */
      step(lo, hi, step) {
        const k = Math.round((hi - lo) / step);
        const v = lo + step * Math.floor(next() * (k + 1));
        return Math.round(v * 1e10) / 1e10;
      },
      pick: (arr) => arr[Math.floor(next() * arr.length)],
      chance: (p) => next() < p,
      shuffle(arr) {
        const b = arr.slice();
        for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); const t = b[i]; b[i] = b[j]; b[j] = t; }
        return b;
      },
      sample(arr, k) { return R.shuffle(arr).slice(0, k); },
      company: () => R.pick(COMPANIES),
      person: () => R.pick(PEOPLE),
    };
    return R;
  }

  /* Fictional names for flavour text (no real companies). */
  const COMPANIES = [
    'Koala Kombucha Ltd', 'Wombat Widgets Ltd', 'Flat White Robotics', 'Yarra Yachts Ltd', 'Laneway Labs',
    'Southbank Solar', 'Brunswick Bikes', 'Magpie Motors', 'Platypus Pharma', 'Emu Energy', 'Quokka Quantum',
    'Numbat Networks', 'Bilby Bakery', 'Tram Tech Ltd', 'Lorikeet Logistics', 'Echidna Engineering',
    'Cockatoo Coffee Co', 'Dingo Drones', 'Kookaburra Kitchens', 'Possum Paints', 'Wattle Water Co',
    'Galah Games', 'Pelican Plastics', 'Seahorse Shipping', 'Banksia Batteries', 'Gumtree Grocers',
  ];
  const PEOPLE = ['Aisha', 'Ben', 'Chen', 'Divya', 'Ella', 'Farid', 'Grace', 'Hiro', 'Isla', 'Jack', 'Kiri', 'Leo',
    'Mia', 'Nikhil', 'Olivia', 'Priya', 'Quinn', 'Rosa', 'Sam', 'Tariq', 'Uma', 'Vikram', 'Wren', 'Xin', 'Yusuf', 'Zoe'];

  root.L = L;
  root.T = T;
  root.FMT = { answerTex, answerText, fixed, trimZeros, groupDigits };
  root.makeRng = makeRng;
  root.NAMES = { COMPANIES, PEOPLE };
})(typeof window !== 'undefined' ? window : globalThis);
