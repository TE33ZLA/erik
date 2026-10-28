----------------------------------------------------------------------
-- EVERYTHING page, section 3 (Capital Budgeting): lines NOT on the formula sheet.
-- See every_core.lua for the shape of a pack. Own numbers. ASCII only.
-- A project's cash flows, step by step (the sheet's FCF line in pieces):
--   Rev = price*units, Dep = (Cost - SVd)/life - DepOld, EBIT = Rev - Costs - Dep,
--   Earn = EBIT*(1 - tc), OCF = Earn + Dep, dNWC from the NWC items,
--   CF = OCF - CapEx - dNWC + ATS (the year's total: also year 0 and the last year),
--   DTS = Dep*tc, TaxSale = (SV - BV)*tc.
----------------------------------------------------------------------
do
  local X = EVERY_SLOT
  -- the letters (a sheet box keeps the sheet's label: Rev, Costs, Dep, tc, CapEx, dNWC, ATS, SV, BV)
  local Rev = X("Rev", nil, "Rev revenue ($)", "money", "sales for the year (a cost saving counts too)", { weak = true })
  local Rev1 = X("Rev", nil, "Rev revenue ($)", "money", "sales for the year")
  local Costs = X("Costs", nil, "Costs operating costs ($)", "money", "costs for the year, NOT depreciation", { weak = true })
  local Dep = X("Dep", nil, "Dep depreciation ($)", "money", "depreciation for the year (blank = 0)", { weak = true })
  local Dep1 = X("Dep", nil, "Dep depreciation ($)", "money", "depreciation for the year")
  local tc = X("tc", nil, "tc tax rate (%)", "pct", "the company tax rate, e.g. 30")
  local price = X("price", nil, "price price per unit ($)", "money", "what ONE unit sells for")
  local units = X("units", nil, "units number sold a year", "num", "units sold; a rise of 20% on 5000: type 0.2*5000", { pos = true })
  local Cost = X("Cost", nil, "Cost asset cost + shipping + install ($)", "money", "price of the asset PLUS shipping and installation")
  local life = X("life", nil, "life years of depreciation", "num", "the years it is depreciated over (straight line)", { pos = true })
  local SVd = X("SVd", nil, "SVd value left after depreciation ($)", "money", "'to zero': leave blank. Not the sale price", { opt = true })
  local DepOld = X("DepOld", nil, "DepOld old asset's depreciation ($)", "money", "replacing an old asset: ITS yearly Dep (blank = 0)", { opt = true })
  local EBIT = X("EBIT", nil, "EBIT earnings before interest, tax ($)", "money", "EBIT = Rev - Costs - Dep (operating profit)")
  local Earn = X("Earn", nil, "Earn earnings after tax (net income) ($)", "money", "earnings after tax = EBIT x (1 - tc)")
  local OCF = X("OCF", nil, "OCF operating cash flow ($)", "money", "OCF = Earn + Dep (after tax)")
  local OCFw = X("OCF", nil, "OCF operating cash flow ($)", "money", "OCF = Earn + Dep (blank = 0: year 0)", { weak = true })
  local CF = X("CF", nil, "CF the year's total cash flow ($)", "money", "everything in that year: OCF - CapEx - dNWC + ATS")
  local CapEx = X("CapEx", nil, "CapEx capital spending ($)", "money", "money spent on assets this year (blank = 0)", { weak = true })
  local dNWC = X("dNWC", nil, "dNWC change in NWC ($)", "money", "this year's NWC minus last year's (blank = 0)", { weak = true })
  local dNWC1 = X("dNWC", nil, "dNWC change in NWC ($)", "money", "this year's NWC minus last year's")
  local ATS = X("ATS", nil, "ATS after-tax salvage ($)", "money", "cash kept from selling an asset (blank = 0)", { weak = true })
  local Inv1 = X("Inv1", nil, "Inv1 inventory this year ($)", "money", "inventory at the end of THIS year (blank = 0)", { opt = true })
  local AR1 = X("AR1", nil, "AR1 receivables this year ($)", "money", "A/R (money owed to us) THIS year (blank = 0)", { opt = true })
  local AP1 = X("AP1", nil, "AP1 payables this year ($)", "money", "A/P (money we owe) THIS year (blank = 0)", { opt = true })
  local Inv0 = X("Inv0", nil, "Inv0 inventory last year ($)", "money", "inventory LAST year (blank = 0)", { opt = true })
  local AR0 = X("AR0", nil, "AR0 receivables last year ($)", "money", "A/R LAST year (blank = 0)", { opt = true })
  local AP0 = X("AP0", nil, "AP0 payables last year ($)", "money", "A/P LAST year (blank = 0)", { opt = true })
  local DTS = X("DTS", nil, "DTS depreciation tax shield ($)", "money", "the tax saved by depreciation: Dep x tc")
  local TaxSale = X("TaxSale", nil, "TaxSale tax on the sale ($)", "money", "tax on the gain: (SV - BV) x tc. A loss: negative")
  local SV = X("SV", nil, "SV sale (salvage) price ($)", "money", "what the asset sells for")
  local BV = X("BV", nil, "BV book value ($)", "money", "cost minus the depreciation so far")

  local function z(v) return v or 0 end
  -- the straight-line Dep, written with only the parts that were typed
  local function depEq(x)
    local top = x.SVd and "(Cost - SVd)" or "Cost"
    return "Dep = " .. top .. "/life" .. (x.DepOld and " - DepOld" or "")
  end
  -- the NWC change, written with only the items that were typed
  local function nwcSide(x, a, b, c)
    local t = {}
    if x[a] then t[#t + 1] = a end
    if x[b] then t[#t + 1] = (#t > 0 and "+ " or "") .. b end
    if x[c] then t[#t + 1] = (#t > 0 and "- " or "-") .. c end
    local s = table.concat(t, " ")
    if #t > 1 then s = "(" .. s .. ")" end
    return s, #t
  end
  local function nwcEq(x)
    local now, n1 = nwcSide(x, "Inv1", "AR1", "AP1")
    local old, n0 = nwcSide(x, "Inv0", "AR0", "AP0")
    if n1 == 0 then now = "0" end
    if n0 == 0 then return "dNWC = " .. now end
    return "dNWC = " .. now .. " - " .. old
  end
  -- known boxes of section 3
  local function any(K, list) for _, k in ipairs(list) do if K["3:" .. k] ~= nil then return true end end return false end
  local function count(K, list) local c = 0; for _, k in ipairs(list) do if K["3:" .. k] ~= nil then c = c + 1 end end return c end
  local NWCK = { "Inv1", "AR1", "AP1", "Inv0", "AR0", "AP0" }
  local CFK = { "Rev", "Costs", "price", "units", "EBIT", "Earn", "OCF", "FCF", "CF", "CapEx", "dNWC" }

  local lines = {
    { id = "s3_rev", sec = 3, name = "Revenue from units", short = "Rev = price x units", eq = "Rev = price*units",
      why = "revenue = what one unit sells for x how many are sold",
      vars = { Rev1, price, units }, f = function(x) return x.price * x.units - x.Rev end,
      rearr = { price = "price = Rev/units", units = "units = Rev/price" }, ex = { price = 25, units = 3000 } },
    { id = "s3_dep", sec = 3, name = "Straight-line depreciation", short = "Dep = (Cost - SVd)/life", eq = "Dep = (Cost - SVd)/life - DepOld",
      why = "straight line: the same Dep each year; Cost includes shipping and installation; a replacement: minus the old asset's Dep",
      vars = { Dep1, Cost, life, SVd, DepOld }, eqf = depEq,
      f = function(x) return (x.Cost - z(x.SVd)) / x.life - z(x.DepOld) - x.Dep end,
      rearr = { Cost = function(x)
                  local s = x.DepOld and "(Dep + DepOld)*life" or "Dep*life"
                  return "Cost = " .. s .. (x.SVd and " + SVd" or "")
                end,
                life = function(x)
                  return "life = " .. (x.SVd and "(Cost - SVd)" or "Cost") .. "/" .. (x.DepOld and "(Dep + DepOld)" or "Dep")
                end },
      ex = { Cost = 84000, life = 6, SVd = 6000, DepOld = 1500 } },
    { id = "s3_ebit", sec = 3, name = "EBIT (operating profit)", short = "EBIT = Rev - Costs - Dep", eq = "EBIT = Rev - Costs - Dep",
      why = "the income statement: revenue minus costs minus depreciation (the first part of the FCF line)",
      vars = { EBIT, Rev, Costs, Dep }, f = function(x) return x.Rev - x.Costs - x.Dep - x.EBIT end,
      rearr = { Rev = "Rev = EBIT + Costs + Dep", Costs = "Costs = Rev - Dep - EBIT", Dep = "Dep = Rev - Costs - EBIT" },
      ex = { Rev = 7200, Costs = 2600, Dep = 1100 } },
    { id = "s3_earn", sec = 3, name = "Earnings after tax", short = "Earn = EBIT*(1 - tc)", eq = "Earn = EBIT*(1 - tc)",
      why = "tax is paid on EBIT: what is left is the (incremental) earnings, or net income",
      vars = { Earn, EBIT, tc }, f = function(x) return x.EBIT * (1 - x.tc) - x.Earn end,
      rearr = { EBIT = "EBIT = Earn/(1 - tc)", tc = "tc = 1 - Earn/EBIT" }, ex = { EBIT = 3500, tc = 0.3 } },
    { id = "s3_ocf", sec = 3, name = "Operating cash flow", short = "OCF = Earn + Dep", eq = "OCF = Earn + Dep",
      why = "depreciation is not paid in cash: add it back to the earnings",
      vars = { OCF, Earn, Dep }, f = function(x) return x.Earn + x.Dep - x.OCF end,
      need = function(x) if x.OCF and not x.Earn and not x.Dep then return "Dep (the depreciation)" end end,
      rearr = { Earn = "Earn = OCF - Dep", Dep = "Dep = OCF - Earn" }, ex = { Earn = 2450, Dep = 1100 } },
    { id = "s3_nwc", sec = 3, name = "Change in NWC (from the items)", short = "dNWC = NWC1 - NWC0",
      eq = "dNWC = (Inv1 + AR1 - AP1) - (Inv0 + AR0 - AP0)",
      why = "NWC = inventory + receivables - payables; the cash flow uses this year's NWC minus last year's",
      vars = { dNWC1, Inv1, AR1, AP1, Inv0, AR0, AP0 }, eqf = nwcEq,
      f = function(x) return (z(x.Inv1) + z(x.AR1) - z(x.AP1)) - (z(x.Inv0) + z(x.AR0) - z(x.AP0)) - x.dNWC end,
      ex = { Inv1 = 900, AR1 = 650, AP1 = 400, Inv0 = 700, AR0 = 500, AP0 = 350 } },
    { id = "s3_cf", sec = 3, name = "Total cash flow of a year", short = "CF = OCF - CapEx - dNWC + ATS", eq = "CF = OCF - CapEx - dNWC + ATS",
      why = "the year's cash flow: operating cash flow, minus spending on assets and NWC, plus the cash from selling an asset",
      vars = { CF, OCFw, CapEx, dNWC, ATS }, f = function(x) return x.OCF - x.CapEx - x.dNWC + x.ATS - x.CF end,
      rearr = { OCF = "OCF = CF + CapEx + dNWC - ATS", CapEx = "CapEx = OCF - dNWC + ATS - CF",
                dNWC = "dNWC = OCF - CapEx + ATS - CF", ATS = "ATS = CF - OCF + CapEx + dNWC" },
      ex = { OCF = 3550, CapEx = 800, dNWC = -350, ATS = 1200 } },
    { id = "s3_dts", sec = 3, name = "Depreciation tax shield", short = "DTS = Dep*tc", eq = "DTS = Dep*tc",
      why = "depreciation cuts the taxable profit, so it saves Dep x tc of tax",
      vars = { DTS, Dep1, tc }, f = function(x) return x.Dep * x.tc - x.DTS end,
      rearr = { Dep = "Dep = DTS/tc", tc = "tc = DTS/Dep" }, ex = { Dep = 1100, tc = 0.3 } },
    { id = "s3_taxs", sec = 3, name = "Tax on an asset sale", short = "TaxSale = (SV - BV)*tc", eq = "TaxSale = (SV - BV)*tc",
      why = "the gain over book value is taxed (a loss saves tax): the tax part of the after-tax salvage line",
      vars = { TaxSale, SV, BV, tc }, f = function(x) return (x.SV - x.BV) * x.tc - x.TaxSale end,
      rearr = { SV = "SV = BV + TaxSale/tc", BV = "BV = SV - TaxSale/tc", tc = "tc = TaxSale/(SV - BV)" },
      ex = { SV = 9000, BV = 4000, tc = 0.3 } },
  }
  EVERY_ADD{
    lines = lines,
    -- the year's total cash flow becomes C of the two-stage line (when there is no FCF)
    bridges = { { "3:CF", "9:C", false, nil, nil, "3:FCF" } },
    weakok = { s3_ebit = { Rev = true, Costs = true, Dep = true }, s3_ocf = { Dep = true },
               s3_cf = { OCF = true, CapEx = true, dNWC = true, ATS = true } },
    skip = {
      -- EBIT only from Rev and Costs, or from one of them and Dep (a saving: Rev or a negative cost)
      s3_ebit = function(T, K) return count(K, { "Rev", "Costs" }) + count(K, { "Dep" }) < 2 end,
      -- earnings typed and no Dep: OCF would just copy them
      s3_ocf = function(T, K) return K["3:Dep"] == nil and K["3:OCF"] == nil and T["3:Earn"] ~= nil end,
      s3_nwc = function(T, K) return not any(K, NWCK) end,
      -- the total: at least two of its parts; wait for the OCF; no sale and Rev, Costs known: the sheet's FCF line says it
      s3_cf = function(T, K)
        if count(K, { "OCF", "CapEx", "dNWC", "ATS" }) < 2 then return true end
        if K["3:OCF"] == nil and any(K, { "Rev", "Costs", "EBIT", "Earn" }) then return true end
        if K["3:ATS"] == nil and (K["3:FCF"] ~= nil or (K["3:Rev"] ~= nil and K["3:Costs"] ~= nil)) then return true end
        return false
      end,
      -- the tax shield alone (Dep and tc), not inside a whole cash flow question
      s3_dts = function(T, K) return T["3:DTS"] == nil and any(K, CFK) end,
    },
    hint = { ["3:r"] = "nominal cash flows: nominal rate; real cash flows: real rate",
             ["3:dNWC"] = "NWC now minus last year; got back at the end: negative" },
  }
end
