"""Forecast job: fetch the newest forecasts for each race area and build the packs the router downloads.
Runs on GitHub Actions every six hours; also runs on a laptop. Usage: python3 scripts/build.py [race ...]"""
import os, sys, time, json, subprocess, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
RACES = sys.argv[1:] or ['cervantes', 'fastnet', 'channel-area', 'northsea-area', 'irishsea-area', 'biscay-area', 'celtic-area', 'solent-area', 'tasman-area']
SOURCES = ['ecmwf', 'aifs', 'gfs', 'ukv', 'mog', 'icon', 'arome', 'arpege', 'nwscur', 'ibicur', 'nwswav', 'ecwav', 'ecmet', 'mars', 'ens', 'glocur']
# models that cover only European waters, and the global one used instead where they do not reach (21 Nov 2026, Sydney Hobart, F114)
REGIONAL = {'ukv', 'icon', 'arome', 'arpege', 'nwscur', 'ibicur', 'nwswav', 'mars'}; GLOBAL_ONLY = {'glocur'}

# 24 Nov 2026 (Stuart 10:02, "add server run"; 07:52, the newest runs delivered at once): hours after the run time from which a model's
# files are complete, checked on the providers' servers on 24 Nov for the 00Z run: AROME 0.01 deg all hours by 01:55 (Meteo-France bucket),
# ICON-EU all hours by 03:27 (DWD open data). Everything else keeps the 7 hours used since 12 Nov until its timing is checked.
LAG = {'arome': 3, 'icon': 4, 'gfs': 5}   # 24 Nov 19:10 (Stuart 19:06 "Go"): GFS 0.25 is expected out within 5 h of its run (to be confirmed by the new-run watcher's log); at 7 h a 16:00 build still took 06Z
def cycles(lag_h=7, n=4):
    """Latest 00/06/12/18 UTC cycles that should be published by now, newest first."""
    t = time.time() - lag_h * 3600; t -= t % (6 * 3600)
    return [time.strftime('%Y%m%d%H', time.gmtime(t - 6 * 3600 * i)) for i in range(n)]

def good(path, need_h):
    try:
        z = np.load(path); return len(z['hours']) >= 3 and float(z['hours'][-1]) >= need_h
    except Exception: return False

log = {}; recv = {}
# 21 Nov 2026: the ECMWF family fetched once for every area by fetch_shared.py (FS_SHARED); an area cuts its own piece
SHARED_DIR = os.environ.get('FS_SHARED'); SHARED_INFO = {}
if SHARED_DIR:
    try: SHARED_INFO = json.load(open(os.path.join(SHARED_DIR, 'shared.json')))
    except Exception as e: print('no shared forecasts:', e, flush=True)
def from_shared(src, box, hrs, dest):
    """Cut the shared download of one source to this area's box (0.3 degrees round it, as fetch.py does) and hours; False if it cannot."""
    d = os.path.join(SHARED_DIR or '', src); files = [f for f in os.listdir(d) if f.endswith('.npz')] if os.path.isdir(d) else []
    if src + '.npz' not in files: return False
    for f in files:
        z = dict(np.load(os.path.join(d, f)))
        if 'lat' in z and 'lon' in z:
            la, lo = z['lat'], z['lon']; iy = np.where((la >= box['s'] - .3) & (la <= box['n'] + .3))[0]; ix = np.where((lo >= box['w'] - .3) & (lo <= box['e'] + .3))[0]
            if not len(iy) or not len(ix): return False
            ny, nx = len(la), len(lo)
            for k, a in list(z.items()):
                if hasattr(a, 'ndim') and a.ndim >= 2 and a.shape[-2:] == (ny, nx): z[k] = a[..., iy[0]:iy[-1] + 1, ix[0]:ix[-1] + 1]
            z['lat'], z['lon'] = la[iy[0]:iy[-1] + 1], lo[ix[0]:ix[-1] + 1]
        if 'hours' in z and z['hours'].ndim == 1:
            hh = z['hours']; keep = hh <= hrs; n = len(hh)
            for k, a in list(z.items()):
                if k != 'hours' and hasattr(a, 'ndim') and a.ndim >= 3 and a.shape[0] == n: z[k] = a[keep]
            z['hours'] = hh[keep]
        np.savez_compressed(os.path.join(dest, f), **z)
    return True
for race in RACES:
    st = json.load(open(os.path.join(ROOT, 'static', race, 'static.json')))
    b = st['box']; data = os.path.join(ROOT, 'work', race); os.makedirs(data, exist_ok=True)
    cyc = cycles(); T0 = None
    hrs = int(st['course'].get('hours', 48)) + 6
    env = dict(os.environ, FS_DATA=data, FS_BOX=f"{b['s']},{b['n']},{b['w']},{b['e']}", FS_HOURS=str(hrs))
    # Resilience (21 Nov 2026, Stuart 09:58 "resilience of the servers to delivery up to date data quickly"): the 08:19 UTC run of 21 Nov waited
    # 50 minutes for one source (ecmet: the 00Z try timed out at 25 min, then the older 12Z took another 25), so every area published 40 minutes
    # late. Each area now has a time budget (FS_FETCH_MIN, 20 min): a source not in by then is left out this run, and the publish step keeps
    # its last good run, marked as older (keep_old_layers.py), so a slow server holds up only its own layer.
    T_END = time.time() + float(os.environ.get('FS_FETCH_MIN', '20')) * 60
    europe = b['s'] > 30 and b['w'] > -40 and b['e'] < 45
    def one(src):
        if (src in REGIONAL and not europe) or (src in GLOBAL_ONLY and europe): return
        if src == 'mars' and (b['s'] > 50.0 or b['n'] < 48.6 or b['w'] > -1.2 or b['e'] < -3.3): return   # the 250 m model only covers the western Channel
        first = None
        sh = SHARED_INFO.get(src) or {}
        if sh.get('run'):   # the shared download, if it is the run this area would take first
            want = [c for i, c in enumerate(cycles(LAG.get(src, 7)) if src in LAG else cyc) if not (src in ('ecmwf', 'ecwav', 'ecmet', 'ens') and hrs > 100 and c[-2:] in ('06', '18') and i < 2)][:1]
            t1 = time.time()
            if want and sh['run'] == want[0] and from_shared(src, b, hrs, data) and good(os.path.join(data, src + '.npz'), 30):
                log[f'{race}:{src}'] = f"{sh['run']} shared ({sh.get('secs', '?')}s once for all areas, cut here in {time.time() - t1:.0f}s)"; recv[src] = dict(run=sh['run'], at=sh['at'], latest=sh['latest'], newest=sh['newest'])
                print(src, log[f'{race}:{src}'], flush=True); return
        cyc_s = cycles(LAG.get(src, 7)) if src in LAG else cyc   # 24 Nov: models known to publish sooner are tried sooner (LAG)
        for i, c in enumerate(cyc_s):
            if src in ('ecmwf', 'ecwav', 'ecmet', 'ens') and hrs > 100 and c[-2:] in ('06', '18') and i < 2: continue   # ECMWF's 06Z and 18Z runs stop at 90 h; the 00Z and 12Z runs reach 10 days
            if first is None: first = c   # the newest run this model should have by now
            out = os.path.join(data, src + '.npz')
            if os.path.exists(out): os.remove(out)
            t1 = time.time(); left = T_END - t1
            if left < 60:
                log[f'{race}:{src}'] = f'{c} not tried: out of time (the last good run is kept)'; print(src, 'try', log[f'{race}:{src}'], flush=True); break
            try:
                r = subprocess.run([sys.executable, os.path.join(HERE, 'fetch.py'), src], env=dict(env, FS_RUN=c), capture_output=True, text=True, timeout=min(1500, left))
            except subprocess.TimeoutExpired:
                log[f'{race}:{src}'] = f'{c} timed out'; print(src, 'try', log[f'{race}:{src}'], flush=True); continue   # every failed try in the job log, not only the last (19 Nov 2026)
            if r.returncode == 0 and good(out, (12 if src == 'mars' else 30) + 6 * i):
                log[f'{race}:{src}'] = f'{c} in {time.time() - t1:.0f}s'; recv[src] = dict(run=c, at=int(time.time()), latest=(c == first), newest=first); break
            why = 'exit ' + str(r.returncode) if r.returncode else 'too few hours'
            log[f'{race}:{src}'] = f'{c} failed ({why}): {(r.stderr or r.stdout)[-200:]}'; print(src, 'try', log[f'{race}:{src}'].replace(chr(10), ' '), flush=True)
        else:   # no cycle worked: leave nothing behind, so the router simply goes without this source this time
            out = os.path.join(data, src + '.npz')
            if os.path.exists(out): os.remove(out)
        print(src, log[f'{race}:{src}'], flush=True)
    # all sources at once: the job takes about as long as the slowest source, not the sum
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(len(SOURCES)) as ex: list(ex.map(one, SOURCES))
    t0c = cyc[0]
    for c in cyc[:3]:   # the big-picture chart, from the newest ECMWF run that has it
        try:
            r = subprocess.run([sys.executable, os.path.join(HERE, 'fetch_overview.py')], env=dict(env, FS_RUN=c, FS_BOX='', FS_OVERVIEW_BOX='' if europe else f"{b['s'] - 8},{b['n'] + 8},{b['w'] - 12},{b['e'] + 12}"), capture_output=True, text=True, timeout=900)
            ok = r.returncode == 0
        except subprocess.TimeoutExpired:
            ok = False; r = None
        log[f'{race}:overview'] = f'{c} ok' if ok else f'{c} failed: {((r.stderr or r.stdout) if r else "timed out")[-300:]}'
        print('overview', log[f'{race}:overview'], flush=True)
        if ok: break
    json.dump(recv, open(os.path.join(data, 'received.json'), 'w'))   # when each forecast reached the server
    T0e = time.mktime(time.strptime(t0c, '%Y%m%d%H')) - time.timezone
    r = subprocess.run([sys.executable, os.path.join(HERE, 'pack_live.py')], env=dict(env, FS_SITE=os.path.join(ROOT, 'site', race), FS_STATIC=os.path.join(ROOT, 'static', race), FS_T0=str(T0e)))
    if r.returncode: sys.exit(r.returncode)
    if race != 'cervantes':   # every race uses the same router page; only its pack differs
        import shutil
        for f in os.listdir(os.path.join(ROOT, 'site', 'cervantes')):
            if f.endswith(('.html', '.js', '.css')): shutil.copy(os.path.join(ROOT, 'site', 'cervantes', f), os.path.join(ROOT, 'site', race, f))
# one area per job (the forecast workflow runs the areas side by side): each writes its own part, the publish job merges them
part = os.environ.get('FS_STATUS_PART')
json.dump(dict(built=time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime()), sources=log, received=recv), open(os.path.join(ROOT, 'site', part or 'status.json'), 'w'), indent=1)
