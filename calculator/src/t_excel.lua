----------------------------------------------------------------------
-- TYPE 24: EXCEL TABLES (Part C) - the answer laid out the way
-- it is typed into Excel. Cash-flow tables: ITEMS DOWN the rows, YEARS
-- ACROSS the columns (Year 0 in column B), every cell with its Excel
-- formula. Decision trees: one row per branch (probability, cash flow,
-- when, PV, probability x PV), then the decision.
-- The numbers come from the same code as type 22 (XLCALC.replace) and
-- type 12 (XLCALC.wait, XLCALC.outcomes), so the pages agree.
-- One local table (the main chunk is near Lua 5.1's 200-local limit).
----------------------------------------------------------------------
do
  local X = {}
  X.MODES = { "cash-flow table: a replacement", "cash-flow table: a new project",
              "decision tree: act now or wait", "decision tree: chance and decision nodes" }
  X.DEPM = { "straight line (prime cost)", "diminishing value" }

  function X.N(x) return sig(x, 10) end                       -- a number inside an Excel formula
  function X.L(t) return string.char(66 + t) end              -- year t -> its column (year 0 = B)
  function X.sp(x) return (x < 0) and ("(" .. P(x) .. ")") or P(x) end

  -- a pattern: "@" = this column, "<" = the column before it
  function X.cellOf(pat, t) return (pat:gsub("@", X.L(t)):gsub("<", (t > 0) and X.L(t - 1) or "B")) end

  -- the Excel lines of one table row: equal patterns side by side become "..., copy right to J7"
  function X.rowLines(rw, rn, n)
    local parts, t = {}, 0
    while t <= n do
      local pat = rw.pat[t]
      if pat then
        local t2 = t
        while t2 < n and rw.pat[t2 + 1] == pat do t2 = t2 + 1 end
        local s = X.L(t) .. rn .. " " .. X.cellOf(pat, t)
        if t2 > t then s = s .. ", copy right to " .. X.L(t2) .. rn end
        parts[#parts + 1] = s
        t = t2 + 1
      else
        t = t + 1
      end
    end
    return parts
  end

  ------------------------------------------------------------------ the empty replacement layout (no numbers)
  -- columns B..E = year 0, year 1, year 2 (and on), the last year n; "@" = this column, as in X.cellOf
  X.LAYOUT = {
    { "REPLACE (new)", "block 1: the firm WITH the new machine" },
    { "buy new", "year 0: the new machine's cost, a MINUS", { [0] = "=-cost" } },
    { "sell old now", "year 0: the old machine's price today, a PLUS", { [0] = "=old price now" } },
    { "tax on old sale", "(book value - sale) x Tc: below book value = a refund (PLUS)", { [0] = "=(old BV-B4)*Tc" } },
    { "run costs (new)", "every year, a MINUS (a revenue or saving row goes here too, PLUS)", { "=-new costs", "=-new costs", "=-new costs" } },
    { "dep (new)", "straight line: cost / life (0 once it is used up)", { "=cost/life", "=cost/life", "=cost/life" } },
    { "EBIT (new)", "the cash items above minus depreciation", { "=@6-@7", "=@6-@7", "=@6-@7" }, true },
    { "tax (new)", "-EBIT x Tc (a loss: a tax SAVING, plus)", { "=-@8*Tc", "=-@8*Tc", "=-@8*Tc" } },
    { "after tax (new)", "EBIT + tax", { "=@8+@9", "=@8+@9", "=@8+@9" } },
    { "+ dep (new)", "depreciation is not cash: add it back", { "=@7", "=@7", "=@7" } },
    { "sale of new (end)", "last year only: what it sells for", { [3] = "=sale price" } },
    { "tax on new sale", "last year only: -(sale - book value) x Tc", { [3] = "=-(E12-BV)*Tc" } },
    { "FCF if REPLACE", "add the cash rows of block 1 (a blank cell = 0)", { [0] = "=@3+@4+@5+@10+@11+@12+@13", "=@3+@4+@5+@10+@11+@12+@13", "=@3+@4+@5+@10+@11+@12+@13", "=@3+@4+@5+@10+@11+@12+@13" }, true },
    { "KEEP (old)", "block 2: the firm WITH the old machine" },
    { "run costs (old)", "every year, a MINUS", { "=-old costs", "=-old costs", "=-old costs" } },
    { "overhaul (old)", "only in its year, only if you KEEP, a MINUS", { [2] = "=-overhaul" } },
    { "dep (old)", "the old machine's dep a year (0 once used up)", { "=old dep", "=old dep", "=old dep" } },
    { "EBIT (old)", "the cash items above minus depreciation", { "=@16+@17-@18", "=@16+@17-@18", "=@16+@17-@18" }, true },
    { "tax (old)", "-EBIT x Tc", { "=-@19*Tc", "=-@19*Tc", "=-@19*Tc" } },
    { "after tax (old)", "EBIT + tax", { "=@19+@20", "=@19+@20", "=@19+@20" } },
    { "+ dep (old)", "add the depreciation back", { "=@18", "=@18", "=@18" } },
    { "old sold at end", "last year only: the old machine's end value", { [3] = "=old end value" } },
    { "tax old end sale", "last year only: -(end value - book value) x Tc", { [3] = "=-(E23-BV)*Tc" } },
    { "FCF if KEEP", "add the cash rows of block 2", { [0] = "=@21+@22+@23+@24", "=@21+@22+@23+@24", "=@21+@22+@23+@24", "=@21+@22+@23+@24" }, true },
    { "NEW - OLD", "block 3: what replacing ADDS each year" },
    { "FCF (new - old)", "FCF if REPLACE - FCF if KEEP", { [0] = "=@14-@25", "=@14-@25", "=@14-@25", "=@14-@25" }, true },
    { "PV of FCF", "a check: FCF/(1 + r)^year (row 1 holds the years)", { [0] = "=@27/(1+r)^@1", "=@27/(1+r)^@1", "=@27/(1+r)^@1", "=@27/(1+r)^@1" } },
    { "NPV", "NPV() starts at year 1: add year 0 outside it", { [0] = "=NPV(r,C27:E27)+B27" }, true },
  }
  function X.layout(out)
    local T = { cols = {}, rows = {}, wide = true, xl = true, lw = 92, cw = 104, cw0 = 56, showF = true,
                hint = "THE LAYOUT (no numbers) | arrows: move | ESC back" }
    for _, k in ipairs({ "Year 0", "Year 1", "Year 2 ...", "Year n" }) do T.cols[#T.cols + 1] = { k = k, u = "$0" } end
    out:head("THE LAYOUT (no numbers yet): press T to see it")
    out:note("column A the labels, row 1 the years (0 in B1, 1 in C1 ...); type the numbers above to fill it in")
    for i, L in ipairs(X.LAYOUT) do
      local rn = i + 1
      local rw = { label = L[1], name = L[2], em = L[4] or (L[3] == nil), vals = {}, how = {}, xf = {} }
      local P3 = L[3] or {}
      for t = 0, 3 do
        if P3[t] then
          rw.xf[t + 1] = P3[t]:gsub("@", X.L(t))
          rw.how[t + 1] = "Excel " .. X.L(t) .. rn .. ": " .. rw.xf[t + 1] .. "\n" .. L[2]
        else
          rw.how[t + 1] = L[2]
        end
      end
      local cl = {}   -- the Excel lines: year 0, then year 1 copied right (or the one year it is in)
      if P3[0] then cl[#cl + 1] = "B" .. rn .. " " .. rw.xf[1] end
      if P3[1] then cl[#cl + 1] = "C" .. rn .. " " .. rw.xf[2] .. (P3[3] and ", copy right to the last year" or "")
      else
        for t = 2, 3 do if P3[t] then cl[#cl + 1] = X.L(t) .. rn .. " " .. rw.xf[t + 1] .. ((t == 3) and " (the last year)" or " (its year)") end end
      end
      T.rows[#T.rows + 1] = rw
      if not L[3] then out:xl("row " .. rn .. " " .. L[1] .. "  (a heading: no numbers)")
      else out:xl("row " .. rn .. " " .. L[1] .. ": " .. table.concat(cl, "; ")) end
    end
    out:note("signs: costs, tax paid and the cost of the new machine are MINUS; sales, savings and a tax refund are PLUS")
    out.tbl = T
  end

  ------------------------------------------------------------------ cash-flow tables (kinds 1 and 2)
  function X.cashTable(V, out, kind)
    local W = {}
    for k, v in pairs(V) do W[k] = v end
    W.opex = (kind == 1) and V.opexN or V.opex
    if kind == 2 then W.bvO, W.saleO, W.depO, W.endO, W.save, W.opexO, W.avoid, W.avYr = nil, nil, nil, nil, nil, nil, nil, nil end
    W.dv = (V.depM == X.DEPM[2]) or nil
    if W.dv and not V.depR then out:need("the diminishing-value rate (%) of the new asset"); return end
    local R, how, msg = XLCALC.replace(W)
    if not R then
      if how == "need" then
        if kind == 1 then X.layout(out) end   -- nothing typed yet: the empty layout, formulas in words
        out:need((kind == 1) and msg or "the asset's cost (CapEx), its depreciation life (or rate) and the project life (years)")
      else out:err(msg) end
      return
    end
    local n, Tc, r, Y = R.n, R.Tc, R.r, R.rows
    local N = X.N

    -- which rows the table has (an item the question does not give is left out)
    local specs, rowOf = {}, {}
    local function spec(id, label, name, cell, em) specs[#specs + 1] = { id = id, label = label, name = name, cell = cell, em = em } end
    local function ref(id) return "@" .. rowOf[id] end
    local anyAv = false
    for t = 1, n do if Y[t].av ~= 0 then anyAv = true end end
    local gtxt = (R.g ~= 0) and (", growing " .. pct(R.g) .. "% a year from year 2") or ""
    -- a yearly amount (growing at g): year 1 typed, later years =the year before*(1 + g)
    local function yearly(id, base, sign, words)
      return function(t)
        if t == 0 then return nil end
        local v = sign * base * Y[t].gf
        local pat = (t > 1 and R.g ~= 0) and ("=<" .. rowOf[id] .. "*" .. N(1 + R.g)) or ("=" .. N(sign * base))
        return v, pat, ((words ~= "") and (words .. " ") or "") .. P(base) .. " a year" .. gtxt
      end
    end
    local function depNcell(t)   -- the new asset's depreciation in year t
      if t == 0 then return nil end
      local d = Y[t].dN
      if R.dv then
        return d, (t == 1) and ("=" .. N(R.newC) .. "*" .. N(R.depR)) or ("=" .. N(R.newC) .. "*(1-" .. N(R.depR) .. ")^" .. (t - 1) .. "*" .. N(R.depR)),
               "diminishing value: rate x book value at the start of the year = " .. P(R.depR) .. " x " .. P(d / R.depR)
      end
      if math.abs(d - R.depN) < 1e-9 then
        return d, "=" .. N(R.newC) .. "/" .. N(R.life), "straight line: cost/life = " .. P(R.newC) .. "/" .. P(R.life)
      end
      return d, "=" .. N(d), (d == 0) and "the new machine is fully depreciated: no more depreciation, 0" or ("only what is left of its book value: " .. P(d))
    end
    local function saleNspecs()   -- the new asset sold at the end, and the tax on it
      spec("saleN", "sale of new (end)", "the new machine sold at the end", function(t)
        if t ~= n then return nil end
        return R.saleN, "=" .. N(R.saleN), "what it sells for in the last year: " .. P(R.saleN)
      end)
      spec("taxN", "tax on new sale", "tax on the new machine's sale: -(sale - book value) x Tc", function(t)
        if t ~= n then return nil end
        return -(R.saleN - R.bvNend) * Tc, "=-(" .. ref("saleN") .. "-" .. N(R.bvNend) .. ")*" .. N(Tc),
               "-(sale - book value) x Tc = -(" .. P(R.saleN) .. " - " .. P(R.bvNend) .. ") x " .. P(Tc) ..
               ((R.saleN > R.bvNend) and ": tax on the gain" or ((R.saleN < R.bvNend) and ": a loss, tax refund" or ""))
      end)
    end
    local function nwcSpec()   -- working capital: put in (MINUS), more each year, all back at the end
      spec("nwc", "NWC change", "change in NWC: put in (MINUS), back at the end (PLUS)", function(t)
        if t == 0 then
          if R.nwc == 0 then return nil end
          return -R.nwc, "=-" .. N(R.nwc), "working capital put in at the start, a MINUS: -" .. P(R.nwc)
        end
        if t < n then
          if R.nwcY == 0 then return nil end
          return -R.nwcY, "=-" .. N(R.nwcY), "more working capital this year, a MINUS: -" .. P(R.nwcY)
        end
        return R.rec, "=-SUM(B" .. rowOf.nwc .. ":<" .. rowOf.nwc .. ")", "all the working capital comes back at the end (no tax): " .. P(R.rec)
      end)
    end
    local fN, fO = {}, {}   -- a replacement: FCF with the NEW machine, FCF with the OLD one (kind 1)
    if kind == 1 then
      -- NEW and OLD apart: block 1 the firm WITH the new machine, block 2 WITH the old one, block 3 the difference
      local function head(id, label, name) spec(id, label, name, function() return nil end, true) end
      local function once(at, v, pat, words)   -- a value in one year only (pat may be a function: rows are numbered later)
        return function(t) if t ~= at then return nil end return v, (type(pat) == "function") and pat() or pat, words end
      end
      local function block(sfx, items, depId, depOf)   -- EBIT, tax, after-tax profit and dep back of one block
        spec("ebit" .. sfx, "EBIT (" .. sfx .. ")", "EBIT with the " .. sfx .. " machine: income - costs - depreciation", function(t)
          if t == 0 then return nil end
          local terms, v = {}, 0
          for _, it in ipairs(items) do terms[#terms + 1] = "@" .. rowOf[it[1]]; v = v + it[2](t) end
          v = v - depOf(t)
          return v, "=" .. table.concat(terms, "+"):gsub("%+%-", "-") .. "-" .. ref(depId), "the cash items above, minus the depreciation = " .. P(v)
        end, true)
        spec("tax" .. sfx, "tax (" .. sfx .. ")", "tax = -EBIT x Tc (a loss: a tax SAVING, plus)", function(t)
          if t == 0 then return nil end
          local e = 0
          for _, it in ipairs(items) do e = e + it[2](t) end
          e = e - depOf(t)
          return -e * Tc, "=-" .. ref("ebit" .. sfx) .. "*" .. N(Tc), "-EBIT x Tc = -(" .. P(e) .. ") x " .. P(Tc) ..
                 ((e < 0) and ": a loss, so tax is SAVED (plus)" or "")
        end)
        spec("atp" .. sfx, "after tax (" .. sfx .. ")", "after-tax profit = EBIT + tax", function(t)
          if t == 0 then return nil end
          local e = 0
          for _, it in ipairs(items) do e = e + it[2](t) end
          e = e - depOf(t)
          return e * (1 - Tc), "=" .. ref("ebit" .. sfx) .. "+" .. ref("tax" .. sfx), "EBIT + tax = " .. P(e) .. " + " .. X.sp(-e * Tc)
        end)
        spec("add" .. sfx, "+ dep (" .. sfx .. ")", "+ depreciation added back (not cash)", function(t)
          if t == 0 then return nil end
          return depOf(t), "=" .. ref(depId), "depreciation is not a cash flow: add it back, " .. P(depOf(t))
        end)
      end
      -- block 1: REPLACE (the new machine)
      head("hN", "REPLACE (new)", "block 1: the firm WITH the new machine")
      spec("buy", "buy new", "buy the new machine today (MINUS)", once(0, -R.newC, "=-" .. N(R.newC), "its cost today, a MINUS: -" .. P(R.newC)))
      if R.hasOld then
        spec("saleO", "sell old now", "sell the old machine today (PLUS)", once(0, R.saleO, "=" .. N(R.saleO), "the old machine's price today: " .. P(R.saleO)))
        spec("taxO", "tax on old sale", "tax on the old sale: refund on a loss, tax on a gain", once(0, R.taxO,
             function() return "=(" .. N(R.bvO or 0) .. "-" .. ref("saleO") .. ")*" .. N(Tc) end, "(book value - sale) x Tc = (" .. P(R.bvO or 0) .. " - " .. P(R.saleO) ..
             ") x " .. P(Tc) .. ((R.taxO > 0) and ": sold BELOW book value, a refund (PLUS)" or ((R.taxO < 0) and ": sold ABOVE book value, tax (MINUS)" or ""))))
      end
      local itN = {}
      if R.rev ~= 0 then spec("rev", "extra revenue", "extra revenue with the new machine", yearly("rev", R.rev, 1, "")); itN[#itN + 1] = { "rev", function(t) return Y[t].revT end } end
      if R.save ~= 0 then spec("save", "cost saving", "cost saving with the new machine (before tax)", yearly("save", R.save, 1, "")); itN[#itN + 1] = { "save", function(t) return Y[t].saveT end } end
      if R.opex ~= 0 then spec("opex", "run costs (new)", "the new machine's running costs (MINUS)", yearly("opex", R.opex, -1, "a MINUS,")); itN[#itN + 1] = { "opex", function(t) return -Y[t].opexT end } end
      spec("depN", "dep (new)", "depreciation of the new machine", depNcell)
      block("new", itN, "depN", function(t) return Y[t].dN end)
      if R.nwc ~= 0 or R.nwcY ~= 0 then nwcSpec() end
      if R.saleN ~= 0 or R.bvNend > 0 then saleNspecs() end
      spec("fN", "FCF if REPLACE", "FCF with the new machine", function(t)
        local items = { "buy", "saleO", "taxO", "atpnew", "addnew", "nwc", "saleN", "taxN" }
        local v, terms = 0, {}
        for _, id in ipairs(items) do
          if rowOf[id] then   -- the same formula every year (a blank cell counts as 0), so it copies right
            terms[#terms + 1] = "@" .. rowOf[id]
            v = v + (specs[rowOf[id] - 1].cell(t) or 0)
          end
        end
        fN[t] = v
        return v, "=" .. ((#terms > 0) and table.concat(terms, "+") or "0"), "the cash rows of block 1 added up"
      end, true)
      -- block 2: KEEP (the old machine)
      head("hO", "KEEP (old)", "block 2: the firm WITH the old machine")
      local itO = {}
      if R.opexO ~= 0 then spec("opexO", "run costs (old)", "the old machine's running costs (MINUS)", yearly("opexO", R.opexO, -1, "a MINUS,")); itO[#itO + 1] = { "opexO", function(t) return -Y[t].opexOT end } end
      if anyAv then
        spec("avoid", "overhaul (old)", "a one-off cost only the old machine needs (MINUS)", function(t)
          if t == 0 or Y[t].av == 0 then return nil end
          return -Y[t].av, "=-" .. N(Y[t].av), "only if you KEEP the old machine: a MINUS in year " .. t
        end); itO[#itO + 1] = { "avoid", function(t) return -Y[t].av end }
      end
      spec("depO", "dep (old)", "depreciation of the old machine", function(t)
        if t == 0 then return nil end
        return Y[t].dO, "=" .. N(Y[t].dO), (Y[t].dO == 0) and "fully depreciated: 0" or ("the old machine's dep this year: " .. P(Y[t].dO))
      end)
      block("old", itO, "depO", function(t) return Y[t].dO end)
      if R.endO ~= 0 or R.bvOend > 0 then
        spec("endO", "old sold at end", "the old machine sold at the end (PLUS)", once(n, R.endO, "=" .. N(R.endO), "its value at the end: " .. P(R.endO)))
        spec("taxE", "tax old end sale", "-(end value - book value) x Tc", once(n, -(R.endO - R.bvOend) * Tc,
             function() return "=-(" .. ref("endO") .. "-" .. N(R.bvOend) .. ")*" .. N(Tc) end, "-(" .. P(R.endO) .. " - " .. P(R.bvOend) .. ") x " .. P(Tc)))
      end
      spec("fO", "FCF if KEEP", "FCF with the old machine", function(t)
        local v, terms = 0, {}
        for _, id in ipairs({ "atpold", "addold", "endO", "taxE" }) do
          if rowOf[id] then   -- the same formula every year (a blank cell counts as 0), so it copies right
            terms[#terms + 1] = "@" .. rowOf[id]
            v = v + (specs[rowOf[id] - 1].cell(t) or 0)
          end
        end
        fO[t] = v
        return v, "=" .. ((#terms > 0) and table.concat(terms, "+") or "0"), "the cash rows of block 2 added up"
      end, true)
      -- block 3: the difference
      head("hD", "NEW - OLD", "block 3: what replacing ADDS each year")
      spec("FCF", "FCF (new - old)", "incremental FCF = FCF if REPLACE - FCF if KEEP", function(t)
        return R.cfs[t], "=" .. ref("fN") .. "-" .. ref("fO"), "replace - keep = " .. P(fN[t] or 0) .. " - " .. X.sp(fO[t] or 0)
      end, true)
    else
    local incomes = {}
    if kind == 2 or R.rev ~= 0 then
      spec("rev", (kind == 1) and "extra revenue" or "revenue", (kind == 1) and "extra revenue" or "revenue (sales)",
           yearly("rev", R.rev, 1, "")); incomes[#incomes + 1] = "rev"
    end
    if kind == 1 and (R.save ~= 0 or (R.rev == 0 and R.opexO == 0 and R.opex == 0)) then
      spec("save", "cost saving", "cost saving (before tax)", yearly("save", R.save, 1, "")); incomes[#incomes + 1] = "save"
    end
    if kind == 1 and R.opexO ~= 0 then
      spec("opexO", "old costs saved", "the old machine's running costs (saved)", yearly("opexO", R.opexO, 1, "no longer paid:"))
      incomes[#incomes + 1] = "opexO"
    end
    if anyAv then
      spec("avoid", "cost avoided", "one-off cost avoided (a saving)", function(t)
        if t == 0 or Y[t].av == 0 then return nil end
        return Y[t].av, "=" .. N(Y[t].av), "the old machine would need this in year " .. t .. ": replacing avoids it, a saving"
      end); incomes[#incomes + 1] = "avoid"
    end
    if kind == 2 or R.opex ~= 0 then
      spec("opex", (kind == 1) and "- new run costs" or "- operating costs", (kind == 1) and "the new machine's running costs (MINUS)" or "operating costs (MINUS)",
           yearly("opex", R.opex, -1, "a MINUS,")); incomes[#incomes + 1] = "opex"
    end
    spec("depN", (kind == 1) and "new dep" or "depreciation", (kind == 1) and "depreciation of the new machine" or "depreciation", depNcell)
    if kind == 1 and R.depO > 0 then
      spec("depO", "old dep given up", "the old machine's depreciation (lost if you replace)", function(t)
        if t == 0 then return nil end
        local d = Y[t].dO
        return d, "=" .. N(d), (d == R.depO) and ("the old machine's dep a year: " .. P(d) .. " (you lose it)") or
               ((d == 0) and "the old machine would be fully depreciated by now: 0" or ("only what was left of its book value: " .. P(d)))
      end)
    end
    if kind == 1 then
      spec("inc", "incremental dep", "incremental depreciation (new - old)", function(t)
        if t == 0 then return nil end
        local y = Y[t]
        return y.inc, (R.depO > 0) and ("=" .. ref("depN") .. "-" .. ref("depO")) or ("=" .. ref("depN")),
               "new dep - old dep = " .. P(y.dN) .. " - " .. P(y.dO) .. ((y.inc < 0) and "  (NEGATIVE: the new one is used up)" or "")
      end)
    end
    local depId = (kind == 1) and "inc" or "depN"
    spec("EBIT", "EBIT", "EBIT (profit before tax)", function(t)
      if t == 0 then return nil end
      local y = Y[t]
      local a, b = rowOf[incomes[1]], rowOf[incomes[#incomes]]
      local sum = (a == b) and ("@" .. a) or ("SUM(@" .. a .. ":@" .. b .. ")")
      return y.ebit, "=" .. sum .. "-" .. ref(depId), "the items above, minus the " .. ((kind == 1) and "incremental " or "") ..
             "depreciation = " .. P(y.sv) .. " - " .. X.sp(y.inc)
    end, true)
    spec("tax", "tax (EBIT x Tc)", "tax = EBIT x Tc", function(t)
      if t == 0 then return nil end
      return Y[t].tax, "=" .. ref("EBIT") .. "*" .. N(Tc), "EBIT x Tc = " .. P(Y[t].ebit) .. " x " .. P(Tc) ..
             ((Y[t].tax < 0) and "  (a loss: the tax saved elsewhere in the firm)" or "")
    end)
    spec("atp", "after-tax profit", "after-tax profit = EBIT - tax", function(t)
      if t == 0 then return nil end
      return Y[t].nopat, "=" .. ref("EBIT") .. "-" .. ref("tax"), "EBIT - tax = " .. P(Y[t].ebit) .. " - " .. X.sp(Y[t].tax)
    end)
    spec("add", "+ dep (add back)", "+ depreciation added back (not cash)", function(t)
      if t == 0 then return nil end
      return Y[t].inc, "=" .. ref(depId), "depreciation is not a cash flow: add the same number back, " .. X.sp(Y[t].inc)
    end)
    spec("capex", "CapEx", "CapEx: the new asset's cost (MINUS)", function(t)
      if t ~= 0 then return nil end
      return -R.newC, "=-" .. N(R.newC), "the cost today (with shipping and installation), a MINUS: -" .. P(R.newC)
    end)
    if kind == 1 and R.hasOld then
      spec("saleO", "sale of old (now)", "the old machine sold now", function(t)
        if t ~= 0 then return nil end
        return R.saleO, "=" .. N(R.saleO), "the old machine's sale price today, a PLUS: " .. P(R.saleO)
      end)
      spec("taxO", "tax on old sale", "tax on the old sale: refund on a loss, tax on a gain", function(t)
        if t ~= 0 then return nil end
        local bv = R.bvO or 0
        return R.taxO, "=(" .. N(bv) .. "-" .. ref("saleO") .. ")*" .. N(Tc), "(book value - sale) x Tc = (" .. P(bv) .. " - " .. P(R.saleO) ..
               ") x " .. P(Tc) .. ((R.taxO > 0) and ": sold BELOW book value, a tax refund (PLUS)" or
               ((R.taxO < 0) and ": sold ABOVE book value, tax on the gain (MINUS)" or ": sold at book value, no tax"))
      end)
    end
    if R.saleN ~= 0 or R.bvNend > 0 then saleNspecs() end
    if kind == 1 and (R.endO ~= 0 or R.bvOend > 0) then
      spec("endO", "old end value lost", "the old machine's end value, given up (MINUS)", function(t)
        if t ~= n then return nil end
        return -R.endO, "=-" .. N(R.endO), "you would have sold the old machine for this at the end, given up: -" .. P(R.endO)
      end)
      spec("taxE", "tax on it (lost)", "the tax on that sale, not paid any more", function(t)
        if t ~= n then return nil end
        return (R.endO - R.bvOend) * Tc, "=(" .. N(R.endO) .. "-" .. N(R.bvOend) .. ")*" .. N(Tc),
               "(end value - its book value) x Tc = (" .. P(R.endO) .. " - " .. P(R.bvOend) .. ") x " .. P(Tc)
      end)
    end
    if R.nwc ~= 0 or R.nwcY ~= 0 then nwcSpec() end
    end
    local lastItem = specs[#specs].id
    if kind ~= 1 then
      spec("FCF", "FCF", "FCF (free cash flow)", function(t)
        return R.cfs[t], "=SUM(" .. ref("atp") .. ":" .. ref(lastItem) .. ")",
               (t == 0) and "year 0: CapEx + the old sale and its tax + NWC" or "after-tax profit + dep + CapEx, sales and NWC in this year"
      end, true)
    end
    local npv
    if r then
      spec("PV", "PV of FCF", "PV of each FCF (a check)", function(t)
        return R.cfs[t] / (1 + r) ^ t, "=" .. ref("FCF") .. "/(1+" .. N(r) .. ")^@1", "FCF/(1 + r)^year = " .. P(R.cfs[t]) .. "/" .. P(1 + r) .. "^" .. t
      end)
      npv = npvAt(r, R.cfs, n)
      spec("NPV", "NPV", "NPV = NPV(r, year 1 to year n FCF) + year 0 FCF", function(t)
        if t ~= 0 then return nil end
        return npv, "=NPV(" .. N(r) .. ",C" .. rowOf.FCF .. ":" .. X.L(n) .. rowOf.FCF .. ")+B" .. rowOf.FCF,
               "Excel's NPV() starts at year 1, so year 0 is added outside it (= the sum of the PV row)"
      end, true)
    end

    -- the table: Excel row = position + 1 (row 1 holds the years)
    for i, s in ipairs(specs) do rowOf[s.id] = i + 1 end
    local T = { cols = {}, rows = {}, wide = true, xl = true, lw = 92, cw = 56, hint = "arrows: move | F: formulas / numbers | ESC back" }
    for t = 0, n do T.cols[#T.cols + 1] = { k = "Year " .. t, u = "$0" } end
    out.tbl = T
    for i, s in ipairs(specs) do
      local rw = { label = s.label, name = s.name, em = s.em, vals = {}, how = {}, xf = {}, pat = {} }
      for t = 0, n do
        local v, pat, words = s.cell(t)
        if v ~= nil then
          rw.vals[t + 1], rw.pat[t] = v, pat
          rw.xf[t + 1] = X.cellOf(pat, t)
          local txt = s.name .. ": " .. words
          if #txt > 104 then txt = words end      -- the bottom of the table shows about two lines
          rw.how[t + 1] = "Excel " .. X.L(t) .. (i + 1) .. ": " .. rw.xf[t + 1] .. "\n" .. txt
          out.vals[s.id .. t] = v
        end
      end
      T.rows[#T.rows + 1] = rw
    end
    if kind == 1 then   -- the differences (new - old) year by year, as on the replacement page (type 22)
      for t = 1, n do local y = Y[t]; out.vals["inc" .. t], out.vals["EBIT" .. t], out.vals["tax" .. t], out.vals["atp" .. t] = y.inc, y.ebit, y.tax, y.nopat end
    end
    -- each FCF cell adds up its column's items (after-tax profit down to the last item): the numbers it adds
    local fcfRow, fcfSum = T.rows[rowOf.FCF - 1], {}
    for t = 0, n do
      if kind == 1 then   -- replace - keep
        fcfSum[t] = "FCF if REPLACE - FCF if KEEP = " .. X.sp(fN[t] or 0) .. " - " .. X.sp(fO[t] or 0)
        if fcfRow.how[t + 1] then fcfRow.how[t + 1] = "Excel " .. X.L(t) .. rowOf.FCF .. ": " .. fcfRow.xf[t + 1] .. "\n" .. fcfSum[t] end
      else
        local parts = {}
        for i = rowOf.atp - 1, rowOf[lastItem] - 1 do
          local v = T.rows[i].vals[t + 1]
          if v ~= nil then parts[#parts + 1] = X.sp(v) end
        end
        fcfSum[t] = "the items above added up = " .. ((#parts > 0) and table.concat(parts, " + ") or "0")
        if fcfRow.how[t + 1] then
          fcfRow.how[t + 1] = "Excel " .. X.L(t) .. rowOf.FCF .. ": " .. fcfRow.xf[t + 1] .. "\nFCF: " .. fcfSum[t]
        end
      end
    end

    -- the answer page: the FCF row first, then the NPV
    out:head("FCF EACH YEAR (the Excel FCF row " .. rowOf.FCF .. ")")
    for t = 0, n do
      out:row("Year " .. t .. " FCF (" .. X.L(t) .. rowOf.FCF .. ")", R.cfs[t], "$", X.cellOf(fcfRow.pat[t] or "", t) ..
              ": " .. fcfSum[t], "FCF" .. t)
    end
    out:note("each FCF cell: " .. X.L(1) .. rowOf.FCF .. " " .. X.cellOf(T.rows[rowOf.FCF - 1].pat[1] or "", 1) .. ", copy right (and left to B)")
    out.vals.CF0 = R.cfs[0]
    if r then
      out:row("NPV", npv, "$", "=NPV(" .. N(r) .. ",C" .. rowOf.FCF .. ":" .. X.L(n) .. rowOf.FCF .. ")+B" .. rowOf.FCF, "NPV")
      out:add(npv >= 0 and "ok" or "bad", (kind == 1) and ((npv >= 0) and "NPV >= 0: REPLACE the old machine" or "NPV < 0: KEEP the old machine")
                                       or ((npv >= 0) and "NPV >= 0: ACCEPT the project" or "NPV < 0: REJECT the project"))
      out:uses("npv")
    else
      out:need("r (the cost of capital) for the NPV")
    end
    out:add("xl", "press T for the full Excel table (items down, years across)")
    local irr = irrOf(R.cfs, n)
    if irr then out:row("IRR", irr, "%", "=IRR(B" .. rowOf.FCF .. ":" .. X.L(n) .. rowOf.FCF .. ")", "IRR"); out:uses("irr") end

    out:head("EXCEL: TYPE IT IN THIS ORDER")
    out:note("column A: the labels below. Row 1: 'Year', then 0 in B1, 1 in C1 ... " .. n .. " in " .. X.L(n) .. "1 (or =B1+1, copy right)")
    if kind == 1 then out:note("block 1 = the firm WITH the new machine, block 2 = WITH the old one, block 3 = the difference") end
    for i, rw in ipairs(T.rows) do
      local cl = X.rowLines(rw, i + 1, n)
      if #cl == 0 then out:xl("row " .. (i + 1) .. " " .. rw.label .. "  (a heading: no numbers)")
      else out:xl("row " .. (i + 1) .. " " .. rw.label .. ": " .. table.concat(cl, "; ")) end
    end
    out:note("signs: costs, tax paid, CapEx and NWC put in are MINUS; savings, sales, a tax refund and NWC back are PLUS")
    out:note("a blank cell counts as 0 in SUM(); NPV() starts at year 1, so year 0 is added outside it")

    -- the year-by-year detail, as on the replacement page
    out:head("YEAR BY YEAR")
    out:row("depreciation of the new asset, year 1", Y[1].dN, "$", R.dv and ("diminishing value: " .. P(R.depR) .. " x cost") or
            ("straight line: cost/life = " .. P(R.newC) .. "/" .. P(R.life)), "depN")
    if kind == 1 and R.hasOld then
      out:row("after-tax sale of the old machine", R.saleO + R.taxO, "$", "SV - (SV - BV)*tc = " .. P(R.saleO) .. " - (" .. P(R.saleO) .. " - " ..
              P(R.bvO or 0) .. ")*" .. P(Tc), "atsO0")
      out:uses("salv"); out:off("oldsale")
    end
    out:row("book value of the new asset at the end", R.bvNend, "$", "cost - all depreciation so far = " .. P(R.newC) .. " - " .. P(R.newC - R.bvNend), "bvNend")
    if R.saleN ~= 0 or R.bvNend > 0 then
      out:row("after-tax sale of the new asset", R.atsN, "$", "SV - (SV - BV)*tc = " .. P(R.saleN) .. " - (" .. P(R.saleN) .. " - " ..
              P(R.bvNend) .. ")*" .. P(Tc), "atsN")
      out:uses("salv"); out:off("bv")
    end
    out:off(R.dv and "dvdep" or "sldep")
    if kind == 1 then out:off("incdep") end
    out:off("terminal"); out:off("excelnpv")
    out:uses("fcf")
    out:note("sunk costs (money already spent) and interest stay OUT of the table")
  end

  ------------------------------------------------------------------ decision trees (kinds 3 and 4)
  -- columns: B probability, C cash flow, D when (years), E PV, F probability x PV
  function X.treeTable(out, rows, r)
    local T = { cols = { { k = "prob %", u = "%" }, { k = "cash", u = "$0" }, { k = "when yr", u = "" }, { k = "PV", u = "$0" },
                         { k = "p x PV", u = "$0" } }, rows = {}, wide = true, lw = 78, cw = 48,
                hint = "left/right: columns | up/down: branches | ESC back" }
    out.tbl = T
    local words = { "the branch's probability", "the cash flow at the end of the branch", "when it comes, in years",
                    "PV = cash flow/(1 + r)^years", "probability x PV" }
    for i, b in ipairs(rows) do
      local rn = i + 1
      local rw = { label = b.label, name = b.name or b.label, em = b.em, vals = {}, how = {}, xf = {} }
      if b.sum then
        rw.vals[5], rw.xf[5] = b.v, "=SUM(F" .. b.sum[1] .. ":F" .. b.sum[2] .. ")"
        local parts = {}   -- the numbers added up (the F cells of the rows above)
        for rr = b.sum[1], b.sum[2] do local a = T.rows[rr - 1]; if a and a.vals[5] then parts[#parts + 1] = X.sp(a.vals[5]) end end
        rw.how[5] = "Excel F" .. rn .. ": " .. rw.xf[5] .. "\n" .. b.words .. ": " .. table.concat(parts, " + ") .. " = " .. P(b.v)
      elseif b.diff then
        rw.vals[5], rw.xf[5] = b.v, "=F" .. b.diff[1] .. "-F" .. b.diff[2]
        local a1, a2 = T.rows[b.diff[1] - 1], T.rows[b.diff[2] - 1]
        rw.how[5] = "Excel F" .. rn .. ": " .. rw.xf[5] .. "\n" .. b.words .. ": " .. P(a1 and a1.vals[5] or 0) .. " - " .. X.sp(a2 and a2.vals[5] or 0) ..
                    " = " .. P(b.v)
      else
        local pv = b.cf / (1 + (r or 0)) ^ b.t
        rw.vals = { b.p, b.cf, b.t, pv, b.p * pv }
        rw.xf = { b.pf, b.cff, b.tf, "=C" .. rn .. "/(1+" .. X.N(r or 0) .. ")^D" .. rn, "=B" .. rn .. "*E" .. rn }
        local det = { pct(b.p) .. "%" .. (b.pw and (": " .. b.pw) or ""), P(b.cf) .. (b.cw and (": " .. b.cw) or ""), P(b.t) .. " years",
                      P(b.cf) .. "/" .. P(1 + (r or 0)) .. "^" .. P(b.t) .. " = " .. P(pv), P(b.p) .. " x " .. P(pv) .. " = " .. P(b.p * pv) }
        for c = 1, 5 do rw.how[c] = "Excel " .. string.char(65 + c) .. rn .. ": " .. rw.xf[c] .. "\n" .. words[c] .. ": " .. det[c] end
      end
      T.rows[#T.rows + 1] = rw
    end
    out:head("EXCEL: ONE ROW PER BRANCH")
    out:note("row 1: A1 branch, B1 probability, C1 cash flow, D1 when (years), E1 PV, F1 probability x PV")
    for i, rw in ipairs(T.rows) do
      local cells = {}
      for c = 1, 5 do if rw.xf[c] then cells[#cells + 1] = string.char(65 + c) .. (i + 1) .. " " .. rw.xf[c] end end
      out:xl("row " .. (i + 1) .. " " .. rw.label .. ": " .. table.concat(cells, ", "))
    end
    return T
  end

  -- act now or wait: the numbers from type 12 (XLCALC.wait)
  -- months AND years typed (the boxes keep what was typed for another kind): the months win, say so
  function X.timeCheck(V, out)
    if V.tm and V.t and math.abs(V.tm / 12 - V.t) > 1e-9 then
      out:add("bad", "CHECK: months (" .. P(V.tm) .. ") AND years (" .. P(V.t) .. ") are both typed: the months are used. Clear one (DEL).")
    end
  end
  function X.treeWait(V, out)
    X.timeCheck(V, out)
    local V2 = {}
    for k, v in pairs(V) do V2[k] = v end
    V2.r = V.ear or V.r
    local W, how, msg = XLCALC.wait(V2)
    if not W then
      if how == "need" then out:need(msg) else out:err(msg) end
      return
    end
    local tf = V.tm and ("=" .. X.N(V.tm) .. "/12") or ("=" .. X.N(W.t))
    local rows = {
      { label = "now: pay today", name = "act now: the cost, paid today", p = 1, pf = "=1", cf = -V.c0, cff = "=-" .. X.N(V.c0), t = 0, tf = "=0",
        cw = "the cost now (a MINUS)" },
      { label = "now: good", name = "act now: it goes well", p = W.p, pf = "=" .. X.N(W.p), cf = V.vg, cff = "=" .. X.N(V.vg), t = W.t, tf = tf,
        cw = "the value if it goes well" },
      { label = "now: bad", name = "act now: it goes badly", p = 1 - W.p, pf = "=1-B3", cf = W.vb, cff = "=" .. X.N(W.vb), t = W.t, tf = "=D3",
        pw = "1 - the good chance", cw = "the value if it goes badly" },
      { label = "NOW: NPV", name = "act now: NPV", sum = { 2, 4 }, v = W.npvNow, em = true,
        words = "the sum of probability x PV = expected value/(1 + r)^t - the cost now" },
      { label = "wait: good", name = "wait: it went well, so go ahead", p = W.p, pf = "=B3", cf = W.gw,
        cff = "=MAX(" .. X.N(V.vg) .. "-" .. X.N(V.cw) .. ",0)", t = W.t, tf = "=D3", cw = "value - the later cost (only if worth it)" },
      { label = "wait: bad", name = "wait: it went badly", p = 1 - W.p, pf = "=B4", cf = W.bw,
        cff = "=MAX(" .. X.N(W.vb) .. "-" .. X.N(V.cw) .. ",0)", t = W.t, tf = "=D3", cw = (W.bw > 0) and "still worth going ahead" or "walk away: pay nothing, get nothing" },
      { label = "WAIT: NPV", name = "wait: NPV", sum = { 6, 7 }, v = W.npvWait, em = true,
        words = "the sum of probability x PV (nothing is paid today)" },
      { label = "wait - now", name = "value of waiting = NPV wait - NPV now", diff = { 8, 5 }, v = W.npvWait - W.npvNow,
        words = "the option to wait is worth this (if positive)" },
    }
    local pw = V.tm and ("(" .. X.N(V.tm) .. "/12)") or X.N(W.t)
    out:head("DECISION TREE: ACT NOW OR WAIT")
    out:row("NPV act now", W.npvNow, "$", "=SUMPRODUCT(B3:B4,C3:C4)/(1+" .. X.N(W.r) .. ")^" .. pw .. "-" .. X.N(V.c0) .. "  (cell F5)", "npvNow")
    out:row("NPV wait", W.npvWait, "$", "=SUMPRODUCT(B6:B7,C6:C7)/(1+" .. X.N(W.r) .. ")^" .. pw .. "  (cell F8)", "npvWait")
    if W.npvWait > W.npvNow then
      out:add("ok", "choose WAIT: NPV " .. fmtU(W.npvWait, "$") .. " beats acting now (" .. fmtU(W.npvNow, "$") .. ")")
    else
      out:add("ok", "choose ACT NOW: NPV " .. fmtU(W.npvNow, "$") .. " beats waiting (" .. fmtU(W.npvWait, "$") .. ")")
    end
    out:row("value of waiting", W.npvWait - W.npvNow, "$", "NPV wait - NPV now (cell F9)", "optw")
    out:add("xl", "press T for the full Excel table (one row per branch)")
    out:row("expected value if you act now (at t)", W.E, "$", "=SUMPRODUCT(B3:B4,C3:C4)", "Enow")
    out:row("expected value if you wait (at t)", W.Ew, "$", "=SUMPRODUCT(B6:B7,C6:C7)", "Ewait")
    X.treeTable(out, rows, W.r)
    out:xl("PV with an EAR: =value/(1+" .. X.N(W.r) .. ")^" .. pw .. "  (" .. (V.tm and "months/12" or "years") .. ")")
    out:xl("the decision, in a cell: =IF(F8>F5,\"wait\",\"act now\")")
    out:note("assumed: the value AND the later cost both come at t = " .. P(W.t) .. " years (when you find out); the cost now is paid today")
    out:uses("pv", "npv"); out:off("waitnow"); out:off("wait")
  end

  -- a chance node (2-4 branches) at a date, with a choice today: go ahead (pay I) or the other choice
  function X.treeNodes(V, out)
    X.timeCheck(V, out)
    local vals, probs = XLCALC.outcomes(V, 4)
    if not vals then out:need(probs); return end
    local r = V.ear or V.r
    local t = V.tm and (V.tm / 12) or V.t or 0
    if t > 0 and not r then out:need("r (an EAR) to bring the node back to today"); return end
    local df = (1 + (r or 0)) ^ t
    local tf = V.tm and ("=" .. X.N(V.tm) .. "/12") or ("=" .. X.N(t))
    local rows = {}
    local I = V.I
    if I then
      rows[#rows + 1] = { label = "go: pay today", name = "go ahead: the cost today", p = 1, pf = "=1", cf = -I, cff = "=-" .. X.N(I), t = 0, tf = "=0",
                          cw = "the cost today (a MINUS)" }
    end
    local first = #rows + 2
    local E = 0
    for k, v in ipairs(vals) do
      E = E + probs[k] * v
      rows[#rows + 1] = { label = "branch " .. k, name = "outcome " .. k, p = probs[k], pf = "=" .. X.N(probs[k]), cf = v, cff = "=" .. X.N(v),
                          t = t, tf = (k == 1) and tf or ("=D" .. first), cw = "this outcome's value" }
    end
    local last = #rows + 1
    local go = E / df - (I or 0)
    rows[#rows + 1] = { label = I and "GO: NPV" or "NODE: PV", name = I and "go ahead: NPV" or "the chance node, valued today", sum = { 2, last }, v = go, em = true,
                        words = I and "the sum of probability x PV, minus the cost today" or "the sum of probability x PV" }
    local goRow = #rows + 1
    local alt = V.alt
    if I or alt then
      rows[#rows + 1] = { label = "other choice", name = "the other choice (today)", p = 1, pf = "=1", cf = alt or 0, cff = "=" .. X.N(alt or 0), t = 0, tf = "=0",
                          cw = alt and "its value today" or "do nothing: 0" }
    end
    out:head("DECISION TREE: CHANCE NODE" .. ((I or alt) and " + A CHOICE TODAY" or ""))
    out:row("expected value at the node", E, "$", "=SUMPRODUCT(B" .. first .. ":B" .. last .. ",C" .. first .. ":C" .. last .. ")", "E")
    if t > 0 then
      out:row("value today", E / df, "$", "E/(1 + r)^t = " .. P(E) .. "/" .. P(1 + r) .. "^" .. P(t), "pv"); out:uses("pv")
    end
    if I then out:row("NPV go ahead", go, "$", "value today - cost today (cell F" .. goRow .. ")", "npvGo") end
    if I or alt then
      local other = alt or 0
      out:row("the other choice", other, "$", alt and ("given: its value today = " .. P(alt)) or "do nothing: 0", "alt")
      if go >= other then
        out:add("ok", "choose GO AHEAD: value " .. fmtU(go, "$") .. " (other choice " .. fmtU(other, "$") .. ")")
      else
        out:add("ok", "choose THE OTHER CHOICE: value " .. fmtU(other, "$") .. " (go ahead " .. fmtU(go, "$") .. ")")
      end
      out:off("decnode")
    else
      out:add("ok", "the chance node is worth " .. fmtU(go, "$") .. " today")
    end
    out:add("xl", "press T for the full Excel table (one row per branch)")
    X.treeTable(out, rows, r)
    if t > 0 then out:xl("PV with an EAR: =value/(1+" .. X.N(r) .. ")^" .. (V.tm and ("(" .. X.N(V.tm) .. "/12)") or X.N(t))) end
    if I or alt then out:xl("the decision, in a cell: =IF(F" .. goRow .. ">=F" .. (goRow + 1) .. ",\"go ahead\",\"other choice\")") end
    out:off("ev")
  end

  function X.solve(V, out)
    local m = V.mode or X.MODES[1]
    if m == X.MODES[3] then X.treeWait(V, out)
    elseif m == X.MODES[4] then X.treeNodes(V, out)
    else X.cashTable(V, out, (m == X.MODES[2]) and 2 or 1) end
  end

  table.insert(TYPES, {
    name = "Excel tables (Part C)", solve = X.solve,
    modeHelp = {
      "an OLD machine is replaced by a NEW one: costs saved, the old sale now, its depreciation lost",
      "a NEW project, no old machine: revenue, costs, CapEx, depreciation, salvage, NWC",
      "'book / commit now, or wait until you know': a cost now vs a cost later, a chance it goes well",
      "outcomes with probabilities (a chance node) at a date; maybe a choice today (go ahead or not)",
    },
    desc = "the answer as the Excel layout: a year-by-year FCF table (items down, years across) or a decision tree, each cell's formula",
    looks = "excel | spreadsheet | table | year by year | cash flow table | fcf table | lay out | layout | replacement table | new project table | decision tree | tree | branches | act now or wait | book now or wait | part c",
    slots = {
      S("mode", "what to build", "choice", X.MODES, 1),
      S("n", "project life (years)", "num"),
      S("r", "r cost of capital (%)", "pct"),
      S("Tc", "Tc tax rate (%)", "pct"),
      S("newC", "NEW asset: cost today ($)", "money"),
      S("lifeN", "NEW: dep life (years, to 0)", "num"),
      S("depR", "NEW: or dep rate a year (%)", "pct"),
      S("depM", "NEW: dep method", "choice", X.DEPM, 1),
      S("saleN", "NEW: sale value at the end ($)", "money"),
      S("bvO", "OLD: book value now ($)", "money"),
      S("saleO", "OLD: sells now for ($)", "money"),
      S("depO", "OLD: dep a year ($)", "money"),
      S("endO", "OLD: value at the end ($)", "money"),
      S("save", "cost saving a year ($)", "money"),
      S("opexO", "OLD: running costs a year ($)", "money"),
      S("opexN", "NEW: running costs a year ($)", "money"),
      S("rev", "(extra) revenue a year ($)", "money"),
      S("opex", "operating costs a year ($)", "money"),
      S("g", "growth of revenue, costs (%)", "pct"),
      S("avoid", "OLD: one-off cost avoided ($)", "money"),
      S("avYr", "... in year", "num"),
      S("nwc", "NWC at the start ($)", "money"),
      S("nwcY", "more NWC each year ($)", "money"),
      S("c0", "cost if you act NOW ($)", "money"),
      S("vg", "value if it goes well ($)", "money"),
      S("pg", "chance it goes well (%)", "pct"),
      S("vb", "value if it goes badly ($)", "money"),
      S("cw", "cost if you WAIT ($)", "money"),
      S("v1", "branch 1: cash flow ($)", "money"), S("p1", "branch 1: probability (%)", "pct"),
      S("v2", "branch 2: cash flow ($)", "money"), S("p2", "branch 2: probability (%)", "pct"),
      S("v3", "branch 3: cash flow ($)", "money"), S("p3", "branch 3: probability (%)", "pct"),
      S("v4", "branch 4: cash flow ($)", "money"), S("p4", "branch 4: probability (%)", "pct"),
      S("I", "cost today to go ahead ($)", "money"),
      S("alt", "other choice: value today ($)", "money"),
      S("tm", "months until you know", "num"),
      S("t", "or: years until then", "num"),
      S("ear", "r yearly rate, an EAR (%)", "pct"),
    },
    vis = function(Sm)
      local m = Sm.mode.opts[Sm.mode.idx]
      if m == X.MODES[1] then
        return { "mode", "n", "r", "Tc", "newC", "lifeN", "depR", "depM", "saleN", "bvO", "saleO", "depO", "endO",
                 "save", "opexO", "opexN", "rev", "g", "avoid", "avYr", "nwc", "nwcY" }
      elseif m == X.MODES[2] then
        return { "mode", "n", "r", "Tc", "rev", "opex", "g", "newC", "lifeN", "depR", "depM", "saleN", "nwc", "nwcY" }
      elseif m == X.MODES[3] then
        return { "mode", "c0", "vg", "pg", "vb", "cw", "tm", "t", "ear" }
      end
      return { "mode", "v1", "p1", "v2", "p2", "v3", "p3", "v4", "p4", "tm", "t", "ear", "I", "alt" }
    end,
    hints = {
      mode = "the kind of Excel answer: a cash-flow table or a tree",
      n = "how many years the table runs (Year 0 to Year n)",
      r = "cost of capital / required return, e.g. 10 (for the NPV)",
      Tc = "company tax rate, e.g. 30",
      newC = "the NEW asset's cost today, with shipping and installation (CapEx)",
      lifeN = "years it is depreciated over, straight line to 0",
      depR = "or the depreciation rate a year, e.g. 20 (= 5 years)",
      depM = "prime cost = straight line; diminishing value needs the rate",
      saleN = "what the new asset sells for at the END (blank = 0)",
      bvO = "the OLD machine's book value today",
      saleO = "what the OLD machine sells for today",
      depO = "the old machine's depreciation a year (lost if you replace)",
      endO = "what the old one would have sold for at the end (blank = 0)",
      save = "yearly cost saving, before tax (or type the two running costs)",
      opexO = "what the OLD machine costs to run each year (saved)",
      opexN = "what the NEW machine costs to run each year",
      rev = "revenue a year (replacement: the EXTRA revenue), before tax",
      opex = "operating costs a year, before tax (not depreciation)",
      g = "revenue and costs grow this % a year from year 2 (blank = 0)",
      avoid = "a one-off cost only the OLD machine needs, e.g. an overhaul",
      avYr = "the year of that cost, e.g. 3",
      nwc = "working capital needed at the start (back at the end)",
      nwcY = "extra working capital in each year 1 to n-1 (back at the end)",
      c0 = "the cost if you commit now, paid today",
      vg = "what it is worth to you if things go well",
      pg = "the chance things go well, e.g. 70",
      vb = "what it is worth if things go badly (blank = 0)",
      cw = "the cost if you wait: paid later, only if you go ahead",
      v1 = "the cash flow at the end of this branch",
      p1 = "its probability, e.g. 60; ONE may be blank",
      I = "the cost today if you go ahead (blank = none)",
      alt = "the value of the other choice today (blank: do nothing = 0)",
      tm = "months until you know, e.g. 6 (the PV uses months/12)",
      t = "or the years until then, e.g. 1",
      ear = "the yearly rate, e.g. 8 (an EAR: PV = value/(1 + r)^years)",
    },
    formula = { "FCF = (Rev - Costs - Dep)*(1 - T_c) + Dep - CapEx - dNWC", "E[V] = sum p_k*V_k   PV = (E[V])/((1 + r)^t)" },
    words = "a cash-flow table has one row per item and one column per year; FCF = after-tax profit + depreciation - CapEx - NWC; a tree has one row per branch: probability x PV, added up",
    letters = { "Rev = revenue (or the cost saving) a year", "Costs = operating costs (not depreciation)",
                "Dep = depreciation (replacement: new - old)", "Tc = company tax rate", "CapEx = money spent on the asset (year 0)",
                "dNWC = change in net working capital", "SV, BV = sale value, book value", "p_k, V_k = a branch's probability and value",
                "r = cost of capital (an EAR for the trees); t = years (months/12)" },
    acronyms = { "FCF = free cash flow", "EBIT = earnings before interest and tax", "NWC = net working capital",
                 "NPV = net present value", "EAR = effective annual rate", "PV = present value" },
    notes = [[EXCEL TABLES (PART C)

HOW TO USE
Pick what to build (1-4), type what the
question gives, ENTER. The answer page
starts with the FCF of each year and the
NPV (or the tree's decision). T shows the
whole table as in Excel: left/right
moves along the years, up/down along
the rows, the bottom says the cell's
formula and why.

1 CASH-FLOW TABLE: A REPLACEMENT
NEW and OLD kept apart, in 3 blocks.
1. Column A: one label per row. Row 1:
   'Year', 0 in B1, then 1, 2, ... across.
2. Block 1 REPLACE (the NEW machine):
   year 0: buy new =-cost, sell old
   =its price, tax on it =(book value -
   sale)*Tc (a PLUS on a loss).
   Each year: run costs (new) as a
   MINUS (or the saving, or extra
   revenue), dep (new).
3. EBIT (new) =costs - dep. Tax =-EBIT
   *Tc (a loss: tax SAVED, a PLUS).
   After tax =EBIT + tax. + dep =the dep
   cell. Last year: sale of the new, its
   tax =-(sale - book value)*Tc. NWC
   here too.
4. FCF if REPLACE =the cash rows of
   block 1 added. Copy right.
5. Block 2 KEEP (the OLD machine): run
   costs (old) MINUS, the overhaul
   MINUS (its year only), dep (old);
   EBIT, tax, after tax, + dep as in 3;
   its end value and the tax on it.
6. FCF if KEEP =the cash rows of block
   2 added. Copy right.
7. Block 3: FCF (new - old) =FCF if
   REPLACE - FCF if KEEP. Copy right.
8. NPV =NPV(r, year 1:year n of row 7)
   + year 0.

2 CASH-FLOW TABLE: A NEW PROJECT
The same, without the old machine:
revenue, - operating costs, -
depreciation = EBIT; - tax; = after-tax
profit; + dep; - CapEx (year 0); + the
asset's after-tax sale (last year);
- NWC (back at the end); = FCF; NPV.
Growth g: year 1 typed, then =the year
before*(1+g), copy right.

3 DECISION TREE: ACT NOW OR WAIT
1. Row 1: branch | probability | cash
   flow | when (years) | PV | p x PV.
2. Act now: 'pay today' (-cost, when 0),
   'good' (value, chance p), 'bad'
   (value, 1 - p), when = months/12.
3. Wait: good = MAX(value - later cost,
   0); bad = MAX(bad value - later
   cost, 0). Nothing is paid today.
4. PV =cash flow/(1+EAR)^(months/12).
   p x PV =probability*PV.
5. Each choice: =SUM(its p x PV cells)
   or =SUMPRODUCT(prob, value)/(1+EAR)^
   (months/12) - cost now.
6. The decision in a cell: the higher
   NPV, and one line saying why.

4 DECISION TREE: CHANCE + DECISION
1. One row per branch: probability,
   cash flow, when, PV, p x PV.
2. The chance node =SUMPRODUCT(prob,
   value); today =that/(1+r)^t.
3. Go ahead: - the cost today. The
   other choice: its value today (or 0).
4. A decision node takes the BEST
   branch (never an average).

Matches home C 2 (the Excel guide); the
same numbers as pages 3 4 (replacement)
and 4 2 (trees).]],
    assume = STEPS_COMMON .. [[
THIS TYPE:
1. Year 0 ... Year n across, one row
   per item down, labels in column A
2. formulas that point at cells, not
   numbers from the calculator
3. replacement: block 1 REPLACE (new),
   block 2 KEEP (old), then FCF =
   REPLACE - KEEP
4. NPV =NPV(r, year 1:year n) + year 0
5. trees: one row per branch; PV, then
   probability x PV; the decision in
   words

TRAPS
- Excel's NPV() starts at year 1: add
  year 0 OUTSIDE it
- the old machine sold below book
  value: a tax REFUND (PLUS)
- keep NEW and OLD apart: each block
  works out its own EBIT, tax and FCF
- a cost only the old machine needs,
  avoided: a saving in ITS year
- an EAR with months: ^(months/12)
- waiting: the later cost is paid only
  if it goes well]],
    worked = [[## A replacement table (own numbers)
Q: new machine 120,000, 4 years to 0,
sells for 10,000 after 6 years. Old one:
book value 20,000, dep 4,000 a year,
sells now for 14,000. Saving 30,000 a
year. The old one needs a 15,000 repair
in year 2 (avoided). Tax 30%, r 10%,
6 years.
ENTER: 1 | n 6 | r 10 | Tc 30 | NEW
120000 | life 4 | sale 10000 | OLD BV
20000 | sells 14000 | dep 4000 | saving
30000 | avoided 15000 | year 2
Year 0: -120,000 + 14,000 + (20,000
- 14,000) x 0.3 = -104,200
Years 1-4: incremental dep 30,000 -
4,000 = 26,000; year 2 adds 15,000
Year 5: dep 0 - 4,000 = -4,000
(NEGATIVE): EBIT 34,000, tax 10,200
Year 6: both used up, dep 0; + 10,000
sale - 3,000 tax on it
FCF: -104,200 | 28,800 | 39,300 |
28,800 | 28,800 | 19,800 | 28,000
NPV = $23,869.32 -> replace

## A new project table (own numbers)
Q: revenue 80,000 a year, costs 30,000,
both +3% a year from year 2. Machine
100,000, 5 years to 0, sold for 8,000
at the end. NWC 10,000 now. Tax 30%,
r 12%, 5 years.
ENTER: 2 | n 5 | r 12 | Tc 30 |
revenue 80000 | costs 30000 | growth 3
| NEW 100000 | life 5 | sale 8000 |
NWC 10000
Year 0: -100,000 - 10,000 = -110,000
Year 1: (80,000 - 30,000 - 20,000) x
0.7 + 20,000 = 41,000
Year 5: EBIT 36,275.44 -> 25,392.81
+ 20,000 + 8,000 - 2,400 + 10,000
= 60,992.81
NPV = $53,557.03 -> accept

## Book now or wait (own numbers)
Q: book a venue now for 2,000; it is
worth 5,000 if the event goes ahead
(70%), 0 if not. Or wait 3 months and
book for 2,600 only if it goes ahead.
EAR 9%.
ENTER: 3 | c0 2000 | vg 5000 | pg 70 |
cw 2600 | months 3 | r 9
now: 0.7 x 5,000/1.09^(3/12) - 2,000
= $1,425.40
wait: 0.7 x 2,400/1.09^(3/12)
= $1,644.19 -> wait

## A chance node and a choice (own)
Q: pay 50,000 today; in one year the
product is worth 90,000 (30%), 60,000
(50%) or 20,000 (20%). Or sell the idea
now for 12,000. r 10%.
ENTER: 4 | v1 90000 | p1 30 | v2 60000
| p2 50 | v3 20000 | p3 20 | years 1 |
r 10 | cost today 50000 | other 12000
E = 27,000 + 30,000 + 4,000 = 61,000
today = 61,000/1.1 = 55,454.55
go ahead: 55,454.55 - 50,000 = 5,454.55
sell 12,000 > 5,454.55 -> sell]],
  })
  XL_TI = #TYPES          -- the type number (home X, Part B/C and the finder open it)
end
