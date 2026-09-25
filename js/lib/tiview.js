/* Corporate Ladder — draws TI-Nspire CX CAS steps: Finance Solver screens, calculator lines and tips.
 * Every result is computed by the emulator (js/lib/nspire.js), so the screen always matches the maths.
 */
(function (root) {
  'use strict';
  const { NSPIRE, RENDER } = root;
  const esc = RENDER.esc;

  const LABEL = { N: 'N', I: 'I(%)', PV: 'PV', Pmt: 'Pmt', FV: 'FV', PpY: 'PpY', CpY: 'CpY', PmtAt: 'PmtAt' };
  const SAY = { N: 'N', I: 'I percent', PV: 'P V', Pmt: 'payment', FV: 'F V', PpY: 'payments per year', CpY: 'compounding periods per year', PmtAt: 'payment at' };

  /** A result the way a TI shows it (about 6 significant figures; big money keeps its cents). */
  function screenNum(v) {
    if (typeof v !== 'number') return NSPIRE.shown(v);
    if (!Number.isFinite(v)) return 'undef';
    if (Math.abs(v) < 1e-9) return '0';
    const s = Math.abs(v) >= 1e5 ? String(+v.toFixed(2)) : String(+v.toPrecision(6));
    return s.replace(/^-/, '−');
  }
  /** What you type: show minus signs as the TI's (−) negative sign. */
  function typedHTML(cmd) { return esc(cmd).replace(/-/g, '−').replace(/\*/g, '×').replace(/->/g, '→'); }

  function keyTips(cmd, seen) {
    const tips = [];
    const add = (id, html) => { if (!seen.has(id)) { seen.add(id); tips.push(html); } };
    if (/-/.test(cmd)) add('neg', 'For a negative number use the <kbd>(−)</kbd> key, not the minus key.');
    if (/[{}]/.test(cmd)) add('brace', 'Type <b>{</b> with <kbd>ctrl</kbd> <kbd>(</kbd> and <b>}</b> with <kbd>ctrl</kbd> <kbd>)</kbd>.');
    if (/→|->/.test(cmd)) add('sto', 'Type <b>→</b> (store) with <kbd>ctrl</kbd> <kbd>var</kbd>.');
    if (/e\^/.test(cmd)) add('exp', 'Type <b>e^(</b> with the <kbd>e<sup>x</sup></kbd> key (<kbd>ctrl</kbd> <kbd>ln</kbd>).');
    if (/\^/.test(cmd.replace(/e\^/g, ''))) add('pow', 'Type powers with the <kbd>^</kbd> key.');
    if (/\|/.test(cmd)) add('with', 'The <b>|</b> sign means “with” (it adds a condition).');
    if (/tvm/i.test(cmd)) add('tvm', 'Type the letters, or find it in <kbd>menu</kbd> → Finance → TVM Functions.');
    if (/\b(npv|irr)\(/i.test(cmd)) add('cf', 'Type the letters, or find it in <kbd>menu</kbd> → Finance → Cash Flows.');
    if (/\b(eff|nom)\(/i.test(cmd)) add('conv', 'Type the letters, or find it in <kbd>menu</kbd> → Finance → Interest Conversion.');
    if (/\bn?solve\(/i.test(cmd)) add('solve', 'Type the letters. If you see a fraction or a long exact answer, press <kbd>ctrl</kbd> <kbd>enter</kbd> for a decimal.');
    return tips;
  }

  function solverHTML(st, value, error) {
    const f = st.solver;
    const rows = NSPIRE.FIELDS.map((k) => {
      const isFind = k === st.find;
      let v = isFind ? (error ? '?' : screenNum(value)) : (f[k] === undefined ? '' : k === 'PmtAt' ? f[k] : screenNum(+f[k]));
      return `<div class="ti-f${isFind ? ' solve' : ''}"><span class="ti-k">${LABEL[k]}:</span><span class="ti-v">${esc(String(v))}</span>${isFind ? '<span class="ti-here" aria-hidden="true">◀ solve this</span>' : ''}</div>`;
    }).join('');
    return `<p class="ti-how">Open the <b>Finance Solver</b>: <kbd>menu</kbd> <kbd>8</kbd> <kbd>1</kbd>. Fill in the boxes (use <kbd>tab</kbd> to move down).</p>
      <div class="ti-screen" role="img" aria-label="${esc(solverSpeech(st, value))}"><div class="ti-title">Finance Solver</div><div class="ti-form">${rows}</div></div>
      <p class="ti-how">Press <kbd>tab</kbd> until <b>${LABEL[st.find]}</b> is selected, then press <kbd>enter</kbd>.${error ? '' : ` Answer: <b class="ti-res">${esc(LABEL[st.find])} = ${esc(screenNum(value))}</b>`}</p>`;
  }

  function cmdHTML(st, value, error, first) {
    return `${first ? '<p class="ti-how">In a <b>Calculator</b> page, type this line and press <kbd>enter</kbd>:</p>' : ''}
      <div class="ti-screen ti-calcline"><div class="ti-line"><code class="ti-in">${typedHTML(st.cmd)}</code><output class="ti-out">${error ? '<span class="ti-err">Error</span>' : esc(screenNum(value))}</output></div></div>`;
  }

  /** HTML for a method (array of steps). opts: {title} */
  function html(steps, opts) {
    if (!steps || !steps.length) return '';
    opts = opts || {};
    const run = NSPIRE.run(steps);
    const seen = new Set();
    let firstCmd = true;
    const items = run.results.map((r) => {
      const st = r.step;
      let body = '';
      if (st.say) body = `<p class="ti-say">${RENDER.rich(st.say)}</p>`;
      else if (st.solver) body = solverHTML(st, r.value, r.error);
      else if (st.cmd) { body = cmdHTML(st, r.value, r.error, firstCmd); firstCmd = false; const tips = keyTips(st.cmd, seen); if (tips.length) body += `<p class="ti-tip">${tips.join(' ')}</p>`; }
      if (r.error) body += `<p class="ti-tip bad">${esc(r.error)}</p>`;
      if (st.note) body += `<p class="ti-note">${RENDER.rich(st.note)}</p>`;
      return `<li class="ti-step">${body}</li>`;
    }).join('');
    return `<section class="ti" aria-label="TI-Nspire CX CAS steps"><header class="ti-h"><span class="ti-badge">TI-Nspire CX CAS</span>${opts.title ? `<b>${esc(opts.title)}</b>` : ''}</header><ol class="ti-steps">${items}</ol></section>`;
  }

  /* ---------------- read-aloud text ---------------- */
  function spokenNum(v) { return String(v).replace(/^−|^-/, 'minus '); }
  function solverSpeech(st, value) {
    const f = st.solver;
    const parts = NSPIRE.FIELDS.filter((k) => k !== st.find && f[k] !== undefined).map((k) => `${SAY[k]} ${k === 'PmtAt' ? f[k] : spokenNum(screenNum(+f[k]))}`);
    return `Finance Solver. ${parts.join(', ')}. Solve ${SAY[st.find]}${Number.isFinite(value) ? ': ' + spokenNum(screenNum(value)) : ''}.`;
  }
  function cmdSpeech(cmd) {
    return String(cmd).replace(/tvm(FV|PV|Pmt|N|I)/gi, (m, x) => 'T V M ' + x.split('').join(' ') + ' ')
      .replace(/nSolve/gi, 'n solve ').replace(/stDevSamp/gi, 'standard deviation sample ').replace(/varSamp/gi, 'variance sample ')
      .replace(/\{/g, ' list ').replace(/\}/g, ' end list ').replace(/\(/g, ' of ').replace(/\)/g, ' ')
      .replace(/\^/g, ' to the power ').replace(/\*/g, ' times ').replace(/\//g, ' divided by ').replace(/-/g, ' minus ').replace(/\+/g, ' plus ')
      .replace(/=/g, ' equals ').replace(/→|->/g, ' store in ').replace(/,/g, ', ').replace(/\s+/g, ' ').trim();
  }
  function speech(steps) {
    if (!steps || !steps.length) return '';
    const run = NSPIRE.run(steps);
    return 'On your T I N spire: ' + run.results.map((r) => {
      const st = r.step;
      if (st.say) return RENDER.speech(st.say);
      if (st.solver) return 'Open the Finance Solver with menu, 8, 1. ' + solverSpeech(st, r.value);
      if (st.cmd) return 'Type ' + cmdSpeech(st.cmd) + (r.error ? '' : '. Result ' + spokenNum(screenNum(r.value)));
      return '';
    }).join('. ');
  }

  root.TIVIEW = { html, speech, screenNum };
})(typeof window !== 'undefined' ? window : globalThis);
