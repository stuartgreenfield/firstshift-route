"""Publish step: a model whose newest run could not be fetched keeps its last good run (Stuart 12 Nov 2026).
For each area, any forecast layer in the live pack (prev/<area>/pack) that is missing from the new pack is copied across,
its hours shifted to the new pack's time base, and marked latest=False, kept=True, so Route shows it with a warning.
A kept layer is dropped once it no longer reaches 12 hours ahead. Usage: python3 scripts/keep_old_layers.py prev site"""
import json, os, shutil, sys, time
PREV, SITE = sys.argv[1], sys.argv[2]
now = time.time()
for area in sorted(os.listdir(SITE)):
    newp, oldp = os.path.join(SITE, area, 'pack', 'pack.json'), os.path.join(PREV, area, 'pack', 'pack.json')
    if not (os.path.exists(newp) and os.path.exists(oldp)): continue
    new, old = json.load(open(newp)), json.load(open(oldp))
    if new.get('built') == old.get('built'): continue   # this area kept its whole old pack: nothing to merge
    have = {l['id'] for l in new['layers']}; added = []
    for L in old['layers']:
        if L['id'] in have or L.get('kind') not in ('wind', 'tide', 'wave', 'met', 'ens'): continue
        shift = (old['t0'] - new['t0']) / 3600.0
        f = L.get('full') or {}; hrs = f.get('hours') or []
        if not hrs or old['t0'] + hrs[-1] * 3600 < now + 12 * 3600: continue   # too old to be useful
        ok = True
        for v in ('full', 'lite'):
            d = L.get(v)
            if not d: continue
            for key in ('file', 'runs'):
                fn = d.get(key)
                if fn:
                    src = os.path.join(PREV, area, 'pack', fn)
                    if os.path.exists(src): shutil.copy(src, os.path.join(SITE, area, 'pack', fn))
                    else: ok = False
            if d.get('hours'): d['hours'] = [round(h + shift, 3) for h in d['hours']]
        if not ok: continue
        L = dict(L, latest=False, kept=True); new['layers'].append(L); added.append(L['id'])
        new.setdefault('runs', {})[L['id']] = (old.get('runs') or {}).get(L['id'], '') + ' (older run kept)'
    if added:
        json.dump(new, open(newp, 'w'), separators=(',', ':'))
        print(area, 'kept older runs of', ', '.join(added))
