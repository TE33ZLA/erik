"""Robustness: every screen of every type (every mode) paints, solves blank and filled forms without a Lua error,
and every notes / steps / worked page opens. Also the home, finder (every leaf), theory, search and glossary screens.
v23: every blank-solved page and every test case of test_solvers.py (typed into the boxes) must show the
FORMULA SHEET section, and every notes (N) page must start with the type's formula-sheet lines.
   python3 calculator/tests/test_ui.py"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'mock'))
from nspire_mock import NspireApp

src = open(os.path.join(HERE, '..', 'build', 'bfc2140_solver.lua')).read()
app = NspireApp(src)
G = app.lua.globals()
TYPES, GROUPS, FINDER, THEORY = G.CORE.TYPES, G.GROUPS, G.FINDER, G.THEORY
fails = []

def paint(where):
    try:
        ops = app.ops()
    except Exception as e:
        fails.append(f'{where}: paint error {e}'); return []
    return ops

def texts(ops): return [o[1] for o in ops if o[0] == 'text']

def check_screen(where, bad=('Something went wrong',)):
    t = ' | '.join(texts(paint(where)))
    for b in bad:
        if b in t: fails.append(f'{where}: shows "{b}"')
    return t

def key(*a):
    try: app.key(*a)
    except Exception as e: fails.append(f'key {a}: {e}')

# every type, every value of its first choice slot (the mode), blank solve + notes pages
for gi in range(1, len(GROUPS) + 1):
    key('charIn', str(gi))
    types = GROUPS[gi].types
    for pos in range(1, len(types) + 1):
        ti = types[pos]
        name = TYPES[ti].name
        key('charIn', str(pos))
        mode = None
        for s in TYPES[ti].slots.values():
            if s.kind == 'choice': mode = s; break
        nmodes = len(mode.opts) if mode is not None else 1
        # v24: a type with kinds of question ('mode') opens a numbered list first; a number opens that kind's page
        has_list = mode is not None and mode.key == 'mode' and nmodes > 1
        if has_list:
            t = check_screen(f'type {ti} ({name}) list of kinds')
            if 'What does the question ask for?' not in t: fails.append(f'type {ti}: the list of kinds does not open')
        for mi in range(1, nmodes + 1):
            if has_list: key('charIn', str(mi))
            elif mode is not None: mode.idx = mi
            where = f'type {ti} ({name}) mode {mi}'
            if has_list and mode.idx != mi: fails.append(f'{where}: the list did not open kind {mi}')
            check_screen(where + ' input')
            key('enterKey'); check_screen(where + ' blank result')
            if 'FORMULA SHEET' not in G.CORE.rtext(): fails.append(f'{where} blank result: no FORMULA SHEET section')
            key('arrowKey', 'down'); key('charIn', 'i'); check_screen(where + ' inspect'); key('escapeKey')
            key('escapeKey')
            if has_list:
                key('escapeKey')
                if 'What does the question ask for?' not in check_screen(where + ' back'): fails.append(f'{where}: ESC does not go back to the list')
        for letter, label in (('n', 'notes'), ('a', 'steps'), ('w', 'worked')):
            key('charIn', letter); t = check_screen(f'type {ti} {label}')
            if len(t) < 40: fails.append(f'type {ti} {label}: page looks empty')
            if letter == 'n' and not G.CORE.ntext().startswith('FORMULA SHEET'):
                fails.append(f'type {ti} notes: does not start with the formula sheet')
            key('escapeKey')
        key('escapeKey')
    key('escapeKey')

# v24: CAPM: 6, 3 shows the kinds; 2 (find beta) shows no beta box
for _ in range(4): key('escapeKey')
key('charIn', '6'); key('charIn', '3')
t = check_screen('CAPM list')
for want_txt in ('required return', 'find beta', 'buy or sell'):
    if want_txt not in t: fails.append(f'CAPM list: {want_txt!r} not shown')
key('charIn', '2'); t = check_screen('CAPM find beta page')
if 'find beta' not in t or 'beta of the share' in t: fails.append('CAPM find beta: wrong page (or a beta box on it)')
for _ in range(4): key('escapeKey')

# the finder: every route to a leaf
def leaves(node, path, out):
    for i in range(1, len(node.opts) + 1):
        o = node.opts[i]
        if o.kids is not None: leaves(o.kids, path + [i], out)
        else: out.append((path + [i], o))
    return out

for path, leaf in leaves(FINDER, [], []):
    where = f'finder {path} {leaf.t}'
    for _ in range(4): key('escapeKey')
    key('charIn', 'f')
    for idx in path:
        G.CORE.U.fsel = idx
        key('enterKey')
    t = check_screen(where)
    if leaf.go is not None:
        if leaf.go.want is not None and 'FIND' not in t: fails.append(f'{where}: the FIND marker is missing')
        key('enterKey'); check_screen(where + ' (solved blank)'); key('escapeKey')

# theory: every topic page opens
for _ in range(4): key('escapeKey')
key('charIn', 't')
for ti in range(1, len(THEORY) + 1):
    G.CORE.U.tsel = ti
    key('enterKey'); t = check_screen(f'theory topic {ti}')
    if 'WHAT IF' not in t: fails.append(f'theory topic {ti}: no rules shown')
    for _ in range(30): key('arrowKey', 'down')
    check_screen(f'theory topic {ti} scrolled')
    key('escapeKey')

# search: a few words, open the first hit of each
for w in ['coupon', 'perpetuity', 'break-even', 'beta', '2/10', 'sunk', 'wacc', 'ccc', 'npv', 'zzzz',
          'lockbox', 'float', 'book now or wait', 'wait and see', 'replace the old machine', 'variance-covariance',
          'share price after borrowing', 'then declines', 'trade-off', 'erosion']:
    for _ in range(4): key('escapeKey')
    key('charIn', 's')
    app.type(w)
    t = check_screen(f'search {w}')
    if w != 'zzzz' and 'nothing found' in t: fails.append(f'search {w}: nothing found')
    key('enterKey'); check_screen(f'search {w} opened')

# glossary: jump through letters and open one entry per letter
for _ in range(4): key('escapeKey')
key('charIn', 'g')
for letter in 'abcdefghijklmnopqrstuvwxyz':
    key('charIn', letter); check_screen(f'glossary {letter}')
key('escapeKey')

# every test case of test_solvers.py, typed into the boxes (rates as %) and solved as on the calculator
sys.path.insert(0, HERE)
from test_solvers import CASES, close
ncase = 0
for t, name, V, want in CASES:
    qt = TYPES[t]
    slots = {sl.key: sl for sl in qt.slots.values()}
    where = f'case type {t} {name}'
    unknown = [k for k in V if k not in slots]
    if unknown: fails.append(f'{where}: no box for {unknown}'); continue
    for _ in range(4): key('escapeKey')
    types = [GROUPS[qt.group].types[i] for i in range(1, len(GROUPS[qt.group].types) + 1)]
    key('charIn', str(qt.group)); key('charIn', str(types.index(t) + 1))
    for sl in slots.values(): sl.buf, sl.idx = sl.defBuf, sl.defIdx
    for k, v in V.items():
        sl = slots[k]
        if sl.kind == 'choice':
            opts = [sl.opts[i] for i in range(1, len(sl.opts) + 1)]
            if v in opts: sl.idx = opts.index(v) + 1
            else: fails.append(f'{where}: {k} has no choice {v!r}')
        else:
            sl.buf = '%.12g' % (v * 100 if sl.kind == 'pct' else v)
    out = G.CORE.solveFromSlots(qt)       # hidden boxes are not read, as on the calculator
    for k, w in want.items():
        if k.startswith('_'): continue
        g = out.vals[k]
        if g is None or not close(g, w): fails.append(f'{where}: {k} = {g} through the boxes, want {w}')
    key('enterKey'); check_screen(where + ' result')
    if 'FORMULA SHEET' not in G.CORE.rtext(): fails.append(f'{where}: no FORMULA SHEET section on the result page')
    ncase += 1
print(f'{ncase} test cases typed into the boxes and solved')

print(f'{len(fails)} problem(s)')
for f in fails[:60]: print(' -', f)
sys.exit(1 if fails else 0)
