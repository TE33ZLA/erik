/* Floor 8 — Week 9: Risk and return (single assets, portfolios, diversification, beta, CAPM and the SML). */
(function (root) {
  'use strict';
  const { FIN, L, T } = root;
  const R = String.raw;
  const P = (r) => +(r * 100).toFixed(8); // decimal rate -> percent units for answers

  /* ---------- local helpers ---------- */
  const pc = (r, dp = 2) => L.pct(r, dp);        // LaTeX percent from a decimal: 0.1234 -> 12.34\%
  const pcT = (r, dp = 4) => L.pctT(r, dp);      // LaTeX percent, trailing zeros trimmed
  const nt = (x, dp = 4) => L.numT(x, dp);       // LaTeX number, trimmed
  const br = (x, dp = 4) => (x < 0 ? '(' + L.numT(x, dp) + ')' : L.numT(x, dp)); // bracket negatives when substituting
  const tp = (r, dp = 2) => T.pctT(r, dp);       // plain-text percent, trimmed: −2%, 9.2%
  const t4 = (x) => T.num(x, 4);                 // plain-text number with 4 decimals (matrix cells)
  const sum = (xs) => xs.reduce((a, b) => a + b, 0);
  const andList = (xs) => (xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]);
  /** k different fictional company names */
  const cos = (rng, k) => { const out = []; while (out.length < k) { const c = rng.company(); if (!out.includes(c)) out.push(c); } return out; };
  const two = (rng) => cos(rng, 2);
  const hp = (x) => (x < 0 ? `${T.numT(-x, 4)} [+/−]` : T.numT(x, 4)); // HP10bII+ entry of a signed number
  const STATES = ['Recession', 'Normal', 'Boom'];
  const PROBS = [[0.25, 0.5, 0.25], [0.2, 0.5, 0.3], [0.3, 0.5, 0.2], [0.25, 0.6, 0.15], [0.2, 0.6, 0.2], [0.15, 0.6, 0.25], [0.1, 0.6, 0.3], [0.3, 0.4, 0.3], [0.2, 0.55, 0.25]];
  const WEIGHTS = [0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8];
  /** sum of P_k (x_k - m)^2 written out */
  const probSq = (ps, xs, m) => ps.map((p, k) => `${nt(p, 2)}(${nt(xs[k])} - ${br(m, 6)})^{2}`).join(' + ');
  /** sum of P_k (x_k - mx)(y_k - my) written out */
  const probXY = (ps, xs, mx, ys, my) => ps.map((p, k) => `${nt(p, 2)}(${nt(xs[k])} - ${br(mx, 6)})(${nt(ys[k])} - ${br(my, 6)})`).join(' + ');
  const probSum = (ps, xs) => ps.map((p, k) => `${nt(p, 2)}(${nt(xs[k])})`).join(' + ');

  /* ---------- lecture and tutorial data (every number below is recomputed with FIN) ---------- */
  const EX3 = { p: [0.1, 0.2, 0.4, 0.2, 0.1], r: [0.09, 0.10, 0.11, 0.12, 0.13] };
  const EX3_TABLE = { head: ['Return', 'Probability'], rows: EX3.r.map((r, k) => [tp(r), nt(EX3.p[k], 2)]) };
  const HB = { p: [0.25, 0.6, 0.15], h: [-0.02, 0.092, 0.154], s: [0.05, 0.062, 0.074] };
  const eH = FIN.expRet(HB.p, HB.h), eS = FIN.expRet(HB.p, HB.s);
  const sdH = FIN.sdProb(HB.p, HB.h), sdSB = FIN.sdProb(HB.p, HB.s), covHS = FIN.covProb(HB.p, HB.h, HB.s);
  const HB_TABLE = { head: ['State', 'Probability', 'Highbull', 'Slowbear'], rows: [['Recession', '0.25', '−2%', '5%'], ['Normal', '0.60', '9.2%', '6.2%'], ['Boom', '0.15', '15.4%', '7.4%']] };
  const NIK = [0.08, 0.15, -0.12, 0.11, 0.09, -0.06], RUS = [0.12, 0.09, -0.07, 0.13, 0.04, -0.14];
  const NIK_TABLE = { head: ['Month', 'Nikkei', 'Russell 2000'], rows: NIK.map((x, k) => [k + 1, tp(x), tp(RUS[k])]) };
  const covNR = FIN.covS(NIK, RUS);
  const DJ = [0.13, 0.07, -0.12], SPX = [0.06, 0.09, -0.10];
  const DJ_TABLE = { head: ['Month', 'DJIA', 'S&P 500'], rows: DJ.map((x, k) => [k + 1, tp(x), tp(SPX[k])]) };
  const covDS = FIN.covS(DJ, SPX);
  const PRAC = [0.19, 0.20, -0.30, 0.26];
  const SH = { A: [0.10, 0.07, 0.11, 0.09, 0.18], B: [0.12, 0.12, 0.11, 0.09, 0.10], C: [0.07, -0.12, 0.32, 0.15, -0.13], D: [-0.03, -0.11, 0.22, 0.02, -0.01] };
  const SH_TABLE = { head: ['Year', 'Share A', 'Share B', 'Share C', 'Share D'], rows: [2011, 2012, 2013, 2014, 2015].map((y, k) => [y, tp(SH.A[k]), tp(SH.B[k]), tp(SH.C[k]), tp(SH.D[k])]) };
  const shCV = (k) => FIN.cv(FIN.sdS(SH[k]), FIN.mean(SH[k]));
  const HIST_TABLE = { head: ['US series, 1925–2011', 'Average return', 'Standard deviation'], rows: [
    ['Small company stocks', '16.5%', '32.5%'], ['Large company stocks', '11.8%', '20.3%'], ['Long-term corporate bonds', '6.4%', '8.4%'],
    ['Long-term government bonds', '6.1%', '9.8%'], ['US Treasury bills', '3.6%', '3.1%'], ['Inflation', '3.1%', '4.2%']] };
  const EX5_TABLE = { head: ['Asset', 'Expected return', 'Risk (SD)'], rows: [['Alpha', '17.6%', '12.3%'], ['Beta', '17.4%', '20.0%'], ['Gamma', '13.8%', '18.8%'], ['Delta', '1.7%', '13.4%']] };
  // Lecture Example 3 (portfolio theory): variance-covariance matrix for SSBB, WW and the market
  const MX = { vS: 0.0221, vW: 0.0165, cSW: 0.0011, cSM: 0.0040, cWM: 0.0020, vM: 0.0100, rf: 0.08, rm: 0.14 };
  const MX_TABLE = { head: ['', 'SSBB', 'WW', 'Market'], rows: [['SSBB', '0.0221', '', ''], ['WW', '0.0011', '0.0165', ''], ['Market', '0.0040', '0.0020', '0.0100']] };
  const bSS = FIN.beta(MX.cSM, MX.vM), bWW = FIN.beta(MX.cWM, MX.vM);
  const eSS = FIN.capm(MX.rf, bSS, MX.rm), eWW = FIN.capm(MX.rf, bWW, MX.rm);
  const vPB = 0.4 * 0.4 * MX.vS + 0.6 * 0.6 * MX.vW + 2 * 0.4 * 0.6 * MX.cSW, sPB = Math.sqrt(vPB), ePB = FIN.portRet([0.4, 0.6], [eSS, eWW]);
  const vPC = 0.4 * 0.4 * MX.vS + 0.4 * 0.4 * MX.vW + 2 * 0.4 * 0.4 * MX.cSW, sPC = Math.sqrt(vPC), ePC = FIN.portRet([0.4, 0.4, 0.2], [eSS, eWW, MX.rf]);
  // Tutorial Q5
  const sdQ5 = FIN.portSD2(0.4, 0.40, 0.6, 0.45, 0.2);

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
    id: 'w9', floor: 8, week: 'Week 9',
    title: 'The Risk Casino',
    topic: 'Risk and return',
    color: '#d64545', icon: '🎲',
    intro: 'Welcome to the Risk Casino. Every table here is a bet on risk and return. Learn which risks the house pays you for, and the lift to Floor 9 opens.',

    briefing: [
      { h: 'Return: what you earn', points: [
        R`**Return** is the profit on an investment, usually shown as a **percentage** of what you paid.`,
        R`**Realised return** for one period: \(R_{t+1} = \frac{DIV_{t+1} + P_{t+1} - P_t}{P_t}\).`,
        R`It splits into the **dividend yield** \(\frac{DIV_{t+1}}{P_t}\) plus the **capital gain yield** \(\frac{P_{t+1} - P_t}{P_t}\).`,
        R`Over several years: \(HPR = (1+R_1)(1+R_2)\cdots(1+R_T) - 1\). Per year: \((1 + HPR)^{1/T} - 1\).`,
      ] },
      { h: 'Risk: two ways to measure it', points: [
        R`**Risk** is uncertainty about future outcomes. We measure it with the **variance** \(\sigma^2\) or the **standard deviation** \(\sigma = \sqrt{\sigma^2}\).`,
        R`**Method 1, probabilities:** \(E(R) = \sum_k P_k R_k\) and \(\sigma^2 = \sum_k P_k\left[R_k - E(R)\right]^2\).`,
        R`**Method 2, past data (a sample):** \(\bar{R} = \frac{R_1 + \cdots + R_T}{T}\) and \(Var(R) = \frac{1}{T-1}\sum_t (R_t - \bar{R})^2\).`,
        R`Divide by \(T - 1\) only for past data. With probabilities, the probabilities do the weighting.`,
        R`HP10bII+: clear with [C ALL], enter each return with [Σ+], then read the mean [x̄,ȳ] and the sample SD [Sx,Sy].`,
      ] },
      { h: 'The risk–return trade-off', points: [
        R`Finance assumes investors are **risk averse**: they want a higher expected return for more risk. (Risk neutral: ignores risk. Risk seeking: wants more risk.)`,
        R`US data 1925–2011, SD of returns: small stocks 32.5% > large stocks 20.3% > long-term government bonds 9.8% > corporate bonds 8.4% > Treasury bills 3.1%.`,
        R`Across **asset classes**, more risk has come with more average return. For **individual stocks** there is **no clear link**.`,
        R`**Coefficient of variation:** \(CV = \frac{\sigma}{E(R)}\), the risk per unit of return. A risk-averse investor picks the **lowest CV**.`,
      ] },
      { h: 'Covariance and correlation', points: [
        R`**Covariance** shows whether two returns move together. With probabilities: \(Cov(R_i,R_j) = \sum_n P_n(R_{i,n} - E(R_i))(R_{j,n} - E(R_j))\). With past data, divide by \(N - 1\).`,
        R`**Correlation:** \(\rho_{ij} = \frac{Cov(R_i,R_j)}{\sigma_i\sigma_j}\), so \(Cov(R_i,R_j) = \rho_{ij}\sigma_i\sigma_j\). It always lies between \(-1\) and \(+1\).`,
        R`\(\rho = +1\): no risk reduction. \(\rho = -1\): complete risk reduction is possible. \(\rho = 0\): no relationship.`,
        R`Lecture charts: \(\rho_{QAN,WOW} = 0.2668\) cuts risk a lot. \(\rho_{BHP,RIO} = 0.6148\) cuts it less.`,
      ] },
      { h: 'Portfolios', points: [
        R`Weights use **market values**: \(w_i = \frac{\text{shares}_i \times \text{price}_i}{\text{total value}}\).`,
        R`Portfolio return **is** a weighted average: \(E[R_p] = w_1E[R_1] + \cdots + w_nE[R_n]\).`,
        R`Portfolio risk is **not** (unless \(\rho = +1\)): \(\sigma_p^2 = w_i^2\sigma_i^2 + w_j^2\sigma_j^2 + 2w_iw_j\rho_{ij}\sigma_i\sigma_j\).`,
        R`A **risk-free asset** has \(\sigma = 0\) and zero covariance. With weight \(w\) in one risky asset: \(\sigma_p = w\sigma\).`,
        R`In a **variance–covariance matrix** the diagonal holds variances. The other cells hold covariances.`,
        R`**Sharpe ratio** \(= \frac{E[R_P] - r_f}{\sigma_P}\): excess return per unit of risk. Higher is better.`,
      ] },
      { h: 'Diversification', points: [
        R`**Total risk = systematic risk + unsystematic risk.**`,
        R`**Systematic** risk (market, non-diversifiable) comes from economy-wide news, such as interest rates or a recession.`,
        R`**Unsystematic** risk (unique, firm-specific, diversifiable) comes from news about one firm, such as a CEO leaving.`,
        R`Adding shares lowers portfolio SD. About **12 to 16 shares** remove most unsystematic risk (Fama 1976).`,
        R`Only **systematic risk** earns a risk premium. Unsystematic risk can be removed for free.`,
      ] },
      { h: 'Beta, CAPM and the SML', points: [
        R`**Beta** measures systematic risk: \(\beta_i = \frac{Cov(R_i,R_M)}{\sigma_M^2}\). \(\beta = 1\): as risky as the market. \(\beta > 1\): riskier. \(\beta < 1\): less risky.`,
        R`**CAPM:** \(E[R_i] = r_f + \beta_i(E[R_M] - r_f)\). The bracket is the **market risk premium**.`,
        R`**Portfolio beta** is a weighted average: \(\beta_p = w_1\beta_1 + \cdots + w_n\beta_n\).`,
        R`The **SML** plots CAPM returns against beta. **Above** the line = **undervalued** (buy). **Below** = **overvalued** (sell).`,
        R`Higher expected inflation raises \(r_f\): the SML shifts **up in parallel**. Higher risk aversion raises the market risk premium: the SML gets **steeper**.`,
      ] },
    ],

    topics: {
      ret: 'Realised and holding-period returns',
      prob: 'Expected return and risk from probabilities',
      hist: 'Average return and risk from past data',
      trade: 'Risk attitudes and the risk–return trade-off',
      cv: 'Comparing investments: CV and Sharpe ratio',
      corr: 'Covariance and correlation',
      port: 'Portfolio return and risk',
      divers: 'Diversification: systematic vs unsystematic risk',
      beta: 'Beta and portfolio beta',
      capm: 'CAPM and the Security Market Line',
    },

    nodes: [
      { id: 'w9-1', kind: 'battle', name: 'The Cashier’s Cage', topics: ['ret', 'prob', 'hist'], n: 6,
        enemy: { name: 'Standard Deviant', title: 'Never lands near the mean', body: 'spiky', color: '#9b59b6', acc: ['shades'], mouth: 'smirk', item: '🎲',
          lines: { intro: 'I never land near the mean, darling. That is what makes me exciting!', hit: ['You squared my deviations! Rude!', 'Divided by T − 1? How precise.'],
            taunt: ['Forgot the square root, did we?', 'Divide by T? Amateur hour!'], win: 'My variance… collapses… to zero…', lose: 'Volatility wins again! Roll the dice!' } } },
      { id: 'w9-2', kind: 'battle', name: 'The Card Tables', topics: ['trade', 'cv', 'corr'], n: 6,
        enemy: { name: 'The Correlation Croupier', title: 'Deals pairs that move together', body: 'tall', color: '#2e8b57', acc: ['tophat', 'bowtie'], mouth: 'grin', item: '🃏',
          lines: { intro: 'Place your bets! Will these two cards move together… or apart?', hit: ['Divided by both sigmas. The house is impressed.', 'Rho, rho, rho your boat… right past me.'],
            taunt: ['A correlation above 1? The house thanks you!', 'Covariance is not correlation, my friend.'], win: 'My deck… is completely uncorrelated…', lose: 'Perfectly positively correlated… with losing!' } } },
      { id: 'w9-m1', kind: 'mini', name: 'Systematic or Unsystematic?', mini: 'sys-unsys' },
      { id: 'w9-3', kind: 'battle', name: 'The Roulette Floor', topics: ['port', 'divers', 'corr'], n: 6,
        enemy: { name: 'One-Basket Bandit', title: 'Puts every chip on one stock', body: 'round', color: '#e08e2b', acc: ['bandana', 'mustache'], mouth: 'tongue', item: '🧺',
          lines: { intro: 'All my chips on one stock! What could possibly go wrong?', hit: ['You spread the risk! My only weakness!', 'The covariance term! Noooo!'],
            taunt: ['Portfolio SD is a weighted average. Trust me.', 'Why diversify when you can gamble?'], win: 'Should not have put… all my eggs… in one basket…', lose: 'All in! And you are all out!' } } },
      { id: 'w9-4', kind: 'battle', name: 'The High-Roller Lounge', topics: ['beta', 'capm'], n: 6,
        enemy: { name: 'Beta Blocker', title: 'Bouncer at the systematic door', body: 'box', color: '#3d5a80', acc: ['shades', 'headset'], mouth: 'flat', item: '📈',
          lines: { intro: 'Only systematic risk gets past this rope. Show me your beta.', hit: ['Beta times the market risk premium. You may pass.', 'You found the SML. Respect.'],
            taunt: ['Unsystematic risk earns nothing in here, pal.', 'You added the risk-free rate twice. Bounced!'], win: 'Access… granted…', lose: 'Your beta is not on the list tonight.' } } },
      { id: 'w9-m2', kind: 'mini', name: 'SML Sniper', mini: 'sml-sniper' },
      { id: 'w9-boss', kind: 'boss', name: 'The House', topics: '*', n: 10,
        enemy: { name: 'The House', title: 'Only pays for systematic risk', body: 'tall', color: '#8e1b3a', acc: ['crown', 'monocle'], eyes: 3, mouth: 'fangs', item: '🎰',
          lines: { intro: 'Welcome to my casino. I pay for systematic risk. Everything else… I keep.', hit: ['A diversified mind? Impossible!', 'You read my matrix like a pro!'],
            taunt: ['The house always wins!', 'Below the line! Overvalued, just like your confidence.'], win: 'The house… has lost…', lose: 'Your chips belong to the house now.' } } },
    ],

    minis: {
      'sys-unsys': {
        game: 'rapid', title: 'Systematic or Unsystematic?', intro: 'News is breaking! Does it hit the whole market (systematic) or just one firm (unsystematic)?',
        bins: [{ id: 'sys', label: 'Systematic' }, { id: 'uns', label: 'Unsystematic' }],
        items: [
          { t: 'The Reserve Bank raises interest rates', bin: 'sys', why: 'Interest rates affect almost every firm. This is market-wide risk.' },
          { t: 'A recession hits the whole economy', bin: 'sys', why: 'A recession cuts sales and profits across the market.' },
          { t: 'A company’s CEO suddenly resigns', bin: 'uns', why: 'This news is about one firm only. Diversification removes it.' },
          { t: 'A fire destroys one firm’s main factory', bin: 'uns', why: 'Firm-specific bad luck. Other firms are not affected.' },
          { t: 'Parliament passes a new company tax law', bin: 'sys', why: 'A tax change for all companies moves the whole market.' },
          { t: 'A car maker recalls its best-selling model', bin: 'uns', why: 'A product recall hits one firm.' },
          { t: 'Inflation jumps unexpectedly', bin: 'sys', why: 'Inflation is an economy-wide factor.' },
          { t: 'A firm wins a big government contract', bin: 'uns', why: 'Good news for one firm only.' },
          { t: 'World oil prices spike', bin: 'sys', why: 'Energy costs rise for firms right across the economy.' },
          { t: 'Workers strike at one mining company', bin: 'uns', why: 'A strike at one firm is firm-specific risk.' },
          { t: 'A pandemic slows the whole economy', bin: 'sys', why: 'An economy-wide shock cannot be diversified away.' },
          { t: 'A lawsuit is filed against one drug company', bin: 'uns', why: 'Legal trouble for one firm is unique risk.' },
          { t: 'The Australian dollar falls sharply', bin: 'sys', why: 'Exchange rates move with the whole economy.' },
          { t: 'A firm’s new drug fails its clinical trial', bin: 'uns', why: 'The failure hurts that firm, not the market.' },
          { t: 'A global financial crisis hits share markets', bin: 'sys', why: 'A market-wide crash is systematic risk.' },
          { t: 'Fraud is found in one firm’s accounts', bin: 'uns', why: 'An accounting scandal at one firm is unique risk.' },
          { t: 'Unemployment rises across the country', bin: 'sys', why: 'Lower spending hurts most firms.' },
          { t: 'A company loses its biggest customer', bin: 'uns', why: 'Only that company’s sales fall.' },
          { t: 'War breaks out and shakes world markets', bin: 'sys', why: 'A shock like this affects the whole market.' },
          { t: 'One airline’s planes are grounded for safety checks', bin: 'uns', why: 'The grounding hits one airline only.' },
        ],
        rounds: 12, seconds: 10,
      },
      'sml-sniper': {
        game: 'sml', title: 'SML Sniper',
        intro: 'Shares appear on the Security Market Line chart. Above the line = undervalued: BUY. Below the line = overvalued: SELL.',
        rounds: 8, seconds: 20,
      },
    },

    questions: [
      /* ----- realised and holding-period returns ----- */
      { id: 'w9-q01', topic: 'ret', kind: 'mcq', level: 1, section: 'A',
        q: R`In finance, **return** is best described as…`,
        choices: ['A measure of profit on an investment, usually shown as a percentage', 'The total dollar amount you invested', 'The chance that an investment loses money', 'The dividend a company pays each year'], answer: 0,
        why: R`Return measures the profit on an investment. It is usually a percentage of the amount invested, over one year or over the investment’s horizon.` },
      { id: 'w9-q02', topic: 'ret', kind: 'mcq', level: 1, section: 'A', formula: 'realised',
        q: R`A share’s **realised return** for one year has two parts. Which two?`,
        choices: ['Dividend yield + capital gain yield', 'Dividend yield + interest yield', 'Capital gain yield + risk premium', 'Coupon rate + yield to maturity'], answer: 0,
        why: R`\(R_{t+1} = \frac{DIV_{t+1}}{P_t} + \frac{P_{t+1} - P_t}{P_t}\): the income part plus the price-change part.` },
      { id: 'w9-q03', topic: 'ret', kind: 'num', level: 1, section: 'B', formula: 'realised', src: 'Lecture W9 Example 1',
        q: R`You bought 100 shares of ABC Ltd one year ago at $25.00 per share. You received $20.00 of dividends in total (20 cents per share). The share now sells for $30.00. What is your realised return?`,
        givens: [['P_0', R`\$25.00`], ['DIV_1', R`\$0.20 \text{ per share}`], ['P_1', R`\$30.00`]],
        answer: P(FIN.holdingReturn(25, 30, 0.2)), unit: '%', dp: 2,
        mistakes: [
          { v: 20, why: R`That is only the capital gain yield. Add the dividend yield \(\frac{0.20}{25} = 0.8\%\).` },
          { v: P(5.2 / 30), why: R`That divides by the ending price. Divide by what you paid, \(P_0 = \$25\).` },
          { v: 0.8, why: R`That is only the dividend yield. Add the capital gain yield of \(20\%\).` },
        ],
        steps: [
          R`You invested \(100 \times \$25 = \$2{,}500\). You now hold shares worth \(100 \times \$30 = \$3{,}000\), plus \(\$20\) of dividends.`,
          R`\[\text{Dollar gain} = \$20 + (\$3{,}000 - \$2{,}500) = \$520\]`,
          R`\[R = \frac{\$520}{\$2{,}500} = 0.208 = 20.80\%\]`,
          R`Per share: \(\frac{0.20 + 30 - 25}{25} = 0.8\% + 20\% = 20.8\%\).`,
        ],
        why: R`Dividend yield \(0.8\%\) plus capital gain yield \(20\%\) gives \(20.8\%\).` },
      { id: 'w9-q04', topic: 'ret', kind: 'num', level: 2, section: 'B', formula: 'hpr', src: 'Lecture W9 Example 2',
        q: R`An investment returned 10%, −5%, 20% and 15% in years 1 to 4. What is the four-year **holding period return** (HPR)?`,
        table: { head: ['Year', 'Return'], rows: [[1, '10%'], [2, '−5%'], [3, '20%'], [4, '15%']] },
        answer: P(FIN.hprMulti([0.10, -0.05, 0.20, 0.15])), unit: '%', dp: 2,
        mistakes: [
          { v: 40, why: 'Adding the returns ignores compounding. Multiply the growth factors instead.' },
          { v: P(FIN.hprMulti([0.10, -0.05, 0.20, 0.15]) + 1), why: 'You forgot to subtract 1 at the end.' },
          { v: 10, why: 'That is the average return per year, not the total return over four years.' },
        ],
        steps: [R`\[HPR = (1+R_1)(1+R_2)(1+R_3)(1+R_4) - 1\]`, R`\[HPR = (1.10)(0.95)(1.20)(1.15) - 1 = 1.4421 - 1 = 44.21\%\]`],
        why: R`Returns compound, so multiply the \((1 + R)\) factors and then subtract 1.` },
      { id: 'w9-q05', topic: 'ret', kind: 'num', level: 2, section: 'B', formula: 'hpr', src: 'Lecture W9 Example 2',
        q: R`An investment’s four-year holding period return is 44.21%. What is its **annualised** return (the equivalent return per year)?`,
        givens: [['HPR', R`44.21\%`], ['T', '4']],
        answer: P(FIN.annualise(0.4421, 4)), unit: '%', dp: 2,
        mistakes: [
          { v: 44.21 / 4, why: R`Dividing by 4 ignores compounding. Take the 4th root: \((1.4421)^{1/4} - 1\).` },
          { v: 44.21, why: 'That is the total four-year return, not a yearly rate.' },
          { v: P(FIN.annualise(0.4421, 3)), why: R`Use the 4th root for 4 years, not the cube root.` },
        ],
        steps: [R`\[r = (1 + HPR)^{1/T} - 1 = (1.4421)^{1/4} - 1 = 0.0958 = 9.58\%\text{ per year}\]`],
        calc: '4 [N] · −1 [PV] · 0 [PMT] · 1.4421 [FV] · [I/YR] → 9.58',
        why: R`Annualising undoes the compounding: take the \(T\)-th root of \((1 + HPR)\), then subtract 1.` },
      { id: 'w9-q06', topic: 'ret', kind: 'mcq', level: 2, section: 'A', formula: 'hpr',
        q: R`A share rises 50% in year 1 and then falls 50% in year 2. What is the two-year holding period return?`,
        choices: ['−25%', '0%', '+25%', '−50%'], answer: 0,
        why: R`\(HPR = (1.50)(0.50) - 1 = 0.75 - 1 = -25\%\). Adding the returns (\(+50\% - 50\% = 0\%\)) ignores compounding.` },

      /* ----- expected return and risk from probabilities ----- */
      { id: 'w9-q07', topic: 'prob', kind: 'num', level: 1, section: 'B', formula: 'exp-ret', src: 'Lecture W9 Example 3',
        q: R`A security has the return distribution below. What is its **expected return**?`,
        table: EX3_TABLE,
        answer: P(FIN.expRet(EX3.p, EX3.r)), unit: '%', dp: 2,
        mistakes: [
          { v: 4.4, why: R`That is only the most likely outcome: \(0.40 \times 11\% = 4.4\%\). Add all five products.` },
          { v: 2.2, why: 'You averaged the five products. Add them up: the probabilities already do the averaging.' },
        ],
        steps: [R`\[E(R) = \sum_{k} P_k R_k\]`, R`\[E(R) = ${probSum(EX3.p, EX3.r)} = 0.11 = 11\%\]`],
        why: 'Weight each possible return by its probability, then add.' },
      { id: 'w9-q08', topic: 'prob', kind: 'num', level: 2, section: 'B', formula: 'var-prob', src: 'Lecture W9 Example 3',
        q: R`The same security has an expected return of 11%. What is the **standard deviation** of its returns?`,
        table: EX3_TABLE,
        answer: P(FIN.sdProb(EX3.p, EX3.r)), unit: '%', dp: 2,
        mistakes: [
          { v: P(FIN.varProb(EX3.p, EX3.r)), why: R`That is the variance (\(0.00012\)) written as a percentage. Take the square root.` },
          { v: P(FIN.sdS(EX3.r)), why: R`That treats the returns as past data and divides by \(T - 1\). With probabilities, weight each squared deviation by \(P_k\).` },
          { v: P(Math.sqrt(FIN.varP(EX3.r))), why: 'That weights all five returns equally. Use the probabilities as the weights.' },
        ],
        steps: [
          R`\[\sigma^2 = \sum_k P_k\left[R_k - E(R)\right]^2\]`,
          R`\[\sigma^2 = ${probSq(EX3.p, EX3.r, 0.11)} = 0.00012\]`,
          R`\[\sigma = \sqrt{0.00012} = 0.010954 = 1.10\%\]`,
        ],
        why: R`Variance first, then the square root: \(\sigma = 1.095\%\), about \(1.10\%\).` },
      { id: 'w9-q09', topic: 'prob', kind: 'mcq', level: 1, section: 'A',
        q: R`In this unit, what is **risk**?`,
        choices: ['Uncertainty about the possible future outcomes of an investment', 'The chance of losing all of your money', 'The expected return on an investment', 'The price you pay for a share'], answer: 0,
        why: R`Risk is present whenever investors are uncertain about the outcome. We measure it by how far returns deviate from the expected return: the variance or standard deviation.` },
      { id: 'w9-q10', topic: 'prob', kind: 'mcq', level: 2, section: 'A', formula: 'var-prob',
        q: R`You have a table of **states of the economy with probabilities**. How do you find the variance of returns?`,
        choices: [R`Weight each squared deviation by its probability: \(\sum_k P_k[R_k - E(R)]^2\)`, R`Add the squared deviations and divide by \(T - 1\)`, R`Add the squared deviations and divide by \(T\)`, R`Weight each deviation (not squared) by its probability`], answer: 0,
        why: R`With probabilities, the probabilities do the averaging. Dividing by \(T - 1\) is only for a sample of past returns.` },
      { id: 'w9-q11', topic: 'prob', kind: 'num', level: 1, section: 'B', formula: 'exp-ret', src: 'Tutorial W9 Q1(a)',
        q: R`Mr Henry’s return forecasts for Highbull and Slowbear shares are below. What is the **expected return on Highbull**?`,
        table: HB_TABLE,
        answer: P(eH), unit: '%', dp: 2,
        mistakes: [
          { v: P(sum(HB.h) / 3), why: 'That is a simple average. Weight each return by its probability.' },
          { v: P(FIN.expRet(HB.p, [0.02, 0.092, 0.154])), why: R`The recession return is \(-2\%\). Keep the minus sign.` },
          { v: 9.2, why: 'That is the most likely return, not the probability-weighted average.' },
        ],
        steps: [
          R`\[E(R_H) = ${probSum(HB.p, HB.h)} = -0.005 + 0.0552 + 0.0231 = ${nt(eH, 6)} = ${pc(eH)}\]`,
          R`The same method gives Slowbear: \(E(R_S) = ${probSum(HB.p, HB.s)} = ${pc(eS)}\).`,
        ],
        why: 'Multiply each return by its probability, then add.' },
      { id: 'w9-q12', topic: 'prob', kind: 'num', level: 2, section: 'B', formula: 'var-prob', src: 'Tutorial W9 Q1(b)',
        q: R`Using Mr Henry’s forecasts, Highbull’s expected return is 7.33%. What is the **standard deviation** of Highbull’s returns?`,
        table: HB_TABLE,
        answer: P(sdH), unit: '%', dp: 2,
        mistakes: [
          { v: P(FIN.varProb(HB.p, HB.h)), why: R`That is the variance (\(0.003363\)). Take the square root.` },
          { v: P(FIN.sdS(HB.h)), why: R`That ignores the probabilities and divides by \(T - 1\). Weight each squared deviation by its probability.` },
          { v: P(FIN.expRet(HB.p, HB.h.map((x) => Math.abs(x - eH)))), why: 'Square each deviation before you weight it.' },
        ],
        steps: [
          R`\[\sigma_H^2 = ${probSq(HB.p, HB.h, eH)}\]`,
          R`\[\sigma_H^2 = ${HB.p.map((p, k) => nt(p * (HB.h[k] - eH) ** 2, 6)).join(' + ')} = ${nt(FIN.varProb(HB.p, HB.h), 6)}\]`,
          R`\[\sigma_H = \sqrt{${nt(FIN.varProb(HB.p, HB.h), 6)}} = ${nt(sdH, 4)} = ${pc(sdH)}\]`,
          R`The same method gives Slowbear: \(\sigma_S^2 = ${nt(FIN.varProb(HB.p, HB.s), 8)}\), so \(\sigma_S = ${pc(sdSB, 3)}\).`,
        ],
        why: 'Weight the squared deviations by the probabilities, add, then take the square root.' },
      { id: 'w9-q13', topic: 'corr', kind: 'num', level: 2, section: 'B', formula: 'cov-prob', src: 'Tutorial W9 Q1(c)',
        q: R`Using Mr Henry’s forecasts, \(E(R_H) = 7.33\%\) and \(E(R_S) = 6.08\%\). What is the **covariance** between Highbull and Slowbear returns? Give a decimal to 6 places.`,
        table: HB_TABLE,
        answer: covHS, unit: '', dp: 6,
        mistakes: [
          { v: HB.h.reduce((a, x, k) => a + (x - eH) * (HB.s[k] - eS), 0), why: 'You forgot to multiply each product by its probability.' },
          { v: FIN.covS(HB.h, HB.s), why: R`That ignores the probabilities and divides by \(N - 1\). With probabilities, weight each product by \(P_n\).` },
          { v: covHS / (sdH * sdSB), why: 'That is the correlation. The question asks for the covariance.' },
        ],
        steps: [
          R`\[Cov(R_H,R_S) = \sum_n P_n\,(R_{H,n} - E(R_H))(R_{S,n} - E(R_S))\]`,
          R`\[Cov = ${probXY(HB.p, HB.h, eH, HB.s, eS)}\]`,
          R`\[Cov = ${HB.p.map((p, k) => nt(p * (HB.h[k] - eH) * (HB.s[k] - eS), 8)).join(' + ')} = ${nt(covHS, 6)}\]`,
        ],
        why: 'Both deviations are usually on the same side of their means, so the covariance is positive: the shares move together.' },
      { id: 'w9-q14', topic: 'corr', kind: 'num', level: 3, section: 'B', formula: 'corr', src: 'Tutorial W9 Q1(c)', boss: true,
        q: R`For Highbull and Slowbear: \(Cov(R_H,R_S) = 0.000425\), \(\sigma_H = 5.80\%\) and \(\sigma_S = 0.749\%\). What is the **correlation** between the two shares? (4 decimal places)`,
        table: HB_TABLE,
        answer: covHS / (sdH * sdSB), unit: '', dp: 4, tol: 0.0006,
        mistakes: [
          { v: FIN.corrS(HB.h, HB.s), why: 'That ignores the probabilities (it treats the three states as equally likely past data).' },
          { v: covHS / (sdH + sdSB), why: 'Multiply the two SDs in the denominator; do not add them.' },
          { v: covHS / sdH, why: 'Divide by both standard deviations.' },
        ],
        steps: [
          R`\[\rho_{H,S} = \frac{Cov(R_H,R_S)}{\sigma_H\,\sigma_S} = \frac{${nt(covHS, 6)}}{${nt(sdH, 6)} \times ${nt(sdSB, 6)}} = ${nt(covHS / (sdH * sdSB), 4)}\]`,
        ],
        why: R`\(\rho \approx 0.978\): the two shares move almost perfectly together, so combining them gives little diversification.` },

      /* ----- average return and risk from past data ----- */
      { id: 'w9-q15', topic: 'hist', kind: 'mcq', level: 1, section: 'A', formula: 'var-sample',
        q: R`You estimate the variance from a **sample of past returns**. What do you divide the sum of squared deviations by?`,
        choices: [R`\(T - 1\), the number of observations minus one`, R`\(T\), the number of observations`, R`\(T + 1\)`, 'The sum of the probabilities'], answer: 0,
        why: R`Past returns are a sample, so the unit divides by \(T - 1\). Probabilities are only used with a probability distribution.` },
      { id: 'w9-q16', topic: 'hist', kind: 'num', level: 2, section: 'B', formula: 'var-sample', src: 'Lecture W9 Example 4',
        q: R`Asset A returned 9%, 10%, 11%, 12% and 13% over the past five years. Treating this as a sample, what is the **standard deviation** of returns?`,
        answer: P(FIN.sdS(EX3.r)), unit: '%', dp: 2,
        mistakes: [
          { v: P(Math.sqrt(FIN.varP(EX3.r))), why: R`That divides by \(T = 5\). For a sample divide by \(T - 1 = 4\).` },
          { v: P(FIN.varS(EX3.r)), why: R`That is the variance (\(0.00025\)). Take the square root.` },
          { v: 11, why: 'That is the average return, not the standard deviation.' },
        ],
        steps: [
          R`\[\bar{R} = \frac{0.09 + 0.10 + 0.11 + 0.12 + 0.13}{5} = 0.11\]`,
          R`\[Var(R) = \frac{(0.09-0.11)^2 + (0.10-0.11)^2 + (0.11-0.11)^2 + (0.12-0.11)^2 + (0.13-0.11)^2}{5 - 1} = \frac{0.001}{4} = 0.00025\]`,
          R`\[SD = \sqrt{0.00025} = 0.0158 = 1.58\%\]`,
        ],
        calc: '[C ALL] · 0.09 [Σ+] · 0.10 [Σ+] · 0.11 [Σ+] · 0.12 [Σ+] · 0.13 [Σ+] · [x̄,ȳ] → 0.11 · [Sx,Sy] → 0.0158',
        why: R`Past data is a sample, so divide by \(T - 1\), then take the square root.` },
      { id: 'w9-q17', topic: 'hist', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W9 Examples 3 and 4',
        q: R`Lecture Example 3 treats the returns 9% to 13% as a **probability distribution** (SD 1.10%). Example 4 treats the same numbers as **five past returns** (SD 1.58%). Why do the SDs differ?`,
        choices: [R`Example 4 weights each return equally and divides by \(T - 1\); Example 3 weights by the probabilities`, 'One of the two lecture calculations is wrong', 'Example 4 ignores the mean', 'Example 3 uses returns in percent and Example 4 uses decimals'], answer: 0,
        why: R`Example 3 puts 40% weight on the middle return, so extreme returns count less. Example 4 counts every year equally and divides by \(T - 1 = 4\).` },
      { id: 'w9-q18', topic: 'hist', kind: 'num', level: 2, section: 'B', formula: 'var-sample', src: 'Lecture W9 Practice',
        q: R`An investment returned 19%, 20%, −30% and 26% in years 1 to 4. What is the **standard deviation** of its returns (a sample)?`,
        table: { head: ['Year', 'Return'], rows: PRAC.map((x, k) => [k + 1, tp(x)]) },
        answer: P(FIN.sdS(PRAC)), unit: '%', dp: 2,
        mistakes: [
          { v: P(Math.sqrt(FIN.varP(PRAC))), why: R`That divides by \(T = 4\). For past data divide by \(T - 1 = 3\).` },
          { v: P(FIN.varS(PRAC)), why: 'That is the variance. Take the square root.' },
          { v: P(FIN.mean(PRAC)), why: 'That is the average return, not the standard deviation.' },
        ],
        steps: [
          R`\[\bar{R} = \frac{0.19 + 0.20 + (-0.30) + 0.26}{4} = ${nt(FIN.mean(PRAC), 6)} = ${pc(FIN.mean(PRAC))}\]`,
          R`\[Var(R) = \frac{${PRAC.map((x) => `(${nt(x)} - 0.0875)^{2}`).join(' + ')}}{4 - 1} = \frac{${nt(FIN.varS(PRAC) * 3, 6)}}{3} = ${nt(FIN.varS(PRAC), 6)}\]`,
          R`\[SD = \sqrt{${nt(FIN.varS(PRAC), 6)}} = ${nt(FIN.sdS(PRAC), 4)} = ${pc(FIN.sdS(PRAC))}\]`,
        ],
        calc: `[C ALL] · 0.19 [Σ+] · 0.20 [Σ+] · 0.30 [+/−] [Σ+] · 0.26 [Σ+] · [x̄,ȳ] → 0.0875 · [Sx,Sy] → ${T.numT(FIN.sdS(PRAC), 4)}`,
        why: R`The one bad year (\(-30\%\)) is far from the mean of \(8.75\%\), so the SD is large.` },
      { id: 'w9-q19', topic: 'hist', kind: 'num', level: 2, section: 'B', formula: 'var-sample', src: 'Tutorial W9 Q2(a)',
        q: R`The table shows six monthly returns for two share indexes (a sample). What is the monthly **standard deviation** of the **Nikkei**?`,
        table: NIK_TABLE,
        answer: P(FIN.sdS(NIK)), unit: '%', dp: 2,
        mistakes: [
          { v: P(Math.sqrt(FIN.varP(NIK))), why: R`That divides by \(T = 6\). For a sample divide by \(T - 1 = 5\).` },
          { v: P(FIN.varS(NIK)), why: 'That is the variance. Take the square root.' },
          { v: P(FIN.mean(NIK)), why: 'That is the mean monthly return, not the standard deviation.' },
        ],
        steps: [
          R`\[\bar{R}_{Nikkei} = \frac{0.08 + 0.15 + (-0.12) + 0.11 + 0.09 + (-0.06)}{6} = ${nt(FIN.mean(NIK), 6)} = ${pc(FIN.mean(NIK))}\]`,
          R`\[Var = \frac{\sum (R_t - \bar{R})^2}{6 - 1} = \frac{${nt(FIN.varS(NIK) * 5, 6)}}{5} = ${nt(FIN.varS(NIK), 6)}\]`,
          R`\[SD = \sqrt{${nt(FIN.varS(NIK), 6)}} = ${pc(FIN.sdS(NIK))}\]`,
          R`For the Russell 2000: mean \(${pc(FIN.mean(RUS))}\) and SD \(${pc(FIN.sdS(RUS))}\).`,
        ],
        calc: `[C ALL] · 0.08 [Σ+] · 0.15 [Σ+] · 0.12 [+/−] [Σ+] · 0.11 [Σ+] · 0.09 [Σ+] · 0.06 [+/−] [Σ+] · [x̄,ȳ] → ${T.numT(FIN.mean(NIK), 4)} · [Sx,Sy] → ${T.numT(FIN.sdS(NIK), 4)}`,
        why: R`Use the sample formula: divide by \(T - 1\), then take the square root.` },
      { id: 'w9-q20', topic: 'corr', kind: 'num', level: 2, section: 'B', formula: 'cov-sample', src: 'Tutorial W9 Q2(b)',
        q: R`Using the six monthly returns below (a sample), what is the **covariance** between the Nikkei and the Russell 2000? Give a decimal to 6 places.`,
        table: NIK_TABLE,
        answer: covNR, unit: '', dp: 6,
        mistakes: [
          { v: covNR * 5 / 6, why: R`That divides by \(N = 6\). For a sample divide by \(N - 1 = 5\).` },
          { v: NIK.reduce((a, x, k) => a + x * RUS[k], 0) / 5, why: 'Subtract each mean before you multiply the pairs.' },
          { v: FIN.corrS(NIK, RUS), why: 'That is the correlation. The question asks for the covariance.' },
        ],
        steps: [
          R`Means: \(\bar{R}_N = ${nt(FIN.mean(NIK), 6)}\) and \(\bar{R}_R = ${nt(FIN.mean(RUS), 6)}\).`,
          R`\[Cov = \frac{1}{N-1}\sum_{n=1}^{N}(R_{N,n} - \bar{R}_N)(R_{R,n} - \bar{R}_R) = \frac{${nt(covNR * 5, 6)}}{5} = ${nt(covNR, 6)}\]`,
        ],
        calc: `[C ALL] · 0.08 [INPUT] 0.12 [Σ+] · 0.15 [INPUT] 0.09 [Σ+] · 0.12 [+/−] [INPUT] 0.07 [+/−] [Σ+] · 0.11 [INPUT] 0.13 [Σ+] · 0.09 [INPUT] 0.04 [Σ+] · 0.06 [+/−] [INPUT] 0.14 [+/−] [Σ+] · [x̂,r] [SWAP] → r · Cov = r × Sx × Sy`,
        why: 'A positive covariance: the two indexes tend to rise and fall together.' },
      { id: 'w9-q21', topic: 'corr', kind: 'num', level: 3, section: 'B', formula: 'corr', src: 'Tutorial W9 Q2(c)', boss: true,
        q: R`Using the same six months of data, what is the **correlation coefficient** between the Nikkei and the Russell 2000? (4 decimal places)`,
        table: NIK_TABLE,
        answer: FIN.corrS(NIK, RUS), unit: '', dp: 4, tol: 0.0006,
        mistakes: [
          { v: (covNR * 5 / 6) / (FIN.sdS(NIK) * FIN.sdS(RUS)), why: R`You mixed divisors: covariance \(\div N\) but SDs \(\div (N - 1)\). Use \(N - 1\) in all three.` },
          { v: covNR / (Math.sqrt(FIN.varP(NIK)) * Math.sqrt(FIN.varP(RUS))), why: R`You mixed divisors: SDs \(\div N\) but covariance \(\div (N - 1)\). A correlation can never be above 1.` },
          { v: covNR, why: R`That is the covariance. Divide it by \(\sigma_N\sigma_R\).` },
        ],
        steps: [
          R`\(Cov = ${nt(covNR, 6)}\), \(\sigma_N = ${nt(FIN.sdS(NIK), 6)}\), \(\sigma_R = ${nt(FIN.sdS(RUS), 6)}\).`,
          R`\[\rho = \frac{Cov}{\sigma_N\,\sigma_R} = \frac{${nt(covNR, 6)}}{${nt(FIN.sdS(NIK), 6)} \times ${nt(FIN.sdS(RUS), 6)}} = ${nt(FIN.corrS(NIK, RUS), 4)}\]`,
        ],
        calc: `[C ALL] · 0.08 [INPUT] 0.12 [Σ+] · 0.15 [INPUT] 0.09 [Σ+] · 0.12 [+/−] [INPUT] 0.07 [+/−] [Σ+] · 0.11 [INPUT] 0.13 [Σ+] · 0.09 [INPUT] 0.04 [Σ+] · 0.06 [+/−] [INPUT] 0.14 [+/−] [Σ+] · [x̂,r] [SWAP] → ${T.numT(FIN.corrS(NIK, RUS), 4)}`,
        why: 'A strong positive correlation: the two markets usually move together.' },

      /* ----- risk attitudes and the risk-return trade-off ----- */
      { id: 'w9-q22', topic: 'trade', kind: 'mcq', level: 1, section: 'A', src: 'Tutorial W9 concept check',
        q: R`Stocks with higher variability are expected to have…`,
        choices: ['Higher returns', 'Lower returns', 'No relation to return', 'An inverse relationship with return'], answer: 0,
        why: 'Investors are risk averse. They demand a higher expected return before they will hold a more volatile investment. This is the risk–return trade-off.' },
      { id: 'w9-q23', topic: 'trade', kind: 'mcq', level: 2, section: 'A', src: 'Tutorial W9 concept check',
        q: R`Which statements about the standard deviation of returns are true?\nI. Small stocks have a higher SD than large stocks.\nII. Large stocks have a lower SD than corporate bonds.\nIII. Corporate bonds have a higher SD than Treasury bills.`,
        choices: ['I and III', 'I, II and III', 'I and II', 'I only'], answer: 0,
        why: 'US data 1925–2011: small stocks 32.5% > large stocks 20.3% > corporate bonds 8.4% > Treasury bills 3.1%. Statement II is false: shares are far more volatile than bonds.' },
      { id: 'w9-q24', topic: 'trade', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W9 Historical returns',
        q: R`Using the table of US returns from 1925 to 2011, which asset class had the **highest** standard deviation?`,
        table: HIST_TABLE,
        choices: ['Small company stocks', 'Large company stocks', 'Long-term government bonds', 'US Treasury bills'], answer: 0,
        why: 'Small stocks had an SD of 32.5% and also the highest average return (16.5%). Across asset classes, more risk has come with more return.' },
      { id: 'w9-q25', topic: 'trade', kind: 'tf', level: 2, section: 'A', src: 'Tutorial W9 concept check',
        q: R`For **individual stocks**, there is a clear link between the volatility of returns and the average return.`,
        answer: false,
        why: 'For large portfolios and asset classes, more risk has meant more return. For individual stocks there is no clear link. Much of one stock’s volatility is unsystematic risk, which the market does not reward.' },
      { id: 'w9-q26', topic: 'trade', kind: 'mcq', level: 1, section: 'A',
        q: R`In finance, we generally assume that investors are…`,
        choices: ['Risk averse', 'Risk neutral', 'Risk seeking', 'Indifferent to both risk and return'], answer: 0,
        why: 'A risk-averse investor tries to maximise return and minimise risk. They need extra expected return to accept extra risk.' },
      { id: 'w9-q27', topic: 'trade', kind: 'mcq', level: 2, section: 'A',
        q: R`A **risk-neutral** investor…`,
        choices: ['Tries to maximise return and does not care about risk', 'Tries to maximise return and minimise risk', 'Tries to maximise both return and risk', 'Only ever buys risk-free assets'], answer: 0,
        why: 'Risk averse: more return, less risk. Risk neutral: more return, risk does not matter. Risk seeking: more return and more risk.' },
      { id: 'w9-q28', topic: 'trade', kind: 'mcq', level: 1, section: 'A', src: 'Tutorial W9 warm-up',
        q: R`Which has the **lower** expected return: a 5-year Australian Treasury bond, or a 5-year bond issued by Dingo Drones?`,
        choices: ['The Treasury bond, because it is less risky', 'The Dingo Drones bond, because companies are more efficient', 'They are the same, because both last 5 years', 'The Treasury bond, because governments pay no interest'], answer: 0,
        why: 'The Australian government is very unlikely to default, so its bond is less risky. Investors accept a lower expected return for lower risk.' },

      /* ----- CV and Sharpe ratio ----- */
      { id: 'w9-q29', topic: 'cv', kind: 'mcq', level: 2, section: 'B', formula: 'cv', src: 'Lecture W9 Example 5',
        q: R`You are a **risk-averse** investor. Using the coefficient of variation, which asset should you prefer?`,
        table: EX5_TABLE,
        choices: ['Alpha', 'Beta', 'Gamma', 'Delta'], answer: 0,
        steps: [R`\(CV_{Alpha} = \frac{12.3}{17.6} = ${nt(12.3 / 17.6, 4)}\)`, R`\(CV_{Beta} = \frac{20.0}{17.4} = ${nt(20 / 17.4, 4)}\)`, R`\(CV_{Gamma} = \frac{18.8}{13.8} = ${nt(18.8 / 13.8, 4)}\)`, R`\(CV_{Delta} = \frac{13.4}{1.7} = ${nt(13.4 / 1.7, 4)}\)`],
        why: R`Alpha has the lowest risk per unit of return: \(CV = ${nt(12.3 / 17.6, 4)}\). It also has the highest return and the lowest SD.` },
      { id: 'w9-q30', topic: 'cv', kind: 'mcq', level: 1, section: 'A', formula: 'cv',
        q: R`The **coefficient of variation** (CV) measures…`,
        choices: ['Risk per unit of expected return', 'Return per unit of risk', 'The average of past returns', 'How two assets move together'], answer: 0,
        why: R`\(CV = \frac{\sigma}{E(R)}\). A risk-averse investor prefers the lowest CV.` },
      { id: 'w9-q31', topic: 'cv', kind: 'mcq', level: 2, section: 'B', formula: 'cv', src: 'Tutorial W9 Q3',
        q: R`Annual returns for four shares (2011–2015) are below. If you could invest in only **one** share, which would a risk-averse investor choose?`,
        table: SH_TABLE,
        choices: ['Share B', 'Share A', 'Share C', 'Share D'], answer: 0,
        steps: ['A', 'B', 'C', 'D'].map((k) => R`Share ${k}: \(\bar{R} = ${pc(FIN.mean(SH[k]))}\), \(\sigma = ${pc(FIN.sdS(SH[k]))}\), \(CV = ${nt(shCV(k), 4)}\)`),
        why: R`Share B has the lowest CV (\(${nt(shCV('B'), 4)}\)): the least risk per unit of return. Share A has the highest average return (11%), but its CV is \(${nt(shCV('A'), 4)}\).` },
      { id: 'w9-q32', topic: 'cv', kind: 'tf', level: 1, section: 'A',
        q: R`If two securities have the same expected return, a risk-averse investor prefers the one with the lower standard deviation.`,
        answer: true, why: 'Same return, less risk: an easy choice. The CV is only needed when both return and risk differ.' },
      { id: 'w9-q33', topic: 'cv', kind: 'mcq', level: 3, section: 'B', formula: 'sharpe', src: 'Lecture W9 Example 3(d)', boss: true,
        q: R`Portfolio B: \(E(R) = 9.68\%\), \(\sigma = 10.00\%\). Portfolio C: \(E(R) = 9.44\%\), \(\sigma = 8.08\%\). The risk-free rate is 8%. Using the **Sharpe ratio**, which portfolio is better?`,
        choices: ['Portfolio C', 'Portfolio B', 'Neither: their Sharpe ratios are equal', 'You cannot tell without their betas'], answer: 0,
        steps: [R`\[S_B = \frac{0.0968 - 0.08}{0.1000} = ${nt(FIN.sharpe(ePB, MX.rf, sPB), 4)}\]`, R`\[S_C = \frac{0.0944 - 0.08}{0.0808} = ${nt(FIN.sharpe(0.0944, 0.08, 0.0808), 4)}\]`],
        why: R`C earns more excess return per unit of risk (\(0.178 > 0.168\)). Its CV is lower too: \(0.856\) vs \(1.033\).` },
      { id: 'w9-q34', topic: 'cv', kind: 'num', level: 2, section: 'B', formula: 'sharpe', src: 'Lecture W9 Example 3(d)',
        q: R`Portfolio C has an expected return of 9.44% and a standard deviation of 8.08%. The risk-free rate is 8%. What is its **Sharpe ratio**? (4 decimal places)`,
        givens: [['E[R_P]', R`9.44\%`], ['\\sigma_P', R`8.08\%`], ['r_f', R`8\%`]],
        answer: FIN.sharpe(0.0944, 0.08, 0.0808), unit: '', dp: 4, tol: 0.0006,
        mistakes: [
          { v: 0.0944 / 0.0808, why: R`Subtract \(r_f\) first. The Sharpe ratio uses the excess return.` },
          { v: 0.0808 / 0.0144, why: 'That is upside down. The excess return goes on top.' },
          { v: 0.0808 / 0.0944, why: 'That is the CV (risk per unit of return), not the Sharpe ratio.' },
        ],
        steps: [R`\[\text{Sharpe} = \frac{E[R_P] - r_f}{\sigma_P} = \frac{0.0944 - 0.08}{0.0808} = \frac{0.0144}{0.0808} = ${nt(FIN.sharpe(0.0944, 0.08, 0.0808), 4)}\]`],
        why: 'Excess return per unit of total risk. Higher is better.' },

      /* ----- covariance and correlation ----- */
      { id: 'w9-q35', topic: 'corr', kind: 'mcq', level: 1, section: 'A', formula: 'corr',
        q: R`The correlation coefficient always lies between…`,
        choices: [R`\(-1\) and \(+1\)`, R`\(0\) and \(1\)`, R`\(-\infty\) and \(+\infty\)`, R`\(0\) and \(100\)`], answer: 0,
        why: R`\(\rho = \frac{Cov}{\sigma_i\sigma_j}\) is standardised, so \(-1 \le \rho \le +1\). A value outside this range means a calculation error.` },
      { id: 'w9-q36', topic: 'corr', kind: 'mcq', level: 2, section: 'A',
        q: R`Two assets have a correlation of \(+1\). What happens to risk when you combine them?`,
        choices: ['No risk reduction: the portfolio SD is just the weighted average of their SDs', 'Complete risk reduction is possible', 'Portfolio risk rises above both assets’ SDs', 'Risk falls to zero automatically'], answer: 0,
        why: R`With \(\rho = +1\) the formula collapses to \(\sigma_p = w_1\sigma_1 + w_2\sigma_2\). That is risk averaging, not risk reduction.` },
      { id: 'w9-q37', topic: 'corr', kind: 'mcq', level: 2, section: 'A',
        q: R`Which correlation gives the **greatest** possible diversification benefit?`,
        choices: [R`\(\rho = -1\)`, R`\(\rho = 0\)`, R`\(\rho = +0.5\)`, R`\(\rho = +1\)`], answer: 0,
        why: R`With \(\rho = -1\) the assets move exactly opposite, so complete risk reduction is possible. The lower the correlation, the bigger the benefit.` },
      { id: 'w9-q38', topic: 'corr', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W9 QAN/WOW and BHP/RIO charts',
        q: R`From the lecture charts: \(\rho_{QAN,WOW} = 0.2668\) and \(\rho_{BHP,RIO} = 0.6148\). An equally weighted portfolio of which pair reduces risk more?`,
        choices: ['QAN and WOW, because their correlation is lower', 'BHP and RIO, because their correlation is higher', 'Both pairs reduce risk equally', 'Neither pair: two shares can never reduce risk'], answer: 0,
        why: 'Lower correlation means more risk reduction. BHP and RIO move together more closely (0.6148), so combining them removes less risk.' },
      { id: 'w9-q39', topic: 'corr', kind: 'mcq', level: 1, section: 'A', formula: 'corr',
        q: R`Which equation links covariance and correlation?`,
        choices: [R`\(Cov(R_i,R_j) = \rho_{ij}\,\sigma_i\,\sigma_j\)`, R`\(Cov(R_i,R_j) = \frac{\rho_{ij}}{\sigma_i\,\sigma_j}\)`, R`\(Cov(R_i,R_j) = \rho_{ij} + \sigma_i + \sigma_j\)`, R`\(Cov(R_i,R_j) = \sigma_i^2\,\sigma_j^2\)`], answer: 0,
        why: R`\(\rho_{ij} = \frac{Cov(R_i,R_j)}{\sigma_i\sigma_j}\), so \(Cov(R_i,R_j) = \rho_{ij}\sigma_i\sigma_j\). The lecture stresses you must know this link.` },
      { id: 'w9-q40', topic: 'corr', kind: 'num', level: 2, section: 'B', formula: 'cov-sample', src: 'Lecture W9 Example 6(a)',
        q: R`Monthly returns for two US indexes are below (a sample). The means are 0.02667 (DJIA) and 0.01667 (S&P 500). What is the **covariance** between them? Give a decimal to 6 places.`,
        table: DJ_TABLE,
        answer: covDS, unit: '', dp: 6,
        mistakes: [
          { v: covDS * 2 / 3, why: R`That divides by \(N = 3\). For a sample divide by \(N - 1 = 2\).` },
          { v: DJ.reduce((a, x, k) => a + x * SPX[k], 0) / 2, why: 'Subtract each mean before you multiply the pairs.' },
          { v: 0.012383 / (0.1305 * 0.1021), why: 'That is the correlation. The question asks for the covariance.' },
        ],
        steps: [
          R`\[Cov = \frac{(0.13 - 0.0267)(0.06 - 0.0167) + (0.07 - 0.0267)(0.09 - 0.0167) + (-0.12 - 0.0267)(-0.10 - 0.0167)}{3 - 1}\]`,
          R`\[Cov = \frac{${nt(covDS * 2, 6)}}{2} = ${nt(covDS, 6)}\]`,
        ],
        why: R`Multiply the paired deviations, add them, and divide by \(N - 1\).` },
      { id: 'w9-q41', topic: 'corr', kind: 'num', level: 2, section: 'B', formula: 'corr', src: 'Lecture W9 Example 6(b)',
        q: R`For the DJIA and S&P 500: \(Cov = 0.012383\), \(\sigma_{DJIA} = 0.1305\) and \(\sigma_{S\&P} = 0.1021\). What is the **correlation coefficient**? (4 decimal places)`,
        answer: 0.012383 / (0.1305 * 0.1021), unit: '', dp: 4, tol: 0.0006,
        mistakes: [
          { v: 0.012383 / 0.1305, why: 'Divide by both standard deviations.' },
          { v: 0.012383 / (0.1305 + 0.1021), why: 'Multiply the two SDs in the denominator; do not add them.' },
          { v: 0.012383 / (0.1305 * 0.1305 * 0.1021 * 0.1021), why: 'Divide by the standard deviations, not the variances. A correlation can never be above 1.' },
        ],
        steps: [R`\[\rho = \frac{Cov}{\sigma_{DJIA}\,\sigma_{S\&P}} = \frac{0.012383}{0.1305 \times 0.1021} = ${nt(0.012383 / (0.1305 * 0.1021), 4)}\]`],
        why: R`With the unrounded SDs (\(${nt(FIN.sdS(DJ), 6)}\) and \(${nt(FIN.sdS(SPX), 6)}\)) you get \(${nt(FIN.corrS(DJ, SPX), 4)}\). Both round to about \(0.93\): a strong positive link.` },
      { id: 'w9-q42', topic: 'corr', kind: 'tf', level: 1, section: 'A', formula: 'cov-sample',
        q: R`A positive covariance means the two assets’ returns tend to move in the same direction.`,
        answer: true, why: 'When one return is above its mean, the other tends to be above its mean too, so the products of the deviations are mostly positive.' },

      /* ----- portfolio return and risk ----- */
      { id: 'w9-q43', topic: 'port', kind: 'mcq', level: 1, section: 'A', formula: 'port-var',
        q: R`Which statement about a portfolio is correct?`,
        choices: ['Its return is a weighted average of the assets’ returns, but its risk is not', 'Its return and its risk are both weighted averages', 'Its risk is a weighted average, but its return is not', 'Its return is always the highest of the assets’ returns'], answer: 0,
        why: R`Portfolio SD depends on how the assets move together. It equals the weighted average of the SDs only when \(\rho = +1\).` },
      { id: 'w9-q44', topic: 'port', kind: 'num', level: 1, section: 'B', formula: 'port-ret', src: 'Tutorial W9 Q4',
        q: R`A portfolio has 135 shares of Stock A at $47 each and 105 shares of Stock B at $41 each. What is the portfolio **weight of Stock A**?`,
        givens: [['V_A', R`135 \times \$47 = \$6{,}345`], ['V_B', R`105 \times \$41 = \$4{,}305`]],
        answer: P(6345 / 10650), unit: '%', dp: 2,
        mistakes: [
          { v: P(135 / 240), why: 'Weights use market values (shares × price), not the number of shares.' },
          { v: P(47 / 88), why: 'That uses the prices only. Multiply each price by the number of shares.' },
          { v: P(4305 / 10650), why: 'That is the weight of Stock B.' },
        ],
        steps: [R`\[V = \$6{,}345 + \$4{,}305 = \$10{,}650\]`, R`\[w_A = \frac{\$6{,}345}{\$10{,}650} = ${pc(6345 / 10650)} \qquad w_B = \frac{\$4{,}305}{\$10{,}650} = ${pc(4305 / 10650)}\]`],
        why: 'Each weight is the value held in that asset divided by the total value. The weights add up to 100%.' },
      { id: 'w9-q45', topic: 'port', kind: 'num', level: 1, section: 'B', formula: 'port-ret', src: 'Lecture W9 Example 7',
        q: R`60% of a portfolio is in Security 1 (expected return 8%) and 40% is in Security 2 (expected return 12%). What is the portfolio’s **expected return**?`,
        answer: P(FIN.portRet([0.6, 0.4], [0.08, 0.12])), unit: '%', dp: 2,
        mistakes: [
          { v: 10, why: 'That is a simple average. Weight each return by the fraction invested.' },
          { v: P(FIN.portRet([0.4, 0.6], [0.08, 0.12])), why: 'The weights are the wrong way round: 60% goes with 8%.' },
        ],
        steps: [R`\[E(R_P) = w_1E(R_1) + w_2E(R_2) = (0.60)(0.08) + (0.40)(0.12) = 0.096 = 9.60\%\]`],
        why: 'Portfolio return is a weighted average of the assets’ expected returns.' },
      { id: 'w9-q46', topic: 'port', kind: 'num', level: 2, section: 'B', formula: 'port-var', src: 'Lecture W9 Example 8',
        q: R`You invest $14,000 in Cheaters Anonymous Ltd and $6,000 in Tricky Dicky Ltd. Their correlation is 0.9336. What is the **standard deviation** of your portfolio?`,
        table: { head: ['', 'Cheaters Anonymous', 'Tricky Dicky'], rows: [['Amount invested', '$14,000', '$6,000'], ['Expected return', '6%', '6.25%'], ['Standard deviation', '6.32%', '12.42%']] },
        answer: P(FIN.portSD2(0.7, 0.0632, 0.3, 0.1242, 0.9336)), unit: '%', dp: 2,
        mistakes: [
          { v: P(0.7 * 0.0632 + 0.3 * 0.1242), why: R`Portfolio SD is not a weighted average of the SDs (unless \(\rho = +1\)).` },
          { v: P(Math.sqrt(0.49 * 0.0632 ** 2 + 0.09 * 0.1242 ** 2)), why: R`You dropped the \(2w_1w_2\rho\sigma_1\sigma_2\) term.` },
          { v: P(FIN.portVar2(0.7, 0.0632, 0.3, 0.1242, 0.9336)), why: 'That is the variance. Take the square root.' },
        ],
        steps: [
          R`Weights: \(w_1 = \frac{14{,}000}{20{,}000} = 0.70\) and \(w_2 = 0.30\).`,
          R`\[\sigma_p^2 = (0.70)^2(0.0632)^2 + (0.30)^2(0.1242)^2 + 2(0.70)(0.30)(0.9336)(0.0632)(0.1242)\]`,
          R`\[\sigma_p^2 = 0.001957 + 0.001388 + 0.003078 = ${nt(FIN.portVar2(0.7, 0.0632, 0.3, 0.1242, 0.9336), 6)}\]`,
          R`\[\sigma_p = \sqrt{${nt(FIN.portVar2(0.7, 0.0632, 0.3, 0.1242, 0.9336), 6)}} = ${pc(FIN.portSD2(0.7, 0.0632, 0.3, 0.1242, 0.9336))}\]`,
        ],
        why: 'The expected returns are extra information here. Risk needs the weights, the SDs and the correlation.' },
      { id: 'w9-q47', topic: 'port', kind: 'num', level: 3, section: 'B', formula: 'port-var', src: 'Lecture W9 Example 8 (follow-up)', boss: true,
        q: R`Same portfolio: $14,000 in Cheaters Anonymous (SD 6.32%) and $6,000 in Tricky Dicky (SD 12.42%). What is the portfolio SD if the correlation is now **−0.9336**?`,
        answer: P(FIN.portSD2(0.7, 0.0632, 0.3, 0.1242, -0.9336)), unit: '%', dp: 2,
        mistakes: [
          { v: P(FIN.portSD2(0.7, 0.0632, 0.3, 0.1242, 0.9336)), why: 'That uses the old correlation of +0.9336.' },
          { v: P(Math.sqrt(0.49 * 0.0632 ** 2 + 0.09 * 0.1242 ** 2)), why: R`That drops the covariance term. With \(\rho < 0\) the term is negative and cuts risk.` },
          { v: P(0.7 * 0.0632 + 0.3 * 0.1242), why: 'Portfolio SD is not a weighted average of the SDs.' },
        ],
        steps: [
          R`\[\sigma_p^2 = 0.001957 + 0.001388 + 2(0.70)(0.30)(-0.9336)(0.0632)(0.1242)\]`,
          R`\[\sigma_p^2 = 0.001957 + 0.001388 - 0.003078 = ${nt(FIN.portVar2(0.7, 0.0632, 0.3, 0.1242, -0.9336), 6)}\]`,
          R`\[\sigma_p = \sqrt{${nt(FIN.portVar2(0.7, 0.0632, 0.3, 0.1242, -0.9336), 6)}} = ${pc(FIN.portSD2(0.7, 0.0632, 0.3, 0.1242, -0.9336))}\]`,
        ],
        why: 'A strongly negative correlation makes the covariance term subtract, so the risk falls from 8.01% to about 1.64%.' },
      { id: 'w9-q48', topic: 'port', kind: 'num', level: 2, section: 'B', formula: 'port-var', src: 'Tutorial W9 Q5(b)',
        q: R`Portfolio 1 holds 40% in asset A and 60% in asset B. The correlation between A and B is 0.20. What is the **standard deviation** of Portfolio 1?`,
        table: { head: ['Asset', 'Expected return', 'Standard deviation'], rows: [['A', '12.5%', '40%'], ['B', '16%', '45%'], ['Risk-free F', '8%', '0%']] },
        answer: P(sdQ5), unit: '%', dp: 2,
        mistakes: [
          { v: 43, why: R`Portfolio SD is not a weighted average of the SDs (unless \(\rho = +1\)).` },
          { v: P(Math.sqrt(0.16 * 0.16 + 0.36 * 0.2025)), why: R`You dropped the \(2w_Aw_B\rho\sigma_A\sigma_B\) term.` },
          { v: P(Math.sqrt(0.16 * 0.16 + 0.36 * 0.2025 + 0.4 * 0.6 * 0.2 * 0.4 * 0.45)), why: 'The covariance term has a 2 in front. Count it twice.' },
        ],
        steps: [
          R`\[\sigma_p^2 = (0.4)^2(0.40)^2 + (0.6)^2(0.45)^2 + 2(0.4)(0.6)(0.20)(0.40)(0.45)\]`,
          R`\[\sigma_p^2 = 0.0256 + 0.0729 + 0.01728 = 0.11578\]`,
          R`\[\sigma_p = \sqrt{0.11578} = ${pc(sdQ5)}\]`,
          R`Its expected return is \(0.4(12.5\%) + 0.6(16\%) = 14.6\%\).`,
        ],
        why: 'Combining A and B (correlation only 0.2) gives an SD well below the weighted average of 43%.' },
      { id: 'w9-q49', topic: 'port', kind: 'num', level: 2, section: 'B', formula: 'port-var', src: 'Tutorial W9 Q5(b)',
        q: R`Portfolio 2 holds 40% in asset A (SD 40%) and 60% in the risk-free asset F (return 8%). What is the **standard deviation** of Portfolio 2?`,
        answer: 16, unit: '%', dp: 2,
        mistakes: [
          { v: 20.8, why: 'The risk-free asset has zero SD. Its 8% is a return, not a risk.' },
          { v: 40, why: R`Moving money into the risk-free asset scales risk down: \(\sigma_p = w_A\sigma_A\).` },
          { v: 2.56, why: R`That is the variance \((0.4 \times 0.40)^2\). Take the square root.` },
        ],
        steps: [
          R`The risk-free asset has \(\sigma_F = 0\) and zero covariance with A, so two terms vanish:`,
          R`\[\sigma_p^2 = (0.4)^2(0.40)^2 + (0.6)^2(0)^2 + 2(0.4)(0.6)\rho(0.40)(0) = 0.0256\]`,
          R`\[\sigma_p = \sqrt{0.0256} = 0.16 = 16\%\]`,
          R`Its expected return is \(0.4(12.5\%) + 0.6(8\%) = 9.8\%\).`,
        ],
        why: R`With a risk-free asset, \(\sigma_p = w \times \sigma\) of the risky part: \(0.4 \times 40\% = 16\%\).` },
      { id: 'w9-q50', topic: 'port', kind: 'mcq', level: 3, section: 'B', formula: 'sharpe', src: 'Tutorial W9 Q5(b)', boss: true,
        q: R`Portfolio 1: \(E(R) = 14.6\%\), \(\sigma = 34.03\%\). Portfolio 2: \(E(R) = 9.8\%\), \(\sigma = 16\%\). The risk-free rate is 8%. Using the Sharpe ratio, which portfolio gives the better reward for its risk?`,
        choices: ['Portfolio 1', 'Portfolio 2, because it has lower risk', 'They are exactly equal', 'Portfolio 2, because it holds the risk-free asset'], answer: 0,
        steps: [R`\[S_1 = \frac{0.146 - 0.08}{${nt(sdQ5, 4)}} = ${nt(FIN.sharpe(0.146, 0.08, sdQ5), 4)}\]`, R`\[S_2 = \frac{0.098 - 0.08}{0.16} = ${nt(FIN.sharpe(0.098, 0.08, 0.16), 4)}\]`],
        why: 'Lower risk is not automatically better. Portfolio 1 earns more excess return per unit of risk (0.194 vs 0.113).' },
      { id: 'w9-q51', topic: 'port', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W9 Example 3',
        q: R`In a **variance–covariance matrix**, what sits on the diagonal?`,
        table: MX_TABLE,
        choices: ['Each asset’s variance', 'Each asset’s standard deviation', 'The covariances between pairs of assets', 'The correlations between pairs of assets'], answer: 0,
        why: 'The diagonal holds variances (an asset’s covariance with itself), for example 0.0221 for SSBB. The other cells hold covariances, for example 0.0011 for SSBB and WW.' },
      { id: 'w9-q52', topic: 'port', kind: 'num', level: 3, section: 'B', formula: 'port-var', src: 'Lecture W9 Example 3(b)', boss: true,
        q: R`Use the matrix. Portfolio B holds 40% in SSBB and 60% in WW. What is the **standard deviation** of Portfolio B?`,
        table: MX_TABLE,
        answer: P(sPB), unit: '%', dp: 2,
        mistakes: [
          { v: P(0.4 * Math.sqrt(MX.vS) + 0.6 * Math.sqrt(MX.vW)), why: 'Portfolio SD is not a weighted average of the SDs.' },
          { v: P(Math.sqrt(0.16 * MX.vS + 0.36 * MX.vW)), why: R`You dropped the \(2w_1w_2Cov\) term (\(Cov = 0.0011\)).` },
          { v: P(Math.sqrt(0.4 * MX.vS + 0.6 * MX.vW + 2 * 0.4 * 0.6 * MX.cSW)), why: 'Square the weights on the variance terms.' },
        ],
        steps: [
          R`With a covariance given directly, \(\sigma_p^2 = w_1^2\sigma_1^2 + w_2^2\sigma_2^2 + 2w_1w_2Cov_{12}\).`,
          R`\[\sigma_p^2 = (0.4)^2(0.0221) + (0.6)^2(0.0165) + 2(0.4)(0.6)(0.0011) = 0.003536 + 0.00594 + 0.000528 = ${nt(vPB, 6)}\]`,
          R`\[\sigma_p = \sqrt{${nt(vPB, 6)}} = ${pc(sPB)}\]`,
          R`The slide shows \(10.01\%\) because it squares the rounded SDs \(0.1487\) and \(0.1285\). Both answers round to about \(10\%\).`,
        ],
        why: R`Its expected return is \(0.4(10.4\%) + 0.6(9.2\%) = 9.68\%\).` },
      { id: 'w9-q53', topic: 'port', kind: 'num', level: 3, section: 'B', formula: 'port-var', src: 'Lecture W9 Example 3(c)', boss: true,
        q: R`Your manager gives {NAME} $500,000 to invest: $200,000 in SSBB, $200,000 in WW and $100,000 in the risk-free asset. Use the matrix. What is the **standard deviation** of this portfolio (Portfolio C)?`,
        table: MX_TABLE,
        answer: P(sPC), unit: '%', dp: 2,
        mistakes: [
          { v: P(Math.sqrt(0.25 * MX.vS + 0.25 * MX.vW + 2 * 0.25 * MX.cSW)), why: 'That ignores the risk-free asset. The weights are 0.4, 0.4 and 0.2 of the whole $500,000.' },
          { v: P(0.4 * Math.sqrt(MX.vS) + 0.4 * Math.sqrt(MX.vW)), why: 'Portfolio SD is not a weighted average of the SDs.' },
          { v: P(Math.sqrt(0.16 * MX.vS + 0.16 * MX.vW)), why: R`You dropped the \(2w_1w_2Cov\) term.` },
        ],
        steps: [
          R`Weights: \(w_{SSBB} = 0.4\), \(w_{WW} = 0.4\), \(w_F = 0.2\). The risk-free asset adds no variance and no covariance.`,
          R`\[\sigma_p^2 = (0.4)^2(0.0221) + (0.4)^2(0.0165) + 2(0.4)(0.4)(0.0011) = ${nt(vPC, 6)}\]`,
          R`\[\sigma_p = \sqrt{${nt(vPC, 6)}} = ${pc(sPC)}\]`,
        ],
        why: R`Its expected return is \(0.4(10.4\%) + 0.4(9.2\%) + 0.2(8\%) = ${pc(ePC)}\).` },
      { id: 'w9-q54', topic: 'port', kind: 'tf', level: 2, section: 'A',
        q: R`A risk-free asset has a standard deviation of zero and zero covariance with every risky asset.`,
        answer: true, why: 'Its return is certain, so it never deviates from its mean. That is why adding it scales portfolio risk down in proportion.' },

      /* ----- diversification ----- */
      { id: 'w9-q55', topic: 'divers', kind: 'mcq', level: 1, section: 'A',
        q: R`Total risk is made up of…`,
        choices: ['Systematic risk + unsystematic risk', 'Market risk + systematic risk', 'Beta + correlation', 'Variance + covariance'], answer: 0,
        why: 'Systematic (market) risk comes from economy-wide news. Unsystematic (firm-specific) risk comes from news about one firm.' },
      { id: 'w9-q56', topic: 'divers', kind: 'mcq', level: 1, section: 'A', src: 'Tutorial W9 concept check',
        q: R`As we increase the number of stocks in a portfolio, the standard deviation of the portfolio’s returns…`,
        choices: ['Decreases', 'Increases', 'Remains unchanged', 'Doubles'], answer: 0,
        why: 'Firm-specific shocks start to cancel out. The SD falls towards the level of systematic risk and then flattens.' },
      { id: 'w9-q57', topic: 'divers', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W9 (Fama 1976)',
        q: R`According to the lecture (Fama 1976), about how many shares does it take to remove **most** unsystematic risk?`,
        choices: ['About 12 to 16', 'About 2 or 3', 'At least 100', 'No number of shares can remove it'], answer: 0,
        why: 'Most unsystematic risk can be removed with a portfolio of some 12 to 16 shares, as long as they are spread across industries.' },
      { id: 'w9-q58', topic: 'divers', kind: 'mcq', level: 2, section: 'A',
        q: R`Which kind of risk earns a **risk premium**?`,
        choices: ['Systematic (market) risk only', 'Unsystematic (firm-specific) risk only', 'Both, in proportion to total risk', 'Neither kind of risk'], answer: 0,
        why: 'Investors can remove unsystematic risk for free by diversifying. So the market only pays for bearing systematic risk.' },
      { id: 'w9-q59', topic: 'divers', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W9 Risk diversification',
        q: R`Which investor is **diversified**?`,
        choices: ['One who owns 50 shares spread across 20 different industries', 'One who owns 50 internet shares', 'One who owns a single share in a very large company', 'One who owns 10 gold-mining shares'], answer: 0,
        why: 'Diversification needs shares that do not all move together. Fifty internet shares still share the same industry risk.' },
      { id: 'w9-q60', topic: 'divers', kind: 'tf', level: 2, section: 'A',
        q: R`If you hold enough shares, diversification removes systematic risk as well.`,
        answer: false, why: 'Systematic risk comes from economy-wide factors that hit almost every share. It remains however many shares you hold.' },
      { id: 'w9-q61', topic: 'divers', kind: 'mcq', level: 1, section: 'A',
        q: R`Unsystematic risk is also called…`,
        choices: ['Diversifiable, unique or firm-specific risk', 'Market or non-diversifiable risk', 'Beta risk', 'Interest rate risk'], answer: 0,
        why: 'It is unique to one firm (or industry), so holding many shares can diversify it away.' },

      /* ----- beta ----- */
      { id: 'w9-q62', topic: 'beta', kind: 'mcq', level: 1, section: 'A', formula: 'beta',
        q: R`A share has a beta of 1.5. Compared with the market, it is…`,
        choices: ['Riskier: it tends to move about 1.5 times as much as the market', 'Less risky than the market', 'Exactly as risky as the market', 'Risk-free'], answer: 0,
        why: R`\(\beta = 1\): as risky as the market. \(\beta > 1\): riskier. \(\beta < 1\): less risky.` },
      { id: 'w9-q63', topic: 'beta', kind: 'mcq', level: 2, section: 'A', formula: 'beta',
        q: R`What does **beta** measure?`,
        choices: ['A security’s systematic risk: how strongly it responds to market movements', 'A security’s total risk, its standard deviation', 'A security’s unsystematic risk', 'The correlation between two shares'], answer: 0,
        why: R`\(\beta_i = \frac{Cov(R_i,R_M)}{\sigma_M^2}\). It only counts the part of risk that moves with the market.` },
      { id: 'w9-q64', topic: 'beta', kind: 'tf', level: 1, section: 'A', formula: 'beta',
        q: R`The market portfolio has a beta of exactly 1.`,
        answer: true, why: R`\(\beta_M = \frac{Cov(R_M,R_M)}{\sigma_M^2} = \frac{\sigma_M^2}{\sigma_M^2} = 1\).` },
      { id: 'w9-q65', topic: 'beta', kind: 'num', level: 2, section: 'B', formula: 'beta', src: 'Lecture W9 Example 3(a)',
        q: R`Use the variance–covariance matrix. What is the **beta** of SSBB?`,
        table: MX_TABLE,
        answer: bSS, unit: '', dp: 2,
        mistakes: [
          { v: MX.cSM / Math.sqrt(MX.vM), why: R`Divide by the market’s variance (\(0.0100\)), not its SD (\(0.10\)).` },
          { v: MX.cSM / MX.vS, why: 'Use the market’s variance, not SSBB’s own variance.' },
          { v: MX.cSM / Math.sqrt(MX.vS * MX.vM), why: 'That is the correlation between SSBB and the market, not beta.' },
        ],
        steps: [R`\[\beta_{SSBB} = \frac{Cov(R_{SSBB},R_M)}{\sigma_M^2} = \frac{0.0040}{0.0100} = 0.4\]`, R`Likewise \(\beta_{WW} = \frac{0.0020}{0.0100} = 0.2\).`],
        why: 'Read the covariance with the market from the bottom row, and the market variance from the diagonal.' },
      { id: 'w9-q66', topic: 'beta', kind: 'num', level: 1, section: 'B', formula: 'port-beta', src: 'Tutorial W9 Q7(c)',
        q: R`Suppose News Corporation shares have a beta of 1.7 and CBA shares have a beta of 1.0. What is the beta of a portfolio with 60% in News Corporation and 40% in CBA?`,
        answer: FIN.portBeta([0.6, 0.4], [1.7, 1.0]), unit: '', dp: 2,
        mistakes: [
          { v: 1.35, why: 'That is a simple average. Weight each beta by the portfolio weight.' },
          { v: FIN.portBeta([0.4, 0.6], [1.7, 1.0]), why: 'The weights are the wrong way round: 60% goes with News Corporation.' },
        ],
        steps: [R`\[\beta_p = w_1\beta_1 + w_2\beta_2 = 0.6(1.7) + 0.4(1.0) = 1.02 + 0.40 = 1.42\]`],
        why: 'Portfolio beta is a weighted average of the betas.' },
      { id: 'w9-q67', topic: 'beta', kind: 'num', level: 2, section: 'B', formula: 'port-beta', src: 'Lecture W9 SML Example 2(a)',
        q: R`A portfolio holds 40% in share 1 (beta 1.00), 25% in share 2 (beta 0.75) and 35% in share 3 (beta 1.30). What is the **portfolio beta**?`,
        answer: FIN.portBeta([0.4, 0.25, 0.35], [1, 0.75, 1.3]), unit: '', dp: 2,
        mistakes: [
          { v: (1 + 0.75 + 1.3) / 3, why: 'That is a simple average. Weight each beta by its share of the portfolio.' },
          { v: 0.4 * 1 + 0.25 * 0.75, why: 'Include all three shares in the weighted average.' },
        ],
        steps: [R`\[\beta_p = 0.40(1.00) + 0.25(0.75) + 0.35(1.30) = 0.40 + 0.1875 + 0.455 = 1.0425 \approx 1.04\]`, R`Its expected return is \(0.40(12\%) + 0.25(11\%) + 0.35(15\%) = 12.8\%\).`],
        why: 'A beta just above 1: the portfolio is slightly riskier than the market.' },

      /* ----- CAPM and the SML ----- */
      { id: 'w9-q68', topic: 'capm', kind: 'num', level: 1, section: 'B', formula: 'capm', src: 'Tutorial W9 Q6',
        q: R`A stock has a beta of 1.5. The expected return on the market is 11% and the risk-free rate is 5%. Using CAPM, what must the stock’s expected return be?`,
        givens: [['\\beta', '1.5'], ['E[R_M]', R`11\%`], ['r_f', R`5\%`]],
        answer: P(FIN.capm(0.05, 1.5, 0.11)), unit: '%', dp: 2,
        mistakes: [
          { v: 21.5, why: R`Multiply beta by the market risk premium \(11\% - 5\% = 6\%\), not by \(11\%\).` },
          { v: 9, why: R`That is only the risk premium \(\beta(E[R_M] - r_f)\). Add \(r_f\).` },
          { v: 16.5, why: R`That is \(\beta \times E[R_M]\). CAPM is \(r_f + \beta(E[R_M] - r_f)\).` },
        ],
        steps: [R`\[E[R_i] = r_f + \beta_i(E[R_M] - r_f) = 5\% + 1.5(11\% - 5\%) = 5\% + 9\% = 14\%\]`],
        why: 'Risk-free rate plus beta times the market risk premium.' },
      { id: 'w9-q69', topic: 'capm', kind: 'num', level: 1, section: 'B', formula: 'capm', src: 'Tutorial W9 Q7(a)',
        q: R`Suppose News Corporation shares have a beta of 1.7. The risk-free rate is 4% and the expected market return is 10%. Using CAPM, what is the expected return on News Corporation shares?`,
        answer: P(FIN.capm(0.04, 1.7, 0.10)), unit: '%', dp: 2,
        mistakes: [
          { v: 21, why: R`Use the market risk premium \(10\% - 4\% = 6\%\), not \(10\%\).` },
          { v: 10.2, why: R`That is only the risk premium. Add \(r_f = 4\%\).` },
          { v: 18.2, why: 'You added the risk-free rate twice.' },
        ],
        steps: [R`\[E[R] = 4\% + 1.7(10\% - 4\%) = 4\% + 10.2\% = 14.2\%\]`, R`For CBA (\(\beta = 1\)): \(4\% + 1(6\%) = 10\%\), the same as the market.`],
        why: 'A beta of 1.7 earns 1.7 times the market risk premium on top of the risk-free rate.' },
      { id: 'w9-q70', topic: 'capm', kind: 'num', level: 2, section: 'B', formula: 'port-beta', src: 'Tutorial W9 Q7(d)',
        q: R`Suppose a portfolio holds 60% News Corporation shares (expected return 14.2%, beta 1.7) and 40% CBA shares (expected return 10%, beta 1.0). The risk-free rate is 4% and the market return is 10%. What is the portfolio’s expected return?`,
        answer: P(FIN.capm(0.04, 1.42, 0.10)), unit: '%', dp: 2,
        mistakes: [
          { v: 12.1, why: 'That is a simple average. Use the 60/40 weights.' },
          { v: P(0.04 + 1.42 * 0.10), why: R`Multiply the portfolio beta by the market risk premium (\(6\%\)), not by \(10\%\).` },
          { v: P(FIN.portRet([0.4, 0.6], [0.142, 0.10])), why: 'The weights are the wrong way round.' },
        ],
        steps: [
          R`Way 1 (weighted average): \(0.6(14.2\%) + 0.4(10\%) = 8.52\% + 4\% = 12.52\%\).`,
          R`Way 2 (portfolio beta): \(\beta_p = 0.6(1.7) + 0.4(1.0) = 1.42\), so \(E[R_p] = 4\% + 1.42(6\%) = 12.52\%\).`,
        ],
        why: 'Both ways agree, because CAPM is a straight line in beta.' },
      { id: 'w9-q71', topic: 'capm', kind: 'mcq', level: 2, section: 'B', formula: 'capm', src: 'Lecture W9 SML Example 2(b)',
        q: R`The risk-free rate is 8% and the market return is 12%. Share 1 (beta 1.00) is expected to earn 12%, share 2 (beta 0.75) 11% and share 3 (beta 1.30) 15%. Which share is **undervalued**?`,
        chart: { type: 'sml', rf: 0.08, rm: 0.12, points: [{ name: 'Share 1', beta: 1.0, er: 0.12 }, { name: 'Share 2', beta: 0.75, er: 0.11 }, { name: 'Share 3', beta: 1.3, er: 0.15 }] },
        choices: ['Share 3: it plots above the SML', 'Share 1: it has a beta of 1', 'Share 2: it has the lowest beta', 'Shares 1, 2 and 3 are all fairly priced'], answer: 0,
        steps: [
          R`Share 1: \(8\% + 1.00(12\% - 8\%) = 12\%\). It is expected to earn 12%: on the SML.`,
          R`Share 2: \(8\% + 0.75(4\%) = 11\%\). It is expected to earn 11%: on the SML.`,
          R`Share 3: \(8\% + 1.30(4\%) = 13.2\%\). It is expected to earn 15%: above the SML.`,
        ],
        why: R`Share 3 offers more than its fair return (\(15\% > 13.2\%\)), so it is undervalued: buy. (The slide rounds 13.2% to 13%.)` },
      { id: 'w9-q72', topic: 'capm', kind: 'mcq', level: 1, section: 'A', formula: 'capm',
        q: R`A share plots **above** the SML. According to CAPM it is…`,
        choices: ['Undervalued: its expected return beats its required return, so buy', 'Overvalued: sell it', 'Fairly priced', 'Too risky to hold'], answer: 0,
        why: 'Above the line, the share offers more return than its beta requires. Buyers push its price up until it sits on the line.' },
      { id: 'w9-q73', topic: 'capm', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W9 SML and inflation',
        q: R`Investors raise their inflation expectations by 3%. What happens to the Security Market Line?`,
        choices: ['It shifts up in parallel by 3%: every required return rises by 3%', 'It becomes steeper', 'It becomes flatter', 'It does not move'], answer: 0,
        why: R`Higher expected inflation raises \(r_f\), the intercept. \(E(R_M)\) rises by the same amount, so the market risk premium (the slope) does not change.` },
      { id: 'w9-q74', topic: 'capm', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W9 SML and risk',
        q: R`Inflation is unchanged, but risk aversion rises and the market risk premium increases by 3 percentage points. What happens to the SML?`,
        choices: ['It becomes steeper: high-beta shares’ required returns rise the most', 'It shifts up in parallel by 3%', 'It becomes flatter', 'Only its intercept rises'], answer: 0,
        why: R`The slope of the SML is the market risk premium. Each required return rises by \(\beta \times 3\%\), so the line pivots up around \(r_f\).` },
      { id: 'w9-q75', topic: 'capm', kind: 'tf', level: 1, section: 'A', formula: 'capm',
        q: R`According to CAPM, a security with a beta of 0 has an expected return equal to the risk-free rate.`,
        answer: true, why: R`\(E[R] = r_f + 0 \times (E[R_M] - r_f) = r_f\). No systematic risk means no risk premium.` },
      { id: 'w9-q76', topic: 'capm', kind: 'mcq', level: 1, section: 'A', formula: 'capm',
        q: R`In CAPM, what is the **market risk premium**?`,
        choices: [R`\(E[R_M] - r_f\)`, R`\(E[R_M]\)`, R`\(\beta_i \times E[R_M]\)`, R`\(r_f - E[R_M]\)`], answer: 0,
        why: 'It is the extra return the market portfolio offers above the risk-free rate. It is the slope of the SML.' },
      { id: 'w9-q77', topic: 'capm', kind: 'mcq', level: 2, section: 'A', formula: 'capm',
        q: R`In equilibrium, where should every fairly priced security plot?`,
        choices: ['On the Security Market Line', 'Above the Security Market Line', 'Below the Security Market Line', 'On the horizontal axis'], answer: 0,
        why: 'In equilibrium, every security is priced so that its expected return equals its CAPM required return: it sits on the SML.' },
      { id: 'w9-q78', topic: 'capm', kind: 'num', level: 2, section: 'B', formula: 'capm', src: 'Lecture W9 Example 3(a)',
        q: R`Use the matrix: \(\beta_{WW} = 0.2\). The risk-free rate is 8% and the expected market return is 14%. Using CAPM, what is the expected return on WW?`,
        table: MX_TABLE,
        answer: P(eWW), unit: '%', dp: 2,
        mistakes: [
          { v: P(0.08 + 0.2 * 0.14), why: R`Multiply beta by the market risk premium \(14\% - 8\% = 6\%\), not by \(14\%\).` },
          { v: P(0.2 * 0.06), why: R`That is only the risk premium. Add \(r_f = 8\%\).` },
          { v: 14, why: 'That is the market return. WW has a low beta, so it needs less than the market.' },
        ],
        steps: [R`\[\beta_{WW} = \frac{0.0020}{0.0100} = 0.2\]`, R`\[E[R_{WW}] = 8\% + 0.2(14\% - 8\%) = 8\% + 1.2\% = 9.2\%\]`],
        why: 'This matches the 9.20% quoted in the lecture, so the estimate is justified.' },
    ],

    generators: [
      /* ---------- realised return ---------- */
      { id: 'w9-g-realised', topic: 'ret', level: 1, section: 'B', formula: 'realised', src: 'Lecture W9 Example 1',
        make(rng) {
          const co = rng.company();
          const n = rng.pick([100, 200, 250, 500, 1000]);
          let p0, dps, p1, r;
          for (let t = 0; t < 50; t++) {
            p0 = rng.step(8, 60, 0.5);
            dps = Math.round(p0 * rng.step(0.01, 0.06, 0.005) * 100) / 100;
            const g = rng.step(-0.2, 0.3, 0.01);
            p1 = Math.round(p0 * (1 + g) * 100) / 100;
            r = FIN.holdingReturn(p0, p1, dps);
            if (Math.abs(g) >= 0.02 && Math.abs(r) >= 0.01 && Math.abs((p1 - p0) / p0 - dps / p0) > 0.005) break;
          }
          const tot = dps * n;
          return {
            q: R`${rng.person()} bought ${n} shares of ${co} one year ago at ${T.money(p0)} per share. Over the year the shares paid ${T.money(tot)} of dividends in total. Today the share price is ${T.money(p1)}. What was the **realised return** for the year?`,
            givens: [['n', String(n)], ['P_0', L.money(p0)], ['DIV_1', R`\frac{${L.money(tot)}}{${n}} = ${L.money(dps)}`], ['P_1', L.money(p1)]],
            answer: P(r), unit: '%', dp: 2,
            mistakes: [
              { v: P((p1 - p0) / p0), why: 'That is only the capital gain yield. Add the dividend yield too.' },
              { v: P((dps + p1 - p0) / p1), why: R`That divides by today’s price. Divide by the price you paid, \(P_0\).` },
              { v: P(dps / p0), why: 'That is only the dividend yield. Add the capital gain yield too.' },
            ],
            steps: [
              R`Dividend per share: \(DIV_1 = \frac{${L.money(tot)}}{${n}} = ${L.money(dps)}\).`,
              R`\[R = \frac{DIV_1 + P_1 - P_0}{P_0} = \frac{${L.money(dps)} + ${L.money(p1)} - ${L.money(p0)}}{${L.money(p0)}} = \frac{${L.money(dps + p1 - p0)}}{${L.money(p0)}} = ${pc(r)}\]`,
              R`Check: dividend yield \(${pc(dps / p0)}\) plus capital gain yield \(${pc((p1 - p0) / p0)}\) gives \(${pc(r)}\).`,
            ],
            why: 'Realised return = dividend yield + capital gain yield, both measured against the price you paid.',
          };
        } },
      /* ---------- multi-period HPR and annualising ---------- */
      { id: 'w9-g-hpr', topic: 'ret', level: 2, section: 'B', formula: 'hpr', src: 'Lecture W9 Example 2',
        make(rng) {
          const n = rng.int(3, 5);
          let rs = Array.from({ length: n }, () => rng.step(-0.15, 0.25, 0.01));
          rs = rs.map((x) => (x === 0 ? 0.04 : x));
          if (!rs.some((x) => x < 0)) rs[rng.int(0, n - 1)] = -rng.step(0.02, 0.12, 0.01);
          if (Math.abs(FIN.annualise(FIN.hprMulti(rs), n)) < 0.01 || Math.abs(sum(rs)) < 0.005) rs[0] = +(rs[0] + (rs[0] < 0.1 ? 0.08 : -0.08)).toFixed(2);
          if (Math.abs(FIN.annualise(FIN.hprMulti(rs), n)) < 0.01) rs[1] = +(rs[1] + 0.12).toFixed(2);
          const hpr = FIN.hprMulti(rs), ann = FIN.annualise(hpr, n);
          const prod = rs.map((x) => `(${L.onePlus(x)})`).join('');
          const table = { head: ['Year', 'Return'], rows: rs.map((x, k) => [k + 1, tp(x)]) };
          const hprStep = R`\[HPR = ${prod} - 1 = ${nt(1 + hpr, 6)} - 1 = ${pc(hpr)}\]`;
          if (rng.chance(0.5)) {
            return {
              q: R`An investment earned the yearly returns below. What is the ${n}-year **holding period return** (HPR)?`,
              table, givens: rs.map((x, k) => [`R_${k + 1}`, pcT(x)]),
              answer: P(hpr), unit: '%', dp: 2,
              mistakes: [
                { v: P(sum(rs)), why: 'Adding the returns ignores compounding. Multiply the growth factors instead.' },
                { v: P(hpr + 1), why: 'You forgot to subtract 1 at the end.' },
                { v: P(sum(rs) / n), why: 'That is the average yearly return, not the total return.' },
              ],
              steps: [R`\[HPR = (1+R_1)(1+R_2)\cdots(1+R_{${n}}) - 1\]`, hprStep],
              why: R`Returns compound, so multiply the \((1 + R)\) factors, then subtract 1.`,
            };
          }
          return {
            q: R`An investment earned the yearly returns below. What is its **annualised** return (the equivalent compound return per year)?`,
            table, givens: rs.map((x, k) => [`R_${k + 1}`, pcT(x)]),
            answer: P(ann), unit: '%', dp: 2,
            mistakes: [
              { v: P(sum(rs) / n), why: 'That is the arithmetic average. It ignores compounding.' },
              { v: P(hpr / n), why: `Dividing the HPR by ${n} ignores compounding. Take the ${n}th root instead.` },
              { v: P(hpr), why: `That is the total ${n}-year return, not a yearly rate.` },
            ],
            steps: [hprStep, R`\[r = (1 + HPR)^{1/${n}} - 1 = (${nt(1 + hpr, 6)})^{1/${n}} - 1 = ${pc(ann)}\]`],
            calc: `${n} [N] · −1 [PV] · 0 [PMT] · ${T.numT(1 + hpr, 6)} [FV] · [I/YR] → ${T.num(ann * 100)}`,
            why: 'First compound to the HPR, then take the n-th root to get a rate per year.',
          };
        } },
      /* ---------- expected return from probabilities ---------- */
      { id: 'w9-g-exp-prob', topic: 'prob', level: 1, section: 'B', formula: 'exp-ret', src: 'Tutorial W9 Q1(a)',
        make(rng) {
          let ps, rs, e;
          for (let t = 0; t < 50; t++) {
            ps = rng.pick(PROBS);
            rs = [rng.step(-0.15, 0.03, 0.01), rng.step(0.04, 0.14, 0.01), rng.step(0.15, 0.35, 0.01)];
            e = FIN.expRet(ps, rs);
            if (Math.abs((rs[0] + rs[2]) / 2 - rs[1]) >= 0.01 && Math.abs(e) >= 0.01) break; // avoid evenly spaced returns and tiny answers
          }
          const mistakes = [
            { v: P(sum(rs) / 3), why: 'That is a simple average. Weight each return by its probability.' },
            { v: P(rs[1]), why: 'That is the most likely return, not the probability-weighted average.' },
            { v: P(e / 3), why: 'The probabilities already add to 1. Do not divide by the number of states.' },
          ];
          if (rs[0] < 0) mistakes.push({ v: P(FIN.expRet(ps, [-rs[0], rs[1], rs[2]])), why: 'The recession return is negative. Keep its minus sign.' });
          return {
            q: R`An analyst gives this forecast for ${rng.company()} shares. What is the **expected return**?`,
            table: { head: ['State', 'Probability', 'Return'], rows: STATES.map((s, k) => [s, nt(ps[k], 2), tp(rs[k])]) },
            answer: P(e), unit: '%', dp: 2, mistakes,
            steps: [R`\[E(R) = \sum_k P_k R_k\]`, R`\[E(R) = ${probSum(ps, rs)} = ${nt(e, 6)} = ${pc(e)}\]`],
            why: 'Weight each return by the chance that it happens, then add.',
          };
        } },
      /* ---------- SD from probabilities ---------- */
      { id: 'w9-g-sd-prob', topic: 'prob', level: 2, section: 'B', formula: 'var-prob', src: 'Tutorial W9 Q1(b)',
        make(rng) {
          const ps = rng.pick(PROBS);
          const rs = [rng.step(-0.15, 0.03, 0.01), rng.step(0.04, 0.14, 0.01), rng.step(0.15, 0.35, 0.01)];
          const e = FIN.expRet(ps, rs), v = FIN.varProb(ps, rs), s = Math.sqrt(v);
          return {
            q: R`Here is a forecast for ${rng.company()} shares. What is the **standard deviation** of returns?`,
            table: { head: ['State', 'Probability', 'Return'], rows: STATES.map((st, k) => [st, nt(ps[k], 2), tp(rs[k])]) },
            answer: P(s), unit: '%', dp: 2,
            mistakes: [
              { v: P(v), why: 'That is the variance. Take the square root to get the standard deviation.' },
              { v: P(FIN.sdS(rs)), why: R`That ignores the probabilities and divides by \(T - 1\), as if the states were past data.` },
              { v: P(FIN.expRet(ps, rs.map((x) => Math.abs(x - e)))), why: 'Square each deviation before you weight it.' },
            ],
            steps: [
              R`\[E(R) = ${probSum(ps, rs)} = ${nt(e, 6)}\]`,
              R`\[\sigma^2 = ${probSq(ps, rs, e)} = ${nt(v, 6)}\]`,
              R`\[\sigma = \sqrt{${nt(v, 6)}} = ${nt(s, 4)} = ${pc(s)}\]`,
            ],
            why: 'Expected return first, then probability-weighted squared deviations, then the square root.',
          };
        } },
      /* ---------- SD from past data ---------- */
      { id: 'w9-g-sd-hist', topic: 'hist', level: 2, section: 'B', formula: 'var-sample', src: 'Lecture W9 Example 4',
        make(rng) {
          const n = rng.int(4, 6);
          let rs = Array.from({ length: n }, () => rng.step(-0.25, 0.35, 0.01));
          if (FIN.sdS(rs) < 0.03) rs[0] = rs[0] > 0.1 ? rs[0] - 0.2 : rs[0] + 0.2;
          rs = rs.map((x) => +x.toFixed(2));
          const m = FIN.mean(rs), v = FIN.varS(rs), s = Math.sqrt(v);
          return {
            q: R`${rng.company()} shares returned the following over the last ${n} years. Treating these as a **sample** of past returns, what is the standard deviation of returns?`,
            table: { head: ['Year', 'Return'], rows: rs.map((x, k) => [k + 1, tp(x)]) },
            answer: P(s), unit: '%', dp: 2,
            mistakes: [
              { v: P(Math.sqrt(FIN.varP(rs))), why: R`That divides by \(T = ${n}\). For a sample of past returns divide by \(T - 1 = ${n - 1}\).` },
              { v: P(v), why: 'That is the variance. Take the square root to get the standard deviation.' },
              { v: P(m), why: 'That is the average return, not the standard deviation.' },
            ],
            steps: [
              R`\[\bar{R} = \frac{${rs.map((x) => br(x)).join(' + ')}}{${n}} = ${nt(m, 6)}\]`,
              R`\[Var(R) = \frac{${rs.map((x) => `(${nt(x)} - ${br(m, 6)})^{2}`).join(' + ')}}{${n} - 1} = \frac{${nt(v * (n - 1), 6)}}{${n - 1}} = ${nt(v, 6)}\]`,
              R`\[SD = \sqrt{${nt(v, 6)}} = ${nt(s, 4)} = ${pc(s)}\]`,
            ],
            calc: `[C ALL] · ${rs.map((x) => `${hp(x)} [Σ+]`).join(' · ')} · [x̄,ȳ] → ${T.numT(m, 4)} · [Sx,Sy] → ${T.numT(s, 4)}`,
            why: R`For past data: find the mean, square the deviations, divide by \(T - 1\), then take the square root.`,
          };
        } },
      /* ---------- coefficient of variation ---------- */
      { id: 'w9-g-cv', topic: 'cv', level: 1, section: 'B', formula: 'cv', src: 'Lecture W9 Example 5',
        make(rng) {
          const e = rng.step(0.05, 0.2, 0.001);
          let s = rng.step(0.05, 0.35, 0.001);
          if (Math.abs(e - s) < 0.005) s = +(s + 0.03).toFixed(3);
          const cv = FIN.cv(s, e);
          const co = rng.company();
          return {
            q: R`${co} shares have an expected return of ${tp(e, 1)} and a standard deviation of ${tp(s, 1)}. What is their **coefficient of variation** (CV)? (4 decimal places)`,
            givens: [['E(R)', pcT(e)], ['\\sigma', pcT(s)]],
            answer: cv, unit: '', dp: 4, tol: Math.max(0.0006, cv * 0.001),
            mistakes: [
              { v: e / s, why: R`That is upside down. \(CV = \frac{\sigma}{E(R)}\): risk goes on top.` },
              { v: (s * s) / e, why: 'Use the standard deviation, not the variance.' },
            ],
            steps: [R`\[CV = \frac{\sigma}{E(R)} = \frac{${pcT(s)}}{${pcT(e)}} = ${nt(cv, 4)}\]`],
            why: `The CV is the risk per unit of return: ${T.numT(cv, 2)} units of SD for each unit of expected return.`,
          };
        } },
      /* ---------- choosing by CV ---------- */
      { id: 'w9-g-cv-choose', topic: 'cv', level: 2, section: 'B', formula: 'cv', src: 'Tutorial W9 Q3',
        make(rng) {
          const names = cos(rng, 4);
          for (let tries = 0; tries < 60; tries++) {
            const as = names.map((nm) => { const e = rng.step(0.03, 0.2, 0.001), s = rng.step(0.04, 0.3, 0.001); return { nm, e, s, cv: s / e }; });
            const byCV = as.slice().sort((a, b) => a.cv - b.cv);
            if (byCV[1].cv - byCV[0].cv < 0.05) continue;
            const best = byCV[0];
            const lowSD = as.slice().sort((a, b) => a.s - b.s)[0], highE = as.slice().sort((a, b) => b.e - a.e)[0];
            if (best === lowSD && best === highE) continue; // too easy
            return {
              kind: 'mcq',
              q: R`A **risk-averse** investor can buy only one of these shares. Using the coefficient of variation, which should they choose?`,
              table: { head: ['Share', 'Expected return', 'Standard deviation'], rows: as.map((a) => [a.nm, tp(a.e, 1), tp(a.s, 1)]) },
              choices: as.map((a) => a.nm), answer: as.indexOf(best),
              steps: as.map((a) => R`\(CV_{\text{${a.nm}}} = \frac{${pcT(a.s)}}{${pcT(a.e)}} = ${nt(a.cv, 4)}\)`),
              why: R`The lowest CV means the least risk per unit of return. ${best.nm} has the lowest CV (\(${nt(best.cv, 4)}\)).`,
            };
          }
          return null;
        } },
      /* ---------- Sharpe ratio ---------- */
      { id: 'w9-g-sharpe', topic: 'cv', level: 1, section: 'B', formula: 'sharpe', src: 'Lecture W9 Example 3(d)',
        make(rng) {
          const rf = rng.step(0.02, 0.06, 0.005), e = +(rf + rng.step(0.02, 0.1, 0.001)).toFixed(4), s = rng.step(0.06, 0.3, 0.001);
          const sh = FIN.sharpe(e, rf, s);
          return {
            q: R`A portfolio has an expected return of ${tp(e)} and a standard deviation of ${tp(s, 1)}. The risk-free rate is ${tp(rf)}. What is its **Sharpe ratio**? (4 decimal places)`,
            givens: [['E[R_P]', pcT(e)], ['\\sigma_P', pcT(s)], ['r_f', pcT(rf)]],
            answer: sh, unit: '', dp: 4, tol: Math.max(0.0006, sh * 0.001),
            mistakes: [
              { v: e / s, why: R`Subtract \(r_f\) first. The Sharpe ratio uses the excess return.` },
              { v: s / (e - rf), why: 'That is upside down. The excess return goes on top.' },
              { v: s / e, why: 'That is the CV (risk per unit of return), not the Sharpe ratio.' },
            ],
            steps: [R`\[\text{Sharpe} = \frac{E[R_P] - r_f}{\sigma_P} = \frac{${nt(e)} - ${nt(rf)}}{${nt(s)}} = \frac{${nt(e - rf, 4)}}{${nt(s)}} = ${nt(sh, 4)}\]`],
            why: 'Excess return per unit of total risk. Higher is better.',
          };
        } },
      /* ---------- correlation <-> covariance ---------- */
      { id: 'w9-g-corr', topic: 'corr', level: 1, section: 'B', formula: 'corr', src: 'Lecture W9 Example 6(b)',
        make(rng) {
          const [a, b] = two(rng);
          const si = rng.step(0.08, 0.4, 0.005), sj = rng.step(0.08, 0.4, 0.005);
          let rho = rng.step(-0.8, 0.95, 0.05);
          if (Math.abs(rho) < 0.1) rho = 0.35;
          if (rng.chance(0.5)) {
            const cov = +(rho * si * sj).toFixed(5);
            const r = cov / (si * sj);
            return {
              q: R`The covariance between the returns of ${a} and ${b} is ${T.numT(cov, 5)}. Their standard deviations are ${tp(si, 1)} and ${tp(sj, 1)}. What is the **correlation coefficient**? (4 decimal places)`,
              givens: [['Cov', nt(cov, 5)], ['\\sigma_1', nt(si, 3)], ['\\sigma_2', nt(sj, 3)]],
              answer: r, unit: '', dp: 4, tol: 0.0006,
              mistakes: [
                { v: cov / si, why: 'Divide by both standard deviations.' },
                { v: cov / (si + sj), why: 'Multiply the two SDs in the denominator; do not add them.' },
                { v: cov / (si * si * sj * sj), why: 'Divide by the standard deviations, not the variances. A correlation is always between −1 and +1.' },
              ],
              steps: [R`\[\rho = \frac{Cov(R_1,R_2)}{\sigma_1\,\sigma_2} = \frac{${nt(cov, 5)}}{${nt(si, 3)} \times ${nt(sj, 3)}} = \frac{${nt(cov, 5)}}{${nt(si * sj, 6)}} = ${nt(r, 4)}\]`],
              why: R`Correlation is the covariance scaled by both standard deviations, so it always lies between \(-1\) and \(+1\).`,
            };
          }
          const c = rho * si * sj;
          return {
            q: R`The returns of ${a} and ${b} have a correlation of ${T.numT(rho, 2)}. Their standard deviations are ${tp(si, 1)} and ${tp(sj, 1)}. What is the **covariance** between them? (5 decimal places)`,
            givens: [['\\rho', nt(rho, 2)], ['\\sigma_1', nt(si, 3)], ['\\sigma_2', nt(sj, 3)]],
            answer: c, unit: '', dp: 5,
            mistakes: [
              { v: rho / (si * sj), why: R`\(Cov = \rho\sigma_1\sigma_2\). You divided instead of multiplying.` },
              { v: rho * si, why: 'Multiply by both standard deviations.' },
              { v: rho * (si + sj), why: 'Multiply the two SDs together; do not add them.' },
            ],
            steps: [R`\[Cov(R_1,R_2) = \rho\,\sigma_1\,\sigma_2 = ${nt(rho, 2)} \times ${nt(si, 3)} \times ${nt(sj, 3)} = ${nt(c, 6)}\]`],
            why: 'Rearrange the correlation formula: covariance = correlation × both standard deviations.',
          };
        } },
      /* ---------- sample covariance ---------- */
      { id: 'w9-g-cov-hist', topic: 'corr', level: 2, section: 'B', formula: 'cov-sample', src: 'Lecture W9 Example 6(a)',
        make(rng) {
          const [a, b] = two(rng);
          const n = rng.int(3, 4);
          let xs, ys, c;
          for (let t = 0; t < 80; t++) {
            const k = rng.pick([-0.5, 0.5, 0.8, 1.1]);
            xs = Array.from({ length: n }, () => rng.step(-0.15, 0.2, 0.01));
            ys = xs.map((x) => +(k * x + rng.step(-0.05, 0.05, 0.01)).toFixed(2));
            c = FIN.covS(xs, ys);
            if (FIN.sdS(xs) >= 0.02 && FIN.sdS(ys) >= 0.02 && Math.abs(c) >= 0.0005) break;
          }
          if (!(Math.abs(c) >= 0.0005)) return null;
          const mx = FIN.mean(xs), my = FIN.mean(ys);
          return {
            q: R`Monthly returns for ${a} and ${b} are below. Treat them as a sample. What is the **covariance** between the two returns? (6 decimal places)`,
            table: { head: ['Month', a, b], rows: xs.map((x, i) => [i + 1, tp(x), tp(ys[i])]) },
            answer: c, unit: '', dp: 6,
            mistakes: [
              { v: (c * (n - 1)) / n, why: R`That divides by \(N = ${n}\). For a sample divide by \(N - 1 = ${n - 1}\).` },
              { v: xs.reduce((s, x, i) => s + x * ys[i], 0) / (n - 1), why: 'Subtract each mean before you multiply the pairs.' },
              { v: FIN.corrS(xs, ys), why: 'That is the correlation. The question asks for the covariance.' },
            ],
            steps: [
              R`Means: \(\bar{R}_1 = ${nt(mx, 6)}\) and \(\bar{R}_2 = ${nt(my, 6)}\).`,
              R`\[Cov = \frac{${xs.map((x, i) => `(${nt(x)} - ${br(mx, 6)})(${nt(ys[i])} - ${br(my, 6)})`).join(' + ')}}{${n} - 1}\]`,
              R`\[Cov = \frac{${nt(c * (n - 1), 6)}}{${n - 1}} = ${nt(c, 6)}\]`,
            ],
            calc: `[C ALL] · ${xs.map((x, i) => `${hp(x)} [INPUT] ${hp(ys[i])} [Σ+]`).join(' · ')} · [x̂,r] [SWAP] → r · [Sx,Sy] → Sx, [SWAP] → Sy · Cov = r × Sx × Sy`,
            why: R`Multiply the paired deviations from the means, add them up, and divide by \(N - 1\).`,
          };
        } },
      /* ---------- portfolio weights ---------- */
      { id: 'w9-g-weights', topic: 'port', level: 1, section: 'B', formula: 'port-ret', src: 'Tutorial W9 Q4',
        make(rng) {
          const [a, b] = two(rng);
          let nA, pA, nB, pB;
          for (let t = 0; t < 50; t++) {
            nA = rng.step(50, 500, 5); pA = rng.step(5, 80, 0.5); nB = rng.step(50, 500, 5); pB = rng.step(5, 80, 0.5);
            const wA = (nA * pA) / (nA * pA + nB * pB);
            if (nA !== nB && pA !== pB && wA >= 0.1 && wA <= 0.9 && Math.abs(wA - 0.5) >= 0.02) break;
          }
          const vA = nA * pA, vB = nB * pB, w = vA / (vA + vB);
          const askA = rng.chance(0.5);
          const ans = askA ? w : 1 - w;
          const [nX, pX, nY, pY] = askA ? [nA, pA, nB, pB] : [nB, pB, nA, pA];
          return {
            q: R`A portfolio holds ${nA} shares of ${a} at ${T.money(pA)} each and ${nB} shares of ${b} at ${T.money(pB)} each. What is the portfolio **weight** of ${askA ? a : b}?`,
            givens: [['V_A', R`${nA} \times ${L.money(pA)} = ${L.money(vA)}`], ['V_B', R`${nB} \times ${L.money(pB)} = ${L.money(vB)}`]],
            answer: P(ans), unit: '%', dp: 2,
            mistakes: [
              { v: P(nX / (nX + nY)), why: 'Weights use the dollar value held (shares × price), not the number of shares.' },
              { v: P(pX / (pX + pY)), why: 'That uses the prices only. Multiply each price by the number of shares.' },
              { v: P(1 - ans), why: 'That is the weight of the other share.' },
            ],
            steps: [R`\[V = ${L.money(vA)} + ${L.money(vB)} = ${L.money(vA + vB)}\]`, R`\[w = \frac{${L.money(askA ? vA : vB)}}{${L.money(vA + vB)}} = ${pc(ans)}\]`],
            why: 'A weight is the value held in one asset divided by the value of the whole portfolio.',
          };
        } },
      /* ---------- portfolio expected return ---------- */
      { id: 'w9-g-port-ret', topic: 'port', level: 1, section: 'B', formula: 'port-ret', src: 'Lecture W9 Example 7',
        make(rng) {
          const k = rng.chance(0.6) ? 2 : 3;
          const names = cos(rng, k);
          const amts = names.map(() => rng.step(2000, 30000, 1000));
          const es = names.map(() => rng.step(0.03, 0.18, 0.005));
          if (Math.abs(amts[1] - amts[0]) < 0.2 * (amts[0] + amts[1])) amts[1] = amts[0] > 15000 ? amts[0] - 8000 : amts[0] + 9000;
          if (Math.abs(es[1] - es[0]) < 0.02) es[1] = +(es[0] + (es[0] < 0.12 ? 0.035 : -0.035)).toFixed(4);
          const tot = sum(amts), ws = amts.map((x) => x / tot);
          const e = FIN.portRet(ws, es);
          const mistakes = [{ v: P(sum(es) / k), why: 'That is a simple average. Weight each return by the fraction of money invested.' }];
          if (k === 2) mistakes.push({ v: P(FIN.portRet([ws[1], ws[0]], es)), why: 'The weights are the wrong way round.' });
          else mistakes.push({ v: P(FIN.portRet(ws.slice(0, 2), es.slice(0, 2))), why: 'Include every asset in the portfolio.' });
          mistakes.push({ v: P(FIN.portRet(ws, es) / k), why: 'The weights already add to 1, so the weighted sum is the answer. Do not divide by the number of assets.' });
          return {
            q: R`You invest ${andList(names.map((nm, i) => `${T.money(amts[i], 0)} in ${nm} (expected return ${tp(es[i], 1)})`))}. What is the portfolio’s **expected return**?`,
            givens: names.map((nm, i) => [`w_${i + 1}`, R`\frac{${L.money(amts[i], 0)}}{${L.money(tot, 0)}} = ${nt(ws[i], 4)}`]),
            answer: P(e), unit: '%', dp: 2, mistakes,
            steps: [R`\[E(R_p) = \sum_i w_iE(R_i) = ${ws.map((w, i) => `${nt(w, 4)}(${pcT(es[i])})`).join(' + ')} = ${pc(e)}\]`],
            why: 'Portfolio return is a weighted average, with weights from the dollar amounts.',
          };
        } },
      /* ---------- two-asset portfolio SD ---------- */
      { id: 'w9-g-port-sd', topic: 'port', level: 2, section: 'B', formula: 'port-var', src: 'Lecture W9 Example 8',
        make(rng) {
          const [a, b] = two(rng);
          const tot = rng.step(10000, 100000, 1000);
          const w = rng.pick(WEIGHTS);
          const sA = rng.step(0.05, 0.35, 0.001);
          let sB = rng.step(0.05, 0.35, 0.001); if (Math.abs(sA - sB) < 0.02) sB = sA + 0.05;
          let rho = rng.step(-0.9, 0.95, 0.05); if (Math.abs(rho) < 0.15) rho = 0.4;
          const eA = rng.step(0.04, 0.15, 0.0025), eB = rng.step(0.04, 0.15, 0.0025);
          const v = FIN.portVar2(w, sA, 1 - w, sB, rho), s = Math.sqrt(v);
          return {
            q: R`You invest ${T.money(tot * w, 0)} in ${a} and ${T.money(tot * (1 - w), 0)} in ${b}. The correlation between their returns is ${T.numT(rho, 2)}. What is the **standard deviation** of your portfolio?`,
            table: { head: ['', a, b], rows: [['Expected return', tp(eA), tp(eB)], ['Standard deviation', tp(sA, 1), tp(sB, 1)]] },
            givens: [['w_A', nt(w, 2)], ['w_B', nt(1 - w, 2)], ['\\sigma_A', pcT(sA)], ['\\sigma_B', pcT(sB)], ['\\rho', nt(rho, 2)]],
            answer: P(s), unit: '%', dp: 2,
            mistakes: [
              { v: P(w * sA + (1 - w) * sB), why: R`Portfolio SD is not a weighted average of the SDs (unless \(\rho = +1\)).` },
              { v: P(Math.sqrt(w * w * sA * sA + (1 - w) * (1 - w) * sB * sB)), why: R`You dropped the \(2w_Aw_B\rho\sigma_A\sigma_B\) term.` },
              { v: P(Math.sqrt(w * sA * sA + (1 - w) * sB * sB + 2 * w * (1 - w) * rho * sA * sB)), why: 'Square the weights on the variance terms.' },
              { v: P(v), why: 'That is the variance. Take the square root.' },
            ],
            steps: [
              R`Weights: \(w_A = \frac{${L.money(tot * w, 0)}}{${L.money(tot, 0)}} = ${nt(w, 2)}\) and \(w_B = ${nt(1 - w, 2)}\). The expected returns are not needed.`,
              R`\[\sigma_p^2 = (${nt(w, 2)})^2(${nt(sA, 3)})^2 + (${nt(1 - w, 2)})^2(${nt(sB, 3)})^2 + 2(${nt(w, 2)})(${nt(1 - w, 2)})(${nt(rho, 2)})(${nt(sA, 3)})(${nt(sB, 3)})\]`,
              R`\[\sigma_p^2 = ${nt(w * w * sA * sA, 6)} + ${nt((1 - w) * (1 - w) * sB * sB, 6)} ${rho < 0 ? '-' : '+'} ${nt(Math.abs(2 * w * (1 - w) * rho * sA * sB), 6)} = ${nt(v, 6)}\]`,
              R`\[\sigma_p = \sqrt{${nt(v, 6)}} = ${pc(s)}\]`,
            ],
            why: rho < 0 ? 'A negative correlation makes the covariance term subtract, so the portfolio is much less risky.' : 'Unless the correlation is +1, the portfolio SD is below the weighted average of the SDs.',
          };
        } },
      /* ---------- portfolio with the risk-free asset ---------- */
      { id: 'w9-g-rf-port', topic: 'port', level: 2, section: 'B', formula: 'port-var', src: 'Tutorial W9 Q5(b)',
        make(rng) {
          const co = rng.company();
          const e = rng.step(0.08, 0.18, 0.005), s = rng.step(0.12, 0.45, 0.01), rf = rng.step(0.02, 0.06, 0.005);
          const w = rng.pick(WEIGHTS);
          const base = R`You put ${tp(w, 0)} of your money in ${co} shares (expected return ${tp(e, 1)}, SD ${tp(s, 0)}) and the rest in the risk-free asset (return ${tp(rf, 1)}).`;
          const givens = [['w', nt(w, 2)], ['E(R)', pcT(e)], ['\\sigma', pcT(s)], ['r_f', pcT(rf)]];
          if (rng.chance(0.6)) {
            const sp = w * s;
            return {
              q: R`${base} What is the **standard deviation** of your portfolio?`,
              givens, answer: P(sp), unit: '%', dp: 2,
              mistakes: [
                { v: P(w * s + (1 - w) * rf), why: R`The risk-free asset has zero SD. Its \(r_f\) is a return, not a risk.` },
                { v: P(s), why: R`Moving money into the risk-free asset scales risk down: \(\sigma_p = w\sigma\).` },
                { v: P(w * w * s * s), why: R`That is the variance \(w^2\sigma^2\). Take the square root.` },
              ],
              steps: [R`The risk-free asset has \(\sigma_F = 0\) and zero covariance, so only one term is left:`, R`\[\sigma_p = \sqrt{w^2\sigma^2} = w\sigma = ${nt(w, 2)} \times ${pcT(s)} = ${pc(sp)}\]`],
              why: 'Risk falls in proportion to the money moved into the risk-free asset.',
            };
          }
          const ep = w * e + (1 - w) * rf;
          return {
            q: R`${base} What is the **expected return** of your portfolio?`,
            givens, answer: P(ep), unit: '%', dp: 2,
            mistakes: [
              { v: P(w * e), why: R`The money in the risk-free asset still earns \(r_f\). Add \((1 - w)r_f\).` },
              { v: P((e + rf) / 2), why: 'Weight each return by the fraction invested, not 50/50.' },
              { v: P((1 - w) * e + w * rf), why: 'The weights are the wrong way round.' },
            ],
            steps: [R`\[E(R_p) = w\,E(R) + (1 - w)\,r_f = ${nt(w, 2)}(${pcT(e)}) + ${nt(1 - w, 2)}(${pcT(rf)}) = ${pc(ep)}\]`],
            why: 'Portfolio return is still a weighted average, including the risk-free part.',
          };
        } },
      /* ---------- beta from covariance ---------- */
      { id: 'w9-g-beta', topic: 'beta', level: 1, section: 'B', formula: 'beta', src: 'Lecture W9 Example 3(a)',
        make(rng) {
          const co = rng.company();
          const sM = rng.step(0.1, 0.22, 0.01), b0 = rng.step(0.3, 2, 0.05);
          let rho = rng.step(0.3, 0.9, 0.05);
          if (Math.abs(b0 / rho - 1) < 0.2) rho = b0 < 0.6 ? +(b0 + 0.35).toFixed(2) : Math.min(0.9, +(b0 / 1.5).toFixed(2));
          const cov = +(b0 * sM * sM).toFixed(5);
          const si = +((b0 * sM) / rho).toFixed(3);
          const b = FIN.beta(cov, sM * sM);
          return {
            q: R`The covariance between the returns on ${co} shares and the market is ${T.numT(cov, 5)}. The market’s standard deviation is ${tp(sM, 0)}. The standard deviation of ${co} shares is ${tp(si, 1)}. What is the **beta** of ${co} shares?`,
            givens: [['Cov(R_i,R_M)', nt(cov, 5)], ['\\sigma_M', nt(sM, 2)], ['\\sigma_i', nt(si, 3)]],
            answer: b, unit: '', dp: 2,
            mistakes: [
              { v: cov / sM, why: R`Divide by the market’s **variance** \(\sigma_M^2\), not its standard deviation.` },
              { v: cov / (si * si), why: 'Use the market’s variance, not the share’s own variance.' },
              { v: cov / (si * sM), why: 'That is the correlation with the market, not beta.' },
            ],
            steps: [R`\[\beta_i = \frac{Cov(R_i,R_M)}{\sigma_M^2} = \frac{${nt(cov, 5)}}{(${nt(sM, 2)})^2} = \frac{${nt(cov, 5)}}{${nt(sM * sM, 4)}} = ${nt(b, 4)}\]`],
            why: `The share’s own SD is extra information. Beta needs only the covariance with the market and the market’s variance.`,
          };
        } },
      /* ---------- portfolio beta ---------- */
      { id: 'w9-g-port-beta', topic: 'beta', level: 1, section: 'B', formula: 'port-beta', src: 'Lecture W9 SML Example 2(a)',
        make(rng) {
          const names = cos(rng, 3);
          const withRf = rng.chance(0.3);
          let amts, bs, aF, tot, ws, bp;
          for (let t = 0; t < 50; t++) {
            amts = names.map(() => rng.step(5000, 50000, 1000));
            bs = names.map(() => rng.step(0.4, 2, 0.05));
            aF = withRf ? rng.step(5000, 40000, 1000) : 0;
            tot = sum(amts) + aF; ws = amts.map((x) => x / tot);
            bp = FIN.portBeta(ws, bs);
            if (Math.abs(bp - sum(bs) / 3) >= 0.015 && Math.abs(bp / 3 - (bp - ws[2] * bs[2])) >= 0.01) break; // weighting must matter
          }
          const mistakes = [
            { v: sum(bs) / 3, why: 'That is a simple average. Weight each beta by its share of the portfolio.' },
            { v: bp - ws[2] * bs[2], why: 'Include every share in the weighted average.' },
            { v: bp / 3, why: 'The weighted sum is already the average. Do not divide by the number of shares.' },
          ];
          if (withRf) mistakes.push({ v: FIN.portBeta(amts.map((x) => x / sum(amts)), bs), why: R`The Treasury bills are part of the portfolio. They have \(\beta = 0\) but still count in the weights.` });
          return {
            q: R`Your portfolio holds ${andList(names.map((nm, i) => `${T.money(amts[i], 0)} in ${nm} (beta ${T.numT(bs[i], 2)})`).concat(withRf ? [`${T.money(aF, 0)} in Treasury bills (beta 0)`] : []))}. What is the **portfolio beta**?`,
            answer: bp, unit: '', dp: 2, mistakes,
            steps: [
              R`Total value: \(${L.money(tot, 0)}\). Weights: ${ws.map((w, i) => R`\(w_${i + 1} = ${nt(w, 4)}\)`).join(', ')}${withRf ? R`, and \(w_F = ${nt(aF / tot, 4)}\) with \(\beta_F = 0\)` : ''}.`,
              R`\[\beta_p = ${ws.map((w, i) => `${nt(w, 4)}(${nt(bs[i], 2)})`).join(' + ')}${withRf ? ' + 0' : ''} = ${nt(bp, 4)}\]`,
            ],
            why: 'Portfolio beta is the value-weighted average of the betas.',
          };
        } },
      /* ---------- CAPM ---------- */
      { id: 'w9-g-capm', topic: 'capm', level: 1, section: 'B', formula: 'capm', src: 'Tutorial W9 Q6',
        make(rng) {
          const co = rng.company();
          const rf = rng.step(0.02, 0.06, 0.005), mrp = rng.step(0.04, 0.09, 0.005), b = rng.step(0.4, 2.2, 0.05);
          const rm = rf + mrp, e = FIN.capm(rf, b, rm);
          const giveMRP = rng.chance(0.4);
          const mistakes = giveMRP
            ? [
              { v: P(rf + b * (mrp - rf)), why: R`The market risk premium already has \(r_f\) taken out. Do not subtract it again.` },
              { v: P(b * mrp), why: R`That is only the risk premium. Add \(r_f\).` },
              { v: P(2 * rf + b * mrp), why: 'You added the risk-free rate twice.' },
            ]
            : [
              { v: P(rf + b * rm), why: R`Multiply beta by the market risk premium \(E[R_M] - r_f\), not by \(E[R_M]\).` },
              { v: P(b * mrp), why: R`That is only the risk premium. Add \(r_f\).` },
              { v: P(b * rm), why: R`That is \(\beta \times E[R_M]\). CAPM is \(r_f + \beta(E[R_M] - r_f)\).` },
            ];
          return {
            q: giveMRP
              ? R`${co} has a beta of ${T.numT(b, 2)}. The risk-free rate is ${tp(rf, 1)} and the **market risk premium** is ${tp(mrp, 1)}. Using CAPM, what is the expected return on ${co} shares?`
              : R`${co} has a beta of ${T.numT(b, 2)}. The risk-free rate is ${tp(rf, 1)} and the **expected market return** is ${tp(rm, 1)}. Using CAPM, what is the expected return on ${co} shares?`,
            givens: giveMRP ? [['\\beta', nt(b, 2)], ['r_f', pcT(rf)], ['E[R_M] - r_f', pcT(mrp)]] : [['\\beta', nt(b, 2)], ['r_f', pcT(rf)], ['E[R_M]', pcT(rm)]],
            answer: P(e), unit: '%', dp: 2, mistakes,
            steps: [R`\[E[R_i] = r_f + \beta_i(E[R_M] - r_f) = ${pcT(rf)} + ${nt(b, 2)}(${giveMRP ? pcT(mrp) : `${pcT(rm)} - ${pcT(rf)}`}) = ${pcT(rf)} + ${pcT(b * mrp)} = ${pc(e)}\]`],
            why: 'Risk-free rate plus beta times the market risk premium.',
          };
        } },
      /* ---------- CAPM for a two-share portfolio ---------- */
      { id: 'w9-g-capm-port', topic: 'capm', level: 2, section: 'B', formula: 'port-beta', src: 'Tutorial W9 Q7',
        make(rng) {
          const [a, b] = two(rng);
          const rf = rng.step(0.02, 0.06, 0.005), rm = rf + rng.step(0.04, 0.08, 0.005);
          const b1 = rng.step(0.6, 2, 0.05);
          let b2 = rng.step(0.4, 1.6, 0.05); if (Math.abs(b1 - b2) < 0.1) b2 = b1 > 1 ? b1 - 0.5 : b1 + 0.5;
          const w = rng.pick(WEIGHTS);
          const e1 = FIN.capm(rf, b1, rm), e2 = FIN.capm(rf, b2, rm);
          const bp = FIN.portBeta([w, 1 - w], [b1, b2]), ep = FIN.capm(rf, bp, rm);
          return {
            q: R`${a} has a beta of ${T.numT(b1, 2)} and ${b} has a beta of ${T.numT(b2, 2)}. The risk-free rate is ${tp(rf, 1)} and the expected market return is ${tp(rm, 1)}. Using CAPM, what is the expected return of a portfolio with ${tp(w, 0)} in ${a} and ${tp(1 - w, 0)} in ${b}?`,
            givens: [['\\beta_1', nt(b1, 2)], ['\\beta_2', nt(b2, 2)], ['w_1', nt(w, 2)], ['r_f', pcT(rf)], ['E[R_M]', pcT(rm)]],
            answer: P(ep), unit: '%', dp: 2,
            mistakes: [
              { v: P((e1 + e2) / 2), why: 'That is a simple average. Use the portfolio weights.' },
              { v: P(rf + bp * rm), why: R`Multiply beta by the market risk premium, not by \(E[R_M]\).` },
              { v: P(FIN.portRet([1 - w, w], [e1, e2])), why: 'The weights are the wrong way round.' },
            ],
            steps: [
              R`Way 1: \(\beta_p = ${nt(w, 2)}(${nt(b1, 2)}) + ${nt(1 - w, 2)}(${nt(b2, 2)}) = ${nt(bp, 4)}\), so \(E[R_p] = ${pcT(rf)} + ${nt(bp, 4)}(${pcT(rm - rf)}) = ${pc(ep)}\).`,
              R`Way 2: \(E[R_1] = ${pc(e1)}\) and \(E[R_2] = ${pc(e2)}\), so \(E[R_p] = ${nt(w, 2)}(${pc(e1)}) + ${nt(1 - w, 2)}(${pc(e2)}) = ${pc(ep)}\).`,
            ],
            why: 'Both ways give the same answer, because CAPM is a straight line in beta.',
          };
        } },
      /* ---------- SML: under or overvalued ---------- */
      { id: 'w9-g-sml', topic: 'capm', level: 2, section: 'B', formula: 'capm', src: 'Lecture W9 SML Example 2(b)',
        make(rng) {
          const co = rng.company();
          const rf = rng.step(0.02, 0.06, 0.005), rm = rf + rng.step(0.04, 0.08, 0.005), b = rng.step(0.5, 2, 0.05);
          const req = FIN.capm(rf, b, rm);
          const d = rng.chance(0.15) ? 0 : rng.pick([-0.03, -0.025, -0.02, -0.015, -0.01, 0.01, 0.015, 0.02, 0.025, 0.03]);
          const er = +(req + d).toFixed(6);
          const ans = d > 0 ? 0 : d < 0 ? 1 : 2;
          return {
            kind: 'mcq',
            q: R`${co} has a beta of ${T.numT(b, 2)}. Analysts expect it to return ${tp(er, 3)}. The risk-free rate is ${tp(rf, 1)} and the expected market return is ${tp(rm, 1)}. According to CAPM, the share is…`,
            givens: [['\\beta', nt(b, 2)], ['r_f', pcT(rf)], ['E[R_M]', pcT(rm)], ['\\text{Forecast}', pcT(er)]],
            chart: { type: 'sml', rf, rm, points: [{ name: co.split(' ')[0], beta: b, er }] }, // short label keeps it inside the plot
            choices: ['Undervalued: it plots above the SML, so buy', 'Overvalued: it plots below the SML, so sell', 'Fairly priced: it plots on the SML', 'Impossible to judge without its standard deviation'],
            answer: ans,
            steps: [R`Required return: \[E[R] = ${pcT(rf)} + ${nt(b, 2)}(${pcT(rm)} - ${pcT(rf)}) = ${pcT(req)}\]`,
              ans === 2 ? R`The forecast equals the required return, so the share sits on the SML.` : R`The forecast \(${pcT(er)}\) is ${ans === 0 ? 'above' : 'below'} the required \(${pcT(req)}\).`],
            why: ans === 0 ? 'It offers more than CAPM requires for its beta: above the line, undervalued.' : ans === 1 ? 'It offers less than CAPM requires for its beta: below the line, overvalued.' : 'Its expected return is exactly what its beta requires: fairly priced.',
          };
        } },
      /* ---------- SML shifts ---------- */
      { id: 'w9-g-sml-shift', topic: 'capm', level: 2, section: 'B', formula: 'capm', src: 'Lecture W9 SML and inflation / risk',
        make(rng) {
          const co = rng.company();
          const rf = rng.step(0.02, 0.05, 0.005), mrp = rng.step(0.04, 0.08, 0.005);
          let b = rng.step(0.5, 2, 0.05); if (Math.abs(b - 1) < 0.1) b = 1.4;
          const k = rng.pick([0.01, 0.015, 0.02, 0.025, 0.03]);
          const old = FIN.capm(rf, b, rf + mrp);
          if (rng.chance(0.5)) {
            const nu = FIN.capm(rf + k, b, rf + k + mrp);
            return {
              q: R`${co} has a beta of ${T.numT(b, 2)}. The risk-free rate is ${tp(rf, 1)} and the market risk premium is ${tp(mrp, 1)}. Investors now raise their **inflation expectations** by ${tp(k, 1)}. What is the new required return on ${co} shares?`,
              givens: [['\\beta', nt(b, 2)], ['r_f', pcT(rf)], ['E[R_M] - r_f', pcT(mrp)], ['\\Delta\\text{inflation}', pcT(k)]],
              answer: P(nu), unit: '%', dp: 2,
              mistakes: [
                { v: P(FIN.capm(rf + k, b, rf + mrp)), why: R`Higher inflation lifts \(E[R_M]\) too, so the market risk premium stays the same.` },
                { v: P(old + b * k), why: 'An inflation change moves every required return up by the same amount, whatever the beta.' },
                { v: P(old), why: R`Higher expected inflation raises \(r_f\), so required returns rise.` },
              ],
              steps: [R`Before: \(${pcT(rf)} + ${nt(b, 2)}(${pcT(mrp)}) = ${pc(old)}\).`, R`Inflation raises \(r_f\) to \(${pcT(rf + k)}\). The premium is unchanged:`, R`\[E[R] = ${pcT(rf + k)} + ${nt(b, 2)}(${pcT(mrp)}) = ${pc(nu)}\]`],
              why: 'Higher expected inflation shifts the whole SML up in parallel.',
            };
          }
          const nu = FIN.capm(rf, b, rf + mrp + k);
          return {
            q: R`${co} has a beta of ${T.numT(b, 2)}. The risk-free rate is ${tp(rf, 1)} and the market risk premium is ${tp(mrp, 1)}. Inflation is unchanged, but **risk aversion rises** and the market risk premium increases by ${tp(k, 1)}. What is the new required return on ${co} shares?`,
            givens: [['\\beta', nt(b, 2)], ['r_f', pcT(rf)], ['E[R_M] - r_f', R`${pcT(mrp)} + ${pcT(k)}`]],
            answer: P(nu), unit: '%', dp: 2,
            mistakes: [
              { v: P(old + k), why: R`That is a parallel shift. The extra premium is scaled by beta: \(\beta \times ${pcT(k)}\).` },
              { v: P(old), why: 'A higher market risk premium raises the required return.' },
              { v: P(rf + b * k), why: R`Use the whole new premium: \(r_f + \beta(${pcT(mrp)} + ${pcT(k)})\).` },
            ],
            steps: [R`Before: \(${pcT(rf)} + ${nt(b, 2)}(${pcT(mrp)}) = ${pc(old)}\).`, R`\[E[R] = ${pcT(rf)} + ${nt(b, 2)}(${pcT(mrp + k)}) = ${pc(nu)}\]`],
            why: 'Higher risk aversion makes the SML steeper: high-beta shares need the biggest increase.',
          };
        } },

      /* ---------- boss: correlation from a probability table ---------- */
      { id: 'w9-g-prob-corr', topic: 'corr', level: 3, section: 'B', formula: 'corr', src: 'Tutorial W9 Q1', boss: true,
        make(rng) {
          const [a, b] = two(rng);
          for (let t = 0; t < 60; t++) {
            const ps = rng.pick(PROBS);
            const x = [rng.step(-0.12, 0.02, 0.002), rng.step(0.04, 0.12, 0.002), rng.step(0.13, 0.3, 0.002)];
            const y0 = [rng.step(0, 0.06, 0.002), rng.step(0.05, 0.09, 0.002), rng.step(0.08, 0.14, 0.002)];
            const y = rng.chance(0.75) ? y0 : [y0[2], y0[1], y0[0]];
            const ex = FIN.expRet(ps, x), ey = FIN.expRet(ps, y);
            const sx = FIN.sdProb(ps, x), sy = FIN.sdProb(ps, y);
            if (sy < 0.005) continue;
            const cov = FIN.covProb(ps, x, y), rho = cov / (sx * sy);
            if (Math.abs(rho) < 0.2) continue;
            const rhoU = FIN.corrS(x, y);
            if (Math.abs(rhoU - rho) < 0.003) continue;
            return {
              q: R`Forecast returns for ${a} (X) and ${b} (Y) are below. What is the **correlation** between their returns? (4 decimal places)`,
              table: { head: ['State', 'Probability', 'X', 'Y'], rows: STATES.map((s, k) => [s, nt(ps[k], 2), tp(x[k], 1), tp(y[k], 1)]) },
              answer: rho, unit: '', dp: 4, tol: 0.0006,
              mistakes: [
                { v: rhoU, why: 'That ignores the probabilities (it treats the states as equally likely past data).' },
                { v: cov / (sx + sy), why: 'Multiply the two SDs in the denominator; do not add them.' },
                { v: cov / sx, why: 'Divide by both standard deviations.' },
              ],
              steps: [
                R`\[E(R_X) = ${probSum(ps, x)} = ${nt(ex, 6)} \qquad E(R_Y) = ${probSum(ps, y)} = ${nt(ey, 6)}\]`,
                R`\[\sigma_X^2 = ${probSq(ps, x, ex)} = ${nt(sx * sx, 8)}, \quad \sigma_X = ${nt(sx, 6)}\]`,
                R`\[\sigma_Y^2 = ${probSq(ps, y, ey)} = ${nt(sy * sy, 8)}, \quad \sigma_Y = ${nt(sy, 6)}\]`,
                R`\[Cov = ${probXY(ps, x, ex, y, ey)} = ${nt(cov, 8)}\]`,
                R`\[\rho = \frac{Cov}{\sigma_X\sigma_Y} = \frac{${nt(cov, 8)}}{${nt(sx, 6)} \times ${nt(sy, 6)}} = ${nt(rho, 4)}\]`,
              ],
              why: rho > 0 ? 'Positive: the two shares tend to do well in the same states of the economy.' : 'Negative: one share does well when the other does badly, which is great for diversification.',
            };
          }
          return null;
        } },
      /* ---------- boss: correlation from past data ---------- */
      { id: 'w9-g-hist-corr', topic: 'corr', level: 3, section: 'B', formula: 'corr', src: 'Tutorial W9 Q2', boss: true,
        make(rng) {
          const [a, b] = two(rng);
          const n = rng.int(4, 6);
          for (let t = 0; t < 60; t++) {
            const k = rng.pick([-0.7, 0.5, 0.8, 1.1]);
            const xs = Array.from({ length: n }, () => rng.step(-0.15, 0.18, 0.01));
            const ys = xs.map((x) => +(k * x + rng.step(-0.06, 0.06, 0.01)).toFixed(2));
            if (FIN.sdS(xs) < 0.03 || FIN.sdS(ys) < 0.03) continue;
            const r = FIN.corrS(xs, ys);
            if (!Number.isFinite(r) || Math.abs(r) < 0.25) continue;
            const c = FIN.covS(xs, ys), sx = FIN.sdS(xs), sy = FIN.sdS(ys);
            return {
              q: R`Monthly returns for ${a} and ${b} are below. Treat them as a sample. What is the **correlation coefficient** between the two returns? (4 decimal places)`,
              table: { head: ['Month', a, b], rows: xs.map((x, i) => [i + 1, tp(x), tp(ys[i])]) },
              answer: r, unit: '', dp: 4, tol: 0.0006,
              mistakes: [
                { v: ((c * (n - 1)) / n) / (sx * sy), why: R`You mixed divisors: covariance \(\div N\) but SDs \(\div (N - 1)\). Use \(N - 1\) in all three.` },
                { v: c / (Math.sqrt(FIN.varP(xs)) * Math.sqrt(FIN.varP(ys))), why: R`You mixed divisors: SDs \(\div N\) but covariance \(\div (N - 1)\). Use \(N - 1\) in all three.` },
                { v: c, why: R`That is the covariance. Divide it by \(\sigma_1\sigma_2\).` },
              ],
              steps: [
                R`Means: \(\bar{R}_1 = ${nt(FIN.mean(xs), 6)}\), \(\bar{R}_2 = ${nt(FIN.mean(ys), 6)}\). Sample SDs: \(\sigma_1 = ${nt(sx, 6)}\), \(\sigma_2 = ${nt(sy, 6)}\).`,
                R`\[Cov = \frac{\sum (R_{1,t} - \bar{R}_1)(R_{2,t} - \bar{R}_2)}{${n} - 1} = \frac{${nt(c * (n - 1), 6)}}{${n - 1}} = ${nt(c, 6)}\]`,
                R`\[\rho = \frac{${nt(c, 6)}}{${nt(sx, 6)} \times ${nt(sy, 6)}} = ${nt(r, 4)}\]`,
              ],
              calc: `[C ALL] · ${xs.map((x, i) => `${hp(x)} [INPUT] ${hp(ys[i])} [Σ+]`).join(' · ')} · [x̂,r] [SWAP] → ${T.numT(r, 4)}`,
              why: R`Use \(N - 1\) for the covariance and for both SDs. The divisors then cancel, and \(\rho\) always lands between \(-1\) and \(+1\).`,
            };
          }
          return null;
        } },
      /* ---------- boss: variance-covariance matrix portfolio ---------- */
      { id: 'w9-g-matrix', topic: 'port', level: 3, section: 'B', formula: 'port-var', src: 'Lecture W9 Example 3 (portfolio theory)', boss: true,
        make(rng) {
          const [nX, nY] = two(rng);
          for (let t = 0; t < 300; t++) {
            const vM = rng.pick([0.01, 0.012, 0.015, 0.016, 0.02, 0.025]); // market variance: keeps each beta exact to 1 dp
            const bX = rng.step(0.3, 1.6, 0.1), bY = rng.step(0.2, 1.4, 0.1);
            if (Math.abs(bX - bY) < 0.15) continue;
            const cXM = +(bX * vM).toFixed(4), cYM = +(bY * vM).toFixed(4);
            const sX = rng.step(0.1, 0.35, 0.01), sY = rng.step(0.1, 0.35, 0.01);
            const vX = +(sX * sX).toFixed(4), vY = +(sY * sY).toFixed(4);
            const cXY = +(rng.step(-0.3, 0.6, 0.05) * Math.sqrt(vX * vY)).toFixed(4);
            if (Math.abs(cXY) < 0.0005) continue;
            const kXM = cXM / Math.sqrt(vX * vM), kYM = cYM / Math.sqrt(vY * vM), kXY = cXY / Math.sqrt(vX * vY);
            if (Math.abs(kXM) > 0.95 || Math.abs(kYM) > 0.95) continue;
            if (1 - kXY * kXY - kXM * kXM - kYM * kYM + 2 * kXY * kXM * kYM < 0.02) continue; // a valid matrix
            const betaX = cXM / vM, betaY = cYM / vM;
            const rf = rng.step(0.02, 0.06, 0.005), rm = +(rf + rng.step(0.04, 0.08, 0.005)).toFixed(4);
            const eX = FIN.capm(rf, betaX, rm), eY = FIN.capm(rf, betaY, rm);
            const tot = rng.step(200000, 1000000, 100000);
            const withRf = rng.chance(0.5);
            const wX = rng.step(0.2, 0.6, 0.1);
            const wY = withRf ? rng.step(0.2, +(0.8 - wX).toFixed(1), 0.1) : +(1 - wX).toFixed(1);
            const wF = +(1 - wX - wY).toFixed(10);
            if (withRf && wF < 0.1) continue;
            if (!withRf && Math.abs(wX - wY) < 0.01) continue;
            const vP = wX * wX * vX + wY * wY * vY + 2 * wX * wY * cXY, sP = Math.sqrt(vP);
            const eP = wX * eX + wY * eY + wF * rf, sh = (eP - rf) / sP;
            const ask = rng.pick(['sd', 'er', 'sharpe']);
            const table = { head: ['', 'X', 'Y', 'Market'], rows: [['X', t4(vX), '', ''], ['Y', t4(cXY), t4(vY), ''], ['Market', t4(cXM), t4(cYM), t4(vM)]] };
            const invest = R`You invest ${T.money(tot * wX, 0)} in X and ${T.money(tot * wY, 0)} in Y${withRf ? `, and ${T.money(tot * wF, 0)} in the risk-free asset` : ''}.`;
            const intro = R`The variance–covariance matrix for share X (${nX}), share Y (${nY}) and the market is below. The risk-free rate is ${tp(rf, 1)} and the expected market return is ${tp(rm, 1)}. ${invest}`;
            const wStep = R`Weights (out of ${T.money(tot, 0)}): \(w_X = ${nt(wX, 2)}\), \(w_Y = ${nt(wY, 2)}\)${withRf ? R`, \(w_F = ${nt(wF, 2)}\)` : ''}.`;
            const betaStep = R`Betas from the bottom row: \(\beta_X = \frac{${nt(cXM, 4)}}{${nt(vM, 4)}} = ${nt(betaX, 4)}\) and \(\beta_Y = \frac{${nt(cYM, 4)}}{${nt(vM, 4)}} = ${nt(betaY, 4)}\).`;
            const capmStep = R`CAPM: \(E(R_X) = ${pcT(rf)} + ${nt(betaX, 4)}(${pcT(rm - rf)}) = ${pc(eX, 3)}\) and \(E(R_Y) = ${pcT(rf)} + ${nt(betaY, 4)}(${pcT(rm - rf)}) = ${pc(eY, 3)}\).`;
            const erStep = R`\[E(R_p) = ${nt(wX, 2)}(${pc(eX, 3)}) + ${nt(wY, 2)}(${pc(eY, 3)})${withRf ? ` + ${nt(wF, 2)}(${pcT(rf)})` : ''} = ${pc(eP, 3)}\]`;
            const varStep = R`\[\sigma_p^2 = (${nt(wX, 2)})^2(${nt(vX, 4)}) + (${nt(wY, 2)})^2(${nt(vY, 4)}) + 2(${nt(wX, 2)})(${nt(wY, 2)})(${br(cXY, 4)}) = ${nt(vP, 6)}\]`;
            const sdStep = R`\[\sigma_p = \sqrt{${nt(vP, 6)}} = ${pc(sP)}${withRf ? R` \quad (\text{the risk-free asset adds no variance or covariance})` : ''}\]`;
            if (ask === 'sd') {
              const wXn = wX / (wX + wY), wYn = wY / (wX + wY);
              const mistakes = [
                { v: P(Math.sqrt(wX * wX * vX + wY * wY * vY)), why: R`You dropped the covariance term \(2w_Xw_YCov(R_X,R_Y)\).` },
                { v: P(wX * Math.sqrt(vX) + wY * Math.sqrt(vY)), why: 'Portfolio SD is not a weighted average of the SDs.' },
              ];
              if (withRf) mistakes.push({ v: P(Math.sqrt(wXn * wXn * vX + wYn * wYn * vY + 2 * wXn * wYn * cXY)), why: `The risk-free asset is part of the portfolio. Use weights out of the full ${T.money(tot, 0)}.` });
              mistakes.push({ v: P(vP), why: 'That is the variance. Take the square root.' });
              return {
                q: R`${intro} What is the **standard deviation** of your portfolio?`,
                table, answer: P(sP), unit: '%', dp: 2, mistakes,
                steps: [R`The diagonal holds variances; the other cells hold covariances.`, wStep, varStep, sdStep],
                why: 'Read the variances from the diagonal and the X–Y covariance from the off-diagonal cell. The market row is not needed for risk.',
              };
            }
            if (ask === 'er') {
              const mistakes = [
                { v: P(wX * (rf + betaX * rm) + wY * (rf + betaY * rm) + wF * rf), why: R`In CAPM, multiply beta by the market risk premium \(E(R_M) - r_f\), not by \(E(R_M)\).` },
                { v: P(wX * betaX + wY * betaY), why: 'That is the portfolio beta, not its expected return.' },
              ];
              if (withRf) mistakes.push({ v: P(wX * eX + wY * eY), why: R`The money in the risk-free asset still earns \(r_f\). Add \(w_F \times r_f\).` });
              else mistakes.push({ v: P((eX + eY) / 2), why: 'Weight each return by the fraction of money invested.' });
              return {
                q: R`${intro} Using CAPM for each share, what is the **expected return** of your portfolio?`,
                table, answer: P(eP), unit: '%', dp: 2, mistakes,
                steps: [betaStep, capmStep, wStep, erStep],
                why: 'Betas from the matrix, CAPM for each share, then a weighted average.',
              };
            }
            return {
              q: R`${intro} Using CAPM for the expected returns, what is the **Sharpe ratio** of your portfolio? (4 decimal places)`,
              table, answer: sh, unit: '', dp: 4, tol: Math.max(0.0006, Math.abs(sh) * 0.001),
              mistakes: [
                { v: eP / sP, why: R`Subtract \(r_f\) first. The Sharpe ratio uses the excess return.` },
                { v: (eP - rf) / vP, why: 'Divide by the standard deviation, not the variance.' },
                { v: sP / eP, why: 'That is the CV, not the Sharpe ratio.' },
              ],
              steps: [betaStep, capmStep, wStep, erStep, varStep, sdStep, R`\[\text{Sharpe} = \frac{E(R_p) - r_f}{\sigma_p} = \frac{${pc(eP, 3)} - ${pcT(rf)}}{${pc(sP, 3)}} = ${nt(sh, 4)}\]`],
              why: 'Return needs the betas (market row). Risk needs the variances and the X–Y covariance.',
            };
          }
          return null;
        } },
      /* ---------- boss: beta from correlation, then CAPM ---------- */
      { id: 'w9-g-beta-rho', topic: 'beta', level: 3, section: 'B', formula: 'capm', boss: true,
        make(rng) {
          const co = rng.company();
          const sM = rng.step(0.1, 0.2, 0.01), rho = rng.step(0.2, 0.9, 0.05);
          let si = rng.step(0.15, 0.5, 0.01); if (Math.abs(si - sM) < 0.02) si = sM + 0.1;
          const rf = rng.step(0.02, 0.05, 0.005), rm = +(rf + rng.step(0.04, 0.08, 0.005)).toFixed(4);
          const cov = rho * si * sM, b = cov / (sM * sM), e = FIN.capm(rf, b, rm);
          return {
            q: R`${co} shares have a standard deviation of ${tp(si, 0)} and a correlation of ${T.numT(rho, 2)} with the market. The market’s SD is ${tp(sM, 0)}. The risk-free rate is ${tp(rf, 1)} and the expected market return is ${tp(rm, 1)}. What is the required return on ${co} shares under CAPM?`,
            givens: [['\\sigma_i', pcT(si)], ['\\rho_{i,M}', nt(rho, 2)], ['\\sigma_M', pcT(sM)], ['r_f', pcT(rf)], ['E[R_M]', pcT(rm)]],
            answer: P(e), unit: '%', dp: 2,
            mistakes: [
              { v: P(FIN.capm(rf, si / sM, rm)), why: R`Beta uses the covariance, which includes \(\rho\): \(\beta = \frac{\rho\,\sigma_i}{\sigma_M}\), not \(\frac{\sigma_i}{\sigma_M}\).` },
              { v: P(FIN.capm(rf, rho, rm)), why: R`Correlation is not beta. Scale it by \(\frac{\sigma_i}{\sigma_M}\).` },
              { v: P(FIN.capm(rf, cov / sM, rm)), why: R`Divide the covariance by \(\sigma_M^2\), not by \(\sigma_M\).` },
              { v: P(rf + b * rm), why: R`Multiply beta by the market risk premium, not by \(E[R_M]\).` },
            ],
            steps: [
              R`\[Cov(R_i,R_M) = \rho\,\sigma_i\,\sigma_M = ${nt(rho, 2)} \times ${nt(si, 2)} \times ${nt(sM, 2)} = ${nt(cov, 6)}\]`,
              R`\[\beta_i = \frac{Cov(R_i,R_M)}{\sigma_M^2} = \frac{${nt(cov, 6)}}{${nt(sM * sM, 4)}} = ${nt(b, 4)}\]`,
              R`\[E[R_i] = ${pcT(rf)} + ${nt(b, 4)}(${pcT(rm)} - ${pcT(rf)}) = ${pc(e)}\]`,
            ],
            why: 'A share can be very volatile but have a low beta, if much of its risk is unsystematic (low correlation with the market).',
          };
        } },
      /* ---------- boss: weights for a target return ---------- */
      { id: 'w9-g-target', topic: 'capm', level: 3, section: 'B', formula: 'port-beta', boss: true,
        make(rng) {
          for (let t = 0; t < 60; t++) {
            const rf = rng.step(0.02, 0.05, 0.005), mrp = rng.step(0.04, 0.08, 0.005);
            const bA = rng.step(1.1, 2, 0.1), bB = rng.step(0.3, 0.9, 0.1);
            const w0 = rng.pick([0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9]);
            const target = Math.round(FIN.capm(rf, w0 * bA + (1 - w0) * bB, rf + mrp) * 10000) / 10000;
            const bt = (target - rf) / mrp, w = (bt - bB) / (bA - bB);
            const eA = FIN.capm(rf, bA, rf + mrp), eB = FIN.capm(rf, bB, rf + mrp);
            const wWrong = (target / mrp - bB) / (bA - bB);
            if (wWrong > 2.5) continue;
            return {
              q: R`CAPM holds. Share A has a beta of ${T.numT(bA, 2)} and share B has a beta of ${T.numT(bB, 2)}. The risk-free rate is ${tp(rf, 1)} and the market risk premium is ${tp(mrp, 1)}. What fraction of your money must go into **share A** for the portfolio to have an expected return of ${tp(target, 2)}?`,
              givens: [['\\beta_A', nt(bA, 2)], ['\\beta_B', nt(bB, 2)], ['r_f', pcT(rf)], ['E[R_M] - r_f', pcT(mrp)], ['E[R_p]', pcT(target)]],
              answer: P(w), unit: '%', dp: 2,
              mistakes: [
                { v: P(1 - w), why: 'That is the weight in share B.' },
                { v: P(wWrong), why: R`Subtract \(r_f\) first: \(\beta_p = \frac{E[R_p] - r_f}{E[R_M] - r_f}\).` },
                { v: P(target / eA), why: R`Share B earns a return too. Solve \(E[R_p] = w\,E[R_A] + (1 - w)E[R_B]\).` },
              ],
              steps: [
                R`Target beta: \[\beta_p = \frac{E[R_p] - r_f}{E[R_M] - r_f} = \frac{${pcT(target)} - ${pcT(rf)}}{${pcT(mrp)}} = ${nt(bt, 4)}\]`,
                R`Portfolio beta is a weighted average: \[w\beta_A + (1 - w)\beta_B = \beta_p \;\Rightarrow\; w = \frac{\beta_p - \beta_B}{\beta_A - \beta_B}\]`,
                R`\[w = \frac{${nt(bt, 4)} - ${nt(bB, 2)}}{${nt(bA, 2)} - ${nt(bB, 2)}} = ${pc(w)}\]`,
                R`Check: \(E[R_A] = ${pc(eA)}\), \(E[R_B] = ${pc(eB)}\), and \(${nt(w, 4)}(${pc(eA)}) + ${nt(1 - w, 4)}(${pc(eB)}) = ${pc(w * eA + (1 - w) * eB)}\).`,
              ],
              why: R`Turn the target return into a target beta, then solve the weighted average for \(w\).`,
            };
          }
          return null;
        } },
    ],
  };
  pack.generators.forEach((g) => { const make = g.make; g.make = (rng) => tidy(make(rng)); });
  root.registerPack(pack);
})(typeof window !== 'undefined' ? window : globalThis);
