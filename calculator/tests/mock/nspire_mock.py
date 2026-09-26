"""A mock TI-Nspire Lua environment (enough of the API for the solver) that records drawing to SVG.

    app = NspireApp(open('app.lua').read())
    app.key('charIn', '1'); app.key('enterKey'); app.key('arrowKey', 'down')
    svg = app.svg()          # what the 318 x 212 screen shows now

Font metrics: Arial widths (fontw.json); TI "sansserif" size s is drawn at about 1.1*s px.
"""
import os, sys, json, html
HERE = os.path.dirname(os.path.abspath(__file__))
PYLIB = os.environ.get("PYLIB", "/tmp/claude-0/-home-user-erik/c6dd69b7-6607-5615-be58-03b366b184b4/scratchpad/tns/pylib")
sys.path.insert(0, PYLIB)
import lupa.lua51 as L51

W = json.load(open(os.path.join(HERE, 'fontw.json')))
PX = 1.1          # font px per TI point
ASC = 0.905       # Arial ascent / em
DESC = 0.212

def text_width(s, size, style):
    tab = W['bold'] if 'b' in (style or '') else W['normal']
    fpx = size * PX
    return sum(tab.get(ch, 560.0) for ch in s) * fpx / 1000.0

MOCK = r'''
__ops = {}
local function op(...) __ops[#__ops + 1] = {...} end
local cur = { "sansserif", "r", 10 }
gc = {}
function gc:setFont(f, s, z) cur = { f, s, z }; op("font", f, s, z) end
function gc:setColorRGB(r, g, b) if g == nil then local v = r; r = math.floor(v / 65536) % 256; g = math.floor(v / 256) % 256; b = v % 256 end; op("color", r, g, b) end
function gc:drawString(s, x, y, v) op("text", tostring(s), x, y, v or "baseline") end
function gc:fillRect(x, y, w, h) op("fill", x, y, w, h) end
function gc:drawRect(x, y, w, h) op("rect", x, y, w, h) end
function gc:drawLine(x1, y1, x2, y2) op("line", x1, y1, x2, y2) end
function gc:fillPolygon(t) op("poly", table.concat(t, ",")) end
function gc:drawPolyLine(t) op("pline", table.concat(t, ",")) end
function gc:fillArc(x, y, w, h, a, b) op("farc", x, y, w, h, a, b) end
function gc:drawArc(x, y, w, h, a, b) op("arc", x, y, w, h, a, b) end
function gc:setPen(t, s) op("pen", t, s) end
function gc:clipRect(...) end
function gc:getStringWidth(s) return __measure(tostring(s), cur[3], cur[2]) end
function gc:getStringHeight(s) return math.floor(cur[3] * 1.1 * 1.15 + 0.5) end
__invalidated = 0
platform = { window = { invalidate = function() __invalidated = __invalidated + 1 end,
                        width = function() return 318 end, height = function() return 212 end,
                        setFocus = function() end },
             apilevel = "2.0", hw = function() return 7 end, isDeviceModeRendering = function() return true end }
on = {}
__vars = {}
var = { store = function(n, v) __vars[n] = v end, recall = function(n) return __vars[n] end, list = function() return {} end, monitor = function() end }
timer = { start = function() end, stop = function() end, getMilliSecCounter = function() return 0 end }
cursor = { set = function() end, show = function() end, hide = function() end }
toolpalette = { register = function() end, enable = function() end, enableCopy = function() end, enablePaste = function() end }
clipboard = { addText = function(t) __clip = t end, getText = function() return __clip end }
document = { markChanged = function() end }
'''

class NspireApp:
    def __init__(self, source, w=318, h=212):
        self.lua = L51.LuaRuntime(unpack_returned_tuples=True)
        self.lua.globals()['__measure'] = lambda s, z, st: text_width(s, z, st)
        self.lua.execute(MOCK)
        self.w, self.h = w, h
        # load the app (a syntax error raises here)
        fn = self.lua.eval('function(src) local f, err = loadstring(src, "=app") if not f then error(err) end return f end')(source)
        fn()
        on = self.lua.globals().on
        if on.resize: on.resize(w, h)
        if on.construction: on.construction()

    def key(self, name, *args):
        f = self.lua.globals().on[name]
        if f is None:
            raise KeyError('app has no on.' + name)
        f(*args)

    def type(self, text):
        for ch in text:
            if ch == '\n': self.key('enterKey')
            else: self.key('charIn', ch)

    def ops(self):
        self.lua.execute('__ops = {}')
        gc = self.lua.globals().gc
        self.lua.globals().on.paint(gc)
        out = []
        for t in self.lua.globals()['__ops'].values():
            out.append([t[i] for i in range(1, len(t) + 1)])
        return out

    def svg(self, scale=3):
        ops = self.ops()
        w, h = self.w, self.h
        parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{w*scale}" height="{h*scale}" viewBox="0 0 {w} {h}" '
                 f'style="background:#fff;font-family:Arial,Liberation Sans,sans-serif" shape-rendering="crispEdges">',
                 f'<rect width="{w}" height="{h}" fill="#fff"/>']
        col = '#000'; font = ('sansserif', 'r', 10); texts = []
        for o in ops:
            k = o[0]
            if k == 'color': col = '#%02x%02x%02x' % (int(o[1]) & 255, int(o[2]) & 255, int(o[3]) & 255)
            elif k == 'font': font = (o[1], o[2], o[3])
            elif k == 'fill': parts.append(f'<rect x="{o[1]}" y="{o[2]}" width="{max(0,o[3])}" height="{max(0,o[4])}" fill="{col}"/>')
            elif k == 'rect': parts.append(f'<rect x="{o[1]+0.5}" y="{o[2]+0.5}" width="{max(0,o[3])}" height="{max(0,o[4])}" fill="none" stroke="{col}" stroke-width="1"/>')
            elif k == 'line': parts.append(f'<line x1="{o[1]+0.5}" y1="{o[2]+0.5}" x2="{o[3]+0.5}" y2="{o[4]+0.5}" stroke="{col}" stroke-width="1"/>')
            elif k == 'poly':
                pts = [float(x) for x in str(o[1]).split(',') if x != '']
                parts.append('<polygon points="%s" fill="%s"/>' % (' '.join('%g,%g' % (pts[i], pts[i+1]) for i in range(0, len(pts)-1, 2)), col))
            elif k == 'text':
                s, x, y, v = o[1], o[2], o[3], o[4]
                size = font[2] or 10; fpx = size * PX
                if v == 'top': by = y + ASC * fpx
                elif v == 'middle': by = y + (ASC - DESC) * fpx / 2
                elif v == 'bottom': by = y - DESC * fpx
                else: by = y
                wt = 'bold' if 'b' in (font[1] or '') else 'normal'
                it = 'italic' if 'i' in (font[1] or '') else 'normal'
                parts.append(f'<text x="{x}" y="{by:.1f}" font-size="{fpx:.2f}" font-weight="{wt}" font-style="{it}" fill="{col}" xml:space="preserve">{html.escape(str(s))}</text>')
        parts.append('</svg>')
        return ''.join(parts)

def render_pngs(svgs, out_dir, prefix='f'):
    """Screenshot SVG strings to PNG files with Playwright (node)."""
    os.makedirs(out_dir, exist_ok=True)
    tmp = os.path.join(out_dir, '_frames.json')
    json.dump([[os.path.join(out_dir, f'{prefix}{i:02d}.png'), s] for i, s in enumerate(svgs)], open(tmp, 'w'))
    np = os.environ.get('NODE_PATH', '/tmp/claude-0/-home-user-erik/c6dd69b7-6607-5615-be58-03b366b184b4/scratchpad/pw/node_modules')
    os.system(f'cd {HERE} && NODE_PATH={np} node render_frames.js {tmp}')
    os.remove(tmp)
