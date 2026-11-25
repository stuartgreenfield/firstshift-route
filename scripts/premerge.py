"""F100 (21 Nov 2026): lay each race job's pre-routes over the site just published.
Usage: python3 scripts/premerge.py <site> <pre>   where <pre>/pre-<job>/<page>/pre/ holds routes.json and one file per start.
Keeps only routes built on the pack now in <site>/<page>/pack (never an older forecast's), merges several jobs for one page
(its own race and its extra races, or the Fastnet split by start time), and prints one line per page, MISSING where a page
that should have pre-routes has none (the forecast job's end ping reports these)."""
import json, os, shutil, sys, glob
site, pre = sys.argv[1], sys.argv[2]
PAGES = ['channel-area', 'northsea-area', 'irishsea-area', 'biscay-area', 'celtic-area', 'fastnet', 'cervantes', 'tasman-area', 'middlesea-area', 'caribbean-area', 'atlantic-area']
got = {}
for d in sorted(glob.glob(os.path.join(pre, 'pre-*', '*', 'pre'))):
    page = os.path.basename(os.path.dirname(d))
    try: ix = json.load(open(os.path.join(d, 'routes.json')))
    except Exception as e: print('skipped', d, e); continue
    try: built = json.load(open(os.path.join(site, page, 'pack', 'pack.json'))); built = built.get('built') or built.get('t0')
    except Exception as e: print('no pack for', page, e); continue
    if ix.get('built') != built: print('older forecast, not kept:', d); continue
    g = got.setdefault(page, {'built': built, 'at': ix.get('at'), 'files': {}, 'logs': []})
    for k, f in (ix.get('files') or {}).items():
        if os.path.isfile(os.path.join(d, f)): g['files'][k] = (d, f)
    g['logs'] += glob.glob(os.path.join(d, 'log-*.json'))
for page in sorted(set(PAGES) | set(got)):
    out = os.path.join(site, page, 'pre'); shutil.rmtree(out, ignore_errors=True)
    g = got.get(page)
    if not g or not g['files']:
        print('MISSING', page); continue
    os.makedirs(out)
    for k, (d, f) in g['files'].items(): shutil.copy(os.path.join(d, f), os.path.join(out, f))
    for l in g['logs']: shutil.copy(l, os.path.join(out, os.path.basename(l)))
    json.dump({'built': g['built'], 'at': g['at'], 'files': {k: f for k, (d, f) in g['files'].items()}}, open(os.path.join(out, 'routes.json'), 'w'))
    print(page, len(g['files']), 'start times')
