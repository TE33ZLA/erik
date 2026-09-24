/* Floor 2 — Week 2: Financial mathematics II — mixed streams, perpetuities, annuities, loans. */
(function (root) {
  'use strict';
  const { FIN, L, T } = root;
  const R = String.raw;
  const P = (r) => +(r * 100).toFixed(8); // decimal rate -> percent units for answers

  /* ---------- local helpers ---------- */
  const r2 = (x) => FIN.round(x, 2);
  const cl = (x) => +x.toFixed(8); // strip floating-point noise from a sum of rates
  const dedupe = (ms) => ms.filter((m, k) => ms.findIndex((o) => r2(o.v) === r2(m.v)) === k); // drop numerically identical distractors
  const ord = (k) => k + (k % 100 >= 11 && k % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][k % 10] || 'th');
  const mt = (x) => (Number.isInteger(r2(x)) ? T.moneyT(x) : T.money(x)); // plain-text money (cents only when needed)
  const ml = (x) => (Number.isInteger(r2(x)) ? L.moneyT(x) : L.money(x)); // LaTeX money (cents only when needed)
  const kn = (x) => String(r2(x)); // a number as typed on the calculator
  /** 'a' or 'an' before a written number: an 8% coupon, an 11% return, an $18,000 loan, a $1,000 bond */
  const aan = (x) => { const h = (String(x).match(/\d+/) || [''])[0]; return /^8/.test(h) || h === '11' || h === '18' ? 'an' : 'a'; };
  const Aan = (x) => (aan(x) === 'an' ? 'An' : 'A');
  const ml4 = (x) => { const s = L.moneyT(x, 4); return /\.\d$/.test(s) ? s + '0' : s; }; // LaTeX money with 2 to 4 decimals
  const pk = (r) => T.numT(r * 100, 6); // a rate in percent, for [I/YR]
  const yrsW = (k) => (k === 1 ? '1 year' : `${k} years`);
  /** LaTeX pieces for a rate per period: annual (m = 1) or APR / m */
  const rt = (apr, m = 1) => (m === 1 ? { r: L.dec(apr), one: L.onePlus(apr) }
    : { r: R`\tfrac{${L.dec(apr)}}{${m}}`, one: R`1 + \tfrac{${L.dec(apr)}}{${m}}` });
  const pvaTex = (c, x, n) => R`\frac{${ml(c)}}{${x.r}}\left(1 - \frac{1}{(${x.one})^{${n}}}\right)`;
  const fvaTex = (c, x, n) => R`\frac{${ml(c)}}{${x.r}}\left((${x.one})^{${n}} - 1\right)`;
  /** timeline for a level stream: `count` payments labelled `lab`, the first at t = a */
  function tlLevel(a, count, lab, unit, extra, hi, tail) {
    const b = a + count - 1;
    const at = {};
    if (count <= 8) for (let t = a; t <= b; t++) at[t] = lab;
    else { at[a] = lab; at[a + 1] = lab; at[b - 1] = lab; at[b] = lab; }
    if (tail) at[b] = lab + ' …';
    Object.assign(at, extra || {});
    return { n: Math.max(b, ...Object.keys(at).map(Number)), at, unit, hi: hi || [] };
  }

  /* ---------- values from the course examples (all computed, never typed in) ---------- */
  const MOCK03 = { cfs: [7000, 5000, 4000, 3000], r: 0.04 };
  MOCK03.pv = FIN.pvStream(MOCK03.cfs, MOCK03.r);
  const T1 = { pay: FIN.pmt(400000, 0.07 / 12, 360) };
  T1.bal = FIN.loanBalance(400000, 0.07 / 12, 360, 60);
  T1.newPay = FIN.pmt(376526.36, 0.075 / 12, 300);
  T1.nLeft = FIN.tvm.solveN(0.075 / 12, -376526.36, 2661.21, 0);
  const MST14 = { pay: FIN.pmt(250000, 0.006, 360), bal: FIN.loanBalance(250000, 0.006, 360, 48) };
  const MOCK13 = { pay: FIN.pmt(550000, 0.035 / 12, 360), bal: FIN.loanBalance(550000, 0.035 / 12, 360, 36) };
  MOCK13.newPay = FIN.pmt(MOCK13.bal, 0.03 / 12, 324);
  const T5 = { costs: [21000, 21000, 42000, 42000, 21000, 21000] };
  T5.pv15 = FIN.pvStream(T5.costs, 0.15);
  T5.pmt = FIN.pmtForFV(T5.pv15, 0.15, 15);
  const T4 = { a: 20000 / 1.12, bAt1: FIN.pvAnnuity(30000, 0.12, 4), cAt5: 50000 / 0.12 };
  T4.b = T4.bAt1 / 1.12;
  T4.c = T4.cAt5 / Math.pow(1.12, 5);
  T4.v = T4.a + T4.b + T4.c;
  const MST12 = { inflow: FIN.pvAnnuity(30000, 0.06, 8), cost: 80000 + 40000 / 1.06 };
  MST12.npv = MST12.inflow - MST12.cost;
  const EX12 = FIN.interpolate(0.13, 1.72, 0.14, -6.69);

  /** Drop distractors that sit too close to the answer: they make unfair options and over-strict typed answers. */
  function tidy(q) {
    if (!q || !Array.isArray(q.mistakes) || !Number.isFinite(q.answer)) return q;
    const a = q.answer, gap = Math.max(0.002 * Math.abs(a), 0.05);
    q.mistakes = dedupe(q.mistakes.filter((m) => Number.isFinite(m.v) && Math.abs(m.v - a) >= gap));
    return q;
  }

  const PACK = {
    id: 'w2', floor: 2, week: 'Week 2',
    title: 'Annuity Arcade',
    topic: 'Financial mathematics II: streams, annuities and perpetuities',
    color: '#8a5cf6', icon: '📅',
    intro: 'Welcome to the Annuity Arcade. Every machine here pays out in streams: some for a while, some forever. Value each stream at the right date and the lift to Floor 3 opens.',

    briefing: [
      { h: 'Mixed streams: value additivity', points: [
        R`A **mixed stream** has unequal cash flows. Move every cash flow to the **same date**, then add.`,
        R`Present value: \(PV = \frac{C_1}{1+r} + \frac{C_2}{(1+r)^{2}} + \cdots + \frac{C_n}{(1+r)^{n}}\). A cash flow at \(t = 0\) is not discounted.`,
        R`Future value at \(t = n\): compound each cash flow for the years it has left, \(C_t(1+r)^{n-t}\).`,
        R`Calculator: clear the memory, then enter \(CF_0\) first (0 if nothing happens today) with [CFj].`,
      ] },
      { h: 'Perpetuities', points: [
        R`A **perpetuity** pays the same amount \(C\) every period, forever: \(PV = \frac{C}{r}\).`,
        R`Key rule: the formula values the cash flows **one period before the first cash flow**.`,
        R`First payment today (not yet paid)? Add it: \(PV = C + \frac{C}{r}\). Just paid? It is gone, so \(PV = \frac{C}{r}\).`,
        R`First payment at \(t = k\): \(\frac{C}{r}\) lands at \(t = k - 1\), so \(PV_0 = \frac{C/r}{(1+r)^{k-1}}\).`,
      ] },
      { h: 'Annuities: ordinary and due', points: [
        R`An **annuity** pays \(C\) for \(n\) periods. If the timing is not stated, assume an **ordinary annuity** (end of each period).`,
        R`\(PV = \frac{C}{r}\left(1 - \frac{1}{(1+r)^{n}}\right)\) lands one period before the first payment.`,
        R`\(FV = \frac{C}{r}\left((1+r)^{n} - 1\right)\) lands on the date of the last payment.`,
        R`An **annuity due** pays at the start of each period: multiply the ordinary value by \((1+r)\). On the HP10bII+ use BEG mode, then switch back to END.`,
        R`**Deferred annuity:** first payment at \(t = k\)? The formula lands at \(t = k - 1\). Divide by \((1+r)^{k-1}\).`,
      ] },
      { h: 'Growth and equivalent annuities', points: [
        R`**Growing perpetuity:** \(PV = \frac{C_1}{r - g}\). \(C_1\) is the next cash flow, and you need \(r > g\).`,
        R`**Growing annuity:** \(PV = \frac{C}{r - g}\left(1 - \left(\frac{1+g}{1+r}\right)^{n}\right)\), with \(C\) paid at \(t = 1\).`,
        R`**Equivalent annuity:** find the PV of a stream, then the level annuity with the same PV. It lets you compare streams of different shapes.`,
      ] },
      { h: 'Loans and amortisation', points: [
        R`Loan payment: solve \(PV = C \times \frac{1}{r}\left(1 - \frac{1}{(1+r)^{n}}\right)\) for \(C\). Monthly loans use \(r = \frac{APR}{12}\) and \(n = \text{years} \times 12\).`,
        R`Each period: interest \(=\) opening balance \(\times r\). The rest of the payment repays principal. The **interest part falls** over time.`,
        R`**Outstanding balance** \(=\) PV of the payments still to come, at the loan rate.`,
        R`Rate change: re-price the balance over the months left (new payment), or keep the payment and solve for \(n\) (longer or shorter loan).`,
        R`An **interest-only** loan that is never repaid is a perpetuity: \(C = PV \times i\).`,
      ] },
      { h: 'Saving for a goal', points: [
        R`Target in the future? Use the FV of an annuity and solve for \(C\): \(C = \frac{FV \times r}{(1+r)^{n} - 1}\).`,
        R`Two-stage problems: first value the spending at the date saving stops, then find the deposit that builds that amount.`,
        R`Match the rate to the period: half-yearly deposits use \(\frac{r}{2}\) and \(2n\).`,
      ] },
      { h: 'Solving for r and n', points: [
        R`PV and \(r\) move in **opposite** directions. PV too high at your guess? Try a higher rate.`,
        R`**Interpolation:** with \(A = PV - \text{target}\), find \(A_1 > 0\) at \(r_1\) and \(A_2 < 0\) at \(r_2\). Then \(\lambda = \frac{A_1}{A_1 - A_2}\) and \(r = r_1 + \lambda(r_2 - r_1)\).`,
        R`At \(r = 0\), the PV of an annuity is simply the sum of its cash flows. More payments always means a higher PV.`,
        R`Calculator: enter the known values and press [I/YR] for the rate or [N] for the number of periods.`,
      ] },
    ],

    topics: {
      mixed: 'Mixed streams (value additivity)',
      perp: 'Perpetuities',
      deferred: 'Deferred annuities and perpetuities',
      annuity: 'Ordinary annuities (PV and FV)',
      due: 'Annuities due and equivalent annuities',
      growth: 'Growing annuities and perpetuities',
      loan: 'Loans, amortisation and balances',
      save: 'Saving for a goal',
      rate: 'Solving for r and n',
    },

    nodes: [
      { id: 'w2-1', kind: 'battle', name: 'Token Booth', topics: ['mixed', 'perp', 'deferred'], n: 6,
        enemy: { name: 'Perpetual Pest', title: 'Pays forever, bugs you forever', body: 'ghost', color: '#9fb4ff', acc: ['halo'], mouth: 'o', item: '♾️',
          lines: { intro: 'Boo! I pay C every year… FOREVER! Can you value me?', hit: ['C over r?! You found my weak spot!', 'One period before the first payment. Correct, curse you!'],
            taunt: ['Forever is a long time to be wrong!', 'Did you forget the payment made today?'], win: 'Even forever… has an end…', lose: 'I will haunt you forever. That is C over r of pain!' } } },
      { id: 'w2-2', kind: 'battle', name: 'Prize Counter', topics: ['annuity', 'due', 'growth'], n: 6,
        enemy: { name: 'The Annuity Dude', title: 'Always turns up one period early', body: 'round', color: '#f2a93b', acc: ['shades'], mouth: 'grin', item: '🎟️',
          lines: { intro: 'Dude! Payments at the START of each period. Or was it the end?', hit: ['Whoa, you caught the times (1 + r)!', 'Totally due-bious of you to get that right.'],
            taunt: ['Beginning or end, dude? Timing is everything!', 'You counted the payments wrong, bro.'], win: 'Bummer… I was due for a loss.', lose: 'Righteous! Another ordinary mistake!' } } },
      { id: 'w2-m1', kind: 'mini', name: 'Timeline Tapper', mini: 'timeline' },
      { id: 'w2-3', kind: 'battle', name: 'Claw Machine Alley', topics: ['loan', 'save'], n: 6,
        enemy: { name: 'The Amorti-Shark', title: 'Takes interest first, principal later', body: 'spiky', color: '#4a90a4', acc: ['bandana'], mouth: 'fangs', item: '🦈',
          lines: { intro: 'Sign the loan, little fish. My interest bites first!', hit: ['You worked out the balance? Nobody reads the schedule!', 'Grr, you know the interest part shrinks.'],
            taunt: ['Subtracting payments? Chomp! You forgot the interest.', 'Monthly loan, annual rate? Delicious.'], win: 'Fully… amortised… balance zero…', lose: 'Your debt is mine forever! Chomp!' } } },
      { id: 'w2-4', kind: 'battle', name: 'Glitch Garage', topics: ['rate', 'deferred', 'growth'], n: 6,
        enemy: { name: 'Trial-and-Error Terror', title: 'Hides the rate between two guesses', body: 'box', color: '#d9534f', acc: ['glasses'], mouth: 'smirk', item: '🎯',
          lines: { intro: 'Guess my rate! Too high? Too low? Mwahaha!', hit: ['Interpolated?! My lambda is exposed!', 'You trapped me between two rates!'],
            taunt: ['Wrong way! PV and r move in opposite directions.', 'Lambda equals… not that!'], win: 'You found r… to two decimal places…', lose: 'Keep guessing, forever and ever!' } } },
      { id: 'w2-m2', kind: 'mini', name: 'Ordinary or Due?', mini: 'ord-or-due' },
      { id: 'w2-boss', kind: 'boss', name: 'Annuitron 3000', topics: '*', n: 10,
        enemy: { name: 'Annuitron 3000', title: 'The arcade machine that pays in instalments', body: 'box', color: '#6d4bd8', acc: ['crown', 'headset'], eyes: 3, mouth: 'fangs', item: '🕹️',
          lines: { intro: 'INSERT COIN. I pay equal instalments… until GAME OVER!', hit: ['ERROR: player understands annuities!', 'CRITICAL HIT: correct period count!'],
            taunt: ['You valued me at the wrong date. Try again!', 'GAME OVER for your timeline!'], win: 'SYSTEM… FULLY… AMORTISED…', lose: 'HIGH SCORE: ANNUITRON. PLAY AGAIN?' } } },
    ],

    minis: {
      timeline: {
        game: 'timeline', title: 'Timeline Tapper',
        intro: 'Tap the tick where each formula puts its value. Remember: annuities and perpetuities land one period before the first cash flow.',
        rounds: 10, seconds: 20,
      },
      'ord-or-due': {
        game: 'rapid', title: 'Ordinary or Due?', intro: 'Payment streams are rolling in. Sort each one: ordinary annuity, annuity due, perpetuity or growing perpetuity?',
        bins: [{ id: 'ord', label: 'Ordinary annuity' }, { id: 'due', label: 'Annuity due' }, { id: 'perp', label: 'Perpetuity' }, { id: 'gperp', label: 'Growing perpetuity' }],
        items: [
          { t: 'Rent paid at the start of each month for a year', bin: 'due', why: 'Equal payments at the start of each period, for a fixed time: an annuity due.' },
          { t: 'Car loan repayments at the end of each month for 5 years', bin: 'ord', why: 'Equal payments at the end of each period, for a fixed time: an ordinary annuity.' },
          { t: 'A pension paying $30,000 at the end of each year for 20 years', bin: 'ord', why: 'End-of-year payments for a fixed number of years: an ordinary annuity.' },
          { t: 'Lease payments due on the first day of each quarter for 3 years', bin: 'due', why: 'Paid in advance, at the start of each period: an annuity due.' },
          { t: 'A British consol paying £1,000 a year forever', bin: 'perp', why: 'A fixed payment forever is a perpetuity.' },
          { t: 'A scholarship paying $5,000 a year forever, from next year', bin: 'perp', why: 'Equal payments that never stop: a perpetuity.' },
          { t: 'A dividend of $2 next year, growing 3% a year forever', bin: 'gperp', why: 'Payments that grow at a constant rate forever: a growing perpetuity.' },
          { t: 'A lottery prize: first payment today, then yearly for 19 more years', bin: 'due', why: 'The first payment is today, so the payments are at the start of each period.' },
          { t: 'Mortgage repayments (nothing said about timing)', bin: 'ord', why: 'If nothing is said, assume payments at the end of each period.' },
          { t: 'Gym fees paid at the start of each month for a year', bin: 'due', why: 'Paid at the beginning of each period: an annuity due.' },
          { t: 'Insurance premiums paid at the start of each year for 10 years', bin: 'due', why: 'Premiums are paid in advance: an annuity due.' },
          { t: 'Bond coupons paid every six months until maturity', bin: 'ord', why: 'Coupons arrive at the end of each period for a fixed time: an ordinary annuity.' },
          { t: 'A prize fund that rises with inflation every year, forever', bin: 'gperp', why: 'Growing at a constant rate with no end: a growing perpetuity.' },
          { t: 'Savings deposits at the end of each month for 3 years', bin: 'ord', why: 'End-of-month deposits for a fixed time: an ordinary annuity.' },
          { t: 'Tuition fees paid at the start of each semester for 3 years', bin: 'due', why: 'Fees are paid up front each period: an annuity due.' },
          { t: 'A preference share paying a fixed $3 dividend every year', bin: 'perp', why: 'A fixed dividend with no end date is a perpetuity.' },
          { t: 'Interest-only loan that is never repaid: the monthly interest', bin: 'perp', why: 'The same interest payment every month, forever: a perpetuity.' },
          { t: 'Rent income expected to grow 2% a year forever', bin: 'gperp', why: 'Constant growth, no end: a growing perpetuity.' },
          { t: 'Salary of $4,000 paid at the end of each month for 2 years', bin: 'ord', why: 'Paid in arrears, for a fixed time: an ordinary annuity.' },
          { t: 'A charity paying $10,000 a year forever, first payment in a year', bin: 'perp', why: 'Equal payments forever: a perpetuity (valued one period before the first).' },
          { t: 'Club fees that grow 4% a year, forever', bin: 'gperp', why: 'Payments growing at a constant rate forever: a growing perpetuity.' },
          { t: 'Phone plan: $60 due on the first day of each month for 24 months', bin: 'due', why: 'Due at the start of each month: an annuity due.' },
        ],
        rounds: 12, seconds: 12,
      },
    },

    questions: [
      /* ----- mixed streams ----- */
      { id: 'w2-q01', topic: 'mixed', kind: 'mcq', level: 1, section: 'A', formula: 'pv-lump',
        q: R`To value a **mixed stream** of cash flows, what must you do first?`,
        choices: ['Move every cash flow to the same point in time', 'Add up all the cash flows as they are', 'Find the average cash flow and treat it as an annuity', 'Discount only the largest cash flow'], answer: 0,
        why: R`This is **value additivity**. You can only add cash flows that sit at the same date. Compound or discount each one to that date first, then add.` },
      { id: 'w2-q02', topic: 'mixed', kind: 'tf', level: 1, section: 'A',
        q: R`$1,000 received at \(t = 1\) plus $1,000 received at \(t = 3\) is worth $2,000 today (when \(r > 0\)).`,
        answer: false,
        why: R`Each amount must be discounted first. At 10%: \(\frac{1{,}000}{1.10} + \frac{1{,}000}{1.10^{3}} = ${L.money(1000 / 1.1 + 1000 / 1.331)}\), not $2,000.` },
      { id: 'w2-q03', topic: 'mixed', kind: 'mcq', level: 2, section: 'A', src: 'Mock MST Q03 feedback',
        q: R`You enter a stream on the HP10bII+ with the [CFj] key. The first cash flow arrives at \(t = 1\). What do you enter first?`,
        choices: [R`0, as \(CF_0\), because the list always starts at \(t = 0\)`, R`The \(t = 1\) cash flow, as \(CF_0\)`, 'The interest rate', 'The number of cash flows'], answer: 0,
        wrong: { 1: 'That shifts every cash flow one period earlier, so the PV comes out too high.' },
        why: R`The [CFj] list always starts at \(CF_0\) (today). If nothing happens today, enter 0 first. Clear the cash flow memory before you start.` },
      { id: 'w2-q04', topic: 'mixed', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W2 Example 1',
        q: R`You want the value at \(t = 3\) of a stream of deposits. How many years of interest does the deposit made at \(t = 1\) earn?`,
        choices: ['2 years', '1 year', '3 years', '4 years'], answer: 0,
        tl: { n: 3, at: { 1: 'deposit', 3: 'value here' }, unit: 'Year', hi: [1, 3] },
        why: R`It sits in the account from \(t = 1\) to \(t = 3\): \(3 - 1 = 2\) years. So multiply it by \((1+r)^{2}\).` },
      { id: 'w2-q05', topic: 'mixed', kind: 'num', level: 1, section: 'B', src: 'Mock MST Q03', formula: 'pv-lump',
        q: R`A car dealer asks you to pay $7,000 today. You then pay $5,000 at the end of year 1, $4,000 at the end of year 2 and $3,000 at the end of year 3. A safe investment earns 4% p.a. What is the present value of all your payments?`,
        tl: { cfs: [7000, 5000, 4000, 3000], unit: 'Year' },
        answer: MOCK03.pv, unit: '$', dp: 2,
        mistakes: [
          { v: FIN.pvStream([0].concat(MOCK03.cfs), 0.04), why: R`That treats the $7,000 as paid at \(t = 1\). It is paid today, so it is not discounted.` },
          { v: 19000, why: 'That just adds the payments and ignores the time value of money.' },
          { v: MOCK03.pv - 7000, why: 'You left out the $7,000 paid today.' },
        ],
        steps: [
          R`\[PV = 7{,}000 + \frac{5{,}000}{1.04} + \frac{4{,}000}{1.04^{2}} + \frac{3{,}000}{1.04^{3}}\]`,
          R`\[PV = 7{,}000 + ${L.num(5000 / 1.04)} + ${L.num(4000 / 1.04 ** 2)} + ${L.num(3000 / 1.04 ** 3)} = ${L.money(MOCK03.pv)}\]`,
        ],
        calc: `7000 [CFj] · 5000 [CFj] · 4000 [CFj] · 3000 [CFj] · 4 [I/YR] · [NPV] → ${T.money(MOCK03.pv)}`,
        why: R`The $7,000 is already in today’s dollars. Discount the other three payments and add.` },

      /* ----- perpetuities ----- */
      { id: 'w2-q06', topic: 'perp', kind: 'mcq', level: 1, section: 'A', src: 'Tutorial W2 concept check Q1', formula: 'pv-perp',
        q: R`Which statement about **perpetuities** is **false**?`,
        choices: [R`\(PV = \frac{r}{C}\): the rate divided by the cash flow`, 'A perpetuity is a stream of equal cash flows at regular intervals that lasts forever', 'Discounting each cash flow one at a time would take forever, so we use a formula', 'A British government consol bond is an example of a perpetuity'], answer: 0,
        why: R`The formula is \(PV = \frac{C}{r}\): the cash flow divided by the rate. The other three statements are true.` },
      { id: 'w2-q07', topic: 'perp', kind: 'mcq', level: 1, section: 'A', formula: 'pv-perp',
        q: R`The perpetuity formula \(PV = \frac{C}{r}\) gives a value at which date?`,
        choices: ['One period before the first cash flow', 'On the date of the first cash flow', 'On the date of the last cash flow', R`Always at \(t = 0\), whenever the payments start`], answer: 0,
        wrong: { 3: R`Only true when the first payment is at \(t = 1\). If it starts later, discount the result back to \(t = 0\).` },
        why: R`This rule applies to perpetuities, annuities and growing perpetuities. Find the first cash flow, then step back one period.` },
      { id: 'w2-q08', topic: 'perp', kind: 'mcq', level: 1, section: 'B', src: 'Tutorial W2 concept check Q2', formula: 'pv-perp',
        q: R`A British consol bond pays £1,000 of interest each year, forever. The interest rate is 5%. The **first** payment is **one year from now**. What is the bond worth today?`,
        choices: ['£20,000', '£21,000', '£10,000', '£19,047.62'], answer: 0,
        wrong: { 1: 'That adds an extra payment today. The first payment is a year away.', 3: R`That discounts one extra year. \(\frac{C}{r}\) already gives the value today.` },
        why: R`\(PV = \frac{C}{r} = \frac{1{,}000}{0.05} = 20{,}000\). The formula lands one period before the first payment, which is today.` },
      { id: 'w2-q09', topic: 'perp', kind: 'mcq', level: 1, section: 'B', src: 'Tutorial W2 concept check Q3', formula: 'pv-perp',
        q: R`The same consol pays £1,000 a year forever at 5%. This time the first payment arrives **tomorrow** (effectively today). What is it worth today?`,
        choices: ['£21,000', '£20,000', '£10,000', '£20,952.38'], answer: 0,
        wrong: { 1: 'You left out the payment that arrives tomorrow.', 3: 'Tomorrow’s payment does not need a whole year of discounting.' },
        why: R`Tomorrow’s £1,000 is worth about £1,000 today. The payments after it form a normal perpetuity: \(\frac{1{,}000}{0.05} = 20{,}000\). Total \(= 1{,}000 + 20{,}000 = 21{,}000\).` },
      { id: 'w2-q10', topic: 'perp', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W2 Example 3', formula: 'pv-perp',
        q: R`A perpetuity pays \(C\) per year. The first payment is made **today**. Which expression gives its value today?`,
        choices: [R`\(C + \frac{C}{r}\)`, R`\(\frac{C}{r}\)`, R`\(\frac{C}{r} \div (1+r)\)`, R`\(\frac{C}{r} - C\)`], answer: 0,
        wrong: { 1: 'That misses the payment made today.' },
        why: R`\(\frac{C}{r}\) values the payments from \(t = 1\) onwards. Today’s payment is not discounted, so add it: \(PV = C + \frac{C}{r}\).` },
      { id: 'w2-q11', topic: 'perp', kind: 'mcq', level: 2, section: 'A',
        q: R`A perpetuity has infinitely many payments. Why is its present value still finite?`,
        choices: ['Far-off payments are worth almost nothing today after discounting', 'The payments get smaller over time', 'Banks stop paying perpetuities after 100 years', 'It is not finite: a perpetuity is worth an infinite amount'], answer: 0,
        why: R`The payment at year \(t\) is worth \(\frac{C}{(1+r)^{t}}\) today, which shrinks towards zero. All these shrinking amounts add up to exactly \(\frac{C}{r}\).` },
      { id: 'w2-q12', topic: 'perp', kind: 'tf', level: 1, section: 'A', formula: 'pv-perp',
        q: R`If the interest rate doubles, the present value of a level perpetuity halves.`,
        answer: true,
        why: R`\(PV = \frac{C}{r}\). Doubling \(r\) halves the value: \(\frac{100}{0.05} = 2{,}000\) but \(\frac{100}{0.10} = 1{,}000\).` },
      { id: 'w2-q13', topic: 'perp', kind: 'num', level: 1, section: 'B', src: 'MST 2026 Q13', formula: 'pv-perp',
        q: R`You borrow $180,000 at 9% p.a., compounded monthly. The loan is **interest-only** and is never repaid. What is the monthly payment?`,
        answer: 180000 * 0.0075, unit: '$', dp: 2,
        mistakes: [
          { v: 16200, why: R`That is a whole year of interest. Use the monthly rate: \(\frac{9\%}{12} = 0.75\%\).` },
          { v: FIN.pmt(180000, 0.0075, 360), why: 'That repays the loan over 30 years. An interest-only loan never repays the principal.' },
          { v: 180000 * (Math.pow(1.09, 1 / 12) - 1), why: R`That treats 9% as an EAR. “Compounded monthly” means \(\frac{9\%}{12} = 0.75\%\) per month.` },
        ],
        steps: [
          R`A loan that is never repaid is a **perpetuity** for the lender: \[PV = \frac{C}{i} \;\Rightarrow\; C = PV \times i\]`,
          R`\[C = 180{,}000 \times \frac{0.09}{12} = 180{,}000 \times 0.0075 = \$1{,}350\]`,
        ],
        why: R`Interest-only forever means each payment is exactly one month of interest.` },

      /* ----- deferred annuities and perpetuities ----- */
      { id: 'w2-q14', topic: 'deferred', kind: 'mcq', level: 2, section: 'A', src: 'MST 2026 Q2', formula: 'pv-annuity',
        q: R`An ordinary annuity makes its **first** payment at \(t = 3\). You use \(PV = \frac{C}{r}\left(1 - \frac{1}{(1+r)^{n}}\right)\). How do you get the value at \(t = 0\)?`,
        choices: [R`Divide the result by \((1+r)^{2}\)`, R`Divide the result by \((1+r)^{3}\)`, R`Divide the result by \((1+r)\)`, 'Nothing: the formula already gives the value today'], answer: 0,
        tl: { n: 6, at: { 0: '?', 3: 'C', 4: 'C', 5: 'C', 6: 'C' }, unit: 'Year', hi: [0] },
        wrong: { 1: R`That discounts one period too many. The formula result already sits at \(t = 2\).`, 3: R`That is only true when the first payment is at \(t = 1\).` },
        why: R`The formula lands one period before the first payment: at \(t = 2\). So \(PV_0 = \frac{PV_2}{(1+r)^{2}}\).` },
      { id: 'w2-q15', topic: 'deferred', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W2 Example 4', formula: 'pv-perp',
        q: R`A perpetuity pays \(C\) a year, with the **first** payment at \(t = 4\). What is its value today?`,
        choices: [R`\(\frac{C/r}{(1+r)^{3}}\)`, R`\(\frac{C/r}{(1+r)^{4}}\)`, R`\(\frac{C}{r}\)`, R`\(\frac{C}{r} \times (1+r)^{3}\)`], answer: 0,
        wrong: { 1: 'That discounts one year too many.', 3: 'Multiplying compounds forward. You need to discount back.' },
        why: R`\(\frac{C}{r}\) lands at \(t = 3\), one period before the first payment. Discount it 3 years: \(PV_0 = \frac{C/r}{(1+r)^{3}}\).` },
      { id: 'w2-q16', topic: 'deferred', kind: 'num', level: 2, section: 'B', src: 'Lecture W2 Example 4(c)', formula: 'pv-perp',
        q: R`At 8% p.a., what is the value today of $2,420 per year **forever**, with the **first** payment **three years** from today?`,
        tl: { n: 5, at: { 0: '?', 3: '$2,420', 4: '$2,420', 5: '$2,420 …' }, unit: 'Year', hi: [0] },
        answer: 2420 / 0.08 / 1.08 ** 2, unit: '$', dp: 2,
        mistakes: [
          { v: 2420 / 0.08, why: R`That is the value at \(t = 2\). Discount it 2 years to today.` },
          { v: 2420 / 0.08 / 1.08 ** 3, why: R`That discounts 3 years. \(\frac{C}{r}\) already lands at \(t = 2\), so discount only 2 years.` },
          { v: 2420 / 0.08 / 1.08, why: R`That discounts only 1 year. From \(t = 2\) back to \(t = 0\) is 2 years.` },
        ],
        steps: [
          R`The first payment is at \(t = 3\), so \(\frac{C}{r}\) gives the value at \(t = 2\): \[PV_2 = \frac{2{,}420}{0.08} = \$30{,}250\]`,
          R`Discount 2 years to today: \[PV_0 = \frac{30{,}250}{1.08^{2}} = ${L.money(2420 / 0.08 / 1.08 ** 2)}\]`,
        ],
        calc: `2420 ÷ 0.08 = 30,250 · then 2 [N] · 8 [I/YR] · 0 [PMT] · 30250 [FV] · [PV] → −${T.money(2420 / 0.08 / 1.08 ** 2)}`,
        why: 'Step back one period from the first payment, then discount the rest of the way.' },
      { id: 'w2-q17', topic: 'deferred', kind: 'num', level: 2, section: 'B', src: 'Tutorial W2 Q3', formula: 'pv-annuity',
        q: R`What is the present value of a **four**-payment annuity of $200 per year, with the **first** payment **two years** from today? The discount rate is 9%.`,
        tl: { n: 5, at: { 0: '?', 2: '$200', 3: '$200', 4: '$200', 5: '$200' }, unit: 'Year', hi: [0] },
        answer: FIN.pvAnnuity(200, 0.09, 4) / 1.09, unit: '$', dp: 2,
        mistakes: [
          { v: FIN.pvAnnuity(200, 0.09, 4), why: R`That is the value at \(t = 1\). Discount it one more year.` },
          { v: FIN.pvAnnuity(200, 0.09, 4) / 1.09 ** 2, why: R`That discounts two years. The formula already lands at \(t = 1\).` },
          { v: 800 / 1.09, why: 'That adds the payments before discounting. Use the annuity formula for them.' },
        ],
        steps: [
          R`The first payment is at \(t = 2\), so the annuity formula gives the value at \(t = 1\): \[PV_1 = \frac{200}{0.09}\left(1 - \frac{1}{1.09^{4}}\right) = ${L.money(FIN.pvAnnuity(200, 0.09, 4))}\]`,
          R`Discount one year to today: \[PV_0 = \frac{${L.num(FIN.pvAnnuity(200, 0.09, 4))}}{1.09} = ${L.money(FIN.pvAnnuity(200, 0.09, 4) / 1.09)}\]`,
        ],
        calc: `0 [CFj] · 0 [CFj] · 200 [CFj] · 4 [Nj] · 9 [I/YR] · [NPV] → ${T.money(FIN.pvAnnuity(200, 0.09, 4) / 1.09)}`,
        why: 'The annuity formula lands one period before the first payment. Discount from there.' },
      { id: 'w2-q18', topic: 'deferred', kind: 'num', level: 2, section: 'B', src: 'Mock MST Q04', formula: 'pv-annuity',
        q: R`A buyer offers **four** equal annual payments of $6,000 for your old company car. The **first** payment is **two years from today**. You can invest at 10%. What is the offer worth today?`,
        tl: { n: 5, at: { 0: '?', 2: '$6,000', 3: '$6,000', 4: '$6,000', 5: '$6,000' }, unit: 'Year', hi: [0] },
        answer: FIN.pvAnnuity(6000, 0.10, 4) / 1.1, unit: '$', dp: 2,
        mistakes: [
          { v: FIN.pvAnnuity(6000, 0.10, 4), why: R`That is the value at \(t = 1\). Discount it one year.` },
          { v: FIN.pvAnnuity(6000, 0.10, 4) / 1.21, why: R`That discounts two years. The formula already lands at \(t = 1\).` },
          { v: 24000, why: 'That adds the payments and ignores the time value of money.' },
        ],
        steps: [
          R`The first payment is at \(t = 2\), so the annuity formula lands at \(t = 1\): \[PV_1 = \frac{6{,}000}{0.10}\left(1 - \frac{1}{1.10^{4}}\right) = ${L.money(FIN.pvAnnuity(6000, 0.10, 4))}\]`,
          R`\[PV_0 = \frac{${L.num(FIN.pvAnnuity(6000, 0.10, 4))}}{1.10} = ${L.money(FIN.pvAnnuity(6000, 0.10, 4) / 1.1)}\]`,
          R`You want $12,000 for the car. The offer is worth more (\(NPV \approx \$5{,}290\)), so **accept**.`,
        ],
        calc: `0 [CFj] · 0 [CFj] · 6000 [CFj] · 4 [Nj] · 10 [I/YR] · [NPV] → ${T.money(FIN.pvAnnuity(6000, 0.10, 4) / 1.1)}`,
        why: 'The offer is worth more than the $12,000 you want, so accept it.' },

      /* ----- ordinary annuities ----- */
      { id: 'w2-q19', topic: 'annuity', kind: 'mcq', level: 1, section: 'A', src: 'Tutorial W2 concept check Q4',
        q: R`Which statement about **annuities** is **false**?`,
        choices: ['A perpetuity ends after a fixed number of payments, but an annuity lasts forever', R`The PV of an annuity is not equal to \(\frac{C}{r}\)`, 'An annuity is a stream of N equal cash flows paid at regular intervals', 'Most car loans, mortgages and some bonds are annuities'], answer: 0,
        why: R`It is the other way round. An **annuity** stops after N payments. A **perpetuity** never stops.` },
      { id: 'w2-q20', topic: 'annuity', kind: 'mcq', level: 1, section: 'A',
        q: R`A question gives regular, equal payments but says **nothing** about when in each period they are paid. What should you assume?`,
        choices: ['They are paid at the end of each period (ordinary annuity)', 'They are paid at the start of each period (annuity due)', 'They are paid in the middle of each period', 'The first one is paid today'], answer: 0,
        why: R`BFC2140 rule: always assume an **ordinary annuity** (payments at the end of each period) unless told otherwise.` },
      { id: 'w2-q21', topic: 'annuity', kind: 'mcq', level: 2, section: 'A',
        q: R`An annuity pays $500 at the end of every year from \(t = 3\) to \(t = 10\). How many payments is that?`,
        choices: ['8', '7', '10', '9'], answer: 0,
        tl: { n: 10, at: { 3: '$500', 4: '$500', 5: '$500', 6: '$500', 7: '$500', 8: '$500', 9: '$500', 10: '$500' }, unit: 'Year', hi: [3, 10] },
        wrong: { 1: 'Subtracting the end dates misses one payment.' },
        why: R`Count both ends: \(10 - 3 + 1 = 8\) payments.` },
      { id: 'w2-q22', topic: 'annuity', kind: 'mcq', level: 2, section: 'A', formula: 'fv-annuity',
        q: R`\(FV = \frac{C}{r}\left((1+r)^{n} - 1\right)\) is the future value of an ordinary annuity. At which date is this value?`,
        choices: ['The date of the last payment', 'One period after the last payment', 'One period before the first payment', 'Today'], answer: 0,
        wrong: { 1: 'That is where the FV of an annuity due lands.', 2: 'That is where the PV formula lands.' },
        why: R`The last payment is made on that date and earns no interest. Every earlier payment is compounded up to it.` },
      { id: 'w2-q23', topic: 'annuity', kind: 'mcq', level: 2, section: 'A', src: 'Mock MST Q21',
        q: R`Which statement is **false**?`,
        choices: ['You cannot find the PV of an annuity when the discount rate is 0%', R`An annuity due is worth more than the same ordinary annuity when \(r > 0\)`, 'The PV of an annuity falls when the discount rate rises', 'An annuity stops after a fixed number of payments'], answer: 0,
        why: R`At 0%, every discount factor \(\frac{1}{(1+0)^{t}}\) equals 1. So the PV is simply the **sum** of the cash flows.` },
      { id: 'w2-q24', topic: 'annuity', kind: 'tf', level: 1, section: 'A', src: 'Mock MST Q26',
        q: R`All else equal, the present value of an annuity rises when the number of payments rises.`,
        answer: true,
        why: R`Each extra payment adds a positive PV, so the total goes up. (Each extra payment adds a little less than the one before.)` },
      { id: 'w2-q25', topic: 'annuity', kind: 'tf', level: 1, section: 'A', formula: 'pv-annuity',
        q: R`The present value of an annuity rises when the discount rate rises.`,
        answer: false,
        why: R`PV and \(r\) move in **opposite** directions. A higher rate shrinks every discount factor, so the PV falls.` },
      { id: 'w2-q26', topic: 'annuity', kind: 'num', level: 1, section: 'B', src: 'Tutorial W2 concept check Q5', formula: 'pv-annuity',
        q: R`The interest rate is 8%. An investment pays $1,000 at the end of each year for 20 years. What is it worth today?`,
        answer: FIN.pvAnnuity(1000, 0.08, 20), unit: '$', dp: 2,
        mistakes: [
          { v: 20000, why: 'That adds the payments. Future payments must be discounted.' },
          { v: FIN.fvAnnuity(1000, 0.08, 20), why: 'That is the future value at year 20, not the value today.' },
          { v: 20000 / 1.08, why: 'That discounts the total as if it all arrived in one year.' },
        ],
        steps: [
          R`\[PV = \frac{C}{r}\left(1 - \frac{1}{(1+r)^{n}}\right)\]`,
          R`\[PV = \frac{1{,}000}{0.08}\left(1 - \frac{1}{1.08^{20}}\right) = 12{,}500 \times ${L.numT(1 - 1 / 1.08 ** 20, 6)} = ${L.money(FIN.pvAnnuity(1000, 0.08, 20))}\]`,
        ],
        calc: `20 [N] · 8 [I/YR] · 1000 [PMT] · 0 [FV] · [PV] → −${T.money(FIN.pvAnnuity(1000, 0.08, 20))}`,
        why: 'End-of-year payments for a fixed time: an ordinary annuity.' },

      /* ----- annuities due and equivalent annuities ----- */
      { id: 'w2-q27', topic: 'due', kind: 'mcq', level: 1, section: 'A',
        q: R`You pay rent of $1,500 at the **start** of every month for a year. What kind of cash flow stream is this?`,
        choices: ['An annuity due', 'An ordinary annuity', 'A perpetuity', 'A growing annuity'], answer: 0,
        why: R`Equal payments at the **beginning** of each period, for a fixed time, form an **annuity due** (annuity in advance).` },
      { id: 'w2-q28', topic: 'due', kind: 'mcq', level: 2, section: 'A', formula: 'pv-annuity-due',
        q: R`An annuity due and an ordinary annuity have the same \(C\), \(n\) and \(r > 0\). How do their present values compare?`,
        choices: [R`The annuity due is worth \((1+r)\) times as much`, R`The annuity due is worth less: divide by \((1+r)\)`, 'They are worth the same', R`The annuity due is worth exactly one payment \(C\) more`], answer: 0,
        wrong: { 3: R`Close, but not exact. The due version gains a payment today but loses the last one, so the gap is \(C - \frac{C}{(1+r)^{n}}\).` },
        why: R`Every payment of the annuity due arrives one period earlier, so each is discounted one period less: \(PV_{due} = PV_{ord} \times (1+r)\).` },
      { id: 'w2-q29', topic: 'due', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W2 Example 7',
        q: R`How do you value an **annuity due** on the HP10bII+?`,
        choices: ['Switch to BEG mode, solve, then switch back to END mode', 'Stay in END mode and add one to N', 'Enter the payment as a positive number', 'Set P/YR to 0'], answer: 0,
        wrong: { 1: 'Adding a period changes the number of payments, not their timing.' },
        why: R`BEG mode tells the calculator that payments come at the start of each period. Switch back to END afterwards, or your next answer will be wrong.` },
      { id: 'w2-q30', topic: 'due', kind: 'mcq', level: 2, section: 'A', formula: 'fv-annuity-due',
        q: R`You deposit \(C\) at the **start** of each year for 5 years (\(t = 0\) to \(t = 4\)). At which date is \(FV = \frac{C}{r}\left((1+r)^{5} - 1\right)(1+r)\)?`,
        choices: [R`\(t = 5\), one period after the last deposit`, R`\(t = 4\), the date of the last deposit`, R`\(t = 0\), today`, R`\(t = 6\)`], answer: 0,
        tl: { n: 5, at: { 0: 'C', 1: 'C', 2: 'C', 3: 'C', 4: 'C' }, unit: 'Year', hi: [5] },
        why: R`The ordinary FV formula would land on the last deposit, \(t = 4\). Multiplying by \((1+r)\) moves it one more period, to \(t = 5\).` },
      { id: 'w2-q31', topic: 'due', kind: 'num', level: 2, section: 'B', src: 'Lecture W2 Example 7', formula: 'pv-annuity-due',
        q: R`{NAME}’s rich uncle promises $1,000 per month, **starting today**. The **final** payment is **6 months from today**. The interest rate is 0.5% per month. What are the payments worth today?`,
        tl: { n: 6, at: { 0: '$1,000', 1: '$1,000', 2: '$1,000', 3: '$1,000', 4: '$1,000', 5: '$1,000', 6: '$1,000' }, unit: 'Month', hi: [0] },
        answer: FIN.pvAnnuityDue(1000, 0.005, 7), unit: '$', dp: 2,
        mistakes: [
          { v: FIN.pvAnnuity(1000, 0.005, 7), why: 'That is an ordinary annuity. The first payment is today, so use the annuity due formula.' },
          { v: FIN.pvAnnuityDue(1000, 0.005, 6), why: R`Count the payments: \(t = 0\) to \(t = 6\) is 7 payments, not 6.` },
          { v: 7000, why: 'That adds the payments and ignores discounting.' },
        ],
        steps: [
          R`Payments at \(t = 0, 1, \ldots, 6\): that is \(n = 7\) payments, at the **start** of each month.`,
          R`\[PV_{due} = \frac{C}{r}\left(1 - \frac{1}{(1+r)^{n}}\right)(1+r)\]`,
          R`\[PV_{due} = \frac{1{,}000}{0.005}\left(1 - \frac{1}{1.005^{7}}\right)(1.005) = ${L.money(FIN.pvAnnuity(1000, 0.005, 7))} \times 1.005 = ${L.money(FIN.pvAnnuityDue(1000, 0.005, 7))}\]`,
        ],
        calc: `BEG mode · 7 [N] · 0.5 [I/YR] · 1000 [PMT] · 0 [FV] · [PV] → −${T.money(FIN.pvAnnuityDue(1000, 0.005, 7))} · then back to END mode`,
        why: 'Starting today makes it an annuity due. Count the payments carefully: 0 to 6 is seven.' },
      { id: 'w2-q32', topic: 'due', kind: 'num', level: 2, section: 'B', src: 'Lecture W2 Excel FV example', formula: 'fv-annuity-due',
        q: R`You deposit $1,000 today. You also deposit $100 at the **start** of every month for 12 months. The account pays 6% p.a., compounded monthly (0.5% per month). How much is in the account at the end of month 12?`,
        answer: FIN.tvm.solveFV(12, 0.005, -1000, -100, 1), unit: '$', dp: 2,
        mistakes: [
          { v: 1000 * 1.005 ** 12 + FIN.fvAnnuity(100, 0.005, 12), why: 'That treats the $100 deposits as end-of-month. They are made at the start, so each earns one more month of interest.' },
          { v: 2200, why: 'That adds the deposits and ignores interest.' },
          { v: FIN.fvAnnuityDue(100, 0.005, 12), why: 'You left out the $1,000 deposited today. It grows too.' },
        ],
        steps: [
          R`The $1,000 grows for 12 months: \[1{,}000 \times 1.005^{12} = ${L.money(1000 * 1.005 ** 12)}\]`,
          R`The deposits are an annuity due: \[\frac{100}{0.005}\left(1.005^{12} - 1\right)(1.005) = ${L.money(FIN.fvAnnuityDue(100, 0.005, 12))}\]`,
          R`\[FV = ${L.num(1000 * 1.005 ** 12)} + ${L.num(FIN.fvAnnuityDue(100, 0.005, 12))} = ${L.money(FIN.tvm.solveFV(12, 0.005, -1000, -100, 1))}\]`,
        ],
        calc: `BEG mode · 12 [N] · 0.5 [I/YR] · −1000 [PV] · −100 [PMT] · [FV] → ${T.money(FIN.tvm.solveFV(12, 0.005, -1000, -100, 1))} · then back to END mode`,
        why: 'Add the lump sum’s FV and the annuity due’s FV.' },
      { id: 'w2-q33', topic: 'due', kind: 'num', level: 2, section: 'B', src: 'Lecture W2 Example 8', formula: 'pv-annuity-due',
        q: R`Asset 2 pays a lump sum of $700 at \(t = 1\). The rate is 5% p.a. Find its **equivalent annuity**: the 5-year annuity **due** (payments at \(t = 0\) to \(t = 4\)) with the same present value.`,
        answer: (700 / 1.05) / (FIN.pvifa(0.05, 5) * 1.05), unit: '$', dp: 2,
        mistakes: [
          { v: (700 / 1.05) / FIN.pvifa(0.05, 5), why: R`That is an ordinary annuity. These payments start today, so also divide by \((1+r)\).` },
          { v: 140, why: 'That spreads $700 evenly and ignores discounting.' },
          { v: (700 / 1.05) / 5, why: 'That spreads the PV evenly. Later payments must be discounted too.' },
        ],
        steps: [
          R`Step 1, the PV of Asset 2: \[PV = \frac{700}{1.05} = ${L.money(700 / 1.05)}\]`,
          R`Step 2, set it equal to a 5-year annuity due: \[${L.num(700 / 1.05)} = \frac{C}{0.05}\left(1 - \frac{1}{1.05^{5}}\right)(1.05) = C \times ${L.numT(FIN.pvifa(0.05, 5) * 1.05, 6)}\]`,
          R`\[C = \frac{${L.num(700 / 1.05)}}{${L.numT(FIN.pvifa(0.05, 5) * 1.05, 6)}} = ${L.money((700 / 1.05) / (FIN.pvifa(0.05, 5) * 1.05))}\]`,
          R`Asset 1 pays $200 a year on the same dates (PV \(= ${L.money(FIN.pvAnnuityDue(200, 0.05, 5))}\)). $200 beats the equivalent $146.65, so Asset 1 is better.`,
        ],
        why: 'An equivalent annuity turns a stream into level payments, so two assets can be compared like for like.' },

      /* ----- growth ----- */
      { id: 'w2-q34', topic: 'growth', kind: 'mcq', level: 2, section: 'A', formula: 'pv-grow-perp',
        q: R`When can you use the growing perpetuity formula \(PV = \frac{C_1}{r - g}\)?`,
        choices: [R`Only when \(r > g\)`, R`Only when \(g > r\)`, R`Only when \(g = 0\)`, 'Whenever the cash flows grow, at any rate'], answer: 0,
        why: R`If \(g \ge r\), the cash flows grow as fast as they are discounted, and the value would be infinite. The formula then gives nonsense.` },
      { id: 'w2-q35', topic: 'growth', kind: 'tf', level: 1, section: 'A', formula: 'pv-grow-perp',
        q: R`In \(PV = \frac{C_1}{r - g}\), \(C_1\) is the cash flow that has **just been paid**.`,
        answer: false,
        why: R`\(C_1\) is the **next** cash flow, one period from now. If you are given the one just paid (\(C_0\)), grow it first: \(C_1 = C_0(1+g)\).` },
      { id: 'w2-q36', topic: 'growth', kind: 'mcq', level: 2, section: 'A', formula: 'pv-grow-annuity',
        q: R`In the growing annuity formula, what happens when \(g = 0\)?`,
        choices: ['It becomes the ordinary annuity formula', 'It becomes the perpetuity formula', 'It becomes the annuity due formula', 'It can no longer be used'], answer: 0,
        why: R`With \(g = 0\): \(\frac{C}{r}\left(1 - \left(\frac{1}{1+r}\right)^{n}\right) = \frac{C}{r}\left(1 - \frac{1}{(1+r)^{n}}\right)\), the ordinary annuity.` },
      { id: 'w2-q37', topic: 'growth', kind: 'num', level: 2, section: 'B', src: 'Lecture W2 Example 9', formula: 'pv-grow-annuity',
        q: R`Hill Enterprises expects its new store to earn $675,000 **next year**. The cash flows then grow at 13% a year. There are 15 cash flows in total (years 1 to 15). The discount rate is 18%. What is their present value?`,
        answer: FIN.pvGrowAnnuity(675000, 0.18, 0.13, 15), unit: '$', dp: 2,
        mistakes: [
          { v: 675000 / 0.05, why: 'That is a growing perpetuity. These cash flows stop after 15 years.' },
          { v: FIN.pvAnnuity(675000, 0.18, 15), why: 'That ignores the 13% growth.' },
          { v: FIN.pvGrowAnnuity(675000 * 1.13, 0.18, 0.13, 15), why: 'The first cash flow is already next year’s $675,000. Do not grow it again.' },
        ],
        steps: [
          R`\[PV = \frac{C}{r - g}\left(1 - \left(\frac{1+g}{1+r}\right)^{n}\right)\]`,
          R`\[PV = \frac{675{,}000}{0.18 - 0.13}\left(1 - \left(\frac{1.13}{1.18}\right)^{15}\right) = 13{,}500{,}000 \times (1 - ${L.numT(Math.pow(1.13 / 1.18, 15), 8)})\]`,
          R`\[PV = ${L.money(FIN.pvGrowAnnuity(675000, 0.18, 0.13, 15))}\]`,
        ],
        why: 'Growing cash flows for a fixed number of years: a growing annuity.' },

      /* ----- loans ----- */
      { id: 'w2-q38', topic: 'loan', kind: 'mcq', level: 1, section: 'A', src: 'Mock MST Q25',
        q: R`Which statement about a fully amortised loan with equal payments is **true**?`,
        choices: ['The interest part of each payment falls over time', 'The interest part of each payment rises over time', 'The principal part of each payment falls over time', 'Each payment is split equally between interest and principal'], answer: 0,
        why: R`Interest is charged on the balance still owed. Every payment cuts the balance, so the interest part falls and the principal part rises.` },
      { id: 'w2-q39', topic: 'loan', kind: 'mcq', level: 2, section: 'A', formula: 'loan-balance',
        q: R`What is the **outstanding balance** of an amortised loan straight after payment \(k\)?`,
        choices: ['The PV of the remaining payments, at the loan rate', R`The original loan minus \(k\) payments`, 'The FV of the payments already made', 'The original loan minus the interest paid so far'], answer: 0,
        wrong: { 1: 'Each payment is partly interest, so this understates what you still owe.' },
        why: R`\(\text{Balance}_k = PMT \times \frac{1}{r}\left(1 - \frac{1}{(1+r)^{n-k}}\right)\). It is what the lender would accept today to clear the loan.` },
      { id: 'w2-q40', topic: 'loan', kind: 'mcq', level: 2, section: 'A', src: 'Tutorial W2 Q1(c)–(d)',
        q: R`Five years into a variable-rate mortgage, the interest rate rises. Which statement is **true**?`,
        choices: ['You must pay more each month, or keep the payment and take longer to repay', 'Your payment stays the same and the loan still ends on time', 'The balance you owe jumps up straight away', 'Nothing changes until the loan is refinanced'], answer: 0,
        why: R`At a higher rate, the same balance needs a bigger payment over the months left. If you keep the old payment, less of it repays principal, so it takes more months.` },
      { id: 'w2-q41', topic: 'loan', kind: 'mcq', level: 1, section: 'A', formula: 'pv-annuity',
        q: R`A 25-year loan charges 6% p.a., compounded monthly, with monthly payments. Which inputs go into the annuity formula?`,
        choices: [R`\(r = 0.5\%\) per month and \(n = 300\)`, R`\(r = 6\%\) and \(n = 25\)`, R`\(r = 6\%\) and \(n = 300\)`, R`\(r = 0.5\%\) and \(n = 25\)`], answer: 0,
        why: R`Match the rate to the payment period: \(r = \frac{6\%}{12} = 0.5\%\) per month and \(n = 25 \times 12 = 300\) months.` },
      { id: 'w2-q42', topic: 'loan', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W2 Example 11',
        q: R`In an amortisation schedule, how is the interest for a period worked out?`,
        choices: [R`Opening balance \(\times r\)`, R`Payment \(\times r\)`, R`Original loan \(\times r\)`, R`Payment \(-\) opening balance`], answer: 0,
        why: R`Interest is charged on what you owe at the start of the period. The rest of the payment reduces the balance.` },
      { id: 'w2-q43', topic: 'loan', kind: 'num', level: 2, section: 'B', src: 'Lecture W2 Example 11', formula: 'pv-annuity',
        q: R`Here is the start of the schedule for a $5,000 loan at 9% p.a., repaid with 5 annual payments of $1,285.46. How much of the **Year 2** payment is **interest**?`,
        table: { head: ['Year', 'Opening', 'Payment', 'Interest', 'Principal', 'Closing'],
          rows: [['1', '$5,000.00', '$1,285.46', '$450.00', '$835.46', '$4,164.54'], ['2', '$4,164.54', '$1,285.46', '?', '?', '?']] },
        answer: r2(4164.54 * 0.09), unit: '$', dp: 2,
        mistakes: [
          { v: 450, why: 'That is the Year 1 interest. The balance is lower now, so the interest is lower too.' },
          { v: r2(1285.46 - r2(4164.54 * 0.09)), why: 'That is the principal part of the Year 2 payment.' },
          { v: r2(1285.46 * 0.09), why: 'Interest is charged on the opening balance, not on the payment.' },
        ],
        steps: [
          R`\[\text{Interest}_2 = 4{,}164.54 \times 0.09 = ${L.money(4164.54 * 0.09)}\]`,
          R`\[\text{Principal}_2 = 1{,}285.46 - ${L.num(4164.54 * 0.09)} = ${L.money(1285.46 - r2(4164.54 * 0.09))}\]`,
          R`\[\text{Closing}_2 = 4{,}164.54 - ${L.num(1285.46 - r2(4164.54 * 0.09))} = ${L.money(4164.54 - r2(1285.46 - r2(4164.54 * 0.09)))}\]`,
        ],
        why: R`Interest \(=\) opening balance \(\times\) rate. It falls every year because the balance falls.` },
      { id: 'w2-q44', topic: 'loan', kind: 'num', level: 2, section: 'B', src: 'MST 2026 Q14', formula: 'loan-balance',
        q: R`You take out a 30-year, $250,000 mortgage at 7.2% p.a., with monthly payments at the end of each month. How much do you still owe **after 4 years**?`,
        answer: MST14.bal, unit: '$', dp: 2,
        mistakes: [
          { v: 250000 - 48 * r2(MST14.pay), why: 'Subtracting payments ignores interest. Early payments are mostly interest.' },
          { v: 250000 * (1 - 4 / 30), why: 'Principal is not repaid evenly. In the early years very little principal is repaid.' },
          { v: FIN.pvAnnuity(MST14.pay, 0.006, 356), why: '4 years is 48 monthly payments, not 4.' },
        ],
        steps: [
          R`Monthly rate \(i = \frac{0.072}{12} = 0.006\) and \(n = 360\). The payment: \[PMT = \frac{250{,}000 \times 0.006}{1 - 1.006^{-360}} = ${L.money(MST14.pay)}\]`,
          R`Payments left: \(360 - 48 = 312\).`,
          R`Balance = PV of the remaining payments: \[\frac{${L.num(MST14.pay)}}{0.006}\left(1 - \frac{1}{1.006^{312}}\right) = ${L.money(MST14.bal)}\]`,
        ],
        calc: `360 [N] · 0.6 [I/YR] · −250000 [PV] · 0 [FV] · [PMT] → ${T.money(MST14.pay)} · then 312 [N] · [PV] → −${T.money(MST14.bal)}`,
        why: 'What you owe is the present value of the payments you still have to make.' },
      { id: 'w2-q45', topic: 'loan', kind: 'num', level: 2, section: 'B', src: 'Tutorial W2 Q1(c)', formula: 'pv-annuity',
        q: R`You borrowed $400,000 over 30 years at 7% p.a. (monthly payments of $2,661.21). After 5 years you owe $376,526.36, and the rate rises by 50 basis points to 7.5%. By how much does your monthly payment **increase**?`,
        answer: r2(T1.newPay) - r2(T1.pay), unit: '$', dp: 2,
        mistakes: [
          { v: r2(T1.newPay), why: 'That is the new payment. The question asks for the increase.' },
          { v: FIN.pmt(400000, 0.075 / 12, 360) - r2(T1.pay), why: 'That re-prices the original loan over 30 years. Use the balance owed now and the 300 months left.' },
          { v: 376526.36 * 0.005 / 12, why: 'That is one month of extra interest. The new payment must come from the annuity formula.' },
        ],
        steps: [
          R`Months left: \(360 - 60 = 300\). New monthly rate: \(\frac{0.075}{12} = 0.00625\).`,
          R`\[PMT_{new} = \frac{376{,}526.36 \times 0.00625}{1 - 1.00625^{-300}} = ${L.money(T1.newPay)}\]`,
          R`\[\text{Increase} = ${L.num(T1.newPay)} - 2{,}661.21 = ${L.money(r2(T1.newPay) - r2(T1.pay))}\]`,
        ],
        calc: `300 [N] · 7.5 ÷ 12 = [I/YR] · −376526.36 [PV] · 0 [FV] · [PMT] → ${T.money(T1.newPay)}`,
        why: 'Re-price what you still owe, over the months you have left, at the new rate.' },
      { id: 'w2-q46', topic: 'loan', kind: 'num', level: 3, section: 'B', src: 'Tutorial W2 Q1(d)', formula: 'pv-annuity',
        q: R`Same mortgage: you owe $376,526.36 at 7.5% p.a. (monthly). You keep paying the **old** $2,661.21 a month. How many monthly payments are still needed? (Answer in months.)`,
        answer: T1.nLeft, unit: '', dp: 2,
        mistakes: [
          { v: 300, why: 'That is the original number of months left. A higher rate with the same payment takes longer.' },
          { v: T1.nLeft - 300, why: 'That is only the extra months. The question asks for all the payments still needed.' },
          { v: T1.nLeft / 12, why: 'That is in years. The question asks for months.' },
        ],
        steps: [
          R`Solve for \(n\): \[376{,}526.36 = \frac{2{,}661.21}{0.00625}\left(1 - \frac{1}{1.00625^{n}}\right)\]`,
          R`\[\frac{1}{1.00625^{n}} = 1 - \frac{376{,}526.36 \times 0.00625}{2{,}661.21} = ${L.numT(1 - 376526.36 * 0.00625 / 2661.21, 6)}\]`,
          R`\[n = \frac{-\ln(${L.numT(1 - 376526.36 * 0.00625 / 2661.21, 6)})}{\ln(1.00625)} = ${L.num(T1.nLeft)} \text{ months} \approx ${L.num(T1.nLeft / 12)} \text{ years}\]`,
        ],
        calc: `7.5 ÷ 12 = [I/YR] · −376526.36 [PV] · 2661.21 [PMT] · 0 [FV] · [N] → ${T.num(T1.nLeft)}`,
        why: R`About 28 years and 309 days: roughly 46 months longer than the 300 months that were left.` },
      { id: 'w2-q47', topic: 'loan', kind: 'num', level: 3, section: 'B', src: 'Mock MST Q13', formula: 'loan-balance',
        q: R`Sarah borrows $550,000 for 30 years at 3.5% p.a., with monthly payments at the end of each month. Three years later the rate falls to 3.0% p.a. What is her new monthly repayment?`,
        answer: MOCK13.newPay, unit: '$', dp: 2,
        mistakes: [
          { v: MOCK13.pay, why: 'That is the old payment. A lower rate on the balance means a lower payment.' },
          { v: FIN.pmt(550000, 0.03 / 12, 360), why: 'That re-prices the original loan over 30 years. Use the balance after 3 years and the 324 months left.' },
          { v: FIN.pmt(MOCK13.bal, 0.03 / 12, 360), why: 'Only 324 months are left, not 360.' },
        ],
        steps: [
          R`Original payment: \(i = \frac{0.035}{12}\), \(n = 360\): \[PMT = \frac{550{,}000 \times i}{1 - (1 + i)^{-360}} = ${L.money(MOCK13.pay)}\]`,
          R`Balance after 3 years (\(360 - 36 = 324\) payments left): \[\frac{${L.num(MOCK13.pay)}}{i}\left(1 - \frac{1}{(1 + i)^{324}}\right) = ${L.money(MOCK13.bal)}\]`,
          R`New payment at \(\frac{0.03}{12}\) over 324 months: \[PMT_{new} = \frac{${L.num(MOCK13.bal)} \times \frac{0.03}{12}}{1 - \left(1 + \frac{0.03}{12}\right)^{-324}} = ${L.money(MOCK13.newPay)}\]`,
        ],
        calc: `360 [N] · 3.5 ÷ 12 = [I/YR] · −550000 [PV] · 0 [FV] · [PMT] → ${T.money(MOCK13.pay)} · 324 [N] · [PV] → −${T.money(MOCK13.bal)} · 3 ÷ 12 = [I/YR] · [PMT] → ${T.money(MOCK13.newPay)}`,
        why: R`Payment, then balance, then the new payment. (The mock solution shows $2,331.01 because the balance was typed as $517,196.67.)` },

      /* ----- saving ----- */
      { id: 'w2-q48', topic: 'save', kind: 'mcq', level: 1, section: 'A', formula: 'fv-annuity',
        q: R`You want $20,000 in 5 years and will save an equal amount at the end of each year. Which formula finds the deposit?`,
        choices: [R`\(FV = \frac{C}{r}\left((1+r)^{n} - 1\right)\), solved for \(C\)`, R`\(PV = \frac{C}{r}\left(1 - \frac{1}{(1+r)^{n}}\right)\), solved for \(C\), with \(PV = 20{,}000\)`, R`\(PV = \frac{C}{r}\)`, R`\(FV_n = PV(1+r)^{n}\)`], answer: 0,
        wrong: { 1: 'That treats $20,000 as a loan taken today. It is a future target.' },
        why: R`$20,000 is a **future** target, so use the FV of an annuity and solve for \(C\).` },
      { id: 'w2-q49', topic: 'save', kind: 'mcq', level: 2, section: 'B', src: 'Tutorial W2 Q2(b)',
        q: R`It is 1 July 2016. You need $10,000 on 1 July 2021, and you can earn 8% p.a. Your father offers **either** five payments of $1,704.56 (on 1 July 2017 to 2021), **or** $7,500 on 1 July 2017. Which should you take?`,
        choices: [R`The $7,500: by 2021 it grows to \(7{,}500 \times 1.08^{4} = \$10{,}203.67\)`, R`The payments: \(5 \times 1{,}704.56 = \$8{,}522.80\) is more than $7,500`, 'The $7,500, because it is still worth $7,500 in 2021', 'They are worth exactly the same'], answer: 0,
        wrong: { 1: 'That adds dollars from different dates, which ignores interest.' },
        why: R`Compare at the same date. The payments grow to exactly $10,000 by 2021. The $7,500 grows to ${T.money(7500 * 1.08 ** 4)}, so it is better.` },
      { id: 'w2-q50', topic: 'save', kind: 'num', level: 2, section: 'B', src: 'Tutorial W2 Q2(d)', formula: 'fv-annuity',
        q: R`It is 1 July 2016. You need $10,000 on 1 July 2021. Your father gives you $4,000 **today**. You add equal **half-yearly** deposits, the first in six months and the last on 1 July 2021. The bank pays 8% p.a., compounded semi-annually. How big must each deposit be?`,
        answer: -FIN.tvm.solvePMT(10, 0.04, -4000, 10000), unit: '$', dp: 2,
        mistakes: [
          { v: FIN.pmtForFV(10000, 0.04, 10), why: 'You forgot the $4,000 gift. It grows in the account too.' },
          { v: (10000 - 4000 * 1.08 ** 5) / FIN.fvifa(0.08, 5), why: 'That uses annual deposits. These are half-yearly: 10 deposits at 4% each.' },
          { v: -FIN.tvm.solvePMT(10, 0.08, -4000, 10000), why: 'That uses 8% per half-year. Halve it: 4% per half-year.' },
        ],
        steps: [
          R`Half-yearly: \(i = \frac{8\%}{2} = 4\%\) and \(n = 5 \times 2 = 10\).`,
          R`The gift grows to \[4{,}000 \times 1.04^{10} = ${L.money(4000 * 1.04 ** 10)}\]`,
          R`The deposits must cover the rest: \(10{,}000 - ${L.num(4000 * 1.04 ** 10)} = ${L.money(10000 - 4000 * 1.04 ** 10)}\).`,
          R`\[C = \frac{${L.num(10000 - 4000 * 1.04 ** 10)} \times 0.04}{1.04^{10} - 1} = ${L.money(-FIN.tvm.solvePMT(10, 0.04, -4000, 10000))}\]`,
        ],
        calc: `10 [N] · 4 [I/YR] · −4000 [PV] · 10000 [FV] · [PMT] → −${T.money(-FIN.tvm.solvePMT(10, 0.04, -4000, 10000))}`,
        why: 'The gift covers part of the target. The deposits cover the rest.' },
      { id: 'w2-q51', topic: 'save', kind: 'num', level: 2, section: 'B', src: 'MST 2026 Q15', formula: 'fv-annuity',
        q: R`Priya deposits $200 at the **end** of every month, from her daughter’s 3rd birthday until her 18th birthday. The account pays 5.4% p.a., compounded monthly. How much is in the account on the 18th birthday?`,
        answer: FIN.fvAnnuity(200, 0.0045, 180), unit: '$', dp: 2,
        mistakes: [
          { v: FIN.fvAnnuity(200, 0.0045, 216), why: 'That counts 18 years of deposits. They run from age 3 to 18: 15 years, or 180 months.' },
          { v: 36000, why: 'That adds the deposits and ignores interest.' },
          { v: FIN.fvAnnuityDue(200, 0.0045, 180), why: 'That treats the deposits as start-of-month. They are made at the end of each month.' },
        ],
        steps: [
          R`Monthly: \(i = \frac{5.4\%}{12} = 0.45\%\) and \(n = (18 - 3) \times 12 = 180\).`,
          R`\[FV = \frac{200}{0.0045}\left(1.0045^{180} - 1\right) = ${L.money(FIN.fvAnnuity(200, 0.0045, 180))}\]`,
        ],
        calc: `180 [N] · 0.45 [I/YR] · 0 [PV] · −200 [PMT] · [FV] → ${T.money(FIN.fvAnnuity(200, 0.0045, 180))}`,
        why: R`Count only the months when deposits are made: \(15 \times 12 = 180\).` },

      /* ----- solving for r and n ----- */
      { id: 'w2-q52', topic: 'rate', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W2 Example 12',
        q: R`You are solving for \(r\) by trial and error. At 10%, the annuity’s PV is **above** the target price. What should you try next?`,
        choices: ['A higher rate, because PV falls as r rises', 'A lower rate, because PV falls as r falls', 'The same rate with more payments', 'Stop: 10% must be the answer'], answer: 0,
        why: R`PV and \(r\) move in opposite directions. To bring the PV down to the target, raise \(r\).` },
      { id: 'w2-q53', topic: 'rate', kind: 'mcq', level: 2, section: 'A', formula: 'interp',
        q: R`For **interpolation** you need two trial rates, \(r_1\) and \(r_2\). What must be true about them?`,
        choices: ['At one rate the PV is above the target, and at the other it is below', 'Both PVs are above the target', 'Both PVs are below the target', 'They must be exactly 5% apart'], answer: 0,
        why: R`With \(A = PV - \text{target}\), you need \(A_1 > 0\) and \(A_2 < 0\). The answer is trapped between them: \(\lambda = \frac{A_1}{A_1 - A_2}\) and \(r = r_1 + \lambda(r_2 - r_1)\).` },
      { id: 'w2-q54', topic: 'rate', kind: 'tf', level: 2, section: 'A', formula: 'interp',
        q: R`Interpolation always gives exactly the same rate as a financial calculator.`,
        answer: false,
        why: R`It draws a straight line between two points on a curve, so it is an **estimate**. The closer the two trial rates, the better the estimate.` },
      { id: 'w2-q55', topic: 'rate', kind: 'num', level: 2, section: 'B', src: 'Lecture W2 Example 12', formula: 'interp',
        q: R`A 5-year ordinary annuity of $100 a year costs $350. At 13% its PV is $351.72. At 14% its PV is $343.31. Use **interpolation** to estimate the rate of return.`,
        answer: P(EX12.r), unit: '%', dp: 2,
        mistakes: [
          { v: P(0.14 - EX12.lambda * 0.01), why: R`\(\lambda\) is measured from \(r_1 = 13\%\), not from \(r_2\).` },
          { v: 13.5, why: 'That is just the midpoint. Interpolation weights by how far each PV is from $350.' },
          { v: 13, why: 'That is only the nearest trial rate. Interpolate between the two.' },
        ],
        steps: [
          R`\[A_1 = 351.72 - 350 = 1.72 \quad (r_1 = 13\%)\]`,
          R`\[A_2 = 343.31 - 350 = -6.69 \quad (r_2 = 14\%)\]`,
          R`\[\lambda = \frac{A_1}{A_1 - A_2} = \frac{1.72}{1.72 + 6.69} = ${L.num(EX12.lambda, 4)}\]`,
          R`\[r = 13\% + ${L.num(EX12.lambda, 4)} \times (14\% - 13\%) = ${L.pct(EX12.r, 2)}\]`,
        ],
        calc: `5 [N] · −350 [PV] · 100 [PMT] · 0 [FV] · [I/YR] → ${T.num(FIN.tvm.solveI(5, -350, 100, 0) * 100)}`,
        why: 'The rate lies about a fifth of the way from 13% to 14%, because $350 is much closer to the 13% PV.' },
      { id: 'w2-q56', topic: 'rate', kind: 'num', level: 2, section: 'B', src: 'Lecture W2 Excel NPER example', formula: 'fv-annuity',
        q: R`You deposit $20,000 now and $100 at the end of each month. The account earns 0.5% per month. How many months until you have $30,000? (Answer in months.)`,
        answer: FIN.tvm.solveN(0.005, -20000, -100, 30000), unit: '', dp: 2,
        mistakes: [
          { v: FIN.nper(20000, 30000, 0.005), why: 'That ignores the $100 monthly deposits.' },
          { v: FIN.tvm.solveN(0.005, -20000, -100, 30000) / 12, why: 'That is in years. The question asks for months.' },
          { v: 100, why: R`That ignores interest: \(\frac{\$10{,}000}{\$100} = 100\).` },
        ],
        steps: [
          R`The balance after \(n\) months must reach $30,000: \[20{,}000(1.005)^{n} + \frac{100}{0.005}\left(1.005^{n} - 1\right) = 30{,}000\]`,
          R`\[40{,}000 \times 1.005^{n} - 20{,}000 = 30{,}000 \;\Rightarrow\; 1.005^{n} = 1.25\]`,
          R`\[n = \frac{\ln 1.25}{\ln 1.005} = ${L.num(FIN.tvm.solveN(0.005, -20000, -100, 30000))} \text{ months} \approx ${L.num(FIN.tvm.solveN(0.005, -20000, -100, 30000) / 12)} \text{ years}\]`,
        ],
        calc: `0.5 [I/YR] · −20000 [PV] · −100 [PMT] · 30000 [FV] · [N] → ${T.num(FIN.tvm.solveN(0.005, -20000, -100, 30000))}`,
        why: 'Both the lump sum and the deposits grow. Solve for the number of periods.' },

      /* ----- more course examples and concept checks ----- */
      { id: 'w2-q60', topic: 'growth', kind: 'num', level: 1, section: 'B', src: 'Lecture W2 Example 10', formula: 'pv-grow-perp',
        q: R`A government security pays interest once a year, forever. The first payment of $3 is at the end of year 1. Payments then grow at 2% a year. The discount rate is 10%. What is the security worth today?`,
        answer: FIN.pvGrowPerp(3, 0.10, 0.02), unit: '$', dp: 2,
        mistakes: [
          { v: 3 / 0.10, why: R`That ignores the growth. Divide by \(r - g\), not \(r\).` },
          { v: (3 * 1.02) / 0.08, why: 'The first payment is already $3 at year 1. Do not grow it again.' },
          { v: 3 / 0.12, why: 'Subtract g from r. Do not add it.' },
        ],
        steps: [R`\[PV = \frac{C_1}{r - g} = \frac{3}{0.10 - 0.02} = ${L.money(FIN.pvGrowPerp(3, 0.10, 0.02))}\]`],
        why: R`Growing perpetuity: the next payment divided by \((r - g)\).` },
      { id: 'w2-q61', topic: 'loan', kind: 'num', level: 1, section: 'B', src: 'Lecture W2 Example 11', formula: 'pv-annuity',
        q: R`You borrow $5,000 at 9% p.a. and repay it with five equal annual payments, the first one in a year. How big is each payment?`,
        answer: FIN.pmt(5000, 0.09, 5), unit: '$', dp: 2,
        mistakes: [
          { v: 1000, why: 'That ignores interest. The payments must also cover interest on the balance.' },
          { v: 1450, why: 'That is the first payment of an equal-principal loan ($1,000 + $450 interest). Equal payments come from the annuity formula.' },
          { v: FIN.pmt(5000, 0.09, 5) / 1.09, why: 'That treats the payments as starting today. They start in one year.' },
        ],
        steps: [
          R`The loan is the PV of the payments: \[5{,}000 = C \times \frac{1}{0.09}\left(1 - \frac{1}{1.09^{5}}\right) = C \times ${L.numT(FIN.pvifa(0.09, 5), 6)}\]`,
          R`\[C = \frac{5{,}000}{${L.numT(FIN.pvifa(0.09, 5), 6)}} = ${L.money(FIN.pmt(5000, 0.09, 5))}\]`,
          R`Total paid: \(5 \times 1{,}285.46 = \$6{,}427.30\), so the interest is $1,427.30.`,
        ],
        calc: `5 [N] · 9 [I/YR] · −5000 [PV] · 0 [FV] · [PMT] → ${T.money(FIN.pmt(5000, 0.09, 5))}`,
        why: 'Set the loan equal to the PV of an ordinary annuity and solve for C.' },
      { id: 'w2-q62', topic: 'loan', kind: 'num', level: 1, section: 'B', src: 'Tutorial W2 Q1(a)', formula: 'pv-annuity',
        q: R`You borrow $400,000 to buy a house. The loan is over 30 years at 7% p.a., with payments at the end of each month. What is the monthly payment?`,
        answer: T1.pay, unit: '$', dp: 2,
        mistakes: [
          { v: FIN.pmt(400000, 0.07, 30) / 12, why: 'An annual payment divided by 12 is not the monthly payment. Work in months from the start.' },
          { v: 400000 / 360, why: 'That ignores interest.' },
          { v: FIN.pmt(400000, 0.07 / 12, 30), why: R`That uses 30 periods. Monthly payments need \(n = 30 \times 12 = 360\).` },
        ],
        steps: [
          R`Monthly: \(i = \frac{0.07}{12}\) and \(n = 30 \times 12 = 360\).`,
          R`\[PMT = \frac{400{,}000 \times \frac{0.07}{12}}{1 - \left(1 + \frac{0.07}{12}\right)^{-360}} = ${L.money(T1.pay)}\]`,
        ],
        calc: `360 [N] · 7 ÷ 12 = [I/YR] · −400000 [PV] · 0 [FV] · [PMT] → ${T.money(T1.pay)}`,
        why: 'Monthly loan: monthly rate, number of months, then the annuity formula solved for C.' },
      { id: 'w2-q63', topic: 'loan', kind: 'num', level: 2, section: 'B', src: 'Tutorial W2 Q1(b)', formula: 'loan-balance',
        q: R`Same mortgage: $400,000 over 30 years at 7% p.a., with monthly payments of $2,661.21. You sell the house after 5 years. How much do you still owe the bank?`,
        answer: T1.bal, unit: '$', dp: 2,
        mistakes: [
          { v: 400000 - 60 * 2661.21, why: 'Subtracting payments ignores interest. Early payments are mostly interest.' },
          { v: 400000 * (1 - 5 / 30), why: 'Principal is not repaid evenly. In the early years very little principal is repaid.' },
          { v: FIN.pvAnnuity(2661.21, 0.07 / 12, 355), why: '5 years is 60 monthly payments, not 5.' },
        ],
        steps: [
          R`Payments left: \(360 - 60 = 300\).`,
          R`Balance = PV of the remaining payments: \[\frac{2{,}661.21}{\frac{0.07}{12}}\left(1 - \frac{1}{\left(1 + \frac{0.07}{12}\right)^{300}}\right) = ${L.money(T1.bal)}\]`,
          R`Check: the loan grows to \(400{,}000\left(1 + \frac{0.07}{12}\right)^{60} = ${L.money(400000 * Math.pow(1 + 0.07 / 12, 60))}\). The 60 payments grow to \(${L.money(FIN.fvAnnuity(T1.pay, 0.07 / 12, 60))}\). The difference is the balance.`,
        ],
        calc: `300 [N] · 7 ÷ 12 = [I/YR] · 2661.21 [PMT] · 0 [FV] · [PV] → −${T.money(T1.bal)}`,
        why: 'What you still owe is the PV of the payments you have not made yet.' },
      { id: 'w2-q64', topic: 'save', kind: 'num', level: 1, section: 'B', src: 'Tutorial W2 Q2(a)', formula: 'fv-annuity',
        q: R`It is 1 July 2016. You need $10,000 on 1 July 2021. You will make equal annual deposits, the first on 1 July 2017 and the last on 1 July 2021. The bank pays 8% p.a., compounded annually. How big is each deposit?`,
        tl: { n: 5, at: { 1: 'C', 2: 'C', 3: 'C', 4: 'C', 5: 'C' }, unit: 'Year', hi: [5], labels: { 0: '2016', 1: '2017', 2: '2018', 3: '2019', 4: '2020', 5: '2021' } },
        answer: FIN.pmtForFV(10000, 0.08, 5), unit: '$', dp: 2,
        mistakes: [
          { v: FIN.pmtForFV(10000, 0.08, 4), why: 'Deposits from 2017 to 2021 make 5 deposits, not 4.' },
          { v: 2000, why: 'That ignores interest. The deposits earn interest, so you need less.' },
          { v: FIN.pmt(10000, 0.08, 5), why: 'That is a loan payment: it treats $10,000 as money received today. It is a future target.' },
        ],
        steps: [
          R`Deposits on 1 July 2017 to 2021: \(n = 5\), with the last one on the target date.`,
          R`\[C = \frac{FV \times r}{(1+r)^{n} - 1} = \frac{10{,}000 \times 0.08}{1.08^{5} - 1} = ${L.money(FIN.pmtForFV(10000, 0.08, 5))}\]`,
        ],
        calc: `5 [N] · 8 [I/YR] · 0 [PV] · 10000 [FV] · [PMT] → −${T.money(FIN.pmtForFV(10000, 0.08, 5))}`,
        why: 'A future target: solve the FV of an annuity for the deposit.' },
      { id: 'w2-q65', topic: 'save', kind: 'num', level: 1, section: 'B', src: 'Lecture W2 Excel PMT example', formula: 'fv-annuity',
        q: R`You want to save $50,000 in 18 years, saving a constant amount at the end of each month. Your savings earn 6% p.a., compounded monthly. How much must you save each month?`,
        answer: FIN.pmtForFV(50000, 0.005, 216), unit: '$', dp: 2,
        mistakes: [
          { v: 50000 / 216, why: 'That ignores interest. The deposits earn interest, so you need less.' },
          { v: FIN.pmtForFV(50000, 0.06, 18) / 12, why: 'An annual deposit divided by 12 is not the monthly deposit. Work in months from the start.' },
          { v: FIN.pmt(50000, 0.005, 216), why: 'That is a loan payment. $50,000 is a future target, so use the FV of an annuity.' },
        ],
        steps: [
          R`Monthly: \(i = \frac{6\%}{12} = 0.5\%\) and \(n = 18 \times 12 = 216\).`,
          R`\[C = \frac{50{,}000 \times 0.005}{1.005^{216} - 1} = ${L.money(FIN.pmtForFV(50000, 0.005, 216))}\]`,
        ],
        calc: `216 [N] · 0.5 [I/YR] · 0 [PV] · 50000 [FV] · [PMT] → −${T.money(FIN.pmtForFV(50000, 0.005, 216))}`,
        why: 'Monthly saving: monthly rate, number of months, FV of an annuity.' },
      { id: 'w2-q66', topic: 'due', kind: 'mcq', level: 2, section: 'A', formula: 'pv-annuity-due',
        q: R`An annuity due makes \(n\) payments of \(C\), the first one today. Which of these has the same present value?`,
        choices: [R`\(C\) plus an ordinary annuity of \(n - 1\) payments`, R`An ordinary annuity of \(n + 1\) payments`, R`An ordinary annuity of \(n\) payments, divided by \((1+r)\)`, R`\(n \times C\)`], answer: 0,
        wrong: { 2: 'Dividing makes it smaller. An annuity due is worth more than an ordinary annuity.' },
        why: R`Today’s payment is worth \(C\). The other \(n - 1\) payments start in one period, so they form an ordinary annuity. It matches \(PV_{ord} \times (1+r)\).` },
      { id: 'w2-q67', topic: 'loan', kind: 'tf', level: 1, section: 'A',
        q: R`On an amortised loan with equal payments, the same amount of principal is repaid every year.`,
        answer: false,
        why: R`The payment is equal, but its split changes. Early payments are mostly interest. Later payments are mostly principal.` },
      { id: 'w2-q68', topic: 'growth', kind: 'tf', level: 1, section: 'A', formula: 'pv-grow-perp',
        q: R`When \(r > g > 0\), a growing perpetuity is worth more than a level perpetuity with the same first payment.`,
        answer: true,
        why: R`\(\frac{C_1}{r - g} > \frac{C_1}{r}\) because the denominator is smaller. Every payment after the first is bigger, so the value is higher.` },
      { id: 'w2-q69', topic: 'annuity', kind: 'mcq', level: 2, section: 'A', formula: 'pv-annuity',
        q: R`Why does the ordinary annuity formula give a value **one period before** the first payment?`,
        choices: ['It discounts the first payment by one period, the second by two, and so on', 'Because the payments are made at the start of each period', 'Because it compounds every payment forward by one period', 'Because the last payment is left out'], answer: 0,
        why: R`The formula adds up \(\frac{C}{1+r} + \frac{C}{(1+r)^{2}} + \cdots + \frac{C}{(1+r)^{n}}\). The first payment gets one period of discounting, so the value sits one period before it.` },

      /* ----- boss-level static ----- */
      { id: 'w2-q57', topic: 'save', kind: 'num', level: 3, section: 'B', src: 'Tutorial W2 Q5', formula: 'fv-annuity', boss: true,
        q: R`You are saving for the 4-year college education of two children. One starts college in 15 years, the other in 17 years. Each year costs $21,000 per child, paid at the **start** of each school year. You make equal deposits at the end of each year, starting in one year. The last deposit is when the older child starts college. The rate is 15%. How much must each deposit be?`,
        table: { head: ['Year', '15', '16', '17', '18', '19', '20'],
          rows: [['Older child', '$21,000', '$21,000', '$21,000', '$21,000', '–', '–'], ['Younger child', '–', '–', '$21,000', '$21,000', '$21,000', '$21,000'], ['Total', '$21,000', '$21,000', '$42,000', '$42,000', '$21,000', '$21,000']] },
        answer: T5.pmt, unit: '$', dp: 2,
        mistakes: [
          { v: FIN.pmtForFV(T5.pv15, 0.15, 14), why: 'Deposits run from year 1 to year 15. That is 15 deposits, not 14.' },
          { v: FIN.pmtForFV(168000, 0.15, 15), why: 'That saves the undiscounted total of $168,000. Discount the costs to year 15 first.' },
          { v: FIN.pmtForFV(T5.pv15 / 1.15, 0.15, 15), why: 'That treats the fees as end-of-year. They are paid at the start of each school year, so the first is at year 15.' },
        ],
        steps: [
          R`Stage 1, value all the fees at \(t = 15\): \[PV_{15} = 21{,}000 + \frac{21{,}000}{1.15} + \frac{42{,}000}{1.15^{2}} + \frac{42{,}000}{1.15^{3}} + \frac{21{,}000}{1.15^{4}} + \frac{21{,}000}{1.15^{5}} = ${L.money(T5.pv15)}\]`,
          R`Stage 2, the 15 deposits must grow to that amount: \[${L.num(T5.pv15)} = \frac{C}{0.15}\left(1.15^{15} - 1\right)\]`,
          R`\[C = \frac{${L.num(T5.pv15)} \times 0.15}{1.15^{15} - 1} = ${L.money(T5.pmt)}\]`,
        ],
        calc: `21000 [CFj] · 21000 [CFj] · 42000 [CFj] · 2 [Nj] · 21000 [CFj] · 2 [Nj] · 15 [I/YR] · [NPV] → ${T.money(T5.pv15)} · then 15 [N] · 0 [PV] · ${kn(T5.pv15)} [FV] · [PMT] → −${T.money(T5.pmt)}`,
        why: 'Two stages: value the spending at the date saving stops, then find the deposit that builds that amount.' },
      { id: 'w2-q58', topic: 'annuity', kind: 'num', level: 3, section: 'B', src: 'MST 2026 Q12', formula: 'pv-annuity', boss: true,
        q: R`A project costs $80,000 today plus another $40,000 in one year. It earns $30,000 at the end of each year for 8 years. The discount rate is 6%. What is the project’s NPV?`,
        answer: MST12.npv, unit: '$', dp: 2,
        mistakes: [
          { v: MST12.inflow - 120000, why: 'The $40,000 is paid in one year, so discount it first.' },
          { v: MST12.inflow / 1.06 - MST12.cost, why: 'The inflows start at year 1, so the annuity formula already gives their value today.' },
          { v: MST12.inflow - 80000 - 40000 * 1.06, why: 'That compounds the $40,000. It must be discounted.' },
        ],
        steps: [
          R`\[PV_{\text{inflows}} = \frac{30{,}000}{0.06}\left(1 - \frac{1}{1.06^{8}}\right) = ${L.money(MST12.inflow, 3)}\]`,
          R`\[PV_{\text{costs}} = 80{,}000 + \frac{40{,}000}{1.06} = ${L.money(MST12.cost, 3)}\]`,
          R`\[NPV = ${L.num(MST12.inflow, 3)} - ${L.num(MST12.cost, 3)} = ${L.money(MST12.npv)}\]`,
        ],
        calc: `−80000 [CFj] · −10000 [CFj] · 30000 [CFj] · 7 [Nj] · 6 [I/YR] · [NPV] → ${T.money(MST12.npv)} (year 1 nets −40,000 + 30,000)`,
        why: 'Bring every cash flow to today: the annuity of inflows, the cost today, and the cost in one year.' },
      { id: 'w2-q59', topic: 'deferred', kind: 'num', level: 3, section: 'B', src: 'Tutorial W2 Q4', formula: 'pv-perp', boss: true,
        q: R`A small company is expected to produce $20,000 in year 1, then $30,000 a year in years 2 to 5, then $50,000 a year **forever** from year 6. The discount rate is 12%. What is the most you should pay for the company today?`,
        tl: { n: 8, at: { 1: '$20k', 2: '$30k', 3: '$30k', 4: '$30k', 5: '$30k', 6: '$50k', 7: '$50k', 8: '$50k …' }, unit: 'Year', hi: [0] },
        answer: T4.v, unit: '$', dp: 2,
        mistakes: [
          { v: T4.a + T4.b + T4.cAt5 / Math.pow(1.12, 6), why: R`The perpetuity starts at year 6, so \(\frac{C}{r}\) lands at year 5. Discount 5 years, not 6.` },
          { v: T4.a + T4.bAt1 + T4.c, why: 'The annuity starts at year 2, so its formula value sits at year 1. Discount it one more year.' },
          { v: T4.a + T4.b + T4.cAt5, why: 'The perpetuity value sits at year 5. Discount it back to today.' },
        ],
        steps: [
          R`Year 1: \[\frac{20{,}000}{1.12} = ${L.money(T4.a)}\]`,
          R`Years 2–5, an annuity whose value lands at year 1: \[\frac{30{,}000}{0.12}\left(1 - \frac{1}{1.12^{4}}\right) = ${L.money(T4.bAt1)} \;\Rightarrow\; \frac{${L.num(T4.bAt1)}}{1.12} = ${L.money(T4.b)}\]`,
          R`Year 6 onwards, a perpetuity whose value lands at year 5: \[\frac{50{,}000}{0.12} = ${L.money(T4.cAt5)} \;\Rightarrow\; \frac{${L.num(T4.cAt5)}}{1.12^{5}} = ${L.money(T4.c)}\]`,
          R`\[\text{Value} = ${L.num(T4.a)} + ${L.num(T4.b)} + ${L.num(T4.c)} = ${L.money(T4.v)}\]`,
        ],
        why: 'Split the stream into a lump sum, an annuity and a perpetuity. Value each one, move it to today, then add.' },
    ],

    generators: [
      /* ---------- mixed streams ---------- */
      { id: 'w2-g-fvmix', topic: 'mixed', level: 1, section: 'B', formula: 'fv-lump', src: 'Lecture W2 Example 1',
        make(rng) {
          const who = rng.person();
          const n = rng.int(2, 4);
          const cfs = Array.from({ length: n + 1 }, () => rng.step(500, 6000, 250));
          const r = rng.step(0.03, 0.12, 0.005);
          const fv = FIN.fvStream(cfs, r), pv = FIN.pvStream(cfs, r);
          const parts = cfs.map((c, t) => c * FIN.fvif(r, n - t));
          const sum = cfs.reduce((a, b) => a + b, 0);
          return {
            q: R`${who} makes these deposits into an account paying ${T.pctT(r)} p.a., compounded annually:\n${cfs.map((c, t) => `• ${t === 0 ? 'Today' : `End of year ${t}`}: ${mt(c)}`).join('\n')}\nHow much is in the account at the end of year ${n}, just after the last deposit?`,
            givens: cfs.map((c, t) => [`C_{${t}}`, ml(c)]).concat([['r', L.pctT(r)]]),
            tl: { n, at: Object.fromEntries(cfs.map((c, t) => [t, mt(c)])), unit: 'Year', hi: [n] },
            answer: fv, unit: '$', dp: 2,
            mistakes: [
              { v: sum, why: `That just adds the deposits. Each one also earns interest until year ${n}.` },
              { v: fv * (1 + r), why: `That compounds every deposit one year too many. The deposit at year ${n} earns no interest.` },
              { v: pv, why: R`That is the value today (\(t = 0\)). The question asks for the value at year ${n}.` },
            ],
            steps: [
              R`**Value additivity:** move every deposit to \(t = ${n}\), then add. A deposit made at \(t\) grows for \(${n} - t\) years.`,
              R`\[\begin{aligned} ${cfs.map((c, t) => R`${ml(c)} \times (${L.onePlus(r)})^{${n - t}} &= ${L.money(parts[t])}`).join(R` \\ `)} \end{aligned}\]`,
              R`\[FV_{${n}} = ${parts.map((x) => L.num(x)).join(' + ')} = ${L.money(fv)}\]`,
            ],
            calc: `${cfs.join(' [CFj] · ')} [CFj] · ${pk(r)} [I/YR] · [NPV] → ${T.money(pv)} · then ${n} [N] · −${kn(pv)} [PV] · 0 [PMT] · [FV] → ${T.money(fv)}`,
            why: 'Compound each deposit for the years it spends in the account, then add them up.',
          };
        } },
      { id: 'w2-g-pvmix', topic: 'mixed', level: 1, section: 'B', formula: 'pv-lump', src: 'Lecture W2 Example 2; Mock MST Q03',
        make(rng) {
          const today = rng.chance(0.5);
          const n = rng.int(3, 5);
          const cfs = Array.from({ length: n + 1 }, (_, t) => (t === 0 && !today ? 0 : rng.step(1000, 9000, 500)));
          const r = rng.step(0.03, 0.12, 0.005);
          const pv = FIN.pvStream(cfs, r);
          const parts = cfs.map((c, t) => c / FIN.fvif(r, t));
          const sum = cfs.reduce((a, b) => a + b, 0);
          const items = cfs.map((c, t) => (c ? `• ${t === 0 ? 'Today' : `End of year ${t}`}: ${mt(c)}` : null)).filter(Boolean).join('\n');
          const q = today
            ? R`To buy a delivery van from ${rng.company()}, you must make these payments:\n${items}\nA safe investment earns ${T.pctT(r)} p.a. What is the present value of all your payments?`
            : R`An investment will pay you:\n${items}\nThe interest rate is ${T.pctT(r)} p.a. What is the investment worth today?`;
          const mistakes = [
            { v: sum, why: 'That adds cash flows from different dates, which ignores the time value of money.' },
            { v: FIN.pvStream([0].concat(cfs), r), why: R`That discounts every cash flow one period too many. The [CFj] list starts at \(t = 0\).` },
          ];
          if (today) mistakes.push({ v: pv - cfs[0], why: 'You left out the payment made today. It counts at full value.' });
          else mistakes.push({ v: FIN.fvStream(cfs, r), why: `That is the value at year ${n}, not today.` });
          const lines = cfs.map((c, t) => (!c ? null : t === 0 ? R`C_0 &= ${L.money(c)}` : R`\frac{${ml(c)}}{(${L.onePlus(r)})^{${t}}} &= ${L.money(parts[t])}`)).filter(Boolean);
          return {
            q,
            givens: cfs.map((c, t) => [`C_{${t}}`, ml(c)]).concat([['r', L.pctT(r)]]),
            tl: { n, at: Object.assign(today ? {} : { 0: '?' }, Object.fromEntries(cfs.map((c, t) => [t, c ? mt(c) : null]).filter((e) => e[1]))), unit: 'Year', hi: [0] },
            answer: pv, unit: '$', dp: 2,
            mistakes,
            steps: [
              R`**Value additivity:** discount each cash flow to \(t = 0\), then add: \[PV = \sum_{t} \frac{C_t}{(1+r)^{t}}\]`,
              R`\[\begin{aligned} ${lines.join(R` \\ `)} \end{aligned}\]`,
              R`\[PV = ${parts.filter((x) => x).map((x) => L.num(x)).join(' + ')} = ${L.money(pv)}\]`,
            ],
            calc: `${cfs.join(' [CFj] · ')} [CFj] · ${pk(r)} [I/YR] · [NPV] → ${T.money(pv)}`,
            why: today ? 'The payment today is not discounted. Discount the rest and add.' : 'Discount each cash flow by its own number of years, then add.',
          };
        } },

      /* ---------- perpetuities ---------- */
      { id: 'w2-g-perp', topic: 'perp', level: 1, section: 'B', formula: 'pv-perp', src: 'Lecture W2 Example 3',
        make(rng) {
          const small = rng.chance(0.4);
          const c = small ? rng.step(2, 12, 0.5) : rng.step(500, 20000, 250);
          const r = rng.step(0.03, 0.12, 0.005);
          const what = small ? 'A government security' : rng.pick(['A charity endowment', 'A perpetual scholarship fund', 'A British consol bond', 'A family trust']);
          const v = rng.int(0, 2);
          const base = c / r;
          const tl = { n: 4, at: { 0: '?', 1: mt(c), 2: mt(c), 3: mt(c), 4: mt(c) + ' …' }, unit: 'Year', hi: [0] };
          const givens = [['C', ml(c)], ['r', L.pctT(r)]];
          if (v < 2) {
            return {
              q: v === 0
                ? R`${what} pays ${mt(c)} per year, forever. A payment **has just been made**. The interest rate is ${T.pctT(r)} p.a. What is it worth today?`
                : R`${what} will pay ${mt(c)} per year, forever. The **first** payment is **one year from today**. The interest rate is ${T.pctT(r)} p.a. What is it worth today?`,
              givens, tl, answer: base, unit: '$', dp: 2,
              mistakes: [
                { v: base + c, why: v === 0 ? 'The payment that was just made is gone. Do not add it.' : 'That adds a payment today, but the first payment is a year away.' },
                { v: base / (1 + r), why: R`\(\frac{C}{r}\) already lands one period before the first payment, which is today. Do not discount again.` },
                { v: c / (1 + r), why: R`That is only the first payment. A perpetuity pays forever: \(PV = \frac{C}{r}\).` },
              ],
              steps: [
                R`The next payment is at \(t = 1\), so \(\frac{C}{r}\) gives the value at \(t = 0\).`,
                R`\[PV = \frac{C}{r} = \frac{${ml(c)}}{${L.dec(r)}} = ${L.money(base)}\]`,
              ],
              calc: `${kn(c)} ÷ ${L.dec(r)} = ${T.money(base)}`,
              why: R`A level perpetuity: \(PV = \frac{C}{r}\), valued one period before the next payment.`,
            };
          }
          tl.at[0] = mt(c) + ' + ?';
          return {
            q: R`${what} pays ${mt(c)} per year, forever. The **first** payment is made **today** and has not been paid yet. The interest rate is ${T.pctT(r)} p.a. What is the whole stream worth today?`,
            givens, tl, answer: base + c, unit: '$', dp: 2,
            mistakes: [
              { v: base, why: R`You left out today’s payment. Add it: \(PV = C + \frac{C}{r}\).` },
              { v: base / (1 + r), why: 'That discounts the stream and drops today’s payment. Today’s payment counts in full.' },
              { v: base / (1 + r) + c, why: R`\(\frac{C}{r}\) already values the later payments at today’s date. Do not discount it.` },
            ],
            steps: [
              R`Today’s payment is not discounted. The payments from \(t = 1\) onwards form a normal perpetuity worth \(\frac{C}{r}\) today.`,
              R`\[PV = C + \frac{C}{r} = ${ml(c)} + \frac{${ml(c)}}{${L.dec(r)}} = ${ml(c)} + ${L.money(base)} = ${L.money(base + c)}\]`,
            ],
            calc: `${kn(c)} ÷ ${L.dec(r)} + ${kn(c)} = ${T.money(base + c)}`,
            why: R`When the first payment is today, add it to \(\frac{C}{r}\).`,
          };
        } },
      { id: 'w2-g-io', topic: 'perp', level: 1, section: 'B', formula: 'pv-perp', src: 'MST 2026 Q13',
        make(rng) {
          const pv = rng.step(100000, 900000, 10000), apr = rng.step(0.04, 0.10, 0.0025);
          const i = apr / 12, c = pv * i;
          return {
            q: R`${rng.company()} borrows ${mt(pv)} at ${T.pctT(apr)} p.a., compounded monthly. The loan is **interest-only**: the principal is never repaid. What is the monthly payment?`,
            givens: [['PV', ml(pv)], ['APR', L.pctT(apr)], ['i', R`\frac{${L.dec(apr)}}{12}`]],
            answer: c, unit: '$', dp: 2,
            mistakes: [
              { v: pv * apr, why: R`That is a whole year of interest. A monthly payment uses \(\frac{APR}{12}\).` },
              { v: FIN.pmt(pv, i, 360), why: 'That repays the loan over 30 years. An interest-only loan never repays principal, so it is a perpetuity.' },
              { v: pv * (Math.pow(1 + apr, 1 / 12) - 1), why: R`That treats the rate as an EAR. A rate compounded monthly means \(\frac{APR}{12}\) per month.` },
            ],
            steps: [
              R`For the lender, a loan that is never repaid is a **perpetuity**: \(PV = \frac{C}{i}\), so \(C = PV \times i\).`,
              R`\[C = ${ml(pv)} \times \frac{${L.dec(apr)}}{12} = ${L.money(c)}\]`,
            ],
            calc: `${kn(pv)} × ${L.dec(apr)} ÷ 12 = ${T.money(c)}`,
            why: 'Interest-only forever: each payment is exactly one period of interest.',
          };
        } },

      /* ---------- deferred ---------- */
      { id: 'w2-g-perpdef', topic: 'deferred', level: 2, section: 'B', formula: 'pv-perp', src: 'Lecture W2 Example 4',
        make(rng) {
          const k = rng.int(2, 6), c = rng.step(500, 10000, 100), r = rng.step(0.04, 0.12, 0.005);
          const v1 = c / r, pv = v1 / FIN.fvif(r, k - 1);
          const mistakes = [
            { v: v1, why: R`That is the value at \(t = ${k - 1}\). Discount it back ${yrsW(k - 1)} to today.` },
            { v: v1 / FIN.fvif(r, k), why: R`That discounts ${yrsW(k)}. \(\frac{C}{r}\) already lands at \(t = ${k - 1}\), so discount only ${yrsW(k - 1)}.` },
          ];
          if (k > 2) mistakes.push({ v: v1 / FIN.fvif(r, k - 2), why: R`That discounts only ${yrsW(k - 2)}. From \(t = ${k - 1}\) back to today is ${yrsW(k - 1)}.` });
          else mistakes.push({ v: v1 + c, why: 'There is no payment today. Nothing is added.' });
          return {
            q: R`At ${T.pctT(r)} p.a., what is the value today of ${mt(c)} per year **forever**, with the **first** payment **${k} years** from today?`,
            givens: [['C', ml(c)], ['r', L.pctT(r)], [R`t_{\text{first}}`, String(k)]],
            tl: { n: k + 2, at: { 0: '?', [k]: mt(c), [k + 1]: mt(c), [k + 2]: mt(c) + ' …' }, unit: 'Year', hi: [0] },
            answer: pv, unit: '$', dp: 2,
            mistakes,
            steps: [
              R`The first payment is at \(t = ${k}\), so \(\frac{C}{r}\) lands one period earlier, at \(t = ${k - 1}\): \[PV_{${k - 1}} = \frac{${ml(c)}}{${L.dec(r)}} = ${L.money(v1)}\]`,
              R`Discount ${yrsW(k - 1)} to today: \[PV_0 = \frac{${L.num(v1)}}{(${L.onePlus(r)})^{${k - 1}}} = ${L.money(pv)}\]`,
            ],
            calc: `${kn(c)} ÷ ${L.dec(r)} = ${T.money(v1)} · then ${k - 1} [N] · ${pk(r)} [I/YR] · 0 [PMT] · ${kn(v1)} [FV] · [PV] → −${T.money(pv)}`,
            why: R`Step back one period from the first payment (to \(t = ${k - 1}\)), then discount to today.`,
          };
        } },
      { id: 'w2-g-defann', topic: 'deferred', level: 2, section: 'B', formula: 'pv-annuity', src: 'Tutorial W2 Q3; Mock MST Q04',
        make(rng) {
          const k = rng.int(2, 6), n = rng.int(3, 10), c = rng.step(200, 10000, 100), r = rng.step(0.04, 0.12, 0.005);
          const vk = FIN.pvAnnuity(c, r, n), pv = vk / FIN.fvif(r, k - 1);
          const q = rng.chance(0.5)
            ? R`A buyer offers to pay for your old car with ${n} equal annual payments of ${mt(c)}. The **first** payment is **${k} years** from today. You can invest at ${T.pctT(r)} p.a. What is the offer worth today?`
            : R`An annuity pays ${mt(c)} a year for ${n} years. The **first** payment is at the end of year ${k}. The discount rate is ${T.pctT(r)} p.a. What is the annuity worth today?`;
          return {
            q,
            givens: [['C', ml(c)], ['n', String(n)], ['r', L.pctT(r)], [R`t_{\text{first}}`, String(k)]],
            tl: tlLevel(k, n, mt(c), 'Year', { 0: '?' }, [0]),
            answer: pv, unit: '$', dp: 2,
            mistakes: [
              { v: vk, why: R`That is the value at \(t = ${k - 1}\). Discount it back ${yrsW(k - 1)} to today.` },
              { v: vk / FIN.fvif(r, k), why: R`That discounts ${yrsW(k)}. The annuity formula already lands at \(t = ${k - 1}\).` },
              { v: (c * n) / FIN.fvif(r, k - 1), why: 'That adds the payments before discounting. Use the annuity formula for them.' },
            ],
            steps: [
              R`The first payment is at \(t = ${k}\). The annuity formula lands one period earlier, at \(t = ${k - 1}\): \[PV_{${k - 1}} = ${pvaTex(c, rt(r), n)} = ${L.money(vk)}\]`,
              R`Discount ${yrsW(k - 1)} to today: \[PV_0 = \frac{${L.num(vk)}}{(${L.onePlus(r)})^{${k - 1}}} = ${L.money(pv)}\]`,
            ],
            calc: `0 [CFj] · 0 [CFj] · ${k - 1} [Nj] · ${kn(c)} [CFj] · ${n} [Nj] · ${pk(r)} [I/YR] · [NPV] → ${T.money(pv)}`,
            why: 'Deferred annuity: the formula lands one period before the first payment, so discount from there.',
          };
        } },

      /* ---------- ordinary annuities ---------- */
      { id: 'w2-g-pva', topic: 'annuity', level: 1, section: 'B', formula: 'pv-annuity', src: 'Lecture W2 Example 5',
        make(rng) {
          const c = rng.step(100, 20000, 100), r = rng.step(0.03, 0.14, 0.005), n = rng.int(3, 25);
          const pv = FIN.pvAnnuity(c, r, n), a = FIN.pvifa(r, n);
          const q = rng.pick([
            R`A prize pays ${mt(c)} at the end of each year for ${n} years. The interest rate is ${T.pctT(r)} p.a. What is the prize worth today?`,
            R`${rng.company()} will receive lease payments of ${mt(c)} at the end of each year for ${n} years. The discount rate is ${T.pctT(r)} p.a. What are the payments worth today?`,
            R`A pension pays ${mt(c)} a year for ${n} years, with the first payment in one year. The interest rate is ${T.pctT(r)} p.a. What is the pension worth today?`,
          ]);
          return {
            q,
            givens: [['C', ml(c)], ['r', L.pctT(r)], ['n', String(n)]],
            tl: tlLevel(1, n, mt(c), 'Year', { 0: '?' }, [0]),
            answer: pv, unit: '$', dp: 2,
            mistakes: dedupe([
              { v: c * n, why: 'That adds the payments and ignores discounting.' },
              { v: FIN.pvAnnuityDue(c, r, n), why: 'That is an annuity due. The first payment is in one year, so this is an ordinary annuity.' },
              { v: c / r, why: `That is a perpetuity. This annuity stops after ${n} payments.` },
              { v: FIN.fvAnnuity(c, r, n), why: `That is the future value at year ${n}, not the value today.` },
            ]),
            steps: [
              R`\[PV = \frac{C}{r}\left(1 - \frac{1}{(1+r)^{n}}\right)\]`,
              R`\[PV = ${pvaTex(c, rt(r), n)} = ${ml(c)} \times ${L.numT(a, 6)} = ${L.money(pv)}\]`,
            ],
            calc: `${n} [N] · ${pk(r)} [I/YR] · ${kn(c)} [PMT] · 0 [FV] · [PV] → −${T.money(pv)}`,
            why: 'Equal payments at the end of each year for a fixed time: an ordinary annuity.',
          };
        } },
      { id: 'w2-g-fva', topic: 'annuity', level: 1, section: 'B', formula: 'fv-annuity', src: 'Lecture W2 Example 6',
        make(rng) {
          const who = rng.person();
          const c = rng.step(500, 20000, 250), r = rng.step(0.03, 0.12, 0.005), n = rng.int(3, 30);
          const fv = FIN.fvAnnuity(c, r, n), f = FIN.fvifa(r, n);
          return {
            q: R`${who} saves ${mt(c)} at the end of every year for ${n} years, in a fund earning ${T.pctT(r)} p.a. How much is in the fund just after the last deposit?`,
            givens: [['C', ml(c)], ['r', L.pctT(r)], ['n', String(n)]],
            tl: tlLevel(1, n, mt(c), 'Year', {}, [n]),
            answer: fv, unit: '$', dp: 2,
            mistakes: [
              { v: c * n, why: 'That adds the deposits and ignores interest.' },
              { v: FIN.fvAnnuityDue(c, r, n), why: 'That is an annuity due. These deposits are at the end of each year.' },
              { v: FIN.pvAnnuity(c, r, n), why: 'That is the present value today, not the future value.' },
            ],
            steps: [
              R`\[FV = \frac{C}{r}\left((1+r)^{n} - 1\right)\]`,
              R`\[FV = ${fvaTex(c, rt(r), n)} = ${ml(c)} \times ${L.numT(f, 6)} = ${L.money(fv)}\]`,
            ],
            calc: `${n} [N] · ${pk(r)} [I/YR] · 0 [PV] · −${kn(c)} [PMT] · [FV] → ${T.money(fv)}`,
            why: 'The FV of an ordinary annuity lands on the date of the last deposit.',
          };
        } },

      /* ---------- annuities due ---------- */
      { id: 'w2-g-due', topic: 'due', level: 2, section: 'B', formula: 'pv-annuity-due', src: 'Lecture W2 Example 7',
        make(rng) {
          const kind = rng.int(0, 2);
          if (kind === 0) {
            const c = rng.step(200, 3000, 50), i = rng.step(0.0025, 0.01, 0.00025), m = rng.int(5, 23), n = m + 1;
            const pv = FIN.pvAnnuityDue(c, i, n), ord = FIN.pvAnnuity(c, i, n);
            return {
              q: R`{NAME}’s aunt promises ${mt(c)} per month, **starting today**. The **final** payment is **${m} months** from today. The interest rate is ${T.pctT(i)} per month. What are the payments worth today?`,
              givens: [['C', ml(c)], ['r', L.pctT(i) + R`\text{ per month}`], ['n', R`${m} + 1 = ${n}`]],
              tl: tlLevel(0, n, mt(c), 'Month', {}, [0]),
              answer: pv, unit: '$', dp: 2,
              mistakes: [
                { v: ord, why: 'That is an ordinary annuity. The first payment is today, so use the annuity due formula.' },
                { v: FIN.pvAnnuityDue(c, i, m), why: R`Count the payments: \(t = 0\) to \(t = ${m}\) is ${n} payments, not ${m}.` },
                { v: c * n, why: 'That adds the payments and ignores discounting.' },
              ],
              steps: [
                R`Payments at \(t = 0, 1, \ldots, ${m}\): that is \(n = ${n}\) payments, at the **start** of each month.`,
                R`\[PV_{due} = \frac{C}{r}\left(1 - \frac{1}{(1+r)^{n}}\right)(1+r)\]`,
                R`\[PV_{due} = ${pvaTex(c, rt(i), n)}(${L.onePlus(i)}) = ${L.num(ord)} \times ${L.onePlus(i)} = ${L.money(pv)}\]`,
              ],
              calc: `BEG mode · ${n} [N] · ${pk(i)} [I/YR] · ${kn(c)} [PMT] · 0 [FV] · [PV] → −${T.money(pv)} · then back to END mode`,
              why: R`The first payment is today, so this is an annuity due: the ordinary annuity value times \((1+r)\).`,
            };
          }
          if (kind === 1) {
            const c = rng.step(1000, 40000, 500), r = rng.step(0.03, 0.12, 0.005), n = rng.int(3, 15);
            const pv = FIN.pvAnnuityDue(c, r, n), ord = FIN.pvAnnuity(c, r, n);
            return {
              q: R`${rng.company()} leases a machine for ${n} years. Lease payments of ${mt(c)} are due at the **start** of each year, the first one today. The discount rate is ${T.pctT(r)} p.a. What is the present value of the lease payments?`,
              givens: [['C', ml(c)], ['r', L.pctT(r)], ['n', String(n)]],
              tl: tlLevel(0, n, mt(c), 'Year', {}, [0]),
              answer: pv, unit: '$', dp: 2,
              mistakes: [
                { v: ord, why: 'That treats the payments as end-of-year. They are paid at the start of each year.' },
                { v: ord / (1 + r), why: R`An annuity due is worth more than an ordinary annuity, so multiply by \((1+r)\). Do not divide.` },
                { v: c * n, why: 'That adds the payments and ignores discounting.' },
              ],
              steps: [
                R`\[PV_{due} = \frac{C}{r}\left(1 - \frac{1}{(1+r)^{n}}\right)(1+r)\]`,
                R`\[PV_{due} = ${pvaTex(c, rt(r), n)}(${L.onePlus(r)}) = ${L.num(ord)} \times ${L.onePlus(r)} = ${L.money(pv)}\]`,
                R`Check: today’s payment plus an ordinary annuity of \(${n - 1}\) payments gives \(${ml(c)} + ${L.money(FIN.pvAnnuity(c, r, n - 1))} = ${L.money(pv)}\).`,
              ],
              calc: `BEG mode · ${n} [N] · ${pk(r)} [I/YR] · ${kn(c)} [PMT] · 0 [FV] · [PV] → −${T.money(pv)} · then back to END mode`,
              why: 'Payments at the start of each period: an annuity due.',
            };
          }
          const who = rng.person();
          const c = rng.step(500, 10000, 250), r = rng.step(0.03, 0.10, 0.005), n = rng.int(3, 25);
          const fv = FIN.fvAnnuityDue(c, r, n), ord = FIN.fvAnnuity(c, r, n);
          return {
            q: R`${who} deposits ${mt(c)} at the **start** of each year for ${n} years, the first deposit today. The account pays ${T.pctT(r)} p.a. How much is in the account at the **end** of year ${n}?`,
            givens: [['C', ml(c)], ['r', L.pctT(r)], ['n', String(n)]],
            tl: tlLevel(0, n, mt(c), 'Year', { [n]: '?' }, [n]),
            formula: 'fv-annuity-due',
            answer: fv, unit: '$', dp: 2,
            mistakes: [
              { v: ord, why: 'That treats the deposits as end-of-year. Start-of-year deposits each earn one more year of interest.' },
              { v: c * n, why: 'That adds the deposits and ignores interest.' },
              { v: ord / (1 + r), why: R`An annuity due grows more than an ordinary annuity, so multiply by \((1+r)\). Do not divide.` },
            ],
            steps: [
              R`\[FV_{due} = \frac{C}{r}\left((1+r)^{n} - 1\right)(1+r)\]`,
              R`\[FV_{due} = ${fvaTex(c, rt(r), n)}(${L.onePlus(r)}) = ${L.num(ord)} \times ${L.onePlus(r)} = ${L.money(fv)}\]`,
            ],
            calc: `BEG mode · ${n} [N] · ${pk(r)} [I/YR] · 0 [PV] · −${kn(c)} [PMT] · [FV] → ${T.money(fv)} · then back to END mode`,
            why: 'Deposits at the start of each year: an annuity due, valued one period after the last deposit.',
          };
        } },
      { id: 'w2-g-equiv', topic: 'due', level: 2, section: 'B', formula: 'pv-annuity-due', src: 'Lecture W2 Example 8',
        make(rng) {
          const lump = rng.step(500, 20000, 100), k = rng.int(1, 3), n = rng.int(3, 8), r = rng.step(0.03, 0.10, 0.005);
          const due = rng.chance(0.6);
          const pv = lump / FIN.fvif(r, k), a = FIN.pvifa(r, n), fac = due ? a * (1 + r) : a;
          const c = pv / fac;
          const mistakes = due
            ? [
              { v: pv / a, why: 'That is an ordinary annuity. These payments start today, so use the annuity due factor.' },
              { v: lump / n, why: 'That spreads the lump sum evenly and ignores discounting.' },
              k > 1 ? { v: lump / fac, why: 'Discount the lump sum to today first.' } : { v: pv / n, why: 'That spreads the PV evenly. Later payments must be discounted too.' },
            ]
            : [
              { v: pv / (a * (1 + r)), why: 'That is an annuity due. These payments are at the end of each year.' },
              { v: lump / n, why: 'That spreads the lump sum evenly and ignores discounting.' },
              { v: lump / a, why: 'Discount the lump sum to today first.' },
            ];
          return {
            q: due
              ? R`An asset pays a lump sum of ${mt(lump)} at \(t = ${k}\). The rate is ${T.pctT(r)} p.a. Find its **equivalent annuity**: the ${n}-year annuity **due** (payments at \(t = 0\) to \(t = ${n - 1}\)) with the same present value.`
              : R`An asset pays a lump sum of ${mt(lump)} at \(t = ${k}\). The rate is ${T.pctT(r)} p.a. Find its **equivalent annuity**: the ${n}-year **ordinary** annuity (payments at \(t = 1\) to \(t = ${n}\)) with the same present value.`,
            givens: [['FV', ml(lump)], ['t', String(k)], ['r', L.pctT(r)], ['n', String(n)]],
            answer: c, unit: '$', dp: 2,
            mistakes,
            steps: [
              R`Step 1, the PV of the lump sum: \[PV = \frac{${ml(lump)}}{(${L.onePlus(r)})^{${k}}} = ${L.money(pv)}\]`,
              due
                ? R`Step 2, the annuity due factor: \[\frac{1}{${L.dec(r)}}\left(1 - \frac{1}{(${L.onePlus(r)})^{${n}}}\right)(${L.onePlus(r)}) = ${L.numT(fac, 6)}\]`
                : R`Step 2, the annuity factor: \[\frac{1}{${L.dec(r)}}\left(1 - \frac{1}{(${L.onePlus(r)})^{${n}}}\right) = ${L.numT(fac, 6)}\]`,
              R`Step 3: \[C = \frac{${L.num(pv)}}{${L.numT(fac, 6)}} = ${L.money(c)}\]`,
            ],
            why: 'Same present value, spread into level payments: that is the equivalent annuity.',
          };
        } },

      /* ---------- growth ---------- */
      { id: 'w2-g-gperp', topic: 'growth', level: 1, section: 'B', formula: 'pv-grow-perp', src: 'Lecture W2 Example 10',
        make(rng) {
          const small = rng.chance(0.4);
          const c = small ? rng.step(1, 10, 0.25) : rng.step(1000, 50000, 500);
          const g = rng.step(0.01, 0.06, 0.005), r = cl(g + rng.step(0.02, 0.08, 0.005));
          const justPaid = rng.chance(0.4);
          const c1 = justPaid ? c * (1 + g) : c;
          const pv = c1 / (r - g);
          const what = small ? 'A government security' : rng.pick(['A charity fund', 'A property trust', 'A family foundation']);
          return {
            q: justPaid
              ? R`${what} has **just paid** ${mt(c)}. Its payments grow at ${T.pctT(g)} a year, forever. The discount rate is ${T.pctT(r)} p.a. What are the future payments worth today?`
              : R`${what} will pay ${mt(c)} at the end of this year. After that, the payments grow at ${T.pctT(g)} a year, forever. The discount rate is ${T.pctT(r)} p.a. What is it worth today?`,
            givens: [[justPaid ? 'C_0' : 'C_1', ml(c)], ['g', L.pctT(g)], ['r', L.pctT(r)]],
            answer: pv, unit: '$', dp: 2,
            mistakes: justPaid
              ? [
                { v: c / (r - g), why: R`That uses the payment just made. Use the next one: \(C_1 = C_0(1+g)\).` },
                { v: c1 / r, why: R`That ignores the growth. Divide by \(r - g\).` },
                { v: c1 / (r + g), why: 'Subtract g from r. Do not add it.' },
              ]
              : [
                { v: c * (1 + g) / (r - g), why: 'The first payment is already next year’s amount. Do not grow it again.' },
                { v: c / r, why: R`That ignores the growth. Divide by \(r - g\).` },
                { v: c / (r + g), why: 'Subtract g from r. Do not add it.' },
              ],
            steps: (justPaid ? [R`The formula needs the **next** payment: \(C_1 = ${ml(c)} \times ${L.onePlus(g)} = ${ml4(c1)}\).`] : [])
              .concat([
                R`\[PV = \frac{C_1}{r - g} = \frac{${ml4(c1)}}{${L.dec(r)} - ${L.dec(g)}} = ${L.money(pv)}\]`,
              ]),
            calc: `${+c1.toFixed(4)} ÷ (${L.dec(r)} − ${L.dec(g)}) = ${T.money(pv)}`,
            why: R`Growing perpetuity: the next payment divided by \((r - g)\).`,
          };
        } },
      { id: 'w2-g-gann', topic: 'growth', level: 2, section: 'B', formula: 'pv-grow-annuity', src: 'Lecture W2 Example 9',
        make(rng) {
          const co = rng.company();
          const c = rng.step(10000, 900000, 5000), g = rng.step(0.01, 0.10, 0.005), r = cl(g + rng.step(0.02, 0.08, 0.005)), n = rng.int(5, 25);
          const pv = FIN.pvGrowAnnuity(c, r, g, n), ratio = Math.pow((1 + g) / (1 + r), n);
          return {
            q: R`${co} expects a new store to bring in ${mt(c)} **next year**. The cash flows then grow at ${T.pctT(g)} a year. There are ${n} cash flows in total (years 1 to ${n}). The discount rate is ${T.pctT(r)}. What is their present value?`,
            givens: [['C', ml(c)], ['g', L.pctT(g)], ['r', L.pctT(r)], ['n', String(n)]],
            answer: pv, unit: '$', dp: 2,
            mistakes: [
              { v: c / (r - g), why: `That is a growing perpetuity. These cash flows stop after ${n} years.` },
              { v: FIN.pvAnnuity(c, r, n), why: 'That ignores the growth.' },
              { v: FIN.pvGrowAnnuity(c * (1 + g), r, g, n), why: 'The first cash flow is already next year’s amount. Do not grow it again.' },
            ],
            steps: [
              R`\[PV = \frac{C}{r - g}\left(1 - \left(\frac{1+g}{1+r}\right)^{n}\right)\]`,
              R`\[PV = \frac{${ml(c)}}{${L.dec(r)} - ${L.dec(g)}}\left(1 - \left(\frac{${L.onePlus(g)}}{${L.onePlus(r)}}\right)^{${n}}\right) = ${L.money(c / (r - g))} \times (1 - ${L.numT(ratio, 8)})\]`,
              R`\[PV = ${L.money(pv)}\]`,
            ],
            why: 'Growing cash flows that stop after n years: a growing annuity.',
          };
        } },

      /* ---------- loans ---------- */
      { id: 'w2-g-loan', topic: 'loan', level: 1, section: 'B', formula: 'pv-annuity', src: 'Lecture W2 Example 11; Tutorial W2 Q1(a)',
        make(rng) {
          if (rng.chance(0.5)) {
            const pv = rng.step(2000, 50000, 500), r = rng.step(0.04, 0.12, 0.005), n = rng.int(3, 10);
            const pay = FIN.pmt(pv, r, n), a = FIN.pvifa(r, n);
            return {
              q: R`{NAME} borrows ${mt(pv)} at ${T.pctT(r)} p.a. and repays it with ${n} equal annual payments, the first one in a year. How big is each payment?`,
              givens: [['PV', ml(pv)], ['r', L.pctT(r)], ['n', String(n)]],
              answer: pay, unit: '$', dp: 2,
              mistakes: [
                { v: pv / n, why: 'That ignores interest. The payments must also cover interest on the balance.' },
                { v: pv / n + pv * r, why: 'That is the first payment of an equal-principal loan. Equal payments come from the annuity formula.' },
                { v: pay / (1 + r), why: 'That treats the payments as starting today. They start in one year.' },
              ],
              steps: [
                R`The loan is the PV of the payments: \[${ml(pv)} = C \times \frac{1}{${L.dec(r)}}\left(1 - \frac{1}{(${L.onePlus(r)})^{${n}}}\right) = C \times ${L.numT(a, 6)}\]`,
                R`\[C = \frac{${ml(pv)}}{${L.numT(a, 6)}} = ${L.money(pay)}\]`,
              ],
              calc: `${n} [N] · ${pk(r)} [I/YR] · −${kn(pv)} [PV] · 0 [FV] · [PMT] → ${T.money(pay)}`,
              why: 'Set the loan equal to the PV of an ordinary annuity and solve for C.',
            };
          }
          const car = rng.chance(0.4);
          const pv = car ? rng.step(10000, 60000, 1000) : rng.step(200000, 900000, 10000);
          const yrs = car ? rng.int(3, 7) : rng.pick([20, 25, 30]);
          const apr = rng.step(0.03, 0.09, 0.0025), i = apr / 12, N = yrs * 12;
          const pay = FIN.pmt(pv, i, N);
          return {
            q: R`You borrow ${mt(pv)} ${car ? 'for a car' : 'to buy a house'} over ${yrs} years at ${T.pctT(apr)} p.a., compounded monthly. Payments are made at the end of each month. What is the monthly payment?`,
            givens: [['PV', ml(pv)], ['i', R`\frac{${L.dec(apr)}}{12}`], ['n', R`${yrs} \times 12 = ${N}`]],
            answer: pay, unit: '$', dp: 2,
            mistakes: [
              { v: FIN.pmt(pv, apr, yrs) / 12, why: 'An annual payment divided by 12 is not the monthly payment. Work in months from the start.' },
              { v: pv / N, why: 'That ignores interest.' },
              { v: FIN.pmt(pv, i, yrs), why: R`That uses ${yrs} periods. Monthly payments need \(n = ${yrs} \times 12 = ${N}\).` },
            ],
            steps: [
              R`Monthly rate \(i = \frac{${L.dec(apr)}}{12}\) and \(n = ${N}\).`,
              R`\[PMT = \frac{PV \times i}{1 - (1+i)^{-n}} = \frac{${ml(pv)} \times \frac{${L.dec(apr)}}{12}}{1 - \left(1 + \frac{${L.dec(apr)}}{12}\right)^{-${N}}} = ${L.money(pay)}\]`,
            ],
            calc: `${N} [N] · ${pk(apr)} ÷ 12 = [I/YR] · −${kn(pv)} [PV] · 0 [FV] · [PMT] → ${T.money(pay)}`,
            why: 'Monthly loan: monthly rate, number of months, then the annuity formula solved for C.',
          };
        } },
      { id: 'w2-g-amort', topic: 'loan', level: 2, section: 'B', formula: 'pv-annuity', src: 'Lecture W2 Example 11',
        make(rng) {
          const pv = rng.step(2000, 50000, 500), r = rng.step(0.04, 0.12, 0.005), n = rng.int(4, 8);
          const pay = r2(FIN.pmt(pv, r, n));
          const k = rng.int(2, Math.min(4, n - 1));
          const rows = [];
          let bal = pv;
          for (let t = 1; t <= k; t++) {
            const int = r2(bal * r), prin = r2(pay - int), end = r2(bal - prin);
            rows.push({ t, open: bal, int, prin, end });
            bal = end;
          }
          const row = rows[k - 1];
          const ask = rng.pick(['int', 'prin', 'end']);
          const answer = row[ask];
          const qEnd = ask === 'end' ? `What is the **closing balance** at the end of **year ${k}**?` : `How much of the **year ${k}** payment is **${ask === 'int' ? 'interest' : 'principal'}**?`;
          const mistakes = {
            int: [
              { v: rows[0].int, why: 'That is the year 1 interest. The balance falls each year, so the interest falls too.' },
              { v: row.prin, why: 'That is the principal part of the payment.' },
              { v: r2(pay * r), why: 'Interest is charged on the opening balance, not on the payment.' },
            ],
            prin: [
              { v: row.int, why: 'That is the interest part of the payment.' },
              { v: r2(pv / n), why: 'Principal is not repaid evenly. The principal part grows every year.' },
              { v: rows[0].prin, why: 'That is the year 1 principal. The principal part grows each year.' },
            ],
            end: [
              { v: r2(pv - k * pay), why: 'Subtracting whole payments ignores the interest inside them.' },
              { v: r2(pv * (1 - k / n)), why: 'The loan is not repaid in equal chunks of principal.' },
              { v: row.open, why: `That is the opening balance of year ${k}. Subtract the year ${k} principal.` },
            ],
          }[ask];
          return {
            q: R`${Aan(mt(pv))} ${mt(pv)} loan at ${T.pctT(r)} p.a. is repaid with ${n} annual payments of ${T.money(pay)}. The schedule starts below. ${qEnd}`,
            givens: [['PV', ml(pv)], ['r', L.pctT(r)], ['PMT', L.money(pay)]],
            table: { head: ['Year', 'Opening', 'Payment', 'Interest', 'Principal', 'Closing'],
              rows: [['1', T.money(pv), T.money(pay), T.money(rows[0].int), T.money(rows[0].prin), T.money(rows[0].end)]]
                .concat(rows.slice(1).map((x) => [String(x.t), '?', T.money(pay), '?', '?', '?'])) },
            answer, unit: '$', dp: 2,
            mistakes,
            steps: [R`Each year: interest \(=\) opening balance \(\times ${L.dec(r)}\). Principal \(=\) payment \(-\) interest. Closing \(=\) opening \(-\) principal.`]
              .concat(rows.slice(1).map((x) => R`\[\begin{aligned} \text{Interest}_{${x.t}} &= ${L.num(x.open)} \times ${L.dec(r)} = ${L.num(x.int)} \\ \text{Principal}_{${x.t}} &= ${L.num(pay)} - ${L.num(x.int)} = ${L.num(x.prin)} \\ \text{Closing}_{${x.t}} &= ${L.num(x.open)} - ${L.num(x.prin)} = ${L.num(x.end)} \end{aligned}\]`)),
            why: 'Interest is always charged on the balance at the start of the year. As the balance falls, interest falls and principal rises.',
          };
        } },
      { id: 'w2-g-bal', topic: 'loan', level: 2, section: 'B', formula: 'loan-balance', src: 'Tutorial W2 Q1(b); MST 2026 Q14',
        make(rng) {
          const pv = rng.step(200000, 800000, 10000), apr = rng.step(0.03, 0.08, 0.001), yrs = rng.pick([20, 25, 30]);
          const i = apr / 12, N = yrs * 12, k = rng.int(2, 10), left = N - 12 * k;
          const pay = FIN.pmt(pv, i, N), bal = FIN.loanBalance(pv, i, N, 12 * k);
          return {
            q: R`You take out a mortgage of ${mt(pv)} over ${yrs} years at ${T.pctT(apr)} p.a., with monthly payments at the end of each month. How much do you still owe **after ${k} years**?`,
            givens: [['PV', ml(pv)], ['i', R`\frac{${L.dec(apr)}}{12}`], ['n', String(N)], [R`\text{paid}`, R`${k} \times 12 = ${12 * k}`]],
            answer: bal, unit: '$', dp: 2,
            mistakes: [
              { v: pv - 12 * k * pay, why: 'Subtracting payments ignores interest. Early payments are mostly interest.' },
              { v: pv * (1 - k / yrs), why: 'Principal is not repaid evenly. In the early years very little principal is repaid.' },
              { v: FIN.pvAnnuity(pay, i, N - k), why: `That removes only ${k} payments. ${k} years is ${12 * k} monthly payments.` },
            ],
            steps: [
              R`The monthly payment: \[PMT = \frac{${ml(pv)} \times \frac{${L.dec(apr)}}{12}}{1 - \left(1 + \frac{${L.dec(apr)}}{12}\right)^{-${N}}} = ${L.money(pay)}\]`,
              R`Payments left after ${k} years: \(${N} - ${12 * k} = ${left}\).`,
              R`Balance = PV of the remaining payments: \[${pvaTex(r2(pay), rt(apr, 12), left)} = ${L.money(bal)}\]`,
            ],
            calc: `${N} [N] · ${pk(apr)} ÷ 12 = [I/YR] · −${kn(pv)} [PV] · 0 [FV] · [PMT] → ${T.money(pay)} · then ${left} [N] · [PV] → −${T.money(bal)}`,
            why: 'The balance is the present value of the payments still to come.',
          };
        } },
      { id: 'w2-g-refi', topic: 'loan', level: 3, section: 'B', formula: 'loan-balance', boss: true, src: 'Tutorial W2 Q1(c)–(d); Mock MST Q13',
        make(rng) {
          const pv = rng.step(200000, 900000, 10000), yrs = rng.pick([25, 30]), N = yrs * 12;
          const apr = rng.step(0.03, 0.08, 0.0025), i = apr / 12;
          const k = rng.int(2, 8), left = N - 12 * k;
          const bp = rng.pick([-100, -75, -50, -25, 25, 50, 75, 100]);
          const apr2 = apr + bp / 10000, i2 = apr2 / 12;
          const pay = FIN.pmt(pv, i, N), bal = FIN.loanBalance(pv, i, N, 12 * k);
          const move = bp > 0 ? `rises by ${bp} basis points to ${T.pctT(apr2)}` : `falls by ${-bp} basis points to ${T.pctT(apr2)}`;
          const base = [
            R`Original payment (\(i = \frac{${L.dec(apr)}}{12}\), \(n = ${N}\)): \[PMT = \frac{${ml(pv)} \times i}{1 - (1+i)^{-${N}}} = ${L.money(pay)}\]`,
            R`Balance after ${k} years (\(${left}\) payments left): \[${pvaTex(r2(pay), rt(apr, 12), left)} = ${L.money(bal)}\]`,
          ];
          const givens = [['PV', ml(pv)], ['APR_{old}', L.pctT(apr)], ['APR_{new}', L.pctT(apr2)], ['n', String(N)], [R`\text{years paid}`, String(k)]];
          const n2 = FIN.tvm.solveN(i2, -bal, pay, 0);
          if (bp > 0 && rng.chance(0.4) && Number.isFinite(n2) && n2 > left && n2 < 900) {
            return {
              q: R`You borrow ${mt(pv)} over ${yrs} years at ${T.pctT(apr)} p.a., with monthly payments. After ${k} years the rate ${move}. You keep paying the **old** monthly amount. How many more monthly payments must you make? (Answer in months.)`,
              givens, answer: n2, unit: '', dp: 2,
              mistakes: [
                { v: left, why: 'That is the original number of months left. A higher rate with the same payment takes longer.' },
                { v: n2 - left, why: 'That is only the extra months. The question asks for all the payments still needed.' },
                { v: n2 / 12, why: 'That is in years. The question asks for months.' },
              ],
              steps: base.concat([
                R`Keep \(PMT = ${L.money(pay)}\) and solve for \(n\) at the new rate: \[${L.num(bal)} = \frac{${L.num(pay)}}{\frac{${L.dec(apr2)}}{12}}\left(1 - \frac{1}{\left(1 + \frac{${L.dec(apr2)}}{12}\right)^{n}}\right) \;\Rightarrow\; n = ${L.num(n2)}\]`,
              ]),
              calc: `${N} [N] · ${pk(apr)} ÷ 12 = [I/YR] · −${kn(pv)} [PV] · 0 [FV] · [PMT] · ${left} [N] · [PV] → −${T.money(bal)} · ${pk(apr2)} ÷ 12 = [I/YR] · [N] → ${T.num(n2)}`,
              why: 'Same payment, higher rate: less of each payment repays principal, so the loan runs longer.',
            };
          }
          const newPay = FIN.pmt(bal, i2, left);
          return {
            q: R`You borrow ${mt(pv)} over ${yrs} years at ${T.pctT(apr)} p.a., with monthly payments. After ${k} years the rate ${move}. The loan must still finish on time. What is the new monthly payment?`,
            givens, answer: newPay, unit: '$', dp: 2,
            mistakes: [
              { v: pay, why: 'That is the old payment. The payment must change with the rate.' },
              { v: FIN.pmt(pv, i2, N), why: 'That re-prices the original loan from day one. Use the balance owed now and the months left.' },
              { v: FIN.pmt(bal, i2, N), why: `Only ${left} months are left, not ${N}.` },
            ],
            steps: base.concat([
              R`New payment on the balance, over the ${left} months left: \[PMT_{new} = \frac{${L.num(bal)} \times \frac{${L.dec(apr2)}}{12}}{1 - \left(1 + \frac{${L.dec(apr2)}}{12}\right)^{-${left}}} = ${L.money(newPay)}\]`,
            ]),
            calc: `${N} [N] · ${pk(apr)} ÷ 12 = [I/YR] · −${kn(pv)} [PV] · 0 [FV] · [PMT] · ${left} [N] · [PV] → −${T.money(bal)} · ${pk(apr2)} ÷ 12 = [I/YR] · [PMT] → ${T.money(newPay)}`,
            why: 'Payment, then balance, then re-price the balance at the new rate over the months left.',
          };
        } },

      /* ---------- saving ---------- */
      { id: 'w2-g-sink', topic: 'save', level: 1, section: 'B', formula: 'fv-annuity', src: 'Tutorial W2 Q2(a); Lecture W2 Excel PMT example',
        make(rng) {
          const who = rng.person();
          const goal = rng.pick(['a house deposit', 'a new car', 'a world trip', 'university fees', 'a business launch']);
          if (rng.chance(0.5)) {
            const fv = rng.step(5000, 100000, 1000), r = rng.step(0.03, 0.10, 0.005), n = rng.int(3, 15);
            const c = FIN.pmtForFV(fv, r, n), f = FIN.fvifa(r, n);
            return {
              q: R`${who} wants ${mt(fv)} for ${goal} in ${n} years. ${who} will deposit an equal amount at the end of each year, starting in one year. The account pays ${T.pctT(r)} p.a. How much must each deposit be?`,
              givens: [['FV', ml(fv)], ['r', L.pctT(r)], ['n', String(n)]],
              tl: tlLevel(1, n, 'C', 'Year', {}, [n]),
              answer: c, unit: '$', dp: 2,
              mistakes: [
                { v: fv / n, why: 'That ignores interest. The deposits earn interest, so you need less.' },
                { v: FIN.pmt(fv, r, n), why: 'That is a loan payment: it treats the target as money received today. The target is a future value.' },
                { v: c / (1 + r), why: 'That is the deposit for an annuity due. These deposits are at the end of each year.' },
              ],
              steps: [
                R`The target is a future value, so use the FV of an annuity: \[${ml(fv)} = C \times \frac{(${L.onePlus(r)})^{${n}} - 1}{${L.dec(r)}} = C \times ${L.numT(f, 6)}\]`,
                R`\[C = \frac{${ml(fv)}}{${L.numT(f, 6)}} = ${L.money(c)}\]`,
              ],
              calc: `${n} [N] · ${pk(r)} [I/YR] · 0 [PV] · ${kn(fv)} [FV] · [PMT] → −${T.money(c)}`,
              why: 'Future target: solve the FV of an annuity for the deposit.',
            };
          }
          const fv = rng.step(10000, 200000, 5000), apr = rng.step(0.03, 0.08, 0.005), yrs = rng.int(3, 20);
          const i = apr / 12, N = yrs * 12;
          const c = FIN.pmtForFV(fv, i, N);
          return {
            q: R`${who} wants ${mt(fv)} for ${goal} in ${yrs} years, saving an equal amount at the end of each month. The account pays ${T.pctT(apr)} p.a., compounded monthly. How much must ${who} save each month?`,
            givens: [['FV', ml(fv)], ['i', R`\frac{${L.dec(apr)}}{12}`], ['n', R`${yrs} \times 12 = ${N}`]],
            answer: c, unit: '$', dp: 2,
            mistakes: [
              { v: fv / N, why: 'That ignores interest. The deposits earn interest, so you need less.' },
              { v: FIN.pmtForFV(fv, apr, yrs) / 12, why: 'An annual deposit divided by 12 is not the monthly deposit. Work in months from the start.' },
              { v: FIN.pmt(fv, i, N), why: 'That is a loan payment: it treats the target as money received today. The target is a future value.' },
            ],
            steps: [
              R`Monthly rate \(i = \frac{${L.dec(apr)}}{12}\) and \(n = ${N}\).`,
              R`\[C = \frac{FV \times i}{(1+i)^{n} - 1} = \frac{${ml(fv)} \times \frac{${L.dec(apr)}}{12}}{\left(1 + \frac{${L.dec(apr)}}{12}\right)^{${N}} - 1} = ${L.money(c)}\]`,
            ],
            calc: `${N} [N] · ${pk(apr)} ÷ 12 = [I/YR] · 0 [PV] · ${kn(fv)} [FV] · [PMT] → −${T.money(c)}`,
            why: 'Future target with monthly deposits: monthly rate, number of months, FV of an annuity.',
          };
        } },
      { id: 'w2-g-fvmonth', topic: 'save', level: 2, section: 'B', formula: 'fv-annuity', src: 'MST 2026 Q15',
        make(rng) {
          const who = rng.person();
          const a = rng.int(0, 6), b = rng.pick([16, 18, 21]), d = rng.step(50, 500, 25), apr = rng.step(0.03, 0.07, 0.001);
          const i = apr / 12, n = (b - a) * 12;
          const fv = FIN.fvAnnuity(d, i, n);
          const from = a === 0 ? 'the day the child is born' : `the child’s ${ord(a)} birthday`;
          return {
            q: R`${who} deposits ${mt(d)} at the **end** of every month, from ${from} until the child’s ${ord(b)} birthday. The account pays ${T.pctT(apr)} p.a., compounded monthly. How much is in the account on the ${ord(b)} birthday?`,
            givens: [['C', ml(d)], ['i', R`\frac{${L.dec(apr)}}{12}`], ['n', R`(${b} - ${a}) \times 12 = ${n}`]],
            answer: fv, unit: '$', dp: 2,
            mistakes: [
              a > 0
                ? { v: FIN.fvAnnuity(d, i, b * 12), why: `That counts deposits from birth. They run from age ${a} to ${b}: ${n} months.` }
                : { v: FIN.fvAnnuity(d, i, n - 12), why: `That misses a year of deposits. From birth to age ${b} is ${n} months.` },
              { v: d * n, why: 'That adds the deposits and ignores interest.' },
              { v: FIN.fvAnnuityDue(d, i, n), why: 'That treats the deposits as start-of-month. They are made at the end of each month.' },
            ],
            steps: [
              R`Monthly: \(i = \frac{${L.dec(apr)}}{12}\) and \(n = (${b} - ${a}) \times 12 = ${n}\).`,
              R`\[FV = \frac{C}{i}\left((1+i)^{n} - 1\right) = ${fvaTex(d, rt(apr, 12), n)} = ${L.money(fv)}\]`,
            ],
            calc: `${n} [N] · ${pk(apr)} ÷ 12 = [I/YR] · 0 [PV] · −${kn(d)} [PMT] · [FV] → ${T.money(fv)}`,
            why: 'Count only the months when deposits are made, and use the monthly rate.',
          };
        } },
      { id: 'w2-g-college', topic: 'save', level: 3, section: 'B', formula: 'fv-annuity', boss: true, src: 'Tutorial W2 Q5',
        make(rng) {
          const r = rng.step(0.04, 0.12, 0.005);
          const college = rng.chance(0.5);
          const T0 = college ? rng.int(8, 18) : rng.int(20, 35);
          const m = college ? rng.int(3, 5) : rng.int(15, 25);
          const x = college ? rng.step(10000, 40000, 1000) : rng.step(20000, 80000, 1000);
          const pvT = college ? FIN.pvAnnuityDue(x, r, m) : FIN.pvAnnuity(x, r, m);
          const pmt = FIN.pmtForFV(pvT, r, T0);
          const q = college
            ? R`A degree lasting ${m} years starts in ${T0} years. Fees are ${mt(x)} a year, paid at the **start** of each year of study (the first at year ${T0}). You save an equal amount at the end of each year, from year 1 to year ${T0}. The rate is ${T.pctT(r)} p.a. How much must you save each year?`
            : R`You retire in ${T0} years. You then want to withdraw ${mt(x)} at the **end** of each year for ${m} years (the first at year ${T0 + 1}). You save an equal amount at the end of each year, from year 1 to year ${T0}. The rate is ${T.pctT(r)} p.a. How much must you save each year?`;
          return {
            q,
            givens: [['C_{\\text{spend}}', ml(x)], ['m', String(m)], ['T', String(T0)], ['r', L.pctT(r)]],
            answer: pmt, unit: '$', dp: 2,
            mistakes: [
              { v: FIN.pmtForFV(x * m, r, T0), why: `That saves the undiscounted total. Value the spending at year ${T0} first.` },
              college
                ? { v: FIN.pmtForFV(FIN.pvAnnuity(x, r, m), r, T0), why: `The fees are paid at the start of each year, so the first is at year ${T0}. Use an annuity due.` }
                : { v: FIN.pmtForFV(FIN.pvAnnuityDue(x, r, m), r, T0), why: `The withdrawals are at the end of each year, so the first is at year ${T0 + 1}. Use an ordinary annuity.` },
              { v: FIN.pmtForFV(pvT, r, T0 - 1), why: `Deposits run from year 1 to year ${T0}: that is ${T0} deposits, not ${T0 - 1}.` },
              { v: pvT / T0, why: 'That ignores the interest your deposits earn.' },
            ],
            steps: [
              college
                ? R`Stage 1, value the fees at \(t = ${T0}\). They start at \(t = ${T0}\), so they are an annuity due there: \[PV_{${T0}} = ${pvaTex(x, rt(r), m)}(${L.onePlus(r)}) = ${L.money(pvT)}\]`
                : R`Stage 1, value the withdrawals at \(t = ${T0}\). The first is at \(t = ${T0 + 1}\), so the ordinary annuity formula lands at \(t = ${T0}\): \[PV_{${T0}} = ${pvaTex(x, rt(r), m)} = ${L.money(pvT)}\]`,
              R`Stage 2, ${T0} deposits must grow to that amount: \[C = \frac{${L.num(pvT)} \times ${L.dec(r)}}{(${L.onePlus(r)})^{${T0}} - 1} = ${L.money(pmt)}\]`,
            ],
            calc: `${college ? 'BEG mode · ' : ''}${m} [N] · ${pk(r)} [I/YR] · ${kn(x)} [PMT] · 0 [FV] · [PV] → −${T.money(pvT)}${college ? ' · back to END mode' : ''} · then ${T0} [N] · 0 [PV] · ${kn(pvT)} [FV] · [PMT] → −${T.money(pmt)}`,
            why: 'Two stages: value the spending at the date saving stops, then find the deposit that builds that amount.',
          };
        } },

      /* ---------- solving for r and n ---------- */
      { id: 'w2-g-interp', topic: 'rate', level: 2, section: 'B', formula: 'interp', src: 'Lecture W2 Example 12',
        make(rng) {
          for (let k = 0; k < 40; k++) {
            const c = rng.step(100, 5000, 100), n = rng.int(4, 12);
            const r1 = rng.int(4, 15) / 100, r2x = r1 + 0.01;
            const off = rng.pick([0.15, 0.2, 0.25, 0.3, 0.35, 0.65, 0.7, 0.75, 0.8, 0.85]);
            const price = Math.round(FIN.pvAnnuity(c, r1 + off * 0.01, n));
            const pv1 = r2(FIN.pvAnnuity(c, r1, n)), pv2 = r2(FIN.pvAnnuity(c, r2x, n));
            const a1 = r2(pv1 - price), a2 = r2(pv2 - price);
            if (!(a1 > 0 && a2 < 0)) continue;
            const ip = FIN.interpolate(r1, a1, r2x, a2);
            if (Math.abs(ip.lambda - 0.5) < 0.1 || ip.lambda < 0.08 || ip.lambda > 0.92) continue;
            const exact = FIN.tvm.solveI(n, -price, c, 0);
            const p1 = Math.round(r1 * 100), p2 = Math.round(r2x * 100);
            return {
              q: R`An ordinary annuity pays ${mt(c)} a year for ${n} years. It costs ${mt(price)}. At ${p1}% its PV is ${T.money(pv1)}. At ${p2}% its PV is ${T.money(pv2)}. Use **interpolation** to estimate the rate of return.`,
              givens: [['C', ml(c)], ['n', String(n)], [R`\text{Price}`, ml(price)], [R`PV(${p1}\%)`, L.money(pv1)], [R`PV(${p2}\%)`, L.money(pv2)]],
              answer: P(ip.r), unit: '%', dp: 2,
              mistakes: [
                { v: P(r2x - ip.lambda * 0.01), why: `λ is measured from r1 = ${p1}%, not from r2.` },
                { v: P((r1 + r2x) / 2), why: 'That is just the midpoint. Interpolation weights by how far each PV is from the price.' },
                { v: Math.abs(a1) < Math.abs(a2) ? p1 : p2, why: 'That is only the nearer trial rate. Interpolate between the two.' },
              ],
              steps: [
                R`\[A_1 = ${L.num(pv1)} - ${L.num(price)} = ${L.num(a1)} \quad (r_1 = ${p1}\%)\]`,
                R`\[A_2 = ${L.num(pv2)} - ${L.num(price)} = ${L.num(a2)} \quad (r_2 = ${p2}\%)\]`,
                R`\[\lambda = \frac{A_1}{A_1 - A_2} = \frac{${L.num(a1)}}{${L.num(a1)} + ${L.num(-a2)}} = ${L.num(ip.lambda, 4)}\]`,
                R`\[r = ${p1}\% + ${L.num(ip.lambda, 4)} \times (${p2}\% - ${p1}\%) = ${L.pct(ip.r, 2)}\]`,
                R`A calculator gives \(${L.pct(exact, 4)}\), so the estimate is very close.`,
              ],
              calc: `${n} [N] · −${kn(price)} [PV] · ${kn(c)} [PMT] · 0 [FV] · [I/YR] → ${T.num(exact * 100, 4)}`,
              why: 'Interpolation: see how far the target sits between the two trial PVs, and move that far between the rates.',
            };
          }
          return null;
        } },
      { id: 'w2-g-nper', topic: 'rate', level: 2, section: 'B', formula: 'pv-annuity', src: 'Tutorial W2 Q1(d); Lecture W2 Excel NPER example',
        make(rng) {
          if (rng.chance(0.5)) {
            const pv = rng.step(5000, 60000, 1000), apr = rng.step(0.04, 0.15, 0.005), i = apr / 12;
            const pay = Math.ceil(FIN.pmt(pv, i, rng.int(24, 96)) / 10) * 10;
            const n = FIN.tvm.solveN(i, pv, -pay, 0);
            const mistakes = [
              { v: pv / pay, why: 'That ignores interest. Part of each payment goes to interest, so it takes longer.' },
              { v: n / 12, why: 'That is in years. The question asks for months.' },
              { v: pv / (pay - pv * i), why: 'That charges interest on the original loan every month. Interest is charged on the falling balance, so it takes less time.' },
            ];
            return {
              q: R`You borrow ${mt(pv)} at ${T.pctT(apr)} p.a., compounded monthly. You repay ${mt(pay)} at the end of each month. How many months will it take to repay the loan? (Answer to 2 decimal places.)`,
              givens: [['PV', ml(pv)], ['i', R`\frac{${L.dec(apr)}}{12}`], ['PMT', ml(pay)]],
              answer: n, unit: '', dp: 2,
              mistakes,
              steps: [
                R`Solve \(${ml(pv)} = \frac{${ml(pay)}}{i}\left(1 - \frac{1}{(1+i)^{n}}\right)\) for \(n\), with \(i = \frac{${L.dec(apr)}}{12}\).`,
                R`\[\frac{1}{(1+i)^{n}} = 1 - \frac{${L.num(pv)} \times i}{${L.num(pay)}} = ${L.numT(1 - (pv * i) / pay, 6)}\]`,
                R`\[n = \frac{-\ln(${L.numT(1 - (pv * i) / pay, 6)})}{\ln(1 + i)} = ${L.num(n)} \text{ months}\]`,
              ],
              calc: `${pk(apr)} ÷ 12 = [I/YR] · ${kn(pv)} [PV] · −${kn(pay)} [PMT] · 0 [FV] · [N] → ${T.num(n)}`,
              why: 'Solve the annuity formula for n with logs, or press [N] on the calculator.',
            };
          }
          const pv0 = rng.step(1000, 30000, 1000), d = rng.step(50, 1000, 50), i = rng.step(0.002, 0.008, 0.0005);
          const target = pv0 + d * rng.int(20, 120) + rng.step(1000, 20000, 1000);
          const n = FIN.tvm.solveN(i, -pv0, -d, target);
          if (!(n > 6 && n < 400)) return null;
          const x = (target + d / i) / (pv0 + d / i);
          return {
            q: R`You deposit ${mt(pv0)} now and ${mt(d)} at the end of each month. The account earns ${T.pctT(i)} per month. How many months until you have ${mt(target)}? (Answer to 2 decimal places.)`,
            givens: [['PV', ml(pv0)], ['PMT', ml(d)], ['i', L.pctT(i)], ['FV', ml(target)]],
            answer: n, unit: '', dp: 2,
            mistakes: [
              { v: FIN.nper(pv0, target, i), why: 'That ignores the monthly deposits.' },
              { v: (target - pv0) / d, why: 'That ignores interest.' },
              { v: n / 12, why: 'That is in years. The question asks for months.' },
            ],
            steps: [
              R`The balance after \(n\) months: \[${ml(pv0)}(1+i)^{n} + \frac{${ml(d)}}{i}\left((1+i)^{n} - 1\right) = ${ml(target)}\]`,
              R`Collect the \((1+i)^{n}\) terms: \[(1+i)^{n} = \frac{${L.num(target)} + \frac{${L.num(d)}}{i}}{${L.num(pv0)} + \frac{${L.num(d)}}{i}} = ${L.numT(x, 6)}\]`,
              R`\[n = \frac{\ln(${L.numT(x, 6)})}{\ln(${L.onePlus(i)})} = ${L.num(n)} \text{ months}\]`,
            ],
            calc: `${pk(i)} [I/YR] · −${kn(pv0)} [PV] · −${kn(d)} [PMT] · ${kn(target)} [FV] · [N] → ${T.num(n)}`,
            why: 'Both the lump sum and the deposits grow. Solve for the number of periods.',
          };
        } },

      /* ---------- boss-level multi-step ---------- */
      { id: 'w2-g-npv', topic: 'annuity', level: 3, section: 'B', formula: 'pv-annuity', boss: true, src: 'MST 2026 Q12',
        make(rng) {
          for (let k = 0; k < 30; k++) {
            const i0 = rng.step(50000, 200000, 5000), i1 = rng.step(20000, 100000, 5000);
            const c = rng.step(10000, 60000, 1000), n = rng.int(5, 10), r = rng.step(0.04, 0.12, 0.005);
            const inflow = FIN.pvAnnuity(c, r, n), cost = i0 + i1 / (1 + r), npv = inflow - cost;
            if (Math.abs(npv) < 2000) continue;
            return {
              q: R`A project costs ${mt(i0)} today plus another ${mt(i1)} in one year. It earns ${mt(c)} at the end of each year for ${n} years. The discount rate is ${T.pctT(r)}. What is the project’s NPV?`,
              givens: [['I_0', ml(i0)], ['I_1', ml(i1)], ['C', ml(c)], ['n', String(n)], ['r', L.pctT(r)]],
              answer: npv, unit: '$', dp: 2,
              mistakes: [
                { v: inflow - i0 - i1, why: `The ${mt(i1)} is paid in one year, so discount it first.` },
                { v: inflow / (1 + r) - cost, why: 'The inflows start at year 1, so the annuity formula already gives their value today.' },
                { v: inflow - i0 - i1 * (1 + r), why: 'That compounds the second payment. It must be discounted.' },
              ],
              steps: [
                R`\[PV_{\text{inflows}} = ${pvaTex(c, rt(r), n)} = ${L.money(inflow)}\]`,
                R`\[PV_{\text{costs}} = ${ml(i0)} + \frac{${ml(i1)}}{${L.onePlus(r)}} = ${L.money(cost)}\]`,
                R`\[NPV = ${L.num(inflow)} - ${L.num(cost)} = ${L.money(npv)}\]`,
              ],
              calc: `−${kn(i0)} [CFj] · ${kn(c - i1)} [CFj] · ${kn(c)} [CFj] · ${n - 1} [Nj] · ${pk(r)} [I/YR] · [NPV] → ${T.money(npv)}`,
              why: 'Bring every cash flow to today: the annuity of inflows, the cost today and the cost in one year.',
            };
          }
          return null;
        } },
      { id: 'w2-g-company', topic: 'deferred', level: 3, section: 'B', formula: 'pv-perp', boss: true, src: 'Tutorial W2 Q4',
        make(rng) {
          const x = rng.step(10000, 50000, 5000), y = rng.step(20000, 80000, 5000), z = rng.step(30000, 120000, 5000);
          const k = rng.int(4, 7), r = rng.step(0.08, 0.15, 0.005);
          const a = x / (1 + r), bAt1 = FIN.pvAnnuity(y, r, k - 1), b = bAt1 / (1 + r), cAtK = z / r, c = cAtK / FIN.fvif(r, k);
          const v = a + b + c;
          const kl = (w) => `$${T.numT(w / 1000, 1)}k`;
          const at = { 1: kl(x), 2: kl(y), [k]: kl(y), [k + 1]: kl(z), [k + 2]: kl(z) + ' …' };
          if (k > 3) at[k - 1] = kl(y);
          return {
            q: R`A business is expected to produce ${mt(x)} in year 1, then ${mt(y)} a year in years 2 to ${k}, then ${mt(z)} a year **forever** from year ${k + 1}. The discount rate is ${T.pctT(r)}. What is the business worth today?`,
            givens: [['C_1', ml(x)], [R`C_{2..${k}}`, ml(y)], [R`C_{${k + 1}+}`, ml(z)], ['r', L.pctT(r)]],
            tl: { n: k + 2, at, unit: 'Year', hi: [0] },
            answer: v, unit: '$', dp: 2,
            mistakes: [
              { v: a + b + cAtK / FIN.fvif(r, k + 1), why: R`The perpetuity starts at year ${k + 1}, so \(\frac{C}{r}\) lands at year ${k}. Discount ${k} years, not ${k + 1}.` },
              { v: a + bAt1 + c, why: 'The annuity starts at year 2, so its formula value sits at year 1. Discount it one more year.' },
              { v: a + b + cAtK, why: `The perpetuity value sits at year ${k}. Discount it back to today.` },
            ],
            steps: [
              R`Year 1: \[\frac{${ml(x)}}{${L.onePlus(r)}} = ${L.money(a)}\]`,
              R`Years 2–${k}, an annuity of ${k - 1} payments whose value lands at year 1: \[${pvaTex(y, rt(r), k - 1)} = ${L.money(bAt1)} \;\Rightarrow\; \frac{${L.num(bAt1)}}{${L.onePlus(r)}} = ${L.money(b)}\]`,
              R`Year ${k + 1} onwards, a perpetuity whose value lands at year ${k}: \[\frac{${ml(z)}}{${L.dec(r)}} = ${L.money(cAtK)} \;\Rightarrow\; \frac{${L.num(cAtK)}}{(${L.onePlus(r)})^{${k}}} = ${L.money(c)}\]`,
              R`\[\text{Value} = ${L.num(a)} + ${L.num(b)} + ${L.num(c)} = ${L.money(v)}\]`,
            ],
            why: 'Split the stream into a lump sum, an annuity and a perpetuity. Move each value to today, then add.',
          };
        } },
    ],
  };

  PACK.generators.forEach((g) => { const make = g.make; g.make = (rng) => tidy(make(rng)); });
  root.registerPack(PACK);
})(typeof window !== 'undefined' ? window : globalThis);
