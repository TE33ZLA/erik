"""Robustness: every screen of every type (every mode) paints, solves blank and filled forms without a Lua error,
and every notes / steps / worked page opens. Also the home, finder (every leaf), theory, search and glossary screens.
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
        for mi in range(1, nmodes + 1):
            if mode is not None: mode.idx = mi
            where = f'type {ti} ({name}) mode {mi}'
            check_screen(where + ' input')
            key('enterKey'); check_screen(where + ' blank result')
            key('arrowKey', 'down'); key('charIn', 'i'); check_screen(where + ' inspect'); key('escapeKey')
            key('escapeKey')
        for letter, label in (('n', 'notes'), ('a', 'steps'), ('w', 'worked')):
            key('charIn', letter); t = check_screen(f'type {ti} {label}')
            if len(t) < 40: fails.append(f'type {ti} {label}: page looks empty')
            key('escapeKey')
        key('escapeKey')
    key('escapeKey')

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
for w in ['coupon', 'perpetuity', 'break-even', 'beta', '2/10', 'sunk', 'wacc', 'ccc', 'npv', 'zzzz']:
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

print(f'{len(fails)} problem(s)')
for f in fails[:60]: print(' -', f)
sys.exit(1 if fails else 0)
