#!/usr/bin/env python3
"""Wind farm outlines as ready-made exclusion zones (Stuart 26 Nov 2026 12:53: "find wind farms make then exclusion zones with a on /off button in setup charts").
Source: EMODnet Human Activities, Energy, Wind Farms (polygons), from CETMAR; licence CC-BY 4.0; updated yearly.
Run on GitHub's network (the workspace cannot reach EMODnet): python3 tools/make_windfarms.py site/zones/windfarms.json
Kept: farms in production or under construction (planned, approved and dismantled ones are not obstacles). Coordinates to 4 decimals (about 11 m)."""
import json, sys, urllib.request, datetime
URL = ('https://ows.emodnet-humanactivities.eu/wfs?service=WFS&version=2.0.0&request=GetFeature'
       '&typeNames=emodnet:windfarmspoly&outputFormat=application/json')
out = sys.argv[1] if len(sys.argv) > 1 else 'windfarms.json'
with urllib.request.urlopen(urllib.request.Request(URL, headers={'User-Agent': 'FirstShift Route (firstshiftsailing.com)'}), timeout=180) as r:
    raw = r.read()
j = json.loads(raw); zones = []; seen = {}
for f in j['features']:
    p = f['properties']; st = p.get('status') or ''
    seen[st] = seen.get(st, 0) + 1
    if st not in ('Production', 'Construction'): continue
    g = f['geometry']
    if not g: continue
    polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
    for k, poly in enumerate(polys):
        ring = []
        for lon, lat in (c[:2] for c in poly[0]):          # GeoJSON order is lon, lat; ours is lat, lon as in tss.json
            q = [round(lat, 4), round(lon, 4)]
            if not ring or ring[-1] != q: ring.append(q)
        if len(ring) > 3 and ring[0] == ring[-1]: ring.pop()
        if len(ring) < 3: continue
        zones.append({'kind': 'windfarm', 'name': (p.get('name') or 'Wind farm') + (' (part %d)' % (k + 1) if len(polys) > 1 else ''), 'country': p.get('country'), 'status': st,
                      'year': p.get('year'), 'turbines': p.get('n_turbines'), 'updated': p.get('updateyear'), 'poly': ring, 'src': 'emodnet'})
zones.sort(key=lambda z: (z['country'] or '', z['name']))
doc = {'note': 'Wind farms in production or under construction, as exclusion zones for the router. Outlines are the published site limits, not each turbine. Not for navigation: check the chart, notices to mariners and the sailing instructions.',
       'credit': 'Wind farm outlines: EMODnet Human Activities, CETMAR (CC-BY 4.0)', 'source': URL, 'built': datetime.datetime.utcnow().strftime('%Y-%m-%d'),
       'statuses_in_source': seen, 'bytes_in_source': len(raw), 'zones': zones}
json.dump(doc, open(out, 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(j['features']), 'features in the source', seen, '->', len(zones), 'zones,', sum(len(z['poly']) for z in zones), 'points')
