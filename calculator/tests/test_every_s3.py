"""The Everything page, section 3 pack (every_s3.lua): a project's cash flows, NOT on the formula sheet.
   node calculator/tools/build.js && python3 calculator/tests/test_every_s3.py
Rev = price*units, straight-line Dep, EBIT, earnings after tax, OCF, dNWC from the NWC items, the year's total cash
flow CF = OCF - CapEx - dNWC + ATS, the depreciation tax shield and the tax on a sale. For every line: each letter left
out in turn comes back; the chains with the sheet's lines (FCF, after-tax salvage, the two-stage line) work; and the
lines stay quiet where they do not fit. Own numbers only."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'mock'))
from nspire_mock import NspireApp, text_width

app = NspireApp(open(os.path.join(HERE, '..', 'build', 'bfc2140_solver.lua')).read())
lua = app.lua
G = lua.globals()
CORE, EVERY = G.CORE, G.EVERY
fails = []

def lt(t): return [t[i] for i in range(1, len(t) + 1)] if t is not None else []
def close(a, b, rel=1e-6): return a is not None and abs(a - b) <= rel * max(1.0, abs(b))

def every(V):
    """Run the Everything solver on {box: value} (rates as decimals)."""
    out = CORE.run(EVERY.ti, lua.table_from(V))
    rows = lt(out.rows)
    errs = [r.text for r in rows if r.kind == 'err' and 'internal' in str(r.text)]
    res = [dict(box=e.box, value=e.value, d=e['def'], chained=e.chained, alts=e.alts, passed=e.passed) for e in lt(out.every)]
    return out, res, errs

def explain(out, start):
    rows = [r for r in lt(out.rows) if r.kind == 'val' and str(r.text).startswith(start) and r.explain is not None]
    return ' '.join(str(e[2]) for r in rows for e in lt(r.explain))

MORE = {d.id: d for d in lt(EVERY.MORE) if str(d.id).startswith('s3_')}
IDS = ['s3_rev', 's3_dep', 's3_ebit', 's3_earn', 's3_ocf', 's3_nwc', 's3_cf', 's3_dts', 's3_taxs']
if sorted(MORE) != sorted(IDS): fails.append(f'lines: {sorted(MORE)}, want {sorted(IDS)}')

# 1. each line, every letter it can solve left out in turn, comes back (own numbers; opt letters are only ever typed)
FULL = {
    's3_rev': {'Rev': 75000, 'price': 25, 'units': 3000},
    's3_dep': {'Dep': 11500, 'Cost': 84000, 'life': 6, 'SVd': 6000, 'DepOld': 1500},
    's3_ebit': {'EBIT': 3500, 'Rev': 7200, 'Costs': 2600, 'Dep': 1100},
    's3_earn': {'Earn': 2450, 'EBIT': 3500, 'tc': .3},
    's3_ocf': {'OCF': 3550, 'Earn': 2450, 'Dep': 1100},
    's3_nwc': {'dNWC': 300, 'Inv1': 900, 'AR1': 650, 'AP1': 400, 'Inv0': 700, 'AR0': 500, 'AP0': 350},
    's3_cf': {'CF': 4300, 'OCF': 3550, 'CapEx': 800, 'dNWC': -350, 'ATS': 1200},
    's3_dts': {'DTS': 330, 'Dep': 1100, 'tc': .3},
    's3_taxs': {'TaxSale': 1500, 'SV': 9000, 'BV': 4000, 'tc': .3},
}
nback = 0
for did, full in FULL.items():
    d = MORE.get(did)
    if d is None: continue
    if abs(d.f(lua.table_from(full))) > 1e-9: fails.append(f'{did}: the test numbers do not fit the line')
    if int(d.sec) != 3: fails.append(f'{did}: section {d.sec}')
    for f in ('name', 'short', 'eq', 'why', 'ex'):
        if d[f] is None: fails.append(f'{did}: no {f}')
    ex = dict(d.ex.items())
    for k, va in ((va.k, va) for va in lt(d.vars)):
        box = EVERY.boxOf(did, k)
        if box != '3:' + k: fails.append(f'{did}: {k} has the box {box}')
        if va.opt: continue
        Vb = {EVERY.boxOf(did, kk): vv for kk, vv in full.items() if kk != k}
        out, res, errs = every(Vb)
        nback += 1
        if errs: fails.append(f'{did} without {k}: {errs}'); continue
        got = [r for r in res if r['box'] == box and r['d'] == did]
        if not got or not close(got[0]['value'], full[k]) or got[0]['alts'] != 1:
            fails.append(f'{did}: without {k} gives {[(r["d"], r["value"], r["alts"]) for r in res if r["box"] == box]}, want {full[k]}')
        for r in res:
            if r['box'] in Vb: fails.append(f'{did} without {k}: the typed box {r["box"]} was solved again by {r["d"]}')
        e = explain(out, str(d.name) + ': ' + str(va.t))
        for w in ['the formula (NOT on the formula sheet):', 'NOT ON THE FORMULA SHEET', 'your numbers in it:']:
            if w not in e: fails.append(f'{did} without {k}: the explanation lacks {w!r}')
        offs = [str(o[1]) for o in lt(out.fsoff)]
        if G.FSHEET.off[d.off][1] not in offs: fails.append(f'{did} without {k}: not under NOT ON THE SHEET')
    # its own example works too
    out, res, errs = every({EVERY.boxOf(did, k): v for k, v in ex.items()})
    if not any(r['d'] == did and r['box'] == EVERY.boxOf(did, lt(d.vars)[0].k) for r in res): fails.append(f'{did}: its example {ex} gives {res}')

# the written forms: only the parts that were typed
out, res, errs = every({'3:Cost': 42000, '3:life': 7})
e = explain(out, 'Straight-line depreciation')
for w in ['Dep = Cost/life', 'Dep = 42000/7', 'Dep = 6000.00']:
    if w not in e: fails.append(f'Dep = Cost/life: {w!r} missing ({e[:200]})')
out, res, errs = every({'3:Cost': 42000, '3:life': 7, '3:SVd': 7000, '3:DepOld': 1200})
e = explain(out, 'Straight-line depreciation')
for w in ['Dep = (Cost - SVd)/life - DepOld', 'Dep = (42000 - 7000)/7 - 1200', 'Dep = 3800.00']:
    if w not in e: fails.append(f'Dep, a replacement: {w!r} missing ({e[:200]})')
out, res, errs = every({'3:Dep': 3800, '3:life': 7, '3:DepOld': 1200})
e = explain(out, 'Straight-line depreciation')
if 'Cost = (Dep + DepOld)*life' not in e: fails.append(f'Cost rearranged: {e[:300]}')
out, res, errs = every({'3:AR1': 2600})
e = explain(out, 'Change in NWC')
if 'dNWC = AR1' not in e or 'dNWC = 2600' not in e: fails.append(f'dNWC = AR1: {e[:300]}')
out, res, errs = every({'3:Inv1': 800, '3:AP1': 300, '3:Inv0': 650})
d = [r for r in res if r['d'] == 's3_nwc']
e = explain(out, 'Change in NWC')
if not d or not close(d[0]['value'], -150) or 'dNWC = (Inv1 - AP1) - Inv0' not in e: fails.append(f'dNWC some items: {d} {e[:300]}')

# 2. chains
# a question that gives EBIT (no revenue or costs), Dep, CapEx, after-tax salvage, tc and the NWC items of two years
V = {'3:EBIT': 5200, '3:Dep': 1400, '3:CapEx': 900, '3:ATS': 2100, '3:tc': .3,
     '3:Inv1': 1500, '3:AR1': 1100, '3:AP1': 700, '3:Inv0': 1200, '3:AR0': 900, '3:AP0': 600}
out, res, errs = every(V)
byd = {r['d']: r for r in res}
for k, v in [('s3_nwc', 400), ('s3_earn', 3640), ('s3_ocf', 5040), ('s3_cf', 5840)]:
    if k not in byd or not close(byd[k]['value'], v) or not byd[k]['passed']: fails.append(f'EBIT chain: {k} = {byd.get(k)}, want {v}')
if any(r['d'] in ('s3_dts', 's3_ebit', 'fcf') for r in res): fails.append(f'EBIT chain: noise {[r["d"] for r in res]}')
if 'uses OCF from Operating cash flow; dNWC from Change in NWC' not in ' '.join(str(r.text) for r in lt(out.rows)): fails.append('EBIT chain: the uses note')
# revenue, costs, the asset's cost and life: Dep -> EBIT -> earnings -> OCF; the sheet's FCF line agrees; no CF line (no sale)
out, res, errs = every({'3:Rev': 52000, '3:Costs': 19000, '3:tc': .25, '3:Cost': 36000, '3:life': 4})
byd = {r['d']: r for r in res}
for k, v in [('s3_dep', 9000), ('s3_ebit', 24000), ('s3_earn', 18000), ('s3_ocf', 27000), ('fcf', 27000)]:
    if k not in byd or not close(byd[k]['value'], v): fails.append(f'Rev chain: {k} = {byd.get(k)}, want {v}')
if any(r['d'] in ('s3_cf', 's3_dts') for r in res): fails.append(f'Rev chain: noise {[r["d"] for r in res]}')
if not byd.get('fcf', {}).get('chained'): fails.append('Rev chain: the FCF line did not use the straight-line Dep')
# year 0: the asset bought, NWC put in, an old asset sold (OCF blank = 0)
out, res, errs = every({'3:CapEx': 62000, '3:dNWC': 4000, '3:SV': 12000, '3:BV': 7000, '3:tc': .3})
byd = {r['d']: r for r in res}
for k, v in [('salv', 10500), ('s3_taxs', 1500), ('s3_cf', -55500)]:
    if k not in byd or not close(byd[k]['value'], v): fails.append(f'year 0: {k} = {byd.get(k)}, want {v}')
e = explain(out, 'Total cash flow of a year')
for w in ['CF = OCF - CapEx - dNWC + ATS', 'blank, so 0: OCF', 'ATS from After-tax salvage']:
    if w not in e: fails.append(f'year 0 explanation: {w!r} missing ({e[:300]})')
# the last year: OCF given, NWC back (negative), the asset sold
out, res, errs = every({'3:OCF': 8800, '3:dNWC': -3000, '3:SV': 2500, '3:BV': 0, '3:tc': .3})
byd = {r['d']: r for r in res}
if 's3_cf' not in byd or not close(byd['s3_cf']['value'], 8800 + 3000 + 1750): fails.append(f'last year: {byd.get("s3_cf")}')
if any(r['d'] in ('s3_earn', 's3_ebit', 's3_ocf', 's3_dts') for r in res): fails.append(f'last year: noise {[r["d"] for r in res]}')
# a sale and revenue in the same year: the sheet's FCF (no sale) and the total CF (with the sale) are both listed
out, res, errs = every({'3:Rev': 30000, '3:Costs': 12000, '3:Dep': 5000, '3:tc': .3, '3:dNWC': -2000, '3:ATS': 4000})
byd = {r['d']: r for r in res}
fcf = (30000 - 12000 - 5000) * .7 + 5000 + 2000
if 'fcf' not in byd or not close(byd['fcf']['value'], fcf): fails.append(f'last year with revenue: FCF {byd.get("fcf")}')
if 's3_cf' not in byd or not close(byd['s3_cf']['value'], fcf + 4000): fails.append(f'last year with revenue: CF {byd.get("s3_cf")}')
# the NWC items feed the sheet's FCF line (not dNWC blank = 0)
out, res, errs = every({'3:Rev': 30000, '3:Costs': 12000, '3:Dep': 5000, '3:tc': .3, '3:Inv1': 2500, '3:Inv0': 1000})
f = [r for r in res if r['d'] == 'fcf']
if not f or not close(f[0]['value'], 13 * 700 + 5000 - 1500) or not f[0]['chained'] or len(f) != 1: fails.append(f'NWC items -> FCF: {f}')
# revenue from price and units -> the sheet's FCF line
out, res, errs = every({'3:price': 40, '3:units': 0.15 * 8000, '3:Costs': 20000, '3:Dep': 6000, '3:tc': .3})
byd = {r['d']: r for r in res}
if 's3_rev' not in byd or not close(byd['s3_rev']['value'], 48000): fails.append(f'price x units: {byd.get("s3_rev")}')
if 'fcf' not in byd or not close(byd['fcf']['value'], 22000 * .7 + 6000) or not byd['fcf']['chained']: fails.append(f'price x units -> FCF: {byd.get("fcf")}')
# a replacement: new Dep minus the old one; the saving typed as Rev (or as a negative cost) -> OCF
for save in ({'3:Rev': 18000}, {'3:Costs': -18000}):
    V = {'3:Cost': 45000, '3:life': 5, '3:DepOld': 1500, '3:tc': .4}
    V.update(save)
    out, res, errs = every(V)
    byd = {r['d']: r for r in res}
    for k, v in [('s3_dep', 7500), ('s3_ebit', 10500), ('s3_earn', 6300), ('s3_ocf', 13800)]:
        if k not in byd or not close(byd[k]['value'], v): fails.append(f'replacement {save}: {k} = {byd.get(k)}, want {v}')
# earnings given: OCF -> CF; then CF -> the two-stage line's C (no FCF)
out, res, errs = every({'3:Earn': 7000, '3:Dep': 2000, '3:CapEx': 1500, '3:dNWC': 500, '9:r': .1, '9:n': 5, '9:g2': .02})
byd = {r['d']: r for r in res}
pv2 = 7000 / .1 * (1 - 1 / 1.1 ** 5) + 7000 * 1.02 / .08 / 1.1 ** 5
if 's3_cf' not in byd or not close(byd['s3_cf']['value'], 7000): fails.append(f'earnings -> CF: {byd.get("s3_cf")}')
if 'twostg' not in byd or not close(byd['twostg']['value'], pv2) or not byd['twostg']['chained']: fails.append(f'CF -> two stages: {byd.get("twostg")}, want {pv2}')
if 'C = CF' not in explain(out, 'Value: n years'): fails.append('CF -> two stages: the explanation does not say C = CF')
# the sheet's FCF still goes first to the two-stage line (the existing chain is unchanged)
out, res, errs = every({'3:Rev': 400, '3:Costs': 180, '3:tc': .3, '9:r': .07, '9:n': 12, '9:g2': -.04})
byd = {r['d']: r for r in res}
pv2 = 154 / .07 * (1 - 1 / 1.07 ** 12) + 154 * .96 / .11 / 1.07 ** 12
if 'twostg' not in byd or not close(byd['twostg']['value'], pv2): fails.append(f'FCF -> two stages: {byd.get("twostg")}')
if any(r['alts'] > 1 for r in res): fails.append(f'FCF -> two stages: two answers for one box {res}')
# the depreciation tax shield from the asset's cost and life
out, res, errs = every({'3:Cost': 30000, '3:life': 5, '3:tc': .3})
d = [r for r in res if r['d'] == 's3_dts']
if not d or not close(d[0]['value'], 1800) or not d[0]['chained']: fails.append(f'Dep -> DTS: {d}')

# 3. no noise
def ds(V): return sorted(r['d'] for r in every(V)[1])
for V, want in [
        ({'3:Rev': 9000, '3:Costs': 4000, '3:Dep': 3000, '3:tc': .3}, ['fcf', 's3_earn', 's3_ebit', 's3_ocf']),
        ({'3:price': 20, '3:units': 500}, ['s3_rev']),
        ({'3:SV': 6000, '3:BV': 8000, '3:tc': .3}, ['s3_taxs', 'salv']),
        ({'3:Dep': 4000, '3:tc': .3}, ['s3_dts']),
        ({'3:CapEx': 50000}, []),
        ({'3:Earn': 5000}, []),
        ({'3:EBIT': 5000, '3:Dep': 1000}, []),
        ({'3:Rev': 5000}, []),
        ({'3:OCF': 5000, '3:tc': .3}, []),
        ({'3:Cost': 20000}, []),
        ({'3:NCF0': -1000, '3:NCF1': 600, '3:NCF2': 700, '3:r': .1}, ['irr', 'npv']),
        ({'3:nominal': .08, '3:inflation': .03}, ['fisher'])]:
    got = ds(V)
    if got != want: fails.append(f'noise: {V} lists {got}, want {want}')
out, res, errs = every({'3:Rev': 5000, '3:Costs': 2000, '3:tc': .3})
if 'Revenue from units' in ' '.join(str(r.text) for r in lt(out.rows)): fails.append('noise: Rev typed names the price x units line under ONE VALUE SHORT')
# odd input never crashes
for V in [{'3:Cost': 1000, '3:life': 0}, {'3:Earn': 100, '3:tc': 1}, {'3:EBIT': 0, '3:Earn': 0},
          {'3:SV': 5, '3:BV': 5, '3:TaxSale': 1}, {'3:CF': 0, '3:OCF': 0, '3:CapEx': 0}]:
    out, res, errs = every(V)
    if errs: fails.append(f'odd input {V}: {errs}')

# 4. the boxes: labels and hints fit the screen, ASCII; the rate hint names nominal and real; the N page lists the lines
NEWB = ['3:price', '3:units', '3:Cost', '3:life', '3:SVd', '3:DepOld', '3:EBIT', '3:Earn', '3:OCF', '3:CF',
        '3:Inv1', '3:AR1', '3:AP1', '3:Inv0', '3:AR0', '3:AP0', '3:DTS', '3:TaxSale']
for b in NEWB + ['3:r', '3:dNWC']:
    bx = EVERY.BOX[b]
    if bx is None: fails.append(f'box {b} missing'); continue
    lab, hint = str(bx.label), str(bx.hint)
    if b in NEWB and not lab.startswith(b[2:] + ' '): fails.append(f'box {b}: the label {lab!r} does not start with its symbol')
    if text_width(lab, 9, 'r') > 180: fails.append(f'box {b}: the label {lab!r} is too wide')
    if text_width('? ' + hint, 9, 'r') > 314: fails.append(f'box {b}: the hint {hint!r} is too wide')
    if any(ord(c) > 127 for c in lab + hint): fails.append(f'box {b}: not ASCII')
    if int(bx.sec) != 3: fails.append(f'box {b}: section {bx.sec}')
if 'nominal' not in str(EVERY.BOX['3:r'].hint) or 'real' not in str(EVERY.BOX['3:r'].hint): fails.append('3:r hint')
nt = str(G.CORE.TYPES[EVERY.ti].notes)
for did in IDS:
    if str(MORE[did].eq) not in nt: fails.append(f'notes: {MORE[did].eq} missing')

print(f'{len(MORE)} section 3 lines (not on the sheet): {nback} letters left out and found again')
print(f'{len(fails)} problem(s)')
for f in fails[:60]: print(' -', f)
sys.exit(1 if fails else 0)
