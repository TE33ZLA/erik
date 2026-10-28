----------------------------------------------------------------------
-- EVERYTHING page, section 2 (Bonds and Shares): lines NOT on the formula sheet.
-- See every_core.lua for the shape of a pack. Own numbers. ASCII only.
--   * the price in t years (constant growth): Pt = P0*(1 + g)^t
--   * growth that changes year by year: D1 = D0*(1 + g1), D2 = D1*(1 + g2) ...
--     feed the 'n dividends + price' line; Pn = Dn*(1 + g)/(rE - g) ends it
--   * two-stage growth (gs for N years, then g forever) in one line
--   * the same dividend for nD years, then a price
--   * the price just before the dividend is paid: Pcum = P0 + D0
----------------------------------------------------------------------
do
  local X = EVERY_SLOT
  local P0 = X("P0", nil, "P0 share price today ($)", "money", "the share price (value) today")
  local D0 = X("D0", nil, "D0 dividend JUST paid ($)", "money", "the dividend just paid (time 0)")
  local rE = X("rE", nil, "rE required return (%)", "pct", "the return shareholders require (cost of equity)", { rate = true })
  local g = X("g", nil, "g dividend growth (%)", "pct", "growth of the dividend each year, forever")
  local Pn = X("Pn", nil, "Pn share price in year n ($)", "money", "the price at the end of the LAST dividend year")
  local Pt = X("Pt", nil, "Pt price in t years ($)", "money", "the price t years from now (growth g every year)")
  local t = X("t", nil, "t years ahead", "num", "how many years ahead (price in 1 year: 1)", { pos = true })
  local gs = X("gs", nil, "gs growth, first N years (%)", "pct", "the FIRST growth, for N years (then g forever)")
  local N = X("N", nil, "N years of growth gs", "num", "how many years the first growth gs lasts", { pos = true })
  local Dlev = X("Dlev", nil, "Dlev the SAME dividend ($)", "money", "the same dividend every year, for nD years")
  local nD = X("nD", nil, "nD years of that dividend", "num", "how many years the same dividend is paid", { pos = true })
  local Pcum = X("Pcum", nil, "Pcum price before D0 paid ($)", "money", "price when D0 is still to come (cum-dividend)")

  -- growth typed for one year (g1 .. g5)
  local function anyG(K) for k = 1, 5 do if K["2:g" .. k] ~= nil then return true end end return false end
  -- a typed gk whose dividend Dk is not worked out yet: the year-by-year chain is still running
  local function chainOpen(K, kn) for k = 1, 5 do if K["2:g" .. k] ~= nil and kn["2:D" .. k] == nil then return true end end return false end
  -- the dividends do not grow at one rate: P0 = D1/(rE - g) and Pt = P0*(1 + g)^t do not fit
  local function uneven(K)
    return anyG(K) or K["2:gs"] ~= nil or K["2:N"] ~= nil or K["2:D2"] ~= nil or K["2:Dlev"] ~= nil or K["2:nD"] ~= nil
  end
  local function lastD(x) local nn = 0; for k = 1, 5 do if x["D" .. k] then nn = k end end; return nn end
  local function dlast(x) local nn = lastD(x); if nn > 0 then return x["D" .. nn], "D" .. nn end; return x.Dlev, "Dlev" end

  local lines = {
    { id = "s2_pt", sec = 2, name = "Share price in t years", short = "Pt = P0*(1 + g)^t", eq = "Pt = P0*(1 + g)^t",
      why = "constant growth: the price grows at g a year, like the dividend (Pt = D(t+1)/(rE - g))",
      vars = { Pt, P0, g, t },
      f = function(x) return x.P0 * (1 + x.g) ^ x.t - x.Pt end,
      rearr = { P0 = "P0 = Pt/(1 + g)^t", g = "g = (Pt/P0)^(1/t) - 1", t = "t = ln(Pt/P0)/ln(1 + g)" },
      ex = { P0 = 30, g = 0.04, t = 3 } },
  }
  -- the dividends year by year, each with its own growth
  for k = 1, 5 do
    local Dk, Dp, gk = "D" .. k, "D" .. (k - 1), "g" .. k
    lines[#lines + 1] = { id = "s2_d" .. k, sec = 2, name = "Dividend in year " .. k .. " (growth of year " .. k .. ")",
      short = Dk .. " = " .. Dp .. "*(1 + " .. gk .. ")", eq = Dk .. " = " .. Dp .. "*(1 + " .. gk .. ")",
      why = "each dividend is last year's one grown by that year's growth",
      vars = { X(Dk, nil, Dk .. " dividend in year " .. k .. " ($)", "money", "dividend paid at the end of year " .. k),
               (k == 1) and D0 or X(Dp, nil, Dp .. " dividend in year " .. (k - 1) .. " ($)", "money", "dividend paid at the end of year " .. (k - 1)),
               X(gk, nil, gk .. " growth in year " .. k .. " (%)", "pct", "how much the dividend grows in year " .. k .. " only") },
      f = function(x) return x[Dp] * (1 + x[gk]) - x[Dk] end,
      rearr = { [Dp] = Dp .. " = " .. Dk .. "/(1 + " .. gk .. ")", [gk] = gk .. " = " .. Dk .. "/" .. Dp .. " - 1" },
      ex = { [Dp] = 1.2, [gk] = 0.15 } }
  end
  -- the price at the last dividend year, when growth g then lasts forever
  local pnv = { Pn }
  for k = 1, 5 do pnv[#pnv + 1] = X("D" .. k, nil, "D" .. k .. " dividend in year " .. k .. " ($)", "money", "dividend paid at the end of year " .. k, { list = true }) end
  pnv[#pnv + 1] = X("Dlev", nil, Dlev.label, "money", Dlev.hint, { opt = true })
  pnv[#pnv + 1] = g
  pnv[#pnv + 1] = rE
  lines[#lines + 1] = { id = "s2_pn", sec = 2, name = "Price at the last dividend year", short = "Pn = Dn*(1 + g)/(rE - g)",
    eq = "Pn = Dn*(1 + g)/(rE - g)",
    why = "constant growth from then on: Pn = D(n+1)/(rE - g) with D(n+1) = Dn*(1 + g), Dn = the last dividend given",
    vars = pnv,
    need = function(x)
      if not dlast(x) then return "the last dividend: D1 .. D5 (or Dlev)" end
      if x.rE and x.g and x.rE <= x.g then return "rE must be MORE than g (growth forever)" end
    end,
    eqf = function(x) local _, nm = dlast(x); return "Pn = " .. (nm or "Dn") .. "*(1 + g)/(rE - g)" end,
    f = function(x) return dlast(x) * (1 + x.g) / (x.rE - x.g) - x.Pn end,
    rearr = { rE = function(x) local _, nm = dlast(x); return "rE = " .. nm .. "*(1 + g)/Pn + g" end,
              g = function(x) local _, nm = dlast(x); return "g = (rE*Pn - " .. nm .. ")/(Pn + " .. nm .. ")" end },
    ex = { D1 = 1, D2 = 1.3, g = 0.05, rE = 0.11 } }
  -- two-stage growth: gs for N years (a growing annuity), then g forever (a growing perpetuity at year N)
  local function stage1(x)
    if math.abs(x.rE - x.gs) < 1e-12 then return x.D0 * x.N end   -- rE = gs: every dividend is worth D0 today
    return x.D0 * (1 + x.gs) / (x.rE - x.gs) * (1 - ((1 + x.gs) / (1 + x.rE)) ^ x.N)
  end
  lines[#lines + 1] = { id = "s2_p0gs", sec = 2, name = "Share price, two-stage growth", short = "two-stage growth",
    eq = "P0 = D0*(1 + gs)/(rE - gs)*(1 - ((1 + gs)/(1 + rE))^N) + D0*(1 + gs)^N*(1 + g)/(rE - g)/(1 + rE)^N",
    why = "a growing annuity for years 1 to N (first D1 = D0*(1 + gs)), then a growing perpetuity: PN = D(N+1)/(rE - g), brought back N years",
    vars = { P0, D0, gs, N, g, rE },
    need = function(x) if x.rE and x.g and x.rE <= x.g then return "rE must be MORE than g (growth forever)" end end,
    f = function(x) return stage1(x) + x.D0 * (1 + x.gs) ^ x.N * (1 + x.g) / (x.rE - x.g) / (1 + x.rE) ^ x.N - x.P0 end,
    rearr = { D0 = "D0 = P0/((1 + gs)/(rE - gs)*(1 - ((1 + gs)/(1 + rE))^N) + (1 + gs)^N*(1 + g)/(rE - g)/(1 + rE)^N)" },
    ex = { D0 = 1.5, gs = 0.12, N = 4, g = 0.03, rE = 0.1 } }
  -- the same dividend for nD years, then the price
  lines[#lines + 1] = { id = "s2_p0lev", sec = 2, name = "Share price, same dividend for nD years + price", short = "level dividends + price",
    eq = "P0 = Dlev/rE*(1 - 1/(1 + rE)^nD) + Pn/(1 + rE)^nD",
    why = "the dividends are an annuity (PV = C/r*(1 - 1/(1 + r)^n)); the price at year nD is one amount, brought back nD years",
    vars = { P0, Dlev, rE, nD, Pn },
    f = function(x)
      local ann = (x.rE == 0) and x.nD or (1 - 1 / (1 + x.rE) ^ x.nD) / x.rE
      return x.Dlev * ann + x.Pn / (1 + x.rE) ^ x.nD - x.P0
    end,
    rearr = { Dlev = "Dlev = (P0 - Pn/(1 + rE)^nD)*rE/(1 - 1/(1 + rE)^nD)", Pn = "Pn = (P0 - Dlev/rE*(1 - 1/(1 + rE)^nD))*(1 + rE)^nD" },
    ex = { Dlev = 3, rE = 0.1, nD = 7, Pn = 20 } }
  -- the price the moment before the dividend D0 is paid
  lines[#lines + 1] = { id = "s2_cum", sec = 2, name = "Price before the dividend is paid (cum-dividend)", short = "Pcum = P0 + D0",
    eq = "Pcum = P0 + D0",
    why = "a buyer before the dividend is paid also gets D0, so the share is worth D0 more than after it (P0)",
    vars = { Pcum, P0, D0 },
    f = function(x) return x.P0 + x.D0 - x.Pcum end,
    rearr = { P0 = "P0 = Pcum - D0", D0 = "D0 = Pcum - P0" },
    ex = { P0 = 18.4, D0 = 0.6 } }

  EVERY_ADD{
    lines = lines,
    bridges = {},
    -- the two-stage and level-dividend lines are other share-price lines: they never feed the sheet's ones
    fam = { s2_p0gs = "share", s2_p0lev = "share" },
    skip = {
      -- growth that is not one rate: D1/rE and D1/(rE - g) give a wrong P0
      p0z = uneven, p0g = uneven,
      -- the new share lines run only when their own boxes are typed
      s2_pt = function(K) return uneven(K) or (K["2:t"] == nil and K["2:Pt"] == nil) end,
      s2_p0gs = function(K) return K["2:gs"] == nil and K["2:N"] == nil end,
      s2_p0lev = function(K) return K["2:Dlev"] == nil and K["2:nD"] == nil end,
      -- wait until every typed gk has its dividend
      p0n = chainOpen,
      s2_pn = function(K, kn)
        if K["2:g"] == nil or chainOpen(K, kn) then return true end
        return not (anyG(K) or K["2:D2"] ~= nil or (K["2:Dlev"] ~= nil and K["2:nD"] ~= nil))
      end,
      -- each year's growth line runs only when that growth is typed
      s2_d1 = function(K) return K["2:g1"] == nil end, s2_d2 = function(K) return K["2:g2"] == nil end,
      s2_d3 = function(K) return K["2:g3"] == nil end, s2_d4 = function(K) return K["2:g4"] == nil end,
      s2_d5 = function(K) return K["2:g5"] == nil end,
      -- Pcum typed, or only P0 and D0 typed in this section
      s2_cum = function(K)
        if K["2:Pcum"] ~= nil then return false end
        for b in pairs(K) do if b:sub(1, 2) == "2:" and b ~= "2:P0" and b ~= "2:D0" then return true end end
        return K["2:P0"] == nil or K["2:D0"] == nil
      end,
    },
    hint = { ["2:FVn"] = "face value at the end; sold early (realised yield): sale price" },
  }
end
