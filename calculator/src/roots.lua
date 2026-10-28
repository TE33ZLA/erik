----------------------------------------------------------------------
-- ROOT FORMULAS (v25): every formula-sheet line as a page of slots.
-- Fill the slots the question gives, leave ONE slot blank, ENTER
-- solves it: the formula, the rearranged form (when there is one),
-- your numbers in it, the answer and a check with every slot filled.
-- N = how to fill each slot (+ every rearranged form); W = an example.
-- Home key R. Included after fsheet.lua (it uses FSHEET).
----------------------------------------------------------------------
do
  -- numbers inside a written line: up to 8 significant digits, never 1e+06
  local function nf(x)
    if x ~= x then return "?" end
    local a = math.abs(x)
    if a == 0 then return "0" end
    local mag = math.floor(math.log(a) / math.log(10) + 1e-9)
    local dec = 7 - mag
    if dec < 0 then dec = 0 end
    if dec > 10 then dec = 10 end
    local s = string.format("%." .. dec .. "f", x)
    if s:find("%.") then s = s:gsub("0+$", ""):gsub("%.$", "") end
    if x < 0 then s = "(" .. s .. ")" end
    return s
  end
  local function exam(x, kind)
    if kind == "pct" then return string.format("%.2f%%", x * 100) end
    return string.format("%.2f", x)
  end
  local function unitOf(va) return (va.kind == "pct") and "%" or ((va.kind == "money") and "$" or "") end
  local function esc(t) return (t:gsub("[%^%$%(%)%%%.%[%]%*%+%-%?]", "%%%0")) end
  -- put the numbers into a written formula; the slot 'keep' stays as letters
  local function subst(str, def, x, keep)
    local toks = {}
    for _, va in ipairs(def.vars) do
      if va.k ~= keep and x[va.k] ~= nil then toks[#toks + 1] = va end
    end
    table.sort(toks, function(a, b) return #a.t > #b.t end)
    local marks = {}
    for i, va in ipairs(toks) do
      local pat = esc(va.t)
      if va.t:find("^[%w_]") then pat = "%f[%w_]" .. pat end
      if va.t:find("[%w_]$") then pat = pat .. "%f[^%w_]" end
      str = str:gsub(pat, "\1" .. i .. "\2")
      marks[i] = nf(x[va.k])
    end
    return (str:gsub("\1(%d+)\2", function(i) return marks[tonumber(i)] end))
  end

  -- find the value of slot va that makes the formula true (secant from a few starts, then a scan)
  local function findX(fx, x, va)
    local k = va.k
    local function g(t) x[k] = t; return fx() end
    local function inDom(t)
      if va.rate and t <= -1 then return false end
      if va.pos and t <= 0 then return false end
      return true
    end
    local starts
    if va.kind == "pct" then starts = { 0.05, 0.12, 0.3, -0.3, 0.9 }
    elseif va.kind == "num" then starts = { 1, 2, 10, 0.5, 50 }
    else starts = { 1, 100, 10000, -100, 1e6 } end
    for si = 1, #starts - 1 do
      local a, b = starts[si], starts[si + 1]
      local fa, fb = g(a), g(b)
      if fa and fb then
        local fscale = math.max(math.abs(fa), math.abs(fb), 1e-300)
        local it = 0
        while fb ~= fa and it < 100 do
          local c = b - fb * (b - a) / (fb - fa)
          if c ~= c or c == math.huge or c == -math.huge then break end
          local fc = g(c)
          if not fc then break end
          a, fa, b, fb = b, fb, c, fc
          it = it + 1
          if math.abs(fb) <= 1e-14 * fscale then break end
        end
        if math.abs(fb) <= 1e-10 * fscale and inDom(b) then g(b); return b end
      end
    end
    -- no luck: scan for a change of sign, then halve the gap
    local pts = {}
    if va.kind == "pct" then
      for j = (va.rate and -990 or -3000), 3000, 2 do pts[#pts + 1] = j / 1000 end
    else
      for e2 = -60, 90 do
        local p = 10 ^ (e2 / 10)
        if not va.pos then pts[#pts + 1] = -p end
        pts[#pts + 1] = p
      end
      table.sort(pts)
    end
    local prev, pv, brackets, big = nil, nil, {}, 0
    for _, t in ipairs(pts) do
      if inDom(t) then
        local ft = g(t)
        if ft then
          big = math.max(big, math.abs(ft))
          if pv and ((ft < 0) ~= (pv < 0)) then brackets[#brackets + 1] = { prev, t } end
          prev, pv = t, ft
        end
      end
    end
    -- try each change of sign (positive values first); a jump across a division by zero is not a zero
    table.sort(brackets, function(p1, p2)
      local a1, a2 = p1[1] >= 0, p2[1] >= 0
      if a1 ~= a2 then return a1 end
      return math.abs(p1[1]) < math.abs(p2[1])
    end)
    local best, nroots = nil, 0
    for _, br in ipairs(brackets) do
      local a, b = br[1], br[2]
      local fa = g(a)
      for _ = 1, 200 do
        local m2 = (a + b) / 2
        local fm = g(m2)
        if not fm or not fa then break end
        if (fm < 0) == (fa < 0) then a, fa = m2, fm else b = m2 end
      end
      local r = (a + b) / 2
      local fr = g(r)
      if fr and math.abs(fr) <= 1e-6 * math.max(big, 1e-300) then
        nroots = nroots + 1
        if not best then best = r end
      end
    end
    if not best then return nil end
    g(best)
    return best, nroots
  end

  local function rootSolve(def, V, out)
    local x, blanks, weak, der = {}, {}, {}, {}
    local grpFilled = {}
    for _, va in ipairs(def.vars) do if va.grp and V[va.k] ~= nil then grpFilled[va.grp] = true end end
    for _, va in ipairs(def.vars) do
      local val = V[va.k]
      if val ~= nil then x[va.k] = val
      elseif va.opt then -- a helper slot: not in the formula
      elseif va.list or (va.grp and not grpFilled[va.grp]) then -- left out
      elseif va.alt and va.alt.ok(V) then der[#der + 1] = va
      elseif va.weak then weak[#weak + 1] = va
      else blanks[#blanks + 1] = va end
    end
    if #blanks == 0 and #weak == 1 then blanks[1] = weak[1]; weak = {} end
    for _, va in ipairs(weak) do x[va.k] = 0 end
    if def.need then
      local msg = def.need(x)
      if msg then out:need(msg); return end
    end
    local function fx()
      for _, va in ipairs(der) do
        local ok, d = pcall(va.alt.fn, x)
        x[va.k] = ok and d or nil
      end
      local ok, r = pcall(def.f, x)
      if ok and type(r) == "number" and r == r and r < math.huge and r > -math.huge then return r end
      return nil
    end
    if #blanks > 1 then
      local names = {}
      for _, va in ipairs(blanks) do names[#names + 1] = va.t end
      out:need("only ONE blank slot - blank now: " .. table.concat(names, ", ") .. ". Leave blank only the one the question asks for.")
      return
    end
    local u, typed = blanks[1], nil
    if not u then
      -- every slot filled: check the formula by working out its first slot from the others
      for _, va in ipairs(def.vars) do
        if not va.opt and x[va.k] ~= nil then u = va; break end
      end
      typed = x[u.k]
      x[u.k] = nil
    end
    local ans, nroots = findX(fx, x, u)
    if not ans or fx() == nil then
      out:err("no value of " .. u.t .. " makes the formula work with these numbers - check the slots (signs, % vs decimals, per period)")
      return
    end
    x[u.k] = ans
    fx()
    local eq = def.eqf and def.eqf(x) or def.eq
    local re = def.rearr and def.rearr[u.k]
    if type(re) == "function" then re = re(x) end
    local numbers = subst(re or eq, def, x, u.k)
    if typed then
      out:head("CHECK: EVERY SLOT IS FILLED")
      local same = math.abs(ans - typed) <= 1e-6 * math.max(1, math.abs(ans))
      out:row(u.t .. " from the other slots", ans, unitOf(u), numbers, u.k)
      out:add(same and "ok" or "bad", same and ("your " .. u.t .. " fits: the formula holds")
              or ("you typed " .. nf(typed) .. ": the formula does NOT hold - leave the unknown blank"))
    else
      out:head("ANSWER")
      out:row(u.label, ans, unitOf(u), numbers, u.k)
    end
    for _, va in ipairs(der) do
      out:row(va.t .. " (from " .. va.alt.from .. ")", x[va.k], unitOf(va), subst(va.alt.text, def, x), va.k)
    end
    if nroots and nroots > 1 then out:note("more than one value works (" .. nroots .. "); this is the first one") end
    out:head("WRITE IN THE EXAM")
    out:xl(eq)
    if re then out:xl(re) end
    out:xl(numbers)
    out:xl(u.t .. " = " .. exam(ans, u.kind))
    if not re and not (u == def.vars[1]) then
      out:note("no tidy rearranged form: the solver tried values of " .. u.t .. " until both sides matched (by hand: two trial values and interpolation, R 1 5 and R 1 6)")
    end
    out:head("CHECK (all the numbers in)")
    out:xl(subst(eq, def, x))
    if def.extra then def.extra(x, out) end
    out:uses(def.id)
    if re then out:off(re, "the " .. def.short .. " line, solved for " .. u.t) end
  end

  ------------------------------------------------------------------ slot helpers
  local function slot(k, t, label, kind, hint, how, more)
    local va = { k = k, t = t or k, label = label, kind = kind, hint = hint, how = how }
    for kk, vv in pairs(more or {}) do va[kk] = vv end
    return va
  end
  local function cp(va, over)
    local c = {}
    for kk, vv in pairs(va) do c[kk] = vv end
    for kk, vv in pairs(over or {}) do c[kk] = vv end
    return c
  end
  -- the slots that come up again and again
  local FVn = slot("FVn", nil, "FVn money at the end ($)", "money", "money at the END: 'grows to', 'will have', 'worth in n years'",
                   "the money at the END of the n periods. Words: grows to, will have, worth in 10 years, target amount.")
  local PV = slot("PV", nil, "PV money today ($)", "money", "money TODAY: invest now, deposit now, borrow, value now",
                  "the money TODAY (time 0). Words: invest today, deposit now, borrow, what it is worth now.")
  local r = slot("r", nil, "r rate per period (%)", "pct", "rate PER PERIOD as a %: monthly = APR/12, half-year = APR/2",
                 "the rate for ONE period, typed as a % (7 means 7%). Yearly periods: the yearly rate. Monthly: APR/12 (from an EAR: (1 + EAR)^(1/12) - 1). Half-yearly: APR/2.",
                 { rate = true })
  local n = slot("n", nil, "n number of periods", "num", "how many PERIODS: years x periods a year (5 yrs monthly = 60)",
                 "the number of periods (or payments). 5 years paid monthly: 60. Must match r: monthly r with monthly n.", { pos = true })
  local C = slot("C", nil, "C cash flow each period ($)", "money", "the SAME amount every period: payment, saving, rent",
                 "the cash flow that repeats every period: a payment, a saving, a rent, an income.")
  local g = slot("g", nil, "g growth each period (%)", "pct", "growth of the cash flow each period; a fall: type -4",
                 "how fast the cash flow grows each period, as a %. Falling 4% a year: type -4 (the (-) key).")
  local Tc = slot("Tc", nil, "Tc company tax rate (%)", "pct", "the company tax rate, e.g. 30",
                  "the company (corporate) tax rate, e.g. 30. 'No taxes': 0.")
  local tc = cp(Tc, { k = "tc", t = "tc", label = "tc tax rate (%)" })

  local DEFS = {}
  local function def(d) DEFS[#DEFS + 1] = d; return d end

  ------------------------------------------------------------------ 1 lump sums, EAR, interpolation
  def{ id = "fv", grp = 1, name = "Future value (one amount)", short = "FVn", eq = "FVn = PV*(1 + r)^n",
    words = "money today grows by (1 + r) every period, n times",
    vars = { FVn, PV, r, n },
    f = function(x) return x.PV * (1 + x.r) ^ x.n - x.FVn end,
    rearr = { PV = "PV = FVn/(1 + r)^n", r = "r = (FVn/PV)^(1/n) - 1", n = "n = ln(FVn/PV)/ln(1 + r)" },
    ex = { PV = 4750, r = 0.07, n = 9 } }
  def{ id = "pv", grp = 1, name = "Present value (one amount)", short = "PV", eq = "PV = FVn/(1 + r)^n",
    words = "money later is worth less today: divide by (1 + r) every period",
    vars = { PV, FVn, r, n },
    f = function(x) return x.FVn / (1 + x.r) ^ x.n - x.PV end,
    rearr = { FVn = "FVn = PV*(1 + r)^n", r = "r = (FVn/PV)^(1/n) - 1", n = "n = ln(FVn/PV)/ln(1 + r)" },
    ex = { FVn = 20000, r = 0.06, n = 5 } }
  def{ id = "ear", grp = 1, name = "EAR from an APR", short = "EAR", eq = "EAR = (1 + APR/m)^m - 1",
    words = "the quoted APR compounded m times a year gives the true yearly rate",
    vars = {
      slot("EAR", nil, "EAR true yearly rate (%)", "pct", "the TRUE yearly rate, with compounding counted",
           "the effective annual rate: what you really earn or pay in a year once compounding is counted.", { rate = true }),
      slot("APR", nil, "APR quoted yearly rate (%)", "pct", "the QUOTED yearly rate: '12% p.a. compounded monthly' -> 12",
           "the quoted (nominal) yearly rate before compounding. '12% p.a. compounded monthly': APR = 12.", { rate = true }),
      slot("m", nil, "m times a year interest is added", "num", "monthly 12, quarterly 4, half-yearly 2, daily 365",
           "how many times a year interest is added: monthly 12, quarterly 4, semi-annual 2, weekly 52, daily 365.", { pos = true }) },
    f = function(x) return (1 + x.APR / x.m) ^ x.m - 1 - x.EAR end,
    rearr = { APR = "APR = m*((1 + EAR)^(1/m) - 1)" },
    ex = { APR = 0.12, m = 12 } }
  def{ id = "fisher", grp = 1, name = "Real vs nominal rate (Fisher)", short = "Fisher", eq = "1 + real = (1 + nominal)/(1 + inflation)",
    words = "the real rate is what is left of the nominal rate after inflation",
    vars = {
      slot("real", nil, "real rate (%)", "pct", "growth in buying power: the rate AFTER inflation",
           "the real rate: how much more you can BUY. Real cash flows (today's dollars) use it.", { rate = true }),
      slot("nominal", nil, "nominal rate (%)", "pct", "the normal quoted rate, in dollars",
           "the nominal rate: the normal rate quoted in dollars. Nominal cash flows use it.", { rate = true }),
      slot("inflation", nil, "inflation rate (%)", "pct", "how fast prices rise each year",
           "the inflation rate: how fast prices rise each year.", { rate = true }) },
    f = function(x) return (1 + x.nominal) / (1 + x.inflation) - 1 - x.real end,
    rearr = { real = "real = (1 + nominal)/(1 + inflation) - 1", nominal = "nominal = (1 + real)*(1 + inflation) - 1",
              inflation = "inflation = (1 + nominal)/(1 + real) - 1" },
    ex = { nominal = 0.08, inflation = 0.03 } }
  local A1 = slot("A1", nil, "A1 value at the 1st rate ($)", "money", "e.g. the NPV at the first trial rate r1 (pick r1 so A1 > 0)",
                  "the thing you want to be zero (e.g. the NPV, or price minus bond formula) at the FIRST trial rate r1. Pick r1 so A1 is positive.")
  local A2 = slot("A2", nil, "A2 value at the 2nd rate ($)", "money", "the same at the second trial rate r2 (pick r2 so A2 < 0)",
                  "the same thing at the SECOND trial rate r2. Pick r2 so A2 is negative: the answer lies between r1 and r2.")
  local lam = slot("lambda", nil, "lambda (0 to 1)", "num", "how far from r1 towards r2: A1/(A1 - A2)",
                   "lambda = A1/(A1 - A2): how far from r1 towards r2 the zero lies (between 0 and 1).")
  def{ id = "lam", grp = 1, name = "Interpolation: lambda", short = "lambda", eq = "lambda = A1/(A1 - A2)",
    words = "lambda says how far between the two trial rates the zero lies",
    vars = { lam, A1, A2 },
    f = function(x) return x.A1 / (x.A1 - x.A2) - x.lambda end,
    rearr = { A1 = "A1 = lambda*A2/(lambda - 1)", A2 = "A2 = A1*(lambda - 1)/lambda" },
    ex = { A1 = 120.5, A2 = -45.2 } }
  def{ id = "interp", grp = 1, name = "Interpolated rate", short = "interpolation", eq = "r = r1 + lambda*(r2 - r1)",
    words = "start at r1 and go lambda of the way to r2",
    vars = {
      slot("r", nil, "r interpolated rate (%)", "pct", "the answer: the rate where the value is about zero",
           "the interpolated rate: the estimate of the IRR or YTM."),
      slot("r1", nil, "r1 first trial rate (%)", "pct", "the first rate you tried (A1 > 0 there)", "the first trial rate (where A1 was worked out)."),
      slot("r2", nil, "r2 second trial rate (%)", "pct", "the second rate you tried (A2 < 0 there)", "the second trial rate (where A2 was worked out)."),
      lam },
    f = function(x) return x.r1 + x.lambda * (x.r2 - x.r1) - x.r end,
    rearr = { lambda = "lambda = (r - r1)/(r2 - r1)", r1 = "r1 = (r - lambda*r2)/(1 - lambda)", r2 = "r2 = r1 + (r - r1)/lambda" },
    ex = { r1 = 0.08, r2 = 0.10, lambda = 0.7272 } }

  ------------------------------------------------------------------ 2 annuities and perpetuities
  local Cp = cp(C, { label = "C payment each period ($)" })
  def{ id = "pva", grp = 2, name = "PV of an annuity", short = "PV of an annuity", eq = "PV = C/r*(1 - 1/(1 + r)^n)",
    words = "n equal payments at the END of each period, valued today",
    vars = { PV, Cp, r, n },
    f = function(x) return x.C / x.r * (1 - 1 / (1 + x.r) ^ x.n) - x.PV end,
    rearr = { C = "C = PV*r/(1 - 1/(1 + r)^n)", n = "n = -ln(1 - PV*r/C)/ln(1 + r)" },
    ex = { C = 500, r = 0.01, n = 60 } }
  def{ id = "pvad", grp = 2, name = "PV of an annuity due", short = "PV of an annuity due", eq = "PV = C/r*(1 - 1/(1 + r)^n)*(1 + r)",
    words = "n equal payments at the START of each period, valued today",
    vars = { PV, Cp, r, n },
    f = function(x) return x.C / x.r * (1 - 1 / (1 + x.r) ^ x.n) * (1 + x.r) - x.PV end,
    rearr = { C = "C = PV*r/((1 - 1/(1 + r)^n)*(1 + r))", n = "n = -ln(1 - PV*r/(C*(1 + r)))/ln(1 + r)" },
    ex = { C = 1200, r = 0.05, n = 10 } }
  local FV = cp(FVn, { k = "FV", t = "FV", label = "FV value at the end ($)" })
  def{ id = "fva", grp = 2, name = "FV of an annuity", short = "FV of an annuity", eq = "FV = C/r*((1 + r)^n - 1)",
    words = "n equal payments at the END of each period, valued at the end",
    vars = { FV, Cp, r, n },
    f = function(x) return x.C / x.r * ((1 + x.r) ^ x.n - 1) - x.FV end,
    rearr = { C = "C = FV*r/((1 + r)^n - 1)", n = "n = ln(1 + FV*r/C)/ln(1 + r)" },
    ex = { C = 300, r = 0.005, n = 120 } }
  def{ id = "fvad", grp = 2, name = "FV of an annuity due", short = "FV of an annuity due", eq = "FV = C/r*((1 + r)^n - 1)*(1 + r)",
    words = "n equal payments at the START of each period, valued at the end",
    vars = { FV, Cp, r, n },
    f = function(x) return x.C / x.r * ((1 + x.r) ^ x.n - 1) * (1 + x.r) - x.FV end,
    rearr = { C = "C = FV*r/(((1 + r)^n - 1)*(1 + r))", n = "n = ln(1 + FV*r/(C*(1 + r)))/ln(1 + r)" },
    ex = { C = 2000, r = 0.06, n = 15 } }
  def{ id = "perp", grp = 2, name = "PV of a perpetuity", short = "perpetuity", eq = "PV = C/r",
    words = "the same cash flow every period FOREVER, the first one in one period",
    vars = { PV, C, r },
    f = function(x) return x.C / x.r - x.PV end,
    rearr = { C = "C = PV*r", r = "r = C/PV" },
    ex = { C = 475, r = 0.0075 } }
  def{ id = "gperp", grp = 2, name = "PV of a growing perpetuity", short = "growing perpetuity", eq = "PV = C/(r - g)",
    words = "a cash flow growing at g FOREVER; C is the FIRST one (in one period)",
    vars = { PV, cp(C, { hint = "the FIRST cash flow (one period from now)", how = "the FIRST cash flow, one period from now. Given the one just paid? C = that x (1 + g)." }), r, g },
    f = function(x) return x.C / (x.r - x.g) - x.PV end,
    rearr = { C = "C = PV*(r - g)", r = "r = C/PV + g", g = "g = r - C/PV" },
    need = function(x) if x.r and x.g and x.r <= x.g then return "r must be bigger than g (or it never ends)" end end,
    ex = { C = 100, r = 0.057, g = 0.03 } }
  def{ id = "gann", grp = 2, name = "PV of a growing annuity", short = "growing annuity", eq = "PV = C/(r - g)*(1 - ((1 + g)/(1 + r))^n)",
    words = "n cash flows growing at g; C is the FIRST one (in one period)",
    vars = { PV, cp(C, { hint = "the FIRST cash flow (one period from now)" }), r, g, n },
    f = function(x) return x.C / (x.r - x.g) * (1 - ((1 + x.g) / (1 + x.r)) ^ x.n) - x.PV end,
    rearr = { C = "C = PV*(r - g)/(1 - ((1 + g)/(1 + r))^n)", n = "n = ln(1 - PV*(r - g)/C)/ln((1 + g)/(1 + r))" },
    ex = { C = 5000, r = 0.08, g = 0.03, n = 20 } }

  ------------------------------------------------------------------ 3 bonds and shares
  local PB = slot("PBond", nil, "PBond bond price ($)", "money", "the price today: '96% of face' -> 960 (face 1000)",
                  "the bond's price today. Given as a % of face? 96% of a 1000 face: 960.")
  local i = slot("i", nil, "i yield PER PERIOD (%)", "pct", "yield per coupon period: half-yearly = yearly yield/2",
                 "the yield (YTM) for ONE coupon period. Half-yearly coupons: the yearly yield/2. Solving for i? It is the half-year yield: x 2 (APR) or (1 + i)^2 - 1 (effective).",
                 { rate = true })
  local nb = slot("n", nil, "n coupon periods LEFT", "num", "periods LEFT: years left x coupons a year",
                  "the number of coupon periods LEFT: years to maturity x coupons a year. Issued 8 years ago, 30-year bond: 22 years left.", { pos = true })
  local Fb = slot("FVn", nil, "FVn face (par) value ($)", "money", "the face value repaid at the end, e.g. 1000",
                  "the face (par) value repaid at maturity, usually 1000 (or 100).")
  local mb = slot("m", nil, "coupons a year (optional)", "num", "optional: 2 for half-yearly -> shows the yearly yield",
                  "optional: coupons a year. With it, the answer also shows the yearly yield (APR = i x m; effective = (1 + i)^m - 1).",
                  { opt = true, pos = true })
  local function yearly(x, out)
    if x.m and x.i then
      out:head("YEARLY YIELD (m = " .. nf(x.m) .. ")")
      out:row("APR: i x m", x.i * x.m, "%", nf(x.i) .. " x " .. nf(x.m), "apr")
      out:row("effective: (1 + i)^m - 1", (1 + x.i) ^ x.m - 1, "%", "(1 + " .. nf(x.i) .. ")^" .. nf(x.m) .. " - 1 (the lectures' cost of debt)", "effy")
    end
  end
  def{ id = "bond", grp = 3, name = "Bond price (coupons)", short = "PBond", eq = "PBond = C/i*(1 - 1/(1 + i)^n) + FVn/(1 + i)^n",
    words = "a bond is an annuity of coupons plus the face value at the end",
    vars = { PB, cp(C, { label = "C coupon EACH period ($)", hint = "coupon rate x face / coupons a year: 8% half-yearly on 1000 -> 40",
                         how = "the coupon paid EACH period: coupon rate x face / coupons a year. 8% paid half-yearly on 1000: 40." }), i, nb, Fb, mb },
    f = function(x)   -- i = 0: no discounting, the coupons and the face simply add up
      local ann = (x.i == 0) and x.n or (1 - 1 / (1 + x.i) ^ x.n) / x.i
      return x.C * ann + x.FVn / (1 + x.i) ^ x.n - x.PBond
    end,
    rearr = { C = "C = (PBond - FVn/(1 + i)^n)*i/(1 - 1/(1 + i)^n)", FVn = "FVn = (PBond - C/i*(1 - 1/(1 + i)^n))*(1 + i)^n" },
    extra = yearly,
    ex = { C = 40, i = 0.035, n = 20, FVn = 1000, m = 2 } }
  def{ id = "zbond", grp = 3, name = "Zero-coupon bond price", short = "PBond", eq = "PBond = FVn/(1 + i)^n",
    words = "no coupons: just the face value at the end, discounted",
    vars = { PB, i, nb, Fb, mb },
    f = function(x) return x.FVn / (1 + x.i) ^ x.n - x.PBond end,
    rearr = { FVn = "FVn = PBond*(1 + i)^n", i = "i = (FVn/PBond)^(1/n) - 1", n = "n = ln(FVn/PBond)/ln(1 + i)" },
    extra = yearly,
    ex = { FVn = 1000, i = 0.05, n = 10 } }
  local P0 = slot("P0", nil, "P0 share price today ($)", "money", "the share price (value) today", "the share price today (time 0).")
  local D1 = slot("D1", nil, "D1 NEXT year's dividend ($)", "money", "the NEXT dividend, in one year (just paid? use D0)",
                  "the dividend in ONE year. If the question gives the one JUST paid (D0), type that in D0 instead: D1 = D0 x (1 + g).")
  local rE = slot("rE", nil, "rE required return (%)", "pct", "the return shareholders require (cost of equity)",
                  "the return shareholders require: the cost of equity (from CAPM, or the question).", { rate = true })
  def{ id = "p0z", grp = 3, name = "Share price, no growth", short = "P0 = D1/rE", eq = "P0 = D1/rE",
    words = "the same dividend forever: a perpetuity",
    vars = { P0, D1, rE },
    f = function(x) return x.D1 / x.rE - x.P0 end,
    rearr = { D1 = "D1 = P0*rE", rE = "rE = D1/P0" },
    ex = { D1 = 2.4, rE = 0.12 } }
  def{ id = "p0g", grp = 3, name = "Share price, constant growth", short = "constant growth", eq = "P0 = D1/(rE - g)",
    words = "a dividend growing at g forever (the dividend growth model)",
    vars = { P0, cp(D1, { alt = { ok = function(V) return V.D0 ~= nil end, fn = function(x) return x.D0 * (1 + x.g) end,
                                   text = "D1 = D0*(1 + g)", from = "D0" } }),
             rE, cp(g, { label = "g dividend growth (%)", hint = "growth of the dividend each year, forever" }),
             slot("D0", nil, "or: D0 dividend JUST paid ($)", "money", "just paid: then D1 = D0 x (1 + g) is worked out",
                  "the dividend just paid (time 0). Leave D1 blank and type this: D1 = D0 x (1 + g).", { opt = true }) },
    f = function(x) return x.D1 / (x.rE - x.g) - x.P0 end,
    rearr = { D1 = "D1 = P0*(rE - g)", rE = "rE = D1/P0 + g", g = "g = rE - D1/P0" },
    ex = { D0 = 1.45, g = 0.045, rE = 0.115 } }
  -- P0 = D1/(1 + rE) + ... + (Dn + Pn)/(1 + rE)^n with up to 5 dividends
  local function lastD(x) local nn = 0; for k = 1, 5 do if x["D" .. k] then nn = k end end; return nn end
  local p0nv = { P0, rE }
  for k = 1, 5 do
    p0nv[#p0nv + 1] = slot("D" .. k, nil, "D" .. k .. " dividend in year " .. k .. " ($)", "money",
                           "dividend paid at the end of year " .. k .. " (blank = none)", "the dividend paid at the end of year " .. k .. ".", { list = true })
  end
  p0nv[#p0nv + 1] = slot("Pn", nil, "Pn share price in year n ($)", "money", "the price at the end of the LAST dividend year",
                         "the share price at the end of year n (the last dividend year). Often Pn = D(n+1)/(rE - g) from the growth formula (R 3 4).", { weak = true })
  def{ id = "p0n", grp = 3, name = "Share price, n dividends + price", short = "P0", eq = "P0 = D1/(1 + rE) + ... + (Dn + Pn)/(1 + rE)^n",
    words = "a few known dividends, then the price at year n",
    vars = p0nv,
    need = function(x) if lastD(x) == 0 then return "at least D1 (the dividends, year by year)" end end,
    eqf = function(x)
      local nn, t = lastD(x), {}
      for k = 1, nn - 1 do t[#t + 1] = "D" .. k .. "/(1 + rE)" .. ((k > 1) and ("^" .. k) or "") end
      t[#t + 1] = "(D" .. nn .. " + Pn)/(1 + rE)" .. ((nn > 1) and ("^" .. nn) or "")
      return "P0 = " .. table.concat(t, " + ")
    end,
    f = function(x)
      local nn, s = lastD(x), 0
      for k = 1, nn do s = s + ((x["D" .. k] or 0) + ((k == nn) and x.Pn or 0)) / (1 + x.rE) ^ k end
      return s - x.P0
    end,
    rearr = { Pn = function(x)
      local nn, t = lastD(x), {}
      for k = 1, nn - 1 do t[#t + 1] = " - D" .. k .. "/(1 + rE)" .. ((k > 1) and ("^" .. k) or "") end
      return "Pn = (P0" .. table.concat(t) .. ")*(1 + rE)" .. ((nn > 1) and ("^" .. nn) or "") .. " - D" .. nn
    end },
    ex = { rE = 0.12, D1 = 1, D2 = 1.5, D3 = 2, Pn = 40 } }

  ------------------------------------------------------------------ 4 projects
  local function lastCF(x) local nn = -1; for t = 0, 10 do if x["NCF" .. t] then nn = t end end; return nn end
  local function cfSlots(list)
    for t = 0, 10 do
      list[#list + 1] = slot("NCF" .. t, nil, (t == 0) and "NCF0 cash flow now ($)" or ("NCF" .. t .. " cash flow year " .. t .. " ($)"), "money",
                             (t == 0) and "the cost today as a NEGATIVE: the (-) key" or ("the net cash flow at the end of year " .. t),
                             (t == 0) and "the net cash flow today: usually the cost, typed NEGATIVE." or ("the net cash flow at the end of year " .. t .. " (blank = 0)."),
                             { list = true })
    end
    return list
  end
  local function npvTerms(x)
    local t = {}
    for k = 0, lastCF(x) do
      if x["NCF" .. k] then t[#t + 1] = (k == 0) and "NCF0" or ("NCF" .. k .. "/(1 + RATE)" .. ((k > 1) and ("^" .. k) or "")) end
    end
    return table.concat(t, " + ")
  end
  local function npvOf(x, rate)
    local s = 0
    for k = 0, lastCF(x) do if x["NCF" .. k] then s = s + x["NCF" .. k] / (1 + rate) ^ k end end
    return s
  end
  def{ id = "npv", grp = 4, name = "NPV of the cash flows", short = "NPV", eq = "NPV = NCF0 + NCF1/(1 + r) + ... + NCFn/(1 + r)^n",
    words = "every cash flow brought back to today and added; the cost is negative",
    vars = cfSlots({ slot("NPV", nil, "NPV ($)", "money", "the net present value (leave blank to find it)",
                          "the net present value: every cash flow discounted to today and added. Accept if NPV > 0."), r }),
    need = function(x) if lastCF(x) < 1 then return "the cash flows (NCF0 = the cost, negative, then NCF1, ...)" end end,
    eqf = function(x) return "NPV = " .. npvTerms(x):gsub("RATE", "r") end,
    f = function(x) return npvOf(x, x.r) - x.NPV end,
    ex = { r = 0.1, NCF0 = -1000, NCF1 = 300, NCF2 = 400, NCF3 = 500 } }
  def{ id = "irr", grp = 4, name = "IRR (NPV = 0)", short = "IRR", eq = "NCF0 + NCF1/(1 + IRR) + ... + NCFn/(1 + IRR)^n = 0",
    words = "the rate that makes the NPV zero",
    vars = cfSlots({ slot("IRR", nil, "IRR (%)", "pct", "the rate that makes NPV = 0 (leave blank)",
                          "the internal rate of return: the discount rate where the NPV is exactly 0. Accept if IRR > the cost of capital.", { rate = true }) }),
    need = function(x)
      if lastCF(x) < 1 then return "the cash flows (NCF0 negative, then the later ones)" end
      local pos, neg = false, false
      for t = 0, 10 do local v = x["NCF" .. t]; if v and v > 0 then pos = true elseif v and v < 0 then neg = true end end
      if not (pos and neg) then return "a cost (a NEGATIVE cash flow) and an inflow: the IRR needs a change of sign" end
    end,
    eqf = function(x) return npvTerms(x):gsub("RATE", "IRR") .. " = 0" end,
    f = function(x) return npvOf(x, x.IRR) end,
    ex = { NCF0 = -1000, NCF1 = 300, NCF2 = 400, NCF3 = 500 } }
  def{ id = "pi", grp = 4, name = "Profitability index", short = "PI", eq = "PI = NPV/Resource",
    words = "NPV per dollar of the scarce resource (usually the money invested)",
    vars = { slot("PI", nil, "PI profitability index", "num", "NPV per dollar of the resource", "NPV divided by the resource it uses up. Rank projects by PI when money is limited."),
             slot("NPV", nil, "NPV ($)", "money", "the project's NPV", "the project's net present value."),
             slot("Resource", nil, "resource consumed ($)", "money", "usually the money invested today (positive)", "what the project uses up: usually the initial investment, typed positive.") },
    f = function(x) return x.NPV / x.Resource - x.PI end,
    rearr = { NPV = "NPV = PI*Resource", Resource = "Resource = NPV/PI" },
    ex = { NPV = 250, Resource = 1000 } }
  local NPVs = slot("NPV0", nil, "NPV0 NPV of one cycle ($)", "money", "the NPV of ONE run of the project (n years)", "the NPV of one cycle of the project (its normal life of n years).")
  def{ id = "npvinf", grp = 4, name = "NPV repeated forever", short = "NPVinf", eq = "NPVinf = NPV0*(1 + r)^n/((1 + r)^n - 1)",
    words = "the project is replaced every n years forever",
    vars = { slot("NPVinf", nil, "NPVinf NPV forever ($)", "money", "the NPV if the project is repeated forever",
                  "the NPV of repeating the project every n years, forever. Compare projects with different lives."), NPVs, r,
             cp(n, { label = "n life of one cycle (years)", hint = "the life of ONE cycle, in years" }) },
    f = function(x) return x.NPV0 * (1 + x.r) ^ x.n / ((1 + x.r) ^ x.n - 1) - x.NPVinf end,
    rearr = { NPV0 = "NPV0 = NPVinf*((1 + r)^n - 1)/(1 + r)^n", n = "n = ln(NPVinf/(NPVinf - NPV0))/ln(1 + r)" },
    ex = { NPV0 = 500, r = 0.1, n = 3 } }
  def{ id = "eav", grp = 4, name = "Equivalent annual value", short = "EAV", eq = "EAV = NPV*r/(1 - 1/(1 + r)^n)",
    words = "the NPV spread into an equal amount each year of the life",
    vars = { slot("EAV", nil, "EAV equal amount a year ($)", "money", "the NPV as an equal yearly amount", "the equivalent annual value (or cost): the NPV spread evenly over the n years."),
             cp(NPVs, { k = "NPV", t = "NPV", label = "NPV ($)" }), r, cp(n, { label = "n life (years)" }) },
    f = function(x) return x.NPV * x.r / (1 - 1 / (1 + x.r) ^ x.n) - x.EAV end,
    rearr = { NPV = "NPV = EAV*(1 - 1/(1 + r)^n)/r", n = "n = -ln(1 - NPV*r/EAV)/ln(1 + r)" },
    ex = { NPV = 1000, r = 0.08, n = 5 } }
  def{ id = "fcf", grp = 4, name = "Free cash flow (one year)", short = "FCF", eq = "FCF = (Rev - Costs - Dep)*(1 - tc) + Dep - CapEx - dNWC",
    words = "after-tax operating profit, plus depreciation back, minus investment",
    vars = { slot("FCF", nil, "FCF free cash flow ($)", "money", "the year's free cash flow", "the free cash flow for the year."),
             slot("Rev", nil, "Rev revenue ($)", "money", "sales for the year (incremental)", "the extra revenue (sales) from the project this year."),
             slot("Costs", nil, "Costs operating costs ($)", "money", "costs for the year, NOT depreciation", "the extra operating costs this year. Not depreciation, not interest. Lost sales elsewhere: add them here (erosion)."),
             slot("Dep", nil, "Dep depreciation ($)", "money", "depreciation for the year (blank = 0)", "the depreciation this year: cost/life for straight line. It cuts tax, then is added back. Sunk asset (already bought): its Dep is NOT incremental, leave blank (= 0).", { weak = true }),
             tc,
             slot("CapEx", nil, "CapEx capital spending ($)", "money", "money spent on assets this year (blank = 0)", "capital expenditure this year (new equipment). Blank = 0.", { weak = true }),
             slot("dNWC", nil, "dNWC change in NWC ($)", "money", "this year's NWC minus last year's (blank = 0)", "the CHANGE in net working capital: this year's (inventory + A/R - A/P) minus last year's. Blank = 0.", { weak = true }) },
    f = function(x) return (x.Rev - x.Costs - x.Dep) * (1 - x.tc) + x.Dep - x.CapEx - x.dNWC - x.FCF end,
    rearr = { Rev = "Rev = (FCF - Dep + CapEx + dNWC)/(1 - tc) + Costs + Dep",
              Costs = "Costs = Rev - Dep - (FCF - Dep + CapEx + dNWC)/(1 - tc)",
              Dep = "Dep = (FCF - (Rev - Costs)*(1 - tc) + CapEx + dNWC)/tc",
              tc = "tc = (Rev - Costs - CapEx - dNWC - FCF)/(Rev - Costs - Dep)",
              CapEx = "CapEx = (Rev - Costs - Dep)*(1 - tc) + Dep - dNWC - FCF",
              dNWC = "dNWC = (Rev - Costs - Dep)*(1 - tc) + Dep - CapEx - FCF" },
    ex = { Rev = 500, Costs = 200, Dep = 50, tc = 0.3, CapEx = 40, dNWC = 10 } }
  def{ id = "salv", grp = 4, name = "After-tax salvage", short = "after-tax salvage", eq = "ATS = SV - (SV - BV)*tc",
    words = "sale price minus tax on the gain over book value",
    vars = { slot("ATS", nil, "ATS after-tax salvage ($)", "money", "the cash you keep from the sale", "the after-tax salvage: the sale price minus tax on any gain (plus a refund on a loss)."),
             slot("SV", nil, "SV sale (salvage) price ($)", "money", "what the asset sells for", "the price the asset is sold for."),
             slot("BV", nil, "BV book value ($)", "money", "cost minus the depreciation so far (0 if fully depreciated)", "the book value: cost minus all the depreciation so far. Fully depreciated: 0."),
             tc },
    f = function(x) return x.SV - (x.SV - x.BV) * x.tc - x.ATS end,
    rearr = { SV = "SV = (ATS - BV*tc)/(1 - tc)", BV = "BV = (ATS - SV*(1 - tc))/tc", tc = "tc = (SV - ATS)/(SV - BV)" },
    ex = { SV = 40000, BV = 0, tc = 0.3 } }

  ------------------------------------------------------------------ 5 working capital
  local function daily(k, t, label, yearK, yearLabel, word)
    return slot(k, t, label, "money", "the yearly figure / 365 (or type the yearly one below)",
                "the average " .. word .. " per day = the yearly figure / 365. Or leave it blank and type the yearly " .. word .. " below.",
                { alt = { ok = function(V) return V[yearK] ~= nil end, fn = function(x) return x[yearK] / 365 end, text = t .. " = " .. yearK .. "/365", from = yearK } })
  end
  local function yearly2(k, label, word)
    return slot(k, nil, label, "money", "the yearly " .. word .. " (the daily one is this / 365)", "the " .. word .. " for the whole year.", { opt = true })
  end
  local days = function(k, t, label, what) return slot(k, t, label, "num", what, what .. ".") end
  def{ id = "invd", grp = 5, name = "Inventory days", short = "Inventory Days", eq = "InvDays = Inventory/dailyCOGS",
    words = "how many days of cost of sales sit in inventory",
    vars = { days("InvDays", nil, "Inventory Days", "days of COGS held as inventory"),
             slot("Inventory", nil, "Inventory balance ($)", "money", "the inventory on the balance sheet", "the inventory on the balance sheet."),
             daily("dailyCOGS", "dailyCOGS", "average daily COGS ($)", "COGS", nil, "cost of goods sold"),
             yearly2("COGS", "or: COGS for the year ($)", "cost of goods sold") },
    f = function(x) return x.Inventory / x.dailyCOGS - x.InvDays end,
    rearr = { Inventory = "Inventory = InvDays*dailyCOGS", dailyCOGS = "dailyCOGS = Inventory/InvDays" },
    ex = { Inventory = 50000, COGS = 365000 } }
  def{ id = "ard", grp = 5, name = "A/R days", short = "A/R Days", eq = "ARDays = AR/dailySales",
    words = "how many days of sales are still owed by customers",
    vars = { days("ARDays", nil, "A/R Days", "days of sales still owed by customers"),
             slot("AR", nil, "A/R accounts receivable ($)", "money", "money customers owe (balance sheet)", "accounts receivable: what customers still owe."),
             daily("dailySales", "dailySales", "average daily sales ($)", "Sales", nil, "sales"),
             yearly2("Sales", "or: sales for the year ($)", "sales") },
    f = function(x) return x.AR / x.dailySales - x.ARDays end,
    rearr = { AR = "AR = ARDays*dailySales", dailySales = "dailySales = AR/ARDays" },
    ex = { AR = 80000, Sales = 730000 } }
  def{ id = "apd", grp = 5, name = "A/P days", short = "A/P Days", eq = "APDays = AP/dailyCOGS",
    words = "how many days the firm takes to pay its suppliers",
    vars = { days("APDays", nil, "A/P Days", "days the firm takes to pay suppliers"),
             slot("AP", nil, "A/P accounts payable ($)", "money", "money the firm owes suppliers", "accounts payable: what the firm owes its suppliers."),
             daily("dailyCOGS", "dailyCOGS", "average daily COGS ($)", "COGS", nil, "cost of goods sold"),
             yearly2("COGS", "or: COGS for the year ($)", "cost of goods sold") },
    f = function(x) return x.AP / x.dailyCOGS - x.APDays end,
    rearr = { AP = "AP = APDays*dailyCOGS", dailyCOGS = "dailyCOGS = AP/APDays" },
    ex = { AP = 30000, COGS = 365000 } }
  def{ id = "ccc", grp = 5, name = "Cash conversion cycle", short = "CCC", eq = "CCC = InvDays + ARDays - APDays",
    words = "days the firm's own cash is tied up: inventory + collecting - paying",
    vars = { days("CCC", nil, "CCC cash cycle (days)", "days the firm's cash is tied up"),
             days("InvDays", nil, "Inventory Days", "from the Inventory Days line (R 5 1)"),
             days("ARDays", nil, "A/R Days", "from the A/R Days line (R 5 2)"),
             days("APDays", nil, "A/P Days", "from the A/P Days line (R 5 3)") },
    f = function(x) return x.InvDays + x.ARDays - x.APDays - x.CCC end,
    rearr = { InvDays = "InvDays = CCC - ARDays + APDays", ARDays = "ARDays = CCC - InvDays + APDays", APDays = "APDays = InvDays + ARDays - CCC" },
    ex = { InvDays = 50, ARDays = 40, APDays = 30 } }

  ------------------------------------------------------------------ 6 returns and risk
  local function pairs3(list, n3, a, la, b, lb)
    for k = 1, n3 do
      list[#list + 1] = slot(a .. k, nil, string.format(la, k), "pct", "state/period " .. k .. " (blank pair = not used)", string.format(la, k) .. ".", { grp = k })
      if b then list[#list + 1] = slot(b .. k, nil, string.format(lb, k), "pct", "state " .. k .. ": its probability, e.g. 25", string.format(lb, k) .. ".", { grp = k }) end
    end
    return list
  end
  local function act(x, a, n3) local t = {}; for k = 1, n3 do if x[a .. k] ~= nil then t[#t + 1] = k end end; return t end
  local function ERof(x) local s = 0; for k = 1, 5 do if x["R" .. k] and x["p" .. k] then s = s + x["R" .. k] * x["p" .. k] end end; return s end
  def{ id = "ret", grp = 6, name = "Realised return (one year)", short = "R(t+1)", eq = "R = (DIV + P1 - P0)/P0",
    words = "dividend plus price change, over what you paid",
    vars = { slot("R", nil, "R return for the year (%)", "pct", "the realised return", "the return you earned over the year."),
             slot("DIV", nil, "DIV dividend received ($)", "money", "dividend received during the year (0 if none)", "the dividend received in the year."),
             slot("P1", nil, "P1 price at the end ($)", "money", "the price now / when sold", "the share price at the end of the year (or when sold)."),
             slot("P0", nil, "P0 price paid ($)", "money", "the price at the start (what you paid)", "the price at the start: what you paid.") },
    f = function(x) return (x.DIV + x.P1 - x.P0) / x.P0 - x.R end,
    rearr = { DIV = "DIV = R*P0 - P1 + P0", P1 = "P1 = P0*(1 + R) - DIV", P0 = "P0 = (DIV + P1)/(1 + R)" },
    ex = { DIV = 2.66, P1 = 62.54, P0 = 59 } }
  local ERi = slot("ER", "E(Ri)", "E(Ri) expected return (%)", "pct", "the probability-weighted average return",
                   "the expected return: each state's return x its probability, added up.")
  def{ id = "er", grp = 6, name = "Expected return (states)", short = "E(Ri)", eq = "E(Ri) = Sum of Rik*Pk",
    words = "each state's return times its chance, added up",
    vars = pairs3({ ERi }, 5, "R", "state %d: return (%%)", "p", "state %d: probability (%%)"),
    need = function(x) if #act(x, "R", 5) + #act(x, "p", 5) == 0 then return "each state's return and probability" end end,
    eqf = function(x) local t = {}; for k = 1, 5 do if x["R" .. k] or x["p" .. k] then t[#t + 1] = "R" .. k .. "*p" .. k end end; return "E(Ri) = " .. table.concat(t, " + ") end,
    f = function(x) local s = 0; for k = 1, 5 do if x["R" .. k] or x["p" .. k] then s = s + (x["R" .. k] or 0) * (x["p" .. k] or 0) end end; return s - x.ER end,
    extra = function(x) end,
    ex = { R1 = -0.14, p1 = 0.25, R2 = 0.14, p2 = 0.5, R3 = 0.29, p3 = 0.25 } }
  local function sdRow(t) return function(x, out) local sd = math.sqrt(math.max(x.Var, 0))
    out:row("SD = sqrt(" .. t .. ")", sd, "%", "the square root of the variance = sqrt(" .. P(x.Var) .. ") = " .. P(sd) .. " = " .. pct(sd) .. "%", "sd") end end
  def{ id = "varp", grp = 6, name = "Variance (states)", short = "Var(i)", eq = "Var(i) = Sum of (Rik - E(Ri))^2*Pk",
    words = "each state's squared gap from E(Ri), times its chance, added up",
    vars = pairs3({ slot("Var", "Var(i)", "Var(i) variance (decimal)", "num", "the variance (a decimal, e.g. 0.0242)",
                         "the variance, a decimal like 0.0242. Its square root is the SD."),
                    cp(ERi, { alt = { ok = function(V) return V.ER == nil end, fn = ERof, text = "E(Ri) = R1*p1 + R2*p2 + ...", from = "the E(Ri) line" } }) },
                  5, "R", "state %d: return (%%)", "p", "state %d: probability (%%)"),
    eqf = function(x) local t = {}; for k = 1, 5 do if x["R" .. k] then t[#t + 1] = "(R" .. k .. " - E(Ri))^2*p" .. k end end; return "Var(i) = " .. table.concat(t, " + ") end,
    f = function(x) local s = 0; for k = 1, 5 do if x["R" .. k] and x["p" .. k] then s = s + (x["R" .. k] - x.ER) ^ 2 * x["p" .. k] end end; return s - x.Var end,
    extra = sdRow("Var(i)"),
    ex = { R1 = -0.14, p1 = 0.25, R2 = 0.14, p2 = 0.5, R3 = 0.29, p3 = 0.25 } }
  local function listR(list, a, nn, la)
    for k = 1, nn do list[#list + 1] = slot(a .. k, nil, string.format(la, k), "pct", "a past return (blank = not used)", string.format(la, k) .. ".", { list = true }) end
    return list
  end
  local function meanOf(x, a, nn) local s, c = 0, 0; for k = 1, nn do if x[a .. k] then s = s + x[a .. k]; c = c + 1 end end; return s / c, c end
  def{ id = "mean", grp = 6, name = "Average return (past data)", short = "Rbar", eq = "Rbar = (R1 + R2 + ... + RT)/T",
    words = "add the past returns and divide by how many there are",
    vars = listR({ slot("Rbar", nil, "Rbar average return (%)", "pct", "the average of the past returns", "the average (mean) of the past returns.") }, "R", 8, "year %d: return (%%)"),
    need = function(x) if #act(x, "R", 8) == 0 then return "the past returns, one per box" end end,
    eqf = function(x) local t = act(x, "R", 8); local s = {}; for _, k in ipairs(t) do s[#s + 1] = "R" .. k end; return "Rbar = (" .. table.concat(s, " + ") .. ")/" .. #t end,
    f = function(x) local m = meanOf(x, "R", 8); return m - x.Rbar end,
    ex = { R1 = -0.22, R2 = 0.34, R3 = 0.17, R4 = 0.06 } }
  def{ id = "vars", grp = 6, name = "Variance (past data, a sample)", short = "Var(R)", eq = "Var(R) = ((R1 - Rbar)^2 + ... + (RT - Rbar)^2)/(T - 1)",
    words = "squared gaps from the average, added, divided by T - 1",
    vars = listR({ slot("Var", "Var(R)", "Var(R) variance (decimal)", "num", "the sample variance (a decimal)", "the sample variance (a decimal). Its square root is the SD."),
                   slot("Rbar", nil, "Rbar average return (%)", "pct", "blank = worked out from the returns", "the average of the returns. Leave blank: it is worked out.",
                        { alt = { ok = function(V) return V.Rbar == nil end, fn = function(x) return (meanOf(x, "R", 8)) end, text = "Rbar = (R1 + ... + RT)/T", from = "the Rbar line" } }) },
                 "R", 8, "year %d: return (%%)"),
    need = function(x) if #act(x, "R", 8) < 2 then return "at least two past returns" end end,
    eqf = function(x) local t = act(x, "R", 8); local s = {}; for _, k in ipairs(t) do s[#s + 1] = "(R" .. k .. " - Rbar)^2" end; return "Var(R) = (" .. table.concat(s, " + ") .. ")/(" .. #t .. " - 1)" end,
    f = function(x) local t = act(x, "R", 8); local s = 0; for _, k in ipairs(t) do s = s + (x["R" .. k] - x.Rbar) ^ 2 end; return s / (#t - 1) - x.Var end,
    extra = sdRow("Var(R)"),
    ex = { R1 = -0.22, R2 = 0.34, R3 = 0.17, R4 = 0.06 } }
  local covpV = { slot("Cov", nil, "Cov covariance (decimal)", "num", "the covariance (a decimal)", "the covariance of the two returns (a decimal)."),
                  slot("ERi", "E(Ri)", "E(Ri) expected return of i (%)", "pct", "blank = worked out from the states", "share i's expected return. Blank: worked out.",
                       { alt = { ok = function(V) return V.ERi == nil end, fn = function(x) local s = 0; for k = 1, 4 do if x["A" .. k] then s = s + x["A" .. k] * x["p" .. k] end end; return s end,
                                 text = "E(Ri) = A1*p1 + A2*p2 + ...", from = "the E(Ri) line" } }),
                  slot("ERj", "E(Rj)", "E(Rj) expected return of j (%)", "pct", "blank = worked out from the states", "share j's expected return. Blank: worked out.",
                       { alt = { ok = function(V) return V.ERj == nil end, fn = function(x) local s = 0; for k = 1, 4 do if x["B" .. k] then s = s + x["B" .. k] * x["p" .. k] end end; return s end,
                                 text = "E(Rj) = B1*p1 + B2*p2 + ...", from = "the E(Rj) line" } }) }
  for k = 1, 4 do
    covpV[#covpV + 1] = slot("A" .. k, nil, "state " .. k .. ": return of i (%)", "pct", "share i's return in this state", "share i's return in state " .. k .. ".", { grp = k })
    covpV[#covpV + 1] = slot("B" .. k, nil, "state " .. k .. ": return of j (%)", "pct", "share j's return in this state", "share j's return in state " .. k .. ".", { grp = k })
    covpV[#covpV + 1] = slot("p" .. k, nil, "state " .. k .. ": probability (%)", "pct", "the chance of this state, e.g. 25", "the probability of state " .. k .. ".", { grp = k })
  end
  def{ id = "covp", grp = 6, name = "Covariance (states)", short = "Cov(Ri,Rj)", eq = "Cov = Sum of (Ri,k - E(Ri))*(Rj,k - E(Rj))*Pk",
    words = "how two returns move together: gaps multiplied, times the chance, added",
    vars = covpV,
    eqf = function(x) local t = {}; for k = 1, 4 do if x["A" .. k] then t[#t + 1] = "(A" .. k .. " - E(Ri))*(B" .. k .. " - E(Rj))*p" .. k end end; return "Cov = " .. table.concat(t, " + ") end,
    f = function(x) local s = 0; for k = 1, 4 do if x["A" .. k] and x["B" .. k] and x["p" .. k] then s = s + (x["A" .. k] - x.ERi) * (x["B" .. k] - x.ERj) * x["p" .. k] end end; return s - x.Cov end,
    ex = { A1 = -0.1, B1 = 0.05, p1 = 0.3, A2 = 0.15, B2 = 0.08, p2 = 0.4, A3 = 0.3, B3 = 0.02, p3 = 0.3 } }
  local covsV = { slot("Cov", nil, "Cov sample covariance", "num", "the sample covariance (a decimal)", "the sample covariance (a decimal)."),
                  slot("Abar", "Rbar_i", "Rbar_i average of i (%)", "pct", "blank = worked out", "the average of share i's returns. Blank: worked out.",
                       { alt = { ok = function(V) return V.Abar == nil end, fn = function(x) return (meanOf(x, "A", 6)) end, text = "Rbar_i = (A1 + ... + AN)/N", from = "the Rbar line" } }),
                  slot("Bbar", "Rbar_j", "Rbar_j average of j (%)", "pct", "blank = worked out", "the average of share j's returns. Blank: worked out.",
                       { alt = { ok = function(V) return V.Bbar == nil end, fn = function(x) return (meanOf(x, "B", 6)) end, text = "Rbar_j = (B1 + ... + BN)/N", from = "the Rbar line" } }) }
  for k = 1, 6 do
    covsV[#covsV + 1] = slot("A" .. k, nil, "period " .. k .. ": return of i (%)", "pct", "share i's return that year", "share i's return in period " .. k .. ".", { grp = k })
    covsV[#covsV + 1] = slot("B" .. k, nil, "period " .. k .. ": return of j (%)", "pct", "share j's return that year", "share j's return in period " .. k .. ".", { grp = k })
  end
  def{ id = "covs", grp = 6, name = "Covariance (past data)", short = "Cov(Ri,Rj)", eq = "Cov = Sum of (Ri,n - Rbar_i)*(Rj,n - Rbar_j)/(N - 1)",
    words = "gaps from each average, multiplied, added, divided by N - 1",
    vars = covsV,
    need = function(x) if #act(x, "A", 6) < 2 then return "at least two periods of both returns" end end,
    eqf = function(x) local t = act(x, "A", 6); local s = {}; for _, k in ipairs(t) do s[#s + 1] = "(A" .. k .. " - Rbar_i)*(B" .. k .. " - Rbar_j)" end; return "Cov = (" .. table.concat(s, " + ") .. ")/(" .. #t .. " - 1)" end,
    f = function(x) local t = act(x, "A", 6); local s = 0; for _, k in ipairs(t) do s = s + (x["A" .. k] - x.Abar) * (x["B" .. k] - x.Bbar) end; return s / (#t - 1) - x.Cov end,
    ex = { A1 = 0.1, B1 = 0.02, A2 = -0.05, B2 = 0.12, A3 = 0.2, B3 = -0.04, A4 = 0.08, B4 = 0.1 } }
  local SDi = slot("SDi", nil, "SDi SD of i (%)", "pct", "share i's standard deviation, e.g. 20", "share i's standard deviation (as a %).", { pos = true })
  local SDj = slot("SDj", nil, "SDj SD of j (%)", "pct", "share j's standard deviation", "share j's standard deviation (as a %).", { pos = true })
  def{ id = "corr", grp = 6, name = "Correlation", short = "Corr", eq = "Corr = Cov/(SDi*SDj)",
    words = "the covariance scaled to between -1 and +1",
    vars = { slot("Corr", nil, "Corr correlation (-1 to 1)", "num", "between -1 and +1", "the correlation: between -1 and +1. +1: they move exactly together."),
             slot("Cov", nil, "Cov covariance (decimal)", "num", "the covariance (a decimal, e.g. 0.012)", "the covariance, a decimal (from a matrix: the number OFF the diagonal)."),
             SDi, SDj },
    f = function(x) return x.Cov / (x.SDi * x.SDj) - x.Corr end,
    rearr = { Cov = "Cov = Corr*SDi*SDj", SDi = "SDi = Cov/(Corr*SDj)", SDj = "SDj = Cov/(Corr*SDi)" },
    ex = { Cov = 0.01205, SDi = 0.395, SDj = 0.305 } }
  def{ id = "cv", grp = 6, name = "Coefficient of variation", short = "CV", eq = "CV = SD(Ri)/E[Ri]",
    words = "risk per unit of return: lower is better for a risk-averse investor",
    vars = { slot("CV", nil, "CV coefficient of variation", "num", "risk per unit of expected return", "SD divided by E[R]: risk per unit of return."),
             slot("SD", "SD(Ri)", "SD(Ri) standard deviation (%)", "pct", "the share's SD", "the standard deviation of the returns."),
             slot("ER", "E[Ri]", "E[Ri] expected return (%)", "pct", "the share's expected return", "the expected return.") },
    f = function(x) return x.SD / x.ER - x.CV end,
    rearr = { SD = "SD(Ri) = CV*E[Ri]", ER = "E[Ri] = SD(Ri)/CV" },
    ex = { SD = 0.068, ER = 0.051 } }

  ------------------------------------------------------------------ 7 portfolios and CAPM
  local erpV = { slot("ERp", "E[Rp]", "E[Rp] portfolio return (%)", "pct", "the weighted average return", "the portfolio's expected return.") }
  for k = 1, 4 do
    erpV[#erpV + 1] = slot("w" .. k, nil, "asset " .. k .. ": weight (%)", "pct", "share of the money in this asset, e.g. 60", "the % of the money in asset " .. k .. " (risk-free asset too: its E[R] = rf).", { grp = k })
    erpV[#erpV + 1] = slot("E" .. k, "E[R" .. k .. "]", "asset " .. k .. ": E[R] (%)", "pct", "this asset's expected return", "asset " .. k .. "'s expected return.", { grp = k })
  end
  def{ id = "erp", grp = 7, name = "Portfolio expected return", short = "E[Rp]", eq = "E[Rp] = w1*E[R1] + w2*E[R2] + ... + wn*E[Rn]",
    words = "the weighted average of the assets' expected returns",
    vars = erpV,
    eqf = function(x) local t = {}; for k = 1, 4 do if x["w" .. k] or x["E" .. k] then t[#t + 1] = "w" .. k .. "*E[R" .. k .. "]" end end; return "E[Rp] = " .. table.concat(t, " + ") end,
    f = function(x) local s = 0; for k = 1, 4 do if x["w" .. k] or x["E" .. k] then s = s + (x["w" .. k] or 0) * (x["E" .. k] or 0) end end; return s - x.ERp end,
    ex = { w1 = 0.6, E1 = 0.12, w2 = 0.4, E2 = 0.08 } }
  def{ id = "varpf", grp = 7, name = "Portfolio variance (two assets)", short = "Var(p)", eq = "Var(p) = wi^2*SDi^2 + wj^2*SDj^2 + 2*wi*wj*Corr(i,j)*SDi*SDj",
    words = "the two risks plus how they move together; SD(p) is its root",
    vars = { slot("Varp", "Var(p)", "Var(p) portfolio variance", "num", "the portfolio variance (a decimal)", "the portfolio variance (a decimal); SD(p) = its square root."),
             slot("wi", nil, "wi weight in i (%)", "pct", "% of the money in i, e.g. 65", "the share of the money in i."),
             slot("wj", nil, "wj weight in j (%)", "pct", "% in j (two shares only: 100 - wi)", "the share of the money in j. With a risk-free part: of the TOTAL money."),
             cp(SDi, { alt = { ok = function(V) return V.Vi ~= nil end, fn = function(x) return math.sqrt(x.Vi) end, text = "SDi = sqrt(Var(i))", from = "Var(i)" } }),
             cp(SDj, { alt = { ok = function(V) return V.Vj ~= nil end, fn = function(x) return math.sqrt(x.Vj) end, text = "SDj = sqrt(Var(j))", from = "Var(j)" } }),
             slot("Corr", "Corr(i,j)", "Corr(i,j) correlation", "num", "between -1 and +1 (or give Cov below)", "the correlation between i and j. Have the covariance instead? Type it in Cov below.",
                  { alt = { ok = function(V) return V.Covij ~= nil end, fn = function(x) return x.Covij / (x.SDi * x.SDj) end, text = "Corr(i,j) = Cov(i,j)/(SDi*SDj)", from = "Cov(i,j)" } }),
             slot("Covij", "Cov(i,j)", "or: Cov(i,j) covariance", "num", "a matrix's number OFF the diagonal", "optional: the covariance (off the diagonal of a variance-covariance matrix).", { opt = true }),
             slot("Vi", "Var(i)", "or: Var(i) variance of i", "num", "a matrix's diagonal number for i", "optional: share i's variance (the diagonal of a matrix); SDi = its root.", { opt = true }),
             slot("Vj", "Var(j)", "or: Var(j) variance of j", "num", "a matrix's diagonal number for j", "optional: share j's variance; SDj = its root.", { opt = true }) },
    f = function(x) return x.wi ^ 2 * x.SDi ^ 2 + x.wj ^ 2 * x.SDj ^ 2 + 2 * x.wi * x.wj * x.Corr * x.SDi * x.SDj - x.Varp end,
    rearr = { Corr = "Corr(i,j) = (Var(p) - wi^2*SDi^2 - wj^2*SDj^2)/(2*wi*wj*SDi*SDj)" },
    extra = function(x, out) local sd = math.sqrt(math.max(x.Varp, 0))
      out:row("SD(p) = sqrt(Var(p))", sd, "%", "the square root of the variance = sqrt(" .. P(x.Varp) .. ") = " .. P(sd) .. " = " .. pct(sd) .. "%", "sdp") end,
    ex = { wi = 0.65, wj = 0.35, SDi = 0.206, SDj = 0.172, Corr = 0.4 } }
  local rf = slot("rf", nil, "rf risk-free rate (%)", "pct", "the risk-free rate (T-bills, government bonds)", "the risk-free rate, e.g. the Treasury bill rate.")
  def{ id = "sharpe", grp = 7, name = "Sharpe ratio", short = "Sharpe Ratio", eq = "Sharpe = (E[Rp] - rf)/SDp",
    words = "extra return per unit of risk: higher is better",
    vars = { slot("Sharpe", nil, "Sharpe ratio", "num", "excess return per unit of SD", "the Sharpe ratio: (return - rf) per unit of SD. Higher is better."),
             slot("ERp", "E[Rp]", "E[Rp] expected return (%)", "pct", "the portfolio's (or share's) expected return", "the expected return."), rf,
             slot("SDp", nil, "SDp standard deviation (%)", "pct", "the portfolio's SD", "the standard deviation.", { pos = true }) },
    f = function(x) return (x.ERp - x.rf) / x.SDp - x.Sharpe end,
    rearr = { ERp = "E[Rp] = rf + Sharpe*SDp", rf = "rf = E[Rp] - Sharpe*SDp", SDp = "SDp = (E[Rp] - rf)/Sharpe" },
    ex = { ERp = 0.045, rf = 0.02, SDp = 0.295 } }
  def{ id = "beta", grp = 7, name = "Beta from covariance", short = "Beta(i)", eq = "Beta(i) = Cov(Ri,RM)/SDM^2",
    words = "how much the share moves with the market",
    vars = { slot("Beta", "Beta(i)", "Beta(i)", "num", "the share's market risk (market = 1)", "beta: how strongly the share moves with the market."),
             slot("Cov", "Cov(Ri,RM)", "Cov(Ri,RM) with the market", "num", "covariance with the market (decimal) - or Corr below", "the covariance with the market. Have the correlation instead? Type Corr and SDi below.",
                  { alt = { ok = function(V) return V.Corr ~= nil and V.SDi ~= nil end, fn = function(x) return x.Corr * x.SDi * x.SDM end, text = "Cov(Ri,RM) = Corr*SDi*SDM", from = "Corr" } }),
             slot("SDM", nil, "SDM market's SD (%)", "pct", "the MARKET's standard deviation", "the standard deviation of the MARKET's returns.", { pos = true }),
             slot("Corr", nil, "or: Corr with the market", "num", "correlation with the market (then SDi)", "optional: the correlation with the market.", { opt = true }),
             slot("SDi", nil, "and: SDi the share's SD (%)", "pct", "the share's own SD (with Corr)", "optional: the share's standard deviation.", { opt = true }) },
    f = function(x) return x.Cov / x.SDM ^ 2 - x.Beta end,
    rearr = { Cov = "Cov(Ri,RM) = Beta(i)*SDM^2", SDM = "SDM = sqrt(Cov(Ri,RM)/Beta(i))" },
    ex = { Cov = 0.02, SDM = 0.1 } }
  def{ id = "capm", grp = 7, name = "CAPM (the SML)", short = "CAPM", eq = "E[Ri] = rf + Beta(i)*(E[RM] - rf)",
    words = "the risk-free rate plus beta times the market risk premium",
    vars = { slot("ERi", "E[Ri]", "E[Ri] expected return (%)", "pct", "the share's required / expected return", "the return the share should earn (its required return, the cost of equity)."),
             rf,
             slot("Bi", "Beta(i)", "Beta(i)", "num", "the share's beta", "the share's beta (market = 1)."),
             slot("ERM", "E[RM]", "E[RM] market return (%)", "pct", "the MARKET's expected return (or the premium below)", "the expected return on the MARKET. Given 'the market risk premium is 6%'? Type 6 in MRP below instead.",
                  { alt = { ok = function(V) return V.MRP ~= nil end, fn = function(x) return x.rf + x.MRP end, text = "E[RM] = rf + MRP", from = "MRP" } }),
             slot("MRP", nil, "or: MRP market risk premium (%)", "pct", "'market risk premium 6%' = E[RM] - rf", "optional: the market risk premium, E[RM] - rf.", { opt = true }) },
    f = function(x) return x.rf + x.Bi * (x.ERM - x.rf) - x.ERi end,
    rearr = { rf = "rf = (E[Ri] - Beta(i)*E[RM])/(1 - Beta(i))", Bi = "Beta(i) = (E[Ri] - rf)/(E[RM] - rf)", ERM = "E[RM] = rf + (E[Ri] - rf)/Beta(i)" },
    ex = { rf = 0.02, Bi = 1.65, ERM = 0.11 } }
  local bpV = { slot("Bp", "Beta(p)", "Beta(p) portfolio beta", "num", "the weighted average beta", "the portfolio's beta.") }
  for k = 1, 4 do
    bpV[#bpV + 1] = slot("w" .. k, nil, "asset " .. k .. ": weight (%)", "pct", "% of the money in it (risk-free: beta 0)", "the % of the money in asset " .. k .. ".", { grp = k })
    bpV[#bpV + 1] = slot("B" .. k, "Beta" .. k, "asset " .. k .. ": beta", "num", "its beta", "asset " .. k .. "'s beta.", { grp = k })
  end
  def{ id = "betap", grp = 7, name = "Portfolio beta", short = "Beta(p)", eq = "Beta(p) = w1*Beta1 + w2*Beta2 + ... + wn*Betan",
    words = "the weighted average of the betas",
    vars = bpV,
    eqf = function(x) local t = {}; for k = 1, 4 do if x["w" .. k] or x["B" .. k] then t[#t + 1] = "w" .. k .. "*Beta" .. k end end; return "Beta(p) = " .. table.concat(t, " + ") end,
    f = function(x) local s = 0; for k = 1, 4 do if x["w" .. k] or x["B" .. k] then s = s + (x["w" .. k] or 0) * (x["B" .. k] or 0) end end; return s - x.Bp end,
    ex = { w1 = 0.7, B1 = 1.2, w2 = 0.3, B2 = 0.8 } }

  ------------------------------------------------------------------ 8 cost of capital
  def{ id = "rp", grp = 8, name = "Cost of preference shares", short = "Rp", eq = "Rp = DIVp/Pp",
    words = "a preference share is a perpetuity: dividend over price",
    vars = { slot("Rp", nil, "Rp cost of preference (%)", "pct", "the cost of preference shares", "the cost of preference shares (no tax adjustment)."),
             slot("DIVp", nil, "DIVp preference dividend ($)", "money", "the fixed dividend per share (rate x par)", "the preference dividend per share: dividend rate x par value."),
             slot("Pp", nil, "Pp preference price ($)", "money", "its market price (new issue: net proceeds)", "the preference share's price (new issue with costs: the net proceeds).") },
    f = function(x) return x.DIVp / x.Pp - x.Rp end,
    rearr = { DIVp = "DIVp = Rp*Pp", Pp = "Pp = DIVp/Rp" },
    ex = { DIVp = 2, Pp = 22.86 } }
  local Em = slot("E", nil, "E equity market value ($)", "money", "shares x price (or its weight, e.g. 60)", "the MARKET value of the equity: shares x price. Only weights given? Type them (60, 15, 25).")
  local Dm = slot("D", nil, "D debt market value ($)", "money", "bonds x price (or its weight)", "the MARKET value of the debt: bonds x bond price.")
  def{ id = "wacc", grp = 8, name = "WACC", short = "rWACC", eq = "rWACC = re*E/V + rp*P/V + rd*(1 - Tc)*D/V",
    words = "the average cost of the firm's money, weighted by market values",
    vars = { slot("rWACC", nil, "rWACC (%)", "pct", "the weighted average cost of capital", "the weighted average cost of capital."),
             slot("re", nil, "re cost of equity (%)", "pct", "from CAPM (R 7 5) or growth (R 3 4)", "the cost of equity: from CAPM (R 7 5) or the dividend growth model (R 3 4, solved for rE)."),
             Em,
             slot("rp", nil, "rp cost of preference (%)", "pct", "from Rp = DIVp/Pp (R 8 1); blank if none", "the cost of preference shares (R 8 1). None: leave blank.", { weak = true }),
             slot("P", nil, "P preference value ($)", "money", "preference shares x price; blank if none", "the market value of the preference shares. None: blank.", { weak = true }),
             slot("rd", nil, "rd PRE-tax cost of debt (%)", "pct", "the YTM (bond formula R 3 1), not the coupon", "the PRE-tax cost of debt = the yield (YTM), from the bond formula (R 3 1). Already after tax? Type it and leave Tc blank."),
             cp(Tc, { weak = true }), Dm,
             slot("V", nil, "V total value ($)", "money", "blank = E + P + D", "the total value V = E + P + D. Blank: worked out.",
                  { alt = { ok = function(V2) return V2.V == nil end, fn = function(x) return x.E + x.P + x.D end, text = "V = E + P + D", from = "the V line" } }) },
    f = function(x) return x.re * x.E / x.V + x.rp * x.P / x.V + x.rd * (1 - x.Tc) * x.D / x.V - x.rWACC end,
    rearr = { re = "re = (rWACC - rp*P/V - rd*(1 - Tc)*D/V)*V/E", rd = "rd = (rWACC - re*E/V - rp*P/V)*V/(D*(1 - Tc))" },
    ex = { re = 0.1425, E = 612.5, rp = 0.0675, P = 58.5, rd = 0.045, Tc = 0.3, D = 128.7 } }
  def{ id = "v", grp = 8, name = "Total value", short = "V", eq = "V = E + P + D",
    words = "the firm's value = equity + preference shares + debt",
    vars = { slot("V", nil, "V total value ($)", "money", "equity + preference + debt", "the total market value of the firm's financing."), Em,
             slot("P", nil, "P preference value ($)", "money", "blank if none", "the preference shares' market value.", { weak = true }), Dm },
    f = function(x) return x.E + x.P + x.D - x.V end,
    rearr = { E = "E = V - P - D", P = "P = V - E - D", D = "D = V - E - P" },
    ex = { E = 600, P = 100, D = 300 } }

  ------------------------------------------------------------------ 9 capital structure
  local rU = slot("rU", nil, "rU unlevered cost (%)", "pct", "cost of capital with NO debt (asset risk)", "the unlevered cost of capital: the cost of equity if the firm had no debt.")
  local rEc = slot("rE", nil, "rE cost of equity (%)", "pct", "the (levered) cost of equity", "the cost of equity of the levered firm.")
  local rD = slot("rD", nil, "rD cost of debt (%)", "pct", "the interest rate / yield on the debt", "the cost of debt (pre-tax).")
  local Ev = slot("E", nil, "E equity value ($)", "money", "market value of equity (or the E in D/E: 1)", "the market value of equity. Only D/E given? Type E = 1 and D = the ratio.")
  local Dv = slot("D", nil, "D debt value ($)", "money", "market value of debt (or the D/E ratio with E = 1)", "the market value of debt. Only D/E given? D = the ratio, E = 1.")
  def{ id = "mm1", grp = 9, name = "MM I: E + D = U = A", short = "E + D = U = A", eq = "E + D = U",
    words = "no taxes: the firm's value does not depend on how it is split",
    vars = { slot("U", nil, "U = A value of the firm ($)", "money", "the value of the assets (= unlevered value)", "U = A: the value of the firm's assets."), Ev, Dv },
    f = function(x) return x.E + x.D - x.U end,
    rearr = { E = "E = U - D", D = "D = U - E" },
    ex = { E = 700, D = 300 } }
  def{ id = "ru", grp = 9, name = "Unlevered cost of capital", short = "rU", eq = "rU = rE*E/(E + D) + rD*D/(E + D)",
    words = "the pre-tax WACC: the cost of the assets",
    vars = { rU, rEc, Ev, rD, Dv },
    f = function(x) return x.rE * x.E / (x.E + x.D) + x.rD * x.D / (x.E + x.D) - x.rU end,
    rearr = { rE = "rE = (rU*(E + D) - rD*D)/E", rD = "rD = (rU*(E + D) - rE*E)/D", E = "E = D*(rD - rU)/(rU - rE)", D = "D = E*(rU - rE)/(rD - rU)" },
    ex = { rE = 0.095, E = 520, rD = 0.06, D = 390 } }
  def{ id = "re", grp = 9, name = "MM II: cost of equity (no tax)", short = "rE (MM II)", eq = "rE = rU + D/E*(rU - rD)",
    words = "no taxes: equity's cost rises with D/E",
    vars = { rEc, rU, Dv, Ev, rD },
    f = function(x) return x.rU + x.D / x.E * (x.rU - x.rD) - x.rE end,
    rearr = { rU = "rU = (rE + D/E*rD)/(1 + D/E)", rD = "rD = rU - (rE - rU)*E/D", D = "D = (rE - rU)*E/(rU - rD)", E = "E = D*(rU - rD)/(rE - rU)" },
    ex = { rU = 0.08, D = 390, E = 520, rD = 0.06 } }
  local PVITS = slot("PVITS", "PV(ITS)", "PV(ITS) PV of tax shield ($)", "money", "Tc x D for permanent debt (R 9 6)", "the PV of the interest tax shield: Tc x D for permanent debt (R 9 6).")
  def{ id = "vl", grp = 9, name = "Levered value (MM with tax)", short = "VL", eq = "VL = VU + PV(ITS)",
    words = "with tax, debt adds the PV of the tax saved",
    vars = { slot("VL", nil, "VL levered value ($)", "money", "the value of the firm WITH debt", "the value of the firm with debt."),
             slot("VU", nil, "VU unlevered value ($)", "money", "the value with NO debt (e.g. EBIT(1 - Tc)/rU)", "the value of the same firm with no debt. From EBIT forever: EBIT x (1 - Tc)/rU (a perpetuity, R 2 5)."),
             PVITS },
    f = function(x) return x.VU + x.PVITS - x.VL end,
    rearr = { VU = "VU = VL - PV(ITS)", PVITS = "PV(ITS) = VL - VU" },
    ex = { VU = 250, PVITS = 37.5 } }
  def{ id = "its", grp = 9, name = "Interest tax shield", short = "Interest tax shield", eq = "ITS = Interest*Tc",
    words = "the tax saved each year because interest is deductible",
    vars = { slot("ITS", nil, "ITS tax shield a year ($)", "money", "tax saved this year", "the interest tax shield for the year."),
             slot("Interest", nil, "Interest a year ($)", "money", "interest paid = rD x D", "the interest paid in the year = rD x D."), Tc },
    f = function(x) return x.Interest * x.Tc - x.ITS end,
    rearr = { Interest = "Interest = ITS/Tc", Tc = "Tc = ITS/Interest" },
    ex = { Interest = 8, Tc = 0.3 } }
  def{ id = "pvits", grp = 9, name = "PV of the tax shield (permanent debt)", short = "PV(Interest tax shield)", eq = "PV(ITS) = Tc*D",
    words = "permanent debt: the tax shields forever are worth Tc x D",
    vars = { PVITS, Tc, cp(Dv, { hint = "the permanent debt" }) },
    f = function(x) return x.Tc * x.D - x.PVITS end,
    rearr = { Tc = "Tc = PV(ITS)/D", D = "D = PV(ITS)/Tc" },
    ex = { Tc = 0.3, D = 125 } }
  def{ id = "ret2", grp = 9, name = "MM II with tax", short = "rE (with tax)", eq = "rE = rU + D/E*(rU - rD)*(1 - Tc)",
    words = "with tax, equity's cost rises more slowly with D/E",
    vars = { rEc, rU, Dv, Ev, rD, Tc },
    f = function(x) return x.rU + x.D / x.E * (x.rU - x.rD) * (1 - x.Tc) - x.rE end,
    rearr = { rU = "rU = (rE + D/E*(1 - Tc)*rD)/(1 + D/E*(1 - Tc))", rD = "rD = rU - (rE - rU)*E/(D*(1 - Tc))",
              D = "D = (rE - rU)*E/((rU - rD)*(1 - Tc))", E = "E = D*(rU - rD)*(1 - Tc)/(rE - rU)", Tc = "Tc = 1 - (rE - rU)*E/(D*(rU - rD))" },
    ex = { rU = 0.08, D = 315, E = 420, rD = 0.06, Tc = 0.3 } }
  def{ id = "wacct", grp = 9, name = "WACC with tax (D and E)", short = "rWACC", eq = "rWACC = rE*E/(E + D) + rD*D/(E + D)*(1 - Tc)",
    words = "the after-tax WACC of a firm with debt and equity",
    vars = { slot("rWACC", nil, "rWACC (%)", "pct", "the after-tax WACC", "the weighted average cost of capital after tax."), rEc, Ev, rD, Dv, Tc },
    f = function(x) return x.rE * x.E / (x.E + x.D) + x.rD * x.D / (x.E + x.D) * (1 - x.Tc) - x.rWACC end,
    rearr = { rE = "rE = (rWACC*(E + D) - rD*D*(1 - Tc))/E", rD = "rD = (rWACC*(E + D) - rE*E)/(D*(1 - Tc))",
              Tc = "Tc = 1 - (rWACC*(E + D) - rE*E)/(rD*D)", E = "E = D*(rD*(1 - Tc) - rWACC)/(rWACC - rE)", D = "D = E*(rWACC - rE)/(rD*(1 - Tc) - rWACC)" },
    ex = { rE = 0.0905, E = 420, rD = 0.06, D = 315, Tc = 0.3 } }

  ------------------------------------------------------------------ pages
  local GROUPNAMES = { "Lump sums, EAR, interpolation", "Annuities and perpetuities", "Bonds and shares", "Projects (NPV, IRR, FCF)",
                       "Working capital", "Returns and risk", "Portfolios and CAPM", "Cost of capital", "Capital structure (MM)" }
  local function howPage(d)
    local t = { "## HOW TO FILL THE SLOTS",
                "Leave ONE slot blank: the one the question asks for. Fill every other slot. Rates as % (7 = 7%).", "" }
    for _, va in ipairs(d.vars) do
      t[#t + 1] = va.t .. ": " .. (va.how or va.hint or "")
    end
    t[#t + 1] = ""
    t[#t + 1] = "## THE FORMULA SOLVED FOR EACH SLOT"
    t[#t + 1] = d.eq
    local any = false
    for _, va in ipairs(d.vars) do
      local re = d.rearr and d.rearr[va.k]
      if type(re) == "string" then t[#t + 1] = re; any = true end
    end
    if not any then t[#t + 1] = "(the other slots: by trial - the solver does it)" end
    t[#t + 1] = ""
    t[#t + 1] = "## METHOD"
    t[#t + 1] = "1. Read what is asked: that slot stays BLANK."
    t[#t + 1] = "2. Find each other slot in the question (the words above help)."
    t[#t + 1] = "3. Match the periods: a monthly r needs a monthly n and C."
    t[#t + 1] = "4. Costs and payments out: negative only where the slot says so."
    t[#t + 1] = "5. ENTER. Write the 3 exam lines it shows: formula, numbers, answer."
    return table.concat(t, "\n")
  end
  local ROOT_STEPS = [[ROOT FORMULAS: THE STEPS
1. What does the question ask for?
   That slot stays BLANK.
2. Fill every other slot from the
   question. The grey line says what
   goes in each box; N explains more.
3. Rates as % (7 = 7%). Match the
   periods: monthly r, monthly n.
4. ENTER. The answer page shows:
   - the answer
   - WRITE IN THE EXAM: the formula,
     the rearranged form, your numbers,
     the answer (2 decimals)
   - a CHECK with every slot filled
5. A slot that comes from another
   formula says so (e.g. R 7 5 = CAPM):
   solve that one first.
6. Fill EVERY slot to check a formula:
   it says whether your numbers fit.]]
  local SUMMARY = {}
  for _, d in ipairs(DEFS) do
    local slots, letters = {}, {}
    for _, va in ipairs(d.vars) do
      local sl = S(va.k, va.label, va.kind)
      sl.hint = va.hint
      slots[#slots + 1] = sl
      letters[#letters + 1] = va.t .. " = " .. va.label:gsub("^%S+%s+", "")
    end
    local ti = #TYPES + 1
    local qt = { name = "Root: " .. d.name, root = d, rootGroup = d.grp, slots = slots,
                 solve = function(V, out) rootSolve(d, V, out) end,
                 desc = d.eq, looks = "root formula slot " .. d.name .. " " .. d.eq, formula = { d.eq },
                 words = d.words, letters = letters, acronyms = {}, assume = ROOT_STEPS, hints = {} }
    FSHEET.types[ti] = { d.id }
    qt.notes = FSHEET.notes(ti) .. "\n\n" .. howPage(d)
    -- the worked example is made on first use: the solver runs on the example's numbers
    setmetatable(qt, { __index = function(tt, key)
      if key ~= "worked" then return nil end
      local out = { rows = {}, vals = {}, fsl = {}, fso = {} }
      setmetatable(out, { __index = function(_, m) return function(self, ...) local a = { ... }
        if m == "row" then self.vals[a[5]] = a[2]; self.rows[#self.rows + 1] = a end end end })
      local ok = pcall(rootSolve, d, d.ex or {}, out)
      local w = { "## EXAMPLE (own numbers)" }
      local given = {}
      for _, va in ipairs(d.vars) do if d.ex and d.ex[va.k] then given[#given + 1] = va.t .. " " .. nf(va.kind == "pct" and d.ex[va.k] * 100 or d.ex[va.k]) .. ((va.kind == "pct") and "%" or "") end end
      w[#w + 1] = "GIVEN: " .. table.concat(given, ", ")
      if ok and out.rows[1] then
        local a = out.rows[1]
        w[#w + 1] = "BLANK: " .. a[1]
        w[#w + 1] = "ANSWER: " .. a[1] .. " = " .. ((a[3] == "%") and string.format("%.2f%%", a[2] * 100) or string.format("%.2f", a[2]))
        w[#w + 1] = "NUMBERS: " .. tostring(a[4])
      end
      w[#w + 1] = ""
      w[#w + 1] = "Try it: type the given numbers, leave the answer's slot blank, ENTER. Then blank a different slot, type the answer in, and solve again."
      local s = table.concat(w, "\n")
      rawset(tt, "worked", s)
      return s
    end })
    TYPES[ti] = qt
    d.ti = ti
    SUMMARY[d.grp] = SUMMARY[d.grp] or {}
    table.insert(SUMMARY[d.grp], ti)
  end
  -- the R menu: the sheet's formulas in 9 groups
  ROOTMENU = {}
  for gi, nm in ipairs(GROUPNAMES) do ROOTMENU[gi] = { t = nm, types = SUMMARY[gi] or {} } end
  ROOTDEFS = DEFS
  ROOT_SOLVE = rootSolve
end
