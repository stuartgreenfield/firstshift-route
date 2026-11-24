"""Fetch the ECMWF family once for every area (21 Nov 2026, Stuart 10:41: "deliver all 8 or 10 GRIB solutions instantly onto someone's phone").
The 08:19 UTC run of 21 Nov had all eight area jobs download the same ECMWF fields from the same server at once, eight times the load, and
ECMWF slowed to a crawl. This job downloads ECMWF IFS (wind), AIFS, ECMWF weather, ECMWF waves and the ensemble once, for one box that covers
every area and the longest forecast any area uses; each area job then cuts its own piece (build.py, FS_SHARED), and fetches for itself only
if this job did not deliver a source.
Usage: python3 scripts/fetch_shared.py   writes work/_shared/<source>/*.npz and work/_shared/shared.json
24 Nov 2026: also the AROME 0.01 deg 10 m wind messages, work/_shared/aromehd_*.grib2 (arome_raw)."""
import os, sys, json, time, glob, subprocess, numpy as np
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
SHARED = ['ecmwf', 'aifs', 'ecmet', 'ecwav', 'ens']
OUT = os.path.join(ROOT, 'work', '_shared'); os.makedirs(OUT, exist_ok=True)
boxes = [json.load(open(f)) for f in glob.glob(os.path.join(ROOT, 'static', '*', 'static.json'))]
S = min(b['box']['s'] for b in boxes); N = max(b['box']['n'] for b in boxes); W = min(b['box']['w'] for b in boxes); E = max(b['box']['e'] for b in boxes)
HRS = max(int(b['course'].get('hours', 48)) for b in boxes) + 6
T_END = time.time() + float(os.environ.get('FS_FETCH_MIN', '20')) * 60   # the same budget as an area job: a source not in by then is left to the areas' last good run

def cycles(lag_h=7, n=4):   # as build.py: the latest 00/06/12/18 UTC runs that should be out by now, newest first
    t = time.time() - lag_h * 3600; t -= t % (6 * 3600)
    return [time.strftime('%Y%m%d%H', time.gmtime(t - 6 * 3600 * i)) for i in range(n)]
def good(path, need_h):
    try: z = np.load(path); return len(z['hours']) >= 3 and float(z['hours'][-1]) >= need_h
    except Exception: return False

info = {}
def one(src):
    d = os.path.join(OUT, src); os.makedirs(d, exist_ok=True); first = None; tries = []
    for i, c in enumerate(cycles()):
        if HRS > 100 and c[-2:] in ('06', '18') and i < 2: continue   # ECMWF's 06Z and 18Z runs stop at 90 h; the 00Z and 12Z reach 10 days
        if first is None: first = c
        for f in glob.glob(os.path.join(d, '*.npz')): os.remove(f)
        t1 = time.time(); left = T_END - t1
        if left < 60: tries.append(f'{c} not tried: out of time'); break
        env = dict(os.environ, FS_DATA=d, FS_BOX=f'{S},{N},{W},{E}', FS_HOURS=str(HRS), FS_RUN=c)
        try: r = subprocess.run([sys.executable, os.path.join(HERE, 'fetch.py'), src], env=env, capture_output=True, text=True, timeout=min(1500, left))
        except subprocess.TimeoutExpired: tries.append(f'{c} timed out'); continue
        stat = [l for l in (r.stdout or '').splitlines() if 'requests,' in l][-1:]
        if r.returncode == 0 and good(os.path.join(d, src + '.npz'), 30 + 6 * i):
            info[src] = dict(run=c, at=int(time.time()), latest=(c == first), newest=first, secs=round(time.time() - t1), stats=stat[0] if stat else '')
            print(src, c, 'in', round(time.time() - t1), 's', '|', stat[0] if stat else '', flush=True); return
        tries.append(f"{c} failed: {((r.stderr or r.stdout) or '')[-200:]}")
    for f in glob.glob(os.path.join(d, '*.npz')): os.remove(f)
    info[src] = dict(failed=tries); print(src, 'not delivered:', tries, flush=True)

def arome_raw():
    """AROME 0.01 deg (Stuart 24 Nov 08:21): download each hour once and keep only its 10 m wind messages in work/_shared, where every
    area job's fetch.py finds them (aromehd_<run>_h<hour>_10u.grib2) and cuts its own box. Tries the run the areas will try first."""
    t1 = time.time(); c = cycles(3)[0]   # the run the areas try first for AROME (build.py LAG)
    env = dict(os.environ, FS_DATA=os.path.join(OUT, 'arome_raw'), FS_BOX='35,62,-15.5,12.5', FS_HOURS='51', FS_RUN=c, FS_RAW_ONLY='1')
    os.makedirs(env['FS_DATA'], exist_ok=True)
    try: r = subprocess.run([sys.executable, os.path.join(HERE, 'fetch.py'), 'arome'], env=env, capture_output=True, text=True, timeout=max(60, min(1200, T_END - t1)))
    except subprocess.TimeoutExpired: info['arome_raw'] = dict(failed=[f'{c} timed out']); print('arome 0.01 timed out', flush=True); return
    if r.returncode == 0: info['arome_raw'] = dict(run=c, at=int(time.time()), secs=round(time.time() - t1)); print('arome 0.01', c, 'in', round(time.time() - t1), 's', flush=True)
    else: info['arome_raw'] = dict(failed=[f"{c}: {((r.stderr or r.stdout) or '')[-200:]}"]); print('arome 0.01 not delivered', flush=True)

print('shared box', S, N, W, E, 'hours', HRS, flush=True)
with ThreadPoolExecutor(len(SHARED) + 1) as ex: list(ex.map(lambda f: f(), [lambda s=s: one(s) for s in SHARED] + [arome_raw]))
json.dump(info, open(os.path.join(OUT, 'shared.json'), 'w'), indent=1)
print('delivered', sorted(k for k, v in info.items() if 'run' in v), flush=True)
