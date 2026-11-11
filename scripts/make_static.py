"""Make the static files for one race from the course library: course band, seabed depth (EMODnet), coastline, fleet.
Usage: python3 scripts/make_static.py fastnet
Writes static/<race>/static.json, emodnet-{full,lite}.wasm and -runs.json, coast.wasm. Depth: EMODnet DTM (CC BY 4.0)."""
import json, os, sys, gzip, io, time, urllib.request, numpy as np, tifffile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RACE = sys.argv[1]
lib = json.load(open(os.path.join(ROOT, 'site', 'courses', 'rorc.json')))
R = [r for r in lib['races'] + lib.get('regions', []) if r['id'] == RACE][0]
REGION = R.get('region')   # a whole sea area rather than one course: every point inside the box is routable
OUT = os.path.join(ROOT, 'static', RACE); os.makedirs(OUT, exist_ok=True)
KM = 111.2

# band polyline: the course with extra waypoints where the rhumb line would cross land; width per segment in nm
via = R.get('bandVia') or [[p['lat'], p['lon']] for p in [R['start']] + R['marks'] + [R['finish']]]
SEG = []
for i, (a, b) in enumerate(zip(via[:-1], via[1:])):
    K0 = np.cos(np.radians((a[0] + b[0]) / 2)); L = np.hypot((b[0] - a[0]) * 60, (b[1] - a[1]) * 60 * K0)
    near = i < R.get('bandNear', 2)   # the Solent legs stay narrow
    SEG.append((a, b, float(min(R.get('bandMax', 35), max(10.0 if near else R.get('bandMin', 25), 0.30 * L)))))
if REGION:
    s, n, w, e = REGION['s'], REGION['n'], REGION['w'], REGION['e']; K = np.cos(np.radians((s + n) / 2))
else:
    s = min(min(a[0], b[0]) - W / 60 for a, b, W in SEG) - 0.1; n = max(max(a[0], b[0]) + W / 60 for a, b, W in SEG) + 0.1
    K = np.cos(np.radians((s + n) / 2))
    w = min(min(a[1], b[1]) - W / 60 / K for a, b, W in SEG) - 0.1; e = max(max(a[1], b[1]) + W / 60 / K for a, b, W in SEG) + 0.1
box = dict(s=round(float(s), 3), n=round(float(n), 3), w=round(float(w), 3), e=round(float(e), 3)); print('box', box, 'segments', [(round(W), ) for *_, W in SEG])

def excess(LA, LO):
    if REGION: return np.full(np.shape(LA), -1.0)
    best = np.full(np.shape(LA), 1e9)
    for a, b, W in SEG:
        ax, ay = a[1] * 60 * K, a[0] * 60; bx, by = b[1] * 60 * K, b[0] * 60; px, py = LO * 60 * K, LA * 60
        dx, dy = bx - ax, by - ay; u = np.clip(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1)
        best = np.minimum(best, np.hypot(px - ax - u * dx, py - ay - u * dy) - W)
    return best

# ---- EMODnet depth in strips of longitude, pooled to 1/480 degree (about 230 m north-south) ----
STEP = 2   # native 1/960 pooled by 2
def get(url, tries=5):
    for k in range(tries):
        try: return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'FirstShift-Route'}), timeout=300).read()
        except Exception as ex: err = ex; print('retry', ex, flush=True); time.sleep(10 * (k + 1))
    raise err
def strip(w0, w1):
    u = ('https://ows.emodnet-bathymetry.eu/wcs?service=WCS&version=2.0.1&request=GetCoverage&coverageId=emodnet__mean&format=image/tiff'
         f'&subset=Lat({s},{n})&subset=Long({w0},{w1})')
    a = tifffile.imread(io.BytesIO(get(u))).astype('f4'); a = np.where(np.abs(a) > 1e4, np.nan, a)
    a = a[: a.shape[0] // STEP * STEP, : a.shape[1] // STEP * STEP]
    return np.nanmax(a.reshape(a.shape[0] // STEP, STEP, a.shape[1] // STEP, STEP), axis=(1, 3))
edges = np.arange(np.floor(w * 4) / 4, e + 1.5, 1.5); parts = []
for w0, w1 in zip(edges[:-1], edges[1:]):
    p = strip(w0, w1); parts.append(p); print('depth strip', w0, w1, p.shape, flush=True)
ny = min(p.shape[0] for p in parts); g = np.concatenate([p[:ny] for p in parts], axis=1)[::-1]   # row 0 = south
st = STEP / 960; lat0 = s + st / 2; lon0 = edges[0] + st / 2
print('depth grid', g.shape)

def pool(a, m):
    a = a[: a.shape[0] // m * m, : a.shape[1] // m * m].reshape(a.shape[0] // m, m, a.shape[1] // m, m); return np.nanmax(a, axis=(1, 3))
dep = {}
for v, m in (('full', 1), ('lite', 2)):
    gg = pool(g, m) if m > 1 else g; ss = st * m
    la = lat0 - st / 2 + ss / 2 + np.arange(gg.shape[0]) * ss; lo = lon0 - st / 2 + ss / 2 + np.arange(gg.shape[1]) * ss
    LA, LO = np.meshgrid(la, lo, indexing='ij'); ins = excess(LA, LO) <= 2
    cls = np.where(np.isnan(gg) | (gg > 0), 1, np.where(gg > -20, 0, 2))
    rows = []; vals = []; off = 0
    for y in range(len(la)):
        xs = np.where(ins[y])[0]; rr = []
        if len(xs):
            x0, x1 = xs[0], xs[-1]; x = x0
            while x <= x1:
                c = cls[y, x]; q = x
                while q + 1 <= x1 and cls[y, q + 1] == c: q += 1
                if c == 0: rr.append([int(x), int(q), int(off), 0]); vals.append(gg[y, x:q + 1]); off += int(q - x + 1)
                else: rr.append([int(x), int(q), 0, int(c)])
                x = q + 1
        rows.append(rr)
    qb = np.clip(np.rint(np.concatenate(vals) / 0.1), -32768, 32767).astype('<i2').tobytes() if vals else b''
    fn = f'emodnet-{v}.wasm'; open(f'{OUT}/{fn}', 'wb').write(qb)
    rj = json.dumps(rows, separators=(',', ':')); open(f'{OUT}/emodnet-{v}-runs.json', 'w').write(rj)
    dep[v] = dict(file=fn, runs=f'emodnet-{v}-runs.json', bytes=len(qb) + len(rj), gz=len(gzip.compress(qb, 6)) + len(gzip.compress(rj.encode(), 6)), lat0=float(la[0]), dlat=ss, ny=len(la), lon0=float(lo[0]), dlon=ss, nx=len(lo),
                  hours=None, z=dict(off=0, n=len(qb) // 2, scale=0.1), res_km=[round(ss * KM, 2), round(ss * KM * K, 2)], step_h=None, band=round(float(ins.mean()), 3))
    print('depth', v, dep[v]['gz'] / 1e6, 'MB gz')
depth = dict(kind='depth', id='emodnet', name='EMODnet seabed depth', note='shallower than 20 m and land only; deeper water marked deep', **dep)

# ---- coastline bitmap for the whole box, 1/120 degree ----
gc = pool(g, 4); land = (np.isnan(gc) | (gc > 0)).astype(np.uint8)
open(f'{OUT}/coast.wasm', 'wb').write(np.packbits(land.ravel()).tobytes())
cst = st * 4
coast = dict(file='coast.wasm', lat0=lat0 - st / 2 + cst / 2, dlat=cst, ny=land.shape[0], lon0=lon0 - st / 2 + cst / 2, dlon=cst, nx=land.shape[1], gz=len(gzip.compress(np.packbits(land.ravel()).tobytes(), 6)))

course = dict(name=R['name'], raceId=RACE, start=R['start'], marks=R['marks'], finish=R['finish'], hours=R.get('hours', 48),
              band=None if REGION else [[a[0], a[1], b[0], b[1], W] for a, b, W in SEG], region=REGION)
fleet = R.get('fleet', [])
json.dump(dict(depth=depth, coast=coast, course=course, fleet=fleet, nodes=via, box=box, fleet_note=R.get('fleetNote', '')), open(f'{OUT}/static.json', 'w'), separators=(',', ':'))
print('wrote', OUT)
