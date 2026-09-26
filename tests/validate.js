/* Validates every floor pack: structure, ids, topics, formula links, generator output,
 * and that every LaTeX fragment compiles in KaTeX.
 * Run: node tests/validate.js [path/to/katex]   (defaults to node_modules/katex or KATEX_PATH env)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const onlyIdx = args.indexOf('--only');
const ONLY = onlyIdx >= 0 ? new Set(args[onlyIdx + 1].split(',')) : null; // e.g. --only w2,w3
const katexPath = (args[0] && !args[0].startsWith('--') ? args[0] : null) || process.env.KATEX_PATH || 'katex';
globalThis.katex = require(katexPath);
for (const f of ['js/lib/fin.js', 'js/lib/fmt.js', 'js/lib/render.js', 'js/lib/qcore.js', 'js/lib/charts.js', 'js/lib/nspire.js', 'js/lib/tiview.js', 'js/lib/viz.js', 'js/data/formulas.js', 'js/data/registry.js']) require(path.join(ROOT, f));
const packFiles = fs.readdirSync(path.join(ROOT, 'js/data')).filter((f) => /^w[\dx]+\.js$/.test(f)).filter((f) => !ONLY || ONLY.has(f.replace('.js', ''))).sort();
for (const f of packFiles) require(path.join(ROOT, 'js/data', f));

const { PACKS, FORMULAS, RENDER, makeRng, QCORE, NSPIRE, TIVIEW } = globalThis;
const REQUIRE_TI = process.env.REQUIRE_TI !== '0'; // every calculation question needs a TI-Nspire method
const REQUIRE_VIZ = process.env.REQUIRE_VIZ === '1'; // every learn card needs a picture
const vizStats = {};
const UNITS = new Set(['$', '%', 'yrs', 'days', 'units', 'x', '', '$m']);
const BODIES = new Set(['blob', 'ghost', 'box', 'coin', 'spiky', 'tall', 'round']);
const ACCS = new Set(['tophat', 'crown', 'horns', 'monocle', 'glasses', 'shades', 'bowtie', 'tie', 'pirate', 'antenna', 'halo', 'cap', 'bandana', 'mustache', 'wizard', 'hardhat', 'headset', 'leaf']);
const MOUTHS = new Set(['grin', 'fangs', 'smirk', 'o', 'flat', 'tongue']);
const SEEDS = +(process.env.SEEDS || 250);

const coincidences = {};
let curGen = '';
const errors = [];
const warns = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warns.push(`${where}: ${msg}`);

function checkTex(where, str) {
  if (str === undefined || str === null) return;
  if (typeof str !== 'string') { err(where, `expected string, got ${typeof str}`); return; }
  if (/undefined|NaN|\[object Object\]/.test(str)) err(where, `suspicious text: ${str.slice(0, 120)}`);
  for (const seg of RENDER.segments(str)) {
    if (seg.type === 'text') {
      if (/\\(?!n)[A-Za-z$%{]/.test(seg.v) || /\{,\}/.test(seg.v)) err(where, `LaTeX outside \\( \\) (shows as raw text): ${seg.v.slice(Math.max(0, seg.v.search(/\\(?!n)[A-Za-z$%{]|\{,\}/) - 30), seg.v.search(/\\(?!n)[A-Za-z$%{]|\{,\}/) + 40)}`);
      continue;
    }
    try { globalThis.katex.renderToString(seg.v, { throwOnError: true, displayMode: seg.type === 'display', strict: 'ignore' }); }
    catch (e) { err(where, `KaTeX: ${e.message.split('\n')[0]} in «${seg.v.slice(0, 100)}»`); }
  }
}
function checkTexRaw(where, tex) {
  try { globalThis.katex.renderToString(tex, { throwOnError: true, strict: 'ignore' }); }
  catch (e) { err(where, `KaTeX: ${e.message.split('\n')[0]} in «${String(tex).slice(0, 100)}»`); }
}
/** Every rich-text string inside a picture spec (captions, step text, labels shown as HTML). */
function vizTexts(v) {
  const out = [];
  [].concat(v || []).forEach((s) => {
    if (!s) return;
    out.push(s.cap, s.title, s.total, s.note);
    (s.steps || []).forEach((x) => out.push(x.t, x.s));
    (s.links || []).forEach((x) => out.push(x));
    (s.items || []).forEach((x) => { out.push(x.title, x.big, x.t, x.s, x.markText); (x.points || []).forEach((p) => out.push(p)); });
    (s.keys || []).forEach((k) => out.push(k.label));
    (s.parts || []).forEach((p) => out.push(p.label, p.show, p.note, p.say));
    (s.rows || []).forEach((r) => { out.push(r.label); (r.parts || []).forEach((p) => out.push(p.label, p.show, p.note)); });
    (s.pies || []).forEach((p) => { out.push(p.title); (p.parts || []).forEach((x) => out.push(x.label, x.show)); });
    (s.lines || []).forEach((l) => out.push(l.say));
  });
  return out.filter((x) => typeof x === 'string').map((x) => x.replace(/\[\[([^\]]+)\]\]/g, '$1'));
}
function checkVisuals(where, q) {
  if (q.viz) {
    VIZ.check(q.viz).forEach((m) => err(where + '.viz', m));
    vizTexts(q.viz).forEach((t, i) => checkTex(`${where}.viz[text ${i}]`, t));
  }
  if (q.tl) {
    const tl = q.tl;
    const n = tl.cfs ? tl.cfs.length - 1 : tl.n;
    if (!Number.isInteger(n) || n < 1 || n > 400) err(where, 'timeline needs cfs[] or integer n');
  }
  if (q.table) {
    if (!Array.isArray(q.table.head) || !Array.isArray(q.table.rows)) err(where, 'table needs head[] and rows[][]');
    else q.table.rows.forEach((r, i) => { if (r.length !== q.table.head.length) err(where, `table row ${i} has ${r.length} cells, head has ${q.table.head.length}`); r.forEach((c, j) => checkTex(`${where}.table[${i}][${j}]`, String(c))); });
    (q.table.head || []).forEach((c, j) => checkTex(`${where}.table.head[${j}]`, String(c)));
  }
  if (q.chart) {
    const c = q.chart;
    if (c.type === 'npv') { if (!Array.isArray(c.projects) || !c.projects.every((p) => Array.isArray(p.cfs))) err(where, 'npv chart needs projects[{name, cfs}]'); }
    else if (c.type === 'sml') { if (!(Number.isFinite(c.rf) && Number.isFinite(c.rm) && Array.isArray(c.points))) err(where, 'sml chart needs rf, rm, points'); }
    else err(where, `unknown chart type ${c.type}`);
  }
  if (q.tree) {
    const walk = (node, d) => {
      if (!node || !['decision', 'chance', 'end'].includes(node.t)) { err(where, 'tree node needs t: decision|chance|end'); return; }
      if (node.label) checkTex(where + '.tree', node.label);
      (node.kids || []).forEach((k) => { if (k.edge) checkTex(where + '.tree.edge', k.edge); walk(k.node, d + 1); });
    };
    walk(q.tree, 0);
  }
}

/* ---------- TI-Nspire methods ---------- */
const SOLVER_KEYS = new Set(['N', 'I', 'PV', 'Pmt', 'FV', 'PpY', 'CpY', 'PmtAt']);
const tiStats = {};
function checkTI(where, steps, q) {
  if (!Array.isArray(steps) || !steps.length) { err(where, 'ti must be a non-empty array of steps'); return; }
  steps.forEach((st, i) => {
    const w = `${where}.ti[${i}]`;
    const kinds = ['solver', 'cmd', 'say'].filter((k) => st[k] !== undefined);
    if (kinds.length !== 1) { err(w, 'each TI step needs exactly one of solver / cmd / say'); return; }
    if (st.say !== undefined) checkTex(w + '.say', st.say);
    if (st.note !== undefined) checkTex(w + '.note', st.note);
    if (st.solver) {
      Object.keys(st.solver).forEach((k) => { if (!SOLVER_KEYS.has(k)) err(w, `unknown Finance Solver field ${k}`); });
      if (!['N', 'I', 'PV', 'Pmt', 'FV'].includes(st.find)) err(w, `find must be N, I, PV, Pmt or FV (got ${st.find})`);
      if (st.solver.PmtAt !== undefined && !['END', 'BEGIN'].includes(st.solver.PmtAt)) err(w, 'PmtAt must be END or BEGIN');
      if (st.solver[st.find] !== undefined) err(w, `the solved field ${st.find} must be left empty`);
    }
    if (st.cmd !== undefined && typeof st.cmd !== 'string') err(w, 'cmd must be a string');
  });
  let run;
  try { run = NSPIRE.run(steps); } catch (e) { err(where, `TI method crashed: ${e.message}`); return; }
  run.results.forEach((r, i) => { if (r.error) err(`${where}.ti[${i}]`, `TI step fails: ${r.error} («${r.step.cmd || r.step.find || ''}»)`); });
  try { TIVIEW.html(steps); } catch (e) { err(where, `TI view crashed: ${e.message}`); }
  if (!q || !Number.isFinite(q.answer) || !run.last) return;
  const lastStep = run.last.step;
  let vals = run.last.value && run.last.value.solve ? run.last.value.roots : [run.last.value];
  vals = vals.filter((v) => typeof v === 'number');
  if (!vals.length) { err(where, 'the last TI step does not give a number'); return; }
  const ans = q.answer;
  const scale = (v) => (lastStep.pct ? v * 100 : q.unit === '$m' && Math.abs(v) > 1e5 && Math.abs(ans) < 1e5 ? v / 1e6 : v);
  const tol = Math.max(QCORE.tolerance(q), Math.abs(ans) * 2e-4);
  const ok = vals.some((v) => Math.abs(scale(v) - ans) <= tol);
  const flipped = !ok && vals.some((v) => Math.abs(-scale(v) - ans) <= tol);
  if (flipped && !lastStep.note && !steps.some((st) => st.say && /sign|minus|negative|positive/i.test(st.say))) err(where, `the TI result has the opposite sign to the answer (${scale(vals[0])} vs ${ans}); add a note on the last step that explains the sign`);
  else if (!ok && !flipped) err(where, `the TI method gives ${vals.map((v) => +scale(v).toFixed(6)).join(' or ')}, but the answer is ${+ans.toFixed(6)}`);
}

function checkQuestion(where, q, pack, isGen) {
  const kind = q.kind || 'num';
  if (!['mcq', 'tf', 'num'].includes(kind)) err(where, `bad kind ${kind}`);
  checkTex(where + '.q', q.q);
  if (!q.q || q.q.length < 8) err(where, 'missing question text');
  checkTex(where + '.why', q.why);
  (q.steps || []).forEach((s, i) => checkTex(`${where}.steps[${i}]`, s));
  (q.givens || []).forEach((g, i) => {
    if (!Array.isArray(g) || g.length !== 2) { err(where, `givens[${i}] must be [label, value]`); return; }
    checkTexRaw(`${where}.givens[${i}]`, `${g[0]} = ${g[1]}`);
  });
  if (q.calc && typeof q.calc !== 'string') err(where, 'calc must be a string');
  if (q.calc && /NaN|undefined/.test(q.calc)) err(where, 'calc has NaN/undefined');
  checkVisuals(where, q);
  if (kind === 'mcq') {
    if (!Array.isArray(q.choices) || q.choices.length < 2) err(where, 'mcq needs choices');
    else {
      q.choices.forEach((c, i) => checkTex(`${where}.choices[${i}]`, c));
      if (!(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length)) err(where, `mcq answer index ${q.answer} invalid`);
      const uniq = new Set(q.choices.map((c) => c.trim()));
      if (uniq.size !== q.choices.length) err(where, `duplicate choices: ${JSON.stringify(q.choices)}`);
      if (!isGen && q.choices.length !== 4) warn(where, `mcq has ${q.choices.length} choices (4 preferred)`);
    }
    if (q.wrong) Object.values(q.wrong).forEach((w) => checkTex(where + '.wrong', w));
  } else if (kind === 'tf') {
    if (typeof q.answer !== 'boolean') err(where, 'tf answer must be boolean');
  } else {
    if (!Number.isFinite(q.answer)) err(where, `num answer not finite: ${q.answer}`);
    if (!UNITS.has(q.unit === undefined ? '' : q.unit)) err(where, `bad unit ${q.unit}`);
    if (q.dp !== undefined && !(Number.isInteger(q.dp) && q.dp >= 0 && q.dp <= 6)) err(where, `bad dp ${q.dp}`);
    (q.mistakes || []).forEach((m, i) => {
      if (!Number.isFinite(m.v)) err(where, `mistakes[${i}].v not finite (${m.v})`);
      checkTex(`${where}.mistakes[${i}].why`, m.why);
    });
    if (isGen && (!q.mistakes || q.mistakes.length < 2)) warn(where, 'fewer than 2 mistakes (distractors)');
    if (Number.isFinite(q.answer)) {
      const shownAns = QCORE.display(q.answer, q);
      (q.mistakes || []).forEach((m, i) => {
        if (Number.isFinite(m.v) && QCORE.display(m.v, q) === shownAns) {
          // occasional numeric coincidences are fine (the game drops such distractors); systematic ones are bugs
          if (isGen) coincidences[curGen] = (coincidences[curGen] || 0) + 1;
          else err(where, `mistakes[${i}] shows the same value as the answer (${shownAns})`);
        }
      });
      const seen = new Set();
      (q.mistakes || []).forEach((m, i) => { const d = QCORE.display(m.v, q); if (seen.has(d)) warn(where, `mistakes[${i}] duplicates another mistake (${d})`); seen.add(d); });
      const built = QCORE.buildChoices(q, makeRng(7));
      if (built.options.length !== 4) err(where, `could only build ${built.options.length} options`);
      if (!built.options[built.answer] || !built.options[built.answer].correct) err(where, 'buildChoices lost the answer');
      built.options.forEach((o) => { if (Math.abs(o.v) > 1e12) err(where, `absurd option ${o.text}`); });
    }
    if (q.unit === '%' && Math.abs(q.answer) < 1 && Math.abs(q.answer) > 0 && !q.small) warn(where, `% answer ${q.answer} looks like a decimal, not percent units`);
  }
  if (q.formula && !FORMULAS.byId[q.formula]) err(where, `unknown formula id ${q.formula}`);
  if (q.ti !== undefined) checkTI(where, q.ti, kind === 'num' ? q : null);
  if (pack) {
    const t = tiStats[pack.id] || (tiStats[pack.id] = { calc: 0, ti: 0, missing: [] });
    if (kind === 'num' && !isGen) { t.calc++; if (q.ti) t.ti++; else t.missing.push(where); }
  }
}

/* ---------- lessons ---------- */
const CARD_KINDS = new Set(['learn', 'example', 'ti', 'check', 'guided', 'recap']);
function checkLesson(where, pack, L) {
  if (!L) { err(where, 'lesson not found in pack.lessons'); return; }
  if (!L.title) err(where, 'lesson needs a title');
  checkTex(where + '.title', L.title);
  checkTex(where + '.goal', L.goal);
  (L.topics || []).forEach((t) => { if (!(t in pack.topics)) err(where, `unknown topic ${t}`); });
  if (!Array.isArray(L.cards) || L.cards.length < 3) { err(where, 'a lesson needs at least 3 cards'); return; }
  L.cards.forEach((c, i) => {
    const w = `${where}.card${i}`;
    if (!CARD_KINDS.has(c.kind)) { err(w, `unknown card kind ${c.kind}`); return; }
    if (c.kind === 'learn') {
      const vs = vizStats[pack.id] || (vizStats[pack.id] = { learn: 0, pic: 0 });
      vs.learn++;
      if (c.viz || c.tl || c.table || c.chart || c.tree || c.ti) vs.pic++;
      else if (REQUIRE_VIZ) err(w, 'learn card has no picture (viz)');
    }
    ['title', 'body', 'tip', 'q', 'answer', 'intro'].forEach((k) => { if (typeof c[k] === 'string') checkTex(`${w}.${k}`, c[k]); });
    (c.points || []).forEach((p, j) => checkTex(`${w}.points[${j}]`, p));
    if (c.formula && !FORMULAS.byId[c.formula]) err(w, `unknown formula ${c.formula}`);
    checkVisuals(w, c);
    if (c.kind === 'learn' && !c.body && !c.points) err(w, 'learn card needs body or points');
    if (c.kind === 'recap' && !(c.points && c.points.length)) err(w, 'recap card needs points');
    if (c.kind === 'example') {
      if (!c.q) err(w, 'example needs q');
      if (!Array.isArray(c.steps) || !c.steps.length) err(w, 'example needs steps');
      (c.steps || []).forEach((st, j) => checkTex(`${w}.steps[${j}]`, st));
    }
    if (c.kind === 'ti' && !c.ti) err(w, 'ti card needs ti steps');
    if (c.kind === 'check') {
      if (c.ref) { if (!pack.questions.some((x) => x.id === c.ref)) err(w, `check ref ${c.ref} not found`); }
      else if (c.gen) { if (!pack.generators.some((x) => x.id === c.gen)) err(w, `check gen ${c.gen} not found`); }
      else if (c.q && typeof c.q === 'object') checkQuestion(w, Object.assign({ level: 1 }, c.q), null, false);
      else err(w, 'check needs ref, gen or q');
      if (c.q && typeof c.q === 'object' && c.q.hint) checkTex(w + '.hint', c.q.hint);
    }
    let tiTarget = null;
    if (c.kind === 'guided') {
      if (!c.q) err(w, 'guided needs q');
      if (!Array.isArray(c.parts) || !c.parts.length) err(w, 'guided needs parts');
      (c.parts || []).forEach((p, j) => {
        const pw = `${w}.parts[${j}]`;
        checkTex(pw + '.ask', p.ask); checkTex(pw + '.hint', p.hint); checkTex(pw + '.why', p.why);
        if (!p.ask) err(pw, 'part needs ask');
        if (p.choices) {
          p.choices.forEach((ch, k) => checkTex(`${pw}.choices[${k}]`, ch));
          if (!(Number.isInteger(p.answer) && p.answer >= 0 && p.answer < p.choices.length)) err(pw, 'choice answer index invalid');
        } else {
          if (!Number.isFinite(p.answer)) err(pw, `answer not finite: ${p.answer}`);
          if (!UNITS.has(p.unit === undefined ? '' : p.unit)) err(pw, `bad unit ${p.unit}`);
        }
      });
      const lastP = (c.parts || [])[c.parts.length - 1];
      if (lastP && !lastP.choices && Number.isFinite(lastP.answer)) tiTarget = { answer: lastP.answer, unit: lastP.unit || '', dp: lastP.dp === undefined ? 2 : lastP.dp, mistakes: [] };
    }
    if (c.ti) checkTI(w, c.ti, tiTarget);
  });
}

function checkEnemy(where, e) {
  if (!e) { err(where, 'missing enemy'); return; }
  if (!e.name) err(where, 'enemy needs name');
  if (!BODIES.has(e.body)) err(where, `bad body ${e.body}`);
  (e.acc || []).forEach((a) => { if (!ACCS.has(a)) err(where, `bad accessory ${a}`); });
  if (e.mouth && !MOUTHS.has(e.mouth)) err(where, `bad mouth ${e.mouth}`);
  if (!/^#[0-9a-f]{6}$/i.test(e.color || '')) err(where, `bad enemy color ${e.color}`);
  const l = e.lines || {};
  if (!l.intro || !Array.isArray(l.hit) || !Array.isArray(l.taunt) || !l.win || !l.lose) err(where, 'enemy lines need intro, hit[], taunt[], win, lose');
}

const allIds = new Set();
const summary = [];
for (const pack of PACKS) {
  const P = pack.id;
  for (const k of ['id', 'floor', 'week', 'title', 'topic', 'color', 'icon', 'intro', 'briefing', 'topics', 'nodes', 'questions', 'generators']) if (pack[k] === undefined) err(P, `missing ${k}`);
  (pack.briefing || []).forEach((b, i) => { if (!b.h || !Array.isArray(b.points)) err(P, `briefing[${i}] needs h and points[]`); (b.points || []).forEach((p, j) => checkTex(`${P}.briefing[${i}][${j}]`, p)); });
  const topics = pack.topics || {};
  const topicUse = {};
  Object.keys(topics).forEach((t) => (topicUse[t] = 0));
  (pack.nodes || []).forEach((n) => {
    const w = `${P}.node ${n.id}`;
    if (allIds.has(n.id)) err(w, 'duplicate node id'); allIds.add(n.id);
    if (!['battle', 'boss', 'mini', 'lesson'].includes(n.kind)) err(w, `bad kind ${n.kind}`);
    if (n.kind === 'lesson') {
      checkLesson(w, pack, pack.lessons && pack.lessons[n.lesson]);
    } else if (n.kind === 'mini') {
      const m = pack.minis && pack.minis[n.mini];
      if (!m) err(w, `mini ${n.mini} not found in pack.minis`);
      else if (m.game === 'rapid') {
        if (!m.items && !m.gen) err(w, 'rapid mini needs items or gen');
        (m.items || []).forEach((it, i) => {
          checkTex(`${w}.items[${i}]`, it.t); checkTex(`${w}.items[${i}].why`, it.why);
          if (it.opts) { if (!Number.isInteger(it.a) || it.a < 0 || it.a >= it.opts.length) err(w, `item ${i} bad a`); }
          else if (!m.bins || !m.bins.some((b) => b.id === it.bin)) err(w, `item ${i} bin ${it.bin} not in bins`);
        });
        if (m.gen) for (let s = 1; s <= 60; s++) {
          const it = m.gen(makeRng(s * 7919));
          if (!it) { err(w, 'gen returned null'); break; }
          checkTex(`${w}.gen(${s})`, it.t); checkTex(`${w}.gen(${s}).why`, it.why);
          if (it.opts) { it.opts.forEach((o) => checkTex(`${w}.gen(${s}).opt`, o)); if (!(it.a >= 0 && it.a < it.opts.length)) err(w, `gen(${s}) bad a=${it.a}`); if (new Set(it.opts).size !== it.opts.length) err(w, `gen(${s}) duplicate opts ${JSON.stringify(it.opts)}`); }
          else if (!m.bins || !m.bins.some((b) => b.id === it.bin)) err(w, `gen(${s}) bin ${it.bin} invalid`);
        }
      } else if (!['timeline', 'sml'].includes(m.game)) err(w, `unknown mini game ${m.game}`);
    } else {
      checkEnemy(w, n.enemy);
      if (n.topics !== '*') (n.topics || []).forEach((t) => { if (!(t in topics)) err(w, `unknown topic ${t}`); });
      if (!(n.n >= 3)) err(w, 'n must be >= 3');
    }
  });

  let nStatic = 0, byLevel = [0, 0, 0, 0], secA = 0, secB = 0;
  (pack.questions || []).forEach((q) => {
    const w = `${P}.${q.id}`;
    if (!q.id) err(P, 'question without id');
    if (allIds.has(q.id)) err(w, 'duplicate id'); allIds.add(q.id);
    if (!(q.topic in topics)) err(w, `unknown topic ${q.topic}`); else topicUse[q.topic]++;
    if (![1, 2, 3].includes(q.level)) err(w, 'level must be 1|2|3');
    if (!['A', 'B'].includes(q.section)) err(w, 'section must be A|B');
    checkQuestion(w, q, pack, false);
    nStatic++; byLevel[q.level]++; q.section === 'A' ? secA++ : secB++;
  });
  let nGen = 0;
  (pack.generators || []).forEach((g) => {
    const w = `${P}.${g.id}`;
    if (allIds.has(g.id)) err(w, 'duplicate id'); allIds.add(g.id);
    if (!(g.topic in topics)) err(w, `unknown topic ${g.topic}`); else topicUse[g.topic]++;
    if (![1, 2, 3].includes(g.level)) err(w, 'level must be 1|2|3');
    if (typeof g.make !== 'function') { err(w, 'make must be a function'); return; }
    if (g.formula && !FORMULAS.byId[g.formula]) err(w, `unknown formula ${g.formula}`);
    let nulls = 0;
    curGen = g.id;
    for (let s = 1; s <= SEEDS; s++) {
      let q;
      try { q = g.make(makeRng(s * 2654435761)); }
      catch (e) { err(w, `make threw on seed ${s}: ${e.message}`); break; }
      if (!q) { nulls++; continue; }
      const before = errors.length;
      checkQuestion(`${w}#${s}`, q, pack, true);
      if (errors.length - before > 3) break; // avoid flooding
    }
    if (nulls > SEEDS * 0.02) err(w, `make returned null ${nulls}/${SEEDS} times`);
    if ((coincidences[g.id] || 0) > SEEDS * 0.1) err(w, `a mistake equals the answer in ${coincidences[g.id]}/${SEEDS} runs`);
    nGen++;
  });
  Object.entries(topicUse).forEach(([t, c]) => { if (c === 0) warn(P, `topic ${t} has no questions`); });
  // lessons: every lesson is used by a node; TI-Nspire coverage of calculation questions
  const lessonIds = Object.keys(pack.lessons || {});
  lessonIds.forEach((id) => { if (!pack.nodes.some((n) => n.kind === 'lesson' && n.lesson === id)) warn(P, `lesson ${id} is not on the route`); });
  let genTI = 0, genNum = 0;
  (pack.generators || []).forEach((g) => { let q = null; try { q = g.make(makeRng(12345)); } catch (e) { /* reported above */ } if (q && (q.kind || 'num') === 'num') { genNum++; if (q.ti) genTI++; else if (REQUIRE_TI) err(`${P}.${g.id}`, 'calculation generator has no TI-Nspire method (ti)'); } });
  const t = tiStats[P] || { calc: 0, ti: 0, missing: [] };
  if (REQUIRE_TI) t.missing.forEach((w) => err(w, 'calculation question has no TI-Nspire method (ti)'));
  summary.push(`${P.padEnd(4)} floor ${pack.floor}  static ${String(nStatic).padStart(3)} (A ${secA}, B ${secB}; L1 ${byLevel[1]} L2 ${byLevel[2]} L3 ${byLevel[3]})  generators ${String(nGen).padStart(2)}  nodes ${pack.nodes.length}  lessons ${lessonIds.length}  TI ${t.ti + genTI}/${t.calc + genNum}  pictures ${(vizStats[P] || { pic: 0 }).pic}/${(vizStats[P] || { learn: 0 }).learn}`);
}

console.log(summary.join('\n'));
if (warns.length) console.log(`\n${warns.length} warnings:\n  ` + warns.slice(0, 60).join('\n  '));
if (errors.length) {
  // group by question (drop the seed) so one broken generator shows once
  const groups = new Map();
  errors.forEach((e) => { const key = e.split(':')[0].replace(/#\d+/, '').replace(/\.(why|q|steps\[\d+\]|choices\[\d+\]|mistakes\[\d+\]\.why|table.*|givens\[\d+\]|briefing\[\d+\]\[\d+\])$/, ''); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(e); });
  console.log(`\n${errors.length} ERRORS in ${groups.size} places:`);
  for (const [k, list] of groups) console.log(`  [${list.length}×] ${list[0]}`);
  process.exit(1);
}
console.log('\nAll packs valid.');
