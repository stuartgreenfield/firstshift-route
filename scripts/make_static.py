"""Make the static files for one race from the course library: course band, seabed depth (EMODnet), coastline, fleet.
Usage: python3 scripts/make_static.py fastnet
Writes static/<race>/static.json, emodnet-{full,lite}.wasm and -runs.json, coast.wasm. Depth: EMODnet DTM (CC BY 4.0)."""
import json, os, sys, gzip, io, time, urllib.request, numpy as np, tifffile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RACE = sys.argv[1]
# coastRes (cells per degree, 480 by default): a whole-ocean area such as the Transatlantic takes 160 (about 700 m), or its coast file passes Cloudflare's 25 MB a file (25 Nov 2026)
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
DEPTH = R.get('depthSource', 'emodnet')
if DEPTH == 'etopo':
    # Outside EMODnet's European seas (21 Nov 2026, Sydney Hobart, F114): NOAA ETOPO 2022, 15 arc-second (1/240 degree, about 460 m
    # north-south), surface elevation, read from NOAA's THREDDS tiles (15 x 15 degree files named by their north-west corner)
    import netCDF4
    TD = 'https://www.ngdc.noaa.gov/thredds/fileServer/global/ETOPO2022/15s/15s_surface_elev_netcdf/'
    def tile(la, lo): return f"ETOPO_2022_v1_15s_{'N' if la >= 0 else 'S'}{abs(la):02d}{'E' if lo >= 0 else 'W'}{abs(lo):03d}_surface.nc"
    names = sorted({tile(int(15 * np.ceil(la / 15)), int(15 * np.floor(lo / 15))) for la in (s, n - 1e-6) for lo in (w, e - 1e-6)})
    LAs, LOs, Z = [], [], {}
    for nm in names:
        f = os.path.join(os.environ.get('FS_ETOPO_DIR', '/tmp'), nm)
        if not os.path.exists(f): open(f, 'wb').write(get(TD + nm))
        ds = netCDF4.Dataset(f); la = np.array(ds['lat'][:]); lo = np.array(ds['lon'][:]); Z[nm] = (la, lo, ds['z'])
    st = 1 / 240; la_g = np.arange(np.floor(s * 240) / 240 + st / 2, n, st); lo_g = np.arange(np.floor(w * 240) / 240 + st / 2, e, st)
    g = np.full((len(la_g), len(lo_g)), np.nan, 'f4')
    for nm, (la, lo, z) in Z.items():
        iy = np.where((la >= la_g[0] - st / 4) & (la <= la_g[-1] + st / 4))[0]; ix = np.where((lo >= lo_g[0] - st / 4) & (lo <= lo_g[-1] + st / 4))[0]
        if not len(iy) or not len(ix): continue
        blk = np.array(z[iy[0]:iy[-1] + 1, ix[0]:ix[-1] + 1], 'f4')
        lsel = la[iy]
        if lsel[0] > lsel[-1]: blk = blk[::-1]; lsel = lsel[::-1]   # rows south first
        ry = int(np.searchsorted(la_g, lsel[0] - st / 4)); rx = int(np.searchsorted(lo_g, lo[ix][0] - st / 4))
        hy = min(len(iy), len(la_g) - ry); hx = min(len(ix), len(lo_g) - rx)
        g[ry:ry + hy, rx:rx + hx] = blk[:hy, :hx]
    lat0 = la_g[0]; lon0 = lo_g[0]; STEP = 4   # so the coast (st * 4 below, 1/60) is replaced by the OSM coast at 1/480
    print('depth grid (ETOPO 2022 15s)', g.shape, 'tiles', names, flush=True)
    if R.get('coastSource') == 'osm':
        # coastline from OpenStreetMap's land polygons (osmdata.openstreetmap.de, ODbL), drawn at 1/480 degree (about 230 m): finer than the depth grid
        import shapefile, rasterio.features, rasterio.transform, zipfile
        zf = os.environ.get('FS_OSM_LAND', '/tmp/land-polygons-split-4326.zip')
        if not os.path.exists(zf): open(zf, 'wb').write(get('https://osmdata.openstreetmap.de/download/land-polygons-split-4326.zip'))
        z = zipfile.ZipFile(zf); base = [x for x in z.namelist() if x.endswith('.shp')][0][:-4]
        sf = shapefile.Reader(shp=z.open(base + '.shp'), shx=z.open(base + '.shx'), dbf=z.open(base + '.dbf'))
        cst = 1 / R.get('coastRes', 480); ny_c = int(round((n - s) / cst)); nx_c = int(round((e - w) / cst))
        tr = rasterio.transform.from_origin(w, n, cst, cst); LAND = np.zeros((ny_c, nx_c), 'uint8'); nsh = 0
        # every ring is filled on its own and laid on with exclusive-or (the even-odd rule), so a hole is water whichever way
        # its ring runs; the first build (21 Nov 15:16) closed Sydney Harbour, read as land through the shapes' own ring order
        for shp in sf.iterShapes():
            b = shp.bbox
            if b[2] < w or b[0] > e or b[3] < s or b[1] > n: continue
            nsh += 1; pts = shp.points; parts = list(shp.parts) + [len(pts)]
            for k in range(len(parts) - 1):
                ring = pts[parts[k]:parts[k + 1]]
                if len(ring) < 3: continue
                m = rasterio.features.rasterize([({'type': 'Polygon', 'coordinates': [ring]}, 1)], out_shape=(ny_c, nx_c), transform=tr, fill=0, dtype='uint8')
                LAND ^= m
        LAND = LAND[::-1].copy(); shapes = range(nsh)   # row 0 = south
        # OpenStreetMap closes some harbours and estuaries across the mouth (the coastline crosses the entrance and the water inside
        # is mapped as a lake or river): Sydney Harbour came out as land (21 Nov). Where the seabed survey in ETOPO is clearly below
        # sea level (deeper than 5 m), the cell is water whatever the land polygons say.
        cla = s + cst / 2 + np.arange(ny_c) * cst; clo = w + cst / 2 + np.arange(nx_c) * cst
        gy = np.clip(np.rint((cla - lat0) / st).astype(int), 0, g.shape[0] - 1); gx = np.clip(np.rint((clo - lon0) / st).astype(int), 0, g.shape[1] - 1)
        deep = g[np.ix_(gy, gx)] < -5; opened = int((LAND.astype(bool) & deep).sum()); LAND[deep] = 0
        print('coast: water from the depth survey inside closed harbours', opened, 'cells', flush=True)
        for nm, la, lo in (('Sydney Harbour off Shark Island', -33.852, 151.257), ('Mark X off South Head', -33.82861, 151.28056), ('Port Jackson entrance', -33.832, 151.29), ('Derwent off Battery Point', -42.887, 147.342)):
            if not (s < la < n and w < lo < e): continue   # the Sydney checks only inside their own area (25 Nov: the new areas failed here)
            y = int((la - s) / cst); x = int((lo - w) / cst); print('coast check', nm, 'land' if LAND[y, x] else 'water', 'land share round it', round(float(LAND[y - 5:y + 6, x - 5:x + 6].mean()), 2), flush=True)
        print('coast (OSM land polygons)', LAND.shape, len(shapes), 'polygons', flush=True)
        # the depth grid takes land from the OSM coast too, so the two always agree
        fy = (lat0 - (s + cst / 2)) / cst; fx = (lon0 - (w + cst / 2)) / cst
        yy = np.clip(np.rint(fy + np.arange(g.shape[0]) * 2).astype(int), 0, ny_c - 1); xx = np.clip(np.rint(fx + np.arange(g.shape[1]) * 2).astype(int), 0, nx_c - 1)
        g = np.where(LAND[np.ix_(yy, xx)] > 0, np.where(g > 0, g, 1.0), np.where(g > 0, -1.0, g))   # water in OSM stays water (at least 1 m)
else:
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
depth = dict(kind='depth', id='emodnet', name='EMODnet seabed depth' if DEPTH != 'etopo' else 'ETOPO 2022 seabed depth (NOAA)', note='shallower than 20 m and land only; deeper water marked deep', **dep)

# ---- coastline bitmap for the whole box, 1/120 degree ----
if DEPTH == 'etopo' and R.get('coastSource') == 'osm':
    land = LAND; cst = 1 / R.get('coastRes', 480); clat0 = s + cst / 2; clon0 = w + cst / 2
else:
    gc = pool(g, 4); land = (np.isnan(gc) | (gc > 0)).astype(np.uint8); cst = st * 4; clat0 = lat0 - st / 2 + cst / 2; clon0 = lon0 - st / 2 + cst / 2
open(f'{OUT}/coast.wasm', 'wb').write(np.packbits(land.ravel()).tobytes())
coast = dict(file='coast.wasm', lat0=clat0, dlat=cst, ny=land.shape[0], lon0=clon0, dlon=cst, nx=land.shape[1], gz=len(gzip.compress(np.packbits(land.ravel()).tobytes(), 6)))

course = dict(name=R['name'], raceId=RACE, start=R['start'], marks=R['marks'], finish=R['finish'], hours=R.get('hours', 48),
              band=None if REGION else [[a[0], a[1], b[0], b[1], W] for a, b, W in SEG], region=REGION)
fleet = R.get('fleet', [])
json.dump(dict(depth=depth, coast=coast, course=course, fleet=fleet, nodes=via, box=box, fleet_note=R.get('fleetNote', '')), open(f'{OUT}/static.json', 'w'), separators=(',', ':'))
print('wrote', OUT)
