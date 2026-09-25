/* Corporate Ladder — calculator drawer that works like a TI-Nspire CX CAS:
 * a Calculator page (type tvmFV(…), npv(…), nSolve(…), lists, → to store), the Finance Solver,
 * and a command list with examples. The maths comes from js/lib/nspire.js.
 */
(function (root) {
  'use strict';
  const { GAME, SFX, RENDER, NSPIRE, TIVIEW, QCORE } = root;
  const esc = RENDER.esc;
  const st = {
    tab: 'calc',
    calc: { line: '', hist: [], env: { vars: {} } },
    fs: { N: '', I: '', PV: '', Pmt: '', FV: '', PpY: '1', CpY: '1', PmtAt: 'END', solved: '' },
  };
  let open = false;

  const COMMANDS = [
    { g: 'Time value of money', items: [
      ['tvmFV(N,I,PV,Pmt,PpY,CpY)', 'Future value', 'tvmFV(5,6,-1000,0,1,1)'],
      ['tvmPV(N,I,Pmt,FV,PpY,CpY)', 'Present value', 'tvmPV(10,6,0,1000,1,1)'],
      ['tvmPmt(N,I,PV,FV,PpY,CpY)', 'Payment (loan or annuity)', 'tvmPmt(360,7,400000,0,12,12)'],
      ['tvmN(I,PV,Pmt,FV,PpY,CpY)', 'Number of periods', 'tvmN(8,-1000,0,2000,1,1)'],
      ['tvmI(N,PV,Pmt,FV,PpY,CpY)', 'Interest rate (% a year)', 'tvmI(5,-1000,0,1500,1,1)'],
      ['…,PmtAt)', 'Add ,1 at the end for payments at the start of each period (annuity due)', 'tvmFV(10,5,0,-100,1,1,1)'],
    ] },
    { g: 'Cash flows', items: [
      ['npv(rate,CF0,{CF1,CF2,…})', 'NPV. The rate is a percentage', 'npv(10,-1000,{300,400,500})'],
      ['irr(CF0,{CF1,CF2,…})', 'IRR, as a percentage', 'irr(-1000,{300,400,500})'],
      ['npv(rate,CF0,{CF…},{counts})', 'Repeated cash flows: the last list says how many times each repeats', 'npv(8,0,{100,1100},{9,1})'],
      ['cumulativeSum({…})', 'Running totals, for payback', 'cumulativeSum({-1000,300,400,500})'],
    ] },
    { g: 'Rates', items: [
      ['eff(APR,m)', 'Effective annual rate from an APR compounded m times a year', 'eff(12,12)'],
      ['nom(EAR,m)', 'APR from an effective annual rate', 'nom(12.6825,12)'],
    ] },
    { g: 'Solve anything', items: [
      ['nSolve(equation,x)', 'A number that makes the equation true', 'nSolve(1000*(1+r)^5=1500,r)'],
      ['solve(equation,x)', 'All the solutions (add |r>0 to keep only positive ones)', 'solve((1+r)^2=1.21,r)|r>0'],
    ] },
    { g: 'Lists and statistics', items: [
      ['{a,b,c}→x', 'Store a list in x (→ is ctrl var)', '{0.08,0.15,-0.12}→x'],
      ['mean(list)', 'Average', 'mean({0.08,0.15,-0.12})'],
      ['stDevSamp(list)', 'Sample standard deviation (divide by n − 1)', 'stDevSamp({0.08,0.15,-0.12})'],
      ['varSamp(list)', 'Sample variance', 'varSamp({0.08,0.15,-0.12})'],
      ['sum(p*r)', 'Expected return from probabilities p and returns r', 'sum({0.25,0.6,0.15}*{-0.02,0.092,0.154})'],
    ] },
  ];

  function used() { GAME.store.state.stats.calcUses++; GAME.store.save(); GAME.checkAchievements({ type: 'calc' }); }

  /* ---------------- views ---------------- */
  function viewCalc() {
    const c = st.calc;
    const keys = ['{', '}', '→', '^', '√(', '(', ')', 'ans', 'tvmFV(', 'tvmPV(', 'tvmPmt(', 'tvmN(', 'tvmI(', 'npv(', 'irr(', 'eff(', 'nom(', 'nSolve(', 'mean(', 'stDevSamp(', 'sum('];
    return `<p class="calc-note">Type a line like on your TI-Nspire, then press <kbd>Enter</kbd>. Money you pay out is <b>negative</b>.</p>
      <ol class="ti-hist" id="ti-hist" aria-label="History">${c.hist.map((h) => `<li><code class="ti-in">${esc(h.e)}</code><output class="${h.err ? 'ti-err' : 'ti-out'}">${esc(h.err || h.out)}</output></li>`).join('')}</ol>
      <form data-submit="calc-eval" class="cf-row ti-entry"><label for="c-line" class="sr-only">Calculator line</label><input id="c-line" data-line="1" value="${esc(c.line)}" autocomplete="off" spellcheck="false" placeholder="e.g. tvmFV(5,6,-1000,0,1,1)"><button class="btn primary tiny" type="submit">enter</button></form>
      <div class="ti-keys" role="group" aria-label="Insert">${keys.map((k) => `<button class="btn tiny" data-act="calc-ins" data-t="${esc(k)}">${esc(k)}</button>`).join('')}</div>
      <div class="calc-actions"><button class="btn tiny" data-act="calc-clear-hist">Clear history</button></div>`;
  }
  function viewSolver() {
    const f = st.fs;
    const row = (k, lbl, solvable) => `<div class="cf-row"><label for="fs-${k}">${lbl}</label><input id="fs-${k}" data-fs="${k}" inputmode="decimal" value="${esc(f[k])}" class="${f.solved === k ? 'solved' : ''}">${solvable ? `<button class="btn tiny" data-act="fs-solve" data-v="${k}" aria-label="Solve ${lbl}">Solve</button>` : ''}</div>`;
    return `<p class="calc-note">Like <kbd>menu</kbd> <kbd>8</kbd> <kbd>1</kbd> on the TI-Nspire. Fill in what you know, then press <b>Solve</b> next to the unknown (on the TI: <kbd>tab</kbd> to it and press <kbd>enter</kbd>). I(%) is the yearly rate as a percentage.</p>
      <div class="ti-screen fs-form">${row('N', 'N', true)}${row('I', 'I(%)', true)}${row('PV', 'PV', true)}${row('Pmt', 'Pmt', true)}${row('FV', 'FV', true)}${row('PpY', 'PpY', false)}${row('CpY', 'CpY', false)}
        <div class="cf-row"><span class="lbl">PmtAt</span><div class="seg" role="radiogroup" aria-label="PmtAt">${['END', 'BEGIN'].map((v) => `<button class="seg-btn${f.PmtAt === v ? ' on' : ''}" role="radio" aria-checked="${f.PmtAt === v}" data-act="fs-at" data-v="${v}">${v}</button>`).join('')}</div></div></div>
      <div class="calc-actions"><button class="btn tiny" data-act="fs-clear">Clear</button></div>
      <div class="calc-out" id="calc-out" aria-live="polite"></div>`;
  }
  function viewHelp() {
    return `<p class="calc-note">Tap <b>Try it</b> to put an example on the calculator line.</p>` + COMMANDS.map((g) => `<h4>${esc(g.g)}</h4><ul class="ti-cmds">${g.items.map(([sig, what, ex]) => `<li><code>${esc(sig)}</code><span>${esc(what)}</span><button class="btn tiny" data-act="calc-try" data-t="${esc(ex)}">Try it</button></li>`).join('')}</ul>`).join('');
  }

  function render() {
    const el = document.getElementById('calc');
    if (!el) return;
    const tabs = [['calc', 'Calculator'], ['solver', 'Finance Solver'], ['help', 'Commands']];
    el.querySelector('.calc-tabs').innerHTML = tabs.map(([id, l]) => `<button role="tab" aria-selected="${st.tab === id}" class="tab${st.tab === id ? ' on' : ''}" data-act="calc-tab" data-t="${id}">${l}</button>`).join('');
    el.querySelector('.calc-body').innerHTML = st.tab === 'calc' ? viewCalc() : st.tab === 'solver' ? viewSolver() : viewHelp();
    const h = document.getElementById('ti-hist'); if (h) h.scrollTop = h.scrollHeight;
  }
  function out(html, bad) { const o = document.getElementById('calc-out'); if (o) { o.innerHTML = html; o.classList.toggle('bad', !!bad); } }
  function focusLine(selectAll) { setTimeout(() => { const f = document.getElementById('c-line'); if (f) { f.focus(); if (selectAll) f.select(); else f.setSelectionRange(f.value.length, f.value.length); } }, 30); }

  function toggle(force) {
    open = force === undefined ? !open : force;
    let el = document.getElementById('calc');
    if (!el) {
      el = document.createElement('aside');
      el.id = 'calc';
      el.className = 'calc';
      el.setAttribute('aria-label', 'TI-Nspire style calculator');
      el.innerHTML = `<header class="calc-head"><b>🧮 TI-Nspire calculator</b><button class="icon-btn" data-act="calc-close" aria-label="Close calculator">✕</button></header><div class="calc-tabs" role="tablist"></div><div class="calc-body"></div>`;
      document.body.appendChild(el);
      el.addEventListener('input', onInput);
    }
    el.classList.toggle('open', open);
    document.documentElement.classList.toggle('calc-open', open);
    if (open) { render(); SFX.play('open'); if (st.tab === 'calc') focusLine(); }
  }

  function onInput(e) {
    const t = e.target;
    if (t.dataset.line) st.calc.line = t.value;
    else if (t.dataset.fs) {
      const k = t.dataset.fs;
      if (k === 'PpY' && st.fs.CpY === st.fs.PpY) { st.fs.CpY = t.value; const c = document.getElementById('fs-CpY'); if (c) c.value = t.value; } // the TI copies PpY into CpY
      st.fs[k] = t.value;
      if (st.fs.solved === k) st.fs.solved = '';
    }
  }

  function evalLine() {
    const c = st.calc;
    const line = c.line.trim();
    if (!line) return;
    let entry;
    try {
      const v = NSPIRE.evaluate(line, c.env);
      entry = { e: line, out: TIVIEW.screenNum(v) };
      if (/tvm/i.test(line)) {
        const n = (line.match(/,/g) || []).length;
        if (n === 4) entry.out += '   (tip: add ,1,1 or ,12,12 for PpY and CpY)';
      }
      used();
    } catch (e) { entry = { e: line, err: e.message }; SFX.play('wrong'); }
    c.hist.push(entry);
    if (c.hist.length > 30) c.hist.shift();
    c.line = entry.err ? line : '';
    render();
    focusLine(!!entry.err);
  }

  function fsSolve(k) {
    const f = st.fs;
    const vals = {};
    ['N', 'I', 'PV', 'Pmt', 'FV', 'PpY', 'CpY'].forEach((x) => { if (x !== k && String(f[x]).trim() !== '') vals[x] = QCORE.parseNumber(f[x]); });
    vals.PmtAt = f.PmtAt;
    try {
      const v = NSPIRE.solverSolve(vals, k);
      f[k] = String(+v.toFixed(k === 'N' || k === 'I' ? 6 : 2));
      f.solved = k;
      render();
      out(`<b>${k === 'I' ? 'I(%)' : k}</b> = ${esc(TIVIEW.screenNum(v))}${k === 'N' && +f.PpY === 12 ? ` <span class="muted">(${esc(TIVIEW.screenNum(v / 12))} years)</span>` : ''}`);
      used();
    } catch (e) { render(); out(esc(e.message), true); }
  }

  Object.assign(GAME.actions, {
    'open-calc': () => toggle(),
    'calc-close': () => toggle(false),
    'calc-tab': (el) => { st.tab = el.dataset.t; render(); if (st.tab === 'calc') focusLine(); },
    'calc-eval': () => evalLine(),
    'calc-ins': (el) => {
      const f = document.getElementById('c-line');
      const t = el.dataset.t;
      if (f) {
        const a = f.selectionStart === undefined ? f.value.length : f.selectionStart, b = f.selectionEnd === undefined ? a : f.selectionEnd;
        f.value = f.value.slice(0, a) + t + f.value.slice(b);
        st.calc.line = f.value;
        f.focus(); f.setSelectionRange(a + t.length, a + t.length);
      }
    },
    'calc-try': (el) => { st.tab = 'calc'; st.calc.line = el.dataset.t; render(); focusLine(); },
    'calc-clear-hist': () => { st.calc.hist = []; render(); focusLine(); },
    'fs-solve': (el) => fsSolve(el.dataset.v),
    'fs-at': (el) => { st.fs.PmtAt = el.dataset.v; render(); },
    'fs-clear': () => { Object.assign(st.fs, { N: '', I: '', PV: '', Pmt: '', FV: '', PpY: '1', CpY: '1', PmtAt: 'END', solved: '' }); render(); },
  });

  root.CALC = { toggle, get open() { return open; }, evaluate: (line) => NSPIRE.evaluate(line, st.calc.env) };
})(typeof window !== 'undefined' ? window : globalThis);
