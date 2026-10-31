"""Check the calculator's solvers against the course's worked answers (Lua 5.1 via lupa).
   node calculator/tools/build.js && python3 calculator/tests/test_solvers.py
Each case: type number, inputs (rates as decimals, like the app after parsing), expected results by value key.
Special keys in the expected dict: '_sheet' = formula-sheet ids the answer must list (comma separated),
'_off' = text that must appear in a NOT ON THE SHEET line, '_clean' = True: no 'Need' line either. Every case must end with a FORMULA SHEET section
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
  (18, 'sample covariance', dict(mode='past returns (a sample)', A1=.03, B1=.03, A2=-.01, B2=.02, A3=.01, B3=-.02, A4=-.07, B4=-.1), dict(cov=.002267, varA=.00186667, varB=.00349167, mA=-.01, mB=-.0175)),
  (18, 'v23 two shares + rf: budget, variances', dict(mode='two shares + the risk-free asset', amtA=30000, amtB=50000, amtT=100000,
   vA=.04, vB=.09, cov=.012, ERA=.10, ERB=.14, rf=.04), dict(wA=.3, wB=.5, wF=.2, sA=.2, sB=.3, rho=.2, ERp=.108, varp=.0297,
   sdp=.172337, shp=.394576, _sheet='erp,varpf,sharpe', _off='Var(p) = wA^2*VarA')),
  (18, 'v23 two shares + rf: $ in rf, SDs and rho', dict(mode='two shares + the risk-free asset', amtA=40000, amtB=20000, amtF=20000,
   sA=.25, sB=.15, rho=-.2, ERA=.12, ERB=.07, rf=.03), dict(wA=.5, wB=.25, wF=.25, cov=-.0075, varp=.01515625, sdp=.123111,
   ERp=.085, shp=.446752)),
  (18, 'v23 variances instead of SDs (no rf)', dict(wA=.6, vA=.0625, vB=.0225, cov=.00375), dict(sA=.25, sB=.15, varp=.0279, sdp=.167033, rho=.1)),
  (18, 'past returns + a given correlation', dict(mode='past returns (a sample)', A1=.10, B1=.02, A2=-.05, B2=.12, A3=.20, B3=-.04, A4=.08, B4=.10, wA=.6, rho=.25), dict(sA=.102754, sB=.073937, sdp=.074749)),
  # ---- 19 CAPM
  (19, 'CAPM', dict(rf=.02, rm=.11, beta=1.65), dict(req=.1685)),
  (19, 'overvalued', dict(mode='buy or sell? (over/undervalued)', rf=.02, rm=.10, beta=1.55, fc=.134), dict(req=.144, alpha=-.01)),
  (19, 'beta from cov', dict(mode='beta from covariance/correlation', cov=.02, sm=.10), dict(beta=2)),
  (19, 'portfolio beta', dict(mode='portfolio beta + return', amt1=28000, b1=.75, amt2=23000, b2=1.3, amt3=26000, b3=1.6), dict(bp=1.2013)),
  (19, 'portfolio return by CAPM', dict(mode='portfolio beta + return', w1=.45, b1=1.35, w2=.55, b2=.9, rf=.06, rm=.13), dict(erp=.1372)),
  (19, 'beta from correlation', dict(mode='beta from covariance/correlation', rho=.9, si=.4, sm=.1, rf=.035, rm=.09), dict(beta=3.6, req=.233)),
  (19, 'target return', dict(mode='target return -> weights', rf=.02, mrp=.04, target=.0766, bA=2, bB=.7), dict(wA=.55)),
  # ---- v24: own numbers (checked in Python first)
  (17, 'sample SD: 95% range and standard error', dict(mode='past returns (a sample)', R1=-.22, R2=.34, R3=.17, R4=.06),
   dict(lo95=-.382784, hi95=.557784, se=.117571, ciLo=-.147642, ciHi=.322642, _off='95% of returns')),
  (18, 'equal weights: n shares from SD + correlation', dict(mode='equal weights: n shares', nN=25, sA=.40, rho=.3),
   dict(cov=.048, varp=.05248, sdp=.229085, sdinf=.219089, _off='(1/n)*Var')),
  (18, 'equal weights: n shares from Var + Cov', dict(mode='equal weights: n shares', nN=10, vA=.09, cov=.02), dict(varp=.027, sdp=.164317)),
  (19, 'portfolio: each share by CAPM, then beta_p and E[Rp]', dict(mode='portfolio beta + return', w1=.7, b1=1.2, w2=.3, b2=.8, rf=.03, rm=.09),
   dict(er1=.102, er2=.078, bp=1.08, erp=.0948, mrp=.06, _sheet='capm,betap,erp')),
  (19, 'portfolio with a risk-free part', dict(mode='portfolio beta + return', w1=.5, b1=1.4, w2=.3, b2=.6, rf=.04, rm=.10), dict(bp=.88, erp=.0928)),
  (19, 'CAPM backwards: beta from prices', dict(mode='find beta (prices or forecast)', rf=.04, mrp=.05, P0=80, P1=86, div=2),
   dict(fcR=.10, beta=1.2, _sheet='capm,ret', _off='Beta(i) = (E[Ri] - rf)/(E[RM] - rf)')),
  (19, 'CAPM backwards: beta from a forecast return', dict(mode='find beta (prices or forecast)', rf=.03, rm=.10, fc=.135), dict(beta=1.5)),
  (19, 'CAPM backwards: the market risk premium', dict(mode='find rf or the market premium', rf=.03, beta=1.25, fc=.115), dict(mrp=.068, rm=.098, _off='E[RM] - rf = (E[Ri] - rf)/Beta(i)')),
  (19, 'CAPM backwards: rf from the premium', dict(mode='find rf or the market premium', mrp=.06, beta=.8, fc=.09), dict(rf=.042)),
  (19, 'CAPM backwards: rf from E[RM]', dict(mode='find rf or the market premium', rm=.11, beta=1.5, fc=.14), dict(rf=.05, mrp=.06)),
  (19, 'over/undervalued from prices', dict(mode='buy or sell? (over/undervalued)', rf=.04, rm=.10, beta=1.2, P0=50, P1=53, div=1.5),
   dict(fcR=.09, req=.112, alpha=-.022)),
  (19, 'two shares on the SML', dict(mode='two shares on the SML -> rf, premium', erA=.13, bA=1.5, erB=.08, bB=.5),
   dict(mrp=.05, rf=.055, rm=.105, _off='BetaA - BetaB')),
  (19, 'target beta before the betas', dict(mode='target return -> weights', rf=.02, mrp=.04, target=.0766), dict(bp=1.415)),
  # ---- 20 cost of capital
  (20, 'preference shares', dict(mode='rP: cost of preference shares', divpct=.10, par=20, pp=22.86), dict(rp=.0875)),
  (20, 'after-tax cost of debt', dict(mode='rD: cost of debt (one bond)', rd=.0425, Tc=.3), dict(rdat=.02975)),
  (20, 'cost of equity CAPM', dict(mode='rE: cost of equity', rf=.02, beta=1.55, rm=.10), dict(reC=.144)),
  (20, 'cost of equity DDM', dict(mode='rE: cost of equity', D0=.65, P0=60.5, g=.07), dict(reD=.0815)),
  (20, 'WACC', dict(E=612.5, Pv=58.5, D=128.7, re=.1425, rp=.0675, rd=.045, Tc=.3), dict(wacc=.1191)),
  (20, 'YTM from the bond', dict(mode='rD: cost of debt (one bond)', face=1000, cpn=.09, yrs=3, price=1025.77, Tc=.3), dict(rd=.08, rdat=.056)),
  (20, 'accept vs WACC', dict(E=50, D=50, re=.15, rd=.07, Tc=.3, irr=.0895), dict(wacc=.0995)),
  (20, 'same-risk projects vs the WACC (five boxes)', dict(E=70, D=30, re=.13, rd=.07, Tc=.3, irr=.12, irr2=.10, irr3=.09),
   dict(wacc=.1057, acc1=1, acc2=0, acc3=0)),
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
  (21, 'v24 rU from EBIT and VU in the rU mode', dict(mode='unlevered cost rU', EBIT=2500, Tc=.25, VU=15000), dict(FCF=1875, rU=.125, _off='rU = FCF/VU')),
  (21, 'rU mode, D blank: no Need line (rU is the answer)', dict(mode='unlevered cost rU', EBIT=840, Tc=.25, VU=4500), dict(FCF=630, rU=.14, _clean=True)),
  # ---- v24: Weeks 10-12 (own numbers, worked out in Python first)
  (20, 'v24 cost of debt: semi-annual bond, effective and APR', dict(mode='rD: cost of debt (one bond)', cpn=.07, yrs=15, ppct=.95, m='2 (semi-annual)', Tc=.3),
   dict(price=950, y=.037815, rd=.077061, rdApr=.075631, rdat=.053942, rdatApr=.052941, _sheet='ear')),
  (20, 'v24 cost of equity: g from past dividends', dict(mode='rE: cost of equity', h1=1.0, h2=1.05, h3=1.12, h4=1.17, h5=1.25, P0=30),
   dict(g=.057421, D1=1.321777, reD=.101481, _off='average of the yearly % changes')),
  (20, 'v24 WACC from a D/E ratio (after-tax rD)', dict(DE=.6, re=.12, rd=.045), dict(wE=.625, wD=.375, wacc=.091875)),
  (20, 'v24 WACC from target weights', dict(E=65, D=35, re=.14, rd=.07, Tc=.30), dict(wacc=.10815)),
  (20, 'v24 preference shares with an issue cost', dict(mode='rP: cost of preference shares', divp=2, pp=25, pfc=1), dict(np=24, rp=.083333)),
  (20, 'v24 weights: book and market', dict(mode='book AND market weights', nE=5e6, pE=12, bvps=3, F1=40e6, q1=.98, F2=20e6, q2=1.05),
   dict(Eb=15e6, Db=60e6, wEb=.2, wDb=.8, Em=60e6, Dm=60.2e6, wEm=.499168, wDm=.500832)),
  (20, 'v24 cost of debt: two bond issues', dict(mode='rD: cost of debt (two bond issues)', F1=40e6, c1=.06, n1=8, q1=.98, F2=20e6, c2=.08, n2=5, q2=1.05,
   m='2 (semi-annual)', Tc=.3), dict(y1=.031612, y2=.034018, D=60.2e6, rd=.065957, rdApr=.064902, rdat=.04617, rdatApr=.045432)),
  (20, 'v24 projects vs the SML and WACC', dict(mode='which projects to accept (betas)', rf=.04, rm=.11, wacc=.11, b1=.5, r1=.09, b2=1.3, r2=.12),
   dict(req1=.075, req2=.131, _sheet='capm')),
  (20, 'v24 project NPV at the WACC (+2%, issue costs)', dict(mode="a project's NPV (WACC, issue costs)", wacc=.09, adj=.02, FCF1=2e6, gp=.03, cost=20e6, fees=1e6),
   dict(rate=.11, pv=25e6, npv=4e6, _sheet='gperp')),
  (21, 'tax shield: a loan repaid each year', dict(mode='tax shield and levered value', D=60e6, rd=.10, Tc=.30, repay=20e6), dict(pvts=3078888.0, its1=1.8e6, its3=.6e6)),
  (20, 'all parts on one page: rD, rP, rE, WACC, projects', dict(mode='ALL parts: rD, rP, rE, WACC, projects', wD2=.3, wP2=.1, wE2=.6, Tc=.3, rd=.08, divp=6, pp=80, rf=.04, beta=1.2, mrp=.06, irr=.12, irr2=.09),
   dict(rdat=.056, rp=.075, re=.112, wacc=.0915, acc1=1, acc2=0)),
  (20, 'NPV given, issue costs as % of face', dict(mode="a project's NPV (WACC, issue costs)", npv0=10e6, fin=12e6, fpct=.04), dict(face=12.5e6, fees=.5e6, npv=9.5e6)),
  (20, 'project NPV at the WACC, issue costs as % of face', dict(mode="a project's NPV (WACC, issue costs)", wacc=.10, FCF1=1.5e6, gp=.02, cost=15e6, fpct=.05), dict(pv=18.75e6, fees=789473.68, npv=2960526.32)),
  (20, 'v24 project: highest cost worth paying', dict(mode="a project's NPV (WACC, issue costs)", wacc=.09, adj=.02, FCF1=2e6, gp=.03, fees=1e6), dict(maxcost=24e6)),
  (21, 'v24 tax shield on 8-year debt', dict(mode='tax shield and levered value', D=500e6, rd=.07, Tc=.3, yrsD=8), dict(its=10.5e6, pvts=62698634.3, _sheet='pva')),
  (21, 'v24 recap: price, shares bought, rE and WACC after', dict(mode='tax shield and levered value', D=4e5, rd=.08, Tc=.3, VU=1e6, rU=.12, shares=50000),
   dict(VL=1.12e6, E2=720000, price=22.4, nbuy=17857.14, re2=.135556, wacc2=.107143)),
  (21, 'v24 tax shield from the interest paid', dict(mode='tax shield and levered value', int=240000, rd=.12, Tc=.3), dict(D=2e6, its=72000, pvts=600000)),
  (21, 'v24 value from EBIT with the interest paid', dict(mode='value from cash flows (EBIT or FCF)', EBIT=3e6, Tc=.3, rU=.15, int=240000, rd=.12),
   dict(D=2e6, VU=14e6, VL=14.6e6, E=12.6e6)),
  (21, 'v24 levered equity returns by state', dict(mode='levered equity: returns by state', cf1=90, cf2=110, cf3=130, rU=.10, D=60, rd=.05),
   dict(V=100, E=40, owe=63, eq1=27, re1=-.325, re3=.675, re=.175, reMM=.175, ru1=-.1)),
  (21, 'v24 levered vs unlevered: better buy', dict(mode='levered vs unlevered: better buy?', EBIT=50e6, D=200e6, rd=.06, nL=3e6, pL=95, nU=10e6, pU=50),
   dict(VU=500e6, EL=285e6, VL=485e6, VLf=500e6, pfair=100, rU=.10, reAct=.133333, reMM=.128070)),
  (21, 'v24 agency costs (debt 50)', dict(mode='agency: risky strategies + debt', Dd=50, sA1=90, sB1=150, sBp=.5, sB2=20, sC1=320, sCp=.2, sC2=25),
   dict(fA=90, fB=85, fC=84, eA=40, eB=50, eC=54, agency=6)),
  (21, 'v24 agency costs (debt 20): none', dict(mode='agency: risky strategies + debt', Dd=20, sA1=90, sB1=150, sBp=.5, sB2=20, sC1=320, sCp=.2, sC2=25),
   dict(eA=70, agency=0)),
  (21, 'v24 debt overhang', dict(mode='debt overhang: fund the project?', X0=40, X1=90, inv=35, Fd=60, rr=.05),
   dict(E0=0, D0=38.095238, npv=12.619048, E1=28.571429, D1=57.142857, gainE=-6.428571, gainD=19.047619)),
  (23, 'v24 dividend: price before and after', dict(Vf=600e6, N=20e6, cash=50e6), dict(Pc=30, div=2.5, Pex=27.5, Vafter=550e6, _off='price - Div')),
  (23, 'v24 buy-back', dict(mode='share buy-back (repurchase)', Vf=600e6, N=20e6, cash=50e6), dict(Pc=30, nb=1666666.67, Nafter=18333333.3, Vafter=550e6, Pafter=30)),
  (23, 'v24 buy-back of a number of shares', dict(mode='share buy-back (repurchase)', Pc=16, N=2.5e6, nb=200000), dict(cash=3.2e6, Vafter=36.8e6, Pafter=16)),
  (23, 'v24 homemade dividend: sell', dict(mode='homemade dividend', n=200, Pc=25, div=1, want=1.5), dict(Pex=24, sell=4.166667, w=5000)),
  (23, 'v24 homemade dividend: reinvest', dict(mode='homemade dividend', n=200, Pc=25, div=1, want=0), dict(buy=8.333333, w=5000)),
  (23, 'v24 franked dividend vs classical', dict(mode='dividend tax: imputation (franking)', div=140, Tc=.3, tp=.45),
   dict(credit=60, gross=200, net=30, kept=110, keptC=77, totI=90, totC=123)),
  (23, 'v24 franked dividend: refund at a low rate', dict(mode='dividend tax: imputation (franking)', div=140, Tc=.3, tp=.19), dict(net=-22, kept=162)),
  (23, 'v24 capital gains tax vs a franked dividend', dict(mode='capital gains tax (50% discount)', buy=20, sell=30, n=1000, tp=.45, Tc=.3),
   dict(gain=10000, taxable=5000, cgt=2250, keptG=7750, keptD=7857.142857)),
  (23, 'v24 capital gains tax, held under a year', dict(mode='capital gains tax (50% discount)', gain=10000, tp=.45, held='12 months or less'),
   dict(taxable=10000, cgt=4500, keptG=5500)),
  (18, 'v24 weights from 4 holdings', dict(mode='weights from holdings', n1=10, px1=20, n2=20, px2=15, n3=5, px3=40, n4=10, px4=30), dict(tot=1000, w1=.2, w4=.3)),
  (20, 'v25 weights only, with preference shares', dict(nE=4e6, pE=25, D=60e6, Pv=15e6), dict(E=100e6, V=175e6, wE=.571429, wP=.085714, wD=.342857, _sheet='v')),
  (21, 'v23 FCF given directly', dict(mode='value from cash flows (EBIT or FCF)', FCF=900, Tc=.3, rU=.12, D=1000), dict(VU=7500, VL=7800, E=6800)),
  # ---- 24 Excel tables (Part C), own numbers, worked out independently (Python) first
  (24, 'Excel: replacement, avoided repair, dep turns negative', dict(mode='cash-flow table: a replacement', n=6, r=.10, Tc=.3,
   newC=120000, lifeN=4, saleN=10000, bvO=20000, saleO=14000, depO=4000, save=30000, avoid=15000, avYr=2),
   dict(FCF0=-104200, FCF1=28800, FCF2=39300, FCF3=28800, FCF4=28800, FCF5=19800, FCF6=28000, NPV=23869.32, taxO0=1800,
        avoid2=-15000, inc4=26000, inc5=-4000, inc6=0, EBIT2=19000, tax5=10200, taxN6=-3000,
        ebitnew2=0, ebitold2=-19000, taxnew5=-9000, taxold5=1200, depO6=0, fN0=-104200, fO2=-9300, _sheet='fcf,salv,npv,irr', _clean=True)),
  (24, 'Excel: replacement, gain on the old sale, running costs, DV dep, old end value', dict(mode='cash-flow table: a replacement',
   n=4, r=.08, Tc=.25, newC=60000, depR=.30, depM='diminishing value', saleN=15000, bvO=5000, saleO=9000, depO=2500, endO=1000,
   opexO=22000, opexN=8000, nwc=3000),
   dict(taxO0=-1000, FCF0=-55000, FCF1=14375, FCF2=13025, FCF3=12705, FCF4=29145, NPV=985.107, depN2=12600, inc3=8820, endO4=1000,
        taxE4=-250, nwc4=3000, depN3=8820, depO3=0, _clean=True)),
  (24, 'Excel: new project, revenue and costs grow 3%', dict(mode='cash-flow table: a new project', n=5, r=.12, Tc=.3, rev=80000,
   opex=30000, g=.03, newC=100000, lifeN=5, saleN=8000, nwc=10000),
   dict(FCF0=-110000, FCF1=41000, FCF2=42050, FCF5=60992.81, NPV=53557.03, rev3=84872, opex2=-30900, taxN5=-2400, nwc5=10000, _clean=True)),
  (24, 'Excel: new project, dep rate, sold at 0 (tax refund on the loss), NWC each year', dict(mode='cash-flow table: a new project',
   n=3, r=.15, Tc=.3, rev=50000, opex=20000, newC=45000, depR=.25, nwc=5000, nwcY=1000),
   dict(FCF0=-50000, FCF1=23375, FCF2=23375, FCF3=34750, NPV=10849.63, taxN3=3375, nwc1=-1000, nwc3=7000, _clean=True)),
  (24, 'Excel tree: act now or wait (waiting wins)', dict(mode='decision tree: act now or wait', c0=2000, vg=5000, pg=.7, cw=2600, tm=3, ear=.09),
   dict(npvNow=1425.397, npvWait=1644.192, optw=218.795, Enow=3500, Ewait=1680, _clean=True)),
  (24, 'Excel tree: act now or wait (acting now wins)', dict(mode='decision tree: act now or wait', c0=300, vg=1000, pg=.9, vb=200,
   cw=700, tm=6, ear=.12), dict(npvNow=569.318, npvWait=255.126, _clean=True)),
  (24, 'Excel tree: chance node and a choice today', dict(mode='decision tree: chance and decision nodes', v1=90000, p1=.3, v2=60000,
   p2=.5, v3=20000, t=1, ear=.10, I=50000, alt=12000), dict(E=61000, pv=55454.55, npvGo=5454.55, alt=12000, _clean=True)),
  (24, 'Excel tree: chance node, a blank probability, months', dict(mode='decision tree: chance and decision nodes', v1=1000, p1=.25,
   v2=400, tm=18, ear=.07), dict(E=550, pv=496.9206, _clean=True)),
]

# type 24 (Excel tables) must agree with the pages it shares its maths with: type 22 (replacement) and type 12 (trees).
# (inputs for type 24, the other type, its inputs, [(key on 24, key on the other)])
FCF6 = [('FCF0', 'CF0')] + [('FCF%d' % t, 'FCF%d' % t) for t in range(1, 7)]
XL_AGREE = [
  (dict(mode='cash-flow table: a replacement', n=6, r=.10, Tc=.3, newC=120000, lifeN=4, saleN=10000, bvO=20000, saleO=14000, depO=4000,
        save=30000, avoid=15000, avYr=2), 22,
   dict(n=6, r=.10, Tc=.3, newC=120000, lifeN=4, saleN=10000, bvO=20000, saleO=14000, depO=4000, save=30000, avoid=15000, avYr=2),
   FCF6 + [('NPV', 'NPV'), ('IRR', 'IRR'), ('taxO0', 'taxO'), ('inc5', 'dep5'), ('EBIT5', 'EBIT5'), ('tax5', 'tax5'), ('atp5', 'NOPAT5')]),
  (dict(mode='cash-flow table: a replacement', n=8, r=.10, Tc=.3, newC=90000, lifeN=4, saleN=11000, bvO=24000, saleO=15000, depO=3000,
        endO=2000, save=18000, avoid=25000, avYr=3, nwc=4000, nwcY=500), 22,
   dict(n=8, r=.10, Tc=.3, newC=90000, lifeN=4, saleN=11000, bvO=24000, saleO=15000, depO=3000, endO=2000, save=18000, avoid=25000,
        avYr=3, nwc=4000, nwcY=500),
   [('FCF0', 'CF0')] + [('FCF%d' % t, 'FCF%d' % t) for t in range(1, 9)] + [('NPV', 'NPV'), ('inc6', 'dep6')]),
  (dict(mode='cash-flow table: a new project', n=5, r=.12, Tc=.3, rev=80000, opex=30000, newC=100000, lifeN=5, saleN=8000, nwc=10000, nwcY=2000), 22,
   dict(n=5, r=.12, Tc=.3, rev=50000, newC=100000, lifeN=5, saleN=8000, nwc=10000, nwcY=2000),
   [('FCF0', 'CF0')] + [('FCF%d' % t, 'FCF%d' % t) for t in range(1, 6)] + [('NPV', 'NPV'), ('IRR', 'IRR')]),
  (dict(mode='decision tree: act now or wait', c0=2000, vg=5000, pg=.7, cw=2600, tm=3, ear=.09), 12,
   dict(mode='act now or wait (option to wait)', c0=2000, vg=5000, pg=.7, cw=2600, tm=3, r=.09),
   [('npvNow', 'npvNow'), ('npvWait', 'npvWait'), ('optw', 'optw'), ('Enow', 'Enow'), ('Ewait', 'Ewait')]),
  (dict(mode='decision tree: act now or wait', c0=300, vg=1000, pg=.9, vb=200, cw=700, t=.5, ear=.12), 12,
   dict(mode='act now or wait (option to wait)', c0=300, vg=1000, pg=.9, vb=200, cw=700, t=.5, r=.12),
   [('npvNow', 'npvNow'), ('npvWait', 'npvWait')]),
  (dict(mode='decision tree: chance and decision nodes', v1=90000, p1=.3, v2=60000, p2=.5, v3=20000, t=1, ear=.10), 12,
   dict(mode='chance node (expected value)', v1=90000, p1=.3, v2=60000, p2=.5, v3=20000, t=1, r=.10), [('E', 'E'), ('pv', 'pv')]),
]

def sheet_cells(out, years):
    """Every cell of type 24's table as Excel would hold it: (column letter, row) -> formula text (row 1 = the years)."""
    T = out.tbl
    cells, want = {}, {}
    for c in range(1, len(T.cols) + 1):
        if years: cells[('ABCDEFGHIJKLMNOPQRSTUVWXYZ'[c], 1)] = str(c - 1)
    for i in range(1, len(T.rows) + 1):
        rw = T.rows[i]
        for c in range(1, len(T.cols) + 1):
            if rw.xf[c] is not None:
                cells[('ABCDEFGHIJKLMNOPQRSTUVWXYZ'[c], i + 1)] = str(rw.xf[c])
                want[('ABCDEFGHIJKLMNOPQRSTUVWXYZ'[c], i + 1)] = rw.vals[c]
    return cells, want

def sheet_eval(cells):
    """Work out a small spreadsheet: numbers, + - * / ^, cell refs, SUM, NPV, MAX over ranges. Blank cells are 0."""
    import re
    COLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    memo = {}
    def cell(c, r):
        key = (c, r)
        if key in memo: return memo[key]
        f = cells.get(key)
        if f is None: v = 0.0
        else:
            e = f.lstrip('=')
            e = re.sub(r'([A-Z])(\d+):([A-Z])(\d+)', lambda m: 'R("%s",%s,"%s",%s)' % m.groups(), e)
            e = re.sub(r'\b([A-Z])(\d+)\b', lambda m: 'C("%s",%s)' % m.groups(), e)
            e = e.replace('^', '**')
            v = float(eval(e, {'__builtins__': {}}, {'R': rng, 'C': cell, 'SUM': SUM, 'NPV': NPV, 'MAX': max}))
        memo[key] = v
        return v
    def rng(c1, r1, c2, r2):
        return [cell(COLS[c], r) for c in range(COLS.index(c1), COLS.index(c2) + 1) for r in range(r1, r2 + 1)]
    def SUM(*a): return sum(sum(x) if isinstance(x, list) else x for x in a)
    def NPV(rate, xs): return sum(x / (1 + rate) ** (k + 1) for k, x in enumerate(xs))
    return {k: cell(*k) for k in cells}

def sheet_from_lines(texts, years):
    """Type 24's EXCEL lines ('row 7 EBIT: C7 =SUM(C2:C3)-C6, copy right to H7; ...') typed into a spreadsheet."""
    import re
    COLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    cells = {}
    for t in texts:
        m = re.match(r'row (\d+) [^:]+: (.*)$', t)
        if not m: continue
        for col, rn, f, to in re.findall(r'([A-Z])(\d+) (=\S+?)(?:, copy right to ([A-Z])\d+)?(?=; [A-Z]\d+ =|, [A-Z]\d+ =|$)', m.group(2)):
            c0 = COLS.index(col)
            for c in range(c0, (COLS.index(to) if to else c0) + 1):
                d = c - c0
                cells[(COLS[c], int(rn))] = re.sub(r'\b([A-Z])(\d+)\b', lambda mm: COLS[COLS.index(mm.group(1)) + d] + mm.group(2), f)
    if years:
        n = max(COLS.index(c) for c, r in cells) - 1
        for k in range(n + 1): cells[(COLS[k + 1], 1)] = str(k)
    return cells

# Excel layouts on the result page: rebuilt as a spreadsheet (tests/excel_rows.py) they must match the solver
EXCEL_CASES = [
  (22, 'IFC unit (NWC, revenue, saving)', dict(n=5, r=.12, Tc=.3, newC=750000, lifeN=5, saleN=75000, bvO=250000, saleO=275000,
                                                depO=50000, save=20000, rev=100000, nwc=40000, nwcY=10000)),
  (22, 'own numbers: dep turns plus, a cost avoided, old asset worth something at the end',
   dict(n=8, r=.10, Tc=.3, newC=90000, lifeN=4, saleN=11000, bvO=24000, saleO=15000, depO=3000, endO=2000, save=18000,
        avoid=25000, avYr=3)),
  (12, 'act now or wait (concert)', dict(mode='act now or wait (option to wait)', c0=500, vg=900, pg=.7, cw=750, tm=6, r=.10)),
  (12, 'own numbers: waiting wins', dict(mode='act now or wait (option to wait)', c0=800, vg=2000, pg=.5, cw=1200, tm=3, r=.09)),
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
        clean = want.pop('_clean', False)   # True: the page must show no 'Need' line either
        vt = lua.table_from(V)
        out = CORE.run(t, vt)
        vals = out.vals
        bad_rows = [r.text for r in out.rows.values() if r.kind in (('err', 'need') if clean else ('err',))]
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
    # the EXCEL lines of a result page, typed into a spreadsheet, must give the solver's own numbers
    import excel_rows
    for t, name, V in EXCEL_CASES:
        out = CORE.run(t, lua.table_from(V))
        texts = [str(r.text) for r in out.rows.values() if r.text is not None and r.kind in ('note', 'xl')]
        try:
            if t == 22:
                got = excel_rows.replacement(texts)
                want_cf = [out.vals['CF0']] + [out.vals['FCF' + str(k)] for k in range(1, int(V['n']) + 1)]
                ok = len(got['FCF']) == len(want_cf) and all(abs(a - b) < 0.01 for a, b in zip(got['FCF'], want_cf))
                ok = ok and (got['NPV'] is None or abs(got['NPV'] - out.vals['NPV']) < 0.01)
            else:
                got = excel_rows.wait_tree(texts)
                ok = abs(got['now'] - out.vals['npvNow']) < 0.01 and abs(got['wait'] - out.vals['npvWait']) < 0.01
        except Exception as e:
            ok, got = False, repr(e)
        if not ok:
            fails += 1
            print(f'FAIL excel rows type {t} {name}: {got}')
    # type 24: every cell's formula, worked out as Excel would, gives the cell's number; the EXCEL lines typed in give
    # the same FCF row and NPV; and the numbers agree with type 22 / type 12 for the same inputs
    for t, name, V, _ in [c for c in CASES if c[0] == 24]:
        out = CORE.run(t, lua.table_from(V))
        years = str(V['mode']).startswith('cash-flow')
        cells, want = sheet_cells(out, years)
        try:
            got = sheet_eval(cells)
            bad = [f'{k}: {cells[k]} = {got[k]}, table shows {w}' for k, w in want.items() if w is not None and abs(got[k] - w) > 0.005]
            texts = [str(r.text) for r in out.rows.values() if r.kind == 'xl']
            got2 = sheet_eval(sheet_from_lines(texts, years))
            for k, w in want.items():
                if w is not None and abs(got2.get(k, 1e99) - w) > 0.005: bad.append(f'EXCEL lines {k}: {got2.get(k)} vs {w}')
        except Exception as e:
            bad = [repr(e)]
        if bad:
            fails += 1
            print(f'FAIL excel table type 24 {name}: ' + '; '.join(bad[:5]))
    # type 24, a replacement with nothing typed: the empty layout (formulas in words, no numbers) and the need line
    out = CORE.run(24, lua.table_from(dict(mode='cash-flow table: a replacement')))
    import re as _re
    bad = []
    if out.tbl is None or len(out.tbl.rows) != 28: bad.append('no 28-row layout table')
    else:
        if not out.tbl.showF: bad.append('the layout opens on numbers, not formulas')
        labs = [str(out.tbl.rows[i].label) for i in range(1, 29)]
        for want in ('REPLACE (new)', 'KEEP (old)', 'NEW - OLD', 'FCF if REPLACE', 'FCF if KEEP', 'FCF (new - old)', 'NPV'):
            if want not in labs: bad.append('missing row ' + want)
        for i in range(1, 29):
            rw = out.tbl.rows[i]
            for c in range(1, 5):
                f = rw.xf[c]
                if rw.vals[c] is not None: bad.append(f'row {i + 1} has a number')
                if f is not None and _re.sub(r'[A-E]\d+|\(1\+r\)', '', str(f)).strip('=') and _re.search(r'\d', _re.sub(r'[A-E]\d+|\(1\+r\)', '', str(f))):
                    bad.append(f'row {i + 1}: {f}')
        if str(out.tbl.rows[13].xf[1]) != '=B3+B4+B5+B10+B11+B12+B13' or str(out.tbl.rows[26].xf[3]) != '=D14-D25':
            bad.append('FCF formulas wrong')
    kinds = [str(r.kind) for r in out.rows.values()]
    if 'need' not in kinds or kinds.count('xl') < 28: bad.append(f'need/xl lines missing: {kinds}')
    if bad:
        fails += 1
        print('FAIL type 24 empty layout: ' + '; '.join(bad[:6]))
    for V24, t2, V2, pairs in XL_AGREE:
        a, b = CORE.run(24, lua.table_from(V24)).vals, CORE.run(t2, lua.table_from(V2)).vals
        bad = [f'{k1}={a[k1]} vs type {t2} {k2}={b[k2]}' for k1, k2 in pairs if a[k1] is None or b[k2] is None or abs(a[k1] - b[k2]) > 1e-6]
        if bad:
            fails += 1
            print(f'FAIL type 24 vs type {t2} ({V24["mode"]}): ' + '; '.join(bad))
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
    total = len(CASES) + len(EXCEL_CASES) + len([c for c in CASES if c[0] == 24]) + len(XL_AGREE)
    print(f'{total - fails} passed, {fails} failed; number boxes: {len(PARSE) - pfails} passed, {pfails} failed')
    sys.exit(1 if fails or pfails else 0)

if __name__ == '__main__':
    main()
