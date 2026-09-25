/* Floor 7 — Week 8: Working capital management. */
(function (root) {
  'use strict';
  const { FIN, L, T, FMT, TI } = root;
  const R = String.raw;
  const P = (r) => +(r * 100).toFixed(8); // decimal rate -> percent units for answers
  const K = (x, dp = 4) => String(+(+x).toFixed(dp)); // calculator keystroke number (no commas)
  const tn = (x) => TI.num(x); // a number as typed on the TI-Nspire (no commas, at most 6 decimals)
  const plus = (x) => (x < 0 ? `-${tn(-x)}` : `+${tn(x)}`); // "+5" or "-5" inside a typed line
  // TI-Nspire line for the cost of forgoing a discount: (1+d/(100-d))^(year/(net-discount days))-1, a decimal rate
  const earTI = (d, x, y, yr = 365, note) => TI.line(`(1+${K(d * 100)}/${K(100 - d * 100)})^(${yr}/(${y}-${x}))-1`, { pct: true, note: note || 'The result is a decimal. Times 100 gives the percentage.' });

  /* ---------- local helpers ---------- */
  const pct = (p) => T.pctT(p); // 0.15 -> "15%"
  const whole = (x) => Math.abs(x - Math.round(x)) < 0.005;
  const LM = (x, dp = 2) => (dp > 0 && whole(x) ? L.moneyT(Math.round(x)) : L.money(x, dp)); // money in working lines
  const mil = (x) => `${x < 0 ? '−' : ''}$${T.numT(Math.abs(x), 2)}m`; // plain-text $m amount
  const milL = (x) => R`${x < 0 ? '-' : ''}\$${L.numT(Math.abs(x), 2)}\text{m}`; // LaTeX $m amount, sign first
  const ear = (d, x, y, yr = 365) => FIN.tradeCreditEAR(d, x, y, yr); // cost of forgoing the discount
  const terms = (d, x, y) => `${K(d * 100)}/${x}, net ${y}`; // "2/10, net 30"
  // LaTeX working for the trade-credit EAR
  const earTex = (d, x, y, yr = 365) => R`\left(1 + \frac{${K(d * 100)}}{${K(100 - d * 100)}}\right)^{\frac{${yr}}{${y} - ${x}}} - 1`;
  const earCalc = (d, x, y, yr = 365) => `${K(yr / (y - x), 6)} [N] · ${K((100 * d) / (1 - d), 6)} [I/YR] · −1 [PV] · 0 [PMT] · [FV] → ${K(1 + ear(d, x, y, yr), 6)}; EAR = FV − 1`;
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

  /* ---------- lecture, tutorial and task-sheet examples, computed once ---------- */
  const SIFTY = (() => {
    const sales = 3635, cogs = 3257;
    const inv = FIN.invDays(420, cogs), ar = FIN.arDays(432, sales), ap = FIN.apDays(272, cogs);
    const invA = FIN.invDays(405, cogs), arA = FIN.arDays(417.5, sales), apA = FIN.apDays(260.5, cogs);
    return { sales, cogs, inv, ar, ap, ccc: FIN.ccc(inv, ar, ap), cccAvg: FIN.ccc(invA, arA, apA),
      cccAddAP: inv + ar + ap, cccSales: FIN.ccc(FIN.invDays(420, sales), ar, FIN.apDays(272, sales)) };
  })();
  const COA = (() => {
    const sales = 35, cogs = 20;
    const ar = FIN.arDays(4.2, sales), ap = FIN.apDays(1.8, cogs), inv = FIN.invDays(3, cogs);
    return { ar, ap, inv, ccc: FIN.ccc(inv, ar, ap), op: inv + ar,
      cccSales: FIN.ccc(FIN.invDays(3, sales), ar, FIN.apDays(1.8, sales)), cccCogs: FIN.ccc(inv, FIN.arDays(4.2, cogs), ap) };
  })();
  const COB_AR = FIN.arDays(4, 37), COC_AP = FIN.apDays(2.2, 24);
  const EMERALD = (() => {
    const r = 0.12, g = 0.04;
    const fcf0 = 20e6 + 5e6 - 5e6 - 1e6, fcf1 = 20e6 + 5e6 - 5e6 - 0.8e6;
    return { fcf0, fcf1, v0: FIN.pvGrowPerp(fcf0, r, g), v1: FIN.pvGrowPerp(fcf1, r, g) };
  })();
  const CREDIT = (() => {
    const r = 0.01;
    const net0 = -500 * 60 + 250 * 99, credit = 250 * 100; // current: -$5,250 now, $25,000 of credit sales a month later
    const cur = net0 + (credit + net0) / r;
    const net0n = -480 * 60, creditN = 480 * 100; // new: no discount, 480 units, all paid in 30 days
    const nw = net0n + (creditN + net0n) / r;
    return { net0, credit, cur, net0n, creditN, nw, sw: nw - cur };
  })();
  const UWE = 250000 / 14000;

  root.registerPack({
    id: 'w8', floor: 7, week: 'Week 8',
    title: 'The Working Capital Warehouse',
    topic: 'Working capital management',
    color: '#b8860b', icon: '📦',
    intro: 'Welcome to the Warehouse. Every box on these shelves is cash that is not working. Speed up the cycle and free the cash.',

    briefing: [
      { h: 'Net working capital', points: [
        R`\[NWC = \text{Current assets} - \text{Current liabilities}\]`,
        R`Current assets: **cash**, **inventory** and **accounts receivable** (credit sales that customers still owe).`,
        R`Current liabilities: **accounts payable** (credit purchases owed to suppliers) and other short-term bills.`,
        R`Working capital ties up cash: \(FCF = \text{Net income} + Dep - CapEx - \Delta NWC\).`,
        R`A smaller increase in NWC means more FCF, and a higher firm value.`,
      ] },
      { h: 'Why it matters: Emerald City Paints', points: [
        R`Next year: net income $20m, depreciation $5m, capital expenditure $5m, increase in working capital $1m. So \(FCF_1 = \$19\text{m}\), growing at 4% a year. \(r = 12\%\).`,
        R`\[V = \frac{FCF_1}{r - g} = \frac{19{,}000{,}000}{0.12 - 0.04} = \$237.5\text{m}\]`,
        R`Cut the yearly increase in working capital by 20% (to $800,000): \(V = \frac{19{,}200{,}000}{0.08} = \$240\text{m}\).`,
        R`A $200,000 yearly saving adds **$2.5m** of value, because the saving grows forever.`,
      ] },
      { h: 'Operating cycle, cash cycle and CCC', points: [
        R`**Operating cycle**: from buying inventory to receiving the cash from its sale. It equals inventory days + A/R days.`,
        R`**Cash cycle**: from **paying cash** for inventory to receiving cash from the sale. Buying on credit shortens it.`,
        R`\[CCC = \text{Inventory days} + \text{A/R days} - \text{A/P days}\]`,
        R`Inventory days and A/P days use average daily **COGS** \(= \frac{COGS}{365}\). A/R days use average daily **sales** \(= \frac{Sales}{365}\).`,
        R`Shorter is better: less cash is tied up. Woolworths (2012): \(33.2 + 1.4 - 46.0 = -11.4\) days. It is paid by customers before it pays its suppliers.`,
        R`Airlines tend to have the lowest CCC. Construction is at the other extreme.`,
      ] },
      { h: 'Trade credit terms', points: [
        R`“**2/10, net 30**”: take a 2% discount if you pay within 10 days. Otherwise pay the full amount by day 30.`,
        R`Skipping the discount is a loan. You pay $100 on day 30 instead of $98 on day 10: you borrow $98 for 20 days at \(\frac{2}{98} = 2.04\%\).`,
        R`\[EAR = \left(1 + \frac{d}{1-d}\right)^{\frac{365}{\text{net} - \text{discount days}}} - 1\]`,
        R`2/10, net 30: \((1.0204)^{365/20} - 1 = 44.6\%\). 3/10, net 40: 44.86%.`,
        R`Use a 365-day year unless the question says 360.`,
      ] },
      { h: 'Take the discount or not?', points: [
        R`Trade-credit EAR **above** the bank rate: take the discount. Borrow from the bank and pay on the **last discount day**.`,
        R`Trade-credit EAR **below** the bank rate: forgo the discount. Pay on the **last day** of the net period.`,
        R`Never pay between the two dates. You lose the discount **and** days of free credit.`,
        R`Uwe (2/15, net 40): A/P days \(= \frac{250{,}000}{14{,}000} = 17.9\). It misses the discount by 3 days and gives up 22 days of credit.`,
        R`**Stretching** means paying after the due date. 1/15, net 40 costs 15.80%, but paying on day 60 costs 8.49%. Risks: cash-on-delivery terms, a lost supplier, a poor credit rating.`,
      ] },
      { h: 'Receivables and offering credit', points: [
        R`Watch receivables with **A/R days**, an **ageing schedule** (accounts grouped by how long they have been unpaid) and **payment patterns** (the % of each month’s sales collected in later months).`,
        R`To judge a credit policy, compare the NPVs of its monthly cash flows. Lecture: keeping the 1% cash discount (NPV $1,969,750) beats dropping it (NPV $1,891,200).`,
      ] },
      { h: 'Inventory and cash', points: [
        R`Inventory prevents **stock-outs**. But too much inventory costs money: acquisition and order costs, and **carrying costs**.`,
        R`**Just-in-time (JIT)**: buy inventory exactly when it is needed, so the balance stays near zero.`,
        R`Cash earns little or no interest. Firms hold it for **day-to-day needs**, a **precautionary balance** and a **compensating balance** (a bank requirement).`,
        R`Spare cash can go into short-term government debt or bank-accepted bills.`,
      ] },
    ],

    topics: {
      nwc: 'Net working capital and firm value',
      cycle: 'Operating cycle and cash cycle',
      ccc: 'Cash conversion cycle',
      terms: 'Trade credit terms',
      tcost: 'Cost of trade credit (EAR)',
      payables: 'Managing and stretching payables',
      receivables: 'Receivables and credit policy',
      invcash: 'Inventory and cash management',
    },

    nodes: [
      { id: 'w8-L1', kind: 'lesson', name: 'Cash stuck in stock and unpaid bills', lesson: 'w8-L1' },
      { id: 'w8-L2', kind: 'lesson', name: 'The operating cycle and the cash cycle', lesson: 'w8-L2' },
      { id: 'w8-L3', kind: 'lesson', name: 'Inventory and cash: how much to hold?', lesson: 'w8-L3' },
      { id: 'w8-1', kind: 'battle', name: 'The Loading Dock', topics: ['nwc', 'cycle', 'invcash'], n: 6,
        enemy: { name: 'Stockpile Stan', title: 'Hoards inventory, starves cash flow', body: 'box', color: '#a0764a', acc: ['hardhat'], mouth: 'grin', item: '📦',
          lines: { intro: 'More boxes! More stock! Who needs free cash flow?', hit: ['You freed up working capital. My boxes are shrinking!', 'Cash out of the warehouse? Noooo!'],
            taunt: ['An increase in NWC is a cash inflow… right? Ha!', 'Stock up! Carrying costs are free! (They are not.)'], win: 'My stockpile… has been cleared…', lose: 'Your cash is mine, stacked to the ceiling!' } } },
      { id: 'w8-L4', kind: 'lesson', name: 'Counting the days: the CCC', lesson: 'w8-L4' },
      { id: 'w8-2', kind: 'battle', name: 'The Cycle Track', topics: ['ccc', 'cycle'], n: 6,
        enemy: { name: 'Cash Cycle-ops', title: 'One eye on your inventory days', body: 'round', color: '#5b7fbf', acc: ['headset'], eyes: 1, mouth: 'o', item: '🔄',
          lines: { intro: 'I watch every day your cash is tied up. With my ONE big eye.', hit: ['Inventory days on COGS… correct!', 'You subtracted the A/P days. My eye waters.'],
            taunt: ['A/R days on COGS? My eye sees your mistake!', 'You ADDED the payables days! Round and round we go!'], win: 'My cycle… is broken…', lose: 'Round and round your cash goes, and I keep it!' } } },
      { id: 'w8-L5', kind: 'lesson', name: 'Trade credit: reading 2/10, net 30', lesson: 'w8-L5' },
      { id: 'w8-L6', kind: 'lesson', name: 'The cost of skipping the discount', lesson: 'w8-L6' },
      { id: 'w8-m1', kind: 'mini', name: 'Take the Discount?', mini: 'take-discount' },
      { id: 'w8-3', kind: 'battle', name: 'The Credit Counter', topics: ['terms', 'tcost'], n: 6,
        enemy: { name: 'Discount Dracula', title: 'Drains 44.6% a year from late payers', body: 'tall', color: '#7a2e3b', acc: ['bowtie'], mouth: 'fangs', item: '🦇',
          lines: { intro: 'Pay me within ten days… or I drink 44.6% a year from you!', hit: ['You used d over 1 minus d! Garlic!', 'Compounded properly… the sunlight burns!'],
            taunt: ['Only 2%? Just 2%? Mwahaha…', 'You forgot to compound. Delicious.'], win: 'Defeated… by an effective annual rate…', lose: 'Your discount is mine for eternity!' } } },
      { id: 'w8-L7', kind: 'lesson', name: 'Paying suppliers: on time or stretched?', lesson: 'w8-L7' },
      { id: 'w8-L8', kind: 'lesson', name: 'Receivables and credit policy', lesson: 'w8-L8' },
      { id: 'w8-4', kind: 'battle', name: 'Accounts Alley', topics: ['payables', 'receivables', 'invcash'], n: 6,
        enemy: { name: 'The Due-Date Dodger', title: 'Pays late, chases early', body: 'spiky', color: '#6b8e23', acc: ['cap', 'shades'], mouth: 'smirk', item: '🧾',
          lines: { intro: 'Pay suppliers on day 18? Day 60? Who even reads the terms?', hit: ['You paid on the last day. Annoyingly correct.', 'An ageing schedule? You caught my late accounts!'],
            taunt: ['Pay on day 18: lose the discount AND the free credit!', 'Stretch it to day 90! What could go wrong?'], win: 'My payment… is finally… overdue…', lose: 'Cash on delivery for you, from now on!' } } },
      { id: 'w8-m2', kind: 'mini', name: 'Cycle Sort', mini: 'cycle-sort' },
      { id: 'w8-boss', kind: 'boss', name: 'The Cash Kraken', topics: '*', n: 10,
        enemy: { name: 'The Cash Kraken', title: 'Keeper of the cash conversion cycle', body: 'blob', color: '#2f5d62', acc: ['crown'], eyes: 3, mouth: 'fangs', item: '🐙',
          lines: { intro: 'Every day your cash sits in my warehouse, it earns nothing. And I keep it!', hit: ['You shortened my cycle!', 'You took the discount and borrowed cheaper. Clever!'],
            taunt: ['Pay between the dates! Lose everything!', 'Sales for inventory days? My tentacles thank you!'], win: 'My grip on your working capital… slips…', lose: 'Your cash is trapped in my cycle forever!' } } },
    ],

    minis: {
      'take-discount': {
        game: 'rapid', title: 'Take the Discount?', intro: 'A supplier offers trade credit and the bank quotes a rate. Take the discount, or forgo it and pay on the last day?',
        gen(rng) {
          for (let k = 0; k < 60; k++) {
            const d = rng.pick([1, 2, 3]), x = rng.pick([10, 15, 20]), y = rng.pick([30, 40, 45, 60, 90]);
            if (y - x < 15) continue;
            const b = rng.step(0.06, 0.24, 0.01);
            const e = ear(d / 100, x, y);
            if (Math.abs(e - b) < 0.015) continue;
            const take = e > b;
            return {
              t: R`Terms **${d}/${x}, net ${y}**. The bank lends at ${pct(b)}.`,
              opts: ['Take the discount', 'Forgo and pay on the last day'], a: take ? 0 : 1,
              why: R`\(EAR = ${earTex(d / 100, x, y)} = ${L.pct(e, 2)}\). That is ${take ? 'above' : 'below'} the bank’s ${pct(b)}, so ${take ? `borrow from the bank and pay on day ${x}` : `pay the full amount on day ${y}`}.`,
            };
          }
          // fallback (never expected): the lecture's example
          return { t: R`Terms **2/10, net 30**. The bank lends at 15%.`, opts: ['Take the discount', 'Forgo and pay on the last day'], a: 0,
            why: R`\(EAR = ${earTex(0.02, 10, 30)} = ${L.pct(ear(0.02, 10, 30), 2)}\). That is above the bank’s 15%, so borrow from the bank and pay on day 10.` };
        },
        rounds: 10, seconds: 20,
      },
      'cycle-sort': {
        game: 'rapid', title: 'Cycle Sort', intro: 'Does each change make the cash conversion cycle shorter or longer?',
        bins: [{ id: 'short', label: 'Shorter CCC' }, { id: 'long', label: 'Longer CCC' }],
        items: [
          { t: 'Collect from customers 10 days sooner', bin: 'short', why: 'A/R days fall, so the CCC falls.' },
          { t: 'Hold 20 more days of inventory', bin: 'long', why: 'Inventory days rise, so the CCC rises.' },
          { t: 'Pay suppliers on day 30 instead of day 45', bin: 'long', why: 'A/P days fall. They are subtracted, so the CCC rises.' },
          { t: 'Switch to just-in-time inventory', bin: 'short', why: 'Inventory days fall towards zero.' },
          { t: 'Give customers 60 days to pay instead of 30', bin: 'long', why: 'A/R days rise.' },
          { t: 'Win 60-day terms from suppliers instead of 30', bin: 'short', why: 'A/P days rise, and they are subtracted.' },
          { t: 'Offer a cash discount that most customers take', bin: 'short', why: 'Customers pay sooner, so A/R days fall.' },
          { t: 'Let finished goods sit in the warehouse longer', bin: 'long', why: 'Inventory days rise.' },
          { t: 'Pay suppliers cash on delivery', bin: 'long', why: 'A/P days fall to zero.' },
          { t: 'Sell only for cash, never on credit', bin: 'short', why: 'A/R days fall to zero.' },
          { t: 'Speed up production so stock sells faster', bin: 'short', why: 'Inventory days fall.' },
          { t: 'Customers start paying two weeks late', bin: 'long', why: 'A/R days rise.' },
          { t: 'Buy inventory on credit instead of paying cash', bin: 'short', why: 'A/P days rise, so the cash cycle shortens.' },
          { t: 'Chase overdue accounts using an ageing schedule', bin: 'short', why: 'Faster collection cuts A/R days.' },
          { t: 'Buy a whole year of raw materials in bulk', bin: 'long', why: 'Inventory days jump.' },
          { t: 'Pay on the last day of the net period, not early', bin: 'short', why: 'A/P days rise to the full credit period.' },
        ],
        rounds: 12, seconds: 10,
      },
    },

    lessons: {
      'w8-L1': {
        title: 'Cash stuck in stock and unpaid bills',
        goal: R`Work out net working capital, and explain why tying up less of it raises a firm’s value.`,
        topics: ['nwc'],
        cards: [
          { kind: 'learn', title: 'Where did the cash go?',
            body: R`A bike shop buys 50 bikes from its supplier. They sit in the shop for weeks. Some customers buy on credit and pay later.\n\nThe shop makes a profit, yet its bank account is often low. Its cash is **stuck**: in bikes on the shelf, and in bills that customers have not paid yet.` },
          { kind: 'learn', title: 'Current assets and current liabilities',
            body: R`**Current assets** turn into cash within a year: **cash** itself, **inventory** (stock) and **accounts receivable** (A/R: money customers owe for credit sales).\n\n**Current liabilities** must be paid within a year: **accounts payable** (A/P: money the firm owes its suppliers) and other short-term bills, such as **accruals** (wages or taxes owed).`,
            table: { head: ['Current assets', 'Current liabilities'], rows: [['Cash', 'Accounts payable'], ['Inventory', 'Accruals'], ['Accounts receivable', 'Other bills due within a year']] } },
          { kind: 'learn', title: 'Net working capital',
            body: R`\[NWC = \text{Current assets} - \text{Current liabilities}\]\n\n**Net working capital** (NWC) is the short-term money a firm has tied up in running its business. Long-term items stay out: machines and buildings (PP&E), and long-term debt.` },
          { kind: 'example', title: 'Worked example: A Ltd',
            q: R`A Ltd has cash $1.6m, accounts receivable $4.2m, inventory $3.0m, accounts payable $1.8m, accruals $4.7m and long-term debt $4.0m. What is its NWC?`,
            steps: [
              R`Current assets: \(1.6 + 4.2 + 3.0 = \$8.8\text{m}\).`,
              R`Current liabilities: \(1.8 + 4.7 = \$6.5\text{m}\). Long-term debt is not current, so it stays out.`,
              R`\(NWC = 8.8 - 6.5 = \$2.3\text{m}\).`,
            ],
            answer: R`A Ltd’s NWC is \(\$2.3\text{m}\).`,
            ti: [TI.line('1.6+4.2+3.0-1.8-4.7')] },
          { kind: 'check', gen: 'w8-g-nwc' },
          { kind: 'learn', title: 'Working capital and free cash flow',
            body: R`Recall free cash flow from Floor 5:\n\n\[FCF = \text{Net income} + Dep - CapEx - \Delta NWC\]\n\nAn **increase** in NWC (more stock, more unpaid customer bills) uses up cash, so it is subtracted. Tie up less cash, and FCF goes up. Higher FCF means a higher firm value.` },
          { kind: 'example', title: 'Worked example: Emerald City Paints',
            q: R`Next year Emerald City expects net income $20m, depreciation $5m, capital expenditure $5m and an increase in working capital of $1m. FCF then grows 4% a year forever, and \(r = 12\%\). What is the firm worth? What if it cuts the increase in working capital by 20%?`,
            steps: [
              R`\(FCF_1 = 20 + 5 - 5 - 1 = \$19\text{m}\).`,
              R`A growing perpetuity (Floor 2): \(V = \frac{19}{0.12 - 0.04} = \$237.5\text{m}\).`,
              R`Cut the increase by 20%: \(1 \times 0.8 = \$0.8\text{m}\). Now \(FCF_1 = 20 + 5 - 5 - 0.8 = \$19.2\text{m}\).`,
              R`\(V = \frac{19.2}{0.08} = \$240\text{m}\). The value rises by \(\$2.5\text{m}\).`,
            ],
            answer: R`Saving just \(\$200{,}000\) a year adds \(\$2.5\text{m}\) of value, because the saving repeats and grows forever.`,
            formula: 'pv-grow-perp',
            ti: [TI.line('(20+5-5-1)/(0.12-0.04)', { note: 'Value today ($m).' }), TI.line('(20+5-5-0.8)/(0.12-0.04)', { note: 'Value with the smaller increase in working capital.' })] },
          { kind: 'guided', title: 'Your turn: value a saving', q: R`Next year a firm expects net income $12m, depreciation $3m, capital expenditure $4m and an increase in working capital of $2m. FCF then grows 3% a year forever. \(r = 11\%\).`,
            parts: [
              { ask: R`What is next year’s FCF (in $m)?`, answer: 9, unit: '$m', dp: 2, hint: R`\(12 + 3 - 4 - 2\)`, why: R`\(12 + 3 - 4 - 2 = \$9\text{m}\).`,
                mistakes: [{ v: 11, why: 'Subtract the increase in working capital too.' }] },
              { ask: R`What is the firm worth (in $m)?`, answer: 9 / 0.08, unit: '$m', dp: 2, hint: R`\(\frac{FCF_1}{r - g}\)`, why: R`\(\frac{9}{0.11 - 0.03} = \$112.5\text{m}\).`,
                mistakes: [{ v: 9 / 0.11, why: R`That ignores growth. Divide by \(r - g\).` }] },
              { ask: R`It cuts the increase in working capital by 25%. What is the new FCF (in $m)?`, answer: 9.5, unit: '$m', dp: 2, hint: R`The increase falls from \(\$2\text{m}\) to \(2 \times 0.75 = \$1.5\text{m}\).`, why: R`\(12 + 3 - 4 - 1.5 = \$9.5\text{m}\).` },
              { ask: R`What is the firm worth now (in $m)?`, answer: 9.5 / 0.08, unit: '$m', dp: 2, hint: R`Divide the new FCF by \(r - g = 0.08\).`, why: R`\(\frac{9.5}{0.08} = \$118.75\text{m}\).` },
            ],
            answer: R`A \(\$0.5\text{m}\) yearly saving adds \(\$6.25\text{m}\) of value.`,
            ti: [TI.line('(12+3-4-1.5)/(0.11-0.03)')] },
          { kind: 'check', ref: 'w8-q04' },
          { kind: 'recap', title: 'Remember', points: [
            R`\(NWC = \text{Current assets} - \text{Current liabilities}\): cash, inventory and A/R, less A/P and other short-term bills.`,
            R`Long-term items stay out: PP&E and long-term debt.`,
            R`An increase in NWC is subtracted in FCF, because it ties up cash.`,
            R`Less working capital → more FCF → a higher firm value.`,
            R`Exam trap: accruals are a current liability. Long-term debt is not.`,
          ] },
        ],
      },
      'w8-L2': {
        title: 'The operating cycle and the cash cycle',
        goal: R`Follow cash around a firm on a timeline, and tell the operating cycle from the cash cycle.`,
        topics: ['cycle'],
        cards: [
          { kind: 'learn', title: 'Follow one bike',
            body: R`Day 0: the shop buys a bike on credit. Day 30: it pays the supplier. Day 50: it sells the bike on credit. Day 75: the customer pays.\n\nThe shop’s own cash left on day 30 and came back on day 75.`,
            tl: { n: 3, at: { 0: 'Buy bike', 1: 'Pay supplier', 2: 'Sell bike', 3: 'Customer pays' }, labels: { 0: '0', 1: '30', 2: '50', 3: '75' }, unit: 'Day', hi: [1, 3] } },
          { kind: 'learn', title: 'Three stretches of time',
            points: [R`**Inventory days**: how long stock sits before it is sold. Bike: day 0 to day 50, so 50 days.`, R`**A/R days** (receivable days): how long customers take to pay. Bike: day 50 to day 75, so 25 days.`, R`**A/P days** (payable days): how long the firm takes to pay its suppliers. Bike: day 0 to day 30, so 30 days.`] },
          { kind: 'learn', title: 'The operating cycle',
            body: R`The **operating cycle** runs from buying the stock to collecting the cash from its sale:\n\n\[\text{Operating cycle} = \text{Inventory days} + \text{A/R days}\]\n\nBike: \(50 + 25 = 75\) days.` },
          { kind: 'learn', title: 'The cash cycle',
            body: R`The **cash cycle**, or **cash conversion cycle** (CCC), starts later: when the firm **pays cash** for the stock. Buying on credit delays that payment.\n\n\[CCC = \text{Inventory days} + \text{A/R days} - \text{A/P days}\]\n\nBike: \(75 - 30 = 45\) days. For 45 days the shop’s own cash is tied up.`,
            formula: 'ccc' },
          { kind: 'check', ref: 'w8-q10' },
          { kind: 'example', title: 'Worked example: A Ltd',
            q: R`A Ltd has inventory days of 54.75, A/R days of 43.8 and A/P days of 32.85. How long are its operating cycle and its cash cycle?`,
            steps: [R`Operating cycle: \(54.75 + 43.8 = 98.55\) days.`, R`Cash cycle: \(98.55 - 32.85 = 65.7\) days.`],
            answer: R`Operating cycle 98.55 days. Cash cycle 65.7 days.`,
            ti: [TI.line('54.75+43.8', { note: 'The operating cycle.' }), TI.line('ans-32.85', { note: 'The cash cycle.' })] },
          { kind: 'check', gen: 'w8-g-cycles' },
          { kind: 'learn', title: 'Shorter is better',
            body: R`The longer the cash cycle, the more cash a firm needs to keep running. Every day cut from the cycle frees cash.`,
            points: [R`Sell stock faster: fewer inventory days.`, R`Collect from customers sooner: fewer A/R days.`, R`Pay suppliers later, within the terms: more A/P days.`],
            tip: R`A/P days are subtracted. Paying suppliers later makes the cash cycle **shorter**.` },
          { kind: 'guided', title: 'Your turn: a toy shop', q: R`A toy shop’s stock sits for 40 days before it is sold. Customers pay 20 days after the sale. The shop pays its supplier 35 days after buying the stock.`,
            parts: [
              { ask: R`How long is the operating cycle?`, answer: 60, unit: 'days', dp: 0, hint: 'Inventory days plus A/R days.', why: R`\(40 + 20 = 60\) days.` },
              { ask: R`How long is the cash cycle?`, answer: 25, unit: 'days', dp: 0, hint: 'Subtract the A/P days.', why: R`\(60 - 35 = 25\) days.`,
                mistakes: [{ v: 95, why: 'Subtract the A/P days. Do not add them.' }] },
              { ask: R`The shop now pays its supplier on day 45 instead. What is the new cash cycle?`, answer: 15, unit: 'days', dp: 0, hint: 'The A/P days rise to 45.', why: R`\(40 + 20 - 45 = 15\) days. Paying later shortened the cycle.`,
                mistakes: [{ v: 35, why: 'A/P days are subtracted, so paying later makes the cycle shorter, not longer.' }] },
            ],
            answer: R`Paying the supplier 10 days later cut the cash cycle from 25 to 15 days.`,
            ti: [TI.line('40+20-45')] },
          { kind: 'check', ref: 'w8-q11' },
          { kind: 'recap', title: 'Remember', points: [
            R`\(\text{Operating cycle} = \text{Inventory days} + \text{A/R days}\): from buying stock to collecting cash.`,
            R`\(CCC = \text{Inventory days} + \text{A/R days} - \text{A/P days}\): from paying cash to collecting cash.`,
            R`Buying on credit shortens the cash cycle.`,
            R`A shorter cycle ties up less cash, so free cash flow rises.`,
            R`Exam trap: the operating cycle starts when stock is **bought**; the cash cycle starts when cash is **paid**.`,
          ], formula: 'ccc' },
        ],
      },
      'w8-L3': {
        title: 'Inventory and cash: how much to hold?',
        goal: R`Weigh the costs and benefits of holding inventory and cash, and say where spare cash can go.`,
        topics: ['invcash'],
        cards: [
          { kind: 'learn', title: 'Too little stock',
            body: R`A bakery runs out of bread at 9 am. Customers leave and buy elsewhere.\n\nRunning out is a **stock-out**. It means lost sales and unhappy customers. So firms hold enough **inventory** (stock) to meet demand.` },
          { kind: 'learn', title: 'Too much stock',
            body: R`Holding stock costs money too.`,
            points: [R`**Acquisition and order costs**: buying the stock and placing each order.`, R`**Carrying costs**: storage, insurance, spoilage, and the cash tied up in the stock.`],
            tip: R`Extra stock raises inventory days, and that ties up more cash.` },
          { kind: 'learn', title: 'Just-in-time',
            body: R`**Just-in-time (JIT)** inventory means buying stock exactly when it is needed. The inventory balance stays at zero, or very close to it.\n\nDell works like this. It orders the parts for a computer only after a customer has ordered the computer.` },
          { kind: 'check', ref: 'w8-q55' },
          { kind: 'learn', title: 'Why hold cash at all?',
            body: R`Cash earns no interest, or very little. Yet firms keep some, for three reasons.`,
            points: [R`**Day-to-day needs**: paying bills and wages.`, R`**Precautionary balance**: a cushion for surprises, such as an unexpected loss.`, R`**Compensating balance**: a minimum balance the bank requires.`] },
          { kind: 'check', ref: 'w8-q56' },
          { kind: 'learn', title: 'Parking spare cash',
            body: R`Cash the firm does not need today can earn a little in safe, short-term securities that turn back into cash quickly.\n\nExamples: **short-term government debt** and **bank-accepted bills**.` },
          { kind: 'check', ref: 'w8-q59' },
          { kind: 'recap', title: 'Remember', points: [
            R`Enough stock prevents **stock-outs**. Too much stock brings order costs and **carrying costs**.`,
            R`**JIT** keeps inventory near zero, which shortens the cash cycle.`,
            R`Firms hold cash for day-to-day needs, as a precaution, and as a compensating balance.`,
            R`Spare cash can go into short-term government debt or bank-accepted bills.`,
            R`Exam trap: a **compensating** balance is what the bank requires; a **precautionary** balance is for surprises.`,
          ] },
        ],
      },
      'w8-L4': {
        title: 'Counting the days: the cash conversion cycle',
        goal: R`Work out inventory days, A/R days and A/P days from the accounts, then the cash conversion cycle.`,
        topics: ['ccc'],
        cards: [
          { kind: 'learn', title: 'From balances to days',
            body: R`The accounts do not say “stock sits for 50 days”. They give **balances** (how much stock, receivables and payables the firm holds) and **yearly totals** (sales and COGS).\n\nTo turn a balance into days, divide it by **one day’s worth** of the yearly total. A shop that sells $365,000 a year sells $1,000 a day. If customers owe it $30,000, that is 30 days of sales.` },
          { kind: 'learn', title: 'Sales or COGS?',
            body: R`**COGS** (cost of goods sold) is what the goods cost the firm. **Sales** is what customers pay for them.\n\nInventory and payables are recorded **at cost**, so they use COGS. Receivables come from **sales**, so they use sales.`,
            table: { head: ['Day count', 'Balance', 'Divide by'], rows: [['Inventory days', 'Inventory', R`\(COGS \div 365\)`], ['A/R days', 'Accounts receivable', R`\(Sales \div 365\)`], ['A/P days', 'Accounts payable', R`\(COGS \div 365\)`]] } },
          { kind: 'learn', title: 'The cash conversion cycle',
            body: R`Add the first two day counts and subtract the third:\n\n\[CCC = \text{Inventory days} + \text{A/R days} - \text{A/P days}\]\n\nThe answer is the number of days the firm’s own cash is tied up.`,
            formula: 'ccc' },
          { kind: 'example', title: 'Worked example: A Ltd',
            q: R`A Ltd had sales of $35m and COGS of $20m. Year-end balances: accounts receivable $4.2m, inventory $3.0m and accounts payable $1.8m. Use a 365-day year. What is its CCC?`,
            steps: [
              R`Inventory days: \(\frac{3.0}{20/365} = 54.75\).`,
              R`A/R days: \(\frac{4.2}{35/365} = 43.8\). Receivables use **sales**.`,
              R`A/P days: \(\frac{1.8}{20/365} = 32.85\).`,
              R`\(CCC = 54.75 + 43.8 - 32.85 = 65.7\) days.`,
            ],
            answer: R`A Ltd’s cash is tied up for 65.7 days.`,
            ti: [TI.line('3/(20/365)→i', { note: 'Inventory days, stored in i.' }), TI.line('4.2/(35/365)→a', { note: 'A/R days, stored in a.' }), TI.line('i+a-1.8/(20/365)', { note: 'Subtract the A/P days.' })] },
          { kind: 'check', gen: 'w8-g-invdays' },
          { kind: 'guided', title: 'Your turn: a full CCC', q: R`A firm had sales of $73m and COGS of $54.75m. Year-end balances: inventory $9m, accounts receivable $8m and accounts payable $6m. Use a 365-day year.`,
            parts: [
              { ask: R`What is average daily COGS (in $m)?`, answer: 54.75 / 365, unit: '$m', dp: 2, hint: R`\(\frac{54.75}{365}\)`, why: R`\(\frac{54.75}{365} = \$0.15\text{m}\) a day.`,
                mistakes: [{ v: 73 / 365, why: 'That is daily sales. Use COGS: $54.75m.' }] },
              { ask: R`What are the inventory days?`, answer: 9 / (54.75 / 365), unit: 'days', dp: 2, hint: 'Inventory divided by daily COGS.', why: R`\(\frac{9}{0.15} = 60\) days.`,
                mistakes: [{ v: 9 / (73 / 365), why: 'Inventory is held at cost. Divide by daily COGS, not daily sales.' }] },
              { ask: R`What are the A/R days?`, answer: 8 / (73 / 365), unit: 'days', dp: 2, hint: R`Receivables divided by daily **sales**: \(\frac{73}{365} = 0.2\).`, why: R`\(\frac{8}{0.2} = 40\) days.`,
                mistakes: [{ v: 8 / (54.75 / 365), why: 'Receivables come from sales. Divide by daily sales, not daily COGS.' }] },
              { ask: R`What are the A/P days?`, answer: 6 / (54.75 / 365), unit: 'days', dp: 2, hint: 'Payables divided by daily COGS.', why: R`\(\frac{6}{0.15} = 40\) days.`,
                mistakes: [{ v: 6 / (73 / 365), why: 'Payables are at cost. Divide by daily COGS.' }] },
              { ask: R`What is the cash conversion cycle?`, answer: 9 / (54.75 / 365) + 8 / (73 / 365) - 6 / (54.75 / 365), unit: 'days', dp: 2, hint: 'Add, add, subtract.', why: R`\(60 + 40 - 40 = 60\) days.`,
                mistakes: [{ v: 140, why: 'Subtract the A/P days. Do not add them.' }] },
            ],
            answer: R`The CCC is 60 days.`,
            ti: [TI.line('9/(54.75/365)→i'), TI.line('8/(73/365)→a'), TI.line('i+a-6/(54.75/365)')] },
          { kind: 'check', gen: 'w8-g-ccc' },
          { kind: 'learn', title: 'A negative CCC',
            body: R`Woolworths (2012): inventory days 33.2, A/R days 1.4 and A/P days 46.0.\n\n\[CCC = 33.2 + 1.4 - 46.0 = -11.4 \text{ days}\]\n\nA **negative** CCC means customers pay (at the checkout) before the firm pays its suppliers. The suppliers are funding the stock.`,
            tip: R`Airlines have the lowest CCCs: you pay before you fly. Construction firms sit at the other extreme.`,
            ti: [TI.line('33.2+1.4-46.0')] },
          { kind: 'learn', title: 'Days into dollars',
            body: R`Cutting a day count frees cash. One day of receivables is one day of **sales**. One day of inventory or payables is one day of **COGS**.\n\n\[\text{Cash freed} = \text{days cut} \times \frac{\text{yearly sales or COGS}}{365}\]\n\nWith sales of $73m a year, collecting 10 days sooner frees \(10 \times \frac{73}{365} = \$2\text{m}\).`,
            ti: [TI.line('10*73/365', { note: 'Cash freed ($m).' })] },
          { kind: 'check', gen: 'w8-g-cashfree' },
          { kind: 'recap', title: 'Remember', points: [
            R`\(\text{Inventory days} = \frac{\text{Inventory}}{COGS/365}\)`,
            R`\(\text{A/R days} = \frac{\text{Receivables}}{Sales/365}\)`,
            R`\(\text{A/P days} = \frac{\text{Payables}}{COGS/365}\)`,
            R`\(CCC = \text{Inventory days} + \text{A/R days} - \text{A/P days}\): add, add, subtract.`,
            R`Exam trap: A/R days use **sales**; inventory days and A/P days use **COGS**. Never add the A/P days.`,
          ], formula: 'ccc' },
        ],
      },
      'w8-L5': {
        title: 'Trade credit: reading 2/10, net 30',
        goal: R`Read trade credit terms, and see why skipping the discount is really a loan.`,
        topics: ['terms'],
        cards: [
          { kind: 'learn', title: 'Buy now, pay later',
            body: R`Suppliers often let firms pay later. This is **trade credit**.\n\nThe terms on the invoice say how long you have to pay, and whether you get a discount for paying early.` },
          { kind: 'learn', title: 'Reading the terms',
            body: R`Take **2/10, net 30** on a $100 bill.`,
            points: [R`**2**: a 2% discount…`, R`**10**: …if you pay within 10 days. This is the **discount period**.`, R`**net 30**: otherwise the full $100 is due by day 30. This is the **net period**.`],
            tl: { n: 2, at: { 0: 'Invoice', 1: 'Pay $98', 2: 'Pay $100' }, labels: { 0: '0', 1: '10', 2: '30' }, unit: 'Day', hi: [1, 2] } },
          { kind: 'check', gen: 'w8-g-meaning' },
          { kind: 'learn', title: 'The seller’s side',
            body: R`For the seller, the discount is a cost. On a $100 sale it gives up 2% of $100, which is $2.\n\nIn return, the cash arrives sooner.` },
          { kind: 'check', ref: 'w8-q26' },
          { kind: 'learn', title: 'Skipping the discount is a loan',
            body: R`You can pay $98 on day 10, or $100 on day 30.\n\nIf you wait, you keep the $98 for 20 more days, then pay $2 extra. That is like **borrowing $98 for 20 days** and paying $2 of interest.` },
          { kind: 'learn', title: 'The rate for those 20 days',
            body: R`Divide the interest by the amount borrowed:\n\n\[\frac{2}{98} = 0.020408 = 2.04\%\]\n\nWith a discount \(d\) (as a decimal), the rate for one period is \(\frac{d}{1-d}\). The period is the extra days of credit: the net days minus the discount days.`,
            ti: [TI.line('2/98', { pct: true, note: 'A decimal: 0.020408 is 2.04%.' })] },
          { kind: 'example', title: 'Worked example: 3/20, net 40',
            q: R`Terms are 3/20, net 40. If you skip the discount, what rate do you pay, and for how many days?`,
            steps: [R`On a $100 bill you could pay $97 on day 20, or $100 on day 40.`, R`Extra days of credit: \(40 - 20 = 20\) days.`, R`Rate: \(\frac{3}{97} = 0.030928\), which is 3.09% for 20 days.`],
            answer: R`You pay 3.09% for 20 days of extra credit.`,
            ti: [TI.line('3/97', { pct: true })] },
          { kind: 'guided', title: 'Your turn: 1/15, net 40', q: R`Terms are 1/15, net 40, on a $100 bill.`,
            parts: [
              { ask: R`How much do you pay if you take the discount?`, answer: 99, unit: '$', dp: 2, hint: '1% off $100.', why: R`\(100 - 1 = \$99\), paid by day 15.` },
              { ask: R`How many extra days of credit do you get if you skip it?`, answer: 25, unit: 'days', dp: 0, hint: 'The net days minus the discount days.', why: R`\(40 - 15 = 25\) days.`,
                mistakes: [{ v: 40, why: 'The first 15 days are free either way. Count only the extra days.' }] },
              { ask: R`What rate do you pay for those 25 days?`, answer: P(1 / 99), unit: '%', dp: 2, hint: R`\(\frac{d}{1-d} = \frac{1}{99}\)`, why: R`\(\frac{1}{99} = 1.01\%\) for 25 days.`,
                mistakes: [{ v: 1, why: 'You borrow $99, not $100. Divide by 99.' }] },
            ],
            answer: R`Skipping the discount means borrowing \(\$99\) for 25 days at 1.01%.`,
            ti: [TI.line('1/99', { pct: true })] },
          { kind: 'check', gen: 'w8-g-period' },
          { kind: 'recap', title: 'Remember', points: [
            R`“d/x, net y”: take d% off if you pay within x days. Otherwise pay in full by day y.`,
            R`Skipping the discount is like borrowing the discounted price for \(y - x\) days.`,
            R`Rate per period: \(\frac{d}{1-d}\), e.g. \(\frac{2}{98} = 2.04\%\).`,
            R`Exam trap: divide by 98 (the price you would have paid), not by 100.`,
          ] },
        ],
      },
      'w8-L6': {
        title: 'The cost of skipping the discount',
        goal: R`Turn the cost of trade credit into an effective annual rate on the TI-Nspire, and compare it with a bank loan.`,
        topics: ['tcost'],
        cards: [
          { kind: 'learn', title: 'From 20 days to a year',
            body: R`2.04% for 20 days sounds small. But a year holds \(\frac{365}{20} = 18.25\) periods of 20 days. Paid again and again, it adds up fast.\n\nOn Floor 1 you met the **effective annual rate** (EAR): a period rate compounded over a whole year.` },
          { kind: 'learn', title: 'The formula',
            body: R`\[EAR = \left(1 + \frac{d}{1-d}\right)^{\frac{365}{\text{net} - \text{discount days}}} - 1\]\n\n\(d\) is the discount as a decimal. Use a **365-day year** unless the question says 360.`,
            formula: 'trade-credit' },
          { kind: 'example', title: 'Worked example: 2/10, net 30',
            q: R`What is the effective annual cost of skipping the discount on 2/10, net 30? Use a 365-day year.`,
            steps: [
              R`Rate per period: \(\frac{2}{98} = 0.020408\).`,
              R`Periods in a year: \(\frac{365}{30 - 10} = \frac{365}{20} = 18.25\).`,
              R`\(EAR = 1.020408^{18.25} - 1 = ${L.numT(ear(0.02, 10, 30), 4)}\), which is \(${L.pct(ear(0.02, 10, 30), 2)}\).`,
            ],
            answer: R`About 44.6% a year: a very expensive loan.`,
            ti: [earTI(0.02, 10, 30)] },
          { kind: 'ti', title: 'One line on the TI-Nspire',
            body: R`Type the formula exactly as it looks, with its brackets. The power needs its own brackets: \((365/(30 - 10))\).\n\nThe answer is a decimal. \(${L.numT(ear(0.02, 10, 30), 4)}\) means \(${L.pct(ear(0.02, 10, 30), 2)}\).`,
            ti: [TI.line('(1+2/98)^(365/(30-10))-1')] },
          { kind: 'check', ref: 'w8-q29' },
          { kind: 'learn', title: 'Take it or leave it?',
            body: R`Compare the EAR with the bank’s interest rate.`,
            points: [R`EAR **above** the bank rate: skipping the discount is the dearer loan. **Take the discount**. Borrow from the bank if you must, and pay on the **last discount day**.`, R`EAR **below** the bank rate: trade credit is the cheaper loan. **Skip the discount** and pay on the **last day** of the net period.`] },
          { kind: 'learn', title: 'Never pay in between',
            body: R`Once you have skipped the discount, the extra days are free. Use all of them.\n\nPaying a 2/10, net 30 bill on day 20 loses the discount **and** 10 days of free credit.` },
          { kind: 'guided', title: 'Your turn: take it or leave it?', q: R`Your supplier offers 2/10, net 60. The bank lends at 20%. Use a 365-day year.`,
            parts: [
              { ask: R`How many extra days of credit do you get by skipping the discount?`, answer: 50, unit: 'days', dp: 0, hint: 'The net days minus the discount days.', why: R`\(60 - 10 = 50\) days.`,
                mistakes: [{ v: 60, why: 'The first 10 days are free either way. Count only the extra days.' }] },
              { ask: R`What is the rate for those 50 days?`, answer: P(2 / 98), unit: '%', dp: 2, hint: R`\(\frac{2}{98}\)`, why: R`\(\frac{2}{98} = 2.04\%\).`,
                mistakes: [{ v: 2, why: 'You borrow $98, not $100. Divide by 98.' }] },
              { ask: R`What is the EAR of skipping the discount?`, answer: P(ear(0.02, 10, 60)), unit: '%', dp: 2, hint: R`\((1 + 2/98)^{365/50} - 1\)`, why: R`\(1.020408^{7.3} - 1 = ${L.pct(ear(0.02, 10, 60), 2)}\).`,
                mistakes: [{ v: P(ear(0.02, 0, 60)), why: 'Use the extra days (50), not all 60 days.' }, { v: P((2 / 98) * (365 / 50)), why: 'That is simple interest. Compound the period rate.' }] },
            ],
            answer: R`\(${L.pct(ear(0.02, 10, 60), 2)}\) is below the bank’s 20%. Skip the discount and pay on day 60.`,
            ti: [earTI(0.02, 10, 60)] },
          { kind: 'check', gen: 'w8-g-decide' },
          { kind: 'learn', title: '360 or 365 days?',
            body: R`Use 365 days unless the question says 360. Tutorial Q2 (2/20, net 60) uses a 360-day year:\n\n\[\left(1 + \frac{2}{98}\right)^{\frac{360}{40}} - 1 = ${L.pct(ear(0.02, 20, 60, 360), 2)}\]\n\nWith 365 days it would be \(${L.pct(ear(0.02, 20, 60), 2)}\). A shorter year gives a slightly lower EAR.`,
            ti: [earTI(0.02, 20, 60, 360)] },
          { kind: 'recap', title: 'Remember', points: [
            R`\(EAR = \left(1 + \frac{d}{1-d}\right)^{\frac{365}{\text{net} - \text{discount days}}} - 1\)`,
            R`TI-Nspire: type it in one line, then multiply by 100 for a percentage.`,
            R`EAR above the bank rate: take the discount and pay on the last discount day. EAR below: skip it and pay on the last day.`,
            R`Never pay between the two dates.`,
            R`Exam trap: the power uses net minus discount days (20 for 2/10, net 30), not 30. The rate is \(\frac{d}{1-d}\), not \(d\).`,
          ], formula: 'trade-credit' },
        ],
      },
      'w8-L7': {
        title: 'Paying suppliers: on time, late or stretched?',
        goal: R`Check when a firm really pays its suppliers, and work out the cost of stretching payables.`,
        topics: ['payables'],
        cards: [
          { kind: 'learn', title: 'Two good days to pay',
            body: R`From the last lesson, there are only two good days to pay a supplier.`,
            points: [R`The **last day of the discount period**, if you take the discount.`, R`The **last day of the net period**, if you skip it.`],
            tip: R`Any other day wastes money.` },
          { kind: 'learn', title: 'Check it with A/P days',
            body: R`A/P days show when a firm really pays, on average:\n\n\[\text{A/P days} = \frac{\text{Accounts payable}}{\text{Average daily COGS}}\]\n\nCompare the answer with the supplier’s terms.`,
            formula: 'ap-days' },
          { kind: 'example', title: 'Worked example: Uwe Company',
            q: R`Uwe gets terms of 2/15, net 40. Its average accounts payable balance is $250,000 and its daily COGS is $14,000. Is it paying at a good time?`,
            steps: [
              R`\(\text{A/P days} = \frac{250{,}000}{14{,}000} = ${L.num(UWE)}\) days.`,
              R`The discount ends on day 15, so Uwe misses it by about 3 days.`,
              R`It skips the discount, yet pays long before day 40. It gives up 22 days of free credit.`,
              R`Better: pay by day 15 and take the discount, or wait until day 40.`,
            ],
            answer: R`No. Paying on day 18 loses the discount **and** 22 days of free credit.`,
            ti: [TI.line('250000/14000')] },
          { kind: 'check', gen: 'w8-g-apcheck' },
          { kind: 'learn', title: 'Stretching payables',
            body: R`**Stretching** means paying **after** the due date.\n\nOn 1/15, net 40, paying on day 60 spreads the same 1% over \(60 - 15 = 45\) days instead of 25. More days for the same discount means a lower yearly cost.` },
          { kind: 'example', title: 'Worked example: stretch to day 60',
            q: R`Terms are 1/15, net 40. What is the EAR if the firm pays on day 40? And if it stretches to day 60? Use a 365-day year.`,
            steps: [
              R`Day 40: \[\left(1 + \frac{1}{99}\right)^{\frac{365}{25}} - 1 = ${L.pct(ear(0.01, 15, 40), 2)}\]`,
              R`Day 60: \[\left(1 + \frac{1}{99}\right)^{\frac{365}{45}} - 1 = ${L.pct(ear(0.01, 15, 60), 2)}\]`,
              R`Stretching cuts the cost almost in half.`,
            ],
            answer: R`\(${L.pct(ear(0.01, 15, 40), 2)}\) on day 40, but only \(${L.pct(ear(0.01, 15, 60), 2)}\) on day 60.`,
            ti: [earTI(0.01, 15, 40, 365, 'Pay on day 40.'), earTI(0.01, 15, 60, 365, 'Stretch to day 60.')] },
          { kind: 'learn', title: 'The risks of stretching',
            body: R`Stretching is cheap credit, but it breaks your deal with the supplier.`,
            points: [R`The supplier may demand **cash on delivery**, or even payment before delivery.`, R`It may stop supplying you altogether.`, R`Your **credit rating** may suffer, so other credit costs more.`],
            tip: R`On cost alone, stretching can win. In practice, weigh these risks.` },
          { kind: 'check', ref: 'w8-q42' },
          { kind: 'guided', title: 'Your turn: pay late?', q: R`A supplier offers 1/10, net 30. It would accept payment as late as day 50. The bank lends at 12%. Use a 365-day year.`,
            parts: [
              { ask: R`What is the EAR if you pay on day 30?`, answer: P(ear(0.01, 10, 30)), unit: '%', dp: 2, hint: R`\((1 + 1/99)^{365/20} - 1\)`, why: R`\(${L.pct(ear(0.01, 10, 30), 2)}\), which is above the bank’s 12%.`,
                mistakes: [{ v: P(Math.pow(1.01, 365 / 20) - 1), why: R`The rate is \(\frac{1}{99}\), not 1%.` }] },
              { ask: R`Without stretching, what should you do?`, choices: ['Take the discount: borrow from the bank and pay on day 10', 'Skip the discount and pay on day 30'], answer: 0, hint: 'Compare the EAR with the bank’s 12%.', why: R`\(${L.pct(ear(0.01, 10, 30), 2)} > 12\%\), so the discount is worth taking.` },
              { ask: R`What is the EAR if you stretch to day 50?`, answer: P(ear(0.01, 10, 50)), unit: '%', dp: 2, hint: R`Now the loan runs \(50 - 10 = 40\) days.`, why: R`\((1 + 1/99)^{365/40} - 1 = ${L.pct(ear(0.01, 10, 50), 2)}\).`,
                mistakes: [{ v: P(ear(0.01, 0, 50)), why: R`The loan starts on day 10. Use \(50 - 10 = 40\) days.` }] },
            ],
            answer: R`Stretched, the cost falls to \(${L.pct(ear(0.01, 10, 50), 2)}\), below the bank’s 12%. It is the cheapest money, if you accept the risks.`,
            ti: [earTI(0.01, 10, 30, 365, 'Pay on day 30.'), earTI(0.01, 10, 50, 365, 'Stretch to day 50.')] },
          { kind: 'check', gen: 'w8-g-stretch' },
          { kind: 'recap', title: 'Remember', points: [
            R`Pay on the last discount day (take it) or on the last net day (skip it). Never in between.`,
            R`\(\text{A/P days} = \frac{\text{Payables}}{\text{Daily COGS}}\): compare it with the terms.`,
            R`**Stretching** (paying after the due date) spreads the discount over more days, so the EAR falls.`,
            R`Risks: cash on delivery, a lost supplier, a poor credit rating.`,
            R`Exam trap: count the days from the discount day to the day you actually pay: \(60 - 15 = 45\), not 60.`,
          ], formula: 'trade-credit' },
        ],
      },
      'w8-L8': {
        title: 'Receivables: when customers owe you',
        goal: R`Keep an eye on receivables, and use NPV to decide whether to change a credit policy.`,
        topics: ['receivables'],
        cards: [
          { kind: 'learn', title: 'The other side of trade credit',
            body: R`Your firm is also a supplier. When it lets customers pay later, it creates **accounts receivable**.\n\nGenerous credit can win sales. But the cash arrives later, and some customers pay late, or not at all.` },
          { kind: 'learn', title: 'Three ways to watch receivables',
            points: [R`**A/R days**: the average number of days customers take to pay.`, R`**Ageing schedule**: receivables sorted by how long they have been unpaid, by number of accounts or by dollar value.`, R`**Payment pattern**: the percentage of each month’s sales collected in that month, the next month, and so on.`],
            table: { head: ['Days unpaid', 'Amount', 'Share'], rows: [['0–30', '$60,000', '60%'], ['31–60', '$25,000', '25%'], ['61–90', '$10,000', '10%'], ['Over 90', '$5,000', '5%']] },
            tip: R`The table is an ageing schedule. The old debts at the bottom are the risky ones.` },
          { kind: 'check', ref: 'w8-q47' },
          { kind: 'example', title: 'Worked example: Company B',
            q: R`Company B sells on 2/10, net 30. Its sales were $37m and its receivables are $4m. What are its A/R days? Is it collecting on time?`,
            steps: [
              R`\(\text{A/R days} = \frac{4}{37/365} = ${L.num(COB_AR)}\) days.`,
              R`The full amount is due by day 30.`,
              R`On average, customers pay about ${T.numT(COB_AR - 30, 1)} days late. That is a warning sign.`,
            ],
            answer: R`\(${L.num(COB_AR)}\) days: past the 30-day due date. Company B should chase its late payers.`,
            ti: [TI.line('4/(37/365)')] },
          { kind: 'check', gen: 'w8-g-ardays' },
          { kind: 'learn', title: 'Judge a credit policy with NPV',
            body: R`Changing the credit terms changes **when** cash arrives and **how much** you sell. To compare two policies, lay out each one’s monthly cash flows and work out its NPV. Keep the policy with the higher NPV.\n\nIf a policy repeats every month forever, the repeating part is a **monthly perpetuity**, \(\frac{C}{r}\), with \(r\) the monthly rate (Floor 2).` },
          { kind: 'example', title: 'Worked example: the current policy',
            q: R`A product sells for $100 and costs $60 to make. The firm sells 500 units a month. Half the customers pay cash now and take a 1% discount. The rest pay full price in 30 days. The required return is 1% a month, and the policy runs forever. What is its NPV?`,
            tl: { n: 3, at: { 0: CREDIT.net0, 1: CREDIT.credit + CREDIT.net0, 2: CREDIT.credit + CREDIT.net0, 3: CREDIT.credit + CREDIT.net0 }, labels: { 3: '3, 4, …' }, unit: 'Month' },
            steps: [
              R`Month 0: make 500 units, \(-500 \times 60 = -\$30{,}000\). Cash sales: \(250 \times 99 = \$24{,}750\). Net: \(-\$5{,}250\).`,
              R`Each later month: last month’s credit sales arrive, \(250 \times 100 = \$25{,}000\), and the month’s \(-\$5{,}250\) repeats. Net: \(\$19{,}750\).`,
              R`\[NPV = -5{,}250 + \frac{19{,}750}{0.01} = \$1{,}969{,}750\]`,
            ],
            answer: R`The current policy is worth \(\$1{,}969{,}750\).`,
            ti: [TI.line('-500*60+250*99', { note: 'Month 0.' }), TI.line('-5250+(250*100-5250)/0.01', { note: 'Month 0, plus the monthly perpetuity.' })] },
          { kind: 'guided', title: 'Your turn: drop the discount?', q: R`Same firm. If it drops the 1% cash discount, it sells only 480 units a month, and every customer pays full price in 30 days. The current policy is worth $1,969,750.`,
            parts: [
              { ask: R`What is the new policy’s month-0 cash flow?`, answer: CREDIT.net0n, unit: '$', dp: 0, hint: R`Only the production cost is paid now: \(480 \times 60\).`, why: R`\(-480 \times 60 = -\$28{,}800\). No customer pays in month 0.` },
              { ask: R`What is each later month’s cash flow?`, answer: CREDIT.creditN + CREDIT.net0n, unit: '$', dp: 0, hint: R`Last month’s sales arrive (\(480 \times 100\)), and this month’s costs are paid.`, why: R`\(48{,}000 - 28{,}800 = \$19{,}200\).`,
                mistakes: [{ v: 48000, why: 'Each month also pays for the new month’s production.' }] },
              { ask: R`What is the new policy’s NPV?`, answer: CREDIT.nw, unit: '$', dp: 0, hint: R`Month 0, plus \(\frac{19{,}200}{0.01}\).`, why: R`\(-28{,}800 + \frac{19{,}200}{0.01} = \$1{,}891{,}200\).` },
              { ask: R`What is the NPV of switching (new minus current)?`, answer: CREDIT.sw, unit: '$', dp: 0, hint: R`\(1{,}891{,}200 - 1{,}969{,}750\)`, why: R`\(1{,}891{,}200 - 1{,}969{,}750 = -\$78{,}550\).` },
            ],
            answer: R`Switching has an NPV of \(-\$78{,}550\). Keep the cash discount.`,
            ti: [TI.line('-480*60+(480*100-480*60)/0.01', { note: 'The new policy’s NPV.' }), TI.line('ans-1969750', { note: 'New minus current.' })] },
          { kind: 'check', ref: 'w8-q52' },
          { kind: 'recap', title: 'Remember', points: [
            R`Watch receivables with **A/R days**, an **ageing schedule** and **payment patterns**.`,
            R`A/R days above the credit period mean customers pay late: a warning sign.`,
            R`Compare credit policies by NPV: the month-0 cash flow plus a monthly perpetuity, \(\frac{C}{r}\).`,
            R`\(NPV_{switch} = NPV_{new} - NPV_{current}\). Switch only if it is positive.`,
            R`Exam trap: credit sales arrive a month after the costs are paid. Do not ignore the timing.`,
          ] },
        ],
      },
    },

    questions: [
      /* ----- net working capital and value ----- */
      { id: 'w8-q01', topic: 'nwc', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W8 slide 6',
        q: R`**Net working capital** equals…`,
        choices: [R`\(\text{Current assets} - \text{Current liabilities}\)`, R`\(\text{Total assets} - \text{Total liabilities}\)`, R`\(\text{Cash} - \text{Accounts payable}\)`, R`\(\text{Inventory} + \text{Accounts receivable}\)`], answer: 0,
        why: R`NWC is the short-term capital the firm has tied up: items settled in cash within a year, assets less liabilities.` },
      { id: 'w8-q02', topic: 'nwc', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W8 slide 6',
        q: R`Which of these is a current **liability**?`,
        choices: ['Accounts payable (money owed to suppliers)', 'Accounts receivable (money owed by customers)', 'Inventory', 'Cash'], answer: 0,
        why: R`Accounts payable are purchases on credit that the firm still owes. The other three are current **assets**.` },
      { id: 'w8-q03', topic: 'nwc', kind: 'tf', level: 1, section: 'A', src: 'Tutorial W8 concept check Q1',
        q: R`Working capital alters a firm’s value by affecting its free cash flow.`,
        answer: true, why: R`\(FCF = NI + Dep - CapEx - \Delta NWC\). Tying up less cash in working capital raises FCF, and so the firm’s value.` },
      { id: 'w8-q04', topic: 'nwc', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W8 slide 6', formula: 'fcf',
        q: R`In \(FCF = \text{Net income} + Dep - CapEx - \Delta NWC\), what does an **increase** in NWC do?`,
        choices: ['It lowers FCF, because more cash is tied up in inventory and receivables', 'It raises FCF, because the firm owns more assets', 'Nothing, because NWC is not on the income statement', 'It lowers FCF only if the firm borrows to fund it'], answer: 0,
        why: R`Cash spent building up inventory or receivables is cash the firm cannot pay out. So an increase in NWC is subtracted.` },
      { id: 'w8-q05', topic: 'nwc', kind: 'num', level: 2, section: 'B', src: 'Task sheet W8 (A Ltd)',
        q: R`**A Ltd** has cash $1.6m, accounts receivable $4.2m, inventory $3.0m, accounts payable $1.8m, accruals $4.7m and long-term debt $4.0m. What is its **net working capital** (in $m)?`,
        answer: 1.6 + 4.2 + 3.0 - 1.8 - 4.7, unit: '$m', dp: 2,
        mistakes: [
          { v: 1.6 + 4.2 + 3.0 - 1.8, why: 'Accruals are a current liability too. Subtract them.' },
          { v: 1.6 + 4.2 + 3.0 - 1.8 - 4.7 - 4.0, why: 'Long-term debt is not a current liability. Leave it out.' },
          { v: 4.2 + 3.0 - 1.8 - 4.7, why: 'Cash is a current asset. Include it.' },
        ],
        steps: [R`Current assets: \(1.6 + 4.2 + 3.0 = \$8.8\text{m}\)`, R`Current liabilities: \(1.8 + 4.7 = \$6.5\text{m}\)`, R`\[NWC = 8.8 - 6.5 = \$2.3\text{m}\]`],
        ti: [TI.line('1.6+4.2+3.0-1.8-4.7', { note: 'Current assets less current liabilities ($m). Long-term debt stays out.' })],
        why: R`Current assets less current liabilities. Long-term debt is not current, so it is left out.` },
      { id: 'w8-q06', topic: 'nwc', kind: 'num', level: 2, section: 'B', src: 'Lecture W8 slides 12–14', formula: 'pv-grow-perp',
        q: R`**Emerald City Paints** expects next year: net income $20m, depreciation $5m, capital expenditure $5m and an increase in working capital of $1m. Free cash flow grows 4% a year forever, and \(r = 12\%\). What is the firm worth (in $m)?`,
        table: { head: ['Next year ($ thousands)', 'Amount'], rows: [['Net income', '20,000'], ['+ Depreciation', '5,000'], ['− Capital expenditures', '5,000'], ['− Increase in working capital', '1,000'], ['= Free cash flow', '19,000']] },
        answer: EMERALD.v0 / 1e6, unit: '$m', dp: 2,
        mistakes: [
          { v: 19e6 / 0.12 / 1e6, why: R`That ignores the 4% growth. A growing perpetuity divides by \(r - g\).` },
          { v: 20e6 / 0.08 / 1e6, why: 'That values net income. Value the free cash flow instead.' },
          { v: (19e6 * 1.04) / 0.08 / 1e6, why: 'The $19m is already next year’s FCF. Do not grow it again.' },
        ],
        steps: [R`\[FCF_1 = 20{,}000 + 5{,}000 - 5{,}000 - 1{,}000 = \$19{,}000\text{k}\]`, R`\[V = \frac{FCF_1}{r - g} = \frac{19{,}000{,}000}{0.12 - 0.04} = \$237{,}500{,}000\]`],
        ti: [TI.line('(20+5-5-1)/(0.12-0.04)', { note: R`Next year’s FCF in $m, divided by \(r - g\).` })],
        why: R`A growing perpetuity: next year’s FCF divided by \(r - g\).` },
      { id: 'w8-q07', topic: 'nwc', kind: 'num', level: 2, section: 'B', src: 'Lecture W8 slide 14', formula: 'pv-grow-perp',
        q: R`Emerald City Paints cuts its yearly increase in working capital by 20%, from $1m to $0.8m. Everything else is unchanged (FCF growth 4%, \(r = 12\%\)). What is the firm worth now (in $m)?`,
        answer: EMERALD.v1 / 1e6, unit: '$m', dp: 2,
        mistakes: [
          { v: EMERALD.v0 / 1e6, why: 'That is the old value, with the $1m increase in working capital.' },
          { v: 19.2e6 / 0.12 / 1e6, why: R`Divide by \(r - g = 0.08\), not by \(r\).` },
          { v: (EMERALD.v1 - EMERALD.v0) / 1e6, why: 'That is the gain in value. The question asks for the new value.' },
        ],
        steps: [R`\[FCF_1 = 20{,}000{,}000 + 5{,}000{,}000 - 5{,}000{,}000 - 800{,}000 = \$19{,}200{,}000\]`, R`\[V = \frac{19{,}200{,}000}{0.12 - 0.04} = \$240{,}000{,}000\]`],
        ti: [TI.line('(20+5-5-0.8)/(0.12-0.04)', { note: 'The working capital increase is now $0.8m.' })],
        why: R`Value rises from \(\$237.5\text{m}\) to \(\$240\text{m}\): a gain of \(\$2.5\text{m}\).` },
      { id: 'w8-q08', topic: 'nwc', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W8 slide 14',
        q: R`Emerald City saves only $200,000 a year in working capital, yet its value rises by $2.5m. Why?`,
        choices: [R`The saving grows at 4% forever: \(\frac{200{,}000}{0.12 - 0.04} = \$2.5\text{m}\)`, 'Lower working capital also lowers the cost of capital', 'The saving is counted once for each year of the next 12.5 years', 'The value of inventory rises when less is held'], answer: 0,
        why: R`A higher FCF every year, growing forever, is worth the growing-perpetuity value of the saving.` },
      { id: 'w8-q09', topic: 'nwc', kind: 'tf', level: 2, section: 'A', src: 'Tutorial W8 concept check Q3',
        q: R`Any reduction in working capital requirements generates a positive free cash flow that the firm can distribute immediately to shareholders.`,
        answer: true, why: R`Cash no longer tied up in working capital is free cash. It can be paid out straight away.` },

      /* ----- operating cycle and cash cycle ----- */
      { id: 'w8-q10', topic: 'cycle', kind: 'mcq', level: 2, section: 'A', src: 'Tutorial W8 concept check Q2',
        q: R`Which of the following is a firm’s **operating cycle**?`,
        choices: ['The average time between buying inventory and receiving the cash from selling the product', 'The average time between paying cash for inventory and receiving cash from the sale', 'The average time between buying inventory and selling the product', 'The average time between buying inventory and paying for it'], answer: 0,
        why: R`The operating cycle runs from the **purchase** of inventory to the **cash** from its sale: inventory days + A/R days.`,
        wrong: { 1: 'That starts when cash is paid, so it is the cash cycle.', 2: 'That stops at the sale. It is only the inventory days.', 3: 'That is the time taken to pay suppliers: the A/P days.' } },
      { id: 'w8-q11', topic: 'cycle', kind: 'mcq', level: 2, section: 'A', src: 'Tutorial W8 concept check Q3',
        q: R`Which of the following is a firm’s **cash cycle**?`,
        choices: ['The time between paying cash for inventory and receiving cash from the sale of the output', 'The time between buying inventory and receiving cash from the sale', 'The time between buying inventory and selling the product', 'The time between selling the product and paying the supplier'], answer: 0,
        why: R`The cash cycle starts when **cash** leaves the firm, not when goods arrive. It equals the operating cycle less the A/P days.` },
      { id: 'w8-q12', topic: 'cycle', kind: 'mcq', level: 2, section: 'A', src: 'Tutorial W8 concept check Q3',
        q: R`Which statement is **FALSE**?`,
        choices: [
          'Most firms buy inventory on credit, which increases the time between the cash investment and the receipt of cash from it',
          'The cash cycle is the time between paying cash for inventory and receiving cash from the sale of the output',
          'The longer a firm’s cash cycle, the more working capital it has and the more cash it needs',
          'Any reduction in working capital requirements generates free cash flow that can be paid out immediately'], answer: 0,
        why: R`Buying on credit **delays** the cash payment. That **shortens** the gap between paying cash and receiving cash.` },
      { id: 'w8-q13', topic: 'cycle', kind: 'tf', level: 1, section: 'A', src: 'Tutorial W8 concept check Q3',
        q: R`The longer a firm’s cash cycle, the more working capital it has, and the more cash it needs to run its daily operations.`,
        answer: true, why: R`A long cycle means cash stays locked in inventory and receivables for longer.` },
      { id: 'w8-q14', topic: 'cycle', kind: 'num', level: 1, section: 'B', src: 'Task sheet W8 (A Ltd)',
        q: R`A Ltd has inventory days of 54.75, A/R days of 43.8 and A/P days of 32.85. How long is its **operating cycle**?`,
        answer: COA.op, unit: 'days', dp: 2,
        mistakes: [
          { v: COA.ccc, why: 'That subtracts the A/P days, which gives the cash cycle (CCC).' },
          { v: COA.op + COA.ap, why: 'The operating cycle does not include A/P days at all.' },
          { v: COA.inv, why: 'That is only the inventory days. Add the A/R days.' },
        ],
        steps: [R`\[\text{Operating cycle} = \text{Inventory days} + \text{A/R days} = 54.75 + 43.8 = 98.55 \text{ days}\]`],
        ti: [TI.line('54.75+43.8', { note: 'Inventory days plus A/R days. No A/P days in the operating cycle.' })],
        why: R`From buying stock to collecting the cash: inventory days plus A/R days.` },

      /* ----- cash conversion cycle ----- */
      { id: 'w8-q15', topic: 'ccc', kind: 'mcq', level: 1, section: 'A', formula: 'ar-days',
        q: R`**Accounts receivable days** are measured against…`,
        choices: [R`Average daily sales: \(\frac{Sales}{365}\)`, R`Average daily COGS: \(\frac{COGS}{365}\)`, R`Average daily purchases from suppliers`, R`Average daily net income`], answer: 0,
        why: R`Receivables come from **sales**, so divide them by average daily sales.` },
      { id: 'w8-q16', topic: 'ccc', kind: 'mcq', level: 1, section: 'A', formula: 'ccc',
        q: R`Which two ratios use **average daily COGS** as the denominator?`,
        choices: ['Inventory days and A/P days', 'Inventory days and A/R days', 'A/R days and A/P days', 'All three ratios'], answer: 0,
        why: R`Inventory and payables are recorded at **cost**, so they use COGS. Receivables use sales.` },
      { id: 'w8-q17', topic: 'ccc', kind: 'num', level: 2, section: 'B', src: 'Lecture W8 slide 9', formula: 'ccc',
        q: R`**Woolworths** (2012): inventory days 33.2, A/R days 1.4 and A/P days 46.0. What is its cash conversion cycle?`,
        answer: 33.2 + 1.4 - 46.0, unit: 'days', dp: 1,
        mistakes: [
          { v: 33.2 + 1.4 + 46.0, why: 'Subtract the A/P days. Paying suppliers later shortens the cycle.' },
          { v: 33.2 + 1.4, why: 'That is the operating cycle. The CCC also subtracts A/P days.' },
        ],
        steps: [R`\[CCC = 33.2 + 1.4 - 46.0 = -11.4 \text{ days}\]`],
        ti: [TI.line('33.2+1.4-46.0')],
        why: R`A **negative** CCC: Woolworths collects from customers before it pays its suppliers.` },
      { id: 'w8-q18', topic: 'ccc', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W8 slide 10',
        q: R`Woolworths had a cash conversion cycle of −11.4 days in 2012. What does a **negative** CCC mean?`,
        choices: ['It receives cash from customers before it pays its suppliers', 'It is losing money on every sale', 'Its inventory is worth less than zero', 'It pays its suppliers before it buys the inventory'], answer: 0,
        why: R`Customers pay at the checkout, but suppliers are paid about 46 days later. The suppliers fund the working capital.` },
      { id: 'w8-q19', topic: 'ccc', kind: 'tf', level: 1, section: 'A', src: 'Lecture W8 slide 10',
        q: R`Airlines tend to have the lowest cash conversion cycles, while the construction sector sits at the other extreme.`,
        answer: true, why: R`Airline customers pay before they fly. Construction firms wait a long time to be paid for big projects.` },
      { id: 'w8-q20', topic: 'ccc', kind: 'num', level: 2, section: 'B', src: 'Tutorial W8 Q1', formula: 'ccc',
        q: R`**Sifty Sasha’s Exporters** had 2015 sales of $3,635 and COGS of $3,257. Use the **end-of-2015** balances in the table (as the tutorial solution does) and a 365-day year. What is the cash conversion cycle?`,
        table: { head: ['Balance', 'Start 2015', 'End 2015'], rows: [['Inventory', '390', '420'], ['Accounts receivable', '403', '432'], ['Accounts payable', '249', '272']] },
        answer: SIFTY.ccc, unit: 'days', dp: 2,
        mistakes: [
          { v: SIFTY.cccAddAP, why: 'Subtract the A/P days. Do not add them.' },
          { v: SIFTY.cccAvg, why: 'That uses average balances. This question uses the end-of-2015 balances.' },
          { v: SIFTY.cccSales, why: 'Inventory days and A/P days use COGS, not sales.' },
        ],
        steps: [
          R`Average daily sales \(= \frac{3{,}635}{365} = ${L.num(SIFTY.sales / 365)}\). Average daily COGS \(= \frac{3{,}257}{365} = ${L.num(SIFTY.cogs / 365)}\).`,
          R`\[\text{Inventory days} = \frac{420}{3{,}257/365} = ${L.num(SIFTY.inv)}\]`,
          R`\[\text{A/R days} = \frac{432}{3{,}635/365} = ${L.num(SIFTY.ar)}\]`,
          R`\[\text{A/P days} = \frac{272}{3{,}257/365} = ${L.num(SIFTY.ap)}\]`,
          R`\[CCC = ${L.num(SIFTY.inv)} + ${L.num(SIFTY.ar)} - ${L.num(SIFTY.ap)} = ${L.num(SIFTY.ccc)} \text{ days}\]`,
          R`The tutorial rounds the daily figures to 8.92 and 9.96 first and gets 59.97 days. Both answers are accepted.`,
        ],
        ti: [
          TI.line('420/(3257/365)→i', { note: 'Inventory days, stored in i. Inventory is divided by daily COGS.' }),
          TI.line('432/(3635/365)→a', { note: 'A/R days, stored in a. Receivables are divided by daily sales.' }),
          TI.line('i+a-272/(3257/365)', { note: 'Subtract the A/P days (payables divided by daily COGS).' }),
        ],
        why: R`Inventory days and A/P days on daily COGS, A/R days on daily sales. Then add, add, subtract.` },
      { id: 'w8-q21', topic: 'ccc', kind: 'num', level: 2, section: 'B', src: 'Task sheet W8 (A Ltd)', formula: 'ccc',
        q: R`**A Ltd** had sales of $35m and COGS of $20m in 2022. Year-end balances: accounts receivable $4.2m, inventory $3.0m, accounts payable $1.8m. Use a 365-day year. What is A Ltd’s **cash conversion cycle**?`,
        answer: COA.ccc, unit: 'days', dp: 2,
        mistakes: [
          { v: COA.op + COA.ap, why: 'Subtract the A/P days. Do not add them.' },
          { v: COA.cccSales, why: 'Inventory days and A/P days use COGS ($20m), not sales.' },
          { v: COA.cccCogs, why: 'A/R days use sales ($35m), not COGS.' },
        ],
        steps: [
          R`\[\text{A/R days} = \frac{4.2}{35/365} = 43.8 \qquad \text{Inventory days} = \frac{3}{20/365} = 54.75 \qquad \text{A/P days} = \frac{1.8}{20/365} = 32.85\]`,
          R`\[CCC = 54.75 + 43.8 - 32.85 = 65.7 \text{ days}\]`,
        ],
        ti: [
          TI.line('3/(20/365)→i', { note: 'Inventory days, stored in i (COGS).' }),
          TI.line('4.2/(35/365)→a', { note: 'A/R days, stored in a (sales).' }),
          TI.line('i+a-1.8/(20/365)', { note: 'Subtract the A/P days (COGS).' }),
        ],
        why: R`A Ltd has about 66 days of cash tied up between paying suppliers and collecting from customers.` },
      { id: 'w8-q22', topic: 'ccc', kind: 'mcq', level: 1, section: 'A', formula: 'ccc',
        q: R`All else equal, is a **shorter** cash conversion cycle better for a firm?`,
        choices: ['Yes: less cash is tied up in working capital, so free cash flow is higher', 'No: a longer cycle means more sales', 'No: a shorter cycle means the firm pays its suppliers too slowly', 'It makes no difference to firm value'], answer: 0,
        why: R`Every day cut from the cycle frees cash. The lecture’s goal: minimise the working capital tied up.` },
      { id: 'w8-q23', topic: 'ccc', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W8 slide 10',
        q: R`Why does **Dell’s** direct sales model give it a very short cash conversion cycle?`,
        choices: ['It orders the parts for a computer only after the customer has placed the order', 'It buys a year of parts in bulk to get discounts', 'It lets customers pay within 90 days', 'It pays its suppliers before they deliver'], answer: 0,
        why: R`Build-to-order keeps inventory tiny, and the customer’s order comes first. Little cash is ever tied up.` },

      /* ----- trade credit terms ----- */
      { id: 'w8-q24', topic: 'terms', kind: 'mcq', level: 1, section: 'A', src: 'Tutorial W8 concept check Q4',
        q: R`What do the trade credit terms **2/10, net 30** mean?`,
        choices: ['A 2% discount if you pay within 10 days; otherwise the full amount is due within 30 days', 'A 10% discount if you pay within 2 days; otherwise pay within 30 days', '2% interest is charged after 10 days, and the bill is due by day 30', 'A 2% discount if you pay within 30 days; otherwise pay within 10 days'], answer: 0,
        why: R`The first number is the discount (%), the second is the discount window (days), and “net” is the due date for the full amount.` },
      { id: 'w8-q25', topic: 'terms', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W8 slide 15',
        q: R`What do the terms **3/20, net 40** mean for the buyer?`,
        choices: ['Take 3% off if paying within 20 days; otherwise pay the full amount by day 40', 'Take 20% off if paying within 3 days', 'Pay 3% interest for every 20 days late', 'Take 3% off if paying within 40 days'], answer: 0,
        why: R`A 3% discount for paying within 20 days. Otherwise the full price is due by day 40.` },
      { id: 'w8-q26', topic: 'terms', kind: 'mcq', level: 2, section: 'A', src: 'Task sheet W8 Part 1',
        q: R`A Ltd sells on terms of **1/10, net 55**. For each $100 sale, what does offering the discount cost A Ltd if a customer takes it?`,
        choices: ['$1, which is 1% of the sale', '$10, which is 10% of the sale', '$55, the full credit period', 'Nothing, because the customer pays sooner'], answer: 0,
        why: R`The seller gives up the discount: \(1\% \times \$100 = \$1\). In return, the cash arrives much sooner.` },
      { id: 'w8-q27', topic: 'terms', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W8 slide 17',
        q: R`Terms are 2/10, net 30 on a $100 bill. If you skip the discount and pay on day 30, what are you effectively doing?`,
        choices: [R`Borrowing $98 for 20 days at \(\frac{2}{98} = 2.04\%\)`, 'Borrowing $100 for 30 days at 2%', 'Borrowing $98 for 30 days at 2%', 'Getting 20 days of credit for free'], answer: 0,
        why: R`You could pay $98 on day 10. If you wait until day 30, you pay $100. That is $2 of interest on $98 for 20 days.`,
        wrong: { 1: 'You only borrow the discounted price ($98), and only after the 10-day window.', 3: 'The credit costs you the $2 discount you give up.' } },

      /* ----- cost of trade credit ----- */
      { id: 'w8-q28', topic: 'tcost', kind: 'num', level: 2, section: 'B', src: 'Lecture W8 slide 17', formula: 'trade-credit',
        q: R`Terms are **2/10, net 30**. What is the effective annual cost of forgoing the discount? Use a 365-day year.`,
        answer: P(ear(0.02, 10, 30)), unit: '%', dp: 2,
        mistakes: [
          { v: P(Math.pow(1.02, 365 / 20) - 1), why: R`The period rate is \(\frac{2}{98}\), not 2%: you borrow the discounted price.` },
          { v: P(ear(0.02, 0, 30)), why: R`Use the extra days of credit, \(30 - 10 = 20\), not 30.` },
          { v: P((2 / 98) * (365 / 20)), why: 'That is simple interest. The EAR compounds the 20-day rate.' },
        ],
        steps: [R`Period rate: \(\frac{2}{98} = 2.0408\%\) for \(30 - 10 = 20\) days.`, R`\[EAR = ${earTex(0.02, 10, 30)} = (1.020408)^{18.25} - 1 = ${L.pct(ear(0.02, 10, 30), 2)}\]`],
        calc: earCalc(0.02, 10, 30),
        ti: [earTI(0.02, 10, 30)],
        why: R`About 44.6% a year: far dearer than a bank loan. The lecture advises taking the discount.` },
      { id: 'w8-q29', topic: 'tcost', kind: 'num', level: 2, section: 'B', src: 'Lecture W8 slide 18', formula: 'trade-credit',
        q: R`What is the effective annual cost of forgoing the discount on terms of **3/10, net 40**? Use a 365-day year.`,
        answer: P(ear(0.03, 10, 40)), unit: '%', dp: 2,
        mistakes: [
          { v: P(Math.pow(1.03, 365 / 30) - 1), why: R`The period rate is \(\frac{3}{97}\), not 3%.` },
          { v: P(ear(0.03, 0, 40)), why: R`Use \(40 - 10 = 30\) extra days, not 40.` },
          { v: P((3 / 97) * (365 / 30)), why: 'That is simple interest. Compound the 30-day rate.' },
        ],
        steps: [R`Period rate: \(\frac{3}{97} = 3.0928\%\) for \(40 - 10 = 30\) days.`, R`\[EAR = ${earTex(0.03, 10, 40)} = ${L.pct(ear(0.03, 10, 40), 2)}\]`],
        calc: earCalc(0.03, 10, 40),
        ti: [earTI(0.03, 10, 40)],
        why: R`A bigger discount over a longer window still costs about 44.86% a year.` },
      { id: 'w8-q30', topic: 'tcost', kind: 'num', level: 2, section: 'B', src: 'Tutorial W8 Q2(A)', formula: 'trade-credit',
        q: R`Your supplier, ABC Ltd, offers **2/20, net 60**. Assume a **360-day** year. What is the effective annual cost of giving up the discount?`,
        answer: P(ear(0.02, 20, 60, 360)), unit: '%', dp: 2,
        mistakes: [
          { v: P(ear(0.02, 20, 60)), why: 'The question says to use a 360-day year, not 365.' },
          { v: P(ear(0.02, 0, 60, 360)), why: R`Use \(60 - 20 = 40\) extra days, not 60.` },
          { v: P((2 / 98) * (360 / 40)), why: 'That is simple interest. Compound the 40-day rate 9 times.' },
        ],
        steps: [R`Period rate: \(\frac{2}{98} = 2.0408\%\) for \(60 - 20 = 40\) days. There are \(\frac{360}{40} = 9\) such periods a year.`, R`\[EAR = (1.020408)^{9} - 1 = ${L.pct(ear(0.02, 20, 60, 360), 2)}\]`],
        calc: earCalc(0.02, 20, 60, 360),
        ti: [earTI(0.02, 20, 60, 360)],
        why: R`About 19.94% a year, which is dearer than a 15% bank loan.` },
      { id: 'w8-q31', topic: 'tcost', kind: 'mcq', level: 2, section: 'A', formula: 'trade-credit',
        q: R`Why is the period rate \(\frac{d}{1-d}\) (e.g. \(\frac{2}{98}\)) rather than just \(d\) (2%)?`,
        choices: ['If you skip the discount, you borrow only the discounted price, and pay the discount as interest', 'Because interest is always paid in advance', 'To convert the rate into an annual rate', 'Because the seller keeps part of the discount'], answer: 0,
        why: R`On a $100 bill you could pay $98. Waiting costs $2 of interest on $98: \(\frac{2}{98} = 2.04\%\).` },
      { id: 'w8-q32', topic: 'tcost', kind: 'mcq', level: 2, section: 'A', formula: 'trade-credit',
        q: R`In the EAR formula, why is the exponent \(\frac{365}{\text{net} - \text{discount days}}\) and not \(\frac{365}{\text{net}}\)?`,
        choices: ['You only gain the days after the discount window; the first days are free either way', 'Because suppliers never allow the full net period', 'Because the discount days are paid in cash', 'To turn a 360-day year into a 365-day year'], answer: 0,
        why: R`Paying on day 10 or on day 30 differs by 20 days. That 20-day loan is what the discount buys.` },
      { id: 'w8-q33', topic: 'tcost', kind: 'tf', level: 2, section: 'A', src: 'Tutorial W8 Q2', formula: 'trade-credit',
        q: R`For the same credit terms, a 360-day year gives a slightly **lower** EAR than a 365-day year.`,
        answer: true, why: R`Fewer compounding periods a year. For 2/20, net 60: \(19.94\%\) with 360 days, but \(${L.pct(ear(0.02, 20, 60), 2)}\) with 365 days.` },

      /* ----- payables ----- */
      { id: 'w8-q34', topic: 'payables', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W8 slide 17',
        q: R`Forgoing a 2/10, net 30 discount costs 44.6% a year. The bank lends at 15%. The firm needs finance. What should it do?`,
        choices: ['Borrow from the bank and pay the supplier on day 10', 'Forgo the discount and pay on day 30', 'Forgo the discount and pay on day 20', 'Borrow from the bank and pay the supplier on day 30'], answer: 0,
        why: R`Trade credit (44.6%) is dearer than the bank (15%). So take the discount, funded by the cheaper bank loan, and pay on the last discount day.` },
      { id: 'w8-q35', topic: 'payables', kind: 'mcq', level: 2, section: 'B', src: 'Tutorial W8 Q2(B)',
        q: R`ABC Ltd offers 2/20, net 60 (EAR 19.94% with a 360-day year). Your bank lends at 15%. You need short-term finance. What should you do?`,
        choices: ['Take the discount, pay on day 20, and borrow from the bank', 'Give up the discount and pay on day 60', 'Give up the discount and pay on day 40', 'Take the discount, but pay on day 60'], answer: 0,
        why: R`The trade credit costs 19.94%, more than the bank’s 15%. Borrow from the bank and take the discount.`,
        steps: [R`\[EAR = \left(1 + \frac{2}{98}\right)^{\frac{360}{60 - 20}} - 1 = ${L.pct(ear(0.02, 20, 60, 360), 2)}\]`, R`\(19.94\% > 15\%\): trade credit is the dearer loan. Take the discount, pay on day 20, and fund it with the bank loan.`],
        ti: [earTI(0.02, 20, 60, 360, R`That is \(${L.pct(ear(0.02, 20, 60, 360), 2)}\) a year: more than the bank’s 15%, so take the discount.`)],
        wrong: { 3: 'The discount is only available if you pay within 20 days.' } },
      { id: 'w8-q36', topic: 'payables', kind: 'num', level: 2, section: 'B', src: 'Tutorial W8 Q2(C)', formula: 'trade-credit',
        q: R`ABC Ltd offers 2/20, net 60, but you could stretch your payment by 20 days, to day 80. Using a **360-day** year, what is the effective annual cost of forgoing the discount now?`,
        answer: P(ear(0.02, 20, 80, 360)), unit: '%', dp: 2,
        mistakes: [
          { v: P(ear(0.02, 20, 60, 360)), why: 'That is the cost of paying on day 60. With stretching you pay on day 80.' },
          { v: P(ear(0.02, 0, 80, 360)), why: R`Use \(80 - 20 = 60\) extra days, not 80.` },
          { v: P(ear(0.02, 20, 80)), why: 'The question says to use a 360-day year.' },
        ],
        steps: [R`Stretching makes the terms like 2/20, net 80: a \(80 - 20 = 60\)-day loan.`, R`\[EAR = (1.020408)^{\frac{360}{60}} - 1 = (1.020408)^{6} - 1 = ${L.pct(ear(0.02, 20, 80, 360), 2)}\]`],
        calc: earCalc(0.02, 20, 80, 360),
        ti: [earTI(0.02, 20, 80, 360)],
        why: R`Stretching cuts the cost to about 12.89%, below the bank’s 15%.` },
      { id: 'w8-q37', topic: 'payables', kind: 'mcq', level: 2, section: 'A', src: 'Tutorial W8 Q2(C)',
        q: R`Stretching ABC Ltd’s terms to day 80 cuts the cost of trade credit to 12.89%, below the bank’s 15%. What is the best description of the choice?`,
        choices: ['Forgo the discount and pay on day 80, but beware the risk of losing the supplier or your credit rating', 'Keep borrowing from the bank, because stretching is illegal', 'Pay on day 20, because stretching has no benefit', 'Stretching has no risks, so always pay as late as possible'], answer: 0,
        why: R`On cost alone, stretching wins. But the supplier may stop dealing with you, and a poor credit rating can make other credit dearer.` },
      { id: 'w8-q38', topic: 'payables', kind: 'num', level: 2, section: 'B', src: 'Lecture W8 slides 25–26', formula: 'ap-days',
        q: R`**Uwe Company** has an average accounts payable balance of $250,000. Its daily COGS is $14,000. How many days does Uwe take to pay its suppliers?`,
        answer: UWE, unit: 'days', dp: 2,
        mistakes: [
          { v: 14000 / 250000 * 365, why: 'Divide the payables balance by daily COGS, not the other way round.' },
          { v: 250000 / (14000 * 365) * 360, why: 'Daily COGS is already given. Do not convert it with a 360-day year.' },
        ],
        steps: [R`\[\text{A/P days} = \frac{\text{Accounts payable}}{\text{Average daily COGS}} = \frac{250{,}000}{14{,}000} = ${L.num(UWE)} \text{ days}\]`],
        ti: [TI.line('250000/14000', { note: 'Daily COGS is already given, so divide straight away.' })],
        why: R`About 17.9 days. On 2/15, net 40 terms, that is too late for the discount and too early for the due date.` },
      { id: 'w8-q39', topic: 'payables', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W8 slide 26',
        q: R`Uwe gets terms of **2/15, net 40** and pays after about 18 days. What is wrong with this?`,
        choices: ['It misses the 2% discount by 3 days, and it also gives up 22 more days of credit', 'Nothing: 18 days is inside the 40-day credit period', 'It pays too late, so the supplier will charge a penalty', 'It should pay on day 40 and still take the 2% discount'], answer: 0,
        why: R`Pay by day 15 to get the discount. If you skip the discount, wait until day 40. Paying on day 18 loses both.`,
        wrong: { 3: 'The discount is only available within the first 15 days.' } },
      { id: 'w8-q40', topic: 'payables', kind: 'num', level: 1, section: 'B', src: 'Lecture W8 slide 28', formula: 'trade-credit',
        q: R`Terms are **1/15, net 40**. The firm pays on day 40. What is the effective annual cost of forgoing the discount? Use a 365-day year.`,
        answer: P(ear(0.01, 15, 40)), unit: '%', dp: 2,
        mistakes: [
          { v: P(Math.pow(1.01, 365 / 25) - 1), why: R`The period rate is \(\frac{1}{99}\), not 1%.` },
          { v: P(ear(0.01, 0, 40)), why: R`Use \(40 - 15 = 25\) extra days, not 40.` },
          { v: P((1 / 99) * (365 / 25)), why: 'That is simple interest. Compound the 25-day rate.' },
        ],
        steps: [R`\[EAR = ${earTex(0.01, 15, 40)} = ${L.pct(ear(0.01, 15, 40), 2)}\]`],
        calc: earCalc(0.01, 15, 40),
        ti: [earTI(0.01, 15, 40)],
        why: R`Paying on day 40 costs about 15.80% a year.` },
      { id: 'w8-q41', topic: 'payables', kind: 'num', level: 2, section: 'B', src: 'Lecture W8 slide 28', formula: 'trade-credit',
        q: R`Terms are **1/15, net 40**, but the firm **stretches** its payables and pays on day 60. What is the effective annual cost now? Use a 365-day year.`,
        answer: P(ear(0.01, 15, 60)), unit: '%', dp: 2,
        mistakes: [
          { v: P(ear(0.01, 15, 40)), why: 'That is the cost of paying on day 40. The firm pays on day 60.' },
          { v: P(ear(0.01, 0, 60)), why: 'The loan runs from day 15 to day 60: 45 days, not 60.' },
          { v: P((1 / 99) * (365 / 45)), why: 'That is simple interest. Compound the 45-day rate.' },
        ],
        steps: [R`The firm now borrows for \(60 - 15 = 45\) days.`, R`\[EAR = \left(1 + \frac{1}{99}\right)^{\frac{365}{45}} - 1 = ${L.pct(ear(0.01, 15, 60), 2)}\]`],
        calc: earCalc(0.01, 15, 60),
        ti: [earTI(0.01, 15, 60)],
        why: R`Stretching to day 60 cuts the cost from 15.80% to 8.49%. It is cheap, but it risks the supplier relationship.` },
      { id: 'w8-q42', topic: 'payables', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W8 slide 27',
        q: R`Which is a real risk of **stretching** accounts payable (paying after the due date)?`,
        choices: ['The supplier may demand cash on delivery or stop supplying the firm', 'The supplier will give a larger discount next time', 'The firm’s cash conversion cycle gets longer', 'The firm’s A/P days fall'], answer: 0,
        why: R`Late payment is cheap credit, but suppliers can impose cash-on-delivery terms, cut the firm off, or damage its credit rating.` },
      { id: 'w8-q43', topic: 'payables', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W8 slide 26',
        q: R`A firm has decided to **forgo** a trade discount. When should it pay the supplier?`,
        choices: ['On the last day of the net period', 'On the last day of the discount period', 'Halfway between the discount date and the due date', 'Straight away, to keep the supplier happy'], answer: 0,
        why: R`Once the discount is gone, extra days of credit are free. Use all of them: pay on the due date.` },
      { id: 'w8-q44', topic: 'payables', kind: 'mcq', level: 2, section: 'B', src: 'Task sheet W8 Part 1 (Company A)',
        q: R`Company A buys from Supplier E on **1/20, net 40**. The bank lends to Company A at 15%. Using a 365-day year, what should Company A do?`,
        choices: [R`Take the discount: the EAR is \(${L.pct(ear(0.01, 20, 40), 2)}\), above 15%. Borrow from the bank and pay on day 20.`, R`Forgo the discount: the EAR is \(${L.pct(ear(0.01, 20, 40), 2)}\), so pay on day 40.`, R`Forgo the discount: the cost is only 1%, so pay on day 40.`, 'Pay on day 30 to balance the two costs.'], answer: 0,
        why: R`\(EAR = ${earTex(0.01, 20, 40)} = ${L.pct(ear(0.01, 20, 40), 2)}\) is above the 15% bank rate, so take the discount.`,
        steps: [R`Period rate: \(\frac{1}{99} = 1.0101\%\) for \(40 - 20 = 20\) days.`, R`\[EAR = ${earTex(0.01, 20, 40)} = ${L.pct(ear(0.01, 20, 40), 2)}\]`, R`\(${L.pct(ear(0.01, 20, 40), 2)} > 15\%\): borrow from the bank and pay Supplier E on day 20.`],
        ti: [earTI(0.01, 20, 40, 365, R`That is \(${L.pct(ear(0.01, 20, 40), 2)}\) a year: more than the bank’s 15%, so take the discount.`)] },
      { id: 'w8-q45', topic: 'payables', kind: 'mcq', level: 2, section: 'B', src: 'Task sheet W8 Part 1 (Company D)',
        q: R`Company D buys from Supplier C on **2/10, net 60**. The bank lends to Company D at 20%. Using a 365-day year, what should Company D do?`,
        choices: [R`Forgo the discount and pay on day 60: the EAR is \(${L.pct(ear(0.02, 10, 60), 2)}\), below 20%`, R`Take the discount and borrow at 20%: 2% for 50 days is expensive`, R`Forgo the discount and pay on day 10`, R`Take the discount and pay on day 60`], answer: 0,
        why: R`\(EAR = ${earTex(0.02, 10, 60)} = ${L.pct(ear(0.02, 10, 60), 2)}\). That is cheaper than the bank, so use the trade credit fully.`,
        steps: [R`Period rate: \(\frac{2}{98} = 2.0408\%\) for \(60 - 10 = 50\) days.`, R`\[EAR = ${earTex(0.02, 10, 60)} = ${L.pct(ear(0.02, 10, 60), 2)}\]`, R`\(${L.pct(ear(0.02, 10, 60), 2)} < 20\%\): skip the discount and pay Supplier C on day 60.`],
        ti: [earTI(0.02, 10, 60, 365, R`That is \(${L.pct(ear(0.02, 10, 60), 2)}\) a year: less than the bank’s 20%, so skip the discount and pay on day 60.`)] },
      { id: 'w8-q46', topic: 'payables', kind: 'mcq', level: 2, section: 'A', src: 'Task sheet W8 Part 2 (Company C)',
        q: R`Company C’s supplier offers **2/10, net 30**. Company C’s A/P days are ${T.num(COC_AP)}. Is it managing its payables well?`,
        choices: ['No: it pays after the 30-day due date, which signals cash-flow trouble', 'Yes: it pays within the discount period', 'Yes: it pays exactly on the due date', 'No: it pays too early and wastes free credit'], answer: 0,
        why: R`\(\frac{2.2}{24/365} = ${L.num(COC_AP)}\) days is past day 30. It should take the discount (bank-funded) or at least pay by day 30.`,
        ti: [TI.line('2.2/(24/365)', { note: 'A/P days: payables divided by daily COGS.' })] },

      { id: 'w8-q60', topic: 'payables', kind: 'mcq', level: 2, section: 'B', src: 'Task sheet W8 Part 1 (Company B)',
        q: R`Company B buys from Supplier A on **1/10, net 55**. The bank lends to Company B at 15%. Using a 365-day year, what should Company B do?`,
        choices: [R`Forgo the discount and pay on day 55: the EAR is \(${L.pct(ear(0.01, 10, 55), 2)}\), below 15%`, R`Take the discount and borrow at 15%, paying on day 10`, R`Forgo the discount and pay on day 30`, R`Take the discount but pay on day 55`], answer: 0,
        why: R`\(EAR = ${earTex(0.01, 10, 55)} = ${L.pct(ear(0.01, 10, 55), 2)}\). The long 45-day window makes trade credit cheap, so use it fully.`,
        steps: [R`Period rate: \(\frac{1}{99} = 1.0101\%\) for \(55 - 10 = 45\) days.`, R`\[EAR = ${earTex(0.01, 10, 55)} = ${L.pct(ear(0.01, 10, 55), 2)}\]`, R`\(${L.pct(ear(0.01, 10, 55), 2)} < 15\%\): skip the discount and pay on day 55.`],
        ti: [earTI(0.01, 10, 55, 365, R`That is \(${L.pct(ear(0.01, 10, 55), 2)}\) a year: less than the bank’s 15%, so skip the discount and pay on day 55.`)] },
      { id: 'w8-q61', topic: 'payables', kind: 'mcq', level: 2, section: 'B', src: 'Task sheet W8 Part 1 (Company C)',
        q: R`Company C buys from Supplier B on **2/10, net 30**. The bank lends to Company C at 20%. Using a 365-day year, what should Company C do?`,
        choices: [R`Take the discount: the EAR is \(${L.pct(ear(0.02, 10, 30), 2)}\), above 20%. Borrow and pay on day 10.`, R`Forgo the discount and pay on day 30, because 2% is less than 20%`, R`Forgo the discount and pay on day 20`, R`Take the discount but pay on day 30`], answer: 0,
        why: R`\(EAR = ${earTex(0.02, 10, 30)} = ${L.pct(ear(0.02, 10, 30), 2)}\), far above the 20% bank rate.`,
        steps: [R`\[EAR = ${earTex(0.02, 10, 30)} = ${L.pct(ear(0.02, 10, 30), 2)}\]`, R`\(${L.pct(ear(0.02, 10, 30), 2)} > 20\%\): borrow from the bank and pay on day 10.`],
        ti: [earTI(0.02, 10, 30, 365, R`That is \(${L.pct(ear(0.02, 10, 30), 2)}\) a year: far more than the bank’s 20%, so take the discount.`)],
        wrong: { 1: R`The 2% is for 20 days only. As a yearly rate it is about 44.6%.` } },
      { id: 'w8-q62', topic: 'payables', kind: 'mcq', level: 2, section: 'B', src: 'Task sheet W8 Part 1 (Company E)',
        q: R`Company E buys from Supplier D on **2/15, net 35**. The bank lends to Company E at 18%. Using a 365-day year, what should Company E do?`,
        choices: [R`Take the discount: borrow at 18% and pay on day 15`, R`Forgo the discount and pay on day 35`, R`Forgo the discount and pay on day 25`, R`Take the discount but pay on day 35`], answer: 0,
        why: R`\(EAR = ${earTex(0.02, 15, 35)} = ${L.pct(ear(0.02, 15, 35), 2)}\), well above 18%. If E cannot pay by day 15, it should wait until day 35.`,
        steps: [R`\[EAR = ${earTex(0.02, 15, 35)} = ${L.pct(ear(0.02, 15, 35), 2)}\]`, R`\(${L.pct(ear(0.02, 15, 35), 2)} > 18\%\): take the discount and pay on day 15.`],
        ti: [earTI(0.02, 15, 35, 365, R`That is \(${L.pct(ear(0.02, 15, 35), 2)}\) a year: more than the bank’s 18%, so take the discount.`)] },
      { id: 'w8-q63', topic: 'tcost', kind: 'mcq', level: 2, section: 'B', src: 'Task sheet W8 Part 1',
        q: R`Five firms in one supply chain face the terms and bank rates in the table. Using a 365-day year, which firms should **forgo** the discount and pay on the last day?`,
        table: { head: ['Company', 'Terms from its supplier', 'Bank rate'], rows: [['A', '1/20, net 40', '15%'], ['B', '1/10, net 55', '15%'], ['C', '2/10, net 30', '20%'], ['D', '2/10, net 60', '20%'], ['E', '2/15, net 35', '18%']] },
        choices: ['B and D', 'A and C', 'A, C and E', 'Only D'], answer: 0,
        why: R`Only B (\(${L.pct(ear(0.01, 10, 55), 2)}\)) and D (\(${L.pct(ear(0.02, 10, 60), 2)}\)) have trade credit cheaper than their bank.`,
        steps: [
          R`A: \(${L.pct(ear(0.01, 20, 40), 2)} > 15\%\), take. B: \(${L.pct(ear(0.01, 10, 55), 2)} < 15\%\), forgo.`,
          R`C: \(${L.pct(ear(0.02, 10, 30), 2)} > 20\%\), take. D: \(${L.pct(ear(0.02, 10, 60), 2)} < 20\%\), forgo.`,
          R`E: \(${L.pct(ear(0.02, 15, 35), 2)} > 18\%\), take.`,
        ] },

      /* ----- receivables and credit policy ----- */
      { id: 'w8-q47', topic: 'receivables', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W8 slide 22',
        q: R`What does an **ageing schedule** show?`,
        choices: ['Receivables grouped by how many days they have been outstanding', 'The percentage of each month’s sales collected in each later month', 'How long inventory sits before it is sold', 'The due dates of the firm’s own bills'], answer: 0,
        why: R`It sorts accounts (by number or by dollar value) into age bands, so old, risky debts stand out.` },
      { id: 'w8-q48', topic: 'receivables', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W8 slide 22',
        q: R`Which receivables tool shows the **percentage of each month’s sales** that is collected in each month after the sale?`,
        choices: ['A payment pattern', 'An ageing schedule', 'Inventory days', 'The cash conversion cycle'], answer: 0,
        why: R`A payment pattern tracks collections over time, for example 30% in the month of sale and 50% the month after.` },
      { id: 'w8-q49', topic: 'receivables', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W8 slide 22', formula: 'ar-days',
        q: R`What do **accounts receivable days** measure?`,
        choices: ['The average number of days a firm takes to collect cash from its credit sales', 'The average number of days a firm takes to pay its suppliers', 'The number of days of stock the firm holds', 'The length of the operating cycle'], answer: 0,
        why: R`\(\text{A/R days} = \frac{\text{Accounts receivable}}{Sales/365}\): the average collection time.` },
      { id: 'w8-q50', topic: 'receivables', kind: 'num', level: 3, section: 'B', src: 'Lecture W8 slides 19–21', boss: true,
        q: R`Your product sells for $100 and costs $60 to make. You sell 500 units a month. Half of the customers pay cash now and take a 1% discount; the rest pay full price in 30 days. The required return is 1% per month, and the policy runs forever. What is the NPV of this **current policy**?`,
        answer: CREDIT.cur, unit: '$', dp: 2,
        mistakes: [
          { v: (250 * 99 + 250 * 100 - 500 * 60) / 0.01, why: 'That ignores timing: the credit sales arrive one month after the costs are paid.' },
          { v: -5000 + (25000 - 5000) / 0.01, why: 'The cash customers take a 1% discount: they pay $99, not $100.' },
          { v: CREDIT.net0 + CREDIT.credit / 0.01, why: 'From month 1 on, each month has both the credit receipts and the new month’s net outflow.' },
        ],
        steps: [
          R`Each month: production costs \(500 \times 60 = \$30{,}000\), paid now. Cash sales \(250 \times 99 = \$24{,}750\), received now. Credit sales \(250 \times 100 = \$25{,}000\), received a month later.`,
          R`Month 0: \(-30{,}000 + 24{,}750 = -\$5{,}250\).`,
          R`Every month after: \(25{,}000 - 5{,}250 = \$19{,}750\), forever.`,
          R`\[NPV_{current} = -5{,}250 + \frac{19{,}750}{0.01} = \$1{,}969{,}750\]`,
        ],
        ti: [TI.line('-500*60+250*99', { note: 'Month 0: pay the production costs, receive the cash sales.' }), TI.line('-5250+(250*100-5250)/0.01', { note: 'Month 0, plus the monthly perpetuity: credit sales in, less the next month’s net outflow.' })],
        why: R`Lay out one month’s cash flows, then value the repeating part as a monthly perpetuity at 1%.` },
      { id: 'w8-q51', topic: 'receivables', kind: 'num', level: 3, section: 'B', src: 'Lecture W8 slides 19–21', boss: true,
        q: R`Same firm (price $100, cost $60, 1% per month). If it **drops** the 1% cash discount, it sells 480 units a month and every customer pays in 30 days. The current policy is worth $1,969,750. What is the **NPV of switching** to the new policy?`,
        answer: CREDIT.sw, unit: '$', dp: 2,
        mistakes: [
          { v: CREDIT.nw, why: 'That is the NPV of the new policy alone. Subtract the current policy’s NPV.' },
          { v: ((480 * 100 - 480 * 60) - (250 * 99 + 250 * 100 - 500 * 60)) / 0.01, why: 'That ignores timing: credit sales arrive one month after the costs are paid.' },
          { v: -500 * 60 + (500 * 100 - 500 * 60) / 0.01 - CREDIT.cur, why: 'You kept 500 units. Dropping the discount loses 20 sales a month.' },
        ],
        steps: [
          R`New policy, month 0: \(-480 \times 60 = -\$28{,}800\). Every month after: \(480 \times 100 - 28{,}800 = \$19{,}200\).`,
          R`\[NPV_{new} = -28{,}800 + \frac{19{,}200}{0.01} = \$1{,}891{,}200\]`,
          R`\[NPV_{switch} = 1{,}891{,}200 - 1{,}969{,}750 = -\$78{,}550\]`,
          R`Negative, so do **not** switch: keep the cash discount.`,
        ],
        ti: [TI.line('-480*60+(480*100-480*60)/0.01', { note: 'The NPV of the new policy.' }), TI.line('ans-1969750', { note: 'New policy minus current policy.' })],
        why: R`Dropping the discount delays every receipt and loses 20 sales a month. That costs more than the 1% discount saves.` },
      { id: 'w8-q52', topic: 'receivables', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W8 slide 21',
        q: R`Current credit policy NPV: $1,969,750. NPV if the cash discount is dropped: $1,891,200. What should the firm do?`,
        choices: ['Keep the 1% cash discount: switching has an NPV of −$78,550', 'Drop the discount: customers will pay the full price', 'Drop the discount: the firm keeps 1% more of every sale', 'It does not matter: both NPVs are positive'], answer: 0,
        why: R`Compare the two policies: \(1{,}891{,}200 - 1{,}969{,}750 = -\$78{,}550\). Switching destroys value.` },
      { id: 'w8-q53', topic: 'receivables', kind: 'mcq', level: 2, section: 'A', src: 'Task sheet W8 Part 2 (Company B)',
        q: R`Company B sells on **2/10, net 30**. Its A/R days are ${T.num(COB_AR)}. Is it managing its receivables well?`,
        choices: ['No: on average, customers pay after the 30-day due date', 'Yes: collections are inside the 30-day credit period', 'Yes: most customers take the 2% discount', 'It cannot be judged without the firm’s A/P days'], answer: 0,
        why: R`\(\frac{4}{37/365} = ${L.num(COB_AR)}\) days is past the 30-day limit. Past-due accounts may signal customers in trouble.`,
        ti: [TI.line('4/(37/365)', { note: 'A/R days: receivables divided by daily sales.' })] },

      /* ----- inventory and cash ----- */
      { id: 'w8-q54', topic: 'invcash', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W8 slide 29',
        q: R`Holding **too much** inventory is costly. Which costs does the lecture list?`,
        choices: ['Acquisition and order costs, and carrying costs', 'Stock-out costs only', 'Interest on accounts payable', 'The cost of offering a cash discount'], answer: 0,
        why: R`Extra stock must be bought, ordered, stored and insured. Holding too little risks **stock-outs**.` },
      { id: 'w8-q55', topic: 'invcash', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W8 slide 29',
        q: R`What is **just-in-time (JIT)** inventory management?`,
        choices: ['Buying inventory exactly when it is needed, so the balance stays near zero', 'Buying a year’s supply at once to lock in prices', 'Paying suppliers just before the due date', 'Selling inventory just before it expires'], answer: 0,
        why: R`JIT keeps inventory days close to zero, which shortens the cash conversion cycle.` },
      { id: 'w8-q56', topic: 'invcash', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W8 slide 30',
        q: R`A bank requires a firm to keep a minimum balance in its account. This is a…`,
        choices: ['Compensating balance', 'Precautionary balance', 'Day-to-day (transactions) balance', 'Trade credit balance'], answer: 0,
        why: R`The three reasons to hold cash: day-to-day needs, a precautionary balance for surprises, and a compensating balance the bank requires.` },
      { id: 'w8-q57', topic: 'invcash', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W8 slide 30',
        q: R`Where does the lecture suggest a firm can put spare cash that it may need soon?`,
        choices: ['Short-term government debt or bank-accepted bills', 'Shares in a start-up', 'Ten-year corporate bonds', 'Extra inventory'], answer: 0,
        why: R`Short-term, low-risk securities earn some interest and convert back to cash quickly.` },
      { id: 'w8-q58', topic: 'invcash', kind: 'tf', level: 1, section: 'A', src: 'Lecture W8 slide 30',
        q: R`Cash earns no interest or very little, so holding more cash than needed has a cost.`,
        answer: true, why: R`Idle cash could be earning a return elsewhere or be paid out to shareholders.` },
      { id: 'w8-q59', topic: 'invcash', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W8 slide 29',
        q: R`What is the main **benefit** of holding enough inventory?`,
        choices: ['It helps prevent stock-outs and lost sales', 'It shortens the cash conversion cycle', 'It lowers carrying costs', 'It raises free cash flow'], answer: 0,
        why: R`Enough stock means customers are served. The trade-off is the cost of carrying it.` },
    ],

    generators: [
      /* ---------- net working capital ---------- */
      { id: 'w8-g-nwc', topic: 'nwc', level: 1, section: 'B', src: 'Task sheet W8',
        make(rng) {
          const co = rng.company();
          const cash = rng.step(0.5, 3, 0.1), ar = rng.step(2, 8, 0.1), inv = rng.step(1.5, 7, 0.1);
          const ap = rng.step(1, 4, 0.1), accr = rng.step(1, 5, 0.1), ltd = rng.step(2, 10, 0.5), ppe = rng.step(5, 20, 0.5);
          const ca = cash + ar + inv, cl = ap + accr, nwc = ca - cl;
          return {
            q: R`${co}’s balance sheet (in $m) is shown in the table. What is its **net working capital** (in $m)?`,
            table: { head: ['Item', '$m'], rows: [['Cash', cash.toFixed(1)], ['Accounts receivable', ar.toFixed(1)], ['Inventory', inv.toFixed(1)], ['Property, plant and equipment', ppe.toFixed(1)], ['Accounts payable', ap.toFixed(1)], ['Accruals', accr.toFixed(1)], ['Long-term debt', ltd.toFixed(1)]] },
            answer: nwc, unit: '$m', dp: 2,
            mistakes: uniq(nwc, [
              { v: ca - ap, why: 'Accruals are a current liability too. Subtract them.' },
              { v: nwc - ltd, why: 'Long-term debt is not a current liability. Leave it out.' },
              { v: nwc - cash, why: 'Cash is a current asset. Include it.' },
              { v: nwc + ppe, why: 'Property, plant and equipment is a long-term asset. Leave it out.' },
            ], '$m', 2),
            steps: [
              R`Current assets: \(${cash.toFixed(1)} + ${ar.toFixed(1)} + ${inv.toFixed(1)} = ${ca.toFixed(1)}\)`,
              R`Current liabilities: \(${ap.toFixed(1)} + ${accr.toFixed(1)} = ${cl.toFixed(1)}\)`,
              R`\[NWC = ${ca.toFixed(1)} - ${cl.toFixed(1)} = ${milL(nwc)}\]`,
            ],
            ti: [TI.line(`${cash.toFixed(1)}+${ar.toFixed(1)}+${inv.toFixed(1)}-${ap.toFixed(1)}-${accr.toFixed(1)}`, { note: 'Cash, receivables and inventory, less payables and accruals ($m). PP&E and long-term debt stay out.' })],
            why: R`Only current items count. PP&E and long-term debt are left out.`,
          };
        } },
      { id: 'w8-g-value', topic: 'nwc', level: 2, section: 'B', formula: 'pv-grow-perp', src: 'Lecture W8 slides 12–13',
        make(rng) {
          const co = rng.company();
          for (let k = 0; k < 60; k++) {
          const ni = rng.step(5, 40, 1), dep = rng.step(1, 8, 0.5), capex = rng.step(1, 10, 0.5), dwc = rng.step(0.2, 3, 0.1);
          const r = rng.step(0.08, 0.14, 0.01), g = rng.step(0.01, 0.05, 0.01);
          const fcf = ni + dep - capex - dwc;
          if (fcf < 1) continue;
          const v = fcf / (r - g);
          return {
            q: R`${co} expects next year: net income ${mil(ni)}, depreciation ${mil(dep)}, capital expenditure ${mil(capex)} and an increase in working capital of ${mil(dwc)}. Free cash flow then grows ${pct(g)} a year forever. The cost of capital is ${pct(r)}. What is the firm worth (in $m)?`,
            givens: [['NI', milL(ni)], ['Dep', milL(dep)], ['CapEx', milL(capex)], [R`\Delta NWC`, milL(dwc)], ['r', L.pctT(r)], ['g', L.pctT(g)]],
            answer: v, unit: '$m', dp: 2,
            mistakes: uniq(v, [
              { v: (ni + dep - capex) / (r - g), why: 'You forgot to subtract the increase in working capital.' },
              { v: fcf / r, why: R`That ignores growth. A growing perpetuity divides by \(r - g\).` },
              { v: ni / (r - g), why: 'That values net income. Value the free cash flow instead.' },
              { v: (fcf * (1 + g)) / (r - g), why: 'These figures are already next year’s. Do not grow them again.' },
            ], '$m', 2),
            steps: [
              R`\[FCF_1 = ${K(ni, 2)} + ${K(dep, 2)} - ${K(capex, 2)} - ${K(dwc, 2)} = ${milL(fcf)}\]`,
              R`\[V = \frac{FCF_1}{r - g} = \frac{${L.numT(fcf, 2)}}{${L.dec(r)} - ${L.dec(g)}} = ${milL(v)}\]`,
            ],
            ti: [TI.line(`(${tn(ni)}+${tn(dep)}-${tn(capex)}-${tn(dwc)})/(${tn(r)}-${tn(g)})`, { note: R`Next year’s FCF ($m), divided by \(r - g\).` })],
            why: R`Build next year’s FCF, then value it as a growing perpetuity.`,
          };
          }
          return null;
        } },
      { id: 'w8-g-emerald', topic: 'nwc', level: 3, section: 'B', formula: 'pv-grow-perp', src: 'Lecture W8 slide 14', boss: true,
        make(rng) {
          const co = rng.company();
          for (let k = 0; k < 60; k++) {
            const ni = rng.step(5, 40, 1), dep = rng.step(1, 8, 0.5), capex = rng.step(1, 10, 0.5), dwc = rng.step(0.5, 3, 0.1);
            const r = rng.step(0.08, 0.14, 0.01), g = rng.step(0.01, 0.05, 0.01);
            const fcf = ni + dep - capex - dwc;
            if (fcf < 1) continue;
            const cut = rng.pick([0.1, 0.2, 0.25, 0.3, 0.4, 0.5]);
            const save = cut * dwc, gain = (save / (r - g)) * 1e6;
            const v0 = fcf / (r - g), v1 = (fcf + save) / (r - g);
            return {
              q: R`${co} expects next year: net income ${mil(ni)}, depreciation ${mil(dep)}, capital expenditure ${mil(capex)} and an increase in working capital of ${mil(dwc)}. FCF grows ${pct(g)} a year forever, and \(r = ${L.pctT(r)}\). If it cuts the yearly increase in working capital by ${pct(cut)}, by how much does the firm’s **value rise** (in $)?`,
              givens: [[R`\Delta NWC`, milL(dwc)], [R`\text{cut}`, L.pctT(cut)], ['r', L.pctT(r)], ['g', L.pctT(g)]],
              answer: gain, unit: '$', dp: 0,
              mistakes: uniq(gain, [
                { v: (save / r) * 1e6, why: R`The saving grows with FCF. Divide by \(r - g\), not \(r\).` },
                { v: save * 1e6, why: 'That is one year’s saving. The saving recurs and grows forever.' },
                { v: ((save * (1 + g)) / (r - g)) * 1e6, why: 'The saving starts next year already. Do not grow it again.' },
                { v: v1 * 1e6, why: 'That is the new firm value. The question asks for the rise in value.' },
              ], '$', 0),
              steps: [
                R`Yearly saving: \(${L.dec(cut)} \times ${milL(dwc)} = ${milL(save)}\), so FCF rises by that much every year.`,
                R`\[\Delta V = \frac{\text{saving}}{r - g} = \frac{${LM(save * 1e6)}}{${L.dec(r)} - ${L.dec(g)}} = ${LM(gain, 0)}\]`,
                R`Check: \(FCF_1\) rises from \(${milL(fcf)}\) to \(${milL(fcf + save)}\), so the value rises from \(${milL(v0)}\) to \(${milL(v1)}\).`,
              ],
              ti: [TI.line(`${tn(cut)}*${tn(dwc * 1e6)}/(${tn(r)}-${tn(g)})`, { note: R`The yearly saving in dollars, valued as a growing perpetuity: divide by \(r - g\).` })],
              why: R`A permanent, growing cut in working capital is worth its growing-perpetuity value.`,
            };
          }
          return null;
        } },

      /* ---------- cycles ---------- */
      { id: 'w8-g-cycles', topic: 'cycle', level: 1, section: 'B', formula: 'ccc',
        make(rng) {
          const inv = rng.step(15, 90, 0.5), ar = rng.step(10, 70, 0.5), ap = rng.step(10, 60, 0.5);
          const askOp = rng.chance(0.5);
          const op = inv + ar, cc = inv + ar - ap;
          const ans = askOp ? op : cc;
          return {
            q: R`A firm has inventory days of ${K(inv, 1)}, A/R days of ${K(ar, 1)} and A/P days of ${K(ap, 1)}. How long is its **${askOp ? 'operating cycle' : 'cash cycle (cash conversion cycle)'}**?`,
            givens: [[R`\text{Inventory days}`, K(inv, 1)], [R`\text{A/R days}`, K(ar, 1)], [R`\text{A/P days}`, K(ap, 1)]],
            answer: ans, unit: 'days', dp: 1,
            mistakes: uniq(ans, [
              askOp ? { v: cc, why: 'That subtracts the A/P days, which gives the cash cycle.' } : { v: op, why: 'That is the operating cycle. The cash cycle subtracts the A/P days.' },
              { v: inv + ar + ap, why: 'A/P days are never added. They shorten the cash cycle and are not in the operating cycle.' },
              askOp ? { v: inv, why: 'That is only the inventory days. Add the A/R days.' } : { v: inv - ap, why: 'Include the A/R days too.' },
            ], 'days', 1),
            steps: [askOp
              ? R`\[\text{Operating cycle} = \text{Inventory days} + \text{A/R days} = ${K(inv, 1)} + ${K(ar, 1)} = ${L.numT(op, 1)} \text{ days}\]`
              : R`\[CCC = \text{Inventory days} + \text{A/R days} - \text{A/P days} = ${K(inv, 1)} + ${K(ar, 1)} - ${K(ap, 1)} = ${L.numT(cc, 1)} \text{ days}\]`],
            ti: [TI.line(askOp ? `${K(inv, 1)}+${K(ar, 1)}` : `${K(inv, 1)}+${K(ar, 1)}-${K(ap, 1)}`, { note: askOp ? 'Inventory days plus A/R days.' : 'Inventory days plus A/R days, minus A/P days.' })],
            why: R`Operating cycle: buy stock to collect cash. Cash cycle: the operating cycle less the days suppliers wait.`,
          };
        } },

      /* ---------- the three day ratios ---------- */
      { id: 'w8-g-invdays', topic: 'ccc', level: 1, section: 'B', formula: 'inv-days',
        make(rng) {
          const co = rng.company();
          const sales = rng.step(20, 90, 1), cogs = +(sales * rng.step(0.5, 0.75, 0.05)).toFixed(1);
          const inv = +((cogs * rng.step(20, 90, 1)) / 365).toFixed(1);
          const d = FIN.invDays(inv, cogs);
          return {
            q: R`${co} had sales of ${mil(sales)} and COGS of ${mil(cogs)}. Its inventory is ${mil(inv)}. Using a 365-day year, what are its **inventory days**?`,
            givens: [['Sales', milL(sales)], ['COGS', milL(cogs)], [R`\text{Inventory}`, milL(inv)]],
            answer: d, unit: 'days', dp: 2,
            mistakes: uniq(d, [
              { v: FIN.invDays(inv, sales), why: 'Inventory is held at cost, so divide by daily COGS, not daily sales.' },
              { v: FIN.invDays(inv, cogs, 360), why: 'Use a 365-day year here.' },
              { v: cogs / inv, why: 'That is inventory turnover (times a year), not days.' },
            ], 'days', 2),
            steps: [R`Average daily COGS \(= \frac{${K(cogs, 2)}}{365} = ${L.numT(cogs / 365, 5)}\)`, R`\[\text{Inventory days} = \frac{${K(inv, 2)}}{${K(cogs, 2)}/365} = ${L.num(d)} \text{ days}\]`],
            ti: [TI.line(`${K(inv, 2)}/(${K(cogs, 2)}/365)`, { note: 'Inventory divided by daily COGS.' })],
            why: R`\(\text{Inventory days} = \frac{\text{Inventory}}{COGS/365}\): stock is held at cost, so use COGS.`,
          };
        } },
      { id: 'w8-g-ardays', topic: 'receivables', level: 1, section: 'B', formula: 'ar-days',
        make(rng) {
          const co = rng.company();
          const sales = rng.step(20, 90, 1), cogs = +(sales * rng.step(0.5, 0.75, 0.05)).toFixed(1);
          const ar = +((sales * rng.step(15, 75, 1)) / 365).toFixed(1);
          const d = FIN.arDays(ar, sales);
          return {
            q: R`${co} had sales of ${mil(sales)} and COGS of ${mil(cogs)}. Its accounts receivable are ${mil(ar)}. Using a 365-day year, what are its **A/R days**?`,
            givens: [['Sales', milL(sales)], ['COGS', milL(cogs)], [R`\text{A/R}`, milL(ar)]],
            answer: d, unit: 'days', dp: 2,
            mistakes: uniq(d, [
              { v: FIN.arDays(ar, cogs), why: 'Receivables come from sales, so divide by daily sales, not daily COGS.' },
              { v: FIN.arDays(ar, sales, 360), why: 'Use a 365-day year here.' },
              { v: sales / ar, why: 'That is receivables turnover (times a year), not days.' },
            ], 'days', 2),
            steps: [R`Average daily sales \(= \frac{${K(sales, 2)}}{365} = ${L.numT(sales / 365, 5)}\)`, R`\[\text{A/R days} = \frac{${K(ar, 2)}}{${K(sales, 2)}/365} = ${L.num(d)} \text{ days}\]`],
            ti: [TI.line(`${K(ar, 2)}/(${K(sales, 2)}/365)`, { note: 'Receivables divided by daily sales.' })],
            why: R`\(\text{A/R days} = \frac{\text{Accounts receivable}}{Sales/365}\): the average time customers take to pay.`,
          };
        } },
      { id: 'w8-g-apdays', topic: 'payables', level: 1, section: 'B', formula: 'ap-days',
        make(rng) {
          const co = rng.company();
          const sales = rng.step(20, 90, 1), cogs = +(sales * rng.step(0.5, 0.75, 0.05)).toFixed(1);
          const ap = +((cogs * rng.step(15, 60, 1)) / 365).toFixed(1);
          const d = FIN.apDays(ap, cogs);
          return {
            q: R`${co} had sales of ${mil(sales)} and COGS of ${mil(cogs)}. Its accounts payable are ${mil(ap)}. Using a 365-day year, what are its **A/P days**?`,
            givens: [['Sales', milL(sales)], ['COGS', milL(cogs)], [R`\text{A/P}`, milL(ap)]],
            answer: d, unit: 'days', dp: 2,
            mistakes: uniq(d, [
              { v: FIN.apDays(ap, sales), why: 'Payables are for purchases at cost, so divide by daily COGS, not daily sales.' },
              { v: FIN.apDays(ap, cogs, 360), why: 'Use a 365-day year here.' },
              { v: cogs / ap, why: 'That is payables turnover (times a year), not days.' },
            ], 'days', 2),
            steps: [R`Average daily COGS \(= \frac{${K(cogs, 2)}}{365} = ${L.numT(cogs / 365, 5)}\)`, R`\[\text{A/P days} = \frac{${K(ap, 2)}}{${K(cogs, 2)}/365} = ${L.num(d)} \text{ days}\]`],
            ti: [TI.line(`${K(ap, 2)}/(${K(cogs, 2)}/365)`, { note: 'Payables divided by daily COGS.' })],
            why: R`\(\text{A/P days} = \frac{\text{Accounts payable}}{COGS/365}\): the average time the firm takes to pay suppliers.`,
          };
        } },
      { id: 'w8-g-ccc', topic: 'ccc', level: 2, section: 'B', formula: 'ccc', src: 'Tutorial W8 Q1',
        make(rng) {
          const co = rng.company();
          const sales = rng.step(20, 90, 1), cogs = +(sales * rng.step(0.5, 0.75, 0.05)).toFixed(1);
          const inv = +((cogs * rng.step(20, 90, 1)) / 365).toFixed(1);
          const ar = +((sales * rng.step(15, 75, 1)) / 365).toFixed(1);
          const ap = +((cogs * rng.step(15, 60, 1)) / 365).toFixed(1);
          const iD = FIN.invDays(inv, cogs), aD = FIN.arDays(ar, sales), pD = FIN.apDays(ap, cogs);
          const c = FIN.ccc(iD, aD, pD);
          return {
            q: R`${co}’s figures for the year are in the table (in $m). Using a 365-day year, what is its **cash conversion cycle**?`,
            table: { head: ['Item', '$m'], rows: [['Sales', K(sales, 2)], ['COGS', K(cogs, 2)], ['Inventory', K(inv, 2)], ['Accounts receivable', K(ar, 2)], ['Accounts payable', K(ap, 2)]] },
            answer: c, unit: 'days', dp: 2,
            mistakes: uniq(c, [
              { v: iD + aD + pD, why: 'Subtract the A/P days. Do not add them.' },
              { v: FIN.ccc(FIN.invDays(inv, sales), aD, FIN.apDays(ap, sales)), why: 'Inventory days and A/P days use COGS, not sales.' },
              { v: FIN.ccc(iD, FIN.arDays(ar, cogs), pD), why: 'A/R days use sales, not COGS.' },
              { v: iD + aD, why: 'That is the operating cycle. The CCC also subtracts the A/P days.' },
            ], 'days', 2),
            steps: [
              R`\[\text{Inventory days} = \frac{${K(inv, 2)}}{${K(cogs, 2)}/365} = ${L.num(iD)}\]`,
              R`\[\text{A/R days} = \frac{${K(ar, 2)}}{${K(sales, 2)}/365} = ${L.num(aD)}\]`,
              R`\[\text{A/P days} = \frac{${K(ap, 2)}}{${K(cogs, 2)}/365} = ${L.num(pD)}\]`,
              R`\[CCC = ${L.num(iD)} + ${L.num(aD)} - ${L.num(pD)} = ${L.num(c)} \text{ days}\]`,
            ],
            ti: [
              TI.line(`${K(inv, 2)}/(${K(cogs, 2)}/365)→i`, { note: 'Inventory days, stored in i (COGS).' }),
              TI.line(`${K(ar, 2)}/(${K(sales, 2)}/365)→a`, { note: 'A/R days, stored in a (sales).' }),
              TI.line(`i+a-${K(ap, 2)}/(${K(cogs, 2)}/365)`, { note: 'Subtract the A/P days (COGS).' }),
            ],
            why: R`COGS for inventory and payables, sales for receivables. Then add, add, subtract.`,
          };
        } },
      { id: 'w8-g-cashfree', topic: 'ccc', level: 2, section: 'B', src: 'Lecture W8 slide 11',
        make(rng) {
          const co = rng.company();
          const sales = rng.step(20, 120, 1), cogs = +(sales * rng.step(0.5, 0.75, 0.05)).toFixed(1);
          const kind = rng.pick(['ar', 'inv', 'ap']);
          const from = rng.step(30, 75, 1), cut = rng.pick([5, 8, 10, 12, 15, 20]);
          const to = kind === 'ap' ? from + cut : from - cut;
          const base = kind === 'ar' ? sales : cogs;
          const freed = (cut * base) / 365;
          const word = { ar: 'A/R days', inv: 'inventory days', ap: 'A/P days' }[kind];
          const bal = { ar: 'receivables', inv: 'inventory', ap: 'payables' }[kind];
          return {
            q: R`${co} has sales of ${mil(sales)} and COGS of ${mil(cogs)}. It ${kind === 'ap' ? 'negotiates longer credit, so its' : 'manages its working capital better, so its'} ${word} ${kind === 'ap' ? 'rise' : 'fall'} from ${from} to ${to}. How much cash does this free up (in $m)?`,
            givens: [['Sales', milL(sales)], ['COGS', milL(cogs)], [R`\Delta\text{days}`, String(cut)]],
            answer: freed, unit: '$m', dp: 3,
            mistakes: uniq(freed, [
              { v: (cut * (kind === 'ar' ? cogs : sales)) / 365, why: kind === 'ar' ? 'Receivables are measured in sales dollars. Use daily sales.' : 'Inventory and payables are measured at cost. Use daily COGS.' },
              { v: (to * base) / 365, why: 'That is the new balance. The cash freed is the change in the balance.' },
              { v: (cut * base) / 360, why: 'Use a 365-day year.' },
            ], '$m', 3),
            steps: [
              R`One day of ${bal} is one day of ${kind === 'ar' ? 'sales' : 'COGS'}: \(\frac{${K(base, 2)}}{365} = ${L.numT(base / 365, 5)}\) (in $m).`,
              R`\[\text{Cash freed} = ${cut} \times ${L.numT(base / 365, 5)} = \$${L.numT(freed, 3)}\text{m}\]`,
            ],
            ti: [TI.line(`${cut}*${K(base, 2)}/365`, { note: `${cut} days of ${kind === 'ar' ? 'sales' : 'COGS'} ($m).` })],
            why: kind === 'ap' ? R`Paying suppliers later (within the terms) keeps cash in the firm for longer.` : R`Fewer ${word} mean a smaller ${bal} balance, so cash is released.`,
          };
        } },
      { id: 'w8-g-cccfix', topic: 'payables', level: 3, section: 'B', formula: 'ccc', src: 'Task sheet W8 Part 2', boss: true,
        make(rng) {
          const co = rng.company();
          for (let k = 0; k < 60; k++) {
            const d = rng.pick([1, 2]) / 100, x = rng.pick([10, 15, 20]), y = rng.pick([30, 40, 45, 60]);
            const sales = rng.step(20, 90, 1), cogs = +(sales * rng.step(0.5, 0.75, 0.05)).toFixed(1);
            const inv = +((cogs * rng.step(20, 90, 1)) / 365).toFixed(1);
            const ar = +((sales * rng.step(15, 75, 1)) / 365).toFixed(1);
            const apD0 = rng.int(x + 2, y - 4);
            const ap = +((cogs * apD0) / 365).toFixed(2);
            const iD = FIN.invDays(inv, cogs), aD = FIN.arDays(ar, sales), pD = FIN.apDays(ap, cogs);
            if (!(pD > x + 1 && pD < y - 2)) continue;
            const c0 = FIN.ccc(iD, aD, pD), c1 = FIN.ccc(iD, aD, y);
            return {
              q: R`${co} buys on **${terms(d, x, y)}** and has decided to forgo the discount. Its figures (in $m) are in the table. First find its A/P days. If it paid suppliers on the **last day** of the net period instead, what would its **cash conversion cycle** be?`,
              table: { head: ['Item', '$m'], rows: [['Sales', K(sales, 2)], ['COGS', K(cogs, 2)], ['Inventory', K(inv, 2)], ['Accounts receivable', K(ar, 2)], ['Accounts payable', K(ap, 2)]] },
              answer: c1, unit: 'days', dp: 2,
              mistakes: uniq(c1, [
                { v: c0, why: `That is today’s CCC, with A/P days of ${T.num(pD)}. Paying on day ${y} makes A/P days ${y}.` },
                { v: iD + aD + y, why: 'Subtract the A/P days. Do not add them.' },
                { v: FIN.ccc(iD, aD, x), why: `Day ${x} is the last discount day. A firm that forgoes the discount should pay on day ${y}.` },
              ], 'days', 2),
              steps: [
                R`\[\text{Inventory days} = \frac{${K(inv, 2)}}{${K(cogs, 2)}/365} = ${L.num(iD)} \qquad \text{A/R days} = \frac{${K(ar, 2)}}{${K(sales, 2)}/365} = ${L.num(aD)}\]`,
                R`\[\text{A/P days} = \frac{${K(ap, 2)}}{${K(cogs, 2)}/365} = ${L.num(pD)}\]`,
                R`It pays after day ${x}, so it misses the discount, yet before day ${y}, so it wastes free credit. Today: \(CCC = ${L.num(c0)}\) days.`,
                R`Paying on day ${y}: \[CCC = ${L.num(iD)} + ${L.num(aD)} - ${y} = ${L.num(c1)} \text{ days}\]`,
              ],
              ti: [
                TI.line(`${K(ap, 2)}/(${K(cogs, 2)}/365)`, { note: `A/P days today: after day ${x}, so no discount, but before day ${y}, so free credit is wasted.` }),
                TI.line(`${K(inv, 2)}/(${K(cogs, 2)}/365)+${K(ar, 2)}/(${K(sales, 2)}/365)-${y}`, { note: `Inventory days plus A/R days, minus ${y} A/P days (paying on the last day).` }),
              ],
              why: R`If you forgo the discount, pay on the due date. A/P days rise to ${y}, and the CCC shrinks.`,
            };
          }
          return null;
        } },

      /* ---------- trade credit ---------- */
      { id: 'w8-g-meaning', topic: 'terms', level: 1, section: 'A', src: 'Lecture W8 slide 15',
        make(rng) {
          const d = rng.pick([1, 2, 3, 4]), x = rng.pick([10, 15, 20]), y = rng.pick([30, 40, 45, 60]);
          return {
            kind: 'mcq',
            q: R`What do the trade credit terms **${d}/${x}, net ${y}** mean?`,
            choices: [
              `Take ${d}% off if you pay within ${x} days; otherwise pay the full amount within ${y} days`,
              `Take ${x}% off if you pay within ${d} days; otherwise pay the full amount within ${y} days`,
              `Pay ${d}% interest if you pay after ${x} days; the bill is due within ${y} days`,
              `Take ${d}% off if you pay within ${y} days; otherwise pay the full amount within ${x} days`,
            ],
            answer: 0,
            why: R`The discount (${d}%) comes first, then the discount window (${x} days). “Net ${y}” is the due date for the full amount.`,
            steps: [R`\(d = ${d}\%\): the discount for paying early.`, R`${x} days: the discount window.`, R`Net ${y}: the full amount is due by day ${y}.`],
          };
        } },
      { id: 'w8-g-period', topic: 'tcost', level: 1, section: 'B', formula: 'trade-credit', src: 'Lecture W8 slide 16',
        make(rng) {
          const d = rng.pick([1, 2, 3, 4]) / 100, x = rng.pick([10, 15, 20]), y = rng.pick([30, 40, 45, 60]);
          const per = d / (1 - d);
          return {
            q: R`Terms are **${terms(d, x, y)}**. If you skip the discount and pay on day ${y}, what interest rate do you effectively pay for the extra ${y - x} days of credit?`,
            givens: [['d', L.pctT(d)], [R`\text{days}`, R`${y} - ${x} = ${y - x}`]],
            answer: P(per), unit: '%', dp: 2,
            mistakes: uniq(P(per), [
              { v: P(d), why: R`You only borrow the discounted price, so the rate is \(\frac{d}{1-d}\), not \(d\).` },
              { v: P(d / (1 + d)), why: R`Divide by \(1 - d\) (the price you would have paid), not \(1 + d\).` },
              { v: P(ear(d, x, y)), why: `That is the effective annual rate. The question asks for the rate over ${y - x} days.` },
            ], '%', 2),
            steps: [R`On a $100 bill you could pay $${K(100 - d * 100, 2)} on day ${x}. Paying $100 on day ${y} costs $${K(d * 100, 2)} more.`, R`\[\frac{d}{1-d} = \frac{${K(d * 100)}}{${K(100 - d * 100)}} = ${L.pct(per, 4)} \text{ per } ${y - x} \text{ days}\]`],
            ti: [TI.line(`${K(d * 100)}/${K(100 - d * 100)}`, { pct: true, note: `The discount divided by the price you would pay on day ${x}. Times 100 gives the percentage.` })],
            why: R`The discount you give up is interest on the discounted price.`,
          };
        } },
      { id: 'w8-g-tcear', topic: 'tcost', level: 2, section: 'B', formula: 'trade-credit', src: 'Lecture W8 slides 16–18',
        make(rng) {
          const d = rng.pick([1, 1.5, 2, 2, 3]) / 100, x = rng.pick([10, 15, 20]);
          const y = rng.pick([30, 40, 45, 60, 90].filter((n) => n - x >= 15));
          const yr = rng.chance(0.25) ? 360 : 365;
          const e = ear(d, x, y, yr);
          return {
            q: R`A supplier offers **${terms(d, x, y)}**. What is the effective annual cost of forgoing the discount? Use a ${yr}-day year.`,
            givens: [['d', L.pctT(d)], [R`\text{discount days}`, String(x)], [R`\text{net days}`, String(y)], [R`\text{year}`, String(yr)]],
            answer: P(e), unit: '%', dp: 2,
            mistakes: uniq(P(e), [
              { v: P(Math.pow(1 + d, yr / (y - x)) - 1), why: R`The period rate is \(\frac{d}{1-d}\), not \(d\): you borrow the discounted price.` },
              { v: P(ear(d, 0, y, yr)), why: R`Use the extra days, \(${y} - ${x} = ${y - x}\), not ${y}.` },
              { v: P((d / (1 - d)) * (yr / (y - x))), why: 'That is simple interest. The EAR compounds the period rate.' },
              { v: P(ear(d, x, y, yr === 365 ? 360 : 365)), why: `This question uses a ${yr}-day year.` },
            ], '%', 2),
            steps: [
              R`Period rate: \(\frac{${K(d * 100)}}{${K(100 - d * 100)}} = ${L.pct(d / (1 - d), 4)}\) for \(${y} - ${x} = ${y - x}\) days.`,
              R`\[EAR = ${earTex(d, x, y, yr)} = ${L.pct(e, 2)}\]`,
            ],
            calc: earCalc(d, x, y, yr),
            ti: [earTI(d, x, y, yr)],
            why: R`Compound the period rate \(\frac{${yr}}{${y - x}}\) times a year.`,
          };
        } },
      { id: 'w8-g-decide', topic: 'payables', level: 2, section: 'A', formula: 'trade-credit', src: 'Tutorial W8 Q2(B)',
        make(rng) {
          for (let k = 0; k < 60; k++) {
            const d = rng.pick([1, 2, 3]) / 100, x = rng.pick([10, 15, 20]), y = rng.pick([30, 40, 45, 60, 90]);
            if (y - x < 15) continue;
            const b = rng.step(0.06, 0.24, 0.01);
            const e = ear(d, x, y);
            if (Math.abs(e - b) < 0.01) continue;
            const take = e > b, mid = Math.round((x + y) / 2);
            return {
              kind: 'mcq',
              q: R`Your supplier offers **${terms(d, x, y)}**. Your bank lends at ${pct(b)}. You need short-term finance. Using a 365-day year, what should you do?`,
              choices: [
                `Take the discount: borrow from the bank and pay on day ${x}`,
                `Forgo the discount and pay on day ${y}`,
                `Forgo the discount and pay on day ${mid}`,
                `Take the discount, but pay on day ${y}`,
              ],
              answer: take ? 0 : 1,
              why: R`\(EAR = ${earTex(d, x, y)} = ${L.pct(e, 2)}\). That is ${take ? 'above' : 'below'} the bank’s ${pct(b)}, so ${take ? `take the discount and pay on day ${x}` : `use the trade credit in full and pay on day ${y}`}.`,
              steps: [R`\[EAR = ${earTex(d, x, y)} = ${L.pct(e, 2)}\]`, take ? R`Trade credit is dearer than the bank, so borrow from the bank and take the discount.` : R`Trade credit is cheaper than the bank, so skip the discount and pay on the last day.`, R`Never pay between day ${x} and day ${y}: you would lose the discount and free days of credit.`],
              ti: [earTI(d, x, y, 365, R`That is \(${L.pct(e, 2)}\) a year, against the bank’s ${pct(b)}.`)],
            };
          }
          return null;
        } },
      { id: 'w8-g-stretch', topic: 'payables', level: 2, section: 'B', formula: 'trade-credit', src: 'Lecture W8 slides 27–28',
        make(rng) {
          const d = rng.pick([1, 2, 3]) / 100, x = rng.pick([10, 15, 20]), y = rng.pick([30, 40, 45]);
          const S = y + rng.pick([10, 15, 20, 30, 40]);
          const e = ear(d, x, S), e0 = ear(d, x, y);
          return {
            q: R`Terms are **${terms(d, x, y)}**, but the firm **stretches** its payables and pays on day ${S}. What is the effective annual cost of forgoing the discount now? Use a 365-day year.`,
            givens: [['d', L.pctT(d)], [R`\text{discount days}`, String(x)], [R`\text{pay on day}`, String(S)]],
            answer: P(e), unit: '%', dp: 2,
            mistakes: uniq(P(e), [
              { v: P(e0), why: `That is the cost of paying on day ${y}. The firm pays on day ${S}.` },
              { v: P(ear(d, 0, S)), why: `The loan runs from day ${x} to day ${S}: ${S - x} days, not ${S}.` },
              { v: P((d / (1 - d)) * (365 / (S - x))), why: 'That is simple interest. Compound the period rate.' },
            ], '%', 2),
            steps: [R`The firm now borrows the discounted price for \(${S} - ${x} = ${S - x}\) days.`, R`\[EAR = ${earTex(d, x, S)} = ${L.pct(e, 2)}\]`, R`Paying on day ${y} would cost \(${L.pct(e0, 2)}\). Stretching is cheaper, but it risks cash-on-delivery terms, a lost supplier and a poor credit rating.`],
            calc: earCalc(d, x, S),
            ti: [earTI(d, x, S)],
            why: R`Stretching spreads the same discount over more days, so the annual cost falls.`,
          };
        } },
      { id: 'w8-g-apcheck', topic: 'payables', level: 2, section: 'A', formula: 'ap-days', src: 'Lecture W8 slides 24–26',
        make(rng) {
          const co = rng.company();
          const d = rng.pick([1, 2]) / 100, x = rng.pick([10, 15, 20]), y = rng.pick([30, 40, 45, 60]);
          const regime = rng.int(0, 3);
          const days = [x - rng.int(1, 5), rng.int(x + 2, y - 3), y, y + rng.pick([5, 10, 15, 20, 25])][regime];
          const daily = rng.step(5000, 50000, 1000);
          const ap = days * daily;
          const choices = [
            'It pays within the discount window, so it can take the discount',
            'It misses the discount but pays before the due date, so it loses both the discount and free credit',
            'It pays on the due date, which is right if it has chosen to forgo the discount',
            'It pays after the due date, so it is stretching its payables',
          ];
          return {
            kind: 'mcq',
            q: R`${co} buys on **${terms(d, x, y)}**. Its average accounts payable balance is ${T.moneyT(ap)} and its daily COGS is ${T.moneyT(daily)}. Which statement describes its payables?`,
            choices, answer: regime,
            why: R`\(\text{A/P days} = \frac{${L.moneyT(ap)}}{${L.moneyT(daily)}} = ${days}\) days, against a discount window of ${x} days and a due date of day ${y}.`,
            steps: [R`\[\text{A/P days} = \frac{\text{Accounts payable}}{\text{Daily COGS}} = \frac{${L.moneyT(ap)}}{${L.moneyT(daily)}} = ${days}\]`, R`Compare with the terms: discount until day ${x}, full amount due on day ${y}.`],
            ti: [TI.line(`${ap}/${daily}`, { note: 'A/P days: payables divided by daily COGS.' })],
          };
        } },
      { id: 'w8-g-stretchdecide', topic: 'payables', level: 3, section: 'A', formula: 'trade-credit', src: 'Tutorial W8 Q2(C)', boss: true,
        make(rng) {
          for (let k = 0; k < 80; k++) {
            const d = rng.pick([1, 2, 3]) / 100, x = rng.pick([10, 15, 20]), y = rng.pick([30, 40, 45, 60]);
            const S = y + rng.pick([15, 20, 30, 40, 60]);
            const yr = rng.chance(0.3) ? 360 : 365;
            const b = rng.step(0.08, 0.2, 0.01);
            const eY = ear(d, x, y, yr), eS = ear(d, x, S, yr);
            if (!(eY > b + 0.01) || Math.abs(eS - b) < 0.01) continue;
            const stretch = eS < b, mid = Math.round((x + y) / 2);
            return {
              kind: 'mcq',
              q: R`A supplier offers **${terms(d, x, y)}**. The bank lends at ${pct(b)}. The supplier will tolerate payment as late as day ${S}. Use a ${yr}-day year and ignore the risks of paying late. What is the **cheapest** way to pay?`,
              choices: [
                `Take the discount: borrow from the bank and pay on day ${x}`,
                `Forgo the discount and pay on day ${y}`,
                `Forgo the discount and stretch payment to day ${S}`,
                `Forgo the discount and pay on day ${mid}`,
              ],
              answer: stretch ? 2 : 0,
              why: R`Paying on day ${y} costs \(${L.pct(eY, 2)}\) and paying on day ${S} costs \(${L.pct(eS, 2)}\), against the bank’s ${pct(b)}. ${stretch ? 'Stretching beats the bank, though it risks the supplier relationship.' : 'Even stretched, trade credit is dearer than the bank, so take the discount.'}`,
              steps: [
                R`\[EAR_{day\ ${y}} = ${earTex(d, x, y, yr)} = ${L.pct(eY, 2)}\]`,
                R`\[EAR_{day\ ${S}} = ${earTex(d, x, S, yr)} = ${L.pct(eS, 2)}\]`,
                stretch ? R`\(${L.pct(eS, 2)} < ${L.pctT(b)}\): stretching to day ${S} is the cheapest source of funds. In practice, weigh the risks: cash-on-delivery terms, a lost supplier, a poor credit rating.` : R`Both costs are above \(${L.pctT(b)}\), so borrow from the bank and pay on day ${x}.`,
              ],
              ti: [earTI(d, x, y, yr, R`Paying on day ${y}: \(${L.pct(eY, 2)}\) a year.`), earTI(d, x, S, yr, R`Stretching to day ${S}: \(${L.pct(eS, 2)}\) a year. Compare both with the bank’s ${pct(b)}.`)],
            };
          }
          return null;
        } },

      /* ---------- credit policy ---------- */
      { id: 'w8-g-credit', topic: 'receivables', level: 3, section: 'B', src: 'Lecture W8 slides 19–21', boss: true,
        make(rng) {
          for (let k = 0; k < 80; k++) {
            const price = rng.pick([50, 80, 100, 120, 150, 200]);
            const cost = Math.round(price * rng.step(0.5, 0.7, 0.05));
            const N = rng.step(300, 1000, 50), f = rng.pick([0.3, 0.4, 0.5, 0.6, 0.7]), dd = rng.pick([0.01, 0.02, 0.02, 0.03, 0.03, 0.04]);
            const lost = rng.step(5, 40, 5), r = rng.pick([0.01, 0.0125, 0.015]);
            const cashU = f * N, credU = N - cashU, Nn = N - lost;
            if (!Number.isInteger(cashU)) continue;
            const net0 = -cost * N + cashU * price * (1 - dd), credit = credU * price;
            const cur = net0 + (credit + net0) / r;
            const net0n = -cost * Nn, creditN = Nn * price;
            const nw = net0n + (creditN + net0n) / r;
            const sw = nw - cur;
            if (Math.abs(sw) < 2000) continue;
            const ignoreTiming = ((creditN + net0n) - (credit + net0)) / r;
            const noLost = -cost * N + (N * price - cost * N) / r - cur;
            return {
              q: R`A product sells for ${T.moneyT(price)} and costs ${T.moneyT(cost)} to make. Costs are paid when the goods are made. The table compares the current policy (a ${pct(dd)} cash discount) with dropping the discount. The required return is ${pct(r)} per month. What is the **NPV of switching** to the new policy?`,
              table: { head: ['', 'Current policy', 'New policy'], rows: [['Units a month', String(N), String(Nn)], [`Pay now (${pct(dd)} off)`, String(cashU), '0'], ['Pay full price in 30 days', String(credU), String(Nn)]] },
              givens: [['P', L.moneyT(price)], ['c', L.moneyT(cost)], ['r', R`${L.pctT(r)}\text{ per month}`]],
              answer: sw, unit: '$', dp: 2,
              mistakes: uniq(sw, [
                { v: nw, why: 'That is the NPV of the new policy alone. Subtract the current policy’s NPV.' },
                { v: ignoreTiming, why: 'That ignores timing: credit sales arrive one month after the costs are paid.' },
                { v: noLost, why: `You kept ${N} units. Dropping the discount loses ${lost} sales a month.` },
              ], '$', 2),
              steps: [
                R`Current, month 0: \(-${cost} \times ${N} + ${cashU} \times ${K(price * (1 - dd), 2)} = ${LM(net0)}\). Each later month adds credit sales of \(${credU} \times ${price} = ${LM(credit)}\).`,
                R`\[NPV_{current} = ${LM(net0)} + \frac{${LM(credit)} + (${LM(net0)})}{${L.dec(r)}} = ${LM(cur)}\]`,
                R`New, month 0: \(-${cost} \times ${Nn} = ${LM(net0n)}\). Each later month: \(${Nn} \times ${price} - ${cost} \times ${Nn} = ${LM(creditN + net0n)}\).`,
                R`\[NPV_{new} = ${LM(net0n)} + \frac{${LM(creditN + net0n)}}{${L.dec(r)}} = ${LM(nw)}\]`,
                R`\[NPV_{switch} = ${LM(nw)} - ${LM(cur)} = ${LM(sw)}\]`,
                sw < 0 ? R`Negative, so **keep** the cash discount.` : R`Positive, so **drop** the discount.`,
              ],
              ti: [
                TI.line(`${tn(net0)}+(${tn(credit)}${plus(net0)})/${tn(r)}→c`, { note: 'The current policy: month 0, plus the monthly perpetuity. Stored in c.' }),
                TI.line(`${tn(net0n)}+(${tn(creditN)}${plus(net0n)})/${tn(r)}-c`, { note: 'The new policy, minus the current one.' }),
              ],
              why: R`Value each policy as month-0 cash plus a monthly perpetuity, then take the difference.`,
            };
          }
          return null;
        } },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
