----------------------------------------------------------------------
-- WEEK 9: RISK AND RETURN
--   17 one share: realised return, annualised return, expected return, SD, CV, Sharpe
--   18 two shares: portfolio return and risk, covariance, correlation, risk-free mix, weights
--   19 beta, CAPM, the SML: required return, over/undervalued, portfolio beta, target return
----------------------------------------------------------------------
do
  local sqrt = math.sqrt
  local function list(V, prefix, n)
    local t = {}
    for k2 = 1, n do local x = V[prefix .. k2]; if x ~= nil then t[#t + 1] = x end end
    return t
  end
  local function mean(xs) local s = 0; for _, x in ipairs(xs) do s = s + x end; return s / #xs end
  local function join(xs, f) local t = {}; for _, x in ipairs(xs) do t[#t + 1] = f(x) end; return table.concat(t, ", ") end

  local MODES17 = { "realised return (one year)", "several years: annualised", "forecast: states of the economy",
                    "past returns (a sample)", "CV and Sharpe ratio" }
  local function riskTail(out, ER, SD, rf)
    if ER and SD and ER ~= 0 then out:row("CV (risk per unit of return)", SD / ER, "", "SD/E[R] = " .. P(SD) .. "/" .. P(ER), "cv") end
    if ER and SD and rf and SD > 0 then out:row("Sharpe ratio", (ER - rf) / SD, "", "(E[R] - rf)/SD = (" .. P(ER) .. " - " .. P(rf) .. ")/" .. P(SD), "sharpe") end
  end
  local function solveOne(V, out)
    local mode = V.mode or MODES17[1]
    if mode == MODES17[1] then
      local div = V.div
      if not div and V.divT and V.shares then
        div = V.divT / V.shares
        out:row("dividend per share", div, "$", "total dividends / shares = " .. P(V.divT) .. "/" .. P(V.shares), "div")
      end
      div = div or 0
      if not (V.P0 and V.P1) then out:need("the price paid P0 and the price now P1"); return end
      out:head("REALISED RETURN")
      out:row("dividend yield", div / V.P0, "%", "Div/P0 = " .. P(div) .. "/" .. P(V.P0), "dy")
      out:row("capital gain yield", (V.P1 - V.P0) / V.P0, "%", "(P1 - P0)/P0 = (" .. P(V.P1) .. " - " .. P(V.P0) .. ")/" .. P(V.P0), "cg")
      out:row("total return R", (div + V.P1 - V.P0) / V.P0, "%", "(Div + P1 - P0)/P0", "R")
      return
    end
    if mode == MODES17[2] then
      local rs = list(V, "R", 8)
      if #rs < 1 then out:need("the yearly returns R1, R2, ..."); return end
      local g = 1
      for _, x in ipairs(rs) do g = g * (1 + x) end
      out:head("OVER " .. #rs .. " YEARS")
      out:row("holding-period return", g - 1, "%", "(1 + R1)(1 + R2)... - 1", "hpr")
      out:row("annualised (compound) return", g ^ (1 / #rs) - 1, "%", "(1 + HPR)^(1/" .. #rs .. ") - 1", "ann")
      out:row("arithmetic average", mean(rs), "%", "(R1 + R2 + ...)/" .. #rs, "avg")
      out:note("the annualised (geometric) return is never above the arithmetic average")
      return
    end
    if mode == MODES17[3] then
      local ps, rs = list(V, "p", 5), list(V, "R", 5)
      if #rs < 2 or #ps ~= #rs then out:need("a probability AND a return for every state"); return end
      local sp = 0
      for _, x in ipairs(ps) do sp = sp + x end
      if math.abs(sp - 1) > 0.0005 then out:err("the probabilities must add to 100% (now " .. pct(sp) .. "%)"); return end
      local ER, var = 0, 0
      for k2 = 1, #rs do ER = ER + ps[k2] * rs[k2] end
      for k2 = 1, #rs do var = var + ps[k2] * (rs[k2] - ER) ^ 2 end
      out:head("FORECAST")
      out:row("expected return E[R]", ER, "%", "sum p x R", "ER")
      out:row("variance", var, "", "sum p x (R - E[R])^2", "var")
      out:row("SD", sqrt(var), "%", "square root of the variance", "sd")
      riskTail(out, ER, sqrt(var), V.rf)
      return
    end
    if mode == MODES17[4] then
      local rs = list(V, "R", 8)
      if #rs < 2 then out:need("at least two past returns"); return end
      local m, ss = mean(rs), 0
      for _, x in ipairs(rs) do ss = ss + (x - m) ^ 2 end
      local var = ss / (#rs - 1)
      out:head("PAST RETURNS (SAMPLE, n = " .. #rs .. ")")
      out:row("average return", m, "%", "sum R / " .. #rs, "avg")
      out:row("variance", var, "", "sum (R - avg)^2 / (n - 1) = " .. P(ss) .. "/" .. (#rs - 1), "var")
      out:row("SD", sqrt(var), "%", "square root of the variance", "sd")
      riskTail(out, m, sqrt(var), V.rf)
      out:head("ON YOUR TI-NSPIRE")
      out:xl("stDevSamp({" .. join(rs, P) .. "})")
      return
    end
    if not (V.ER and V.SD) then out:need("E[R] and SD (and rf for the Sharpe ratio)"); return end
    riskTail(out, V.ER, V.SD, V.rf)
    out:note("risk-averse: pick the LOWEST CV; the HIGHER Sharpe ratio is the better portfolio")
  end

  local rs17 = {}
  for k2 = 1, 8 do rs17[#rs17 + 1] = S("R" .. k2, "R" .. k2 .. " return (%)", "pct") end
  local slots17 = { S("mode", "what to find", "choice", MODES17, 1),
    S("P0", "P0 price paid ($)", "money"), S("P1", "P1 price now ($)", "money"),
    S("div", "Div per share ($)", "money"), S("divT", "or: total dividends ($)", "money"), S("shares", "number of shares", "num") }
  for k2 = 1, 5 do
    slots17[#slots17 + 1] = S("p" .. k2, "state " .. k2 .. ": probability (%)", "pct")
    slots17[#slots17 + 1] = rs17[k2]
  end
  for k2 = 6, 8 do slots17[#slots17 + 1] = rs17[k2] end
  for _, sl in ipairs({ S("ER", "E[R] expected return (%)", "pct"), S("SD", "SD standard deviation (%)", "pct"), S("rf", "rf risk-free rate (%)", "pct") }) do
    slots17[#slots17 + 1] = sl
  end
  table.insert(TYPES, {
    name = "One share: return and risk", group = 6, solve = solveOne,
    desc = "realised return, annualised return, expected return and SD (forecast or past data), CV, Sharpe",
    looks = "realised return | dividend yield | annualised | expected return | standard deviation | states of the economy | sample | CV | Sharpe",
    slots = slots17,
    vis = function(Sm)
      local m = Sm.mode.opts[Sm.mode.idx]
      if m == MODES17[1] then return { "mode", "P0", "P1", "div", "divT", "shares" } end
      if m == MODES17[2] then return { "mode", "R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8" } end
      if m == MODES17[3] then return { "mode", "p1", "R1", "p2", "R2", "p3", "R3", "p4", "R4", "p5", "R5", "rf" } end
      if m == MODES17[4] then return { "mode", "R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "rf" } end
      return { "mode", "ER", "SD", "rf" }
    end,
    hints = {
      mode = "left/right: realised, annualised, forecast, past, CV",
      P0 = "the price you bought at (a year ago)",
      P1 = "the price now (or when sold)",
      div = "dividend per share received in the year",
      divT = "'paid $266 of dividends in total' (then shares)",
      p1 = "chance of this state, e.g. 25",
      R1 = "a return as a %, e.g. -14 for a 14% loss",
      rf = "risk-free rate (for the Sharpe ratio)",
      ER = "expected return, e.g. 11.9",
      SD = "standard deviation, e.g. 14.5",
    },
    formula = { "R = (Div + P_1 - P_0)/(P_0)   E[R] = sum p*R", "SD = sqrt(sum p*(R - E[R])^2)   sample: /(n - 1)" },
    words = "return = what you got (dividend + price change) over what you paid; risk = how spread out the returns are",
    letters = { "P0 = price paid; P1 = price now", "Div = dividend in the year", "p = probability of a state; R = its return",
                "E[R] = expected return", "SD = standard deviation (sigma)", "n = number of past returns", "rf = risk-free rate",
                "CV = SD / E[R]", "Sharpe = (E[R] - rf)/SD" },
    acronyms = { "SD = standard deviation", "CV = coefficient of variation", "HPR = holding-period return", "rf = risk-free rate" },
    notes = [[ONE SHARE: RETURN AND RISK

HOW TO USE
Pick what you have with left/right:
prices and a dividend; several yearly
returns; a forecast table (probability
+ return per state); past returns.
Rates go in as % (a loss: -14).

FORMULAS
$$R = (Div + P_1 - P_0)/(P_0)
$$E[R] = p_1*R_1 + p_2*R_2 + ...
$$Var = sum p*(R - E[R])^2
past data (a sample): divide by n - 1
$$SD = sqrt(Var)
$$CV = SD/E[R]   Sharpe = (E[R] - r_f)/SD]],
    assume = STEPS_COMMON .. [[
THIS TYPE:
1. forecast (probabilities) -> weights
   are the probabilities
2. past data -> divide by n - 1
3. SD = square root of the variance

IF THE QUESTION SAYS...
- "treat as a sample" -> n - 1
- "states of the economy" -> forecast
- "annualised" / "per year compound" ->
  (1 + HPR)^(1/n) - 1

TRAPS
- the variance is in %^2: take the root
- the dividend yield uses P0, not P1]],
    worked = [[## Realised return
Q: bought at $59, dividend $2.66, now
$62.54.
ENTER: P0 59 | P1 62.54 | div 2.66
R = (2.66 + 62.54 - 59)/59 = 10.51%

## Forecast SD
Q: 25%: -14%, 50%: 14%, 25%: 29%.
ENTER: mode forecast | p1 25 | R1 -14 |
p2 50 | R2 14 | p3 25 | R3 29
E[R] = 10.75%; SD = 15.55%

## Sample SD
Q: -22%, 34%, 17%, 6% (a sample).
ENTER: mode past returns | -22 | 34 |
17 | 6
avg 8.75%; SD = 23.51%]],
  })

  ------------------------------------------------------------------
  -- 18 two shares: a portfolio
  ------------------------------------------------------------------
  local MODES18 = { "SDs + correlation known", "forecast table (states)", "past returns (a sample)",
                    "one share + the risk-free asset", "weights from holdings" }
  local function port(out, wA, ERA, ERB, sA, sB, cov)
    local wB = 1 - wA
    out:head("PORTFOLIO (wA " .. pct(wA) .. "%, wB " .. pct(wB) .. "%)")
    if ERA and ERB then out:row("E[Rp]", wA * ERA + wB * ERB, "%", "wA x E[RA] + wB x E[RB]", "ERp") end
    if sA and sB and cov then
      local var = wA ^ 2 * sA ^ 2 + wB ^ 2 * sB ^ 2 + 2 * wA * wB * cov
      out:row("portfolio variance", var, "", "wA^2 sA^2 + wB^2 sB^2 + 2 wA wB Cov", "varp")
      out:row("portfolio SD", sqrt(var), "%", "square root of the variance", "sdp")
      out:note("SD of the portfolio is below the weighted average unless the correlation is +1")
    end
  end
  local function solvePort(V, out)
    local mode = V.mode or MODES18[1]
    local wA = V.wA
    if not wA and V.amtA and V.amtB then
      wA = V.amtA / (V.amtA + V.amtB)
      out:row("wA (from the amounts)", wA, "%", "A/(A + B) = " .. P(V.amtA) .. "/" .. P(V.amtA + V.amtB), "wA")
    end
    if mode == MODES18[1] then
      local cov, rho = V.cov, V.rho
      if cov == nil and rho and V.sA and V.sB then
        cov = rho * V.sA * V.sB
        out:row("covariance", cov, "", "rho x sA x sB = " .. P(rho) .. " x " .. P(V.sA) .. " x " .. P(V.sB), "cov")
      elseif cov and not rho and V.sA and V.sB then
        out:row("correlation", cov / (V.sA * V.sB), "", "Cov/(sA x sB) = " .. P(cov) .. "/(" .. P(V.sA) .. " x " .. P(V.sB) .. ")", "rho")
      end
      if not wA then out:need("the weight of A (or the two amounts)"); return end
      port(out, wA, V.ERA, V.ERB, V.sA, V.sB, cov)
      return
    end
    if mode == MODES18[2] then
      local ps, ra, rb = list(V, "p", 4), list(V, "A", 4), list(V, "B", 4)
      if #ps < 2 or #ra ~= #ps or #rb ~= #ps then out:need("a probability, A's return and B's return for every state"); return end
      local EA, EB = 0, 0
      for k2 = 1, #ps do EA = EA + ps[k2] * ra[k2]; EB = EB + ps[k2] * rb[k2] end
      local vA, vB, cv = 0, 0, 0
      for k2 = 1, #ps do
        vA = vA + ps[k2] * (ra[k2] - EA) ^ 2; vB = vB + ps[k2] * (rb[k2] - EB) ^ 2
        cv = cv + ps[k2] * (ra[k2] - EA) * (rb[k2] - EB)
      end
      out:head("EACH SHARE")
      out:row("E[RA]", EA, "%", "sum p x RA", "EA"); out:row("E[RB]", EB, "%", "sum p x RB", "EB")
      out:row("SD A", sqrt(vA), "%", "sqrt(sum p (RA - E[RA])^2)", "sA"); out:row("SD B", sqrt(vB), "%", "sqrt(sum p (RB - E[RB])^2)", "sB")
      out:row("covariance", cv, "", "sum p (RA - E[RA])(RB - E[RB])", "cov")
      out:row("correlation", cv / (sqrt(vA) * sqrt(vB)), "", "Cov/(sA x sB)", "rho")
      if wA then port(out, wA, EA, EB, sqrt(vA), sqrt(vB), cv) end
      return
    end
    if mode == MODES18[3] then
      local ra, rb = list(V, "A", 6), list(V, "B", 6)
      if #ra < 2 or #ra ~= #rb then out:need("the same number of past returns for A and B"); return end
      local mA, mB, sa, sb, sc = mean(ra), mean(rb), 0, 0, 0
      for k2 = 1, #ra do sa = sa + (ra[k2] - mA) ^ 2; sb = sb + (rb[k2] - mB) ^ 2; sc = sc + (ra[k2] - mA) * (rb[k2] - mB) end
      local n1 = #ra - 1
      out:head("PAST RETURNS (SAMPLE, n = " .. #ra .. ")")
      out:row("average A", mA, "%", "sum RA / n", "mA"); out:row("average B", mB, "%", "sum RB / n", "mB")
      out:row("SD A", sqrt(sa / n1), "%", "sqrt(sum (RA - avg)^2/(n - 1))", "sA"); out:row("SD B", sqrt(sb / n1), "%", "sqrt(sum (RB - avg)^2/(n - 1))", "sB")
      out:row("covariance", sc / n1, "", "sum (RA - avgA)(RB - avgB)/(n - 1) = " .. P(sc) .. "/" .. n1, "cov")
      out:row("correlation", (sc / n1) / (sqrt(sa / n1) * sqrt(sb / n1)), "", "Cov/(sA x sB)", "rho")
      if wA then port(out, wA, mA, mB, sqrt(sa / n1), sqrt(sb / n1), sc / n1) end
      return
    end
    if mode == MODES18[4] then
      local w = wA
      if not (w and V.sA) then out:need("the weight in the share and its SD"); return end
      out:head("SHARE + RISK-FREE ASSET")
      if V.ERA and V.rf then out:row("E[Rp]", w * V.ERA + (1 - w) * V.rf, "%", "w x E[R] + (1 - w) x rf", "ERp") end
      out:row("portfolio SD", w * V.sA, "%", "w x SD (the risk-free asset has no risk) = " .. P(w) .. " x " .. P(V.sA), "sdp")
      if V.ERA and V.rf then out:row("Sharpe ratio", (V.ERA - V.rf) / V.sA, "", "(E[R] - rf)/SD: the same for any mix", "sh") end
      return
    end
    local vals, tot = {}, 0
    for k2 = 1, 3 do
      local n, pr = V["n" .. k2], V["px" .. k2]
      if n and pr then vals[k2] = n * pr; tot = tot + n * pr end
    end
    if tot == 0 then out:need("shares and price for each holding"); return end
    out:row("total value", tot, "$", "sum of shares x price", "tot")
    for k2 = 1, 3 do if vals[k2] then out:row("weight " .. k2, vals[k2] / tot, "%", P(vals[k2]) .. "/" .. P(tot), "w" .. k2) end end
  end
  local slots18 = { S("mode", "what you have", "choice", MODES18, 1),
    S("wA", "wA weight in A (%)", "pct"), S("amtA", "or: $ in A", "money"), S("amtB", "and $ in B", "money"),
    S("ERA", "E[RA] (%)", "pct"), S("ERB", "E[RB] (%)", "pct"), S("sA", "SD of A (%)", "pct"), S("sB", "SD of B (%)", "pct"),
    S("rho", "correlation (e.g. 0.4)", "num"), S("cov", "or: covariance (e.g. 0.012)", "num"), S("rf", "rf risk-free (%)", "pct") }
  for k2 = 1, 4 do
    slots18[#slots18 + 1] = S("p" .. k2, "state " .. k2 .. ": probability (%)", "pct")
    slots18[#slots18 + 1] = S("A" .. k2, "state/period " .. k2 .. ": R of A (%)", "pct")
    slots18[#slots18 + 1] = S("B" .. k2, "state/period " .. k2 .. ": R of B (%)", "pct")
  end
  for k2 = 5, 6 do
    slots18[#slots18 + 1] = S("A" .. k2, "period " .. k2 .. ": R of A (%)", "pct")
    slots18[#slots18 + 1] = S("B" .. k2, "period " .. k2 .. ": R of B (%)", "pct")
  end
  for k2 = 1, 3 do
    slots18[#slots18 + 1] = S("n" .. k2, "holding " .. k2 .. ": shares", "num")
    slots18[#slots18 + 1] = S("px" .. k2, "holding " .. k2 .. ": price ($)", "money")
  end
  table.insert(TYPES, {
    name = "Two shares: portfolio risk", group = 6, solve = solvePort,
    desc = "portfolio return and SD, covariance and correlation (forecast or past data), risk-free mixes, weights",
    looks = "portfolio | weight | correlation | covariance | standard deviation of the portfolio | risk-free asset | invest $",
    slots = slots18,
    vis = function(Sm)
      local m = Sm.mode.opts[Sm.mode.idx]
      if m == MODES18[1] then return { "mode", "wA", "amtA", "amtB", "ERA", "ERB", "sA", "sB", "rho", "cov" } end
      if m == MODES18[2] then return { "mode", "p1", "A1", "B1", "p2", "A2", "B2", "p3", "A3", "B3", "p4", "A4", "B4", "wA" } end
      if m == MODES18[3] then return { "mode", "A1", "B1", "A2", "B2", "A3", "B3", "A4", "B4", "A5", "B5", "A6", "B6", "wA" } end
      if m == MODES18[4] then return { "mode", "wA", "ERA", "sA", "rf" } end
      return { "mode", "n1", "px1", "n2", "px2", "n3", "px3" }
    end,
    hints = {
      mode = "left/right: SDs known, forecast, past, risk-free, weights",
      wA = "share of your money in A, e.g. 65 (B gets the rest)",
      amtA = "or the dollars in A (and in B)",
      rho = "correlation between -1 and 1, e.g. 0.4",
      cov = "covariance as a decimal, e.g. 0.01205",
      sA = "standard deviation of A, e.g. 20.6",
      p1 = "chance of this state, e.g. 25",
      A1 = "A's return in this state or period, e.g. -2.2",
      rf = "the risk-free rate",
      n1 = "number of shares held (then the price)",
    },
    formula = { "E[R_p] = w_A*E[R_A] + w_B*E[R_B]", "Var_p = w_A^2*s_A^2 + w_B^2*s_B^2 + 2*w_A*w_B*Cov" },
    words = "the portfolio return is a weighted average; the portfolio risk is LESS than the average unless the shares move perfectly together",
    letters = { "wA, wB = weights (they add to 100%)", "E[R] = expected return", "sA, sB = standard deviations",
                "Cov = covariance = rho x sA x sB", "rho = correlation (-1 to +1)", "rf = risk-free rate" },
    acronyms = { "SD = standard deviation", "Cov = covariance", "rho = correlation coefficient" },
    notes = [[TWO SHARES: A PORTFOLIO

HOW TO USE
Pick what the question gives you.
Weights: a % for A, or the dollars in
A and B. Correlation OR covariance.
Forecast table: probability, A and B
for each state. Past data: pairs.

FORMULAS
$$E[R_p] = w_A*E[R_A] + w_B*E[R_B]
$$Var_p = w_A^2*s_A^2 + w_B^2*s_B^2 + 2*w_A*w_B*Cov
$$Cov = rho*s_A*s_B   rho = (Cov)/(s_A*s_B)
with the risk-free asset: SD_p = w*SD]],
    assume = STEPS_COMMON .. [[
THIS TYPE:
1. weights first (they add to 1)
2. covariance from rho, or from data
3. portfolio variance, then the root

TRAPS
- the portfolio SD is NOT the weighted
  average SD (unless rho = 1)
- past data: divide by n - 1
- with the risk-free asset only one
  term is left: SD = w x SD]],
    worked = [[## Portfolio SD
Q: $63,700 in A (SD 20.6%), $34,300 in
B (SD 17.2%), correlation 0.4.
ENTER: amtA 63700 | amtB 34300 |
sA 20.6 | sB 17.2 | rho 0.4
wA 65%; SD = 16.73%

## With the risk-free asset
Q: 55% in a share (SD 45%).
ENTER: mode risk-free | wA 55 | sA 45
SD = 0.55 x 45% = 24.75%

## Correlation from covariance
Q: Cov 0.01205, SDs 39.5% and 30.5%.
ENTER: sA 39.5 | sB 30.5 | cov 0.01205
rho = 0.01205/(0.395 x 0.305) = 0.1]],
  })

  ------------------------------------------------------------------
  -- 19 beta, CAPM, SML
  ------------------------------------------------------------------
  local MODES19 = { "CAPM: required return", "beta from covariance/correlation", "portfolio beta + return", "target return -> weights" }
  local function capm(rf, b, rm) return rf + b * (rm - rf) end
  local function solveCAPM(V, out)
    local mode = V.mode or MODES19[1]
    local rm = V.rm
    if not rm and V.mrp and V.rf then rm = V.rf + V.mrp end
    if mode == MODES19[2] then
      local cov = V.cov
      if not cov and V.rho and V.si and V.sm then
        cov = V.rho * V.si * V.sm
        out:row("Cov(i, M)", cov, "", "rho x SD_i x SD_M = " .. P(V.rho) .. " x " .. P(V.si) .. " x " .. P(V.sm), "cov")
      end
      local varm = V.varm or (V.sm and V.sm ^ 2)
      if not (cov and varm) then out:need("Cov(i, M) (or rho and both SDs) and the market's SD (or variance)"); return end
      local b = cov / varm
      out:row("beta", b, "", "Cov(i, M)/Var(M) = " .. P(cov) .. "/" .. P(varm), "beta")
      if V.rf and rm then out:row("required return (CAPM)", capm(V.rf, b, rm), "%", "rf + beta x (E[RM] - rf)", "req") end
      return
    end
    if mode == MODES19[3] then
      local ws, bs, tot = {}, {}, 0
      for k2 = 1, 3 do
        local w = V["w" .. k2] or V["amt" .. k2]
        if w and V["b" .. k2] then ws[#ws + 1] = w; bs[#bs + 1] = V["b" .. k2]; tot = tot + w end
      end
      if #ws == 0 then out:need("a weight (or $ amount) and a beta for each share"); return end
      local useAmt = V.amt1 or V.amt2 or V.amt3
      local bp = 0
      for k2 = 1, #ws do
        local w = useAmt and ws[k2] / tot or ws[k2]
        bp = bp + w * bs[k2]
        out:row("weight " .. k2, w, "%", useAmt and (P(ws[k2]) .. "/" .. P(tot)) or "given", "w" .. k2)
      end
      out:row("portfolio beta", bp, "", "sum w x beta", "bp")
      if V.rf and rm then out:row("portfolio E[R] (CAPM)", capm(V.rf, bp, rm), "%", "rf + beta_p x (E[RM] - rf)", "erp") end
      return
    end
    if mode == MODES19[4] then
      if not (V.rf and rm and V.target and V.bA and V.bB) then out:need("rf, E[RM] (or premium), the target return and both betas"); return end
      local bp = (V.target - V.rf) / (rm - V.rf)
      out:row("target beta", bp, "", "(target - rf)/(E[RM] - rf)", "bp")
      local w = (bp - V.bB) / (V.bA - V.bB)
      out:row("weight in A", w, "%", "(beta_p - beta_B)/(beta_A - beta_B) = (" .. P(bp) .. " - " .. P(V.bB) .. ")/(" .. P(V.bA) .. " - " .. P(V.bB) .. ")", "wA")
      out:row("weight in B", 1 - w, "%", "1 - wA", "wB")
      return
    end
    if not (V.rf and rm and V.beta) then out:need("rf, E[RM] (or the market risk premium) and beta"); return end
    local req = capm(V.rf, V.beta, rm)
    out:head("CAPM")
    out:row("market risk premium", rm - V.rf, "%", "E[RM] - rf", "mrp")
    out:row("required return E[Ri]", req, "%", "rf + beta x (E[RM] - rf) = " .. pct(V.rf) .. "% + " .. P(V.beta) .. " x " .. pct(rm - V.rf) .. "%", "req")
    if V.fc then
      out:head("ON THE SML?")
      out:row("alpha (forecast - required)", V.fc - req, "%", pct(V.fc) .. "% - " .. pct(req) .. "%", "alpha")
      if V.fc > req then out:add("ok", "ABOVE the SML: UNDERVALUED -> buy")
      elseif V.fc < req then out:add("bad", "BELOW the SML: OVERVALUED -> sell")
      else out:add("ok", "ON the SML: fairly priced") end
    end
  end
  table.insert(TYPES, {
    name = "Beta, CAPM, the SML", group = 6, solve = solveCAPM,
    desc = "required return with CAPM, over/undervalued, beta from covariance, portfolio beta, target return",
    looks = "beta | CAPM | risk-free rate | market return | market risk premium | SML | overvalued | undervalued",
    slots = {
      S("mode", "what to find", "choice", MODES19, 1),
      S("rf", "rf risk-free rate (%)", "pct"),
      S("rm", "E[RM] market return (%)", "pct"),
      S("mrp", "or: market risk premium (%)", "pct"),
      S("beta", "beta of the share", "num"),
      S("fc", "forecast return (%) (optional)", "pct"),
      S("cov", "Cov(i, M) e.g. 0.02", "num"),
      S("rho", "or: correlation with market", "num"),
      S("si", "SD of the share (%)", "pct"),
      S("sm", "SD of the market (%)", "pct"),
      S("varm", "or: variance of the market", "num"),
      S("w1", "share 1: weight (%)", "pct"), S("amt1", "or: $ in share 1", "money"), S("b1", "share 1: beta", "num"),
      S("w2", "share 2: weight (%)", "pct"), S("amt2", "or: $ in share 2", "money"), S("b2", "share 2: beta", "num"),
      S("w3", "share 3: weight (%)", "pct"), S("amt3", "or: $ in share 3", "money"), S("b3", "share 3: beta", "num"),
      S("target", "target portfolio return (%)", "pct"),
      S("bA", "beta of A", "num"), S("bB", "beta of B", "num"),
    },
    vis = function(Sm)
      local m = Sm.mode.opts[Sm.mode.idx]
      if m == MODES19[1] then return { "mode", "rf", "rm", "mrp", "beta", "fc" } end
      if m == MODES19[2] then return { "mode", "cov", "rho", "si", "sm", "varm", "rf", "rm", "mrp" } end
      if m == MODES19[3] then return { "mode", "w1", "amt1", "b1", "w2", "amt2", "b2", "w3", "amt3", "b3", "rf", "rm", "mrp" } end
      return { "mode", "rf", "rm", "mrp", "target", "bA", "bB" }
    end,
    hints = {
      mode = "left/right: CAPM, beta, portfolio beta, target",
      rf = "risk-free rate, e.g. 2 (inflation up 2% -> add 2)",
      rm = "expected return on the MARKET, e.g. 10",
      mrp = "'market risk premium 8%' = E[RM] - rf",
      beta = "the share's beta, e.g. 1.55",
      fc = "analysts' forecast: compare with the required return",
      cov = "covariance with the market, e.g. 0.02",
      sm = "the market's SD, e.g. 10",
      w1 = "weight as a %, OR type the $ amount below",
      target = "the portfolio return you want, e.g. 7.66",
    },
    formula = { "E[R_i] = r_f + beta_i*(E[R_M] - r_f)", "beta_i = (Cov(R_i, R_M))/(Var(R_M))   beta_p = sum w*beta" },
    words = "required return = risk-free rate + beta x the market risk premium; only market (systematic) risk earns a reward",
    letters = { "rf = risk-free rate", "E[RM] = expected market return", "E[RM] - rf = market risk premium",
                "beta = the share's market risk (market = 1)", "Cov(i, M) = covariance with the market",
                "alpha = forecast - required return" },
    acronyms = { "CAPM = capital asset pricing model", "SML = security market line", "MRP = market risk premium" },
    notes = [[BETA, CAPM, THE SML

HOW TO USE
CAPM: rf, the market return (or the
premium) and beta. Add a forecast to
test over/undervalued.
Beta: Cov with the market and the
market SD (or rho and both SDs).

FORMULAS
$$E[R_i] = r_f + beta_i*(E[R_M] - r_f)
$$beta_i = (Cov(R_i, R_M))/(s_M^2)
$$beta_p = w_1*beta_1 + w_2*beta_2 + ...
forecast ABOVE the required return:
above the SML, undervalued, BUY.]],
    assume = STEPS_COMMON .. [[
THIS TYPE:
1. market risk premium = E[RM] - rf
2. required = rf + beta x premium
3. compare with the forecast

IF THE QUESTION SAYS...
- "market risk premium is 8%" -> that
  is already E[RM] - rf
- "inflation expectations rise 2%" ->
  rf up 2%, the premium stays
- "portfolio beta" -> weighted average

TRAPS
- beta uses the MARKET's variance
- over/undervalued: compare forecast
  with the REQUIRED return]],
    worked = [[## CAPM
Q: beta 1.65, rf 2%, market 11%.
ENTER: rf 2 | rm 11 | beta 1.65
E[R] = 2% + 1.65 x 9% = 16.85%

## Over or under?
Q: beta 1.55, forecast 13.4%, rf 2%,
market 10%.
ENTER: ... | fc 13.4
required 14.4% > 13.4%: overvalued

## Beta from covariance
Q: Cov 0.02, market SD 10%.
ENTER: mode beta | cov 0.02 | sm 10
beta = 0.02/0.01 = 2]],
  })
end
