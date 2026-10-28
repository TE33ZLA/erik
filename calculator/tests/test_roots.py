"""Root formulas (home key R): every formula-sheet line as a page of slots.
   node calculator/tools/build.js && python3 calculator/tests/test_roots.py
For every root formula: solve its example; then blank EACH slot in turn (all the others filled) and check the solver
gets the slot's value back; evaluate every rearranged form ("solved for x") in Python with the same numbers and check it
gives x; check the answer page has the exam lines and the formula-sheet line; open every page of the R menu."""
import os, sys, re, math
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'mock'))
from nspire_mock import NspireApp

app = NspireApp(open(os.path.join(HERE, '..', 'build', 'bfc2140_solver.lua')).read())
lua = app.lua
G = lua.globals()
CORE, DEFS, TYPES, MENU = G.CORE, G.ROOTDEFS, G.CORE.TYPES, G.ROOTMENU
fails = []
nsolve = nrearr = 0

def lt(t): return [t[i] for i in range(1, len(t) + 1)]

def run(ti, V):
    out = CORE.run(ti, lua.table_from(V))
    rows = lt(out.rows)
    bad = [r.text for r in rows if r.kind in ('need', 'err')]
    return out, bad

def py_eval(expr, vals):
    """Evaluate a written formula (tokens -> numbers) in Python."""
    toks = sorted(vals, key=len, reverse=True)
    marks = {}
    for i, t in enumerate(toks):
        pat = re.escape(t)
        if re.match(r'\w', t): pat = r'(?<![\w])' + pat
        if re.search(r'\w$', t): pat = pat + r'(?![\w])'
        expr = re.sub(pat, '\x01%d\x02' % i, expr)
        marks[i] = '(%r)' % vals[t]
    expr = re.sub('\x01(\\d+)\x02', lambda m: marks[int(m.group(1))], expr)
    expr = expr.replace('^', '**').replace('ln(', 'math.log(').replace('sqrt(', 'math.sqrt(')
    return eval(expr, {'math': math})

def close(a, b, rel=1e-6): return a is not None and abs(a - b) <= rel * max(1.0, abs(b))

for d in lt(DEFS):
    ti, name = d.ti, d.name
    ex = dict(d.ex.items()) if d.ex is not None else {}
    out, bad = run(ti, ex)
    if bad: fails.append(f'{name}: example does not solve: {bad}'); continue
    vals = dict(out.vals.items())
    texts = [r.text for r in lt(out.rows)]
    if not any('FORMULA SHEET' in str(t) for t in texts): fails.append(f'{name}: no FORMULA SHEET section')
    if out.fsids is None or d.id not in list(out.fsids.values()): fails.append(f'{name}: the sheet line {d.id} is not listed')
    if not any('WRITE IN THE EXAM' in str(t) for t in texts): fails.append(f'{name}: no WRITE IN THE EXAM lines')
    if any(re.search(r'\de[+-]\d', str(t)) for t in texts if t): fails.append(f'{name}: a number in e-notation on the page')
    full = dict(ex)
    full.update({k: v for k, v in vals.items() if k in [va.k for va in lt(d.vars)]})
    tokens = {va.k: va.t for va in lt(d.vars)}
    # blank each slot in turn
    for va in lt(d.vars):
        k = va.k
        if va.opt or va.list or k not in full: continue
        V = {kk: vv for kk, vv in full.items() if kk != k}
        if va.alt is not None and va.alt.ok(lua.table_from(V)): continue   # blank, it is worked out from a helper slot
        o2, bad2 = run(ti, V)
        got = o2.vals[k]
        nsolve += 1
        if not bad2 and got is not None and not close(got, full[k], 1e-5):
            # a formula with two answers (e.g. a squared term): accept the other one if every slot then fits
            o4, _ = run(ti, dict(V, **{k: got}))
            if 'fits: the formula holds' in ' '.join(str(r.text) for r in lt(o4.rows)): got = full[k]
        if bad2 or not close(got, full[k], 1e-5):
            fails.append(f'{name}: blank {k}: got {got}, want {full[k]} {bad2}')
        # the rearranged form, evaluated in Python with the other values
        rr = d.rearr[k] if d.rearr is not None else None
        if isinstance(rr, str):
            lhs, rhs = rr.split(' = ', 1)
            pv = {tokens[kk]: vv for kk, vv in full.items() if kk in tokens and kk != k}
            try:
                val = py_eval(rhs, pv)
                nrearr += 1
                if not close(val, full[k], 1e-6): fails.append(f'{name}: rearranged {rr!r} gives {val}, want {full[k]}')
            except Exception as e:
                fails.append(f'{name}: rearranged {rr!r} does not evaluate: {e}')
    # every slot filled: the check mode says the formula holds
    o3, bad3 = run(ti, {kk: vv for kk, vv in full.items()})
    t3 = ' '.join(str(r.text) for r in lt(o3.rows))
    if 'fits: the formula holds' not in t3: fails.append(f'{name}: all slots filled, the check does not say it holds')

# the R menu: every group, every formula page; ESC goes back to the list
def key(*a):
    try: app.key(*a)
    except Exception as e: fails.append(f'key {a}: {e}')
def screen():
    try: return ' | '.join(o[1] for o in app.ops() if o[0] == 'text')
    except Exception as e: fails.append(f'paint: {e}'); return ''
for _ in range(4): key('escapeKey')
key('charIn', 'r')
if 'Which part of the sheet?' not in screen(): fails.append('R does not open the root formulas')
for gi in range(1, len(MENU) + 1):
    key('charIn', str(gi))
    if 'Which formula?' not in screen(): fails.append(f'root group {gi} does not open')
    for pos in range(1, len(MENU[gi].types) + 1):
        key('charIn', str(pos))
        t = screen()
        if 'ENTER solve' not in t: fails.append(f'root group {gi} formula {pos}: the slots page does not open')
        key('enterKey'); t = screen()
        if 'Something went wrong' in t: fails.append(f'root group {gi} formula {pos}: blank solve fails')
        key('escapeKey')
        for letter in 'naw':
            key('charIn', letter)
            if len(screen()) < 40: fails.append(f'root group {gi} formula {pos}: page {letter} looks empty')
            key('escapeKey')
        key('escapeKey')
        if 'Which formula?' not in screen(): fails.append(f'root group {gi} formula {pos}: ESC does not go back to the list')
    key('escapeKey')

# a small rate per period (monthly) solved back: never a far-off false root (own numbers)
for C, rr, nn in [(750, 0.004, 240), (900, 0.0045, 180), (120, 0.0025, 360)]:
    pvv = C / rr * (1 - (1 + rr) ** -nn)
    E = G.EVERY
    out = CORE.run(E.ti, lua.table_from({'1:PV': pvv, '1:C': C, '1:n': nn}))
    got = [out.vals[r.key] for r in lt(out.rows) if r.kind == 'val' and str(r.text).startswith('PV of an annuity:')]
    if not got or not close(got[0], rr): fails.append(f'small monthly r: PV {pvv:.2f}, C {C}, n {nn} -> {got}, want {rr}')
print(f'{len(lt(DEFS))} root formulas, {nsolve} slots solved back, {nrearr} rearranged forms checked')
if fails:
    print('\n'.join(fails[:60])); print(f'{len(fails)} problem(s)'); sys.exit(1)
print('0 problem(s)')
