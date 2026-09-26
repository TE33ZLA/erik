/* Floor 5 — Week 5: Capital budgeting II — cash flow analysis and the replacement decision. */
(function (root) {
  'use strict';
  const { FIN, L, T, FMT, TI } = root;
  const R = String.raw;
  /** money for workings: whole dollars without cents, otherwise 2 decimals */
  const M = (x) => (Math.abs(x - Math.round(x)) < 0.005 ? L.money(Math.round(x), 0) : L.money(x));
  const P = (r) => +(r * 100).toFixed(8); // decimal rate -> percent units for answers

  /* ---------- helpers (local to this pack) ---------- */
  const sum = (a) => a.reduce((s, x) => s + x, 0);
  const cell = (x) => T.money(x, 0);
  const keyNum = (x) => (x < 0 ? '−' : '') + String(+Math.abs(x).toFixed(2));
  const rateKey = (r) => T.numT(r * 100);
  const round = (x, step) => Math.round(x / step) * step;
  /** drop distractors that are not finite or would display the same as the answer or each other */
  function clean(ms, ans, unit, dp) {
    const seen = new Set([FMT.answerText(ans, unit, dp)]);
    return ms.filter((m) => {
      if (!Number.isFinite(m.v)) return false;
      const d = FMT.answerText(m.v, unit, dp);
      if (seen.has(d)) return false;
      seen.add(d);
      return true;
    });
  }
  function cfKeys(cfs) {
    const parts = ['[C ALL]', `${keyNum(cfs[0])} [CFj]`];
    for (let i = 1; i < cfs.length;) {
      let j = i;
      while (j + 1 < cfs.length && Math.abs(cfs[j + 1] - cfs[i]) < 1e-9) j++;
      const cnt = j - i + 1;
      parts.push(`${keyNum(cfs[i])} [CFj]` + (cnt > 1 ? ` · ${cnt} [Nj]` : ''));
      i = j + 1;
    }
    return parts.join(' · ');
  }
  const npvKeys = (cfs, r, unit = '') => `${cfKeys(cfs)} · ${rateKey(r)} [I/YR] · [NPV] → ${T.num(FIN.npv(r, cfs), unit === 'm' ? 3 : 2)}`;
  const irrKeys = (cfs, irr) => `${cfKeys(cfs)} · [IRR/YR] → ${T.num(irr * 100)}`;
  /** TI-Nspire npv( ) / irr( ) arguments: CF0, the list, and a count list when a cash flow repeats 3+ times in a row */
  function cfArgs(cfs) {
    const vals = [], cnt = [];
    for (let i = 1; i < cfs.length;) {
      let j = i;
      while (j + 1 < cfs.length && Math.abs(cfs[j + 1] - cfs[i]) < 1e-9) j++;
      vals.push(cfs[i]); cnt.push(j - i + 1);
      i = j + 1;
    }
    return cnt.some((c) => c >= 3) ? [cfs[0], vals, cnt] : [cfs[0], cfs.slice(1)];
  }
  const tiNpv = (r, cfs, extra) => TI.cmd('npv', [P(r)].concat(cfArgs(cfs)), extra);
  const n6 = (x) => TI.num(x); // a number as typed on the TI-Nspire
  const esc = (s) => String(s).replace(/%/g, R`\%`).replace(/&/g, R`\&`);
  /** income-statement style block: rows of [label, value, lineAbove?] */
  function stmt(rows, fmt = (v) => M(v)) {
    return R`\[\begin{array}{lr} ${rows.map(([lab, v, line]) => (line ? R`\hline ` : '') + R`\text{${esc(lab)}} & ${fmt(v)}`).join(R` \\ `)} \end{array}\]`;
  }
  const mil = (v, dp = 3) => L.moneyT(v, dp) + R`\text{m}`;
  const annuityPV = (c, r, n) => R`${L.moneyT(c)} \times \frac{1}{${L.dec(r)}}\left(1 - \frac{1}{(${L.onePlus(r)})^{${n}}}\right)`;
  const TAX = [0.25, 0.3, 0.3, 0.3, 0.35, 0.4];

  /* ---------- course examples (computed once) ---------- */
  const NB = { tc: 0.47, init: -55000 + 15000 - (15000 - 10000) * 0.47 - 5000, ocf: (17000 + 4000 - 9000) * 0.53 + 9000 };
  NB.term = NB.ocf + 5000 + FIN.afterTaxSalvage(10000, 0, 0.47);
  NB.cfs = [NB.init, NB.ocf, NB.ocf, NB.ocf, NB.ocf, NB.term];
  const NB_TABLE = { head: ['Item', 'Details'], rows: [
    ['Tax rate', '47% (sole proprietor)'],
    ['Old machine', 'Bought 5 years ago for $20,000; 10-year life; straight-line to $0. Can be sold now for $15,000.'],
    ['Old running costs', 'Operator: $15,000 salary plus $2,000 benefits. Maintenance $7,000 and defects $3,000 a year.'],
    ['New machine', '$50,000 plus $3,000 shipping and $2,000 installation. Straight-line to $0 over 5 years. Salvage $10,000 in year 5.'],
    ['New running costs', 'No operator needed. Maintenance $2,000 and defects $4,000 a year.'],
    ['Working capital', 'Inventory rises by $5,000 now; recovered in year 5.'],
    ['Other facts', 'Staff training ($5,000) was paid 3 months ago for a similar machine. A $20,000 loan at 10% costs $2,000 a year.'],
    ['Required return', '20%'],
  ] };
  const SV = { fcf: (25500 - 8000 - 3000) * 0.7 + 3000 };
  SV.cfs = [-60000].concat(Array(20).fill(SV.fcf));
  const IFC = [-522500, 104000, 104000, 104000, 104000, 246500];
  const IFC_TABLE = { head: ['Item', 'Details'], rows: [
    ['Old unit', 'Cost $500,000; book value now $250,000; depreciated $50,000 a year. Can be sold today for $275,000.'],
    ['New unit', '$700,000 plus $50,000 shipping and installation. Straight-line to $0 over 5 years. Salvage $75,000 in year 5.'],
    ['Operations', 'Revenue up $100,000 a year. Operating costs down $20,000 a year.'],
    ['Working capital', '$40,000 now, plus $10,000 in each of years 1 to 4. All recovered in year 5.'],
    ['Financing', 'A $100,000 interest-only loan at 18% p.a.'],
    ['Tax and cost of capital', 'Tax 30%. Cost of capital 12%.'],
  ] };
  const CASE = { fcf: (30 - 18 - 1 - 2.5) * 0.65 + 2.5 };
  CASE.cfs = [-35].concat(Array(9).fill(CASE.fcf)).concat([CASE.fcf + 10]);
  const CASE_TABLE = { head: ['Consultant’s report', 'Each year, years 1 to 10'], rows: [
    ['Sales revenue', '$30.000m'], ['Cost of goods sold', '−$18.000m'], ['Gross profit', '$12.000m'], ['Selling, general and admin (SG&A)', '−$2.000m'],
    ['Depreciation', '−$2.500m'], ['Net operating income', '$7.500m'], ['Income tax (35%)', '−$2.625m'], ['Net income', '$4.875m'],
  ] };
  const EX2 = [-1000, 600, 650], EX2R = [-1000, 600 / 1.05, 650 / 1.05 / 1.05], EX2_REAL = FIN.fisherReal(0.14, 0.05);
  const EX3_REAL = FIN.fisherReal(0.15, 0.10);
  const OAK = FIN.fcf(160000, 60000, 36000, 0.3, 40000, 8000);

  /* ---------- lesson examples (fresh numbers, so the battles stay a real test) ---------- */
  const TRUCK = { rev: 120000, cost: 50000, dep: 20000, capex: 12000, dnwc: 5000, tc: 0.3 };
  TRUCK.ebit = TRUCK.rev - TRUCK.cost - TRUCK.dep;
  TRUCK.fcf = FIN.fcf(TRUCK.rev, TRUCK.cost, TRUCK.dep, TRUCK.tc, TRUCK.capex, TRUCK.dnwc);
  const PACK = { cost: 80000 + 4000 + 6000, n: 5, tc: 0.3, rev: 60000, opc: 25000 };
  PACK.dep = PACK.cost / PACK.n;
  PACK.ocf = FIN.ocf(PACK.rev, PACK.opc, PACK.dep, PACK.tc);
  const LINE = { price: 600000, n: 5, sv: 40000, nwc: 50000, rev: 500000, cost: 220000, tc: 0.3, k: 0.12 };
  LINE.dep = LINE.price / LINE.n;
  LINE.fcf = FIN.ocf(LINE.rev, LINE.cost, LINE.dep, LINE.tc);
  LINE.last = LINE.fcf + LINE.nwc + FIN.afterTaxSalvage(LINE.sv, 0, LINE.tc);
  LINE.cfs = [-(LINE.price + LINE.nwc)].concat(Array(LINE.n - 1).fill(LINE.fcf)).concat([LINE.last]);
  const PROJ3 = { price: 90000, n: 3, nwc: 10000, rev: 80000, cost: 30000, tc: 0.3, k: 0.1 };
  PROJ3.fcf = FIN.ocf(PROJ3.rev, PROJ3.cost, PROJ3.price / PROJ3.n, PROJ3.tc);
  PROJ3.cfs = [-(PROJ3.price + PROJ3.nwc), PROJ3.fcf, PROJ3.fcf, PROJ3.fcf + PROJ3.nwc];
  const INF = { cost: 7500, c: 3000, i: 0.04, nom: 0.12 };
  INF.real = FIN.fisherReal(INF.nom, INF.i);
  INF.npv = -INF.cost + FIN.pvAnnuity(INF.c, INF.real, 3);
  const INF2 = { cost: 20000, c: 8500, i: 0.05, nom: 0.155 };
  INF2.real = FIN.fisherReal(INF2.nom, INF2.i);
  INF2.npv = -INF2.cost + FIN.pvAnnuity(INF2.c, INF2.real, 3);
  const WW = { oldCost: 40000, oldLife: 8, age: 3, sale: 30000, price: 70000, inst: 5000, n: 5, salv: 10000, save: 22000, nwc: 4000, tc: 0.3, k: 0.1 };
  WW.dOld = WW.oldCost / WW.oldLife;
  WW.bv = WW.oldCost - WW.age * WW.dOld;
  WW.init = -(WW.price + WW.inst) + WW.sale - (WW.sale - WW.bv) * WW.tc - WW.nwc;
  WW.dNew = (WW.price + WW.inst) / WW.n;
  WW.dInc = WW.dNew - WW.dOld;
  WW.ocf = (WW.save - WW.dInc) * (1 - WW.tc) + WW.dInc;
  WW.term = WW.ocf + WW.nwc + FIN.afterTaxSalvage(WW.salv, 0, WW.tc);
  WW.cfs = [WW.init].concat(Array(WW.n - 1).fill(WW.ocf)).concat([WW.term]);

  root.registerPack({
    id: 'w5', floor: 5, week: 'Week 5',
    title: 'The Cash Flow Factory',
    topic: 'Capital budgeting II: cash flows and replacement decisions',
    color: '#c44569', icon: '🏭',
    intro: 'Welcome to the factory floor. Every machine here turns forecasts into free cash flows. Keep only the relevant ones, tax them properly, and Floor 6 is yours.',

    briefing: [
      { h: 'Free cash flow (FCF)', points: [
        R`We discount the **incremental, after-tax free cash flows** of a project.`,
        R`Add-back method: \(FCF = (Rev - Costs - Dep)(1 - t_c) + Dep - CapEx - \Delta NWC\).`,
        R`Tax-shield method: \(FCF = (Rev - Costs)(1 - t_c) + t_c \times Dep - CapEx - \Delta NWC\). Both give the same answer.`,
        R`**Incremental earnings** \(= (Rev - Costs - Dep)(1 - t_c)\). Earnings are not cash, so add depreciation back.`,
      ] },
      { h: 'Tax effects', points: [
        R`Every extra $1 of revenue adds \(\$(1 - t_c)\) to cash flow. Every extra $1 of cost removes \(\$(1 - t_c)\).`,
        R`Depreciation is **not cash**, but it cuts tax. **Depreciation tax shield** \(= Dep \times t_c\).`,
        R`With \(t_c = 30\%\): +$1 revenue → +$0.70; +$1 cost → −$0.70; +$1 depreciation → +$0.30.`,
      ] },
      { h: 'Depreciation, book value and salvage', points: [
        R`Straight-line: \(Dep = \frac{\text{Cost} - \text{Residual value for tax}}{\text{Depreciable life}}\). **Cost includes shipping and installation.**`,
        R`**Book value**: \(BV = \text{Cost} - \text{accumulated depreciation}\).`,
        R`\(\text{After-tax salvage} = SV - (SV - BV)\,t_c\). Sell above book value: pay tax on the gain. Sell below: save tax on the loss.`,
      ] },
      { h: 'Net working capital', points: [
        R`An **increase** in NWC is a cash **outflow**. A decrease is an inflow.`,
        R`NWC is not used up. In BFC2140 it is **recovered 100%** at the end, unless told otherwise.`,
      ] },
      { h: 'Relevant cash flows', points: [
        R`Ask: “Will this cash flow happen **only if** we accept the project?” Yes: include it. No: exclude it. Partly: include that part.`,
        R`Exclude **sunk costs**: money already spent (research, training, consultant fees).`,
        R`Exclude **allocated overheads**. Include only the **extra** overheads the project causes.`,
        R`Include **opportunity costs** (land you could sell or rent) and **side effects** (cannibalised sales).`,
        R`Exclude **financing costs** (interest). The discount rate already covers them, so including them double counts.`,
      ] },
      { h: 'Inflation', points: [
        R`Discount **nominal** cash flows at the **nominal** rate, and **real** cash flows at the **real** rate.`,
        R`Fisher: \(1 + r_{real} = \frac{1 + r_{nominal}}{1 + \text{inflation}}\).`,
        R`Real to nominal: \(CF^{nominal}_t = CF^{real}_t \times (1 + i)^{t}\). Done consistently, both ways give the same NPV.`,
      ] },
      { h: 'The replacement decision', points: [
        R`**Part 1, initial investment:** the new price, shipping and installation, minus the after-tax sale value of the old asset, plus the NWC increase.`,
        R`**Part 2, operating cash flows:** the incremental (new minus old) savings and revenues, taxed, plus the tax shield on the **incremental** depreciation (new minus old).`,
        R`**Part 3, terminal cash flow:** the last operating cash flow, plus the NWC recovered, plus the after-tax salvage.`,
        R`Replace if the NPV of the incremental cash flows is positive (or \(IRR > k\)).`,
      ] },
      { h: 'On your TI-Nspire CX CAS', points: [
        R`Type the FCF recipe as one line: \((120000 - 50000 - 20000) \times (1 - 0.3) + 20000 - 12000 - 5000\).`,
        R`After-tax salvage in one line: \(26000 - (26000 - 20000) \times 0.3\).`,
        R`Real rate: \(1.12 / 1.04 - 1\). Then \(\text{npv}(100 \times \text{ans}, \ldots)\) uses it as a percentage.`,
        R`Project NPV: \(\text{npv}(k, CF_0, \{CF_1, \ldots\}, \{\text{counts}\})\), e.g. \(\text{npv}(12, -650000, \{232000, 310000\}, \{4, 1\})\).`,
      ] },
    ],

    topics: {
      fcf: 'Free cash flow',
      tax: 'Tax effects and the depreciation tax shield',
      dep: 'Depreciation and book value',
      nwc: 'Net working capital',
      salvage: 'Salvage and terminal cash flow',
      relevant: 'Relevant (incremental) cash flows',
      inflation: 'Inflation: nominal vs real',
      replace: 'The replacement decision',
      project: 'Full project analysis',
    },

    nodes: [
      { id: 'w5-L1', kind: 'lesson', name: 'Profit is not cash', lesson: 'w5-L1' },
      { id: 'w5-L2', kind: 'lesson', name: 'Depreciation and its tax shield', lesson: 'w5-L2' },
      { id: 'w5-1', kind: 'battle', name: 'The Loading Dock', topics: ['fcf', 'tax', 'dep'], n: 6,
        enemy: { name: 'The Depreci-gator', title: 'Bites a chunk off your book value every year', body: 'spiky', color: '#4f9a4a', acc: ['shades'], mouth: 'fangs', item: '📉',
          lines: { intro: 'Snap! Every year I bite a chunk off your book value!', hit: ['You added me back? Snap…', 'A depreciation tax shield! My poor scales!'],
            taunt: ['Depreciation is paid in cash, right? Chomp!', 'Forgot to add me back? Delicious!'], win: 'Written down… to zero…', lose: 'Your book value is mine!' } } },
      { id: 'w5-L3', kind: 'lesson', name: 'Which cash flows count?', lesson: 'w5-L3' },
      { id: 'w5-L4', kind: 'lesson', name: 'Net working capital', lesson: 'w5-L4' },
      { id: 'w5-2', kind: 'battle', name: 'The Sorting Line', topics: ['relevant', 'nwc'], n: 6,
        enemy: { name: 'The Sunk Cost Spectre', title: 'Haunts you with money already spent', body: 'ghost', color: '#9aa5b8', acc: ['tophat'], mouth: 'o', item: '🧾',
          lines: { intro: 'Wooo… remember the market research you already paid for?', hit: ['You ignored me… I was sunk all along…', 'Only incremental cash flows? Wooo…'],
            taunt: ['Count the old research! It cost so much!', 'Add the loan interest! Twice is nice!'], win: 'I was… already gone…', lose: 'Your past costs haunt your NPV!' } } },
      { id: 'w5-m1', kind: 'mini', name: 'Cash Flow Sorter', mini: 'cf-sorter' },
      { id: 'w5-L5', kind: 'lesson', name: 'Selling an asset: after-tax salvage', lesson: 'w5-L5' },
      { id: 'w5-3', kind: 'battle', name: 'The Salvage Yard', topics: ['salvage', 'dep', 'nwc'], n: 6,
        enemy: { name: 'Scrap-Metal Sal', title: 'Sells old machines and forgets the tax', body: 'box', color: '#8c7b6b', acc: ['hardhat'], mouth: 'grin', item: '🔧',
          lines: { intro: 'Sold above book value? Tax? Never heard of it!', hit: ['You taxed the gain! Ouch!', 'You got your working capital back? Clever!'],
            taunt: ['Book value, market value, same thing!', 'Leave the working capital in the yard forever!'], win: 'Scrapped… at book value…', lose: 'Sold! No tax, no questions!' } } },
      { id: 'w5-L6', kind: 'lesson', name: 'Inflation: real and nominal', lesson: 'w5-L6' },
      { id: 'w5-L7', kind: 'lesson', name: 'A whole project, start to finish', lesson: 'w5-L7' },
      { id: 'w5-4', kind: 'battle', name: 'The Inflation Chamber', topics: ['inflation', 'project'], n: 6,
        enemy: { name: 'The Inflation Blimp', title: 'Puffs up every nominal number', body: 'round', color: '#e07a5f', acc: ['cap'], mouth: 'o', item: '🎈',
          lines: { intro: 'I puff up nominal cash flows! Mix me with a real rate, I dare you!', hit: ['Nominal with nominal? Pfffft…', 'The Fisher relation! My only weakness!'],
            taunt: ['Real cash flows at a nominal rate? Yum!', 'Mix them up! Mix them up!'], win: 'Deflating… deflating…', lose: 'Inflated your mistakes!' } } },
      { id: 'w5-m2', kind: 'mini', name: 'After-Tax Express', mini: 'after-tax' },
      { id: 'w5-L8', kind: 'lesson', name: 'The replacement decision', lesson: 'w5-L8' },
      { id: 'w5-boss', kind: 'boss', name: 'The Replacinator', topics: '*', n: 10,
        enemy: { name: 'The Replacinator', title: 'Out with the old, in with the NPV', body: 'tall', color: '#5a6f8c', acc: ['hardhat', 'glasses'], eyes: 1, mouth: 'flat', item: '⚙️',
          lines: { intro: 'Initial investment. Operating cash flows. Terminal cash flow. Get all three right or be scrapped!', hit: ['Incremental depreciation? Correct. Recalibrating…', 'Tax on the old machine’s sale? You remembered!'],
            taunt: ['ERROR: sunk cost detected in your cash flows!', 'Forgot the working capital recovery? Beep boop!'], win: 'System… replaced…', lose: 'You are obsolete!' } } },
    ],

    minis: {
      'cf-sorter': {
        game: 'rapid', title: 'Cash Flow Sorter', intro: 'Items roll down the line. Include the relevant cash flows in the project analysis. Exclude the rest.',
        bins: [{ id: 'inc', label: 'Include' }, { id: 'exc', label: 'Exclude' }],
        items: [
          { t: 'Shipping and installation of the new machine', bin: 'inc', why: 'It is part of the cost of getting the machine working.' },
          { t: 'Market research paid for last month', bin: 'exc', why: 'Sunk cost: it is spent whatever you decide.' },
          { t: 'Interest on the loan used to buy the machine', bin: 'exc', why: 'Financing cost: the discount rate already covers it.' },
          { t: 'Land the firm owns that could be sold instead', bin: 'inc', why: 'Opportunity cost: you give up the sale proceeds.' },
          { t: 'Lost sales of the firm’s existing product', bin: 'inc', why: 'Side effect (cannibalisation): it only happens because of the project.' },
          { t: 'Head-office overhead allocated to the project', bin: 'exc', why: 'It is paid anyway. Only extra overheads count.' },
          { t: 'Extra electricity the new line will use', bin: 'inc', why: 'An incremental cost caused by the project.' },
          { t: 'Extra inventory needed to run the project', bin: 'inc', why: 'An increase in NWC is a cash outflow.' },
          { t: 'Working capital recovered at the end', bin: 'inc', why: 'The NWC comes back as a cash inflow at the end.' },
          { t: 'After-tax salvage value of the new machine', bin: 'inc', why: 'Cash from selling the machine at the end, after tax.' },
          { t: 'Depreciation tax shield', bin: 'inc', why: R`Depreciation cuts tax: \(Dep \times t_c\) is real cash saved.` },
          { t: 'Depreciation, treated as a cash payment', bin: 'exc', why: 'Depreciation is not a cash outflow. Only its tax saving counts.' },
          { t: 'Tax on the gain from selling the old machine', bin: 'inc', why: 'Selling above book value creates tax to pay.' },
          { t: 'Consultant’s fee that is owed whatever you decide', bin: 'exc', why: 'Sunk: you owe it either way.' },
          { t: 'Staff training already done for a similar machine', bin: 'exc', why: 'Sunk: it has already been paid.' },
          { t: 'Salary saved when an operator is no longer needed', bin: 'inc', why: 'An incremental saving caused by the project.' },
          { t: 'Dividends paid to shareholders', bin: 'exc', why: 'A financing (payout) flow, not a project cash flow.' },
          { t: 'Rent given up by using the firm’s own warehouse', bin: 'inc', why: 'Opportunity cost: the rent is lost because of the project.' },
          { t: 'Cost of demolishing an old building on the site', bin: 'inc', why: 'You must pay it to start the project.' },
          { t: 'The price paid for the land 10 years ago', bin: 'exc', why: 'Sunk: only the land’s value today (opportunity cost) matters.' },
          { t: 'A new manager hired only for this project', bin: 'inc', why: 'An incremental cost: it exists only with the project.' },
          { t: 'The CEO’s salary, which will not change', bin: 'exc', why: 'Not incremental: it is paid either way.' },
          { t: 'Extra sales of a product that goes well with the new one', bin: 'inc', why: 'A positive side effect of the project.' },
          { t: 'Extra tax the firm pays next year because of the project', bin: 'inc', why: 'Taxes caused by the project are incremental cash flows.' },
        ],
        rounds: 12, seconds: 12,
      },
      'after-tax': {
        game: 'rapid', title: 'After-Tax Express', intro: 'Quick! How does each change move the free cash flow? Watch the tax.',
        gen(rng) {
          const tc = rng.pick([0.25, 0.3, 0.3, 0.35, 0.4]);
          const x = rng.step(1, 20, 1) * 1000;
          const sgn = (v) => R`\(${v < 0 ? '-' : '+'}${L.money(Math.abs(v), 0)}\)`;
          const pack = (t, correct, others, why) => {
            const opts = rng.shuffle([correct].concat(others)).map(sgn);
            return { t, opts, a: opts.indexOf(sgn(correct)), why };
          };
          const kind = rng.int(0, 5);
          const tax = R`\(t_c = ${L.pctT(tc)}\)`;
          if (kind === 0) return pack(R`Revenue rises by ${T.money(x, 0)}. ${tax}. Change in FCF?`, x * (1 - tc), [x, x * tc], R`Revenue is taxed: \(${L.money(x, 0)} \times (1 - ${L.dec(tc)})\).`);
          if (kind === 1) return pack(R`Costs rise by ${T.money(x, 0)}. ${tax}. Change in FCF?`, -x * (1 - tc), [-x, -x * tc], R`Costs are tax-deductible: \(-${L.money(x, 0)} \times (1 - ${L.dec(tc)})\).`);
          if (kind === 2) return pack(R`Depreciation rises by ${T.money(x, 0)}. ${tax}. Change in FCF?`, x * tc, [-x, x * (1 - tc)], R`The tax shield: \(${L.money(x, 0)} \times ${L.dec(tc)}\).`);
          if (kind === 3) return pack(R`Costs fall by ${T.money(x, 0)}. ${tax}. Change in FCF?`, x * (1 - tc), [x, x * tc], R`A saving is taxed like extra profit: \(${L.money(x, 0)} \times (1 - ${L.dec(tc)})\).`);
          if (kind === 4) return pack(R`Inventory must rise by ${T.money(x, 0)} at the start. Cash flow now?`, -x, [-x * (1 - tc), x], 'An increase in NWC is a cash outflow. It is not taxed.');
          const bv = rng.step(2, 20, 1) * 1000;
          let sv = rng.step(1, 25, 1) * 1000;
          if (sv === bv) sv += 1000;
          const ats = FIN.afterTaxSalvage(sv, bv, tc);
          return pack(R`Old machine sold for ${T.money(sv, 0)}. Book value ${T.money(bv, 0)}. ${tax}. After-tax cash?`, ats, [sv, sv * (1 - tc)],
            sv > bv ? R`Tax on the gain: \(${L.money(sv, 0)} - ${L.money(sv - bv, 0)} \times ${L.dec(tc)}\).` : R`Tax saved on the loss: \(${L.money(sv, 0)} + ${L.money(bv - sv, 0)} \times ${L.dec(tc)}\).`);
        },
        rounds: 12, seconds: 12,
      },
    },

    lessons: {
      'w5-L1': {
        title: 'Profit is not cash',
        goal: R`Turn a project’s profit into its free cash flow, step by step.`,
        topics: ['fcf'],
        cards: [
          { kind: 'learn', title: 'Profit and cash are different',
            body: R`**Profit** (also called **earnings**) is an accounting number. It counts a sale when it is made, and it spreads the cost of a machine over many years.\n\n**Cash flow** counts money when it really moves.\n\nIn capital budgeting we discount **cash flows**, never profits. Cash is what the owners can spend.`,
            viz: { type: 'compare', items: [
              { icon: '📒', title: 'Profit', points: ['Counts a sale when it is made', 'Spreads a machine’s cost over years'], c: 'grey', mark: 'bad', markText: 'Not discounted' },
              { icon: '💵', title: 'Cash flow', points: ['Counts money when it really moves', 'What the owners can spend'], c: 1, mark: 'good', markText: 'We discount this' }],
              cap: 'Two ways to count the same business. Capital budgeting always uses **cash**.' } },
          { kind: 'learn', title: 'Depreciation: a cost with no cash',
            body: R`A firm buys a $30,000 machine that lasts 3 years. All the cash leaves on day one.\n\nThe accounts spread the cost: $10,000 a year of **depreciation**. Depreciation lowers profit, but no cash leaves in years 1 to 3.`,
            viz: [
              { type: 'bars', title: R`Cash paid: \(\$30{,}000\) in year 0`, fmt: '$', values: false, max: 30000, c: 'bad', bars: [0, 1, 2, 3].map((t) => ({ label: 'Yr ' + t, v: t ? 0 : 30000 })),
                cap: 'All the cash leaves on day one.' },
              { type: 'bars', title: R`Depreciation: \(\$10{,}000\) a year`, fmt: '$', values: false, max: 30000, c: 2, bars: [0, 1, 2, 3].map((t) => ({ label: 'Yr ' + t, v: t ? 30000 / 3 : 0 })),
                cap: R`The accounts spread it: \(\$10{,}000\) a year, but no cash moves.` },
            ],
            table: { head: ['Year', 'Cash paid', 'Depreciation charged'], rows: [[0, '$30,000', '—'], [1, '$0', '$10,000'], [2, '$0', '$10,000'], [3, '$0', '$10,000']] } },
          { kind: 'learn', title: 'The free cash flow recipe', formula: 'fcf',
            body: R`The **free cash flow** (FCF) is the cash a project leaves for its lenders and shareholders:\n\n\[FCF = (Rev - Costs - Dep)(1 - t_c) + Dep - CapEx - \Delta NWC\]`,
            viz: { type: 'waterfall', fmt: '$', key: true, steps: [
              { label: 'EBIT', v: TRUCK.ebit, total: true },
              { label: 'Tax', v: -TRUCK.ebit * TRUCK.tc },
              { label: 'Add dep.', v: TRUCK.dep },
              { label: 'CapEx + NWC', v: -(TRUCK.capex + TRUCK.dnwc) },
              { label: 'FCF', total: true, c: 3 }],
              cap: 'The food truck (next card): tax comes off, depreciation goes back on, then CapEx and extra NWC come off.' },
            points: [R`\(Rev - Costs - Dep\) is **EBIT**: earnings before interest and tax.`, R`\(\times (1 - t_c)\) takes off the tax. \(t_c\) is the company tax rate.`, R`\(+ Dep\) adds depreciation back, because it was never paid in cash.`, R`\(- CapEx\) takes off **capital expenditure**: cash spent on machines and buildings.`, R`\(- \Delta NWC\) takes off any **increase in net working capital** (Lesson 4).`, R`Without CapEx and \(\Delta NWC\), the rest is the **operating cash flow** (OCF).`] },
          { kind: 'example', title: 'Worked example: one year of a food truck', q: R`In year 2 a food truck business has revenue of $120,000, costs of $50,000 and depreciation of $20,000. It spends $12,000 on a new fridge (CapEx), and its working capital rises by $5,000. The tax rate is 30%. What is the free cash flow?`,
            steps: [
              R`EBIT \(= \$120{,}000 - \$50{,}000 - \$20{,}000 = \$50{,}000\).`,
              R`Take off 30% tax: \(\$50{,}000 \times (1 - 0.30) = \$35{,}000\).`,
              R`Add back the \(\$20{,}000\) of depreciation. Then take off the \(\$12{,}000\) of CapEx and the \(\$5{,}000\) rise in NWC:`,
              stmt([['Revenue', TRUCK.rev], ['Costs', -TRUCK.cost], ['Depreciation', -TRUCK.dep], ['EBIT', TRUCK.ebit, 1], ['Tax at 30%', -TRUCK.ebit * TRUCK.tc], ['After-tax profit', TRUCK.ebit * (1 - TRUCK.tc), 1], ['Add back depreciation', TRUCK.dep], ['CapEx', -TRUCK.capex], ['Increase in NWC', -TRUCK.dnwc], ['Free cash flow', TRUCK.fcf, 1]]),
            ],
            answer: R`\(FCF = ${M(TRUCK.fcf)}\).`,
            ti: [TI.line('(120000-50000-20000)*(1-0.3)+20000-12000-5000')] },
          { kind: 'check', gen: 'w5-g-ocf' },
          { kind: 'guided', title: 'Your turn', q: R`A new machine adds $50,000 of revenue and $22,000 of costs a year. It also adds $8,000 of depreciation. The tax rate is 25%. Find the yearly operating cash flow.`,
            parts: [
              { ask: R`What is EBIT?`, answer: 20000, unit: '$', dp: 0, hint: 'Revenue − costs − depreciation.', why: R`\(50{,}000 - 22{,}000 - 8{,}000 = \$20{,}000\).` },
              { ask: R`How much tax is paid?`, answer: 5000, unit: '$', dp: 0, hint: R`\(\text{EBIT} \times 0.25\)`, why: R`\(20{,}000 \times 0.25 = \$5{,}000\).` },
              { ask: R`What is the operating cash flow?`, answer: FIN.ocf(50000, 22000, 8000, 0.25), unit: '$', dp: 0, hint: 'After-tax profit, plus the depreciation added back.', why: R`\(20{,}000 - 5{,}000 + 8{,}000 = \$23{,}000\).`, mistakes: [{ v: 15000, why: 'That is the after-tax profit. Add back the $8,000 of depreciation.' }] },
            ],
            answer: R`The machine adds \(\$23{,}000\) of cash a year, not just the \(\$15{,}000\) of profit.`,
            ti: [TI.line('(50000-22000-8000)*(1-0.25)+8000')] },
          { kind: 'learn', title: 'Only the change counts',
            body: R`A project’s cash flows are the **incremental** ones: the firm’s cash flows **with** the project minus its cash flows **without** it.\n\nNew equipment lifts sales by 15% over the current 40,000 units, at $12 each. Only the extra units count: \(0.15 \times 40{,}000 \times \$12 = \$72{,}000\) of incremental revenue.`,
            viz: { type: 'bars', fmt: '$', bars: [
              { label: 'Without', parts: [{ v: 40000 * 12, c: 1 }] },
              { label: 'With', parts: [{ v: 40000 * 12, c: 1 }, { v: 0.15 * 40000 * 12, c: 3 }] }],
              keys: [{ c: 1, label: 'Sales the firm makes anyway' }, { c: 3, label: R`Extra sales: \(${M(0.15 * 40000 * 12)}\)` }],
              cap: 'Only the aqua part happens because of the project. That is the incremental revenue.' },
            ti: [TI.line('0.15*40000*12')] },
          { kind: 'check', ref: 'w5-q02' },
          { kind: 'recap', title: 'Remember', formula: 'fcf', points: [
            R`Discount **cash flows**, not profits.`,
            R`\(FCF = (Rev - Costs - Dep)(1 - t_c) + Dep - CapEx - \Delta NWC\).`,
            R`Depreciation is taken off to work out the tax, then added back: it is not cash.`,
            R`Count only **incremental** cash flows: with the project minus without it.`,
            R`Exam trap: after-tax profit is not the cash flow. Add depreciation back, and never subtract interest.`] },
        ],
      },
      'w5-L2': {
        title: 'Depreciation and its tax shield',
        goal: R`Work out straight-line depreciation, book value and the depreciation tax shield.`,
        topics: ['dep', 'tax'],
        cards: [
          { kind: 'learn', title: 'Straight-line depreciation',
            body: R`**Straight-line** depreciation charges the same amount every year:\n\n\[Dep = \frac{\text{Cost} - \text{Residual value}}{\text{Depreciable life}}\]\n\nThe **cost** includes everything spent to get the asset working: the price, **shipping** and **installation**. The **residual value** is the value the tax rules expect at the end. It is often $0.`,
            viz: { type: 'anatomy', tex: R`\colA{Dep} = \frac{\colB{\text{Cost}} - \colC{\text{Residual value}}}{\colD{\text{Depreciable life}}}`,
              parts: [
                { sym: 'Dep', say: 'the depreciation charge, the **same** every year' },
                { sym: R`\text{Cost}`, say: 'the price + shipping + installation' },
                { sym: R`\text{Residual value}`, say: R`what the tax rules expect it to be worth at the end (often \(\$0\))` },
                { sym: R`\text{Depreciable life}`, say: 'how many years the tax rules allow' }],
              cap: 'Everything spent to get the asset working goes into the **cost**.' } },
          { kind: 'example', title: 'Worked example: a packing machine', q: R`A packing machine costs $80,000, plus $4,000 shipping and $6,000 installation. It is depreciated straight-line to zero over 5 years. What is the yearly depreciation?`,
            steps: [R`Depreciable cost: \(\$80{,}000 + \$4{,}000 + \$6{,}000 = \$90{,}000\).`, R`\[Dep = \frac{\$90{,}000}{5} = ${M(PACK.dep)} \text{ a year}\]`],
            answer: R`\(${M(PACK.dep)}\) a year.`,
            ti: [TI.line('(80000+4000+6000)/5')] },
          { kind: 'learn', title: 'Book value',
            body: R`**Book value** (BV) is the cost minus all the depreciation claimed so far. For the packing machine:`,
            viz: { type: 'bars', fmt: '$', c: 1, bars: Array.from({ length: PACK.n + 1 }, (_, t) => ({ label: 'Yr ' + t, v: PACK.cost - t * PACK.dep })),
              cap: R`Each year the book value drops by the same \(${M(PACK.dep)}\): a straight line down to \(\$0\).` },
            table: { head: ['End of year', 'Depreciation', 'Book value'], rows: Array.from({ length: PACK.n + 1 }, (_, t) => [t, t ? cell(PACK.dep) : '—', cell(PACK.cost - t * PACK.dep)]) },
            tip: R`The depreciable life comes from tax rules. A machine can keep working after its book value reaches $0. (Another method, **diminishing value**, takes a fixed percentage of the book value each year, so the charge falls over time.)` },
          { kind: 'check', gen: 'w5-g-bv' },
          { kind: 'learn', title: 'How tax moves each dollar',
            body: R`Tax changes the cash effect of every item. With a tax rate of 30%:`,
            viz: { type: 'bars', fmt: '$', dp: 2, sign: true, title: R`Cash from \(\$1\) more of each`,
              bars: [['Revenue', 1 - 0.3], ['Cost', -(1 - 0.3)], ['Depreciation', 0.3]].map(([label, v]) => ({ label, v, note: (v > 0 ? '+' : '') + T.money(v) })),
              cap: 'Revenue and cost move cash by 70 cents. Depreciation adds 30 cents, only through the tax it saves.' },
            points: [R`**+$1 of revenue** → **+$0.70** of cash. You keep the dollar but pay 30 cents of tax.`, R`**+$1 of cost** → **−$0.70** of cash. The cost cuts your tax by 30 cents.`, R`**+$1 of depreciation** → **+$0.30** of cash. No cash is paid, but your tax falls by 30 cents.`] },
          { kind: 'learn', title: 'The depreciation tax shield', formula: 'dep-shield',
            body: R`The tax saved by depreciation is the **depreciation tax shield**:\n\n\[\text{Tax shield} = Dep \times t_c\]\n\nThe packing machine at 30%: \(${M(PACK.dep)} \times 0.30 = ${M(PACK.dep * PACK.tc)}\) of tax saved every year. That saving is real cash.`,
            viz: { type: 'split', fmt: '$', key: true, total: R`Each year’s \(${M(PACK.dep)}\) of depreciation`,
              parts: [{ label: 'Tax saved: real cash', v: PACK.dep * PACK.tc, c: 'good' }, { label: 'The rest: no cash moves', v: PACK.dep * (1 - PACK.tc), c: 'grey' }],
              cap: R`30% of the charge comes back as lower tax: \(${M(PACK.dep * PACK.tc)}\) of cash, every year.` } },
          { kind: 'learn', title: 'Two methods, one answer',
            body: R`The packing machine adds $60,000 of revenue and $25,000 of costs a year. Tax is 30%. Both methods give the same operating cash flow:`,
            viz: { type: 'bars', fmt: '$', bars: [
              { label: 'Add back', parts: [{ v: (PACK.rev - PACK.opc - PACK.dep) * (1 - PACK.tc), c: 1 }, { v: PACK.dep, c: 2 }] },
              { label: 'Tax shield', parts: [{ v: (PACK.rev - PACK.opc) * (1 - PACK.tc), c: 3 }, { v: PACK.tc * PACK.dep, c: 'good' }] }],
              keys: [{ c: 1, label: 'After-tax profit' }, { c: 2, label: 'Depreciation added back' }, { c: 3, label: R`\((Rev - Costs)(1 - t_c)\)` }, { c: 'good', label: 'Tax shield' }],
              cap: R`Built from different pieces, both bars reach the same \(${M(PACK.ocf)}\).` },
            points: [R`**Add back**: \((60{,}000 - 25{,}000 - 18{,}000)(1 - 0.30) + 18{,}000 = ${M(PACK.ocf)}\).`, R`**Tax shield**: \((60{,}000 - 25{,}000)(1 - 0.30) + 0.30 \times 18{,}000 = ${M((PACK.rev - PACK.opc) * (1 - PACK.tc) + PACK.tc * PACK.dep)}\).`],
            ti: [TI.line('(60000-25000-18000)*(1-0.3)+18000'), TI.line('(60000-25000)*(1-0.3)+0.3*18000')] },
          { kind: 'guided', title: 'Your turn', q: R`A machine costs $45,000 plus $5,000 to install. It is depreciated straight-line to zero over 4 years. It adds $30,000 of revenue and $10,000 of costs a year. The tax rate is 25%.`,
            parts: [
              { ask: R`What is the yearly depreciation?`, answer: 12500, unit: '$', dp: 0, hint: 'Include the installation in the cost.', why: R`\(\frac{45{,}000 + 5{,}000}{4} = \$12{,}500\).`, mistakes: [{ v: 11250, why: 'Include the $5,000 installation in the cost.' }] },
              { ask: R`What is the depreciation tax shield?`, answer: 3125, unit: '$', dp: 0, hint: R`\(Dep \times t_c\)`, why: R`\(12{,}500 \times 0.25 = \$3{,}125\).`, mistakes: [{ v: 9375, why: R`That is \(Dep \times (1 - t_c)\). The shield is \(Dep \times t_c\).` }] },
              { ask: R`What is the yearly operating cash flow?`, answer: FIN.ocf(30000, 10000, 12500, 0.25), unit: '$', dp: 0, hint: R`Tax-shield method: \((Rev - Costs)(1 - t_c)\) plus the shield.`, why: R`\((30{,}000 - 10{,}000)(0.75) + 3{,}125 = \$18{,}125\).` },
            ],
            answer: R`Operating cash flow \(= \$18{,}125\) a year.`,
            ti: [TI.line('(45000+5000)/4'), TI.line('(30000-10000)*(1-0.25)+0.25*ans', { note: R`\(\text{ans}\) is the depreciation from the line before.` })] },
          { kind: 'check', ref: 'w5-q11' },
          { kind: 'recap', title: 'Remember', formula: 'dep-shield', points: [
            R`Straight-line: \(Dep = \frac{\text{Cost} - \text{Residual}}{\text{Life}}\). The cost includes shipping and installation.`,
            R`Book value \(=\) cost \(-\) depreciation claimed so far.`,
            R`Tax shield \(= Dep \times t_c\): real cash saved.`,
            R`+$1 revenue → \(+\$(1 - t_c)\). +$1 cost → \(-\$(1 - t_c)\). +$1 depreciation → \(+\$t_c\).`,
            R`Exam trap: depreciation is not a cash payment. Its only cash effect is the tax it saves.`] },
        ],
      },
      'w5-L3': {
        title: 'Which cash flows count?',
        goal: R`Decide which costs and benefits belong in a project’s cash flows.`,
        topics: ['relevant'],
        cards: [
          { kind: 'learn', title: 'One question to ask',
            body: R`For every item, ask: **“Will this cash flow happen only if we accept the project?”**`,
            viz: { type: 'compare', key: true, title: 'Will this cash flow happen **only if** we accept the project?', items: [
              { icon: '✅', title: 'Yes', big: 'Include it', c: 'good' },
              { icon: '❌', title: 'No', big: 'Leave it out', c: 'bad' },
              { icon: '✂️', title: 'Partly', big: 'Include that part', c: 2 }],
              cap: 'Only cash flows **caused by** the project are relevant.' },
            points: [R`**Yes**: include it. It is an **incremental** (relevant) cash flow.`, R`**No**: leave it out. It happens anyway.`, R`**Partly**: include only the part the project causes.`] },
          { kind: 'learn', title: 'Sunk costs: leave them out',
            body: R`A **sunk cost** is money already spent. It is gone whatever you decide, so it cannot change the decision.\n\nYou bought an $80 concert ticket that cannot be refunded, and now you feel sick. Whether you go should depend only on the future: the $80 is gone either way.\n\nBusiness examples:`,
            viz: { type: 'compare', items: [
              { icon: '🎫', title: 'Go to the concert', big: R`\(\$80\) gone`, points: ['You go, feeling sick'], c: 1 },
              { icon: '🛋️', title: 'Stay at home', big: R`\(\$80\) gone`, points: ['You rest'], c: 2 }],
              cap: R`The \(\$80\) is gone in **both** choices, so it cannot change the decision.` },
            points: [R`Market research done last month.`, R`Training that has already been paid for.`, R`The price the firm paid for its land years ago.`] },
          { kind: 'check', ref: 'w5-q33' },
          { kind: 'learn', title: 'Opportunity costs: include them',
            body: R`If the project uses something the firm already owns, the firm gives up its **best other use**. That lost value is an **opportunity cost**, and it counts.\n\nLand the firm could sell for $50,000 after tax costs the project $50,000, even though no cheque is written. Use today’s value, not the old purchase price.`,
            viz: { type: 'compare', items: [
              { icon: '🏗️', title: 'With the project', big: R`\(\$0\)`, points: ['The land is used, not sold'], c: 3, mark: 'bad', markText: R`Gives up \(\$50{,}000\)` },
              { icon: '🏷️', title: 'Without the project', big: R`\(+\$50{,}000\)`, points: ['The firm sells the land'], c: 1 }],
              cap: R`With minus without: \(\$0 - \$50{,}000 = -\$50{,}000\). The lost sale is a cost of the project.` } },
          { kind: 'learn', title: 'Side effects: include them',
            body: R`A new product can take sales from the firm’s existing products. This is called **cannibalisation**. The profit lost on the old products is a cost of the project.\n\nGood side effects count too, such as extra sales of a product that goes well with the new one.`,
            viz: { type: 'compare', items: [
              { icon: '📉', title: 'Cannibalisation', points: ['The new product takes sales from old ones', 'The lost profit is a **cost**'], c: 'bad' },
              { icon: '📈', title: 'A good side effect', points: ['A product that goes well with the new one sells more', 'The extra profit is a **benefit**'], c: 'good' }],
              cap: 'Both happen only because of the project, so **both** count.' } },
          { kind: 'learn', title: 'Overheads and interest: leave them out',
            body: R`Two more items stay out:`,
            viz: { type: 'compare', items: [
              { icon: '🏢', title: 'Allocated overhead', points: ['Head-office costs, paid anyway'], c: 'grey', mark: 'bad', markText: 'Leave out' },
              { icon: '💡', title: 'Extra overhead', points: ['Caused by the project'], c: 3, mark: 'good', markText: 'Include' },
              { icon: '🏦', title: 'Interest', points: ['Already in the discount rate'], c: 'grey', mark: 'bad', markText: 'Leave out' }],
              cap: 'Only overhead the project **adds** counts. Adding interest would charge for the money twice.' },
            points: [R`**Allocated overheads**: a share of head-office costs that are paid anyway. Leave them out. Only **extra** overhead caused by the project counts.`, R`**Financing costs**: interest and dividends. Leave them out. The discount rate already charges for the money, so adding interest would count it **twice**.`] },
          { kind: 'check', ref: 'w5-q34' },
          { kind: 'example', title: 'Worked example: the cash flow today', q: R`A firm may build a new production line. The equipment costs $200,000, plus $10,000 to install. The line uses land the firm owns, which could be sold for $50,000 after tax. Last month the firm paid $8,000 for a study of the idea. What is the relevant cash flow at \(t = 0\)?`,
            steps: [R`Equipment and installation: include them, \(\$210{,}000\).`, R`The land: an opportunity cost. Include its \(\$50{,}000\) value.`, R`The study: a sunk cost. Leave it out.`, R`\[CF_0 = -(\$200{,}000 + \$10{,}000 + \$50{,}000) = -\$260{,}000\]`],
            answer: R`\(CF_0 = -\$260{,}000\).`,
            ti: [TI.line('-(200000+10000+50000)')] },
          { kind: 'guided', title: 'Your turn: a yearly cash flow', q: R`A new product has sales of $400,000 and costs of $180,000 a year. The firm’s old product loses $40,000 of profit (before tax). Head office allocates $25,000 of its existing overhead to the product. Interest on the project loan is $12,000. Depreciation is $30,000 and tax is 30%.`,
            parts: [
              { ask: 'Which items do you leave out?', choices: ['The allocated overhead and the interest', 'The lost profit on the old product', 'The depreciation', 'Nothing: include everything'], answer: 0, hint: 'Which items happen anyway, or are financing?', why: 'The overhead is paid anyway, and interest is a financing cost.' },
              { ask: R`What is EBIT?`, answer: 400000 - 180000 - 40000 - 30000, unit: '$', dp: 0, hint: 'Sales − costs − lost profit − depreciation.', why: R`\(400{,}000 - 180{,}000 - 40{,}000 - 30{,}000 = \$150{,}000\).`, mistakes: [{ v: 190000, why: 'The lost profit on the old product is a cost of the project. Take it off.' }] },
              { ask: R`What is the yearly free cash flow?`, answer: 150000 * 0.7 + 30000, unit: '$', dp: 0, hint: R`\(\text{EBIT} \times (1 - 0.30) + Dep\)`, why: R`\(150{,}000 \times 0.70 + 30{,}000 = \$135{,}000\).` },
            ],
            answer: R`\(FCF = \$135{,}000\) a year.`,
            ti: [TI.line('(400000-180000-40000-30000)*(1-0.3)+30000')] },
          { kind: 'check', gen: 'w5-g-annual' },
          { kind: 'recap', title: 'Remember', points: [
            R`Ask: “Will it happen **only if** we accept the project?”`,
            R`**Out**: sunk costs, allocated overheads, and interest or other financing costs.`,
            R`**In**: opportunity costs (at today’s value) and side effects such as cannibalisation.`,
            R`Exam trap: interest is a real payment, but it is never a project cash flow. The discount rate already covers it.`] },
        ],
      },
      'w5-L4': {
        title: 'Net working capital',
        goal: R`Turn changes in working capital into cash flows, and recover them at the end.`,
        topics: ['nwc'],
        cards: [
          { kind: 'learn', title: 'Cash tied up in the business',
            body: R`A shop must fill its shelves before it can sell. Customers who buy on credit pay later. Suppliers may let the shop pay later too.\n\n**Net working capital** (NWC) is the cash tied up this way:\n\n\[NWC = \text{Inventory} + \text{Receivables} - \text{Payables}\]\n\n**Receivables** is money customers owe the firm. **Payables** is money the firm owes its suppliers.`,
            viz: { type: 'flow', op: true, steps: [
              { icon: '📦', t: 'Inventory', s: 'stock', c: 1 },
              { icon: '🧾', t: 'Receivables', s: 'customers owe', c: 1 },
              { icon: '📬', t: 'Payables', s: 'the firm owes', c: 2 },
              { icon: '🔒', t: 'NWC', s: 'tied up', c: 3 }],
              links: [R`\(+\)`, R`\(-\)`, R`\(=\)`],
              cap: 'Stock and unpaid customer bills tie cash up. Paying suppliers later frees some of it.' } },
          { kind: 'learn', title: 'An increase is a cash outflow',
            body: R`Only the **change** in NWC is a cash flow:`,
            viz: { type: 'seesaw', down: 'right', left: { icon: '📦', label: 'NWC' }, right: { icon: '💵', label: 'Cash' },
              cap: 'When NWC goes **up**, cash goes **down**: an outflow. When NWC falls, cash comes back.' },
            points: [R`NWC **rises**: more cash is tied up. That is a cash **outflow**.`, R`NWC **falls**: cash is released. That is a cash **inflow**.`, R`It is **not** an expense, so it is **not** taxed.`] },
          { kind: 'learn', title: 'It comes back at the end',
            body: R`NWC is not used up. When the project ends, the stock is sold and the customers pay.\n\nIn BFC2140, NWC is **recovered 100%** at the end of the project, unless you are told otherwise. Here, $20,000 goes in at the start and comes back in year 4.`,
            viz: { type: 'tl', key: true, n: 4, at: { 0: '−$20,000', 4: '+$20,000' }, unit: 'Year', hi: [0, 4],
              moves: [{ from: 0, to: 4, label: 'recovered 100%', c: 'good' }],
              cap: 'Out at the start, back at the end: the two NWC cash flows add up to zero.' } },
          { kind: 'check', ref: 'w5-q19' },
          { kind: 'example', title: 'Worked example: NWC that grows', q: R`A 3-year project needs the NWC below. All of it is recovered at the end of year 3. What is the cash flow from NWC in each year?`,
            table: { head: ['End of year', 'NWC needed'], rows: [[0, '$10,000'], [1, '$14,000'], [2, '$15,000'], [3, '$0 (all recovered)']] },
            steps: [R`Year 0: NWC goes from \(\$0\) to \(\$10{,}000\). Cash flow \(= -\$10{,}000\).`, R`Year 1: from \(\$10{,}000\) to \(\$14{,}000\). Cash flow \(= -\$4{,}000\).`, R`Year 2: from \(\$14{,}000\) to \(\$15{,}000\). Cash flow \(= -\$1{,}000\).`, R`Year 3: all \(\$15{,}000\) comes back. Cash flow \(= +\$15{,}000\).`],
            answer: R`The NWC cash flows are \(-\$10{,}000\), \(-\$4{,}000\), \(-\$1{,}000\) and \(+\$15{,}000\). Together they add up to zero.`,
            ti: [TI.line('-({10000,14000,15000,0}-{0,10000,14000,15000})', { note: 'The first list is NWC this year, the second is NWC last year. Minus the change gives each cash flow.' })] },
          { kind: 'check', gen: 'w5-g-nwc' },
          { kind: 'guided', title: 'Your turn', q: R`A project needs $30,000 of NWC at the start, plus $5,000 more in each of years 1 to 3. All of it is recovered at the end of year 4.`,
            parts: [
              { ask: R`What is the NWC cash flow at \(t = 0\)?`, answer: -30000, unit: '$', dp: 0, hint: 'An increase in NWC is an outflow.', why: R`\(-\$30{,}000\).` },
              { ask: R`What is the NWC cash flow in year 2?`, answer: -5000, unit: '$', dp: 0, hint: 'Only the change in that year.', why: R`Another \(\$5{,}000\) is tied up: \(-\$5{,}000\).`, mistakes: [{ v: -40000, why: 'That is the whole balance. Only the change is a cash flow.' }] },
              { ask: R`How much NWC is recovered in year 4?`, answer: 30000 + 3 * 5000, unit: '$', dp: 0, hint: 'Add up everything that went in.', why: R`\(30{,}000 + 3 \times 5{,}000 = \$45{,}000\).`, mistakes: [{ v: 30000, why: 'The $5,000 added in each of years 1 to 3 comes back too.' }] },
            ],
            answer: R`\(\$45{,}000\) comes back in year 4.`,
            ti: [TI.line('30000+3*5000')] },
          { kind: 'learn', title: 'Why NWC is kept apart from profit',
            body: R`Profit counts a sale on the day it is made, even if the customer pays next month. It counts the cost of goods when they are sold, not when the stock was bought.\n\nThe NWC adjustment moves these amounts to the dates when the **cash** really moves.`,
            viz: { type: 'flow', steps: [
              { icon: '🧾', t: 'Sale day', s: 'profit counts the sale', c: 1 },
              { icon: '💵', t: 'Next month', s: 'the customer pays: cash arrives', c: 3 }],
              links: ['NWC moves it here'],
              cap: 'Profit counts the sale on the day it is made. Cash flow waits until the customer pays.' } },
          { kind: 'check', gen: 'w5-g-outlay' },
          { kind: 'recap', title: 'Remember', points: [
            R`\(NWC =\) inventory \(+\) receivables \(-\) payables.`,
            R`An **increase** in NWC is a cash **outflow**. A decrease is an inflow. Neither is taxed.`,
            R`NWC is recovered **100%** at the end, unless you are told otherwise.`,
            R`Exam trap: only the **change** in NWC is a cash flow, not the whole balance. And do not forget to add it back at the end.`] },
        ],
      },
      'w5-L5': {
        title: 'Selling an asset: after-tax salvage',
        goal: R`Work out the cash from selling an asset after tax, and build the terminal cash flow.`,
        topics: ['salvage'],
        cards: [
          { kind: 'learn', title: 'Sale price against book value',
            body: R`When a firm sells an asset, the price is its **salvage value** (SV). Compare it with the **book value** (BV):`,
            viz: { type: 'numline', min: 0, max: 100, ticks: [], title: R`Where does the sale price \(SV\) land?`,
              zones: [{ from: 0, to: 50, c: 'good', label: 'Below: tax saved' }, { from: 50, to: 100, c: 'bad', label: 'Above: tax paid' }],
              marks: [{ v: 50, label: 'Book value', c: 1 }],
              alt: 'Sale prices on a line. Below the book value is a loss, which saves tax. Above it is a gain, which is taxed.',
              cap: 'Sell above book value and you pay tax on the gain. Sell below it and you save tax.' },
            points: [R`\(SV > BV\): a **gain**. Tax is paid on the gain.`, R`\(SV < BV\): a **loss**. The loss cuts tax, so tax is **saved**.`, R`\(SV = BV\): no gain, no loss, no tax.`] },
          { kind: 'learn', title: 'The formula', formula: 'salvage',
            body: R`\[\text{After-tax salvage} = SV - (SV - BV)\,t_c\]\n\nOnly the **gain** \((SV - BV)\) is taxed, never the whole price. When \(SV < BV\), the bracket is negative, so the “tax” becomes a saving that is added.`,
            viz: { type: 'split', fmt: '$', key: true, total: R`Sold for \(\$26{,}000\), book value \(\$20{,}000\)`,
              parts: [{ label: 'Up to book value: not taxed', v: 20000, c: 1 }, { label: 'The gain: taxed', v: 26000 - 20000, c: 2 }],
              cap: 'Only the gain above book value is taxed, never the whole price.' } },
          { kind: 'example', title: 'Worked example: selling above book value', q: R`A machine with a book value of $20,000 is sold for $26,000. The tax rate is 30%. How much cash does the firm keep?`,
            steps: [R`Gain: \(\$26{,}000 - \$20{,}000 = \$6{,}000\).`, R`Tax on the gain: \(\$6{,}000 \times 0.30 = \$1{,}800\).`, R`\[\$26{,}000 - \$1{,}800 = ${M(FIN.afterTaxSalvage(26000, 20000, 0.3))}\]`],
            answer: R`The firm keeps \(${M(FIN.afterTaxSalvage(26000, 20000, 0.3))}\).`,
            ti: [TI.line('26000-(26000-20000)*0.3')] },
          { kind: 'example', title: 'Worked example: selling below book value', q: R`The same machine (book value $20,000) is sold for only $15,000. The tax rate is 30%. How much cash does the firm keep?`,
            steps: [R`Loss: \(\$15{,}000 - \$20{,}000 = -\$5{,}000\).`, R`The loss saves tax: \(\$5{,}000 \times 0.30 = \$1{,}500\).`, R`\[\$15{,}000 - (-\$5{,}000)(0.30) = \$15{,}000 + \$1{,}500 = ${M(FIN.afterTaxSalvage(15000, 20000, 0.3))}\]`],
            answer: R`The firm keeps \(${M(FIN.afterTaxSalvage(15000, 20000, 0.3))}\): more than the sale price.`,
            ti: [TI.line('15000-(15000-20000)*0.3')] },
          { kind: 'check', gen: 'w5-g-salvage' },
          { kind: 'learn', title: 'Fully depreciated? The whole price is a gain',
            body: R`If the asset has been depreciated to zero, then \(BV = 0\). The whole sale price is a gain, and all of it is taxed:\n\n\[\text{After-tax salvage} = SV(1 - t_c)\]\n\nSelling a fully depreciated machine for $8,000 at 30% tax leaves \(8{,}000 \times 0.70 = ${M(FIN.afterTaxSalvage(8000, 0, 0.3))}\).`,
            viz: { type: 'split', fmt: '$', total: R`Sold for \(\$8{,}000\) with \(BV = \$0\): all of it is gain`,
              parts: [{ label: 'Tax at 30%', v: 8000 * 0.3, c: 'bad' }, { label: 'The firm keeps', v: FIN.afterTaxSalvage(8000, 0, 0.3), c: 3 }],
              cap: 'With nothing left on the books, every dollar of the price is taxed.' } },
          { kind: 'learn', title: 'The terminal cash flow',
            body: R`The last year of a project has extra cash flows. The **terminal cash flow** adds up:`,
            viz: { type: 'waterfall', fmt: '$', steps: [
              { label: 'Last OCF', v: 40000 },
              { label: 'NWC back', v: 12000 },
              { label: 'Salvage', v: FIN.afterTaxSalvage(8000, 0, 0.3) },
              { label: 'Total', total: true, c: 3 }],
              cap: 'Three amounts stack up in the final year. The salvage counts **after** tax.' },
            points: [R`the last year’s **operating cash flow**,`, R`the **NWC recovered**,`, R`the **after-tax salvage** of the equipment.`],
            table: { head: ['Final year', 'Amount'], rows: [['Operating cash flow', '$40,000'], ['NWC recovered', '$12,000'], ['Salvage $8,000, less 30% tax on the gain', T.money(FIN.afterTaxSalvage(8000, 0, 0.3), 0)], ['**Terminal cash flow**', `**${T.money(40000 + 12000 + FIN.afterTaxSalvage(8000, 0, 0.3), 0)}**`]] } },
          { kind: 'guided', title: 'Your turn', q: R`In its final year a project has an operating cash flow of $25,000. A machine with a book value of $4,000 is sold for $9,000. The $6,000 of NWC is recovered. The tax rate is 30%.`,
            parts: [
              { ask: R`How much tax is paid on the machine sale?`, answer: (9000 - 4000) * 0.3, unit: '$', dp: 0, hint: R`Tax only the gain: \((9{,}000 - 4{,}000) \times 0.30\).`, why: R`\(\$5{,}000 \times 0.30 = \$1{,}500\).`, mistakes: [{ v: 2700, why: 'Only the gain over book value is taxed, not the whole price.' }] },
              { ask: R`What is the after-tax salvage?`, answer: FIN.afterTaxSalvage(9000, 4000, 0.3), unit: '$', dp: 0, hint: 'The sale price minus the tax.', why: R`\(\$9{,}000 - \$1{,}500 = \$7{,}500\).` },
              { ask: R`What is the terminal cash flow?`, answer: 25000 + 6000 + FIN.afterTaxSalvage(9000, 4000, 0.3), unit: '$', dp: 0, hint: 'Operating cash flow + NWC recovered + after-tax salvage.', why: R`\(25{,}000 + 6{,}000 + 7{,}500 = \$38{,}500\).`, mistakes: [{ v: 32500, why: 'Add the $6,000 of NWC that is recovered.' }] },
            ],
            answer: R`Terminal cash flow \(= \$38{,}500\).`,
            ti: [TI.line('25000+6000+9000-(9000-4000)*0.3')] },
          { kind: 'check', gen: 'w5-g-salvage-full' },
          { kind: 'recap', title: 'Remember', formula: 'salvage', points: [
            R`After-tax salvage \(= SV - (SV - BV)\,t_c\).`,
            R`Above book value: pay tax on the gain. Below book value: the loss saves tax.`,
            R`Fully depreciated (\(BV = 0\)): the whole price is taxed.`,
            R`Terminal cash flow \(=\) last operating cash flow \(+\) NWC recovered \(+\) after-tax salvage.`,
            R`Exam trap: tax only the gain, not the whole price. And recovered NWC is never taxed.`] },
        ],
      },
      'w5-L6': {
        title: 'Inflation: real and nominal',
        goal: R`Convert between real and nominal rates and cash flows, and never mix them.`,
        topics: ['inflation'],
        cards: [
          { kind: 'learn', title: 'Prices rise',
            body: R`**Inflation** is the rise in prices over time. With 3% inflation, a $5.00 coffee costs $5.15 next year.\n\n**Nominal** amounts are the actual dollars you will see, with inflation included.\n\n**Real** amounts are in today’s dollars, with inflation taken out. They measure what money can buy.`,
            viz: { type: 'compare', items: [
              { icon: '☕', title: 'Nominal', big: R`\(${M(5 * 1.03)}\)`, points: ['What you will **actually** pay next year', 'Inflation included'], c: 2 },
              { icon: '☕', title: 'Real', big: R`\(\$5.00\)`, points: ['The same coffee in **today’s** dollars', 'Inflation taken out'], c: 1 }],
              cap: R`Next year the coffee costs \(${M(5 * 1.03)}\) in nominal dollars. In real dollars it is still \(\$5.00\).` } },
          { kind: 'learn', title: 'Real and nominal rates', formula: 'fisher',
            body: R`A bank quotes a **nominal** rate. The **real** rate is how fast your buying power grows. The **Fisher relation** links them:\n\n\[(1 + r_{nominal}) = (1 + r_{real})(1 + i)\]\n\nHere \(i\) is inflation. So:\n\n\[r_{real} = \frac{1 + r_{nominal}}{1 + i} - 1\]`,
            viz: { type: 'anatomy', tex: R`\colB{r_{real}} = \frac{1 + \colA{r_{nominal}}}{1 + \colC{i}} - 1`,
              parts: [{ sym: 'r_{nominal}', c: 'A', say: 'the rate the bank quotes: how fast your dollars grow' }, { sym: 'r_{real}', c: 'B', say: 'how fast your **buying power** grows' }, { sym: 'i', c: 'C', say: 'inflation: how fast prices rise' }],
              cap: 'Dollar growth is real growth and inflation **multiplied** together. So divide to take inflation out.' },
            tip: R`\(r_{nominal} - i\) is only a rough shortcut. Use the division.` },
          { kind: 'example', title: 'Worked example: the real rate', q: R`The nominal interest rate is 10% and inflation is 3%. What is the real interest rate?`,
            steps: [R`\[1 + r_{real} = \frac{1.10}{1.03} = ${L.numT(1.1 / 1.03, 6)}\]`, R`\(r_{real} = ${L.numT(1.1 / 1.03 - 1, 6)}\), which is \(${L.pct(1.1 / 1.03 - 1)}\).`, R`The shortcut \(10\% - 3\% = 7\%\) is a little too high.`],
            answer: R`The real rate is \(${L.pct(1.1 / 1.03 - 1)}\).`,
            ti: [TI.line('1.1/1.03-1', { pct: true, note: 'The real rate as a decimal. Times 100 gives the percentage.' })] },
          { kind: 'check', gen: 'w5-g-fisher' },
          { kind: 'learn', title: 'Never mix them',
            body: R`The golden rule of inflation:`,
            viz: { type: 'table', key: true, head: ['', 'Nominal rate', 'Real rate'],
              rows: [['**Nominal** cash flows', '✓ Right', '✗ NPV too high'], ['**Real** cash flows', '✗ NPV too low', '✓ Right']],
              cap: 'Match the cash flows to the rate. Both ✓ boxes give the same NPV.' },
            points: [R`**Nominal** cash flows: discount at the **nominal** rate.`, R`**Real** cash flows: discount at the **real** rate.`, R`Done consistently, both give the **same NPV**.`, R`Real cash flows at the nominal rate give an NPV that is too **low**, so good projects get rejected.`] },
          { kind: 'learn', title: 'Real cash flows into nominal',
            body: R`To turn a real cash flow into a nominal one, grow it by inflation for each year:\n\n\[CF^{nominal}_t = CF^{real}_t \times (1 + i)^{t}\]\n\nA real $5,000 in year 3, with 4% inflation, is \(5{,}000 \times 1.04^{3} = ${M(5000 * Math.pow(1.04, 3))}\) in nominal dollars.`,
            viz: { type: 'flow', op: true, steps: [
              { t: R`\(\$5{,}000\)`, s: 'real: today’s dollars', c: 1 },
              { t: R`\(1.04^{3}\)`, s: '3 years of 4% inflation', c: 2 },
              { t: R`\(${M(5000 * Math.pow(1.04, 3))}\)`, s: 'nominal: year-3 dollars', c: 3 }],
              links: [R`\(\times\)`, R`\(=\)`],
              cap: 'Grow the real amount by inflation, once for each year, to get the dollars you will actually see.' },
            ti: [TI.line('5000*1.04^3')],
            tip: R`Depreciation is the exception. The tax rules fix it in nominal dollars, so it does not grow with inflation.` },
          { kind: 'example', title: 'Worked example: two ways, one NPV', q: R`A project costs $7,500 today. It produces **real** cash flows of $3,000 a year for 3 years. Inflation is 4% and the nominal rate is 12%. What is the NPV?`,
            steps: [
              R`Real rate: \(\frac{1.12}{1.04} - 1 = ${L.pct(INF.real, 4)}\).`,
              R`Real with real: \[NPV = -7{,}500 + \frac{3{,}000}{${L.numT(1 + INF.real, 6)}} + \frac{3{,}000}{${L.numT(1 + INF.real, 6)}^{2}} + \frac{3{,}000}{${L.numT(1 + INF.real, 6)}^{3}} = ${M(INF.npv)}\]`,
              R`Check, nominal with nominal: the cash flows become \(${M(3000 * 1.04)}\), \(${M(3000 * Math.pow(1.04, 2))}\) and \(${M(3000 * Math.pow(1.04, 3))}\). At 12% they give the same \(${M(FIN.npv(0.12, [-7500, 3000 * 1.04, 3000 * Math.pow(1.04, 2), 3000 * Math.pow(1.04, 3)]))}\).`,
            ],
            answer: R`\(NPV = ${M(INF.npv)}\), either way.`,
            ti: [TI.line('1.12/1.04-1', { note: 'The real rate, as a decimal.' }), TI.line('npv(100*ans,-7500,{3000,3000,3000})', { note: R`\(100 \times \text{ans}\) turns the real rate into a percentage.` }), TI.line('npv(12,-7500,3000*{1.04,1.04^2,1.04^3})', { note: 'Nominal with nominal gives the same NPV.' })] },
          { kind: 'guided', title: 'Your turn', q: R`A project costs $20,000. It produces **real** cash flows of $8,500 a year for 3 years. Inflation is 5% and the nominal required return is 15.5%.`,
            parts: [
              { ask: 'Are these cash flows real or nominal?', choices: ['Real: in today’s dollars', 'Nominal: with inflation included'], answer: 0, hint: 'Read the question: which word does it use?', why: 'The question says real cash flows, so use the real rate.' },
              { ask: R`What is the real rate?`, answer: P(INF2.real), unit: '%', dp: 2, hint: R`\(\frac{1.155}{1.05} - 1\)`, why: R`\(\frac{1.155}{1.05} = 1.10\), so the real rate is \(10\%\).`, mistakes: [{ v: 10.5, why: R`Subtracting is only a shortcut. Divide: \(\frac{1.155}{1.05} - 1\).` }] },
              { ask: R`What is the NPV?`, answer: INF2.npv, unit: '$', dp: 2, hint: R`\(\text{npv}(10, -20000, \{8500, 8500, 8500\})\)`, why: R`\(NPV = ${M(INF2.npv)}\).`, mistakes: [{ v: -20000 + FIN.pvAnnuity(8500, 0.155, 3), why: 'Real cash flows need the real rate, not the nominal 15.5%.' }] },
            ],
            answer: R`\(NPV = ${M(INF2.npv)} > 0\): accept.`,
            ti: [TI.line('1.155/1.05-1'), TI.line('npv(100*ans,-20000,{8500,8500,8500})')] },
          { kind: 'check', ref: 'w5-q45' },
          { kind: 'recap', title: 'Remember', formula: 'fisher', points: [
            R`**Nominal** includes inflation. **Real** is in today’s dollars.`,
            R`Fisher: \(1 + r_{real} = \frac{1 + r_{nominal}}{1 + i}\).`,
            R`Real to nominal cash flow: multiply by \((1 + i)^{t}\).`,
            R`Nominal with nominal, real with real. Never mix them.`,
            R`Exam trap: \(r_{nominal} - i\) is only a shortcut. And depreciation is fixed in dollars: it does not grow with inflation.`] },
        ],
      },
      'w5-L7': {
        title: 'A whole project, start to finish',
        goal: R`Build a project’s free cash flow for every year and find its NPV with npv( ).`,
        topics: ['project'],
        cards: [
          { kind: 'learn', title: 'Three parts of every project',
            body: R`A project’s cash flows come in three parts:`,
            points: [R`**Part 1, the initial investment** (\(t = 0\)): equipment, shipping, installation, opportunity costs and the NWC needed at the start.`, R`**Part 2, the operating cash flows** (every year): the FCF recipe.`, R`**Part 3, the terminal cash flow** (the last year): the NWC recovered and the after-tax salvage.`],
            tl: { n: 5, at: { 0: 'Part 1', 1: 'Part 2', 2: 'Part 2', 3: 'Part 2', 4: 'Part 2', 5: 'Part 2 + 3' }, unit: 'Year', hi: [0, 5] } },
          { kind: 'learn', title: 'The bottling line',
            body: R`Koala Kombucha may build a bottling line. Here are the facts:`,
            table: { head: ['Item', 'Details'], rows: [['Equipment', '$600,000 today. Straight-line to $0 over 5 years. Sells for $40,000 at the end of year 5.'], ['Each year, years 1 to 5', 'Sales $500,000. Costs $220,000.'], ['Working capital', '$50,000 today. Recovered in year 5.'], ['Already spent', 'A $20,000 market study last month.'], ['Tax and cost of capital', 'Tax 30%. Cost of capital 12%.']] } },
          { kind: 'example', title: 'Worked example: the free cash flows', q: R`Find the bottling line’s free cash flow in each year.`,
            steps: [
              R`**Year 0**: \(-\$600{,}000 - \$50{,}000 = -\$650{,}000\). The study is sunk, so leave it out.`,
              R`**Depreciation**: \(\frac{\$600{,}000}{5} = ${M(LINE.dep)}\) a year.`,
              stmt([['Sales', LINE.rev], ['Costs', -LINE.cost], ['Depreciation', -LINE.dep], ['EBIT', LINE.rev - LINE.cost - LINE.dep, 1], ['Tax at 30%', -(LINE.rev - LINE.cost - LINE.dep) * LINE.tc], ['Add back depreciation', LINE.dep], ['FCF, years 1 to 5', LINE.fcf, 1]]),
              R`**Year 5** also gets the NWC back and the after-tax salvage: \(${M(LINE.fcf)} + \$50{,}000 + \$40{,}000(1 - 0.30) = ${M(LINE.last)}\).`,
            ],
            answer: R`Cash flows: \(-\$650{,}000\), then \(${M(LINE.fcf)}\) in years 1 to 4, then \(${M(LINE.last)}\) in year 5.`,
            ti: [TI.line('(500000-220000-120000)*(1-0.3)+120000')] },
          { kind: 'example', title: 'Worked example: the NPV', q: R`Discount the bottling line’s cash flows at 12%. Should Koala Kombucha build it?`,
            tl: { cfs: LINE.cfs, unit: 'Year' },
            steps: [R`\[NPV = -650{,}000 + \frac{232{,}000}{1.12} + \cdots + \frac{232{,}000}{1.12^{4}} + \frac{310{,}000}{1.12^{5}}\]`, R`On the TI-Nspire a count list saves typing: \(\$232{,}000\) four times, then \(\$310{,}000\) once.`, R`\(NPV = ${M(FIN.npv(LINE.k, LINE.cfs))} > 0\), so build it.`],
            answer: R`\(NPV = ${M(FIN.npv(LINE.k, LINE.cfs))}\). The line adds value.`,
            ti: [tiNpv(LINE.k, LINE.cfs)] },
          { kind: 'check', ref: 'w5-q57' },
          { kind: 'guided', title: 'Your turn', q: R`Equipment costs $90,000 today. It is depreciated straight-line to zero over 3 years, with no salvage. NWC of $10,000 is needed today and recovered in year 3. Sales are $80,000 and costs $30,000 a year. Tax is 30% and the cost of capital is 10%.`,
            parts: [
              { ask: R`What is the cash flow at \(t = 0\)?`, answer: PROJ3.cfs[0], unit: '$', dp: 0, hint: 'The equipment plus the NWC, as an outflow.', why: R`\(-90{,}000 - 10{,}000 = -\$100{,}000\).`, mistakes: [{ v: -90000, why: 'Include the $10,000 of NWC needed at the start.' }] },
              { ask: R`What is the free cash flow in years 1 and 2?`, answer: PROJ3.fcf, unit: '$', dp: 0, hint: R`\((80{,}000 - 30{,}000 - 30{,}000)(1 - 0.3) + 30{,}000\)`, why: R`\(Dep = \$30{,}000\), so \(20{,}000 \times 0.7 + 30{,}000 = \$44{,}000\).`, mistakes: [{ v: 14000, why: 'That is the after-tax profit. Add back the $30,000 of depreciation.' }] },
              { ask: R`What is the cash flow in year 3?`, answer: PROJ3.cfs[3], unit: '$', dp: 0, hint: 'Add the NWC recovered.', why: R`\(44{,}000 + 10{,}000 = \$54{,}000\).` },
              { ask: R`What is the NPV?`, answer: FIN.npv(PROJ3.k, PROJ3.cfs), unit: '$', dp: 2, hint: R`\(\text{npv}(10, -100000, \{44000, 44000, 54000\})\)`, why: R`\(NPV = ${M(FIN.npv(PROJ3.k, PROJ3.cfs))}\).` },
            ],
            answer: R`\(NPV = ${M(FIN.npv(PROJ3.k, PROJ3.cfs))} > 0\): accept.`,
            ti: [TI.line('(80000-30000-30000)*(1-0.3)+30000'), tiNpv(PROJ3.k, PROJ3.cfs)] },
          { kind: 'check', gen: 'w5-g-fcf' },
          { kind: 'learn', title: 'A checklist before you discount',
            body: R`Most exam marks are lost on these five checks:`,
            viz: { type: 'cards', items: [
              { icon: '💵', t: 'Cash, not profit', s: 'Use cash flows, never net income' },
              { icon: '📦', t: 'NWC out and back', s: 'Out at the start, back at the end' },
              { icon: '🚫', t: 'Leave out', s: 'Sunk costs, allocated overheads, interest' },
              { icon: '🧾', t: 'Salvage after tax', s: 'Tax only the gain over book value' },
              { icon: '🎯', t: 'Rates match', s: 'Nominal with nominal, real with real' }],
              cap: 'Tick all five before you discount. They save the most exam marks.' },
            points: [R`Did you use **cash flows**, not net income?`, R`Is the **NWC** taken out at the start and added back at the end?`, R`Are sunk costs, allocated overheads and interest left **out**?`, R`Is the salvage **after tax**?`, R`Is the rate consistent: nominal with nominal?`] },
          { kind: 'recap', title: 'Remember', formula: 'npv',
            viz: { type: 'bars', key: true, fmt: '$', title: 'The bottling line, part by part',
              bars: LINE.cfs.map((cf, t) => ({ label: 'Yr ' + t, note: T.money(cf / 1000, 0) + 'k',
                parts: t === 0 ? [{ v: cf, c: 2 }] : t < LINE.n ? [{ v: cf, c: 1 }] : [{ v: LINE.fcf, c: 1 }, { v: LINE.last - LINE.fcf, c: 3 }] })),
              keys: [{ c: 2, label: 'Part 1: initial investment' }, { c: 1, label: 'Part 2: operating cash flows' }, { c: 3, label: 'Part 3: NWC back + salvage after tax' }],
              cap: R`Discount these at 12% and add them up: \(NPV = ${M(FIN.npv(LINE.k, LINE.cfs))}\).` },
            points: [
            R`Three parts: the initial investment, the operating cash flows and the terminal cash flow.`,
            R`Build a small table: one column per year, one line per item.`,
            R`TI-Nspire: \(\text{npv}(k, CF_0, \{CF_1, \ldots\}, \{\text{counts}\})\).`,
            R`Exam trap: adding up years of net income is not a valuation. Use free cash flows, and discount them.`] },
        ],
      },
      'w5-L8': {
        title: 'The replacement decision',
        goal: R`Work out the incremental cash flows of replacing an old machine, and decide with NPV.`,
        topics: ['replace'],
        cards: [
          { kind: 'learn', title: 'Keep the old machine, or replace it?',
            body: R`A **replacement decision** compares keeping an old asset with buying a new one.\n\nWork with **incremental** cash flows: the cash flows **with** the new machine minus the cash flows **with** the old one. Replace if the NPV of these differences is positive.`,
            viz: { type: 'flow', op: true, steps: [
              { icon: '🆕', t: 'New machine', s: 'if you replace', c: 3 },
              { icon: '🔧', t: 'Old machine', s: 'if you keep it', c: 'grey' },
              { icon: '🔍', t: 'Incremental', s: 'the difference', c: 2 }],
              links: [R`\(-\)`, R`\(=\)`],
              cap: 'Discount the differences. Replace if their NPV is **positive**.' } },
          { kind: 'learn', title: 'The Wombat Widgets case',
            body: R`Wombat Widgets may replace an old machine. Here are the facts:`,
            table: { head: ['Item', 'Details'], rows: [['Old machine', 'Bought 3 years ago for $40,000. Straight-line to $0 over 8 years. Sells today for $30,000. It would be worth $0 in 5 years.'], ['New machine', '$70,000 plus $5,000 installation. Straight-line to $0 over 5 years. Sells for $10,000 in year 5.'], ['Savings', 'Operating costs fall by $22,000 a year.'], ['Working capital', 'Inventory rises by $4,000 now. Recovered in year 5.'], ['Tax and required return', 'Tax 30%. Required return 10%.']] } },
          { kind: 'example', title: 'Part 1: the initial investment', q: R`What is Wombat Widgets’ initial investment at \(t = 0\)?`,
            steps: [
              R`Old machine: \(Dep = \frac{\$40{,}000}{8} = ${M(WW.dOld)}\) a year. After 3 years, \(BV = \$40{,}000 - 3 \times ${M(WW.dOld)} = ${M(WW.bv)}\).`,
              R`It sells for \(\$30{,}000\): a gain of \(${M(WW.sale - WW.bv)}\). Tax on the gain: \(${M(WW.sale - WW.bv)} \times 0.30 = ${M((WW.sale - WW.bv) * WW.tc)}\).`,
              stmt([['New machine and installation', -(WW.price + WW.inst)], ['Sale of the old machine', WW.sale], ['Tax on the gain', -(WW.sale - WW.bv) * WW.tc], ['Increase in NWC', -WW.nwc], ['Initial investment', WW.init, 1]]),
            ],
            answer: R`Initial investment \(= ${M(WW.init)}\).`,
            ti: [TI.line('-(70000+5000)+30000-(30000-25000)*0.3-4000')] },
          { kind: 'learn', title: 'Part 2: incremental depreciation',
            body: R`If you replace, you **gain** the new machine’s depreciation but **lose** the old machine’s. Only the difference changes your tax:\n\n\[\Delta Dep = Dep_{new} - Dep_{old} = \frac{\$75{,}000}{5} - ${M(WW.dOld)} = ${M(WW.dInc)}\]`,
            viz: { type: 'bars', fmt: '$', key: true, bars: [
              { label: 'Keep old', parts: [{ v: WW.dOld, c: 1 }] },
              { label: 'Replace', parts: [{ v: WW.dOld, c: 1 }, { v: WW.dInc, c: 3 }] }],
              keys: [{ c: 1, label: R`What you would have anyway: \(${M(WW.dOld)}\)` }, { c: 3, label: R`Extra: \(\Delta Dep = ${M(WW.dInc)}\)` }],
              cap: 'Only the aqua part is new, so only it changes the tax you pay.' } },
          { kind: 'guided', title: 'Part 2: your turn', q: R`Find Wombat Widgets’ incremental operating cash flow in each of years 1 to 5. Costs fall by $22,000 a year, \(\Delta Dep = ${M(WW.dInc)}\) and tax is 30%.`,
            parts: [
              { ask: R`What is the incremental EBIT?`, answer: WW.save - WW.dInc, unit: '$', dp: 0, hint: 'The savings minus the incremental depreciation.', why: R`\(22{,}000 - 10{,}000 = \$12{,}000\).`, mistakes: [{ v: WW.save - WW.dNew, why: 'Use the incremental depreciation (new minus old), not the new machine’s alone.' }] },
              { ask: R`How much tax is paid on it?`, answer: (WW.save - WW.dInc) * WW.tc, unit: '$', dp: 0, hint: R`\(\text{EBIT} \times 0.30\)`, why: R`\(12{,}000 \times 0.30 = \$3{,}600\).` },
              { ask: R`What is the operating cash flow?`, answer: WW.ocf, unit: '$', dp: 0, hint: 'After-tax EBIT, plus the incremental depreciation added back.', why: R`\(12{,}000 - 3{,}600 + 10{,}000 = \$18{,}400\).`, mistakes: [{ v: (WW.save - WW.dInc) * (1 - WW.tc), why: 'Add back the $10,000 of incremental depreciation.' }] },
            ],
            answer: R`Operating cash flow \(= ${M(WW.ocf)}\) a year.`,
            ti: [TI.line('(22000-10000)*(1-0.3)+10000')] },
          { kind: 'example', title: 'Part 3 and the NPV', q: R`Find the terminal cash flow in year 5, and the NPV of replacing at 10%.`,
            steps: [
              R`Year 5: \(${M(WW.ocf)} + \$4{,}000 + \$10{,}000 - (\$10{,}000 - \$0)(0.30) = ${M(WW.term)}\).`,
              R`The cash flows: \(${M(WW.init)}\), then \(${M(WW.ocf)}\) in years 1 to 4, then \(${M(WW.term)}\).`,
              R`\(NPV = ${M(FIN.npv(WW.k, WW.cfs))} > 0\), so replace the machine.`,
            ],
            answer: R`\(NPV = ${M(FIN.npv(WW.k, WW.cfs))}\). Replacing adds value.`,
            ti: [TI.line('18400+4000+10000-(10000-0)*0.3'), tiNpv(WW.k, WW.cfs)] },
          { kind: 'learn', title: 'What to leave out',
            body: R`The rules for relevant cash flows still apply:`,
            viz: { type: 'compare', items: [
              { icon: '🎓', title: 'Training already paid', points: ['Sunk: spent either way'], c: 'grey', mark: 'bad', markText: 'Leave out' },
              { icon: '🏦', title: 'Loan interest', points: ['Financing: in the discount rate'], c: 'grey', mark: 'bad', markText: 'Leave out' },
              { icon: '🔄', title: 'Costs that change', points: ['Caused by replacing'], c: 3, mark: 'good', markText: 'Include' }],
              cap: 'Ask what **changes** because you replace. Only those cash flows count.' },
            points: [R`Training already paid for a similar machine: **sunk**, so leave it out.`, R`Interest on a loan for the new machine: **financing**, so leave it out.`, R`Only costs that **change** because of the replacement count.`] },
          { kind: 'check', gen: 'w5-g-rep-init' },
          { kind: 'check', gen: 'w5-g-rep-ocf' },
          { kind: 'recap', title: 'Remember', points: [
            R`Replacement: use **incremental** cash flows, new minus old.`,
            R`**Part 1**: the new price and installation, minus the after-tax sale of the old machine, plus the extra NWC.`,
            R`**Part 2**: \((\text{savings} - \Delta Dep)(1 - t_c) + \Delta Dep\).`,
            R`**Part 3**: the last operating cash flow \(+\) NWC back \(+\) after-tax salvage.`,
            R`Exam trap: use the **incremental** depreciation (new minus old), and tax the old machine’s sale only on its gain over book value.`] },
        ],
      },
    },

    questions: [
      /* ----- free cash flow ----- */
      { id: 'w5-q01', topic: 'fcf', kind: 'mcq', level: 1, section: 'A', src: 'Tutorial W5 concept check 1', formula: 'fcf',
        q: R`Which formula gives a project’s **free cash flow (FCF)**?`,
        choices: [R`\(FCF = (Rev - Costs - Dep)(1 - t_c) + Dep - CapEx - \Delta NWC\)`, R`\(FCF = (Rev - Costs - Dep)(1 - t_c) - CapEx - \Delta NWC\)`, R`\(FCF = (Rev - Costs - Dep)(1 - t_c) + Dep - CapEx + \Delta NWC\)`, R`\(FCF = (Rev - Costs - Dep - Interest)(1 - t_c) + Dep\)`], answer: 0,
        why: R`Start from after-tax operating profit, add back depreciation (not cash), then subtract capital spending and the **increase** in working capital. Interest is never included.` },
      { id: 'w5-q02', topic: 'fcf', kind: 'mcq', level: 1, section: 'A', src: 'Tutorial W5 concept check 4',
        q: R`Depreciation is not a cash flow. Why do we subtract it and then add it back?`,
        choices: ['Subtracting it lowers taxable income and the tax bill; adding it back undoes the non-cash charge', 'Because depreciation is paid in cash at the end of each year', 'To count the cost of the machine a second time', 'Because accountants require it, even though it has no effect on cash flow'], answer: 0,
        why: R`Depreciation saves real tax: \(Dep \times t_c\). Taking it off before tax and adding it back after tax leaves exactly that saving in the cash flow.` },
      { id: 'w5-q03', topic: 'fcf', kind: 'tf', level: 1, section: 'A', src: 'Lecture W5',
        q: R`Free cash flow is the cash a company is free to distribute to both its debtholders and its shareholders.`,
        answer: true, why: R`FCF is what is left after the firm has paid for the investments in working capital and long-term assets the project needs.` },
      { id: 'w5-q04', topic: 'fcf', kind: 'num', level: 1, section: 'B', src: 'Lecture W5 Example 4', formula: 'fcf',
        q: R`Splash Ltd’s new equipment adds $9,000 of revenue and $4,000 of costs a year. It can claim $3,000 of extra depreciation. The tax rate is 30%. What is the extra **after-tax cash flow** each year?`,
        answer: FIN.ocf(9000, 4000, 3000, 0.3), unit: '$', dp: 2,
        mistakes: [
          { v: 1400, why: 'That is earnings after tax. Add back the $3,000 of depreciation: it is not a cash cost.' },
          { v: 3500, why: R`That ignores the depreciation tax shield: \(\$3{,}000 \times 0.30 = \$900\).` },
          { v: 6500, why: R`That mixes the two methods. With the tax-shield method, add \(Dep \times t_c = \$900\), not the full $3,000.` },
        ],
        steps: [
          R`Method 1, add back depreciation:`,
          stmt([['Revenue', 9000], ['Costs', -4000], ['Depreciation', -3000], ['Earnings before tax', 2000, 1], ['Tax at 30%', -600], ['Earnings after tax', 1400, 1], ['Add back depreciation', 3000], ['Cash flow', 4400, 1]]),
          R`Method 2, depreciation tax shield: \[(\$9{,}000 - \$4{,}000)(1 - 0.30) + 0.30 \times \$3{,}000 = \$3{,}500 + \$900 = \$4{,}400\]`,
        ],
        ti: [TI.line('(9000-4000-3000)*(1-0.3)+3000')],
        why: R`Both methods give $4,400. Depreciation only matters through the tax it saves.` },
      { id: 'w5-q05', topic: 'tax', kind: 'num', level: 1, section: 'B', src: 'Lecture W5 Example 4', formula: 'dep-shield',
        q: R`Splash Ltd claims $3,000 of extra depreciation a year. The tax rate is 30%. How big is the yearly **depreciation tax shield**?`,
        answer: 900, unit: '$', dp: 2,
        mistakes: [
          { v: 3000, why: 'That is the depreciation itself. The shield is the tax it saves.' },
          { v: 2100, why: R`That is \(Dep \times (1 - t_c)\). The shield is \(Dep \times t_c\).` },
        ],
        steps: [R`\[\text{Tax shield} = Dep \times t_c = \$3{,}000 \times 0.30 = \$900\]`],
        ti: [TI.line('3000*0.3')],
        why: R`Each dollar of depreciation shields a dollar of income from tax, saving \(t_c\) dollars.` },
      { id: 'w5-q06', topic: 'fcf', kind: 'num', level: 1, section: 'B', src: 'Textbook Ch 9 P2', formula: 'fcf',
        q: R`Planet buys a $10 million machine, plus $50,000 to transport and install it. It is depreciated straight-line to zero over 5 years. It adds $4 million of revenue and $1.2 million of costs a year. The tax rate is 30%. What are the **incremental earnings** each year?`,
        answer: (4e6 - 1.2e6 - 2.01e6) * 0.7, unit: '$', dp: 2,
        mistakes: [
          { v: (4e6 - 1.2e6) * 0.7, why: 'That ignores depreciation. Earnings are after depreciation.' },
          { v: (4e6 - 1.2e6 - 2.01e6) * 0.7 + 2.01e6, why: 'That adds depreciation back, which gives the cash flow, not the earnings.' },
          { v: 4e6 - 1.2e6 - 2.01e6, why: 'That is earnings before tax. Take off 30% tax.' },
        ],
        steps: [R`\[Dep = \frac{\$10{,}000{,}000 + \$50{,}000}{5} = \$2{,}010{,}000\]`, R`\[\text{Earnings} = (\$4{,}000{,}000 - \$1{,}200{,}000 - \$2{,}010{,}000)(1 - 0.30) = \$553{,}000\]`],
        ti: [TI.line('(4000000-1200000-(10000000+50000)/5)*(1-0.3)')],
        why: R`Incremental earnings \(= (Rev - Costs - Dep)(1 - t_c)\). They are a step towards the cash flow, not the cash flow itself.` },
      { id: 'w5-q07', topic: 'fcf', kind: 'num', level: 2, section: 'B', src: 'Textbook Ch 9 P13 (Oakdale)', formula: 'fcf',
        q: R`Oakdale Enterprises forecasts the figures below for year 2 of an expansion. The tax rate is 30%. What is the **free cash flow** in year 2?`,
        table: { head: ['Item', 'Year 2'], rows: [['Sales', '$160,000'], ['Operating expenses', '$60,000'], ['Depreciation', '$36,000'], ['Capital expenditure', '$40,000'], ['Increase in NWC', '$8,000']] },
        answer: OAK, unit: '$', dp: 2,
        mistakes: [
          { v: OAK + 8000, why: 'Subtract the $8,000 increase in net working capital.' },
          { v: (160000 - 60000 - 36000) * 0.7, why: 'That is unlevered net income. Add back depreciation, then take off capex and the NWC increase.' },
          { v: OAK + 40000, why: 'Subtract the $40,000 of capital expenditure.' },
        ],
        steps: [
          stmt([['Sales', 160000], ['Operating expenses', -60000], ['Depreciation', -36000], ['EBIT', 64000, 1], ['Tax at 30%', -19200], ['Unlevered net income', 44800, 1], ['Add back depreciation', 36000], ['Capital expenditure', -40000], ['Increase in NWC', -8000], ['Free cash flow', OAK, 1]]),
        ],
        ti: [TI.line('(160000-60000-36000)*(1-0.3)+36000-40000-8000')],
        why: R`Year 2 FCF is $32,800. (Year 1 works the same way: $35,000.)` },
      { id: 'w5-q08', topic: 'fcf', kind: 'num', level: 1, section: 'B', src: 'Textbook Ch 9 P3',
        q: R`Better equipment will raise next year’s sales by 20% over the current 100,000 units. The price is $20 a unit. What is the **incremental revenue** next year?`,
        answer: 0.2 * 100000 * 20, unit: '$', dp: 2,
        mistakes: [
          { v: 1.2 * 100000 * 20, why: 'That is the total revenue next year. Only the extra 20% is incremental.' },
          { v: 100000 * 20, why: 'That is the current revenue, which happens anyway.' },
          { v: 0.2 * 100000, why: 'That is the extra units. Multiply by the $20 price.' },
        ],
        steps: [R`\[\text{Incremental revenue} = (0.20 \times 100{,}000) \times \$20 = 20{,}000 \times \$20 = \$400{,}000\]`],
        ti: [TI.line('0.2*100000*20')],
        why: R`Only the change caused by the upgrade counts: 20,000 extra units at $20.` },

      /* ----- tax effects ----- */
      { id: 'w5-q09', topic: 'tax', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W5',
        q: R`The tax rate is 30%. A project’s revenue rises by **$1**. How does its cash flow change?`,
        choices: ['It rises by $0.70', 'It rises by $1.00', 'It rises by $0.30', 'It falls by $0.30'], answer: 0,
        why: R`Revenue is taxed, so each extra dollar adds \(\$1 \times (1 - 0.30) = \$0.70\).` },
      { id: 'w5-q10', topic: 'tax', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W5',
        q: R`The tax rate is 30%. A project’s costs rise by **$1**. How does its cash flow change?`,
        choices: ['It falls by $0.70', 'It falls by $1.00', 'It falls by $0.30', 'It rises by $0.30'], answer: 0,
        why: R`Costs are tax-deductible, so each extra dollar of cost only removes \(\$1 \times (1 - 0.30) = \$0.70\).` },
      { id: 'w5-q11', topic: 'tax', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W5',
        q: R`The tax rate is 30%. A project’s depreciation rises by **$1**. How does its cash flow change?`,
        choices: ['It rises by $0.30', 'It falls by $1.00', 'It rises by $0.70', 'It does not change: depreciation is not cash'], answer: 0,
        why: R`Depreciation is not cash, but it lowers tax by \(\$1 \times 0.30 = \$0.30\). That saving is real cash.` },
      { id: 'w5-q12', topic: 'tax', kind: 'num', level: 1, section: 'B', src: 'Textbook Ch 9 P7', formula: 'dep-shield',
        q: R`Your depreciation expense is $500,000 and your tax rate is 30%. What is your **depreciation tax shield**?`,
        answer: 150000, unit: '$', dp: 2,
        mistakes: [
          { v: 350000, why: R`That is \(Dep \times (1 - t_c)\). The shield is \(Dep \times t_c\).` },
          { v: 500000, why: 'That is the depreciation itself. The shield is the tax it saves.' },
        ],
        steps: [R`\[\text{Tax shield} = Dep \times t_c = \$500{,}000 \times 0.30 = \$150{,}000\]`],
        ti: [TI.line('500000*0.3')],
        why: R`Each dollar of depreciation shields a dollar of income from tax.` },
      { id: 'w5-q13', topic: 'tax', kind: 'tf', level: 2, section: 'A', src: 'Lecture W5',
        q: R`All else equal, more depreciation means a higher free cash flow, because it lowers the tax bill.`,
        answer: true, why: R`Depreciation itself is not cash, but its tax shield \(Dep \times t_c\) is. More depreciation, less tax, more cash.` },

      /* ----- depreciation and book value ----- */
      { id: 'w5-q14', topic: 'dep', kind: 'num', level: 1, section: 'B', src: 'Textbook Ch 9 P1',
        q: R`Planet buys a $10 million machine. Transport and installation cost another $50,000. It is depreciated straight-line over 5 years with no salvage value. What is the yearly **depreciation**?`,
        answer: 10050000 / 5, unit: '$', dp: 2,
        mistakes: [
          { v: 10000000 / 5, why: 'Transport and installation are part of the machine’s cost. Depreciate $10,050,000.' },
          { v: 10050000, why: 'The cost is spread over the 5-year life, not expensed at once.' },
        ],
        steps: [R`Depreciable cost \(= \$10{,}000{,}000 + \$50{,}000 = \$10{,}050{,}000\).`, R`\[Dep = \frac{\$10{,}050{,}000}{5} = \$2{,}010{,}000\]`],
        ti: [TI.line('(10000000+50000)/5')],
        why: R`Everything spent to get the asset working is capitalised and depreciated.` },
      { id: 'w5-q15', topic: 'dep', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W5',
        q: R`What is an asset’s **book value**?`,
        choices: ['Its cost minus the depreciation claimed so far', 'The price it could be sold for today', 'Its original purchase price', 'The present value of its future cash flows'], answer: 0,
        why: R`\(BV = \text{Cost} - \text{accumulated depreciation}\). The market price can be above or below it.` },
      { id: 'w5-q16', topic: 'dep', kind: 'tf', level: 2, section: 'A', src: 'Textbook Ch 9 P2',
        q: R`An asset’s depreciable life must equal its economic life (how long it is really used).`,
        answer: false, why: R`The depreciable life comes from tax and accounting rules. The asset may keep working long after it is fully depreciated.` },
      { id: 'w5-q17', topic: 'dep', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W5',
        q: R`Under the **diminishing value** method, each year’s depreciation is…`,
        choices: ['A fixed percentage of the start-of-year book value, so it falls over time', 'The same dollar amount every year', 'A fixed percentage of the original cost', 'Zero until the asset is sold'], answer: 0,
        why: R`\(D_t = r \times BV_{t-1}\). As book value falls, so does depreciation. Straight-line gives the same amount each year.` },
      { id: 'w5-q18', topic: 'dep', kind: 'mcq', level: 1, section: 'B', src: 'Lecture W5 Example 5',
        q: R`Nutson Bolz’s new machine costs $50,000, plus $3,000 shipping and $2,000 installation. It is depreciated straight-line to zero over 5 years, even though it can be sold for $10,000 at the end. What is its yearly depreciation?`,
        choices: ['$11,000', '$10,000', '$8,000', '$9,000'], answer: 0,
        wrong: { 1: R`Shipping and installation are part of the cost: \(\$55{,}000 \div 5\).`, 2: 'It is depreciated to zero, so do not subtract the $10,000 salvage.', 3: 'That is the incremental depreciation (new $11,000 minus old $2,000).' },
        ti: [TI.line('(50000+3000+2000)/5')],
        why: R`\(Dep = \frac{\$50{,}000 + \$3{,}000 + \$2{,}000}{5} = \$11{,}000\). The salvage is taxed when the machine is sold.` },

      /* ----- net working capital ----- */
      { id: 'w5-q19', topic: 'nwc', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W5',
        q: R`A project needs **$50,000 more inventory** at the start. How is this treated?`,
        choices: ['As a cash outflow now, recovered as an inflow when the project ends', 'As an expense that lowers taxable income', 'It is ignored: inventory is not a cash flow', 'As a cash inflow now, because inventory is an asset'], answer: 0,
        why: R`Cash tied up in working capital is an outflow. It is not used up, so it comes back at the end.` },
      { id: 'w5-q20', topic: 'nwc', kind: 'tf', level: 1, section: 'A', src: 'Lecture W5',
        q: R`In BFC2140, net working capital is assumed to be recovered 100% at the end of a project, unless you are told otherwise.`,
        answer: true, why: R`Inventory is sold off and receivables are collected, so the cash invested in NWC returns at the end.` },
      { id: 'w5-q21', topic: 'nwc', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W5',
        q: R`Why do we track changes in net working capital separately from earnings?`,
        choices: ['Earnings record sales and costs when they happen, not when the cash moves', 'Because NWC is taxed at a higher rate', 'Because NWC is a sunk cost', 'Because NWC is depreciated'], answer: 0,
        why: R`A sale is booked before the customer pays, and inventory is bought before it is sold. The NWC adjustment turns earnings timing into cash timing.` },
      { id: 'w5-q22', topic: 'nwc', kind: 'num', level: 2, section: 'B', src: 'Tutorial W5 Q3 (IFC)',
        q: R`IFC’s new unit needs $40,000 of working capital at the start, plus $10,000 more in each of years 1 to 4. All of it is recovered in year 5. How much **NWC is recovered** in year 5?`,
        answer: 80000, unit: '$', dp: 2,
        mistakes: [
          { v: 40000, why: 'The extra $10,000 put in each year from 1 to 4 comes back too.' },
          { v: 50000, why: 'There are four yearly top-ups of $10,000, not one.' },
          { v: 0, why: 'In BFC2140, NWC is recovered in full at the end.' },
        ],
        steps: [R`\[\$40{,}000 + 4 \times \$10{,}000 = \$80{,}000\]`],
        ti: [TI.line('40000+4*10000')],
        why: R`Everything put into working capital over the project’s life comes back at the end.` },

      /* ----- salvage and terminal cash flow ----- */
      { id: 'w5-q23', topic: 'salvage', kind: 'mcq', level: 1, section: 'A', formula: 'salvage',
        q: R`Which formula gives the **after-tax salvage value**?`,
        choices: [R`\(SV - (SV - BV)\,t_c\)`, R`\(SV \times (1 - t_c)\)`, R`\(SV + (SV - BV)\,t_c\)`, R`\(BV - (SV - BV)\,t_c\)`], answer: 0,
        why: R`Only the **gain** over book value is taxed. If \(SV < BV\), the “tax” is negative: a tax saving.` },
      { id: 'w5-q24', topic: 'salvage', kind: 'num', level: 1, section: 'B', src: 'Mock MST Q19', formula: 'salvage',
        q: R`In the final year a project has $10,000 of after-tax operating cash flow. A fully depreciated machine is sold for $1,000. The $2,000 of working capital put in at the start is recovered. The tax rate is 40%. What is the final year’s **cash flow**?`,
        answer: 10000 + 2000 + FIN.afterTaxSalvage(1000, 0, 0.4), unit: '$', dp: 2,
        mistakes: [
          { v: 13000, why: 'The machine is fully depreciated, so the whole $1,000 is a taxable gain: tax $400.' },
          { v: 10600, why: 'Add back the $2,000 of working capital that is recovered.' },
          { v: 11800, why: 'NWC recovery is not taxed. Only the gain on the machine is.' },
        ],
        steps: [R`After-tax sale of the machine: \(\$1{,}000 - (\$1{,}000 - \$0) \times 0.40 = \$600\).`, R`\[CF_n = \$10{,}000 + \$2{,}000 + \$600 = \$12{,}600\]`],
        ti: [TI.line('10000+2000+1000-(1000-0)*0.4')],
        why: R`Add the final operating cash flow, the NWC recovered and the after-tax salvage.` },
      { id: 'w5-q25', topic: 'salvage', kind: 'num', level: 2, section: 'B', formula: 'salvage',
        q: R`A machine with a book value of $40,000 is sold for $30,000. The tax rate is 30%. What is the **after-tax cash** from the sale?`,
        answer: FIN.afterTaxSalvage(30000, 40000, 0.3), unit: '$', dp: 2,
        mistakes: [
          { v: 27000, why: 'A sale below book value is a loss, which saves tax. The saving is added, not subtracted.' },
          { v: 30000, why: 'The $10,000 loss is tax-deductible: it saves $3,000.' },
          { v: 21000, why: 'Only the gain or loss is taxed, not the whole price.' },
        ],
        steps: [R`Loss \(= \$30{,}000 - \$40{,}000 = -\$10{,}000\). Tax saved \(= \$10{,}000 \times 0.30 = \$3{,}000\).`, R`\[\$30{,}000 - (\$30{,}000 - \$40{,}000)(0.30) = \$33{,}000\]`],
        ti: [TI.line('30000-(30000-40000)*0.3')],
        why: R`Selling below book value creates a tax saving, so you keep more than the sale price.` },
      { id: 'w5-q26', topic: 'salvage', kind: 'num', level: 2, section: 'B', src: 'Lecture W5 Example 5', formula: 'salvage',
        q: R`Nutson Bolz sells its old machine for $15,000. Its book value is $10,000 and the tax rate is 47%. How much **tax** is paid on the sale?`,
        answer: (15000 - 10000) * 0.47, unit: '$', dp: 2,
        mistakes: [
          { v: 15000 * 0.47, why: 'Only the gain over book value is taxed, not the whole price.' },
          { v: 10000 * 0.47, why: 'Tax the gain ($5,000), not the book value.' },
        ],
        steps: [R`Gain \(= \$15{,}000 - \$10{,}000 = \$5{,}000\).`, R`\[\text{Tax} = \$5{,}000 \times 0.47 = \$2{,}350\]`],
        ti: [TI.line('(15000-10000)*0.47')],
        why: R`The after-tax cash from the sale is \(\$15{,}000 - \$2{,}350 = \$12{,}650\).` },
      { id: 'w5-q27', topic: 'salvage', kind: 'tf', level: 1, section: 'A', formula: 'salvage',
        q: R`If an asset is sold for exactly its book value, no tax is paid on the sale.`,
        answer: true, why: R`There is no gain or loss: \(SV - BV = 0\), so the after-tax salvage equals the sale price.` },

      /* ----- relevant cash flows ----- */
      { id: 'w5-q28', topic: 'relevant', kind: 'mcq', level: 1, section: 'A', src: 'Tutorial W5 concept check 2',
        q: R`Which cost should you **include** in a capital budgeting decision?`,
        choices: ['An opportunity cost', 'A sunk cost', 'Interest expense', 'An allocated share of fixed overheads'], answer: 0,
        why: R`An opportunity cost is value you give up because of the project. Sunk costs, interest and allocated overheads are excluded.` },
      { id: 'w5-q29', topic: 'relevant', kind: 'mcq', level: 1, section: 'A', src: 'Tutorial W5 concept check 3',
        q: R`Which of these would you **not** consider in a capital budgeting decision?`,
        choices: ['The cost of a marketing study completed last year', 'The extra tax the firm will pay next year because of the project', 'The chance to lease out a warehouse instead of using it for the new line', 'The change in direct labour cost from buying a new machine'], answer: 0,
        why: R`The marketing study is already paid for: a sunk cost. The other three only change because of the project.` },
      { id: 'w5-q30', topic: 'relevant', kind: 'mcq', level: 1, section: 'A', src: 'Tutorial W5 concept check 5',
        q: R`Cameron Industries buys a $6 million machine. Delivery and installation cost $10,000. It must also build a $3 million clean room for the machine. What goes into the **initial outlay**?`,
        choices: ['The machine, the delivery and installation, and the clean room', 'The machine only', 'The machine plus delivery and installation only', 'The clean room only'], answer: 0,
        why: R`Everything needed to get the machine running is part of the initial investment: \(\$6{,}000{,}000 + \$10{,}000 + \$3{,}000{,}000\).` },
      { id: 'w5-q31', topic: 'relevant', kind: 'mcq', level: 2, section: 'A', src: 'Tutorial W5 Q1 (Home Builder Supply)',
        q: R`Home Builder Supply already owns the land for a new store. It could sell the land for $13,000. How should this be treated?`,
        choices: ['Include it: selling the land is an opportunity given up', 'Exclude it: the land was paid for long ago', 'Include the land’s original purchase price instead', 'Exclude it: land is never depreciated'], answer: 0,
        why: R`Using the land means giving up its sale proceeds (after tax). That is an **opportunity cost**. The original price is sunk.` },
      { id: 'w5-q32', topic: 'relevant', kind: 'mcq', level: 2, section: 'A', src: 'Tutorial W5 Q1 (Home Builder Supply)',
        q: R`Some customers of Home Builder Supply’s existing store will shop at the new store instead. How should their lost sales at the old store be treated?`,
        choices: ['Deduct them: they are a side effect (cannibalisation) of the new store', 'Ignore them: they belong to the old store', 'Add them to the new store’s revenue', 'Ignore them: they are sunk'], answer: 0,
        why: R`The firm only gains the **extra** sales. Sales that just move from the old store to the new one are not incremental.` },
      { id: 'w5-q33', topic: 'relevant', kind: 'mcq', level: 1, section: 'A', src: 'Tutorial W5 Q1 (Home Builder Supply)',
        q: R`Last month Home Builder Supply spent $13,000 on market research for the new store. How should this be treated?`,
        choices: ['Exclude it: it is a sunk cost', 'Include it as part of the initial outlay', 'Include it as an opportunity cost', 'Spread it over the life of the store'], answer: 0,
        why: R`The money is already spent, whatever the decision. Sunk costs never affect the NPV of a future decision.` },
      { id: 'w5-q34', topic: 'relevant', kind: 'mcq', level: 2, section: 'A', src: 'Tutorial W5 Q1 (Home Builder Supply)',
        q: R`Home Builder Supply borrows to pay for construction. How should the **interest** on this debt be treated?`,
        choices: ['Exclude it: the discount rate already includes the cost of debt, so including it double counts', 'Include it: it is a real cash outflow', 'Include it only after tax', 'Include it only in the first year'], answer: 0,
        why: R`Financing costs are captured by the discount rate (the cost of capital). The cash flows are **unlevered**.` },
      { id: 'w5-q35', topic: 'relevant', kind: 'mcq', level: 1, section: 'A', src: 'Tutorial W5 Q1 (Home Builder Supply)',
        q: R`There is an abandoned warehouse on Home Builder Supply’s land. How should the cost of **demolishing** it be treated?`,
        choices: ['Include it: it is a cost of opening the new store', 'Exclude it: the warehouse was already there', 'Exclude it: it is a sunk cost', 'Include only half of it'], answer: 0,
        why: R`The demolition only happens if the store is built, so it is an incremental cost.` },
      { id: 'w5-q36', topic: 'relevant', kind: 'mcq', level: 1, section: 'A', src: 'Mock MST Q28',
        q: R`You are deciding whether to retire your modem and buy a new one with new features. Which item is **irrelevant** to the decision?`,
        choices: ['$50,000 already spent on research and development for the old modem', 'The price of the new modem', 'What the old modem can be sold for today', 'The extra revenue from the new features'], answer: 0,
        why: R`The research money is spent whatever you decide: a sunk cost.` },
      { id: 'w5-q37', topic: 'relevant', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W5',
        q: R`Head office charges every project a share of its existing rent. How should this charge be treated in a project’s cash flows?`,
        choices: ['Exclude it: the rent is paid whether or not the project goes ahead', 'Include it in full', 'Include half of it', 'Include it as an opportunity cost'], answer: 0,
        why: R`Allocated overheads are not incremental. Only a **change** in fixed costs (extra rent, power or salaries) belongs to the project.` },
      { id: 'w5-q38', topic: 'relevant', kind: 'tf', level: 1, section: 'A', src: 'Lecture W5',
        q: R`To decide whether a cash flow is relevant, ask: “Will it happen **only if** the project is accepted?”`,
        answer: true, why: R`Yes: include it. No: exclude it. Partly: include only the part caused by the project.` },
      { id: 'w5-q39', topic: 'relevant', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W5 Example 5',
        q: R`Three months ago Nutson Bolz paid $5,000 to train workers on a similar machine. Management wonders whether to charge **half** of it to the new machine. What should it do?`,
        choices: ['Charge nothing: the training is a sunk cost', 'Charge half: $2,500', 'Charge the full $5,000', 'Charge it as an opportunity cost'], answer: 0,
        why: R`The training has already happened and been paid for. It does not change with this decision.` },
      { id: 'w5-q40', topic: 'relevant', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W5 Example 5',
        q: R`To buy the new machine, Nutson Bolz borrows $20,000 at 10%, paying $2,000 of interest a year. How is the interest treated in the NPV analysis?`,
        choices: ['It is ignored: financing costs are captured by the 20% required return', 'It is subtracted each year before tax', 'It is subtracted each year after tax', 'It is added to the initial investment'], answer: 0,
        why: R`Including interest in the cash flows and also discounting at the required return would count the cost of money twice.` },

      /* ----- inflation ----- */
      { id: 'w5-q41', topic: 'inflation', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W5', formula: 'fisher',
        q: R`How must **nominal** cash flows be discounted?`,
        choices: ['At the nominal rate', 'At the real rate', 'At the inflation rate', 'At the nominal rate plus inflation'], answer: 0,
        why: R`Be consistent: nominal with nominal, real with real. Done properly, both give the same NPV.` },
      { id: 'w5-q42', topic: 'inflation', kind: 'num', level: 1, section: 'B', src: 'Lecture W5 Example 2', formula: 'fisher',
        q: R`The nominal interest rate is 14% and inflation is 5%. What is the **real** interest rate?`,
        answer: P(EX2_REAL), unit: '%', dp: 2,
        mistakes: [
          { v: 9, why: R`Subtracting is only an approximation. Use the Fisher relation: \(\frac{1.14}{1.05} - 1\).` },
          { v: P(1.14 * 1.05 - 1), why: 'That multiplies. To remove inflation, divide by 1.05.' },
        ],
        steps: [R`\[1 + r_{real} = \frac{1 + r_{nominal}}{1 + i} = \frac{1.14}{1.05} = ${L.numT(1.14 / 1.05, 6)}\]`, R`\[r_{real} = ${L.pct(EX2_REAL, 4)}\]`],
        ti: [TI.line('1.14/1.05-1', { pct: true, note: 'A decimal: times 100 gives the percentage.' })],
        why: R`The exact real rate is 8.5714%, a little below the 9% shortcut.` },
      { id: 'w5-q43', topic: 'inflation', kind: 'num', level: 2, section: 'B', src: 'Lecture W5 Example 2', formula: 'npv',
        q: R`Shields Electric forecasts **nominal** cash flows of −$1,000, $600 and $650 in years 0, 1 and 2. The nominal rate is 14% and inflation is 5%. What is the project’s **NPV**?`,
        tl: { cfs: [-1000, 600, 650], unit: 'Year' },
        answer: FIN.npv(0.14, EX2), unit: '$', dp: 2,
        mistakes: [
          { v: FIN.npv(EX2_REAL, EX2), why: 'Nominal cash flows must be discounted at the nominal rate (14%), not the real rate.' },
          { v: FIN.npv(0.14, EX2R), why: 'You deflated the cash flows but kept the nominal rate. Keep them consistent.' },
          { v: 250, why: 'That ignores discounting.' },
        ],
        steps: [
          R`Nominal with nominal: \[NPV = -\$1{,}000 + \frac{\$600}{1.14} + \frac{\$650}{1.14^{2}} = ${M(FIN.npv(0.14, EX2))}\]`,
          R`Real with real gives the same: real cash flows \(\$571.43\) and \(\$589.57\) at \(r = 8.5714\%\) also give \(${M(FIN.npv(EX2_REAL, EX2R))}\).`,
        ],
        calc: npvKeys(EX2, 0.14),
        ti: [TI.cmd('npv', [14, -1000, [600, 650]], { note: 'Nominal cash flows with the nominal rate.' })],
        why: R`Consistent treatment gives $26.47 both ways. The inflation rate is only needed for the real-with-real check.` },
      { id: 'w5-q44', topic: 'inflation', kind: 'num', level: 2, section: 'B', src: 'Lecture W5 Example 3', formula: 'fisher',
        q: R`An investment of $10,000 will generate **real** cash flows of $5,000 at the end of each of the next 3 years. Inflation is 10% a year and the nominal required return is 15%. What is the **NPV**?`,
        answer: -10000 + FIN.pvAnnuity(5000, EX3_REAL, 3), unit: '$', dp: 2,
        mistakes: [
          { v: -10000 + FIN.pvAnnuity(5000, 0.15, 3), why: 'Real cash flows need the real rate. Discounting them at 15% understates the NPV.' },
          { v: -10000 + FIN.pvAnnuity(5000, 0.05, 3), why: R`The real rate is \(\frac{1.15}{1.10} - 1 = 4.5455\%\), not the 5% shortcut.` },
          { v: FIN.npv(EX3_REAL, [-10000, 5500, 6050, 6655]), why: 'You inflated the cash flows but used the real rate. Keep them consistent.' },
        ],
        steps: [
          R`Real rate: \(\frac{1.15}{1.10} - 1 = ${L.pct(EX3_REAL, 4)}\).`,
          R`\[NPV = -\$10{,}000 + \$5{,}000 \times \frac{1}{0.0454545}\left(1 - \frac{1}{1.0454545^{3}}\right) = ${M(-10000 + FIN.pvAnnuity(5000, EX3_REAL, 3))}\]`,
          R`Check, nominal with nominal: cash flows \(\$5{,}500\), \(\$6{,}050\), \(\$6{,}655\) at 15% give the same \(${M(FIN.npv(0.15, [-10000, 5500, 6050, 6655]))}\).`,
        ],
        ti: [TI.line('1.15/1.1-1', { note: 'The real rate, as a decimal.' }), TI.line('npv(100*ans,-10000,{5000,5000,5000})', { note: R`\(100 \times \text{ans}\) is the real rate as a percentage. Real cash flows with the real rate.` })],
        why: R`Real with real or nominal with nominal: both give $3,733.05.` },
      { id: 'w5-q45', topic: 'inflation', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W5',
        q: R`What happens if you discount **real** cash flows at the **nominal** rate?`,
        choices: ['The NPV is understated (too low)', 'The NPV is overstated (too high)', 'Nothing: the NPV is the same', 'Only the IRR changes'], answer: 0,
        why: R`The nominal rate includes inflation, but real cash flows do not. The discounting is too harsh, so good projects can be wrongly rejected.` },

      /* ----- replacement decision ----- */
      { id: 'w5-q46', topic: 'replace', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W5',
        q: R`A standard project cash flow has **three parts**. Which list is right?`,
        choices: ['Initial investment, operating cash flows, terminal cash flow', 'Revenue, costs, profit', 'Payback, NPV, IRR', 'Debt, equity, dividends'], answer: 0,
        why: R`Part 1 at \(t = 0\), part 2 every year, part 3 in the final year. The replacement question in exams follows this structure.` },
      { id: 'w5-q47', topic: 'replace', kind: 'num', level: 2, section: 'B', src: 'Lecture W5 Example 5', formula: 'salvage',
        q: R`Nutson Bolz may replace its old machine (details below). What is the **initial investment** at \(t = 0\)?`,
        table: NB_TABLE,
        answer: NB.init, unit: '$', dp: 2,
        mistakes: [
          { v: -55000 + 15000 - 5000, why: R`Selling the old machine above book value creates tax: \((\$15{,}000 - \$10{,}000) \times 47\% = \$2{,}350\).` },
          { v: -55000 + 15000 - 2350, why: 'Include the $5,000 increase in working capital.' },
          { v: NB.init - 2500, why: 'The training was paid 3 months ago: a sunk cost. Charge none of it.' },
          { v: -55000 + 15000 * 0.53 - 5000, why: 'Only the gain over book value is taxed, not the whole sale price.' },
        ],
        steps: [
          R`Old machine: \(Dep = \frac{\$20{,}000}{10} = \$2{,}000\) a year, so after 5 years \(BV = \$10{,}000\).`,
          stmt([['New machine, shipping, installation', -55000], ['Sale of old machine', 15000], ['Tax on gain (5,000 × 47%)', -2350], ['Increase in NWC', -5000], ['Initial investment', NB.init, 1]]),
        ],
        ti: [TI.line('-(50000+3000+2000)+15000-(15000-10000)*0.47-5000')],
        why: R`New cost, minus the after-tax proceeds of the old machine, plus the working capital. Training and interest are ignored.` },
      { id: 'w5-q48', topic: 'replace', kind: 'num', level: 2, section: 'B', src: 'Lecture W5 Example 5', formula: 'fcf',
        q: R`For Nutson Bolz (details below), what is the incremental **operating cash flow** in each of years 1 to 5?`,
        table: NB_TABLE,
        answer: NB.ocf, unit: '$', dp: 2,
        mistakes: [
          { v: (21000 - 11000) * 0.53 + 11000, why: 'Use the incremental depreciation: the new $11,000 minus the old $2,000 that is lost.' },
          { v: 12000 * 0.53, why: 'That is earnings after tax. Add back the $9,000 of incremental depreciation.' },
          { v: 21000 * 0.53, why: 'That ignores the depreciation tax shield on the extra $9,000 of depreciation.' },
          { v: (12000 - 2000) * 0.53 + 9000, why: 'The $2,000 of loan interest is a financing cost. Leave it out.' },
        ],
        steps: [
          R`Savings: salary and benefits \(\$17{,}000\); maintenance and defects \((\$7{,}000 + \$3{,}000) - (\$2{,}000 + \$4{,}000) = \$4{,}000\).`,
          R`Incremental depreciation: \(\frac{\$55{,}000}{5} - \frac{\$20{,}000}{10} = \$11{,}000 - \$2{,}000 = \$9{,}000\).`,
          stmt([['Savings', 21000], ['Incremental depreciation', -9000], ['EBIT', 12000, 1], ['Tax at 47%', -5640], ['EAT', 6360, 1], ['Add back depreciation', 9000], ['Operating cash flow', NB.ocf, 1]]),
        ],
        ti: [TI.line('55000/5-20000/10', { note: 'Incremental depreciation: new minus old.' }), TI.line('(17000+4000-ans)*(1-0.47)+ans', { note: R`\(\text{ans}\) is the \(\$9{,}000\) of incremental depreciation.` })],
        why: R`Take the incremental savings (new minus old), deduct the incremental depreciation, tax the result, then add the depreciation back.` },
      { id: 'w5-q49', topic: 'replace', kind: 'num', level: 2, section: 'B', src: 'Lecture W5 Example 5', formula: 'salvage',
        q: R`For Nutson Bolz (details below), the operating cash flow is $15,360 a year. What is the **terminal cash flow** in year 5?`,
        table: NB_TABLE,
        answer: NB.term, unit: '$', dp: 2,
        mistakes: [
          { v: 15360 + 5000 + 10000, why: 'The machine is fully depreciated, so the $10,000 sale is a taxable gain: tax $4,700.' },
          { v: 15360 + 10000 - 4700, why: 'Add back the $5,000 of working capital recovered in year 5.' },
          { v: 5000 + 10000 - 4700, why: 'The terminal cash flow includes year 5’s operating cash flow too.' },
        ],
        steps: [stmt([['Year 5 operating cash flow', 15360], ['NWC recovered', 5000], ['Salvage value', 10000], ['Tax on gain (10,000 × 47%)', -4700], ['Terminal cash flow', NB.term, 1]])],
        ti: [TI.line('15360+5000+10000-(10000-0)*0.47')],
        why: R`The book value in year 5 is $0, so the whole $10,000 salvage is a taxable gain.` },
      { id: 'w5-q50', topic: 'replace', kind: 'num', level: 3, section: 'B', src: 'Lecture W5 Example 5', formula: 'npv', boss: true,
        q: R`Nutson Bolz’s incremental cash flows are below. The required return is 20%. What is the **NPV** of replacing the machine?`,
        table: { head: ['Year', 'Cash flow'], rows: NB.cfs.map((c, t) => [t, cell(c)]) },
        answer: FIN.npv(0.2, NB.cfs), unit: '$', dp: 2,
        mistakes: [
          { v: -47350 + FIN.pvAnnuity(15360, 0.2, 5), why: 'Year 5 is $25,660, not $15,360: it includes NWC recovery and after-tax salvage.' },
          { v: sum(NB.cfs), why: 'That ignores discounting.' },
          { v: FIN.npv(0.2, NB.cfs) + 15360 / Math.pow(1.2, 5), why: 'The $25,660 already includes year 5’s operating cash flow. Do not add it twice.' },
        ],
        steps: [R`\[NPV = -\$47{,}350 + ${annuityPV(15360, 0.2, 4)} + \frac{\$25{,}660}{1.2^{5}}\]`, R`\[NPV = -\$47{,}350 + ${M(FIN.pvAnnuity(15360, 0.2, 4))} + ${M(25660 / Math.pow(1.2, 5))} = ${M(FIN.npv(0.2, NB.cfs))}\]`, R`\(IRR = ${L.pct(FIN.irr(NB.cfs))} > 20\%\).`],
        calc: npvKeys(NB.cfs, 0.2),
        ti: [tiNpv(0.2, NB.cfs, { note: R`\(\$15{,}360\) four times, then \(\$25{,}660\) once.` })],
        why: R`\(NPV > 0\) and \(IRR > 20\%\): replace the machine. It creates wealth for the owner.` },
      { id: 'w5-q51', topic: 'replace', kind: 'num', level: 2, section: 'B', src: 'Tutorial W5 Q2 (Springvale)', formula: 'fcf',
        q: R`A $60,000 machine would replace a worker paid $25,500 a year. It costs $8,000 a year to maintain and is depreciated straight-line to zero over 20 years. The tax rate is 30%. What is the yearly **free cash flow** from the swap?`,
        answer: SV.fcf, unit: '$', dp: 2,
        mistakes: [
          { v: (25500 - 8000) * 0.7, why: R`That ignores the depreciation tax shield: \(\$3{,}000 \times 0.30 = \$900\).` },
          { v: (25500 - 8000 - 3000) * 0.7, why: 'That is earnings after tax. Add back the $3,000 of depreciation.' },
          { v: (25500 - 8000) * 0.7 + 3000, why: R`That mixes the two methods. Add \(Dep \times t_c = \$900\), not the full $3,000.` },
        ],
        steps: [
          R`\(Dep = \frac{\$60{,}000}{20} = \$3{,}000\).`,
          stmt([['Salary saved', 25500], ['Maintenance', -8000], ['Depreciation', -3000], ['EBIT', 14500, 1], ['Tax at 30%', -4350], ['EAT', 10150, 1], ['Add back depreciation', 3000], ['Free cash flow', SV.fcf, 1]]),
        ],
        ti: [TI.line('(25500-8000-60000/20)*(1-0.3)+60000/20')],
        why: R`Tax-shield check: \((\$25{,}500 - \$8{,}000)(0.7) + \$3{,}000 \times 0.3 = \$12{,}250 + \$900 = \$13{,}150\).` },
      { id: 'w5-q52', topic: 'replace', kind: 'num', level: 3, section: 'B', src: 'Tutorial W5 Q2 (Springvale)', formula: 'npv',
        q: R`The Springvale machine costs $60,000 and produces a free cash flow of $13,150 a year for 20 years. The cost of capital is 15%. What is the **NPV**?`,
        answer: FIN.npv(0.15, SV.cfs), unit: '$', dp: 2,
        mistakes: [
          { v: -60000 + FIN.pvAnnuity(12250, 0.15, 20), why: 'Use the full $13,150, including the depreciation tax shield.' },
          { v: -60000 + 20 * 13150, why: 'That ignores discounting.' },
          { v: FIN.pvAnnuity(13150, 0.15, 20), why: 'That is only the PV of the cash flows. Subtract the $60,000 cost.' },
        ],
        steps: [R`\[NPV = -\$60{,}000 + ${annuityPV(13150, 0.15, 20)} = -\$60{,}000 + ${M(FIN.pvAnnuity(13150, 0.15, 20))} = ${M(FIN.npv(0.15, SV.cfs))}\]`, R`\(IRR = ${L.pct(FIN.irr(SV.cfs))} > 15\%\), so both rules say accept.`],
        calc: npvKeys(SV.cfs, 0.15),
        ti: [tiNpv(0.15, SV.cfs, { note: R`The count list \(\{20\}\) repeats the \(\$13{,}150\) twenty times.` })],
        why: R`NPV and IRR agree, as expected for a single, independent decision.` },
      { id: 'w5-q53', topic: 'replace', kind: 'num', level: 3, section: 'B', src: 'Tutorial W5 Q3 (IFC)', formula: 'salvage',
        q: R`International Foods (IFC) may replace its seafood unit (details below). What is the net **initial investment** at \(t = 0\)?`,
        table: IFC_TABLE,
        answer: -522500, unit: '$', dp: 2,
        mistakes: [
          { v: -515000, why: 'The old unit sells $25,000 above book value: tax of $7,500 is due.' },
          { v: -482500, why: 'Include the $40,000 of working capital needed at the start.' },
          { v: -472500, why: 'Shipping and installation ($50,000) are part of the new unit’s cost.' },
          { v: -597500, why: 'Only the $25,000 gain is taxed, not the whole sale price.' },
        ],
        steps: [stmt([['New unit, shipping, installation', -750000], ['Working capital', -40000], ['Sale of old unit', 275000], ['Tax on gain (25,000 × 30%)', -7500], ['Net initial investment', -522500, 1]])],
        ti: [TI.line('-(700000+50000)-40000+275000-(275000-250000)*0.3')],
        why: R`The loan is financing, so it does not appear. The old unit’s sale is taxed only on its gain over book value.` },
      { id: 'w5-q54', topic: 'replace', kind: 'mcq', level: 3, section: 'B', src: 'Tutorial W5 Q3 (IFC)', boss: true,
        q: R`IFC’s incremental cash flows from replacing its unit are below. The cost of capital is 12%. What should IFC do?`,
        table: { head: ['Year', 'Net cash flow'], rows: IFC.map((c, t) => [t, cell(c)]) },
        choices: ['Keep the old unit: the NPV of replacing is negative', 'Replace: revenue rises by $100,000 a year', 'Replace: the IRR of the swap is positive', 'Keep the old unit: the 18% loan interest is too expensive'], answer: 0,
        wrong: { 2: R`A positive IRR is not enough. It must beat the 12% cost of capital, and it is only ${T.pct(FIN.irr(IFC))}.`, 3: 'The loan interest is a financing cost and never enters the cash flows. The decision rests on the NPV.' },
        steps: [
          R`Years 1–4: OCF \(= (\$100{,}000 + \$20{,}000 - \$100{,}000)(0.7) + \$100{,}000 = \$114{,}000\), less \(\$10{,}000\) extra NWC \(= \$104{,}000\).`,
          R`Year 5: \(\$114{,}000 + \$75{,}000(1 - 0.3) + \$80{,}000 = \$246{,}500\).`,
          R`\[NPV = -\$522{,}500 + ${annuityPV(104000, 0.12, 4)} + \frac{\$246{,}500}{1.12^{5}} = ${M(FIN.npv(0.12, IFC))}\]`,
        ],
        calc: npvKeys(IFC, 0.12),
        ti: [tiNpv(0.12, IFC, { note: 'A negative NPV: replacing destroys value.' })],
        why: R`\(NPV = -\$66{,}744.95 < 0\), so replacing destroys value. Keep the old unit.` },
      { id: 'w5-q55', topic: 'replace', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W5',
        q: R`In a replacement decision, what is the **incremental depreciation**?`,
        choices: ['The new machine’s depreciation minus the old machine’s depreciation', 'The new machine’s depreciation only', 'The old machine’s depreciation only', 'The sum of both machines’ depreciation'], answer: 0,
        why: R`If you replace, you gain the new machine’s depreciation but lose the old one’s. Only the difference changes your tax.` },
      { id: 'w5-q56', topic: 'replace', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W5',
        q: R`In a replacement, the old machine is sold today for **more than its book value**. How does this affect the initial investment?`,
        choices: ['The sale brings cash in, but tax on the gain reduces it', 'The whole sale price is taxed', 'The sale is ignored: the old machine is sunk', 'The sale increases the tax shield on the new machine'], answer: 0,
        why: R`After-tax proceeds \(= SV - (SV - BV)\,t_c\). They reduce the net initial investment.` },

      /* ----- full project analysis (case study) ----- */
      { id: 'w5-q57', topic: 'project', kind: 'mcq', level: 2, section: 'A', src: 'Tutorial W5 case study (Monash Fibre)',
        q: R`Consultants value Monash Fibre’s project at $48.75 million: 10 years of net income at $4.875 million a year. What is wrong with their analysis?`,
        table: CASE_TABLE,
        choices: ['They used earnings, not cash flows; ignored the $10m working capital; kept $1m of non-incremental overhead; and did not discount', 'They forgot to include their own $1m fee', 'They forgot the interest on the loan for the equipment', 'Nothing: ten years of earnings is the right value'], answer: 0,
        why: R`Value comes from discounted, incremental free cash flows. Add back depreciation, subtract the $25m equipment and $10m NWC, drop the $1m of overhead that happens anyway, and discount.` },
      { id: 'w5-q58', topic: 'project', kind: 'mcq', level: 1, section: 'A', src: 'Tutorial W5 case study (Monash Fibre)',
        q: R`Monash Fibre owes the consultants **$1 million** for their report. Should this be included in the project’s cash flows?`,
        choices: ['No: it must be paid whatever the decision, so it is sunk', 'Yes: it is part of the initial investment', 'Yes: spread it over the 10 years', 'Only if the project goes ahead'], answer: 0,
        why: R`The fee is owed either way. A cost that does not change with the decision is not relevant.` },
      { id: 'w5-q59', topic: 'project', kind: 'num', level: 2, section: 'B', src: 'Tutorial W5 case study (Monash Fibre)', formula: 'fcf',
        q: R`Monash Fibre (report below): only $1m of the $2m SG&A is caused by the project. The tax rate is 35%. What is the project’s **free cash flow** in each of years 1 to 9?`,
        table: CASE_TABLE,
        answer: CASE.fcf, unit: '$m', dp: 3,
        mistakes: [
          { v: (30 - 18 - 2 - 2.5) * 0.65 + 2.5, why: 'Only $1m of the SG&A is incremental. The other $1m is paid anyway.' },
          { v: (30 - 18 - 1 - 2.5) * 0.65, why: 'That is net income. Add back the $2.5m of depreciation.' },
          { v: 4.875, why: 'That is the consultants’ net income, which is not a cash flow.' },
        ],
        steps: [
          stmt([['Sales revenue', 30], ['Cost of goods sold', -18], ['Incremental SG&A', -1], ['Depreciation', -2.5], ['EBIT', 8.5, 1], ['Tax at 35%', -2.975], ['Net income', 5.525, 1], ['Add back depreciation', 2.5], ['Free cash flow', CASE.fcf, 1]], (v) => mil(v)),
          R`Year 0: \(-\$25\text{m}\) equipment \(- \$10\text{m}\) NWC \(= -\$35\text{m}\). Year 10: \(\$8.025\text{m} + \$10\text{m}\) NWC back \(= \$18.025\text{m}\).`,
        ],
        ti: [TI.line('(30-18-1-2.5)*(1-0.35)+2.5', { note: 'In $ millions. Only the $1m of incremental SG&A is taken off.' })],
        why: R`Use only incremental costs, and add back depreciation: $8.025 million a year.` },
      { id: 'w5-q60', topic: 'project', kind: 'num', level: 3, section: 'B', src: 'Tutorial W5 case study (Monash Fibre)', formula: 'npv', boss: true,
        q: R`Monash Fibre’s free cash flows are −$35m at year 0, $8.025m in years 1 to 9 and $18.025m in year 10. The cost of capital is 14%. What is the project’s **NPV**?`,
        answer: FIN.npv(0.14, CASE.cfs), unit: '$m', dp: 3,
        mistakes: [
          { v: -35 + FIN.pvAnnuity(CASE.fcf, 0.14, 10), why: 'The $10m of working capital comes back in year 10. Include it.' },
          { v: FIN.npv(0.14, [-35].concat(Array(9).fill(7.375)).concat([17.375])), why: 'Only $1m of SG&A is incremental, so the yearly FCF is $8.025m.' },
          { v: FIN.npv(0.14, CASE.cfs) - 1, why: 'The $1m consultant fee is sunk. Leave it out.' },
        ],
        steps: [
          R`\[NPV = -\$35\text{m} + ${annuityPV(8.025, 0.14, 10)}\text{m} + \frac{\$10\text{m}}{1.14^{10}}\]`,
          R`\[NPV = -35 + ${L.numT(FIN.pvAnnuity(8.025, 0.14, 10), 3)} + ${L.numT(10 / Math.pow(1.14, 10), 3)} = ${mil(FIN.npv(0.14, CASE.cfs))}\]`,
          R`\(IRR = ${L.pct(FIN.irr(CASE.cfs))}\), above 14%.`,
        ],
        calc: npvKeys(CASE.cfs, 0.14, 'm'),
        ti: [tiNpv(0.14, CASE.cfs, { note: R`In $ millions: \(8.025\) nine times, then \(18.025\) once.` })],
        why: R`The project is worth about $9.557 million, not $48.75 million. Still positive, so accept.` },
    ],

    generators: [
      /* ---------- free cash flow ---------- */
      { id: 'w5-g-ocf', topic: 'fcf', level: 1, section: 'B', formula: 'fcf', src: 'Lecture W5 Example 4',
        make(rng) {
          for (let tries = 0; tries < 50; tries++) {
            const rev = rng.step(20, 400, 5) * 1000;
            const cost = round(rev * rng.step(0.3, 0.65, 0.05), 1000);
            const dep = rng.step(2, 60, 1) * 1000;
            const tc = rng.pick(TAX);
            const ebit = rev - cost - dep;
            if (ebit <= 0.05 * rev) continue;
            const ni = ebit * (1 - tc), ocf = ni + dep;
            const co = rng.company();
            return {
              q: R`${co} plans to replace some equipment. This adds ${T.money(rev, 0)} of revenue and ${T.money(cost, 0)} of costs a year. It can claim ${T.money(dep, 0)} of extra depreciation a year. The tax rate is ${T.pctT(tc)}. What is the extra **after-tax operating cash flow** each year?`,
              givens: [[R`\Delta \text{Rev}`, L.moneyT(rev)], [R`\Delta \text{Costs}`, L.moneyT(cost)], [R`\Delta \text{Dep}`, L.moneyT(dep)], ['t_c', L.pctT(tc)]],
              answer: ocf, unit: '$', dp: 2,
              mistakes: clean([
                { v: ni, why: 'That is earnings after tax. Add back the depreciation, which is not a cash cost.' },
                { v: (rev - cost) * (1 - tc), why: R`That ignores the depreciation tax shield, \(Dep \times t_c\).` },
                { v: (rev - cost) * (1 - tc) + dep, why: R`That mixes the two methods. With the tax-shield method, add \(Dep \times t_c\), not the full \(Dep\).` },
              ], ocf, '$', 2),
              steps: [
                R`Method 1, add back depreciation:`,
                stmt([['Revenue', rev], ['Costs', -cost], ['Depreciation', -dep], ['EBIT', ebit, 1], [`Tax at ${T.pctT(tc)}`, -ebit * tc], ['Earnings after tax', ni, 1], ['Add back depreciation', dep], ['Operating cash flow', ocf, 1]]),
                R`Method 2, tax shield: \[(${L.moneyT(rev)} - ${L.moneyT(cost)})(1 - ${L.dec(tc)}) + ${L.dec(tc)} \times ${L.moneyT(dep)} = ${M((rev - cost) * (1 - tc))} + ${M(dep * tc)} = ${M(ocf)}\]`,
              ],
              ti: [TI.line(`(${n6(rev)}-${n6(cost)}-${n6(dep)})*(1-${n6(tc)})+${n6(dep)}`)],
              why: 'Both methods give the same cash flow. Depreciation only matters through the tax it saves.',
            };
          }
          return null;
        } },
      { id: 'w5-g-revenue', topic: 'fcf', level: 1, section: 'B', src: 'Textbook Ch 9 P3',
        make(rng) {
          const u = rng.step(10, 500, 10) * 1000, g = rng.pick([0.05, 0.1, 0.15, 0.2, 0.25, 0.3]), price = rng.step(5, 120, 1);
          const inc = u * g * price;
          const what = rng.pick(['bottles', 'bikes', 'solar panels', 'coffee pods', 'game licences', 'drone parts']);
          return {
            q: R`New equipment will raise next year’s sales of ${what} by ${T.pctT(g)} over the current ${T.numT(u, 0)} units. The price is ${T.money(price, 0)} a unit. What is the **incremental revenue** next year?`,
            givens: [[R`\text{Units now}`, L.numT(u, 0)], [R`\text{Growth}`, L.pctT(g)], [R`\text{Price}`, L.moneyT(price)]],
            answer: inc, unit: '$', dp: 2,
            mistakes: clean([
              { v: u * (1 + g) * price, why: 'That is the total revenue next year. Only the extra sales are incremental.' },
              { v: u * price, why: 'That is the current revenue, which happens anyway.' },
              { v: u * g, why: 'That is the number of extra units. Multiply by the price.' },
            ], inc, '$', 2),
            steps: [R`\[\text{Incremental revenue} = (${L.dec(g)} \times ${L.numT(u, 0)}) \times ${L.moneyT(price)} = ${L.numT(u * g, 0)} \times ${L.moneyT(price)} = ${M(inc)}\]`],
            ti: [TI.line(`${n6(g)}*${n6(u)}*${n6(price)}`)],
            why: 'Only the change caused by the project counts.',
          };
        } },
      { id: 'w5-g-earnings', topic: 'fcf', level: 1, section: 'B', formula: 'fcf', src: 'Textbook Ch 9 P2',
        make(rng) {
          for (let tries = 0; tries < 60; tries++) {
            const price = rng.step(100, 3000, 50) * 1000, inst = rng.step(5, 100, 5) * 1000, n = rng.int(3, 8);
            const dep = (price + inst) / n;
            const rev = round(dep * rng.step(1.8, 4, 0.1), 10000);
            const cost = round(rev * rng.step(0.2, 0.45, 0.05), 10000);
            const tc = rng.pick(TAX);
            const ebit = rev - cost - dep;
            if (ebit <= 0.05 * rev) continue;
            const earn = ebit * (1 - tc);
            return {
              q: R`A firm buys a machine for ${T.money(price, 0)} and pays ${T.money(inst, 0)} to install it. It is depreciated straight-line to zero over ${n} years. It adds ${T.money(rev, 0)} of revenue and ${T.money(cost, 0)} of costs a year. The tax rate is ${T.pctT(tc)}. What are the **incremental earnings** each year?`,
              givens: [[R`\text{Machine}`, L.moneyT(price)], [R`\text{Installation}`, L.moneyT(inst)], ['n', String(n)], [R`\Delta \text{Rev}`, L.moneyT(rev)], [R`\Delta \text{Costs}`, L.moneyT(cost)], ['t_c', L.pctT(tc)]],
              answer: earn, unit: '$', dp: 2,
              mistakes: clean([
                { v: (rev - cost) * (1 - tc), why: 'That ignores depreciation. Earnings are after depreciation.' },
                { v: earn + dep, why: 'That adds depreciation back, which gives the operating cash flow, not the earnings.' },
                { v: ebit, why: R`That is before tax. Multiply by \((1 - t_c)\).` },
                { v: (rev - cost - price / n) * (1 - tc), why: 'The installation cost is depreciated too.' },
              ], earn, '$', 2),
              steps: [
                R`\[Dep = \frac{${L.moneyT(price)} + ${L.moneyT(inst)}}{${n}} = ${M(dep)}\]`,
                R`\[\text{Earnings} = (${L.moneyT(rev)} - ${L.moneyT(cost)} - ${M(dep)})(1 - ${L.dec(tc)}) = ${M(earn)}\]`,
              ],
              ti: [TI.line(`(${n6(rev)}-${n6(cost)}-(${n6(price)}+${n6(inst)})/${n})*(1-${n6(tc)})`, { note: 'No depreciation added back: these are earnings, not cash flow.' })],
              why: R`Incremental earnings \(= (Rev - Costs - Dep)(1 - t_c)\). They are a step towards the cash flow.`,
            };
          }
          return null;
        } },
      { id: 'w5-g-fcf', topic: 'fcf', level: 2, section: 'B', formula: 'fcf', src: 'Textbook Ch 9 P13 (Oakdale)',
        make(rng) {
          const sales = rng.step(50, 600, 5) * 1000;
          const opex = round(sales * rng.step(0.25, 0.5, 0.01), 1000);
          const dep = round(sales * rng.step(0.08, 0.22, 0.01), 1000);
          const capex = round(sales * rng.step(0.1, 0.35, 0.01), 1000);
          const dnwc = round(sales * rng.step(0.01, 0.08, 0.005), 1000) || 1000;
          const tc = rng.pick(TAX), yr = rng.int(1, 4);
          const fcf = FIN.fcf(sales, opex, dep, tc, capex, dnwc);
          const ebit = sales - opex - dep;
          return {
            q: R`${rng.company()} forecasts the figures below for year ${yr} of an expansion. The tax rate is ${T.pctT(tc)}. What is the **free cash flow** in year ${yr}?`,
            table: { head: ['Item', `Year ${yr}`], rows: [['Sales', cell(sales)], ['Operating expenses', cell(opex)], ['Depreciation', cell(dep)], ['Capital expenditure', cell(capex)], ['Increase in NWC', cell(dnwc)]] },
            answer: fcf, unit: '$', dp: 2,
            mistakes: clean([
              { v: fcf + dnwc, why: 'Subtract the increase in net working capital.' },
              { v: fcf + 2 * dnwc, why: 'An increase in NWC is an outflow. It is subtracted, not added.' },
              { v: fcf + capex, why: 'Subtract the capital expenditure.' },
              { v: fcf - dep, why: 'Add back depreciation: it is not a cash cost.' },
            ], fcf, '$', 2),
            steps: [
              stmt([['Sales', sales], ['Operating expenses', -opex], ['Depreciation', -dep], ['EBIT', ebit, 1], [`Tax at ${T.pctT(tc)}`, -ebit * tc], ['Unlevered net income', ebit * (1 - tc), 1], ['Add back depreciation', dep], ['Capital expenditure', -capex], ['Increase in NWC', -dnwc], ['Free cash flow', fcf, 1]]),
            ],
            ti: [TI.line(`(${n6(sales)}-${n6(opex)}-${n6(dep)})*(1-${n6(tc)})+${n6(dep)}-${n6(capex)}-${n6(dnwc)}`)],
            why: R`\(FCF = (Rev - Costs - Dep)(1 - t_c) + Dep - CapEx - \Delta NWC\).`,
          };
        } },

      /* ---------- tax shield ---------- */
      { id: 'w5-g-shield', topic: 'tax', level: 1, section: 'B', formula: 'dep-shield', src: 'Textbook Ch 9 P7',
        make(rng) {
          const price = rng.step(20, 900, 5) * 1000, inst = rng.step(1, 40, 1) * 1000, n = rng.int(3, 10), tc = rng.pick(TAX);
          const dep = (price + inst) / n, sh = dep * tc;
          return {
            q: R`A machine costs ${T.money(price, 0)}, plus ${T.money(inst, 0)} to ship and install it. It is depreciated straight-line to zero over ${n} years. The tax rate is ${T.pctT(tc)}. What is the yearly **depreciation tax shield**?`,
            givens: [[R`\text{Cost}`, R`${L.moneyT(price)} + ${L.moneyT(inst)}`], ['n', String(n)], ['t_c', L.pctT(tc)]],
            answer: sh, unit: '$', dp: 2,
            mistakes: clean([
              { v: dep * (1 - tc), why: R`That is \(Dep \times (1 - t_c)\). The shield is \(Dep \times t_c\).` },
              { v: (price / n) * tc, why: 'Shipping and installation are depreciated too.' },
              { v: dep, why: 'That is the depreciation itself. The shield is the tax it saves.' },
            ], sh, '$', 2),
            steps: [R`\[Dep = \frac{${L.moneyT(price)} + ${L.moneyT(inst)}}{${n}} = ${M(dep)}\]`, R`\[\text{Tax shield} = Dep \times t_c = ${M(dep)} \times ${L.dec(tc)} = ${M(sh)}\]`],
            ti: [TI.line(`(${n6(price)}+${n6(inst)})/${n}*${n6(tc)}`)],
            why: 'Depreciation is not cash, but it saves tax every year. That saving is a real cash inflow.',
          };
        } },

      /* ---------- depreciation and book value ---------- */
      { id: 'w5-g-dep', topic: 'dep', level: 1, section: 'B', src: 'Textbook Ch 9 P1',
        make(rng) {
          const price = rng.step(20, 900, 5) * 1000, ship = rng.step(1, 20, 1) * 1000, inst = rng.step(1, 30, 1) * 1000, n = rng.int(3, 10);
          const cost = price + ship + inst;
          if (rng.chance(0.5)) {
            const sv = round(price * rng.step(0.05, 0.25, 0.05), 1000);
            const dep = cost / n;
            return {
              q: R`A machine costs ${T.money(price, 0)}, plus ${T.money(ship, 0)} shipping and ${T.money(inst, 0)} installation. It is depreciated straight-line **to zero** over ${n} years, even though it should sell for ${T.money(sv, 0)} at the end. What is the yearly **depreciation**?`,
              givens: [[R`\text{Price}`, L.moneyT(price)], [R`\text{Shipping}`, L.moneyT(ship)], [R`\text{Installation}`, L.moneyT(inst)], ['n', String(n)]],
              answer: dep, unit: '$', dp: 2,
              mistakes: clean([
                { v: price / n, why: 'Shipping and installation are part of the depreciable cost.' },
                { v: (cost - sv) / n, why: 'It is depreciated to zero, so do not subtract the expected sale price. That gain is taxed when it is sold.' },
                { v: (price + ship) / n, why: 'Installation is part of the depreciable cost too.' },
                { v: (price + inst) / n, why: 'Shipping is part of the depreciable cost too.' },
              ], dep, '$', 2).slice(0, 3),
              steps: [R`Depreciable cost \(= ${L.moneyT(price)} + ${L.moneyT(ship)} + ${L.moneyT(inst)} = ${L.moneyT(cost)}\).`, R`\[Dep = \frac{${L.moneyT(cost)}}{${n}} = ${M(dep)}\]`],
              ti: [TI.line(`(${n6(price)}+${n6(ship)}+${n6(inst)})/${n}`, { note: 'If you see a fraction, press ctrl enter for a decimal.' })],
              why: 'Everything spent to get the machine working is depreciated.',
            };
          }
          const rv = round(cost * rng.step(0.05, 0.2, 0.01), 1000);
          const dep = (cost - rv) / n;
          return {
            q: R`A machine costs ${T.money(price, 0)}, plus ${T.money(ship, 0)} shipping and ${T.money(inst, 0)} installation. For tax, it is depreciated straight-line over ${n} years to a residual value of ${T.money(rv, 0)}. What is the yearly **depreciation**?`,
            givens: [[R`\text{Price}`, L.moneyT(price)], [R`\text{Shipping}`, L.moneyT(ship)], [R`\text{Installation}`, L.moneyT(inst)], [R`\text{Residual}`, L.moneyT(rv)], ['n', String(n)]],
            answer: dep, unit: '$', dp: 2,
            mistakes: clean([
              { v: cost / n, why: 'Subtract the residual value before dividing by the life.' },
              { v: (price - rv) / n, why: 'Shipping and installation are part of the depreciable cost.' },
              { v: (price + ship - rv) / n, why: 'Installation is part of the depreciable cost too.' },
              { v: (price + inst - rv) / n, why: 'Shipping is part of the depreciable cost too.' },
            ], dep, '$', 2).slice(0, 3),
            steps: [R`\[Dep = \frac{\text{Cost} - \text{Residual}}{\text{Life}} = \frac{${L.moneyT(cost)} - ${L.moneyT(rv)}}{${n}} = ${M(dep)}\]`],
            ti: [TI.line(`(${n6(price)}+${n6(ship)}+${n6(inst)}-${n6(rv)})/${n}`, { note: 'If you see a fraction, press ctrl enter for a decimal.' })],
            why: 'Straight-line spreads the cost, less the residual value, evenly over the depreciable life.',
          };
        } },
      { id: 'w5-g-bv', topic: 'dep', level: 1, section: 'B', formula: 'salvage',
        make(rng) {
          const price = rng.step(20, 900, 5) * 1000, inst = rng.step(1, 40, 1) * 1000, n = rng.int(4, 10), k = rng.int(1, n - 1);
          const cost = price + inst, dep = cost / n, bv = cost - k * dep;
          return {
            q: R`A machine was bought ${k} years ago for ${T.money(price, 0)}, plus ${T.money(inst, 0)} to install. It is depreciated straight-line to zero over ${n} years. What is its **book value** today?`,
            givens: [[R`\text{Cost}`, R`${L.moneyT(price)} + ${L.moneyT(inst)}`], ['n', String(n)], [R`\text{Age}`, String(k)]],
            answer: bv, unit: '$', dp: 2,
            mistakes: clean([
              { v: cost - dep, why: `Take off ${k} years of depreciation, not one.` },
              { v: price - k * (price / n), why: 'The installation cost is part of the depreciable cost.' },
              { v: cost - (k + 1) * dep, why: `The machine is ${k} years old, so ${k} years of depreciation have been claimed.` },
              { v: k * dep, why: 'That is the accumulated depreciation. Book value is the cost minus this amount.' },
            ], bv, '$', 2),
            steps: [R`\[Dep = \frac{${L.moneyT(cost)}}{${n}} = ${M(dep)} \text{ a year}\]`, R`\[BV = ${L.moneyT(cost)} - ${k} \times ${M(dep)} = ${M(bv)}\]`],
            ti: [TI.line(`${n6(cost)}-${k}*${n6(cost)}/${n}`, { note: `${T.money(cost, 0)} is the price plus the installation. Take off ${k} years of depreciation. If you see a fraction, press ctrl enter for a decimal.` })],
            why: R`\(BV = \text{cost} - \text{accumulated depreciation}\). You need it to tax a sale correctly.`,
          };
        } },

      /* ---------- salvage and terminal cash flow ---------- */
      { id: 'w5-g-salvage', topic: 'salvage', level: 1, section: 'B', formula: 'salvage',
        make(rng) {
          const tc = rng.pick(TAX);
          const bv = rng.chance(0.25) ? 0 : rng.step(5, 200, 1) * 1000;
          let sv = bv === 0 ? rng.step(2, 80, 1) * 1000 : round(bv * rng.step(0.5, 1.8, 0.05), 1000);
          if (sv === bv) sv += 2000;
          const ats = FIN.afterTaxSalvage(sv, bv, tc);
          const gain = sv - bv;
          return {
            q: R`An asset with a book value of ${T.money(bv, 0)} is sold for ${T.money(sv, 0)}. The tax rate is ${T.pctT(tc)}. What is the **after-tax cash flow** from the sale?`,
            givens: [['SV', L.moneyT(sv)], ['BV', L.moneyT(bv)], ['t_c', L.pctT(tc)]],
            answer: ats, unit: '$', dp: 2,
            mistakes: clean([
              { v: sv, why: gain > 0 ? 'The gain over book value is taxed.' : 'The loss below book value saves tax. Add the saving.' },
              { v: sv * (1 - tc), why: R`Only the gain \((SV - BV)\) is taxed, not the whole price.` },
              { v: sv + gain * tc, why: gain > 0 ? 'Sign slip: tax on a gain is subtracted.' : 'Sign slip: a loss saves tax, so the saving is added.' },
            ], ats, '$', 2),
            steps: [
              R`${gain > 0 ? 'Gain' : 'Loss'} \(= SV - BV = ${L.moneyT(sv)} - ${L.moneyT(bv)} = ${L.moneyT(gain)}\).`,
              R`\[\text{After-tax salvage} = SV - (SV - BV)\,t_c = ${L.moneyT(sv)} - (${L.moneyT(gain)})(${L.dec(tc)}) = ${M(ats)}\]`,
            ],
            ti: [TI.line(`${n6(sv)}-(${n6(sv)}-${n6(bv)})*${n6(tc)}`)],
            why: gain > 0 ? 'Selling above book value creates a taxable gain.' : 'Selling below book value creates a tax-deductible loss, so you keep more than the price.',
          };
        } },
      { id: 'w5-g-salvage-full', topic: 'salvage', level: 2, section: 'B', formula: 'salvage',
        make(rng) {
          const cost = rng.step(20, 500, 5) * 1000, life = rng.int(4, 10), k = rng.int(2, life - 1), tc = rng.pick(TAX);
          const bv = cost * (1 - k / life);
          let sv = round(bv * rng.step(0.5, 1.8, 0.05), 1000);
          if (Math.abs(sv - bv) < 500) sv += 3000;
          const ats = FIN.afterTaxSalvage(sv, bv, tc);
          return {
            q: R`A machine cost ${T.money(cost, 0)} and is depreciated straight-line to zero over ${life} years. After ${k} years it is sold for ${T.money(sv, 0)}. The tax rate is ${T.pctT(tc)}. What is the **after-tax cash flow** from the sale?`,
            givens: [[R`\text{Cost}`, L.moneyT(cost)], [R`\text{Life}`, String(life)], [R`\text{Age}`, String(k)], ['SV', L.moneyT(sv)], ['t_c', L.pctT(tc)]],
            answer: ats, unit: '$', dp: 2,
            mistakes: clean([
              { v: FIN.afterTaxSalvage(sv, cost, tc), why: 'Use the book value today, not the original cost.' },
              { v: sv, why: sv > bv ? 'The gain over book value is taxed.' : 'The loss below book value saves tax.' },
              { v: sv * (1 - tc), why: 'Only the gain or loss is taxed, not the whole price.' },
              { v: FIN.afterTaxSalvage(sv, 0, tc), why: 'The machine is not fully depreciated yet. Find its book value first.' },
            ], ats, '$', 2),
            steps: [
              R`\[BV = ${L.moneyT(cost)} - ${k} \times \frac{${L.moneyT(cost)}}{${life}} = ${M(bv)}\]`,
              R`\[\text{After-tax salvage} = ${L.moneyT(sv)} - (${L.moneyT(sv)} - ${M(bv)})(${L.dec(tc)}) = ${M(ats)}\]`,
            ],
            ti: [TI.line(`${n6(cost)}-${k}*${n6(cost)}/${life}`, { note: 'The book value today. If you see a fraction, press ctrl enter for a decimal.' }), TI.line(`${n6(sv)}-(${n6(sv)}-ans)*${n6(tc)}`, { note: R`\(\text{ans}\) is the book value from the line before.` })],
            why: 'Find the book value first. Then tax only the gain (or save tax on the loss).',
          };
        } },
      { id: 'w5-g-terminal', topic: 'salvage', level: 2, section: 'B', formula: 'salvage', src: 'Mock MST Q19',
        make(rng) {
          const ocf = rng.step(5, 200, 1) * 1000, nwc = rng.step(5, 60, 1) * 1000, tc = rng.pick(TAX);
          const bv = rng.chance(0.6) ? 0 : rng.step(1, 20, 1) * 1000;
          let sv = rng.step(1, 40, 1) * 1000;
          if (sv === bv) sv += 1000;
          const ats = FIN.afterTaxSalvage(sv, bv, tc), term = ocf + nwc + ats;
          return {
            q: R`In its final year a project has ${T.money(ocf, 0)} of after-tax operating cash flow. Its machine (book value ${T.money(bv, 0)}) is sold for ${T.money(sv, 0)}. The ${T.money(nwc, 0)} of working capital is recovered. The tax rate is ${T.pctT(tc)}. What is the final year’s **cash flow**?`,
            givens: [['OCF', L.moneyT(ocf)], ['SV', L.moneyT(sv)], ['BV', L.moneyT(bv)], ['NWC', L.moneyT(nwc)], ['t_c', L.pctT(tc)]],
            answer: term, unit: '$', dp: 2,
            mistakes: clean([
              { v: ocf + nwc + sv, why: R`Tax the gain (or credit the loss) on the machine: \(SV - (SV - BV)\,t_c\).` },
              { v: ocf + ats, why: 'Add the working capital that is recovered.' },
              { v: ocf + nwc * (1 - tc) + ats, why: 'Recovered working capital is not taxed.' },
            ], term, '$', 2),
            steps: [
              R`After-tax salvage: \(${L.moneyT(sv)} - (${L.moneyT(sv)} - ${L.moneyT(bv)})(${L.dec(tc)}) = ${M(ats)}\).`,
              R`\[CF_n = ${L.moneyT(ocf)} + ${L.moneyT(nwc)} + ${M(ats)} = ${M(term)}\]`,
            ],
            ti: [TI.line(`${n6(ocf)}+${n6(nwc)}+${n6(sv)}-(${n6(sv)}-${n6(bv)})*${n6(tc)}`)],
            why: 'The terminal cash flow is the final operating cash flow, plus the NWC recovered, plus the after-tax salvage.',
          };
        } },

      /* ---------- net working capital ---------- */
      { id: 'w5-g-nwc', topic: 'nwc', level: 2, section: 'B',
        make(rng) {
          for (let tries = 0; tries < 50; tries++) {
            const n = rng.int(3, 5);
            const lv = [rng.step(5, 60, 1) * 1000];
            for (let t = 1; t < n; t++) lv.push(round(lv[t - 1] * rng.step(0.8, 1.35, 0.05), 1000));
            if (lv.some((v, t) => t > 0 && v === lv[t - 1])) continue;
            const y = rng.chance(0.3) ? n : rng.int(0, n - 1);
            const prev = y === 0 ? 0 : lv[y - 1], cur = y === n ? 0 : lv[y];
            const cf = -(cur - prev);
            const ms = y === n
              ? [{ v: 0, why: 'In BFC2140 the working capital is recovered in full at the end.' }, { v: -prev, why: 'Recovering working capital is an inflow, not an outflow.' }, { v: lv[0], why: 'All the working capital built up comes back, not just the first amount.' }]
              : [{ v: -cur, why: 'Only the change in NWC is a cash flow, not the whole balance.' }, { v: cur - prev, why: 'An increase in NWC is an outflow (negative); a decrease is an inflow.' }, { v: 0, why: 'A change in working capital is a real cash flow.' }];
            const mistakes = clean(ms, cf, '$', 2);
            if (mistakes.length < 2) continue;
            return {
              q: R`A ${n}-year project needs the working capital below (balance at the end of each year). It is all recovered at the end of year ${n}. What is the **cash flow from NWC in year ${y}**?`,
              table: { head: ['End of year', 'NWC needed'], rows: lv.map((v, t) => [t, cell(v)]).concat([[n, '$0 (all recovered)']]) },
              answer: cf, unit: '$', dp: 2,
              mistakes,
              steps: [
                R`NWC cash flow \(= -(\text{NWC}_{${y}} - \text{NWC}_{${y - 1 < 0 ? '-1' : y - 1}})\), with \(\text{NWC} = 0\) before the project starts.`,
                R`\[CF = -(${L.moneyT(cur)} - ${L.moneyT(prev)}) = ${M(cf)}\]`,
              ],
              ti: [TI.line(`-(${n6(cur)}-${n6(prev)})`, { note: 'Minus the change in NWC: a rise is an outflow, a fall is an inflow.' })],
              why: cf < 0 ? 'The balance rises, so cash is tied up: an outflow.' : 'The balance falls (or is recovered), so cash is released: an inflow.',
            };
          }
          return null;
        } },

      /* ---------- relevant cash flows ---------- */
      { id: 'w5-g-outlay', topic: 'relevant', level: 2, section: 'B', src: 'Tutorial W5 Q1',
        make(rng) {
          const price = rng.step(50, 900, 5) * 1000, inst = rng.step(2, 50, 1) * 1000, nwc = rng.step(5, 80, 1) * 1000;
          const land = rng.step(20, 400, 5) * 1000, study = rng.step(5, 60, 1) * 1000;
          const cf0 = -(price + inst + nwc + land);
          const co = rng.company();
          return {
            q: R`${co} may build a new production line:\n• The equipment costs ${T.money(price, 0)}, plus ${T.money(inst, 0)} to install.\n• Inventory must rise by ${T.money(nwc, 0)} at the start.\n• The line uses land the firm owns. It could be sold today for ${T.money(land, 0)} after tax.\n• Last month the firm paid ${T.money(study, 0)} for a feasibility study.\nWhat is the relevant cash flow at \(t = 0\)?`,
            answer: cf0, unit: '$', dp: 2,
            mistakes: clean([
              { v: cf0 - study, why: 'The feasibility study is already paid for: a sunk cost.' },
              { v: cf0 + land, why: 'Using the land gives up its sale value. That opportunity cost counts.' },
              { v: cf0 + nwc, why: 'The extra inventory ties up cash: include the NWC outflow.' },
              { v: cf0 + inst, why: 'Installation is part of the investment.' },
            ], cf0, '$', 2),
            steps: [
              R`Include: equipment, installation, NWC and the land’s after-tax value (opportunity cost). Exclude the sunk study.`,
              R`\[CF_0 = -(${L.moneyT(price)} + ${L.moneyT(inst)} + ${L.moneyT(nwc)} + ${L.moneyT(land)}) = ${M(cf0)}\]`,
            ],
            ti: [TI.line(`-(${n6(price)}+${n6(inst)}+${n6(nwc)}+${n6(land)})`, { note: 'The sunk study is left out.' })],
            why: 'Only cash flows that happen because of the decision count, including value given up.',
          };
        } },
      { id: 'w5-g-annual', topic: 'relevant', level: 2, section: 'B', formula: 'fcf', src: 'Lecture W5',
        make(rng) {
          for (let tries = 0; tries < 60; tries++) {
            const rev = rng.step(100, 900, 10) * 1000, cost = round(rev * rng.step(0.35, 0.55, 0.01), 1000);
            const lost = round(rev * rng.step(0.05, 0.15, 0.01), 1000);
            const alloc = rng.step(10, 80, 1) * 1000, extra = rng.step(5, 60, 1) * 1000, interest = rng.step(5, 50, 1) * 1000;
            if (alloc === extra || alloc === interest || extra === interest) continue;
            const dep = rng.step(10, 120, 1) * 1000, tc = rng.pick(TAX);
            const ebit = rev - cost - lost - extra - dep;
            if (ebit <= 0.05 * rev) continue;
            const fcf = ebit * (1 - tc) + dep;
            const co = rng.company();
            return {
              q: R`${co} is launching a new product. Each year:\n• Sales ${T.money(rev, 0)}; operating costs ${T.money(cost, 0)}.\n• The firm’s old product loses ${T.money(lost, 0)} of profit (before tax).\n• Head office allocates ${T.money(alloc, 0)} of existing overhead; the project adds ${T.money(extra, 0)} of new overhead.\n• Interest on the project loan is ${T.money(interest, 0)}.\n• Depreciation is ${T.money(dep, 0)}. The tax rate is ${T.pctT(tc)}.\nWhat is the yearly **free cash flow**?`,
              answer: fcf, unit: '$', dp: 2,
              mistakes: clean([
                { v: (ebit - alloc) * (1 - tc) + dep, why: 'The allocated overhead is paid anyway. Only the new overhead is incremental.' },
                { v: (ebit + lost) * (1 - tc) + dep, why: 'The lost profit on the old product is a side effect (cannibalisation). Include it.' },
                { v: (ebit - interest) * (1 - tc) + dep, why: 'Interest is a financing cost. The discount rate already covers it.' },
                { v: ebit * (1 - tc), why: 'Add back the depreciation: it is not a cash cost.' },
              ], fcf, '$', 2),
              steps: [
                stmt([['Sales', rev], ['Operating costs', -cost], ['Lost profit on old product', -lost], ['New overhead only', -extra], ['Depreciation', -dep], ['EBIT', ebit, 1], [`Tax at ${T.pctT(tc)}`, -ebit * tc], ['Add back depreciation', dep], ['Free cash flow', fcf, 1]]),
                R`Left out: the allocated overhead (not incremental) and the interest (financing).`,
              ],
              ti: [TI.line(`(${n6(rev)}-${n6(cost)}-${n6(lost)}-${n6(extra)}-${n6(dep)})*(1-${n6(tc)})+${n6(dep)}`, { note: 'The allocated overhead and the interest are left out.' })],
              why: 'Include side effects and extra overhead. Exclude allocated overhead and interest.',
            };
          }
          return null;
        } },

      /* ---------- inflation ---------- */
      { id: 'w5-g-fisher', topic: 'inflation', level: 1, section: 'B', formula: 'fisher', src: 'Lecture W5 Example 2',
        make(rng) {
          for (let tries = 0; tries < 40; tries++) {
            const i = rng.step(0.01, 0.08, 0.005);
            if (rng.chance(0.6)) {
              const nom = rng.step(0.05, 0.18, 0.005);
              if (nom - i < 0.02) continue;
              const real = FIN.fisherReal(nom, i);
              return {
                q: R`The nominal interest rate is ${T.pctT(nom)} and inflation is ${T.pctT(i)}. What is the **real** interest rate?`,
                givens: [['r_{nom}', L.pctT(nom)], ['i', L.pctT(i)]],
                answer: P(real), unit: '%', dp: 2,
                mistakes: clean([
                  { v: P(nom - i), why: R`Subtracting is only an approximation. Divide: \(\frac{1 + r_{nom}}{1 + i} - 1\).` },
                  { v: P((1 + nom) * (1 + i) - 1), why: 'Multiplying adds inflation. To remove it, divide.' },
                ], P(real), '%', 2),
                steps: [R`\[1 + r_{real} = \frac{1 + r_{nom}}{1 + i} = \frac{${L.onePlus(nom)}}{${L.onePlus(i)}} = ${L.numT((1 + nom) / (1 + i), 6)}\]`, R`\[r_{real} = ${L.pct(real, 4)}\]`],
                ti: [TI.line(`${n6(1 + nom)}/${n6(1 + i)}-1`, { pct: true, note: 'A decimal: times 100 gives the percentage.' })],
                why: 'The Fisher relation removes inflation exactly.',
              };
            }
            const real = rng.step(0.02, 0.1, 0.005);
            const nom = FIN.fisherNominal(real, i);
            return {
              q: R`A project needs a **real** return of ${T.pctT(real)}. Inflation is expected to be ${T.pctT(i)}. What **nominal** rate should its nominal cash flows be discounted at?`,
              givens: [['r_{real}', L.pctT(real)], ['i', L.pctT(i)]],
              answer: P(nom), unit: '%', dp: 2,
              mistakes: clean([
                { v: P(real + i), why: R`Adding is only an approximation. Multiply: \((1 + r_{real})(1 + i) - 1\).` },
                { v: P(FIN.fisherReal(real, i)), why: 'That removes inflation. To add it, multiply.' },
              ], P(nom), '%', 2),
              steps: [R`\[1 + r_{nom} = (1 + r_{real})(1 + i) = ${L.onePlus(real)} \times ${L.onePlus(i)} = ${L.numT((1 + real) * (1 + i), 6)}\]`, R`\[r_{nom} = ${L.pct(nom, 4)}\]`],
              ti: [TI.line(`${n6(1 + real)}*${n6(1 + i)}-1`, { pct: true, note: 'A decimal: times 100 gives the percentage.' })],
              why: 'Nominal cash flows go with a nominal rate.',
            };
          }
          return null;
        } },
      { id: 'w5-g-nominal', topic: 'inflation', level: 1, section: 'B', formula: 'fisher', src: 'Lecture W5 Example 3',
        make(rng) {
          const c = rng.step(1, 100, 1) * 1000, t = rng.int(2, 6), i = rng.step(0.02, 0.1, 0.005);
          const nom = c * Math.pow(1 + i, t);
          return {
            q: R`A project’s cash flow in year ${t} is ${T.money(c, 0)} in **real** terms (today’s dollars). Inflation is ${T.pctT(i)} a year. What is the year ${t} cash flow in **nominal** terms?`,
            givens: [[R`CF^{real}_{${t}}`, L.moneyT(c)], ['i', L.pctT(i)], ['t', String(t)]],
            answer: nom, unit: '$', dp: 2,
            mistakes: clean([
              { v: c * (1 + i * t), why: R`Inflation compounds: multiply by \((1 + i)^{t}\).` },
              { v: c / Math.pow(1 + i, t), why: 'That removes inflation. Real to nominal multiplies.' },
              { v: c * (1 + i), why: `Apply ${t} years of inflation, not one.` },
            ], nom, '$', 2),
            steps: [R`\[CF^{nom}_{${t}} = CF^{real}_{${t}} \times (1 + i)^{${t}} = ${L.moneyT(c)} \times ${L.onePlus(i)}^{${t}} = ${M(nom)}\]`],
            ti: [TI.line(`${n6(c)}*${n6(1 + i)}^${t}`)],
            why: 'Nominal cash flows include inflation, compounded year by year.',
          };
        } },
      { id: 'w5-g-infl-npv', topic: 'inflation', level: 2, section: 'B', formula: 'fisher', src: 'Lecture W5 Example 3',
        make(rng) {
          for (let tries = 0; tries < 60; tries++) {
            const i0 = rng.step(5, 200, 1) * 1000, n = rng.int(3, 6);
            const nom = rng.step(0.08, 0.16, 0.005), i = rng.step(0.02, 0.06, 0.005);
            if (nom - i < 0.03) continue;
            const real = FIN.fisherReal(nom, i);
            const c = round((i0 / FIN.pvifa(real, n)) * rng.step(0.9, 1.3, 0.01), 100);
            const npv = -i0 + FIN.pvAnnuity(c, real, n);
            if (Math.abs(npv) < 0.01 * i0) continue;
            const nomCfs = [-i0].concat(Array.from({ length: n }, (_, t) => c * Math.pow(1 + i, t + 1)));
            return {
              q: R`An investment of ${T.money(i0, 0)} will produce **real** cash flows of ${T.money(c, 0)} at the end of each of the next ${n} years. Inflation is ${T.pctT(i)} a year and the nominal required return is ${T.pctT(nom)}. What is the **NPV**?`,
              givens: [['C_0', L.moneyT(-i0)], [R`C^{real}`, L.moneyT(c)], ['n', String(n)], ['i', L.pctT(i)], ['r_{nom}', L.pctT(nom)]],
              answer: npv, unit: '$', dp: 2,
              mistakes: clean([
                { v: -i0 + FIN.pvAnnuity(c, nom, n), why: 'Real cash flows need the real rate. The nominal rate understates the NPV.' },
                { v: -i0 + FIN.pvAnnuity(c, nom - i, n), why: R`The real rate is \(\frac{1 + r_{nom}}{1 + i} - 1\), not \(r_{nom} - i\).` },
                { v: FIN.npv(real, nomCfs), why: 'You inflated the cash flows but used the real rate. Keep them consistent.' },
              ], npv, '$', 2),
              steps: [
                R`Real rate: \[r_{real} = \frac{${L.onePlus(nom)}}{${L.onePlus(i)}} - 1 = ${L.pct(real, 4)}\]`,
                R`\[NPV = -${L.moneyT(i0)} + ${L.moneyT(c)} \times \frac{1}{${L.dec(real, 6)}}\left(1 - \frac{1}{(1 + ${L.dec(real, 6)})^{${n}}}\right) = ${M(npv)}\]`,
                R`Check, nominal with nominal: inflate each cash flow by \((${L.onePlus(i)})^{t}\) and discount at ${T.pctT(nom)}. The NPV is the same.`,
              ],
              calc: `${cfKeys([-i0].concat(Array(n).fill(c)))} · ${T.numT(real * 100, 6)} [I/YR] · [NPV] → ${T.money(npv)}`,
              ti: [TI.line(`${n6(1 + nom)}/${n6(1 + i)}-1`, { note: 'The real rate, as a decimal.' }), TI.line(`npv(100*ans,${n6(-i0)},{${n6(c)}},{${n}})`, { note: R`\(100 \times \text{ans}\) is the real rate as a percentage. Real cash flows with the real rate.` })],
              why: 'Real with real, or nominal with nominal: both give the same NPV.',
            };
          }
          return null;
        } },

      /* ---------- replacement decision parts ---------- */
      { id: 'w5-g-rep-init', topic: 'replace', level: 2, section: 'B', formula: 'salvage', src: 'Lecture W5 Example 5',
        make(rng) {
          for (let tries = 0; tries < 60; tries++) {
            const tc = rng.pick(TAX);
            const oldLife = rng.int(6, 12), age = rng.int(2, oldLife - 2), oldCost = oldLife * rng.step(2, 40, 0.5) * 1000;
            const bv = oldCost * (1 - age / oldLife);
            const sale = round(bv * rng.step(0.5, 1.6, 0.05), 1000);
            if (Math.abs(sale - bv) < Math.max(1000, 0.1 * bv)) continue;
            const price = rng.step(50, 800, 5) * 1000, ship = rng.step(2, 40, 1) * 1000, nwc = rng.step(2, 60, 1) * 1000;
            const tax = (sale - bv) * tc;
            const init = -(price + ship) + sale - tax - nwc;
            if (init > -0.2 * (price + ship)) continue; // keep the t = 0 cash flow a clear outflow
            return {
              q: R`${rng.company()} may replace an old machine.\n• Old machine: bought ${age} years ago for ${T.money(oldCost, 0)}, straight-line to $0 over ${oldLife} years. It sells today for ${T.money(sale, 0)}.\n• New machine: ${T.money(price, 0)}, plus ${T.money(ship, 0)} for shipping and installation.\n• Inventory rises by ${T.money(nwc, 0)}.\n• The tax rate is ${T.pctT(tc)}.\nWhat is the cash flow at \(t = 0\) (the **initial investment**)? Enter an outflow as a negative number.`,
              answer: init, unit: '$', dp: 2,
              mistakes: clean([
                { v: init + tax, why: sale > bv ? 'The old machine sells above book value: tax is due on the gain.' : 'The old machine sells below book value: the loss saves tax.' },
                { v: init + nwc, why: 'Include the increase in working capital.' },
                { v: init + ship, why: 'Shipping and installation are part of the investment.' },
                { v: -(price + ship) + sale * (1 - tc) - nwc, why: 'Only the gain or loss is taxed, not the whole sale price.' },
              ], init, '$', 2),
              steps: [
                R`Old machine: \(BV = ${L.moneyT(oldCost)} - ${age} \times \frac{${L.moneyT(oldCost)}}{${oldLife}} = ${M(bv)}\).`,
                stmt([['New machine, shipping, installation', -(price + ship)], ['Sale of old machine', sale], [sale > bv ? 'Tax on the gain' : 'Tax saved on the loss', -tax], ['Increase in NWC', -nwc], ['Initial investment', init, 1]]),
              ],
              ti: [
                TI.line(`${n6(oldCost)}-${age}*${n6(oldCost)}/${oldLife}`, { note: 'The old machine’s book value.' }),
                TI.line(`-(${n6(price)}+${n6(ship)})+${n6(sale)}-(${n6(sale)}-ans)*${n6(tc)}-${n6(nwc)}`, { note: R`\(\text{ans}\) is the book value. ${sale > bv ? 'The gain is taxed.' : 'The loss saves tax.'}` }),
              ],
              why: 'The initial investment is the new cost and extras, minus the after-tax sale of the old machine, plus the NWC.',
            };
          }
          return null;
        } },
      { id: 'w5-g-rep-ocf', topic: 'replace', level: 2, section: 'B', formula: 'fcf', src: 'Lecture W5 Example 5',
        make(rng) {
          for (let tries = 0; tries < 60; tries++) {
            const tc = rng.pick(TAX), n = rng.int(3, 8);
            const dNew = rng.step(8, 90, 0.5) * 1000, ship = rng.step(1, 30, 1) * 1000, price = dNew * n - ship;
            const dOld = round(dNew * rng.step(0.1, 0.6, 0.05), 100);
            const dInc = dNew - dOld;
            const save = round(dNew * rng.step(1, 2.5, 0.05), 500);
            const addRev = rng.chance(0.5) ? round(dNew * rng.step(0.1, 0.6, 0.05), 500) : 0;
            const ebit = addRev + save - dInc;
            if (ebit <= 0) continue;
            const ocf = ebit * (1 - tc) + dInc;
            return {
              q: R`A new machine costs ${T.money(price, 0)} plus ${T.money(ship, 0)} to install. It is depreciated straight-line to zero over ${n} years. It replaces an old machine that is being depreciated by ${T.money(dOld, 0)} a year. The swap cuts operating costs by ${T.money(save, 0)} a year${addRev ? ` and adds ${T.money(addRev, 0)} of revenue` : ''}. The tax rate is ${T.pctT(tc)}. What is the incremental **operating cash flow** each year?`,
              answer: ocf, unit: '$', dp: 2,
              mistakes: clean([
                { v: (addRev + save - dNew) * (1 - tc) + dNew, why: 'The old machine’s depreciation is lost. Use the incremental depreciation (new minus old).' },
                { v: ebit * (1 - tc), why: 'Add back the incremental depreciation: it is not cash.' },
                { v: ebit * (1 - tc) + dNew, why: 'Add back the same incremental depreciation you subtracted, not the new machine’s.' },
                { v: (addRev + save) * (1 - tc), why: 'That ignores the tax shield on the incremental depreciation.' },
              ], ocf, '$', 2),
              steps: [
                R`\[\Delta Dep = \frac{${L.moneyT(price)} + ${L.moneyT(ship)}}{${n}} - ${L.moneyT(dOld)} = ${M(dNew)} - ${L.moneyT(dOld)} = ${M(dInc)}\]`,
                stmt([...(addRev ? [['Extra revenue', addRev]] : []), ['Cost savings', save], ['Incremental depreciation', -dInc], ['EBIT', ebit, 1], [`Tax at ${T.pctT(tc)}`, -ebit * tc], ['Add back depreciation', dInc], ['Operating cash flow', ocf, 1]]),
              ],
              ti: [
                TI.line(`(${n6(price)}+${n6(ship)})/${n}-${n6(dOld)}`, { note: 'Incremental depreciation: new minus old.' }),
                TI.line(`(${addRev ? n6(addRev) + '+' : ''}${n6(save)}-ans)*(1-${n6(tc)})+ans`, { note: R`\(\text{ans}\) is the incremental depreciation.` }),
              ],
              why: 'In a replacement, everything is incremental: new minus old, including depreciation.',
            };
          }
          return null;
        } },
      { id: 'w5-g-rep-terminal', topic: 'replace', level: 2, section: 'B', formula: 'salvage', src: 'Tutorial W5 Q3 (IFC)',
        make(rng) {
          const n = rng.int(4, 6), tc = rng.pick(TAX);
          const ocf = rng.step(10, 200, 1) * 1000, w0 = rng.step(5, 60, 1) * 1000, w1 = rng.step(1, 15, 1) * 1000;
          const sv = rng.step(5, 100, 1) * 1000;
          const nwc = w0 + (n - 1) * w1, ats = sv * (1 - tc), term = ocf + nwc + ats;
          return {
            q: R`A replacement project lasts ${n} years.\n• Working capital: ${T.money(w0, 0)} at the start, plus ${T.money(w1, 0)} more in each of years 1 to ${n - 1}. All of it is recovered in year ${n}.\n• The new machine is fully depreciated. It sells for ${T.money(sv, 0)} in year ${n}.\n• Year ${n}’s operating cash flow is ${T.money(ocf, 0)}.\n• The tax rate is ${T.pctT(tc)}.\nWhat is the **terminal cash flow**?`,
            answer: term, unit: '$', dp: 2,
            mistakes: clean([
              { v: ocf + w0 + ats, why: `The ${T.money(w1, 0)} added in each of years 1 to ${n - 1} is recovered too.` },
              { v: ocf + nwc + sv, why: 'The machine is fully depreciated, so the whole sale price is a taxable gain.' },
              { v: ocf + ats, why: 'Add the working capital recovered at the end.' },
              { v: nwc + ats, why: `The terminal cash flow includes year ${n}’s operating cash flow.` },
            ], term, '$', 2),
            steps: [
              R`NWC recovered: \(${L.moneyT(w0)} + ${n - 1} \times ${L.moneyT(w1)} = ${L.moneyT(nwc)}\).`,
              R`After-tax salvage: \(${L.moneyT(sv)} - (${L.moneyT(sv)} - \$0)(${L.dec(tc)}) = ${M(ats)}\).`,
              R`\[CF_{${n}} = ${L.moneyT(ocf)} + ${L.moneyT(nwc)} + ${M(ats)} = ${M(term)}\]`,
            ],
            ti: [TI.line(`${n6(ocf)}+${n6(w0)}+${n - 1}*${n6(w1)}+${n6(sv)}-(${n6(sv)}-0)*${n6(tc)}`, { note: 'Operating cash flow, plus all the NWC back, plus the after-tax salvage (book value 0).' })],
            why: 'The terminal cash flow is the last operating cash flow, plus all the NWC recovered, plus the after-tax salvage.',
          };
        } },

      /* ---------- boss: full replacement decisions and projects ---------- */
      { id: 'w5-g-boss-replace', topic: 'replace', level: 3, section: 'B', formula: 'npv', boss: true, src: 'Lecture W5 Example 5',
        make(rng) {
          for (let tries = 0; tries < 200; tries++) {
            const tc = rng.pick([0.3, 0.3, 0.35, 0.4]), n = rng.int(4, 6), r = rng.step(0.08, 0.16, 0.01);
            const age = rng.int(2, 6), oldLife = age + n;
            const dOld = rng.step(2, 15, 0.5) * 1000, oldCost = dOld * oldLife, bvOld = oldCost - age * dOld;
            const sale = round(bvOld * rng.step(0.5, 1.6, 0.05), 1000);
            if (Math.abs(sale - bvOld) < Math.max(1000, 0.1 * bvOld)) continue;
            const dNew = rng.step(8, 60, 0.5) * 1000, ship = rng.step(2, 20, 1) * 1000, price = dNew * n - ship;
            const dInc = dNew - dOld;
            if (dInc <= 0) continue;
            const salv = round(price * rng.step(0, 0.2, 0.02), 1000), nwc = rng.step(2, 20, 1) * 1000;
            const training = rng.step(2, 10, 1) * 1000, interest = round(price * rng.step(0.04, 0.08, 0.01), 100);
            const init = -(price + ship) + sale - (sale - bvOld) * tc - nwc;
            if (init > -0.2 * (price + ship)) continue; // keep the t = 0 cash flow a clear outflow
            const endExtra = nwc + salv * (1 - tc);
            const ocf0 = -(init + endExtra / Math.pow(1 + r, n)) / FIN.pvifa(r, n);
            const save = round(((ocf0 - dInc * tc) / (1 - tc)) * rng.step(0.85, 1.2, 0.01), 500);
            if (save <= dInc * 0.5) continue;
            const ocf = (save - dInc) * (1 - tc) + dInc;
            const term = ocf + endExtra;
            const cfs = [init].concat(Array(n - 1).fill(ocf)).concat([term]);
            const npv = FIN.npv(r, cfs);
            if (Math.abs(npv) < 0.03 * price) continue;
            const part = rng.pick(['init', 'ocf', 'term', 'npv', 'npv']);
            const co = rng.company();
            const table = { head: ['Item', 'Details'], rows: [
              ['Old machine', `Bought ${age} years ago for ${cell(oldCost)}. Straight-line to $0 over ${oldLife} years. Can be sold today for ${cell(sale)}.`],
              ['New machine', `Costs ${cell(price)} plus ${cell(ship)} for shipping and installation. Straight-line to $0 over ${n} years. ${salv > 0 ? `Sells for ${cell(salv)} at the end of year ${n}.` : 'No salvage value at the end.'}`],
              ['Savings', `Operating costs fall by ${cell(save)} a year.`],
              ['Working capital', `Inventory rises by ${cell(nwc)} now. It is recovered at the end of year ${n}.`],
              ['Other facts', `Staff training for a similar machine was paid last month: ${cell(training)}. A bank loan for the new machine costs ${cell(interest)} a year in interest.`],
              ['Tax and required return', `Tax ${T.pctT(tc)}. Required return ${T.pctT(r)}.`],
            ] };
            const label = { init: R`cash flow at \(t = 0\) (the **initial investment**)`, ocf: `**incremental operating cash flow** in each of years 1 to ${n}`, term: `**terminal cash flow** in year ${n} (including that year’s operating cash flow)`, npv: '**NPV** of replacing the machine' }[part];
            const s1 = [
              R`**Part 1.** Old machine: \(BV = ${L.moneyT(oldCost)} - ${age} \times ${M(dOld)} = ${M(bvOld)}\).`,
              stmt([['New machine, shipping, installation', -(price + ship)], ['Sale of old machine', sale], [sale > bvOld ? 'Tax on the gain' : 'Tax saved on the loss', -(sale - bvOld) * tc], ['Increase in NWC', -nwc], ['Initial investment', init, 1]]),
            ];
            const s2 = [
              R`**Part 2.** \(\Delta Dep = ${M(dNew)} - ${M(dOld)} = ${M(dInc)}\).`,
              stmt([['Cost savings', save], ['Incremental depreciation', -dInc], ['EBIT', save - dInc, 1], [`Tax at ${T.pctT(tc)}`, -(save - dInc) * tc], ['Add back depreciation', dInc], ['Operating cash flow', ocf, 1]]),
            ];
            const s3 = [R`**Part 3.** \(CF_{${n}} = ${M(ocf)} + ${L.moneyT(nwc)} + ${L.moneyT(salv)}(1 - ${L.dec(tc)}) = ${M(term)}\).`];
            const s4 = [R`**NPV.** \[NPV = ${M(init)} + ${annuityPV(+ocf.toFixed(2), r, n - 1)} + \frac{${M(term)}}{(${L.onePlus(r)})^{${n}}} = ${M(npv)}\]`, R`${npv > 0 ? R`\(NPV > 0\): replace the machine.` : R`\(NPV < 0\): keep the old machine.`} The training (sunk) and the interest (financing) are ignored.`];
            const steps = part === 'init' ? s1 : part === 'ocf' ? s2 : part === 'term' ? s2.concat(s3) : s1.concat(s2, s3, s4);
            const ans = { init, ocf, term, npv }[part];
            const ms = {
              init: [
                { v: init + (sale - bvOld) * tc, why: sale > bvOld ? 'Tax is due on the gain from selling the old machine.' : 'The loss on the old machine saves tax.' },
                { v: init + nwc, why: 'Include the working capital needed at the start.' },
                { v: init - training, why: 'The training is already paid for: a sunk cost.' },
                { v: -(price + ship) + sale * (1 - tc) - nwc, why: 'Only the gain or loss on the old machine is taxed, not the whole price.' },
              ],
              ocf: [
                { v: (save - dNew) * (1 - tc) + dNew, why: 'Use incremental depreciation: the old machine’s depreciation is lost.' },
                { v: (save - dInc) * (1 - tc), why: 'Add back the incremental depreciation.' },
                { v: (save - dInc - interest) * (1 - tc) + dInc, why: 'Interest is a financing cost. Leave it out.' },
              ],
              term: [
                { v: ocf + nwc + salv, why: 'The new machine is fully depreciated, so its salvage is a taxable gain.' },
                { v: ocf + salv * (1 - tc), why: 'Add the working capital recovered at the end.' },
                { v: endExtra, why: `Include year ${n}’s operating cash flow.` },
              ],
              npv: [
                { v: npv - nwc / Math.pow(1 + r, n), why: 'The working capital is recovered at the end. Include it.' },
                { v: npv + (sale - bvOld) * tc, why: 'Remember the tax effect of selling the old machine.' },
                { v: npv - interest * (1 - tc) * FIN.pvifa(r, n), why: 'Interest is a financing cost. Leave it out.' },
                { v: npv - training, why: 'The training is sunk. Leave it out.' },
              ],
            }[part];
            return {
              q: R`${co} is thinking of replacing an old machine with a new one (details below). The old machine would last another ${n} years. What is the ${label}?`,
              table,
              answer: ans, unit: '$', dp: 2,
              mistakes: clean(ms, ans, '$', 2),
              steps,
              calc: part === 'npv' ? npvKeys(cfs, r) : undefined,
              ti: {
                init: [TI.line(`-(${n6(price)}+${n6(ship)})+${n6(sale)}-(${n6(sale)}-${n6(bvOld)})*${n6(tc)}-${n6(nwc)}`, { note: R`The old machine’s book value is \(${M(bvOld)}\). The training and the interest are left out.` })],
                ocf: [TI.line(`(${n6(save)}-${n6(dInc)})*(1-${n6(tc)})+${n6(dInc)}`, { note: R`\(${M(dInc)}\) is the incremental depreciation, new minus old.` })],
                term: [TI.line(`(${n6(save)}-${n6(dInc)})*(1-${n6(tc)})+${n6(dInc)}`, { note: `Year ${n}’s operating cash flow.` }), TI.line(`ans+${n6(nwc)}+${n6(salv)}-(${n6(salv)}-0)*${n6(tc)}`, { note: 'Plus the NWC back and the after-tax salvage.' })],
                npv: [tiNpv(r, cfs, { note: 'Part 1, then Part 2 for the middle years, then Parts 2 and 3 in the last year.' })],
              }[part],
              why: part === 'npv' ? (npv > 0 ? R`\(NPV > 0\): replacing adds value.` : R`\(NPV < 0\): replacing destroys value.`) : 'Work through the three parts: initial investment, operating cash flows, terminal cash flow.',
            };
          }
          return null;
        } },
      { id: 'w5-g-boss-expand', topic: 'project', level: 3, section: 'B', formula: 'fcf', boss: true, src: 'Tutorial W5 case study (Monash Fibre)',
        make(rng) {
          for (let tries = 0; tries < 100; tries++) {
            const K = rng.step(10, 40, 1), n = rng.pick([5, 8, 10]), dep = K / n;
            const S = rng.step(1, 5, 0.5), Sinc = round(S * rng.step(0.25, 0.75, 0.05), 0.5);
            if (!(Sinc > 0 && Sinc < S)) continue;
            const W = rng.step(2, 12, 1), F = rng.step(0.5, 2, 0.5), tc = rng.pick([0.3, 0.35]), r = rng.step(0.08, 0.16, 0.01);
            // aim the yearly FCF near its break-even level so that both accept and reject cases occur
            const target = ((K + W - W / Math.pow(1 + r, n)) / FIN.pvifa(r, n)) * rng.step(0.8, 1.3, 0.01);
            const cRatio = rng.step(0.5, 0.7, 0.01);
            const R0 = round(((target - dep) / (1 - tc) + Sinc + dep) / (1 - cRatio), 0.5), C = round(R0 * cRatio, 0.5);
            const ebit = R0 - C - Sinc - dep;
            if (ebit <= 0.05 * R0) continue;
            const fcf = ebit * (1 - tc) + dep;
            const cfs = [-K - W].concat(Array(n - 1).fill(fcf)).concat([fcf + W]);
            const npv = FIN.npv(r, cfs);
            if (Math.abs(npv) < 0.02 * K) continue;
            const niRep = (R0 - C - S - dep) * (1 - tc);
            const askNpv = rng.chance(0.5);
            const co = rng.company();
            const table = { head: ['Consultant’s report', `Each year, years 1 to ${n}`], rows: [
              ['Sales revenue', T.moneyT(R0, 3) + 'm'], ['Cost of goods sold', T.moneyT(-C, 3) + 'm'], ['Selling, general and admin (SG&A)', T.moneyT(-S, 3) + 'm'],
              ['Depreciation', T.moneyT(-dep, 3) + 'm'], ['Income tax', T.moneyT(-(R0 - C - S - dep) * tc, 3) + 'm'], ['Net income', T.moneyT(niRep, 3) + 'm'],
            ] };
            const facts = R`The consultants who wrote the report below are owed ${T.moneyT(F, 3)}m whatever you decide.
• The equipment costs ${T.moneyT(K, 3)}m today. It is depreciated straight-line to zero over ${n} years.
• Working capital of ${T.moneyT(W, 3)}m is needed now and recovered in year ${n}.
• Only ${T.moneyT(Sinc, 3)}m of the SG&A is caused by the project.
• Tax is ${T.pctT(tc)}.`;
            const stepFcf = stmt([['Sales revenue', R0], ['Cost of goods sold', -C], ['Incremental SG&A only', -Sinc], ['Depreciation', -dep], ['EBIT', ebit, 1], [`Tax at ${T.pctT(tc)}`, -ebit * tc], ['Add back depreciation', dep], ['Free cash flow', fcf, 1]], (v) => mil(v));
            if (!askNpv) {
              return {
                q: R`${co} is considering an expansion. ${facts}
What is the project’s **free cash flow** in each of years 1 to ${n - 1}?`,
                table,
                answer: fcf, unit: '$m', dp: 3,
                mistakes: clean([
                  { v: (R0 - C - S - dep) * (1 - tc) + dep, why: 'Only the incremental SG&A counts. The rest is paid anyway.' },
                  { v: ebit * (1 - tc), why: 'That is net income. Add back the depreciation.' },
                  { v: (R0 - C - Sinc) * (1 - tc), why: 'That ignores the depreciation tax shield.' },
                  { v: niRep, why: 'That is the consultants’ net income, not a cash flow.' },
                ], fcf, '$m', 3),
                steps: [stepFcf, R`Year ${n} adds back the ${T.moneyT(W, 3)}m of working capital.`],
                ti: [TI.line(`(${n6(R0)}-${n6(C)}-${n6(Sinc)}-${n6(K)}/${n})*(1-${n6(tc)})+${n6(K)}/${n}`, { note: R`In $ millions. \(${n6(K)}/${n}\) is the depreciation. Only the incremental SG&A is taken off.` })],
                why: 'FCF uses incremental costs only and adds back depreciation.',
              };
            }
            return {
              q: R`${co} is considering an expansion. ${facts}
• The cost of capital is ${T.pctT(r)}.
What is the project’s **NPV**?`,
              table,
              answer: npv, unit: '$m', dp: 3,
              mistakes: clean([
                { v: npv - W / Math.pow(1 + r, n), why: 'The working capital is recovered in the final year. Include it.' },
                { v: npv + W - W / Math.pow(1 + r, n), why: R`The working capital needed now is an outflow at \(t = 0\).` },
                { v: npv - F, why: 'The consultants’ fee is owed whatever you decide: it is sunk.' },
                { v: npv - (S - Sinc) * (1 - tc) * FIN.pvifa(r, n), why: 'Only the incremental SG&A counts.' },
              ], npv, '$m', 3),
              steps: [
                stepFcf,
                R`Year 0: \(-${mil(K)} - ${mil(W)} = -${mil(K + W)}\). Year ${n}: \(${mil(fcf)} + ${mil(W)}\).`,
                R`\[NPV = -${mil(K + W)} + ${annuityPV(+fcf.toFixed(4), r, n)}\text{m} + \frac{${mil(W)}}{(${L.onePlus(r)})^{${n}}} = ${mil(npv)}\]`,
              ],
              calc: npvKeys(cfs, r, 'm'),
              ti: [
                TI.line(`(${n6(R0)}-${n6(C)}-${n6(Sinc)}-${n6(K)}/${n})*(1-${n6(tc)})+${n6(K)}/${n}`, { note: R`The yearly FCF, in $ millions. Only the incremental SG&A is taken off.` }),
                TI.line(`npv(${n6(P(r))},${n6(-(K + W))},{ans,ans+${n6(W)}},{${n - 1},1})`, { note: R`\(\text{ans}\) is the FCF: ${n - 1} times, then once more with the NWC back.` }),
              ],
              why: R`${npv > 0 ? R`\(NPV > 0\): accept.` : R`\(NPV < 0\): reject.`} Adding up years of earnings is not a valuation.`,
            };
          }
          return null;
        } },
      { id: 'w5-g-boss-labour', topic: 'replace', level: 3, section: 'B', formula: 'npv', boss: true, src: 'Tutorial W5 Q2 (Springvale)',
        make(rng) {
          for (let tries = 0; tries < 100; tries++) {
            const price = rng.step(20, 200, 5) * 1000, n = rng.pick([5, 8, 10, 15, 20]), dep = price / n;
            const maint = rng.step(1, 15, 0.5) * 1000, ben = rng.chance(0.5) ? rng.step(1, 10, 0.5) * 1000 : 0;
            const tc = rng.pick([0.3, 0.3, 0.35, 0.4]), r = rng.step(0.08, 0.16, 0.01);
            // aim the free cash flow near break-even so that both buy and do-not-buy cases occur
            const target = (price / FIN.pvifa(r, n)) * rng.step(0.75, 1.3, 0.01);
            const sal = round((target - dep) / (1 - tc) + maint + dep - ben, 500);
            if (sal < 15000) continue;
            const ebit = sal + ben - maint - dep;
            if (ebit <= 0) continue;
            const fcf = ebit * (1 - tc) + dep;
            const cfs = [-price].concat(Array(n).fill(fcf));
            const npv = FIN.npv(r, cfs), irr = FIN.irr(cfs);
            if (Math.abs(npv) < 0.02 * price || !Number.isFinite(irr) || irr > 0.8) continue;
            const f1 = (sal + ben - maint) * (1 - tc), f2 = ben ? (sal - maint - dep) * (1 - tc) + dep : null;
            const askIrr = rng.chance(0.3);
            const q = R`A factory owner asks {NAME} whether to replace a worker with a machine. The machine costs ${T.money(price, 0)} and lasts ${n} years (straight-line to $0). It saves the worker’s ${T.money(sal, 0)} salary${ben ? ` and ${T.money(ben, 0)} of benefits` : ''} a year, but costs ${T.money(maint, 0)} a year to maintain. Tax is ${T.pctT(tc)} and the cost of capital is ${T.pctT(r)}. What is the **${askIrr ? 'IRR' : 'NPV'}** of buying the machine?`;
            const steps = [
              R`\(Dep = \frac{${L.moneyT(price)}}{${n}} = ${M(dep)}\).`,
              stmt([['Savings', sal + ben], ['Maintenance', -maint], ['Depreciation', -dep], ['EBIT', ebit, 1], [`Tax at ${T.pctT(tc)}`, -ebit * tc], ['Add back depreciation', dep], ['Free cash flow', fcf, 1]]),
              R`\[NPV = -${L.moneyT(price)} + ${annuityPV(+fcf.toFixed(2), r, n)} = ${M(npv)}\]`,
              R`\(IRR = ${L.pct(irr)}\), ${irr > r ? 'above' : 'below'} the ${T.pctT(r)} cost of capital: NPV and IRR agree.`,
            ];
            const fcfLine = TI.line(`(${n6(sal)}${ben ? '+' + n6(ben) : ''}-${n6(maint)}-${n6(price)}/${n})*(1-${n6(tc)})+${n6(price)}/${n}`, { note: R`The yearly free cash flow. \(${n6(price)}/${n}\) is the depreciation.` });
            if (askIrr) {
              return {
                q, answer: P(irr), unit: '%', dp: 2,
                mistakes: clean([
                  { v: P(FIN.irr([-price].concat(Array(n).fill(f1)))), why: 'That ignores the depreciation tax shield.' },
                  { v: P(FIN.irr([-price].concat(Array(n).fill(sal + ben - maint)))), why: 'The savings are taxed. Work with after-tax cash flows.' },
                  ...(f2 ? [{ v: P(FIN.irr([-price].concat(Array(n).fill(f2)))), why: 'The worker’s benefits are saved too.' }] : []),
                  { v: P(r), why: 'That is the cost of capital, the hurdle the IRR is compared with.' },
                ], P(irr), '%', 2),
                steps,
                calc: `${n} [N] · −${price} [PV] · ${+fcf.toFixed(2)} [PMT] · 0 [FV] · [I/YR] → ${T.num(irr * 100)}`,
                ti: [fcfLine, TI.line(`irr(${n6(-price)},{ans},{${n}})`, { note: R`\(\text{ans}\) is the free cash flow, ${n} times.` })],
                why: irr > r ? R`\(IRR > k\): buy the machine.` : R`\(IRR < k\): do not buy it.`,
              };
            }
            return {
              q, answer: npv, unit: '$', dp: 2,
              mistakes: clean([
                { v: -price + FIN.pvAnnuity(f1, r, n), why: 'That ignores the depreciation tax shield.' },
                { v: -price + FIN.pvAnnuity(sal + ben - maint, r, n), why: 'The savings are taxed. Work with after-tax cash flows.' },
                ...(f2 ? [{ v: -price + FIN.pvAnnuity(f2, r, n), why: 'The worker’s benefits are saved too.' }] : []),
                { v: -price + n * fcf, why: 'That ignores discounting.' },
              ], npv, '$', 2),
              steps,
              calc: npvKeys(cfs, r),
              ti: [fcfLine, TI.line(`npv(${n6(P(r))},${n6(-price)},{ans},{${n}})`, { note: R`\(\text{ans}\) is the free cash flow, ${n} times.` })],
              why: npv > 0 ? R`\(NPV > 0\): buy the machine.` : R`\(NPV < 0\): do not buy it.`,
            };
          }
          return null;
        } },
      { id: 'w5-g-boss-inflation', topic: 'inflation', level: 3, section: 'B', formula: 'fisher', boss: true, src: 'Lecture W5 Examples 2–3',
        make(rng) {
          for (let tries = 0; tries < 100; tries++) {
            const i0 = rng.step(50, 300, 5) * 1000, n = rng.int(3, 4), dep = i0 / n;
            const rev = round(i0 * rng.step(0.5, 1.0, 0.01), 1000), cost = round(rev * rng.step(0.3, 0.6, 0.01), 1000);
            const i = rng.step(0.02, 0.06, 0.005), nom = rng.step(0.09, 0.16, 0.005), tc = rng.pick([0.3, 0.3, 0.35]);
            const years = Array.from({ length: n }, (_, k) => k + 1);
            const rv = years.map((t) => rev * Math.pow(1 + i, t)), cs = years.map((t) => cost * Math.pow(1 + i, t));
            const fcfs = years.map((t, k) => (rv[k] - cs[k] - dep) * (1 - tc) + dep);
            if (fcfs.some((f, k) => rv[k] - cs[k] - dep <= 0)) continue;
            const cfs = [-i0].concat(fcfs), npv = FIN.npv(nom, cfs);
            if (Math.abs(npv) < 0.02 * i0) continue;
            const flat = [-i0].concat(years.map(() => (rev - cost - dep) * (1 - tc) + dep));
            const infDep = [-i0].concat(years.map((t, k) => (rv[k] - cs[k] - dep * Math.pow(1 + i, t)) * (1 - tc) + dep * Math.pow(1 + i, t)));
            return {
              q: R`${rng.company()} buys a machine for ${T.money(i0, 0)}, depreciated straight-line to zero over ${n} years. In **today’s dollars** it adds ${T.money(rev, 0)} of revenue and ${T.money(cost, 0)} of costs a year. Both will rise with inflation of ${T.pctT(i)} a year. Depreciation is fixed in dollars. Tax is ${T.pctT(tc)} and the **nominal** required return is ${T.pctT(nom)}. What is the **NPV**?`,
              answer: npv, unit: '$', dp: 2,
              mistakes: clean([
                { v: FIN.npv(nom, flat), why: 'Revenue and costs grow with inflation. Inflate them before using a nominal rate.' },
                { v: FIN.npv(FIN.fisherReal(nom, i), cfs), why: 'These are nominal cash flows, so use the nominal rate.' },
                { v: FIN.npv(nom, infDep), why: 'Depreciation is fixed in dollars. Do not inflate it.' },
              ], npv, '$', 2),
              steps: [
                R`Inflate revenue and costs by \((${L.onePlus(i)})^{t}\). Depreciation stays \(${M(dep)}\) a year. Then \(FCF_t = (Rev_t - Costs_t - Dep)(1 - ${L.dec(tc)}) + Dep\).`,
                R`\[\begin{array}{c|rrr} t & \text{Revenue} & \text{Costs} & FCF_t \\ \hline ${years.map((t, k) => R`${t} & ${M(rv[k])} & ${M(cs[k])} & ${M(fcfs[k])}`).join(R` \\ `)} \end{array}\]`,
                R`\[NPV = -${L.moneyT(i0)} + ${years.map((t, k) => R`\frac{${M(fcfs[k])}}{(${L.onePlus(nom)})^{${t}}}`).join(' + ')} = ${M(npv)}\]`,
              ],
              calc: npvKeys(cfs, nom),
              ti: [
                TI.line(`((${n6(rev)}-${n6(cost)})*${n6(1 + i)}^{${years.join(',')}}-${n6(i0)}/${n})*(1-${n6(tc)})+${n6(i0)}/${n}`, { note: R`A list of the nominal FCFs, years 1 to ${n}. Revenue and costs grow with inflation. Depreciation, \(${n6(i0)}/${n}\), does not.` }),
                TI.line(`npv(${n6(P(nom))},${n6(-i0)},ans)`, { note: 'Nominal cash flows with the nominal rate.' }),
              ],
              why: 'Nominal cash flows with a nominal rate. Depreciation is a fixed dollar amount, so inflation does not raise its tax shield.',
            };
          }
          return null;
        } },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
