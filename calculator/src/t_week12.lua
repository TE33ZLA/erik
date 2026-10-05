----------------------------------------------------------------------
-- TYPE 23 (v24): WEEK 12 PAYOUT POLICY - dividends and the ex-dividend
-- price, share buy-backs, homemade dividends, dividend tax (classical
-- vs imputation / franking) and capital gains tax with the 50% discount.
-- All in a perfect capital market unless tax is typed. None of it is on
-- the exam formula sheet. (Market efficiency, Week 12's other topic,
-- has no maths: see the theory pages.)
----------------------------------------------------------------------
do
  local MODES23 = { "dividend: price before and after", "share buy-back (repurchase)", "homemade dividend",
                    "dividend tax: imputation (franking)", "capital gains tax (50% discount)" }
  -- franked dividend: the credit for company tax already paid, the grossed-up income, and what is left after personal tax
  local function franked(out, div, Tc, tp, fr, tag)
    local kx = (tag ~= "") and "D" or ""
    local cr = div * fr * Tc / (1 - Tc)
    local gross = div + cr
    local net = gross * tp - cr
    out:row("franking (imputation) credit" .. tag, cr, "$", "Div x Tc/(1 - Tc)" .. ((fr < 1) and (" x " .. P(fr) .. " franked") or "") .. " = " ..
            P(div) .. " x " .. P(Tc) .. "/" .. P(1 - Tc), "credit" .. kx)
    out:row("taxable income (grossed up)" .. tag, gross, "$", "Div + credit = " .. P(div) .. " + " .. P(cr), "gross" .. kx)
    out:row("tax at your rate" .. tag, gross * tp, "$", P(gross) .. " x " .. P(tp), "taxp" .. kx)
    out:row((net >= 0) and ("tax to pay after the credit" .. tag) or ("tax REFUND" .. tag), net, "$", "tax - credit = " .. P(gross * tp) .. " - " .. P(cr), "net" .. kx)
    out:row("cash kept after tax" .. tag, div - net, "$", "Div - tax to pay = " .. P(div) .. " - " .. P(net), "kept" .. kx)
    return div - net, cr
  end
  local function solvePayout(V, out)
    local mode = V.mode or MODES23[1]
    if mode == MODES23[1] then
      -- price before = V/N (cash included); on the ex-dividend date it drops by the dividend
      local N = V.N
      local Pc = V.Pc or ((V.Vf and N) and V.Vf / N)
      local div = V.div or ((V.cash and N) and V.cash / N)
      if not (Pc and div) then out:need("the price before (or the firm's value and the shares) and the dividend (or the total cash paid)"); return end
      out:head("DIVIDEND (PERFECT MARKET)")
      if not V.Pc then out:row("price cum-dividend", Pc, "$", "V/N = " .. P(V.Vf) .. "/" .. P(N), "Pc") end
      if not V.div then out:row("dividend per share", div, "$", "cash paid/N = " .. P(V.cash) .. "/" .. P(N), "div") end
      out:row("price ex-dividend", Pc - div, "$", "P(cum) - Div = " .. P(Pc) .. " - " .. P(div), "Pex")
      if V.Vf and N then out:row("firm value after", V.Vf - div * N, "$", "V - cash paid out", "Vafter") end
      if V.n then
        out:row("your wealth before", V.n * Pc, "$", P(V.n) .. " x " .. P(Pc), "wB")
        out:row("after: shares + cash", V.n * (Pc - div) + V.n * div, "$", P(V.n) .. " x " .. P(Pc - div) .. " + " .. P(V.n) .. " x " .. P(div), "wA")
      end
      out:note("buy ON or AFTER the ex-dividend date and you do not get the dividend; the price falls by it then")
      out:note("taxes aside, shareholders are no richer: cash moves from the firm to them")
      out:off("exdiv")
      return
    end
    if mode == MODES23[2] then
      -- a buy-back at the market price leaves the price unchanged in a perfect market
      local N = V.N
      local P0 = V.Pc or ((V.Vf and N) and V.Vf / N)
      local Vf = V.Vf or ((V.Pc and N) and V.Pc * N)
      if not (P0 and Vf and N) then out:need("the number of shares and the price (or the market value)"); return end
      local cash = V.cash or (V.nb and V.nb * P0)
      if not cash then out:need("the cash spent on the buy-back (or the number of shares bought)"); return end
      local nb = V.nb or cash / P0
      out:head("BUY-BACK (PERFECT MARKET)")
      if not V.Pc then out:row("price before", P0, "$", "V/N = " .. P(Vf) .. "/" .. P(N), "Pc") end
      if not V.Vf then out:row("market value before", Vf, "$", "N x price = " .. P(N) .. " x " .. P(P0), "Vf") end
      if V.nb then out:row("cash spent", cash, "$", "shares bought x price = " .. P(V.nb) .. " x " .. P(P0), "cash")
      else out:row("shares bought back", nb, "", "cash/price = " .. P(cash) .. "/" .. P(P0), "nb") end
      out:row("shares left", N - nb, "", P(N) .. " - " .. P(nb), "Nafter")
      out:row("market value after", Vf - cash, "$", "V - cash = " .. P(Vf) .. " - " .. P(cash), "Vafter")
      out:row("price after", (Vf - cash) / (N - nb), "$", P(Vf - cash) .. "/" .. P(N - nb), "Pafter")
      out:note("the price does NOT change: the cash paid equals the value of the shares bought")
      out:row("the same cash as a dividend: ex price", P0 - cash / N, "$", "P - cash/N = " .. P(P0) .. " - " .. P(cash / N), "Pex")
      if V.n then out:row("your wealth (keep your shares)", V.n * P0, "$", P(V.n) .. " x " .. P(P0) .. " (same as with the dividend)", "w") end
      out:off("buyback")
      return
    end
    if mode == MODES23[3] then
      -- homemade dividend: sell shares (ex-dividend) to get more cash, or reinvest cash you do not want
      if not (V.n and V.Pc and V.div and V.want) then out:need("your shares, the price before, the dividend paid and the dividend you want"); return end
      local Pex = V.Pc - V.div
      local got, wanted = V.n * V.div, V.n * V.want
      out:head("HOMEMADE DIVIDEND")
      out:row("price ex-dividend", Pex, "$", "P(cum) - Div = " .. P(V.Pc) .. " - " .. P(V.div), "Pex")
      out:row("cash from the dividend", got, "$", P(V.n) .. " x " .. P(V.div), "got")
      out:row("cash you want", wanted, "$", P(V.n) .. " x " .. P(V.want), "wanted")
      local k
      if wanted >= got then
        k = (wanted - got) / Pex
        out:row("shares to SELL (ex-dividend)", k, "", "(" .. P(wanted) .. " - " .. P(got) .. ")/" .. P(Pex), "sell")
        out:row("wealth after", (V.n - k) * Pex + wanted, "$", "(" .. P(V.n) .. " - " .. P(k) .. ") x " .. P(Pex) .. " + " .. P(wanted), "w")
      else
        k = (got - wanted) / Pex
        out:row("shares to BUY with the extra cash", k, "", "(" .. P(got) .. " - " .. P(wanted) .. ")/" .. P(Pex), "buy")
        out:row("wealth after", (V.n + k) * Pex + wanted, "$", "(" .. P(V.n) .. " + " .. P(k) .. ") x " .. P(Pex) .. " + " .. P(wanted), "w")
      end
      out:note("wealth is the same either way (" .. P(V.n * V.Pc) .. "): you can make your own payout, so the firm's policy does not matter")
      out:off("homemade")
      return
    end
    if mode == MODES23[4] then
      if not (V.div and V.tp) then out:need("the cash dividend and your personal tax rate (and the company tax rate)"); return end
      local Tc, fr = V.Tc or 0.30, V.fr or 1
      out:head("IMPUTATION (FRANKED DIVIDEND)")
      local kept = franked(out, V.div, Tc, V.tp, fr, "")
      out:note("the credit is the company tax already paid: you are taxed once, at your own rate")
      out:head("CLASSICAL SYSTEM (NO CREDIT)")
      out:row("tax on the dividend", V.div * V.tp, "$", "Div x your rate = " .. P(V.div) .. " x " .. P(V.tp), "taxC")
      out:row("cash kept after tax", V.div * (1 - V.tp), "$", "Div x (1 - rate)", "keptC")
      if fr >= 1 then
        local profit = V.div / (1 - Tc)
        out:head("TOTAL TAX ON THE PROFIT")
        out:row("company profit before tax", profit, "$", "Div/(1 - Tc) = " .. P(V.div) .. "/" .. P(1 - Tc), "profit")
        out:row("total tax: imputation", profit - kept, "$", "profit - cash kept = " .. P(profit) .. " - " .. P(kept), "totI")
        out:row("total tax: classical", profit - V.div * (1 - V.tp), "$", "company tax + tax on the dividend", "totC")
      end
      out:off("franking")
      return
    end
    if mode == MODES23[5] then
      local gain = V.gain or ((V.sell and V.buy) and (V.sell - V.buy) * (V.n or 1))
      if not (gain and V.tp) then out:need("the capital gain (or the buy and sell prices) and your personal tax rate"); return end
      local long = not V.held or tostring(V.held):find("more", 1, true)
      out:head("CAPITAL GAINS TAX")
      if not V.gain then out:row("capital gain", gain, "$", "(sell - buy) x shares = (" .. P(V.sell) .. " - " .. P(V.buy) .. ") x " .. P(V.n or 1), "gain") end
      local taxable = long and gain * 0.5 or gain
      out:row("taxable gain", taxable, "$", long and ("50% discount (held over 12 months): " .. P(gain) .. " x 0.5") or "held 12 months or less: no discount", "taxable")
      out:row("capital gains tax", taxable * V.tp, "$", P(taxable) .. " x " .. P(V.tp), "cgt")
      out:row("gain kept after tax", gain - taxable * V.tp, "$", P(gain) .. " - " .. P(taxable * V.tp), "keptG")
      if V.Tc then
        out:head("THE SAME AMOUNT AS A FRANKED DIVIDEND")
        local kept = franked(out, gain, V.Tc, V.tp, 1, " (div)")
        out:add("ok", (kept > gain - taxable * V.tp) and "the franked dividend leaves MORE after tax" or
                ((kept < gain - taxable * V.tp) and "the capital gain leaves MORE after tax" or "both leave the same"))
      end
      out:off("cgt")
      return
    end
  end

  table.insert(TYPES, {
    name = "Payout: dividends, buy-backs, tax", group = 8, solve = solvePayout,
    desc = "ex-dividend price, share buy-backs, homemade dividends, franked dividends (imputation) vs classical tax, capital gains tax with the 50% discount",
    looks = "dividend | ex-dividend | cum dividend | record date | declaration | share repurchase | buy-back | buyback | open market repurchase | market capitalisation | excess cash | homemade dividend | prefers a dividend | imputation | franked | franking credit | classical tax | capital gains tax | CGT discount | payout policy",
    slots = {
      S("mode", "what to find", "choice", MODES23, 1),
      S("Pc", "share price now (cum-div) ($)", "money"),
      S("Vf", "or: firm market value ($)", "money"),
      S("N", "number of shares", "num"),
      S("div", "dividend per share ($)", "money"),
      S("cash", "or: total cash paid out ($)", "money"),
      S("nb", "or: shares bought back", "num"),
      S("n", "your shares (optional)", "num"),
      S("want", "dividend you WANT per share ($)", "money"),
      S("Tc", "company tax rate (%)", "pct", nil, nil, "30"),
      S("tp", "your personal tax rate (%)", "pct"),
      S("fr", "% franked (blank = 100)", "pct"),
      S("gain", "capital gain ($)", "money"),
      S("buy", "or: price you paid ($)", "money"), S("sell", "and price you sold at ($)", "money"),
      S("held", "held for", "choice", { "more than 12 months", "12 months or less" }, 1),
    },
    vis = function(Sm)
      local m = Sm.mode.opts[Sm.mode.idx]
      if m == MODES23[1] then return { "mode", "Pc", "Vf", "N", "div", "cash", "n" } end
      if m == MODES23[2] then return { "mode", "Pc", "Vf", "N", "cash", "nb", "n" } end
      if m == MODES23[3] then return { "mode", "n", "Pc", "div", "want" } end
      if m == MODES23[4] then return { "mode", "div", "Tc", "tp", "fr" } end
      return { "mode", "gain", "buy", "sell", "n", "tp", "held", "Tc" }
    end,
    hints = {
      mode = "left/right changes the kind; ESC: back to the list",
      Pc = "the price while it still carries the dividend",
      Vf = "the firm's total market value, excess cash included",
      N = "shares outstanding",
      div = "dividend per share, e.g. 1.25",
      cash = "the total paid out (or spent on the buy-back)",
      nb = "'buys back 200,000 shares': the number bought",
      n = "your own shares (for your wealth)",
      want = "the payout per share you would like, e.g. 1.5 (0 = none)",
      Tc = "company tax: 30 in Australia",
      tp = "your marginal tax rate, e.g. 45",
      fr = "fully franked: leave blank",
      gain = "the profit on the sale, in $",
      buy = "price paid (then the sale price and your shares)",
      held = "over 12 months: only half the gain is taxed",
    },
    formula = { "P_ex = P_cum - Div   shares bought = cash/P", "credit = Div*T_c/(1 - T_c)   CGT = gain*0.5*t (held > 12 months)" },
    words = "in a perfect market how the cash is paid out does not change shareholders' wealth; taxes and signals are what make payout policy matter",
    letters = { "P(cum) = price with the dividend still attached", "P(ex) = price on the ex-dividend date",
                "Div = dividend per share; N = shares", "V = the firm's market value (cash included)",
                "Tc = company tax; t = your personal tax rate", "credit = franking (imputation) credit" },
    acronyms = { "CGT = capital gains tax", "MM = Modigliani and Miller", "EMH = efficient market hypothesis" },
    notes = [[PAYOUT POLICY

HOW TO USE
Pick what they ask for from the list
(8, 1, then the number):
1 dividend: the price before and
  after (ex-dividend)
2 share buy-back: shares bought, the
  price after
3 homemade dividend: shares to sell
  (or buy) for the payout you want
4 dividend tax: franked (imputation)
  vs classical
5 capital gains tax (50% discount)
None of these are on the formula
sheet: write the steps in words.

FORMULAS
price before = V/N (cash included)
ex-dividend price = price - Div
buy-back: shares = cash/price; the
price does not change
homemade: shares to sell =
(cash wanted - dividend cash)/P(ex)
franking credit = Div x Tc/(1 - Tc)
tax = (Div + credit) x t - credit
CGT = gain x 50% x t (over 12 months)

MARKET EFFICIENCY (Week 12) has no
maths: T theory pages.]],
    assume = STEPS_COMMON .. [[
THIS TYPE:
1. perfect market unless tax is given
2. price before = value/shares
3. dividend: the price drops by it;
   buy-back: the price stays

IF THE QUESTION SAYS...
- "excess cash", "pays a dividend" ->
  1: firm value, shares, cash paid
- "repurchase", "buy back" -> 2
- "prefers a bigger dividend" -> 3
- "franked", "imputation credit" -> 4
- "held for more than a year" -> 5

TRAPS
- buy-back: the price does NOT fall
- the ex-dividend price is the old
  price MINUS the dividend
- franking credit = Div x Tc/(1 - Tc),
  not Div x Tc
- the CGT discount needs MORE than 12
  months]],
    worked = [[## Dividend
Q: firm worth $600m (incl. $50m excess
cash), 20m shares; pays the $50m out.
PICK: 1 dividend
ENTER: Vf 600m | N 20m | cash 50m
price before = 600m/20m = $30
Div = $2.50; ex price = $27.50

## Buy-back
Q: the same firm spends the $50m on a
buy-back instead.
PICK: 2 buy-back
ENTER: Vf 600m | N 20m | cash 50m
shares bought = 50m/30 = 1,666,667
price after = 550m/18,333,333 = $30

## Homemade dividend
Q: you own 200 shares at $25; the firm
pays $1 but you want $1.50.
PICK: 3 homemade dividend
ENTER: n 200 | Pc 25 | div 1 | want 1.5
ex price $24; sell (300 - 200)/24
= 4.17 shares

## Franked dividend
Q: $140 fully franked dividend; company
tax 30%; your rate 45%.
PICK: 4 dividend tax
ENTER: div 140 | Tc 30 | tp 45
credit = 140 x 0.3/0.7 = $60
tax = 200 x 0.45 - 60 = $30 to pay
you keep $110 (classical: $77)

## Capital gains tax
Q: bought 1,000 shares at $20, sold at
$30 after 2 years; your rate 45%.
PICK: 5 capital gains tax
ENTER: buy 20 | sell 30 | n 1000 |
tp 45
taxable = 10,000 x 50% = 5,000
CGT = 2,250; you keep $7,750]],
  })
end
