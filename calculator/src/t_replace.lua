----------------------------------------------------------------------
-- TYPE 22 (v23): REPLACEMENT DECISION - the whole incremental cash-flow
-- table (Weeks 4-5): year 0 (new cost, the old asset's after-tax sale,
-- NWC), each year's savings, incremental depreciation, EBIT, tax,
-- NOPAT, + dep, the one-off cost avoided, the final year's asset sales
-- and NWC back, then NPV, IRR and how to lay it out in Excel.
----------------------------------------------------------------------
do
  local function col(t) return string.char(66 + t) end    -- Excel: year 0 in column B, year t in the next ones
  local function sp(x) return (x < 0) and ("(" .. P(x) .. ")") or P(x) end   -- a negative number in brackets

  -- the year-by-year numbers, shared with the Excel tables page (t_excel.lua) so both show the same cash flows.
  -- V: n, r, Tc, newC, lifeN (or depR: straight line at a rate, or diminishing value when V.dv), saleN, bvO, saleO,
  -- depO, endO, save, rev, opex (running costs, new), opexO (running costs of the old one, saved), g (growth of
  -- revenue and costs from year 2), avoid, avYr, nwc, nwcY. Returns R, or nil + "need"/"err" + the message.
  XLCALC = XLCALC or {}
  function XLCALC.replace(V)
    local Tc = V.Tc or 0
    local life = V.lifeN
    if not life and V.depR and not V.dv then life = (V.depR > 0) and (1 / V.depR) or 0 end
    if not (V.newC and V.n and (life or (V.dv and V.depR))) then
      return nil, "need", "the new asset's cost, its depreciation life and the project life (years)"
    end
    local n = math.floor(V.n + 1e-9)
    if n < 1 or n > 20 then return nil, "err", "the project life must be 1 to 20 years" end
    if (life and life <= 0) or (V.dv and V.depR <= 0) then return nil, "err", "the depreciation life must be above 0" end
    local R = { n = n, Tc = Tc, r = V.r, newC = V.newC, life = life, dv = V.dv, depR = V.depR,
                depN = life and (V.newC / life) or nil, bvO = V.bvO, depO = V.depO or 0, saleO = V.saleO or 0,
                nwc = V.nwc or 0, nwcY = V.nwcY or 0, save = V.save or 0, rev = V.rev or 0, opex = V.opex or 0,
                opexO = V.opexO or 0, g = V.g or 0, saleN = V.saleN or 0, endO = V.endO or 0,
                hasOld = (V.saleO or V.bvO) and true or false }
    R.taxO = 0
    if R.hasOld then R.taxO = ((R.bvO or 0) - R.saleO) * Tc end
    R.cf0 = -R.newC + R.saleO + R.taxO - R.nwc
    R.cfs = { [0] = R.cf0 }
    R.rows = {}
    local bvN, remO = R.newC, R.bvO
    for t = 1, n do
      local dN
      if R.dv then dN = bvN * R.depR else dN = math.min(R.depN, bvN) end
      bvN = bvN - dN
      if bvN < 0.005 then bvN = 0 end
      local dO = R.depO
      if remO then dO = math.min(R.depO, remO); remO = remO - dO; if remO < 0.005 then remO = 0 end end
      local inc = dN - dO
      local av = (V.avoid and V.avYr and math.abs(t - V.avYr) < 1e-9) and V.avoid or 0
      local gf = (1 + R.g) ^ (t - 1)
      local y = { dN = dN, dO = dO, inc = inc, av = av, gf = gf, bvN = bvN, bvO = remO or 0,
                  revT = R.rev * gf, saveT = R.save * gf, opexT = R.opex * gf, opexOT = R.opexO * gf }
      y.sv = y.saveT + y.revT + y.opexOT - y.opexT + av
      y.ebit = y.sv - inc
      y.tax = Tc * y.ebit
      y.nopat = y.ebit - y.tax
      y.ocf = y.nopat + inc
      y.extra = 0
      if t < n and R.nwcY ~= 0 then y.extra = -R.nwcY end
      if t == n then
        R.bvNend, R.bvOend = bvN, remO or 0
        R.atsN = R.saleN - (R.saleN - R.bvNend) * Tc
        R.atsO = R.endO - (R.endO - R.bvOend) * Tc
        R.rec = R.nwc + R.nwcY * (n - 1)
        y.extra = y.extra + R.atsN - R.atsO + R.rec
      end
      y.fcf = y.ocf + y.extra
      R.cfs[t] = y.fcf
      R.rows[t] = y
    end
    return R
  end

  local function solveReplace(V, out)
    local R, how, msg = XLCALC.replace(V)
    if not R then
      if how == "need" then out:need(msg) else out:err(msg) end
      return
    end
    local Tc, r, n = R.Tc, R.r, R.n
    local newC, depN = R.newC, R.depN
    local bvO, depO, saleO = R.bvO, R.depO, R.saleO
    local nwc, nwcY = R.nwc, R.nwcY
    local save, rev = R.save, R.rev
    local saleN = R.saleN

    -- year 0
    out:head("YEAR 0 (today)")
    out:row("new asset", -newC, "$", "its cost (with shipping and installation): an outflow", "c0new")
    local taxO = R.taxO
    if R.hasOld then
      local bv = bvO or 0
      out:row("old asset sold now", saleO, "$", "its sale price today", "saleO")
      out:row((math.abs(taxO) < 0.005) and "tax on the old sale (none: sold at book value)" or
              ((taxO > 0) and "tax saved on the old sale (a loss)" or "tax paid on the old sale (a gain)"), taxO, "$",
              "(BV - sale)*Tc = (" .. P(bv) .. " - " .. P(saleO) .. ")*" .. P(Tc) ..
              ((taxO >= 0) and "  (sold below book value)" or "  (sold above book value)"), "taxO")
      out:row("after-tax sale of the old asset", saleO + taxO, "$", "SV - (SV - BV)*tc = " .. P(saleO) .. " - (" .. P(saleO) ..
              " - " .. P(bv) .. ")*" .. P(Tc), "atsO0")
      out:uses("salv"); out:off("oldsale")
      if not bvO then out:note("old book value blank = 0: the whole sale price is taxed") end
    end
    if nwc ~= 0 then out:row("NWC put in", -nwc, "$", "working capital needed at the start (back at the end)", "nwc0") end
    local cf0 = R.cf0
    out:row("CF0", cf0, "$", "-new cost + old sale + tax effect - NWC = -" .. P(newC) .. " + " .. P(saleO) .. " + " ..
            sp(taxO) .. " - " .. P(nwc), "CF0")

    -- depreciation
    out:head("DEPRECIATION (straight line to 0)")
    out:row("new asset: dep a year", depN, "$", "cost/life = " .. P(newC) .. "/" .. P(R.life) .. "  (years 1 to " .. P(R.life) .. ")", "depN")
    if depO > 0 then
      out:row("old asset: dep a year (lost if you replace)", depO, "$",
              bvO and ("until its book value " .. P(bvO) .. " is used up: " .. P(bvO / depO) .. " more years")
                  or "every year of the project (no old book value given)", "depO")
    end
    out:note("incremental dep = new dep - old dep; it turns NEGATIVE once the new asset is fully depreciated while the old one would still be")
    out:off("sldep"); out:off("incdep")

    -- each year
    local cfs = R.cfs
    local rowsT = R.rows
    local atsN, atsO, rec, bvNend, bvOend, endO = R.atsN, R.atsO, R.rec, R.bvNend, R.bvOend, R.endO
    for t = 1, n do
      local y = rowsT[t]
      out.vals["dep" .. t], out.vals["EBIT" .. t], out.vals["tax" .. t] = y.inc, y.ebit, y.tax
      out.vals["NOPAT" .. t], out.vals["OCF" .. t] = y.nopat, y.ocf
    end

    -- the final year's extras
    out:head("FINAL YEAR (" .. n .. ") EXTRAS")
    out:row("new asset: book value at the end", bvNend, "$", "cost - dep so far = " .. P(newC) .. " - " .. P(newC - bvNend), "bvNend")
    out:row("new asset: after-tax sale", atsN, "$", "SV - (SV - BV)*tc = " .. P(saleN) .. " - (" .. P(saleN) .. " - " .. P(bvNend) .. ")*" .. P(Tc), "atsN")
    if V.endO or (bvO and bvOend > 0) then
      out:row("old asset: after-tax value forgone", -atsO, "$", "you no longer sell the old one then: -(SV - (SV - BV)*tc) = -(" ..
              P(endO) .. " - (" .. P(endO) .. " - " .. P(bvOend) .. ")*" .. P(Tc) .. ")", "atsO")
    end
    if rec ~= 0 then
      out:row("NWC recovered", rec, "$", (nwcY ~= 0) and ("start " .. P(nwc) .. " + " .. P(nwcY) .. " x " .. (n - 1) .. " years") or "all of it comes back, untaxed", "nwcRec")
    end
    out:uses("salv"); out:off("terminal")

    -- each year's cash flow
    out:head("CASH FLOW EACH YEAR (T = the table)")
    out:tcols({ { k = "save", u = "$0" }, { k = "dep", u = "$0" }, { k = "EBIT", u = "$0" }, { k = "tax", u = "$0" },
                { k = "OCF", u = "$0" }, { k = "FCF", u = "$0" } })
    for t = 1, n do
      local y = rowsT[t]
      out:row("FCF year " .. t, y.fcf, "$", "EBIT = " .. P(save + rev) .. ((y.av ~= 0) and (" + " .. P(y.av) .. " avoided") or "") ..
              " - dep " .. sp(y.inc) .. " = " .. P(y.ebit), "FCF" .. t)
      out:add("frm", "tax " .. P(y.tax) .. " -> NOPAT " .. P(y.nopat) .. "; + dep " .. sp(y.inc) .. " = OCF " .. P(y.ocf))
      if t == n then
        out:add("frm", "+ new sale " .. P(atsN) .. " - old forgone " .. P(atsO) .. " + NWC back " .. P(rec))
      elseif nwcY ~= 0 then
        out:add("frm", "- " .. P(nwcY) .. " more NWC")
      end
    end
    out:trow("t=0", { nil, nil, nil, nil, nil, cf0 }, { "", "", "", "", "", "CF0 = -new cost + old after-tax sale - NWC = " .. P(cf0) })
    for t = 1, n do
      local y = rowsT[t]
      out:trow("t=" .. t, { y.sv, y.inc, y.ebit, y.tax, y.ocf, y.fcf },
        { "savings " .. P(save) .. " + extra revenue " .. P(rev) .. " + avoided cost " .. P(y.av),
          "new " .. P(y.dN) .. " - old " .. P(y.dO) .. " = " .. P(y.inc),
          "savings - dep = " .. P(y.sv) .. " - " .. sp(y.inc),
          "Tc*EBIT = " .. P(Tc) .. "*" .. P(y.ebit),
          "NOPAT " .. P(y.nopat) .. " + dep " .. sp(y.inc),
          "OCF " .. P(y.ocf) .. ((y.extra ~= 0) and (" + " .. P(y.extra) .. " (NWC, sales at the end)") or "") })
    end
    out:uses("fcf")

    -- decision
    out:head("DECISION")
    local npv
    if r then
      npv = npvAt(r, cfs, n)
      out:row("NPV", npv, "$", "CF0 + FCF1/(1 + r) + ... + FCF" .. n .. "/(1 + r)^" .. n .. " at r = " .. P(r), "NPV")
      out:add(npv >= 0 and "ok" or "bad", (npv >= 0) and "NPV >= 0: REPLACE the old asset" or "NPV < 0: KEEP the old asset")
      out:uses("npv")
    else
      out:need("r (the cost of capital) for the NPV")
    end
    local irr = irrOf(cfs, n)
    if irr then
      out:row("IRR", irr, "%", "the rate where NPV = 0 (found by search)", "IRR")
      out:uses("irr")
      if r then out:add(irr >= r and "ok" or "bad", (irr >= r) and "IRR >= r: replace by the IRR rule too" or "IRR < r: keep by the IRR rule too") end
    end
    out:note("sunk costs (money already spent) and interest stay OUT of these cash flows")

    -- Excel and the TI: the table row by row (labels in column A, year 0 in B, year t in the next columns)
    local last = col(n)
    local xr, rn = {}, 1
    local function add(label, how) rn = rn + 1; xr[#xr + 1] = "row " .. rn .. " " .. label .. ": " .. how; return rn end
    local rFirst0 = add("new asset cost", "B" .. (rn + 1) .. " = -" .. P(newC))
    if V.saleO or bvO then
      add("old asset sold now", "B" .. (rn + 1) .. " = " .. P(saleO))
      add("tax on that sale", "B" .. (rn + 1) .. " = (" .. P(bvO or 0) .. "-" .. P(saleO) .. ")*" .. P(Tc) .. "  (+ saved on a loss, - paid on a gain)")
    end
    if nwc ~= 0 then add("NWC put in", "B" .. (rn + 1) .. " = -" .. P(nwc)) end
    local rLast0 = rn
    local rOp1 = rn + 1
    if save ~= 0 then add("cost saving", "C to " .. last .. " = " .. P(save)) end
    if rev ~= 0 then add("extra revenue", "C to " .. last .. " = " .. P(rev)) end
    if V.avoid and V.avYr and V.avYr >= 1 and V.avYr <= n then
      add("one-off cost avoided", "only " .. col(math.floor(V.avYr + 1e-9)) .. " (year " .. P(V.avYr) .. ") = " .. P(V.avoid))
    end
    -- incremental depreciation as a minus, in runs of equal years
    local segs, t0 = {}, 1
    for t = 1, n do
      if t == n or math.abs(rowsT[t + 1].inc - rowsT[t].inc) > 0.005 then
        segs[#segs + 1] = ((t0 == t) and col(t) or (col(t0) .. " to " .. col(t))) .. " = " .. P(-rowsT[t].inc)
        t0 = t + 1
      end
    end
    local rDep = add("depreciation, new - old, as a MINUS", table.concat(segs, "; "))
    local rE = add("EBIT", "C" .. (rn + 1) .. " =SUM(C" .. rOp1 .. ":C" .. rDep .. "), copy right")
    local rT = add("tax", "C" .. (rn + 1) .. " =-C" .. rE .. "*" .. P(Tc) .. ", copy right")
    local rNp = add("NOPAT", "C" .. (rn + 1) .. " =C" .. rE .. "+C" .. rT .. ", copy right")
    add("add back depreciation", "C" .. (rn + 1) .. " =-C" .. rDep .. ", copy right")
    if nwcY ~= 0 and n > 1 then add("more NWC", "C to " .. col(n - 1) .. " = -" .. P(nwcY)) end
    if saleN ~= 0 then
      add("new asset sold at the end", "only " .. last .. " = " .. P(saleN))
      add("tax on that sale", "only " .. last .. " =-(" .. P(saleN) .. "-" .. P(bvNend) .. ")*" .. P(Tc))
    end
    if math.abs(atsO) > 0.005 then add("old asset's end value given up", "only " .. last .. " = " .. P(-atsO)) end
    if rec ~= 0 then add("NWC back", "only " .. last .. " = " .. P(rec)) end
    local rEnd = rn
    local rF = add("FCF, year 0", "B" .. (rn + 1) .. " =SUM(B" .. rFirst0 .. ":B" .. rLast0 .. ")")
    xr[#xr + 1] = "row " .. rF .. " FCF, years 1 on: C" .. rF .. " =SUM(C" .. rNp .. ":C" .. rEnd .. "), copy right"
    out:head("EXCEL: YEARS ACROSS THE COLUMNS")
    out:note("column A: the labels. Row 1: 'Year', then 0 in B1, 1 in C1 ... " .. n .. " in " .. last .. "1")
    for _, ln in ipairs(xr) do out:xl(ln) end
    if r then out:xl("NPV: =NPV(" .. P(r) .. ",C" .. rF .. ":" .. last .. rF .. ")+B" .. rF) end
    out:xl("IRR: =IRR(B" .. rF .. ":" .. last .. rF .. ")")
    out:note("NPV() starts at year 1, so add year 0 (B" .. rF .. ") outside it")
    out:note("signs: costs, tax paid and money put in are MINUS; savings, sales and tax saved are PLUS")
    out:note("check: each FCF cell should equal the FCF lines above (T shows the table)")
    if r then
      local t2 = {}
      for t = 1, n do t2[#t2 + 1] = P(cfs[t]) end
      out:head("ON YOUR TI-NSPIRE (Calculator page)")
      out:xl("npv(" .. P(r * 100) .. ", " .. P(cf0) .. ", {" .. table.concat(t2, ", ") .. "})")
      out:xl("irr(" .. P(cf0) .. ", {" .. table.concat(t2, ", ") .. "})")
      out:note("each is ONE line on the TI (spaces are fine)")
    end
    if irr then out:interp(function(rr) return npvAt(rr, cfs, n) end, irr, "", "NPV", "npv") end
  end

  table.insert(TYPES, {
    name = "Replacement: the whole cash flow table", group = 3, solve = solveReplace,
    desc = "replace an old machine: year 0, each year's savings, extra depreciation, tax, FCF, the final year, NPV, IRR, Excel",
    looks = "replace the old machine | replacement | old machine | new machine | old equipment | new equipment | existing plant | new plant | incremental depreciation | book value of the old | sold for | cost savings | avoided repair | cash flow table",
    slots = {
      S("n", "project life (years)", "num"),
      S("r", "r cost of capital (%)", "pct"),
      S("Tc", "Tc tax rate (%)", "pct"),
      S("newC", "NEW: cost + shipping ($)", "money"),
      S("lifeN", "NEW: dep life (years, to 0)", "num"),
      S("saleN", "NEW: sale value at the end ($)", "money"),
      S("bvO", "OLD: book value now ($)", "money"),
      S("saleO", "OLD: sells now for ($)", "money"),
      S("depO", "OLD: dep a year ($)", "money"),
      S("endO", "OLD: value at the end ($)", "money"),
      S("save", "cost saving a year ($)", "money"),
      S("rev", "extra revenue a year ($)", "money"),
      S("avoid", "one-off cost avoided ($)", "money"),
      S("avYr", "... in year", "num"),
      S("nwc", "NWC at the start ($)", "money"),
      S("nwcY", "more NWC each year ($)", "money"),
    },
    hints = {
      n = "how many years you compare (the old asset's remaining life)",
      r = "cost of capital / required return, e.g. 12",
      Tc = "company tax rate, e.g. 30",
      newC = "price + shipping + installation of the NEW asset",
      lifeN = "years the new asset is depreciated over (straight line to 0)",
      saleN = "what the new asset sells for at the END (blank = 0)",
      bvO = "the OLD asset's book value today",
      saleO = "what the OLD asset sells for today",
      depO = "the old asset's depreciation a year (you lose it if you replace)",
      endO = "what the old one would sell for at the end (blank = 0)",
      save = "yearly operating cost saving, before tax",
      rev = "extra revenue a year, before tax (blank = 0)",
      avoid = "a one-off cost you avoid by replacing, e.g. a repair (expensed)",
      avYr = "the year of that avoided cost, e.g. 3",
      nwc = "working capital needed at the start (back at the end)",
      nwcY = "extra working capital in each year 1 to n-1 (back at the end)",
    },
    formula = { "OCF = (S - dDep)*(1 - T_c) + dDep   dDep = Dep_new - Dep_old", "CF_0 = -cost + SV - (SV - BV)*T_c - NWC" },
    words = "each year: tax the savings after the EXTRA depreciation (new minus old), then add that depreciation back; year 0 and the last year add the asset sales and the NWC",
    letters = { "S = savings (+ extra revenue, + a one-off cost avoided) each year", "dDep = incremental depreciation = new dep - old dep",
                "Tc = company tax rate", "SV = sale value; BV = book value (cost - dep so far)",
                "NOPAT = EBIT - tax; OCF = NOPAT + dep", "NWC = net working capital (put in at the start, back at the end)",
                "r = cost of capital; NPV, IRR as in type 7" },
    acronyms = { "EBIT = earnings before interest and tax", "NOPAT = net operating profit after tax",
                 "OCF = operating cash flow; FCF = free cash flow", "NWC = net working capital", "NPV = net present value; IRR = internal rate of return" },
    notes = [[REPLACEMENT: THE WHOLE TABLE

HOW TO USE
Years of the project, r and Tc.
NEW asset: cost (with shipping and
installation), depreciation life, and
what it sells for at the end.
OLD asset: book value now, sale price
now, depreciation a year, value at the
end (blank = 0).
Savings a year (and extra revenue),
a one-off cost avoided (and its year),
NWC at the start (and more each year).

THE TABLE
year 0: -new cost + old sale - tax on
its gain (or + tax saved on a loss)
- NWC
each year: savings - (new dep - old
dep) = EBIT; - tax = NOPAT; + dep = OCF
last year: + new asset's after-tax sale
- old asset's after-tax value forgone
+ NWC back

WHY INCREMENTAL
Replacing gives the new dep but LOSES
the old dep: only the difference
changes the tax. Once the new asset is
fully depreciated and the old one would
still be, the difference is NEGATIVE.

EXCEL: STEP BY STEP (years across)
1. Column A: one label per row.
2. Row 1: 'Year'. 0 in B1, then 1, 2,
   ... up to the last year.
3. Year 0 (column B), one row each:
   new asset cost (MINUS), old asset
   sold now (PLUS), tax on that sale
   =(book value - sale price)*Tc
   (PLUS on a loss), NWC put in (MINUS).
4. Years 1 on (column C onwards), one
   row each: cost saving, extra
   revenue, one-off cost avoided (only
   in its year).
5. Depreciation row: new dep - old dep,
   typed as a MINUS. It turns PLUS once
   the new asset is fully depreciated.
6. EBIT: =SUM(saving row:dep row).
   Copy it right.
7. Tax: =-EBIT cell*Tc. NOPAT: =EBIT
   cell + tax cell.
8. Add back depreciation: =- the dep
   cell (so it is PLUS again).
9. Last year only: new asset sale, its
   tax =-(sale - book value)*Tc, any
   old end value given up, NWC back.
10. FCF row: year 0 =SUM(the year 0
   rows); years 1 on =SUM(NOPAT row
   down to the last row). Copy right.
11. =NPV(r, year 1 FCF:last FCF)
   + year 0 FCF. =IRR(year 0:last).
12. Solve here and press T: each FCF
   should match your Excel row.]],
    assume = STEPS_COMMON .. [[
THIS TYPE:
1. year 0: new cost, old asset's after-
   tax sale, NWC
2. incremental dep = new - old
3. each year: (savings - dep)(1 - Tc)
   + dep
4. last year: after-tax sale of the new
   asset, minus the old one's forgone,
   + NWC back
5. NPV at r (and IRR)

TRAPS
- the old asset sold above book value:
  tax on the GAIN only
- sold below book value: a tax SAVING
- the old dep is lost: use new - old
- sunk training, loan interest -> OUT]],
    worked = [[## Course: IFC replaces its unit
Q: old unit BV 250,000, dep 50,000 a
year, sells now for 275,000. New unit
750,000 (with shipping), 5 years to 0,
salvage 75,000. Revenue +100,000 and
costs -20,000 a year. NWC 40,000 now
+ 10,000 in years 1-4. Tax 30%, 12%.
ENTER: n 5 | r 12 | Tc 30 | NEW
750000 | life 5 | sale 75000 | OLD BV
250000 | sells 275000 | dep 50000 |
saving 20000 | revenue 100000 |
NWC 40000 | more NWC 10000
CF0 = -750,000 + 275,000 - 7,500
- 40,000 = -522,500
years 1-4: (120,000 - 100,000) x 0.7
+ 100,000 - 10,000 = 104,000
year 5: 114,000 + 52,500 + 80,000
= 246,500
NPV = -$66,744.95 -> keep the old unit

## Course: Nutson Bolz (lecture)
Q: old machine BV 10,000, dep 2,000,
sells now 15,000. New 55,000, 5 years
to 0, salvage 10,000. Savings 21,000.
NWC 5,000. Tax 47%, 20%.
ENTER: n 5 | r 20 | Tc 47 | NEW 55000
| life 5 | sale 10000 | OLD BV 10000 |
sells 15000 | dep 2000 | saving 21000
| NWC 5000
CF0 = -55,000 + 15,000 - 2,350 - 5,000
= -47,350
OCF = (21,000 - 9,000) x 0.53 + 9,000
= 15,360; year 5 = 25,660
NPV = $2,725.14 -> replace]],
  })
end
