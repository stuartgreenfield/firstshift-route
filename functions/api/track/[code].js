/* FirstShift Route: where the boat is, for friends and family (Cloudflare Pages Function at /api/track/<boat code>).
   The boat's own devices post its GPS positions and its planned route under the crew's boat code; family read them with a separate
   view-only follow code (/api/follow/<follow code>), so the follow link never carries the crew's code (Stuart 20 Nov 2026 06:25).
   Uses the same KV namespace as the boat code (ROUTE_KV).
   GET  /api/track/ABC123                                  -> { code, follow, name, at, track: [[t, lat, lon, sog], ...], route }  (crew)
   POST /api/track/ABC123  { pos: [t, lat, lon, sog], name }  adds a position (at most one a minute is kept, last 3000)
   POST /api/track/ABC123  { pts: [[t, lat, lon, sog], ...] } adds positions kept on the phone while it had no signal (20 Nov), oldest first
   POST /api/track/ABC123  { route: { name, path, finish } }  replaces the planned route
   Every answer to the crew carries the follow code, made once per boat code: eight characters, never the boat code itself. */
const OK = /^[A-HJ-NP-Z2-9]{6}$/, A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const json = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*' } });
const num = (x, lo, hi) => typeof x === 'number' && isFinite(x) && x >= lo && x <= hi;
async function followOf(env, code) {
  let f = await env.ROUTE_KV.get('followof:' + code); if (f) return f;
  const r = new Uint32Array(8); crypto.getRandomValues(r); f = Array.from(r, x => A[x % 32]).join('');
  await env.ROUTE_KV.put('followof:' + code, f); await env.ROUTE_KV.put('follow:' + f, code); return f;
}

export async function onRequest({ request, env, params }) {
  const code = String(params.code || '').toUpperCase();
  if (!OK.test(code)) return json({ error: 'A boat code is six letters and numbers.' }, 400);
  if (!env.ROUTE_KV) return json({ error: 'Following is not switched on yet.' }, 503);
  const key = 'track:' + code;
  const cur = (await env.ROUTE_KV.get(key, 'json')) || { track: [] };
  if (request.method === 'GET') { if (!cur.at) return json({ error: 'Nothing shared under that code yet.' }, 404); return json({ code, follow: await followOf(env, code), name: cur.name || '', at: cur.at, track: cur.track || [], route: cur.route || null }); }
  if (request.method !== 'POST') return json({ error: 'GET or POST only.' }, 405);
  const body = await request.text();
  if (body.length > 120 * 1024) return json({ error: 'Too much in one go.' }, 413);
  let d; try { d = JSON.parse(body); } catch (e) { return json({ error: 'Not readable.' }, 400); }
  const now = Date.now(), tr = cur.track || [];
  const add = (p) => { if (!Array.isArray(p)) return false; const [t, la, lo, sog] = p; if (!num(t, now / 1000 - 7 * 86400, now / 1000 + 600) || !num(la, -90, 90) || !num(lo, -180, 180)) return false;
    const last = tr[tr.length - 1]; if (!last || t - last[0] >= 60) tr.push([Math.round(t), +la.toFixed(5), +lo.toFixed(5), num(sog, 0, 60) ? +sog.toFixed(1) : null]); return true; };
  if (d.pos && !add(d.pos)) return json({ error: 'Not a position.' }, 400);
  if (Array.isArray(d.pts)) d.pts.slice(0, 2000).sort((a, b) => (a && a[0]) - (b && b[0])).forEach(add);
  cur.track = tr.slice(-3000);
  if (d.route && Array.isArray(d.route.path)) {
    const path = d.route.path.filter(p => Array.isArray(p) && num(p[0], -90, 90) && num(p[1], -180, 180)).slice(0, 1500).map(p => [+p[0].toFixed(4), +p[1].toFixed(4)]);
    cur.route = { at: now, name: String(d.route.name || '').slice(0, 80), path, finish: num(d.route.finish, 0, 9e9) ? d.route.finish : null };
  }
  if (typeof d.name === 'string') cur.name = d.name.slice(0, 60);
  cur.at = now;
  await env.ROUTE_KV.put(key, JSON.stringify(cur), { expirationTtl: 60 * 60 * 24 * 60 });   // kept for 60 days after the last update
  return json({ code, follow: await followOf(env, code), at: now, points: cur.track.length });
}
