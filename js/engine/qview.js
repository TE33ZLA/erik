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
      ${f.vars ? `<p class="fc-vars">${UI.rich(f.vars)}</p>` : ''}${!compact && f.when ? `<p class="fc-when">${UI.rich(f.when)}</p>` : ''}
      ${!compact && f.sheet ? FORMULAS.sheetFor(id).map((x) => `<p class="fs-line"><span class="fs-lbl">Type it</span><code>${esc(x.line)}</code></p>`).join('') : ''}
      ${!compact && !f.sheet && f.derive ? `<p class="fs-from">${(f.from || []).length ? `Built from the sheet's <b>${f.from.map((k) => esc((FORMULAS.byId[k] || {}).name || k)).join('</b> and <b>')}</b>. ` : ''}${UI.rich(f.derive)}</p>` : ''}</div>`;
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

  /** Calculator method for the player's calculator: TI-Nspire CX CAS (default) or the course's HP10bII+. */
  function method(q) {
    const pref = GAME.store.state.settings.calc || 'ti';
    if (pref === 'hp') return q.calc ? calcKeys(q.calc) : '';
    return q.ti && q.ti.length ? root.TIVIEW.html(q.ti) : '';
  }
  function methodSpeech(q) {
    const pref = GAME.store.state.settings.calc || 'ti';
    if (pref === 'hp') return q.calc ? 'On the H P 10 B: ' + String(q.calc).replace(/[\[\]]/g, ' ') : '';
    return q.ti && q.ti.length ? root.TIVIEW.speech(q.ti) : '';
  }

  function steps(q) {
    const list = (q.steps || []).map((s) => `<li>${UI.rich(s)}</li>`).join('');
    return list ? `<ol class="steps">${list}</ol>` : '';
  }

  /** The formulas this answer uses, exactly as printed on the exam formula sheet (and any it builds on). */
  function sheetBox(q, opts) {
    opts = opts || {};
    const ids = FORMULAS.idsOf(q);
    if (!ids.length) return '';
    const { on, off } = FORMULAS.forQuestion(ids);
    if (!on.length && !off.length) return '';
    const n = on.length;
    const count = n === 1 ? '1 formula' : `${n} formulas`;
    const lead = n > 1 ? `<p class="fs-lead">This answer uses <b>${n} formulas</b> from the sheet, in this order.</p>` : '';
    const onHtml = on.map((s) => `<li class="fs-item"><span class="fs-sec">${esc(s.section)}</span>
        <div class="fs-tex">${UI.rich('\\[' + s.tex + '\\]')}</div>
        <p class="fs-line"><span class="fs-lbl">Type it</span><code>${esc(s.line)}</code></p></li>`).join('');
    const offHtml = off.map((c) => {
      const from = (c.from || []).map((id) => FORMULAS.byId[id]).filter(Boolean);
      return `<li class="fs-item off"><b class="fs-name">${esc(c.name)}</b>
        <div class="fs-tex">${UI.rich('\\[' + c.tex + '\\]')}</div>
        <p class="fs-from">${from.length ? `Built from the sheet's <b>${from.map((f) => esc(f.name)).join('</b> and <b>')}</b>. ` : ''}${UI.rich(c.derive || '')}</p></li>`;
    }).join('');
    const body = `${n ? `${lead}<ol class="fs-list">${onHtml}</ol>` : '<p class="fs-lead">None of the formulas printed on the sheet is used directly.</p>'}
      ${off.length ? `<p class="fs-h2">🧠 Not on the sheet: know how to build ${off.length === 1 ? 'it' : 'them'}</p><ol class="fs-list">${offHtml}</ol>` : ''}`;
    if (opts.bare) return `<section class="fsbox">${body}</section>`;
    return `<details class="fb-steps fsbox"${opts.closed ? '' : ' open'}><summary>📄 From the formula sheet${n ? ` <span class="fs-n">${count}</span>` : ''}</summary>${body}</details>`;
  }
  function sheetSpeech(q) {
    const { on, off } = FORMULAS.forQuestion(FORMULAS.idsOf(q));
    if (!on.length && !off.length) return '';
    let t = on.length ? `From the formula sheet, ${on.length === 1 ? 'one formula' : on.length + ' formulas'}: ` + on.map((s) => RENDER.texToSpeech(s.tex)).join('. Then: ') + '.' : '';
    if (off.length) t += ' Not on the sheet: ' + off.map((c) => c.name).join(', ') + '.';
    return t;
  }

  /** The Excel version of the working: written by hand (q.xl) or built from the TI-Nspire method. */
  function excelSpec(q) {
    if (q.xl) return q.xl;
    if (!root.XL || !q.ti || !q.ti.length) return null;
    if (q._xl === undefined) q._xl = root.XL.methodFor(q.ti) || null;
    return q._xl;
  }
  function excelBlock(q, open) {
    if (GAME.store.state.settings.excel === false) return '';
    const spec = excelSpec(q);
    if (!spec) return '';
    return `<details class="fb-steps fb-xl"${open ? ' open' : ''}><summary>📗 In Excel</summary>${root.XLVIEW.html(spec, { title: spec.title || (spec.auto ? 'The same working in a spreadsheet' : '') })}</details>`;
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
    const m = method(q);
    const calcLbl = (GAME.store.state.settings.calc || 'ti') === 'hp' ? 'On the HP10bII+' : 'On your TI-Nspire';
    const methodBlock = m ? `<details class="fb-steps fb-ti"${res.ok ? '' : ' open'}><summary>🧮 ${calcLbl}</summary>${m}</details>` : '';
    const fs = sheetBox(q);
    const xl = excelBlock(q, false);
    const f = '';
    const les = lessonFor(q);
    const lb = les && !extra.noLesson ? `<button class="chip-btn" data-act="lesson-peek" data-pack="${esc(q.pack)}" data-lesson="${esc(les.id)}">📖 Review: ${esc(les.title)}</button>` : '';
    return `${head}${extra.gain ? `<p class="fb-gain">${extra.gain}</p>` : ''}${note}${ans}${why}${fs}${stepsBlock}${methodBlock}${xl}
      <div class="fb-actions">${extra.next === false ? '' : `<button class="btn primary" data-act="${extra.nextAct || 'next'}" id="next-btn">${esc(extra.nextLabel || 'Next')} <span aria-hidden="true">▶</span></button>`}
      <button class="icon-btn" data-act="speak-fb" aria-label="Read the explanation aloud">🔊</button>${f}${res.ok ? '' : lb}</div>`;
  }

  /** The lesson on the question's floor that teaches its topic (the first one on the route). */
  function lessonFor(q) {
    const pack = q && GAME.packById(q.pack);
    if (!pack || !pack.lessons) return null;
    const node = pack.nodes.find((n) => n.kind === 'lesson' && pack.lessons[n.lesson] && (pack.lessons[n.lesson].topics || []).includes(q.topic));
    return node ? Object.assign({ id: node.lesson, node: node.id }, pack.lessons[node.lesson]) : null;
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
    const fsp = sheetSpeech(q);
    if (fsp) t += fsp + ' ';
    if (q.steps) t += 'Working: ' + q.steps.map((s) => UI.say(s)).join('. ');
    const m = methodSpeech(q);
    if (m) t += '. ' + m;
    return t;
  }

  /* Excel sheet: tap a cell to see what is typed in it; show every formula; a step lights up its cells. */
  function xlCells(box, refs) {
    box.querySelectorAll('td.sel').forEach((td) => td.classList.remove('sel'));
    String(refs || '').split(/\s+/).filter(Boolean).forEach((ref) => {
      root.XL.rangeCells(ref).flat().forEach((a) => { const td = box.querySelector(`td[data-a="${a}"]`); if (td) td.classList.add('sel'); });
    });
  }
  Object.assign(GAME.actions, {
    'xl-cell': (el) => {
      const box = el.closest('.xl');
      if (!box) return;
      xlCells(box, el.dataset.a);
      const a = box.querySelector('.xl-addr'), fx = box.querySelector('.xl-fx');
      if (a) a.textContent = el.dataset.a;
      if (fx) fx.textContent = el.dataset.f || '';
    },
    'xl-formulas': (el) => {
      const box = el.closest('.xl');
      if (!box) return;
      const on = !box.classList.contains('show-f');
      box.classList.toggle('show-f', on);
      el.setAttribute('aria-pressed', String(on));
      el.textContent = on ? 'Show values' : 'Show formulas';
    },
    'xl-step': (el) => { const box = el.closest('.xl'); if (box) xlCells(box, el.dataset.cells); },
  });

  root.QVIEW = { card, answers, feedback, markOptions, formulaCard, pips, calcKeys, method, methodSpeech, lessonFor, speechFor, speechForFeedback, sheetBox, sheetSpeech, excelSpec, excelBlock, LETTERS, QCORE };
})(typeof window !== 'undefined' ? window : globalThis);
