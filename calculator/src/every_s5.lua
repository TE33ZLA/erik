----------------------------------------------------------------------
-- EVERYTHING page, section 5 (Risk and Return): lines NOT on the formula sheet.
-- See every_core.lua for the shape of a pack. Own numbers. ASCII only.
--   capital gains and dividend yield, the holding-period return and
--   its yearly (geometric) average, share j from past data and from
--   states, beta from past data (j = the market) or from Var(M),
--   weights from money or shares, a risky share + the risk-free asset.
----------------------------------------------------------------------
do
  local X = EVERY_SLOT
  -- the past returns of i (5:Yi1..6) and of j (5:Yj1..6), the states of j (5:Sj1..4 with 5:p1..4)
  local function yrs(list, a, t, more)
    for k = 1, 6 do
      local m = { list = true }
      for kk, vv in pairs(more or {}) do m[kk] = vv end
      list[#list + 1] = X(a .. k, t .. k, "year " .. k .. ": return (%)", "pct", "a past return (blank = not used)", m)
    end
    return list
  end
  local function act(x, a, n) local t = {}; for k = 1, n do if x[a .. k] ~= nil then t[#t + 1] = k end end; return t end
  local function meanOf(x, a) local s, t = 0, act(x, a, 6); for _, k in ipairs(t) do s = s + x[a .. k] end; return s / #t end
  local function anyTyped(K, pre, n) for k = 1, n do if K[pre .. k] ~= nil then return true end end; return false end
  local function sdRow(t) return function(x, out) local sd = math.sqrt(math.max(x.Vj, 0))
    out:row("SD = sqrt(" .. t .. ")", sd, "%", "the square root of the variance = sqrt(" .. P(x.Vj) .. ") = " .. P(sd) .. " = " .. pct(sd) .. "%", "sd") end end
  local xP0 = X("P0", nil, "P0 price paid ($)", "money", "the price at the start (what you paid)")
  local xP1 = X("P1", nil, "P1 price at the end ($)", "money", "the price now / when sold")
  local xHPR = X("HPR", nil, "HPR holding-period return (%)", "pct", "the return over ALL the years together", { rate = true })
  local xBeta = X("Beta", "Beta(i)", "Beta(i) beta of share i", "num", "the share's beta")
  local xERj = X("ERj", "E(Rj)", "E(Rj) expected return j (%)", "pct", "share j's expected return")
  local xVj = X("Vj", "Var(j)", "Var(j) variance of j", "num", "share j's variance (a decimal)")
  local xwi = X("wi", nil, "wi weight in i (%)", "pct", "% of the money in i")
  local xSDi = X("SDi", nil, "SDi SD of share i (%)", "pct", "share i's SD", { pos = true })
  local xMtot = X("Mtot", nil, "Mtot total money invested ($)", "money", "all the money: i + j + risk-free")
  local LINES = {
    { id = "s5_cgy", sec = 5, name = "Capital gains yield", short = "CGY", eq = "CGY = (P1 - P0)/P0",
      why = "the price-change part of the realised return R = (DIV + P1 - P0)/P0",
      vars = { X("CGY", nil, "CGY capital gains yield (%)", "pct", "the price rise over the price paid"), xP1, xP0 },
      f = function(x) return (x.P1 - x.P0) / x.P0 - x.CGY end,
      rearr = { P1 = "P1 = P0*(1 + CGY)", P0 = "P0 = P1/(1 + CGY)" },
      ex = { P1 = 41.5, P0 = 38 } },
    { id = "s5_dy", sec = 5, name = "Dividend yield", short = "DY", eq = "DY = DIV/P0",
      why = "the dividend part of the realised return R = (DIV + P1 - P0)/P0",
      vars = { X("DY", nil, "DY dividend yield (%)", "pct", "the dividend over the price paid"),
               X("DIV", nil, "DIV dividend received ($)", "money", "dividend received during the year (0 if none)"), xP0 },
      f = function(x) return x.DIV / x.P0 - x.DY end,
      rearr = { DIV = "DIV = DY*P0", P0 = "P0 = DIV/DY" },
      ex = { DIV = 1.9, P0 = 38 } },
    { id = "s5_hpr", sec = 5, name = "Holding-period return", short = "HPR", eq = "HPR = (1 + R1)*(1 + R2)*...*(1 + RT) - 1",
      why = "money grows by (1 + R) each year: multiply the years, take 1 off",
      vars = yrs({ xHPR }, "Yi", "R"),
      need = function(x) if #act(x, "Yi", 6) == 0 then return "the returns, one per year box" end end,
      eqf = function(x) local s = {}; for _, k in ipairs(act(x, "Yi", 6)) do s[#s + 1] = "(1 + R" .. k .. ")" end
        return "HPR = " .. table.concat(s, "*") .. " - 1" end,
      f = function(x) local g = 1; for _, k in ipairs(act(x, "Yi", 6)) do g = g * (1 + x["Yi" .. k]) end; return g - 1 - x.HPR end,
      ex = { Yi1 = 0.12, Yi2 = -0.04, Yi3 = 0.09 } },
    { id = "s5_geo", sec = 5, name = "Yearly (geometric) average return", short = "geometric average", eq = "rG = (1 + HPR)^(1/T) - 1",
      why = "the same return every year that grows to the HPR: (1 + rG)^T = 1 + HPR",
      vars = yrs({ X("rG", nil, "rG yearly (geometric) average (%)", "pct", "the same return each year that gives the HPR", { rate = true }),
                   xHPR,
                   X("T", nil, "T number of years", "num", "how many years (blank: the year boxes typed)", { pos = true,
                     alt = { ok = function(V) return V.T == nil and #act(V, "Yi", 6) > 0 end, fn = function(x) return #act(x, "Yi", 6) end,
                             text = "T = number of years with a return", from = "the year boxes" } }) },
                 "Yi", "R", { opt = true }),
      f = function(x) return (1 + x.HPR) ^ (1 / x.T) - 1 - x.rG end,
      rearr = { HPR = "HPR = (1 + rG)^T - 1", T = "T = ln(1 + HPR)/ln(1 + rG)" },
      ex = { HPR = 0.3, T = 4 } },
    { id = "s5_meanj", sec = 5, name = "Average return of j (past data)", short = "Rbar_j", eq = "Rbar_j = (Rj1 + Rj2 + ... + RjT)/T",
      why = "the sheet's Rbar line, on share j's returns",
      vars = yrs({ X("Rbarj", "Rbar_j", "Rbar_j average return j (%)", "pct", "the average of j's past returns") }, "Yj", "Rj"),
      need = function(x) if #act(x, "Yj", 6) == 0 then return "j's past returns, one per year box" end end,
      eqf = function(x) local t = act(x, "Yj", 6); local s = {}; for _, k in ipairs(t) do s[#s + 1] = "Rj" .. k end
        return "Rbar_j = (" .. table.concat(s, " + ") .. ")/" .. #t end,
      f = function(x) return meanOf(x, "Yj") - x.Rbarj end,
      ex = { Yj1 = 0.05, Yj2 = 0.11, Yj3 = -0.02, Yj4 = 0.08 } },
    { id = "s5_varj", sec = 5, name = "Variance of j (past data, a sample)", short = "Var(j)",
      eq = "Var(j) = ((Rj1 - Rbar_j)^2 + ... + (RjT - Rbar_j)^2)/(T - 1)",
      why = "the sheet's Var(R) line, on share j's returns (j = the market: Var(M))",
      vars = yrs({ xVj, X("Rbarj", "Rbar_j", "Rbar_j average return j (%)", "pct", "blank = worked out from j's returns",
                          { alt = { ok = function(V) return V.Rbarj == nil end, fn = function(x) return meanOf(x, "Yj") end,
                                    text = "Rbar_j = (Rj1 + ... + RjT)/T", from = "the Rbar_j line" } }) }, "Yj", "Rj"),
      need = function(x) if #act(x, "Yj", 6) < 2 then return "at least two of j's past returns" end end,
      eqf = function(x) local t = act(x, "Yj", 6); local s = {}; for _, k in ipairs(t) do s[#s + 1] = "(Rj" .. k .. " - Rbar_j)^2" end
        return "Var(j) = (" .. table.concat(s, " + ") .. ")/(" .. #t .. " - 1)" end,
      f = function(x) local t = act(x, "Yj", 6); local s = 0; for _, k in ipairs(t) do s = s + (x["Yj" .. k] - x.Rbarj) ^ 2 end; return s / (#t - 1) - x.Vj end,
      extra = sdRow("Var(j)"),
      ex = { Yj1 = 0.05, Yj2 = 0.11, Yj3 = -0.02, Yj4 = 0.08 } },
  }
  -- share j from the states (4 states, like the covariance line)
  local function states(list, first)
    list[1] = first
    for k = 1, 4 do
      list[#list + 1] = X("Sj" .. k, "Rj" .. k, "state " .. k .. ": return of j (%)", "pct", "share j's return in this state", { grp = k })
      list[#list + 1] = X("p" .. k, nil, "state " .. k .. ": probability (%)", "pct", "the chance of this state, e.g. 25", { grp = k })
    end
    return list
  end
  local function ERjOf(x) local s = 0; for k = 1, 4 do if x["Sj" .. k] or x["p" .. k] then s = s + (x["Sj" .. k] or 0) * (x["p" .. k] or 0) end end; return s end
  LINES[#LINES + 1] = { id = "s5_erj", sec = 5, name = "Expected return of j (states)", short = "E(Rj)", eq = "E(Rj) = Sum of Rjk*Pk",
    why = "the sheet's E(Ri) line, on share j's returns in each state",
    vars = states({}, xERj),
    need = function(x) if #act(x, "Sj", 4) == 0 then return "j's return in each state" end end,
    eqf = function(x) local t = {}; for k = 1, 4 do if x["Sj" .. k] or x["p" .. k] then t[#t + 1] = "Rj" .. k .. "*p" .. k end end
      return "E(Rj) = " .. table.concat(t, " + ") end,
    f = function(x) return ERjOf(x) - x.ERj end,
    ex = { Sj1 = -0.06, p1 = 0.3, Sj2 = 0.08, p2 = 0.5, Sj3 = 0.2, p3 = 0.2 } }
  LINES[#LINES + 1] = { id = "s5_varjs", sec = 5, name = "Variance of j (states)", short = "Var(j)", eq = "Var(j) = Sum of (Rjk - E(Rj))^2*Pk",
    why = "the sheet's Var(i) line, on share j's returns in each state",
    vars = states({}, xVj),
    f = function(x) local s = 0; for k = 1, 4 do if x["Sj" .. k] and x["p" .. k] then s = s + (x["Sj" .. k] - x.ERj) ^ 2 * x["p" .. k] end end; return s - x.Vj end,
    need = function(x) if #act(x, "Sj", 4) == 0 then return "j's return in each state" end end,
    eqf = function(x) local t = {}; for k = 1, 4 do if x["Sj" .. k] then t[#t + 1] = "(Rj" .. k .. " - E(Rj))^2*p" .. k end end
      return "Var(j) = " .. table.concat(t, " + ") end,
    extra = sdRow("Var(j)"),
    ex = { Sj1 = -0.06, p1 = 0.3, Sj2 = 0.08, p2 = 0.5, Sj3 = 0.2, p3 = 0.2 } }
  -- E(Rj) is worked out by the line itself when blank (as the sheet's Var(i) line does)
  table.insert(LINES[#LINES].vars, 2, X("ERj", "E(Rj)", "E(Rj) expected return j (%)", "pct", "blank = worked out from the states",
    { alt = { ok = function(V) return V.ERj == nil end, fn = ERjOf, text = "E(Rj) = Rj1*p1 + Rj2*p2 + ...", from = "the E(Rj) line" } }))
  local MORE = {
    { id = "s5_betay", sec = 5, name = "Beta from past data (j = the market)", short = "Beta(i)", eq = "Beta(i) = Cov(i,j)/Var(j)",
      why = "the sheet's beta line, Cov(Ri,RM)/SDM^2, with j = the market: SDM^2 = Var(j)",
      vars = { xBeta, X("Cov", "Cov(i,j)", "Cov(i,j) covariance", "num", "the covariance of i with the market"), xVj },
      f = function(x) return x.Cov / x.Vj - x.Beta end,
      rearr = { Cov = "Cov(i,j) = Beta(i)*Var(j)", Vj = "Var(j) = Cov(i,j)/Beta(i)" },
      ex = { Cov = 0.0018, Vj = 0.0015 } },
    { id = "s5_betavm", sec = 5, name = "Beta from Var(M)", short = "Beta(i)", eq = "Beta(i) = Cov(Ri,RM)/Var(M)",
      why = "the sheet's beta line with SDM^2 = Var(M), the market's variance (a matrix's diagonal)",
      vars = { xBeta, X("CovM", "Cov(Ri,RM)", "Cov(Ri,RM) with market", "num", "covariance with the market (decimal)"),
               X("VarM", "Var(M)", "Var(M) market's variance", "num", "the market's variance (a decimal, e.g. 0.0225)", { pos = true }) },
      f = function(x) return x.CovM / x.VarM - x.Beta end,
      rearr = { CovM = "Cov(Ri,RM) = Beta(i)*Var(M)", VarM = "Var(M) = Cov(Ri,RM)/Beta(i)" },
      ex = { CovM = 0.006, VarM = 0.012 } },
    { id = "s5_mi", sec = 5, name = "Money in share i", short = "Mi", eq = "Mi = Ni*Pi",
      why = "the money in a share: the number of shares times the price",
      vars = { X("Mi", nil, "Mi money in share i ($)", "money", "dollars held in i"),
               X("Ni", nil, "Ni number of shares of i", "num", "how many shares of i", { pos = true }),
               X("Pi", nil, "Pi price of one share of i ($)", "money", "the price of ONE share of i") },
      f = function(x) return x.Ni * x.Pi - x.Mi end,
      rearr = { Ni = "Ni = Mi/Pi", Pi = "Pi = Mi/Ni" }, ex = { Ni = 120, Pi = 35 } },
    { id = "s5_mj", sec = 5, name = "Money in share j", short = "Mj", eq = "Mj = Nj*Pj",
      why = "the money in a share: the number of shares times the price",
      vars = { X("Mj", nil, "Mj money in share j ($)", "money", "dollars held in j"),
               X("Nj", nil, "Nj number of shares of j", "num", "how many shares of j", { pos = true }),
               X("Pj", nil, "Pj price of one share of j ($)", "money", "the price of ONE share of j") },
      f = function(x) return x.Nj * x.Pj - x.Mj end,
      rearr = { Nj = "Nj = Mj/Pj", Pj = "Pj = Mj/Nj" }, ex = { Nj = 80, Pj = 52 } },
    { id = "s5_mtot", sec = 5, name = "Total money in the portfolio", short = "Mtot", eq = "Mtot = Mi + Mj + Mf",
      why = "the portfolio is all the money: share i, share j and the risk-free part",
      vars = { xMtot, X("Mi", nil, "Mi money in share i ($)", "money", "dollars held in i"),
               X("Mj", nil, "Mj money in share j ($)", "money", "dollars held in j"),
               X("Mf", nil, "Mf money risk-free ($)", "money", "dollars in the risk-free asset (blank = 0)", { weak = true }) },
      f = function(x) return x.Mi + x.Mj + x.Mf - x.Mtot end,
      rearr = { Mi = "Mi = Mtot - Mj - Mf", Mj = "Mj = Mtot - Mi - Mf", Mf = "Mf = Mtot - Mi - Mj" },
      ex = { Mi = 4200, Mj = 4160, Mf = 1640 } },
    { id = "s5_wi", sec = 5, name = "Weight of i from money", short = "wi", eq = "wi = Mi/Mtot",
      why = "a weight is the part of ALL the money in that asset",
      vars = { xwi, X("Mi", nil, "Mi money in share i ($)", "money", "dollars held in i"), xMtot },
      f = function(x) return x.Mi / x.Mtot - x.wi end,
      rearr = { Mi = "Mi = wi*Mtot", Mtot = "Mtot = Mi/wi" }, ex = { Mi = 4200, Mtot = 10000 } },
    { id = "s5_wj", sec = 5, name = "Weight of j from money", short = "wj", eq = "wj = Mj/Mtot",
      why = "a weight is the part of ALL the money in that asset",
      vars = { X("wj", nil, "wj weight in j (%)", "pct", "% of the TOTAL money in j"),
               X("Mj", nil, "Mj money in share j ($)", "money", "dollars held in j"), xMtot },
      f = function(x) return x.Mj / x.Mtot - x.wj end,
      rearr = { Mj = "Mj = wj*Mtot", Mtot = "Mtot = Mj/wj" }, ex = { Mj = 4160, Mtot = 10000 } },
    { id = "s5_sdrf", sec = 5, name = "SD of a share + the risk-free asset", short = "SDp", eq = "SDp = wi*SDi",
      why = "the sheet's Var(p) line with SDj = 0 (risk-free): Var(p) = wi^2*SDi^2, so SDp = wi*SDi",
      vars = { X("SDp", nil, "SDp portfolio SD (%)", "pct", "the portfolio's SD", { pos = true }), xwi, xSDi },
      f = function(x) return x.wi * x.SDi - x.SDp end,
      rearr = { wi = "wi = SDp/SDi", SDi = "SDi = SDp/wi" }, ex = { wi = 0.55, SDi = 0.3 } },
  }
  for _, d in ipairs(MORE) do LINES[#LINES + 1] = d end
  local lbl, hint = {}, {}
  for k = 1, 6 do
    lbl["5:Yj" .. k] = "year " .. k .. ": return of j or the MARKET (%)"
    hint["5:Yj" .. k] = "share j's (or the market's) return that year"
  end
  hint["5:wj"] = "% of the money in j; with a risk-free part: % of the TOTAL money"
  hint["5:Vj"] = "j's variance: a matrix's diagonal number, or from j's returns"
  hint["5:Beta"] = "the share's beta: the beta lines work it out, CAPM uses it"
  EVERY_ADD{
    lines = LINES,
    bridges = { { "5:Rbar", "5:ERs", false, nil, nil, "5:p1" },        -- the past average is i's expected return (CV)
                { "5:Bp", "5:Beta" },                                  -- the portfolio's beta into CAPM
                { "5:VarM", "5:SDM", false, math.sqrt, "sqrt(Var(M))" } },
    weakok = { s5_mtot = { Mf = true } },
    skip = {
      s5_hpr = function(K) return anyTyped(K, "5:Yj", 6) end,          -- two series: a risk question, not a growth one
      s5_geo = function(K) return K["5:HPR"] == nil and K["5:rG"] == nil and anyTyped(K, "5:Yj", 6) end,
      s5_erj = function(K) return K["5:p5"] ~= nil end,               -- j's line takes 4 states
      s5_varjs = function(K) return K["5:p5"] ~= nil end,
      s5_betay = function(K) return not anyTyped(K, "5:Yj", 6) end,   -- past data only (a matrix: Var(M) below)
      s5_betavm = function(K) return K["5:SDM"] ~= nil end,           -- SDM typed: the sheet's line does it
      -- a risky share + the risk-free asset: nothing on j's risk or the correlation
      s5_sdrf = function(K, kn)
        if kn["5:Corr"] or kn["5:Cov"] or kn["5:Varp"] then return true end
        if (kn["5:SDj"] and kn["5:SDj"] ~= 0) or (kn["5:Vj"] and kn["5:Vj"] ~= 0) then return true end
        return anyTyped(K, "5:Yj", 6) or anyTyped(K, "5:Sj", 4)
      end,
    },
    second = {
      s5_betay = function(K)
        if K["5:ERM"] or K["5:rf"] or K["5:MRP"] then return nil end   -- a CAPM question: j is the market
        return "j is the MARKET (its returns in the j boxes)"
      end,
    },
    lbl = lbl, hint = hint,
    order = { [5] = { "5:CGY", "5:DY", "5:HPR", "5:T", "5:rG", "5:VarM", "5:Ni", "5:Pi", "5:Nj", "5:Pj",
                      "5:Mi", "5:Mj", "5:Mf", "5:Mtot" } },
  }
end
