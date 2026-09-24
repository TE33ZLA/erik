/* Corporate Ladder — financial calculator drawer (HP10bII+ style sign convention). */
(function (root) {
  'use strict';
  const { GAME, UI, FIN, SFX, RENDER, QCORE } = root;
  const esc = RENDER.esc;
  const st = { tab: 'tvm', tvm: { N: '', I: '', PV: '', PMT: '', FV: '', PY: '1', beg: false }, cf: { cf0: '', rows: [{ v: '', n: '1' }], i: '' }, stats: { x: '', y: '' }, basic: { expr: '', hist: [], ans: 0 }, conv: { nom: '', eff: '', m: '12' } };
  let open = false;

  const num = (v) => QCORE.parseNumber(v);
  const fmt = (v, dp) => (Number.isFinite(v) ? (+v.toFixed(dp === undefined ? 6 : dp)).toLocaleString('en-AU', { maximumFractionDigits: dp === undefined ? 6 : dp }) : '—');
  function used() { GAME.store.state.stats.calcUses++; GAME.store.save(); GAME.checkAchievements({ type: 'calc' }); }

  /* ---------------- expression evaluator (safe, no eval) ---------------- */
  function evaluate(src, ans) {
    const s = String(src).replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/,/g, '');
    const toks = [];
    const re = /\s*(\d+\.?\d*(?:e[+-]?\d+)?|\.\d+|[A-Za-z]+|\*\*|[-+*/^()%])/gy;
    let m, pos = 0;
    while (pos < s.length) {
      re.lastIndex = pos;
      m = re.exec(s);
      if (!m) { if (/^\s*$/.test(s.slice(pos))) break; throw new Error('I do not understand “' + s.slice(pos, pos + 6) + '”'); }
      toks.push(m[1] === '**' ? '^' : m[1]);
      pos = re.lastIndex;
    }
    let i = 0;
    const peek = () => toks[i], take = () => toks[i++];
    const FUN = { ln: Math.log, log: Math.log10, exp: Math.exp, sqrt: Math.sqrt, abs: Math.abs };
    function expr() { let v = term(); while (peek() === '+' || peek() === '-') { const o = take(); const r = term(); v = o === '+' ? v + r : v - r; } return v; }
    function term() { let v = power(); while (peek() === '*' || peek() === '/') { const o = take(); const r = power(); v = o === '*' ? v * r : v / r; } return v; }
    function power() { let v = unary(); if (peek() === '^') { take(); v = Math.pow(v, power()); } return v; }
    function unary() { if (peek() === '-') { take(); return -unary(); } if (peek() === '+') { take(); return unary(); } return postfix(); }
    function postfix() { let v = atom(); while (peek() === '%') { take(); v = v / 100; } return v; }
    function atom() {
      const t = take();
      if (t === undefined) throw new Error('The expression ends too early.');
      if (t === '(') { const v = expr(); if (take() !== ')') throw new Error('A bracket is missing.'); return v; }
      if (/^[\d.]/.test(t)) return parseFloat(t);
      const w = t.toLowerCase();
      if (w === 'e') return Math.E;
      if (w === 'pi') return Math.PI;
      if (w === 'ans') return ans || 0;
      if (FUN[w]) { const v = atom(); return FUN[w](v); }
      throw new Error('Unknown word “' + t + '”.');
    }
    const v = expr();
    if (i < toks.length) throw new Error('Check the expression near “' + toks[i] + '”.');
    return v;
  }

  /* ---------------- views ---------------- */
  function field(id, label, val, solve, hint) {
    return `<div class="cf-row"><label for="c-${id}">${label}</label><input id="c-${id}" data-cfield="${id}" inputmode="decimal" value="${esc(val)}" ${hint ? `aria-describedby="h-${id}"` : ''}>${solve ? `<button class="btn tiny" data-act="calc-solve" data-v="${id}">Solve</button>` : ''}</div>`;
  }
  function viewTVM() {
    const t = st.tvm;
    return `<p class="calc-note">Money you pay out is <b>negative</b>. I/YR is the annual rate; it is divided by P/YR.</p>
      ${field('N', 'N', t.N, true)}${field('I', 'I/YR %', t.I, true)}${field('PV', 'PV', t.PV, true)}${field('PMT', 'PMT', t.PMT, true)}${field('FV', 'FV', t.FV, true)}
      <div class="cf-row"><label for="c-PY">P/YR</label><input id="c-PY" data-cfield="PY" inputmode="decimal" value="${esc(t.PY)}"><button class="btn tiny${t.beg ? ' on' : ''}" data-act="calc-beg" aria-pressed="${t.beg}">${t.beg ? 'BEG' : 'END'}</button></div>
      <div class="calc-actions"><button class="btn tiny" data-act="calc-clear-tvm">Clear TVM</button></div>
      <div class="calc-out" id="calc-out" aria-live="polite"></div>
      <h4>Rate converter (NOM% ↔ EFF%)</h4>
      <div class="cf-row"><label for="c-nom">NOM %</label><input id="c-nom" data-conv="nom" inputmode="decimal" value="${esc(st.conv.nom)}"><button class="btn tiny" data-act="calc-conv" data-to="eff">→ EFF</button></div>
      <div class="cf-row"><label for="c-eff">EFF %</label><input id="c-eff" data-conv="eff" inputmode="decimal" value="${esc(st.conv.eff)}"><button class="btn tiny" data-act="calc-conv" data-to="nom">→ NOM</button></div>
      <div class="cf-row"><label for="c-m">P/YR</label><input id="c-m" data-conv="m" inputmode="decimal" value="${esc(st.conv.m)}"></div>`;
  }
  function viewCF() {
    const c = st.cf;
    return `<p class="calc-note">Enter CF0 (usually negative), then each later cash flow with how many times it repeats (Nj).</p>
      <div class="cf-row"><label for="c-cf0">CF0</label><input id="c-cf0" data-cf="cf0" inputmode="decimal" value="${esc(c.cf0)}"></div>
      ${c.rows.map((r, k) => `<div class="cf-row two"><label for="c-cfv${k}">CF${k + 1}</label><input id="c-cfv${k}" data-cfrow="${k}" data-part="v" inputmode="decimal" value="${esc(r.v)}"><span class="x">×</span><input aria-label="Repeat count for CF${k + 1}" class="nj" data-cfrow="${k}" data-part="n" inputmode="numeric" value="${esc(r.n)}"><button class="icon-btn" data-act="calc-cf-del" data-k="${k}" aria-label="Remove row">✕</button></div>`).join('')}
      <div class="calc-actions"><button class="btn tiny" data-act="calc-cf-add">+ Add cash flow</button><button class="btn tiny" data-act="calc-cf-clear">Clear</button></div>
      <div class="cf-row"><label for="c-cfi">I/YR %</label><input id="c-cfi" data-cf="i" inputmode="decimal" value="${esc(c.i)}"></div>
      <div class="calc-actions"><button class="btn primary tiny" data-act="calc-npv">NPV</button><button class="btn primary tiny" data-act="calc-irr">IRR</button><button class="btn tiny" data-act="calc-pb">Payback</button></div>
      <div class="calc-out" id="calc-out" aria-live="polite"></div>`;
  }
  function viewStats() {
    return `<p class="calc-note">Type numbers separated by spaces, commas or new lines. Uses the sample formulas (divide by n − 1) like [Sx] on the HP.</p>
      <label for="c-sx">X values</label><textarea id="c-sx" data-stat="x" rows="3">${esc(st.stats.x)}</textarea>
      <label for="c-sy">Y values (optional, same length)</label><textarea id="c-sy" data-stat="y" rows="3">${esc(st.stats.y)}</textarea>
      <div class="calc-actions"><button class="btn primary tiny" data-act="calc-stats">Calculate</button></div>
      <div class="calc-out" id="calc-out" aria-live="polite"></div>`;
  }
  function viewBasic() {
    return `<p class="calc-note">Supports + − × ÷ ^ ( ) and ln, exp, sqrt, e, ans. Example: <code>1000*(1.06)^5</code></p>
      <form data-submit="calc-eval" class="cf-row"><label for="c-expr" class="sr-only">Expression</label><input id="c-expr" data-basic="expr" value="${esc(st.basic.expr)}" autocomplete="off" spellcheck="false" placeholder="e.g. (1+0.08/12)^12-1"><button class="btn primary tiny" type="submit">=</button></form>
      <div class="calc-out" id="calc-out" aria-live="polite">${st.basic.hist.length ? '' : ''}</div>
      <ul class="calc-hist">${st.basic.hist.map((h) => `<li><span>${esc(h.e)}</span><b>${esc(fmt(h.v, 8))}</b></li>`).join('')}</ul>`;
  }

  function render() {
    const el = document.getElementById('calc');
    if (!el) return;
    const tabs = [['tvm', 'TVM'], ['cf', 'Cash flows'], ['stats', 'Stats'], ['basic', 'Basic']];
    el.querySelector('.calc-tabs').innerHTML = tabs.map(([id, l]) => `<button role="tab" aria-selected="${st.tab === id}" class="tab${st.tab === id ? ' on' : ''}" data-act="calc-tab" data-t="${id}">${l}</button>`).join('');
    el.querySelector('.calc-body').innerHTML = st.tab === 'tvm' ? viewTVM() : st.tab === 'cf' ? viewCF() : st.tab === 'stats' ? viewStats() : viewBasic();
  }
  function out(html, bad) { const o = document.getElementById('calc-out'); if (o) { o.innerHTML = html; o.classList.toggle('bad', !!bad); } }

  function toggle(force) {
    open = force === undefined ? !open : force;
    let el = document.getElementById('calc');
    if (!el) {
      el = document.createElement('aside');
      el.id = 'calc';
      el.className = 'calc';
      el.setAttribute('aria-label', 'Financial calculator');
      el.innerHTML = `<header class="calc-head"><b>🧮 Calculator</b><button class="icon-btn" data-act="calc-close" aria-label="Close calculator">✕</button></header><div class="calc-tabs" role="tablist"></div><div class="calc-body"></div>`;
      document.body.appendChild(el);
      el.addEventListener('input', onInput);
    }
    el.classList.toggle('open', open);
    document.documentElement.classList.toggle('calc-open', open);
    if (open) { render(); SFX.play('open'); setTimeout(() => { const f = el.querySelector('.calc-body input, .calc-body textarea'); if (f) f.focus(); }, 60); }
  }

  function onInput(e) {
    const t = e.target;
    if (t.dataset.cfield) st.tvm[t.dataset.cfield] = t.value;
    else if (t.dataset.conv) st.conv[t.dataset.conv] = t.value;
    else if (t.dataset.cf) st.cf[t.dataset.cf] = t.value;
    else if (t.dataset.cfrow !== undefined) st.cf.rows[+t.dataset.cfrow][t.dataset.part] = t.value;
    else if (t.dataset.stat) st.stats[t.dataset.stat] = t.value;
    else if (t.dataset.basic) st.basic.expr = t.value;
  }

  function solve(v) {
    const t = st.tvm;
    const py = num(t.PY) || 1;
    const n = num(t.N), I = num(t.I), pv = num(t.PV) || 0, pmt = num(t.PMT) || 0, fv = num(t.FV) || 0;
    const i = I / py / 100;
    const type = t.beg ? 1 : 0;
    let res;
    try {
      if (v === 'N') { if (!Number.isFinite(I)) throw new Error('Enter I/YR first.'); res = FIN.tvm.solveN(i, pv, pmt, fv, type); }
      else if (v === 'I') { if (!Number.isFinite(n)) throw new Error('Enter N first.'); const per = FIN.tvm.solveI(n, pv, pmt, fv, type); res = per * py * 100; }
      else if (v === 'PV') { if (!Number.isFinite(n) || !Number.isFinite(I)) throw new Error('Enter N and I/YR first.'); res = FIN.tvm.solvePV(n, i, pmt, fv, type); }
      else if (v === 'PMT') { if (!Number.isFinite(n) || !Number.isFinite(I)) throw new Error('Enter N and I/YR first.'); res = FIN.tvm.solvePMT(n, i, pv, fv, type); }
      else if (v === 'FV') { if (!Number.isFinite(n) || !Number.isFinite(I)) throw new Error('Enter N and I/YR first.'); res = FIN.tvm.solveFV(n, i, pv, pmt, type); }
      if (!Number.isFinite(res)) throw new Error('No solution. Check the signs: at least one of PV, PMT and FV must be negative and one positive.');
    } catch (e) { out(esc(e.message), true); return; }
    const dp = v === 'N' ? 4 : v === 'I' ? 6 : 2;
    t[v] = String(+res.toFixed(dp));
    render();
    out(`<b>${v === 'I' ? 'I/YR' : v}</b> = ${esc(fmt(res, dp))}${v === 'N' && py === 12 ? ` <span class="muted">(${fmt(res / 12, 4)} years)</span>` : ''}`);
    const inp = document.getElementById('c-' + v); if (inp) inp.classList.add('solved');
    used();
  }

  function cashflows() {
    const c = st.cf;
    const list = [num(c.cf0) || 0];
    c.rows.forEach((r) => { const v = num(r.v); const k = Math.max(1, Math.min(600, Math.round(num(r.n) || 1))); if (Number.isFinite(v)) for (let j = 0; j < k; j++) list.push(v); });
    return list;
  }

  Object.assign(GAME.actions, {
    'open-calc': () => toggle(),
    'calc-close': () => toggle(false),
    'calc-tab': (el) => { st.tab = el.dataset.t; render(); },
    'calc-solve': (el) => solve(el.dataset.v),
    'calc-beg': () => { st.tvm.beg = !st.tvm.beg; render(); },
    'calc-clear-tvm': () => { Object.assign(st.tvm, { N: '', I: '', PV: '', PMT: '', FV: '', PY: '1', beg: false }); render(); },
    'calc-conv': (el) => {
      const m = num(st.conv.m) || 1;
      if (el.dataset.to === 'eff') { const nom = num(st.conv.nom); if (!Number.isFinite(nom)) return out('Enter NOM% first.', true); st.conv.eff = String(+(FIN.ear(nom / 100, m) * 100).toFixed(6)); }
      else { const eff = num(st.conv.eff); if (!Number.isFinite(eff)) return out('Enter EFF% first.', true); st.conv.nom = String(+(FIN.aprFromEar(eff / 100, m) * 100).toFixed(6)); }
      render(); used();
      out(`NOM ${esc(st.conv.nom)}% with ${m} periods per year ⇔ EFF ${esc(st.conv.eff)}%`);
    },
    'calc-cf-add': () => { st.cf.rows.push({ v: '', n: '1' }); render(); const k = st.cf.rows.length - 1; setTimeout(() => { const f = document.getElementById('c-cfv' + k); if (f) f.focus(); }, 30); },
    'calc-cf-del': (el) => { st.cf.rows.splice(+el.dataset.k, 1); if (!st.cf.rows.length) st.cf.rows.push({ v: '', n: '1' }); render(); },
    'calc-cf-clear': () => { st.cf = { cf0: '', rows: [{ v: '', n: '1' }], i: st.cf.i }; render(); },
    'calc-npv': () => { const i = num(st.cf.i); if (!Number.isFinite(i)) return out('Enter I/YR first.', true); const v = FIN.npv(i / 100, cashflows()); out(`<b>NPV</b> = ${esc(fmt(v, 2))}`); used(); },
    'calc-irr': () => {
      const cfs = cashflows();
      const all = FIN.irrAll(cfs);
      if (!all.length) return out('No IRR found. The cash flows may never change sign, or NPV never reaches zero.', true);
      out(`<b>IRR/YR</b> = ${esc(fmt(all[0] * 100, 4))}%${all.length > 1 ? `<br><span class="muted">Warning: ${all.length} IRRs exist (${all.map((x) => fmt(x * 100, 2) + '%').join(', ')}). Use NPV.</span>` : ''}`);
      used();
    },
    'calc-pb': () => { const p = FIN.payback(cashflows()); out(Number.isFinite(p) ? `<b>Payback</b> = ${esc(fmt(p, 4))} periods` : 'The cost is never recovered.', !Number.isFinite(p)); used(); },
    'calc-stats': () => {
      const parse = (s) => String(s).split(/[\s,;]+/).filter(Boolean).map(num).filter(Number.isFinite);
      const x = parse(st.stats.x), y = parse(st.stats.y);
      if (x.length < 2) return out('Enter at least two X values.', true);
      let h = `n = ${x.length}<br>x̄ = ${esc(fmt(FIN.mean(x), 6))}<br>Sx (sample SD) = ${esc(fmt(FIN.sdS(x), 6))}<br>σx (population SD) = ${esc(fmt(Math.sqrt(FIN.varP(x)), 6))}<br>Sample variance = ${esc(fmt(FIN.varS(x), 8))}`;
      if (y.length) {
        if (y.length !== x.length) return out('X and Y need the same number of values.', true);
        h += `<hr>ȳ = ${esc(fmt(FIN.mean(y), 6))}<br>Sy = ${esc(fmt(FIN.sdS(y), 6))}<br>Sample covariance = ${esc(fmt(FIN.covS(x, y), 8))}<br>Correlation r = ${esc(fmt(FIN.corrS(x, y), 6))}`;
      }
      out(h); used();
    },
    'calc-eval': () => {
      try {
        const v = evaluate(st.basic.expr, st.basic.ans);
        if (!Number.isFinite(v)) throw new Error('The result is not a finite number.');
        st.basic.ans = v;
        st.basic.hist.unshift({ e: st.basic.expr, v });
        st.basic.hist = st.basic.hist.slice(0, 6);
        render();
        out(`<b>= ${esc(fmt(v, 10))}</b>`);
        used();
        setTimeout(() => { const f = document.getElementById('c-expr'); if (f) { f.focus(); f.select(); } }, 20);
      } catch (e) { out(esc(e.message), true); }
    },
  });

  root.CALC = { toggle, evaluate, get open() { return open; } };
})(typeof window !== 'undefined' ? window : globalThis);
