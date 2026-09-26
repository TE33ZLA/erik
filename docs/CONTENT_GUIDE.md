# Content guide — writing a floor pack

Each floor of the tower is one file in `js/data/` (`w1.js`, `w2.js`, …). A pack calls
`registerPack({...})` and contains the study notes, the battle map, the enemies, the
question bank and the mini-games for that week. `js/data/w1.js` is the reference example.

## Rules that matter most

1. **Accuracy first.** Every number must come from `FIN.*` (see `js/lib/fin.js`) or be checked
   in Node. Wrong answers in a study game are worse than no game.
2. **Follow BFC2140 conventions**, not generic textbook ones:
   - Profitability index is `PI = NPV / initial investment`; accept if `PI > 0`, rank by PI.
   - Annuities are **ordinary** (end of period) unless the question says otherwise.
   - Perpetuity / annuity / growing-perpetuity formulas value cash flows **one period before
     the first cash flow**.
   - Historical (sample) variance and covariance divide by `T − 1`; probability versions use `P_k`.
   - Trade credit: `EAR = (1 + d/(1−d))^(365/(net − discount days)) − 1`, 365-day year unless stated.
   - NWC is recovered 100% at the end of a project unless stated.
   - Sunk costs and financing costs (interest) are excluded from project cash flows;
     opportunity costs and side effects (cannibalisation) are included.
3. **All maths in LaTeX.** Inline maths: `\( ... \)`. Display maths: `\[ ... \]`.
   A plain `$` in prose is a dollar sign. Inside maths write `\$`.
   Use `{,}` for thousands separators inside maths (`L.money` does this for you).
4. **Dyslexia-friendly writing.** Short sentences. One idea per sentence. Put the key term in
   `**bold**`. Avoid italics, walls of text, double negatives, and ALL CAPS sentences.
   Keep question stems under ~60 words where possible. Use `\n` for a line break.
5. Write strings with `String.raw` (the packs alias it as `R`) so LaTeX backslashes stay single:
   ``R`The EAR is \(\left(1+\frac{APR}{m}\right)^{m}-1\).` ``

## Pack shape

```js
registerPack({
  id: 'w1', floor: 1, week: 'Week 1',
  title: 'The Clock Tower',               // floor name shown in the tower
  topic: 'Time value of money I',          // syllabus name
  color: '#2f7de1',                        // floor accent (must read on light and dark)
  icon: '⏳',                               // one emoji badge for the floor
  intro: 'One or two sentences of story when you arrive.',
  briefing: [ { h: 'Heading', points: ['bullet with \\(maths\\)', '...'] } ],  // study notes
  topics: { fv: 'Future value (lump sum)', ... },   // topic id -> label (used for stats)
  nodes: [ ...map nodes... ],
  questions: [ ...static questions... ],
  generators: [ ...question generators... ],
});
```

### Map nodes

```js
{ id: 'w1-1', kind: 'battle', name: 'The Lobby', topics: ['fv', 'pv'], n: 6, enemy: ENEMY }
{ id: 'w1-boss', kind: 'boss', name: 'Chronos', topics: '*', n: 10, enemy: ENEMY }
{ id: 'w1-m1', kind: 'mini', name: 'Decision Dash', mini: MINI }
```
`n` = number of questions. Bosses use all topics (`'*'`), prefer harder questions and unlock
questions flagged `boss: true`. Aim for 3–4 battles, 1–2 minis and 1 boss per floor.

### Enemies

```js
{
  name: 'Compound Slime', title: 'Grows on its own interest',
  body: 'blob',        // blob | ghost | box | coin | spiky | tall | round
  color: '#7cc85a',    // body colour
  acc: ['antenna'],    // accessories: tophat crown horns monocle glasses shades bowtie tie pirate
                       //   antenna halo cap bandana mustache wizard hardhat headset leaf
  mouth: 'grin',       // grin | fangs | smirk | o | flat | tongue   (optional)
  eyes: 2,             // 1 | 2 | 3 (optional)
  item: '💰',          // optional emoji the enemy holds
  lines: {             // speech bubbles (short!)
    intro: 'Line when the battle starts',
    hit: ['said when YOU answer correctly', '...'],
    taunt: ['said when you answer wrong', '...'],
    win: 'said when the enemy is defeated',
    lose: 'said when you run out of hearts',
  },
}
```

### Static questions

```js
{
  id: 'w1-q01',                 // unique across the whole game
  topic: 'ear',                 // must be a key of `topics`
  kind: 'mcq',                  // mcq | tf | num
  level: 1,                     // 1 easy, 2 medium, 3 hard
  section: 'A',                 // A = concept (MST Section A), B = calculation (Section B)
  q: R`Question text with \(maths\).`,
  choices: ['...', '...', '...', '...'],  // mcq only; first-listed order is shuffled by the engine
  answer: 0,                    // mcq: index of correct choice; tf: true/false; num: the number
  unit: '$', dp: 2,             // num only (see units below)
  why: R`Short explanation of the right answer (1–3 sentences).`,
  wrong: { 1: 'Why choice 1 is tempting but wrong', 2: '...' },   // optional, mcq
  steps: [R`Step 1 ...`, R`Step 2 \[...\]`],                         // optional worked solution
  formula: 'ear',               // optional Formula Codex card id (js/data/formulas.js)
  src: 'MST 2026 Q1',           // optional source tag
  boss: true,                   // optional: only in boss fights / exam arena
  // optional visual aids (see "Visual aids")
}
```

### Generators (random numbers every time)

```js
{
  id: 'w1-g-fv', topic: 'fv', level: 1, section: 'B', formula: 'fv-lump',
  make(rng) {
    const pv = rng.step(1000, 20000, 500), r = rng.step(0.03, 0.10, 0.005), n = rng.int(3, 15);
    const fv = FIN.fv(pv, r, n);
    return {
      q: R`${rng.person()} invests ${T.moneyT(pv)} today at ${T.pctT(r)} p.a. ... How much ...?`,
      givens: [['PV', L.moneyT(pv)], ['r', L.pctT(r)], ['n', `${n}`]],   // LaTeX label/value pairs
      answer: fv, unit: '$', dp: 2,
      mistakes: [ { v: pv * (1 + r * n), why: 'That is simple interest …' } ],
      steps: [ R`\[FV_n = PV(1+r)^{n}\]`, R`\[FV_{${n}} = ${L.moneyT(pv)} \times (${L.onePlus(r)})^{${n}} = ${L.money(fv)}\]` ],
      calc: `${n} [N] · ${r * 100} [I/YR] · ${-pv} [PV] · 0 [PMT] · [FV]`,
      why: 'One sentence summary.',
    };
  },
}
```
- `make` may also return `kind: 'mcq'` (with `choices`, `answer`) or `kind: 'tf'` for concept
  questions with random numbers.
- `mistakes` are common wrong answers. They become the multiple-choice distractors and let the
  game diagnose a typed wrong answer. Give 2–4 of them, each with a one-sentence `why`.
- Units: `'$'`, `'%'` (answer in **percent units**, e.g. `12.68` not `0.1268`), `'yrs'`, `'days'`,
  `'units'`, `'x'` (a plain ratio or multiple), `''` (plain number), `'$m'` (millions of dollars).
- `ti` gives the **TI-Nspire CX CAS** method (the player's calculator). See the next section. Every
  calculation question needs one.
- `calc` shows HP10bII+ keystrokes (kept for players who pick the HP in Settings). Put keys in square
  brackets: `[N] [I/YR] [PV] [PMT] [FV] [CFj] [NPV] [IRR/YR]`.

### Visual aids (optional, on static or generated questions)

```js
// cash-flow timeline: either a dense list of labels/values…
tl: { cfs: [-1000, 300, 300, '?'], unit: 'Year', hi: [3] }
// …or a sparse form for long timelines (ticks 0..n, middle ticks compressed when n > 12)
tl: { n: 20, at: { 0: '−$5,000', 20: '?' }, unit: 'Year', hi: [20], labels: { 0: '2026', 20: '2046' } }
// numbers are shown as money; strings are shown as written. hi = ticks to highlight.
table: { head: ['Year', 'Project L'], rows: [[0, '−$100'], [1, '$10']] }
chart: { type: 'npv', projects: [{ name: 'L', cfs: [-100, 10, 60, 80] }], rMax: 0.3 }
chart: { type: 'sml', rf: 0.05, rm: 0.11, points: [{ name: 'A', beta: 1.2, er: 0.14 }] }
tree: { t: 'decision', label: 'Invest?', kids: [ { edge: 'Invest −$500k', node: { t: 'chance', kids: [
        { edge: '33%', node: { t: 'end', label: '$1.25m at t = 1' } } ] } } ] }
```

### Mini-games

`kind: 'mini'` nodes name a mini-game: `{ id: 'w1-m1', kind: 'mini', name: 'Decision Dash', mini: 'decision-dash' }`,
and the pack's `minis` object holds it: `minis: { 'decision-dash': { game: 'rapid', … } }`.
`game: 'rapid'` is a fast sorting game:

```js
'decision-dash': {
  game: 'rapid', title: 'Decision Dash', intro: 'Sort each decision.',
  bins: [ { id: 'inv', label: 'Investment' }, { id: 'fin', label: 'Financing' } ],
  items: [ { t: 'Build a new factory', bin: 'inv', why: 'Buying a real asset.' } ],
  gen(rng) { return { t: '...', opts: ['6 yrs', '9 yrs', '12 yrs'], a: 1, why: '...' }; }, // optional
  rounds: 12, seconds: 12,
}
```
Built-in games need no items, just `{ game, title, intro, rounds, seconds }`:
- `game: 'timeline'` — "Timeline Tapper": the player taps the tick where an annuity/perpetuity
  formula places its value (one period before the first cash flow, etc.). Items are generated.
- `game: 'sml'` — "SML Sniper": stocks appear on a Security Market Line chart; the player marks
  each as undervalued (buy, above the line) or overvalued (sell, below the line). Items are generated.

Validation: `KATEX_PATH=<path to katex> node tests/validate.js --only w2,w3` checks just those packs.


## TI-Nspire CX CAS methods (`ti`)

The player solves questions on a **TI-Nspire CX CAS**. Every calculation question (static or
generated) and every worked example in a lesson carries a `ti` method: a list of steps. The game
draws each step as a calculator screen and computes every result with the emulator in
`js/lib/nspire.js`, so what the player sees always matches the maths. `tests/validate.js` runs
every method and checks that its **last result equals the question's answer**.

Build steps with the `TI` helpers (a global, like `FIN`):

```js
TI.solver({ N: 5, I: 6, PV: -1000, Pmt: 0, PpY: 1, CpY: 1 }, 'FV')   // Finance Solver screen, solve FV
TI.cmd('tvmFV', [5, 6, -1000, 0, 1, 1])      // types tvmFV(5,6,-1000,0,1,1)
TI.cmd('npv', [10, -1000, [300, 400, 500]])  // arrays become lists: npv(10,-1000,{300,400,500})
TI.line('1000*1.06^5')                       // any line, written out in full
TI.line(`nSolve(1000*(1+r)^5=1500,r)`, { pct: true })  // pct: the result is a decimal; the answer is a %
TI.say(R`Then divide by \(1{,}000\).`)       // a tip in words (LaTeX allowed)
// any step can also carry note: 'text shown under the step'
```

Rules (these match the real calculator):

1. **Signs.** Money you pay out is negative, money you receive is positive (the same as the HP).
   A loan you receive is `PV > 0` and its payments are `Pmt < 0`.
2. **Rates are percentages.** `I = 6` means 6%. `npv(10, …)` uses 10%. `irr`, `tvmI`, `eff`, `nom`
   return percentages.
3. **Always give PpY and CpY** in `tvm…` commands (`…,12,12` for monthly). The TI's default CpY is 1,
   which would treat the rate as an effective annual rate. `TI.solver` fills in `PpY = CpY = 1` if
   you leave them out.
4. **PmtAt**: `'END'` (ordinary annuity, the default) or `'BEGIN'` (annuity due). In `tvm…`
   commands add a seventh value `1` for BEGIN.
5. **Pick the simplest tool** for the question:
   - one lump sum, an annuity, a loan, a bond: the **Finance Solver** (`TI.solver`) or a `tvm…` line;
   - uneven cash flows, NPV, IRR: `npv(rate, CF0, {CF1,…}[, {counts}])`, `irr(CF0, {CF1,…})`;
   - payback: `cumulativeSum({CF0,CF1,…})` then read where it turns positive;
   - APR ↔ EAR: `eff(APR%, m)`, `nom(EAR%, m)`;
   - anything with one unknown (a rate in a growing annuity, the growth rate in a DDM, a crossover
     rate): `nSolve(equation, x)` — for rates the result is a decimal, so use `{ pct: true }`;
   - statistics: store lists with `→` (`{0.08,0.15,-0.12}→x`), then `mean(x)`, `stDevSamp(x)`,
     `varSamp(x)`, `sum(p*r)` for expected values, `sum((x-mean(x))*(y-mean(y)))/(dim(x)-1)`
     for a sample covariance;
   - plain arithmetic (a perpetuity, a DDM price, an after-tax cash flow): type the formula,
     e.g. `TI.line('2.7/(0.13-0.055)')`.
6. The emulator understands: `+ - * / ^ ( ) { }`, implicit multiplication (`2x`), `%`, `√`, `e`,
   `ans`, `→` and `:=`, `tvmFV tvmPV tvmPmt tvmN tvmI npv irr eff nom sum dim mean stDevSamp
   stDevPop varSamp varPop max min cumulativeSum sqrt ln log exp abs round approx nSolve solve`,
   and `solve(…)|r>0`. Anything else is an error, and the validator reports it.
7. Keep methods short: 1–3 steps. A multi-step method can use `ans` (the previous result) or
   stored letters.

## Lessons (teach from zero)

The player may know **nothing** about finance. Every floor teaches its topics in short lessons
before the battles that test them. A lesson is a node on the route plus an entry in `lessons`:

```js
nodes: [
  { id: 'w1-L1', kind: 'lesson', name: 'Why money has a time value', lesson: 'w1-L1' },
  { id: 'w1-1', kind: 'battle', … },          // the battle right after the lesson it needs
],
lessons: {
  'w1-L1': {
    title: 'Why money has a time value',
    goal: R`Explain why \$1 today is worth more than \$1 next year, and draw a timeline.`,
    topics: ['tvm'],                  // topic ids the lesson teaches (shown as chips)
    cards: [ …6–12 cards… ],
  },
},
```

Card kinds (one idea per card; the player sees one card at a time):

```js
{ kind: 'learn', title: 'A dollar today', body: R`Paragraph one.\n\nParagraph two.`,
  points: ['optional bullet', '…'], tip: 'optional tip', formula: 'fv-lump',   // optional codex card
  tl: {…} | table: {…} | chart: {…} | tree: {…},                              // optional visual
  ti: [ …TI steps… ] }                                                         // optional
{ kind: 'example', title: 'Worked example', q: R`The problem`, steps: [R`Step 1 …`, R`Step 2 …`],
  answer: R`The answer in one sentence`, ti: [ …TI steps… ] }   // steps appear one at a time
{ kind: 'ti', title: 'On your TI-Nspire', body: R`What the screen does`, ti: [ … ] }
{ kind: 'check', q: { kind: 'mcq' | 'tf' | 'num', q, choices, answer, unit, dp, why, mistakes, steps, ti, hint } }
{ kind: 'check', ref: 'w1-q05' }       // or reuse a static question of this pack
{ kind: 'check', gen: 'w1-g-fv' }      // or a generator (fresh numbers each time)
{ kind: 'guided', title: 'Your turn', q: R`A problem`, parts: [
    { ask: R`Step 1: what is \(n\)?`, answer: 5, unit: '', dp: 0, hint: 'Count the years.', why: 'Five years.' },
    { ask: R`Step 2: which formula?`, choices: ['…', '…', '…'], answer: 1, hint: '…', why: '…' },
    { ask: R`Step 3: what is the future value?`, answer: 1338.23, unit: '$', dp: 2, hint: '…', why: '…' },
  ], answer: R`Summary`, ti: [ … ] }
{ kind: 'recap', title: 'Remember', points: [R`…`, R`…`], formula: 'fv-lump' }
```

How to write a lesson for a beginner:

1. **Assume zero knowledge.** Define every term the first time it appears (in **bold**), with an
   everyday example before the formula. Never use a word from later in the course without
   explaining it.
2. **One idea per card, 2–5 short sentences.** Split long explanations into more cards.
3. **Concrete before abstract:** a story with numbers, then the general formula, then what each
   letter means (use the formula card).
4. **Show, then do.** Every formula gets a worked `example` (steps revealed one at a time), then the
   same problem on the **TI-Nspire**, then a `check` or `guided` card with new numbers.
5. **Checks test the idea just taught**, not something new. Give each a `why`, and for numeric
   checks 1–3 `mistakes` for the classic slips.
6. End with a `recap` card: the 3–5 things to remember, and the exam trap to avoid.
7. A lesson is 6–12 cards (about 5 minutes). Aim for one lesson per battle, placed right before it.

## Pictures (`viz`)

Players are dyslexic, so every **learn** card should carry a picture that *explains* its idea. A picture is not
decoration: it shows the mechanism in the words above it (money growing, money moving back in time, one bar split into
tax and profit, two things compared). The picture sits under the card's paragraphs; its caption says what to notice.

Add `viz` to a card (or a question): one spec, or a list of up to 3 specs that sit side by side (they stack on phones).
Mark the lesson's most important picture with `key: true`: the recap card shows it again under "The picture to remember".
Drawn by `js/lib/viz.js`; checked by `tests/validate.js`, which fails on any learn card without a picture
(`REQUIRE_VIZ=0` turns that off while drafting).

Rules:

- **Caption** (`cap`, required): one short sentence of what to notice, plain words, LaTeX for maths, 20 words at most.
  "The aqua part is **interest on interest**. It grows every year." Never repeat the card's paragraph.
- **Numbers must be right.** Compute them in code from the same inputs as the text (the pack files are JavaScript), for
  example `bars: [0, 1, 2, 3].map((t) => ({ label: 'Year ' + t, v: 1000 * 1.08 ** t }))`.
- **Colours keep one meaning** across the game: `1` blue = the starting amount or money now; `2` orange = interest, growth,
  the extra, the cost; `3` aqua = the result or the new thing; `'good'` / `'bad'` = accept / reject, cash in / cash out,
  gain / loss; `'grey'` = context. Use at most three of 1-5 in one picture.
- **Chart labels are plain text** (SVG cannot show KaTeX). `^{5}`, `_{E}`, `\times`, `\$` and `{,}` are converted for you;
  anything else is an error. Keep category labels short (one or two short words) and charts to 6 bars or fewer, so they
  fit a phone. HTML pictures (`flow`, `compare`, `cards`, `split`, `pie` legends, `anatomy`) take full rich text and LaTeX.
- `[[ctrl]]` in rich text draws a calculator key.
- Check it: `node tools/lesson-pics.js w1 w1-L3` writes a screenshot of every picture in that lesson at desktop and
  phone width (see the file for options). Look at both.

Pick the type from the idea:

| The idea | Type |
|---|---|
| an amount growing, shrinking, or split into parts over years; comparing sizes | `bars` (stack `parts` to show what the extra is made of) |
| money moving between dates (compounding forward, discounting back), periods to count | `tl` with `moves` / `spans` |
| a relationship: price vs yield, NPV vs rate, cost vs units, risk vs number of shares | `lines` (`marks`, `vlines`, `hlines`, `shade`) |
| how two things move together | `scatter` (up to 3 side by side) |
| spread / risk | `bell` |
| a total built from pluses and minuses (FCF, NPV build-up) | `waterfall` |
| per cent, probability, weights | `grid100`, `split`, `pie` |
| a formula | `anatomy` (colour each symbol, say what it means) |
| a rule or a process in steps; a conversion | `flow` (`op: true` for × ÷ = between boxes) |
| two choices, before/after, right vs wrong | `compare` (`mark: 'good'` / `'bad'`) |
| a list of 2-6 separate ideas (traps, reasons, types) | `cards` (last resort: prefer a real diagram) |
| benefits against costs; a fair price | `balance` |
| one thing up, the other down | `seesaw` |
| a repeating process (cash cycle) | `cycle` |
| a decision rule with a cut-off (accept if IRR > k) | `numline` (`zones`, `marks`) |
| what the calculator screen shows | `tiscreen` |
| a decision tree, a table, an NPV profile, the SML | `tree`, `table`, `npv`, `sml` |

One example of each (see `js/lib/viz.js` for every field):

```js
viz: { type: 'bars', fmt: '$', cap: 'The aqua part is **interest on interest**. It grows every year.',
  bars: [0, 1, 2, 3].map((t) => ({ label: t ? 'Year ' + t : 'Today', parts: [{ v: 1000, c: 1 }, { v: 80 * t, c: 2 }, { v: 1000 * (1.08 ** t - 1) - 80 * t, c: 3 }] })),
  keys: [{ c: 1, label: 'Your $1,000' }, { c: 2, label: 'Interest on the $1,000' }, { c: 3, label: 'Interest on interest' }] }
viz: { type: 'bars', fmt: '$', sign: true, line: { v: 0, label: 'Paid back' }, cap: '…',
  bars: [['Start', -1000], ['Yr 1', -600], ['Yr 2', -250], ['Yr 3', 50]].map(([label, v]) => ({ label, v })) }
viz: { type: 'tl', cfs: [-1000, 300, 400, 500], moves: [{ from: 3, to: 0, label: '÷ 1.1^3', c: 2 }], spans: [{ from: 0, to: 3, label: 'n = 3 periods' }], dim: [], cap: '…' }
viz: { type: 'lines', x: { label: 'Market rate', fmt: '%' }, y: { label: 'Bond price', fmt: '$' },
  series: [{ name: '10-year bond', c: 1, pts: [[2, 1359], [6, 1000], [10, 754]] }], marks: [{ x: 6, y: 1000, label: 'Par' }], cap: '…' }
viz: [{ type: 'scatter', title: 'Positive', sets: [{ c: 1, fit: true, pts: [[1, 2], [2, 3], [3, 4]] }], cap: '…' }, /* up to 3 */]
viz: { type: 'bell', fmt: '%', curves: [{ mean: 10, sd: 5, name: 'Low risk', c: 1 }, { mean: 10, sd: 15, name: 'High risk', c: 2 }], band: true, cap: '…' }
viz: { type: 'waterfall', fmt: '$', steps: [{ label: 'EBIT', v: 500, total: true }, { label: 'Tax', v: -150 }, { label: 'Add dep.', v: 100 }, { label: 'Capex', v: -200 }, { label: 'FCF', total: true }], cap: '…' }
viz: { type: 'grid100', parts: [{ n: 25, c: 2, label: '25 out of 100 = 25%' }], cap: '…' }
viz: { type: 'split', total: 'Each \\(\\$1\\) of profit', fmt: '$', dp: 2, parts: [{ label: 'Tax (30%)', v: 0.3, c: 'bad' }, { label: 'You keep', v: 0.7, c: 3 }], cap: '…' }
viz: { type: 'split', scale: 'abs', fmt: '%', rows: [{ label: 'One share', parts: [{ label: 'Market risk', v: 20, c: 1 }, { label: 'Company risk', v: 25, c: 2 }] }, { label: '30 shares', parts: [{ label: 'Market risk', v: 20, c: 1 }, { label: 'Company risk', v: 3, c: 2 }] }], cap: '…' }
viz: { type: 'pie', arrow: '=', pies: [{ title: 'All equity', center: '$10m', parts: [{ label: 'Equity', v: 10, c: 1, show: '$10m' }] }, { title: 'Half debt', center: '$10m', parts: [{ label: 'Equity', v: 5, c: 1 }, { label: 'Debt', v: 5, c: 2 }] }], cap: '…' }
viz: { type: 'anatomy', tex: '\\colA{FV} = \\colB{PV} \\times (1 + \\colC{r})^{\\colD{n}}', cap: '…',
  parts: [{ sym: 'FV', say: 'future value: what it grows to' }, { sym: 'PV', say: 'what you put in today' }, { sym: 'r', say: 'the rate for one period' }, { sym: 'n', say: 'the number of periods' }] }
viz: { type: 'flow', steps: [{ t: '\\(25\\%\\)', s: 'a percentage', icon: '💯' }, { t: '\\(0.25\\)', s: 'a decimal', c: 3 }], links: ['\\(\\div 100\\)'], cap: '…' }
viz: { type: 'flow', op: true, steps: [{ t: '\\(1.1\\)' }, { t: '\\(1.1\\)' }, { t: '\\(1.21\\)', c: 2 }], links: ['\\(\\times\\)', '\\(=\\)'], cap: '…' }
viz: { type: 'compare', items: [{ icon: '💵', title: 'Today', big: '\\(\\$100\\)', points: ['Can earn interest now'], mark: 'good', markText: 'Worth more' }, { icon: '⏳', title: 'In one year', big: '\\(\\$100\\)', points: ['You wait'] }], cap: '…' }
viz: { type: 'cards', items: [{ icon: '🔀', t: 'Multiple IRRs', s: 'Signs change twice' }, { icon: '📏', t: 'Scale', s: 'Small project, big IRR' }], cap: '…' }
viz: { type: 'balance', tilt: 'left', left: { icon: '💰', label: 'PV of cash in', sub: '$1,200', c: 'good' }, right: { icon: '🏗️', label: 'Cost today', sub: '$1,000', c: 'bad' }, note: 'NPV = +\\(\\$200\\)', cap: '…' }
viz: { type: 'seesaw', down: 'right', left: { icon: '📈', label: 'Interest rates' }, right: { icon: '💵', label: 'Bond prices' }, cap: '…' }
viz: { type: 'cycle', center: 'Operating\ncycle', steps: [{ t: 'Buy stock', icon: '📦' }, { t: 'Sell on credit', icon: '🧾' }, { t: 'Collect cash', icon: '💰' }], cap: '…' }
viz: { type: 'numline', min: 0, max: 30, fmt: '%', zones: [{ from: 0, to: 12, c: 'bad', label: 'Reject' }, { from: 12, to: 30, c: 'good', label: 'Accept' }], marks: [{ v: 12, label: 'k = 12%', c: 1 }, { v: 18, label: 'IRR = 18%', c: 2 }], cap: '…' }
viz: { type: 'tiscreen', lines: [{ in: '3/8', out: '3/8' }, { say: 'Press [[ctrl]] [[enter]] for a decimal:' }, { in: '3/8', out: '0.375' }], cap: '…' }
```

`fmt` for numbers: `'$'` money, `'%'` percentage points (write `8.5` for 8.5%), `'x'` times, otherwise a plain number;
`dp` fixes the decimals.
