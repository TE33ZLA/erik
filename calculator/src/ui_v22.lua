  ------------------------------------------------------------------
  -- v22 SCREENS: home, week menus, question finder, theory, search,
  -- and the input screen with a hint line and the FIND marker.
  -- Screens v21 already had are passed through to its handlers.
  ------------------------------------------------------------------
  do
    local U = { wsel = 1, bsel = 1, csel = 1, smode = nil, homeSel = 1, group = 1, gsel = 1, fstack = {}, fsel = 1, want = nil, say = nil, qsel = 1, ssel = 1,
                tsel = 1, tlines = {}, tscroll = 0, topic = nil, q = "", hits = {}, hsel = 1, index = nil, mt = nil, msel = 1,
                rlev = 1, rg = 1, rsel = 1 }
    -- home: the exam's parts first (A multiple choice, B numbers, C written + Excel), then the other ways in;
    -- the week digits 1-8 still work as keys on home
    local HOME = { { k = "A", t = "Part A: multiple choice -> definitions", s = "type 2-3 words from the question: definitions and rules first" },
                   { k = "B", t = "Part B: numbers -> the right page", s = "all the ways to find a page: finder, multi-step, search, weeks" },
                   { k = "C", t = "Part C: written + Excel answers", s = "how to answer 'why' parts and Excel tables / trees; the number pages" },
                   { k = "F", t = "Find my question type", s = "answer 2 short questions" },
                   { k = "M", t = "Multi-step: questions that mix topics", s = "e.g. a cash flow, then its PV; rE + rD + rP, then the WACC" },
                   { k = "W", t = "Weeks 1-8 (or press the week number)", s = "1 Wk1-2 TVM, 2 bonds/shares, 3 projects, 4 risk, 5 WC, 6 CAPM, 7 WACC/MM, 8 payout" },
                   { k = "R", t = "Root formulas: fill the slots", s = "every formula-sheet line: fill what you know, leave ONE slot blank" },
                   { k = "L", t = "Legend: every letter on the sheet", s = "what each letter of the formula sheet means, in the sheet's order" },
                   { k = "T", t = "Theory + what-ifs (no numbers)", s = "'what happens if', true or false, explain" },
                   { k = "S", t = "Search a word from the question", s = "e.g. COUPON, BREAK-EVEN, BETA" } }
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
      local y = drawRows(gc, HOME, U.homeSel, 23, 13, SH - 27, function(i, r) return r.k end)
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
      note(gc, o.s or (o.go and ("opens: " .. TYPES[o.go.type].name)) or (o.theory and "opens the theory pages")
               or (o.recipe and "several steps: opens M, each step on its own page") or "", SH - 26)
      footer(gc, "number or ENTER | ESC back")
    end
    ------------------------------------------------------------------ kinds of question (a type with a mode)
    -- a type with several kinds of question opens this numbered list first, so nothing hides behind left/right
    local function modeSlotOf(ti)
      local qt = TYPES[ti]
      for _, sl in ipairs(qt and qt.slots or {}) do
        if sl.key == "mode" and sl.kind == "choice" and #sl.opts > 1 then return sl end
      end
      return nil
    end
    local function paintModes(gc)
      local qt, sl = TYPES[U.mt], modeSlotOf(U.mt)
      title(gc, qt.name)
      setc(gc, COL.head); gc:setFont("sansserif", "b", 10); gc:drawString("What does the question ask for?", 6, 23, "top")
      local rows = {}
      for _, o in ipairs(sl.opts) do rows[#rows + 1] = { t = o } end
      if U.msel > #rows then U.msel = #rows end
      drawRows(gc, rows, U.msel, 40, 14, SH - 39, function(i) return (i == 10) and "0" or tostring(i) end)
      -- when to pick the highlighted kind (two lines), so the right one is clear
      setc(gc, COL.dim); gc:drawLine(2, SH - 39, SW - 2, SH - 39)
      note(gc, (qt.modeHelp and qt.modeHelp[U.msel]) and ("PICK WHEN: " .. qt.modeHelp[U.msel]) or "ENTER opens a page with only the boxes this kind needs", SH - 37)
      footer(gc, "number or ENTER | N notes | W worked | ESC back")
    end
    ------------------------------------------------------------------ root formulas: the sheet's lines as pages of slots
    local function rootRows()
      if U.rlev == 1 then
        local rows = {}
        for _, g2 in ipairs(ROOTMENU or {}) do rows[#rows + 1] = { t = g2.t } end
        return rows
      end
      local rows = {}
      for _, ti in ipairs(ROOTMENU[U.rg].types) do rows[#rows + 1] = { t = TYPES[ti].root.name, ti = ti } end
      return rows
    end
    local function paintRoots(gc)
      local rows = rootRows()
      if U.rsel > #rows then U.rsel = #rows end
      if U.rsel < 1 then U.rsel = 1 end
      title(gc, (U.rlev == 1) and "ROOT FORMULAS - the formula sheet" or ROOTMENU[U.rg].t)
      setc(gc, COL.head); gc:setFont("sansserif", "b", 10)
      gc:drawString((U.rlev == 1) and "Which part of the sheet?" or "Which formula?", 6, 23, "top")
      drawRows(gc, rows, U.rsel, 40, 15, SH - 27, function(i) return (i < 10) and tostring(i) or "" end)
      local r = rows[U.rsel]
      note(gc, (U.rlev == 1) and "then pick the formula: fill what you know, leave ONE slot blank, ENTER"
                 or (r and TYPES[r.ti].root.eq or ""), SH - 26)
      footer(gc, "number or ENTER | ESC back")
    end
    local function rootPick(i)
      local rows = rootRows()
      if not rows[i] then return end
      if U.rlev == 1 then U.rg, U.rlev, U.rsel = i, 2, 1; inval(); return end
      U.rsel, U.want, U.say = i, nil, nil
      openType(rows[i].ti)      -- a formula page has no choice row: the cursor starts on its first slot
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
      footer(gc, "arrows + ENTER | 1-9 a week, 0 = Wk 10-12 | S search")
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
    -- words that find the theory topic of each question type (key Y)
    local TYPE_TOPIC = { "time value|compound", "annuit|perpetuit", "loan|amortis", "bond basics|bond", "bond yields|bond",
      "shares|dividend", "npv|irr|capital budget", "lives|eaa|replace", "fcf|relevant", "apr|ear|rate",
      "break-even|forecast", "decision tree|expected", "probabilit", "cycle|working capital", "trade credit",
      "credit policy|receivable", "return|risk", "portfolio|correlation", "capm|beta|sml", "wacc|cost of", "capital structure|mm",
      "replacement|replace", "dividends|payout" }
    local function topicForType(ti)
      for word in (TYPE_TOPIC[ti] or ""):gmatch("[^|]+") do
        for k2, t in ipairs(THEORY) do if t.topic:lower():find(word, 1, true) then return k2 end end
      end
      return nil
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
        -- the whole topic page, found by its name ('formula when', 'no taxes')
        ix[#ix + 1] = { kind = 2, rank = 1.5, notitle = true, t = "TOPIC: Wk " .. t.week .. " " .. t.topic, text = t.topic:lower(), topic = ti }
        for ii, it in ipairs(t.items) do
          ix[#ix + 1] = { kind = 2, t = "THEORY: " .. it.q, text = (it.q .. " " .. it.a .. " " .. (it.words or "") .. " " .. t.topic):lower(), topic = ti, item = ii,
                          prev = it.a }
        end
        for _, r in ipairs(t.rules) do ix[#ix + 1] = { kind = 2, t = "RULE: " .. r, text = (r .. " " .. t.topic):lower(), topic = ti } end
      end
      -- the multi-step questions (M), found by the words such questions use
      for ri, R in ipairs(RECIPES or {}) do
        ix[#ix + 1] = { kind = 4, rank = 0.5, t = "MULTI-STEP (M " .. RECIPE_KEY(ri) .. "): " .. R.t,
                        text = (R.t .. " " .. R.s .. " " .. R.how .. " " .. (R.words or "")):lower(), ri = ri }
      end
      if #gEntries == 0 then buildGlossary() end
      for gi, e in ipairs(gEntries) do
        local body = {}
        local k2 = e.line + 1
        while glines[k2] and not (type(glines[k2]) == "table" and glines[k2].kind == "head") do
          local g2 = glines[k2]; body[#body + 1] = type(g2) == "table" and (g2.text or "") or g2; k2 = k2 + 1
        end
        ix[#ix + 1] = { kind = 3, t = "WORD: " .. e.head, text = (e.head .. " " .. table.concat(body, " ")):lower(), gi = gi,
                        prev = table.concat(body, " "):gsub("%-> TYPE %d+", "") }
      end
      U.index = ix
    end
    -- question words that say nothing about the topic ("which of the following is TRUE about a firm's ...")
    local STOP = {}
    for w in ("which what the of following are is a an in to for and or does do did its it this that these be by on" ..
              " with as at from will would should not true false statement statements correct best describes about"):gmatch("%S+") do STOP[w] = true end
    local function findWord(text, w)
      if #w <= 3 then   -- a short word (no, npv, pi) only as a whole word, not inside 'now' or 'pick'
        return text:find("%f[%w]" .. w:gsub("%W", "%%%0") .. "%f[%W]")
      end
      local a = text:find(w, 1, true)
      if not a and #w > 4 then   -- included -> includ, dividends -> dividend, paying -> pay
        local stem = w:gsub("ing$", ""):gsub("ed$", ""):gsub("es$", ""):gsub("s$", "")
        if #stem >= 3 and stem ~= w then a = text:find(stem, 1, true) end
      end
      return a
    end
    local function runSearch()
      U.hits, U.hsel = {}, 1
      local toks, seen = {}, {}
      for w in U.q:lower():gsub("(%a)&(%a)", "%1%2"):gmatch("[%w%-/%%]+") do   -- M&M -> mm
        if (#w >= 2 or tonumber(w)) and not STOP[w] and not seen[w] then toks[#toks + 1] = w; seen[w] = true end
      end
      if #toks == 0 then return end
      if not U.index then buildIndex() end
      -- one or two words: every one must be there; more (words typed from the question): most of them, best first
      local need = (#toks <= 2) and #toks or math.max(2, math.ceil(#toks / 2))
      local partA = (U.smode == "A")   -- Part A: definitions and theory only, glossary words first
      for _, e in ipairs(U.index) do
        if not (partA and (e.kind == 1 or e.kind == 4)) then
          local sc, m = 0, 0
          local tl = e.t:lower()
          for _, w in ipairs(toks) do
            local a = findWord(e.text, w)
            if a then
              m = m + 1
              sc = sc + #w + ((a == 1 or e.text:sub(a - 1, a - 1):find("[%s%(]")) and 3 or 0)
              if not e.notitle and findWord(tl, w) then sc = sc + 4 end   -- the word is in the question / name itself
            end
          end
          if m >= need then U.hits[#U.hits + 1] = { e = e, sc = m * 1000 + sc * 10 - (e.rank or e.kind) + ((partA and e.kind == 3) and 500 or 0) } end
        end
      end
      table.sort(U.hits, function(a, b) return a.sc > b.sc end)
      while #U.hits > 40 do table.remove(U.hits) end
    end
    local function paintSearch(gc)
      title(gc, (U.smode == "A") and "PART A - words from the question" or "SEARCH - type a word, ENTER opens")
      setc(gc, COL.val); gc:setFont("sansserif", "b", 11)
      local shown = U.q
      while #shown > 4 and gc:getStringWidth("> .." .. shown .. "_") > SW - 12 do shown = shown:sub(2) end   -- a long question: show its end
      gc:drawString("> " .. ((shown ~= U.q) and ".." or "") .. shown .. "_", 6, 24, "top")
      if U.q == "" then
        note(gc, (U.smode == "A") and "Type 2-3 key words, e.g. SHORT-TERM LONG-TERM, M&M, LOWEST RISK. WORD = a definition; THEORY = a question card with its answer."
                 or "Type 1-3 key words from the question, e.g. CAPITAL STRUCTURE, COUPON, BETA, 2/10. THEORY lines answer 'which of the following' and true/false.", 44)
      elseif #U.hits == 0 then
        setc(gc, COL.need); gc:setFont("sansserif", "r", 10); gc:drawString("nothing found - try a shorter word", 6, 44, "top")
      else
        local rows = {}
        for _, h in ipairs(U.hits) do rows[#rows + 1] = { t = h.e.t } end
        drawRows(gc, rows, U.hsel, 44, 15, SH - 40)
        local e = U.hits[U.hsel].e
        -- Part A: a preview of the definition (or the card's answer); else the whole of the picked line
        note(gc, (U.smode == "A" and e.prev) and (e.t:gsub("^%u+: ", "") .. ": " .. e.prev) or e.t, SH - 38)
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
        local inStep = U.say and U.say:find("^STEP") ~= nil     -- a multi-step banner: keep it to two lines
        local msg = (wl and ("FIND: " .. wl:gsub("%s*%(.*$", "") .. (inStep and "" or " - leave its box blank")) or "") .. ((wl and U.say) and " | " or "") .. (U.say or "")
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
    local function openModes(ti)
      local sl = modeSlotOf(ti)
      U.mt, U.msel = ti, sl and sl.idx or 1
      curT = ti
      scr = "modes"
      inval()
    end
    local function pickMode(i)
      local sl = modeSlotOf(U.mt)
      if not (sl and sl.opts[i]) then return end
      sl.idx = i
      U.want, U.say = nil, nil
      openType(U.mt)
      firstBox()
    end
    local function openGroupType(i)
      local ti = GROUPS[U.group].types[i]
      if not ti then return end
      U.gsel, U.want, U.say = i, nil, nil
      if modeSlotOf(ti) then openModes(ti); return end
      openType(ti)
      firstBox()
    end
    local openRecipes, openRecipe   -- the multi-step list and one recipe's steps (defined further down)
    local function finderPick(i)
      local o = fnode().opts[i]
      if not o then return end
      if o.kids then table.insert(U.fstack, o.kids); U.fsel = 1; inval(); return end
      if o.go then openFrom(o.go); return end
      if o.recipes then openRecipes(); return end
      if o.recipe then   -- one multi-step question, by the start of its title
        for ri, R in ipairs(RECIPES or {}) do if R.t:find(o.recipe, 1, true) == 1 then openRecipe(ri); return end end
      end
      if o.theory then
        local ti = type(o.theory) == "string" and findTopic(o.theory) or nil
        if ti then openTopic(ti) else U.tsel = 1; scr = "theory"; inval() end
      end
    end
    local function openHit(h)
      if not h then return end
      local e = h.e
      if e.kind == 1 then
        openFrom({ type = e.ti })
        if modeSlotOf(e.ti) then openModes(e.ti) end
      elseif e.kind == 2 then openTopic(e.topic, e.item)
      elseif e.kind == 4 then openRecipe(e.ri)
      else gSel = e.gi; toGlossary() end
    end
    ------------------------------------------------------------------ multi-step questions (key M): recipes
    -- U.rec = { ri = recipe, k = step, bag = { box key = number } } while a recipe runs
    local function carryBuf(sl, v)
      local x = (sl.kind == "pct") and v * 100 or v
      local s = string.format("%.6f", x):gsub("0+$", ""):gsub("%.$", "")
      return s
    end
    local function startStep(ri, k)
      local R = RECIPES[ri]
      local st = R and R.steps[k]
      if not st then return end
      if not (U.rec and U.rec.ri == ri) then U.rec = { ri = ri, bag = {}, kept = {} } end
      U.rec.k = k
      local go = { type = st.go.type, want = st.go.want, set = {} }
      for key, val in pairs(st.go.set or {}) do go.set[key] = val end
      for _, sl in ipairs(TYPES[go.type].slots) do
        local v = U.rec.bag[sl.key]
        if v and sl.kind ~= "choice" then go.set[sl.key] = carryBuf(sl, v)
        elseif U.rec.kept[sl.key] and sl.kind ~= "choice" then go.set[sl.key] = U.rec.kept[sl.key] end
      end
      go.say = "STEP " .. k .. "/" .. #R.steps .. ": " .. st.say
      openFrom(go)
    end
    local function recipeNext()
      local R = U.rec and RECIPES[U.rec.ri]
      local nk = R and (R.steps[U.rec.k].nxt or U.rec.k + 1)
      if R and R.steps[nk] then startStep(U.rec.ri, nk) end
    end
    -- after ENTER on a recipe step: keep the numbers later steps need, and say what comes next (top of the answer)
    function RESULT_HOOK(out, ti)
      local R = U.rec and RECIPES[U.rec.ri]
      local st = R and R.steps[U.rec.k]
      if not (st and st.go.type == ti) then
        -- not in a multi-step question: say where the usual NEXT step is (before the formula sheet)
        local nxt = {}
        for ri, R2 in ipairs(RECIPES or {}) do
          for k, st2 in ipairs(R2.steps) do
            local nx = R2.steps[st2.nxt or (k + 1)]
            if st2.go.type == ti and nx and nx.go.type ~= ti and #nxt < 2 then
              nxt[#nxt + 1] = { kind = "note", text = "often next: " .. nx.t .. " (page " .. nx.page .. "), or home M " .. RECIPE_KEY(ri) .. " carries it" }
            end
          end
        end
        if #nxt > 0 then
          local at = #out.rows + 1
          for i, r in ipairs(out.rows) do if r.kind == "head" and r.text:find("^FORMULA SHEET") then at = i; break end end
          table.insert(out.rows, at, { kind = "head", text = "MULTI-STEP? THE NEXT PAGE" })
          for j, r in ipairs(nxt) do table.insert(out.rows, at + j, r) end
        end
        return
      end
      local carried = {}
      for from, to in pairs(st.take or {}) do
        local v = out.vals[from]
        if type(v) == "number" then
          U.rec.bag[to] = v
          local shown = fmtN(v)
          for k2 = U.rec.k + 1, #R.steps do             -- shown as it will be typed in the later box (rates in %)
            for _, sl in ipairs(TYPES[R.steps[k2].go.type].slots) do
              if sl.key == to and sl.kind ~= "choice" then shown = carryBuf(sl, v) .. ((sl.kind == "pct") and "%" or "") end
            end
          end
          carried[#carried + 1] = to .. " = " .. shown
        end
      end
      for _, key in ipairs(st.keep or {}) do          -- boxes typed on this page that later steps reuse (Tc, k)
        for _, sl in ipairs(TYPES[ti].slots) do
          if sl.key == key and sl.kind ~= "choice" and sl.buf ~= "" then
            U.rec.kept[key] = sl.buf; carried[#carried + 1] = key .. " = " .. sl.buf
          end
        end
      end
      -- this step's answer line(s), copied to the top so the right number is easy to find
      local ans = {}
      local reads = type(st.read) == "table" and st.read or { st.read }
      for _, key in ipairs(reads) do
        for _, r in ipairs(out.rows) do
          if r.kind == "val" and r.key == key then
            ans[#ans + 1] = { kind = "ok", text = (r.text:find("^ANSWER") and "" or "ANSWER: ") .. r.text }; break
          end
        end
      end
      local top = {}
      local nk = st.nxt or (U.rec.k + 1)
      local nx = R.steps[nk]
      if nx then
        top[#top + 1] = { kind = "ok", text = "STEP " .. U.rec.k .. " of " .. #R.steps .. " done. Press M: step " .. nk .. ", " .. nx.t }
        for _, a in ipairs(ans) do top[#top + 1] = a end
        if #carried > 0 then top[#top + 1] = { kind = "note", text = "carried to the next step: " .. table.concat(carried, ", ") } end
      else
        top[#top + 1] = { kind = "ok", text = "LAST STEP (" .. U.rec.k .. " of " .. #R.steps .. ")" .. ((#ans > 0) and "" or ": the answer is below") }
        for _, a in ipairs(ans) do top[#top + 1] = a end
      end
      for i = #top, 1, -1 do table.insert(out.rows, 1, top[i]) end
    end
    local function paintRecipes(gc)
      title(gc, "MULTI-STEP QUESTIONS (topics mixed)")
      setc(gc, COL.head); gc:setFont("sansserif", "b", 10); gc:drawString("What does the question make you do?", 6, 23, "top")
      local rows = {}
      for _, R in ipairs(RECIPES or {}) do rows[#rows + 1] = { t = R.t } end
      if U.qsel > #rows then U.qsel = #rows end
      drawRows(gc, rows, U.qsel, 40, 14, SH - 39, function(i) return (i < 10) and tostring(i) or (i == 10 and "0" or "  ") end)
      setc(gc, COL.dim); gc:drawLine(2, SH - 39, SW - 2, SH - 39)
      local R = RECIPES[U.qsel]
      note(gc, R and ("PICK WHEN: " .. R.s) or "", SH - 37)
      footer(gc, "number (0 = 10) or arrows + ENTER | ESC home")
    end
    local function paintRecipe(gc)
      local R = RECIPES[U.qsel]
      title(gc, R.t)
      local y = 23
      setc(gc, COL.note); gc:setFont("sansserif", "r", 9)
      for _, ln in ipairs(wrap(R.how, 62)) do gc:drawString(ln, 6, y, "top"); y = y + 11 end
      setc(gc, COL.head); gc:setFont("sansserif", "b", 10); gc:drawString("Steps (each opens its page):", 6, y + 2, "top")
      local rows = {}
      for i, st in ipairs(R.steps) do rows[#rows + 1] = { t = st.t .. "   (" .. st.page .. ")" } end
      if U.ssel > #rows then U.ssel = #rows end
      drawRows(gc, rows, U.ssel, y + 18, 14, SH - 39, function(i) return tostring(i) end)
      setc(gc, COL.dim); gc:drawLine(2, SH - 39, SW - 2, SH - 39)
      note(gc, R.steps[U.ssel].say, SH - 37)
      footer(gc, "number or ENTER: start that step | ESC back")
    end
    openRecipes = function() U.rec = nil; U.qsel = U.qsel or 1; scr = "recipes"; inval() end
    openRecipe = function(ri) U.rec = nil; U.qsel, U.ssel = ri, 1; scr = "recipe"; inval() end
    ------------------------------------------------------------------ exam parts B and C, and the weeks list
    local XP = {}   -- (one table: the main chunk is near Lua 5.1's limit of 200 locals)
    XP.PARTB = { { k = "F", t = "Find my question type", s = "2 short questions -> the page, the answer box marked" },
                    { k = "M", t = "Multi-step (topics mixed)", s = "a cash flow then its PV, costs then the WACC, ..." },
                    { k = "S", t = "Search words from the question", s = "solver pages and multi-step questions first" },
                    { k = "W", t = "By week (1-8)", s = "the week's page types, then the kind of question" },
                    { k = "R", t = "Root formulas: fill the slots", s = "one formula-sheet line, leave ONE slot blank" },
                    { k = "L", t = "Legend: what a letter means", s = "every letter on the formula sheet" } }
    XP.PARTC = { { t = "How to answer: number and 'why' parts", s = "formula -> numbers -> answer; claim -> cause -> rule" },
                    { t = "Excel parts: cash-flow table, decision tree", s = "the file, the rows in order, the tree, formulas in cells" },
                    { t = "The number pages (as Part B)", s = "finder, multi-step, search, weeks" },
                    { t = "'Why' content: words from the question", s = "definitions and question cards (as Part A)" },
                    { t = "Theory topics, week by week", s = "the WHAT IF rules and the cards of each topic" } }
    function XP.paintList2(gc, head, q, rows, sel, keyFn)
      title(gc, head)
      setc(gc, COL.head); gc:setFont("sansserif", "b", 10); gc:drawString(q, 6, 23, "top")
      drawRows(gc, rows, sel, 40, 15, SH - 39, keyFn)
      setc(gc, COL.dim); gc:drawLine(2, SH - 39, SW - 2, SH - 39)
      note(gc, rows[sel] and rows[sel].s or "", SH - 37)
      footer(gc, "key or ENTER | ESC home")
    end
    function XP.paintWeeks(gc) XP.paintList2(gc, "WEEK BY WEEK", "Which week's topic?", GROUPS, U.wsel, function(i) return tostring(i) end) end
    function XP.paintPartB(gc) XP.paintList2(gc, "PART B - NUMBERS", "How do you want to find the page?", XP.PARTB, U.bsel, function(i, r) return r.k end) end
    function XP.paintPartC(gc) XP.paintList2(gc, "PART C - WRITTEN + EXCEL", "What do you need?", XP.PARTC, U.csel, function(i) return tostring(i) end) end
    function XP.openPartA() U.q, U.hits, U.smode = "", {}, "A"; scr = "search"; inval() end
    function XP.openSearch() U.q, U.hits, U.smode = "", {}, nil; scr = "search"; inval() end
    function XP.openGroup(gi) if GROUPS[gi] then U.group, U.gsel = gi, 1; scr = "menu"; inval() end end
    function XP.partBPick(i)
      local r = XP.PARTB[i]; if not r then return end
      if r.k == "F" then U.fstack, U.fsel = {}, 1; scr = "finder"; inval()
      elseif r.k == "M" then openRecipes()
      elseif r.k == "S" then XP.openSearch()
      elseif r.k == "W" then U.wsel = 1; scr = "weeks"; inval()
      elseif r.k == "R" then U.rlev, U.rsel = 1, 1; scr = "roots"; inval()
      elseif r.k == "L" then toLegend() end
    end
    function XP.partCPick(i)
      if i == 1 then toDoc("PART C - HOW TO ANSWER", PARTC_WRITTEN)
      elseif i == 2 then toDoc("PART C - EXCEL PARTS", PARTC_EXCEL)
      elseif i == 3 then U.bsel = 1; scr = "partB"; inval()
      elseif i == 4 then XP.openPartA()
      elseif i == 5 then U.tsel = 1; scr = "theory"; inval() end
    end
    local function homePick(i)
      local h = HOME[i]
      if not h then return end
      U.rec = nil   -- any new start from home ends a multi-step question
      if h.k == "A" then XP.openPartA(); return
      elseif h.k == "B" then U.bsel = 1; scr = "partB"
      elseif h.k == "C" then U.csel = 1; scr = "partC"
      elseif h.k == "W" then U.wsel = 1; scr = "weeks"
      elseif h.k == "F" then U.fstack, U.fsel = {}, 1; scr = "finder"
      elseif h.k == "T" then scr = "theory"
      elseif h.k == "R" then U.rlev, U.rsel = 1, 1; scr = "roots"
      elseif h.k == "L" then toLegend(); return
      elseif h.k == "M" then openRecipes(); return
      elseif h.k == "S" then U.q, U.hits, U.smode = "", {}, nil; scr = "search"
      else U.group, U.gsel = h.g, 1; scr = "menu" end
      inval()
    end

    ------------------------------------------------------------------ event plumbing
    local old = { paint = on.paint, arrowKey = on.arrowKey, enterKey = on.enterKey, escapeKey = on.escapeKey,
                  charIn = on.charIn, backspaceKey = on.backspaceKey, mouseDown = on.mouseDown, deleteKey = on.deleteKey }
    local NEW = { home = true, menu = true, finder = true, theory = true, search = true, input = true, modes = true, roots = true,
                  recipes = true, recipe = true, weeks = true, partB = true, partC = true }

    function on.paint(gc)
      if NEW[scr] then
        gridHits, gHits, rHits = {}, {}, {}
        setc(gc, COL.bg); gc:fillRect(0, 0, SW, SH)
        if scr == "home" then paintHome(gc)
        elseif scr == "menu" then paintGroup(gc)
        elseif scr == "modes" then paintModes(gc)
        elseif scr == "roots" then paintRoots(gc)
        elseif scr == "finder" then paintFinder(gc)
        elseif scr == "recipes" then paintRecipes(gc)
        elseif scr == "weeks" then XP.paintWeeks(gc)
        elseif scr == "partB" then XP.paintPartB(gc)
        elseif scr == "partC" then XP.paintPartC(gc)
        elseif scr == "recipe" then paintRecipe(gc)
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
      elseif scr == "modes" then U.msel = move(U.msel, #modeSlotOf(U.mt).opts, key)
      elseif scr == "roots" then U.rsel = move(U.rsel, #rootRows(), key)
      elseif scr == "finder" then U.fsel = move(U.fsel, #fnode().opts, key)
      elseif scr == "recipes" then U.qsel = move(U.qsel, #RECIPES, key)
      elseif scr == "weeks" then U.wsel = move(U.wsel, #GROUPS, key)
      elseif scr == "partB" then U.bsel = move(U.bsel, #XP.PARTB, key)
      elseif scr == "partC" then U.csel = move(U.csel, #XP.PARTC, key)
      elseif scr == "recipe" then U.ssel = move(U.ssel, #RECIPES[U.qsel].steps, key)
      elseif scr == "theory" and #THEORY > 0 then U.tsel = move(U.tsel, #THEORY, key)
      elseif scr == "search" and #U.hits > 0 then U.hsel = move(U.hsel, #U.hits, key)
      elseif scr == "tpage" then U.tscroll = scrollList(key, U.tscroll, #U.tlines)
      else old.arrowKey(key); return end
      inval()
    end
    function on.enterKey()
      if scr == "home" then homePick(U.homeSel)
      elseif scr == "menu" then openGroupType(U.gsel)
      elseif scr == "modes" then pickMode(U.msel)
      elseif scr == "roots" then rootPick(U.rsel)
      elseif scr == "finder" then finderPick(U.fsel)
      elseif scr == "recipes" then U.ssel = 1; scr = "recipe"; inval()
      elseif scr == "weeks" then XP.openGroup(U.wsel)
      elseif scr == "partB" then XP.partBPick(U.bsel)
      elseif scr == "partC" then XP.partCPick(U.csel)
      elseif scr == "recipe" then startStep(U.qsel, U.ssel)
      elseif scr == "theory" then if #THEORY > 0 then openTopic(U.tsel) end
      elseif scr == "search" then openHit(U.hits[U.hsel])
      elseif scr == "tpage" then return
      else old.enterKey() end
    end
    function on.returnKey() on.enterKey() end
    function on.escapeKey()
      if scr == "home" then return end
      if scr == "menu" or scr == "theory" or scr == "search" or scr == "recipes" or scr == "weeks" or scr == "partB" or scr == "partC" then scr = "home"; U.rec = nil
      elseif scr == "recipe" then scr = "recipes"; U.rec = nil
      elseif scr == "modes" then scr = "menu"
      elseif scr == "roots" then
        if U.rlev == 2 then U.rlev, U.rsel = 1, U.rg else scr = "home" end
      elseif scr == "finder" then
        if #U.fstack > 0 then table.remove(U.fstack); U.fsel = 1 else scr = "home" end
      elseif scr == "tpage" then
        if U.tback == "search" or U.tback == "menu" or U.tback == "input" or U.tback == "result" then scr = U.tback else scr = "theory" end
      elseif scr == "input" and TYPES[curT].root then
        U.want, U.say = nil, nil
        U.rlev, U.rg = 2, TYPES[curT].rootGroup     -- back to the list of that part of the sheet
        for i, ti in ipairs(ROOTMENU[U.rg].types) do if ti == curT then U.rsel = i end end
        scr = "roots"
      elseif scr == "input" and U.rec then
        U.want, U.say = nil, nil
        U.ssel = U.rec.k
        scr = "recipe"                               -- back to the recipe's steps (the carried numbers are kept)
      elseif scr == "input" then
        U.want, U.say = nil, nil
        U.group = TYPES[curT].group or U.group
        for i, ti in ipairs(GROUPS[U.group].types) do if ti == curT then U.gsel = i end end
        if modeSlotOf(curT) then openModes(curT); return end   -- back to the list of kinds
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
        if ch:find("^[%w%s%-/%%%.'&]$") and #U.q < 90 then U.q = U.q .. ch; runSearch(); inval() end
        return
      end
      if scr == "home" then
        if cl == "h" then toHelp(); return end
        if cl == "g" then toGlossary(); return end
        for i, h in ipairs(HOME) do if h.k:lower() == cl then U.homeSel = i; homePick(i); return end end
        local d = tonumber(ch)
        if d and GROUPS[d] then U.rec = nil; XP.openGroup(d) end   -- a week number: straight to that week
        return
      end
      if scr == "weeks" or scr == "partB" or scr == "partC" then
        local d = tonumber(ch)
        if scr == "weeks" and d and GROUPS[d] then XP.openGroup(d); return end
        if scr == "partC" and d then XP.partCPick(d); return end
        if scr == "partB" then for i, r in ipairs(XP.PARTB) do if r.k:lower() == cl then XP.partBPick(i); return end end end
        if cl == "h" then toHelp() elseif cl == "l" then toLegend() elseif cl == "g" then toGlossary() end
        return
      end
      if scr == "menu" then
        local d = tonumber(ch)
        if d and GROUPS[U.group].types[d] then openGroupType(d); return end
        if cl == "y" then
          local ti = topicForType(GROUPS[U.group].types[U.gsel])
          if ti then openTopic(ti) end
          return
        end
        if cl == "n" or cl == "a" or cl == "w" then
          curT = GROUPS[U.group].types[U.gsel]
          if cl == "n" then toNotes() elseif cl == "a" then toAssume() else toWorked() end
          return
        end
        if cl == "h" then toHelp(); return end
        if cl == "g" then toGlossary(); return end
        if cl == "l" then toLegend(); return end
        return
      end
      if scr == "roots" then
        local d = tonumber(ch)
        if d and d > 0 then rootPick(d); return end
        if cl == "h" then toHelp() elseif cl == "g" then toGlossary() elseif cl == "l" then toLegend() end
        return
      end
      if scr == "modes" then
        local d = tonumber(ch)
        if d then pickMode(d == 0 and 10 or d); return end   -- 0 = the tenth kind
        curT = U.mt
        if cl == "n" then toNotes() elseif cl == "a" then toAssume() elseif cl == "w" then toWorked()
        elseif cl == "h" then toHelp() elseif cl == "g" then toGlossary() elseif cl == "l" then toLegend()
        elseif cl == "y" then local ti = topicForType(U.mt); if ti then openTopic(ti) end end
        return
      end
      if scr == "recipes" or scr == "recipe" then
        local d = tonumber(ch)
        if d == 0 and scr == "recipes" then d = 10 end
        if d and d > 0 then
          if scr == "recipes" and RECIPES[d] then U.qsel, U.ssel = d, 1; scr = "recipe"; inval()
          elseif scr == "recipe" and RECIPES[U.qsel].steps[d] then startStep(U.qsel, d) end
          return
        end
        if cl == "h" then toHelp() elseif cl == "l" then toLegend() elseif cl == "g" then toGlossary() end
        return
      end
      if cl == "m" and scr == "result" and U.rec then recipeNext(); return end
      if scr == "finder" then
        local d = tonumber(ch)
        if d then finderPick(d == 0 and 10 or d) end
        if cl == "h" then toHelp() elseif cl == "l" then toLegend() end
        return
      end
      if scr == "theory" or scr == "tpage" then
        if cl == "s" then U.q, U.hits = "", {}; scr = "search"; inval() end
        if cl == "h" then toHelp() elseif cl == "l" then toLegend(); return end
        local d = tonumber(ch)
        if d and scr == "theory" and d > 0 then   -- a week number jumps to that week's first topic
          local wk = tostring(d)
          for ti, t in ipairs(THEORY) do if t.week == wk or t.week:sub(1, #wk + 1) == wk .. "-" then U.tsel = ti; inval(); break end end
        elseif d == 0 and scr == "theory" and #THEORY > 0 then
          -- 0 steps through Weeks 10, 11 and 12: the first topic of the next of those weeks
          local cur = THEORY[U.tsel].week
          local function late(w) return #w >= 2 and w:sub(1, 1) == "1" end
          local n = #THEORY
          for k = 1, n do
            local ti = (U.tsel - 1 + k) % n + 1
            local w = THEORY[ti].week
            if late(w) and (w ~= cur or not late(cur)) then U.tsel = ti; inval(); break end
          end
        end
        return
      end
      if cl == "y" and (scr == "input" or scr == "result" or scr == "notes" or scr == "assume" or scr == "worked") and curT then
        local ti = topicForType(curT)
        if ti then openTopic(ti) end
        return
      end
      old.charIn(ch)
    end
    function on.mouseDown(mx, my)
      if scr == "roots" then
        local i = math.floor((my - 40) / 15) + 1
        if my >= 40 and rootRows()[i] then rootPick(i) end
        return
      end
      if scr == "home" then
        local i = math.floor((my - 23) / 13) + 1
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
      if scr == "modes" then
        local i = math.floor((my - 40) / 14) + 1
        if my >= 40 and modeSlotOf(U.mt).opts[i] then pickMode(i) end
        return
      end
      if scr == "theory" or scr == "search" or scr == "tpage" then return end
      old.mouseDown(mx, my)
    end
    CORE.U = U
    CORE.runSearch = runSearch
  end
