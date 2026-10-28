"""The Everything page, section 2 pack (every_s2.lua): share lines NOT on the formula sheet.
   node calculator/tools/build.js && python3 calculator/tests/test_every_s2.py
Each new line: every letter left out in turn comes back through the section 2 boxes (except the ones a line never
solves on purpose: a year's growth gk and the long-run g of Pn = Dn*(1 + g)/(rE - g)); the chains with the sheet's
share lines (constant growth -> Pt; g1..g5 -> D1..D5 -> Pn -> P0); and the no-noise cases: the sheet's own share and
bond questions print nothing new, a growth that changes leaves out P0 = D1/rE and P0 = D1/(rE - g). Own numbers only."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'mock'))
from nspire_mock import NspireApp

app = NspireApp(open(os.path.join(HERE, '..', 'build', 'bfc2140_solver.lua')).read())
lua = app.lua
G = lua.globals()
CORE, EVERY = G.CORE, G.EVERY
fails = []

def lt(t): return [t[i] for i in range(1, len(t) + 1)] if t is not None else []
def close(a, b, rel=1e-6): return a is not None and abs(a - b) <= rel * max(1.0, abs(b))

def every(V):
    """Run the Everything solver on {box: value} (rates as decimals, as after the boxes are read)."""
    out = CORE.run(EVERY.ti, lua.table_from(V))
    rows = lt(out.rows)
    errs = [r.text for r in rows if r.kind == 'err' and 'internal' in str(r.text)]
    res = [dict(box=e.box, value=e.value, d=e['def'], chained=e.chained, alts=e.alts, passed=e.passed) for e in lt(out.every)]
    return out, res, errs

def text(out): return ' '.join(str(r.text) for r in lt(out.rows))
def boxes(d, x): return {f'2:{k}': v for k, v in x.items()}

# own numbers
def twostage(D0, gs, N, g, rE):
    return D0 * (1 + gs) / (rE - gs) * (1 - ((1 + gs) / (1 + rE)) ** N) + D0 * (1 + gs) ** N * (1 + g) / (rE - g) / (1 + rE) ** N
def level(Dlev, rE, nD, Pn): return Dlev / rE * (1 - 1 / (1 + rE) ** nD) + Pn / (1 + rE) ** nD

FULL = {
    's2_pt': {'Pt': 30 * 1.04 ** 3, 'P0': 30, 'g': .04, 't': 3},
    's2_d1': {'D1': 1.2 * 1.15, 'D0': 1.2, 'g1': .15},
    's2_d2': {'D2': 1.2 * 1.15, 'D1': 1.2, 'g2': .15},
    's2_d3': {'D3': 1.2 * 1.15, 'D2': 1.2, 'g3': .15},
    's2_d4': {'D4': 1.2 * 1.15, 'D3': 1.2, 'g4': .15},
    's2_d5': {'D5': 1.2 * 1.15, 'D4': 1.2, 'g5': .15},
    's2_pn': {'Pn': 1.3 * 1.05 / .06, 'D1': 1, 'D2': 1.3, 'g': .05, 'rE': .11},
    's2_p0gs': {'P0': twostage(1.5, .12, 4, .03, .1), 'D0': 1.5, 'gs': .12, 'N': 4, 'g': .03, 'rE': .1},
    's2_p0lev': {'P0': level(3, .1, 7, 20), 'Dlev': 3, 'rE': .1, 'nD': 7, 'Pn': 20},
    's2_cum': {'Pcum': 19, 'P0': 18.4, 'D0': .6},
}
# letters a line never solves on purpose (it runs only when they are typed): no noise in the sheet's questions
NEVER = {'s2_d1': {'g1'}, 's2_d2': {'g2'}, 's2_d3': {'g3'}, 's2_d4': {'g4'}, 's2_d5': {'g5'}, 's2_pn': {'g', 'D1', 'D2'}}

# 1. every new line, every letter left out in turn
MORE = {d.id: d for d in lt(EVERY.MORE) if str(d.id).startswith('s2_')}
if sorted(MORE) != sorted(FULL): fails.append(f'pack lines: {sorted(MORE)}, want {sorted(FULL)}')
nback = 0
for did, full in FULL.items():
    d = MORE.get(did)
    if d is None: continue
    if d.sec != 2: fails.append(f'{did}: section {d.sec}')
    for f in ('id', 'name', 'short', 'eq', 'why', 'vars', 'f', 'ex'):
        if d[f] is None: fails.append(f'{did}: no {f}')
    if abs(d.f(lua.table_from(full))) > 1e-9: fails.append(f'{did}: the test numbers do not fit the line')
    for k in full:
        box = EVERY.boxOf(did, k)
        if box != f'2:{k}': fails.append(f'{did}: {k} has the box {box}')
        Vb = {f'2:{kk}': vv for kk, vv in full.items() if kk != k}
        out, res, errs = every(Vb)
        if errs: fails.append(f'{did} without {k}: {errs}'); continue
        for r in res:
            if r['box'] in Vb: fails.append(f'{did} without {k}: the typed box {r["box"]} was solved again by {r["d"]}')
        got = [r for r in res if r['box'] == box]
        if k in NEVER.get(did, ()):
            if any(r['d'] == did for r in got): fails.append(f'{did} without {k}: solved {k}, but it should only run with {k} typed')
            continue
        nback += 1
        mine = [r for r in got if r['d'] == did]
        if not mine or not close(mine[0]['value'], full[k]): fails.append(f'{did}: without {k} gives {[(r["d"], r["value"]) for r in got]}, want {full[k]}')
        if any(not close(r['value'], full[k]) for r in got): fails.append(f'{did} without {k}: another line gives a different {k}: {got}')
        rows = [r for r in lt(out.rows) if r.kind == 'val' and r.explain is not None and str(r.label) == f'{d.name}: {k}']
        ex = ' '.join(str(e[2]) for r in rows for e in lt(r.explain))
        for w in ['the formula (NOT on the formula sheet):', 'NOT ON THE FORMULA SHEET', 'your numbers in it:']:
            if w not in ex: fails.append(f'{did} without {k}: explanation lacks {w!r}')
    # its own example (ex): the first letter comes back
    ex = dict(d.ex.items())
    out, res, errs = every({f'2:{k}': v for k, v in ex.items()})
    first = lt(d.vars)[0].k
    if not any(r['d'] == did and r['box'] == f'2:{first}' for r in res): fails.append(f'{did}: its example does not give {first} ({res})')

# 2. chains
# constant growth: D0 2.5, g 4%, rE 11% -> P0 = 2.6/0.07 -> the price in 3 years
out, res, errs = every({'2:D0': 2.5, '2:g': .04, '2:rE': .11, '2:t': 3})
byd = {r['d']: r for r in res}
p0 = 2.5 * 1.04 / .07
if 'p0g' not in byd or not close(byd['p0g']['value'], p0): fails.append(f'chain P0 -> Pt: p0g {byd.get("p0g")}')
if 's2_pt' not in byd or not close(byd['s2_pt']['value'], p0 * 1.04 ** 3) or not byd['s2_pt']['chained']: fails.append(f'chain P0 -> Pt: {byd.get("s2_pt")}')
if 'uses P0 from Share price, constant growth' not in text(out): fails.append('chain P0 -> Pt: no uses note')
# growth year by year: D0 0.5, g1 30%, g2 20%, g3 10%, then 4% forever, rE 12%
D = [0.5]
for gk in (.3, .2, .1): D.append(D[-1] * (1 + gk))
P3 = D[3] * 1.04 / .08
want = D[1] / 1.12 + D[2] / 1.12 ** 2 + (D[3] + P3) / 1.12 ** 3
out, res, errs = every({'2:D0': .5, '2:g1': .3, '2:g2': .2, '2:g3': .1, '2:g': .04, '2:rE': .12})
byd = {r['d']: r for r in res}
for k, v in [('s2_d1', D[1]), ('s2_d2', D[2]), ('s2_d3', D[3]), ('s2_pn', P3), ('p0n', want)]:
    if k not in byd or not close(byd[k]['value'], v): fails.append(f'year by year: {k} = {byd.get(k)}, want {v}')
if not byd.get('p0n', {}).get('chained'): fails.append('year by year: P0 is not marked as using the worked-out dividends')
for k in ('p0g', 'p0z', 's2_pt', 's2_p0gs'):
    if k in byd: fails.append(f'year by year: {k} printed {byd[k]["value"]} (it does not fit a growth that changes)')
if len([r for r in res if r['box'] == '2:P0']) != 1: fails.append(f'year by year: more than one P0 {res}')
# the same growth each year = the two-stage line: one answer either way
out, res, errs = every({'2:D0': .5, '2:gs': .2, '2:N': 3, '2:g': .04, '2:rE': .12})
gs = [r for r in res if r['d'] == 's2_p0gs']
out2, res2, errs2 = every({'2:D0': .5, '2:g1': .2, '2:g2': .2, '2:g3': .2, '2:g': .04, '2:rE': .12})
pn = [r for r in res2 if r['d'] == 'p0n']
if not gs or not pn or not close(gs[0]['value'], pn[0]['value']): fails.append(f'two stages = year by year: {gs} vs {pn}')
if [r['d'] for r in res] != ['s2_p0gs']: fails.append(f'two stages: other lines printed {res}')
# rE = gs: every first-stage dividend is worth D0 today
out, res, errs = every({'2:D0': 1, '2:gs': .1, '2:N': 5, '2:g': .03, '2:rE': .1})
gs = [r for r in res if r['d'] == 's2_p0gs']
if not gs or not close(gs[0]['value'], 5 + 1.1 ** 5 * 1.03 / .07 / 1.1 ** 5): fails.append(f'two stages rE = gs: {gs}')
# the dividends typed, then growth forever: Pn from the last one, then P0
out, res, errs = every({'2:D1': 1, '2:D2': 1.2, '2:D3': 1.5, '2:g': .05, '2:rE': .1})
byd = {r['d']: r for r in res}
P3 = 1.5 * 1.05 / .05
if 's2_pn' not in byd or not close(byd['s2_pn']['value'], P3): fails.append(f'D1..D3 + g: Pn {byd.get("s2_pn")}')
if 'p0n' not in byd or not close(byd['p0n']['value'], 1 / 1.1 + 1.2 / 1.1 ** 2 + (1.5 + P3) / 1.1 ** 3): fails.append(f'D1..D3 + g: P0 {byd.get("p0n")}')
if any(k in byd for k in ('p0z', 'p0g')): fails.append(f'D1..D3 + g: a one-rate line printed {res}')
rows = [r for r in lt(out.rows) if r.kind == 'val' and str(r.label).startswith('Price at the last dividend year')]
ex = ' '.join(str(e[2]) for r in rows for e in lt(r.explain))
if 'Pn = D3*(1 + g)/(rE - g)' not in ex: fails.append(f'Pn names the last dividend: {ex[:300]}')
# the same dividend for 5 years, then growth forever
out, res, errs = every({'2:Dlev': 2, '2:nD': 5, '2:g': .03, '2:rE': .1})
byd = {r['d']: r for r in res}
P5 = 2 * 1.03 / .07
if 's2_pn' not in byd or not close(byd['s2_pn']['value'], P5): fails.append(f'level + growth: Pn {byd.get("s2_pn")}')
if 's2_p0lev' not in byd or not close(byd['s2_p0lev']['value'], level(2, .1, 5, P5)) or not byd['s2_p0lev']['chained']: fails.append(f'level + growth: P0 {byd.get("s2_p0lev")}')
# the price before the dividend -> P0 -> rE (constant growth)
out, res, errs = every({'2:Pcum': 21, '2:D0': 1, '2:g': .05})
byd = {r['d']: r for r in res}
if 's2_cum' not in byd or not close(byd['s2_cum']['value'], 20): fails.append(f'Pcum -> P0: {byd.get("s2_cum")}')
if 'p0g' not in byd or not close(byd['p0g']['value'], 1.05 / 20 + .05) or not byd['p0g']['chained']: fails.append(f'Pcum -> P0 -> rE: {byd.get("p0g")}')
# a Pn typed waits for the whole chain (the price is at year 2, not year 1)
out, res, errs = every({'2:D0': 1, '2:g1': .1, '2:g2': .08, '2:Pn': 30, '2:rE': .11})
pn = [r for r in res if r['d'] == 'p0n']
if not pn or not close(pn[0]['value'], 1.1 / 1.11 + (1.1 * 1.08 + 30) / 1.11 ** 2): fails.append(f'chain then Pn typed: {pn}')

# 3. no noise
SHEET = {   # the sheet's own share questions: only the sheet's line answers
    'no growth': ({'2:D1': 2, '2:rE': .1}, ['p0z']),
    'constant growth': ({'2:D0': 1.5, '2:g': .04, '2:rE': .1}, ['p0g']),
    'constant growth, rE': ({'2:P0': 30, '2:D0': 1, '2:g': .05}, ['p0g']),
    'n dividends': ({'2:D1': 1, '2:D2': 1.5, '2:D3': 2, '2:Pn': 40, '2:rE': .12}, ['p0n']),
    'n dividends, rE': ({'2:P0': 32, '2:D1': 1, '2:D2': 1.5, '2:D3': 2, '2:Pn': 40}, ['p0n']),
    'bond': ({'2:C': 40, '2:i': .035, '2:n': 20, '2:FVn': 1000}, ['bond']),
    'zero bond': ({'2:FVn': 1000, '2:i': .05, '2:n': 10}, ['zbond']),
}
for nm, (V, want) in SHEET.items():
    out, res, errs = every(V)
    if errs: fails.append(f'no noise {nm}: {errs}')
    if sorted(r['d'] for r in res) != want: fails.append(f'no noise {nm}: lines {[(r["d"], r["value"]) for r in res]}, want {want}')
    t = text(out)
    for w in ['Share price in t years', 'two-stage', 'same dividend for nD', 'cum-dividend', 'last dividend year', 'Dividend in year']:
        if w in t: fails.append(f'no noise {nm}: {w!r} shown ({t[:300]})')
# a gap in the years (g2 not typed): no P0 from the first dividend only
out, res, errs = every({'2:D0': 1, '2:g1': .1, '2:g3': .08, '2:g': .04, '2:Pn': 30, '2:rE': .11})
if any(r['d'] in ('p0n', 's2_pn', 'p0z', 'p0g') for r in res): fails.append(f'gap in the years: {res}')
# rE not above g: no Pn, no two-stage P0, no crash
for V in [{'2:D1': 1, '2:D2': 1.2, '2:g': .1, '2:rE': .08}, {'2:D0': 1, '2:gs': .2, '2:N': 3, '2:g': .1, '2:rE': .08}]:
    out, res, errs = every(V)
    if errs or any(r['d'] in ('s2_pn', 's2_p0gs', 'p0n') for r in res): fails.append(f'rE <= g {list(V)}: {res} {errs}')
# odd input never crashes
for V in [{b: 1 for b in EVERY.BOX.keys() if b.startswith('2:')}, {'2:t': 0, '2:P0': 1, '2:g': -1}, {'2:N': 0, '2:gs': 0, '2:D0': 0, '2:g': 0, '2:rE': 0},
          {'2:Dlev': 1, '2:nD': 3, '2:rE': 0, '2:Pn': 5}, {b: 1 for b in EVERY.BOX.keys()}]:
    out, res, errs = every(V)
    if errs: fails.append(f'odd input {list(V)[:4]}: {errs}')

# 4. the boxes: symbol first, a hint each; the bond's FVn hint names the sale price
for b in ['2:t', '2:Pt', '2:g1', '2:g2', '2:g3', '2:g4', '2:g5', '2:gs', '2:N', '2:Dlev', '2:nD', '2:Pcum']:
    bx = EVERY.BOX[b]
    if bx is None: fails.append(f'box {b} missing'); continue
    if not str(bx.label).startswith(b[2:] + ' '): fails.append(f'box {b}: label {bx.label!r} does not start with its symbol')
    if not bx.hint or len(str(bx.hint)) > 62: fails.append(f'box {b}: hint {bx.hint!r}')
    if len(str(bx.label)) > 30: fails.append(f'box {b}: label too long {bx.label!r}')
h = str(EVERY.BOX['2:FVn'].hint)
if 'sale price' not in h or 'realised yield' not in h: fails.append(f'2:FVn hint: {h!r}')
nt = str(G.CORE.TYPES[EVERY.ti].notes)
for w in ['Pt = P0*(1 + g)^t', 'D1 = D0*(1 + g1)', 'Pn = Dn*(1 + g)/(rE - g)', 'Pcum = P0 + D0']:
    if w not in nt: fails.append(f'notes: {w!r} missing')

print(f'{len(MORE)} section 2 pack lines: {nback} letters left out and found again')
print(f'{len(fails)} problem(s)')
for f in fails[:60]: print(' -', f)
sys.exit(1 if fails else 0)
