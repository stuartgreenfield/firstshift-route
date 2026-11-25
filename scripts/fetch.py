"""Stage 2 data fetch for one race window. Every source is free and needs no login.
Usage: python3 fetch.py <source> ...   sources: ecmwf aifs gfs ukv mog nwscur ibicur nwswav ecwav bathy
Writes data/<source>.npz with arrays cropped to the race box.
Wind: u, v (m/s) [t, y, x].  Currents: u, v (m/s).  Waves: hs (m), dir (deg from), tp (s).
"""
import json, os, sys, time, io, urllib.request, numpy as np

BOX = dict(s=49.2, n=51.0, w=-2.3, e=0.6)
# Forecast cycle from FS_RUN=YYYYMMDDHH (default: the 2026 Cervantes hindcast run)
_run = os.environ.get('FS_RUN', '2026050206')
RUN = _run[:8], _run[8:10]
T0 = np.datetime64(f'{_run[:4]}-{_run[4:6]}-{_run[6:8]}T{_run[8:10]}:00').astype('datetime64[s]').astype(float)
HOURS_LONG = list(range(0, int(os.environ.get('FS_HOURS', '48')) + 1))   # the global models (ECMWF, AIFS, GFS) run out to 10 days and more
HOURS = [h for h in HOURS_LONG if h <= 144]                                  # the regional models and tides stop well short of that
if os.environ.get('FS_BOX'):
    _b = [float(x) for x in os.environ['FS_BOX'].split(',')]; BOX = dict(s=_b[0], n=_b[1], w=_b[2], e=_b[3])
OUT = os.environ.get('FS_DATA', os.path.join(os.path.dirname(__file__), 'data')); os.makedirs(OUT, exist_ok=True)
CACHE = os.path.join(OUT, 'cache'); os.makedirs(CACHE, exist_ok=True)


ECMWF_S3 = 'https://ecmwf-forecasts.s3.eu-central-1.amazonaws.com'
ECMWF_MIRRORS = [ECMWF_S3, 'https://data.ecmwf.int/forecasts']   # same paths on both; ECMWF's own server takes over when S3 says slow down

STATS = {'n': 0, 'retry': 0, 'slow': 0.0, 'mirror': 0, 't': 0.0, 'why': {}}   # 21 Nov 2026: each source's log line says how many requests, retries and the slowest one
def get(u, rng=None, tries=8):
    # 21 Nov 2026 (the 08:19 UTC run waited 50 minutes on ECMWF): a request gives up after 30 s, not 120 s, and alternates between ECMWF's
    # Amazon mirror and its own server from the first retry, so one slow server costs seconds, not minutes
    import random
    for k in range(tries):
        t = time.time()
        try:
            url = u
            if u.startswith(ECMWF_S3) and k % 2 == 1: url = ECMWF_MIRRORS[1] + u[len(ECMWF_S3):]; STATS['mirror'] += 1
            rq = urllib.request.Request(url)
            if rng: rq.add_header('Range', f'bytes={rng[0]}-{rng[1]}')
            b = urllib.request.urlopen(rq, timeout=30 if u.startswith(ECMWF_S3) else 120).read()
            dt = time.time() - t; STATS['n'] += 1; STATS['t'] += dt; STATS['slow'] = max(STATS['slow'], dt); return b
        except Exception as e:
            err = e; STATS['retry'] += 1; w = str(getattr(e, 'code', '') or type(e).__name__); STATS['why'][w] = STATS['why'].get(w, 0) + 1
            if getattr(e, 'code', None) == 404 or (getattr(e, 'code', None) == 403 and 'cloudferro' in u): break   # not published (yet), or a Copernicus square that holds no sea: no point retrying
            time.sleep(1 + k + random.random() * 2)
    raise err
def stats_line(name):
    s = STATS; return f"{name}: {s['n']} requests, {s['retry']} retries, {s['mirror']} on the second server, average {s['t'] / max(1, s['n']):.2f} s, slowest {s['slow']:.1f} s" + (', retries for ' + ', '.join(f'{k} x{v}' for k, v in sorted(s['why'].items())) if s['why'] else '')


def cached(key, fn):
    p = os.path.join(CACHE, key.replace('/', '_') + '.npy')
    if os.path.exists(p): return np.load(p)
    a = fn(); np.save(p, a); return a


# ---------- GRIB (ECMWF open data, GFS) ----------
def grib_crop(buf, box=None):
    B_ = box or BOX
    import eccodes
    h = eccodes.codes_new_from_message(buf)
    ni, nj = eccodes.codes_get(h, 'Ni'), eccodes.codes_get(h, 'Nj')
    la1 = eccodes.codes_get(h, 'latitudeOfFirstGridPointInDegrees'); lo1 = eccodes.codes_get(h, 'longitudeOfFirstGridPointInDegrees')
    di = eccodes.codes_get(h, 'iDirectionIncrementInDegrees'); dj = eccodes.codes_get(h, 'jDirectionIncrementInDegrees')
    scan_neg = eccodes.codes_get(h, 'jScansPositively') == 0
    v = eccodes.codes_get_values(h).reshape(nj, ni); eccodes.codes_release(h)
    lat = la1 - np.arange(nj) * dj if scan_neg else la1 + np.arange(nj) * dj
    lon = (lo1 + np.arange(ni) * di + 180) % 360 - 180
    iy = np.where((lat >= B_['s'] - .3) & (lat <= B_['n'] + .3))[0]
    ix = np.where((lon >= B_['w'] - .3) & (lon <= B_['e'] + .3))[0]
    oy = np.argsort(lat[iy]); ox = np.argsort(lon[ix])
    return v[np.ix_(iy[oy], ix[ox])].astype('f4'), lat[iy][oy], lon[ix][ox]


def ecmwf(model='ifs', stream='scda', params=('10u', '10v'), step=1, opt=(), hires=False):
    # opt: extra fields kept only when every hour has them, so a missing one never costs the main fields (14 Nov 2026)
    base = 'https://ecmwf-forecasts.s3.eu-central-1.amazonaws.com'
    d, r = RUN
    # A (Stuart 20 Nov 23:15, "Go A"): ECMWF's 9 km (0.1 deg) data has been free and open since 20 Oct 2026, two hours behind real time.
    # The wind takes it when this run's first and last hours are already there (0p1/oper, every run); otherwise the 25 km files of the
    # SAME run, so the finer grid never costs a newer run. Cache keys carry the grid, so 9 km and 25 km never mix.
    want_h = [h for h in HOURS_LONG if h % step == 0 and (h <= 144 or h % 6 == 0)]
    res9 = False
    if hires and model == 'ifs' and want_h:
        def idx9(hh):
            try: return bool(get(f'{base}/{d}/{r}z/ifs/0p1/oper/{d}{r}0000-{hh}h-oper-fc-sfc.index', tries=2))
            except Exception: return False
        res9 = idx9(want_h[0]) and idx9(want_h[-1])
        print('ecmwf 9 km' if res9 else 'ecmwf 9 km not ready: 25 km of the same run', flush=True)
    # 21 Nov 2026: the hours and fields are fetched side by side (8 at a time), not one after another: ecmet is about 520 requests, which
    # took 8 minutes in turn on a good day and over 25 when ECMWF's server was slow. The result is the same, in the same order.
    from concurrent.futures import ThreadPoolExecutor
    out = {p: [] for p in params}; hrs = []; lat = lon = None; extra = {p: [] for p in opt}
    ck = ('9k' if res9 else '')
    stem_of = lambda hh: f'{d}/{r}z/ifs/0p1/oper/{d}{r}0000-{hh}h-oper-fc-sfc' if res9 else f'{d}/{r}z/{model}/0p25/{stream}/{d}{r}0000-{hh}h-{stream if model=="ifs" else "oper"}-fc'
    def index(hh):
        try: return hh, [json.loads(l) for l in get(f'{base}/{stem_of(hh)}.index', tries=2).decode().splitlines() if l.strip()]
        except Exception: return hh, None
    def field(hh, x, p, need):
        try: return cached(f'{model}{stream}{ck}{d}{r}_{hh}_{p}', lambda: grib_crop(get(f'{base}/{stem_of(hh)}.grib2', (x['_offset'], x['_offset'] + x['_length'] - 1)))[0])
        except Exception:
            if need: raise
            return None
    with ThreadPoolExecutor(8) as ex:
        idxs = dict(ex.map(lambda h: index(h), want_h))
        jobs = {}
        for hh in want_h:
            idx = idxs.get(hh)
            if not idx: continue
            mm = {p: [x for x in idx if x.get('param') == p] for p in params + tuple(opt)}
            if not all(mm[p] for p in params): continue
            for p in params: jobs[(hh, p)] = ex.submit(field, hh, mm[p][0], p, True)
            for p in opt: jobs[(hh, p)] = ex.submit(field, hh, mm[p][0], p, False) if mm[p] else None
        for hh in want_h:
            if (hh, params[0]) not in jobs: continue
            try: got = [jobs[(hh, p)].result() for p in params]
            except Exception: continue
            for p, a in zip(params, got): out[p].append(a)
            hrs.append(hh)
            for p in opt: extra[p].append(jobs[(hh, p)].result() if jobs[(hh, p)] else None)
        if hrs:
            x0 = [x for x in idxs[hrs[0]] if x.get('param') == params[0]][0]
            _, lat, lon = grib_crop(get(f'{base}/{stem_of(hrs[0])}.grib2', (x0['_offset'], x0['_offset'] + x0['_length'] - 1)))
    print(model, stream, len(hrs), 'hours', '|', stats_line(model + ' ' + stream), flush=True)
    res = {p: np.array(out[p][:len(hrs)]) for p in params}
    for p in opt:
        if len(extra[p]) == len(hrs) and all(a is not None for a in extra[p]): res[p] = np.array(extra[p])
    return res, np.array(hrs), lat, lon


def gfs():
    d, r = RUN; base = 'https://noaa-gfs-bdp-pds.s3.amazonaws.com'
    U = []; V = []; hrs = []; lat = lon = None
    for hh in [h for h in HOURS_LONG if h <= 48 or (h % 3 == 0 and h <= 120) or h % 6 == 0]:   # hourly for two days, then 3-hourly (GFS is hourly only to 120 h)
        f = f'{base}/gfs.{d}/{r}/atmos/gfs.t{r}z.pgrb2.0p25.f{hh:03d}'
        lines = get(f + '.idx', tries=3).decode().splitlines()
        got = {}
        for i, l in enumerate(lines):
            for name in ('UGRD:10 m above ground', 'VGRD:10 m above ground'):
                if name in l:
                    a = int(l.split(':')[1]); b = int(lines[i + 1].split(':')[1]) - 1
                    got[name[0]] = cached(f'gfs{d}{r}_{hh}_{name[0]}', lambda: grib_crop(get(f, (a, b)))[0])
                    if lat is None: _, lat, lon = grib_crop(get(f, (a, b)))
        U.append(got['U']); V.append(got['V']); hrs.append(hh); print('gfs', hh, end=' | ', flush=True)
    return dict(u=np.array(U), v=np.array(V)), np.array(hrs), lat, lon


# ---------- DWD ICON-EU (opendata.dwd.de, free, no login): 7 km Europe, hourly to 78 h then 3-hourly to 120 h ----------
SHARED = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'work', '_shared'); os.makedirs(SHARED, exist_ok=True)
AREA = dict(s=35.0, n=62.0, w=-15.5, e=12.5)   # the whole FirstShift area: one download serves every race
if not (BOX['s'] > 30 and BOX['w'] > -40 and BOX['e'] < 45): AREA = dict(BOX)   # outside Europe (21 Nov 2026, Sydney Hobart): the area's own box

def icon_eu():
    import bz2
    d, r = RUN; run = d + r; base = 'https://opendata.dwd.de/weather/nwp/icon-eu/grib'
    U = []; V = []; hrs = []; lat = lon = None
    # F5 (Stuart 25 Nov 2026): ICON-EU took 13 minutes, one file after another (two per hour, about 90 hours). The files are fetched
    # eight at a time now; DWD's open data server serves them in parallel. Same files, same cut, same order.
    hh_all = [h for h in HOURS if (h <= 78 or h % 3 == 0) and h <= 120]
    def one_file(job):
        hh, var = job; p = os.path.join(SHARED, f'icon_{run}_{hh:03d}_{var}.npz')
        if not os.path.exists(p):
            f = f'{base}/{r}/{var}/icon-eu_europe_regular-lat-lon_single-level_{run}_{hh:03d}_{var.upper()}.grib2.bz2'
            buf = bz2.decompress(get(f, tries=3))
            a, la, lo = grib_crop(buf, AREA)
            np.savez(p, a=a, la=la, lo=lo)
        return p
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(8) as ex: paths = list(ex.map(one_file, [(hh, var) for hh in hh_all for var in ('u_10m', 'v_10m')]))
    for k, hh in enumerate(hh_all):
        got = {}
        for j, var in enumerate(('u_10m', 'v_10m')):
            z = np.load(paths[2 * k + j]); la, lo = z['la'], z['lo']
            iy = np.where((la >= BOX['s'] - .3) & (la <= BOX['n'] + .3))[0]; ix = np.where((lo >= BOX['w'] - .3) & (lo <= BOX['e'] + .3))[0]
            got[var] = z['a'][np.ix_(iy, ix)]; lat, lon = la[iy], lo[ix]
        U.append(got['u_10m']); V.append(got['v_10m']); hrs.append(hh)
    print('icon', len(hrs), 'hours', flush=True)
    return dict(u=np.array(U), v=np.array(V)), np.array(hrs), lat, lon

def arome_one_hour(d, r, iso, hh):
    """Download one AROME 0.01 deg hour and keep its 10 m wind messages as GRIB; True if both are there."""
    import eccodes, tempfile
    tag = f'aromehd_{d}{r}_h{hh:03d}'
    if len(mf_raw('arome', tag)) == 2: return True
    try: buf = get(f'{MF}/{iso}/arome/001/SP1/arome__001__SP1__{hh:02d}H__{iso}.grib2', tries=3)
    except Exception: return False
    with tempfile.NamedTemporaryFile(suffix='.grib2') as tf:
        tf.write(buf); tf.flush()
        with open(tf.name, 'rb') as fh:
            while True:
                h = eccodes.codes_grib_new_from_file(fh)
                if h is None: break
                try:
                    sn = eccodes.codes_get(h, 'shortName')
                    if sn in ('10u', '10v'):
                        tmp = os.path.join(SHARED, f'{tag}_{sn}.part'); open(tmp, 'wb').write(eccodes.codes_get_message(h)); os.replace(tmp, os.path.join(SHARED, f'{tag}_{sn}.grib2'))
                finally: eccodes.codes_release(h)
    return len(mf_raw('arome', tag)) == 2

def arome_hd(d, r, iso):
    from concurrent.futures import ThreadPoolExecutor
    hrs = [h for h in HOURS if h <= 51]
    with ThreadPoolExecutor(6) as ex: ok = dict(zip(hrs, ex.map(lambda hh: arome_one_hour(d, r, iso, hh), hrs)))
    got = [h for h in hrs if ok[h]]; print('arome 0.01:', len(got), 'of', len(hrs), 'hours', flush=True)
    if os.environ.get('FS_RAW_ONLY'):   # the shared job only keeps the messages; each area cuts its own box
        if len(got) < 31: raise SystemExit('arome: too few hours')
        return None
    U = []; V = []; out_h = []; lat = lon = None
    for hh in got:
        mu, mv = mf_raw('arome', f'aromehd_{d}{r}_h{hh:03d}')
        u, la, lo = grib_crop(mu); v, _, _ = grib_crop(mv)
        if not u.size: continue
        U.append(u.astype(np.float32)); V.append(v.astype(np.float32)); out_h.append(hh); lat, lon = la, lo
    if not out_h: raise SystemExit('arome: nothing for this box')
    return dict(u=np.array(U), v=np.array(V)), np.array(out_h), lat, lon


# ---------- Meteo-France AROME (0.01 deg, about 1.1 km, hourly to 51 h) and ARPEGE (Europe, 0.1 deg, to 102 h): open data, no login ----------
# Stuart 24 Nov 2026 08:21 ("Go with arome and code now"; 07:52: the Solent needs much higher resolution for tide and wind): AROME moves
# from the 0.025 deg packages to the 0.01 deg ones (one file per hour, about 24 MB, out about 2 h after the run). Only the 10 m wind
# messages are kept, as GRIB, so the shared job's download serves every area job (fetch_shared.py, FS_RAW_ONLY) and an area cuts its own box.
MF = 'https://meteofrance-pnt.s3.rbx.io.cloud.ovh.net/pnt'
def mf_raw(model, tag):
    """The 10 m wind messages of one AROME hour, saved as GRIB in the shared folder by an earlier download (this job's or the shared job's)."""
    out = []
    for sn in ('10u', '10v'):
        f = os.path.join(SHARED, f'{tag}_{sn}.grib2')
        if os.path.exists(f): out.append(open(f, 'rb').read())
    return out
def meteofrance(model):
    import eccodes, tempfile
    d, r = RUN; iso = f'{d[:4]}-{d[4:6]}-{d[6:]}T{r}:00:00Z'
    if model == 'arome': return arome_hd(d, r, iso)
    groups = [(0, 12)] + [(a, min(a + 11, 102)) for a in range(13, 103, 12)]; name = lambda a, b: f'arpege/01/SP1/arpege__01__SP1__{a:03d}H{b:03d}H__{iso}.grib2'
    want = set(h for h in HOURS)
    got = {}
    for a, b in groups:
        if a > max(HOURS): break
        tag = f'{model}_{d}{r}_{a:03d}'
        done = os.path.join(SHARED, tag + '.done')
        if not os.path.exists(done):
            buf = get(f'{MF}/{iso}/{name(a, b)}', tries=3)
            with tempfile.NamedTemporaryFile(suffix='.grib2') as tf:
                tf.write(buf); tf.flush()
                with open(tf.name, 'rb') as fh:
                    while True:
                        h = eccodes.codes_grib_new_from_file(fh)
                        if h is None: break
                        try:
                            sn = eccodes.codes_get(h, 'shortName'); st = int(eccodes.codes_get(h, 'endStep'))
                            if sn in ('10u', '10v'):
                                msg = eccodes.codes_get_message(h)
                                global BOX
                                keep = BOX; BOX = AREA
                                try: arr, la, lo = grib_crop(msg)
                                finally: BOX = keep
                                np.savez(os.path.join(SHARED, f'{model}_{d}{r}_h{st:03d}_{sn}.npz'), a=arr, la=la, lo=lo)
                        finally: eccodes.codes_release(h)
            open(done, 'w').write('ok')
        print(model, f'{a}-{b}', end=' | ', flush=True)
    U = []; V = []; hrs = []; lat = lon = None
    for hh in sorted(want):
        pu = os.path.join(SHARED, f'{model}_{d}{r}_h{hh:03d}_10u.npz'); pv = pu.replace('_10u', '_10v')
        if not (os.path.exists(pu) and os.path.exists(pv)): continue
        zu, zv = np.load(pu), np.load(pv); la, lo = zu['la'], zu['lo']
        iy = np.where((la >= BOX['s'] - .3) & (la <= BOX['n'] + .3))[0]; ix = np.where((lo >= BOX['w'] - .3) & (lo <= BOX['e'] + .3))[0]
        if not len(iy) or not len(ix): continue
        U.append(zu['a'][np.ix_(iy, ix)]); V.append(zv['a'][np.ix_(iy, ix)]); hrs.append(hh); lat, lon = la[iy], lo[ix]
    if not hrs: raise SystemExit(f'{model}: nothing for this box')
    return dict(u=np.array(U), v=np.array(V)), np.array(hrs), lat, lon


# ---------- Met Office NetCDF on AWS ----------
def metoffice(model):
    import netCDF4
    d, r = RUN; base = 'https://met-office-atmospheric-model-data.s3-eu-west-2.amazonaws.com'
    S = []; D = []; hrs = []; grid = None
    step = 1 if model == 'uk-deterministic-2km' else 3
    for hh in HOURS[::step]:
        vt = (np.datetime64(f'{d[:4]}-{d[4:6]}-{d[6:]}T{r}:00') + np.timedelta64(hh, 'h')).astype(str).replace('-', '').replace(':', '')[:11] + '00Z'
        def one(var):
            def f():
                b = get(f'{base}/{model}/{d}T{r}00Z/{vt}-PT{hh:04d}H00M-{var}.nc')
                nc = netCDF4.Dataset('x', memory=b)
                v = [k for k in nc.variables if nc.variables[k].ndim == 2][0]
                a = np.array(nc.variables[v][:], 'f4')
                dims = nc.variables[v].dimensions
                ys = np.array(nc.variables[dims[0]][:]); xs = np.array(nc.variables[dims[1]][:])
                crs = None
                for k in nc.variables:
                    at = nc.variables[k].ncattrs()
                    if 'grid_mapping_name' in at: crs = {a_: str(nc.variables[k].getncattr(a_)) for a_ in at}
                nc.close()
                return a, ys, xs, crs
            return f
        try:
            a, ys, xs, crs = one('wind_speed_at_10m')(); b, _, _, _ = one('wind_direction_at_10m')()
        except Exception as e:
            print('miss', hh, e)
            if hrs and hh > hrs[-1] + 6: break   # past the end of this model's forecast
            continue
        if grid is None: grid = (ys, xs, crs)
        S.append(a); D.append(b); hrs.append(hh); print(model[:6], hh, end=' | ', flush=True)
    return np.array(S), np.array(D), np.array(hrs), grid


def regrid_mo(S, D, grid, res):
    """Project Met Office grid (lat-lon or Lambert equal area) to a regular lat-lon box."""
    ys, xs, crs = grid
    lat = np.arange(BOX['s'], BOX['n'] + 1e-6, res); lon = np.arange(BOX['w'], BOX['e'] + 1e-6, res)
    LO, LA = np.meshgrid(lon, lat)
    if crs and crs.get('grid_mapping_name') == 'lambert_azimuthal_equal_area':
        from pyproj import Proj
        p = Proj(proj='laea', lat_0=float(crs['latitude_of_projection_origin']), lon_0=float(crs['longitude_of_projection_origin']),
                 x_0=float(crs.get('false_easting', 0)), y_0=float(crs.get('false_northing', 0)), ellps='WGS84')
        X, Y = p(LO, LA)
        # Met Office UKV directions are relative to true north on this product
    else:
        X, Y = LO, LA
        if xs.max() > 180: X = X % 360
    fy = np.interp(Y, ys, np.arange(len(ys))); fx = np.interp(X, xs, np.arange(len(xs)))
    y0 = np.clip(np.floor(fy).astype(int), 0, len(ys) - 2); x0 = np.clip(np.floor(fx).astype(int), 0, len(xs) - 2)
    wy = fy - y0; wx = fx - x0
    def bil(a): return ((a[:, y0, x0] * (1 - wx) + a[:, y0, x0 + 1] * wx) * (1 - wy) + (a[:, y0 + 1, x0] * (1 - wx) + a[:, y0 + 1, x0 + 1] * wx) * wy)
    rad = np.radians(D)
    u = bil(-S * np.sin(rad)); v = bil(-S * np.cos(rad))
    return u.astype('f4'), v.astype('f4'), lat, lon


# ---------- Copernicus Marine public zarr ----------
def zarr(url, vars_, step_hours=1):
    import numcodecs
    md = json.loads(get(url + '/.zmetadata'))['metadata']
    dec = lambda b, dt: np.frombuffer(numcodecs.Blosc().decode(b), dtype=dt)
    import threading
    BLK, LK = {}, threading.Lock()
    def blk_get(key, dt):   # one download per block, shared by every hour that lies in it
        with LK:
            ev = BLK.get(key)
            if ev is None: ev = BLK[key] = [threading.Event(), None, None]; mine = True
            else: mine = False
        if mine:
            try: ev[1] = dec(get(key), dt)
            except Exception as e: ev[2] = e
            ev[0].set()
        else: ev[0].wait()
        if ev[2] is not None: raise ev[2]
        return ev[1]
    def coord(name):
        z = md[f'{name}/.zarray']; n = z['shape'][0]; c = z['chunks'][0]
        return np.concatenate([dec(get(f'{url}/{name}/{i}'), z['dtype']) for i in range((n + c - 1) // c)])[:n]
    lat = coord('latitude'); lon = coord('longitude'); times = coord('time')
    tu = md['time/.zattrs'].get('units', '')
    if tu.startswith('hours'): times = times * 3600 + np.datetime64(tu.split('since ')[1][:19]).astype('datetime64[s]').astype(float)
    elif tu.startswith('minutes'): times = times * 60 + np.datetime64(tu.split('since ')[1][:19]).astype('datetime64[s]').astype(float)
    want = T0 + np.array(HOURS[::step_hours]) * 3600
    idx = [int(np.argmin(np.abs(times - w))) for w in want]
    iy = np.where((lat >= BOX['s']) & (lat <= BOX['n']))[0]; ix = np.where((lon >= BOX['w']) & (lon <= BOX['e']))[0]
    out = {}
    for v in vars_:
        za = md[f'{v}/.zarray']; at = md[f'{v}/.zattrs']
        ch = za['chunks']; sh = za['shape']; fill = za.get('fill_value')
        sc = at.get('scale_factor', 1.0); off = at.get('add_offset', 0.0)
        arr = []
        for k, i in enumerate(idx):
            def f(i=i):   # i bound now: the hours are read later, side by side
                ny, nx = sh[-2], sh[-1]; cy, cx = ch[-2], ch[-1]
                full = np.full((ny, nx), np.nan, 'f4')
                for by in range(iy.min() // cy, iy.max() // cy + 1):
                    for bx in range(ix.min() // cx, ix.max() // cx + 1):
                        key = f'{url}/{v}/{i // ch[0]}.' + ('0.' if len(sh) == 4 else '') + f'{by}.{bx}'
                        raw = blk_get(key, za['dtype'])
                        blk = raw.reshape(ch)[i % ch[0]] if len(sh) == 3 else raw.reshape(ch)[i % ch[0], 0]
                        y1 = min(ny, (by + 1) * cy); x1 = min(nx, (bx + 1) * cx)
                        blk = blk[:y1 - by * cy, :x1 - bx * cx].astype('f4')
                        if fill is not None: blk = np.where(blk == fill, np.nan, blk)
                        full[by * cy:y1, bx * cx:x1] = blk * sc + off
                return full[np.ix_(iy, ix)]
            arr.append((url.split('/')[-2] + f'_{v}_{i}', f))
        # F5 (Stuart 25 Nov 2026): the Copernicus tides and waves took 7 to 10 minutes, one block after another. The hours are read eight at
        # a time, and a block that holds several hours is fetched once (blk_get), not once for each hour in it.
        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(8) as ex: arr = list(ex.map(lambda kf: cached(kf[0], kf[1]), arr))
        out[v] = np.array(arr); print(v, 'done', end=' | ', flush=True)
    return out, (want - T0) / 3600, lat[iy], lon[ix]


def zarr_geo(url, vars_, step_hours=1):
    """The same as zarr() for Copernicus's map-chunked copies (geoChunked: a long run of hours in each small square of the map), for a
    large area with many hours, where the hour-by-hour copy would fetch the same big map tiles over and over (21 Nov 2026, F114)."""
    import numcodecs
    md = json.loads(get(url + '/.zmetadata'))['metadata']
    dec = lambda b, dt: np.frombuffer(numcodecs.Blosc().decode(b), dtype=dt)
    def coord(name):
        z = md[f'{name}/.zarray']; n = z['shape'][0]; c = z['chunks'][0]
        return np.concatenate([dec(get(f'{url}/{name}/{i}'), z['dtype']) for i in range((n + c - 1) // c)])[:n]
    lat = coord('latitude'); lon = coord('longitude'); times = coord('time')
    tu = md['time/.zattrs'].get('units', '')
    if tu.startswith('hours'): times = times * 3600 + np.datetime64(tu.split('since ')[1][:19]).astype('datetime64[s]').astype(float)
    want = T0 + np.array(HOURS[::step_hours]) * 3600
    idx = np.array([int(np.argmin(np.abs(times - w))) for w in want])
    iy = np.where((lat >= BOX['s']) & (lat <= BOX['n']))[0]; ix = np.where((lon >= BOX['w']) & (lon <= BOX['e']))[0]
    out = {}
    for v in vars_:
        za = md[f'{v}/.zarray']; at = md[f'{v}/.zattrs']; ch = za['chunks']; sh = za['shape']; fill = za.get('fill_value')
        sc = at.get('scale_factor', 1.0); off = at.get('add_offset', 0.0); ct, cy, cx = ch[0], ch[-2], ch[-1]
        res = np.full((len(idx), len(iy), len(ix)), np.nan, 'f4')
        jobs = [(tc, by, bx) for tc in sorted(set(idx // ct)) for by in range(iy.min() // cy, iy.max() // cy + 1) for bx in range(ix.min() // cx, ix.max() // cx + 1)]
        def one(job):
            tc, by, bx = job; key = f'{url}/{v}/{tc}.' + ('0.' if len(sh) == 4 else '') + f'{by}.{bx}'
            def load():
                try: return dec(get(key, tries=2), za['dtype']).copy()
                except urllib.error.HTTPError as e:
                    if e.code in (403, 404): return np.full(ct * cy * cx, np.nan, 'f4')   # a square with no sea is not stored at all (all land)
                    raise
            raw = cached(url.split('/')[-2] + f'_g_{v}_{tc}_{by}_{bx}', load)
            nt = min(ct, sh[0] - tc * ct); blk = raw.reshape((ct, cy, cx) if len(sh) == 3 else (ct, 1, cy, cx))
            blk = blk if len(sh) == 3 else blk[:, 0]
            return tc, by, bx, blk[:nt]
        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(8) as ex:
            for tc, by, bx, blk in ex.map(one, jobs):
                sel = np.where(idx // ct == tc)[0]
                ys = np.where((iy >= by * cy) & (iy < (by + 1) * cy))[0]; xs = np.where((ix >= bx * cx) & (ix < (bx + 1) * cx))[0]
                if not len(sel) or not len(ys) or not len(xs): continue
                b = blk[np.ix_(idx[sel] - tc * ct, iy[ys] - by * cy, ix[xs] - bx * cx)].astype('f4')
                if fill is not None: b = np.where(b == fill, np.nan, b)
                res[np.ix_(sel, ys, xs)] = b * sc + off
        out[v] = res; print(v, 'done', len(jobs), 'map squares', end=' | ', flush=True)
    return out, (want - T0) / 3600, lat[iy], lon[ix]


CM = 'https://s3.waw3-1.cloudferro.com'
# Copernicus global ocean, 1/12 degree, hourly (21 Nov 2026, Sydney Hobart, F114): the ocean current (uo, vo, the East Australian
# Current) plus the tidal stream (utide, vtide); the wave drift in the merged total is left out, as a yacht does not ride with it
GLOCUR = f'{CM}/mdl-arco-geo-015/arco/GLOBAL_ANALYSISFORECAST_PHY_001_024/cmems_mod_glo_phy_anfc_merged-uv_PT1H-i_202211/geoChunked.zarr'
SOURCES = {
    'nwscur': (f'{CM}/mdl-arco-time-041/arco/NWSHELF_ANALYSISFORECAST_PHY_004_013/cmems_mod_nws_phy-cur_anfc_1.5km-2D_PT1H-i_202511/timeChunked.zarr', ['uo', 'vo']),
    'ibicur': (f'{CM}/mdl-arco-time-032/arco/IBI_ANALYSISFORECAST_PHY_005_001/cmems_mod_ibi_phy_anfc_0.027deg-2D_PT1H-m_202411/timeChunked.zarr', ['uo', 'vo']),
    'nwswav': (f'{CM}/mdl-arco-time-041/arco/NWSHELF_ANALYSISFORECAST_WAV_004_014/cmems_mod_nws_wav_anfc_1.5km_PT1H-i_202511/timeChunked.zarr', ['VHM0', 'VMDR', 'VTPK']),
}


def save(name, **k):
    np.savez_compressed(os.path.join(OUT, name + '.npz'), t0=T0, **k); print('\nsaved', name, {a: getattr(b, 'shape', b) for a, b in k.items() if hasattr(b, 'shape')})


def with_tail(fetch_one):
    """F2: an ECMWF 06Z or 18Z run ends at 144 h; for an area that needs more, the hours beyond come from the run 6 hours earlier
    (a 00Z or 12Z run), put on this run's clock. fetch_one() returns (fields, hours, lat, lon) for the current RUN and HOURS_LONG."""
    global RUN, HOURS_LONG
    o, h, la, lo = fetch_one()
    keep_run, keep_hl = RUN, HOURS_LONG
    t = time.mktime(time.strptime(RUN[0] + RUN[1], '%Y%m%d%H')) - time.timezone - 6 * 3600; pr = time.strftime('%Y%m%d%H', time.gmtime(t))
    last = float(h[-1]) if len(h) else 0
    try:
        RUN = (pr[:8], pr[8:]); HOURS_LONG = [x + 6 for x in keep_hl if x > last]
        o2, h2, la2, lo2 = fetch_one()
    finally:
        RUN, HOURS_LONG = keep_run, keep_hl
    if len(h2) and la2 is not None and len(la2) == len(la) and len(lo2) == len(lo):
        h2 = np.array(h2, float) - 6; ok = h2 > last
        for k in list(o):
            if k in o2 and len(o2[k]) == len(h2): o[k] = np.concatenate([np.asarray(o[k]), np.asarray(o2[k])[ok]])
            elif ok.any(): del o[k]   # an optional field the earlier run lacks: left out rather than mismatched in length
        h = np.concatenate([np.asarray(h, float), h2[ok]]); print('joined', int(ok.sum()), 'hours from', pr, 'beyond', last, flush=True)
    return o, h, la, lo


if __name__ == '__main__':
    for s in sys.argv[1:]:
        short = False   # F2 (25 Nov 2026): ECMWF now publishes its 06Z and 18Z runs under the same streams as 00Z and 12Z ("oper", "wave"), to 144 h; the old "scda"/"scwv" names gave 404s
        tail = RUN[1] in ('06', '18') and HOURS_LONG and HOURS_LONG[-1] > 144 and s in ('ecmwf', 'ecmet', 'ecwav')
        if s in ('ecmwf', 'aifs'):
            f1 = lambda: ecmwf('ifs' if s == 'ecmwf' else 'aifs-single', 'oper', step=3 if s == 'ecmwf' else 6, hires=(s == 'ecmwf' and os.environ.get('FS_ECMWF_9KM') == '1'))
            o, h, la, lo = with_tail(f1) if tail else f1()   # 21 Nov: 9 km (A of 20 Nov) only when switched on, for a release of its own on Stuart's go
            save(s, u=o['10u'], v=o['10v'], hours=h, lat=la, lon=lo)
        elif s == 'ecmet':   # ECMWF weather beyond the wind: gusts, pressure, rain, thunderstorm energy, cloud, air temperature, sea temperature
            f1 = lambda: ecmwf('ifs', 'oper', params=('10fg', 'msl', 'tp', 'mucape', 'tcc', '2t'), step=3, opt=('skt', 'lsm'))
            o, h, la, lo = with_tail(f1) if tail else f1()
            tp = o['tp']; rain = np.zeros_like(tp)
            if len(h) > 1:
                dh = np.diff(h).astype(float).reshape(-1, 1, 1); rain[1:] = np.maximum(0, np.diff(tp, axis=0)) * 1000 / dh   # accumulated metres to mm an hour
                rain[0] = rain[1]
            more = {}
            if 'skt' in o and 'lsm' in o:   # skin temperature over the sea is the model's sea surface temperature (14 Nov 2026, D)
                sst = np.where(o['lsm'] < 0.2, o['skt'] - 273.15, np.nan)   # cells with more land than that read the land (2 to 8 C in November)
                for _ in range(4):   # carry the sea value a few cells inshore, so harbours and estuaries get the nearby sea's temperature
                    pad = np.pad(sst, ((0, 0), (1, 1), (1, 1)), constant_values=np.nan)
                    nb = np.stack([pad[:, 1 + dy:pad.shape[1] - 1 + dy, 1 + dx:pad.shape[2] - 1 + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx])
                    with np.errstate(all='ignore'): fill = np.nanmean(nb, axis=0)
                    sst = np.where(np.isnan(sst), fill, sst)
                more['sst'] = sst
            save(s, gust=o['10fg'], msl=o['msl'] / 100, rain=rain, cape=o['mucape'], cloud=o['tcc'] * 100, temp=o['2t'] - 273.15, hours=h, lat=la, lon=lo, **more)
        elif s == 'ecwav':
            f1 = lambda: ecmwf('ifs', 'wave', params=('swh', 'mwd', 'pp1d'), step=3)
            o, h, la, lo = with_tail(f1) if tail else f1()
            save(s, hs=o['swh'], dir=o['mwd'], tp=o['pp1d'], hours=h, lat=la, lon=lo)
        elif s in ('arome', 'arpege'):
            res = meteofrance(s)
            if res is None: continue   # FS_RAW_ONLY: the shared job keeps the messages only
            o, h, la, lo = res; save(s, u=o['u'], v=o['v'], hours=h, lat=la, lon=lo)
        elif s == 'icon':
            o, h, la, lo = icon_eu(); save(s, u=o['u'], v=o['v'], hours=h, lat=la, lon=lo)
        elif s == 'gfs':
            o, h, la, lo = gfs(); save(s, u=o['u'], v=o['v'], hours=h, lat=la, lon=lo)
        elif s in ('ukv', 'mog'):
            S, D, h, g = metoffice('uk-deterministic-2km' if s == 'ukv' else 'global-deterministic-10km')
            u, v, la, lo = regrid_mo(S, D, g, 0.02 if s == 'ukv' else 0.1)
            save(s, u=u, v=v, hours=h, lat=la, lon=lo)
        elif s == 'ens':   # ECMWF ensemble: 10 of its 50 members, wind only, 6-hourly to 144 h then 12-hourly to 240 h; downloaded once for the whole area, cut per page
            from concurrent.futures import ThreadPoolExecutor
            base = 'https://ecmwf-forecasts.s3.eu-central-1.amazonaws.com'; d, r = RUN; NM = 10
            steps = [h for h in HOURS_LONG if (h % 6 == 0 and h <= 144) or (h % 12 == 0 and h <= 240)]
            def one_step(hh):
                stem = f'{d}/{r}z/ifs/0p25/enfo/{d}{r}0000-{hh}h-enfo-ef'
                try: idx = [json.loads(l) for l in get(f'{base}/{stem}.index', tries=3).decode().splitlines() if l.strip().startswith('{')]
                except Exception: return hh, None
                got = {}
                for x in idx:
                    if x.get('param') not in ('10u', '10v') or x.get('type') != 'pf' or not (1 <= int(x.get('number', 0)) <= NM): continue
                    k = (int(x['number']), x['param']); p_ = os.path.join(SHARED, f'ens_{d}{r}_{hh:03d}_{k[0]:02d}_{k[1]}' + ('' if AREA['w'] < 0 else f"_{AREA['s']:g}_{AREA['w']:g}") + '.npz')   # an area outside Europe keeps its own pieces
                    if not os.path.exists(p_):
                        buf = get(f'{base}/{stem}.grib2', (x['_offset'], x['_offset'] + x['_length'] - 1))
                        a, la, lo = grib_crop(buf, AREA); np.savez(p_, a=a, la=la, lo=lo)
                    got[k] = p_
                return hh, got
            with ThreadPoolExecutor(6) as ex: res = sorted(ex.map(one_step, steps))
            res = [(hh, g) for hh, g in res if g and len(g) == 2 * NM]
            if len(res) < 3: raise SystemExit('ens: too few steps')
            hrs = np.array([hh for hh, _ in res]); lat = lon = None; U = [[] for _ in range(NM)]; V = [[] for _ in range(NM)]
            for hh, g in res:
                for m in range(1, NM + 1):
                    for prm, L_ in (('10u', U), ('10v', V)):
                        z = np.load(g[(m, prm)]); la, lo = z['la'], z['lo']
                        iy = np.where((la >= BOX['s'] - .3) & (la <= BOX['n'] + .3))[0]; ix = np.where((lo >= BOX['w'] - .3) & (lo <= BOX['e'] + .3))[0]
                        L_[m - 1].append(z['a'][np.ix_(iy, ix)]); lat, lon = la[iy], lo[ix]
            for m in range(NM): save(f'e{m + 1:02d}', u=np.array(U[m]), v=np.array(V[m]), hours=hrs, lat=lat, lon=lon)
            save(s, hours=hrs, members=np.array(NM))
            print('ens', len(hrs), 'steps', NM, 'members')
        elif s == 'mars':   # Ifremer MARS2D western Channel, 250 m tidal streams (Licence Ouverte), read at 500 m round the Channel Islands and Cherbourg
            import netCDF4
            ds = netCDF4.Dataset('https://tds1.ifremer.fr/thredds/dodsC/MARC-MANW250-L1_MARS2D-FOR_FULL_TIME_SERIE')
            tv = ds.variables['time']; n = tv.shape[0]; tt = tv[n - 600:]
            tsec = netCDF4.num2date(tt, tv.units, only_use_cftime_datetimes=False)
            tsec = np.array([np.datetime64(x.strftime('%Y-%m-%dT%H:%M:%S')).astype('datetime64[s]').astype(float) for x in tsec])
            want = [T0 + h * 3600 for h in HOURS]; idx = []; hrs = []
            for h, w in zip(HOURS, want):
                k = int(np.argmin(np.abs(tsec - w)))
                if abs(tsec[k] - w) < 600: idx.append(n - 600 + k); hrs.append(h)
            la_all = ds.variables['latitude'][:, 0]; lo_all = ds.variables['longitude'][0, :]
            b = dict(s=max(BOX['s'], 48.6), n=min(BOX['n'], 50.0), w=max(BOX['w'], -3.3), e=min(BOX['e'], -1.2))
            iy = np.where((la_all >= b['s']) & (la_all <= b['n']))[0][::2]; ix = np.where((lo_all >= b['w']) & (lo_all <= b['e']))[0][::2]
            if not len(idx) or not len(iy) or not len(ix): raise SystemExit('mars: no overlap with this area or time')
            U = []; V = []
            for k in idx:
                u = ds.variables['U'][k, iy[0]:iy[-1] + 1:2, ix[0]:ix[-1] + 1:2]; v = ds.variables['V'][k, iy[0]:iy[-1] + 1:2, ix[0]:ix[-1] + 1:2]
                U.append(np.ma.filled(u.astype('f4'), np.nan)); V.append(np.ma.filled(v.astype('f4'), np.nan)); print('mars', k, end=' | ', flush=True)
            save(s, u=np.array(U), v=np.array(V), hours=np.array(hrs), lat=np.asarray(la_all[iy], 'f8'), lon=np.asarray(lo_all[ix], 'f8'))
        elif s == 'glocur':
            o, h, la, lo = zarr_geo(GLOCUR, ['uo', 'vo', 'utide', 'vtide'])
            save(s, u=o['uo'] + o['utide'], v=o['vo'] + o['vtide'], hours=h, lat=la, lon=lo)
        elif s in SOURCES:
            url, vs = SOURCES[s]; o, h, la, lo = zarr(url, vs)
            if s.endswith('cur'): save(s, u=o['uo'], v=o['vo'], hours=h, lat=la, lon=lo)
            else: save(s, hs=o['VHM0'], dir=o['VMDR'], tp=o['VTPK'], hours=h, lat=la, lon=lo)
        elif s == 'bathy':
            import numcodecs
            url = f'{CM}/mdl-arco-time-041/arco/NWSHELF_ANALYSISFORECAST_PHY_004_013/cmems_mod_nws_phy_anfc_1.5km_static_202511--ext--bathy/static.zarr'
            md = json.loads(get(url + '/.zmetadata'))['metadata']; print([k for k in md if k.endswith('.zarray')])
