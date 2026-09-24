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
for (const f of ['js/lib/fin.js', 'js/lib/fmt.js', 'js/lib/render.js', 'js/lib/qcore.js', 'js/data/formulas.js', 'js/data/registry.js']) require(path.join(ROOT, f));
const packFiles = fs.readdirSync(path.join(ROOT, 'js/data')).filter((f) => /^w[\dx]+\.js$/.test(f)).filter((f) => !ONLY || ONLY.has(f.replace('.js', ''))).sort();
for (const f of packFiles) require(path.join(ROOT, 'js/data', f));

const { PACKS, FORMULAS, RENDER, makeRng, QCORE } = globalThis;
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
function checkVisuals(where, q) {
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
    if (!['battle', 'boss', 'mini'].includes(n.kind)) err(w, `bad kind ${n.kind}`);
    if (n.kind === 'mini') {
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
  summary.push(`${P.padEnd(4)} floor ${pack.floor}  static ${String(nStatic).padStart(3)} (A ${secA}, B ${secB}; L1 ${byLevel[1]} L2 ${byLevel[2]} L3 ${byLevel[3]})  generators ${String(nGen).padStart(2)}  nodes ${pack.nodes.length}`);
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
