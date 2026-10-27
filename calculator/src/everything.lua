----------------------------------------------------------------------
-- EVERYTHING: one page with a box for every letter on the
-- formula sheet, in the sheet's sections and order. Type all you
-- know, ENTER: every sheet line (ROOTDEFS, roots.lua) with exactly
-- ONE unknown left is solved, again and again, so an answer can feed
-- the next line. Each answer is one row of a list; I explains it.
-- Home key E. Included after roots.lua (it uses ROOTDEFS, ROOT_SOLVE).
--   * one box per (section, letter): C payment vs C coupon, r, n, g
--     and PV are different boxes in different sections; Tc is ONE box
--     for Cost of Capital and the Tax World.
--   * formulas that are alternatives (annuity / annuity due /
--     perpetuity, bond / zero-coupon, the share price lines, the two
--     covariances, the no-tax rU / MM II pair) never feed each other.
--   * an answer is passed on only when one formula gave it (or all
--     that gave it agree) and never over a typed box.
----------------------------------------------------------------------
EVERY = {}
do
  local SECN = FSHEET.secs
  local DEFS = {}                         -- the sheet's lines in the sheet's order
  for _, d in ipairs(ROOTDEFS) do DEFS[#DEFS + 1] = d end
  local order = {}
  for n, e in ipairs(FSHEET.list) do order[e[1]] = n end
  table.sort(DEFS, function(a, b) return (order[a.id] or 999) < (order[b.id] or 999) end)
  local function secOf(d) return FSHEET.byId[d.id].sec end

  -- which box a letter of a sheet line uses: "<section>:<letter>" unless listed here (false = no box)
  local MAP = {
    interp = { r = "1:rint" },
    rp = { Rp = "6:rp" },
    er = { ER = "5:ERs" }, varp = { ER = "5:ERs", Var = "5:VarS" },
    ret = { R = "5:Rt" },
    mean = { R7 = false, R8 = false }, vars = { Var = "5:VarR", R7 = false, R8 = false },
    covp = { ERi = "5:ERs" }, covs = { Abar = "5:Rbar", Bbar = "5:Rbarj" },
    cv = { SD = "5:SDi", ER = "5:ERs" },
    varpf = { Covij = "5:Cov", Vi = "5:VarS" },
    beta = { Cov = "5:CovM", Corr = "5:CorrM" },
    capm = { ERi = "5:ERc", Bi = "5:Beta" },
  }
  local function boxOf(d, va)
    local m = MAP[d.id]
    if m and m[va.k] ~= nil then return m[va.k] end
    local s, k = secOf(d), va.k
    if k == "Tc" and (s == 6 or s == 8) then return "Tc" end
    local L, num = k:match("^(%a+)(%d)$")
    if s == 5 and L then
      if (d.id == "er" or d.id == "varp") and L == "R" then return "5:Si" .. num end
      if d.id == "covp" and L == "A" then return "5:Si" .. num end
      if d.id == "covp" and L == "B" then return "5:Sj" .. num end
      if (d.id == "mean" or d.id == "vars") and L == "R" then return "5:Yi" .. num end
      if d.id == "covs" and L == "A" then return "5:Yi" .. num end
      if d.id == "covs" and L == "B" then return "5:Yj" .. num end
      if d.id == "betap" and L == "B" then return "5:Bk" .. num end
    end
    return s .. ":" .. k
  end
  -- box labels: the symbol + its plain meaning (the root page's label unless set here)
  local LBL = {
    ["1:FV"] = "FV annuity value at end ($)", ["1:C"] = "C payment each period ($)", ["1:m"] = "m compounding a year",
    ["2:m"] = "m coupons a year (optional)", ["2:D0"] = "D0 dividend JUST paid ($)",
    ["3:NPV"] = "NPV net present value ($)", ["3:r"] = "r discount rate (%)", ["3:n"] = "n life of the project (years)",
    ["3:Resource"] = "Resource consumed ($)",
    ["4:COGS"] = "COGS for the year ($)", ["4:Sales"] = "Sales for the year ($)",
    ["5:ERs"] = "E(Ri) expected return i (%)", ["5:ERj"] = "E(Rj) expected return j (%)",
    ["5:VarS"] = "Var(i) variance of i", ["5:VarR"] = "Var(R) variance (past data)", ["5:Vj"] = "Var(j) variance of j",
    ["5:Rt"] = "R return in one year (%)", ["5:P0"] = "P0 price paid ($)",
    ["5:Rbar"] = "Rbar average return i (%)", ["5:Rbarj"] = "Rbar_j average return j (%)",
    ["5:Cov"] = "Cov(i,j) covariance", ["5:Corr"] = "Corr(i,j) correlation", ["5:SDi"] = "SDi SD of share i (%)",
    ["5:SDj"] = "SDj SD of share j (%)", ["5:CV"] = "CV coefficient of variation", ["5:ERp"] = "E[Rp] portfolio return (%)",
    ["5:Varp"] = "Var(p) portfolio variance", ["5:SDp"] = "SDp portfolio SD (%)",
    ["5:Beta"] = "Beta(i) beta of share i", ["5:CovM"] = "Cov(Ri,RM) with market", ["5:CorrM"] = "Corr(i,M) with market",
    ["5:SDM"] = "SDM market's SD (%)", ["5:ERc"] = "E[Ri] CAPM return (%)", ["5:ERM"] = "E[RM] market return (%)",
    ["5:MRP"] = "MRP market risk premium (%)", ["5:Bp"] = "Beta(p) portfolio beta",
    ["6:rp"] = "rp cost of preference (%)", ["6:rWACC"] = "rWACC WACC (%)",
    ["Tc"] = "Tc tax rate (%) - shared",
    ["8:rWACC"] = "rWACC WACC with tax (%)", ["8:PVITS"] = "PV(ITS) PV of tax shield ($)",
  }
  local HINT = {
    ["1:C"] = "the SAME payment each period; growing: the FIRST one (in one period)",
    ["3:r"] = "the discount rate (cost of capital) for NPV, NPVinf and EAV",
    ["3:n"] = "the life of the project (one cycle) in years: NPVinf and EAV",
    ["5:ERs"] = "share i's expected return (worked out from the states if blank)",
    ["5:SDi"] = "share i's SD = SD(Ri): CV, Corr, Var(p) and beta use it",
    ["5:Beta"] = "the share's beta: the beta line works it out, CAPM uses it",
    ["5:ERc"] = "CAPM's E[Ri]: also used as re (Cost of Capital) and rE (shares)",
    ["6:re"] = "cost of equity; blank: CAPM's E[Ri] is used when there is one",
    ["Tc"] = "company tax rate: ONE box for Cost of Capital AND the Tax World",
  }
  for k = 1, 5 do
    LBL["5:p" .. k] = "state " .. k .. ": probability (%)"
    LBL["5:Si" .. k] = "state " .. k .. ": return of i (%)"
    LBL["5:Sj" .. k] = "state " .. k .. ": return of j (%)"
    LBL["5:Bk" .. k] = "asset " .. k .. ": beta"
  end
  for k = 1, 6 do
    LBL["5:Yi" .. k] = "year " .. k .. ": return of i (%)"
    LBL["5:Yj" .. k] = "year " .. k .. ": return of j (%)"
  end
  -- the order of the boxes inside a section (the rest follow in the order the sheet's lines use them)
  local ORDER = {
    [1] = { "1:PV", "1:FVn", "1:FV", "1:C", "1:r", "1:n", "1:g", "1:EAR", "1:APR", "1:m" },
    [5] = { "5:p1", "5:Si1", "5:Sj1", "5:p2", "5:Si2", "5:Sj2", "5:p3", "5:Si3", "5:Sj3", "5:p4", "5:Si4", "5:Sj4",
            "5:p5", "5:Si5", "5:ERs", "5:ERj", "5:VarS", "5:Vj",
            "5:Yi1", "5:Yj1", "5:Yi2", "5:Yj2", "5:Yi3", "5:Yj3", "5:Yi4", "5:Yj4", "5:Yi5", "5:Yj5", "5:Yi6", "5:Yj6",
            "5:Rbar", "5:Rbarj", "5:VarR", "5:Cov", "5:Corr", "5:SDi", "5:SDj", "5:CV", "5:Rt", "5:DIV", "5:P1", "5:P0",
            "5:w1", "5:E1", "5:Bk1", "5:w2", "5:E2", "5:Bk2", "5:w3", "5:E3", "5:Bk3", "5:w4", "5:E4", "5:Bk4",
            "5:ERp", "5:Bp", "5:wi", "5:wj", "5:Varp", "5:Sharpe", "5:rf", "5:SDp" },
  }
  -- alternative lines (the same letters, a different situation): they never feed each other
  local FAM = { fv = "tvm", pv = "tvm", pva = "tvm", pvad = "tvm", fva = "tvm", fvad = "tvm", perp = "tvm", gperp = "tvm",
                gann = "tvm", bond = "bond", zbond = "bond", p0z = "share", p0g = "share", p0n = "share",
                covp = "cov", covs = "cov", ru = "mm", re = "mm" }
  -- 'blank = 0' letters (no preference shares, no tax, no CapEx); every other blank is an unknown
  local WEAKOK = { wacc = { rp = true, P = true, Tc = true }, v = { P = true }, fcf = { CapEx = true, dNWC = true } }
  -- lines that do not fit what was typed: a growth rate rules out the level formulas, a coupon the zero-coupon bond
  local function nz(known, b) return known[b] ~= nil and known[b] ~= 0 end
  local SKIP = {
    perp = function(K) return nz(K, "1:g") end, pva = function(K) return nz(K, "1:g") end,
    pvad = function(K) return nz(K, "1:g") end, fva = function(K) return nz(K, "1:g") end,
    fvad = function(K) return nz(K, "1:g") end, p0z = function(K) return nz(K, "2:g") end,
    zbond = function(K) return nz(K, "2:C") end,
    covp = function(K) return K["5:Si5"] ~= nil or K["5:p5"] ~= nil end,   -- the covariance line takes 4 states
  }
  -- the same quantity in another section (used only where that box is blank); typedOnly: only a typed value crosses
  -- an SD is the square root of its variance (one source only: two different variances of i pass nothing on)
  local BRIDGE = { { "5:ERc", "6:re" }, { "5:ERc", "2:rE" },
                   { "5:VarS", "5:SDi", false, math.sqrt, "sqrt(Var(i))", "5:VarR" },
                   { "5:VarR", "5:SDi", false, math.sqrt, "sqrt(Var(R))", "5:VarS" },
                   { "5:Vj", "5:SDj", false, math.sqrt, "sqrt(Var(j))" },
                   { "5:Varp", "5:SDp", false, math.sqrt, "sqrt(Var(p))" } }
  for _, k in ipairs({ "rU", "rE", "rD", "E", "D" }) do
    BRIDGE[#BRIDGE + 1] = { "7:" .. k, "8:" .. k, true }
    BRIDGE[#BRIDGE + 1] = { "8:" .. k, "7:" .. k, true }
  end

  ------------------------------------------------------------------ the boxes
  local BOX, SECBOX = {}, {}
  for s = 1, #SECN do SECBOX[s] = {} end
  for _, d in ipairs(DEFS) do
    local s = secOf(d)
    for _, va in ipairs(d.vars) do
      local b = boxOf(d, va)
      if b then
        local bx = BOX[b]
        if not bx then
          bx = { key = b, t = va.t, kind = va.kind, label = LBL[b] or va.label:gsub("^or: ", ""):gsub("^and: ", ""),
                 hint = HINT[b] or va.hint, sec = s }
          BOX[b] = bx
        end
        if not bx["in" .. s] then bx["in" .. s] = true; table.insert(SECBOX[s], b) end
      end
    end
  end
  for s, want in pairs(ORDER) do
    local list, used = {}, {}
    for _, b in ipairs(want) do if BOX[b] and not used[b] then list[#list + 1] = b; used[b] = true end end
    for _, b in ipairs(SECBOX[s]) do if not used[b] then list[#list + 1] = b; used[b] = true end end
    SECBOX[s] = list
  end
  local slots, slotOf = {}, {}
  for s = 1, #SECN do
    slots[#slots + 1] = { key = "#" .. s, label = s .. ". " .. SECN[s], kind = "sec", sec = s, buf = "", defBuf = "", idx = 1, defIdx = 1 }
    for _, b in ipairs(SECBOX[s]) do
      local bx = BOX[b]
      local sl = slotOf[b]
      if not sl then   -- a shared box is the SAME slot in both sections: one value
        sl = S(b, bx.label, bx.kind)
        sl.hint = bx.hint
        slotOf[b] = sl
      end
      slots[#slots + 1] = sl
    end
  end

  ------------------------------------------------------------------ solving
  local function unitOf(kind) return (kind == "pct") and "%" or ((kind == "money") and "$" or "") end
  local function short(b)   -- a box named in a 'Need' line
    local bx = BOX[b]
    if bx.label:sub(1, #bx.t) == bx.t then return bx.t end
    return (bx.label:gsub("%s*%(.-%)$", ""))
  end
  local function same(a, b) return math.abs(a - b) <= 1e-7 * math.max(1, math.abs(a), math.abs(b)) end
  local function hasGrp(d) for _, va in ipairs(d.vars) do if va.grp then return true end end return false end

  -- the letters this line can use now: typed values, and answers passed on (not from an alternative line)
  local function gather(d, known, info)
    local x, used, ntyped = {}, {}, 0
    for _, va in ipairs(d.vars) do
      local b = boxOf(d, va)
      local v = nil
      if b then v = known[b] end
      if v ~= nil then
        local inf = info[b]
        if not (inf.how == "def" and FAM[d.id] and inf.fam[FAM[d.id]]) then
          x[va.k] = v
          if inf.how == "typed" then ntyped = ntyped + 1 else used[#used + 1] = { va = va, b = b, inf = inf } end
        end
      end
    end
    -- a letter the line works out itself (V = E + P + D, E(Ri) from the states) is not taken from another line
    for j = #used, 1, -1 do
      local va = used[j].va
      if va.alt then
        local keep = x[va.k]
        x[va.k] = nil
        local ok, yes = pcall(va.alt.ok, x)
        if ok and yes == true then table.remove(used, j) else x[va.k] = keep end
      end
    end
    return x, used, ntyped
  end
  -- the unknowns, as roots.lua's solver counts them (stricter: a 'blank = 0' letter only where WEAKOK says so)
  local function blanksOf(d, x)
    local blanks, weak, filled, any = {}, {}, {}, false
    for _, va in ipairs(d.vars) do if va.grp and x[va.k] ~= nil then filled[va.grp] = true; any = true end end
    if hasGrp(d) and not any then return nil end
    for _, va in ipairs(d.vars) do
      if x[va.k] ~= nil or va.opt or va.list or (va.grp and not filled[va.grp]) or boxOf(d, va) == false then
      elseif va.alt and select(2, pcall(va.alt.ok, x)) == true then
      elseif va.weak and WEAKOK[d.id] and WEAKOK[d.id][va.k] then weak[#weak + 1] = va
      else blanks[#blanks + 1] = va end
    end
    if #blanks == 0 and #weak == 1 then blanks[1] = weak[1] end
    return blanks
  end
  -- run the root solver on one line; its output is caught and read back
  local function runDef(d, x, u)
    local rec = { calls = {} }
    setmetatable(rec, { __index = function(_, m) return function(self, ...) self.calls[#self.calls + 1] = { m, ... } end end })
    local ok = pcall(ROOT_SOLVE, d, x, rec)
    if not ok then return nil end
    local r = { ders = {}, extras = {}, xls = {}, notes = {}, offs = {} }
    local stage = ""
    for _, c in ipairs(rec.calls) do
      local m = c[1]
      if m == "need" or m == "err" then return nil, c[2]
      elseif m == "head" then stage = c[2]
      elseif m == "row" then
        if not r.main and c[6] == u.k then r.main = c
        elseif stage == "ANSWER" then r.ders[#r.ders + 1] = c
        else r.extras[#r.extras + 1] = c end
      elseif m == "xl" then
        if stage:find("^WRITE") then r.xls[#r.xls + 1] = c[2] elseif stage:find("^CHECK") then r.check = c[2] end
      elseif m == "note" then r.notes[#r.notes + 1] = c[2]
      elseif m == "off" then r.offs[#r.offs + 1] = { c[2], c[3] } end
    end
    local v = r.main and r.main[3]
    if type(v) ~= "number" or v ~= v or v == math.huge or v == -math.huge then return nil end
    r.value = v
    return r
  end

  local SHORTN = { "Financial Maths", "Bonds and Shares", "Capital Budgeting", "Working Capital", "Risk and Return",
                   "Cost of Capital", "the No Tax World", "the Tax World" }
  local function fromText(e, tok)   -- '(uses X from ...)'
    local inf = e.inf
    if inf.how == "def" then return tok .. " from " .. inf.name end
    local ft = inf.ftext or BOX[inf.from].t
    local head = (ft == tok) and tok or (tok .. " = " .. ft)
    if inf.src.how == "def" then return head .. " from " .. inf.src.name end
    return head .. " typed in " .. SHORTN[BOX[inf.from].sec]
  end

  function EVERY.solve(V, out)
    local known, info, ambig, typedK = {}, {}, {}, {}   -- typedK: what the question gives (it decides which lines fit)
    local ntyped = 0
    for b, v in pairs(V) do
      if BOX[b] and type(v) == "number" then known[b] = v; typedK[b] = v; info[b] = { how = "typed" }; ntyped = ntyped + 1 end
    end
    local function bridges()
      for _, br in ipairs(BRIDGE) do
        local from, to = br[1], br[2]
        if known[to] == nil and known[from] ~= nil and not ambig[from] and (not br[3] or info[from].how == "typed")
           and not (br[6] and known[br[6]] ~= nil) and not (br[4] and known[from] < 0) then
          known[to] = br[4] and br[4](known[from]) or known[from]
          info[to] = { how = "bridge", from = from, src = info[from], ftext = br[5] }
        end
      end
    end
    bridges()
    local results, done, failed = {}, {}, {}
    local round = 0
    while round < 12 do
      round = round + 1
      local new, newOrder = {}, {}
      for di, d in ipairs(DEFS) do
        if not done[d.id] and not failed[d.id] and not (SKIP[d.id] and SKIP[d.id](typedK)) then
          local x, used = gather(d, known, info)
          local bl = blanksOf(d, x)
          local msg = bl and #bl == 1 and d.need and select(2, pcall(d.need, x))
          if bl and #bl == 1 and not (type(msg) == "string") then
            local u = bl[1]
            local r, why = runDef(d, x, u)
            if r then
              done[d.id] = true
              local b = boxOf(d, u)
              r.d, r.u, r.b, r.used, r.round, r.di, r.x = d, u, b, used, round, di, x
              if not new[b] then new[b] = {}; newOrder[#newOrder + 1] = b end
              table.insert(new[b], r)
            else
              failed[d.id] = why or ("no value of " .. u.t .. " fits these numbers - check them (signs, % vs decimals)")
            end
          end
        end
      end
      if #newOrder == 0 then break end
      for _, b in ipairs(newOrder) do
        -- answers that agree are one answer; different answers for the same box are alternatives
        local groups = {}
        for _, r in ipairs(new[b]) do
          local g
          for _, gg in ipairs(groups) do if same(gg[1].value, r.value) then g = gg end end
          if g then g[#g + 1] = r else groups[#groups + 1] = { r } end
        end
        for gi, g in ipairs(groups) do
          local prim = g[1]
          for _, r in ipairs(g) do if boxOf(r.d, r.d.vars[1]) == b then prim = r; break end end
          prim.also = {}
          for _, r in ipairs(g) do if r ~= prim then prim.also[#prim.also + 1] = r.d.name end end
          prim.alts, prim.alt, g.prim = #groups, gi, prim
          results[#results + 1] = prim
        end
        if #groups == 1 and known[b] == nil and not ambig[b] then
          local fam = {}
          for _, r in ipairs(new[b]) do if FAM[r.d.id] then fam[FAM[r.d.id]] = true end end
          known[b] = groups[1][1].value
          info[b] = { how = "def", name = groups[1].prim.d.name, fam = fam }
          for _, r in ipairs(groups[1]) do r.passed = true end
        else
          ambig[b] = true
        end
      end
      bridges()
    end

    ------------------------------------------------------------------ the list
    out.every = {}
    local nres = 0
    table.sort(results, function(a, b2)
      local sa, sb = secOf(a.d), secOf(b2.d)
      if sa ~= sb then return sa < sb end
      if a.round ~= b2.round then return a.round < b2.round end
      return a.di < b2.di
    end)
    local nall = #results
    for _, r in ipairs(results) do for _, c in ipairs(r.extras) do if type(c[3]) == "number" then nall = nall + 1 end end end
    if #results > 0 then
      out:head("EVERY ANSWER (" .. nall .. "): pick one, I explains")
    elseif ntyped == 0 then
      out:note("Nothing typed yet: type every number the question gives, each in its section, then ENTER.")
    else
      out:err("Nothing to solve: no formula has exactly ONE blank letter (two or more blank, or all typed).")
    end
    local sec
    for _, r in ipairs(results) do
      local d, u = r.d, r.u
      local s = secOf(d)
      if s ~= sec then sec = s; out:head(s .. ". " .. SECN[s]) end
      -- how it was solved, the way the exam wants it written
      local xls = r.xls
      local eq, re, nums, ans = xls[1], nil, xls[#xls - 1], xls[#xls]
      if #xls >= 4 then re = xls[2] end
      local ex = { { "note", "the formula on the sheet:" }, { "xl", eq or d.eq } }
      if re then
        ex[#ex + 1] = { "note", "solved for " .. u.t .. ":" }
        ex[#ex + 1] = { "xl", re }
      elseif u ~= d.vars[1] then
        ex[#ex + 1] = { "note", "no tidy rearranged form: the solver tried values of " .. u.t .. " until both sides matched" }
      end
      for _, c in ipairs(r.ders) do ex[#ex + 1] = { "frm", "first " .. c[2] .. " = " .. fmtU(c[3], c[4]) .. ": " .. tostring(c[5]) } end
      ex[#ex + 1] = { "note", "your numbers in it:" }
      ex[#ex + 1] = { "xl", nums or "" }
      local zero = {}
      for _, va in ipairs(d.vars) do
        if va ~= u and WEAKOK[d.id] and WEAKOK[d.id][va.k] and r.x[va.k] == nil then zero[#zero + 1] = va.t end
      end
      if #zero > 0 then ex[#ex + 1] = { "note", "blank, so 0: " .. table.concat(zero, ", ") } end
      ex[#ex + 1] = { "val", ans or (u.t .. " = " .. fmtU(r.value, unitOf(u.kind))) }
      for _, nt in ipairs(r.notes) do if not nt:find("^no tidy") then ex[#ex + 1] = { "note", nt } end end
      if r.check then
        ex[#ex + 1] = { "note", "check (every number in):" }
        ex[#ex + 1] = { "xl", r.check }
      end
      local uses = {}
      if #r.used > 0 then
        ex[#ex + 1] = { "head", "NUMBERS FROM OTHER LINES" }
        local typedIn, tseen = {}, {}   -- typed in the other section: one phrase per section ("rU, D typed in ...")
        for _, e in ipairs(r.used) do
          local t = fromText(e, e.va.t)
          ex[#ex + 1] = { "text", t .. ": " .. fmtU(known[e.b], unitOf(e.va.kind)) }
          local where = (e.inf.how == "bridge" and e.inf.src.how == "typed" and BOX[e.inf.from].t == e.va.t) and SHORTN[BOX[e.inf.from].sec]
          if where then
            if not typedIn[where] then typedIn[where] = {}; tseen[#tseen + 1] = where; uses[#uses + 1] = where end
            table.insert(typedIn[where], e.va.t)
          else uses[#uses + 1] = t end
        end
        for j, u2 in ipairs(uses) do if typedIn[u2] then uses[j] = table.concat(typedIn[u2], ", ") .. " typed in " .. u2 end end
      end
      if #r.also > 0 then ex[#ex + 1] = { "ok", "the same answer from: " .. table.concat(r.also, "; ") } end
      if r.alts > 1 then
        ex[#ex + 1] = { "bad", "another line gives a different " .. u.t .. ": both are listed, neither is passed on. Pick the one that fits the question." }
      end
      ex[#ex + 1] = { "head", "THE LETTERS" }
      for _, va in ipairs(d.vars) do
        local b = boxOf(d, va)
        if b and (va == u or known[b] ~= nil) then
          ex[#ex + 1] = { "text", va.t .. " = " .. BOX[b].label:gsub("^%S+%s+", "") }
        end
      end
      nres = nres + 1
      local key = "ev" .. nres
      local label = d.name .. ": " .. u.t
      out.vals[key] = r.value
      table.insert(out.rows, { kind = "val", text = label .. " = " .. fmtU(r.value, unitOf(u.kind)), label = label, key = key,
                               unit = unitOf(u.kind), formula = nums, explain = ex })
      if #uses > 0 then out:note("  (uses " .. table.concat(uses, "; ") .. ")") end
      if r.alts > 1 then out:note("  (" .. r.alt .. " of " .. r.alts .. " answers for " .. u.t .. ": not passed on)") end
      out.every[#out.every + 1] = { box = r.b, value = r.value, def = d.id, chained = #r.used > 0, alts = r.alts, passed = r.passed and true or false }
      -- what the line shows besides (an SD under a variance, the yearly yield of a bond)
      for _, c in ipairs(r.extras) do
        if type(c[3]) == "number" then
          nres = nres + 1
          local k2 = "ev" .. nres
          local lab2 = d.name .. ": " .. tostring(c[2])
          out.vals[k2] = c[3]
          table.insert(out.rows, { kind = "val", text = lab2 .. " = " .. fmtU(c[3], c[4]), label = lab2, key = k2, unit = c[4], formula = c[5],
                                   explain = { { "head", d.name }, { "note", "from the answer " .. u.t .. " = " .. fmtU(r.value, unitOf(u.kind)) .. ":" },
                                               { "xl", tostring(c[2]) }, { "xl", tostring(c[5] or "") }, { "val", tostring(c[2]) .. " = " .. fmtU(c[3], c[4]) } } })
        end
      end
      out:uses(d.id)
      for _, o in ipairs(r.offs) do out:off(o[1], o[2]) end
    end

    ------------------------------------------------------------------ one value short
    local short1 = {}
    for di, d in ipairs(DEFS) do
      if not done[d.id] and not (SKIP[d.id] and SKIP[d.id](typedK)) then
        local x, _, nt = gather(d, known, info)
        if nt > 0 then
          local bl = blanksOf(d, x)
          local txt
          if failed[d.id] then txt = d.name .. ": " .. failed[d.id]
          elseif bl and #bl == 1 and d.need then
            local ok, msg = pcall(d.need, x)
            if ok and type(msg) == "string" then txt = d.name .. ": needs " .. msg end
          elseif bl and #bl == 2 then
            txt = d.name .. ": type " .. short(boxOf(d, bl[1])) .. " or " .. short(boxOf(d, bl[2]))
          end
          if txt then short1[#short1 + 1] = { d = d, nt = nt, di = di, txt = txt } end
        end
      end
    end
    local cap = (#results == 0) and 12 or 5
    local keep = {}
    for _, e in ipairs(short1) do if #results == 0 or e.nt >= 2 or failed[e.d.id] then keep[#keep + 1] = e end end
    table.sort(keep, function(a, b2) if a.nt ~= b2.nt then return a.nt > b2.nt end return a.di < b2.di end)
    while #keep > cap do table.remove(keep) end
    table.sort(keep, function(a, b2) return a.di < b2.di end)
    if #keep > 0 then
      out:head("ONE VALUE SHORT")
      local s2
      for _, e in ipairs(keep) do
        local s = secOf(e.d)
        if s ~= s2 then s2 = s; out:add("fsec", " " .. SECN[s] .. ":") end
        out:add("need", e.txt)
      end
    end
  end

  ------------------------------------------------------------------ the page
  local NOTES = [[## EVERYTHING: HOW IT WORKS
1. Type every number you know, in the box of its letter, in its part of the sheet. Rates as % (7 = 7%). Leave the rest blank.
2. ENTER. Every formula-sheet line that has all but ONE of its letters filled is solved and listed: "formula: letter = answer".
3. An answer is passed on to other lines when only ONE line gave it. It then says (uses X from ...).
4. Lines that are alternatives (annuity, annuity due, perpetuity; bond, zero-coupon bond; the share price lines; covariance from states or past data) are listed separately and are NOT passed on: pick the one that fits the question.
5. I (or click the line twice) explains an answer: the formula, the formula solved for the letter, your numbers in it, the answer and a check.
6. Nothing solved? ONE VALUE SHORT says which value each formula still needs.
## KEYS
up/down: next box (the section titles are skipped)
left/right: next / previous section
D: clear every box. ESC: home.
## THE SAME BOX IN TWO SECTIONS
Tc (company tax rate) is ONE box: Cost of Capital and the Tax World both use it.
## PASSED BETWEEN SECTIONS (when that box is blank)
E[Ri] from CAPM -> re (Cost of Capital) and rE (Bonds and Shares).
rU, rE, rD, E and D typed in one Capital Structure section are used in the other one too.
## SAME LETTER, DIFFERENT MEANING
Each section has its own boxes: C = payment (Financial Maths) but coupon (Bonds); r = rate per period, the discount rate (Capital Budgeting) or the interpolated r; n = periods, coupon periods left or the project's life; g = payment growth or dividend growth.
## LEFT OUT ON PURPOSE
A growth rate g (not 0) leaves out the level annuity and perpetuity lines; a coupon C leaves out the zero-coupon bond line; a growth g in Bonds and Shares leaves out P0 = D1/rE.]]
  local STEPS = [[## EVERYTHING: THE STEPS
1. Read the question. Every number in it goes in a box: find its letter (left/right jumps to a section).
2. Rates as % (7 = 7%), money plain (4750, 4.75k). Costs negative only where the box says so.
3. ENTER. Read the list: each line is "formula: letter = answer".
4. Pick the line the question asks for. Two lines for the same letter? The question's words decide (end or start of the period, forever or n years, with or without tax).
5. I on the line: write its formula, the numbers in it and the answer in the exam.]]
  local EXAMPLE = { ["1:C"] = 250, ["1:r"] = 0.02, ["1:n"] = 10, ["1:APR"] = 0.06, ["1:m"] = 12,
                    ["5:rf"] = 0.03, ["5:Beta"] = 1.2, ["5:ERM"] = 0.09, ["6:E"] = 600, ["6:D"] = 400, ["6:rd"] = 0.06, ["Tc"] = 0.3 }
  local ti = #TYPES + 1
  local qt = { name = "Everything: type all you know", every = true, slots = slots, solve = EVERY.solve,
               desc = "every letter on the formula sheet in one page: type all you know, every answer is listed",
               looks = "everything every letter all at once fall back", formula = {}, topline = "Type all you know (rates in %). ENTER lists every answer it can find.",
               words = "every formula-sheet line that the typed numbers can solve", letters = {}, acronyms = {},
               assume = STEPS, hints = {} }
  -- the worked example is made on first use: the solver runs on the example's numbers
  setmetatable(qt, { __index = function(tt, key)
    if key ~= "worked" then return nil end
    local out = { rows = {}, vals = {} }
    setmetatable(out, { __index = function() return function() end end })
    pcall(EVERY.solve, EXAMPLE, out)
    local w = { "## EXAMPLE (own numbers)", "TYPED:" }
    local typed = {}
    for s = 1, #SECN do
      for _, b in ipairs(SECBOX[s]) do
        local v = EXAMPLE[b]
        if v and not typed[b] then
          typed[b] = true
          w[#w + 1] = "  " .. SECN[s] .. ": " .. BOX[b].t .. " = " .. ((BOX[b].kind == "pct") and (fmtN(v * 100) .. "%") or fmtN(v))
        end
      end
    end
    w[#w + 1] = ""
    w[#w + 1] = "ENTER LISTS:"
    for _, r in ipairs(out.rows) do if r.kind == "val" then w[#w + 1] = "  " .. r.text end end
    w[#w + 1] = ""
    w[#w + 1] = "The WACC line uses re from CAPM (E[Ri]). The PV line appears three times (annuity, annuity due, perpetuity): the question's words say which one."
    local s = table.concat(w, "\n")
    rawset(tt, "worked", s)
    return s
  end })
  TYPES[ti] = qt
  FSHEET.types[ti] = {}
  for _, d in ipairs(DEFS) do table.insert(FSHEET.types[ti], d.id) end
  qt.notes = NOTES .. "\n\n" .. FSHEET.notes(ti):gsub("^## FORMULA SHEET %((%d+) for this type%)", "## THE WHOLE FORMULA SHEET (%1 lines)")
  EVERY.ti, EVERY.BOX, EVERY.SECBOX, EVERY.EXAMPLE = ti, BOX, SECBOX, EXAMPLE
  EVERY.boxOf = function(id, k)
    for _, d in ipairs(DEFS) do
      if d.id == id then for _, va in ipairs(d.vars) do if va.k == k then return boxOf(d, va) end end end
    end
    return nil
  end
end
