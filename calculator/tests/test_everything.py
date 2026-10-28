"""The Everything page (home key E): a box for every letter on the formula sheet, every solvable line listed.
   node calculator/tools/build.js && python3 calculator/tests/test_everything.py
For every root formula's example (def.ex): the example's letters typed into the Everything boxes with ONE letter left
out must give that letter back (as on the R pages, test_roots.py); a typed box is never overwritten; alternative lines
(annuity / annuity due / perpetuity, ...) are listed separately and never feed each other; answers are passed on only
when one line gave them. Section 9 (the extra lines, NOT on the sheet): each letter of each line comes back, the chain
FCF, rU -> VU -> VL -> E = VL - D -> share price, E = shares x price -> the WACC weights. Own numbers only."""
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

# 2. alternatives: C 100, r 5%, n 10 -> the annuity PV is passed on; the annuity due is listed only ('only if ...');
#    n typed leaves out the perpetuity (it never ends); C and r alone -> the perpetuity
out, res, errs = every({'1:C': 100, '1:r': 0.05, '1:n': 10})
pv = {r['d']: r for r in res if r['box'] == '1:PV'}
if set(pv) != {'pva', 'pvad'}: fails.append(f'alternatives: PV lines {sorted(pv)}, want pva and pvad')
if 'pva' not in pv or not close(pv['pva']['value'], 772.173493) or not pv['pva']['passed']: fails.append(f'alternatives: pva {pv.get("pva")}')
if 'pvad' not in pv or not close(pv['pvad']['value'], 810.782168) or pv['pvad']['passed']: fails.append(f'alternatives: pvad {pv.get("pvad")}')
t = ' '.join(str(r.text) for r in lt(out.rows))
if 'only if the payments are at the START' not in t: fails.append('alternatives: the annuity due is not marked only if')
if any(r['d'] in ('fv', 'pv') for r in res): fails.append('alternatives: a PV from an annuity line fed the lump-sum lines')
out, res, errs = every({'1:C': 100, '1:r': 0.05})
pv = [r for r in res if r['d'] == 'perp']
if not pv or not close(pv[0]['value'], 2000): fails.append(f'perpetuity: {pv}')
# a growth rate leaves out the level lines; n typed -> the growing annuity, no n -> the growing perpetuity
out, res, errs = every({'1:C': 100, '1:r': 0.08, '1:g': 0.03, '1:n': 20})
ds = sorted(r['d'] for r in res if r['box'] == '1:PV')
if ds != ['gann']: fails.append(f'growth: PV lines {ds}, want the growing annuity only')
out, res, errs = every({'1:C': 100, '1:r': 0.08, '1:g': 0.03})
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

# 4. section 9, the extra lines (NOT on the sheet): each one, every letter left out in turn, comes back (own numbers)
EXTRA = {d.id: d for d in lt(EVERY.EXTRA)}
FULL = {'eqvl': {'E': 850, 'VL': 1250, 'D': 400}, 'price': {'price': 21.25, 'E': 850, 'shares': 40},
        'mv': {'E': 620, 'shares': 50, 'price': 12.4}, 'vucf': {'VU': 800, 'FCF': 96, 'rU': .12},
        'vuebit': {'VU': 1050, 'EBIT': 150, 'Tc': .3, 'rU': .1}, 'rdat': {'rdat': .049, 'rd': .07, 'Tc': .3},
        'twostg': {'PV': 539.7302896935013, 'C': 50, 'r': .08, 'n': 10, 'g2': -.03}}
TWIN = {'price': 'mv', 'mv': 'price'}   # the same relation written for E and for the price: they agree
nextra = 0
if sorted(EXTRA) != sorted(FULL): fails.append(f'extra lines: {sorted(EXTRA)}, want {sorted(FULL)}')
for did, full in FULL.items():
    d = EXTRA.get(did)
    if d is None: continue
    if abs(d.f(lua.table_from(full))) > 1e-9: fails.append(f'extra {did}: the test numbers do not fit the line')
    if [va.k for va in lt(d.vars)] != list(full): fails.append(f'extra {did}: letters {[va.k for va in lt(d.vars)]}')
    for k in full:
        box = EVERY.boxOf(did, k)
        if not box or not (box == 'Tc' or box.startswith('9:')): fails.append(f'extra {did}: {k} has the box {box}')
        Vb = {EVERY.boxOf(did, kk): vv for kk, vv in full.items() if kk != k}
        out, res, errs = every(Vb)
        nextra += 1
        if errs: fails.append(f'extra {did} without {k}: {errs}'); continue
        got = [r for r in res if r['box'] == box and r['d'] in (did, TWIN.get(did))]
        if not got or not all(close(r['value'], full[k]) for r in got):
            fails.append(f'extra {did}: without {k} ({box}) gives {[(r["d"], r["value"]) for r in got]}, want {full[k]}')
        for r in res:
            if r['box'] in Vb: fails.append(f'extra {did} without {k}: the typed box {r["box"]} was solved again by {r["d"]}')
        # marked as NOT on the sheet: in its explanation and in the NOT ON THE SHEET section, never as a sheet line
        rows = [r for r in lt(out.rows) if r.kind == 'val' and r.explain is not None and str(r.label).endswith(': ' + str(lt(d.vars)[[va.k for va in lt(d.vars)].index(k)].t))]
        ex = ' '.join(str(e[2]) for r in rows for e in lt(r.explain))
        for w in ['the formula (NOT on the formula sheet):', 'NOT ON THE FORMULA SHEET', 'your numbers in it:']:
            if w not in ex: fails.append(f'extra {did} without {k}: explanation lacks {w!r}')
        if not any(c.isdigit() for c in ex): fails.append(f'extra {did} without {k}: the explanation has no numbers')
        t = ' '.join(str(r.text) for r in lt(out.rows))
        if '9. Extra lines (not on the sheet)' not in t or 'NOT ON THE SHEET' not in t: fails.append(f'extra {did} without {k}: no section 9 / NOT ON THE SHEET')
        if out.fsbad is not None: fails.append(f'extra {did} without {k}: unknown formula ids {list(out.fsbad.values())}')
        if any(i in EXTRA for i in lt(out.fsids)): fails.append(f'extra {did} without {k}: listed as a sheet line')
        offs = [str(o[1]) for o in lt(out.fsoff)]
        want = [G.FSHEET.off[x.off][1] for x in (d, EXTRA.get(TWIN.get(did))) if x is not None]   # the line listed (or its twin)
        if not any(w in offs for w in want): fails.append(f'extra {did} without {k}: {d.off} not under NOT ON THE SHEET ({offs})')

# the chain: FCF 96 and rU 12% -> VU 800 (extra lines); Tc 30% and D 400 (Tax World) -> PV(ITS) 120 -> VL 920 (Tax World)
# -> E = VL - D = 520 -> price = 520/40 shares = 13. D typed in either section gives the same.
for dbox in ('8:D', '9:D'):
    out, res, errs = every({'Tc': .3, dbox: 400, '9:FCF': 96, '9:rU': .12, '9:shares': 40})
    byd = {r['d']: r for r in res}
    for k, v, ch in [('vucf', 800, False), ('pvits', 120, dbox == '9:D'), ('vl', 920, True), ('eqvl', 520, True), ('price', 13, True)]:
        if k not in byd or not close(byd[k]['value'], v) or byd[k]['chained'] != ch or not byd[k]['passed']:
            fails.append(f'extra chain (D in {dbox}): {k} = {byd.get(k)}, want {v} (chained {ch})')
    t = ' '.join(str(r.text) for r in lt(out.rows))
    for w in ['uses VU from All-equity value (FCF forever)', 'uses VL from Levered value (MM with tax)', 'uses E from Equity after borrowing',
              'Share price: price = $13.00']:
        if w not in t: fails.append(f'extra chain (D in {dbox}): {w!r} missing')
    prow = [r for r in lt(out.rows) if r.kind == 'val' and str(r.text).startswith('Share price: price')]
    ex = ' '.join(str(e[2]) for e in lt(prow[0].explain)) if prow else ''
    for w in ['price = E/shares', 'price = 520/40', 'price = 13.00', 'E from Equity after borrowing: $520.00', 'NOT ON THE FORMULA SHEET']:
        if w not in ex: fails.append(f'extra chain: the price explanation lacks {w!r}')
# the number of shares from the price: E = VL - D, then shares = E/price
out, res, errs = every({'9:VL': 1300, '9:D': 500, '9:price': 16})
sh = [r for r in res if r['box'] == '9:shares']
if not sh or not close(sh[0]['value'], 50) or not sh[0]['chained']: fails.append(f'extra: shares from E = VL - D and the price {sh}, want 50')
t = ' '.join(str(o[1]) for o in lt(out.fsoff))
if 'shares = E/price' not in t: fails.append(f'extra: the rearranged shares = E/price is not under NOT ON THE SHEET ({t})')
# E = shares x price feeds the WACC weights (Cost of Capital) and the Tax World's WACC
out, res, errs = every({'9:shares': 50, '9:price': 12.4, '6:D': 380, '6:re': .11, '6:rd': .06, 'Tc': .3})
byd = {r['d']: r for r in res}
for k, v, ch in [('mv', 620, False), ('v', 1000, True), ('wacc', .11 * 620 / 1000 + .06 * .7 * 380 / 1000, True), ('rdat', .042, True)]:
    if k not in byd or not close(byd[k]['value'], v) or byd[k]['chained'] != ch: fails.append(f'extra E -> WACC: {k} = {byd.get(k)}, want {v}')
t = ' '.join(str(r.text) for r in lt(out.rows))
if 'uses E from Market value of equity' not in t or 'uses rd typed in Cost of Capital' not in t: fails.append(f'extra E -> WACC: the uses notes {t[:400]}')
out, res, errs = every({'9:shares': 50, '9:price': 12.4, '8:rE': .12, '8:rD': .06, '8:D': 380, 'Tc': .3})
w = [r for r in res if r['d'] == 'wacct']
if not w or not close(w[0]['value'], .12 * .62 + .06 * .38 * .7) or not w[0]['chained']: fails.append(f'extra E -> Tax World WACC: {w}')
# rd after tax, the other way: rd_at and Tc -> rd -> the WACC's rd
out, res, errs = every({'9:rdat': .042, 'Tc': .3, '6:E': 600, '6:D': 400, '6:re': .1})
byd = {r['d']: r for r in res}
if 'rdat' not in byd or not close(byd['rdat']['value'], .06): fails.append(f'extra rd from rd_at: {byd.get("rdat")}')
if 'wacc' not in byd or not close(byd['wacc']['value'], .1 * .6 + .042 * .4) or not byd['wacc']['chained']: fails.append(f'extra rd -> WACC: {byd.get("wacc")}')
# rU found in the Tax World (MM II with tax) -> VU = FCF/rU; rU typed in the No Tax World is used too
out, res, errs = every({'8:rE': .13, '8:rD': .05, '8:D': 300, '8:E': 700, 'Tc': .3, '9:FCF': 90})
ru = (.13 + 300 / 700 * .7 * .05) / (1 + 300 / 700 * .7)
vu = [r for r in res if r['d'] == 'vucf']
if not vu or not close(vu[0]['value'], 90 / ru) or not vu[0]['chained']: fails.append(f'extra rU (MM II with tax) -> VU: {vu}, want {90 / ru}')
out, res, errs = every({'7:rU': .1, '9:FCF': 90})
vu = [r for r in res if r['d'] == 'vucf']
if not vu or not close(vu[0]['value'], 900): fails.append(f'extra rU typed in the No Tax World -> VU: {vu}')
# a project's FCF (Dep blank = 0: a sunk asset's Dep is left out) -> n years, then growth forever (own numbers)
out, res, errs = every({'3:Rev': 400, '3:Costs': 180, '3:tc': .3, '9:r': .07, '9:n': 12, '9:g2': -.04})
byd = {r['d']: r for r in res}
fc = 220 * .7
pv2 = fc / .07 * (1 - 1 / 1.07 ** 12) + fc * .96 / .11 / 1.07 ** 12
if 'fcf' not in byd or not close(byd['fcf']['value'], fc): fails.append(f'FCF with Dep blank: {byd.get("fcf")}')
if 'twostg' not in byd or not close(byd['twostg']['value'], pv2) or not byd['twostg']['chained']: fails.append(f'FCF -> two stages: {byd.get("twostg")}, want {pv2}')
frow = [r for r in lt(out.rows) if r.kind == 'val' and str(r.text).startswith('Free cash flow')]
ex = ' '.join(str(e[2]) for e in lt(frow[0].explain)) if frow else ''
if 'blank, so 0: Dep, CapEx, dNWC' not in ex: fails.append(f'FCF blank-as-0 note: {ex[:300]}')
trow = [r for r in lt(out.rows) if r.kind == 'val' and str(r.text).startswith('Value: n years')]
ex = ' '.join(str(e[2]) for e in lt(trow[0].explain)) if trow else ''
for w in ['C = FCF from Free cash flow (one year): $154.00', 'NOT ON THE FORMULA SHEET', 'growing perpetuity']:
    if w not in ex: fails.append(f'two stages explanation lacks {w!r}: {ex[:400]}')
# the rate typed in Capital Budgeting reaches the two-stage line too
out, res, errs = every({'3:FCF': 154, '3:r': .07, '9:n': 12, '9:g2': -.04})
byd = {r['d']: r for r in res}
if 'twostg' not in byd or not close(byd['twostg']['value'], pv2): fails.append(f'3:r -> two stages: {byd.get("twostg")}')
# r below g2: no value, no crash
out, res, errs = every({'9:C': 10, '9:r': .03, '9:n': 5, '9:g2': .05})
if errs or any(r['d'] == 'twostg' for r in res): fails.append(f'two stages r < g2: {res} {errs}')
# alternatives: VU from FCF and VU from EBIT never feed each other; different answers are both listed, not passed on
out, res, errs = every({'9:FCF': 90, '9:EBIT': 150, 'Tc': .3, '9:rU': .1, '8:PVITS': 100})
vus = {r['d']: r for r in res if r['box'] == '9:VU'}
if set(vus) != {'vucf', 'vuebit'} or any(r['passed'] or r['alts'] != 2 for r in vus.values()): fails.append(f'extra VU alternatives: {vus}')
if any(r['d'] == 'vl' for r in res): fails.append('extra VU alternatives: an ambiguous VU reached VL = VU + PV(ITS)')
out, res, errs = every({'9:FCF': 105, '9:EBIT': 150, 'Tc': .3, '9:rU': .1, '8:PVITS': 100})
vl = [r for r in res if r['d'] == 'vl']
if not vl or not close(vl[0]['value'], 1150): fails.append(f'extra VU lines agree: VL {vl}, want 1150')
out, res, errs = every({'9:VU': 1000, '9:EBIT': 150, '9:rU': .1})
if [r['d'] for r in res if r['box'] == 'Tc'] != ['vuebit'] or any(r['d'] == 'vucf' and r['chained'] for r in res): fails.append(f'extra VU: {res}')
# E is passed on only when unambiguous: E = VL - D (600) and E = shares x price (500) disagree -> neither feeds the WACC
out, res, errs = every({'9:VL': 1000, '9:D': 400, '9:shares': 50, '9:price': 10, '6:re': .1, '6:rd': .05, '6:D': 400, 'Tc': .3})
es = [r for r in res if r['box'] == '9:E']
if sorted(round(r['value']) for r in es) != [500, 600] or any(r['passed'] for r in es): fails.append(f'extra ambiguous E: {es}')
if any(r['d'] in ('wacc', 'v', 'wacct') for r in res): fails.append('extra ambiguous E: an ambiguous E fed a WACC line')
# typed boxes are never overwritten: E typed in the Tax World stays; the extra lines' E is its own box
out, res, errs = every({'9:VL': 1000, '9:D': 400, '8:E': 650, '8:rE': .12, '8:rD': .05, 'Tc': .3})
if any(r['box'] in ('9:VL', '9:D', '8:E', '8:D', 'Tc') for r in res): fails.append(f'extra typed: a typed box was solved {res}')
w = [r for r in res if r['d'] == 'wacct']
if not w or not close(w[0]['value'], .12 * 650 / 1050 + .05 * 400 / 1050 * .7): fails.append(f'extra typed: the Tax World WACC used {w}, want E 650')
# the N page explains the extra lines and the links
nt = str(G.CORE.TYPES[EVERY.ti].notes)
for w in ['9. EXTRA LINES (NOT ON THE SHEET)', 'price = E/shares', 'E = shares*price', 'VU = FCF/rU', 'VU = EBIT*(1 - Tc)/rU',
          'rd_at = rd*(1 - Tc)', 'Extra lines <-> Tax World', 'Tc (company tax rate) is ONE box']:
    if w not in nt: fails.append(f'notes: {w!r} missing')

print(f'{len(lt(DEFS))} root formulas: {nback} letters left out and found again through the Everything boxes')
print(f'{len(FULL)} extra lines (not on the sheet): {nextra} letters left out and found again')
print(f'{len(fails)} problem(s)')
for f in fails[:60]: print(' -', f)
sys.exit(1 if fails else 0)
