/* FirstShift Route boat code (Cloudflare Pages Function at /api/boat/<code>).
   One short code per boat keeps its boat settings, saved races and crew moments in step across the crew's phones,
   tablets and computers, with no logins. Needs a KV namespace bound to this Pages project as ROUTE_KV.
   GET  /api/boat/ABC123  -> { code, at, data }       PUT  /api/boat/ABC123  body { data }  -> { code, at } */
const OK = /^[A-HJ-NP-Z2-9]{6}$/;   // no I, O, 0 or 1, so codes read clearly aloud
const MAX = 200 * 1024;
const json = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function onRequest({ request, env, params }) {
  const code = String(params.code || '').toUpperCase();
  if (!OK.test(code)) return json({ error: 'A boat code is six letters and numbers.' }, 400);
  if (!env.ROUTE_KV) return json({ error: 'Sharing between devices is not switched on yet.' }, 503);
  const key = 'boat:' + code;
  if (request.method === 'GET') {
    const v = await env.ROUTE_KV.get(key, 'json');
    return v ? json({ code, at: v.at, data: v.data }) : json({ error: 'No boat with that code yet.' }, 404);
  }
  if (request.method === 'PUT') {
    const body = await request.text();
    if (body.length > MAX) return json({ error: 'Too much to share in one boat code.' }, 413);
    let d; try { d = JSON.parse(body).data; } catch (e) { return json({ error: 'Not readable.' }, 400); }
    const at = Date.now();
    await env.ROUTE_KV.put(key, JSON.stringify({ at, data: d }), { expirationTtl: 60 * 60 * 24 * 400 });   // kept for 400 days after the last change
    return json({ code, at });
  }
  return json({ error: 'GET or PUT only.' }, 405);
}
