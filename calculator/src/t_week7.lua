----------------------------------------------------------------------
-- WEEK 7: PROJECT RISK
--   11 break-even, sensitivity, scenarios (a margin x units project)
--   12 expected values, decision trees, options
--   13 probabilities over two years (joint + conditional)
----------------------------------------------------------------------
do
  local function pos(x) return x ~= nil end

  -- NPV of the unit-margin project: OCF = ((P - v)Q - FC - Dep)(1 - T) + Dep every year, for n years (nil = forever)
  local function marginNPV(M)
    local ocf = ((M.P - M.v) * M.Q - M.FC - M.Dep) * (1 - M.T) + M.Dep
    local f = annFac(M.r, M.n)
    if not f then return nil end
    return ocf * f - M.I, ocf, f
  end
  local function factorText(r, n)
    if n == nil then return "1/r = 1/" .. P(r) .. " (forever)" end
    return "(1 - 1/(1 + r)^n)/r = (1 - 1/" .. P(1 + r) .. "^" .. P(n) .. ")/" .. P(r)
  end

  local function solveBE(V, out)
    local mode = V.mode or "NPV + break-even"
    local T = V.T or 0
    local dep = V.Dep
    if not dep and V.life and V.I then
      dep = V.I / V.life
      out:row("Dep (straight-line)", dep, "$", "Dep = I/life = " .. P(V.I) .. "/" .. P(V.life), "Dep")
    end
    dep = dep or 0
    local FC = V.FC or 0
    if not (V.P and V.v) then out:need("price P and cost per unit v"); return end
    local mgn = V.P - V.v
    out:head("PER UNIT")
    out:row("margin per unit (P - v)", mgn, "$", "P - v = " .. P(V.P) .. " - " .. P(V.v), "mgn")
    if mgn <= 0 then out:err("price is not above the cost per unit: no break-even exists"); return end

    if mode == "NPV + break-even" then
      if V.FC or V.Dep or (V.life and V.I) then
        out:head("EBIT (ACCOUNTING) BREAK-EVEN")
        out:row("Q (EBIT = 0)", (FC + dep) / mgn, "units", "Q = (FC + Dep)/(P - v) = (" .. P(FC) .. " + " .. P(dep) .. ")/" .. P(mgn), "Qebit")
        out:note("interest and tax are NOT used: EBIT is before both")
      else
        out:note("EBIT break-even: type the fixed costs FC and/or Dep")
      end
      if not (V.r and V.I) then out:need("r and the outlay I for the NPV break-even"); return end
      local f = annFac(V.r, V.n)
      if not f then out:err("the rate must be above zero"); return end
      out:head("NPV BREAK-EVEN")
      out:row("factor", f, "", factorText(V.r, V.n), "f")
      local need = V.I / f
      out:row("OCF needed each year", need, "$", "I/factor = " .. P(V.I) .. "/" .. P(f) .. "  (like a loan repayment)", "need")
      local Qbe = (need + FC * (1 - T) - T * dep) / (mgn * (1 - T))
      if T == 0 then
        out:row("Q (NPV = 0)", Qbe, "units", "Q = (OCF needed + FC)/(P - v) = (" .. P(need) .. " + " .. P(FC) .. ")/" .. P(mgn), "Qnpv")
      else
        out:row("Q (NPV = 0)", Qbe, "units", "Q = (OCF needed + FC(1 - T) - T x Dep)/((P - v)(1 - T))", "Qnpv")
      end
      if V.Q then
        local M = { Q = V.Q, P = V.P, v = V.v, FC = FC, Dep = dep, T = T, r = V.r, n = V.n, I = V.I }
        local npv, ocf = marginNPV(M)
        out:head("THIS PROJECT (Q = " .. P(V.Q) .. ")")
        out:row("OCF each year", ocf, "$", "((P - v)Q - FC - Dep)(1 - T) + Dep", "ocf")
        out:row("NPV", npv, "$", "NPV = OCF x factor - I = " .. P(ocf) .. " x " .. P(f) .. " - " .. P(V.I), "NPV")
        out:add(npv >= 0 and "ok" or "bad", npv >= 0 and "NPV >= 0: accept" or "NPV < 0: reject")
        -- break-even for the other inputs (NPV is a straight line in each of them)
        local base = (need - dep) / (1 - T) + FC + dep     -- (P - v)Q needed
        out:head("BREAK-EVEN OF EACH INPUT (NPV = 0)")
        out:row("price P", V.v + base / V.Q, "$", "P = v + ((OCF needed - Dep)/(1 - T) + FC + Dep)/Q", "Pbe")
        out:row("cost per unit v", V.P - base / V.Q, "$", "v = P - (same)/Q", "vbe")
        local irr = findRoot(function(r)
          local g = annFac(r, V.n); if not g then return nil end
          return ocf * g - V.I end, 0.0005, 5, 0.0025)
        if irr then out:row("discount rate (IRR)", irr, "%", "the r that makes OCF x factor = I", "irr") end
      end
      out:head("ON YOUR TI-NSPIRE")
      if V.n then out:xl("tvmPmt(" .. P(V.n) .. "," .. pct(V.r) .. ",-" .. P(V.I) .. ",0,1,1)  -> OCF needed")
      else out:xl(P(V.I) .. "*" .. P(V.r) .. "  -> OCF needed (a perpetuity)") end
      if T == 0 then out:xl("(ans+" .. P(FC) .. ")/" .. P(mgn) .. "  -> units") end
      return
    end

    if not (V.Q and V.r and V.I) then out:need("the base case: Q, r and the outlay I"); return end
    local base = { Q = V.Q, P = V.P, v = V.v, FC = FC, Dep = dep, T = T, r = V.r, n = V.n, I = V.I }
    local npv0, ocf0, f0 = marginNPV(base)
    if not npv0 then out:err("the rate must be above zero"); return end
    out:head("BASE CASE")
    out:row("OCF each year", ocf0, "$", "((P - v)Q - FC - Dep)(1 - T) + Dep", "ocf0")
    out:row("NPV base", npv0, "$", "OCF x " .. factorText(V.r, V.n) .. " - I", "npv0")

    if mode == "sensitivity: one input" then
      local which = V.test or "units Q"
      if V.new == nil then out:need("the new value of the input you change"); return end
      local key = ({ ["units Q"] = "Q", ["price P"] = "P", ["cost per unit v"] = "v", ["fixed costs FC"] = "FC",
                     ["rate r (%)"] = "r", ["outlay I"] = "I" })[which]
      local M = {}
      for k2, x in pairs(base) do M[k2] = x end
      local new = V.new
      if key == "r" then new = new / 100 end
      local old = M[key]
      M[key] = new
      local npv1 = marginNPV(M)
      out:head("CHANGE ONE INPUT: " .. which)
      out:row("new NPV", npv1, "$", "same formula, only " .. key .. " changed: " .. P(old) .. " -> " .. P(new), "npv1")
      out:row("change in NPV", npv1 - npv0, "$", "NPV new - NPV base", "dnpv")
      if npv0 ~= 0 then out:row("% change in NPV", (npv1 - npv0) / math.abs(npv0), "%", "(NPV new - NPV base)/NPV base", "pnpv") end
      if old and old ~= 0 then out:row("% change in the input", (new - old) / old, "%", "(new - old)/old", "pin") end
      out:note("the input whose change moves the NPV most is the one the NPV is MOST sensitive to")
      return
    end

    -- scenarios: worst and best values default to the base values
    local function scen(Qx, Px, vx)
      local M = {}
      for k2, x in pairs(base) do M[k2] = x end
      M.Q, M.P, M.v = Qx or V.Q, Px or V.P, vx or V.v
      return marginNPV(M), M
    end
    local nw, Mw = scen(V.Qw, V.Pw, V.vw)
    local nb, Mb = scen(V.Qb, V.Pb, V.vb)
    out:head("SCENARIOS (change the inputs together)")
    out:row("NPV worst", nw, "$", "Q " .. P(Mw.Q) .. ", P " .. P(Mw.P) .. ", v " .. P(Mw.v), "nw")
    out:row("NPV base", npv0, "$", "Q " .. P(V.Q) .. ", P " .. P(V.P) .. ", v " .. P(V.v), "nbase")
    out:row("NPV best", nb, "$", "Q " .. P(Mb.Q) .. ", P " .. P(Mb.P) .. ", v " .. P(Mb.v), "nb")
    if V.pw and V.pb then
      local pb0 = 1 - V.pw - V.pb
      out:row("probability of base", pb0, "%", "1 - worst - best", "pbase")
      out:row("expected NPV", V.pw * nw + pb0 * npv0 + V.pb * nb, "$", "p_w x NPV_w + p_b x NPV_b + p_base x NPV_base", "enpv")
    end
  end

  local MODES11 = { "NPV + break-even", "sensitivity: one input", "scenario: worst/base/best" }
  table.insert(TYPES, {
    name = "Break-even, sensitivity, scenarios", group = 4, solve = solveBE,
    desc = "units x margin projects: EBIT and NPV break-even, change one input, worst/base/best",
    looks = "break-even units | how many units make NPV zero | if the price falls to | worst case NPV | best case",
    slots = {
      S("mode", "what to find", "choice", MODES11, 1),
      S("I", "I outlay today ($)", "money"),
      S("Q", "Q units per year", "num"),
      S("P", "P price per unit ($)", "money"),
      S("v", "v cost per unit ($)", "money"),
      S("FC", "FC fixed costs/SG&A a yr ($)", "money"),
      S("Dep", "Dep depreciation a yr ($)", "money"),
      S("life", "or: dep over (years) to 0", "num"),
      S("T", "T tax rate (%) (blank = 0)", "pct"),
      S("r", "r cost of capital (%)", "pct"),
      S("n", "n years (blank = forever)", "num"),
      S("test", "input you change", "choice", { "units Q", "price P", "cost per unit v", "fixed costs FC", "rate r (%)", "outlay I" }, 2),
      S("new", "its new value", "num"),
      S("Qw", "WORST: Q (blank = base)", "num"),
      S("Pw", "WORST: P (blank = base)", "money"),
      S("vw", "WORST: v (blank = base)", "money"),
      S("Qb", "BEST: Q (blank = base)", "num"),
      S("Pb", "BEST: P (blank = base)", "money"),
      S("vb", "BEST: v (blank = base)", "money"),
      S("pw", "prob of worst (%)", "pct"),
      S("pb", "prob of best (%)", "pct"),
    },
    vis = function(Sm)
      local m = Sm.mode.opts[Sm.mode.idx]
      local l = { "mode", "I", "Q", "P", "v", "FC", "Dep", "life", "T", "r", "n" }
      if m == MODES11[2] then table.insert(l, "test"); table.insert(l, "new") end
      if m == MODES11[3] then for _, k2 in ipairs({ "Qw", "Pw", "vw", "Qb", "Pb", "vb", "pw", "pb" }) do table.insert(l, k2) end end
      return l
    end,
    hints = {
      mode = "left/right: break-even, one change, or scenarios",
      I = "the cost to start today, e.g. 'costs $500,000'",
      Q = "sales each year, e.g. '6,000 units a year'",
      P = "selling price of ONE unit",
      v = "variable cost of ONE unit ('costs $60 to make')",
      FC = "yearly fixed costs, SG&A (not depreciation)",
      Dep = "yearly depreciation (for EBIT, and tax)",
      life = "machine written off to zero over this many years",
      T = "company tax rate; blank if 'no tax'",
      r = "cost of capital / discount rate, e.g. 10",
      n = "how many years of sales; 'forever' -> leave blank",
      test = "which one input moves; the rest stay at base",
      new = "its new value (a rate as a %, e.g. 12)",
      Qw = "worst-case units; blank if it does not change",
      pw = "chance of the worst case, e.g. 25",
      pb = "chance of the best case; base gets the rest",
    },
    formula = { "Q_EBIT = (FC + Dep)/(P - v)", "NPV = OCF*factor - I" },
    words = "a project is units x margin each year; break-even is where EBIT (or NPV) is exactly zero",
    letters = { "Q = units sold per year", "P = price per unit; v = variable cost per unit", "FC = fixed costs a year (SG&A)",
                "Dep = depreciation a year", "T = company tax rate", "r = cost of capital", "n = years of sales (blank = forever)",
                "I = outlay today", "OCF = operating cash flow a year", "factor = 1/r (forever) or (1 - 1/(1 + r)^n)/r" },
    acronyms = { "EBIT = earnings before interest and tax", "NPV = net present value", "OCF = operating cash flow",
                 "SG&A = selling, general and administrative costs (fixed costs)", "IRR = the rate where NPV = 0" },
    notes = [[BREAK-EVEN, SENSITIVITY, SCENARIOS

HOW TO USE
Pick what to find with left/right.
Fill price P and cost v, then the rest.
EBIT break-even needs FC and Dep only.
NPV break-even also needs r and I
(n blank = the sales go on forever).
Add Q to see this project's NPV.

FORMULAS
$$Q_EBIT = (FC + Dep)/(P - v)
$$OCF = ((P - v)*Q - FC - Dep)*(1 - T) + Dep
$$NPV = OCF*factor - I
factor: $1/r$ forever, else $(1 - 1/(1 + r)^n)/r$
NPV break-even: the OCF needed each year
is $I/factor$ (a loan repayment on I),
then Q = OCF needed / margin (no tax).

SENSITIVITY = change ONE input, keep the
rest at base. SCENARIO = change SEVERAL
inputs together (worst / base / best).]],
    assume = STEPS_COMMON .. [[
THIS TYPE:
1. margin per unit = P - v
2. EBIT break-even: (FC + Dep)/margin
3. NPV break-even: OCF needed = I/factor,
   then units = (OCF needed + FC)/margin
4. sensitivity: one change, new NPV,
   change and % change
5. scenario: all changes at once

IF THE QUESTION SAYS...
- "EBIT / accounting break-even" -> leave
  out interest AND tax
- "machine depreciated over 4 years" ->
  Dep = cost / 4 (use the 'dep over' slot)
- "forever" -> n blank; "for 8 years" -> n 8
- "most sensitive" -> the input with the
  biggest NPV range (high - low)

TRAPS
- EBIT break-even ignores the time value
  of money: it is NOT the NPV break-even
- sensitivity keeps everything else at base]],
    worked = [[## NPV break-even, forever (lecture)
Q: costs $500,000, price $80, cost $60,
same sales forever, no tax, r 10%.
Units for NPV = 0?
ENTER: I 500000 | P 80 | v 60 | r 10
OCF needed = 500,000 x 0.10 = $50,000
Q = 50,000 / 20 = 2,500 units a year

## NPV break-even, 5 years
Q: costs $300,000, price $45, cost $20,
5 years, no tax, r 10%.
ENTER: I 300000 | P 45 | v 20 | r 10 | n 5
OCF needed = tvmPmt(5,10,-300000,0,1,1)
= $79,139.24; Q = 79,139.24/25 = 3,166

## EBIT break-even
Q: price $98, cost $90, SG&A $83,000,
Dep $35,000, interest $35,000.
ENTER: P 98 | v 90 | FC 83000 | Dep 35000
Q = (83,000 + 35,000)/8 = 14,750 units
(interest left out)

## Sensitivity: the price changes
Q: costs $450,000; 3,000 units forever,
P $110, v $80, r 11%. New price $105?
ENTER: mode sensitivity | I 450000 |
Q 3000 | P 110 | v 80 | r 11 |
input price P | new 105
NPV base = $368,181.82
NPV new = $231,818.18]],
  })

  ------------------------------------------------------------------
  -- 12 expected values, decision trees, options
  ------------------------------------------------------------------
  local MODES12 = { "chance node (expected value)", "decision node (pick the best)", "project with uncertain cash flow", "sell or keep (abandon option)" }
  local VALKIND = { "values at the node", "a yearly amount forever", "a yearly amount for n years" }

  local function outcomes(V, n)
    local vals, probs, missing = {}, {}, nil
    local sum = 0
    for k2 = 1, n do
      local v, p = V["v" .. k2], V["p" .. k2]
      if v ~= nil then
        vals[#vals + 1] = v
        probs[#probs + 1] = p or false
        if p then sum = sum + p elseif missing then return nil, "only ONE probability may be blank" else missing = #probs end
      end
    end
    if #vals == 0 then return nil, "the outcome values" end
    if missing then probs[missing] = 1 - sum; sum = 1 end
    if math.abs(sum - 1) > 0.0005 then return nil, "probabilities that add to 100% (now " .. pct(sum) .. "%)" end
    return vals, probs
  end

  local function solveTree(V, out)
    local mode = V.mode or MODES12[1]
    local r, t = V.r, V.t or 0
    if mode == MODES12[2] then
      local best, bi = nil, nil
      for k2 = 1, 4 do local v = V["v" .. k2]; if v and (best == nil or v > best) then best, bi = v, k2 end end
      if not best then out:need("the value of each option (at the decision date)"); return end
      out:head("DECISION NODE: keep the BEST option")
      out:row("best option", bi, "", "option " .. bi .. " has the highest value", "bi")
      out:row("node value (at t = " .. P(t) .. ")", best, "$", "max of the options", "node")
      if r and t > 0 then out:row("value today", best / (1 + r) ^ t, "$", "node/(1 + r)^t = " .. P(best) .. "/" .. P(1 + r) .. "^" .. P(t), "pv") end
      return
    end
    local vals, probs = outcomes(V, 4)
    if not vals then out:need(probs); return end
    local conv = V.kind or VALKIND[1]
    local f = 1
    if conv ~= VALKIND[1] then
      if not r then out:need("r to turn yearly amounts into values"); return end
      f = annFac(r, conv == VALKIND[3] and V.n or nil)
      if conv == VALKIND[3] and not V.n then out:need("n (the number of years)"); return end
      out:row("factor", f, "", factorText(r, conv == VALKIND[3] and V.n or nil), "f")
      out:note("a yearly amount starting ONE year after a date is worth amount x factor AT that date")
    end
    local E, terms = 0, {}
    for k2, v in ipairs(vals) do E = E + probs[k2] * v; terms[#terms + 1] = P(probs[k2]) .. " x " .. P(v) end
    if mode == MODES12[1] then
      out:head("CHANCE NODE: probability-weighted average")
      out:row("expected value", E * f, conv == VALKIND[1] and "$" or "$", table.concat(terms, " + ") .. (f ~= 1 and (" then x " .. P(f)) or ""), "E")
      if r and t > 0 then out:row("value today", E * f / (1 + r) ^ t, "$", "E/(1 + r)^t = " .. P(E * f) .. "/" .. P(1 + r) .. "^" .. P(t), "pv") end
      if not r and t > 0 then out:need("r to bring the node value back to today") end
      return
    end
    if mode == MODES12[3] then
      if not (V.I and r) then out:need("the outlay I and r"); return end
      out:head("EXPECTED CASH FLOW, THEN NPV")
      out:row("E[CF] each year", E, "$", table.concat(terms, " + "), "ECF")
      local g = annFac(r, V.n)
      out:row("factor", g, "", factorText(r, V.n), "g")
      local npv = -V.I + E * g
      out:row("NPV", npv, "$", "-I + E[CF] x factor = -" .. P(V.I) .. " + " .. P(E) .. " x " .. P(g), "NPV")
      out:add(npv >= 0 and "ok" or "bad", npv >= 0 and "NPV >= 0: go ahead" or "NPV < 0: do not go ahead")
      return
    end
    -- sell or keep
    local sell = V.sell
    if not sell and V.sellp and V.cost then sell = V.sellp * V.cost end
    if not sell then out:need("the sale value (or % of cost and the cost)"); return end
    if not r then out:need("r"); return end
    out:head("SELL (ABANDON) OR KEEP?")
    out:row("sell now", sell, "$", V.sell and "given" or ("% x cost = " .. P(V.sellp) .. " x " .. P(V.cost)), "sell")
    local keep = E * f / (1 + r)
    out:row("keep: expected next-year value", E * f, "$", table.concat(terms, " + "), "Ekeep")
    out:row("keep: value now", keep, "$", "E/(1 + r) = " .. P(E * f) .. "/" .. P(1 + r), "keep")
    local node = math.max(sell, keep)
    out:row("node value", node, "$", "the larger of sell and keep", "node")
    out:add("ok", sell > keep and "SELL (abandon): it is worth more" or "KEEP: it is worth more")
    out:row("value of the option to sell", node - keep, "$", "node - keep (never below zero)", "opt")
  end

  table.insert(TYPES, {
    name = "Expected values, trees, options", group = 4, solve = solveTree,
    desc = "chance nodes, decision nodes, projects with uncertain cash flow, sell (abandon) or keep",
    looks = "probability | expected cash flow | chance node | decision node | tree | abandon | sell the asset | option",
    slots = {
      S("mode", "what to find", "choice", MODES12, 1),
      S("v1", "value / option 1 ($)", "money"), S("p1", "probability 1 (%)", "pct"),
      S("v2", "value / option 2 ($)", "money"), S("p2", "probability 2 (%)", "pct"),
      S("v3", "value / option 3 ($)", "money"), S("p3", "probability 3 (%)", "pct"),
      S("v4", "value / option 4 ($)", "money"), S("p4", "probability 4 (%)", "pct"),
      S("kind", "the values are", "choice", VALKIND, 1),
      S("n", "n years (for 'n years')", "num"),
      S("t", "t: node date (years)", "num"),
      S("r", "r discount rate (%)", "pct"),
      S("I", "I outlay today ($)", "money"),
      S("sell", "sale value if sold ($)", "money"),
      S("sellp", "or: sale as % of cost", "pct"),
      S("cost", "cost of the asset ($)", "money"),
    },
    vis = function(Sm)
      local m = Sm.mode.opts[Sm.mode.idx]
      if m == MODES12[2] then return { "mode", "v1", "v2", "v3", "v4", "t", "r" } end
      local l = { "mode", "v1", "p1", "v2", "p2", "v3", "p3", "v4", "p4", "kind", "n" }
      if m == MODES12[1] then table.insert(l, "t"); table.insert(l, "r") end
      if m == MODES12[3] then table.insert(l, "r"); table.insert(l, "I") end
      if m == MODES12[4] then for _, k2 in ipairs({ "r", "sell", "sellp", "cost" }) do table.insert(l, k2) end end
      return l
    end,
    hints = {
      mode = "left/right: chance node, decision, project, abandon",
      v1 = "an outcome's value (or an option's value)",
      p1 = "its probability, e.g. 60; ONE may be blank",
      kind = "'$70,000 a year forever' -> a yearly amount",
      t = "when the node happens, e.g. 1 (then it is discounted)",
      r = "discount rate, e.g. 8",
      I = "the cost today (the project's outlay)",
      sell = "cash if you sell (abandon) now",
      sellp = "'sell for 60% of its cost' -> 60",
    },
    formula = { "E[V] = sum p_k*V_k", "value today = E[V]/(1 + r)^t   decision node = max(options)" },
    words = "a chance node is worth the probability-weighted average; a decision node is worth its best option; then discount to today",
    letters = { "V_k = the value of outcome k", "p_k = its probability (they add to 100%)", "t = the date of the node (years)",
                "r = discount rate", "E[V] = expected value", "I = outlay today", "factor = turns a yearly amount into a value" },
    acronyms = { "E[CF] = expected cash flow", "NPV = net present value", "abandon = sell or stop the project early" },
    notes = [[EXPECTED VALUES, TREES, OPTIONS

HOW TO USE
Chance node: the outcomes and their
probabilities (one may be blank = the
rest). Set t and r to value it today.
Decision node: each option's value at
its date; the best one is kept.
Project: outlay I, yearly cash-flow
outcomes, n (blank = forever), r.
Sell or keep: the sale value and next
year's outcomes if you keep it.

SOLVE A TREE FROM RIGHT TO LEFT
1. value the END (right) nodes
2. chance node = weighted average
3. decision node = the best option
4. discount back one step at a time

FORMULAS
$$E[V] = p_1*V_1 + p_2*V_2 + ...
$$PV = (E[V])/((1 + r)^t)
option value = NPV with option
- NPV without (never below zero)]],
    assume = STEPS_COMMON .. [[
THIS TYPE:
1. draw the tree: squares = decisions,
   circles = chance
2. work from the right to the left
3. chance: weighted average; decision:
   pick the best, write WHY
4. discount each value to today

IF THE QUESTION SAYS...
- "worth $X a year forever, valued at
  t = 1" -> values are 'yearly forever'
- "can sell for 60% of cost" -> sell
- "sunk cost" / "already paid" -> ignore
- "loan interest" -> ignore (financing)

TRAPS
- probabilities must add to 100%
- a decision node is NOT averaged]],
    worked = [[## Expected cash flow
Q: $440,000 (90%) or $176,000 (10%).
ENTER: v1 440000 | p1 90 | v2 176000
E = 0.9 x 440,000 + 0.1 x 176,000
= $413,600

## Chance node at t = 1, r 8%
Q: worth $1.45m (80%) or $440,000 at
t = 1. Worth today?
ENTER: v1 1.45m | p1 80 | v2 440k |
t 1 | r 8
E = $1,248,000; PV = 1,248,000/1.08
= $1,155,555.56

## Research that may pay forever
Q: $150,000 now; 40% chance of $70,000
a year forever, valued at t = 1; r 15%.
ENTER: v1 70000 | p1 40 | v2 0 |
values: a yearly amount forever |
t 1 | r 15
E at t = 1 = 0.4 x 466,666.67
= 186,666.67; today = 162,318.84
NPV = 162,318.84 - 150,000 = $12,318.84

## Sell or keep (tutorial)
Q: sell for 60% of $75,000, or keep:
$60,000 (25%) or $33,000 next year; r 10%
ENTER: mode sell or keep | v1 60000 |
p1 25 | v2 33000 | r 10 | sellp 60 |
cost 75000
keep = 39,750/1.1 = $36,136.36
sell = $45,000 -> abandon]],
  })

  ------------------------------------------------------------------
  -- 13 probabilities over two years
  ------------------------------------------------------------------
  local MODES13 = { "from the 4 path (joint) probs", "from year 1 + 'given' probs" }
  local function solveProb(V, out)
    local mode = V.mode or MODES13[1]
    local HH, HL, LH, LL
    if mode == MODES13[1] then
      local given, blank, sum = 0, nil, 0
      local t = { HH = V.HH, HL = V.HL, LH = V.LH, LL = V.LL }
      for _, k2 in ipairs({ "HH", "HL", "LH", "LL" }) do
        if t[k2] then given = given + 1; sum = sum + t[k2] elseif blank then out:need("at least 3 of the 4 path probabilities"); return else blank = k2 end
      end
      if blank then t[blank] = 1 - sum; out:row("P(" .. blank .. ") (missing path)", t[blank], "%", "1 - the other three", "miss"); sum = 1 end
      if math.abs(sum - 1) > 0.0005 then out:err("the four paths must add to 100% (now " .. pct(sum) .. "%)"); return end
      HH, HL, LH, LL = t.HH, t.HL, t.LH, t.LL
    else
      if not V.H1 then out:need("P(H1): the chance of HIGH in year 1"); return end
      local L1 = 1 - V.H1
      local hh = V.HgH or (V.LgH and 1 - V.LgH)
      local ll = V.LgL or (V.HgL and 1 - V.HgL)
      if not hh then out:need("P(H2 | H1) or P(L2 | H1)"); return end
      if not ll then out:need("P(L2 | L1) or P(H2 | L1)"); return end
      HH, HL, LH, LL = V.H1 * hh, V.H1 * (1 - hh), L1 * (1 - ll), L1 * ll
      out:note("multiply ALONG a path: P(H1 and H2) = P(H1) x P(H2 | H1)")
    end
    local H1, L1 = HH + HL, LH + LL
    out:head("PATHS (JOINT PROBABILITIES)")
    out:row("P(HH)", HH, "%", "high then high", "HH")
    out:row("P(HL)", HL, "%", "high then low", "HL")
    out:row("P(LH)", LH, "%", "low then high", "LH")
    out:row("P(LL)", LL, "%", "low then low", "LL")
    out:head("YEAR 1 AND YEAR 2")
    out:row("P(H1)", H1, "%", "P(HH) + P(HL)", "H1")
    out:row("P(L1)", L1, "%", "P(LH) + P(LL)", "L1")
    out:row("P(H2)", HH + LH, "%", "P(HH) + P(LH)", "H2")
    out:row("P(L2)", HL + LL, "%", "P(HL) + P(LL)", "L2")
    out:head("GIVEN YEAR 1 (CONDITIONAL)")
    if H1 > 0 then
      out:row("P(H2 | H1)", HH / H1, "%", "P(HH)/P(H1) = " .. P(HH) .. "/" .. P(H1), "HgH")
      out:row("P(L2 | H1)", HL / H1, "%", "P(HL)/P(H1)", "LgH")
    end
    if L1 > 0 then
      out:row("P(H2 | L1)", LH / L1, "%", "P(LH)/P(L1)", "HgL")
      out:row("P(L2 | L1)", LL / L1, "%", "P(LL)/P(L1) = " .. P(LL) .. "/" .. P(L1), "LgL")
    end
  end
  table.insert(TYPES, {
    name = "Probabilities over two years", group = 4, solve = solveProb,
    desc = "joint (path) probabilities, chance of year 1, and 'given year 1' conditional probabilities",
    looks = "joint probability | given | conditional | chance of high demand in year 1 | path not given",
    slots = {
      S("mode", "you are given", "choice", MODES13, 1),
      S("HH", "P(high, high) (%)", "pct"), S("HL", "P(high, low) (%)", "pct"),
      S("LH", "P(low, high) (%)", "pct"), S("LL", "P(low, low) (%)", "pct"),
      S("H1", "P(H1) high in year 1 (%)", "pct"),
      S("HgH", "P(H2 | H1) stays high (%)", "pct"), S("LgH", "or P(L2 | H1) (%)", "pct"),
      S("LgL", "P(L2 | L1) stays low (%)", "pct"), S("HgL", "or P(H2 | L1) (%)", "pct"),
    },
    vis = function(Sm)
      if Sm.mode.opts[Sm.mode.idx] == MODES13[1] then return { "mode", "HH", "HL", "LH", "LL" } end
      return { "mode", "H1", "HgH", "LgH", "LgL", "HgL" }
    end,
    hints = {
      mode = "path table given, or year 1 + 'after a high year...'",
      HH = "joint: high in year 1 AND high in year 2; ONE may be blank",
      H1 = "'demand is high in year 1 with probability 55%'",
      HgH = "'after a high year, stays high with 60%'",
      LgL = "'after a low year, stays low with 80%'",
    },
    formula = { "P(A and B) = P(A)*P(B | A)", "P(B | A) = (P(A and B))/(P(A))" },
    words = "multiply along a path for a joint probability; divide a path by its year-1 chance for a 'given' probability",
    letters = { "H1, L1 = high / low demand in year 1", "H2, L2 = high / low in year 2", "P(HL) = high then low (a path)",
                "P(L2 | L1) = chance of low in year 2 GIVEN low in year 1" },
    acronyms = { "| = 'given'" },
    notes = [[PROBABILITIES OVER TWO YEARS

HOW TO USE
Given a table of the 4 paths? Type
them (one may be blank: it is the rest).
Given year 1 and 'after a high year...'?
Switch the mode and type those.

FORMULAS
$$P(H_1) = P(HH) + P(HL)
$$P(L_2 | L_1) = (P(LL))/(P(L_1))
$$P(L_1 and L_2) = P(L_1)*P(L_2 | L_1)
The 4 paths always add to 100%.]],
    assume = STEPS_COMMON .. [[
THIS TYPE:
1. list the 4 paths HH, HL, LH, LL
2. the missing path = 1 - the others
3. year 1 = the two paths that start
   with it
4. given = path / its year-1 chance

TRAPS
- P(L2 | L1) is NOT P(LL)
- after a HIGH year 'stays high' is
  P(H2 | H1); 'falls' is 1 minus it]],
    worked = [[## Chance of high in year 1
Q: HH 20%, HL 25%, LL 25%, LH not given.
ENTER: HH 20 | HL 25 | LL 25
missing LH = 1 - 0.7 = 30%
P(H1) = 0.2 + 0.25 = 45%

## Joint probability
Q: P(H1) 55%; after high stays high 60%;
after low stays low 80%. P(L1 and L2)?
ENTER: mode year 1 + given | H1 55 |
HgH 60 | LgL 80
P(LL) = 0.45 x 0.8 = 36%

## Conditional
Q: HH 30%, HL 5%, LL 30%. P(L2 | L1)?
ENTER: HH 30 | HL 5 | LL 30
LH = 35%; P(L1) = 65%
P(L2 | L1) = 0.30/0.65 = 46.15%]],
  })
end
