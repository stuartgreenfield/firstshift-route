"""Stage 3b pack: forecasts cut to the race.
1. Course band: only grid cells within W nm of the course, W = max(10, 30% of the leg) plus one grid cell of margin.
2. Time cut: from an hour before the first start to 1.4 x the slowest routed finish.
3. Depth as outlines: inside the band, only land and water shallower than 20 m are stored; deeper water is just 'deep'.
4. Overview: ECMWF at 1 degree over north-west Europe for the big picture.
Storage: each row of the grid keeps one run of cells [x0, x1, offset]; depth rows keep typed runs (values, land, deep)."""
import json, os, re, gzip, numpy as np, tifffile
D = os.path.join(os.path.dirname(__file__), 'data'); OUT = os.path.join(os.path.dirname(__file__), 'app', 'pack'); os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.endswith('.wasm'): os.remove(os.path.join(OUT, f))
T0 = float(np.load(f'{D}/ecmwf.npz')['t0']); KM = 111.2; K = np.cos(np.radians(50.1))
S = json.load(open('/home/claude/routing/cervantes/data/setup.json'))
nodes = [(n['lat'], n['lon'], n.get('name')) for n in S['course']['nodes']]

# ---- course band ----
def nm(a, b): return np.hypot((b[0] - a[0]) * 60, (b[1] - a[1]) * 60 * K)
legs, cur = [], [nodes[0]]
for n in nodes[1:]:
    cur.append(n)
    if n[2]: legs.append(cur); cur = [n]
SEG = []
for lg in legs:
    L = sum(nm(lg[i], lg[i + 1]) for i in range(len(lg) - 1)); W = max(10.0, 0.30 * L)
    for i in range(len(lg) - 1): SEG.append((lg[i], lg[i + 1], W))
print('legs', [(l[0][2], l[-1][2], round(sum(nm(l[i], l[i + 1]) for i in range(len(l) - 1)), 1)) for l in legs])
def excess(LA, LO):
    """distance outside the band (nm); <= 0 means inside"""
    best = np.full(np.shape(LA), 1e9)
    for a, b, W in SEG:
        ax, ay = a[1] * 60 * K, a[0] * 60; bx, by = b[1] * 60 * K, b[0] * 60; px, py = LO * 60 * K, LA * 60
        dx, dy = bx - ax, by - ay; u = np.clip(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1)
        best = np.minimum(best, np.hypot(px - ax - u * dx, py - ay - u * dy) - W)
    return best

# ---- time cut ----
R = json.load(open('/tmp/claude-0/routes.json')) if os.path.exists('/tmp/claude-0/routes.json') else {}
slow = max([v['fin'] - 5 for v in R.values()] or [26.0])   # 26.0 h: slowest routed (Met Office Global, TCC 0.95), measured 10 Nov
starts = sorted(set(t['start'] for t in S['teams'] if t.get('start')))
h0 = max(0, int(np.floor((min(starts) - T0) / 3600 - 1))); h1 = min(48, int(np.ceil((min(starts) - T0) / 3600 + 1.4 * slow)))
print('time window', h0, h1, 'h after the run; slowest routed', round(slow, 1), 'h')

def runs_for(la, lo, pad_nm):
    LA, LO = np.meshgrid(la, lo, indexing='ij'); ins = excess(LA, LO) <= pad_nm
    rows = []; off = 0
    for y in range(len(la)):
        xs = np.where(ins[y])[0]
        if len(xs): rows.append([int(xs[0]), int(xs[-1]), off]); off += int(xs[-1] - xs[0] + 1)
        else: rows.append(None)
    return rows, off, ins

def pack_layer(lid, v, la, lo, hours, fields, scale, cell_nm):
    keep = [i for i, h in enumerate(hours) if h0 - 3 <= h <= h1 + 3]   # one step either side for interpolation
    hours = [float(hours[i]) for i in keep]
    rows, n, ins = runs_for(la, lo, cell_nm * 1.5)
    buf = bytearray(); idx = {}
    for k, arr in fields.items():
        a = np.asarray(arr, 'f4')[keep]; parts = []
        for t in range(a.shape[0]):
            for y, r in enumerate(rows):
                if r: parts.append(a[t, y, r[0]:r[1] + 1])
        q = np.concatenate(parts) / scale[k]
        q = np.clip(np.rint(np.nan_to_num(q, nan=-32768)), -32768, 32767).astype('<i2')
        idx[k] = dict(off=len(buf), n=int(q.size), scale=scale[k]); buf.extend(q.tobytes())
    fn = f'{lid}-{v}.wasm'; open(f'{OUT}/{fn}', 'wb').write(bytes(buf))
    dlat = float((la[-1] - la[0]) / (len(la) - 1)); dlon = float((lo[-1] - lo[0]) / (len(lo) - 1))
    return dict(file=fn, bytes=len(buf), gz=len(gzip.compress(bytes(buf), 6)), lat0=float(la[0]), dlat=dlat, ny=len(la), lon0=float(lo[0]), dlon=dlon, nx=len(lo),
                hours=hours, rows=rows, plane=n, res_km=[round(dlat * KM, 2), round(dlon * KM * 0.64, 2)], step_h=float(np.median(np.diff(hours))) if len(hours) > 1 else None, band=round(float(ins.mean()), 3), **idx), (len(la) * len(lo) * len(fields) * 2 * 49)

def thin(z, keys, sp=1, every=1):
    hrs = z['hours']; keep = np.array([i for i, h in enumerate(hrs) if round(h) % every == 0])
    return z['lat'][::sp], z['lon'][::sp], hrs[keep], {k: z[k][keep][:, ::sp, ::sp] for k in keys}

layers = []; before = after = 0
def add(kind, k, name, note, z, keys, sc, sp, ev):
    global before, after
    cell = lambda la, lo: max(abs(la[1] - la[0]) * 60, abs(lo[1] - lo[0]) * 60 * K)
    full, b0 = pack_layer(k, 'full', z['lat'], z['lon'], z['hours'], {q: z[q] for q in keys}, sc, cell(z['lat'], z['lon']))
    la, lo, h, f = thin(z, keys, sp, ev); lite, _ = pack_layer(k, 'lite', la, lo, h, f, sc, cell(la, lo))
    old = len(gzip.compress(np.asarray([z[q] for q in keys], 'f4').astype('<f2').tobytes(), 6))
    layers.append(dict(kind=kind, id=k, name=name, note=note, full=full, lite=lite)); before += b0; after += full['bytes']
for k, name, note, sp, ev in [('ukv', 'Met Office UKV', 'UK 2 km model, hourly', 2, 3), ('ecmwf', 'ECMWF IFS', 'global 9 km model', 1, 6), ('gfs', 'NOAA GFS', 'global 0.25°', 1, 3),
                               ('aifs', 'ECMWF AIFS', 'AI model, 6-hourly', 1, 6), ('mog', 'Met Office Global', 'global 10 km model', 1, 6)]:
    add('wind', k, name, note, np.load(f'{D}/{k}.npz'), ['u', 'v'], dict(u=0.01, v=0.01), sp, ev)
for k, name, note in [('nwscur', 'Copernicus NW Shelf', 'tidal streams, 1.5 km hourly'), ('ibicur', 'Copernicus Iberia-Biscay-Ireland', 'tidal streams, 3 km hourly')]:
    add('tide', k, name, note, np.load(f'{D}/{k}.npz'), ['u', 'v'], dict(u=0.001, v=0.001), 2, 1)
for k, name, note, sp in [('nwswav', 'Copernicus NW Shelf waves', 'height, direction, period; 1.5 km hourly', 3), ('ecwav', 'ECMWF waves', '0.25°, 3-hourly', 1)]:
    z = dict(np.load(f'{D}/{k}.npz'))
    for q in ('hs', 'dir', 'tp'): z[q] = np.where(z[q] > 1000, np.nan, z[q])
    add('wave', k, name, note, z, ['hs', 'dir', 'tp'], dict(hs=0.01, dir=0.1, tp=0.01), sp, 3)

# ---- depth as outlines: typed runs per row ----
a = tifffile.imread(f'{D}/emodnet.tif').astype('f4')[::-1]; a = np.where(np.abs(a) > 1e4, np.nan, a)
def pool(a, n):
    a = a[: a.shape[0] // n * n, : a.shape[1] // n * n].reshape(a.shape[0] // n, n, a.shape[1] // n, n); return np.nanmax(a, axis=(1, 3))
dep = {}
for v, n in (('full', 2), ('lite', 4)):
    g = pool(a, n); st = n / 960
    la = 49.2 + st / 2 + np.arange(g.shape[0]) * st; lo = -2.3 + st / 2 + np.arange(g.shape[1]) * st
    LA, LO = np.meshgrid(la, lo, indexing='ij'); ins = excess(LA, LO) <= 2
    cls = np.where(np.isnan(g) | (g > 0), 1, np.where(g > -20, 0, 2))     # 0 shallow values, 1 land, 2 deep
    rows = []; vals = []; off = 0
    for y in range(len(la)):
        xs = np.where(ins[y])[0]; rr = []
        if len(xs):
            x0, x1 = xs[0], xs[-1]; x = x0
            while x <= x1:
                c = cls[y, x]; e = x
                while e + 1 <= x1 and cls[y, e + 1] == c: e += 1
                if c == 0: rr.append([int(x), int(e), int(off), 0]); vals.append(g[y, x:e + 1]); off += int(e - x + 1)
                else: rr.append([int(x), int(e), 0, int(c)])
                x = e + 1
        rows.append(rr)
    q = np.clip(np.rint(np.concatenate(vals) / 0.1), -32768, 32767).astype('<i2').tobytes()
    fn = f'emodnet-{v}.wasm'; open(f'{OUT}/{fn}', 'wb').write(q)
    rj = json.dumps(rows, separators=(',', ':')); open(f'{OUT}/emodnet-{v}-runs.json', 'w').write(rj)
    dep[v] = dict(file=fn, runs=f'emodnet-{v}-runs.json', bytes=len(q) + len(rj), gz=len(gzip.compress(q, 6)) + len(gzip.compress(rj.encode(), 6)), lat0=float(la[0]), dlat=st, ny=len(la), lon0=float(lo[0]), dlon=st, nx=len(lo),
                  hours=None, z=dict(off=0, n=len(q) // 2, scale=0.1), res_km=[round(st * KM, 2), round(st * KM * 0.64, 2)], step_h=None, band=round(float(ins.mean()), 3))
# coastline for context outside the band: land bitmap at 1/120 degree for the whole box
gc = pool(a, 8); land = (np.isnan(gc) | (gc > 0)).astype(np.uint8)
open(f'{OUT}/coast.wasm', 'wb').write(np.packbits(land.ravel()).tobytes())
coast = dict(file='coast.wasm', lat0=49.2 + 4 / 960, dlat=8 / 960, ny=land.shape[0], lon0=-2.3 + 4 / 960, dlon=8 / 960, nx=land.shape[1], gz=len(gzip.compress(np.packbits(land.ravel()).tobytes(), 6)))
print('coast', land.shape, coast['gz'])
layers.append(dict(kind='depth', id='emodnet', name='EMODnet seabed depth', note='shallower than 20 m and land only; deeper water marked deep', **dep))

# ---- overview ----
z = np.load(f'{D}/overview.npz')
ov = dict(msl=(z['msl'] / 100).round(1), u=z['u'].round(1), v=z['v'].round(1))
buf = bytearray(); idx = {}
for k, sc in (('msl', 0.1), ('u', 0.01), ('v', 0.01)):
    q = np.clip(np.rint(np.asarray(z[k] if k != 'msl' else z['msl'] / 100) / sc), -32768, 32767).astype('<i2'); idx[k] = dict(off=len(buf), n=int(q.size), scale=sc); buf.extend(q.tobytes())
lsm = (z['lsm'] > 0.5).astype(np.uint8)
lsmb = np.packbits(lsm.ravel()).tobytes(); idx['lsm_off'] = len(buf); buf.extend(lsmb)
open(f'{OUT}/overview.wasm', 'wb').write(bytes(buf))
la, lo = z['lat'], z['lon']
overview = dict(file='overview.wasm', bytes=len(buf), gz=len(gzip.compress(bytes(buf), 6)), lat0=float(la[0]), dlat=float(la[1] - la[0]), ny=len(la), lon0=float(lo[0]), dlon=float(lo[1] - lo[0]), nx=len(lo),
                hours=[float(h) for h in z['hours']], lsm=dict(off=idx.pop('lsm_off'), lat0=float(z['lsm_lat'][0]), dlat=0.25, ny=lsm.shape[0], lon0=float(z['lsm_lon'][0]), dlon=0.25, nx=lsm.shape[1]), **idx,
                name='ECMWF overview, north-west Europe', note='1°, 6-hourly, 3 days: pressure and wind')

# ---- fleet and course ----
tags = {t['id']: t['name'] for t in S['tags']}
kml = open('/home/claude/routing/cervantes/data/cervantes2026.kml').read(); tracks = {}
for m in re.finditer(r'<ns2:Placemark>\s*<ns2:name>([^<]*)</ns2:name>.*?<gx:Track>(.*?)</gx:Track>', kml, re.S):
    nm_, body = m.group(1), m.group(2); ts = re.findall(r'<ns2:when>([^<]*)</ns2:when>', body); cs = re.findall(r'<gx:coord>([^<]*)</gx:coord>', body); pts = []; last = -1e9
    for t, c in zip(ts, cs):
        e = np.datetime64(t[:19]).astype('datetime64[s]').astype(int)
        if e - last >= 600: lo_, la_ = map(float, c.replace(',', ' ').split()[:2]); pts.append([int(e), round(la_, 4), round(lo_, 4)]); last = e
    tracks[nm_] = pts
fleet = [dict(name=t['name'], model=t.get('model'), tcc=float(t['tcf1'] or 1), start=t.get('start'), finish=t.get('finishedAt'), status=t.get('status'),
              cls=[tags[i] for i in t.get('tags', []) if i in tags and tags[i].startswith(('IRC ', 'Class', 'Multi')) and tags[i] != 'IRC Overall'], irc=80319 in t.get('tags', []), track=tracks.get(t['name'], [])) for t in S['teams']]
course = dict(name='RORC Cervantes Trophy', start=dict(name='Start, Cowes', lat=50.7769, lon=-1.3051), marks=[dict(name='Needles Fairway', lat=50.63733, lon=-1.64967)],
              finish=dict(name='Finish, Le Havre', lat=49.49673, lon=0.07658, radius_nm=0.4),
              band=[[a[0], a[1], b[0], b[1], W] for a, b, W in SEG], window=[h0, h1])
json.dump(dict(t0=T0, run='06:00 UTC, Sat 2 May 2026', made='Forecasts available before the 2026 start', layers=layers, overview=overview, coast=coast, fleet=fleet, course=course),
          open(f'{OUT}/pack.json', 'w'), separators=(',', ':'))
tot = lambda v: sum(L[v]['gz'] for L in layers)
for L in layers: print(f"{L['id']:8} full {L['full']['gz']/1e6:5.2f} MB gz (band {L['full'].get('band')}) | lite {L['lite']['gz']/1e6:5.2f} MB gz")
print('TOTAL full', round(tot('full') / 1e6, 2), 'MB  lite', round(tot('lite') / 1e6, 2), 'MB  overview', overview['gz'] / 1e3, 'kB  manifest', os.path.getsize(f'{OUT}/pack.json') / 1e3, 'kB')
