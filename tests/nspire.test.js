/* TI-Nspire emulator tests: known results from the TI-Nspire's own rules and the course examples. */
require('../js/lib/fin.js');
require('../js/lib/nspire.js');
const { NSPIRE } = globalThis;
let pass = 0, fail = 0;
function near(name, got, want, tol) {
  const ok = Number.isFinite(got) && Math.abs(got - want) <= (tol === undefined ? Math.max(1e-6, Math.abs(want) * 1e-6) : tol);
  if (ok) pass++; else { fail++; console.log('FAIL', name, 'got', got, 'want', want); }
}
function same(name, got, want) { const ok = JSON.stringify(got) === JSON.stringify(want); if (ok) pass++; else { fail++; console.log('FAIL', name, 'got', JSON.stringify(got), 'want', JSON.stringify(want)); } }
function errs(name, line) { try { NSPIRE.evaluate(line); fail++; console.log('FAIL', name, 'expected an error'); } catch (e) { pass++; } }
const ev = (l, env) => NSPIRE.evaluate(l, env);

// time value of money functions
near('tvmFV lump', ev('tvmFV(5,6,-1000,0)'), 1338.2255776);
near('tvmFV lump with PpY/CpY', ev('tvmFV(5,6,-1000,0,1,1)'), 1338.2255776);
near('tvmPV lump', ev('tvmPV(10,6,0,1000)'), -558.3947769);
near('tvmPmt mortgage (Tutorial W2 Q1)', ev('tvmPmt(360,7,400000,0,12,12)'), -2661.21, 0.005);
near('tvmPmt default CpY is 1', ev('tvmPmt(360,7,400000,0,12)'), -2603.70, 0.01); // CpY defaults to 1: 7% is then an effective annual rate
near('tvmN doubling', ev('tvmN(8,-1000,0,2000)'), 9.00646, 1e-4);
near('tvmI lump', ev('tvmI(5,-1000,0,1500)'), 8.4471771, 1e-6);
near('tvmPV bond MST Q16', ev('tvmPV(20,7,45,1000,2,2)'), -1142.1240, 1e-3);
near('tvmI semi bond per half-year', ev('tvmI(16,-896.64,50,1000)'), 6.0245, 1e-3);
near('tvmI semi bond nominal', ev('tvmI(16,-896.64,50,1000,2,2)'), 12.049, 2e-3);
near('annuity due FV', ev('tvmFV(10,5,0,-100,1,1,1)'), 1320.6787, 1e-3);
near('eff monthly', ev('eff(12,12)'), 12.6825030, 1e-6);
near('nom back', ev('nom(12.682503013,12)'), 12, 1e-6);
// cash flows
near('npv', ev('npv(10,-1000,{300,400,500})'), -21.0368, 1e-3);
near('irr', ev('irr(-1000,{300,400,500})'), 8.8963, 1e-3);
near('npv with frequencies', ev('npv(10,-1000,{100,1100},{9,1})'), 0, 1e-6);
near('npv of a bond at 8%', ev('npv(8,0,{100,1100},{9,1})'), 1134.2016, 1e-3);
// lists and statistics
near('mean', ev('mean({1,2,3,4})'), 2.5);
near('stDevSamp Nikkei', ev('stDevSamp({0.08,0.15,-0.12,0.11,0.09,-0.06})'), 0.1064737839, 1e-9);
near('varSamp', ev('varSamp({1,2,3,4})'), 1.6666667, 1e-6);
near('expected return', ev('sum({0.25,0.6,0.15}*{-0.02,0.092,0.154})'), 0.0733, 1e-12);
same('cumulativeSum', ev('cumulativeSum({-100,40,50,60})'), [-100, -60, -10, 50]);
same('list maths', ev('{1,2,3}*2+1'), [3, 5, 7]);
// solving
near('nSolve rate', ev('nSolve(1000*(1+r)^5=1500,r)'), 0.0844717712, 1e-9);
near('nSolve with guess', ev('nSolve(1000*(1+r)^5=1500,r=0.1)'), 0.0844717712, 1e-9);
same('solve two roots', ev('solve((1+r)^2=1.21,r)').roots.map((x) => +x.toFixed(6)), [-2.1, 0.1]);
same('solve with condition', ev('solve((1+r)^2=1.21,r)|r>0').roots.map((x) => +x.toFixed(6)), [0.1]);
same('solve with and', ev('solve((1+r)^2=1.21 and r>0,r)').roots.map((x) => +x.toFixed(6)), [0.1]);
near('nSolve bond yield', ev('nSolve(1079.43=80/r*(1-1/(1+r)^12)+1000/(1+r)^12,r)'), 0.07, 1e-5); // price is rounded to the cent
near('nSolve years', ev('nSolve(1000*1.08^n=2000,n)'), 9.00646, 1e-4);
// memory, operators, notation
const env = { vars: {} };
ev('x:=5', env); near('assign then implicit multiply', ev('2x', env), 10);
ev('{1,2}→L', env); near('store with arrow', ev('sum(L)', env), 3);
ev('7', env); near('ans', ev('ans*2', env), 14);
near('percent operator', ev('6%'), 0.06);
near('root sign', ev('√(16)'), 4);
near('e power', ev('e^(0.05)'), 1.0512710964, 1e-9);
near('unicode minus and times', ev('−2×3'), -6);
near('power binds tighter than minus', ev('-2^2'), -4);
near('negative exponent', ev('1.06^-2'), 0.88999644, 1e-8);
near('E notation', ev('1E3+1'), 1001);
// Finance Solver
near('solver FV', NSPIRE.solverSolve({ N: 5, I: 6, PV: -1000, Pmt: 0, PpY: 1, CpY: 1, PmtAt: 'END' }, 'FV'), 1338.2255776);
near('solver I monthly', NSPIRE.solverSolve({ N: 360, PV: 400000, Pmt: -2661.21, FV: 0, PpY: 12, CpY: 12, PmtAt: 'END' }, 'I'), 7, 1e-4);
near('solver N', NSPIRE.solverSolve({ I: 8, PV: -1000, Pmt: 0, FV: 2000, PpY: 1, CpY: 1 }, 'N'), 9.00646, 1e-4);
// a whole method with ans carried over
const m = NSPIRE.run([{ cmd: 'npv(10,-1000,{300,400,600})' }, { cmd: 'ans/1000' }]);
near('run carries ans', m.last.value, 0.054095, 1e-6);
// errors a student can make
errs('too few values', 'tvmFV(5,6)');
errs('dangling operator', '1000*');
errs('unknown function', 'foo(2)');
errs('undefined variable', 'q+1');
errs('bad bracket', '(1+2');
errs('no sign change', 'tvmI(5,1000,0,1500)');
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
