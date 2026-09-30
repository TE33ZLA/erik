----------------------------------------------------------------------
-- THE EXAM FORMULA SHEET (v23)
-- The 56 formulas of the BFC2140 formula sheet, each written the way
-- it is typed in the exam's text box (* times, / divide, ^ power,
-- brackets). Every answer ends with the sheet formulas it used and the
-- formulas it used that are NOT on the sheet (with where they come
-- from). The N page of every type starts with its sheet formulas.
--   solvers call out:uses("fv", ...) and out:off("nlump") (or
--   out:off("formula", "where it comes from")); FSHEET.section(out)
--   then adds the section after the answers.
----------------------------------------------------------------------
FSHEET = {}
do
  local SECS = { "Financial Mathematics", "Valuation of Bonds and Shares", "Capital Budgeting", "Working Capital",
                 "Risk and Return", "Cost of Capital", "Capital Structure - No Tax World", "Capital Structure - Tax World" }
  -- id, section, the line exactly as typed
  local LIST = {
    { "fv", 1, "FVn = PV*(1 + r)^n" },
    { "pv", 1, "PV = FVn/(1 + r)^n" },
    { "pva", 1, "PV of an annuity = C/r*(1 - 1/(1 + r)^n)" },
    { "pvad", 1, "PV of an annuity due = C/r*(1 - 1/(1 + r)^n)*(1 + r)" },
    { "fva", 1, "FV of an annuity = C/r*((1 + r)^n - 1)" },
    { "fvad", 1, "FV of an annuity due = C/r*((1 + r)^n - 1)*(1 + r)" },
    { "perp", 1, "PV of a perpetuity = C/r" },
    { "gperp", 1, "PV of growing perpetuity = C/(r - g)" },
    { "gann", 1, "PV of growing annuity = C/(r - g)*(1 - ((1 + g)/(1 + r))^n)" },
    { "ear", 1, "EAR = (1 + APR/m)^m - 1" },
    { "lam", 1, "lambda = A1/(A1 - A2)" },
    { "interp", 1, "Interpolated r = r1 + lambda*(r2 - r1)" },
    { "bond", 2, "PBond = C/i*(1 - 1/(1 + i)^n) + FVn/(1 + i)^n" },
    { "zbond", 2, "PBond = FVn/(1 + i)^n" },
    { "p0z", 2, "P0 = D1/rE" },
    { "p0g", 2, "P0 = D1/(rE - g)" },
    { "p0n", 2, "P0 = D1/(1 + rE) + D2/(1 + rE)^2 + ... + (Dn + Pn)/(1 + rE)^n" },
    { "npv", 3, "NPV = NCF0 + NCF1/(1 + r) + NCF2/(1 + r)^2 + ... + NCFn/(1 + r)^n" },
    { "irr", 3, "Sum of NCFt/(1 + IRR)^t = 0" },
    { "pi", 3, "PI = NPV/Resource consumed" },
    { "npvinf", 3, "NPVinf = NPV0*(1 + r)^n/((1 + r)^n - 1)" },
    { "eav", 3, "EAV = NPV*r/(1 - 1/(1 + r)^n)" },
    { "fisher", 3, "1 + Real rate = (1 + Nominal rate)/(1 + inflation rate)" },
    { "fcf", 3, "FCF = (Rev - Costs - Dep)*(1 - tc) + Dep - CapEx - Change in NWC" },
    { "salv", 3, "After-tax salvage = SV - (SV - BV)*tc" },
    { "invd", 4, "Inventory Days = Inventory/Average daily COGS" },
    { "ard", 4, "A/R Days = Accounts receivable/Average daily sales" },
    { "apd", 4, "A/P Days = Accounts payable/Average daily COGS" },
    { "ccc", 4, "CCC = Inventory Days + A/R Days - A/P Days" },
    { "er", 5, "E(Ri) = Sum of Rik*Pk" },
    { "varp", 5, "Var(i) = Sum of (Rik - E(Ri))^2*Pk" },
    { "ret", 5, "R(t+1) = (DIV(t+1) + P(t+1) - Pt)/Pt" },
    { "mean", 5, "Rbar = (R1 + R2 + ... + RT)/T" },
    { "vars", 5, "Var(R) = ((R1 - Rbar)^2 + ... + (RT - Rbar)^2)/(T - 1)" },
    { "covp", 5, "Cov(Ri,Rj) = Sum of (Ri,n - E(Ri))*(Rj,n - E(Rj))*Pn" },
    { "covs", 5, "Cov(Ri,Rj) = Sum of (Ri,n - Rbar_i)*(Rj,n - Rbar_j)/(N - 1)" },
    { "corr", 5, "Corr(Ri,Rj) = Cov(Ri,Rj)/(SDi*SDj)" },
    { "cv", 5, "CV = SD(Ri)/E[Ri]" },
    { "erp", 5, "E[Rp] = w1*E[R1] + w2*E[R2] + ... + wn*E[Rn]" },
    { "varpf", 5, "Var(p) = wi^2*SDi^2 + wj^2*SDj^2 + 2*wi*wj*Corr(i,j)*SDi*SDj" },
    { "sharpe", 5, "Sharpe Ratio = (E[Rp] - rf)/SDp" },
    { "beta", 5, "Beta(i) = Cov(Ri,RM)/SDM^2" },
    { "capm", 5, "E[Ri] = rf + Beta(i)*(E[RM] - rf)" },
    { "betap", 5, "Beta(p) = w1*Beta1 + w2*Beta2 + ... + wn*Betan" },
    { "rp", 6, "Rp = DIVp/Pp" },
    { "wacc", 6, "rWACC = re*E/V + rp*P/V + rd*(1 - Tc)*D/V" },
    { "v", 6, "V = E + P + D" },
    { "mm1", 7, "E + D = U = A" },
    { "ru", 7, "rU = rE*E/(E + D) + rD*D/(E + D)" },
    { "re", 7, "rE = rU + D/E*(rU - rD)" },
    { "rura", 7, "rU = rA" },
    { "vl", 8, "VL = VU + PV(Interest tax shield)" },
    { "its", 8, "Interest tax shield = Interest*Tc" },
    { "pvits", 8, "PV(Interest tax shield of permanent debt) = Tc*D" },
    { "ret2", 8, "rE = rU + D/E*(rU - rD)*(1 - Tc)" },
    { "wacct", 8, "rWACC = rE*E/(E + D) + rD*D/(E + D)*(1 - Tc)" },
  }
  local byId = {}
  for n, e in ipairs(LIST) do byId[e[1]] = { id = e[1], sec = e[2], f = e[3], n = n } end
  FSHEET.secs, FSHEET.list, FSHEET.byId = SECS, LIST, byId

  -- formulas that are NOT on the sheet: { typed form, where it comes from on the sheet }
  FSHEET.off = {
    -- time value of money
    nlump = { "n = ln(FVn/PV)/ln(1 + r)", "rearranged from FVn = PV*(1 + r)^n" },
    rlump = { "r = (FVn/PV)^(1/n) - 1", "rearranged from FVn = PV*(1 + r)^n" },
    mult = { "FVn/PV = the multiple (2 = double, 3 = triple)", "FVn = PV*(1 + r)^n: only the ratio FVn/PV matters" },
    cont = { "FV = PV*e^(r*n); PV = FV/e^(r*n)", "continuous compounding (the EAR line when m is huge)" },
    contn = { "n = ln(FV/PV)/r", "continuous compounding FV = PV*e^(r*n), solved for n" },
    contr = { "r = ln(FV/PV)/n", "continuous compounding FV = PV*e^(r*n), solved for r" },
    contear = { "EAR = e^r - 1", "continuous compounding (the EAR line when m is huge)" },
    contrc = { "rc = ln(1 + EAR)", "EAR = e^rc - 1, solved for rc" },
    iper = { "rate per period = APR/m   periods = years*m", "the APR/m inside EAR = (1 + APR/m)^m - 1" },
    aprear = { "APR = m*((1 + EAR)^(1/m) - 1)", "rearranged from EAR = (1 + APR/m)^m - 1" },
    iperear = { "rate per period = (1 + EAR)^(1/m) - 1", "rearranged from EAR = (1 + APR/m)^m - 1" },
    annC = { "C = PV*r/(1 - 1/(1 + r)^n)", "PV of an annuity, solved for C" },
    annCdue = { "C = PV*r/((1 - 1/(1 + r)^n)*(1 + r))", "PV of an annuity due, solved for C" },
    annCfv = { "C = FV*r/((1 + r)^n - 1)", "FV of an annuity, solved for C" },
    perpC = { "C = PV*(r - g)   (g = 0: C = PV*r)", "PV of a (growing) perpetuity, solved for C" },
    gannC = { "C = PV*(r - g)/(1 - ((1 + g)/(1 + r))^n)", "PV of growing annuity, solved for C" },
    annN = { "n = -ln(1 - PV*r/C)/ln(1 + r)", "PV of an annuity, solved for n" },
    gannN = { "n = ln(1 - PV*(r - g)/C)/ln((1 + g)/(1 + r))", "PV of growing annuity, solved for n" },
    annNfv = { "n = ln(1 + FV*r/C)/ln(1 + r)", "FV of an annuity, solved for n" },
    rsearch = { "r found by search: the rate that makes the formula match", "the sheet way: try two rates, then interpolate (lambda)" },
    deferred = { "PV0 = (value one period before the 1st payment)/(1 + r)^(t1 - 1)",
                 "two sheet lines in a row: the annuity (or perpetuity), then PV = FVn/(1 + r)^n" },
    perpdue = { "PV of a perpetuity due = C/r*(1 + r)", "PV of a perpetuity times (1 + r), like the annuity due line" },
    ganndue = { "growing annuity due = C/(r - g)*(1 - ((1 + g)/(1 + r))^n)*(1 + r)", "PV of growing annuity times (1 + r), like the annuity due line" },
    gannfv = { "FV of growing annuity = PV*(1 + r)^n", "PV of growing annuity, then FVn = PV*(1 + r)^n" },
    twostage = { "PV = stage 1 + (C(n+1)/(r - g2))/(1 + r)^n", "three sheet lines: annuity (or growing annuity), PV of growing perpetuity (it lands at t = n), then PV = FVn/(1 + r)^n" },
    cnext = { "C(n+1) = C*(1 + g)^(n - 1)*(1 + g2)", "the last payment of stage 1, grown once more at g2" },
    loanbal = { "Balance after k = PMT/r*(1 - 1/(1 + r)^(n - k))", "PV of an annuity with the n - k payments left" },
    loanint = { "interest = r*balance before the payment   principal = PMT - interest", "not on the sheet" },
    loanpmt2 = { "new PMT = Balance*r2/(1 - 1/(1 + r2)^(n - k))", "PV of an annuity, solved for C at the new rate" },
    -- bonds and shares
    coupon = { "C = coupon rate*FVn/m (the coupon each period)", "not on the sheet: the C in the PBond line" },
    ytm = { "i = the yield that makes PBond = the price (search)", "PBond = C/i*(1 - 1/(1 + i)^n) + FVn/(1 + i)^n, solved for i" },
    bonddef = { "PBond = C/i*(1 - 1/(1 + i)^(n - s))/(1 + i)^s + (FVn + s*C)/(1 + i)^n",
                "the PBond line with the first s coupons paid at maturity" },
    eay = { "EAY = (1 + i)^m - 1 (i = yield per period)", "the EAR line with APR/m = the yield per period" },
    cy = { "Current yield = annual coupon/PBond", "not on the sheet" },
    realised = { "0 = -P0 + C/(1 + i) + ... + (C + Psale)/(1 + i)^n", "the IRR line with the price paid, the coupons and the sale price" },
    d1g = { "D1 = D0*(1 + g)", "not on the sheet: D0 was just paid, grow it one year" },
    reddm = { "rE = D1/P0 + g", "P0 = D1/(rE - g), solved for rE" },
    gddm = { "g = rE - D1/P0", "P0 = D1/(rE - g), solved for g" },
    d1need = { "D1 = P0*(1 + rE) - P1", "P0 = (D1 + P1)/(1 + rE) (the P0 line with n = 1), solved for D1" },
    p1g = { "P1 = P0*(1 + g)", "constant growth: P1 = D2/(rE - g) = P0*(1 + g)" },
    yields = { "dividend yield = D1/P0   capital gain yield = (P1 - P0)/P0", "the two parts of R(t+1) = (DIV(t+1) + P(t+1) - Pt)/Pt" },
    tv = { "Pn = D(n+1)/(rE - g), discounted n years (not n + 1)", "P0 = D1/(rE - g) used at year n" },
    -- capital budgeting
    payback = { "Payback = years before recovery + unrecovered cost/cash flow that year", "not on the sheet" },
    dpayback = { "Discounted payback = the same rule on the PV of each cash flow", "not on the sheet" },
    pialt = { "PI (textbook) = PV of inflows/investment", "textbook version: the sheet uses PI = NPV/Resource consumed" },
    crossover = { "Crossover r = the IRR of (A - B) each year", "set NPV(A) = NPV(B): the IRR line on the differences" },
    graph = { "IRR = where an NPV line crosses zero; crossover = where two lines meet", "the NPV and IRR lines, read off the graph" },
    eavnpv = { "NPV = EAV/r*(1 - 1/(1 + r)^n)", "EAV = NPV*r/(1 - 1/(1 + r)^n), solved for NPV (the PV of an annuity with C = EAV)" },
    depshield = { "Dep tax shield = Dep*tc", "part of the FCF line: (Rev - Costs)*(1 - tc) + Dep*tc" },
    ebitfcf = { "FCF = EBIT*(1 - tc) + Dep - CapEx - Change in NWC", "the FCF line with EBIT = Rev - Costs - Dep" },
    nwcitems = { "NWC = Inventory + A/R - A/P; then Change in NWC = NWC this year - NWC last year", "the Change in NWC in the FCF line" },
    sldep = { "Dep = (cost - salvage)/life (straight line)", "not on the sheet" },
    dvdep = { "DV dep = rate*opening book value", "not on the sheet" },
    bv = { "BV = cost - all depreciation so far", "not on the sheet: the BV in SV - (SV - BV)*tc" },
    terminal = { "Last-year CF = operating FCF + after-tax salvage + NWC recovered", "not on the sheet: add the last-year pieces" },
    nomfisher = { "Nominal = (1 + Real)*(1 + inflation) - 1", "the Fisher line, solved for the nominal rate" },
    inflfisher = { "inflation = (1 + Nominal)/(1 + Real) - 1", "the Fisher line, solved for inflation" },
    incdep = { "incremental Dep = new Dep - old Dep", "not on the sheet: the Dep in the FCF line for a replacement" },
    oldsale = { "tax effect of selling the old asset = (BV - SV)*tc (a loss gives a refund)", "the After-tax salvage line used on the old asset today" },
    excelnpv = { "Excel: =NPV(rate, year 1:year n) + year 0   =IRR(year 0:year n)", "the NPV and IRR lines in Excel" },
    -- week 7
    ebe = { "Q = (FC + Dep)/(P - v)", "EBIT break-even, not on the sheet: EBIT = (P - v)*Q - FC - Dep = 0" },
    ocfneed = { "OCF needed = I*r/(1 - 1/(1 + r)^n)   (forever: I*r)", "NPV = 0: PV of an annuity (or perpetuity), solved for C" },
    npvbe = { "Q = (OCF needed + FC*(1 - T) - T*Dep)/((P - v)*(1 - T))", "NPV break-even, not on the sheet" },
    ocfq = { "OCF = ((P - v)*Q - FC - Dep)*(1 - T) + Dep", "the FCF line with Rev - Costs = (P - v)*Q - FC" },
    bein = { "break-even P (or v): the value that makes NPV = 0", "NPV line solved for one input, not on the sheet" },
    depI = { "Dep = I/life (straight line to 0)", "not on the sheet" },
    enpv = { "E[NPV] = p1*NPV1 + p2*NPV2 + ...", "the E(Ri) = Sum of Rik*Pk idea used on NPVs" },
    ev = { "E[V] = p1*V1 + p2*V2 + ... (a chance node)", "expected value: the E(Ri) = Sum of Rik*Pk idea used on values" },
    decnode = { "decision node = the best option (never an average)", "not on the sheet" },
    optval = { "option value = NPV with the option - NPV without it", "not on the sheet" },
    wait = { "NPV(wait) = PV(p*max(Vgood - cost later, 0) + (1 - p)*max(Vbad - cost later, 0))",
             "expected value (like E(Ri)), then PV = FVn/(1 + r)^n: you pay only if it goes well" },
    waitnow = { "NPV(now) = PV(p*Vgood + (1 - p)*Vbad) - cost now", "expected value (like E(Ri)), then PV = FVn/(1 + r)^n" },
    joint = { "P(A and B) = P(A)*P(B | A)", "probability rule, not on the sheet" },
    cond = { "P(B | A) = P(A and B)/P(A)", "probability rule, not on the sheet" },
    paths = { "the 4 paths add to 100%: a missing path = 1 - the others", "probability rule, not on the sheet" },
    -- week 8
    opcycle = { "Operating cycle = Inventory Days + A/R Days", "the first part of the CCC line" },
    freed = { "Cash freed = days cut*(COGS or sales)/365", "the days lines (days = balance/daily COGS), solved for the balance" },
    nwcbs = { "NWC = current assets - current liabilities", "not on the sheet" },
    fcfni = { "FCF = NI + Dep - CapEx - Change in NWC", "the FCF line with net income in place of (Rev - Costs - Dep)*(1 - tc)" },
    float = { "Cash freed today = daily collections*days of float saved; NPV = cash freed - PV(fees)",
              "not on the sheet; a fee every month forever is PV of a perpetuity = fee/monthly rate" },
    tcear = { "EAR = (1 + d/(1 - d))^(365/(N - D)) - 1", "the EAR line with APR/m = d/(1 - d) and m = 365/(N - D)" },
    creditcf = { "CF0 = -cost*Q + cash sales   later CF = CF0 + last month's credit sales", "credit policy cash flows, not on the sheet" },
    -- week 9
    hpr = { "HPR = (1 + R1)*(1 + R2)*...*(1 + RT) - 1", "compound the one-year returns R(t+1)" },
    annret = { "annualised return = (1 + HPR)^(1/T) - 1", "rearranged from FVn = PV*(1 + r)^n" },
    sd = { "SD = sqrt(Var)", "the square root of the Var line" },
    covrho = { "Cov = Corr*SDi*SDj", "Corr(Ri,Rj) = Cov(Ri,Rj)/(SDi*SDj), solved for Cov" },
    weights = { "w = $ in the asset/total $ (all the weights add to 1)", "the w in the E[Rp] and Var(p) lines" },
    sdrf = { "SDp = w*SD", "the Var(p) line with the risk-free asset: SD 0, no covariance" },
    varcov = { "Var(p) = wA^2*VarA + wB^2*VarB + 2*wA*wB*Cov(A,B)", "the Var(p) line with SD^2 = Var and Corr*SDi*SDj = Cov (a risk-free asset adds nothing)" },
    alpha = { "alpha = forecast return - required return", "not on the sheet" },
    betaT = { "Beta(p) = (target - rf)/(E[RM] - rf)", "the CAPM line, solved for Beta" },
    wtarget = { "wA = (Beta(p) - BetaB)/(BetaA - BetaB)", "Beta(p) = w1*Beta1 + w2*Beta2 with w2 = 1 - w1, solved for w1" },
    -- weeks 10-11
    rdat = { "after-tax rd = rd*(1 - Tc)", "the rd*(1 - Tc) part of the WACC line" },
    mv = { "E = shares*share price; D = bonds*bond price", "market values, not on the sheet" },
    divp = { "DIVp = dividend rate*par value", "not on the sheet" },
    eqvl = { "E = VL - D", "the firm is split between its owners: E + D = VL (like E + D = U = A)" },
    price = { "share price = E/number of shares", "not on the sheet" },
    vucf = { "VU = FCF/rU   (FCF = EBIT*(1 - Tc))", "PV of a perpetuity = C/r with C = FCF and r = rU" },
    rucf = { "rU = FCF/VU = EBIT*(1 - Tc)/VU", "PV of a perpetuity = C/r, solved for r" },
    tradeoff = { "VL = VU + PV(Interest tax shield) - PV(financial distress costs)", "trade-off theory (textbook): the VL line minus distress costs" },
    unlev = { "the unlevered firm's WACC = rU", "no debt: rWACC = rE = rU" },
  }

  -- the sheet formulas each type can use (its N page starts with them)
  FSHEET.types = {
    { "fv", "pv", "ear" },
    { "fv", "pv", "pva", "pvad", "fva", "fvad", "perp", "gperp", "gann", "npv", "lam", "interp" },
    { "pva", "lam", "interp" },
    { "bond", "zbond", "pva", "pv", "lam", "interp" },
    { "bond", "zbond", "irr", "npv", "lam", "interp" },
    { "p0z", "p0g", "p0n", "ret" },
    { "npv", "irr", "pi", "lam", "interp" },
    { "eav", "npvinf" },
    { "fcf", "salv", "fisher" },
    { "ear", "fisher" },
    { "fcf", "npv", "pva", "perp", "irr" },
    { "pv", "perp", "pva", "npv" },
    {},
    { "invd", "ard", "apd", "ccc", "perp", "gperp", "pva", "ear", "npv" },
    { "apd" },
    { "npv", "perp" },
    { "ret", "mean", "er", "varp", "vars", "cv", "sharpe" },
    { "er", "varp", "mean", "vars", "covp", "covs", "corr", "erp", "varpf", "sharpe" },
    { "capm", "beta", "betap" },
    { "capm", "rp", "wacc", "v", "bond", "lam", "interp" },
    { "mm1", "ru", "re", "rura", "vl", "its", "pvits", "ret2", "wacct", "perp" },
    { "fcf", "salv", "npv", "irr", "lam", "interp" },
  }

  local function sorted(ids)
    local t, seen = {}, {}
    for _, id in ipairs(ids) do
      if byId[id] and not seen[id] then seen[id] = true; t[#t + 1] = id end
    end
    table.sort(t, function(a, b) return byId[a].n < byId[b].n end)
    return t
  end
  FSHEET.sorted = sorted

  -- the section after the answers
  function FSHEET.section(out)
    local bad = {}
    for _, id in ipairs(out.fsl or {}) do if not byId[id] then bad[#bad + 1] = id end end
    local ids = sorted(out.fsl or {})
    local offs, seen = {}, {}
    for _, o in ipairs(out.fso or {}) do
      local f, src = o[1], o[2]
      if src == nil then
        local e = FSHEET.off[f]
        if e then f, src = e[1], e[2] else bad[#bad + 1] = f; src = "" end
      end
      if not seen[f] then seen[f] = true; offs[#offs + 1] = { f, src } end
    end
    out.fsids, out.fsoff = ids, offs
    if #bad > 0 then out.fsbad = bad end
    out:head("FORMULA SHEET (" .. ((#ids == 0) and "none" or tostring(#ids)) .. " used)")
    local sec
    for _, id in ipairs(ids) do
      local e = byId[id]
      if e.sec ~= sec then sec = e.sec; out:add("fsec", " " .. SECS[sec] .. ":") end
      out:add("fsl", "  " .. e.f)
    end
    if #ids == 0 then
      out:note((#offs > 0) and "no sheet line is used as it is: see the formulas below"
               or "nothing solved yet: N lists this type's sheet formulas")
    end
    if #offs > 0 then
      out:head("NOT ON THE SHEET (" .. #offs .. ")")
      for _, o in ipairs(offs) do out:add("fsx", "  " .. o[1] .. "  <- " .. o[2]) end
    end
  end

  -- the start of a type's N page ("@@" = a sheet section, "@=" = a formula; see buildDoc)
  function FSHEET.notes(ti)
    local ids = sorted(FSHEET.types[ti] or {})
    local t = { "## FORMULA SHEET (" .. ((#ids == 0) and "none" or tostring(#ids)) .. " for this type)" }
    if #ids == 0 then
      t[#t + 1] = "None: this type's formulas are not on the sheet. Each answer lists them under NOT ON THE SHEET."
    else
      t[#t + 1] = "Type them in the exam box exactly like this. Each answer lists the ones it used."
      local sec
      for _, id in ipairs(ids) do
        local e = byId[id]
        if e.sec ~= sec then sec = e.sec; t[#t + 1] = "@@" .. SECS[sec] .. ":" end
        t[#t + 1] = "@=" .. e.f
      end
    end
    return table.concat(t, "\n")
  end

  -- every type's N page starts with its sheet formulas
  for ti, qt in ipairs(TYPES) do qt.notes = FSHEET.notes(ti) .. "\n\n" .. (qt.notes or "") end
end
