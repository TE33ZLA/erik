"""Check the calculator's solvers against the course's worked answers (Lua 5.1 via lupa).
   node calculator/tools/build.js && python3 calculator/tests/test_solvers.py
Each case: type number, inputs (rates as decimals, like the app after parsing), expected results by value key."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'mock'))
from nspire_mock import NspireApp

M = 1e6
CASES = [
  # ---- 11 break-even, sensitivity, scenarios (Lecture W7)
  (11, 'NPV break-even forever', dict(I=500000, P=80, v=60, r=.10), dict(Qnpv=2500, need=50000)),
  (11, 'NPV break-even 8 years', dict(I=250000, P=110, v=80, r=.12, n=8), dict(Qnpv=1677.52)),
  (11, 'NPV break-even 5 years', dict(I=300000, P=45, v=20, r=.10, n=5), dict(need=79139.24, Qnpv=3165.57)),
  (11, 'EBIT break-even', dict(P=98, v=90, FC=83000, Dep=35000), dict(Qebit=14750)),
  (11, 'EBIT break-even, dep from life', dict(I=1200000, life=4, P=75, v=45, FC=190000), dict(Dep=300000, Qebit=16333.33)),
  (11, 'sensitivity: price', dict(mode='sensitivity: one input', I=450000, Q=3000, P=110, v=80, r=.11, test='price P', new=105), dict(npv0=368181.82, npv1=231818.18)),
  (11, 'sensitivity: % change', dict(mode='sensitivity: one input', I=550000, Q=3000, P=115, v=80, r=.11, test='price P', new=103.5), dict(npv0=404545.45, npv1=90909.09, pnpv=-0.7753)),
  (11, 'scenario: worst = base', dict(mode='scenario: worst/base/best', I=650000, Q=3500, P=97, v=73, r=.12), dict(nw=50000, npv0=50000)),
  (11, 'NPV and break-even price', dict(I=500000, Q=6000, P=80, v=60, r=.10), dict(NPV=700000, Pbe=60 + 50000 / 6000)),
  # ---- 12 expected values, trees, options (Tutorial W7, Lecture W7)
  (12, 'expected cash flow', dict(v1=440000, p1=.9, v2=176000), dict(E=413600)),
  (12, 'chance node today', dict(v1=1450000, p1=.8, v2=440000, t=1, r=.08), dict(pv=1155555.56)),
  (12, 'uncertain CF project', dict(mode='project with uncertain cash flow', I=280000, v1=150000, p1=.6, v2=60000, n=3, r=.15), dict(ECF=114000, NPV=-19712.34)),
  (12, 'research forever', dict(v1=70000, p1=.4, v2=0, kind='a yearly amount forever', t=1, r=.15), dict(E=186666.67, pv=162318.84)),
  (12, 'decision node', dict(mode='decision node (pick the best)', v1=1300000, v2=900000, t=1, r=.08), dict(node=1300000, pv=1203703.70)),
  (12, 'abandon', dict(mode='sell or keep (abandon option)', v1=60000, p1=.25, v2=33000, r=.10, sellp=.6, cost=75000), dict(keep=36136.36, sell=45000, node=45000)),
  # ---- 13 probabilities
  (13, 'chance of high in year 1', dict(HH=.2, HL=.25, LL=.25), dict(miss=.3, H1=.45)),
  (13, 'joint probability', dict(mode="from year 1 + 'given' probs", H1=.55, HgH=.6, LgL=.8), dict(LL=.36)),
  (13, 'conditional', dict(HH=.3, HL=.05, LL=.3), dict(LgL=.4615)),
  # ---- 14 working capital (Lecture W8)
  (14, 'inventory days', dict(sales=24 * M, cogs=18 * M, inv=3.4 * M), dict(invD=68.94)),
  (14, 'A/R and A/P days', dict(sales=24 * M, cogs=18 * M, ar=3.7 * M, ap=2.3 * M), dict(arD=56.27, apD=46.64)),
  (14, 'CCC from balances', dict(sales=24 * M, cogs=18 * M, inv=3.4 * M, ar=3 * M, ap=1.6 * M), dict(ccc=82.13)),
  (14, 'CCC from days', dict(mode='cycles from days', invD=15.5, arD=13.5, apD=59), dict(ccc=-30)),
  (14, 'cash freed', dict(mode='cash freed by a change in days', which='payables (A/P)', cogs=19.5 * M, oldD=53, newD=63), dict(freed=534246.58)),
  (14, 'pay on the net day', dict(sales=57 * M, cogs=34.2 * M, inv=5 * M, ar=4.5 * M, ap=3.09 * M, paynet=45), dict(ccc2=37.18)),
  (14, 'NWC', dict(mode='NWC from the balance sheet', cash=.6, ar=7.9, inv=5.4, ap=2.6, ocl=2.6), dict(nwc=8.7)),
  (14, 'firm value', dict(mode='firm value from FCF', ni=7, dep=8, capex=7.5, dnwc=1.7, g=.03, r=.10), dict(fcf=5.8, V=82.857)),
  (14, 'firm value rise', dict(mode='firm value from FCF', ni=7, dep=8, capex=7.5, dnwc=1.8, g=.03, r=.10, cut=.2), dict(dV=5.142857)),
  # ---- 15 trade credit
  (15, 'period cost', dict(d=.01, dd=10, nd=60), dict(per=.010101)),
  (15, 'EAR 1/10 net 90', dict(d=.01, dd=10, nd=90), dict(ear=.0469)),
  (15, 'stretching', dict(d=.01, dd=10, nd=45, pay=75), dict(ear=.0581)),
  (15, '3/15 net 30, 360 days', dict(d=.03, dd=15, nd=30, year='360'), dict(ear=1.0772)),
  (15, '3/15 paid day 50', dict(d=.03, dd=15, nd=30, pay=50, year='360'), dict(ear=.3679)),
  (15, 'A/P days check', dict(d=.01, dd=20, nd=45, apbal=1350000, dcogs=30000), dict(apd=45)),
  # ---- 16 credit policy
  (16, 'drop the 3% discount', dict(p=50, c=25, r=.0125, Qc=1000, cc=.6, dc=.03, Qn=980), dict(CURRENTN=1932100, NEWN=1935500, sw=3400)),
  (16, 'lecture: keep the 1% discount', dict(p=100, c=60, r=.01, Qc=500, cc=.5, dc=.01, Qn=480), dict(CURRENTN=1969750, NEWN=1891200, sw=-78550)),
  # ---- 17 one share (Week 9)
  (17, 'realised return', dict(P0=59, P1=62.54, div=2.66), dict(R=.1051, dy=.0451)),
  (17, 'total dividends', dict(P0=59, P1=62.54, divT=266, shares=100), dict(div=2.66, R=.1051)),
  (17, 'annualised', dict(mode='several years: annualised', R1=-.13, R2=.25, R3=.13), dict(hpr=.228875, ann=.0711)),
  (17, 'forecast SD', dict(mode='forecast: states of the economy', p1=.25, R1=-.14, p2=.5, R2=.14, p3=.25, R3=.29), dict(ER=.1075, sd=.1555)),
  (17, 'sample SD', dict(mode='past returns (a sample)', R1=-.22, R2=.34, R3=.17, R4=.06), dict(avg=.0875, sd=.2351)),
  (17, 'CV', dict(mode='CV and Sharpe ratio', ER=.051, SD=.068), dict(cv=1.3333)),
  (17, 'Sharpe', dict(mode='CV and Sharpe ratio', ER=.045, SD=.295, rf=.02), dict(sharpe=.0847)),
  # ---- 18 portfolios
  (18, 'correlation from covariance', dict(sA=.395, sB=.305, cov=.01205), dict(rho=.1)),
  (18, 'portfolio SD', dict(amtA=63700, amtB=34300, sA=.206, sB=.172, rho=.4), dict(wA=.65, sdp=.1673)),
  (18, 'portfolio return', dict(amtA=22000, amtB=14000, ERA=.09, ERB=.125), dict(ERp=.1036)),
  (18, 'with the risk-free asset', dict(mode='one share + the risk-free asset', wA=.55, sA=.45), dict(sdp=.2475)),
  (18, 'weights', dict(mode='weights from holdings', n1=490, px1=57.5, n2=285, px2=35.5), dict(w1=.7358)),
  (18, 'forecast correlation', dict(mode='forecast table (states)', p1=.2, A1=-.022, B1=.028, p2=.55, A2=.082, B2=.06, p3=.25, A3=.198, B3=.114), dict(rho=.9896)),
  (18, 'sample covariance', dict(mode='past returns (a sample)', A1=.03, B1=.03, A2=-.01, B2=.02, A3=.01, B3=-.02, A4=-.07, B4=-.1), dict(cov=.002267)),
  # ---- 19 CAPM
  (19, 'CAPM', dict(rf=.02, rm=.11, beta=1.65), dict(req=.1685)),
  (19, 'overvalued', dict(rf=.02, rm=.10, beta=1.55, fc=.134), dict(req=.144, alpha=-.01)),
  (19, 'beta from cov', dict(mode='beta from covariance/correlation', cov=.02, sm=.10), dict(beta=2)),
  (19, 'portfolio beta', dict(mode='portfolio beta + return', amt1=28000, b1=.75, amt2=23000, b2=1.3, amt3=26000, b3=1.6), dict(bp=1.2013)),
  (19, 'portfolio return by CAPM', dict(mode='portfolio beta + return', w1=.45, b1=1.35, w2=.55, b2=.9, rf=.06, rm=.13), dict(erp=.1372)),
  (19, 'beta from correlation', dict(mode='beta from covariance/correlation', rho=.9, si=.4, sm=.1, rf=.035, rm=.09), dict(beta=3.6, req=.233)),
  (19, 'target return', dict(mode='target return -> weights', rf=.02, mrp=.04, target=.0766, bA=2, bB=.7), dict(wA=.55)),
  # ---- 20 cost of capital
  (20, 'preference shares', dict(mode='cost of preference shares', divpct=.10, par=20, pp=22.86), dict(rp=.0875)),
  (20, 'after-tax cost of debt', dict(mode='cost of debt (bond YTM)', rd=.0425, Tc=.3), dict(rdat=.02975)),
  (20, 'cost of equity CAPM', dict(mode='cost of equity (CAPM or DDM)', rf=.02, beta=1.55, rm=.10), dict(reC=.144)),
  (20, 'cost of equity DDM', dict(mode='cost of equity (CAPM or DDM)', D0=.65, P0=60.5, g=.07), dict(reD=.0815)),
  (20, 'WACC', dict(E=612.5, Pv=58.5, D=128.7, re=.1425, rp=.0675, rd=.045, Tc=.3), dict(wacc=.1191)),
  (20, 'YTM from the bond', dict(mode='cost of debt (bond YTM)', face=1000, cpn=.09, yrs=3, price=1025.77, Tc=.3), dict(rd=.08, rdat=.056)),
  (20, 'accept vs WACC', dict(E=50, D=50, re=.15, rd=.07, Tc=.3, irr=.0895), dict(wacc=.0995)),
  # ---- 21 MM
  (21, 'unlevered cost', dict(mode='unlevered cost rU', re=.095, rd=.06, E=520, D=390), dict(rU=.08)),
  (21, 'rE no tax', dict(rU=.08, rd=.06, D=390, E=520), dict(re=.095, wacc=.08)),
  (21, 'tax shield', dict(mode='tax shield and levered value', D=50, rd=.08, Tc=.3), dict(its=1.2, pvts=15)),
  (21, 'rE with tax', dict(rU=.08, rd=.06, D=315, E=420, Tc=.3), dict(re=.0905, wacc=.0697)),
  (21, 'buyback with tax', dict(mode='tax shield and levered value', D=125, rd=.055, Tc=.3, VU=250, rU=.11), dict(VL=287.5, E2=162.5, re2=.1396)),
  (21, 'recapitalise', dict(mode='recapitalise to a new D/E', re=.10, rd=.06, E=690, D=690, newDE=1.5), dict(rU=.08, re2=.11)),
]

def close(got, want):
    tol = max(0.006 * abs(want), 0.00006) if abs(want) < 5 else max(0.0005 * abs(want), 0.02)
    return abs(got - want) <= tol

def main():
    src = open(os.path.join(HERE, '..', 'build', 'bfc2140_solver.lua')).read()
    app = NspireApp(src)
    lua = app.lua
    CORE = lua.globals().CORE
    fails = 0
    for t, name, V, want in CASES:
        vt = lua.table_from(V)
        out = CORE.run(t, vt)
        vals = out.vals
        bad_rows = [r.text for r in out.rows.values() if r.kind in ('err',)]
        miss = []
        for k, w in want.items():
            g = vals[k]
            if g is None or not close(g, w): miss.append(f'{k}: got {g}, want {w}')
        if miss or bad_rows:
            fails += 1
            print(f'FAIL type {t} {name}: ' + '; '.join(miss + bad_rows))
    print(f'{len(CASES) - fails} passed, {fails} failed')
    sys.exit(1 if fails else 0)

if __name__ == '__main__':
    main()
