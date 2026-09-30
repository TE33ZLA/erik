----------------------------------------------------------------------
-- WEEKS 10-11: COST OF CAPITAL AND CAPITAL STRUCTURE
--   20 costs of equity, debt, preference shares and the WACC
--   21 capital structure: Modigliani-Miller with and without tax
----------------------------------------------------------------------
do
  local MODES20 = { "WACC (the costs are known)", "cost of equity (CAPM or DDM)", "cost of debt (bond YTM)", "cost of preference shares" }
  local function solveWACC(V, out)
    local mode = V.mode or MODES20[1]
    if mode == MODES20[2] then
      local any = false
      if V.rf and V.beta and (V.rm or V.mrp) then
        local mrp = V.mrp or (V.rm - V.rf)
        out:head("CAPM")
        out:row("rE", V.rf + V.beta * mrp, "%", "rf + beta x (E[RM] - rf) = " .. pct(V.rf) .. "% + " .. P(V.beta) .. " x " .. pct(mrp) .. "%", "reC")
        out:uses("capm")
        any = true
      end
      if V.P0 and (V.D1 or V.D0) and V.g then
        local D1 = V.D1 or V.D0 * (1 + V.g)
        out:head("DIVIDEND GROWTH MODEL")
        if not V.D1 then out:row("D1", D1, "$", "D0 x (1 + g) = " .. P(V.D0) .. " x " .. P(1 + V.g), "D1"); out:off("d1g") end
        out:row("rE", D1 / V.P0 + V.g, "%", "D1/P0 + g = " .. P(D1) .. "/" .. P(V.P0) .. " + " .. P(V.g), "reD")
        out:off("reddm")
        any = true
      end
      if not any then out:need("rf, beta and E[RM] (CAPM) or D0/D1, P0 and g (DDM)") end
      return
    end
    if mode == MODES20[3] then
      local rd = V.rd
      if not rd then
        if not (V.face and V.cpn and V.yrs and V.price) then out:need("the pre-tax cost of debt, or the bond: face, coupon, years and price"); return end
        local m = tonumber(tostring(V.m or "1"):match("^%d+")) or 1
        local C, N = V.cpn * V.face / m, V.yrs * m
        local fy = function(i) return bondPrice(i, C, V.face, N) - V.price end
        local y = findRoot(fy, 0.00001, 2, 0.001)
        if not y then out:err("no yield found: check the bond's price"); return end
        rd = y * m
        out:head("YTM FROM THE BOND PRICE")
        out:row("coupon each period", C, "$", "coupon rate x face / m", "C")
        out:row("yield per period", y, "%", "the rate that makes the PV of the bond = its price", "y")
        out:row("rD (YTM, yearly)", rd, "%", "y x m", "rd")
        out:head("ON YOUR TI-NSPIRE")
        out:xl("tvmI(" .. P(N) .. ",-" .. P(V.price) .. "," .. P(C) .. "," .. P(V.face) .. "," .. m .. "," .. m .. ")")
        out:off("coupon"); out:off("ytm")
        out:interp(fy, y, "", "PBond - price", "bond")
      end
      if V.Tc then out:row("after-tax rD", rd * (1 - V.Tc), "%", "rD x (1 - Tc) = " .. pct(rd) .. "% x " .. P(1 - V.Tc), "rdat"); out:off("rdat") end
      out:note("the cost of debt is the YIELD (what lenders earn now), not the coupon rate")
      return
    end
    if mode == MODES20[4] then
      local div = V.divp
      if not div and V.divpct and V.par then
        div = V.divpct * V.par
        out:row("DIVp", div, "$", "dividend % x par = " .. P(V.divpct) .. " x " .. P(V.par), "divp")
        out:off("divp")
      end
      if not (div and V.pp) then out:need("the preference dividend (or % of par and par) and the price"); return end
      out:row("rP", div / V.pp, "%", "DIVp/Pp = " .. P(div) .. "/" .. P(V.pp), "rp")
      out:uses("rp")
      out:note("no tax adjustment: preference dividends are NOT tax-deductible")
      return
    end
    local E = V.E or ((V.nE and V.pE) and V.nE * V.pE)
    local D = V.D or ((V.nD and V.pD) and V.nD * V.pD)
    local Pv = V.Pv or 0
    if not (E and D and V.re and V.rd) then out:need("E, D (market values) and the costs rE and rD (rP if there are preference shares)"); return end
    local Tc = V.Tc or 0
    local Vt = E + D + Pv
    out:head("MARKET-VALUE WEIGHTS")
    if not V.E then out:row("E", E, "$", "shares x price", "E"); out:off("mv") end
    if not V.D then out:row("D", D, "$", "bonds x price", "D"); out:off("mv") end
    out:row("V = E + P + D", Vt, "$", P(E) .. " + " .. P(Pv) .. " + " .. P(D), "V")
    out:row("E/V", E / Vt, "%", "", "wE")
    if Pv > 0 then out:row("P/V", Pv / Vt, "%", "", "wP") end
    out:row("D/V", D / Vt, "%", "", "wD")
    local w = V.re * E / Vt + (V.rp or 0) * Pv / Vt + V.rd * (1 - Tc) * D / Vt
    out:head("WACC")
    out:row("rD after tax", V.rd * (1 - Tc), "%", "rD x (1 - Tc)", "rdat")
    out:row("WACC", w, "%", "rE(E/V) + rP(P/V) + rD(1 - Tc)(D/V)", "wacc")
    out:uses("v", "wacc")
    if V.irr then
      out:head("THE PROJECT (same risk as the firm)")
      out:add(V.irr >= w and "ok" or "bad", V.irr >= w and "IRR >= WACC: accept" or "IRR < WACC: reject")
    end
  end
  table.insert(TYPES, {
    name = "Cost of capital and WACC", group = 7, solve = solveWACC,
    desc = "cost of equity (CAPM or dividend growth), cost of debt (YTM, after tax), preference shares, the WACC",
    looks = "WACC | cost of equity | cost of debt | after-tax | preference shares | market values | capital structure weights",
    slots = {
      S("mode", "what to find", "choice", MODES20, 1),
      S("E", "E equity market value ($)", "money"),
      S("nE", "or: number of shares", "num"), S("pE", "and share price ($)", "money"),
      S("D", "D debt market value ($)", "money"),
      S("nD", "or: number of bonds", "num"), S("pD", "and bond price ($)", "money"),
      S("Pv", "P preference value ($)", "money"),
      S("re", "rE cost of equity (%)", "pct"),
      S("rd", "rD pre-tax cost of debt (%)", "pct"),
      S("rp", "rP cost of preference (%)", "pct"),
      S("Tc", "Tc company tax (%)", "pct"),
      S("irr", "project IRR (%) (optional)", "pct"),
      S("rf", "rf risk-free (%)", "pct"), S("beta", "equity beta", "num"),
      S("rm", "E[RM] market return (%)", "pct"), S("mrp", "or: market risk premium (%)", "pct"),
      S("D0", "D0 dividend just paid ($)", "money"), S("D1", "or: D1 next dividend ($)", "money"),
      S("P0", "P0 share price ($)", "money"), S("g", "g dividend growth (%)", "pct"),
      S("face", "bond face value ($)", "money", nil, nil, "1000"),
      S("cpn", "coupon rate (% p.a.)", "pct"), S("yrs", "years to maturity", "num"),
      S("price", "bond price ($)", "money"),
      S("m", "coupons a year", "choice", { "1 (annual)", "2 (semi-annual)", "4 (quarterly)" }, 1),
      S("divp", "preference dividend ($)", "money"),
      S("divpct", "or: dividend % of par", "pct"), S("par", "and par value ($)", "money"),
      S("pp", "preference share price ($)", "money"),
    },
    vis = function(Sm)
      local m = Sm.mode.opts[Sm.mode.idx]
      if m == MODES20[2] then return { "mode", "rf", "beta", "rm", "mrp", "D0", "D1", "P0", "g" } end
      if m == MODES20[3] then return { "mode", "rd", "face", "cpn", "yrs", "price", "m", "Tc" } end
      if m == MODES20[4] then return { "mode", "divp", "divpct", "par", "pp" } end
      return { "mode", "E", "nE", "pE", "D", "nD", "pD", "Pv", "re", "rd", "rp", "Tc", "irr" }
    end,
    hints = {
      mode = "left/right: WACC, equity, debt, preference",
      E = "market value of equity (not book value)",
      nE = "or shares on issue x share price",
      D = "market value of debt (bonds x price)",
      Pv = "market value of preference shares (blank if none)",
      re = "cost of equity (work it out in the equity mode)",
      rd = "PRE-tax cost of debt = the bond's YTM",
      Tc = "company tax rate, e.g. 30",
      irr = "the project's IRR: accept if it beats the WACC",
      beta = "the EQUITY beta",
      D0 = "dividend JUST paid (D1 = D0 x (1 + g))",
      cpn = "the coupon RATE (for the cash flows only)",
      price = "the bond's price today",
      divpct = "'pays 10% of par' -> 10",
    },
    formula = { "r_WACC = r_E*(E/V) + r_P*(P/V) + r_D*(1 - T_c)*(D/V)", "r_E = r_f + beta*(E[R_M] - r_f) or D_1/P_0 + g   r_P = (DIV_p)/(P_p)" },
    words = "the WACC is the average cost of the firm's money, weighted by market values, with debt made cheaper by tax",
    letters = { "E, P, D = market values of equity, preference shares and debt; V = E + P + D", "rE = cost of equity",
                "rD = pre-tax cost of debt (the YTM); rD(1 - Tc) = after tax", "rP = cost of preference shares",
                "Tc = company tax rate", "D0 = dividend just paid; D1 = next; g = growth" },
    acronyms = { "WACC = weighted average cost of capital", "YTM = yield to maturity", "CAPM = capital asset pricing model",
                 "DDM = dividend discount (growth) model", "IRR = internal rate of return" },
    notes = [[COST OF CAPITAL AND WACC

HOW TO USE
1. Work out each cost in its mode:
   equity (CAPM or DDM), debt (YTM),
   preference shares.
2. Then the WACC mode: market values
   and the costs (all as %).

FORMULAS
$$r_E = r_f + beta*(E[R_M] - r_f)
$$r_E = (D_1)/(P_0) + g
$$r_P = (DIV_p)/(P_p)
$$r_WACC = r_E*(E/V) + r_P*(P/V) + r_D*(1 - T_c)*(D/V)
Use MARKET values. Only debt gets the
tax adjustment.]],
    assume = STEPS_COMMON .. [[
THIS TYPE:
1. market values: E, P, D and V
2. each cost: rE, rP, rD
3. rD after tax = rD(1 - Tc)
4. weight and add

IF THE QUESTION SAYS...
- "coupon rate 10%, YTM 4.25%" -> rD is
  the YTM (4.25%)
- "just paid a dividend" -> D1 = D0(1 + g)
- "project with the same risk" -> use the
  WACC; accept if IRR > WACC

TRAPS
- book values instead of market values
- taxing the preference dividend
- using the coupon rate as rD]],
    worked = [[## After-tax cost of debt
Q: coupon 10%, YTM 4.25%, tax 30%.
ENTER: mode debt | rD 4.25 | Tc 30
4.25% x 0.7 = 2.98%

## Cost of preference shares
Q: par $20, pays 10% of par, price
$22.86.
ENTER: mode preference | divpct 10 |
par 20 | pp 22.86
2/22.86 = 8.75%

## WACC
Q: E $612.5m (14.25%), P $58.5m
(6.75%), D $128.7m (4.5%), tax 30%.
ENTER: E 612.5m | Pv 58.5m | D 128.7m |
re 14.25 | rp 6.75 | rd 4.5 | Tc 30
WACC = 11.91%]],
  })

  ------------------------------------------------------------------
  -- 21 Modigliani-Miller
  ------------------------------------------------------------------
  local MODES21 = { "cost of equity rE (and WACC)", "unlevered cost rU", "tax shield and levered value", "recapitalise to a new D/E",
                    "value from cash flows (EBIT or FCF)" }
  -- v23: value the firm from its cash flow forever: VU = FCF/rU, VL = VU + Tc x D (- PV of distress costs), E = VL - D
  local function solveValue(V, out, Tc)
    local tax = Tc > 0
    local fcf = V.FCF
    if not fcf and V.EBIT then
      fcf = V.EBIT * (1 - Tc)
      out:row("FCF each year (unlevered)", fcf, "$", "EBIT*(1 - Tc) = " .. P(V.EBIT) .. "*" .. P(1 - Tc) ..
              "  (an all-equity firm pays out its after-tax EBIT)", "FCF")
    end
    local rU, VU = V.rU, V.VU
    out:head("ALL-EQUITY FIRM")
    if fcf and rU and not VU then
      VU = fcf / rU
      out:row("VU", VU, "$", "FCF/rU = " .. P(fcf) .. "/" .. P(rU) .. "  (a perpetuity)", "VU")
      out:uses("perp"); out:off("vucf")
    elseif fcf and VU and not rU then
      rU = fcf / VU
      out:row("rU", rU, "%", "FCF/VU = " .. P(fcf) .. "/" .. P(VU) .. "  (the perpetuity, solved for r)", "rU")
      out:off("rucf")
    elseif fcf and VU and rU then
      out:check("VU = FCF/rU (it gives " .. fmtU(fcf / rU, "$") .. ")", math.abs(fcf / rU - VU) <= 0.005 * math.abs(VU) + 0.01)
    end
    if not VU then out:need("the cash flow (EBIT and Tc, or FCF) and rU, or VU"); return end
    if rU then out:note("the unlevered firm's WACC = rU = " .. pct(rU) .. "% (it has no debt)"); out:off("unlev") end
    if not V.D then out:need("D: the permanent debt, to value the levered firm"); return end
    out:head(tax and "LEVERED FIRM (with tax)" or "LEVERED FIRM (no tax)")
    local VL
    if tax then
      if V.rd then out:row("interest tax shield each year", Tc * V.rd * V.D, "$", "Interest*Tc = " .. P(V.rd) .. " x " .. P(V.D) .. " x " .. P(Tc), "its"); out:uses("its") end
      out:row("PV of the tax shield", Tc * V.D, "$", "Tc*D = " .. P(Tc) .. " x " .. P(V.D) .. "  (permanent debt)", "pvts")
      out:uses("pvits")
      VL = VU + Tc * V.D
    else
      VL = VU
      out:note("no tax: debt does not change the firm's value (E + D = U)")
      out:uses("mm1")
    end
    if V.PVd then
      VL = VL - V.PVd
      out:row("VL", VL, "$", "VU" .. (tax and " + Tc*D" or "") .. " - PV(distress) = " .. P(VU) .. (tax and (" + " .. P(Tc * V.D)) or "") ..
              " - " .. P(V.PVd), "VL")
      out:off("tradeoff")
      out:note("trade-off theory (textbook): the PV of distress costs is NOT on the formula sheet")
    else
      out:row("VL", VL, "$", tax and ("VU + Tc*D = " .. P(VU) .. " + " .. P(Tc * V.D)) or "VL = VU", "VL")
      if tax then out:uses("vl") end
    end
    local E = VL - V.D
    out:row("E (equity value)", E, "$", "VL - D = " .. P(VL) .. " - " .. P(V.D), "E")
    out:off("eqvl")
    if V.shares then
      out:row("share price", E / V.shares, "$", "E/shares = " .. P(E) .. "/" .. P(V.shares), "price")
      out:off("price")
    end
    if V.rd and rU and not V.PVd and E > 0 then
      local DE = V.D / E
      local re = rU + DE * (rU - V.rd) * (1 - Tc)
      out:head("COST OF EQUITY AND WACC (levered)")
      out:row("D/E", DE, "", P(V.D) .. "/" .. P(E), "DE")
      out:row("rE", re, "%", "rU + D/E*(rU - rD)" .. (tax and "*(1 - Tc)" or "") .. " = " .. pct(rU) .. "% + " .. P(DE) .. " x " ..
              pct(rU - V.rd) .. "%" .. (tax and (" x " .. P(1 - Tc)) or ""), "re")
      local w = re * E / VL + V.rd * (1 - Tc) * V.D / VL
      out:row("WACC", w, "%", "rE*E/(E + D) + rD*D/(E + D)" .. (tax and "*(1 - Tc)" or ""), "wacc")
      if tax then
        out:uses("ret2", "wacct")
        out:note("check: FCF/WACC = " .. fmtU(fcf and fcf / w or 0, "$") .. " = VL (with tax the WACC is below rU)")
      else
        out:uses("re", "ru")
        out:note("no tax: the WACC stays at rU")
      end
    end
  end

  local function solveMM(V, out)
    local mode = V.mode or MODES21[1]
    local Tc = V.Tc or 0
    local tax = Tc > 0
    if mode == MODES21[5] then solveValue(V, out, Tc); return end
    local function reOf(rU, rD, DE) return rU + DE * (rU - rD) * (1 - Tc) end
    if mode == MODES21[2] or mode == MODES21[4] then
      local rU = V.rU
      if not rU then
        if not (V.re and V.rd and V.E and V.D) then out:need("rE, rD and the market values E and D"); return end
        rU = V.re * V.E / (V.E + V.D) + V.rd * V.D / (V.E + V.D)
        out:row("rU (unlevered)", rU, "%", "rE(E/(E + D)) + rD(D/(E + D)) = the pre-tax WACC", "rU")
        out:uses("ru")
      end
      if mode == MODES21[4] then
        if not (V.newDE and V.rd) then out:need("the new D/E and rD"); return end
        out:row("new rE", reOf(rU, V.rd, V.newDE), "%", "rU + D/E (rU - rD)" .. (tax and "(1 - Tc)" or "") .. " with D/E = " .. P(V.newDE), "re2")
        out:uses(tax and "ret2" or "re")
      end
      return
    end
    if mode == MODES21[3] then
      if not V.D then out:need("the debt D"); return end
      if not tax then out:need("the company tax rate Tc (without tax there is no tax shield)"); return end
      out:head("INTEREST TAX SHIELD")
      if V.rd then out:row("tax shield each year", Tc * V.rd * V.D, "$", "Tc x interest = Tc x rD x D", "its"); out:uses("its") end
      out:row("PV of the tax shield", Tc * V.D, "$", "Tc x D (permanent debt) = " .. P(Tc) .. " x " .. P(V.D), "pvts")
      out:uses("pvits")
      if V.VU then
        local VL = V.VU + Tc * V.D
        out:row("VL levered value", VL, "$", "VU + Tc x D = " .. P(V.VU) .. " + " .. P(Tc * V.D), "VL")
        out:row("E after the buyback", VL - V.D, "$", "VL - D", "E2")
        out:uses("vl"); out:off("eqvl")
        if V.rU and V.rd then out:row("rE after", reOf(V.rU, V.rd, V.D / (VL - V.D)), "%", "rU + D/E (rU - rD)(1 - Tc)", "re2"); out:uses("ret2") end
      end
      return
    end
    local DE = V.DE or ((V.D and V.E) and V.D / V.E)
    if not (V.rU and V.rd and DE) then out:need("rU, rD and D/E (or D and E)"); return end
    out:head(tax and "MM WITH TAX" or "MM, NO TAX")
    if not V.DE then out:row("D/E", DE, "", P(V.D) .. "/" .. P(V.E), "DE") end
    local re = reOf(V.rU, V.rd, DE)
    out:row("rE", re, "%", "rU + D/E (rU - rD)" .. (tax and "(1 - Tc)" or "") .. " = " .. pct(V.rU) .. "% + " .. P(DE) .. " x " .. pct(V.rU - V.rd) .. "%" .. (tax and (" x " .. P(1 - Tc)) or ""), "re")
    local wE, wD = 1 / (1 + DE), DE / (1 + DE)
    out:row("WACC", re * wE + V.rd * (1 - Tc) * wD, "%", "rE(E/V) + rD(1 - Tc)(D/V)", "wacc")
    if tax then out:uses("ret2", "wacct") else out:uses("re", "ru") end
    if not tax then out:note("no tax: the WACC stays equal to rU whatever the leverage") end
  end
  table.insert(TYPES, {
    name = "Capital structure: MM", group = 7, solve = solveMM,
    desc = "Modigliani-Miller: cost of equity with leverage, unlevered cost, tax shield, levered value, recapitalisation, value and share price from cash flows",
    looks = "Modigliani | MM | unlevered | levered | tax shield | permanent debt | buy back shares | debt-to-equity | share price after borrowing | value of the firm | EBIT forever | unlevered free cash flow | financial distress | trade-off",
    slots = {
      S("mode", "what to find", "choice", MODES21, 1),
      S("rU", "rU unlevered cost (%)", "pct"),
      S("rd", "rD cost of debt (%)", "pct"),
      S("re", "rE cost of equity now (%)", "pct"),
      S("E", "E equity value ($)", "money"),
      S("D", "D debt value ($)", "money"),
      S("DE", "or: D/E ratio", "num"),
      S("Tc", "Tc tax (%) (blank = no tax)", "pct"),
      S("VU", "VU all-equity value ($)", "money"),
      S("newDE", "new D/E after recap", "num"),
      S("EBIT", "EBIT each year ($)", "money"),
      S("FCF", "or: unlevered FCF a year ($)", "money"),
      S("shares", "number of shares", "num"),
      S("PVd", "PV of distress costs ($)", "money"),
    },
    vis = function(Sm)
      local m = Sm.mode.opts[Sm.mode.idx]
      if m == MODES21[1] then return { "mode", "rU", "rd", "E", "D", "DE", "Tc" } end
      if m == MODES21[2] then return { "mode", "re", "rd", "E", "D" } end
      if m == MODES21[3] then return { "mode", "D", "rd", "Tc", "VU", "rU" } end
      if m == MODES21[5] then return { "mode", "EBIT", "FCF", "Tc", "rU", "VU", "D", "rd", "shares", "PVd" } end
      return { "mode", "re", "rd", "E", "D", "rU", "newDE", "Tc" }
    end,
    hints = {
      mode = "left/right: rE, rU, tax shield, recapitalise",
      rU = "the cost of capital if the firm had NO debt",
      rd = "the interest rate on the debt",
      re = "today's cost of equity (to unlever)",
      DE = "debt-to-equity ratio, e.g. 0.75",
      Tc = "'there are no taxes' -> leave blank",
      VU = "value of the firm with no debt",
      newDE = "'until its debt-to-equity ratio is 1.5'",
      EBIT = "EBIT each year, forever; distress cuts it? type the LOWER one",
      FCF = "or the after-tax cash flow of the all-equity firm (the lower one if distress cuts it)",
      shares = "number of shares, for the price per share",
      PVd = "PV of financial distress costs (trade-off; not on the sheet)",
    },
    formula = { "r_E = r_U + D/E*(r_U - r_D)*(1 - T_c)", "V_L = V_U + T_c*D   r_U = r_E*E/V + r_D*D/V" },
    words = "debt makes equity riskier, so rE rises with D/E; with tax, debt adds value through the interest tax shield",
    letters = { "rU = unlevered cost of capital (no debt)", "rE = cost of equity; rD = cost of debt", "D/E = debt-to-equity ratio",
                "Tc = company tax rate (0 = no tax)", "VU = all-equity value; VL = levered value", "Tc x D = PV of the tax shield (permanent debt)" },
    acronyms = { "MM = Modigliani and Miller", "WACC = weighted average cost of capital", "D/E = debt-to-equity",
                 "EBIT = earnings before interest and tax; FCF = free cash flow", "PVd = PV of financial distress costs" },
    notes = [[CAPITAL STRUCTURE (MM)

HOW TO USE
No tax: leave Tc blank. With tax: type it.
rE mode: rU, rD and D/E (or D and E).
rU mode: today's rE, rD, E and D.
Tax shield: D (+ rD, VU, rU).
Recap: unlever, then relever at the
new D/E.
Value from cash flows: EBIT (or FCF),
Tc, rU (or VU), D, rD, the number of
shares, and PV of distress costs if
given. Cash flows cut by distress?
type the LOWER cash flow.

FORMULAS
$$r_U = r_E*(E)/(E + D) + r_D*(D)/(E + D)
$$r_E = r_U + D/E*(r_U - r_D)   (no tax)
$$r_E = r_U + D/E*(r_U - r_D)*(1 - T_c)
$$V_L = V_U + T_c*D   E = V_L - D
No tax: the WACC = rU at any leverage.
from cash flows (not on the sheet):
VU = FCF/rU with FCF = EBIT*(1 - Tc)
share price = (VL - D)/shares
trade-off (textbook, not on the sheet):
VL = VU + Tc*D - PV(distress costs)]],
    assume = STEPS_COMMON .. [[
THIS TYPE:
1. no tax or with tax? (choose the rE
   formula)
2. unlever first if you are given rE:
   rU = pre-tax WACC
3. relever at the new D/E

TRAPS
- no tax: WACC stays at rU
- with tax: VL = VU + Tc x D, so the
  equity after a buyback is VL - D]],
    worked = [[## Unlevered cost (no tax)
Q: E $520m (9.5%), D $390m (6%).
ENTER: mode rU | re 9.5 | rd 6 | E 520m |
D 390m
rU = 8.00%

## Cost of equity with tax
Q: rU 8%, rD 6%, D $315m, E $420m, 30%.
ENTER: rU 8 | rd 6 | D 315m | E 420m |
Tc 30
rE = 8% + 0.75 x 2% x 0.7 = 9.05%
WACC = 6.97%

## Buyback with tax
Q: VU $250m, rU 11%, borrows $125m at
5.5%, tax 30%.
ENTER: mode tax shield | D 125m | rd 5.5 |
Tc 30 | VU 250m | rU 11
VL = $287.5m; E = $162.5m; rE = 13.96%

## Share price after borrowing
Q: EBIT $1,000 a year forever, tax 30%,
rU 10%. Borrows $2,000 (permanent) and
has 400 shares. Price per share?
ENTER: mode value from cash flows |
EBIT 1000 | Tc 30 | rU 10 | D 2000 |
shares 400
VU = 1000 x 0.7/0.10 = $7,000
VL = 7,000 + 0.3 x 2,000 = $7,600
E = 7,600 - 2,000 = $5,600
price = 5,600/400 = $14.00]],
  })
end
