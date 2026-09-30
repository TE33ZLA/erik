/* Corporate Ladder — a small Excel: formulas, a sheet, and how it is drawn.
 * Every value on screen is computed here from the formulas, so what the player sees always matches Excel.
 *
 * A sheet spec:
 *   { title, rows: [[cell, ...], ...], at: 'A1',             rows start at this cell (default A1)
 *     fmt: { 'B2:F2': '$', 'B7': '%' },                       display formats: '$' '%' '0' '0.00' '0.0000' 'x'
 *     bold: ['A1:F1'], hl: ['B9'], answer: 'B9', unit: '%',   the answer cell (checked by the validator)
 *     steps: [{ t: 'Type the years in row 1.', cells: 'A1:F1' }, ...],
 *     goal: { set: 'B3', to: 0, change: 'B1' } }             a Goal Seek step (solved here)
 *   cell = number | 'text' | '=FORMULA' | null | { v, f: fmt, b: bold }
 */
(function (root) {
  'use strict';

  /* ================= addresses ================= */
  function colNum(letters) { let n = 0; for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64); return n; }
  function colName(n) { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  function parseAddr(a) {
    const m = /^\$?([A-Z]{1,3})\$?(\d+)$/.exec(String(a).toUpperCase());
    if (!m) throw new Error('bad address ' + a);
    return { c: colNum(m[1]), r: +m[2] };
  }
  function addr(c, r) { return colName(c) + r; }
  function rangeCells(ref) {
    const [a, b] = String(ref).toUpperCase().split(':');
    const p = parseAddr(a), q = parseAddr(b || a);
    const out = [];
    for (let r = Math.min(p.r, q.r); r <= Math.max(p.r, q.r); r++) {
      const row = [];
      for (let c = Math.min(p.c, q.c); c <= Math.max(p.c, q.c); c++) row.push(addr(c, r));
      out.push(row);
    }
    return out;
  }

  /* ================= errors and values ================= */
  const ERR = (code) => ({ err: code });
  const isErr = (v) => v && typeof v === 'object' && !Array.isArray(v) && v.err;
  function flat(args) {
    const out = [];
    const walk = (v, fromRange) => {
      if (Array.isArray(v)) v.forEach((x) => walk(x, true));
      else out.push({ v, fromRange });
    };
    args.forEach((a) => walk(a, false));
    return out;
  }
  function nums(args) {
    const out = [];
    for (const { v, fromRange } of flat(args)) {
      if (isErr(v)) throw v;
      if (typeof v === 'number') out.push(v);
      else if (!fromRange && typeof v === 'boolean') out.push(v ? 1 : 0);
      else if (!fromRange && typeof v === 'string' && v !== '' && !isNaN(+v)) out.push(+v);
    }
    return out;
  }
  function num(v) {
    if (isErr(v)) throw v;
    if (Array.isArray(v)) return num(v[0] && Array.isArray(v[0]) ? v[0][0] : v[0]);
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'number') return v;
    if (!isNaN(+v)) return +v;
    throw ERR('#VALUE!');
  }

  /* ================= finance and statistics functions (Excel's definitions) ================= */
  function tvmZero(rate, nper, pmt, pv, fv, type) {
    if (Math.abs(rate) < 1e-12) return pv + pmt * nper + fv;
    const g = Math.pow(1 + rate, nper);
    return pv * g + pmt * (1 + rate * type) * (g - 1) / rate + fv;
  }
  const FIN = {
    PV(rate, nper, pmt, fv, type) { fv = fv || 0; type = type ? 1 : 0; if (Math.abs(rate) < 1e-12) return -(fv + pmt * nper); const g = Math.pow(1 + rate, nper); return -(fv + pmt * (1 + rate * type) * (g - 1) / rate) / g; },
    FV(rate, nper, pmt, pv, type) { pv = pv || 0; type = type ? 1 : 0; if (Math.abs(rate) < 1e-12) return -(pv + pmt * nper); const g = Math.pow(1 + rate, nper); return -(pv * g + pmt * (1 + rate * type) * (g - 1) / rate); },
    PMT(rate, nper, pv, fv, type) { fv = fv || 0; type = type ? 1 : 0; if (Math.abs(rate) < 1e-12) return -(pv + fv) / nper; const g = Math.pow(1 + rate, nper); return -(pv * g + fv) * rate / ((1 + rate * type) * (g - 1)); },
    NPER(rate, pmt, pv, fv, type) {
      fv = fv || 0; type = type ? 1 : 0;
      if (Math.abs(rate) < 1e-12) return -(pv + fv) / pmt;
      const a = pmt * (1 + rate * type) / rate;
      const x = (a - fv) / (a + pv);
      if (x <= 0) throw ERR('#NUM!');
      return Math.log(x) / Math.log(1 + rate);
    },
    RATE(nper, pmt, pv, fv, type, guess) {
      fv = fv || 0; type = type ? 1 : 0;
      const f = (r) => tvmZero(r, nper, pmt, pv, fv, type);
      return solve1(f, guess === undefined ? 0.1 : guess, -0.99, 10);
    },
    NPV(rate, values) { return values.reduce((s, v, i) => s + v / Math.pow(1 + rate, i + 1), 0); },
    IRR(values, guess) {
      const f = (r) => values.reduce((s, v, i) => s + v / Math.pow(1 + r, i), 0);
      return solve1(f, guess === undefined ? 0.1 : guess, -0.99, 10);
    },
  };
  /** Find a root: Newton from the guess, then bisection over [lo, hi] if Newton fails. */
  function solve1(f, guess, lo, hi) {
    let x = guess;
    for (let k = 0; k < 60; k++) {
      const y = f(x);
      if (!Number.isFinite(y)) break;
      if (Math.abs(y) < 1e-10) return x;
      const h = Math.max(1e-7, Math.abs(x) * 1e-7);
      const d = (f(x + h) - y) / h;
      if (!Number.isFinite(d) || d === 0) break;
      const nx = x - y / d;
      if (!Number.isFinite(nx)) break;
      if (Math.abs(nx - x) < 1e-12) return nx;
      x = nx;
    }
    // bisection: scan for a sign change
    const steps = 400;
    let a = lo, fa = f(a);
    for (let k = 1; k <= steps; k++) {
      const b = lo + (hi - lo) * k / steps, fb = f(b);
      if (Number.isFinite(fa) && Number.isFinite(fb) && fa * fb <= 0) {
        let x0 = a, x1 = b, f0 = fa;
        for (let it = 0; it < 200; it++) {
          const m = (x0 + x1) / 2, fm = f(m);
          if (f0 * fm <= 0) x1 = m; else { x0 = m; f0 = fm; }
        }
        return (x0 + x1) / 2;
      }
      a = b; fa = fb;
    }
    throw ERR('#NUM!');
  }
  const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  const varS = (a) => { if (a.length < 2) throw ERR('#DIV/0!'); const m = mean(a); return a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1); };
  const varP = (a) => { const m = mean(a); return a.reduce((s, x) => s + (x - m) * (x - m), 0) / a.length; };
  function pairs(a, b) {
    const x = flat([a]).map((o) => o.v), y = flat([b]).map((o) => o.v);
    if (x.length !== y.length) throw ERR('#N/A');
    const px = [], py = [];
    x.forEach((v, i) => { if (typeof v === 'number' && typeof y[i] === 'number') { px.push(v); py.push(y[i]); } });
    return [px, py];
  }
  const cov = (x, y, sample) => { const mx = mean(x), my = mean(y); return x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0) / (x.length - (sample ? 1 : 0)); };

  function broadcast(a, b, fn) {
    const A = Array.isArray(a), B = Array.isArray(b);
    if (!A && !B) return fn(a, b);
    const rowsA = A ? a : null, rowsB = B ? b : null;
    const R = A ? a.length : b.length, C = A ? a[0].length : b[0].length;
    const out = [];
    for (let r = 0; r < R; r++) {
      const row = [];
      for (let c = 0; c < C; c++) {
        const x = A ? (rowsA[r] || [])[c] : a, y = B ? (rowsB[r] || [])[c] : b;
        try { row.push(fn(x, y)); } catch (e) { row.push(isErr(e) ? e : ERR('#VALUE!')); }
      }
      out.push(row);
    }
    return out;
  }
  const FUNCS = {
    SUM: (a) => nums(a).reduce((s, x) => s + x, 0),
    AVERAGE: (a) => { const n = nums(a); if (!n.length) throw ERR('#DIV/0!'); return mean(n); },
    MIN: (a) => Math.min(...nums(a)),
    MAX: (a) => Math.max(...nums(a)),
    COUNT: (a) => nums(a).length,
    PRODUCT: (a) => nums(a).reduce((s, x) => s * x, 1),
    ABS: (a) => Math.abs(num(a[0])),
    SQRT: (a) => { const x = num(a[0]); if (x < 0) throw ERR('#NUM!'); return Math.sqrt(x); },
    EXP: (a) => Math.exp(num(a[0])),
    LN: (a) => { const x = num(a[0]); if (x <= 0) throw ERR('#NUM!'); return Math.log(x); },
    LOG10: (a) => Math.log10(num(a[0])),
    LOG: (a) => Math.log(num(a[0])) / Math.log(a.length > 1 ? num(a[1]) : 10),
    POWER: (a) => Math.pow(num(a[0]), num(a[1])),
    ROUND: (a) => { const d = a.length > 1 ? num(a[1]) : 0, k = Math.pow(10, d); return Math.round(num(a[0]) * k + (num(a[0]) >= 0 ? 1e-9 : -1e-9)) / k; },
    SUMPRODUCT: (a) => {
      const arrs = a.map((x) => flat([x]).map((o) => (typeof o.v === 'number' ? o.v : isErr(o.v) ? (() => { throw o.v; })() : 0)));
      const n = arrs[0].length;
      if (arrs.some((x) => x.length !== n)) throw ERR('#VALUE!');
      let s = 0;
      for (let i = 0; i < n; i++) s += arrs.reduce((p, x) => p * x[i], 1);
      return s;
    },
    NPV: (a) => FIN.NPV(num(a[0]), nums(a.slice(1))),
    IRR: (a) => FIN.IRR(nums([a[0]]), a.length > 1 ? num(a[1]) : undefined),
    PV: (a) => FIN.PV(num(a[0]), num(a[1]), num(a[2]), a.length > 3 ? num(a[3]) : 0, a.length > 4 ? num(a[4]) : 0),
    FV: (a) => FIN.FV(num(a[0]), num(a[1]), num(a[2]), a.length > 3 ? num(a[3]) : 0, a.length > 4 ? num(a[4]) : 0),
    PMT: (a) => FIN.PMT(num(a[0]), num(a[1]), num(a[2]), a.length > 3 ? num(a[3]) : 0, a.length > 4 ? num(a[4]) : 0),
    NPER: (a) => FIN.NPER(num(a[0]), num(a[1]), num(a[2]), a.length > 3 ? num(a[3]) : 0, a.length > 4 ? num(a[4]) : 0),
    RATE: (a) => FIN.RATE(num(a[0]), num(a[1]), num(a[2]), a.length > 3 ? num(a[3]) : 0, a.length > 4 ? num(a[4]) : 0, a.length > 5 ? num(a[5]) : undefined),
    EFFECT: (a) => { const n = Math.trunc(num(a[1])); return Math.pow(1 + num(a[0]) / n, n) - 1; },
    NOMINAL: (a) => { const n = Math.trunc(num(a[1])); return n * (Math.pow(1 + num(a[0]), 1 / n) - 1); },
    'STDEV.S': (a) => Math.sqrt(varS(nums(a))),
    STDEV: (a) => Math.sqrt(varS(nums(a))),
    'STDEV.P': (a) => Math.sqrt(varP(nums(a))),
    'VAR.S': (a) => varS(nums(a)),
    VAR: (a) => varS(nums(a)),
    'VAR.P': (a) => varP(nums(a)),
    'COVARIANCE.S': (a) => { const [x, y] = pairs(a[0], a[1]); return cov(x, y, true); },
    'COVARIANCE.P': (a) => { const [x, y] = pairs(a[0], a[1]); return cov(x, y, false); },
    COVAR: (a) => { const [x, y] = pairs(a[0], a[1]); return cov(x, y, false); },
    CORREL: (a) => { const [x, y] = pairs(a[0], a[1]); return cov(x, y, true) / Math.sqrt(varS(x) * varS(y)); },
    SLOPE: (a) => { const [y, x] = pairs(a[0], a[1]); return cov(x, y, true) / varS(x); },
    IF: (a) => (truthy(a[0]) ? (a.length > 1 ? a[1] : true) : (a.length > 2 ? a[2] : false)),
    AND: (a) => flat(a).every((o) => truthy(o.v)),
    OR: (a) => flat(a).some((o) => truthy(o.v)),
    NOT: (a) => !truthy(a[0]),
  };
  function truthy(v) { if (isErr(v)) throw v; if (Array.isArray(v)) return truthy(v[0][0]); return typeof v === 'string' ? v.length > 0 : !!v; }

  /* ================= formula parser (Excel precedence: - % ^ * / + - & comparisons) ================= */
  function tokenize(src) {
    const s = String(src);
    const out = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      let m;
      if ((m = /^"([^"]*)"/.exec(s.slice(i)))) { out.push({ k: 'str', v: m[1] }); i += m[0].length; continue; }
      if ((m = /^\$?[A-Za-z]{1,3}\$?\d+(:\$?[A-Za-z]{1,3}\$?\d+)?(?![A-Za-z0-9_.(])/.exec(s.slice(i)))) { out.push({ k: 'ref', v: m[0].toUpperCase().replace(/\$/g, '') , raw: m[0] }); i += m[0].length; continue; }
      if ((m = /^(\d+\.?\d*|\.\d+)(E[-+]?\d+)?/i.exec(s.slice(i)))) { out.push({ k: 'num', v: parseFloat(m[0]), raw: m[0] }); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(s.slice(i)))) { out.push({ k: 'name', v: m[0].toUpperCase(), raw: m[0] }); i += m[0].length; continue; }
      if ((m = /^(<=|>=|<>)/.exec(s.slice(i)))) { out.push({ k: m[0] }); i += 2; continue; }
      if ('+-*/^%&(),=<>'.includes(c)) { out.push({ k: c }); i++; continue; }
      throw ERR('#NAME?');
    }
    return out;
  }
  function parseFormula(src) {
    const t = tokenize(src.replace(/^=/, ''));
    let p = 0;
    const is = (k) => t[p] && t[p].k === k;
    const eat = (k) => { if (is(k)) { p++; return true; } return false; };
    function cmp() {
      let a = concat();
      while (t[p] && ['=', '<>', '<', '>', '<=', '>='].includes(t[p].k)) { const op = t[p++].k; a = { t: 'bin', op, a, b: concat() }; }
      return a;
    }
    function concat() { let a = add(); while (eat('&')) a = { t: 'bin', op: '&', a, b: add() }; return a; }
    function add() { let a = mul(); while (is('+') || is('-')) { const op = t[p++].k; a = { t: 'bin', op, a, b: mul() }; } return a; }
    function mul() { let a = pow(); while (is('*') || is('/')) { const op = t[p++].k; a = { t: 'bin', op, a, b: pow() }; } return a; }
    function pow() { let a = neg(); while (eat('^')) a = { t: 'bin', op: '^', a, b: neg() }; return a; }
    function neg() { if (eat('-')) return { t: 'neg', a: neg() }; if (eat('+')) return neg(); return pct(); }
    function pct() { let a = prim(); while (eat('%')) a = { t: 'pct', a }; return a; }
    function prim() {
      const tok = t[p++];
      if (!tok) throw ERR('#VALUE!');
      if (tok.k === 'num') return { t: 'num', v: tok.v };
      if (tok.k === 'str') return { t: 'str', v: tok.v };
      if (tok.k === 'ref') return { t: 'ref', v: tok.v };
      if (tok.k === 'name') {
        if (tok.v === 'TRUE' || tok.v === 'FALSE') return { t: 'bool', v: tok.v === 'TRUE' };
        if (!eat('(')) throw ERR('#NAME?');
        const args = [];
        if (!is(')')) {
          do { args.push(is(',') || is(')') ? { t: 'empty' } : cmp()); } while (eat(','));
        }
        if (!eat(')')) throw ERR('#VALUE!');
        if (!FUNCS[tok.v]) throw ERR('#NAME?');
        return { t: 'fn', f: tok.v, args };
      }
      if (tok.k === '(') { const a = cmp(); if (!eat(')')) throw ERR('#VALUE!'); return { t: 'par', a }; }
      throw ERR('#VALUE!');
    }
    const ast = cmp();
    if (p < t.length) throw ERR('#VALUE!');
    return ast;
  }

  /* ================= a sheet ================= */
  function norm(cell) {
    if (cell === null || cell === undefined || cell === '') return null;
    if (typeof cell === 'object' && !Array.isArray(cell)) return cell;
    return { v: cell };
  }
  function build(spec) {
    const start = parseAddr(spec.at || 'A1');
    const cells = {};
    let maxC = start.c, maxR = start.r;
    (spec.rows || []).forEach((row, ri) => row.forEach((raw, ci) => {
      const c = norm(raw);
      if (!c) return;
      const a = addr(start.c + ci, start.r + ri);
      cells[a] = Object.assign({}, c);
      maxC = Math.max(maxC, start.c + ci); maxR = Math.max(maxR, start.r + ri);
    }));
    const eachIn = (list, fn) => [].concat(list || []).forEach((ref) => rangeCells(ref).flat().forEach(fn));
    Object.entries(spec.fmt || {}).forEach(([ref, f]) => eachIn(ref, (a) => { if (cells[a]) cells[a].f = cells[a].f || f; }));
    eachIn(spec.bold, (a) => { if (cells[a]) cells[a].b = true; });
    const sheet = { spec, cells, cols: maxC, rows: maxR, c0: start.c, r0: start.r, values: {} };
    compute(sheet);
    if (spec.goal) goalSeek(sheet, spec.goal);
    return sheet;
  }
  function compute(sheet) {
    sheet.values = {};
    const busy = new Set();
    const get = (a) => {
      if (a in sheet.values) return sheet.values[a];
      const c = sheet.cells[a];
      if (!c) return null;
      if (typeof c.v === 'string' && c.v.startsWith('=')) {
        if (busy.has(a)) return ERR('#CIRC');
        busy.add(a);
        let v;
        try { v = evalAst(c.ast || (c.ast = parseFormula(c.v)), get); if (Array.isArray(v)) v = v[0][0]; }
        catch (e) { v = isErr(e) ? e : ERR('#VALUE!'); }
        if (typeof v === 'number' && !Number.isFinite(v)) v = ERR('#NUM!');
        busy.delete(a);
        sheet.values[a] = v;
        return v;
      }
      sheet.values[a] = c.v;
      return c.v;
    };
    sheet.get = get;
    Object.keys(sheet.cells).forEach(get);
  }
  function evalAst(n, get) {
    switch (n.t) {
      case 'num': case 'str': case 'bool': return n.v;
      case 'empty': return undefined;
      case 'par': return evalAst(n.a, get);
      case 'ref': {
        if (!n.v.includes(':')) { const v = get(n.v); return v === null ? 0 : v; }
        return rangeCells(n.v).map((row) => row.map((a) => get(a)));
      }
      case 'neg': { const v = evalAst(n.a, get); return Array.isArray(v) ? broadcast(v, 0, (x) => -num(x)) : -num(v); }
      case 'pct': { const v = evalAst(n.a, get); return Array.isArray(v) ? broadcast(v, 0, (x) => num(x) / 100) : num(v) / 100; }
      case 'fn': return FUNCS[n.f](n.args.map((x) => (x.t === 'empty' ? undefined : evalAst(x, get))).filter((x, i, arr) => !(x === undefined && i === arr.length - 1)));
      case 'bin': {
        const a = evalAst(n.a, get), b = evalAst(n.b, get);
        const op = n.op;
        return broadcast(a, b, (x, y) => {
          if (isErr(x)) throw x; if (isErr(y)) throw y;
          if (op === '&') return String(x == null ? '' : x) + String(y == null ? '' : y);
          if (['=', '<>', '<', '>', '<=', '>='].includes(op)) {
            const X = typeof x === 'string' ? x : num(x), Y = typeof y === 'string' ? y : num(y);
            return op === '=' ? X === Y : op === '<>' ? X !== Y : op === '<' ? X < Y : op === '>' ? X > Y : op === '<=' ? X <= Y : X >= Y;
          }
          const X = num(x), Y = num(y);
          if (op === '+') return X + Y;
          if (op === '-') return X - Y;
          if (op === '*') return X * Y;
          if (op === '/') { if (Y === 0) throw ERR('#DIV/0!'); return X / Y; }
          return Math.pow(X, Y);
        });
      }
      default: throw ERR('#VALUE!');
    }
  }
  /** Goal Seek: change one input cell until a formula cell reaches a target. */
  function goalSeek(sheet, g) {
    const cell = sheet.cells[g.change] || (sheet.cells[g.change] = { v: 0 });
    const start = typeof cell.v === 'number' ? cell.v : 0.1;
    const f = (x) => { cell.v = x; compute(sheet); return num(sheet.get(g.set)) - (g.to || 0); };
    let x;
    try { x = solve1(f, start || 0.1, g.lo === undefined ? -1e6 : g.lo, g.hi === undefined ? 1e6 : g.hi); }
    catch (e) { x = NaN; }
    cell.v = Number.isFinite(x) ? x : start;
    cell.sought = true;
    compute(sheet);
  }
  function value(sheet, a) { return sheet.get(String(a).toUpperCase()); }

  /* ================= display ================= */
  function groupInt(s) { return s.replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function fixed(v, dp, commas) { const s = Math.abs(v).toFixed(dp); const [i, d] = s.split('.'); return (v < 0 && +s !== 0 ? '-' : '') + (commas ? groupInt(i) : i) + (d ? '.' + d : ''); }
  function format(v, f) {
    if (v === null || v === undefined) return '';
    if (isErr(v)) return v.err;
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v === 'string') return v;
    if (!Number.isFinite(v)) return '#NUM!';
    if (f === '$') return fixed(v, 2, true);
    if (f === '%') return fixed(v * 100, 2, false) + '%';
    if (f === '%1') return fixed(v * 100, 1, false) + '%';
    if (f === '%4') return fixed(v * 100, 4, false) + '%';
    if (f === '0') return fixed(v, 0, true);
    if (f === '0.00') return fixed(v, 2, false);
    if (f === '0.0000') return fixed(v, 4, false);
    if (f === 'x') return String(+v.toFixed(4));
    // General: up to 10 significant figures, no thousands separators
    if (Math.abs(v) >= 1e11 || (Math.abs(v) < 1e-6 && v !== 0)) return v.toExponential(4).toUpperCase();
    return String(+v.toPrecision(10));
  }
  function display(sheet, a) {
    const c = sheet.cells[a];
    if (!c) return '';
    return format(sheet.get(a), c.f);
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }
  const rich = (s) => (root.RENDER && root.RENDER.rich ? root.RENDER.rich(s) : esc(s));

  /** HTML for a sheet spec. opts: {title, formulas: start in formula view, id} */
  function html(spec, opts) {
    opts = opts || {};
    const sh = spec.cells ? spec : build(spec);
    const S = sh.spec;
    const hl = new Set();
    [].concat(S.hl || [], S.answer || []).forEach((ref) => rangeCells(ref).flat().forEach((a) => hl.add(a)));
    const head = `<tr><th class="xl-corner" aria-hidden="true"></th>${Array.from({ length: sh.cols - sh.c0 + 1 }, (_, k) => `<th scope="col">${colName(sh.c0 + k)}</th>`).join('')}</tr>`;
    let body = '';
    for (let r = sh.r0; r <= sh.rows; r++) {
      let tds = '';
      for (let c = sh.c0; c <= sh.cols; c++) {
        const a = addr(c, r), cell = sh.cells[a];
        if (!cell) { tds += `<td data-a="${a}"></td>`; continue; }
        const isF = typeof cell.v === 'string' && cell.v.startsWith('=');
        const val = display(sh, a);
        const numeric = typeof sh.get(a) === 'number';
        const cls = [numeric ? 'n' : 't', isF ? 'fx' : '', cell.b ? 'b' : '', hl.has(a) ? 'hl' : '', cell.sought ? 'sought' : ''].filter(Boolean).join(' ');
        const shownF = isF ? cell.v : (typeof cell.v === 'number' ? format(cell.v, cell.f === '%' || cell.f === '%1' || cell.f === '%4' ? cell.f : null) : String(cell.v));
        tds += `<td data-a="${a}" class="${cls}" data-act="xl-cell" data-f="${esc(shownF)}" tabindex="0"><span class="xl-v">${esc(val)}</span>${isF ? `<span class="xl-f">${esc(cell.v)}</span>` : ''}</td>`;
      }
      body += `<tr><th scope="row">${r}</th>${tds}</tr>`;
    }
    const steps = (S.steps || []).length ? `<ol class="xl-steps">${S.steps.map((st) => `<li${st.cells ? ` data-act="xl-step" tabindex="0" data-cells="${esc([].concat(st.cells).join(' '))}"` : ''}>${rich(st.t)}</li>`).join('')}</ol>` : '';
    const goal = S.goal ? `<p class="xl-goal">🎯 <b>Goal Seek</b>: <kbd>Data</kbd> → <kbd>What-If Analysis</kbd> → <kbd>Goal Seek</kbd>. Set cell <b>${esc(S.goal.set)}</b> to value <b>${esc(String(S.goal.to || 0))}</b> by changing cell <b>${esc(S.goal.change)}</b>. Excel then puts <b>${esc(display(sh, S.goal.change))}</b> in ${esc(S.goal.change)}.</p>` : '';
    const first = S.answer || Object.keys(sh.cells).find((a) => typeof sh.cells[a].v === 'string' && sh.cells[a].v.startsWith('=')) || addr(sh.c0, sh.r0);
    const fc = sh.cells[first];
    const title = opts.title || S.title;
    return `<section class="xl${opts.formulas ? ' show-f' : ''}" aria-label="Excel">
      <header class="xl-h"><span class="xl-badge">Excel</span>${title ? `<b>${esc(title)}</b>` : ''}<button type="button" class="chip-btn xl-tg" data-act="xl-formulas" aria-pressed="${opts.formulas ? 'true' : 'false'}">Show formulas</button></header>
      ${steps}${goal}
      <div class="xl-bar"><span class="xl-addr">${esc(first)}</span><code class="xl-fx">${esc(fc ? (typeof fc.v === 'string' && fc.v.startsWith('=') ? fc.v : display(sh, first)) : '')}</code></div>
      <div class="xl-wrap"><table class="xl-grid" aria-label="Spreadsheet"><thead>${head}</thead><tbody>${body}</tbody></table></div>
      <p class="xl-tip">Tap a cell to see what is typed in it. In Excel, <b>Formulas</b> → <b>Show Formulas</b> shows every formula at once.</p>
    </section>`;
  }
  /** Words for read-aloud. */
  function speech(spec) {
    const sh = spec.cells ? spec : build(spec);
    const S = sh.spec;
    const parts = ['In Excel.'];
    (S.steps || []).forEach((st, i) => parts.push(`Step ${i + 1}: ${root.RENDER && root.RENDER.speech ? root.RENDER.speech(st.t) : st.t}`));
    if (S.answer) parts.push(`The answer in cell ${S.answer} is ${display(sh, S.answer)}.`);
    return parts.join(' ');
  }

  /* ================= TI-Nspire method -> Excel sheet ================= */
  const PREC = { cmp: 1, '+': 2, '-': 2, '*': 3, '/': 3, neg: 4, '^': 5 };
  const TVMF = { tvmfv: 1, tvmpv: 1, tvmpmt: 1, tvmn: 1, tvmi: 1 };
  /**
   * Turn a TI-Nspire method into an Excel sheet that gives the same result. Lists become rows of cells,
   * list arithmetic becomes one formula per column, stored letters become labelled cells, nSolve becomes
   * Goal Seek. Returns null when a step has no clean Excel version.
   */
  function fromTI(steps) {
    const NS = root.NSPIRE;
    if (!NS || !steps || !steps.length) return null;
    let run;
    try { run = NS.run(steps); } catch (e) { return null; }
    const rows = [], fmt = {}, vars = {}, say = [];
    let last = null, goal = null, result = null;
    const fail = (why) => { const e = new Error(why); e.xl = true; throw e; };
    const lit = (n) => (n.k === 'num' ? n.v : n.k === 'neg' && n.e.k === 'num' ? -n.e.v : null);
    const numTxt = (v) => String(+(+v).toPrecision(12));
    const listMemo = new Map();
    /** A row of cells for a list: literals as numbers, anything else as a formula. */
    function listRow(label, items) {
      const r = rows.length + 1;
      rows.push([label, ...items]);
      const cells = items.map((_, i) => `${colName(2 + i)}${r}`);
      return { range: `${cells[0]}:${cells[cells.length - 1]}`, cells, row: r };
    }
    function listOf(n, label) {
      if (listMemo.has(n)) return listMemo.get(n);
      const items = n.items.map((x) => { const l = lit(x); return l !== null ? l : '=' + emit(x, null).s; });
      const L = listRow(label || 'List', items);
      listMemo.set(n, L);
      return L;
    }
    /** mode: null = ranges for lists; a number k = the k-th cell of each list (one formula per column). */
    function emit(n, mode) {
      switch (n.k) {
        case 'num': return { s: numTxt(n.v), p: 9 };
        case 'var': {
          const v = n.name === 'ans' ? last : vars[n.name];
          if (n.name === 'e' && !v) return { s: 'EXP(1)', p: 9 };
          if (!v) fail('var ' + n.name);
          if (v.cells) { if (typeof mode === 'number') { const c = v.cells[mode]; if (!c) fail('len'); return v.pct ? { s: `${c}*100`, p: 3 } : { s: c, p: 9 }; } return { s: v.range, p: 9, list: true }; }
          return v.pct ? { s: `${v.ref}*100`, p: 3 } : { s: v.ref, p: 9 };
        }
        case 'list': {
          const L = listOf(n);
          if (typeof mode === 'number') { const c = L.cells[mode]; if (!c) fail('len'); return { s: c, p: 9 }; }
          return { s: L.range, p: 9, list: true };
        }
        case 'neg': { const a = emit(n.e, mode); return { s: a.p >= 9 ? `-${a.s}` : `-(${a.s})`, p: 4, list: a.list }; }
        case 'bin': {
          const p = PREC[n.o];
          if (n.o === '^' && n.a.k === 'var' && n.a.name === 'e' && !vars.e) { const x = emit(n.b, mode); return { s: `EXP(${x.s})`, p: 9, list: x.list }; }
          const a = emit(n.a, mode), b = emit(n.b, mode);
          const L = n.o === '^' ? (a.p >= 9 ? a.s : `(${a.s})`) : (a.p < p ? `(${a.s})` : a.s);
          const Rt = n.o === '^' ? (b.p >= 9 || (n.b.k === 'neg' && n.b.e.k === 'num') ? b.s : `(${b.s})`) : (b.p < p || (b.p === p && (n.o === '-' || n.o === '/')) ? `(${b.s})` : b.s);
          return { s: `${L}${n.o}${Rt}`, p, list: a.list || b.list };
        }
        case 'call': return call(n, mode);
        default: fail(n.k);
      }
    }
    const pctArg = (x, mode) => { const l = lit(x); if (l !== null) return `${numTxt(l)}%`; const e = emit(x, mode); return e.p >= 9 ? `${e.s}/100` : `(${e.s})/100`; };
    function rateOf(I, PpY, CpY, mode) {
      const pp = PpY ? lit(PpY) : 1, cp = CpY ? lit(CpY) : pp;
      if (pp === null || cp === null) fail('PpY');
      const i = pctArg(I, mode);
      if (pp === cp) return pp === 1 ? i : `${i}/${pp}`;
      return `(1+${i}/${cp})^(${cp}/${pp})-1`;
    }
    /** Cash flows for npv/irr: a row that starts with CF0 (IRR needs them together). */
    function listLen(n) {
      if (!n || typeof n !== 'object') return 0;
      if (n.k === 'list') return n.items.length;
      if (n.k === 'var') { const v = n.name === 'ans' ? last : vars[n.name]; return v && v.cells ? v.cells.length : 0; }
      for (const key of ['a', 'b', 'e']) { const L = listLen(n[key]); if (L) return L; }
      if (n.args) for (const x of n.args) { const L = listLen(x); if (L) return L; }
      return 0;
    }
    function cashFlows(cf0, list, counts) {
      let items;
      const v = list && list.k === 'var' ? (list.name === 'ans' ? last : vars[list.name]) : null;
      if (list.k === 'list') items = list.items;
      else if (v && v.cells) items = v.cells.map((c) => ({ k: 'ref', c }));
      else {
        const len = listLen(list);
        if (!len) fail('flows');
        const fx = Array.from({ length: len }, (_, k) => '=' + emit(list, k).s);
        const r = rows.length + 1;
        rows.push(['Each cash flow', ...fx]);
        items = Array.from({ length: len }, (_, k) => ({ k: 'ref', c: `${colName(2 + k)}${r}` }));
      }
      if (counts) {
        if (counts.k !== 'list') fail('counts');
        const cn = counts.items.map(lit);
        if (cn.some((x) => x === null)) fail('counts');
        items = items.flatMap((v, i) => Array(cn[i]).fill(v));
      }
      const cell = (x) => (x.k === 'ref' ? '=' + x.c : lit(x) !== null ? lit(x) : '=' + emit(x, null).s);
      const vals = [cell(cf0), ...items.map(cell)];
      rows.push(['Year', ...vals.map((_, i) => i)]);
      return listRow('Cash flow', vals);
    }
    function call(n, mode) {
      const f = n.f.toLowerCase(), a = n.args;
      const S = (x) => emit(x, mode).s;
      if (f === 'npv') { const L = cashFlows(a[1], a[2], a[3]); return { s: `NPV(${pctArg(a[0], mode)},${L.cells[1]}:${L.cells[L.cells.length - 1]})+${L.cells[0]}`, p: 2 }; }
      if (f === 'irr') { const L = cashFlows(a[0], a[1], a[2]); return { s: `IRR(${L.range})`, p: 9, pct: true }; }
      if (TVMF[f]) {
        const at = (x) => (x ? ',' + S(x) : '');
        if (f === 'tvmfv') { const [N_, I, PV, Pmt, PpY, CpY, At] = a; return { s: `FV(${rateOf(I, PpY, CpY, mode)},${S(N_)},${S(Pmt)},${S(PV)}${at(At)})`, p: 9 }; }
        if (f === 'tvmpv') { const [N_, I, Pmt, FV, PpY, CpY, At] = a; return { s: `PV(${rateOf(I, PpY, CpY, mode)},${S(N_)},${S(Pmt)},${S(FV)}${at(At)})`, p: 9 }; }
        if (f === 'tvmpmt') { const [N_, I, PV, FV, PpY, CpY, At] = a; return { s: `PMT(${rateOf(I, PpY, CpY, mode)},${S(N_)},${S(PV)},${S(FV)}${at(At)})`, p: 9 }; }
        if (f === 'tvmn') { const [I, PV, Pmt, FV, PpY, CpY, At] = a; return { s: `NPER(${rateOf(I, PpY, CpY, mode)},${S(Pmt)},${S(PV)},${S(FV)}${at(At)})`, p: 9 }; }
        const [N_, PV, Pmt, FV, PpY, CpY, At] = a;
        const pp = PpY ? lit(PpY) : 1, cp = CpY ? lit(CpY) : pp;
        if (pp === null || pp !== cp) fail('tvmI');
        return { s: `RATE(${S(N_)},${S(Pmt)},${S(PV)},${S(FV)}${at(At)})${pp === 1 ? '' : '*' + pp}`, p: pp === 1 ? 9 : 3, pct: true };
      }
      if (f === 'eff') return { s: `EFFECT(${pctArg(a[0], mode)},${S(a[1])})`, p: 9, pct: true };
      if (f === 'nom') return { s: `NOMINAL(${pctArg(a[0], mode)},${S(a[1])})`, p: 9, pct: true };
      const R = (x) => { const e = emit(x, null); return e.s; };
      const AGG = { mean: 'AVERAGE', stdevsamp: 'STDEV.S', stdevpop: 'STDEV.P', varsamp: 'VAR.S', varpop: 'VAR.P', dim: 'COUNT' };
      if (AGG[f]) return { s: `${AGG[f]}(${R(a[0])})`, p: 9 };
      if (f === 'sum') { const e = emit(a[0], null); return { s: /^[A-Z]+\d+:[A-Z]+\d+$/.test(e.s) ? `SUM(${e.s})` : `SUMPRODUCT(${e.s})`, p: 9 }; }
      const ONE = { sqrt: 'SQRT', ln: 'LN', log: 'LOG10', abs: 'ABS', exp: 'EXP' };
      if (ONE[f]) { const x = emit(a[0], mode); return { s: `${ONE[f]}(${x.s})`, p: 9, list: x.list }; }
      if (f === 'max' || f === 'min') return { s: `${f.toUpperCase()}(${a.map(S).join(',')})`, p: 9 };
      if (f === 'round') return { s: `ROUND(${S(a[0])},${a[1] ? S(a[1]) : 0})`, p: 9 };
      fail('fn ' + f);
    }
    try {
      steps.forEach((st, si) => {
        if (st.say) { say.push(st.say); return; }
        if (st.solver) {
          const f = st.solver, find = st.find;
          const pp = +f.PpY || 1, cp = +f.CpY || pp;
          const rateTxt = pp === cp ? (pp === 1 ? `${numTxt(f.I)}%` : `${numTxt(f.I)}%/${pp}`) : `(1+${numTxt(f.I)}%/${cp})^(${cp}/${pp})-1`;
          const A = {};
          [['I', 'Rate per period (rate)', `=${rateTxt}`], ['N', 'Number of periods (nper)', +f.N], ['Pmt', 'Payment each period (pmt)', +f.Pmt || 0],
            ['PV', 'Present value (pv)', +f.PV || 0], ['FV', 'Future value (fv)', +f.FV || 0], ['At', 'Type: 0 = end, 1 = start', f.PmtAt === 'BEGIN' ? 1 : 0]]
            .forEach(([k, label, v]) => { if (k === find) return; A[k] = `B${rows.length + 1}`; rows.push([label, v]); if (k === 'I') fmt[A[k]] = '%4'; });
          const F = {
            FV: ['FV', `=FV(${A.I},${A.N},${A.Pmt},${A.PV},${A.At})`],
            PV: ['PV', `=PV(${A.I},${A.N},${A.Pmt},${A.FV},${A.At})`],
            Pmt: ['Payment', `=PMT(${A.I},${A.N},${A.PV},${A.FV},${A.At})`],
            N: ['Number of periods', `=NPER(${A.I},${A.Pmt},${A.PV},${A.FV},${A.At})`],
            I: ['Yearly rate', `=RATE(${A.N},${A.Pmt},${A.PV},${A.FV},${A.At})${pp === 1 ? '' : '*' + pp}`],
          }[find];
          if (!F || (find === 'I' && pp !== cp)) fail('solver');
          const r = rows.length + 1;
          rows.push([F[0], F[1]]);
          if (find === 'I') fmt[`B${r}`] = '%';
          last = { ref: `B${r}`, pct: find === 'I' };
          result = { ref: `B${r}`, pct: find === 'I', si };
          return;
        }
        if (!st.cmd) return;
        let ast = NS.parse(st.cmd);
        if (ast.k === 'with') ast = ast.e;
        const name = ast.k === 'assign' ? ast.name : null;
        const target = name ? ast.e : ast;
        if (target.k === 'with') fail('with');
        if (target.k === 'call' && /^n?solve$/i.test(target.f)) {
          const eq = target.args[0], v = target.args[1];
          if (!eq || eq.k !== 'cmp' || eq.o !== '=' || !v || v.k !== 'var') fail('solve');
          const r1 = rows.length + 1;
          rows.push([`${v.name} (Goal Seek changes this)`, 0.1]);
          vars[v.name] = { ref: `B${r1}` };
          const d = emit({ k: 'bin', o: '-', a: eq.a, b: eq.b }, null);
          const r2 = rows.length + 1;
          rows.push(['Left side − right side', '=' + d.s]);
          goal = { set: `B${r2}`, to: 0, change: `B${r1}` };
          last = { ref: `B${r1}` };
          if (name) vars[name] = last;
          result = { ref: `B${r1}`, pct: false, si };
          return;
        }
        if (target.k === 'call' && target.f.toLowerCase() === 'cumulativesum') {
          const list = target.args[0];
          if (!list || list.k !== 'list') fail('cumsum');
          const L = cashFlows(list.items[0], { k: 'list', items: list.items.slice(1) });
          const rc = rows.length + 1;
          rows.push(['Running total', ...L.cells.map((c, i) => (i === 0 ? `=${c}` : `=${colName(1 + i)}${rc}+${c}`))]);
          last = { cells: L.cells.map((_, i) => `${colName(2 + i)}${rc}`), range: `B${rc}:${colName(1 + L.cells.length)}${rc}` };
          if (name) vars[name] = last;
          result = null;
          return;
        }
        const out = run.results[si] && run.results[si].value;
        if (Array.isArray(out)) {
          // a list result: one formula per column
          if (target.k === 'list' && target.items.every((x) => lit(x) !== null)) {
            const L = listRow(name || 'List', target.items.map(lit));
            last = { cells: L.cells, range: L.range };
          } else {
            const cellsF = out.map((_, k) => '=' + emit(target, k).s);
            const r = rows.length + 1;
            rows.push([name || 'Each value', ...cellsF]);
            last = { cells: out.map((_, k) => `${colName(2 + k)}${r}`), range: `B${r}:${colName(1 + out.length)}${r}` };
          }
          if (name) vars[name] = last;
          result = null;
          return;
        }
        const e = emit(target, null);
        if (e.list) fail('list scalar');
        const r = rows.length + 1;
        const l = lit(target);
        rows.push([name || 'Result', name && l !== null ? l : '=' + e.s]);
        if (e.pct) fmt[`B${r}`] = '%';
        last = { ref: `B${r}`, pct: !!e.pct };
        if (name) vars[name] = last;
        result = { ref: `B${r}`, pct: !!e.pct, si };
      });
    } catch (err) {
      if (err && (err.xl || /[A-Za-z]/.test(String(err.message)))) return null;
      throw err;
    }
    if (!rows.length) return null;
    if (result) { const row = rows[+result.ref.slice(1) - 1]; row[0] = row[0] === 'Result' ? 'Answer' : row[0] + ' (answer)'; }
    const spec = { rows, fmt, bold: [`A1:A${rows.length}`], answer: result ? result.ref : undefined, pct: result ? result.pct : false, auto: true };
    if (!result && last && last.cells) { spec.listCells = last.cells; spec.hl = [last.range]; }
    if (goal) spec.goal = goal;
    if (say.length) spec.say = say;
    return spec;
  }
  /** The Excel version of a TI method, only when it gives exactly the same final number. */
  function methodFor(ti) {
    let spec;
    try { spec = fromTI(ti); } catch (e) { return null; }
    if (!spec) return null;
    const NS = root.NSPIRE;
    const run = NS.run(ti);
    if (!spec.answer) {
      // a list at the end (a running total, one value per state): check every cell
      const lastList = run.results.map((r) => r.value).filter(Array.isArray).pop();
      if (!spec.listCells || !lastList || lastList.length !== spec.listCells.length) return null;
      try {
        const sh = build(spec);
        return spec.listCells.every((a, i) => Math.abs(sh.get(a) - lastList[i]) <= Math.max(1e-6, Math.abs(lastList[i]) * 1e-6)) ? spec : null;
      } catch (e) { return null; }
    }
    const nums = run.results.map((r) => r.value).filter((v) => typeof v === 'number' || (v && v.solve));
    let want = nums.length ? nums[nums.length - 1] : null;
    if (want && want.solve) want = want.roots && want.roots[0];
    let got;
    try { const sh = build(spec); got = sh.get(spec.answer); } catch (e) { return null; }
    if (typeof got !== 'number' || typeof want !== 'number') return null;
    if (spec.pct) got *= 100;
    return Math.abs(got - want) <= Math.max(1e-6, Math.abs(want) * 1e-6) ? spec : null;
  }

  root.XL = { build, value, display, format, parseFormula, rangeCells, parseAddr, addr, colName, FUNCS, FIN, fromTI, methodFor, solve1 };
  root.XLVIEW = { html, speech };
})(typeof window !== 'undefined' ? window : globalThis);
