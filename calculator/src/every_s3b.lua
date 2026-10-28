----------------------------------------------------------------------
-- EVERYTHING page, section 3 (Capital Budgeting): NPV lines NOT on the
-- formula sheet (streams, payback, crossover, expected values).
-- See every_core.lua for the shape of a pack. Own numbers. ASCII only.
--   * NPV = NCF0 (+ the listed NCFs) + an even stream C (growth g, n
--     years, first in year k), or + a PV found elsewhere (PVx), or +
--     growth forever after the last NCF (gT)
--   * payback, the crossover rate with project B, NPV / IRR of B
--   * units: C from P, v, Q (break-even Q), accounting break-even,
--     the % change in NPV
--   * expected value of up to 3 outcomes, its NPV at time t; the
--     chances of a two-year tree (HH, HL, LH, LL)
----------------------------------------------------------------------
do
  local X = EVERY_SLOT
  -- the cash-flow lists: NCF0..NCF10 (the sheet's) and B0..B10 (project B)
  local function cfList(list, L, word, first)
    for t = first or 0, 10 do
      local lab = (t == 0) and (L .. "0 " .. word .. " cash flow now ($)") or (L .. t .. " " .. word .. " cash flow year " .. t .. " ($)")
      list[#list + 1] = X(L .. t, nil, lab, "money", (t == 0) and "the cost today as a NEGATIVE" or ("the net cash flow at the end of year " .. t),
                          { list = true })
    end
    return list
  end
  local function lastOf(x, L) local nn = -1; for t = 0, 10 do if x[L .. t] then nn = t end end; return nn end
  local function pvList(x, L, rate, from)
    local s = 0
    for t = from or 0, 10 do if x[L .. t] then s = s + x[L .. t] / (1 + rate) ^ t end end
    return s
  end
  -- 'NCF0 + NCF1/(1 + r) + NCF2/(1 + r)^2' with only the typed ones (nil: none)
  local function terms(x, L, rate, from)
    local t2 = {}
    for t = from or 0, 10 do
      if x[L .. t] then t2[#t2 + 1] = (t == 0) and (L .. "0") or (L .. t .. "/(1 + " .. rate .. ")" .. ((t > 1) and ("^" .. t) or "")) end
    end
    if #t2 == 0 then return nil end
    return table.concat(t2, " + ")
  end

  ------------------------------------------------------------------ the boxes
  local NPV = X("NPV", nil, "NPV net present value ($)", "money", "the NPV (leave blank to find it)")
  local r = X("r", nil, "r discount rate (%)", "pct", "the discount rate (cost of capital)", { rate = true })
  local NCF0 = X("NCF0", nil, "NCF0 cash flow now ($)", "money", "the cost today as a NEGATIVE: the (-) key")
  local C = X("C", nil, "C cash flow each year from year 1 ($)", "money", "the SAME cash flow every year (or the first one, if it grows)")
  local g = X("g", nil, "g growth of C each year (%)", "pct", "C grows this much a year; a fall: -40. Blank = 0", { opt = true })
  local n = X("n", nil, "n life of the project (years)", "num", "how many years of C. Blank = forever", { opt = true, pos = true })
  local k = X("k", nil, "k year of the first C (blank = 1)", "num", "C starts in year k: years 5 to 20 means k = 5, n = 16", { opt = true, pos = true })
  local PVx = X("PVx", nil, "PVx value today of other cash ($)", "money", "a PV found in another section (1 or 9): added to the NPV")
  local gT = X("gT", nil, "gT growth forever after the last NCF (%)", "pct", "after the last NCF the cash flow grows this much forever (0: stays the same)")
  local PB = X("PB", nil, "PB payback period (years)", "num", "years until the cost is paid back (no discounting)", { pos = true })
  local rX = X("rX", nil, "rX crossover rate (%)", "pct", "the rate where the NPVs of the NCF project and project B are equal", { rate = true })
  local NPVB = X("NPVB", nil, "NPVB NPV of project B ($)", "money", "project B's NPV at the rate r")
  local IRRB = X("IRRB", nil, "IRRB IRR of project B (%)", "pct", "the rate that makes project B's NPV = 0", { rate = true })
  local P = X("P", nil, "P price per unit ($)", "money", "what ONE unit sells for")
  local v = X("v", nil, "v cost per unit ($)", "money", "the variable cost of ONE unit")
  local Q = X("Q", nil, "Q units sold a year", "num", "how many units a year. Blank, NPV = 0 typed: break-even units", { pos = true })
  local FC = X("FC", nil, "FC fixed costs a year ($)", "money", "costs that do not change with units. Blank = 0", { opt = true })
  local Dep = X("Dep", nil, "Dep depreciation ($)", "money", "depreciation a year. Blank = 0", { opt = true })
  local tc = X("tc", nil, "tc tax rate (%)", "pct", "the tax rate. Blank = no tax", { opt = true })
  local QA = X("QA", nil, "QA accounting break-even units", "num", "units a year where the profit is 0", { pos = true })
  local NPVb = X("NPVb", nil, "NPVb NPV of the base case ($)", "money", "the base-case NPV the change is measured from")
  local dNPV = X("dNPV", nil, "dNPV change in NPV (%)", "pct", "how much the NPV moved from the base case (a fall is negative)")
  local EV = X("EV", nil, "EV expected value ($)", "money", "the average outcome: each value times its chance, added")
  local t = X("t", nil, "t when the EV comes (years)", "num", "years from now: 6 months = 0.5, next year = 1", { pos = true })
  local pX = {}
  for i = 1, 3 do
    pX[#pX + 1] = X("p" .. i, nil, "p" .. i .. " chance of outcome " .. i .. " (%)", "pct", "the chance of outcome " .. i .. ", e.g. 40", { list = true })
    pX[#pX + 1] = X("X" .. i, nil, "X" .. i .. " value of outcome " .. i .. " ($)", "money", "what outcome " .. i .. " is worth (blank = 0)", { list = true })
  end
  local pHH = X("pHH", nil, "pHH chance: high, then high (%)", "pct", "the chance year 1 is high AND year 2 is high")
  local pHL = X("pHL", nil, "pHL chance: high, then low (%)", "pct", "the chance year 1 is high AND year 2 is low")
  local pLH = X("pLH", nil, "pLH chance: low, then high (%)", "pct", "the chance year 1 is low AND year 2 is high")
  local pLL = X("pLL", nil, "pLL chance: low, then low (%)", "pct", "the chance year 1 is low AND year 2 is low")
  local pHgH = X("pHgH", "P(H2|H1)", "P(H2|H1) high in year 2 if year 1 was high (%)", "pct", "the chance of high in year 2, GIVEN year 1 was high")
  local pHgL = X("pHgL", "P(H2|L1)", "P(H2|L1) high in year 2 if year 1 was low (%)", "pct", "the chance of high in year 2, GIVEN year 1 was low")

  ------------------------------------------------------------------ an even stream after the cost
  -- the stream's factor (PV of 1 a year), as a number and as text
  local function sfOf(x)
    local rr, gg = x.r, x.g or 0
    local f
    if x.n then f = (1 - ((1 + gg) / (1 + rr)) ^ x.n) / (rr - gg) else f = 1 / (rr - gg) end
    if x.k then f = f / (1 + rr) ^ (x.k - 1) end
    return f
  end
  local function sfText(x, withC)
    local s
    if x.n and x.g then s = withC and "C/(r - g)*(1 - ((1 + g)/(1 + r))^n)" or "(1 - ((1 + g)/(1 + r))^n)/(r - g)"
    elseif x.n then s = withC and "C/r*(1 - 1/(1 + r)^n)" or "(1 - 1/(1 + r)^n)/r"
    elseif x.g then s = withC and "C/(r - g)" or "1/(r - g)"
    else s = withC and "C/r" or "1/r" end
    if x.k then s = s .. "/(1 + r)^(k - 1)" end
    return s
  end
  local function sfInv(x)   -- 1 over the factor: C = (NPV - the rest)*this
    local s
    if x.n and x.g then s = "(r - g)/(1 - ((1 + g)/(1 + r))^n)"
    elseif x.n then s = "r/(1 - 1/(1 + r)^n)"
    elseif x.g then s = "(r - g)"
    else s = "r" end
    if x.k then s = s .. "*(1 + r)^(k - 1)" end
    return s
  end
  local strm = { id = "s3b_strm", sec = 3, name = "NPV: cost + even stream", short = "NPV with a stream",
    eq = "NPV = NCF0 + NCF1/(1 + r) + ... + C/(r - g)*(1 - ((1 + g)/(1 + r))^n)/(1 + r)^(k - 1)",
    why = "the NPV line, with the same C each year (an annuity: PV = C/r*(1 - 1/(1 + r)^n), a perpetuity C/r, growing: C/(r - g)) added in place of many NCFs; a start in year k: bring it back k - 1 more years",
    vars = cfList({ NPV, NCF0, C, r, g, n, k }, "NCF", "", 1),
    need = function(x)
      if x.r and x.g and not x.n and x.r <= x.g then return "r more than g (growth forever)" end
      if x.k and x.k < 1 then return "k = 1 or more (the year of the first C)" end
    end,
    eqf = function(x) return "NPV = " .. terms(x, "NCF", "r") .. " + " .. sfText(x, true) end,
    f = function(x) return pvList(x, "NCF", x.r) + x.C * sfOf(x) - x.NPV end,
    rearr = { C = function(x) return "C = (NPV - " .. ((lastOf(x, "NCF") > 0) and ("(" .. terms(x, "NCF", "r") .. ")") or "NCF0") .. ")*" .. sfInv(x) end,
              NCF0 = function(x) return "NCF0 = NPV - " .. ((lastOf(x, "NCF") > 0) and ("(" .. terms(x, "NCF", "r", 1) .. ") - ") or "") .. sfText(x, true) end },
    ex = { NCF0 = -500, C = 60, r = 0.1, n = 12 } }

  ------------------------------------------------------------------ a PV found in another section
  local pvx = { id = "s3b_pvx", sec = 3, name = "NPV: cost + PV found elsewhere", short = "NPV = NCF0 + PVx",
    eq = "NPV = NCF0 + PVx",
    why = "the NPV line: every cash flow's value today, added; PVx = the value today of the cash flows after the cost, found by a section 1 (annuity, perpetuity) or section 9 line",
    vars = { NPV, NCF0, PVx },
    f = function(x) return x.NCF0 + x.PVx - x.NPV end,
    rearr = { NCF0 = "NCF0 = NPV - PVx", PVx = "PVx = NPV - NCF0" },
    ex = { NCF0 = -190, PVx = 230 } }
  -- PI with the money invested today: the resource is -NCF0
  local pi0 = { id = "s3b_pi", sec = 3, name = "PI (resource = the cost)", short = "PI = NPV/(-NCF0)",
    eq = "PI = NPV/(-NCF0)",
    why = "the PI line on the sheet (PI = NPV/Resource) with the resource = the money invested today, -NCF0",
    vars = { X("PI", nil, "PI profitability index", "num", "NPV per dollar invested"), NPV, NCF0 },
    f = function(x) return x.NPV / (-x.NCF0) - x.PI end,
    rearr = { NPV = "NPV = PI*(-NCF0)", NCF0 = "NCF0 = -NPV/PI" },
    ex = { NPV = 250, NCF0 = -1000 } }

  ------------------------------------------------------------------ growth forever after the last NCF
  local tail = { id = "s3b_tail", sec = 3, name = "NPV: NCFs, then growth forever", short = "NPV with a growing tail",
    eq = "NPV = NCF0 + NCF1/(1 + r) + ... + NCFn/(1 + r)^n + NCFn*(1 + gT)/(r - gT)/(1 + r)^n",
    why = "after the last cash flow NCFn, a growing perpetuity: its first cash flow NCFn*(1 + gT) comes in year n + 1, so /(r - gT) is its value at year n; bring it back n years",
    vars = cfList({ NPV, r, gT }, "NCF", ""),
    need = function(x)
      if lastOf(x, "NCF") < 1 then return "the cash flows NCF1, NCF2, ... (the last one keeps growing)" end
      if x.r and x.gT and x.r <= x.gT then return "r more than gT (growth forever)" end
    end,
    eqf = function(x)
      local L = lastOf(x, "NCF")
      return "NPV = " .. terms(x, "NCF", "r") .. " + NCF" .. L .. "*(1 + gT)/(r - gT)/(1 + r)^" .. L
    end,
    f = function(x)
      local L = lastOf(x, "NCF")
      return pvList(x, "NCF", x.r) + x["NCF" .. L] * (1 + x.gT) / (x.r - x.gT) / (1 + x.r) ^ L - x.NPV
    end,
    ex = { NCF0 = -900, NCF1 = 40, NCF2 = 60, NCF3 = 70, r = 0.11, gT = 0.02 } }

  ------------------------------------------------------------------ payback
  local function payback(x)
    local cum = x.NCF0
    if not cum or cum >= 0 then return nil end
    for y = 1, lastOf(x, "NCF") do
      local c = x["NCF" .. y] or 0
      if cum + c >= 0 then return y - 1 + (-cum) / c, y end
      cum = cum + c
    end
    return nil
  end
  local pb = { id = "s3b_pb", sec = 3, name = "Payback period", short = "payback",
    eq = "PB = Y + (cost not yet back after year Y)/NCF(Y+1)",
    why = "add the cash flows year by year (no discounting); Y = the last year the running total is still negative",
    vars = cfList({ PB }, "NCF", ""),
    eqf = function(x)
      local _, y = payback(x)
      if not y then return "PB = Y + (cost not yet back after year Y)/NCF(Y+1)" end
      local s = {}
      for j = 0, y - 1 do if x["NCF" .. j] then s[#s + 1] = "NCF" .. j end end
      return "PB = " .. (y - 1) .. " + (-(" .. table.concat(s, " + ") .. "))/NCF" .. y
    end,
    f = function(x) return payback(x) - x.PB end,
    extra = function(x, out)
      local cum, s = 0, {}
      for y = 0, lastOf(x, "NCF") do cum = cum + (x["NCF" .. y] or 0); s[#s + 1] = "year " .. y .. ": " .. string.format("%.2f", cum) end
      out:note("running total: " .. table.concat(s, ", "))
    end,
    ex = { NCF0 = -200, NCF1 = 50, NCF2 = 90, NCF3 = 120 } }

  ------------------------------------------------------------------ project B: crossover, NPV, IRR
  local function hasB(x) return lastOf(x, "B") >= 0 end
  local function diffTerms(x)
    local s = {}
    for y = 0, 10 do
      local a, b = x["NCF" .. y], x["B" .. y]
      local d = (y == 0) and "" or ("/(1 + rX)" .. ((y > 1) and ("^" .. y) or ""))
      if a and b then s[#s + 1] = "(NCF" .. y .. " - B" .. y .. ")" .. d
      elseif a then s[#s + 1] = "NCF" .. y .. d
      elseif b then s[#s + 1] = "-B" .. y .. d end
    end
    return table.concat(s, " + ")
  end
  local function diffAt(x, rate)
    local s = 0
    for y = 0, 10 do s = s + ((x["NCF" .. y] or 0) - (x["B" .. y] or 0)) / (1 + rate) ^ y end
    return s
  end
  local rx = { id = "s3b_rx", sec = 3, name = "Crossover rate (NCF vs B)", short = "crossover rate",
    eq = "(NCF0 - B0) + (NCF1 - B1)/(1 + rX) + ... + (NCFn - Bn)/(1 + rX)^n = 0",
    why = "the rate where both NPVs are equal: the IRR of the differences NCFt - Bt (NPV of the NCF project - NPV of B = 0)",
    vars = cfList(cfList({ rX }, "NCF", ""), "B", "project B"),
    need = function(x)
      if not hasB(x) or lastOf(x, "NCF") < 1 then return "both lists: NCF0, NCF1, ... and B0, B1, ..." end
      local pos, neg = false, false
      for y = 0, 10 do
        local d = (x["NCF" .. y] or 0) - (x["B" .. y] or 0)
        if d > 0 then pos = true elseif d < 0 then neg = true end
      end
      if not (pos and neg) then return "lists whose differences change sign (else the NPVs never cross)" end
    end,
    eqf = function(x) return diffTerms(x) .. " = 0" end,
    f = function(x) return diffAt(x, x.rX) end,
    ex = { NCF0 = -500, NCF1 = 50, NCF2 = 250, NCF3 = 450, B0 = -500, B1 = 300, B2 = 250, B3 = 150 } }
  local npvb = { id = "s3b_npvb", sec = 3, name = "NPV of project B", short = "NPV of B",
    eq = "NPVB = B0 + B1/(1 + r) + ... + Bn/(1 + r)^n",
    why = "the NPV line on the sheet, for project B's cash flows",
    vars = cfList({ NPVB, r }, "B", "project B"),
    need = function(x) if lastOf(x, "B") < 1 then return "project B's cash flows B0, B1, ..." end end,
    eqf = function(x) return "NPVB = " .. terms(x, "B", "r") end,
    f = function(x) return pvList(x, "B", x.r) - x.NPVB end,
    ex = { B0 = -500, B1 = 300, B2 = 250, B3 = 150, r = 0.1 } }
  local irrb = { id = "s3b_irrb", sec = 3, name = "IRR of project B", short = "IRR of B",
    eq = "B0 + B1/(1 + IRRB) + ... + Bn/(1 + IRRB)^n = 0",
    why = "the IRR line on the sheet, for project B's cash flows",
    vars = cfList({ IRRB }, "B", "project B"),
    need = function(x)
      if lastOf(x, "B") < 1 then return "project B's cash flows B0, B1, ..." end
      local pos, neg = false, false
      for y = 0, 10 do local b = x["B" .. y]; if b and b > 0 then pos = true elseif b and b < 0 then neg = true end end
      if not (pos and neg) then return "a cost (NEGATIVE) and an inflow in B's list" end
    end,
    eqf = function(x) return terms(x, "B", "IRRB") .. " = 0" end,
    f = function(x) return pvList(x, "B", x.IRRB) end,
    ex = { B0 = -500, B1 = 300, B2 = 250, B3 = 150 } }

  ------------------------------------------------------------------ units: price, cost per unit, fixed costs
  -- C = ((P - v)*Q - FC - Dep)*(1 - tc) + Dep, written with only the letters typed
  local function opText(x)
    local s = "(P - v)*Q" .. (x.FC and " - FC" or "")
    if not x.tc then return s end
    if x.Dep then return "(" .. s .. " - Dep)*(1 - tc) + Dep" end
    return "(" .. s .. ")*(1 - tc)"
  end
  local function backText(x)   -- (P - v)*Q from C
    local s
    if x.tc then s = x.Dep and "(C - Dep)/(1 - tc) + Dep" or "C/(1 - tc)" else s = "C" end
    if x.FC then s = s .. " + FC" end
    if s == "C" then return s end
    return "(" .. s .. ")"
  end
  local sales = { id = "s3b_sales", sec = 3, name = "Cash flow from unit sales", short = "C from units",
    eq = "C = ((P - v)*Q - FC - Dep)*(1 - tc) + Dep",
    why = "a year's cash flow: (price - cost per unit) x units - fixed costs = EBIT + Dep; tax on EBIT; Dep added back (no tax: C = (P - v)*Q - FC)",
    vars = { C, P, v, Q, FC, Dep, tc },
    eqf = function(x) return "C = " .. opText(x) end,
    f = function(x)
      local fc, dep, tx = x.FC or 0, x.Dep or 0, x.tc or 0
      return ((x.P - x.v) * x.Q - fc - dep) * (1 - tx) + dep - x.C
    end,
    rearr = { Q = function(x) return "Q = " .. backText(x) .. "/(P - v)" end,
              P = function(x) return "P = v + " .. backText(x) .. "/Q" end,
              v = function(x) return "v = P - " .. backText(x) .. "/Q" end },
    ex = { P = 80, v = 60, Q = 6000, FC = 20000, Dep = 10000, tc = 0.3 } }
  local function fixText(x) return (x.FC and x.Dep) and "(FC + Dep)" or (x.FC and "FC" or "Dep") end
  local qacc = { id = "s3b_qacc", sec = 3, name = "Accounting break-even", short = "accounting break-even",
    eq = "QA = (FC + Dep)/(P - v)",
    why = "the units where EBIT = 0: each unit adds P - v, which must cover the fixed costs and the depreciation",
    vars = { QA, FC, Dep, P, v },
    eqf = function(x) return "QA = " .. fixText(x) .. "/(P - v)" end,
    f = function(x) return ((x.FC or 0) + (x.Dep or 0)) / (x.P - x.v) - x.QA end,
    rearr = { P = function(x) return "P = v + " .. fixText(x) .. "/QA" end, v = function(x) return "v = P - " .. fixText(x) .. "/QA" end },
    ex = { FC = 30000, Dep = 10000, P = 50, v = 30 } }
  local dnpv = { id = "s3b_dnpv", sec = 3, name = "Change in NPV (%)", short = "% change in NPV",
    eq = "dNPV = (NPV - NPVb)/NPVb",
    why = "a sensitivity: the new NPV minus the base-case NPV, as a part of the base",
    vars = { dNPV, NPV, NPVb },
    f = function(x) return (x.NPV - x.NPVb) / x.NPVb - x.dNPV end,
    rearr = { NPV = "NPV = NPVb*(1 + dNPV)", NPVb = "NPVb = NPV/(1 + dNPV)" },
    ex = { NPV = 450, NPVb = 600 } }

  ------------------------------------------------------------------ expected values
  local function evTerms(x)
    local s = {}
    for i = 1, 3 do if x["p" .. i] then s[#s + 1] = "p" .. i .. "*" .. (x["X" .. i] and ("X" .. i) or "0") end end
    return table.concat(s, " + ")
  end
  local ev = { id = "s3b_ev", sec = 3, name = "Expected value", short = "EV",
    eq = "EV = p1*X1 + p2*X2 + p3*X3",
    why = "each outcome times its chance, added (the chances add to 100%; an outcome worth nothing: X blank)",
    vars = { EV, pX[1], pX[2], pX[3], pX[4], pX[5], pX[6] },
    need = function(x)
      local sp, some = 0, false
      for i = 1, 3 do
        if x["p" .. i] then sp = sp + x["p" .. i]; some = true
        elseif x["X" .. i] then return "p" .. i .. ", the chance of X" .. i end
      end
      if not some then return "the chances p1, p2, ... and the values X1, X2, ..." end
      if not (x.X1 or x.X2 or x.X3) then return "a value X1, X2 or X3 (the outcome worth something)" end
      if sp > 1 + 1e-9 then return "chances that add to 100% or less" end
    end,
    eqf = function(x) return "EV = " .. evTerms(x) end,
    f = function(x)
      local s = 0
      for i = 1, 3 do if x["p" .. i] then s = s + x["p" .. i] * (x["X" .. i] or 0) end end
      return s - x.EV
    end,
    ex = { p1 = 0.3, X1 = 900, p2 = 0.7, X2 = 200 } }
  local evnpv = { id = "s3b_evnpv", sec = 3, name = "NPV of an expected value", short = "NPV = NCF0 + EV/(1 + r)^t",
    eq = "NPV = NCF0 + EV/(1 + r)^t",
    why = "the expected value at time t, brought back to today (t can be a part of a year: 6 months = 0.5), minus the cost",
    vars = { NPV, NCF0, EV, r, t },
    f = function(x) return x.NCF0 + x.EV / (1 + x.r) ^ x.t - x.NPV end,
    rearr = { NCF0 = "NCF0 = NPV - EV/(1 + r)^t", EV = "EV = (NPV - NCF0)*(1 + r)^t", t = "t = ln(EV/(NPV - NCF0))/ln(1 + r)" },
    ex = { NCF0 = -300, EV = 400, r = 0.09, t = 0.5 } }
  -- a two-year tree: the four paths add to 100%; a chance GIVEN year 1
  local psum = { id = "s3b_psum", sec = 3, name = "Tree: the four paths", short = "paths add to 100%",
    eq = "pHH + pHL + pLH + pLL = 1",
    why = "every path of the tree happens with some chance: together 100%",
    vars = { pHH, pHL, pLH, pLL },
    f = function(x) return x.pHH + x.pHL + x.pLH + x.pLL - 1 end,
    rearr = { pLH = "pLH = 1 - pHH - pHL - pLL", pHH = "pHH = 1 - pHL - pLH - pLL", pHL = "pHL = 1 - pHH - pLH - pLL",
              pLL = "pLL = 1 - pHH - pHL - pLH" },
    ex = { pHH = 0.5, pHL = 0.2, pLL = 0.25 } }
  local phh = { id = "s3b_phh", sec = 3, name = "Tree: high after high", short = "P(H2|H1)",
    eq = "P(H2|H1) = pHH/(pHH + pHL)",
    why = "a chance GIVEN year 1: the path's chance / the chance of a high year 1 (pHH + pHL)",
    vars = { pHgH, pHH, pHL },
    f = function(x) return x.pHH / (x.pHH + x.pHL) - x.pHgH end,
    rearr = { pHH = "pHH = P(H2|H1)*pHL/(1 - P(H2|H1))", pHL = "pHL = pHH*(1 - P(H2|H1))/P(H2|H1)" },
    ex = { pHH = 0.5, pHL = 0.2 } }
  local phl = { id = "s3b_phl", sec = 3, name = "Tree: high after low", short = "P(H2|L1)",
    eq = "P(H2|L1) = pLH/(pLH + pLL)",
    why = "a chance GIVEN year 1: the path's chance / the chance of a low year 1 (pLH + pLL)",
    vars = { pHgL, pLH, pLL },
    f = function(x) return x.pLH / (x.pLH + x.pLL) - x.pHgL end,
    rearr = { pLH = "pLH = P(H2|L1)*pLL/(1 - P(H2|L1))", pLL = "pLL = pLH*(1 - P(H2|L1))/P(H2|L1)" },
    ex = { pLH = 0.05, pLL = 0.25 } }

  ------------------------------------------------------------------ when the lines run
  local function any(K, list) for _, b in ipairs(list) do if K[b] ~= nil then return true end end return false end
  local LATER = {}
  for y = 1, 10 do LATER[#LATER + 1] = "3:NCF" .. y end
  local BOXB = {}
  for y = 0, 10 do BOXB[#BOXB + 1] = "3:B" .. y end
  -- the sheet's NPV / IRR lines see only part of the cash flows when a stream or a tail is typed
  local function partial(K) return K["3:C"] ~= nil or K["3:gT"] ~= nil end
  EVERY_ADD{
    lines = { strm, pvx, tail, pi0, pb, rx, npvb, irrb, sales, qacc, dnpv, ev, evnpv, psum, phh, phl },
    bridges = {
      -- a year's cash flow found by another line is the stream's C (not when the EV comes once, at t)
      { "3:FCF", "3:C", false, nil, "FCF", "3:CF" },
      { "3:CF", "3:C", false, nil, "CF", "3:FCF" },
      { "3:EV", "3:C", false, nil, "EV", "3:t" },
      -- a PV worked out in section 1 or 9 (never a typed one): the rest of the NPV, or the value of outcome 1
      { "1:PV", "3:PVx", false, nil, "PV", "3:p1", true },
      { "9:PV", "3:PVx", false, nil, "PV", "1:PV", true },
      { "1:PV", "3:X1", false, nil, "PV", nil, true },
    },
    fam = { npv = "npvx", s3b_strm = "npvx", s3b_pvx = "npvx", s3b_tail = "npvx", s3b_evnpv = "npvx", pi = "pi", s3b_pi = "pi" },
    skip = {
      npv = partial, irr = partial,
      -- k typed: n counts the years of C, not the project's life
      eav = function(K) return K["3:k"] ~= nil end, npvinf = function(K) return K["3:k"] ~= nil end,
      -- payback: only a full list that pays back the cost (all costs: no line)
      s3b_pb = function(K)
        if K["3:C"] ~= nil or K["3:gT"] ~= nil then return true end
        local x = {}
        for y = 0, 10 do x["NCF" .. y] = K["3:NCF" .. y] end
        return payback(x) == nil
      end,
      -- project B's lines: only when B's list is typed
      s3b_rx = function(K) return not any(K, BOXB) end,
      -- a stream: C known (typed, or a year's FCF), or C asked for (its own letters, or NPV and NCF0 typed, no list);
      -- a derived C never joins a typed list
      s3b_strm = function(K, kn)
        if kn["3:C"] == nil then
          return not (any(K, { "3:g", "3:k", "3:P", "3:v", "3:Q" }) or K["3:NPV"] ~= nil and K["3:NCF0"] ~= nil and not any(K, LATER))
        end
        return K["3:C"] == nil and any(K, LATER) or K["3:gT"] ~= nil
      end,
      s3b_pvx = function(K, kn) return kn["3:PVx"] == nil or K["3:C"] ~= nil or K["3:gT"] ~= nil or any(K, LATER) end,
      -- PI from -NCF0: a cost today, Resource blank, some cash coming back (not a list of costs only)
      s3b_pi = function(K)
        if K["3:Resource"] ~= nil or not K["3:NCF0"] or K["3:NCF0"] >= 0 or K["3:NPV"] == 0 then return true end
        local later, pos = false, false
        for y = 1, 10 do local c = K["3:NCF" .. y]; if c then later = true; if c > 0 then pos = true end end end
        return later and not pos
      end,
      s3b_tail = function(K) return K["3:gT"] == nil or K["3:C"] ~= nil end,
      s3b_qacc = function(K, kn) return kn["3:FC"] == nil and kn["3:Dep"] == nil end,
      s3b_dnpv = function(K) return K["3:NPVb"] == nil end,
      s3b_evnpv = function(K, kn) return kn["3:t"] == nil end,
    },
    hint = { ["3:n"] = "life in years: NPVinf, EAV, and the years of C (blank = forever)",
             ["3:Resource"] = "usually the money invested (positive). Blank: PI uses -NCF0" },
  }
end
