"""The Everything page, section 3 pack every_s3b.lua (NPV lines NOT on the sheet: an even stream after the cost, a PV
found elsewhere, growth forever after the last NCF, PI from -NCF0, payback, project B (crossover, NPV, IRR), units
(C from P, v, Q; break-even units; accounting break-even; % change in NPV), expected values and a two-year tree).
   node calculator/tools/build.js && python3 calculator/tests/test_every_s3b.py
For every line: each letter left out in turn comes back; the chains with the other lines work; and the no-noise
cases: a line runs only where its own inputs are typed, and never makes the sheet's NPV box ambiguous. Own numbers only."""
import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'mock'))
from nspire_mock import NspireApp

app = NspireApp(open(os.path.join(HERE, '..', 'build', 'bfc2140_solver.lua')).read())
lua = app.lua
G = lua.globals()
CORE, EVERY = G.CORE, G.EVERY
fails = []
DIGIT = re.compile(r'\d')

def lt(t): return [t[i] for i in range(1, len(t) + 1)] if t is not None else []
def close(a, b, rel=1e-6): return a is not None and abs(a - b) <= rel * max(1.0, abs(b))

def every(V):
    """Run the Everything solver on {box: value} (rates as decimals, as after the boxes are read)."""
    out = CORE.run(EVERY.ti, lua.table_from(V))
    rows = lt(out.rows)
    errs = [r.text for r in rows if r.kind == 'err' and 'internal' in str(r.text)]
    res = [dict(box=e.box, value=e.value, d=e['def'], chained=e.chained, alts=e.alts, passed=e.passed) for e in lt(out.every)]
    for r in rows:   # every answer line shows its working with the numbers
        if r.kind == 'val' and not DIGIT.search(str(r.formula or '')): fails.append(f'{list(V)[:4]}: "{r.text}" working has no numbers')
    return out, res, errs

def got(res, d, box=None): return [r for r in res if r['d'] == d and (box is None or r['box'] == box)]
def one(res, d, box, want, where, chained=None):
    g = got(res, d, box)
    if not g or not close(g[0]['value'], want): fails.append(f'{where}: {d} {box} = {[r["value"] for r in g]}, want {want}'); return
    if chained is not None and g[0]['chained'] != chained: fails.append(f'{where}: {d} chained {g[0]["chained"]}, want {chained}')
def none(res, ds, where):
    bad = [(r['d'], r['box'], r['value']) for r in res if r['d'] in ds]
    if bad: fails.append(f'{where}: lines that should not run gave {bad}')
def text(out): return ' '.join(str(r.text) for r in lt(out.rows))

MORE = {d.id: d for d in lt(EVERY.MORE) if str(d.id).startswith('s3b_')}
def npvl(cf, r): return sum(c / (1 + r) ** t for t, c in cf.items())

# 1. each line's own numbers: every letter (not a list, not an optional one) left out comes back
af = (1 - 1 / 1.1 ** 12) / 0.1
gA = (1 - (1.03 / 1.09) ** 8) / (0.09 - 0.03) / 1.09 ** 2
L3 = {0: -900, 1: 40, 2: 60, 3: 70}
pb = 2 + (200 - 50 - 90) / 120
A = {0: -500, 1: 50, 2: 250, 3: 450}; B = {0: -500, 1: 300, 2: 250, 3: 150}
c_sales = ((80 - 60) * 6000 - 20000 - 10000) * 0.7 + 10000
CASES = [   # (line, {letter: value}, letters given but never the unknown, letters that must be typed for the line to run)
    ('s3b_strm', {'NPV': -500 + 60 * af, 'NCF0': -500, 'C': 60, 'r': .1, 'n': 12}, ['n'], []),
    ('s3b_strm', {'NPV': -700 + 40 * gA - 30 / 1.09, 'NCF0': -700, 'NCF1': -30, 'C': 40, 'r': .09, 'g': .03, 'n': 8, 'k': 3},
     ['n', 'g', 'k', 'NCF1'], []),
    ('s3b_strm', {'NPV': 800 / .12 - 5000, 'NCF0': -5000, 'C': 800, 'r': .12}, [], []),
    ('s3b_pvx', {'NPV': 40, 'NCF0': -190, 'PVx': 230}, [], ['PVx']),
    ('s3b_tail', {'NPV': npvl(L3, .11) + 70 * 1.02 / .09 / 1.11 ** 3, 'r': .11, 'gT': .02, **{f'NCF{t}': c for t, c in L3.items()}},
     [f'NCF{t}' for t in L3], ['gT']),
    ('s3b_pi', {'PI': 0.25, 'NPV': 250, 'NCF0': -1000}, [], ['NCF0']),
    ('s3b_pb', {'PB': pb, 'NCF0': -200, 'NCF1': 50, 'NCF2': 90, 'NCF3': 120}, ['NCF0', 'NCF1', 'NCF2', 'NCF3'], []),
    ('s3b_npvb', {'NPVB': npvl(B, .1), 'r': .1, **{f'B{t}': c for t, c in B.items()}}, [f'B{t}' for t in B], []),
    ('s3b_sales', {'C': c_sales, 'P': 80, 'v': 60, 'Q': 6000, 'FC': 20000, 'Dep': 10000, 'tc': .3}, ['FC', 'Dep', 'tc'], []),
    ('s3b_sales', {'C': 20 * 4500, 'P': 80, 'v': 60, 'Q': 4500}, [], []),
    ('s3b_qacc', {'QA': 2000, 'FC': 30000, 'Dep': 10000, 'P': 50, 'v': 30}, ['FC', 'Dep'], []),
    ('s3b_dnpv', {'dNPV': -0.25, 'NPV': 450, 'NPVb': 600}, [], ['NPVb']),
    ('s3b_ev', {'EV': 0.3 * 900 + 0.7 * 200, 'p1': .3, 'X1': 900, 'p2': .7, 'X2': 200}, ['p1', 'X1', 'p2', 'X2'], []),
    ('s3b_evnpv', {'NPV': -300 + 400 / 1.09 ** 0.5, 'NCF0': -300, 'EV': 400, 'r': .09, 't': .5}, [], ['t']),
    ('s3b_psum', {'pHH': .5, 'pHL': .2, 'pLH': .05, 'pLL': .25}, [], []),
    ('s3b_phh', {'pHgH': .5 / .7, 'pHH': .5, 'pHL': .2}, [], []),
    ('s3b_phl', {'pHgL': .05 / .3, 'pLH': .05, 'pLL': .25}, [], []),
    ('s3b_npvr', {'NPV': npvl(L3, .04), 'real': .04, **{f'NCF{t}': c for t, c in L3.items()}}, [f'NCF{t}' for t in L3] + ['real'], []),
]
seen, nback = set(), 0
for did, full, given, must in CASES:
    seen.add(did)
    d = MORE.get(did)
    if d is None: fails.append(f'{did}: no such line'); continue
    if abs(d.f(lua.table_from(full))) > 1e-7 * max(1, max(abs(v) for v in full.values())): fails.append(f'{did}: the test numbers do not fit the line')
    for k in full:
        if k in given or k in must: continue
        box = EVERY.boxOf(did, k)
        if not box or not box.startswith('3:'): fails.append(f'{did}: {k} has the box {box}'); continue
        Vb = {EVERY.boxOf(did, kk): vv for kk, vv in full.items() if kk != k}
        out, res, errs = every(Vb)
        nback += 1
        if errs: fails.append(f'{did} without {k}: {errs}'); continue
        g = got(res, did, box)
        if not g or not close(g[0]['value'], full[k]): fails.append(f'{did}: without {k} ({box}) gives {[(r["d"], r["value"]) for r in res]}, want {full[k]}')
        for r in res:
            if r['box'] in Vb: fails.append(f'{did} without {k}: the typed box {r["box"]} was solved again by {r["d"]}')
        if out.fsbad is not None: fails.append(f'{did} without {k}: unknown formula ids {list(out.fsbad.values())}')
        rows = [r for r in lt(out.rows) if r.kind == 'val' and str(r.text).startswith(str(d.name) + ':')]
        ex = ' '.join(str(e[2]) for r in rows for e in lt(r.explain))
        for w in ['the formula (NOT on the formula sheet):', 'NOT ON THE FORMULA SHEET', 'your numbers in it:']:
            if w not in ex: fails.append(f'{did} without {k}: explanation lacks {w!r}')
    for k in must:   # left blank, the line does not run (it would answer in questions where it does not apply)
        out, res, errs = every({EVERY.boxOf(did, kk): vv for kk, vv in full.items() if kk != k})
        if got(res, did): fails.append(f'{did}: ran with {k} blank')
for did in MORE:
    if did not in seen and did not in ('s3b_rx', 's3b_irrb'): fails.append(f'{did}: no test case')

# project B: the crossover rate (the IRR of the differences) and B's IRR
def irr(cf, lo=-0.9, hi=1.0):
    f = lambda r: npvl(cf, r)
    for _ in range(200):
        m = (lo + hi) / 2
        if (f(lo) < 0) == (f(m) < 0): lo = m
        else: hi = m
    return (lo + hi) / 2
V = {**{f'3:NCF{t}': c for t, c in A.items()}, **{f'3:B{t}': c for t, c in B.items()}, '3:r': .1}
out, res, errs = every(V)
rx = irr({t: A[t] - B[t] for t in A}, 0.0, 1.0)
one(res, 's3b_rx', '3:rX', rx, 'crossover')
one(res, 's3b_irrb', '3:IRRB', irr(B, 0.0, 2.0), 'IRR of B')
one(res, 's3b_npvb', '3:NPVB', npvl(B, .1), 'NPV of B')
one(res, 'npv', '3:NPV', npvl(A, .1), 'NPV of the NCF project')
if abs(npvl(A, rx) - npvl(B, rx)) > 1e-6: fails.append('crossover: the NPVs are not equal at rX')
ex = ' '.join(str(e[2]) for r in lt(out.rows) if str(r.text).startswith('Crossover') for e in lt(r.explain))
if '((-500) - (-500)) + (50 - 300)/(1 + rX)' not in ex: fails.append(f'crossover working: {ex[:300]}')
nback += 1
# B equal to the NCFs: the differences never change sign, no crossover
V = {**{f'3:NCF{t}': c for t, c in A.items()}, **{f'3:B{t}': c for t, c in A.items()}}
out, res, errs = every(V)
none(res, ['s3b_rx'], 'same lists')

# 2. chains with the other lines
# a year's FCF (the sheet's line, Dep blank = 0) -> C -> a perpetuity after the cost
out, res, errs = every({'3:Rev': 900, '3:Costs': 400, '3:tc': .3, '3:NCF0': -2500, '3:r': .1})
one(res, 's3b_strm', '3:NPV', 350 / .1 - 2500, 'FCF -> C -> NPV', chained=True)
if 'uses C = FCF from Free cash flow' not in text(out): fails.append('FCF -> C: no "uses C = FCF" note')
one(res, 's3b_pi', '3:PI', 1000 / 2500, 'FCF -> NPV -> PI')
# FCF typed, n typed -> an annuity; EAV of the same years too
out, res, errs = every({'3:FCF': 300, '3:n': 6, '3:NCF0': -1100, '3:r': .08})
npv6 = -1100 + 300 * (1 - 1 / 1.08 ** 6) / .08
one(res, 's3b_strm', '3:NPV', npv6, 'FCF typed -> annuity NPV')
one(res, 'eav', '3:EAV', npv6 * .08 / (1 - 1 / 1.08 ** 6), 'annuity NPV -> EAV')
# units: P, v, Q -> C -> NPV (forever); NPV = 0 -> break-even C -> Q; base NPV -> % change
out, res, errs = every({'3:P': 40, '3:v': 25, '3:Q': 3000, '3:NCF0': -200000, '3:r': .12})
one(res, 's3b_sales', '3:C', 45000, 'units -> C')
one(res, 's3b_strm', '3:NPV', 45000 / .12 - 200000, 'units -> C -> NPV', chained=True)
out, res, errs = every({'3:P': 40, '3:v': 25, '3:NPV': 0, '3:NCF0': -200000, '3:r': .12, '3:n': 10, '3:FC': 5000, '3:Dep': 20000, '3:tc': .3})
cbe = 200000 * .12 / (1 - 1 / 1.12 ** 10)
one(res, 's3b_strm', '3:C', cbe, 'break-even C')
one(res, 's3b_sales', '3:Q', ((cbe - 20000) / .7 + 20000 + 5000) / 15, 'break-even units', chained=True)
one(res, 's3b_qacc', '3:QA', 25000 / 15, 'accounting break-even')
none(res, ['s3b_pi'], 'NPV typed 0')
out, res, errs = every({'3:P': 40, '3:v': 25, '3:Q': 2800, '3:NCF0': -200000, '3:r': .12, '3:NPVb': 45000 / .12 - 200000})
one(res, 's3b_dnpv', '3:dNPV', (42000 / .12 - 45000 / .12) / (45000 / .12 - 200000), '% change in NPV', chained=True)
# a PV found in section 1 (a perpetuity) or section 9 (two stages) -> PVx -> NPV
out, res, errs = every({'1:C': 45, '1:r': .09, '3:NCF0': -400})
one(res, 's3b_pvx', '3:NPV', 500 - 400, 'section 1 PV -> NPV', chained=True)
if 'uses PVx = PV from PV of a perpetuity' not in text(out): fails.append('PVx: no "uses PVx = PV from" note')
out, res, errs = every({'9:C': 50, '9:r': .08, '9:n': 10, '9:g2': -.03, '3:NCF0': -450})
pv2 = 50 / .08 * (1 - 1 / 1.08 ** 10) + 50 * .97 / .11 / 1.08 ** 10
one(res, 's3b_pvx', '3:NPV', pv2 - 450, 'section 9 PV -> NPV', chained=True)
# growth forever after the last NCF (0: stays the same); no NCF0 (a value today)
out, res, errs = every({'3:NCF1': 15, '3:NCF2': 25, '3:NCF3': 40, '3:r': .1, '3:gT': 0})
one(res, 's3b_tail', '3:NPV', 15 / 1.1 + 25 / 1.21 + 40 / .1 / 1.1 ** 2, 'tail, gT = 0')
# expected values: X1 from a section 1 PV, then the NPV at t; EV each year -> C -> annuity
out, res, errs = every({'1:C': 60, '1:r': .1, '3:p1': .4, '3:p2': .6, '3:NCF0': -200, '3:r': .1, '3:t': 1})
one(res, 's3b_ev', '3:EV', 240, 'section 1 PV -> X1 -> EV', chained=True)
one(res, 's3b_evnpv', '3:NPV', -200 + 240 / 1.1, 'EV -> NPV at t', chained=True)
none(res, ['s3b_pvx', 's3b_strm'], 'EV at t')
out, res, errs = every({'3:p1': .25, '3:X1': 80, '3:p2': .75, '3:X2': 40, '3:NCF0': -180, '3:r': .1, '3:n': 4})
one(res, 's3b_strm', '3:NPV', -180 + 50 * (1 - 1 / 1.1 ** 4) / .1, 'EV each year -> C -> NPV', chained=True)
none(res, ['s3b_evnpv'], 'EV each year')
# the tree: the fourth path, then the chances given year 1
out, res, errs = every({'3:pHH': .45, '3:pHL': .25, '3:pLL': .2})
one(res, 's3b_psum', '3:pLH', .1, 'tree: fourth path')
one(res, 's3b_phh', '3:pHgH', .45 / .7, 'tree: P(H2|H1)')
one(res, 's3b_phl', '3:pHgL', .1 / .3, 'tree: P(H2|L1)', chained=True)

# 3. no noise: the lines run only where their own inputs are typed; the NPV box is never made ambiguous
MINE = list(MORE)
L = {'3:NCF0': -1000, '3:NCF1': 300, '3:NCF2': 400, '3:NCF3': 500, '3:r': .1}
out, res, errs = every(L)
if sorted(r['d'] for r in res) != ['irr', 'npv', 's3b_pb', 's3b_pi']: fails.append(f'a list and r: lines {sorted(r["d"] for r in res)}')
one(res, 's3b_pb', '3:PB', 2 + 300 / 500, 'payback')
if any(r['alts'] > 1 for r in res): fails.append('a list and r: an ambiguous box')
# a list of costs only (an EAC question): no payback, no PI
out, res, errs = every({'3:NCF0': -900, '3:NCF1': -50, '3:NCF2': -50, '3:r': .1, '3:n': 2})
none(res, ['s3b_pb', 's3b_pi'], 'costs only')
# Resource typed: the sheet's PI line only
out, res, errs = every({**L, '3:Resource': 800})
none(res, ['s3b_pi'], 'Resource typed')
if not got(res, 'pi'): fails.append('Resource typed: no PI from the sheet line')
# NPV, r, n (an EAV question): no stream C
out, res, errs = every({'3:NPV': 500, '3:r': .1, '3:n': 5})
none(res, MINE, 'NPV, r, n')
# NPV, NCF0, r typed: the cash flow a year that gives that NPV (forever); no PVx; with a list: no C
out, res, errs = every({'3:NPV': 500, '3:NCF0': -1000, '3:r': .1})
none(res, ['s3b_pvx', 's3b_tail', 's3b_evnpv'], 'NPV, NCF0, r')
one(res, 's3b_strm', '3:C', 150, 'NPV, NCF0, r -> C')
out, res, errs = every({'3:NPV': 500, '3:NCF0': -1000, '3:NCF1': 200, '3:r': .1})
none(res, ['s3b_strm'], 'NPV, a list, r')
# a year's FCF items with a typed list: the FCF is NOT added as a stream (the NPV comes from the list only)
out, res, errs = every({**L, '3:Rev': 900, '3:Costs': 400, '3:tc': .3})
none(res, ['s3b_strm'], 'FCF items and a list')
one(res, 'npv', '3:NPV', npvl({0: -1000, 1: 300, 2: 400, 3: 500}, .1), 'FCF items and a list')
# C typed with a list (years 1-3 listed, then C in years 4-8): the sheet's NPV/IRR (a part of the flows) are left out
out, res, errs = every({**L, '3:C': 200, '3:n': 5, '3:k': 4})
none(res, ['npv', 'irr', 's3b_pb', 'eav', 'npvinf'], 'C typed with a list')
one(res, 's3b_strm', '3:NPV', npvl({0: -1000, 1: 300, 2: 400, 3: 500}, .1) + 200 * (1 - 1 / 1.1 ** 5) / .1 / 1.1 ** 3, 'list + delayed stream')
# a section 1 PV with a later NCF typed: no PVx line (the sheet's NPV stays one answer)
out, res, errs = every({**L, '1:C': 45, '1:r': .09})
none(res, ['s3b_pvx'], 'section 1 PV with a list')
if not got(res, 'npv') or got(res, 'npv')[0]['alts'] != 1: fails.append('section 1 PV with a list: the sheet NPV is not one answer')
# a typed section 1 PV never crosses
out, res, errs = every({'1:PV': 500, '3:NCF0': -400})
none(res, ['s3b_pvx'], 'typed 1:PV')
# section 1 alone, the existing FCF -> two stages case: no section 3 lines of this pack
for V in [{'1:C': 100, '1:r': .05}, {'1:C': 100, '1:r': .05, '1:n': 10}, {'3:Rev': 400, '3:Costs': 180, '3:tc': .3, '9:r': .07, '9:n': 12, '9:g2': -.04},
          {'3:FCF': 154, '3:r': .07, '9:n': 12, '9:g2': -.04}, {'3:P': 50, '3:v': 30, '3:Q': 100}]:
    out, res, errs = every(V)
    none(res, [d for d in MINE if d != 's3b_sales'], f'unrelated {list(V)}')
# the working names only the letters typed: FC alone (no Dep, no tax)
out, res, errs = every({'3:QA': 1500, '3:FC': 30000, '3:v': 30})
one(res, 's3b_qacc', '3:P', 50, 'accounting break-even: P')
w = [str(r.formula) for r in lt(out.rows) if str(r.text).startswith('Accounting break-even')]
if w != ['P = 30 + 30000/1500']: fails.append(f'accounting break-even working: {w}')
out, res, errs = every({'3:C': 36000, '3:P': 50, '3:v': 30, '3:FC': 6000})
w = [str(r.formula) for r in lt(out.rows) if str(r.text).startswith('Cash flow from unit sales')]
if w != ['Q = (36000 + 6000)/(50 - 30)']: fails.append(f'units working: {w}')
# accounting break-even only with FC or Dep; % change only with a typed base; payback not with NCF0 >= 0
out, res, errs = every({'3:P': 50, '3:v': 30})
none(res, MINE, 'P and v only')
out, res, errs = every({'3:NCF0': 1000, '3:NCF1': -300, '3:NCF2': -900, '3:r': .1})
none(res, ['s3b_pb', 's3b_pi'], 'NCF0 positive')
# EV: a chance with no value anywhere waits (a section 1 PV may give X1); chances over 100% stop it
out, res, errs = every({'3:p1': .5, '3:p2': .5})
none(res, ['s3b_ev'], 'chances only')
out, res, errs = every({'3:p1': .7, '3:X1': 10, '3:p2': .6, '3:X2': 5})
none(res, ['s3b_ev'], 'chances over 100%')
# odd input never crashes
for V in [{b: 1 for b in EVERY.BOX.keys()}, {b: 0 for b in EVERY.BOX.keys() if str(b).startswith('3:')},
          {'3:C': 10, '3:r': .05, '3:g': .05, '3:NCF0': -1}, {'3:gT': .2, '3:r': .1, '3:NCF1': 5}, {'3:NCF0': -10, '3:B0': -10, '3:B1': 0},
          {'3:P': 5, '3:v': 5, '3:FC': 1, '3:C': 1}, {'3:pHH': 0, '3:pHL': 0, '3:pLH': 0}]:
    out, res, errs = every(V)
    if errs: fails.append(f'odd input {list(V)[:4]}: {errs}')
# the N page lists the pack's lines under MORE LINES NOT ON THE SHEET
nt = str(CORE.TYPES[EVERY.ti].notes)
for w in ['NPV = NCF0 + PVx', 'PB = Y + (cost not yet back after year Y)/NCF(Y+1)', 'EV = p1*X1 + p2*X2 + p3*X3', 'C = ((P - v)*Q - FC - Dep)*(1 - tc) + Dep']:
    if w not in nt: fails.append(f'notes: {w!r} missing')

# real cash flows: nominal + inflation (Fisher) -> real rate -> NPV listed 'only if REAL'; r typed: no real-rate NPV (own numbers)
V = {'3:NCF0': -800, '3:NCF1': 300, '3:NCF2': 300, '3:NCF3': 300, '3:nominal': .092, '3:inflation': .05}
out, res, errs = every(V)
real = 1.092 / 1.05 - 1
want = -800 + sum(300 / (1 + real) ** t for t in (1, 2, 3))
nr = [r for r in res if r['d'] == 's3b_npvr']
if not nr or not close(nr[0]['value'], want) or nr[0]['passed'] or not nr[0]['chained']: fails.append(f'real NPV: {nr}, want {want}')
if 'only if the cash flows are REAL' not in ' '.join(str(r.text) for r in lt(out.rows)): fails.append('real NPV: not marked only if REAL')
out, res, errs = every(dict(V, **{'3:r': .092}))
if any(r['d'] == 's3b_npvr' for r in res): fails.append('real NPV: listed although r is typed')
print(f'{len(MORE)} section 3 lines of the s3b pack: {nback} letters left out and found again')
print(f'{len(fails)} problem(s)')
for f in fails[:60]: print(' -', f)
sys.exit(1 if fails else 0)
