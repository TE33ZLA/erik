"""Check the calculator's solvers against the course's worked answers (Lua 5.1 via lupa).
   node calculator/tools/build.js && python3 calculator/tests/test_solvers.py
Each case: type number, inputs (rates as decimals, like the app after parsing), expected results by value key.
Special keys in the expected dict: '_sheet' = formula-sheet ids the answer must list (comma separated),
'_off' = text that must appear in a NOT ON THE SHEET line. Every case must end with a FORMULA SHEET section
that lists only known formulas, all of them on the type's N-page list (FSHEET.types).
The v23 cases' numbers were worked out independently (Python) before they were written here."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'mock'))
from nspire_mock import NspireApp

M = 1e6
CASES = [
  # ---- v23: formula-sheet lines on types 1-10 (course examples)
  (1, 'FV of a lump sum', dict(PV=4750, r=.07, n=9), dict(FV=8732.68, _sheet='fv')),
  (1, 'years to triple (rearranged)', dict(mult=3, r=.05), dict(n=22.5171, _off='n = ln(FVn/PV)/ln(1 + r)')),
  (6, 'CDGM just paid', dict(D0=1.45, g=.045, rE=.115), dict(D1=1.51525, P0=21.6464, _sheet='p0g', _off='D1 = D0*(1 + g)')),
  (10, 'EAR from APR', dict(r=.096, m='12 (monthly)'), dict(EAR=.100339, _sheet='ear')),
  (10, 'Fisher real rate', dict(nom=.078, infl=.029), dict(real=.047619, _sheet='fisher')),
  (9, 'FCF + salvage: sheet lines', dict(Tc=.3, Rev=420000, Costs=185000, Dep=60000, sale=42000, BV=18000),
   dict(FCF=182500, ATS=34800, _sheet='fcf,salv', _off='Dep tax shield = Dep*tc')),
  (3, 'loan repayment (C solved)', dict(L=480000, yrs=25, m='12 (monthly)', r=.0425), dict(PMT=2600.34, _off='C = PV*r/(1 - 1/(1 + r)^n)')),
  # ---- v23: interpolation (lambda) where a rate is found by search
  (7, 'IRR + interpolation', dict(k=.06, A0=-60, A1=26, A2=30, A3=34, A4=38),
   dict(IRRA=.359618, intA1A=.9798, intA2A=-.0384, lamA=.96229, rintA=.359623, _sheet='npv,irr,lam,interp')),
  (4, 'yield + interpolation', dict(F=1000, c=.09, m='2 (semi-annual)', yrs=9, P=948.20),
   dict(yp=.049411, EAY=.101263, intA1=115.0965, intA2=-6.6479, lam=.945394, rint=.049454, _sheet='bond,lam,interp')),
  (5, 'realised yield + interpolation', dict(P0=980, F=1000, c=.10, m='2 (semi-annual)', held=10, Ps=1054.36),
   dict(ry=.106475, intA1=40.4877, intA2=-77.7495, lam=.342428, rint=.053424, _sheet='irr,lam,interp')),
  (2, 'annuity rate + interpolation', dict(C=1000, n=10, PV=7000), dict(r=.070728, lam=.07522, rint=.070752, _sheet='pva,lam,interp')),
  (3, 'loan rate, monthly: trial rates 0.1% apart', dict(L=100000, yrs=5, m='12 (monthly)', PMT=2000),
   dict(r=.074201, intA1=524.2601, intA2=-2288.2567, lam=.186402, rint=.0061864)),
  # ---- v23: type 2, n payments then growth g2 forever
  (2, 'two stages: level then -4% (brief)', dict(C=100, r=.08, n=10, g2=-.04),
   dict(PV1=671.008, Cnext=96, TV=800, PV2=370.555, PV=1041.563, _sheet='pva,gperp,pv', _off='C(n+1) = C*(1 + g)^(n - 1)*(1 + g2)')),
  (2, 'two stages: growing, first payment at t = 3', dict(C=50, r=.10, n=4, g=.05, first=3, g2=.02),
   dict(PV1=140.3247, Cnext=59.0389, TV=737.9859, PV2=416.5738, PV=556.8985, _sheet='gann,gperp,pv')),
  (2, 'two stages: annuity due + level = perpetuity due', dict(C=100, r=.10, n=3, timing='start (due)', g2=0),
   dict(PV1=273.5537, TV=1000, PV2=826.4463, PV=1100, _sheet='pvad,perp')),
  (2, 'two stages: monthly, level forever', dict(C=500, r=.06, m='12 (monthly)', n=12, g2=0), dict(PV1=5809.466, PV2=94190.534, PV=100000)),
  (2, 'two stages: C from the total PV', dict(PV=2000, r=.08, n=10, g2=-.04), dict(C=192.0191, PV=2000)),
  (2, 'two stages + price -> NPV', dict(C=100, r=.08, n=10, g2=-.04, price=1000), dict(NPV=41.563)),
  (2, 'deferred: C from PV (moved forward first)', dict(PV=10000, r=.10, n=5, first=3), dict(C=3191.95, _sheet='fv,pva,pv',
   _off='C = PV*r/(1 - 1/(1 + r)^n)')),
  # ---- v23: type 8, NPV of repeating forever (on the sheet)
  (8, 'EAA and NPV forever', dict(k=.07, NPVA=24500, tA=6, NPVB=17800, tB=4),
   dict(EAAA=5139.997, NPVinfA=73428.53, EAAB=5255.061, NPVinfB=75072.29, _sheet='eav,npvinf')),
  # ---- v23: type 9, EBIT given, lost sales, after-tax salvage added, NWC from the items
  (9, 'EBIT + lost sales + NWC items', dict(Tc=.3, EBIT=50000, lost=8000, Dep=10000, CapEx=5000, inv1=20000, ar1=15000, ap1=12000,
   inv0=18000, ar0=14000, ap0=10000), dict(NWC1=23000, NWC0=22000, dNWCi=1000, EBIT=42000, FCF=33400, FCF2=33400, _sheet='fcf')),
  (9, '... plus after-tax salvage this year', dict(Tc=.3, EBIT=50000, lost=8000, Dep=10000, CapEx=5000, inv1=20000, ar1=15000, ap1=12000,
   inv0=18000, ar0=14000, ap0=10000, ATS=12000), dict(FCF=45400, FCF2=45400)),
  (9, 'Rev/Costs + erosion + first-year NWC', dict(Tc=.3, Rev=400000, Costs=180000, lost=30000, Dep=50000, inv1=25000, ar1=20000, ap1=15000),
   dict(dNWCi=30000, EBIT=140000, FCF=118000, FCF2=118000)),
  (9, 'dNWC box wins over the items', dict(Tc=.3, Rev=100000, Costs=40000, Dep=10000, dNWC=5000, inv1=9000), dict(dNWCi=9000, FCF=40000)),
  # ---- v23: type 22, replacement decision (the whole table)
  (22, 'IFC (Tutorial W5 Q3)', dict(n=5, r=.12, Tc=.30, newC=750000, lifeN=5, saleN=75000, bvO=250000, saleO=275000, depO=50000,
   save=20000, rev=100000, nwc=40000, nwcY=10000), dict(taxO=-7500, CF0=-522500, FCF1=104000, FCF4=104000, FCF5=246500,
   NPV=-66744.95, IRR=.073443, _sheet='fcf,salv,npv,irr')),
  (22, 'Nutson Bolz (Lecture W5 Ex 5)', dict(n=5, r=.20, Tc=.47, newC=55000, lifeN=5, saleN=10000, bvO=10000, saleO=15000, depO=2000,
   save=21000, nwc=5000), dict(CF0=-47350, FCF1=15360, FCF5=25660, NPV=2725.14, IRR=.224102)),
  (22, 'brief: old dep outlasts the new, avoided repair', dict(n=8, r=.12, Tc=.30, newC=150000, lifeN=5, saleN=20000, bvO=30000,
   saleO=20000, depO=5000, save=25000, avoid=40000, avYr=3), dict(taxO=3000, CF0=-127000, dep1=25000, dep6=-5000, dep7=0,
   EBIT3=40000, tax3=12000, NOPAT3=28000, OCF3=53000, FCF1=25000, FCF3=53000, FCF5=25000, FCF6=16000, FCF7=17500, atsN=14000,
   FCF8=31500, NPV=11793.78, IRR=.147499)),
  (22, 'old asset has an end value it would have had', dict(n=4, r=.10, Tc=.30, newC=40000, lifeN=4, bvO=8000, saleO=8000,
   depO=2000, endO=3000, save=12000), dict(taxO=0, CF0=-32000, dep1=8000, FCF1=10800, FCF4=8700, atsO=-2100, NPV=800.22)),

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
  (12, 'v23 act now or wait: concert (brief)', dict(mode='act now or wait (option to wait)', c0=500, vg=900, pg=.7, cw=750, tm=6, r=.10),
   dict(t=.5, Enow=630, PVnow=600.6814, npvNow=100.6814, waitG=150, waitB=0, Ewait=105, npvWait=100.1136, optw=-.5679, _sheet='pv,npv')),
  (12, 'v23 act now or wait: waiting wins', dict(mode='act now or wait (option to wait)', c0=1000, vg=1600, pg=.5, vb=400, cw=1050, t=1, r=.08),
   dict(Enow=1000, npvNow=-74.0741, Ewait=275, npvWait=254.6296, optw=328.7037)),
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
  (14, 'v23 float: fee forever, APR monthly', dict(mode='float: faster collection (lockbox)', dcol=150000, fdays=2, feeM=1200, apr=.06),
   dict(freed=300000, im=.005, pvM=240000, NPV=60000, intM=1500, intY=18503.34, feeYr=14400, _sheet='perp,npv')),
  (14, 'v23 float: EAR, fee for 36 months', dict(mode='float: faster collection (lockbox)', dcol=150000, fdays=2, feeM=1200, ear=.08, fmon=36),
   dict(im=.00643403, pvM=38452.00, NPV=261548.00, _sheet='pva')),
  (14, 'v23 float: APR compounded quarterly', dict(mode='float: faster collection (lockbox)', dcol=150000, fdays=2, feeM=1200, apr=.06,
   mf='4 (quarterly)'), dict(ear=.06136355, im=.00497521, pvfees=241196.03, NPV=58803.97, _sheet='ear')),
  (14, 'v23 float: a yearly fee forever', dict(mode='float: faster collection (lockbox)', dcol=150000, fdays=2, feeY=15000, ear=.08),
   dict(pvY=187500, NPV=112500)),
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
  (18, 'v23 two shares + rf: budget, variances', dict(mode='two shares + the risk-free asset', amtA=30000, amtB=50000, amtT=100000,
   vA=.04, vB=.09, cov=.012, ERA=.10, ERB=.14, rf=.04), dict(wA=.3, wB=.5, wF=.2, sA=.2, sB=.3, rho=.2, ERp=.108, varp=.0297,
   sdp=.172337, shp=.394576, _sheet='erp,varpf,sharpe', _off='Var(p) = wA^2*VarA')),
  (18, 'v23 two shares + rf: $ in rf, SDs and rho', dict(mode='two shares + the risk-free asset', amtA=40000, amtB=20000, amtF=20000,
   sA=.25, sB=.15, rho=-.2, ERA=.12, ERB=.07, rf=.03), dict(wA=.5, wB=.25, wF=.25, cov=-.0075, varp=.01515625, sdp=.123111,
   ERp=.085, shp=.446752)),
  (18, 'v23 variances instead of SDs (no rf)', dict(wA=.6, vA=.0625, vB=.0225, cov=.00375), dict(sA=.25, sB=.15, varp=.0279, sdp=.167033, rho=.1)),
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
  (21, 'rU from EBIT, then rE and WACC from D/E', dict(mode='value from cash flows (EBIT or FCF)', EBIT=900, Tc=.3, VU=5000, rd=.08, DE=.5), dict(rU=.126, re=.1421, wacc=.113389)),
  (21, 'recapitalise', dict(mode='recapitalise to a new D/E', re=.10, rd=.06, E=690, D=690, newDE=1.5), dict(rU=.08, re2=.11)),
  (21, 'v23 value from EBIT: share price (brief)', dict(mode='value from cash flows (EBIT or FCF)', EBIT=1000, Tc=.3, rU=.10, D=2000, shares=400),
   dict(FCF=700, VU=7000, pvts=600, VL=7600, E=5600, price=14, _sheet='perp,vl,pvits', _off='E = VL - D')),
  (21, 'v23 ... with rD: levered rE and WACC', dict(mode='value from cash flows (EBIT or FCF)', EBIT=1000, Tc=.3, rU=.10, D=2000, shares=400, rd=.05),
   dict(its=30, DE=.357143, re=.1125, wacc=.092105, _sheet='ret2,wacct,its')),
  (21, 'v23 ... with distress costs (trade-off)', dict(mode='value from cash flows (EBIT or FCF)', EBIT=1000, Tc=.3, rU=.10, D=2000, shares=400, PVd=300),
   dict(VL=7300, E=5300, price=13.25, _off='PV(financial distress costs)')),
  (21, 'v23 rU from EBIT and VU', dict(mode='value from cash flows (EBIT or FCF)', EBIT=2500, Tc=.25, VU=15000), dict(FCF=1875, rU=.125)),
  (21, 'v23 no tax: VL = VU, WACC = rU', dict(mode='value from cash flows (EBIT or FCF)', EBIT=1000, rU=.10, D=2000, shares=400, rd=.05),
   dict(VU=10000, VL=10000, E=8000, price=20, re=.1125, wacc=.10, _sheet='mm1,re,ru')),
  (21, 'v23 FCF given directly', dict(mode='value from cash flows (EBIT or FCF)', FCF=900, Tc=.3, rU=.12, D=1000), dict(VU=7500, VL=7800, E=6800)),
]

def close(got, want):
    tol = max(0.006 * abs(want), 0.00006) if abs(want) < 5 else max(0.0005 * abs(want), 0.02)
    return abs(got - want) <= tol

# v23: number boxes take simple sums. (text, kind) -> value (None = an error), and part of the conversion note
PARSE = [
  ('4/12', 'num', 1 / 3, '4/12 -> 0.333333'), ('1.08^2', 'num', 1.1664, '1.08^2 -> 1.1664'),
  ('50000-40000', 'money', 10000, '50000-40000 -> $10,000.00'), ('(3+4)*2', 'num', 14, '(3+4)*2 -> 14'),
  ('-2.5', 'num', -2.5, None), ('4.75k', 'money', 4750, '4.75k -> $4,750.00  (x1000)'), ('1.2m', 'money', 1.2e6, '1.2m -> $1,200,000.00'),
  ('50k-40k', 'money', 10000, None), ('12/2', 'pct', .06, '12/2 -> 6 %'), ('7', 'pct', .07, None), ('-2^2', 'num', -4, None),
  ('2^-1', 'num', .5, None), ('2^3^2', 'num', 512, None), ('2,5', 'num', 2.5, None), ('-(1+1)*3', 'num', -6, None),
  ('4/', 'num', None, None), ('(3+4', 'num', None, None), ('1/0', 'num', None, None), ('4.75k', 'num', None, None),
  ('1e5', 'num', None, None), ('0x10', 'num', None, None), ('2 3', 'num', 23, None),
]

def main():
    src = open(os.path.join(HERE, '..', 'build', 'bfc2140_solver.lua')).read()
    app = NspireApp(src)
    lua = app.lua
    CORE = lua.globals().CORE
    FS = lua.globals().FSHEET
    fails = 0
    for t, name, V, want0 in CASES:
        want = dict(want0)
        sheet, offtxt = want.pop('_sheet', None), want.pop('_off', None)
        vt = lua.table_from(V)
        out = CORE.run(t, vt)
        vals = out.vals
        bad_rows = [r.text for r in out.rows.values() if r.kind in ('err',)]
        miss = []
        for k, w in want.items():
            g = vals[k]
            if g is None or not close(g, w): miss.append(f'{k}: got {g}, want {w}')
        # the formula-sheet section: present, known ids only, all on the type's N-page list
        heads = [r.text for r in out.rows.values() if r.kind == 'head']
        if not any(h.startswith('FORMULA SHEET') for h in heads): miss.append('no FORMULA SHEET section')
        if out.fsbad is not None: miss.append('unknown formula ids: ' + ', '.join(out.fsbad.values()))
        ids = set(out.fsids.values()) if out.fsids is not None else set()
        allowed = set(FS.types[t].values())
        if ids - allowed: miss.append('used but not on the N page list: ' + ', '.join(sorted(ids - allowed)))
        if sheet:
            for sid in sheet.split(','):
                if sid not in ids: miss.append(f'sheet line {sid} not listed (got {sorted(ids)})')
        if offtxt:
            offs = [o[1] for o in out.fsoff.values()] if out.fsoff is not None else []
            if not any(offtxt in f for f in offs): miss.append(f'NOT ON THE SHEET lacks {offtxt!r}')
        if miss or bad_rows:
            fails += 1
            print(f'FAIL type {t} {name}: ' + '; '.join(miss + bad_rows))
    pfails = 0
    for text, kind, want, note in PARSE:
        res = CORE.parseBuf(text, kind)
        res = (tuple(res) if isinstance(res, tuple) else (res,)) + (None, None, None)
        x, cnote, err = res[:3]
        ok = (x is None and err is not None) if want is None else (x is not None and abs(x - want) < 1e-9 and err is None)
        if ok and note is not None and (cnote is None or note not in cnote): ok = False
        if not ok:
            pfails += 1
            print(f'FAIL parse {text!r} ({kind}): got {x}, note {cnote!r}, error {err!r}; want {want}, note {note!r}')
    print(f'{len(CASES) - fails} passed, {fails} failed; number boxes: {len(PARSE) - pfails} passed, {pfails} failed')
    sys.exit(1 if fails or pfails else 0)

if __name__ == '__main__':
    main()
