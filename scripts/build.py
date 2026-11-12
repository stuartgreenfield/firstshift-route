"""Forecast job: fetch the newest forecasts for each race area and build the packs the router downloads.
Runs on GitHub Actions every six hours; also runs on a laptop. Usage: python3 scripts/build.py [race ...]"""
import os, sys, time, json, subprocess, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
RACES = sys.argv[1:] or ['cervantes', 'fastnet', 'channel-area', 'northsea-area', 'irishsea-area', 'biscay-area', 'celtic-area']
SOURCES = ['ecmwf', 'aifs', 'gfs', 'ukv', 'mog', 'icon', 'arome', 'arpege', 'nwscur', 'ibicur', 'nwswav', 'ecwav', 'ecmet', 'mars', 'ens']

def cycles(lag_h=7, n=4):
    """Latest 00/06/12/18 UTC cycles that should be published by now, newest first."""
    t = time.time() - lag_h * 3600; t -= t % (6 * 3600)
    return [time.strftime('%Y%m%d%H', time.gmtime(t - 6 * 3600 * i)) for i in range(n)]

def good(path, need_h):
    try:
        z = np.load(path); return len(z['hours']) >= 3 and float(z['hours'][-1]) >= need_h
    except Exception: return False

log = {}; recv = {}
for race in RACES:
    st = json.load(open(os.path.join(ROOT, 'static', race, 'static.json')))
    b = st['box']; data = os.path.join(ROOT, 'work', race); os.makedirs(data, exist_ok=True)
    cyc = cycles(); T0 = None
    hrs = int(st['course'].get('hours', 48)) + 6
    env = dict(os.environ, FS_DATA=data, FS_BOX=f"{b['s']},{b['n']},{b['w']},{b['e']}", FS_HOURS=str(hrs))
    def one(src):
        if src == 'mars' and (b['s'] > 50.0 or b['n'] < 48.6 or b['w'] > -1.2 or b['e'] < -3.3): return   # the 250 m model only covers the western Channel
        first = None
        for i, c in enumerate(cyc):
            if src in ('ecmwf', 'ecwav', 'ecmet', 'ens') and hrs > 100 and c[-2:] in ('06', '18') and i < 2: continue   # ECMWF's 06Z and 18Z runs stop at 90 h; the 00Z and 12Z runs reach 10 days
            if first is None: first = c   # the newest run this model should have by now
            out = os.path.join(data, src + '.npz')
            if os.path.exists(out): os.remove(out)
            t1 = time.time()
            try:
                r = subprocess.run([sys.executable, os.path.join(HERE, 'fetch.py'), src], env=dict(env, FS_RUN=c), capture_output=True, text=True, timeout=1500)
            except subprocess.TimeoutExpired:
                log[f'{race}:{src}'] = f'{c} timed out'; continue
            if r.returncode == 0 and good(out, (12 if src == 'mars' else 30) + 6 * i):
                log[f'{race}:{src}'] = f'{c} in {time.time() - t1:.0f}s'; recv[src] = dict(run=c, at=int(time.time()), latest=(c == first), newest=first); break
            log[f'{race}:{src}'] = f'{c} failed: {(r.stderr or r.stdout)[-200:]}'
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
            r = subprocess.run([sys.executable, os.path.join(HERE, 'fetch_overview.py')], env=dict(env, FS_RUN=c, FS_BOX=''), capture_output=True, text=True, timeout=900)
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
            if f.endswith(('.html', '.js')): shutil.copy(os.path.join(ROOT, 'site', 'cervantes', f), os.path.join(ROOT, 'site', race, f))
# one area per job (the forecast workflow runs the areas side by side): each writes its own part, the publish job merges them
part = os.environ.get('FS_STATUS_PART')
json.dump(dict(built=time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime()), sources=log, received=recv), open(os.path.join(ROOT, 'site', part or 'status.json'), 'w'), indent=1)
