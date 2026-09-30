/* Corporate Ladder — one-line maths ("linear notation"): how you type working into an exam text box.
 *   *  times     /  divide     ^  power     ( ) brackets     %  per cent     exp( )  ln( )  sqrt( )
 * LINEAR.value(str)          the number a pure-number expression gives (null if it has letters or is not maths)
 * LINEAR.toTex(str)          LaTeX of one expression (letters allowed), for a preview
 * LINEAR.lineTex(line)       LaTeX of a whole line: its "=" pieces, each drawn nicely
 * LINEAR.check(text, spec)   marks typed working against {answer, unit, dp}
 */
(function (root) {
  'use strict';

  const FUNCS = { exp: Math.exp, ln: Math.log, log: Math.log10, sqrt: Math.sqrt, abs: Math.abs, max: Math.max, min: Math.min };
  const GREEK = { lambda: '\\lambda', beta: '\\beta', sigma: '\\sigma', rho: '\\rho', alpha: '\\alpha', mu: '\\mu', Delta: '\\Delta', delta: '\\delta', Sigma: '\\Sigma' };
  const UNI = { 'λ': '\\lambda', 'β': '\\beta', 'σ': '\\sigma', 'ρ': '\\rho', 'α': '\\alpha', 'μ': '\\mu', 'Δ': '\\Delta', 'Σ': '\\Sigma', '∞': '\\infty' };

  function normalise(s) {
    return String(s == null ? '' : s)
      .replace(/[×·∙]/g, '*').replace(/÷/g, '/').replace(/[−–—]/g, '-').replace(/[≈≃]/g, '=')
      .replace(/ /g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  }

  /* ---------- tokens ---------- */
  function tokenize(src) {
    const s = normalise(src);
    const out = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === '$') { i++; continue; } // a dollar sign in front of a number
      // a number: 13,200.50 (commas every 3 digits) or 0.07 or .5
      let m = /^(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+\.?\d*|\.\d+)/.exec(s.slice(i));
      if (m) {
        const raw = m[1];
        out.push({ k: 'num', v: parseFloat(raw.replace(/,/g, '')), raw });
        i += raw.length;
        continue;
      }
      m = /^([A-Za-zͰ-Ͽ∞][A-Za-z0-9_Ͱ-Ͽ]*)/.exec(s.slice(i));
      if (m) { out.push({ k: 'id', v: m[1] }); i += m[1].length; continue; }
      if ('+-*/^%(),[]{}'.includes(c)) { out.push({ k: c }); i++; continue; }
      out.push({ k: 'bad', v: c });
      i++;
    }
    return out;
  }

  /* ---------- parser: + -  <  * / (and "2(3)" style)  <  unary -  <  ^  <  %  <  number, letter, f(x), (x) ---------- */
  const OPEN = { '(': ')', '[': ']', '{': '}' };
  function parse(src) {
    const t = tokenize(src);
    let p = 0;
    const peek = () => t[p];
    const eat = (k) => { if (t[p] && t[p].k === k) { p++; return true; } return false; };
    const fail = (why) => { const e = new Error(why); e.lin = true; throw e; };
    function expr() {
      let a = term();
      while (peek() && (peek().k === '+' || peek().k === '-')) { const op = t[p++].k; a = { t: 'bin', op, a, b: term() }; }
      return a;
    }
    function startsPrimary(tok) { return tok && (tok.k === 'num' || tok.k === 'id' || OPEN[tok.k]); }
    function term() {
      let a = unary();
      for (;;) {
        const tok = peek();
        if (tok && (tok.k === '*' || tok.k === '/')) { p++; a = { t: 'bin', op: tok.k, a, b: unary() }; continue; }
        if (startsPrimary(tok)) { a = { t: 'bin', op: '*', implicit: true, a, b: unary() }; continue; }
        return a;
      }
    }
    function unary() {
      if (eat('-')) return { t: 'neg', a: unary() };
      if (eat('+')) return unary();
      return power();
    }
    function power() {
      const base = postfix();
      if (eat('^')) return { t: 'bin', op: '^', a: base, b: unary() };
      return base;
    }
    function postfix() {
      let a = primary();
      while (peek() && peek().k === '%') { p++; a = { t: 'pct', a }; }
      return a;
    }
    function primary() {
      const tok = t[p++];
      if (!tok) fail('The line ends too early.');
      if (tok.k === 'num') return { t: 'num', v: tok.v, raw: tok.raw };
      if (tok.k === 'id') {
        const lower = tok.v.toLowerCase();
        if (FUNCS[lower] && peek() && peek().k === '(') {
          p++;
          const args = [expr()];
          while (eat(',')) args.push(expr());
          if (!eat(')')) fail(`A bracket is missing after ${tok.v}(`);
          return { t: 'fn', name: lower, args };
        }
        return { t: 'id', name: tok.v };
      }
      if (OPEN[tok.k]) {
        const a = expr();
        if (!eat(OPEN[tok.k])) fail('A closing bracket is missing.');
        return { t: 'par', a, br: tok.k };
      }
      if (tok.k === 'bad') fail(`I can't read "${tok.v}".`);
      fail(`"${tok.k}" is in the wrong place.`);
    }
    if (!t.length) fail('Nothing to read.');
    const ast = expr();
    if (p < t.length) {
      const k = t[p].k;
      fail(k === ')' || k === ']' || k === '}' ? 'There is an extra closing bracket.' : `"${t[p].v || k}" is in the wrong place.`);
    }
    return ast;
  }

  function hasLetters(ast) {
    if (!ast) return false;
    if (ast.t === 'id') return ast.name !== 'e';
    if (ast.t === 'fn') return ast.args.some(hasLetters);
    return hasLetters(ast.a) || hasLetters(ast.b);
  }
  function opCount(ast) {
    if (!ast) return 0;
    if (ast.t === 'bin') return 1 + opCount(ast.a) + opCount(ast.b);
    if (ast.t === 'fn') return 1 + ast.args.reduce((s, x) => s + opCount(x), 0);
    if (ast.t === 'neg' || ast.t === 'par') return opCount(ast.a);
    if (ast.t === 'pct') return opCount(ast.a);
    return 0;
  }
  function evaluate(ast) {
    switch (ast.t) {
      case 'num': return ast.v;
      case 'id': if (ast.name === 'e') return Math.E; throw new Error('letter');
      case 'pct': return evaluate(ast.a) / 100;
      case 'neg': return -evaluate(ast.a);
      case 'par': return evaluate(ast.a);
      case 'fn': return FUNCS[ast.name].apply(null, ast.args.map(evaluate));
      case 'bin': {
        const a = evaluate(ast.a), b = evaluate(ast.b);
        if (ast.op === '+') return a + b;
        if (ast.op === '-') return a - b;
        if (ast.op === '*') return a * b;
        if (ast.op === '/') return a / b;
        return Math.pow(a, b);
      }
      default: throw new Error('?');
    }
  }
  /** The value of a pure-number expression, or null. */
  function value(str) {
    try { const ast = parse(str); if (hasLetters(ast)) return null; const v = evaluate(ast); return Number.isFinite(v) ? v : null; }
    catch (e) { return null; }
  }

  /* ---------- LaTeX ---------- */
  const NAMED = { rf: 'r_f', rm: 'r_m', tc: 't_c', Tc: 'T_c', rE: 'r_E', rD: 'r_D', rU: 'r_U', rA: 'r_A', rP: 'r_P', rd: 'r_d', re: 'r_e', rp: 'r_p', ru: 'r_u',
    Ru: 'R_u', Re: 'R_e', Rd: 'R_d', Rp: 'R_p', Rf: 'R_f', Rm: 'R_m', RM: 'R_M', Pp: 'P_p', VL: 'V_L', VU: 'V_U', PV0: 'PV_0', Rbar: '\\bar{R}',
    DIVp: 'DIV_p', SDp: '\\sigma_p', SDM: '\\sigma_M', FVn: 'FV_n', NPVinf: 'NPV_{\\infty}', APR: '\\mathrm{APR}', EAR: '\\mathrm{EAR}' };
  function idTex(name) {
    if (NAMED[name]) return NAMED[name];
    if (GREEK[name]) return GREEK[name];
    if (/^[Ͱ-Ͽ∞]/.test(name)) return name.split('').map((ch) => UNI[ch] || ch).join('');
    if (name.includes('_')) { const [a, ...b] = name.split('_'); return `${idTex(a)}_{${b.join('\\_')}}`; }
    const m = /^([A-Za-z]+?)(\d+|n|t|k)$/.exec(name);
    if (m && m[1].length <= 3 && /^[A-Z]*[a-z]?$|^[A-Z]+$/.test(m[1]) && !/^[a-z]{2,}$/.test(name)) return `${idTex(m[1])}_{${m[2]}}`;
    if (name.length === 1) return name;
    if (name.length === 2 && /^[a-z][A-Z]$/.test(name)) return `${name[0]}_{${name[1]}}`;
    return `\\mathrm{${name}}`;
  }
  function numTex(raw) { return String(raw).replace(/,/g, '{,}'); }
  const strip = (a) => (a && a.t === 'par' ? a.a : a);
  function tex(ast) {
    switch (ast.t) {
      case 'num': return numTex(ast.raw);
      case 'id': return idTex(ast.name);
      case 'pct': return tex(ast.a) + '\\%';
      case 'neg': return '-' + tex(ast.a);
      case 'par': return ast.br === '(' ? `\\left(${tex(ast.a)}\\right)` : `\\left[${tex(ast.a)}\\right]`;
      case 'fn':
        if (ast.name === 'sqrt') return `\\sqrt{${tex(ast.args[0])}}`;
        if (ast.name === 'exp') return `e^{${tex(ast.args[0])}}`;
        return `\\${ast.name === 'log' ? 'log' : ast.name === 'ln' ? 'ln' : 'operatorname{' + ast.name + '}'}\\left(${ast.args.map(tex).join(', ')}\\right)`;
      case 'bin':
        if (ast.op === '/') return `\\frac{${tex(strip(ast.a))}}{${tex(strip(ast.b))}}`;
        if (ast.op === '^') return `{${tex(ast.a)}}^{${tex(strip(ast.b))}}`;
        if (ast.op === '*') return ast.implicit ? `${tex(ast.a)}\\,${tex(ast.b)}` : `${tex(ast.a)} \\times ${tex(ast.b)}`;
        return `${tex(ast.a)} ${ast.op} ${tex(ast.b)}`;
      default: return '';
    }
  }
  function toTex(str) { return tex(parse(str)); }
  function textTex(s) { return `\\text{${String(s).replace(/[\\{}$&#^_%~]/g, (c) => '\\' + c).replace(/\\\\/g, '\\textbackslash{}')}}`; }

  /** Strip a part label at the start of a line: "a. ", "(b) ", "c) ". */
  function stripLabel(line) { return line.replace(/^\s*(\(?[a-hA-H]\)|[a-hA-H][.:])\s+/, ''); }
  /** A line's "=" pieces, each parsed. */
  function pieces(line) {
    return stripLabel(normalise(line)).split('=').map((raw) => {
      const s = raw.trim();
      if (!s) return { raw: s, kind: 'empty' };
      const toks = tokenize(s);
      const explicit = toks.filter((x) => '+-*/^'.includes(x.k)).length;
      const ids = toks.filter((x) => x.k === 'id').length;
      const nums = toks.filter((x) => x.k === 'num').length;
      // prose: several words and no maths signs ("Change in NWC", "accept the project")
      if (explicit === 0 && nums === 0 && ids >= 2 && !toks.some((x) => OPEN[x.k])) return { raw: s, kind: 'words' };
      try {
        const ast = parse(s);
        const letters = hasLetters(ast);
        let v = null;
        if (!letters) { try { v = evaluate(ast); } catch (e) { v = null; } }
        return { raw: s, ast, kind: letters ? 'formula' : 'number', value: Number.isFinite(v) ? v : null, ops: letters ? explicit : opCount(ast) };
      } catch (e) {
        const prose = (s.match(/[A-Za-z]{3,}/g) || []).length >= 2;
        return { raw: s, kind: 'words', error: e.lin && !prose ? e.message : null };
      }
    });
  }
  function lineTex(line) {
    return pieces(line).filter((x) => x.kind !== 'empty').map((x) => (x.ast && x.kind !== 'words' ? tex(x.ast) : textTex(x.raw))).join(' = ');
  }

  /* ---------- marking ---------- */
  function near(v, answer, unit, dp) {
    if (!Number.isFinite(v) || !Number.isFinite(answer)) return false;
    const cands = [v];
    if (unit === '%') cands.push(v * 100);
    if (unit === '$m') cands.push(v / 1e6);
    const tol = Math.max(Math.pow(10, -(dp == null ? 2 : dp)) * 1.01, Math.abs(answer) * 0.001);
    return cands.some((c) => Math.abs(c - answer) <= tol);
  }
  function decimals(raw) { const m = /\.(\d+)/.exec(String(raw).replace(/,/g, '')); return m ? m[1].length : 0; }

  /**
   * Mark a typed working. spec: {answer, unit, dp}. Returns
   * {lines, formula, subst, hit, final:{raw,value,dp,ok,dpOk,unitOk}, hitValue, problems:[...], marks:{method,answer}}
   */
  function check(text, spec) {
    spec = spec || {};
    const dp = spec.dp == null ? 2 : spec.dp;
    const lines = normalise(text).split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const all = [];
    lines.forEach((l, li) => pieces(l).forEach((x) => { if (x.kind !== 'empty') all.push(Object.assign({ line: li }, x)); }));
    const formulas = all.filter((x) => x.kind === 'formula' && x.ops >= 1);
    const numbers = all.filter((x) => x.kind === 'number');
    const worked = numbers.filter((x) => x.ops >= 1);
    const hitPiece = worked.find((x) => near(x.value, spec.answer, spec.unit, dp));
    const lastNum = numbers.length ? numbers[numbers.length - 1] : null;
    const problems = all.filter((x) => x.error).map((x) => `"${x.raw}": ${x.error}`);
    let final = null;
    if (lastNum) {
      const raw = lastNum.raw;
      const bare = lastNum.ops === 0 || (lastNum.ast && (lastNum.ast.t === 'pct' || lastNum.ast.t === 'neg') && opCount(lastNum.ast) === 0);
      const ok = near(lastNum.value, spec.answer, spec.unit, dp);
      const shownDp = decimals(raw);
      const unitOk = spec.unit === '%' ? /%|per ?cent/i.test(lines[lines.length - 1] || '') : true;
      final = { raw, value: lastNum.value, bare, ok, dp: shownDp, dpOk: dp === 0 ? shownDp === 0 : shownDp === dp, unitOk };
    }
    const methodMarks = (formulas.length ? 1 : 0) + (worked.length ? 1 : 0) + (hitPiece ? 1 : 0);
    return {
      lines: lines.length, pieces: all,
      formula: formulas.length > 0,
      subst: worked.length > 0,
      hit: !!hitPiece,
      hitValue: hitPiece ? hitPiece.value : (worked.length ? worked[worked.length - 1].value : null),
      final, problems,
      marks: { method: methodMarks, answer: final && final.ok ? 1 : 0 },
    };
  }

  root.LINEAR = { tokenize, parse, value, toTex, lineTex, pieces, check, near, normalise, idTex };
})(typeof window !== 'undefined' ? window : globalThis);
