/* Corporate Ladder — finance maths library (BFC2140).
 * Every generated question and worked solution in the game is computed here,
 * so these functions follow the unit's formula sheet and conventions exactly.
 * Rates are decimals (0.08 = 8%). Works in the browser (window.FIN) and Node (globalThis.FIN).
 */
(function (root) {
  'use strict';

  const pow = Math.pow;

  const FIN = {
    /* ---------- Week 1: lump sums ---------- */
    fv: (pv, r, n) => pv * pow(1 + r, n),
    pv: (fv, r, n) => fv / pow(1 + r, n),
    fvif: (r, n) => pow(1 + r, n),
    pvif: (r, n) => 1 / pow(1 + r, n),
    simpleInterest: (p, r, t) => p * r * t,
    /** periods needed to grow pv into fv at rate r */
    nper: (pv, fv, r) => Math.log(fv / pv) / Math.log(1 + r),
    /** rate needed to grow pv into fv over n periods */
    rate: (pv, fv, n) => pow(fv / pv, 1 / n) - 1,
    rule72: (r) => 72 / (r * 100),
    /** FV with m compounding periods per year for `years` years */
    fvM: (pv, apr, m, years) => pv * pow(1 + apr / m, m * years),
    pvM: (fv, apr, m, years) => fv / pow(1 + apr / m, m * years),
    ear: (apr, m) => pow(1 + apr / m, m) - 1,
    aprFromEar: (ear, m) => m * (pow(1 + ear, 1 / m) - 1),
    earCont: (apr) => Math.exp(apr) - 1,
    fvCont: (pv, r, t) => pv * Math.exp(r * t),
    pvCont: (fv, r, t) => fv / Math.exp(r * t),

    /* ---------- Week 2: streams, annuities, perpetuities ---------- */
    /** PV at t=0 of cash flows cfs[t] at t = 0,1,2,... */
    pvStream: (cfs, r) => cfs.reduce((s, c, t) => s + c / pow(1 + r, t), 0),
    /** FV at t = cfs.length-1 of cash flows at t = 0,1,2,... */
    fvStream: (cfs, r) => { const n = cfs.length - 1; return cfs.reduce((s, c, t) => s + c * pow(1 + r, n - t), 0); },
    pvAnnuity: (c, r, n) => (r === 0 ? c * n : (c / r) * (1 - pow(1 + r, -n))),
    fvAnnuity: (c, r, n) => (r === 0 ? c * n : (c / r) * (pow(1 + r, n) - 1)),
    pvAnnuityDue: (c, r, n) => FIN.pvAnnuity(c, r, n) * (1 + r),
    fvAnnuityDue: (c, r, n) => FIN.fvAnnuity(c, r, n) * (1 + r),
    pvifa: (r, n) => (r === 0 ? n : (1 - pow(1 + r, -n)) / r),
    fvifa: (r, n) => (r === 0 ? n : (pow(1 + r, n) - 1) / r),
    pvPerp: (c, r) => c / r,
    pvGrowPerp: (c1, r, g) => c1 / (r - g),
    pvGrowAnnuity: (c1, r, g, n) => (Math.abs(r - g) < 1e-12 ? (c1 * n) / (1 + r) : (c1 / (r - g)) * (1 - pow((1 + g) / (1 + r), n))),
    /** level payment that repays pv over n periods (ordinary annuity) */
    pmt: (pv, r, n) => (r === 0 ? pv / n : (pv * r) / (1 - pow(1 + r, -n))),
    /** level deposit (ordinary annuity) that accumulates to fv after n periods */
    pmtForFV: (fv, r, n) => (r === 0 ? fv / n : (fv * r) / (pow(1 + r, n) - 1)),
    /** outstanding balance of a loan of pv after k of n payments */
    loanBalance: (pv, r, n, k) => FIN.pvAnnuity(FIN.pmt(pv, r, n), r, n - k),
    /** amortisation schedule rows */
    amortise(pv, r, n) {
      const pay = FIN.pmt(pv, r, n);
      const rows = [];
      let bal = pv;
      for (let t = 1; t <= n; t++) {
        const interest = bal * r;
        const principal = pay - interest;
        const end = bal - principal;
        rows.push({ t, begin: bal, payment: pay, interest, principal, end: Math.abs(end) < 1e-7 ? 0 : end });
        bal = end;
      }
      return rows;
    },
    /** interpolation step from the lecture: lambda = A1/(A1 - A2); r = r1 + lambda (r2 - r1) */
    interpolate: (r1, a1, r2, a2) => { const lam = a1 / (a1 - a2); return { lambda: lam, r: r1 + lam * (r2 - r1) }; },

    /* ---------- General TVM solver (HP10bII+ sign convention) ----------
     * PV + PMT*(1+i*type)*PVIFA(i,N) + FV*(1+i)^-N = 0, i = I/YR / P/YR / 100 */
    tvm: {
      _f(n, i, pv, pmt, fv, type) {
        if (Math.abs(i) < 1e-12) return pv + pmt * n + fv;
        const d = pow(1 + i, -n);
        return pv + pmt * (1 + i * type) * ((1 - d) / i) + fv * d;
      },
      solvePV(n, i, pmt, fv, type = 0) { return -(FIN.tvm._f(n, i, 0, pmt, fv, type)); },
      solveFV(n, i, pv, pmt, type = 0) {
        if (Math.abs(i) < 1e-12) return -(pv + pmt * n);
        const g = pow(1 + i, n);
        return -(pv * g + pmt * (1 + i * type) * ((g - 1) / i));
      },
      solvePMT(n, i, pv, fv, type = 0) {
        if (Math.abs(i) < 1e-12) return -(pv + fv) / n;
        const d = pow(1 + i, -n);
        return -(pv + fv * d) / ((1 + i * type) * ((1 - d) / i));
      },
      solveN(i, pv, pmt, fv, type = 0) {
        if (Math.abs(i) < 1e-12) return pmt === 0 ? NaN : -(pv + fv) / pmt;
        const a = pmt * (1 + i * type) / i;
        const num = a - fv;
        const den = a + pv;
        if (num / den <= 0) return NaN;
        return Math.log(num / den) / Math.log(1 + i);
      },
      solveI(n, pv, pmt, fv, type = 0) {
        const f = (i) => FIN.tvm._f(n, i, pv, pmt, fv, type);
        return FIN._root(f, -0.99, 10, 0.1);
      },
    },

    /* ---------- Week 3: bonds & shares ---------- */
    /** price of a coupon bond; couponRate annual, ytm annual nominal, m payments per year */
    bondPrice(face, couponRate, ytm, years, m = 1) {
      const c = (face * couponRate) / m;
      const i = ytm / m;
      const n = Math.round(years * m);
      return FIN.pvAnnuity(c, i, n) + face / pow(1 + i, n);
    },
    zeroPrice: (face, ytm, years, m = 1) => face / pow(1 + ytm / m, Math.round(years * m)),
    /** per-period yield that equates price to PV of coupons + face (n periods) */
    bondYieldPeriodic(price, face, couponPerPeriod, n) {
      const f = (i) => FIN.pvAnnuity(couponPerPeriod, i, n) + face / pow(1 + i, n) - price;
      return FIN._root(f, -0.5, 2, 0.05);
    },
    ddmZero: (d, r) => d / r,
    ddmConst: (d1, r, g) => d1 / (r - g),
    /** multi-stage DDM: d0 just paid, growth = array of growth rates for years 1..T, then gLong forever */
    ddmMulti(d0, growth, gLong, r) {
      const divs = [];
      let d = d0;
      growth.forEach((g) => { d = d * (1 + g); divs.push(d); });
      const T = growth.length;
      const dNext = divs[T - 1] * (1 + gLong);
      const PT = dNext / (r - gLong);
      const pvDivs = divs.map((x, k) => x / pow(1 + r, k + 1));
      const pvPT = PT / pow(1 + r, T);
      const price = pvDivs.reduce((a, b) => a + b, 0) + pvPT;
      return { divs, dNext, PT, pvDivs, pvPT, price, T };
    },

    /* ---------- Week 4: capital budgeting ---------- */
    npv: (r, cfs) => cfs.reduce((s, c, t) => s + c / pow(1 + r, t), 0),
    /** all IRRs found on [-0.9, 5] (sorted) */
    irrAll(cfs) {
      const f = (r) => FIN.npv(r, cfs);
      const roots = [];
      let prevR = -0.9, prevF = f(prevR);
      for (let r = -0.9 + 0.0025; r <= 5.0000001; r += 0.0025) {
        const fr = f(r);
        if (prevF === 0) roots.push(prevR);
        else if (prevF * fr < 0) roots.push(FIN._bisect(f, prevR, r));
        prevR = r; prevF = fr;
      }
      return roots.filter((x, k) => k === 0 || Math.abs(x - roots[k - 1]) > 1e-6);
    },
    irr(cfs) { const all = FIN.irrAll(cfs); return all.length ? all[0] : NaN; },
    signChanges(cfs) {
      const s = cfs.filter((c) => c !== 0).map(Math.sign);
      let k = 0;
      for (let i = 1; i < s.length; i++) if (s[i] !== s[i - 1]) k++;
      return k;
    },
    /** simple payback period (years, fractional) or Infinity */
    payback(cfs) {
      let cum = cfs[0];
      if (cum >= 0) return 0;
      for (let t = 1; t < cfs.length; t++) {
        const prev = cum;
        cum += cfs[t];
        if (cum >= 0) return t - 1 + -prev / cfs[t];
      }
      return Infinity;
    },
    /** profitability index as defined in BFC2140: NPV / resource consumed (initial investment) */
    pi: (npv, investment) => npv / investment,
    /** equivalent annual cash flow (EAC / EAA) */
    eac: (npv, r, n) => (npv * r) / (1 - pow(1 + r, -n)),
    /** replacement chain: NPV of repeating a project `times` times back-to-back (life n each) */
    chainNPV: (npv, r, n, times) => { let s = 0; for (let k = 0; k < times; k++) s += npv / pow(1 + r, k * n); return s; },
    /** perpetual replacement NPV from the formula sheet */
    npvInfinity: (npv, r, n) => (npv * pow(1 + r, n)) / (pow(1 + r, n) - 1),
    crossover(cfsA, cfsB) { return FIN.irr(cfsA.map((c, t) => c - (cfsB[t] || 0))); },

    /* ---------- Week 5: cash flows ---------- */
    /** operating cash flow: (Rev - Costs - Dep)(1 - tc) + Dep */
    ocf: (rev, cost, dep, tc) => (rev - cost - dep) * (1 - tc) + dep,
    /** FCF = (Rev - Costs - Dep)(1 - tc) + Dep - CapEx - change in NWC */
    fcf: (rev, cost, dep, tc, capex = 0, dNWC = 0) => (rev - cost - dep) * (1 - tc) + dep - capex - dNWC,
    depTaxShield: (dep, tc) => dep * tc,
    slDep: (cost, salvageForDep, life) => (cost - salvageForDep) / life,
    afterTaxSalvage: (sv, bv, tc) => sv - (sv - bv) * tc,
    fisherReal: (nominal, inflation) => (1 + nominal) / (1 + inflation) - 1,
    fisherNominal: (real, inflation) => (1 + real) * (1 + inflation) - 1,

    /* ---------- Week 7: uncertainty ---------- */
    /** accounting (EBIT) break-even units */
    breakEvenUnits: (fixed, dep, price, vcu) => (fixed + dep) / (price - vcu),
    expected: (probs, values) => probs.reduce((s, p, k) => s + p * values[k], 0),

    /* ---------- Week 8: working capital ---------- */
    invDays: (inv, cogs, year = 365) => inv / (cogs / year),
    arDays: (ar, sales, year = 365) => ar / (sales / year),
    apDays: (ap, cogs, year = 365) => ap / (cogs / year),
    ccc: (invD, arD, apD) => invD + arD - apD,
    /** EAR cost of forgoing a d% discount: terms d/discDays net netDays */
    tradeCreditEAR: (d, discDays, netDays, year = 365) => pow(1 + d / (1 - d), year / (netDays - discDays)) - 1,

    /* ---------- Week 9: risk & return ---------- */
    holdingReturn: (p0, p1, div = 0) => (div + p1 - p0) / p0,
    hprMulti: (rets) => rets.reduce((a, x) => a * (1 + x), 1) - 1,
    annualise: (hpr, years) => pow(1 + hpr, 1 / years) - 1,
    mean: (xs) => xs.reduce((a, b) => a + b, 0) / xs.length,
    varS(xs) { const m = FIN.mean(xs); return xs.reduce((a, x) => a + (x - m) * (x - m), 0) / (xs.length - 1); },
    sdS: (xs) => Math.sqrt(FIN.varS(xs)),
    varP(xs) { const m = FIN.mean(xs); return xs.reduce((a, x) => a + (x - m) * (x - m), 0) / xs.length; },
    covS(xs, ys) { const mx = FIN.mean(xs), my = FIN.mean(ys); return xs.reduce((a, x, k) => a + (x - mx) * (ys[k] - my), 0) / (xs.length - 1); },
    corrS: (xs, ys) => FIN.covS(xs, ys) / (FIN.sdS(xs) * FIN.sdS(ys)),
    expRet: (probs, rets) => probs.reduce((s, p, k) => s + p * rets[k], 0),
    varProb(probs, rets) { const m = FIN.expRet(probs, rets); return probs.reduce((s, p, k) => s + p * (rets[k] - m) * (rets[k] - m), 0); },
    sdProb: (probs, rets) => Math.sqrt(FIN.varProb(probs, rets)),
    covProb(probs, xs, ys) { const mx = FIN.expRet(probs, xs), my = FIN.expRet(probs, ys); return probs.reduce((s, p, k) => s + p * (xs[k] - mx) * (ys[k] - my), 0); },
    corrProb: (probs, xs, ys) => FIN.covProb(probs, xs, ys) / (FIN.sdProb(probs, xs) * FIN.sdProb(probs, ys)),
    cv: (sd, er) => sd / er,
    portRet: (ws, rets) => ws.reduce((s, w, k) => s + w * rets[k], 0),
    portVar2: (w1, s1, w2, s2, rho) => w1 * w1 * s1 * s1 + w2 * w2 * s2 * s2 + 2 * w1 * w2 * rho * s1 * s2,
    portSD2: (w1, s1, w2, s2, rho) => Math.sqrt(FIN.portVar2(w1, s1, w2, s2, rho)),
    beta: (covIM, varM) => covIM / varM,
    capm: (rf, beta, rm) => rf + beta * (rm - rf),
    portBeta: (ws, betas) => ws.reduce((s, w, k) => s + w * betas[k], 0),
    sharpe: (er, rf, sd) => (er - rf) / sd,

    /* ---------- Weeks 10-11 (formula sheet): cost of capital & capital structure ---------- */
    costPref: (div, price) => div / price,
    wacc({ E = 0, P = 0, D = 0, re = 0, rp = 0, rd = 0, tc = 0 }) {
      const V = E + P + D;
      return re * (E / V) + rp * (P / V) + rd * (1 - tc) * (D / V);
    },
    rUnlevered: (rE, rD, E, D) => rE * (E / (E + D)) + rD * (D / (E + D)),
    rELevNoTax: (rU, rD, D, E) => rU + (D / E) * (rU - rD),
    rELevTax: (rU, rD, D, E, tc) => rU + (D / E) * (rU - rD) * (1 - tc),
    interestTaxShield: (interest, tc) => interest * tc,
    pvTaxShieldPerm: (D, tc) => tc * D,

    /* ---------- numerics ---------- */
    _bisect(f, lo, hi, tol = 1e-12) {
      let flo = f(lo);
      for (let k = 0; k < 200; k++) {
        const mid = (lo + hi) / 2;
        const fm = f(mid);
        if (fm === 0 || (hi - lo) / 2 < tol) return mid;
        if (flo * fm < 0) hi = mid; else { lo = mid; flo = fm; }
      }
      return (lo + hi) / 2;
    },
    /** root of f in [lo, hi]: scan for a sign change nearest `guess`, then bisect */
    _root(f, lo, hi, guess = 0.1) {
      const steps = 4000;
      const h = (hi - lo) / steps;
      const brackets = [];
      let a = lo, fa = f(a);
      for (let k = 1; k <= steps; k++) {
        const b = lo + k * h;
        const fb = f(b);
        if (Number.isFinite(fa) && Number.isFinite(fb)) {
          if (fa === 0) brackets.push([a, a]);
          else if (fa * fb < 0) brackets.push([a, b]);
        }
        a = b; fa = fb;
      }
      if (!brackets.length) return NaN;
      brackets.sort((p, q) => Math.abs((p[0] + p[1]) / 2 - guess) - Math.abs((q[0] + q[1]) / 2 - guess));
      const [x0, x1] = brackets[0];
      return x0 === x1 ? x0 : FIN._bisect(f, x0, x1);
    },
    round: (x, dp = 2) => { const k = pow(10, dp); return Math.round((x + (x >= 0 ? 1e-12 : -1e-12)) * k) / k; },
  };

  root.FIN = FIN;
})(typeof window !== 'undefined' ? window : globalThis);
