----------------------------------------------------------------------
-- MULTI-STEP QUESTIONS (home key M): questions that mix topics, as a
-- chain of steps. Each step opens the solver page that does it; after
-- ENTER the answer page says what to carry, and M opens the next step
-- with the carried numbers already typed in.
--   go   = the page (as in the finder: type, want, set = { mode = prefix })
--   take = { output key = box key of a later step }   (carried forward)
--   keep = { box key, ... }: what was TYPED in this box is typed into the
--          box with the same key on later steps (e.g. Tc, the rate k)
--   read = output key(s) of this step's answer: shown at the top of the
--          answer page, so the right line is easy to find
--   say  = one or two short lines: what to type (shown on the step page)
--   words = extra search words (key S finds the recipe)
-- Our own words and numbers. ASCII only.
----------------------------------------------------------------------
RECIPES = {
  { t = "Project value: cash flow, then its PV or NPV",
    s = "'revenues', 'costs', 'tax', then 'for 10 years', 'forever', 'falls 4% a year', 'costs $X today'",
    how = "1) the free cash flow each year, after tax (and the change in NWC). 2) value those cash flows: n years, then forever; minus the cost today = NPV.",
    words = "pv of the project | value of the project today | value of the new product | incremental cash flows | then decline | in perpetuity | sunk cost | side effect | lost sales | npv of the project | same cash flow each year | change in nwc | working capital",
    steps = {
      { t = "FCF each year (after tax)", page = "3, 3", go = { type = 9 }, take = { FCF = "C" }, read = "FCF",
        say = "Tc, revenue, costs (the INCREASE only), lost sales. Sunk costs + their Dep: leave out" },
      { t = "PV of the FCF (n years, then forever)", page = "1, 2", go = { type = 2, want = "PV" }, read = "PV",
        say = "C carried in. r; n (blank = forever); g2 after n (-3 = falls). Cost today? 'price'" },
    } },
  { t = "Share price after borrowing (MM, tax)",
    s = "'borrow $X', 'interest only', 'keeps the balance', 'free cash flows', 'distress', 'share price'",
    how = "VU = FCF/rU (the LOWER FCF if distress cuts it), VL = VU + Tc x D, equity = VL - D, price = equity/shares.",
    words = "interest only | finance with leverage | borrow to fund | shares outstanding | unlevered discount rate | financial distress costs",
    steps = {
      { t = "value, equity and the share price", page = "7, 2, 5", go = { type = 21, set = { mode = "value from cash flows" } }, read = "price",
        say = "FCF (the LOWER one), Tc, rU, D (kept forever), shares. Read 'share price'" },
    } },
  { t = "Portfolio from a variance-covariance matrix",
    s = "'variance-covariance matrix', '$35,000 in A, $45,000 in B, the rest in T-bills'",
    how = "Diagonal = variances (Var A: row A, column A). Off the diagonal = covariances (row B, column A). Market: not needed.",
    words = "covariance matrix | standard deviation of the portfolio | sd of the portfolio | risk-free asset | balance in | invest in share a and share b",
    steps = {
      { t = "the portfolio's SD (and return)", page = "6, 2, 6", go = { type = 18, set = { mode = "two shares + the risk-free" } }, read = "sdp",
        say = "$ in A, $ in B, total $; Var A, Var B (diagonal), Cov (row B, col A). Read 'portfolio SD'" },
    } },
  { t = "Billing firm or lockbox: value of the fees",
    s = "'billing firm', 'lockbox', 'collections arrive 4 days sooner', 'value today of the charges'",
    how = "Cash freed today = daily collections x days saved. A fee every month forever: PV = fee/(APR/12).",
    words = "billing service | collection float | float reduced | daily collections | charges per month | monthly fee | value today of the charges",
    steps = {
      { t = "cash freed, PV of the fees, NPV", page = "5, 1, 6", go = { type = 14, set = { mode = "float" } }, read = "pvfees",
        say = "daily collections, days saved, fee a month, APR. Charges' value = 'PV of all the fees'" },
    } },
  { t = "WACC from scratch: rE, rD, rP, then WACC",
    s = "'beta', 'bond price' or 'YTM', 'preference dividend', then 'cost of capital' or 'WACC'",
    how = "All parts on ONE page: 7, 1, 0. Or one cost per step below; the WACC page gets them typed in",
    words = "overall cost of capital | cost of preferred equity | preferred stock | cost of ordinary equity | after-tax rD | cost of debt after tax | bond price to wacc | yield to maturity | capital structure weights",
    steps = {
      { t = "rE: cost of equity", page = "7, 1, 3", go = { type = 20, set = { mode = "rE:" } }, take = { reC = "re", reD = "re" }, read = { "reC", "reD" },
        say = "beta given: rf, beta, E[RM] or premium. Dividends: D0 or D1, P0, g" },
      { t = "rD: cost of debt (a bond)", page = "7, 1, 4", go = { type = 20, set = { mode = "rD: cost of debt (one" } }, take = { rd = "rd" }, keep = { "Tc", "rd" }, read = { "rd", "rdat" },
        say = "YTM given: type it in 'rD pre-tax', + Tc. Or the bond: coupon %, years LEFT, price, coupons a year" },
      { t = "rP: cost of preference shares", page = "7, 1, 6", go = { type = 20, set = { mode = "rP:" } }, take = { rp = "rp" }, read = "rp",
        say = "the preference (preferred) dividend and its price. None? skip this step" },
      { t = "the WACC", page = "7, 1, 1", go = { type = 20, set = { mode = "the WACC" } }, take = { wacc = "k" }, read = "wacc",
        say = "rE, rD, rP (and Tc) carried in. Type E, D, P: MARKET values or the weights (e.g. 55, 35, 10)" },
    } },
  { t = "Project NPV: its rate (WACC or beta), then NPV",
    s = "'WACC', 'cost of capital' or 'the project's beta is 1.25', and its cash flows: 'go ahead?'",
    how = "The rate first: the firm's WACC (same risk as the firm) OR the CAPM rate from the project's OWN beta. Then the NPV at that rate.",
    words = "npv at the wacc | discount at the wacc | accept the project | project beta | beta of the project | required return on the project",
    steps = {
      { t = "the WACC (same risk as the firm)", page = "7, 1, 1", go = { type = 20, set = { mode = "the WACC" } }, take = { wacc = "k" }, read = "wacc", nxt = 3,
        say = "E, D, P (market values) or weights, each cost, Tc. Then M: step 3" },
      { t = "or: CAPM rate (the project's own beta)", page = "6, 3, 1", go = { type = 19, set = { mode = "required return" } }, take = { req = "k" }, read = "req",
        say = "rf, the PROJECT's beta, E[RM] or the market premium" },
      { t = "NPV and IRR of the project", page = "3, 1", go = { type = 7 }, read = { "NPVA", "IRRA" },
        say = "k (the rate) carried in. CF0 today as a MINUS, then CF1, CF2 ..." },
    } },
  { t = "Share price from beta and dividends",
    s = "'beta of 1.2', 'just paid a dividend of $2', 'grows at 3%'",
    how = "1) rE from CAPM. 2) price = D1/(rE - g), D1 = D0 x (1 + g).",
    words = "dividend growth with beta | value of the share with capm",
    steps = {
      { t = "rE (CAPM)", page = "6, 3, 1", go = { type = 19, set = { mode = "required return" } }, take = { req = "rE" }, read = "req",
        say = "rf, beta, E[RM] or the market premium" },
      { t = "the share price", page = "2, 3", go = { type = 6, want = "P0" }, read = "P0",
        say = "rE is carried in. D0 (just paid) or D1, and g" },
    } },
  { t = "Levered vs unlevered: rU, then rE and WACC",
    s = "'two firms identical except for debt', 'all-equity value', 'new D/E of 0.5', 'borrows to buy back shares'",
    how = "rU does not change with debt: find it from the OLD mix (rE, rD, E, D) or from EBIT, Tc and VU. Then put the D/E into the rE formula.",
    words = "levered firm | unlevered firm | rE of both firms | wacc of each firm | identical firms | changes its capital structure | new debt-equity ratio | unlever relever",
    steps = {
      { t = "rU (= the unlevered firm's WACC)", page = "7, 2, 2", go = { type = 21, set = { mode = "unlevered cost rU" } }, take = { rU = "rU" }, keep = { "Tc", "rd" }, read = "rU",
        say = "the OLD rE, rD, E, D; or EBIT, Tc and VU (all-equity value, lower down)" },
      { t = "rE and WACC at the D/E (levered firm)", page = "7, 2, 1", go = { type = 21, set = { mode = "cost of equity rE" } }, read = { "re", "wacc" },
        say = "rU (and Tc) carried in. rD, the D/E (or E and D). Read 'rE' and 'WACC'" },
    } },
  { t = "Different lives: NPV of each, then EAA",
    s = "'machine A lasts 3 years, B lasts 5', 'equivalent annual cost', 'which one per year?'",
    how = "1) each project's NPV (costs: as MINUS numbers) at the rate k. 2) EAA = NPV / annuity factor of its OWN life: higher EAA (or lower EAC) wins.",
    words = "different lives | unequal lives | equivalent annual annuity | equivalent annual cost | eaa | eac | replace every",
    steps = {
      { t = "NPV of A and of B", page = "3, 1", go = { type = 7, set = { cmp = "A and B" } }, take = { NPVA = "NPVA", NPVB = "NPVB" }, keep = { "k" }, read = { "NPVA", "NPVB" },
        say = "k; A: CF0 (a MINUS) and each CF; B the same. Only costs? type them all as MINUS" },
      { t = "EAA (or EAC) of each", page = "3, 2", go = { type = 8 }, read = { "EAAA", "EAAB" },
        say = "both NPVs and k carried in. Type each life (years). Costs? set 'figures are' to costs" },
    } },
  { t = "Rate given another way, then the PV",
    s = "'6.5% compounded quarterly, paid monthly', 'an EAR of 7.5%, monthly payments', 'real rate'",
    how = "The payments page needs the yearly rate quoted as often as the PAYMENTS come. 1) convert the rate (m2 = payments a year). 2) the PV, FV or payment.",
    words = "compounded quarterly | compounded monthly | effective annual rate | ear | apr | monthly payments | quarterly payments | real rate | inflation",
    steps = {
      { t = "the rate at the payments' frequency", page = "1, 4", go = { type = 10 }, take = { r2 = "r", real = "r" }, read = { "r2", "real" },
        say = "quoted r + its m (or the EAR); set 'convert to m2' = payments a year. Or: nominal + inflation" },
      { t = "PV (or FV, payment) of the payments", page = "1, 2", go = { type = 2, want = "PV" }, read = "PV",
        say = "r carried in. Set 'm payments/yr' to the SAME m2. Then C and n (blank = forever)" },
    } },
}

-- the key that opens recipe ri on the M list (1-9, then 0 for the tenth)
function RECIPE_KEY(ri) return (ri == 10) and "0" or tostring(ri) end

-- each page a recipe uses says so at the bottom of its notes (N): 'this often comes with ... -> M n'
for _, qt in ipairs(TYPES) do
  local lines = {}
  for ri, R in ipairs(RECIPES) do
    local ks = {}
    for k, st in ipairs(R.steps) do if TYPES[st.go.type] == qt then ks[#ks + 1] = tostring(k) end end
    if #ks > 0 then
      lines[#lines + 1] = "M " .. RECIPE_KEY(ri) .. ": " .. R.t ..
        ((#R.steps > 1) and (" (step " .. table.concat(ks, ", ") .. " of " .. #R.steps .. ")") or "")
    end
  end
  if #lines > 0 and qt.notes then
    qt.notes = qt.notes .. "\n\nOFTEN COMES WITH (home, M = several steps)\n" .. table.concat(lines, "\n")
  end
end
