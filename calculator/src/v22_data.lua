----------------------------------------------------------------------
-- v22 ADDITIONS: the Weeks 7-11 types, week groups, a hint for every
-- slot, the question finder, the theory pages and the new help
----------------------------------------------------------------------

--@include t_week7.lua
--@include t_week8.lua
--@include t_week9.lua
--@include t_week10.lua

-- notes pages of the new types, laid out like the first ten
for i2 = 11, #TYPES do
  local qt = TYPES[i2]
  qt.notes = "IN WORDS\n" .. qt.words .. "\n\nACRONYMS\n" .. table.concat(qt.acronyms, "\n") ..
             "\n\nWHAT THE LETTERS MEAN\n" .. table.concat(qt.letters, "\n") .. "\n\n" .. qt.notes
end

-- week groups for the menus (types 1-10 keep their numbers from v21)
GROUPS = {
  { t = "Wk 1-2  Time value of money", s = "lump sums, annuities, loans, rates", types = { 1, 2, 3, 10 } },
  { t = "Wk 3    Bonds and shares", s = "price, yield, sold early, dividends", types = { 4, 5, 6 } },
  { t = "Wk 4-5  Projects and cash flows", s = "NPV, IRR, payback, PI, EAA, FCF", types = { 7, 8, 9 } },
  { t = "Wk 7    Project risk", s = "break-even, scenarios, trees, probabilities", types = { 11, 12, 13 } },
  { t = "Wk 8    Working capital", s = "days, cycles, trade credit, credit policy", types = { 14, 15, 16 } },
  { t = "Wk 9    Risk and return", s = "returns, SD, portfolios, beta, CAPM", types = { 17, 18, 19 } },
  { t = "Wk 10-11 WACC + capital structure", s = "costs of capital, WACC, MM", types = { 20, 21 } },
}
for gi, g in ipairs(GROUPS) do for _, ti in ipairs(g.types) do TYPES[ti].group = gi end end

-- the words exam questions use for the first ten types (for search)
do
local LOOKS = {
  "invest today | grows to | worth in n years | how long to double | what rate | compounded",
  "each year | per month | annuity | forever | perpetuity | growing | first payment in | annuity due | deposits",
  "borrow | mortgage | repayment | loan | balance owing | still owe | rate rises | amortisation",
  "bond | coupon | face value | par | yield to maturity | YTM | price of the bond | semi-annual",
  "sold the bond | held for | realised yield | sold before maturity | return you earned",
  "dividend | share price | grows at | required return | constant growth | two-stage | DDM",
  "NPV | IRR | payback | profitability index | PI | accept | reject | crossover | mutually exclusive",
  "different lives | EAA | EAC | equivalent annual | replace | unequal lives",
  "free cash flow | depreciation | tax | salvage | book value | working capital | incremental",
  "EAR | APR | effective | nominal | compounded monthly | continuous | real rate | inflation | Fisher",
}
for i2 = 1, 10 do TYPES[i2].looks = LOOKS[i2] end
end

-- one-line hints for the slots of the first ten types (shown at the bottom of the input screen)
do
local HINTS = {
  { PV = "the amount now (today, t = 0)", FV = "the amount at the later date", r = "yearly rate as a %, e.g. 7 (not 0.07)",
    n = "number of YEARS", m = "compounds per year: monthly = 12", mult = "'triple your money' -> 3 (leave PV and FV blank)",
    EAR = "the effective (true) yearly rate, if that is what is given" },
  { C = "the payment each period (the FIRST one if it grows)", r = "the yearly DISCOUNT rate as a %", m = "payments per year: monthly = 12",
    n = "number of payments; blank = forever (perpetuity)", g = "growth of the payments each period, e.g. 3",
    timing = "start of each period = annuity due", first = "the period of the FIRST payment, e.g. 3 (deferred)",
    PV = "value today, if given (then another slot is solved)", FV = "value at the last payment, if given",
    price = "what you pay / the target: NPV = PV - price" },
  { L = "the amount borrowed", yrs = "the loan term in years", m = "repayments per year: monthly = 12", r = "the yearly rate as a %",
    PMT = "the repayment, if given", k = "repayments already made (years x m)", kyrs = "or: how many years into the loan",
    r2 = "the new yearly rate after k repayments" },
  { F = "face (par) value, usually 1000", c = "coupon RATE per year, e.g. 8", CPNd = "or: the coupon in $ each period",
    m = "coupons per year: semi-annual = 2", yrs = "years to maturity", y = "yield / required return as a %", P = "the price, if given (finds the yield)",
    el = "years that have passed (value at that date)", skip = "coupon periods with no coupon", skipy = "or: years with no coupon" },
  { P0 = "the price you paid", F = "face value, usually 1000", c = "coupon rate per year", CPNd = "or: coupon $ each period",
    m = "coupons per year", held = "years you held it", Ps = "the price you sold at", ys = "or: the yield when sold",
    yrsT = "the bond's life when bought (if no sale price)" },
  { D0 = "dividend JUST paid (already gone)", D1 = "the NEXT dividend (one year away)", rE = "required return as a %",
    g = "yearly dividend growth as a %", P0 = "price today, if given", P1 = "price in one year, if given",
    nh = "years of high growth (two-stage)", g1 = "the high growth rate in those years" },
  { k = "discount rate / cost of capital as a %", cmp = "one project, two, or a graph question",
    A0 = "the outlay today, NEGATIVE, e.g. -1000", cross = "the crossover rate read off the graph",
    rise = "does the asked project's cash come later (rising)?", irrO = "the IRR of the other project",
    o1 = "an answer option to test", A1 = "cash flow in year 1", Alev = "a level yearly cash flow (with years)",
    Ayrs = "how many years of that level cash flow", B0 = "project B's outlay, NEGATIVE" },
  { k = "cost of capital as a %", kind = "benefits (EAA, higher wins) or costs (EAC, lower wins)",
    NPVA = "project A's NPV", tA = "project A's life in years", EAAA = "A's EAA if already given",
    NPVB = "project B's NPV", tB = "project B's life", EAAB = "B's EAA if given" },
  { Tc = "company tax rate as a %", Rev = "revenue for the year", Costs = "operating costs (not depreciation)",
    Dep = "depreciation for the year", CapEx = "equipment bought this year", dNWC = "increase in working capital",
    sale = "what the machine is sold for", BV = "its book value at the sale", opFCF = "the final year's operating FCF",
    NWCrec = "working capital recovered at the end", cost = "the asset's cost", salv = "salvage value used for depreciation",
    life = "useful life in years", dvr = "diminishing-value rate as a %", yr = "the year you want the book value after",
    nom = "nominal rate as a %", infl = "inflation as a %" },
  { nom = "nominal rate (with inflation) as a %", infl = "inflation as a %", real = "real rate as a %",
    r = "quoted yearly rate (APR) as a %", m = "compounds per year of that quote", EAR = "the effective yearly rate",
    per = "the rate per period", rc = "a continuous rate", m2 = "convert to another frequency" },
}
for i2 = 1, 10 do
  for _, sl in ipairs(TYPES[i2].slots) do sl.hint = HINTS[i2][sl.key] end
end
for i2 = 11, #TYPES do
  for _, sl in ipairs(TYPES[i2].slots) do sl.hint = (TYPES[i2].hints or {})[sl.key] end
end
end

-- glossary: add the Weeks 7-11 words, keep the whole list in alphabetical order
--@include glossary_v22.lua
do
  local blocks = {}
  for block in (GLOSSARY .. "\n" .. GLOSSARY_NEW .. "\n## "):gmatch("## (.-)\n(%f[#])") do blocks[#blocks + 1] = block end
  table.sort(blocks, function(a, b) return a:lower() < b:lower() end)
  GLOSSARY = "## " .. table.concat(blocks, "\n## "):gsub("\n+$", "")
end

----------------------------------------------------------------------
-- CHECK IT ON THE TI: the built-in Finance Solver (menu 8 1) boxes for
-- types 1-4, and the npv( / irr( lines for projects (type 7)
----------------------------------------------------------------------
do
  local function fs(out, f)
    out:head("CHECK ON THE TI FINANCE SOLVER (menu 8 1)")
    out:xl("N=" .. P(f.N) .. "  I(%)=" .. P(f.I) .. "  PV=" .. P(f.PV) .. "  Pmt=" .. P(f.Pmt))
    out:xl("FV=" .. P(f.FV) .. "  PpY=" .. f.m .. "  CpY=" .. f.m .. "  PmtAt=" .. (f.at or "END"))
    out:note("type the boxes you know; tab to the unknown and press enter. Money you pay is -, money you get is +")
  end
  local function wrapSolve(i, extra)
    local base = TYPES[i].solve
    TYPES[i].solve = function(V, out)
      base(V, out)
      local ok, err = pcall(extra, V, out, out.vals or {})
      if not ok then out:note("(no Finance Solver check for this case)") end
    end
  end
  wrapSolve(1, function(V, out, x)
    local m, cont = mOf(V.m)
    if cont or not (x.PV and x.FV and x.r and x.n) then return end
    fs(out, { N = x.n * m, I = x.r * 100, PV = -x.PV, Pmt = 0, FV = x.FV, m = m })
  end)
  wrapSolve(2, function(V, out, x)
    local m = mOf(V.m)
    if (V.g and V.g ~= 0) or not x.N or not x.C or not x.r then return end
    if V.first and V.first > 1 then out:note("first payment later than t = 1: the Finance Solver gives the value one period before the first payment"); end
    local due = tostring(V.timing or ""):find("start") ~= nil
    if x.PV and not (V.first and V.first > 1) then
      fs(out, { N = x.N, I = x.r * 100, PV = -x.PV, Pmt = x.C, FV = 0, m = m, at = due and "BEGIN" or "END" })
    end
  end)
  wrapSolve(3, function(V, out, x)
    local m = mOf(V.m)
    if not (x.L and x.N and x.PMT and x.r) then return end
    fs(out, { N = x.N, I = x.r * 100, PV = x.L, Pmt = -x.PMT, FV = 0, m = m })
  end)
  wrapSolve(4, function(V, out, x)
    local m = mOf(V.m)
    if not (x.N and x.CPN and x.P and x.y) or (V.skip and V.skip > 0) or (V.skipy and V.skipy > 0) then return end
    fs(out, { N = x.N, I = x.y * 100, PV = -x.P, Pmt = x.CPN, FV = V.F or 1000, m = m })
  end)
  wrapSolve(7, function(V, out, x)
    for _, pre in ipairs({ "A", "B" }) do
      local cfs, nmax = buildCFs(V, pre)
      if cfs and nmax > 0 and V.k then
        local t = {}
        for k2 = 1, nmax do t[#t + 1] = P(cfs[k2] or 0) end
        if pre == "A" then out:head("ON YOUR TI-NSPIRE (Calculator page)") end
        out:xl("npv(" .. P(V.k * 100) .. "," .. P(cfs[0] or 0) .. ",{" .. table.concat(t, ",") .. "})  -> NPV " .. pre)
        out:xl("irr(" .. P(cfs[0] or 0) .. ",{" .. table.concat(t, ",") .. "})  -> IRR " .. pre .. " (%)")
      end
    end
  end)
end

----------------------------------------------------------------------
-- QUESTION FINDER: two or three simple questions -> the right type,
-- with the unknown marked and choices set
--   go = { type, want = slot key, set = { slot = value or choice prefix }, say = banner }
----------------------------------------------------------------------
FINDER = {
  q = "What is the question about?",
  opts = {
    { t = "ONE amount: today and later", s = "'invest $4,750 today...'", kids = {
      q = "What do they ask for?", opts = {
        { t = "what it grows to (FV)", go = { type = 1, want = "FV" } },
        { t = "what it is worth today (PV)", go = { type = 1, want = "PV" } },
        { t = "how many years", go = { type = 1, want = "n" } },
        { t = "the interest rate", go = { type = 1, want = "r" } },
        { t = "years to double or triple", go = { type = 1, want = "n", set = { mult = "2" }, say = "multiple: 2 = double, 3 = triple" } },
        { t = "the true yearly rate (EAR)", go = { type = 10, want = "EAR" } },
      } } },
    { t = "EQUAL payments, or forever", s = "'$500 a month', 'perpetuity'", kids = {
      q = "What do they ask for?", opts = {
        { t = "value today of the payments", go = { type = 2, want = "PV" } },
        { t = "savings at the end (FV)", go = { type = 2, want = "FV" } },
        { t = "the payment", go = { type = 2, want = "C" } },
        { t = "payments forever (perpetuity)", go = { type = 2, want = "PV", say = "leave n BLANK = forever" } },
        { t = "payments that grow", go = { type = 2, want = "PV", say = "type the growth g" } },
        { t = "first payment later, or at the start", go = { type = 2, want = "PV", say = "set 'first payment at t' or the timing" } },
      } } },
    { t = "A LOAN or mortgage", s = "'borrow $400,000 over 25 years'", kids = {
      q = "What do they ask for?", opts = {
        { t = "the repayment", go = { type = 3, want = "PMT" } },
        { t = "the balance still owed", go = { type = 3, say = "type k repayments made (or years in)" } },
        { t = "the new repayment after a rate change", go = { type = 3, say = "type k and the new rate r2" } },
      } } },
    { t = "INTEREST RATES: EAR, APR, inflation", s = "'compounded monthly', 'real rate'", go = { type = 10 } },
    { t = "A BOND", s = "'coupon', 'face value', 'yield'", kids = {
      q = "What do they ask for?", opts = {
        { t = "its price today", go = { type = 4, want = "P" } },
        { t = "its yield to maturity", go = { type = 4, want = "y" } },
        { t = "its value at a later date", go = { type = 4, want = "P", say = "type the years that have passed" } },
        { t = "the return if it was sold early", go = { type = 5 } },
        { t = "what happens if rates change?", theory = "bond" },
      } } },
    { t = "A SHARE and its dividends", s = "'dividend', 'grows at'", kids = {
      q = "What do they ask for?", opts = {
        { t = "the share price today", go = { type = 6, want = "P0" } },
        { t = "the price in one year", go = { type = 6, want = "P1" } },
        { t = "the required return", go = { type = 6, want = "rE" } },
        { t = "fast growth, then steady (2 stages)", go = { type = 6, want = "P0", say = "type the high-growth years and g1" } },
      } } },
    { t = "A PROJECT: NPV, IRR, payback", s = "'cash flows', 'accept?'", kids = {
      q = "What does the question give you?", opts = {
        { t = "the cash flow of each year", go = { type = 7 } },
        { t = "two projects with different lives", go = { type = 8 } },
        { t = "revenue, costs, tax, depreciation", go = { type = 9 } },
        { t = "a graph of NPV against the rate", go = { type = 7, set = { cmp = "graph" } } },
        { t = "which method or rule is right?", theory = "npv" },
      } } },
    { t = "PROJECT RISK: break-even, scenarios", s = "'break-even', 'probability', 'tree'", kids = {
      q = "What do they ask for?", opts = {
        { t = "break-even units (EBIT or NPV)", go = { type = 11, set = { mode = "NPV" } } },
        { t = "the NPV if ONE input changes", go = { type = 11, set = { mode = "sens" } } },
        { t = "worst / base / best case NPV", go = { type = 11, set = { mode = "scen" } } },
        { t = "an expected value or chance node", go = { type = 12, set = { mode = "chance" } } },
        { t = "a decision node (the best option)", go = { type = 12, set = { mode = "decision" } } },
        { t = "the NPV with uncertain cash flow", go = { type = 12, set = { mode = "project" } } },
        { t = "sell (abandon) or keep", go = { type = 12, set = { mode = "sell" } } },
        { t = "a joint or 'given' probability", go = { type = 13 } },
      } } },
    { t = "WORKING CAPITAL, trade credit", s = "'inventory days', '2/10 net 30'", kids = {
      q = "What do they ask for?", opts = {
        { t = "inventory, A/R or A/P days", go = { type = 14, set = { mode = "days" } } },
        { t = "the cash (conversion) cycle", go = { type = 14, set = { mode = "days" }, say = "or switch to 'cycles from days'" } },
        { t = "cash freed by changing the days", go = { type = 14, set = { mode = "cash" } } },
        { t = "net working capital", go = { type = 14, set = { mode = "NWC" } } },
        { t = "firm value from FCF", go = { type = 14, set = { mode = "firm" } } },
        { t = "cost of skipping a discount", go = { type = 15 } },
        { t = "switch credit policy? (NPV)", go = { type = 16 } },
      } } },
    { t = "RISK AND RETURN, CAPM", s = "'standard deviation', 'beta'", kids = {
      q = "What do they ask for?", opts = {
        { t = "a return (realised, average)", go = { type = 17, set = { mode = "realised" } } },
        { t = "expected return / SD from a forecast", go = { type = 17, set = { mode = "forecast" } } },
        { t = "SD from past returns", go = { type = 17, set = { mode = "past" } } },
        { t = "CV or Sharpe ratio", go = { type = 17, set = { mode = "CV" } } },
        { t = "a two-share portfolio", go = { type = 18 } },
        { t = "correlation or covariance", go = { type = 18, set = { mode = "forecast" }, say = "pick the mode that matches the data" } },
        { t = "a required return (CAPM)", go = { type = 19 } },
        { t = "beta, or portfolio beta", go = { type = 19, set = { mode = "beta" } } },
        { t = "over- or undervalued?", go = { type = 19, want = "fc", say = "type the forecast return" } },
      } } },
    { t = "WACC and capital structure", s = "'WACC', 'cost of debt', 'MM'", kids = {
      q = "What do they ask for?", opts = {
        { t = "the WACC", go = { type = 20 } },
        { t = "cost of equity", go = { type = 20, set = { mode = "cost of equity" } } },
        { t = "cost of debt (after tax)", go = { type = 20, set = { mode = "cost of debt" } } },
        { t = "cost of preference shares", go = { type = 20, set = { mode = "cost of pref" } } },
        { t = "cost of equity with debt (MM)", go = { type = 21 } },
        { t = "unlevered cost of capital", go = { type = 21, set = { mode = "unlev" } } },
        { t = "tax shield, levered value", go = { type = 21, set = { mode = "tax" } } },
      } } },
    { t = "NO NUMBERS: explain / true-false", s = "'what happens if...', 'which is TRUE'", theory = true },
  },
}

----------------------------------------------------------------------
-- THEORY + WHAT-IFS (the non-maths questions), from theory_a/theory_b
----------------------------------------------------------------------
--@include? theory_a.lua
--@include? theory_b.lua
THEORY = {}
for _, part in ipairs({ THEORY_A or {}, THEORY_B or {} }) do
  for _, t in ipairs(part) do THEORY[#THEORY + 1] = t end
end

HELP = [[BFC2140 SOLVER ]] .. VERSION .. [[ - HOW TO USE
Every week of the unit, the maths AND
the questions without numbers.

START HERE (home screen)
F  Find my question: answer 2 short
   questions; the right solver opens
   with the answer box marked FIND.
1-7  pick a week, then a question type.
T  Theory: 'what happens if', true or
   false, explain why - by topic.
S  Search: type a word from the
   question (e.g. COUPON) + ENTER.
G  Glossary of every finance word.

FILLING IN A QUESTION
- up/down or TAB: move between boxes
- type the number; the grey line at
  the bottom says what that box is
- left/right: change a < choice >
- leave the unknown BLANK
- rates as PERCENT: 7 means 7 %
- money: 4750, 4.75k or 1.2m
- a NEGATIVE number: the (-) key
- ENTER = SOLVE, ESC = back
- D (or C) clears every box
- DEL clears one box

ON THE ANSWER PAGE
- the answers come first, each with
  how it was worked out
- up/down: pick a line, I: explain it
- T: the table (timelines, schedules)
- ON YOUR TI-NSPIRE: the line to type
  to check it with the calculator

HELP ON EVERY PAGE
Y  the theory for this type: the
   what-if rules and the traps
N  notes: formulas + what letters mean
A  steps + traps: what to WRITE
W  worked examples from the course
H  this page      ESC  go back]]
