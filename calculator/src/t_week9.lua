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
    if ER and SD and ER ~= 0 then out:row("CV (risk per unit of return)", SD / ER, "", "SD/E[R] = " .. P(SD) .. "/" .. P(ER), "cv"); out:uses("cv") end
    if ER and SD and rf and SD > 0 then out:row("Sharpe ratio", (ER - rf) / SD, "", "(E[R] - rf)/SD = (" .. P(ER) .. " - " .. P(rf) .. ")/" .. P(SD), "sharpe"); out:uses("sharpe") end
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
      out:uses("ret"); out:off("yields")
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
      out:off("hpr"); out:off("annret"); out:uses("mean")
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
      out:uses("er", "varp"); out:off("sd")
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
      out:uses("mean", "vars"); out:off("sd")
      riskTail(out, m, sqrt(var), V.rf)
      do
        -- textbook (not on the sheet): returns are about normal, so 95% of years fall within 2 SDs of the average;
        -- the average itself is an estimate, with standard error SD/sqrt(n)
        local sd, se = sqrt(var), sqrt(var) / sqrt(#rs)
        out:head("RANGES (textbook, not on the sheet)")
        out:row("95% of yearly returns: from", m - 2 * sd, "%", "avg - 2 x SD = " .. pct(m) .. "% - 2 x " .. pct(sd) .. "%", "lo95")
        out:row("95% of yearly returns: to", m + 2 * sd, "%", "avg + 2 x SD", "hi95")
        out:row("standard error of the average", se, "%", "SD/sqrt(n) = " .. pct(sd) .. "%/sqrt(" .. #rs .. ")", "se")
        out:row("95% confidence interval for E[R]: from", m - 2 * se, "%", "avg - 2 x SE", "ciLo")
        out:row("95% confidence interval for E[R]: to", m + 2 * se, "%", "avg + 2 x SE", "ciHi")
        out:off("range95"); out:off("sterr")
      end
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
$$CV = SD/E[R]   Sharpe = (E[R] - r_f)/SD

TEXTBOOK (NOT ON THE SHEET)
95% of years: avg - 2 x SD up to
avg + 2 x SD
SE = SD/sqrt(n): 95% interval for
E[R] is avg - 2 x SE to avg + 2 x SE]],
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
avg 8.75%; SD = 23.51%
95% of years: -38.28% to 55.78%]],
  })

  ------------------------------------------------------------------
  -- 18 two shares: a portfolio
  ------------------------------------------------------------------
  local MODES18 = { "SDs + correlation known", "forecast table (states)", "past returns (a sample)",
                    "one share + the risk-free asset", "weights from holdings", "two shares + the risk-free asset",
                    "equal weights: n shares" }
  -- wB defaults to 1 - wA; a risk-free part wF = 1 - wA - wB adds rf to E[Rp] but no risk and no covariance
  local function port(out, wA, ERA, ERB, sA, sB, cov, wB, rf)
    wB = wB or (1 - wA)
    local wF = 1 - wA - wB
    local hasF = math.abs(wF) > 1e-9
    out:head("PORTFOLIO (wA " .. pct(wA) .. "%, wB " .. pct(wB) .. "%" .. (hasF and (", risk-free " .. pct(wF) .. "%") or "") .. ")")
    local ERp, sdp
    if ERA and ERB then
      if hasF then
        if rf then
          ERp = wA * ERA + wB * ERB + wF * rf
          out:row("E[Rp]", ERp, "%", "wA x E[RA] + wB x E[RB] + wF x rf = " .. P(wA) .. " x " .. P(ERA) .. " + " .. P(wB) .. " x " ..
                  P(ERB) .. " + " .. P(wF) .. " x " .. P(rf), "ERp")
          out:uses("erp")
        else
          out:need("rf: the return on the risk-free part (" .. pct(wF) .. "% of the money)")
        end
      else
        ERp = wA * ERA + wB * ERB
        out:row("E[Rp]", ERp, "%", "wA x E[RA] + wB x E[RB]", "ERp")
        out:uses("erp")
      end
    end
    if sA and sB and cov then
      local var = wA ^ 2 * sA ^ 2 + wB ^ 2 * sB ^ 2 + 2 * wA * wB * cov
      out:row("portfolio variance", var, "", "wA^2 sA^2 + wB^2 sB^2 + 2 wA wB Cov = " .. P(wA ^ 2) .. " x " .. P(sA ^ 2) .. " + " ..
              P(wB ^ 2) .. " x " .. P(sB ^ 2) .. " + 2 x " .. P(wA) .. " x " .. P(wB) .. " x " .. P(cov), "varp")
      sdp = sqrt(var)
      out:row("portfolio SD", sdp, "%", "square root of the variance", "sdp")
      out:uses("varpf"); out:off("sd")
      if hasF then out:note("the risk-free part has no risk and no covariance: it adds nothing to the variance")
      else out:note("SD of the portfolio is below the weighted average unless the correlation is +1") end
    end
    if ERp and sdp and rf and sdp > 0 then
      out:row("Sharpe ratio of the portfolio", (ERp - rf) / sdp, "", "(E[Rp] - rf)/SDp = (" .. P(ERp) .. " - " .. P(rf) .. ")/" .. P(sdp), "shp")
      out:uses("sharpe")
    end
  end
  -- the question may GIVE the correlation (often the data's own one, rounded): then the portfolio uses the given one
  local function givenCov(out, V, sA, sB, cov)
    if not V.rho then return cov end
    local c = V.rho * sA * sB
    out:note("the question gives the correlation " .. P(V.rho) .. ": the portfolio uses it (the data's own is " .. P(cov / (sA * sB)) .. ")")
    out:row("covariance used", c, "", "rho x sA x sB = " .. P(V.rho) .. " x " .. P(sA) .. " x " .. P(sB), "covU")
    out:off("covrho")
    return c
  end
  local function solvePort(V, out)
    local mode = V.mode or MODES18[1]
    local wA, wB = V.wA, V.wB
    if not wA and V.amtA and V.amtB then
      local tot = V.amtT or (V.amtA + V.amtB + (V.amtF or 0))
      wA = V.amtA / tot
      if math.abs(tot - V.amtA - V.amtB) < 1e-9 then
        out:row("wA (from the amounts)", wA, "%", "A/(A + B) = " .. P(V.amtA) .. "/" .. P(V.amtA + V.amtB), "wA")
      else
        -- v23: part of the money is in the risk-free asset
        wB = V.amtB / tot
        out:row("wA (from the amounts)", wA, "%", "$ in A/total = " .. P(V.amtA) .. "/" .. P(tot), "wA")
        out:row("wB (from the amounts)", wB, "%", "$ in B/total = " .. P(V.amtB) .. "/" .. P(tot), "wB")
        out:row("w risk-free", 1 - wA - wB, "%", "1 - wA - wB = the rest of the " .. P(tot) ..
                (V.amtT and "" or (" (" .. P(V.amtF) .. " in the risk-free asset)")), "wF")
      end
      out:off("weights")
    elseif wA and wB then
      out:row("w risk-free", 1 - wA - wB, "%", "1 - wA - wB = 1 - " .. P(wA) .. " - " .. P(wB), "wF")
    end
    if mode == MODES18[7] then
      -- n shares, equal weights 1/n, each with the same SD and the same correlation (or covariance) with each other
      local n = V.nN
      local var1 = V.vA or (V.sA and V.sA ^ 2)
      local cov = V.cov or (V.rho and var1 and V.rho * var1)
      if not (n and n >= 1 and var1 and cov) then out:need("n (shares), each share's SD (or variance) and the correlation (or covariance)"); return end
      if V.rho and not V.cov then out:row("covariance", cov, "", "rho x SD x SD = " .. P(V.rho) .. " x " .. P(sqrt(var1)) .. "^2", "cov"); out:off("covrho") end
      local varp = var1 / n + (1 - 1 / n) * cov
      out:head("EQUAL WEIGHTS: " .. P(n) .. " SHARES")
      out:row("portfolio variance", varp, "", "(1/n) x Var + (1 - 1/n) x Cov = " .. P(var1) .. "/" .. P(n) .. " + " .. P(1 - 1 / n) .. " x " .. P(cov), "varp")
      out:row("portfolio SD", sqrt(varp), "%", "square root of the variance", "sdp")
      if cov >= 0 then out:row("SD with very many shares", sqrt(cov), "%", "sqrt(Cov): the risk that never goes away (systematic)", "sdinf") end
      out:off("ewport"); out:off("sd")
      out:note("more shares -> the Var/n part (unsystematic) shrinks; the Cov part (systematic) stays")
      return
    end
    if mode == MODES18[1] or mode == MODES18[6] then
      -- SDs, or variances (a variance-covariance matrix: Var on the diagonal, Cov off it)
      local sA, sB = V.sA, V.sB
      if not sA and V.vA then sA = sqrt(V.vA); out:row("SD of A", sA, "%", "sqrt(VarA) = sqrt(" .. P(V.vA) .. ")", "sA"); out:off("sd") end
      if not sB and V.vB then sB = sqrt(V.vB); out:row("SD of B", sB, "%", "sqrt(VarB) = sqrt(" .. P(V.vB) .. ")", "sB"); out:off("sd") end
      local cov, rho = V.cov, V.rho
      if cov == nil and rho and sA and sB then
        cov = rho * sA * sB
        out:row("covariance", cov, "", "rho x sA x sB = " .. P(rho) .. " x " .. P(sA) .. " x " .. P(sB), "cov")
        out:off("covrho")
      elseif cov and not rho and sA and sB then
        out:row("correlation", cov / (sA * sB), "", "Cov/(sA x sB) = " .. P(cov) .. "/(" .. P(sA) .. " x " .. P(sB) .. ")", "rho")
        out:uses("corr")
      end
      if not wA then out:need("the weight of A (or the amounts: $ in A, $ in B" .. ((mode == MODES18[6]) and ", and the total or the $ in the risk-free asset)" or ")")); return end
      if (V.vA or V.vB or V.cov) and sA and sB and cov then out:off("varcov") end
      port(out, wA, V.ERA, V.ERB, sA, sB, cov, wB, V.rf)
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
      out:uses("er", "varp", "covp", "corr"); out:off("sd")
      if wA then port(out, wA, EA, EB, sqrt(vA), sqrt(vB), givenCov(out, V, sqrt(vA), sqrt(vB), cv)) end
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
      out:uses("mean", "vars", "covs", "corr"); out:off("sd")
      if wA then port(out, wA, mA, mB, sqrt(sa / n1), sqrt(sb / n1), givenCov(out, V, sqrt(sa / n1), sqrt(sb / n1), sc / n1)) end
      return
    end
    if mode == MODES18[4] then
      local w = wA
      if not (w and V.sA) then out:need("the weight in the share and its SD"); return end
      out:head("SHARE + RISK-FREE ASSET")
      if V.ERA and V.rf then out:row("E[Rp]", w * V.ERA + (1 - w) * V.rf, "%", "w x E[R] + (1 - w) x rf", "ERp"); out:uses("erp") end
      out:row("portfolio SD", w * V.sA, "%", "w x SD (the risk-free asset has no risk) = " .. P(w) .. " x " .. P(V.sA), "sdp")
      out:off("sdrf")
      if V.ERA and V.rf then out:row("Sharpe ratio", (V.ERA - V.rf) / V.sA, "", "(E[R] - rf)/SD: the same for any mix", "sh"); out:uses("sharpe") end
      return
    end
    local vals, tot = {}, 0
    for k2 = 1, 5 do
      local n, pr = V["n" .. k2], V["px" .. k2]
      if n and pr then vals[k2] = n * pr; tot = tot + n * pr end
    end
    if tot == 0 then out:need("shares and price for each holding"); return end
    out:row("total value", tot, "$", "sum of shares x price", "tot")
    out:off("weights")
    for k2 = 1, 5 do if vals[k2] then out:row("weight " .. k2, vals[k2] / tot, "%", P(vals[k2]) .. "/" .. P(tot), "w" .. k2) end end
  end
  local slots18 = { S("mode", "what you have", "choice", MODES18, 1),
    S("wA", "wA weight in A (%)", "pct"), S("amtA", "or: $ in A", "money"), S("amtB", "and $ in B", "money"),
    S("ERA", "E[RA] (%)", "pct"), S("ERB", "E[RB] (%)", "pct"), S("sA", "SD of A (%)", "pct"), S("sB", "SD of B (%)", "pct"),
    S("rho", "correlation (e.g. 0.4)", "num"), S("cov", "or: covariance (e.g. 0.012)", "num"), S("rf", "rf risk-free (%)", "pct"),
    S("wB", "wB weight in B (%)", "pct"), S("amtT", "total $ (with risk-free)", "money"), S("amtF", "or: $ in the risk-free", "money"),
    S("vA", "or: variance of A (0.04)", "num"), S("vB", "or: variance of B", "num"),
    S("nN", "n shares (equal weights)", "num") }
  for k2 = 1, 4 do
    slots18[#slots18 + 1] = S("p" .. k2, "state " .. k2 .. ": probability (%)", "pct")
    slots18[#slots18 + 1] = S("A" .. k2, "state/period " .. k2 .. ": R of A (%)", "pct")
    slots18[#slots18 + 1] = S("B" .. k2, "state/period " .. k2 .. ": R of B (%)", "pct")
  end
  for k2 = 5, 6 do
    slots18[#slots18 + 1] = S("A" .. k2, "period " .. k2 .. ": R of A (%)", "pct")
    slots18[#slots18 + 1] = S("B" .. k2, "period " .. k2 .. ": R of B (%)", "pct")
  end
  for k2 = 1, 5 do
    slots18[#slots18 + 1] = S("n" .. k2, "holding " .. k2 .. ": shares", "num")
    slots18[#slots18 + 1] = S("px" .. k2, "holding " .. k2 .. ": price ($)", "money")
  end
  table.insert(TYPES, {
    name = "Two shares: portfolio risk", group = 6, solve = solvePort,
    desc = "portfolio return and SD, covariance and correlation (forecast or past data), risk-free mixes (one or two shares), weights",
    looks = "portfolio | weight | correlation | covariance | standard deviation of the portfolio | risk-free asset | invest $ | variance-covariance matrix | covariance matrix | variance | total budget | treasury bills",
    slots = slots18,
    vis = function(Sm)
      local m = Sm.mode.opts[Sm.mode.idx]
      if m == MODES18[1] then return { "mode", "wA", "amtA", "amtB", "ERA", "ERB", "sA", "vA", "sB", "vB", "rho", "cov" } end
      if m == MODES18[6] then return { "mode", "amtA", "amtB", "amtT", "amtF", "wA", "wB", "ERA", "ERB", "rf", "sA", "vA", "sB", "vB", "cov", "rho" } end
      if m == MODES18[2] then return { "mode", "p1", "A1", "B1", "p2", "A2", "B2", "p3", "A3", "B3", "p4", "A4", "B4", "wA", "rho" } end
      if m == MODES18[3] then return { "mode", "A1", "B1", "A2", "B2", "A3", "B3", "A4", "B4", "A5", "B5", "A6", "B6", "wA", "rho" } end
      if m == MODES18[4] then return { "mode", "wA", "ERA", "sA", "rf" } end
      if m == MODES18[7] then return { "mode", "nN", "sA", "vA", "rho", "cov" } end
      return { "mode", "n1", "px1", "n2", "px2", "n3", "px3", "n4", "px4", "n5", "px5" }
    end,
    hints = {
      mode = "left/right: SDs known, forecast, past, risk-free, weights, equal weights",
      nN = "how many shares, each with the same weight 1/n, e.g. 20",
      wA = "share of your money in A, e.g. 65 (B gets the rest)",
      amtA = "or the dollars in A (and in B)",
      rho = "correlation, e.g. 0.4; if the question GIVES one, type it",
      cov = "covariance as a decimal, e.g. 0.01205 (off the diagonal of a matrix)",
      wB = "B's share of ALL the money, e.g. 50 (the rest is risk-free)",
      amtT = "the total $ you invest, risk-free part included",
      amtF = "or: the $ put in the risk-free asset",
      vA = "Var of A as a decimal, e.g. 0.04 (a matrix diagonal)",
      vB = "Var of B as a decimal (the other diagonal)",
      sA = "SD of A, e.g. 20.6 (equal weights: each share's SD)",
      p1 = "chance of this state, e.g. 25",
      A1 = "A's return in this state or period, e.g. -2.2",
      rf = "the risk-free rate",
      n1 = "number of shares held (then the price)",
    },
    formula = { "E[R_p] = w_A*E[R_A] + w_B*E[R_B]", "Var_p = w_A^2*s_A^2 + w_B^2*s_B^2 + 2*w_A*w_B*Cov" },
    words = "the portfolio return is a weighted average; the portfolio risk is LESS than the average unless the shares move perfectly together",
    letters = { "wA, wB = weights (they add to 100%)", "E[R] = expected return", "sA, sB = standard deviations",
                "Cov = covariance = rho x sA x sB", "rho = correlation (-1 to +1)", "rf = risk-free rate" },
    acronyms = { "SD = standard deviation", "Cov = covariance", "rho = correlation coefficient",
                 "Var = variance = SD^2; a variance-covariance matrix has Var on the diagonal and Cov off it" },
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
with the risk-free asset: SD_p = w*SD
two shares + risk-free: wF = 1 - wA - wB
E[Rp] = wA*E[RA] + wB*E[RB] + wF*rf
Var(p) = wA^2*VarA + wB^2*VarB +
2*wA*wB*Cov (rf adds no risk)
a variance-covariance matrix: Var on
the diagonal, Cov off it.

equal weights, n shares (textbook):
$$Var_p = (1/n)*Var + (1 - 1/n)*Cov
more shares: only the Cov part stays

HOW THEY LINK
SD -> square it -> Var
SDs + rho -> Cov = rho x SDA x SDB
Cov -> rho = Cov/(SDA x SDB)
weights, Var, Cov -> Var(p) -> SD(p)
E[Rp] and SD(p) -> Sharpe ratio]],
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
  term is left: SD = w x SD

IF THE QUESTION SAYS...
- "variance-covariance matrix" -> Var
  on the diagonal, Cov off it
- "the rest in T-bills" -> two shares +
  the risk-free asset: wF = 1 - wA - wB]],
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
rho = 0.01205/(0.395 x 0.305) = 0.1

## Two shares + the risk-free asset
Q: $100,000: $30,000 in A, $50,000 in
B, the rest in T-bills (4%). E[R] 10%
and 14%; Var 0.04 and 0.09; Cov 0.012.
ENTER: mode two shares + risk-free |
amtA 30000 | amtB 50000 | amtT 100000 |
ERA 10 | ERB 14 | rf 4 | vA 0.04 |
vB 0.09 | cov 0.012
wA 30%, wB 50%, wF 20%
E[Rp] = 3% + 7% + 0.8% = 10.8%
Var = 0.09 x 0.04 + 0.25 x 0.09 +
2 x 0.3 x 0.5 x 0.012 = 0.0297
SD = 17.23%

## Equal weights, n shares
Q: 25 shares, 1/25 each, each SD 40%,
correlation 0.3 between any two.
ENTER: mode equal weights | nN 25 |
sA 40 | rho 0.3
Cov = 0.3 x 0.16 = 0.048
Var = 0.16/25 + 0.96 x 0.048
    = 0.05248; SD = 22.91%
many shares: sqrt(0.048) = 21.91%]],
  })

  ------------------------------------------------------------------
  -- 19 beta, CAPM, SML
  ------------------------------------------------------------------
  -- one mode per kind of question (the list opens first: "what do they ask for?")
  local MODES19 = { "required return (beta given)", "find beta (prices or forecast)", "buy or sell? (over/undervalued)",
                    "find rf or the market premium", "beta from covariance/correlation", "portfolio beta + return",
                    "target return -> weights", "two shares on the SML -> rf, premium" }
  local function capm(rf, b, rm) return rf + b * (rm - rf) end
  local function solveCAPM(V, out)
    local mode = V.mode or MODES19[1]
    local rm = V.rm
    if not rm and V.mrp and V.rf then rm = V.rf + V.mrp end
    if mode == MODES19[5] then
      local cov = V.cov
      if not cov and V.rho and V.si and V.sm then
        cov = V.rho * V.si * V.sm
        out:row("Cov(i, M)", cov, "", "rho x SD_i x SD_M = " .. P(V.rho) .. " x " .. P(V.si) .. " x " .. P(V.sm), "cov")
        out:off("covrho")
      end
      local varm = V.varm or (V.sm and V.sm ^ 2)
      if not (cov and varm) then out:need("Cov(i, M) (or rho and both SDs) and the market's SD (or variance)"); return end
      local b = cov / varm
      out:row("beta", b, "", "Cov(i, M)/Var(M) = " .. P(cov) .. "/" .. P(varm), "beta")
      out:uses("beta")
      if V.rf and rm then out:row("required return (CAPM)", capm(V.rf, b, rm), "%", "rf + beta x (E[RM] - rf) = " .. pct(V.rf) .. "% + " .. P(b) .. " x " .. pct(rm - V.rf) .. "%", "req"); out:uses("capm") end
      return
    end
    if mode == MODES19[6] then
      local ws, bs, ks, tot = {}, {}, {}, 0
      for k2 = 1, 3 do
        local w = V["w" .. k2] or V["amt" .. k2]
        if w and V["b" .. k2] then ws[#ws + 1] = w; bs[#bs + 1] = V["b" .. k2]; ks[#ks + 1] = k2; tot = tot + w end
      end
      if #ws == 0 then out:need("a weight (or $ amount) and a beta for each share"); return end
      local useAmt = V.amt1 or V.amt2 or V.amt3
      local cap = V.rf and rm
      if cap then
        out:head("EACH SHARE (CAPM)")
        for k2 = 1, #ws do
          out:row("share " .. ks[k2] .. ": expected return", capm(V.rf, bs[k2], rm), "%",
                  "rf + beta x (E[RM] - rf) = " .. pct(V.rf) .. "% + " .. P(bs[k2]) .. " x " .. pct(rm - V.rf) .. "%", "er" .. ks[k2])
        end
        out:uses("capm")
      end
      out:head("PORTFOLIO")
      local bp, wsum, erw, parts = 0, 0, 0, {}
      for k2 = 1, #ws do
        local w = useAmt and ws[k2] / tot or ws[k2]
        bp = bp + w * bs[k2]; wsum = wsum + w
        if cap then erw = erw + w * capm(V.rf, bs[k2], rm) end
        parts[#parts + 1] = P(w) .. " x " .. P(bs[k2])
        out:row("weight " .. ks[k2], w, "%", useAmt and (P(ws[k2]) .. "/" .. P(tot)) or "given", "w" .. ks[k2])
      end
      out:row("portfolio beta", bp, "", "w1 x beta1 + w2 x beta2 ... = " .. table.concat(parts, " + "), "bp")
      out:uses("betap")
      if useAmt then out:off("weights") end
      if math.abs(wsum - 1) > 1e-9 then
        out:note("the weights add to " .. pct(wsum) .. "%: the other " .. pct(1 - wsum) .. "% is in the risk-free asset (beta 0)")
        if cap then erw = erw + (1 - wsum) * V.rf end
      end
      if cap then
        out:row("portfolio expected return", capm(V.rf, bp, rm), "%",
                "rf + beta_p x (E[RM] - rf) = " .. pct(V.rf) .. "% + " .. P(bp) .. " x " .. pct(rm - V.rf) .. "%", "erp")
        out:note("check: w1 x E[R1] + w2 x E[R2] ... = " .. pct(erw) .. "% (the same)")
        out:uses("erp")
        out:row("step: market risk premium", rm - V.rf, "%", "E[RM] - rf (a step, not an answer)", "mrp")
      end
      return
    end
    if mode == MODES19[7] then
      if not (V.rf and rm and V.target) then out:need("rf, E[RM] (or premium) and the target return (then both betas)"); return end
      local bp = (V.target - V.rf) / (rm - V.rf)
      out:row("target beta", bp, "", "(target - rf)/(E[RM] - rf) = (" .. pct(V.target) .. "% - " .. pct(V.rf) .. "%)/" .. pct(rm - V.rf) .. "%", "bp")
      if not (V.bA and V.bB) then out:off("betaT"); out:need("both betas, for the weights"); return end
      local w = (bp - V.bB) / (V.bA - V.bB)
      out:row("weight in A", w, "%", "(beta_p - beta_B)/(beta_A - beta_B) = (" .. P(bp) .. " - " .. P(V.bB) .. ")/(" .. P(V.bA) .. " - " .. P(V.bB) .. ")", "wA")
      out:row("weight in B", 1 - w, "%", "1 - wA", "wB")
      out:off("betaT"); out:off("wtarget")
      return
    end
    if mode == MODES19[8] then
      if not (V.erA and V.bA and V.erB and V.bB) then out:need("both shares' expected returns and betas"); return end
      if math.abs(V.bA - V.bB) < 1e-12 then out:need("two DIFFERENT betas"); return end
      local mrp = (V.erA - V.erB) / (V.bA - V.bB)
      local rf0 = V.erA - V.bA * mrp
      out:head("THE SML THROUGH BOTH SHARES")
      out:row("market risk premium (the slope)", mrp, "%", "(E[RA] - E[RB])/(betaA - betaB) = (" .. pct(V.erA) .. "% - " .. pct(V.erB) .. "%)/(" ..
              P(V.bA) .. " - " .. P(V.bB) .. ")", "mrp")
      out:row("risk-free rate (beta 0)", rf0, "%", "E[RA] - betaA x premium = " .. pct(V.erA) .. "% - " .. P(V.bA) .. " x " .. pct(mrp) .. "%", "rf")
      out:row("market return E[RM] (beta 1)", rf0 + mrp, "%", "rf + premium", "rm")
      out:uses("capm"); out:off("sml2")
      return
    end
    -- modes 1-4: the CAPM line. The forecast return is typed, or comes from the prices
    local fc = V.fc
    if V.P0 and V.P1 then
      -- the forecast return from the prices: R = (Div + P1 - P0)/P0
      fc = ((V.div or 0) + V.P1 - V.P0) / V.P0
      out:head("STEP 1: FORECAST RETURN (FROM THE PRICES)")
      out:row("forecast return", fc, "%", "(Div + P1 - P0)/P0 = (" .. P(V.div or 0) .. " + " .. P(V.P1) .. " - " .. P(V.P0) .. ")/" .. P(V.P0), "fcR")
      out:uses("ret")
    end
    if mode == MODES19[2] then
      -- "what beta would it need?": CAPM solved for beta
      if not fc then out:need("the prices (P0, P1 and the dividend) or the forecast return"); return end
      if not (V.rf and rm) then out:need("rf and E[RM] (or the market risk premium)"); return end
      out:head((V.P0 and V.P1) and "STEP 2: CAPM SOLVED FOR BETA" or "CAPM SOLVED FOR BETA")
      out:row("ANSWER: beta", (fc - V.rf) / (rm - V.rf), "", "(E[Ri] - rf)/(E[RM] - rf) = (" .. pct(fc) .. "% - " .. pct(V.rf) .. "%)/" .. pct(rm - V.rf) .. "%", "beta")
      out:row("market risk premium", rm - V.rf, "%", "E[RM] - rf (a step)", "mrp")
      out:uses("capm"); out:off("capmb")
      out:note("with this beta the forecast is ON the SML: CAPM agrees with it")
      return
    end
    if mode == MODES19[4] then
      -- beta and a forecast are given: the market line is solved for rf or for the premium
      if not (V.beta and fc) then out:need("beta and the forecast return (or the prices)"); return end
      if V.rf and not rm then
        local mrp = (fc - V.rf) / V.beta
        out:head("CAPM SOLVED FOR THE PREMIUM")
        out:row("ANSWER: market risk premium", mrp, "%", "(E[Ri] - rf)/beta = (" .. pct(fc) .. "% - " .. pct(V.rf) .. "%)/" .. P(V.beta), "mrp")
        out:row("market return E[RM]", V.rf + mrp, "%", "rf + premium = " .. pct(V.rf) .. "% + " .. pct(mrp) .. "%", "rm")
        out:uses("capm"); out:off("capmm")
        return
      end
      if not V.rf and (V.mrp or V.rm) then
        local rf0
        if V.mrp then
          rf0 = fc - V.beta * V.mrp
          out:head("CAPM SOLVED FOR rf")
          out:row("ANSWER: risk-free rate", rf0, "%", "E[Ri] - beta x premium = " .. pct(fc) .. "% - " .. P(V.beta) .. " x " .. pct(V.mrp) .. "%", "rf")
        else
          if math.abs(V.beta - 1) < 1e-12 then out:need("the premium: with beta 1 the share earns E[RM] whatever rf is"); return end
          rf0 = (fc - V.beta * V.rm) / (1 - V.beta)
          out:head("CAPM SOLVED FOR rf")
          out:row("ANSWER: risk-free rate", rf0, "%", "(E[Ri] - beta x E[RM])/(1 - beta) = (" .. pct(fc) .. "% - " .. P(V.beta) .. " x " .. pct(V.rm) .. "%)/(1 - " ..
                  P(V.beta) .. ")", "rf")
          out:row("market risk premium", V.rm - rf0, "%", "E[RM] - rf", "mrp")
        end
        out:uses("capm"); out:off("capmrf")
        return
      end
      if V.rf and rm then out:need("ONE blank: leave rf blank, or leave both E[RM] and the premium blank"); return end
      out:need("rf, or E[RM] (or the premium): the one you know")
      return
    end
    -- modes 1 and 3: the required return
    if not (V.rf and rm and V.beta) then out:need("rf, E[RM] (or the market risk premium) and beta"); return end
    local req = capm(V.rf, V.beta, rm)
    out:head("CAPM")
    -- the answer first; the market risk premium is only a step (it is NOT the share's expected return)
    out:row("ANSWER: expected return E[Ri]", req, "%", "rf + beta x (E[RM] - rf) = " .. pct(V.rf) .. "% + " .. P(V.beta) .. " x " .. pct(rm - V.rf) .. "%", "req")
    out:row("step: market risk premium", rm - V.rf, "%", "E[RM] - rf (a step, not the answer)", "mrp")
    out:note("the market's SD is not needed for CAPM: only beta measures the share's risk here")
    out:uses("capm")
    if not fc and mode == MODES19[3] then out:need("the forecast return (or the prices) to compare with") end
    if fc then
      out:off("alpha")
      out:head("ON THE SML?")
      out:row("alpha (forecast - required)", fc - req, "%", pct(fc) .. "% - " .. pct(req) .. "%", "alpha")
      if fc > req + 1e-12 then out:add("ok", "ABOVE the SML: UNDERVALUED -> buy")
      elseif fc < req - 1e-12 then out:add("bad", "BELOW the SML: OVERVALUED -> sell")
      else out:add("ok", "ON the SML: fairly priced") end
    end
  end
  table.insert(TYPES, {
    name = "Beta, CAPM, the SML", group = 6, solve = solveCAPM,
    desc = "CAPM required return, or beta / rf / premium from a forecast or prices, over/undervalued, beta from covariance, portfolio beta, target return, rf from two shares",
    looks = "beta | CAPM | risk-free rate | market return | market risk premium | SML | overvalued | undervalued | what beta would it need | consistent with the CAPM",
    slots = {
      S("mode", "what to find", "choice", MODES19, 1),
      S("rf", "rf risk-free rate (%)", "pct"),
      S("rm", "E[RM] market return (%)", "pct"),
      S("mrp", "or: market risk premium (%)", "pct"),
      S("beta", "beta of the share", "num"),
      S("fc", "forecast return (%)", "pct"),
      S("P0", "or: price now P0 ($)", "money"), S("P1", "price in a year P1 ($)", "money"), S("div", "dividend in the year ($)", "money"),
      S("erA", "E[RA] expected return of A (%)", "pct"), S("erB", "E[RB] expected return of B (%)", "pct"),
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
      if m == MODES19[1] then return { "mode", "rf", "rm", "mrp", "beta" } end
      if m == MODES19[2] then return { "mode", "rf", "rm", "mrp", "fc", "P0", "P1", "div" } end
      if m == MODES19[3] or m == MODES19[4] then return { "mode", "rf", "rm", "mrp", "beta", "fc", "P0", "P1", "div" } end
      if m == MODES19[5] then return { "mode", "cov", "rho", "si", "sm", "varm", "rf", "rm", "mrp" } end
      if m == MODES19[6] then return { "mode", "w1", "amt1", "b1", "w2", "amt2", "b2", "w3", "amt3", "b3", "rf", "rm", "mrp" } end
      if m == MODES19[8] then return { "mode", "erA", "bA", "erB", "bB" } end
      return { "mode", "rf", "rm", "mrp", "target", "bA", "bB" }
    end,
    hints = {
      mode = "left/right changes the kind; ESC: back to the list",
      rf = "risk-free rate, e.g. 2 (inflation up 2% -> add 2)",
      rm = "expected return on the MARKET, e.g. 10",
      mrp = "'market risk premium 8%' = E[RM] - rf",
      beta = "the share's beta, e.g. 1.55",
      fc = "the return you forecast, e.g. 13.4 (or the prices)",
      P0 = "price today: the forecast return comes from the prices",
      P1 = "the price you expect in a year",
      div = "the dividend paid in the year (blank = none)",
      erA = "share A's expected return, e.g. 14 (then its beta)",
      cov = "covariance with the market, e.g. 0.02",
      sm = "the market's SD, e.g. 10",
      w1 = "weight as a %, OR type the $ amount below",
      target = "the portfolio return you want, e.g. 7.66",
    },
    formula = { "E[R_i] = r_f + beta_i*(E[R_M] - r_f)", "beta_i = (Cov(R_i, R_M))/(Var(R_M))   beta_p = sum w*beta" },
    -- one line per kind, under the list that opens first
    modeHelp = { "beta is given: E[Ri] = rf + beta x (E[RM] - rf)",
                 "'what beta would it need?': from the prices or a forecast",
                 "a forecast (or prices) against the CAPM return: alpha",
                 "beta and a forecast are given: find rf or the premium",
                 "beta = Cov(i, M)/Var(M), or rho x SD of share/SD of market",
                 "each share's E[R], then the portfolio beta and E[Rp]",
                 "the weights that give a target return",
                 "two shares' E[R] and betas: rf and the premium (the SML)" },
    words = "required return = risk-free rate + beta x the market risk premium; only market (systematic) risk earns a reward",
    letters = { "rf = risk-free rate", "E[RM] = expected market return", "E[RM] - rf = market risk premium",
                "beta = the share's market risk (market = 1)", "Cov(i, M) = covariance with the market",
                "alpha = forecast - required return" },
    acronyms = { "CAPM = capital asset pricing model", "SML = security market line", "MRP = market risk premium" },
    notes = [[BETA, CAPM, THE SML

HOW TO USE
Pick what they ask for from the list
(6, 3, then the number):
1 required return: beta is given
2 find beta: "what beta would it
  need?" - from prices or a forecast
3 buy or sell: a forecast (or prices)
  against the CAPM return
4 find rf or the market premium
5 beta from Cov or the correlation
6 portfolio: each share, beta, E[Rp]
7 target return -> weights
8 rf and premium from two shares

FORMULAS
$$E[R_i] = r_f + beta_i*(E[R_M] - r_f)
$$beta_i = (Cov(R_i, R_M))/(s_M^2)
$$beta_p = w_1*beta_1 + w_2*beta_2 + ...
solved for beta (not on the sheet):
$$beta_i = (E[R_i] - r_f)/(E[R_M] - r_f)
a forecast from prices:
$$R = (Div + P_1 - P_0)/(P_0)
forecast ABOVE the required return:
above the SML, undervalued, BUY.

PORTFOLIO OF SHARES
1. each: E[Ri] = rf + beta x MRP
2. beta_p = w1 x beta1 + w2 x beta2
3. E[Rp] = rf + beta_p x MRP
   (= w1 x E[R1] + w2 x E[R2])

HOW THEY LINK
beta = Cov(i,M)/Var(M)
     = rho x SD_i/SD_M
CAPM uses beta only: the SDs are a
step to beta, never in CAPM itself]],
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
- "what beta would it need" -> 2 find
  beta; type the prices (or the
  forecast return)
- "is it a good buy?" -> 3 buy or sell
- two shares' E[R] and betas, find rf
  -> 8 two shares on the SML

TRAPS
- E[RM] - rf is the premium, NOT the
  share's expected return
- beta uses the MARKET's variance
- over/undervalued: compare forecast
  with the REQUIRED return]],
    worked = [[## CAPM
Q: beta 1.65, rf 2%, market 11%.
PICK: 1 required return
ENTER: rf 2 | rm 11 | beta 1.65
E[R] = 2% + 1.65 x 9% = 16.85%

## Over or under?
Q: beta 1.55, forecast 13.4%, rf 2%,
market 10%.
PICK: 3 buy or sell
ENTER: rf 2 | rm 10 | beta 1.55 |
fc 13.4
required 14.4% > 13.4%: overvalued

## Beta from covariance
Q: Cov 0.02, market SD 10%.
PICK: 5 beta from covariance
ENTER: cov 0.02 | sm 10
beta = 0.02/0.01 = 2

## Portfolio beta + return
Q: 70% in X (beta 1.2), 30% in Y
(beta 0.8); rf 3%, market 9%.
PICK: 6 portfolio beta + return
ENTER: w1 70 | b1 1.2 | w2 30 |
b2 0.8 | rf 3 | rm 9
X: 3% + 1.2 x 6% = 10.2%
Y: 3% + 0.8 x 6% = 7.8%
beta_p = 0.7 x 1.2 + 0.3 x 0.8 = 1.08
E[Rp] = 3% + 1.08 x 6% = 9.48%

## Beta from a price forecast
Q: price $80; in a year $86 plus a $2
dividend; rf 4%, premium 5%.
PICK: 2 find beta
ENTER: rf 4 | mrp 5 | P0 80 | P1 86 |
div 2
R = (2 + 86 - 80)/80 = 10%
beta = (10% - 4%)/5% = 1.2

## rf and premium from two shares
Q: A: E[R] 13%, beta 1.5; B: E[R] 8%,
beta 0.5.
PICK: 8 two shares on the SML
ENTER: erA 13 | bA 1.5 | erB 8 |
bB 0.5
premium = (13% - 8%)/(1.5 - 0.5) = 5%
rf = 13% - 1.5 x 5% = 5.5%]],
  })
end
