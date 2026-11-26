"""F1 (Stuart 25 Nov 2026 15:30, forecast freshness review): choose each model's run by checking that it has landed, not by a fixed wait.
For each model, the file of the last forecast hour the areas need is asked for (HTTP HEAD) on the same servers fetch.py reads; the newest
run whose last file is there is complete enough to build. Models with no check keep the old fixed wait (build.py LAG).
newest(src, need_h) -> runs (YYYYMMDDHH, newest first) that have landed, or None when this model has no check."""
import time, urllib.request
from concurrent.futures import ThreadPoolExecutor

ECMWF_S3 = 'https://ecmwf-forecasts.s3.eu-central-1.amazonaws.com'
MO = 'https://met-office-atmospheric-model-data.s3-eu-west-2.amazonaws.com'

def _up3(h): return int(-(-h // 3) * 3)
def _up6(h): return int(-(-h // 6) * 6)
def _ec(h, r):   # ECMWF steps: hourly to 90, 3-hourly to 144, 6-hourly beyond; 06Z and 18Z end at 144
    h = min(h, 144 if r in ('06', '18') else 240)
    return h if h <= 90 else (_up3(h) if h <= 144 else _up6(h))
def _iso(d, r): return f'{d[:4]}-{d[4:6]}-{d[6:]}T{r}:00:00Z'

def url(src, d, r, need):
    if src == 'gfs':
        h = min(need, 240); h = h if h <= 120 else _up3(h)
        return f'https://noaa-gfs-bdp-pds.s3.amazonaws.com/gfs.{d}/{r}/atmos/gfs.t{r}z.pgrb2.0p25.f{h:03d}.idx'
    if src in ('ecmwf', 'ecmet'):
        return f'{ECMWF_S3}/{d}/{r}z/ifs/0p25/oper/{d}{r}0000-{_ec(need, r)}h-oper-fc.index'
    if src == 'ecwav':
        return f'{ECMWF_S3}/{d}/{r}z/ifs/0p25/wave/{d}{r}0000-{_ec(need, r)}h-wave-fc.index'
    if src == 'aifs':
        return f'{ECMWF_S3}/{d}/{r}z/aifs-single/0p25/oper/{d}{r}0000-{_up6(min(need, 240))}h-oper-fc.index'
    if src == 'icon':
        h = min(need, 120); h = h if h <= 78 else _up3(h)
        return f'https://opendata.dwd.de/weather/nwp/icon-eu/grib/{r}/u_10m/icon-eu_europe_regular-lat-lon_single-level_{d}{r}_{h:03d}_U_10M.grib2.bz2'
    if src == 'arome':   # the last package of the 0.01 deg run
        return f'https://meteofrance-pnt.s3.rbx.io.cloud.ovh.net/pnt/{_iso(d, r)}/arome/001/SP1/arome__001__SP1__48H__{_iso(d, r)}.grib2'
    if src == 'ukv':
        h = min(need, 54); vt = time.strftime('%Y%m%dT%H00Z', time.gmtime(time.mktime(time.strptime(d + r, '%Y%m%d%H')) - time.timezone + h * 3600))
        return f'{MO}/uk-deterministic-2km/{d}T{r}00Z/{vt}-PT{h:04d}H00M-wind_speed_at_10m.nc'
    return None

def _there(u):
    for _ in range(2):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, method='HEAD', headers={'User-Agent': 'FirstShift-forecast'}), timeout=12) as r: return r.status == 200
        except urllib.error.HTTPError as e:
            if e.code in (403, 404): return False
        except Exception: pass
    return None   # could not tell

def recent(n=6, now=None):
    t = (now or time.time()) - 3600; t -= t % (6 * 3600)   # no run is out within an hour of its run time
    return [time.strftime('%Y%m%d%H', time.gmtime(t - 6 * 3600 * i)) for i in range(n)]

def newest(src, need_h, n=6, skip=lambda c: False):
    if url(src, '20260101', '00', need_h) is None: return None
    runs = [c for c in recent(n) if not skip(c)]
    with ThreadPoolExecutor(len(runs) or 1) as ex: got = list(ex.map(lambda c: _there(url(src, c[:8], c[8:], need_h)), runs))
    if all(g is None for g in got): return None   # the server could not be asked: fall back to the fixed wait
    return [c for c, g in zip(runs, got) if g]

if __name__ == '__main__':
    import sys
    need = int(sys.argv[1]) if len(sys.argv) > 1 else 54
    for s in ('ukv', 'gfs', 'ecmwf', 'ecwav', 'aifs', 'icon', 'arome'): print(s, newest(s, need))
