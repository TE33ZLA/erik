----------------------------------------------------------------------
-- BFC2140 CORPORATE FINANCE QUESTION SOLVER  (all weeks: 1-5 MST, 7-11 final)
-- TI-Nspire Lua  |  keyboard-driven  |  dyslexia-friendly output
--
-- KEYS:  menu: 1-9,0 or arrows+ENTER pick a question type | H help
--        input: type numbers into slots | up/down move | left/right
--               change a choice | ENTER = SOLVE | N = notes
--               A = steps + traps | ESC = back | DEL clears a slot
-- ENTRY: rates as PERCENT (7 = 7%) | money plain (4750) or 4.75k /
--        1.2m | blank slot = unknown (the solver finds it)
----------------------------------------------------------------------

if platform then platform.apilevel = "2.0" end
local VERSION = "v22"

----------------------------------------------------------------------
-- 1. SMALL HELPERS + NUMBER FORMATTING
----------------------------------------------------------------------

local LOG10 = math.log10 or function(x) return math.log(x) / math.log(10) end
local INF = math.huge
local function ln(x) return math.log(x) end

-- s significant figures, trailing zeros trimmed, no sci notation
local function sig(x, s)
  if x == nil or x ~= x then return "?" end
  if x == INF then return "inf" end
  if x == -INF then return "-inf" end
  local a = math.abs(x)
  if a == 0 then return "0" end
  if a >= 1e13 or a < 1e-7 then return string.format("%." .. (s - 1) .. "e", x) end
  local mag = math.floor(LOG10(a) + 1e-9)
  local dec = s - 1 - mag
  if dec < 0 then dec = 0 end
  if dec > 9 then dec = 9 end
  local str = string.format("%." .. dec .. "f", x)
  if str:find("%.") then str = str:gsub("0+$", ""):gsub("%.$", "") end
  return str
end
local function fmtN(x) return sig(x, 6) end
local P = fmtN

-- money: 2 decimals + thousands commas (sign handled by caller)
local function money(x)
  if x == nil or x ~= x then return "?" end
  local s = string.format("%.2f", math.abs(x))
  local ip, dp = s:match("^(%d+)%.(%d+)$")
  if not ip then return s end
  ip = ip:reverse():gsub("(%d%d%d)", "%1,"):reverse():gsub("^,", "")
  return ip .. "." .. dp
end

-- percent from a fraction: 0.10034 -> "10.034"
local function pct(x)
  if x == nil or x ~= x then return "?" end
  local s = string.format("%.4f", x * 100)
  if s:find("%.") then s = s:gsub("0+$", ""):gsub("%.$", "") end
  return s
end

local function fmtU(x, unit)
  if x == nil then return "?" end
  if unit == "$" then
    return (x < 0 and "-$" or "$") .. money(x)
  elseif unit == "%" then
    return pct(x) .. " %"
  elseif unit == nil or unit == "" then
    return fmtN(x)
  end
  return fmtN(x) .. " " .. unit
end

local function wrap(text, maxc)
  local lines = {}
  for para in (text .. "\n"):gmatch("(.-)\n") do
    if para == "" then
      table.insert(lines, "")
    else
      local cur = ""
      for word in para:gmatch("%S+") do
        if cur == "" then cur = word
        elseif #cur + 1 + #word <= maxc then cur = cur .. " " .. word
        else table.insert(lines, cur); cur = word end
      end
      if cur ~= "" then table.insert(lines, cur) end
    end
  end
  return lines
end

local function count(...)
  local c = 0
  for i = 1, select("#", ...) do
    if select(i, ...) ~= nil then c = c + 1 end
  end
  return c
end

----------------------------------------------------------------------
-- 2. OUTPUT COLLECTOR  (rows carry a kind so the UI can colour them)
--    kinds: head | val | frm | note | need | err | ok | bad | xl | tblrow
----------------------------------------------------------------------

local Out = {}
Out.__index = Out

local function newOut()
  return setmetatable({ rows = {}, vals = {} }, Out)
end

function Out:add(kind, text) table.insert(self.rows, { kind = kind, text = text }) end
function Out:head(t)  self:add("head", t) end
function Out:note(t)  self:add("note", t) end
function Out:err(t)   self:add("err",  t) end
function Out:xl(t)    self:add("xl",   t) end
function Out:need(t)  self:add("need", "Need " .. t) end
function Out:check(label, ok)
  self:add(ok and "ok" or "bad", (ok and "PASS: " or "FAIL: ") .. label)
end

-- one value row: "label = value unit" + formula line under it
function Out:row(label, value, unit, formula, key)
  if value == nil then return end
  self.vals[key or label] = value
  table.insert(self.rows, { kind = "val", text = label .. " = " .. fmtU(value, unit),
                            label = label, key = key or label, unit = unit, formula = formula })
  if formula and formula ~= "" then self:add("frm", formula) end
end

-- generic TABLE: cols = { {k="CF", u="$"}, ... }
-- each row: label + values (by col index) + how (by col index)
function Out:tcols(cols)
  self.tbl = { cols = cols, rows = {} }
end
function Out:trow(label, vals, how)
  if not self.tbl then return end
  table.insert(self.tbl.rows, { label = label, vals = vals, how = how or {} })
  self:add("tblrow", #self.tbl.rows)
end

----------------------------------------------------------------------
-- 3. FINANCE CORE
----------------------------------------------------------------------

-- PV factor of a level (or growing) stream, valued ONE PERIOD BEFORE
-- the first cash flow. N = nil -> perpetuity.
local function annFac(i, N, g)
  g = g or 0
  if N == nil then
    if i <= g then return nil end
    return 1 / (i - g)
  end
  if math.abs(i - g) < 1e-12 then
    if i == 0 then return N end
    return N / (1 + i)
  end
  if g == 0 then return (1 - (1 + i) ^ (-N)) / i end
  return (1 - ((1 + g) / (1 + i)) ^ N) / (i - g)
end

-- FV factor at the date of the LAST cash flow
local function fvaFac(i, N, g)
  local a = annFac(i, N, g)
  if not a then return nil end
  return a * (1 + i) ^ N
end

-- generic bisection on f(x) = 0 in [lo, hi] (f must change sign)
local function bisect(f, lo, hi, iters)
  local flo, fhi = f(lo), f(hi)
  if flo == nil or fhi == nil or flo ~= flo or fhi ~= fhi then return nil end
  if flo == 0 then return lo end
  if fhi == 0 then return hi end
  if (flo < 0) == (fhi < 0) then return nil end
  for _ = 1, (iters or 200) do
    local mid = (lo + hi) / 2
    local fm = f(mid)
    if fm == 0 then return mid end
    if (fm < 0) == (flo < 0) then lo, flo = mid, fm else hi, fhi = mid, fm end
    if hi - lo < 1e-13 then break end
  end
  return (lo + hi) / 2
end

-- scan for a sign change, then bisect; prefers the first root >= 0
local function findRoot(f, lo, hi, step)
  local xs, prev = {}, nil
  local x = lo
  local pf = f(x)
  while x < hi do
    local nx = x + step
    local nf = f(nx)
    if pf and nf and pf == pf and nf == nf and ((pf < 0) ~= (nf < 0)) then
      xs[#xs + 1] = { x, nx }
    end
    x, pf = nx, nf
  end
  if #xs == 0 then return nil, 0 end
  local pick = xs[1]
  for _, br in ipairs(xs) do
    if br[2] >= 0 then pick = br; break end
  end
  return bisect(f, pick[1], pick[2]), #xs
end

-- cash flows: cfs[t] for t = 0..nmax
local function npvAt(rate, cfs, nmax)
  local s = 0
  for t = 0, nmax do
    local c = cfs[t]
    if c then s = s + c / (1 + rate) ^ t end
  end
  return s
end

local function irrOf(cfs, nmax)
  return findRoot(function(r) return npvAt(r, cfs, nmax) end, -0.95, 10, 0.005)
end

local function signChanges(cfs, nmax)
  local n, last = 0, nil
  for t = 0, nmax do
    local c = cfs[t]
    if c and c ~= 0 then
      if last and ((c < 0) ~= (last < 0)) then n = n + 1 end
      last = c
    end
  end
  return n
end

-- choice text "12 (monthly)" -> 12 ; "continuous" -> nil, true
local function mOf(s)
  if s == nil then return 1, false end
  if s == "continuous" then return nil, true end
  return tonumber(tostring(s):match("^%d+")) or 1, false
end

local function excelList(cfs, nmax)
  local t = {}
  for i = 0, nmax do t[#t + 1] = fmtN(cfs[i] or 0) end
  return table.concat(t, ",")
end

----------------------------------------------------------------------
-- 4. THE TEN SOLVERS   solveX(V, out)
----------------------------------------------------------------------

-- 4.1 LUMP SUM: FV / PV / n / r  (+ m per year, continuous, EAR) ----
local function solveLump(V, out)
  local m, cont = mOf(V.m)
  local PV, FV, r, n, EAR = V.PV, V.FV, V.r, V.n, V.EAR
  if V.mult and not (PV and FV) then
    if PV then FV = PV * V.mult
    elseif FV then PV = FV / V.mult
    else PV = 1; FV = V.mult end
    out:note("multiple " .. P(V.mult) .. " : FV = " .. P(V.mult) ..
             " x PV - the dollar amounts never matter, only the ratio")
  end
  if not r and EAR then
    if cont then
      r = ln(1 + EAR)
      out:row("r (continuous)", r, "%", "r = ln(1 + EAR) = ln(" .. P(1 + EAR) .. ")", "r")
    else
      r = m * ((1 + EAR) ^ (1 / m) - 1)
      out:row("r (nominal p.a.)", r, "%",
              "r = m*((1 + EAR)^(1/m) - 1) = " .. m .. "*((" .. P(1 + EAR) ..
              ")^(1/" .. m .. ") - 1)", "r")
    end
  end
  local cnt = count(PV, FV, r, n)
  local i = r and ((not cont) and r / m or nil)
  local N = n and ((not cont) and n * m or nil)
  local how = {}
  if cnt >= 3 then
    if not FV then
      if cont then FV = PV * math.exp(r * n)
        how.FV = "FV = PV*e^(r*n) = " .. P(PV) .. "*e^(" .. P(r) .. "*" .. P(n) .. ")"
      else FV = PV * (1 + i) ^ N
        how.FV = "FV = PV*(1 + i)^N = " .. P(PV) .. "*(" .. P(1 + i) .. ")^" .. P(N)
      end
    elseif not PV then
      if cont then PV = FV / math.exp(r * n)
        how.PV = "PV = FV/e^(r*n) = " .. P(FV) .. "/e^(" .. P(r) .. "*" .. P(n) .. ")"
      else PV = FV / (1 + i) ^ N
        how.PV = "PV = FV/(1 + i)^N = " .. P(FV) .. "/(" .. P(1 + i) .. ")^" .. P(N)
      end
    elseif not n then
      if cont then n = ln(FV / PV) / r
        how.n = "n = ln(FV/PV)/r = ln(" .. P(FV / PV) .. ")/" .. P(r)
      else N = ln(FV / PV) / ln(1 + i); n = N / m
        how.n = "N = ln(FV/PV)/ln(1 + i) = ln(" .. P(FV / PV) .. ")/ln(" ..
                P(1 + i) .. ") = " .. P(N) .. " periods | n = N/m"
      end
    elseif not r then
      if cont then r = ln(FV / PV) / n
        how.r = "r = ln(FV/PV)/n = ln(" .. P(FV / PV) .. ")/" .. P(n)
      else i = (FV / PV) ^ (1 / N) - 1; r = i * m
        how.r = "i = (FV/PV)^(1/N) - 1 = (" .. P(FV / PV) .. ")^(1/" .. P(N) ..
                ") - 1 = " .. P(i) .. " | r = i*m"
      end
    else
      local chk = cont and PV * math.exp(r * n) or PV * (1 + r / m) ^ (n * m)
      out:check("PV, FV, r, n agree (FV from the others = " .. fmtU(chk, "$") .. ")",
                math.abs(chk - FV) <= 0.005 * math.abs(FV) + 0.01)
    end
    i = r and ((not cont) and r / m or nil)
    N = n and ((not cont) and n * m or nil)
  end
  out:head("RESULT")
  out:row("PV", PV, "$", how.PV, "PV")
  out:row("FV", FV, "$", how.FV, "FV")
  out:row("r (p.a.)", r, "%", how.r, "r")
  out:row("n (years)", n, "years", how.n, "n")
  if cnt < 3 then
    if r and cnt == 1 then
      out:note("only the rate given: its conversions are below. Fill any two of PV, FV, n for values.")
    else
      out:need("any THREE of PV, FV, r, n  (a multiple like 3 = triple counts as PV + FV)")
    end
  end
  if r then
    out:head("PER-PERIOD VIEW")
    if cont then
      out:note("continuous compounding: no calculator or Excel function - by hand")
      if n then out:row("growth factor e^(r*n)", math.exp(r * n), "", "e^(" .. P(r) .. "*" .. P(n) .. ")", "factor") end
      out:row("EAR", math.exp(r) - 1, "%", "EAR = e^r - 1 = e^" .. P(r) .. " - 1", "EAR")
    else
      out:row("i (rate per period)", i, "%", "i = r/m = " .. P(r) .. "/" .. m, "i")
      if N then out:row("N (periods)", N, "periods", "N = n*m = " .. P(n) .. "*" .. m, "N") end
      if N then out:row("growth factor (1 + i)^N", (1 + i) ^ N, "", "(" .. P(1 + i) .. ")^" .. P(N), "factor") end
      if m > 1 then
        out:row("EAR", (1 + i) ^ m - 1, "%", "EAR = (1 + r/m)^m - 1 = (" .. P(1 + i) .. ")^" .. m .. " - 1", "EAR")
      else
        out:row("EAR", r, "%", "m = 1 so EAR = r", "EAR")
      end
    end
  end
  if cnt >= 3 and not cont then
    out:head("EXCEL")
    if PV and N and i then out:xl("=FV(" .. P(i) .. ", " .. P(N) .. ", 0, -" .. P(PV) .. ", 0)") end
    if FV and N and i then out:xl("=PV(" .. P(i) .. ", " .. P(N) .. ", 0, " .. P(FV) .. ", 0)  -> shows negative") end
    if PV and FV and i then out:xl("=NPER(" .. P(i) .. ", 0, -" .. P(PV) .. ", " .. P(FV) .. ", 0)  -> periods, /m for years") end
    if PV and FV and N then out:xl("=RATE(" .. P(N) .. ", 0, -" .. P(PV) .. ", " .. P(FV) .. ", 0)  -> per period, x m") end
  end
end

-- 4.2 ANNUITY / PERPETUITY (ordinary, due, deferred, growing) -------
local function solveAnn(V, out)
  local m = mOf(V.m)
  local C, r, n, g = V.C, V.r, V.n, V.g or 0
  local PV, FV, price = V.PV, V.FV, V.price
  local due = (V.timing == "start (due)")
  local tf = V.first
  if tf == nil then tf = due and 0 or 1 end
  if V.first and due then
    out:note("first-payment slot given: timing choice ignored, t = " .. P(tf))
  end
  local k = tf - 1   -- periods from t = 0 to the formula's valuation point
  local i = r and r / m
  local perp = (n == nil)
  local how = {}
  -- which unknown?
  local wantN = (n == nil) and (C and r and (PV or FV)) and true or false
  if wantN then perp = false end
  local function fac(ii) return annFac(ii, (not perp) and n or nil, g) end
  local function fvf(ii) return (not perp) and fvaFac(ii, n, g) or nil end
  local function pv0(ii, CC, nn)
    local f = annFac(ii, nn, g)
    if not f then return nil end
    return CC * f / (1 + ii) ^ k
  end
  local function fvn(ii, CC, nn)
    local f = fvaFac(ii, nn, g)
    if not f then return nil end
    -- FV at the date of the last payment
    return CC * f
  end
  if not r then
    if C and (PV or FV) then
      local f
      if PV then f = function(ii) return pv0(ii, C, (not perp) and n or nil) - PV end
      else f = function(ii) return fvn(ii, C, n) - FV end end
      i = findRoot(f, 1e-6, 2.0, 0.002)
      if i then r = i * m
        how.r = "i found by search so that " .. (PV and "PV" or "FV") ..
                " matches | r = i*m = " .. P(i) .. "*" .. m
      else out:err("no rate reproduces that " .. (PV and "PV" or "FV") .. " - check the inputs") end
    else
      out:need("C and PV (or FV) to find r")
    end
  end
  if i and g > i then
    out:add("bad", "CHECK: growth g = " .. pct(g) .. "% is HIGHER than the discount rate i = " .. pct(i) ..
            "% - have r and g been swapped? (r = discount rate, g = growth of the payments)")
  end
  if i then
    local f = fac(i)
    if not f then out:err("perpetuity needs r > g  (r = " .. pct(r) .. "%, g = " .. pct(g) .. "%)"); return end
    if not C then
      if PV then
        C = PV * (1 + i) ^ k / f
        how.C = "C = PV*(1 + i)^k / factor = " .. P(PV) .. "*(" .. P(1 + i) .. ")^" .. P(k) .. " / " .. P(f)
      elseif FV and not perp then
        C = FV / fvf(i)
        how.C = "C = FV / FV-factor = " .. P(FV) .. " / " .. P(fvf(i))
      else
        out:need("PV or FV (or C) - fill one of them")
      end
    elseif wantN then
      local PVb
      if PV then
        PVb = PV * (1 + i) ^ k
        local arg = 1 - PVb * (i - g) / C
        if arg <= 0 or i == g then
          out:err("payment too small: C = " .. fmtU(C, "$") .. " never repays " ..
                  fmtU(PVb, "$") .. " at i = " .. pct(i) .. "% (C must exceed PV*(i - g) = " ..
                  fmtU(PVb * (i - g), "$") .. ")")
          return
        end
        n = ln(arg) / ln((1 + g) / (1 + i))
        how.n = "N = ln(1 - PV*(i - g)/C) / ln((1 + g)/(1 + i)) = ln(" .. P(arg) ..
                ")/ln(" .. P((1 + g) / (1 + i)) .. ")"
      else
        if g ~= 0 then
          n = findRoot(function(nn) return fvn(i, C, nn) - FV end, 0.01, 1000, 0.5)
          how.n = "N found by search so that FV matches"
        else
          local arg = 1 + FV * i / C
          n = ln(arg) / ln(1 + i)
          how.n = "N = ln(1 + FV*i/C)/ln(1 + i) = ln(" .. P(arg) .. ")/ln(" .. P(1 + i) .. ")"
        end
      end
      perp = false
    end
  end
  -- print everything derivable
  out:head("SETUP")
  out:row("i (rate per period)", i, "%", (m > 1) and ("i = r/m = " .. P(r or 0) .. "/" .. m) or "m = 1 so i = r", "i")
  if g ~= 0 then out:row("g (growth per period)", g, "%", nil, "g") end
  out:row("C (first payment)", C, "$", how.C, "C")
  if perp then
    out:note("n blank = PERPETUITY (forever)")
  else
    out:row("N (number of payments)", n, "payments", how.n, "N")
    if n and m > 1 then out:row("years", n / m, "years", "years = N/m", "years") end
  end
  out:row("r (p.a.)", r, "%", how.r, "r")
  if not i or not C then
    if not C and not i then out:need("r and C (plus PV or FV) to continue") end
    return
  end
  local f = fac(i)
  out:row("first payment at t", tf, "", due and "annuity DUE: payments at the START of each period" or
          ((tf == 1) and "ordinary annuity: first payment one period from now" or
           "DEFERRED: the formula values the stream at t = " .. P(k) .. ", then discount " .. P(k) .. " more periods"), "tf")
  out:head("VALUE")
  local fname = perp and (g ~= 0 and "1/(i - g)" or "1/i")
                or (g ~= 0 and "(1 - ((1 + g)/(1 + i))^N)/(i - g)" or "(1 - 1/(1 + i)^N)/i")
  out:row("factor (PV of $1 per period)", f, "", fname .. " with i = " .. P(i) ..
          (perp and "" or (", N = " .. P(n))) .. (g ~= 0 and (", g = " .. P(g)) or ""), "factor")
  local PVb = C * f
  out:row("PV at t = " .. P(k) .. " (one period before 1st pmt)", PVb, "$",
          "C*factor = " .. P(C) .. "*" .. P(f), "PVb")
  local PV0 = PVb / (1 + i) ^ k
  if k ~= 0 then
    out:row("PV today (t = 0)", PV0, "$", "PV0 = " .. P(PVb) .. "/(" .. P(1 + i) .. ")^" .. P(k) ..
            ((k < 0) and "  (= x(1 + i), annuity due)" or ""), "PV")
  else
    out:row("PV today (t = 0)", PV0, "$", "no extra discounting: t = 0 is one period before the 1st payment", "PV")
  end
  if PV and math.abs(PV - PV0) > 0.005 * math.abs(PV) + 0.02 then
    out:check("given PV " .. fmtU(PV, "$") .. " agrees with the formula (it gives " .. fmtU(PV0, "$") .. ")", false)
    out:note("if " .. fmtU(PV, "$") .. " is the asking price / what you want, put it in the PRICE slot instead of PV")
  end
  if not perp then
    local FVn = C * fvf(i)
    out:row("FV at the LAST payment (t = " .. P(tf + n - 1) .. ")", FVn, "$",
            "FV = C*((1 + i)^N - 1)/i" .. (g ~= 0 and " (growing: PV*(1 + i)^N)" or "") ..
            " = " .. P(C) .. "*" .. P(fvf(i)), "FV")
    if due then
      out:note("annuity due FV one period after the last payment = " .. fmtU(FVn * (1 + i), "$"))
    end
    if FV and math.abs(FV - FVn) > 0.005 * math.abs(FV) + 0.02 then
      out:check("given FV " .. fmtU(FV, "$") .. " agrees with the formula", false)
    end
  end
  if price then
    local npv = PV0 - price
    out:row("NPV = PV - price", npv, "$", P(PV0) .. " - " .. P(price), "NPV")
    out:add(npv >= 0 and "ok" or "bad", (npv >= 0) and "NPV >= 0 : ACCEPT the offer" or "NPV < 0 : REJECT the offer")
  end
  -- timeline table
  out:tcols({ { k = "t", u = "" }, { k = "CF", u = "$" }, { k = "DF", u = "" }, { k = "PV", u = "$" } })
  local rowsN = perp and 5 or math.min(math.floor(n + 1e-9), 8)
  local sumpv = 0
  for j = 0, rowsN - 1 do
    local t = tf + j
    local cf = C * (1 + g) ^ j
    local df = 1 / (1 + i) ^ t
    sumpv = sumpv + cf * df
    out:trow("t=" .. P(t), { t, cf, df, cf * df },
             { "", (j == 0) and "first payment C" or ("C*(1 + g)^" .. j .. " = " .. P(C) .. "*" .. P(1 + g) .. "^" .. j),
               "DF = 1/(1 + i)^t = 1/(" .. P(1 + i) .. ")^" .. P(t),
               "PV = CF*DF = " .. P(cf) .. "*" .. P(df) })
  end
  if perp or n > rowsN then
    out:note("table shows the first " .. rowsN .. " payments" .. (perp and " (perpetuity continues forever)" or (" of " .. P(n))))
  else
    out:note("sum of the PV column = " .. fmtU(sumpv, "$") .. " = PV today")
  end
  out:head("EXCEL (type 0 = end, 1 = start)")
  if not perp then
    out:xl("=PV(" .. P(i) .. ", " .. P(n) .. ", -" .. P(C) .. ", 0, " .. (due and "1" or "0") .. ")" ..
           ((k > 0) and ("  then /(1+i)^" .. P(k)) or ""))
    out:xl("=FV(" .. P(i) .. ", " .. P(n) .. ", -" .. P(C) .. ", 0, " .. (due and "1" or "0") .. ")")
    if g ~= 0 then out:note("growing annuity: no Excel/calculator function - formula by hand") end
  else
    out:note("perpetuity: no Excel function - C/(r - g) by hand")
  end
end

-- 4.3 LOAN: payment, balance, repricing, interest split --------------
local function solveLoan(V, out)
  local m = mOf(V.m)
  local L, yrs, r, PMT, k, r2 = V.L, V.yrs, V.r, V.PMT, V.k, V.r2
  local i = r and r / m
  local N = yrs and yrs * m
  if not k and V.kyrs then
    k = V.kyrs * m
    out:note("payments made k = years x m = " .. P(V.kyrs) .. " x " .. m .. " = " .. P(k))
  end
  local how = {}
  if not PMT and L and i and N then
    PMT = L / annFac(i, N)
    how.PMT = "PMT = L / factor = " .. P(L) .. " / " .. P(annFac(i, N)) ..
              " | factor = (1 - 1/(1 + i)^N)/i"
  elseif not L and PMT and i and N then
    L = PMT * annFac(i, N)
    how.L = "L = PMT*factor = " .. P(PMT) .. "*" .. P(annFac(i, N))
  elseif not N and L and PMT and i then
    local arg = 1 - L * i / PMT
    if arg <= 0 then out:err("payment " .. fmtU(PMT, "$") .. " does not even cover the interest " .. fmtU(L * i, "$") .. " - never repaid"); return end
    N = -ln(arg) / ln(1 + i); yrs = N / m
    how.N = "N = -ln(1 - L*i/PMT)/ln(1 + i) = -ln(" .. P(arg) .. ")/ln(" .. P(1 + i) .. ")"
  elseif not i and L and PMT and N then
    i = findRoot(function(ii) return PMT * annFac(ii, N) - L end, 1e-6, 1.0, 0.001)
    if i then r = i * m; how.r = "i found by search so that PMT*factor = L | r = i*m"
    else out:err("no rate fits those numbers"); return end
  end
  out:head("LOAN")
  out:row("L (amount borrowed)", L, "$", how.L, "L")
  out:row("i (rate per period)", i, "%", i and ("i = r/m = " .. P(r) .. "/" .. m), "i")
  out:row("N (payments)", N, "payments", how.N or (N and ("N = years*m = " .. P(yrs) .. "*" .. m)), "N")
  out:row("PMT (per period)", PMT, "$", how.PMT, "PMT")
  out:row("r (p.a.)", r, "%", how.r, "r")
  if not (L and i and N and PMT) then
    out:need("any THREE of L, r, years, PMT")
    return
  end
  out:row("total paid", PMT * N, "$", "PMT*N = " .. P(PMT) .. "*" .. P(N), "totpaid")
  out:row("total interest", PMT * N - L, "$", "PMT*N - L", "totint")
  out:row("interest in payment 1", L * i, "$", "i*L = " .. P(i) .. "*" .. P(L), "int1")
  out:row("principal in payment 1", PMT - L * i, "$", "PMT - interest", "prin1")
  local function balAfter(j)
    return L * (1 + i) ^ j - PMT * fvaFac(i, j)
  end
  if k then
    out:head("AFTER " .. P(k) .. " PAYMENTS")
    local Bk = PMT * annFac(i, N - k)
    out:row("balance after " .. P(k), Bk, "$", "PV of the " .. P(N - k) .. " payments left = PMT*(1 - 1/(1 + i)^" ..
            P(N - k) .. ")/i", "Bk")
    out:note("same thing: L*(1 + i)^k - PMT*((1 + i)^k - 1)/i = " .. fmtU(balAfter(k), "$"))
    out:row("principal repaid so far", L - Bk, "$", "L - balance", "prinSoFar")
    out:row("interest paid so far", PMT * k - (L - Bk), "$", "PMT*k - principal repaid", "intSoFar")
    if k < N then
      out:row("interest in payment " .. P(k + 1), i * Bk, "$", "i*balance = " .. P(i) .. "*" .. P(Bk), "intk1")
      out:row("principal in payment " .. P(k + 1), PMT - i * Bk, "$", "PMT - interest", "prink1")
    end
    if r2 then
      local i2 = r2 / m
      local PMT2 = Bk / annFac(i2, N - k)
      out:head("NEW RATE " .. pct(r2) .. " % FROM PAYMENT " .. P(k + 1))
      out:row("i2 (new rate per period)", i2, "%", "i2 = " .. P(r2) .. "/" .. m, "i2")
      out:row("new PMT", PMT2, "$", "balance / factor(i2, " .. P(N - k) .. ") = " .. P(Bk) .. " / " ..
              P(annFac(i2, N - k)), "PMT2")
      out:row("change per period", PMT2 - PMT, "$", "new PMT - old PMT", "dPMT")
    end
  elseif r2 then
    out:need("k (payments made) to reprice at the new rate")
  end
  -- amortisation table
  out:tcols({ { k = "int", u = "$" }, { k = "prin", u = "$" }, { k = "bal", u = "$" } })
  local rowsList = {}
  local function addRow(j) if j >= 1 and j <= N then rowsList[#rowsList + 1] = j end end
  addRow(1); addRow(2); addRow(3)
  if k then addRow(k); addRow(k + 1) end
  addRow(math.floor(N + 1e-9))
  table.sort(rowsList)
  local last = nil
  for _, j in ipairs(rowsList) do
    if j ~= last then
      local Bprev = balAfter(j - 1)
      local int = i * Bprev
      out:trow("#" .. P(j), { int, PMT - int, balAfter(j) },
               { "i*balance before = " .. P(i) .. "*" .. P(Bprev), "PMT - interest = " .. P(PMT) .. " - " .. P(int),
                 "balance after = " .. P(Bprev) .. " - " .. P(PMT - int) })
      last = j
    end
  end
  out:head("EXCEL")
  out:xl("=PMT(" .. P(i) .. ", " .. P(N) .. ", " .. P(L) .. ", 0, 0)  -> negative = payment")
  if k then
    out:xl("balance: =PV(" .. P(i) .. ", " .. P(N - k) .. ", -" .. P(PMT) .. ", 0, 0)")
    if r2 then out:xl("new: =PMT(" .. P(r2 / m) .. ", " .. P(N - k) .. ", " .. P(PMT * annFac(i, N - k)) .. ", 0, 0)") end
  end
end

-- 4.4 BOND PRICE / YIELD ---------------------------------------------
local function bondPrice(y, CPN, F, N, skip)
  skip = skip or 0
  if skip > 0 then
    local live = N - skip
    if live < 0 then return nil end
    return CPN * annFac(y, live) / (1 + y) ^ skip + (F + skip * CPN) / (1 + y) ^ N
  end
  return CPN * annFac(y, N) + F / (1 + y) ^ N
end

local function solveBond(V, out)
  local m = mOf(V.m)
  local F, c, yrs, y, Pr, el, skip = V.F or 1000, V.c or 0, V.yrs, V.y, V.P, V.el or 0, V.skip or 0
  if not yrs then out:need("years to maturity"); return end
  if V.skipy and not V.skip then
    skip = V.skipy * m
    out:note("coupons skipped = years x m = " .. P(V.skipy) .. " x " .. m .. " = " .. P(skip) .. " periods")
  end
  if not V.c and not V.CPNd then out:note("no coupon given: treated as a ZERO-coupon bond") end
  local N = (yrs - el) * m
  local CPN = c * F / m
  local cpnHow = "coupon rate*Face/m = " .. P(c) .. "*" .. P(F) .. "/" .. m
  if V.CPNd then
    CPN = V.CPNd
    c = CPN * m / F
    cpnHow = "given in dollars | coupon rate = CPN*m/F = " .. P(CPN) .. "*" .. m .. "/" .. P(F) .. " = " .. pct(c) .. "%"
  end
  out:head("SETUP")
  out:row("CPN (coupon per period)", CPN, "$", cpnHow, "CPN")
  out:row("N (periods left)", N, "periods", (el > 0) and ("(years - elapsed)*m = (" .. P(yrs) .. " - " .. P(el) .. ")*" .. m)
          or ("years*m = " .. P(yrs) .. "*" .. m), "N")
  if skip > 0 then
    out:note("no coupons for the first " .. P(skip) .. " periods; those " .. P(skip) ..
             " coupons (" .. fmtU(skip * CPN, "$") .. ") are paid at maturity with the face value")
  end
  local yp = y and y / m
  local how = {}
  if not Pr and yp then
    Pr = bondPrice(yp, CPN, F, N, skip)
    how.P = "P = CPN*(1 - 1/(1 + y)^N)/y + F/(1 + y)^N"
  elseif not yp and Pr then
    yp = findRoot(function(yy) return bondPrice(yy, CPN, F, N, skip) - Pr end, -0.5, 3, 0.0025)
    if not yp then out:err("no yield gives that price"); return end
    y = yp * m
    how.y = "y per period found by search so that the price formula = " .. P(Pr)
  elseif not Pr and not yp then
    out:need("yield OR price")
    return
  else
    local chk = bondPrice(yp, CPN, F, N, skip)
    out:check("price " .. fmtU(Pr, "$") .. " agrees with yield (formula gives " .. fmtU(chk, "$") .. ")",
              math.abs(chk - Pr) <= 0.005 * Pr + 0.01)
  end
  out:row("y (yield per period)", yp, "%", how.y or ("y = yield/m = " .. P(y) .. "/" .. m), "yp")
  out:head("PRICE")
  local pvC, pvF
  if skip > 0 then
    pvC = CPN * annFac(yp, N - skip) / (1 + yp) ^ skip
    pvF = (F + skip * CPN) / (1 + yp) ^ N
    out:row("PV of the " .. P(N - skip) .. " live coupons", pvC, "$",
            "CPN*(1 - 1/(1 + y)^" .. P(N - skip) .. ")/y /(1 + y)^" .. P(skip), "pvC")
    out:row("PV of maturity lump (F + deferred)", pvF, "$", "(" .. P(F) .. " + " .. P(skip * CPN) .. ")/(" .. P(1 + yp) .. ")^" .. P(N), "pvF")
  else
    pvC = CPN * annFac(yp, N)
    pvF = F / (1 + yp) ^ N
    out:row("PV of coupons (annuity)", pvC, "$", "CPN*(1 - 1/(1 + y)^N)/y = " .. P(CPN) .. "*" .. P(annFac(yp, N)), "pvC")
    out:row("PV of face value", pvF, "$", "F/(1 + y)^N = " .. P(F) .. "/(" .. P(1 + yp) .. ")^" .. P(N), "pvF")
  end
  out:row("P (bond price)", Pr, "$", how.P and (how.P .. " = " .. P(pvC) .. " + " .. P(pvF)) or nil, "P")
  local tag
  if math.abs(c - y) < 1e-9 then tag = "coupon rate = yield -> PAR (price = face)"
  elseif c > y then tag = "coupon rate " .. pct(c) .. "% > yield " .. pct(y) .. "% -> PREMIUM (price > face)"
  else tag = "coupon rate " .. pct(c) .. "% < yield " .. pct(y) .. "% -> DISCOUNT (price < face)" end
  out:note(tag)
  out:head("YIELD MEASURES")
  out:row("YTM nominal (p.a.)", y, "%", "y per period * m = " .. P(yp) .. "*" .. m, "y")
  out:row("effective annual yield", (1 + yp) ^ m - 1, "%", "EAY = (1 + y)^m - 1 = (" .. P(1 + yp) .. ")^" .. m .. " - 1", "EAY")
  if Pr and Pr > 0 then
    out:row("current yield", c * F / Pr, "%", "annual coupon / price = " .. P(c * F) .. "/" .. P(Pr), "cy")
  end
  -- cash-flow table
  out:tcols({ { k = "CF", u = "$" }, { k = "DF", u = "" }, { k = "PV", u = "$" } })
  local function cfAt(t)
    local cf = (t > skip) and CPN or 0
    if t == N then cf = cf + F + skip * CPN end
    return cf
  end
  local shown = {}
  local Ni = math.floor(N + 1e-9)
  for t = 1, math.min(Ni, 5) do shown[#shown + 1] = t end
  if skip > 0 and skip + 1 <= Ni and skip + 1 > 5 then shown[#shown + 1] = skip + 1 end
  if Ni > 5 then shown[#shown + 1] = Ni end
  for _, t in ipairs(shown) do
    local cf = cfAt(t)
    local df = 1 / (1 + yp) ^ t
    out:trow("t=" .. t, { cf, df, cf * df },
             { (t == N) and ("coupon + face" .. ((skip > 0) and " + deferred coupons" or "")) or ((t <= skip) and "deferred - nothing paid" or "coupon CPN"),
               "1/(1 + y)^t = 1/(" .. P(1 + yp) .. ")^" .. t, "CF*DF = " .. P(cf) .. "*" .. P(df) })
  end
  out:head("EXCEL")
  if skip == 0 then
    out:xl("=PV(" .. P(yp) .. ", " .. P(N) .. ", " .. P(CPN) .. ", " .. P(F) .. ", 0)  -> negative = price")
    if Pr then out:xl("=RATE(" .. P(N) .. ", " .. P(CPN) .. ", -" .. P(Pr) .. ", " .. P(F) .. ")  -> per period, x m") end
  else
    out:xl("=NPV(" .. P(yp) .. ", cash flow list t=1..N)  (deferred coupons: no shortcut)")
  end
end

-- 4.5 BOND REALISED YIELD (sold before maturity) ----------------------
local function solveReal(V, out)
  local m = mOf(V.m)
  local P0, F, c, held, Ps = V.P0, V.F or 1000, V.c or 0, V.held, V.Ps
  if not (P0 and held) then out:need("price paid and years held"); return end
  local CPN = c * F / m
  local cpnHow = P(c) .. "*" .. P(F) .. "/" .. m
  if V.CPNd then
    CPN = V.CPNd
    c = CPN * m / F
    cpnHow = "given in dollars | coupon rate = " .. P(CPN) .. "*" .. m .. "/" .. P(F) .. " = " .. pct(c) .. "%"
  end
  local N = held * m
  out:head("SETUP")
  out:row("CPN (coupon per period)", CPN, "$", cpnHow, "CPN")
  out:row("N (periods held)", N, "periods", P(held) .. "*" .. m, "N")
  out:note("years held = time from buying to selling ('10 years ago' -> 10), NOT the bond's total life")
  if V.yrsT and held >= V.yrsT then
    out:add("bad", "CHECK: years held (" .. P(held) .. ") is the bond's whole life - then it matured and paid the face value; the realised yield equals the YTM. If it was SOLD early, held must be less")
  end
  if not Ps then
    if V.ys and V.yrsT then
      local rem = (V.yrsT - held) * m
      Ps = bondPrice(V.ys / m, CPN, F, rem)
      out:row("sale price (from yield at sale)", Ps, "$", "bond price with " .. P(rem) ..
              " periods left at y = " .. P(V.ys / m) .. " per period", "Ps")
    else
      out:need("sale price (or yield at sale + years to maturity at purchase)")
      return
    end
  else
    out:row("sale price", Ps, "$", nil, "Ps")
  end
  local cfs = { [0] = -P0 }
  local Ni = math.floor(N + 1e-9)
  for t = 1, Ni do cfs[t] = CPN end
  cfs[Ni] = cfs[Ni] + Ps
  local ip = irrOf(cfs, Ni)
  if not ip then out:err("no IRR found"); return end
  out:head("REALISED YIELD = IRR of what you paid and got")
  out:row("IRR per period", ip, "%", "rate where -P0 + sum CPN/(1 + i)^t + Ps/(1 + i)^N = 0", "ip")
  out:row("realised yield nominal (p.a.)", ip * m, "%", "IRR per period * m = " .. P(ip) .. "*" .. m, "ry")
  out:row("realised yield effective (p.a.)", (1 + ip) ^ m - 1, "%", "(1 + i)^m - 1 = (" .. P(1 + ip) .. ")^" .. m .. " - 1", "rye")
  out:row("total coupons received", CPN * Ni, "$", P(CPN) .. "*" .. Ni, "coupons")
  out:row("capital gain on sale", Ps - P0, "$", P(Ps) .. " - " .. P(P0), "gain")
  out:tcols({ { k = "CF", u = "$" } })
  out:trow("t=0", { -P0 }, { "price paid (outflow)" })
  for t = 1, math.min(Ni - 1, 3) do out:trow("t=" .. t, { CPN }, { "coupon" }) end
  if Ni > 4 then out:trow("...", { CPN }, { "coupons continue every period" }) end
  out:trow("t=" .. Ni, { cfs[Ni] }, { "last coupon + sale price = " .. P(CPN) .. " + " .. P(Ps) })
  out:head("EXCEL")
  out:xl("=IRR({-" .. P(P0) .. ", " .. P(CPN) .. " x" .. (Ni - 1) .. ", " .. P(cfs[Ni]) .. "})  then x" .. m)
  out:xl("or =RATE(" .. Ni .. ", " .. P(CPN) .. ", -" .. P(P0) .. ", " .. P(Ps) .. ")  then x" .. m)
end

-- 4.6 SHARES: zero growth, CDGM, P1, dividend, yields, two-stage ------
local function solveShare(V, out)
  local D0, D1, g, rE, P0, P1 = V.D0, V.D1, V.g, V.rE, V.P0, V.P1
  local how = {}
  if D0 and not D1 then
    local gg = g or 0
    D1 = D0 * (1 + gg)
    how.D1 = "Div1 = Div0*(1 + g) = " .. P(D0) .. "*" .. P(1 + gg) .. "  ('just paid' = Div0" ..
             ((g == nil) and "; g blank = no growth, so Div1 = Div0" or "") .. ")"
  end
  if not rE and V.g and not P0 then
    out:add("bad", "CHECK: rE is blank but g is filled - the RETURN investors require goes in rE; g is only the GROWTH of the dividend (0 for a preference share)")
  end
  -- two-stage
  if V.nh and V.g1 and rE and g and (D0 or D1) then
    local g1, nh = V.g1, math.floor(V.nh + 1e-9)
    out:head("TWO-STAGE: " .. pct(g1) .. " % for " .. nh .. " yrs, then " .. pct(g) .. " %")
    out:tcols({ { k = "Div", u = "$" }, { k = "DF", u = "" }, { k = "PV", u = "$" } })
    local d = D0 and D0 or (D1 / (1 + g1))
    local sum = 0
    local dn
    for t = 1, nh do
      d = d * (1 + g1)
      dn = d
      local df = 1 / (1 + rE) ^ t
      sum = sum + d * df
      out:trow("t=" .. t, { d, df, d * df }, { "Div" .. (t - 1) .. "*(1 + g1) = x" .. P(1 + g1),
               "1/(1 + rE)^" .. t, "Div*DF" })
    end
    local dnext = dn * (1 + g)
    local Pn = dnext / (rE - g)
    local dfn = 1 / (1 + rE) ^ nh
    out:trow("P" .. nh, { Pn, dfn, Pn * dfn }, { "Div" .. (nh + 1) .. "/(rE - g) = " .. P(dnext) .. "/" .. P(rE - g),
             "discounted " .. nh .. " periods (NOT " .. (nh + 1) .. ")", "Pn*DF" })
    out:row("PV of high-growth dividends", sum, "$", "sum of Div_t/(1 + rE)^t, t = 1.." .. nh, "pvHigh")
    out:row("P" .. nh .. " (terminal value at t = " .. nh .. ")", Pn, "$", "Div" .. (nh + 1) .. "/(rE - g) = " .. P(dnext) .. "/" .. P(rE - g), "Pn")
    out:row("P0 (today)", sum + Pn * dfn, "$", P(sum) .. " + " .. P(Pn) .. "/(" .. P(1 + rE) .. ")^" .. nh, "P0")
    return
  end
  g = g or 0
  if not P0 and D1 and rE then
    if rE <= g then out:err("needs rE > g for the growth model"); return end
    P0 = D1 / (rE - g)
    how.P0 = (g == 0) and ("P0 = Div1/rE = " .. P(D1) .. "/" .. P(rE) .. "  (perpetuity)")
             or ("P0 = Div1/(rE - g) = " .. P(D1) .. "/(" .. P(rE) .. " - " .. P(g) .. ")")
  elseif not rE and P0 and D1 then
    if P1 then
      rE = (D1 + P1) / P0 - 1
      how.rE = "rE = (Div1 + P1)/P0 - 1 = (" .. P(D1) .. " + " .. P(P1) .. ")/" .. P(P0) .. " - 1"
    else
      rE = D1 / P0 + g
      how.rE = "rE = Div1/P0 + g = " .. P(D1) .. "/" .. P(P0) .. " + " .. P(g)
    end
  elseif not D1 and P0 and P1 and rE then
    D1 = P0 * (1 + rE) - P1
    how.D1 = "Div1 = P0*(1 + rE) - P1 = " .. P(P0) .. "*" .. P(1 + rE) .. " - " .. P(P1)
  elseif not V.g and P0 and D1 and rE then
    g = rE - D1 / P0
    how.g = "g = rE - Div1/P0 = " .. P(rE) .. " - " .. P(D1) .. "/" .. P(P0)
  end
  if not P1 and P0 then
    if V.g or (D1 and rE) then
      P1 = P0 * (1 + g)
      how.P1 = "P1 = P0*(1 + g) = " .. P(P0) .. "*" .. P(1 + g) .. "  (price grows at g)"
    end
  end
  out:head("DIVIDENDS")
  out:row("Div0 (just paid)", D0, "$", nil, "D0")
  out:row("Div1 (next dividend)", D1, "$", how.D1, "D1")
  if D1 and (V.g or how.g) then out:row("Div2", D1 * (1 + g), "$", "Div1*(1 + g)", "D2") end
  out:head("PRICE + RETURN")
  out:row("g (growth)", g, "%", how.g, "g")
  out:row("rE (required return)", rE, "%", how.rE, "rE")
  out:row("P0 (price today)", P0, "$", how.P0, "P0")
  out:row("P1 (price in one year)", P1, "$", how.P1, "P1")
  if P0 and D1 and rE and P1 and D1 then
    local chk = (D1 + P1) / (1 + rE)
    if math.abs(chk - P0) > 0.01 * P0 + 0.005 then
      out:note("(Div1 + P1)/(1 + rE) = " .. fmtU(chk, "$") .. " - differs from P0: inputs not a constant-growth set")
    end
  end
  if P0 then
    out:head("YIELDS")
    if D1 then out:row("dividend yield", D1 / P0, "%", "Div1/P0 = " .. P(D1) .. "/" .. P(P0), "dy") end
    if P1 then out:row("capital gain yield", (P1 - P0) / P0, "%", "(P1 - P0)/P0 = (" .. P(P1) .. " - " .. P(P0) .. ")/" .. P(P0), "cgy") end
    if D1 and P1 then out:row("total return", (D1 + P1 - P0) / P0, "%", "dividend yield + capital gain yield", "tr") end
  end
  if not (P0 or (D1 and rE)) then
    out:need("Div (0 or 1), g and rE -> P0 | or P0, P1 and rE -> Div1 | or P0, Div1 -> rE")
  end
  if P0 and D1 and rE then
    out:tcols({ { k = "Div", u = "$" }, { k = "DF", u = "" }, { k = "PV", u = "$" } })
    local d = D1
    for t = 1, 4 do
      local df = 1 / (1 + rE) ^ t
      out:trow("t=" .. t, { d, df, d * df }, { (t == 1) and "Div1" or ("Div1*(1 + g)^" .. (t - 1)), "1/(1 + rE)^" .. t, "Div*DF" })
      d = d * (1 + g)
    end
    out:note("dividends go on forever; the CDGM sums them all: P0 = Div1/(rE - g)")
  end
end

-- 4.7 CASH FLOW STREAM: NPV / IRR / payback / PI / crossover ----------
local function buildCFs(V, pre)
  local cfs, nmax = {}, 0
  cfs[0] = V[pre .. "0"] or 0
  local any = false
  for t = 1, 8 do
    local c = V[pre .. t]
    if c then cfs[t] = c; nmax = t; any = true end
  end
  if not any and V[pre .. "lev"] and V[pre .. "yrs"] then
    local yrs = math.floor(V[pre .. "yrs"] + 1e-9)
    for t = 1, yrs do cfs[t] = V[pre .. "lev"] end
    nmax = yrs
    any = true
  end
  if not any and V[pre .. "0"] == nil then return nil end
  return cfs, nmax
end

local function analyseProject(out, name, cfs, nmax, k)
  out:head("PROJECT " .. name)
  local pvIn, npv = 0, nil
  if k then
    for t = 1, nmax do if cfs[t] then pvIn = pvIn + cfs[t] / (1 + k) ^ t end end
    npv = pvIn + cfs[0]
    out:row(name .. ": PV of inflows (t >= 1)", pvIn, "$", "sum CF_t/(1 + k)^t, t = 1.." .. nmax, "pvIn" .. name)
    out:row(name .. ": NPV", npv, "$", "PV of inflows + CF0 = " .. P(pvIn) .. " + (" .. P(cfs[0]) .. ")", "NPV" .. name)
    out:add(npv >= 0 and "ok" or "bad", name .. ": NPV " .. (npv >= 0 and ">= 0 -> ACCEPT (creates value)" or "< 0 -> REJECT"))
  end
  local irr, nroots = irrOf(cfs, nmax)
  local sc = signChanges(cfs, nmax)
  if sc == 0 then
    out:add("bad", "CHECK " .. name .. ": every cash flow has the same sign, so there is no IRR or payback. " ..
            "For a project, type the outlay at t = 0 as NEGATIVE, e.g. -60 (use the (-) key)")
  end
  if irr then
    out:row(name .. ": IRR", irr, "%", "rate where NPV = 0 (found by search)", "IRR" .. name)
    if k then
      out:add(irr >= k and "ok" or "bad", name .. ": IRR " .. (irr >= k and ">= k -> accept by IRR rule" or "< k -> reject by IRR rule"))
    end
  else
    out:note(name .. ": no IRR exists (NPV never crosses zero)")
  end
  if sc ~= 1 then
    out:note(name .. ": " .. sc .. " sign changes in the cash flows -> up to " .. sc .. " IRRs possible (" .. nroots .. " found)")
  end
  -- payback
  if cfs[0] < 0 then
    local cum, pb = cfs[0], nil
    for t = 1, nmax do
      local c = cfs[t] or 0
      if cum + c >= 0 and not pb then
        pb = (t - 1) + ((c ~= 0) and (-cum / c) or 0)
        out:row(name .. ": payback", pb, "years", "(" .. (t - 1) .. ") + " .. P(-cum) .. "/" .. P(c) ..
                " = years before recovery + still owed/next CF", "PB" .. name)
      end
      cum = cum + c
    end
    if not pb then out:note(name .. ": never pays back (cumulative stays negative)") end
    if k then
      local cumd, dpb = cfs[0], nil
      for t = 1, nmax do
        local pv = (cfs[t] or 0) / (1 + k) ^ t
        if cumd + pv >= 0 and not dpb then
          dpb = (t - 1) + ((pv ~= 0) and (-cumd / pv) or 0)
          out:row(name .. ": discounted payback", dpb, "years", "same rule on the PV column", "DPB" .. name)
        end
        cumd = cumd + pv
      end
      if not dpb then out:note(name .. ": discounted payback: never") end
    end
    if k then
      local inv = -cfs[0]
      out:row(name .. ": PI (this unit) = NPV/investment", npv / inv, "", P(npv) .. "/" .. P(inv) .. "  accept if > 0", "PI" .. name)
      out:row(name .. ": PI textbook = PV inflows/investment", pvIn / inv, "", P(pvIn) .. "/" .. P(inv) .. "  accept if > 1", "PIalt" .. name)
    end
  else
    out:note(name .. ": CF0 is not an outflow -> no payback/PI; NPV = PV of the whole stream (a project outlay must be typed NEGATIVE)")
  end
  return npv, irr
end

-- NPV-profile (graph) question: no cash flows, just reasoning + elimination
local function solveGraph(V, out)
  local k, cross = V.k, V.cross
  local rising = (V.rise ~= "DECLINING cash flows")
  out:head("NPV PROFILE - READING THE GRAPH")
  out:row("crossover rate", cross, "%", "where the two NPV lines meet: both projects have the SAME NPV there", "cross")
  out:row("k (cost of capital)", k, "%", "the rate you actually discount at", "k")
  if not cross then out:need("the crossover rate (where the profiles cross)") end
  if k and cross then
    if k < cross then
      out:add("bad", "k < crossover -> CONFLICT ZONE: NPV and IRR disagree. Follow NPV.")
      out:note("below the crossover the project with LATER (rising) cash flows has the HIGHER NPV -> choose it, even though its IRR is lower")
    else
      out:add("ok", "k > crossover -> NPV and IRR agree: the higher-IRR project also has the higher NPV")
    end
  end
  out:head(rising and "ASKED PROJECT: RISING CASH FLOWS" or "ASKED PROJECT: DECLINING CASH FLOWS")
  if rising then
    out:note("rising = money arrives LATE = hit hardest by a higher rate = the STEEPER line = the LOWER IRR")
    if cross then out:note("its IRR sits ABOVE the crossover (" .. pct(cross) .. "%) and BELOW the other project's IRR") end
  else
    out:note("declining = money arrives EARLY = less sensitive = the FLATTER line = the HIGHER IRR")
    if cross then out:note("its IRR sits ABOVE the crossover (" .. pct(cross) .. "%) and ABOVE the other project's IRR") end
  end
  local opts = {}
  for i = 1, 4 do if V["o" .. i] then table.insert(opts, { i = i, v = V["o" .. i] }) end end
  if #opts > 0 and cross then
    out:head("OPTIONS")
    local left = {}
    for _, o in ipairs(opts) do
      local why
      if math.abs(o.v - cross) < 0.0005 then why = "= the crossover: a distractor, not an IRR"
      elseif o.v < cross then why = "below the crossover: NPV is still positive there, so no"
      elseif V.irrO and rising and o.v >= V.irrO then why = "not below the other project's IRR (" .. pct(V.irrO) .. "%)"
      elseif V.irrO and not rising and o.v <= V.irrO then why = "not above the other project's IRR (" .. pct(V.irrO) .. "%)"
      else why = "possible"; table.insert(left, o) end
      out:add(why == "possible" and "ok" or "note", "option " .. o.i .. " = " .. pct(o.v) .. "% : " .. why)
    end
    if #left == 1 then
      out:row("answer", left[1].v, "%", "the only option that fits", "ans")
    elseif #left > 1 then
      local t = {}
      for _, o in ipairs(left) do table.insert(t, pct(o.v) .. "%") end
      out:note(#left .. " options still fit: " .. table.concat(t, ", ") .. ". Read the graph: where does the " ..
               (rising and "STEEPER" or "FLATTER") .. " line cross the axis? " ..
               (rising and "the nearer one to the crossover is usually it" or "the one furthest right is usually it"))
    else
      out:add("bad", "no option fits - check which project is the rising one")
    end
  elseif #opts == 0 then
    out:note("type the answer options to have them eliminated")
  end
end

local function solveCF(V, out)
  if V.cmp == "graph question (no cash flows)" then solveGraph(V, out); return end
  local k = V.k
  local A, nA = buildCFs(V, "A")
  if not A then out:need("cash flows for A: CF0 (outlay, negative) and CF1.. (or a level CF + years)"); return end
  if not k then out:note("no k given: NPV, PI and discounted payback skipped") end
  out:tcols({ { k = "CF", u = "$" }, { k = "DF", u = "" }, { k = "PV", u = "$" }, { k = "cumPV", u = "$" } })
  local function tableFor(name, cfs, nmax)
    local cum = 0
    for t = 0, nmax do
      local c = cfs[t] or 0
      local df = k and (1 / (1 + k) ^ t) or 1
      cum = cum + c * df
      out:trow(name .. t, { c, df, c * df, cum },
               { (t == 0) and "today - not discounted" or "cash flow at t = " .. t,
                 k and ("1/(1 + k)^t = 1/(" .. P(1 + k) .. ")^" .. t) or "no k given",
                 "CF*DF = " .. P(c) .. "*" .. P(df), "running total of PV -> NPV at the end" })
    end
  end
  local npvA, irrA = analyseProject(out, "A", A, nA, k)
  tableFor("A", A, nA)
  if V.cmp == "A and B" then
    local B, nB = buildCFs(V, "B")
    if not B then out:need("cash flows for B"); return end
    local npvB, irrB = analyseProject(out, "B", B, nB, k)
    tableFor("B", B, nB)
    out:head("A vs B (mutually exclusive)")
    local nmax = math.max(nA, nB)
    local inc = {}
    for t = 0, nmax do inc[t] = (A[t] or 0) - (B[t] or 0) end
    local cross = irrOf(inc, nmax)
    out:note("incremental (A - B): {" .. excelList(inc, nmax) .. "}")
    if cross then
      out:row("crossover rate = IRR(A - B)", cross, "%", "rate where NPV_A = NPV_B", "cross")
      if k then
        if k < cross then
          out:add("bad", "k < crossover -> CONFLICT ZONE: NPV and IRR can disagree - follow NPV")
        else
          out:add("ok", "k > crossover -> NPV and IRR agree")
        end
      end
    else
      out:note("profiles do not cross at a positive rate")
    end
    if npvA and npvB then
      local win = (npvA >= npvB) and "A" or "B"
      out:add("ok", "highest NPV: " .. win .. "  (" .. fmtU(math.max(npvA, npvB), "$") .. ") -> choose " .. win ..
              ((math.max(npvA, npvB) < 0) and " - but NPV < 0 so reject both" or ""))
    end
    if irrA and irrB then
      out:note("highest IRR: " .. ((irrA >= irrB) and "A" or "B") .. " - IRR ranking is NOT the rule when they disagree")
    end
    out:head("EXCEL")
    if k then out:xl("=NPV(" .. P(k) .. ", " .. excelList(B, nB):gsub("^[^,]*,", "") .. ") + (" .. P(B[0]) .. ")   [B]") end
    out:xl("crossover: =IRR({" .. excelList(inc, nmax) .. "})")
  end
  out:head("EXCEL")
  if k then out:xl("=NPV(" .. P(k) .. ", " .. excelList(A, nA):gsub("^[^,]*,", "") .. ") + (" .. P(A[0]) .. ")   NPV excludes t=0!") end
  out:xl("=IRR({" .. excelList(A, nA) .. "})   IRR includes t=0")
end

-- 4.8 EAA / EAC: projects with different lives -------------------------
local function solveEAA(V, out)
  local k = V.k
  local costs = (V.kind == "costs (EAC)")
  if not k then
    if V.EAAA and V.EAAB then
      out:head("DECISION (EAA/EAC given directly)")
      local win
      if costs then win = (V.EAAA <= V.EAAB) and "A" or "B" else win = (V.EAAA >= V.EAAB) and "A" or "B" end
      out:add("ok", "choose " .. win .. ": " .. (costs and "LOWER EAC wins (costs)" or "HIGHER EAA wins (benefits)") ..
              "  A = " .. fmtU(V.EAAA, "$") .. " | B = " .. fmtU(V.EAAB, "$"))
      out:note("raw NPVs are not comparable when the lives differ")
      out:note("add k to see each NPV rebuilt from its EAA")
      return
    end
    out:need("k (cost of capital)"); return
  end
  local vals = {}
  for _, nm in ipairs({ "A", "B" }) do
    local npv, t, eaa = V["NPV" .. nm], V["t" .. nm], V["EAA" .. nm]
    if t then
      local f = annFac(k, t)
      out:head("PROJECT " .. nm .. "  (" .. P(t) .. " years)")
      out:row(nm .. ": annuity factor", f, "", "(1 - 1/(1 + k)^t)/k = (1 - 1/(" .. P(1 + k) .. ")^" .. P(t) .. ")/" .. P(k), "fac" .. nm)
      if npv and not eaa then
        eaa = npv / f
        out:row(nm .. ": NPV", npv, "$", nil, "NPV" .. nm)
        out:row(nm .. ": " .. (costs and "EAC" or "EAA"), eaa, "$", "NPV*k/(1 - 1/(1 + k)^t) = " .. P(npv) .. "/" .. P(f), "EAA" .. nm)
      elseif eaa and not npv then
        npv = eaa * f
        out:row(nm .. ": " .. (costs and "EAC" or "EAA"), eaa, "$", nil, "EAA" .. nm)
        out:row(nm .. ": NPV", npv, "$", "EAA*factor = " .. P(eaa) .. "*" .. P(f), "NPV" .. nm)
      elseif eaa and npv then
        out:check(nm .. ": NPV and EAA agree", math.abs(npv / f - eaa) <= 0.005 * math.abs(eaa) + 0.01)
      else
        out:need(nm .. ": NPV (or EAA)")
      end
      if eaa then vals[nm] = { eaa = eaa, npv = npv } end
    end
  end
  if vals.A and vals.B then
    out:head("DECISION")
    local a, b = vals.A.eaa, vals.B.eaa
    local win
    if costs then win = (a <= b) and "A" or "B" else win = (a >= b) and "A" or "B" end
    out:add("ok", "choose " .. win .. ": " .. (costs and "LOWER EAC wins (costs)" or "HIGHER EAA wins (benefits)") ..
            "  A = " .. fmtU(a, "$") .. " | B = " .. fmtU(b, "$"))
    if vals.A.npv and vals.B.npv then
      local nw = (vals.A.npv >= vals.B.npv) and "A" or "B"
      if (costs and ((vals.A.npv <= vals.B.npv) and "A" or "B") or nw) ~= win then
        out:note("raw NPV points the other way - lives differ, so NPV alone is NOT comparable")
      end
    end
  elseif not (V.tA or V.tB) then
    out:need("years for A and B (t), plus NPV or EAA for each")
  end
end

-- 4.9 FCF / DEPRECIATION / SALVAGE / TERMINAL ---------------------------
local function solveFCF(V, out)
  local Tc = V.Tc
  local any = false
  if V.Rev or V.Costs or V.Dep then
    any = true
    out:head("FREE CASH FLOW (one year)")
    if not Tc then out:need("Tc (tax rate) for FCF") else
      local Rev, Costs, Dep, CapEx, dNWC = V.Rev or 0, V.Costs or 0, V.Dep or 0, V.CapEx or 0, V.dNWC or 0
      local ebit = Rev - Costs - Dep
      out:row("EBIT = Rev - Costs - Dep", ebit, "$", P(Rev) .. " - " .. P(Costs) .. " - " .. P(Dep), "EBIT")
      out:row("tax = Tc*EBIT", Tc * ebit, "$", P(Tc) .. "*" .. P(ebit), "tax")
      out:row("after-tax operating income", ebit * (1 - Tc), "$", "EBIT*(1 - Tc) = " .. P(ebit) .. "*" .. P(1 - Tc), "NOPAT")
      out:row("depreciation tax shield", Tc * Dep, "$", "Tc*Dep = " .. P(Tc) .. "*" .. P(Dep), "shield")
      local fcf = ebit * (1 - Tc) + Dep - CapEx - dNWC
      out:row("FCF (method 1)", fcf, "$", "(Rev - Costs - Dep)*(1 - Tc) + Dep - CapEx - dNWC = " ..
              P(ebit * (1 - Tc)) .. " + " .. P(Dep) .. " - " .. P(CapEx) .. " - " .. P(dNWC), "FCF")
      local fcf2 = (Rev - Costs) * (1 - Tc) + Tc * Dep - CapEx - dNWC
      out:row("FCF (method 2, check)", fcf2, "$", "(Rev - Costs)*(1 - Tc) + Tc*Dep - CapEx - dNWC = " ..
              P((Rev - Costs) * (1 - Tc)) .. " + " .. P(Tc * Dep) .. " - " .. P(CapEx) .. " - " .. P(dNWC), "FCF2")
      out:check("both methods agree", math.abs(fcf - fcf2) < 0.01)
    end
  end
  local BV = V.BV
  if V.cost then
    any = true
    out:head("DEPRECIATION")
    local cost, salv, life, yr = V.cost, V.salv or 0, V.life, V.yr
    if life then
      local sl = (cost - salv) / life
      out:row("straight-line per year", sl, "$", "(cost - salvage)/life = (" .. P(cost) .. " - " .. P(salv) .. ")/" .. P(life), "SL")
      if yr then
        local bv = cost - sl * yr
        out:row("book value after year " .. P(yr) .. " (SL)", bv, "$", "cost - SL*years = " .. P(cost) .. " - " .. P(sl) .. "*" .. P(yr), "BVsl")
        if not BV then BV = bv end
      end
    end
    if V.dvr then
      local d = V.dvr
      local bv, dep = cost, 0
      local upto = yr or life or 1
      out:tcols({ { k = "dep", u = "$" }, { k = "BV", u = "$" } })
      for y = 1, math.floor(upto + 1e-9) do
        dep = d * bv
        local open = bv
        bv = bv - dep
        if y <= 12 then
          out:trow("yr" .. y, { dep, bv }, { "rate*opening BV = " .. P(d) .. "*" .. P(open), "opening BV - dep = " .. P(open) .. " - " .. P(dep) })
        end
      end
      out:row("diminishing value dep in year " .. P(upto), dep, "$", "rate * book value at start of that year", "DV")
      out:row("book value after year " .. P(upto) .. " (DV)", bv, "$", "cost*(1 - rate)^years = " .. P(cost) .. "*" .. P(1 - d) .. "^" .. P(upto), "BVdv")
      if not V.BV and not (life and yr) then BV = bv end
    elseif life and not V.dvr then
      out:tcols({ { k = "dep", u = "$" }, { k = "BV", u = "$" } })
      local sl = (cost - salv) / life
      for y = 1, math.min(math.floor(life + 1e-9), 12) do
        out:trow("yr" .. y, { sl, cost - sl * y }, { "(cost - salvage)/life", "cost - " .. y .. "*SL" })
      end
    end
    if not life and not V.dvr then out:need("life (for straight-line) or DV rate") end
  end
  if V.sale then
    any = true
    out:head("AFTER-TAX SALVAGE")
    if not Tc then out:need("Tc (tax rate)") else
      local bv = BV or 0
      if not V.BV then
        if BV then out:note("book value taken from the depreciation section")
        else out:add("bad", "CHECK: book value is BLANK, so the whole sale price is taxed (fully depreciated). If the question gives a book value, type it in 'SALE: book value then'") end
      end
      local gain = V.sale - bv
      out:row("gain on sale = sale - book value", gain, "$", P(V.sale) .. " - " .. P(bv), "gain")
      out:row("tax on gain", Tc * gain, "$", "Tc*gain = " .. P(Tc) .. "*" .. P(gain) .. (gain < 0 and "  (negative = tax SAVING)" or ""), "taxgain")
      local ats = V.sale - Tc * gain
      out:row("after-tax salvage", ats, "$", "sale - Tc*(sale - BV) = " .. P(V.sale) .. " - " .. P(Tc * gain), "ATS")
      if V.opFCF or V.NWCrec then
        out:head("TERMINAL YEAR TOTAL")
        local op, nwc = V.opFCF or 0, V.NWCrec or V.dNWC or 0
        if not V.NWCrec and V.dNWC then out:note("NWC recovered = the dNWC entered above (comes back untaxed)") end
        out:row("terminal cash flow", op + ats + nwc, "$", "operating FCF + after-tax salvage + NWC recovered = " ..
                P(op) .. " + " .. P(ats) .. " + " .. P(nwc), "TCF")
      end
    end
  elseif V.opFCF or V.NWCrec then
    any = true
    out:head("TERMINAL YEAR TOTAL (no sale)")
    local op, nwc = V.opFCF or 0, V.NWCrec or V.dNWC or 0
    out:row("terminal cash flow", op + nwc, "$", "operating FCF + NWC recovered = " .. P(op) .. " + " .. P(nwc), "TCF")
  end
  if V.nom and V.infl and not V.real then
    any = true
    out:head("FISHER")
    out:row("real rate", (1 + V.nom) / (1 + V.infl) - 1, "%", "(1 + n)/(1 + i) - 1 = " .. P(1 + V.nom) .. "/" .. P(1 + V.infl) .. " - 1", "real")
    out:note("NOT n - i = " .. pct(V.nom - V.infl) .. "% (approximation only)")
  end
  if not any then
    out:need("some inputs: Rev/Costs/Dep (FCF) | cost + life (depreciation) | sale price (salvage) | op FCF (terminal)")
  end
end

-- 4.10 RATES TOOLKIT: EAR <-> nominal <-> periodic, Fisher, continuous --
local function solveRates(V, out)
  local m = mOf(V.m)
  local r, EAR, per, rc = V.r, V.EAR, V.per, V.rc
  local any = false
  if r or EAR or per or rc then
    any = true
    out:head("SAME RATE, FOUR WAYS  (m = " .. m .. ")")
    if r then per = per or r / m
      out:row("i (rate per period)", per, "%", "r/m = " .. P(r) .. "/" .. m, "i")
      EAR = EAR or (1 + per) ^ m - 1
    elseif per then r = per * m
      out:row("r (nominal p.a.)", r, "%", "i*m = " .. P(per) .. "*" .. m, "r")
      EAR = EAR or (1 + per) ^ m - 1
    elseif EAR then
      per = (1 + EAR) ^ (1 / m) - 1
      r = per * m
      out:row("i (rate per period)", per, "%", "(1 + EAR)^(1/m) - 1 = (" .. P(1 + EAR) .. ")^(1/" .. m .. ") - 1", "i")
      out:row("r (nominal p.a.)", r, "%", "i*m = " .. P(per) .. "*" .. m, "r")
    elseif rc then
      EAR = math.exp(rc) - 1
      out:row("EAR from continuous", EAR, "%", "e^rc - 1 = e^" .. P(rc) .. " - 1", "EAR")
      per = (1 + EAR) ^ (1 / m) - 1
      r = per * m
      out:row("i (rate per period)", per, "%", "(1 + EAR)^(1/m) - 1", "i")
      out:row("r (nominal p.a.)", r, "%", "i*m", "r")
    end
    if V.r and V.EAR then
      out:check("r and EAR agree", math.abs((1 + V.r / m) ^ m - 1 - V.EAR) < 1e-6)
    end
    out:row("EAR (effective annual)", EAR, "%", "(1 + i)^m - 1 = (" .. P(1 + per) .. ")^" .. m .. " - 1", "EAR")
    out:row("rc (continuous equivalent)", ln(1 + EAR), "%", "ln(1 + EAR) = ln(" .. P(1 + EAR) .. ")", "rc")
    if V.m2 then
      local m2 = mOf(V.m2)
      local per2 = (1 + EAR) ^ (1 / m2) - 1
      out:head("SAME EAR AT m = " .. m2)
      out:row("rate per period (m = " .. m2 .. ")", per2, "%", "(1 + EAR)^(1/m2) - 1 = (" .. P(1 + EAR) .. ")^(1/" .. m2 .. ") - 1", "i2")
      out:row("nominal p.a. (m = " .. m2 .. ")", per2 * m2, "%", "i2*m2 = " .. P(per2) .. "*" .. m2, "r2")
      out:note("use i2 to discount cash flows that arrive " .. m2 .. " times a year")
    end
  end
  local nom, real, infl = V.nom, V.real, V.infl
  if not nom and infl and r and not V.EAR and not V.per then
    nom = r
    out:note("using the quoted rate " .. pct(r) .. "% as the nominal rate for the inflation (Fisher) step")
  end
  if count(nom, real, infl) >= 2 then
    any = true
    out:head("FISHER: (1 + n) = (1 + r)(1 + i)")
    if not real then
      real = (1 + nom) / (1 + infl) - 1
      out:row("real rate r", real, "%", "(1 + n)/(1 + i) - 1 = " .. P(1 + nom) .. "/" .. P(1 + infl) .. " - 1", "real")
    elseif not nom then
      nom = (1 + real) * (1 + infl) - 1
      out:row("nominal rate n", nom, "%", "(1 + r)(1 + i) - 1 = " .. P(1 + real) .. "*" .. P(1 + infl) .. " - 1", "nom")
    elseif not infl then
      infl = (1 + nom) / (1 + real) - 1
      out:row("inflation i", infl, "%", "(1 + n)/(1 + r) - 1 = " .. P(1 + nom) .. "/" .. P(1 + real) .. " - 1", "infl")
    else
      out:check("Fisher holds", math.abs((1 + real) * (1 + infl) - (1 + nom)) < 1e-6)
    end
    out:note("approximation n - i = " .. pct(nom - infl) .. "% is NOT the answer - use the exact form")
    out:note("nominal cash flows at the nominal rate | real at real - never mix")
  end
  if not any then
    out:need("one of r / EAR / i / rc (with m)  or two of nominal, real, inflation")
  end
end

----------------------------------------------------------------------
-- 5. NOTES PAGES  (N key): HOW TO USE | formulas | traps
----------------------------------------------------------------------

local TRAPS_COMMON = [[
TRAPS (every question)
- rates go in as PERCENT: 7 not 0.07
- i = r/m and N = n*m: convert BOTH
- show workings: formula, numbers, answer]]

local NOTES = {
-- 1 lump sum
[[LUMP SUM: one amount moved in time.

HOW TO USE
Fill any THREE of PV, FV, r, n.
Leave the unknown BLANK - it is solved.
"double / triple your money": type the
multiple (2 or 3), leave PV and FV blank.
Set m to how often interest compounds.
Have only the EAR? type it in the EAR
slot and leave r blank.

FORMULAS  (i = r/m, N = n*m)
$$FV = PV*(1 + i)^N
$$PV = (FV)/((1 + i)^N)
$$N = (ln(FV/PV))/(ln(1 + i))
$$i = (FV/PV)^(1/N) - 1
$$EAR = (1 + r/m)^m - 1
continuous compounding:
$FV = PV*e^(r*n)$   $PV = FV/e^(r*n)$
$EAR = e^r - 1$
(no calculator / Excel function)

READ THE WORDING
"compounded monthly" -> m = 12
"p.a." = nominal annual rate r
"effective" -> the EAR slot
]] .. TRAPS_COMMON,

-- 2 annuity
[[ANNUITY / PERPETUITY: equal (or growing)
payments, every period.

HOW TO USE
C = the FIRST payment. n = how many
payments (BLANK = perpetuity, forever).
Fill any three of C, r, n, PV -> the
fourth is solved (FV works instead of PV).
"beginning of each period" / rent /
lease -> timing = start (due).
First payment later than t = 1 ->
type its t in "first payment at t".
Offer vs asking price: fill price ->
NPV = PV - price, accept if NPV >= 0.

FORMULAS  (i = r/m, N = n*m)
$$PV = C*(1 - 1/(1 + i)^N)/i
$$FV = C*((1 + i)^N - 1)/i
perpetuity:  $PV = C/i$
growing:  $PV = C/(i - g)$  (needs g < i)
$$PV = C*(1 - ((1 + g)/(1 + i))^N)/(i - g)
annuity due = ordinary * (1 + i)
deferred: value sits ONE period before
the first payment -> discount the rest:
$PV0 = PV_formula/(1 + i)^(t_first - 1)$
$$N = -(ln(1 - PV*i/C))/(ln(1 + i))

READ THE WORDING
"forever" / "endowment" / "trust" /
"indefinitely" -> n blank (perpetuity)
"first payment in 2 years" -> t = 2
"end of year 6" -> t = 6
"maximum you should pay" -> PV
"buyer offers ... you want $X" -> price
"beginning / in advance" -> due
"growing at g" -> g slot
]] .. TRAPS_COMMON,

-- 3 loan
[[LOAN: a loan is the PV of its repayments.

HOW TO USE
Fill L, years, r, m -> PMT.
Any three of L, r, years, PMT solves
the fourth.
"after k payments / years in" -> type
k in PAYMENTS (years x m).
"rate changes to" -> new r slot; the
new PMT is on the remaining balance.

FORMULAS  (i = r/m, N = years*m)
$$PMT = (L)/((1 - 1/(1 + i)^N)/i)
balance after k payments = PV of the
N - k payments still to come:
$$B_k = PMT*(1 - 1/(1 + i)^(N - k))/i
or $B_k = L*(1 + i)^k - PMT*((1 + i)^k - 1)/i$
interest in payment k+1: $i*B_k$
principal = PMT - interest
new rate: $PMT_new = B_k/factor(i_new, N - k)$

FACTS FOR CONCEPT QUESTIONS
interest part of each payment FALLS,
principal part RISES over the loan.
shorter loan -> larger payments.
]] .. TRAPS_COMMON,

-- 4 bond
[[BOND: coupons (annuity) + face value (lump).

HOW TO USE
Face default 1000. coupon = % p.a.
m = coupons per year (semi-annual = 2).
years = to maturity FROM TODAY.
Give yield -> price. Give price -> yield.
"value in 5 years time" -> years elapsed
= 5 and the yield expected THEN.
"no coupons for the first k years,
paid at maturity" -> skipped = k*m.
Zero coupon: coupon = 0.

FORMULAS  (y = yield/m, N = years*m)
$CPN = c*F/m$
$$P = CPN*(1 - 1/(1 + y)^N)/y + (F)/((1 + y)^N)
$$EAY = (1 + y)^m - 1
current yield = annual coupon / price
yield 0% -> price = sum of all payments

PRICE vs FACE
c = y -> par | c > y -> premium
c < y -> discount
price -> face as maturity nears
rates up -> price down (inverse)
longer maturity or lower coupon ->
MORE interest-rate sensitivity

READ THE WORDING
"semi-annual": halve coupon, halve
yield, double periods - all three.
"effective yield" -> EAY, not y*m.
]] .. TRAPS_COMMON,

-- 5 realised
[[REALISED YIELD: bought, collected coupons,
SOLD before maturity.

HOW TO USE
price paid, coupon % p.a., m, years held,
sale price. No sale price? give the yield
at sale + years to maturity at purchase
and the sale price is computed first.
Answer: nominal (x m) unless the question
says effective.

FORMULAS
cash flows: t=0 -P0 | t=1..N CPN |
t=N CPN + Psale
$$0 = -P0 + CPN*(1 - 1/(1 + i)^N)/i + (Psale)/((1 + i)^N)
i = IRR per period
nominal = i*m   |   $EAY = (1 + i)^m - 1$

WHY
YTM assumes you hold to maturity and
every payment is made. Selling early
makes the return depend on the sale
price -> realised yield.
]] .. TRAPS_COMMON,

-- 6 shares
[[SHARES: price = PV of all dividends.

HOW TO USE
"just paid $2" -> Div0 = 2 (grown once)
"will pay $2 next year" -> Div1 = 2
Fill Div, g, rE -> P0 and P1.
P0, P1, rE -> Div1 needed.
P0, Div1 (+ g) -> rE.
Preference share: g = 0.
Two-stage: high growth g1 for n years
then g forever -> fill both + years.

FORMULAS
zero growth: $P0 = Div1/rE$
$$P0 = (Div1)/(rE - g) = (Div0*(1 + g))/(rE - g)
$P1 = P0*(1 + g)$   $P_t = Div_(t+1)/(rE - g)$
$$P0 = (Div1 + P1)/(1 + rE)
$Div1 = P0*(1 + rE) - P1$
$rE = Div1/P0 + g$
dividend yield = $Div1/P0$
capital gain yield = $(P1 - P0)/P0$
total return = both added
under constant growth g = capital gain yield

two-stage: PV each high-growth dividend,
$P_n = Div_(n+1)/(rE - g)$ discounted n
periods (NOT n+1), add up.

TRAPS
- needs g < rE and dividends paid
- minimum share return is NOT 0%: can
  fall to -100%
]] .. TRAPS_COMMON,

-- 7 cash flow stream
[[CASH FLOW STREAM: NPV, IRR, payback, PI.

HOW TO USE
k = discount rate / cost of capital.
CF0 = outlay TODAY: type it NEGATIVE
(-1680000). CF1.. = each later year.
Same amount every year: level CF + years.
Mixed stream "PV of all payments":
enter them all positive, CF0 included.
Two projects: compare = A and B ->
NPVs, IRRs, crossover, who wins.

FORMULAS
$$NPV = sum (NCF_t)/((1 + k)^t)  (t from 0)
accept: NPV > 0 | mutually exclusive:
highest NPV (and > 0)
IRR: the k that makes NPV = 0
accept if IRR > k
payback = years before recovery +
(still owed)/(next year CF)
PI (this unit) = NPV / investment
accept if PI > 0 (textbook version uses
PV inflows / investment, threshold 1)
crossover rate = IRR of (A - B)

CONFLICT RULE
k < crossover -> NPV and IRR may
disagree -> FOLLOW NPV.
k > crossover -> they agree.
IRR pitfalls: several IRRs (one per
sign change), borrowing flips the
rule, sometimes no IRR.

EXCEL
NPV() starts at t=1: add CF0 outside.
IRR() includes t=0.
]] .. TRAPS_COMMON,

-- 8 EAA
[[EAA / EAC: projects with DIFFERENT lives.

HOW TO USE
NPV and years for each project + k.
Benefits -> EAA, higher wins.
Costs -> EAC, lower wins.
Have the EAA already? type it in the
EAA slot instead of NPV.

FORMULAS
$$EAA = (NPV*k)/(1 - 1/(1 + k)^t)
= NPV / annuity factor(k, t)
raw NPVs are NOT comparable when the
lives differ - the longer project has
more years to build value.
alternative: replacement chain to a
common horizon.

TRAPS
- check the label: costs or benefits?
- t = that project's OWN life
]] .. TRAPS_COMMON,

-- 9 FCF
[[FREE CASH FLOW, DEPRECIATION, SALVAGE.

HOW TO USE
One year's FCF: Rev, Costs, Dep, Tc
(+ CapEx, change in NWC).
Depreciation: cost, salvage, life ->
straight-line; DV rate -> diminishing.
year -> book value after that year.
Sale: sale price (+ book value, or it
is taken from the depreciation part).
Terminal year: operating FCF + NWC
recovered (blank = the dNWC above).

FORMULAS
$$FCF = (Rev - Costs - Dep)*(1 - Tc) + Dep - CapEx - dNWC
$$FCF = (Rev - Costs)*(1 - Tc) + Tc*Dep - CapEx - dNWC
tax shield = $Tc*Dep$
SL dep = $(cost - salvage)/life$
DV dep = rate x opening book value
book value = cost - accumulated dep
$$ATS = sale - Tc*(sale - BV)
terminal = op FCF + ATS + NWC back
Fisher: $(1 + n) = (1 + r)*(1 + i)$

RELEVANT CASH FLOWS
include: opportunity cost (own land at
market value), installation, shipping,
lost sales elsewhere, working capital
exclude: sunk costs (already spent),
interest (it is in the discount rate)
fully depreciated -> BV = 0, whole sale
price is taxed. NWC comes back untaxed.
]] .. TRAPS_COMMON,

-- 10 rates
[[RATES TOOLKIT: convert any rate to any
other, plus Fisher.

HOW TO USE
Type ONE of: nominal r + m | EAR |
rate per period + m | continuous rc.
All the others are printed.
"convert to m2" -> the equivalent rate
for a different payment frequency
(same EAR).
Fisher: any two of nominal, real,
inflation -> the third.

FORMULAS
$i = r/m$   $r = i*m$
$$EAR = (1 + r/m)^m - 1
$$i = (1 + EAR)^(1/m) - 1
$rc = ln(1 + EAR)$   $EAR = e^rc - 1$
$$(1 + n) = (1 + r)*(1 + i)
$$r = (1 + n)/(1 + i) - 1

FACTS
m = 1 -> EAR = r. m > 1 -> EAR > r.
monthly cash flows need the MONTHLY
rate, never the EAR.
real is NOT nominal minus inflation.
]] .. TRAPS_COMMON,
}

----------------------------------------------------------------------
-- 6. QUESTION-TYPE TABLE (slots drive the input screen)
--    kinds: money | pct | num | choice
----------------------------------------------------------------------

local function S(key, label, kind, opts, defIdx, defBuf)
  return { key = key, label = label, kind = kind or "num",
           opts = opts, idx = defIdx or 1, buf = defBuf or "",
           defIdx = defIdx or 1, defBuf = defBuf or "" }
end

local MCH  = { "1 (yearly)", "2 (semi-annual)", "4 (quarterly)", "12 (monthly)",
               "26 (fortnightly)", "52 (weekly)", "365 (daily)", "continuous" }
local MCH2 = { "1 (yearly)", "2 (semi-annual)", "4 (quarterly)", "12 (monthly)",
               "26 (fortnightly)", "52 (weekly)", "365 (daily)" }
local MCH3 = { "1 (annual)", "2 (semi-annual)", "4 (quarterly)", "12 (monthly)" }

local TYPES = {
  { name = "One amount moved in time (PV, FV, n, r)", solve = solveLump, slots = {
      S("PV",   "PV today ($)", "money"),
      S("FV",   "FV later ($)", "money"),
      S("r",    "r (% p.a.)", "pct"),
      S("n",    "n (years)"),
      S("m",    "m compounds/yr", "choice", MCH, 1),
      S("mult", "multiple (3 = triple)"),
      S("EAR",  "EAR (%) if given", "pct"),
    } },
  { name = "Regular payments: fixed, forever, growing", solve = solveAnn, slots = {
      S("C",      "C payment, first ($)", "money"),
      S("r",      "r DISCOUNT rate (% p.a.)", "pct"),
      S("m",      "m payments/yr", "choice", MCH2, 1),
      S("n",      "n payments (blank=forever)"),
      S("g",      "g GROWTH of payments (%)", "pct"),
      S("timing", "timing", "choice", { "end (ordinary)", "start (due)" }, 1),
      S("first",  "first payment at t", "num"),
      S("PV",     "PV today ($) if given", "money"),
      S("FV",     "FV at last pmt ($)", "money"),
      S("price",  "price / target ($) -> NPV", "money"),
    } },
  { name = "Loan: repayment, balance, rate change", solve = solveLoan, slots = {
      S("L",   "L borrowed ($)", "money"),
      S("yrs", "years"),
      S("m",   "m payments/yr", "choice", MCH2, 4),
      S("r",   "r (% p.a.)", "pct"),
      S("PMT", "PMT ($) if given", "money"),
      S("k",   "k payments made (yrs x m)"),
      S("kyrs", "or years into the loan"),
      S("r2",  "new r (% p.a.) after k", "pct"),
    } },
  { name = "Bond: price from yield, or yield from price", solve = solveBond, slots = {
      S("F",    "Face value ($)", "money", nil, nil, "1000"),
      S("c",    "coupon rate (% p.a.)", "pct"),
      S("CPNd", "or coupon $ each period", "money"),
      S("m",    "m coupons/yr", "choice", MCH3, 1),
      S("yrs",  "years to maturity"),
      S("y",    "yield / required return (%)", "pct"),
      S("P",    "price ($) if given", "money"),
      S("el",   "years elapsed (value then)"),
      S("skip", "coupons skipped (periods)"),
      S("skipy", "or years with no coupon"),
    } },
  { name = "Bond sold early: the return you actually got", solve = solveReal, slots = {
      S("P0",   "price paid ($)", "money"),
      S("F",    "Face value ($)", "money", nil, nil, "1000"),
      S("c",    "coupon rate (% p.a.)", "pct"),
      S("CPNd", "or coupon $ each period", "money"),
      S("m",    "m coupons/yr", "choice", MCH3, 1),
      S("held", "years held (bought -> sold)"),
      S("Ps",   "sale price ($)", "money"),
      S("ys",   "yield / req. return at sale (%)", "pct"),
      S("yrsT", "bond life at buy (only if no sale $)"),
    } },
  { name = "Share price from dividends", solve = solveShare, slots = {
      S("D0", "Div0 JUST PAID ($)", "money"),
      S("D1", "Div1 NEXT / fixed ($)", "money"),
      S("rE", "rE REQUIRED return (%)", "pct"),
      S("g",  "g GROWTH of dividend (%)", "pct"),
      S("P0", "P0 today ($)", "money"),
      S("P1", "P1 in one year ($)", "money"),
      S("nh", "high-growth years (2-stage)"),
      S("g1", "high growth g1 (%)", "pct"),
    } },
  { name = "Project: NPV, IRR, payback, PI, A vs B", solve = solveCF,
    slots = (function()
      local t = {
        S("k",   "k discount rate (% p.a.)", "pct"),
        S("cmp", "projects", "choice", { "A only", "A and B", "graph question (no cash flows)" }, 1),
        S("A0",  "A: CF0 today (-outlay)", "money"),
      }
      table.insert(t, S("cross", "GRAPH: crossover rate (%)", "pct"))
      table.insert(t, S("rise",  "GRAPH: asked project has", "choice", { "RISING cash flows", "DECLINING cash flows" }, 1))
      table.insert(t, S("irrO",  "GRAPH: IRR of other proj (%)", "pct"))
      for i = 1, 4 do table.insert(t, S("o" .. i, "GRAPH: option " .. i .. " (%)", "pct")) end
      for i = 1, 8 do table.insert(t, S("A" .. i, "A: CF" .. i .. " ($)", "money")) end
      table.insert(t, S("Alev", "A: level CF ($/yr)", "money"))
      table.insert(t, S("Ayrs", "A: years of level CF"))
      table.insert(t, S("B0",   "B: CF0 today (-outlay)", "money"))
      for i = 1, 8 do table.insert(t, S("B" .. i, "B: CF" .. i .. " ($)", "money")) end
      table.insert(t, S("Blev", "B: level CF ($/yr)", "money"))
      table.insert(t, S("Byrs", "B: years of level CF"))
      return t
    end)(),
    vis = function(Sm)
      if Sm.cmp.opts[Sm.cmp.idx] == "graph question (no cash flows)" then
        return { "k", "cmp", "cross", "rise", "irrO", "o1", "o2", "o3", "o4" }
      end
      local list = { "k", "cmp", "A0" }
      for i = 1, 8 do table.insert(list, "A" .. i) end
      table.insert(list, "Alev"); table.insert(list, "Ayrs")
      if Sm.cmp.opts[Sm.cmp.idx] == "A and B" then
        table.insert(list, "B0")
        for i = 1, 8 do table.insert(list, "B" .. i) end
        table.insert(list, "Blev"); table.insert(list, "Byrs")
      end
      return list
    end },
  { name = "Compare projects with different lives", solve = solveEAA, slots = {
      S("k",    "k (% p.a.)", "pct"),
      S("kind", "figures are", "choice", { "benefits (EAA)", "costs (EAC)" }, 1),
      S("NPVA", "A: NPV ($)", "money"),
      S("tA",   "A: life (years)"),
      S("EAAA", "A: EAA/EAC ($) if given", "money"),
      S("NPVB", "B: NPV ($)", "money"),
      S("tB",   "B: life (years)"),
      S("EAAB", "B: EAA/EAC ($) if given", "money"),
    } },
  { name = "Project cash flows: tax, depreciation, salvage", solve = solveFCF, slots = {
      S("Tc",     "Tc tax rate (%)", "pct"),
      S("Rev",    "FCF: revenue ($)", "money"),
      S("Costs",  "FCF: costs ($)", "money"),
      S("Dep",    "FCF: depreciation ($)", "money"),
      S("CapEx",  "FCF: CapEx ($)", "money"),
      S("dNWC",   "FCF: change in NWC ($)", "money"),
      S("sale",   "SALE: machine sold for ($)", "money"),
      S("BV",     "SALE: book value then ($)", "money"),
      S("opFCF",  "SALE: final-yr operating FCF", "money"),
      S("NWCrec", "SALE: NWC recovered ($)", "money"),
      S("cost",   "DEP: asset cost ($)", "money"),
      S("salv",   "DEP: salvage at end of life", "money"),
      S("life",   "DEP: useful life (years)"),
      S("dvr",    "DEP: DV rate (%)", "pct"),
      S("yr",     "DEP: year (book value after)"),
      S("nom",    "INFLATION: nominal rate (%)", "pct"),
      S("infl",   "INFLATION: inflation (%)", "pct"),
    } },
  { name = "Convert rates: yearly, monthly, true rate", solve = solveRates, slots = {
      S("nom",  "INFLATION: nominal rate (%)", "pct"),
      S("infl", "INFLATION: inflation (%)", "pct"),
      S("real", "INFLATION: real rate (%)", "pct"),
      S("r",    "COMPOUNDING: quoted r (% p.a.)", "pct"),
      S("m",    "COMPOUNDING: m per year", "choice", MCH2, 4),
      S("EAR",  "COMPOUNDING: EAR (%)", "pct"),
      S("per",  "COMPOUNDING: i per period (%)", "pct"),
      S("rc",   "COMPOUNDING: continuous (%)", "pct"),
      S("m2",   "COMPOUNDING: convert to m2", "choice", { "(none)", "1 (yearly)", "2 (semi-annual)", "4 (quarterly)", "12 (monthly)", "26 (fortnightly)", "52 (weekly)", "365 (daily)" }, 1),
    } },
}

for i2, qt in ipairs(TYPES) do qt.notes = NOTES[i2] end

-- one plain-English line per menu item (shown under the menu)
local DESC = {
  "grow one amount forward or pull it back. Find the missing one of PV, FV, years, rate",
  "same payment every period: annuity, annuity due, deferred, perpetuity, growing",
  "mortgage / loan: the repayment, what is still owed, new repayment after a rate change",
  "coupon bond: price, yield to maturity, effective yield, value at a future date",
  "bought a bond, collected coupons, sold before maturity: realised yield",
  "dividends -> price today, price next year, required return, dividend needed",
  "cash flows year by year: NPV, IRR, payback, profitability index, two projects",
  "EAA / EAC: turn each project's NPV into a yearly amount so 6 years vs 4 years is fair",
  "free cash flow, straight-line / diminishing depreciation, after-tax salvage, terminal year",
  "nominal <-> effective (EAR) <-> per-period rates, continuous, real vs inflation (Fisher)",
}
for i2, qt in ipairs(TYPES) do qt.desc = DESC[i2] end


----------------------------------------------------------------------
-- 6b. STEPS + TRAPS PAGES (press A) - what to WRITE for the marks
----------------------------------------------------------------------

local STEPS_COMMON = [[ALWAYS WRITE:
- the formula in symbols
- the numbers substituted
- the answer with $ or % and the date
  (t = 0, t = 5 ...)
- convert first: i = r/m, N = n*m
- workings earn marks even if the final
  number is wrong
]]

local ASSUME = {
STEPS_COMMON .. [[
THIS TYPE (lump sum):
1. write the timeline: PV at 0, FV at n
2. pick the unknown; rearrange BEFORE
   putting numbers in
3. state m and the per-period rate

IF THE QUESTION SAYS...
- "compounded monthly" -> m = 12, use
  r/12 and 12n
- "effective" -> EAR, not r
- "continuously" -> e^(rn), by hand
- "how long to double" -> n = ln 2/ln(1+i)
- "what return" -> i = (FV/PV)^(1/N) - 1]],

STEPS_COMMON .. [[
THIS TYPE (annuity / perpetuity):
1. draw the timeline: mark t of the
   FIRST and LAST payment
2. the formula gives the value ONE
   period BEFORE the first payment
3. discount that value to t = 0
4. compare with the price -> NPV

IF THE QUESTION SAYS...
- "forever" -> C/(r - g), still step 3
- "at the beginning" -> x(1 + i)
- "first payment in year 3" -> the
  formula value sits at t = 2
- "growing at g" -> C is the FIRST
  payment; needs g < r
- "how many payments" -> solve N with
  ln; check C > PV*i or it never ends
- "should you accept" -> NPV >= 0]],

STEPS_COMMON .. [[
THIS TYPE (loan):
1. i = r/m, N = years*m
2. PMT = L / annuity factor
3. balance = PV of the payments LEFT
4. new payment = balance / new factor

IF THE QUESTION SAYS...
- "rate changes after 4 years" ->
  k = 4*m payments made
- "interest in the 5th payment" ->
  i x balance after 4
- "total interest" -> PMT*N - L
- "fortnightly" -> m = 26
- concept: interest share FALLS,
  principal share RISES]],

STEPS_COMMON .. [[
THIS TYPE (bond price / yield):
1. CPN = c*F/m
2. y = yield/m, N = years*m
3. price = PV coupons + PV face
4. say premium / discount / par

IF THE QUESTION SAYS...
- "semi-annual" -> halve coupon, halve
  yield, double N (all three)
- "in 5 years time" -> N counts from
  THEN; use the yield expected then
- "effective yield" -> (1 + y)^m - 1
- "no coupons for k years, paid at
  maturity" -> skipped periods = k*m,
  add them to the final lump
- "discount rate 0%" -> add the flows
- "yield to maturity" -> solve y from
  the price (RATE in Excel)]],

STEPS_COMMON .. [[
THIS TYPE (realised yield):
1. list the cash flows: -price paid,
   coupons each period, + sale price
2. IRR per period
3. x m for nominal p.a.
4. (1 + i)^m - 1 only if "effective"

IF THE QUESTION SAYS...
- "sold after 10 years of a 15-year
  bond" -> N = 10*m coupons
- sale price not given -> price the
  bond at the yield THEN with the
  years LEFT
- "nearest percent" -> nominal x m]],

STEPS_COMMON .. [[
THIS TYPE (shares):
1. decide: is the dividend Div0 or Div1?
   "just paid" -> Div0, grow it once
2. P0 = Div1/(rE - g)
3. P1 = P0(1 + g)

IF THE QUESTION SAYS...
- "will pay next year" -> Div1, do not
  grow it
- "preference share" -> g = 0
- "expected to sell for P1" -> use
  P0 = (Div1 + P1)/(1 + rE)
- "capital gain yield" -> prices only
- "dividend yield" -> Div1/P0
- "grows at 20% for 3 years then 5%"
  -> two-stage; terminal value at t = 3
  discounted 3 periods]],

STEPS_COMMON .. [[
THIS TYPE (NPV / IRR / payback / PI):
1. timeline with signs: outlay negative
2. NPV = sum PV of all flows incl. CF0
3. decision rule in words
4. IRR only if asked; then compare to k

IF THE QUESTION SAYS...
- "mutually exclusive" -> highest NPV
- "IRR and NPV disagree" -> NPV wins
- "crossover" -> IRR of (A - B)
- "capital rationing" -> PI = NPV /
  investment, then check the budget fits
- "how many IRRs" -> count sign changes
- Excel: NPV() from t = 1, add CF0
  outside; IRR() includes CF0
- "maximum to invest" -> PV of inflows]],

STEPS_COMMON .. [[
THIS TYPE (EAA / EAC):
1. annuity factor for EACH life at k
2. EAA = NPV / factor
3. benefits: higher wins; costs: lower

IF THE QUESTION SAYS...
- "different lives" -> never compare
  raw NPVs
- "EAC" -> costs -> LOWER wins
- "replacement chain" -> repeat to a
  common horizon instead]],

STEPS_COMMON .. [[
THIS TYPE (cash flow analysis):
1. list relevant, incremental flows only
2. FCF = (Rev - Costs - Dep)(1 - Tc)
   + Dep - CapEx - dNWC
3. final year: + after-tax salvage
   + NWC recovered
4. discount at k

IF THE QUESTION SAYS...
- "already spent / research last
  month" -> SUNK, exclude
- "land we own" -> opportunity cost,
  include at market value
- "installation / shipping" -> include
- "interest on the loan" -> exclude
- "fully depreciated" -> BV = 0
- "sold above book value" -> gain taxed
- "inflation" -> nominal with nominal,
  real with real (Fisher)
- Excel required for cash flow tables]],

STEPS_COMMON .. [[
THIS TYPE (rate conversions):
1. name the rate you have: nominal,
   periodic, effective, continuous
2. go through EAR to change frequency
3. state m every time

IF THE QUESTION SAYS...
- "APR / p.a. compounded monthly" ->
  nominal, i = r/12
- "effective" -> EAR
- "real return" -> Fisher, not n - i
- "which loan is cheaper" -> compare
  the EARs]],
}

for i2, qt in ipairs(TYPES) do qt.assume = ASSUME[i2] end

----------------------------------------------------------------------
-- 6c. FORMULA STRIP - typeset at the top of the input + result screens
----------------------------------------------------------------------

local FORMULA = {
  { "FV = PV*(1 + i)^N", "i = r/m   N = n*m   EAR = (1 + i)^m - 1" },
  { "PV = C*(1 - 1/(1 + i)^N)/i", "PV0 = PV/(1 + i)^(t1 - 1)   perpetuity: C/(i - g)" },
  { "PMT = L/((1 - 1/(1 + i)^N)/i)", "B_k = PMT*(1 - 1/(1 + i)^(N - k))/i" },
  { "P = CPN*(1 - 1/(1 + y)^N)/y + F/(1 + y)^N", "CPN = c*F/m   y = yield/m   N = yrs*m" },
  { "0 = -P0 + CPN*(1 - 1/(1 + i)^N)/i + Ps/(1 + i)^N", "realised = i*m   (i = IRR per period)" },
  { "P0 = Div1/(rE - g) = Div0*(1 + g)/(rE - g)", "P1 = P0*(1 + g)   rE = Div1/P0 + g" },
  { "NPV = sum CF_t/(1 + k)^t   (t = 0..n)", "IRR: NPV = 0   PI = NPV/investment" },
  { "EAA = NPV*k/(1 - 1/(1 + k)^t)", "EAA = NPV/factor(k, t)" },
  { "FCF = (Rev - Costs - Dep)*(1 - Tc) + Dep - CapEx - dNWC", "ATS = sale - Tc*(sale - BV)" },
  { "EAR = (1 + r/m)^m - 1   i = (1 + EAR)^(1/m) - 1", "(1 + n) = (1 + r)*(1 + i)" },
}
for i2, qt in ipairs(TYPES) do qt.formula = FORMULA[i2] end

----------------------------------------------------------------------
-- 6d. WORKED SOLUTIONS (press W) - the trainer's questions, solved,
--     with the exact slots to fill on this calculator
----------------------------------------------------------------------

local WORKED = {
-- 1 lump sum
[[## FV of a lump sum
Q: $4,750 today at 7% p.a. compounded
annually. Worth in 9 years?
ENTER: PV 4750 | r 7 | n 9 | m 1
$FV = PV*(1 + r)^n = 4750*1.07^9$
= 4750 x 1.838459 = $8,732.68
Excel: =FV(0.07, 9, 0, -4750, 0)

## PV of a lump sum
Q: need $22,000 in 5 years, 6.5% p.a.
Deposit today?
ENTER: FV 22000 | r 6.5 | n 5
$PV = FV/(1 + r)^n = 22000/1.065^5$
= 22000 / 1.370087 = $16,057.38
Excel: =PV(0.065, 5, 0, 22000, 0)

## Solve for n (how long)
Q: at 5% p.a., years to triple money?
ENTER: multiple 3 | r 5 (PV, FV blank)
only the ratio FV/PV = 3 matters
$n = ln(FV/PV)/ln(1 + r) = ln(3)/ln(1.05)$
= 1.098612 / 0.048790 = 22.52 years
Excel: =NPER(0.05, 0, -1, 3, 0)

## Solve for r (what return)
Q: $5,600 grows to $9,200 in 6 years.
ENTER: PV 5600 | FV 9200 | n 6
$r = (FV/PV)^(1/n) - 1 = (9200/5600)^(1/6) - 1$
= 1.086315 - 1 = 8.63% p.a.
Excel: =RATE(6, 0, -5600, 9200, 0)

## Compounding more than once a year
Q: $150,000 at 5.5% p.a. compounded
semi-annually, 8 years.
ENTER: PV 150000 | r 5.5 | n 8 | m 2
i = 0.055/2 = 0.0275 | N = 2 x 8 = 16
$FV = 150000*1.0275^16$ = 150000 x 1.543509
= $231,526.42
Excel: =FV(0.0275, 16, 0, -150000, 0)

## Effective annual rate
Q: 9.6% p.a. compounded monthly. EAR?
ENTER: r 9.6 | m 12  (see PER-PERIOD
VIEW; the Need line is harmless)
$EAR = (1 + 0.096/12)^12 - 1 = 1.008^12 - 1$
= 1.100339 - 1 = 10.03%
Excel: =EFFECT(0.096, 12)

## Continuous compounding
Q: $6,400 at 4.5% p.a. continuous,
11 years.
ENTER: PV 6400 | r 4.5 | n 11 |
m continuous
$FV = 6400*e^(0.045*11) = 6400*e^0.495$
= 6400 x 1.640498 = $10,499.19
no Excel function - by hand
]],

-- 2 annuity
[[## Deferred annuity + NPV of an offer
Q: five equal annual payments of $8,500,
the first two years from today. You
want $26,000 and can invest at 9%.
NPV of the offer?
ENTER: C 8500 | r 9 | m 1 | n 5 |
first payment at t 2 | price 26000
Step 1 - annuity formula. It values
the 5 payments ONE period before the
first one: first is at t = 2, so this
is the value at t = 1:
$PV1 = C*(1 - 1/(1 + r)^n)/r$
= 8500 x (1 - 1/1.09^5)/0.09
= 8500 x 3.889651 = $33,062.03
Step 2 - bring t = 1 back to today:
$PV0 = 33062.03/1.09$ = $30,332.14
Step 3 - NPV = PV - price
= 30,332.14 - 26,000 = $4,332.14
positive -> ACCEPT the offer
(classic error: stopping at 33,062)

## Ordinary annuity: most you would pay
Q: $40,000 a year for 6 years, cost of
capital 11%. Maximum to invest today?
ENTER: C 40000 | r 11 | n 6
$PV = 40000*(1 - 1/1.11^6)/0.11$
= 40000 x 4.230538 = $169,221.51
Excel: =PV(0.11, 6, -40000, 0, 0)

## Deferred perpetuity
Q: $750 a year forever, first payment
end of year 6, 6%. Worth today?
ENTER: C 750 | r 6 | n BLANK |
first payment at t 6
Step 1 - value at t = 5 (one period
before the first payment):
$PV5 = C/r = 750/0.06$ = 12,500
Step 2 - discount 5 years:
$PV0 = 12500/1.06^5$ = 12500/1.338226
= $9,340.73
(the classic error is stopping at 12,500)

## Growing annuity
Q: $32,000 end of year 1, growing 5% a
year, 12 years, 10% discount rate.
ENTER: C 32000 | r 10 | n 12 | g 5
$PV = C*(1 - ((1 + g)/(1 + r))^n)/(r - g)$
= 32000 x (1 - (1.05/1.10)^12)/0.05
= 32000 x 20 x (1 - 0.572153)
= 32000 x 20 x 0.427847 = $273,782.29
no Excel function - by hand

## Annuity due (payments in advance)
Q: rent $1,000 at the START of each
month for 12 months, 6% p.a. monthly.
PV of the lease?
ENTER: C 1000 | r 6 | m 12 | n 12 |
timing start (due)
ordinary PV = 1000 x 11.618932
= 11,618.93
due = ordinary x (1 + i)
= 11,618.93 x 1.005 = $11,677.03
Excel: =PV(0.005, 12, -1000, 0, 1)

## Mock: deferred annuity offer (car)
Q: four equal annual payments of $6,000
beginning two years from today; you can
invest at 10% and want $12,000. Accept?
ENTER: C 6000 | r 10 | n 4 |
first payment at t 2 | price 12000
annuity at t = 1: 6000 x 3.169865
= 19,019.19
to t = 0: 19,019.19 / 1.10 = 17,290.18
NPV = 17,290.18 - 12,000 = $5,290
Yes - accept (NPV positive)

## Mock: maximum to invest (annuity)
Q: inflows $25,000 a year for 4 years,
cost of capital 9%. Maximum at t = 0?
ENTER: C 25000 | r 9 | n 4
$PV = 25000*(1 - 1/1.09^4)/0.09$
= 25000 x 3.239720 = $80,993

## Concept: annuity at 0% discount rate
"impossible to find the PV of an annuity
at 0%" is FALSE: no discounting, so
PV = C x n. The formula divides by r
and breaks, the idea does not.
(ENTER r 0 on this type: PV = C x N)

## Concept: more payments, more PV
all else equal, the PV of an annuity
RISES as the number of payments rises
(more discounted cash flows added). TRUE
a growing perpetuity has REGULAR
intervals, not irregular.
15-year mortgage has LARGER payments
than a 30-year one; annuity due is
worth MORE than ordinary.

## Mixed stream (uneven amounts)
-> use type 7 CASH FLOWS with CF0..
enter every amount, all positive, and
the rate as k. NPV = the total PV.
]],

-- 3 loan
[[## Loan payment
Q: $480,000 over 25 years, monthly
end-of-period, 4.25% p.a. Repayment?
ENTER: L 480000 | years 25 | m 12 |
r 4.25
i = 0.0425/12 = 0.00354167
N = 25 x 12 = 300
$PMT = L/((1 - 1/(1 + i)^N)/i)$
= 480000 / 184.591 = $2,600.34
Excel: =PMT(0.0425/12, 300, 480000)

## Rate change part-way (repricing)
Q: same loan; four years in the rate
rises to 4.75%. New monthly payment?
ENTER: same + k 48 | new r 4.75
Step 1 - balance after 48 payments =
PV of the 252 payments still owed:
$B = 2600.34*(1 - 1/1.00354167^252)/0.00354167$
= $432,983
Step 2 - new payment on that balance:
$PMT = 432983/((1 - 1/1.00395833^252)/0.00395833)$
= $2,718.42 (up about $118 a month)
Excel: =PV(0.0425/12, 252, -2600.34)
then =PMT(0.0475/12, 252, 432983)

## Mock: rate falls (Sarah)
Q: $550,000, 30 years, monthly, 3.5%.
After 3 years the rate drops 0.5%.
ENTER: L 550000 | years 30 | m 12 |
r 3.5 | k 36 | new r 3
old PMT = $2,469.75 (the distractor)
balance after 36 = $517,194.79
new PMT at 3% over 324 = $2,331.00

## Concept: which part of a payment falls
"interest proportion of a fully
amortised loan DECLINES over time" is
the correct one: interest = i x
balance, and the balance shrinks every
payment, so principal share rises.

## Interest / principal in a payment
interest in payment k+1 = i x balance
after k. principal = PMT - interest.
Over the loan: interest share FALLS,
principal share RISES.
]],

-- 4 bond
[[## Annual coupon bond
Q: $1,000 face, 6.4% annual coupon,
25 years, required return 8.2%.
ENTER: Face 1000 | coupon 6.4 | m 1 |
years 25 | yield 8.2
CPN = 0.064 x 1000 = 64
$P = 64*(1 - 1/1.082^25)/0.082 + 1000/1.082^25$
= 672.41 + 138.68 = $811.09
coupon 6.4% < yield 8.2% -> discount
Excel: =PV(0.082, 25, 64, 1000)

## Semi-annual bond
Q: $1,000, 7% coupon paid semi-annually,
12 years, yield 5.5% p.a.
ENTER: coupon 7 | m 2 | years 12 |
yield 5.5
halve coupon 35, halve yield 0.0275,
double periods 24 - ALL THREE
$P = 35*(1 - 1/1.0275^24)/0.0275 + 1000/1.0275^24$
= 610.20 + 520.31 = $1,130.51 (premium)
Excel: =PV(0.0275, 24, 35, 1000)

## Value at a future date
Q: 5% semi-annual, 14 years. In 6 years
the yield is expected to be 6.5%.
Value then?
ENTER: coupon 5 | m 2 | years 14 |
yield 6.5 | years elapsed 6
years left 8 -> N = 16, CPN 25,
y = 0.0325
$P = 25*(1 - 1/1.0325^16)/0.0325 + 1000/1.0325^16$
= 308.29 + 599.23 = $907.57

## Deferred coupons (restructure)
Q: 9% semi-annual, 10 years; no coupons
for 4 years, then normal; deferred
coupons paid at maturity. Return 16.5%.
ENTER: coupon 9 | m 2 | years 10 |
yield 16.5 | coupons skipped 8
CPN 45, y 0.0825, 20 periods
coupons at t = 9..20 (12 of them) plus
1000 + 8 x 45 = 1,360 at t = 20
P = sum 45/1.0825^t (t = 9..20)
+ 1360/1.0825^20 = $456.15

## Yield from price (effective YTM)
Q: 9% semi-annual, 9 years, price
$948.20. Effective annual yield?
ENTER: coupon 9 | m 2 | years 9 |
price 948.20  (yield blank)
y per half-year = 4.941% (search /
=RATE(18, 45, -948.20, 1000))
nominal = 9.88% (the trap)
$EAY = 1.04941^2 - 1$ = 10.13%

## Mock: bond value in year 5
Q: 10-year, 5% coupon semi-annual, YTM
now 4%; after 5 years YTM is 6%. Value
in year 5?
ENTER: coupon 5 | m 2 | years 10 |
yield 6 | years elapsed 5
(the 4% today is a distractor)
CPN 25, y 0.03, N 10
$P = 25*(1 - 1/1.03^10)/0.03 + 1000/1.03^10$
= $957.35

## Mock: MSS 30-year annual bond
Q: 30 years, 5.8% annual, face 1000,
required return 7.5%.
ENTER: coupon 5.8 | m 1 | years 30 |
yield 7.5
$P = 58*(1 - 1/1.075^30)/0.075 + 1000/1.075^30$
= $799.22

## Mock: PDI deferred coupons
Q: 8 years left, 10% semi-annual, no
coupons for 5 years then normal;
deferred coupons paid at maturity;
required return 15%.
ENTER: coupon 10 | m 2 | years 8 |
yield 15 | coupons skipped 10
CPN 50, y 0.075, 16 periods; coupons
at t = 11..16; at t = 16 also
1000 + 10 x 50 = 1,500
P = $585.45

## Mock: effective YTM at $896.64
Q: 8 years, 10% coupon semi-annual,
price 896.64. Effective YTM?
ENTER: coupon 10 | m 2 | years 8 |
price 896.64 (yield blank)
y per half-year = 6.024%
nominal 12.05% (trap option)
$EAY = 1.06024^2 - 1$ = 12.41%

## Concept: bond facts (true / false)
- expected return = YTM is FALSE: YTM
  is the PROMISED return; with default
  risk the expected return is lower
- longer maturity -> MORE rate risk
- lower coupon -> MORE rate risk
  ("less affected" is FALSE)
- price moves to face as maturity nears
- "maturity value includes a premium"
  is FALSE: maturity pays face only

## Yield 0%
Q: 10% annual coupon, 8 years, discount
rate 0%. Price?
ENTER: coupon 10 | m 1 | years 8 |
yield 0
no discounting: 8 x 100 + 1000 = $1,800
]],

-- 5 realised
[[## Realised yield (sold early)
Q: bought for $1,035; $42.50 coupon
semi-annually (8.5% p.a.); sold after
7 years for $1,088.20. Realised yield,
nominal annual?
ENTER: price paid 1035 | Face 1000 |
coupon $ each period 42.50 | m 2 |
years held 7 | sale price 1088.20
(a coupon in dollars goes in the $
slot; a coupon in % goes in the rate)
cash flows: t=0 -1035 | t=1..13 +42.50
| t=14 +42.50 + 1088.20 = 1130.70
IRR per half-year = 4.380%
nominal = 4.380 x 2 = 8.76%
effective = 1.0438^2 - 1 = 8.95%
(only if the question says effective)

## Mock: Jorge Cabrera
Q: paid $980 for a 15-year bond, 10%
coupon semi-annually; sold 10 years
later at $1,054.36. Realised yield to
the nearest percent?
ENTER: price paid 980 | coupon 10 |
m 2 | years held 10 | sale 1054.36
20 periods of $50, last one + 1054.36
IRR per half-year = 5.324%
nominal = 10.65% -> 11%

## Sale price not given?
fill yield at sale + years to maturity
at purchase: the sale price is priced
as a bond with the years LEFT at the
yield THEN, and the IRR follows.
]],

-- 6 shares
[[## Preference share (zero growth)
Q: fixed $4.20 a year forever, required
return 7.5%.
ENTER: Div1 4.20 | rE 7.5 | g BLANK
(Div0 4.20 also works: no growth means
the next dividend is the same 4.20.
7.5% is the RETURN -> rE, not g)
$P0 = Div1/rE = 4.20/0.075$ = $56.00
(same value at any future date)

## Constant growth, "just paid" (CDGM)
Q: just paid $1.45, growth 4.5%
forever, required return 11.5%.
ENTER: Div0 1.45 | g 4.5 | rE 11.5
just paid -> Div0; grow it once:
Div1 = 1.45 x 1.045 = 1.51525
$P0 = Div1/(rE - g) = 1.51525/0.07$ = $21.65
(using 1.45 directly gives 20.71: trap)

## Price in one year
Q: same company, price in one year?
same ENTER - read P1
$P1 = P0*(1 + g) = 21.65*1.045$ = $22.62
or Div2/(rE - g) = 1.583/0.07

## "Will pay next year" (mock Spacefood)
Q: will pay $2.40 at the end of this
year, growing 3%, cost of equity 10%.
ENTER: Div1 2.40 | g 3 | rE 10
(Div0 blank - do NOT grow it)
$P0 = 2.40/(0.10 - 0.03)$ = $34.29

## Dividend you must expect
Q: pay $45 today, sell for $49 in one
year, require 13%. Dividend needed?
ENTER: P0 45 | P1 49 | rE 13
$P0 = (Div1 + P1)/(1 + rE)$
45 x 1.13 = Div1 + 49 -> Div1 = $1.85

## Capital gain yield
Q: bought $38, sold $43.70 a year later
after a $1.90 dividend.
ENTER: P0 38 | P1 43.70 | Div1 1.90
$(P1 - P0)/P0 = 5.70/38$ = 15.00%
dividend yield 1.90/38 = 5.00%
total return = 20.00%

## Mock: capital gain yield 22 -> 26
Q: bought $22, sold $26 a year later
after a $1.50 dividend.
ENTER: P0 22 | P1 26 | Div1 1.50
$(26 - 22)/22$ = 18.18%
(15.38% = total return; 4% = $ gain)

## Mock: dividend you must expect
Q: pay $30 today, sell for $32 in a
year, require 12%.
ENTER: P0 30 | P1 32 | rE 12
30 x 1.12 = 33.60; Div1 = 33.60 - 32
= $1.60

## Mock: Lucky Ltd just paid $2
Q: just paid $2.00, growth 6%, discount
rate 16%. Price now? In one year?
ENTER: Div0 2 | g 6 | rE 16
Div1 = 2.12; $P0 = 2.12/0.10$ = $21.20
$P1 = 21.20*1.06$ = 22.47 -> $22.50
(20.00 uses Div0 by mistake; 21.20 is
today's price, the trap for P1)

## Concept: minimum share return
"the minimum possible return on a share
is 0%" is FALSE: the price can fall,
returns can be negative, down to -100%.

## Two-stage growth
Q: just paid $2, dividends grow 20% for
3 years then 5% forever, rE 12%.
ENTER: Div0 2 | g 5 | rE 12 |
high-growth years 3 | g1 20
Div1 2.40, Div2 2.88, Div3 3.456
$P3 = Div4/(rE - g) = 3.6288/0.07$ = 51.84
P0 = 2.40/1.12 + 2.88/1.12^2
+ 3.456/1.12^3 + 51.84/1.12^3 = $43.71
(P3 is discounted 3 periods, not 4)
]],

-- 7 cash flows
[[## Payback period
Q: costs $1,680,000; returns 520,000 |
610,000 | 655,000 | 700,000.
ENTER: A CF0 -1680000 | CF1 520000 |
CF2 610000 | CF3 655000 | CF4 700000
after yr 1: 1,160,000 still owed
after yr 2:   550,000 still owed
yr 3 brings 655,000 -> covered
payback = 2 + 550000/655000 = 2.84 yrs

## NPV of two projects
Q: k = 6%. A: -60, 26, 30, 34, 38.
B: -115, 28, 38, 72, 95 ($m).
ENTER: k 6 | projects A and B |
A: -60, 26, 30, 34, 38 |
B: -115, 28, 38, 72, 95
B: 28/1.06 + 38/1.06^2 + 72/1.06^3
+ 95/1.06^4 = 195.936; - 115 = $80.94m
A = $49.87m -> B wins (higher NPV)
Excel: =NPV(0.06, 28, 38, 72, 95) - 115

## IRR of the same projects
same ENTER - read IRR rows
IRR A = 35.96% ~ 36% | IRR B = 27.91%
A has the higher IRR, B the higher
NPV -> conflict -> FOLLOW NPV: B
crossover = IRR(A - B)
Excel: =IRR({-60, 26, 30, 34, 38})

## Profitability index (rationing)
Q: k = 9%, 4-year projects: W costs 28
returns 11.5/yr; X 16, 6.2; Y 12, 5.4;
Z 18, 8. Highest PI?
ENTER (one at a time): k 9 |
CF0 -28 | level CF 11.5 | years 4
factor = 3.239720
W: 37.257 - 28 = 9.257; PI = 0.331
X: PI 0.255 | Y: PI 0.458 | Z: PI 0.440
Y highest. Budget $35m: Y + Z = $30m
gives NPV 13.41 > W alone 9.26

## Mixed stream: PV of all payments
Q: $9,000 today, then 6,500 | 5,200 |
3,800 at ends of years 1-3, 5%.
ENTER: k 5 | CF0 9000 | CF1 6500 |
CF2 5200 | CF3 3800 (all positive)
= 9000 + 6190.48 + 4716.55 + 3282.58
= $23,189.61
Excel: =NPV(0.05, 6500, 5200, 3800) + 9000

## Mock: car dealer mixed stream
Q: $7,000 today, then 5,000 | 4,000 |
3,000 at the ends of years 1-3, 4%.
ENTER: k 4 | CF0 7000 | CF1 5000 |
CF2 4000 | CF3 3000 (all positive)
= 7000 + 4807.69 + 3698.22 + 2667.00
= $18,172.91

## Mock: Barcode Biz payback
Q: costs 1,450,000; 640,000 | 712,250
| 823,330 | 907,125.
ENTER: CF0 -1450000 | CF1 640000 |
CF2 712250 | CF3 823330 | CF4 907125
after yr 1: 810,000 owed; after yr 2:
97,750 owed
payback = 2 + 97750/823330 = 2.12 yrs

## Concept: NPV profile (rising vs
declining cash flows)
Q: D declining, R rising, k = 5%,
profiles cross at 9%. IRR of R?
ENTER: projects = graph question |
k 5 | crossover 9 | asked = RISING |
options 9, 14, 18, 15
rising cash flows arrive later, so R
is MORE sensitive to the rate: the
steeper line, hitting zero sooner.
Its IRR is the smaller one: ~15%.
9% is the crossover, a distractor.

## Concept: when to pick the lower IRR
pick the lower-IRR project when the
crossover rate is ABOVE the cost of
capital: k is then in the conflict
zone, NPV rules, and the higher-NPV
project can be the lower-IRR one.

## Concept: IRR does not guarantee
selection
"if IRR of X exceeds IRR of Y the firm
selects X provided NPV > 0" is FALSE:
mutually exclusive projects can have
NPV and IRR disagree; NPV governs.
Financing decisions ARE more easily
reversed than investment decisions.
Most firms DO use several criteria.

## Mock: Harvest X vs Y at 5%
X: -45, 20, 25, 30, 35 -> NPV 51.43,
IRR 43%. Y: -90, 20, 30, 60, 80 ->
NPV 73.90, IRR 29%. Choose Y (NPV).
]],

-- 8 EAA
[[## Different lives (benefits)
Q: k = 7%. P: NPV $24,500 over 6 years.
Q: NPV $17,800 over 4 years. Which?
ENTER: k 7 | figures benefits |
A NPV 24500 | A life 6 |
B NPV 17800 | B life 4
$EAA_P = 24500*0.07/(1 - 1/1.07^6)$
= 1715 / 0.333734 = $5,140 per year
$EAA_Q = 17800*0.07/(1 - 1/1.07^4)$
= 1246 / 0.237114 = $5,255 per year
Q wins despite the lower NPV

## Concept: EAA is for different lives
"we use EAA to evaluate projects with
different lives" is TRUE.
PI handles ONE constraint, not several.
Monthly cash flows need the monthly
rate, not the EAR.

## Mock: costs (Norman Ltd)
Q: A: 6 years, NPV 3,000, EAC 730.
B: 4 years, NPV 2,278, EAC 750.
ENTER: figures costs (EAC) |
A EAA 730 | A life 6 | B EAA 750 |
B life 4 | k any (e.g. 10)
costs -> LOWER wins -> A (730 < 750)
raw NPVs are not comparable
]],

-- 9 FCF
[[## Free cash flow
Q: revenue 420,000, costs 185,000,
depreciation 60,000, tax 30%.
ENTER: revenue 420000 | costs 185000 |
depreciation 60000 | Tc 30
method 1: (420000 - 185000 - 60000)
x 0.70 + 60000 = 122,500 + 60,000
= $182,500
method 2: (420000 - 185000) x 0.70
+ 0.30 x 60000 = 164,500 + 18,000
= $182,500 (same)

## After-tax salvage
Q: sold for 42,000, book value 18,000,
tax 30%.
ENTER: sale price 42000 |
book value 18000 | Tc 30
gain = 42000 - 18000 = 24,000
tax = 0.30 x 24000 = 7,200
$ATS = 42000 - 7200$ = $34,800
fully depreciated (BV 0):
42000 x 0.70 = 29,400

## Terminal year cash flow
Q: final year: operating FCF 88,000,
sells equipment 42,000 (BV 18,000,
tax 30%), recovers 35,000 NWC.
ENTER: sale 42000 | book value 18000 |
Tc 30 | final-yr operating FCF 88000 |
NWC recovered 35000
= 88,000 + 34,800 + 35,000 = $157,800
(forgetting the NWC is the usual error)

## Mock terminal: fully depreciated
Q: 10,000 operating, 1,000 sale of a
fully depreciated machine, 2,000 NWC
recovered, tax 40%.
ENTER: sale 1000 | Tc 40 | op FCF 10000
| NWC recovered 2000 (BV blank = 0)
= 10000 + 1000 x 0.6 + 2000 = $12,600

## Mock: modem replacement (relevant?)
Q: which is NOT relevant to replacing
the modem?
$50,000 R&D on the OLD modem: SUNK ->
not relevant. Relevant: equipment you
own (opportunity cost 30,000),
installation 500, salvage 25,000.

## Straight-line depreciation
Q: cost 145,000, salvage 25,000, 8 yrs.
ENTER: asset cost 145000 |
salvage 25000 | life 8
$(145000 - 25000)/8$ = $15,000 per year

## Relevant cash flows (concept)
EXCLUDE: market research already done,
R&D already spent (sunk); interest.
INCLUDE: land you own (opportunity
cost), demolition, installation,
lost sales at your other store,
salvage received, working capital.
]],

-- 10 rates
[[## EAR from a nominal rate
Q: 9.6% p.a. compounded monthly.
ENTER: r nominal 9.6 | m 12
$EAR = (1 + 0.096/12)^12 - 1$ = 10.03%
Excel: =EFFECT(0.096, 12)

## Nominal from an EAR
Q: which monthly rate gives EAR 10.03%?
ENTER: EAR 10.03 | m 12 (r blank)
$i = 1.1003^(1/12) - 1$ = 0.8%
r = 0.8 x 12 = 9.6% p.a.
Excel: =NOMINAL(0.1003, 12)

## Same EAR, different frequency
Q: 12% p.a. semi-annual -> equivalent
monthly nominal?
ENTER: r 12 | m 2 | convert to m2 12
EAR = 1.06^2 - 1 = 12.36%
monthly i = 1.1236^(1/12) - 1 = 0.976%
nominal = 11.71% p.a. monthly

## Fisher: real rate
Q: nominal 7.8%, inflation 2.9%.
ENTER: Fisher nominal 7.8 |
inflation 2.9
$r = 1.078/1.029 - 1$ = 4.76%
(7.8 - 2.9 = 4.9% is the wrong shortcut)

## Concept facts
- 10% compounded annually: EAR = 10%
- any m > 1: EAR > nominal
- monthly cash flows need the monthly
  rate, never the EAR
]],
}
for i2, qt in ipairs(TYPES) do qt.worked = WORKED[i2] end

----------------------------------------------------------------------
-- 6e. GLOSSARY (press G anywhere; a letter jumps to that section)
----------------------------------------------------------------------

local GLOSSARY = [[## after-tax salvage
what you keep from selling an asset:
sale price - tax on the gain (sale -
book value) x Tc. Gain taxed, loss
gives a tax saving.
IN QUESTIONS: 'sold for $X at the end,
book value $Y, tax 30%' -> last-year
cash flow. 'Fully depreciated' -> BV 0,
whole sale taxed. Trap: forgetting the
tax, or taxing the whole price.
-> TYPE 9
## amortisation
paying a loan off with equal payments;
each one is part interest, part
principal. Balance falls to zero.
IN QUESTIONS: any mortgage / car loan.
Concept trap: which part of the payment
rises over time? principal. Interest
falls.
-> TYPE 3
## annual payment / per year for n years
a level stream = annuity.
-> TYPE 2: C, r, n.
## annuity
equal payments, one per period, for a
fixed number of periods. Loan
repayments, bond coupons, rent.
IN QUESTIONS: 'X per year for n years'.
Asked for: its PV (max to pay), the
payment (loans), or n. Check timing:
end of period unless it says start.
-> TYPE 2
## annuity due
an annuity paid at the START of each
period (rent, insurance). Worth
ordinary x (1 + i).
IN QUESTIONS: 'at the beginning of each
period', 'in advance', rent, leases.
Concept trap: a due annuity is worth
MORE than an ordinary one (never less).
-> TYPE 2
## at the beginning of each period / in advance
annuity due. -> TYPE 2: timing =
start (due). Rent, leases, insurance.
## balance (loan)
what you still owe = PV of the
payments still to come.
IN QUESTIONS: 'how much is still owed
after k payments', or the first step of
any rate-change question.
-> TYPE 3
## bond
an IOU: pays a fixed coupon each
period and the face value at maturity.
IN QUESTIONS: price from a yield, yield
from a price, value at a future date,
sold early (realised yield), true/false
facts about what moves the price.
-> TYPE 4
## book value
cost minus all depreciation so far.
Used for the tax on a sale.
IN QUESTIONS: given directly ('book
value $18,000') or built from cost -
depreciation. Needed only to tax the
gain on a sale. 'Fully depreciated' = 0.
-> TYPE 9
## borrow $X over n years, monthly repayments
a loan = annuity solved for PMT.
-> TYPE 3: L, years, m 12, r.
## bought a bond for $X ... sold after n years
realised yield (IRR of what you paid
and got). -> TYPE 5: price paid,
coupon, m, years held, sale price.
## bought for $X, sold for $Y after a dividend
capital gain yield = (P1 - P0)/P0.
-> TYPE 6: P0, P1, Div1 -> yields.
## buyer offers equal payments, first in two years
a deferred annuity.
-> TYPE 2: C, r, n, first payment at
t 2, price = what you want -> NPV.
## CapEx
capital expenditure: cash spent
buying long-lived assets.
IN QUESTIONS: 'buys equipment for $X'
at t = 0, subtracted in FCF. Not
depreciation: that is spread later.
-> TYPE 9
## capital budgeting
deciding which long-term projects to
invest in (NPV, IRR, payback, PI).
IN QUESTIONS: the whole of weeks 4-5.
Concept trap: 'deciding to open a mine'
IS a capital budgeting decision;
financing choices are easier to
reverse than investment ones.
-> TYPE 7
## capital gain yield
(P1 - P0)/P0: the return from the
price change only, no dividend.
IN QUESTIONS: 'bought for P0, sold for
P1 a year later after a dividend'.
Use prices only. The dividend is the
other part (dividend yield). Under
constant growth it equals g.
-> TYPE 6
## capital rationing
not enough money for every good
project -> rank by PI, fit the budget.
IN QUESTIONS: 'an investor has $35m and
four projects'. Rank by PI, then check
which SET fits the budget - the top PI
alone is not always the best use.
-> TYPE 7
## cash flow
actual money in or out at a date.
Not profit: depreciation is not a
cash flow.
IN QUESTIONS: everything is valued from
cash flows, never accounting profit.
Depreciation only matters through the
tax it saves.
-> TYPE 7
## CDGM
constant dividend growth model:
P0 = Div1/(rE - g). Dividends grow at
g forever.
IN QUESTIONS: 'dividends grow at g
forever, required return rE': P0.
Read 'just paid' (Div0, grow once) vs
'will pay' (Div1, use as is). Needs
g < rE.
-> TYPE 6
## compounded continuously
-> TYPE 1 with m = continuous.
FV = PV*e^(rn). No calculator function.
## compounded monthly / quarterly / semi-annually
sets m (12 / 4 / 2). The rate per
period is r/m and periods are n x m.
-> the m choice slot on types 1, 2, 3,
4, 10.
-> TYPE 1
## compounding
earning interest on interest. m per
year = how often it is added.
IN QUESTIONS: 'compounded monthly /
quarterly / semi-annually' sets m.
More compounding -> higher EAR ->
bigger FV. Concept: 10% yearly has
EAR exactly 10%.
-> TYPE 1
## continuous compounding
compounding every instant: FV =
PV*e^(rn). No calculator function.
IN QUESTIONS: 'compounded continuously'
-> FV = PV e^(rn). Always the biggest
FV for a given quoted rate. No
calculator or Excel function.
-> TYPE 1
## contract pays $X growing g% a year
growing annuity (C is the FIRST
payment). -> TYPE 2: C, r, n, g.
## cost of capital (k)
the return investors require = the
rate you could earn elsewhere at the
same risk = the discount rate for NPV.
Also called required return, hurdle
rate, opportunity cost of capital.
IN QUESTIONS: 'cost of capital 6%',
'can invest at 9%', 'discount rate',
'required return' - the k for NPV and
the hurdle for IRR. Not needed for IRR
or payback themselves.
-> TYPE 7
## coupon (CPN)
the fixed interest a bond pays each
period: coupon rate x face / m.
IN QUESTIONS: '$42.50 coupon semi-
annually' (dollars) or '9% coupon paid
semi-annually' (rate x face / m). The
annuity part of a bond.
-> TYPE 4
## coupon rate
% of face value paid per year. Set
when the bond is issued; never moves.
IN QUESTIONS: compare it with the yield
to predict price: below yield ->
discount, above -> premium. Concept:
lower coupon -> MORE rate sensitivity.
-> TYPE 4
## coupon rate X% paid semi-annually
-> TYPE 4: coupon rate, m 2, years,
yield -> price. Halve coupon, halve
yield, double periods happens for you.
## crossover rate
the discount rate where two projects
have the same NPV = IRR of (A - B).
IN QUESTIONS: 'profiles cross at 9%',
'when should the lower-IRR project be
chosen' -> when crossover > k (k in
the conflict zone, NPV rules). Found
as IRR of (A - B).
-> TYPE 7
## dealer wants $X today, then ... each year
a mixed stream: different amounts.
-> TYPE 7: k = rate, CF0 = today's
amount, CF1.. the rest, all POSITIVE.
NPV row = total PV of what you pay.
## deferred
starts later than usual. Deferred
annuity: first payment after t = 1.
Deferred coupons: skipped, paid at
maturity.
IN QUESTIONS: 'first payment in two
years', 'no coupons for 4 years'. The
annuity formula lands one period
before the first payment: discount the
rest. Trap: stopping one step early.
-> TYPE 2
## deposit today to have $X in n years
one amount pulled back = PV.
-> TYPE 1: FV, r, n (PV blank).
## depreciation
spreading an asset's cost over its
life for tax. Straight-line: (cost -
salvage)/life. Diminishing value:
rate x opening book value.
IN QUESTIONS: 'cost $145,000, salvage
$25,000, 8 years' -> straight-line
per year; 'diminishing value 25%' ->
rate x opening book value. Feeds FCF
(tax shield) and book value at sale.
-> TYPE 9
## discount factor
1/(1 + r)^t: what $1 at year t is
worth today.
IN QUESTIONS: the number each cash
flow is multiplied by. Smaller for
later years and higher rates. The T
table shows it per year.
-> TYPE 1
## discount rate
the rate used to bring future money
back to today = cost of capital.
Called r in annuity / growing-stream
questions, k in project NPV.
IN QUESTIONS: 'at a 10% discount rate,
what is the PV' -> r for streams, k
for projects. Higher rate -> lower PV
always.
-> TYPE 2 (r) for streams of payments
-> TYPE 7 (k) for a project's NPV
## discounting
moving money BACK in time (divide by
(1 + r)^t). Opposite of compounding.
IN QUESTIONS: any 'what is it worth
today'. Divide by (1 + r)^t once per
period between the cash flow and
today.
-> TYPE 1
## dividend
cash a company pays its shareholders.
Div0 = just paid, Div1 = next one.
IN QUESTIONS: 'just paid' = Div0 (grow
it once); 'will pay / next year' =
Div1; 'fixed' = preference share.
-> TYPE 6
## dividend yield
Div1/P0: the return from the dividend
alone.
IN QUESTIONS: 'what is the dividend
yield' -> Div1/P0. Total return =
dividend yield + capital gain yield.
-> TYPE 6
## double / triple your money
only the ratio FV/PV matters.
-> TYPE 1: multiple 2 or 3, r, m
(PV and FV blank) -> n.
## EAA / EAC
equivalent annual annuity / cost: a
project's NPV spread into a level
yearly amount so different lives can
be compared. EAA higher wins, EAC
lower wins.
IN QUESTIONS: 'NPV $24,500 over 6 years
vs $17,800 over 4 years - which?'
Convert both to a yearly amount. Read
the label: benefits (EAA) higher
wins, costs (EAC) lower wins. Concept:
EAA is THE tool for different lives.
-> TYPE 8
## EAR
effective annual rate: the true yearly
rate once compounding is counted.
(1 + r/m)^m - 1.
IN QUESTIONS: 'effective annual rate
of 9.6% compounded monthly', 'which
loan is cheaper' (compare EARs).
Concept: m = 1 -> EAR = r; m > 1 ->
EAR > r, never less.
-> TYPE 10
## effective annual yield / effective YTM
the compounded yearly figure, not
y x m. -> TYPE 4 or 5: read the
effective row.
## effective annual yield (EAY)
the EAR of a bond's yield:
(1 + y)^m - 1 with y per period.
IN QUESTIONS: 'effective yield to
maturity' on a semi-annual bond ->
(1 + y)^2 - 1 with y per half-year.
The nominal (y x 2) is always the
trap option next to it.
-> TYPE 4
## end of year / end of each period
ordinary timing (the default).
First payment at t = 1.
-> TYPE 2
## endowment / trust / scholarship fund
pays the same amount every year FOREVER
= a perpetuity. PV = C/r, valued one
period before the first payment.
-> TYPE 2: C, r, n BLANK, and "first
payment at t" if it starts late.
e.g. $750 forever, first at end of
year 6, 6%: C 750 | r 6 | first 6
-> $9,340.73
## equipment costs $X, salvage $Y, useful life n
straight-line depreciation.
-> TYPE 9: asset cost, salvage
estimate, life.
## equipment you own could be used
opportunity cost at market value.
Include it.
-> TYPE 9
## expected share price in one year
P1 = P0(1 + g). -> TYPE 6, read the
P1 row.
## face value / par value $1,000
the bond's repayment at maturity.
-> TYPE 4 or 5: Face slot (default
1000).
## face value (par)
the amount a bond repays at maturity,
usually $1,000. Coupons are % of it.
IN QUESTIONS: 'a $1,000 bond', 'par
value $1,000'. The coupon is a % of
it; it is repaid at maturity. If not
stated, 1000.
-> TYPE 4
## FCF
free cash flow: cash a project throws
off after tax, CapEx and working
capital. (Rev - Costs - Dep)(1 - Tc)
+ Dep - CapEx - dNWC.
IN QUESTIONS: 'revenue, costs,
depreciation, tax rate' -> one year's
cash flow. Two methods, same answer.
Add salvage + NWC back in the final
year. Excel required in the test.
-> TYPE 9
## Fisher relation
(1 + nominal) = (1 + real)(1 + infl).
Real is NOT nominal minus inflation.
IN QUESTIONS: 'nominal 7.8%, inflation
2.9%, real rate?' -> (1.078/1.029) - 1
= 4.76%, NOT 4.9%. Concept: discount
nominal flows at nominal, real at
real.
-> TYPE 10
## forever / indefinitely / in perpetuity
-> TYPE 2 with n BLANK (perpetuity).
Growing forever: also fill g.
## fully depreciated
book value is 0: the whole sale price
is taxed. -> TYPE 9: leave book value
blank.
## FV
future value: what an amount grows to
by a later date.
IN QUESTIONS: 'what is it worth in n
years', 'balance at the end'. Grow
forward: multiply by (1 + i)^N.
-> TYPE 1
## growing annuity / perpetuity
payments that rise by g each period.
C is the FIRST payment. Needs g < r
for the perpetuity.
IN QUESTIONS: 'pays $32,000 growing 5%
a year for 12 years' / 'growing at g
forever'. C is the FIRST payment.
Concept: growing perpetuity has
regular intervals; needs g < r.
-> TYPE 2
## grows from $X to $Y in n years
asks for the return r.
-> TYPE 1: PV, FV, n (r blank).
## hurdle rate
the minimum return a project must
earn = cost of capital.
IN QUESTIONS: same as cost of capital;
IRR must beat it. Accept if IRR > k.
-> TYPE 7
## i (rate per period)
r/m. The rate the formulas actually
use. Monthly: r/12.
IN QUESTIONS: any 'monthly / semi-
annual' question: convert r to r/m
BEFORE using a formula. Concept:
monthly cash flows need the monthly
rate, not the EAR.
-> TYPE 10
## in n years' time the yield is expected to be
value at a future date.
-> TYPE 4: years elapsed n, yield =
the future yield, years = original
years to maturity.
## incremental cash flow
what changes BECAUSE of the decision:
with the project minus without it.
IN QUESTIONS: 'which cash flows are
relevant to the decision': only what
changes because of it. Lost sales
elsewhere count; sunk costs do not.
-> TYPE 9
## independent projects
accepting one does not stop another:
accept every one with NPV > 0.
IN QUESTIONS: 'independent' -> accept
all with NPV > 0 (or IRR > k). No
ranking needed.
-> TYPE 7
## inflation
general rise in prices; erodes the
real value of a nominal cash flow.
IN QUESTIONS: appears with a nominal
rate -> Fisher for the real rate. Or
'treat inflation consistently' in the
four cash-flow rules.
-> TYPE 10
## installation and transport costs
part of the outlay. Include.
-> TYPE 9
## interest rate risk
how much a bond's price moves when
rates move. Longer maturity and lower
coupon -> more risk.
IN QUESTIONS: true/false statements.
'Long-term bonds are MORE sensitive
than short-term' TRUE. 'Lower coupon
is LESS affected' FALSE (it is more).
Rates up -> prices down, always.
-> TYPE 4
## invest today ... worth in n years
one amount grown forward = FV.
-> TYPE 1: PV, r, n, m (FV blank).
## investor has $X million, four projects
capital rationing: rank by PI.
-> TYPE 7 one project at a time: k,
CF0 = -cost, level CF, years -> PI.
## IRR
internal rate of return: the discount
rate that makes NPV = 0. Accept if
IRR > k. Can conflict with NPV.
IN QUESTIONS: 'what is the IRR (nearest
percent)' -> type the cash flows, k
not needed. 'How many IRRs' -> count
sign changes. Concept: a higher IRR
does NOT guarantee selection; when it
conflicts with NPV, NPV wins.
-> TYPE 7
## just paid a dividend of $X
that is Div0: it must be grown once.
-> TYPE 6: Div0 slot (not Div1).
## lender quotes X% p.a. compounded monthly
a nominal rate. The true yearly cost
is the EAR. -> TYPE 10: r, m -> EAR.
## lost sales at the existing store
a side effect of the project.
Include (it is incremental).
-> TYPE 9
## machine sold for $X, book value $Y
after-tax salvage.
-> TYPE 9: sale price, book value, Tc.
## market research done last month
already spent = SUNK. Exclude it.
(concept question: no slots)
-> TYPE 9
## maturity
the date a bond repays its face value.
"years to maturity" = years left.
IN QUESTIONS: 'years to maturity' = N/m
from TODAY. 'In 5 years time' -> use
the years then LEFT. Price -> face as
maturity nears.
-> TYPE 4
## mixed stream
cash flows of different sizes: no
shortcut, discount each one and add.
IN QUESTIONS: 'pay $7,000 now, then
$5,000, $4,000, $3,000': PV of all of
it -> type 7 with everything positive.
No shortcut formula exists.
-> TYPE 7
## most you should invest / maximum to pay
= the PV of what you get back.
-> TYPE 2 (equal amounts: C, r, n) or
TYPE 7 (uneven: k, CF1.., CF0 blank).
## mutually exclusive
choosing one rules the other out:
take the HIGHEST NPV (and > 0).
IN QUESTIONS: 'must choose between A
and B'. Highest NPV wins (and > 0).
If IRR says otherwise, ignore IRR.
-> TYPE 7
## mutually exclusive projects A and B
only one can be taken: highest NPV.
-> TYPE 7: projects = A and B.
## N (periods)
years x m: number of compounding or
payment periods.
IN QUESTIONS: 'semi-annual, 12 years'
-> N = 24. Always years x m; the
formulas count periods, not years.
-> TYPE 1
## net working capital (NWC)
cash tied up in stock and receivables
to run the project. Goes in at the
start, comes back untaxed at the end.
IN QUESTIONS: 'requires $2,000 of
working capital' -> outflow at the
start, recovered UNTAXED in the final
year. Forgetting the recovery is the
classic terminal-year error.
-> TYPE 9
## nominal interest rate X%, inflation Y%
Fisher: real rate.
-> TYPE 10: Fisher nominal, inflation.
## nominal rate (APR, r p.a.)
the quoted yearly rate BEFORE
compounding is counted. i = r/m.
IN QUESTIONS: '9.6% p.a. compounded
monthly', 'lender quotes'. Divide by m
for the period rate; convert to EAR to
compare loans.
-> TYPE 10
## nominal vs real
nominal includes inflation, real
strips it out. Discount nominal cash
flows at the nominal rate, real at
real - never mix.
IN QUESTIONS: 'real rate of return',
'in today's dollars'. Fisher converts.
Rule: never discount real cash flows
at a nominal rate or vice versa.
-> TYPE 10
## NPV
net present value: PV of all cash
flows including the outlay at t = 0.
Value created today. Accept if > 0.
IN QUESTIONS: 'what is the NPV', 'should
you accept', 'which project' -> PV of
all flows minus the outlay. Positive =
accept. Excel: NPV() from t = 1, add
CF0 outside.
-> TYPE 7
## NPV of $X over 6 years vs $Y over 4 years
different lives -> EAA.
-> TYPE 8: NPV + life for each, k.
## NPV profile
graph of NPV against the discount
rate. Crosses zero at the IRR.
IN QUESTIONS: 'when graphing NPV against
discount rates...'. IRR = where a line
hits zero; crossover = where two lines
meet; steeper line = later cash flows.
-> TYPE 7
## NPV profiles cross at X%
X% is the crossover rate. If k is
below it NPV and IRR conflict: follow
NPV. -> TYPE 7 A and B gives it.
## one mark each / nearest percent
round only at the very end; keep
full decimals in between.
-> TYPE 7
## opportunity cost
what you give up by using something
you already own (land at market
value). INCLUDE it.
IN QUESTIONS: 'land the company already
owns', 'equipment you own could be
used' -> INCLUDE at market value. It
is a real cost of the project.
-> TYPE 9
## ordinary annuity
payments at the END of each period,
first one at t = 1. The default.
IN QUESTIONS: 'at the end of each year'
or nothing said -> ordinary. Excel
type 0. Formula lands at t = 0 when
the first payment is at t = 1.
-> TYPE 2
## p.a.
per annum = per year.
IN QUESTIONS: '7% p.a.' is the yearly
quoted rate; with 'compounded monthly'
it is nominal -> divide by 12.
-> TYPE 1
## par / premium / discount bond
price = face (coupon rate = yield) /
above face (coupon > yield) / below
face (coupon < yield).
IN QUESTIONS: 'will the bond trade at a
premium or discount' -> compare coupon
rate with yield. Concept: 'maturity
value includes a premium' is FALSE.
-> TYPE 4
## payback period
years until the cumulative cash flows
repay the outlay. Ignores time value
and anything after payback.
IN QUESTIONS: 'how long to recover the
outlay' -> running total until it
turns positive; fraction = still owed
/ next year's flow. No discount rate
needed. Ignores later flows.
-> TYPE 7
## perpetuity
equal payments forever. PV = C/r,
valued one period before the first.
IN QUESTIONS: 'forever', 'indefinitely',
endowment, preference share. PV = C/r,
valued one period before the first
payment - discount the rest if it
starts late.
-> TYPE 2
## PI (profitability index)
this unit: NPV / initial investment,
accept if > 0. Ranks projects when
capital is rationed.
IN QUESTIONS: 'which project has the
highest PI' under a budget. This unit:
NPV / outlay, accept > 0. Concept: PI
handles ONE constraint only.
-> TYPE 7
## PMT
the payment per period on a loan or
annuity.
IN QUESTIONS: 'what is the monthly
repayment' -> loan / annuity factor.
Excel PMT gives it negative.
-> TYPE 3
## preference share
fixed dividend forever: P0 = Div/rE.
IN QUESTIONS: 'fixed dividend of $4.20
forever, required return 7.5%' ->
Div/rE = 56. Same value at any date
because nothing grows.
-> TYPE 6: Div1, rE (g blank).
## priced at $X, what is the yield
-> TYPE 4: fill price, leave yield
blank; it is found by search.
## principal
the amount borrowed, or the part of a
payment that reduces the balance.
IN QUESTIONS: 'how much of the payment
is principal' -> PMT minus interest.
Concept: its share RISES over the
loan.
-> TYPE 3
## project costs $X and returns ... each year
-> TYPE 7: k, CF0 = -X (NEGATIVE),
CF1.. the returns. Same every year:
level CF + years.
## PV
present value: what a future amount
is worth today.
IN QUESTIONS: 'worth today', 'deposit
now', 'maximum you should pay'. Every
valuation in the unit is a PV.
-> TYPE 1
## rate rises / falls x years into the loan
repricing: balance first, then a new
payment. -> TYPE 3: add k = payments
made (years x m) and new r.
## R&D already spent on the old model
sunk cost: irrelevant. Exclude.
-> TYPE 9
## rE (required return on equity)
the return shareholders demand; the
discount rate for dividends.
IN QUESTIONS: 'required return 11.5%',
'cost of equity', 'you require 13%'
-> rE. Never the growth slot.
-> TYPE 6
## realised yield
the return you actually got: IRR of
price paid, coupons received and the
sale price. Differs from YTM if sold
early.
IN QUESTIONS: 'bought for X, sold after
n years for Y' -> IRR of the flows;
nominal = x m unless 'effective' is
asked. Differs from YTM because of
the sale price.
-> TYPE 5
## recovers working capital / initial NWC requirement
comes back untaxed in the last year.
-> TYPE 9: NWC recovered (terminal).
## relevant cash flow
one that changes because of the
decision. Sunk costs and interest are
NOT relevant.
IN QUESTIONS: 'which should be
EXCLUDED / NOT relevant' -> the sunk
one (research already done, R&D
already spent) or interest expense.
-> TYPE 9
## replacement chain
repeat shorter projects until the
lives match; alternative to EAA.
IN QUESTIONS: alternative wording for
the different-lives problem; the
answer is still EAA.
-> TYPE 8
## required return
= cost of capital = discount rate.
IN QUESTIONS: for bonds it is the
YIELD; for shares it is rE; for
projects it is k. Same idea, three
slots.
-> TYPE 7
## required return / yield to maturity (bond)
for bonds these are the yield.
-> TYPE 4: yield slot. Given the price
instead? leave yield blank, fill price.
## restructure: no coupons for the first k years
deferred coupons paid at maturity.
-> TYPE 4: coupons skipped = k x m.
## revenue, costs, depreciation, tax rate
one year's free cash flow.
-> TYPE 9: revenue, costs,
depreciation, Tc.
## salvage value
what an asset sells for at the end.
IN QUESTIONS: 'salvage value $25,000'
in depreciation (SL uses cost minus
it) or 'sold for $42,000' at the end
(after-tax salvage).
-> TYPE 9
## scrapping / selling the old equipment
salvage value received: a real cash
inflow. Include it (after tax).
-> TYPE 9
## semi-annual
twice a year: m = 2. Halve the rate,
halve the coupon, double the periods.
IN QUESTIONS: 'paid semi-annually',
'compounded semi-annually' -> m = 2:
halve the rate, halve the coupon,
double the periods. All three.
-> TYPE 4
## sunk cost
money already spent, gone whatever
you decide (research last month).
EXCLUDE it.
IN QUESTIONS: 'market research last
month', 'R&D already spent on the old
model' -> the one to EXCLUDE.
-> TYPE 9
## t (time index)
the period number: t = 0 today,
t = 1 end of the first period.
IN QUESTIONS: draw the timeline first;
mark where the FIRST payment sits.
That alone decides how many periods
to discount.
-> TYPE 2
## tax shield
tax saved because depreciation is
deductible: Tc x Dep.
IN QUESTIONS: FCF method 2 uses it
directly: Tc x Dep. Higher
depreciation -> more tax saved.
-> TYPE 9
## terminal cash flow
the last year's total: operating FCF
+ after-tax salvage + NWC recovered.
IN QUESTIONS: 'undiscounted cash flow in
the final year' -> operating FCF +
after-tax salvage + NWC recovered.
Three parts; most people drop one.
-> TYPE 9
## terminal value
the value at the end of the high-
growth phase: Div(n+1)/(rE - g).
IN QUESTIONS: two-stage growth: P_n =
Div(n+1)/(rE - g), then discounted n
periods (not n + 1).
-> TYPE 6
## time value of money
a dollar today beats a dollar later
because today's can earn interest.
IN QUESTIONS: the reason every formula
exists. Concept: 'a dollar today is
worth more than a dollar tomorrow'.
-> TYPE 1
## timing
END of period = ordinary (type 0 in
Excel), START = due (type 1).
IN QUESTIONS: 'end of period' = ordinary
(Excel type 0); 'beginning' = due
(type 1). Changes PV by a factor of
(1 + i).
-> TYPE 2
## will pay a dividend of $X at year end
already Div1: do NOT grow it.
-> TYPE 6: Div1 slot.
## willing to pay $X today, sell for $Y in a year
solve the dividend needed.
-> TYPE 6: P0, P1, rE (Div blank).
## yield / YTM
yield to maturity: the return if you
buy at today's price and hold to the
end with every payment made. Moves
with the market.
IN QUESTIONS: 'required return 8.2%' on
a bond IS the yield. 'Priced at $948,
find the yield' -> solve from price.
Concept: YTM is the PROMISED return;
with default risk the expected return
is lower.
-> TYPE 4
## zero coupon bond
no coupons; just face value at
maturity. P = F/(1 + y)^N.
IN QUESTIONS: 'pays no coupons' ->
price = face / (1 + y)^N, always below
face.
-> TYPE 4
]]

----------------------------------------------------------------------
-- 6f. PLAIN WORDS: the formula said in English + what every letter is
--     (shown under the formula strip and at the top of each notes page)
----------------------------------------------------------------------

local WORDS = {
  { "future value = amount today x (1 + rate per period) ^ number of periods",
    { "PV = the amount today", "FV = the amount at the later date", "r = yearly rate (as quoted)",
      "m = how many times a year it compounds", "i = r/m = rate for ONE period", "n = years",
      "N = n x m = number of periods", "EAR = the true yearly rate after compounding" } },
  { "value one period before the 1st payment = payment x annuity factor; then divide by (1 + i) once per period back to today",
    { "C = the payment each period (the FIRST one if they grow)", "i = rate per period = r/m",
      "N = how many payments", "g = growth of the payment each period", "t1 = period number of the first payment",
      "factor = value of $1 per period = (1 - 1/(1 + i)^N)/i", "PV = value today (t = 0)",
      "FV = value at the date of the last payment", "price = what you are asked to pay / want; NPV = PV - price" } },
  { "repayment = amount borrowed / annuity factor; balance still owed = PV of the repayments not yet made",
    { "L = amount borrowed", "PMT = repayment each period", "i = yearly rate / m", "N = years x m = number of repayments",
      "k = repayments already made", "B_k = balance (still owed) after k repayments", "r2 = the new yearly rate" } },
  { "price = PV of all the coupons (an annuity) + PV of the face value (a lump sum at the end)",
    { "P = price of the bond today", "CPN = coupon = cash paid each period = coupon rate x face / m",
      "F = face value = the lump repaid at maturity (usually 1000)", "c = coupon rate = % of face paid per year",
      "y = yield per period = required return / m", "N = periods to maturity = years x m",
      "m = coupons per year (semi-annual = 2)", "skipped = periods with NO coupon (paid at maturity instead)",
      "EAY = the yield as a true yearly rate" } },
  { "find the rate that makes: price paid = PV of the coupons you collected + PV of the sale price",
    { "P0 = price you paid", "CPN = coupon received each period", "N = periods you held it = years x m",
      "Ps = sale price you got", "i = IRR per period (the rate that balances it)", "realised yield = i x m (nominal) or (1 + i)^m - 1 (effective)" } },
  { "price today = next dividend / (return investors require - dividend growth)",
    { "P0 = share price today", "P1 = share price in one year", "Div0 = dividend JUST paid (already gone)",
      "Div1 = the NEXT dividend, one year away", "rE = yearly return shareholders require", "g = yearly growth of the dividend",
      "g1 = growth in the first (high-growth) years", "Pn = price at the end of the high-growth years" } },
  { "NPV = add up every cash flow after dividing each one by (1 + k) ^ its year; the outlay today counts as a negative",
    { "CF_t = cash flow in year t", "CF0 = outlay today (type it NEGATIVE)", "k = discount rate = cost of capital",
      "t = year number (0 = today)", "IRR = the k that makes NPV exactly zero", "payback = years until the outlay is recovered",
      "PI = NPV / outlay (this unit's version)", "crossover = the k where two projects have equal NPV" } },
  { "equal yearly amount = NPV / annuity factor for that project's OWN life",
    { "NPV = value the project creates today", "k = cost of capital", "t = that project's life in years",
      "EAA = equal yearly benefit worth the same as the NPV (higher wins)", "EAC = the same for costs (lower wins)" } },
  { "free cash flow = (revenue - costs - depreciation) x (1 - tax rate) + depreciation - new equipment - extra working capital",
    { "Rev = sales revenue", "Costs = operating costs (not depreciation)", "Dep = depreciation for the year",
      "Tc = company tax rate", "CapEx = money spent on equipment", "dNWC = extra working capital tied up (comes back at the end)",
      "BV = book value = cost - depreciation so far", "ATS = after-tax salvage = sale price - tax on (sale - BV)",
      "terminal = last year's FCF + ATS + working capital back" } },
  { "true yearly rate = (1 + quoted yearly rate / times per year) ^ times per year - 1",
    { "r = quoted (nominal) yearly rate, e.g. '9.6% p.a. compounded monthly'", "m = compounds per year",
      "i = r/m = rate per period", "EAR = effective = true yearly rate", "rc = continuous rate", "m2 = a different frequency to convert to",
      "n = nominal rate (with inflation in it)", "real = rate after taking inflation out", "infl = inflation rate" } },
}
for i2, qt in ipairs(TYPES) do
  qt.words = WORDS[i2][1]
  qt.letters = WORDS[i2][2]
  qt.notes = "IN WORDS\n" .. qt.words .. "\n\nWHAT THE LETTERS MEAN\n" ..
             table.concat(qt.letters, "\n") .. "\n\n" .. qt.notes
end

----------------------------------------------------------------------
-- 6g. ACRONYMS: every abbreviation that appears on each type's screens
----------------------------------------------------------------------

local ACRONYMS = {
  { "PV = present value: what an amount is worth today", "FV = future value: what it grows to at a later date",
    "p.a. = per annum = per year", "m = compounds per year", "n = years; N = number of periods = n x m",
    "r = quoted yearly rate; i = rate per period = r/m", "EAR = effective annual rate: the true yearly rate",
    "e = 2.71828..., the base used for continuous compounding" },
  { "PV = present value (today); FV = future value (later)", "C = the cash flow / payment each period",
    "n or N = number of payments", "i = rate per period; r = yearly rate; m = payments per year",
    "g = growth rate of the payments", "t = period number; t1 = period of the first payment",
    "NPV = net present value = PV of what you get minus what you pay",
    "annuity due = payments at the START of each period", "perpetuity = payments that go on forever" },
  { "L = loan: the amount borrowed", "PMT = payment: the repayment each period",
    "PV = present value: a loan is the PV of its repayments", "i = rate per period = r/m; r = yearly rate",
    "N = number of repayments = years x m", "k = repayments already made; B_k = balance after k",
    "r2 = the new yearly rate after k repayments" },
  { "P = price of the bond today", "CPN = coupon: the cash interest paid each period",
    "F = face value (also par value): the amount repaid at maturity", "c = coupon rate: % of face paid per year",
    "y = yield per period; YTM = yield to maturity = the yearly return if held to the end",
    "EAY = effective annual yield: the yield as a true yearly rate", "N = periods to maturity = years x m",
    "m = coupons per year", "PV = present value; DF = discount factor = 1/(1 + y)^t" },
  { "P0 = price paid at t = 0; Ps = sale price", "CPN = coupon: cash received each period",
    "N = periods held = years x m; m = coupons per year",
    "IRR = internal rate of return: the rate that makes the flows balance to zero",
    "realised yield = the return you actually got = IRR x m", "EAY = effective annual yield = (1 + IRR)^m - 1" },
  { "P0 = share price today; P1 = price in one year; Pn = price at year n",
    "Div0 = dividend just paid; Div1 = the next dividend; Divn = dividend in year n",
    "rE = required return on equity: the yearly return shareholders demand",
    "g = growth rate of the dividend; g1 = growth in the early high-growth years",
    "CDGM = constant dividend growth model: P0 = Div1/(rE - g)",
    "DF = discount factor = 1/(1 + rE)^t; PV = present value" },
  { "CF = cash flow; CF0 = the cash flow today (t = 0); CFt = cash flow in year t",
    "NPV = net present value: PV of all cash flows including the outlay",
    "IRR = internal rate of return: the rate where NPV = 0",
    "PI = profitability index: NPV / investment (this unit)", "k = discount rate = cost of capital",
    "DF = discount factor = 1/(1 + k)^t; PV = present value; cumPV = running total of PV",
    "A / B = the two projects being compared", "payback = years until the outlay is recovered" },
  { "EAA = equivalent annual annuity: a project's NPV spread into one equal yearly benefit",
    "EAC = equivalent annual cost: the same idea for costs", "NPV = net present value of the project",
    "k = cost of capital; t = the project's life in years", "factor = annuity factor = (1 - 1/(1 + k)^t)/k" },
  { "FCF = free cash flow: the cash a project generates in a year after tax, equipment spend and working capital",
    "Rev = revenue (sales); Costs = operating costs", "Dep = depreciation: the asset's cost spread over its life for tax",
    "Tc = company (corporate) tax rate", "EBIT = earnings before interest and tax = Rev - Costs - Dep",
    "CapEx = capital expenditure: cash spent on equipment", "NWC = net working capital; dNWC = the change in it",
    "BV = book value = cost - depreciation so far", "ATS = after-tax salvage = sale price - tax on the gain",
    "SL = straight-line depreciation; DV = diminishing value depreciation",
    "TCF = terminal cash flow: the last year's total; op FCF = operating FCF of that year",
    "Fisher = the nominal / real / inflation relation" },
  { "r = nominal (quoted) yearly rate, also called APR = annual percentage rate",
    "EAR = effective annual rate: the true yearly rate once compounding is counted",
    "i = rate per period = r/m; m = compounds per year; m2 = a different frequency",
    "rc = continuously compounded rate", "n = nominal rate; real = rate with inflation removed; infl = inflation",
    "Fisher = (1 + nominal) = (1 + real)(1 + inflation)" },
}
for i2, qt in ipairs(TYPES) do
  qt.acronyms = ACRONYMS[i2]
  qt.notes = qt.notes:gsub("\nWHAT THE LETTERS MEAN\n", "\nACRONYMS\n" .. table.concat(qt.acronyms, "\n") .. "\n\nWHAT THE LETTERS MEAN\n", 1)
end

local HELP = [[BFC2140 SOLVER - HOW TO USE
(build ]] .. VERSION .. [[)

MENU: press 1-9 or 0 (= type 10), or
arrows + ENTER. H = this page.

INPUT SCREEN
- type numbers into the highlighted slot
- up/down or TAB move between slots
- left/right change a < choice >
- ENTER = SOLVE   ESC = back
- DEL clears the slot, backspace = one
- D (or C) clears EVERY slot on the
  page - start a new question
- N = notes (formulas + how to use)
- A = steps + traps (what to write)
- W = worked solutions: the course's
  questions solved step by step, with
  the exact slots to fill
- G = glossary of every finance word
  AND every question wording. A letter
  jumps to that letter; up/down picks
  a word; ENTER (or click it twice)
  opens the solver type it belongs to
- the formula sits at the top of every
  input and result screen, with the
  same formula in plain words under it;
  N lists what every letter means

ENTRY RULES
- rates as PERCENT: 7 means 7 %
- money plain: 4750 (or 4.75k, 1.2m)
- outlays NEGATIVE: -1680000
- BLANK slot = unknown -> it is solved
- (-) key works as minus

RESULTS
- every number shows its formula
- on the solved page up/down picks a
  value line; I explains that line
  (formula, what the letters mean)
- T = table (timeline / schedule):
  arrows or click a cell -> how it
  was worked out
- red "Need ..." = fill that slot
- CHECK = your inputs disagree
]]

--@include v22_data.lua

----------------------------------------------------------------------
-- 7. INPUT PARSING + SOLVE ORCHESTRATION
----------------------------------------------------------------------

-- returns value, conversionNote, errText
local function parseBuf(buf, kind)
  if buf == "" then return nil end
  local s = buf:lower():gsub(",", "."):gsub("\226\136\146", "-")
  local suffix
  if kind == "money" then
    local last = s:sub(-1)
    if last == "k" or last == "m" then suffix = last; s = s:sub(1, -2) end
  end
  local x = tonumber(s)
  if not x then return nil, nil, "can't read '" .. buf .. "'" end
  if suffix == "k" then
    return x * 1000, fmtN(x) .. "k -> " .. fmtU(x * 1000, "$") .. "  (x1000)"
  elseif suffix == "m" then
    return x * 1e6, fmtN(x) .. "m -> " .. fmtU(x * 1e6, "$") .. "  (x1,000,000)"
  end
  if kind == "pct" then
    return x / 100, nil
  end
  return x
end

-- builds V from a type's slots, then runs its solver into a fresh Out
local function solveFromSlots(qt)
  local out = newOut()
  local V = {}
  local convs, errs = {}, {}
  local vis = {}
  if qt.vis then
    local map = {}
    for _, sl in ipairs(qt.slots) do map[sl.key] = sl end
    for _, key in ipairs(qt.vis(map)) do vis[key] = true end
  end
  for _, sl in ipairs(qt.slots) do
    if (not qt.vis) or vis[sl.key] then
      if sl.kind == "choice" then
        V[sl.key] = sl.opts[sl.idx]
      else
        local x, cnote, perr = parseBuf(sl.buf, sl.kind)
        if perr then
          table.insert(errs, sl.label .. ": " .. perr)
        elseif x then
          V[sl.key] = x
          if cnote then table.insert(convs, sl.label:match("^[^%(]+"):gsub("%s+$", "") .. ": " .. cnote) end
        end
      end
    end
  end
  for _, sl in ipairs(qt.slots) do
    if sl.kind == "pct" and ((not qt.vis) or vis[sl.key]) and sl.buf ~= "" then
      local raw = tonumber((sl.buf:gsub(",", ".")))
      if raw and raw > 0 and raw < 0.5 and sl.buf:find("^%-?0?%.") then
        out:add("bad", "CHECK " .. sl.label:match("^%S+") .. " = " .. sl.buf .. " % - rates go in as PERCENT (7 = 7%). Did you mean " .. fmtN(raw * 100) .. "?")
      end
    end
  end
  for _, e in ipairs(errs) do out:err(e) end
  if #convs > 0 then
    out:head("CONVERSIONS")
    for _, c in ipairs(convs) do out:note(c) end
  end
  local ok, err = pcall(qt.solve, V, out)
  if not ok then
    out:err("Something went wrong in the maths - check the inputs.")
    out:note("(detail: " .. tostring(err):gsub("^.*:%d+:%s*", "") .. ")")
  end
  return out
end

-- direct core entry for tests / other frontends
local function coreRun(idx, Vin)
  local qt = TYPES[idx]
  local out = newOut()
  local ok, err = pcall(qt.solve, Vin, out)
  if not ok then out:err("internal: " .. tostring(err)) end
  return out
end

CORE = { TYPES = TYPES, run = coreRun, fmt = fmtN, fmtU = fmtU, money = money, pct = pct,
         parseBuf = parseBuf, solveFromSlots = solveFromSlots, HELP = HELP, GLOSSARY = GLOSSARY,
         annFac = annFac, irrOf = irrOf, bondPrice = bondPrice }

----------------------------------------------------------------------
-- 8. TI-NSPIRE UI  (only defined when running on the handheld)
----------------------------------------------------------------------

if platform then

  local SW, SH = 318, 212
  local scr = "menu"          -- menu | input | result | table | notes | assume | help
  local prevScr = "menu"
  local menuSel = 1
  local curT = nil
  local sel = 1
  local scrollI, scrollR, scrollN, scrollA, scrollH, scrollT, scrollW, scrollG = 0, 0, 0, 0, 0, 0, 0, 0
  local rlines, nlines, alines, hlines, wlines, glines = {}, {}, {}, {}, {}, {}
  local inputTop = 24         -- y where the slot list starts (below the formula strip)
  local gEntries, gSel, gHits = {}, 1, {}   -- glossary entries, selection, click targets
  local rSelList, rSelIdx, rHits, ilines, scrollI2 = {}, 1, {}, {}, 0  -- result-row picking + inspect page
  local rVis = 9              -- how many result lines fitted on the last paint
  local rPickManual = false   -- true after a click picked a specific line
  local lastVals = {}
  local curTbl = nil          -- { cols, rows } of the last solve
  local tRow, tCol = 1, 1
  local gridHits = {}

  local COL = {
    bg     = { 255, 255, 255 },
    bar    = { 20, 60, 110 },
    barTx  = { 255, 255, 255 },
    text   = { 20, 20, 20 },
    dim    = { 110, 110, 110 },
    selBg  = { 205, 227, 250 },
    val    = { 0, 40, 120 },
    frm    = { 100, 100, 100 },
    note   = { 150, 90, 0 },
    need   = { 190, 0, 0 },
    ok     = { 0, 130, 0 },
    bad    = { 200, 0, 0 },
    head   = { 20, 60, 110 },
    xl     = { 0, 110, 90 },
  }

  local function inval() platform.window:invalidate() end

  function on.resize(w, h) SW, SH = w, h end

  ------------------------------------------------------------------
  -- tiny math typesetter (superscripts, subscripts, dots, fractions,
  -- square roots) - identical engine to the MMA2003 solver
  ------------------------------------------------------------------
  local SUBBASES = { PV=1, FV=1, P=1, D=1, Div=1, C=1, CF=1, NCF=1, B=1, BV=1,
                     t=0, y=0, EAA=1, i=0, g=0, k=0 }
  local SPECIAL = { rE={"r","E"}, Tc={"T","c"}, PVb={"PV","b"} }
  local DOTTED = {}

  local function mparse(str, inline)
    local i, n = 1, #str
    local readSeq
    local function readAtomTxt()
      local c = str:sub(i, i)
      if c:match("%d") then
        local j = i
        while j <= n and str:sub(j, j):match("[%d%.]") do j = j + 1 end
        local t = str:sub(i, j - 1); i = j
        return { t = "txt", s = t }
      elseif c:match("%a") then
        local j = i
        while j <= n and str:sub(j, j):match("%a") do j = j + 1 end
        local base = str:sub(i, j - 1); i = j
        local sub
        if str:sub(i, i) == "_" then
          local k2 = i + 1
          if str:sub(k2, k2) == "(" then
            local k3 = str:find(")", k2, true) or n
            sub = str:sub(k2 + 1, k3 - 1); i = k3 + 1
          else
            while k2 <= n and str:sub(k2, k2):match("%w") do k2 = k2 + 1 end
            sub = str:sub(i + 1, k2 - 1); i = k2
          end
        elseif SUBBASES[base] == 1 then
          local k2 = i
          while k2 <= n and str:sub(k2, k2):match("%d") do k2 = k2 + 1 end
          if k2 > i then sub = str:sub(i, k2 - 1); i = k2 end
        end
        if not sub and SPECIAL[base] then
          base, sub = SPECIAL[base][1], SPECIAL[base][2]
        end
        return { t = "txt", s = base, sub = sub }
      else
        i = i + 1
        return { t = "txt", s = c }
      end
    end
    readSeq = function(stop)
      local nodes = {}
      while i <= n do
        local c = str:sub(i, i)
        if stop and c == ")" then i = i + 1; return nodes end
        if c == "(" then
          i = i + 1
          nodes[#nodes + 1] = { t = "grp", inner = readSeq(true) }
        elseif c == "^" then
          i = i + 1
          local ex
          if str:sub(i, i) == "(" then
            i = i + 1
            ex = readSeq(true)
          else
            ex = { readAtomTxt() }
          end
          nodes[#nodes + 1] = { t = "sup", inner = ex }
        elseif c == "*" then
          i = i + 1
          nodes[#nodes + 1] = { t = "dot" }
        elseif c == " " then
          i = i + 1
          nodes[#nodes + 1] = { t = "sp" }
        elseif c:match("%a") and str:sub(i, i + 4) == "sqrt(" then
          i = i + 5
          nodes[#nodes + 1] = { t = "sqrt", inner = readSeq(true) }
        else
          nodes[#nodes + 1] = readAtomTxt()
        end
      end
      return nodes
    end
    local seq = readSeq(false)
    if inline then return seq end
    local function fracpass(nodes)
      local outn, j = {}, 1
      while j <= #nodes do
        local nd = nodes[j]
        if nd.inner then nd.inner = fracpass(nd.inner) end
        if nd.t == "grp" and nodes[j + 1] and nodes[j + 1].t == "txt"
           and nodes[j + 1].s == "/" and nodes[j + 2] and nodes[j + 2].t == "grp" then
          outn[#outn + 1] = { t = "frac", num = nd.inner,
                              den = fracpass(nodes[j + 2].inner) }
          j = j + 3
        else
          outn[#outn + 1] = nd
          j = j + 1
        end
      end
      return outn
    end
    return fracpass(seq)
  end

  local function setF(gc, size) gc:setFont("sansserif", "r", size) end
  local function scriptSize(size) return (size >= 10) and 9 or 7 end

  local function mrender(gc, nodes, size, x, ymid, draw)
    local ssz = scriptSize(size)
    setF(gc, size)
    local lineH = gc:getStringHeight("Ag")
    local half = lineH / 2
    local w, above, below = 0, half, half
    for _, nd in ipairs(nodes) do
      if nd.t == "txt" then
        setF(gc, size)
        local tw = gc:getStringWidth(nd.s)
        if draw then gc:drawString(nd.s, x + w, ymid - half, "top") end
        w = w + tw
        if nd.sub then
          setF(gc, ssz)
          local sh = gc:getStringHeight("Ag")
          local st2 = ymid + half - 10
          if draw then gc:drawString(nd.sub, x + w, st2, "top") end
          w = w + gc:getStringWidth(nd.sub)
          local ext = (st2 - ymid) + sh
          if ext > below then below = ext end
          setF(gc, size)
        end
      elseif nd.t == "sp" then
        w = w + 3
      elseif nd.t == "dot" then
        if draw then gc:fillRect(x + w + 2, ymid - 1, 2, 2) end
        w = w + 6
      elseif nd.t == "sup" then
        local sw2, sa, sb = mrender(gc, nd.inner, ssz, 0, 0, false)
        local sy = ymid + 1 - sb
        if draw then mrender(gc, nd.inner, ssz, x + w, sy, true) end
        w = w + sw2 + 1
        local ext = sa + sb - 1
        if ext > above then above = ext end
      elseif nd.t == "grp" then
        setF(gc, size)
        if draw then gc:drawString("(", x + w, ymid - half, "top") end
        w = w + gc:getStringWidth("(")
        local iw, ia, ib = mrender(gc, nd.inner, size, x + w, ymid, draw)
        w = w + iw
        if ia > above then above = ia end
        if ib > below then below = ib end
        setF(gc, size)
        if draw then gc:drawString(")", x + w, ymid - half, "top") end
        w = w + gc:getStringWidth(")")
      elseif nd.t == "frac" then
        local nw, na, nb = mrender(gc, nd.num, ssz, 0, 0, false)
        local dw, da, db = mrender(gc, nd.den, ssz, 0, 0, false)
        local fw = math.max(nw, dw) + 6
        if draw then
          mrender(gc, nd.num, ssz, x + w + (fw - nw) / 2, ymid - 2 - nb, true)
          gc:drawLine(x + w + 1, ymid, x + w + fw - 1, ymid)
          mrender(gc, nd.den, ssz, x + w + (fw - dw) / 2, ymid + 2 + da, true)
        end
        w = w + fw
        local ea, eb = 2 + na + nb, 2 + da + db
        if ea > above then above = ea end
        if eb > below then below = eb end
      elseif nd.t == "sqrt" then
        local iw, ia, ib = mrender(gc, nd.inner, size, 0, 0, false)
        if draw then
          local topy = ymid - ia - 2
          gc:drawLine(x + w, ymid, x + w + 3, ymid + ib - 1)
          gc:drawLine(x + w + 3, ymid + ib - 1, x + w + 6, topy)
          gc:drawLine(x + w + 6, topy, x + w + 8 + iw, topy)
          mrender(gc, nd.inner, size, x + w + 8, ymid, true)
        end
        w = w + iw + 10
        if ia + 3 > above then above = ia + 3 end
        if ib > below then below = ib end
      end
    end
    return w, above, below
  end

  local function drawMathLine(gc, s, x, y, size, maxw)
    local ok, nodes = pcall(mparse, s)
    if ok and nodes then
      local ok2, w, a, b = pcall(mrender, gc, nodes, size, 0, 0, false)
      if ok2 and w and w <= maxw then
        mrender(gc, nodes, size, x, y + a, true)
        return a + b + 3
      end
    end
    setF(gc, 9)
    local used = 0
    for _, ln2 in ipairs(wrap(s, 50)) do
      gc:drawString(ln2, x, y + used, "top")
      used = used + 12
    end
    return used + 1
  end

  local function richSegs(line)
    local segs, pos = {}, 1
    while true do
      local a = line:find("%$", pos)
      if not a then
        if pos <= #line then segs[#segs + 1] = { m = false, s = line:sub(pos) } end
        break
      end
      if a > pos then segs[#segs + 1] = { m = false, s = line:sub(pos, a - 1) } end
      local b = line:find("%$", a + 1)
      if not b then
        segs[#segs + 1] = { m = false, s = line:sub(a + 1) }
        break
      end
      segs[#segs + 1] = { m = true, s = line:sub(a + 1, b - 1) }
      pos = b + 1
    end
    return segs
  end

  local function richAtoms(segs)
    local atoms = {}
    for _, sg in ipairs(segs) do
      if sg.m then
        atoms[#atoms + 1] = { m = true, s = sg.s }
      else
        for word in sg.s:gmatch("%S+") do
          atoms[#atoms + 1] = { m = false, s = word }
        end
      end
    end
    return atoms
  end

  local function drawRichLine(gc, atoms, x0, y, size, maxw)
    local i1, total = 1, 0
    while i1 <= #atoms do
      local w, a_, b_, i2 = 0, 0, 0, i1
      local meta = {}
      while i2 <= #atoms do
        local at = atoms[i2]
        local aw, aa, ab
        if at.m then
          if at.nodes == nil then
            local okp, nodes = pcall(mparse, at.s, true)
            at.nodes = (okp and nodes) or false
          end
          if at.nodes then
            local ok2, mw, ma, mb = pcall(mrender, gc, at.nodes, size, 0, 0, false)
            if ok2 then aw, aa, ab = mw, ma, mb else at.nodes = false end
          end
        end
        if not aw then
          setF(gc, size)
          aw = gc:getStringWidth(at.s)
          local hh = gc:getStringHeight("Ag") / 2
          aa, ab = hh, hh
        end
        local sp = (i2 > i1) and 4 or 0
        if i2 > i1 and w + sp + aw > maxw then break end
        meta[#meta + 1] = { at = at, w = aw, sp = sp }
        w = w + sp + aw
        if aa > a_ then a_ = aa end
        if ab > b_ then b_ = ab end
        i2 = i2 + 1
      end
      local ymid = y + total + a_
      local x = x0
      for _, mm in ipairs(meta) do
        x = x + mm.sp
        if mm.at.m and mm.at.nodes then
          mrender(gc, mm.at.nodes, size, x, ymid, true)
        else
          setF(gc, size)
          gc:drawString(mm.at.s, x, ymid - gc:getStringHeight("Ag") / 2, "top")
        end
        x = x + mm.w
      end
      total = total + a_ + b_ + 2
      i1 = i2
    end
    return total
  end

  local function visSlots()
    local qt = TYPES[curT]
    if not qt.vis then return qt.slots end
    local map = {}
    for _, sl in ipairs(qt.slots) do map[sl.key] = sl end
    local base = {}
    for _, key in ipairs(qt.vis(map)) do table.insert(base, map[key]) end
    return base
  end

  local function buildResult()
    local out = solveFromSlots(TYPES[curT])
    curTbl = out.tbl
    if curTbl and #curTbl.rows == 0 then curTbl = nil end
    tRow, tCol, scrollT = 1, 1, 0
    rlines, rSelList, rSelIdx = {}, {}, 1
    lastVals = out.vals or {}
    local headDone = false
    for _, r in ipairs(out.rows) do
      if r.kind == "tblrow" then
        if not headDone then
          table.insert(rlines, { kind = "gridhead" })
          headDone = true
        end
        table.insert(rlines, { kind = "grid", idx = r.text })
      else
        local maxc = (r.kind == "frm") and 44 or 46
        local first = true
        for _, ln in ipairs(wrap(r.text, maxc)) do
          local e = { kind = r.kind, text = ln }
          if r.kind == "val" and first then
            e.meta = r
            table.insert(rSelList, #rlines + 1)
          end
          table.insert(rlines, e)
          first = false
        end
      end
    end
    if curTbl then
      table.insert(rlines, 1, { kind = "note", text = "press T for the table + how each cell was solved" })
    end
    if #rlines == 0 then
      table.insert(rlines, { kind = "note", text = "Nothing to solve yet - fill some slots." })
    end
    -- the formula block goes LAST so the answers come first
    table.insert(rlines, { kind = "head", text = "FORMULA + MEANINGS" })
    for _, f in ipairs(TYPES[curT].formula or {}) do
      table.insert(rlines, { kind = "dmath", text = f })
    end
    for _, wl in ipairs(wrap("in words: " .. (TYPES[curT].words or ""), 46)) do
      table.insert(rlines, { kind = "note", text = wl })
    end
    for _, lt in ipairs(TYPES[curT].acronyms or {}) do
      for _, wl in ipairs(wrap(lt, 44)) do
        table.insert(rlines, { kind = "frm", text = wl })
      end
    end
    for _, lt in ipairs(TYPES[curT].letters or {}) do
      for _, wl in ipairs(wrap(lt, 44)) do
        table.insert(rlines, { kind = "frm", text = wl })
      end
    end
    if #rSelList > 0 then
      table.insert(rlines, 1, { kind = "note", text = "I explains the highlighted line (click to pick another)" })
      for j = 1, #rSelList do rSelList[j] = rSelList[j] + 1 end
    end
  end

  local function buildDoc(src)
    local acc = {}
    for line in (src .. "\n"):gmatch("(.-)\n") do
      if line:sub(1, 2) == "$$" then
        table.insert(acc, { kind = "dmath", text = line:sub(3) })
      elseif line:sub(1, 3) == "## " then
        table.insert(acc, { kind = "head", text = line:sub(4) })
      elseif line == "" then
        table.insert(acc, "")
      elseif line:find("%$") then
        table.insert(acc, { kind = "rich", atoms = richAtoms(richSegs(line)) })
      else
        for _, ln in ipairs(wrap(line, 46)) do table.insert(acc, ln) end
      end
    end
    return acc
  end

  local function bar(gc, title, hint)
    gc:setColorRGB(COL.bar[1], COL.bar[2], COL.bar[3])
    gc:fillRect(0, 0, SW, 20)
    gc:setColorRGB(COL.barTx[1], COL.barTx[2], COL.barTx[3])
    gc:setFont("sansserif", "b", 10)
    gc:drawString(title, 4, 3, "top")
    gc:setColorRGB(COL.dim[1], COL.dim[2], COL.dim[3])
    gc:setFont("sansserif", "r", 9)
    gc:drawString(hint, 4, SH - 13, "top")
  end

  local function paintMenu(gc)
    bar(gc, "BFC2140 SOLVER " .. VERSION .. " - pick a question type",
        "number | arrows + ENTER | H help | G glossary")
    gc:setFont("sansserif", "r", 10)
    local y = 24
    for i, qt in ipairs(TYPES) do
      if i == menuSel then
        gc:setColorRGB(COL.selBg[1], COL.selBg[2], COL.selBg[3])
        gc:fillRect(2, y - 1, SW - 4, 15)
      end
      gc:setColorRGB(COL.text[1], COL.text[2], COL.text[3])
      local numkey = (i < 10) and tostring(i) or "0"
      gc:drawString(numkey .. "  " .. qt.name, 8, y, "top")
      y = y + 15
    end
    -- plain-English line for the highlighted item
    gc:setColorRGB(COL.note[1], COL.note[2], COL.note[3])
    gc:setFont("sansserif", "r", 9)
    local d = TYPES[menuSel].desc or ""
    local lines = wrap(d, 66)
    gc:drawString(lines[1] or "", 6, y + 1, "top")
    if lines[2] then gc:drawString(lines[2], 6, y + 12, "top") end
  end

  local function paintInput(gc)
    local qt = TYPES[curT]
    bar(gc, qt.name, "ENTER solve | D clear all | W worked | N notes | ESC")
    -- formula strip: the type's headline formulas, typeset
    local y = 23
    gc:setColorRGB(COL.head[1], COL.head[2], COL.head[3])
    for _, f in ipairs(qt.formula or {}) do
      y = y + drawMathLine(gc, f, 6, y, 10, SW - 10)
    end
    gc:setColorRGB(COL.dim[1], COL.dim[2], COL.dim[3])
    gc:setFont("sansserif", "r", 9)
    for _, wl in ipairs(wrap(qt.words or "", 62)) do
      gc:drawString(wl, 6, y, "top")
      y = y + 11
    end
    gc:drawLine(2, y + 1, SW - 2, y + 1)
    y = y + 4
    inputTop = y
    local list = visSlots()
    if sel > #list then sel = #list end
    local rowH = 16
    local visN = math.max(1, math.floor((SH - inputTop - 14) / rowH))
    if sel - 1 < scrollI then scrollI = sel - 1 end
    if sel > scrollI + visN then scrollI = sel - visN end
    for i = scrollI + 1, math.min(#list, scrollI + visN) do
      local sl = list[i]
      if i == sel then
        gc:setColorRGB(COL.selBg[1], COL.selBg[2], COL.selBg[3])
        gc:fillRect(2, y - 1, SW - 4, rowH)
      end
      gc:setFont("sansserif", "r", 10)
      gc:setColorRGB(COL.text[1], COL.text[2], COL.text[3])
      gc:drawString(sl.label, 8, y, "top")
      if sl.kind == "choice" then
        gc:setColorRGB(COL.val[1], COL.val[2], COL.val[3])
        gc:drawString("< " .. sl.opts[sl.idx] .. " >", 188, y, "top")
      else
        local shown = sl.buf
        if shown == "" then
          gc:setColorRGB(COL.dim[1], COL.dim[2], COL.dim[3])
          shown = (i == sel) and "_" or "-"
        else
          gc:setColorRGB(COL.val[1], COL.val[2], COL.val[3])
          if i == sel then shown = shown .. "_" end
        end
        gc:drawString(shown, 188, y, "top")
      end
      y = y + rowH
    end
    if scrollI + visN < #list then
      gc:setColorRGB(COL.dim[1], COL.dim[2], COL.dim[3])
      gc:setFont("sansserif", "r", 9)
      gc:drawString("v more", SW - 45, SH - 13, "top")
    end
  end

  -- table geometry: label column + value columns spread over the width
  local function colX(ci)
    local nc = curTbl and #curTbl.cols or 1
    local cw = math.floor((SW - 46) / nc)
    return 46 + (ci - 1) * cw, cw
  end

  local function cellStr(v, u)
    if v == nil then return "-" end
    if u == "$" then
      local s = money(v)
      if math.abs(v) >= 1e7 then s = sig(v, 6) end
      return (v < 0 and "-" or "") .. s
    elseif u == "%" then return pct(v) end
    return sig(v, 5)
  end

  local function paintList(gc, lines, scroll, title, hint)
    bar(gc, title, hint)
    local y = 24
    local i = scroll + 1
    while i <= #lines and y < SH - 16 do
      local ln = lines[i]
      local kind = type(ln) == "table" and ln.kind or "text"
      local text = type(ln) == "table" and ln.text or ln
      if kind == "head" then
        gc:setFont("sansserif", "b", 10)
        y = y + 3
        if ln.ent and scr == "glossary" then
          if ln.ent == gSel then
            gc:setColorRGB(COL.selBg[1], COL.selBg[2], COL.selBg[3])
            gc:fillRect(2, y - 2, SW - 4, 16)
          end
          table.insert(gHits, { y0 = y - 3, y1 = y + 14, ent = ln.ent })
          local e = gEntries[ln.ent]
          if e and e.typ then
            gc:setColorRGB(COL.dim[1], COL.dim[2], COL.dim[3])
            gc:setFont("sansserif", "r", 9)
            gc:drawString("type " .. ((e.typ == 10) and "0" or tostring(e.typ)) .. " >", SW - 48, y + 1, "top")
            gc:setFont("sansserif", "b", 10)
          end
        end
        gc:setColorRGB(COL.head[1], COL.head[2], COL.head[3])
        gc:drawString(text, 4, y, "top")
        y = y + 16
      elseif kind == "gridhead" then
        gc:setFont("sansserif", "r", 9)
        gc:setColorRGB(COL.dim[1], COL.dim[2], COL.dim[3])
        if curTbl then
          for ci, c in ipairs(curTbl.cols) do
            local x = colX(ci)
            gc:drawString(c.k .. ((c.u ~= "") and (" " .. c.u) or ""), x, y, "top")
          end
        end
        y = y + 13
      elseif kind == "grid" then
        local rw = curTbl and curTbl.rows[ln.idx]
        if rw then
          gc:setFont("sansserif", "r", 9)
          gc:setColorRGB(COL.text[1], COL.text[2], COL.text[3])
          gc:drawString(rw.label, 6, y, "top")
          gc:setColorRGB(COL.val[1], COL.val[2], COL.val[3])
          for ci, c in ipairs(curTbl.cols) do
            local x = colX(ci)
            gc:drawString(cellStr(rw.vals[ci], c.u), x, y, "top")
          end
          if scr == "result" then
            table.insert(gridHits, { y0 = y - 1, y1 = y + 13, idx = ln.idx })
          end
        end
        y = y + 14
      elseif kind == "dmath" then
        gc:setColorRGB(COL.head[1], COL.head[2], COL.head[3])
        y = y + drawMathLine(gc, text, 14, y + 1, 11, SW - 24) + 2
      elseif kind == "rich" then
        gc:setColorRGB(COL.text[1], COL.text[2], COL.text[3])
        y = y + drawRichLine(gc, ln.atoms, 6, y, 10, SW - 12)
      elseif kind == "frm" then
        gc:setFont("sansserif", "r", 9)
        gc:setColorRGB(COL.frm[1], COL.frm[2], COL.frm[3])
        gc:drawString(text, 18, y, "top")
        y = y + 13
      elseif kind == "xl" then
        gc:setFont("sansserif", "r", 9)
        gc:setColorRGB(COL.xl[1], COL.xl[2], COL.xl[3])
        gc:drawString(text, 8, y, "top")
        y = y + 13
      else
        gc:setFont("sansserif", "r", 10)
        if kind == "val" and scr == "result" and ln.meta then
          if rSelList[rSelIdx] == i then
            gc:setColorRGB(COL.selBg[1], COL.selBg[2], COL.selBg[3])
            gc:fillRect(2, y - 1, SW - 4, 15)
          end
          table.insert(rHits, { y0 = y - 1, y1 = y + 13, li = i })
        end
        local c = COL[kind] or COL.text
        gc:setColorRGB(c[1], c[2], c[3])
        gc:drawString(text, 4, y, "top")
        y = y + 15
      end
      i = i + 1
    end
    if scr == "result" then rVis = math.max(1, i - 1 - scroll) end
    if i <= #lines then
      gc:setColorRGB(COL.dim[1], COL.dim[2], COL.dim[3])
      gc:setFont("sansserif", "r", 9)
      gc:drawString("v more", SW - 45, SH - 13, "top")
    end
  end

  local TROWH = 15
  local function tVisRows() return math.max(1, math.floor((SH - 38 - 66) / TROWH)) end

  local function clampT()
    if not curTbl then return end
    local nr, nc = #curTbl.rows, #curTbl.cols
    if tRow < 1 then tRow = 1 elseif tRow > nr then tRow = nr end
    if tCol < 1 then tCol = 1 elseif tCol > nc then tCol = nc end
    local vis = tVisRows()
    if tRow - 1 < scrollT then scrollT = tRow - 1 end
    if tRow > scrollT + vis then scrollT = tRow - vis end
  end

  local function paintTable(gc)
    bar(gc, TYPES[curT].name .. " - TABLE", "arrows or click a cell | ESC back")
    if not curTbl then return end
    gc:setFont("sansserif", "r", 9)
    gc:setColorRGB(COL.dim[1], COL.dim[2], COL.dim[3])
    for ci, c in ipairs(curTbl.cols) do
      local x = colX(ci)
      gc:drawString(c.k .. ((c.u ~= "") and (" " .. c.u) or ""), x, 24, "top")
    end
    local y = 38
    local vis = tVisRows()
    for ri = scrollT + 1, math.min(#curTbl.rows, scrollT + vis) do
      local rw = curTbl.rows[ri]
      if ri == tRow then
        local x, cw = colX(tCol)
        gc:setColorRGB(COL.selBg[1], COL.selBg[2], COL.selBg[3])
        gc:fillRect(x - 3, y - 1, cw, TROWH)
      end
      gc:setFont("sansserif", "r", 9)
      gc:setColorRGB(COL.text[1], COL.text[2], COL.text[3])
      gc:drawString(rw.label, 2, y, "top")
      gc:setColorRGB(COL.val[1], COL.val[2], COL.val[3])
      for ci, c in ipairs(curTbl.cols) do
        local x = colX(ci)
        gc:drawString(cellStr(rw.vals[ci], c.u), x, y, "top")
      end
      y = y + TROWH
    end
    if scrollT + vis < #curTbl.rows then
      gc:setColorRGB(COL.dim[1], COL.dim[2], COL.dim[3])
      gc:drawString("v", SW - 10, y - 4, "top")
    end
    y = 38 + vis * TROWH + 2
    gc:setColorRGB(COL.dim[1], COL.dim[2], COL.dim[3])
    gc:drawLine(2, y, SW - 2, y)
    y = y + 3
    local rw = curTbl.rows[tRow]
    if rw then
      local c = curTbl.cols[tCol]
      local val = rw.vals[tCol]
      gc:setFont("sansserif", "b", 10)
      gc:setColorRGB(COL.head[1], COL.head[2], COL.head[3])
      gc:drawString(rw.label .. "  " .. c.k .. " = " .. (val and fmtU(val, c.u) or "-"), 6, y, "top")
      y = y + 16
      gc:setColorRGB(COL.text[1], COL.text[2], COL.text[3])
      local how = rw.how[tCol] or ""
      if how:find("=") or how:find("%^") then
        y = y + drawMathLine(gc, how, 6, y, 10, SW - 12)
      else
        gc:setFont("sansserif", "r", 9)
        for _, ln2 in ipairs(wrap(how, 50)) do
          gc:drawString(ln2, 6, y, "top")
          y = y + 12
          if y > SH - 13 then break end
        end
      end
    end
  end

  function on.paint(gc)
    gridHits = {}
    gHits = {}
    rHits = {}
    if scr == "result" and #rSelList > 0 then
      local cur = rSelList[rSelIdx]
      local visible = cur and cur >= scrollR + 1 and cur <= scrollR + rVis
      if not (rPickManual and visible) then
        rSelIdx = #rSelList
        for j, li in ipairs(rSelList) do
          if li >= scrollR + 1 then rSelIdx = j; break end
        end
        rPickManual = false
      end
    end
    gc:setColorRGB(COL.bg[1], COL.bg[2], COL.bg[3])
    gc:fillRect(0, 0, SW, SH)
    if scr == "menu" then paintMenu(gc)
    elseif scr == "input" then paintInput(gc)
    elseif scr == "result" then
      paintList(gc, rlines, scrollR, TYPES[curT].name .. " - SOLVED",
                "scroll | I explain | T table | N notes | ESC")
    elseif scr == "inspect" then
      paintList(gc, ilines, scrollI2, "EXPLAIN", "arrows scroll | G glossary | N notes | ESC back")
    elseif scr == "table" then paintTable(gc)
    elseif scr == "notes" then
      paintList(gc, nlines, scrollN, TYPES[curT].name .. " - NOTES",
                "arrows scroll | W worked | A steps | ESC")
    elseif scr == "assume" then
      paintList(gc, alines, scrollA, TYPES[curT].name .. " - STEPS + TRAPS",
                "arrows scroll | W worked | N notes | ESC")
    elseif scr == "worked" then
      paintList(gc, wlines, scrollW, TYPES[curT].name .. " - WORKED",
                "up/down scroll, left/right page | N notes | ESC")
    elseif scr == "glossary" then
      paintList(gc, glines, scrollG, "GLOSSARY - pick a word, ENTER opens its solver",
                "letter = jump | up/down pick | ENTER or click | ESC")
    elseif scr == "help" then
      paintList(gc, hlines, scrollH, "HELP", "arrows scroll | ESC back")
    end
  end

  local function openType(i)
    curT = i
    sel = 1
    scrollI = 0
    scr = "input"
    inval()
  end

  local function toNotes()
    if not curT then curT = menuSel end
    if scr ~= "notes" and scr ~= "assume" and scr ~= "help" and scr ~= "worked" then prevScr = scr end
    nlines = buildDoc(TYPES[curT].notes or "")
    scrollN = 0
    scr = "notes"
    inval()
  end

  local function toAssume()
    if not curT then curT = menuSel end
    if scr ~= "notes" and scr ~= "assume" and scr ~= "help" and scr ~= "worked" then prevScr = scr end
    alines = buildDoc(TYPES[curT].assume or "")
    scrollA = 0
    scr = "assume"
    inval()
  end

  local OVERLAY = { notes = true, assume = true, help = true, worked = true, glossary = true, inspect = true }

  local STOP = { the = 1, of = 1, at = 1, to = 1, ["in"] = 1, per = 1, one = 1, ["and"] = 1, ["or"] = 1,
                 before = 1, after = 1, ["for"] = 1, with = 1, from = 1, today = 1, given = 1, ["if"] = 1,
                 a = 1, an = 1, is = 1, on = 1, t = 1, x = 1, vs = 1 }
  local function tokens(str)
    local t = {}
    for w in str:lower():gmatch("[%a][%w]*") do
      if not STOP[w] then t[w] = true end
    end
    return t
  end

  -- keep the picked result line on screen
  local function showSel()
    local li = rSelList[rSelIdx]
    if not li then return end
    if li - 1 < scrollR then scrollR = li - 1 end
    if li > scrollR + rVis then scrollR = li - rVis end
  end

  local buildGlossary   -- defined below; declared here so buildInspect can use it (v21 crashed on I before G)
  local function buildInspect()
    ilines = {}
    local li = rSelList[rSelIdx]
    local ln = li and rlines[li]
    if not ln or not ln.meta then
      ilines = { { kind = "note", text = "pick a blue value line first (up/down), then press I" } }
      return
    end
    local m = ln.meta
    table.insert(ilines, { kind = "head", text = m.label })
    table.insert(ilines, { kind = "val", text = "= " .. fmtU(lastVals[m.key], m.unit) })
    if m.formula and m.formula ~= "" then
      table.insert(ilines, { kind = "note", text = "how it was worked out:" })
      for _, wl in ipairs(wrap(m.formula, 46)) do table.insert(ilines, { kind = "frm", text = wl }) end
    end
    -- which letters in the label does the legend explain?
    local tk = tokens(m.label)
    local got = false
    local legend = {}
    for _, lt in ipairs(TYPES[curT].acronyms or {}) do table.insert(legend, lt) end
    for _, lt in ipairs(TYPES[curT].letters or {}) do table.insert(legend, lt) end
    for _, lt in ipairs(legend) do
      local hit = false
      for sym in lt:gmatch("([%w_]+) =") do
        if tk[sym:lower()] then hit = true end
      end
      if hit then
        if not got then table.insert(ilines, { kind = "head", text = "LETTERS + ACRONYMS" }); got = true end
        for _, wl in ipairs(wrap(lt, 46)) do table.insert(ilines, { kind = "text", text = wl }) end
      end
    end
    -- glossary entries sharing words with the label
    if #gEntries == 0 then buildGlossary() end
    local scored = {}
    for gi, e in ipairs(gEntries) do
      local ht = tokens(e.head)
      local sc = 0
      for w in pairs(ht) do if tk[w] and #w >= 2 then sc = sc + #w end end
      if sc > 0 then table.insert(scored, { sc = sc, gi = gi }) end
    end
    table.sort(scored, function(a, b) return a.sc > b.sc end)
    if #scored > 0 then table.insert(ilines, { kind = "head", text = "MEANING" }) end
    for j = 1, math.min(2, #scored) do
      local e = gEntries[scored[j].gi]
      table.insert(ilines, { kind = "note", text = e.head })
      local k2 = e.line + 1
      while glines[k2] and not (type(glines[k2]) == "table" and glines[k2].kind == "head") do
        local g2 = glines[k2]
        local txt = type(g2) == "table" and g2.text or g2
        if txt and txt ~= "" and not txt:find("^%-> TYPE") then table.insert(ilines, { kind = "text", text = txt }) end
        k2 = k2 + 1
      end
    end
    if #ilines <= 2 then table.insert(ilines, { kind = "note", text = "no extra meaning found - N has the full legend" }) end
  end

  local function toInspect()
    if not OVERLAY[scr] then prevScr = scr end
    buildInspect()
    scrollI2 = 0
    scr = "inspect"
    inval()
  end

  -- glossary: a list of entries; each knows which solver type it opens

  function buildGlossary()
    glines, gEntries = {}, {}
    for block in (GLOSSARY .. "\n## "):gmatch("## (.-)\n## ") do
      local head, txt = block:match("^(.-)\n(.*)$")
      if head then
        local ent = { head = head, typ = tonumber(txt:match("TYPE (%d+)")), line = #glines + 1 }
        table.insert(gEntries, ent)
        table.insert(glines, { kind = "head", text = head, ent = #gEntries })
        for _, ln in ipairs(buildDoc(txt)) do table.insert(glines, ln) end
      end
    end
  end

  local function glossaryShow()
    local e = gEntries[gSel]
    if e then scrollG = math.min(e.line - 1, math.max(0, #glines - 5)) end
  end

  local function toGlossary()
    if not OVERLAY[scr] then prevScr = scr end
    if #glines == 0 then buildGlossary() end
    glossaryShow()
    scr = "glossary"
    inval()
  end

  -- jump to the first glossary entry starting with a letter
  local function glossaryJump(letter)
    for i2, e in ipairs(gEntries) do
      if e.head:sub(1, 1):lower() == letter then
        gSel = i2
        glossaryShow()
        return
      end
    end
  end

  local function glossaryOpen()
    local e = gEntries[gSel]
    if e and e.typ and TYPES[e.typ] then
      menuSel = e.typ
      openType(e.typ)
    end
  end

  local function toWorked()
    if not curT then curT = menuSel end
    if not OVERLAY[scr] then prevScr = scr end
    wlines = buildDoc(TYPES[curT].worked or "")
    scrollW = 0
    scr = "worked"
    inval()
  end

  local function toHelp()
    if not OVERLAY[scr] then prevScr = scr end
    hlines = buildDoc(HELP)
    scrollH = 0
    scr = "help"
    inval()
  end

  local function scrollList(key, cur, n)
    local maxs = math.max(0, n - 5)
    if key == "up" then return math.max(0, cur - 1)
    elseif key == "down" then return math.min(maxs, cur + 1)
    elseif key == "left" then return math.max(0, cur - 10)
    elseif key == "right" then return math.min(maxs, cur + 10) end
    return cur
  end

  function on.arrowKey(key)
    if scr == "menu" then
      if key == "up" then menuSel = (menuSel - 2) % #TYPES + 1
      elseif key == "down" then menuSel = menuSel % #TYPES + 1 end
    elseif scr == "input" then
      local list = visSlots()
      if key == "up" then sel = (sel - 2) % #list + 1
      elseif key == "down" then sel = sel % #list + 1
      elseif key == "left" or key == "right" then
        local sl = list[sel]
        if sl and sl.kind == "choice" then
          local n = #sl.opts
          sl.idx = (key == "right") and (sl.idx % n + 1) or ((sl.idx - 2) % n + 1)
        end
      end
    elseif scr == "result" then
      scrollR = scrollList(key, scrollR, #rlines)
      rPickManual = false
    elseif scr == "inspect" then scrollI2 = scrollList(key, scrollI2, #ilines)
    elseif scr == "table" then
      if curTbl then
        local nr, nc = #curTbl.rows, #curTbl.cols
        if key == "up" then tRow = (tRow - 2) % nr + 1
        elseif key == "down" then tRow = tRow % nr + 1
        elseif key == "right" then tCol = tCol % nc + 1
        elseif key == "left" then tCol = (tCol - 2) % nc + 1 end
        clampT()
      end
    elseif scr == "notes" then scrollN = scrollList(key, scrollN, #nlines)
    elseif scr == "assume" then scrollA = scrollList(key, scrollA, #alines)
    elseif scr == "worked" then scrollW = scrollList(key, scrollW, #wlines)
    elseif scr == "glossary" then
      local step = (key == "left" or key == "right") and 5 or 1
      if key == "up" or key == "left" then gSel = math.max(1, gSel - step)
      else gSel = math.min(#gEntries, gSel + step) end
      glossaryShow()
    elseif scr == "help" then scrollH = scrollList(key, scrollH, #hlines)
    end
    inval()
  end

  function on.enterKey()
    if scr == "menu" then openType(menuSel)
    elseif scr == "input" then
      buildResult()
      scrollR = 0
      scr = "result"
      inval()
    elseif scr == "result" then
      scr = "input"; inval()
    elseif scr == "table" then
      scr = "result"; inval()
    elseif scr == "glossary" then
      glossaryOpen()
    end
  end
  function on.returnKey() on.enterKey() end

  function on.escapeKey()
    if scr == "input" then scr = "menu"
    elseif scr == "result" then scr = "input"
    elseif scr == "table" then scr = "result"
    elseif OVERLAY[scr] then scr = prevScr end
    inval()
  end

  function on.tabKey()
    if scr == "input" then
      local list = visSlots()
      sel = sel % #list + 1
      inval()
    end
  end

  function on.backtabKey()
    if scr == "input" then
      local list = visSlots()
      sel = (sel - 2) % #list + 1
      inval()
    end
  end

  function on.backspaceKey()
    if scr == "input" then
      local sl = visSlots()[sel]
      if sl and sl.kind ~= "choice" and #sl.buf > 0 then
        sl.buf = sl.buf:sub(1, -2)
        inval()
      end
    end
  end

  function on.deleteKey()
    if scr == "input" then
      local sl = visSlots()[sel]
      if sl and sl.kind ~= "choice" then sl.buf = ""; inval() end
    end
  end

  function on.clearKey() on.deleteKey() end

  CORE.drawMathLine = drawMathLine
  CORE.drawRichLine = drawRichLine
  CORE.richAtoms = function(s) return richAtoms(richSegs(s)) end

  function on.mouseDown(mx, my)
    if scr == "glossary" then
      for _, h2 in ipairs(gHits) do
        if my >= h2.y0 and my <= h2.y1 then
          if h2.ent == gSel then glossaryOpen() else gSel = h2.ent; inval() end
          return
        end
      end
      return
    end
    if scr == "result" then
      for _, h2 in ipairs(rHits) do
        if my >= h2.y0 and my <= h2.y1 then
          for j, li in ipairs(rSelList) do
            if li == h2.li then
              if rSelIdx == j then toInspect() else rSelIdx = j; rPickManual = true; inval() end
              return
            end
          end
        end
      end
      for _, h2 in ipairs(gridHits) do
        if my >= h2.y0 and my <= h2.y1 and curTbl then
          tRow = h2.idx
          local c = 1
          for ci = #curTbl.cols, 1, -1 do
            if mx >= colX(ci) - 3 then c = ci; break end
          end
          tCol = c
          clampT()
          scr = "table"
          inval()
          return
        end
      end
    elseif scr == "table" then
      if curTbl then
        local ri = scrollT + math.floor((my - 38) / TROWH) + 1
        if ri >= 1 and ri <= #curTbl.rows and my >= 37 then
          tRow = ri
          local c = 1
          for ci = #curTbl.cols, 1, -1 do
            if mx >= colX(ci) - 3 then c = ci; break end
          end
          tCol = c
          clampT()
          inval()
        end
      end
    elseif scr == "menu" then
      if my >= 24 then
        local i2 = math.floor((my - 24) / 15) + 1
        if TYPES[i2] then menuSel = i2; openType(i2) end
      end
    elseif scr == "input" then
      if my >= inputTop then
        local list = visSlots()
        local i2 = scrollI + math.floor((my - inputTop) / 16) + 1
        if list[i2] then sel = i2; inval() end
      end
    end
  end

  function on.charIn(ch)
    if ch == "\226\136\146" then ch = "-" end  -- calculator (-) key
    local cl = ch:lower()
    if scr == "glossary" then
      if cl:find("^%a$") then glossaryJump(cl); inval() end
      return
    end
    if cl == "g" then toGlossary(); return end
    if cl == "i" and scr == "result" then toInspect(); return end
    if scr == "menu" then
      if cl == "n" then toNotes(); return end
      if cl == "a" then toAssume(); return end
      if cl == "w" then toWorked(); return end
      if cl == "h" then toHelp(); return end
      local d = tonumber(ch)
      if d then
        if d == 0 then d = 10 end
        if TYPES[d] then menuSel = d; openType(d) end
      end
      return
    end
    if cl == "n" and scr ~= "notes" then toNotes(); return end
    if cl == "a" and scr ~= "assume" then toAssume(); return end
    if cl == "w" and scr ~= "worked" then toWorked(); return end
    if cl == "h" and scr ~= "help" then toHelp(); return end
    if scr == "result" and cl == "t" and curTbl then
      tRow, tCol, scrollT = 1, 1, 0
      scr = "table"
      inval()
      return
    end
    if scr == "input" then
      if cl == "d" or cl == "c" then
        for _, sl2 in ipairs(TYPES[curT].slots) do
          sl2.buf = sl2.defBuf
          sl2.idx = sl2.defIdx
        end
        sel = 1
        scrollI = 0
        inval()
        return
      end
      local sl = visSlots()[sel]
      if not sl or sl.kind == "choice" then return end
      if ch:find("^[%d%.%-,]$") then
        if #sl.buf < 14 then sl.buf = sl.buf .. ch:gsub(",", ".") end
        inval()
      elseif (cl == "k" or cl == "m") and sl.kind == "money" then
        if #sl.buf > 0 and not sl.buf:lower():find("[km]") then sl.buf = sl.buf .. cl end
        inval()
      end
    end
  end

--@include ui_v22.lua

end -- if platform
