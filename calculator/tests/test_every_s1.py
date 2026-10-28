"""The Everything page, section 1 pack (src/every_s1.lua): Financial Maths lines NOT on the formula sheet.
   node calculator/tools/build.js && python3 calculator/tests/test_every_s1.py
r = APR/m; a payment stream whose first payment is at period t (blank = 1, 0 = today); a start amount PLUS payments
(FVall); a loan: the balance after k payments, a new rate rnew -> the new payment and the change. Every letter of every
new line, left out in turn, comes back; the chains with the sheet's lines work; the new lines stay quiet where they
do not apply (no noise, no second answer for a box). Own numbers only."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'mock'))
from nspire_mock import NspireApp
from math import log

app = NspireApp(open(os.path.join(HERE, '..', 'build', 'bfc2140_solver.lua')).read())
lua = app.lua
G = lua.globals()
CORE, EVERY = G.CORE, G.EVERY
fails = []
nback = 0

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
def ids(res): return sorted({r['d'] for r in res})

# the formulas, written out again (own numbers below)
def ann(C, r, n): return C / r * (1 - 1 / (1 + r) ** n)
def fvann(C, r, n): return C / r * ((1 + r) ** n - 1)

MORE = {d.id: d for d in lt(EVERY.MORE)}
MINE = ['s1_rapr', 's1_dann', 's1_dperp', 's1_fvall', 's1_bal', 's1_cnew', 's1_dc']
for i in MINE:
    if i not in MORE: fails.append(f'{i}: not loaded')
    elif MORE[i].sec != 1: fails.append(f'{i}: section {MORE[i].sec}')

# 1. every letter left out in turn comes back (the line's own answer, in the letter's box)
#    FIXED: letters that stay typed by design (t of the deferred lines: blank t = the sheet's normal lines;
#    m of r = APR/m: an m is never made up from a typed r)
C, r, n = 350, 0.06, 5
bal = ann(900, 0.05, 40 - 10)
cnew = 150000 * 0.004 / (1 - 1.004 ** -(240 - 60))
CASES = [
    ('s1_rapr', {'r': 0.0225, 'APR': 0.09, 'm': 4}, {'m'}),
    ('s1_dann', {'PV': ann(C, r, n) / (1 + r) ** 2, 'C': C, 'r': r, 'n': n, 't': 3}, {'t'}),
    ('s1_dann', {'PV': ann(C, r, n) * (1 + r), 'C': C, 'r': r, 'n': n, 't': 0}, {'t'}),
    ('s1_dperp', {'PV': 120 / 0.05 / 1.05 ** 3, 'C': 120, 'r': 0.05, 't': 4}, {'t'}),
    ('s1_dperp', {'PV': 120 / 0.05 * 1.05, 'C': 120, 'r': 0.05, 't': 0}, {'t'}),
    ('s1_fvall', {'FVall': 2500 * 1.01 ** 24 + fvann(150, 0.01, 24), 'PV': 2500, 'C': 150, 'r': 0.01, 'n': 24}, set()),
    ('s1_fvall', {'FVall': 2500 * 1.01 ** 24 + fvann(150, 0.01, 24) * 1.01, 'PV': 2500, 'C': 150, 'r': 0.01, 'n': 24, 't': 0}, {'t'}),
    ('s1_bal', {'Bal': bal, 'C': 900, 'r': 0.05, 'n': 40, 'k': 10}, set()),
    ('s1_cnew', {'Cnew': cnew, 'Bal': 150000, 'rnew': 0.004, 'n': 240, 'k': 60}, set()),
    ('s1_dc', {'dC': 70, 'Cnew': 1050, 'C': 980}, set()),
]
for did, full, fixed in CASES:
    d = MORE.get(did)
    if d is None: continue
    if abs(d.f(lua.table_from(full))) > 1e-8 * max(1, max(abs(v) for v in full.values())):
        fails.append(f'{did}: the test numbers do not fit the line'); continue
    for k in full:
        if k in fixed: continue
        box = EVERY.boxOf(did, k)
        if box != '1:' + k: fails.append(f'{did}: {k} has the box {box}')
        Vb = {EVERY.boxOf(did, kk): vv for kk, vv in full.items() if kk != k}
        out, res, errs = every(Vb)
        nback += 1
        if errs: fails.append(f'{did} without {k}: {errs}'); continue
        got = [x for x in res if x['box'] == box and x['d'] == did]
        if not got or not close(got[0]['value'], full[k]): fails.append(f'{did}: without {k} gives {got}, want {full[k]}')
        for x in res:
            if x['box'] in Vb: fails.append(f'{did} without {k}: the typed box {x["box"]} was solved again by {x["d"]}')
        # its working: NOT on the sheet, with the numbers in it
        rows = [rw for rw in lt(out.rows) if rw.kind == 'val' and str(rw.label).startswith(str(d.name) + ':')]
        ex = ' '.join(str(e[2]) for rw in rows for e in lt(rw.explain))
        for w in ['the formula (NOT on the formula sheet):', 'NOT ON THE FORMULA SHEET', 'your numbers in it:']:
            if w not in ex: fails.append(f'{did} without {k}: the working lacks {w!r}')
        if out.fsbad is not None: fails.append(f'{did} without {k}: unknown formula ids {list(out.fsbad.values())}')

# the start amount line with t blank is written without t; with t typed, with it
out, res, errs = every({'1:PV': 2500, '1:C': 150, '1:r': 0.01, '1:n': 24})
row = [rw for rw in lt(out.rows) if rw.kind == 'val' and str(rw.label).startswith('FV of a start amount')]
ex = ' '.join(str(e[2]) for e in lt(row[0].explain)) if row else ''
if 'FVall = PV*(1 + r)^n + C/r*((1 + r)^n - 1)' not in ex or '(1 - t)' in ex: fails.append(f'FVall, t blank: the written line {ex[:200]}')
out, res, errs = every({'1:PV': 2500, '1:C': 150, '1:r': 0.01, '1:n': 24, '1:t': 0})
row = [rw for rw in lt(out.rows) if rw.kind == 'val' and str(rw.label).startswith('FV of a start amount')]
ex = ' '.join(str(e[2]) for e in lt(row[0].explain)) if row else ''
if '(1 + r)^(1 - t)' not in ex or '(1 - 0)' not in ex: fails.append(f'FVall, t = 0: the written line {ex[:300]}')

# 2. chains with the sheet's lines
# C, APR and m, a payment forever: r = APR/m -> PV = C/r (and the EAR)
out, res, errs = every({'1:C': 60, '1:APR': 0.084, '1:m': 12})
byd = {x['d']: x for x in res}
if 's1_rapr' not in byd or not close(byd['s1_rapr']['value'], 0.007) or not byd['s1_rapr']['passed']: fails.append(f'APR/m: {byd.get("s1_rapr")}')
if 'perp' not in byd or not close(byd['perp']['value'], 60 / 0.007) or not byd['perp']['chained']: fails.append(f'APR/m -> perpetuity: {byd.get("perp")}')
if 'ear' not in byd: fails.append('APR/m: the EAR line is gone')
if 'uses r from Rate per period from an APR' not in text(out): fails.append('APR/m: no uses note')
# EAR and m -> APR (EAR line) -> r = APR/m -> PV of an annuity
out, res, errs = every({'1:EAR': 0.1, '1:m': 4, '1:C': 500, '1:n': 8})
rq = 1.1 ** 0.25 - 1
byd = {x['d']: x for x in res}
if 's1_rapr' not in byd or not close(byd['s1_rapr']['value'], rq): fails.append(f'EAR -> APR -> r: {byd.get("s1_rapr")}')
if 'pva' not in byd or not close(byd['pva']['value'], ann(500, rq, 8)): fails.append(f'EAR -> r -> annuity: {byd.get("pva")}')
# r typed, m typed: the APR (and the EAR from it)
out, res, errs = every({'1:r': 0.01, '1:m': 12})
byd = {x['d']: x for x in res}
if 's1_rapr' not in byd or not close(byd['s1_rapr']['value'], 0.12) or 'ear' not in byd or not close(byd['ear']['value'], 1.01 ** 12 - 1):
    fails.append(f'r and m -> APR -> EAR: {res}')
# a deferred annuity: the PV is passed on (C 400, r 7%, 6 payments, the first at period 4)
out, res, errs = every({'1:C': 400, '1:r': 0.07, '1:n': 6, '1:t': 4})
pv = [x for x in res if x['box'] == '1:PV']
if [x['d'] for x in pv] != ['s1_dann'] or not close(pv[0]['value'], ann(400, 0.07, 6) / 1.07 ** 3) or not pv[0]['passed']:
    fails.append(f'deferred annuity: PV lines {pv}')
# t = 0 is the annuity due; t = 1 the normal annuity (the same numbers as the sheet)
for tv, want in ((0, ann(400, 0.07, 6) * 1.07), (1, ann(400, 0.07, 6))):
    out, res, errs = every({'1:C': 400, '1:r': 0.07, '1:n': 6, '1:t': tv})
    pv = [x for x in res if x['box'] == '1:PV']
    if len(pv) != 1 or not close(pv[0]['value'], want): fails.append(f'deferred annuity t = {tv}: {pv}, want {want}')
# a perpetuity starting later: C 90, r 6%, the first at period 5 -> C/r/(1 + r)^4
out, res, errs = every({'1:C': 90, '1:r': 0.06, '1:t': 5})
pv = [x for x in res if x['box'] == '1:PV']
if [x['d'] for x in pv] != ['s1_dperp'] or not close(pv[0]['value'], 90 / 0.06 / 1.06 ** 4): fails.append(f'deferred perpetuity: {pv}')
# t = 0 with payments into a savings plan: the annuity due's FV is THE FV (passed on, no 'only if'); no ordinary FV
out, res, errs = every({'1:C': 80, '1:r': 0.004, '1:n': 36, '1:t': 0})
fv = [x for x in res if x['box'] == '1:FV']
if [x['d'] for x in fv] != ['fvad'] or not fv[0]['passed'] or not close(fv[0]['value'], fvann(80, 0.004, 36) * 1.004): fails.append(f't = 0 FV: {fv}')
if 'only if' in text(out): fails.append('t = 0: the annuity due is still marked only if')
# a start amount plus payments due: FVall; the parts are listed too (FVn of the start amount, the due FV)
out, res, errs = every({'1:PV': 1500, '1:C': 75, '1:r': 0.006, '1:n': 18, '1:t': 0})
byd = {x['d']: x for x in res}
want = 1500 * 1.006 ** 18 + fvann(75, 0.006, 18) * 1.006
if 's1_fvall' not in byd or not close(byd['s1_fvall']['value'], want): fails.append(f'FVall t = 0: {byd.get("s1_fvall")}, want {want}')
if 'fv' not in byd or 'fvad' not in byd: fails.append(f'FVall t = 0: the parts are not listed {ids(res)}')
# FVall typed: the payment that reaches it (pva steps aside: PV is a start amount, not a loan)
out, res, errs = every({'1:PV': 3000, '1:FVall': 9000, '1:r': 0.03, '1:n': 12})
cs = [x for x in res if x['box'] == '1:C']
want = (9000 - 3000 * 1.03 ** 12) * 0.03 / (1.03 ** 12 - 1)
if [x['d'] for x in cs] != ['s1_fvall'] or not close(cs[0]['value'], want) or not cs[0]['passed']: fails.append(f'FVall -> C: {cs}, want {want}')
# ... and how long it takes
out, res, errs = every({'1:PV': 5000, '1:C': 200, '1:r': 0.004, '1:FVall': 12000})
ns = [x for x in res if x['box'] == '1:n']
want = log((12000 + 200 / 0.004) / (5000 + 200 / 0.004)) / log(1.004)
if [x['d'] for x in ns] != ['s1_fvall'] or not close(ns[0]['value'], want): fails.append(f'FVall -> n: {ns}, want {want}')
if any(x['d'] in ('gperp', 'gann', 'pva', 'perp') for x in res): fails.append(f'FVall -> n: noise {ids(res)}')
# a loan: PV, r, n -> C (PV of an annuity, passed on) -> balance after k -> new payment at rnew -> the change
P, rr, N, K, r2 = 320000, 0.0055, 300, 72, 0.0045
c0 = P * rr / (1 - (1 + rr) ** -N)
b = ann(c0, rr, N - K)
c1 = b * r2 / (1 - (1 + r2) ** -(N - K))
out, res, errs = every({'1:PV': P, '1:r': rr, '1:n': N, '1:k': K, '1:rnew': r2})
byd = {x['d']: x for x in res}
for did, v in (('pva', c0), ('s1_bal', b), ('s1_cnew', c1), ('s1_dc', c1 - c0)):
    if did not in byd or not close(byd[did]['value'], v) or not byd[did]['passed']: fails.append(f'loan chain: {did} = {byd.get(did)}, want {v}')
for did in ('s1_bal', 's1_cnew', 's1_dc'):
    if did in byd and not byd[did]['chained']: fails.append(f'loan chain: {did} is not marked as using another line')
for w in ['uses C from PV of an annuity', 'uses Bal from Loan balance after k payments']:
    if w not in text(out): fails.append(f'loan chain: {w!r} missing')
# a loan, no k: the balance needs the payments made (a check: the balance equals the loan at k = 0)
out, res, errs = every({'1:PV': P, '1:r': rr, '1:n': N, '1:k': 0})
bl = [x for x in res if x['d'] == 's1_bal']
if not bl or not close(bl[0]['value'], P): fails.append(f'balance at k = 0: {bl}, want {P}')
# the balance typed, n = payments LEFT, k blank: the new payment (k blank = 0) and the change
out, res, errs = every({'1:Bal': 210000, '1:rnew': 0.005, '1:n': 240, '1:C': 1400})
byd = {x['d']: x for x in res}
c1 = 210000 * 0.005 / (1 - 1.005 ** -240)
if 's1_cnew' not in byd or not close(byd['s1_cnew']['value'], c1): fails.append(f'new payment, k blank: {byd.get("s1_cnew")}, want {c1}')
if 's1_dc' not in byd or not close(byd['s1_dc']['value'], c1 - 1400): fails.append(f'change, k blank: {byd.get("s1_dc")}')
row = [rw for rw in lt(out.rows) if rw.kind == 'val' and str(rw.label).startswith('New payment')]
ex = ' '.join(str(e[2]) for e in lt(row[0].explain)) if row else ''
if 'blank, so 0: k' not in ex: fails.append(f'new payment, k blank: no "blank, so 0: k" note ({ex[:200]})')
# an NPV worked out in Capital Budgeting is the PV of section 1: the equal payments from today with that PV
out, res, errs = every({'3:NCF1': 500, '3:NCF2': 500, '3:r': 0.08, '1:r': 0.08, '1:n': 4, '1:t': 0})
npv = 500 / 1.08 + 500 / 1.08 ** 2
cs = [x for x in res if x['box'] == '1:C']
want = npv * 0.08 / ((1 - 1.08 ** -4) * 1.08)
if [x['d'] for x in cs] != ['s1_dann'] or not close(cs[0]['value'], want) or not cs[0]['chained']: fails.append(f'NPV -> PV -> C: {cs}, want {want}')
if 'uses PV = NPV from NPV of the cash flows' not in text(out): fails.append('NPV -> PV: no uses note')

# 3. no noise: the new lines stay out where they do not apply
QUIET = [
    {'1:C': 100, '1:r': 0.05, '1:n': 10},              # a plain annuity
    {'1:C': 100, '1:r': 0.05},                         # a plain perpetuity
    {'1:PV': 9000, '1:r': 0.01, '1:n': 48},            # a plain loan payment
    {'1:FV': 20000, '1:r': 0.02, '1:n': 30},           # a savings goal
    {'1:PV': 800, '1:FVn': 1000, '1:n': 3},            # one amount
    {'1:C': 100, '1:r': 0.08, '1:g': 0.03, '1:n': 20},  # a growing annuity
    {'3:NCF0': -1000, '3:NCF1': 400, '3:NCF2': 500, '3:NCF3': 600, '3:r': 0.08},   # an NPV alone
]
for V in QUIET:
    out, res, errs = every(V)
    mine = [x for x in res if x['d'].startswith('s1_')]
    if errs or mine: fails.append(f'quiet {V}: {mine} {errs}')
    t = text(out)
    for w in ['first payment at t', 'start amount plus', 'Loan balance', 'New payment', 'Change in the payment']:
        if w in t: fails.append(f'quiet {V}: {w!r} shows up')
    if any(x['box'].startswith('1:') for x in res) and V.get('3:r'): fails.append(f'quiet {V}: the NPV made section 1 answers {res}')
out, res, errs = every({'1:C': 100, '1:r': 0.05, '1:n': 10})
if sorted(x['d'] for x in res if x['box'] == '1:PV') != ['pva', 'pvad']: fails.append(f'plain annuity: PV lines {res}')
# t typed: the sheet's annuity, annuity due, perpetuity and growth lines step aside (one PV only)
out, res, errs = every({'1:C': 100, '1:r': 0.05, '1:n': 10, '1:t': 3})
if any(x['d'] in ('pva', 'pvad', 'perp', 'gperp', 'gann') for x in res): fails.append(f't typed: sheet PV lines {ids(res)}')
out, res, errs = every({'1:C': 100, '1:r': 0.05, '1:t': 3})
if any(x['d'] in ('perp', 's1_dann', 'gperp') for x in res) or [x['d'] for x in res] != ['s1_dperp']: fails.append(f't, no n: {ids(res)}')
# a typed NPV is not a PV (derived NPVs only cross)
out, res, errs = every({'3:NPV': 700, '1:r': 0.05, '1:n': 6, '1:C': 100})
if any(x['box'] == '1:C' or x['d'] in ('fv', 'pva') and x['box'] != '1:PV' for x in res): fails.append(f'typed NPV crossed: {res}')
# r = APR/m: never a second APR, never an m made up from a typed r
out, res, errs = every({'1:EAR': 0.08, '1:r': 0.08, '1:m': 4})
if any(x['d'] == 's1_rapr' for x in res) or len([x for x in res if x['box'] == '1:APR']) > 1: fails.append(f'EAR + r + m: {res}')
out, res, errs = every({'1:APR': 0.12, '1:r': 0.12})
if any(x['d'] == 's1_rapr' for x in res) or any(x['box'] == '1:m' for x in res): fails.append(f'APR + r: an m was made up {res}')
out, res, errs = every({'1:APR': 0.06, '1:m': 12, '1:r': 0.005, '1:C': 50, '1:n': 12})
if any(x['d'] == 's1_rapr' or x['box'] in ('1:r', '1:APR', '1:m') for x in res): fails.append(f'all three typed: {res}')
# a loan with k: no FV, lump-sum, annuity-due or growth lines; no FVall from the loan and its payment
out, res, errs = every({'1:PV': P, '1:r': rr, '1:n': N, '1:C': 2000, '1:k': 60})
if ids(res) != ['s1_bal']: fails.append(f'loan + k: {ids(res)}, want the balance only')
# a loan, no k: the balance and the new payment are not offered as 'one value short'
out, res, errs = every({'1:PV': P, '1:r': rr, '1:n': N})
t = text(out)
if 'Loan balance' in t or 'New payment' in t or 'Change in the payment' in t: fails.append('plain loan: the loan lines show up as one value short')
# odd input never crashes
for V in [{'1:t': -2, '1:C': 5, '1:r': 0.1}, {'1:t': 0, '1:C': 5, '1:r': 0, '1:n': 3}, {'1:k': 30, '1:n': 20, '1:C': 5, '1:r': 0.01},
          {'1:rnew': 0, '1:Bal': 100, '1:n': 10, '1:k': 2}, {'1:FVall': 100, '1:PV': 200, '1:C': 5, '1:r': 0.01}, {'1:APR': 0.1, '1:m': 0}]:
    out, res, errs = every(V)
    if errs: fails.append(f'odd input {V}: {errs}')

# 4. the boxes: labels and hints (FV of payments vs one single amount), the order
B = EVERY.BOX
for b, lab in [('1:t', 't first payment at period t'), ('1:FVall', 'FVall FV of start amount + payments ($)'),
               ('1:k', 'k payments already made'), ('1:Bal', 'Bal loan balance left ($)'), ('1:rnew', 'rnew NEW rate per period (%)'),
               ('1:Cnew', 'Cnew new payment each period ($)'), ('1:dC', 'dC change in the payment ($)'), ('1:FVn', 'FVn one amount at the end ($)')]:
    if B[b] is None or str(B[b].label) != lab: fails.append(f'box {b}: label {B[b] and B[b].label!r}, want {lab!r}')
if str(B['1:FV'].hint) != 'the end value of a series of equal payments': fails.append(f'1:FV hint {B["1:FV"].hint}')
if str(B['1:FVn'].hint) != 'one single amount at the end, no payments': fails.append(f'1:FVn hint {B["1:FVn"].hint}')
sb = [str(b) for b in lt(EVERY.SECBOX[1])]
if sb[:17] != ['1:PV', '1:FVn', '1:FV', '1:C', '1:r', '1:n', '1:g', '1:EAR', '1:APR', '1:m', '1:t', '1:FVall', '1:k', '1:Bal', '1:rnew', '1:Cnew', '1:dC']:
    fails.append(f'section 1 box order: {sb[:17]}')
# the N page lists the new lines (NOT on the sheet)
nt = str(CORE.TYPES[EVERY.ti].notes)
for w in ['r = APR/m', 'PV = C/r/(1 + r)^(t - 1)', 'Bal = C/r*(1 - 1/(1 + r)^(n - k))', 'dC = Cnew - C']:
    if w not in nt: fails.append(f'notes: {w!r} missing')

print(f'{len(MINE)} section 1 pack lines: {nback} letters left out and found again')
print(f'{len(fails)} problem(s)')
for f in fails[:60]: print(' -', f)
sys.exit(1 if fails else 0)
