----------------------------------------------------------------------
-- EVERYTHING page, section 4 (Working Capital): lines NOT on the formula sheet.
-- See every_core.lua for the shape of a pack. Own numbers. ASCII only.
--   NWC from the balance sheet, the operating cycle, the cost of
--   trade credit (EAR of a skipped discount), the float (lockbox) NPV
--   and the NPV of a credit policy (sales forever, some paid later).
----------------------------------------------------------------------
do
  local X = EVERY_SLOT
  -- a blank Y (days in a year) is 365: the written lines show 365 then
  local function y365(s, x) if x.Y then return s end return (s:gsub("Y", "365")) end
  local function tcF(s) return function(x) return y365(s, x) end end
  local EARtc = "EAR = (1 + d/(1 - d))^(Y/(net - disc)) - 1"
  local CRED = "NPVc = (s*Q*P*(1 - d) - Q*c)*(1 + r)/r + (1 - s)*Q*P/r"
  -- the boxes the sheet's lines already use (same labels)
  local xAR = X("AR", nil, "A/R accounts receivable ($)", "money", "money customers owe (balance sheet)")
  local xInv = X("Inventory", nil, "Inventory balance ($)", "money", "the inventory on the balance sheet")
  local xAP = X("AP", nil, "A/P accounts payable ($)", "money", "money the firm owes suppliers")
  local xInvD = X("InvDays", nil, "Inventory Days", "num", "days of COGS held as inventory")
  local xARD = X("ARDays", nil, "A/R Days", "num", "days of sales still owed by customers")
  local xr = X("r", nil, "r rate per period (%)", "pct", "the rate for ONE period: monthly = APR/12 (or type APR and m)", { rate = true })
  local xd = X("d", nil, "d discount for paying early (%)", "pct", "2/10 net 30: d = 2")
  local LINES = {
    { id = "s4_nwc", sec = 4, name = "Net working capital", short = "NWC",
      eq = "NWC = Cash + AR + Inventory - AP - Accruals",
      why = "NWC = current assets (cash, A/R, inventory) - current liabilities (A/P, accruals)",
      vars = { X("NWC", nil, "NWC net working capital ($)", "money", "current assets - current liabilities"),
               X("Cash", nil, "Cash cash held ($)", "money", "cash on the balance sheet (blank = 0)", { weak = true }),
               xAR, xInv, xAP,
               X("Accruals", nil, "Accruals wages, tax owed ($)", "money", "accrued wages and taxes (blank = 0)", { weak = true }) },
      f = function(x) return x.Cash + x.AR + x.Inventory - x.AP - x.Accruals - x.NWC end,
      rearr = { Cash = "Cash = NWC - AR - Inventory + AP + Accruals", AR = "AR = NWC - Cash - Inventory + AP + Accruals",
                Inventory = "Inventory = NWC - Cash - AR + AP + Accruals", AP = "AP = Cash + AR + Inventory - Accruals - NWC",
                Accruals = "Accruals = Cash + AR + Inventory - AP - NWC" },
      ex = { Cash = 2.5, AR = 6.1, Inventory = 4.4, AP = 3.2, Accruals = 1.9 } },
    { id = "s4_oc", sec = 4, name = "Operating cycle", short = "OC", eq = "OC = InvDays + ARDays",
      why = "the days from buying stock to getting the cash: the CCC line without the - APDays part",
      vars = { X("OC", nil, "OC operating cycle (days)", "num", "days from buying stock to getting paid"), xInvD, xARD },
      f = function(x) return x.InvDays + x.ARDays - x.OC end,
      rearr = { InvDays = "InvDays = OC - ARDays", ARDays = "ARDays = OC - InvDays" },
      ex = { InvDays = 47.5, ARDays = 36.2 } },
    { id = "s4_tcred", sec = 4, name = "Cost of trade credit (skip the discount)", short = "trade credit EAR",
      eq = EARtc, eqf = tcF(EARtc),
      why = "skip the discount: you keep (1 - d) for (net - disc) more days, then pay 1; that rate, made yearly",
      vars = { X("EAR", nil, "EAR cost of trade credit a year (%)", "pct", "more than the bank rate? borrow and take the discount", { rate = true }),
               xd,
               X("disc", nil, "disc last day for the discount (days)", "num", "2/10 net 30: disc = 10", { pos = true }),
               X("net", nil, "net day you pay (days)", "num", "2/10 net 30: net = 30; pay later (stretch)? that day", { pos = true }),
               X("Y", nil, "Y days in a year (blank = 365)", "num", "blank = 365; type 360 if the question says", { opt = true }) },
      f = function(x) return (1 + x.d / (1 - x.d)) ^ ((x.Y or 365) / (x.net - x.disc)) - 1 - x.EAR end,
      need = function(x)
        if x.net and x.disc and x.net <= x.disc then return "net (the day you pay) AFTER disc (the discount day)" end
        if x.d and (x.d <= 0 or x.d >= 1) then return "d between 0 and 100%" end
      end,
      rearr = { d = tcF("d = 1 - 1/(1 + EAR)^((net - disc)/Y)"),
                net = tcF("net = disc + Y*ln(1 + d/(1 - d))/ln(1 + EAR)"),
                disc = tcF("disc = net - Y*ln(1 + d/(1 - d))/ln(1 + EAR)") },
      ex = { d = 0.03, disc = 15, net = 45 } },
    { id = "s4_float", sec = 4, name = "Cash freed by less float", short = "float",
      eq = "Freed = Daily*Fdays",
      why = "each day of float saved brings one day of collections in today",
      vars = { X("Freed", nil, "Freed cash freed today ($)", "money", "cash you get once, today"),
               X("Daily", nil, "Daily collections a day ($)", "money", "what customers pay in one day"),
               X("Fdays", nil, "Fdays days of float saved", "num", "how many days faster the cash comes in", { pos = true }) },
      f = function(x) return x.Daily * x.Fdays - x.Freed end,
      rearr = { Daily = "Daily = Freed/Fdays", Fdays = "Fdays = Freed/Daily" },
      ex = { Daily = 32000, Fdays = 3 } },
    { id = "s4_rper", sec = 4, name = "Rate per period from an APR", short = "r = APR/m", eq = "r = APR/m",
      why = "the APR/m inside EAR = (1 + APR/m)^m - 1: the rate for one period",
      vars = { xr, X("APR", nil, "APR quoted yearly rate (%)", "pct", "the APR: compounded m times a year"),
               X("m", nil, "m periods a year", "num", "monthly fees: 12", { pos = true }) },
      f = function(x) return x.APR / x.m - x.r end,
      rearr = { APR = "APR = r*m", m = "m = APR/r" },
      ex = { APR = 0.09, m = 12 } },
    { id = "s4_pvfee", sec = 4, name = "PV of a fee forever", short = "PV of the fees", eq = "PVfees = fee/r",
      why = "a fee paid every period forever, first in one period: the PV of a perpetuity C/r",
      vars = { X("PVfees", nil, "PVfees value today of the fees ($)", "money", "what all the fees cost, in today's money"),
               X("fee", nil, "fee each period ($)", "money", "the fee every period, forever (first in one period)"), xr },
      f = function(x) return x.fee / x.r - x.PVfees end,
      need = function(x) if x.r and x.r <= 0 then return "r more than 0 (the rate per fee period)" end end,
      rearr = { fee = "fee = PVfees*r", r = "r = fee/PVfees" },
      ex = { fee = 500, r = 0.006 } },
    { id = "s4_lockbox", sec = 4, name = "NPV of a lockbox (float)", short = "lockbox NPV",
      eq = "NPV = Freed - fee/r",
      why = "cash freed today minus the PV of the fee, paid every period forever (a perpetuity C/r)",
      vars = { X("NPVf", "NPV", "NPV lockbox NPV ($)", "money", "cash freed - PV of the fees; below 0: say no"),
               X("Freed", nil, "Freed cash freed today ($)", "money", "cash you get once, today"),
               X("fee", nil, "fee each period ($)", "money", "the fee every period, forever (first in one period)"),
               xr },
      f = function(x) return x.Freed - x.fee / x.r - x.NPVf end,
      need = function(x) if x.r and x.r <= 0 then return "r more than 0 (the rate per fee period)" end end,
      rearr = { Freed = "Freed = NPV + fee/r", fee = "fee = (Freed - NPV)*r", r = "r = fee/(Freed - NPV)" },
      ex = { Freed = 96000, fee = 500, r = 0.006 } },
    { id = "s4_credit", sec = 4, name = "NPV of a credit policy", short = "credit policy NPV",
      eq = CRED,
      why = "each period, forever: pay Q*c now, get the cash sales s*Q*P*(1 - d) now, the credit sales (1 - s)*Q*P one period later",
      vars = { X("NPVc", nil, "NPVc NPV of the credit policy ($)", "money", "the policy's value: sales forever"),
               X("Q", nil, "Q units sold each period", "num", "units sold a month (or a period)", { pos = true }),
               X("P", nil, "P price of one unit ($)", "money", "the full price of one unit"),
               X("c", nil, "c cost of one unit ($)", "money", "the cost to make one unit, paid now"),
               X("s", nil, "s customers who pay cash now (%)", "pct", "they take the discount d; blank = 0 (all pay later)", { weak = true }),
               X("d", nil, "d discount for paying early (%)", "pct", "the cash discount; blank = 0 (none)", { weak = true }),
               xr },
      f = function(x) return (x.s * x.Q * x.P * (1 - x.d) - x.Q * x.c) * (1 + x.r) / x.r + (1 - x.s) * x.Q * x.P / x.r - x.NPVc end,
      need = function(x) if x.r and x.r <= 0 then return "r more than 0 (the rate per period)" end end,
      rearr = { Q = "Q = NPVc/((s*P*(1 - d) - c)*(1 + r)/r + (1 - s)*P/r)",
                P = "P = (NPVc + Q*c*(1 + r)/r)/(Q*(s*(1 - d)*(1 + r) + 1 - s)/r)",
                c = "c = (s*Q*P*(1 - d)*(1 + r)/r + (1 - s)*Q*P/r - NPVc)*r/(Q*(1 + r))",
                s = "s = (NPVc - Q*P/r + Q*c*(1 + r)/r)*r/(Q*P*((1 - d)*(1 + r) - 1))",
                d = "d = 1 - (NPVc - (1 - s)*Q*P/r + Q*c*(1 + r)/r)*r/(s*Q*P*(1 + r))",
                r = "r = (s*Q*P*(1 - d) - Q*c + (1 - s)*Q*P)/(NPVc - s*Q*P*(1 - d) + Q*c)" },
      ex = { Q = 400, P = 80, c = 50, s = 0.4, d = 0.02, r = 0.015 } },
    { id = "s4_switch", sec = 4, name = "NPV of switching policy", short = "switch NPV", eq = "dNPV = NPVc - NPVold",
      why = "switch only if the new policy is worth more than the one you have now",
      vars = { X("dNPV", nil, "dNPV NPV of switching ($)", "money", "new policy - current one; below 0: do not switch"),
               X("NPVc", nil, "NPVc NPV of the credit policy ($)", "money", "the NEW policy's value"),
               X("NPVold", nil, "NPVold NPV of the current policy ($)", "money", "the value of the policy you have now") },
      f = function(x) return x.NPVc - x.NPVold - x.dNPV end,
      rearr = { NPVc = "NPVc = dNPV + NPVold", NPVold = "NPVold = NPVc - dNPV" },
      ex = { NPVc = 1450000, NPVold = 1520000 } },
  }
  local DAYS = { "4:Sales", "4:COGS", "4:dailySales", "4:dailyCOGS", "4:InvDays", "4:ARDays", "4:APDays", "4:CCC" }
  EVERY_ADD{
    lines = LINES, bridges = {},
    weakok = { s4_nwc = { Cash = true, Accruals = true }, s4_credit = { s = true, d = true } },
    skip = {
      -- a days question (CCC) types AR, Inventory, AP too: NWC only with cash, accruals or NWC typed there
      s4_nwc = function(K)
        if K["4:Cash"] or K["4:Accruals"] or K["4:NWC"] then return false end
        for _, b in ipairs(DAYS) do if K[b] then return true end end
        return false
      end,
      -- a CCC question from balances (A/P days known too): no operating cycle unless days or OC are typed
      s4_oc = function(K, kn)
        if K["4:OC"] or K["4:InvDays"] or K["4:ARDays"] then return false end
        return kn["4:APDays"] ~= nil
      end,
    },
    hint = { ["4:r"] = "the rate for ONE period: monthly = APR/12 (or type APR and m)" },
    order = { [4] = { "4:InvDays", "4:Inventory", "4:dailyCOGS", "4:COGS", "4:ARDays", "4:AR", "4:dailySales", "4:Sales",
                      "4:APDays", "4:AP", "4:CCC", "4:OC", "4:Cash", "4:Accruals", "4:NWC",
                      "4:d", "4:disc", "4:net", "4:Y", "4:EAR", "4:Daily", "4:Fdays", "4:Freed", "4:fee",
                      "4:APR", "4:m", "4:r", "4:NPVf", "4:Q", "4:P", "4:c", "4:s", "4:NPVc", "4:NPVold", "4:dNPV" } },
  }
end
