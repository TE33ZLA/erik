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
# D clears every box but keeps the kind of question that was picked
capm = [s for s in TYPES[19].slots.values() if s.key == 'mode'][0]
for s in TYPES[19].slots.values():
    if s.kind != 'choice': s.buf = '5'
key('charIn', 'd')
if capm.idx != 2: fails.append('D on a kind page: the kind changed')
if any(s.buf != s.defBuf for s in TYPES[19].slots.values() if s.kind != 'choice'): fails.append('D on a kind page: a box was not cleared')
key('charIn', '7')
if not any(s.buf == '7' for s in TYPES[19].slots.values() if s.kind != 'choice'): fails.append('D on a kind page: the cursor is not on a box')
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

# a whole question typed in: the theory card that answers it comes first, and ENTER shows its answer
for q, want in [("Which of the following are included in a firm's capital structure?", 'included in a firm'),
                ('which of the following is NOT part of capital structure', 'included in a firm'),
                ('true or false: with no taxes more debt does not change firm value', 'no tax'),
                ('why can earnings differ from cash flows', 'incremental EARNINGS'),
                ('which conditions must hold to use the wacc for a project', 'conditions must hold'),
                ('which is the least risky investment', 'LEAST risky'),
                ('how are covariance and correlation related', 'covariance and the correlation'),
                ('best mix of debt and equity when there is no tax', 'optimal capital structure'),
                ('debt makes equity cost more yet the wacc falls why', 'cost of equity HIGHER'),
                ('projects with the same risk as the firm which to accept', 'Several projects'),
                ('a firm borrows short-term and long-term to buy inventory', 'for 6 months'),
                ('does the cost of equity rise or fall as d/e rises', 'rise, fall'),
                ('old machine sold below book value', 'LESS than its book value'),
                ('overhaul avoided by replacing', 'overhaul')]:
    for _ in range(4): key('escapeKey')
    key('charIn', 's')
    app.type(q)
    hits = [G.CORE.U.hits[i] for i in range(1, len(G.CORE.U.hits) + 1)]
    # the card is found, and the groups come in order: meaning / what decides it, then pages, then examples (with numbers)
    pos = next((i for i, h in enumerate(hits) if want.lower() in str(h.e.t).lower()), None)
    if pos is None: fails.append(f'search {q!r}: the card {want!r} is not listed')
    cats = [h.cat for h in hits]
    if cats != sorted(cats): fails.append(f'search {q!r}: the groups are out of order {cats}')
    if pos is not None: G.CORE.U.hsel = pos + 1
    key('enterKey'); t = check_screen(f'search {q!r} opened')
    if want == 'included in a firm' and 'NOT IN' not in t: fails.append(f'search {q!r}: the answer is not on the page')

# a symbol's meaning comes first: 'cost of debt' -> LETTER: rd, rD (the legend line); ENTER opens the legend there
for q, sym in [('cost of debt', 'rd, rD'), ('unlevered cost', 'rU'), ('d/e', 'D/E'), ('tax shield', 'Interest tax shield'), ('rd', 'rd, rD')]:
    for _ in range(4): key('escapeKey')
    key('charIn', 's'); app.type(q)
    hits = [G.CORE.U.hits[i] for i in range(1, len(G.CORE.U.hits) + 1)]
    top = [str(h.e.t) for h in hits[:3]]
    if not any(t.startswith('LETTER: ' + sym + ' =') for t in top): fails.append(f'search {q!r}: no LETTER {sym} at the top {top}')
    if hits and not str(hits[0].e.t).startswith('LETTER:'): fails.append(f'search {q!r}: the first line is not a LETTER {top[:1]}')
    G.CORE.U.hsel = next(i + 1 for i, h in enumerate(hits) if str(h.e.t).startswith('LETTER: ' + sym + ' ='))
    key('enterKey'); t = check_screen(f'search {q!r} LETTER opened')
    if 'LEGEND' not in t or sym.split(',')[0] not in t: fails.append(f'search {q!r}: the legend is not open at {sym}')
# the risk order: 'riskiest', 'most risky', 'lowest risk', 'safest investment' -> the ranking of investments first
for q in ['riskiest', 'riskier', 'most risky', 'least risky', 'lowest risk', 'highest risk', 'risk order', 'safest investment',
          'which asset class has the least risk']:
    for _ in range(4): key('escapeKey')
    key('charIn', 's'); app.type(q)
    hits = [str(G.CORE.U.hits[i].e.t) for i in range(1, len(G.CORE.U.hits) + 1)]
    if not hits or not hits[0].startswith('WORD: risk ranking of investments'): fails.append(f'search {q!r}: the risk order is not first {hits[:2]}')
# a topic page found by its name: CHOOSER opens 'Formula chooser: WACC and MM' (the Weeks 10-11 which-formula page)
for _ in range(4): key('escapeKey')
key('charIn', 's'); app.type('chooser')
top = G.CORE.U.hits[1].e.t if len(G.CORE.U.hits) else ''
if 'Formula chooser' not in str(top): fails.append(f'search chooser: first hit is {top!r}')
key('enterKey'); t = check_screen('chooser topic opened')
if 'Tax rate in the question' not in t: fails.append('chooser: the topic page does not open at its rules')

# the WACC kind: the WACC itself is on the first answer screen (not below the weights)
for _ in range(4): key('escapeKey')
key('charIn', '7'); key('charIn', '1'); key('charIn', '1')
for v in ['50', '', '', '40', '', '', '', '10', '14', '8', '10', '30']:   # E, D, P, rE, rD, rP, Tc (own numbers)
    if v: app.type(v)
    key('arrowKey', 'down')
key('enterKey'); t = check_screen('WACC first screen')
if 'WACC = 10.24' not in t: fails.append('WACC kind: the WACC is not on the first answer screen')

# the legend (L): opens from home and from a boxes page, ESC goes back; the sheet's sections in the sheet's order
order = ['Financial Mathematics', 'Valuation of Bonds and Shares', 'Capital Budgeting', 'Working Capital', 'Risk and Return',
         'Cost of Capital', 'Capital Structure - No Tax World', 'Capital Structure - Tax World']
pos = [str(G.LEGEND).find('@@' + n) for n in order]
if min(pos) < 0 or pos != sorted(pos): fails.append(f'legend: sections missing or out of the sheet order {pos}')
for _ in range(5): key('escapeKey')
key('charIn', 'l'); t = check_screen('legend from home')
if 'LEGEND' not in t: fails.append('L on home does not open the legend')
for _ in range(40): key('arrowKey', 'right')
check_screen('legend scrolled to the end')
key('escapeKey')
if 'Find my question' not in check_screen('legend back home'): fails.append('ESC from the legend does not go back home')
key('charIn', '6'); key('charIn', '1'); key('charIn', '1'); key('charIn', 'l')
if 'LEGEND' not in check_screen('legend from a boxes page'): fails.append('L on a boxes page does not open the legend')
key('escapeKey')
if 'ENTER solve' not in check_screen('legend back to the boxes'): fails.append('ESC from the legend does not go back to the boxes')

# multi-step questions (M): every recipe and every step opens its page; values carry forward (own numbers)
R = G.RECIPES
for ri in range(1, len(R) + 1):
    for k in range(1, len(R[ri].steps) + 1):
        for _ in range(6): key('escapeKey')
        key('charIn', 'm'); key('charIn', str(ri)); key('charIn', str(k))
        t = check_screen(f'recipe {ri} step {k}')
        want = G.CORE.TYPES[R[ri].steps[k].go.type].name
        if want not in t or f'STEP {k}/' not in t: fails.append(f'recipe {ri} step {k}: does not open {want!r} with its STEP banner')
# recipe 1: FCF (Tc 30, revenue 100, costs 40, lost sales 10 -> FCF 35) carried into C on the PV page
for _ in range(6): key('escapeKey')
key('charIn', 'm'); key('charIn', '1'); key('charIn', '1')
for v in ['30', '100', '40', '10']: app.type(v); key('arrowKey', 'down')
key('enterKey'); t = check_screen('recipe 1 step 1 answer')
if 'Press M' not in t or 'C = 35' not in t: fails.append('recipe 1: the answer page does not offer step 2 with C = 35')
key('charIn', 'm'); t = check_screen('recipe 1 step 2')
if 'Regular payments' not in t or '35' not in t: fails.append('recipe 1: step 2 does not open with C = 35 typed in')
# recipe 5 (WACC from scratch): rE from CAPM (rf 4, beta 1.5, premium 6 -> 13%) is typed into the WACC page's rE box
for _ in range(6): key('escapeKey')
key('charIn', 'm'); key('charIn', '5'); key('charIn', '1')
qt = G.CORE.TYPES[20]
vis = [s.key for s in qt.slots.values() if s.key in ('rf', 'beta', 'mrp')]
lab = {s.key: s for s in qt.slots.values()}
for kk, v in [('rf', '4'), ('beta', '1.5'), ('mrp', '6')]: lab[kk].buf = v
key('enterKey'); t = check_screen('recipe 5 step 1 answer')
if 'Press M' not in t: fails.append('recipe 5: no next step offered after rE')
key('escapeKey'); key('escapeKey'); key('charIn', '4')   # back to the steps, straight to step 4 (the WACC)
if lab['re'].buf not in ('13', '13.0'): fails.append(f"recipe 5: the WACC page's rE box holds {lab['re'].buf!r}, not 13")
# ESC from a recipe step goes back to its list of steps, then to the list of recipes, then home
key('escapeKey'); t = check_screen('recipe esc')
if 'Steps (each opens its page)' not in t: fails.append('ESC from a recipe step does not go back to its steps')
key('escapeKey'); key('escapeKey')
if 'Find my question' not in check_screen('recipe esc home'): fails.append('ESC from the recipes does not go home')

# multi-step: carried numbers, kept boxes, a step that jumps (nxt), the ANSWER line, 0 = recipe 10 (own numbers)
def rslots(ti): return {sl.key: sl for sl in G.CORE.TYPES[ti].slots.values()}
def recipe_no(prefix):
    return next(i for i in range(1, len(R) + 1) if str(R[i].t).startswith(prefix))
def open_step(ri, k):
    for _ in range(6): key('escapeKey')
    key('charIn', 'm')
    if ri == 10: key('charIn', '0')
    elif ri < 10: key('charIn', str(ri))
    else:
        for _ in range(ri - 1): key('arrowKey', 'down')
        key('enterKey')
    key('charIn', str(k))
if len(R) > 10: fails.append(f'M lists {len(R)} recipes: only 1-9 and 0 have a key')
# different lives: NPV of A (-100, 3 x 50) and B (-150, 5 x 45) at 8.5%, then the EAA page has both NPVs and k = 8.5
ri = recipe_no('Different lives'); open_step(ri, 1)
sl = rslots(7)
if sl['cmp'].opts[sl['cmp'].idx] != 'A and B': fails.append('different lives: step 1 does not open with A and B')
for kk, v in [('k', '8.5'), ('A0', '-100'), ('Alev', '50'), ('Ayrs', '3'), ('B0', '-150'), ('Blev', '45'), ('Byrs', '5')]: sl[kk].buf = v
key('enterKey'); t = check_screen('different lives step 1 answer')
if 'ANSWER: A: NPV' not in t or 'Press M' not in t: fails.append('different lives: no ANSWER line or no next step after the NPVs')
key('charIn', 'm'); sl8 = rslots(8)
if sl8['k'].buf != '8.5' or not sl8['NPVA'].buf.startswith('27.70') or not sl8['NPVB'].buf.startswith('27.32'):
    fails.append(f"different lives: step 2 holds k={sl8['k'].buf!r} NPVA={sl8['NPVA'].buf!r} NPVB={sl8['NPVB'].buf!r}")
sl8['tA'].buf, sl8['tB'].buf = '3', '5'
key('enterKey'); t = check_screen('different lives step 2 answer')
if 'LAST STEP' not in t or 'ANSWER: A: EAA' not in t: fails.append('different lives: the last step does not show its ANSWER lines')
# a rate given another way: 7% compounded quarterly -> APR with monthly compounding, carried into r of the payments page
ri = recipe_no('Rate given another way'); open_step(ri, 1)
sl = rslots(10); sl['r'].buf = '7'
for o in ('m', 'm2'):
    s_ = sl[o]; want = '4 (' if o == 'm' else '12 ('
    s_.idx = next(j for j in range(1, len(s_.opts) + 1) if str(s_.opts[j]).startswith(want))
key('enterKey'); key('charIn', 'm')
if not rslots(2)['r'].buf.startswith('6.959'): fails.append(f"rate recipe: r on the payments page is {rslots(2)['r'].buf!r}, not 6.959...")
# project NPV: the WACC step jumps straight to the NPV step (step 2 is the other way to the rate)
ri = recipe_no('Project NPV:'); open_step(ri, 1)
sl = rslots(20)
for kk, v in [('E', '60'), ('D', '40'), ('re', '13'), ('rd', '5'), ('Tc', '30')]: sl[kk].buf = v
key('enterKey'); t = check_screen('project NPV step 1 answer')
if 'Press M: step 3' not in t: fails.append('project NPV: the WACC step does not lead to step 3')
key('charIn', 'm'); t = check_screen('project NPV step 3')
if 'STEP 3/3' not in t or rslots(7)['k'].buf != '9.2': fails.append(f"project NPV: step 3 does not open with k = 9.2 ({rslots(7)['k'].buf!r})")
# levered vs unlevered: rU from EBIT 420, Tc 20, VU 3200 (= 10.5%); Tc typed in step 1 is kept for step 2
ri = recipe_no('Levered vs unlevered'); open_step(ri, 1)
sl = rslots(21)
for kk, v in [('EBIT', '420'), ('Tc', '20'), ('VU', '3200')]: sl[kk].buf = v
key('enterKey'); key('charIn', 'm'); sl = rslots(21)
if sl['rU'].buf != '10.5' or sl['Tc'].buf != '20': fails.append(f"levered recipe: step 2 holds rU={sl['rU'].buf!r} Tc={sl['Tc'].buf!r}")
for kk, v in [('rd', '7'), ('DE', '0.5')]: sl[kk].buf = v
key('enterKey'); t = check_screen('levered recipe step 2 answer')
if 'ANSWER: rE = 11.9 %' not in t: fails.append('levered recipe: rE 11.9% not in the ANSWER line')
# WACC from scratch: a bond (7% coupon, semi-annual, 8 years left, price $960, Tc 28%) -> its rD and Tc reach the WACC page
ri = recipe_no('WACC from scratch'); open_step(ri, 2)
sl = rslots(20)
for kk, v in [('cpn', '7'), ('yrs', '8'), ('price', '960'), ('face', '1000'), ('Tc', '28')]: sl[kk].buf = v
sl['m'].idx = next(j for j in range(1, len(sl['m'].opts) + 1) if str(sl['m'].opts[j]).startswith('2'))
key('enterKey'); t = check_screen('WACC recipe bond step')
if 'ANSWER: after-tax rD' not in t: fails.append('WACC recipe: the bond step shows no after-tax rD ANSWER line')
key('escapeKey'); key('escapeKey'); key('charIn', '4'); sl = rslots(20)
if not sl['rd'].buf.startswith('7.825') or sl['Tc'].buf != '28': fails.append(f"WACC recipe: the WACC page holds rD={sl['rd'].buf!r} Tc={sl['Tc'].buf!r}")
# search finds a multi-step question by the question's words; ENTER opens its steps
for _ in range(6): key('escapeKey')
key('charIn', 's'); app.type('billing firm charges')
hits = [str(G.CORE.U.hits[i].e.t) for i in range(1, len(G.CORE.U.hits) + 1)]
mi = next((i for i, t in enumerate(hits) if t.startswith('MULTI-STEP')), None)
if mi is None: fails.append('search: billing firm does not list the multi-step question')
else: G.CORE.U.hsel = mi + 1
key('enterKey')
if 'Steps (each opens its page)' not in check_screen('search opens a recipe'): fails.append('search: ENTER on a MULTI-STEP line does not open its steps')
# finder leaves that are multi-step questions open their steps
for path, leaf in leaves(FINDER, [], []):
    if leaf.recipe is None: continue
    for _ in range(6): key('escapeKey')
    key('charIn', 'f')
    for idx in path:
        G.CORE.U.fsel = idx
        key('enterKey')
    t = check_screen(f'finder {path} {leaf.t}')
    if 'Steps (each opens its page)' not in t: fails.append(f'finder {path} {leaf.t}: does not open its multi-step question')
# a page that is step 1 of a multi-step question says where the next step is, and its notes list the M questions
for _ in range(6): key('escapeKey')
key('charIn', '3'); key('charIn', '3'); key('enterKey')
if 'often next' not in G.CORE.rtext(): fails.append('type 9 answer page: no "often next" line')
key('escapeKey'); key('charIn', 'n')
if 'OFTEN COMES WITH' not in G.CORE.ntext(): fails.append('type 9 notes: no OFTEN COMES WITH section')
for _ in range(6): key('escapeKey')

# exam parts: A (definitions first), B (ways to the page), C (how to answer written + Excel); week digits on home
def home():
    for _ in range(7): key('escapeKey')
for q, want in [('short-term long-term inventory', 'short-term vs long-term'), ('M&M', 'Modigliani-Miller'),
                ('lowest risk', 'risk ranking of investments')]:
    home(); key('charIn', 'a'); app.type(q)
    t = check_screen(f'part A {q}')
    top = G.CORE.U.hits[1].e.t if len(G.CORE.U.hits) else ''
    if 'PART A' not in t: fails.append('A does not open the Part A search')
    if want not in str(top): fails.append(f'part A {q!r}: first hit is {top!r}, not the definition {want!r}')
    if any(str(G.CORE.U.hits[i].e.t).startswith(('SOLVE', 'MULTI')) for i in range(1, len(G.CORE.U.hits) + 1)):
        fails.append(f'part A {q!r}: solver pages listed (Part A shows definitions and cards only)')
    key('enterKey'); check_screen(f'part A {q} opened')
home(); key('charIn', 'b'); t = check_screen('part B')
if 'PART B' not in t: fails.append('B does not open Part B')
key('charIn', 'm'); t = check_screen('part B -> M')
if 'MULTI-STEP' not in t: fails.append('Part B: M does not open the multi-step questions')
home(); key('charIn', 'c'); t = check_screen('part C')
if 'PART C' not in t: fails.append('C does not open Part C')
for d, want in [('1', 'HOW TO ANSWER'), ('2', 'EXCEL PARTS')]:
    key('charIn', d); t = check_screen(f'part C {d}')
    if want not in t: fails.append(f'Part C {d}: the guide {want!r} does not open')
    for _ in range(30): key('arrowKey', 'down')
    check_screen(f'part C {d} scrolled')
    key('escapeKey')
    if 'PART C' not in check_screen(f'part C {d} back'): fails.append(f'Part C {d}: ESC does not go back to Part C')
home(); key('charIn', '7')
if 'WACC' not in check_screen('home 7'): fails.append('the week number 7 on home does not open Weeks 10-11')
home(); key('charIn', 'w'); key('charIn', '6')
if 'Risk and return' not in check_screen('weeks 6'): fails.append('W then 6 does not open Week 9')

# the tenth kind is on key 0 (Cost of capital: ALL parts on one page)
for _ in range(7): key('escapeKey')
key('charIn', '7'); key('charIn', '1'); key('charIn', '0')
if 'debt weight (%)' not in check_screen('7 1 0'): fails.append('key 0 does not open the tenth kind (ALL parts)')

# glossary: jump through letters and open one entry per letter
for _ in range(4): key('escapeKey')
key('charIn', 'g')
for letter in 'abcdefghijklmnopqrstuvwxyz':
    key('charIn', letter); check_screen(f'glossary {letter}')
key('escapeKey')

# the Everything page (home E): a box for every letter on the sheet, section titles skipped, left/right = sections,
# ENTER lists every answer; I explains one (own numbers)
EV = G.EVERY
evslots = TYPES[EV.ti].slots
def cur_label():
    """The label of the highlighted box (the row drawn on the selection colour)."""
    ops, col, hit = paint('everything'), None, False
    for o in ops:
        if o[0] == 'color': col = (o[1], o[2], o[3])
        elif o[0] == 'fill' and col == (205, 227, 250): hit = True
        elif o[0] == 'text' and hit: return o[1]
    return None
def ev_go(label):
    for _ in range(len(evslots) + 2):
        if cur_label() == label: return True
        key('arrowKey', 'down')
    fails.append(f'everything: no box {label!r}'); return False
for _ in range(7): key('escapeKey')
if 'Everything: type all you know' not in check_screen('home with E'): fails.append('home: no E row')
key('charIn', 'e'); t = check_screen('everything page')
if '1. Financial Mathematics' not in t or 'Type all you know' not in t: fails.append('E does not open the Everything page')
if cur_label() != 'PV money today ($)': fails.append(f'everything: the cursor starts on {cur_label()!r}, not the first box')
heads = [sl.label for sl in evslots.values() if sl.kind == 'sec']
want_heads = ['Financial Mathematics', 'Valuation of Bonds and Shares', 'Capital Budgeting', 'Working Capital', 'Risk and Return',
              'Cost of Capital', 'Capital Structure - No Tax World', 'Capital Structure - Tax World', 'Extra lines (not on the sheet)']
if [h.split('. ', 1)[1] for h in heads] != want_heads: fails.append(f'everything: sections {heads}')
# up/down never stop on a section title; one full round passes every box once
labels_seen = set()
for _ in range(sum(1 for sl in evslots.values() if sl.kind != 'sec')):   # Tc is listed 3 times: Cost of Capital, Tax World, extra lines
    lab = cur_label()
    if lab in heads: fails.append(f'everything: the cursor stopped on the title {lab!r}'); break
    labels_seen.add(lab)
    key('arrowKey', 'down')
if cur_label() != 'PV money today ($)': fails.append('everything: down does not wrap round to the first box')
key('arrowKey', 'up')
if cur_label() in heads: fails.append('everything: up stopped on a section title')
# left/right: the first box of the next / previous section, its title on screen
key('arrowKey', 'right')   # from the last box (the extra lines): round to Financial Maths
if cur_label() != 'PV money today ($)': fails.append(f'everything: right from the last section goes to {cur_label()!r}')
key('arrowKey', 'right')
if cur_label() != 'PBond bond price ($)': fails.append(f'everything: right goes to {cur_label()!r}, not the first Bonds box')
if '2. Valuation of Bonds and Shares' not in check_screen('everything right'): fails.append('everything: the section title is not shown after right')
key('arrowKey', 'left')
if cur_label() != 'PV money today ($)': fails.append(f'everything: left goes to {cur_label()!r}')
key('arrowKey', 'left')
if cur_label() != 'VL levered value ($)' or '9. Extra lines (not on the sheet)' not in check_screen('everything left wraps'): fails.append('everything: left from the first section does not wrap to the last')
key('arrowKey', 'left')
if cur_label() != 'VL levered value ($)' or '8. Capital Structure - Tax World' not in check_screen('everything left to the Tax World'): fails.append('everything: left from the extra lines does not go to the Tax World')
key('arrowKey', 'up')
if cur_label() in heads: fails.append('everything: up from the first Tax World box stopped on its title')
key('arrowKey', 'right'); key('arrowKey', 'right')
if cur_label() != 'VL levered value ($)' or '9. Extra lines (not on the sheet)' not in check_screen('everything right to the extra lines'): fails.append('everything: right does not reach the extra lines')
key('arrowKey', 'up')
if cur_label() in heads or '9. Extra lines' in str(cur_label()): fails.append('everything: up from the first extra box stopped on its title')
# type: Financial Maths C 250, r 2, APR 6, m 12; Risk and Return rf 3, beta 1.2, E[RM] 9; Cost of Capital E 600, D 400, rd 6, Tc 30
key('charIn', 'd')
for lab, v in [('C payment each period ($)', '250'), ('r rate per period (%)', '2'), ('APR quoted yearly rate (%)', '6'),
               ('m compounding a year', '12'), ('rf risk-free rate (%)', '3'), ('Beta(i) beta of share i', '1.2'),
               ('E[RM] market return (%)', '9'), ('E equity market value ($)', '600'), ('rd PRE-tax cost of debt (%)', '6'),
               ('Tc tax rate (%) - shared', '30'), ('D debt market value ($)', '400')]:
    if ev_go(lab): app.type(v)
if len({sl.key for sl in evslots.values() if sl.buf != ''}) != 11: fails.append('everything: the typed values did not all land in boxes')
tc = [sl for sl in evslots.values() if sl.key == 'Tc']
if len(tc) != 3 or any(x.buf != '30' for x in tc): fails.append('everything: Tc is not one box in its three sections')
key('enterKey'); t = check_screen('everything answers')
rt = G.CORE.rtext()
for w in ['EVERY ANSWER', '1. Financial Mathematics', 'EAR from an APR: EAR = 6.1678 %', 'PV of a perpetuity: PV = $12,500.00',
          '5. Risk and Return', 'CAPM (the SML): E[Ri] = 10.2 %', '6. Cost of Capital', 'WACC: rWACC = 7.8 %',
          'uses re = E[Ri] from CAPM', 'FORMULA SHEET', 'EAR = (1 + APR/m)^m - 1']:
    if w not in rt: fails.append(f'everything answers: {w!r} missing')
if 'FORMULA + MEANINGS' in rt: fails.append('everything answers: an empty FORMULA + MEANINGS block')
# I on the WACC line (clicked twice): the formula, the numbers in it, where re came from
found = False
for _ in range(40):
    ops = paint('everything answers scrolled')
    ys = [o[3] for o in ops if o[0] == 'text' and str(o[1]).startswith('WACC: rWACC')]
    if ys: found = True; break
    key('arrowKey', 'down')
if found:
    key('mouseDown', 40, ys[0] + 5); key('mouseDown', 40, ys[0] + 5)
    t = check_screen('everything explain')
    for w in ['EXPLAIN', 'WACC: rWACC', 'rWACC = re*E/V + rp*P/V + rd*(1 - Tc)*D/V', '0.102*600/1000', 'rWACC = 7.80%']:
        if w not in t: fails.append(f'everything explain: {w!r} not shown')
    for _ in range(12): key('arrowKey', 'down')
    t = check_screen('everything explain scrolled')
    if 'from CAPM' not in t: fails.append('everything explain: does not say re came from CAPM')
    key('escapeKey')
    if 'SOLVED' not in check_screen('everything explain back'): fails.append('everything: ESC from the explanation does not go back to the answers')
else: fails.append('everything answers: the WACC line is not on screen')
key('charIn', 'i'); t = check_screen('everything I')
if 'EXPLAIN' not in t or 'the formula on the sheet' not in t: fails.append('everything: I does not explain the picked line')
key('escapeKey'); key('escapeKey')
for letter, want_txt in (('n', 'HOW IT WORKS'), ('w', 'EXAMPLE'), ('a', 'THE STEPS'), ('h', 'Everything: the fall back')):
    key('charIn', letter)
    for _ in range(60):
        if want_txt in check_screen(f'everything {letter}'): break
        key('arrowKey', 'down')
    if want_txt not in check_screen(f'everything {letter}'): fails.append(f'everything: {letter.upper()} page has no {want_txt!r}')
    key('escapeKey')
key('escapeKey')
if 'Find my question' not in check_screen('everything esc'): fails.append('everything: ESC does not go home')
# nothing solvable: the lines one value short are named
key('charIn', 'e'); key('charIn', 'd'); ev_go('C payment each period ($)'); app.type('100'); key('enterKey')
rt = G.CORE.rtext()
if 'ONE VALUE SHORT' not in rt or 'PV of a perpetuity: type PV or r' not in rt: fails.append('everything: no ONE VALUE SHORT lines')
for _ in range(7): key('escapeKey')
key('charIn', 'b'); key('charIn', 'e')
if 'Everything: type all you know' not in check_screen('part B E'): fails.append('Part B: E does not open the Everything page')
for _ in range(7): key('escapeKey')

# X: Excel tables (Part C). Home row after C; the list of 4 kinds; each kind solves; T shows the Excel grid (items down,
# years across) that scrolls sideways with the labels kept; nothing drawn past the screen's edge (own numbers)
from nspire_mock import text_width
def drawn(where):
    """(text, x, y, width) of every string on the screen"""
    font, res = ('sansserif', 'r', 10), []
    for o in paint(where):
        if o[0] == 'font': font = (o[1], o[2], o[3])
        elif o[0] == 'text': res.append((o[1], o[2], o[3], text_width(o[1], font[2], font[1])))
    return res
def off_screen(where):
    bad = [f'{t!r} at x={x} w={w:.0f}' for t, x, y, w in drawn(where) if x < 0 or x + w > 318.5 or y < 0 or y > 212]
    if bad: fails.append(f'{where}: drawn past the edge: ' + '; '.join(bad[:3]))
XT = G.XL_TI
xq = TYPES[XT]
xs = {sl.key: sl for sl in xq.slots.values()}
home()
t = check_screen('home with X')
if 'X  Excel tables (Part C): cash flows, trees' not in t: fails.append('home: no X row')
elif t.index('C  Part C') > t.index('X  Excel tables'): fails.append('home: X is not right after C')
key('charIn', 'x'); t = check_screen('X list')
for k_ in ('cash-flow table: a replacement', 'cash-flow table: a new project', 'decision tree: act now or wait',
           'decision tree: chance and decision nodes', 'PICK WHEN'):
    if k_ not in t: fails.append(f'X list: {k_!r} not shown')
key('escapeKey')
if 'Find my question' not in check_screen('X list esc'): fails.append('X list: ESC does not go home')
XKIND = [('1', 'NEW asset: cost today', dict(n='6', r='10', Tc='30', newC='120000', lifeN='4', saleN='10000', bvO='20000', saleO='14000',
                                              depO='4000', save='30000', avoid='15000', avYr='2'), 'Year 6', 7, 'FCF (new - old)'),
         ('2', 'operating costs a year', dict(n='5', r='12', Tc='30', rev='80000', opex='30000', g='3', newC='100000', lifeN='5',
                                              saleN='8000', nwc='10000'), 'Year 5', 6, 'NWC change'),
         ('3', 'cost if you act NOW', dict(c0='2000', vg='5000', pg='70', cw='2600', tm='3', ear='9'), 'p x PV', 5, 'WAIT: NPV'),
         ('4', 'branch 1: cash flow', dict(v1='90000', p1='30', v2='60000', p2='50', v3='20000', t='1', ear='10', I='50000', alt='12000'),
          'p x PV', 5, 'GO: NPV')]
for d, label, vals, last, ncols, rowlab in XKIND:
    home(); key('charIn', 'x'); key('charIn', d)
    where = f'X kind {d}'
    t = check_screen(where + ' input')
    if label not in t: fails.append(f'{where}: its page does not open ({label!r} not shown)')
    key('charIn', 'd')
    for k_, v in vals.items(): xs[k_].buf = v
    if d == '4': xs['tm'].buf = ''
    key('enterKey'); t = check_screen(where + ' answer'); off_screen(where + ' answer')
    rt = str(G.CORE.rtext())
    if d in '12':
        lines = [ln for ln in rt.split('\n') if ln.strip()]
        first = next((i for i, ln in enumerate(lines) if ln.startswith('FCF EACH YEAR')), None)
        if first is None or not lines[first + 1].startswith('Year 0 FCF') or 'NPV = ' not in rt:
            fails.append(f'{where}: the answer does not start with the FCF row year by year and the NPV')
        elif rt.index('Year 0 FCF') > rt.index('NPV = ') or rt.index('NPV = ') > rt.index('press T for the full Excel table'):
            fails.append(f'{where}: order is not FCF years, NPV, then press T')
    elif 'choose ' not in rt or 'press T for the full Excel table' not in rt: fails.append(f'{where}: no decision line or no press T line')
    if 'Something went wrong' in rt or 'Need ' in rt: fails.append(f'{where}: solved with a Need / error line')
    key('charIn', 't'); t = check_screen(where + ' grid'); off_screen(where + ' grid')
    if 'TABLE' not in t or 'item' not in t: fails.append(f'{where}: T does not open the grid')
    if d in '12' and 'Year 0' not in t: fails.append(f'{where}: the grid does not start at Year 0')
    lw = 92 if d in '12' else 78
    for tx, x, y, w in drawn(where + ' grid'):
        if x in (2, 15) and 38 <= y < 150 and x + w > lw - 1: fails.append(f'{where} grid: the label {tx!r} runs into the numbers')
    for _ in range(ncols + 1):                               # right, one year at a time, up to the last
        if last in [tx for tx, x, y, w in drawn(where) if y == 24]: break
        key('arrowKey', 'right')
    for _ in range(40):
        if rowlab in [tx for tx, x, y, w in drawn(where) if x in (2, 15) and y >= 38]: break
        key('arrowKey', 'down')
    t = check_screen(where + ' grid scrolled'); off_screen(where + ' grid scrolled')
    if last not in t: fails.append(f'{where}: the grid does not scroll to {last!r}')
    if d in '12' and 'Year 0' in t: fails.append(f'{where}: Year 0 still shown after scrolling to the last year')
    labs = [tx for tx, x, y, w in drawn(where) if x in (2, 15) and y >= 38]
    if rowlab not in labs: fails.append(f'{where}: the row labels are not kept on the left when scrolled ({labs[:4]})')
    if 'Excel ' not in t: fails.append(f'{where}: the picked cell does not show its Excel formula')
    key('escapeKey'); key('escapeKey'); key('escapeKey')
    if 'What does the question ask for?' not in check_screen(where + ' back'): fails.append(f'{where}: ESC does not go back to the kinds')
key('escapeKey')
if 'Find my question' not in check_screen('X back home'): fails.append('X: ESC from the kinds does not go home')
home(); key('charIn', 'c'); key('charIn', '3')
if 'What does the question ask for?' not in check_screen('part C 3'): fails.append('Part C 3 does not open the Excel tables')
key('escapeKey')
if 'PART C' not in check_screen('part C 3 back'): fails.append('Part C 3: ESC does not go back to Part C')
home(); key('charIn', 'b'); key('charIn', 'x')
if 'What does the question ask for?' not in check_screen('part B X'): fails.append('Part B X does not open the Excel tables')
key('escapeKey')
if 'PART B' not in check_screen('part B X back'): fails.append('Part B X: ESC does not go back to Part B')
for _ in range(7): key('escapeKey')
# home fits 13 rows (the public ones + one private row from EXTRA_HOME); a click picks the row under it
app2 = NspireApp(src)
G2 = app2.lua.globals()
G2.EXTRA_HOME = app2.lua.eval('{ { k = "P", t = "Private row for the test", s = "private", open = function() end } }')
ops2 = app2.ops()
t2 = ' | '.join(o[1] for o in ops2 if o[0] == 'text')
if 'Private row for the test' not in t2 or 'v more' in t2: fails.append('home: 13 rows do not fit on one screen')
hy = {o[1].split('  ')[0]: o[3] for o in ops2 if o[0] == 'text' and '  ' in str(o[1])}
app2.key('mouseDown', 40, hy.get('X', 0) + 5)
if G2.CORE.U.homeSel != 4: fails.append(f'home: a click on the X row picks row {G2.CORE.U.homeSel}')
app2.key('mouseDown', 40, hy.get('P', 0) + 5)
if G2.CORE.U.homeSel != 13: fails.append(f'home: a click on the private row picks row {G2.CORE.U.homeSel}')
for _ in range(4): key('escapeKey')

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
