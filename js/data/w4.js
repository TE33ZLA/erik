/* Floor 4 — Week 4: Capital budgeting I — techniques for evaluation (decision rules). */
(function (root) {
  'use strict';
  const { FIN, L, T, FMT } = root;
  const R = String.raw;
  const P = (r) => +(r * 100).toFixed(8); // decimal rate -> percent units for answers
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

  /* ---------- helpers (local to this pack) ---------- */
  const sum = (a) => a.reduce((s, x) => s + x, 0);
  const disc = (c, r, t) => c / Math.pow(1 + r, t);
  const cell = (x) => T.money(x, 0); // table cell: −$1,000
  const keyNum = (x) => (x < 0 ? '−' : '') + String(+Math.abs(x).toFixed(2)); // as typed on the calculator
  const rateKey = (r) => T.numT(r * 100);
  const NAMES = [['L', 'S'], ['A', 'B'], ['X', 'Y'], ['M', 'N'], ['P', 'Q']];

  /** table with a Year column and one money column per project */
  function cfTable(cols, names) {
    return { head: ['Year'].concat(names), rows: cols[0].map((_, t) => [t].concat(cols.map((c) => cell(c[t])))) };
  }
  /** HP10bII+ cash-flow keystrokes; runs of equal cash flows use [Nj] */
  function cfKeys(cfs) {
    const parts = ['[C ALL]', `${keyNum(cfs[0])} [CFj]`];
    for (let i = 1; i < cfs.length;) {
      let j = i;
      while (j + 1 < cfs.length && cfs[j + 1] === cfs[i]) j++;
      const cnt = j - i + 1;
      parts.push(`${keyNum(cfs[i])} [CFj]` + (cnt > 1 ? ` · ${cnt} [Nj]` : ''));
      i = j + 1;
    }
    return parts.join(' · ');
  }
  const npvKeys = (cfs, r) => `${cfKeys(cfs)} · ${rateKey(r)} [I/YR] · [NPV] → ${T.money(FIN.npv(r, cfs))}`;
  const irrKeys = (cfs, irr) => `${cfKeys(cfs)} · [IRR/YR] → ${T.num(irr * 100)}`;
  /** "−$100.00 + $9.09 − $3.00" */
  function signedSum(vals) {
    return vals.map((v, k) => (k === 0 ? L.money(v) : (v < 0 ? '- ' + L.money(-v) : '+ ' + L.money(v)))).join(' ');
  }
  /** PV of each cash flow, one line each */
  function pvBlock(cfs, r) {
    const lines = cfs.map((c, t) => (t === 0 ? R`PV_{0} &= ${L.moneyT(c)}` : R`PV_{${t}} &= \frac{${L.moneyT(c)}}{(${L.onePlus(r)})^{${t}}} = ${L.money(disc(c, r, t))}`));
    return R`\[\begin{aligned} ${lines.join(R` \\ `)} \end{aligned}\]`;
  }
  function npvSteps(cfs, r) {
    return [
      R`Discount every cash flow back to \(t = 0\): \[NPV = \sum_{t=0}^{${cfs.length - 1}} \frac{NCF_t}{(1+k)^{t}}\]`,
      pvBlock(cfs, r),
      R`\[NPV = ${signedSum(cfs.map((c, t) => disc(c, r, t)))} = ${L.money(FIN.npv(r, cfs))}\]`,
    ];
  }
  /** running totals up to year `upto` */
  function cumBlock(cfs, upto) {
    let s = 0;
    const lines = [];
    for (let t = 0; t <= upto; t++) { s += cfs[t]; lines.push(R`\text{End of year } ${t} &: ${L.moneyT(s)}`); }
    return R`\[\begin{aligned} ${lines.join(R` \\ `)} \end{aligned}\]`;
  }
  const annuityPV = (c, r, n) => R`${L.moneyT(c)} \times \frac{1}{${L.dec(r)}}\left(1 - \frac{1}{(${L.onePlus(r)})^{${n}}}\right)`;
  const list = (xs) => (xs.length === 1 ? xs[0] : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]);

  /** Two mutually exclusive projects whose NPV profiles cross (timing or scale differences).
   *  A = the later / bigger project (lower IRR, higher NPV at 0%), B = the faster / smaller one. */
  function crossingPair(rng) {
    for (let tries = 0; tries < 400; tries++) {
      let A, B, kind;
      if (rng.chance(0.6)) {
        kind = 'timing';
        const m = rng.pick([1, 100, 1000]);
        const late = [-100, rng.step(5, 25, 5), rng.step(30, 65, 5), rng.step(55, 95, 5)];
        const early = [-100, rng.step(50, 75, 5), rng.step(30, 55, 5), rng.step(5, 30, 5)];
        A = late.map((x) => x * m); B = early.map((x) => x * m);
      } else {
        kind = 'scale';
        const n = rng.int(3, 5);
        const cs = rng.step(10, 60, 5) * 1000;
        const share = rng.step(0.35, 0.6, 0.01);
        const big = rng.pick([2, 3, 4]);
        const cfS = Math.round((cs * share) / 100) * 100;
        const cfL = Math.round((cs * big * (share - rng.step(0.03, 0.12, 0.01))) / 100) * 100;
        A = [-cs * big].concat(Array(n).fill(cfL));
        B = [-cs].concat(Array(n).fill(cfS));
      }
      const diff = A.map((x, t) => x - B[t]);
      const xs = FIN.irrAll(diff), iA = FIN.irrAll(A), iB = FIN.irrAll(B);
      if (xs.length !== 1 || iA.length !== 1 || iB.length !== 1) continue;
      const cross = xs[0], irrA = iA[0], irrB = iB[0];
      if (!(cross > 0.03 && cross < 0.25 && irrB > irrA + 0.01 && irrA > cross + 0.02)) continue;
      if (sum(A) <= sum(B)) continue;
      return { A, B, diff, cross, irrA, irrB, kind };
    }
    return null;
  }

  /* ---------- course examples (computed once, used by several questions) ---------- */
  const EX_L = [-100, 10, 60, 80], EX_S = [-100, 70, 50, 20];
  const LS_TABLE = cfTable([EX_L, EX_S], ['Project L', 'Project S']);
  const HX = [-45, 20, 25, 30, 35], HY = [-90, 20, 30, 60, 80];
  const HARVEST = { head: ['Year', 'Project X', 'Project Y'], rows: HX.map((c, t) => [t, T.money(c, 0) + 'm', T.money(HY[t], 0) + 'm']) };
  const TM1 = [-300000, -387000, -193000, 100000, 600000, 1270000], TM2 = [-599000, 234000, 234000, 234000, 234000, 234000];
  const TM_D = TM1.map((c, t) => c - TM2[t]);
  const Q3CF = [-20e6, 1.5e6, 3.278e6, 5e6, 6.45e6].concat(Array(16).fill(2.5e6));
  const NPV_X_CLEAN = -4000 - FIN.pvAnnuity(100, 0.1, 10), NPV_Y_CLEAN = -1000 - FIN.pvAnnuity(500, 0.1, 5);
  const BILLY_S = [-100000, 60000, 60000], BILLY_L = [-100000, 33500, 33500, 33500, 33500];
  const NPV_BS = FIN.npv(0.1, BILLY_S), NPV_BL = FIN.npv(0.1, BILLY_L);
  const CAFES = [['Sydney', 500000, 220000], ['Melbourne', 300000, 130000], ['Perth', 250000, 100000], ['Hobart', 125000, 60000]]
    .map(([nm, out, a]) => { const npv = -out + FIN.pvAnnuity(a, 0.1, 3); return { nm, out, a, npv, pi: npv / out }; });
  const HOBART = CAFES[3];
  const T4 = [['A', 35, 14], ['B', 19, 7], ['C', 15, 7], ['D', 20, 10.5]]
    .map(([nm, out, a]) => { const npv = -out + FIN.pvAnnuity(a, 0.08, 4); return { nm, out, a, npv, pi: npv / out }; });
  const OR_NPV = -200000 - FIN.pvAnnuity(4000, 0.11, 7), SS_NPV = -100000 - FIN.pvAnnuity(2000, 0.11, 4);
  const HF_NPV = -15000 - FIN.pvAnnuity(2000, 0.1, 3);
  const MN_M = [-1000, 1000, 400], MN_N = [-1000, 600, 900];
  const MOCK7_D = [-1000, 600, 400, 300, 100], MOCK7_R = [-1000, 100, 250, 450, 750];
  const FOUR = [-252, 1431, -3035, 2850, -1000];
  const BARCODE = [-1450000, 640000, 715250, 823330, 907125];

  root.registerPack({
    id: 'w4', floor: 4, week: 'Week 4',
    title: 'The Project Colosseum',
    topic: 'Capital budgeting I: decision rules',
    color: '#e0662f', icon: '🏗️',
    intro: 'Projects fight for funding in this arena. Judge them with payback, NPV, IRR and PI, and the lift to Floor 5 is yours.',

    briefing: [
      { h: 'What is capital budgeting?', points: [
        R`**Capital budgeting** is choosing which long-term projects to invest in: new plants, machines, equipment.`,
        R`Steps: estimate the cash flows, assess their risk, choose a discount rate \(k\), find the NPV and/or IRR, then decide.`,
        R`**Independent** projects do not affect each other’s cash flows. **Mutually exclusive** projects compete: taking one rules out the others.`,
        R`**Conventional** cash flows change sign once, e.g. \(- \; + \; + \; +\). **Non-conventional** cash flows change sign two or more times, e.g. \(- \; + \; + \; -\).`,
      ] },
      { h: 'Payback period', points: [
        R`The years needed to get the initial cost back: \(\text{Payback} = \text{years before recovery} + \frac{\text{unrecovered cost}}{\text{cash flow in the recovery year}}\).`,
        R`Rule: accept if the payback is **shorter than the cut-off**.`,
        R`Pros: easy to calculate, and it hints at **risk and liquidity**.`,
        R`Cons: it ignores the **time value of money**, ignores cash flows **after** payback, and the cut-off is **arbitrary**.`,
      ] },
      { h: 'Net present value (NPV)', points: [
        R`\(NPV = \sum_{t=0}^{n} \frac{NCF_t}{(1+k)^{t}} = NCF_0 + \frac{NCF_1}{1+k} + \cdots + \frac{NCF_n}{(1+k)^{n}}\)`,
        R`Rule: accept if \(NPV > 0\). For mutually exclusive projects, pick the **highest NPV**.`,
        R`NPV = PV of benefits − PV of costs = the **gain in shareholder wealth**.`,
        R`It uses all the cash flows, discounts them properly and assumes reinvestment at \(k\). It needs good estimates of the cash flows and the rate.`,
        R`The **most** you should pay for a stream of inflows is its PV (the price that makes \(NPV = 0\)).`,
      ] },
      { h: 'Internal rate of return (IRR)', points: [
        R`The IRR is the rate that makes the NPV zero: \(\sum_{t=0}^{n} \frac{NCF_t}{(1+IRR)^{t}} = 0\).`,
        R`Rule: accept if \(IRR > k\). IRR assumes reinvestment at the IRR, which is less realistic than \(k\).`,
        R`Pitfalls: several sign changes can give **multiple IRRs**; some projects have **no IRR**; for **borrowing**-type cash flows (+ then −) a high IRR is bad.`,
        R`**NPV is always preferred** when the rules disagree.`,
      ] },
      { h: 'NPV profiles and the crossover rate', points: [
        R`An **NPV profile** plots NPV (y-axis) against the discount rate (x-axis).`,
        R`y-intercept = NPV at 0% = the **sum of the cash flows**. x-intercept = the **IRR**.`,
        R`Later (rising) cash flows give a **steeper** profile.`,
        R`**Crossover rate** = the rate where the two NPVs are equal = the **IRR of the incremental cash flows** \((A - B)\).`,
        R`If \(k\) is below the crossover rate, NPV and IRR **conflict** for mutually exclusive projects (scale or timing differences). Follow NPV.`,
      ] },
      { h: 'Capital rationing and the profitability index', points: [
        R`**Soft** rationing: limits set by management, which can be relaxed. **Hard** rationing: the firm cannot raise the money.`,
        R`\(PI = \frac{NPV}{\text{Initial investment}}\), the value created per dollar invested. Accept if \(PI > 0\).`,
        R`Under rationing, **rank by PI** and fund projects from the top until the budget runs out.`,
        R`Weaknesses: PI hides scale, and it cannot handle several resource constraints at once.`,
      ] },
      { h: 'Projects with different lives', points: [
        R`Do not compare the NPVs of repeatable projects with **different lives**.`,
        R`**Replacement chain**: repeat each project until they end at the same time, then compare NPVs.`,
        R`**Equivalent annual annuity**: \(EAA = \frac{NPV \times k}{1 - \frac{1}{(1+k)^{n}}}\). Pick the higher EAA, or the lower equivalent annual cost.`,
        R`**When to retire an asset**: find the PV of each possible retirement date and pick the highest.`,
      ] },
    ],

    topics: {
      basics: 'Capital budgeting basics',
      payback: 'Payback period',
      npv: 'Net present value',
      irr: 'Internal rate of return',
      profile: 'NPV profiles and crossover',
      pitfalls: 'IRR pitfalls and conflicts',
      pi: 'Capital rationing and PI',
      lives: 'Unequal lives and retirement',
    },

    nodes: [
      { id: 'w4-1', kind: 'battle', name: 'The Arena Gates', topics: ['basics', 'payback'], n: 6,
        enemy: { name: 'Captain Payback', title: 'Ignores every coin after the cut-off', body: 'round', color: '#d9a441', acc: ['pirate'], mouth: 'grin', item: '🪙',
          lines: { intro: 'Arr! I only count the gold until I get me money back!', hit: ['Blimey! You spotted the time value I ignored!', 'Arr, you counted the cash after the cut-off!'],
            taunt: ['A big cash flow in year 4? Never heard of it!', 'Quick money is the only money, matey!'], win: 'Sunk… like a sunk cost…', lose: 'Arr! Paid back in two years flat!' } } },
      { id: 'w4-2', kind: 'battle', name: 'Hall of Present Value', topics: ['npv', 'irr'], n: 6,
        enemy: { name: 'The NPVampire', title: 'Drains the wealth from bad projects', body: 'ghost', color: '#8e3b5b', acc: ['bowtie'], mouth: 'fangs', eyes: 2, item: '🦇',
          lines: { intro: 'I feast on projects with a negative NPV!', hit: ['Argh! A positive NPV, my only weakness!', 'You discounted every cash flow… I weaken!'],
            taunt: ['Forgot the outlay at t = 0? Delicious.', 'Mmm, undiscounted cash flows. So juicy.'], win: 'Value… created… I dissolve…', lose: 'Your wealth is mine!' } } },
      { id: 'w4-m1', kind: 'mini', name: 'Accept or Reject?', mini: 'accept-reject' },
      { id: 'w4-3', kind: 'battle', name: 'The Crossover Colonnade', topics: ['profile', 'pitfalls'], n: 6,
        enemy: { name: 'The IRR Hydra', title: 'Grows an extra IRR with every sign change', body: 'spiky', color: '#3f9c6d', acc: ['horns'], mouth: 'fangs', eyes: 3, item: '🐍',
          lines: { intro: 'Every sign change grows me another IRR! Which one is real? Hisss!', hit: ['You trusted NPV over IRR! One head down!', 'The crossover rate! Nooo!'],
            taunt: ['The bigger IRR always wins… right? Hisss!', 'Pick an IRR, any IRR!'], win: 'NPV… always… wins…', lose: 'IRRs everywhere! Hisss!' } } },
      { id: 'w4-m2', kind: 'mini', name: 'Sign Spotter', mini: 'sign-spotter' },
      { id: 'w4-4', kind: 'battle', name: 'The Rationing Ring', topics: ['pi', 'lives'], n: 6,
        enemy: { name: 'The Rationator', title: 'Gladiator of the hard budget', body: 'box', color: '#b5523b', acc: ['horns', 'mustache'], mouth: 'flat', item: '🛡️',
          lines: { intro: 'One million denarii and not a coin more! Choose your projects wisely!', hit: ['You ranked by PI! The crowd roars!', 'An equivalent annual annuity? Well fought!'],
            taunt: ['Biggest NPV first? Now the budget is empty!', 'Comparing a 2-year NPV with a 4-year NPV? Thumbs down!'], win: 'The budget… is well spent…', lose: 'Thumbs down, intern!' } } },
      { id: 'w4-boss', kind: 'boss', name: 'Emperor Maximus', topics: '*', n: 10,
        enemy: { name: 'Maximus Wealthius', title: 'Emperor of the Project Colosseum', body: 'tall', color: '#c9a227', acc: ['crown'], mouth: 'smirk', eyes: 2, item: '🏛️',
          lines: { intro: 'Only projects that create wealth leave my arena alive!', hit: ['A positive NPV! The crowd cheers!', 'You found the crossover rate. Impressive, gladiator!'],
            taunt: ['You chose by IRR? To the lions!', 'Unequal lives, and you compared NPVs? Thumbs down!'], win: 'Shareholder wealth… maximised…', lose: 'Your project is rejected!' } } },
    ],

    minis: {
      'accept-reject': {
        game: 'rapid', title: 'Accept or Reject?', intro: 'Each card is one project decision. Accept or reject it. For mutually exclusive pairs, pick the winner.',
        gen(rng) {
          const k = rng.step(0.06, 0.14, 0.01);
          const kind = rng.int(0, 7);
          if (kind === 0) {
            const npv = (rng.chance(0.5) ? 1 : -1) * rng.step(500, 95000, 100);
            return { t: R`Independent project at \(k = ${L.pctT(k)}\): \(NPV = ${L.money(npv, 0)}\).`, opts: ['Accept', 'Reject'], a: npv > 0 ? 0 : 1,
              why: npv > 0 ? R`\(NPV > 0\): it adds wealth.` : R`\(NPV < 0\): it destroys wealth.` };
          }
          if (kind === 1) {
            let irr = rng.step(0.03, 0.25, 0.001);
            if (Math.abs(irr - k) < 0.005) irr = k + 0.012;
            return { t: R`Conventional project: \(IRR = ${L.pct(irr, 1)}\) and \(k = ${L.pctT(k)}\).`, opts: ['Accept', 'Reject'], a: irr > k ? 0 : 1,
              why: irr > k ? R`\(IRR > k\): it earns more than the cost of capital.` : R`\(IRR < k\): it earns less than the cost of capital.` };
          }
          if (kind === 2) {
            let pi = rng.step(-0.2, 0.45, 0.01);
            if (Math.abs(pi) < 0.01) pi = 0.03;
            return { t: R`\(PI = \frac{NPV}{\text{Investment}} = ${L.num(pi, 2)}\).`, opts: ['Accept', 'Reject'], a: pi > 0 ? 0 : 1,
              why: pi > 0 ? R`\(PI > 0\) means \(NPV > 0\).` : R`\(PI < 0\) means \(NPV < 0\).` };
          }
          if (kind === 3) {
            const cut = rng.int(2, 5);
            let pb = rng.step(1, 6.5, 0.1);
            if (Math.abs(pb - cut) < 0.1) pb = cut + 0.4;
            return { t: R`Payback \(= ${L.num(pb, 1)}\) years. Cut-off \(= ${cut}\) years.`, opts: ['Accept', 'Reject'], a: pb < cut ? 0 : 1,
              why: pb < cut ? 'The cost comes back before the cut-off.' : 'The cost comes back after the cut-off.' };
          }
          if (kind === 4 || kind === 5) {
            let a = rng.step(10, 90, 1) * 1000, b = rng.step(10, 90, 1) * 1000;
            if (Math.abs(a - b) < 3000) b = a + 7000;
            const lo = rng.step(0.10, 0.18, 0.001), hi = lo + rng.step(0.02, 0.08, 0.001);
            const conflict = rng.chance(0.7);
            const irrA = (a > b) === conflict ? lo : hi, irrB = irrA === lo ? hi : lo;
            return { t: R`Mutually exclusive. A: \(NPV = ${L.money(a, 0)}\), \(IRR = ${L.pct(irrA, 1)}\). B: \(NPV = ${L.money(b, 0)}\), \(IRR = ${L.pct(irrB, 1)}\).`,
              opts: ['Project A', 'Project B'], a: a > b ? 0 : 1, why: 'Mutually exclusive: choose the higher NPV, even when its IRR is lower.' };
          }
          if (kind === 6) {
            const nA = rng.pick([2, 3]), nB = nA + rng.int(2, 3);
            const eA = rng.step(2, 9, 0.1) * 1000;
            let eB = eA * rng.pick([0.8, 0.85, 0.9, 1.1, 1.15]);
            eB = Math.round(eB / 100) * 100;
            return { t: R`Repeated forever. A lasts ${nA} years: \(EAA = ${L.money(eA, 0)}\). B lasts ${nB} years: \(EAA = ${L.money(eB, 0)}\), with the bigger NPV.`,
              opts: ['Project A', 'Project B'], a: eA > eB ? 0 : 1, why: 'Different lives: compare equivalent annual annuities, not NPVs.' };
          }
          const cash = rng.step(1000, 9000, 500), irr = rng.pick([0.03, 0.04, 0.05, 0.16, 0.18, 0.2]);
          const pay = Math.round(cash * (1 + irr));
          const npv = cash - pay / (1 + k);
          return { t: R`\(+${L.money(cash, 0)}\) today, \(-${L.money(pay, 0)}\) in one year. \(IRR = ${L.pctT(irr)}\), \(k = ${L.pctT(k)}\).`, opts: ['Accept', 'Reject'], a: npv > 0 ? 0 : 1,
            why: npv > 0 ? R`Borrowing at ${T.pctT(irr)} when money costs ${T.pctT(k)} is cheap: \(NPV = ${L.money(npv)}\).` : R`This is borrowing at ${T.pctT(irr)}, above \(k\): \(NPV = ${L.money(npv)}\).` };
        },
        rounds: 12, seconds: 12,
      },
      'sign-spotter': {
        game: 'rapid', title: 'Sign Spotter', intro: 'Count the sign changes. One change is conventional. Two or more is non-conventional, with possibly more than one IRR.',
        gen(rng) {
          const k = rng.pick([1, 1, 2, 2, 3]);
          const flips = rng.sample([1, 2, 3, 4, 5], k).sort((x, y) => x - y);
          let cur = rng.chance(0.8) ? -1 : 1;
          const s = [];
          for (let t = 0; t <= 5; t++) { if (flips.includes(t)) cur = -cur; s.push(cur < 0 ? '-' : '+'); }
          const pat = R`\(${s.join(R`\;\;`)}\)`;
          if (rng.chance(0.55)) {
            return { t: R`Signs in years 0 to 5: ${pat}`, opts: ['Conventional', 'Non-conventional'], a: k === 1 ? 0 : 1,
              why: k === 1 ? 'The sign changes once: conventional.' : `The sign changes ${k} times: non-conventional.` };
          }
          return { t: R`Signs in years 0 to 5: ${pat}. At most how many IRRs?`, opts: ['1', '2', '3'], a: k - 1,
            why: `${k} sign change${k > 1 ? 's' : ''}, so at most ${k} IRR${k > 1 ? 's' : ''}.` };
        },
        rounds: 12, seconds: 10,
      },
    },

    questions: [
      /* ----- capital budgeting basics ----- */
      { id: 'w4-q01', topic: 'basics', kind: 'mcq', level: 1, section: 'A',
        q: R`What is **capital budgeting**?`,
        choices: ['Analysing long-term investments in real assets, such as a new plant, to decide which to accept', 'Deciding how much of each year’s profit to pay out as dividends', 'Managing day-to-day cash, inventory and receivables', 'Choosing the mix of debt and equity that funds the firm'], answer: 0,
        why: R`Capital budgeting is the **investment decision**. The spending is large and long-term, so it shapes the firm’s future.` },
      { id: 'w4-q02', topic: 'basics', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W4',
        q: R`Two projects are **mutually exclusive**. What does that mean?`,
        choices: ['Accepting one rules out accepting the other', 'Accepting one does not affect the other’s cash flows', 'Both must be accepted together', 'They have identical cash flows'], answer: 0,
        why: R`Mutually exclusive projects compete for the same job, like two machines for one slot. **Independent** projects do not affect each other’s cash flows.` },
      { id: 'w4-q03', topic: 'basics', kind: 'tf', level: 1, section: 'A', src: 'Lecture W4',
        q: R`Projects A and B are **independent**. Both have a positive NPV. With no limit on capital, the firm should accept both.`,
        answer: true, why: R`Independent projects are judged one at a time. Each positive-NPV project adds wealth, so take both.` },
      { id: 'w4-q04', topic: 'basics', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W4',
        q: R`A project’s cash flows have the signs \(- \;\; + \;\; + \;\; + \;\; + \;\; -\) in years 0 to 5. How is it classified?`,
        choices: ['Non-conventional: the sign changes twice', 'Conventional: it starts with an outflow', 'Conventional: most cash flows are positive', 'Non-conventional: the sign changes five times'], answer: 0,
        why: R`Count the changes: \(-\) to \(+\) after year 0, then \(+\) to \(-\) in year 5. Two changes means **non-conventional**. A final clean-up cost often causes this.` },
      { id: 'w4-q05', topic: 'basics', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W4',
        q: R`A project’s cash flows have the signs \(+ \;\; + \;\; + \;\; - \;\; - \;\; -\) in years 0 to 5. How is it classified?`,
        choices: ['Conventional: the sign changes only once', 'Non-conventional: it starts with an inflow', 'Non-conventional: the sign changes three times', 'It cannot be classified'], answer: 0,
        why: R`There is only one sign change (between years 2 and 3), so it is **conventional**. The lecture table classifies it this way. It looks like borrowing: cash in first, cash out later.` },
      { id: 'w4-q06', topic: 'basics', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W4',
        q: R`Which of these is **not** a step in capital budgeting?`,
        choices: ['Maximising this year’s accounting profit', 'Estimating the project’s cash flows', 'Assessing the risk of the cash flows and choosing a discount rate', 'Finding the NPV and/or IRR'], answer: 0,
        why: R`The steps are: estimate the cash flows, assess their risk, set the discount rate, find the NPV or IRR, then decide. Cash flows and value matter, not this year’s profit.` },

      /* ----- payback ----- */
      { id: 'w4-q07', topic: 'payback', kind: 'mcq', level: 1, section: 'A', src: 'Tutorial W4 concept check 1',
        q: R`Which statement about the **payback rule** is **false**?`,
        choices: ['It is reliable because it considers the time value of money and depends on the cost of capital', 'It measures the time needed to recover the initial investment', 'It is mainly used because it is simple', 'It is useful when a wrong decision would cost too little to justify an NPV analysis'], answer: 0,
        why: R`Payback ignores the time value of money and never uses the cost of capital. The other three statements are true.` },
      { id: 'w4-q08', topic: 'payback', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W4',
        q: R`Which of these is a **weakness** of the payback period?`,
        choices: ['It ignores cash flows after the payback period', 'It is hard to calculate', 'It discounts cash flows at too high a rate', 'It needs an estimate of the cost of capital'], answer: 0, formula: 'payback',
        why: R`Payback stops counting once the cost is recovered. It also ignores the time value of money, and the cut-off is arbitrary.` },
      { id: 'w4-q09', topic: 'payback', kind: 'tf', level: 1, section: 'A', src: 'Lecture W4',
        q: R`A short payback period gives some indication of a project’s **risk and liquidity**.`,
        answer: true, why: R`The sooner the money comes back, the sooner it is safe and available again. That, plus simplicity, is payback’s appeal.` },
      { id: 'w4-q10', topic: 'payback', kind: 'num', level: 1, section: 'B', src: 'Lecture W4 Example 1', formula: 'payback',
        q: R`What is the **payback period** of Project L?`,
        table: cfTable([EX_L], ['Project L']),
        answer: FIN.payback(EX_L), unit: 'yrs', dp: 2,
        mistakes: [
          { v: 3, why: 'Payback counts only the part of year 3 that is needed, not the whole year.' },
          { v: 3.375, why: 'Only 2 full years pass before the cost is recovered: 2 + 30/80.' },
          { v: 2.5, why: 'That divides $30 by the year 2 cash flow. Use the recovery year’s cash flow ($80).' },
        ],
        steps: [cumBlock(EX_L, 3), R`After 2 years, \(\$30\) is still unrecovered. Year 3 brings \(\$80\).`, R`\[\text{Payback} = 2 + \frac{\$30}{\$80} = 2.375 \text{ years}\]`],
        why: R`Two full years, plus \(\frac{30}{80}\) of year 3: 2.375 years. (Project S pays back in 1.6 years.)` },
      { id: 'w4-q11', topic: 'payback', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W4',
        q: R`Project L pays back in 2.375 years. Suppose it also paid **$100 million in year 4**. What would happen to its payback period?`,
        table: { head: ['Year', 'Project L'], rows: [[0, '−$100'], [1, '$10'], [2, '$60'], [3, '$80'], [4, '$100,000,000']] },
        choices: ['Nothing: it stays 2.375 years', 'It falls below 2 years', 'It rises, because the project lasts longer', 'It can no longer be calculated'], answer: 0,
        why: R`Payback stops counting when the cost is recovered. Later cash flows, however huge, are ignored. This is its biggest weakness.` },
      { id: 'w4-q12', topic: 'payback', kind: 'mcq', level: 2, section: 'B', src: 'Tutorial W4 Q1', formula: 'payback',
        q: R`An investor only takes projects with a payback of **2 years or less**. The cost of capital is 9.5%. Which projects does he take?`,
        table: cfTable([[-15000, 7000, 7000, 7000, 7000, 7000], [-18000, 12000, 2000, 2000, 2000, 2000]], ['Investment A', 'Investment B']),
        choices: ['Neither', 'A only', 'B only', 'Both'], answer: 0,
        wrong: { 1: 'A needs 2.14 years, just over the 2-year limit.', 2: 'B takes 4 years: after its big first year it only earns $2,000 a year.' },
        steps: [
          R`A has equal cash flows, so use the shortcut: \(\frac{\$15{,}000}{\$7{,}000} = 2.14\) years.`,
          R`B: running total \(-18{,}000 \to -6{,}000 \to -4{,}000 \to -2{,}000 \to 0\). It is recovered at the end of year 4.`,
          R`The 9.5% is not needed: payback ignores the time value of money.`,
        ],
        why: R`A pays back in 2.14 years and B in 4 years. Both are above the 2-year cut-off, so he takes neither.` },
      { id: 'w4-q13', topic: 'payback', kind: 'num', level: 2, section: 'B', src: 'Mock MST Q06', formula: 'payback',
        q: R`Barcode Biz spends $1,450,000 on new machinery. It expects cash flows of $640,000, $715,250, $823,330 and $907,125 over the next four years. What is the **payback period**?`,
        table: cfTable([BARCODE], ['Cash flow']),
        answer: FIN.payback(BARCODE), unit: 'yrs', dp: 2,
        mistakes: [
          { v: 3, why: 'Count only the fraction of year 3 that is needed, not the whole year.' },
          { v: 3 + 94750 / 823330, why: 'Only 2 full years pass before recovery. Start from 2, not 3.' },
          { v: 1450000 / (sum(BARCODE.slice(1)) / 4), why: 'Cost ÷ average cash flow only works when the cash flows are equal.' },
        ],
        steps: [
          R`After year 1: \(1{,}450{,}000 - 640{,}000 = \$810{,}000\) is still to recover.`,
          R`After year 2: \(810{,}000 - 715{,}250 = \$94{,}750\) is still to recover.`,
          R`\[\text{Payback} = 2 + \frac{\$94{,}750}{\$823{,}330} = ${L.num(FIN.payback(BARCODE), 4)} \approx 2.12 \text{ years}\]`,
        ],
        why: R`Two full years, plus \(\frac{94{,}750}{823{,}330}\) of year 3. (The official solution has a typo, 712,250 instead of 715,250, but still rounds to 2.12.)` },

      /* ----- NPV ----- */
      { id: 'w4-q14', topic: 'npv', kind: 'mcq', level: 1, section: 'A', formula: 'npv',
        q: R`What is the **NPV decision rule** for an independent project?`,
        choices: [R`Accept if \(NPV > 0\)`, R`Accept if \(NPV > k\)`, R`Accept if \(NPV < 0\)`, 'Accept if the NPV is larger than the initial investment'], answer: 0,
        why: R`A positive NPV means the cash flows are worth more than they cost, after discounting at \(k\). The project adds wealth.` },
      { id: 'w4-q15', topic: 'npv', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W4',
        q: R`Why does a positive NPV mean a project is good for shareholders?`,
        choices: ['NPV = PV of benefits − PV of costs, which is the net gain in shareholder wealth', 'NPV equals the project’s accounting profit', 'NPV shows how quickly the cost is recovered', 'NPV is the rate of return the project earns'], answer: 0,
        why: R`NPV measures the value created in today’s dollars. That links directly to the goal of maximising shareholder wealth.` },
      { id: 'w4-q16', topic: 'npv', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W4',
        q: R`Which of these is a **disadvantage** of the NPV method?`,
        choices: ['It relies on accurate estimates of the cash flows and the discount rate', 'It ignores cash flows after the payback period', 'It uses accounting earnings instead of cash flows', 'It ignores the time value of money'], answer: 0,
        why: R`NPV uses all the cash flows and discounts them properly. Its weakness is its inputs: bad estimates give a bad NPV.` },
      { id: 'w4-q17', topic: 'npv', kind: 'mcq', level: 2, section: 'A', src: 'MST 2026 Q9',
        q: R`A project costs $1 million today. It returns a total of $1.2 million, spread evenly over the next 15 years. A manager says: “It returns more than it costs, so it creates value.” What is the best reply?`,
        choices: ['Not necessarily: value depends on the present value of the cash flows, not their total', 'Correct: any project that returns more than it costs creates value', 'Wrong: any project that lasts 15 years destroys value', 'Correct, as long as the payback period is under 15 years'], answer: 0,
        why: R`Dollars that arrive years from now are worth less today. At 10%, $80,000 a year for 15 years is worth only \(${L.money(FIN.pvAnnuity(80000, 0.1, 15))}\), less than the $1 million cost.` },
      { id: 'w4-q18', topic: 'npv', kind: 'num', level: 1, section: 'B', src: 'Lecture W4 Example 1', formula: 'npv',
        q: R`The cost of capital is 10%. What is the **NPV** of Project L?`,
        table: cfTable([EX_L], ['Project L']),
        answer: FIN.npv(0.1, EX_L), unit: '$', dp: 2,
        mistakes: [
          { v: sum(EX_L), why: 'That just adds the cash flows. Discount each one first.' },
          { v: FIN.npv(0.1, EX_L) + 100, why: 'That is only the PV of the inflows. Subtract the $100 cost paid today.' },
          { v: FIN.npv(0.1, EX_L) / 1.1, why: 'That discounts every cash flow one year too many. The $100 is paid today, at t = 0.' },
        ],
        steps: npvSteps(EX_L, 0.1),
        calc: npvKeys(EX_L, 0.1),
        why: R`Discount the three inflows to today and subtract the $100 outlay. \(NPV > 0\), so L adds value.` },
      { id: 'w4-q19', topic: 'npv', kind: 'num', level: 1, section: 'B', src: 'Lecture W4 Example 1', formula: 'npv',
        q: R`The cost of capital is 10%. What is the **NPV** of Project S?`,
        table: cfTable([EX_S], ['Project S']),
        answer: FIN.npv(0.1, EX_S), unit: '$', dp: 2,
        mistakes: [
          { v: sum(EX_S), why: 'That just adds the cash flows. Discount each one first.' },
          { v: FIN.npv(0.1, EX_S) + 100, why: 'That is only the PV of the inflows. Subtract the $100 cost.' },
          { v: FIN.npv(0.1, EX_L), why: 'That is Project L’s NPV.' },
        ],
        steps: npvSteps(EX_S, 0.1),
        calc: npvKeys(EX_S, 0.1),
        why: R`\(NPV_S = \$19.98\). One lecture slide shows $19.99 because it adds rounded PVs. If S and L are mutually exclusive, choose S: its NPV is higher than L’s $18.78.` },
      { id: 'w4-q20', topic: 'npv', kind: 'num', level: 2, section: 'B', src: 'Tutorial W4 Q2', formula: 'pv-perp',
        q: R`Burke Inc. can buy Small Ltd for $190,000. The deal adds $30,000 of cash flow a year, forever, starting next year. Burke’s cost of capital is 15%. What is the **NPV** of the acquisition?`,
        answer: -190000 + 30000 / 0.15, unit: '$', dp: 2,
        mistakes: [
          { v: 30000 / 0.15, why: 'That is only the PV of the inflows. Subtract the $190,000 price.' },
          { v: -190000 + 30000 / 0.15 / 1.15, why: 'The perpetuity formula already gives the value at t = 0, one period before the first cash flow. Do not discount again.' },
          { v: -190000 + (30000 * 1.15) / 0.15, why: 'The first cash flow arrives in one year. Do not compound it.' },
        ],
        steps: [R`The inflows are a perpetuity starting at \(t = 1\): \[PV = \frac{C}{r} = \frac{\$30{,}000}{0.15} = \$200{,}000\]`, R`\[NPV = -\$190{,}000 + \$200{,}000 = \$10{,}000\]`],
        why: R`\(NPV > 0\), so Burke should go ahead with the acquisition.` },
      { id: 'w4-q21', topic: 'npv', kind: 'num', level: 2, section: 'B', src: 'MST 2026 Q19', formula: 'npv',
        q: R`A project costs $2,000,000 today. It returns $550,000 at the end of each of the next 5 years. The discount rate is 8%. What is the **NPV**?`,
        tl: { cfs: [-2000000, 550000, 550000, 550000, 550000, 550000], unit: 'Year' },
        answer: -2e6 + FIN.pvAnnuity(550000, 0.08, 5), unit: '$', dp: 2,
        mistakes: [
          { v: -2e6 + 5 * 550000, why: 'That ignores discounting.' },
          { v: FIN.pvAnnuity(550000, 0.08, 5), why: 'That is only the PV of the inflows. Subtract the $2,000,000 cost.' },
          { v: -2e6 + FIN.pvAnnuityDue(550000, 0.08, 5), why: 'That treats the inflows as an annuity due. They arrive at the end of each year.' },
        ],
        steps: [R`\[NPV = -C_0 + C \times \frac{1}{k}\left(1 - \frac{1}{(1+k)^{n}}\right)\]`, R`\[NPV = -\$2{,}000{,}000 + ${annuityPV(550000, 0.08, 5)} = -\$2{,}000{,}000 + ${L.money(FIN.pvAnnuity(550000, 0.08, 5))} = ${L.money(-2e6 + FIN.pvAnnuity(550000, 0.08, 5))}\]`],
        calc: npvKeys([-2000000, 550000, 550000, 550000, 550000, 550000], 0.08),
        why: R`The five equal inflows are an ordinary annuity. Their PV is bigger than the cost, so the NPV is positive.` },
      { id: 'w4-q22', topic: 'npv', kind: 'num', level: 3, section: 'B', src: 'MST 2026 Q12', formula: 'npv', boss: true,
        q: R`A project needs $80,000 today and another $40,000 in one year. It returns $30,000 at the end of each year for 8 years. The discount rate is 6%. What is the **NPV**?`,
        tl: { n: 8, at: { 0: '−$80,000', 1: '$30,000 − $40,000', 2: '$30,000', 3: '$30,000', 4: '$30,000', 5: '$30,000', 6: '$30,000', 7: '$30,000', 8: '$30,000' }, unit: 'Year' },
        answer: -80000 - 40000 / 1.06 + FIN.pvAnnuity(30000, 0.06, 8), unit: '$', dp: 2,
        mistakes: [
          { v: -120000 + FIN.pvAnnuity(30000, 0.06, 8), why: 'The second $40,000 is paid in one year, so discount it.' },
          { v: -80000 - 40000 / 1.06 + FIN.pvAnnuity(30000, 0.06, 8) / 1.06, why: 'The inflows start at the end of year 1, not year 2.' },
          { v: -80000 + FIN.pvAnnuity(30000, 0.06, 8), why: 'Do not forget the second investment of $40,000.' },
        ],
        steps: [
          R`Investment in today’s dollars: \[\$80{,}000 + \frac{\$40{,}000}{1.06} = \$80{,}000 + ${L.money(40000 / 1.06)} = ${L.money(80000 + 40000 / 1.06)}\]`,
          R`PV of the inflows (ordinary annuity): \[${annuityPV(30000, 0.06, 8)} = ${L.money(FIN.pvAnnuity(30000, 0.06, 8))}\]`,
          R`\[NPV = ${L.money(FIN.pvAnnuity(30000, 0.06, 8))} - ${L.money(80000 + 40000 / 1.06)} = ${L.money(-80000 - 40000 / 1.06 + FIN.pvAnnuity(30000, 0.06, 8))}\]`,
        ],
        calc: npvKeys([-80000, -10000, 30000, 30000, 30000, 30000, 30000, 30000, 30000], 0.06),
        why: R`Bring every cash flow to \(t = 0\). At \(t = 1\) the net cash flow is \(30{,}000 - 40{,}000 = -\$10{,}000\).` },
      { id: 'w4-q23', topic: 'npv', kind: 'num', level: 1, section: 'B', src: 'Mock MST Q18', formula: 'pv-annuity',
        q: R`A project’s cash **inflows** are $25,000 a year for four years, starting in one year. The cost of capital is 9%. What is the **most** that should be invested at time zero?`,
        answer: FIN.pvAnnuity(25000, 0.09, 4), unit: '$', dp: 2,
        mistakes: [
          { v: 100000, why: 'That ignores discounting.' },
          { v: FIN.pvAnnuityDue(25000, 0.09, 4), why: 'The inflows start in one year, so this is an ordinary annuity, not an annuity due.' },
          { v: FIN.pvAnnuity(25000, 0.09, 3), why: 'There are four inflows, not three.' },
        ],
        steps: [R`The most you can pay is the outlay that makes \(NPV = 0\), which is the PV of the inflows.`, R`\[PV = ${annuityPV(25000, 0.09, 4)} = ${L.money(FIN.pvAnnuity(25000, 0.09, 4))}\]`],
        calc: `${cfKeys([0, 25000, 25000, 25000, 25000])} · 9 [I/YR] · [NPV] → ${T.money(FIN.pvAnnuity(25000, 0.09, 4))}`,
        why: R`Pay more than the PV of the inflows and the NPV turns negative.` },
      { id: 'w4-q24', topic: 'npv', kind: 'num', level: 3, section: 'B', src: 'Tutorial W4 Q7', formula: 'pv-grow-perp', boss: true,
        q: R`Chloe gets an $11 million advance today to write a book. Writing takes a year. She gives up $8 million of TV income, paid at \(t = 1\). Royalties start at $5 million at \(t = 1\), then **fall by 40% a year** forever. Her cost of capital is 10%. What is the **NPV** of the book deal?`,
        answer: 11 - 8 / 1.1 + 5 / (0.1 + 0.4), unit: '$m', dp: 3,
        mistakes: [
          { v: 11 + 5 / 0.5, why: 'The $8 million of lost TV income is an opportunity cost. Include it.' },
          { v: 11 - 8 + 5 / 0.5, why: 'The lost TV income is paid at t = 1, so discount it.' },
          { v: 11 - 8 / 1.1 + 5 / (0.1 - 0.4), why: 'The royalties shrink, so g = −40% and r − g = 0.10 + 0.40 = 0.50.' },
          { v: 11 - 8 / 1.1 + 5 / 0.1, why: 'The royalties fall by 40% a year. Use a growing perpetuity with g = −40%.' },
        ],
        steps: [
          R`Advance at \(t = 0\): \(+\$11\text{m}\).`,
          R`Lost TV income (opportunity cost) at \(t = 1\): \(-\frac{\$8\text{m}}{1.10} = -${L.moneyT(8 / 1.1, 3)}\text{m}\).`,
          R`Royalties are a growing perpetuity with \(g = -40\%\): \[PV = \frac{C_1}{r - g} = \frac{\$5\text{m}}{0.10 - (-0.40)} = \$10\text{m}\]`,
          R`\[NPV = 11 - ${L.numT(8 / 1.1, 3)} + 10 = ${L.moneyT(11 - 8 / 1.1 + 10, 3)}\text{m}\]`,
        ],
        why: R`Count the cash in (advance, royalties) and the cash given up (TV income), each at its own date.` },
      { id: 'w4-q25', topic: 'npv', kind: 'mcq', level: 2, section: 'A', src: 'Tutorial W4 Q3',
        q: R`A property project costs $20 million. At a 23% discount rate its NPV is −$6.53 million. Its IRR is 14.29%. What happens at a **10%** discount rate?`,
        choices: ['The NPV becomes positive, so the decision changes to accept', 'The NPV stays negative, so it is still rejected', 'The IRR falls to 10%, so the project breaks even', 'Nothing: the discount rate does not affect NPV'], answer: 0,
        why: R`10% is below the 14.29% IRR, so the NPV must be positive: \(NPV_{10\%} = ${L.money(FIN.npv(0.1, Q3CF))}\). Discount rates are estimates, and a different rate can flip the decision.` },
      { id: 'w4-q26', topic: 'npv', kind: 'num', level: 2, section: 'B', src: 'Tutorial W4 Q3', formula: 'npv',
        q: R`A property project costs $20 million today ($15m for land, a $4m council fee and $1m to lease equipment). Its cash flows are below. What is the **NPV at 10%**?`,
        table: { head: ['Year', 'Cash flow'], rows: [[0, '−$20,000,000'], [1, '$1,500,000'], [2, '$3,278,000'], [3, '$5,000,000'], [4, '$6,450,000'], ['5 to 20', '$2,500,000 each year']] },
        answer: FIN.npv(0.1, Q3CF), unit: '$', dp: 2,
        mistakes: [
          { v: FIN.npv(0.23, Q3CF), why: 'That is the NPV at 23%. Use 10%.' },
          { v: FIN.npv(0.1, Q3CF) + 20e6, why: 'That is only the PV of the inflows. Subtract the $20 million cost.' },
          { v: sum(Q3CF), why: 'That ignores discounting.' },
        ],
        steps: [R`Enter the first four cash flows one by one, then $2,500,000 sixteen times (years 5 to 20).`, R`\[NPV_{10\%} = ${L.money(FIN.npv(0.1, Q3CF))} > 0\]`, R`At 23% the same cash flows give \(NPV = ${L.money(FIN.npv(0.23, Q3CF))}\), and the IRR is \(${L.pct(FIN.irr(Q3CF))}\).`],
        calc: npvKeys(Q3CF, 0.1),
        why: R`At 10% the project is accepted; at 23% it is rejected. The IRR of 14.29% sits between the two rates.` },
      { id: 'w4-q27', topic: 'npv', kind: 'num', level: 2, section: 'B', src: 'Mock MST Q08', formula: 'npv',
        q: R`Harvest Co.’s cost of capital is 5%. What is the **NPV of Project X**? (Cash flows are in $ millions.)`,
        table: HARVEST,
        answer: FIN.npv(0.05, HX), unit: '$m', dp: 2,
        mistakes: [
          { v: sum(HX), why: 'That ignores discounting.' },
          { v: FIN.npv(0.05, HX) + 45, why: 'That is only the PV of the inflows. Subtract the $45m outlay.' },
          { v: FIN.npv(0.05, HY), why: 'That is Project Y’s NPV.' },
        ],
        steps: npvSteps(HX, 0.05),
        calc: npvKeys(HX, 0.05),
        why: R`\(NPV_X = \$51.43\text{m}\) and \(NPV_Y = \$73.90\text{m}\). Clear the cash-flow memory between projects!` },
      { id: 'w4-q28', topic: 'npv', kind: 'mcq', level: 2, section: 'A', src: 'Mock MST Q08–09',
        q: R`Harvest Co. (\(k = 5\%\)) must choose **one** project. \(NPV_X = \$51.43\text{m}\) and \(IRR_X = 42.78\%\). \(NPV_Y = \$73.90\text{m}\) and \(IRR_Y = 29.19\%\). Which should it choose?`,
        table: HARVEST,
        choices: ['Project Y: it has the higher NPV', 'Project X: it has the higher IRR', 'Both: they both have positive NPVs', 'Neither: NPV and IRR disagree'], answer: 0,
        why: R`For mutually exclusive projects, pick the higher NPV. Y adds $22.47m more wealth. Y is bigger, so its IRR is lower: a scale difference.` },

      /* ----- IRR ----- */
      { id: 'w4-q29', topic: 'irr', kind: 'mcq', level: 1, section: 'A', formula: 'irr',
        q: R`What is the **internal rate of return (IRR)**?`,
        choices: ['The discount rate that makes the NPV equal to zero', 'The firm’s cost of capital', 'The discount rate at which the NPV is largest', 'The average yearly accounting return'], answer: 0,
        why: R`The IRR solves \(\sum_{t=0}^{n} \frac{NCF_t}{(1+IRR)^{t}} = 0\). At the IRR, the PV of the inflows equals the cost.` },
      { id: 'w4-q30', topic: 'irr', kind: 'mcq', level: 1, section: 'A', formula: 'irr',
        q: R`For a conventional project, what is the **IRR decision rule**?`,
        choices: [R`Accept if \(IRR > k\)`, R`Accept if \(IRR < k\)`, R`Accept if \(IRR > 0\)`, R`Accept if the IRR is above the NPV`], answer: 0,
        why: R`If the project earns more than the cost of capital \(k\), there is return left over for shareholders.` },
      { id: 'w4-q31', topic: 'irr', kind: 'mcq', level: 2, section: 'A', src: 'Tutorial W4 concept check 3',
        q: R`Which statement is **false**?`,
        choices: ['Because the IRR is the rate where NPV = 0, the IRR rule always identifies the correct decision', 'The IRR rule says to reject any project whose IRR is below the cost of capital', 'For a standalone (independent) project, the NPV and IRR rules usually agree', 'Some projects have more than one IRR'], answer: 0,
        why: R`The IRR rule can mislead: mutually exclusive projects, several sign changes, borrowing-type cash flows, or no IRR at all. NPV is the safe rule.` },
      { id: 'w4-q32', topic: 'irr', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W4',
        q: R`What does each method assume about **reinvesting** the project’s cash flows?`,
        choices: ['NPV assumes reinvestment at the cost of capital; IRR assumes reinvestment at the IRR', 'Both assume reinvestment at the cost of capital', 'NPV assumes reinvestment at the IRR; IRR assumes reinvestment at the cost of capital', 'Neither method makes a reinvestment assumption'], answer: 0,
        why: R`Reinvesting at the cost of capital \(k\) is more realistic. That is one reason NPV is the better method.` },
      { id: 'w4-q33', topic: 'irr', kind: 'num', level: 2, section: 'B', src: 'Lecture W4 Example 1', formula: 'irr',
        q: R`What is the **IRR** of Project S?`,
        table: cfTable([EX_S], ['Project S']),
        answer: P(FIN.irr(EX_S)), unit: '%', dp: 2,
        mistakes: [
          { v: 10, why: 'That is the cost of capital, the hurdle the IRR is compared with.' },
          { v: P(FIN.irr(EX_L)), why: 'That is Project L’s IRR.' },
          { v: P((sum(EX_S.slice(1)) / 100 - 1) / 3), why: 'That is a simple average return. The IRR must discount each cash flow.' },
        ],
        steps: [
          R`Find the rate that makes the NPV zero: \[0 = -100 + \frac{70}{1+IRR} + \frac{50}{(1+IRR)^{2}} + \frac{20}{(1+IRR)^{3}}\]`,
          R`By calculator (or trial and error): \(IRR_S = ${L.pct(FIN.irr(EX_S))}\).`,
          R`Check: \(\frac{70}{${L.num(1 + FIN.irr(EX_S), 4)}} + \frac{50}{${L.num(1 + FIN.irr(EX_S), 4)}^{2}} + \frac{20}{${L.num(1 + FIN.irr(EX_S), 4)}^{3}} = 100\).`,
        ],
        calc: irrKeys(EX_S, FIN.irr(EX_S)),
        why: R`\(IRR_S = 23.56\%\) and \(IRR_L = 18.13\%\). Both beat \(k = 10\%\), so both are acceptable if independent.` },
      { id: 'w4-q34', topic: 'irr', kind: 'num', level: 2, section: 'B', src: 'Mock MST Q09', formula: 'irr',
        q: R`What is the **IRR of Project X** (Harvest Co.)?`,
        table: HARVEST,
        answer: P(FIN.irr(HX)), unit: '%', dp: 2,
        mistakes: [
          { v: P(FIN.irr(HY)), why: 'That is Project Y’s IRR.' },
          { v: 5, why: 'That is the cost of capital, not the IRR.' },
          { v: P((sum(HX.slice(1)) / 45 - 1) / 4), why: 'That is a simple average return. The IRR must discount each cash flow.' },
        ],
        steps: [R`\[0 = -45 + \frac{20}{1+IRR} + \frac{25}{(1+IRR)^{2}} + \frac{30}{(1+IRR)^{3}} + \frac{35}{(1+IRR)^{4}}\]`, R`By calculator: \(IRR_X = ${L.pct(FIN.irr(HX))}\). For Y: \(IRR_Y = ${L.pct(FIN.irr(HY))}\).`],
        calc: irrKeys(HX, FIN.irr(HX)),
        why: R`X has the higher IRR (42.78% vs 29.19%), but Y has the higher NPV at 5%. For a choice between them, NPV wins.` },

      /* ----- NPV profiles and crossover ----- */
      { id: 'w4-q35', topic: 'profile', kind: 'mcq', level: 1, section: 'A', src: 'Tutorial W4 concept check 2',
        q: R`What does an **NPV profile** graph?`,
        chart: { type: 'npv', projects: [{ name: 'Project L', cfs: EX_L }], rMax: 0.25 },
        choices: ['The project’s NPV over a range of discount rates', 'The project’s IRR over a range of discount rates', 'The project’s cash flows over a range of NPVs', 'The project’s IRR over a range of NPVs'], answer: 0,
        why: R`NPV is on the y-axis and the discount rate is on the x-axis. It shows how sensitive the NPV is to the rate.` },
      { id: 'w4-q36', topic: 'profile', kind: 'mcq', level: 1, section: 'A', src: 'Tutorial W4 Q6',
        q: R`Where does an NPV profile cross the **y-axis**?`,
        choices: ['At the sum of all the undiscounted cash flows (the NPV at 0%)', 'At the IRR', 'At the initial investment', 'At the NPV at the cost of capital'], answer: 0,
        why: R`At a 0% rate nothing is discounted, so the NPV is the plain sum of the cash flows. For Project L: \(-100 + 10 + 60 + 80 = \$50\).` },
      { id: 'w4-q37', topic: 'profile', kind: 'mcq', level: 1, section: 'A', src: 'Tutorial W4 Q6',
        q: R`Where does an NPV profile cross the **x-axis**?`,
        choices: ['At the IRR, where NPV = 0', 'At the cost of capital', 'At the crossover rate', 'At a 0% discount rate'], answer: 0,
        why: R`On the x-axis the NPV is zero, and that is the definition of the IRR. Careful: the x-axis itself shows discount rates, not IRRs.` },
      { id: 'w4-q38', topic: 'profile', kind: 'mcq', level: 2, section: 'A', src: 'Mock MST Q07',
        q: R`Projects D and R cost the same and last 4 years. D’s cash flows **decline** over time. R’s cash flows **rise**. The chart shows their NPV profiles. Which curve is R, and what is R’s approximate IRR?`,
        chart: { type: 'npv', projects: [{ name: 'Curve 1', cfs: MOCK7_D }, { name: 'Curve 2', cfs: MOCK7_R }], rMax: 0.25 },
        choices: ['Curve 2, IRR about 15%', 'Curve 1, IRR about 20%', 'Curve 2, IRR about 8%', 'Curve 1, IRR about 15%'], answer: 0,
        wrong: { 1: 'Curve 1 is flatter: that is the declining project D.', 2: 'About 8% is where the curves cross (the crossover rate), not an IRR.' },
        why: R`Rising cash flows arrive later, so they are divided by bigger powers of \((1+r)\). R’s NPV reacts more to the rate: its profile is **steeper** (Curve 2). It cuts the x-axis at about \(${L.pct(FIN.irr(MOCK7_R), 1)}\).` },
      { id: 'w4-q39', topic: 'profile', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W4', formula: 'crossover',
        q: R`What is the **crossover rate** of two projects?`,
        choices: ['The discount rate at which their NPVs are equal; it is the IRR of their incremental cash flows', 'The average of the two projects’ IRRs', 'The discount rate at which both NPVs are zero', 'The difference between the two IRRs'], answer: 0,
        why: R`Subtract one project’s cash flows from the other’s, year by year. The IRR of those differences is the crossover rate. At that rate you are indifferent.` },
      { id: 'w4-q40', topic: 'profile', kind: 'num', level: 2, section: 'B', src: 'Lecture W4', formula: 'crossover',
        q: R`Projects L and S are mutually exclusive. What is their **crossover rate**?`,
        table: LS_TABLE,
        answer: P(FIN.crossover(EX_L, EX_S)), unit: '%', dp: 2,
        mistakes: [
          { v: P(FIN.irr(EX_L)), why: 'That is the IRR of L alone.' },
          { v: P(FIN.irr(EX_S)), why: 'That is the IRR of S alone.' },
          { v: P(FIN.irr(EX_S) - FIN.irr(EX_L)), why: 'The crossover is not the gap between the IRRs. Find the IRR of the differences.' },
        ],
        steps: [R`Incremental cash flows \(L - S\): \(0,\; -60,\; +10,\; +60\).`, R`Find the IRR of the differences: \[0 = \frac{-60}{1+r} + \frac{10}{(1+r)^{2}} + \frac{60}{(1+r)^{3}} \;\Rightarrow\; r = ${L.pct(FIN.crossover(EX_L, EX_S))}\]`, R`Check: at 8.68%, \(NPV_L = NPV_S = ${L.money(FIN.npv(FIN.crossover(EX_L, EX_S), EX_L))}\).`],
        calc: irrKeys([0, -60, 10, 60], FIN.crossover(EX_L, EX_S)),
        chart: { type: 'npv', projects: [{ name: 'Project L', cfs: EX_L }, { name: 'Project S', cfs: EX_S }], rMax: 0.25 },
        why: R`At 8.68% both projects have the same NPV. Below it L wins on NPV; above it S wins.` },
      { id: 'w4-q41', topic: 'profile', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W4',
        q: R`For Projects L and S the crossover rate is 8.68%. \(IRR_L = 18.13\%\) and \(IRR_S = 23.56\%\). When do the NPV and IRR rules **conflict**?`,
        choices: ['When the cost of capital is below 8.68%', 'When the cost of capital is above 8.68%', 'When the cost of capital is above 23.56%', 'They never conflict'], answer: 0,
        why: R`Below 8.68%, L has the higher NPV but S has the higher IRR: a conflict. Above 8.68%, S wins on both. When they conflict, follow NPV.` },
      { id: 'w4-q42', topic: 'profile', kind: 'mcq', level: 2, section: 'A', src: 'Mock MST Q20',
        q: R`Two mutually exclusive projects have NPV profiles that cross. When should the project with the **lower IRR** be chosen?`,
        choices: ['Whenever the cost of capital is below the crossover rate', 'Whenever the cost of capital is above the crossover rate', 'Never: always choose the higher IRR', 'Only when both NPVs are negative'], answer: 0,
        why: R`Left of the crossover (low \(k\)), the lower-IRR project has the higher NPV. NPV is the rule to follow.` },
      { id: 'w4-q43', topic: 'profile', kind: 'mcq', level: 3, section: 'A', src: 'Mock MST Q23',
        q: R`Which statement is **false**?`,
        choices: ['If Project X has a higher IRR than mutually exclusive Project Y, the firm will choose X whenever X has a positive NPV', 'NPV profiles can cross because of differences in scale or timing', 'At the crossover rate the two projects have equal NPVs', 'When the IRR and NPV rules conflict, the firm should follow NPV'], answer: 0,
        why: R`It depends on the cost of capital. Below the crossover rate, Y can have the higher NPV even though X has the higher IRR. Then the firm should choose Y.` },
      { id: 'w4-q44', topic: 'profile', kind: 'num', level: 2, section: 'B', src: 'MST 2026 Q20', formula: 'crossover',
        q: R`Projects M and N are mutually exclusive. What is their **crossover rate**?`,
        table: cfTable([MN_M, MN_N], ['Project M', 'Project N']),
        answer: P(FIN.crossover(MN_M, MN_N)), unit: '%', dp: 2,
        mistakes: [
          { v: P(FIN.irr(MN_M)), why: 'That is the IRR of M alone.' },
          { v: P(FIN.irr(MN_N)), why: 'That is the IRR of N alone.' },
          { v: P(FIN.irr(MN_M) - FIN.irr(MN_N)), why: 'The crossover is not the gap between the IRRs. Find the IRR of the differences.' },
        ],
        steps: [R`Incremental cash flows \(M - N\): \(0,\; +400,\; -500\).`, R`\[\frac{400}{1+r} = \frac{500}{(1+r)^{2}} \;\Rightarrow\; 1 + r = \frac{500}{400} = 1.25 \;\Rightarrow\; r = 25\%\]`],
        calc: irrKeys([0, 400, -500], 0.25),
        why: R`At 25% the two NPVs are equal. Below 25%, N has the higher NPV (even though M has the higher IRR).` },
      { id: 'w4-q45', topic: 'profile', kind: 'num', level: 3, section: 'B', src: 'Tutorial W4 Q6', formula: 'crossover', boss: true,
        q: R`Taylor Made Inc. must choose between two projects. What is the **crossover rate**?`,
        table: cfTable([TM1, TM2], ['Project 1', 'Project 2']),
        answer: P(FIN.irrAll(TM_D)[0]), unit: '%', dp: 2,
        mistakes: [
          { v: P(FIN.irr(TM1)), why: 'That is the IRR of Project 1 alone.' },
          { v: P(FIN.irr(TM2)), why: 'That is the IRR of Project 2 alone.' },
          { v: P(FIN.irr(TM2) - FIN.irr(TM1)), why: 'The crossover is not the gap between the IRRs. Find the IRR of the differences.' },
        ],
        steps: [
          R`Incremental cash flows (1 − 2): ${TM_D.map((d) => R`\(${L.moneyT(d)}\)`).join(', ')}.`,
          R`IRR of the differences: \(${L.pct(FIN.irrAll(TM_D)[0])}\).`,
          R`The differences change sign twice, so a second crossover exists at about \(${L.pct(FIN.irrAll(TM_D)[1], 0)}\). No real cost of capital is that high, so ignore it.`,
        ],
        calc: irrKeys(TM_D, FIN.irrAll(TM_D)[0]),
        chart: { type: 'npv', projects: [{ name: 'Project 1', cfs: TM1 }, { name: 'Project 2', cfs: TM2 }], rMax: 0.3 },
        why: R`Project 1 is preferred for any cost of capital below 20.02%. Above it (up to its IRR), Project 2 has the higher NPV.` },
      { id: 'w4-q46', topic: 'profile', kind: 'mcq', level: 2, section: 'B', src: 'Tutorial W4 Q6',
        q: R`Taylor Made’s cost of capital is 10%. \(NPV_1 = \$462{,}187.32\) and \(NPV_2 = \$288{,}044.10\). \(IRR_1 = 24.08\%\) and \(IRR_2 = 27.45\%\). Which project should it choose?`,
        choices: ['Project 1: it has the higher NPV', 'Project 2: it has the higher IRR', 'Both: they are both profitable', 'Neither: the two rules disagree'], answer: 0,
        why: R`They are mutually exclusive, so pick the higher NPV. At 10% we are below the 20.02% crossover rate, which is exactly where the IRR rule points the wrong way.` },

      /* ----- IRR pitfalls ----- */
      { id: 'w4-q47', topic: 'pitfalls', kind: 'mcq', level: 2, section: 'A', src: 'MST 2026 Q10',
        q: R`A mine costs $10m today, earns $25m next year, then needs $15m of clean-up in year 2. What is the main problem with using the IRR here?`,
        tl: { cfs: ['−$10m', '+$25m', '−$15m'], unit: 'Year' },
        choices: ['The sign changes twice, so there can be two IRRs (here 0% and 50%)', 'There is no problem: the IRR is unique', 'The IRR cannot be used for projects shorter than 3 years', 'The IRR ignores the clean-up cost'], answer: 0,
        why: R`Each sign change can create another IRR. Here NPV = 0 at both 0% and 50%. Use NPV instead: at 10%, \(NPV = -10 + \frac{25}{1.1} - \frac{15}{1.1^{2}} = ${L.moneyT(FIN.npv(0.1, [-10, 25, -15]), 2)}\text{m}\).` },
      { id: 'w4-q48', topic: 'pitfalls', kind: 'mcq', level: 3, section: 'A', src: 'Lecture W4 Example 2',
        q: R`This project has four IRRs: 25%, 33.33%, 42.86% and 66.67%. Its NPV is negative at 0%. At which cost of capital is it **acceptable**?`,
        table: cfTable([FOUR], ['Cash flow']),
        choices: ['30%', '15%', '40%', '70%'], answer: 0,
        why: R`The NPV changes sign at each IRR. It is negative below 25%, positive from 25% to 33.33%, negative to 42.86%, positive to 66.67%, then negative again. Only 30% is in an accept band.` },
      { id: 'w4-q49', topic: 'pitfalls', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W4 Pitfall 3',
        q: R`Project Lend: −$1,000 today, +$1,500 in a year. Project Borrow: +$1,000 today, −$1,500 in a year. Both have an IRR of 50%. The cost of capital is 10%. Which statement is true?`,
        choices: ['Lend has NPV +$363.64 and should be taken; Borrow has NPV −$363.64 and should not', 'Both are equally good, because their IRRs are equal', 'Both should be taken, because 50% is above 10%', 'Borrow is better, because you receive the cash first'], answer: 0,
        why: R`For borrowing, the IRR is the rate you **pay**. Paying 50% when money costs 10% destroys value: \(NPV_{Borrow} = 1{,}000 - \frac{1{,}500}{1.1} = -\$363.64\).` },
      { id: 'w4-q50', topic: 'pitfalls', kind: 'tf', level: 2, section: 'A', src: 'Lecture W4 Pitfall 4',
        q: R`A project has cash flows of +$1,000, −$3,000 and +$2,500 in years 0, 1 and 2. It has **no IRR**, yet its NPV at 10% is positive.`,
        answer: true,
        why: R`This NPV is positive at every discount rate, so it never crosses zero: no IRR exists. At 10%, \(NPV = 1{,}000 - \frac{3{,}000}{1.1} + \frac{2{,}500}{1.1^{2}} = ${L.money(FIN.npv(0.1, [1000, -3000, 2500]))}\).` },
      { id: 'w4-q51', topic: 'pitfalls', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W4',
        q: R`Why can the NPV profiles of two mutually exclusive projects **cross**?`,
        choices: ['Differences in size (scale) or in the timing of their cash flows', 'Differences in their payback cut-offs', 'Because one project is independent', 'Because the cost of capital is the same for both'], answer: 0,
        why: R`A smaller project frees up money today, and a faster project returns cash sooner. Both matter more when rates are high, so high rates favour them.` },
      { id: 'w4-q52', topic: 'pitfalls', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W4',
        q: R`NPV and IRR disagree on two mutually exclusive projects. Which rule should you follow?`,
        choices: ['NPV, because it measures the wealth added', 'IRR, because percentages are easier to compare', 'Payback, because it breaks the tie', 'Whichever favours the shorter project'], answer: 0,
        why: R`NPV is always preferred. It measures the extra wealth in dollars and assumes a realistic reinvestment rate. Cash is king.` },
      { id: 'w4-q53', topic: 'pitfalls', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W4',
        q: R`The cost of capital is **high**. Which of two mutually exclusive projects does this tend to favour?`,
        choices: ['The one that returns its cash sooner', 'The one with later, bigger cash flows', 'The larger project', 'Neither: the rate does not matter'], answer: 0,
        why: R`High rates shrink distant cash flows the most. Early cash can be reinvested sooner, so fast-payback (and smaller) projects look better when \(k\) is high.` },

      /* ----- capital rationing and PI ----- */
      { id: 'w4-q54', topic: 'pi', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W4',
        q: R`What is **hard** capital rationing?`,
        choices: ['The firm cannot raise the money to fund all its positive-NPV projects', 'Top management sets a spending limit that it can relax at any time', 'The firm only accepts projects that pay back within 3 years', 'The firm rejects any project whose IRR is below its cost of capital'], answer: 0,
        why: R`Hard rationing comes from outside, e.g. the bank. It can force the firm to pass up positive-NPV projects. **Soft** rationing is set internally and can be relaxed.` },
      { id: 'w4-q55', topic: 'pi', kind: 'mcq', level: 1, section: 'A', formula: 'pi',
        q: R`How does BFC2140 define the **profitability index (PI)**?`,
        choices: [R`\(PI = \frac{NPV}{\text{Initial investment}}\); accept if \(PI > 0\)`, R`\(PI = \frac{PV \text{ of inflows}}{\text{Initial investment}}\); accept if \(PI > 0\)`, R`\(PI = \frac{\text{Initial investment}}{NPV}\); accept if \(PI > 1\)`, R`\(PI = \frac{NPV}{PV \text{ of inflows}}\); accept if \(PI > 1\)`], answer: 0,
        why: R`PI is the value created per dollar of resource consumed. Some textbooks use PV ÷ cost with a cut-off of 1. This unit uses NPV ÷ investment with a cut-off of 0.` },
      { id: 'w4-q56', topic: 'pi', kind: 'mcq', level: 2, section: 'A', src: 'Tutorial W4 concept check 4',
        q: R`Which statement is **false**?`,
        choices: ['The PI can easily be adapted to find the correct decision when there are several resource constraints', 'The PI measures the NPV created per unit of resource consumed', 'Capital rationing is how firms allocate limited capital among projects', 'With a fixed budget, simply picking the highest-NPV project may not be best'], answer: 0,
        why: R`The PI handles **one** constraint, such as a single budget. With several constraints at once, ranking by PI can fail.` },
      { id: 'w4-q57', topic: 'pi', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W4',
        q: R`What is the main **weakness** of the profitability index?`,
        choices: ['Two projects of very different size can have the same PI', 'It ignores the time value of money', 'It ignores all cash flows after the payback period', 'It can never be negative'], answer: 0,
        why: R`PI is a ratio, so it hides scale. A $1,000 project and a $1 million project can share a PI. Without rationing, NPV is still the best method.` },
      { id: 'w4-q58', topic: 'pi', kind: 'num', level: 2, section: 'B', src: 'Lecture W4 Example 2', formula: 'pi',
        q: R`Taken Inn can open a café in Hobart for $125,000. It brings in $60,000 a year for 3 years. The discount rate is 10%. What is Hobart’s **PI**? (3 decimal places.)`,
        answer: HOBART.pi, unit: '', dp: 3,
        mistakes: [
          { v: 1 + HOBART.pi, why: 'That is PV of inflows ÷ cost (the textbook version). BFC2140 uses NPV ÷ investment.' },
          { v: HOBART.npv / (HOBART.npv + HOBART.out), why: 'Divide by the initial investment, not by the PV of the inflows.' },
          { v: (180000 - 125000) / 125000, why: 'Discount the inflows first. Undiscounted profit is not NPV.' },
        ],
        steps: [
          R`\[PV = ${annuityPV(60000, 0.1, 3)} = ${L.money(HOBART.npv + HOBART.out)}\]`,
          R`\[NPV = ${L.money(HOBART.npv + HOBART.out)} - \$125{,}000 = ${L.money(HOBART.npv)}\]`,
          R`\[PI = \frac{NPV}{\text{Initial investment}} = \frac{${L.money(HOBART.npv)}}{\$125{,}000} = ${L.num(HOBART.pi, 3)}\]`,
        ],
        why: R`Every dollar invested in Hobart creates about 19 cents of NPV, the best ratio of the four cities.` },
      { id: 'w4-q59', topic: 'pi', kind: 'mcq', level: 3, section: 'B', src: 'Lecture W4 Example 2', formula: 'pi', boss: true,
        q: R`Taken Inn faces hard rationing: its bank caps spending at **$1,000,000**. Each café lasts 3 years and the discount rate is 10%. Using the PI, where should it open cafés?`,
        table: { head: ['City', 'Initial outlay', 'Annual inflow'], rows: CAFES.map((c) => [c.nm, cell(c.out), cell(c.a)]) },
        choices: ['Hobart, Sydney and Melbourne', 'All four cities', 'Hobart, Melbourne and Perth', 'Sydney and Melbourne only'], answer: 0,
        steps: [
          R`\[\begin{aligned} ${CAFES.map((c) => R`\text{${c.nm}}: NPV &= ${L.money(c.npv)}, & PI &= ${L.num(c.pi, 3)}`).join(R` \\ `)} \end{aligned}\]`,
          R`Rank by PI: Hobart, Sydney, Melbourne, Perth. Perth has \(PI < 0\), so reject it anyway.`,
          R`Hobart + Sydney + Melbourne costs \(\$925{,}000\), within the \(\$1{,}000{,}000\) limit.`,
        ],
        why: R`Rank by PI and fund from the top: Hobart (0.194), Sydney (0.094) and Melbourne (0.078), for $925,000. Perth destroys value.` },
      { id: 'w4-q60', topic: 'pi', kind: 'mcq', level: 2, section: 'B', src: 'Tutorial W4 Q4', formula: 'pi',
        q: R`An investor has a budget of **$35 million**. All four projects last 4 years and the cost of capital is 8%. Which should he invest in?`,
        table: { head: ['Project', 'Initial investment', 'Annual cash flow'], rows: T4.map((p) => [p.nm, `$${p.out}m`, `$${p.a}m`]) },
        choices: ['C and D', 'A only', 'B and C', 'A and D'], answer: 0,
        wrong: { 1: 'A uses the whole budget for an NPV of $11.37m. C and D together create $22.96m.', 3: 'A and D cost $55m, over the budget.' },
        steps: [
          R`\[\begin{aligned} ${T4.map((p) => R`${p.nm}: NPV &= ${L.money(p.npv * 1e6)}, & PI &= ${L.num(p.pi, 3)}`).join(R` \\ `)} \end{aligned}\]`,
          R`Rank by PI: D, C, A, B. Take D ($20m) and C ($15m): exactly $35m.`,
        ],
        why: R`Ranking by PI picks D (0.739) and C (0.546). Together they use the $35m and create \(${L.money((T4[2].npv + T4[3].npv) * 1e6)}\) of NPV.` },

      /* ----- unequal lives and retirement ----- */
      { id: 'w4-q61', topic: 'lives', kind: 'mcq', level: 1, section: 'A', src: 'Tutorial W4 concept check 5', formula: 'eav',
        q: R`Two projects have **different lives**. Why convert each NPV into an equivalent annual annuity (EAA)?`,
        choices: ['So the projects can be compared on the value created (or cost) per period', 'To find which project has the greatest NPV', 'To stop errors in the discount rate from favouring the shorter project', 'To count the longer project’s cash flows after the shorter one ends'], answer: 0,
        why: R`An NPV earned over 2 years and an NPV earned over 4 years are not comparable. The EAA turns each into an equal yearly amount, which is.` },
      { id: 'w4-q62', topic: 'lives', kind: 'mcq', level: 2, section: 'A', src: 'Mock MST Q11', formula: 'eav',
        q: R`Norman Ltd must choose between Project A (6 years, NPV $3,000, EAC $730) and Project B (4 years, NPV $2,278, EAC $750). They are mutually exclusive. Which should it choose?`,
        choices: ['B, because it has the higher equivalent annual cash flow', 'A, because it has the higher NPV', 'A, because it lasts longer', 'Either, because unequal lives cannot be compared'], answer: 0,
        why: R`The lives differ, so compare yearly equivalents. B creates $750 a year; A creates only $730.` },
      { id: 'w4-q63', topic: 'lives', kind: 'tf', level: 1, section: 'A', src: 'Mock MST Q27', formula: 'eav',
        q: R`We use the equivalent annual annuity (EAA) to evaluate mutually exclusive projects with different lives.`,
        answer: true, why: R`The EAA converts each NPV into an ordinary annuity payment. Then a 3-year and a 5-year project can be compared year for year.` },
      { id: 'w4-q64', topic: 'lives', kind: 'num', level: 2, section: 'B', src: 'Lecture W4 (air cleaners)', formula: 'eav',
        q: R`Cleaner X costs $4,000 today, costs $100 a year to run and lasts 10 years. The cost of capital is 10%. What is its **equivalent annual cost (EAC)**? (Enter a cost as a negative number.)`,
        answer: FIN.eac(NPV_X_CLEAN, 0.1, 10), unit: '$', dp: 2,
        mistakes: [
          { v: -100, why: 'That is only the running cost. The $4,000 price must be spread over the 10 years too.' },
          { v: NPV_X_CLEAN / 10, why: 'Dividing the NPV by 10 ignores the time value of money. Use the annuity formula.' },
          { v: NPV_X_CLEAN, why: 'That is the NPV of all the costs. Turn it into an equal yearly amount.' },
        ],
        steps: [
          R`\[NPV_X = -\$4{,}000 - ${annuityPV(100, 0.1, 10)} = ${L.money(NPV_X_CLEAN)}\]`,
          R`\[EAC = \frac{NPV \times k}{1 - \frac{1}{(1+k)^{n}}} = \frac{${L.money(NPV_X_CLEAN)} \times 0.10}{1 - \frac{1}{1.1^{10}}} = ${L.money(FIN.eac(NPV_X_CLEAN, 0.1, 10))}\]`,
        ],
        why: R`Cleaner X costs \(\$750.98\) a year. Cleaner Y (5 years) costs \(\$763.80\) a year, so X is cheaper even though Y’s NPV looks better.` },
      { id: 'w4-q65', topic: 'lives', kind: 'num', level: 3, section: 'B', src: 'Lecture W4 (replacement chain)', formula: 'npv', boss: true,
        q: R`Cleaner Y costs $1,000, costs $500 a year to run and lasts 5 years. Its NPV at 10% is −$2,895.39. To compare it with the 10-year Cleaner X, buy Y twice in a row. What is the **NPV of the two Y cycles**?`,
        tl: { n: 10, at: { 0: '−$1,000', 1: '−$500', 2: '−$500', 3: '−$500', 4: '−$500', 5: '−$1,500', 6: '−$500', 7: '−$500', 8: '−$500', 9: '−$500', 10: '−$500' }, unit: 'Year', hi: [5] },
        answer: FIN.chainNPV(NPV_Y_CLEAN, 0.1, 5, 2), unit: '$', dp: 2,
        mistakes: [
          { v: NPV_Y_CLEAN, why: 'That is one 5-year cycle only. Match the 10-year life of X.' },
          { v: 2 * NPV_Y_CLEAN, why: 'The second cycle starts in year 5, so discount its NPV by 1.1 to the power 5.' },
          { v: NPV_Y_CLEAN + NPV_Y_CLEAN / Math.pow(1.1, 6), why: 'The second cycle’s NPV is valued at t = 5 (when it starts), not t = 6.' },
        ],
        steps: [R`The second cycle’s NPV is valued at \(t = 5\), when it starts.`, R`\[NPV_{chain} = ${L.money(NPV_Y_CLEAN)} + \frac{${L.money(NPV_Y_CLEAN)}}{1.1^{5}} = ${L.money(FIN.chainNPV(NPV_Y_CLEAN, 0.1, 5, 2))}\]`],
        calc: npvKeys([-1000, -500, -500, -500, -500, -1500, -500, -500, -500, -500, -500], 0.1),
        why: R`Over the same 10 years, X costs \(${L.money(NPV_X_CLEAN)}\) and Y costs \(${L.money(FIN.chainNPV(NPV_Y_CLEAN, 0.1, 5, 2))}\). X is cheaper.` },
      { id: 'w4-q66', topic: 'lives', kind: 'mcq', level: 2, section: 'B', src: 'Tutorial W4 Q5', formula: 'eav',
        q: R`Billy’s two projects are mutually exclusive and will be **repeated** into the future. The cost of capital is 10%. Which should he choose?`,
        table: { head: ['Year', 'Project S', 'Project L'], rows: [[0, '−$100,000', '−$100,000'], [1, '$60,000', '$33,500'], [2, '$60,000', '$33,500'], [3, '', '$33,500'], [4, '', '$33,500']] },
        choices: ['S, because it has the higher equivalent annual annuity', 'L, because it has the higher NPV', 'L, because it lasts twice as long', 'Either, because both NPVs are positive'], answer: 0,
        steps: [
          R`Naive NPVs: \(NPV_S = ${L.money(NPV_BS)}\) and \(NPV_L = ${L.money(NPV_BL)}\). L looks better, but the lives differ.`,
          R`\[EAA_S = \frac{${L.money(NPV_BS)} \times 0.1}{1 - \frac{1}{1.1^{2}}} = ${L.money(FIN.eac(NPV_BS, 0.1, 2))} \qquad EAA_L = \frac{${L.money(NPV_BL)} \times 0.1}{1 - \frac{1}{1.1^{4}}} = ${L.money(FIN.eac(NPV_BL, 0.1, 4))}\]`,
          R`Replacement chain check: S twice over 4 years has \(NPV = ${L.money(FIN.chainNPV(NPV_BS, 0.1, 2, 2))} > ${L.money(NPV_BL)}\).`,
        ],
        why: R`With repetition, S creates more value per year. Both methods agree: choose S. (The tutorial’s decision line shows $7,547.37, a typo for $7,547.30.)` },
      { id: 'w4-q67', topic: 'lives', kind: 'num', level: 2, section: 'B', src: 'Tutorial W4 Q5', formula: 'eav',
        q: R`Project S costs $100,000 and returns $60,000 a year for 2 years. The cost of capital is 10%. What is its **equivalent annual annuity (EAA)**?`,
        answer: FIN.eac(NPV_BS, 0.1, 2), unit: '$', dp: 2,
        mistakes: [
          { v: NPV_BS / 2, why: 'Dividing the NPV by 2 ignores the time value of money. Use the annuity formula.' },
          { v: NPV_BS * 0.1, why: 'NPV × k is a perpetuity payment. This project lasts only 2 years.' },
          { v: NPV_BS, why: 'That is the NPV. Spread it over the 2 years as an annuity.' },
        ],
        steps: [R`\[NPV_S = -100{,}000 + \frac{60{,}000}{1.1} + \frac{60{,}000}{1.1^{2}} = ${L.money(NPV_BS)}\]`, R`\[EAA = \frac{NPV \times k}{1 - \frac{1}{(1+k)^{n}}} = \frac{${L.money(NPV_BS)} \times 0.1}{1 - \frac{1}{1.1^{2}}} = ${L.money(FIN.eac(NPV_BS, 0.1, 2))}\]`],
        why: R`S is worth the same as \(${L.money(FIN.eac(NPV_BS, 0.1, 2))}\) a year for 2 years. L’s EAA is only \(${L.money(FIN.eac(NPV_BL, 0.1, 4))}\).` },
      { id: 'w4-q68', topic: 'lives', kind: 'num', level: 2, section: 'B', src: 'Textbook Ch 8 P28', formula: 'eav',
        q: R`Utopia Tours will keep one bus model forever. **Old Reliable** costs $200,000 plus $4,000 a year for 7 years. The discount rate is 11%. What is its **equivalent annual cost**? (Enter a cost as a negative number.)`,
        answer: FIN.eac(OR_NPV, 0.11, 7), unit: '$', dp: 2,
        mistakes: [
          { v: OR_NPV / 7, why: 'Dividing the NPV by 7 ignores the time value of money.' },
          { v: FIN.eac(SS_NPV, 0.11, 4), why: 'That is the other bus, Short and Sweet.' },
          { v: -200000 / 7 - 4000, why: 'Spreading the price evenly ignores the time value of money. Use the annuity formula.' },
        ],
        steps: [
          R`\[NPV = -\$200{,}000 - ${annuityPV(4000, 0.11, 7)} = ${L.money(OR_NPV)}\]`,
          R`\[EAC = \frac{${L.money(OR_NPV)} \times 0.11}{1 - \frac{1}{1.11^{7}}} = ${L.money(FIN.eac(OR_NPV, 0.11, 7))}\]`,
          R`Short and Sweet ($100,000 plus $2,000 a year for 4 years): \(NPV = ${L.money(SS_NPV)}\), \(EAC = ${L.money(FIN.eac(SS_NPV, 0.11, 4))}\).`,
        ],
        why: R`Old Reliable costs about $46,443 a year; Short and Sweet about $34,233. Utopia Tours should buy Short and Sweet.` },
      { id: 'w4-q69', topic: 'lives', kind: 'mcq', level: 2, section: 'B', src: 'Textbook Ch 8 P28', formula: 'eav',
        q: R`Utopia Tours will keep one bus model forever. Old Reliable: $200,000 plus $4,000 a year for 7 years. Short and Sweet: $100,000 plus $2,000 a year for 4 years. The discount rate is 11%. Which bus should it choose?`,
        choices: ['Short and Sweet', 'Old Reliable', 'Either: they cost the same per year', 'Neither can be compared, because the lives differ'], answer: 0,
        steps: [R`\(EAC_{OR} = ${L.money(FIN.eac(OR_NPV, 0.11, 7))}\) per year.`, R`\(EAC_{SS} = ${L.money(FIN.eac(SS_NPV, 0.11, 4))}\) per year.`],
        why: R`Compare costs per year, not total NPVs. Short and Sweet is about $12,210 a year cheaper.` },
      { id: 'w4-q70', topic: 'lives', kind: 'num', level: 2, section: 'B', src: 'Textbook Ch 8 P29', formula: 'eav',
        q: R`Hassle-Free Web must buy $15,000 of equipment now and spend $2,000 a year for 3 years to host a hotel’s website. Its cost of capital is 10%. What is the **lowest annual fee** it can charge and still add value?`,
        answer: -FIN.eac(HF_NPV, 0.1, 3), unit: '$', dp: 2,
        mistakes: [
          { v: 15000 / 3 + 2000, why: 'Spreading the $15,000 evenly ignores the time value of money.' },
          { v: 2000, why: 'The fee must also cover the $15,000 of equipment.' },
          { v: -HF_NPV / 3, why: 'Dividing the NPV by 3 ignores the time value of money. Use the annuity formula.' },
        ],
        steps: [R`\[NPV_{costs} = -\$15{,}000 - ${annuityPV(2000, 0.1, 3)} = ${L.money(HF_NPV)}\]`, R`\[EAC = \frac{${L.money(-HF_NPV)} \times 0.1}{1 - \frac{1}{1.1^{3}}} = ${L.money(-FIN.eac(HF_NPV, 0.1, 3))} \text{ a year}\]`],
        why: R`Any fee above about $8,032 a year gives a positive NPV. The hotel now pays $10,000, so Hassle-Free can undercut it.` },
      { id: 'w4-q71', topic: 'lives', kind: 'mcq', level: 3, section: 'B', src: 'Lecture W4 recap (General Foods)', boss: true,
        q: R`General Foods’ machine is 6 years old and can last 2 more years at most. The cost of capital is 10% and there is no tax. When should the machine be **retired**?`,
        table: { head: ['End of year', 'Net cash flow', 'Residual value'], rows: [[6, '—', '$18,000'], [7, '$22,000', '$9,000'], [8, '$14,000', '$0']] },
        choices: ['At the end of year 8', 'Now, at the end of year 6', 'At the end of year 7', 'It does not matter: every option is worth the same'], answer: 0,
        steps: [R`Retire now: \(\$18{,}000\).`, R`Retire at the end of year 7: \(\frac{22{,}000 + 9{,}000}{1.1} = ${L.money(31000 / 1.1)}\).`, R`Retire at the end of year 8: \(\frac{22{,}000}{1.1} + \frac{14{,}000}{1.1^{2}} = ${L.money(22000 / 1.1 + 14000 / 1.21)}\).`],
        why: R`Keeping the machine to the end of year 8 has the highest PV, so it maximises shareholder wealth.` },
    ],

    generators: [
      /* ---------- payback ---------- */
      { id: 'w4-g-payback', topic: 'payback', level: 1, section: 'B', formula: 'payback', src: 'Lecture W4 Example 1',
        make(rng) {
          for (let tries = 0; tries < 60; tries++) {
            const n = rng.int(4, 5);
            const cfs = [0];
            for (let t = 1; t <= n; t++) cfs.push(rng.step(10, 80, 1) * 1000);
            const m = rng.int(2, n - 1);
            const before = sum(cfs.slice(1, m));
            const cost = Math.round((before + cfs[m] * rng.step(0.15, 0.85, 0.05)) / 1000) * 1000;
            cfs[0] = -cost;
            const pb = FIN.payback(cfs);
            if (!(pb > m - 1 + 0.05 && pb < m - 0.05)) continue;
            const unrec = cost - before;
            const co = rng.company();
            return {
              q: R`${co} is looking at a project with the cash flows below. What is its **payback period**?`,
              table: cfTable([cfs], ['Cash flow']),
              answer: pb, unit: 'yrs', dp: 2,
              mistakes: clean([
                { v: m, why: `That rounds up to whole years. Payback counts the fraction of year ${m} that is needed.` },
                { v: m + unrec / cfs[m], why: `Only ${m - 1} full years pass before recovery. Start from ${m - 1}, not ${m}.` },
                { v: cost / (sum(cfs.slice(1)) / n), why: 'Cost ÷ average cash flow only works when every cash flow is equal.' },
              ], pb, 'yrs', 2),
              steps: [
                R`Keep a running total of the cash flows:`,
                cumBlock(cfs, m),
                R`The total turns positive in year ${m}. At the start of that year, \(${L.moneyT(unrec)}\) is still unrecovered.`,
                R`\[\text{Payback} = ${m - 1} + \frac{${L.moneyT(unrec)}}{${L.moneyT(cfs[m])}} = ${L.num(pb, 2)} \text{ years}\]`,
              ],
              why: R`Full years before recovery, plus the fraction of the recovery year: \(${m - 1} + \frac{${L.moneyT(unrec)}}{${L.moneyT(cfs[m])}}\).`,
            };
          }
          return null;
        } },
      { id: 'w4-g-payback-level', topic: 'payback', level: 1, section: 'B', formula: 'payback', src: 'Tutorial W4 Q1',
        make(rng) {
          for (let tries = 0; tries < 40; tries++) {
            const c = rng.step(20, 90, 1) * 1000;
            let cost = Math.round((c * rng.step(1.6, 4.4, 0.1)) / 1000) * 1000;
            if (cost % c === 0) cost += 1000;
            const pb = cost / c;
            const n = rng.int(Math.ceil(pb) + 1, 8);
            const k = rng.step(0.06, 0.14, 0.005);
            const dpb = -Math.log(1 - (cost * k) / c) / Math.log(1 + k);
            if (FMT.answerText(dpb, 'yrs', 2) === FMT.answerText(Math.ceil(pb), 'yrs', 2)) continue;
            const what = rng.pick(['machine', 'delivery van', 'solar array', 'software system', 'coffee roaster']);
            return {
              q: R`A ${what} costs ${T.money(cost, 0)} and saves ${T.money(c, 0)} a year for ${n} years. The cost of capital is ${T.pctT(k)}. What is the **payback period**?`,
              givens: [['C_0', L.moneyT(cost)], [R`\text{CF per year}`, L.moneyT(c)], ['k', L.pctT(k)]],
              tl: { cfs: [-cost].concat(Array(n).fill(c)), unit: 'Year' },
              answer: pb, unit: 'yrs', dp: 2,
              mistakes: [
                { v: Math.ceil(pb), why: 'That rounds up to whole years. Count the fraction of the last year too.' },
                { v: dpb, why: 'That is the discounted payback. The simple payback does not discount.' },
              ],
              steps: [
                R`The cash flows are equal, so use the shortcut: \[\text{Payback} = \frac{\text{Cost}}{\text{Annual cash flow}} = \frac{${L.moneyT(cost)}}{${L.moneyT(c)}} = ${L.num(pb, 2)} \text{ years}\]`,
                R`The ${T.pctT(k)} cost of capital is not needed: payback ignores the time value of money.`,
              ],
              why: 'With equal cash flows, payback = cost ÷ annual cash flow.',
            };
          }
          return null;
        } },
      { id: 'w4-g-payback-decide', topic: 'payback', level: 2, section: 'B', formula: 'payback', src: 'Tutorial W4 Q1',
        make(rng) {
          for (let tries = 0; tries < 80; tries++) {
            const cut = rng.int(2, 4), n = 5;
            const cA = rng.step(4, 12, 1) * 1000;
            const costA = Math.round((cA * rng.step(cut - 0.8, cut + 0.8, 0.1)) / 1000) * 1000;
            const A = [-costA].concat(Array(n).fill(cA));
            const first = rng.step(8, 16, 1) * 1000, tail = rng.step(1, 4, 1) * 1000;
            const costB = Math.round((first + tail * rng.step(0.5, 4.5, 0.25)) / 1000) * 1000;
            const B = [-costB, first].concat(Array(n - 1).fill(tail));
            const pA = FIN.payback(A), pB = FIN.payback(B);
            if (!Number.isFinite(pA) || !Number.isFinite(pB)) continue;
            if (Math.abs(pA - cut) < 0.05 || Math.abs(pB - cut) < 0.05) continue;
            const okA = pA <= cut, okB = pB <= cut;
            const ans = okA && okB ? 3 : okA ? 1 : okB ? 2 : 0;
            return {
              kind: 'mcq',
              q: R`${rng.person()} only takes projects that pay back within **${cut} years**. The projects are independent. Which should be accepted?`,
              table: cfTable([A, B], ['Project A', 'Project B']),
              choices: ['Neither project', 'Project A only', 'Project B only', 'Both projects'],
              answer: ans,
              steps: [
                R`A has equal cash flows: \(\frac{${L.moneyT(costA)}}{${L.moneyT(cA)}} = ${L.num(pA, 2)}\) years.`,
                R`B, running total:`, cumBlock(B, Math.min(n, Math.ceil(pB))),
                R`B pays back in \(${L.num(pB, 2)}\) years.`,
              ],
              why: `Compare each payback with the ${cut}-year cut-off. A: ${T.num(pA, 2)} years (${okA ? 'accept' : 'reject'}). B: ${T.num(pB, 2)} years (${okB ? 'accept' : 'reject'}).`,
            };
          }
          return null;
        } },

      /* ---------- NPV ---------- */
      { id: 'w4-g-npv', topic: 'npv', level: 1, section: 'B', formula: 'npv', src: 'Lecture W4 Example 1',
        make(rng) {
          let n, r, cost, cfs, npv;
          do {
            n = rng.int(3, 5); r = rng.step(0.06, 0.16, 0.005);
            cost = rng.step(20, 500, 10) * 1000;
            cfs = [-cost];
            for (let t = 1; t <= n; t++) cfs.push(Math.round((cost / n) * rng.step(0.7, 1.7, 0.05) / 1000) * 1000);
            npv = FIN.npv(r, cfs);
          } while (Math.abs(npv) < 0.005 * cost);
          const co = rng.company();
          return {
            q: R`${co} is evaluating a project with the cash flows below. The cost of capital is ${T.pctT(r)}. What is the **NPV**?`,
            givens: [['k', L.pctT(r)]],
            table: cfTable([cfs], ['Cash flow']),
            answer: npv, unit: '$', dp: 2,
            mistakes: [
              { v: npv + cost, why: 'That is only the PV of the inflows. Subtract the outlay at t = 0.' },
              { v: npv / (1 + r), why: 'That discounts every cash flow one year too many. In Excel, keep CF0 outside the NPV() range.' },
              { v: sum(cfs), why: 'That just adds the cash flows. Discount each one first.' },
            ],
            steps: npvSteps(cfs, r),
            calc: npvKeys(cfs, r),
            why: R`${npv > 0 ? R`\(NPV > 0\), so the project adds value: accept.` : R`\(NPV < 0\), so the project destroys value: reject.`}`,
          };
        } },
      { id: 'w4-g-npv-level', topic: 'npv', level: 1, section: 'B', formula: 'npv', src: 'MST 2026 Q19',
        make(rng) {
          let n, r, c, cost, pv, npv;
          do {
            n = rng.int(3, 10); r = rng.step(0.05, 0.14, 0.005);
            c = rng.step(20, 900, 10) * 1000;
            pv = FIN.pvAnnuity(c, r, n);
            cost = Math.round((pv * rng.step(0.8, 1.15, 0.01)) / 10000) * 10000;
            npv = pv - cost;
          } while (Math.abs(npv) < 0.005 * cost);
          const cfs = [-cost].concat(Array(n).fill(c));
          return {
            q: R`A project costs ${T.money(cost, 0)} today. It returns ${T.money(c, 0)} at the end of each of the next ${n} years. The discount rate is ${T.pctT(r)}. What is the **NPV**?`,
            givens: [['C_0', L.moneyT(-cost)], ['C', L.moneyT(c)], ['n', String(n)], ['k', L.pctT(r)]],
            tl: { cfs, unit: 'Year' },
            answer: npv, unit: '$', dp: 2,
            mistakes: [
              { v: pv, why: 'That is only the PV of the inflows. Subtract the cost paid today.' },
              { v: FIN.pvAnnuityDue(c, r, n) - cost, why: 'That treats the inflows as an annuity due. They come at the end of each year.' },
              { v: FIN.pvAnnuity(c, r, n - 1) - cost, why: `There are ${n} inflows, not ${n - 1}.` },
              { v: n * c - cost, why: 'That ignores discounting.' },
            ],
            steps: [
              R`The inflows are an ordinary annuity: \[NPV = -C_0 + C \times \frac{1}{k}\left(1 - \frac{1}{(1+k)^{n}}\right)\]`,
              R`\[NPV = ${L.moneyT(-cost)} + ${annuityPV(c, r, n)} = ${L.moneyT(-cost)} + ${L.money(pv)} = ${L.money(npv)}\]`,
            ],
            calc: npvKeys(cfs, r),
            why: R`${npv > 0 ? 'The PV of the inflows is bigger than the cost: accept.' : 'The PV of the inflows is smaller than the cost: reject.'}`,
          };
        } },
      { id: 'w4-g-maxprice', topic: 'npv', level: 1, section: 'B', formula: 'pv-annuity', src: 'Mock MST Q18',
        make(rng) {
          const c = rng.step(5, 200, 1) * 1000, n = rng.int(3, 8), r = rng.step(0.05, 0.14, 0.005);
          const pv = FIN.pvAnnuity(c, r, n);
          return {
            q: R`A project’s cash **inflows** are ${T.money(c, 0)} a year for ${n} years, starting in one year. The cost of capital is ${T.pctT(r)}. What is the **most** that should be invested today?`,
            givens: [['C', L.moneyT(c)], ['n', String(n)], ['k', L.pctT(r)]],
            tl: { cfs: ['?'].concat(Array(n).fill(c)), unit: 'Year', hi: [0] },
            answer: pv, unit: '$', dp: 2,
            mistakes: [
              { v: n * c, why: 'That ignores discounting.' },
              { v: FIN.pvAnnuityDue(c, r, n), why: 'The first inflow is in one year: an ordinary annuity, not an annuity due.' },
              { v: FIN.pvAnnuity(c, r, n - 1), why: `There are ${n} inflows, not ${n - 1}.` },
            ],
            steps: [R`The most you can invest is the amount that makes \(NPV = 0\): the PV of the inflows.`, R`\[PV = ${annuityPV(c, r, n)} = ${L.money(pv)}\]`],
            calc: `${cfKeys([0].concat(Array(n).fill(c)))} · ${rateKey(r)} [I/YR] · [NPV] → ${T.money(pv)}`,
            why: 'Invest more than the PV of the inflows and the NPV turns negative.',
          };
        } },
      { id: 'w4-g-perp', topic: 'npv', level: 2, section: 'B', formula: 'pv-grow-perp', src: 'Tutorial W4 Q2',
        make(rng) {
          const r = rng.step(0.08, 0.16, 0.005);
          const g = rng.pick([0, 0, 0.01, 0.02, 0.03, -0.02, -0.05]);
          const c1 = rng.step(10, 80, 1) * 1000;
          const pv = c1 / (r - g);
          let cost = Math.round((pv * rng.step(0.8, 1.2, 0.01)) / 5000) * 5000;
          if (Math.abs(pv - cost) < 0.02 * pv) cost += (rng.chance(0.5) ? 1 : -1) * Math.max(5000, Math.round((0.06 * pv) / 5000) * 5000);
          const npv = pv - cost;
          const co = rng.company();
          const growth = g === 0 ? 'every year after that, forever' : g > 0 ? `then grows by ${T.pctT(g)} a year forever` : `then falls by ${T.pctT(-g)} a year forever`;
          const mistakes = [{ v: pv, why: 'That is only the PV of the cash flows. Subtract the price.' }];
          if (g === 0) {
            mistakes.push({ v: c1 / r / (1 + r) - cost, why: 'C ÷ r already values the perpetuity at t = 0, one period before the first cash flow. Do not discount again.' });
            mistakes.push({ v: (c1 * (1 + r)) / r - cost, why: 'The first cash flow arrives in one year. Do not compound it.' });
          } else {
            mistakes.push({ v: c1 / r - cost, why: R`That ignores the growth rate. Divide by \(r - g\).` });
            mistakes.push({ v: c1 / (r + g) - cost, why: R`Sign slip: the formula is \(\frac{C_1}{r - g}\).` });
            mistakes.push({ v: (c1 * (1 + g)) / (r - g) - cost, why: 'The cash flow given is already next year’s (C1). Do not grow it again.' });
          }
          return {
            q: R`${co} can buy a small rival for ${T.money(cost, 0)}. The deal adds ${T.money(c1, 0)} of cash flow next year, ${growth}. The cost of capital is ${T.pctT(r)}. What is the **NPV** of the deal?`,
            givens: [['C_1', L.moneyT(c1)], ['k', L.pctT(r)], ['g', L.pctT(g)], [R`\text{Price}`, L.moneyT(cost)]],
            answer: npv, unit: '$', dp: 2,
            mistakes,
            steps: [
              g === 0 ? R`A level perpetuity starting at \(t = 1\): \[PV = \frac{C}{k} = \frac{${L.moneyT(c1)}}{${L.dec(r)}} = ${L.money(pv)}\]`
                : R`A growing perpetuity starting at \(t = 1\): \[PV = \frac{C_1}{k - g} = \frac{${L.moneyT(c1)}}{${L.dec(r)} - (${L.dec(g)})} = ${L.money(pv)}\]`,
              R`\[NPV = ${L.money(pv)} - ${L.moneyT(cost)} = ${L.money(npv)}\]`,
            ],
            why: R`The perpetuity formula values the cash flows at \(t = 0\), one period before the first one. ${npv > 0 ? 'NPV > 0, so buy.' : 'NPV < 0, so do not buy.'}`,
          };
        } },
      { id: 'w4-g-book', topic: 'npv', level: 2, section: 'B', formula: 'pv-grow-perp', src: 'Tutorial W4 Q7',
        make(rng) {
          const who = rng.person();
          const adv = rng.step(4, 20, 0.5), lost = rng.step(2, 10, 0.5), roy = rng.step(2, 8, 0.5);
          const d = rng.pick([0.2, 0.25, 0.3, 0.4, 0.5]), r = rng.step(0.08, 0.12, 0.01);
          const npv = adv - lost / (1 + r) + roy / (r + d);
          return {
            q: R`${who} is paid a ${T.money(adv * 1e6, 0)} advance today to write a book. Writing takes a year, and ${who} gives up ${T.money(lost * 1e6, 0)} of consulting income paid at \(t = 1\). Royalties start at ${T.money(roy * 1e6, 0)} at \(t = 1\), then **fall by ${T.pctT(d)} a year** forever. The cost of capital is ${T.pctT(r)}. What is the **NPV** of the deal?`,
            givens: [[R`\text{Advance}`, L.moneyT(adv) + R`\text{m}`], [R`\text{Lost income}_1`, L.moneyT(lost) + R`\text{m}`], ['C_1', L.moneyT(roy) + R`\text{m}`], ['g', L.pctT(-d)], ['k', L.pctT(r)]],
            answer: npv, unit: '$m', dp: 3,
            mistakes: [
              { v: adv + roy / (r + d), why: 'The lost consulting income is an opportunity cost. Include it.' },
              { v: adv - lost + roy / (r + d), why: 'The lost income is paid at t = 1, so discount it.' },
              { v: adv - lost / (1 + r) + roy / r, why: 'The royalties shrink every year. Use a growing perpetuity with a negative g.' },
            ],
            steps: [
              R`Advance at \(t = 0\): \(+${L.moneyT(adv)}\text{m}\).`,
              R`Lost income at \(t = 1\): \(-\frac{${L.moneyT(lost)}\text{m}}{${L.onePlus(r)}} = -${L.moneyT(lost / (1 + r), 3)}\text{m}\).`,
              R`Royalties, a growing perpetuity with \(g = -${L.pctT(d)}\): \[PV = \frac{C_1}{k - g} = \frac{${L.moneyT(roy)}\text{m}}{${L.dec(r)} + ${L.dec(d)}} = ${L.moneyT(roy / (r + d), 3)}\text{m}\]`,
              R`\[NPV = ${L.numT(adv)} - ${L.numT(lost / (1 + r), 3)} + ${L.numT(roy / (r + d), 3)} = ${L.moneyT(npv, 3)}\text{m}\]`,
            ],
            why: 'A shrinking perpetuity is a growing perpetuity with a negative g, so r − g gets bigger.',
          };
        } },
      { id: 'w4-g-split', topic: 'npv', level: 3, section: 'B', formula: 'npv', boss: true, src: 'MST 2026 Q12',
        make(rng) {
          const i0 = rng.step(40, 200, 5) * 1000, i1 = rng.step(10, 80, 5) * 1000;
          const n = rng.int(5, 10), r = rng.step(0.04, 0.10, 0.005);
          const c = Math.round(((i0 + i1) * rng.step(1.0, 1.5, 0.05)) / FIN.pvifa(r, n) / 1000) * 1000;
          const pvIn = FIN.pvAnnuity(c, r, n), pvOut = i0 + i1 / (1 + r);
          const npv = pvIn - pvOut;
          const at = { 0: T.money(-i0, 0), 1: `${T.money(c, 0)} − ${T.money(i1, 0)}` };
          for (let t = 2; t <= n; t++) at[t] = T.money(c, 0);
          const cfs = [-i0, c - i1].concat(Array(n - 1).fill(c));
          return {
            q: R`A project needs ${T.money(i0, 0)} today and another ${T.money(i1, 0)} in one year. It returns ${T.money(c, 0)} at the end of each year for ${n} years. The discount rate is ${T.pctT(r)}. What is the **NPV**?`,
            givens: [['I_0', L.moneyT(i0)], ['I_1', L.moneyT(i1)], ['C', L.moneyT(c)], ['n', String(n)], ['k', L.pctT(r)]],
            tl: { n, at, unit: 'Year', hi: [1] },
            answer: npv, unit: '$', dp: 2,
            mistakes: [
              { v: pvIn - i0 - i1, why: `The second ${T.money(i1, 0)} is paid in one year, so discount it.` },
              { v: pvIn / (1 + r) - pvOut, why: 'The inflows start at the end of year 1, not year 2.' },
              { v: pvIn - i0, why: 'Do not forget the second investment.' },
            ],
            steps: [
              R`Investment in today’s dollars: \[${L.moneyT(i0)} + \frac{${L.moneyT(i1)}}{${L.onePlus(r)}} = ${L.money(pvOut)}\]`,
              R`PV of the inflows (ordinary annuity): \[${annuityPV(c, r, n)} = ${L.money(pvIn)}\]`,
              R`\[NPV = ${L.money(pvIn)} - ${L.money(pvOut)} = ${L.money(npv)}\]`,
            ],
            calc: npvKeys(cfs, r),
            why: R`Bring every cash flow to \(t = 0\). At \(t = 1\) the net cash flow is \(${L.moneyT(c - i1)}\).`,
          };
        } },

      /* ---------- IRR ---------- */
      { id: 'w4-g-irr', topic: 'irr', level: 2, section: 'B', formula: 'irr', src: 'Lecture W4 Example 1',
        make(rng) {
          for (let tries = 0; tries < 60; tries++) {
            const n = rng.int(3, 5), k = rng.step(0.06, 0.14, 0.005);
            const cost = rng.step(20, 400, 10) * 1000;
            const cfs = [-cost];
            for (let t = 1; t <= n; t++) cfs.push(Math.round((cost / n) * rng.step(0.8, 1.9, 0.05) / 1000) * 1000);
            const all = FIN.irrAll(cfs);
            if (all.length !== 1) continue;
            const irr = all[0];
            if (!(irr > 0.03 && irr < 0.45) || Math.abs(irr - k) < 0.005) continue;
            const mistakes = [
              { v: P((sum(cfs.slice(1)) / cost - 1) / n), why: 'That is a simple average return. The IRR must discount each cash flow.' },
              { v: P(k), why: 'That is the cost of capital, the hurdle the IRR is compared with.' },
            ];
            const noLast = FIN.irr(cfs.slice(0, -1));
            if (Number.isFinite(noLast) && noLast > -0.5) mistakes.push({ v: P(noLast), why: 'The last cash flow was left out. Enter every cash flow.' });
            const shifted = FIN.irr([cfs[0], 0].concat(cfs.slice(1)));
            if (Number.isFinite(shifted)) mistakes.push({ v: P(shifted), why: 'That discounts each inflow one year too many. The first inflow is at t = 1.' });
            const ms = clean(mistakes, P(irr), '%', 2);
            if (ms.length < 3) continue;
            const co = rng.company();
            return {
              q: R`${co}’s project has the cash flows below. What is its **IRR**? The cost of capital is ${T.pctT(k)}.`,
              givens: [['k', L.pctT(k)]],
              table: cfTable([cfs], ['Cash flow']),
              answer: P(irr), unit: '%', dp: 2,
              mistakes: ms,
              steps: [
                R`The IRR is the rate that makes the NPV zero: \[0 = ${cfs.map((c, t) => (t === 0 ? L.moneyT(c) : R`\frac{${L.moneyT(c)}}{(1+IRR)^{${t}}}`)).join(' + ')}\]`,
                R`Solve with the calculator (or by trial and error): \(IRR = ${L.pct(irr)}\).`,
                R`Check: \(NPV\) at \(${L.pct(irr)}\) is \(${L.money(FIN.npv(irr, cfs))}\).`,
                R`\(IRR ${irr > k ? '>' : '<'} k = ${L.pctT(k)}\), so ${irr > k ? 'accept' : 'reject'}.`,
              ],
              calc: irrKeys(cfs, irr),
              why: `At ${T.pct(irr)} the PV of the inflows exactly equals the cost.`,
            };
          }
          return null;
        } },
      { id: 'w4-g-irr-level', topic: 'irr', level: 1, section: 'B', formula: 'irr',
        make(rng) {
          for (let tries = 0; tries < 60; tries++) {
            const n = rng.int(3, 10);
            const cost = rng.step(10, 500, 5) * 1000;
            const c = Math.round(((cost / n) * rng.step(1.1, 2.2, 0.05)) / 100) * 100;
            const cfs = [-cost].concat(Array(n).fill(c));
            const irr = FIN.irr(cfs);
            if (!(irr > 0.02 && irr < 0.5)) continue;
            const irrShort = FIN.irr(cfs.slice(0, -1));
            const mistakes = [
              { v: P(c / cost), why: 'C ÷ cost is the return on a perpetuity. These payments stop after ' + n + ' years.' },
              { v: P((n * c / cost - 1) / n), why: 'That is a simple average return. The IRR discounts each cash flow.' },
            ];
            if (Number.isFinite(irrShort) && irrShort > -0.5) mistakes.push({ v: P(irrShort), why: `That uses ${n - 1} payments instead of ${n}.` });
            return {
              q: R`A project costs ${T.money(cost, 0)} today and returns ${T.money(c, 0)} a year for ${n} years. What is its **IRR**?`,
              givens: [['C_0', L.moneyT(-cost)], ['C', L.moneyT(c)], ['n', String(n)]],
              tl: { cfs, unit: 'Year' },
              answer: P(irr), unit: '%', dp: 2,
              mistakes: clean(mistakes, P(irr), '%', 2),
              steps: [
                R`Find the rate where the PV of the annuity equals the cost: \[${L.moneyT(cost)} = ${L.moneyT(c)} \times \frac{1}{IRR}\left(1 - \frac{1}{(1+IRR)^{${n}}}\right)\]`,
                R`Solve by calculator: \(IRR = ${L.pct(irr)}\).`,
              ],
              calc: `${n} [N] · −${cost} [PV] · ${c} [PMT] · 0 [FV] · [I/YR] → ${T.num(irr * 100)}`,
              why: 'With equal cash flows, the IRR is the interest rate of the annuity: solve for I/YR.',
            };
          }
          return null;
        } },
      { id: 'w4-g-lendborrow', topic: 'pitfalls', level: 2, section: 'A', formula: 'irr', src: 'Lecture W4 Pitfall 3',
        make(rng) {
          const cash = rng.step(1000, 50000, 500);
          const irr = rng.step(0.05, 0.3, 0.01);
          const k = Math.max(0.03, irr + (rng.chance(0.5) ? 1 : -1) * rng.step(0.02, 0.06, 0.01));
          const two = rng.chance(0.5);
          const pay = two ? Math.round(FIN.pmt(cash, irr, 2)) : Math.round(cash * (1 + irr));
          const cfs = two ? [cash, -pay, -pay] : [cash, -pay];
          const irrT = FIN.irr(cfs), npv = FIN.npv(k, cfs);
          if (!Number.isFinite(irrT) || Math.abs(irrT - k) < 0.005 || Math.abs(npv) < 1) return null;
          const hiIrr = irrT > k;
          return {
            kind: 'mcq',
            q: R`A project gives you ${T.money(cash, 0)} today, then costs ${T.money(pay, 0)} ${two ? 'at the end of each of the next two years' : 'in one year'}. Its IRR is ${T.pct(irrT)} and the cost of capital is ${T.pctT(k)}. Should the firm accept it?`,
            table: cfTable([cfs], ['Cash flow']),
            choices: ['Accept: its NPV is positive', 'Reject: its NPV is negative', 'Accept: its IRR is above the cost of capital', 'Reject: its IRR is below the cost of capital'],
            answer: npv > 0 ? 0 : 1,
            wrong: hiIrr ? { 2: 'This is a borrowing-type project (cash in, then out). Its IRR is the rate you pay, so a high IRR is bad.' } : { 3: 'This is a borrowing-type project. Borrowing below the cost of capital is good.' },
            steps: [
              R`The signs are \(+\) then \(-\): you receive cash first and pay later. That is **borrowing**, and the IRR is the rate you pay.`,
              R`\[NPV = ${signedSum(cfs.map((c, t) => disc(c, k, t)))} = ${L.money(npv)}\]`,
            ],
            why: R`${hiIrr ? `Borrowing at ${T.pct(irrT)} when money costs ${T.pctT(k)} destroys value.` : `Borrowing at ${T.pct(irrT)} when money costs ${T.pctT(k)} is cheap.`} \(NPV = ${L.money(npv)}\). Trust the NPV.`,
          };
        } },

      /* ---------- NPV profiles and crossover ---------- */
      { id: 'w4-g-profile0', topic: 'profile', level: 1, section: 'B', src: 'Tutorial W4 Q6',
        make(rng) {
          let n, r, cost, cfs, y0;
          do {
            n = rng.int(3, 5); r = rng.step(0.06, 0.14, 0.01);
            cost = rng.step(20, 400, 10) * 1000;
            cfs = [-cost];
            for (let t = 1; t <= n; t++) cfs.push(Math.round((cost / n) * rng.step(0.8, 1.8, 0.05) / 1000) * 1000);
            y0 = sum(cfs);
          } while (Math.abs(y0) < 0.02 * cost);
          return {
            q: R`A project has the cash flows below, and the cost of capital is ${T.pctT(r)}. Where does its **NPV profile cross the y-axis**?`,
            table: cfTable([cfs], ['Cash flow']),
            answer: y0, unit: '$', dp: 2,
            mistakes: [
              { v: y0 + cost, why: 'Include the initial outlay: the y-intercept is the sum of ALL the cash flows.' },
              { v: FIN.npv(r, cfs), why: 'That is the NPV at the cost of capital. The y-axis is where the discount rate is 0%.' },
            ],
            steps: [R`On the y-axis the discount rate is 0%, so nothing is discounted.`, R`\[NPV_{0\%} = ${signedSum(cfs)} = ${L.money(y0)}\]`],
            why: 'The y-intercept of an NPV profile is the plain sum of the cash flows. The x-intercept is the IRR.',
          };
        } },
      { id: 'w4-g-crossover', topic: 'profile', level: 2, section: 'B', formula: 'crossover', src: 'Lecture W4',
        make(rng) {
          const pr = crossingPair(rng);
          if (!pr) return null;
          const [a, b] = rng.pick(NAMES);
          return {
            q: R`Projects ${a} and ${b} are mutually exclusive. What is their **crossover rate**?`,
            table: cfTable([pr.A, pr.B], [`Project ${a}`, `Project ${b}`]),
            answer: P(pr.cross), unit: '%', dp: 2,
            mistakes: [
              { v: P(pr.irrA), why: `That is the IRR of ${a} alone.` },
              { v: P(pr.irrB), why: `That is the IRR of ${b} alone.` },
              { v: P(pr.irrB - pr.irrA), why: 'The crossover is not the gap between the IRRs. Find the IRR of the differences.' },
            ],
            steps: [
              R`Incremental cash flows \(${a} - ${b}\): ${pr.diff.map((d) => R`\(${L.moneyT(d)}\)`).join(', ')}.`,
              R`The crossover rate is the IRR of these differences: \(${L.pct(pr.cross)}\).`,
              R`Check: at \(${L.pct(pr.cross)}\), \(NPV_{${a}} = NPV_{${b}} = ${L.money(FIN.npv(pr.cross, pr.A))}\).`,
            ],
            calc: irrKeys(pr.diff, pr.cross),
            why: `Below ${T.pct(pr.cross)}, ${a} has the higher NPV. Above it, ${b} does.`,
          };
        } },
      { id: 'w4-g-mutex', topic: 'profile', level: 2, section: 'B', formula: 'npv', src: 'Lecture W4',
        make(rng) {
          for (let tries = 0; tries < 200; tries++) {
            const pr = crossingPair(rng);
            if (!pr) return null;
            const [a, b] = rng.pick(NAMES);
            const k = rng.step(0.04, Math.max(0.05, pr.irrA - 0.02), 0.005);
            if (Math.abs(k - pr.cross) < 0.01) continue;
            const nA = FIN.npv(k, pr.A), nB = FIN.npv(k, pr.B);
            if (nA <= 0 || nB <= 0 || Math.abs(nA - nB) < 0.005 * -pr.B[0]) continue;
            const conflict = k < pr.cross;
            const rMax = Math.ceil((pr.irrB + 0.05) * 20) / 20;
            return {
              kind: 'mcq',
              q: R`Projects ${a} and ${b} are **mutually exclusive**. The cost of capital is ${T.pctT(k)}. Which project should the firm choose?`,
              table: cfTable([pr.A, pr.B], [`Project ${a}`, `Project ${b}`]),
              chart: { type: 'npv', projects: [{ name: `Project ${a}`, cfs: pr.A }, { name: `Project ${b}`, cfs: pr.B }], rMax },
              choices: [`Project ${a}`, `Project ${b}`, 'Both projects', 'Neither project'],
              answer: nA > nB ? 0 : 1,
              wrong: { 2: 'They are mutually exclusive: only one can be chosen.' },
              steps: [
                R`\(NPV_{${a}} = ${L.money(nA)}\) and \(NPV_{${b}} = ${L.money(nB)}\) at \(k = ${L.pctT(k)}\).`,
                R`\(IRR_{${a}} = ${L.pct(pr.irrA)}\) and \(IRR_{${b}} = ${L.pct(pr.irrB)}\). Crossover rate \(= ${L.pct(pr.cross)}\).`,
                conflict ? R`\(k\) is below the crossover rate, so NPV and IRR **conflict**. Follow NPV.` : R`\(k\) is above the crossover rate, so NPV and IRR agree.`,
              ],
              why: R`Choose the higher NPV: Project ${nA > nB ? a : b}. ${conflict ? `${b} has the higher IRR, but that is the wrong rule here.` : ''}`,
            };
          }
          return null;
        } },

      /* ---------- profitability index ---------- */
      { id: 'w4-g-pi', topic: 'pi', level: 1, section: 'B', formula: 'pi', src: 'Lecture W4 Example 2',
        make(rng) {
          for (let tries = 0; tries < 40; tries++) {
            const out = rng.step(50, 800, 25) * 1000, n = rng.int(3, 6), r = rng.step(0.06, 0.14, 0.01);
            const a = Math.round((out / FIN.pvifa(r, n)) * rng.step(0.85, 1.4, 0.01) / 1000) * 1000;
            const pv = FIN.pvAnnuity(a, r, n), npv = pv - out, pi = npv / out;
            if (Math.abs(pi) < 0.03) continue;
            const where = rng.pick(['Geelong', 'Ballarat', 'Bendigo', 'Cairns', 'Darwin', 'Launceston', 'Wollongong', 'Newcastle']);
            return {
              q: R`Opening a store in ${where} costs ${T.money(out, 0)}. It brings in ${T.money(a, 0)} a year for ${n} years. The discount rate is ${T.pctT(r)}. What is its **profitability index (PI)**? (3 decimal places.)`,
              givens: [[R`\text{Outlay}`, L.moneyT(out)], ['C', L.moneyT(a)], ['n', String(n)], ['k', L.pctT(r)]],
              answer: pi, unit: '', dp: 3,
              mistakes: clean([
                { v: pv / out, why: 'That is PV ÷ cost (the textbook version). BFC2140 uses NPV ÷ initial investment.' },
                { v: npv / pv, why: 'Divide by the initial investment, not by the PV of the inflows.' },
                { v: (n * a - out) / out, why: 'Discount the inflows first. Undiscounted profit is not NPV.' },
              ].filter((m) => Math.abs(m.v - pi) >= 0.004), pi, '', 3),
              steps: [
                R`\[PV = ${annuityPV(a, r, n)} = ${L.money(pv)}\]`,
                R`\[NPV = ${L.money(pv)} - ${L.moneyT(out)} = ${L.money(npv)}\]`,
                R`\[PI = \frac{NPV}{\text{Initial investment}} = \frac{${L.money(npv)}}{${L.moneyT(out)}} = ${L.num(pi, 3)}\]`,
              ],
              why: R`${pi > 0 ? R`\(PI > 0\): the store creates value, so accept.` : R`\(PI < 0\): the store destroys value, so reject.`}`,
            };
          }
          return null;
        } },
      { id: 'w4-g-ration', topic: 'pi', level: 3, section: 'B', formula: 'pi', boss: true, src: 'Lecture W4 Example 2',
        make(rng) {
          const CITIES = ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Hobart', 'Darwin', 'Canberra', 'Geelong', 'Cairns'];
          const setName = (s) => list(s.map((p) => p.nm).sort());
          for (let tries = 0; tries < 4000; tries++) {
            const r = rng.step(0.08, 0.12, 0.01), n = 3;
            const ps = rng.sample(CITIES, 4).map((nm) => {
              const out = rng.step(100, 600, 25) * 1000;
              const a = Math.round((out * (1 + rng.step(-0.06, 0.25, 0.005))) / FIN.pvifa(r, n) / 1000) * 1000;
              const npv = -out + FIN.pvAnnuity(a, r, n);
              return { nm, out, a, npv, pi: npv / out };
            });
            const byPi = ps.slice().sort((x, y) => y.pi - x.pi);
            if (byPi.some((p, i) => i > 0 && byPi[i - 1].pi - p.pi < 0.01)) continue;
            const pos = byPi.filter((p) => p.pi > 0);
            if (pos.length < 3) continue;
            const kk = rng.int(2, pos.length - 1);
            const chosen = pos.slice(0, kk);
            const spent = sum(chosen.map((p) => p.out));
            const budget = Math.ceil(spent / 50000) * 50000;
            const rest = pos.slice(kk);
            if (rest.some((p) => p.out <= budget - spent)) continue;
            // brute force: the PI selection must also be the best feasible set
            let best = -Infinity, bestMask = 0;
            for (let mask = 1; mask < 16; mask++) {
              const s = ps.filter((_, i) => mask & (1 << i));
              if (sum(s.map((p) => p.out)) > budget) continue;
              const v = sum(s.map((p) => p.npv));
              if (v > best + 1e-6) { best = v; bestMask = mask; }
            }
            const bestSet = ps.filter((_, i) => bestMask & (1 << i));
            if (setName(bestSet) !== setName(chosen)) continue;
            // NPV-greedy (highest NPV first, skip what does not fit)
            const greedy = [];
            let left = budget;
            ps.slice().sort((x, y) => y.npv - x.npv).forEach((p) => { if (p.npv > 0 && p.out <= left) { greedy.push(p); left -= p.out; } });
            if (setName(greedy) === setName(chosen)) continue;
            const opts = [setName(chosen), setName(greedy), setName(pos)];
            const cheap = ps.slice().sort((x, y) => x.out - y.out).slice(0, kk + 1);
            [setName(ps), setName(cheap), setName(byPi.slice(0, kk - 1).concat(byPi.slice(kk, kk + 1)))].forEach((s) => { if (opts.length < 4 && !opts.includes(s)) opts.push(s); });
            if (new Set(opts).size !== opts.length || opts.length < 4) continue;
            const co = rng.company();
            return {
              kind: 'mcq',
              q: R`${co} wants to open new outlets but faces **hard capital rationing**: it can spend at most ${T.money(budget, 0)} today. Each outlet lasts ${n} years and the discount rate is ${T.pctT(r)}. Using the **PI**, where should it open outlets?`,
              table: { head: ['City', 'Initial outlay', 'Annual inflow'], rows: ps.map((p) => [p.nm, cell(p.out), cell(p.a)]) },
              choices: opts,
              answer: 0,
              wrong: { 1: 'That ranks by NPV. With a budget limit, rank by PI (NPV per dollar invested).', 2: 'That ignores the budget limit.' },
              steps: [
                R`\[\begin{aligned} ${byPi.map((p) => R`\text{${p.nm}}: NPV &= ${L.money(p.npv)}, & PI &= ${L.num(p.pi, 3)}`).join(R` \\ `)} \end{aligned}\]`,
                R`Rank by PI and fund from the top: ${list(chosen.map((p) => p.nm))} cost \(${L.moneyT(spent)}\) in total.`,
                budget === spent ? R`That uses the whole budget. Total NPV \(= ${L.money(sum(chosen.map((p) => p.npv)))}\).`
                  : R`Nothing else with \(PI > 0\) fits in the \(${L.moneyT(budget - spent)}\) left. Total NPV \(= ${L.money(sum(chosen.map((p) => p.npv)))}\).`,
              ],
              why: R`Under hard rationing, rank by \(PI = \frac{NPV}{\text{investment}}\) and fund from the top until the money runs out.`,
            };
          }
          return null;
        } },

      /* ---------- unequal lives ---------- */
      { id: 'w4-g-eaa', topic: 'lives', level: 2, section: 'B', formula: 'eav', src: 'Tutorial W4 Q5',
        make(rng) {
          for (let tries = 0; tries < 40; tries++) {
            const n = rng.int(2, 5), r = rng.step(0.06, 0.14, 0.01);
            const cost = rng.step(20, 300, 5) * 1000;
            const cfs = [-cost];
            for (let t = 1; t <= n; t++) cfs.push(Math.round((cost / FIN.pvifa(r, n)) * rng.step(0.9, 1.35, 0.01) / 500) * 500);
            const npv = FIN.npv(r, cfs);
            if (npv < 0.01 * cost) continue;
            const eaa = FIN.eac(npv, r, n);
            return {
              q: R`This ${n}-year project will be repeated when it ends. The cost of capital is ${T.pctT(r)}. What is its **equivalent annual annuity (EAA)**?`,
              givens: [['k', L.pctT(r)], ['n', String(n)]],
              table: cfTable([cfs], ['Cash flow']),
              answer: eaa, unit: '$', dp: 2,
              mistakes: [
                { v: npv / n, why: 'Dividing the NPV by the life ignores the time value of money. Use the annuity formula.' },
                { v: npv * r, why: 'NPV × k is a perpetuity payment. This project lasts only ' + n + ' years.' },
                { v: npv, why: 'That is the NPV. Spread it over the life as an annuity.' },
              ],
              steps: [
                ...npvSteps(cfs, r),
                R`\[EAA = \frac{NPV \times k}{1 - \frac{1}{(1+k)^{n}}} = \frac{${L.money(npv)} \times ${L.dec(r)}}{1 - \frac{1}{(${L.onePlus(r)})^{${n}}}} = ${L.money(eaa)}\]`,
              ],
              calc: `${npvKeys(cfs, r)} · then ${n} [N] · ${rateKey(r)} [I/YR] · −${T.num(npv).replace(/,/g, '')} [PV] · 0 [FV] · [PMT] → ${T.money(eaa)}`,
              why: 'The EAA is the level annual payment with the same NPV as the project.',
            };
          }
          return null;
        } },
      { id: 'w4-g-eaa-choose', topic: 'lives', level: 2, section: 'B', formula: 'eav', src: 'Tutorial W4 Q5',
        make(rng) {
          const want = rng.pick(['long', 'long', 'conflict', 'conflict', 'any']);
          for (let tries = 0; tries < 400; tries++) {
            const nS = rng.pick([2, 3]), nL = nS + rng.int(2, 3), r = rng.step(0.06, 0.14, 0.01);
            const cost = rng.step(20, 200, 5) * 1000;
            const cS = Math.round((cost / FIN.pvifa(r, nS)) * rng.step(1.02, 1.12, 0.005) / 500) * 500;
            const cL = Math.round((cost / FIN.pvifa(r, nL)) * rng.step(1.02, 1.12, 0.005) / 500) * 500;
            const S = [-cost].concat(Array(nS).fill(cS)), Lp = [-cost].concat(Array(nL).fill(cL));
            const npvS = FIN.npv(r, S), npvL = FIN.npv(r, Lp);
            if (npvS <= 0 || npvL <= 0) continue;
            const eS = FIN.eac(npvS, r, nS), eL = FIN.eac(npvL, r, nL);
            if (Math.abs(eS - eL) < 0.03 * Math.max(eS, eL)) continue;
            const conflict = (npvL > npvS) !== (eL > eS);
            if (want === 'long' && !(eL > eS)) continue;
            if (want === 'conflict' && !conflict) continue;
            const [a, b] = rng.pick([['S', 'L'], ['A', 'B'], ['X', 'Y']]);
            const tab = { head: ['Year', `Project ${a}`, `Project ${b}`], rows: Lp.map((c, t) => [t, t <= nS ? cell(S[t]) : '', cell(c)]) };
            return {
              kind: 'mcq',
              q: R`Projects ${a} (${nS} years) and ${b} (${nL} years) are mutually exclusive. Whichever is chosen will be **repeated** into the future. The cost of capital is ${T.pctT(r)}. Which should be chosen?`,
              table: tab,
              choices: [`Project ${a}`, `Project ${b}`, 'Either: they create the same value', 'Neither: both destroy value'],
              answer: eS > eL ? 0 : 1,
              steps: [
                R`\(NPV_{${a}} = ${L.money(npvS)}\) and \(NPV_{${b}} = ${L.money(npvL)}\). The lives differ, so compare yearly equivalents.`,
                R`\[EAA_{${a}} = \frac{${L.money(npvS)} \times ${L.dec(r)}}{1 - \frac{1}{(${L.onePlus(r)})^{${nS}}}} = ${L.money(eS)}\]`,
                R`\[EAA_{${b}} = \frac{${L.money(npvL)} \times ${L.dec(r)}}{1 - \frac{1}{(${L.onePlus(r)})^{${nL}}}} = ${L.money(eL)}\]`,
              ],
              why: R`Pick the higher EAA: Project ${eS > eL ? a : b}.${conflict ? ' The naive NPV points the other way, because it ignores the difference in lives.' : ''}`,
            };
          }
          return null;
        } },
      { id: 'w4-g-eac-cost', topic: 'lives', level: 2, section: 'B', formula: 'eav', src: 'Lecture W4 (air cleaners)',
        make(rng) {
          const p = rng.step(1000, 30000, 500), oc = rng.step(100, 4000, 50), n = rng.int(3, 12), r = rng.step(0.05, 0.14, 0.01);
          const npv = -p - FIN.pvAnnuity(oc, r, n), eac = FIN.eac(npv, r, n);
          const thing = rng.pick(['an air cleaner', 'a water filter', 'a forklift', 'a server', 'an air compressor']);
          return {
            q: R`A factory needs ${thing}. **Model ${rng.pick(['X', 'K', 'Z', 'Q'])}** costs ${T.money(p, 0)} today, ${T.money(oc, 0)} a year to run and lasts ${n} years. The cost of capital is ${T.pctT(r)}. What is its **equivalent annual cost (EAC)**? (Enter a cost as a negative number.)`,
            givens: [[R`\text{Price}`, L.moneyT(p)], [R`\text{Running cost}`, L.moneyT(oc)], ['n', String(n)], ['k', L.pctT(r)]],
            answer: eac, unit: '$', dp: 2,
            mistakes: [
              { v: -oc, why: 'That is only the running cost. The purchase price must be spread over the life too.' },
              { v: npv / n, why: 'Dividing the NPV by the life ignores the time value of money.' },
              { v: npv, why: 'That is the NPV of all the costs. Turn it into an equal yearly amount.' },
            ],
            steps: [
              R`\[NPV = -${L.moneyT(p)} - ${annuityPV(oc, r, n)} = ${L.money(npv)}\]`,
              R`\[EAC = \frac{NPV \times k}{1 - \frac{1}{(1+k)^{n}}} = \frac{${L.money(npv)} \times ${L.dec(r)}}{1 - \frac{1}{(${L.onePlus(r)})^{${n}}}} = ${L.money(eac)}\]`,
            ],
            calc: `${n} [N] · ${rateKey(r)} [I/YR] · ${keyNum(npv)} [PV] · 0 [FV] · [PMT] → ${T.money(-eac)}`,
            why: 'The EAC is the equal yearly cost with the same PV as buying and running the machine. Compare EACs across machines with different lives.',
          };
        } },
      { id: 'w4-g-chain', topic: 'lives', level: 3, section: 'B', formula: 'npv', boss: true, src: 'Tutorial W4 Q5',
        make(rng) {
          const [ns, m] = rng.pick([[2, 2], [3, 2], [2, 3]]);
          const nl = ns * m, r = rng.step(0.06, 0.14, 0.01);
          const cost = rng.step(20, 200, 5) * 1000;
          const c = Math.round((cost / FIN.pvifa(r, ns)) * rng.step(1.03, 1.2, 0.01) / 500) * 500;
          const one = [-cost].concat(Array(ns).fill(c));
          const npv1 = FIN.npv(r, one), chain = FIN.chainNPV(npv1, r, ns, m);
          const flows = Array(nl + 1).fill(0);
          for (let j = 0; j < m; j++) { flows[j * ns] -= cost; for (let t = 1; t <= ns; t++) flows[j * ns + t] += c; }
          const offByOne = sum(Array.from({ length: m }, (_, j) => npv1 / Math.pow(1 + r, j * (ns + 1))));
          return {
            q: R`Project S lasts ${ns} years. It competes with a ${nl}-year project, and whichever wins will be repeated. To match lives, S is run ${m} times in a row. The cost of capital is ${T.pctT(r)}. What is the **NPV of the S chain** over ${nl} years?`,
            givens: [['k', L.pctT(r)], [R`\text{Cycles}`, String(m)]],
            table: cfTable([one], ['Project S (one cycle)']),
            tl: { cfs: flows, unit: 'Year', hi: Array.from({ length: m - 1 }, (_, j) => (j + 1) * ns) },
            answer: chain, unit: '$', dp: 2,
            mistakes: [
              { v: npv1, why: 'That is one cycle only. Repeat S until it matches the other project’s life.' },
              { v: m * npv1, why: 'Each later cycle starts in the future, so discount its NPV back to today.' },
              { v: offByOne, why: `A new cycle starts in the year the previous one ends (year ${ns}), not a year later.` },
            ],
            steps: [
              R`One cycle: \(NPV_1 = ${L.money(npv1)}\).`,
              R`Each new cycle starts when the last one ends, so its NPV is valued at \(t = ${ns}${m > 2 ? `, ${2 * ns}` : ''}\).`,
              R`\[NPV_{chain} = ${Array.from({ length: m }, (_, j) => (j === 0 ? L.money(npv1) : R`\frac{${L.money(npv1)}}{(${L.onePlus(r)})^{${j * ns}}}`)).join(' + ')} = ${L.money(chain)}\]`,
            ],
            calc: npvKeys(flows, r),
            why: R`Replacement chain: repeat the short project until both end together, then compare NPVs over the same ${nl} years.`,
          };
        } },
      { id: 'w4-g-retire', topic: 'lives', level: 3, section: 'B', boss: true, src: 'Lecture W4 recap (General Foods)',
        make(rng) {
          for (let tries = 0; tries < 200; tries++) {
            const age = rng.int(4, 9), life = rng.pick([2, 3]), r = rng.step(0.06, 0.14, 0.01);
            const rv = [rng.step(8, 40, 1) * 1000];
            const cf = [null];
            for (let j = 1; j <= life; j++) {
              cf.push(j === 1 ? rng.step(6, 30, 1) * 1000 : Math.round((cf[j - 1] * rng.step(0.3, 1.1, 0.05)) / 1000) * 1000);
              rv.push(j === life ? 0 : Math.round((rv[j - 1] * rng.step(0.3, 0.7, 0.05)) / 1000) * 1000);
            }
            const pvs = [];
            for (let j = 0; j <= life; j++) {
              let v = rv[j] / Math.pow(1 + r, j);
              for (let i = 1; i <= j; i++) v += cf[i] / Math.pow(1 + r, i);
              pvs.push(v);
            }
            const best = pvs.indexOf(Math.max(...pvs));
            const sorted = pvs.slice().sort((x, y) => y - x);
            if (sorted[0] - sorted[1] < 0.02 * sorted[0]) continue;
            const choices = pvs.map((_, j) => (j === 0 ? `Now, at the end of year ${age}` : `At the end of year ${age + j}`));
            if (choices.length < 4) choices.push('It does not matter: every option is worth the same');
            const co = rng.company();
            return {
              kind: 'mcq',
              q: R`${co} owns a machine that is ${age} years old. It can last ${life} more years at most. The cost of capital is ${T.pctT(r)} and there is no tax. When should the machine be **retired**?`,
              table: { head: ['End of year', 'Net cash flow', 'Residual value'], rows: rv.map((v, j) => [age + j, j === 0 ? '—' : cell(cf[j]), cell(v)]) },
              choices,
              answer: best,
              steps: pvs.map((v, j) => (j === 0 ? R`Retire now: \(${L.money(v)}\).`
                : R`Retire at the end of year ${age + j}: \(${Array.from({ length: j }, (_, i) => R`\frac{${L.moneyT(cf[i + 1])}${i + 1 === j && rv[j] > 0 ? ' + ' + L.moneyT(rv[j]) : ''}}{(${L.onePlus(r)})^{${i + 1}}}`).join(' + ')} = ${L.money(v)}\).`)),
              why: R`Compare the PV of every retirement date and pick the highest: ${best === 0 ? 'retire now' : `keep it to the end of year ${age + best}`} (\(${L.money(pvs[best])}\)).`,
            };
          }
          return null;
        } },

      /* ---------- basics: sign patterns ---------- */
      { id: 'w4-g-signs', topic: 'basics', level: 1, section: 'A', src: 'Lecture W4',
        make(rng) {
          const k = rng.pick([1, 1, 2, 2, 3, 4]);
          const flips = rng.sample([1, 2, 3, 4, 5], k).sort((x, y) => x - y);
          let cur = rng.chance(0.8) ? -1 : 1;
          const s = [];
          for (let t = 0; t <= 5; t++) { if (flips.includes(t)) cur = -cur; s.push(cur < 0 ? '−' : '+'); }
          return {
            kind: 'mcq',
            q: R`A project’s cash flows have the signs below. How is it classified?`,
            table: { head: ['Year', '0', '1', '2', '3', '4', '5'], rows: [['Sign'].concat(s)] },
            choices: ['Conventional: one sign change', 'Non-conventional: two sign changes', 'Non-conventional: three sign changes', 'Non-conventional: four sign changes'],
            answer: k - 1,
            steps: [R`Read the signs left to right and count every switch between \(+\) and \(-\): there ${k === 1 ? 'is 1 switch' : `are ${k} switches`}.`],
            why: R`One sign change is conventional. More than one is non-conventional, and the project can have up to ${k} IRR${k > 1 ? 's' : ''}.`,
          };
        } },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
