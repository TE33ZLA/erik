/* Corporate Ladder — a small TI-Nspire CX CAS emulator.
 *
 * It understands the calculator commands the game teaches, with the TI's own rules:
 *   Finance Solver (N, I(%), PV, Pmt, FV, PpY, CpY, PmtAt), tvmFV/tvmPV/tvmPmt/tvmN/tvmI,
 *   npv, irr, eff, nom, lists { }, sum, mean, stDevSamp, varSamp, cumulativeSum, nSolve, solve,
 *   := and → (sto→) for storing values, and ans.
 * Every TI-Nspire step shown in the game is computed here, so the steps and results always agree,
 * and tests/validate.js checks that each method really reaches the question's answer.
 *
 * Step objects used by questions and lessons (see docs/CONTENT_GUIDE.md):
 *   { solver: {N, I, PV, Pmt, FV, PpY, CpY, PmtAt}, find: 'FV' }   a Finance Solver screen
 *   { cmd: 'tvmFV(5,6,-1000,0,1,1)' }                              a line typed in a Calculator page
 *   { say: 'text' }                                                 a short tip
 * Optional on any step: note (text shown under it), pct: true (the result is a decimal rate the
 * question asks for as a percentage).
 */
(function (root) {
  'use strict';
  const FIN = root.FIN;

  /* ================= finance functions (TI semantics) ================= */
  // I is the annual rate in percent, compounded CpY times a year; payments happen PpY times a year.
  const perRate = (I, PpY, CpY) => Math.pow(1 + I / 100 / CpY, CpY / PpY) - 1;
  const annualRate = (i, PpY, CpY) => CpY * (Math.pow(1 + i, PpY / CpY) - 1) * 100;
  function tvmCheck(PpY, CpY, PmtAt) {
    if (!(PpY > 0) || !(CpY > 0)) throw new Error('PpY and CpY must be positive.');
    if (PmtAt !== 0 && PmtAt !== 1) throw new Error('PmtAt must be 0 (END) or 1 (BEGIN).');
  }
  const TVM = {
    FV(N, I, PV, Pmt, PpY = 1, CpY = 1, PmtAt = 0) { tvmCheck(PpY, CpY, PmtAt); return FIN.tvm.solveFV(N, perRate(I, PpY, CpY), PV, Pmt, PmtAt); },
    PV(N, I, Pmt, FV, PpY = 1, CpY = 1, PmtAt = 0) { tvmCheck(PpY, CpY, PmtAt); return FIN.tvm.solvePV(N, perRate(I, PpY, CpY), Pmt, FV, PmtAt); },
    Pmt(N, I, PV, FV, PpY = 1, CpY = 1, PmtAt = 0) { tvmCheck(PpY, CpY, PmtAt); return FIN.tvm.solvePMT(N, perRate(I, PpY, CpY), PV, FV, PmtAt); },
    N(I, PV, Pmt, FV, PpY = 1, CpY = 1, PmtAt = 0) { tvmCheck(PpY, CpY, PmtAt); return FIN.tvm.solveN(perRate(I, PpY, CpY), PV, Pmt, FV, PmtAt); },
    I(N, PV, Pmt, FV, PpY = 1, CpY = 1, PmtAt = 0) { tvmCheck(PpY, CpY, PmtAt); const i = FIN.tvm.solveI(N, PV, Pmt, FV, PmtAt); return Number.isFinite(i) ? annualRate(i, PpY, CpY) : NaN; },
  };

  function expandCF(list, freq) {
    if (!freq) return list.slice();
    if (freq.length !== list.length) throw new Error('The frequency list must be as long as the cash-flow list.');
    const out = [];
    list.forEach((v, k) => { const n = freq[k]; if (!(n >= 1) || Math.round(n) !== n) throw new Error('Frequencies must be whole numbers of at least 1.'); for (let j = 0; j < n; j++) out.push(v); });
    return out;
  }

  /* ================= values ================= */
  const isList = Array.isArray;
  function num(v, what) {
    if (isList(v)) throw new Error((what || 'This') + ' needs a single number, not a list.');
    if (typeof v !== 'number' || Number.isNaN(v)) throw new Error((what || 'This') + ' is not a number.');
    return v;
  }
  function list(v, what) {
    if (!isList(v)) throw new Error((what || 'This') + ' needs a list in { }.');
    return v;
  }
  function elementwise(a, b, f) {
    if (isList(a) && isList(b)) {
      if (a.length !== b.length) throw new Error('The two lists have different lengths.');
      return a.map((x, k) => f(x, b[k]));
    }
    if (isList(a)) return a.map((x) => f(x, b));
    if (isList(b)) return b.map((y) => f(a, y));
    return f(a, b);
  }
  const map1 = (a, f) => (isList(a) ? a.map(f) : f(a));

  /* ================= tokenizer ================= */
  const SYM = ['→', ':=', '<=', '>=', '≤', '≥', '≠', '/=', '->', '+', '-', '*', '/', '^', '(', ')', '{', '}', ',', '=', '|', '<', '>', '%', '√'];
  function normalise(src) {
    return String(src)
      .replace(/[−–]/g, '-').replace(/[×·•]/g, '*').replace(/÷/g, '/')
      .replace(/ᴇ/g, 'E').replace(/ | /g, ' ');
  }
  function tokenize(src) {
    const s = normalise(src);
    const out = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === ' ' || c === '\t' || c === '\n') { i++; continue; }
      const numM = /^(\d+\.?\d*|\.\d+)(E[-+]?\d+)?/i.exec(s.slice(i));
      if (numM) {
        // a number such as 12, 0.5, .5, 1E6 (the E must be followed by digits)
        out.push({ t: 'num', v: parseFloat(numM[0]) });
        i += numM[0].length;
        continue;
      }
      const nameM = /^[A-Za-zΣθ_][A-Za-z0-9_.]*/.exec(s.slice(i));
      if (nameM) { out.push({ t: 'name', v: nameM[0].replace(/\.$/, '') }); i += nameM[0].replace(/\.$/, '').length; continue; }
      const sym = SYM.find((x) => s.startsWith(x, i));
      if (sym) {
        const v = sym === '->' ? '→' : sym === '≤' ? '<=' : sym === '≥' ? '>=' : sym === '/=' ? '≠' : sym;
        out.push({ t: 'op', v });
        i += sym.length;
        continue;
      }
      throw new Error('The calculator does not understand “' + c + '”.');
    }
    // implicit multiplication: 2x, 2(…), )(, )x, x( is a function call so it stays
    const res = [];
    out.forEach((tk, k) => {
      const prev = res[res.length - 1];
      const word = tk.t === 'name' && /^(and|or)$/i.test(tk.v);
      if (prev && !word && ((prev.t === 'num' && (tk.t === 'name' || (tk.t === 'op' && (tk.v === '(' || tk.v === '√')))) ||
        (prev.t === 'op' && prev.v === ')' && (tk.t === 'num' || tk.t === 'name' || (tk.t === 'op' && tk.v === '('))))) {
        res.push({ t: 'op', v: '*' });
      }
      res.push(tk);
    });
    return res;
  }

  /* ================= parser (to a small AST) ================= */
  function parse(src) {
    const toks = tokenize(src);
    let p = 0;
    const peek = () => toks[p];
    const isOp = (v) => toks[p] && toks[p].t === 'op' && toks[p].v === v;
    const expectOp = (v) => { if (!isOp(v)) throw new Error(v === ')' ? 'A closing bracket ) is missing.' : v === '}' ? 'A closing curly bracket } is missing.' : 'Expected “' + v + '”.'); p++; };

    function statement() {
      // name := expr
      if (toks[p] && toks[p].t === 'name' && toks[p + 1] && toks[p + 1].t === 'op' && toks[p + 1].v === ':=') {
        const name = toks[p].v; p += 2;
        return { k: 'assign', name, e: withExpr() };
      }
      const e = withExpr();
      if (isOp('→')) { p++; const n = peek(); if (!n || n.t !== 'name') throw new Error('Type a variable name after →.'); p++; return { k: 'assign', name: n.v, e }; }
      return e;
    }
    function withExpr() {
      const e = logic();
      if (isOp('|')) { p++; return { k: 'with', e, c: logic() }; }
      return e;
    }
    function logic() {
      let e = compare();
      while (peek() && peek().t === 'name' && /^(and|or)$/i.test(peek().v)) { const o = peek().v.toLowerCase(); p++; e = { k: o, a: e, b: compare() }; }
      return e;
    }
    function compare() {
      const a = additive();
      const t = peek();
      if (t && t.t === 'op' && ['=', '<', '>', '<=', '>=', '≠'].includes(t.v)) { p++; return { k: 'cmp', o: t.v, a, b: additive() }; }
      return a;
    }
    function additive() {
      let e = multiplicative();
      while (isOp('+') || isOp('-')) { const o = peek().v; p++; e = { k: 'bin', o, a: e, b: multiplicative() }; }
      return e;
    }
    function multiplicative() {
      let e = unary();
      while (isOp('*') || isOp('/')) { const o = peek().v; p++; e = { k: 'bin', o, a: e, b: unary() }; }
      return e;
    }
    function unary() {
      if (isOp('-')) { p++; return { k: 'neg', e: unary() }; }
      if (isOp('+')) { p++; return unary(); }
      return power();
    }
    function power() {
      const base = postfix();
      if (isOp('^')) { p++; return { k: 'bin', o: '^', a: base, b: unary() }; } // right-associative; -2^2 = -4
      return base;
    }
    function postfix() {
      let e = atom();
      while (isOp('%')) { p++; e = { k: 'bin', o: '/', a: e, b: { k: 'num', v: 100 } }; }
      return e;
    }
    function args() {
      expectOp('(');
      const list = [];
      if (!isOp(')')) { list.push(withExpr()); while (isOp(',')) { p++; list.push(withExpr()); } }
      expectOp(')');
      return list;
    }
    function atom() {
      const t = peek();
      if (!t) throw new Error('The line ends too early.');
      if (t.t === 'num') { p++; return { k: 'num', v: t.v }; }
      if (t.t === 'op' && t.v === '(') { p++; const e = withExpr(); expectOp(')'); return e; }
      if (t.t === 'op' && t.v === '{') {
        p++;
        const items = [];
        if (!isOp('}')) { items.push(additive()); while (isOp(',')) { p++; items.push(additive()); } }
        expectOp('}');
        return { k: 'list', items };
      }
      if (t.t === 'op' && t.v === '√') { p++; return { k: 'call', f: 'sqrt', args: isOp('(') ? args() : [power()] }; }
      if (t.t === 'name') {
        p++;
        if (isOp('(')) return { k: 'call', f: t.v, args: args() };
        return { k: 'var', name: t.v };
      }
      throw new Error('Check the line near “' + t.v + '”.');
    }
    const e = statement();
    if (p < toks.length) throw new Error('Check the line near “' + (toks[p].v) + '”.');
    return e;
  }

  /* ================= root finding for solve / nSolve ================= */
  let GRID = null;
  function grid() {
    if (GRID) return GRID;
    const pts = [0];
    for (let k = -6; k <= 8; k++) for (let m = 1; m < 10; m += 0.05) { const x = m * Math.pow(10, k); pts.push(x, -x); }
    GRID = pts.sort((a, b) => a - b);
    return GRID;
  }
  function refine(f, a, b) {
    let fa = f(a);
    for (let k = 0; k < 200; k++) {
      const m = (a + b) / 2;
      const fm = f(m);
      if (fm === 0 || Math.abs(b - a) <= 1e-13 * Math.max(1, Math.abs(m))) return m;
      if (fa * fm < 0) b = m; else { a = m; fa = fm; }
    }
    return (a + b) / 2;
  }
  function roots(f, lo, hi) {
    const xs = lo === undefined ? grid() : Array.from({ length: 4001 }, (_, k) => lo + ((hi - lo) * k) / 4000);
    const out = [];
    let pa = null, pf = null;
    for (const x of xs) {
      let fx;
      try { fx = f(x); } catch (e) { fx = NaN; }
      if (!Number.isFinite(fx)) { pa = null; pf = null; continue; }
      if (fx === 0) out.push(x);
      else if (pf !== null && pf !== 0 && pf * fx < 0) {
        const r = refine(f, pa, x);
        const fr = f(r);
        // a sign change across a pole is not a root
        if (Math.abs(fr) <= 1e-6 * (1 + Math.abs(pf) + Math.abs(fx))) out.push(r);
      }
      pa = x; pf = fx;
    }
    return out.sort((a, b) => a - b).filter((x, k, arr) => k === 0 || Math.abs(x - arr[k - 1]) > 1e-9 * Math.max(1, Math.abs(x)));
  }

  /* ================= evaluator ================= */
  const FUNCS = {
    tvmfv: (a) => TVM.FV(...nums(a, 4, 7, 'tvmFV')),
    tvmpv: (a) => TVM.PV(...nums(a, 4, 7, 'tvmPV')),
    tvmpmt: (a) => TVM.Pmt(...nums(a, 4, 7, 'tvmPmt')),
    tvmn: (a) => TVM.N(...nums(a, 4, 7, 'tvmN')),
    tvmi: (a) => TVM.I(...nums(a, 4, 7, 'tvmI')),
    npv: (a) => {
      if (a.length < 3 || a.length > 4) throw new Error('Use npv(rate, CF0, {CF1, CF2, …}).');
      const r = num(a[0], 'The rate') / 100, cf0 = num(a[1], 'CF0');
      const cfs = [cf0].concat(expandCF(list(a[2], 'The cash-flow list'), a[3] ? list(a[3], 'The frequency list') : null));
      return FIN.npv(r, cfs);
    },
    irr: (a) => {
      if (a.length < 2 || a.length > 3) throw new Error('Use irr(CF0, {CF1, CF2, …}).');
      const cfs = [num(a[0], 'CF0')].concat(expandCF(list(a[1], 'The cash-flow list'), a[2] ? list(a[2], 'The frequency list') : null));
      const all = FIN.irrAll(cfs);
      if (!all.length) throw new Error('No IRR: the cash flows never make NPV zero.');
      // the TI reports one IRR; take the one closest to 10%
      return all.slice().sort((x, y) => Math.abs(x - 0.1) - Math.abs(y - 0.1))[0] * 100;
    },
    eff: (a) => { const [nom, c] = nums(a, 2, 2, 'eff'); return (Math.pow(1 + nom / 100 / c, c) - 1) * 100; },
    nom: (a) => { const [eff, c] = nums(a, 2, 2, 'nom'); return c * (Math.pow(1 + eff / 100, 1 / c) - 1) * 100; },
    sum: (a) => list(a[0], 'sum').reduce((s, x) => s + x, 0),
    dim: (a) => list(a[0], 'dim').length,
    mean: (a) => { const L = list(a[0], 'mean'); const w = a[1] ? list(a[1], 'The frequency list') : L.map(() => 1); const W = w.reduce((s, x) => s + x, 0); return L.reduce((s, x, k) => s + x * w[k], 0) / W; },
    stdevsamp: (a) => Math.sqrt(varS(a)),
    stdevpop: (a) => Math.sqrt(varP(a)),
    varsamp: (a) => varS(a),
    varpop: (a) => varP(a),
    max: (a) => (a.length === 1 ? Math.max(...list(a[0], 'max')) : elementwise(a[0], a[1], Math.max)),
    min: (a) => (a.length === 1 ? Math.min(...list(a[0], 'min')) : elementwise(a[0], a[1], Math.min)),
    cumulativesum: (a) => { let t = 0; return list(a[0], 'cumulativeSum').map((x) => (t += x)); },
    sqrt: (a) => map1(a[0], (x) => { if (x < 0) throw new Error('No real square root of a negative number.'); return Math.sqrt(x); }),
    ln: (a) => map1(a[0], (x) => { if (x <= 0) throw new Error('ln needs a positive number.'); return Math.log(x); }),
    log: (a) => map1(a[0], (x) => { if (x <= 0) throw new Error('log needs a positive number.'); return a[1] === undefined ? Math.log10(x) : Math.log(x) / Math.log(num(a[1])); }),
    exp: (a) => map1(a[0], Math.exp),
    abs: (a) => map1(a[0], Math.abs),
    round: (a) => map1(a[0], (x) => { const k = Math.pow(10, a[1] === undefined ? 12 : num(a[1])); return Math.round(x * k) / k; }),
    approx: (a) => a[0],
  };
  function nums(a, min, max, name) {
    if (a.length < min || a.length > max) throw new Error(name + ' needs ' + (min === max ? min : min + ' to ' + max) + ' values inside the brackets.');
    return a.map((x, k) => num(x, name + ' value ' + (k + 1)));
  }
  function varS(a) { const L = list(a[0]); if (L.length < 2) throw new Error('A sample needs at least 2 values.'); const m = L.reduce((s, x) => s + x, 0) / L.length; return L.reduce((s, x) => s + (x - m) * (x - m), 0) / (L.length - 1); }
  function varP(a) { const L = list(a[0]); const m = L.reduce((s, x) => s + x, 0) / L.length; return L.reduce((s, x) => s + (x - m) * (x - m), 0) / L.length; }

  const NICE = { tvmfv: 'tvmFV', tvmpv: 'tvmPV', tvmpmt: 'tvmPmt', tvmn: 'tvmN', tvmi: 'tvmI', stdevsamp: 'stDevSamp', stdevpop: 'stDevPop', varsamp: 'varSamp', varpop: 'varPop', cumulativesum: 'cumulativeSum', nsolve: 'nSolve' };

  function evalNode(n, env) {
    switch (n.k) {
      case 'num': return n.v;
      case 'list': return n.items.map((x) => num(evalNode(x, env), 'Each list item'));
      case 'var': {
        const key = n.name.toLowerCase();
        if (key === 'e' && !(key in env.vars)) return Math.E;
        if ((key === 'pi' || key === 'π') && !(key in env.vars)) return Math.PI;
        if (key in env.vars) return env.vars[key];
        throw new Error('“' + n.name + '” has no value yet. Store one first, e.g. ' + n.name + ':=5');
      }
      case 'neg': return map1(evalNode(n.e, env), (x) => -x);
      case 'bin': {
        const a = evalNode(n.a, env), b = evalNode(n.b, env);
        const f = { '+': (x, y) => x + y, '-': (x, y) => x - y, '*': (x, y) => x * y, '/': (x, y) => { if (y === 0) throw new Error('You cannot divide by zero.'); return x / y; }, '^': (x, y) => Math.pow(x, y) }[n.o];
        return elementwise(a, b, f);
      }
      case 'call': {
        const key = n.f.toLowerCase();
        if (key === 'nsolve' || key === 'solve') return solveCall(key, n, env);
        const fn = FUNCS[key];
        if (!fn) throw new Error('The calculator has no function called “' + n.f + '” here.');
        const args = n.args.map((x) => evalNode(x, env));
        const v = fn(args);
        if (typeof v === 'number' && !Number.isFinite(v)) throw new Error((NICE[key] || n.f) + ' has no answer for these values. Check the signs: money in is positive, money out is negative.');
        return v;
      }
      case 'assign': {
        const v = evalNode(n.e, env);
        env.vars[n.name.toLowerCase()] = v;
        return v;
      }
      case 'with':
        if (n.e.k === 'call' && /^n?solve$/i.test(n.e.f)) return solveCall(n.e.f.toLowerCase(), n.e, env, conds(n.c));
        throw new Error('Use | after solve( ) or nSolve( ), e.g. solve(…, r)|r>0');
      case 'cmp': case 'and': case 'or':
        throw new Error('Use an equation like this inside nSolve( ) or solve( ).');
      default: throw new Error('Something in this line is not supported.');
    }
  }

  function varOf(argNode) {
    if (argNode.k === 'var') return { name: argNode.name.toLowerCase(), guess: undefined };
    if (argNode.k === 'cmp' && argNode.o === '=' && argNode.a.k === 'var') return { name: argNode.a.name.toLowerCase(), guessNode: argNode.b };
    throw new Error('Tell the calculator which letter to solve for, e.g. nSolve(…, r).');
  }
  function conds(c) {
    if (!c) return [];
    if (c.k === 'and') return conds(c.a).concat(conds(c.b));
    if (c.k === 'cmp' && c.o !== '=') return [c];
    throw new Error('After | use conditions like r>0.');
  }
  function solveCall(key, n, env, outer) {
    let eq = n.args[0];
    let extra = outer || [];
    if (eq && eq.k === 'with') { extra = conds(eq.c); eq = eq.e; }
    if (eq && eq.k === 'and') { const parts = [eq.a].concat(conds(eq.b)); eq = parts[0]; extra = extra.concat(parts.slice(1)); }
    if (!eq || eq.k !== 'cmp' || eq.o !== '=') throw new Error('Type an equation with = inside ' + (key === 'nsolve' ? 'nSolve' : 'solve') + '( ).');
    if (!n.args[1]) throw new Error('Tell the calculator which letter to solve for, e.g. nSolve(…, r).');
    const v = varOf(n.args[1]);
    const guess = v.guessNode ? num(evalNode(v.guessNode, env), 'The guess') : undefined;
    const lo = n.args[2] ? num(evalNode(n.args[2], env), 'The lower bound') : undefined;
    const hi = n.args[3] ? num(evalNode(n.args[3], env), 'The upper bound') : undefined;
    const f = (x) => {
      const scope = { vars: Object.assign({}, env.vars, { [v.name]: x }) };
      const a = evalNode(eq.a, scope), b = evalNode(eq.b, scope);
      return num(a) - num(b);
    };
    let rs = roots(f, lo, hi === undefined && lo !== undefined ? lo + 1e6 : hi);
    const ok = (x) => extra.every((c) => {
      const scope = { vars: Object.assign({}, env.vars, { [v.name]: x }) };
      const a = num(evalNode(c.a, scope)), b = num(evalNode(c.b, scope));
      return { '<': a < b, '>': a > b, '<=': a <= b, '>=': a >= b, '≠': a !== b }[c.o];
    });
    rs = rs.filter(ok);
    if (!rs.length) throw new Error(key === 'nsolve' ? 'No solution found. Try a guess, e.g. r=0.1' : 'false: no real solution.');
    if (key === 'nsolve') {
      const target = guess !== undefined ? guess : lo !== undefined ? lo : 0;
      return rs.slice().sort((x, y) => Math.abs(x - target) - Math.abs(y - target))[0];
    }
    return { solve: true, name: v.name, roots: rs };
  }

  /* ================= public: run a line or a whole method ================= */
  function evaluate(line, env) {
    env = env || { vars: {} };
    const ast = parse(line);
    const v = evalNode(ast, env);
    if (v && v.solve) { env.vars.ans = v.roots.length === 1 ? v.roots[0] : v.roots; return v; }
    env.vars.ans = v;
    return v;
  }

  function solverSolve(f, find) {
    const g = (k, d) => (f[k] === undefined || f[k] === null || f[k] === '' ? d : +f[k]);
    const N = g('N'), I = g('I'), PV = g('PV', 0), Pmt = g('Pmt', 0), FV = g('FV', 0), PpY = g('PpY', 1), CpY = g('CpY', PpY), at = f.PmtAt === 'BEGIN' || f.PmtAt === 1 ? 1 : 0;
    const need = { N: ['I'], I: ['N'], PV: ['N', 'I'], Pmt: ['N', 'I'], FV: ['N', 'I'] }[find];
    if (!need) throw new Error('The Finance Solver can solve N, I(%), PV, Pmt or FV.');
    need.forEach((k) => { if (!Number.isFinite(g(k))) throw new Error('Fill in ' + (k === 'I' ? 'I(%)' : k) + ' first.'); });
    let v;
    if (find === 'FV') v = TVM.FV(N, I, PV, Pmt, PpY, CpY, at);
    else if (find === 'PV') v = TVM.PV(N, I, Pmt, FV, PpY, CpY, at);
    else if (find === 'Pmt') v = TVM.Pmt(N, I, PV, FV, PpY, CpY, at);
    else if (find === 'N') v = TVM.N(I, PV, Pmt, FV, PpY, CpY, at);
    else v = TVM.I(N, PV, Pmt, FV, PpY, CpY, at);
    if (!Number.isFinite(v)) throw new Error('No solution. Check the signs: money you pay out is negative and money you receive is positive.');
    return v;
  }

  /** Run a method (array of steps). Returns [{step, value, error}] and the final numeric value. */
  function run(steps) {
    const env = { vars: {} };
    const out = [];
    let last = null;
    (steps || []).forEach((st) => {
      const r = { step: st, value: null, error: null };
      try {
        if (st.solver) {
          r.value = solverSolve(st.solver, st.find);
          env.vars['tvm.' + st.find.toLowerCase()] = r.value;
          env.vars.ans = r.value;
        } else if (st.cmd) {
          const v = evaluate(st.cmd, env);
          r.value = v;
        }
      } catch (e) { r.error = e.message; }
      if (r.value !== null && r.value !== undefined && !r.error) last = r;
      out.push(r);
    });
    return { results: out, last };
  }

  /* ================= formatting ================= */
  /** A number as you would type it on the TI: no thousands separators, at most 6 decimals. */
  function typed(v) {
    if (typeof v === 'string') return v;
    if (!Number.isFinite(v)) return String(v);
    let s = String(+v.toFixed(6));
    if (/e/i.test(s)) s = v.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
    return s;
  }
  /** A result as shown on screen (up to 10 significant figures, trailing zeros removed). */
  function shown(v) {
    if (v && v.solve) return v.roots.map((x) => v.name + '=' + shown(x)).join(' or ');
    if (isList(v)) return '{' + v.map(shown).join(',') + '}';
    if (typeof v !== 'number') return String(v);
    if (!Number.isFinite(v)) return 'undef';
    if (Math.abs(v) < 1e-9) return '0';
    if (Math.abs(v) >= 1e12 || Math.abs(v) < 1e-6) return v.toExponential(6).replace(/\.?0+e/, 'E').replace('e', 'E');
    const s = String(+v.toPrecision(10));
    return s;
  }
  /** Display a number for a screen, e.g. 1338.225578 with dp=2 → 1338.23 */
  function money(v, dp) { return Number.isFinite(v) ? (+v.toFixed(dp === undefined ? 2 : dp)).toString() : '—'; }

  /* ================= step builders for content packs ================= */
  const FIELDS = ['N', 'I', 'PV', 'Pmt', 'FV', 'PpY', 'CpY', 'PmtAt'];
  const TI = {
    /** Finance Solver screen. vals: {N, I, PV, Pmt, FV, PpY, CpY, PmtAt:'END'|'BEGIN'}; find: the field to solve. */
    solver(vals, find, extra) {
      const s = {};
      FIELDS.forEach((k) => { if (k !== find && vals[k] !== undefined && vals[k] !== null) s[k] = k === 'PmtAt' ? vals[k] : +(+vals[k]).toFixed(6); });
      if (s.PpY === undefined) s.PpY = 1;
      if (s.CpY === undefined) s.CpY = s.PpY;
      if (s.PmtAt === undefined) s.PmtAt = 'END';
      ['PV', 'Pmt', 'FV'].forEach((k) => { if (k !== find && s[k] === undefined) s[k] = 0; });
      return Object.assign({ solver: s, find }, extra || {});
    },
    /** A typed command, built from a function name and arguments: TI.cmd('tvmFV', [5, 6, -1000, 0, 1, 1]) */
    cmd(fn, args, extra) { return Object.assign({ cmd: fn + '(' + args.map((a) => (Array.isArray(a) ? TI.list(a) : typed(a))).join(',') + ')' }, extra || {}); },
    /** A typed line, written out in full: TI.line('1000*1.06^5') */
    line(text, extra) { return Object.assign({ cmd: text }, extra || {}); },
    /** A tip in words (may contain LaTeX). */
    say(text) { return { say: text }; },
    list(a) { return '{' + a.map(typed).join(',') + '}'; },
    num: typed,
  };

  root.NSPIRE = { TVM, perRate, annualRate, tokenize, parse, evaluate, run, solverSolve, roots, typed, shown, money, FIELDS, NICE };
  root.TI = TI;
})(typeof window !== 'undefined' ? window : globalThis);
