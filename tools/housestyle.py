"""House style (Stuart 24 Nov 2026 14:37 and 14:46, standing requirement): three weights (400 text, 600 label, 700 number),
three corners (6, 10, 14 px) in every product. Circles and pills (radius 16 px and over, 50%, 999px) keep their shape: geometry."""
import re, sys, os
W = {'300': '400', '400': '400', '500': '400', '600': '600', '700': '700', '800': '700', '900': '700'}
def rad(n):
    n = float(n)
    if n >= 16: return None
    return '6' if n <= 7 else '10' if n <= 11 else '14'
tot = {}
for d in sys.argv[1:]:
    for f in sorted(os.listdir(d)):
        if not (f.endswith('.js') or f.endswith('.css') or f == 'index.html'): continue
        if f in ('fshelpimg.js', 'navhelpimg.js', 'worker.js', 'router.js', 'engine.js'): continue
        p = os.path.join(d, f); s = open(p, encoding='utf-8').read(); o = s; n = 0
        def fw(m):
            global n
            return m.group(1) + W.get(m.group(2), m.group(2))
        s = re.sub(r'(font:\s?|font-weight:\s?)([1-9]00)\b', fw, s)
        s = re.sub(r"""(['"])([1-9]00)( \d+(?:\.\d+)?px)""", lambda m: m.group(1) + W.get(m.group(2), m.group(2)) + m.group(3), s)
        def br(m):
            r = rad(m.group(2)); return m.group(0) if r is None else m.group(1) + r + 'px'
        s = re.sub(r'(border-radius:\s?)(\d+(?:\.\d+)?)px', br, s)
        if s != o: open(p, 'w', encoding='utf-8').write(s); tot[p] = sum(1 for a, b in zip(o.splitlines(), s.splitlines()) if a != b)
for k, v in tot.items(): print(v, 'lines', k)
