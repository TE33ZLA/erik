----------------------------------------------------------------------
-- MY MISTAKES (home K): the traps from the weekend's practice, each
-- with its formula first. Own words and own example numbers only.
----------------------------------------------------------------------
MISTAKES_DOC = [[## 1. Plug in POSITIVE numbers
$$OCF = (Rev - Costs - Dep)*(1 - T_c) + Dep
$$FCF = OCF - CapEx - dNWC
The formula carries the signs.
TRAP: typing costs as negatives flips them twice.
Excel needs brackets: =(C6+C7)*0.7, not =C6+C7*0.7.

## 2. CapEx: tax only on SALES
$$CapEx = Buy - Sale + (Sale - BV)*T_c
Sale ABOVE book value = a gain = tax PAID (+). Sale BELOW book value = a loss = a tax REFUND (-). Book value itself is not cash.
The end sale, fully depreciated (BV = 0):
$$CapEx = -Sale*(1 - T_c)
TRAP: the end sale is cash IN, so it is NEGATIVE CapEx.
A sale given 'after tax': don't tax it again.

## 3. Replacement table
$$NPV = NPV_new - NPV_old
Selling the old machine only happens in REPLACE.
TRAP: KEEP has no sale in year 0.
The old dep runs only until its book value is used up: years = BV / Dep.

## 4. Only what CHANGES
$$incremental = with project - without
Costs go from 15 to 38: use 23. Lost sales on other products (cannibalisation): subtract them.
TRAP: sunk costs stay OUT: a study already paid, a building already owned (and its depreciation).
Interest is never in FCF.

## 5. NWC
$$NWC = Inventory + Receivables - Payables
$$dNWC = NWC_t - NWC_(t - 1)
NWC up = cash out (subtract). All of it back at the end, no tax. Not in the question: 0.

## 6. Perpetuity that starts later
$$PV_1 = C/r*(1 - 1/(1 + r)^n)
$$TV_n = (C_(n + 1))/(r - g)
$$PV_2 = (TV_n)/((1 + r)^n)
C/(r - g) gives the value ONE YEAR BEFORE its first payment.
TRAP: discount it by (1 + r)^n.
C(n + 1) = C(n) x (1 + g): one payment, grown at g, never at r. The same forever from year 1: just C/r.

## 7. EAR or APR: bringing money back
EAR = the true rate for a whole year. Use a POWER, the time in years:
$$PV = (FV)/((1 + EAR)^(months/12))
e.g. 600 in 2 months, EAR 7%: 600 / 1.07^(2/12) = 593.27
APR = the quoted rate, compounded m times a year. DIVIDE by m, then count the periods:
$$PV = (FV)/((1 + APR/m)^periods)
e.g. 600 in 2 months, APR 7% monthly: 600 / (1 + 0.07/12)^2 = 593.06
Years with a monthly APR: periods = years x 12. Quarterly: divide by 4, years x 4.
TRAP: never halve an EAR: 1.06^2 = 1.1236, not 1.12.

## 8. Decision tree: book now or wait
$$E[V] = p*V_good + (1 - p)*V_bad
$$NPV_now = -cost_0 + (E[V])/((1 + r)^t)
$$NPV_wait = (p*(V - cost_later))/((1 + r)^t)
Money paid TODAY is not discounted. Waiting: only the good branch, times its chance p.

## 9. Share price after borrowing (work backwards)
$$V_U = (FCF)/(r_U)
$$V_L = V_U + T_c*D
$$E = V_L - D
$$P = (E)/(shares)
TRAP: the tax shield is Tc x D (not Tc x VU), and it is ADDED.
FCF is already after tax: don't tax it again.

## 10. MM and WACC
$$r_E = r_U + D/E*(r_U - r_D)*(1 - T_c)
With tax: solve this for rU.
TRAP: the weighted-average rU is for NO TAX only.
No tax: rE RISES with D/E, the WACC stays the same. With tax: the WACC falls.
D/V = (D/E) / (1 + D/E). Use THIS question's Tc: 30% -> x 0.70.
CAPM: rE = rf + beta x MRP. Don't subtract rf again.

## 11. Portfolio
$$rho_AB = (Cov(A, B))/(SD_A*SD_B)
$$Var_p = w_A^2*Var_A + w_B^2*Var_B + 2*w_A*w_B*Cov
TRAP: correlation DIVIDES by the SDs.
Risk-free money: SD 0, Cov 0.
Risk, low to high: T-bills < govt bonds < corp bonds < large < small shares.

## In the exam
Check each number with the solver (S = search). Excel layout: X then 5. Stuck? Move on and come back.]]
