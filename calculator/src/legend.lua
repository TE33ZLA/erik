----------------------------------------------------------------------
-- THE LEGEND (key L, from any page): every letter on the exam formula
-- sheet and what it means, in the sheet's own order and sections.
-- Our own words. Each symbol line is drawn like a sheet line, with its
-- meaning under it. ASCII only.
----------------------------------------------------------------------
LEGEND = [[## EVERY LETTER ON THE FORMULA SHEET
In the sheet's order. On paper rates are
decimals (7% = 0.07); in the solver's boxes
they are percent (type 7).
up/down: scroll, left/right: a page.

@@Financial Mathematics
@=FVn
future value: the amount at the END of n
periods ('grows to', 'will have')
@=PV
present value: the amount TODAY (time 0)
@=r
the interest (discount) rate PER PERIOD.
Monthly: APR/12. Half-yearly: APR/2
@=n
the number of periods (or payments).
5 years paid monthly: n = 60
@=C
the cash flow each period (the payment).
Growing formulas: the FIRST cash flow, one
period from now
@=annuity / annuity due
equal cash flows for n periods: at the END
of each period / at the START ('in advance',
'first payment today')
@=perpetuity / growing perpetuity
equal cash flows FOREVER / growing by g
forever (needs r > g)
@=g
the growth rate of the cash flow each period
(a fall: negative)
@=growing annuity
cash flows for n periods that grow by g
@=EAR
effective annual rate: the TRUE yearly rate
once compounding is counted
@=APR
the QUOTED yearly rate, before compounding
('12% p.a. compounded monthly': APR = 12%)
@=m
compounding periods a year: monthly 12,
quarterly 4, half-yearly 2, daily 365
@=lambda
interpolation weight: how far from r1 to r2
the answer lies (0 to 1)
@=A1, A2
the value you want to be zero (e.g. the NPV)
at the trial rates r1 and r2: A1 > 0 > A2
@=r1, r2
the two trial rates
@=Interpolated r
the estimated rate between r1 and r2 (an
IRR or a YTM)

@@Valuation of Bonds and Shares
@=PBond
the bond's price today ('sells for 96% of
face' = 0.96 x face)
@=C (bonds)
the coupon PER PERIOD = coupon rate x face /
coupons a year
@=i
the yield (YTM) PER PERIOD. Half-yearly:
YTM/2
@=n (bonds)
coupon periods LEFT until maturity
@=FVn (bonds)
the face (par) value repaid at maturity,
usually $1,000 or $100
@=P0
the share price today
@=D1
the dividend in ONE year. 'Just paid' is D0:
D1 = D0 x (1 + g)
@=rE
the required return on the shares (the cost
of equity)
@=g (shares)
the dividend's constant growth, forever
@=D2 ... Dn
the dividends in years 2 to n
@=Pn
the share price at the end of year n

@@Capital Budgeting
@=NPV
net present value: every cash flow in
today's dollars, added. Accept if NPV > 0
@=NCF0
the net cash flow today (usually the
investment, so NEGATIVE)
@=NCFt, NCFn
the net cash flow at the end of year t (or
of the last year, n)
@=r (projects)
the discount rate: the cost of capital
@=IRR
the rate that makes NPV = 0. Accept if the
IRR > the cost of capital
@=Sum (the sigma sign)
add up the terms for every year t
@=PI
profitability index = NPV / resource
consumed (rank projects when money is short)
@=Resource consumed
what the project uses up: usually the
initial investment
@=NPVinf (NPV with the infinity sign)
the NPV of repeating the project forever
@=NPV0
the NPV of ONE run (cycle) of the project
@=EAV
equivalent annual value: the NPV spread
evenly over the years (different lives)
@=Real Interest Rate
the rate after inflation: growth in buying
power (use with REAL cash flows)
@=Nominal Interest Rate
the normal quoted rate, in dollars (use
with NOMINAL cash flows)
@=inflation rate
how fast prices rise each year
@=FCF
free cash flow for the year
@=Rev, Costs
revenue (sales); operating costs (NOT
depreciation, NOT interest)
@=Dep
depreciation for the year (straight line:
cost / life)
@=tc
the company tax rate
@=CapEx
capital expenditure: money spent on assets
that year
@=Change in NWC
NWC this year - NWC last year (NWC =
inventory + receivables - payables). A rise
is a cash OUTflow
@=After-tax salvage
the cash kept from selling the asset
@=SV
salvage value: the price the asset sells for
@=BV
book value: its cost - all depreciation so
far (0 if fully depreciated)

@@Working Capital
@=Inventory Days
days of cost of sales held as inventory
@=Inventory
inventory on the balance sheet
@=Average daily COGs
yearly cost of goods sold / 365
@=A/R Days
days customers take to pay
@=Accounts receivable
money customers still owe the firm
@=Average daily sales
yearly sales / 365
@=A/P Days
days the firm takes to pay its suppliers
@=Accounts Payable
money the firm still owes its suppliers
@=CCC
cash conversion cycle: the days the firm's
own cash is tied up

@@Risk and Return
@=E(Ri)
expected return of asset i: each state's
return x its probability, added
@=Rik
the return of asset i in state k ('boom',
'recession')
@=Pk
the probability of state k (they add to 1)
@=n (states)
the number of states
@=sigma_i^2
the variance of asset i (a decimal, e.g.
0.0242)
@=sigma_i
the standard deviation (SD) of i = the
square root of the variance ('volatility')
@=R(t+1)
the realised return from t to t + 1
@=DIV(t+1)
the dividend received during the year
@=P(t+1), Pt
the price at the END and at the START of the
year ('sold at', 'bought at')
@=R-bar (R with a bar)
the average (mean) of the past returns
@=R1 ... RT, T
the past returns; T = how many there are
@=Var(R)
sample variance of past returns (divide by
T - 1)
@=Cov(Ri, Rj)
covariance: how two returns move together
@=Ri,n, Rj,n, N
the returns of i and j in state (or period)
n; N = the number of past periods
@=rho_ij = Corr(Ri, Rj)
correlation: the covariance scaled to -1 ...
+1
@=CV
coefficient of variation = risk per unit of
return (lower = better)
@=sigma_Ri
the SD of the returns of i
@=E[Rp]
the expected return of a portfolio
@=w1 ... wn, wi, wj
portfolio weights: the share of the money in
each asset (they add to 1)
@=sigma_p^2, sigma_P
the variance and the SD of the portfolio
@=Sharpe Ratio
the extra return over rf per unit of risk
(higher = better)
@=rf
the risk-free rate ('Treasury bills',
'government bonds')
@=beta_i
how much asset i moves with the market (the
market's beta = 1)
@=Cov(Ri, RM)
the covariance of asset i with the market
@=sigma_M, sigma_M^2
the SD and the variance of the MARKET
@=E[RM]
the expected return of the market
@=E[RM] - rf
the market risk premium (given as a
'premium'? it is already the difference)
@=beta_p
portfolio beta: the weighted average of the
betas

@@Cost of Capital
@=Rp, rp
the cost of preference shares
@=DIVp
the preference dividend per share (dividend
rate x par)
@=Pp
the price of a preference share
@=rWACC
weighted average cost of capital
@=re, rE
the cost of equity (CAPM or dividend growth)
@=rd, rD
the PRE-tax cost of debt = the yield (YTM),
NOT the coupon rate. 'Effective' or
'after-tax' already has the tax taken off
@=Tc
the company tax rate
@=E, P, D
MARKET values of equity (shares x price),
preference shares and debt (not book values)
@=V
total value = E + P + D
@=E/V, P/V, D/V
the weights (they add to 1)

@@Capital Structure - No Tax World
@=E, D
the market values of equity and debt
@=U
the value of the unlevered firm (the same
firm with no debt)
@=A
the value of the firm's assets
@=rU
unlevered cost of capital: the cost of
equity if there were no debt
@=rE
levered cost of equity (rises with D/E)
@=rD
the cost of debt
@=rA
the return on the assets (= rU)
@=D/E
the debt-to-equity ratio (not D/(E + D))

@@Capital Structure - Tax World
@=VL
the value of the LEVERED firm (with debt)
@=VU
the value of the UNLEVERED firm (no debt)
@=Interest tax shield
the tax saved each year: interest is tax
deductible
@=Interest
the interest paid in the year = rD x D
@=PV(Interest tax shield)
today's value of all the future tax shields
@=Permanent Debt
debt kept forever: PV(tax shield) = Tc x D
@=Tc (tax world)
the company tax rate]]
