----------------------------------------------------------------------
-- WEEKS 10-11: COST OF CAPITAL AND CAPITAL STRUCTURE
--   20 costs of equity, debt, preference shares and the WACC
--   21 capital structure: Modigliani-Miller with and without tax
----------------------------------------------------------------------
do
  local MODES20 = { "WACC (the costs are known)", "cost of equity (CAPM or DDM)", "cost of debt (bond YTM)", "cost of preference shares",
                    "weights: book and market values", "cost of debt: two bond issues", "projects vs the SML and WACC",
                    "project NPV at the WACC" }
  local function mCount(s) return tonumber(tostring(s or "1"):match("^%d+")) or 1 end
  -- a bond's yield per coupon period, from its price as a fraction of face (0.95 = 95%)
  local function yieldOf(cpn, yrs, frac, m)
    local C, N = cpn * 100 / m, yrs * m
    local fy = function(i) return bondPrice(i, C, 100, N) - frac * 100 end
    return findRoot(fy, 0.00001, 2, 0.001)
  end
  local function solveWACC(V, out)
    local mode = V.mode or MODES20[1]
    if mode == MODES20[2] then
      local any = false
      if V.rf and V.beta and (V.rm or V.mrp) then
        local mrp = V.mrp or (V.rm - V.rf)
        out:head("CAPM (SML)")
        out:row("rE", V.rf + V.beta * mrp, "%", "rf + beta x (E[RM] - rf) = " .. pct(V.rf) .. "% + " .. P(V.beta) .. " x " .. pct(mrp) .. "%", "reC")
        out:uses("capm")
        any = true
      end
      -- g from past dividends (oldest first): the average of the yearly % changes, as in the lectures
      local g, D0 = V.g, V.D0
      local hs = {}
      for k = 1, 6 do if V["h" .. k] then hs[#hs + 1] = V["h" .. k] end end
      if not g and #hs >= 2 then
        out:head("GROWTH FROM PAST DIVIDENDS")
        local sum = 0
        for k = 2, #hs do
          local gk = hs[k] / hs[k - 1] - 1
          sum = sum + gk
          out:row("growth " .. (k - 1) .. " -> " .. k, gk, "%", "(" .. P(hs[k]) .. " - " .. P(hs[k - 1]) .. ")/" .. P(hs[k - 1]), "g" .. (k - 1))
        end
        g = sum / (#hs - 1)
        out:row("g: average of the % changes", g, "%", "sum of the changes/" .. (#hs - 1), "g")
        out:note("compound growth instead: (" .. P(hs[#hs]) .. "/" .. P(hs[1]) .. ")^(1/" .. (#hs - 1) .. ") - 1 = " ..
                 pct((hs[#hs] / hs[1]) ^ (1 / (#hs - 1)) - 1) .. "% (the lectures use the average)")
        out:off("gavg")
        if not D0 and not V.D1 then D0 = hs[#hs]; out:note("D0 = the latest dividend in the list: " .. P(D0)) end
        if not V.P0 then out:note("type P0 (the share price) to turn g into rE"); any = true end
      end
      if V.P0 and (V.D1 or D0) and g then
        local D1 = V.D1 or D0 * (1 + g)
        out:head("DIVIDEND GROWTH MODEL (DCF)")
        if not V.D1 then out:row("D1", D1, "$", "D0 x (1 + g) = " .. P(D0) .. " x " .. P(1 + g), "D1"); out:off("d1g") end
        out:row("rE", D1 / V.P0 + g, "%", "D1/P0 + g = " .. P(D1) .. "/" .. P(V.P0) .. " + " .. P(g), "reD")
        out:off("reddm")
        any = true
      end
      if not any then out:need("rf, beta and E[RM] (CAPM) or D0/D1, P0 and g or past dividends (DDM)") end
      return
    end
    if mode == MODES20[3] then
      local rd, apr = V.rd, nil
      if not rd then
        local face = V.face or 1000
        local price = V.price or (V.ppct and V.ppct * face)
        if not (V.cpn and V.yrs and price) then
          out:need("the pre-tax cost of debt, or the bond: coupon rate, years LEFT and the price (or the price as a % of face)"); return
        end
        local m = mCount(V.m)
        local C, N = V.cpn * face / m, V.yrs * m
        local fy = function(i) return bondPrice(i, C, face, N) - price end
        local y = findRoot(fy, 0.00001, 2, 0.001)
        if not y then out:err("no yield found: check the bond's price"); return end
        out:head("YTM FROM THE BOND PRICE")
        if not V.price then out:row("bond price", price, "$", P(V.ppct) .. " x the face " .. P(face), "price") end
        out:row("coupon each period", C, "$", "coupon rate x face/m = " .. P(V.cpn) .. " x " .. P(face) .. "/" .. m, "C")
        out:row("periods left", N, "", "years LEFT x m = " .. P(V.yrs) .. " x " .. m, "N")
        out:row("yield per period", y, "%", "the rate that makes the PV of the bond = its price", "y")
        if m > 1 then
          -- the lectures turn the per-period yield into an EFFECTIVE yearly cost of debt
          rd, apr = (1 + y) ^ m - 1, y * m
          out:row("rD: effective a year (lectures)", rd, "%", "(1 + y)^m - 1 = (1 + " .. P(y) .. ")^" .. m .. " - 1", "rd")
          out:row("rD as an APR, y x m (textbook)", apr, "%", P(y) .. " x " .. m, "rdApr")
          out:note("the lectures use the EFFECTIVE yearly rate; Pearson/textbook answers often use the APR")
          out:uses("ear")
        else
          rd = y
          out:row("rD (YTM, yearly)", rd, "%", "the yield = the pre-tax cost of debt", "rd")
        end
        out:head("ON YOUR TI-NSPIRE")
        out:xl("tvmI(" .. P(N) .. ",-" .. P(price) .. "," .. P(C) .. "," .. P(face) .. "," .. m .. "," .. m .. ")")
        out:off("coupon"); out:off("ytm")
        out:interp(fy, y, "", "PBond - price", "bond")
      end
      if V.Tc then
        out:row("after-tax rD", rd * (1 - V.Tc), "%", "rD x (1 - Tc) = " .. pct(rd) .. "% x " .. P(1 - V.Tc), "rdat"); out:off("rdat")
        if apr then out:row("after-tax rD (APR)", apr * (1 - V.Tc), "%", pct(apr) .. "% x " .. P(1 - V.Tc), "rdatApr") end
        out:note("the AFTER-tax cost is the relevant one: interest is tax deductible")
      end
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
      if V.pfc then
        local Np = V.pp - V.pfc
        out:row("net proceeds", Np, "$", "price - issue cost = " .. P(V.pp) .. " - " .. P(V.pfc), "np")
        out:row("rP", div / Np, "%", "DIVp/net proceeds = " .. P(div) .. "/" .. P(Np), "rp")
        out:off("rpnet")
      else
        out:row("rP", div / V.pp, "%", "DIVp/Pp = " .. P(div) .. "/" .. P(V.pp), "rp")
        out:uses("rp")
      end
      out:note("no tax adjustment: preference dividends are NOT tax-deductible")
      return
    end
    if mode == MODES20[5] then
      -- book weights (face values, book equity) vs market weights (prices)
      local Em = V.E or ((V.nE and V.pE) and V.nE * V.pE)
      local Eb = V.BE or ((V.nE and V.bvps) and V.nE * V.bvps)
      local Db, Dm, any = 0, 0, false
      for k = 1, 3 do
        local F = V["F" .. k]
        if F then Db = Db + F; Dm = Dm + F * (V["q" .. k] or 1); any = true end
      end
      if not any or not (Em or Eb) then out:need("the shares (number, price, book value per share) and each bond issue's face value and price % of face"); return end
      if Eb then
        out:head("BOOK VALUES")
        out:row("E (book)", Eb, "$", V.BE and "given" or ("shares x book value per share = " .. P(V.nE) .. " x " .. P(V.bvps)), "Eb")
        out:row("D (book) = face values", Db, "$", "the face values added up", "Db")
        out:row("E/V (book)", Eb / (Eb + Db), "%", P(Eb) .. "/" .. P(Eb + Db), "wEb")
        out:row("D/V (book)", Db / (Eb + Db), "%", P(Db) .. "/" .. P(Eb + Db), "wDb")
      end
      if Em then
        out:head("MARKET VALUES")
        out:row("E (market)", Em, "$", V.E and "given" or ("shares x price = " .. P(V.nE) .. " x " .. P(V.pE)), "Em")
        for k = 1, 3 do
          local F = V["F" .. k]
          if F then out:row("issue " .. k .. " market value", F * (V["q" .. k] or 1), "$", "face x price % = " .. P(F) .. " x " .. P(V["q" .. k] or 1), "Dm" .. k) end
        end
        out:row("D (market)", Dm, "$", "the issues added up", "Dm")
        out:row("E/V (market)", Em / (Em + Dm), "%", P(Em) .. "/" .. P(Em + Dm), "wEm")
        out:row("D/V (market)", Dm / (Em + Dm), "%", P(Dm) .. "/" .. P(Em + Dm), "wDm")
        out:note("use the MARKET weights in the WACC: they are today's values")
      end
      out:off("bookmv")
      return
    end
    if mode == MODES20[6] then
      -- the cost of debt of several issues: each yield, weighted by market value
      local m = mCount(V.m)
      local tot, sumE, sumA, n = 0, 0, 0, 0
      for k = 1, 3 do
        local F, c, yrs, q = V["F" .. k], V["c" .. k], V["n" .. k], V["q" .. k]
        if F and c and yrs and q then
          local y = yieldOf(c, yrs, q, m)
          if not y then out:err("issue " .. k .. ": no yield found - check its price"); return end
          local ear, apr, mv = (1 + y) ^ m - 1, y * m, F * q
          out:head("ISSUE " .. k)
          out:row("issue " .. k .. ": yield per period", y, "%", "PV of the bond = its price (per $100 face: " .. P(q * 100) .. ")", "y" .. k)
          if m > 1 then
            out:row("issue " .. k .. ": rD effective", ear, "%", "(1 + y)^" .. m .. " - 1", "rd" .. k)
            out:row("issue " .. k .. ": rD as an APR", apr, "%", "y x " .. m, "rdApr" .. k)
          else
            out:row("issue " .. k .. ": rD", ear, "%", "the yield", "rd" .. k)
          end
          out:row("issue " .. k .. ": market value", mv, "$", "face x price % = " .. P(F) .. " x " .. P(q), "mv" .. k)
          tot, sumE, sumA, n = tot + mv, sumE + mv * ear, sumA + mv * apr, n + 1
        end
      end
      if n == 0 then out:need("each issue's face value, coupon rate, years left and price % of face"); return end
      out:head("THE FIRM'S COST OF DEBT")
      out:row("D: total market value", tot, "$", "the issues added up", "D")
      out:row("rD (weighted)", sumE / tot, "%", "each rD x its share of D's market value", "rd")
      if m > 1 then out:row("rD (weighted, APR)", sumA / tot, "%", "the same with the APRs (textbook)", "rdApr") end
      if V.Tc then
        out:row("after-tax rD", sumE / tot * (1 - V.Tc), "%", "rD x (1 - Tc)", "rdat")
        if m > 1 then out:row("after-tax rD (APR)", sumA / tot * (1 - V.Tc), "%", "APR x (1 - Tc)", "rdatApr") end
      end
      if m > 1 then out:uses("ear") end
      out:off("rdmix"); out:off("ytm")
      return
    end
    if mode == MODES20[7] then
      -- each project against the SML (its own beta) and against the firm's single WACC
      local rm = V.rm or ((V.mrp and V.rf) and V.rf + V.mrp)
      if not (V.rf and rm) then out:need("rf and E[RM] (or the market risk premium)"); return end
      local n = 0
      for k = 1, 4 do
        local b, r = V["b" .. k], V["r" .. k]
        if b and r then
          n = n + 1
          local req = V.rf + b * (rm - V.rf)
          out:head("PROJECT " .. k)
          out:row("project " .. k .. ": required (SML)", req, "%", "rf + beta x (E[RM] - rf) = " .. pct(V.rf) .. "% + " .. P(b) .. " x " .. pct(rm - V.rf) .. "%", "req" .. k)
          local ok = r >= req - 1e-12
          out:add(ok and "ok" or "bad", "return " .. pct(r) .. "% " .. (ok and ">=" or "<") .. " " .. pct(req) .. "%: " .. (ok and "ACCEPT (above the SML)" or "REJECT (below the SML)"))
          if V.wacc then
            local wok = r >= V.wacc - 1e-12
            if wok and not ok then out:add("bad", "the WACC " .. pct(V.wacc) .. "% would WRONGLY ACCEPT it")
            elseif ok and not wok then out:add("bad", "the WACC " .. pct(V.wacc) .. "% would WRONGLY REJECT it")
            else out:note("the WACC " .. pct(V.wacc) .. "% gives the same answer") end
          end
        end
      end
      if n == 0 then out:need("each project's beta and its expected return (or IRR)"); return end
      out:note("the SML uses each project's OWN beta; one WACC for all assumes every project has the firm's average risk")
      out:uses("capm"); out:off("smlhurdle")
      return
    end
    if mode == MODES20[8] then
      -- a project worth FCF1/(r - g), at the WACC (+ an adjustment for its risk), less its cost and any issue costs
      if not (V.wacc and V.FCF1) then out:need("the WACC and the first year's cash flow FCF1"); return end
      local r, g = V.wacc + (V.adj or 0), V.gp or 0
      if r <= g then out:err("the rate must be above the growth rate"); return end
      out:head("THE PROJECT")
      if V.adj then out:row("rate used", r, "%", "WACC + adjustment = " .. pct(V.wacc) .. "% + " .. pct(V.adj) .. "%", "rate"); out:off("adjrate") end
      local pv = V.FCF1 / (r - g)
      if g ~= 0 then
        out:row("PV of the cash flows", pv, "$", "FCF1/(r - g) = " .. P(V.FCF1) .. "/(" .. P(r) .. " - " .. P(g) .. ")  (growing perpetuity)", "pv")
        out:uses("gperp")
      else
        out:row("PV of the cash flows", pv, "$", "FCF/r = " .. P(V.FCF1) .. "/" .. P(r) .. "  (perpetuity)", "pv")
        out:uses("perp")
      end
      local fees = V.fees or 0
      if V.cost then
        local npv = pv - V.cost - fees
        out:row("NPV", npv, "$", "PV - cost" .. ((fees > 0) and " - issue costs" or "") .. " = " .. P(pv) .. " - " .. P(V.cost) ..
                ((fees > 0) and (" - " .. P(fees)) or ""), "npv")
        out:add(npv >= 0 and "ok" or "bad", npv >= 0 and "NPV >= 0: accept" or "NPV < 0: reject")
      else
        out:row("highest cost worth paying", pv - fees, "$", "PV" .. ((fees > 0) and (" - issue costs = " .. P(pv) .. " - " .. P(fees)) or ""), "maxcost")
        out:note("take the project if its cost today is BELOW this")
      end
      if fees > 0 then out:off("floatcost") end
      return
    end
    local E = V.E or ((V.nE and V.pE) and V.nE * V.pE)
    local D = V.D or ((V.nD and V.pD) and V.nD * V.pD)
    local Pv = V.Pv or 0
    if not (E or D) and V.DE then
      -- only the D/E ratio: weights E/V = 1/(1 + D/E), D/V = (D/E)/(1 + D/E)
      E, D = 1, V.DE
      out:row("weights from D/E", V.DE, "", "E/V = 1/(1 + D/E) = " .. pct(1 / (1 + V.DE)) .. "%, D/V = " .. pct(V.DE / (1 + V.DE)) .. "%", "DE")
      out:off("dew")
    end
    if not (E and D and V.re and V.rd) then out:need("E, D (market values, or the weights, or D/E) and the costs rE and rD (rP if there are preference shares)"); return end
    local Tc = V.Tc or 0
    local Vt = E + D + Pv
    out:head("MARKET-VALUE WEIGHTS")
    if not V.E and not V.DE then out:row("E", E, "$", "shares x price", "E"); out:off("mv") end
    if not V.D and not V.DE then out:row("D", D, "$", "bonds x price", "D"); out:off("mv") end
    out:row("V = E + P + D", Vt, "$", P(E) .. " + " .. P(Pv) .. " + " .. P(D), "V")
    out:row("E/V", E / Vt, "%", "", "wE")
    if Pv > 0 then out:row("P/V", Pv / Vt, "%", "", "wP") end
    out:row("D/V", D / Vt, "%", "", "wD")
    local w = V.re * E / Vt + (V.rp or 0) * Pv / Vt + V.rd * (1 - Tc) * D / Vt
    out:head("WACC")
    out:row("rD after tax", V.rd * (1 - Tc), "%", "rD x (1 - Tc)" .. ((Tc == 0) and " (no Tc: rD is used as typed)" or ""), "rdat")
    out:row("WACC", w, "%", "rE(E/V) + rP(P/V) + rD(1 - Tc)(D/V)", "wacc")
    out:uses("v", "wacc")
    if V.irr then
      out:head("THE PROJECT (same risk as the firm)")
      out:add(V.irr >= w and "ok" or "bad", V.irr >= w and "IRR >= WACC: accept" or "IRR < WACC: reject")
    end
  end
  local slots20 = {
      S("mode", "what to find", "choice", MODES20, 1),
      S("E", "E equity market value ($)", "money"),
      S("nE", "or: number of shares", "num"), S("pE", "and share price ($)", "money"),
      S("D", "D debt market value ($)", "money"),
      S("nD", "or: number of bonds", "num"), S("pD", "and bond price ($)", "money"),
      S("DE", "or: D/E ratio (weights only)", "num"),
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
      S("h1", "or: past dividend 1 (oldest) ($)", "money"), S("h2", "past dividend 2 ($)", "money"),
      S("h3", "past dividend 3 ($)", "money"), S("h4", "past dividend 4 ($)", "money"), S("h5", "past dividend 5 ($)", "money"),
      S("cpn", "coupon rate (% p.a.)", "pct"), S("yrs", "years LEFT to maturity", "num"),
      S("price", "bond price ($)", "money"), S("ppct", "or: price as % of face", "pct"),
      S("face", "bond face value ($)", "money", nil, nil, "1000"),
      S("m", "coupons a year", "choice", { "1 (annual)", "2 (semi-annual)", "4 (quarterly)" }, 1),
      S("divp", "preference dividend ($)", "money"),
      S("divpct", "or: dividend % of par", "pct"), S("par", "and par value ($)", "money"),
      S("pp", "preference share price ($)", "money"), S("pfc", "issue cost per share ($)", "money"),
      S("bvps", "book value per share ($)", "money"), S("BE", "or: book equity total ($)", "money"),
      S("F1", "issue 1: face value ($)", "money"), S("c1", "issue 1: coupon rate (%)", "pct"),
      S("n1", "issue 1: years left", "num"), S("q1", "issue 1: price % of face", "pct"),
      S("F2", "issue 2: face value ($)", "money"), S("c2", "issue 2: coupon rate (%)", "pct"),
      S("n2", "issue 2: years left", "num"), S("q2", "issue 2: price % of face", "pct"),
      S("wacc", "the firm's WACC (%)", "pct"),
      S("b1", "project 1: beta", "num"), S("r1", "project 1: return or IRR (%)", "pct"),
      S("b2", "project 2: beta", "num"), S("r2", "project 2: return or IRR (%)", "pct"),
      S("b3", "project 3: beta", "num"), S("r3", "project 3: return or IRR (%)", "pct"),
      S("b4", "project 4: beta", "num"), S("r4", "project 4: return or IRR (%)", "pct"),
      S("adj", "risk adjustment (+/- %)", "pct"),
      S("FCF1", "FCF in year 1 ($)", "money"), S("gp", "growth of the FCF (%)", "pct"),
      S("cost", "project cost today ($)", "money"), S("fees", "issue (flotation) costs ($)", "money"),
  }
  table.insert(TYPES, {
    name = "Cost of capital and WACC", group = 7, solve = solveWACC,
    desc = "WACC, cost of equity (CAPM or dividend growth), cost of debt (YTM, effective, after tax), preference shares, book vs market weights, several bond issues, projects vs the SML, project NPV at the WACC",
    looks = "WACC | cost of equity | cost of debt | after-tax | pretax | preference shares | market values | book values | capital structure weights | target capital structure | two bond issues | percent of par | security market line | hurdle rate | incorrectly accepted | incorrectly rejected | adjustment factor | flotation costs | issuance costs | cost savings grow",
    slots = slots20,
    vis = function(Sm)
      local m = Sm.mode.opts[Sm.mode.idx]
      if m == MODES20[2] then return { "mode", "rf", "beta", "rm", "mrp", "D0", "D1", "P0", "g", "h1", "h2", "h3", "h4", "h5" } end
      if m == MODES20[3] then return { "mode", "rd", "cpn", "yrs", "price", "ppct", "face", "m", "Tc" } end
      if m == MODES20[4] then return { "mode", "divp", "divpct", "par", "pp", "pfc" } end
      if m == MODES20[5] then return { "mode", "nE", "pE", "bvps", "BE", "F1", "q1", "F2", "q2" } end
      if m == MODES20[6] then return { "mode", "F1", "c1", "n1", "q1", "F2", "c2", "n2", "q2", "m", "Tc" } end
      if m == MODES20[7] then return { "mode", "rf", "rm", "mrp", "wacc", "b1", "r1", "b2", "r2", "b3", "r3", "b4", "r4" } end
      if m == MODES20[8] then return { "mode", "wacc", "adj", "FCF1", "gp", "cost", "fees" } end
      return { "mode", "E", "nE", "pE", "D", "nD", "pD", "DE", "Pv", "re", "rd", "rp", "Tc", "irr" }
    end,
    hints = {
      mode = "left/right changes the kind; ESC: back to the list",
      E = "market value of equity, or its WEIGHT, e.g. 65 (for 65%)",
      nE = "or shares on issue x share price",
      D = "market value of debt (bonds x price), or its weight, e.g. 35",
      DE = "'target debt-equity ratio 0.6': type 0.6",
      Pv = "market value of preference shares (blank if none)",
      re = "cost of equity (work it out in the equity kind)",
      rd = "PRE-tax rD = the YTM; given AFTER tax? type it, Tc blank",
      Tc = "company tax rate, e.g. 30",
      irr = "the project's IRR: accept if it beats the WACC",
      beta = "the EQUITY beta",
      D0 = "dividend JUST paid (D1 = D0 x (1 + g))",
      h1 = "oldest first; g = average yearly % change",
      cpn = "the coupon RATE (for the cash flows only)",
      yrs = "years LEFT: a 20-year bond issued 5 years ago -> 15",
      price = "the bond's price today, e.g. 950",
      ppct = "'sells for 95% of face' -> 95",
      pfc = "flotation cost per share: rP = DIVp/net proceeds",
      divpct = "'pays 10% of par' -> 10",
      bvps = "book value per share (book equity = shares x this)",
      F1 = "total face value of this issue, e.g. 40m",
      q1 = "'trades at 98% of par' -> 98",
      c1 = "this issue's coupon rate, e.g. 8",
      wacc = "the firm's overall cost of capital",
      b1 = "the project's beta (then its return or IRR)",
      r1 = "its expected return or IRR, e.g. 11",
      adj = "riskier project: +2; safer: -2 (blank = none)",
      FCF1 = "cash flow (or saving) at the END of year 1",
      gp = "growth a year forever (blank = no growth)",
      cost = "upfront cost (blank: find the most you can pay)",
      fees = "costs of raising the money (issue costs)",
    },
    formula = { "r_WACC = r_E*(E/V) + r_P*(P/V) + r_D*(1 - T_c)*(D/V)", "r_E = r_f + beta*(E[R_M] - r_f) or D_1/P_0 + g   r_P = (DIV_p)/(P_p)" },
    words = "the WACC is the average cost of the firm's money, weighted by market values, with debt made cheaper by tax",
    letters = { "E, P, D = market values of equity, preference shares and debt; V = E + P + D", "rE = cost of equity",
                "rD = pre-tax cost of debt (the YTM); rD(1 - Tc) = after tax", "rP = cost of preference shares",
                "Tc = company tax rate", "D0 = dividend just paid; D1 = next; g = growth", "y = yield per coupon period" },
    acronyms = { "WACC = weighted average cost of capital", "YTM = yield to maturity", "CAPM = capital asset pricing model",
                 "SML = security market line", "DDM = dividend discount (growth) model", "DCF = discounted cash flow",
                 "IRR = internal rate of return", "APR = annual percentage rate" },
    notes = [[COST OF CAPITAL AND WACC

HOW TO USE
Pick what they ask for from the list
(7, 1, then the number):
1 WACC: costs and values (or the
  weights, or D/E) are known
2 cost of equity: CAPM, or dividend
  growth (DCF), or past dividends
3 cost of debt from one bond
4 cost of preference shares
5 weights: book AND market values
6 cost of debt from two bond issues
7 projects: the SML vs the WACC
8 a project's NPV at the WACC

FORMULAS
$$r_E = r_f + beta*(E[R_M] - r_f)
$$r_E = (D_1)/(P_0) + g
$$r_P = (DIV_p)/(P_p)
$$r_WACC = r_E*(E/V) + r_P*(P/V) + r_D*(1 - T_c)*(D/V)
Use MARKET values. Only debt gets the
tax adjustment.
semi-annual bond (lectures):
$$r_D = (1 + y)^2 - 1
two issues: weight each yield by its
market value.
a project (growing forever):
$$NPV = (FCF_1)/(r - g) - cost - issue costs]],
    assume = STEPS_COMMON .. [[
THIS TYPE:
1. market values: E, P, D and V
2. each cost: rE, rP, rD
3. rD after tax = rD(1 - Tc)
4. weight and add

IF THE QUESTION SAYS...
- "coupon rate 10%, YTM 4.25%" -> rD is
  the YTM (4.25%)
- "semi-annual", "sells for 95% of
  face" -> 3 cost of debt: years LEFT,
  price % 95, coupons a year 2
- "just paid a dividend" -> D1 = D0(1 + g)
- "target capital structure 65%
  equity, 35% debt" -> 1 WACC: E 65,
  D 35
- "debt-equity ratio 0.6" -> 1 WACC:
  D/E 0.6
- "after-tax cost of debt 4.5%" -> rD
  4.5 and leave Tc BLANK
- "book value per share" -> 5 weights
- "project betas", "hurdle rate" ->
  7 projects vs the SML
- "adjustment factor +2%", "issue
  costs" -> 8 project NPV

TRAPS
- book values instead of market values
- taxing the preference dividend
- using the coupon rate as rD
- years since issue instead of years
  LEFT
- one WACC for projects of different
  risk]],
    worked = [[## After-tax cost of debt
Q: coupon 10%, YTM 4.25%, tax 30%.
PICK: 3 cost of debt
ENTER: rD 4.25 | Tc 30
4.25% x 0.7 = 2.98%

## Cost of debt from a bond
Q: 20-year 7% semi-annual bond issued
5 years ago; price 95% of face; tax
30%.
PICK: 3 cost of debt
ENTER: coupon 7 | years 15 | price %
95 | coupons a year 2 | Tc 30
y = 3.78% a half-year
rD = 1.0378^2 - 1 = 7.71% (APR 7.56%)
after tax: 7.71% x 0.7 = 5.39%

## Cost of equity from past dividends
Q: dividends 1.00, 1.05, 1.12, 1.17,
1.25; price $30.
PICK: 2 cost of equity
ENTER: past dividends 1 to 5 | P0 30
g = average % change = 5.74%
rE = 1.25 x 1.0574/30 + 5.74% = 10.15%

## Cost of preference shares
Q: par $20, pays 10% of par, price
$22.86.
PICK: 4 preference shares
ENTER: divpct 10 | par 20 | pp 22.86
2/22.86 = 8.75%

## WACC
Q: E $612.5m (14.25%), P $58.5m
(6.75%), D $128.7m (4.5%), tax 30%.
PICK: 1 WACC
ENTER: E 612.5m | Pv 58.5m | D 128.7m |
re 14.25 | rp 6.75 | rd 4.5 | Tc 30
WACC = 11.91%

## WACC from a D/E ratio
Q: D/E 0.6, rE 12%, after-tax rD 4.5%.
PICK: 1 WACC
ENTER: D/E 0.6 | re 12 | rd 4.5
(Tc blank: rD is already after tax)
WACC = 12% x 0.625 + 4.5% x 0.375
     = 9.19%

## Book vs market weights
Q: 5m shares at $12, book value $3 a
share; bonds $40m at 98% and $20m at
105% of face.
PICK: 5 weights
ENTER: shares 5m | price 12 | bvps 3 |
F1 40m | q1 98 | F2 20m | q2 105
book: E 20%, D 80%
market: E 49.92%, D 50.08%

## Two bond issues
Q: $40m, 6%, 8 years, 98%; $20m, 8%,
5 years, 105%; semi-annual; tax 30%.
PICK: 6 two bond issues
rD = 6.60% (APR 6.49%)
after tax 4.62%

## Projects vs the SML
Q: rf 4%, E[RM] 11%, WACC 11%.
Betas/returns: 0.5/9%, 1.3/12%.
PICK: 7 projects
0.5: needs 7.5% -> accept (the WACC
would wrongly REJECT it)
1.3: needs 13.1% -> reject (the WACC
would wrongly ACCEPT it)

## Project NPV at the WACC
Q: WACC 9%, risk +2%, FCF1 $2m growing
3%, cost $20m, issue costs $1m.
PICK: 8 project NPV
PV = 2m/(0.11 - 0.03) = 25m
NPV = 25m - 20m - 1m = 4m: accept]],
  })

  ------------------------------------------------------------------
  -- 21 Modigliani-Miller
  ------------------------------------------------------------------
  local MODES21 = { "cost of equity rE (and WACC)", "unlevered cost rU", "tax shield and levered value", "recapitalise to a new D/E",
                    "value from cash flows (EBIT or FCF)", "levered equity: returns by state", "levered vs unlevered: better buy?",
                    "agency: risky strategies + debt", "debt overhang: fund the project?" }
  -- the debt from the interest paid: D = interest/rD (permanent debt)
  local function debtOf(V, out)
    if not V.D and V.int and V.rd then
      V.D = V.int / V.rd
      out:row("D (from the interest)", V.D, "$", "interest/rD = " .. P(V.int) .. "/" .. P(V.rd), "D")
      out:off("dfromint")
    end
  end
  -- v23: value the firm from its cash flow forever: VU = FCF/rU, VL = VU + Tc x D (- PV of distress costs), E = VL - D
  local function solveValue(V, out, Tc)
    local tax = Tc > 0
    debtOf(V, out)
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
    if not V.D then
      if V.DE and V.rd and rU then
        -- only the D/E ratio is known: the costs still follow (weights from D/E)
        local DE = V.DE
        local re = rU + DE * (rU - V.rd) * (1 - Tc)
        out:head("COST OF EQUITY AND WACC (levered, from D/E)")
        out:row("rE", re, "%", "rU + D/E*(rU - rD)" .. (tax and "*(1 - Tc)" or "") .. " = " .. pct(rU) .. "% + " .. P(DE) .. " x " ..
                pct(rU - V.rd) .. "%" .. (tax and (" x " .. P(1 - Tc)) or ""), "re")
        local wE, wD = 1 / (1 + DE), DE / (1 + DE)
        local w = re * wE + V.rd * (1 - Tc) * wD
        out:row("WACC", w, "%", "rE*E/(E + D) + rD*D/(E + D)" .. (tax and "*(1 - Tc)" or "") .. ", E/V = " .. P(wE) .. ", D/V = " .. P(wD), "wacc")
        if tax then out:uses("ret2", "wacct") else out:uses("re", "ru") end
        out:note("give D in $ as well to value the levered firm and its shares")
        return
      end
      out:need("D: the permanent debt, to value the levered firm"); return
    end
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
        if mode == MODES21[2] and not (V.re and V.rd and V.E and V.D) and (V.EBIT or V.FCF) and V.VU then
          -- rU from the cash flow and the all-equity value: rU = FCF/VU, FCF = EBIT*(1 - Tc)
          solveValue(V, out, Tc)
          return
        end
        if not (V.re and V.rd and V.E and V.D) then
          out:need("rE, rD and the market values E and D" .. ((mode == MODES21[2]) and " - or EBIT (or FCF), Tc and VU" or ""))
          return
        end
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
      debtOf(V, out)
      local D = V.D
      local int = V.int or ((D and V.rd) and D * V.rd)
      if not (D or int) then out:need("the debt D (or the interest a year and rD)"); return end
      if not tax then out:need("the company tax rate Tc (without tax there is no tax shield)"); return end
      out:head("INTEREST TAX SHIELD")
      if int then out:row("tax shield each year", Tc * int, "$", "Tc x interest = " .. P(Tc) .. " x " .. P(int), "its"); out:uses("its") end
      local pvts
      if V.yrsD then
        -- debt for n years only: the shields are an annuity, discounted at rD (as risky as the debt)
        if not (int and V.rd) then out:need("the interest (or D) and rD, for debt that lasts " .. P(V.yrsD) .. " years"); return end
        pvts = Tc * int * annFac(V.rd, V.yrsD)
        out:row("PV of the tax shield", pvts, "$", "Tc x interest x (1 - 1/(1 + rD)^n)/rD: " .. P(V.yrsD) .. " years at " .. pct(V.rd) .. "%", "pvts")
        out:uses("pva"); out:off("itsann")
      else
        if not D then out:need("D, or rD to turn the interest into D"); return end
        pvts = Tc * D
        out:row("PV of the tax shield", pvts, "$", "Tc x D (permanent debt) = " .. P(Tc) .. " x " .. P(D), "pvts")
        out:uses("pvits")
      end
      if V.VU and D then
        local VL = V.VU + pvts
        out:head("THE LEVERED FIRM")
        out:row("VL levered value", VL, "$", "VU + PV(tax shield) = " .. P(V.VU) .. " + " .. P(pvts), "VL")
        out:row("E after the buyback", VL - D, "$", "VL - D", "E2")
        out:uses("vl"); out:off("eqvl")
        if V.shares then
          -- the price jumps when the debt is announced; the buyback happens at that price
          local pr = VL / V.shares
          out:row("share price (after the news)", pr, "$", "VL/shares = " .. P(VL) .. "/" .. P(V.shares), "price")
          out:row("shares bought back", D / pr, "", "D/price", "nbuy")
          out:row("shares left", V.shares - D / pr, "", "shares - bought back", "nleft")
          out:off("pricerecap")
        end
        if V.rU and V.rd and not V.yrsD then
          local E2 = VL - D
          local re2 = reOf(V.rU, V.rd, D / E2)
          out:row("rE after", re2, "%", "rU + D/E (rU - rD)(1 - Tc) = " .. pct(V.rU) .. "% + " .. P(D / E2) .. " x " .. pct(V.rU - V.rd) .. "% x " .. P(1 - Tc), "re2")
          out:row("WACC after", re2 * E2 / VL + V.rd * (1 - Tc) * D / VL, "%", "rE x E/V + rD x (1 - Tc) x D/V", "wacc2")
          out:uses("ret2", "wacct")
        end
      end
      return
    end
    if mode == MODES21[6] then
      -- MM I: the firm's value does not change; equity gets what is left after the lenders are paid
      local cfs, ps, given, nmiss = {}, {}, 0, 0
      for k = 1, 3 do
        if V["cf" .. k] then
          cfs[#cfs + 1] = V["cf" .. k]
          ps[#ps + 1] = V["pr" .. k] or false
          if V["pr" .. k] then given = given + V["pr" .. k] else nmiss = nmiss + 1 end
        end
      end
      if #cfs == 0 then out:need("the firm's cash flow next year in each state (and the chances, blank = equal)"); return end
      for k = 1, #ps do if not ps[k] then ps[k] = (1 - given) / nmiss end end
      local ECF = 0
      for k = 1, #cfs do ECF = ECF + ps[k] * cfs[k] end
      out:head("THE FIRM (NO DEBT)")
      out:row("expected cash flow", ECF, "$", "sum of chance x cash flow", "ECF")
      local Vf = V.Vf or (V.rU and ECF / (1 + V.rU))
      if not Vf then out:need("the firm's value today, or rU to find it"); return end
      if not V.Vf then out:row("firm value today", Vf, "$", "E[CF]/(1 + rU) = " .. P(ECF) .. "/" .. P(1 + V.rU), "V") end
      local rU = ECF / Vf - 1
      out:row("rU: expected return, no debt", rU, "%", "E[CF]/V - 1", "rU")
      for k = 1, #cfs do out:row("state " .. k .. ": return, no debt", cfs[k] / Vf - 1, "%", P(cfs[k]) .. "/" .. P(Vf) .. " - 1", "ru" .. k) end
      if not V.D then out:need("D (the amount borrowed) and rD, for the levered equity"); return end
      local rd = V.rd or 0
      local E, owe = Vf - V.D, V.D * (1 + rd)
      out:head("WITH DEBT (MM I: still worth " .. P(Vf) .. ")")
      out:row("equity today E", E, "$", "V - D = " .. P(Vf) .. " - " .. P(V.D), "E")
      out:row("owed to lenders next year", owe, "$", "D x (1 + rD) = " .. P(V.D) .. " x " .. P(1 + rd), "owe")
      local EE = 0
      for k = 1, #cfs do
        local eq = math.max(cfs[k] - owe, 0)
        if cfs[k] < owe then out:note("state " .. k .. ": the firm cannot repay in full - equity gets 0") end
        out:row("state " .. k .. ": cash to equity", eq, "$", P(cfs[k]) .. " - " .. P(owe), "eq" .. k)
        out:row("state " .. k .. ": equity return", eq / E - 1, "%", P(eq) .. "/" .. P(E) .. " - 1", "re" .. k)
        EE = EE + ps[k] * eq
      end
      out:row("rE: expected equity return", EE / E - 1, "%", "E[cash to equity]/E - 1 = " .. P(EE) .. "/" .. P(E) .. " - 1", "re")
      out:row("check: MM II", rU + V.D / E * (rU - rd), "%", "rU + D/E x (rU - rD) = " .. pct(rU) .. "% + " .. P(V.D / E) .. " x " .. pct(rU - rd) .. "%", "reMM")
      out:uses("mm1", "re"); out:off("eqstate")
      out:note("debt makes the equity riskier: its returns swing more in the bad and good states")
      return
    end
    if mode == MODES21[7] then
      -- two firms with the same EBIT forever: MM I says VL = VU (+ Tc x D with tax)
      debtOf(V, out)
      if not (V.D and V.nL and V.pL and V.nU and V.pU) then
        out:need("the levered firm's debt D (or interest and rD), shares and price, and the unlevered firm's shares and price"); return
      end
      local VU, EL = V.nU * V.pU, V.nL * V.pL
      out:head("MARKET VALUES NOW")
      out:row("VU: unlevered firm", VU, "$", "shares x price = " .. P(V.nU) .. " x " .. P(V.pU), "VU")
      out:row("E: levered firm's shares", EL, "$", P(V.nL) .. " x " .. P(V.pL), "EL")
      out:row("VL = E + D", EL + V.D, "$", P(EL) .. " + " .. P(V.D), "VL")
      out:head("WHAT MM SAYS")
      local VLf = VU + Tc * V.D
      out:row("VL should be", VLf, "$", tax and ("VU + Tc x D = " .. P(VU) .. " + " .. P(Tc * V.D)) or "VU (no tax: MM I)", "VLf")
      local Ef = VLf - V.D
      out:row("fair price, levered share", Ef / V.nL, "$", "(VL - D)/shares = " .. P(Ef) .. "/" .. P(V.nL), "pfair")
      out:uses(tax and "vl" or "mm1")
      if V.pL < Ef / V.nL - 1e-9 then out:add("ok", "levered shares are CHEAP: the levered firm's shares are the better buy")
      elseif V.pL > Ef / V.nL + 1e-9 then out:add("ok", "levered shares are DEAR: the unlevered firm's shares are the better buy")
      else out:add("ok", "both are fairly priced: no better buy") end
      if V.EBIT and V.rd then
        local rU = V.EBIT * (1 - Tc) / VU
        out:head("CHECK WITH RETURNS")
        out:row("rU", rU, "%", "EBIT(1 - Tc)/VU", "rU")
        out:row("levered equity: return it pays", (V.EBIT - V.rd * V.D) * (1 - Tc) / EL, "%", "(EBIT - interest)(1 - Tc)/E", "reAct")
        out:row("levered equity: return MM needs", reOf(rU, V.rd, V.D / EL), "%", "rU + D/E (rU - rD)" .. (tax and "(1 - Tc)" or ""), "reMM")
        out:uses(tax and "ret2" or "re")
      end
      out:off("mmarb")
      return
    end
    if mode == MODES21[8] then
      -- each strategy's expected payoff to the firm, to equity (what is left above the debt) and to debt
      local Dd = V.Dd or 0
      local best, bestE, rows = nil, nil, {}
      for _, nm in ipairs({ "A", "B", "C" }) do
        local x1, p1, x2 = V["s" .. nm .. "1"], V["s" .. nm .. "p"], V["s" .. nm .. "2"]
        if x1 then
          p1 = p1 or (x2 and 0.5 or 1)
          local p2 = x2 and (1 - p1) or 0
          local f = p1 * x1 + p2 * (x2 or 0)
          local e = p1 * math.max(x1 - Dd, 0) + p2 * math.max((x2 or 0) - Dd, 0)
          out:head("STRATEGY " .. nm)
          out:row(nm .. ": expected payoff (firm)", f, "$", P(p1) .. " x " .. P(x1) .. (x2 and (" + " .. P(p2) .. " x " .. P(x2)) or ""), "f" .. nm)
          out:row(nm .. ": to equity", e, "$", "the part above the debt of " .. P(Dd), "e" .. nm)
          out:row(nm .. ": to debt", f - e, "$", "firm - equity", "d" .. nm)
          rows[#rows + 1] = { nm, f, e }
          if not best or f > best[2] then best = rows[#rows] end
          if not bestE or e > bestE[3] then bestE = rows[#rows] end
        end
      end
      if #rows == 0 then out:need("each strategy's payoffs and chances (and the debt due)"); return end
      out:head("WHO PICKS WHAT")
      out:add("ok", "best for the firm: " .. best[1] .. " (" .. P(best[2]) .. ")")
      out:add("ok", "equity holders pick: " .. bestE[1] .. " (" .. P(bestE[3]) .. " to them)")
      out:row("agency cost", best[2] - bestE[2], "$", "firm's best " .. P(best[2]) .. " - firm value of equity's pick " .. P(bestE[2]), "agency")
      if bestE[1] ~= best[1] then out:note("excessive risk-taking: equity gains from the risk because the lenders carry the losses") end
      out:off("agency")
      return
    end
    if mode == MODES21[9] then
      -- debt overhang: much of the project's gain goes to the lenders, so equity may refuse a positive-NPV project
      if not (V.X0 and V.X1 and V.inv and V.Fd) then out:need("the assets next year without and with the project, its cost today and the debt due"); return end
      local d = 1 + (V.rr or 0)
      local E0, D0 = math.max(V.X0 - V.Fd, 0) / d, math.min(V.X0, V.Fd) / d
      local E1, D1 = math.max(V.X1 - V.Fd, 0) / d, math.min(V.X1, V.Fd) / d
      local npv = (V.X1 - V.X0) / d - V.inv
      out:head("WITHOUT THE PROJECT")
      out:row("equity today", E0, "$", "max(" .. P(V.X0) .. " - " .. P(V.Fd) .. ", 0)/" .. P(d), "E0")
      out:row("debt today", D0, "$", "min(" .. P(V.X0) .. ", " .. P(V.Fd) .. ")/" .. P(d), "D0")
      out:head("THE PROJECT")
      out:row("NPV", npv, "$", "(" .. P(V.X1) .. " - " .. P(V.X0) .. ")/" .. P(d) .. " - " .. P(V.inv), "npv")
      out:head("WITH THE PROJECT (equity pays the cost)")
      out:row("equity today", E1, "$", "max(" .. P(V.X1) .. " - " .. P(V.Fd) .. ", 0)/" .. P(d), "E1")
      out:row("debt today", D1, "$", "min(" .. P(V.X1) .. ", " .. P(V.Fd) .. ")/" .. P(d), "D1")
      local gain = E1 - E0 - V.inv
      out:row("gain to equity holders", gain, "$", "E with - E without - cost = " .. P(E1) .. " - " .. P(E0) .. " - " .. P(V.inv), "gainE")
      out:row("gain to lenders", D1 - D0, "$", P(D1) .. " - " .. P(D0), "gainD")
      if npv > 0 and gain < 0 then out:add("bad", "DEBT OVERHANG: equity holders will NOT fund a positive-NPV project (under-investment)")
      elseif npv > 0 then out:add("ok", "equity holders gain: they will fund it")
      else out:add("bad", "negative NPV: reject it anyway") end
      out:off("overhang")
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
    desc = "Modigliani-Miller: cost of equity with leverage, unlevered cost, tax shield (forever or n years), levered value, recapitalisation, value and share price from cash flows, levered returns by state, which firm is the better buy, agency costs, debt overhang",
    looks = "Modigliani | MM | unlevered | levered | tax shield | permanent debt | buy back shares | debt-to-equity | share price after borrowing | value of the firm | EBIT forever | interest expense | unlevered free cash flow | financial distress | trade-off | identical except capital structure | better buy | homemade leverage | strategies payoff equity holders | agency cost | debt overhang | under-investment | develop the land | demand weak strong",
    slots = {
      S("mode", "what to find", "choice", MODES21, 1),
      S("rU", "rU unlevered cost (%)", "pct"),
      S("rd", "rD cost of debt (%)", "pct"),
      S("re", "rE cost of equity now (%)", "pct"),
      S("E", "E equity value ($)", "money"),
      S("D", "D debt value ($)", "money"),
      S("int", "or: interest a year ($)", "money"),
      S("DE", "or: D/E ratio", "num"),
      S("Tc", "Tc tax (%) (blank = no tax)", "pct"),
      S("VU", "VU all-equity value ($)", "money"),
      S("yrsD", "years of debt (blank = forever)", "num"),
      S("newDE", "new D/E after recap", "num"),
      S("EBIT", "EBIT each year ($)", "money"),
      S("FCF", "or: unlevered FCF a year ($)", "money"),
      S("shares", "number of shares", "num"),
      S("PVd", "PV of distress costs ($)", "money"),
      S("cf1", "state 1: firm cash flow ($)", "money"), S("pr1", "state 1: chance (%)", "pct"),
      S("cf2", "state 2: firm cash flow ($)", "money"), S("pr2", "state 2: chance (%)", "pct"),
      S("cf3", "state 3: firm cash flow ($)", "money"), S("pr3", "state 3: chance (%)", "pct"),
      S("Vf", "firm value today ($)", "money"),
      S("nL", "levered firm: shares", "num"), S("pL", "levered firm: share price ($)", "money"),
      S("nU", "unlevered firm: shares", "num"), S("pU", "unlevered firm: share price ($)", "money"),
      S("Dd", "debt due at the payoff ($)", "money"),
      S("sA1", "A: payoff 1 ($)", "money"), S("sAp", "A: chance of payoff 1 (%)", "pct"), S("sA2", "A: payoff 2 ($)", "money"),
      S("sB1", "B: payoff 1 ($)", "money"), S("sBp", "B: chance of payoff 1 (%)", "pct"), S("sB2", "B: payoff 2 ($)", "money"),
      S("sC1", "C: payoff 1 ($)", "money"), S("sCp", "C: chance of payoff 1 (%)", "pct"), S("sC2", "C: payoff 2 ($)", "money"),
      S("X0", "assets next year, no project ($)", "money"),
      S("X1", "assets next year, with it ($)", "money"),
      S("inv", "project cost today ($)", "money"),
      S("Fd", "debt due next year ($)", "money"),
      S("rr", "risk-free rate (%)", "pct"),
    },
    vis = function(Sm)
      local m = Sm.mode.opts[Sm.mode.idx]
      if m == MODES21[1] then return { "mode", "rU", "rd", "E", "D", "DE", "Tc" } end
      if m == MODES21[2] then return { "mode", "re", "rd", "E", "D", "EBIT", "FCF", "Tc", "VU" } end
      if m == MODES21[3] then return { "mode", "D", "int", "rd", "Tc", "yrsD", "VU", "rU", "shares" } end
      if m == MODES21[5] then return { "mode", "EBIT", "FCF", "Tc", "rU", "VU", "D", "int", "DE", "rd", "shares", "PVd" } end
      if m == MODES21[6] then return { "mode", "cf1", "pr1", "cf2", "pr2", "cf3", "pr3", "Vf", "rU", "D", "rd" } end
      if m == MODES21[7] then return { "mode", "EBIT", "Tc", "D", "int", "rd", "nL", "pL", "nU", "pU" } end
      if m == MODES21[8] then return { "mode", "Dd", "sA1", "sAp", "sA2", "sB1", "sBp", "sB2", "sC1", "sCp", "sC2" } end
      if m == MODES21[9] then return { "mode", "X0", "X1", "inv", "Fd", "rr" } end
      return { "mode", "re", "rd", "E", "D", "rU", "newDE", "Tc" }
    end,
    hints = {
      mode = "left/right changes the kind; ESC: back to the list",
      rU = "the cost of capital if the firm had NO debt",
      rd = "the interest rate on the debt",
      re = "today's cost of equity (to unlever)",
      DE = "debt-to-equity ratio, e.g. 0.75",
      int = "'interest expense $240,000 a year': D = interest/rD",
      Tc = "'there are no taxes' -> leave blank",
      VU = "value of the firm with no debt",
      yrsD = "'8-year bonds' -> 8: the shields are an annuity",
      newDE = "'until its debt-to-equity ratio is 1.5'",
      EBIT = "EBIT each year, forever; distress cuts it? type the LOWER one",
      FCF = "or the after-tax cash flow of the all-equity firm (the lower one if distress cuts it)",
      shares = "number of shares (before any buyback)",
      PVd = "PV of financial distress costs (trade-off; not on the sheet)",
      cf1 = "the firm's cash flow next year if this state happens",
      pr1 = "chance of this state; blank = all equally likely",
      Vf = "the firm's value today (or give rU instead)",
      nL = "the levered firm's shares (then its price)",
      nU = "the unlevered firm's shares (then its price)",
      Dd = "debt to repay when the payoff arrives",
      sA1 = "payoff of strategy A (if it is certain: one payoff)",
      sAp = "chance of payoff 1; payoff 2 gets the rest",
      X0 = "what the assets are worth next year if you do nothing",
      X1 = "what they are worth next year with the project",
      inv = "the project's cost, paid by the shareholders today",
      Fd = "the face value of the debt due next year",
      rr = "the risk-free rate (all cash flows risk-free)",
    },
    formula = { "r_E = r_U + D/E*(r_U - r_D)*(1 - T_c)", "V_L = V_U + T_c*D   r_U = r_E*E/V + r_D*D/V" },
    words = "debt makes equity riskier, so rE rises with D/E; with tax, debt adds value through the interest tax shield",
    letters = { "rU = unlevered cost of capital (no debt)", "rE = cost of equity; rD = cost of debt", "D/E = debt-to-equity ratio",
                "Tc = company tax rate (0 = no tax)", "VU = all-equity value; VL = levered value", "Tc x D = PV of the tax shield (permanent debt)" },
    acronyms = { "MM = Modigliani and Miller", "WACC = weighted average cost of capital", "D/E = debt-to-equity",
                 "EBIT = earnings before interest and tax; FCF = free cash flow", "PVd = PV of financial distress costs" },
    notes = [[CAPITAL STRUCTURE (MM)

HOW TO USE
Pick what they ask for from the list
(7, 2, then the number):
1 rE (and WACC) at a D/E
2 rU: from rE, rD, E, D (or EBIT, VU)
3 tax shield, VL, rE and WACC after
  borrowing (debt forever or n years)
4 recapitalise to a new D/E
5 value from cash flows (EBIT forever)
6 levered equity: returns by state
7 levered vs unlevered: better buy?
8 agency: risky strategies + debt
9 debt overhang: fund the project?
No tax: leave Tc blank.

FORMULAS
$$r_U = r_E*(E)/(E + D) + r_D*(D)/(E + D)
$$r_E = r_U + D/E*(r_U - r_D)   (no tax)
$$r_E = r_U + D/E*(r_U - r_D)*(1 - T_c)
$$V_L = V_U + T_c*D   E = V_L - D
No tax: the WACC = rU at any leverage.
interest tax shield = Tc x interest;
debt for n years: PV = an annuity of
the shields at rD.
from cash flows (not on the sheet):
VU = FCF/rU with FCF = EBIT*(1 - Tc)
share price = (VL - D)/shares
trade-off (textbook, not on the sheet):
VL = VU + Tc*D - PV(distress costs)
equity next year = max(assets - debt,
0); agency cost = firm value lost.]],
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
  equity after a buyback is VL - D
- 'risk-free debt' still makes the
  equity riskier (rE still rises)
- debt for 8 years: the shield is an
  annuity, not Tc x D

IF THE QUESTION SAYS...
- "EBIT of $X a year forever" -> 5 value
  from cash flows: VU = EBIT(1 - Tc)/rU
- "interest expense $X" -> type it in
  'interest a year' (D = interest/rD)
- "price per share" -> (VL - D)/shares
- "costs of financial distress" (textbook)
  -> take their PV off VL
- "weak / expected / strong demand" ->
  6 levered returns by state
- "identical except capital structure,
  better buy?" -> 7
- "strategies, payoffs, debt due" -> 8
- "develop the land", "would equity
  holders fund it?" -> 9]],
    worked = [[## Unlevered cost (no tax)
Q: E $520m (9.5%), D $390m (6%).
PICK: 2 unlevered cost rU
ENTER: re 9.5 | rd 6 | E 520m | D 390m
rU = 8.00%

## Cost of equity with tax
Q: rU 8%, rD 6%, D $315m, E $420m, 30%.
PICK: 1 rE
ENTER: rU 8 | rd 6 | D 315m | E 420m |
Tc 30
rE = 8% + 0.75 x 2% x 0.7 = 9.05%
WACC = 6.97%

## Buyback with tax
Q: VU $1m, rU 12%, borrows $400,000 at
8% (forever) to buy back shares; tax
30%; 50,000 shares.
PICK: 3 tax shield
ENTER: D 400000 | rd 8 | Tc 30 |
VU 1m | rU 12 | shares 50000
VL = 1m + 0.3 x 400,000 = $1.12m
price = 1.12m/50,000 = $22.40
rE = 13.56%; WACC after = 10.71%

## Tax shield on 8-year debt
Q: $500m at 7% for 8 years; tax 30%.
PICK: 3 tax shield
ENTER: D 500m | rd 7 | Tc 30 | years 8
shield = 0.3 x 35m = 10.5m a year
PV = 10.5m x (1 - 1.07^-8)/0.07
   = $62.70m

## Share price after borrowing
Q: EBIT $1,000 a year forever, tax 30%,
rU 10%. Borrows $2,000 (permanent) and
has 400 shares. Price per share?
PICK: 5 value from cash flows
ENTER: EBIT 1000 | Tc 30 | rU 10 |
D 2000 | shares 400
VU = 1000 x 0.7/0.10 = $7,000
VL = 7,000 + 0.3 x 2,000 = $7,600
E = 7,600 - 2,000 = $5,600
price = 5,600/400 = $14.00

## Levered returns by state
Q: cash flow next year 90, 110 or 130
(equally likely); rU 10%; borrow 60
at 5%. No tax.
PICK: 6 levered equity
V = 110/1.10 = 100; E = 40
owe 63: equity gets 27, 47 or 67
returns -32.5%, 17.5%, 67.5%
rE = 17.5% = 10% + 1.5 x 5%

## Better buy?
Q: EBIT $50m forever, no tax. L: debt
$200m at 6%, 3m shares at $95. U: 10m
shares at $50.
PICK: 7 better buy
VU = 500m; VL = 285m + 200m = 485m
MM: VL should be 500m -> fair price
(500m - 200m)/3m = $100 > $95
L's shares are the better buy

## Agency costs
Q: debt due 50. A: 90 for sure. B: 50%
150, 50% 20. C: 20% 320, 80% 25.
PICK: 8 agency
firm: A 90, B 85, C 84 -> A is best
equity: A 40, B 50, C 54 -> picks C
agency cost = 90 - 84 = 6

## Debt overhang
Q: assets next year 40 (90 with a
project costing 35 today); debt due
60; rf 5%.
PICK: 9 debt overhang
NPV = 50/1.05 - 35 = 12.62 > 0
equity: 0 now, 28.57 with it
gain = 28.57 - 0 - 35 = -6.43:
equity will NOT fund it]],
  })
end
