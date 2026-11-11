"""Build the live forecast pack for one race area from the fetched npz files.
Same format as the 2026 hindcast: one file per layer, full and lite, cut to the course band and the hours ahead.
Env: FS_DATA (npz folder), FS_SITE (output folder for this race), FS_STATIC (static race files), FS_T0 (epoch of the common cycle)."""
import json, os, gzip, shutil, time, numpy as np
D = os.environ['FS_DATA']; OUT = os.path.join(os.environ['FS_SITE'], 'pack'); ST = os.environ['FS_STATIC']
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT): os.remove(os.path.join(OUT, f))
T0 = float(os.environ['FS_T0']); KM = 111.2; K = np.cos(np.radians(50.1))
static = json.load(open(os.path.join(ST, 'static.json')))
band = static['course']['band']

def excess(LA, LO):
    if not band:   # a whole region: everything inside the box
        R0 = static['course'].get('region') or static['box']
        return np.where((LA >= R0['s']) & (LA <= R0['n']) & (LO >= R0['w']) & (LO <= R0['e']), -1.0, 1e9)
    best = np.full(np.shape(LA), 1e9)
    for la1, lo1, la2, lo2, W in band:
        ax, ay = lo1 * 60 * K, la1 * 60; bx, by = lo2 * 60 * K, la2 * 60; px, py = LO * 60 * K, LA * 60
        dx, dy = bx - ax, by - ay; u = np.clip(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1)
        best = np.minimum(best, np.hypot(px - ax - u * dx, py - ay - u * dy) - W)
    return best

now_h = (time.time() - T0) / 3600
h0 = max(0, int(np.floor(now_h - 1))); h1 = int(static['course'].get('hours', 48))
print('window', h0, h1, 'hours after', time.strftime('%Y-%m-%d %H:%MZ', time.gmtime(T0)))

def pack_layer(lid, v, la, lo, hours, fields, scale, cell_nm):
    keep = [i for i, h in enumerate(hours) if h0 - 3 <= h <= h1 + 3]
    hours = [float(hours[i]) for i in keep]
    LA, LO = np.meshgrid(la, lo, indexing='ij'); ins = excess(LA, LO) <= cell_nm * 1.5
    rows = []; n = 0
    for y in range(len(la)):
        xs = np.where(ins[y])[0]
        if len(xs): rows.append([int(xs[0]), int(xs[-1]), n]); n += int(xs[-1] - xs[0] + 1)
        else: rows.append(None)
    buf = bytearray(); idx = {}
    for k, arr in fields.items():
        a = np.asarray(arr, 'f4')[keep]; parts = [a[t, y, r[0]:r[1] + 1] for t in range(a.shape[0]) for y, r in enumerate(rows) if r]
        q = np.concatenate(parts) / scale[k] if parts else np.zeros(0)
        q = np.clip(np.rint(np.nan_to_num(q, nan=-32768)), -32768, 32767).astype('<i2')
        idx[k] = dict(off=len(buf), n=int(q.size), scale=scale[k]); buf.extend(q.tobytes())
    fn = f'{lid}-{v}.wasm'; open(f'{OUT}/{fn}', 'wb').write(bytes(buf))
    dlat = float((la[-1] - la[0]) / (len(la) - 1)); dlon = float((lo[-1] - lo[0]) / (len(lo) - 1))
    return dict(file=fn, bytes=len(buf), gz=len(gzip.compress(bytes(buf), 6)), lat0=float(la[0]), dlat=dlat, ny=len(la), lon0=float(lo[0]), dlon=dlon, nx=len(lo),
                hours=hours, rows=rows, plane=n, res_km=[round(dlat * KM, 2), round(dlon * KM * 0.64, 2)],
                step_h=float(np.median(np.diff(hours))) if len(hours) > 1 else None, **idx)

def load(k):
    p = f'{D}/{k}.npz'
    if not os.path.exists(p): return None
    try: z = dict(np.load(p))
    except Exception as e: print('unreadable', k, e); return None                    # a failed fetch never stops the others
    if 'hours' not in z or z['hours'].dtype == object or not len(z['hours']): return None
    z['hours'] = z['hours'] + (float(z['t0']) - T0) / 3600   # every layer on the common clock
    if not len(z['hours']) or z['hours'][-1] < h0 + 6: return None                  # too short to be useful
    return z

def thin(z, keys, sp=1, every=1):
    hrs = z['hours']; keep = np.array([i for i, h in enumerate(hrs) if round(h) % every == 0])
    return z['lat'][::sp], z['lon'][::sp], hrs[keep], {k: z[k][keep][:, ::sp, ::sp] for k in keys}

layers = []; runs = {}
try: RECV = json.load(open(f'{D}/received.json'))
except Exception: RECV = {}
def add(kind, k, name, note, keys, sc, sp, ev):
    z = load(k)
    if z is None: print('skip', k); return
    cell = lambda la, lo: max(abs(la[1] - la[0]) * 60, abs(lo[1] - lo[0]) * 60 * K)
    fsp = 1
    while True:   # long races: thin the full layer until it fits comfortably under the host's 25 MiB per file
        la_, lo_, h_, f_ = thin(z, keys, fsp, 1)
        full = pack_layer(k, 'full', la_, lo_, h_, f_, sc, cell(la_, lo_))
        if full['bytes'] < 18e6 or fsp >= 4: break
        fsp += 1
    if fsp > 1: print(k, 'full thinned by', fsp)
    la, lo, h, f = thin(z, keys, sp, ev); lite = pack_layer(k, 'lite', la, lo, h, f, sc, cell(la, lo))
    run = time.strftime('%HZ %a %d %b', time.gmtime(float(z['t0']))); runs[k] = run
    layers.append(dict(kind=kind, id=k, name=name, note=note + ', run ' + run, full=full, lite=lite, run_t0=float(z['t0']), recv=RECV.get(k, {}).get('at')))

for k, name, note, sp, ev in [('ukv', 'Met Office UKV', 'UK 2 km model, hourly', 2, 3), ('ecmwf', 'ECMWF IFS', 'global 9 km model', 1, 6), ('gfs', 'NOAA GFS', 'global 0.25°', 1, 3),
                               ('aifs', 'ECMWF AIFS', 'AI model, 6-hourly', 1, 6), ('mog', 'Met Office Global', 'global 10 km model', 1, 6),
                               ('icon', 'DWD ICON-EU', 'Europe 7 km model, hourly to 78 h', 2, 3),
                               ('arome', 'Meteo-France AROME', 'France 2.5 km model, hourly to 48 h', 3, 3), ('arpege', 'Meteo-France ARPEGE', 'Europe 0.1° model, hourly to 102 h', 1, 3)]:
    add('wind', k, name, note, ['u', 'v'], dict(u=0.01, v=0.01), sp, ev)
for k, name, note in [('nwscur', 'Copernicus NW Shelf', 'tidal streams, 1.5 km hourly'), ('ibicur', 'Copernicus Iberia-Biscay-Ireland', 'tidal streams, 3 km hourly')]:
    add('tide', k, name, note, ['u', 'v'], dict(u=0.001, v=0.001), 2, 1)
for k, name, note, sp in [('nwswav', 'Copernicus NW Shelf waves', 'height, direction, period; 1.5 km hourly', 3), ('ecwav', 'ECMWF waves', '0.25°, 3-hourly', 1)]:
    z = load(k)
    if z is not None:
        for q in ('hs', 'dir', 'tp'): z[q] = np.where(z[q] > 1000, np.nan, z[q])
        np.savez(f'{D}/{k}.npz', **{a: (b if a != 'hours' else b - (float(z['t0']) - T0) / 3600) for a, b in z.items()})
    add('wave', k, name, note, ['hs', 'dir', 'tp'], dict(hs=0.01, dir=0.1, tp=0.01), sp, 3)

# depth and coast are static for the race area
for f in os.listdir(ST):
    if f.endswith('.wasm') or f.endswith('-runs.json'): shutil.copy(os.path.join(ST, f), OUT)
layers.append(static['depth'])

ov = None
if os.path.exists(f'{D}/overview.npz'):
    z = np.load(f'{D}/overview.npz'); buf = bytearray(); idx = {}
    for k, sc in (('msl', 0.1), ('u', 0.01), ('v', 0.01)):
        q = np.clip(np.rint(np.asarray(z[k] if k != 'msl' else z['msl'] / 100) / sc), -32768, 32767).astype('<i2'); idx[k] = dict(off=len(buf), n=int(q.size), scale=sc); buf.extend(q.tobytes())
    lsm = (z['lsm'] > 0.5).astype(np.uint8); off = len(buf); buf.extend(np.packbits(lsm.ravel()).tobytes())
    open(f'{OUT}/overview.wasm', 'wb').write(bytes(buf)); la, lo = z['lat'], z['lon']; shift = (float(z['t0']) - T0) / 3600
    ov = dict(file='overview.wasm', bytes=len(buf), gz=len(gzip.compress(bytes(buf), 6)), lat0=float(la[0]), dlat=float(la[1] - la[0]), ny=len(la), lon0=float(lo[0]), dlon=float(lo[1] - lo[0]), nx=len(lo),
              hours=[float(h) + shift for h in z['hours']], lsm=dict(off=off, lat0=float(z['lsm_lat'][0]), dlat=0.25, ny=lsm.shape[0], lon0=float(z['lsm_lon'][0]), dlon=0.25, nx=lsm.shape[1]), **idx,
              name='ECMWF overview, north-west Europe', note='1°, 6-hourly, 3 days: pressure and wind')

course = dict(static['course']); course['window'] = [h0, h1]
made = time.strftime('Built %H:%M UTC %a %d %b %Y', time.gmtime())
meta = dict(built=int(time.time()), t0=T0, run=time.strftime('%H:%M UTC, %a %d %b %Y', time.gmtime(T0)), made=made + '. Live forecasts; fleet from the 2026 entry list until 2027 entries are published',
            live=True, runs=runs, layers=layers, overview=ov, coast=static['coast'], fleet=static['fleet'], course=course)
json.dump(meta, open(f'{OUT}/pack.json', 'w'), separators=(',', ':'))
print('layers', [L['id'] for L in layers], 'full MB', round(sum(L['full']['gz'] for L in layers) / 1e6, 2))
