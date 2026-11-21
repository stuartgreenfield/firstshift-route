# 21 Nov 2026: the shared ECMWF download cut to an area (build.py from_shared) equals that area's own fetch. Needs tests/ecmwf-fetch-harness.py as harness.py in /tmp/claude-0/ftest
import os, re, json, numpy as np, importlib.util, sys
src = open('/tmp/claude-0/night/scripts/build.py').read()
fn = src[src.index('def from_shared'):src.index('    return True', src.index('def from_shared')) + len('    return True')]
ns = {'os': os, 'np': np, 'json': json, 'SHARED_DIR': '/tmp/claude-0/ftest/sh'}; exec(fn, ns)
# the fake server from the harness, fetched once for a union box and once for one area's box, with the same fetch.py
exec(open('harness.py').read().split('def run(')[0])
def fetch(box, hours, tag):
    os.environ['FS_BOX'] = ','.join(map(str, box)); os.environ['FS_HOURS'] = str(hours); os.environ['FS_DATA'] = '/tmp/claude-0/ftest/' + tag
    spec = importlib.util.spec_from_file_location('m' + tag, '/tmp/claude-0/ftest/fetch_new.py'); m = importlib.util.module_from_spec(spec); sys.argv = ['x']; spec.loader.exec_module(m); m.get = fake_get; m.RUN = ('20261121', '00')
    o, h, la, lo = m.ecmwf('ifs', 'oper', params=('10fg', 'msl'), step=3); return dict(gust=o['10fg'], msl=o['msl'], hours=h, lat=la, lon=lo)
shared = fetch((48.0, 52.0, -5.0, 4.0), 240, 'u'); area = fetch((49.0, 51.0, -3.0, -1.0), 54, 'a')
os.makedirs('/tmp/claude-0/ftest/sh/ecmet', exist_ok=True); np.savez_compressed('/tmp/claude-0/ftest/sh/ecmet/ecmet.npz', t0=0.0, **shared)
os.makedirs('/tmp/claude-0/ftest/dest', exist_ok=True)
print('cut', ns['from_shared']('ecmet', dict(s=49.0, n=51.0, w=-3.0, e=-1.0), 54, '/tmp/claude-0/ftest/dest'))
z = np.load('/tmp/claude-0/ftest/dest/ecmet.npz')
print('hours', list(z['hours']) == list(area['hours']), 'lat', np.array_equal(z['lat'], area['lat']), 'lon', np.array_equal(z['lon'], area['lon']), 'gust', np.array_equal(z['gust'], area['gust']), 'msl', np.array_equal(z['msl'], area['msl']), z['gust'].shape, area['gust'].shape)
