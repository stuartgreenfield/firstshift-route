# 21 Nov 2026: checks scripts/fetch.py ecmwf() against a fake ECMWF server (real GRIB messages; hours and fields missing on purpose). Run: python3 tests/ecmwf-fetch-harness.py (after copying the old and new fetch.py into /tmp/claude-0/ftest)
import os, sys, json, importlib.util, numpy as np, random
os.environ['FS_BOX'] = '49,51,-3,-1'; os.environ['FS_HOURS'] = '240'
import eccodes
def msg(val):
    h = eccodes.codes_grib_new_from_samples('regular_ll_sfc_grib2')
    eccodes.codes_set(h, 'Ni', 40); eccodes.codes_set(h, 'Nj', 20)
    eccodes.codes_set(h, 'latitudeOfFirstGridPointInDegrees', 52.0); eccodes.codes_set(h, 'latitudeOfLastGridPointInDegrees', 47.25)
    eccodes.codes_set(h, 'longitudeOfFirstGridPointInDegrees', 355.0); eccodes.codes_set(h, 'longitudeOfLastGridPointInDegrees', 364.75)
    eccodes.codes_set(h, 'iDirectionIncrementInDegrees', 0.25); eccodes.codes_set(h, 'jDirectionIncrementInDegrees', 0.25); eccodes.codes_set(h, 'jScansPositively', 0)
    eccodes.codes_set_values(h, np.full(800, float(val))); b = eccodes.codes_get_message(h); eccodes.codes_release(h); return b
random.seed(1); FILES = {}
for hh in range(0, 241):
    if hh % 7 == 5: continue   # some hours never published
    blob = b''; idx = []
    for k, p in enumerate(['10fg', 'msl', 'tp', 'mucape', 'tcc', '2t', 'skt', 'lsm']):
        if p == 'skt' and hh == 30: continue   # an optional field missing one hour
        if p == 'msl' and hh == 60: continue   # a needed field missing one hour
        m = msg(hh * 10 + k); idx.append({'param': p, '_offset': len(blob), '_length': len(m)}); blob += m
    FILES[hh] = (blob, '\n'.join(json.dumps(x) for x in idx).encode())
def fake_get(u, rng=None, tries=8):
    import re; hh = int(re.search(r'-(\d+)h-', u).group(1))
    if hh not in FILES: raise Exception('404')
    blob, ix = FILES[hh]
    if u.endswith('.index'): return ix
    return blob[rng[0]:rng[1] + 1]
def run(path, tag):
    os.environ['FS_DATA'] = '/tmp/claude-0/ftest/out-' + tag
    spec = importlib.util.spec_from_file_location('f' + tag, path); m = importlib.util.module_from_spec(spec); sys.argv = ['x']; spec.loader.exec_module(m)
    m.get = fake_get; m.RUN = ('20261121', '00')
    return m.ecmwf('ifs', 'oper', params=('10fg', 'msl', 'tp', 'mucape', 'tcc', '2t'), step=3, opt=('skt', 'lsm'))
a = run('/tmp/claude-0/ftest/fetch_old.py', 'old'); b = run('/tmp/claude-0/ftest/fetch_new.py', 'new')
same = list(a[1]) == list(b[1]) and set(a[0]) == set(b[0]) and all(np.array_equal(a[0][k], b[0][k]) for k in a[0]) and np.array_equal(a[2], b[2]) and np.array_equal(a[3], b[3])
print('hours', len(a[1]), len(b[1]), 'fields', sorted(a[0]), sorted(b[0]), 'IDENTICAL' if same else 'DIFFERENT')
print('hours equal', list(a[1]) == list(b[1]))
for k in a[0]: print(k, a[0][k].shape, b[0][k].shape, np.array_equal(a[0][k], b[0][k]), a[0][k][:4, 0, 0] if a[0][k].ndim == 3 else '', b[0][k][:4, 0, 0])
print('lat', np.array_equal(a[2], b[2]), 'lon', np.array_equal(a[3], b[3]))
hl = list(a[1]); i = hl.index(63); print('hour 63: gusts should be', 63 * 10 + 0, '| old', a[0]['10fg'][i, 0, 0], '| new', b[0]['10fg'][i, 0, 0])
