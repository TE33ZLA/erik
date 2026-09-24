/* Checks the finance library against worked answers from the BFC2140 lectures,
 * tutorials, mock MST and MST solutions. Run: node tests/fin.test.js */
'use strict';
require('../js/lib/fin.js');
require('../js/lib/fmt.js');
const { FIN, L, T } = globalThis;

let pass = 0, fail = 0;
function near(name, got, want, tol) {
  const t = tol === undefined ? Math.max(0.006, Math.abs(want) * 1e-5) : tol;
  if (Math.abs(got - want) <= t) { pass++; }
  else { fail++; console.log(`FAIL ${name}: got ${got}, want ${want} (tol ${t})`); }
}
function eq(name, got, want) {
  if (got === want) pass++; else { fail++; console.log(`FAIL ${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); }
}

/* ---- Week 1 ---- */
near('W1 Ex2 FV', FIN.fv(1000, 0.06, 5), 1338.23);
near('W1 Ex3 PV', FIN.pv(20000, 0.07, 5), 14259.72);
near('W1 Ex1 simple', 50000 + FIN.simpleInterest(50000, 0.07, 90 / 365), 50863.01);
near('W1 Ex4 n', FIN.nper(5000, 10000, 0.10), 7.27, 0.005);
near('W1 Ex5 r', FIN.rate(5000, 100000, 20), 0.1616, 0.00005);
near('W1 semi FV', FIN.fvM(50, 0.12, 2, 3), 70.93);
near('W1 Ex6 FV qtr', FIN.fvM(200, 0.12, 4, 2), 253.35);
near('W1 Ex7 EAR daily', FIN.ear(0.0595, 365), 0.0613, 0.00005);
near('W1 T4 EAR monthly', FIN.ear(0.08, 12), 0.0829995, 1e-6);
near('W1 Ex8 FV cont', FIN.fvCont(1000, 0.10, 5), 1648.72);
near('W1 Ex9 PV cont', FIN.pvCont(1000, 0.10, 5), 606.53);
near('W1 T1 i', FIN.fv(2250, 0.12, 30), 67409.82, 0.01);
near('W1 T1 ii', FIN.fv(9310, 0.09, 16), 36963.55, 0.01);
near('W1 T1 iii', FIN.pv(14451, 0.04, 5), 11877.67, 0.01);
near('W1 T1 iv', FIN.pv(550164, 0.20, 15), 35708.65, 0.01);
near('W1 T1 v', FIN.rate(265, 307, 3) * 100, 5.03, 0.005);
near('W1 T1 vi', FIN.rate(360, 761, 9) * 100, 8.67, 0.005);
near('W1 T2 double', FIN.nper(1, 2, 0.06), 11.90, 0.005);
near('W1 T2 quad', FIN.nper(1, 4, 0.06), 23.79, 0.005);
near('W1 T3 A', FIN.pv(10000, 0.08, 5), 6805.83);
near('W1 T3 B', FIN.rate(7500, 10000, 4) * 100, 7.46, 0.005);
near('W1 T5', FIN.fvM(200000, 0.06, 2, 10), 361222.25, 0.01);
near('W1 T6 APRq', FIN.aprFromEar(FIN.ear(0.04, 2), 4), 0.039802, 1e-6);
near('W1 T6 FV', 5000 * (1 + FIN.aprFromEar(FIN.ear(0.04, 2), 4) / 4), 5049.75);
near('MST Q11 EAR', FIN.ear(0.12, 12), 0.1268, 0.00005);

/* ---- Week 2 ---- */
near('W2 Ex1 FV mixed', FIN.fvStream([1000, 1500, 2000, 2500], 0.10), 7846);
near('W2 Ex2 PV mixed', FIN.pvStream([0, 1500, 2000, 2500], 0.10), 4894.82);
near('W2 Ex3 perp', FIN.pvPerp(3, 0.10), 30);
near('W2 Ex4b', FIN.pvPerp(500, 0.08) / 1.08, 5787.04);
near('W2 Ex4c', FIN.pvPerp(2420, 0.08) / Math.pow(1.08, 2), 25934.50);
near('W2 Ex5 PVA', FIN.pvAnnuity(100, 0.10, 3), 248.69);
near('W2 Ex6 FVA', FIN.fvAnnuity(2.3e6, 0.10, 6), 17745903.00, 0.5);
near('W2 Ex7 PVA due', FIN.pvAnnuityDue(1000, 0.005, 7), 6896.38);
near('W2 Ex8 asset1', FIN.pvAnnuityDue(200, 0.05, 5), 909.19);
near('W2 Ex8 eq annuity', 666.6666667 / (FIN.pvifa(0.05, 5) * 1.05), 146.65);
near('W2 Ex9 grow ann', FIN.pvGrowAnnuity(675000, 0.18, 0.13, 15), 6448519.47, 0.05);
near('W2 Ex10 grow perp', FIN.pvGrowPerp(3, 0.10, 0.02), 37.5);
near('W2 Ex11 loan', FIN.pmt(5000, 0.09, 5), 1285.46);
{
  const rows = FIN.amortise(5000, 0.09, 5);
  near('W2 amort int1', rows[0].interest, 450);
  near('W2 amort prin1', rows[0].principal, 835.46);
  near('W2 amort end1', rows[0].end, 4164.54);
  near('W2 amort int5', rows[4].interest, 106.14); // slide shows 106.12 as a rounding plug (1,285.46 - 1,179.34)
}
near('W2 Ex12 at 10%', FIN.pvAnnuity(100, 0.10, 5), 379.08);
near('W2 Ex12 at 13%', FIN.pvAnnuity(100, 0.13, 5), 351.72);
near('W2 Ex12 at 14%', FIN.pvAnnuity(100, 0.14, 5), 343.31);
{
  const ip = FIN.interpolate(0.13, 351.72 - 350, 0.14, 343.31 - 350);
  near('W2 Ex12 lambda', ip.lambda, 0.2045, 0.0001);
  near('W2 Ex12 interp r', ip.r, 0.1320, 0.00005);
  near('W2 Ex12 exact r', FIN.tvm.solveI(5, -350, 100, 0), 0.1320, 0.00005);
}
near('W2 Excel FV due', FIN.tvm.solveFV(12, 0.005, -1000, -100, 1), 2301.40);
near('W2 Excel RATE', FIN.tvm.solveI(48, 8000, -200, 0) * 1200, 9.24, 0.005);
near('W2 Excel PMT', -FIN.tvm.solvePMT(18 * 12, 0.005, 0, 50000), 129.08);
near('W2 Excel NPER', FIN.tvm.solveN(0.005, -20000, -100, 30000), 44.74, 0.005);
near('W2 T1a', FIN.pmt(400000, 0.07 / 12, 360), 2661.21);
near('W2 T1b', FIN.loanBalance(400000, 0.07 / 12, 360, 60), 376526.36, 0.05);
near('W2 T1c', FIN.pmt(376526.36, 0.075 / 12, 300), 2782.50);
near('W2 T1d', FIN.tvm.solveN(0.075 / 12, -376526.36, 2661.21, 0), 346.1485, 0.0005);
near('W2 T2a', FIN.pmtForFV(10000, 0.08, 5), 1704.56);
near('W2 T2b', FIN.fv(7500, 0.08, 4), 10203.67);
near('W2 T2c', FIN.tvm.solveI(5, 0, -1860, 10000) * 100, 3.63, 0.005);
near('W2 T2d', FIN.tvm.solvePMT(10, 0.04, -4000, 10000), -339.75);
near('W2 T3 deferred', FIN.pvAnnuity(200, 0.09, 4) / 1.09, 594.44);
{
  const pv15 = FIN.pvStream([21000, 21000, 42000, 42000, 21000, 21000], 0.15);
  near('W2 T5 PV15', pv15, 121082.12, 0.02);
  near('W2 T5 PMT', FIN.pmtForFV(pv15, 0.15, 15), 2544.79);
}
near('MST Q12', FIN.pvAnnuity(30000, 0.06, 8) - (80000 + 40000 / 1.06), 68557.97, 0.02);
near('MST Q13', 180000 * 0.0075, 1350);
near('MST Q14 pmt', FIN.pmt(250000, 0.006, 360), 1696.97);
near('MST Q14 bal', FIN.loanBalance(250000, 0.006, 360, 48), 239080.94, 0.1);
near('MST Q15', FIN.fvAnnuity(200, 0.0045, 180), 55281.21);
near('Mock Q03', FIN.pvStream([7000, 5000, 4000, 3000], 0.04), 18172.91);
near('Mock Q04', FIN.pvStream([0, 0, 6000, 6000, 6000, 6000], 0.10), 17290.02);
near('Mock Q13 pmt', FIN.pmt(550000, 0.035 / 12, 360), 2469.75);
near('Mock Q13 bal', FIN.loanBalance(550000, 0.035 / 12, 360, 36), 517195.67, 1.2);
near('Mock Q13 new', FIN.pmt(517196.67, 0.03 / 12, 324), 2331.01);

/* ---- Week 3 ---- */
near('W3 Ex1 zero', FIN.zeroPrice(1000, 0.06, 30), 174.11);
near('W3 Ex2 par', FIN.bondPrice(1000, 0.05, 0.05, 10), 1000);
near('W3 Ex3 disc', FIN.bondPrice(1000, 0.05, 0.06, 10), 926.40);
near('W3 Ex4 prem', FIN.bondPrice(1000, 0.05, 0.04, 10), 1081.11);
near('W3 Ex5 semi', FIN.bondPrice(1000, 0.06, 0.10, 10, 2), 750.76);
near('W3 EAY', FIN.ear(0.10, 2), 0.1025, 1e-9);
near('W3 T1', FIN.bondPrice(1000, 0.08, 0.07, 12), 1079.43);
near('W3 T2', FIN.bondPrice(1000, 0.08, 0.10, 12, 2), 862.01);
near('W3 T6b', FIN.bondPrice(1000, 0.12, 0.10, 25, 2), 1182.56);
{
  const y = FIN.bondYieldPeriodic(896.64, 1000, 60, 19);
  near('W3 T6c semi', y, 0.07, 0.00005);
  near('W3 T6c EAY', Math.pow(1 + y, 2) - 1, 0.1449, 0.00005);
}
near('W3 Ex6 pref', FIN.ddmZero(3, 0.15), 20);
near('W3 Ex7 DDM', FIN.ddmConst(0.15 * 1.05, 0.10, 0.05), 3.15);
near('W3 T4', FIN.ddmZero(3, 0.08), 37.5);
near('W3 T5 P0', FIN.ddmConst(0.2 * 1.08, 0.16, 0.08), 2.70);
near('W3 T5 P5', FIN.ddmConst(0.2 * Math.pow(1.08, 6), 0.16, 0.08), 3.97);
near('W3 Ex8 variable', FIN.ddmMulti(0.15, [0.2, 0.2, 0.2], 0.05, 0.10).price, 4.63);
near('W3 T8', FIN.ddmMulti(0.85, [0.25, 0.20, 0.15, 0.10], 0.05, 0.16).price, 12.20);
{
  const g = FIN.ddmMulti(0.115, [0.18, 0.18, 0.15], 0.06, 0.12);
  near('W3 T7 D4', g.dNext, 0.1952, 0.0001);
  console.log('   (info) Tutorial 3 Q7 Networks price =', g.price.toFixed(4));
}
near('MST Q16', FIN.bondPrice(1000, 0.09, 0.07, 10, 2), 1142.12);
near('MST Q17', FIN.tvm.solveFV(6, 0.12, -25.56, 5), 9.87);
near('MST Q18', FIN.pvGrowAnnuity(2 * 1.065, 0.09, 0.065, 6) + (2 * Math.pow(1.065, 6) * 1.035 / (0.09 - 0.035)) / Math.pow(1.09, 6), 43.82);
{
  const y = FIN.bondYieldPeriodic(980, 1054.36, 50, 20);
  near('Mock Q01 semi', y, 0.0532377, 0.000001);
  near('Mock Q01 EAY', Math.pow(1 + y, 2) - 1, 0.1093, 0.00005);
}
near('Mock Q02', FIN.bondPrice(1000, 0.05, 0.06, 5, 2), 957.35);
near('Mock Q10', FIN.bondPrice(1000, 0.058, 0.075, 30), 799.22);
{
  const cfs = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 1550];
  near('Mock Q12', FIN.npv(0.075, cfs), 585.45);
}
near('Mock Q14', FIN.ddmConst(2.40, 0.10, 0.03), 34.29);
near('Mock Q15', 30 * (0.12 - (32 - 30) / 30), 1.60);
near('Mock Q16', FIN.ddmConst(2 * 1.06, 0.16, 0.06), 21.20);
near('Mock Q17', FIN.ddmConst(2 * 1.06 * 1.06, 0.16, 0.06), 22.47, 0.01);
near('Mock Q29', FIN.bondPrice(1000, 0.10, 0, 8), 1800);
{
  const y = FIN.bondYieldPeriodic(896.64, 1000, 50, 16);
  near('Mock Q30 EAY', Math.pow(1 + y, 2) - 1, 0.1241, 0.00005);
}

/* ---- Week 4 ---- */
const Lp = [-100, 10, 60, 80], Sp = [-100, 70, 50, 20];
near('W4 NPV L', FIN.npv(0.10, Lp), 18.78);
near('W4 NPV S', FIN.npv(0.10, Sp), 19.98);
near('W4 IRR L', FIN.irr(Lp), 0.1813, 0.00005);
near('W4 IRR S', FIN.irr(Sp), 0.2356, 0.00005);
near('W4 PB L', FIN.payback(Lp), 2.375);
near('W4 PB S', FIN.payback(Sp), 1.6);
near('W4 crossover', FIN.crossover(Lp, Sp), 0.0868, 0.00005);
near('W4 profile L 5%', FIN.npv(0.05, Lp), 33.05);
near('W4 profile S 20%', FIN.npv(0.20, Sp), 4.63);
{
  const X = -4000 - FIN.pvAnnuity(100, 0.10, 10), Y = -1000 - FIN.pvAnnuity(500, 0.10, 5);
  near('W4 cleaner X', X, -4614.46);
  near('W4 cleaner Y', Y, -2895.39);
  near('W4 EAC X', FIN.eac(X, 0.10, 10), -750.98);
  near('W4 EAC Y', FIN.eac(Y, 0.10, 5), -763.80);
  near('W4 chain Y', FIN.chainNPV(Y, 0.10, 5, 2), -4693.20);
}
{
  const a = FIN.pvifa(0.10, 3);
  near('W4 PI Sydney', FIN.pi(220000 * a - 500000, 500000), 0.094, 0.0005);
  near('W4 PI Perth', FIN.pi(100000 * a - 250000, 250000), -0.005, 0.0005);
  near('W4 PI Hobart', FIN.pi(60000 * a - 125000, 125000), 0.194, 0.0005);
}
near('W4 GF yr8', 22000 / 1.1 + 14000 / 1.21, 31570.25);
near('W4 T1 PB A', FIN.payback([-15000, 7000, 7000, 7000, 7000, 7000]), 2.14, 0.005);
near('W4 T1 PB B', FIN.payback([-18000, 12000, 2000, 2000, 2000, 2000]), 4.0);
near('W4 T2', -190000 + FIN.pvPerp(30000, 0.15), 10000);
{
  const cf = [-20e6, 1.5e6, 3.278e6, 5e6, 6.45e6].concat(Array(16).fill(2.5e6));
  near('W4 T3 NPV23', FIN.npv(0.23, cf), -6533019.28, 0.05);
  near('W4 T3 NPV10', FIN.npv(0.10, cf), 5593983.75, 0.05);
  near('W4 T3 IRR', FIN.irr(cf), 0.1429, 0.00005);
}
{
  const n = (c0, c) => -c0 + FIN.pvAnnuity(c, 0.08, 4);
  near('W4 T4 A', n(35e6, 14e6), 11369775.76, 0.05);
  near('W4 T4 D PI', FIN.pi(n(20e6, 10.5e6), 20e6), 0.738866591, 1e-8);
}
{
  const s = FIN.npv(0.10, [-100000, 60000, 60000]), l = FIN.npv(0.10, [-100000, 33500, 33500, 33500, 33500]);
  near('W4 T5 S', s, 4132.23);
  near('W4 T5 L', l, 6190.49);
  near('W4 T5 EAA S', FIN.eac(s, 0.10, 2), 2380.95);
  near('W4 T5 EAA L', FIN.eac(l, 0.10, 4), 1952.92);
  near('W4 T5 chain S', FIN.chainNPV(s, 0.10, 2, 2), 7547.30, 0.1);
}
{
  const p1 = [-300000, -387000, -193000, 100000, 600000, 1270000], p2 = [-599000, 234000, 234000, 234000, 234000, 234000];
  near('W4 T6 IRR1', FIN.irr(p1), 0.2408, 0.00005);
  near('W4 T6 IRR2', FIN.irr(p2), 0.2745, 0.00005);
  near('W4 T6 NPV1', FIN.npv(0.10, p1), 462187.32, 0.05);
  near('W4 T6 NPV2', FIN.npv(0.10, p2), 288044.10, 0.05);
  near('W4 T6 cross', FIN.crossover(p1, p2), 0.2002, 0.00005);
}
near('W4 T7 Chloe', 11 - 8 / 1.1 + FIN.pvGrowPerp(5, 0.10, -0.40), 13.72727, 0.00001);
near('MST Q19', FIN.npv(0.08, [-2e6, 550000, 550000, 550000, 550000, 550000]), 195990.52, 0.05);
near('MST Q20', FIN.irr([0, 400, -500]), 0.25, 1e-6);
near('Mock Q06', FIN.payback([-1450000, 640000, 715250, 823330, 907125]), 2.12, 0.005);
near('Mock Q08 X', FIN.npv(0.05, [-45, 20, 25, 30, 35]), 51.43);
near('Mock Q08 Y', FIN.npv(0.05, [-90, 20, 30, 60, 80]), 73.90);
near('Mock Q09 X', FIN.irr([-45, 20, 25, 30, 35]), 0.4278, 0.00005);
near('Mock Q09 Y', FIN.irr([-90, 20, 30, 60, 80]), 0.2919, 0.00005);
near('Mock Q18', FIN.pvAnnuity(25000, 0.09, 4), 80992.99, 0.01);
eq('sign changes', FIN.signChanges([-1, 1, 1, -1, 1]), 3);
{
  const OR = -200000 - FIN.pvAnnuity(4000, 0.11, 7), SS = -100000 - FIN.pvAnnuity(2000, 0.11, 4);
  near('Utopia OR EAA', FIN.eac(OR, 0.11, 7), -46443, 1);
  near('Utopia SS EAA', FIN.eac(SS, 0.11, 4), -34233, 1);
  near('HassleFree EAA', FIN.eac(-15000 - FIN.pvAnnuity(2000, 0.10, 3), 0.10, 3), -8032, 1);
}

/* ---- Week 5 ---- */
near('W5 Ex4 OCF', FIN.ocf(9000, 4000, 3000, 0.30), 4400);
near('W5 Ex4 method2', (9000 - 4000) * 0.7 + 3000 * 0.3, 4400);
{
  const init = -55000 + FIN.afterTaxSalvage(15000, 10000, 0.47) - 5000;
  near('W5 Nutson init', init, -47350);
  const ocf = FIN.ocf(0, -(17000 + 4000), 11000 - 2000, 0.47);
  near('W5 Nutson OCF', ocf, 15360);
  const term = ocf + 5000 + FIN.afterTaxSalvage(10000, 0, 0.47);
  near('W5 Nutson terminal', term, 25660);
  const cfs = [init, ocf, ocf, ocf, ocf, term];
  near('W5 Nutson NPV', FIN.npv(0.20, cfs), 2725.14);
  near('W5 Nutson IRR', FIN.irr(cfs), 0.2241, 0.00005);
}
{
  const f = FIN.ocf(25500, 8000, 3000, 0.30);
  near('W5 Springvale FCF', f, 13150);
  const cfs = [-60000].concat(Array(20).fill(f));
  near('W5 Springvale NPV', FIN.npv(0.15, cfs), 22310.21);
  near('W5 Springvale IRR', FIN.irr(cfs), 0.2147, 0.00005);
}
near('W5 IFC NPV', FIN.npv(0.12, [-522500, 104000, 104000, 104000, 104000, 246500]), -66744.95, 0.02);
near('W5 Fisher', FIN.fisherReal(0.14, 0.05), 0.085714, 1e-6);
near('W5 Ex2 NPV', FIN.npv(0.14, [-1000, 600, 650]), 26.47);
near('W5 Ex3 real', -10000 + FIN.pvAnnuity(5000, FIN.fisherReal(0.15, 0.10), 3), 3733.05);
near('W5 Planet dep', FIN.slDep(10.05e6, 0, 5), 2.01e6);
near('W5 Planet earnings', (4e6 - 1.2e6 - 2.01e6) * 0.7, 553000);
near('Mock Q19', 10000 + 2000 + FIN.afterTaxSalvage(1000, 0, 0.40), 12600);
{
  const f = FIN.ocf(30000, 18000 + 1000, 2500, 0.35);
  near('W5 case FCF', f, 8025);
  const cfs = [-35000].concat(Array(9).fill(f), [f + 10000]);
  near('W5 case NPV', FIN.npv(0.14, cfs), 9556.77, 0.01);
}

/* ---- Week 7 ---- */
near('W7 ELEC', -500000 + (0.33 * FIN.pvPerp(150000, 0.12)) / 1.12, -131696.43);
near('W7 sens base', ((80 - 60) * 6000) / 0.10 - 500000, 700000);
near('W7 scen worst', ((75 - 62) * 5500) / 0.12 - 500000, 95833.33);
near('W7 scen best', ((85 - 58) * 6500) / 0.08 - 500000, 1693750);
{
  const a5 = FIN.pvifa(0.10, 5), a3 = FIN.pvifa(0.10, 3);
  near('W7 chip upgrade', -3 + 0.9 * a5, 0.4117, 0.0001);
  near('W7 chip no upg', 0.52 * a5, 1.971, 0.001);
  const B = -3 + 0.7 * ((0.52 * a5) / 1.331 + 0.6 * a3) + 0.3 * ((0.36 * a5) / 1.331 + 0.2 * a3);
  near('W7 chip B', B, -0.462, 0.001);
  const A = -4 + 0.7 * ((0.9 * a5) / 1.331 + 1 * a3) + 0.3 * ((0.7 * a5) / 1.331 + 0.5 * a3);
  near('W7 chip A', A, 0.5065, 0.0005);
}
{
  const a7 = FIN.pvifa(0.10, 7);
  near('W7 Unter upgrade', -70 + 30 * a7, 76.0526, 0.0001);
  near('W7 Unter entire', -100 + 30 / 1.1 + (0.7 * (30 + 30 * a7) + 0.3 * 40) / 1.21, 39.0387, 0.0001);
  near('W7 Unter quarter', -30 + 5 / 1.1 + (0.9 * (5 + Math.max(-70 + 30 * a7, 5 * a7)) + 0.1 * 85) / 1.21, 41.8573, 0.0001);
}

/* ---- Week 8 ---- */
{
  const sales = 3635, cogs = 3257;
  const ccc = FIN.ccc(FIN.invDays(420, cogs), FIN.arDays(432, sales), FIN.apDays(272, cogs));
  near('W8 T1 CCC', ccc, 59.97, 0.02);
}
near('W8 2/10n30', FIN.tradeCreditEAR(0.02, 10, 30), 0.446, 0.0005);
near('W8 3/10n40', FIN.tradeCreditEAR(0.03, 10, 40), 0.4486, 0.00005);
near('W8 T2 2/20n60', FIN.tradeCreditEAR(0.02, 20, 60, 360), 0.1994, 0.00005);
near('W8 T2 stretch', FIN.tradeCreditEAR(0.02, 20, 80, 360), 0.1289, 0.00005);
near('W8 1/15n40', FIN.tradeCreditEAR(0.01, 15, 40), 0.1580, 0.00005);
near('W8 1/15 stretch60', FIN.tradeCreditEAR(0.01, 15, 60), 0.0849, 0.00005);
near('W8 case A', FIN.tradeCreditEAR(0.01, 20, 40), 0.201317, 1e-6);
near('W8 case D', FIN.tradeCreditEAR(0.02, 10, 60), 0.15891, 1e-5);
near('W8 Emerald', (20e6 + 5e6 - 5e6 - 1e6) / (0.12 - 0.04), 237.5e6, 1);
near('W8 Uwe', FIN.apDays(250000, 14000 * 365), 17.86, 0.005);
near('W8 credit current', -5250 + (25000 - 5250) / 0.01, 1969750);
near('W8 credit new', -28800 + (48000 - 28800) / 0.01, 1891200);
{
  near('W8 case A CCC', FIN.ccc(FIN.invDays(3, 20), FIN.arDays(4.2, 35), FIN.apDays(1.8, 20)), 65.7, 0.01);
}

/* ---- Week 9 ---- */
near('W9 Ex1', FIN.holdingReturn(25, 30, 0.20), 0.208, 1e-9);
near('W9 Ex2 HPR', FIN.hprMulti([0.10, -0.05, 0.20, 0.15]), 0.4421, 0.00005);
near('W9 Ex2 ann', FIN.annualise(FIN.hprMulti([0.10, -0.05, 0.20, 0.15]), 4), 0.0958, 0.00005);
{
  const p = [0.1, 0.2, 0.4, 0.2, 0.1], x = [0.09, 0.10, 0.11, 0.12, 0.13];
  near('W9 Ex3 E', FIN.expRet(p, x), 0.11, 1e-12);
  near('W9 Ex3 var', FIN.varProb(p, x), 0.00012, 1e-12);
  near('W9 Ex4 sd', FIN.sdS(x), 0.0158, 0.00005);
}
near('W9 Ex5 CV alpha', FIN.cv(12.3, 17.6), 0.6989, 0.00005);
{
  const d = [0.13, 0.07, -0.12], s = [0.06, 0.09, -0.10];
  near('W9 Ex6 cov', FIN.covS(d, s), 0.012383, 0.000001);
  near('W9 Ex6 corr', FIN.covS(d, s) / (0.1305 * 0.1021), 0.9294, 0.0001);
}
near('W9 Ex7', FIN.portRet([0.6, 0.4], [0.08, 0.12]), 0.096, 1e-12);
near('W9 Ex8', FIN.portSD2(0.7, 0.0632, 0.3, 0.1242, 0.9336), 0.0801, 0.00005);
near('W9 CAPM ex2 beta', FIN.portBeta([0.4, 0.25, 0.35], [1, 0.75, 1.3]), 1.04, 0.005); // slide rounds 1.0425
near('W9 CAPM ex2 share3', FIN.capm(0.08, 1.3, 0.12), 0.132, 1e-9); // slide rounds to 13%
near('W9 Ex3 beta', FIN.beta(0.0040, 0.0100), 0.4, 1e-12);
{
  const vb = FIN.portVar2(0.4, 0.1487, 0.6, 0.1285, 0.0011 / (0.1487 * 0.1285)); // slide squares the rounded SDs
  near('W9 Ex3b sd', Math.sqrt(vb), 0.1001, 0.00005);
  near('W9 Ex3 sharpe B', FIN.sharpe(0.0968, 0.08, 0.1001), 0.1678, 0.00005);
}
{
  const p = [0.25, 0.60, 0.15], hb = [-0.02, 0.092, 0.154], sb = [0.05, 0.062, 0.074];
  near('W9 T1 E HB', FIN.expRet(p, hb), 0.0733, 1e-9);
  near('W9 T1 E SB', FIN.expRet(p, sb), 0.0608, 1e-9);
  console.log('   (info) W9 T1 sd HB', FIN.sdProb(p, hb).toFixed(6), 'sd SB', FIN.sdProb(p, sb).toFixed(6), 'cov', FIN.covProb(p, hb, sb).toFixed(7), 'corr', FIN.corrProb(p, hb, sb).toFixed(4));
}
near('W9 T4 w', (135 * 47) / (135 * 47 + 105 * 41), 0.5958, 0.00005);
near('W9 T5 P1 sd', FIN.portSD2(0.4, 0.40, 0.6, 0.45, 0.2), 0.3403, 0.00005);
near('W9 T6', FIN.capm(0.05, 1.5, 0.11), 0.14, 1e-12);
near('W9 T7 port', FIN.capm(0.04, FIN.portBeta([0.6, 0.4], [1.7, 1]), 0.10), 0.1252, 1e-12);

/* ---- Formula sheet extras ---- */
near('WACC', FIN.wacc({ E: 600, P: 100, D: 300, re: 0.12, rp: 0.08, rd: 0.06, tc: 0.3 }), 0.0926, 1e-9);
near('rE no tax', FIN.rELevNoTax(0.10, 0.06, 50, 50), 0.14, 1e-12);
near('rE tax', FIN.rELevTax(0.10, 0.06, 50, 50, 0.30), 0.128, 1e-12);

/* ---- formatting ---- */
eq('L.money', L.money(1338.2255), '\\$1{,}338.23');
eq('L.money neg', L.money(-47350), '-\\$47{,}350.00');
eq('L.pct', L.pct(0.126825), '12.68\\%');
eq('L.pctT', L.pctT(0.07), '7\\%');
eq('T.money', T.money(1234567.891), '$1,234,567.89');
eq('L.num tiny neg', L.num(-0.001, 2), '0.00');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
