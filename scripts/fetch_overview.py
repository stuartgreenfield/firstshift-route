"""Wide-area overview for situational awareness: ECMWF IFS at 1 degree, every 6 hours, 3 days.
Mean sea-level pressure plus 10 m wind over north-west Europe, and a land mask for the coastline."""
import json, numpy as np, fetch
fetch.BOX = dict(s=40, n=62, w=-25, e=15)
base = 'https://ecmwf-forecasts.s3.eu-central-1.amazonaws.com'; d, r = fetch.RUN
out = {'msl': [], '10u': [], '10v': []}; hrs = []; lsm = None
lsm_lat = lsm_lon = np.zeros(1)
for hh in range(0, 73, 6):
    st = 'scda' if r in ('06', '18') else 'oper'
    stem = f'{d}/{r}z/ifs/0p25/{st}/{d}{r}0000-{hh}h-{st}-fc'
    idx = [json.loads(l) for l in fetch.get(f'{base}/{stem}.index').decode().splitlines() if l.strip()]
    for p in list(out) + (['lsm'] if hh == 0 else []):
        m = [x for x in idx if x.get('param') == p]
        if not m: print('no', p, hh); continue
        x = m[0]; a_full, la, lo = fetch.grib_crop(fetch.get(f'{base}/{stem}.grib2', (x['_offset'], x['_offset'] + x['_length'] - 1)))
        a = a_full[::4, ::4]
        if p == 'lsm': lsm_lat, lsm_lon = la, lo
        if p == 'lsm': lsm = a_full
        else: out[p].append(a)
    hrs.append(hh); print(hh, end=' ', flush=True)
np.savez_compressed(fetch.OUT + '/overview.npz', msl=np.array(out['msl']), u=np.array(out['10u']), v=np.array(out['10v']), lsm=lsm if lsm is not None else np.zeros((1, 1)), lsm_lat=lsm_lat, lsm_lon=lsm_lon, lat=la[::4], lon=lo[::4], hours=np.array(hrs), t0=fetch.T0)
print('\nsaved', np.array(out['msl']).shape, None if lsm is None else lsm.shape)
