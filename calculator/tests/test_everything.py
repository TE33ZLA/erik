"""The Everything page (home key E): a box for every letter on the formula sheet, every solvable line listed.
   node calculator/tools/build.js && python3 calculator/tests/test_everything.py
For every root formula's example (def.ex): the example's letters typed into the Everything boxes with ONE letter left
out must give that letter back (as on the R pages, test_roots.py); a typed box is never overwritten; alternative lines
(annuity / annuity due / perpetuity, ...) are listed separately and never feed each other; answers are passed on only
when one line gave them. Own numbers only."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'mock'))
from nspire_mock import NspireApp

app = NspireApp(open(os.path.join(HERE, '..', 'build', 'bfc2140_solver.lua')).read())
lua = app.lua
G = lua.globals()
CORE, DEFS, EVERY = G.CORE, G.ROOTDEFS, G.EVERY
fails = []
nback = 0

def lt(t): return [t[i] for i in range(1, len(t) + 1)] if t is not None else []
def close(a, b, rel=1e-5): return a is not None and abs(a - b) <= rel * max(1.0, abs(b))

def every(V):
    """Run the Everything solver on {box: value} (rates as decimals, as after the boxes are read)."""
    out = CORE.run(EVERY.ti, lua.table_from(V))
    rows = lt(out.rows)
    errs = [r.text for r in rows if r.kind == 'err' and 'internal' in str(r.text)]
    res = [dict(box=e.box, value=e.value, d=e['def'], chained=e.chained, alts=e.alts, passed=e.passed) for e in lt(out.every)]
    return out, res, errs

# 1. every root formula's example, one letter left out, comes back through the Everything boxes
for d in lt(DEFS):
    ex = dict(d.ex.items()) if d.ex is not None else {}
    o = CORE.run(d.ti, lua.table_from(ex))
    vals = dict(o.vals.items())
    keys = [va.k for va in lt(d.vars)]
    full = dict(ex)
    full.update({k: v for k, v in vals.items() if k in keys})
    for va in lt(d.vars):
        k = va.k
        if va.opt or va.list or k not in full: continue
        box = EVERY.boxOf(d.id, k)
        if not box: continue
        V = {kk: vv for kk, vv in full.items() if kk != k}
        if va.alt is not None and va.alt.ok(lua.table_from(V)): continue   # worked out from a helper box, never blank
        Vb = {}
        for kk, vv in V.items():
            b = EVERY.boxOf(d.id, kk)
            if b: Vb[b] = vv
        out, res, errs = every(Vb)
        if errs: fails.append(f'{d.id} without {k}: {errs}'); continue
        got = [r for r in res if r['box'] == box]
        ok = any(close(r['value'], full[k]) for r in got)
        if not ok and got:
            # a formula with two answers (a squared term): the other one is fine if the line then holds
            for r in got:
                if r['d'] != d.id: continue
                x = dict(full); x[k] = r['value']
                try:
                    if abs(d.f(lua.table_from(x))) < 1e-8 * max(1.0, abs(full[k])): ok = True
                except Exception: pass
        nback += 1
        if not ok: fails.append(f'{d.id}: without {k} ({box}) the Everything page gives {[(r["d"], r["value"]) for r in got]}, want {full[k]}')
        for r in res:
            if r['box'] in Vb: fails.append(f'{d.id} without {k}: the typed box {r["box"]} was solved again by {r["d"]}')
        if not any(r['box'] == box and r['d'] == d.id or close(r['value'], full[k]) for r in got):
            fails.append(f'{d.id} without {k}: the line itself is not listed')

# 2. alternatives: C 100, r 5%, n 10 -> PV of an annuity, an annuity due and a perpetuity, each listed, none passed on
out, res, errs = every({'1:C': 100, '1:r': 0.05, '1:n': 10})
pv = {r['d']: r for r in res if r['box'] == '1:PV'}
want = {'pva': 772.173493, 'pvad': 810.782168, 'perp': 2000.0}
for k, v in want.items():
    if k not in pv or not close(pv[k]['value'], v): fails.append(f'alternatives: {k} PV = {pv.get(k)}, want {v}')
    elif pv[k]['passed'] or pv[k]['alts'] != 3: fails.append(f'alternatives: {k} PV is passed on or not marked one of 3 ({pv[k]})')
if any(r['d'] in ('fv', 'pv') for r in res): fails.append('alternatives: a PV from an annuity line fed the lump-sum lines')
if any(r['chained'] for r in res): fails.append(f'alternatives: an answer used another line\'s PV {res}')
# a growth rate leaves out the level lines; the growing perpetuity and annuity are listed
out, res, errs = every({'1:C': 100, '1:r': 0.08, '1:g': 0.03, '1:n': 20})
ds = sorted(r['d'] for r in res if r['box'] == '1:PV')
if ds != ['gann', 'gperp']: fails.append(f'growth: PV lines {ds}, want the growing annuity and perpetuity only')
gp = [r for r in res if r['d'] == 'gperp']
if not gp or not close(gp[0]['value'], 2000): fails.append(f'growth: growing perpetuity {gp}, want 2000')
# a typed box is never overwritten: PV typed with C, r, n -> no PV line; the lines solve other letters instead
out, res, errs = every({'1:PV': 1000, '1:C': 100, '1:r': 0.05, '1:n': 10})
if any(r['box'] in ('1:PV', '1:C', '1:r', '1:n') for r in res): fails.append(f'typed: a typed box was solved {res}')
# the two variances (states, past data) are separate boxes; the two covariances share one box but are both listed
V = {'5:p1': .3, '5:Si1': -.1, '5:Sj1': .05, '5:p2': .4, '5:Si2': .15, '5:Sj2': .08, '5:p3': .3, '5:Si3': .3, '5:Sj3': .02,
     '5:Yi1': .1, '5:Yj1': .02, '5:Yi2': -.05, '5:Yj2': .12, '5:Yi3': .2, '5:Yj3': -.04}
out, res, errs = every(V)
cov = {r['d']: r for r in res if r['box'] == '5:Cov'}
if set(cov) != {'covp', 'covs'} or any(r['passed'] for r in cov.values()): fails.append(f'covariances: {cov}')
if any(r['d'] == 'corr' for r in res): fails.append('covariances: two different covariances fed the correlation line')
vs = {r['box'] for r in res if r['d'] in ('varp', 'vars')}
if vs != {'5:VarS', '5:VarR'}: fails.append(f'variances: boxes {vs}')

# 3. chaining: APR 6% monthly -> EAR; CAPM (rf 3, beta 1.2, E[RM] 9) -> re -> WACC with E 600, D 400, rD 6%, Tc 30%
out, res, errs = every({'1:APR': .06, '1:m': 12, '5:rf': .03, '5:Beta': 1.2, '5:ERM': .09, '6:E': 600, '6:D': 400, '6:rd': .06, 'Tc': .3})
byd = {r['d']: r for r in res}
for k, v in [('ear', 0.0616778), ('capm', 0.102), ('wacc', 0.078), ('v', 1000)]:
    if k not in byd or not close(byd[k]['value'], v): fails.append(f'chain: {k} = {byd.get(k)}, want {v}')
if 'wacc' in byd and not byd['wacc']['chained']: fails.append('chain: the WACC is not marked as using re from CAPM')
t = ' '.join(str(r.text) for r in lt(out.rows))
if 'uses re = E[Ri] from CAPM' not in t: fails.append('chain: no "(uses re = E[Ri] from CAPM ...)" note')
wrow = [r for r in lt(out.rows) if r.kind == 'val' and str(r.text).startswith('WACC')]
ex = ' '.join(str(e[2]) for e in lt(wrow[0].explain)) if wrow else ''
for w in ['rWACC = re*E/V + rp*P/V + rd*(1 - Tc)*D/V', '0.102*600/1000', 'rWACC = 7.80%', 'blank, so 0: rp, P']:
    if w not in ex: fails.append(f'WACC explanation: {w!r} missing')
# rE typed in the No Tax World crosses to the Tax World (labelled); a derived rE does not
out, res, errs = every({'7:rU': .1, '7:rD': .06, '7:D': 400, '7:E': 600, 'Tc': .3})
r7 = [r for r in res if r['box'] == '7:rE']
r8 = [r for r in res if r['box'] == '8:rE']
if not r7 or not close(r7[0]['value'], 0.1 + 400 / 600 * 0.04): fails.append(f'MM II no tax: {r7}')
if not r8 or not close(r8[0]['value'], 0.1 + 400 / 600 * 0.04 * 0.7) or not r8[0]['chained']: fails.append(f'MM II with tax (typed values crossed): {r8}')
# an SD is the root of its variance: states -> E(Ri) and Var(i) -> SD -> CV (own numbers)
out, res, errs = every({'5:p1': .2, '5:Si1': -.05, '5:p2': .5, '5:Si2': .1, '5:p3': .3, '5:Si3': .2})
er = .2 * -.05 + .5 * .1 + .3 * .2
sd = (.2 * (-.05 - er) ** 2 + .5 * (.1 - er) ** 2 + .3 * (.2 - er) ** 2) ** .5
cv = [r for r in res if r['d'] == 'cv']
if not cv or not close(cv[0]['value'], sd / er) or not cv[0]['chained']: fails.append(f'CV from the states: {cv}, want {sd / er}')
# nothing solvable: the lines one value short are named
out, res, errs = every({'1:C': 100})
t = ' '.join(str(r.text) for r in lt(out.rows))
if res or 'ONE VALUE SHORT' not in t or 'PV of a perpetuity: type PV or r' not in t: fails.append(f'one value short: {t[:300]}')
out, res, errs = every({})
if 'Nothing typed yet' not in ' '.join(str(r.text) for r in lt(out.rows)): fails.append('nothing typed: no message')
# odd input never crashes
for V in [{'1:r': -1, '1:C': 5, '1:n': 0}, {'1:r': 0, '1:C': 1}, {'2:rE': .05, '2:g': .05, '2:D1': 1}, {'3:NCF0': 0},
          {'5:p1': 0, '5:Si1': 0}, {'6:E': 0, '6:D': 0, '6:re': .1, '6:rd': .05}, {b: 1 for b in EVERY.BOX.keys()}]:
    out, res, errs = every(V)
    if errs: fails.append(f'odd input {list(V)[:4]}: {errs}')

print(f'{len(lt(DEFS))} root formulas: {nback} letters left out and found again through the Everything boxes')
print(f'{len(fails)} problem(s)')
for f in fails[:60]: print(' -', f)
sys.exit(1 if fails else 0)
