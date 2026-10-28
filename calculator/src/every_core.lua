----------------------------------------------------------------------
-- EVERYTHING page: more lines that are NOT on the formula sheet, in
-- the sheet's own sections (1 Financial Maths ... 8 the Tax World).
-- Each every_s*.lua file adds one pack with EVERY_ADD; everything.lua
-- reads them all. A pack:
--   lines   = { line, ... }   a line has the shape of a root formula
--             (roots.lua): id, sec (1-9), name, short, eq (or eqf),
--             why (where it comes from: shown as 'NOT ON THE FORMULA
--             SHEET'), vars, f, rearr, need, extra, ex (own numbers)
--   bridges = { { from, to, typedOnly, fn, ftext, blockIf, derivedOnly }, ... }
--             the same quantity in another box (used when 'to' is blank)
--   weakok  = { lineid = { letter = true } }   blank = 0 (tried LAST)
--   fam     = { lineid = "family" }   alternatives: never feed each other
--   skip    = { lineid = function(typed, known) return true end }
--   second  = { lineid = "only if ..." }   listed, never passed on
--   lbl, hint = { box = text }   order = { [sec] = { box, ... } }
-- Box of a letter: "<sec>:<letter>" (Tc is the one shared box).
-- Own numbers only. ASCII only.
----------------------------------------------------------------------
EVERY_MORE = EVERY_MORE or {}
function EVERY_ADD(pack) EVERY_MORE[#EVERY_MORE + 1] = pack end
-- a letter of a line: k = key, t = how it is written, kind = money / pct / num
function EVERY_SLOT(k, t, label, kind, hint, more)
  local va = { k = k, t = t or k, label = label, kind = kind, hint = hint, how = hint }
  for kk, vv in pairs(more or {}) do va[kk] = vv end
  return va
end
