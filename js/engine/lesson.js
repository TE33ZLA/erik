/* Corporate Ladder — lessons. They teach a topic from zero, one small card at a time:
 *   learn    explanation (short paragraphs, bullet points, a visual, a formula card)
 *   example  a worked example; each step is revealed when the player asks for it
 *   ti       how to do it on the TI-Nspire CX CAS
 *   check    a quick question (two tries, then the full explanation)
 *   guided   one problem split into small parts, answered one at a time
 *   recap    the key points to remember
 * See docs/CONTENT_GUIDE.md for the data format.
 */
(function (root) {
  'use strict';
  const { GAME, UI, QS, QVIEW, CHARTS, RENDER, SFX, QCORE, FMT, TIVIEW } = root;
  const esc = RENDER.esc;
  const S = () => GAME.store.state;
  let L = null;

  const KIND = { learn: 'Learn', example: 'Worked example', ti: 'On your TI-Nspire', check: 'Quick check', guided: 'Your turn, step by step', recap: 'Remember' };

  function lessonOf(pack, node) { return pack.lessons && pack.lessons[node.lesson]; }
  function paras(text) { return text ? String(text).split(/\n\s*\n|\\n\\n/).map((p) => `<p>${UI.rich(p.trim())}</p>`).join('') : ''; }
  function points(list) { return list && list.length ? `<ul class="lpoints">${list.map((p) => `<li>${UI.rich(p)}</li>`).join('')}</ul>` : ''; }
  function nextNodeAfter(pack, node) {
    const i = pack.nodes.findIndex((n) => n.id === node.id);
    if (i >= 0 && i < pack.nodes.length - 1) return { pack, node: pack.nodes[i + 1] };
    const packs = root.PACKS;
    const k = packs.indexOf(pack);
    if (k >= 0 && k < packs.length - 1) return { pack: packs[k + 1], node: packs[k + 1].nodes[0] };
    return null;
  }

  /* ---------------- screen ---------------- */
  GAME.screens.lesson = (p) => {
    const f = GAME.nodeById(p.nodeId);
    const pack = f.pack, node = f.node, lesson = lessonOf(pack, node);
    L = { pack, node, lesson, cards: lesson.cards, i: 0, st: {}, checks: 0, firstTry: 0, finished: false };
    GAME.keyHandler = keys;
    GAME.onAnswer = onAnswer;
    GAME.onNext = () => go(L.i + 1);
    GAME.onToChoice = onToChoice;
    GAME.cleanup = () => { L = null; GAME.onAnswer = GAME.onNext = GAME.onToChoice = null; GAME.activeQ = null; GAME.activeRes = null; };
    GAME.after = () => go(0, true);
    return `<section class="lesson" style="--floor:${pack.color}">
      <div class="lesson-head"><button class="linkbtn" data-act="lesson-quit">← ${GAME.floorName(pack)}</button>
        <div class="lesson-title"><p class="eyebrow">Lesson · ${esc(pack.title)}</p><h1>${esc(lesson.title)}</h1>${lesson.goal ? `<p class="lesson-goal">🎯 ${UI.rich(lesson.goal)}</p>` : ''}</div></div>
      <div class="lesson-prog" id="lesson-prog" aria-hidden="true"></div>
      <div id="lesson-card" class="lesson-stage"></div>
      <nav class="lesson-nav" id="lesson-nav" aria-label="Lesson navigation"></nav>
    </section>`;
  };

  function go(i, first) {
    if (!L) return;
    UI.stopSpeaking();
    L.i = Math.max(0, Math.min(i, L.cards.length));
    if (L.i === L.cards.length) return finish();
    const c = L.cards[L.i];
    const st = L.st[L.i] || (L.st[L.i] = {});
    if (c.kind === 'check' && !st.q) prepareCheck(c, st);
    render();
    if (!first) { const top = document.querySelector('.lesson-head'); if (top) top.scrollIntoView({ block: 'start', behavior: UI.reducedMotion && UI.reducedMotion() ? 'auto' : 'smooth' }); }
    SFX.play('page');
    if (S().settings.autoRead) speakCard();
  }

  function render() {
    const c = L.cards[L.i], st = L.st[L.i];
    document.getElementById('lesson-prog').innerHTML = L.cards.map((x, k) => `<i class="${k < L.i ? 'done' : k === L.i ? 'on' : ''}"></i>`).join('') + `<span>Card ${L.i + 1} of ${L.cards.length}</span>`;
    document.getElementById('lesson-card').innerHTML = cardHTML(c, st);
    GAME.activeQ = c.kind === 'check' ? st.q : null;
    nav();
    const inp = document.querySelector('#lesson-card input[type=text]');
    if (inp) setTimeout(() => inp.focus({ preventScroll: true }), 60);
  }

  function nav() {
    const c = L.cards[L.i], st = L.st[L.i];
    const last = L.i === L.cards.length - 1;
    let label = last ? 'Finish the lesson' : 'Next', can = true;
    if (c.kind === 'example' && (st.shown || 0) < c.steps.length) label = `Show step ${(st.shown || 0) + 1} of ${c.steps.length}`;
    if (c.kind === 'check' && !st.done) { can = false; label = 'Answer to continue'; }
    if (c.kind === 'guided' && !st.done) { can = false; label = 'Finish the steps to continue'; }
    document.getElementById('lesson-nav').innerHTML = `
      <button class="btn" data-act="lesson-back" ${L.i === 0 ? 'disabled' : ''}>← Back</button>
      <button class="icon-btn" data-act="lesson-speak" aria-label="Read this card aloud" title="Read aloud (S)">🔊</button>
      <button class="btn primary" data-act="lesson-next" id="lesson-next" ${can ? '' : 'disabled'}>${esc(label)} <span aria-hidden="true">▶</span></button>`;
  }

  /* ---------------- cards ---------------- */
  function head(c) { return `<p class="lkind">${KIND[c.kind] || ''}</p>${c.title ? `<h2>${UI.rich(c.title)}</h2>` : ''}`; }
  function extras(c) {
    return `${CHARTS.visuals(c, { highlight: S().settings.hl })}${c.formula ? QVIEW.formulaCard(c.formula) : ''}${c.tip ? `<p class="ltip"><span aria-hidden="true">💡</span> ${UI.rich(c.tip)}</p>` : ''}`;
  }
  function cardHTML(c, st) {
    if (c.kind === 'learn') return `<article class="lcard learn">${head(c)}${paras(c.body)}${points(c.points)}${extras(c)}${c.ti ? TIVIEW.html(c.ti) : ''}</article>`;
    if (c.kind === 'ti') return `<article class="lcard ti-card">${head(c)}${paras(c.body)}${TIVIEW.html(c.ti)}${extras(c)}</article>`;
    if (c.kind === 'recap') return `<article class="lcard recap">${head(c)}${paras(c.body)}${points(c.points)}${extras(c)}</article>`;
    if (c.kind === 'example') {
      const n = st.shown || 0;
      const steps = c.steps.slice(0, n).map((s) => `<li>${UI.rich(s)}</li>`).join('');
      const done = n >= c.steps.length;
      return `<article class="lcard example">${head(c)}<div class="lq">${UI.rich(c.q)}</div>${extras(c)}
        <ol class="lsteps">${steps}</ol>
        ${done ? `${c.answer ? `<p class="lans">✅ ${UI.rich(c.answer)}</p>` : ''}${c.ti ? TIVIEW.html(c.ti, { title: 'Now do it on your calculator' }) : ''}` : `<button class="btn" data-act="lesson-reveal">Show step ${n + 1} of ${c.steps.length}</button>`}</article>`;
    }
    if (c.kind === 'check') {
      return `<article class="lcard quick-check">${head(c)}${c.intro ? paras(c.intro) : ''}<div class="lcheck">${QVIEW.card(st.q, {})}</div></article>`;
    }
    if (c.kind === 'guided') return guidedHTML(c, st);
    return `<article class="lcard">${paras(c.body)}</article>`;
  }

  /* ---------------- quick checks ---------------- */
  function prepareCheck(c, st) {
    const pack = L.pack;
    let item = null;
    if (c.ref) { const s = pack.questions.find((x) => x.id === c.ref); if (s) item = { type: 's', pack, src: s }; }
    else if (c.gen) { const g = pack.generators.find((x) => x.id === c.gen); if (g) item = { type: 'g', pack, src: g }; }
    else if (c.q) item = { type: 's', pack, src: Object.assign({ id: L.node.id + '-c' + L.i, topic: (L.lesson.topics || [])[0] || Object.keys(pack.topics)[0], level: 1 }, c.q) };
    st.q = item ? QS.instantiate(item, undefined, 'type') : null;
    st.tries = 0;
    st.done = false;
  }
  function onAnswer(given) {
    const c = L && L.cards[L.i];
    if (!c || c.kind !== 'check') return;
    const st = L.st[L.i];
    if (st.done) return;
    const q = st.q;
    const res = QS.check(q, given);
    if (res.invalid) { UI.toast(esc(res.note), 'warn'); return; }
    st.tries++;
    const cardEl = document.querySelector('#lesson-card .qcard');
    if (!res.ok && st.tries === 1) {
      // first miss: explain the slip, let them try again
      SFX.play('wrong');
      if (q.mode === 'choice') { const b = cardEl.querySelectorAll('.opt')[given]; if (b) { b.disabled = true; b.classList.add('wrong'); } }
      const fb = cardEl.querySelector('.feedback');
      fb.hidden = false;
      const tiHint = q.ti && q.ti.length && (S().settings.calc || 'ti') === 'ti' ? TIVIEW.html(q.ti, { title: 'Try it on your TI-Nspire', hideResults: true }) : '';
      fb.innerHTML = `<h3 class="fb-h bad">Not quite. Have another go.</h3>${res.note ? `<p class="fb-note">🔎 ${UI.rich(res.note)}</p>` : ''}${q.hint ? `<p class="fb-note">📜 ${UI.rich(q.hint)}</p>` : ''}${tiHint}`;
      const inp = cardEl.querySelector('#ans'); if (inp) { inp.select(); inp.focus(); }
      return;
    }
    st.done = true; st.ok = res.ok;
    L.checks++;
    if (res.ok && st.tries === 1) L.firstTry++;
    QS.record(q, res);
    GAME.activeQ = q; GAME.activeRes = res;
    QVIEW.markOptions(cardEl, q, q.mode === 'choice' ? given : -1);
    const fb = cardEl.querySelector('.feedback');
    fb.hidden = false;
    fb.innerHTML = QVIEW.feedback(q, res, { lead: res.ok ? (st.tries === 1 ? 'Correct!' : 'Correct on the second try.') : 'Here is how it works.', nextLabel: L.i === L.cards.length - 1 ? 'Finish the lesson' : 'Next card', noLesson: true });
    SFX.play(res.ok ? 'correct' : 'wrong');
    if (res.ok) GAME.addXP(5);
    nav();
    const nb = document.getElementById('next-btn'); if (nb) nb.focus({ preventScroll: true });
  }
  function onToChoice() {
    const st = L && L.st[L.i];
    if (!st || !st.q || st.q.mode !== 'input' || st.done) return;
    QS.toChoice(st.q);
    document.querySelector('#lesson-card .answers').innerHTML = QVIEW.answers(st.q);
  }

  /* ---------------- guided problems ---------------- */
  function unitOf(p) { return p.unit || ''; }
  function guidedHTML(c, st) {
    st.part = st.part || 0;
    st.res = st.res || [];
    const parts = c.parts.slice(0, st.part + 1).map((p, k) => {
      const r = st.res[k];
      let body;
      if (r && r.done) {
        const shown = p.choices ? UI.rich(p.choices[p.answer]) : UI.rich('\\(' + FMT.answerTex(p.answer, unitOf(p), p.dp === undefined ? 2 : p.dp) + '\\)');
        body = `<p class="gp-res ${r.ok ? 'good' : 'bad'}">${r.ok ? '✅' : '👉'} ${shown}</p>${p.why ? `<p class="gp-why">${UI.rich(p.why)}</p>` : ''}`;
      } else if (p.choices) {
        body = `<div class="opts" role="group" aria-label="Choose an answer">${p.choices.map((ch, i) => `<button class="opt" data-act="lesson-part-pick" data-i="${i}" ${r && r.bad && r.bad.includes(i) ? 'disabled' : ''}><span class="key" aria-hidden="true">${i + 1}</span><span class="otext">${UI.rich(ch)}</span></button>`).join('')}</div>${r && r.msg ? `<p class="fb-note">${r.msg}</p>` : ''}`;
      } else {
        const pre = p.unit === '$' || p.unit === '$m' ? '$' : '';
        const post = { '%': '%', yrs: 'years', days: 'days', units: 'units', x: '×', '$m': 'million' }[p.unit] || '';
        body = `<form class="numform" data-submit="lesson-part" autocomplete="off"><div class="numrow">${pre ? `<span class="affix">${pre}</span>` : ''}<input type="text" name="pans" id="pans" inputmode="decimal" spellcheck="false" aria-label="Your answer" placeholder="Your answer">${post ? `<span class="affix">${post}</span>` : ''}<button class="btn primary" type="submit">Check</button></div>
          <p class="help">${p.dp === 0 ? 'A whole number.' : `Round to ${p.dp === undefined ? 2 : p.dp} decimal places.`}${p.unit === '%' ? ' Type a percentage, e.g. 8.45.' : ''}</p></form>${r && r.msg ? `<p class="fb-note">${r.msg}</p>` : ''}`;
      }
      return `<li class="gpart${r && r.done ? ' done' : ''}"><div class="gp-ask">${UI.rich(p.ask)}</div>${body}</li>`;
    }).join('');
    const allDone = st.done;
    return `<article class="lcard guided">${head(c)}<div class="lq">${UI.rich(c.q)}</div>${extras(c)}<ol class="gparts">${parts}</ol>
      ${allDone ? `${c.answer ? `<p class="lans">🎉 ${UI.rich(c.answer)}</p>` : ''}${c.ti ? TIVIEW.html(c.ti, { title: 'The same thing on your calculator' }) : ''}` : ''}</article>`;
  }
  function partAnswer(given, isChoice) {
    const c = L && L.cards[L.i];
    if (!c || c.kind !== 'guided') return;
    const st = L.st[L.i];
    const p = c.parts[st.part];
    const r = st.res[st.part] || (st.res[st.part] = { tries: 0, bad: [] });
    let ok, note = '';
    if (isChoice) ok = +given === p.answer;
    else {
      const chk = QCORE.checkNumeric(given, { answer: p.answer, unit: unitOf(p), dp: p.dp === undefined ? 2 : p.dp, mistakes: p.mistakes || [], tol: p.tol });
      if (chk.invalid) { UI.toast(esc(chk.note), 'warn'); return; }
      ok = chk.ok; note = chk.note || '';
    }
    r.tries++;
    if (!ok && r.tries < 2) {
      if (isChoice) r.bad.push(+given);
      r.msg = `🔎 ${note ? UI.rich(note) + ' ' : ''}${p.hint ? UI.rich(p.hint) : 'Not quite. Try again.'}`;
      SFX.play('wrong');
      render();
      return;
    }
    r.done = true; r.ok = ok; r.msg = '';
    L.checks++;
    if (ok && r.tries === 1) L.firstTry++;
    SFX.play(ok ? 'correct' : 'page');
    if (st.part < c.parts.length - 1) st.part++;
    else st.done = true;
    render();
  }

  /* ---------------- end of the lesson ---------------- */
  function finish() {
    if (!L) return;
    const s = S();
    const acc = L.checks ? L.firstTry / L.checks : 1;
    const stars = acc >= 0.8 ? 3 : acc >= 0.5 ? 2 : 1;
    const xp = 25 + 5 * L.firstTry, coins = 10 + 2 * L.firstTry;
    if (!L.finished) {
      L.finished = true;
      const rec = s.nodes[L.node.id] || (s.nodes[L.node.id] = { stars: 0, wins: 0, plays: 0, best: 0 });
      const firstTime = !rec.wins;
      rec.plays++; rec.wins++; rec.stars = Math.max(rec.stars || 0, stars);
      s.stats.lessons = (s.stats.lessons || 0) + 1;
      GAME.addXP(firstTime ? xp : Math.round(xp / 2)); GAME.addCoins(firstTime ? coins : 0);
      GAME.store.save();
      GAME.checkAchievements({ type: 'lesson' });
      SFX.play('victory');
      UI.confetti();
    }
    const nxt = nextNodeAfter(L.pack, L.node);
    const kindName = (n) => ({ lesson: 'Lesson', battle: 'Battle', mini: 'Mini-game', boss: 'Boss' }[n.kind] || 'Next');
    document.getElementById('lesson-prog').innerHTML = L.cards.map(() => '<i class="done"></i>').join('') + '<span>Done</span>';
    document.getElementById('lesson-nav').innerHTML = '';
    document.getElementById('lesson-card').innerHTML = `<article class="lcard finish">
      <p class="lkind">Lesson complete</p><h2>🎓 ${esc(L.lesson.title)}</h2>
      <p class="stars big" aria-label="${stars} of 3 stars">${[1, 2, 3].map((k) => `<span class="${k <= stars ? 'on' : ''}">★</span>`).join('')}</p>
      <p>${L.checks ? `You got <b>${L.firstTry} of ${L.checks}</b> checks right on the first try.` : 'Nice work.'}</p>
      ${L.lesson.goal ? `<p class="lesson-goal">🎯 ${UI.rich(L.lesson.goal)}</p>` : ''}
      <div class="fb-actions">${nxt ? `<button class="btn primary big" data-act="play-node" data-node="${nxt.node.id}">Next: ${esc(kindName(nxt.node))}: ${esc(nxt.node.name)} ▶</button>` : ''}
        <button class="btn" data-act="lesson-again">Go through it again</button><button class="btn" data-act="lesson-quit">Back to the floor</button></div></article>`;
    const b = document.querySelector('#lesson-card .btn.primary'); if (b) b.focus({ preventScroll: true });
  }

  /* ---------------- read aloud and keys ---------------- */
  function speakCard() {
    const c = L && L.cards[L.i];
    if (!c) return;
    const st = L.st[L.i] || {};
    let t = (KIND[c.kind] || '') + '. ' + (c.title ? UI.say(c.title) + '. ' : '');
    if (c.body) t += UI.say(c.body) + ' ';
    if (c.points) t += c.points.map((p) => UI.say(p)).join('. ') + '. ';
    if (c.kind === 'example') { t += UI.say(c.q) + '. ' + c.steps.slice(0, st.shown || 0).map((x) => UI.say(x)).join('. '); if ((st.shown || 0) >= c.steps.length && c.answer) t += '. ' + UI.say(c.answer); }
    if (c.kind === 'check' && st.q) t += QVIEW.speechFor(st.q);
    if (c.kind === 'guided') { t += UI.say(c.q) + '. ' + UI.say(c.parts[st.part || 0].ask); }
    if (c.ti && (c.kind !== 'example' || (st.shown || 0) >= c.steps.length)) t += '. ' + TIVIEW.speech(c.ti);
    if (c.tip) t += '. Tip: ' + UI.say(c.tip);
    UI.speak(t);
  }
  function keys(ev) {
    if (!L || UI.modalStack.length || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const tag = (ev.target.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || tag === 'select';
    if (typing) return;
    const c = L.cards[L.i];
    const k = (ev.key || '').toLowerCase();
    if (c && c.kind === 'check' && L.st[L.i] && !L.st[L.i].done && L.st[L.i].q && L.st[L.i].q.mode === 'choice') {
      const q = L.st[L.i].q;
      let idx = -1;
      if (q.tf) { if (k === 't' || k === '1') idx = 0; if (k === 'f' || k === '2') idx = 1; }
      else if (/^[1-6]$/.test(k)) idx = +k - 1;
      else if (/^[a-f]$/.test(k) && k !== 's') idx = k.charCodeAt(0) - 97;
      if (idx >= 0 && idx < q.options.length) { const b = document.querySelectorAll('#lesson-card .opt')[idx]; if (b && !b.disabled) { ev.preventDefault(); onAnswer(idx); } return; }
    }
    if (ev.key === 'ArrowRight' || (ev.key === 'Enter' && !(ev.target.closest && ev.target.closest('button, summary, a')))) { const b = document.getElementById('lesson-next'); if (b && !b.disabled) { ev.preventDefault(); b.click(); } return; }
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); if (L.i > 0) go(L.i - 1); return; }
    if (k === 's') speakCard();
  }

  /** A quick refresher from a battle: the lesson's key points, without leaving the fight. */
  function peek(packId, lessonId) {
    const pack = GAME.packById(packId);
    const les = pack && pack.lessons && pack.lessons[lessonId];
    if (!les) return;
    const recap = les.cards.filter((c) => c.kind === 'recap');
    const firstLearn = les.cards.find((c) => c.kind === 'learn');
    const node = pack.nodes.find((n) => n.kind === 'lesson' && n.lesson === lessonId);
    const body = `${les.goal ? `<p class="lesson-goal">🎯 ${UI.rich(les.goal)}</p>` : ''}
      ${firstLearn ? `<article class="lcard learn">${head(firstLearn)}${paras(firstLearn.body)}${points(firstLearn.points)}</article>` : ''}
      ${recap.map((c) => `<article class="lcard recap">${head(c)}${points(c.points)}${c.formula ? QVIEW.formulaCard(c.formula) : ''}</article>`).join('')}
      <div class="fb-actions"><button class="btn" data-act="modal-close">Back to the question</button>${node ? `<button class="btn" data-act="lesson-open" data-node="${node.id}">Open the full lesson</button>` : ''}</div>`;
    UI.modal({ title: `📖 ${esc(les.title)}`, body, wide: true });
  }

  Object.assign(GAME.actions, {
    'lesson-peek': (el) => peek(el.dataset.pack, el.dataset.lesson),
    'lesson-open': (el) => {
      const inBattle = GAME.current.name === 'battle' && root.BATTLE.state && root.BATTLE.state.phase !== 'end';
      if (inBattle) {
        UI.closeModal();
        UI.modal({ title: 'Leave this battle?', body: `<p>Opening the lesson ends this battle. XP from answers so far is kept.</p><div class="fb-actions"><button class="btn primary" data-act="lesson-open-yes" data-node="${esc(el.dataset.node)}">Open the lesson</button><button class="btn" data-act="modal-close">Stay and fight</button></div>` });
        return;
      }
      UI.closeModal(); GAME.go('lesson', { nodeId: el.dataset.node });
    },
    'lesson-open-yes': (el) => { const B = root.BATTLE.state; if (B && B.xp) { GAME.addXP(B.xp); GAME.addCoins(B.coins); GAME.store.save(); } UI.closeModal(); GAME.go('lesson', { nodeId: el.dataset.node }); },
    'lesson-next': () => {
      if (!L) return;
      const c = L.cards[L.i], st = L.st[L.i] || {};
      if (c && c.kind === 'example' && (st.shown || 0) < c.steps.length) return GAME.actions['lesson-reveal']();
      go(L.i + 1);
    },
    'lesson-back': () => { if (L && L.i > 0) go(L.i - 1); },
    'lesson-reveal': () => {
      if (!L) return;
      const c = L.cards[L.i], st = L.st[L.i];
      if (c.kind !== 'example') return;
      st.shown = Math.min(c.steps.length, (st.shown || 0) + 1);
      render();
      SFX.play('click');
      const last = document.querySelector('#lesson-card .lsteps li:last-child'); if (last) last.scrollIntoView({ block: 'nearest' });
      if (S().settings.autoRead) UI.speak(UI.say(c.steps[st.shown - 1]));
    },
    'lesson-speak': () => speakCard(),
    'lesson-part': (form) => partAnswer(form.querySelector('#pans').value, false),
    'lesson-part-pick': (el) => partAnswer(+el.dataset.i, true),
    'lesson-again': () => { if (L) GAME.go('lesson', { nodeId: L.node.id }); },
    'lesson-quit': () => { const pack = L && L.pack; UI.stopSpeaking(); if (pack) GAME.go('floor', { id: pack.id }); else GAME.go('tower'); },
  });

  root.LESSON = { get state() { return L; }, nextNodeAfter };
})(typeof window !== 'undefined' ? window : globalThis);
