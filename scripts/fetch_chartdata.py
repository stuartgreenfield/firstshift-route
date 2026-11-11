"""Chart extras for the whole FirstShift Route area: traffic separation schemes (as possible no-go zones) and the main
lighthouses and buoys. Not for navigation. Runs weekly on GitHub (workflow chartdata.yml) and writes site/zones/.
Sources: OpenStreetMap seamarks via Overpass (ODbL, credit "OpenStreetMap contributors"); SHOM traffic separation
schemes for French waters (Licence Ouverte 2.0, credit "Shom")."""
import json, os, sys, time, urllib.request, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'site', 'zones'); os.makedirs(OUT, exist_ok=True)
S, W, N, E = 35.5, -15.0, 61.5, 12.0          # the active area
BB = f'({S},{W},{N},{E})'
UA = {'User-Agent': 'FirstShift-Route/0.5 (race routing; github.com/stuartgreenfield)'}

def http(url, data=None, tries=4):
    for k in range(tries):
        try:
            rq = urllib.request.Request(url, data=data, headers=UA)
            return urllib.request.urlopen(rq, timeout=300).read()
        except Exception as e:
            err = e; print('retry', url[:60], e, flush=True); time.sleep(20 * (k + 1))
    raise err

def overpass(q):
    for host in ('https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'):
        try: return json.loads(http(host, urllib.parse.urlencode({'data': q}).encode()))['elements']
        except Exception as e: print('overpass failed on', host, e, flush=True)
    raise SystemExit('Overpass unavailable')

r4 = lambda x: round(float(x), 4)

# ---------- traffic separation schemes ----------
KINDS = {'separation_zone': 'zone', 'separation_lane': 'lane', 'inshore_traffic_zone': 'inshore', 'precautionary_area': 'precaution'}
zones = []
els = overpass(f'[out:json][timeout:300];(way["seamark:type"~"^({"|".join(KINDS)})$"]{BB};relation["seamark:type"~"^({"|".join(KINDS)})$"]{BB};);out geom;')
for e in els:
    t = e.get('tags', {}); kind = KINDS.get(t.get('seamark:type'))
    rings = []
    if e['type'] == 'way' and e.get('geometry'):
        rings.append([[r4(p['lat']), r4(p['lon'])] for p in e['geometry']])
    elif e['type'] == 'relation':
        for m in e.get('members', []):
            if m.get('role') in ('outer', '') and m.get('geometry'): rings.append([[r4(p['lat']), r4(p['lon'])] for p in m['geometry']])
    for ring in rings:
        if len(ring) >= 4 and ring[0] == ring[-1]:
            zones.append(dict(kind=kind, name=t.get('seamark:name') or t.get('name') or '', poly=ring, src='osm', dir=t.get('seamark:separation_lane:orientation') or t.get('seamark:orientation')))
print('OSM TSS polygons', len(zones), flush=True)

SHOM = {'tsslpt': 'lane', 'tsezne': 'zone', 'prcare': 'precaution', 'istzne': 'inshore'}
for L, kind in SHOM.items():
    try:
        j = json.loads(http('https://services.data.shom.fr/INSPIRE/wfs?' + urllib.parse.urlencode(dict(service='WFS', version='2.0.0', request='GetFeature', typeNames='DST_BDD_WFS:' + L, outputFormat='application/json', srsName='EPSG:4326'))))
    except Exception as e:
        print('SHOM', L, 'failed', e, flush=True); continue
    n = 0
    for f in j.get('features', []):
        g = f.get('geometry') or {}; polys = [g['coordinates']] if g.get('type') == 'Polygon' else g.get('coordinates', []) if g.get('type') == 'MultiPolygon' else []
        for poly in polys:
            ring = [[r4(c[1]), r4(c[0])] for c in poly[0]]   # GeoJSON is lon, lat
            if not any(S <= p[0] <= N and W <= p[1] <= E for p in ring): continue
            zones.append(dict(kind=kind, name=(f.get('properties') or {}).get('nom', ''), poly=ring, src='shom', dir=(f.get('properties') or {}).get('orient'))); n += 1
    print('SHOM', L, n, flush=True)

json.dump(dict(note='Traffic separation schemes: not for navigation. Lanes and separation zones can be set as no-go zones in the router.',
               credit=['OpenStreetMap contributors (ODbL)', 'Shom, Dispositifs de séparation du trafic (Licence Ouverte 2.0)'],
               built=time.strftime('%Y-%m-%d'), zones=zones), open(os.path.join(OUT, 'tss.json'), 'w'), separators=(',', ':'))

# ---------- lighthouses and main buoys ----------
marks = []
els = overpass(f'[out:json][timeout:300];(node["seamark:type"="light_major"]{BB};node["man_made"="lighthouse"]["seamark:type"]{BB};'
               f'node["seamark:type"~"^(buoy_cardinal|buoy_safe_water|buoy_isolated_danger|buoy_special_purpose|beacon_cardinal)$"]["seamark:name"]{BB};);out;')
seen = set()
for e in els:
    t = e.get('tags', {}); key = (r4(e['lat']), r4(e['lon']))
    if key in seen: continue
    seen.add(key)
    ty = t.get('seamark:type', 'light_major')
    kind = 'light' if ty == 'light_major' or t.get('man_made') == 'lighthouse' else 'cardinal' if 'cardinal' in ty else 'safe' if 'safe' in ty else 'danger' if 'danger' in ty else 'special'
    name = t.get('seamark:name') or t.get('name') or ''
    if not name: continue
    m = dict(n=name, k=kind, la=key[0], lo=key[1])
    ch = t.get('seamark:light:character') or t.get('seamark:light:1:character')
    if ch: m['lt'] = (ch + ' ' + (t.get('seamark:light:colour') or t.get('seamark:light:1:colour') or '')[:1].upper() + ' ' + (t.get('seamark:light:period') or t.get('seamark:light:1:period') or '') + ('s' if (t.get('seamark:light:period') or t.get('seamark:light:1:period')) else '')).strip()
    cat = t.get('seamark:buoy_cardinal:category') or t.get('seamark:beacon_cardinal:category')
    if cat: m['c'] = cat[:1].upper()
    marks.append(m)
marks.sort(key=lambda m: (m['k'] != 'light', m['n']))
print('marks', len(marks), {k: sum(1 for m in marks if m['k'] == k) for k in ('light', 'cardinal', 'safe', 'danger', 'special')}, flush=True)
json.dump(dict(note='Main lighthouses and named buoys for course planning. Not for navigation.', credit=['OpenStreetMap contributors (ODbL)'],
               built=time.strftime('%Y-%m-%d'), marks=marks), open(os.path.join(OUT, 'marks.json'), 'w'), separators=(',', ':'))
