----------------------------------------------------------------------
-- MULTI-STEP QUESTIONS (home key M): questions that mix topics, as a
-- chain of steps. Each step opens the solver page that does it; after
-- ENTER the answer page says what to carry, and M opens the next step
-- with the carried numbers already typed in.
--   go   = the page (as in the finder: type, want, set = { mode = prefix })
--   take = { output key = box key of a later step }   (carried forward)
--   say  = one or two short lines: what to type (shown on the step page)
-- Our own words and numbers. ASCII only.
----------------------------------------------------------------------
RECIPES = {
  { t = "Project value: cash flow, then its PV",
    s = "'revenues', 'costs', 'tax', then 'for 10 years', 'forever', 'falls 3% a year'",
    how = "1) the free cash flow each year, after tax. 2) value those cash flows: n years, then forever.",
    steps = {
      { t = "FCF each year (after tax)", page = "3, 3", go = { type = 9 }, take = { FCF = "C" },
        say = "Tc, revenue, costs (the INCREASE only), lost sales. Sunk costs + their Dep: leave out" },
      { t = "PV of the FCF (n years, then forever)", page = "1, 2", go = { type = 2, want = "PV" },
        say = "C is carried in. r; n = years of stage 1; g2 = growth after (fall: -3). Forever: n blank" },
    } },
  { t = "Share price after borrowing (MM, tax)",
    s = "'borrow $X', 'interest only', 'keeps the balance', 'free cash flows', 'distress', 'share price'",
    how = "VU = FCF/rU (the LOWER FCF if distress cuts it), VL = VU + Tc x D, equity = VL - D, price = equity/shares.",
    steps = {
      { t = "value, equity and the share price", page = "7, 2, 5", go = { type = 21, set = { mode = "value from cash flows" } },
        say = "FCF (the LOWER one), Tc, rU, D (kept forever), shares. Read 'share price'" },
    } },
  { t = "Portfolio from a variance-covariance matrix",
    s = "'variance-covariance matrix', '$30,000 in A, $45,000 in B, the rest in T-bills'",
    how = "Diagonal = variances (Var A: row A, column A). Off the diagonal = covariances (row B, column A). Market: not needed.",
    steps = {
      { t = "the portfolio's SD (and return)", page = "6, 2, 6", go = { type = 18, set = { mode = "two shares + the risk-free" } },
        say = "$ in A, $ in B, total $; Var A, Var B (diagonal), Cov (row B, col A). Read 'portfolio SD'" },
    } },
  { t = "Billing firm or lockbox: value of the fees",
    s = "'billing firm', 'lockbox', 'collections arrive 4 days sooner', 'value today of the charges'",
    how = "Cash freed today = daily collections x days saved. A fee every month forever: PV = fee/(APR/12).",
    steps = {
      { t = "cash freed, PV of the fees, NPV", page = "5, 1, 6", go = { type = 14, set = { mode = "float" } },
        say = "daily collections, days saved, fee a month, APR. Charges' value = 'PV of all the fees'" },
    } },
  { t = "WACC from scratch: rE, rD, rP, then WACC",
    s = "'beta', 'bonds sell for 95% of face', 'preference dividend', then 'what is the WACC?'",
    how = "Work out each cost on its own page, then the WACC page has them typed in. Skip a step if its cost is given.",
    steps = {
      { t = "rE: cost of equity", page = "7, 1, 3", go = { type = 20, set = { mode = "rE:" } }, take = { reC = "re", reD = "re" },
        say = "beta given: rf, beta, E[RM] or premium. Dividends: D0 or D1, P0, g" },
      { t = "rD: cost of debt (a bond)", page = "7, 1, 4", go = { type = 20, set = { mode = "rD: cost of debt (one" } }, take = { rd = "rd" },
        say = "coupon %, years LEFT, price or % of face, coupons a year. YTM given? skip" },
      { t = "rP: cost of preference shares", page = "7, 1, 6", go = { type = 20, set = { mode = "rP:" } }, take = { rp = "rp" },
        say = "the preference dividend and its price. None? skip this step" },
      { t = "the WACC", page = "7, 1, 1", go = { type = 20, set = { mode = "the WACC" } }, take = { wacc = "k" },
        say = "rE, rD, rP carried in. Type E, D, P (MARKET values) and Tc. Read 'WACC'" },
    } },
  { t = "Project NPV at the WACC",
    s = "'cost of capital', 'WACC' and the project's cash flows: 'should it go ahead?'",
    how = "1) the WACC (or skip it if given). 2) the NPV of the cash flows at that rate.",
    steps = {
      { t = "the WACC", page = "7, 1, 1", go = { type = 20, set = { mode = "the WACC" } }, take = { wacc = "k" },
        say = "E, D, P (market values) or weights, each cost, Tc. 'Effective' rD: Tc blank" },
      { t = "NPV and IRR of the project", page = "3, 1", go = { type = 7 },
        say = "k (the WACC) carried in. CF0 today as a MINUS, then CF1, CF2 ..." },
    } },
  { t = "Project with its own beta: CAPM, then NPV",
    s = "'the project's beta is 1.25' and its cash flows",
    how = "The project's OWN risk sets its rate: rate = rf + beta(E[RM] - rf). Then its NPV at that rate.",
    steps = {
      { t = "the required return (CAPM)", page = "6, 3, 1", go = { type = 19, set = { mode = "required return" } }, take = { req = "k" },
        say = "rf, the project's beta, E[RM] or the market premium" },
      { t = "NPV and IRR of the project", page = "3, 1", go = { type = 7 },
        say = "k carried in. CF0 today as a MINUS, then CF1, CF2 ..." },
    } },
  { t = "Share price from beta and dividends",
    s = "'beta of 1.2', 'just paid a dividend of $2', 'grows at 3%'",
    how = "1) rE from CAPM. 2) price = D1/(rE - g), D1 = D0 x (1 + g).",
    steps = {
      { t = "rE (CAPM)", page = "6, 3, 1", go = { type = 19, set = { mode = "required return" } }, take = { req = "rE" },
        say = "rf, beta, E[RM] or the market premium" },
      { t = "the share price", page = "2, 3", go = { type = 6, want = "P0" },
        say = "rE is carried in. D0 (just paid) or D1, and g" },
    } },
  { t = "New debt-equity ratio: unlever, relever",
    s = "'changes its capital structure', 'new D/E of 1', 'borrows to buy back shares'",
    how = "rU does not change with debt: find it from the OLD mix, then put the NEW D/E into the rE formula.",
    steps = {
      { t = "rU from the old mix", page = "7, 2, 2", go = { type = 21, set = { mode = "unlevered cost rU" } }, take = { rU = "rU" },
        say = "rE, rD, E and D (the OLD values)" },
      { t = "rE (and WACC) at the new D/E", page = "7, 2, 1", go = { type = 21, set = { mode = "cost of equity rE" } },
        say = "rU is carried in. rD, the NEW D/E, Tc if there is tax" },
    } },
}
