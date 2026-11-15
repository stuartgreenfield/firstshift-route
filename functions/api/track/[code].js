/* FirstShift Route: where the boat is, for friends and family (Cloudflare Pages Function at /api/track/<code>).
   The boat's own devices post its GPS position and its planned route under the boat code; the follow page reads them.
   Only someone with the six-letter code can see the boat. Uses the same KV namespace as the boat code (ROUTE_KV).
   GET  /api/track/ABC123                      -> { code, name, at, track: [[t, lat, lon, sog], ...], route: { at, name, path: [[lat, lon], ...], finish } }
   POST /api/track/ABC123  { pos: [t, lat, lon, sog], name }      adds a position (at most one a minute is kept, last 3000)
   POST /api/track/ABC123  { route: { name, path, finish } }       replaces the planned route */
const OK = /^[A-HJ-NP-Z2-9]{6}$/;
const json = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*' } });
const num = (x, lo, hi) => typeof x === 'number' && isFinite(x) && x >= lo && x <= hi;

export async function onRequest({ request, env, params }) {
  const code = String(params.code || '').toUpperCase();
  if (!OK.test(code)) return json({ error: 'A boat code is six letters and numbers.' }, 400);
  if (!env.ROUTE_KV) return json({ error: 'Following is not switched on yet.' }, 503);
  const key = 'track:' + code;
  const cur = (await env.ROUTE_KV.get(key, 'json')) || { track: [] };
  if (request.method === 'GET') return cur.at ? json({ code, name: cur.name || '', at: cur.at, track: cur.track || [], route: cur.route || null }) : json({ error: 'Nothing shared under that code yet.' }, 404);
  if (request.method !== 'POST') return json({ error: 'GET or POST only.' }, 405);
  const body = await request.text();
  if (body.length > 120 * 1024) return json({ error: 'Too much in one go.' }, 413);
  let d; try { d = JSON.parse(body); } catch (e) { return json({ error: 'Not readable.' }, 400); }
  const now = Date.now();
  if (d.pos) {
    const [t, la, lo, sog] = d.pos;
    if (!num(t, now / 1000 - 86400, now / 1000 + 600) || !num(la, -90, 90) || !num(lo, -180, 180)) return json({ error: 'Not a position.' }, 400);
    const tr = cur.track || [], last = tr[tr.length - 1];
    if (!last || t - last[0] >= 60) tr.push([Math.round(t), +la.toFixed(5), +lo.toFixed(5), num(sog, 0, 60) ? +sog.toFixed(1) : null]);
    cur.track = tr.slice(-3000);
  }
  if (d.route && Array.isArray(d.route.path)) {
    const path = d.route.path.filter(p => Array.isArray(p) && num(p[0], -90, 90) && num(p[1], -180, 180)).slice(0, 1500).map(p => [+p[0].toFixed(4), +p[1].toFixed(4)]);
    cur.route = { at: now, name: String(d.route.name || '').slice(0, 80), path, finish: num(d.route.finish, 0, 9e9) ? d.route.finish : null };
  }
  if (typeof d.name === 'string') cur.name = d.name.slice(0, 60);
  cur.at = now;
  await env.ROUTE_KV.put(key, JSON.stringify(cur), { expirationTtl: 60 * 60 * 24 * 60 });   // kept for 60 days after the last update
  return json({ code, at: now, points: (cur.track || []).length });
}
