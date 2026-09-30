/* Corporate Ladder — written answers ("cases"): a short scenario with parts a, b, c … answered the way an
 * exam's written section is marked. Part kinds:
 *   calc    pick the sheet formula(s) → type the working in one line (checked by working it out) → model answer
 *   theory  pick the points that earn marks → write it → compare with a model answer
 *   blanks  choose the right word for each gap
 *   excel   build a table in Excel (a checklist), type the key number → the model sheet
 * The part renderer is shared with lessons ({ kind: 'written', part }) and the Boardroom's written section.
 * See docs/CONTENT_GUIDE.md ("Written answers").
 */
(function (root) {
  'use strict';
  const { GAME, UI, RENDER, FORMULAS, QVIEW, SFX, CHARTS, LINEAR } = root;
  const esc = RENDER.esc;
  const S = () => GAME.store.state;
  const LABELS = 'abcdefgh';
  let C = null; // the running case(s)

  /* ================= helpers ================= */
  function marksOf(part) { return part.marks || (part.kind === 'blanks' ? 1 : 2); }
  function caseMarks(cs) { return cs.parts.reduce((s, p) => s + marksOf(p), 0); }
  const half = (x) => Math.round(x * 2) / 2;
  function paras(text) { return text ? String(text).split(/\n\s*\n|\\n\\n/).map((p) => `<p>${UI.rich(p.trim())}</p>`).join('') : ''; }
  function hashStr(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function shuffled(list, seed) {
    const a = list.slice();
    let x = seed || 1;
    for (let i = a.length - 1; i > 0; i--) { x = (x * 1103515245 + 12345) & 0x7fffffff; const j = x % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function moneyTxt(v, unit, dp) {
    const d = dp == null ? 2 : dp;
    const n = Math.abs(v).toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const sign = v < 0 ? '-' : '';
    if (unit === '$') return `${sign}$${n}`;
    if (unit === '$m') return `${sign}$${n} million`;
    if (unit === '%') return `${sign}${Math.abs(v).toFixed(d)}%`;
    if (unit === 'days' || unit === 'yrs' || unit === 'units') return `${sign}${n} ${unit === 'yrs' ? 'years' : unit}`;
    return `${sign}${n}`;
  }
  /** Formula options for a calc part: the right ones plus look-alikes from the same group. */
  function pickOptions(part, key) {
    const right = (part.formulas || []).filter((id) => FORMULAS.byId[id] || FORMULAS.sheetById[id]);
    if (!right.length) return null;
    let opts = part.pick ? part.pick.slice() : null;
    if (!opts) {
      const groups = new Set(right.map((id) => (FORMULAS.byId[id] || FORMULAS.byId[FORMULAS.sheetById[id].card]).group));
      const pool = FORMULAS.CARDS.filter((c) => c.sheet && groups.has(c.group) && !right.includes(c.id)).map((c) => c.id);
      const extra = shuffled(pool, hashStr(key)).slice(0, Math.max(2, 5 - right.length));
      opts = right.concat(extra);
    }
    return shuffled(opts, hashStr(key + ':o'));
  }
  function optionTex(id) {
    const s = FORMULAS.sheetById[id] || FORMULAS.sheetFor(id)[0];
    if (s) return { tex: s.tex, sub: s.section };
    const c = FORMULAS.byId[id];
    return c ? { tex: c.tex, sub: 'Not on the sheet' } : { tex: id, sub: '' };
  }

  /* ================= parts ================= */
  /** HTML of one part. ctx: {label, key, idx} — key names the part for state and events. */
  function partHTML(part, st, ctx) {
    const m = marksOf(part);
    const head = `<header class="wp-head"><span class="wp-label">${ctx.label ? `(${ctx.label})` : ''}</span><div class="wp-ask">${UI.rich(part.ask)}</div><span class="wp-marks">${m} mark${m === 1 ? '' : 's'}</span></header>`;
    let body = '';
    if (part.kind === 'calc') body = calcHTML(part, st, ctx);
    else if (part.kind === 'theory') body = theoryHTML(part, st, ctx);
    else if (part.kind === 'blanks') body = blanksHTML(part, st, ctx);
    else if (part.kind === 'excel') body = excelHTML(part, st, ctx);
    return `<section class="wpart kind-${part.kind}" data-wkey="${esc(ctx.key)}">${head}${part.visual ? CHARTS.visuals(part.visual, {}) : ''}${body}</section>`;
  }

  /* ---- calc ---- */
  function calcHTML(part, st, ctx) {
    const opts = pickOptions(part, ctx.key);
    if (st.stage === undefined) st.stage = opts ? 0 : 1;
    let h = '';
    if (opts) {
      st.pick = st.pick || [];
      const right = new Set(part.formulas);
      const done = st.stage > 0;
      h += `<div class="wstep"><p class="wstep-h"><span class="wn">1</span> Which formula${part.formulas.length > 1 ? 's' : ''} from the formula sheet do you need?${part.formulas.length > 1 ? ` <b>Pick ${part.formulas.length}.</b>` : ''}</p>
        <div class="wpick" role="group" aria-label="Formula options">${opts.map((id) => {
          const o = optionTex(id), on = st.pick.includes(id);
          const cls = done ? (right.has(id) ? 'right' : on ? 'wrong' : 'dim') : on ? 'on' : '';
          return `<button type="button" class="wopt ${cls}" data-act="w-pick" data-w="${esc(ctx.key)}" data-id="${esc(id)}" aria-pressed="${on}" ${done ? 'disabled' : ''}><span class="wopt-sub">${esc(o.sub)}</span>${UI.rich('\\(' + o.tex + '\\)')}</button>`;
        }).join('')}</div>
        ${done ? `<p class="wfb ${st.pickOk ? 'good' : 'bad'}">${st.pickOk ? '✅ Right formula' + (part.formulas.length > 1 ? 's.' : '.') : `🔎 This part needs: ${part.formulas.map((id) => `<b>${esc((FORMULAS.byId[id] || {}).name || id)}</b>`).join(' and ')}.`}</p>`
          : `<div class="fb-actions"><button class="btn primary" data-act="w-pick-check" data-w="${esc(ctx.key)}" ${st.pick.length ? '' : 'disabled'}>Check</button><button class="linkbtn" data-act="w-pick-skip" data-w="${esc(ctx.key)}">Skip this step</button></div>`}</div>`;
    }
    if (st.stage >= 1) {
      const n = opts ? 2 : 1;
      const res = st.res;
      const tip = `Type it like the exam's text box: <code>*</code> times, <code>/</code> divide, <code>^</code> power, brackets. Start with the formula in letters, then the numbers, then the answer to ${part.dp === 0 ? 'a whole number' : `${part.dp == null ? 2 : part.dp} decimal places`}.`;
      h += `<div class="wstep"><p class="wstep-h"><span class="wn">${n}</span> Write your working</p>
        <p class="wtip">${tip}</p>
        <label class="sr-only" for="wt-${esc(ctx.key)}">Your working</label>
        <textarea id="wt-${esc(ctx.key)}" class="wtext mono" data-live="lin" data-w="${esc(ctx.key)}" rows="4" spellcheck="false" autocomplete="off" placeholder="${esc(part.placeholder || 'e.g.  PV = C/r*(1 - 1/(1 + r)^n)\n= 500/0.08*(1 - 1/1.08^10)\n= 3355.04')}" ${st.stage >= 2 ? 'readonly' : ''}>${esc(st.text || '')}</textarea>
        <div class="wprev" aria-live="polite" data-prev="${esc(ctx.key)}">${previewHTML(st.text || '')}</div>
        ${st.stage === 1 ? `<div class="fb-actions"><button class="btn primary" data-act="w-calc-check" data-w="${esc(ctx.key)}">Check my working</button>${part.hint ? `<button class="linkbtn" data-act="w-hint" data-w="${esc(ctx.key)}">Hint</button>` : ''}<button class="linkbtn" data-act="w-calc-show" data-w="${esc(ctx.key)}">Show the model answer</button></div>${st.hint ? `<p class="wtip">💡 ${UI.rich(part.hint)}</p>` : ''}` : ''}
        ${res ? calcFeedback(part, res, st) : ''}</div>`;
    }
    if (st.stage >= 2) h += modelCalc(part);
    return h;
  }
  function previewHTML(text) {
    const lines = String(text || '').split(/\n+/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return '<span class="muted small">Your maths appears here as it will read.</span>';
    return lines.map((l) => {
      try {
        const lead = /^\s*=/.test(l) ? '= ' : '';
        return `<div class="wprev-l">${UI.rich('\\(\\displaystyle ' + lead + LINEAR.lineTex(l) + '\\)')}</div>`;
      } catch (e) { return `<div class="wprev-l">${esc(l)}</div>`; }
    }).join('');
  }
  function calcFeedback(part, res, st) {
    const dp = part.dp == null ? 2 : part.dp;
    const ans = moneyTxt(part.answer, part.unit, dp);
    const row = (ok, good, bad) => `<li class="${ok ? 'good' : 'bad'}">${ok ? '✅' : '✗'} ${ok ? good : bad}</li>`;
    const f = res.final;
    const items = [
      row(res.formula, 'You wrote the formula in letters first.', 'Start with the formula in letters (from the sheet), then put the numbers in.'),
      row(res.subst, 'You showed the numbers going into the formula.', 'Show the numbers going into the formula, e.g. <code>= 500/0.08*(1 - 1/1.08^10)</code>.'),
      row(res.hit, 'Your working reaches the right value.', res.hitValue != null ? `Your working gives <b>${esc(String(+res.hitValue.toFixed(6)))}</b>. Check each number, then the brackets and powers.` : 'Put the numbers in and work it through.'),
      row(f && f.ok, `Final answer ${esc(f ? f.raw : '')}.`, f ? `Your last number is <b>${esc(f.raw)}</b>. The answer is <b>${esc(ans)}</b>.` : `End with the answer, e.g. <b>${esc(ans)}</b>.`),
    ];
    if (f && f.ok && !f.dpOk && dp > 0) items.push(`<li class="warn">⚠️ Write exactly ${dp} decimal places: <b>${esc(ans)}</b>. Round only at the end.</li>`);
    if (f && f.ok && part.unit === '%' && !f.unitOk) items.push('<li class="warn">⚠️ Put a % sign on a percentage answer (or say "per cent").</li>');
    (res.problems || []).slice(0, 2).forEach((p) => items.push(`<li class="bad">✗ ${esc(p)}</li>`));
    return `<div class="wfb-box"><p class="wscore">Marks: <b>${st.marks} / ${marksOf(part)}</b></p><ul class="wchecks">${items.join('')}</ul></div>`;
  }
  function modelCalc(part) {
    const lines = [].concat(part.model || []);
    const typed = lines.join('\n');
    return `<div class="wstep wmodel"><p class="wstep-h">📝 A full-marks answer</p>
      <pre class="wtyped mono">${esc(typed)}</pre>
      <div class="wprev">${previewHTML(typed)}</div>
      ${part.meaning ? `<p class="wmeaning">${UI.rich(part.meaning)}</p>` : ''}
      ${QVIEW.sheetBox({ formulas: part.formulas }, { closed: true })}
      ${part.xl ? `<details class="fb-steps fb-xl"><summary>📗 In Excel</summary>${root.XLVIEW.html(part.xl)}</details>` : ''}</div>`;
  }

  /* ---- theory ---- */
  function theoryHTML(part, st, ctx) {
    if (st.stage === undefined) st.stage = part.points && part.points.length ? 0 : 1;
    const order = st.order || (st.order = shuffled(part.points ? part.points.map((_, i) => i) : [], hashStr(ctx.key)));
    let h = '';
    if (part.points && part.points.length) {
      st.chosen = st.chosen || [];
      const done = st.stage > 0;
      const need = part.points.filter((p) => p.ok).length;
      h += `<div class="wstep"><p class="wstep-h"><span class="wn">1</span> Which points would earn marks? <b>Pick ${need}.</b></p>
        <div class="wpoints" role="group" aria-label="Points">${order.map((i) => {
          const p = part.points[i], on = st.chosen.includes(i);
          const cls = done ? (p.ok ? 'right' : on ? 'wrong' : 'dim') : on ? 'on' : '';
          return `<button type="button" class="wpt ${cls}" data-act="w-point" data-w="${esc(ctx.key)}" data-i="${i}" aria-pressed="${on}" ${done ? 'disabled' : ''}>${UI.rich(p.t)}${done && !p.ok && on && p.why ? `<span class="wpt-why">${UI.rich(p.why)}</span>` : ''}</button>`;
        }).join('')}</div>
        ${done ? '' : `<div class="fb-actions"><button class="btn primary" data-act="w-points-check" data-w="${esc(ctx.key)}" ${st.chosen.length ? '' : 'disabled'}>Check</button></div>`}</div>`;
    }
    if (st.stage >= 1) {
      const n = part.points && part.points.length ? 2 : 1;
      const keys = part.keys || [];
      h += `<div class="wstep"><p class="wstep-h"><span class="wn">${n}</span> Now write it (2 to 4 short sentences)</p>
        <p class="wtip">Say the point, then <b>because</b> …, then what it means <b>here</b>. Use the course words.</p>
        <label class="sr-only" for="wt-${esc(ctx.key)}">Your answer</label>
        <textarea id="wt-${esc(ctx.key)}" class="wtext" data-live="words" data-w="${esc(ctx.key)}" rows="4" placeholder="${esc(part.placeholder || 'The … because … So …')}" ${st.stage >= 2 ? 'readonly' : ''}>${esc(st.text || '')}</textarea>
        ${keys.length ? `<div class="wkeys" data-keys="${esc(ctx.key)}">${keyChips(part, st.text || '')}</div>` : ''}
        ${st.stage === 1 ? `<div class="fb-actions"><button class="btn primary" data-act="w-theory-done" data-w="${esc(ctx.key)}">Compare with the model answer</button></div>` : ''}</div>`;
    }
    if (st.stage >= 2) {
      h += `<div class="wstep wmodel"><p class="wstep-h">📝 A full-marks answer</p><div class="wmodel-t">${paras(part.model)}</div>
        <p class="wstep-h">Tick what your answer did</p>
        <div class="wrubric">${['Made the point the question asks for', 'Gave the reason (because …)', 'Linked it to this question (its numbers or its firm)', 'Finished with a clear conclusion or decision'].map((t, i) => `<label class="check"><input type="checkbox" data-act="w-rubric" data-w="${esc(ctx.key)}" data-i="${i}" ${(st.rubric || []).includes(i) ? 'checked' : ''}><span>${esc(t)}</span></label>`).join('')}</div>
        <p class="wscore">Marks for the points you picked: <b>${st.marks} / ${marksOf(part)}</b></p></div>`;
    }
    return h;
  }
  function keyChips(part, text) {
    const t = String(text || '').toLowerCase();
    return (part.keys || []).map((group) => {
      const g = [].concat(group);
      const hit = g.some((w) => t.includes(String(w).toLowerCase()));
      return `<span class="wkey ${hit ? 'on' : ''}">${hit ? '✅' : '○'} ${esc(g[0])}</span>`;
    }).join('');
  }

  /* ---- blanks: text with {{right|wrong|wrong}} gaps ---- */
  function blanksHTML(part, st, ctx) {
    const gaps = [];
    const html = UI.rich(part.text).replace(/\{\{([^{}]*\|[^{}]*)\}\}/g, (m, body) => {
      const opts = body.split('|');
      const i = gaps.length;
      gaps.push(opts);
      const order = shuffled(opts.map((_, k) => k), hashStr(ctx.key + i));
      const pick = st.choice ? st.choice[i] : '';
      const cls = st.checked ? (pick === 0 ? 'right' : 'wrong') : '';
      return `<select class="wgap ${cls}" data-w="${esc(ctx.key)}" data-i="${i}" aria-label="Gap ${i + 1}" ${st.checked ? 'disabled' : ''}><option value="">choose …</option>${order.map((k) => `<option value="${k}" ${pick === k ? 'selected' : ''}>${esc(opts[k])}</option>`).join('')}</select>${st.checked && pick !== 0 ? ` <span class="wgap-fix">(${esc(opts[0])})</span>` : ''}`;
    });
    st.n = gaps.length;
    return `<div class="wstep"><div class="wblanks">${html}</div>
      ${st.checked ? `<p class="wscore">Marks: <b>${st.marks} / ${marksOf(part)}</b></p>${part.why ? `<p class="wmeaning">${UI.rich(part.why)}</p>` : ''}` : `<div class="fb-actions"><button class="btn primary" data-act="w-blanks-check" data-w="${esc(ctx.key)}">Check</button></div>`}</div>`;
  }

  /* ---- excel: build it in Excel, type the key number, see the model sheet ---- */
  function excelHTML(part, st, ctx) {
    st.ticks = st.ticks || [];
    const build = part.build || [];
    const dp = part.dp == null ? 2 : part.dp;
    return `<div class="wstep"><p class="wstep-h"><span class="wn">1</span> Build it in Excel (open a blank workbook)</p>
        <ol class="wbuild">${build.map((b, i) => `<li><label class="check"><input type="checkbox" data-act="w-tick" data-w="${esc(ctx.key)}" data-i="${i}" ${st.ticks.includes(i) ? 'checked' : ''}><span>${UI.rich(b)}</span></label></li>`).join('')}</ol></div>
      <div class="wstep"><p class="wstep-h"><span class="wn">2</span> ${UI.rich(part.result || 'What number does your table give?')}</p>
        <form class="numform" data-submit="w-excel-check" data-w="${esc(ctx.key)}" autocomplete="off"><div class="numrow">
          <input type="text" name="v" inputmode="decimal" spellcheck="false" aria-label="Your number" placeholder="Your number" value="${esc(st.value || '')}" ${st.checked ? 'readonly' : ''}>
          ${st.checked ? '' : '<button type="submit" class="btn primary">Check</button>'}</div>
          <p class="help">Round to ${dp} decimal places. ${part.unit === '%' ? 'Type a percentage as a number, e.g. 12.35.' : ''}</p></form>
        ${st.checked ? `<p class="wfb ${st.ok ? 'good' : 'bad'}">${st.ok ? '✅ Your table gives the right answer.' : `🔎 The model table gives <b>${esc(moneyTxt(part.answer, part.unit, dp))}</b>. Compare your sheet with the one below, row by row.`}</p><p class="wscore">Marks: <b>${st.marks} / ${marksOf(part)}</b></p>` : `<button class="linkbtn" data-act="w-excel-show" data-w="${esc(ctx.key)}">Show the model sheet</button>`}</div>
      ${st.checked || st.shown ? `<div class="wstep wmodel"><p class="wstep-h">📗 A full-marks sheet</p>${root.XLVIEW.html(part.xl)}${part.meaning ? `<p class="wmeaning">${UI.rich(part.meaning)}</p>` : ''}</div>` : ''}`;
  }

  /* ================= marking actions (shared) ================= */
  const HOST = {}; // key -> { part, st, rerender() }
  function reg(key, part, st, rerender) { HOST[key] = { part, st, rerender }; }
  function h(el) { return HOST[el.dataset.w]; }
  function rer(x) { x.rerender(); }
  function scoreCalc(part, res) {
    const m = marksOf(part);
    if (m <= 1) return res.final && res.final.ok ? 1 : 0;
    const method = (m - 1) * ((res.formula ? 1 : 0) + (res.subst ? 1 : 0) + (res.hit ? 1 : 0)) / 3;
    return half(method + (res.final && res.final.ok ? 1 : 0));
  }
  function parseNum(v) {
    const s = String(v || '').replace(/[,$\s%]/g, '').replace(/[−–]/g, '-');
    if (!s || isNaN(+s)) return null;
    return +s;
  }
  Object.assign(GAME.actions, {
    'w-pick': (el) => {
      const x = h(el); if (!x) return;
      const id = el.dataset.id, st = x.st;
      st.pick = st.pick || [];
      st.pick = st.pick.includes(id) ? st.pick.filter((y) => y !== id) : st.pick.concat(id);
      toggleOpt(el, st.pick.includes(id), st.pick.length, 'w-pick-check');
    },
    'w-pick-check': (el) => {
      const x = h(el); if (!x) return;
      const right = new Set(x.part.formulas), st = x.st;
      st.pickOk = st.pick.length === right.size && st.pick.every((id) => right.has(id));
      st.stage = 1;
      SFX.play(st.pickOk ? 'good' : 'bad'); rer(x);
    },
    'w-pick-skip': (el) => { const x = h(el); if (!x) return; x.st.pickOk = false; x.st.pick = []; x.st.stage = 1; rer(x); },
    'w-hint': (el) => { const x = h(el); if (!x) return; x.st.hint = true; rer(x); },
    'w-calc-check': (el) => {
      const x = h(el); if (!x) return;
      const ta = document.getElementById('wt-' + el.dataset.w);
      const st = x.st, part = x.part;
      st.text = ta ? ta.value : st.text;
      if (!String(st.text || '').trim()) { UI.toast('Type your working first.', 'warn'); return; }
      st.res = LINEAR.check(st.text, { answer: part.answer, unit: part.unit, dp: part.dp == null ? 2 : part.dp });
      st.marks = scoreCalc(part, st.res);
      st.stage = 2;
      SFX.play(st.marks >= marksOf(part) ? 'good' : st.marks > 0 ? 'click' : 'bad');
      rer(x);
      done(x);
    },
    'w-calc-show': (el) => {
      const x = h(el); if (!x) return;
      const ta = document.getElementById('wt-' + el.dataset.w);
      x.st.text = ta ? ta.value : x.st.text;
      x.st.marks = 0; x.st.stage = 2; x.st.gaveUp = true;
      rer(x); done(x);
    },
    'w-point': (el) => {
      const x = h(el); if (!x) return;
      const i = +el.dataset.i, st = x.st;
      st.chosen = st.chosen.includes(i) ? st.chosen.filter((y) => y !== i) : st.chosen.concat(i);
      toggleOpt(el, st.chosen.includes(i), st.chosen.length, 'w-points-check');
    },
    'w-points-check': (el) => {
      const x = h(el); if (!x) return;
      const st = x.st, pts = x.part.points;
      const need = pts.filter((p) => p.ok).length;
      const good = st.chosen.filter((i) => pts[i].ok).length, bad = st.chosen.length - good;
      st.marks = Math.max(0, half(marksOf(x.part) * (good - bad) / need));
      st.stage = 1;
      SFX.play(good === need && !bad ? 'good' : 'click');
      rer(x);
    },
    'w-theory-done': (el) => {
      const x = h(el); if (!x) return;
      const ta = document.getElementById('wt-' + el.dataset.w);
      x.st.text = ta ? ta.value : x.st.text;
      if (x.st.marks === undefined) x.st.marks = 0;
      x.st.stage = 2;
      rer(x); done(x);
    },
    'w-rubric': (el) => {
      const x = h(el); if (!x) return;
      const i = +el.dataset.i;
      x.st.rubric = x.st.rubric || [];
      x.st.rubric = el.checked ? x.st.rubric.concat(i) : x.st.rubric.filter((y) => y !== i);
    },
    'w-blanks-check': (el) => {
      const x = h(el); if (!x) return;
      const box = el.closest('.wpart');
      const sel = [...box.querySelectorAll('select.wgap')];
      if (sel.some((s) => s.value === '')) { UI.toast('Choose a word for every gap.', 'warn'); return; }
      x.st.choice = sel.map((s) => +s.value);
      const right = x.st.choice.filter((v) => v === 0).length;
      x.st.marks = half(marksOf(x.part) * right / sel.length);
      x.st.checked = true;
      SFX.play(right === sel.length ? 'good' : 'bad');
      rer(x); done(x);
    },
    'w-tick': (el) => {
      const x = h(el); if (!x) return;
      const i = +el.dataset.i;
      x.st.ticks = el.checked ? (x.st.ticks || []).concat(i) : (x.st.ticks || []).filter((y) => y !== i);
    },
    'w-excel-check': (form) => {
      const x = HOST[form.dataset.w]; if (!x) return;
      const v = parseNum(form.querySelector('input').value);
      if (v === null) { UI.toast('Type a number.', 'warn'); return; }
      const part = x.part, dp = part.dp == null ? 2 : part.dp;
      x.st.value = form.querySelector('input').value;
      x.st.ok = LINEAR.near(v, part.answer, part.unit, dp);
      x.st.marks = x.st.ok ? marksOf(part) : half(marksOf(part) * Math.min(1, (x.st.ticks || []).length / Math.max(1, (part.build || []).length)) * 0.5);
      x.st.checked = true;
      SFX.play(x.st.ok ? 'good' : 'bad');
      rer(x); done(x);
    },
    'w-excel-show': (el) => { const x = h(el); if (!x) return; x.st.shown = true; rer(x); },
  });
  // live preview of typed maths, and key-word chips for written answers
  if (typeof document !== 'undefined') {
    document.addEventListener('input', (ev) => {
      const ta = ev.target;
      if (!ta || !ta.dataset || !ta.dataset.live) return;
      const x = HOST[ta.dataset.w];
      if (x) x.st.text = ta.value;
      if (ta.dataset.live === 'lin') {
        const box = ta.parentElement.querySelector(`[data-prev="${CSS.escape(ta.dataset.w)}"]`);
        if (box) { clearTimeout(ta._t); ta._t = setTimeout(() => { box.innerHTML = previewHTML(ta.value); }, 180); }
      } else if (ta.dataset.live === 'words' && x) {
        const box = ta.parentElement.querySelector(`[data-keys="${CSS.escape(ta.dataset.w)}"]`);
        if (box) box.innerHTML = keyChips(x.part, ta.value);
      }
    });
  }
  /** Toggle an option in place (keeps keyboard focus), and enable its Check button once something is chosen. */
  function toggleOpt(el, on, count, checkAct) {
    el.classList.toggle('on', on);
    el.setAttribute('aria-pressed', String(on));
    const btn = el.closest('.wstep') && el.closest('.wstep').querySelector(`[data-act="${checkAct}"]`);
    if (btn) btn.disabled = !count;
    SFX.play('click');
  }
  function done(x) { if (x.onDone) x.onDone(); if (C && C.onPart) C.onPart(); }

  /* ================= the case screen ================= */
  function findCase(pack, id) { return pack && pack.cases && pack.cases[id]; }
  /** p: { nodeId } for a floor node, or { queue: [{pack, id}], exam: true } for the Boardroom's written section. */
  GAME.screens.case = (p) => {
    let queue;
    if (p.nodeId) {
      const f = GAME.nodeById(p.nodeId);
      queue = [{ pack: f.pack, id: f.node.case, node: f.node }];
    } else queue = p.queue || [];
    queue = queue.filter((q) => findCase(q.pack, q.id));
    if (!queue.length) return '<section class="page"><p>No written questions found.</p></section>';
    C = { queue, qi: 0, exam: !!p.exam, deadline: p.minutes ? Date.now() + p.minutes * 60000 : 0, results: [], tick: null };
    GAME.keyHandler = null;
    GAME.cleanup = () => { if (C && C.tick) clearInterval(C.tick); C = null; Object.keys(HOST).forEach((k) => delete HOST[k]); };
    GAME.after = () => { startCase(0); if (C.deadline) { C.tick = setInterval(clock, 1000); clock(); } };
    const first = queue[0];
    return `<section class="case-screen" style="--floor:${first.pack.color}">
      <div class="lesson-head"><button class="linkbtn" data-act="case-quit">← ${C.exam ? 'The Boardroom' : GAME.floorName(first.pack)}</button>
        <div class="lesson-title"><p class="eyebrow" id="case-eyebrow">Written answer</p><h1 id="case-title"></h1></div>${C.deadline ? '<span id="case-clock" class="exam-clock"></span>' : ''}</div>
      <div id="case-body"></div>
    </section>`;
  };
  function clock() {
    if (!C || !C.deadline) return;
    const left = Math.max(0, C.deadline - Date.now());
    const el = document.getElementById('case-clock');
    if (el) { const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000); el.textContent = `⏱ ${m}:${String(s).padStart(2, '0')}`; el.classList.toggle('low', left < 5 * 60000); }
    if (!left) { clearInterval(C.tick); C.tick = null; UI.toast('Time is up. Finish the part you are on, then look at the model answers.', 'warn'); }
  }
  function startCase(qi) {
    const item = C.queue[qi];
    const cs = findCase(item.pack, item.id);
    C.qi = qi;
    C.cs = cs; C.item = item;
    C.i = 0;
    C.st = cs.parts.map(() => ({}));
    document.getElementById('case-title').textContent = cs.title;
    document.getElementById('case-eyebrow').textContent = C.exam ? `Written section · question ${qi + 1} of ${C.queue.length}` : `Written answer · ${item.pack.week}`;
    renderCase();
  }
  function renderCase() {
    const cs = C.cs, total = caseMarks(cs);
    const tabs = cs.parts.map((pt, k) => {
      const st = C.st[k];
      const fin = partDone(pt, st);
      return `<button class="wtab${k === C.i ? ' on' : ''}${fin ? ' done' : ''}" data-act="case-part" data-i="${k}" aria-current="${k === C.i}">(${LABELS[k]})${fin ? ' ✓' : ''}</button>`;
    }).join('');
    const last = C.i === cs.parts.length - 1;
    const st = C.st[C.i];
    const key = `c${C.qi}-${C.i}`;
    reg(key, cs.parts[C.i], st, () => { const el = document.getElementById('case-part'); if (el) { el.innerHTML = partHTML(cs.parts[C.i], st, { label: LABELS[C.i], key }); } navBar(); tabsBar(); });
    document.getElementById('case-body').innerHTML = `
      <article class="card case-story"><div class="card-h"><p class="case-meta">✍️ Written answer · ${cs.parts.length} parts · ${total} marks</p><button class="icon-btn" data-act="case-speak" aria-label="Read the question aloud">🔊</button></div>
        <div class="case-text">${paras(cs.story)}</div>${CHARTS.visuals(cs, { highlight: S().settings.hl })}
        <p class="case-tip">Answer each part in its own box, the way you would label it in an exam: <b>a.</b>, <b>b.</b>, <b>c.</b> Show the formula, the numbers, then the answer.</p></article>
      <nav class="wtabs" id="case-tabs" aria-label="Parts">${tabs}</nav>
      <div id="case-part">${partHTML(cs.parts[C.i], st, { label: LABELS[C.i], key })}</div>
      <nav class="lesson-nav" id="case-nav"></nav>`;
    navBar();
    void last;
  }
  function tabsBar() {
    const el = document.getElementById('case-tabs');
    if (!el || !C) return;
    el.innerHTML = C.cs.parts.map((pt, k) => { const fin = partDone(pt, C.st[k]); return `<button class="wtab${k === C.i ? ' on' : ''}${fin ? ' done' : ''}" data-act="case-part" data-i="${k}" aria-current="${k === C.i}">(${LABELS[k]})${fin ? ' ✓' : ''}</button>`; }).join('');
  }
  function partDone(pt, st) {
    if (!st) return false;
    if (pt.kind === 'calc' || pt.kind === 'theory') return st.stage >= 2;
    return !!st.checked;
  }
  function navBar() {
    const el = document.getElementById('case-nav');
    if (!el || !C) return;
    const last = C.i === C.cs.parts.length - 1;
    const fin = partDone(C.cs.parts[C.i], C.st[C.i]);
    el.innerHTML = `<button class="btn" data-act="case-prev" ${C.i === 0 ? 'disabled' : ''}>← Back</button>
      <button class="btn primary" data-act="case-next" ${fin ? '' : 'disabled'}>${last ? (C.qi < C.queue.length - 1 ? 'Next question' : 'See my marks') : `Next part (${LABELS[C.i + 1]})`} <span aria-hidden="true">▶</span></button>`;
  }
  function summary() {
    const cs = C.cs, item = C.item;
    const got = cs.parts.reduce((s, pt, k) => s + (C.st[k].marks || 0), 0), max = caseMarks(cs);
    C.results.push({ title: cs.title, got, max, item, answers: cs.parts.map((pt, k) => ({ pt, st: C.st[k] })) });
    if (C.qi < C.queue.length - 1) { startCase(C.qi + 1); return; }
    const all = C.results;
    const G = all.reduce((s, r) => s + r.got, 0), M = all.reduce((s, r) => s + r.max, 0);
    const pct = M ? G / M : 0;
    const stars = pct >= 0.85 ? 3 : pct >= 0.6 ? 2 : 1;
    const s = S();
    all.forEach((r) => {
      const node = r.item.node;
      if (!node) return;
      const rec = s.nodes[node.id] || (s.nodes[node.id] = { stars: 0, wins: 0, plays: 0, best: 0 });
      const first = !rec.wins;
      rec.plays++; rec.wins++; rec.stars = Math.max(rec.stars || 0, stars); rec.best = Math.max(rec.best || 0, Math.round(pct * 100));
      GAME.addXP(first ? 30 + Math.round(40 * pct) : 15); GAME.addCoins(first ? 10 + Math.round(10 * pct) : 0);
    });
    s.stats.written = (s.stats.written || 0) + all.length;
    GAME.store.save();
    SFX.play('victory'); if (pct >= 0.6) UI.confetti();
    const tips = [];
    all.forEach((r) => r.answers.forEach(({ pt, st }) => {
      if (pt.kind === 'calc' && st.res) {
        if (!st.res.formula) tips.push('Start calculations with the formula in letters.');
        if (st.res.final && st.res.final.ok && !st.res.final.dpOk) tips.push('Finish with exactly 2 decimal places.');
        if (!st.res.hit) tips.push('Check brackets and powers when you type a formula in one line.');
      }
      if (pt.kind === 'theory' && (st.marks || 0) < marksOf(pt)) tips.push('For "why" questions, give the reason (because …) and link it to the question.');
    }));
    const uniq = [...new Set(tips)].slice(0, 4);
    const next = C.queue[0].node ? nextAfter(C.queue[0]) : null;
    document.getElementById('case-body').innerHTML = `<article class="lcard finish">
      <p class="lkind">${C.exam ? 'Written section done' : 'Written answer done'}</p><h2>✍️ ${esc(all.length === 1 ? all[0].title : `${all.length} written questions`)}</h2>
      <p class="stars big" aria-label="${stars} of 3 stars">${[1, 2, 3].map((k) => `<span class="${k <= stars ? 'on' : ''}">★</span>`).join('')}</p>
      <p>You scored <b>${G} of ${M} marks</b> (${Math.round(pct * 100)}%).</p>
      ${all.length > 1 ? `<ul class="wsum">${all.map((r) => `<li>${esc(r.title)}: <b>${r.got} / ${r.max}</b></li>`).join('')}</ul>` : ''}
      ${uniq.length ? `<div class="card"><h3>To get more marks</h3><ul>${uniq.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
      <div class="fb-actions"><button class="btn" data-act="case-copy">📋 Copy my answers</button>
        ${next ? `<button class="btn primary big" data-act="play-node" data-node="${next.id}">Next: ${esc(next.name)} ▶</button>` : ''}
        <button class="btn" data-act="case-quit">${C.exam ? 'Back to the Boardroom' : 'Back to the floor'}</button></div></article>`;
    document.getElementById('case-title').textContent = 'Your marks';
    const nav = document.getElementById('case-nav'); if (nav) nav.innerHTML = '';
  }
  function nextAfter(item) {
    const nodes = item.pack.nodes;
    const i = nodes.findIndex((n) => n.id === item.node.id);
    return i >= 0 && i < nodes.length - 1 ? nodes[i + 1] : null;
  }
  function answersText() {
    return (C.results || []).map((r) => `${r.title}\n` + r.answers.map(({ pt, st }, k) => {
      let body = st.text || '';
      if (pt.kind === 'blanks') body = (st.choice || []).map((c, i) => `gap ${i + 1}: ${c === 0 ? 'right' : 'wrong'}`).join(', ');
      if (pt.kind === 'excel') body = `Excel result: ${st.value || ''}`;
      return `${LABELS[k]}. ${body.trim()}`;
    }).join('\n')).join('\n\n');
  }

  Object.assign(GAME.actions, {
    'case-part': (el) => { if (!C) return; C.i = +el.dataset.i; renderCase(); },
    'case-prev': () => { if (!C || C.i === 0) return; C.i--; renderCase(); },
    'case-next': () => {
      if (!C) return;
      if (C.i < C.cs.parts.length - 1) { C.i++; renderCase(); const t = document.getElementById('case-tabs'); if (t) t.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
      summary();
    },
    'case-quit': () => { const item = C && C.queue[0]; if (C && C.exam) GAME.go('exam'); else if (item) GAME.go('floor', { id: item.pack.id }); else GAME.go('tower'); },
    'case-speak': () => {
      if (!C) return;
      const pt = C.cs.parts[C.i];
      UI.speak(UI.say(C.cs.story) + '. Part ' + LABELS[C.i] + '. ' + UI.say(pt.ask));
    },
    'case-copy': () => {
      const text = answersText();
      const fallback = () => UI.modal({ title: '📋 Your answers', body: `<p class="muted small">Select the text and copy it.</p><textarea class="wtext mono" rows="12" readonly>${esc(text)}</textarea>` });
      try { navigator.clipboard.writeText(text).then(() => UI.toast('Copied.'), fallback); } catch (e) { fallback(); }
    },
  });

  /** For lessons: one written part inside a lesson card. */
  function lessonPart(part, st, key, onDone) {
    const x = { part, st, rerender: () => { const el = document.querySelector(`[data-wkey="${CSS.escape(key)}"]`); if (el) el.outerHTML = partHTML(part, st, { key }); }, onDone };
    HOST[key] = x;
    return partHTML(part, st, { key });
  }

  root.WRITTEN = { partHTML, previewHTML, marksOf, caseMarks, partDone, lessonPart, answersText, scoreCalc };
  root.CASE = { get state() { return C; } };
})(typeof window !== 'undefined' ? window : globalThis);
