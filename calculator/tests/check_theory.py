"""Check a theory data file for the calculator app.
   python3 calculator/tests/check_theory.py calculator/src/theory_a.lua THEORY_A
Checks: it loads in Lua 5.1, ASCII only, the structure, and the length limits (the screen is 318 px wide)."""
import os, sys, re
sys.path.insert(0, os.environ.get('PYLIB', '/tmp/claude-0/-home-user-erik/c6dd69b7-6607-5615-be58-03b366b184b4/scratchpad/tns/pylib'))
import lupa.lua51 as L51

path, name = sys.argv[1], sys.argv[2]
src = open(path, encoding='utf-8').read()
errs = []
for ln, line in enumerate(src.split('\n'), 1):
    bad = [c for c in line if ord(c) > 126 or (ord(c) < 32 and c not in '\t')]
    if bad: errs.append(f'line {ln}: non-ASCII character(s) {"".join(sorted(set(bad)))!r} - use plain ASCII (\' " - x / -> >= <=)')
lua = L51.LuaRuntime(unpack_returned_tuples=True)
try:
    lua.execute(src)
except Exception as e:
    print('LUA ERROR:', e); sys.exit(1)
T = lua.globals()[name]
if T is None: print(f'{name} is not defined'); sys.exit(1)
LIM = {'q': 150, 'a': 160, 'why': 260, 'trap': 150}
n_items = n_rules = 0
topics = [T[i] for i in range(1, len(T) + 1)]
for k, t in enumerate(topics, 1):
    where = f'topic {k} ({t["topic"]})'
    if not t['topic'] or len(t['topic']) > 34: errs.append(f'{where}: topic name missing or longer than 34 chars')
    if not t['week']: errs.append(f'{where}: week missing')
    rules = t['rules']; items = t['items']
    if rules is None or len(rules) < 3: errs.append(f'{where}: needs at least 3 rules')
    else:
        for j in range(1, len(rules) + 1):
            r = rules[j]; n_rules += 1
            if len(r) > 76: errs.append(f'{where} rule {j}: longer than 76 chars: {r!r}')
    if items is None or len(items) < 5: errs.append(f'{where}: needs at least 5 items')
    else:
        for j in range(1, len(items) + 1):
            it = items[j]; n_items += 1
            for f in ('q', 'a', 'why', 'words'):
                if not it[f]: errs.append(f'{where} item {j}: missing {f}')
            for f, lim in LIM.items():
                v = it[f]
                if v and len(v) > lim: errs.append(f'{where} item {j}: {f} longer than {lim} chars ({len(v)})')
            if it['words'] and it['words'] != it['words'].lower(): errs.append(f'{where} item {j}: words must be lowercase')
print(f'{len(topics)} topics, {n_items} items, {n_rules} rules')
if errs:
    print('\n'.join(errs[:80])); print(f'{len(errs)} problem(s)'); sys.exit(1)
print('OK')
