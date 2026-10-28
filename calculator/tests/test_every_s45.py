"""The Everything page, sections 4 and 5: the lines NOT on the sheet (every_s4.lua, every_s5.lua).
   node calculator/tools/build.js && python3 calculator/tests/test_every_s45.py
Section 4: NWC, the operating cycle, the cost of trade credit, the float and lockbox NPV, r = APR/m, the NPV of a
credit policy and of switching. Section 5: capital gains and dividend yield, the holding-period return and its yearly
(geometric) average, share j from past data and from states, beta from past data or from Var(M), weights from money or
shares, a share + the risk-free asset. For every line: the numbers fit (checked in Python), each letter left out in turn
comes back through the boxes, every rearranged form gives the letter; then the chains with the sheet's lines and the
no-noise cases (a line stays quiet where it does not apply). Own numbers only."""
import os, sys, re, math
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'mock'))
from nspire_mock import NspireApp

app = NspireApp(open(os.path.join(HERE, '..', 'build', 'bfc2140_solver.lua')).read())
lua = app.lua
G = lua.globals()
CORE, EVERY = G.CORE, G.EVERY
fails = []
nback = nrearr = 0

def lt(t): return [t[i] for i in range(1, len(t) + 1)] if t is not None else []
def close(a, b, rel=1e-5): return a is not None and abs(a - b) <= rel * max(1.0, abs(b))

def every(V):
    """Run the Everything solver on {box: value} (rates as decimals, as after the boxes are read)."""
    out = CORE.run(EVERY.ti, lua.table_from(V))
    rows = lt(out.rows)
    errs = [r.text for r in rows if r.kind == 'err' and 'internal' in str(r.text)]
    res = [dict(box=e.box, value=e.value, d=e['def'], chained=e.chained, alts=e.alts, passed=e.passed) for e in lt(out.every)]
    for r in rows:   # every answer line shows its working with the numbers
        if r.kind == 'val' and not re.search(r'\d', str(r.formula or '')): errs.append(f'no numbers in the working of {r.text}')
    return out, res, errs

def fval(d, vals):
    """the line's f with these letters (a letter the line works out itself, like Rbar_j, filled in first)"""
    x = lua.table_from(vals)
    for va in lt(d.vars):
        if va.alt is not None and x[va.k] is None and va.alt.ok(x): x[va.k] = va.alt.fn(x)
    return d.f(x)

def text(out): return ' '.join(str(r.text) for r in lt(out.rows))
def by(res, d): return [r for r in res if r['d'] == d]

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

# 1. every line: own numbers, worked out here in Python; CTX = boxes typed besides (what makes the line apply);
#    KEEP = letters not left out (worked out by another line from the context)
def tcred(d, disc, net, Y=365): return (1 + d / (1 - d)) ** (Y / (net - disc)) - 1
YJ = {'Yj1': .05, 'Yj2': .11, 'Yj3': -.02, 'Yj4': .08}
mj = sum(YJ.values()) / 4
vj = sum((v - mj) ** 2 for v in YJ.values()) / 3
SJ = {'Sj1': -.06, 'p1': .3, 'Sj2': .08, 'p2': .5, 'Sj3': .2, 'p3': .2}
erj = -.06 * .3 + .08 * .5 + .2 * .2
varjs = .3 * (-.06 - erj) ** 2 + .5 * (.08 - erj) ** 2 + .2 * (.2 - erj) ** 2
cred = (.4 * 400 * 80 * .98 - 400 * 50) * 1.015 / .015 + .6 * 400 * 80 / .015
FULL = {
    's4_nwc': {'NWC': 7.9, 'Cash': 2.5, 'AR': 6.1, 'Inventory': 4.4, 'AP': 3.2, 'Accruals': 1.9},
    's4_oc': {'OC': 83.7, 'InvDays': 47.5, 'ARDays': 36.2},
    's4_tcred': {'EAR': tcred(.03, 15, 45), 'd': .03, 'disc': 15, 'net': 45},
    's4_float': {'Freed': 96000, 'Daily': 32000, 'Fdays': 3},
    's4_rper': {'r': .0075, 'APR': .09, 'm': 12},
    's4_lockbox': {'NPVf': 96000 - 500 / .006, 'Freed': 96000, 'fee': 500, 'r': .006},
    's4_pvfee': {'PVfees': 500 / .006, 'fee': 500, 'r': .006},
    's4_credit': {'NPVc': cred, 'Q': 400, 'P': 80, 'c': 50, 's': .4, 'd': .02, 'r': .015},
    's4_switch': {'dNPV': -70000, 'NPVc': 1450000, 'NPVold': 1520000},
    's5_cgy': {'CGY': 3.5 / 38, 'P1': 41.5, 'P0': 38},
    's5_dy': {'DY': .05, 'DIV': 1.9, 'P0': 38},
    's5_hpr': {'HPR': 1.12 * .96 * 1.09 - 1, 'Yi1': .12, 'Yi2': -.04, 'Yi3': .09},
    's5_geo': {'rG': 1.3 ** .25 - 1, 'HPR': .3, 'T': 4},
    's5_meanj': dict({'Rbarj': mj}, **YJ),
    's5_varj': dict({'Vj': vj}, **YJ),
    's5_erj': dict({'ERj': erj}, **SJ),
    's5_varjs': dict({'Vj': varjs, 'ERj': erj}, **SJ),
    's5_betay': {'Beta': 1.2, 'Cov': .0018, 'Vj': .0015},
    's5_betavm': {'Beta': .5, 'CovM': .006, 'VarM': .012},
    's5_mi': {'Mi': 4200, 'Ni': 120, 'Pi': 35},
    's5_mj': {'Mj': 4160, 'Nj': 80, 'Pj': 52},
    's5_mtot': {'Mtot': 10000, 'Mi': 4200, 'Mj': 4160, 'Mf': 1640},
    's5_wi': {'wi': .42, 'Mi': 4200, 'Mtot': 10000},
    's5_wj': {'wj': .416, 'Mj': 4160, 'Mtot': 10000},
    's5_sdrf': {'SDp': .165, 'wi': .55, 'SDi': .3},
}
CTX = {'s5_betay': {'5:Yj1': .1, '5:Yj2': -.03, '5:Yj3': .06}}
KEEP = {'s5_betay': {'Vj'}, 's5_hpr': {'Yi1', 'Yi2', 'Yi3'}, 's5_meanj': set(YJ), 's5_varj': set(YJ) | {'Rbarj'}}
SHEETBOX = {EVERY.boxOf(d.id, va.k) for d in lt(G.ROOTDEFS) for va in lt(d.vars)}   # boxes the sheet's lines label
TWIN = {'s5_betavm': 'beta'}   # Var(M) typed: SDM = sqrt(Var(M)) and the sheet's beta line gives the same answer
MORE = {d.id: d for d in lt(EVERY.MORE) if str(d.id)[:3] in ('s4_', 's5_')}
if sorted(MORE) != sorted(FULL): fails.append(f'lines: {sorted(MORE)}, want {sorted(FULL)}')
for did, full in FULL.items():
    d = MORE.get(did)
    if d is None: continue
    sec = int(did[1])
    vars_ = lt(d.vars)
    tok = {va.k: va.t for va in vars_}
    # the shape: every field, ASCII, a short label (symbol first) and a hint on every box
    for f in ('name', 'short', 'eq', 'why', 'f', 'ex'):
        if d[f] is None: fails.append(f'{did}: no {f}')
    if d.sec != sec: fails.append(f'{did}: sec {d.sec}')
    for s in (d.name, d.eq, d.why):
        if not str(s).isascii(): fails.append(f'{did}: not ASCII: {s}')
    for va in vars_:
        b = EVERY.boxOf(did, va.k)
        bx = EVERY.BOX[b]
        if not b or not (b.startswith(f'{sec}:')): fails.append(f'{did}: {va.k} has the box {b}')
        lab = str(bx.label)
        if b not in SHEETBOX and not va.list and not va.grp and lab.split(' ')[0] not in (str(bx.t), str(va.t)): fails.append(f'{did}: the box {b} label {lab!r} does not start with its symbol')
        if not bx.hint: fails.append(f'{did}: the box {b} has no hint')
    # the numbers fit the line
    try:
        if abs(fval(d, full)) > 1e-9 * max(1, abs(list(full.values())[0])): fails.append(f'{did}: the test numbers do not fit the line')
    except Exception as e: fails.append(f'{did}: f fails: {e}')
    # the example (own numbers) solves for the first letter, and fits
    first = vars_[0].k
    ex = dict(d.ex.items())
    out, res, errs = every(dict({EVERY.boxOf(did, k): v for k, v in ex.items()}, **CTX.get(did, {})))
    got = [r for r in res if r['d'] in (did, TWIN.get(did))]
    if errs or not got: fails.append(f'{did}: the example gives {got} {errs}')
    elif abs(fval(d, dict(ex, **{first: got[0]['value']}))) > 1e-7 * max(1, abs(got[0]['value'])): fails.append(f'{did}: the example answer does not fit')
    # each letter left out in turn comes back
    for va in vars_:
        k = va.k
        if va.opt or va.list or k in KEEP.get(did, set()) or k not in full: continue
        V = {EVERY.boxOf(did, kk): vv for kk, vv in full.items() if kk != k}
        V.update(CTX.get(did, {}))
        box = EVERY.boxOf(did, k)
        out, res, errs = every(V)
        nback += 1
        if errs: fails.append(f'{did} without {k}: {errs}'); continue
        got = [r for r in res if r['box'] == box]
        ok = any(close(r['value'], full[k]) for r in got)
        for r in got:   # a squared term: the other root is fine if the line holds
            if not ok and r['d'] == did and abs(fval(d, dict(full, **{k: r['value']}))) < 1e-8: ok = True
        if not ok: fails.append(f'{did}: without {k} ({box}) gives {[(r["d"], r["value"]) for r in got]}, want {full[k]}')
        for r in res:
            if r['box'] in V: fails.append(f'{did} without {k}: the typed box {r["box"]} was solved again by {r["d"]}')
        rows = [r for r in lt(out.rows) if r.kind == 'val' and r.explain is not None and str(r.label) == f'{d.name}: {va.t}']
        ex2 = ' '.join(str(e[2]) for r in rows for e in lt(r.explain))
        if rows and 'NOT ON THE FORMULA SHEET' not in ex2: fails.append(f'{did} without {k}: not marked NOT ON THE FORMULA SHEET')
        # the rearranged form, evaluated in Python
        rr = d.rearr[k] if d.rearr is not None else None
        if rr is not None and not isinstance(rr, str): rr = rr(lua.table_from(full))
        if rr:
            lhs, rhs = str(rr).split(' = ', 1)
            try:
                val = py_eval(rhs, {tok[kk]: vv for kk, vv in full.items() if kk != k})
                nrearr += 1
                if not close(val, full[k], 1e-6): fails.append(f'{did}: rearranged {rr!r} gives {val}, want {full[k]}')
            except Exception as e: fails.append(f'{did}: rearranged {rr!r} does not evaluate: {e}')

# 2. section 4 chains and cases
# trade credit: Y blank = 365 (the written line shows 365), Y typed = 360; a stretched payment is just a later net day
out, res, errs = every({'4:d': .02, '4:disc': 10, '4:net': 40})
e = by(res, 's4_tcred')
if not e or not close(e[0]['value'], tcred(.02, 10, 40)): fails.append(f'trade credit, 365 days: {e}')
row = [r for r in lt(out.rows) if r.kind == 'val' and str(r.text).startswith('Cost of trade credit')]
ex = ' '.join(str(x[2]) for x in lt(row[0].explain)) if row else ''
if '(1 + 0.02/(1 - 0.02))^(365/(40 - 10)) - 1' not in str(row[0].formula if row else '') or 'EAR = (1 + d/(1 - d))^(365/(net - disc)) - 1' not in ex:
    fails.append(f'trade credit: the written line does not show 365: {row[0].formula if row else None}')
out, res, errs = every({'4:d': .02, '4:disc': 10, '4:net': 40, '4:Y': 360})
e = by(res, 's4_tcred')
if not e or not close(e[0]['value'], tcred(.02, 10, 40, 360)): fails.append(f'trade credit, 360 days: {e}')
for V in [{'4:d': .02, '4:disc': 40, '4:net': 40}, {'4:d': 1.5, '4:disc': 10, '4:net': 30}]:
    out, res, errs = every(V)
    if errs or by(res, 's4_tcred'): fails.append(f'trade credit, bad input {V}: {res} {errs}')
    if 'Cost of trade credit (skip the discount): needs' not in text(out): fails.append(f'trade credit, bad input {V}: no "needs" note')
# NWC: cash and accruals typed; one of them blank = 0
out, res, errs = every({'4:Cash': 1.2, '4:AR': 5.3, '4:Inventory': 2.6, '4:AP': 2.1})
n = by(res, 's4_nwc')
if not n or not close(n[0]['value'], 7.0): fails.append(f'NWC, accruals blank: {n}')
row = [r for r in lt(out.rows) if r.kind == 'val' and str(r.text).startswith('Net working capital')]
if not row or 'blank, so 0: Accruals' not in ' '.join(str(x[2]) for x in lt(row[0].explain)): fails.append('NWC: no "blank, so 0: Accruals" note')
# the days: typed InvDays, ARDays, APDays -> CCC and the operating cycle
out, res, errs = every({'4:InvDays': 41, '4:ARDays': 29.5, '4:APDays': 33})
if not by(res, 'ccc') or not by(res, 's4_oc') or not close(by(res, 's4_oc')[0]['value'], 70.5): fails.append(f'days: {res}')
# float -> lockbox NPV, the rate from APR and m
out, res, errs = every({'4:Daily': 27000, '4:Fdays': 3, '4:fee': 450, '4:APR': .06, '4:m': 12})
lb = by(res, 's4_lockbox')
if not lb or not close(lb[0]['value'], 81000 - 450 / .005) or not lb[0]['chained']: fails.append(f'lockbox chain: {lb}')
if 'uses Freed from Cash freed by less float; r from Rate per period from an APR' not in text(out): fails.append('lockbox chain: the uses note')
# credit policy: s and d blank = 0 (everyone pays later) -> NPVc -> NPV of switching
out, res, errs = every({'4:Q': 300, '4:P': 90, '4:c': 55, '4:r': .02, '4:NPVold': 500000})
nc, sw = by(res, 's4_credit'), by(res, 's4_switch')
want = -300 * 55 * 1.02 / .02 + 300 * 90 / .02
if not nc or not close(nc[0]['value'], want): fails.append(f'credit policy, s and d blank: {nc}, want {want}')
if not sw or not close(sw[0]['value'], want - 500000) or not sw[0]['chained']: fails.append(f'credit policy switch: {sw}')

# 3. section 5 chains and cases
# capital gains + dividend yield next to the realised return (they add up to R)
out, res, errs = every({'5:P0': 50, '5:P1': 54, '5:DIV': 1.5})
v = {r['d']: r['value'] for r in res}
if not (close(v.get('ret'), .11) and close(v.get('s5_cgy'), .08) and close(v.get('s5_dy'), .03)): fails.append(f'R = DY + CGY: {v}')
# capital gains yield and dividend yield typed -> P1 and DIV -> R
out, res, errs = every({'5:P0': 40, '5:CGY': .05, '5:DY': .02})
v = {r['d']: r['value'] for r in res}
if not close(v.get('ret'), .07): fails.append(f'CGY, DY -> R: {v}')
# returns of i -> HPR -> the yearly average (T from the year boxes)
out, res, errs = every({'5:Yi1': .07, '5:Yi2': .15, '5:Yi3': -.03, '5:Yi4': .1})
hpr = 1.07 * 1.15 * .97 * 1.1 - 1
g = by(res, 's5_geo')
if not close((by(res, 's5_hpr') or [{}])[0].get('value'), hpr) or not g or not close(g[0]['value'], (1 + hpr) ** .25 - 1) or not g[0]['chained']:
    fails.append(f'HPR -> yearly average: {res}')
# past data of i and j: Var(j) -> SDj -> Corr; Rbar -> E(Ri) -> CV; beta listed only if j is the market
YI = {'5:Yi1': .09, '5:Yi2': -.04, '5:Yi3': .13, '5:Yi4': .02, '5:Yi5': .07}
YJ5 = {'5:Yj1': .06, '5:Yj2': -.02, '5:Yj3': .1, '5:Yj4': .01, '5:Yj5': .03}
a, b = list(YI.values()), list(YJ5.values())
ma, mb = sum(a) / 5, sum(b) / 5
cov = sum((x - ma) * (y - mb) for x, y in zip(a, b)) / 4
va_, vb_ = sum((x - ma) ** 2 for x in a) / 4, sum((y - mb) ** 2 for y in b) / 4
out, res, errs = every(dict(YI, **YJ5))
v = {r['d']: r for r in res}
if 'corr' not in v or not close(v['corr']['value'], cov / math.sqrt(va_ * vb_)): fails.append(f'past data: Corr {v.get("corr")}')
if 'cv' not in v or not close(v['cv']['value'], math.sqrt(va_) / ma): fails.append(f'past data: CV from Rbar {v.get("cv")}')
if 's5_betay' not in v or not close(v['s5_betay']['value'], cov / vb_) or v['s5_betay']['passed']: fails.append(f'past data: beta {v.get("s5_betay")}')
if 'only if j is the MARKET' not in text(out): fails.append('past data: the beta is not marked "only if j is the MARKET"')
if 's5_hpr' in v or 's5_geo' in v or 'Yearly (geometric)' in text(out): fails.append('past data of two shares: HPR / yearly average listed')
if 'SD = sqrt(Var(j))' not in text(out): fails.append('past data: no SD of j row')
# ... with rf and E[RM] typed (a CAPM question): the beta is passed on to CAPM
out, res, errs = every(dict(YI, **dict(YJ5, **{'5:rf': .03, '5:ERM': .08})))
c = by(res, 'capm')
if not c or not close(c[0]['value'], .03 + cov / vb_ * .05) or not c[0]['chained']: fails.append(f'past-data beta -> CAPM: {c}')
# states of i and j: E(Rj), Var(j) -> SDj -> Corr (with the covariance from the states)
ST = {'5:p1': .25, '5:Si1': -.05, '5:Sj1': .02, '5:p2': .5, '5:Si2': .1, '5:Sj2': .06, '5:p3': .25, '5:Si3': .2, '5:Sj3': .09}
P_, A_, B_ = [.25, .5, .25], [-.05, .1, .2], [.02, .06, .09]
ei, ej = sum(p * x for p, x in zip(P_, A_)), sum(p * x for p, x in zip(P_, B_))
cv_ = sum(p * (x - ei) * (y - ej) for p, x, y in zip(P_, A_, B_))
vi_, vj_ = sum(p * (x - ei) ** 2 for p, x in zip(P_, A_)), sum(p * (y - ej) ** 2 for p, y in zip(P_, B_))
out, res, errs = every(ST)
v = {r['d']: r for r in res}
for k, want in [('s5_erj', ej), ('s5_varjs', vj_), ('corr', cv_ / math.sqrt(vi_ * vj_))]:
    if k not in v or not close(v[k]['value'], want): fails.append(f'states: {k} = {v.get(k)}, want {want}')
# a matrix: Var(M) -> beta (the sheet's line agrees through SDM = sqrt(Var(M)))
out, res, errs = every({'5:CovM': .0045, '5:VarM': .018})
bt = [r for r in res if r['box'] == '5:Beta']
if len(bt) != 1 or not close(bt[0]['value'], .25) or 'the same answer from: Beta from Var(M)' not in ' '.join(str(x[2]) for r in lt(out.rows) if r.explain is not None for x in lt(r.explain)):
    fails.append(f'Var(M) -> beta: {bt}')
# shares and prices -> money -> weights (risk-free blank = 0) -> Var(p)
out, res, errs = every({'5:Ni': 200, '5:Pi': 15, '5:Nj': 50, '5:Pj': 20, '5:SDi': .25, '5:SDj': .18, '5:Corr': .3})
v = {r['d']: r for r in res}
if 's5_wi' not in v or not close(v['s5_wi']['value'], .75) or 's5_wj' not in v or not close(v['s5_wj']['value'], .25): fails.append(f'weights from shares: {res}')
vp = .75 ** 2 * .25 ** 2 + .25 ** 2 * .18 ** 2 + 2 * .75 * .25 * .3 * .25 * .18
if 'varpf' not in v or not close(v['varpf']['value'], vp) or not v['varpf']['chained']: fails.append(f'weights -> Var(p): {v.get("varpf")}')
# money with a risk-free part: the weights are of the TOTAL money
out, res, errs = every({'5:Mi': 3000, '5:Mj': 5000, '5:Mf': 2000})
v = {r['d']: r['value'] for r in res}
if not close(v.get('s5_wi'), .3) or not close(v.get('s5_wj'), .5): fails.append(f'weights with a risk-free part: {v}')
# a share + the risk-free asset (no correlation given): SDp = wi*SDi -> Sharpe
out, res, errs = every({'5:wi': .45, '5:SDi': .32, '5:wj': .55, '5:ERp': .07, '5:rf': .03})
v = {r['d']: r for r in res}
if 's5_sdrf' not in v or not close(v['s5_sdrf']['value'], .144): fails.append(f'share + risk-free: {v.get("s5_sdrf")}')
if 'sharpe' not in v or not close(v['sharpe']['value'], .04 / .144) or not v['sharpe']['chained']: fails.append(f'share + risk-free -> Sharpe: {v.get("sharpe")}')
out, res, errs = every({'5:wi': .45, '5:SDi': .32, '5:wj': .55, '5:SDj': 0})
if not by(res, 's5_sdrf'): fails.append('share + risk-free, SDj typed 0: no SDp line')
# portfolio beta -> CAPM (the beta box blank); a typed beta stays
out, res, errs = every({'5:w1': .5, '5:Bk1': 1.4, '5:w2': .5, '5:Bk2': .8, '5:rf': .02, '5:ERM': .09})
c = by(res, 'capm')
if not c or not close(c[0]['value'], .02 + 1.1 * .07) or not c[0]['chained']: fails.append(f'Beta(p) -> CAPM: {c}')
out, res, errs = every({'5:w1': .5, '5:Bk1': 1.4, '5:w2': .5, '5:Bk2': .8, '5:rf': .02, '5:ERM': .09, '5:Beta': 1.3})
c = by(res, 'capm')
if not c or not close(c[0]['value'], .02 + 1.3 * .07): fails.append(f'typed beta into CAPM: {c}')

# 4. no noise: a line stays quiet where it does not apply
def quiet(V, ids, what):
    out, res, errs = every(V)
    if errs: fails.append(f'{what}: {errs}')
    got = [r['d'] for r in res if r['d'] in ids]
    t = text(out)
    names = [str(MORE[i].name) for i in ids if i in MORE]
    if got or any(n + ':' in t for n in names): fails.append(f'{what}: {got} listed (or named under ONE VALUE SHORT)')
    return out, res
# a CCC question from balances: no NWC, no operating cycle
out, res = quiet({'4:Inventory': 300, '4:AR': 250, '4:AP': 180, '4:Sales': 2400, '4:COGS': 1900}, ['s4_nwc', 's4_oc'], 'CCC from balances')
if not by(res, 'ccc'): fails.append('CCC from balances: no CCC')
# ... without A/P: the operating cycle (still no NWC)
out, res = quiet({'4:Inventory': 300, '4:AR': 250, '4:Sales': 2400, '4:COGS': 1900}, ['s4_nwc'], 'days without A/P')
if not by(res, 's4_oc'): fails.append('days without A/P: no operating cycle')
# a trade-credit question: no credit-policy or lockbox lines
quiet({'4:d': .01, '4:disc': 10, '4:net': 30}, ['s4_credit', 's4_switch', 's4_lockbox', 's4_float'], 'trade credit')
# two shares (SDs and Corr), or a matrix: no SD of share + risk-free, no beta from Var(j)
quiet({'5:wi': .6, '5:wj': .4, '5:SDi': .2, '5:SDj': .3, '5:Corr': .1}, ['s5_sdrf', 's5_betay', 's5_betavm'], 'two shares')
quiet({'5:wi': .6, '5:wj': .4, '5:VarS': .04, '5:Vj': .09, '5:Cov': .006}, ['s5_sdrf', 's5_betay', 's5_betavm'], 'a matrix')
# states of i only: nothing for j; five states: no j lines
quiet({'5:p1': .4, '5:Si1': .02, '5:p2': .6, '5:Si2': .12}, ['s5_erj', 's5_varjs', 's5_sdrf'], 'states of i')
quiet({'5:p1': .2, '5:Si1': .01, '5:Sj1': .02, '5:p2': .2, '5:Si2': .03, '5:Sj2': .03, '5:p3': .2, '5:Si3': .05, '5:Sj3': .01,
       '5:p4': .2, '5:Si4': .07, '5:Sj4': .04, '5:p5': .2, '5:Si5': .09}, ['s5_erj', 's5_varjs'], 'five states')
# SDM typed: the sheet's beta line, not the Var(M) one
quiet({'5:CovM': .01, '5:SDM': .2}, ['s5_betavm'], 'SDM typed')
# states and a typed Rbar: E(Ri) is the states' (Rbar is not passed into it)
out, res, errs = every({'5:p1': .5, '5:Si1': .04, '5:p2': .5, '5:Si2': .1, '5:Rbar': .2})
e = by(res, 'er')
if not e or not close(e[0]['value'], .07) or not e[0]['passed']: fails.append(f'states + Rbar typed: E(Ri) {e}')
# no money, no shares: no weight lines; a realised-return question with R typed: P0 from the sheet line only
quiet({'5:w1': .5, '5:E1': .1, '5:w2': .5, '5:E2': .06}, ['s5_wi', 's5_wj', 's5_mtot', 's5_mi', 's5_mj'], 'E[Rp] from weights')
out, res, errs = every({'5:Rt': .1, '5:DIV': 2, '5:P1': 53})
p0 = [r for r in res if r['box'] == '5:P0']
if len(p0) != 1 or not close(p0[0]['value'], 50) or not p0[0]['passed']: fails.append(f'R typed -> P0: {p0}')
# odd input never crashes
for V in [{b: 0 for b in EVERY.BOX.keys() if b[:2] in ('4:', '5:')}, {b: 1 for b in EVERY.BOX.keys() if b[:2] in ('4:', '5:')},
          {'4:r': 0, '4:fee': 10, '4:Freed': 5}, {'5:HPR': -1, '5:T': 0}, {'5:Mi': 0, '5:Mj': 0}]:
    out, res, errs = every(V)
    if [e for e in errs if 'internal' in e]: fails.append(f'odd input {list(V)[:4]}: {errs}')

# 5. the N page lists the lines (in their sections), the boxes' labels and hints
nt = str(CORE.TYPES[EVERY.ti].notes)
for d in MORE.values():
    if str(d.eq) not in nt: fails.append(f'notes: {d.eq} missing')
for b, w in [('5:Yj1', 'MARKET'), ('5:wj', 'TOTAL money')]:
    bx = EVERY.BOX[b]
    if w not in str(bx.label) + str(bx.hint): fails.append(f'box {b}: {w!r} not in its label or hint')

print(f'{len(FULL)} lines (sections 4 and 5): {nback} letters left out and found again, {nrearr} rearranged forms checked')
print(f'{len(fails)} problem(s)')
for f in fails[:60]: print(' -', f)
sys.exit(1 if fails else 0)
