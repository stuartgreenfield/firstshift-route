/* FirstShift Route live AIS relay (Cloudflare Pages Function at /api/ais).
   aisstream.io does not allow browsers to connect directly, so this function connects for a few seconds, collects the
   positions inside the requested box and returns them as JSON. Replies are cached for 30 seconds per box, so many
   phones share one connection. Needs the environment variable AISSTREAM_KEY (a free key from aisstream.io).
   aisstream is a free, volunteer-fed feed and only allows 3 connections per account, so each reply also merges what was
   heard on earlier visits to the same area (kept for 20 minutes, names and ship types for 6 hours): Class B yachts report
   every 30 s to 3 minutes and names only every 6 minutes, so one short listen misses most of them.
   GET /api/ais?s=49.5&n=51&w=-2.5&e=0.5  ->  { at, targets: [{ mmsi, name, lat, lon, sog, cog, hdg, cls }] } */
export async function onRequestGet({ request, env, waitUntil }) {
  const u = new URL(request.url), q = k => Math.round(parseFloat(u.searchParams.get(k)) * 10) / 10;
  const box = { s: q('s'), n: q('n'), w: q('w'), e: q('e') };
  const json = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=30', 'access-control-allow-origin': '*' } });
  if (![box.s, box.n, box.w, box.e].every(Number.isFinite) || box.n - box.s > 6 || box.e - box.w > 10) return json({ error: 'Send a box no bigger than 6 by 10 degrees: s, n, w, e.' }, 400);
  if (!env.AISSTREAM_KEY) return json({ error: 'Live AIS is not switched on yet: the server has no aisstream.io key.' }, 503);
  const cacheKey = new Request(`https://ais.cache/${box.s}/${box.n}/${box.w}/${box.e}`), cache = caches.default;
  const hit = !u.searchParams.has('debug') && await cache.match(cacheKey); if (hit) return hit;

  const dbg0 = {};
  const accKey = new Request(`https://ais.acc/${box.s}/${box.n}/${box.w}/${box.e}`);
  const prevRes = await cache.match(accKey); const prev = prevRes ? await prevRes.json().catch(() => ({})) : {};
  const r = await fetch('https://stream.aisstream.io/v0/stream', { headers: { Upgrade: 'websocket' } });
  dbg0.status = r.status;
  const ws = r.webSocket; dbg0.ws = !!ws; if (!ws) return json({ error: 'Could not reach aisstream.io' }, 502);
  ws.accept();
  const out = {}, dbg = Object.assign({ msgs: 0, other: [] }, dbg0);
  ws.addEventListener('close', ev => { dbg.close = [ev.code, ev.reason]; });
  ws.addEventListener('error', ev => { dbg.err = String(ev && (ev.message || ev.error || ev.type)); });
  ws.addEventListener('message', async ev => {
    dbg.raw = (dbg.raw || 0) + 1; if (!dbg.t) dbg.t = typeof ev.data + ' ' + (ev.data && ev.data.constructor && ev.data.constructor.name);
    try {
      const txt = typeof ev.data === 'string' ? ev.data : ev.data && typeof ev.data.text === 'function' ? await ev.data.text() : new TextDecoder().decode(ev.data);   // aisstream sends each message as binary (a Blob here)
      const m = JSON.parse(txt), md = m.MetaData || {}, b = m.Message || {};
      dbg.msgs++; if (!m.MetaData && dbg.other.length < 3) dbg.other.push(m);
      const p = b.PositionReport || b.StandardClassBPositionReport || b.ExtendedClassBPositionReport || b.AidsToNavigationReport || b.StandardSearchAndRescueAircraftReport;
      const x = out[md.MMSI] || (out[md.MMSI] = { mmsi: md.MMSI });
      if (md.ShipName && md.ShipName.trim()) x.name = md.ShipName.trim();
      if (p) { x.lat = md.latitude ?? p.Latitude; x.lon = md.longitude ?? p.Longitude; x.sog = p.Sog; x.cog = p.Cog; x.hdg = p.TrueHeading === 511 ? null : p.TrueHeading; x.cls = b.PositionReport ? 'A' : b.AidsToNavigationReport ? 'AtoN' : b.StandardSearchAndRescueAircraftReport ? 'SAR' : 'B'; if (b.AidsToNavigationReport) { x.aton = 1; if (p.Name) x.name = String(p.Name).trim(); } if (b.StandardSearchAndRescueAircraftReport) x.aircraft = 1; x.t = md.time_utc; x.seen = Date.now(); }
      const st = b.ShipStaticData || b.StaticDataReport; if (st) { if (st.Type != null) x.shiptype = st.Type; if (st.ReportB && st.ReportB.ShipType != null) x.shiptype = st.ReportB.ShipType; if (st.Destination) x.dest = String(st.Destination).trim(); x.stat = Date.now(); }
    } catch (e) { dbg.perr = String(e).slice(0, 120); }
  });
  ws.send(JSON.stringify({ APIKey: env.AISSTREAM_KEY, BoundingBoxes: [[[box.s, box.w], [box.n, box.e]]],
    FilterMessageTypes: ['PositionReport', 'StandardClassBPositionReport', 'ExtendedClassBPositionReport', 'ShipStaticData', 'StaticDataReport', 'AidsToNavigationReport', 'StandardSearchAndRescueAircraftReport'] }));
  await new Promise(ok => setTimeout(ok, 14000));
  try { ws.close(1000, 'done'); } catch (e) {}
  /* merge with what this area heard before: positions kept 20 min (marks 6 h), names and types 6 h */
  const now = Date.now(), POS = 20 * 60000, STAT = 6 * 3600000;
  Object.keys(prev).forEach(k => {
    const o = prev[k], x = out[k];
    if (!x) { if ((o.aton && now - (o.seen || 0) < STAT) || now - (o.seen || 0) < POS || now - (o.stat || 0) < STAT) out[k] = o; return; }
    ['name', 'shiptype', 'dest', 'stat'].forEach(f => { if (x[f] == null && o[f] != null) x[f] = o[f]; });
    if (x.lat == null && o.lat != null && now - (o.seen || 0) < POS) ['lat', 'lon', 'sog', 'cog', 'hdg', 'cls', 't', 'seen', 'aton', 'aircraft'].forEach(f => { if (o[f] != null) x[f] = o[f]; });
  });
  waitUntil(cache.put(accKey, new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=21600' } })));
  const targets = Object.values(out).filter(x => x.lat != null && (x.aton || now - (x.seen || 0) < POS)).map(x => Object.assign({}, x, { age: Math.round((now - (x.seen || now)) / 1000) }));
  const res = json(u.searchParams.has('debug') ? { at: Date.now(), box, targets, dbg } : { at: Date.now(), box, targets });
  waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
