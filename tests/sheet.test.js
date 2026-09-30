/* Tests for the one-line maths reader (js/lib/linear.js) and the small Excel (js/lib/xl.js).
 * Run: node tests/sheet.test.js */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
for (const f of ['js/lib/fin.js', 'js/lib/nspire.js', 'js/lib/linear.js', 'js/lib/xl.js']) require(path.join(ROOT, f));
const { LINEAR, XL } = globalThis;
let pass = 0, fail = 0;
const near = (a, b, tol) => Math.abs(a - b) <= (tol === undefined ? 1e-6 * Math.max(1, Math.abs(b)) : tol);
function t(name, got, want, tol) {
  const ok = typeof want === 'number' ? typeof got === 'number' && near(got, want, tol) : JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else { fail++; console.log(`FAIL ${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); }
}

/* ---- one-line maths ---- */
t('power of a bracket', LINEAR.value('5000*(1 + 0.06)^3'), 5955.08, 0.005);
t('percent', LINEAR.value('10%+2/3*(10%-8%)'), 0.113333333);
t('annuity', LINEAR.value('400/0.005*((1 + 0.005)^60 - 1)'), 27908.01, 0.005);
t('negative power', LINEAR.value('1000*1.05^-2'), 907.029478);
t('exp', LINEAR.value('13000*exp(-0.03*9)'), 13000 * Math.exp(-0.27), 1e-6);
t('e power', LINEAR.value('13000/e^(0.03*9)'), 13000 * Math.exp(-0.27), 1e-6);
t('sqrt', LINEAR.value('sqrt(0.4^2*0.04 + 0.4^2*0.09 + 2*0.4*0.4*0.036)'), Math.sqrt(0.032320), 1e-9);
t('thousands commas', LINEAR.value('$13,200.50 + 1'), 13201.5);
t('letters are not numbers', LINEAR.value('C/r'), null);
t('implicit multiply', LINEAR.value('2(3 + 4)'), 14);
t('the classic trap is a different number', LINEAR.value('1/1+0.05'), 1.05);
const good = LINEAR.check('PV = C/r*(1 - 1/(1 + r)^n)\n= 500/0.08*(1 - 1/1.08^10)\n= $3,355.04', { answer: 3355.04, unit: '$', dp: 2 });
t('check: formula', good.formula, true);
t('check: numbers', good.subst, true);
t('check: value', good.hit, true);
t('check: final', good.final.ok && good.final.dpOk, true);
const pct = LINEAR.check('rE = rU + D/E*(rU - rD)*(1 - Tc) = 0.21 + 1*(0.21 - 0.10)*(1 - 0.3) = 28.70%', { answer: 28.7, unit: '%', dp: 2 });
t('check: percent answer', [pct.formula, pct.subst, pct.hit, pct.final.ok, pct.final.dpOk, pct.final.unitOk], [true, true, true, true, true, true]);
const bare = LINEAR.check('28.7', { answer: 28.7, unit: '%', dp: 2 });
t('check: a bare number shows no method', [bare.formula, bare.subst, bare.final.ok, bare.final.dpOk], [false, false, true, false]);
const wrong = LINEAR.check('PV = 500/0.08*(1 - 1/1.08^11) = 3569.45', { answer: 3355.04, unit: '$', dp: 2 });
t('check: wrong working', [wrong.hit, wrong.final.ok], [false, false]);
const prose = LINEAR.check('NPV = -1000 + 600/1.1 + 600/1.1^2 = 41.32\nAccept the project because NPV > 0', { answer: 41.32, unit: '$', dp: 2 });
t('check: a sentence after the working is fine', [prose.final.ok, prose.problems.length], [true, 0]);
t('preview tex', LINEAR.lineTex('PV = FVn/(1 + r)^n'), 'PV_{n}'.length > 0 ? LINEAR.lineTex('PV = FVn/(1 + r)^n') : '');

/* ---- Excel ---- */
const f = (formula, rows) => { const sh = XL.build({ rows: (rows || []).concat([['x', formula]]) }); return sh.get('B' + ((rows || []).length + 1)); };
t('NPV starts at year 1', f('=NPV(10%,C1:E1)+B1', [['cf', -1000, 300, 400, 500]]), -21.036814);
t('IRR', f('=IRR(B1:E1)', [['cf', -1000, 300, 400, 500]]), 0.088963, 1e-6);
t('PV', f('=PV(6%,5,0,1000)'), -747.258173);
t('FV', f('=FV(6%/12,60,-100,0,0)'), 6977.003051, 1e-5);
t('PMT', f('=PMT(4.8%/12,240,250000,0)'), -1622.393675, 1e-5);
t('NPER', f('=NPER(8%,-1000,5000)'), Math.log(1 / 0.6) / Math.log(1.08), 1e-9);
t('RATE', f('=RATE(5,0,-1000,1500)'), 0.084472, 1e-6);
t('PV annuity due', f('=PV(8%,10,-500,0,1)'), 3623.44, 0.005);
t('EFFECT', f('=EFFECT(12%,12)'), 0.126825, 1e-6);
t('NOMINAL', f('=NOMINAL(12.6825030%,12)'), 0.12, 1e-6);
t('STDEV.S', f('=STDEV.S(B1:E1)', [['r', -0.22, 0.34, 0.17, 0.06]]), 0.2351, 5e-5);
t('SUMPRODUCT arrays', f('=SUMPRODUCT(B1:D1*(B2:D2-0.1075)^2)', [['p', 0.25, 0.5, 0.25], ['R', -0.14, 0.14, 0.29]]), 0.02418, 5e-5);
t('CORREL', f('=CORREL(B1:D1,B2:D2)', [['a', 1, 2, 3], ['b', 2, 4, 7]]), 0.993399, 1e-6);
t('SLOPE', f('=SLOPE(B1:D1,B2:D2)', [['y', 2, 4, 7], ['x', 1, 2, 3]]), 2.5, 1e-9);
t('Excel negation is before powers', f('=-2^2'), 4);
t('percent literal', f('=50%*10'), 5);
t('IF', f('=IF(B1>0,"Accept","Reject")', [['npv', 12]]), 'Accept');
t('division by zero is an error', f('=1/0').err, '#DIV/0!');
const gs = XL.build({ rows: [['r', 0.1], ['gap', '=1000*(1+B1)^5-1500']], goal: { set: 'B2', to: 0, change: 'B1' } });
t('Goal Seek', gs.get('B1'), Math.pow(1.5, 1 / 5) - 1, 1e-7);
t('display money', XL.format(-1234.5, '$'), '-1,234.50');
t('display percent', XL.format(0.08463, '%'), '8.46%');
/* TI-Nspire methods turn into the same numbers */
const TI = globalThis.TI;
const m1 = XL.methodFor([TI.solver({ N: 5, I: 6, PV: -1000, Pmt: 0 }, 'FV')]);
t('TI Finance Solver -> Excel FV', m1 && XL.build(m1).get(m1.answer), 1338.225578, 1e-5);
const m2 = XL.methodFor([TI.cmd('npv', [10, -1000, [300, 400, 500]])]);
t('TI npv -> Excel NPV', m2 && XL.build(m2).get(m2.answer), -21.036814, 1e-6);
const m3 = XL.methodFor([TI.line('{0.25,0.5,0.25}→p'), TI.line('{-0.14,0.14,0.29}→r'), TI.line('sqrt(sum(p*(r-0.1075)^2))')]);
t('TI lists -> Excel SUMPRODUCT', m3 && XL.build(m3).get(m3.answer), Math.sqrt(0.0241688), 5e-5);
const m4 = XL.methodFor([TI.line('nSolve(3300*(1+r)^2=3796,r)', { pct: true })]);
t('TI nSolve -> Excel Goal Seek', m4 && XL.build(m4).get(m4.answer), Math.sqrt(3796 / 3300) - 1, 1e-7);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
