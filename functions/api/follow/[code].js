/* FirstShift Route: the family's view-only follow code (Cloudflare Pages Function at /api/follow/<follow code>), Stuart 20 Nov 2026 06:25.
   Reads the boat's track and planned route; cannot post, and never answers with the crew's boat code.
   GET /api/follow/ABCD2345 -> { name, at, track: [[t, lat, lon, sog], ...], route } */
const OK = /^[A-HJ-NP-Z2-9]{8}$/;
const json = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*' } });
export async function onRequest({ request, env, params }) {
  if (request.method !== 'GET') return json({ error: 'GET only.' }, 405);
  const f = String(params.code || '').toUpperCase();
  if (!OK.test(f)) return json({ error: 'A follow code is eight letters and numbers.' }, 400);
  if (!env.ROUTE_KV) return json({ error: 'Following is not switched on yet.' }, 503);
  const code = await env.ROUTE_KV.get('follow:' + f); if (!code) return json({ error: 'No boat with that follow code.' }, 404);
  const cur = await env.ROUTE_KV.get('track:' + code, 'json'); if (!cur || !cur.at) return json({ error: 'Nothing shared yet.' }, 404);
  return json({ name: cur.name || '', at: cur.at, track: cur.track || [], route: cur.route || null });
}
