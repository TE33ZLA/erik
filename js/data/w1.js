/* Floor 1 — Week 1: Introduction to corporate finance + financial mathematics I (lump sums). */
(function (root) {
  'use strict';
  const { FIN, L, T, TI } = root;
  const R = String.raw;
  const P = (r) => +(r * 100).toFixed(8); // decimal rate -> percent units for answers

  const FREQ = [
    { m: 2, word: 'semi-annually' },
    { m: 4, word: 'quarterly' },
    { m: 12, word: 'monthly' },
    { m: 365, word: 'daily' },
  ];

  root.registerPack({
    id: 'w1', floor: 1, week: 'Week 1',
    title: 'The Clock Tower',
    topic: 'Corporate finance and the time value of money',
    color: '#3b7dd8', icon: '⏳',
    intro: 'Welcome, intern. Down here the clocks run the building. Master time and money, and the lift to Floor 2 opens.',

    briefing: [
      { h: 'The goal of the firm', points: [
        R`Financial managers aim to **maximise shareholder wealth**, which means maximising the value of the firm.`,
        R`**Investment decision:** which real assets to buy (left side of the balance sheet).`,
        R`**Financing decision:** the mix of debt and equity used to pay for them (right side).`,
        R`**Payout decision:** how much cash to return to shareholders, how, and how often.`,
      ] },
      { h: 'Time value of money', points: [
        R`A dollar today is worth more than a dollar tomorrow, because today’s dollar can earn interest.`,
        R`Compounding moves money **forward**: \(FV_n = PV \times (1+r)^{n}\).`,
        R`Discounting moves money **back**: \(PV = \frac{FV_n}{(1+r)^{n}}\).`,
        R`On a timeline, \(t = 0\) is today and \(t = 1\) is the end of period 1 (the start of period 2).`,
      ] },
      { h: 'Simple vs compound interest', points: [
        R`Simple interest: \(\text{Interest} = P \times r \times t\). Interest never earns interest.`,
        R`Compound interest earns **interest on interest**, so it grows faster.`,
      ] },
      { h: 'Solving for n and r', points: [
        R`Time: \(n = \frac{\ln(FV/PV)}{\ln(1+r)}\).`,
        R`Rate: \(r = \left(\frac{FV}{PV}\right)^{1/n} - 1\).`,
        R`Rule of 72: money doubles in about \(\frac{72}{r\%}\) years. It is only an estimate.`,
      ] },
      { h: 'APR, compounding and EAR', points: [
        R`The **APR** (nominal rate) is the quoted rate: rate per period \(\times\) periods per year.`,
        R`\(EAR = \left(1 + \frac{APR}{m}\right)^{m} - 1\). More frequent compounding gives a higher EAR.`,
        R`Compare loans and deposits using **EARs, never APRs**.`,
        R`Continuous compounding: \(FV = Ce^{rn}\) and \(EAR = e^{r} - 1\).`,
      ] },
      { h: 'On your TI-Nspire CX CAS', points: [
        R`Finance Solver: **menu 8 1**. \(I(\%)\) is the yearly rate as a percentage (type 6 for 6%).`,
        R`Yearly problems: \(PpY = CpY = 1\). Monthly compounding: \(N = 12n\) and \(PpY = CpY = 12\).`,
        R`Money you pay out is **negative**, money you receive is positive.`,
        R`\(\text{eff}(APR, m)\) gives the EAR; \(\text{nom}(EAR, m)\) gives the APR back.`,
      ] },
    ],

    topics: {
      corp: 'Goals and decisions of the firm',
      tvm: 'Time value concepts',
      fv: 'Future value (lump sum)',
      pv: 'Present value (lump sum)',
      simple: 'Simple interest',
      solve: 'Solving for time and rate',
      ear: 'APR, compounding and EAR',
      cont: 'Continuous compounding',
    },

    nodes: [
      { id: 'w1-L1', kind: 'lesson', name: 'What corporate finance is about', lesson: 'w1-L1' },
      { id: 'w1-m1', kind: 'mini', name: 'Decision Dash', mini: 'decision-dash' },
      { id: 'w1-L2', kind: 'lesson', name: 'Money has a time value', lesson: 'w1-L2' },
      { id: 'w1-L3', kind: 'lesson', name: 'Growing money: future value', lesson: 'w1-L3' },
      { id: 'w1-L4', kind: 'lesson', name: 'Shrinking money: present value', lesson: 'w1-L4' },
      { id: 'w1-1', kind: 'battle', name: 'The Lobby', topics: ['corp', 'tvm', 'fv', 'pv'], n: 6,
        enemy: { name: 'Compound Slime', title: 'Grows on its own interest', body: 'blob', color: '#7cc85a', acc: ['antenna'], mouth: 'grin', item: '💰',
          lines: { intro: 'Blub! Every year I grow on my own interest!', hit: ['Blub… you are compounding your knowledge!', 'Ow! That hurt (1 + r) to the n!'],
            taunt: ['Blub-blub! Wrong way through time!', 'Did you discount when you should compound?'], win: 'I have been… discounted… to zero…', lose: 'More interest for me! Blub!' } } },
      { id: 'w1-L5', kind: 'lesson', name: 'Finding the time and the rate', lesson: 'w1-L5' },
      { id: 'w1-2', kind: 'battle', name: 'The Waiting Room', topics: ['solve', 'simple', 'fv', 'pv'], n: 6,
        enemy: { name: 'The Procrastinator', title: 'Pays you back… eventually', body: 'round', color: '#a58fd6', acc: ['cap'], mouth: 'flat', item: '⏰',
          lines: { intro: 'Why pay today when you can pay… eventually?', hit: ['Zzz… wait, how did you solve for n so fast?', 'You found the rate? Already?'],
            taunt: ['See? Waiting costs nothing. Totally nothing.', 'Take your time. Literally.'], win: 'I will… be defeated… tomorrow.', lose: 'No rush. I will wait for you forever.' } } },
      { id: 'w1-m2', kind: 'mini', name: 'Rule of 72 Rush', mini: 'rule72' },
      { id: 'w1-L6', kind: 'lesson', name: 'APR and EAR', lesson: 'w1-L6' },
      { id: 'w1-L7', kind: 'lesson', name: 'Continuous compounding', lesson: 'w1-L7' },
      { id: 'w1-3', kind: 'battle', name: 'Compounding Corridor', topics: ['ear', 'cont'], n: 6,
        enemy: { name: 'The APR Impostor', title: 'Quotes low, compounds often', body: 'spiky', color: '#ef7b45', acc: ['tophat', 'monocle'], mouth: 'smirk', item: '📜',
          lines: { intro: 'My APR is lower, darling. Do not ask how often I compound.', hit: ['You converted to EAR? How rude!', 'Curses, an effective rate!'],
            taunt: ['Ha! You compared APRs!', 'Sign here, here and here.'], win: 'Exposed by an effective annual rate…', lose: 'Your loan is approved. Mwahaha.' } } },
      { id: 'w1-boss', kind: 'boss', name: 'Chronos', topics: '*', n: 10,
        enemy: { name: 'Chronos', title: 'Keeper of Compounding', body: 'tall', color: '#4a67b0', acc: ['crown'], eyes: 3, mouth: 'fangs', item: '⏳',
          lines: { intro: 'I am Time itself. Every dollar bends to my (1 + r) to the n!', hit: ['Impossible! A mortal who understands discounting!', 'You bend time like a CFO!'],
            taunt: ['Tick… tock… your present value shrinks!', 'Time waits for no intern!'], win: 'Time… really is… money…', lose: 'Your future value is zero!' } } },
    ],

    minis: {
      'decision-dash': {
        game: 'rapid', title: 'Decision Dash', intro: 'A stream of boardroom decisions is coming. Sort each one: investment, financing or payout?',
        bins: [{ id: 'inv', label: 'Investment' }, { id: 'fin', label: 'Financing' }, { id: 'pay', label: 'Payout' }],
        items: [
          { t: 'Build a new warehouse', bin: 'inv', why: 'Buying a real asset is an investment decision.' },
          { t: 'Issue $50m of corporate bonds', bin: 'fin', why: 'Raising money with debt is a financing decision.' },
          { t: 'Pay a special dividend', bin: 'pay', why: 'Returning cash to shareholders is a payout decision.' },
          { t: 'Buy back 5% of the company’s shares', bin: 'pay', why: 'A share buyback returns cash to shareholders.' },
          { t: 'Take out a bank loan to fund growth', bin: 'fin', why: 'Borrowing is a financing decision.' },
          { t: 'Buy a competitor’s factory', bin: 'inv', why: 'Acquiring productive assets is an investment decision.' },
          { t: 'Replace old machines with robots', bin: 'inv', why: 'Choosing which assets to own is an investment decision.' },
          { t: 'Sell new shares to raise equity', bin: 'fin', why: 'Raising equity is a financing decision.' },
          { t: 'Decide how often to pay dividends', bin: 'pay', why: 'How often cash is paid out is part of the payout decision.' },
          { t: 'Launch a new product line', bin: 'inv', why: 'A new project is an investment decision.' },
          { t: 'Refinance debt at a lower interest rate', bin: 'fin', why: 'Changing how the firm is funded is a financing decision.' },
          { t: 'Raise the dividend from 20c to 25c per share', bin: 'pay', why: 'The size of the dividend is a payout decision.' },
          { t: 'Install a new IT system', bin: 'inv', why: 'Spending on a long-lived asset is an investment decision.' },
          { t: 'Issue preference shares', bin: 'fin', why: 'Preference shares are a source of funds, so this is financing.' },
          { t: 'Set a target debt-to-equity ratio', bin: 'fin', why: 'The debt/equity mix is the heart of the financing decision.' },
          { t: 'Keep profits in the firm instead of paying them out', bin: 'pay', why: 'Retaining earnings is the other side of the payout decision.' },
          { t: 'Buy a fleet of delivery drones', bin: 'inv', why: 'Buying assets to run the business is an investment decision.' },
          { t: 'Choose between a cash dividend and a buyback', bin: 'pay', why: 'How cash is returned is part of the payout decision.' },
        ],
        rounds: 12, seconds: 10,
      },
      rule72: {
        game: 'rapid', title: 'Rule of 72 Rush', intro: 'Estimate fast! Money doubles in about 72 ÷ r years. Pick the closest answer.',
        gen(rng) {
          if (rng.chance(0.6)) {
            const r = rng.pick([2, 3, 4, 6, 8, 9, 12, 18, 24]);
            const a = 72 / r;
            const opts = rng.shuffle([a, a * 2, a / 2].map((x) => +x.toFixed(1)));
            return { t: R`Rate \(${r}\%\) p.a. Years to double?`, opts: opts.map((x) => R`\(\approx ${L.numT(x, 1)}\) years`), a: opts.indexOf(+a.toFixed(1)),
              why: R`\(72 \div ${r} = ${L.numT(a, 1)}\) years.` };
          }
          const n = rng.pick([3, 4, 6, 8, 9, 12, 18, 24]);
          const a = 72 / n;
          const opts = rng.shuffle([a, a * 2, a / 2].map((x) => +x.toFixed(1)));
          return { t: R`Money doubled in \(${n}\) years. Rate?`, opts: opts.map((x) => R`\(\approx ${L.numT(x, 1)}\%\)`), a: opts.indexOf(+a.toFixed(1)),
            why: R`\(72 \div ${n} = ${L.numT(a, 1)}\%\) per year.` };
        },
        rounds: 12, seconds: 9,
      },
    },

    lessons: {
      'w1-L1': {
        title: 'What corporate finance is about',
        goal: R`Name the goal of a company’s financial managers and the three big decisions they make.`,
        topics: ['corp'],
        cards: [
          { kind: 'learn', title: 'Spend now, earn later',
            body: R`A company spends money today, on machines, buildings and people, hoping to earn more money later.\n\n**Corporate finance** is about making those money decisions well.`,
            viz: { type: 'bars', sign: true, bars: [{ label: 'Today', v: -100, note: 'Spend' }, { label: 'Year 1', v: 40, note: 'Earn' }, { label: 'Year 2', v: 50, note: 'Earn' }, { label: 'Year 3', v: 60, note: 'Earn' }],
              cap: R`Cash goes **out** today (red). More cash comes **back** in later years (green).` } },
          { kind: 'learn', title: 'The goal: make the owners richer',
            body: R`The owners of a company are its **shareholders**. The managers work for them.\n\nSo the goal of financial management is to **maximise shareholder wealth**: make the company’s shares worth as much as possible.`,
            viz: { type: 'compare', key: true, items: [
              { icon: '💎', title: 'Highest share value', points: ['Counts all the cash to come', 'Counts when it arrives, and the risk'], c: 3, mark: 'good', markText: 'The goal' },
              { icon: '📈', title: 'Biggest profit this year', points: ['Can rise while the firm is worth less'], c: 2, mark: 'bad', markText: 'Not the goal' }],
              cap: R`Managers work for the shareholders, so they aim for the **share value**, not this year’s profit.` },
            tip: R`This is not the same as the biggest profit this year. Profit can go up while the company becomes worth less, for example when the cash arrives much later or the risk is much higher.` },
          { kind: 'learn', title: 'Decision 1: investment',
            body: R`The **investment decision** is about which long-term assets to buy: a factory, a new product line, a fleet of trucks.\n\nOn the balance sheet these are the **assets** (the left-hand side).`,
            viz: { type: 'compare', vs: false, title: 'The balance sheet', items: [
              { icon: '🏭', title: 'Left: assets', points: ['A factory', 'A new product line', 'A fleet of trucks'], c: 1, mark: 'good', markText: 'Investment decision' },
              { icon: '🏦', title: 'Right: debt and equity', points: ['How the assets are paid for'], c: 'grey' }],
              cap: R`The investment decision fills the **left** side of the balance sheet: what the firm owns.` } },
          { kind: 'learn', title: 'Decision 2: financing',
            body: R`The **financing decision** is about how to pay for those assets.\n\nThe company can borrow (**debt**: a bank loan or bonds) or sell part-ownership (**equity**: new shares). This shapes the right-hand side of the balance sheet: liabilities and equity.`,
            viz: { type: 'compare', vs: false, title: 'The balance sheet', items: [
              { icon: '🏭', title: 'Left: assets', points: ['What the firm owns'], c: 'grey' },
              { icon: '🏦', title: 'Right: debt and equity', points: ['**Debt**: bank loans, bonds', '**Equity**: new shares'], c: 2, mark: 'good', markText: 'Financing decision' }],
              cap: R`The financing decision sets the **right** side: how much debt and how much equity.` } },
          { kind: 'learn', title: 'Decision 3: payout',
            body: R`The **payout decision** is about spare cash.\n\nThe company can pay it to shareholders as **dividends**, **buy back** some of its own shares, or keep it to reinvest. It also decides how often to pay.`,
            viz: { type: 'cards', items: [{ icon: '💵', t: 'Pay dividends', s: 'cash to every shareholder' }, { icon: '🔁', t: 'Buy back shares', s: 'the firm buys some of its own shares' }, { icon: '🏗️', t: 'Keep it', s: 'reinvest in the business' }],
              cap: R`Three things to do with spare cash. The firm also picks how **often** to pay.` } },
          { kind: 'check', ref: 'w1-q02' },
          { kind: 'check', ref: 'w1-q03' },
          { kind: 'check', ref: 'w1-q04' },
          { kind: 'recap', title: 'Remember', points: [R`The goal is to **maximise shareholder wealth** (the value of the shares), not profit or sales.`, R`**Investment**: which assets to buy.`, R`**Financing**: debt or equity to pay for them.`, R`**Payout**: dividends, buybacks, or keep the cash.`] },
        ],
      },
      'w1-L2': {
        title: 'Money has a time value',
        goal: R`Explain why a dollar today is worth more than a dollar later, draw a timeline, and work out simple interest.`,
        topics: ['tvm', 'simple'],
        cards: [
          { kind: 'learn', title: 'Would you rather…?',
            body: R`Would you take $100 today or $100 in one year? Take it today.\n\nMoney you have today can go in the bank and earn **interest**. In a year you would have more than $100. This is the **time value of money**: a dollar today is worth more than a dollar later.`,
            viz: { type: 'compare', items: [
              { icon: '💵', title: 'Today', big: R`\(\$100\)`, points: ['Goes in the bank now', 'Earns interest for a year'], c: 1, mark: 'good', markText: 'Worth more' },
              { icon: '⏳', title: 'In one year', big: R`\(\$100\)`, points: ['You wait a year', 'No interest for you'], c: 'grey' }],
              cap: R`The same \(\$100\) on paper. Only the one you get **today** can earn interest.` } },
          { kind: 'learn', title: 'Interest is the price of time',
            body: R`**Interest** is what a bank pays you for using your money, or what you pay when you borrow.\n\nThe **interest rate**, \(r\), says how much per year, as a percentage of the amount. At \(r = 5\%\), $1,000 earns $50 in a year.`,
            viz: { type: 'bars', fmt: '$', bars: [{ label: 'Today', v: 1000, c: 1 }, { label: 'In 1 year', parts: [{ v: 1000, c: 1 }, { v: 1000 * 0.05, c: 2 }] }],
              keys: [{ c: 1, label: R`Your \(\$1{,}000\)` }, { c: 2, label: R`Interest at \(5\%\): \(\$50\)` }],
              cap: R`The orange \(\$50\) is what the bank pays for using your \(\$1{,}000\) for a year.` } },
          { kind: 'learn', title: 'Draw a timeline',
            body: R`A **timeline** shows when money moves. \(t = 0\) is **today**. \(t = 1\) is the end of year 1, \(t = 2\) is the end of year 2, and so on.\n\nThis timeline shows $100 put in the bank today, and the unknown amount you will have after 3 years.`,
            viz: { type: 'tl', n: 3, at: { 0: '−$100', 3: '?' }, unit: ' ', labels: { 0: '0 = today' }, hi: [3],
              spans: [{ from: 0, to: 1, label: 'Year 1' }, { from: 1, to: 2, label: 'Year 2' }, { from: 2, to: 3, label: 'Year 3' }],
              cap: R`Each tick is a **moment**; each gap is a **year**. So \(t = 1\) is the end of year 1.` },
            tip: R`Money you pay out is often written with a minus sign. Money you receive is positive.` },
          { kind: 'check', ref: 'w1-q08' },
          { kind: 'learn', title: 'Simple interest',
            body: R`With **simple interest** you only earn interest on the amount you first put in (the **principal**, \(P\)).\n\n\[\text{Interest} = P \times r \times t\]\n\nwhere \(t\) is the time in years. $1,000 at 10% for 3 years earns \(1{,}000 \times 0.10 \times 3 = \$300\).`,
            viz: { type: 'bars', fmt: '$', bars: [0, 1, 2, 3].map((t) => ({ label: t ? 'Year ' + t : 'Today', parts: [{ v: 1000, c: 1 }, { v: FIN.simpleInterest(1000, 0.1, t), c: 2 }] })),
              keys: [{ c: 1, label: R`Principal \(\$1{,}000\)` }, { c: 2, label: R`Interest: \(\$100\) every year` }],
              cap: R`The orange part grows by the **same** \(\$100\) each year: \(\$300\) after 3 years.` },
            formula: 'simple-int' },
          { kind: 'example', title: 'Worked example: a short loan', q: R`You borrow $20,000 for 90 days at 8% p.a. simple interest (365-day year). How much do you repay?`,
            steps: [R`Time in years: \(t = \frac{90}{365}\).`, R`\[\text{Interest} = 20{,}000 \times 0.08 \times \frac{90}{365} = \$394.52\]`, R`Repay the loan plus the interest: \(20{,}000 + 394.52 = \$20{,}394.52\).`],
            answer: R`You repay \(\$20{,}394.52\).`, ti: [TI.line('20000*(1+0.08*90/365)')] },
          { kind: 'learn', title: 'Compound interest: interest on interest',
            body: R`Most accounts pay **compound interest**. Each year’s interest is added to the balance, so the next year you earn interest on the interest too.\n\nWith $1,000 at 10%, year 2’s interest is 10% of $1,100, which is $110, not $100.`,
            viz: { type: 'bars', fmt: '$', key: true, title: 'Compound interest earned in each year',
              bars: [1, 2, 3].map((t) => ({ label: 'Year ' + t, parts: [{ v: 1000 * 0.1, c: 2 }, { v: FIN.fv(1000, 0.1, t - 1) * 0.1 - 1000 * 0.1, c: 3 }] })),
              keys: [{ c: 2, label: R`\(10\%\) of the \(\$1{,}000\)` }, { c: 3, label: 'Interest on earlier interest' }],
              cap: R`Simple interest stops at the orange \(\$100\). Compounding adds the aqua part, and it keeps growing.` },
            table: { head: ['Year', 'Simple interest', 'Compound interest'], rows: [['0', '$1,000', '$1,000'], ['1', '$1,100', '$1,100'], ['2', '$1,200', '$1,210'], ['3', '$1,300', '$1,331']] } },
          { kind: 'check', ref: 'w1-q16' },
          { kind: 'check', ref: 'w1-q07' },
          { kind: 'recap', title: 'Remember', points: [R`A dollar today is worth more than a dollar later, because it can earn interest.`, R`On a timeline \(t = 0\) is today and \(t = 1\) is the end of year 1.`, R`Simple interest: \(P \times r \times t\). It never earns interest on interest.`, R`Compound interest earns interest on interest, so it grows faster.`] },
        ],
      },
      'w1-L3': {
        title: 'Growing money: future value',
        goal: R`Work out what money today grows to, by hand and on the TI-Nspire.`,
        topics: ['fv'],
        cards: [
          { kind: 'learn', title: 'Future value',
            body: R`The **future value** (FV) is what money today grows to after some years of compound interest.\n\nEach year multiplies the balance by \((1 + r)\). After \(n\) years you have multiplied by \((1 + r)\) \(n\) times, which is \((1 + r)^{n}\).`,
            viz: { type: 'tl', key: true, n: 3, unit: 'Year', at: { 0: 'PV: today', 3: 'FV: later' }, hi: [3],
              moves: [{ from: 0, to: 1, label: '× (1+r)', c: 1 }, { from: 1, to: 2, label: '× (1+r)', c: 1 }, { from: 2, to: 3, label: '× (1+r)', c: 1 }],
              spans: [{ from: 0, to: 3, label: 'In all: × (1+r)^3', c: 1 }],
              cap: R`Compounding moves money **forward**: one hop of \(\times (1 + r)\) per year. Three hops make \((1 + r)^{3}\).` } },
          { kind: 'learn', title: 'The formula',
            body: R`\[FV_n = PV \times (1 + r)^{n}\]\n\n\(PV\) is the amount today, \(r\) is the yearly rate as a decimal, and \(n\) is the number of years.`,
            viz: { type: 'anatomy', tex: R`\colC{FV_n} = \colA{PV} \times (1 + \colB{r})^{\colD{n}}`, parts: [
              { sym: 'FV_n', c: 'C', say: R`future value: what it grows to after \(n\) years` },
              { sym: 'PV', c: 'A', say: 'the amount today' },
              { sym: 'r', c: 'B', say: R`the yearly rate as a decimal: \(7\%\) is \(0.07\)` },
              { sym: 'n', c: 'D', say: 'the number of years it grows' }],
              cap: R`The power \(n\) counts the hops of \(\times (1 + r)\): one for each year.` },
            formula: 'fv-lump' },
          { kind: 'example', title: 'Worked example', q: R`You deposit $5,000 at 7% p.a., compounded annually, for 10 years. How much will you have?`,
            steps: [R`Write down what you know: \(PV = 5{,}000\), \(r = 0.07\), \(n = 10\).`, R`Put them in the formula: \(FV_{10} = 5{,}000 \times 1.07^{10}\).`, R`\(1.07^{10} = 1.967151\), so \(FV_{10} = 5{,}000 \times 1.967151 = \$9{,}835.76\).`],
            answer: R`You will have \(\$9{,}835.76\): the money almost doubles.`,
            ti: [TI.solver({ N: 10, I: 7, PV: -5000, Pmt: 0, PpY: 1, CpY: 1 }, 'FV')] },
          { kind: 'ti', title: 'Two ways on the TI-Nspire', body: R`Type the formula in a Calculator page, or use the Finance Solver (menu 8 1) with \(PV = -5000\). Both give the same answer.`,
            ti: [TI.line('5000*1.07^10'), TI.solver({ N: 10, I: 7, PV: -5000, Pmt: 0, PpY: 1, CpY: 1 }, 'FV')] },
          { kind: 'check', gen: 'w1-g-fv' },
          { kind: 'learn', title: 'Time makes it snowball',
            body: R`Because interest earns interest, money grows faster and faster. Here is $1,000 at 8% a year.`,
            viz: { type: 'bars', fmt: '$', bars: [0, 10, 20, 30].map((t) => ({ label: t ? t + ' years' : 'Today', parts: [{ v: 1000, c: 1 }, { v: FIN.simpleInterest(1000, 0.08, t), c: 2 }, { v: FIN.fv(1000, 0.08, t) - 1000 - FIN.simpleInterest(1000, 0.08, t), c: 3 }] })),
              keys: [{ c: 1, label: R`Your \(\$1{,}000\)` }, { c: 2, label: R`Interest on the \(\$1{,}000\)` }, { c: 3, label: 'Interest on interest' }],
              cap: R`By year 30 the aqua **interest on interest** is bigger than the other two parts together.` },
            table: { head: ['Years', 'Balance'], rows: [['10', '$2,158.92'], ['20', '$4,660.96'], ['30', '$10,062.66']] },
            tip: R`In 30 years the money grows about ten times, even though 8% a year sounds small.` },
          { kind: 'check', ref: 'w1-q09' },
          { kind: 'recap', title: 'Remember', points: [R`\(FV_n = PV(1 + r)^{n}\): compounding moves money **forward** in time.`, R`Use the decimal rate in the formula (\(0.07\)), but the percentage in the Finance Solver (\(7\)).`, R`In the solver the deposit is negative (\(PV = -5000\)), so \(FV\) comes out positive.`] },
        ],
      },
      'w1-L4': {
        title: 'Shrinking money: present value',
        goal: R`Work out what a future amount is worth today, and count the periods correctly.`,
        topics: ['pv'],
        cards: [
          { kind: 'learn', title: 'Going back in time',
            body: R`Sometimes you know how much you need **later** and want to know what that is worth **today**. That is its **present value** (PV).\n\nGoing back in time is called **discounting**. It is compounding in reverse: you divide by \((1 + r)^{n}\) instead of multiplying.`,
            viz: { type: 'tl', key: true, n: 3, unit: 'Year', at: { 0: 'PV: today', 3: 'FV: later' }, hi: [0],
              moves: [{ from: 3, to: 2, label: '÷ (1+r)', c: 2 }, { from: 2, to: 1, label: '÷ (1+r)', c: 2 }, { from: 1, to: 0, label: '÷ (1+r)', c: 2 }],
              spans: [{ from: 0, to: 3, label: 'In all: ÷ (1+r)^3', c: 2 }],
              cap: R`Discounting walks **back** to today: divide by \((1 + r)\) once for each year.` } },
          { kind: 'learn', title: 'The formula',
            body: R`\[PV = \frac{FV_n}{(1 + r)^{n}}\]\n\nThe rate \(r\) used here is called the **discount rate**.`,
            viz: { type: 'anatomy', tex: R`\colA{PV} = \dfrac{\colC{FV_n}}{(1 + \colB{r})^{\colD{n}}}`, parts: [
              { sym: 'PV', c: 'A', say: 'present value: what it is worth today' },
              { sym: 'FV_n', c: 'C', say: R`the amount at time \(n\)` },
              { sym: 'r', c: 'B', say: R`the **discount rate**, as a decimal` },
              { sym: 'n', c: 'D', say: 'the number of periods back to today' }],
              cap: R`The same four letters as the FV formula, but now you **divide** by \((1 + r)^{n}\).` },
            formula: 'pv-lump' },
          { kind: 'example', title: 'Worked example', q: R`You need $20,000 in 6 years. The bank pays 5% p.a., compounded annually. How much must you deposit today?`,
            steps: [R`What you know: \(FV_6 = 20{,}000\), \(r = 0.05\), \(n = 6\).`, R`\[PV = \frac{20{,}000}{1.05^{6}}\]`, R`\(1.05^{6} = 1.340096\), so \(PV = \frac{20{,}000}{1.340096} = \$14{,}924.31\).`],
            answer: R`Deposit \(\$14{,}924.31\) today.`,
            ti: [TI.solver({ N: 6, I: 5, Pmt: 0, FV: 20000, PpY: 1, CpY: 1 }, 'PV', { note: R`The answer is negative because it is money you pay in today.` })] },
          { kind: 'ti', title: 'On the TI-Nspire the PV is negative', body: R`Put the amount you will **receive** in \(FV\) as a positive number and solve \(PV\).\n\nThe answer has a minus sign. That just means it is money you pay in today. Write your answer without the minus sign.`,
            ti: [TI.cmd('tvmPV', [6, 5, 0, 20000, 1, 1])] },
          { kind: 'check', gen: 'w1-g-pv' },
          { kind: 'learn', title: 'A higher rate means a smaller PV',
            body: R`If the discount rate rises, you divide by a bigger number, so the present value **falls**. Amounts far in the future shrink the most.\n\nHere is what $1,000 in 10 years is worth today.`,
            viz: { type: 'bars', fmt: '$', dp: 2, c: 1, bars: [4, 8, 12].map((p) => ({ label: 'At ' + p + '%', v: FIN.pv(1000, p / 100, 10) })), line: { v: 1000, label: '$1,000' },
              cap: R`The same \(\$1{,}000\) in 10 years. The higher the rate, the **less** it is worth today.` },
            table: { head: ['Discount rate', 'Present value'], rows: [['4%', '$675.56'], ['8%', '$463.19'], ['12%', '$321.97']] } },
          { kind: 'check', ref: 'w1-q10' },
          { kind: 'learn', title: 'Count the periods carefully',
            body: R`\(n\) is the number of periods **between** the two amounts, not the number of years from today.\n\nIf you deposit in 2027 for a goal in 2031, the money grows for \(2031 - 2027 = 4\) years. Draw a timeline with the dates to be sure.`,
            viz: { type: 'tl', n: 4, unit: ' ', labels: { 0: '2027', 1: '2028', 2: '2029', 3: '2030', 4: '2031' }, at: { 0: 'Pay in', 4: 'Goal' }, hi: [0, 4],
              spans: [{ from: 0, to: 4, label: 'n = 2031 − 2027 = 4', c: 2 }],
              cap: R`Mark both dates, then count the gaps **between** them: \(n = 4\) years here.` } },
          { kind: 'check', gen: 'w1-g-pv-date' },
          { kind: 'recap', title: 'Remember', points: [R`\(PV = \frac{FV_n}{(1 + r)^{n}}\): discounting moves money **back** in time.`, R`Higher discount rate → lower present value.`, R`\(n\) counts the periods between the two dates.`, R`On the TI-Nspire the PV comes out negative: it is money you pay in.`] },
        ],
      },
      'w1-L5': {
        title: 'Finding the time and the rate',
        goal: R`Work out how long money takes to grow, and what rate it needs, with the TI-Nspire.`,
        topics: ['solve'],
        cards: [
          { kind: 'learn', title: 'Four numbers, one equation',
            body: R`\(FV = PV(1 + r)^{n}\) links four numbers: \(PV\), \(FV\), \(r\) and \(n\).\n\nIf you know any three, you can find the fourth. You have found \(FV\) and \(PV\). Now find \(n\) (how long) and \(r\) (what rate).`,
            viz: { type: 'anatomy', key: true, tex: R`\colC{FV} = \colA{PV}\,(1 + \colB{r})^{\colD{n}}`, parts: [
              { sym: 'FV', c: 'C', say: 'future value: you can already find it' },
              { sym: 'PV', c: 'A', say: 'present value: you can already find it' },
              { sym: 'r', c: 'B', say: R`**new**: what rate?` },
              { sym: 'n', c: 'D', say: R`**new**: how long?` }],
              cap: R`One equation, four letters. Fill in any three and it gives you the fourth.` } },
          { kind: 'example', title: 'How long?', q: R`How many years does $2,000 take to grow to $3,000 at 6% p.a.?`,
            steps: [R`Set up the equation: \(2{,}000 \times 1.06^{n} = 3{,}000\), so \(1.06^{n} = 1.5\).`, R`Bring \(n\) down with logs: \(n = \frac{\ln 1.5}{\ln 1.06}\).`, R`\(n = \frac{0.405465}{0.058269} = 6.96\) years.`],
            answer: R`About \(6.96\) years.`,
            ti: [TI.solver({ I: 6, PV: -2000, Pmt: 0, FV: 3000, PpY: 1, CpY: 1 }, 'N')] },
          { kind: 'ti', title: 'Or let nSolve do the algebra', body: R`You do not have to take logs. Type the equation and name the unknown.`,
            ti: [TI.line('nSolve(2000*1.06^n=3000,n)')] },
          { kind: 'check', gen: 'w1-g-n' },
          { kind: 'example', title: 'What rate?', q: R`$5,000 today must grow to $8,000 in 7 years. What yearly rate is needed?`,
            steps: [R`Set up: \(5{,}000(1 + r)^{7} = 8{,}000\), so \((1 + r)^{7} = 1.6\).`, R`Take the 7th root: \(1 + r = 1.6^{1/7} = 1.069449\).`, R`\(r = 0.069449\), which is \(6.94\%\).`],
            answer: R`About \(6.94\%\) a year.`,
            ti: [TI.solver({ N: 7, PV: -5000, Pmt: 0, FV: 8000, PpY: 1, CpY: 1 }, 'I')] },
          { kind: 'check', gen: 'w1-g-r' },
          { kind: 'learn', title: 'The Rule of 72',
            body: R`A quick estimate: money doubles in about \(\frac{72}{r}\) years, with \(r\) as a percentage.\n\nAt 8%: \(72 \div 8 = 9\) years. The exact answer is 9.01 years. It is only an estimate, but it is great for checking your answers.`,
            viz: { type: 'lines', x: { label: 'Years at 8%', min: 0, max: 12, ticks: [0, 3, 6, 9, 12] }, y: { label: 'Times your money', fmt: 'x', min: 0.8, max: 2.6, ticks: [1, 1.5, 2, 2.5] },
              series: [{ c: 1, pts: Array.from({ length: 25 }, (_, k) => [k / 2, FIN.fvif(0.08, k / 2)]) }],
              vlines: [{ x: 72 / 8, label: '72 ÷ 8 = 9' }],
              marks: [{ x: FIN.nper(1, 2, 0.08), y: 2, label: 'Exact: ' + FIN.nper(1, 2, 0.08).toFixed(2), pos: 'left', c: 2 }],
              cap: R`The curve reaches double at **9.01** years. The rule’s quick guess, **9**, is almost spot on.` },
            formula: 'rule72' },
          { kind: 'check', ref: 'w1-q18' },
          { kind: 'recap', title: 'Remember', points: [R`Know three of \(PV\), \(FV\), \(r\), \(n\)? The Finance Solver finds the fourth.`, R`\(n = \frac{\ln(FV/PV)}{\ln(1+r)}\) and \(r = \left(\frac{FV}{PV}\right)^{1/n} - 1\).`, R`\(\text{nSolve}\) can solve the equation for you.`, R`Rule of 72: doubling time \(\approx 72 \div r\%\).`] },
        ],
      },
      'w1-L6': {
        title: 'APR and EAR',
        goal: R`Turn a quoted APR into the true yearly rate (EAR), and compare loans and savings fairly.`,
        topics: ['ear'],
        cards: [
          { kind: 'learn', title: 'Interest added more than once a year',
            body: R`Many accounts add interest monthly or quarterly. A bank might quote **12% p.a. compounded monthly**.\n\nThat means 1% is added every month (\(12\% \div 12\)). The quoted 12% is the **APR** (annual percentage rate), also called the **nominal** rate.`,
            viz: { type: 'flow', op: true, steps: [{ t: R`\(12\%\)`, s: 'the APR: quoted for a year', c: 1 }, { t: R`\(12\)`, s: 'months in a year', c: 1 }, { t: R`\(1\%\)`, s: 'added each month', c: 3 }],
              links: [R`\(\div\)`, R`\(=\)`],
              cap: R`The quoted APR is cut into 12 equal monthly slices of \(1\%\).` } },
          { kind: 'learn', title: 'Compounding inside the year',
            body: R`Because interest is added every month, later months earn interest on earlier interest.\n\nSo $100 at 12% compounded monthly grows to \(100 \times 1.01^{12} = \$112.68\) in a year, not $112.`,
            viz: { type: 'bars', fmt: '$', dp: 2, title: 'Interest on $100 in one year at 12%',
              bars: [{ label: 'Added once', v: 100 * 0.12, c: 2 }, { label: 'Added monthly', parts: [{ v: 100 * 0.12, c: 2 }, { v: FIN.fvM(100, 0.12, 12, 1) - 100 - 100 * 0.12, c: 3 }] }],
              keys: [{ c: 2, label: R`\(12\%\) of the \(\$100\)` }, { c: 3, label: 'Interest on earlier interest' }],
              cap: R`Adding monthly earns 68 cents more: early interest earns interest in the later months.` } },
          { kind: 'learn', title: 'The effective annual rate',
            body: R`The **effective annual rate** (EAR) is the true growth over a year once compounding is counted.\n\n\[EAR = \left(1 + \frac{APR}{m}\right)^{m} - 1\]\n\n\(m\) is the number of compounding periods per year: 12 for monthly, 4 for quarterly, 2 for semi-annually.`,
            viz: { type: 'anatomy', tex: R`\colC{EAR} = \left(\colA{1} + \frac{\colB{APR}}{\colD{m}}\right)^{\colD{m}} \colA{-\,1}`, parts: [
              { sym: 'EAR', c: 'C', say: 'the true growth in one year' },
              { sym: 'APR', c: 'B', say: 'the quoted yearly rate, as a decimal' },
              { sym: 'm', c: 'D', say: 'how many times a year interest is added: 12, 4 or 2' },
              { sym: '1', c: 'A', say: R`your \(\$1\): grow it for a year, then take it away` }],
              cap: R`Grow \(\$1\) for a year, then take the \(\$1\) away. The growth left over is the EAR.` },
            formula: 'ear', tip: R`12% compounded monthly has an EAR of 12.68%.` },
          { kind: 'example', title: 'Worked example', q: R`A credit card charges 18% p.a. compounded monthly. What is its EAR?`,
            steps: [R`\(APR = 0.18\) and \(m = 12\).`, R`The rate per month is \(0.18 \div 12 = 0.015\).`, R`\(EAR = 1.015^{12} - 1 = 0.195618\), which is \(19.56\%\).`],
            answer: R`The EAR is \(19.56\%\): higher than the 18% quoted.`,
            ti: [TI.cmd('eff', [18, 12])] },
          { kind: 'ti', title: 'eff and nom', body: R`\(\text{eff}(APR, m)\) turns an APR into an EAR. \(\text{nom}(EAR, m)\) turns it back. Both use percentages: type \(18\), not \(0.18\).`,
            ti: [TI.cmd('eff', [18, 12]), TI.line('nom(ans,12)')] },
          { kind: 'check', gen: 'w1-g-ear' },
          { kind: 'learn', title: 'Compare EARs, never APRs',
            body: R`Two rates with different compounding cannot be compared by their APRs. Turn each into an EAR first.\n\nA **borrower** wants the **lowest** EAR. A **saver** wants the **highest** EAR.`,
            viz: { type: 'compare', key: true, items: [
              { icon: '🏦', title: 'Loan A', big: R`EAR \(${L.pct(FIN.ear(0.12, 12))}\)`, points: [R`APR \(12\%\)`, 'added **monthly**'], c: 1, mark: 'bad', markText: 'Costs more' },
              { icon: '🏦', title: 'Loan B', big: R`EAR \(${L.pct(FIN.ear(0.125, 1), 1)}\)`, points: [R`APR \(12.5\%\)`, 'added **yearly**'], c: 2, mark: 'good', markText: 'Cheaper' }],
              cap: R`Loan A has the lower APR but the higher **EAR**. A borrower should pick Loan B.` } },
          { kind: 'check', ref: 'w1-q23' },
          { kind: 'learn', title: 'Growing money with monthly compounding',
            body: R`Use the rate per period and the number of periods:\n\n\[FV = PV\left(1 + \frac{APR}{m}\right)^{m \times n}\]\n\nIn the Finance Solver keep \(I(\%)\) as the yearly APR, set \(N = m \times n\), and set \(PpY = CpY = m\). Here: $1,000 for 5 years at 6% compounded monthly.`,
            viz: { type: 'anatomy', tex: R`\colC{FV} = \colA{PV}\left(1 + \colB{\frac{APR}{m}}\right)^{\colD{m \times n}}`, parts: [
              { sym: 'PV', c: 'A', say: R`the \(\$1{,}000\) today` },
              { sym: R`\tfrac{APR}{m}`, c: 'B', say: R`the rate for **one month**: \(6\% \div 12 = 0.5\%\)` },
              { sym: R`m \times n`, c: 'D', say: R`the number of **months**: \(12 \times 5 = 60\)` },
              { sym: 'FV', c: 'C', say: R`what it grows to: \(${L.money(FIN.fvM(1000, 0.06, 12, 5))}\)` }],
              cap: R`Count everything in months: a monthly rate and a number of months.` },
            formula: 'fv-m',
            ti: [TI.solver({ N: 60, I: 6, PV: -1000, Pmt: 0, PpY: 12, CpY: 12 }, 'FV')] },
          { kind: 'check', gen: 'w1-g-fvm' },
          { kind: 'recap', title: 'Remember', points: [R`APR = rate per period \(\times\) periods per year.`, R`\(EAR = \left(1 + \frac{APR}{m}\right)^{m} - 1\), or \(\text{eff}(APR, m)\) on the TI-Nspire.`, R`More frequent compounding → higher EAR.`, R`Compare offers using EARs. Borrowers want the lowest, savers the highest.`] },
        ],
      },
      'w1-L7': {
        title: 'Continuous compounding',
        goal: R`Grow and discount money when interest compounds continuously.`,
        topics: ['cont'],
        cards: [
          { kind: 'learn', title: 'Compounding every instant',
            body: R`What if interest were added every day, every second, or even more often? The EAR creeps up, but it stops at a limit. That limit is **continuous compounding**.\n\nIt uses the number \(e \approx 2.71828\).`,
            viz: { type: 'lines', key: true, title: R`The EAR of a \(10\%\) APR`, x: { label: 'Times a year interest is added', min: 1, max: 24, ticks: [1, 4, 12, 24] }, y: { label: 'EAR', fmt: '%', min: 9.9, max: 10.6 },
              series: [{ c: 2, dots: true, pts: [1, 2, 3, 4, 6, 12, 24].map((m) => [m, FIN.ear(0.1, m) * 100]) }],
              hlines: [{ y: FIN.earCont(0.1) * 100, label: 'Limit: ' + (FIN.earCont(0.1) * 100).toFixed(2) + '%' }],
              marks: [{ x: 1, y: FIN.ear(0.1, 1) * 100, label: 'Yearly', pos: 'right' }, { x: 12, y: FIN.ear(0.1, 12) * 100, label: 'Monthly', pos: 'below' }],
              cap: R`Adding interest more often pushes the EAR up, but it never passes the dashed **limit**.` } },
          { kind: 'learn', title: 'How far the EAR can go',
            body: R`Here is the EAR of a 10% APR for different compounding frequencies. Continuous compounding gives the highest possible EAR.`,
            table: { head: ['Compounding', 'EAR'], rows: [['Yearly (m = 1)', '10.00%'], ['Semi-annually (m = 2)', '10.25%'], ['Quarterly (m = 4)', '10.38%'], ['Monthly (m = 12)', '10.47%'], ['Daily (m = 365)', '10.52%'], ['Continuously', '10.52%']] } },
          { kind: 'learn', title: 'The formulas',
            points: [R`Future value: \(FV = C \times e^{rn}\)`, R`Present value: \(PV = \frac{C}{e^{rn}}\)`, R`Effective annual rate: \(EAR = e^{r} - 1\)`],
            body: R`\(C\) is the cash amount, \(r\) the APR as a decimal and \(n\) the number of years.`,
            viz: { type: 'anatomy', tex: R`\colC{FV} = \colA{C} \times \colE{e}^{\colB{r}\,\colD{n}}`, parts: [
              { sym: 'FV', c: 'C', say: 'what the cash grows to' },
              { sym: 'C', c: 'A', say: 'the cash amount' },
              { sym: 'e', c: 'E', say: R`the number \(e \approx 2.71828\)` },
              { sym: 'r', c: 'B', say: 'the APR, as a decimal' },
              { sym: 'n', c: 'D', say: 'the number of years' }],
              cap: R`Where \((1 + r)^{n}\) used to be, \(e^{rn}\) now does the growing. Divide by it for a PV.` },
            formula: 'cont' },
          { kind: 'example', title: 'Worked example', q: R`You invest $4,000 at 5% p.a. compounded continuously for 8 years. What will you have?`,
            steps: [R`\(FV = 4{,}000 \times e^{0.05 \times 8} = 4{,}000 \times e^{0.4}\).`, R`\(e^{0.4} = 1.491825\).`, R`\(FV = 4{,}000 \times 1.491825 = \$5{,}967.30\).`],
            answer: R`You will have \(\$5{,}967.30\).`,
            ti: [TI.line('4000*e^(0.05*8)')] },
          { kind: 'check', gen: 'w1-g-cont' },
          { kind: 'check', gen: 'w1-g-earcont' },
          { kind: 'recap', title: 'Remember', points: [R`Continuous compounding: \(FV = Ce^{rn}\), \(PV = \frac{C}{e^{rn}}\).`, R`\(EAR = e^{r} - 1\): the highest EAR any APR can give.`, R`On the TI-Nspire use the \(e^{x}\) key: \(4000 \times e^{(0.05 \times 8)}\).`] },
        ],
      },
    },

    questions: [
      /* ----- goals and decisions ----- */
      { id: 'w1-q01', topic: 'corp', kind: 'mcq', level: 1, section: 'A',
        q: R`What is the main objective of financial management in a company?`,
        choices: ['Maximise shareholder wealth (the value of the firm)', 'Maximise this year’s accounting profit', 'Maximise sales revenue', 'Minimise the company’s tax bill'],
        answer: 0,
        why: R`Managers should make decisions that increase the value of the shares. Profit or sales can rise while value falls, for example when cash arrives late or risk is high.` },
      { id: 'w1-q02', topic: 'corp', kind: 'mcq', level: 1, section: 'A',
        q: R`Deciding which long-term assets to buy, such as a new factory, is a…`,
        choices: ['Investment decision', 'Financing decision', 'Payout decision', 'Working capital decision'], answer: 0,
        why: R`The **investment decision** is about the left-hand side of the balance sheet: which real assets to own.` },
      { id: 'w1-q03', topic: 'corp', kind: 'mcq', level: 1, section: 'A',
        q: R`Choosing the mix of debt and equity that funds the firm is a…`,
        choices: ['Financing decision', 'Investment decision', 'Payout decision', 'Capital budgeting decision'], answer: 0,
        why: R`The **financing decision** is about the right-hand side of the balance sheet: how the assets are paid for.` },
      { id: 'w1-q04', topic: 'corp', kind: 'mcq', level: 2, section: 'A', src: 'MST 2026 Q6',
        q: R`In the same year, a company **issues new shares** and then **pays a special dividend**. Which pair of decisions is this?`,
        choices: ['Financing, then payout', 'Investment, then payout', 'Payout, then financing', 'Financing, then investment'], answer: 0,
        why: R`Issuing shares raises funds, which is a financing decision. Paying a special dividend returns cash, which is a payout decision.` },
      { id: 'w1-q05', topic: 'corp', kind: 'tf', level: 1, section: 'A',
        q: R`The payout decision covers how much cash to return to shareholders, how to return it, and how often.`,
        answer: true, why: R`Those are exactly the three questions in the payout (dividend) decision.` },
      { id: 'w1-q06', topic: 'corp', kind: 'mcq', level: 1, section: 'A',
        q: R`Which part of the balance sheet does the financing decision shape?`,
        choices: ['The right-hand side: liabilities and equity', 'The left-hand side: assets', 'Only current assets', 'Only retained earnings'], answer: 0,
        why: R`Financing decides the claims on the firm: debt (liabilities) and equity. Both sit on the right-hand side.` },

      /* ----- time value concepts ----- */
      { id: 'w1-q07', topic: 'tvm', kind: 'mcq', level: 1, section: 'A',
        q: R`Why is a dollar today worth more than a dollar tomorrow?`,
        choices: ['Today’s dollar can be invested to earn interest', 'Future dollars are taxed at a higher rate', 'Banks charge fees on future dollars', 'It is not: a dollar is always a dollar'], answer: 0,
        why: R`If you have the dollar now, you can invest it at rate \(r\) and hold \(1 + r\) tomorrow. That opportunity is the time value of money.` },
      { id: 'w1-q08', topic: 'tvm', kind: 'mcq', level: 1, section: 'A',
        q: R`On a timeline, what does \(t = 1\) mean?`,
        choices: ['The end of period 1, which is also the start of period 2', 'The start of period 1', 'Today', 'One day from now'], answer: 0,
        tl: { n: 3, at: { 0: 'today', 1: 'end of yr 1' }, unit: 'Year', hi: [1] },
        why: R`Tick marks sit at the ends of periods. \(t = 0\) is today, and \(t = 1\) is the end of the first period.` },
      { id: 'w1-q09', topic: 'tvm', kind: 'tf', level: 1, section: 'A',
        q: R`Holding the interest rate fixed, the future value factor \((1+r)^{n}\) gets larger as \(n\) increases.`,
        answer: true, why: R`More periods means more compounding, so \((1+r)^{n}\) grows with \(n\) whenever \(r > 0\).` },
      { id: 'w1-q10', topic: 'tvm', kind: 'mcq', level: 1, section: 'A',
        q: R`What happens to the present value of a fixed future amount when the discount rate rises?`,
        choices: ['It falls', 'It rises', 'It stays the same', 'It doubles'], answer: 0,
        why: R`\(PV = \frac{FV}{(1+r)^{n}}\). A bigger \(r\) makes the denominator bigger, so the PV falls.` },
      { id: 'w1-q11', topic: 'tvm', kind: 'mcq', level: 2, section: 'A', src: 'MST 2026 Q3',
        q: R`You will receive $1,000 at Year 1 and another $1,000 at Year 5. If the discount rate rises, what happens to the **gap** between their present values?`,
        choices: ['The gap gets bigger', 'The gap gets smaller', 'The gap stays the same', 'The Year 5 amount becomes worth more'], answer: 0,
        tl: { n: 5, at: { 1: '$1,000', 5: '$1,000' }, unit: 'Year' },
        why: R`A higher rate punishes distant cash flows more. The Year 5 PV loses a larger share of its value than the Year 1 PV, so the gap widens.`,
        steps: [R`At 5%: \(\frac{1000}{1.05} - \frac{1000}{1.05^{5}} = 952.38 - 783.53 = 168.85\).`, R`At 10%: \(\frac{1000}{1.10} - \frac{1000}{1.10^{5}} = 909.09 - 620.92 = 288.17\). The gap grew.`] },
      { id: 'w1-q12', topic: 'tvm', kind: 'tf', level: 1, section: 'A',
        q: R`In the TI-Nspire Finance Solver (and on the HP10bII+ and in Excel), money you pay out is entered as a negative number.`,
        answer: true, why: R`This is the cash flow sign convention. Money out is negative and money in is positive. Mixing signs up gives an error or a nonsense answer.` },
      { id: 'w1-q13', topic: 'tvm', kind: 'mcq', level: 1, section: 'A',
        q: R`Which of these is **not** one of the four cash flow patterns in this unit?`,
        choices: ['An amortising swap', 'A lump sum', 'An annuity', 'A perpetuity'], answer: 0,
        why: R`The four patterns are a lump sum, a mixed stream, an annuity and a perpetuity.` },
      { id: 'w1-q14', topic: 'pv', kind: 'tf', level: 1, section: 'A',
        q: R`When \(r > 0\) and \(n > 0\), the present value factor \(\frac{1}{(1+r)^{n}}\) is always less than 1.`,
        answer: true, why: R`\((1+r)^{n} > 1\), so one divided by it is below 1. A future dollar is worth less than a dollar today.` },
      { id: 'w1-q15', topic: 'fv', kind: 'mcq', level: 2, section: 'A',
        q: R`A table gives the factor for 6% and 5 years as 1.338. Using it, $1,000 grows to $1,338.00, but a calculator says $1,338.23. Why?`,
        choices: ['The table factor is rounded', 'The table assumes simple interest', 'The calculator uses monthly compounding', 'The calculator adds a fee'], answer: 0,
        why: R`The exact factor is \((1.06)^{5} = 1.3382256\). Tables round to three decimals, so small rounding errors appear.` },

      /* ----- simple interest ----- */
      { id: 'w1-q16', topic: 'simple', kind: 'mcq', level: 1, section: 'A',
        q: R`What is the key difference between simple and compound interest?`,
        choices: ['Compound interest earns interest on earlier interest', 'Simple interest is always higher', 'Compound interest ignores the principal', 'Simple interest is only used for bonds'], answer: 0,
        why: R`With compounding, each period’s interest is added to the balance and then earns interest itself.` },
      { id: 'w1-q17', topic: 'simple', kind: 'tf', level: 1, section: 'A',
        q: R`With simple interest, $1,000 at 10% p.a. earns the same $100 of interest in year 5 as in year 1.`,
        answer: true, why: R`Simple interest is always \(P \times r\) per year, so every year earns $100.` },

      /* ----- solving for n and r ----- */
      { id: 'w1-q18', topic: 'solve', kind: 'mcq', level: 1, section: 'A',
        q: R`By the Rule of 72, about how long does money take to double at 9% p.a.?`,
        choices: ['8 years', '9 years', '6.5 years', '12 years'], answer: 0, formula: 'rule72',
        why: R`\(72 \div 9 = 8\) years. (The exact answer is \(\frac{\ln 2}{\ln 1.09} = 8.04\) years.)` },
      { id: 'w1-q19', topic: 'solve', kind: 'tf', level: 2, section: 'A',
        q: R`The Rule of 72 gives the exact doubling time.`,
        answer: false, formula: 'rule72',
        why: R`It is an approximation. At 6% it says 12 years, but the exact answer is \(\frac{\ln 2}{\ln 1.06} = 11.90\) years.` },
      { id: 'w1-q20', topic: 'solve', kind: 'mcq', level: 2, section: 'A',
        q: R`To solve \(FV = PV(1+r)^{n}\) for \(n\) by hand, what do you do?`,
        choices: ['Take natural logs of both sides', 'Take the n-th root of both sides', 'Divide both sides by r', 'Multiply both sides by (1 + r)'], answer: 0, formula: 'n-solve',
        why: R`Logs bring the power down: \(\ln(FV/PV) = n \ln(1+r)\), so \(n = \frac{\ln(FV/PV)}{\ln(1+r)}\).` },
      { id: 'w1-q21', topic: 'solve', kind: 'mcq', level: 2, section: 'A',
        q: R`To solve \(FV = PV(1+r)^{n}\) for \(r\), what do you do?`,
        choices: [R`Take the \(n\)-th root: \(r = (FV/PV)^{1/n} - 1\)`, R`Take logs: \(r = \ln(FV/PV)/n\)`, R`Divide the total growth by \(n\): \(r = (FV/PV - 1)/n\)`, R`Subtract: \(r = FV - PV\)`], answer: 0, formula: 'r-solve',
        why: R`Divide by \(PV\), then raise both sides to the power \(\frac{1}{n}\), then subtract 1.` },

      /* ----- APR, EAR, compounding ----- */
      { id: 'w1-q22', topic: 'ear', kind: 'mcq', level: 1, section: 'A',
        q: R`A bank charges 1% per month on a car loan. What is the nominal annual rate (APR)?`,
        choices: ['12%', '12.68%', '1%', '11.36%'], answer: 0,
        why: R`APR = rate per period \(\times\) periods per year \(= 1\% \times 12 = 12\%\). The EAR would be \((1.01)^{12} - 1 = 12.68\%\).` },
      { id: 'w1-q23', topic: 'ear', kind: 'mcq', level: 2, section: 'A', src: 'MST 2026 Q1',
        q: R`Loan A has a **lower APR** than Loan B. Which statement is correct?`,
        choices: ['Loan A could still cost more, if it compounds more often', 'Loan A always has the lower effective cost', 'The APR already includes the effect of compounding', 'A lower APR always means a lower EAR'], answer: 0, formula: 'ear',
        why: R`The EAR depends on both the APR and how often interest compounds. More frequent compounding can push a lower APR above a higher one.` },
      { id: 'w1-q24', topic: 'ear', kind: 'tf', level: 1, section: 'A',
        q: R`For the same APR, more frequent compounding gives a higher EAR.`,
        answer: true, formula: 'ear', why: R`Interest is added sooner, so it starts earning interest sooner. Monthly beats quarterly, and daily beats monthly.` },
      { id: 'w1-q25', topic: 'ear', kind: 'mcq', level: 2, section: 'A',
        q: R`When is the EAR equal to the APR?`,
        choices: ['When interest compounds once a year', 'When interest compounds daily', 'When interest compounds continuously', 'Never'], answer: 0, formula: 'ear',
        why: R`With \(m = 1\), \(EAR = (1 + APR) - 1 = APR\).` },
      { id: 'w1-q26', topic: 'ear', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W1 Example 7',
        q: R`You are **saving** $10,000 for one year. Which account pays the most?`,
        choices: ['5.95% compounded daily', '6.00% compounded annually', '5.90% compounded monthly', '5.80% compounded continuously'], answer: 0, formula: 'ear',
        why: R`Compare EARs: daily \(\to 6.13\%\), annual \(\to 6.00\%\), monthly \(\to 6.06\%\), continuous \(\to e^{0.058} - 1 = 5.97\%\).` },
      { id: 'w1-q27', topic: 'ear', kind: 'mcq', level: 2, section: 'A',
        q: R`You are **borrowing**. Which quote is the cheapest?`,
        choices: ['12.5% compounded annually', '12% compounded monthly', '12.2% compounded quarterly', '12.1% compounded daily'], answer: 0, formula: 'ear',
        why: R`EARs: \(12.50\%\), \((1.01)^{12} - 1 = 12.68\%\), \((1.0305)^{4} - 1 = 12.77\%\), and \(\left(1+\frac{0.121}{365}\right)^{365} - 1 = 12.86\%\). The lowest EAR is cheapest.` },
      { id: 'w1-q28', topic: 'ear', kind: 'mcq', level: 2, section: 'A',
        q: R`You want to compare 4% p.a. compounded semi-annually with a rate compounded quarterly. What should you do first?`,
        choices: ['Convert both rates to EARs', 'Compare the two APRs directly', 'Double the semi-annual rate', 'Divide both rates by 12'], answer: 0, formula: 'ear',
        why: R`Rates with different compounding frequencies can only be compared on the same basis. The EAR is that common basis.` },

      /* ----- continuous ----- */
      { id: 'w1-q29', topic: 'cont', kind: 'mcq', level: 2, section: 'A',
        q: R`As compounding becomes continuous, the EAR on an APR of \(r\) approaches…`,
        choices: [R`\(e^{r} - 1\)`, R`\(r\)`, R`\((1+r)^{365} - 1\)`, R`\(\frac{r}{365}\)`], answer: 0, formula: 'cont',
        why: R`\(\left(1 + \frac{r}{m}\right)^{m} \to e^{r}\) as \(m \to \infty\), so the EAR tends to \(e^{r} - 1\).` },
      { id: 'w1-q30', topic: 'cont', kind: 'tf', level: 2, section: 'A',
        q: R`For a given APR, continuous compounding gives the highest possible EAR.`,
        answer: true, formula: 'cont', why: R`It is the limit of compounding more and more often, so no frequency can beat it.` },
    ],

    generators: [
      /* ---------- future value ---------- */
      { id: 'w1-g-fv', topic: 'fv', level: 1, section: 'B', formula: 'fv-lump',
        make(rng) {
          const who = rng.person();
          const pv = rng.step(1000, 25000, 500), r = rng.step(0.03, 0.11, 0.005), n = rng.int(3, 20);
          const fv = FIN.fv(pv, r, n);
          return {
            q: R`${who} deposits ${T.moneyT(pv)} today in an account paying ${T.pctT(r)} p.a., compounded annually. How much will be in the account after ${n} years?`,
            givens: [['PV', L.moneyT(pv)], ['r', L.pctT(r)], ['n', String(n)]],
            tl: { n, at: { 0: T.moneyT(pv), [n]: '?' }, unit: 'Year', hi: [n] },
            answer: fv, unit: '$', dp: 2,
            mistakes: [
              { v: pv * (1 + r * n), why: 'That is simple interest. Compounding also earns interest on the interest.' },
              { v: FIN.fv(pv, r, n - 1), why: `That compounds for ${n - 1} periods. From t = 0 to t = ${n} is ${n} periods.` },
              { v: FIN.pv(pv, r, n), why: 'That discounts instead of compounding. A future value is bigger than today’s amount.' },
            ],
            steps: [
              R`Money moves forward in time, so compound: \[FV_n = PV \times (1+r)^{n}\]`,
              R`\[FV_{${n}} = ${L.moneyT(pv)} \times (${L.onePlus(r)})^{${n}} = ${L.moneyT(pv)} \times ${L.numT(FIN.fvif(r, n), 6)} = ${L.money(fv)}\]`,
            ],
            calc: `${n} [N] · ${T.numT(r * 100)} [I/YR] · −${pv} [PV] · 0 [PMT] · [FV] → ${T.money(fv)}`,
            ti: [TI.solver({ N: n, I: P(r), PV: -pv, Pmt: 0, PpY: 1, CpY: 1 }, 'FV')],
            why: R`Compounding for ${n} years multiplies today’s amount by \((1+r)^{${n}}\).`,
          };
        } },
      /* ---------- present value ---------- */
      { id: 'w1-g-pv', topic: 'pv', level: 1, section: 'B', formula: 'pv-lump',
        make(rng) {
          const who = rng.person();
          const fv = rng.step(5000, 100000, 1000), r = rng.step(0.03, 0.12, 0.005), n = rng.int(2, 25);
          const pv = FIN.pv(fv, r, n);
          const goal = rng.pick(['a house deposit', 'a new car', 'a world trip', 'university fees', 'a business launch']);
          return {
            q: R`${who} wants ${T.moneyT(fv)} for ${goal} in ${n} years. The bank pays ${T.pctT(r)} p.a., compounded annually. How much must ${who} deposit today?`,
            givens: [['FV_{' + n + '}', L.moneyT(fv)], ['r', L.pctT(r)], ['n', String(n)]],
            tl: { n, at: { 0: '?', [n]: T.moneyT(fv) }, unit: 'Year', hi: [0] },
            answer: pv, unit: '$', dp: 2,
            mistakes: [
              { v: fv / (1 + r * n), why: 'That discounts with simple interest. Use (1 + r) to the power n.' },
              { v: FIN.pv(fv, r, n - 1), why: `That discounts for ${n - 1} periods instead of ${n}.` },
              { v: FIN.fv(fv, r, n), why: 'That compounds the target forward. To find today’s amount you discount.' },
            ],
            steps: [
              R`Money moves back in time, so discount: \[PV = \frac{FV_n}{(1+r)^{n}}\]`,
              R`\[PV = \frac{${L.moneyT(fv)}}{(${L.onePlus(r)})^{${n}}} = \frac{${L.moneyT(fv)}}{${L.numT(FIN.fvif(r, n), 6)}} = ${L.money(pv)}\]`,
            ],
            calc: `${n} [N] · ${T.numT(r * 100)} [I/YR] · 0 [PMT] · ${fv} [FV] · [PV] → −${T.money(pv)}`,
            ti: [TI.solver({ N: n, I: P(r), Pmt: 0, FV: fv, PpY: 1, CpY: 1 }, 'PV', { note: R`The minus sign means money you pay in today: deposit \(${L.money(pv)}\).` })],
            why: R`Discounting divides by \((1+r)^{${n}}\).`,
          };
        } },
      /* ---------- present value vs a future amount (choice) ---------- */
      { id: 'w1-g-choose', topic: 'pv', level: 2, section: 'B', formula: 'pv-lump',
        make(rng) {
          const r = rng.step(0.04, 0.12, 0.01), n = rng.int(2, 8);
          const a = rng.step(5000, 20000, 500);
          let b = Math.round(a * FIN.fvif(r, n) * rng.pick([0.9, 0.95, 1.05, 1.1]) / 100) * 100;
          const pvb = FIN.pv(b, r, n);
          const todayBetter = a > pvb;
          return {
            kind: 'mcq',
            q: R`A prize offers ${T.moneyT(a)} today **or** ${T.moneyT(b)} in ${n} years. You can invest at ${T.pctT(r)} p.a. Which is worth more?`,
            givens: [['\\text{Today}', L.moneyT(a)], ['\\text{Later}', L.moneyT(b)], ['r', L.pctT(r)], ['n', String(n)]],
            choices: [`${T.moneyT(a)} today`, `${T.moneyT(b)} in ${n} years`, 'They are worth exactly the same', 'The bigger dollar amount is always better'],
            answer: todayBetter ? 0 : 1,
            why: R`Compare values at the same time. \(PV = \frac{${L.moneyT(b)}}{(${L.onePlus(r)})^{${n}}} = ${L.money(pvb)}\), which is ${todayBetter ? 'less' : 'more'} than \(${L.moneyT(a)}\) today.`,
            steps: [R`\[PV_{later} = \frac{${L.moneyT(b)}}{(${L.onePlus(r)})^{${n}}} = ${L.money(pvb)}\]`, R`Compare with \(${L.moneyT(a)}\) today: the ${todayBetter ? 'money today' : 'later amount'} wins.`],
            ti: [TI.cmd('tvmPV', [n, P(r), 0, b, 1, 1], { note: R`Ignore the minus sign: the later prize is worth \(${L.money(pvb)}\) today.` })],
          };
        } },
      { id: 'w1-g-pv-date', topic: 'pv', level: 2, section: 'B', formula: 'pv-lump', src: 'Tutorial W1 Q3',
        make(rng) {
          const y0 = rng.int(2026, 2030), gap = rng.int(4, 7), dep = rng.int(1, 2);
          const fv = rng.step(8000, 40000, 1000), r = rng.step(0.04, 0.10, 0.005);
          const n = gap - dep;
          const pv = FIN.pv(fv, r, n);
          return {
            q: R`It is 1 July ${y0}. You need ${T.moneyT(fv)} by 1 July ${y0 + gap}. You will make a single deposit on 1 July ${y0 + dep}. The account earns ${T.pctT(r)} p.a., compounded annually. How much must you deposit?`,
            givens: [['FV', L.moneyT(fv)], ['r', L.pctT(r)], ['n', R`${y0 + gap} - ${y0 + dep} = ${n}`]],
            tl: { n: gap, at: { [dep]: '?', [gap]: T.moneyT(fv) }, unit: 'Year', hi: [dep], labels: Object.fromEntries(Array.from({ length: gap + 1 }, (_, k) => [k, String(y0 + k)])) },
            answer: pv, unit: '$', dp: 2,
            mistakes: [
              { v: FIN.pv(fv, r, gap), why: `That discounts ${gap} years back to ${y0}. The deposit is made in ${y0 + dep}, only ${n} years before the target.` },
              { v: FIN.pv(fv, r, n - 1), why: 'Count the years between the deposit date and the target date again.' },
              { v: fv / (1 + r * n), why: 'That uses simple interest.' },
            ],
            steps: [R`The deposit sits in the account from ${y0 + dep} to ${y0 + gap}: \(n = ${n}\) years.`, R`\[PV = \frac{${L.moneyT(fv)}}{(${L.onePlus(r)})^{${n}}} = ${L.money(pv)}\]`],
            calc: `${n} [N] · ${T.numT(r * 100)} [I/YR] · 0 [PMT] · ${fv} [FV] · [PV]`,
            ti: [TI.solver({ N: n, I: P(r), Pmt: 0, FV: fv, PpY: 1, CpY: 1 }, 'PV', { note: R`\(N = ${n}\): the years from the deposit to the target. The minus sign means you pay it in.` })],
            why: 'Draw the timeline first. Count periods from the deposit date, not from today.',
          };
        } },
      /* ---------- simple interest ---------- */
      { id: 'w1-g-simple', topic: 'simple', level: 1, section: 'B', formula: 'simple-int', src: 'Lecture W1 Example 1',
        make(rng) {
          const p = rng.step(10000, 80000, 5000), r = rng.step(0.04, 0.10, 0.005), d = rng.pick([30, 60, 90, 120, 180, 270]);
          const repay = p * (1 + r * d / 365);
          return {
            q: R`You borrow ${T.moneyT(p)} today and promise to repay a lump sum in ${d} days. Simple interest is charged at ${T.pctT(r)} p.a. (365-day year). How much must you repay?`,
            givens: [['P', L.moneyT(p)], ['r', L.pctT(r)], ['t', R`\frac{${d}}{365}`]],
            answer: repay, unit: '$', dp: 2,
            mistakes: [
              { v: p * r * d / 365, why: 'That is only the interest. The repayment is principal plus interest.' },
              { v: p * Math.pow(1 + r, d / 365), why: 'That compounds. The question says simple interest.' },
              { v: p * (1 + r * d / 360), why: 'That uses a 360-day year. This question uses 365 days.' },
            ],
            steps: [R`\[\text{Interest} = P \times r \times t = ${L.moneyT(p)} \times ${L.dec(r)} \times \frac{${d}}{365} = ${L.money(p * r * d / 365)}\]`, R`\[\text{Repay} = ${L.moneyT(p)} + ${L.money(p * r * d / 365)} = ${L.money(repay)}\]`],
            ti: [TI.line(`${TI.num(p)}*(1+${TI.num(r)}*${d}/365)`)],
            why: 'Simple interest: principal × rate × time, then add the principal back.',
          };
        } },
      { id: 'w1-g-simple-vs', topic: 'simple', level: 2, section: 'B', formula: 'fv-lump',
        make(rng) {
          const p = rng.step(2000, 20000, 1000), r = rng.step(0.04, 0.12, 0.01), n = rng.int(5, 20);
          const diff = p * (FIN.fvif(r, n) - (1 + r * n));
          return {
            q: R`You invest ${T.moneyT(p)} at ${T.pctT(r)} p.a. for ${n} years. How much **more** will you have with annual compounding than with simple interest?`,
            givens: [['P', L.moneyT(p)], ['r', L.pctT(r)], ['n', String(n)]],
            answer: diff, unit: '$', dp: 2,
            mistakes: [
              { v: p * FIN.fvif(r, n), why: 'That is the whole compound balance, not the difference.' },
              { v: p * (FIN.fvif(r, n) - 1), why: 'That is all the compound interest. Subtract the simple interest too.' },
              { v: p * r * n, why: 'That is the simple interest alone.' },
            ],
            steps: [R`\[\text{Compound: } ${L.moneyT(p)}(${L.onePlus(r)})^{${n}} = ${L.money(p * FIN.fvif(r, n))}\]`, R`\[\text{Simple: } ${L.moneyT(p)}(1 + ${L.dec(r)} \times ${n}) = ${L.money(p * (1 + r * n))}\]`, R`\[\text{Difference} = ${L.money(diff)}\]`],
            ti: [TI.line(`${TI.num(p)}*(1+${TI.num(r)})^${n}-${TI.num(p)}*(1+${TI.num(r)}*${n})`)],
            why: 'The difference is the interest earned on interest.',
          };
        } },
      /* ---------- solving for n ---------- */
      { id: 'w1-g-n', topic: 'solve', level: 2, section: 'B', formula: 'n-solve', src: 'Lecture W1 Example 4',
        make(rng) {
          const pv = rng.step(2000, 20000, 1000), mult = rng.pick([1.5, 2, 2.5, 3, 4]), r = rng.step(0.04, 0.12, 0.005);
          const fv = pv * mult;
          const n = FIN.nper(pv, fv, r);
          const days = Math.round((n - Math.floor(n)) * 365);
          return {
            q: R`You deposit ${T.moneyT(pv)} at ${T.pctT(r)} p.a., compounded annually. How many years until it grows to ${T.moneyT(fv)}?`,
            givens: [['PV', L.moneyT(pv)], ['FV', L.moneyT(fv)], ['r', L.pctT(r)]],
            answer: n, unit: 'yrs', dp: 2,
            mistakes: [
              { v: (mult - 1) / r, why: 'That assumes simple interest. With compounding it takes less time.' },
              { v: Math.log(mult) / r, why: R`Close, but divide by \(\ln(1+r)\), not by \(r\).` },
              { v: Math.log(mult) / Math.log(1 + r) + 1, why: 'Check your working: no extra period is needed.' },
            ],
            steps: [
              R`\[${L.moneyT(fv)} = ${L.moneyT(pv)}(${L.onePlus(r)})^{n} \;\Rightarrow\; (${L.onePlus(r)})^{n} = ${L.numT(mult, 4)}\]`,
              R`\[n = \frac{\ln(${L.numT(mult, 4)})}{\ln(${L.onePlus(r)})} = \frac{${L.numT(Math.log(mult), 4)}}{${L.numT(Math.log(1 + r), 4)}} = ${L.num(n, 2)} \text{ years}\]`,
              R`That is about ${Math.floor(n)} years and ${days} days.`,
            ],
            calc: `${T.numT(r * 100)} [I/YR] · −${pv} [PV] · 0 [PMT] · ${fv} [FV] · [N] → ${T.num(n)}`,
            ti: [TI.solver({ I: P(r), PV: -pv, Pmt: 0, FV: fv, PpY: 1, CpY: 1 }, 'N')],
            why: 'Take logs to bring the power n down.',
          };
        } },
      { id: 'w1-g-double', topic: 'solve', level: 2, section: 'B', formula: 'n-solve', src: 'Tutorial W1 Q2',
        make(rng) {
          const r = rng.step(0.03, 0.12, 0.01), k = rng.pick([2, 3, 4]);
          const word = { 2: 'double', 3: 'triple', 4: 'quadruple' }[k];
          const n = Math.log(k) / Math.log(1 + r);
          return {
            q: R`At ${T.pctT(r)} p.a. compounded annually, exactly how long does it take to **${word}** your money?`,
            givens: [['FV/PV', String(k)], ['r', L.pctT(r)]],
            answer: n, unit: 'yrs', dp: 2,
            mistakes: [
              { v: (k - 1) / r, why: 'That is the simple-interest answer.' },
              { v: (72 / (r * 100)) * (k === 2 ? 1 : k === 4 ? 2 : 1.585), why: 'That is a Rule-of-72 style estimate, not the exact answer.' },
              { v: Math.log(k) / r, why: R`Divide by \(\ln(1+r)\), not by \(r\).` },
            ],
            steps: [R`\[(${L.onePlus(r)})^{n} = ${k} \;\Rightarrow\; n = \frac{\ln ${k}}{\ln ${L.onePlus(r)}} = ${L.num(n, 2)} \text{ years}\]`],
            calc: `${T.numT(r * 100)} [I/YR] · −1 [PV] · 0 [PMT] · ${k} [FV] · [N]`,
            ti: [TI.solver({ I: P(r), PV: -1, Pmt: 0, FV: k, PpY: 1, CpY: 1 }, 'N')],
            why: `Any starting amount works, so use PV = 1 and FV = ${k}.`,
          };
        } },
      { id: 'w1-g-72', topic: 'solve', level: 1, section: 'B', formula: 'rule72',
        make(rng) {
          const r = rng.pick([2, 3, 4, 4.5, 6, 8, 9, 12]);
          const a = 72 / r;
          return {
            q: R`Use the **Rule of 72** to estimate how many years it takes to double your money at ${T.numT(r)}% p.a.`,
            givens: [['r', r + '\\%']],
            answer: a, unit: 'yrs', dp: 1, tol: 0.051,
            mistakes: [
              { v: 144 / r, why: 'That is about the time to quadruple (two doublings).' },
              { v: 36 / r, why: 'Divide 72 by the rate, not 36.' },
              { v: 100 / r, why: 'The rule uses 72, not 100.' },
            ],
            steps: [R`\[\text{Years} \approx \frac{72}{${T.numT(r)}} = ${L.numT(a, 2)}\]`, R`The exact answer is \(\frac{\ln 2}{\ln(1 + ${L.dec(r / 100)})} = ${L.num(Math.log(2) / Math.log(1 + r / 100), 2)}\) years.`],
            ti: [TI.line(`72/${TI.num(r)}`)],
            why: 'Rule of 72: years to double ≈ 72 ÷ the rate in percent.',
          };
        } },
      /* ---------- solving for r ---------- */
      { id: 'w1-g-r', topic: 'solve', level: 2, section: 'B', formula: 'r-solve', src: 'Lecture W1 Example 5',
        make(rng) {
          const pv = rng.step(1000, 20000, 500), n = rng.int(3, 25), r = rng.step(0.03, 0.16, 0.0025);
          const fv = Math.round(FIN.fv(pv, r, n) / 100) * 100;
          const rr = FIN.rate(pv, fv, n);
          const goal = rng.pick(['university fees', 'a new car', 'a house deposit', 'a round-the-world trip']);
          return {
            q: R`You have ${T.moneyT(pv)} today and need ${T.moneyT(fv)} for ${goal} in ${n} years. What annual rate of return (compounded annually) must you earn?`,
            givens: [['PV', L.moneyT(pv)], ['FV', L.moneyT(fv)], ['n', String(n)]],
            answer: P(rr), unit: '%', dp: 2,
            mistakes: [
              { v: P((fv / pv - 1) / n), why: 'That is the simple average growth. Compounding needs the n-th root.' },
              { v: P(Math.log(fv / pv) / n), why: 'That is a continuously compounded rate, not an annual one.' },
              { v: P(Math.pow(fv / pv, 1 / (n - 1)) - 1), why: `That uses ${n - 1} periods instead of ${n}.` },
            ],
            steps: [R`\[r = \left(\frac{FV}{PV}\right)^{1/n} - 1 = \left(\frac{${L.moneyT(fv)}}{${L.moneyT(pv)}}\right)^{1/${n}} - 1\]`, R`\[r = (${L.numT(fv / pv, 6)})^{${L.numT(1 / n, 6)}} - 1 = ${L.pct(rr, 2)}\]`],
            calc: `${n} [N] · −${pv} [PV] · 0 [PMT] · ${fv} [FV] · [I/YR] → ${T.num(rr * 100)}`,
            ti: [TI.solver({ N: n, PV: -pv, Pmt: 0, FV: fv, PpY: 1, CpY: 1 }, 'I')],
            why: 'Divide, take the n-th root, subtract 1.',
          };
        } },
      { id: 'w1-g-r-date', topic: 'solve', level: 2, section: 'B', formula: 'r-solve', src: 'Tutorial W1 Q3',
        make(rng) {
          const y0 = rng.int(2026, 2030), gap = rng.int(4, 8), rec = 1;
          const n = gap - rec;
          const target = rng.step(8000, 30000, 1000);
          const gift = Math.round(target * rng.pick([0.6, 0.65, 0.7, 0.75, 0.8]) / 100) * 100;
          const rr = FIN.rate(gift, target, n);
          return {
            q: R`It is 1 July ${y0}. You need ${T.moneyT(target)} by 1 July ${y0 + gap}. A relative will give you ${T.moneyT(gift)} on 1 July ${y0 + rec}. What annual rate must you earn on the gift to reach your target?`,
            givens: [['PV', L.moneyT(gift)], ['FV', L.moneyT(target)], ['n', R`${y0 + gap} - ${y0 + rec} = ${n}`]],
            tl: { n: gap, at: { [rec]: T.moneyT(gift), [gap]: T.moneyT(target) }, unit: 'Year', hi: [rec, gap], labels: Object.fromEntries(Array.from({ length: gap + 1 }, (_, k) => [k, String(y0 + k)])) },
            answer: P(rr), unit: '%', dp: 2,
            mistakes: [
              { v: P(FIN.rate(gift, target, gap)), why: `That uses ${gap} years. The gift only arrives in ${y0 + rec}, leaving ${n} years.` },
              { v: P((target / gift - 1) / n), why: 'That is simple growth per year. Use the n-th root.' },
            ],
            steps: [R`The money grows from ${y0 + rec} to ${y0 + gap}: \(n = ${n}\).`, R`\[r = \left(\frac{${L.moneyT(target)}}{${L.moneyT(gift)}}\right)^{1/${n}} - 1 = ${L.pct(rr, 2)}\]`],
            calc: `${n} [N] · −${gift} [PV] · 0 [PMT] · ${target} [FV] · [I/YR]`,
            ti: [TI.solver({ N: n, PV: -gift, Pmt: 0, FV: target, PpY: 1, CpY: 1 }, 'I')],
            why: 'The clock starts when the money arrives.',
          };
        } },
      /* ---------- compounding frequency, APR and EAR ---------- */
      { id: 'w1-g-fvm', topic: 'ear', level: 2, section: 'B', formula: 'fv-m', src: 'Lecture W1 Example 6',
        make(rng) {
          const f = rng.pick(FREQ.slice(0, 3));
          const pv = rng.step(500, 50000, 500), apr = rng.step(0.03, 0.12, 0.005), yrs = rng.int(2, 15);
          const fv = FIN.fvM(pv, apr, f.m, yrs);
          return {
            q: R`A bank pays ${T.pctT(apr)} p.a. compounded ${f.word}. If you deposit ${T.moneyT(pv)}, how much will you have after ${yrs} years?`,
            givens: [['PV', L.moneyT(pv)], ['APR', L.pctT(apr)], ['m', String(f.m)], ['n', String(yrs)]],
            answer: fv, unit: '$', dp: 2,
            mistakes: [
              { v: FIN.fv(pv, apr, yrs), why: 'That compounds once a year. This account compounds ' + f.word + '.' },
              { v: pv * Math.pow(1 + apr / f.m, yrs), why: `Use m × n = ${f.m * yrs} periods, not ${yrs}.` },
              { v: FIN.fvM(pv, apr, f.m === 12 ? 4 : 12, yrs), why: `That uses the wrong compounding frequency. This account compounds ${f.word} (m = ${f.m}).` },
            ],
            steps: [R`\[FV = PV\left(1 + \frac{APR}{m}\right)^{m \times n}\]`, R`\[FV = ${L.moneyT(pv)}\left(1 + \frac{${L.dec(apr)}}{${f.m}}\right)^{${f.m} \times ${yrs}} = ${L.moneyT(pv)}(${L.numT(1 + apr / f.m, 8)})^{${f.m * yrs}} = ${L.money(fv)}\]`],
            calc: `${f.m * yrs} [N] · ${T.numT((apr * 100) / f.m, 6)} [I/YR] · −${pv} [PV] · 0 [PMT] · [FV]`,
            ti: [TI.solver({ N: f.m * yrs, I: P(apr), PV: -pv, Pmt: 0, PpY: f.m, CpY: f.m }, 'FV', { note: R`\(N = ${f.m} \times ${yrs} = ${f.m * yrs}\) periods. \(I(\%)\) stays the yearly APR; \(PpY = CpY = ${f.m}\) tells the solver to compound ${f.word}.` })],
            why: `Rate per period = APR ÷ ${f.m}; number of periods = ${f.m} × ${yrs}.`,
          };
        } },
      { id: 'w1-g-ear', topic: 'ear', level: 1, section: 'B', formula: 'ear', src: 'Tutorial W1 Q4',
        make(rng) {
          const f = rng.pick(FREQ), apr = rng.step(0.03, 0.20, 0.0025);
          const ear = FIN.ear(apr, f.m);
          return {
            q: R`A lender quotes ${T.pctT(apr)} p.a. compounded ${f.word}. What is the effective annual rate (EAR)?`,
            givens: [['APR', L.pctT(apr)], ['m', String(f.m)]],
            answer: P(ear), unit: '%', dp: 2,
            mistakes: [
              { v: P(apr), why: 'That is the APR. The EAR is higher whenever interest compounds more than once a year.' },
              { v: P(f.m * (Math.pow(1 + apr, 1 / f.m) - 1)), why: 'That converts the wrong way (EAR back to APR).' },
              { v: P(Math.pow(1 + apr / f.m, f.m + 1) - 1), why: `Raise to the power m = ${f.m}.` },
            ],
            steps: [R`\[EAR = \left(1 + \frac{APR}{m}\right)^{m} - 1 = \left(1 + \frac{${L.dec(apr)}}{${f.m}}\right)^{${f.m}} - 1 = ${L.pct(ear, 4)}\]`],
            calc: `${T.numT(apr * 100)} [NOM%] · ${f.m} [P/YR] · [EFF%] → ${T.num(ear * 100, 4)}`,
            ti: [TI.cmd('eff', [P(apr), f.m])],
            why: 'EAR is the true yearly rate once compounding is counted.',
          };
        } },
      { id: 'w1-g-card', topic: 'ear', level: 1, section: 'B', formula: 'ear',
        make(rng) {
          const monthly = rng.step(0.008, 0.025, 0.001);
          const askEar = rng.chance(0.5);
          const apr = monthly * 12, ear = Math.pow(1 + monthly, 12) - 1;
          return {
            q: R`A credit card charges ${T.pctT(monthly)} per month. What is its ${askEar ? '**effective annual rate (EAR)**' : '**nominal annual rate (APR)**'}?`,
            givens: [['r_{month}', L.pctT(monthly)], ['m', '12']],
            answer: P(askEar ? ear : apr), unit: '%', dp: 2,
            mistakes: askEar
              ? [{ v: P(apr), why: 'That is the APR (1.x% × 12). The EAR compounds the monthly rate.' }, { v: P(monthly), why: 'That is the monthly rate.' }]
              : [{ v: P(ear), why: 'That is the EAR. The APR is simply the monthly rate × 12.' }, { v: P(monthly), why: 'That is the monthly rate.' }],
            steps: askEar ? [R`\[EAR = (1 + ${L.dec(monthly)})^{12} - 1 = ${L.pct(ear, 4)}\]`] : [R`\[APR = ${L.pctT(monthly)} \times 12 = ${L.pct(apr, 2)}\]`],
            ti: askEar ? [TI.cmd('eff', [P(apr), 12])] : [TI.line(`${TI.num(P(monthly))}*12`)],
            why: 'APR = rate per period × periods per year. EAR compounds it.',
          };
        } },
      { id: 'w1-g-compare', topic: 'ear', level: 2, section: 'B', formula: 'ear', src: 'MST 2026 Q11',
        make(rng) {
          for (let k = 0; k < 50; k++) {
            const fa = rng.pick(FREQ), fb = rng.pick(FREQ.concat([{ m: 1, word: 'annually' }]));
            const aprA = rng.step(0.06, 0.14, 0.001);
            const aprB = aprA + rng.pick([-0.002, -0.001, 0.001, 0.002, 0.003]);
            const eA = FIN.ear(aprA, fa.m), eB = FIN.ear(aprB, fb.m);
            if (fa.m === fb.m || Math.abs(eA - eB) < 0.0003) continue;
            const saver = rng.chance(0.4);
            const bestA = saver ? eA > eB : eA < eB;
            return {
              kind: 'mcq',
              q: R`${saver ? 'You want to **save**.' : 'You want to **borrow**.'} Offer A: ${T.pctT(aprA)} p.a. compounded ${fa.word}. Offer B: ${T.pctT(aprB)} p.a. compounded ${fb.word}. Which offer is better for you?`,
              givens: [['APR_A', L.pctT(aprA)], ['m_A', String(fa.m)], ['APR_B', L.pctT(aprB)], ['m_B', String(fb.m)]],
              choices: ['Offer A', 'Offer B', 'They are equally good', 'You cannot compare different compounding frequencies'],
              answer: bestA ? 0 : 1,
              why: R`Compare EARs: \(EAR_A = ${L.pct(eA, 3)}\) and \(EAR_B = ${L.pct(eB, 3)}\). A ${saver ? 'saver wants the higher' : 'borrower wants the lower'} EAR.`,
              steps: [R`\[EAR_A = \left(1 + \frac{${L.dec(aprA)}}{${fa.m}}\right)^{${fa.m}} - 1 = ${L.pct(eA, 3)}\]`, R`\[EAR_B = \left(1 + \frac{${L.dec(aprB)}}{${fb.m}}\right)^{${fb.m}} - 1 = ${L.pct(eB, 3)}\]`],
              ti: [TI.cmd('eff', [P(aprA), fa.m], { note: 'Offer A’s EAR (%).' }), TI.cmd('eff', [P(aprB), fb.m], { note: 'Offer B’s EAR (%).' })],
            };
          }
          return null;
        } },
      /* ---------- continuous ---------- */
      { id: 'w1-g-cont', topic: 'cont', level: 2, section: 'B', formula: 'cont', src: 'Lecture W1 Examples 8–9',
        make(rng) {
          const c = rng.step(1000, 20000, 500), r = rng.step(0.03, 0.12, 0.005), n = rng.int(2, 15);
          if (rng.chance(0.5)) {
            const fv = FIN.fvCont(c, r, n);
            return {
              q: R`You invest ${T.moneyT(c)} at ${T.pctT(r)} p.a. compounded **continuously**. What is the balance after ${n} years?`,
              givens: [['C', L.moneyT(c)], ['r', L.pctT(r)], ['n', String(n)]],
              answer: fv, unit: '$', dp: 2,
              mistakes: [{ v: FIN.fv(c, r, n), why: 'That is annual compounding. Continuous compounding uses e to the power rn.' }, { v: c * (1 + r * n), why: 'That is simple interest.' }, { v: c * Math.exp(r) * n, why: 'The exponent is r × n.' }],
              steps: [R`\[FV = C \times e^{rn} = ${L.moneyT(c)} \times e^{${L.dec(r)} \times ${n}} = ${L.moneyT(c)} \times ${L.numT(Math.exp(r * n), 6)} = ${L.money(fv)}\]`],
              ti: [TI.line(`${TI.num(c)}*e^(${TI.num(r)}*${n})`)],
              why: 'Continuous compounding: FV = C·e^(rn).',
            };
          }
          const pv = FIN.pvCont(c, r, n);
          return {
            q: R`You want ${T.moneyT(c)} in ${n} years. The account pays ${T.pctT(r)} p.a. compounded **continuously**. How much must you deposit today?`,
            givens: [['FV', L.moneyT(c)], ['r', L.pctT(r)], ['n', String(n)]],
            answer: pv, unit: '$', dp: 2,
            mistakes: [{ v: FIN.pv(c, r, n), why: 'That discounts with annual compounding.' }, { v: c / (1 + r * n), why: 'That is simple interest.' }],
            steps: [R`\[PV = \frac{C}{e^{rn}} = \frac{${L.moneyT(c)}}{e^{${L.dec(r)} \times ${n}}} = \frac{${L.moneyT(c)}}{${L.numT(Math.exp(r * n), 6)}} = ${L.money(pv)}\]`],
            ti: [TI.line(`${TI.num(c)}/e^(${TI.num(r)}*${n})`)],
            why: 'Continuous discounting divides by e^(rn).',
          };
        } },
      { id: 'w1-g-earcont', topic: 'cont', level: 2, section: 'B', formula: 'cont',
        make(rng) {
          const apr = rng.step(0.03, 0.15, 0.005);
          const ear = Math.exp(apr) - 1;
          return {
            q: R`What is the EAR of ${T.pctT(apr)} p.a. compounded **continuously**?`,
            givens: [['APR', L.pctT(apr)]],
            answer: P(ear), unit: '%', dp: 2,
            mistakes: [{ v: P(apr), why: 'That is the APR.' }, { v: P(FIN.ear(apr, 12)), why: 'That is monthly compounding. Continuous is slightly higher.' }, { v: P(FIN.ear(apr, 2)), why: 'That is semi-annual compounding.' }],
            steps: [R`\[EAR = e^{APR} - 1 = e^{${L.dec(apr)}} - 1 = ${L.pct(ear, 4)}\]`],
            ti: [TI.line(`e^(${TI.num(apr)})-1`, { pct: true })],
            why: 'The limit of compounding infinitely often.',
          };
        } },
      /* ---------- boss-level multi-step ---------- */
      { id: 'w1-g-equiv', topic: 'ear', level: 3, section: 'B', formula: 'ear', boss: true,
        make(rng) {
          const pair = rng.pick([[2, 4], [2, 12], [4, 12], [12, 4], [12, 2], [4, 2]]);
          const f1 = FREQ.find((f) => f.m === pair[0]), f2 = FREQ.find((f) => f.m === pair[1]);
          const apr1 = rng.step(0.03, 0.12, 0.005);
          const ear = FIN.ear(apr1, f1.m);
          const apr2 = FIN.aprFromEar(ear, f2.m);
          return {
            q: R`A bank quotes ${T.pctT(apr1)} p.a. compounded ${f1.word}. What APR compounded **${f2.word}** gives exactly the same EAR? (Answer to 4 decimal places.)`,
            givens: [['APR_1', L.pctT(apr1)], ['m_1', String(f1.m)], ['m_2', String(f2.m)]],
            answer: P(apr2), unit: '%', dp: 4, tol: 0.0006,
            mistakes: [{ v: P(apr1), why: 'Same APR with a different frequency gives a different EAR.' }, { v: P(ear), why: 'That is the EAR itself. Convert it back into an APR with m = ' + f2.m + '.' }, { v: P(apr1 * f2.m / f1.m), why: 'Rates do not scale with the number of periods like that.' }],
            steps: [R`Step 1, find the EAR: \[EAR = \left(1 + \frac{${L.dec(apr1)}}{${f1.m}}\right)^{${f1.m}} - 1 = ${L.pct(ear, 6)}\]`, R`Step 2, turn it back into an APR with \(m = ${f2.m}\): \[APR = ${f2.m}\left[(1 + EAR)^{1/${f2.m}} - 1\right] = ${L.pct(apr2, 4)}\]`],
            ti: [TI.cmd('eff', [P(apr1), f1.m], { note: 'The EAR, in %.' }), TI.line(`nom(ans,${f2.m})`)],
            why: 'Go through the EAR: it is the common currency of interest rates.',
          };
        } },
      { id: 'w1-g-t6', topic: 'ear', level: 3, section: 'B', formula: 'ear', boss: true, src: 'Tutorial W1 Q6',
        make(rng) {
          const p = rng.step(2000, 20000, 1000), apr = rng.step(0.02, 0.08, 0.005);
          const ear = FIN.ear(apr, 2);
          const aprQ = FIN.aprFromEar(ear, 4);
          const bal = p * (1 + aprQ / 4);
          return {
            q: R`You deposit ${T.moneyT(p)} at ${T.pctT(apr)} p.a., compounded semi-annually. Three months later, what is the theoretical balance if interest were compounded quarterly at the **equivalent** rate?`,
            givens: [['PV', L.moneyT(p)], ['APR_{semi}', L.pctT(apr)]],
            answer: bal, unit: '$', dp: 2,
            mistakes: [{ v: p * (1 + apr / 4), why: 'That uses the semi-annual APR divided by 4. First find the equivalent quarterly APR.' }, { v: p * (1 + apr / 2), why: 'That is six months of interest, not three.' }, { v: p * (1 + ear / 4), why: 'Dividing the EAR by 4 does not give a quarterly rate.' }],
            steps: [R`\[EAR = \left(1 + \frac{${L.dec(apr)}}{2}\right)^{2} - 1 = ${L.pct(ear, 4)}\]`, R`\[APR_{quarterly} = 4\left[(1 + EAR)^{1/4} - 1\right] = ${L.pct(aprQ, 4)}\]`, R`\[FV = ${L.moneyT(p)}\left(1 + \frac{${L.pct(aprQ, 4)}}{4}\right)^{1} = ${L.money(bal)}\]`],
            ti: [TI.cmd('eff', [P(apr), 2]), TI.line('nom(ans,4)', { note: 'The equivalent quarterly APR, in %.' }), TI.line(`${TI.num(p)}*(1+ans/400)`)],
            why: 'Convert through the EAR, then compound one quarter.',
          };
        } },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
