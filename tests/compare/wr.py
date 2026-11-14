import json, math, datetime, sys, time, warnings; warnings.filterwarnings('ignore')
import weatherrouting as W
from weatherrouting.routers.linearbestisorouter import LinearBestIsoRouter
S = json.load(open('scen.json')); T0 = datetime.datetime(2026, 6, 1, 0, 0)
pol = W.Polar('polar.pol')
class G(W.Grib):
    def __init__(s, sc): s.sc = sc
    def get_wind_at(s, t, lat, lon):
        sc = s.sc; h = (t - T0).total_seconds() / 3600; f = max(0, min(1, h / sc['hrs']))
        d = (sc['d0'] + (((sc['d1'] - sc['d0'] + 540) % 360) - 180) * f + 360) % 360; w = sc['w0'] + (sc['w1'] - sc['w0']) * f
        return (d, w * 0.514444)
out = {}
for sc in S:
    res = {}
    for dt in (1/6, 0.05):
        r = W.Routing(LinearBestIsoRouter, pol, [sc['to']], G(sc), T0, start_position=(50, -2)); r.algorithm.set_param_value('min_increase', 1.0)
        n = 0; t1 = time.time()
        while not r.end and n < 2000:
            res_ = r.step(dt); n += 1
        # time of the final path point
        last = r.path[-1] if r.path else None
        tt = None
        if last is not None:
            from weatherrouting import utils as U
            rem = U.point_distance(last.pos[0], last.pos[1], sc['to'][0], sc['to'][1]) - 0.1   # same 0.1 nm finish circle as Route
            # the rest at the best speed made good towards the finish from their polar and wind there (a beat cannot sail straight at it)
            twd, twsm = G(sc).get_wind_at(last.time, last.pos[0], last.pos[1]); tws = twsm / 0.514444
            dy = (sc['to'][0] - last.pos[0]); dx = (sc['to'][1] - last.pos[1]) * math.cos(math.radians(last.pos[0])); brg = math.degrees(math.atan2(dx, dy)) % 360
            vmc = max(pol.get_speed(tws, math.radians(abs(a))) * math.cos(math.radians(((twd + a) - brg + 540) % 360 - 180)) for a in range(-180, 181))
            tt = (last.time - T0).total_seconds() / 3600 + max(0, rem) / vmc
            res['wr_raw_%d' % round(dt * 3600)] = (last.time - T0).total_seconds() / 3600
        res['wr_%d' % round(dt * 3600)] = tt; res['wr_steps_%d' % round(dt * 3600)] = n
        if last is not None: res['wr_end_%d' % round(dt * 3600)] = [round(last.pos[0], 4), round(last.pos[1], 4)]
    out[sc['name']] = res
    print(sc['name'], res, file=sys.stderr)
json.dump(out, open('wr.json', 'w'))
