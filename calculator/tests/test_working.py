"""Every answer line must show HOW it was worked out, with the numbers (the I page shows a line's working).
   node calculator/tools/build.js && python3 calculator/tests/test_working.py
A line whose working is only words ("square root of the variance", "NPV new - NPV base") tells a student nothing they
can check, so every 'val' row's working must hold at least one digit: the formula with the numbers in it, 'given: <number>'
for a typed value, or the check of a search ('NPV at 12.3% = 0.00'). Checked on:
  1. every CASES and EXCEL_CASES entry of test_solvers.py (all types, all modes the cases reach);
  2. the R pages and the Everything page: every root formula's example, and each letter left out in turn;
  3. the Excel tables type (24): the words under every filled table cell.
WHITELIST: (type, label) -> reason, only where a number truly makes no sense. Own numbers only."""
import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'mock'))
from nspire_mock import NspireApp
from test_solvers import CASES, EXCEL_CASES

# (type, label) -> why the working may hold no number. Keep it short: today nothing needs it.
WHITELIST = {
}

app = NspireApp(open(os.path.join(HERE, '..', 'build', 'bfc2140_solver.lua')).read())
lua = app.lua
G = lua.globals()
CORE, DEFS, EVERY = G.CORE, G.ROOTDEFS, G.EVERY
DIGIT = re.compile(r'\d')

def lt(t): return [t[i] for i in range(1, len(t) + 1)] if t is not None else []

fails, nrows, ncells = [], 0, 0

def check_rows(out, where, t):
    """every value row of an answer page: its working has a digit"""
    global nrows
    for r in lt(out.rows):
        if r.kind == 'err' and 'internal' in str(r.text): fails.append(f'{where}: {r.text}')
        if r.kind != 'val': continue
        nrows += 1
        f = str(r.formula) if r.formula is not None else ''
        if DIGIT.search(f) or (t, str(r.label)) in WHITELIST: continue
        fails.append(f'{where}: "{r.label}" working has no numbers: {f!r}')

def check_table(out, where):
    """every filled cell of a table (T on the answer page): the words under it have a digit"""
    global ncells
    tb = out.tbl
    if tb is None or tb.rows is None: return
    for rw in lt(tb.rows):
        if rw.how is None: continue
        for k in list(rw.how.keys()):
            if rw.vals is None or rw.vals[k] is None: continue
            ncells += 1
            words = str(rw.how[k]).split('\n', 1)[-1]   # after the 'Excel B5: =...' line
            if not DIGIT.search(words): fails.append(f'{where}: table row "{rw.label}" cell {k}: no numbers: {words!r}')

# 1. the solver cases
for t, name, V, _ in CASES:
    out = CORE.run(t, lua.table_from(V))
    check_rows(out, f'type {t} {name}', t)
    if t == 24: check_table(out, f'type {t} {name}')
for t, name, V in EXCEL_CASES:
    out = CORE.run(t, lua.table_from(V))
    check_rows(out, f'type {t} {name} (excel case)', t)

# 2. the R pages and the Everything page: each root formula's example, then each letter left out
for d in lt(DEFS):
    ex = dict(d.ex.items()) if d.ex is not None else {}
    o = CORE.run(d.ti, lua.table_from(ex))
    check_rows(o, f'R page {d.id}', d.ti)
    vals = dict(o.vals.items())
    keys = [va.k for va in lt(d.vars)]
    full = dict(ex)
    full.update({k: v for k, v in vals.items() if k in keys})
    for va in lt(d.vars):
        k = va.k
        if va.opt or va.list or k not in full: continue
        V = {kk: vv for kk, vv in full.items() if kk != k}
        check_rows(CORE.run(d.ti, lua.table_from(V)), f'R page {d.id} without {k}', d.ti)
        Vb = {}
        for kk, vv in V.items():
            b = EVERY.boxOf(d.id, kk)
            if b: Vb[b] = vv
        if Vb: check_rows(CORE.run(EVERY.ti, lua.table_from(Vb)), f'Everything ({d.id} without {k})', EVERY.ti)

# 4. the I page itself: on a type whose answer page also has a T table (a note is put above the lines), I on the
#    picked value line must show that line's working, not "pick a blue value line first"
ui = NspireApp(open(os.path.join(HERE, '..', 'build', 'bfc2140_solver.lua')).read())
UG = ui.lua.globals()
for gi, grp in UG.GROUPS.items():
    if 7 in list(grp.types.values()):
        ui.key('charIn', str(gi)); ui.key('charIn', str(list(grp.types.values()).index(7) + 1)); break
for sl in UG.CORE.TYPES[7].slots.values():
    sl.buf = dict(k='6', A0='-60', A1='26', A2='30', A3='34', A4='38').get(sl.key, sl.buf)
ui.key('enterKey'); ui.svg()
ui.key('charIn', 'i')
shown = [o[1] for o in ui.ops() if o[0] == 'text']
if 'how it was worked out:' not in shown or not any(DIGIT.search(str(s)) for s in shown[shown.index('how it was worked out:') + 1:][:3]):
    fails.append(f'type 7 I page (answer page with a T table) shows no working: {shown[:6]}')

seen = set()
for f in fails:
    if f not in seen: seen.add(f); print('FAIL', f)
print(f'{nrows} answer lines and {ncells} table cells checked, I page checked: {len(seen)} problem(s)')
sys.exit(1 if seen else 0)
