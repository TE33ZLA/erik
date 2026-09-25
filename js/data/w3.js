/* Floor 3 — Week 3: Valuing bonds and shares. */
(function (root) {
  'use strict';
  const { FIN, L, T, TI } = root;
  const R = String.raw;
  const P = (r) => +(r * 100).toFixed(8); // decimal rate -> percent units for answers
  const tn = (x) => TI.num(x); // a number as typed on the TI-Nspire (no commas, at most 6 decimals)

  /* ---------- local helpers ---------- */
  const r2 = (x) => FIN.round(x, 2);
  const cl = (x) => +x.toFixed(8); // strip floating-point noise from a sum of rates
  const dedupe = (ms) => ms.filter((m, k) => ms.findIndex((o) => r2(o.v) === r2(m.v)) === k); // drop identical distractors
  const mt = (x) => (Number.isInteger(r2(x)) ? T.moneyT(x) : T.money(x)); // plain-text money (cents only when needed)
  const ml = (x) => (Number.isInteger(r2(x)) ? L.moneyT(x) : L.money(x)); // LaTeX money (cents only when needed)
  const kn = (x) => String(r2(x)); // a number as typed on the calculator
  const pk = (r) => T.numT(r * 100, 6); // a rate in percent, for [I/YR]
  /** dividends: always 2 to 4 decimals ($0.15 -> $0.15, $0.1575 -> $0.1575, $3 -> $3.00) */
  const fix4 = (s) => (s.includes('.') ? (/\.\d$/.test(s) ? s + '0' : s) : s + '.00');
  const dv = (x) => fix4(T.moneyT(x, 4));
  const dvl = (x) => fix4(L.moneyT(x, 4));
  const n4 = (x) => L.num(x, 4);
  /** 'a' or 'an' before a written number: an 8% coupon, an 11% return, an $18,000 loan, a $1,000 bond */
  const aan = (x) => { const h = (String(x).match(/\d+/) || [''])[0]; return /^8/.test(h) || h === '11' || h === '18' ? 'an' : 'a'; };
  const Aan = (x) => (aan(x) === 'an' ? 'An' : 'A');
  const yrsW = (k) => (k === 1 ? '1 year' : `${k} years`);
  /** LaTeX for P = C/i (1 - 1/(1+i)^n) + FV/(1+i)^n with numbers */
  const bondTex = (cp, i, n, face) => R`\frac{${ml(cp)}}{${L.dec(i)}}\left(1 - \frac{1}{(${L.onePlus(i)})^{${n}}}\right) + \frac{${ml(face)}}{(${L.onePlus(i)})^{${n}}}`;
  const bondFormula = R`\[P = \frac{C}{i}\left(1 - \frac{1}{(1+i)^{n}}\right) + \frac{FV}{(1+i)^{n}}\]`;

  /* ---------- values from the course examples (all computed) ---------- */
  const EX3 = { c: FIN.pvAnnuity(50, 0.06, 10), f: 1000 / 1.06 ** 10, p: FIN.bondPrice(1000, 0.05, 0.06, 10) };
  const EX5 = { c: FIN.pvAnnuity(30, 0.05, 20), f: 1000 / 1.05 ** 20, p: FIN.bondPrice(1000, 0.06, 0.10, 10, 2) };
  const T6C = FIN.bondYieldPeriodic(896.64, 1000, 60, 19);
  const M30 = FIN.bondYieldPeriodic(896.64, 1000, 50, 16);
  const M01 = FIN.bondYieldPeriodic(980, 1054.36, 50, 20);
  const M12 = { cfs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 1550] };
  M12.p = FIN.npv(0.075, M12.cfs);
  M12.a = FIN.pvAnnuity(50, 0.075, 5) / 1.075 ** 10;
  M12.b = 1550 / 1.075 ** 16;
  const EX8 = FIN.ddmMulti(0.15, [0.2, 0.2, 0.2], 0.05, 0.10);
  EX8.sum = EX8.pvDivs.reduce((a, b) => a + b, 0);
  const T7 = FIN.ddmMulti(0.115, [0.18, 0.18, 0.15], 0.06, 0.12);
  T7.sum = T7.pvDivs.reduce((a, b) => a + b, 0);
  const T8 = FIN.ddmMulti(0.85, [0.25, 0.20, 0.15, 0.10], 0.05, 0.16);
  T8.sum = T8.pvDivs.reduce((a, b) => a + b, 0);
  const M17 = { pvD: FIN.pvAnnuity(5, 0.12, 6), pn: FIN.tvm.solveFV(6, 0.12, -25.56, 5) };
  M17.rest = 25.56 - M17.pvD;
  const Q18 = { d1: 2 * 1.065, pvA: FIN.pvGrowAnnuity(2 * 1.065, 0.09, 0.065, 6), d7: 2 * 1.065 ** 6 * 1.035 };
  Q18.p6 = Q18.d7 / (0.09 - 0.035);
  Q18.pvP6 = Q18.p6 / 1.09 ** 6;
  Q18.p0 = Q18.pvA + Q18.pvP6;
  const MAT = [0.05, 0.10, 0.15, 0.20].map((y) => [y, FIN.bondPrice(1000, 0.10, y, 1), FIN.bondPrice(1000, 0.10, y, 30)]);
  const CPN = [0.05, 0.10, 0.15, 0.20].map((y) => [y, FIN.bondPrice(1000, 0.05, y, 30), FIN.bondPrice(1000, 0.10, y, 30)]);

  /** Drop distractors that sit too close to the answer: they make unfair options and over-strict typed answers. */
  function tidy(q) {
    if (!q || !Array.isArray(q.mistakes) || !Number.isFinite(q.answer)) return q;
    const a = q.answer, gap = Math.max(0.002 * Math.abs(a), 0.05);
    q.mistakes = dedupe(q.mistakes.filter((m) => Number.isFinite(m.v) && Math.abs(m.v - a) >= gap));
    return q;
  }

  const PACK = {
    id: 'w3', floor: 3, week: 'Week 3',
    title: 'The Bond & Share Bazaar',
    topic: 'Valuing bonds and shares',
    color: '#0f9d8a', icon: '📜',
    intro: 'The Bond & Share Bazaar never closes. Every stall sells a promise of future cash. Price each promise fairly and the lift to Floor 4 opens.',

    briefing: [
      { h: 'What is a bond?', points: [
        R`A **bond** is a tradeable debt security. The issuer borrows; the holder lends. It is a **liability** for the issuer and an **asset** for the holder.`,
        R`**Face (par) value** \(FV\): repaid at **maturity**. **Coupons** \(C\): the fixed interest payments, usually yearly or half-yearly.`,
        R`**Coupon rate** \(= \frac{\text{annual coupon}}{\text{face value}}\). It is a quoted rate, not an effective annual rate.`,
        R`Value of any security \(=\) PV of its expected future cash flows, discounted at a rate that suits its risk.`,
      ] },
      { h: 'Pricing a bond', points: [
        R`Two cash-flow streams: coupons (an annuity) plus the face value (a lump sum): \(P = \frac{C}{i}\left(1 - \frac{1}{(1+i)^{n}}\right) + \frac{FV}{(1+i)^{n}}\).`,
        R`Discount at the **yield to maturity** \(i\), the market’s required return. Never at the coupon rate.`,
        R`**Zero-coupon bond:** \(P = \frac{FV}{(1+i)^{n}}\). It always sells below face value when \(i > 0\).`,
        R`Coupon rate \(>\) YTM: **premium**. Coupon rate \(=\) YTM: **par**. Coupon rate \(<\) YTM: **discount**.`,
      ] },
      { h: 'Semi-annual coupons and the EAY', points: [
        R`Work in half-years: **halve** the coupon, **halve** the yield, **double** \(n\).`,
        R`Effective annual yield: \(EAY = \left(1 + \frac{y}{2}\right)^{2} - 1\). A 10% semi-annual YTM gives \(1.05^{2} - 1 = 10.25\%\).`,
        R`Given a yield **per half-year**, \(i\)? It is already halved. Compound it: \(EAY = (1 + i)^{2} - 1\). Do not halve it again.`,
      ] },
      { h: 'Yields and interest-rate risk', points: [
        R`**YTM:** the average return if you buy now, hold to maturity and every payment is made. Your expected return can differ from it.`,
        R`**Realised yield:** solve for the rate using the price you paid, the coupons, and the price you sold at.`,
        R`Bond prices and interest rates move in **opposite** directions.`,
        R`**Longer maturity** and **lower coupon** mean a bigger percentage price change: more interest-rate risk.`,
        R`At a 0% discount rate, a bond’s price is simply the sum of all its cash flows.`,
      ] },
      { h: 'Shares: zero and constant growth', points: [
        R`Shares are harder to value than bonds: dividends are **uncertain** and there is **no maturity**.`,
        R`**Zero growth / preference shares:** a perpetuity, \(P_0 = \frac{D}{r_E}\). The price stays the same over time.`,
        R`**Constant growth (DDM):** \(P_0 = \frac{D_1}{r_E - g} = \frac{D_0(1+g)}{r_E - g}\). Use \(D_1\), never \(D_0\), and you need \(r_E > g\).`,
        R`Future price: \(P_n = \frac{D_{n+1}}{r_E - g} = P_0(1+g)^{n}\).`,
        R`A higher required return (higher perceived risk) means a lower price. A lower discount rate means a higher price.`,
      ] },
      { h: 'Where the return comes from', points: [
        R`\(r_E = \frac{D_1}{P_0} + g\): **dividend yield** plus **capital gains yield**.`,
        R`One-year view: \(r_E = \frac{D_1 + P_1 - P_0}{P_0}\). With constant growth, the capital gains yield equals \(g\).`,
        R`Total return can be negative if the price falls by more than the dividend.`,
      ] },
      { h: 'Variable growth: the 4-step method', points: [
        R`Step 1: work out each dividend in the high-growth years, \(D_1, \ldots, D_n\).`,
        R`Step 2: discount each one to today.`,
        R`Step 3: once growth is constant, \(P_n = \frac{D_{n+1}}{r_E - g}\). It sits at \(t = n\).`,
        R`Step 4: \(P_0 = \) PV of the dividends \(+ \frac{P_n}{(1+r_E)^{n}}\).`,
        R`If the latest dividend is still to be paid (tomorrow), add it to the price.`,
      ] },
      { h: 'On your TI-Nspire CX CAS', points: [
        R`Bond price: Finance Solver with \(N\) = coupons left, \(I(\%)\) = the yield, \(Pmt\) = the coupon, \(FV\) = the face value. Solve \(PV\); the minus sign just means it is the price you pay.`,
        R`Semi-annual bond: \(N = 2 \times\) years, \(Pmt\) = the half-year coupon, \(I(\%)\) = the yearly yield, \(PpY = CpY = 2\).`,
        R`YTM: put \(PV = -\text{price}\) and solve \(I(\%)\). With \(PpY = CpY = 2\) that is the nominal yearly yield; \(\text{eff}(\text{ans}, 2)\) gives the EAY.`,
        R`Shares: type the formula, e.g. \(0.15 \times 1.05/(0.10-0.05)\). Variable growth: \(\text{npv}(r, 0, \{D_1, D_2, D_3 + P_3\})\).`,
      ] },
    ],

    topics: {
      bondbasics: 'Bond features and terms',
      zero: 'Zero-coupon bonds',
      bondprice: 'Pricing coupon bonds',
      semi: 'Semi-annual coupons and EAY',
      yield: 'Yield to maturity and realised yield',
      raterisk: 'Interest-rate risk',
      pref: 'Preference and zero-growth shares',
      ddm: 'Constant-growth dividend discount model',
      returns: 'Dividend yield and capital gains yield',
      vargrowth: 'Variable (non-constant) growth',
    },

    nodes: [
      { id: 'w3-1', kind: 'battle', name: 'The Bond Stall', topics: ['bondbasics', 'zero', 'bondprice'], n: 6,
        enemy: { name: 'Coupon Clipper', title: 'Snips a coupon every period', body: 'coin', color: '#d4a017', acc: ['tophat'], mouth: 'smirk', item: '✂️',
          lines: { intro: 'Fresh coupons! The price is the PV of every one… plus the face value!', hit: ['Snip! You remembered the face value.', 'You priced me to the cent!'],
            taunt: ['Discounted at the coupon rate? Snip-snip, wrong!', 'You forgot the face value at maturity!'], win: 'My last coupon… has been clipped…', lose: 'Another bond sold above its value. Snip!' } } },
      { id: 'w3-2', kind: 'battle', name: 'Yield Alley', topics: ['semi', 'yield', 'raterisk'], n: 6,
        enemy: { name: 'The Premium Pirate', title: 'Sails above par when rates fall', body: 'round', color: '#2e6f8e', acc: ['pirate'], mouth: 'grin', item: '⚓',
          lines: { intro: 'Arr! Rates be fallin’, so me bonds sell above par!', hit: ['Blimey, ye know the inverse relationship!', 'Ye halved the rate AND doubled n. Arr!'],
            taunt: ['Ye halved the yield twice, landlubber!', 'Rates up, prices up? Walk the plank!'], win: 'Me treasure… trades at a discount now…', lose: 'Yo ho ho, the yield be mine!' } } },
      { id: 'w3-m1', kind: 'mini', name: 'Bond Surfer', mini: 'bond-surfer' },
      { id: 'w3-3', kind: 'battle', name: 'Dividend Market', topics: ['pref', 'ddm', 'returns'], n: 6,
        enemy: { name: 'Dividendron', title: 'Grows its dividends at g, forever', body: 'tall', color: '#3c9a5f', acc: ['leaf'], mouth: 'grin', item: '🌱',
          lines: { intro: 'I grow my dividends at a steady g. Value me with D1, not D0!', hit: ['You used D1! My roots tremble!', 'Dividend yield plus g… you know my secret.'],
            taunt: ['D0 on top? My leaves are laughing.', 'r plus g? That is not how trees grow!'], win: 'My growth… has reached… zero…', lose: 'I keep growing. You keep guessing.' } } },
      { id: 'w3-4', kind: 'battle', name: 'Growth Spurt Gallery', topics: ['vargrowth', 'ddm', 'returns'], n: 6,
        enemy: { name: 'Hyper-Growth Hydra', title: 'Grows fast, then settles down', body: 'spiky', color: '#b0417a', acc: ['horns'], eyes: 3, mouth: 'fangs', item: '🚀',
          lines: { intro: 'Twenty-five percent growth! Then twenty! Then… oh no, five.', hit: ['You found my terminal price!', 'Four steps and I am slain?!'],
            taunt: ['You discounted my terminal price one year too far!', 'Your terminal price used the wrong dividend!'], win: 'My growth… is now… constant…', lose: 'Supernormal! Unstoppable!' } } },
      { id: 'w3-m2', kind: 'mini', name: 'Model Matcher', mini: 'model-match' },
      { id: 'w3-boss', kind: 'boss', name: 'Mister Market', topics: '*', n: 10,
        enemy: { name: 'Mister Market', title: 'Sets every price in the bazaar', body: 'tall', color: '#3a3f8f', acc: ['crown', 'mustache'], eyes: 2, mouth: 'smirk', item: '📈',
          lines: { intro: 'Bonds, shares, preference shares… I price them ALL. Can you?', hit: ['A fair price! How rare in my bazaar.', 'You discounted every cash flow. Impressive.'],
            taunt: ['Overpaid again! The market thanks you.', 'Wrong yield, wrong price!'], win: 'The market… has been… corrected…', lose: 'Sold! At my price, not yours.' } } },
    ],

    minis: {
      'bond-surfer': {
        game: 'rapid', title: 'Bond Surfer',
        intro: 'Ride the yield waves! Does each bond trade at a discount, at par or at a premium? Watch out for rate-change questions too.',
        bins: [{ id: 'disc', label: 'Discount' }, { id: 'par', label: 'Par' }, { id: 'prem', label: 'Premium' }],
        items: [
          { t: 'Coupon rate 8%, YTM 7.5%', bin: 'prem', why: 'Coupon rate above the YTM: price above face value.' },
          { t: 'Coupon rate 5%, YTM 6%', bin: 'disc', why: 'Coupon rate below the YTM: price below face value.' },
          { t: 'Coupon rate 6%, YTM 6%', bin: 'par', why: 'Coupon rate equals the YTM: price equals face value.' },
          { t: 'Zero-coupon bond, YTM 4%', bin: 'disc', why: 'No coupons at all, so it sells below face value whenever the yield is positive.' },
          { t: 'Issued at par; market rates have since risen', bin: 'disc', why: 'Rates up, price down: its coupon is now below the market yield.' },
          { t: 'Issued at par; market rates have since fallen', bin: 'prem', why: 'Rates down, price up: its coupon is now above the market yield.' },
          { t: 'The required return is above the coupon rate', bin: 'disc', why: 'Investors want more than the coupons give, so they pay less than face value.' },
          { t: 'The coupon rate is above the required return', bin: 'prem', why: 'The coupons are generous, so investors pay more than face value.' },
          { t: 'Price $1,081.11 on a $1,000 bond', bin: 'prem', why: 'A price above face value is a premium.' },
          { t: 'Price $926.40 on a $1,000 bond', bin: 'disc', why: 'A price below face value is a discount.' },
          { t: 'Coupon 9% semi-annual, YTM 7%', bin: 'prem', why: 'The 9% coupon rate is above the 7% YTM.' },
          { t: 'Coupon 8% semi-annual, YTM 10%', bin: 'disc', why: 'The 8% coupon rate is below the 10% YTM.' },
          { t: 'A new bond whose coupon is set equal to the market yield', bin: 'par', why: 'Coupon rate = YTM, so it sells at face value.' },
          { t: 'Coupon 12% semi-annual, YTM 12% p.a.', bin: 'par', why: 'The coupon rate and the YTM are equal.' },
        ],
        gen(rng) {
          const k = rng.int(0, 9);
          if (k < 5) {
            const c = rng.step(0.02, 0.12, 0.005), d = rng.pick([-0.02, -0.01, -0.005, 0, 0.005, 0.01, 0.02]);
            const y = cl(Math.max(0.005, c + d));
            const bin = y < c ? 'prem' : y > c ? 'disc' : 'par';
            return { t: `Coupon rate ${T.pctT(c)}, YTM ${T.pctT(y)}`, bin,
              why: bin === 'prem' ? 'Coupon rate above the YTM: premium.' : bin === 'disc' ? 'Coupon rate below the YTM: discount.' : 'Coupon rate equals the YTM: par.' };
          }
          if (k < 7) {
            const up = rng.chance(0.5);
            return { t: `Market interest rates **${up ? 'rise' : 'fall'}**. What happens to the prices of existing bonds?`, opts: ['They rise', 'They fall', 'No change'], a: up ? 1 : 0,
              why: up ? 'Rates up, prices down: they move in opposite directions.' : 'Rates down, prices up: they move in opposite directions.' };
          }
          if (k === 7) {
            const c = rng.pick(['4%', '6%', '8%']), a = rng.int(1, 5), b = rng.int(15, 30), longFirst = rng.chance(0.5);
            return { t: `Both bonds pay ${aan(c)} ${c} coupon. Which is **more** sensitive to interest-rate changes?`,
              opts: longFirst ? [`The ${b}-year bond`, `The ${a}-year bond`] : [`The ${a}-year bond`, `The ${b}-year bond`], a: longFirst ? 0 : 1,
              why: 'Longer maturity means more interest-rate risk.' };
          }
          if (k === 8) {
            const lo = rng.pick([0, 2, 3]), hi = rng.pick([8, 10, 12]), loFirst = rng.chance(0.5);
            const loTxt = lo === 0 ? 'The zero-coupon bond' : `The ${lo}% coupon bond`, hiTxt = `The ${hi}% coupon bond`;
            return { t: 'Both bonds have 15 years to maturity. Which is **more** sensitive to interest-rate changes?',
              opts: loFirst ? [loTxt, hiTxt] : [hiTxt, loTxt], a: loFirst ? 0 : 1,
              why: 'A lower coupon means more interest-rate risk: more of its value comes from the distant face value.' };
          }
          const s = rng.pick(['prem', 'par', 'disc']);
          return { t: `A bond trades at ${s === 'prem' ? 'a premium' : s === 'par' ? 'par' : 'a discount'}. Its YTM is…`,
            opts: ['Below the coupon rate', 'Equal to the coupon rate', 'Above the coupon rate'], a: s === 'prem' ? 0 : s === 'par' ? 1 : 2,
            why: s === 'prem' ? 'Premium means the coupon rate is above the YTM.' : s === 'par' ? 'At par, the YTM equals the coupon rate.' : 'Discount means the YTM is above the coupon rate.' };
        },
        rounds: 12, seconds: 12,
      },
      'model-match': {
        game: 'rapid', title: 'Model Matcher', intro: 'Which valuation model fits each security? Match them fast.',
        bins: [{ id: 'zero', label: R`Zero growth \(\frac{D}{r}\)` }, { id: 'const', label: R`Constant growth \(\frac{D_1}{r - g}\)` }, { id: 'var', label: 'Variable growth (4 steps)' }, { id: 'bond', label: 'Bond: coupons + face value' }],
        items: [
          { t: 'A preference share paying a fixed $3 a year, forever', bin: 'zero', why: R`A fixed dividend forever is a perpetuity: \(\frac{D}{r}\).` },
          { t: 'Dividends of $2 a year that never change', bin: 'zero', why: 'No growth: the zero-growth (perpetuity) model.' },
          { t: 'Dividends growing at 4% a year, forever', bin: 'const', why: R`Constant growth forever: \(\frac{D_1}{r - g}\).` },
          { t: 'A $1.50 dividend just paid, growing 3% a year forever', bin: 'const', why: R`Constant growth: grow \(D_0\) to \(D_1\), then use \(\frac{D_1}{r - g}\).` },
          { t: 'Dividends grow 20% for 3 years, then 5% forever', bin: 'var', why: 'Growth changes, so value the early dividends one by one, then add a terminal price.' },
          { t: 'Growth starts at 25% and falls 5 points a year to 5%', bin: 'var', why: 'Changing growth: the 4-step variable-growth method.' },
          { t: 'Pays $40 every six months and $1,000 in 10 years', bin: 'bond', why: 'Coupons plus a face value at maturity: the bond formula.' },
          { t: 'Zero-coupon: pays $1,000 in 30 years', bin: 'bond', why: R`A zero-coupon bond: \(\frac{FV}{(1+i)^{n}}\).` },
          { t: 'A government bond with 5% annual coupons, 10 years left', bin: 'bond', why: 'Coupons (an annuity) plus the face value (a lump sum).' },
          { t: 'Growth of 6.5% for 6 years, then 3.5% forever', bin: 'var', why: 'Two growth phases: a growing annuity, then a growing perpetuity.' },
          { t: 'A mature utility whose dividends grow 2% a year, forever', bin: 'const', why: 'Steady growth forever: the constant-growth model.' },
          { t: 'A share paying a constant dividend with no growth', bin: 'zero', why: R`Constant dividend: \(P_0 = \frac{D}{r}\).` },
          { t: 'A corporate bond with semi-annual coupons, repaid at maturity', bin: 'bond', why: 'Halve the coupon and yield, double n, and use the bond formula.' },
          { t: 'A fast grower now that will become a stable grower later', bin: 'var', why: 'High growth first, constant growth later: variable growth.' },
        ],
        rounds: 10, seconds: 12,
      },
    },

    questions: [
      /* ----- bond features ----- */
      { id: 'w3-q01', topic: 'bondbasics', kind: 'mcq', level: 1, section: 'A', src: 'Tutorial W3 concept check Q1',
        q: R`Which statement about bonds is **false**?`,
        choices: ['The coupon rate is an effective annual rate', 'A bond is a liability for the issuer and an asset for the holder', 'Bonds usually make two types of payment: coupons and the face value', 'The time left until the repayment date is the term of the bond'], answer: 0,
        why: R`The **coupon rate** is the annual coupon divided by the face value. It is a quoted rate, not an effective annual rate. A 6% bond paying semi-annually pays 3% each half-year.` },
      { id: 'w3-q02', topic: 'bondbasics', kind: 'tf', level: 1, section: 'A',
        q: R`A bond is a **liability** for the company that issues it and an **asset** for the investor who holds it.`,
        answer: true,
        why: R`The issuer has borrowed and must repay (debt on the right-hand side of its balance sheet). The holder owns the right to the coupons and the face value.` },
      { id: 'w3-q03', topic: 'bondbasics', kind: 'mcq', level: 1, section: 'A',
        q: R`How is a bond’s **coupon rate** defined?`,
        choices: [R`\(\frac{\text{annual coupon}}{\text{face value}}\)`, R`\(\frac{\text{annual coupon}}{\text{current price}}\)`, 'The yield to maturity', R`\(\frac{\text{coupon per period}}{\text{current price}}\)`], answer: 0,
        why: R`A $1,000 bond paying $80 a year has a coupon rate of \(\frac{80}{1{,}000} = 8\%\). The coupon is fixed when the bond is issued.` },
      { id: 'w3-q04', topic: 'bondbasics', kind: 'mcq', level: 1, section: 'A', formula: 'bond-price',
        q: R`What two streams of cash flow does a typical coupon bond pay its holder?`,
        choices: ['Regular coupons, plus the face value at maturity', 'Dividends, plus a share of the profits', 'Only the face value at maturity', 'Coupons that grow every year, forever'], answer: 0,
        why: R`So \(P = PV(\text{coupons}) + PV(\text{face value})\): an annuity plus a lump sum.` },
      { id: 'w3-q05', topic: 'bondbasics', kind: 'mcq', level: 2, section: 'A', formula: 'bond-price',
        q: R`To price a bond, at which rate do you discount its cash flows?`,
        choices: ['The yield to maturity (the market’s required return)', 'The coupon rate', 'The inflation rate', 'The rate the bond paid when it was first issued'], answer: 0,
        wrong: { 1: 'The coupon rate only sets the size of the coupons. Discounting at it always gives the face value.' },
        why: R`Discount at the **YTM**: the return investors require today for the bond’s risk.` },
      { id: 'w3-q06', topic: 'bondbasics', kind: 'tf', level: 1, section: 'A',
        q: R`When market interest rates change, the coupons on an existing fixed-rate bond stay the same, but the bond’s price changes.`,
        answer: true,
        why: R`The coupons are fixed by the bond contract. Only the discount rate changes, so the present value (the price) moves.` },

      /* ----- zero-coupon ----- */
      { id: 'w3-q07', topic: 'zero', kind: 'tf', level: 1, section: 'A', formula: 'zero-bond',
        q: R`A zero-coupon bond always sells **below** its face value when its yield is above 0%.`,
        answer: true,
        why: R`It pays nothing until maturity, so \(P = \frac{FV}{(1+i)^{n}}\), which is less than \(FV\) whenever \(i > 0\). It is a pure **discount** bond.` },
      { id: 'w3-q08', topic: 'zero', kind: 'num', level: 1, section: 'B', src: 'Lecture W3 Example 1', formula: 'zero-bond',
        q: R`Find the value of a 30-year zero-coupon bond with a $1,000 par value and a required return of 6% p.a.`,
        answer: FIN.zeroPrice(1000, 0.06, 30), unit: '$', dp: 2,
        mistakes: [
          { v: 1000 / (1 + 0.06 * 30), why: R`That uses simple interest. Discount with \((1+i)^{n}\).` },
          { v: 1000 / 1.06 ** 29, why: 'That discounts 29 years. The face value arrives at year 30.' },
          { v: FIN.zeroPrice(1000, 0.06, 30, 2), why: 'That compounds semi-annually. Nothing says semi-annual, so use annual periods.' },
        ],
        steps: [R`\[P = \frac{FV}{(1+i)^{n}} = \frac{1{,}000}{1.06^{30}} = ${L.money(FIN.zeroPrice(1000, 0.06, 30))}\]`],
        calc: `30 [N] · 6 [I/YR] · 0 [PMT] · 1000 [FV] · [PV] → −${T.money(FIN.zeroPrice(1000, 0.06, 30))}`,
        ti: [TI.solver({ N: 30, I: 6, Pmt: 0, FV: 1000, PpY: 1, CpY: 1 }, 'PV', { note: R`No coupons, so \(Pmt = 0\). The minus sign means it is the price you pay: \(${L.money(FIN.zeroPrice(1000, 0.06, 30))}\).` })],
        why: 'A zero-coupon bond is one lump sum at maturity. Discount it back 30 years.' },

      /* ----- pricing coupon bonds ----- */
      { id: 'w3-q09', topic: 'bondprice', kind: 'mcq', level: 1, section: 'A',
        q: R`A bond’s coupon rate is **higher** than its yield to maturity. How does it trade?`,
        choices: ['At a premium (above face value)', 'At par (equal to face value)', 'At a discount (below face value)', 'It depends only on the time to maturity'], answer: 0,
        why: R`The coupons pay more than the market requires, so investors pay more than face value. Coupon rate \(>\) YTM \(\Rightarrow\) premium.` },
      { id: 'w3-q10', topic: 'bondprice', kind: 'mcq', level: 2, section: 'A', src: 'Tutorial W3 concept check Q3',
        q: R`Which statement is **false**?`,
        choices: ['If a coupon bond’s YTM is above its coupon rate, its price is above its face value', 'A bond trades at par when its coupon rate equals its YTM', 'A bond trades at a premium when its coupon rate is above its YTM', 'A zero-coupon bond is a discount bond'], answer: 0,
        why: R`If the YTM is **above** the coupon rate, the coupons are too small for the market, so the price is **below** face value: a discount bond.` },
      { id: 'w3-q11', topic: 'bondprice', kind: 'mcq', level: 1, section: 'A', formula: 'bond-price',
        q: R`The bond formula \(P = \frac{C}{i}\left(1 - \frac{1}{(1+i)^{n}}\right) + \frac{FV}{(1+i)^{n}}\) has two parts. What are they?`,
        choices: ['The PV of the coupons (an annuity) plus the PV of the face value (a lump sum)', 'The PV of the coupons plus the PV of the dividends', 'The face value plus all the coupons, not discounted', 'The PV of a perpetuity plus the face value'], answer: 0,
        why: R`Coupons are equal payments for \(n\) periods: an ordinary annuity. The face value is one payment at maturity: a lump sum.` },
      { id: 'w3-q12', topic: 'bondprice', kind: 'num', level: 1, section: 'B', src: 'Lecture W3 Examples 2–4', formula: 'bond-price',
        q: R`A bond has a face value of $1,000, a 5% coupon rate (paid annually) and 10 years to maturity. What is its price if the discount rate is 6%?`,
        answer: EX3.p, unit: '$', dp: 2,
        mistakes: [
          { v: 1000, why: 'That discounts at the 5% coupon rate. Use the 6% discount rate.' },
          { v: EX3.c, why: 'That is only the coupons. Add the PV of the $1,000 face value.' },
          { v: EX3.f, why: 'That is only the face value. Add the PV of the coupons.' },
        ],
        steps: [
          R`\(C = 5\% \times 1{,}000 = \$50\), \(i = 6\%\), \(n = 10\).`,
          R`\[P = \frac{50}{0.06}\left(1 - \frac{1}{1.06^{10}}\right) + \frac{1{,}000}{1.06^{10}} = ${L.num(EX3.c)} + ${L.num(EX3.f)} = ${L.money(EX3.p)}\]`,
          R`The coupon rate (5%) is below the yield (6%), so it trades at a **discount**. At 5% it would sell at par ($1,000). At 4% it would sell at a premium (${T.money(FIN.bondPrice(1000, 0.05, 0.04, 10))}).`,
        ],
        calc: `10 [N] · 6 [I/YR] · 50 [PMT] · 1000 [FV] · [PV] → −${T.money(EX3.p)}`,
        ti: [TI.solver({ N: 10, I: 6, Pmt: 50, FV: 1000, PpY: 1, CpY: 1 }, 'PV', { note: R`The coupon goes in \(Pmt\) and the face value in \(FV\). The minus sign means it is the price you pay: \(${L.money(EX3.p)}\).` })],
        why: 'Price = PV of the coupons + PV of the face value, both at the market rate.' },
      { id: 'w3-q13', topic: 'bondprice', kind: 'num', level: 1, section: 'B', src: 'Tutorial W3 Q1', formula: 'bond-price',
        q: R`Lahey Industries has a $1,000 par value bond with an 8% coupon, paid annually, and 12 years to maturity. What is the bond worth if its yield to maturity is 7%?`,
        answer: FIN.bondPrice(1000, 0.08, 0.07, 12), unit: '$', dp: 2,
        mistakes: [
          { v: 1000, why: 'That discounts at the 8% coupon rate. Use the 7% YTM.' },
          { v: FIN.pvAnnuity(80, 0.07, 12), why: 'That is only the coupons. Add the PV of the face value.' },
          { v: FIN.bondPrice(1000, 0.07, 0.08, 12), why: 'That swaps the two rates. The coupon uses the 8% coupon rate; discount at the 7% YTM.' },
        ],
        steps: [
          R`\(C = 8\% \times 1{,}000 = \$80\), \(i = 7\%\), \(n = 12\).`,
          R`\[P = \frac{80}{0.07}\left(1 - \frac{1}{1.07^{12}}\right) + \frac{1{,}000}{1.07^{12}} = ${L.num(FIN.pvAnnuity(80, 0.07, 12))} + ${L.num(1000 / 1.07 ** 12)} = ${L.money(FIN.bondPrice(1000, 0.08, 0.07, 12))}\]`,
        ],
        calc: `12 [N] · 7 [I/YR] · 80 [PMT] · 1000 [FV] · [PV] → −${T.money(FIN.bondPrice(1000, 0.08, 0.07, 12))}`,
        ti: [TI.solver({ N: 12, I: 7, Pmt: 80, FV: 1000, PpY: 1, CpY: 1 }, 'PV', { note: R`The minus sign means it is the price you pay: \(${L.money(FIN.bondPrice(1000, 0.08, 0.07, 12))}\).` })],
        why: 'The 8% coupon is above the 7% yield, so the bond sells at a premium.' },
      { id: 'w3-q14', topic: 'bondprice', kind: 'num', level: 2, section: 'B', src: 'Mock MST Q29', formula: 'bond-price',
        q: R`A bond has a par value of $1,000, a 10% annual coupon and 8 years left to maturity. What would its price be at a theoretical discount rate of **0%**?`,
        answer: 1800, unit: '$', dp: 2,
        mistakes: [
          { v: 1000, why: 'At 0% nothing is discounted, but the coupons still count. Add all 8 coupons to the face value.' },
          { v: 800, why: 'You left out the face value repaid at maturity.' },
          { v: 1100, why: 'All 8 coupons are paid, not just one.' },
        ],
        steps: [
          R`At 0%, every discount factor \(\frac{1}{(1+0)^{t}}\) equals 1. The price is the sum of the cash flows.`,
          R`\[P = 8 \times \$100 + \$1{,}000 = \$1{,}800\]`,
        ],
        ti: [TI.line('8*100+1000', { note: R`The Finance Solver agrees: with \(I(\%) = 0\) it gives \(PV = -1800\).` })],
        why: 'With no discounting, the price is simply the total of all the cash flows.' },

      /* ----- semi-annual coupons and EAY ----- */
      { id: 'w3-q15', topic: 'semi', kind: 'mcq', level: 1, section: 'A', formula: 'bond-price',
        q: R`A bond pays its coupons **semi-annually**. How do you adjust the bond formula?`,
        choices: ['Halve the coupon, halve the yield and double the number of periods', 'Halve the coupon only', 'Double the coupon and halve the number of periods', 'Nothing changes: use the annual values'], answer: 0,
        why: R`Work in half-years: coupon per period \(= \frac{\text{annual coupon}}{2}\), yield per period \(= \frac{y}{2}\), and \(n = \text{years} \times 2\).` },
      { id: 'w3-q16', topic: 'semi', kind: 'mcq', level: 2, section: 'A', src: 'Tutorial W3 concept check Q2',
        q: R`The Chadstone Company has a $1,000 bond with 15 years to maturity. Its coupon rate is 8%, paid semi-annually. The YTM is 7.5%. How will this bond trade?`,
        choices: ['At a premium', 'At par', 'At a discount', 'You cannot tell without calculating the price'], answer: 0,
        why: R`The coupon rate (8%) is above the YTM (7.5%), so the price is above face value. (It works out at ${T.money(FIN.bondPrice(1000, 0.08, 0.075, 15, 2))}.)`,
        ti: [TI.solver({ N: 30, I: 7.5, Pmt: 40, FV: 1000, PpY: 2, CpY: 2 }, 'PV', { note: 'The price is above the $1,000 face value: a premium.' })] },
      { id: 'w3-q17', topic: 'semi', kind: 'mcq', level: 2, section: 'A', src: 'Mock MST Q30 feedback', formula: 'eay',
        q: R`You find that a semi-annual bond’s yield is 6.0245% **per half-year**. What is its effective annual yield?`,
        choices: [R`\((1.060245)^{2} - 1 = ${L.pct(1.060245 ** 2 - 1)}\)`, R`\(\left(1 + \frac{0.060245}{2}\right)^{2} - 1 = ${L.pct((1 + 0.060245 / 2) ** 2 - 1)}\)`, R`\(2 \times 6.0245\% = ${L.pct(2 * 0.060245)}\)`, R`\(6.02\%\)`], answer: 0,
        wrong: { 1: 'That halves a yield that is already per half-year.', 2: 'That is the nominal annual yield (APR), not the effective yield.' },
        why: R`6.0245% is **already** the half-year yield. Do not halve it again. Compound it for two half-years: \(EAY = (1 + 0.060245)^{2} - 1\).`,
        ti: [TI.line('(1+0.060245)^2-1', { pct: true, note: R`Or: the nominal yield is \(2 \times 6.0245 = 12.049\%\), and \(\text{eff}(12.049, 2)\) gives the same EAY.` })] },
      { id: 'w3-q18', topic: 'semi', kind: 'num', level: 2, section: 'B', src: 'Lecture W3 Example 5', formula: 'bond-price',
        q: R`A bond has a face value of $1,000, a 6% coupon rate and 10 years to maturity. Coupons are paid **semi-annually**. What is its price if the discount rate is 10% p.a.?`,
        answer: EX5.p, unit: '$', dp: 2,
        mistakes: [
          { v: FIN.bondPrice(1000, 0.06, 0.10, 10), why: 'That uses annual coupons. Halve the coupon and the rate, and double n.' },
          { v: FIN.pvAnnuity(30, 0.05, 10) + 1000 / 1.05 ** 10, why: 'That uses 10 periods. 10 years is 20 half-years.' },
          { v: FIN.pvAnnuity(60, 0.05, 20) + 1000 / 1.05 ** 20, why: 'That pays the full $60 every half-year. Each coupon is $30.' },
        ],
        steps: [
          R`Per half-year: \(C = \frac{60}{2} = \$30\), \(i = \frac{10\%}{2} = 5\%\), \(n = 10 \times 2 = 20\).`,
          R`\[P = \frac{30}{0.05}\left(1 - \frac{1}{1.05^{20}}\right) + \frac{1{,}000}{1.05^{20}} = ${L.num(EX5.c)} + ${L.num(EX5.f)} = ${L.money(EX5.p)}\]`,
        ],
        calc: `20 [N] · 5 [I/YR] · 30 [PMT] · 1000 [FV] · [PV] → −${T.money(EX5.p)}`,
        ti: [TI.solver({ N: 20, I: 10, Pmt: 30, FV: 1000, PpY: 2, CpY: 2 }, 'PV', { note: R`\(N = 10 \times 2 = 20\), \(Pmt = 30\) (half of the $60 coupon), \(I(\%) = 10\) (the yearly yield) and \(PpY = CpY = 2\). The minus sign means it is the price you pay.` })],
        why: 'Semi-annual: halve the coupon, halve the rate, double the periods.' },
      { id: 'w3-q19', topic: 'semi', kind: 'num', level: 2, section: 'B', src: 'Tutorial W3 Q2', formula: 'bond-price',
        q: R`Tohey Industries has a $1,000 par value bond with an 8% coupon, paid **semi-annually**, and 12 years to maturity. What is it worth if the required return is 10% p.a.?`,
        answer: FIN.bondPrice(1000, 0.08, 0.10, 12, 2), unit: '$', dp: 2,
        mistakes: [
          { v: FIN.bondPrice(1000, 0.08, 0.10, 12), why: 'That uses annual coupons. Halve the coupon and the rate, and double n.' },
          { v: FIN.pvAnnuity(40, 0.10, 24) + 1000 / 1.1 ** 24, why: 'Halve the rate too: 5% per half-year, not 10%.' },
          { v: FIN.pvAnnuity(40, 0.05, 12) + 1000 / 1.05 ** 12, why: 'That uses 12 periods. 12 years is 24 half-years.' },
        ],
        steps: [
          R`Per half-year: \(C = \$40\), \(i = 5\%\), \(n = 24\).`,
          R`\[P = \frac{40}{0.05}\left(1 - \frac{1}{1.05^{24}}\right) + \frac{1{,}000}{1.05^{24}} = ${L.money(FIN.bondPrice(1000, 0.08, 0.10, 12, 2))}\]`,
        ],
        calc: `24 [N] · 5 [I/YR] · 40 [PMT] · 1000 [FV] · [PV] → −${T.money(FIN.bondPrice(1000, 0.08, 0.10, 12, 2))}`,
        ti: [TI.solver({ N: 24, I: 10, Pmt: 40, FV: 1000, PpY: 2, CpY: 2 }, 'PV', { note: R`\(N = 24\) half-years, \(Pmt = 40\), \(I(\%) = 10\), \(PpY = CpY = 2\). The minus sign means it is the price you pay.` })],
        why: 'The 8% coupon is below the 10% yield, so the bond sells at a discount.' },
      { id: 'w3-q20', topic: 'semi', kind: 'num', level: 2, section: 'B', src: 'MST 2026 Q16', formula: 'bond-price',
        q: R`A $1,000 bond has a 9% coupon rate, paid semi-annually, and 10 years to maturity. Its YTM is 7% p.a. What is its price?`,
        answer: FIN.bondPrice(1000, 0.09, 0.07, 10, 2), unit: '$', dp: 2,
        mistakes: [
          { v: FIN.bondPrice(1000, 0.09, 0.07, 10), why: 'That uses annual coupons. Halve the coupon and the rate, and double n.' },
          { v: FIN.pvAnnuity(90, 0.035, 20) + 1000 / 1.035 ** 20, why: 'That pays the full $90 every half-year. Each coupon is $45.' },
          { v: FIN.pvAnnuity(45, 0.035, 10) + 1000 / 1.035 ** 10, why: 'That uses 10 periods. 10 years is 20 half-years.' },
        ],
        steps: [
          R`Per half-year: \(C = \frac{1{,}000 \times 9\%}{2} = \$45\), \(i = \frac{7\%}{2} = 3.5\%\), \(n = 20\).`,
          R`\[P = \frac{45}{0.035}\left(1 - \frac{1}{1.035^{20}}\right) + \frac{1{,}000}{1.035^{20}} = ${L.money(FIN.bondPrice(1000, 0.09, 0.07, 10, 2))}\]`,
        ],
        calc: `20 [N] · 3.5 [I/YR] · 45 [PMT] · 1000 [FV] · [PV] → −${T.money(FIN.bondPrice(1000, 0.09, 0.07, 10, 2))}`,
        ti: [TI.solver({ N: 20, I: 7, Pmt: 45, FV: 1000, PpY: 2, CpY: 2 }, 'PV', { note: R`\(N = 20\) half-years, \(Pmt = 45\), \(I(\%) = 7\), \(PpY = CpY = 2\). The minus sign means it is the price you pay.` })],
        why: 'The 9% coupon is above the 7% yield, so the bond sells at a premium.' },
      { id: 'w3-q21', topic: 'semi', kind: 'num', level: 1, section: 'B', src: 'Lecture W3 EAY example', formula: 'eay',
        q: R`A semi-annual bond has a yield to maturity of 10% p.a. (compounded semi-annually). What is its **effective annual yield**?`,
        answer: P(1.05 ** 2 - 1), unit: '%', dp: 2,
        mistakes: [
          { v: 10, why: 'That is the nominal YTM. Compounding twice a year makes the effective yield higher.' },
          { v: 5, why: 'That is the yield per half-year.' },
          { v: P(1.1 ** 2 - 1), why: R`That compounds the full 10% twice. Use the half-year rate: \(1.05^{2} - 1\).` },
        ],
        steps: [R`\[EAY = \left(1 + \frac{0.10}{2}\right)^{2} - 1 = 1.05^{2} - 1 = 10.25\%\]`],
        calc: '10 [NOM%] · 2 [P/YR] · [EFF%] → 10.25 (then set P/YR back to 1)',
        ti: [TI.cmd('eff', [10, 2])],
        why: 'Interest earned in the first half-year also earns interest in the second.' },
      { id: 'w3-q22', topic: 'semi', kind: 'mcq', level: 2, section: 'A', src: 'Tutorial W3 Q6(a)', formula: 'eay',
        q: R`A bond was sold at par ($1,000) with a 12% coupon, paid semi-annually. What was its yield to maturity when it was sold?`,
        choices: [R`12% p.a. nominal, which is an effective \(1.06^{2} - 1 = 12.36\%\)`, R`6% p.a.`, R`24% p.a.`, R`12.36% nominal, which is 12% effective`], answer: 0,
        why: R`At par, the YTM equals the coupon rate: 6% per half-year, or 12% p.a. nominal. The effective annual yield is \(1.06^{2} - 1 = 12.36\%\).`,
        ti: [TI.cmd('eff', [12, 2], { note: 'The effective annual yield of 12% p.a. compounded semi-annually.' })] },

      /* ----- yields ----- */
      { id: 'w3-q23', topic: 'yield', kind: 'mcq', level: 1, section: 'A', src: 'Lecture W3 bond yields',
        q: R`What does a bond’s **yield to maturity** measure?`,
        choices: ['The average return if you buy now, hold to maturity, and every payment is made', 'The coupon divided by the face value', 'The return you will earn if you sell the bond next year', 'The cash rate on the day the bond was issued'], answer: 0,
        why: R`The YTM is the discount rate that makes the PV of the promised coupons and face value equal the price. It assumes you hold to maturity and there is no default.` },
      { id: 'w3-q24', topic: 'yield', kind: 'tf', level: 2, section: 'A', src: 'Mock MST Q24',
        q: R`The expected return on a bond is always equal to its yield to maturity.`,
        answer: false,
        why: R`The YTM assumes the bond is held to maturity and never defaults. If you sell early, or the issuer might default, your expected return can differ from the YTM.` },
      { id: 'w3-q25', topic: 'yield', kind: 'mcq', level: 2, section: 'A',
        q: R`A bond trades at a **discount** to its face value. What can you say about its YTM?`,
        choices: ['It is above the coupon rate', 'It is below the coupon rate', 'It equals the coupon rate', 'It must be zero'], answer: 0,
        why: R`The market wants more than the coupons alone provide. The extra return comes from the price rising to face value by maturity, so YTM \(>\) coupon rate.` },
      { id: 'w3-q26', topic: 'yield', kind: 'num', level: 2, section: 'B', src: 'Tutorial W3 Q6(c)', formula: 'eay',
        q: R`A $1,000 bond has 19 half-years left. It pays a $60 coupon every six months and is expected to sell for $896.64. What is its **effective annual** yield to maturity?`,
        answer: P((1 + T6C) ** 2 - 1), unit: '%', dp: 2,
        mistakes: [
          { v: P(2 * T6C), why: R`That is the nominal yield (\(2 \times 7\%\)). Convert it to an effective annual yield.` },
          { v: P(T6C), why: 'That is the yield per half-year.' },
          { v: P((1 + T6C / 2) ** 2 - 1), why: 'The 7% is already a half-year yield. Do not halve it again.' },
        ],
        steps: [
          R`Solve for the half-year yield: \[896.64 = \frac{60}{i}\left(1 - \frac{1}{(1+i)^{19}}\right) + \frac{1{,}000}{(1+i)^{19}} \;\Rightarrow\; i = ${L.pct(T6C, 2)}\]`,
          R`\[EAY = (1 + 0.07)^{2} - 1 = ${L.pct((1 + T6C) ** 2 - 1)}\]`,
        ],
        calc: `19 [N] · −896.64 [PV] · 60 [PMT] · 1000 [FV] · [I/YR] → ${T.num(T6C * 100)} · then 1.07² − 1 = ${T.num(((1 + T6C) ** 2 - 1) * 100)}%`,
        ti: [
          TI.solver({ N: 19, PV: -896.64, Pmt: 60, FV: 1000, PpY: 2, CpY: 2 }, 'I', { note: R`With \(PpY = CpY = 2\) this is the nominal yearly yield: \(2 \times 7\% = 14\%\).` }),
          TI.line('eff(ans,2)', { note: 'Turn the nominal yield into the effective annual yield.' }),
        ],
        why: R`The half-year yield is 7%. Compound it for two half-years: \((1 + 0.07)^{2} - 1\).` },
      { id: 'w3-q27', topic: 'yield', kind: 'num', level: 2, section: 'B', src: 'Mock MST Q30', formula: 'eay',
        q: R`A $1,000 bond has 8 years to maturity and a 10% coupon rate, paid **semi-annually**. It is priced at $896.64. What is its **effective** yield to maturity?`,
        answer: P((1 + M30) ** 2 - 1), unit: '%', dp: 2,
        mistakes: [
          { v: P(2 * M30), why: R`That is the nominal yield. Convert it: \((1 + i_{\text{half}})^{2} - 1\).` },
          { v: P((1 + M30 / 2) ** 2 - 1), why: 'The half-year yield is already halved. Do not halve it again.' },
          { v: P(FIN.bondYieldPeriodic(896.64, 1000, 100, 8)), why: 'That treats the coupons as annual. They are paid every six months.' },
        ],
        steps: [
          R`Per half-year: \(n = 16\), \(C = \$50\), \(FV = \$1{,}000\). Solving gives \(i = ${L.pct(M30, 4)}\) per half-year (\(${L.pct(2 * M30, 3)}\) p.a. nominal).`,
          R`\[EAY = (1 + ${L.dec(M30, 6)})^{2} - 1 = ${L.pct((1 + M30) ** 2 - 1)}\]`,
        ],
        calc: `16 [N] · −896.64 [PV] · 50 [PMT] · 1000 [FV] · [I/YR] → ${T.num(M30 * 100, 4)} · then (1.060245)² − 1 = ${T.num(((1 + M30) ** 2 - 1) * 100)}%`,
        ti: [
          TI.solver({ N: 16, PV: -896.64, Pmt: 50, FV: 1000, PpY: 2, CpY: 2 }, 'I', { note: R`\(N = 8 \times 2 = 16\), \(Pmt = 50\), \(PpY = CpY = 2\). This is the nominal yearly yield.` }),
          TI.line('eff(ans,2)', { note: 'The effective annual yield.' }),
        ],
        why: 'Solve for the half-year yield, then compound it for two half-years.' },
      { id: 'w3-q28', topic: 'yield', kind: 'num', level: 3, section: 'B', src: 'Mock MST Q01', formula: 'eay',
        q: R`Ten years ago, {NAME} paid $980 for a 15-year, $1,000 bond with a 10% coupon paid semi-annually. Today the bond is priced at $1,054.36. If {NAME} sells it today, what is the **realised yield** (effective annual)?`,
        answer: P((1 + M01) ** 2 - 1), unit: '%', dp: 2,
        mistakes: [
          { v: P(2 * M01), why: 'That is the nominal yield. Convert the half-year yield to an effective annual yield.' },
          { v: P((1 + M01 / 2) ** 2 - 1), why: 'The half-year yield is already halved. Do not halve it again.' },
          { v: P((1054.36 / 980) ** (1 / 10) - 1), why: 'That ignores the coupons received. They are part of the return.' },
        ],
        steps: [
          R`Per half-year: \(n = 10 \times 2 = 20\), \(C = \$50\), pay \(\$980\) at the start, receive the sale price \(\$1{,}054.36\) at the end.`,
          R`Solve \[980 = \frac{50}{i}\left(1 - \frac{1}{(1+i)^{20}}\right) + \frac{1{,}054.36}{(1+i)^{20}}\] This gives \(i = ${L.pct(M01, 4)}\) per half-year.`,
          R`\[\text{Realised yield} = (1 + ${L.dec(M01, 6)})^{2} - 1 = ${L.pct((1 + M01) ** 2 - 1)} \approx 11\%\]`,
        ],
        calc: `20 [N] · −980 [PV] · 50 [PMT] · 1054.36 [FV] · [I/YR] → ${T.num(M01 * 100, 4)} · then (1.053238)² − 1 = ${T.num(((1 + M01) ** 2 - 1) * 100)}%`,
        ti: [
          TI.solver({ N: 20, PV: -980, Pmt: 50, FV: 1054.36, PpY: 2, CpY: 2 }, 'I', { note: R`The sale price goes in \(FV\) instead of the face value. This is the nominal yearly yield.` }),
          TI.line('eff(ans,2)', { note: 'The realised yield as an effective annual rate.' }),
        ],
        why: 'For a realised yield, the sale price takes the place of the face value.' },

      /* ----- interest-rate risk ----- */
      { id: 'w3-q29', topic: 'raterisk', kind: 'mcq', level: 1, section: 'A',
        q: R`How are bond prices and market interest rates related?`,
        choices: ['They move in opposite directions', 'They move in the same direction', 'They are unrelated', 'Prices only change when the coupons change'], answer: 0,
        why: R`A bond price is a present value. A higher discount rate gives a lower present value, so when rates rise, prices fall.` },
      { id: 'w3-q30', topic: 'raterisk', kind: 'tf', level: 1, section: 'A',
        q: R`If market interest rates rise, the prices of existing fixed-coupon bonds rise.`,
        answer: false,
        why: R`Prices **fall**. New bonds now pay more, so existing bonds must become cheaper to offer the same yield.` },
      { id: 'w3-q31', topic: 'raterisk', kind: 'mcq', level: 2, section: 'A', src: 'MST 2026 Q4',
        q: R`Four bonds have the same credit risk. Which one is **least** sensitive to a change in interest rates?`,
        choices: ['2 years to maturity, 10% coupon', '2 years to maturity, 2% coupon', '25 years to maturity, 10% coupon', '25 years to maturity, 2% coupon'], answer: 0,
        why: R`**Shorter** maturity and a **higher** coupon both reduce interest-rate risk. More of the value arrives early, so a change in the discount rate moves it less.` },
      { id: 'w3-q32', topic: 'raterisk', kind: 'mcq', level: 2, section: 'A', src: 'MST 2026 Q5',
        q: R`A company issued bonds at par some years ago. Since then, market interest rates have **fallen**. How do these bonds trade now?`,
        choices: ['At a premium, because their coupon rate is now above the market yield', 'At a discount, because rates have fallen', 'Still at par, because the coupon rate has not changed', 'At a discount, because the bonds are older'], answer: 0,
        why: R`When rates fall, existing bonds with relatively high coupons become more attractive. Investors pay more than face value, so they trade at a **premium**.` },
      { id: 'w3-q33', topic: 'raterisk', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W3 interest rate risk table',
        q: R`The table shows the price of a $1,000 bond with a 10% annual coupon at different market rates. What does it show?`,
        table: { head: ['Market rate', '1 year to maturity', '30 years to maturity'], rows: MAT.map(([y, a, b]) => [T.pctT(y), T.money(a), T.money(b)]) },
        choices: ['The longer bond’s price changes much more when rates change', 'The shorter bond’s price changes more when rates change', 'Both prices change by the same amount', 'Maturity has no effect on bond prices'], answer: 0,
        why: R`From 10% to 20%, the 1-year bond falls \(${L.pct(Math.abs(MAT[3][1] / 1000 - 1), 1)}\) but the 30-year bond falls \(${L.pct(Math.abs(MAT[3][2] / 1000 - 1), 1)}\). **Longer maturity \(\Rightarrow\) more interest-rate risk.**` },
      { id: 'w3-q34', topic: 'raterisk', kind: 'mcq', level: 2, section: 'A', src: 'Lecture W3 interest rate risk table',
        q: R`Both bonds have 30 years to maturity and a $1,000 face value. When the market rate rises from 10% to 15%, which price falls by the larger **percentage**?`,
        table: { head: ['Market rate', 'Bond A (5% coupon)', 'Bond B (10% coupon)'], rows: CPN.map(([y, a, b]) => [T.pctT(y), T.money(a), T.money(b)]) },
        choices: ['Bond A, the 5% coupon bond', 'Bond B, the 10% coupon bond', 'Both fall by the same percentage', 'Neither: bond prices rise when rates rise'], answer: 0,
        why: R`Bond A falls from ${T.money(CPN[1][1])} to ${T.money(CPN[2][1])} (\(${L.pct(CPN[2][1] / CPN[1][1] - 1, 1)}\)). Bond B falls from ${T.money(CPN[1][2])} to ${T.money(CPN[2][2])} (\(${L.pct(CPN[2][2] / CPN[1][2] - 1, 1)}\)). **Lower coupon \(\Rightarrow\) more interest-rate risk.**` },
      { id: 'w3-q35', topic: 'raterisk', kind: 'mcq', level: 1, section: 'A',
        q: R`What is **interest-rate risk** for a bondholder?`,
        choices: ['The risk that bond prices change because market interest rates change unexpectedly', 'The risk that the issuer misses a coupon payment', 'The risk that inflation rises', 'The risk that the issuer changes the coupon rate'], answer: 0,
        wrong: { 1: 'That is default (credit) risk.' },
        why: R`It comes from unexpected rate changes. It is greater for longer maturities and lower coupons.` },
      { id: 'w3-q36', topic: 'raterisk', kind: 'num', level: 2, section: 'B', src: 'Mock MST Q02', formula: 'bond-price',
        q: R`A 10-year, $1,000 bond pays a 5% coupon semi-annually. Its YTM today is 4% p.a. In 5 years its YTM is expected to rise to 6% p.a. What will the bond be worth at year 5?`,
        answer: FIN.bondPrice(1000, 0.05, 0.06, 5, 2), unit: '$', dp: 2,
        mistakes: [
          { v: FIN.bondPrice(1000, 0.05, 0.06, 10, 2), why: 'That uses 10 years. At year 5 only 5 years (10 half-years) remain.' },
          { v: FIN.bondPrice(1000, 0.05, 0.04, 5, 2), why: 'That uses the old 4% yield. Use the new 6% yield.' },
          { v: FIN.pvAnnuity(25, 0.06, 10) + 1000 / 1.06 ** 10, why: 'Halve the yield too: 6% p.a. is 3% per half-year.' },
        ],
        steps: [
          R`At year 5: \(n = 5 \times 2 = 10\) half-years, \(C = \frac{50}{2} = \$25\), \(i = \frac{6\%}{2} = 3\%\).`,
          R`\[P_5 = \frac{25}{0.03}\left(1 - \frac{1}{1.03^{10}}\right) + \frac{1{,}000}{1.03^{10}} = ${L.money(FIN.bondPrice(1000, 0.05, 0.06, 5, 2))}\]`,
          R`The yield rose above the coupon rate, so the bond now trades at a **discount**.`,
        ],
        calc: `10 [N] · 3 [I/YR] · 25 [PMT] · 1000 [FV] · [PV] → −${T.money(FIN.bondPrice(1000, 0.05, 0.06, 5, 2))}`,
        ti: [TI.solver({ N: 10, I: 6, Pmt: 25, FV: 1000, PpY: 2, CpY: 2 }, 'PV', { note: R`At year 5: \(N = 10\) half-years left and the new yield, \(I(\%) = 6\). The minus sign means it is the price you pay.` })],
        why: 'Price it with the time left and the new yield.' },
      { id: 'w3-q37', topic: 'raterisk', kind: 'num', level: 2, section: 'B', src: 'Tutorial W3 Q6(b)', formula: 'bond-price',
        q: R`A 30-year, $1,000 bond with a 12% coupon (paid semi-annually) was issued at par on 1 January 1992. On 1 January 1997, market rates have fallen to 10% p.a. What is the bond’s price then?`,
        answer: FIN.bondPrice(1000, 0.12, 0.10, 25, 2), unit: '$', dp: 2,
        mistakes: [
          { v: FIN.bondPrice(1000, 0.12, 0.10, 30, 2), why: 'That uses 30 years. On 1 January 1997, only 25 years (50 half-years) remain.' },
          { v: 1000, why: 'It sold at par when issued, but rates have fallen since. Its price has risen above par.' },
          { v: FIN.pvAnnuity(60, 0.10, 50) + 1000 / 1.1 ** 50, why: 'Halve the yield too: 10% p.a. is 5% per half-year.' },
        ],
        steps: [
          R`Five years on, 25 years remain: \(n = 50\) half-years, \(C = \$60\), \(i = 5\%\).`,
          R`\[P = \frac{60}{0.05}\left(1 - \frac{1}{1.05^{50}}\right) + \frac{1{,}000}{1.05^{50}} = ${L.money(FIN.bondPrice(1000, 0.12, 0.10, 25, 2))}\]`,
          R`Rates fell, so the price rose above par: a **premium** bond.`,
        ],
        calc: `50 [N] · 5 [I/YR] · 60 [PMT] · 1000 [FV] · [PV] → −${T.money(FIN.bondPrice(1000, 0.12, 0.10, 25, 2))}`,
        ti: [TI.solver({ N: 50, I: 10, Pmt: 60, FV: 1000, PpY: 2, CpY: 2 }, 'PV', { note: R`25 years left: \(N = 50\), \(Pmt = 60\), \(I(\%) = 10\), \(PpY = CpY = 2\). The minus sign means it is the price you pay.` })],
        why: 'Falling rates push the price of an existing bond up.' },

      /* ----- preference shares ----- */
      { id: 'w3-q38', topic: 'pref', kind: 'mcq', level: 1, section: 'A', formula: 'share-zero',
        q: R`A **preference share** pays a fixed dividend every year with no end date. Which formula values it?`,
        choices: [R`\(P_0 = \frac{D}{r}\), a perpetuity`, R`\(P_0 = \frac{D_1}{r - g}\) with \(g > 0\)`, 'The bond formula with a face value', R`\(P_0 = D \times r\)`], answer: 0,
        why: R`A fixed dividend forever is a level perpetuity. It is the zero-growth case of the dividend discount model.` },
      { id: 'w3-q39', topic: 'pref', kind: 'num', level: 1, section: 'B', src: 'Tutorial W3 Q4', formula: 'share-zero',
        q: R`Purcell Corporation’s preference share pays an annual dividend of $3. The required return is 8%. What is the share worth today?`,
        answer: 3 / 0.08, unit: '$', dp: 2,
        mistakes: [
          { v: 3 / 0.08 + 3, why: 'No dividend is due today. The next one comes in a year.' },
          { v: 3 / 0.08 / 1.08, why: R`\(\frac{D}{r}\) already gives today’s value. Do not discount again.` },
          { v: 3 / 0.8, why: 'Check the decimal: 8% is 0.08, not 0.8.' },
        ],
        steps: [
          R`\[P_0 = \frac{D}{r} = \frac{3}{0.08} = \$37.50\]`,
          R`In five years it is still worth \(\frac{3}{0.08} = \$37.50\). Nothing grows, so the price stays the same.`,
        ],
        ti: [TI.line('3/0.08')],
        why: R`A preference share is a perpetuity: \(P_0 = \frac{D}{r}\).` },
      { id: 'w3-q40', topic: 'pref', kind: 'tf', level: 1, section: 'A', src: 'Tutorial W3 Q4',
        q: R`A preference share’s dividend is fixed and its required return does not change. Its price in five years will be the same as today.`,
        answer: true,
        why: R`In five years it still pays the same dividend forever, so \(P_5 = \frac{D}{r} = P_0\).` },

      /* ----- constant growth ----- */
      { id: 'w3-q41', topic: 'ddm', kind: 'mcq', level: 1, section: 'A',
        q: R`Why are shares harder to value than bonds?`,
        choices: ['Their future cash flows are uncertain and they have no maturity date', 'They pay coupons twice a year', 'Their face value is not known', 'They cannot be traded'], answer: 0,
        why: R`A bond promises fixed coupons and a face value on a set date. Dividends are not promised, and a share can last forever.` },
      { id: 'w3-q42', topic: 'ddm', kind: 'mcq', level: 1, section: 'A',
        q: R`According to the dividend discount model, what is a share worth?`,
        choices: ['The present value of all its expected future dividends', 'The sum of all its future dividends, not discounted', 'The book value of equity per share', 'Last year’s earnings times ten'], answer: 0,
        why: R`As for any asset, value \(=\) PV of the expected future cash flows. For a shareholder, those cash flows are dividends.` },
      { id: 'w3-q43', topic: 'ddm', kind: 'mcq', level: 2, section: 'A', src: 'Tutorial W3 concept check Q4', formula: 'share-ddm',
        q: R`Which statement about shares is **false**?`,
        choices: ['In the constant-growth model, the value is the current dividend divided by the cost of equity plus the growth rate', 'Estimating dividends, especially far into the future, is difficult', 'Young firms often grow fast at first, then settle to a stable growth rate', 'A firm can pay out its earnings or reinvest them'], answer: 0,
        why: R`The model is \(P_0 = \frac{D_1}{r_E - g}\): the **next** dividend divided by the cost of equity **minus** the growth rate.` },
      { id: 'w3-q44', topic: 'ddm', kind: 'mcq', level: 1, section: 'A', formula: 'share-ddm',
        q: R`A company has **just paid** a dividend \(D_0\). Its dividends grow at \(g\) forever. What goes on top of the constant-growth formula?`,
        choices: [R`\(D_1 = D_0(1+g)\)`, R`\(D_0\)`, R`\(D_0(1+g)^{2}\)`, R`\(D_0 \times g\)`], answer: 0,
        why: R`The formula values the dividends from \(t = 1\) onwards, so it needs the **next** dividend. \(D_0\) has already been paid and is not part of today’s price.` },
      { id: 'w3-q45', topic: 'ddm', kind: 'mcq', level: 1, section: 'A', src: 'MST 2026 Q8',
        q: R`Investors lower the discount rate they apply to a company’s shares. Nothing else changes. What happens to the share price?`,
        choices: ['It rises', 'It falls', 'It stays the same', 'It falls to zero'], answer: 0,
        why: R`A lower discount rate increases the present value of the future dividends, so the price rises.` },
      { id: 'w3-q46', topic: 'ddm', kind: 'mcq', level: 2, section: 'A', src: 'MST 2026 Q7',
        q: R`Two shares have the same expected dividends. Investors require a **higher** return on Share A. What does this usually tell you?`,
        choices: ['Investors see Share A as riskier', 'Share A is safer', 'Share A will grow faster', 'Share A pays higher dividends'], answer: 0,
        why: R`A higher required return is compensation for **higher perceived risk**. With the same dividends, Share A also has the lower price.` },
      { id: 'w3-q47', topic: 'ddm', kind: 'tf', level: 2, section: 'A', formula: 'share-ddm',
        q: R`The constant-growth model \(P_0 = \frac{D_1}{r_E - g}\) still works when \(g\) is greater than \(r_E\).`,
        answer: false,
        why: R`It needs \(r_E > g\). Otherwise the denominator is zero or negative and the price makes no sense. Growth above \(r_E\) can only last for a limited time.` },
      { id: 'w3-q48', topic: 'ddm', kind: 'num', level: 1, section: 'B', src: 'Lecture W3 Example 7', formula: 'share-ddm',
        q: R`Alpha, Inc. has **just paid** an annual dividend of 15 cents per share. Dividends are expected to grow at 5% a year, forever. The required return is 10%. What should you pay for the share?`,
        answer: FIN.ddmConst(0.15 * 1.05, 0.10, 0.05), unit: '$', dp: 2,
        mistakes: [
          { v: 0.15 / 0.05, why: R`That uses \(D_0\). Use the next dividend: \(D_1 = 0.15 \times 1.05 = 0.1575\).` },
          { v: 0.1575 / 0.15, why: 'Subtract g from the required return. Do not add it.' },
          { v: 0.1575 / 0.10, why: R`That ignores growth. Divide by \(r - g\).` },
        ],
        steps: [
          R`\[D_1 = D_0(1+g) = 0.15 \times 1.05 = \$0.1575\]`,
          R`\[P_0 = \frac{D_1}{r_E - g} = \frac{0.1575}{0.10 - 0.05} = \$3.15\]`,
          R`Check: dividend yield \(= \frac{0.1575}{3.15} = 5\%\), capital gains yield \(= g = 5\%\). Together they make \(r_E = 10\%\).`,
        ],
        ti: [TI.line('0.15*1.05/(0.10-0.05)', { note: R`\(D_1 = 0.15 \times 1.05\) goes on top.` })],
        why: R`Grow the dividend just paid by one year, then divide by \((r - g)\).` },
      { id: 'w3-q49', topic: 'ddm', kind: 'num', level: 2, section: 'B', src: 'Mock MST Q17', formula: 'share-ddm',
        q: R`Trusty Gets’ Lucky Ltd has **just paid** a dividend of $2.00. Dividends will grow at 6% a year forever. The discount rate is 16%. What is the share’s expected price in **one year**?`,
        answer: FIN.ddmConst(2 * 1.06 ** 2, 0.16, 0.06), unit: '$', dp: 2, tol: 0.035, // also accept the mock solution's $22.50
        mistakes: [
          { v: FIN.ddmConst(2 * 1.06, 0.16, 0.06), why: R`That is today’s price \(P_0\). The price in one year uses \(D_2\).` },
          { v: FIN.ddmConst(2 * 1.06, 0.16, 0.06) * 1.16, why: R`The price grows at \(g = 6\%\), not at the 16% required return.` },
          { v: 2 / 0.10, why: R`That uses \(D_0\). \(P_1\) needs \(D_2 = D_0(1+g)^{2}\).` },
        ],
        steps: [
          R`\[D_2 = D_0(1+g)^{2} = 2.00 \times 1.06^{2} = \$${n4(2 * 1.06 ** 2)}\]`,
          R`\[P_1 = \frac{D_2}{r - g} = \frac{${n4(2 * 1.06 ** 2)}}{0.16 - 0.06} = ${L.money(FIN.ddmConst(2 * 1.06 ** 2, 0.16, 0.06))}\]`,
          R`Check: \(P_1 = P_0(1+g) = 21.20 \times 1.06 = ${L.money(21.2 * 1.06)}\).`,
        ],
        ti: [TI.line('2*1.06^2/(0.16-0.06)', { note: R`\(D_2 = 2 \times 1.06^{2}\) goes on top, because \(P_1\) values the dividends from year 2 on.` })],
        why: R`The price in one year values the dividends from year 2 onwards. (The mock solution rounds \(D_2\) to $2.25 and gets $22.50.)` },
      { id: 'w3-q50', topic: 'ddm', kind: 'num', level: 2, section: 'B', src: 'Tutorial W3 Q5', formula: 'share-ddm',
        q: R`Brig Company has **just paid** a dividend of $0.20. Dividends grow at 8% a year forever, and investors require 16%. Today’s price is $2.70. What will the share be worth in **five years**?`,
        answer: FIN.ddmConst(0.2 * 1.08 ** 6, 0.16, 0.08), unit: '$', dp: 2,
        mistakes: [
          { v: 2.7, why: 'The price grows with the dividends. It is not fixed like a preference share.' },
          { v: FIN.ddmConst(0.2 * 1.08 ** 5, 0.16, 0.08), why: R`\(P_5\) uses \(D_6\), not \(D_5\).` },
          { v: 2.7 * 1.16 ** 5, why: R`The price grows at \(g = 8\%\), not at the 16% required return.` },
        ],
        steps: [
          R`\[P_5 = P_0(1+g)^{5} = 2.70 \times 1.08^{5} = ${L.money(2.7 * 1.08 ** 5)}\]`,
          R`Or: \(P_5 = \frac{D_6}{r - g} = \frac{0.20 \times 1.08^{6}}{0.16 - 0.08} = ${L.money(FIN.ddmConst(0.2 * 1.08 ** 6, 0.16, 0.08))}\).`,
        ],
        ti: [TI.line('0.20*1.08^6/(0.16-0.08)', { note: R`\(D_6 = 0.20 \times 1.08^{6}\) on top. Or type \(2.70 \times 1.08^{5}\).` })],
        why: 'With constant growth, the share price also grows at g every year.' },
      { id: 'w3-q51', topic: 'ddm', kind: 'tf', level: 2, section: 'A', src: 'Mock MST Q16 feedback',
        q: R`A dividend \(D_0\) was paid yesterday. You should add it to today’s share price \(P_0 = \frac{D_1}{r - g}\).`,
        answer: false,
        why: R`\(D_0\) has already gone to the previous owner. Today’s buyer only gets \(D_1, D_2, \ldots\). (If \(D_0\) were still about to be paid, you would add it.)` },

      /* ----- returns ----- */
      { id: 'w3-q52', topic: 'returns', kind: 'mcq', level: 1, section: 'A', formula: 'total-return',
        q: R`With constant growth, the required return on a share splits into which two parts?`,
        choices: [R`Dividend yield \(\frac{D_1}{P_0}\) plus capital gains yield \(g\)`, 'Coupon rate plus yield to maturity', R`Dividend yield \(\frac{D_0}{P_0}\) minus \(g\)`, 'Interest plus inflation'], answer: 0,
        why: R`Rearranging \(P_0 = \frac{D_1}{r_E - g}\) gives \(r_E = \frac{D_1}{P_0} + g\): income from dividends plus growth in the price.` },
      { id: 'w3-q53', topic: 'returns', kind: 'tf', level: 2, section: 'A', formula: 'total-return',
        q: R`In the constant-growth model, the share price grows at the same rate \(g\) as the dividends, so the capital gains yield equals \(g\).`,
        answer: true,
        why: R`\(P_1 = \frac{D_2}{r_E - g} = P_0(1+g)\), so \(\frac{P_1 - P_0}{P_0} = g\).` },
      { id: 'w3-q54', topic: 'returns', kind: 'tf', level: 1, section: 'A', src: 'Mock MST Q22 feedback',
        q: R`A shareholder’s total return can be negative.`,
        answer: true,
        why: R`Total return \(= \frac{D_1 + P_1 - P_0}{P_0}\). If the price falls by more than the dividend, the return is negative.` },
      { id: 'w3-q55', topic: 'returns', kind: 'num', level: 1, section: 'B', src: 'Tutorial W3 Q3', formula: 'total-return',
        q: R`Tinto Metals trades at $30. It is expected to pay a $1.20 dividend in one year, and its price just after that dividend is expected to be $33. What is your **total return** if you buy today and sell in one year?`,
        answer: 14, unit: '%', dp: 2,
        mistakes: [
          { v: 10, why: 'That is only the capital gains yield. Add the 4% dividend yield.' },
          { v: 4, why: 'That is only the dividend yield. Add the 10% capital gains yield.' },
          { v: P(4.2 / 33), why: 'Divide by the price you pay today ($30), not the sale price.' },
        ],
        steps: [
          R`\[\text{Dividend yield} = \frac{D_1}{P_0} = \frac{1.20}{30} = 4\%\]`,
          R`\[\text{Capital gains yield} = \frac{P_1 - P_0}{P_0} = \frac{33 - 30}{30} = 10\%\]`,
          R`\[r_E = 4\% + 10\% = 14\%\]`,
        ],
        ti: [TI.line('(1.20+33-30)/30', { pct: true, note: R`(Dividend \(+\) price rise) \(\div\) the price you pay. Multiply by 100 for %.` })],
        why: 'Total return = dividend yield + capital gains yield.' },
      { id: 'w3-q56', topic: 'returns', kind: 'num', level: 1, section: 'B', src: 'Mock MST Q05', formula: 'total-return',
        q: R`A share is bought for $22.00 and sold one year later for $26.00, just after it pays a $1.50 dividend. What is the **capital gains yield**?`,
        answer: P(4 / 22), unit: '%', dp: 2,
        mistakes: [
          { v: P(5.5 / 22), why: 'That is the total return. The capital gains yield leaves out the dividend.' },
          { v: P(4 / 26), why: 'Divide by the purchase price ($22), not the sale price.' },
          { v: P(1.5 / 22), why: 'That is the dividend yield.' },
        ],
        steps: [R`\[\text{Capital gains yield} = \frac{P_1 - P_0}{P_0} = \frac{26 - 22}{22} = ${L.pct(4 / 22)}\]`],
        ti: [TI.line('(26-22)/22', { pct: true, note: 'Multiply by 100 for %.' })],
        why: R`With constant growth this would also be the growth rate \(g\).` },
      { id: 'w3-q57', topic: 'returns', kind: 'num', level: 2, section: 'B', src: 'Mock MST Q15', formula: 'total-return',
        q: R`You would pay $30 today for a share you expect to sell for $32 in one year. You require a 12% return. What dividend must you expect at the end of year 1?`,
        answer: 30 * 1.12 - 32, unit: '$', dp: 2,
        mistakes: [
          { v: 3.6, why: 'That is 12% of $30. Part of the 12% comes from the $2 price rise.' },
          { v: (30 * 1.12 - 32) / 1.12, why: 'The dividend arrives at year 1. Do not discount it.' },
          { v: 2, why: 'That is the capital gain, not the dividend.' },
        ],
        steps: [
          R`\[P_0 = \frac{D_1 + P_1}{1 + r} \;\Rightarrow\; 30 = \frac{D_1 + 32}{1.12}\]`,
          R`\[D_1 = 30 \times 1.12 - 32 = 33.60 - 32 = \$1.60\]`,
          R`The mock method gives the same: \(g = \frac{32 - 30}{30} = 6.67\%\) and \(D_1 = P_0(r - g) = 30 \times (0.12 - 0.0667) = \$1.60\).`,
        ],
        ti: [TI.line('30*1.12-32')],
        why: 'The return you need comes from the dividend plus the price rise.' },

      /* ----- variable growth ----- */
      { id: 'w3-q58', topic: 'vargrowth', kind: 'mcq', level: 1, section: 'A', formula: 'share-general',
        q: R`A young company’s dividends will grow at 20% a year for three years, then at 5% a year forever. How should you value its shares?`,
        choices: ['Variable growth: value the first three dividends one by one, then add the PV of the constant-growth price at year 3', R`Constant growth at 20%: \(P_0 = \frac{D_1}{r - 0.20}\)`, R`Constant growth at 5% from today: \(P_0 = \frac{D_1}{r - 0.05}\)`, 'Zero growth: the perpetuity formula'], answer: 0,
        why: R`Growth changes over time, so use the **variable-growth** (general) model. The constant-growth formula can only be used from the point where growth settles at 5%.` },
      { id: 'w3-q59', topic: 'vargrowth', kind: 'mcq', level: 2, section: 'A', formula: 'share-general',
        q: R`High growth lasts until year 3, then growth is constant. You find \(P_3 = \frac{D_4}{r_E - g}\). How do you bring \(P_3\) to today?`,
        choices: [R`Divide by \((1+r_E)^{3}\)`, R`Divide by \((1+r_E)^{4}\)`, R`Divide by \((1+g)^{3}\)`, 'No discounting: it is already a price for today'], answer: 0,
        wrong: { 1: R`One year too many. \(P_3\) sits at \(t = 3\), not \(t = 4\).`, 2: 'Discount at the required return, not the growth rate.' },
        why: R`\(P_3\) is a price at \(t = 3\) (one period before \(D_4\)). Discount it 3 years at the required return, just like \(D_3\).` },
      { id: 'w3-q60', topic: 'vargrowth', kind: 'tf', level: 2, section: 'A',
        q: R`A company’s dividends can grow faster than the required return forever.`,
        answer: false,
        why: R`Growth above \(r_E\) can last for a few years, but not forever: the share would be worth an infinite amount. Eventually growth must settle below \(r_E\).` },
      { id: 'w3-q61', topic: 'vargrowth', kind: 'tf', level: 1, section: 'A', src: 'Tutorial W3 concept check Q4',
        q: R`Successful young firms often have high earnings growth at first. As they mature, growth slows to a stable rate.`,
        answer: true,
        why: R`That is why the variable-growth model has a high-growth phase followed by constant growth.` },
      { id: 'w3-q62', topic: 'vargrowth', kind: 'num', level: 2, section: 'B', src: 'Lecture W3 Example 8', formula: 'share-general',
        q: R`A company has **just paid** a dividend of 15 cents. Dividends will grow at 20% a year for 3 years, then at 5% a year forever. The required return is 10%. What is the share worth today?`,
        answer: EX8.price, unit: '$', dp: 2,
        mistakes: [
          { v: EX8.sum + EX8.PT, why: R`You forgot to discount \(P_3\) back to today.` },
          { v: EX8.sum + (EX8.divs[2] / 0.05) / 1.1 ** 3, why: R`\(P_3 = \frac{D_4}{r - g}\). You used \(D_3\) instead of \(D_4\).` },
          { v: FIN.ddmConst(0.15 * 1.05, 0.10, 0.05), why: 'That ignores the 3 years of 20% growth.' },
        ],
        steps: [
          R`Step 1, the dividends: \(D_1 = 0.15 \times 1.2 = 0.18\), \(D_2 = 0.216\), \(D_3 = 0.2592\).`,
          R`Step 2, their PVs: \[\frac{0.18}{1.10} + \frac{0.216}{1.10^{2}} + \frac{0.2592}{1.10^{3}} = ${n4(EX8.pvDivs[0])} + ${n4(EX8.pvDivs[1])} + ${n4(EX8.pvDivs[2])} = ${n4(EX8.sum)}\]`,
          R`Step 3, the price at year 3: \[P_3 = \frac{D_4}{r - g} = \frac{0.2592 \times 1.05}{0.10 - 0.05} = \$${n4(EX8.PT)}\]`,
          R`Step 4, discount and add: \[P_0 = ${n4(EX8.sum)} + \frac{${n4(EX8.PT)}}{1.10^{3}} = ${n4(EX8.sum)} + ${n4(EX8.pvPT)} = ${L.money(EX8.price)}\]`,
        ],
        ti: [
          TI.line(`${tn(EX8.divs[2])}*1.05/(0.10-0.05)`, { note: R`Step 3: \(P_3 = \frac{D_4}{r - g}\).` }),
          TI.line(`npv(10,0,{${EX8.divs.map((d, k) => tn(d) + (k === 2 ? '+ans' : '')).join(',')}})`, { note: R`Steps 2 and 4 in one line: year 3 holds \(D_3 + P_3\).` }),
        ],
        why: 'Four steps: dividends, their PVs, the terminal price, then discount and add.' },
      { id: 'w3-q63', topic: 'vargrowth', kind: 'num', level: 3, section: 'B', src: 'Tutorial W3 Q7', formula: 'share-general',
        q: R`Networks Ltd has **just paid** a dividend of $0.115. Dividends will grow at 18% for the next two years, 15% in the third year, then 6% a year forever. The required return is 12%. What is the share worth today?`,
        answer: T7.price, unit: '$', dp: 2,
        mistakes: [
          { v: T7.sum + T7.PT, why: R`You forgot to discount \(P_3\) back to today.` },
          { v: T7.sum + (T7.divs[2] / 0.06) / 1.12 ** 3, why: R`\(P_3 = \frac{D_4}{r - g}\). You used \(D_3\) instead of \(D_4\).` },
          { v: FIN.ddmConst(0.115 * 1.06, 0.12, 0.06), why: 'That ignores the three high-growth years.' },
        ],
        steps: [
          R`Dividends: \(D_1 = 0.115 \times 1.18 = ${n4(T7.divs[0])}\), \(D_2 = ${n4(T7.divs[1])}\), \(D_3 = D_2 \times 1.15 = ${n4(T7.divs[2])}\), \(D_4 = D_3 \times 1.06 = ${n4(T7.dNext)}\).`,
          R`\[P_3 = \frac{D_4}{r - g} = \frac{${n4(T7.dNext)}}{0.12 - 0.06} = \$${n4(T7.PT)}\]`,
          R`\[P_0 = \frac{${n4(T7.divs[0])}}{1.12} + \frac{${n4(T7.divs[1])}}{1.12^{2}} + \frac{${n4(T7.divs[2])} + ${n4(T7.PT)}}{1.12^{3}} = ${L.money(T7.price)}\]`,
        ],
        ti: [
          TI.line(`${tn(T7.divs[2])}*1.06/(0.12-0.06)`, { note: R`\(P_3 = \frac{D_4}{r - g}\), with \(D_4 = D_3 \times 1.06\).` }),
          TI.line(`npv(12,0,{${T7.divs.map((d, k) => tn(d) + (k === 2 ? '+ans' : '')).join(',')}})`, { note: R`Year 3 holds \(D_3 + P_3\).` }),
        ],
        why: 'Grow the dividend year by year with the right rate, then add the PV of the terminal price.' },
      { id: 'w3-q64', topic: 'vargrowth', kind: 'num', level: 3, section: 'B', src: 'Tutorial W3 Q8(a)', formula: 'share-general',
        q: R`Buyonline Ltd has **just paid** $0.85 per share. Dividend growth will be 25% next year, then fall by 5 percentage points a year until it reaches 5%, where it stays forever. The market requires 16%. What is the share worth today?`,
        answer: T8.price, unit: '$', dp: 2,
        mistakes: [
          { v: T8.sum + T8.PT, why: R`You forgot to discount \(P_4\) back to today.` },
          { v: T8.sum + (T8.divs[3] / 0.11) / 1.16 ** 4, why: R`\(P_4 = \frac{D_5}{r - g}\). You used \(D_4\) instead of \(D_5\).` },
          { v: T8.price + 0.85, why: 'The $0.85 has already been paid. Only add it if it is still to come.' },
        ],
        steps: [
          R`Growth: 25%, 20%, 15%, 10%, then 5% forever. Dividends: \(D_1 = ${n4(T8.divs[0])}\), \(D_2 = ${n4(T8.divs[1])}\), \(D_3 = ${n4(T8.divs[2])}\), \(D_4 = ${n4(T8.divs[3])}\).`,
          R`\[P_4 = \frac{D_5}{r - g} = \frac{${n4(T8.divs[3])} \times 1.05}{0.16 - 0.05} = \$${n4(T8.PT)}\]`,
          R`\[P_0 = \frac{${n4(T8.divs[0])}}{1.16} + \frac{${n4(T8.divs[1])}}{1.16^{2}} + \frac{${n4(T8.divs[2])}}{1.16^{3}} + \frac{${n4(T8.divs[3])} + ${n4(T8.PT)}}{1.16^{4}} = ${L.money(T8.price)}\]`,
        ],
        ti: [
          TI.line(`${tn(T8.divs[3])}*1.05/(0.16-0.05)`, { note: R`\(P_4 = \frac{D_5}{r - g}\), with \(D_5 = D_4 \times 1.05\).` }),
          TI.line(`npv(16,0,{${T8.divs.map((d, k) => tn(d) + (k === 3 ? '+ans' : '')).join(',')}})`, { note: R`Year 4 holds \(D_4 + P_4\).` }),
        ],
        why: 'Constant growth starts in year 5, so the terminal price sits at year 4.' },
      { id: 'w3-q65', topic: 'vargrowth', kind: 'num', level: 2, section: 'B', src: 'Tutorial W3 Q8(b)', formula: 'share-general',
        q: R`Buyonline Ltd is worth $12.20 per share when its $0.85 dividend has just been paid. What is it worth if that $0.85 dividend will instead be paid **tomorrow**?`,
        answer: r2(T8.price) + 0.85, unit: '$', dp: 2,
        mistakes: [
          { v: r2(T8.price), why: 'Tomorrow’s dividend goes to whoever owns the share today, so it adds to the price.' },
          { v: r2(T8.price) + 0.85 / 1.16, why: 'The dividend is paid tomorrow, so it needs no discounting.' },
          { v: r2(T8.price) - 0.85, why: 'Add the dividend, do not subtract it. The buyer receives it.' },
        ],
        steps: [
          R`Today’s buyer now also receives $0.85 tomorrow. It is worth about $0.85 today.`,
          R`\[P_0 = 12.20 + 0.85 = \$13.05\]`,
        ],
        ti: [TI.line('12.20+0.85')],
        why: 'A dividend about to be paid belongs to today’s owner, so it is part of today’s price.' },
      { id: 'w3-q66', topic: 'vargrowth', kind: 'num', level: 2, section: 'B', src: 'MST 2026 Q17', formula: 'share-general',
        q: R`A share costs $25.56 today. It will pay a $5.00 dividend at the end of each of the next 6 years. Investors require 12% p.a. What price must they expect at the end of year 6, just after the last dividend?`,
        answer: M17.pn, unit: '$', dp: 2,
        mistakes: [
          { v: 25.56 * 1.12 ** 6, why: 'That ignores the dividends. They are part of the return too.' },
          { v: 25.56 * 1.12 ** 6 - 30, why: 'The dividends must be compounded forward (FV of an annuity), not just added up.' },
          { v: 25.56 * 1.12 ** 5 - FIN.fvAnnuity(5, 0.12, 5), why: 'That uses 5 years. The price is needed at the end of year 6.' },
        ],
        steps: [
          R`Today’s price \(=\) PV of the 6 dividends \(+\) PV of \(P_6\): \[25.56 = \frac{5}{0.12}\left(1 - \frac{1}{1.12^{6}}\right) + \frac{P_6}{1.12^{6}}\]`,
          R`\[\frac{P_6}{1.12^{6}} = 25.56 - ${L.num(M17.pvD, 5)} = ${L.num(M17.rest, 5)}\]`,
          R`\[P_6 = ${L.num(M17.rest, 5)} \times 1.12^{6} = ${L.money(M17.pn)}\]`,
        ],
        calc: `6 [N] · 12 [I/YR] · −25.56 [PV] · 5 [PMT] · [FV] → ${T.money(M17.pn)}`,
        ti: [TI.solver({ N: 6, I: 12, PV: -25.56, Pmt: 5, PpY: 1, CpY: 1 }, 'FV', { note: R`You pay the price today (\(PV = -25.56\)) and receive the dividends (\(Pmt = 5\)). \(FV\) is the price you need at year 6.` })],
        why: 'Treat it like a bond: the dividends are the coupons and the future price is the face value.' },

      /* ----- more course examples ----- */
      { id: 'w3-q69', topic: 'pref', kind: 'num', level: 1, section: 'B', src: 'Lecture W3 Example 6', formula: 'share-zero',
        q: R`Wave Industries is expected to pay a constant dividend of $3 per share a year, forever. The discount rate is 15%. What is the share worth?`,
        answer: FIN.ddmZero(3, 0.15), unit: '$', dp: 2,
        mistakes: [
          { v: 3 / 0.15 + 3, why: 'No dividend is due today. The next one comes in a year.' },
          { v: 3 / 0.15 / 1.15, why: R`\(\frac{D}{r}\) already gives today’s value. Do not discount again.` },
          { v: FIN.pvAnnuity(3, 0.15, 10), why: 'That values only 10 years of dividends. These dividends last forever.' },
        ],
        steps: [R`A constant dividend forever is a perpetuity: \[P_0 = \frac{D}{r_E} = \frac{3}{0.15} = \$20.00\]`],
        ti: [TI.line('3/0.15')],
        why: R`Zero growth: the share is a perpetuity, \(\frac{D}{r}\).` },
      { id: 'w3-q70', topic: 'ddm', kind: 'num', level: 1, section: 'B', src: 'Mock MST Q14', formula: 'share-ddm',
        q: R`Spacefood Products will pay a dividend of $2.40 per share **at the end of this year**. The dividend is expected to grow by 3% a year, forever. The equity cost of capital is 10%. What is one share worth today?`,
        answer: FIN.ddmConst(2.4, 0.10, 0.03), unit: '$', dp: 2,
        mistakes: [
          { v: FIN.ddmConst(2.4 * 1.03, 0.10, 0.03), why: 'The $2.40 is already next year’s dividend. Do not grow it again.' },
          { v: 2.4 / 0.10, why: R`That ignores growth. Divide by \(r_E - g\).` },
          { v: 2.4 / 0.13, why: R`Subtract \(g\) from \(r_E\). Do not add it.` },
        ],
        steps: [R`\[P_0 = \frac{D_1}{r_E - g} = \frac{2.40}{0.10 - 0.03} = ${L.money(FIN.ddmConst(2.4, 0.10, 0.03))}\]`],
        ti: [TI.line('2.40/(0.10-0.03)')],
        why: R`The dividend at the end of this year is \(D_1\), so it goes straight on top.` },
      { id: 'w3-q71', topic: 'ddm', kind: 'num', level: 1, section: 'B', src: 'Mock MST Q16', formula: 'share-ddm',
        q: R`Trusty Gets’ Lucky Ltd has **just paid** a dividend of $2.00 per share. It plans to increase dividends by 6% a year, indefinitely. The discount rate is 16%. What is the share price today?`,
        answer: FIN.ddmConst(2 * 1.06, 0.16, 0.06), unit: '$', dp: 2,
        mistakes: [
          { v: 2 / 0.10, why: R`That uses \(D_0\). Use \(D_1 = 2.00 \times 1.06 = 2.12\).` },
          { v: 2.12 / 0.22, why: R`Subtract \(g\) from \(r_E\). Do not add it.` },
          { v: 2.12 / 0.16, why: R`That ignores growth. Divide by \(r_E - g\).` },
        ],
        steps: [
          R`\[D_1 = D_0(1+g) = 2.00 \times 1.06 = \$2.12\]`,
          R`\[P_0 = \frac{D_1}{r_E - g} = \frac{2.12}{0.16 - 0.06} = ${L.money(FIN.ddmConst(2 * 1.06, 0.16, 0.06))}\]`,
          R`\(D_0\) has already been paid, so it is not part of today’s price.`,
        ],
        ti: [TI.line('2*1.06/(0.16-0.06)', { note: R`\(D_1 = 2 \times 1.06\) on top.` })],
        why: R`Just paid means \(D_0\). Grow it one year to get \(D_1\), then use the constant-growth model.` },

      /* ----- boss-level static ----- */
      { id: 'w3-q67', topic: 'vargrowth', kind: 'num', level: 3, section: 'B', src: 'MST 2026 Q18', formula: 'pv-grow-annuity', boss: true,
        q: R`A company has **just paid** a $2.00 dividend. Dividends will grow at 6.5% a year for the next 6 years, then at 3.5% a year forever. The required return is 9%. What is the share worth today?`,
        answer: Q18.p0, unit: '$', dp: 2,
        mistakes: [
          { v: Q18.pvA + Q18.p6, why: R`\(P_6\) is a price at year 6. Discount it back 6 years.` },
          { v: FIN.pvGrowAnnuity(2, 0.09, 0.065, 6) + Q18.pvP6, why: R`The growing annuity starts with \(D_1 = 2 \times 1.065\), not \(D_0\).` },
          { v: Q18.pvA + (2 * 1.065 ** 6 / 0.055) / 1.09 ** 6, why: R`\(P_6 = \frac{D_7}{r - g}\). Grow \(D_6\) by 3.5% first.` },
        ],
        steps: [
          R`Years 1–6, a growing annuity with \(D_1 = 2 \times 1.065 = 2.13\): \[PV = \frac{2.13}{0.09 - 0.065}\left(1 - \left(\frac{1.065}{1.09}\right)^{6}\right) = \$${n4(Q18.pvA)}\]`,
          R`Price at year 6: \(D_7 = 2 \times 1.065^{6} \times 1.035 = ${n4(Q18.d7)}\), so \[P_6 = \frac{D_7}{0.09 - 0.035} = \$${n4(Q18.p6)}\]`,
          R`\[P_0 = ${n4(Q18.pvA)} + \frac{${n4(Q18.p6)}}{1.09^{6}} = ${n4(Q18.pvA)} + ${n4(Q18.pvP6)} = ${L.money(Q18.p0)}\]`,
        ],
        ti: [
          TI.line('2*1.065^6*1.035/(0.09-0.035)', { note: R`\(P_6 = \frac{D_7}{r - g}\), with \(D_7 = 2 \times 1.065^{6} \times 1.035\).` }),
          TI.line('2.13/(0.09-0.065)*(1-(1.065/1.09)^6)+ans/1.09^6', { note: R`The growing annuity (years 1 to 6) plus \(P_6\) discounted 6 years.` }),
        ],
        why: 'Two growth phases: a growing annuity for 6 years, then a growing perpetuity valued at year 6.' },
      { id: 'w3-q68', topic: 'bondprice', kind: 'num', level: 3, section: 'B', src: 'Mock MST Q12', formula: 'bond-price', boss: true,
        q: R`PDI Ltd’s bond has 8 years left and a 10% coupon, paid semi-annually. After a restructure, it pays **no coupons for the next 5 years**. Normal coupons then resume. At maturity it pays the $1,000 face value **plus** all the skipped coupons. The required return is 15% p.a. What is the bond worth?`,
        tl: { n: 16, at: { 1: '$0', 10: '$0', 11: '$50', 15: '$50', 16: '$1,550' }, unit: 'Half-year', hi: [16] },
        answer: M12.p, unit: '$', dp: 2,
        mistakes: [
          { v: FIN.bondPrice(1000, 0.10, 0.15, 8, 2), why: 'That ignores the restructure and prices a normal bond.' },
          { v: M12.p - 500 / 1.075 ** 16, why: 'You left out the $500 of skipped coupons that are repaid at maturity.' },
          { v: FIN.npv(0.15, M12.cfs), why: R`Use the half-year rate: \(\frac{15\%}{2} = 7.5\%\) per period.` },
        ],
        steps: [
          R`Per half-year: \(C = \$50\), \(i = 7.5\%\), \(n = 16\). Periods 1–10 pay nothing, so \(10 \times 50 = \$500\) is repaid at maturity.`,
          R`Cash flows: $50 in periods 11–15, and \(50 + 1{,}000 + 500 = \$1{,}550\) in period 16.`,
          R`\[P = \frac{1}{1.075^{10}} \times \frac{50}{0.075}\left(1 - \frac{1}{1.075^{5}}\right) + \frac{1{,}550}{1.075^{16}} = ${L.num(M12.a)} + ${L.num(M12.b)} = ${L.money(M12.p)}\]`,
        ],
        calc: `0 [CFj] · 0 [CFj] · 10 [Nj] · 50 [CFj] · 5 [Nj] · 1550 [CFj] · 7.5 [I/YR] · [NPV] → ${T.money(M12.p)}`,
        ti: [TI.cmd('npv', [7.5, 0, [0, 50, 1550], [10, 5, 1]], { note: R`The rate per half-year is 7.5%. The counts: 10 periods of $0, 5 coupons of $50, then $1,550.` })],
        why: 'The bond formula cannot handle skipped coupons. Lay out every cash flow and discount each one (npv on the TI-Nspire).' },
    ],

    generators: [
      /* ---------- bond basics ---------- */
      { id: 'w3-g-cpn', topic: 'bondbasics', level: 1, section: 'B', formula: 'bond-price',
        make(rng) {
          const face = rng.pick([1000, 1000, 5000, 10000, 100000]), c = rng.step(0.02, 0.12, 0.0025);
          const f = rng.pick([{ m: 1, w: 'annually' }, { m: 2, w: 'semi-annually' }, { m: 4, w: 'quarterly' }]);
          const y = cl(Math.max(0.01, c + rng.pick([-0.02, -0.015, -0.01, 0.01, 0.015, 0.02])));
          const yrs = rng.int(3, 20);
          const price = r2(FIN.bondPrice(face, c, y, yrs, f.m));
          const cp = (face * c) / f.m;
          const mistakes = [
            { v: (price * c) / f.m, why: 'Coupons are based on the face value, not on the price.' },
            { v: (face * y) / f.m, why: 'Coupons use the coupon rate, not the yield to maturity.' },
          ];
          if (f.m > 1) mistakes.unshift({ v: face * c, why: `That is the coupon for a whole year. It is paid ${f.w}, so divide by ${f.m}.` });
          return {
            q: R`A bond has a face value of ${mt(face)} and a coupon rate of ${T.pctT(c)}, paid ${f.w}. It has ${yrs} years to maturity, a yield to maturity of ${T.pctT(y)} and a price of ${T.money(price)}. How much is **each** coupon payment?`,
            givens: [['FV', ml(face)], [R`\text{coupon rate}`, L.pctT(c)], ['m', String(f.m)]],
            answer: cp, unit: '$', dp: 2,
            mistakes: dedupe(mistakes),
            steps: [R`\[\text{Coupon per period} = \frac{\text{coupon rate} \times \text{face value}}{m} = \frac{${L.dec(c)} \times ${ml(face)}}{${f.m}} = ${L.money(cp)}\]`],
            ti: [TI.line(`${tn(face)}*${tn(c)}/${f.m}`, { note: `Face value × coupon rate, shared over ${f.m === 1 ? 'one payment' : f.m + ' payments'} a year.` })],
            why: 'The coupon is fixed by the coupon rate and the face value. The price and the YTM do not change it.',
          };
        } },

      /* ---------- zero-coupon ---------- */
      { id: 'w3-g-zero', topic: 'zero', level: 1, section: 'B', formula: 'zero-bond', src: 'Lecture W3 Example 1',
        make(rng) {
          const face = rng.pick([1000, 1000, 1000, 5000, 10000]), y = rng.step(0.02, 0.10, 0.0025), n = rng.int(2, 30);
          const semi = rng.chance(0.3), m = semi ? 2 : 1;
          const price = FIN.zeroPrice(face, y, n, m);
          return {
            q: R`A zero-coupon bond with a face value of ${mt(face)} matures in ${n} years. The required return is ${T.pctT(y)} p.a.${semi ? ', compounded semi-annually.' : ''} What is the bond worth today?`,
            givens: [['FV', ml(face)], ['y', L.pctT(y)], ['n', semi ? R`${n} \times 2 = ${2 * n}` : String(n)]],
            answer: price, unit: '$', dp: 2,
            mistakes: semi ? [
              { v: FIN.zeroPrice(face, y, n, 1), why: R`That compounds once a year. This yield compounds semi-annually: use \(\frac{y}{2}\) and \(2n\) periods.` },
              { v: face / Math.pow(1 + y / 2, n), why: `Halve the rate and double the periods: ${2 * n} half-years, not ${n}.` },
              { v: face / (1 + y * n), why: 'That uses simple interest. Discount with compounding.' },
              { v: face, why: 'A zero-coupon bond pays nothing until maturity, so today it is worth less than its face value.' },
            ] : [
              { v: face / (1 + y * n), why: R`That uses simple interest. Discount with \((1+y)^{n}\).` },
              { v: face / Math.pow(1 + y, n - 1), why: `That discounts ${n - 1} years. The face value arrives at year ${n}.` },
              { v: face, why: 'A zero-coupon bond pays nothing until maturity, so today it is worth less than its face value.' },
            ],
            steps: [
              semi ? R`Semi-annual compounding: \(i = \frac{${L.dec(y)}}{2}\) per half-year and \(n = ${n} \times 2 = ${2 * n}\).` : R`One payment of ${mt(face)} at year ${n}: a lump sum.`,
              R`\[P = \frac{FV}{(1+i)^{n}} = \frac{${ml(face)}}{(${L.onePlus(y / m)})^{${n * m}}} = ${L.money(price)}\]`,
            ],
            calc: `${n * m} [N] · ${pk(y / m)} [I/YR] · 0 [PMT] · ${face} [FV] · [PV] → −${T.money(price)}`,
            ti: [TI.solver({ N: n * m, I: P(y), Pmt: 0, FV: face, PpY: m, CpY: m }, 'PV', { note: (semi ? R`Semi-annual: \(N = ${n} \times 2 = ${2 * n}\) and \(PpY = CpY = 2\). ` : '') + R`No coupons, so \(Pmt = 0\). The minus sign means it is the price you pay.` })],
            why: 'A zero-coupon bond is one lump sum at maturity. Discount it back to today.',
          };
        } },

      /* ---------- coupon bonds ---------- */
      { id: 'w3-g-annual', topic: 'bondprice', level: 1, section: 'B', formula: 'bond-price', src: 'Lecture W3 Examples 2–4; Tutorial W3 Q1',
        make(rng) {
          const co = rng.company();
          const face = 1000, c = rng.step(0.02, 0.12, 0.005), n = rng.int(3, 30);
          const y = rng.chance(0.15) ? c : cl(Math.max(0.01, c + rng.pick([-0.04, -0.03, -0.02, -0.015, -0.01, -0.005, 0.005, 0.01, 0.015, 0.02, 0.03, 0.04])));
          const cp = face * c, price = FIN.bondPrice(face, c, y, n);
          const pvC = FIN.pvAnnuity(cp, y, n), pvF = face / FIN.fvif(y, n);
          const kind = y === c ? 'par' : y < c ? 'premium' : 'discount';
          const mistakes = [
            { v: pvC, why: 'That is only the coupons. Add the PV of the face value.' },
            { v: pvF, why: 'That is only the face value. Add the PV of the coupons.' },
          ];
          if (y !== c) mistakes.unshift({ v: face, why: `That discounts at the coupon rate. Use the ${T.pctT(y)} yield.` });
          else mistakes.push({ v: cp * n + face, why: 'That adds the cash flows without discounting.' });
          return {
            q: R`${co} has ${aan(mt(face))} ${mt(face)} bond with ${aan(T.pctT(c))} ${T.pctT(c)} coupon rate, paid annually, and ${n} years to maturity. What is the bond worth if its yield to maturity is ${T.pctT(y)}?`,
            givens: [['C', ml(cp)], ['i', L.pctT(y)], ['n', String(n)], ['FV', ml(face)]],
            answer: price, unit: '$', dp: 2,
            mistakes,
            steps: [
              R`Coupon: \(C = ${L.pctT(c)} \times ${ml(face)} = ${ml(cp)}\) a year.`,
              bondFormula,
              R`\[P = ${bondTex(cp, y, n, face)} = ${L.num(pvC)} + ${L.num(pvF)} = ${L.money(price)}\]`,
              kind === 'par' ? R`Coupon rate \(=\) yield, so the bond trades at **par**.` : kind === 'premium' ? R`Coupon rate \(>\) yield, so the bond trades at a **premium**.` : R`Coupon rate \(<\) yield, so the bond trades at a **discount**.`,
            ],
            calc: `${n} [N] · ${pk(y)} [I/YR] · ${kn(cp)} [PMT] · ${face} [FV] · [PV] → −${T.money(price)}`,
            ti: [TI.solver({ N: n, I: P(y), Pmt: cp, FV: face, PpY: 1, CpY: 1 }, 'PV', { note: R`The coupon goes in \(Pmt\), the face value in \(FV\), the yield in \(I(\%)\). The minus sign means it is the price you pay.` })],
            why: 'Bond price = PV of the coupons (an annuity) + PV of the face value (a lump sum).',
          };
        } },
      { id: 'w3-g-type', topic: 'bondprice', level: 1, section: 'A', formula: 'bond-price', src: 'Tutorial W3 concept check Q2',
        make(rng) {
          const c = rng.step(0.02, 0.12, 0.005), d = rng.pick([-0.02, -0.01, -0.005, 0, 0, 0.005, 0.01, 0.02]);
          const y = cl(Math.max(0.005, c + d));
          const semi = rng.chance(0.5), yrs = rng.int(2, 30), co = rng.company();
          const ans = y < c ? 0 : y === c ? 1 : 2;
          const price = FIN.bondPrice(1000, c, y, yrs, semi ? 2 : 1);
          return {
            kind: 'mcq',
            q: R`${co} has a $1,000 bond with ${aan(T.pctT(c))} ${T.pctT(c)} coupon rate, paid ${semi ? 'semi-annually' : 'annually'}, and ${yrs} years to maturity. Its yield to maturity is ${T.pctT(y)}. How does it trade?`,
            givens: [[R`\text{coupon rate}`, L.pctT(c)], ['YTM', L.pctT(y)]],
            choices: ['At a premium (above face value)', 'At par (equal to face value)', 'At a discount (below face value)', 'You cannot tell without more information'],
            answer: ans,
            why: ans === 0 ? 'The coupon rate is above the YTM, so investors pay more than face value: a premium.'
              : ans === 1 ? 'The coupon rate equals the YTM, so the bond sells at its face value: par.'
                : 'The coupon rate is below the YTM, so investors pay less than face value: a discount.',
            steps: [
              R`Compare the coupon rate with the YTM: \(${L.pctT(c)} ${ans === 0 ? '>' : ans === 1 ? '=' : '<'} ${L.pctT(y)}\).`,
              R`Check with the formula: the price is \(${L.money(price)}\).`,
            ],
            ti: [TI.solver({ N: yrs * (semi ? 2 : 1), I: P(y), Pmt: (1000 * c) / (semi ? 2 : 1), FV: 1000, PpY: semi ? 2 : 1, CpY: semi ? 2 : 1 }, 'PV', { note: 'Compare the price (ignore the minus sign) with the $1,000 face value.' })],
          };
        } },
      { id: 'w3-g-skip', topic: 'bondprice', level: 3, section: 'B', formula: 'bond-price', boss: true, src: 'Mock MST Q12',
        make(rng) {
          const N = rng.int(6, 10), k = rng.int(2, N - 2), c = rng.step(0.06, 0.12, 0.01), y = rng.step(0.08, 0.16, 0.01);
          const cp = (1000 * c) / 2, i = y / 2, n = 2 * N, s = 2 * k;
          const cfs = [0];
          for (let t = 1; t <= n; t++) cfs.push(t <= s ? 0 : cp);
          cfs[n] += 1000 + s * cp;
          const price = FIN.npv(i, cfs);
          const partC = FIN.pvAnnuity(cp, i, n - s - 1) / FIN.fvif(i, s), partF = cfs[n] / FIN.fvif(i, n);
          const cfsK = [0];
          for (let t = 1; t <= n; t++) cfsK.push(t <= k ? 0 : cp);
          cfsK[n] += 1000 + k * cp;
          const at = { 1: '$0', [s]: '$0', [s + 1]: mt(cp), [n - 1]: mt(cp), [n]: mt(cfs[n]) };
          return {
            q: R`A bond has ${N} years left, a $1,000 face value and ${aan(T.pctT(c))} ${T.pctT(c)} coupon, paid semi-annually. After a restructure it pays **no coupons for the next ${k} years**. Normal coupons then resume. At maturity it repays the face value **plus** all the skipped coupons. The required return is ${T.pctT(y)} p.a. What is the bond worth today?`,
            givens: [['C', ml(cp)], ['i', L.pctT(i)], ['n', String(n)], [R`\text{skipped}`, R`${k} \times 2 = ${s}`]],
            tl: { n, at, unit: 'Half-year', hi: [n] },
            answer: price, unit: '$', dp: 2,
            mistakes: dedupe([
              { v: FIN.bondPrice(1000, c, y, N, 2), why: 'That ignores the restructure and prices a normal bond.' },
              { v: price - (s * cp) / FIN.fvif(i, n), why: `You left out the ${mt(s * cp)} of skipped coupons that are repaid at maturity.` },
              { v: FIN.npv(i, cfsK), why: `${k} years is ${s} half-years of skipped coupons, not ${k}.` },
              { v: FIN.npv(y, cfs), why: R`Use the half-year rate: \(\frac{${L.pctT(y)}}{2} = ${L.pctT(i)}\) per period.` },
            ]),
            steps: [
              R`Per half-year: \(C = ${ml(cp)}\), \(i = ${L.pctT(i)}\), \(n = ${n}\). Periods 1–${s} pay nothing, so \(${s} \times ${ml(cp)} = ${ml(s * cp)}\) is repaid at maturity.`,
              R`Cash flows: ${mt(cp)} in periods ${s + 1}–${n - 1}, and \(${ml(cp)} + \$1{,}000 + ${ml(s * cp)} = ${ml(cfs[n])}\) in period ${n}.`,
              R`\[P = \frac{1}{(${L.onePlus(i)})^{${s}}} \times \frac{${ml(cp)}}{${L.dec(i)}}\left(1 - \frac{1}{(${L.onePlus(i)})^{${n - s - 1}}}\right) + \frac{${ml(cfs[n])}}{(${L.onePlus(i)})^{${n}}} = ${L.num(partC)} + ${L.num(partF)} = ${L.money(price)}\]`,
            ],
            calc: `0 [CFj] · 0 [CFj] · ${s} [Nj] · ${kn(cp)} [CFj] · ${n - s - 1} [Nj] · ${kn(cfs[n])} [CFj] · ${pk(i)} [I/YR] · [NPV] → ${T.money(price)}`,
            ti: [TI.cmd('npv', [P(i), 0, [0, cp, cfs[n]], [s, n - s - 1, 1]], { note: `The rate per half-year is ${T.pctT(i)}. The counts: ${s} periods of $0, ${n - s - 1} coupons of ${mt(cp)}, then ${mt(cfs[n])}.` })],
            why: 'Skipped coupons break the bond formula. List every cash flow and discount each one.',
          };
        } },

      /* ---------- semi-annual and EAY ---------- */
      { id: 'w3-g-semi', topic: 'semi', level: 2, section: 'B', formula: 'bond-price', src: 'Lecture W3 Example 5; Tutorial W3 Q2; MST 2026 Q16',
        make(rng) {
          const face = rng.pick([1000, 1000, 1000, 10000, 30000]), c = rng.step(0.03, 0.12, 0.005), yrs = rng.int(3, 25);
          const y = cl(Math.max(0.01, c + rng.pick([-0.03, -0.02, -0.015, -0.01, 0.01, 0.015, 0.02, 0.03, 0.04])));
          const n = 2 * yrs, cp = (face * c) / 2, i = y / 2;
          const price = FIN.bondPrice(face, c, y, yrs, 2);
          const pvC = FIN.pvAnnuity(cp, i, n), pvF = face / FIN.fvif(i, n);
          return {
            q: R`A bond has a face value of ${mt(face)}, ${aan(T.pctT(c))} ${T.pctT(c)} coupon rate paid **semi-annually**, and ${yrs} years to maturity. The yield to maturity is ${T.pctT(y)} p.a. What is its price?`,
            givens: [['C', R`\frac{${L.dec(c)} \times ${ml(face)}}{2} = ${ml(cp)}`], ['i', R`\frac{${L.pctT(y)}}{2} = ${L.pctT(i)}`], ['n', R`${yrs} \times 2 = ${n}`], ['FV', ml(face)]],
            answer: price, unit: '$', dp: 2,
            mistakes: dedupe([
              { v: FIN.bondPrice(face, c, y, yrs, 1), why: 'That treats the coupons as annual. Halve the coupon and the yield, and double n.' },
              { v: FIN.pvAnnuity(cp, i, yrs) + face / FIN.fvif(i, yrs), why: `Double the number of periods: ${yrs} years is ${n} half-years.` },
              { v: FIN.pvAnnuity(face * c, i, n) + face / FIN.fvif(i, n), why: `Each coupon is half the annual coupon: ${mt(cp)}, not ${mt(face * c)}.` },
              { v: FIN.pvAnnuity(cp, y, n) + face / FIN.fvif(y, n), why: 'Halve the yield too: use the yield per half-year.' },
            ]),
            steps: [
              R`Work in half-years: \(C = ${ml(cp)}\), \(i = ${L.pctT(i)}\), \(n = ${n}\).`,
              R`\[P = ${bondTex(cp, i, n, face)} = ${L.num(pvC)} + ${L.num(pvF)} = ${L.money(price)}\]`,
            ],
            calc: `${n} [N] · ${pk(i)} [I/YR] · ${kn(cp)} [PMT] · ${face} [FV] · [PV] → −${T.money(price)}`,
            ti: [TI.solver({ N: n, I: P(y), Pmt: cp, FV: face, PpY: 2, CpY: 2 }, 'PV', { note: R`\(N = ${n}\) half-years, \(Pmt = ${tn(cp)}\) (the half-year coupon), \(I(\%) = ${L.numT(P(y))}\) (the yearly yield), \(PpY = CpY = 2\). The minus sign means it is the price you pay.` })],
            why: 'Semi-annual coupons: halve the coupon, halve the yield, double the periods.',
          };
        } },
      { id: 'w3-g-eay', topic: 'semi', level: 1, section: 'B', formula: 'eay', src: 'Lecture W3 EAY example; Mock MST Q01 and Q30',
        make(rng) {
          if (rng.chance(0.5)) {
            const y = rng.step(0.02, 0.16, 0.0025), eay = Math.pow(1 + y / 2, 2) - 1;
            return {
              q: R`A bond pays its coupons semi-annually. Its yield to maturity is quoted as ${T.pctT(y)} p.a., compounded semi-annually. What is its **effective annual yield**?`,
              givens: [['y', L.pctT(y)], ['m', '2']],
              answer: P(eay), unit: '%', dp: 2,
              mistakes: [
                { v: P(y), why: 'That is the quoted (nominal) yield. Compounding twice a year makes the effective yield higher.' },
                { v: P(y / 2), why: 'That is the yield per half-year.' },
                { v: P(Math.pow(1 + y, 2) - 1), why: 'Halve the quoted yield first, then compound for two half-years.' },
              ],
              steps: [R`\[EAY = \left(1 + \frac{y}{2}\right)^{2} - 1 = \left(1 + \frac{${L.dec(y)}}{2}\right)^{2} - 1 = ${L.pct(eay, 4)}\]`],
              calc: `${pk(y)} [NOM%] · 2 [P/YR] · [EFF%] → ${T.num(eay * 100, 4)} (then set P/YR back to 1)`,
              ti: [TI.cmd('eff', [P(y), 2], { note: R`\(\text{eff}(\text{yearly yield}, 2)\): two half-years a year.` })],
              why: R`\(EAY = \left(1 + \frac{y}{2}\right)^{2} - 1\) for a semi-annual bond.`,
            };
          }
          const yp = rng.step(0.015, 0.075, 0.0001), eay = Math.pow(1 + yp, 2) - 1;
          return {
            q: R`You work out a semi-annual bond’s yield and get ${T.pctT(yp)} **per half-year**. What is the bond’s **effective annual yield**?`,
            givens: [[R`i_{\text{half}}`, L.pctT(yp)]],
            answer: P(eay), unit: '%', dp: 2,
            mistakes: dedupe([
              { v: P(Math.pow(1 + yp / 2, 2) - 1), why: 'A yield per half-year is already halved. Do not halve it again.' },
              { v: P(2 * yp), why: 'That is the nominal annual yield (APR). The effective yield compounds the half-year rate.' },
              { v: P(yp), why: 'That is the yield per half-year, not per year.' },
            ]),
            steps: [R`\[EAY = (1 + i_{\text{half}})^{2} - 1 = (${L.onePlus(yp)})^{2} - 1 = ${L.pct(eay, 4)}\]`],
            ti: [TI.line(`(1+${tn(yp)})^2-1`, { pct: true, note: R`Compound the half-year yield twice. Multiply by 100 for %. (Or: \(\text{eff}(${L.numT(P(2 * yp))}, 2)\), using the nominal yield \(2 \times ${L.numT(P(yp))}\%\).)` })],
            why: 'Compound the half-year yield for two half-years. Never halve it again.',
          };
        } },

      /* ---------- yields ---------- */
      { id: 'w3-g-ytm', topic: 'yield', level: 2, section: 'B', formula: 'bond-price', src: 'Lecture W3 bond yields',
        make(rng) {
          for (let k = 0; k < 30; k++) {
            const c = rng.step(0.03, 0.12, 0.005), n = rng.int(3, 20);
            const yTrue = cl(c + rng.pick([-0.03, -0.025, -0.02, -0.015, -0.01, 0.01, 0.015, 0.02, 0.025, 0.03, 0.04]));
            if (yTrue < 0.02) continue;
            const cp = 1000 * c;
            const price = r2(FIN.bondPrice(1000, c, yTrue, n));
            const y = FIN.bondYieldPeriodic(price, 1000, cp, n);
            const noFace = FIN.tvm.solveI(n, -price, cp, 0);
            const mistakes = [
              { v: P(c), why: 'That is the coupon rate. The YTM equals it only when the bond trades at par.' },
              { v: P(cp / price), why: 'That only counts the coupon. The YTM also counts the move from the price to face value at maturity.' },
            ];
            if (Number.isFinite(noFace) && noFace > 0.001) mistakes.push({ v: P(noFace), why: 'That leaves out the $1,000 face value repaid at maturity. Enter it as FV.' });
            mistakes.push({ v: P(Math.pow(1000 / price, 1 / n) - 1), why: 'That treats it as a zero-coupon bond. The coupons are part of the return too.' });
            return {
              q: R`A $1,000 bond pays an annual coupon of ${mt(cp)} and has ${n} years to maturity. It trades at ${T.money(price)}. What is its **yield to maturity**?`,
              givens: [['P', L.money(price)], ['C', ml(cp)], ['n', String(n)], ['FV', R`\$1{,}000`]],
              answer: P(y), unit: '%', dp: 2,
              mistakes: dedupe(mistakes),
              steps: [
                R`Find the \(i\) that solves \[${L.num(price)} = \frac{${ml(cp)}}{i}\left(1 - \frac{1}{(1+i)^{${n}}}\right) + \frac{\$1{,}000}{(1+i)^{${n}}}\]`,
                R`Use the calculator (or trial and error with interpolation): \(i = ${L.pct(y, 2)}\).`,
                price > 1000 ? R`The bond trades at a premium, so its YTM is **below** its ${T.pctT(c)} coupon rate.` : R`The bond trades at a discount, so its YTM is **above** its ${T.pctT(c)} coupon rate.`,
              ],
              calc: `${n} [N] · −${kn(price)} [PV] · ${kn(cp)} [PMT] · 1000 [FV] · [I/YR] → ${T.num(y * 100)}`,
              ti: [TI.solver({ N: n, PV: -price, Pmt: cp, FV: 1000, PpY: 1, CpY: 1 }, 'I', { note: R`You pay the price, so \(PV\) is negative. You receive the coupons and the face value, so they are positive.` })],
              why: 'The YTM is the discount rate that makes the PV of the coupons and face value equal the price.',
            };
          }
          return null;
        } },
      { id: 'w3-g-ytmsemi', topic: 'yield', level: 2, section: 'B', formula: 'eay', src: 'Tutorial W3 Q6(c); Mock MST Q30',
        make(rng) {
          for (let k = 0; k < 30; k++) {
            const c = rng.step(0.04, 0.14, 0.01), yrs = rng.int(3, 20) + (rng.chance(0.3) ? 0.5 : 0);
            const n = Math.round(yrs * 2);
            const yTrue = cl(c + rng.pick([-0.03, -0.02, -0.01, 0.01, 0.02, 0.03, 0.04]));
            if (yTrue < 0.03) continue;
            const cp = (1000 * c) / 2;
            const price = r2(FIN.pvAnnuity(cp, yTrue / 2, n) + 1000 / FIN.fvif(yTrue / 2, n));
            const yp = FIN.bondYieldPeriodic(price, 1000, cp, n), eay = Math.pow(1 + yp, 2) - 1;
            return {
              q: R`A $1,000 bond has ${yrs} years to maturity and ${aan(T.pctT(c))} ${T.pctT(c)} coupon rate, paid **semi-annually**. It is priced at ${T.money(price)}. What is its **effective annual** yield to maturity?`,
              givens: [['P', L.money(price)], ['C', ml(cp)], ['n', R`${yrs} \times 2 = ${n}`], ['FV', R`\$1{,}000`]],
              answer: P(eay), unit: '%', dp: 2,
              mistakes: dedupe([
                { v: P(2 * yp), why: R`That is the nominal yield (\(2 \times\) the half-year yield). Convert it to an effective annual yield.` },
                { v: P(Math.pow(1 + yp / 2, 2) - 1), why: 'The half-year yield is already halved. Do not halve it again.' },
                { v: P(yp), why: 'That is the yield per half-year.' },
                { v: P(Math.pow(1 + c / 2, 2) - 1), why: 'That uses the coupon rate. The yield must come from the price.' },
              ]),
              steps: [
                R`Per half-year: \(C = ${ml(cp)}\), \(n = ${n}\), \(FV = \$1{,}000\), price \(= ${L.money(price)}\).`,
                R`Solve for the half-year yield: \(i = ${L.pct(yp, 4)}\) (that is \(${L.pct(2 * yp, 4)}\) p.a. nominal).`,
                R`\[EAY = (1 + i)^{2} - 1 = (${L.onePlus(yp, 6)})^{2} - 1 = ${L.pct(eay, 2)}\]`,
              ],
              calc: `${n} [N] · −${kn(price)} [PV] · ${kn(cp)} [PMT] · 1000 [FV] · [I/YR] → ${T.num(yp * 100, 4)} · then (1 + ${T.numT(yp, 6)})² − 1 = ${T.num(eay * 100)}%`,
              ti: [
                TI.solver({ N: n, PV: -price, Pmt: cp, FV: 1000, PpY: 2, CpY: 2 }, 'I', { note: R`\(N = ${n}\) half-years, \(Pmt = ${tn(cp)}\), \(PpY = CpY = 2\). This is the nominal yearly yield.` }),
                TI.line('eff(ans,2)', { note: 'The effective annual yield.' }),
              ],
              why: R`Solve for the half-year yield, then compound it: \(EAY = (1+i)^{2} - 1\).`,
            };
          }
          return null;
        } },
      { id: 'w3-g-realised', topic: 'yield', level: 3, section: 'B', formula: 'eay', boss: true, src: 'Mock MST Q01',
        make(rng) {
          for (let tries = 0; tries < 30; tries++) {
            const N = rng.pick([10, 12, 15, 20]), k = rng.int(3, N - 2), c = rng.step(0.04, 0.12, 0.01);
            const y0 = cl(c + rng.step(-0.02, 0.02, 0.005)), y1 = cl(c + rng.step(-0.03, 0.03, 0.005));
            if (y0 < 0.01 || y1 < 0.01 || Math.abs(y1 - y0) < 0.01) continue;
            const p0 = r2(FIN.bondPrice(1000, c, y0, N, 2)), p1 = r2(FIN.bondPrice(1000, c, y1, N - k, 2));
            const cp = (1000 * c) / 2, n = 2 * k;
            const yp = FIN.bondYieldPeriodic(p0, p1, cp, n), eay = Math.pow(1 + yp, 2) - 1;
            if (!(eay > 0.02)) continue;
            const who = rng.person();
            return {
              q: R`${k} years ago, ${who} paid ${T.money(p0)} for a new $1,000 bond with ${aan(T.pctT(c))} ${T.pctT(c)} coupon, paid semi-annually, that matures after ${N} years. Today, just after a coupon, the bond is priced at ${T.money(p1)}. If ${who} sells today, what is the **realised yield**, as an effective annual rate?`,
              givens: [['P_0', L.money(p0)], [R`P_{\text{sell}}`, L.money(p1)], ['C', ml(cp)], ['n', R`${k} \times 2 = ${n}`]],
              answer: P(eay), unit: '%', dp: 2,
              mistakes: dedupe([
                { v: P(2 * yp), why: 'That is the nominal yield. Convert the half-year yield to an effective annual yield.' },
                { v: P(Math.pow(1 + yp / 2, 2) - 1), why: 'The half-year yield is already halved. Do not halve it again.' },
                { v: P(Math.pow(p1 / p0, 1 / k) - 1), why: 'That ignores the coupons received. They are part of the return.' },
                { v: P(Math.pow(1 + y0 / 2, 2) - 1), why: 'That is the effective YTM when the bond was bought. The realised yield uses the actual sale price.' },
              ]),
              steps: [
                R`Per half-year: \(n = ${n}\) coupons of ${mt(cp)}. Pay ${T.money(p0)} at the start; receive ${T.money(p1)} when you sell.`,
                R`Solve \[${L.num(p0)} = \frac{${ml(cp)}}{i}\left(1 - \frac{1}{(1+i)^{${n}}}\right) + \frac{${L.num(p1)}}{(1+i)^{${n}}}\] This gives \(i = ${L.pct(yp, 4)}\) per half-year.`,
                R`\[\text{Realised yield} = (1 + i)^{2} - 1 = (${L.onePlus(yp, 6)})^{2} - 1 = ${L.pct(eay, 2)}\]`,
              ],
              calc: `${n} [N] · −${kn(p0)} [PV] · ${kn(cp)} [PMT] · ${kn(p1)} [FV] · [I/YR] → ${T.num(yp * 100, 4)} · then (1 + ${T.numT(yp, 6)})² − 1 = ${T.num(eay * 100)}%`,
              ti: [
                TI.solver({ N: n, PV: -p0, Pmt: cp, FV: p1, PpY: 2, CpY: 2 }, 'I', { note: R`The price you sell at goes in \(FV\). With \(PpY = CpY = 2\) this is the nominal yearly yield.` }),
                TI.line('eff(ans,2)', { note: 'The realised yield as an effective annual rate.' }),
              ],
              why: 'Realised yield: the sale price replaces the face value. Solve for the half-year yield, then make it effective.',
            };
          }
          return null;
        } },

      /* ---------- interest-rate risk ---------- */
      { id: 'w3-g-later', topic: 'raterisk', level: 2, section: 'B', formula: 'bond-price', src: 'Mock MST Q02; Tutorial W3 Q6(b)',
        make(rng) {
          const N = rng.int(8, 30), k = rng.int(2, N - 3), c = rng.step(0.03, 0.12, 0.005);
          const semi = rng.chance(0.6), m = semi ? 2 : 1;
          const y1 = cl(Math.max(0.01, c + rng.step(-0.02, 0.02, 0.005)));
          let y2 = cl(Math.max(0.01, y1 + rng.pick([-0.03, -0.02, -0.01, 0.01, 0.02, 0.03])));
          if (y2 === y1) y2 = cl(y1 + 0.01);
          const left = N - k, price = FIN.bondPrice(1000, c, y2, left, m);
          const cp = (1000 * c) / m, i = y2 / m, n = left * m;
          const mistakes = [
            { v: FIN.bondPrice(1000, c, y2, N, m), why: `That uses all ${N} years. At year ${k} only ${left} years are left.` },
            { v: FIN.bondPrice(1000, c, y1, left, m), why: `That uses the old ${T.pctT(y1)} yield. Use the new yield.` },
          ];
          if (semi) mistakes.push({ v: FIN.bondPrice(1000, c, y2, left, 1), why: 'That treats the coupons as annual. Halve the coupon and the yield, and double n.' });
          mistakes.push({ v: FIN.pvAnnuity(cp, i, n), why: 'That is only the coupons. Add the PV of the face value.' });
          mistakes.push({ v: 1000 / FIN.fvif(i, n), why: 'That is only the face value. Add the PV of the coupons.' });
          return {
            q: R`A new $1,000 bond matures in ${N} years and pays ${aan(T.pctT(c))} ${T.pctT(c)} coupon ${semi ? 'semi-annually' : 'annually'}. Its YTM today is ${T.pctT(y1)} p.a. In ${k} years its YTM is expected to be ${T.pctT(y2)} p.a. What will the bond be worth then, just after that coupon?`,
            givens: [['C', ml(cp)], ['i', semi ? R`\frac{${L.pctT(y2)}}{2} = ${L.pctT(i)}` : L.pctT(y2)], ['n', semi ? R`${left} \times 2 = ${n}` : String(n)], ['FV', R`\$1{,}000`]],
            answer: price, unit: '$', dp: 2,
            mistakes: dedupe(mistakes),
            steps: [
              R`At year ${k}, ${yrsW(left)} remain${semi ? `: \\(n = ${n}\\) half-years, \\(C = ${ml(cp)}\\), \\(i = ${L.pctT(i)}\\)` : `: \\(n = ${n}\\), \\(C = ${ml(cp)}\\), \\(i = ${L.pctT(i)}\\)`}. The old yield no longer matters.`,
              R`\[P_{${k}} = ${bondTex(cp, i, n, 1000)} = ${L.money(price)}\]`,
              y2 > c ? R`The new yield is above the coupon rate, so the bond trades at a **discount**.` : y2 < c ? R`The new yield is below the coupon rate, so the bond trades at a **premium**.` : R`The new yield equals the coupon rate, so the bond trades at **par**.`,
            ],
            calc: `${n} [N] · ${pk(i)} [I/YR] · ${kn(cp)} [PMT] · 1000 [FV] · [PV] → −${T.money(price)}`,
            ti: [TI.solver({ N: n, I: P(y2), Pmt: cp, FV: 1000, PpY: m, CpY: m }, 'PV', { note: R`Use the ${semi ? 'half-years' : 'years'} left at that date (\(N = ${n}\)) and the new yield (\(I(\%) = ${L.numT(P(y2))}\)). The minus sign means it is the price you pay.` })],
            why: 'A future price uses the time left at that date and the yield at that date.',
          };
        } },
      { id: 'w3-g-sens', topic: 'raterisk', level: 2, section: 'B', formula: 'bond-price', src: 'Lecture W3 interest rate risk; MST 2026 Q4',
        make(rng) {
          for (let k = 0; k < 40; k++) {
            const byMat = rng.chance(0.5);
            let A, B;
            if (byMat) { const c = rng.step(0.03, 0.10, 0.01); A = { n: rng.int(1, 5), c }; B = { n: rng.int(15, 30), c }; }
            else { const n = rng.int(10, 25); A = { n, c: rng.pick([0, 0.02, 0.03, 0.04]) }; B = { n, c: rng.pick([0.08, 0.10, 0.12]) }; }
            const y1 = rng.step(0.04, 0.10, 0.005), up = rng.chance(0.6);
            const y2 = cl(y1 + (up ? 1 : -1) * rng.pick([0.01, 0.02]));
            const pr = (b, y) => FIN.bondPrice(1000, b.c, y, b.n);
            const chA = pr(A, y2) / pr(A, y1) - 1, chB = pr(B, y2) / pr(B, y1) - 1;
            const more = Math.abs(chA) > Math.abs(chB) ? 'A' : 'B';
            if (more !== (byMat ? 'B' : 'A') || Math.abs(Math.abs(chA) - Math.abs(chB)) < 0.002) continue;
            const swap = rng.chance(0.5);
            const X = swap ? B : A, Y = swap ? A : B, chX = swap ? chB : chA, chY = swap ? chA : chB;
            const desc = (b) => `${b.n}-year bond, ${b.c === 0 ? 'zero coupon' : T.pctT(b.c) + ' annual coupon'}`;
            return {
              kind: 'mcq',
              q: R`Bond X: ${desc(X)}. Bond Y: ${desc(Y)}. Both have a $1,000 face value. Market yields ${up ? 'rise' : 'fall'} from ${T.pctT(y1)} to ${T.pctT(y2)}. Which bond’s price changes by the larger **percentage**?`,
              choices: ['Bond X', 'Bond Y', 'Both change by the same percentage', `Neither: bond prices do not change when yields ${up ? 'rise' : 'fall'}`],
              answer: Math.abs(chX) > Math.abs(chY) ? 0 : 1,
              why: byMat ? R`**Longer maturity \(\Rightarrow\) more interest-rate risk.** More of the value comes from cash flows far in the future.` : R`**Lower coupon \(\Rightarrow\) more interest-rate risk.** More of the value comes from the distant face value.`,
              steps: [
                R`Bond X: \(${L.money(pr(X, y1))} \to ${L.money(pr(X, y2))}\), a change of \(${L.pct(chX, 2)}\).`,
                R`Bond Y: \(${L.money(pr(Y, y1))} \to ${L.money(pr(Y, y2))}\), a change of \(${L.pct(chY, 2)}\).`,
              ],
            };
          }
          return null;
        } },

      /* ---------- preference shares ---------- */
      { id: 'w3-g-pref', topic: 'pref', level: 1, section: 'B', formula: 'share-zero', src: 'Lecture W3 Example 6; Tutorial W3 Q4',
        make(rng) {
          const co = rng.company();
          if (rng.chance(0.7)) {
            const d = rng.step(0.5, 10, 0.25), r = rng.step(0.04, 0.15, 0.005);
            const later = rng.chance(0.3) ? rng.int(2, 10) : 0;
            const p = d / r;
            return {
              q: later
                ? R`${co} has a preference share that pays a fixed dividend of ${dv(d)} a year, forever. Investors require ${T.pctT(r)}. What will the share be worth in ${later} years, just after that year’s dividend?`
                : R`${co} has a preference share that pays a fixed annual dividend of ${dv(d)}, forever. The next dividend is in one year. The required return is ${T.pctT(r)}. What is the share worth today?`,
              givens: [['D', dvl(d)], ['r', L.pctT(r)]],
              answer: p, unit: '$', dp: 2,
              mistakes: later ? [
                { v: p * Math.pow(1 + r, later), why: R`The price does not grow. The dividend is fixed, so the price stays \(\frac{D}{r}\).` },
                { v: p / Math.pow(1 + r, later), why: R`That is today’s value of the future price. The question asks for the price in ${later} years, which is still \(\frac{D}{r}\).` },
                { v: p + d, why: 'That year’s dividend has just been paid, so it is not part of the price.' },
              ] : [
                { v: p + d, why: 'No dividend is paid today. The next one is in a year.' },
                { v: p / (1 + r), why: R`\(\frac{D}{r}\) already gives today’s value. Do not discount again.` },
                { v: d / (10 * r), why: R`Check the decimal: ${T.pctT(r)} is \(${L.dec(r)}\).` },
              ],
              steps: [
                R`A fixed dividend forever is a perpetuity: \[P = \frac{D}{r} = \frac{${dvl(d)}}{${L.dec(r)}} = ${L.money(p)}\]`,
              ].concat(later ? [R`In ${later} years the share still pays ${dv(d)} forever, so its price is the same.`] : []),
              ti: [TI.line(`${tn(d)}/${tn(r)}`)],
              why: R`Preference share \(=\) perpetuity: \(\frac{D}{r}\). With no growth, the price stays the same over time.`,
            };
          }
          const dq = rng.step(0.25, 2.5, 0.05), rA = rng.step(0.04, 0.12, 0.004), rq = rA / 4, p = dq / rq;
          return {
            q: R`${co} has a preference share that pays ${dv(dq)} every **quarter**, forever. The required return is ${T.pctT(rA)} p.a., compounded quarterly (${T.pctT(rq)} per quarter). What is the share worth today?`,
            givens: [[R`D_{\text{qtr}}`, dvl(dq)], [R`r_{\text{qtr}}`, L.pctT(rq)]],
            answer: p, unit: '$', dp: 2,
            mistakes: [
              { v: dq / rA, why: 'That mixes a quarterly dividend with an annual rate. Use the rate per quarter.' },
              { v: (4 * dq) / rq, why: 'That mixes an annual dividend with a quarterly rate. Keep both per quarter.' },
              { v: p + dq, why: 'No dividend is due today. The next one is in a quarter.' },
            ],
            steps: [R`Match the rate to the payment period: \[P = \frac{D_{\text{qtr}}}{r_{\text{qtr}}} = \frac{${dvl(dq)}}{${L.dec(rq)}} = ${L.money(p)}\]`],
            ti: [TI.line(`${tn(dq)}/${tn(rq)}`, { note: 'A quarterly dividend over a quarterly rate.' })],
            why: 'A perpetuity needs the dividend and the rate for the same period.',
          };
        } },

      /* ---------- constant growth ---------- */
      { id: 'w3-g-ddm', topic: 'ddm', level: 1, section: 'B', formula: 'share-ddm', src: 'Lecture W3 Example 7; Mock MST Q14 and Q16',
        make(rng) {
          const co = rng.company();
          const g = rng.step(0.01, 0.07, 0.005), r = cl(g + rng.step(0.03, 0.10, 0.005));
          if (rng.chance(0.5)) {
            const d0 = rng.step(0.10, 4.00, 0.05), d1 = d0 * (1 + g), p = d1 / (r - g);
            return {
              q: R`${co} has **just paid** a dividend of ${dv(d0)} per share. Dividends are expected to grow at ${T.pctT(g)} a year, forever. The required return is ${T.pctT(r)}. What is the share worth today?`,
              givens: [['D_0', dvl(d0)], ['g', L.pctT(g)], ['r_E', L.pctT(r)]],
              answer: p, unit: '$', dp: 2,
              mistakes: [
                { v: d0 / (r - g), why: R`That uses \(D_0\). The formula needs the next dividend, \(D_1 = D_0(1+g)\).` },
                { v: d1 / (r + g), why: R`Subtract \(g\) from \(r_E\). Do not add it.` },
                { v: d1 / r, why: R`That ignores growth. Divide by \(r_E - g\).` },
              ],
              steps: [
                R`\[D_1 = D_0(1+g) = ${dvl(d0)} \times ${L.onePlus(g)} = ${dvl(d1)}\]`,
                R`\[P_0 = \frac{D_1}{r_E - g} = \frac{${dvl(d1)}}{${L.dec(r)} - ${L.dec(g)}} = ${L.money(p)}\]`,
              ],
              calc: `${+d1.toFixed(4)} ÷ (${L.dec(r)} − ${L.dec(g)}) = ${T.money(p)}`,
              ti: [TI.line(`${tn(d0)}*${tn(1 + g)}/(${tn(r)}-${tn(g)})`, { note: R`\(D_1 = D_0 \times (1+g)\) on top. Keep the brackets around \(r - g\).` })],
              why: R`Grow the dividend just paid by one year, then divide by \((r - g)\).`,
            };
          }
          const d1 = rng.step(0.20, 5.00, 0.05), p = d1 / (r - g);
          return {
            q: R`${co} will pay a dividend of ${dv(d1)} per share **at the end of this year**. Dividends then grow at ${T.pctT(g)} a year, forever. The required return is ${T.pctT(r)}. What is the share worth today?`,
            givens: [['D_1', dvl(d1)], ['g', L.pctT(g)], ['r_E', L.pctT(r)]],
            answer: p, unit: '$', dp: 2,
            mistakes: [
              { v: (d1 * (1 + g)) / (r - g), why: R`\(D_1\) is already next year’s dividend. Do not grow it again.` },
              { v: d1 / (r + g), why: R`Subtract \(g\) from \(r_E\). Do not add it.` },
              { v: d1 / r, why: R`That ignores growth. Divide by \(r_E - g\).` },
            ],
            steps: [R`\[P_0 = \frac{D_1}{r_E - g} = \frac{${dvl(d1)}}{${L.dec(r)} - ${L.dec(g)}} = ${L.money(p)}\]`],
            calc: `${d1} ÷ (${L.dec(r)} − ${L.dec(g)}) = ${T.money(p)}`,
            ti: [TI.line(`${tn(d1)}/(${tn(r)}-${tn(g)})`, { note: R`Keep the brackets around \(r - g\).` })],
            why: R`Constant growth forever: next dividend divided by \((r - g)\).`,
          };
        } },
      { id: 'w3-g-ddmfut', topic: 'ddm', level: 2, section: 'B', formula: 'share-ddm', src: 'Tutorial W3 Q5; Mock MST Q17',
        make(rng) {
          const co = rng.company();
          const d0 = rng.step(0.10, 4.00, 0.05), g = rng.step(0.02, 0.08, 0.005), r = cl(g + rng.step(0.03, 0.10, 0.005)), k = rng.int(1, 10);
          const p0 = (d0 * (1 + g)) / (r - g), pK = p0 * Math.pow(1 + g, k), dK1 = d0 * Math.pow(1 + g, k + 1);
          return {
            q: R`${co} has **just paid** a dividend of ${dv(d0)}. Dividends grow at ${T.pctT(g)} a year forever, and investors require ${T.pctT(r)}. What will the share be worth in **${yrsW(k)}**, just after that year’s dividend?`,
            givens: [['D_0', dvl(d0)], ['g', L.pctT(g)], ['r_E', L.pctT(r)], ['n', String(k)]],
            answer: pK, unit: '$', dp: 2,
            mistakes: dedupe([
              { v: p0, why: 'That is today’s price. With constant growth, the price grows at g every year.' },
              { v: (d0 * Math.pow(1 + g, k)) / (r - g), why: R`\(P_{${k}}\) uses \(D_{${k + 1}}\), the dividend one year after year ${k}.` },
              { v: p0 * Math.pow(1 + r, k), why: 'The price grows at g, not at the required return.' },
            ]),
            steps: [
              R`Today: \[P_0 = \frac{D_0(1+g)}{r - g} = \frac{${dvl(d0)} \times ${L.onePlus(g)}}{${L.dec(r)} - ${L.dec(g)}} = ${L.money(p0)}\]`,
              R`In ${yrsW(k)}: \[P_{${k}} = P_0(1+g)^{${k}} = ${L.num(p0)} \times ${L.onePlus(g)}^{${k}} = ${L.money(pK)}\]`,
              R`Same answer: \(P_{${k}} = \frac{D_{${k + 1}}}{r - g} = \frac{${dvl(dK1)}}{${L.dec(r)} - ${L.dec(g)}} = ${L.money(pK)}\).`,
            ],
            ti: [TI.line(`${tn(d0)}*${tn(1 + g)}^${k + 1}/(${tn(r)}-${tn(g)})`, { note: R`\(D_{${k + 1}} = D_0(1+g)^{${k + 1}}\) on top: the dividend one year after year ${k}.` })],
            why: 'With constant growth, the price grows at g, just like the dividends.',
          };
        } },

      /* ---------- returns ---------- */
      { id: 'w3-g-req', topic: 'returns', level: 1, section: 'B', formula: 'total-return', src: 'Lecture W3 components of required return',
        make(rng) {
          const co = rng.company();
          const g = rng.step(0.01, 0.08, 0.005), justPaid = rng.chance(0.5), d = rng.step(0.20, 4.00, 0.05);
          const d1 = justPaid ? d * (1 + g) : d;
          const p0 = r2(d1 / rng.step(0.02, 0.08, 0.005));
          const r = d1 / p0 + g;
          return {
            q: justPaid
              ? R`Shares in ${co} trade at ${T.money(p0)}. The company has **just paid** a dividend of ${dv(d)}, and dividends grow at ${T.pctT(g)} a year forever. What return do investors require?`
              : R`Shares in ${co} trade at ${T.money(p0)}. The company will pay a dividend of ${dv(d)} at the end of this year, and dividends grow at ${T.pctT(g)} a year forever. What return do investors require?`,
            givens: [['P_0', L.money(p0)], [justPaid ? 'D_0' : 'D_1', dvl(d)], ['g', L.pctT(g)]],
            answer: P(r), unit: '%', dp: 2,
            mistakes: dedupe([
              justPaid ? { v: P(d / p0 + g), why: R`Use \(D_1 = D_0(1+g)\) in the dividend yield, not \(D_0\).` } : { v: P((d * (1 + g)) / p0 + g), why: R`\(D_1\) is already next year’s dividend. Do not grow it again.` },
              { v: P(d1 / p0), why: 'That is only the dividend yield. Add the capital gains yield g.' },
              { v: P(g), why: 'That is only the capital gains yield. Add the dividend yield.' },
              { v: P(d1 / p0 - g), why: 'Add g to the dividend yield. Do not subtract it.' },
            ]),
            steps: (justPaid ? [R`\[D_1 = ${dvl(d)} \times ${L.onePlus(g)} = ${dvl(d1)}\]`] : []).concat([
              R`\[r_E = \frac{D_1}{P_0} + g = \frac{${dvl(d1)}}{${L.num(p0)}} + ${L.dec(g)} = ${L.pct(d1 / p0, 2)} + ${L.pctT(g)} = ${L.pct(r, 2)}\]`,
            ]),
            ti: [TI.line(justPaid ? `${tn(d)}*${tn(1 + g)}/${tn(p0)}+${tn(g)}` : `${tn(d)}/${tn(p0)}+${tn(g)}`, { pct: true, note: R`Dividend yield \(\frac{D_1}{P_0}\) plus \(g\), as decimals. Multiply by 100 for %.` })],
            why: 'Required return = dividend yield + capital gains yield (g).',
          };
        } },
      { id: 'w3-g-yields', topic: 'returns', level: 1, section: 'B', formula: 'total-return', src: 'Tutorial W3 Q3; Mock MST Q05',
        make(rng) {
          for (let k = 0; k < 40; k++) {
            const co = rng.company();
            const p0 = rng.step(10, 80, 0.5), d1 = r2(p0 * rng.step(0.015, 0.07, 0.005));
            const ch = rng.pick([-0.10, -0.08, -0.06, -0.05, -0.04, -0.03, 0.03, 0.04, 0.05, 0.06, 0.08, 0.10, 0.12, 0.15, 0.20]);
            const p1 = r2(p0 * (1 + ch));
            const dy = d1 / p0, cg = (p1 - p0) / p0, tot = dy + cg;
            if (Math.abs(tot) < 0.012 || Math.abs(cg) < 0.012) continue;
            const ask = rng.pick(['div', 'cap', 'tot']);
            const label = { div: 'dividend yield', cap: 'capital gains yield', tot: 'total return' }[ask];
            const answer = { div: dy, cap: cg, tot }[ask];
            const mistakes = {
              div: [{ v: P(d1 / p1), why: 'Divide by the price you pay today, not the sale price.' }, { v: P(cg), why: 'That is the capital gains yield.' }, { v: P(tot), why: 'That is the total return.' }],
              cap: [{ v: P(tot), why: 'That is the total return. The capital gains yield leaves out the dividend.' }, { v: P((p1 - p0) / p1), why: 'Divide by the price you pay today, not the sale price.' }, { v: P(dy), why: 'That is the dividend yield.' }],
              tot: [{ v: P(cg), why: 'You left out the dividend.' }, { v: P(dy), why: 'You left out the price change.' }, { v: P((d1 + p1 - p0) / p1), why: 'Divide by the price you pay today, not the sale price.' }],
            }[ask];
            return {
              q: R`You buy a share of ${co} for ${T.money(p0)}. You expect a dividend of ${T.money(d1)} in one year, and a price of ${T.money(p1)} just after that dividend. What is the expected **${label}**?`,
              givens: [['P_0', L.money(p0)], ['D_1', L.money(d1)], ['P_1', L.money(p1)]],
              answer: P(answer), unit: '%', dp: 2,
              mistakes: dedupe(mistakes),
              steps: [
                R`\[\text{Dividend yield} = \frac{D_1}{P_0} = \frac{${L.num(d1)}}{${L.num(p0)}} = ${L.pct(dy)}\]`,
                R`\[\text{Capital gains yield} = \frac{P_1 - P_0}{P_0} = \frac{${L.num(p1)} - ${L.num(p0)}}{${L.num(p0)}} = ${L.pct(cg)}\]`,
                R`\[\text{Total return} = ${L.pct(dy)} ${cg < 0 ? '-' : '+'} ${L.pct(Math.abs(cg))} = ${L.pct(tot)}\]`,
              ],
              ti: [TI.line(ask === 'div' ? `${tn(d1)}/${tn(p0)}` : ask === 'cap' ? `(${tn(p1)}-${tn(p0)})/${tn(p0)}` : `(${tn(d1)}+${tn(p1)}-${tn(p0)})/${tn(p0)}`, { pct: true, note: 'Divide by the price you pay today. Multiply by 100 for %.' })],
              why: 'Total return = dividend yield + capital gains yield. Both are measured against the price you pay today.',
            };
          }
          return null;
        } },
      { id: 'w3-g-d1', topic: 'returns', level: 2, section: 'B', formula: 'total-return', src: 'Mock MST Q15',
        make(rng) {
          let p0, r, p1, d1;
          for (let k = 0; k < 20; k++) {
            p0 = rng.step(10, 80, 1); r = rng.step(0.06, 0.16, 0.01);
            p1 = r2(p0 * (1 + rng.step(0.01, r - 0.015, 0.005)));
            d1 = p0 * (1 + r) - p1;
            if (Math.abs(d1 - (p1 - p0)) > 0.15 && d1 > 0.25) break; // keep the dividend and the capital gain clearly different
          }
          return {
            q: R`You would pay ${mt(p0)} today for a share you expect to sell for ${mt(p1)} in one year. You require ${aan(T.pctT(r))} ${T.pctT(r)} return. What dividend must you expect at the end of year 1?`,
            givens: [['P_0', ml(p0)], ['P_1', ml(p1)], ['r', L.pctT(r)]],
            answer: d1, unit: '$', dp: 2,
            mistakes: [
              { v: p0 * r, why: 'That is the whole required return in dollars. Part of it comes from the price rise.' },
              { v: d1 / (1 + r), why: 'The dividend arrives at year 1. Do not discount it.' },
              { v: p1 - p0, why: 'That is the capital gain, not the dividend.' },
              { v: p1 * r - (p1 - p0), why: 'The required return is earned on the price you pay today, not on the sale price.' },
            ],
            steps: [
              R`\[P_0 = \frac{D_1 + P_1}{1 + r} \;\Rightarrow\; ${ml(p0)} = \frac{D_1 + ${ml(p1)}}{${L.onePlus(r)}}\]`,
              R`\[D_1 = ${L.num(p0)} \times ${L.onePlus(r)} - ${L.num(p1)} = ${L.num(p0 * (1 + r))} - ${L.num(p1)} = ${L.money(d1)}\]`,
            ],
            ti: [TI.line(`${tn(p0)}*${tn(1 + r)}-${tn(p1)}`, { note: R`What you need at year 1, \(P_0(1+r)\), minus the sale price.` })],
            why: 'The return you need comes from the dividend plus the price rise.',
          };
        } },

      /* ---------- variable growth ---------- */
      { id: 'w3-g-var', topic: 'vargrowth', level: 2, section: 'B', formula: 'share-general', src: 'Lecture W3 Example 8; Tutorial W3 Q7',
        make(rng) {
          const co = rng.company();
          const d0 = rng.step(0.10, 3.00, 0.05), T0 = rng.int(2, 4);
          const g1 = rng.step(0.10, 0.30, 0.01), g2 = rng.step(0.02, 0.06, 0.005), r = cl(g2 + rng.step(0.04, 0.10, 0.005));
          const growth = Array(T0).fill(g1);
          const twist = rng.chance(0.3);
          if (twist) growth[T0 - 1] = cl(g1 - rng.step(0.02, 0.06, 0.01));
          const res = FIN.ddmMulti(d0, growth, g2, r);
          const sumPV = res.pvDivs.reduce((a, b) => a + b, 0);
          const gText = twist
            ? `${T.pctT(g1)} a year for ${yrsW(T0 - 1)}, then ${T.pctT(growth[T0 - 1])} in year ${T0}`
            : `${T.pctT(g1)} a year for ${T0} years`;
          return {
            q: R`${co} has **just paid** a dividend of ${dv(d0)}. Dividends will grow at ${gText}, then at ${T.pctT(g2)} a year forever. The required return is ${T.pctT(r)}. What is the share worth today?`,
            givens: [['D_0', dvl(d0)], ['g_{\\text{long}}', L.pctT(g2)], ['r_E', L.pctT(r)]],
            answer: res.price, unit: '$', dp: 2,
            mistakes: dedupe([
              { v: sumPV + res.PT, why: `The price at year ${T0} must be discounted back ${T0} years.` },
              { v: sumPV + (res.divs[T0 - 1] / (r - g2)) / FIN.fvif(r, T0), why: R`\(P_{${T0}} = \frac{D_{${T0 + 1}}}{r - g}\). Grow \(D_{${T0}}\) by \(g\) first.` },
              { v: sumPV + res.PT / FIN.fvif(r, T0 + 1), why: R`\(P_{${T0}}\) sits at year ${T0}. Discount ${T0} years, not ${T0 + 1}.` },
              { v: (d0 * (1 + g2)) / (r - g2), why: 'That ignores the high-growth years.' },
            ]),
            steps: [
              R`Step 1, the dividends: ${res.divs.map((x, t) => R`\(D_{${t + 1}} = ${n4(x)}\)`).join(', ')}.`,
              R`Step 2, their PVs: \[${res.divs.map((x, t) => R`\frac{${n4(x)}}{(${L.onePlus(r)})^{${t + 1}}}`).join(' + ')} = ${n4(sumPV)}\]`,
              R`Step 3, the price at year ${T0}: \[P_{${T0}} = \frac{D_{${T0 + 1}}}{r - g} = \frac{${n4(res.divs[T0 - 1])} \times ${L.onePlus(g2)}}{${L.dec(r)} - ${L.dec(g2)}} = ${n4(res.PT)}\]`,
              R`Step 4, discount and add: \[P_0 = ${n4(sumPV)} + \frac{${n4(res.PT)}}{(${L.onePlus(r)})^{${T0}}} = ${n4(sumPV)} + ${n4(res.pvPT)} = ${L.money(res.price)}\]`,
            ],
            ti: [
              TI.line(`${tn(res.divs[T0 - 1])}*${tn(1 + g2)}/(${tn(r)}-${tn(g2)})`, { note: R`Step 3: \(P_{${T0}} = \frac{D_{${T0 + 1}}}{r - g}\).` }),
              TI.line(`npv(${tn(P(r))},0,{${res.divs.map((x, t) => tn(x) + (t === T0 - 1 ? '+ans' : '')).join(',')}})`, { note: R`Steps 2 and 4 in one line: the dividends from step 1, with \(P_{${T0}}\) added to year ${T0}.` }),
            ],
            why: 'Four steps: dividends, their PVs, the terminal price, then discount and add.',
          };
        } },
      { id: 'w3-g-varstep', topic: 'vargrowth', level: 3, section: 'B', formula: 'share-general', boss: true, src: 'Tutorial W3 Q8',
        make(rng) {
          const co = rng.company();
          const T0 = rng.int(2, 4), step = rng.pick([0.02, 0.03, 0.04, 0.05]), gL = rng.pick([0.03, 0.04, 0.05, 0.06]);
          const g0 = cl(gL + step * T0);
          const growth = Array.from({ length: T0 }, (_, k) => cl(g0 - step * k));
          const r = cl(gL + rng.step(0.05, 0.12, 0.01));
          const d0 = rng.step(0.20, 2.00, 0.05);
          const res = FIN.ddmMulti(d0, growth, gL, r);
          const sumPV = res.pvDivs.reduce((a, b) => a + b, 0);
          const tomorrow = rng.chance(0.35);
          const price = res.price + (tomorrow ? d0 : 0);
          const extra = tomorrow ? d0 : 0;
          const path = growth.map((x) => T.pctT(x)).join(', ') + `, then ${T.pctT(gL)} forever`;
          return {
            q: tomorrow
              ? R`The latest dividend of ${co}, ${dv(d0)} per share, has **not been paid yet**: it will be paid **tomorrow**. After that, dividend growth will be ${T.pctT(g0)} next year, then fall by ${T.numT(step * 100)} percentage points a year until it reaches ${T.pctT(gL)}, where it stays forever. The market requires ${T.pctT(r)}. What is the share worth today?`
              : R`${co} has **just paid** a dividend of ${dv(d0)} per share. Dividend growth will be ${T.pctT(g0)} next year, then fall by ${T.numT(step * 100)} percentage points a year until it reaches ${T.pctT(gL)}, where it stays forever. The market requires ${T.pctT(r)}. What is the share worth today?`,
            givens: [['D_0', dvl(d0)], ['r_E', L.pctT(r)], ['g_{\\text{long}}', L.pctT(gL)]],
            answer: price, unit: '$', dp: 2,
            mistakes: dedupe(tomorrow ? [
              { v: res.price, why: `The ${dv(d0)} is paid tomorrow to whoever owns the share today, so add it.` },
              { v: res.price + d0 / (1 + r), why: 'The dividend is paid tomorrow. It needs no discounting.' },
              { v: sumPV + res.PT + extra, why: `The price at year ${T0} must be discounted back ${T0} years.` },
            ] : [
              { v: sumPV + res.PT, why: `The price at year ${T0} must be discounted back ${T0} years.` },
              { v: sumPV + (res.divs[T0 - 1] / (r - gL)) / FIN.fvif(r, T0), why: R`\(P_{${T0}} = \frac{D_{${T0 + 1}}}{r - g}\). Grow \(D_{${T0}}\) by \(g\) first.` },
              { v: res.price + d0, why: `The ${dv(d0)} has already been paid. Only add it if it is still to come.` },
            ]),
            steps: [
              R`Growth path: ${path}. Constant growth starts in year ${T0 + 1}.`,
              R`Dividends: ${res.divs.map((x, t) => R`\(D_{${t + 1}} = ${n4(x)}\)`).join(', ')}.`,
              R`\[P_{${T0}} = \frac{D_{${T0 + 1}}}{r - g} = \frac{${n4(res.divs[T0 - 1])} \times ${L.onePlus(gL)}}{${L.dec(r)} - ${L.dec(gL)}} = ${n4(res.PT)}\]`,
              R`\[\text{PV} = ${res.divs.map((x, t) => R`\frac{${n4(x)}}{(${L.onePlus(r)})^{${t + 1}}}`).join(' + ')} + \frac{${n4(res.PT)}}{(${L.onePlus(r)})^{${T0}}} = ${n4(sumPV)} + ${n4(res.pvPT)} = ${n4(res.price)}\]`,
            ].concat(tomorrow ? [R`Add tomorrow’s dividend: \(P_0 = ${n4(res.price)} + ${n4(d0)} = ${L.money(price)}\).`] : [R`\(P_0 = ${L.money(price)}\)`]),
            ti: [
              TI.line(`${tn(res.divs[T0 - 1])}*${tn(1 + gL)}/(${tn(r)}-${tn(gL)})`, { note: R`\(P_{${T0}} = \frac{D_{${T0 + 1}}}{r - g}\).` }),
              TI.line(`npv(${tn(P(r))},0,{${res.divs.map((x, t) => tn(x) + (t === T0 - 1 ? '+ans' : '')).join(',')}})${tomorrow ? '+' + tn(d0) : ''}`, { note: tomorrow ? R`The dividends, with \(P_{${T0}}\) added to year ${T0}. Tomorrow’s ${dv(d0)} is added at the end, without discounting.` : R`The dividends, with \(P_{${T0}}\) added to year ${T0}.` }),
            ],
            why: 'Follow the growth path year by year, find the terminal price where growth becomes constant, then discount everything.',
          };
        } },
      { id: 'w3-g-twostage', topic: 'vargrowth', level: 3, section: 'B', formula: 'pv-grow-annuity', boss: true, src: 'MST 2026 Q18',
        make(rng) {
          const co = rng.company();
          const d0 = rng.step(0.50, 4.00, 0.05), n = rng.int(3, 8);
          const g1 = rng.step(0.04, 0.12, 0.005), g2 = rng.step(0.01, 0.05, 0.005);
          const r = cl(Math.max(g1, g2) + rng.step(0.015, 0.06, 0.005));
          const d1 = d0 * (1 + g1);
          const pvA = FIN.pvGrowAnnuity(d1, r, g1, n);
          const dn = d0 * Math.pow(1 + g1, n), dn1 = dn * (1 + g2), pn = dn1 / (r - g2), pvPn = pn / FIN.fvif(r, n);
          const price = pvA + pvPn;
          return {
            q: R`${co} has **just paid** a dividend of ${dv(d0)}. Dividends will grow at ${T.pctT(g1)} a year for the next ${n} years, then at ${T.pctT(g2)} a year forever. The required return is ${T.pctT(r)}. What is the share worth today?`,
            givens: [['D_0', dvl(d0)], ['g_1', L.pctT(g1)], ['n', String(n)], ['g_2', L.pctT(g2)], ['r_E', L.pctT(r)]],
            answer: price, unit: '$', dp: 2,
            mistakes: dedupe([
              { v: pvA + pn, why: `The price at year ${n} must be discounted back ${n} years.` },
              { v: FIN.pvGrowAnnuity(d0, r, g1, n) + pvPn, why: R`The growing annuity starts with \(D_1 = D_0(1+g_1)\), not \(D_0\).` },
              { v: pvA + (dn / (r - g2)) / FIN.fvif(r, n), why: R`\(P_{${n}} = \frac{D_{${n + 1}}}{r - g_2}\). Grow \(D_{${n}}\) by \(g_2\) first.` },
            ]),
            steps: [
              R`Years 1–${n}: a growing annuity with \(D_1 = ${dvl(d0)} \times ${L.onePlus(g1)} = ${n4(d1)}\): \[PV = \frac{${n4(d1)}}{${L.dec(r)} - ${L.dec(g1)}}\left(1 - \left(\frac{${L.onePlus(g1)}}{${L.onePlus(r)}}\right)^{${n}}\right) = ${n4(pvA)}\]`,
              R`Year ${n + 1} onwards: \(D_{${n + 1}} = D_0(1+g_1)^{${n}}(1+g_2) = ${n4(dn1)}\), so \[P_{${n}} = \frac{D_{${n + 1}}}{r - g_2} = \frac{${n4(dn1)}}{${L.dec(r)} - ${L.dec(g2)}} = ${n4(pn)}\]`,
              R`\[P_0 = ${n4(pvA)} + \frac{${n4(pn)}}{(${L.onePlus(r)})^{${n}}} = ${n4(pvA)} + ${n4(pvPn)} = ${L.money(price)}\]`,
            ],
            ti: [
              TI.line(`${tn(d0)}*${tn(1 + g1)}^${n}*${tn(1 + g2)}/(${tn(r)}-${tn(g2)})`, { note: R`\(P_{${n}} = \frac{D_{${n + 1}}}{r - g_2}\).` }),
              TI.line(`${tn(d1)}/(${tn(r)}-${tn(g1)})*(1-(${tn(1 + g1)}/${tn(1 + r)})^${n})+ans/${tn(1 + r)}^${n}`, { note: R`The growing annuity (years 1 to ${n}) plus \(P_{${n}}\) discounted ${n} years.` }),
            ],
            why: 'Two phases: a growing annuity for the first n years, then a growing perpetuity valued at year n.',
          };
        } },
      { id: 'w3-g-pn', topic: 'vargrowth', level: 2, section: 'B', formula: 'share-general', src: 'MST 2026 Q17',
        make(rng) {
          const d = rng.step(0.50, 6.00, 0.25), n = rng.int(3, 8), r = rng.step(0.06, 0.15, 0.005);
          const pnTrue = rng.step(5, 60, 0.5);
          const p0 = r2(FIN.pvAnnuity(d, r, n) + pnTrue / FIN.fvif(r, n));
          const pn = FIN.tvm.solveFV(n, r, -p0, d);
          const pvD = FIN.pvAnnuity(d, r, n), rest = p0 - pvD;
          return {
            q: R`A share costs ${T.money(p0)} today. It will pay a dividend of ${dv(d)} at the end of each of the next ${n} years. Investors require ${T.pctT(r)} p.a. What price must they expect at the end of year ${n}, just after the last dividend?`,
            givens: [['P_0', L.money(p0)], ['D', dvl(d)], ['n', String(n)], ['r', L.pctT(r)]],
            answer: pn, unit: '$', dp: 2,
            mistakes: dedupe([
              { v: p0 * FIN.fvif(r, n), why: 'That ignores the dividends. They are part of the return too.' },
              { v: p0 * FIN.fvif(r, n) - d * n, why: 'The dividends must be compounded forward (FV of an annuity), not just added up.' },
              { v: rest, why: `That is the PV of the year ${n} price. Compound it forward ${n} years.` },
            ]),
            steps: [
              R`Today’s price \(=\) PV of the dividends \(+\) PV of \(P_{${n}}\): \[${L.num(p0)} = \frac{${dvl(d)}}{${L.dec(r)}}\left(1 - \frac{1}{(${L.onePlus(r)})^{${n}}}\right) + \frac{P_{${n}}}{(${L.onePlus(r)})^{${n}}}\]`,
              R`\[\frac{P_{${n}}}{(${L.onePlus(r)})^{${n}}} = ${L.num(p0)} - ${L.num(pvD, 5)} = ${L.num(rest, 5)}\]`,
              R`\[P_{${n}} = ${L.num(rest, 5)} \times (${L.onePlus(r)})^{${n}} = ${L.money(pn)}\]`,
            ],
            calc: `${n} [N] · ${pk(r)} [I/YR] · −${kn(p0)} [PV] · ${kn(d)} [PMT] · [FV] → ${T.money(pn)}`,
            ti: [TI.solver({ N: n, I: P(r), PV: -p0, Pmt: d, PpY: 1, CpY: 1 }, 'FV', { note: R`You pay the price today (\(PV\) negative) and receive the dividends (\(Pmt\) positive). \(FV\) is the price you need at year ${n}.` })],
            why: 'Treat it like a bond: the dividends are the coupons and the future price plays the face value.',
          };
        } },
    ],
  };

  PACK.generators.forEach((g) => { const make = g.make; g.make = (rng) => tidy(make(rng)); });
  root.registerPack(PACK);
})(typeof window !== 'undefined' ? window : globalThis);
