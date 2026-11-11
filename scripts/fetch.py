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

def get(u, rng=None, tries=8):
    import random
    for k in range(tries):
        try:
            url = u
            if u.startswith(ECMWF_S3) and k % 2 == 1: url = ECMWF_MIRRORS[1] + u[len(ECMWF_S3):]
            rq = urllib.request.Request(url)
            if rng: rq.add_header('Range', f'bytes={rng[0]}-{rng[1]}')
            return urllib.request.urlopen(rq, timeout=120).read()
        except Exception as e:
            err = e
            if getattr(e, 'code', None) == 404: break   # not published (yet): no point retrying
            time.sleep(2 * (k + 1) + random.random() * 3)
    raise err


def cached(key, fn):
    p = os.path.join(CACHE, key.replace('/', '_') + '.npy')
    if os.path.exists(p): return np.load(p)
    a = fn(); np.save(p, a); return a


# ---------- GRIB (ECMWF open data, GFS) ----------
def grib_crop(buf):
    import eccodes
    h = eccodes.codes_new_from_message(buf)
    ni, nj = eccodes.codes_get(h, 'Ni'), eccodes.codes_get(h, 'Nj')
    la1 = eccodes.codes_get(h, 'latitudeOfFirstGridPointInDegrees'); lo1 = eccodes.codes_get(h, 'longitudeOfFirstGridPointInDegrees')
    di = eccodes.codes_get(h, 'iDirectionIncrementInDegrees'); dj = eccodes.codes_get(h, 'jDirectionIncrementInDegrees')
    scan_neg = eccodes.codes_get(h, 'jScansPositively') == 0
    v = eccodes.codes_get_values(h).reshape(nj, ni); eccodes.codes_release(h)
    lat = la1 - np.arange(nj) * dj if scan_neg else la1 + np.arange(nj) * dj
    lon = (lo1 + np.arange(ni) * di + 180) % 360 - 180
    iy = np.where((lat >= BOX['s'] - .3) & (lat <= BOX['n'] + .3))[0]
    ix = np.where((lon >= BOX['w'] - .3) & (lon <= BOX['e'] + .3))[0]
    oy = np.argsort(lat[iy]); ox = np.argsort(lon[ix])
    return v[np.ix_(iy[oy], ix[ox])].astype('f4'), lat[iy][oy], lon[ix][ox]


def ecmwf(model='ifs', stream='scda', params=('10u', '10v'), step=1):
    base = 'https://ecmwf-forecasts.s3.eu-central-1.amazonaws.com'
    d, r = RUN
    out = {p: [] for p in params}; hrs = []; lat = lon = None
    for hh in [h for h in HOURS_LONG if h % step == 0 and (h <= 144 or h % 6 == 0)]:   # ECMWF: 3-hourly to 144 h, then 6-hourly to 240 h
        stem = f'{d}/{r}z/{model}/0p25/{stream}/{d}{r}0000-{hh}h-{stream if model=="ifs" else "oper"}-fc'
        try:
            idx = [json.loads(l) for l in get(f'{base}/{stem}.index', tries=2).decode().splitlines() if l.strip()]
        except Exception:
            continue
        ok = True
        for p in params:
            m = [x for x in idx if x.get('param') == p]
            if not m: ok = False; break
            x = m[0]
            a = cached(f'{model}{stream}{d}{r}_{hh}_{p}', lambda: grib_crop(get(f'{base}/{stem}.grib2', (x['_offset'], x['_offset'] + x['_length'] - 1)))[0])
            out[p].append(a)
            if lat is None: _, lat, lon = grib_crop(get(f'{base}/{stem}.grib2', (x['_offset'], x['_offset'] + x['_length'] - 1)))
        if ok: hrs.append(hh)
        print(model, stream, hh, end=' | ', flush=True)
    return {p: np.array(out[p][:len(hrs)]) for p in params}, np.array(hrs), lat, lon


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

def icon_eu():
    import bz2
    d, r = RUN; run = d + r; base = 'https://opendata.dwd.de/weather/nwp/icon-eu/grib'
    U = []; V = []; hrs = []; lat = lon = None
    for hh in [h for h in HOURS if (h <= 78 or h % 3 == 0) and h <= 120]:
        got = {}
        for var in ('u_10m', 'v_10m'):
            p = os.path.join(SHARED, f'icon_{run}_{hh:03d}_{var}.npz')
            if not os.path.exists(p):
                f = f'{base}/{r}/{var}/icon-eu_europe_regular-lat-lon_single-level_{run}_{hh:03d}_{var.upper()}.grib2.bz2'
                buf = bz2.decompress(get(f, tries=3))
                global BOX
                keep = BOX; BOX = AREA
                try: a, la, lo = grib_crop(buf)
                finally: BOX = keep
                np.savez(p, a=a, la=la, lo=lo)
            z = np.load(p); la, lo = z['la'], z['lo']
            iy = np.where((la >= BOX['s'] - .3) & (la <= BOX['n'] + .3))[0]; ix = np.where((lo >= BOX['w'] - .3) & (lo <= BOX['e'] + .3))[0]
            got[var] = z['a'][np.ix_(iy, ix)]; lat, lon = la[iy], lo[ix]
        U.append(got['u_10m']); V.append(got['v_10m']); hrs.append(hh); print('icon', hh, end=' | ', flush=True)
    return dict(u=np.array(U), v=np.array(V)), np.array(hrs), lat, lon


# ---------- Meteo-France AROME (France, 2.5 km, to 48 h) and ARPEGE (Europe, 0.1 deg, to 102 h): open data, no login ----------
MF = 'https://meteofrance-pnt.s3.rbx.io.cloud.ovh.net/pnt'
def meteofrance(model):
    import eccodes, tempfile
    d, r = RUN; iso = f'{d[:4]}-{d[4:6]}-{d[6:]}T{r}:00:00Z'
    if model == 'arome': groups = [(0, 6)] + [(a, a + 5) for a in range(7, 48, 6)]; name = lambda a, b: f'arome/0025/SP1/arome__0025__SP1__{a:02d}H{b:02d}H__{iso}.grib2'
    else: groups = [(0, 12)] + [(a, min(a + 11, 102)) for a in range(13, 103, 12)]; name = lambda a, b: f'arpege/01/SP1/arpege__01__SP1__{a:03d}H{b:03d}H__{iso}.grib2'
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
            def f():
                ny, nx = sh[-2], sh[-1]; cy, cx = ch[-2], ch[-1]
                full = np.full((ny, nx), np.nan, 'f4')
                for by in range(iy.min() // cy, iy.max() // cy + 1):
                    for bx in range(ix.min() // cx, ix.max() // cx + 1):
                        key = f'{url}/{v}/{i // ch[0]}.' + ('0.' if len(sh) == 4 else '') + f'{by}.{bx}'
                        raw = dec(get(key), za['dtype'])
                        blk = raw.reshape(ch)[i % ch[0]] if len(sh) == 3 else raw.reshape(ch)[i % ch[0], 0]
                        y1 = min(ny, (by + 1) * cy); x1 = min(nx, (bx + 1) * cx)
                        blk = blk[:y1 - by * cy, :x1 - bx * cx].astype('f4')
                        if fill is not None: blk = np.where(blk == fill, np.nan, blk)
                        full[by * cy:y1, bx * cx:x1] = blk * sc + off
                return full[np.ix_(iy, ix)]
            arr.append(cached(url.split('/')[-2] + f'_{v}_{i}', f))
        out[v] = np.array(arr); print(v, 'done', end=' | ', flush=True)
    return out, (want - T0) / 3600, lat[iy], lon[ix]


CM = 'https://s3.waw3-1.cloudferro.com'
SOURCES = {
    'nwscur': (f'{CM}/mdl-arco-time-041/arco/NWSHELF_ANALYSISFORECAST_PHY_004_013/cmems_mod_nws_phy-cur_anfc_1.5km-2D_PT1H-i_202511/timeChunked.zarr', ['uo', 'vo']),
    'ibicur': (f'{CM}/mdl-arco-time-032/arco/IBI_ANALYSISFORECAST_PHY_005_001/cmems_mod_ibi_phy_anfc_0.027deg-2D_PT1H-m_202411/timeChunked.zarr', ['uo', 'vo']),
    'nwswav': (f'{CM}/mdl-arco-time-041/arco/NWSHELF_ANALYSISFORECAST_WAV_004_014/cmems_mod_nws_wav_anfc_1.5km_PT1H-i_202511/timeChunked.zarr', ['VHM0', 'VMDR', 'VTPK']),
}


def save(name, **k):
    np.savez_compressed(os.path.join(OUT, name + '.npz'), t0=T0, **k); print('\nsaved', name, {a: getattr(b, 'shape', b) for a, b in k.items() if hasattr(b, 'shape')})


if __name__ == '__main__':
    for s in sys.argv[1:]:
        short = RUN[1] in ('06', '18')       # ECMWF 06Z and 18Z runs use the short-cut-off streams
        if s in ('ecmwf', 'aifs'):
            o, h, la, lo = ecmwf('ifs' if s == 'ecmwf' else 'aifs-single', ('scda' if short else 'oper') if s == 'ecmwf' else 'oper', step=3 if s == 'ecmwf' else 6)
            save(s, u=o['10u'], v=o['10v'], hours=h, lat=la, lon=lo)
        elif s == 'ecwav':
            o, h, la, lo = ecmwf('ifs', 'scwv' if short else 'wave', params=('swh', 'mwd', 'pp1d'), step=3)
            save(s, hs=o['swh'], dir=o['mwd'], tp=o['pp1d'], hours=h, lat=la, lon=lo)
        elif s in ('arome', 'arpege'):
            o, h, la, lo = meteofrance(s); save(s, u=o['u'], v=o['v'], hours=h, lat=la, lon=lo)
        elif s == 'icon':
            o, h, la, lo = icon_eu(); save(s, u=o['u'], v=o['v'], hours=h, lat=la, lon=lo)
        elif s == 'gfs':
            o, h, la, lo = gfs(); save(s, u=o['u'], v=o['v'], hours=h, lat=la, lon=lo)
        elif s in ('ukv', 'mog'):
            S, D, h, g = metoffice('uk-deterministic-2km' if s == 'ukv' else 'global-deterministic-10km')
            u, v, la, lo = regrid_mo(S, D, g, 0.02 if s == 'ukv' else 0.1)
            save(s, u=u, v=v, hours=h, lat=la, lon=lo)
        elif s in SOURCES:
            url, vs = SOURCES[s]; o, h, la, lo = zarr(url, vs)
            if s.endswith('cur'): save(s, u=o['uo'], v=o['vo'], hours=h, lat=la, lon=lo)
            else: save(s, hs=o['VHM0'], dir=o['VMDR'], tp=o['VTPK'], hours=h, lat=la, lon=lo)
        elif s == 'bathy':
            import numcodecs
            url = f'{CM}/mdl-arco-time-041/arco/NWSHELF_ANALYSISFORECAST_PHY_004_013/cmems_mod_nws_phy_anfc_1.5km_static_202511--ext--bathy/static.zarr'
            md = json.loads(get(url + '/.zmetadata'))['metadata']; print([k for k in md if k.endswith('.zarray')])
