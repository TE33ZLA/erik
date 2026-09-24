/* Corporate Ladder — question card rendering (shared by battles, exams, reviews and the ledger). */
(function (root) {
  'use strict';
  const { GAME, UI, CHARTS, RENDER, FORMULAS, QCORE } = root;
  const esc = RENDER.esc;
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  function pips(level) {
    return `<span class="pips" aria-label="Difficulty ${level} of 3">${[1, 2, 3].map((k) => `<i class="${k <= level ? 'on' : ''}"></i>`).join('')}</span>`;
  }

  function calcKeys(str) {
    if (!str) return '';
    const parts = String(str).split(/(\[[^\]]+\])/g).map((p) => (/^\[.+\]$/.test(p) ? `<kbd>${esc(p.slice(1, -1))}</kbd>` : esc(p)));
    return `<div class="calc-keys"><span class="calc-lbl">HP10bII+</span> ${parts.join('')}</div>`;
  }

  function givens(q) {
    if (!q.givens || !q.givens.length || !GAME.store.state.settings.givens) return '';
    return `<div class="givens" aria-label="Given values"><span class="gv-lbl">Given</span>${q.givens.map(([k, v]) => `<span class="gv">${UI.rich('\\(' + k + ' = ' + v + '\\)')}</span>`).join('')}</div>`;
  }

  function formulaCard(id, compact) {
    const f = FORMULAS.byId[id];
    if (!f) return '';
    return `<div class="fcard${compact ? ' compact' : ''}"><div class="fc-top"><b>${esc(f.name)}</b>${f.sheet ? '<span class="tag sheet">On formula sheet</span>' : '<span class="tag mem">Remember this</span>'}</div>
      <div class="fc-tex">${UI.rich('\\[' + f.tex + '\\]')}</div>
      ${f.vars ? `<p class="fc-vars">${UI.rich(f.vars)}</p>` : ''}${!compact && f.when ? `<p class="fc-when">${UI.rich(f.when)}</p>` : ''}</div>`;
  }

  /** The question card. opts: {num, total, tools:{hint, fifty}, label} */
  function card(q, opts) {
    opts = opts || {};
    const meta = [];
    if (opts.num) meta.push(`<span>${opts.total ? `Question ${opts.num} of ${opts.total}` : `Question ${opts.num}`}</span>`);
    meta.push(`<span class="topic">${esc(q.topicLabel)}</span>`);
    meta.push(pips(q.level));
    const tools = [];
    tools.push(`<button class="icon-btn" data-act="speak-q" aria-label="Read the question aloud" title="Read aloud (S)">🔊</button>`);
    if (opts.tools && opts.tools.hint !== undefined) tools.push(`<button class="chip-btn" data-act="use-hint" ${opts.tools.hint > 0 ? '' : 'disabled'} title="Hint (H)">📜 Hint <b>${opts.tools.hint}</b></button>`);
    if (opts.tools && opts.tools.fifty !== undefined && q.mode === 'choice' && !q.tf) tools.push(`<button class="chip-btn" data-act="use-fifty" ${opts.tools.fifty > 0 ? '' : 'disabled'} title="Remove two wrong answers">✂️ 50/50 <b>${opts.tools.fifty}</b></button>`);
    return `<article class="qcard lv${q.level}" data-key="${esc(q.key)}">
      <header class="qhead"><div class="qmeta">${meta.join('<span class="dot" aria-hidden="true">·</span>')}${q.src ? `<span class="src">${esc(q.src)}</span>` : ''}</div><div class="qtools">${tools.join('')}</div></header>
      <div class="qtext">${UI.rich(q.q)}</div>
      ${CHARTS.visuals(q, { highlight: GAME.store.state.settings.hl })}
      ${givens(q)}
      <div class="hintbox" hidden></div>
      <div class="answers">${answers(q)}</div>
      <div class="feedback" hidden aria-live="polite"></div>
    </article>`;
  }

  function answers(q) {
    if (q.mode === 'choice') {
      return `<div class="opts${q.tf ? ' tf' : ''}" role="group" aria-label="Answer options">${q.options.map((o, i) => `<button class="opt" data-act="answer" data-i="${i}"><span class="key" aria-hidden="true">${q.tf ? (i === 0 ? 'T' : 'F') : LETTERS[i]}</span><span class="otext">${UI.rich(o.label)}</span></button>`).join('')}</div>`;
    }
    const pre = q.unit === '$' || q.unit === '$m' ? '$' : '';
    const post = { '%': '%', yrs: 'years', days: 'days', units: 'units', x: '×', '$m': 'million' }[q.unit] || '';
    const dpTxt = q.dp === 0 ? 'Round to a whole number.' : `Round to ${q.dp} decimal place${q.dp === 1 ? '' : 's'}.`;
    const hint = q.unit === '%' ? ` Type it as a percentage, e.g. 12.68.` : '';
    return `<form class="numform" data-submit="submit-num" autocomplete="off">
      <label for="ans" class="sr-only">Your answer</label>
      <div class="numrow">${pre ? `<span class="affix">${pre}</span>` : ''}<input id="ans" name="ans" type="text" inputmode="decimal" spellcheck="false" placeholder="Your answer" aria-describedby="ans-help">${post ? `<span class="affix">${post}</span>` : ''}<button type="submit" class="btn primary">Check</button></div>
      <p class="help" id="ans-help">${dpTxt}${hint} Negative? Put a minus sign in front.</p>
      <button type="button" class="linkbtn" data-act="to-choice">Stuck? Show 4 options instead (half damage)</button>
    </form>`;
  }

  /** Mark options after answering. */
  function markOptions(cardEl, q, chosen) {
    cardEl.querySelectorAll('.opt').forEach((b, i) => {
      b.disabled = true;
      if (q.options[i].correct) b.classList.add('right');
      else if (i === chosen) b.classList.add('wrong');
      else b.classList.add('dim');
    });
    const f = cardEl.querySelector('.numform');
    if (f) f.querySelectorAll('input, button').forEach((x) => { x.disabled = true; });
  }

  function steps(q) {
    const list = (q.steps || []).map((s) => `<li>${UI.rich(s)}</li>`).join('');
    if (!list && !q.calc) return '';
    return `<ol class="steps">${list}</ol>${calcKeys(q.calc)}`;
  }

  /** Feedback panel. res: {ok, note, yourText}; extra: {gain, lead, next} */
  function feedback(q, res, extra) {
    extra = extra || {};
    const right = GAME.QS ? GAME.QS.correctText(q) : root.QS.correctText(q);
    const head = res.ok ? `<h3 class="fb-h good">✅ ${esc(extra.lead || 'Correct!')}</h3>` : `<h3 class="fb-h bad">❌ ${esc(extra.lead || 'Not quite.')}</h3>`;
    const note = res.note ? `<p class="fb-note">${res.ok ? '💡' : '🔎'} ${UI.rich(res.note)}</p>` : '';
    const ans = res.ok ? '' : `<p class="fb-ans">Correct answer: <b>${UI.rich(right)}</b>${res.yourText ? ` <span class="muted">· You said: ${UI.rich(res.yourText)}</span>` : ''}</p>`;
    const why = q.why ? `<div class="fb-why">${UI.rich(q.why)}</div>` : '';
    const st = steps(q);
    const stepsBlock = st ? `<details class="fb-steps"${res.ok ? '' : ' open'}><summary>Worked solution</summary>${st}</details>` : '';
    const f = q.formula && FORMULAS.byId[q.formula] ? `<button class="chip-btn" data-act="show-formula" data-f="${esc(q.formula)}">📘 ${esc(FORMULAS.byId[q.formula].name)}</button>` : '';
    return `${head}${extra.gain ? `<p class="fb-gain">${extra.gain}</p>` : ''}${note}${ans}${why}${stepsBlock}
      <div class="fb-actions">${extra.next === false ? '' : `<button class="btn primary" data-act="${extra.nextAct || 'next'}" id="next-btn">${esc(extra.nextLabel || 'Next')} <span aria-hidden="true">▶</span></button>`}
      <button class="icon-btn" data-act="speak-fb" aria-label="Read the explanation aloud">🔊</button>${f}</div>`;
  }

  function speechFor(q) {
    let t = UI.say(q.q);
    if (q.givens && q.givens.length) t += '. Given: ' + q.givens.map(([k, v]) => RENDER.texToSpeech(k + ' = ' + v)).join('; ');
    if (q.mode === 'choice') t += '. ' + q.options.map((o, i) => (q.tf ? '' : 'Option ' + LETTERS[i] + ': ') + UI.say(o.label)).join('. ');
    return t;
  }
  function speechForFeedback(q, res) {
    const right = root.QS.correctText(q);
    let t = res.ok ? 'Correct. ' : 'Not quite. The correct answer is ' + UI.say(right) + '. ';
    if (res.note) t += UI.say(res.note) + ' ';
    if (q.why) t += UI.say(q.why) + ' ';
    if (q.steps) t += 'Working: ' + q.steps.map((s) => UI.say(s)).join('. ');
    return t;
  }

  root.QVIEW = { card, answers, feedback, markOptions, formulaCard, pips, calcKeys, speechFor, speechForFeedback, LETTERS, QCORE };
})(typeof window !== 'undefined' ? window : globalThis);
