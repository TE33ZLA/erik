  ------------------------------------------------------------------
  -- EVERYTHING page (home key E, everything.lua): the section titles in
  -- the box list are skipped by the cursor; left/right jump to the
  -- next / previous section; ESC goes home.
  ------------------------------------------------------------------
  do
    local function isEvery() return scr == "input" and curT ~= nil and TYPES[curT] ~= nil and TYPES[curT].every end
    -- move off a section title (dir -1: upwards)
    local function skip(dir)
      local list = visSlots()
      local n, g = #list, 0
      while list[sel] and list[sel].kind == "sec" and g < n do
        sel = (dir < 0) and ((sel - 2) % n + 1) or (sel % n + 1)
        g = g + 1
      end
    end
    -- the first box of the next (dir 1) or previous (dir -1) section, its title at the top of the list
    local function jump(dir)
      local list = visSlots()
      local heads = {}
      for i, sl in ipairs(list) do if sl.kind == "sec" then heads[#heads + 1] = i end end
      if #heads == 0 then return end
      local cur = 1
      for j, h in ipairs(heads) do if h < sel then cur = j end end
      local nx = (dir > 0) and (cur % #heads + 1) or ((cur - 2) % #heads + 1)
      sel = heads[nx] + 1
      scrollI = heads[nx] - 1
    end
    function EVERY.open()
      CORE.U.want, CORE.U.say, CORE.U.rec = nil, nil, nil
      openType(EVERY.ti)
      skip(1)
    end
    EVERY.jump = jump
    local old = { arrowKey = on.arrowKey, tabKey = on.tabKey, backtabKey = on.backtabKey, mouseDown = on.mouseDown,
                  charIn = on.charIn, escapeKey = on.escapeKey }
    function on.arrowKey(key)
      if isEvery() and (key == "left" or key == "right") then jump((key == "right") and 1 or -1); inval(); return end
      old.arrowKey(key)
      if isEvery() then skip((key == "up") and -1 or 1); inval() end
    end
    function on.tabKey() old.tabKey(); if isEvery() then skip(1); inval() end end
    function on.backtabKey() old.backtabKey(); if isEvery() then skip(-1); inval() end end
    function on.mouseDown(mx, my) old.mouseDown(mx, my); if isEvery() then skip(1); inval() end end
    function on.charIn(ch) old.charIn(ch); if isEvery() then skip(1) end end
    function on.escapeKey()
      if isEvery() then scr = "home"; inval(); return end
      old.escapeKey()
    end
  end
