"""Builds the Route and Navigate marks (Stuart 14 Nov 2026, DISCUSSION 114).

The three FirstShift sails redrawn as clean strokes over the traced master, and the tool's name as outlined
Space Grotesk 600 with the landing page's tracking and blue full stop, so the mark is crisp and identical with or without web fonts. Two layouts in each file:
'stack' (sails over the name, for the phone's small square) and 'row' (sails beside the name, wider screens).
Colours come from CSS variables with light-theme fallbacks, so the inlined copy follows light, dark and night.

Writes site/brand/route-mark.svg, navigate-mark.svg (the masters) and site/brand/<tool>-mark.inc.html (the
two inline svgs the page carries). Run: python3 tools/make_marks.py space-grotesk-latin-600-normal.woff (needs fonttools and uharfbuzz)
"""
import sys, os, re
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site', 'brand')
f = TTFont(sys.argv[1]); gs = f.getGlyphSet(); order = f.getGlyphOrder()
import uharfbuzz as hb
import io
_b = io.BytesIO(); _t = TTFont(sys.argv[1]); _t.flavor = None; _t.save(_b)   # HarfBuzz reads plain TrueType, not woff
HBF = hb.Font(hb.Face(hb.Blob(_b.getvalue())))
TRACK = -40  # font units per letter: -0.04 em, as the landing page heading (letter-spacing:-.04em)
def outline(text):
    """The name plus a full stop, shaped with the font's own kerning (HarfBuzz) and the landing page's tracking.
    Returns draw(x0, base, s) -> (name path, dot path), the width in font units and the cap height."""
    buf = hb.Buffer(); buf.add_str(text + '.'); buf.guess_segment_properties(); hb.shape(HBF, buf, {'kern': True, 'liga': True})
    gl = [(order[i.codepoint], p.x_advance, p.x_offset) for i, p in zip(buf.glyph_infos, buf.glyph_positions)]
    bp = BoundsPen(gs); x = 0
    for n, adv, off in gl: gs[n].draw(TransformPen(bp, (1, 0, 0, 1, x + off, 0))); x += adv + TRACK
    xmin, ymin, xmax, ymax = bp.bounds
    capb = BoundsPen(gs); gs[gl[0][0]].draw(capb); cap = capb.bounds[3]
    def draw(x0, base, s):
        pn, pd = SVGPathPen(gs), SVGPathPen(gs); x = 0
        for k, (n, adv, off) in enumerate(gl):
            gs[n].draw(TransformPen(pd if k == len(gl) - 1 else pn, (s, 0, 0, -s, x0 + (x + off - xmin) * s, base))); x += adv + TRACK
        r = lambda t: re.sub(r'-?\d+\.\d+', lambda m: ('%.2f' % float(m.group())).rstrip('0').rstrip('.'), t)
        return r(pn.getCommands()), r(pd.getCommands())
    return draw, xmax - xmin, cap
# The sails in the master's frame (405 x 487 px), measured from sails-light.svg
SAILS = [([(262, 40), (36, 350), (205, 299)], 'navy'), ([(318, 80), (76, 410), (262, 356)], 'navy'),
         ([(372, 131), (149, 440), (301, 401)], 'blue')]
SX0, SY0, SX1, SY1 = 28, 32, 380, 448  # stroke-inclusive bounds
def sails(x, y, h):
    s = h / (SY1 - SY0)
    out = [f'<g transform="translate({x - SX0 * s:.2f} {y - SY0 * s:.2f}) scale({s:.4f})" fill="none" stroke-width="16" stroke-linejoin="round" stroke-linecap="round">']
    for p, c in SAILS:
        fb = '#042D5E' if c == 'navy' else '#3574BA'
        out.append(f'<path d="M{" L".join("%g %g" % q for q in p)} Z" style="stroke:var(--mk-{c},{fb})"/>')
    out.append('</g>'); return ''.join(out), (SX1 - SX0) * s
TOOLS = {'route': ('Route', '#B0127A', '#FF4FB4'), 'navigate': ('Navigate', '#0E7C86', '#3CCFD9')}
for key, (name, light, dark) in TOOLS.items():
    draw, wid, cap = outline(name)
    INK = 'style="fill:var(--mk-ink,#042D5E)"'; DOT = 'style="fill:var(--mk-dot,#3574BA)"'
    # stack: 120 x 100. Name fitted to 112 wide or 28 cap high, whichever is smaller; sails above it.
    s = min(112 / wid, 28 / cap); tw = wid * s; base = 93
    sg = sails((120 - 54 * (SX1 - SX0) / (SY1 - SY0)) / 2, 4, 56)[0]
    a, d = draw((120 - tw) / 2, base, s)
    stack = f'{sg}<path d="{a}" {INK}/><path d="{d}" {DOT}/>'
    # row: height 60. Sails 52 high on the left, name 26 cap high beside it, on the sails' foot line.
    s2 = 26 / cap; tw2 = wid * s2; sg2, sw2 = sails(3, 4, 52); x2 = 3 + sw2 + 9; W = round(x2 + tw2 + 4)
    a2, d2 = draw(x2, 47, s2)
    row = f'{sg2}<path d="{a2}" {INK}/><path d="{d2}" {DOT}/>'
    desc = (f'FirstShift {name}: the sails and the name. Two layouts, stack (120 x 100) and row ({W} x 60). '
            'Colours: --mk-navy, --mk-blue, --mk-ink and --mk-dot (the full stop, as the landing page); fallbacks are the light theme. '
            'Made by tools/make_marks.py from Space Grotesk 600 with the font kerning and -0.04 em tracking, as the landing page heading (SIL Open Font Licence).')
    master = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {120 + 20 + W} 100" width="{120 + 20 + W}" height="100">'
              f'<title>FirstShift {name}</title><desc>{desc}</desc>'
              f'<svg id="{key}-stack" x="0" y="0" width="120" height="100" viewBox="0 0 120 100">{stack}</svg>'
              f'<svg id="{key}-row" x="140" y="20" width="{W}" height="60" viewBox="0 0 {W} 60">{row}</svg></svg>\n')
    open(os.path.join(ROOT, f'{key}-mark.svg'), 'w').write(master)
    inc = (f'<svg class="mk mk-s" viewBox="0 0 120 100" aria-hidden="true">{stack}</svg>'
           f'<svg class="mk mk-r" viewBox="0 0 {W} 60" aria-hidden="true">{row}</svg>')
    open(os.path.join(ROOT, f'{key}-mark.inc.html'), 'w').write(inc)
    print(key, 'row width', W, 'name cap stack', round(cap * s, 1), 'bytes', len(master), len(inc))
