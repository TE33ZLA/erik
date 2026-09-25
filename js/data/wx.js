/* Floor 9 — Weeks 10–11 (preview): cost of capital and capital structure.
 * The course zip had no lecture slides for these weeks. This pack is built only from the formula sheet
 * sections "Cost of Capital", "Capital Structure – No Tax World" and "Capital Structure – Tax World",
 * using the standard Berk/DeMarzo treatment that matches those formulas.
 */
(function (root) {
  'use strict';
  const { FIN, L, T, TI } = root;
  const R = String.raw;
  const P = (r) => +(r * 100).toFixed(8); // decimal rate -> percent units for answers

  /* ---------- TI-Nspire helpers ---------- */
  const tn = (x) => TI.num(x);                                  // a number as typed on the TI
  /** options for a last step whose decimal result is the answer in % */
  const PCT = (v) => ({ pct: true, note: R`That is \(${L.pct(v, 2)}\).` });

  /* ---------- local helpers ---------- */
  const pc = (r, dp = 2) => L.pct(r, dp);        // LaTeX percent from a decimal
  const pcT = (r, dp = 4) => L.pctT(r, dp);      // LaTeX percent, trailing zeros trimmed
  const nt = (x, dp = 4) => L.numT(x, dp);       // LaTeX number, trimmed
  const tp = (r, dp = 2) => T.pctT(r, dp);       // plain-text percent, trimmed
  const mT = (x) => T.moneyT(x, 2) + 'm';        // plain-text millions: $120.5m, $233.75m
  const mL = (x) => L.moneyT(x, 2) + R`\text{m}`; // LaTeX millions: \$120.5\text{m}
  const DE_SET = [0.25, 0.4, 0.5, 0.6, 0.75, 1.5, 2];

  /* ---------- lesson data (every number is computed here) ---------- */
  const YTM_EX = FIN.bondYieldPeriodic(960, 1000, 60, 5);    // L3 example: 5 years, 6% annual coupon, price $960
  const YTM_G = FIN.bondYieldPeriodic(1050, 1000, 80, 10);   // L3 guided: 10 years, 8% annual coupon, price $1,050
  const WG = { n: 50, px: 8, face: 200, pct: 0.95, re: 0.13, rd: 0.07, tc: 0.3 }; // L4 guided: WACC from market data
  WG.E = WG.n * WG.px; WG.D = WG.face * WG.pct; WG.w = FIN.wacc({ E: WG.E, D: WG.D, re: WG.re, rd: WG.rd, tc: WG.tc });
  const MG = { rU: 0.10, rD: 0.06, D: 250, E: 500 };        // L5 guided: no taxes
  MG.rE = FIN.rELevNoTax(MG.rU, MG.rD, MG.D, MG.E); MG.w = FIN.wacc({ E: MG.E, D: MG.D, re: MG.rE, rd: MG.rD });
  const SG = { D: 150, rD: 0.06, tc: 0.3, VU: 500 };         // L6 guided: the tax shield
  SG.int = SG.D * SG.rD; SG.its = FIN.interestTaxShield(SG.int, SG.tc); SG.pv = FIN.pvTaxShieldPerm(SG.D, SG.tc);
  const TG = { rU: 0.12, rD: 0.08, D: 300, E: 600, tc: 0.25 }; // L7 guided: taxes
  TG.rE = FIN.rELevTax(TG.rU, TG.rD, TG.D, TG.E, TG.tc); TG.w = FIN.wacc({ E: TG.E, D: TG.D, re: TG.rE, rd: TG.rD, tc: TG.tc });
  const Q12 = FIN.wacc({ E: 600, P: 100, D: 300, re: 0.12, rp: 0.08, rd: 0.06, tc: 0.3 }); // the WACC of wx-q12

  /** Drop distractors that would display exactly like the answer or like an earlier distractor. */
  function tidy(q) {
    if (!q || (q.kind && q.kind !== 'num') || !q.mistakes) return q;
    const dp = q.dp === undefined ? 2 : q.dp;
    const show = (v) => root.FMT.answerText(v, q.unit || '', dp);
    const seen = new Set([show(q.answer)]);
    q.mistakes = q.mistakes.filter((m) => { if (!Number.isFinite(m.v)) return false; const d = show(m.v); if (seen.has(d)) return false; seen.add(d); return true; });
    return q;
  }

  const pack = {
    id: 'wx', floor: 9, week: 'Weeks 10–11 (preview)',
    title: 'The Capital Summit',
    topic: 'Cost of capital and capital structure (formula sheet preview)',
    color: '#546e7a', icon: '⛰️',
    intro: 'You have reached the Capital Summit. This floor is a preview built from the formula sheet. Find out what money really costs a firm, and whether debt changes the value of the firm.',

    briefing: [
      { h: 'Read this first: a preview floor', points: [
        R`This floor is a **preview**. The course zip had **no lecture slides for Weeks 10–11**.`,
        R`It is built only from the formula sheet sections **Cost of Capital**, **Capital Structure – No Tax World** and **Capital Structure – Tax World**, using the standard textbook (Berk/DeMarzo) approach.`,
        R`When the Week 10 and 11 lectures are released, **check this floor against them**. If your lecturer uses different wording or conventions, follow your lecturer.`,
      ] },
      { h: 'The cost of each source of capital', points: [
        R`**Preference shares** pay a fixed dividend forever, so their cost is \(R_p = \frac{DIV_p}{P_p}\): the dividend over today’s market price.`,
        R`**Equity:** use CAPM, \(r_E = r_f + \beta_E(E[R_M] - r_f)\) (Week 9), or the dividend growth model, \(r_E = \frac{D_1}{P_0} + g\) (Week 3).`,
        R`**Debt:** the pre-tax cost \(r_d\) is the **yield to maturity** on the firm’s bonds, not the coupon rate.`,
        R`Interest is **tax deductible**, so the after-tax cost of debt is \(r_d(1 - T_c)\). Preference dividends are not tax deductible.`,
      ] },
      { h: 'The weighted average cost of capital (WACC)', points: [
        R`\(r_{WACC} = r_e\frac{E}{V} + r_p\frac{P}{V} + r_d(1 - T_c)\frac{D}{V}\), where \(V = E + P + D\).`,
        R`Use **market values** for \(E\), \(P\) and \(D\) (for example, number of shares × share price), not book values.`,
        R`The WACC is the discount rate for projects with the **same risk as the firm’s average project**, financed with the same mix of debt and equity.`,
        R`A riskier project needs a higher rate. Discounting it at the WACC could accept a project whose true NPV is negative.`,
      ] },
      { h: 'Capital structure with no taxes (MM)', points: [
        R`Assume a **perfect capital market**: no taxes, no transaction or issue costs, and financing does not change the cash flows from the firm’s assets.`,
        R`\(E + D = U = A\): levered equity plus debt equals the value of the unlevered (all-equity) firm, which equals the value of its assets.`,
        R`**Proposition I:** firm value does not depend on how it is financed. Slicing a pie differently does not change its size.`,
        R`The unlevered (asset) cost of capital: \(r_U = r_A = r_E\frac{E}{E+D} + r_D\frac{D}{E+D}\).`,
        R`**Proposition II:** \(r_E = r_U + \frac{D}{E}(r_U - r_D)\). More debt makes equity riskier, so \(r_E\) rises. The WACC stays equal to \(r_U\).`,
      ] },
      { h: 'Capital structure with corporate taxes', points: [
        R`Interest is tax deductible, so debt creates an **interest tax shield** of \(\text{Interest} \times T_c\) each year.`,
        R`For **permanent debt**: \(PV(\text{interest tax shield}) = T_c \times D\).`,
        R`\(V_L = V_U + PV(\text{interest tax shield})\): with taxes, debt **adds value**, because the government collects less tax.`,
        R`\(r_E = r_U + \frac{D}{E}(r_U - r_D)(1 - T_c)\): \(r_E\) still rises with debt, but more slowly than with no taxes.`,
        R`\(r_{WACC} = r_E\frac{E}{E+D} + r_D\frac{D}{E+D}(1 - T_c)\): the WACC **falls** as leverage rises.`,
      ] },
      { h: 'On your TI-Nspire CX CAS', points: [
        R`Most of this floor is typing a formula in one line, e.g. CAPM: \(0.04 + 1.2 \times (0.10 - 0.04)\). The result is a decimal: \(0.112 = 11.2\%\).`,
        R`Pre-tax cost of debt = the bond’s YTM: \(\text{tvmI}(N, -\text{price}, \text{coupon}, 1000, 1, 1)\) gives it in %. Then \(\text{ans} \times (1 - T_c)\) is the after-tax cost.`,
        R`WACC: multiply each cost by its market value, add, and divide by the total, e.g. \((0.12 \times 600 + 0.08 \times 100 + 0.06(1 - 0.3) \times 300) \div 1000\).`,
        R`Two-step problems: the next line can use \(\text{ans}\), the last answer.`,
      ] },
    ],

    topics: {
      equity: 'Cost of equity (CAPM and dividend growth)',
      debtpref: 'Cost of debt and preference shares',
      wacc: 'Weighted average cost of capital',
      mmnt: 'Capital structure: no-tax world',
      mmt: 'Capital structure: tax world',
    },

    nodes: [
      { id: 'wx-L1', kind: 'lesson', name: 'What capital costs a firm', lesson: 'wx-L1' },
      { id: 'wx-L2', kind: 'lesson', name: 'The cost of equity', lesson: 'wx-L2' },
      { id: 'wx-L3', kind: 'lesson', name: 'The cost of debt and preference shares', lesson: 'wx-L3' },
      { id: 'wx-L4', kind: 'lesson', name: 'The WACC', lesson: 'wx-L4' },
      { id: 'wx-1', kind: 'battle', name: 'Base Camp', topics: ['equity', 'debtpref', 'wacc'], n: 6,
        enemy: { name: 'WACC-a-Mole', title: 'Pops up at the weighted average', body: 'round', color: '#8d6e63', acc: ['hardhat'], mouth: 'grin', item: '🔨',
          lines: { intro: 'Pop! I appear at the weighted average. Can you hit me?', hit: ['Bonk! Market-value weights!', 'You remembered the tax on debt! Ouch!'],
            taunt: ['Book values? Pop! Missed me!', 'Pre-tax debt? I am still up here!'], win: 'Whacked… at exactly the WACC…', lose: 'Pop! Your discount rate is all wrong!' } } },
      { id: 'wx-L5', kind: 'lesson', name: 'Capital structure with no taxes', lesson: 'wx-L5' },
      { id: 'wx-2', kind: 'battle', name: 'The Leverage Ledge', topics: ['mmnt', 'wacc'], n: 6,
        enemy: { name: 'The Leverage Yak', title: 'Thinks debt makes the pie bigger', body: 'blob', color: '#a1887f', acc: ['horns'], mouth: 'o', item: '🥧',
          lines: { intro: 'Yak yak! More debt means more value! Everybody knows that!', hit: ['Same size pie? Yak… you are right.', 'The cost of equity went up? Yak!'],
            taunt: ['Yak yak! Debt is cheap, so the WACC must fall!', 'D over V, D over E… same thing, yak!'], win: 'The pie… is the same size… however I slice it…', lose: 'Yak-yak! Leverage for everyone!' } } },
      { id: 'wx-L6', kind: 'lesson', name: 'Taxes and the interest tax shield', lesson: 'wx-L6' },
      { id: 'wx-L7', kind: 'lesson', name: 'Cost of equity and WACC with taxes', lesson: 'wx-L7' },
      { id: 'wx-m1', kind: 'mini', name: 'Up, Down or Same?', mini: 'up-down' },
      { id: 'wx-3', kind: 'battle', name: 'Tax Shield Pass', topics: ['mmt', 'debtpref'], n: 6,
        enemy: { name: 'The Tax Shield Sherpa', title: 'Carries your interest past the taxman', body: 'tall', color: '#607d8b', acc: ['cap'], mouth: 'smirk', item: '🛡️',
          lines: { intro: 'I carry your interest past the taxman. For a small fee, of course.', hit: ['Tax rate times debt. You know this trail.', 'The shield is yours, climber.'],
            taunt: ['You forgot to multiply by the tax rate!', 'That is the interest, not the shield!'], win: 'You crossed the pass… without me…', lose: 'The taxman takes his share!' } } },
      { id: 'wx-boss', kind: 'boss', name: 'The Summit', topics: '*', n: 10,
        enemy: { name: 'The Abominable Debt-Man', title: 'Borrows, and borrows, and borrows', body: 'spiky', color: '#90a4ae', acc: ['horns'], eyes: 3, mouth: 'fangs', item: '❄️',
          lines: { intro: 'ROAR! I am the Abominable Debt-Man. I borrow, and borrow, and BORROW!', hit: ['Your WACC… is correct?!', 'You levered and unlevered like a pro!'],
            taunt: ['More debt! Always more debt!', 'Your tax shield melts in the snow!'], win: 'The summit… is yours…', lose: 'Buried under an avalanche of debt!' } } },
    ],

    minis: {
      'up-down': {
        game: 'rapid', title: 'Up, Down or Same?', intro: 'Something changes at the firm. Does the quantity go up, go down, or stay the same? Watch out for whether there are taxes!',
        bins: [{ id: 'up', label: 'Up' }, { id: 'down', label: 'Down' }, { id: 'same', label: 'Same' }],
        items: [
          { t: 'No taxes. The firm swaps equity for debt. Firm value?', bin: 'same', why: 'MM Proposition I: with no taxes, financing does not change firm value.' },
          { t: 'No taxes. The firm swaps equity for debt. Cost of equity?', bin: 'up', why: R`Proposition II: \(r_E = r_U + \frac{D}{E}(r_U - r_D)\) rises as \(\frac{D}{E}\) rises.` },
          { t: 'No taxes. The firm swaps equity for debt. WACC?', bin: 'same', why: R`With no taxes the rise in \(r_E\) exactly offsets the cheaper debt. The WACC stays at \(r_U\).` },
          { t: 'No taxes. The firm swaps equity for debt. Unlevered cost of capital?', bin: 'same', why: R`\(r_U = r_A\) depends on the risk of the assets, not on the financing.` },
          { t: 'No taxes. The firm repays all of its debt. Cost of equity?', bin: 'down', why: R`With no debt, \(r_E\) falls back to \(r_U\).` },
          { t: 'With taxes. The firm adds permanent debt. Firm value?', bin: 'up', why: R`\(V_L = V_U + T_c D\): the interest tax shield adds value.` },
          { t: 'With taxes. The firm adds debt. WACC?', bin: 'down', why: R`The after-tax cost of debt is cheap, and \(r_E\) rises only slowly, so the WACC falls.` },
          { t: 'With taxes. The firm adds debt. Cost of equity?', bin: 'up', why: R`\(r_E = r_U + \frac{D}{E}(r_U - r_D)(1 - T_c)\) still rises, just more slowly.` },
          { t: 'With taxes. The firm adds debt. Tax paid to the government?', bin: 'down', why: 'Interest is tax deductible, so taxable profit and tax paid fall.' },
          { t: 'With taxes. The firm issues more permanent debt. Interest tax shield each year?', bin: 'up', why: R`More debt means more interest, and the shield is \(\text{Interest} \times T_c\).` },
          { t: 'With taxes. The firm adds debt. Value of the same firm if unlevered?', bin: 'same', why: R`\(V_U\) is the value of the assets with no debt. Borrowing does not change it.` },
          { t: 'The company tax rate rises. After-tax cost of debt?', bin: 'down', why: R`\(r_d(1 - T_c)\) falls when \(T_c\) rises.` },
          { t: 'The company tax rate rises. PV of the tax shield on permanent debt?', bin: 'up', why: R`\(PV = T_c \times D\) rises with \(T_c\).` },
          { t: 'The firm’s equity beta rises. Cost of equity (CAPM)?', bin: 'up', why: R`\(r_E = r_f + \beta_E(E[R_M] - r_f)\) rises with beta.` },
          { t: 'The risk-free rate falls; the market risk premium is unchanged. Cost of equity (CAPM)?', bin: 'down', why: R`\(r_f\) falls and the premium \(\beta_E(E[R_M] - r_f)\) is unchanged, so \(r_E\) falls.` },
          { t: 'The preference share price rises; the dividend is fixed. Cost of preference shares?', bin: 'down', why: R`\(R_p = \frac{DIV_p}{P_p}\) falls when \(P_p\) rises.` },
          { t: R`The share price rises; \(D_1\) and \(g\) are unchanged. Cost of equity (dividend growth model)?`, bin: 'down', why: R`\(r_E = \frac{D_1}{P_0} + g\) falls when \(P_0\) rises.` },
          { t: R`Forecast dividend growth \(g\) rises; \(D_1\) and the price are unchanged. Cost of equity (dividend growth model)?`, bin: 'up', why: R`\(r_E = \frac{D_1}{P_0} + g\) rises with \(g\).` },
          { t: 'The firm’s bonds fall in price. Pre-tax cost of debt?', bin: 'up', why: 'A lower bond price means a higher yield to maturity, which is the cost of debt.' },
          { t: 'The share price doubles; the value of debt is unchanged. Weight of equity in the WACC?', bin: 'up', why: R`\(\frac{E}{V}\) uses market values, so a higher share price raises the equity weight.` },
        ],
        rounds: 12, seconds: 15,
      },
    },

    lessons: {
      'wx-L1': {
        title: 'What capital costs a firm',
        goal: R`Explain why a firm’s cost of capital is the return its investors require.`,
        topics: ['equity', 'debtpref', 'wacc'],
        cards: [
          { kind: 'learn', title: 'A preview floor',
            body: R`This floor is a **preview** of Weeks 10 and 11. The course zip had **no lecture slides** for those weeks, so everything here is built only from the **formula sheet**.\n\nWhen the Week 10 and 11 lectures come out, check this floor against them. If your lecturer says something different, follow your lecturer.` },
          { kind: 'learn', title: 'Where a firm’s money comes from',
            body: R`A firm pays for its assets with money from investors. This money is its **capital**. There are three main sources:`,
            points: [R`**Debt**: bank loans and **bonds** (loans the firm sells to investors). Lenders get interest, and they are paid first.`, R`**Preference shares**: they pay a fixed dividend, before the ordinary shareholders get anything.`, R`**Equity** (ordinary shares): the owners. They get whatever is left.`] },
          { kind: 'learn', title: 'The cost of capital',
            body: R`Investors could put their money somewhere else with the same risk. So they only give it to the firm if they expect at least that return.\n\nThat **required return** is what the money costs the firm. So the **cost of capital** is the return investors require. From Week 9: the riskier the investment, the higher the required return.` },
          { kind: 'learn', title: 'Riskier claims cost more',
            body: 'Who is paid first decides who bears the most risk.',
            table: { head: ['Source', 'Paid', 'Risk to the investor', 'Cost to the firm'], rows: [['Debt', 'First', 'Lowest', 'Lowest'], ['Preference shares', 'Second', 'Middle', 'Middle'], ['Equity', 'Last', 'Highest', 'Highest']] } },
          { kind: 'check', ref: 'wx-q05' },
          { kind: 'learn', title: 'The plan for this floor',
            body: R`First, find the cost of each source: equity \(r_E\), preference shares \(r_p\) and debt \(r_d\).\n\nThen blend them into one rate, the **weighted average cost of capital** (WACC). It is the discount rate for the firm’s typical project.\n\nFinally, a big question: can a firm become more valuable just by changing its mix of debt and equity?` },
          { kind: 'check', q: { kind: 'mcq', q: R`Which source of capital usually has the **lowest** required return?`,
            choices: ['Debt, because lenders are paid first', 'Ordinary equity, because shareholders own the firm', 'Preference shares, because their dividend is fixed', 'They all cost the same'], answer: 0,
            why: R`Lenders are paid first and have a legal claim. Debt is the safest claim, so investors accept the lowest return on it.` } },
          { kind: 'recap', title: 'Remember', points: [
            R`This floor is a **preview** built from the formula sheet. Check it against the Week 10–11 lectures.`,
            R`The **cost of capital** is the return investors require.`,
            R`Riskier claims cost more: debt, then preference shares, then equity.`,
            R`The WACC blends the three costs into one discount rate.`,
            R`Exam trap: each cost is what investors require **today**. For debt that is the yield to maturity, not the coupon rate.`,
          ] },
        ],
      },
      'wx-L2': {
        title: 'The cost of equity',
        goal: R`Estimate the cost of equity with CAPM and with the dividend growth model.`,
        topics: ['equity'],
        cards: [
          { kind: 'learn', title: 'Two ways to estimate it',
            body: R`Shareholders are not promised a rate, so you have to estimate what they require. The formula sheet gives two ways, both from earlier weeks:`,
            points: [R`**CAPM** (Week 9): \(r_E = r_f + \beta_E(E[R_M] - r_f)\).`, R`The **dividend growth model** (Week 3): \(r_E = \frac{D_1}{P_0} + g\).`] },
          { kind: 'learn', title: 'Method 1: CAPM',
            body: R`CAPM says shareholders require the risk-free rate plus a reward for the systematic risk they bear:\n\n\[r_E = r_f + \beta_E\left(E[R_M] - r_f\right)\]\n\n\(\beta_E\) is the beta of the firm’s shares, its **equity beta**.`,
            formula: 'capm' },
          { kind: 'example', title: 'Worked example', q: R`A firm’s shares have a beta of 1.2. The risk-free rate is 4% and the expected market return is 10%. What is its cost of equity?`,
            steps: [R`Market risk premium: \(10\% - 4\% = 6\%\).`, R`\(r_E = 4\% + 1.2 \times 6\% = 4\% + 7.2\% = 11.2\%\).`],
            answer: R`\(r_E = ${pc(FIN.capm(0.04, 1.2, 0.10), 1)}\).`,
            ti: [TI.line('0.04+1.2*(0.10-0.04)', PCT(FIN.capm(0.04, 1.2, 0.10)))] },
          { kind: 'check', gen: 'wx-g-ke-capm' },
          { kind: 'learn', title: 'Method 2: the dividend growth model',
            body: R`In Week 3 a share’s price was \(P_0 = \frac{D_1}{r_E - g}\): next year’s dividend over the required return minus the growth rate.\n\nRearrange it for \(r_E\):\n\n\[r_E = \frac{D_1}{P_0} + g\]\n\nThe cost of equity is the **dividend yield** \(\frac{D_1}{P_0}\) plus the **growth rate** \(g\).`,
            formula: 'total-return',
            tip: R`\(D_1\) is **next** year’s dividend: \(D_1 = D_0(1 + g)\), where \(D_0\) is the dividend just paid.` },
          { kind: 'example', title: 'Worked example', q: R`A share has just paid a dividend of $1.50. Dividends grow at 4% a year forever. The share price is $26.00. What is the cost of equity?`,
            steps: [R`Next dividend: \(D_1 = 1.50 \times 1.04 = \$1.56\).`, R`Dividend yield: \(\frac{1.56}{26.00} = 0.06 = 6\%\).`, R`\(r_E = 6\% + 4\% = 10\%\).`],
            answer: R`\(r_E = ${pc((1.5 * 1.04) / 26 + 0.04, 0)}\).`,
            ti: [TI.line('1.5*1.04/26+0.04', PCT((1.5 * 1.04) / 26 + 0.04))] },
          { kind: 'guided', title: 'Your turn', q: R`Wombat Widgets has just paid a dividend of $2.00 per share. Dividends grow at 5% a year forever. The share price is $35.00. Find the cost of equity.`,
            parts: [
              { ask: R`What is \(D_1\)?`, answer: 2 * 1.05, unit: '$', dp: 2, hint: R`\(D_1 = D_0(1 + g)\).`, why: R`\(2.00 \times 1.05 = \$2.10\).`,
                mistakes: [{ v: 2, why: R`That is \(D_0\), the dividend just paid. Grow it by \(g\).` }] },
              { ask: R`What is the dividend yield, \(\frac{D_1}{P_0}\)?`, answer: P((2 * 1.05) / 35), unit: '%', dp: 2, hint: R`\(\frac{2.10}{35.00}\), then multiply by 100.`, why: R`\(\frac{2.10}{35.00} = 0.06 = 6\%\).` },
              { ask: 'What is the cost of equity?', answer: P((2 * 1.05) / 35 + 0.05), unit: '%', dp: 2, hint: R`Add \(g = 5\%\).`, why: R`\(6\% + 5\% = 11\%\).`,
                mistakes: [{ v: P((2 * 1.05) / 35), why: R`That is only the dividend yield. Add \(g\).` }, { v: P(2 / 35 + 0.05), why: R`That uses \(D_0\). Use \(D_1 = D_0(1 + g)\).` }] },
            ],
            answer: R`\(r_E = 6\% + 5\% = 11\%\).`,
            ti: [TI.line('2*1.05/35+0.05', PCT((2 * 1.05) / 35 + 0.05))] },
          { kind: 'check', gen: 'wx-g-ke-ddm' },
          { kind: 'recap', title: 'Remember', points: [
            R`Cost of equity = the return shareholders require.`,
            R`CAPM: \(r_E = r_f + \beta_E(E[R_M] - r_f)\).`,
            R`Dividend growth model: \(r_E = \frac{D_1}{P_0} + g\).`,
            R`Exam trap: use \(D_1 = D_0(1 + g)\), not the dividend just paid, and do not forget to add \(g\).`,
          ], formula: 'total-return' },
        ],
      },
      'wx-L3': {
        title: 'The cost of debt and preference shares',
        goal: R`Find the cost of debt from a bond’s price, adjust it for tax, and find the cost of preference shares.`,
        topics: ['debtpref'],
        cards: [
          { kind: 'learn', title: 'The cost of debt is the yield',
            body: R`Lenders buy the firm’s bonds. The return they require today is the bond’s **yield to maturity** (YTM, from Week 3): the rate that makes the price equal the PV of the coupons and the face value.\n\nSo the pre-tax **cost of debt**, \(r_d\), is the YTM. It is **not** the coupon rate, which was fixed when the bond was first sold.` },
          { kind: 'example', title: 'Worked example: the YTM on the TI-Nspire', q: R`A firm’s bonds have a face value of $1,000, an annual coupon rate of 6% and 5 years to maturity. They trade at $960.00. What is the pre-tax cost of debt?`,
            tl: { n: 5, at: { 0: '−$960', 1: '$60', 2: '$60', 3: '$60', 4: '$60', 5: '$60 + $1,000' }, unit: 'Year' },
            steps: [R`The coupon is \(6\% \times \$1{,}000 = \$60\) a year, for \(N = 5\) years.`, R`You pay \(\$960\) for the bond, so \(PV = -960\). You receive \(Pmt = 60\) each year and \(FV = 1000\) at the end.`,
              R`Solve for the rate: \(r_d = ${pc(YTM_EX)}\). The bond sells below its face value, so its YTM is above the 6% coupon rate.`],
            answer: R`The pre-tax cost of debt is \(${pc(YTM_EX)}\).`,
            ti: [TI.cmd('tvmI', [5, -960, 60, 1000, 1, 1], { note: R`\(\text{tvmI}(N, PV, Pmt, FV, PpY, CpY)\) gives the YTM in %.` })] },
          { kind: 'learn', title: 'Interest saves tax',
            body: R`Interest is **tax deductible**: it is taken off profit before the tax is worked out. With a company tax rate \(T_c\), each $1 of interest saves \(T_c\) dollars of tax.\n\nSo the **after-tax cost of debt** is \(r_d(1 - T_c)\). At 7% with a 30% tax rate: \(7\% \times (1 - 0.30) = 4.9\%\).` },
          { kind: 'guided', title: 'Your turn', q: R`Emu Energy bonds have a face value of $1,000, an annual coupon rate of 8% and 10 years to maturity. They trade at $1,050.00. The tax rate is 30%. Find the after-tax cost of debt.`,
            parts: [
              { ask: R`What goes in \(Pmt\), the coupon each year?`, answer: 80, unit: '$', dp: 0, hint: R`\(8\% \times \$1{,}000\).`, why: R`\(0.08 \times 1{,}000 = \$80\).` },
              { ask: R`What goes in \(PV\)?`, answer: -1050, unit: '', dp: 0, hint: 'You pay the price, so it is money out: negative.', why: R`\(PV = -1050\).` },
              { ask: 'Solve for the YTM. What is the pre-tax cost of debt?', answer: P(YTM_G), unit: '%', dp: 2, hint: R`\(\text{tvmI}(10, -1050, 80, 1000, 1, 1)\).`, why: R`\(r_d = ${pc(YTM_G)}\). The bond sells above its face value, so its YTM is below the 8% coupon rate.`,
                mistakes: [{ v: 8, why: 'That is the coupon rate. The cost of debt is the YTM.' }] },
              { ask: 'What is the after-tax cost of debt?', answer: P(YTM_G * 0.7), unit: '%', dp: 2, hint: R`Multiply the YTM by \((1 - 0.30)\).`, why: R`\(${pc(YTM_G)} \times 0.7 = ${pc(YTM_G * 0.7)}\).`,
                mistakes: [{ v: P(YTM_G), why: R`That is the pre-tax cost. Multiply by \((1 - T_c)\).` }, { v: 8 * 0.7, why: 'That uses the coupon rate, not the YTM.' }, { v: P(YTM_G * 0.3), why: 'That is the tax saved, not the after-tax cost.' }] },
            ],
            answer: R`After tax, the debt costs \(${pc(YTM_G * 0.7)}\).`,
            ti: [TI.cmd('tvmI', [10, -1050, 80, 1000, 1, 1], { note: 'The YTM in %.' }), TI.line('ans*(1-0.3)', { note: 'After tax, in %.' })] },
          { kind: 'check', gen: 'wx-g-kd' },
          { kind: 'learn', title: 'The cost of preference shares',
            body: R`A preference share pays the same dividend every year, forever: a **perpetuity** (Week 2). The dividend is often set as a % of its **par value** (the face value printed on the share).\n\nIts price is \(P_p = \frac{DIV_p}{R_p}\), so its cost is\n\n\[R_p = \frac{DIV_p}{P_p}\]\n\nThat is the dividend over today’s **market price**. Preference dividends are **not** tax deductible, so there is no \((1 - T_c)\).`,
            formula: 'cost-pref' },
          { kind: 'example', title: 'Worked example', q: R`Preference shares have a par value of $60 and pay 7% of par each year. They trade at $56.00. What is their cost?`,
            steps: [R`Dividend: \(7\% \times \$60 = \$4.20\) a year.`, R`\(R_p = \frac{4.20}{56.00} = 0.075 = 7.5\%\).`, R`The 7% is a rate on par, not the cost: investors pay $56, not $60.`],
            answer: R`\(R_p = ${pc(FIN.costPref(4.2, 56), 1)}\).`,
            ti: [TI.line('0.07*60/56', PCT(FIN.costPref(4.2, 56)))] },
          { kind: 'check', gen: 'wx-g-pref' },
          { kind: 'recap', title: 'Remember', points: [
            R`Pre-tax cost of debt \(r_d\) = the **YTM** on the firm’s bonds. TI-Nspire: \(\text{tvmI}(N, -\text{price}, \text{coupon}, 1000, 1, 1)\).`,
            R`After-tax cost of debt: \(r_d(1 - T_c)\), because interest is tax deductible.`,
            R`Preference shares: \(R_p = \frac{DIV_p}{P_p}\), with no tax adjustment.`,
            R`Exam trap: use the YTM, not the coupon rate. And never apply \((1 - T_c)\) to preference shares or equity.`,
          ], formula: 'cost-pref' },
        ],
      },
      'wx-L4': {
        title: 'The WACC',
        goal: R`Blend the costs of capital into the WACC, with market-value weights and after-tax debt.`,
        topics: ['wacc'],
        cards: [
          { kind: 'learn', title: 'One rate for the whole firm',
            body: R`The **weighted average cost of capital** (WACC) is the average cost of all the firm’s capital. Each cost is weighted by how much of that source the firm uses:\n\n\[r_{WACC} = r_e\frac{E}{V} + r_p\frac{P}{V} + r_d(1 - T_c)\frac{D}{V}\]\n\n\(E\), \(P\) and \(D\) are the values of the equity, preference shares and debt, and \(V = E + P + D\).`,
            formula: 'wacc' },
          { kind: 'learn', title: 'Use market values',
            body: 'The weights must use **market values**: what investors would pay for each part today.',
            points: [R`Equity: number of shares \(\times\) share price.`, R`Preference shares: number of shares \(\times\) their price.`, R`Bonds: face value \(\times\) the price as a % of face. Bonds with a face value of $200m trading at 95% are worth $190m.`],
            tip: R`**Book values** (from the balance sheet) are old accounting numbers. Do not use them for the weights.` },
          { kind: 'example', title: 'Worked example', q: R`A firm’s capital is shown below. The company tax rate is 30%. What is its WACC?`,
            table: { head: ['Source', 'Market value', 'Book value', 'Cost'], rows: [['Equity', '$600m', '$250m', '12%'], ['Preference shares', '$100m', '$100m', '8%'], ['Debt', '$300m', '$320m', '6% (pre-tax)']] },
            steps: [R`Use the market values: \(V = 600 + 100 + 300 = \$1{,}000\text{m}\). Ignore the book values.`, R`Weights: \(\frac{E}{V} = 0.6\), \(\frac{P}{V} = 0.1\) and \(\frac{D}{V} = 0.3\).`,
              R`After-tax cost of debt: \(6\% \times (1 - 0.30) = 4.2\%\).`, R`\(r_{WACC} = 0.6(12\%) + 0.1(8\%) + 0.3(4.2\%) = 7.2\% + 0.8\% + 1.26\% = ${pc(Q12)}\).`],
            answer: R`The WACC is \(${pc(Q12)}\).`,
            ti: [TI.line('(0.12*600+0.08*100+0.06*(1-0.3)*300)/(600+100+300)', Object.assign(PCT(Q12), { note: R`Each cost times its market value, added, then divided by \(V\). That is \(${pc(Q12)}\).` }))] },
          { kind: 'check', ref: 'wx-q11' },
          { kind: 'guided', title: 'Your turn, step by step', q: R`Koala Kombucha has 50m shares at $8.00 each, and its shareholders require 13%. Its bonds have a face value of $200m, trade at 95% of face and have a YTM of 7%. There are no preference shares. The tax rate is 30%. Find the WACC.`,
            parts: [
              { ask: R`What is the market value of the equity, \(E\)?`, answer: WG.E, unit: '$m', dp: 2, hint: R`\(50\text{m} \times \$8.00\).`, why: R`\(50\text{m} \times \$8.00 = \$${nt(WG.E, 2)}\text{m}\).` },
              { ask: R`What is the market value of the debt, \(D\)?`, answer: WG.D, unit: '$m', dp: 2, hint: R`\(0.95 \times \$200\text{m}\).`, why: R`\(0.95 \times \$200\text{m} = \$${nt(WG.D, 2)}\text{m}\).`,
                mistakes: [{ v: WG.face, why: 'That is the face value. Use the market price: 95% of face.' }] },
              { ask: 'What is the after-tax cost of debt?', answer: P(WG.rd * (1 - WG.tc)), unit: '%', dp: 2, hint: R`\(7\% \times (1 - 0.30)\).`, why: R`\(7\% \times 0.7 = ${pc(WG.rd * (1 - WG.tc), 1)}\).` },
              { ask: 'What is the WACC?', answer: P(WG.w), unit: '%', dp: 2, hint: R`\(\frac{0.13 \times 400 + 0.049 \times 190}{400 + 190}\).`, why: R`\(\frac{52 + 9.31}{590} = ${pc(WG.w)}\).`,
                mistakes: [{ v: P(FIN.wacc({ E: WG.E, D: WG.D, re: WG.re, rd: WG.rd, tc: 0 })), why: R`That uses the pre-tax cost of debt. Multiply it by \((1 - T_c)\).` }, { v: P(FIN.wacc({ E: WG.E, D: WG.face, re: WG.re, rd: WG.rd, tc: WG.tc })), why: 'That uses the face value of the bonds. Use their market value.' }] },
            ],
            answer: R`The WACC is \(${pc(WG.w)}\).`,
            ti: [TI.line('(0.13*50*8+0.07*(1-0.3)*200*0.95)/(50*8+200*0.95)', PCT(WG.w))] },
          { kind: 'check', gen: 'wx-g-wacc' },
          { kind: 'learn', title: 'When to use the WACC',
            body: R`The WACC is the right discount rate for a project with the **same risk** as the firm’s average project, financed with the same mix of debt and equity.\n\nA **riskier** project needs a higher rate. If you discount it at the WACC, its NPV looks too good, and the firm may accept a bad project.`,
            tip: R`How one project is funded does not set its rate. Its **risk** does.` },
          { kind: 'check', ref: 'wx-q14' },
          { kind: 'recap', title: 'Remember', points: [
            R`\(r_{WACC} = r_e\frac{E}{V} + r_p\frac{P}{V} + r_d(1 - T_c)\frac{D}{V}\), with \(V = E + P + D\).`,
            R`Weights use **market values**: shares \(\times\) price, and bonds at their market price.`,
            R`Only debt is adjusted for tax.`,
            R`Use the WACC only for projects with the firm’s average risk.`,
            R`Exam trap: book values, the pre-tax cost of debt, and forgetting the preference shares are the three classic slips.`,
          ], formula: 'wacc' },
        ],
      },
      'wx-L5': {
        title: 'Capital structure with no taxes (MM)',
        goal: R`Explain why, with no taxes, debt does not change a firm’s value, and find the cost of equity as debt rises.`,
        topics: ['mmnt'],
        cards: [
          { kind: 'learn', title: 'Capital structure',
            body: R`A firm’s **capital structure** is its mix of debt and equity. A firm with debt is **levered**. A firm with no debt is **unlevered** (all equity).\n\nThe big question: can a firm become more valuable just by changing this mix?` },
          { kind: 'learn', title: 'A perfect market',
            body: R`Modigliani and Miller (**MM**) answered it for a **perfect capital market**, where:`,
            points: ['there are no taxes;', 'there are no transaction or issue costs;', 'the way the firm is financed does not change the cash flows its assets produce.'] },
          { kind: 'learn', title: 'Proposition I: the pie stays the same size',
            body: R`The firm’s assets produce the same cash flows however they are financed. Debt and equity just slice that cash into different pieces.\n\n\[E + D = U = A\]\n\nLevered equity plus debt equals \(U\), the value of the same firm unlevered, which equals \(A\), the value of its assets. Slicing a pie differently does not change its size.`,
            formula: 'mm-nt-value' },
          { kind: 'check', ref: 'wx-q17' },
          { kind: 'learn', title: 'The unlevered cost of capital',
            body: R`The return on the assets is shared between the shareholders and the lenders. So the **unlevered cost of capital** is a weighted average:\n\n\[r_U = r_E\frac{E}{E+D} + r_D\frac{D}{E+D}\]\n\nWith no taxes, this is also the firm’s WACC. And \(r_U = r_A\): it depends only on the risk of the assets.`,
            formula: 'mm-nt-ru' },
          { kind: 'example', title: 'Worked example', q: R`There are no taxes. A firm’s equity is worth $600m (cost 14%) and its debt is worth $400m (cost 6%). What is its unlevered cost of capital?`,
            steps: [R`Weights: \(\frac{600}{1{,}000} = 0.6\) and \(\frac{400}{1{,}000} = 0.4\).`, R`\(r_U = 0.6(14\%) + 0.4(6\%) = 8.4\% + 2.4\% = 10.8\%\).`],
            answer: R`\(r_U = ${pc(FIN.rUnlevered(0.14, 0.06, 600, 400), 1)}\).`,
            ti: [TI.line('(0.14*600+0.06*400)/(600+400)', PCT(FIN.rUnlevered(0.14, 0.06, 600, 400)))] },
          { kind: 'learn', title: 'Proposition II: equity gets riskier',
            body: R`Lenders are paid first. The more debt, the more of the firm’s risk lands on the shareholders, so they require more:\n\n\[r_E = r_U + \frac{D}{E}(r_U - r_D)\]\n\n\(\frac{D}{E}\) is the **debt-to-equity ratio**.`,
            formula: 'mm-nt-re',
            tip: R`Cheap debt does not lower the WACC here. The rise in \(r_E\) exactly cancels it out, so the WACC stays at \(r_U\).` },
          { kind: 'guided', title: 'Your turn', q: R`There are no taxes. A firm has \(r_U = 10\%\) and \(r_D = 6\%\). Its debt is worth $250m and its equity $500m. Find the cost of equity, then check the WACC.`,
            parts: [
              { ask: R`What is the debt-to-equity ratio, \(\frac{D}{E}\)?`, answer: MG.D / MG.E, unit: '', dp: 2, hint: R`\(\frac{250}{500}\).`, why: R`\(\frac{250}{500} = 0.5\).`,
                mistakes: [{ v: MG.D / (MG.D + MG.E), why: R`That is \(\frac{D}{E+D}\). Divide by the equity only.` }] },
              { ask: R`What is the cost of equity, \(r_E\)?`, answer: P(MG.rE), unit: '%', dp: 2, hint: R`\(10\% + 0.5(10\% - 6\%)\).`, why: R`\(10\% + 0.5 \times 4\% = ${pc(MG.rE, 0)}\).`,
                mistakes: [{ v: P(MG.rU + (MG.D / (MG.D + MG.E)) * (MG.rU - MG.rD)), why: R`Proposition II uses \(\frac{D}{E}\), not \(\frac{D}{E+D}\).` }] },
              { ask: R`What is the WACC, \(r_E\frac{E}{E+D} + r_D\frac{D}{E+D}\)?`, answer: P(MG.w), unit: '%', dp: 2, hint: R`The weights are \(\frac{500}{750}\) and \(\frac{250}{750}\).`, why: R`\(12\%\left(\frac{2}{3}\right) + 6\%\left(\frac{1}{3}\right) = 8\% + 2\% = ${pc(MG.w, 0)}\).`,
                mistakes: [{ v: 9, why: 'That is a simple average. Weight each cost by its share of the firm.' }] },
            ],
            answer: R`\(r_E = ${pc(MG.rE, 0)}\), and the WACC is \(${pc(MG.w, 0)} = r_U\): the debt did not change it.`,
            ti: [TI.line('0.10+250/500*(0.10-0.06)', { note: R`\(r_E = ${nt(MG.rE, 4)}\).` }), TI.line('(ans*500+0.06*250)/(500+250)', PCT(MG.w))] },
          { kind: 'check', gen: 'wx-g-re-nt' },
          { kind: 'check', ref: 'wx-q22' },
          { kind: 'recap', title: 'Remember', points: [
            R`MM Proposition I (no taxes): \(E + D = U = A\). Financing does not change firm value.`,
            R`\(r_U = r_E\frac{E}{E+D} + r_D\frac{D}{E+D}\), and \(r_U = r_A\) = the WACC.`,
            R`Proposition II: \(r_E = r_U + \frac{D}{E}(r_U - r_D)\). More debt means a higher \(r_E\).`,
            R`Exam trap: Proposition II uses \(\frac{D}{E}\), not \(\frac{D}{E+D}\).`,
          ], formula: 'mm-nt-re' },
        ],
      },
      'wx-L6': {
        title: 'Taxes and the interest tax shield',
        goal: R`Work out the interest tax shield, its present value, and the value of a levered firm when there are taxes.`,
        topics: ['mmt'],
        cards: [
          { kind: 'learn', title: 'Taxes change the story',
            body: R`In the real world firms pay company tax, and **interest is tax deductible**: it is taken off profit before the tax is worked out.\n\nSo a firm with debt pays less tax than the same firm without debt. More of its cash goes to its investors, and less goes to the government.` },
          { kind: 'learn', title: 'A small example',
            body: 'Two identical firms each earn $100 before interest and tax. Firm L pays $20 of interest; Firm U has no debt. The tax rate is 30%.',
            table: { head: ['', 'Firm U (no debt)', 'Firm L (debt)'], rows: [['Earnings before interest and tax', '$100', '$100'], ['Interest', '$0', '$20'], ['Taxable profit', '$100', '$80'], ['Tax at 30%', '$30', '$24'], ['Paid to investors (lenders + shareholders)', '$70', '$76']] },
            tip: R`Firm L pays $6 less tax, so its investors get $6 more. That $6 is its **interest tax shield**: \(\$20 \times 30\%\).` },
          { kind: 'learn', title: 'The interest tax shield',
            body: R`The **interest tax shield** is the tax saved each year because of the interest:\n\n\[\text{Interest tax shield} = \text{Interest} \times T_c\]`,
            formula: 'its' },
          { kind: 'example', title: 'Worked example', q: R`A firm pays $8m of interest a year. The company tax rate is 30%. What is its interest tax shield each year?`,
            steps: [R`\(\text{Interest tax shield} = \$8\text{m} \times 0.30 = \$2.4\text{m}\).`],
            answer: R`The firm pays \(\$${nt(FIN.interestTaxShield(8, 0.3), 2)}\text{m}\) less tax each year.`,
            ti: [TI.line('8*0.3', { note: 'In $m.' })] },
          { kind: 'learn', title: 'The value of the shield on permanent debt',
            body: R`If the debt is **permanent** (it is never repaid), the shield arrives every year, forever: a **perpetuity**. Each year it is \(T_c \times r_D \times D\). It is as risky as the debt, so discount it at \(r_D\):\n\n\[PV(\text{interest tax shield}) = \frac{T_c\,r_D\,D}{r_D} = T_c \times D\]\n\nThe interest rate cancels out.` },
          { kind: 'learn', title: 'MM with taxes: debt adds value',
            body: R`\[V_L = V_U + PV(\text{interest tax shield})\]\n\nFor permanent debt, \(V_L = V_U + T_c D\). The levered firm is worth more than the unlevered one, because the government collects less tax.`,
            formula: 'mm-t-value' },
          { kind: 'example', title: 'Worked example', q: R`An all-equity firm is worth $200m. It borrows $80m of permanent debt. The tax rate is 30%. What is the levered firm worth?`,
            steps: [R`\(PV(\text{ITS}) = T_c \times D = 0.30 \times \$80\text{m} = \$24\text{m}\).`, R`\(V_L = V_U + PV(\text{ITS}) = \$200\text{m} + \$24\text{m} = \$224\text{m}\).`],
            answer: R`\(V_L = \$${nt(200 + FIN.pvTaxShieldPerm(80, 0.3), 2)}\text{m}\).`,
            ti: [TI.line('200+0.3*80', { note: 'In $m.' })] },
          { kind: 'guided', title: 'Your turn, step by step', q: R`Magpie Motors has $150m of permanent debt at 6% interest. The tax rate is 30%. Without debt, the firm would be worth $500m.`,
            parts: [
              { ask: 'What is the interest each year?', answer: SG.int, unit: '$m', dp: 2, hint: R`\(6\% \times \$150\text{m}\).`, why: R`\(0.06 \times \$150\text{m} = \$${nt(SG.int, 2)}\text{m}\).` },
              { ask: 'What is the interest tax shield each year?', answer: SG.its, unit: '$m', dp: 2, hint: R`\(\$9\text{m} \times 30\%\).`, why: R`\(\$9\text{m} \times 0.30 = \$${nt(SG.its, 2)}\text{m}\).`,
                mistakes: [{ v: SG.int * (1 - SG.tc), why: 'That is the interest after tax, not the tax saved.' }] },
              { ask: 'What is the present value of the tax shield?', answer: SG.pv, unit: '$m', dp: 2, hint: R`For permanent debt: \(T_c \times D\).`, why: R`\(0.30 \times \$150\text{m} = \$${nt(SG.pv, 2)}\text{m}\).`,
                mistakes: [{ v: SG.its, why: R`That is one year’s shield. For all the years, use \(T_c \times D\).` }] },
              { ask: 'What is the levered firm worth?', answer: SG.VU + SG.pv, unit: '$m', dp: 2, hint: R`\(V_L = V_U + T_c D\).`, why: R`\(\$500\text{m} + \$${nt(SG.pv, 2)}\text{m} = \$${nt(SG.VU + SG.pv, 2)}\text{m}\).`,
                mistakes: [{ v: SG.VU + SG.D, why: 'Only the tax shield is added, not the whole loan.' }] },
            ],
            answer: R`\(V_L = \$500\text{m} + \$${nt(SG.pv, 2)}\text{m} = \$${nt(SG.VU + SG.pv, 2)}\text{m}\).`,
            ti: [TI.line('500+0.3*150', { note: 'In $m.' })] },
          { kind: 'check', gen: 'wx-g-its' },
          { kind: 'recap', title: 'Remember', points: [
            R`Interest is tax deductible, so debt saves tax: \(\text{Interest tax shield} = \text{Interest} \times T_c\).`,
            R`For permanent debt: \(PV(\text{interest tax shield}) = T_c \times D\).`,
            R`MM with taxes: \(V_L = V_U + PV(\text{interest tax shield})\). Debt adds value.`,
            R`Exam trap: add only the tax shield \(T_c D\) to \(V_U\), never the whole loan \(D\).`,
          ], formula: 'its' },
        ],
      },
      'wx-L7': {
        title: 'Cost of equity and WACC with taxes',
        goal: R`Find the cost of equity and the WACC of a levered firm when there are taxes.`,
        topics: ['mmt'],
        cards: [
          { kind: 'learn', title: 'Proposition II with taxes',
            body: R`With taxes, shareholders still bear more risk as debt rises, but the tax shield softens it:\n\n\[r_E = r_U + \frac{D}{E}(r_U - r_D)(1 - T_c)\]\n\nIt is the no-tax formula with an extra \((1 - T_c)\). So \(r_E\) rises more slowly.`,
            formula: 'mm-t-re' },
          { kind: 'example', title: 'Worked example', q: R`With taxes: \(r_U = 10\%\), \(r_D = 6\%\), \(\frac{D}{E} = 0.5\) and \(T_c = 30\%\). What is the cost of equity?`,
            steps: [R`The spread: \(r_U - r_D = 10\% - 6\% = 4\%\).`, R`\(r_E = 10\% + 0.5 \times 4\% \times (1 - 0.30) = 10\% + 1.4\% = 11.4\%\).`, R`With no taxes it would be 12%. The tax shield keeps \(r_E\) lower.`],
            answer: R`\(r_E = ${pc(FIN.rELevTax(0.10, 0.06, 0.5, 1, 0.3), 1)}\).`,
            ti: [TI.line('0.10+0.5*(0.10-0.06)*(1-0.3)', PCT(FIN.rELevTax(0.10, 0.06, 0.5, 1, 0.3)))] },
          { kind: 'check', gen: 'wx-g-re-t' },
          { kind: 'learn', title: 'The WACC with taxes',
            body: R`\[r_{WACC} = r_E\frac{E}{E+D} + r_D\frac{D}{E+D}(1 - T_c)\]\n\nDebt enters **after tax**. As the firm adds debt, the WACC **falls** below \(r_U\). This is the tax shield at work.`,
            formula: 'mm-t-wacc' },
          { kind: 'example', title: 'Worked example', q: R`Equity is worth $400m with \(r_E = 11.4\%\), and debt is worth $200m with \(r_D = 6\%\). The tax rate is 30%. What is the WACC?`,
            steps: [R`Weights: \(\frac{400}{600} = \frac{2}{3}\) and \(\frac{200}{600} = \frac{1}{3}\).`, R`\(r_{WACC} = \frac{2}{3}(11.4\%) + \frac{1}{3}(6\%)(1 - 0.30) = 7.6\% + 1.4\% = 9\%\).`, R`That is below \(r_U = 10\%\), the WACC this firm would have with no taxes.`],
            answer: R`The WACC is \(${pc(FIN.wacc({ E: 400, D: 200, re: 0.114, rd: 0.06, tc: 0.3 }), 0)}\).`,
            ti: [TI.line('(0.114*400+0.06*(1-0.3)*200)/(400+200)', PCT(FIN.wacc({ E: 400, D: 200, re: 0.114, rd: 0.06, tc: 0.3 })))] },
          { kind: 'guided', title: 'Your turn, step by step', q: R`Numbat Networks has \(r_U = 12\%\) and \(r_D = 8\%\). It has permanent debt worth $300m and equity worth $600m. The tax rate is 25%. Find \(r_E\), then the WACC.`,
            parts: [
              { ask: R`What is \(\frac{D}{E}\)?`, answer: TG.D / TG.E, unit: '', dp: 2, hint: R`\(\frac{300}{600}\).`, why: R`\(\frac{300}{600} = 0.5\).` },
              { ask: R`What is the cost of equity, \(r_E\)?`, answer: P(TG.rE), unit: '%', dp: 2, hint: R`\(12\% + 0.5(12\% - 8\%)(1 - 0.25)\).`, why: R`\(12\% + 0.5 \times 4\% \times 0.75 = 12\% + 1.5\% = ${pc(TG.rE, 1)}\).`,
                mistakes: [{ v: P(FIN.rELevNoTax(TG.rU, TG.rD, TG.D, TG.E)), why: R`That is the no-tax answer. With taxes, multiply the spread by \((1 - T_c)\).` }] },
              { ask: 'What is the WACC?', answer: P(TG.w), unit: '%', dp: 2, hint: R`\(13.5\%\left(\frac{600}{900}\right) + 8\%\left(\frac{300}{900}\right)(1 - 0.25)\).`, why: R`\(9\% + 2\% = ${pc(TG.w, 0)}\), below \(r_U = 12\%\).`,
                mistakes: [{ v: P(FIN.wacc({ E: TG.E, D: TG.D, re: TG.rE, rd: TG.rD, tc: 0 })), why: R`Debt enters after tax: \(r_D(1 - T_c)\).` }, { v: P(TG.rU), why: R`That is \(r_U\). With taxes, the WACC falls below \(r_U\).` }] },
            ],
            answer: R`\(r_E = ${pc(TG.rE, 1)}\) and the WACC is \(${pc(TG.w, 0)}\), below \(r_U = 12\%\).`,
            ti: [TI.line('0.12+300/600*(0.12-0.08)*(1-0.25)', { note: R`\(r_E = ${nt(TG.rE, 4)}\).` }), TI.line('(ans*600+0.08*(1-0.25)*300)/(600+300)', PCT(TG.w))] },
          { kind: 'learn', title: 'No taxes or taxes: a summary',
            body: 'What happens as a firm adds debt:',
            table: { head: ['', 'No taxes', 'With taxes'], rows: [['Firm value', 'Stays the same', R`Rises by \(T_c D\)`], [R`Cost of equity \(r_E\)`, 'Rises', 'Rises, but more slowly'], ['WACC', R`Stays at \(r_U\)`, 'Falls']] } },
          { kind: 'check', ref: 'wx-q32' },
          { kind: 'check', ref: 'wx-q33' },
          { kind: 'recap', title: 'Remember', points: [
            R`With taxes: \(r_E = r_U + \frac{D}{E}(r_U - r_D)(1 - T_c)\). It rises more slowly than with no taxes.`,
            R`\(r_{WACC} = r_E\frac{E}{E+D} + r_D\frac{D}{E+D}(1 - T_c)\). It falls as debt rises.`,
            R`No taxes: firm value and the WACC stay the same. With taxes: value rises and the WACC falls.`,
            R`Exam trap: check which world the question is in. With taxes, put \((1 - T_c)\) into both formulas.`,
          ], formula: 'mm-t-wacc' },
        ],
      },
    },

    questions: [
      /* ----- cost of equity ----- */
      { id: 'wx-q01', topic: 'equity', kind: 'mcq', level: 1, section: 'A', src: 'Formula sheet: Cost of Capital',
        q: R`Which two methods from earlier weeks can estimate a firm’s **cost of equity**?`,
        choices: ['CAPM (Week 9) and the dividend growth model (Week 3)', 'The payback period and the IRR', 'The yield to maturity and the coupon rate', 'The Sharpe ratio and the coefficient of variation'], answer: 0,
        why: R`CAPM: \(r_E = r_f + \beta_E(E[R_M] - r_f)\). Dividend growth model: \(r_E = \frac{D_1}{P_0} + g\).` },
      { id: 'wx-q02', topic: 'equity', kind: 'num', level: 1, section: 'B', formula: 'capm', src: 'Formula sheet: Risk and Return',
        q: R`A firm’s shares have a beta of 1.2. The risk-free rate is 4% and the expected market return is 10%. Using CAPM, what is its **cost of equity**?`,
        givens: [['\\beta_E', '1.2'], ['r_f', R`4\%`], ['E[R_M]', R`10\%`]],
        answer: P(FIN.capm(0.04, 1.2, 0.10)), unit: '%', dp: 2,
        mistakes: [
          { v: 16, why: R`Multiply beta by the market risk premium \(10\% - 4\% = 6\%\), not by \(10\%\).` },
          { v: 7.2, why: R`That is only the risk premium. Add \(r_f = 4\%\).` },
          { v: 12, why: R`That is \(\beta \times E[R_M]\). CAPM is \(r_f + \beta(E[R_M] - r_f)\).` },
        ],
        steps: [R`\[r_E = r_f + \beta_E(E[R_M] - r_f) = 4\% + 1.2(10\% - 4\%) = 4\% + 7.2\% = 11.2\%\]`],
        ti: [TI.line('0.04+1.2*(0.10-0.04)', PCT(FIN.capm(0.04, 1.2, 0.10)))],
        why: 'The cost of equity is the return shareholders require for the systematic risk they bear.' },
      { id: 'wx-q03', topic: 'equity', kind: 'num', level: 2, section: 'B', formula: 'total-return', src: 'Lecture W3 (required return) + formula sheet',
        q: R`A share has just paid a dividend of $1.50. Dividends are expected to grow at 4% a year forever. The share price is $26.00. Using the dividend growth model, what is the **cost of equity**?`,
        givens: [['D_0', R`\$1.50`], ['g', R`4\%`], ['P_0', R`\$26.00`]],
        answer: P((1.5 * 1.04) / 26 + 0.04), unit: '%', dp: 2,
        mistakes: [
          { v: P(1.5 / 26 + 0.04), why: R`Use next year’s dividend \(D_1 = D_0(1 + g)\), not the one just paid.` },
          { v: P((1.5 * 1.04) / 26), why: R`That is only the dividend yield. Add the growth rate \(g\).` },
        ],
        steps: [R`\[D_1 = D_0(1 + g) = \$1.50 \times 1.04 = \$1.56\]`, R`\[r_E = \frac{D_1}{P_0} + g = \frac{\$1.56}{\$26.00} + 0.04 = 0.06 + 0.04 = 10\%\]`, R`Check: \(P_0 = \frac{D_1}{r_E - g} = \frac{1.56}{0.10 - 0.04} = \$${T.num(FIN.ddmConst(1.56, 0.10, 0.04))}\).`],
        ti: [TI.line('1.5*1.04/26+0.04', Object.assign(PCT((1.5 * 1.04) / 26 + 0.04), { note: R`\(1.5 \times 1.04\) is \(D_1\). That is \(10\%\).` }))],
        why: 'Cost of equity = dividend yield + growth rate. This rearranges the constant-growth share price formula from Week 3.' },
      { id: 'wx-q04', topic: 'equity', kind: 'mcq', level: 2, section: 'A', formula: 'total-return',
        q: R`In \(r_E = \frac{D_1}{P_0} + g\), why is the top line \(D_1\) and not \(D_0\)?`,
        choices: [R`Today’s price reflects the dividends still to come, and the next one is \(D_1\)`, R`\(D_1\) is the dividend that was just paid`, R`\(D_0\) is always zero`, 'It makes no difference which one you use'], answer: 0,
        why: R`\(D_0\) has already been paid, so a buyer today will not receive it. The first dividend the buyer gets is \(D_1 = D_0(1 + g)\).` },
      { id: 'wx-q05', topic: 'equity', kind: 'mcq', level: 2, section: 'A',
        q: R`Why is a firm’s cost of equity usually **higher** than its cost of debt?`,
        choices: ['Shareholders are paid last and bear more risk, so they demand a higher return', 'Shares never pay dividends', 'Interest on debt is not tax deductible', 'Debt never has to be repaid'], answer: 0,
        why: 'Lenders are paid first and have a legal claim. Shareholders get what is left, so their returns are riskier and they require more.' },

      /* ----- cost of debt and preference shares ----- */
      { id: 'wx-q06', topic: 'debtpref', kind: 'mcq', level: 1, section: 'A', formula: 'wacc',
        q: R`Why does the WACC use the **after-tax** cost of debt?`,
        choices: [R`Interest is tax deductible, so each dollar of interest saves \(T_c\) dollars of tax`, 'Lenders pay the company’s tax for it', 'Debt is riskier than equity', 'Dividends are tax deductible too'], answer: 0,
        why: R`The firm’s true cost per dollar of debt is \(r_d(1 - T_c)\), because the interest lowers its tax bill.` },
      { id: 'wx-q07', topic: 'debtpref', kind: 'num', level: 1, section: 'B', formula: 'cost-pref', src: 'Formula sheet: Cost of Capital',
        q: R`Preference shares have a par value of $60 and pay a fixed dividend of 7% of par each year. They trade at $56.00. The company tax rate is 30%. What is the **cost of preference shares**?`,
        givens: [['DIV_p', R`7\% \times \$60 = \$4.20`], ['P_p', R`\$56.00`]],
        answer: P(FIN.costPref(4.2, 56)), unit: '%', dp: 2,
        mistakes: [
          { v: 7, why: 'That is the dividend rate on par. Investors pay the market price, so divide the dividend by the price.' },
          { v: P(FIN.costPref(4.2, 56) * 0.7), why: R`Preference dividends are not tax deductible, so there is no \((1 - T_c)\).` },
        ],
        steps: [R`\[R_p = \frac{DIV_p}{P_p} = \frac{\$4.20}{\$56.00} = 0.075 = 7.5\%\]`],
        ti: [TI.line('0.07*60/56', Object.assign(PCT(FIN.costPref(4.2, 56)), { note: R`\(0.07 \times 60\) is the dividend, \(\$4.20\). That is \(7.50\%\).` }))],
        why: 'A preference share is a perpetuity, so its cost is the dividend over today’s price. The tax rate is a distraction here.' },
      { id: 'wx-q08', topic: 'debtpref', kind: 'num', level: 1, section: 'B', formula: 'wacc', src: 'Formula sheet: Cost of Capital',
        q: R`A firm’s bonds have a yield to maturity of 6.5%. The company tax rate is 30%. What is its **after-tax cost of debt**?`,
        givens: [['r_d', R`6.5\%`], ['T_c', R`30\%`]],
        answer: P(0.065 * 0.7), unit: '%', dp: 2,
        mistakes: [
          { v: 6.5, why: R`That is the pre-tax cost. Interest is tax deductible, so multiply by \((1 - T_c)\).` },
          { v: P(0.065 * 0.3), why: 'That is the tax saved per dollar of debt, not the after-tax cost.' },
        ],
        steps: [R`\[r_d(1 - T_c) = 6.5\% \times (1 - 0.30) = 4.55\%\]`],
        ti: [TI.line('0.065*(1-0.3)', PCT(0.065 * 0.7))],
        why: 'The tax saving on interest makes debt cheaper for the firm.' },
      { id: 'wx-q09', topic: 'debtpref', kind: 'mcq', level: 2, section: 'A',
        q: R`Which rate best measures a firm’s **pre-tax cost of debt**?`,
        choices: ['The yield to maturity on its existing bonds', 'The coupon rate on its existing bonds', 'The current yield (coupon ÷ price)', 'The risk-free rate'], answer: 0,
        why: 'The YTM is the return lenders require today. The coupon rate was fixed when the bonds were first issued.' },
      { id: 'wx-q10', topic: 'debtpref', kind: 'tf', level: 2, section: 'A', formula: 'cost-pref',
        q: R`Preference dividends are tax deductible, so the cost of preference shares is multiplied by \((1 - T_c)\) in the WACC.`,
        answer: false,
        why: R`Only interest is tax deductible. In the WACC only debt gets the \((1 - T_c)\): \(r_{WACC} = r_e\frac{E}{V} + r_p\frac{P}{V} + r_d(1 - T_c)\frac{D}{V}\).` },

      /* ----- WACC ----- */
      { id: 'wx-q11', topic: 'wacc', kind: 'mcq', level: 1, section: 'A', formula: 'wacc',
        q: R`The weights in the WACC should be based on…`,
        choices: ['Market values of equity, preference shares and debt', 'Book values from the balance sheet', 'The number of shares and bonds on issue', 'Equal weights for each source'], answer: 0,
        why: 'Market values show what investors would pay for each claim today. Book values are historical accounting numbers.' },
      { id: 'wx-q12', topic: 'wacc', kind: 'num', level: 2, section: 'B', formula: 'wacc', src: 'Formula sheet: Cost of Capital',
        q: R`The CFO asks {NAME} to work out the firm’s WACC. The firm’s capital is shown below. The company tax rate is 30%. What is its **WACC**?`,
        table: { head: ['Source', 'Market value', 'Book value', 'Cost'], rows: [['Equity', '$600m', '$250m', '12%'], ['Preference shares', '$100m', '$100m', '8%'], ['Debt', '$300m', '$320m', '6% (pre-tax)']] },
        answer: P(FIN.wacc({ E: 600, P: 100, D: 300, re: 0.12, rp: 0.08, rd: 0.06, tc: 0.3 })), unit: '%', dp: 2,
        mistakes: [
          { v: P(FIN.wacc({ E: 600, P: 100, D: 300, re: 0.12, rp: 0.08, rd: 0.06, tc: 0 })), why: R`Debt must be after tax: \(r_d(1 - T_c)\).` },
          { v: P(FIN.wacc({ E: 250, P: 100, D: 320, re: 0.12, rp: 0.08, rd: 0.06, tc: 0.3 })), why: 'Use market values, not book values.' },
          { v: P(FIN.wacc({ E: 600, D: 300, re: 0.12, rd: 0.06, tc: 0.3 })), why: R`Preference shares are part of the firm’s capital: \(V = E + P + D\).` },
          { v: P((0.12 + 0.08 + 0.06 * 0.7) / 3), why: 'Weight each cost by its share of V, not equally.' },
        ],
        steps: [
          R`\[V = E + P + D = \$600\text{m} + \$100\text{m} + \$300\text{m} = \$1{,}000\text{m}\]`,
          R`\[r_{WACC} = 12\%\left(\frac{600}{1{,}000}\right) + 8\%\left(\frac{100}{1{,}000}\right) + 6\%(1 - 0.30)\left(\frac{300}{1{,}000}\right)\]`,
          R`\[r_{WACC} = 7.2\% + 0.8\% + 1.26\% = 9.26\%\]`,
        ],
        ti: [TI.line('(0.12*600+0.08*100+0.06*(1-0.3)*300)/(600+100+300)', Object.assign(PCT(FIN.wacc({ E: 600, P: 100, D: 300, re: 0.12, rp: 0.08, rd: 0.06, tc: 0.3 })), { note: R`Market values only, and only debt gets \((1 - 0.3)\). That is \(9.26\%\).` }))],
        why: 'Market-value weights, and only debt is adjusted for tax.' },
      { id: 'wx-q13', topic: 'wacc', kind: 'mcq', level: 2, section: 'A', formula: 'wacc',
        q: R`When is the WACC the right discount rate for a new project?`,
        choices: ['When the project has the same risk as the firm’s average project and is financed with the same mix', 'For every project the firm considers', 'Only when the project is financed entirely with debt', 'When the project is riskier than the firm’s existing assets'], answer: 0,
        why: 'The WACC reflects the risk of the firm’s existing assets and its financing mix. A project with different risk needs its own rate.' },
      { id: 'wx-q14', topic: 'wacc', kind: 'mcq', level: 2, section: 'A', formula: 'wacc',
        q: R`A firm uses its WACC of 9% to evaluate a project that is much **riskier** than its usual projects. What is the danger?`,
        choices: ['The rate is too low, so the firm may accept a project with a negative true NPV', 'The rate is too high, so the firm may reject good projects', 'There is no danger, because the WACC suits every project', 'The project’s cash flows will be taxed twice'], answer: 0,
        why: 'Riskier cash flows need a higher discount rate. Using 9% overstates the NPV of a risky project.' },
      { id: 'wx-q15', topic: 'wacc', kind: 'tf', level: 1, section: 'A', formula: 'wacc',
        q: R`In the WACC formula, \(V = E + P + D\), the total market value of the firm’s equity, preference shares and debt.`,
        answer: true, why: R`Each weight is one source’s share of \(V\), so the three weights add up to 1.` },
      { id: 'wx-q16', topic: 'wacc', kind: 'mcq', level: 2, section: 'A', formula: 'wacc',
        q: R`A firm will fund a new project entirely with a 5% bank loan. Its WACC is 10%. The project has the same risk as the firm’s other projects. Which discount rate should it use?`,
        choices: ['The WACC of 10%: the project’s risk, not its funding, sets the rate', '5%, because the project is funded with debt', R`\(5\% \times (1 - T_c)\), the after-tax loan rate`, 'The cost of equity, because shareholders own the project'], answer: 0,
        why: 'The discount rate depends on the project’s risk. The firm keeps its overall mix of debt and equity, so an average-risk project is discounted at the WACC, however this one is funded.' },

      /* ----- MM: no-tax world ----- */
      { id: 'wx-q17', topic: 'mmnt', kind: 'mcq', level: 1, section: 'A', formula: 'mm-nt-value', src: 'Formula sheet: Capital Structure – No Tax World',
        q: R`With **no taxes** (a perfect capital market), MM Proposition I says that…`,
        choices: ['A firm’s total value does not depend on how it is financed', 'More debt always increases firm value', 'More debt always decreases firm value', 'Equity is always cheaper than debt'], answer: 0,
        why: R`\(E + D = U = A\): the claims on the firm add up to the value of its assets, however the claims are split.` },
      { id: 'wx-q18', topic: 'mmnt', kind: 'mcq', level: 2, section: 'A', formula: 'mm-nt-re', src: 'Formula sheet: Capital Structure – No Tax World',
        q: R`No taxes. As a firm’s debt-to-equity ratio rises, its cost of equity…`,
        choices: ['Rises, because shareholders bear more financial risk', 'Falls, because debt is cheaper', 'Stays the same', 'Falls to the cost of debt'], answer: 0,
        why: R`Proposition II: \(r_E = r_U + \frac{D}{E}(r_U - r_D)\). With \(r_U > r_D\), a bigger \(\frac{D}{E}\) means a bigger \(r_E\).` },
      { id: 'wx-q19', topic: 'mmnt', kind: 'num', level: 2, section: 'B', formula: 'mm-nt-re', src: 'Formula sheet: Capital Structure – No Tax World',
        q: R`No taxes. A firm’s unlevered cost of capital is 10% and its debt costs 6%. Its debt-to-equity ratio is 0.5. What is its **cost of equity**?`,
        givens: [['r_U', R`10\%`], ['r_D', R`6\%`], ['D/E', '0.5']],
        answer: P(FIN.rELevNoTax(0.10, 0.06, 0.5, 1)), unit: '%', dp: 2,
        mistakes: [
          { v: P(0.10 + (1 / 3) * 0.04), why: R`Proposition II uses \(\frac{D}{E}\), not \(\frac{D}{E+D}\).` },
          { v: 15, why: R`Multiply \(\frac{D}{E}\) by the spread \((r_U - r_D)\), not by \(r_U\).` },
          { v: 10, why: R`That is \(r_U\). With debt, equity is riskier, so \(r_E > r_U\).` },
        ],
        steps: [R`\[r_E = r_U + \frac{D}{E}(r_U - r_D) = 10\% + 0.5(10\% - 6\%) = 10\% + 2\% = 12\%\]`],
        ti: [TI.line('0.10+0.5*(0.10-0.06)', PCT(FIN.rELevNoTax(0.10, 0.06, 0.5, 1)))],
        why: 'Shareholders earn the asset return plus a premium for the financial risk that debt adds.' },
      { id: 'wx-q20', topic: 'mmnt', kind: 'num', level: 2, section: 'B', formula: 'mm-nt-ru', src: 'Formula sheet: Capital Structure – No Tax World',
        q: R`No taxes. A firm has equity worth $600m (cost 14%) and debt worth $400m (cost 6%). What is its **unlevered cost of capital** \(r_U\)?`,
        givens: [['E', R`\$600\text{m}`], ['D', R`\$400\text{m}`], ['r_E', R`14\%`], ['r_D', R`6\%`]],
        answer: P(FIN.rUnlevered(0.14, 0.06, 600, 400)), unit: '%', dp: 2,
        mistakes: [
          { v: 10, why: R`That is a simple average. Weight by \(\frac{E}{E+D}\) and \(\frac{D}{E+D}\).` },
          { v: P(FIN.rUnlevered(0.14, 0.06, 400, 600)), why: 'The weights are the wrong way round: 60% goes with the equity.' },
          { v: 14, why: R`That is the levered cost of equity. \(r_U\) blends in the cheaper debt.` },
        ],
        steps: [R`\[r_U = r_E\frac{E}{E+D} + r_D\frac{D}{E+D} = 14\%\left(\frac{600}{1{,}000}\right) + 6\%\left(\frac{400}{1{,}000}\right) = 8.4\% + 2.4\% = 10.8\%\]`],
        ti: [TI.line('(0.14*600+0.06*400)/(600+400)', PCT(FIN.rUnlevered(0.14, 0.06, 600, 400)))],
        why: R`With no taxes, \(r_U = r_A\) is also the WACC: the return on the firm’s assets.` },
      { id: 'wx-q21', topic: 'mmnt', kind: 'tf', level: 2, section: 'A', formula: 'mm-nt-ru',
        q: R`With no taxes, the WACC stays the same whatever the firm’s leverage.`,
        answer: true, why: R`The WACC is \(r_E\frac{E}{E+D} + r_D\frac{D}{E+D} = r_U\). As debt rises, \(r_E\) rises just enough to keep the WACC at \(r_U\).` },
      { id: 'wx-q22', topic: 'mmnt', kind: 'mcq', level: 2, section: 'A', formula: 'mm-nt-re',
        q: R`No taxes. Debt costs 6% and equity costs 14%. Why can’t the firm lower its WACC by swapping equity for cheap debt?`,
        choices: ['The extra debt makes equity riskier, so the cost of equity rises and exactly offsets the cheaper debt', 'Debt is really more expensive than equity', 'Lenders refuse to lend more', 'The WACC does not include debt'], answer: 0,
        why: 'Cheap debt increases the risk borne by shareholders. In a perfect market the two effects cancel, so the WACC is unchanged.' },
      { id: 'wx-q23', topic: 'mmnt', kind: 'mcq', level: 1, section: 'A', formula: 'mm-nt-value',
        q: R`In \(E + D = U = A\), what does \(U\) stand for?`,
        choices: ['The value of the same firm if it were unlevered (all equity)', 'Unsystematic risk', 'The firm’s unpaid debt', 'The number of shares outstanding'], answer: 0,
        why: R`\(U\) is the unlevered firm value. It equals \(A\), the value of the firm’s assets.` },
      { id: 'wx-q24', topic: 'mmnt', kind: 'mcq', level: 2, section: 'A',
        q: R`MM’s no-tax results assume a **perfect capital market**. Which condition is part of it?`,
        choices: ['No taxes and no transaction or issue costs, and financing does not change the cash flows from the assets', 'Firms pay tax but investors do not', 'Only firms can borrow, not investors', 'Share prices are set by the government'], answer: 0,
        why: 'In a perfect market, financing only splits the same cash flows in different ways. Real frictions such as taxes are what make capital structure matter.' },
      { id: 'wx-q25', topic: 'mmnt', kind: 'num', level: 2, section: 'B', formula: 'mm-nt-ru', src: 'Formula sheet: Capital Structure – No Tax World',
        q: R`No taxes. A firm has \(r_E = 12\%\) and \(r_D = 6\%\), and its debt-to-equity ratio is 0.5. What is its **WACC**?`,
        givens: [['r_E', R`12\%`], ['r_D', R`6\%`], ['D/E', '0.5']],
        answer: P(0.12 * (2 / 3) + 0.06 * (1 / 3)), unit: '%', dp: 2,
        mistakes: [
          { v: 9, why: R`That is a simple average. With \(\frac{D}{E} = 0.5\), the weights are \(\frac{E}{E+D} = \frac{2}{3}\) and \(\frac{D}{E+D} = \frac{1}{3}\).` },
          { v: 8, why: 'The weights are the wrong way round: two-thirds goes with the equity.' },
          { v: 15, why: R`\(\frac{D}{E} = 0.5\) is not a weight. Convert it: \(\frac{D}{E+D} = \frac{0.5}{1.5}\).` },
        ],
        steps: [R`With \(\frac{D}{E} = 0.5\): \(\frac{E}{E+D} = \frac{1}{1.5} = \frac{2}{3}\) and \(\frac{D}{E+D} = \frac{0.5}{1.5} = \frac{1}{3}\).`, R`\[r_{WACC} = 12\%\left(\frac{2}{3}\right) + 6\%\left(\frac{1}{3}\right) = 8\% + 2\% = 10\%\]`],
        ti: [TI.line('0.12*1/1.5+0.06*0.5/1.5', Object.assign(PCT(0.12 * (2 / 3) + 0.06 * (1 / 3)), { note: R`Take \(E = 1\) and \(D = 0.5\), so \(E + D = 1.5\). That is \(10\%\).` }))],
        why: R`With no taxes the WACC equals \(r_U\). Here \(r_U = 10\%\), which matches Proposition II: \(10\% + 0.5(10\% - 6\%) = 12\% = r_E\).` },

      /* ----- MM: tax world ----- */
      { id: 'wx-q26', topic: 'mmt', kind: 'num', level: 1, section: 'B', formula: 'its', src: 'Formula sheet: Capital Structure – Tax World',
        q: R`A firm pays $8m of interest a year. The company tax rate is 30%. What is its **interest tax shield** each year?`,
        givens: [['\\text{Interest}', R`\$8\text{m}`], ['T_c', R`30\%`]],
        answer: FIN.interestTaxShield(8, 0.3), unit: '$m', dp: 2,
        mistakes: [
          { v: 8, why: R`That is the interest itself. The shield is the tax saved: \(\text{Interest} \times T_c\).` },
          { v: 5.6, why: R`That is the after-tax interest cost \(\text{Interest}(1 - T_c)\), not the tax saved.` },
        ],
        steps: [R`\[\text{Interest tax shield} = \text{Interest} \times T_c = \$8\text{m} \times 0.30 = \$2.4\text{m}\]`],
        ti: [TI.line('8*0.3', { note: 'In $m: the firm pays $2.4m less tax each year.' })],
        why: 'Because interest is tax deductible, the firm pays $2.4m less tax each year.' },
      { id: 'wx-q27', topic: 'mmt', kind: 'num', level: 2, section: 'B', formula: 'its', src: 'Formula sheet: Capital Structure – Tax World',
        q: R`A firm has $50m of permanent debt at an interest rate of 6%. The company tax rate is 30%. What is the **present value of its interest tax shield**?`,
        givens: [['D', R`\$50\text{m}`], ['r_D', R`6\%`], ['T_c', R`30\%`]],
        answer: FIN.pvTaxShieldPerm(50, 0.3), unit: '$m', dp: 2,
        mistakes: [
          { v: FIN.interestTaxShield(50 * 0.06, 0.3), why: R`That is one year’s shield. For permanent debt the PV is \(T_c \times D\).` },
          { v: 35, why: R`That is \(D(1 - T_c)\). The PV of the shield is \(T_c \times D\).` },
          { v: 3, why: 'That is one year’s interest, not the value of the tax saving.' },
        ],
        steps: [R`Each year: \(\$50\text{m} \times 6\% \times 0.30 = \$0.9\text{m}\), forever.`, R`\[PV = \frac{\$0.9\text{m}}{0.06} = T_c \times D = 0.30 \times \$50\text{m} = \$15\text{m}\]`],
        ti: [TI.line('0.3*50', { note: R`\(T_c \times D\), in $m.` })],
        why: 'The shield is a perpetuity with the same risk as the debt, so the interest rate cancels out.' },
      { id: 'wx-q28', topic: 'mmt', kind: 'num', level: 2, section: 'B', formula: 'mm-t-value', src: 'Formula sheet: Capital Structure – Tax World',
        q: R`An all-equity firm is worth $200m. It borrows $80m of permanent debt. The company tax rate is 30%. Using MM with taxes, what is the value of the **levered** firm?`,
        givens: [['V_U', R`\$200\text{m}`], ['D', R`\$80\text{m}`], ['T_c', R`30\%`]],
        answer: 200 + FIN.pvTaxShieldPerm(80, 0.3), unit: '$m', dp: 2,
        mistakes: [
          { v: 200, why: 'That ignores the tax shield. With taxes, debt adds value.' },
          { v: 280, why: R`Borrowing does not add the whole loan to firm value. Only the tax shield \(T_c D\) is added.` },
          { v: 176, why: 'The tax shield adds value; it does not subtract it.' },
        ],
        steps: [R`\[PV(\text{ITS}) = T_c \times D = 0.30 \times \$80\text{m} = \$24\text{m}\]`, R`\[V_L = V_U + PV(\text{ITS}) = \$200\text{m} + \$24\text{m} = \$224\text{m}\]`],
        ti: [TI.line('200+0.3*80', { note: R`\(V_U + T_c D\), in $m.` })],
        why: 'The extra $24m is the tax the firm no longer pays, valued today.' },
      { id: 'wx-q29', topic: 'mmt', kind: 'mcq', level: 2, section: 'A', formula: 'mm-t-value',
        q: R`With corporate taxes, where does the extra value of a levered firm come from?`,
        choices: ['The government collects less tax, because interest is tax deductible', 'Lenders accept a lower interest rate', 'Shareholders stop requiring a return', 'The firm’s assets produce more cash'], answer: 0,
        why: R`The assets are the same. More of their cash flow goes to investors and less to tax: \(V_L = V_U + PV(\text{interest tax shield})\).` },
      { id: 'wx-q30', topic: 'mmt', kind: 'num', level: 3, section: 'B', formula: 'mm-t-re', src: 'Formula sheet: Capital Structure – Tax World', boss: true,
        q: R`With taxes: \(r_U = 10\%\), \(r_D = 6\%\), the debt-to-equity ratio is 0.5 and the tax rate is 30%. What is the **cost of equity**?`,
        givens: [['r_U', R`10\%`], ['r_D', R`6\%`], ['D/E', '0.5'], ['T_c', R`30\%`]],
        answer: P(FIN.rELevTax(0.10, 0.06, 0.5, 1, 0.3)), unit: '%', dp: 2,
        mistakes: [
          { v: 12, why: R`That is the no-tax answer. With taxes, multiply the spread by \((1 - T_c)\).` },
          { v: P(0.10 + 0.5 * 0.04 * 0.3), why: R`Multiply by \((1 - T_c)\), not by \(T_c\).` },
          { v: P(0.10 + (1 / 3) * 0.04 * 0.7), why: R`Use \(\frac{D}{E}\), not \(\frac{D}{E+D}\).` },
        ],
        steps: [R`\[r_E = r_U + \frac{D}{E}(r_U - r_D)(1 - T_c) = 10\% + 0.5(10\% - 6\%)(1 - 0.30)\]`, R`\[r_E = 10\% + 0.5 \times 4\% \times 0.7 = 10\% + 1.4\% = 11.4\%\]`],
        ti: [TI.line('0.10+0.5*(0.10-0.06)*(1-0.3)', PCT(FIN.rELevTax(0.10, 0.06, 0.5, 1, 0.3)))],
        why: 'With taxes, the cost of equity still rises with debt, but more slowly (11.4% instead of 12%).' },
      { id: 'wx-q31', topic: 'mmt', kind: 'num', level: 3, section: 'B', formula: 'mm-t-wacc', src: 'Formula sheet: Capital Structure – Tax World', boss: true,
        q: R`With taxes: equity is worth $400m with \(r_E = 11.4\%\), and debt is worth $200m with \(r_D = 6\%\). The tax rate is 30%. What is the **WACC**?`,
        givens: [['E', R`\$400\text{m}`], ['D', R`\$200\text{m}`], ['r_E', R`11.4\%`], ['r_D', R`6\%`], ['T_c', R`30\%`]],
        answer: P(FIN.wacc({ E: 400, D: 200, re: 0.114, rd: 0.06, tc: 0.3 })), unit: '%', dp: 2,
        mistakes: [
          { v: P(FIN.wacc({ E: 400, D: 200, re: 0.114, rd: 0.06, tc: 0 })), why: R`Debt enters after tax: \(r_D(1 - T_c)\).` },
          { v: 10, why: R`That is \(r_U\). With taxes, the WACC falls below \(r_U\) once there is debt.` },
          { v: P((0.114 + 0.06 * 0.7) / 2), why: R`Weight by \(\frac{E}{E+D} = \frac{2}{3}\) and \(\frac{D}{E+D} = \frac{1}{3}\), not 50/50.` },
        ],
        steps: [R`\[r_{WACC} = r_E\frac{E}{E+D} + r_D\frac{D}{E+D}(1 - T_c) = 11.4\%\left(\frac{400}{600}\right) + 6\%\left(\frac{200}{600}\right)(1 - 0.30)\]`, R`\[r_{WACC} = 7.6\% + 1.4\% = 9\%\]`],
        ti: [TI.line('(0.114*400+0.06*(1-0.3)*200)/(400+200)', PCT(FIN.wacc({ E: 400, D: 200, re: 0.114, rd: 0.06, tc: 0.3 })))],
        why: R`Same firm as the no-tax case (\(r_U = 10\%\)), but the tax shield pulls the WACC down to \(9\%\).` },
      { id: 'wx-q32', topic: 'mmt', kind: 'tf', level: 2, section: 'A', formula: 'mm-t-wacc',
        q: R`With corporate taxes, the WACC falls as the firm adds debt.`,
        answer: true, why: R`Debt costs only \(r_D(1 - T_c)\) after tax, and \(r_E\) rises more slowly than without taxes, so the WACC falls.` },
      { id: 'wx-q33', topic: 'mmt', kind: 'mcq', level: 2, section: 'A', formula: 'mm-t-re',
        q: R`Compare Proposition II with and without taxes. With taxes, the cost of equity rises with leverage…`,
        choices: [R`More slowly, because the spread is multiplied by \((1 - T_c)\)`, 'More quickly', 'At exactly the same rate', 'Not at all'], answer: 0,
        why: R`With taxes: \(r_E = r_U + \frac{D}{E}(r_U - r_D)(1 - T_c)\). The \((1 - T_c)\) shrinks the extra premium.` },
      { id: 'wx-q34', topic: 'mmt', kind: 'mcq', level: 3, section: 'A', formula: 'its',
        q: R`Why is the PV of the interest tax shield on **permanent** debt equal to \(T_c \times D\)?`,
        choices: [R`Each year’s shield is \(T_c r_D D\). As a perpetuity discounted at \(r_D\), it is worth \(\frac{T_c r_D D}{r_D} = T_c D\)`, 'Because the debt is repaid after one year', 'Because tax shields are discounted at the WACC', 'Because interest is not tax deductible'], answer: 0,
        why: R`The shield is as risky as the debt, so it is discounted at \(r_D\), and \(r_D\) cancels.` },
    ],

    generators: [
      /* ---------- cost of preference shares ---------- */
      { id: 'wx-g-pref', topic: 'debtpref', level: 1, section: 'B', formula: 'cost-pref', src: 'Formula sheet: Cost of Capital',
        make(rng) {
          const co = rng.company();
          const par = rng.pick([20, 40, 50, 60, 100]), rate = rng.step(0.05, 0.1, 0.005);
          const div = +(par * rate).toFixed(2); // exact to the cent for these par values
          const tc = rng.pick([0.25, 0.3]);
          let price = +(div / rng.step(0.05, 0.12, 0.0025)).toFixed(2);
          if (Math.abs(price - par) < 0.5 || Math.abs((div / price) * (1 - tc) - rate) < 0.0002) price = +(par * 0.9).toFixed(2);
          const rp = FIN.costPref(div, price);
          return {
            q: R`${co} preference shares have a par value of ${T.money(par, 0)}. They pay a fixed dividend of ${tp(rate)} of par each year and trade at ${T.money(price)}. The company tax rate is ${tp(tc, 0)}. What is the **cost of preference shares**?`,
            givens: [['DIV_p', R`${pcT(rate)} \times ${L.money(par, 0)} = ${L.money(div)}`], ['P_p', L.money(price)], ['T_c', pcT(tc)]],
            answer: P(rp), unit: '%', dp: 2,
            mistakes: [
              { v: P(rate), why: 'That is the dividend rate on par. Investors pay the market price, so divide the dividend by the price.' },
              { v: P(rp * (1 - tc)), why: R`Preference dividends are not tax deductible, so there is no \((1 - T_c)\).` },
            ],
            steps: [R`\[DIV_p = ${pcT(rate)} \times ${L.money(par, 0)} = ${L.money(div)}\]`, R`\[R_p = \frac{DIV_p}{P_p} = \frac{${L.money(div)}}{${L.money(price)}} = ${pc(rp)}\]`],
            ti: [TI.line(`${tn(rate)}*${par}/${tn(price)}`, Object.assign(PCT(rp), { note: R`The dividend (\(${tn(rate)} \times ${par}\)) over the price. The tax rate is not used. That is \(${pc(rp)}\).` }))],
            why: 'A preference share is a perpetuity, so its cost is the dividend over today’s price. The tax rate does not apply.',
          };
        } },
      /* ---------- after-tax cost of debt ---------- */
      { id: 'wx-g-kd', topic: 'debtpref', level: 1, section: 'B', formula: 'wacc', src: 'Formula sheet: Cost of Capital',
        make(rng) {
          const co = rng.company();
          const ytm = rng.step(0.04, 0.1, 0.0025);
          let cpn = rng.step(0.03, 0.1, 0.005); if (Math.abs(cpn - ytm) < 0.005) cpn = +(ytm + 0.015).toFixed(4);
          const tc = rng.pick([0.25, 0.3]);
          const kd = ytm * (1 - tc);
          return {
            q: R`Bonds issued by ${co} have a coupon rate of ${tp(cpn, 1)} and a yield to maturity of ${tp(ytm)}. The company tax rate is ${tp(tc, 0)}. What is the **after-tax cost of debt**?`,
            givens: [['\\text{coupon rate}', pcT(cpn)], ['r_d = YTM', pcT(ytm)], ['T_c', pcT(tc)]],
            answer: P(kd), unit: '%', dp: 2,
            mistakes: [
              { v: P(ytm), why: R`That is the pre-tax cost. Interest is tax deductible, so multiply by \((1 - T_c)\).` },
              { v: P(cpn * (1 - tc)), why: 'Use the yield to maturity (what lenders require today), not the coupon rate.' },
              { v: P(ytm * tc), why: 'That is the tax saved per dollar of debt, not the after-tax cost.' },
            ],
            steps: [R`\[r_d(1 - T_c) = ${pcT(ytm)} \times (1 - ${nt(tc, 2)}) = ${pc(kd)}\]`],
            ti: [TI.line(`${tn(ytm)}*(1-${tn(tc)})`, Object.assign(PCT(kd), { note: R`The YTM, not the coupon rate, times \((1 - T_c)\). That is \(${pc(kd)}\).` }))],
            why: R`The YTM is the pre-tax cost of debt. The tax deduction on interest lowers it by the factor \((1 - T_c)\).`,
          };
        } },
      /* ---------- cost of equity: CAPM ---------- */
      { id: 'wx-g-ke-capm', topic: 'equity', level: 1, section: 'B', formula: 'capm', src: 'Formula sheet: Risk and Return',
        make(rng) {
          const co = rng.company();
          const rf = rng.step(0.02, 0.05, 0.005), mrp = rng.step(0.04, 0.08, 0.005), b = rng.step(0.5, 2, 0.05);
          const rm = rf + mrp, re = FIN.capm(rf, b, rm);
          return {
            q: R`To estimate its WACC, ${co} needs its cost of equity. Its equity beta is ${T.numT(b, 2)}. The risk-free rate is ${tp(rf, 1)} and the expected market return is ${tp(rm, 1)}. Using CAPM, what is the **cost of equity**?`,
            givens: [['\\beta_E', nt(b, 2)], ['r_f', pcT(rf)], ['E[R_M]', pcT(rm)]],
            answer: P(re), unit: '%', dp: 2,
            mistakes: [
              { v: P(rf + b * rm), why: R`Multiply beta by the market risk premium \(E[R_M] - r_f\), not by \(E[R_M]\).` },
              { v: P(b * mrp), why: R`That is only the risk premium. Add \(r_f\).` },
              { v: P(rm), why: 'That is the market return. It only fits a share with a beta of exactly 1.' },
            ],
            steps: [R`\[r_E = r_f + \beta_E(E[R_M] - r_f) = ${pcT(rf)} + ${nt(b, 2)}(${pcT(rm)} - ${pcT(rf)}) = ${pc(re)}\]`],
            ti: [TI.line(`${tn(rf)}+${tn(b)}*(${tn(rm)}-${tn(rf)})`, PCT(re))],
            why: 'CAPM gives the return shareholders require for the systematic risk of the shares.',
          };
        } },
      /* ---------- cost of equity: dividend growth model ---------- */
      { id: 'wx-g-ke-ddm', topic: 'equity', level: 2, section: 'B', formula: 'total-return', src: 'Lecture W3 (required return) + formula sheet',
        make(rng) {
          const co = rng.company();
          let d0, g, p0, d1, re;
          for (let t = 0; t < 60; t++) {
            d0 = rng.step(0.5, 3, 0.05); g = rng.step(0.02, 0.07, 0.005); p0 = rng.step(15, 80, 0.5);
            d1 = d0 * (1 + g); re = d1 / p0 + g;
            if (re >= 0.06 && re <= 0.2) break;
          }
          return {
            q: R`${co} has just paid a dividend of ${T.money(d0)} per share. Dividends are expected to grow at ${tp(g, 1)} a year forever. The share price is ${T.money(p0)}. Using the dividend growth model, what is the **cost of equity**?`,
            givens: [['D_0', L.money(d0)], ['g', pcT(g)], ['P_0', L.money(p0)]],
            answer: P(re), unit: '%', dp: 2,
            mistakes: [
              { v: P(d0 / p0 + g), why: R`Use next year’s dividend \(D_1 = D_0(1 + g)\), not the one just paid.` },
              { v: P(d1 / p0), why: R`That is only the dividend yield. Add the growth rate \(g\).` },
              { v: P(d0 / p0), why: R`That is today’s dividend yield only. Use \(D_1\) and add \(g\).` },
            ],
            steps: [R`\[D_1 = D_0(1 + g) = ${L.money(d0)} \times ${L.onePlus(g)} = ${L.money(d1, 4)}\]`, R`\[r_E = \frac{D_1}{P_0} + g = \frac{${L.money(d1, 4)}}{${L.money(p0)}} + ${nt(g)} = ${nt(d1 / p0, 6)} + ${nt(g)} = ${pc(re)}\]`],
            ti: [TI.line(`${tn(d0)}*(1+${tn(g)})/${tn(p0)}+${tn(g)}`, Object.assign(PCT(re), { note: R`\(${tn(d0)} \times (1 + ${tn(g)})\) is \(D_1\). That is \(${pc(re)}\).` }))],
            why: 'Cost of equity = expected dividend yield + growth rate.',
          };
        } },
      /* ---------- WACC with market values ---------- */
      { id: 'wx-g-wacc', topic: 'wacc', level: 2, section: 'B', formula: 'wacc', src: 'Formula sheet: Cost of Capital',
        make(rng) {
          const co = rng.company();
          const nSh = rng.step(20, 150, 5), px = rng.step(3, 25, 0.1);
          const E = nSh * px, Eb = +(E * rng.step(0.3, 0.7, 0.05)).toFixed(1);
          const hasP = rng.chance(0.6);
          const nP = hasP ? rng.step(1, 6, 0.5) : 0, pxP = rng.step(10, 30, 0.5);
          const Pv = nP * pxP;
          const face = rng.step(50, 400, 10), pct = rng.step(0.88, 1.08, 0.01);
          const D = face * pct;
          const re = rng.step(0.09, 0.16, 0.0025), rp = rng.step(0.06, 0.09, 0.0025), rd = rng.step(0.04, 0.08, 0.0025), tc = rng.pick([0.25, 0.3]);
          const V = E + Pv + D;
          const w = FIN.wacc({ E, P: Pv, D, re, rp, rd, tc });
          const rows = [['Ordinary shares', `${nSh}m shares at ${T.money(px)}`, mT(Eb), `${tp(re)} (required return)`]];
          if (hasP) rows.push(['Preference shares', `${T.numT(nP, 1)}m shares at ${T.money(pxP)}`, mT(Pv), `${tp(rp)} (required return)`]);
          rows.push(['Bonds', `Face value ${mT(face)}, trading at ${tp(pct, 0)} of face`, mT(face), `${tp(rd)} (yield to maturity)`]);
          const mistakes = [
            { v: P(FIN.wacc({ E, P: Pv, D, re, rp, rd, tc: 0 })), why: R`Debt must be after tax: \(r_d(1 - T_c)\).` },
            { v: P(FIN.wacc({ E: Eb, P: Pv, D: face, re, rp, rd, tc })), why: 'Use market values (shares × price, bonds at their market price), not book values.' },
          ];
          if (hasP) mistakes.push({ v: P(FIN.wacc({ E, D, re, rd, tc })), why: R`Preference shares are part of the firm’s capital: \(V = E + P + D\).` });
          mistakes.push({ v: P(hasP ? (re + rp + rd * (1 - tc)) / 3 : (re + rd * (1 - tc)) / 2), why: 'Weight each cost by its share of V, not equally.' });
          return {
            q: R`${co} has the capital shown below. The company tax rate is ${tp(tc, 0)}. What is its **WACC**?`,
            table: { head: ['Source', 'Market data', 'Book value', 'Cost'], rows },
            givens: [['E', R`${nSh}\text{m} \times ${L.money(px)} = ${mL(E)}`]].concat(hasP ? [['P', R`${nt(nP, 1)}\text{m} \times ${L.money(pxP)} = ${mL(Pv)}`]] : []).concat([['D', R`${nt(pct, 2)} \times ${mL(face)} = ${mL(D)}`], ['V', mL(V)]]),
            answer: P(w), unit: '%', dp: 2, mistakes,
            steps: [
              R`Market values: \(E = ${mL(E)}\)${hasP ? R`, \(P = ${mL(Pv)}\)` : ''}, \(D = ${mL(D)}\), so \(V = ${mL(V)}\).`,
              R`\[r_{WACC} = ${pcT(re)}\left(\frac{${nt(E, 2)}}{${nt(V, 2)}}\right)${hasP ? R` + ${pcT(rp)}\left(\frac{${nt(Pv, 2)}}{${nt(V, 2)}}\right)` : ''} + ${pcT(rd)}(1 - ${nt(tc, 2)})\left(\frac{${nt(D, 2)}}{${nt(V, 2)}}\right)\]`,
              R`\[r_{WACC} = ${pc(re * E / V, 3)}${hasP ? ` + ${pc(rp * Pv / V, 3)}` : ''} + ${pc(rd * (1 - tc) * D / V, 3)} = ${pc(w)}\]`,
            ],
            ti: [TI.line(`(${tn(re)}*${tn(E)}${hasP ? `+${tn(rp)}*${tn(Pv)}` : ''}+${tn(rd)}*(1-${tn(tc)})*${tn(D)})/${tn(V)}`, Object.assign(PCT(w), { note: R`Each cost times its market value (in $m), added, then divided by \(V = ${nt(V, 2)}\). That is \(${pc(w)}\).` }))],
            why: 'Market-value weights, and only the cost of debt is adjusted for tax.',
          };
        } },
      /* ---------- cost of debt from a bond price ---------- */
      { id: 'wx-g-kd-ytm', topic: 'debtpref', level: 2, section: 'B', formula: 'bond-price', src: 'Lecture W3 (bond yields) + formula sheet',
        make(rng) {
          const co = rng.company();
          const n = rng.int(3, 12);
          const cpn = rng.step(0.03, 0.09, 0.005);
          let y0 = rng.step(0.03, 0.1, 0.0025); if (Math.abs(y0 - cpn) < 0.005) y0 = +(cpn + 0.0125).toFixed(4);
          const price = +FIN.bondPrice(1000, cpn, y0, n, 1).toFixed(2);
          const ytm = FIN.bondYieldPeriodic(price, 1000, cpn * 1000, n);
          const tc = rng.pick([0.25, 0.3]);
          const kd = ytm * (1 - tc);
          return {
            q: R`Bonds issued by ${co} have a face value of $1,000, an annual coupon rate of ${tp(cpn, 1)} and ${n} years to maturity. They trade at ${T.money(price)}. The company tax rate is ${tp(tc, 0)}. What is the **after-tax cost of debt**?`,
            givens: [['FV', R`\$1{,}000`], ['C', L.money(cpn * 1000)], ['n', String(n)], ['P_{Bond}', L.money(price)], ['T_c', pcT(tc)]],
            answer: P(kd), unit: '%', dp: 2,
            mistakes: [
              { v: P(cpn * (1 - tc)), why: 'Use the yield to maturity, not the coupon rate. The coupon rate was set when the bond was issued.' },
              { v: P(ytm), why: R`That is the pre-tax cost of debt. Multiply by \((1 - T_c)\).` },
              { v: P(((cpn * 1000) / price) * (1 - tc)), why: 'Coupon ÷ price is the current yield. It ignores the gain or loss as the price moves to face value.' },
            ],
            steps: [
              R`Find the YTM from the bond price: \[${L.money(price)} = \frac{${L.money(cpn * 1000)}}{r}\left(1 - \frac{1}{(1+r)^{${n}}}\right) + \frac{\$1{,}000}{(1+r)^{${n}}} \;\Rightarrow\; r_d = ${pc(ytm, 4)}\]`,
              R`\[r_d(1 - T_c) = ${pc(ytm, 4)} \times (1 - ${nt(tc, 2)}) = ${pc(kd)}\]`,
            ],
            calc: `${n} [N] · −${T.num(price)} [PV] · ${T.numT(cpn * 1000, 2)} [PMT] · 1000 [FV] · [I/YR] → ${T.num(ytm * 100, 4)} · then × (1 − ${T.numT(tc, 2)})`,
            ti: [TI.cmd('tvmI', [n, -price, cpn * 1000, 1000, 1, 1], { note: R`The YTM in %: \(${pc(ytm, 4)}\). The price is negative because you pay it.` }), TI.line(`ans*(1-${tn(tc)})`, { note: R`After tax, in %.` })],
            why: price < 1000 ? 'The bond trades below face value, so its YTM is above the coupon rate.' : 'The bond trades above face value, so its YTM is below the coupon rate.',
          };
        } },
      /* ---------- MM no tax: unlevered cost of capital ---------- */
      { id: 'wx-g-ru', topic: 'mmnt', level: 1, section: 'B', formula: 'mm-nt-ru', src: 'Formula sheet: Capital Structure – No Tax World',
        make(rng) {
          const co = rng.company();
          const rU = rng.step(0.08, 0.14, 0.005), rD = rng.step(0.03, +(rU - 0.02).toFixed(3), 0.005), de = rng.pick(DE_SET);
          const rE = FIN.rELevNoTax(rU, rD, de, 1);
          const E = rng.step(100, 900, 10), D = E * de;
          const ans = FIN.rUnlevered(rE, rD, E, D);
          return {
            q: R`There are no taxes. ${co} has equity worth ${mT(E)} and debt worth ${mT(D)} (market values). Its cost of equity is ${tp(rE, 3)} and its cost of debt is ${tp(rD, 1)}. What is its **unlevered cost of capital** \(r_U\)?`,
            givens: [['E', mL(E)], ['D', mL(D)], ['r_E', pcT(rE)], ['r_D', pcT(rD)]],
            answer: P(ans), unit: '%', dp: 2,
            mistakes: [
              { v: P((rE + rD) / 2), why: R`That is a simple average. Weight by \(\frac{E}{E+D}\) and \(\frac{D}{E+D}\).` },
              { v: P(FIN.rUnlevered(rE, rD, D, E)), why: 'The weights are the wrong way round.' },
              { v: P(rE), why: R`That is the levered cost of equity. \(r_U\) blends in the cheaper debt.` },
            ],
            steps: [R`\[r_U = r_E\frac{E}{E+D} + r_D\frac{D}{E+D} = ${pcT(rE)}\left(\frac{${nt(E, 1)}}{${nt(E + D, 1)}}\right) + ${pcT(rD)}\left(\frac{${nt(D, 1)}}{${nt(E + D, 1)}}\right) = ${pc(ans)}\]`],
            ti: [TI.line(`(${tn(rE)}*${tn(E)}+${tn(rD)}*${tn(D)})/(${tn(E)}+${tn(D)})`, PCT(ans))],
            why: R`With no taxes, \(r_U = r_A\): the cost of capital of the firm’s assets, and also its WACC.`,
          };
        } },
      /* ---------- MM no tax: Proposition II ---------- */
      { id: 'wx-g-re-nt', topic: 'mmnt', level: 2, section: 'B', formula: 'mm-nt-re', src: 'Formula sheet: Capital Structure – No Tax World',
        make(rng) {
          const co = rng.company();
          const rU = rng.step(0.08, 0.14, 0.005), rD = rng.step(0.03, +(rU - 0.02).toFixed(3), 0.005), de = rng.pick(DE_SET);
          const E = rng.step(100, 900, 10), D = E * de;
          const rE = FIN.rELevNoTax(rU, rD, D, E);
          return {
            q: R`There are no taxes. ${co} has an unlevered cost of capital of ${tp(rU, 1)}. It has debt worth ${mT(D)} and equity worth ${mT(E)}. Its debt costs ${tp(rD, 1)}. What is its **cost of equity**?`,
            givens: [['r_U', pcT(rU)], ['r_D', pcT(rD)], ['D', mL(D)], ['E', mL(E)]],
            answer: P(rE), unit: '%', dp: 2,
            mistakes: [
              { v: P(rU + (D / (D + E)) * (rU - rD)), why: R`Proposition II uses \(\frac{D}{E}\) (debt over equity), not \(\frac{D}{E+D}\).` },
              { v: P(rU + (D / E) * rU), why: R`Multiply \(\frac{D}{E}\) by the spread \((r_U - r_D)\), not by \(r_U\).` },
              { v: P(rU + (E / D) * (rU - rD)), why: R`Use \(\frac{D}{E}\), not \(\frac{E}{D}\).` },
              { v: P(rU), why: R`With debt, equity is riskier, so \(r_E > r_U\).` },
            ],
            steps: [R`\[\frac{D}{E} = \frac{${nt(D, 1)}}{${nt(E, 1)}} = ${nt(de, 2)}\]`, R`\[r_E = r_U + \frac{D}{E}(r_U - r_D) = ${pcT(rU)} + ${nt(de, 2)}(${pcT(rU)} - ${pcT(rD)}) = ${pc(rE)}\]`],
            ti: [TI.line(`${tn(rU)}+${tn(D)}/${tn(E)}*(${tn(rU)}-${tn(rD)})`, PCT(rE))],
            why: 'Shareholders get the asset return plus a premium for the financial risk that debt adds.',
          };
        } },
      /* ---------- interest tax shield ---------- */
      { id: 'wx-g-its', topic: 'mmt', level: 1, section: 'B', formula: 'its', src: 'Formula sheet: Capital Structure – Tax World',
        make(rng) {
          const co = rng.company();
          const D = rng.step(20, 500, 10), rD = rng.step(0.04, 0.08, 0.005), tc = rng.pick([0.25, 0.3]);
          const interest = D * rD, its = FIN.interestTaxShield(interest, tc), pv = FIN.pvTaxShieldPerm(D, tc);
          const ask = rng.pick(['annual', 'pv', 'vl']);
          const base = R`${co} has ${mT(D)} of permanent debt at an interest rate of ${tp(rD, 1)}. The company tax rate is ${tp(tc, 0)}.`;
          if (ask === 'annual') {
            return {
              q: R`${base} What is the **interest tax shield** each year?`,
              givens: [['D', mL(D)], ['r_D', pcT(rD)], ['T_c', pcT(tc)]],
              answer: its, unit: '$m', dp: 2,
              mistakes: [
                { v: interest, why: R`That is the interest itself. The shield is the tax saved: \(\text{Interest} \times T_c\).` },
                { v: interest * (1 - tc), why: 'That is the after-tax interest cost, not the tax saved.' },
                { v: pv, why: R`That is the PV of all future shields (\(T_c D\)), not one year’s saving.` },
              ],
              steps: [R`\[\text{Interest} = ${pcT(rD)} \times ${mL(D)} = ${mL(interest)}\]`, R`\[\text{Interest tax shield} = \text{Interest} \times T_c = ${mL(interest)} \times ${nt(tc, 2)} = ${mL(its)}\]`],
              ti: [TI.line(`${tn(D)}*${tn(rD)}*${tn(tc)}`, { note: 'Debt × interest rate × tax rate, in $m.' })],
              why: 'Interest is tax deductible, so the firm pays this much less tax every year.',
            };
          }
          if (ask === 'pv') {
            const rU = +(rD + rng.step(0.02, 0.06, 0.005)).toFixed(4);
            return {
              q: R`${base} Its unlevered cost of capital is ${tp(rU, 1)}. What is the **present value of its interest tax shield**?`,
              givens: [['D', mL(D)], ['r_D', pcT(rD)], ['T_c', pcT(tc)], ['r_U', pcT(rU)]],
              answer: pv, unit: '$m', dp: 2,
              mistakes: [
                { v: its, why: R`That is one year’s shield. For permanent debt, \(PV = T_c \times D\).` },
                { v: D * (1 - tc), why: R`That is \(D(1 - T_c)\). The PV of the shield is \(T_c \times D\).` },
                { v: its / rU, why: R`The shield is as risky as the debt, so discount it at \(r_D\), not \(r_U\). That gives \(T_c D\).` },
              ],
              steps: [R`Each year: \(${mL(D)} \times ${pcT(rD)} \times ${nt(tc, 2)} = ${mL(its)}\), forever.`, R`\[PV = \frac{${mL(its)}}{${nt(rD, 3)}} = T_c \times D = ${nt(tc, 2)} \times ${mL(D)} = ${mL(pv)}\]`],
              ti: [TI.line(`${tn(tc)}*${tn(D)}`, { note: R`\(T_c \times D\), in $m. The interest rate cancels out.` })],
              why: R`The unlevered cost of capital is not needed: for permanent debt the rate cancels and \(PV = T_c D\).`,
            };
          }
          const VU = rng.step(200, 2000, 10);
          const VL = VU + pv;
          return {
            q: R`${base} Without debt, the firm would be worth ${mT(VU)}. Using MM with taxes, what is the value of the **levered** firm?`,
            givens: [['V_U', mL(VU)], ['D', mL(D)], ['T_c', pcT(tc)]],
            answer: VL, unit: '$m', dp: 2,
            mistakes: [
              { v: VU, why: 'That ignores the tax shield. With taxes, debt adds value.' },
              { v: VU + D, why: R`Borrowing does not add the whole loan to firm value. Only \(PV(\text{ITS}) = T_c D\) is added.` },
              { v: VU + its, why: R`Add the PV of all future shields (\(T_c D\)), not just one year’s shield.` },
            ],
            steps: [R`\[PV(\text{ITS}) = T_c \times D = ${nt(tc, 2)} \times ${mL(D)} = ${mL(pv)}\]`, R`\[V_L = V_U + PV(\text{ITS}) = ${mL(VU)} + ${mL(pv)} = ${mL(VL)}\]`],
            ti: [TI.line(`${tn(VU)}+${tn(tc)}*${tn(D)}`, { note: R`\(V_U + T_c D\), in $m.` })],
            why: 'The extra value is the tax the firm will no longer pay, valued today.',
          };
        } },
      /* ---------- MM with tax: Proposition II ---------- */
      { id: 'wx-g-re-t', topic: 'mmt', level: 2, section: 'B', formula: 'mm-t-re', src: 'Formula sheet: Capital Structure – Tax World',
        make(rng) {
          const co = rng.company();
          const rU = rng.step(0.08, 0.14, 0.005), rD = rng.step(0.03, +(rU - 0.02).toFixed(3), 0.005), de = rng.pick(DE_SET), tc = rng.pick([0.25, 0.3]);
          const E = rng.step(100, 900, 10), D = E * de;
          const rE = FIN.rELevTax(rU, rD, D, E, tc);
          return {
            q: R`${co} pays company tax at ${tp(tc, 0)}. Its unlevered cost of capital is ${tp(rU, 1)} and its debt costs ${tp(rD, 1)}. It has permanent debt worth ${mT(D)} and equity worth ${mT(E)}. What is its **cost of equity**?`,
            givens: [['r_U', pcT(rU)], ['r_D', pcT(rD)], ['D', mL(D)], ['E', mL(E)], ['T_c', pcT(tc)]],
            answer: P(rE), unit: '%', dp: 2,
            mistakes: [
              { v: P(FIN.rELevNoTax(rU, rD, D, E)), why: R`That is the no-tax answer. With taxes, multiply the spread by \((1 - T_c)\).` },
              { v: P(rU + (D / E) * (rU - rD) * tc), why: R`Multiply by \((1 - T_c)\), not by \(T_c\).` },
              { v: P(rU + (D / (D + E)) * (rU - rD) * (1 - tc)), why: R`Use \(\frac{D}{E}\), not \(\frac{D}{E+D}\).` },
            ],
            steps: [R`\[\frac{D}{E} = \frac{${nt(D, 1)}}{${nt(E, 1)}} = ${nt(de, 2)}\]`, R`\[r_E = r_U + \frac{D}{E}(r_U - r_D)(1 - T_c) = ${pcT(rU)} + ${nt(de, 2)}(${pcT(rU)} - ${pcT(rD)})(1 - ${nt(tc, 2)}) = ${pc(rE)}\]`],
            ti: [TI.line(`${tn(rU)}+${tn(D)}/${tn(E)}*(${tn(rU)}-${tn(rD)})*(1-${tn(tc)})`, PCT(rE))],
            why: 'With taxes, the cost of equity rises with leverage, but more slowly than with no taxes.',
          };
        } },
      /* ---------- accept or reject using the WACC ---------- */
      { id: 'wx-g-accept', topic: 'wacc', level: 2, section: 'B', formula: 'wacc',
        make(rng) {
          const co = rng.company();
          for (let t = 0; t < 60; t++) {
            const wE = rng.pick([0.5, 0.6, 0.7, 0.75, 0.8]), wD = +(1 - wE).toFixed(2);
            const re = rng.step(0.09, 0.15, 0.005), rd = rng.step(0.04, 0.08, 0.005), tc = rng.pick([0.25, 0.3]);
            const w = FIN.wacc({ E: wE, D: wD, re, rd, tc });
            const irr = +(w + rng.pick([-0.02, -0.015, -0.01, 0.01, 0.015, 0.02])).toFixed(4);
            if (irr >= re - 0.002 || irr <= rd * (1 - tc) + 0.002) continue;
            const accept = irr > w;
            return {
              kind: 'mcq',
              q: R`${co} is financed ${tp(wE, 0)} with equity (cost ${tp(re, 1)}) and ${tp(wD, 0)} with debt (pre-tax cost ${tp(rd, 1)}), at market values. The company tax rate is ${tp(tc, 0)}. A new project has the **same risk** as the firm’s existing assets and an IRR of ${tp(irr)}. What should ${co} do?`,
              givens: [['w_E', nt(wE, 2)], ['r_E', pcT(re)], ['w_D', nt(wD, 2)], ['r_D', pcT(rd)], ['T_c', pcT(tc)], ['IRR', pcT(irr)]],
              choices: ['Accept: its IRR is above the WACC', 'Reject: its IRR is below the WACC', 'Accept: its IRR is above the after-tax cost of debt', 'Reject: its IRR is below the cost of equity'],
              answer: accept ? 0 : 1,
              steps: [R`\[r_{WACC} = ${pcT(re)}(${nt(wE, 2)}) + ${pcT(rd)}(1 - ${nt(tc, 2)})(${nt(wD, 2)}) = ${pc(w)}\]`, R`The IRR of \(${pcT(irr)}\) is ${accept ? 'above' : 'below'} the WACC of \(${pc(w)}\).`],
              ti: [TI.line(`${tn(re)}*${tn(wE)}+${tn(rd)}*(1-${tn(tc)})*${tn(wD)}`, { note: R`The WACC: \(${pc(w)}\). Compare it with the IRR of \(${pcT(irr)}\).` })],
              why: `For a project with the firm’s average risk, the hurdle rate is the WACC, not the cost of any one source of money. ${accept ? 'The IRR beats it, so accept.' : 'The IRR falls short, so reject.'}`,
            };
          }
          return null;
        } },

      /* ---------- boss: WACC with taxes (two steps) ---------- */
      { id: 'wx-g-wacc-t', topic: 'mmt', level: 3, section: 'B', formula: 'mm-t-wacc', src: 'Formula sheet: Capital Structure – Tax World', boss: true,
        make(rng) {
          const co = rng.company();
          const rU = rng.step(0.08, 0.14, 0.005), rD = rng.step(0.03, +(rU - 0.02).toFixed(3), 0.005), de = rng.pick(DE_SET), tc = rng.pick([0.25, 0.3]);
          const E = rng.step(100, 900, 10), D = E * de, V = E + D;
          const rE = FIN.rELevTax(rU, rD, D, E, tc);
          const w = rE * (E / V) + rD * (D / V) * (1 - tc);
          const rEnt = FIN.rELevNoTax(rU, rD, D, E);
          return {
            q: R`${co} has an unlevered cost of capital of ${tp(rU, 1)}. It has permanent debt worth ${mT(D)} (cost ${tp(rD, 1)}) and equity worth ${mT(E)}. The company tax rate is ${tp(tc, 0)}. Using MM with taxes, what is its **WACC**?`,
            givens: [['r_U', pcT(rU)], ['r_D', pcT(rD)], ['D', mL(D)], ['E', mL(E)], ['T_c', pcT(tc)]],
            answer: P(w), unit: '%', dp: 2,
            mistakes: [
              { v: P(rE * (E / V) + rD * (D / V)), why: R`Debt enters the WACC after tax: \(r_D(1 - T_c)\).` },
              { v: P(rEnt * (E / V) + rD * (D / V) * (1 - tc)), why: R`With taxes, Proposition II includes \((1 - T_c)\), so \(r_E\) is lower than the no-tax value.` },
              { v: P(rU), why: R`That is \(r_U\). With taxes, the WACC falls below \(r_U\) once there is debt.` },
            ],
            steps: [
              R`Step 1, cost of equity: \[r_E = r_U + \frac{D}{E}(r_U - r_D)(1 - T_c) = ${pcT(rU)} + ${nt(de, 2)}(${pcT(rU)} - ${pcT(rD)})(1 - ${nt(tc, 2)}) = ${pcT(rE, 4)}\]`,
              R`Step 2, weights: \(\frac{E}{E+D} = \frac{${nt(E, 1)}}{${nt(V, 1)}} = ${nt(E / V, 4)}\) and \(\frac{D}{E+D} = ${nt(D / V, 4)}\).`,
              R`Step 3, WACC: \[r_{WACC} = ${pcT(rE, 4)}(${nt(E / V, 4)}) + ${pcT(rD)}(${nt(D / V, 4)})(1 - ${nt(tc, 2)}) = ${pc(w)}\]`,
            ],
            ti: [TI.line(`${tn(rU)}+${tn(D)}/${tn(E)}*(${tn(rU)}-${tn(rD)})*(1-${tn(tc)})`, { note: R`Step 1: \(r_E = ${pcT(rE, 4)}\).` }),
              TI.line(`(ans*${tn(E)}+${tn(rD)}*(1-${tn(tc)})*${tn(D)})/(${tn(E)}+${tn(D)})`, Object.assign(PCT(w), { note: R`\(\text{ans}\) is \(r_E\). Each cost times its value, divided by \(E + D\). That is \(${pc(w)}\).` }))],
            why: `The tax shield pulls the WACC below the unlevered cost of capital (${tp(rU, 1)}).`,
          };
        } },
      /* ---------- boss: leveraged buyback with taxes ---------- */
      { id: 'wx-g-vl', topic: 'mmt', level: 3, section: 'B', formula: 'mm-t-value', src: 'Formula sheet: Capital Structure – Tax World', boss: true,
        make(rng) {
          const co = rng.company();
          const VU = rng.step(200, 1500, 50), share = rng.pick([0.2, 0.25, 0.3, 0.4, 0.5]);
          const D = VU * share, tc = rng.pick([0.25, 0.3]);
          const rU = rng.step(0.08, 0.14, 0.005), rD = rng.step(0.03, +(rU - 0.02).toFixed(3), 0.005);
          const VL = VU + tc * D, E = VL - D;
          const rE = FIN.rELevTax(rU, rD, D, E, tc);
          return {
            q: R`${co} is all-equity and worth ${mT(VU)}. Its unlevered cost of capital is ${tp(rU, 1)}. It borrows ${mT(D)} of permanent debt at ${tp(rD, 1)} and uses the cash to buy back shares. The company tax rate is ${tp(tc, 0)}. Using MM with taxes, what is its **cost of equity** after the buyback?`,
            givens: [['V_U', mL(VU)], ['D', mL(D)], ['r_U', pcT(rU)], ['r_D', pcT(rD)], ['T_c', pcT(tc)]],
            answer: P(rE), unit: '%', dp: 2,
            mistakes: [
              { v: P(FIN.rELevTax(rU, rD, D, VU - D, tc)), why: R`With taxes, \(V_L = V_U + T_c D\), so the equity is worth \(V_L - D\), not \(V_U - D\).` },
              { v: P(FIN.rELevNoTax(rU, rD, D, E)), why: R`With taxes, multiply the spread by \((1 - T_c)\).` },
              { v: P(rU + (D / VL) * (rU - rD) * (1 - tc)), why: R`Use \(\frac{D}{E}\), not \(\frac{D}{V}\).` },
            ],
            steps: [
              R`Step 1, firm value: \[V_L = V_U + T_c D = ${mL(VU)} + ${nt(tc, 2)} \times ${mL(D)} = ${mL(VL)}\]`,
              R`Step 2, equity value: \[E = V_L - D = ${mL(VL)} - ${mL(D)} = ${mL(E)}\]`,
              R`Step 3, cost of equity: \[r_E = ${pcT(rU)} + \frac{${nt(D, 2)}}{${nt(E, 2)}}(${pcT(rU)} - ${pcT(rD)})(1 - ${nt(tc, 2)}) = ${pc(rE)}\]`,
            ],
            ti: [TI.line(`${tn(VU)}+${tn(tc)}*${tn(D)}`, { note: R`Step 1: \(V_L\), in $m.` }), TI.line(`ans-${tn(D)}`, { note: R`Step 2: the equity, \(E = V_L - D\).` }),
              TI.line(`${tn(rU)}+${tn(D)}/ans*(${tn(rU)}-${tn(rD)})*(1-${tn(tc)})`, Object.assign(PCT(rE), { note: R`Step 3: \(\text{ans}\) is \(E\). That is \(${pc(rE)}\).` }))],
            why: R`Value first (the tax shield adds \(T_c \times D\)), then the equity left after the debt, then Proposition II with taxes.`,
          };
        } },
      /* ---------- boss: re-leveraging with no taxes ---------- */
      { id: 'wx-g-recap', topic: 'mmnt', level: 3, section: 'B', formula: 'mm-nt-re', src: 'Formula sheet: Capital Structure – No Tax World', boss: true,
        make(rng) {
          const co = rng.company();
          const rU = rng.step(0.08, 0.14, 0.005), rD = rng.step(0.03, +(rU - 0.02).toFixed(3), 0.005);
          const [de1, de2] = rng.sample([0.25, 0.4, 0.5, 0.6, 0.75, 1, 1.5], 2).sort((a, b) => a - b);
          const E1 = rng.step(100, 900, 10), D1 = E1 * de1;
          const rE1 = FIN.rELevNoTax(rU, rD, D1, E1);
          const ru = FIN.rUnlevered(rE1, rD, E1, D1);
          const rE2 = FIN.rELevNoTax(ru, rD, de2, 1);
          return {
            q: R`There are no taxes. ${co} has equity worth ${mT(E1)} with a cost of equity of ${tp(rE1, 3)}, and debt worth ${mT(D1)} costing ${tp(rD, 1)}. It will borrow more and buy back shares until its debt-to-equity ratio is ${T.numT(de2, 2)}. Its cost of debt stays at ${tp(rD, 1)}. What will its new **cost of equity** be?`,
            givens: [['E', mL(E1)], ['D', mL(D1)], ['r_E', pcT(rE1)], ['r_D', pcT(rD)], ['(D/E)_{new}', nt(de2, 2)]],
            answer: P(rE2), unit: '%', dp: 2,
            mistakes: [
              { v: P(rE1 + de2 * (rE1 - rD)), why: R`First unlever: find \(r_U\) from the current mix. Then relever with the new \(\frac{D}{E}\).` },
              { v: P(ru + (de2 / (1 + de2)) * (ru - rD)), why: R`Proposition II uses \(\frac{D}{E}\), not \(\frac{D}{E+D}\).` },
              { v: P(ru), why: R`That is \(r_U\). Now relever it with the new \(\frac{D}{E}\).` },
              { v: P(rE1), why: 'More debt makes equity riskier, so the cost of equity changes.' },
            ],
            steps: [
              R`Step 1, unlever: \[r_U = r_E\frac{E}{E+D} + r_D\frac{D}{E+D} = ${pcT(rE1)}\left(\frac{${nt(E1, 1)}}{${nt(E1 + D1, 1)}}\right) + ${pcT(rD)}\left(\frac{${nt(D1, 1)}}{${nt(E1 + D1, 1)}}\right) = ${pcT(ru, 4)}\]`,
              R`Step 2, relever: \[r_E = r_U + \frac{D}{E}(r_U - r_D) = ${pcT(ru, 4)} + ${nt(de2, 2)}(${pcT(ru, 4)} - ${pcT(rD)}) = ${pc(rE2)}\]`,
            ],
            ti: [TI.line(`(${tn(rE1)}*${tn(E1)}+${tn(rD)}*${tn(D1)})/(${tn(E1)}+${tn(D1)})`, { note: R`Step 1, unlever: \(r_U = ${pcT(ru, 4)}\).` }),
              TI.line(`ans+${tn(de2)}*(ans-${tn(rD)})`, Object.assign(PCT(rE2), { note: R`Step 2, relever with the new \(\frac{D}{E} = ${nt(de2, 2)}\). That is \(${pc(rE2)}\).` }))],
            why: R`With no taxes, \(r_U\) does not change with leverage. Unlever with the old mix, then relever with the new one.`,
          };
        } },
    ],
  };
  pack.generators.forEach((g) => { const make = g.make; g.make = (rng) => tidy(make(rng)); });
  root.registerPack(pack);
})(typeof window !== 'undefined' ? window : globalThis);
