----------------------------------------------------------------------
-- EVERYTHING page, section 1 (Financial Maths): lines NOT on the formula sheet.
-- See every_core.lua for the shape of a pack. Own numbers. ASCII only.
--   * r = APR/m: the rate per period from a quoted APR
--   * t = the period of the first payment (blank = 1; 0 = today): a
--     deferred annuity or perpetuity (t typed: the normal annuity and
--     perpetuity lines step aside)
--   * FVall: a start amount PLUS regular payments, at the end
--   * a loan: the balance after k payments, a new rate rnew -> the new
--     payment and the change in the payment
----------------------------------------------------------------------
do
  local X = EVERY_SLOT
  local function nz(K, b) return K[b] ~= nil and K[b] ~= 0 end
  -- the letters (box "1:<letter>")
  local PV = X("PV", nil, "PV money today ($)", "money", "money TODAY: invest now, deposit now, borrow, value now")
  local C = X("C", nil, "C payment each period ($)", "money", "the SAME payment each period")
  local r = X("r", nil, "r rate per period (%)", "pct", "rate PER PERIOD as a %: monthly = APR/12, half-year = APR/2", { rate = true })
  local n = X("n", nil, "n number of periods", "num", "how many PERIODS: years x periods a year (5 yrs monthly = 60)", { pos = true })
  local APR = X("APR", nil, "APR quoted yearly rate (%)", "pct", "the QUOTED yearly rate: '12% p.a. compounded monthly' -> 12", { rate = true })
  local m = X("m", nil, "m compounding a year", "num", "monthly 12, quarterly 4, half-yearly 2, daily 365", { pos = true })
  local t = X("t", nil, "t first payment at period t", "num", "first payment in 4 years: 4. Today: 0. Blank: 1")
  local FVall = X("FVall", nil, "FVall FV of start amount + payments ($)", "money", "the start amount grown, PLUS the payments, at the end")
  local k = X("k", nil, "k payments already made", "num", "payments made so far: 2 years monthly = 24")
  local Bal = X("Bal", nil, "Bal loan balance left ($)", "money", "what you still owe after k payments")
  local rnew = X("rnew", nil, "rnew NEW rate per period (%)", "pct", "the NEW rate per period: monthly = new APR/12", { rate = true })
  local Cnew = X("Cnew", nil, "Cnew new payment each period ($)", "money", "the payment at the NEW rate, for the n - k left")
  local dC = X("dC", nil, "dC change in the payment ($)", "money", "new payment minus old payment")
  local kw = X("k", nil, k.label, "num", k.hint, { weak = true })   -- in the new-payment line: blank = 0 (n = payments left)

  -- FVall with t blank: the normal case, first payment in one period
  local FVA_EQ = "FVall = PV*(1 + r)^n + C/r*((1 + r)^n - 1)*(1 + r)^(1 - t)"
  local FVA_EQ1 = "FVall = PV*(1 + r)^n + C/r*((1 + r)^n - 1)"
  local function tt(x) return x.t or 1 end

  local lines = {
    { id = "s1_rapr", sec = 1, name = "Rate per period from an APR", short = "r = APR/m", eq = "r = APR/m",
      why = "the quoted APR is split into m equal parts: one per compounding period",
      vars = { r, APR, m },
      f = function(x) return x.APR / x.m - x.r end,
      rearr = { APR = "APR = r*m", m = "m = APR/r" },
      ex = { APR = 0.09, m = 4 } },
    { id = "s1_dann", sec = 1, name = "PV of an annuity, first payment at t", short = "deferred annuity",
      eq = "PV = C/r*(1 - 1/(1 + r)^n)/(1 + r)^(t - 1)",
      why = "the annuity formula gives the value one period before the first payment (t - 1): bring it back t - 1 periods",
      vars = { PV, C, r, n, t },
      f = function(x) return x.C / x.r * (1 - 1 / (1 + x.r) ^ x.n) / (1 + x.r) ^ (x.t - 1) - x.PV end,
      need = function(x) if x.t and x.t < 0 then return "t = the period of the first payment: 0 (today), 1, 2, ..." end end,
      rearr = { C = "C = PV*r*(1 + r)^(t - 1)/(1 - 1/(1 + r)^n)", n = "n = -ln(1 - PV*r*(1 + r)^(t - 1)/C)/ln(1 + r)",
                t = "t = 1 + ln(C/r*(1 - 1/(1 + r)^n)/PV)/ln(1 + r)" },
      ex = { C = 350, r = 0.06, n = 5, t = 3 } },
    { id = "s1_dperp", sec = 1, name = "PV of a perpetuity, first payment at t", short = "deferred perpetuity",
      eq = "PV = C/r/(1 + r)^(t - 1)",
      why = "C/r gives the value one period before the first payment (t - 1): bring it back t - 1 periods",
      vars = { PV, C, r, t },
      f = function(x) return x.C / x.r / (1 + x.r) ^ (x.t - 1) - x.PV end,
      need = function(x)
        if x.t and x.t < 0 then return "t = the period of the first payment: 0 (today), 1, 2, ..." end
        if x.r and x.r <= 0 then return "r more than 0 (or it never ends)" end
      end,
      rearr = { C = "C = PV*r*(1 + r)^(t - 1)", t = "t = 1 + ln(C/(r*PV))/ln(1 + r)" },
      ex = { C = 120, r = 0.05, t = 4 } },
    { id = "s1_fvall", sec = 1, name = "FV of a start amount plus payments", short = "start amount + payments",
      eq = FVA_EQ, eqf = function(x) return x.t and FVA_EQ or FVA_EQ1 end,
      why = "the FV of one amount, PV*(1 + r)^n, plus the FV of the annuity; payments from today (t = 0): times (1 + r)",
      vars = { FVall, PV, C, r, n, X("t", nil, t.label, "num", t.hint, { opt = true }) },
      f = function(x) return x.PV * (1 + x.r) ^ x.n + x.C / x.r * ((1 + x.r) ^ x.n - 1) * (1 + x.r) ^ (1 - tt(x)) - x.FVall end,
      rearr = {
        PV = function(x) return x.t and "PV = (FVall - C/r*((1 + r)^n - 1)*(1 + r)^(1 - t))/(1 + r)^n" or "PV = (FVall - C/r*((1 + r)^n - 1))/(1 + r)^n" end,
        C = function(x) return x.t and "C = (FVall - PV*(1 + r)^n)*r/(((1 + r)^n - 1)*(1 + r)^(1 - t))" or "C = (FVall - PV*(1 + r)^n)*r/((1 + r)^n - 1)" end,
        n = function(x) return x.t and "n = ln((FVall + C/r*(1 + r)^(1 - t))/(PV + C/r*(1 + r)^(1 - t)))/ln(1 + r)" or "n = ln((FVall + C/r)/(PV + C/r))/ln(1 + r)" end },
      ex = { PV = 2500, C = 150, r = 0.01, n = 24 } },
    { id = "s1_bal", sec = 1, name = "Loan balance after k payments", short = "loan balance",
      eq = "Bal = C/r*(1 - 1/(1 + r)^(n - k))",
      why = "what you still owe = the PV of the n - k payments left (the annuity formula with n - k)",
      vars = { Bal, C, r, n, k },
      f = function(x) return x.C / x.r * (1 - 1 / (1 + x.r) ^ (x.n - x.k)) - x.Bal end,
      need = function(x) if x.n and x.k and x.k >= x.n then return "k LESS than n (payments left = n - k)" end end,
      rearr = { C = "C = Bal*r/(1 - 1/(1 + r)^(n - k))", n = "n = k - ln(1 - Bal*r/C)/ln(1 + r)",
                k = "k = n + ln(1 - Bal*r/C)/ln(1 + r)" },
      ex = { C = 900, r = 0.005, n = 240, k = 60 } },
    { id = "s1_cnew", sec = 1, name = "New payment after a rate change", short = "new payment",
      eq = "Cnew = Bal*rnew/(1 - 1/(1 + rnew)^(n - k))",
      why = "the balance is a new loan at the new rate rnew, paid off over the n - k payments left (the annuity formula solved for C)",
      vars = { Cnew, Bal, rnew, n, kw },
      f = function(x) return x.Bal * x.rnew / (1 - 1 / (1 + x.rnew) ^ (x.n - x.k)) - x.Cnew end,
      need = function(x) if x.n and x.k and x.k >= x.n then return "k LESS than n (payments left = n - k)" end end,
      rearr = { Bal = "Bal = Cnew*(1 - 1/(1 + rnew)^(n - k))/rnew", n = "n = k - ln(1 - Bal*rnew/Cnew)/ln(1 + rnew)",
                k = "k = n + ln(1 - Bal*rnew/Cnew)/ln(1 + rnew)" },
      ex = { Bal = 150000, rnew = 0.004, n = 240, k = 60 } },
    { id = "s1_dc", sec = 1, name = "Change in the payment", short = "dC = Cnew - C", eq = "dC = Cnew - C",
      why = "the new payment minus the old one (more: the payment goes up)",
      vars = { dC, Cnew, C },
      f = function(x) return x.Cnew - x.C - x.dC end,
      rearr = { Cnew = "Cnew = C + dC", C = "C = Cnew - dC" },
      ex = { Cnew = 1050, C = 980 } },
  }

  local DUE = "the payments are at the START of each period (annuity due)"
  local function tOrFV(K) return K["1:t"] ~= nil or K["1:FVall"] ~= nil end
  local function loan(K) return K["1:k"] ~= nil or K["1:rnew"] ~= nil end
  local function tFVLoan(K) return tOrFV(K) or loan(K) end
  EVERY_ADD{
    lines = lines,
    -- an NPV worked out in Capital Budgeting is a value today: the PV of section 1 (never a typed NPV)
    bridges = { { "3:NPV", "1:PV", false, nil, nil, nil, true } },
    weakok = { s1_cnew = { k = true } },
    fam = { s1_dann = "tvm", s1_dperp = "tvm", s1_fvall = "tvm" },
    skip = {
      -- r typed: r = APR/m only gives the APR (m typed, no EAR typed)
      s1_rapr = function(K) return K["1:r"] ~= nil and (K["1:m"] == nil or K["1:EAR"] ~= nil) end,
      -- t typed: the deferred lines; then the normal annuity and perpetuity step aside
      s1_dann = function(K) return K["1:t"] == nil or K["1:FVall"] ~= nil or nz(K, "1:g") end,
      s1_dperp = function(K) return K["1:t"] == nil or K["1:n"] ~= nil or K["1:FVall"] ~= nil or nz(K, "1:g") end,
      pva = tOrFV, pvad = tFVLoan, perp = tOrFV, gperp = tFVLoan, gann = tFVLoan,
      -- t = 0: the FV is the annuity due's; a loan (k or rnew typed): no FV or lump-sum lines
      fv = loan, pv = loan,
      fva = function(K) return K["1:t"] == 0 or loan(K) end,
      fvad = function(K) return (K["1:t"] ~= nil and K["1:t"] ~= 0) or loan(K) end,
      -- a start amount AND payments typed (or FVall typed); not for a loan's balance
      s1_fvall = function(K)
        return K["1:k"] ~= nil or K["1:rnew"] ~= nil or nz(K, "1:g")
               or not (K["1:FVall"] ~= nil or (K["1:PV"] ~= nil and K["1:C"] ~= nil))
      end,
      s1_bal = function(K) return K["1:k"] == nil and K["1:Bal"] == nil end,
      s1_cnew = function(K) return K["1:rnew"] == nil and K["1:Cnew"] == nil end,
      s1_dc = function(K) return K["1:rnew"] == nil and K["1:Cnew"] == nil and K["1:dC"] == nil end,
    },
    -- t = 0 typed: the annuity due IS the case, so its FV is passed on
    second = { fvad = function(K) if K["1:t"] == 0 then return nil end return DUE end },
    lbl = { ["1:FVn"] = "FVn one amount at the end ($)" },
    hint = { ["1:FV"] = "the end value of a series of equal payments",
             ["1:FVn"] = "one single amount at the end, no payments" },
    order = { [1] = { "1:t", "1:FVall", "1:k", "1:Bal", "1:rnew", "1:Cnew", "1:dC" } },
  }
end
