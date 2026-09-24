/* Corporate Ladder — question selection, instantiation, checking and stats. */
(function (root) {
  'use strict';
  const { GAME, QCORE, FMT, makeRng } = root;
  const S = () => GAME.store.state;

  function topicKey(packId, topic) { return packId + ':' + topic; }
  function topicLabel(packId, topic) { const p = GAME.packById(packId); return (p && p.topics[topic]) || topic; }
  function mastery(packId, topic) {
    const t = S().stats.topics[topicKey(packId, topic)];
    if (!t) return null;
    return (t.c + 1) / (t.a + 2);
  }

  /** Pool of question sources for a pack + topic list ('*' = all). opts: {boss, section} */
  function pool(pack, topics, opts) {
    opts = opts || {};
    const want = topics === '*' || !topics ? null : new Set(topics);
    const out = [];
    pack.questions.forEach((q) => { if ((!want || want.has(q.topic)) && (opts.boss || !q.boss) && (!opts.section || q.section === opts.section)) out.push({ type: 's', pack, src: q }); });
    pack.generators.forEach((g) => { if ((!want || want.has(g.topic)) && (opts.boss || !g.boss) && (!opts.section || (g.section || 'B') === opts.section)) out.push({ type: 'g', pack, src: g }); });
    return out;
  }

  /** Weighted pick. ctx: {recent:Set, hard:bool, easy:bool, weak:bool} */
  function pick(items, ctx, rng) {
    ctx = ctx || {};
    const st = S().stats;
    const ws = items.map((it) => {
      const src = it.src;
      let w = it.type === 'g' ? 1.15 : 1;
      if (it.type === 's') {
        const rec = st.qs[src.id];
        if (!rec) w *= 1.6; else if (rec.c >= 2 && rec.c === rec.a) w *= 0.45;
      }
      if (ctx.recent && ctx.recent.has(src.id)) w *= it.type === 'g' ? 0.25 : 0.03;
      const m = mastery(it.pack.id, src.topic);
      if (m !== null) w *= 1 + (ctx.weak ? 4 : 1.2) * (1 - m);
      else if (ctx.weak) w *= 1.6;
      const lv = src.level || 1;
      if (ctx.hard) w *= lv === 3 ? 3 : lv === 2 ? 1.5 : 0.6;
      if (ctx.easy) w *= lv === 1 ? 2.2 : lv === 2 ? 1 : 0.35;
      return Math.max(w, 1e-6);
    });
    const total = ws.reduce((a, b) => a + b, 0);
    let r = (rng ? rng.next() : Math.random()) * total;
    for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  }

  /** Build a playable question instance. mode: 'mixed' | 'mcq' | 'type' (overrides settings for numeric questions). */
  function instantiate(item, seed, mode) {
    const src = item.src;
    const pack = item.pack;
    const base = { pack: pack.id, topic: src.topic, topicLabel: pack.topics[src.topic] || src.topic, level: src.level || 1, section: src.section || (item.type === 'g' ? 'B' : 'A'), formula: src.formula || null, src: src.src || null, boss: !!src.boss, srcId: src.id };
    let q;
    if (item.type === 'g') {
      if (!Number.isFinite(seed)) seed = Math.floor(Math.random() * 2 ** 31);
      let made = null, tries = 0, s = seed;
      while (!made && tries < 8) { made = src.make(makeRng(s)); if (!made) { s = (s * 16807 + 11) % 2147483647; tries++; } }
      if (!made) return null;
      seed = s;
      q = Object.assign({}, base, made, { kind: made.kind || 'num', key: src.id + ':' + seed, seed, src: made.src || base.src });
      if (made.formula) q.formula = made.formula;
    } else {
      q = Object.assign({}, base, src, { kind: src.kind, key: src.id, seed: null });
    }
    const rng = makeRng((seed || hashStr(src.id)) ^ 0x5bd1e995);
    if (q.kind === 'mcq') {
      const idx = rng.shuffle(q.choices.map((_, i) => i));
      q.mode = 'choice';
      q.options = idx.map((i) => ({ label: q.choices[i], correct: i === q.answer, why: (q.wrong && q.wrong[i]) || null }));
    } else if (q.kind === 'tf') {
      q.mode = 'choice';
      q.options = [{ label: 'True', correct: q.answer === true }, { label: 'False', correct: q.answer === false }];
      q.tf = true;
    } else {
      const setting = mode || S().settings.answer;
      const asChoice = setting === 'mcq' ? true : setting === 'type' ? false : rng.next() < 0.55;
      q.dp = q.dp === undefined ? 2 : q.dp;
      q.unit = q.unit || '';
      if (asChoice) toChoice(q, rng); else q.mode = 'input';
    }
    return q;
  }
  function toChoice(q, rng) {
    const built = QCORE.buildChoices(q, rng || makeRng(q.seed || 7));
    q.mode = 'choice';
    q.options = built.options.map((o) => ({ label: '\\(' + o.tex + '\\)', correct: o.correct, why: o.why }));
  }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  function correctText(q) {
    if (q.mode === 'choice') { const o = q.options.find((x) => x.correct); return o ? o.label : ''; }
    return '\\(' + FMT.answerTex(q.answer, q.unit, q.dp) + '\\)';
  }

  /** Check an answer. For choice mode pass the option index; for input pass the string. */
  function check(q, given) {
    if (q.mode === 'choice') {
      const o = q.options[given];
      return { ok: !!(o && o.correct), note: o && !o.correct ? o.why : null, yourText: o ? o.label : '' };
    }
    const r = QCORE.checkNumeric(given, q);
    return { ok: r.ok, invalid: r.invalid, note: r.note || null, yourText: Number.isFinite(r.value) ? '\\(' + FMT.answerTex(r.value, q.unit, q.dp) + '\\)' : String(given) };
  }

  /** Record an attempt in the stats (and the Mistake Ledger when wrong). */
  function record(q, res) {
    const st = S().stats;
    st.answered++;
    if (res.ok) st.correct++;
    const tk = topicKey(q.pack, q.topic);
    const t = st.topics[tk] || (st.topics[tk] = { a: 0, c: 0 });
    t.a++; if (res.ok) t.c++; t.last = Date.now();
    if (!q.seed) { const r = st.qs[q.srcId] || (st.qs[q.srcId] = { a: 0, c: 0 }); r.a++; if (res.ok) r.c++; }
    if (q.formula && res.ok) st.formulas[q.formula] = (st.formulas[q.formula] || 0) + 1;
    const J = S().journal;
    const existing = J.findIndex((j) => j.key === q.key);
    if (!res.ok) {
      const entry = { key: q.key, srcId: q.srcId, seed: q.seed, pack: q.pack, topic: q.topic, t: Date.now(), your: res.yourText || '', right: correctText(q), mode: q.mode };
      if (existing >= 0) J.splice(existing, 1);
      J.unshift(entry);
      if (J.length > 80) J.length = 80;
    } else if (existing >= 0 && res.fromJournal) {
      J.splice(existing, 1);
      st.fixed++;
    }
    GAME.store.save();
  }

  /** Recreate a question from a journal entry. */
  function fromJournal(entry) {
    const pack = GAME.packById(entry.pack);
    if (!pack) return null;
    const s = pack.questions.find((x) => x.id === entry.srcId);
    if (s) return instantiate({ type: 's', pack, src: s });
    const g = pack.generators.find((x) => x.id === entry.srcId);
    if (g) return instantiate({ type: 'g', pack, src: g }, entry.seed, entry.mode === 'choice' ? 'mcq' : 'type');
    return null;
  }

  /** All topics across all packs with mastery info, weakest first. */
  function topicReport() {
    const out = [];
    root.PACKS.forEach((p) => Object.entries(p.topics).forEach(([t, label]) => {
      const rec = S().stats.topics[topicKey(p.id, t)] || { a: 0, c: 0 };
      out.push({ pack: p, topic: t, label, a: rec.a, c: rec.c, m: (rec.c + 1) / (rec.a + 2) });
    }));
    return out;
  }

  root.QS = { pool, pick, instantiate, toChoice, check, record, correctText, fromJournal, mastery, topicKey, topicLabel, topicReport, hashStr };
})(typeof window !== 'undefined' ? window : globalThis);
