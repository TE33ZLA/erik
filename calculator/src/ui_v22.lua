  ------------------------------------------------------------------
  -- v22 SCREENS: home, week menus, question finder, theory, search,
  -- and the input screen with a hint line and the FIND marker.
  -- Screens v21 already had are passed through to its handlers.
  ------------------------------------------------------------------
  do
    local U = { homeSel = 1, group = 1, gsel = 1, fstack = {}, fsel = 1, want = nil, say = nil,
                tsel = 1, tlines = {}, tscroll = 0, topic = nil, q = "", hits = {}, hsel = 1, index = nil }
    local HOME = { { k = "F", t = "Find my question type", s = "answer 2 short questions: start here" } }
    for gi, g in ipairs(GROUPS) do HOME[#HOME + 1] = { k = tostring(gi), t = g.t, s = g.s, g = gi } end
    HOME[#HOME + 1] = { k = "T", t = "Theory + what-ifs (no numbers)", s = "'what happens if', true or false, explain" }
    HOME[#HOME + 1] = { k = "S", t = "Search a word from the question", s = "e.g. COUPON, BREAK-EVEN, BETA" }
    scr = "home"

    local function setc(gc, c) gc:setColorRGB(c[1], c[2], c[3]) end
    local function hiRow(gc, y, h) setc(gc, COL.selBg); gc:fillRect(2, y - 1, SW - 4, h) end
    local function footer(gc, text) setc(gc, COL.dim); gc:setFont("sansserif", "r", 9); gc:drawString(text, 4, SH - 13, "top") end
    local function title(gc, text)
      setc(gc, COL.bar); gc:fillRect(0, 0, SW, 20)
      setc(gc, COL.barTx); gc:setFont("sansserif", "b", 10); gc:drawString(text, 4, 3, "top")
    end
    -- a scrolling list of { t, s } rows; returns nothing
    local function drawRows(gc, rows, selIdx, y0, rowH, maxY, keyFn)
      local vis = math.max(1, math.floor((maxY - y0) / rowH))
      local first = 1
      if selIdx > vis then first = selIdx - vis + 1 end
      local y = y0
      for i = first, math.min(#rows, first + vis - 1) do
        if i == selIdx then hiRow(gc, y, rowH) end
        setc(gc, COL.text); gc:setFont("sansserif", "r", 10)
        local key = keyFn and keyFn(i, rows[i]) or ""
        gc:drawString((key ~= "" and (key .. "  ") or "") .. rows[i].t, 8, y, "top")
        y = y + rowH
      end
      if first + vis - 1 < #rows then setc(gc, COL.dim); gc:setFont("sansserif", "r", 9); gc:drawString("v more", SW - 45, SH - 13, "top") end
      return y
    end
    local function note(gc, text, y)
      setc(gc, COL.note); gc:setFont("sansserif", "r", 9)
      local ls = wrap(text or "", 62)
      gc:drawString(ls[1] or "", 6, y, "top")
      if ls[2] then gc:drawString(ls[2], 6, y + 11, "top") end
    end

    ------------------------------------------------------------------ home
    local function paintHome(gc)
      title(gc, "BFC2140 SOLVER " .. VERSION .. " - all weeks")
      local y = drawRows(gc, HOME, U.homeSel, 23, 15, SH - 27, function(i, r) return r.k end)
      note(gc, HOME[U.homeSel].s, SH - 26)
      footer(gc, "key or arrows + ENTER | H help | G glossary")
    end
    ------------------------------------------------------------------ week menu
    local function groupTypes() return GROUPS[U.group].types end
    local function paintGroup(gc)
      local g = GROUPS[U.group]
      title(gc, g.t:gsub("%s+", " ") .. " - pick a type")
      local rows = {}
      for _, ti in ipairs(g.types) do rows[#rows + 1] = { t = TYPES[ti].name } end
      if U.gsel > #rows then U.gsel = #rows end
      drawRows(gc, rows, U.gsel, 24, 16, SH - 40, function(i) return tostring(i) end)
      note(gc, TYPES[g.types[U.gsel]].desc, SH - 38)
      footer(gc, "number or ENTER | N notes | W worked | ESC home")
    end
    ------------------------------------------------------------------ finder
    local function fnode() return U.fstack[#U.fstack] or FINDER end
    local function paintFinder(gc)
      local nd = fnode()
      title(gc, "FIND MY QUESTION TYPE")
      setc(gc, COL.head); gc:setFont("sansserif", "b", 10); gc:drawString(nd.q, 6, 23, "top")
      if U.fsel > #nd.opts then U.fsel = #nd.opts end
      drawRows(gc, nd.opts, U.fsel, 40, 15, SH - 27, function(i) return (i < 10) and tostring(i) or (i == 10 and "0" or " ") end)
      local o = nd.opts[U.fsel]
      note(gc, o.s or (o.go and ("opens: " .. TYPES[o.go.type].name)) or (o.theory and "opens the theory pages") or "", SH - 26)
      footer(gc, "number or ENTER | ESC back")
    end
    ------------------------------------------------------------------ theory list
    local function paintTheory(gc)
      title(gc, "THEORY + WHAT-IFS - pick a topic")
      if #THEORY == 0 then
        setc(gc, COL.need); gc:setFont("sansserif", "r", 10); gc:drawString("No theory pages in this build.", 6, 30, "top")
        return
      end
      local rows = {}
      for _, t in ipairs(THEORY) do rows[#rows + 1] = { t = "Wk " .. t.week .. "  " .. t.topic } end
      drawRows(gc, rows, U.tsel, 24, 15, SH - 27)
      note(gc, (#THEORY[U.tsel].items) .. " questions, " .. (#THEORY[U.tsel].rules) .. " what-if rules", SH - 26)
      footer(gc, "arrows + ENTER | week number jumps | S search")
    end
    local function buildTopic(ti)
      local t = THEORY[ti]
      local L = {}
      local function add(kind, text, width) for _, ln in ipairs(wrap(text, width or 46)) do L[#L + 1] = { kind = kind, text = ln } end end
      L[#L + 1] = { kind = "head", text = "WHAT IF... (the rules)" }
      for _, r in ipairs(t.rules) do add("xl", "- " .. r, 48) end
      local starts = {}
      for ii, it in ipairs(t.items) do
        L[#L + 1] = ""
        starts[ii] = #L + 1
        add("head", "Q" .. ii .. ". " .. it.q, 44)
        add("val", it.a)
        add("text", "Why: " .. it.why)
        if it.trap and it.trap ~= "" then add("bad", "Trap: " .. it.trap) end
      end
      U.tlines, U.topic, U.starts = L, ti, starts
    end
    local function openTopic(ti, item)
      buildTopic(ti)
      U.tsel = ti
      U.tscroll = item and math.max(0, U.starts[item] - 1) or 0
      if scr ~= "tpage" then U.tback = scr end
      scr = "tpage"
      inval()
    end
    local function findTopic(word)
      for ti, t in ipairs(THEORY) do if t.topic:lower():find(word, 1, true) then return ti end end
      for ti, t in ipairs(THEORY) do
        for _, it in ipairs(t.items) do if (it.words or ""):find(word, 1, true) then return ti end end
      end
      return nil
    end
    ------------------------------------------------------------------ search
    local function buildIndex()
      local ix = {}
      for ti, qt in ipairs(TYPES) do
        local parts = { qt.name, qt.desc or "", qt.looks or "", qt.words or "" }
        for _, sl in ipairs(qt.slots) do parts[#parts + 1] = sl.label end
        ix[#ix + 1] = { kind = 1, t = "SOLVE: " .. qt.name, text = table.concat(parts, " "):lower(), ti = ti }
      end
      for ti, t in ipairs(THEORY) do
        for ii, it in ipairs(t.items) do
          ix[#ix + 1] = { kind = 2, t = "THEORY: " .. it.q, text = (it.q .. " " .. it.a .. " " .. (it.words or "") .. " " .. t.topic):lower(), topic = ti, item = ii }
        end
        for _, r in ipairs(t.rules) do ix[#ix + 1] = { kind = 2, t = "RULE: " .. r, text = (r .. " " .. t.topic):lower(), topic = ti } end
      end
      if #gEntries == 0 then buildGlossary() end
      for gi, e in ipairs(gEntries) do
        local body = {}
        local k2 = e.line + 1
        while glines[k2] and not (type(glines[k2]) == "table" and glines[k2].kind == "head") do
          local g2 = glines[k2]; body[#body + 1] = type(g2) == "table" and (g2.text or "") or g2; k2 = k2 + 1
        end
        ix[#ix + 1] = { kind = 3, t = "WORD: " .. e.head, text = (e.head .. " " .. table.concat(body, " ")):lower(), gi = gi }
      end
      U.index = ix
    end
    local function runSearch()
      U.hits, U.hsel = {}, 1
      local toks = {}
      for w in U.q:lower():gmatch("[%w%-/%%]+") do if #w >= 2 or tonumber(w) then toks[#toks + 1] = w end end
      if #toks == 0 then return end
      if not U.index then buildIndex() end
      for _, e in ipairs(U.index) do
        local sc, all = 0, true
        for _, w in ipairs(toks) do
          local a = e.text:find(w, 1, true)
          if not a then all = false; break end
          sc = sc + #w + ((a == 1 or e.text:sub(a - 1, a - 1):find("[%s%(]")) and 3 or 0)
        end
        if all then U.hits[#U.hits + 1] = { e = e, sc = sc * 10 - e.kind } end
      end
      table.sort(U.hits, function(a, b) return a.sc > b.sc end)
      while #U.hits > 40 do table.remove(U.hits) end
    end
    local function paintSearch(gc)
      title(gc, "SEARCH - type a word, ENTER opens")
      setc(gc, COL.val); gc:setFont("sansserif", "b", 11)
      gc:drawString("> " .. U.q .. "_", 6, 24, "top")
      if U.q == "" then
        note(gc, "Type a word from the question, e.g. COUPON, PERPETUITY, BETA, BREAK-EVEN, 2/10. Letters and numbers both work.", 44)
      elseif #U.hits == 0 then
        setc(gc, COL.need); gc:setFont("sansserif", "r", 10); gc:drawString("nothing found - try a shorter word", 6, 44, "top")
      else
        local rows = {}
        for _, h in ipairs(U.hits) do rows[#rows + 1] = { t = h.e.t } end
        drawRows(gc, rows, U.hsel, 44, 15, SH - 40)
        note(gc, U.hits[U.hsel].e.t, SH - 38)   -- the whole of the picked line (the list cuts long ones)
      end
      footer(gc, "type | up/down pick | ENTER open | ESC home")
    end
    ------------------------------------------------------------------ input
    local function paintInput2(gc)
      local qt = TYPES[curT]
      title(gc, qt.name)
      local y = 23
      setc(gc, COL.head)
      for _, f in ipairs(qt.formula or {}) do y = y + drawMathLine(gc, f, 6, y, 10, SW - 10) end
      local list = visSlots()
      if U.want or U.say then
        gc:setFont("sansserif", "b", 9)
        local wl = nil
        for _, sl in ipairs(list) do if sl.key == U.want then wl = sl.label end end
        setc(gc, COL.need)
        local msg = (wl and ("FIND: " .. wl:gsub("%s*%(.*$", "") .. " - leave its box blank") or "") .. ((wl and U.say) and " | " or "") .. (U.say or "")
        for _, ln in ipairs(wrap(msg, 60)) do gc:drawString(ln, 6, y, "top"); y = y + 11 end
      end
      setc(gc, COL.dim); gc:drawLine(2, y + 1, SW - 2, y + 1)
      y = y + 4
      inputTop = y
      if sel > #list then sel = #list end
      local rowH = 16
      local visN = math.max(1, math.floor((SH - inputTop - 27) / rowH))
      if sel - 1 < scrollI then scrollI = sel - 1 end
      if sel > scrollI + visN then scrollI = sel - visN end
      for i = scrollI + 1, math.min(#list, scrollI + visN) do
        local sl = list[i]
        if i == sel then hiRow(gc, y, rowH) end
        gc:setFont("sansserif", "r", 10)
        setc(gc, (sl.key == U.want) and COL.need or COL.text)
        gc:drawString(sl.label, 8, y, "top")
        if sl.kind == "choice" then
          -- right-aligned, so a long choice can use the space after a short label; smaller if it still does not fit
          local txt = "< " .. sl.opts[sl.idx] .. " >"
          local lend = 8 + gc:getStringWidth(sl.label) + 8
          local w = gc:getStringWidth(txt)
          if lend + w > SW - 4 then gc:setFont("sansserif", "r", 9); w = gc:getStringWidth(txt) end
          while lend + w > SW - 4 and #txt > 8 do txt = txt:sub(1, -5) .. ".. >"; w = gc:getStringWidth(txt) end
          setc(gc, COL.val); gc:drawString(txt, math.max(lend, SW - 6 - w), y, "top")
          gc:setFont("sansserif", "r", 10)
        else
          local shown = sl.buf
          if shown == "" then
            setc(gc, (sl.key == U.want) and COL.need or COL.dim)
            shown = (sl.key == U.want) and ((i == sel) and "_  FIND" or "FIND") or ((i == sel) and "_" or "-")
          else
            setc(gc, COL.val)
            if i == sel then shown = shown .. "_" end
          end
          gc:drawString(shown, 188, y, "top")
        end
        y = y + rowH
      end
      local cur = list[sel]
      setc(gc, COL.note); gc:setFont("sansserif", "r", 9)
      gc:drawString((cur and cur.hint) and ("? " .. cur.hint) or "", 4, SH - 25, "top")
      footer(gc, "ENTER solve | D clear | N notes | W worked | H help")
      if scrollI + visN < #list then setc(gc, COL.dim); gc:drawString("v more", SW - 45, SH - 13, "top") end
    end

    ------------------------------------------------------------------ open a type (from the finder or search)
    local firstBox
    local function openFrom(go)
      local qt = TYPES[go.type]
      for _, sl in ipairs(qt.slots) do sl.buf = sl.defBuf; sl.idx = sl.defIdx end
      for key, val in pairs(go.set or {}) do
        for _, sl in ipairs(qt.slots) do
          if sl.key == key then
            if sl.kind == "choice" then
              for oi, o in ipairs(sl.opts) do if o:lower():find(val:lower(), 1, true) == 1 then sl.idx = oi; break end end
            else sl.buf = val end
          end
        end
      end
      U.want, U.say = go.want, go.say
      U.group = qt.group or 1
      for i, ti in ipairs(GROUPS[U.group].types) do if ti == go.type then U.gsel = i end end
      openType(go.type)
      firstBox()   -- the cursor starts on the first box the question gives (not the unknown)
    end
    function firstBox()
      for i, sl in ipairs(visSlots()) do if sl.kind ~= "choice" and sl.key ~= U.want then sel = i; return end end
    end
    local function openGroupType(i)
      local ti = GROUPS[U.group].types[i]
      if not ti then return end
      U.gsel, U.want, U.say = i, nil, nil
      openType(ti)
      firstBox()
    end
    local function finderPick(i)
      local o = fnode().opts[i]
      if not o then return end
      if o.kids then table.insert(U.fstack, o.kids); U.fsel = 1; inval(); return end
      if o.go then openFrom(o.go); return end
      if o.theory then
        local ti = type(o.theory) == "string" and findTopic(o.theory) or nil
        if ti then openTopic(ti) else U.tsel = 1; scr = "theory"; inval() end
      end
    end
    local function openHit(h)
      if not h then return end
      local e = h.e
      if e.kind == 1 then openFrom({ type = e.ti })
      elseif e.kind == 2 then openTopic(e.topic, e.item)
      else gSel = e.gi; toGlossary() end
    end
    local function homePick(i)
      local h = HOME[i]
      if not h then return end
      if h.k == "F" then U.fstack, U.fsel = {}, 1; scr = "finder"
      elseif h.k == "T" then scr = "theory"
      elseif h.k == "S" then U.q, U.hits = "", {}; scr = "search"
      else U.group, U.gsel = h.g, 1; scr = "menu" end
      inval()
    end

    ------------------------------------------------------------------ event plumbing
    local old = { paint = on.paint, arrowKey = on.arrowKey, enterKey = on.enterKey, escapeKey = on.escapeKey,
                  charIn = on.charIn, backspaceKey = on.backspaceKey, mouseDown = on.mouseDown, deleteKey = on.deleteKey }
    local NEW = { home = true, menu = true, finder = true, theory = true, search = true, input = true }

    function on.paint(gc)
      if NEW[scr] then
        gridHits, gHits, rHits = {}, {}, {}
        setc(gc, COL.bg); gc:fillRect(0, 0, SW, SH)
        if scr == "home" then paintHome(gc)
        elseif scr == "menu" then paintGroup(gc)
        elseif scr == "finder" then paintFinder(gc)
        elseif scr == "theory" then paintTheory(gc)
        elseif scr == "search" then paintSearch(gc)
        else paintInput2(gc) end
        return
      end
      if scr == "tpage" then
        setc(gc, COL.bg); gc:fillRect(0, 0, SW, SH)
        local t = THEORY[U.topic]
        paintList(gc, U.tlines, U.tscroll, "Wk " .. t.week .. ": " .. t.topic, "arrows scroll | S search | ESC topics")
        return
      end
      old.paint(gc)
    end

    local function move(cur, n, key)
      if key == "up" then return (cur - 2) % n + 1 end
      if key == "down" then return cur % n + 1 end
      return cur
    end
    function on.arrowKey(key)
      if scr == "home" then U.homeSel = move(U.homeSel, #HOME, key)
      elseif scr == "menu" then U.gsel = move(U.gsel, #groupTypes(), key)
      elseif scr == "finder" then U.fsel = move(U.fsel, #fnode().opts, key)
      elseif scr == "theory" and #THEORY > 0 then U.tsel = move(U.tsel, #THEORY, key)
      elseif scr == "search" and #U.hits > 0 then U.hsel = move(U.hsel, #U.hits, key)
      elseif scr == "tpage" then U.tscroll = scrollList(key, U.tscroll, #U.tlines)
      else old.arrowKey(key); return end
      inval()
    end
    function on.enterKey()
      if scr == "home" then homePick(U.homeSel)
      elseif scr == "menu" then openGroupType(U.gsel)
      elseif scr == "finder" then finderPick(U.fsel)
      elseif scr == "theory" then if #THEORY > 0 then openTopic(U.tsel) end
      elseif scr == "search" then openHit(U.hits[U.hsel])
      elseif scr == "tpage" then return
      else old.enterKey() end
    end
    function on.returnKey() on.enterKey() end
    function on.escapeKey()
      if scr == "home" then return end
      if scr == "menu" or scr == "theory" or scr == "search" then scr = "home"
      elseif scr == "finder" then
        if #U.fstack > 0 then table.remove(U.fstack); U.fsel = 1 else scr = "home" end
      elseif scr == "tpage" then scr = (U.tback == "search") and "search" or "theory"
      elseif scr == "input" then
        U.want, U.say = nil, nil
        U.group = TYPES[curT].group or U.group
        for i, ti in ipairs(GROUPS[U.group].types) do if ti == curT then U.gsel = i end end
        scr = "menu"
      else old.escapeKey(); return end
      inval()
    end
    function on.backspaceKey()
      if scr == "search" then U.q = U.q:sub(1, -2); runSearch(); inval(); return end
      old.backspaceKey()
    end
    function on.deleteKey()
      if scr == "search" then U.q = ""; U.hits = {}; inval(); return end
      old.deleteKey()
    end
    function on.clearKey() on.deleteKey() end
    function on.charIn(ch)
      if ch == "\226\136\146" then ch = "-" end
      local cl = ch:lower()
      if scr == "search" then
        if ch:find("^[%w%s%-/%%%.]$") and #U.q < 24 then U.q = U.q .. ch; runSearch(); inval() end
        return
      end
      if scr == "home" then
        if cl == "h" then toHelp(); return end
        if cl == "g" then toGlossary(); return end
        for i, h in ipairs(HOME) do if h.k:lower() == cl then U.homeSel = i; homePick(i); return end end
        return
      end
      if scr == "menu" then
        local d = tonumber(ch)
        if d and GROUPS[U.group].types[d] then openGroupType(d); return end
        if cl == "n" or cl == "a" or cl == "w" then
          curT = GROUPS[U.group].types[U.gsel]
          if cl == "n" then toNotes() elseif cl == "a" then toAssume() else toWorked() end
          return
        end
        if cl == "h" then toHelp(); return end
        if cl == "g" then toGlossary(); return end
        return
      end
      if scr == "finder" then
        local d = tonumber(ch)
        if d then finderPick(d == 0 and 10 or d) end
        if cl == "h" then toHelp() end
        return
      end
      if scr == "theory" or scr == "tpage" then
        if cl == "s" then U.q, U.hits = "", {}; scr = "search"; inval() end
        if cl == "h" then toHelp() end
        local d = tonumber(ch)
        if d and scr == "theory" then   -- a week number jumps to that week's first topic (0 = weeks 10-11)
          local wk = (d == 0) and "10" or tostring(d)
          for ti, t in ipairs(THEORY) do if t.week:sub(1, #wk) == wk then U.tsel = ti; inval(); break end end
        end
        return
      end
      old.charIn(ch)
    end
    function on.mouseDown(mx, my)
      if scr == "home" then
        local i = math.floor((my - 23) / 15) + 1
        if HOME[i] and my >= 23 then if i == U.homeSel then homePick(i) else U.homeSel = i; inval() end end
        return
      end
      if scr == "menu" then
        local i = math.floor((my - 24) / 16) + 1
        if groupTypes()[i] and my >= 24 then openGroupType(i) end
        return
      end
      if scr == "finder" then
        local i = math.floor((my - 40) / 15) + 1
        if fnode().opts[i] and my >= 40 then finderPick(i) end
        return
      end
      if scr == "theory" or scr == "search" or scr == "tpage" then return end
      old.mouseDown(mx, my)
    end
    CORE.U = U
    CORE.runSearch = runSearch
  end
