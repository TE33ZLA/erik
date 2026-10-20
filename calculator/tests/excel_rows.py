"""Rebuild a spreadsheet from the EXCEL lines a result page shows, and work it out, so a test can check that
following those lines in Excel gives the same numbers as the solver.
   rows = excel_rows.replacement(texts)  -> {'FCF': [year 0, year 1, ...], 'NPV': x, 'IRR': None}
   excel_rows.wait_tree(texts)           -> {'now': NPV act now, 'wait': NPV wait}
texts: the text of every row of the result page, in order."""
import re

COLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'


def _num(expr, cells=None):
    """Work out a small Excel expression: numbers, + - * / ^, brackets, SUM(B2:B5), MAX(a,b), cell refs."""
    e = expr.strip().lstrip('=')
    if cells is not None:
        def rng(m):
            c, r1, r2 = m.group(1), int(m.group(2)), int(m.group(4))
            return '(' + '+'.join(repr(cells.get((c, r), 0.0)) for r in range(r1, r2 + 1)) + ')'
        e = re.sub(r'SUM\(([A-Z])(\d+):([A-Z])(\d+)\)', rng, e)
        e = re.sub(r'\b([A-Z])(\d+)\b', lambda m: '(' + repr(cells.get((m.group(1), int(m.group(2))), 0.0)) + ')', e)
    e = e.replace('MAX(', 'max(').replace('^', '**')
    if not re.fullmatch(r'[0-9eE.+\-*/() ,max]*', e):
        raise ValueError('unexpected text in a formula: ' + expr)
    return float(eval(e, {'__builtins__': {}}, {'max': max}))


def _shift(formula, col):
    """The same formula copied into another column (every reference moves to that column)."""
    return re.sub(r'\b[A-Z](\d+)\b', lambda m: col + m.group(1), formula)


def replacement(texts):
    """Type 22: 'row N label: ...' lines, then 'NPV: =NPV(r,C20:G20)+B20'."""
    head = [t for t in texts if t.startswith('column A: the labels')]
    last = re.search(r'in ([A-Z])1$', head[0]).group(1)
    span = COLS[COLS.index('C'):COLS.index(last) + 1]
    cells, copies = {}, []
    for t in texts:
        m = re.match(r'row (\d+) [^:]+: (.*)$', t)
        if not m:
            continue
        r, how = int(m.group(1)), m.group(2)
        how = re.split(r'\s{2}\(', how)[0]           # drop a note in brackets after two spaces
        for part in how.split('; '):
            part = part.strip()
            m2 = re.match(r'([A-Z])(\d+) (=.*?)(, copy right)?$', part)
            if m2:                                     # a formula (or a number) in one cell, maybe copied right
                c, f, cp = m2.group(1), m2.group(3).replace('= ', '=', 1), m2.group(4)
                copies.append((r, [c] + ([x for x in span if x > c] if cp else []), f, c))
                continue
            m3 = re.match(r'(?:only )?([A-Z])(?: to ([A-Z]))?(?: \(year [^)]*\))? =\s?(.*)$', part)
            if not m3:
                raise ValueError('cannot read: ' + t)
            c1, c2, val = m3.group(1), m3.group(2) or m3.group(1), m3.group(3)
            for c in COLS[COLS.index(c1):COLS.index(c2) + 1]:
                cells[(c, r)] = _num(val)
    for r, cols, f, c0 in sorted(copies, key=lambda x: x[0]):   # formulas only point upwards: work down the rows
        for c in cols:
            cells[(c, r)] = _num(_shift(f, c) if c != c0 else f, cells)
    frow = max(r for r, _, f, _ in copies if 'SUM' in f)
    fcf = [cells.get(('B', frow), 0.0)] + [cells.get((c, frow), 0.0) for c in span]
    out = {'FCF': fcf, 'NPV': None}
    for t in texts:
        m = re.match(r'NPV: =NPV\(([\d.]+),([A-Z])(\d+):([A-Z])(\d+)\)\+([A-Z])(\d+)$', t)
        if m:
            rate = float(m.group(1))
            out['NPV'] = fcf[0] + sum(v / (1 + rate) ** (i + 1) for i, v in enumerate(fcf[1:]))
    return out


def wait_tree(texts):
    """Type 12 'act now or wait': four lines, each '=(that cell)...' uses the line before it."""
    vals, prev = {}, None
    for t in texts:
        m = re.match(r'(now|wait), (expected value|NPV): (=.*)$', t)
        if not m:
            continue
        f = m.group(3).replace('(that cell)', '(' + repr(prev) + ')' if prev is not None else '(0)')
        prev = _num(f)
        if m.group(2) == 'NPV':
            vals[m.group(1)] = prev
    return vals
