/* Floor 5 — Week 5: Capital budgeting II — cash flow analysis and the replacement decision. */
(function (root) {
  'use strict';
  const { FIN, L, T, FMT } = root;
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
        R`**Part 1, initial investment:** new price + shipping + installation, minus the after-tax sale value of the old asset, plus the NWC increase.`,
        R`**Part 2, operating cash flows:** incremental (new − old) savings and revenues, taxed, plus the tax shield on the **incremental** depreciation (new − old).`,
        R`**Part 3, terminal cash flow:** the last operating cash flow + NWC recovered + after-tax salvage.`,
        R`Replace if the NPV of the incremental cash flows is positive (or IRR > k).`,
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
      { id: 'w5-1', kind: 'battle', name: 'The Loading Dock', topics: ['fcf', 'tax', 'dep'], n: 6,
        enemy: { name: 'The Depreci-gator', title: 'Bites a chunk off your book value every year', body: 'spiky', color: '#4f9a4a', acc: ['shades'], mouth: 'fangs', item: '📉',
          lines: { intro: 'Snap! Every year I bite a chunk off your book value!', hit: ['You added me back? Snap…', 'A depreciation tax shield! My poor scales!'],
            taunt: ['Depreciation is paid in cash, right? Chomp!', 'Forgot to add me back? Delicious!'], win: 'Written down… to zero…', lose: 'Your book value is mine!' } } },
      { id: 'w5-2', kind: 'battle', name: 'The Sorting Line', topics: ['relevant', 'nwc'], n: 6,
        enemy: { name: 'The Sunk Cost Spectre', title: 'Haunts you with money already spent', body: 'ghost', color: '#9aa5b8', acc: ['tophat'], mouth: 'o', item: '🧾',
          lines: { intro: 'Wooo… remember the market research you already paid for?', hit: ['You ignored me… I was sunk all along…', 'Only incremental cash flows? Wooo…'],
            taunt: ['Count the old research! It cost so much!', 'Add the loan interest! Twice is nice!'], win: 'I was… already gone…', lose: 'Your past costs haunt your NPV!' } } },
      { id: 'w5-m1', kind: 'mini', name: 'Cash Flow Sorter', mini: 'cf-sorter' },
      { id: 'w5-3', kind: 'battle', name: 'The Salvage Yard', topics: ['salvage', 'dep', 'nwc'], n: 6,
        enemy: { name: 'Scrap-Metal Sal', title: 'Sells old machines and forgets the tax', body: 'box', color: '#8c7b6b', acc: ['hardhat'], mouth: 'grin', item: '🔧',
          lines: { intro: 'Sold above book value? Tax? Never heard of it!', hit: ['You taxed the gain! Ouch!', 'You got your working capital back? Clever!'],
            taunt: ['Book value, market value, same thing!', 'Leave the working capital in the yard forever!'], win: 'Scrapped… at book value…', lose: 'Sold! No tax, no questions!' } } },
      { id: 'w5-4', kind: 'battle', name: 'The Inflation Chamber', topics: ['inflation', 'project'], n: 6,
        enemy: { name: 'The Inflation Blimp', title: 'Puffs up every nominal number', body: 'round', color: '#e07a5f', acc: ['cap'], mouth: 'o', item: '🎈',
          lines: { intro: 'I puff up nominal cash flows! Mix me with a real rate, I dare you!', hit: ['Nominal with nominal? Pfffft…', 'The Fisher relation! My only weakness!'],
            taunt: ['Real cash flows at a nominal rate? Yum!', 'Mix them up! Mix them up!'], win: 'Deflating… deflating…', lose: 'Inflated your mistakes!' } } },
      { id: 'w5-m2', kind: 'mini', name: 'After-Tax Express', mini: 'after-tax' },
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
          { t: 'Depreciation tax shield', bin: 'inc', why: 'Depreciation cuts tax: Dep × tc is real cash saved.' },
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
          { v: 3500, why: 'That ignores the depreciation tax shield of $3,000 × 0.30 = $900.' },
          { v: 6500, why: 'That mixes the two methods. With the tax-shield method, add Dep × tc ($900), not the full $3,000.' },
        ],
        steps: [
          R`Method 1, add back depreciation:`,
          stmt([['Revenue', 9000], ['Costs', -4000], ['Depreciation', -3000], ['Earnings before tax', 2000, 1], ['Tax at 30%', -600], ['Earnings after tax', 1400, 1], ['Add back depreciation', 3000], ['Cash flow', 4400, 1]]),
          R`Method 2, depreciation tax shield: \[(\$9{,}000 - \$4{,}000)(1 - 0.30) + 0.30 \times \$3{,}000 = \$3{,}500 + \$900 = \$4{,}400\]`,
        ],
        why: R`Both methods give $4,400. Depreciation only matters through the tax it saves.` },
      { id: 'w5-q05', topic: 'tax', kind: 'num', level: 1, section: 'B', src: 'Lecture W5 Example 4', formula: 'dep-shield',
        q: R`Splash Ltd claims $3,000 of extra depreciation a year. The tax rate is 30%. How big is the yearly **depreciation tax shield**?`,
        answer: 900, unit: '$', dp: 2,
        mistakes: [
          { v: 3000, why: 'That is the depreciation itself. The shield is the tax it saves.' },
          { v: 2100, why: R`That is \(Dep \times (1 - t_c)\). The shield is \(Dep \times t_c\).` },
        ],
        steps: [R`\[\text{Tax shield} = Dep \times t_c = \$3{,}000 \times 0.30 = \$900\]`],
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
        wrong: { 1: 'Shipping and installation are part of the cost: $55,000 ÷ 5.', 2: 'It is depreciated to zero, so do not subtract the $10,000 salvage.', 3: 'That is the incremental depreciation (new $11,000 minus old $2,000).' },
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
        why: R`Final operating cash flow + NWC recovery + after-tax salvage.` },
      { id: 'w5-q25', topic: 'salvage', kind: 'num', level: 2, section: 'B', formula: 'salvage',
        q: R`A machine with a book value of $40,000 is sold for $30,000. The tax rate is 30%. What is the **after-tax cash** from the sale?`,
        answer: FIN.afterTaxSalvage(30000, 40000, 0.3), unit: '$', dp: 2,
        mistakes: [
          { v: 27000, why: 'A sale below book value is a loss, which saves tax. The saving is added, not subtracted.' },
          { v: 30000, why: 'The $10,000 loss is tax-deductible: it saves $3,000.' },
          { v: 21000, why: 'Only the gain or loss is taxed, not the whole price.' },
        ],
        steps: [R`Loss \(= \$30{,}000 - \$40{,}000 = -\$10{,}000\). Tax saved \(= \$10{,}000 \times 0.30 = \$3{,}000\).`, R`\[\$30{,}000 - (\$30{,}000 - \$40{,}000)(0.30) = \$33{,}000\]`],
        why: R`Selling below book value creates a tax saving, so you keep more than the sale price.` },
      { id: 'w5-q26', topic: 'salvage', kind: 'num', level: 2, section: 'B', src: 'Lecture W5 Example 5', formula: 'salvage',
        q: R`Nutson Bolz sells its old machine for $15,000. Its book value is $10,000 and the tax rate is 47%. How much **tax** is paid on the sale?`,
        answer: (15000 - 10000) * 0.47, unit: '$', dp: 2,
        mistakes: [
          { v: 15000 * 0.47, why: 'Only the gain over book value is taxed, not the whole price.' },
          { v: 10000 * 0.47, why: 'Tax the gain ($5,000), not the book value.' },
        ],
        steps: [R`Gain \(= \$15{,}000 - \$10{,}000 = \$5{,}000\).`, R`\[\text{Tax} = \$5{,}000 \times 0.47 = \$2{,}350\]`],
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
          { v: 9, why: 'Subtracting is only an approximation. Use the Fisher relation: 1.14 ÷ 1.05 − 1.' },
          { v: P(1.14 * 1.05 - 1), why: 'That multiplies. To remove inflation, divide by 1.05.' },
        ],
        steps: [R`\[1 + r_{real} = \frac{1 + r_{nominal}}{1 + i} = \frac{1.14}{1.05} = ${L.numT(1.14 / 1.05, 6)}\]`, R`\[r_{real} = ${L.pct(EX2_REAL, 4)}\]`],
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
        why: R`Consistent treatment gives $26.47 both ways. The inflation rate is only needed for the real-with-real check.` },
      { id: 'w5-q44', topic: 'inflation', kind: 'num', level: 2, section: 'B', src: 'Lecture W5 Example 3', formula: 'fisher',
        q: R`An investment of $10,000 will generate **real** cash flows of $5,000 at the end of each of the next 3 years. Inflation is 10% a year and the nominal required return is 15%. What is the **NPV**?`,
        answer: -10000 + FIN.pvAnnuity(5000, EX3_REAL, 3), unit: '$', dp: 2,
        mistakes: [
          { v: -10000 + FIN.pvAnnuity(5000, 0.15, 3), why: 'Real cash flows need the real rate. Discounting them at 15% understates the NPV.' },
          { v: -10000 + FIN.pvAnnuity(5000, 0.05, 3), why: 'The real rate is 1.15 ÷ 1.10 − 1 = 4.5455%, not the 5% shortcut.' },
          { v: FIN.npv(EX3_REAL, [-10000, 5500, 6050, 6655]), why: 'You inflated the cash flows but used the real rate. Keep them consistent.' },
        ],
        steps: [
          R`Real rate: \(\frac{1.15}{1.10} - 1 = ${L.pct(EX3_REAL, 4)}\).`,
          R`\[NPV = -\$10{,}000 + \$5{,}000 \times \frac{1}{0.0454545}\left(1 - \frac{1}{1.0454545^{3}}\right) = ${M(-10000 + FIN.pvAnnuity(5000, EX3_REAL, 3))}\]`,
          R`Check, nominal with nominal: cash flows \(\$5{,}500\), \(\$6{,}050\), \(\$6{,}655\) at 15% give the same \(${M(FIN.npv(0.15, [-10000, 5500, 6050, 6655]))}\).`,
        ],
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
          { v: -55000 + 15000 - 5000, why: 'Selling the old machine above book value creates tax: ($15,000 − $10,000) × 47% = $2,350.' },
          { v: -55000 + 15000 - 2350, why: 'Include the $5,000 increase in working capital.' },
          { v: NB.init - 2500, why: 'The training was paid 3 months ago: a sunk cost. Charge none of it.' },
          { v: -55000 + 15000 * 0.53 - 5000, why: 'Only the gain over book value is taxed, not the whole sale price.' },
        ],
        steps: [
          R`Old machine: \(Dep = \frac{\$20{,}000}{10} = \$2{,}000\) a year, so after 5 years \(BV = \$10{,}000\).`,
          stmt([['New machine (incl. shipping, installation)', -55000], ['Sale of old machine', 15000], ['Tax on gain (5,000 × 47%)', -2350], ['Increase in NWC', -5000], ['Initial investment', NB.init, 1]]),
        ],
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
        why: R`Incremental (new − old) savings, taxed, plus the add-back of the incremental depreciation.` },
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
        why: R`\(NPV > 0\) and \(IRR > 20\%\): replace the machine. It creates wealth for the owner.` },
      { id: 'w5-q51', topic: 'replace', kind: 'num', level: 2, section: 'B', src: 'Tutorial W5 Q2 (Springvale)', formula: 'fcf',
        q: R`A $60,000 machine would replace a worker paid $25,500 a year. It costs $8,000 a year to maintain and is depreciated straight-line to zero over 20 years. The tax rate is 30%. What is the yearly **free cash flow** from the swap?`,
        answer: SV.fcf, unit: '$', dp: 2,
        mistakes: [
          { v: (25500 - 8000) * 0.7, why: 'That ignores the depreciation tax shield: $3,000 × 0.30 = $900.' },
          { v: (25500 - 8000 - 3000) * 0.7, why: 'That is earnings after tax. Add back the $3,000 of depreciation.' },
          { v: (25500 - 8000) * 0.7 + 3000, why: 'That mixes the two methods. Add Dep × tc ($900), not the full $3,000.' },
        ],
        steps: [
          R`\(Dep = \frac{\$60{,}000}{20} = \$3{,}000\).`,
          stmt([['Salary saved', 25500], ['Maintenance', -8000], ['Depreciation', -3000], ['EBIT', 14500, 1], ['Tax at 30%', -4350], ['EAT', 10150, 1], ['Add back depreciation', 3000], ['Free cash flow', SV.fcf, 1]]),
        ],
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
        steps: [stmt([['New unit incl. shipping and installation', -750000], ['Working capital', -40000], ['Sale of old unit', 275000], ['Tax on gain (25,000 × 30%)', -7500], ['Net initial investment', -522500, 1]])],
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
        q: R`Consultants value Monash Fibre’s project at $48.75 million: 10 years × $4.875 million of net income. What is wrong with their analysis?`,
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
                { v: (rev - cost) * (1 - tc), why: 'That ignores the depreciation tax shield (Dep × tc).' },
                { v: (rev - cost) * (1 - tc) + dep, why: 'That mixes the two methods. With the tax-shield method, add Dep × tc, not the full Dep.' },
              ], ocf, '$', 2),
              steps: [
                R`Method 1, add back depreciation:`,
                stmt([['Revenue', rev], ['Costs', -cost], ['Depreciation', -dep], ['EBIT', ebit, 1], [`Tax at ${T.pctT(tc)}`, -ebit * tc], ['Earnings after tax', ni, 1], ['Add back depreciation', dep], ['Operating cash flow', ocf, 1]]),
                R`Method 2, tax shield: \[(${L.moneyT(rev)} - ${L.moneyT(cost)})(1 - ${L.dec(tc)}) + ${L.dec(tc)} \times ${L.moneyT(dep)} = ${M((rev - cost) * (1 - tc))} + ${M(dep * tc)} = ${M(ocf)}\]`,
              ],
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
              q: R`A firm buys a ${T.money(price, 0)} machine and pays ${T.money(inst, 0)} to install it. It is depreciated straight-line to zero over ${n} years. It adds ${T.money(rev, 0)} of revenue and ${T.money(cost, 0)} of costs a year. The tax rate is ${T.pctT(tc)}. What are the **incremental earnings** each year?`,
              givens: [[R`\text{Machine}`, L.moneyT(price)], [R`\text{Installation}`, L.moneyT(inst)], ['n', String(n)], [R`\Delta \text{Rev}`, L.moneyT(rev)], [R`\Delta \text{Costs}`, L.moneyT(cost)], ['t_c', L.pctT(tc)]],
              answer: earn, unit: '$', dp: 2,
              mistakes: clean([
                { v: (rev - cost) * (1 - tc), why: 'That ignores depreciation. Earnings are after depreciation.' },
                { v: earn + dep, why: 'That adds depreciation back, which gives the operating cash flow, not the earnings.' },
                { v: ebit, why: 'That is before tax. Multiply by (1 − tc).' },
                { v: (rev - cost - price / n) * (1 - tc), why: 'The installation cost is depreciated too.' },
              ], earn, '$', 2),
              steps: [
                R`\[Dep = \frac{${L.moneyT(price)} + ${L.moneyT(inst)}}{${n}} = ${M(dep)}\]`,
                R`\[\text{Earnings} = (${L.moneyT(rev)} - ${L.moneyT(cost)} - ${M(dep)})(1 - ${L.dec(tc)}) = ${M(earn)}\]`,
              ],
              why: 'Incremental earnings = (Rev − Costs − Dep)(1 − tc). They are a step towards the cash flow.',
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
            why: 'Straight-line spreads (cost − residual value) evenly over the depreciable life.',
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
              { v: k * dep, why: 'That is the accumulated depreciation. Book value = cost minus it.' },
            ], bv, '$', 2),
            steps: [R`\[Dep = \frac{${L.moneyT(cost)}}{${n}} = ${M(dep)} \text{ a year}\]`, R`\[BV = ${L.moneyT(cost)} - ${k} \times ${M(dep)} = ${M(bv)}\]`],
            why: 'Book value = cost − accumulated depreciation. You need it to tax a sale correctly.',
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
              { v: sv * (1 - tc), why: 'Only the gain (SV − BV) is taxed, not the whole price.' },
              { v: sv + gain * tc, why: gain > 0 ? 'Sign slip: tax on a gain is subtracted.' : 'Sign slip: a loss saves tax, so the saving is added.' },
            ], ats, '$', 2),
            steps: [
              R`${gain > 0 ? 'Gain' : 'Loss'} \(= SV - BV = ${L.moneyT(sv)} - ${L.moneyT(bv)} = ${L.moneyT(gain)}\).`,
              R`\[\text{After-tax salvage} = SV - (SV - BV)\,t_c = ${L.moneyT(sv)} - (${L.moneyT(gain)})(${L.dec(tc)}) = ${M(ats)}\]`,
            ],
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
            why: 'Find the book value first. Then tax only the gain (or save tax on the loss).',
          };
        } },
      { id: 'w5-g-terminal', topic: 'salvage', level: 2, section: 'B', formula: 'salvage', src: 'Mock MST Q19',
        make(rng) {
          const ocf = rng.step(5, 200, 1) * 1000, nwc = rng.step(1, 50, 1) * 1000, tc = rng.pick(TAX);
          const bv = rng.chance(0.6) ? 0 : rng.step(1, 20, 1) * 1000;
          let sv = rng.step(1, 40, 1) * 1000;
          if (sv === bv) sv += 1000;
          const ats = FIN.afterTaxSalvage(sv, bv, tc), term = ocf + nwc + ats;
          return {
            q: R`In its final year a project has ${T.money(ocf, 0)} of after-tax operating cash flow. Its machine (book value ${T.money(bv, 0)}) is sold for ${T.money(sv, 0)}. The ${T.money(nwc, 0)} of working capital is recovered. The tax rate is ${T.pctT(tc)}. What is the final year’s **cash flow**?`,
            givens: [['OCF', L.moneyT(ocf)], ['SV', L.moneyT(sv)], ['BV', L.moneyT(bv)], ['NWC', L.moneyT(nwc)], ['t_c', L.pctT(tc)]],
            answer: term, unit: '$', dp: 2,
            mistakes: clean([
              { v: ocf + nwc + sv, why: 'Tax the gain (or credit the loss) on the machine: SV − (SV − BV) × tc.' },
              { v: ocf + ats, why: 'Add the working capital that is recovered.' },
              { v: ocf + nwc * (1 - tc) + ats, why: 'Recovered working capital is not taxed.' },
            ], term, '$', 2),
            steps: [
              R`After-tax salvage: \(${L.moneyT(sv)} - (${L.moneyT(sv)} - ${L.moneyT(bv)})(${L.dec(tc)}) = ${M(ats)}\).`,
              R`\[CF_n = ${L.moneyT(ocf)} + ${L.moneyT(nwc)} + ${M(ats)} = ${M(term)}\]`,
            ],
            why: 'Terminal cash flow = final operating cash flow + NWC recovered + after-tax salvage.',
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
                  { v: P(nom - i), why: 'Subtracting is only an approximation. Divide: (1 + nominal) ÷ (1 + inflation) − 1.' },
                  { v: P((1 + nom) * (1 + i) - 1), why: 'Multiplying adds inflation. To remove it, divide.' },
                ], P(real), '%', 2),
                steps: [R`\[1 + r_{real} = \frac{1 + r_{nom}}{1 + i} = \frac{${L.onePlus(nom)}}{${L.onePlus(i)}} = ${L.numT((1 + nom) / (1 + i), 6)}\]`, R`\[r_{real} = ${L.pct(real, 4)}\]`],
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
                { v: P(real + i), why: 'Adding is only an approximation. Multiply: (1 + real)(1 + inflation) − 1.' },
                { v: P(FIN.fisherReal(real, i)), why: 'That removes inflation. To add it, multiply.' },
              ], P(nom), '%', 2),
              steps: [R`\[1 + r_{nom} = (1 + r_{real})(1 + i) = ${L.onePlus(real)} \times ${L.onePlus(i)} = ${L.numT((1 + real) * (1 + i), 6)}\]`, R`\[r_{nom} = ${L.pct(nom, 4)}\]`],
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
              { v: c * (1 + i * t), why: 'Inflation compounds: use (1 + i) to the power t.' },
              { v: c / Math.pow(1 + i, t), why: 'That removes inflation. Real to nominal multiplies.' },
              { v: c * (1 + i), why: `Apply ${t} years of inflation, not one.` },
            ], nom, '$', 2),
            steps: [R`\[CF^{nom}_{${t}} = CF^{real}_{${t}} \times (1 + i)^{${t}} = ${L.moneyT(c)} \times ${L.onePlus(i)}^{${t}} = ${M(nom)}\]`],
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
                { v: -i0 + FIN.pvAnnuity(c, nom - i, n), why: 'The real rate is (1 + nominal) ÷ (1 + inflation) − 1, not nominal − inflation.' },
                { v: FIN.npv(real, nomCfs), why: 'You inflated the cash flows but used the real rate. Keep them consistent.' },
              ], npv, '$', 2),
              steps: [
                R`Real rate: \[r_{real} = \frac{${L.onePlus(nom)}}{${L.onePlus(i)}} - 1 = ${L.pct(real, 4)}\]`,
                R`\[NPV = -${L.moneyT(i0)} + ${L.moneyT(c)} \times \frac{1}{${L.dec(real, 6)}}\left(1 - \frac{1}{(1 + ${L.dec(real, 6)})^{${n}}}\right) = ${M(npv)}\]`,
                R`Check, nominal with nominal: inflate each cash flow by \((${L.onePlus(i)})^{t}\) and discount at ${T.pctT(nom)}. The NPV is the same.`,
              ],
              calc: `${n} [N] · ${T.numT(real * 100, 6)} [I/YR] · ${c} [PMT] · 0 [FV] · [PV] → then add −${i0}`,
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
            const oldCost = rng.step(20, 400, 5) * 1000, oldLife = rng.int(6, 12), age = rng.int(2, oldLife - 2);
            const bv = oldCost * (1 - age / oldLife);
            const sale = round(bv * rng.step(0.5, 1.6, 0.05), 1000);
            if (Math.abs(sale - bv) < 1000) continue;
            const price = rng.step(50, 800, 5) * 1000, ship = rng.step(2, 40, 1) * 1000, nwc = rng.step(2, 60, 1) * 1000;
            const tax = (sale - bv) * tc;
            const init = -(price + ship) + sale - tax - nwc;
            return {
              q: R`${rng.company()} may replace an old machine. The old one cost ${T.money(oldCost, 0)} ${age} years ago and is depreciated straight-line to zero over ${oldLife} years. It can be sold today for ${T.money(sale, 0)}. The new one costs ${T.money(price, 0)} plus ${T.money(ship, 0)} for shipping and installation. Inventory must rise by ${T.money(nwc, 0)}. The tax rate is ${T.pctT(tc)}. What is the **initial investment** at \(t = 0\)?`,
              answer: init, unit: '$', dp: 2,
              mistakes: clean([
                { v: init + tax, why: sale > bv ? 'The old machine sells above book value: tax is due on the gain.' : 'The old machine sells below book value: the loss saves tax.' },
                { v: init + nwc, why: 'Include the increase in working capital.' },
                { v: init + ship, why: 'Shipping and installation are part of the investment.' },
                { v: -(price + ship) + sale * (1 - tc) - nwc, why: 'Only the gain or loss is taxed, not the whole sale price.' },
              ], init, '$', 2),
              steps: [
                R`Old machine: \(BV = ${L.moneyT(oldCost)} - ${age} \times \frac{${L.moneyT(oldCost)}}{${oldLife}} = ${M(bv)}\).`,
                stmt([['New machine incl. shipping and installation', -(price + ship)], ['Sale of old machine', sale], [sale > bv ? 'Tax on the gain' : 'Tax saved on the loss', -tax], ['Increase in NWC', -nwc], ['Initial investment', init, 1]]),
              ],
              why: 'Initial investment = new cost + extras − after-tax sale of the old machine + NWC.',
            };
          }
          return null;
        } },
      { id: 'w5-g-rep-ocf', topic: 'replace', level: 2, section: 'B', formula: 'fcf', src: 'Lecture W5 Example 5',
        make(rng) {
          for (let tries = 0; tries < 60; tries++) {
            const tc = rng.pick(TAX), n = rng.int(3, 8);
            const price = rng.step(30, 500, 5) * 1000, ship = rng.step(1, 30, 1) * 1000;
            const dNew = (price + ship) / n;
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
                { v: (addRev + save - dNew) * (1 - tc) + dNew, why: 'The old machine’s depreciation is lost. Use the incremental depreciation (new − old).' },
                { v: ebit * (1 - tc), why: 'Add back the incremental depreciation: it is not cash.' },
                { v: ebit * (1 - tc) + dNew, why: 'Add back the same incremental depreciation you subtracted, not the new machine’s.' },
                { v: (addRev + save) * (1 - tc), why: 'That ignores the tax shield on the incremental depreciation.' },
              ], ocf, '$', 2),
              steps: [
                R`\[\Delta Dep = \frac{${L.moneyT(price)} + ${L.moneyT(ship)}}{${n}} - ${L.moneyT(dOld)} = ${M(dNew)} - ${L.moneyT(dOld)} = ${M(dInc)}\]`,
                stmt([...(addRev ? [['Extra revenue', addRev]] : []), ['Cost savings', save], ['Incremental depreciation', -dInc], ['EBIT', ebit, 1], [`Tax at ${T.pctT(tc)}`, -ebit * tc], ['Add back depreciation', dInc], ['Operating cash flow', ocf, 1]]),
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
            q: R`A replacement project lasts ${n} years. Working capital of ${T.money(w0, 0)} is put in at the start, plus ${T.money(w1, 0)} more in each of years 1 to ${n - 1}. All of it is recovered in year ${n}. The new machine is fully depreciated and sells for ${T.money(sv, 0)} in year ${n}. Year ${n}’s operating cash flow is ${T.money(ocf, 0)} and the tax rate is ${T.pctT(tc)}. What is the **terminal cash flow**?`,
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
            why: 'Terminal cash flow = last operating cash flow + all NWC recovered + after-tax salvage.',
          };
        } },

      /* ---------- boss: full replacement decisions and projects ---------- */
      { id: 'w5-g-boss-replace', topic: 'replace', level: 3, section: 'B', formula: 'npv', boss: true, src: 'Lecture W5 Example 5',
        make(rng) {
          for (let tries = 0; tries < 200; tries++) {
            const tc = rng.pick([0.3, 0.3, 0.35, 0.4]), n = rng.int(4, 6), r = rng.step(0.08, 0.16, 0.01);
            const age = rng.int(2, 6), oldLife = age + n;
            const oldCost = rng.step(20, 150, 5) * 1000, dOld = oldCost / oldLife, bvOld = oldCost - age * dOld;
            const sale = round(bvOld * rng.step(0.5, 1.6, 0.05), 1000);
            if (Math.abs(sale - bvOld) < 1000) continue;
            const price = rng.step(40, 300, 5) * 1000, ship = rng.step(2, 20, 1) * 1000;
            const dNew = (price + ship) / n, dInc = dNew - dOld;
            if (dInc <= 0) continue;
            const salv = round(price * rng.step(0, 0.2, 0.02), 1000), nwc = rng.step(2, 20, 1) * 1000;
            const training = rng.step(2, 10, 1) * 1000, interest = round(price * rng.step(0.04, 0.08, 0.01), 100);
            const init = -(price + ship) + sale - (sale - bvOld) * tc - nwc;
            const endExtra = nwc + salv * (1 - tc);
            const ocf0 = -(init + endExtra / Math.pow(1 + r, n)) / FIN.pvifa(r, n);
            const save = round(((ocf0 - dInc * tc) / (1 - tc)) * rng.step(0.85, 1.2, 0.01), 500);
            if (save <= dInc * 0.5) continue;
            const ocf = (save - dInc) * (1 - tc) + dInc;
            const term = ocf + endExtra;
            const cfs = [init].concat(Array(n - 1).fill(ocf)).concat([term]);
            const npv = FIN.npv(r, cfs);
            if (Math.abs(npv) < 0.01 * price) continue;
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
            const label = { init: 'initial investment at t = 0', ocf: `incremental operating cash flow in each of years 1 to ${n}`, term: `terminal cash flow in year ${n} (including that year’s operating cash flow)`, npv: 'NPV of replacing the machine' }[part];
            const s1 = [
              R`**Part 1.** Old machine: \(BV = ${L.moneyT(oldCost)} - ${age} \times ${M(dOld)} = ${M(bvOld)}\).`,
              stmt([['New machine incl. shipping and installation', -(price + ship)], ['Sale of old machine', sale], [sale > bvOld ? 'Tax on the gain' : 'Tax saved on the loss', -(sale - bvOld) * tc], ['Increase in NWC', -nwc], ['Initial investment', init, 1]]),
            ];
            const s2 = [
              R`**Part 2.** \(\Delta Dep = ${M(dNew)} - ${M(dOld)} = ${M(dInc)}\).`,
              stmt([['Cost savings', save], ['Incremental depreciation', -dInc], ['EBIT', save - dInc, 1], [`Tax at ${T.pctT(tc)}`, -(save - dInc) * tc], ['Add back depreciation', dInc], ['Operating cash flow', ocf, 1]]),
            ];
            const s3 = [R`**Part 3.** \(CF_{${n}} = ${M(ocf)} + ${L.moneyT(nwc)} + ${L.moneyT(salv)}(1 - ${L.dec(tc)}) = ${M(term)}\).`];
            const s4 = [R`**NPV.** \[NPV = ${M(init)} + ${annuityPV(+ocf.toFixed(2), r, n - 1)} + \frac{${M(term)}}{(${L.onePlus(r)})^{${n}}} = ${M(npv)}\]`, R`${npv > 0 ? 'NPV > 0: replace the machine.' : 'NPV < 0: keep the old machine.'} The training (sunk) and the interest (financing) are ignored.`];
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
              q: R`${co} is thinking of replacing an old machine with a new one (details below). The old machine would last another ${n} years. What is the **${label}**?`,
              table,
              answer: ans, unit: '$', dp: 2,
              mistakes: clean(ms, ans, '$', 2),
              steps,
              calc: part === 'npv' ? npvKeys(cfs, r) : undefined,
              why: part === 'npv' ? `NPV ${npv > 0 ? '> 0: replacing adds value' : '< 0: replacing destroys value'}.` : 'Work through the three parts: initial investment, operating cash flows, terminal cash flow.',
            };
          }
          return null;
        } },
      { id: 'w5-g-boss-expand', topic: 'project', level: 3, section: 'B', formula: 'fcf', boss: true, src: 'Tutorial W5 case study (Monash Fibre)',
        make(rng) {
          for (let tries = 0; tries < 100; tries++) {
            const K = rng.step(10, 40, 1), n = rng.pick([5, 8, 10]), dep = K / n;
            const R0 = rng.step(15, 60, 1), C = round(R0 * rng.step(0.5, 0.75, 0.01), 0.5);
            const S = rng.step(1, 5, 0.5), Sinc = round(S * rng.step(0.25, 0.75, 0.05), 0.5);
            if (!(Sinc > 0 && Sinc < S)) continue;
            const W = rng.step(2, 12, 1), F = rng.step(0.5, 2, 0.5), tc = rng.pick([0.3, 0.35]), r = rng.step(0.08, 0.16, 0.01);
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
            const facts = R`The report is from consultants who are owed ${T.moneyT(F, 3)}m whatever you decide. The equipment costs ${T.moneyT(K, 3)}m today and is depreciated straight-line to zero over ${n} years. The project needs ${T.moneyT(W, 3)}m of working capital now, recovered in year ${n}. Only ${T.moneyT(Sinc, 3)}m of the SG&A is caused by the project. Tax is ${T.pctT(tc)}.`;
            const stepFcf = stmt([['Sales revenue', R0], ['Cost of goods sold', -C], ['Incremental SG&A only', -Sinc], ['Depreciation', -dep], ['EBIT', ebit, 1], [`Tax at ${T.pctT(tc)}`, -ebit * tc], ['Add back depreciation', dep], ['Free cash flow', fcf, 1]], (v) => mil(v));
            if (!askNpv) {
              return {
                q: R`${co}: ${facts} What is the project’s **free cash flow** in each of years 1 to ${n - 1}?`,
                table,
                answer: fcf, unit: '$m', dp: 3,
                mistakes: clean([
                  { v: (R0 - C - S - dep) * (1 - tc) + dep, why: 'Only the incremental SG&A counts. The rest is paid anyway.' },
                  { v: ebit * (1 - tc), why: 'That is net income. Add back the depreciation.' },
                  { v: (R0 - C - Sinc) * (1 - tc), why: 'That ignores the depreciation tax shield.' },
                  { v: niRep, why: 'That is the consultants’ net income, not a cash flow.' },
                ], fcf, '$m', 3),
                steps: [stepFcf, R`Year ${n} adds back the ${T.moneyT(W, 3)}m of working capital.`],
                why: 'FCF uses incremental costs only and adds back depreciation.',
              };
            }
            return {
              q: R`${co}: ${facts} The cost of capital is ${T.pctT(r)}. What is the project’s **NPV**?`,
              table,
              answer: npv, unit: '$m', dp: 3,
              mistakes: clean([
                { v: npv - W / Math.pow(1 + r, n), why: 'The working capital is recovered in the final year. Include it.' },
                { v: npv + W - W / Math.pow(1 + r, n), why: 'The working capital needed now is an outflow at t = 0.' },
                { v: npv - F, why: 'The consultants’ fee is owed whatever you decide: it is sunk.' },
                { v: npv - (S - Sinc) * (1 - tc) * FIN.pvifa(r, n), why: 'Only the incremental SG&A counts.' },
              ], npv, '$m', 3),
              steps: [
                stepFcf,
                R`Year 0: \(-${mil(K)} - ${mil(W)} = -${mil(K + W)}\). Year ${n}: \(${mil(fcf)} + ${mil(W)}\).`,
                R`\[NPV = -${mil(K + W)} + ${annuityPV(+fcf.toFixed(4), r, n)}\text{m} + \frac{${mil(W)}}{(${L.onePlus(r)})^{${n}}} = ${mil(npv)}\]`,
              ],
              calc: npvKeys(cfs, r, 'm'),
              why: `NPV ${npv > 0 ? '> 0: accept' : '< 0: reject'}. Earnings × years is not a valuation.`,
            };
          }
          return null;
        } },
      { id: 'w5-g-boss-labour', topic: 'replace', level: 3, section: 'B', formula: 'npv', boss: true, src: 'Tutorial W5 Q2 (Springvale)',
        make(rng) {
          for (let tries = 0; tries < 100; tries++) {
            const price = rng.step(20, 200, 5) * 1000, n = rng.pick([5, 8, 10, 15, 20]), dep = price / n;
            const maint = rng.step(1, 15, 0.5) * 1000, sal = Math.max(20000, round(price * rng.step(0.15, 0.5, 0.01) + maint, 500)), ben = rng.chance(0.5) ? rng.step(1, 10, 0.5) * 1000 : 0;
            const tc = rng.pick([0.3, 0.3, 0.35, 0.4]), r = rng.step(0.08, 0.16, 0.01);
            const ebit = sal + ben - maint - dep;
            if (ebit <= 0) continue;
            const fcf = ebit * (1 - tc) + dep;
            const cfs = [-price].concat(Array(n).fill(fcf));
            const npv = FIN.npv(r, cfs), irr = FIN.irr(cfs);
            if (Math.abs(npv) < 0.02 * price || !Number.isFinite(irr) || irr > 0.8) continue;
            const f1 = (sal + ben - maint) * (1 - tc), f2 = ben ? (sal - maint - dep) * (1 - tc) + dep : null;
            const askIrr = rng.chance(0.3);
            const who = rng.person();
            const q = R`${who} could replace a worker with a machine. The machine costs ${T.money(price, 0)} and lasts ${n} years (straight-line to $0). It saves the worker’s ${T.money(sal, 0)} salary${ben ? ` and ${T.money(ben, 0)} of benefits` : ''} a year, but costs ${T.money(maint, 0)} a year to maintain. Tax is ${T.pctT(tc)} and the cost of capital is ${T.pctT(r)}. What is the **${askIrr ? 'IRR' : 'NPV'}** of buying the machine?`;
            const steps = [
              R`\(Dep = \frac{${L.moneyT(price)}}{${n}} = ${M(dep)}\).`,
              stmt([['Savings', sal + ben], ['Maintenance', -maint], ['Depreciation', -dep], ['EBIT', ebit, 1], [`Tax at ${T.pctT(tc)}`, -ebit * tc], ['Add back depreciation', dep], ['Free cash flow', fcf, 1]]),
              R`\[NPV = -${L.moneyT(price)} + ${annuityPV(+fcf.toFixed(2), r, n)} = ${M(npv)}\]`,
              R`\(IRR = ${L.pct(irr)}\), ${irr > r ? 'above' : 'below'} the ${T.pctT(r)} cost of capital: NPV and IRR agree.`,
            ];
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
                why: `IRR ${irr > r ? '> k: buy the machine' : '< k: do not buy it'}.`,
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
              why: `NPV ${npv > 0 ? '> 0: buy the machine' : '< 0: do not buy it'}.`,
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
              why: 'Nominal cash flows with a nominal rate. Depreciation is a fixed dollar amount, so inflation does not raise its tax shield.',
            };
          }
          return null;
        } },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
