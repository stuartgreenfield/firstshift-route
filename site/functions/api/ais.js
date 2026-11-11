/* FirstShift Route live AIS relay (Cloudflare Pages Function at /api/ais).
   aisstream.io does not allow browsers to connect directly, so this function connects for a few seconds, collects the
   positions inside the requested box and returns them as JSON. Replies are cached for 30 seconds per box, so many
   phones share one connection. Needs the environment variable AISSTREAM_KEY (a free key from aisstream.io).
   GET /api/ais?s=49.5&n=51&w=-2.5&e=0.5  ->  { at, targets: [{ mmsi, name, lat, lon, sog, cog, hdg, cls }] } */
export async function onRequestGet({ request, env, waitUntil }) {
  const u = new URL(request.url), q = k => Math.round(parseFloat(u.searchParams.get(k)) * 10) / 10;
  const box = { s: q('s'), n: q('n'), w: q('w'), e: q('e') };
  const json = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=30', 'access-control-allow-origin': '*' } });
  if (![box.s, box.n, box.w, box.e].every(Number.isFinite) || box.n - box.s > 6 || box.e - box.w > 10) return json({ error: 'Send a box no bigger than 6 by 10 degrees: s, n, w, e.' }, 400);
  if (!env.AISSTREAM_KEY) return json({ error: 'Live AIS is not switched on yet: the server has no aisstream.io key.' }, 503);
  const cacheKey = new Request(`https://ais.cache/${box.s}/${box.n}/${box.w}/${box.e}`), cache = caches.default;
  const hit = await cache.match(cacheKey); if (hit) return hit;

  const r = await fetch('https://stream.aisstream.io/v0/stream', { headers: { Upgrade: 'websocket' } });
  const ws = r.webSocket; if (!ws) return json({ error: 'Could not reach aisstream.io' }, 502);
  ws.accept();
  const out = {};
  ws.addEventListener('message', ev => {
    try {
      const m = JSON.parse(typeof ev.data === 'string' ? ev.data : new TextDecoder().decode(ev.data)), md = m.MetaData || {}, b = m.Message || {};
      const p = b.PositionReport || b.StandardClassBPositionReport || b.ExtendedClassBPositionReport;
      const x = out[md.MMSI] || (out[md.MMSI] = { mmsi: md.MMSI });
      if (md.ShipName && md.ShipName.trim()) x.name = md.ShipName.trim();
      if (p) { x.lat = md.latitude ?? p.Latitude; x.lon = md.longitude ?? p.Longitude; x.sog = p.Sog; x.cog = p.Cog; x.hdg = p.TrueHeading === 511 ? null : p.TrueHeading; x.cls = b.PositionReport ? 'A' : 'B'; x.t = md.time_utc; }
      const st = b.ShipStaticData || b.StaticDataReport; if (st) { if (st.Type != null) x.shiptype = st.Type; if (st.ReportB && st.ReportB.ShipType != null) x.shiptype = st.ReportB.ShipType; }
    } catch (e) {}
  });
  ws.send(JSON.stringify({ APIKey: env.AISSTREAM_KEY, BoundingBoxes: [[[box.s, box.w], [box.n, box.e]]],
    FilterMessageTypes: ['PositionReport', 'StandardClassBPositionReport', 'ExtendedClassBPositionReport', 'ShipStaticData', 'StaticDataReport'] }));
  await new Promise(ok => setTimeout(ok, 9000));
  try { ws.close(1000, 'done'); } catch (e) {}
  const targets = Object.values(out).filter(x => x.lat != null);
  const res = json({ at: Date.now(), box, targets });
  waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
