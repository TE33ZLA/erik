----------------------------------------------------------------------
-- WEEK 8: WORKING CAPITAL
--   14 days, cycles, NWC and firm value
--   15 trade credit: the cost of skipping a discount
--   16 credit policy: NPV of switching (monthly cash flows)
----------------------------------------------------------------------
do
  local MODES14 = { "days + cycles from balances", "cycles from days", "cash freed by a change in days",
                    "NWC from the balance sheet", "firm value from FCF" }
  local function yearOf(s) return tonumber(tostring(s or "365"):match("^%d+")) or 365 end

  local function solveWC(V, out)
    local mode = V.mode or MODES14[1]
    local Y = yearOf(V.year)
    if mode == MODES14[1] then
      local dS = V.sales and V.sales / Y
      local dC = V.cogs and V.cogs / Y
      out:head("DAYS (a " .. Y .. "-day year)")
      if dS then out:row("sales per day", dS, "$", "sales/" .. Y .. " = " .. P(V.sales) .. "/" .. Y, "dS") end
      if dC then out:row("COGS per day", dC, "$", "COGS/" .. Y .. " = " .. P(V.cogs) .. "/" .. Y, "dC") end
      local inv = V.inv and dC and V.inv / dC
      local ar = V.ar and dS and V.ar / dS
      local ap = V.ap and dC and V.ap / dC
      if V.inv and not dC then out:need("COGS for inventory days") end
      if V.ar and not dS then out:need("sales for A/R days") end
      if V.ap and not dC then out:need("COGS for A/P days") end
      if inv then out:row("inventory days", inv, "days", "inventory/(COGS/" .. Y .. ") = " .. P(V.inv) .. "/" .. P(dC), "invD") end
      if ar then out:row("A/R days", ar, "days", "receivables/(sales/" .. Y .. ") = " .. P(V.ar) .. "/" .. P(dS), "arD") end
      if ap then out:row("A/P days", ap, "days", "payables/(COGS/" .. Y .. ") = " .. P(V.ap) .. "/" .. P(dC), "apD") end
      out:head("CYCLES")
      if inv and ar then out:row("operating cycle", inv + ar, "days", "inventory days + A/R days", "oc") end
      if inv and ar and ap then
        out:row("cash cycle (CCC)", inv + ar - ap, "days", "inventory days + A/R days - A/P days", "ccc")
        if V.paynet then out:row("CCC if you pay on day " .. P(V.paynet), inv + ar - V.paynet, "days", "A/P days replaced by " .. P(V.paynet), "ccc2") end
      else
        out:need("inventory, receivables, payables, sales and COGS for the cycles")
      end
      return
    end
    if mode == MODES14[2] then
      if not (V.invD and V.arD) then out:need("inventory days and A/R days"); return end
      out:head("CYCLES")
      out:row("operating cycle", V.invD + V.arD, "days", "inventory days + A/R days", "oc")
      if V.apD then out:row("cash cycle (CCC)", V.invD + V.arD - V.apD, "days", "inventory days + A/R days - A/P days = " .. P(V.invD) .. " + " .. P(V.arD) .. " - " .. P(V.apD), "ccc") end
      out:note("a negative cash cycle: suppliers are paid AFTER customers pay")
      return
    end
    if mode == MODES14[3] then
      local which = V.which or "payables (A/P)"
      local base = (which == "receivables (A/R)") and V.sales or V.cogs
      if not base then out:need(which == "receivables (A/R)" and "sales" or "COGS"); return end
      if not (V.oldD and V.newD) then out:need("the old and the new number of days"); return end
      local day = base / Y
      out:row("one day of " .. (which == "receivables (A/R)" and "sales" or "COGS"), day, "$", P(base) .. "/" .. Y, "day")
      local d = V.newD - V.oldD
      local freed = (which == "payables (A/P)") and d * day or -d * day
      out:row("cash freed", freed, "$", (which == "payables (A/P)") and "(new - old A/P days) x one day" or "(old - new days) x one day", "freed")
      out:note(freed >= 0 and "positive: cash is released" or "negative: more cash is tied up")
      return
    end
    if mode == MODES14[4] then
      local ca = (V.cash or 0) + (V.ar or 0) + (V.inv or 0) + (V.oca or 0)
      local cl = (V.ap or 0) + (V.ocl or 0)
      out:row("current assets", ca, "$", "cash + receivables + inventory + other", "ca")
      out:row("current liabilities", cl, "$", "payables + other current liabilities", "cl")
      out:row("NWC", ca - cl, "$", "current assets - current liabilities", "nwc")
      return
    end
    -- firm value from next year's FCF growing forever
    if not (V.ni and V.dep and V.r) then out:need("net income, depreciation and r (and capex, dNWC, g)"); return end
    local g = V.g or 0
    local fcf = V.ni + V.dep - (V.capex or 0) - (V.dnwc or 0)
    out:row("FCF next year", fcf, "$", "NI + Dep - CapEx - dNWC", "fcf")
    if V.r <= g then out:err("r must be above g"); return end
    out:row("firm value V", fcf / (V.r - g), "$", "V = FCF/(r - g) = " .. P(fcf) .. "/(" .. P(V.r) .. " - " .. P(g) .. ")", "V")
    if V.cut and V.dnwc then
      local save = V.cut * V.dnwc
      out:row("yearly cash saved", save, "$", "cut x dNWC = " .. P(V.cut) .. " x " .. P(V.dnwc), "save")
      out:row("rise in firm value", save / (V.r - g), "$", "saving/(r - g)", "dV")
    end
  end

  table.insert(TYPES, {
    name = "Working capital: days, cycles, NWC", group = 5, solve = solveWC,
    desc = "inventory, A/R and A/P days, operating and cash cycles, cash freed, NWC, firm value",
    looks = "inventory days | receivable days | payable days | cash conversion cycle | operating cycle | net working capital",
    slots = {
      S("mode", "what to find", "choice", MODES14, 1),
      S("sales", "sales for the year ($)", "money"),
      S("cogs", "COGS for the year ($)", "money"),
      S("inv", "inventory ($)", "money"),
      S("ar", "accounts receivable ($)", "money"),
      S("ap", "accounts payable ($)", "money"),
      S("year", "days in a year", "choice", { "365", "360" }, 1),
      S("paynet", "pay suppliers on day (opt.)", "num"),
      S("invD", "inventory days", "num"),
      S("arD", "A/R days", "num"),
      S("apD", "A/P days", "num"),
      S("which", "days that change", "choice", { "payables (A/P)", "receivables (A/R)", "inventory" }, 1),
      S("oldD", "old days", "num"),
      S("newD", "new days", "num"),
      S("cash", "cash ($)", "money"),
      S("oca", "other current assets ($)", "money"),
      S("ocl", "other current liabilities ($)", "money"),
      S("ni", "net income next yr ($)", "money"),
      S("dep", "depreciation ($)", "money"),
      S("capex", "capital expenditure ($)", "money"),
      S("dnwc", "increase in NWC ($)", "money"),
      S("g", "g growth of FCF (%)", "pct"),
      S("r", "r cost of capital (%)", "pct"),
      S("cut", "cut in the NWC increase (%)", "pct"),
    },
    vis = function(Sm)
      local m = Sm.mode.opts[Sm.mode.idx]
      if m == MODES14[1] then return { "mode", "sales", "cogs", "inv", "ar", "ap", "year", "paynet" } end
      if m == MODES14[2] then return { "mode", "invD", "arD", "apD" } end
      if m == MODES14[3] then return { "mode", "which", "sales", "cogs", "oldD", "newD", "year" } end
      if m == MODES14[4] then return { "mode", "cash", "ar", "inv", "oca", "ap", "ocl" } end
      return { "mode", "ni", "dep", "capex", "dnwc", "g", "r", "cut" }
    end,
    hints = {
      mode = "left/right: days, cycle, cash freed, NWC, value",
      sales = "revenue for the year (used for A/R days)",
      cogs = "cost of goods sold (for inventory and A/P days)",
      inv = "inventory balance on the balance sheet",
      ar = "accounts receivable: what customers owe",
      ap = "accounts payable: what you owe suppliers",
      year = "365 unless the question says 360",
      paynet = "'if it paid on the last day, day 45' -> 45",
      which = "which days change, e.g. 'A/P days rise from 53 to 63'",
      cut = "'cuts the increase in working capital by 20%'",
    },
    formula = { "Inv days = (Inv)/(COGS/365)   A/R days = (AR)/(Sales/365)", "CCC = Inv days + A/R days - A/P days" },
    words = "days = balance / one day's flow; the cash cycle is how long cash is tied up before it comes back",
    letters = { "Inv = inventory; AR = accounts receivable; AP = accounts payable", "COGS = cost of goods sold",
                "CCC = cash conversion cycle (cash cycle)", "operating cycle = inventory days + A/R days",
                "NWC = current assets - current liabilities", "FCF = NI + Dep - CapEx - dNWC" },
    acronyms = { "COGS = cost of goods sold", "A/R = accounts receivable; A/P = accounts payable", "CCC = cash conversion cycle",
                 "NWC = net working capital", "NI = net income", "CapEx = capital expenditure" },
    notes = [[WORKING CAPITAL: DAYS AND CYCLES

HOW TO USE
Days from balances: type sales, COGS
and the three balances.
Cycles from days: type the days.
Cash freed: which days change, old
and new days, and sales or COGS.

FORMULAS
$$Inv days = (Inventory)/(COGS/365)
$$AR days = (Receivables)/(Sales/365)
$$AP days = (Payables)/(COGS/365)
operating cycle = Inv days + AR days
cash cycle = operating cycle - AP days
A/R uses SALES; inventory and A/P use COGS.
Shorter cash cycle = less cash tied up.]],
    assume = STEPS_COMMON .. [[
THIS TYPE:
1. one day of sales = sales/365; one
   day of COGS = COGS/365
2. each day count = balance / one day
3. CCC = inv + A/R - A/P days

IF THE QUESTION SAYS...
- "360-day year" -> change the year
- "A/P days rise from 53 to 63" -> cash
  freed = 10 x COGS/365
- "pays on the last day of net 45" ->
  A/P days become 45

TRAPS
- A/R days use SALES, not COGS
- longer A/P frees cash; longer A/R and
  inventory tie cash up]],
    worked = [[## Inventory days
Q: sales $24m, COGS $18m, inventory
$3.4m, 365 days.
ENTER: sales 24m | cogs 18m | inv 3.4m
= 3.4/(18/365) = 68.94 days

## Cash cycle from days
Q: inventory 15.5, A/R 13.5, A/P 59 days.
ENTER: mode cycles from days | 15.5 |
13.5 | 59
CCC = 15.5 + 13.5 - 59 = -30 days

## Cash freed
Q: COGS $19.5m; A/P days rise from 53
to 63.
ENTER: mode cash freed | payables |
cogs 19.5m | old 53 | new 63
= 10 x 19.5m/365 = $534,247]],
  })

  ------------------------------------------------------------------
  -- 15 trade credit
  ------------------------------------------------------------------
  local function solveTC(V, out)
    if not (V.d and V.dd and V.nd) then out:need("the terms: discount %, discount days and net days (e.g. 2/10 net 30)"); return end
    local Y = yearOf(V.year)
    local pay = V.pay or V.nd
    local days = pay - V.dd
    if days <= 0 then out:err("the payment day must be after the discount period"); return end
    local per = V.d / (1 - V.d)
    out:head("TERMS " .. P(V.d * 100) .. "/" .. P(V.dd) .. " NET " .. P(V.nd))
    out:note("take " .. P(V.d * 100) .. "% off if you pay within " .. P(V.dd) .. " days; else pay in full by day " .. P(V.nd))
    out:row("cost for the extra days", per, "%", "d/(1 - d) = " .. P(V.d) .. "/" .. P(1 - V.d), "per")
    out:row("extra days of credit", days, "days", "pay day - discount days = " .. P(pay) .. " - " .. P(V.dd), "days")
    local ear = (1 + per) ^ (Y / days) - 1
    out:row("EAR of skipping the discount", ear, "%", "(1 + d/(1 - d))^(" .. Y .. "/" .. P(days) .. ") - 1", "ear")
    if V.pay and V.pay > V.nd then out:note("paying after day " .. P(V.nd) .. " is STRETCHING: cheaper, but it risks the supplier") end
    if V.bank then
      out:head("DECISION (bank rate " .. pct(V.bank) .. "%)")
      if ear > V.bank then
        out:add("ok", "TAKE the discount: borrow from the bank and pay on day " .. P(V.dd))
      else
        out:add("ok", "SKIP the discount: pay on the LAST day (" .. P(pay) .. ")")
      end
      out:note("never pay between day " .. P(V.dd) .. " and day " .. P(V.nd) .. ": you lose the discount AND free days")
    end
    if V.apbal and V.dcogs then
      local apd = V.apbal / V.dcogs
      out:head("WHEN DOES THE FIRM PAY?")
      out:row("A/P days", apd, "days", "payables / daily COGS = " .. P(V.apbal) .. "/" .. P(V.dcogs), "apd")
      if apd <= V.dd + 0.5 then out:note("within the discount period: it takes the discount")
      elseif apd < V.nd - 0.5 then out:note("between the two dates: it loses the discount AND wastes free credit")
      elseif apd <= V.nd + 0.5 then out:note("on the due date: right if it chose to skip the discount")
      else out:note("after the due date: it is stretching its payables") end
    end
    if V.bill then
      out:row("pay early (discounted bill)", V.bill * (1 - V.d), "$", "bill x (1 - d)", "early")
    end
  end
  table.insert(TYPES, {
    name = "Trade credit: cost of skipping a discount", group = 5, solve = solveTC,
    desc = "terms like 2/10 net 30: the cost of skipping the discount as an EAR, and what to do",
    looks = "2/10 net 30 | discount | net 60 | forgo the discount | effective annual cost | stretch payables | bank lends at",
    slots = {
      S("d", "d discount (%) e.g. 2", "pct"),
      S("dd", "discount days e.g. 10", "num"),
      S("nd", "net days e.g. 30", "num"),
      S("pay", "you pay on day (blank = net)", "num"),
      S("year", "days in a year", "choice", { "365", "360" }, 1),
      S("bank", "bank rate (%) to compare", "pct"),
      S("apbal", "A/P balance ($) (optional)", "money"),
      S("dcogs", "daily COGS ($) (optional)", "money"),
      S("bill", "invoice amount ($) (optional)", "money"),
    },
    hints = {
      d = "'2/10 net 30' -> d = 2",
      dd = "'2/10 net 30' -> discount days = 10",
      nd = "'2/10 net 30' -> net days = 30",
      pay = "stretching: 'pays on day 75' -> 75",
      year = "365 unless the question says 360",
      bank = "the bank's rate: take the discount if the EAR is higher",
      apbal = "with daily COGS: finds when the firm really pays",
    },
    formula = { "EAR = (1 + (d)/(1 - d))^(365/(N - D)) - 1", "d/(1 - d) = cost for the extra N - D days" },
    words = "skipping the discount is a loan from the supplier: you pay d/(1 - d) extra for N - D more days",
    letters = { "d = discount (as a decimal)", "D = discount period in days", "N = net period in days (or the day you pay)",
                "EAR = effective annual rate" },
    acronyms = { "2/10 net 30 = 2% off if paid in 10 days, otherwise pay in full by day 30", "EAR = effective annual rate",
                 "A/P = accounts payable", "COGS = cost of goods sold" },
    notes = [[TRADE CREDIT

HOW TO USE
Type the terms: 2/10 net 30 -> d 2,
discount days 10, net days 30.
Paying later than net (stretching)?
Type the real pay day.
Add the bank rate for the decision.

FORMULA
$$EAR = (1 + (d)/(1 - d))^(365/(N - D)) - 1
On $100 you could pay $98 on day 10:
paying $100 on day 30 costs $2 on $98.

DECISION
EAR > bank rate: take the discount
(borrow from the bank if you must).
EAR < bank rate: skip it, pay on the
LAST day. Never pay in between.]],
    assume = STEPS_COMMON .. [[
THIS TYPE:
1. period cost = d/(1 - d)
2. days = pay day - discount days
3. EAR = (1 + period cost)^(365/days) - 1
4. compare with the bank rate

TRAPS
- divide by (1 - d), not by 1
- days = N - D, not N
- "360-day year" changes 365]],
    worked = [[## Cost of forgoing the discount
Q: 1/10 net 90, 365 days.
ENTER: d 1 | dd 10 | nd 90
EAR = (1 + 1/99)^(365/80) - 1 = 4.69%

## Decide
Q: 1/10 net 90, bank 19%.
ENTER: ... | bank 19
4.69% < 19%: skip, pay on day 90

## Stretching
Q: 1/10 net 45 but pays on day 75.
ENTER: d 1 | dd 10 | nd 45 | pay 75
EAR = (1 + 1/99)^(365/65) - 1 = 5.81%]],
  })

  ------------------------------------------------------------------
  -- 16 credit policy NPV (monthly)
  ------------------------------------------------------------------
  local function policyNPV(Q, p, c, cashShare, disc, r)
    local cash = cashShare * Q * p * (1 - disc)
    local credit = (1 - cashShare) * Q * p
    local cf0 = -c * Q + cash
    local later = cf0 + credit
    return cf0 + later / r, cf0, later
  end
  local function solveCredit(V, out)
    if not (V.p and V.c and V.r) then out:need("price, cost per unit and the monthly rate"); return end
    local rows = {}
    for _, pol in ipairs({ { "CURRENT", V.Qc, V.cc or 0, V.dc or 0 }, { "NEW", V.Qn, V.cn or 0, V.dn or 0 } }) do
      if pol[2] then
        local npv, cf0, later = policyNPV(pol[2], V.p, V.c, pol[3], pol[4], V.r)
        out:head(pol[1] .. " POLICY (" .. P(pol[2]) .. " units a month)")
        out:row("month 0 cash flow", cf0, "$", "-cost x units + cash sales at the discounted price", pol[1] .. "0")
        out:row("each later month", later, "$", "month-0 flow + last month's credit sales collected", pol[1] .. "L")
        out:row("NPV", npv, "$", "CF0 + later/r = " .. P(cf0) .. " + " .. P(later) .. "/" .. P(V.r), pol[1] .. "N")
        rows[#rows + 1] = npv
      end
    end
    if #rows == 2 then
      out:head("SWITCH?")
      out:row("NPV of switching", rows[2] - rows[1], "$", "NPV new - NPV current", "sw")
      out:add("ok", rows[2] > rows[1] and "positive: SWITCH to the new policy" or "negative: KEEP the current policy")
    else
      out:need("units a month for both policies")
    end
  end
  table.insert(TYPES, {
    name = "Credit policy: NPV of switching", group = 5, solve = solveCredit,
    desc = "monthly sales, cash discount, customers paying later: NPV of each policy and of switching",
    looks = "credit policy | cash discount | customers pay in 30 days | NPV of switching | drop the discount",
    slots = {
      S("p", "price per unit ($)", "money"),
      S("c", "cost per unit ($)", "money"),
      S("r", "r per MONTH (%)", "pct"),
      S("Qc", "CURRENT: units a month", "num"),
      S("cc", "CURRENT: % paying cash now", "pct"),
      S("dc", "CURRENT: cash discount (%)", "pct"),
      S("Qn", "NEW: units a month", "num"),
      S("cn", "NEW: % paying cash now", "pct"),
      S("dn", "NEW: cash discount (%)", "pct"),
    },
    hints = {
      p = "selling price of one unit",
      c = "cost to make one unit (paid when it is made)",
      r = "the required return PER MONTH, e.g. 1.25",
      Qc = "units sold each month now",
      cc = "share of customers who pay cash now (take the discount)",
      dc = "the cash discount, e.g. 3 (blank = none)",
      Qn = "units a month under the new policy",
      cn = "blank or 0 if everyone pays on credit",
    },
    formula = { "NPV = CF_0 + (CF_later)/r", "CF_0 = -c*Q + cash sales   CF_later = CF_0 + credit sales" },
    words = "each policy is a monthly perpetuity: pay to make the goods now, collect the credit sales a month later",
    letters = { "Q = units a month", "p = price; c = cost per unit", "r = required return per month",
                "cash sales = % paying now x Q x p x (1 - discount)", "credit sales = the rest, collected next month" },
    acronyms = { "NPV = net present value", "CF = cash flow" },
    notes = [[CREDIT POLICY

HOW TO USE
Type price, cost and the MONTHLY rate.
For each policy: units a month, the %
of customers paying cash now, and the
cash discount (blank = none).

FORMULAS
month 0: -cost x units + cash sales
later months: the same + last month's
credit sales (collected a month later)
$$NPV = CF_0 + (CF_later)/r
switch if NPV new - NPV current > 0]],
    assume = STEPS_COMMON .. [[
THIS TYPE:
1. month 0: pay to make the units; cash
   customers pay now (with the discount)
2. every later month adds last month's
   credit sales
3. NPV = CF0 + later/r (a perpetuity)
4. switch NPV = new - current

TRAPS
- r is PER MONTH
- credit customers pay the FULL price]],
    worked = [[## Keep or drop the discount
Q: price $50, cost $25, r 1.25% a month.
Current: 1,000 units, 60% pay cash with
a 3% discount. New: no discount, 980
units, all pay in 30 days.
ENTER: p 50 | c 25 | r 1.25 | Qc 1000 |
cc 60 | dc 3 | Qn 980
current: CF0 = -25,000 + 600 x 48.5
= 4,100; later = 24,100
NPV = 4,100 + 24,100/0.0125 = $1,932,100
new: CF0 = -24,500; later = 24,500
NPV = $1,935,500; switch = +$3,400]],
  })
end
