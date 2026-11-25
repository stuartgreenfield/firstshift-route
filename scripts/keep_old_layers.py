"""Publish step: a model whose newest run could not be fetched keeps its last good run (Stuart 12 Nov 2026).
For each area, any forecast layer in the live pack (prev/<area>/pack) that is missing from the new pack is copied across,
its hours shifted to the new pack's time base, and marked latest=False, kept=True, so Route shows it with a warning.
A kept layer is dropped once it no longer reaches 12 hours ahead.
F8 (Stuart 25 Nov 2026 15:30): a layer the new build fetched from an OLDER run than the live one (the newest run timed out and the build fell
back) never replaces the newer live layer: the live one is kept as it is. Usage: python3 scripts/keep_old_layers.py prev site"""
import json, os, shutil, sys, time
PREV, SITE = sys.argv[1], sys.argv[2]
ONLY = [x.strip() for x in os.environ.get('FS_ONLY', '').split(',') if x.strip()]   # F4: the models this run fetched; every other layer is the live one, carried across as it is
def src_of(i): return 'ens' if (len(i) == 3 and i[0] == 'e' and i[1:].isdigit()) else i
now = time.time()
for area in sorted(os.listdir(SITE)):
    newp, oldp = os.path.join(SITE, area, 'pack', 'pack.json'), os.path.join(PREV, area, 'pack', 'pack.json')
    if not (os.path.exists(newp) and os.path.exists(oldp)): continue
    new, old = json.load(open(newp)), json.load(open(oldp))
    if new.get('built') == old.get('built'): continue   # this area kept its whole old pack: nothing to merge
    have = {l['id'] for l in new['layers']}; added = []
    for L in old['layers']:
        if L.get('kind') not in ('wind', 'tide', 'wave', 'met', 'ens'): continue
        N = next((x for x in new['layers'] if x['id'] == L['id']), None)
        newer_live = N is not None and float(L.get('run_t0') or 0) > float(N.get('run_t0') or 0) > 0
        if L['id'] in have and not newer_live: continue
        if newer_live: new['layers'].remove(N)   # F8: the build fell back to an older run; the newer live layer stays
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
        if not ok:
            if newer_live: new['layers'].append(N)   # could not copy the live files: keep what the build made
            continue
        if newer_live:
            new['layers'].append(L); added.append(L['id'] + ' (newer live run kept)')
            new.setdefault('runs', {})[L['id']] = (old.get('runs') or {}).get(L['id'], '')
            continue
        if ONLY and src_of(L['id']) not in ONLY:   # F4: not fetched this run on purpose: still the newest run, not an older one kept
            new['layers'].append(L); added.append(L['id'] + ' (carried)'); new.setdefault('runs', {})[L['id']] = (old.get('runs') or {}).get(L['id'], ''); continue
        L = dict(L, latest=False, kept=True); new['layers'].append(L); added.append(L['id'])
        new.setdefault('runs', {})[L['id']] = (old.get('runs') or {}).get(L['id'], '') + ' (older run kept)'
    if 'overview' not in new and old.get('overview'):   # F4: a run without ECMWF keeps the live big-picture chart
        ov = old['overview']; src = os.path.join(PREV, area, 'pack', ov.get('file', ''))
        if ov.get('file') and os.path.exists(src):
            shutil.copy(src, os.path.join(SITE, area, 'pack', ov['file'])); ov = dict(ov, hours=[round(h + (old['t0'] - new['t0']) / 3600.0, 3) for h in ov.get('hours', [])]); new['overview'] = ov; added.append('overview (carried)')
    if added:
        oi = {l['id']: i for i, l in enumerate(old['layers'])}; new['layers'].sort(key=lambda l: oi.get(l['id'], 999))   # the live order of the layers (the colours and lists follow it)
        json.dump(new, open(newp, 'w'), separators=(',', ':'))
        print(area, 'kept older runs of', ', '.join(added))
