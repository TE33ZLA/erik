/* Floor 6 — Week 7: Capital budgeting III — sensitivity, scenarios, decision trees and real options.
 * (There is no Week 6 in the course material, so Week 7 sits on floor 6.) */
(function (root) {
  'use strict';
  const { FIN, L, T, FMT, TI } = root;
  const R = String.raw;
  const P = (r) => +(r * 100).toFixed(8); // decimal rate -> percent units for answers
  const K = (x, dp = 4) => String(+(+x).toFixed(dp)); // calculator keystroke number (no commas)
  const tn = (x) => TI.num(x); // a number as typed on the TI-Nspire (no commas, at most 6 decimals)
  const plus = (x) => (x < 0 ? `-${tn(-x)}` : `+${tn(x)}`); // "+5" or "-5" inside a typed line
  const dsc = (r, k) => (k === 1 ? `/${tn(1 + r)}` : `/${tn(1 + r)}^${k}`); // "/1.1" or "/1.1^3"

  /* ---------- local helpers ---------- */
  // Lecture model (slides 10–15): a level perpetuity, no tax: NPV = (price − cost) × units / r − initial cost
  const npvPerp = (q, p, v, r, inv) => ((p - v) * q) / r - inv;
  const pv = (x, r, t) => x / Math.pow(1 + r, t);
  const pct = (p) => T.pctT(p); // 0.35 -> "35%"
  const mL = (x, dp = 2) => R`${x < 0 ? '-' : ''}\$${L.numT(Math.abs(x), dp)}\text{m}`; // LaTeX $m amount, sign first
  // money for working lines: whole dollars without ".00", otherwise cents
  const whole = (x) => Math.abs(x - Math.round(x)) < 0.005;
  const LM = (x, dp = 2) => (dp > 0 && whole(x) ? L.moneyT(Math.round(x)) : L.money(x, dp));
  const TM = (x) => (whole(x) ? T.moneyT(Math.round(x)) : T.money(x));
  const neg = (tex, x) => (x < 0 ? `(${tex})` : tex); // wrap a negative value in brackets
  // decision-tree builders (tree visual aid)
  const end = (label) => ({ t: 'end', label });
  const branches = (list) => list.map(([edge, node]) => ({ edge, node }));
  const chance = (label, list) => ({ t: 'chance', label, kids: branches(list) });
  const decide = (label, list) => ({ t: 'decision', label, kids: branches(list) });
  // drop distractors that would display the same as the answer or as each other
  function uniq(answer, list, unit, dp) {
    const show = (v) => FMT.answerText(v, unit, dp);
    const seen = new Set([show(answer)]);
    return list.filter((m) => {
      if (!Number.isFinite(m.v)) return false;
      const s = show(m.v);
      if (seen.has(s)) return false;
      seen.add(s);
      return true;
    });
  }

  /* ---------- the balloon model (Tutorial W7 Q3): 2-year asset, option to sell after a low year 1 ---------- */
  function balloon(C, H, Lo, s, r, hh, hl, ll) {
    const pH1 = hh + hl, pL1 = 1 - pH1;
    const pH2H = hh / pH1, pL2L = ll / pL1, pH2L = 1 - pL2L;
    const E2H = pH2H * H + (1 - pH2H) * Lo, E2L = pH2L * H + pL2L * Lo;
    const keepL = E2L / (1 + r), sal = s * C;
    const abandon = sal > keepL;
    const V1H = H + E2H / (1 + r), V1L = Lo + Math.max(keepL, sal);
    const npv = -C + (pH1 * V1H + pL1 * V1L) / (1 + r);
    const npvKeep = -C + (pH1 * V1H + pL1 * (Lo + keepL)) / (1 + r);
    const npvSell = -C + (pH1 * V1H + pL1 * (Lo + sal)) / (1 + r);
    // mistake: joint probabilities used as if they were conditional
    const E2Hj = hh * H + hl * Lo, E2Lj = (1 - hh - hl - ll) * H + ll * Lo;
    const npvJoint = -C + (pH1 * (H + E2Hj / (1 + r)) + pL1 * (Lo + Math.max(E2Lj / (1 + r), sal))) / (1 + r);
    // mistake: year-2 cash flows discounted only once (compared undiscounted at t = 1)
    const npvOnce = -C + (pH1 * (H + E2H) + pL1 * (Lo + Math.max(E2L, sal))) / (1 + r);
    return { pH1, pL1, pH2H, pL2L, pH2L, E2H, E2L, keepL, sal, abandon, V1H, V1L, npv, npvKeep, npvSell, npvJoint, npvOnce };
  }

  /* ---------- lecture and tutorial examples, computed once ---------- */
  const ELEC = (() => {
    const v1 = 150000 / 0.12, e1 = 0.33 * v1;
    return { v1, e1, npv: -500000 + e1 / 1.12 };
  })();
  const GROCER = (() => {
    const e = 0.4 * 100000 + 0.6 * 50000, a = FIN.pvifa(0.12, 5);
    return { e, a, pv: e * a, npv: -250000 + e * a, high: -250000 + 100000 * a };
  })();
  const INNO = (() => {
    const e = 0.4 * 600000 + 0.6 * 200000, a = FIN.pvifa(0.15, 5), pv2 = e * a;
    const v2 = 0.3 * pv2 + 0.7 * 50000, npv = -250000 + v2 / Math.pow(1.15, 2);
    return { e, a, pv2, v2, npv, pv0: v2 / Math.pow(1.15, 2) };
  })();
  const CHIP = (() => {
    const r = 0.10, a5 = FIN.pvifa(r, 5), a3 = FIN.pvifa(r, 3), d3 = Math.pow(1 + r, 3);
    const upH = -3 + 0.9 * a5, noH = 0.52 * a5, upL = -3 + 0.7 * a5, noL = 0.36 * a5;
    const bH = Math.max(upH, noH), bL = Math.max(upL, noL);
    const hiB = bH / d3 + 0.6 * a3, loB = bL / d3 + 0.2 * a3;
    const B = -3 + 0.7 * hiB + 0.3 * loB;
    const aH = 0.9 * a5, aL = 0.7 * a5;
    const hiA = aH / d3 + 1 * a3, loA = aL / d3 + 0.5 * a3;
    const A = -4 + 0.7 * hiA + 0.3 * loA;
    return {
      a5, a3, d3, upH, noH, upL, noL, bH, bL, hiB, loB, B, aH, aL, hiA, loA, A,
      // distractors
      bNoCF: -3 + 0.7 * (bH / d3) + 0.3 * (bL / d3),
      bNoDisc: -3 + 0.7 * (bH + 0.6 * a3) + 0.3 * (bL + 0.2 * a3),
      bAlwaysUp: -3 + 0.7 * (upH / d3 + 0.6 * a3) + 0.3 * (bL / d3 + 0.2 * a3),
      aNoDisc: -4 + 0.7 * (aH + a3) + 0.3 * (aL + 0.5 * a3),
      aUncond: -4 + (0.7 * 1 + 0.3 * 0.5) * a3 + ((0.7 * 1 + 0.3 * 0.5) * a5) / d3,
    };
  })();
  const LARGE = balloon(135000, 100000, 55000, 0.45, 0.10, 0.60, 0.15, 0.20);
  const SMALL = balloon(90000, 70000, 45000, 0.45, 0.10, 0.60, 0.15, 0.20);
  const UNTER = (() => {
    const r = 0.10, a7 = FIN.pvifa(r, 7), a9 = FIN.pvifa(r, 9);
    const up2 = -70 + 30 * a7, no2 = 5 * a7;
    const best2 = Math.max(up2, no2);
    const qApp = 5 / 1.1 + (5 + best2) / 1.21, qBan = 5 / 1.1 + 85 / 1.21;
    const quarter = -30 + 0.9 * qApp + 0.1 * qBan;
    const eApp = 30 * a9, eBan = 30 / 1.1 + 40 / 1.21;
    const entire = -100 + 0.7 * eApp + 0.3 * eBan;
    return {
      a7, a9, up2, no2, qApp, qBan, quarter, eApp, eBan, entire,
      quarterNoOpt: -30 + 0.9 * (5 / 1.1 + (5 + no2) / 1.21) + 0.1 * qBan,
      quarterNoDisc2: -30 + 0.9 * (5 / 1.1 + 5 / 1.21 + best2) + 0.1 * qBan,
      quarterNoSavings: -30 + 0.9 * (best2 / 1.21) + 0.1 * (80 / 1.21),
      entireNoBan: -100 + 30 * a9,
      entireNoSalvage: -100 + 0.7 * eApp + 0.3 * (30 / 1.1 + 30 / 1.21),
      entireNoDisc: -100 + 0.7 * 30 * 9 + 0.3 * (30 + 40),
    };
  })();

  /* ---------- static decision trees ---------- */
  const TREE_ELEC = decide(R`\(t = 0\)`, [
    ['Research: −$500,000', chance(R`\(t = 1\)`, [
      ['33% success', end(R`$150,000 a year forever (worth $1.25m at \(t = 1\))`)],
      ['67% failure', end('$0')],
    ])],
    ['Do not research', end('$0')],
  ]);
  const TREE_GROCER = decide(R`\(t = 0\)`, [
    ['Advertise: −$250,000', chance(undefined, [
      ['40%', end('+$100,000 a year, years 1–5')],
      ['60%', end('+$50,000 a year, years 1–5')],
    ])],
    ['Do not advertise', end('$0')],
  ]);
  const TREE_INNO = decide(R`\(t = 0\)`, [
    ['Develop: −$250,000', chance(R`\(t = 2\)`, [
      ['30% success', chance(undefined, [
        ['40% high demand', end('$600,000 a year, years 3–7')],
        ['60% low demand', end('$200,000 a year, years 3–7')],
      ])],
      ['70% failure', end(R`Sell equipment: $50,000 at \(t = 2\)`)],
    ])],
    ['Do not develop', end('$0')],
  ]);
  const TREE_CHIP_UP = decide(R`\(t = 3\), after high demand`, [
    ['Upgrade: −$3m', chance(undefined, [['0.8 high', end('$1m a year, years 4–8')], ['0.2 low', end('$0.5m a year, years 4–8')]])],
    ['Do not upgrade', chance(undefined, [['0.8 high', end('$0.6m a year, years 4–8')], ['0.2 low', end('$0.2m a year, years 4–8')]])],
  ]);
  const TREE_CHIP_B = chance(R`Buy B: −$3m at \(t = 0\)`, [
    ['0.7 high', end(R`$0.6m a year in years 1–3, then best choice at \(t = 3\) worth $1.971m`)],
    ['0.3 low', end(R`$0.2m a year in years 1–3, then best choice at \(t = 3\) worth $1.365m`)],
  ]);
  const TREE_CHIP_A = chance(R`Buy A: −$4m at \(t = 0\)`, [
    ['0.7 high: $1m a year, years 1–3', chance(R`\(t = 3\)`, [['0.8 high', end('$1m a year, years 4–8')], ['0.2 low', end('$0.5m a year, years 4–8')]])],
    ['0.3 low: $0.5m a year, years 1–3', chance(R`\(t = 3\)`, [['0.4 high', end('$1m a year, years 4–8')], ['0.6 low', end('$0.5m a year, years 4–8')]])],
  ]);
  const balloonTree = (C, H, Lo, sal, probs) => chance(`Buy: −${T.moneyT(C)}`, [
    [`${probs ? probs[0] + ' ' : ''}high year 1 (${T.moneyT(H)})`, chance(R`\(t = 2\)`, [
      [`${probs ? probs[1] + ' ' : ''}high`, end(T.moneyT(H))],
      [`${probs ? probs[2] + ' ' : ''}low`, end(T.moneyT(Lo))],
    ])],
    [`${probs ? probs[3] + ' ' : ''}low year 1 (${T.moneyT(Lo)})`, decide(R`\(t = 1\)`, [
      ['Keep', chance(R`\(t = 2\)`, [
        [`${probs ? probs[4] + ' ' : ''}high`, end(T.moneyT(H))],
        [`${probs ? probs[5] + ' ' : ''}low`, end(T.moneyT(Lo))],
      ])],
      ['Sell', end(R`${T.moneyT(sal)} at \(t = 1\)`)],
    ])],
  ]);
  const BALLOON_PROBS = ['75%', '80%', '20%', '25%', '20%', '80%'];
  const TREE_UNTER_Q = chance('Quarter of fleet: −$30m (saves $5m a year in years 1–2)', [
    ['90% approved', decide(R`\(t = 2\)`, [
      ['Upgrade the rest: −$70m', end('$30m a year, years 3–9')],
      ['No upgrade', end('$5m a year, years 3–9')],
    ])],
    ['10% banned', end(R`Sell the fleet for $80m at \(t = 2\)`)],
  ]);
  const TREE_UNTER_E = chance('Entire fleet: −$100m (saves $30m a year)', [
    ['70% approved', end('$30m a year, years 1–9')],
    ['30% banned', end(R`$30m in years 1–2, then sell for $10m at \(t = 2\)`)],
  ]);

  root.registerPack({
    id: 'w7', floor: 6, week: 'Week 7',
    title: 'The Uncertainty Lab',
    topic: 'Capital budgeting III: sensitivity, scenarios and decision trees',
    color: '#5b8c2a', icon: '🌳',
    intro: 'Welcome to the Uncertainty Lab. Every forecast up here might be wrong. Stress-test your numbers, map every branch, and only then invest.',

    briefing: [
      { h: 'How confident are you in the numbers?', points: [
        R`An NPV is built on **estimates**: unit sales, prices, costs and the cost of capital. Any of them can be wrong.`,
        R`Recap of the incremental after-tax free cash flow layout: Revenue, less COGS, is gross profit. Less SG&A and depreciation, it is **EBIT**. Less tax, it is incremental earnings. Then add back depreciation, and subtract capital expenditure and the change in NWC.`,
        R`\[FCF = (Rev - Costs - Dep)(1 - t_c) + Dep - CapEx - \Delta NWC\]`,
        R`Leave out **sunk costs** and **financing costs** (interest). NWC is recovered in the last year.`,
        R`**Garbage in, garbage out:** sensitivity, scenario and decision-tree analysis all fail if the inputs are unreliable.`,
      ] },
      { h: 'Break-even analysis', points: [
        R`The **break-even** level of a parameter is the level that makes \(NPV = 0\).`,
        R`The **accounting (EBIT) break-even** is the number of units that makes \(EBIT = 0\): \(\text{Units} \times (\text{Price} - \text{Cost per unit}) - SG\&A - Dep = 0\).`,
        R`\[\text{Units} = \frac{SG\&A + Dep}{\text{Price} - \text{Cost per unit}}\]`,
        R`EBIT break-even ignores the cost of capital. The NPV break-even includes it.`,
      ] },
      { h: 'Sensitivity analysis', points: [
        R`Change **one** assumption at a time. Keep every other input at its base value.`,
        R`Lecture example (no tax, cash flows forever): \(NPV = \frac{(80 - 60) \times 6{,}000}{0.10} - 500{,}000 = \$700{,}000\).`,
        R`Units fall 8.3% to 5,500: \(NPV = \$600{,}000\), a **14.29%** fall. Units rise to 6,500: \(NPV = \$800{,}000\).`,
        R`The input with the **biggest NPV swing** is the one to forecast most carefully.`,
      ] },
      { h: 'Scenario analysis', points: [
        R`Change **several** assumptions **together**, as one story: worst, base and best case.`,
        R`Worst case: \(\frac{(75 - 62) \times 5{,}500}{0.12} - 500{,}000 = \$95{,}833\). Best case: \(\frac{(85 - 58) \times 6{,}500}{0.08} - 500{,}000 = \$1{,}693{,}750\).`,
        R`Sensitivity: one input at a time. Scenario: many inputs at once. Do not swap them.`,
      ] },
      { h: 'Decision trees', points: [
        R`A **decision node** (□) is a choice you make. Keep the branch with the **highest NPV**.`,
        R`A **chance node** (○) is uncertainty you do not control. It is worth its **expected value**: \(E[X] = \sum_k p_k \times X_k\).`,
        R`Solve **backwards**: value the last decision first, then move towards today. Discount every node value back to \(t = 0\).`,
        R`ELEC P/L: \(NPV = -500{,}000 + \frac{0.33 \times 150{,}000 / 0.12}{1.12} = -\$131{,}696.43\), so do not proceed.`,
      ] },
      { h: 'Joint and conditional probabilities', points: [
        R`A **joint** probability covers a whole path, e.g. \(P(H_1 \text{ and } H_2)\). All the paths add up to 1.`,
        R`A **conditional** probability sits on a branch after a node, e.g. \(P(H_2 \mid H_1)\).`,
        R`\[P(H_1 \text{ and } H_2) = P(H_1) \times P(H_2 \mid H_1)\]`,
        R`Balloons: \(P(H_1) = 0.60 + 0.15 = 0.75\), so \(P(H_2 \mid H_1) = \frac{0.60}{0.75} = 0.8\).`,
      ] },
      { h: 'Real options', points: [
        R`A **real option** is a right, not a duty, to act later: **upgrade or expand**, or **abandon** and sell.`,
        R`You only use an option when it adds value, so an option can never lower the NPV.`,
        R`Chip machines: after high demand, upgrading B is worth \(\$0.412\text{m}\) against \(\$1.971\text{m}\) for not upgrading. So do not upgrade. Buy A: \(\$0.506\text{m} > -\$0.462\text{m}\).`,
        R`Unter: a quarter of the fleet (\(\$41.86\text{m}\)) beats the entire fleet (\(\$39.04\text{m}\)), because it can upgrade after the regulator approves.`,
      ] },
    ],

    topics: {
      fcf: 'Cash flow recap and forecast quality',
      breakeven: 'Break-even analysis',
      sens: 'Sensitivity analysis',
      scen: 'Scenario analysis',
      tree: 'Decision tree basics',
      ev: 'Expected values in decision trees',
      prob: 'Joint and conditional probabilities',
      option: 'Real options: upgrade and abandon',
    },

    nodes: [
      { id: 'w7-1', kind: 'battle', name: 'The Forecast Office', topics: ['fcf', 'breakeven'], n: 6,
        enemy: { name: 'Break-Even Steven', title: 'Never wins, never loses', body: 'round', color: '#c9a23a', acc: ['glasses', 'tie'], mouth: 'flat', item: '⚖️',
          lines: { intro: 'Profit? Loss? I prefer exactly zero. Perfectly balanced.', hit: ['You found my break-even point!', 'EBIT above zero? How unbalanced!'],
            taunt: ['Forgot the depreciation, did we?', 'Divide by the price? Try the margin per unit!'], win: 'I have been pushed… below zero…', lose: 'Zero profit, zero progress. Balanced, as all things should be.' } } },
      { id: 'w7-2', kind: 'battle', name: 'The Sensitivity Chamber', topics: ['sens', 'scen'], n: 6,
        enemy: { name: 'The What-If Wizard', title: 'Twists one dial, then all of them', body: 'tall', color: '#8a6fd1', acc: ['wizard'], mouth: 'smirk', item: '🔮',
          lines: { intro: 'What if sales fall? What if costs rise? What if… everything?', hit: ['One input at a time… you understand sensitivity!', 'A full scenario? My crystal ball cracks!'],
            taunt: ['You changed every dial. That is a scenario, apprentice!', 'Sensitivity, scenario… they look the same to you, hmm?'], win: 'What if… I lose? Oh. I did.', lose: 'In every scenario, I win!' } } },
      { id: 'w7-m1', kind: 'mini', name: 'Which Tool?', mini: 'which-tool' },
      { id: 'w7-3', kind: 'battle', name: 'The Branching Hall', topics: ['tree', 'ev', 'prob'], n: 6,
        enemy: { name: 'The Probabili-Tree', title: 'Grows a branch for every maybe', body: 'tall', color: '#4f8a3a', acc: ['leaf'], mouth: 'grin', item: '🍃',
          lines: { intro: 'Square or circle, choice or chance… can you climb me backwards?', hit: ['Solved from the leaves back to the root!', 'A proper expected value. My branches tremble!'],
            taunt: ['You climbed forwards! Trees are solved backwards!', 'That was a joint probability, not a conditional one!'], win: 'Timber…', lose: 'Lost in my branches forever!' } } },
      { id: 'w7-4', kind: 'battle', name: 'The Options Exchange', topics: ['option', 'ev', 'prob'], n: 6,
        enemy: { name: 'Captain Abandon', title: 'Sells the ship at the first storm', body: 'blob', color: '#d0643a', acc: ['pirate'], mouth: 'fangs', item: '⚓',
          lines: { intro: 'Arr! Low demand? Sell the balloon! Abandon everything!', hit: ['Ye compared keeping and selling properly. Blast!', 'Ye only use the option when it pays. Clever!'],
            taunt: ['Ye forgot the salvage value, landlubber!', 'Ye kept a sinking ship when selling was worth more!'], win: 'Abandon… ship…', lose: 'Yer NPV walks the plank!' } } },
      { id: 'w7-m2', kind: 'mini', name: 'Branch Sprint', mini: 'branch-sprint' },
      { id: 'w7-boss', kind: 'boss', name: 'The Real Oak-tion', topics: '*', n: 10,
        enemy: { name: 'The Real Oak-tion', title: 'Ancient oak of real options', body: 'tall', color: '#3f6b2a', acc: ['crown', 'leaf'], eyes: 3, mouth: 'fangs', item: '🌳',
          lines: { intro: 'I hold every option: upgrade, expand, abandon. Solve my branches backwards… if you can!', hit: ['You valued my option to upgrade!', 'Backwards through every node… impressive!'],
            taunt: ['You solved me forwards, sapling!', 'You forgot to discount my chance node!'], win: 'My roots… are pulled up…', lose: 'Your NPV has fallen from the tree!' } } },
    ],

    minis: {
      'which-tool': {
        game: 'rapid', title: 'Which Tool?', intro: 'Each card describes an analysis. Is it sensitivity analysis, scenario analysis or a decision tree?',
        bins: [{ id: 'sens', label: 'Sensitivity' }, { id: 'scen', label: 'Scenario' }, { id: 'tree', label: 'Decision tree' }],
        items: [
          { t: 'Change unit sales from 6,000 to 5,500. Keep everything else at base.', bin: 'sens', why: 'Only one input moves, so this is sensitivity analysis.' },
          { t: 'Recompute NPV with low sales, a low price, high costs and a high rate, all at once', bin: 'scen', why: 'Several inputs move together: a (worst-case) scenario.' },
          { t: 'Decide after 3 years whether to upgrade a machine, if demand is high', bin: 'tree', why: 'A later decision that depends on an uncertain event belongs in a decision tree.' },
          { t: 'Move only the cost of capital from 10% to 12%', bin: 'sens', why: 'One assumption changes: sensitivity analysis.' },
          { t: 'A “recession” case: sales fall and costs rise at the same time', bin: 'scen', why: 'A consistent story with several changes is a scenario.' },
          { t: 'Value the option to sell a balloon after a bad first year', bin: 'tree', why: 'An option to abandon is a decision node after a chance node.' },
          { t: 'A “best case” where every assumption is favourable', bin: 'scen', why: 'Every input moves together: scenario analysis.' },
          { t: 'Find which single input the NPV reacts to most', bin: 'sens', why: 'Testing inputs one by one is sensitivity analysis.' },
          { t: 'A 30% chance the regulator bans the product in year 2, then a choice to expand', bin: 'tree', why: 'Chance, then a decision: draw a decision tree.' },
          { t: 'Change only the price per unit, from $80 to $75', bin: 'sens', why: 'One input changes: sensitivity analysis.' },
          { t: 'A price war: a lower price and higher unit sales together', bin: 'scen', why: 'Two linked changes at once make a scenario.' },
          { t: 'Research first. If it succeeds, decide whether to launch.', bin: 'tree', why: 'A sequence of chance and decisions over time is a decision tree.' },
          { t: 'Change only the cost per unit, from $60 to $62', bin: 'sens', why: 'One input moves: sensitivity analysis.' },
          { t: 'A “boom” case: higher sales, a higher price and a lower rate', bin: 'scen', why: 'Several inputs change together: a (best-case) scenario.' },
          { t: 'Choose a large or small balloon now, and maybe sell it later', bin: 'tree', why: 'Two decision points with uncertainty between them: a decision tree.' },
          { t: 'Weight each branch by its probability at every chance node', bin: 'tree', why: 'Expected values at chance nodes are how decision trees are solved.' },
          { t: 'Put worst, base and best cases side by side', bin: 'scen', why: 'Comparing whole cases is scenario analysis.' },
          { t: 'Ask: how far can unit sales fall before NPV hits zero?', bin: 'sens', why: R`Moving one input to find \(NPV = 0\) is break-even, a form of sensitivity analysis.` },
        ],
        rounds: 12, seconds: 12,
      },
      'branch-sprint': {
        game: 'rapid', title: 'Branch Sprint', intro: 'Quick tree maths. Expected values at chance nodes, best choices at decision nodes. Pick the right answer.',
        gen(rng) {
          const kind = rng.pick(['ev', 'ev', 'dec', 'node', 'cond']);
          if (kind === 'ev') {
            const p = rng.pick([0.2, 0.25, 0.3, 0.4, 0.6, 0.7, 0.75, 0.8]);
            const hi = rng.step(100, 900, 50), lo = rng.step(0, 80, 10);
            const ev = p * hi + (1 - p) * lo, avg = (hi + lo) / 2, part = p * hi;
            const vals = [ev, avg, part].map((x) => +x.toFixed(2));
            if (new Set(vals).size < 3) return { t: R`Chance node ○: $${hi}k (${pct(p)}) or $${lo}k (${pct(1 - p)}). Expected value?`, opts: [`$${K(ev, 2)}k`, `$${K(hi, 2)}k`], a: 0, why: R`\(${L.dec(p)} \times ${hi} + ${L.dec(1 - p)} \times ${lo} = ${L.numT(ev, 2)}\) thousand.` };
            const order = rng.shuffle([0, 1, 2]);
            return { t: R`Chance node ○: $${hi}k (${pct(p)}) or $${lo}k (${pct(1 - p)}). Expected value?`, opts: order.map((k) => `$${K(vals[k], 2)}k`), a: order.indexOf(0),
              why: R`Weight each branch: \(${L.dec(p)} \times ${hi} + ${L.dec(1 - p)} \times ${lo} = ${L.numT(ev, 2)}\) thousand.` };
          }
          if (kind === 'dec') {
            const a = rng.step(-200, 900, 50);
            let b = rng.step(-200, 900, 50);
            if (b === a) b = a + 150;
            const hi = Math.max(a, b), lo = Math.min(a, b), avg = (a + b) / 2;
            const order = rng.shuffle([hi, lo, avg]);
            const fmt = (x) => (x < 0 ? `−$${-x}k` : `$${x}k`);
            return { t: R`Decision node □ at \(t = 3\): Upgrade, NPV ${fmt(a)}. Do not upgrade, NPV ${fmt(b)}. Value carried back?`, opts: order.map(fmt), a: order.indexOf(hi),
              why: R`At a decision node you choose the **highest** NPV: ${fmt(hi)}.` };
          }
          if (kind === 'node') {
            const it = rng.pick([
              ['Nature decides if demand is high or low', 1], ['Management chooses a large or a small balloon', 0], ['The regulator approves or bans the product', 1],
              ['The board decides whether to upgrade the machine', 0], ['Research succeeds or fails', 1], ['You choose to sell the asset or keep it', 0],
              ['A customer accepts or rejects the offer', 1], ['The firm decides to expand into the rest of the fleet', 0],
            ]);
            return { t: R`“${it[0]}.” Which node is it?`, opts: ['Decision node □', 'Chance node ○'], a: it[1],
              why: it[1] === 0 ? 'Management controls it, so it is a decision node (□).' : 'Nobody in the firm controls it, so it is a chance node (○).' };
          }
          const m = rng.pick([0.5, 0.6, 0.7, 0.75, 0.8]);
          const c = rng.pick([0.6, 0.7, 0.8, 0.9]);
          const j = +(m * c).toFixed(4);
          const vals = [c, j, +(m * j).toFixed(4)];
          const order = rng.shuffle([0, 1, 2]);
          return { t: R`\(P(H_1 \text{ and } H_2) = ${L.numT(j * 100, 2)}\%\) and \(P(H_1) = ${L.numT(m * 100, 2)}\%\). What is \(P(H_2 \mid H_1)\)?`,
            opts: order.map((k) => `${K(vals[k] * 100, 2)}%`), a: order.indexOf(0),
            why: R`\(P(H_2 \mid H_1) = \frac{P(H_1 \text{ and } H_2)}{P(H_1)} = \frac{${L.dec(j)}}{${L.dec(m)}} = ${L.dec(c)}\)` };
        },
        rounds: 10, seconds: 20,
      },
    },

    questions: [
      /* ----- cash flow recap and forecast quality ----- */
      { id: 'w7-q01', topic: 'fcf', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W7 slide 6', formula: 'fcf',
        q: R`In the incremental free cash flow layout, what do you **add back** to incremental earnings?`,
        choices: ['Depreciation', 'Capital expenditure', 'The increase in net working capital', 'Interest expense'], answer: 0,
        why: R`Depreciation is subtracted only to work out the tax. It is not a cash payment, so you add it back after tax.`,
        wrong: { 1: 'Capital expenditure is real cash spent, so it is subtracted.', 2: 'An increase in NWC ties up cash, so it is subtracted.', 3: 'Interest is a financing cost. It never enters project free cash flow.' } },
      { id: 'w7-q02', topic: 'fcf', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W7 slide 6',
        q: R`In the free cash flow layout, **EBIT** equals…`,
        choices: [R`\(\text{Gross profit} - SG\&A - \text{Depreciation}\)`, R`\(\text{Revenue} - COGS\)`, R`\(\text{Incremental earnings} + \text{Depreciation}\)`, R`\(\text{Gross profit} - \text{Capital expenditure}\)`], answer: 0,
        why: R`Revenue less COGS is gross profit. Subtract SG&A and depreciation to reach **EBIT**: earnings before interest and tax.` },
      { id: 'w7-q03', topic: 'fcf', kind: 'tf', level: 1, section: 'A',
        q: R`A firm has already spent $40,000 on a market survey for a new product. This $40,000 belongs in the product’s decision tree.`,
        answer: false, why: R`The survey is a **sunk cost**. It is spent whatever the firm decides, so it is not an incremental cash flow.` },
      { id: 'w7-q04', topic: 'fcf', kind: 'mcq', level: 2, section: 'A', src: 'Tutorial W7 Q2',
        q: R`InnoCam will borrow $100,000 at 6.5% p.a. to help fund a project. How should the interest enter the project’s cash flows?`,
        choices: ['Leave it out: it is a financing cost, already in the required return', 'Subtract $6,500 every year', R`Subtract the $100,000 loan at \(t = 0\)`, R`Add the $100,000 loan as an inflow at \(t = 0\)`], answer: 0,
        why: R`The required return already reflects the cost of funding. Subtracting the interest as well would **double count** it.` },
      { id: 'w7-q05', topic: 'fcf', kind: 'tf', level: 1, section: 'A', src: 'Tutorial W7 concept check Q2',
        q: R`Sensitivity, scenario and decision-tree analysis will still fail if the data and assumptions used as inputs are unreliable.`,
        answer: true, why: R`**Garbage in, garbage out.** These tools test your forecasts. They cannot fix bad forecasts.` },
      { id: 'w7-q06', topic: 'fcf', kind: 'mcq', level: 1, section: 'A', src: 'Tutorial W7 Activity 1',
        q: R`Why do managers run sensitivity, scenario and decision-tree analysis on a project?`,
        choices: ['The NPV rests on uncertain forecasts of cash flows and the cost of capital', 'The NPV rule gives the wrong answer for most projects', 'Accounting standards require three NPVs for every project', 'These tools remove all risk from the project'], answer: 0,
        why: R`Sales, prices, costs and the discount rate are all estimates. These tools show how much the NPV depends on them.` },

      /* ----- break-even ----- */
      { id: 'w7-q07', topic: 'breakeven', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W7 slide 7',
        q: R`In capital budgeting, the **break-even** level of a parameter is the level at which…`,
        choices: ['The project’s NPV is zero', 'The project’s IRR is zero', 'Revenue equals capital expenditure', 'The payback period equals the project’s life'], answer: 0,
        why: R`Break-even asks: how far can this input move before the project stops creating value, at \(NPV = 0\)?` },
      { id: 'w7-q08', topic: 'breakeven', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W7 slide 7', formula: 'breakeven',
        q: R`The **accounting (EBIT) break-even** is the number of units at which…`,
        choices: ['EBIT is zero', 'NPV is zero', 'Free cash flow is zero', 'Net income equals the dividend'], answer: 0,
        why: R`It solves \(\text{Units} \times (\text{Price} - \text{Cost per unit}) - SG\&A - Dep = 0\).` },
      { id: 'w7-q09', topic: 'breakeven', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W7 slide 7', formula: 'breakeven',
        q: R`Which formula gives the accounting (EBIT) break-even number of units?`,
        choices: [R`\(\frac{SG\&A + Dep}{\text{Price} - \text{Cost per unit}}\)`, R`\(\frac{SG\&A + Dep}{\text{Price}}\)`, R`\(\frac{SG\&A}{\text{Price} - \text{Cost per unit}}\)`, R`\(\frac{\text{Price} - \text{Cost per unit}}{SG\&A + Dep}\)`], answer: 0,
        why: R`Each unit adds \(\text{Price} - \text{Cost per unit}\) to EBIT. You need enough units to cover SG&A **and** depreciation.`,
        wrong: { 1: 'Each unit also has a cost, so divide by the margin per unit, not the price.', 2: 'Depreciation is a cost above EBIT, so it must be covered too.' } },
      { id: 'w7-q10', topic: 'breakeven', kind: 'num', level: 2, section: 'B', src: 'Lecture W7 slide 10 (extension)', formula: 'npv',
        q: R`Lecture project: price $80, cost $60 per unit, initial cost $500,000, the same sales every year forever, no tax. The cost of capital is 10%. How many units a year make the NPV **zero**?`,
        answer: (500000 * 0.10) / (80 - 60), unit: 'units', dp: 0,
        mistakes: [
          { v: 500000 / 20, why: R`That earns back the whole cost in a single year. The cash flow lasts forever, so \(NPV = 0\) needs far fewer units.` },
          { v: (500000 * 0.10) / 80, why: 'Divide by the margin per unit ($20), not by the price ($80).' },
          { v: (500000 * 0.10) / 60, why: 'Divide by the margin per unit ($20), not by the cost per unit ($60).' },
        ],
        steps: [
          R`Set the NPV to zero: \[\frac{(80 - 60) \times Q}{0.10} - 500{,}000 = 0\]`,
          R`\[Q = \frac{500{,}000 \times 0.10}{80 - 60} = \frac{50{,}000}{20} = 2{,}500 \text{ units}\]`,
          R`The base case is 6,000 units, so sales can fall a long way before the NPV turns negative.`,
        ],
        ti: [TI.line('500000*0.10/(80-60)', { note: R`The yearly margin needed (\(500{,}000 \times 0.10\)) divided by the margin per unit.` })],
        why: R`At 2,500 units the yearly margin of \(\$50{,}000\) is worth exactly \(\frac{50{,}000}{0.10} = \$500{,}000\), the initial cost.` },
      { id: 'w7-q11', topic: 'breakeven', kind: 'mcq', level: 2, section: 'A',
        q: R`How does the **NPV break-even** differ from the **EBIT break-even**?`,
        choices: ['NPV break-even uses cash flows and the cost of capital; EBIT break-even only sets accounting profit to zero', 'They always give the same number of units', 'EBIT break-even includes the cost of capital; NPV break-even does not', 'NPV break-even ignores the initial investment'], answer: 0,
        why: R`A project can earn zero EBIT and still destroy value. EBIT ignores the time value of money and the cost of capital.` },

      /* ----- sensitivity ----- */
      { id: 'w7-q12', topic: 'sens', kind: 'mcq', level: 1, section: 'A', src: 'Tutorial W7 concept check Q1',
        q: R`The purpose of **sensitivity analysis** in capital budgeting is to show…`,
        choices: ['How the variables in a project affect its NPV', 'The optimal size of the capital budget', 'How price changes affect break-even volume', 'Seasonal variation in product demand'], answer: 0,
        why: R`Sensitivity analysis changes one input at a time and watches the NPV. It shows which inputs matter most.` },
      { id: 'w7-q13', topic: 'sens', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W7 slide 9',
        q: R`In **sensitivity analysis**, how many assumptions do you change at a time?`,
        choices: ['One, keeping all the others at their base values', 'All of them together', 'Only the two most uncertain ones', 'None: only the discount rate is changed'], answer: 0,
        why: R`Sensitivity analysis moves a **single** assumption. Changing several together is **scenario** analysis.` },
      { id: 'w7-q14', topic: 'sens', kind: 'num', level: 1, section: 'B', src: 'Lecture W7 slide 10', formula: 'npv',
        q: R`A project costs $500,000. It sells 6,000 units a year forever at $80 each, and each unit costs $60. The cost of capital is 10%. Ignore tax and depreciation. What is the **base-case NPV**?`,
        table: { head: ['Input', 'Base case'], rows: [['Unit sales', '6,000'], ['Price per unit', '$80'], ['Cost per unit', '$60'], ['Cost of capital', '10%'], ['Initial cost', '$500,000']] },
        answer: npvPerp(6000, 80, 60, 0.10, 500000), unit: '$', dp: 0,
        mistakes: [
          { v: npvPerp(6000, 80, 60, 0.10, 0), why: 'That is the PV of the inflows. Subtract the $500,000 initial cost.' },
          { v: (80 - 60) * 6000 - 500000, why: R`That uses one year of cash flow. The cash flow lasts forever, so divide it by \(r\).` },
          { v: npvPerp(6000, 80, 0, 0.10, 500000), why: 'That uses the price, not the margin after the $60 cost per unit.' },
        ],
        steps: [
          R`\[NPV = \frac{(P - v) \times Q}{r} - I\]`,
          R`\[NPV = \frac{(80 - 60) \times 6{,}000}{0.10} - 500{,}000 = 1{,}200{,}000 - 500{,}000 = \$700{,}000\]`,
        ],
        ti: [TI.line('(80-60)*6000/0.10-500000')],
        why: R`A \(\$120{,}000\) yearly margin forever is worth \(\$1.2\text{m}\). Less the \(\$0.5\text{m}\) cost, the NPV is \(\$0.7\text{m}\).` },
      { id: 'w7-q15', topic: 'sens', kind: 'num', level: 2, section: 'B', src: 'Lecture W7 slide 12',
        q: R`In the lecture project (base NPV $700,000), unit sales fall from 6,000 to 5,500. Everything else stays at base. By what **percentage** does the NPV fall?`,
        answer: P(-(npvPerp(5500, 80, 60, 0.10, 500000) - 700000) / 700000), unit: '%', dp: 2,
        mistakes: [
          { v: P(500 / 6000), why: 'That is the fall in unit sales. The NPV falls by a bigger percentage.' },
          { v: P(100000 / 600000), why: 'Divide the $100,000 fall by the base NPV ($700,000), not the new NPV.' },
          { v: P(100000 / 500000), why: 'Divide by the base NPV of $700,000, not by the $500,000 initial cost.' },
        ],
        steps: [
          R`New NPV: \[\frac{(80 - 60) \times 5{,}500}{0.10} - 500{,}000 = \$600{,}000\]`,
          R`\[\%\Delta NPV = \frac{600{,}000 - 700{,}000}{700{,}000} = -14.29\%\]`,
          R`Sales fell 8.3%, but NPV fell 14.29%. The NPV is **more sensitive** than sales, because the $500,000 cost does not change.`,
        ],
        ti: [TI.line('(80-60)*5500/0.10-500000', { note: 'The new NPV.' }), TI.line('(700000-ans)/700000', { pct: true, note: 'The fall, as a share of the base NPV. Times 100 gives the percentage.' })],
        why: R`\(\frac{100{,}000}{700{,}000} = 14.29\%\). A rise to 6,500 units lifts NPV by the same 14.29%.` },
      { id: 'w7-q16', topic: 'sens', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W7 slide 12',
        q: R`Unit sales fall 8.3%, but the NPV falls 14.29%. Why does the NPV move by a **bigger** percentage?`,
        choices: ['The $500,000 initial cost is fixed, so NPV is a smaller base than the PV of the inflows', 'The discount rate also rises when sales fall', 'The price always falls when sales fall', 'It is a rounding error in the lecture'], answer: 0,
        why: R`The PV of the inflows falls 8.3% (\(\$100{,}000\)). The NPV is only \(\$700{,}000\), so the same \(\$100{,}000\) is 14.29% of it.` },
      { id: 'w7-q17', topic: 'sens', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W7 slide 10',
        q: R`The lecture project was tested one input at a time, using the lower and upper bounds below. Which input is the NPV **most sensitive** to?`,
        table: { head: ['Input (base)', 'Range tested', 'NPV range'], rows: [
          ['Unit sales (6,000)', '5,500 to 6,500', `${T.moneyT(npvPerp(5500, 80, 60, 0.1, 5e5))} to ${T.moneyT(npvPerp(6500, 80, 60, 0.1, 5e5))}`],
          ['Price ($80)', '$75 to $85', `${T.moneyT(npvPerp(6000, 75, 60, 0.1, 5e5))} to ${T.moneyT(npvPerp(6000, 85, 60, 0.1, 5e5))}`],
          ['Cost per unit ($60)', '$58 to $62', `${T.moneyT(npvPerp(6000, 80, 58, 0.1, 5e5))} to ${T.moneyT(npvPerp(6000, 80, 62, 0.1, 5e5))}`],
          ['Cost of capital (10%)', '8% to 12%', `${T.moneyT(npvPerp(6000, 80, 60, 0.08, 5e5))} to ${T.moneyT(npvPerp(6000, 80, 60, 0.12, 5e5))}`],
        ] },
        choices: ['Price per unit', 'Unit sales', 'Cost per unit', 'Cost of capital'], answer: 0,
        why: R`Compare the NPV swings: price \(\$600{,}000\), cost of capital \(\$500{,}000\), cost per unit \(\$240{,}000\), unit sales \(\$200{,}000\). Price moves NPV the most.`,
        steps: [R`Price: \(1{,}000{,}000 - 400{,}000 = \$600{,}000\)`, R`Cost of capital: \(1{,}000{,}000 - 500{,}000 = \$500{,}000\)`, R`Cost per unit: \(820{,}000 - 580{,}000 = \$240{,}000\)`, R`Unit sales: \(800{,}000 - 600{,}000 = \$200{,}000\)`] },

      /* ----- scenario ----- */
      { id: 'w7-q18', topic: 'scen', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W7 slide 13',
        q: R`**Scenario analysis** shows how the NPV changes when…`,
        choices: ['Several assumptions change at the same time', 'One assumption changes and the rest stay at base', 'Only the discount rate changes', 'The project is repeated forever'], answer: 0,
        why: R`A scenario is one consistent story, such as a recession, where sales, price, costs and rates all move together.` },
      { id: 'w7-q19', topic: 'scen', kind: 'mcq', level: 2, section: 'A', src: 'Tutorial W7 concept check Q2',
        q: R`Which statement is **FALSE**?`,
        choices: [
          'Sensitivity analysis changes all the variables at once, while scenario analysis changes one variable at a time',
          'Sensitivity and scenario analysis help test how robust a capital budgeting decision is',
          'A decision tree shows future decisions and how uncertainty is resolved',
          'All three tools still fail if the input data are unreliable'], answer: 0,
        why: R`It swaps the two tools. **Sensitivity** analysis changes one variable at a time. **Scenario** analysis changes several at once.` },
      { id: 'w7-q20', topic: 'scen', kind: 'num', level: 2, section: 'B', src: 'Lecture W7 slide 15', formula: 'npv',
        q: R`Worst case for the lecture project: 5,500 units, price $75, cost $62 per unit and a 12% cost of capital. The initial cost is still $500,000, with cash flows forever. What is the **worst-case NPV**?`,
        table: { head: ['Input', 'Base', 'Worst', 'Best'], rows: [['Unit sales', '6,000', '5,500', '6,500'], ['Price per unit', '$80', '$75', '$85'], ['Cost per unit', '$60', '$62', '$58'], ['Cost of capital', '10%', '12%', '8%']] },
        answer: npvPerp(5500, 75, 62, 0.12, 500000), unit: '$', dp: 2,
        mistakes: [
          { v: npvPerp(5500, 75, 62, 0.10, 500000), why: 'That keeps the cost of capital at 10%. In the worst case it rises to 12%.' },
          { v: npvPerp(5500, 80, 60, 0.10, 500000), why: 'That changes only unit sales. A scenario changes every input at once.' },
          { v: npvPerp(5500, 75, 62, 0.12, 0), why: 'Subtract the $500,000 initial cost.' },
        ],
        steps: [
          R`\[NPV_{worst} = \frac{(75 - 62) \times 5{,}500}{0.12} - 500{,}000\]`,
          R`\[= \frac{71{,}500}{0.12} - 500{,}000 = 595{,}833.33 - 500{,}000 = \$95{,}833.33\]`,
        ],
        ti: [TI.line('(75-62)*5500/0.12-500000')],
        why: R`Every input moves the wrong way at once. NPV drops from \(\$0.7\text{m}\) to about \(\$0.096\text{m}\), but it is still positive.` },
      { id: 'w7-q21', topic: 'scen', kind: 'num', level: 2, section: 'B', src: 'Lecture W7 slide 15', formula: 'npv',
        q: R`Best case for the lecture project: 6,500 units, price $85, cost $58 per unit and an 8% cost of capital. The initial cost is $500,000, with cash flows forever. What is the **best-case NPV**?`,
        table: { head: ['Input', 'Base', 'Worst', 'Best'], rows: [['Unit sales', '6,000', '5,500', '6,500'], ['Price per unit', '$80', '$75', '$85'], ['Cost per unit', '$60', '$62', '$58'], ['Cost of capital', '10%', '12%', '8%']] },
        answer: npvPerp(6500, 85, 58, 0.08, 500000), unit: '$', dp: 2,
        mistakes: [
          { v: npvPerp(6500, 85, 58, 0.10, 500000), why: 'That keeps the cost of capital at 10%. In the best case it falls to 8%.' },
          { v: npvPerp(6500, 80, 60, 0.10, 500000), why: 'That changes only unit sales. A scenario changes every input at once.' },
          { v: npvPerp(6500, 85, 62, 0.08, 500000), why: 'In the best case the cost per unit falls to $58. You used the worst-case $62.' },
        ],
        steps: [
          R`\[NPV_{best} = \frac{(85 - 58) \times 6{,}500}{0.08} - 500{,}000\]`,
          R`\[= \frac{175{,}500}{0.08} - 500{,}000 = 2{,}193{,}750 - 500{,}000 = \$1{,}693{,}750\]`,
        ],
        ti: [TI.line('(85-58)*6500/0.08-500000')],
        why: R`Every input moves the good way at once, so NPV rises from \(\$0.7\text{m}\) to \(\$1.69\text{m}\).` },
      { id: 'w7-q22', topic: 'scen', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W7 slides 12–15',
        q: R`The lecture’s worst-case NPV (about $96,000) is far below every one-at-a-time sensitivity result. Why?`,
        choices: ['In a scenario, several bad changes happen at once and their effects add up', 'Scenario analysis uses a different NPV formula', 'The worst case leaves out the initial cost', 'Sensitivity analysis always overstates NPV'], answer: 0,
        why: R`Fewer units, a lower price, a higher cost and a higher rate each cut the NPV. Together they cut it much more.` },

      /* ----- decision trees ----- */
      { id: 'w7-q23', topic: 'tree', kind: 'tf', level: 1, section: 'A', src: 'Tutorial W7 concept check Q3',
        q: R`A decision tree with \(n\) decisions should be solved by working **forward**: make decision 1 first, then decision 2, and so on.`,
        answer: false,
        why: R`Solve **backwards**. You can only value decision 1 once you know what you would do at every later decision.` },
      { id: 'w7-q24', topic: 'tree', kind: 'mcq', level: 1, section: 'A',
        q: R`In a decision tree, what does a **square node** (□) show?`,
        choices: ['A decision that management makes', 'An uncertain event that nobody controls', 'The final cash flow of a branch', 'The discount rate for that year'], answer: 0,
        why: R`Squares are **decision nodes**: you choose the branch. Circles (○) are **chance nodes**: you do not choose.` },
      { id: 'w7-q25', topic: 'tree', kind: 'mcq', level: 1, section: 'A', formula: 'expected',
        q: R`How do you value a **chance node** (○) in a decision tree?`,
        choices: ['Take the probability-weighted average (expected value) of its branches', 'Take the best branch', 'Take the worst branch, to be safe', 'Add up all the branches'], answer: 0,
        why: R`Nature picks the branch, not you. So a chance node is worth its **expected value**: \(E[X] = \sum_k p_k \times X_k\).` },
      { id: 'w7-q26', topic: 'tree', kind: 'mcq', level: 1, section: 'A',
        q: R`How do you value a **decision node** (□) in a decision tree?`,
        choices: ['Keep the branch with the highest NPV', 'Take the simple average of the branches', 'Take the probability-weighted average of the branches', 'Keep the branch with the lowest cost'], answer: 0,
        why: R`You control a decision node. A value-maximising manager picks the branch with the **highest NPV**, and that value is carried back.` },
      { id: 'w7-q27', topic: 'tree', kind: 'tf', level: 1, section: 'A', src: 'Tutorial W7 concept check Q2',
        q: R`A decision tree is a graphical representation of future decisions and of how uncertainty is resolved.`,
        answer: true, why: R`That is the definition. Squares show the decisions. Circles show the uncertain events.` },
      { id: 'w7-q28', topic: 'tree', kind: 'num', level: 2, section: 'B', src: 'Lecture W7 Example 1', formula: 'expected',
        q: R`**ELEC P/L** can spend $500,000 on a one-year research project for an electric mop. If it succeeds (33% chance), it yields $150,000 a year in perpetuity, valued at \(t = 1\). If it fails, it yields nothing. The discount rate is 12%. What is the NPV?`,
        tree: TREE_ELEC,
        answer: ELEC.npv, unit: '$', dp: 2,
        mistakes: [
          { v: -500000 + ELEC.e1, why: R`That forgets to discount the expected payoff from \(t = 1\) back to today.` },
          { v: -500000 + ELEC.v1 / 1.12, why: 'That ignores the 67% chance of failure.' },
          { v: -500000 + ELEC.e1 / Math.pow(1.12, 2), why: R`The perpetuity is already valued at \(t = 1\), so discount it one year, not two.` },
        ],
        steps: [
          R`Value of success at \(t = 1\): \[PV_1 = \frac{150{,}000}{0.12} = \$1{,}250{,}000\]`,
          R`Expected payoff at \(t = 1\): \[0.33 \times 1{,}250{,}000 + 0.67 \times 0 = \$412{,}500\]`,
          R`\[NPV = -500{,}000 + \frac{412{,}500}{1.12} = ${LM(ELEC.npv)}\]`,
          R`NPV < 0, so ELEC should **not** proceed.`,
        ],
        ti: [TI.line('0.33*150000/0.12', { note: R`The expected payoff at \(t = 1\).` }), TI.line('-500000+ans/1.12', { note: 'Discount it one year, then subtract the research cost.' })],
        why: R`The expected payoff at \(t = 1\) is \(\$412{,}500\). Its PV is below the \(\$500{,}000\) cost, so do not proceed.` },
      { id: 'w7-q29', topic: 'tree', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W7 slide 34',
        q: R`Why must decision trees be solved **backwards**, from the end of the tree to today?`,
        choices: ['An early decision can only be valued once you know the best choice at each later decision', 'Cash flows at the end of the tree are more certain', 'Discounting only works backwards in time', 'The first decision never matters'], answer: 0,
        why: R`For example, the value of buying machine B depends on whether you would later upgrade it. So solve the upgrade decision first.` },

      /* ----- expected values ----- */
      { id: 'w7-q30', topic: 'ev', kind: 'mcq', level: 1, section: 'A', src: 'Tutorial W7 concept check Q4', formula: 'expected',
        q: R`A hot-air balloon will generate $10 million in year 1 with an 80% chance, or $5 million with a 20% chance. The **expected** cash flow in year 1 is…`,
        choices: [R`The weighted average: \(\$10\text{m} \times 0.8 + \$5\text{m} \times 0.2\)`, 'The more likely outcome of $10 million', R`The more likely outcome times its probability: \(\$10\text{m} \times 0.8\)`, R`The simple average: \((\$10\text{m} + \$5\text{m}) \div 2\)`], answer: 0,
        why: R`An expected value weights **every** outcome by its probability: \(0.8 \times 10 + 0.2 \times 5 = \$9\) million.`,
        wrong: { 1: 'The expected value is not the most likely outcome. It blends every outcome.', 2: 'That leaves out the $5m outcome. Every branch must be included.', 3: 'The outcomes are not equally likely, so a simple average is wrong.' } },
      { id: 'w7-q31', topic: 'ev', kind: 'num', level: 2, section: 'B', src: 'Tutorial W7 Q1', formula: 'expected',
        q: R`{NAME}, you advise **Grocer**. It can spend $250,000 on advertising. Net cash flow then rises by $100,000 a year for 5 years (40% chance), or by only $50,000 a year (60% chance). The discount rate is 12%. What is the NPV of the campaign?`,
        tree: TREE_GROCER,
        answer: GROCER.npv, unit: '$', dp: 2,
        mistakes: [
          { v: GROCER.e * 5 - 250000, why: 'That forgets to discount: 5 years of $70,000, less $250,000.' },
          { v: GROCER.high, why: 'That uses only the 40% high outcome. Weight both outcomes.' },
          { v: GROCER.pv, why: 'That is the PV of the expected inflows. Subtract the $250,000 cost.' },
          { v: -250000 + (0.6 * 100000 + 0.4 * 50000) * GROCER.a, why: 'That swaps the probabilities. The $100,000 outcome has only a 40% chance.' },
        ],
        steps: [
          R`Expected yearly cash flow: \[E[CF] = 0.4 \times 100{,}000 + 0.6 \times 50{,}000 = \$70{,}000\]`,
          R`\[NPV = -250{,}000 + 70{,}000 \times \frac{1}{0.12}\left(1 - \frac{1}{1.12^{5}}\right) = -250{,}000 + 70{,}000 \times ${L.numT(GROCER.a, 6)}\]`,
          R`\[NPV = -250{,}000 + ${L.num(GROCER.pv)} = ${LM(GROCER.npv)}\]`,
          R`NPV > 0, so Grocer should **proceed**, but only just.`,
        ],
        calc: `5 [N] · 12 [I/YR] · 70000 [PMT] · 0 [FV] · [PV] → −${T.money(GROCER.pv)}, then add −250,000`,
        ti: [TI.line('sum({0.4,0.6}*{100000,50000})', { note: 'The expected yearly cash flow.' }), TI.cmd('npv', [12, -250000, [70000], [5]], { note: R`\(\{5\}\) means the \(\$70{,}000\) repeats for 5 years.` })],
        why: R`Use the expected cash flow of \(\$70{,}000\) a year, discounted as a 5-year annuity at 12%.` },
      { id: 'w7-q32', topic: 'ev', kind: 'num', level: 3, section: 'B', src: 'Tutorial W7 Q2', formula: 'expected', boss: true,
        q: R`**InnoCam** can spend $250,000 now to develop a webcam over 2 years. The tree shows what can happen. A $20,000 staff training fee was paid last month. A $100,000 loan at 6.5% p.a. will fund part of the cost. The required return is 15% p.a. What is the NPV?`,
        tree: TREE_INNO,
        answer: INNO.npv, unit: '$', dp: 2,
        mistakes: [
          { v: INNO.npv - 20000, why: 'The $20,000 training fee is sunk. It has been paid whatever InnoCam decides.' },
          { v: -250000 + INNO.v2, why: R`The expected value sits at \(t = 2\). Discount it back two years.` },
          { v: -250000 + 0.3 * INNO.pv2 + (0.7 * 50000) / Math.pow(1.15, 2), why: R`The annuity starts in year 3, so its value lands at \(t = 2\). Discount it two more years.` },
          { v: -250000 + (0.3 * INNO.pv2) / Math.pow(1.15, 2), why: 'Include the $50,000 salvage on the failure branch.' },
        ],
        steps: [
          R`Leave out the $20,000 training fee (**sunk**) and the loan interest (a **financing cost**).`,
          R`Expected yearly cash flow if successful: \[E[CF] = 0.4 \times 600{,}000 + 0.6 \times 200{,}000 = \$360{,}000\]`,
          R`Value at \(t = 2\) of years 3–7: \[360{,}000 \times \frac{1}{0.15}\left(1 - \frac{1}{1.15^{5}}\right) = 360{,}000 \times ${L.numT(INNO.a, 6)} = ${LM(INNO.pv2)}\]`,
          R`Chance node at \(t = 2\): \[0.3 \times ${L.num(INNO.pv2)} + 0.7 \times 50{,}000 = ${LM(INNO.v2)}\]`,
          R`\[NPV = -250{,}000 + \frac{${L.num(INNO.v2)}}{1.15^{2}} = -250{,}000 + ${L.num(INNO.pv0)} = ${LM(INNO.npv)}\]`,
          R`NPV > 0, so the project should **proceed**.`,
        ],
        ti: [TI.cmd('npv', [15, 0, [360000], [5]], { note: R`Years 3–7 valued at \(t = 2\) (the expected \(\$360{,}000\) a year, for 5 years).` }), TI.line('-250000+(0.3*ans+0.7*50000)/1.15^2', { note: R`The chance node at \(t = 2\), discounted two years, less the cost.` })],
        why: R`Value the success branch at \(t = 2\), weight it with the failure branch, then discount two years. Sunk and financing costs stay out.` },
      { id: 'w7-q33', topic: 'ev', kind: 'mcq', level: 2, section: 'A', src: 'Tutorial W7 Q2',
        q: R`In the InnoCam problem, which items are **left out** of the decision tree cash flows?`,
        choices: ['The $20,000 training fee and the interest on the $100,000 loan', 'Only the $20,000 training fee', 'Only the interest on the loan', 'The $50,000 salvage value'], answer: 0,
        why: R`The training fee is **sunk** (already paid). The loan interest is a **financing cost**, already in the 15% required return.` },

      /* ----- probabilities ----- */
      { id: 'w7-q34', topic: 'prob', kind: 'mcq', level: 2, section: 'A', src: 'Tutorial W7 concept check Q5',
        q: R`**Caulfield Ltd** will run a play centre for two years. High demand in both years: 50%. Low in both years: 20%. Low in year 1, then high in year 2: 20%. What is the chance of **high demand in year 1**?`,
        choices: ['60%', '50%', '20%', '10%'], answer: 0,
        why: R`\(P(L_1) = 20\% + 20\% = 40\%\), so \(P(H_1) = 1 - 0.4 = 60\%\). The missing path, high then low, is 10%.`,
        wrong: { 1: 'That is the joint probability of high demand in BOTH years. Add the high-then-low path (10%).', 3: 'That is only the high-then-low path.' } },
      { id: 'w7-q35', topic: 'prob', kind: 'num', level: 2, section: 'B', src: 'Tutorial W7 Q3 tips',
        q: R`Balloon demand, as joint probabilities: high in both years 60%; high then low 15%; low in both years 20%. What is \(P(H_2 \mid H_1)\), the chance of high demand in year 2 **given** high demand in year 1?`,
        answer: P(LARGE.pH2H), unit: '%', dp: 2,
        mistakes: [
          { v: 60, why: R`That is the joint probability of high demand in both years. Divide it by \(P(H_1)\).` },
          { v: 75, why: R`That is \(P(H_1)\), the chance of high demand in year 1.` },
          { v: 45, why: R`Divide the joint probability by \(P(H_1)\). Do not multiply.` },
        ],
        steps: [R`\[P(H_1) = 0.60 + 0.15 = 0.75\]`, R`\[P(H_2 \mid H_1) = \frac{P(H_1 \text{ and } H_2)}{P(H_1)} = \frac{0.60}{0.75} = 0.80\]`],
        ti: [TI.line('0.60/(0.60+0.15)', { pct: true })],
        why: R`\(P(H_2 \mid H_1) = \frac{P(H_1 \text{ and } H_2)}{P(H_1)}\): the joint probability divided by the probability of the first branch.` },
      { id: 'w7-q36', topic: 'prob', kind: 'num', level: 2, section: 'B', src: 'Tutorial W7 Q3',
        q: R`Same balloon market: HH 60%, HL 15%, LL 20%. What is the **joint** probability that demand is low in year 1 **and** high in year 2?`,
        answer: P(1 - 0.60 - 0.15 - 0.20), unit: '%', dp: 0,
        mistakes: [
          { v: 20, why: R`That is \(P(H_2 \mid L_1)\), a conditional probability. The joint probability is smaller.` },
          { v: 25, why: R`That is \(P(L_1)\), the chance of a low year 1.` },
          { v: 0, why: 'The four paths must add to 100%, so this path cannot be zero.' },
        ],
        steps: [R`All four paths add up to 1: \[P(L_1 \text{ and } H_2) = 1 - 0.60 - 0.15 - 0.20 = 0.05\]`],
        ti: [TI.line('1-0.60-0.15-0.20', { pct: true })],
        why: R`The joint probabilities of all paths sum to 100%, so the missing path is 5%.` },
      { id: 'w7-q37', topic: 'prob', kind: 'num', level: 2, section: 'B', src: 'Tutorial W7 Q3',
        q: R`Same balloon market: HH 60%, HL 15%, LL 20%, so LH is 5%. What is \(P(H_2 \mid L_1)\), the chance of high demand in year 2 after a **low** year 1?`,
        answer: P(LARGE.pH2L), unit: '%', dp: 2,
        mistakes: [
          { v: 5, why: R`That is the joint probability. Divide it by \(P(L_1) = 0.25\).` },
          { v: 80, why: R`That is \(P(L_2 \mid L_1)\), the chance demand stays low.` },
          { v: 25, why: R`That is \(P(L_1)\), not the conditional probability.` },
        ],
        steps: [R`\[P(L_1) = 1 - 0.75 = 0.25\]`, R`\[P(L_2 \mid L_1) = \frac{0.20}{0.25} = 0.80 \quad\Rightarrow\quad P(H_2 \mid L_1) = 1 - 0.80 = 0.20\]`],
        ti: [TI.line('0.05/(0.05+0.20)', { pct: true, note: R`The LH path divided by \(P(L_1) = 0.05 + 0.20\).` })],
        why: R`After a low year 1, demand stays low 80% of the time and turns high 20% of the time.` },
      { id: 'w7-q38', topic: 'prob', kind: 'mcq', level: 2, section: 'A',
        q: R`How are joint and conditional probabilities linked in a two-stage tree?`,
        choices: [R`\(P(H_1 \text{ and } H_2) = P(H_1) \times P(H_2 \mid H_1)\)`, R`\(P(H_1 \text{ and } H_2) = P(H_1) + P(H_2 \mid H_1)\)`, R`\(P(H_2 \mid H_1) = P(H_1) \times P(H_1 \text{ and } H_2)\)`, R`\(P(H_2 \mid H_1) = P(H_1 \text{ and } H_2) - P(H_1)\)`], answer: 0,
        why: R`To reach the end of a path, both branches must happen, so multiply along the path. Rearranged: \(P(H_2 \mid H_1) = \frac{P(H_1 \text{ and } H_2)}{P(H_1)}\).` },
      { id: 'w7-q39', topic: 'prob', kind: 'tf', level: 1, section: 'A',
        q: R`In a two-year demand tree, the joint probabilities of all four paths (HH, HL, LH and LL) must add up to 100%.`,
        answer: true, why: R`Exactly one path will happen, so the path probabilities sum to 1. That is how you find a missing one: \(1 - 0.60 - 0.15 - 0.20 = 0.05\).` },

      /* ----- real options ----- */
      { id: 'w7-q40', topic: 'option', kind: 'mcq', level: 1, section: 'A',
        q: R`What does an **option to abandon** give a firm?`,
        choices: ['The right to stop a project and collect its salvage value if things go badly', 'A duty to sell the project after one year', 'The right to expand the project if demand is high', 'A guarantee that the NPV is positive'], answer: 0,
        why: R`It is a right, not a duty. You use it only when selling is worth more than carrying on.` },
      { id: 'w7-q41', topic: 'option', kind: 'tf', level: 2, section: 'A',
        q: R`If managers only use a real option when it adds value, the option can never lower the project’s NPV.`,
        answer: true, why: R`At the decision node you can always choose to do nothing. So the node is worth at least as much as without the option.` },
      { id: 'w7-q42', topic: 'option', kind: 'mcq', level: 2, section: 'B', src: 'Lecture W7 Example 2',
        q: R`Machine B was bought, and demand was high for 3 years. At \(t = 3\) the firm can upgrade B for $3m. The tree shows the yearly cash flows for years 4–8. \(r = 10\%\). What should management do?`,
        tree: TREE_CHIP_UP,
        choices: [R`Do not upgrade: \(NPV_3 = \$${L.numT(CHIP.noH, 3)}\text{m}\) beats \(\$${L.numT(CHIP.upH, 3)}\text{m}\)`, R`Upgrade: \(NPV_3 = \$${L.numT(CHIP.aH, 3)}\text{m}\) beats \(\$${L.numT(CHIP.noH, 3)}\text{m}\)`, 'Upgrade: $0.9m a year beats $0.52m a year', 'Upgrade: high demand always justifies more capacity'], answer: 0,
        why: R`Upgrading costs \(\$3\text{m}\) now but adds only \(\$0.38\text{m}\) a year for 5 years. Keep the higher \(NPV_3\): do **not** upgrade.`,
        steps: [
          R`Expected yearly cash flow: upgrade \(0.8 \times 1 + 0.2 \times 0.5 = \$0.9\text{m}\); no upgrade \(0.8 \times 0.6 + 0.2 \times 0.2 = \$0.52\text{m}\).`,
          R`\[NPV_3^{up} = -3 + 0.9 \times \frac{1}{0.1}\left(1 - \frac{1}{1.1^{5}}\right) = -3 + 0.9 \times ${L.numT(CHIP.a5, 6)} = \$${L.numT(CHIP.upH, 4)}\text{m}\]`,
          R`\[NPV_3^{no} = 0.52 \times ${L.numT(CHIP.a5, 6)} = \$${L.numT(CHIP.noH, 3)}\text{m}\]`,
        ],
        ti: [TI.cmd('npv', [10, -3, [0.9], [5]], { note: R`Upgrade: pay \(\$3\text{m}\), then the expected \(\$0.9\text{m}\) a year for 5 years (in $m, at \(t = 3\)).` }), TI.cmd('npv', [10, 0, [0.52], [5]], { note: R`Do not upgrade: the expected \(\$0.52\text{m}\) a year. This is bigger, so do not upgrade.` })],
        wrong: { 1: 'That forgets the $3m upgrade cost.', 2: 'The extra $0.38m a year does not pay back the $3m cost within 5 years.' } },
      { id: 'w7-q43', topic: 'option', kind: 'num', level: 3, section: 'B', src: 'Lecture W7 Example 2', boss: true,
        q: R`Machine B costs $3m. In years 1–3, demand is high (0.7) or low (0.3), and B earns $0.6m or $0.2m a year. The best choice at \(t = 3\) is worth $1.971m after high demand and $1.365m after low demand. \(r = 10\%\). What is \(NPV_B\) at \(t = 0\) (in $m)?`,
        tree: TREE_CHIP_B,
        answer: CHIP.B, unit: '$m', dp: 3,
        mistakes: [
          { v: CHIP.bNoCF, why: R`Include the cash flows in years 1–3 as well as the value at \(t = 3\).` },
          { v: CHIP.bNoDisc, why: R`The \(t = 3\) values must be discounted three years back to today.` },
          { v: CHIP.bAlwaysUp, why: 'After high demand the best choice is NOT to upgrade. Use the higher NPV at each decision node.' },
        ],
        steps: [
          R`High branch at \(t = 0\): \[\frac{1.971}{1.1^{3}} + 0.6 \times \frac{1}{0.1}\left(1 - \frac{1}{1.1^{3}}\right) = ${L.numT(CHIP.bH / CHIP.d3, 4)} + ${L.numT(0.6 * CHIP.a3, 4)} = ${L.numT(CHIP.hiB, 4)}\]`,
          R`Low branch at \(t = 0\): \[\frac{1.365}{1.1^{3}} + 0.2 \times ${L.numT(CHIP.a3, 6)} = ${L.numT(CHIP.bL / CHIP.d3, 4)} + ${L.numT(0.2 * CHIP.a3, 4)} = ${L.numT(CHIP.loB, 4)}\]`,
          R`\[NPV_B = -3 + 0.7 \times ${L.numT(CHIP.hiB, 4)} + 0.3 \times ${L.numT(CHIP.loB, 4)} = -\$${L.numT(-CHIP.B, 3)}\text{m}\]`,
        ],
        ti: [TI.line('0.7*0.6+0.3*0.2', { note: 'The expected cash flow in each of years 1–3 ($m).' }), TI.line('npv(10,-3,{0.48,0.48,0.48+0.7*1.971+0.3*1.365})', { note: R`At \(t = 3\), add the expected value of the best choice. npv discounts each year’s expected cash flow.` })],
        why: R`Work backwards: the best \(t = 3\) values, plus years 1–3 cash flows, discounted and weighted by 0.7 and 0.3.` },
      { id: 'w7-q44', topic: 'option', kind: 'num', level: 3, section: 'B', src: 'Lecture W7 Example 2', boss: true,
        q: R`Machine A costs $4m and lasts 8 years. It earns $1m a year when demand is high and $0.5m when it is low. Demand in years 1–3 is high with probability 0.7. After a high period, it stays high in years 4–8 with probability 0.8. After a low period, it stays low with probability 0.6. \(r = 10\%\). What is \(NPV_A\) (in $m)?`,
        tree: TREE_CHIP_A,
        answer: CHIP.A, unit: '$m', dp: 3,
        mistakes: [
          { v: CHIP.aNoDisc, why: R`The \(t = 3\) values must be discounted three years back to today.` },
          { v: CHIP.aUncond, why: 'That uses 0.7 for years 4–8 too. After year 3, use the conditional probabilities (0.8 or 0.4).' },
          { v: CHIP.A + 4, why: 'Subtract the $4m cost of machine A.' },
        ],
        steps: [
          R`After high demand, at \(t = 3\): \[(0.8 \times 1 + 0.2 \times 0.5) \times ${L.numT(CHIP.a5, 6)} = 0.9 \times ${L.numT(CHIP.a5, 6)} = \$${L.numT(CHIP.aH, 4)}\text{m}\]`,
          R`After low demand, at \(t = 3\): \[(0.4 \times 1 + 0.6 \times 0.5) \times ${L.numT(CHIP.a5, 6)} = 0.7 \times ${L.numT(CHIP.a5, 6)} = \$${L.numT(CHIP.aL, 4)}\text{m}\]`,
          R`\[NPV_A = -4 + 0.7\left(\frac{${L.numT(CHIP.aH, 4)}}{1.1^{3}} + 1 \times ${L.numT(CHIP.a3, 4)}\right) + 0.3\left(\frac{${L.numT(CHIP.aL, 4)}}{1.1^{3}} + 0.5 \times ${L.numT(CHIP.a3, 4)}\right) = \$${L.numT(CHIP.A, 4)}\text{m}\]`,
          R`The lecture shows \(\$0.5065\text{m}\) because it rounds the \(t = 3\) values to 3.412 and 2.654 first.`,
        ],
        ti: [TI.line('0.7*(0.8*1+0.2*0.5)+0.3*(0.4*1+0.6*0.5)', { note: 'The expected cash flow in each of years 4–8 ($m).' }), TI.cmd('npv', [10, -4, [0.85, 0.84], [3, 5]], { note: R`Years 1–3 expect \(0.7 \times 1 + 0.3 \times 0.5 = 0.85\) a year. The counts \(\{3, 5\}\) repeat each cash flow.` })],
        why: R`\(NPV_A \approx \$0.506\text{m} > NPV_B = -\$0.462\text{m}\), so the lecture buys machine A.` },
      { id: 'w7-q45', topic: 'option', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W7 Example 2',
        q: R`Chip machines: \(NPV_A = \$0.506\text{m}\) and \(NPV_B = -\$0.462\text{m}\), even though B keeps an option to upgrade. Which machine should the firm buy?`,
        choices: ['Machine A: it has the higher NPV', 'Machine B: it is $1m cheaper', 'Machine B: the upgrade option makes it more flexible', 'Neither: NPVs from decision trees are unreliable'], answer: 0,
        why: R`These are mutually exclusive choices, so pick the higher NPV. The upgrade option is already counted in \(NPV_B\), and it is not worth using after high demand.` },
      { id: 'w7-q46', topic: 'option', kind: 'num', level: 3, section: 'B', src: 'Tutorial W7 Q3', boss: true,
        q: R`**R. Branson & Assoc.** is pricing a **large** balloon: cost $135,000, 2-year life, no salvage at the end. Cash flow: $100,000 in a high-demand year, $55,000 in a low one. After a **low** year 1, it can sell the balloon for 45% of cost. Joint probabilities: HH 60%, HL 15%, LL 20%. \(r = 10\%\). What is the NPV?`,
        tree: balloonTree(135000, 100000, 55000, LARGE.sal, BALLOON_PROBS),
        answer: LARGE.npv, unit: '$', dp: 2,
        mistakes: [
          { v: LARGE.npvKeep, why: 'That ignores the option to sell. After a low year 1, selling for $60,750 beats keeping.' },
          { v: LARGE.npvJoint, why: 'That uses joint probabilities on the year-2 branches. Use conditional ones (0.8 / 0.2).' },
          { v: LARGE.npvOnce, why: R`Year-2 cash flows need two years of discounting: one to \(t = 1\), then one more to today.` },
        ],
        steps: [
          R`Probabilities: \(P(H_1) = 0.75\), \(P(H_2 \mid H_1) = 0.8\); \(P(L_1) = 0.25\), \(P(L_2 \mid L_1) = 0.8\), \(P(H_2 \mid L_1) = 0.2\).`,
          R`After a low year 1, keep: \[\frac{0.2 \times 100{,}000 + 0.8 \times 55{,}000}{1.1} = \frac{64{,}000}{1.1} = ${LM(LARGE.keepL)}\] Sell: \(0.45 \times 135{,}000 = \$60{,}750\). **Sell** (abandon), because it is worth more.`,
          R`After a high year 1: \[\frac{0.8 \times 100{,}000 + 0.2 \times 55{,}000}{1.1} = \frac{91{,}000}{1.1} = ${LM(LARGE.E2H / 1.1)}\]`,
          R`\[NPV = -135{,}000 + \frac{0.75 \times (100{,}000 + ${L.num(LARGE.E2H / 1.1)}) + 0.25 \times (55{,}000 + 60{,}750)}{1.1} = ${LM(LARGE.npv)}\]`,
        ],
        ti: [TI.line('(0.2*100000+0.8*55000)/1.1', { note: R`Keep after a low year 1. Selling gives \(0.45 \times 135{,}000 = 60{,}750\), which is more, so sell.` }), TI.line('(0.8*100000+0.2*55000)/1.1→h', { note: R`Year 2 after a high year 1, valued at \(t = 1\), stored in h.` }), TI.line('-135000+(0.75*(100000+h)+0.25*(55000+60750))/1.1')],
        why: R`Solve backwards. At the \(t = 1\) decision node, selling (\(\$60{,}750\)) beats keeping (\(\$58{,}182\)).` },
      { id: 'w7-q47', topic: 'option', kind: 'num', level: 3, section: 'B', src: 'Tutorial W7 Q3', boss: true,
        q: R`Now the **small** balloon: cost $90,000, 2-year life, no salvage at the end. Cash flow: $70,000 in a high-demand year, $45,000 in a low one. After a **low** year 1, it can sell the balloon for 45% of cost. Joint probabilities: HH 60%, HL 15%, LL 20%. \(r = 10\%\). What is the NPV?`,
        tree: balloonTree(90000, 70000, 45000, SMALL.sal, BALLOON_PROBS),
        answer: SMALL.npv, unit: '$', dp: 2,
        mistakes: [
          { v: SMALL.npvSell, why: 'Selling for $40,500 is worth less than keeping ($45,454.55). Keep the higher branch.' },
          { v: SMALL.npvJoint, why: 'That uses joint probabilities on the year-2 branches. Use conditional ones.' },
          { v: SMALL.npvOnce, why: 'Year-2 cash flows need two years of discounting.' },
        ],
        steps: [
          R`After a low year 1, keep: \[\frac{0.2 \times 70{,}000 + 0.8 \times 45{,}000}{1.1} = \frac{50{,}000}{1.1} = ${LM(SMALL.keepL)}\] Sell: \(0.45 \times 90{,}000 = \$40{,}500\). **Keep** the balloon.`,
          R`After a high year 1: \[\frac{0.8 \times 70{,}000 + 0.2 \times 45{,}000}{1.1} = \frac{65{,}000}{1.1} = ${LM(SMALL.E2H / 1.1)}\]`,
          R`\[NPV = -90{,}000 + \frac{0.75 \times (70{,}000 + ${L.num(SMALL.E2H / 1.1)}) + 0.25 \times (45{,}000 + ${L.num(SMALL.keepL)})}{1.1} = ${LM(SMALL.npv)}\]`,
        ],
        ti: [TI.line('(0.2*70000+0.8*45000)/1.1→k', { note: R`Keep after a low year 1. It beats selling for \(0.45 \times 90{,}000 = 40{,}500\), so keep. Stored in k.` }), TI.line('(0.8*70000+0.2*45000)/1.1→h', { note: R`Year 2 after a high year 1, valued at \(t = 1\), stored in h.` }), TI.line('-90000+(0.75*(70000+h)+0.25*(45000+k))/1.1')],
        why: R`Here keeping beats selling after a low year. The small balloon’s NPV (\(\$18{,}574\)) beats the large one’s (\(\$15{,}894\)).` },
      { id: 'w7-q48', topic: 'option', kind: 'mcq', level: 2, section: 'A', src: 'Tutorial W7 Q3',
        q: R`Balloon NPVs: large $15,894 (sell after a low year 1) and small $18,574 (keep after a low year 1). Which balloon should R. Branson & Assoc. buy?`,
        choices: ['The small balloon: it has the higher NPV', 'The large balloon: it earns more cash in every year', 'The large balloon: its option to sell makes it safer', 'Neither: both NPVs are too small'], answer: 0,
        why: R`It is a mutually exclusive choice, so pick the higher NPV: \(\$18{,}574 > \$15{,}894\). Buy the **small** balloon.` },
      { id: 'w7-q49', topic: 'option', kind: 'num', level: 3, section: 'B', src: 'Tutorial W7 case study (Unter)', boss: true,
        q: R`**Unter** can install self-driving systems in a quarter of its taxis for $30m. The tree shows the regulator’s review at \(t = 2\) and the choices after it. Savings are $5m a year in years 1–2 on every branch. \(r = 10\%\), no tax. What is \(NPV_0\) of the quarter-fleet plan (in $m)?`,
        tree: TREE_UNTER_Q,
        answer: UNTER.quarter, unit: '$m', dp: 2,
        mistakes: [
          { v: UNTER.quarterNoOpt, why: R`That ignores the option to upgrade after approval. Upgrading is worth $76.05m at \(t = 2\).` },
          { v: UNTER.quarterNoDisc2, why: R`The upgrade decision is valued at \(t = 2\). Discount it two years back to today.` },
          { v: UNTER.quarterNoSavings, why: 'Include the $5m savings in years 1 and 2 on every branch.' },
        ],
        steps: [
          R`Decision at \(t = 2\), if approved. Upgrade: \[-70 + 30 \times \frac{1}{0.1}\left(1 - \frac{1}{1.1^{7}}\right) = -70 + 30 \times ${L.numT(UNTER.a7, 6)} = \$${L.numT(UNTER.up2, 2)}\text{m}\]`,
          R`No upgrade: \(5 \times ${L.numT(UNTER.a7, 6)} = \$${L.numT(UNTER.no2, 2)}\text{m}\). So **upgrade**.`,
          R`\[NPV_0 = -30 + 0.9\left(\frac{5}{1.1} + \frac{5 + ${L.numT(UNTER.up2, 2)}}{1.1^{2}}\right) + 0.1\left(\frac{5}{1.1} + \frac{5 + 80}{1.1^{2}}\right) = \$${L.numT(UNTER.quarter, 2)}\text{m}\]`,
        ],
        ti: [TI.line('npv(10,0,{30},{7})-70', { note: R`Upgrade, valued at \(t = 2\) ($m). Not upgrading is worth only \(5 \times 4.8684 = 24.34\), so upgrade.` }), TI.line('-30+0.9*(5/1.1+(5+ans)/1.1^2)+0.1*(5/1.1+85/1.1^2)')],
        why: R`Value the upgrade decision at \(t = 2\) first, then weight the approve and ban branches and discount to today.` },
      { id: 'w7-q50', topic: 'option', kind: 'num', level: 3, section: 'B', src: 'Tutorial W7 case study (Unter)', boss: true,
        q: R`Unter’s other plan: install the system in the **entire** fleet for $100m. It saves $30m a year for 9 years. After 2 years the regulator approves it (70%) or bans it (30%). If banned, the fleet is sold for $10m at \(t = 2\). \(r = 10\%\), no tax. What is \(NPV_0\) (in $m)?`,
        tree: TREE_UNTER_E,
        answer: UNTER.entire, unit: '$m', dp: 2,
        mistakes: [
          { v: UNTER.entireNoBan, why: 'That ignores the 30% chance of a ban after year 2.' },
          { v: UNTER.entireNoSalvage, why: R`If banned, the fleet is still sold for $10m at \(t = 2\). Include it.` },
          { v: UNTER.entireNoDisc, why: 'Discount each year’s savings back to today.' },
        ],
        steps: [
          R`Approved: \(30 \times \frac{1}{0.1}\left(1 - \frac{1}{1.1^{9}}\right) = 30 \times ${L.numT(UNTER.a9, 6)} = \$${L.numT(UNTER.eApp, 2)}\text{m}\)`,
          R`Banned: \(\frac{30}{1.1} + \frac{30 + 10}{1.1^{2}} = \$${L.numT(UNTER.eBan, 2)}\text{m}\)`,
          R`\[NPV_0 = -100 + 0.7 \times ${L.numT(UNTER.eApp, 2)} + 0.3 \times ${L.numT(UNTER.eBan, 2)} = \$${L.numT(UNTER.entire, 2)}\text{m}\]`,
        ],
        ti: [TI.cmd('npv', [10, 0, [30], [9]], { note: R`Approved: \(\$30\text{m}\) a year for 9 years, valued today ($m).` }), TI.line('-100+0.7*ans+0.3*(30/1.1+40/1.1^2)')],
        why: R`\(\$${L.numT(UNTER.entire, 2)}\text{m}\) is positive, but the quarter-fleet plan (\(\$${L.numT(UNTER.quarter, 2)}\text{m}\)) is higher.` },
      { id: 'w7-q51', topic: 'option', kind: 'mcq', level: 2, section: 'A', src: 'Tutorial W7 case study (Unter)',
        q: R`Unter: \(NPV_0\) is $39.04m for the entire fleet and $41.86m for a quarter of the fleet (with the option to upgrade later). What should Unter do?`,
        choices: ['Install in a quarter of the fleet now, and upgrade the rest if the regulator approves', 'Install in the entire fleet now, because its yearly savings are bigger', 'Do not install, because the regulator might ban the system', 'Install in a quarter of the fleet and never upgrade'], answer: 0,
        why: R`Both NPVs are positive, so invest. The quarter plan wins because it waits for approval before spending the other $70m.` },
    ],

    generators: [
      /* ---------- free cash flow recap ---------- */
      { id: 'w7-g-fcf', topic: 'fcf', level: 2, section: 'B', formula: 'fcf', src: 'Lecture W7 slide 6',
        make(rng) {
          const co = rng.company();
          for (let k = 0; k < 50; k++) {
            const rev = rng.step(500000, 3000000, 50000);
            const cogs = Math.round((rev * rng.step(0.35, 0.55, 0.05)) / 1000) * 1000;
            const sga = rng.step(40000, 250000, 10000), dep = rng.step(30000, 200000, 10000);
            const tc = rng.pick([0.25, 0.3]);
            const capex = rng.chance(0.5) ? rng.step(50000, 300000, 10000) : 0;
            const dnwc = rng.pick([-40000, -20000, 10000, 20000, 30000, 50000]);
            const interest = rng.step(10000, 60000, 5000);
            const ebit = rev - cogs - sga - dep;
            if (ebit < 50000) continue;
            const earn = ebit * (1 - tc);
            const fcf = FIN.fcf(rev, cogs + sga, dep, tc, capex, dnwc);
            if (Math.abs(fcf) < 20000) continue;
            const rows = [['Revenue', T.moneyT(rev)], ['COGS', T.moneyT(cogs)], ['SG&A', T.moneyT(sga)], ['Depreciation', T.moneyT(dep)], ['Interest expense', T.moneyT(interest)],
              ['Capital expenditure', T.moneyT(capex)], [dnwc > 0 ? 'Increase in NWC' : 'Decrease in NWC', T.moneyT(Math.abs(dnwc))], ['Tax rate', pct(tc)]];
            const nwcTex = dnwc > 0 ? R`- ${L.moneyT(dnwc)}` : R`+ ${L.moneyT(-dnwc)}`;
            return {
              q: R`${co} forecasts the figures in the table for one year of a project. Using the incremental free cash flow layout, what is the year’s **free cash flow**?`,
              table: { head: ['Item', 'Amount'], rows },
              givens: [['Rev', L.moneyT(rev)], ['COGS', L.moneyT(cogs)], [R`SG\&A`, L.moneyT(sga)], ['Dep', L.moneyT(dep)], ['t_c', L.pctT(tc)], ['CapEx', L.moneyT(capex)], [R`\Delta NWC`, L.moneyT(dnwc)]],
              answer: fcf, unit: '$', dp: 2,
              mistakes: uniq(fcf, [
                { v: fcf - dep, why: 'Add depreciation back. It was only subtracted to work out the tax.' },
                { v: fcf - interest * (1 - tc), why: 'Interest is a financing cost. It stays out of project free cash flow.' },
                { v: fcf + 2 * dnwc, why: dnwc > 0 ? 'An increase in NWC ties up cash, so subtract it.' : 'A decrease in NWC releases cash, so add it.' },
                { v: ebit + dep - capex - dnwc, why: 'You forgot the tax on EBIT.' },
              ], '$', 2),
              steps: [
                R`\[EBIT = ${L.moneyT(rev)} - ${L.moneyT(cogs)} - ${L.moneyT(sga)} - ${L.moneyT(dep)} = ${LM(ebit)}\]`,
                R`\[\text{Incremental earnings} = ${LM(ebit)} \times (1 - ${L.dec(tc)}) = ${LM(earn)}\]`,
                R`\[FCF = ${LM(earn)} + ${L.moneyT(dep)} - ${L.moneyT(capex)} ${nwcTex} = ${LM(fcf)}\]`,
                R`The interest expense is left out: it is a financing cost.`,
              ],
              ti: [TI.line(`(${tn(rev)}-${tn(cogs)}-${tn(sga)}-${tn(dep)})*(1-${tn(tc)})+${tn(dep)}${capex ? '-' + tn(capex) : ''}${plus(-dnwc)}`, { note: R`EBIT times \((1 - t_c)\), plus depreciation, less CapEx${dnwc > 0 ? ', less the increase in NWC' : ', plus the decrease in NWC'}. The interest stays out.` })],
              why: R`EBIT, less tax, plus depreciation, less CapEx, less the change in NWC. Interest never enters project FCF.`,
            };
          }
          return null;
        } },

      /* ---------- break-even ---------- */
      { id: 'w7-g-be', topic: 'breakeven', level: 1, section: 'B', formula: 'breakeven', src: 'Lecture W7 slide 7',
        make(rng) {
          const co = rng.company();
          const margin = rng.pick([8, 10, 12, 15, 16, 20, 24, 25, 30, 40]);
          const cost = rng.step(10, 90, 5), price = cost + margin;
          const units = rng.step(2000, 20000, 250);
          const fixed = units * margin;
          const dep = Math.round((fixed * rng.pick([0.2, 0.25, 0.3, 0.4])) / 1000) * 1000;
          const sga = fixed - dep;
          const hasInt = rng.chance(0.5);
          const interest = rng.step(10000, 60000, 5000);
          const be = FIN.breakEvenUnits(sga, dep, price, cost);
          const givens = [[R`\text{Price}`, L.moneyT(price)], [R`\text{Cost per unit}`, L.moneyT(cost)], [R`SG\&A`, L.moneyT(sga)], ['Dep', L.moneyT(dep)]];
          if (hasInt) givens.push([R`\text{Interest}`, L.moneyT(interest)]);
          return {
            q: R`${co} sells a product for ${T.moneyT(price)} a unit. Each unit costs ${T.moneyT(cost)} to make. Yearly SG&A is ${T.moneyT(sga)} and depreciation is ${T.moneyT(dep)}.${hasInt ? ` Interest on its loan is ${T.moneyT(interest)} a year.` : ''} What is the **accounting (EBIT) break-even** in units per year?`,
            givens,
            answer: be, unit: 'units', dp: 0,
            mistakes: uniq(be, [
              { v: sga / margin, why: 'That leaves out depreciation. EBIT is after depreciation, so the units must cover it too.' },
              { v: fixed / price, why: R`Divide by the margin per unit, \(\text{price} - \text{cost}\), not by the price.` },
              hasInt ? { v: (fixed + interest) / margin, why: 'EBIT is earnings before interest, so interest is not part of the EBIT break-even.' }
                : { v: fixed / cost, why: R`Divide by the margin per unit, \(\text{price} - \text{cost}\), not by the cost per unit.` },
            ], 'units', 0),
            steps: [
              R`Each unit adds \(${L.moneyT(price)} - ${L.moneyT(cost)} = ${L.moneyT(margin)}\) to EBIT.`,
              R`\[\text{Units} = \frac{SG\&A + Dep}{\text{Price} - \text{Cost per unit}} = \frac{${L.moneyT(sga)} + ${L.moneyT(dep)}}{${L.moneyT(margin)}} = \frac{${L.moneyT(fixed)}}{${L.moneyT(margin)}} = ${L.numT(be, 2)}\]`,
            ].concat(hasInt ? [R`The interest is left out: EBIT is measured **before** interest.`] : []),
            ti: [TI.line(`(${tn(sga)}+${tn(dep)})/(${tn(price)}-${tn(cost)})`, { note: R`SG&A plus depreciation, divided by the margin per unit.${hasInt ? ' No interest: EBIT comes before interest.' : ''}` })],
            why: R`Each unit adds \(\text{price} - \text{cost}\) to EBIT. Sell enough units to cover SG&A and depreciation.`,
          };
        } },
      { id: 'w7-g-be-dep', topic: 'breakeven', level: 2, section: 'B', formula: 'breakeven',
        make(rng) {
          const co = rng.company();
          const life = rng.pick([4, 5, 8, 10]);
          const capex = rng.step(80000, 1200000, 40000), dep = capex / life;
          const margin = rng.pick([10, 12, 15, 20, 25, 30, 40, 50]);
          const cost = rng.step(10, 80, 5), price = cost + margin;
          const sga = rng.step(40000, 400000, 10000);
          const tc = rng.pick([0.25, 0.3]);
          const be = FIN.breakEvenUnits(sga, dep, price, cost);
          return {
            q: R`${co} buys a machine for ${T.moneyT(capex)}. It is depreciated straight-line to zero over ${life} years. The product sells for ${T.moneyT(price)} and costs ${T.moneyT(cost)} a unit to make. Yearly SG&A is ${T.moneyT(sga)}. The tax rate is ${pct(tc)}. What is the **EBIT break-even** in units per year (to the nearest unit)?`,
            givens: [[R`\text{CapEx}`, L.moneyT(capex)], [R`\text{Life}`, R`${life}\text{ years}`], [R`\text{Price}`, L.moneyT(price)], [R`\text{Cost per unit}`, L.moneyT(cost)], [R`SG\&A`, L.moneyT(sga)], ['t_c', L.pctT(tc)]],
            answer: be, unit: 'units', dp: 0,
            mistakes: uniq(be, [
              { v: (sga + capex) / margin, why: 'That uses the whole machine cost. Only one year of depreciation reduces each year’s EBIT.' },
              { v: sga / margin, why: 'That forgets depreciation, which is a cost above EBIT.' },
              { v: (sga + dep) / (margin * (1 - tc)), why: 'Tax does not change the EBIT break-even. When EBIT is zero, the tax is zero too.' },
            ], 'units', 0),
            steps: [
              R`Yearly depreciation: \[Dep = \frac{${L.moneyT(capex)}}{${life}} = ${LM(dep)}\]`,
              R`\[\text{Units} = \frac{SG\&A + Dep}{\text{Price} - \text{Cost per unit}} = \frac{${L.moneyT(sga)} + ${LM(dep)}}{${L.moneyT(price)} - ${L.moneyT(cost)}} = ${L.num(be, 2)}\]`,
              R`The tax rate is not needed. At EBIT break-even there is no profit to tax.`,
            ],
            ti: [TI.line(`(${tn(sga)}+${tn(capex)}/${life})/(${tn(price)}-${tn(cost)})`, { note: R`\(${tn(capex)}/${life}\) is one year of depreciation. The tax rate is not used.` })],
            why: R`Turn the machine cost into yearly depreciation first. Then divide \(SG\&A + Dep\) by the margin per unit.`,
          };
        } },
      { id: 'w7-g-npv-be', topic: 'breakeven', level: 2, section: 'B', formula: 'npv', src: 'Lecture W7 slide 7',
        make(rng) {
          const co = rng.company();
          const inv = rng.step(200000, 1500000, 50000), cost = rng.step(20, 80, 5), margin = rng.pick([10, 15, 20, 25, 30, 40]), price = cost + margin;
          const r = rng.step(0.08, 0.15, 0.01);
          const perp = rng.chance(0.35);
          const n = rng.int(4, 12);
          const factor = perp ? 1 / r : FIN.pvifa(r, n);
          const q = inv / (margin * factor);
          const need = inv / factor; // yearly margin needed
          const ms = perp
            ? [{ v: inv / margin, why: 'That earns back the cost in a single year. The cash flow lasts forever, so discount it as a perpetuity.' },
              { v: (inv * r) / price, why: R`Divide by the margin per unit, \(\text{price} - \text{cost}\), not by the price.` }]
            : [{ v: inv / (margin * n), why: 'That ignores the time value of money. Discount the yearly margin as an annuity.' },
              { v: (inv * r) / margin, why: `That treats the cash flow as a perpetuity. It only lasts ${n} years.` },
              { v: inv / (price * factor), why: R`Divide by the margin per unit, \(\text{price} - \text{cost}\), not by the price.` }];
          return {
            q: R`${co} is weighing a project that costs ${T.moneyT(inv)} today. Each unit sells for ${T.moneyT(price)} and costs ${T.moneyT(cost)} to make. Sales are the same every year, ${perp ? 'forever' : `for ${n} years`}. Ignore tax. The cost of capital is ${pct(r)}. How many units a year make the NPV **zero**?`,
            givens: [['I', L.moneyT(inv)], [R`P - v`, L.moneyT(margin)], ['r', L.pctT(r)], ['n', perp ? R`\infty` : String(n)]],
            answer: q, unit: 'units', dp: 0,
            mistakes: uniq(q, ms, 'units', 0),
            steps: [
              R`Set the NPV to zero: \[-${L.moneyT(inv)} + ${L.moneyT(margin)} \times Q \times ${perp ? R`\frac{1}{${L.dec(r)}}` : R`\frac{1}{${L.dec(r)}}\left(1 - \frac{1}{${L.onePlus(r)}^{${n}}}\right)`} = 0\]`,
              R`The ${perp ? 'perpetuity' : 'annuity'} factor is \(${L.numT(factor, 6)}\), so the yearly margin needed is \(\frac{${L.moneyT(inv)}}{${L.numT(factor, 6)}} = ${LM(need)}\).`,
              R`\[Q = \frac{${LM(need)}}{${L.moneyT(margin)}} = ${L.num(q, 2)} \text{ units}\]`,
            ],
            calc: perp ? undefined : `${n} [N] · ${K(r * 100)} [I/YR] · −${K(inv)} [PV] · 0 [FV] · [PMT] → ${T.money(need)}; then ÷ ${margin}`,
            ti: perp
              ? [TI.line(`${tn(inv)}*${tn(r)}/${margin}`, { note: R`A perpetuity: the yearly margin needed is \(I \times r\). Divide it by the margin per unit.` })]
              : [TI.cmd('tvmPmt', [n, P(r), -inv, 0, 1, 1], { note: R`The yearly margin that pays back \(${L.moneyT(inv)}\) at ${pct(r)}: at this margin the NPV is zero.` }), TI.line(`ans/${margin}`, { note: 'Divide by the margin per unit.' })],
            why: R`At the NPV break-even, the discounted yearly margin just repays the initial cost.`,
          };
        } },

      /* ---------- sensitivity ---------- */
      { id: 'w7-g-sens', topic: 'sens', level: 1, section: 'B', formula: 'npv', src: 'Lecture W7 slides 10–12',
        make(rng) {
          const co = rng.company();
          for (let k = 0; k < 60; k++) {
            const q0 = rng.step(3000, 10000, 500), v0 = rng.step(20, 80, 5), m0 = rng.step(10, 35, 5), p0 = v0 + m0, r0 = rng.step(0.08, 0.14, 0.01);
            const inv = Math.max(50000, Math.round(((m0 * q0) / r0) * rng.step(0.4, 0.8, 0.05) / 50000) * 50000);
            const base = npvPerp(q0, p0, v0, r0, inv);
            const which = rng.pick(['q', 'p', 'v', 'r']);
            let q1 = q0, p1 = p0, v1 = v0, r1 = r0, text;
            if (which === 'q') { q1 = q0 + rng.pick([-1000, -500, 500, 1000]); text = `unit sales are ${T.numT(q1)} instead of ${T.numT(q0)}`; }
            else if (which === 'p') { p1 = p0 + rng.pick([-5, -3, 3, 5]); text = `the price is ${T.moneyT(p1)} instead of ${T.moneyT(p0)}`; }
            else if (which === 'v') { v1 = v0 + rng.pick([-3, -2, 2, 3]); text = `the cost per unit is ${T.moneyT(v1)} instead of ${T.moneyT(v0)}`; }
            else { r1 = +(r0 + rng.pick([-0.02, -0.01, 0.01, 0.02])).toFixed(4); text = `the cost of capital is ${pct(r1)} instead of ${pct(r0)}`; }
            const npv1 = npvPerp(q1, p1, v1, r1, inv);
            if (Math.abs(npv1) < 0.03 * inv || Math.abs(npv1 - base) < 1) continue;
            return {
              q: R`${co} has a project that costs ${T.moneyT(inv)}. Base case: ${T.numT(q0)} units a year forever, price ${T.moneyT(p0)}, cost ${T.moneyT(v0)} a unit and cost of capital ${pct(r0)}. No tax. **Sensitivity test:** ${text}. Everything else stays at base. What is the new NPV?`,
              givens: [['Q', L.numT(q1)], ['P', L.moneyT(p1)], ['v', L.moneyT(v1)], ['r', L.pctT(r1)], ['I', L.moneyT(inv)]],
              answer: npv1, unit: '$', dp: 2,
              mistakes: uniq(npv1, [
                { v: npv1 + inv, why: 'That is the PV of the inflows. Subtract the initial cost.' },
                { v: npv1 - base, why: 'That is the change in NPV. The question asks for the new NPV.' },
                { v: ((p1 - v1) * q1) / (1 + r1) - inv, why: R`The cash flow lasts forever. Divide by \(r\) (a perpetuity), not by \(1 + r\).` },
              ], '$', 2),
              steps: [
                R`\[NPV = \frac{(P - v) \times Q}{r} - I\]`,
                R`\[NPV = \frac{(${L.numT(p1)} - ${L.numT(v1)}) \times ${L.numT(q1)}}{${L.dec(r1)}} - ${L.moneyT(inv)} = ${LM(((p1 - v1) * q1) / r1)} - ${L.moneyT(inv)} = ${LM(npv1)}\]`,
                R`The base NPV was \(${LM(base)}\), so this one change moves the NPV by \(${LM(npv1 - base)}\).`,
              ],
              ti: [TI.line(`(${tn(p1)}-${tn(v1)})*${tn(q1)}/${tn(r1)}-${tn(inv)}`, { note: 'The new input, with every other input at its base value.' })],
              why: R`Sensitivity analysis: change one input, keep the rest at base, and recompute the NPV.`,
            };
          }
          return null;
        } },
      { id: 'w7-g-sens-pct', topic: 'sens', level: 2, section: 'B', src: 'Lecture W7 slide 12',
        make(rng) {
          const co = rng.company();
          for (let k = 0; k < 60; k++) {
            const q0 = rng.step(3000, 10000, 500), v0 = rng.step(20, 80, 5), m0 = rng.step(15, 40, 5), p0 = v0 + m0, r0 = rng.step(0.08, 0.14, 0.01);
            const inv = Math.max(50000, Math.round(((m0 * q0) / r0) * rng.step(0.4, 0.75, 0.05) / 50000) * 50000);
            const base = npvPerp(q0, p0, v0, r0, inv);
            if (base < 0.25 * inv) continue;
            const which = rng.pick(['q', 'p', 'v', 'r']);
            let q1 = q0, p1 = p0, v1 = v0, r1 = r0, text, inPct;
            if (which === 'q') { const c = rng.pick([-0.2, -0.1, 0.1, 0.2]); q1 = Math.round(q0 * (1 + c)); inPct = c; text = `unit sales ${c > 0 ? 'rise' : 'fall'} by ${Math.abs(c * 100)}% to ${T.numT(q1)}`; }
            else if (which === 'p') { const c = rng.pick([-0.1, -0.05, 0.05, 0.1]); p1 = +(p0 * (1 + c)).toFixed(2); inPct = c; text = `the price ${c > 0 ? 'rises' : 'falls'} by ${Math.abs(c * 100)}% to ${TM(p1)}`; }
            else if (which === 'v') { const c = rng.pick([-0.1, -0.05, 0.05, 0.1]); v1 = +(v0 * (1 + c)).toFixed(2); inPct = c; text = `the cost per unit ${c > 0 ? 'rises' : 'falls'} by ${Math.abs(c * 100)}% to ${TM(v1)}`; }
            else { const d = rng.pick([-0.02, -0.01, 0.01, 0.02]); r1 = +(r0 + d).toFixed(4); inPct = d / r0; text = `the cost of capital ${d > 0 ? 'rises' : 'falls'} from ${pct(r0)} to ${pct(r1)}`; }
            if (p1 - v1 < 5) continue;
            const npv1 = npvPerp(q1, p1, v1, r1, inv);
            const ch = (npv1 - base) / base;
            if (Math.abs(ch) < 0.01 || Math.abs(ch) > 2) continue;
            return {
              q: R`${co} has a project that costs ${T.moneyT(inv)}. Base case: ${T.numT(q0)} units a year forever, price ${T.moneyT(p0)}, cost ${T.moneyT(v0)} a unit, cost of capital ${pct(r0)}. No tax. If ${text}, with everything else at base, by what **percentage** does the NPV change? (Type a fall as a negative number.)`,
              givens: [['Q_0', L.numT(q0)], ['P_0', L.moneyT(p0)], ['v_0', L.moneyT(v0)], ['r_0', L.pctT(r0)], ['I', L.moneyT(inv)]],
              answer: P(ch), unit: '%', dp: 2,
              mistakes: uniq(P(ch), [
                { v: P(inPct), why: 'That is the percentage change in the input. The NPV reacts more strongly, because the initial cost is fixed.' },
                { v: P((npv1 - base) / npv1), why: 'Divide the change by the base NPV, not by the new NPV.' },
                { v: P((npv1 - base) / inv), why: 'Divide the change by the base NPV, not by the initial cost.' },
              ], '%', 2),
              steps: [
                R`Base: \[NPV_0 = \frac{(${L.numT(p0)} - ${L.numT(v0)}) \times ${L.numT(q0)}}{${L.dec(r0)}} - ${L.moneyT(inv)} = ${LM(base)}\]`,
                R`New: \[NPV_1 = \frac{(${L.numT(p1)} - ${L.numT(v1)}) \times ${L.numT(q1)}}{${L.dec(r1)}} - ${L.moneyT(inv)} = ${LM(npv1)}\]`,
                R`\[\%\Delta NPV = \frac{${LM(npv1)} - ${LM(base)}}{${LM(base)}} = ${L.pct(ch, 2)}\]`,
              ],
              ti: [
                TI.line(`(${tn(p0)}-${tn(v0)})*${tn(q0)}/${tn(r0)}-${tn(inv)}→b`, { note: 'The base-case NPV, stored in b.' }),
                TI.line(`((${tn(p1)}-${tn(v1)})*${tn(q1)}/${tn(r1)}-${tn(inv)}-b)/b`, { pct: true, note: 'New NPV minus base NPV, divided by the base NPV. Times 100 gives the percentage.' }),
              ],
              why: R`\(\%\Delta NPV = \frac{NPV_{new} - NPV_{base}}{NPV_{base}}\). A fixed initial cost makes the NPV swing more than the input.`,
            };
          }
          return null;
        } },
      { id: 'w7-g-sens-most', topic: 'sens', level: 1, section: 'A', src: 'Lecture W7 slides 10–12',
        make(rng) {
          const co = rng.company();
          for (let k = 0; k < 60; k++) {
            const q0 = rng.step(4000, 10000, 500), v0 = rng.step(20, 80, 5), m0 = rng.step(15, 35, 5), p0 = v0 + m0, r0 = rng.step(0.08, 0.12, 0.01);
            const inv = Math.max(50000, Math.round(((m0 * q0) / r0) * rng.step(0.4, 0.7, 0.05) / 50000) * 50000);
            const dq = rng.pick([500, 1000, 1500]), dP = rng.pick([2, 3, 5, 8]), dv = rng.pick([2, 3, 5]), dr = rng.pick([0.01, 0.02]);
            const rows = [
              { name: 'Unit sales', base: T.numT(q0), lo: T.numT(q0 - dq), hi: T.numT(q0 + dq), nLo: npvPerp(q0 - dq, p0, v0, r0, inv), nHi: npvPerp(q0 + dq, p0, v0, r0, inv) },
              { name: 'Price per unit', base: T.moneyT(p0), lo: T.moneyT(p0 - dP), hi: T.moneyT(p0 + dP), nLo: npvPerp(q0, p0 - dP, v0, r0, inv), nHi: npvPerp(q0, p0 + dP, v0, r0, inv) },
              { name: 'Cost per unit', base: T.moneyT(v0), lo: T.moneyT(v0 - dv), hi: T.moneyT(v0 + dv), nLo: npvPerp(q0, p0, v0 - dv, r0, inv), nHi: npvPerp(q0, p0, v0 + dv, r0, inv) },
              { name: 'Cost of capital', base: pct(r0), lo: pct(r0 - dr), hi: pct(r0 + dr), nLo: npvPerp(q0, p0, v0, r0 - dr, inv), nHi: npvPerp(q0, p0, v0, r0 + dr, inv) },
            ];
            rows.forEach((x) => { x.swing = Math.abs(x.nHi - x.nLo); });
            const sorted = rows.slice().sort((a, b) => b.swing - a.swing);
            if (sorted[0].swing < 1.1 * sorted[1].swing) continue;
            const best = rows.indexOf(sorted[0]);
            return {
              kind: 'mcq',
              q: R`${co} tested its project one input at a time. Each row moves **one** input from its lower to its upper bound. Everything else stays at base. Which input is the NPV **most sensitive** to?`,
              table: { head: ['Input (base)', 'Range tested', 'NPV range'], rows: rows.map((x) => [`${x.name} (${x.base})`, `${x.lo} to ${x.hi}`, `${T.money(x.nLo, 0)} to ${T.money(x.nHi, 0)}`]) },
              choices: rows.map((x) => x.name), answer: best,
              why: R`The widest NPV range belongs to **${rows[best].name.toLowerCase()}**: a swing of \(${LM(rows[best].swing, 0)}\). That input deserves the most careful forecast.`,
              steps: rows.map((x) => R`${x.name}: \(|${LM(x.nHi, 0)} - ${neg(LM(x.nLo, 0), x.nLo)}| = ${LM(x.swing, 0)}\)`),
            };
          }
          return null;
        } },

      /* ---------- scenario ---------- */
      { id: 'w7-g-scen', topic: 'scen', level: 2, section: 'B', formula: 'npv', src: 'Lecture W7 slides 14–15',
        make(rng) {
          const co = rng.company();
          for (let k = 0; k < 60; k++) {
            const q0 = rng.step(4000, 10000, 500), v0 = rng.step(20, 70, 5), m0 = rng.step(15, 35, 5), p0 = v0 + m0, r0 = rng.step(0.08, 0.12, 0.01);
            const inv = Math.max(50000, Math.round(((m0 * q0) / r0) * rng.step(0.45, 0.75, 0.05) / 50000) * 50000);
            const dq = rng.pick([500, 1000]), dP = rng.pick([3, 5]), dv = rng.pick([2, 3]), dr = rng.pick([0.01, 0.02]);
            const worst = rng.chance(0.5), s = worst ? -1 : 1;
            const qS = q0 + s * dq, pS = p0 + s * dP, vS = v0 - s * dv, rS = +(r0 - s * dr).toFixed(4);
            const ans = npvPerp(qS, pS, vS, rS, inv);
            if (Math.abs(ans) < 0.03 * inv) continue;
            const word = worst ? 'worst' : 'best';
            return {
              q: R`${co} has a project that costs ${T.moneyT(inv)} and pays the same margin every year forever. No tax. The table shows the base, worst and best cases. What is the **${word}-case NPV**?`,
              table: { head: ['Input', 'Base', 'Worst', 'Best'], rows: [
                ['Unit sales', T.numT(q0), T.numT(q0 - dq), T.numT(q0 + dq)],
                ['Price per unit', T.moneyT(p0), T.moneyT(p0 - dP), T.moneyT(p0 + dP)],
                ['Cost per unit', T.moneyT(v0), T.moneyT(v0 + dv), T.moneyT(v0 - dv)],
                ['Cost of capital', pct(r0), pct(+(r0 + dr).toFixed(4)), pct(+(r0 - dr).toFixed(4))],
              ] },
              givens: [['Q', L.numT(qS)], ['P', L.moneyT(pS)], ['v', L.moneyT(vS)], ['r', L.pctT(rS)], ['I', L.moneyT(inv)]],
              answer: ans, unit: '$', dp: 2,
              mistakes: uniq(ans, [
                { v: npvPerp(qS, pS, vS, r0, inv), why: `You kept the base cost of capital. In the ${word} case it is ${pct(rS)}.` },
                { v: npvPerp(qS, p0, v0, r0, inv), why: 'That changes only unit sales, which is a sensitivity test. A scenario changes every input at once.' },
                { v: npvPerp(qS, pS, v0 + s * dv, rS, inv), why: worst ? 'In the worst case the cost per unit rises. You used the lower cost.' : 'In the best case the cost per unit falls. You used the higher cost.' },
              ], '$', 2),
              steps: [
                R`Change **every** input to its ${word}-case value at once.`,
                R`\[NPV_{${word}} = \frac{(${L.numT(pS)} - ${L.numT(vS)}) \times ${L.numT(qS)}}{${L.dec(rS)}} - ${L.moneyT(inv)} = ${LM(((pS - vS) * qS) / rS)} - ${L.moneyT(inv)} = ${LM(ans)}\]`,
                R`Base case for comparison: \(${LM(npvPerp(q0, p0, v0, r0, inv))}\).`,
              ],
              ti: [TI.line(`(${tn(pS)}-${tn(vS)})*${tn(qS)}/${tn(rS)}-${tn(inv)}`, { note: `Every input at its ${word}-case value.` })],
              why: R`Scenario analysis moves several inputs together, so the NPV moves much more than in any single sensitivity test.`,
            };
          }
          return null;
        } },

      /* ---------- expected values ---------- */
      { id: 'w7-g-ev', topic: 'ev', level: 1, section: 'B', formula: 'expected', src: 'Tutorial W7 concept check Q4',
        make(rng) {
          const co = rng.company();
          if (rng.chance(0.65)) {
            const p = rng.pick([0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9]);
            const hi = rng.step(50000, 600000, 10000), lo = Math.round((hi * rng.pick([0.2, 0.3, 0.4, 0.5, 0.6])) / 1000) * 1000;
            const likelyHi = rng.chance(0.6), pH = likelyHi ? p : 1 - p;
            const ev = pH * hi + (1 - pH) * lo, most = likelyHi ? hi : lo;
            return {
              q: R`${co} expects next year’s cash flow from a new product to be ${T.moneyT(hi)} with probability ${pct(pH)}, or ${T.moneyT(lo)} with probability ${pct(1 - pH)}. What is the **expected** cash flow?`,
              tree: chance('Year 1', [[pct(pH), end(T.moneyT(hi))], [pct(1 - pH), end(T.moneyT(lo))]]),
              givens: [['p_H', L.pctT(pH)], ['CF_H', L.moneyT(hi)], ['CF_L', L.moneyT(lo)]],
              answer: ev, unit: '$', dp: 2,
              mistakes: uniq(ev, [
                { v: (hi + lo) / 2, why: 'That is a simple average. The outcomes are not equally likely.' },
                { v: most, why: 'That is only the more likely outcome. An expected value blends every outcome.' },
                { v: most * p, why: 'That leaves out the other outcome. Add every outcome times its probability.' },
              ], '$', 2),
              steps: [R`\[E[CF] = ${L.dec(pH)} \times ${L.moneyT(hi)} + ${L.dec(1 - pH)} \times ${L.moneyT(lo)} = ${LM(ev)}\]`],
              ti: [TI.line(`sum(${TI.list([pH, 1 - pH])}*${TI.list([hi, lo])})`, { note: 'The two lists multiply item by item: each probability times its cash flow. sum adds them.' })],
              why: R`An expected value is a probability-weighted average of **all** the outcomes.`,
            };
          }
          const probs = rng.pick([[0.2, 0.5, 0.3], [0.25, 0.45, 0.3], [0.3, 0.45, 0.25], [0.1, 0.6, 0.3], [0.15, 0.55, 0.3], [0.35, 0.4, 0.25]]);
          const hi = rng.step(200000, 900000, 10000), mid = Math.round((hi * rng.pick([0.5, 0.6, 0.7])) / 1000) * 1000, lo = Math.round((hi * rng.pick([0.1, 0.2, 0.3])) / 1000) * 1000;
          const vals = [hi, mid, lo];
          const ev = FIN.expected(probs, vals);
          const iMax = probs.indexOf(Math.max(...probs));
          return {
            q: R`Next year’s cash flow at ${co} could be ${T.moneyT(hi)} (boom, ${pct(probs[0])}), ${T.moneyT(mid)} (normal, ${pct(probs[1])}) or ${T.moneyT(lo)} (bust, ${pct(probs[2])}). What is the **expected** cash flow?`,
            tree: chance('Year 1', [[`Boom ${pct(probs[0])}`, end(T.moneyT(hi))], [`Normal ${pct(probs[1])}`, end(T.moneyT(mid))], [`Bust ${pct(probs[2])}`, end(T.moneyT(lo))]]),
            givens: [['p', R`${L.dec(probs[0])},\ ${L.dec(probs[1])},\ ${L.dec(probs[2])}`], ['CF', R`${L.moneyT(hi)},\ ${L.moneyT(mid)},\ ${L.moneyT(lo)}`]],
            answer: ev, unit: '$', dp: 2,
            mistakes: uniq(ev, [
              { v: (hi + mid + lo) / 3, why: 'That is a simple average. The outcomes are not equally likely.' },
              { v: vals[iMax], why: 'That is only the most likely outcome. An expected value blends every outcome.' },
              { v: vals[iMax] * probs[iMax], why: 'That uses one outcome only. Add every outcome times its probability.' },
            ], '$', 2),
            steps: [R`\[E[CF] = ${L.dec(probs[0])} \times ${L.moneyT(hi)} + ${L.dec(probs[1])} \times ${L.moneyT(mid)} + ${L.dec(probs[2])} \times ${L.moneyT(lo)} = ${LM(ev)}\]`],
            ti: [TI.line(`sum(${TI.list(probs)}*${TI.list(vals)})`, { note: 'Probabilities in one list, cash flows in the other, in the same order.' })],
            why: R`Multiply each outcome by its probability, then add them up.`,
          };
        } },
      { id: 'w7-g-chancepv', topic: 'ev', level: 1, section: 'B', formula: 'expected',
        make(rng) {
          const k = rng.int(1, 3), r = rng.step(0.08, 0.15, 0.01), p = rng.pick([0.2, 0.3, 0.4, 0.6, 0.7, 0.8]);
          const good = rng.step(200000, 2000000, 50000), bad = Math.round((good * rng.pick([0.1, 0.2, 0.3, 0.4])) / 10000) * 10000;
          const ev = p * good + (1 - p) * bad, ans = pv(ev, r, k);
          const wrongK = k === 1 ? 2 : k - 1;
          return {
            q: R`A chance node sits at \(t = ${k}\). At that date the project is worth ${T.moneyT(good)} (probability ${pct(p)}) or ${T.moneyT(bad)} (probability ${pct(1 - p)}). The discount rate is ${pct(r)}. What is the chance node worth **today**?`,
            tree: chance(R`\(t = ${k}\)`, [[pct(p), end(T.moneyT(good))], [pct(1 - p), end(T.moneyT(bad))]]),
            givens: [['p', L.pctT(p)], ['V_{good}', L.moneyT(good)], ['V_{bad}', L.moneyT(bad)], ['r', L.pctT(r)], ['t', String(k)]],
            answer: ans, unit: '$', dp: 2,
            mistakes: uniq(ans, [
              { v: ev, why: R`That is the expected value at \(t = ${k}\). Discount it back to today.` },
              { v: pv(ev, r, wrongK), why: R`The node is at \(t = ${k}\), so discount for ${k} year${k > 1 ? 's' : ''}.` },
              { v: pv((good + bad) / 2, r, k), why: 'Use the probabilities, not a simple average.' },
            ], '$', 2),
            steps: [
              R`Expected value at \(t = ${k}\): \[${L.dec(p)} \times ${L.moneyT(good)} + ${L.dec(1 - p)} \times ${L.moneyT(bad)} = ${LM(ev)}\]`,
              R`\[PV_0 = \frac{${LM(ev)}}{${L.onePlus(r)}^{${k}}} = ${LM(ans)}\]`,
            ],
            calc: `${k} [N] · ${K(r * 100)} [I/YR] · 0 [PMT] · ${K(ev, 2)} [FV] · [PV] → −${T.money(ans)}`,
            ti: [TI.line(`sum(${TI.list([p, 1 - p])}*${TI.list([good, bad])})`, { note: R`The expected value at \(t = ${k}\).` }), TI.line(`ans${dsc(r, k)}`, { note: `Discount it ${k} year${k > 1 ? 's' : ''} back to today.` })],
            why: R`Take the expected value at the node, then discount it back to \(t = 0\).`,
          };
        } },
      { id: 'w7-g-evnpv', topic: 'ev', level: 2, section: 'B', formula: 'expected', src: 'Tutorial W7 Q1',
        make(rng) {
          const co = rng.company();
          const n = rng.int(3, 8), r = rng.step(0.08, 0.15, 0.01);
          const p = rng.pick([0.3, 0.35, 0.4, 0.45, 0.55, 0.6, 0.65, 0.7]);
          const hi = rng.step(40000, 250000, 5000), lo = Math.round((hi * rng.pick([0.3, 0.4, 0.5, 0.6])) / 1000) * 1000;
          const e = p * hi + (1 - p) * lo, a = FIN.pvifa(r, n), pvE = e * a;
          let inv = Math.max(10000, Math.round((pvE * rng.step(0.8, 1.2, 0.02)) / 10000) * 10000);
          if (Math.abs(pvE - inv) < 0.02 * inv) inv += rng.chance(0.5) ? 20000 : -20000;
          const npv = pvE - inv;
          return {
            q: R`${co} can spend ${T.moneyT(inv)} on a campaign. Net cash flow then rises by ${T.moneyT(hi)} a year for ${n} years (probability ${pct(p)}) or by ${T.moneyT(lo)} a year (probability ${pct(1 - p)}). The discount rate is ${pct(r)}. What is the NPV of the campaign?`,
            tree: decide(R`\(t = 0\)`, [[`Invest: −${T.moneyT(inv)}`, chance(undefined, [[pct(p), end(`+${T.moneyT(hi)} a year, years 1–${n}`)], [pct(1 - p), end(`+${T.moneyT(lo)} a year, years 1–${n}`)]])], ['Do not invest', end('$0')]]),
            givens: [['I', L.moneyT(inv)], ['p_H', L.pctT(p)], ['CF_H', L.moneyT(hi)], ['CF_L', L.moneyT(lo)], ['n', String(n)], ['r', L.pctT(r)]],
            answer: npv, unit: '$', dp: 2,
            mistakes: uniq(npv, [
              { v: e * n - inv, why: 'That forgets to discount. Use the annuity factor.' },
              { v: hi * a - inv, why: 'That uses only the high outcome. Weight both outcomes.' },
              { v: pvE, why: 'That is the PV of the expected inflows. Subtract the initial cost.' },
              { v: e / r - inv, why: `That treats the cash flow as a perpetuity. It lasts ${n} years.` },
            ], '$', 2),
            steps: [
              R`Expected yearly cash flow: \[E[CF] = ${L.dec(p)} \times ${L.moneyT(hi)} + ${L.dec(1 - p)} \times ${L.moneyT(lo)} = ${LM(e)}\]`,
              R`\[NPV = -${L.moneyT(inv)} + ${LM(e)} \times \frac{1}{${L.dec(r)}}\left(1 - \frac{1}{${L.onePlus(r)}^{${n}}}\right) = -${L.moneyT(inv)} + ${LM(pvE)} = ${LM(npv)}\]`,
              npv >= 0 ? R`NPV > 0, so **go ahead**.` : R`NPV < 0, so **do not** go ahead.`,
            ],
            calc: `${n} [N] · ${K(r * 100)} [I/YR] · ${K(e, 2)} [PMT] · 0 [FV] · [PV] → −${T.money(pvE)}; NPV = ${T.money(pvE)} − ${T.moneyT(inv)}`,
            ti: [TI.line(`sum(${TI.list([p, 1 - p])}*${TI.list([hi, lo])})`, { note: 'The expected yearly cash flow.' }), TI.cmd('npv', [P(r), -inv, [e], [n]], { note: R`The count \(\{${n}\}\) repeats the expected cash flow for ${n} years.` })],
            why: R`Replace the chance node by its expected yearly cash flow, discount it as an annuity, then subtract the cost.`,
          };
        } },
      { id: 'w7-g-twostage', topic: 'ev', level: 3, section: 'B', formula: 'expected', src: 'Tutorial W7 Q2', boss: true,
        make(rng) {
          const co = rng.company();
          const D = rng.pick([2, 2, 3]), n = rng.int(3, 6), r = rng.step(0.1, 0.18, 0.01);
          const p = rng.pick([0.2, 0.25, 0.3, 0.35, 0.4, 0.5]), q = rng.pick([0.3, 0.4, 0.5, 0.6]);
          const hi = rng.step(200000, 800000, 10000), lo = Math.round((hi * rng.pick([0.25, 0.3, 0.4, 0.5])) / 10000) * 10000;
          const S = rng.step(20000, 100000, 5000), sunk = rng.step(10000, 50000, 5000), loan = rng.step(50000, 200000, 10000), i = rng.pick([0.05, 0.06, 0.065, 0.07, 0.08]);
          const e = q * hi + (1 - q) * lo, a = FIN.pvifa(r, n), pvD = e * a, vD = p * pvD + (1 - p) * S, v0 = pv(vD, r, D);
          let inv = Math.max(50000, Math.round((v0 * rng.step(0.75, 1.25, 0.05)) / 10000) * 10000);
          if (Math.abs(v0 - inv) < 0.03 * inv) inv += rng.chance(0.5) ? 0.1 * inv : -0.1 * inv;
          inv = Math.round(inv / 10000) * 10000;
          const npv = v0 - inv;
          return {
            q: R`${co} can spend ${T.moneyT(inv)} now to develop a product over ${D} years. The tree shows what can happen. Last month it paid a staff training fee of ${T.moneyT(sunk)}. A loan of ${T.moneyT(loan)} at ${pct(i)} p.a. will fund part of the cost. The required return is ${pct(r)} p.a. What is the NPV?`,
            tree: decide(R`\(t = 0\)`, [
              [`Develop: −${T.moneyT(inv)}`, chance(R`\(t = ${D}\)`, [
                [`${pct(p)} success`, chance(undefined, [
                  [`${pct(q)} high demand`, end(`${T.moneyT(hi)} a year, years ${D + 1}–${D + n}`)],
                  [`${pct(1 - q)} low demand`, end(`${T.moneyT(lo)} a year, years ${D + 1}–${D + n}`)],
                ])],
                [`${pct(1 - p)} failure`, end(R`Sell equipment: ${T.moneyT(S)} at \(t = ${D}\)`)],
              ])],
              ['Do not develop', end('$0')],
            ]),
            givens: [['I', L.moneyT(inv)], ['p_{success}', L.pctT(p)], ['p_{high}', L.pctT(q)], ['CF_H', L.moneyT(hi)], ['CF_L', L.moneyT(lo)], ['S', L.moneyT(S)], ['r', L.pctT(r)]],
            answer: npv, unit: '$', dp: 2,
            mistakes: uniq(npv, [
              { v: npv - sunk, why: 'The training fee is sunk. It has been paid whatever the firm decides.' },
              { v: vD - inv, why: R`The expected value sits at \(t = ${D}\). Discount it back ${D} years.` },
              { v: -inv + p * pvD + pv((1 - p) * S, r, D), why: R`The annuity starts in year ${D + 1}, so its value lands at \(t = ${D}\). Discount it ${D} more years.` },
              { v: -inv + pv(p * pvD, r, D), why: 'Include the salvage value on the failure branch.' },
            ], '$', 2),
            steps: [
              R`Leave out the ${T.moneyT(sunk)} training fee (**sunk**) and the loan interest (a **financing cost**).`,
              R`Expected yearly cash flow if successful: \[E[CF] = ${L.dec(q)} \times ${L.moneyT(hi)} + ${L.dec(1 - q)} \times ${L.moneyT(lo)} = ${LM(e)}\]`,
              R`Value at \(t = ${D}\) of years ${D + 1}–${D + n}: \[${LM(e)} \times \frac{1}{${L.dec(r)}}\left(1 - \frac{1}{${L.onePlus(r)}^{${n}}}\right) = ${LM(e)} \times ${L.numT(a, 6)} = ${LM(pvD)}\]`,
              R`Chance node at \(t = ${D}\): \[${L.dec(p)} \times ${LM(pvD)} + ${L.dec(1 - p)} \times ${L.moneyT(S)} = ${LM(vD)}\]`,
              R`\[NPV = -${L.moneyT(inv)} + \frac{${LM(vD)}}{${L.onePlus(r)}^{${D}}} = -${L.moneyT(inv)} + ${LM(v0)} = ${LM(npv)}\]`,
              npv >= 0 ? R`NPV > 0, so **proceed**.` : R`NPV < 0, so **do not** proceed.`,
            ],
            calc: `${n} [N] · ${K(r * 100)} [I/YR] · ${K(e, 2)} [PMT] · 0 [FV] · [PV] → −${T.money(pvD)}; then ${D} [N] · 0 [PMT] · ${K(vD, 2)} [FV] · [PV] → −${T.money(v0)}`,
            ti: [
              TI.line(`sum(${TI.list([q, 1 - q])}*${TI.list([hi, lo])})`, { note: 'The expected yearly cash flow if it succeeds.' }),
              TI.cmd('npv', [P(r), 0, [e], [n]], { note: R`Years ${D + 1}–${D + n}, valued at \(t = ${D}\).` }),
              TI.line(`-${tn(inv)}+(${tn(p)}*ans+${tn(1 - p)}*${tn(S)})${dsc(r, D)}`, { note: R`The chance node at \(t = ${D}\), discounted ${D} years, less the cost. The training fee and the interest stay out.` }),
            ],
            why: R`Value the success branch at \(t = ${D}\), weight it with the failure branch, then discount ${D} years. Sunk and financing costs stay out.`,
          };
        } },

      /* ---------- decision tree basics ---------- */
      { id: 'w7-g-decnode', topic: 'tree', level: 1, section: 'B',
        make(rng) {
          const k = rng.int(1, 4), r = rng.step(0.08, 0.14, 0.01);
          const names = rng.pick([['Expand', 'Carry on', 'Sell'], ['Upgrade', 'Do not upgrade', 'Abandon'], ['Launch nationally', 'Launch in one state', 'Sell the patent']]);
          for (let t = 0; t < 30; t++) {
            const vals = [rng.step(-300000, 2000000, 50000), rng.step(100000, 1500000, 50000), rng.step(50000, 900000, 50000)];
            if (new Set(vals).size < 3) continue;
            const hi = Math.max(...vals), lo = Math.min(...vals), avg = (vals[0] + vals[1] + vals[2]) / 3;
            const ans = pv(hi, r, k);
            const best = names[vals.indexOf(hi)];
            return {
              q: R`At \(t = ${k}\), managers must choose one option. The tree shows each option’s NPV, measured at \(t = ${k}\). The discount rate is ${pct(r)}. What is this decision node worth **today**?`,
              tree: decide(R`\(t = ${k}\)`, names.map((nm, j) => [nm, end(R`NPV at \(t = ${k}\): ${T.moneyT(vals[j])}`)])),
              givens: [['r', L.pctT(r)], ['t', String(k)]],
              answer: ans, unit: '$', dp: 2,
              mistakes: uniq(ans, [
                { v: hi, why: R`That is the value at \(t = ${k}\). Discount it back to today.` },
                { v: pv(avg, r, k), why: 'At a decision node you choose the best option. You do not average.' },
                { v: pv(lo, r, k), why: 'Choose the option with the highest NPV, not the lowest.' },
              ], '$', 2),
              steps: [
                R`Decision node: keep the highest NPV, **${best}** at \(${L.moneyT(hi)}\).`,
                R`\[PV_0 = \frac{${L.moneyT(hi)}}{${L.onePlus(r)}^{${k}}} = ${LM(ans)}\]`,
              ],
              ti: [TI.line(`${tn(hi)}${dsc(r, k)}`, { note: `Keep the best option (${best}), then discount it ${k} year${k > 1 ? 's' : ''} back to today.` })],
              why: R`A decision node is worth its best branch. Then discount that value back to today.`,
            };
          }
          return null;
        } },
      { id: 'w7-g-perp', topic: 'tree', level: 2, section: 'B', formula: 'expected', src: 'Lecture W7 Example 1',
        make(rng) {
          const co = rng.company();
          const c = rng.step(50000, 400000, 10000), r = rng.step(0.08, 0.15, 0.01), p = rng.pick([0.2, 0.25, 0.3, 0.33, 0.4, 0.5, 0.6]);
          const v1 = c / r, e1 = p * v1;
          let inv = Math.max(50000, Math.round((pv(e1, r, 1) * rng.step(0.7, 1.3, 0.05)) / 50000) * 50000);
          if (Math.abs(pv(e1, r, 1) - inv) < 0.03 * inv) inv += 50000;
          const npv = -inv + pv(e1, r, 1);
          return {
            q: R`${co} can spend ${T.moneyT(inv)} today on one year of research. If it succeeds (probability ${pct(p)}), it earns ${T.moneyT(c)} a year forever, valued at the end of the research year (\(t = 1\)). If it fails, it earns nothing. The discount rate is ${pct(r)}. What is the NPV?`,
            tree: decide(R`\(t = 0\)`, [[`Research: −${T.moneyT(inv)}`, chance(R`\(t = 1\)`, [[`${pct(p)} success`, end(`${T.moneyT(c)} a year forever`)], [`${pct(1 - p)} failure`, end('$0')]])], ['Do not research', end('$0')]]),
            givens: [['I', L.moneyT(inv)], ['p', L.pctT(p)], ['C', L.moneyT(c)], ['r', L.pctT(r)]],
            answer: npv, unit: '$', dp: 2,
            mistakes: uniq(npv, [
              { v: -inv + e1, why: R`That forgets to discount the expected payoff from \(t = 1\) back to today.` },
              { v: -inv + pv(v1, r, 1), why: `That ignores the ${pct(1 - p)} chance of failure.` },
              { v: -inv + pv(e1, r, 2), why: R`The perpetuity is already valued at \(t = 1\), so discount it one year, not two.` },
            ], '$', 2),
            steps: [
              R`Value of success at \(t = 1\): \[\frac{${L.moneyT(c)}}{${L.dec(r)}} = ${LM(v1)}\]`,
              R`Expected payoff at \(t = 1\): \[${L.dec(p)} \times ${LM(v1)} + ${L.dec(1 - p)} \times 0 = ${LM(e1)}\]`,
              R`\[NPV = -${L.moneyT(inv)} + \frac{${LM(e1)}}{${L.onePlus(r)}} = ${LM(npv)}\]`,
              npv >= 0 ? R`NPV > 0, so **proceed**.` : R`NPV < 0, so **do not** proceed.`,
            ],
            ti: [TI.line(`${tn(p)}*${tn(c)}/${tn(r)}`, { note: R`The expected payoff at \(t = 1\): the chance of success times the perpetuity value.` }), TI.line(`-${tn(inv)}+ans${dsc(r, 1)}`, { note: 'Discount it one year, then subtract the research cost.' })],
            why: R`Value the perpetuity at \(t = 1\), weight it by the chance of success, then discount one year.`,
          };
        } },

      /* ---------- probabilities ---------- */
      { id: 'w7-g-py1', topic: 'prob', level: 1, section: 'B', src: 'Tutorial W7 concept check Q5',
        make(rng) {
          const co = rng.company();
          for (let k = 0; k < 60; k++) {
            const hh = rng.step(0.2, 0.6, 0.05), hl = rng.step(0.05, 0.25, 0.05), ll = rng.step(0.05, 0.3, 0.05);
            const lh = +(1 - hh - hl - ll).toFixed(4);
            if (lh < 0.05) continue;
            const askH = rng.chance(0.6);
            const hide = rng.pick(['hl', 'lh', askH ? 'hl' : 'lh']);
            const J = { hh, hl, lh, ll };
            const ans = askH ? hh + hl : lh + ll;
            const row = (a, b, key) => [a, b, key === hide ? 'not given' : pct(J[key])];
            const inSum = askH ? ['hh', 'hl'] : ['lh', 'll'];
            const sumNote = `Add the paths that start with a ${askH ? 'high' : 'low'} year 1. Times 100 gives the percentage.`;
            const ti = inSum.includes(hide)
              ? [TI.line(`1-${['hh', 'hl', 'lh', 'll'].filter((x) => x !== hide).map((x) => tn(J[x])).join('-')}`, { note: 'The missing path: all four paths add up to 1.' }),
                TI.line(`ans+${tn(J[inSum.find((x) => x !== hide)])}`, { pct: true, note: sumNote })]
              : [TI.line(`${tn(J[inSum[0]])}+${tn(J[inSum[1]])}`, { pct: true, note: sumNote })];
            const ms = askH
              ? [{ v: P(hh), why: 'That is the joint probability of high demand in BOTH years.' }, { v: P(hh + lh), why: 'That adds the paths that END high: it is the chance of high demand in year 2.' }, { v: P(1 - ll), why: 'Only paths that START with a high year count.' }]
              : [{ v: P(ll), why: 'That is the joint probability of low demand in BOTH years.' }, { v: P(ll + hl), why: 'That adds the paths that END low: it is the chance of low demand in year 2.' }, { v: P(1 - hh), why: 'Only paths that START with a low year count.' }];
            return {
              q: R`${co} will run a venue for two years. The table gives joint probabilities for demand. One path is not given. What is the chance of **${askH ? 'high' : 'low'} demand in year 1**?`,
              table: { head: ['Year 1', 'Year 2', 'Joint probability'], rows: [row('High', 'High', 'hh'), row('High', 'Low', 'hl'), row('Low', 'High', 'lh'), row('Low', 'Low', 'll')] },
              answer: P(ans), unit: '%', dp: 0,
              mistakes: uniq(P(ans), ms, '%', 0),
              steps: [
                R`The four paths add up to 100%, so the missing path is \(1 - ${['hh', 'hl', 'lh', 'll'].filter((x) => x !== hide).map((x) => L.dec(J[x])).join(' - ')} = ${L.dec(J[hide])}\).`,
                askH ? R`\[P(H_1) = P(HH) + P(HL) = ${L.dec(hh)} + ${L.dec(hl)} = ${L.dec(ans)}\]` : R`\[P(L_1) = P(LH) + P(LL) = ${L.dec(lh)} + ${L.dec(ll)} = ${L.dec(ans)}\]`,
              ],
              ti,
              why: R`Add the joint probabilities of every path that starts with a ${askH ? 'high' : 'low'} year 1.`,
            };
          }
          return null;
        } },
      { id: 'w7-g-joint', topic: 'prob', level: 1, section: 'B',
        make(rng) {
          const p1 = rng.step(0.55, 0.8, 0.05), c = rng.step(0.6, 0.9, 0.05), q = rng.step(0.55, 0.8, 0.05);
          const ask = rng.pick(['HH', 'HL', 'LL', 'LH']);
          const first = ask[0] === 'H' ? p1 : 1 - p1;
          const cond = { HH: c, HL: 1 - c, LL: q, LH: 1 - q }[ask];
          const other = { HH: 1 - c, HL: c, LL: 1 - q, LH: q }[ask];
          const ans = first * cond;
          const w = (x) => (x === 'H' ? 'high' : 'low');
          return {
            q: R`Demand in year 1 is high with probability ${pct(p1)}. After a high year, demand stays high with probability ${pct(c)}. After a low year, it stays low with probability ${pct(q)}. What is the **joint** probability that demand is ${w(ask[0])} in year 1 **and** ${w(ask[1])} in year 2?`,
            tree: chance('Year 1', [
              [`${pct(p1)} high`, chance('Year 2', [[`${pct(c)} high`, end('HH')], [`${pct(1 - c)} low`, end('HL')]])],
              [`${pct(1 - p1)} low`, chance('Year 2', [[`${pct(1 - q)} high`, end('LH')], [`${pct(q)} low`, end('LL')]])],
            ]),
            givens: [[R`P(H_1)`, L.pctT(p1)], [R`P(H_2 \mid H_1)`, L.pctT(c)], [R`P(L_2 \mid L_1)`, L.pctT(q)]],
            answer: P(ans), unit: '%', dp: 2,
            mistakes: uniq(P(ans), [
              { v: P(cond), why: 'That is the conditional probability of the year-2 branch. Multiply it by the year-1 probability.' },
              { v: P(first * other), why: 'That follows the other year-2 branch. Check which branch the question asks for.' },
              { v: P(first), why: 'That is only the year-1 probability. Multiply along the whole path.' },
              { v: P((1 - first) * cond), why: 'That multiplies by the other year-1 branch. Start from the year-1 outcome in the question.' },
            ], '%', 2),
            steps: [R`Multiply along the path: \[P(${ask[0]}_1 \text{ and } ${ask[1]}_2) = P(${ask[0]}_1) \times P(${ask[1]}_2 \mid ${ask[0]}_1) = ${L.dec(first)} \times ${L.dec(cond)} = ${L.dec(ans)}\]`],
            ti: [TI.line(`${tn(first)}*${tn(cond)}`, { pct: true, note: 'Multiply along the path. Times 100 gives the percentage.' })],
            why: R`A joint probability multiplies the probabilities along its path.`,
          };
        } },
      { id: 'w7-g-cond', topic: 'prob', level: 2, section: 'B', src: 'Tutorial W7 Q3 tips',
        make(rng) {
          for (let k = 0; k < 60; k++) {
            const hh = rng.step(0.3, 0.65, 0.05), hl = rng.step(0.05, 0.25, 0.05), ll = rng.step(0.05, 0.3, 0.05);
            const lh = +(1 - hh - hl - ll).toFixed(4);
            if (lh < 0.05) continue;
            const ask = rng.pick(['H|H', 'L|H', 'L|L', 'H|L']);
            const joint = { 'H|H': hh, 'L|H': hl, 'L|L': ll, 'H|L': lh }[ask];
            const marg = ask[2] === 'H' ? hh + hl : lh + ll;
            const ans = joint / marg;
            const w = (x) => (x === 'H' ? 'high' : 'low');
            return {
              q: R`Joint probabilities for two years of demand: high then high ${pct(hh)}; high then low ${pct(hl)}; low then low ${pct(ll)}. The last path (low then high) is not given. What is \(P(${ask[0]}_2 \mid ${ask[2]}_1)\), the chance of ${w(ask[0])} demand in year 2 **given** ${w(ask[2])} demand in year 1?`,
              givens: [['P(HH)', L.pctT(hh)], ['P(HL)', L.pctT(hl)], ['P(LL)', L.pctT(ll)]],
              answer: P(ans), unit: '%', dp: 2,
              mistakes: uniq(P(ans), [
                { v: P(joint), why: `That is the joint probability. Divide it by P(${w(ask[2])} in year 1).` },
                { v: P(marg), why: 'That is the probability of the year-1 branch, not the year-2 branch.' },
                { v: P(1 - ans), why: 'That is the other branch after the same year-1 outcome.' },
                { v: P(joint * marg), why: 'Divide the joint probability by the year-1 probability. Do not multiply.' },
              ], '%', 2),
              steps: [
                R`Missing path: \(P(LH) = 1 - ${L.dec(hh)} - ${L.dec(hl)} - ${L.dec(ll)} = ${L.dec(lh)}\).`,
                R`\[P(${ask[2]}_1) = ${ask[2] === 'H' ? R`${L.dec(hh)} + ${L.dec(hl)}` : R`${L.dec(lh)} + ${L.dec(ll)}`} = ${L.dec(marg)}\]`,
                R`\[P(${ask[0]}_2 \mid ${ask[2]}_1) = \frac{P(${ask[2]}_1 \text{ and } ${ask[0]}_2)}{P(${ask[2]}_1)} = \frac{${L.dec(joint)}}{${L.dec(marg)}} = ${L.numT(ans, 4)}\]`,
              ],
              ti: [TI.line({
                'H|H': `${tn(hh)}/(${tn(hh)}+${tn(hl)})`,
                'L|H': `${tn(hl)}/(${tn(hh)}+${tn(hl)})`,
                'L|L': `${tn(ll)}/(1-${tn(hh)}-${tn(hl)})`,
                'H|L': `(1-${tn(hh)}-${tn(hl)}-${tn(ll)})/(1-${tn(hh)}-${tn(hl)})`,
              }[ask], { pct: true, note: ask[2] === 'H' ? R`The joint probability divided by \(P(H_1) = P(HH) + P(HL)\).` : R`The joint probability divided by \(P(L_1) = 1 - P(HH) - P(HL)\).${ask[0] === 'H' ? ' The LH path is 1 minus the other three.' : ''}` })],
              why: R`\(P(\text{year 2} \mid \text{year 1}) = \frac{P(\text{both})}{P(\text{year 1})}\): the joint probability divided by the year-1 probability.`,
            };
          }
          return null;
        } },

      /* ---------- real options ---------- */
      { id: 'w7-g-abandon', topic: 'option', level: 2, section: 'B', src: 'Tutorial W7 Q3',
        make(rng) {
          const co = rng.company();
          for (let k = 0; k < 60; k++) {
            const C = rng.step(60000, 300000, 5000), s = rng.pick([0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6]);
            const H = Math.round((C * rng.step(0.5, 0.9, 0.05)) / 1000) * 1000, Lo = Math.round((H * rng.step(0.4, 0.7, 0.05)) / 1000) * 1000;
            const qH = rng.pick([0.1, 0.2, 0.25, 0.3, 0.4]);
            const r = rng.step(0.08, 0.12, 0.01);
            const E = qH * H + (1 - qH) * Lo, keep = E / (1 + r), sell = s * C;
            if (Math.abs(keep - sell) < 0.03 * sell) continue;
            const ans = Math.max(keep, sell), sellWins = sell > keep;
            return {
              q: R`${co} bought an asset for ${T.moneyT(C)}. Year 1 demand was **low**. Now, at \(t = 1\), it can sell the asset for ${pct(s)} of its cost, or keep it for one more year. If kept, year-2 cash flow is ${T.moneyT(H)} (probability ${pct(qH)}) or ${T.moneyT(Lo)}. \(r = ${L.pctT(r)}\). What is this decision node worth at \(t = 1\)?`,
              tree: decide(R`\(t = 1\), after a low year`, [
                ['Keep', chance(R`\(t = 2\)`, [[`${pct(qH)} high`, end(T.moneyT(H))], [`${pct(1 - qH)} low`, end(T.moneyT(Lo))]])],
                ['Sell', end(R`${T.moneyT(sell)} at \(t = 1\)`)],
              ]),
              givens: [['C', L.moneyT(C)], ['s', L.pctT(s)], ['CF_H', L.moneyT(H)], ['CF_L', L.moneyT(Lo)], [R`P(H_2 \mid L_1)`, L.pctT(qH)], ['r', L.pctT(r)]],
              answer: ans, unit: '$', dp: 2,
              mistakes: uniq(ans, [
                { v: Math.min(keep, sell), why: 'That is the worse choice. At a decision node, keep the better branch.' },
                { v: Math.max(E, sell), why: R`The year-2 cash flow arrives at \(t = 2\). Discount it one year before you compare.` },
                { v: keep + sell, why: 'You cannot keep the asset and sell it too. Choose one branch.' },
                { v: Math.max(keep, sell / (1 + r)), why: R`The sale price is received at \(t = 1\), so it is not discounted.` },
              ], '$', 2),
              steps: [
                R`Keep: \[\frac{${L.dec(qH)} \times ${L.moneyT(H)} + ${L.dec(1 - qH)} \times ${L.moneyT(Lo)}}{${L.onePlus(r)}} = \frac{${LM(E)}}{${L.onePlus(r)}} = ${LM(keep)}\]`,
                R`Sell: \(${L.dec(s)} \times ${L.moneyT(C)} = ${LM(sell)}\).`,
                sellWins ? R`Selling is worth more, so **abandon**. The node is worth \(${LM(ans)}\).` : R`Keeping is worth more, so **keep** the asset. The node is worth \(${LM(ans)}\).`,
              ],
              ti: sellWins
                ? [TI.line(`(${tn(qH)}*${tn(H)}+${tn(1 - qH)}*${tn(Lo)})${dsc(r, 1)}`, { note: 'Keep: the expected year-2 cash flow, discounted one year.' }),
                  TI.line(`${tn(s)}*${tn(C)}`, { note: R`Sell now: this is more than keeping, so sell. The node is worth \(${LM(ans)}\).` })]
                : [TI.line(`${tn(s)}*${tn(C)}`, { note: R`Sell now, at \(t = 1\).` }),
                  TI.line(`(${tn(qH)}*${tn(H)}+${tn(1 - qH)}*${tn(Lo)})${dsc(r, 1)}`, { note: R`Keep: the expected year-2 cash flow, discounted one year. This is more than selling, so keep.` })],
              why: R`Compare the discounted expected value of keeping with the sale price. A decision node takes the higher one.`,
            };
          }
          return null;
        } },
      { id: 'w7-g-upgrade', topic: 'option', level: 2, section: 'B', src: 'Lecture W7 Example 2',
        make(rng) {
          for (let k = 0; k < 60; k++) {
            const r = rng.step(0.08, 0.12, 0.01), m = 5;
            const pc = rng.pick([0.6, 0.7, 0.75, 0.8, 0.85]), p0 = rng.pick([0.5, 0.6, 0.65, 0.7]);
            if (pc === p0) continue;
            const nh = rng.step(0.4, 1.0, 0.05), nl = +(nh * rng.step(0.25, 0.5, 0.05)).toFixed(2);
            const uh = +(nh * rng.step(1.4, 2.2, 0.1)).toFixed(2), ul = +(nl * rng.step(1.5, 3, 0.25)).toFixed(2);
            const U = rng.step(0.5, 3, 0.25);
            const a = FIN.pvifa(r, m);
            const Eup = pc * uh + (1 - pc) * ul, Eno = pc * nh + (1 - pc) * nl;
            const up = -U + Eup * a, no = Eno * a;
            if (Math.abs(up - no) < 0.05) continue;
            const ans = Math.max(up, no), upWins = up > no;
            const upU = -U + (p0 * uh + (1 - p0) * ul) * a, noU = (p0 * nh + (1 - p0) * nl) * a;
            const mm = (x) => `$${K(x, 2)}m`;
            return {
              q: R`Demand was **high** in years 1–3 (it had a ${pct(p0)} chance). At \(t = 3\) the firm can upgrade its machine for ${mm(U)}. After a high period, demand stays high in years 4–8 with probability ${pct(pc)}. The tree shows the yearly cash flows. \(r = ${L.pctT(r)}\). What is the decision node at \(t = 3\) worth (in $m)?`,
              tree: decide(R`\(t = 3\), after high demand`, [
                [`Upgrade: −${mm(U)}`, chance(undefined, [[`${pct(pc)} high`, end(`${mm(uh)} a year, years 4–8`)], [`${pct(1 - pc)} low`, end(`${mm(ul)} a year, years 4–8`)]])],
                ['Do not upgrade', chance(undefined, [[`${pct(pc)} high`, end(`${mm(nh)} a year, years 4–8`)], [`${pct(1 - pc)} low`, end(`${mm(nl)} a year, years 4–8`)]])],
              ]),
              givens: [['U', R`\$${K(U, 2)}\text{m}`], [R`P(H \mid H)`, L.pctT(pc)], ['r', L.pctT(r)], ['n', '5']],
              answer: ans, unit: '$m', dp: 3,
              mistakes: uniq(ans, [
                { v: Math.min(up, no), why: 'That is the other branch. At a decision node, keep the higher NPV.' },
                { v: Eup * a, why: 'Subtract the upgrade cost from the upgrade branch.' },
                { v: Math.max(upU, noU), why: `Use the conditional probability after high demand (${pct(pc)}), not the ${pct(p0)} chance for years 1–3.` },
              ], '$m', 3),
              steps: [
                R`Expected yearly cash flow. Upgrade: \(${L.dec(pc)} \times ${K(uh, 2)} + ${L.dec(1 - pc)} \times ${K(ul, 2)} = ${L.numT(Eup, 4)}\). No upgrade: \(${L.dec(pc)} \times ${K(nh, 2)} + ${L.dec(1 - pc)} \times ${K(nl, 2)} = ${L.numT(Eno, 4)}\).`,
                R`\[NPV_3^{up} = -${K(U, 2)} + ${L.numT(Eup, 4)} \times ${L.numT(a, 6)} = ${mL(up, 4)}\]`,
                R`\[NPV_3^{no} = ${L.numT(Eno, 4)} \times ${L.numT(a, 6)} = ${mL(no, 4)}\]`,
                upWins ? R`Upgrading is worth more, so **upgrade**.` : R`Not upgrading is worth more, so **do not upgrade**.`,
              ],
              calc: `5 [N] · ${K(r * 100)} [I/YR] · ${K(Eup, 4)} [PMT] · 0 [FV] · [PV] → −${K(Eup * a, 4)} (upgrade, before the cost); ${K(Eno, 4)} [PMT] · [PV] → −${K(Eno * a, 4)}`,
              ti: (() => {
                const upS = TI.cmd('npv', [P(r), -U, [Eup], [5]], { note: upWins ? R`Upgrade: this is the higher NPV at \(t = 3\), so upgrade.` : 'Upgrade: pay the cost, then the expected cash flow for 5 years.' });
                const noS = TI.cmd('npv', [P(r), 0, [Eno], [5]], { note: upWins ? 'Do not upgrade: the expected cash flow for 5 years.' : R`Do not upgrade: this is the higher NPV at \(t = 3\), so do not upgrade.` });
                return upWins ? [noS, upS] : [upS, noS];
              })(),
              why: R`Value each branch at \(t = 3\) with the conditional probabilities, then keep the higher NPV.`,
            };
          }
          return null;
        } },
      { id: 'w7-g-chip', topic: 'option', level: 3, section: 'B', src: 'Lecture W7 Example 2', boss: true,
        make(rng) {
          for (let k = 0; k < 80; k++) {
            const r = rng.step(0.08, 0.12, 0.01), C = rng.step(2, 4, 0.5);
            const p = rng.pick([0.6, 0.65, 0.7, 0.75]), a = rng.pick([0.7, 0.75, 0.8, 0.85]), b = rng.pick([0.5, 0.6, 0.7]);
            const cfH = rng.step(0.4, 0.9, 0.05), cfL = +(cfH * rng.step(0.25, 0.5, 0.05)).toFixed(2);
            const uH = +(cfH * rng.step(1.5, 2.5, 0.1)).toFixed(2), uL = +(cfL * rng.step(1.1, 1.6, 0.1)).toFixed(2);
            const a5 = FIN.pvifa(r, 5), a3 = FIN.pvifa(r, 3), d3 = Math.pow(1 + r, 3);
            // choose the upgrade cost so that each pattern of t = 3 decisions appears
            const gH = (a * (uH - cfH) + (1 - a) * (uL - cfL)) * a5, gL = ((1 - b) * (uH - cfH) + b * (uL - cfL)) * a5;
            const pattern = rng.pick(['UN', 'UN', 'NN', 'UU']);
            const Uraw = pattern === 'UN' ? gL + (gH - gL) * rng.step(0.2, 0.8, 0.1) : pattern === 'NN' ? gH * rng.step(1.15, 1.6, 0.05) : gL * rng.step(0.4, 0.85, 0.05);
            const U = Math.round(Uraw * 4) / 4;
            if (U < 0.25) continue;
            const eUpH = a * uH + (1 - a) * uL, eNoH = a * cfH + (1 - a) * cfL; // after a high period: P(high) = a
            const eUpL = (1 - b) * uH + b * uL, eNoL = (1 - b) * cfH + b * cfL; // after a low period: P(low) = b
            const upH = -U + eUpH * a5, noH = eNoH * a5, upL = -U + eUpL * a5, noL = eNoL * a5;
            if (Math.abs(upH - noH) < 0.05 || Math.abs(upL - noL) < 0.05) continue;
            const bH = Math.max(upH, noH), bL = Math.max(upL, noL);
            const hi = bH / d3 + cfH * a3, lo = bL / d3 + cfL * a3;
            const npv = -C + p * hi + (1 - p) * lo;
            if (Math.abs(npv) < 0.05) continue;
            const branch = (x, y) => -C + p * (x / d3 + cfH * a3) + (1 - p) * (y / d3 + cfL * a3);
            const eUpU = p * uH + (1 - p) * uL, eNoU = p * cfH + (1 - p) * cfL; // wrong: unconditional P(high) for years 4–8
            const bU = Math.max(-U + eUpU * a5, eNoU * a5);
            const mm = (x) => `$${K(x, 2)}m`;
            const node = (ph) => decide(R`\(t = 3\)`, [
              [`Upgrade: −${mm(U)}`, chance(undefined, [[`${pct(ph)} high`, end(`${mm(uH)} a year, years 4–8`)], [`${pct(1 - ph)} low`, end(`${mm(uL)} a year, years 4–8`)]])],
              ['No upgrade', chance(undefined, [[`${pct(ph)} high`, end(`${mm(cfH)} a year, years 4–8`)], [`${pct(1 - ph)} low`, end(`${mm(cfL)} a year, years 4–8`)]])],
            ]);
            const choose = (x, y) => (x > y ? '**upgrade**' : '**do not upgrade**');
            return {
              q: R`A firm can buy a machine for ${mm(C)}. It lasts 8 years. At \(t = 3\) the firm may upgrade it for ${mm(U)}. The tree shows the demand probabilities and the yearly cash flows. \(r = ${L.pctT(r)}\). What is the machine’s NPV today (in $m)?`,
              tree: chance(`Buy: −${mm(C)}`, [
                [`${pct(p)} high: ${mm(cfH)} a year, years 1–3`, node(a)],
                [`${pct(1 - p)} low: ${mm(cfL)} a year, years 1–3`, node(1 - b)],
              ]),
              givens: [['C', R`\$${K(C, 2)}\text{m}`], ['U', R`\$${K(U, 2)}\text{m}`], ['r', L.pctT(r)]],
              answer: npv, unit: '$m', dp: 3,
              mistakes: uniq(npv, [
                { v: branch(noH, noL), why: R`That ignores the option to upgrade. Where upgrading has the higher NPV at \(t = 3\), use it.` },
                { v: branch(upH, upL), why: 'That always upgrades. At each decision node, keep the higher NPV.' },
                { v: -C + p * (bH + cfH * a3) + (1 - p) * (bL + cfL * a3), why: R`The \(t = 3\) values must be discounted three years back to today.` },
                { v: branch(bU, bU), why: 'For years 4–8, use the conditional probabilities after a high or a low period.' },
              ], '$m', 3),
              steps: [
                R`After high demand (\(t = 3\)). Upgrade: \(-${K(U, 2)} + ${L.numT(eUpH, 4)} \times ${L.numT(a5, 4)} = ${L.numT(upH, 4)}\). No upgrade: \(${L.numT(eNoH, 4)} \times ${L.numT(a5, 4)} = ${L.numT(noH, 4)}\). So ${choose(upH, noH)}.`,
                R`After low demand (\(t = 3\)). Upgrade: \(-${K(U, 2)} + ${L.numT(eUpL, 4)} \times ${L.numT(a5, 4)} = ${L.numT(upL, 4)}\). No upgrade: \(${L.numT(eNoL, 4)} \times ${L.numT(a5, 4)} = ${L.numT(noL, 4)}\). So ${choose(upL, noL)}.`,
                R`High branch today: \(\frac{${L.numT(bH, 4)}}{${L.onePlus(r)}^{3}} + ${K(cfH, 2)} \times ${L.numT(a3, 4)} = ${L.numT(hi, 4)}\). Low branch today: \(\frac{${L.numT(bL, 4)}}{${L.onePlus(r)}^{3}} + ${K(cfL, 2)} \times ${L.numT(a3, 4)} = ${L.numT(lo, 4)}\).`,
                R`\[NPV = -${K(C, 2)} + ${L.dec(p)} \times ${L.numT(hi, 4)} + ${L.dec(1 - p)} \times ${L.numT(lo, 4)} = ${mL(npv, 3)}\]`,
              ],
              ti: (() => {
                const best = (eu, en) => `max(npv(${P(r)},-${tn(U)},{${tn(eu)}},{5}),npv(${P(r)},0,{${tn(en)}},{5}))`;
                const m = tn(p * cfH + (1 - p) * cfL);
                return [
                  TI.line(`${best(eUpH, eNoH)}→hi`, { note: R`The best choice at \(t = 3\) after high demand (the bigger of upgrade and no upgrade), stored in hi.` }),
                  TI.line(`${best(eUpL, eNoL)}→lo`, { note: R`The best choice at \(t = 3\) after low demand, stored in lo.` }),
                  TI.line(`npv(${P(r)},-${tn(C)},{${m},${m},${m}+${tn(p)}*hi+${tn(1 - p)}*lo})`, { note: R`Years 1–3 expect \(${m}\) a year ($m). At \(t = 3\), add the expected best choice.` }),
                ];
              })(),
              why: R`Solve the two \(t = 3\) upgrade decisions first. Then add the years 1–3 cash flows, discount, and weight the branches.`,
            };
          }
          return null;
        } },
      { id: 'w7-g-balloon', topic: 'option', level: 3, section: 'B', src: 'Tutorial W7 Q3', boss: true,
        make(rng) {
          const co = rng.company();
          for (let k = 0; k < 80; k++) {
            const C = rng.step(60000, 200000, 5000);
            const H = Math.round((C * rng.step(0.55, 0.85, 0.05)) / 1000) * 1000;
            const Lo = Math.round((H * rng.step(0.45, 0.75, 0.05)) / 1000) * 1000;
            const s = rng.pick([0.35, 0.4, 0.45, 0.5, 0.55]);
            const hh = rng.step(0.4, 0.65, 0.05), hl = rng.step(0.05, 0.2, 0.05), ll = rng.step(0.1, 0.3, 0.05);
            const lh = +(1 - hh - hl - ll).toFixed(4);
            if (lh < 0.05) continue;
            const r = rng.step(0.08, 0.12, 0.01);
            const b = balloon(C, H, Lo, s, r, hh, hl, ll);
            if (Math.abs(b.keepL - b.sal) < 0.03 * b.sal || Math.abs(b.npv) < 500) continue;
            return {
              q: R`${co} buys a tour boat for ${T.moneyT(C)}. It lasts 2 years, with no salvage at the end. Cash flow is ${T.moneyT(H)} in a high-demand year and ${T.moneyT(Lo)} in a low one. After a **low** year 1, it can sell the boat for ${pct(s)} of cost. Joint probabilities: HH ${pct(hh)}, HL ${pct(hl)}, LL ${pct(ll)}. \(r = ${L.pctT(r)}\). What is the NPV?`,
              tree: balloonTree(C, H, Lo, b.sal),
              givens: [['C', L.moneyT(C)], ['CF_H', L.moneyT(H)], ['CF_L', L.moneyT(Lo)], [R`\text{Sale}`, L.moneyT(b.sal)], ['r', L.pctT(r)]],
              answer: b.npv, unit: '$', dp: 2,
              mistakes: uniq(b.npv, [
                b.abandon ? { v: b.npvKeep, why: 'That ignores the option to sell. After a low year 1, selling is worth more than keeping.' }
                  : { v: b.npvSell, why: 'Selling after a low year 1 is worth less than keeping. Take the higher branch.' },
                { v: b.npvJoint, why: R`That uses joint probabilities on the year-2 branches. Use conditional ones: joint \(\div\) year-1 probability.` },
                { v: b.npvOnce, why: R`Year-2 cash flows need two years of discounting: one to \(t = 1\), then one more to today.` },
              ], '$', 2),
              steps: [
                R`\(P(H_1) = ${L.dec(hh)} + ${L.dec(hl)} = ${L.dec(b.pH1)}\), \(P(H_2 \mid H_1) = \frac{${L.dec(hh)}}{${L.dec(b.pH1)}} = ${L.numT(b.pH2H, 4)}\). \(P(L_1) = ${L.dec(b.pL1)}\), \(P(L_2 \mid L_1) = \frac{${L.dec(ll)}}{${L.dec(b.pL1)}} = ${L.numT(b.pL2L, 4)}\).`,
                R`After a low year 1, keep: \[\frac{${L.numT(b.pH2L, 4)} \times ${L.moneyT(H)} + ${L.numT(b.pL2L, 4)} \times ${L.moneyT(Lo)}}{${L.onePlus(r)}} = \frac{${LM(b.E2L)}}{${L.onePlus(r)}} = ${LM(b.keepL)}\] Sell: \(${L.dec(s)} \times ${L.moneyT(C)} = ${LM(b.sal)}\). ${b.abandon ? '**Sell** (abandon), because it is worth more.' : '**Keep** the boat, because it is worth more.'}`,
                R`After a high year 1: \[\frac{${L.numT(b.pH2H, 4)} \times ${L.moneyT(H)} + ${L.numT(1 - b.pH2H, 4)} \times ${L.moneyT(Lo)}}{${L.onePlus(r)}} = \frac{${LM(b.E2H)}}{${L.onePlus(r)}} = ${LM(b.E2H / (1 + r))}\]`,
                R`\[NPV = -${L.moneyT(C)} + \frac{${L.dec(b.pH1)} \times ${LM(b.V1H)} + ${L.dec(b.pL1)} \times ${LM(b.V1L)}}{${L.onePlus(r)}} = ${LM(b.npv)}\]`,
              ],
              why: R`Turn the joint probabilities into conditional ones, solve the \(t = 1\) sell-or-keep decision, then discount back.`,
            };
          }
          return null;
        } },
      { id: 'w7-g-unter', topic: 'option', level: 3, section: 'B', src: 'Tutorial W7 case study (Unter)', boss: true,
        make(rng) {
          const co = rng.company();
          for (let k = 0; k < 80; k++) {
            const N = rng.pick([7, 8, 9, 10]), r = rng.step(0.08, 0.12, 0.01);
            const Qc = rng.step(20, 40, 5), s = rng.step(3, 8, 1), S = rng.step(20, 35, 5), U = rng.step(40, 90, 5), V = rng.step(40, 90, 5);
            const p2 = rng.pick([0.75, 0.8, 0.85, 0.9, 0.95]);
            const a = FIN.pvifa(r, N - 2);
            const up2 = -U + S * a, no2 = s * a;
            if (Math.abs(up2 - no2) < 2) continue;
            const best2 = Math.max(up2, no2), upWins = up2 > no2;
            const app = s / (1 + r) + (s + best2) / Math.pow(1 + r, 2), ban = s / (1 + r) + (s + V) / Math.pow(1 + r, 2);
            const npv = -Qc + p2 * app + (1 - p2) * ban;
            if (Math.abs(npv) < 0.5) continue;
            const other2 = Math.min(up2, no2);
            const mm = (x) => `$${K(x, 2)}m`;
            return {
              q: R`${co} runs a taxi fleet. It can fit self-driving kits to a quarter of the fleet now. The tree shows the costs, the savings and the regulator’s review at \(t = 2\). Savings are ${mm(s)} a year in years 1–2 on every branch. \(r = ${L.pctT(r)}\), no tax. What is the NPV at \(t = 0\) of this plan (in $m)?`,
              tree: chance(`Quarter of fleet: −${mm(Qc)}`, [
                [`${pct(p2)} approved`, decide(R`\(t = 2\)`, [[`Upgrade the rest: −${mm(U)}`, end(`${mm(S)} a year, years 3–${N}`)], ['No upgrade', end(`${mm(s)} a year, years 3–${N}`)]])],
                [`${pct(1 - p2)} banned`, end(R`Sell the fleet for ${mm(V)} at \(t = 2\)`)],
              ]),
              givens: [['I', R`\$${Qc}\text{m}`], ['p', L.pctT(p2)], ['r', L.pctT(r)], ['n', R`${N - 2} \text{ years after } t = 2`]],
              answer: npv, unit: '$m', dp: 2,
              mistakes: uniq(npv, [
                { v: -Qc + p2 * (s / (1 + r) + (s + other2) / Math.pow(1 + r, 2)) + (1 - p2) * ban, why: upWins ? 'That ignores the option to upgrade after approval.' : R`Upgrading is not worth it here. Compare the two NPVs at \(t = 2\) and keep the higher.` },
                { v: -Qc + p2 * (s / (1 + r) + s / Math.pow(1 + r, 2) + best2) + (1 - p2) * ban, why: R`The \(t = 2\) decision value must be discounted two years back to today.` },
                { v: -Qc + p2 * (best2 / Math.pow(1 + r, 2)) + (1 - p2) * (V / Math.pow(1 + r, 2)), why: `Include the ${mm(s)} savings in years 1 and 2 on every branch.` },
              ], '$m', 2),
              steps: [
                R`At \(t = 2\), if approved. Upgrade: \(-${U} + ${S} \times ${L.numT(a, 6)} = ${mL(up2, 2)}\). No upgrade: \(${s} \times ${L.numT(a, 6)} = ${mL(no2, 2)}\). ${upWins ? '**Upgrade.**' : '**Do not upgrade.**'}`,
                R`Approved branch at \(t = 0\): \(\frac{${s}}{${L.onePlus(r)}} + \frac{${s} + ${L.numT(best2, 2)}}{${L.onePlus(r)}^{2}} = ${L.numT(app, 4)}\)`,
                R`Banned branch at \(t = 0\): \(\frac{${s}}{${L.onePlus(r)}} + \frac{${s} + ${V}}{${L.onePlus(r)}^{2}} = ${L.numT(ban, 4)}\)`,
                R`\[NPV_0 = -${Qc} + ${L.dec(p2)} \times ${L.numT(app, 4)} + ${L.dec(1 - p2)} \times ${L.numT(ban, 4)} = ${mL(npv, 2)}\]`,
              ],
              why: R`Solve the \(t = 2\) upgrade decision first. Then weight the approve and ban branches and discount to today.`,
            };
          }
          return null;
        } },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
