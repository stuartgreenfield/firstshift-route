/* FirstShift data only for FirstShift's own tools (F27, Stuart 17 Nov 2026 17:45, "Lock data to our sites").
   Runs for the forecast packs, status.json, the course and zone lists and the boat code server (see _routes.json).
   A request that says where it comes from (the Origin or Referer a browser sends) is answered only when that is one of
   FirstShift's own addresses: a copy of the tools on another site gets no forecasts, no marks and no boat codes.
   A request that says nothing (an app, a script) is answered as before. */
const OWN = [/^(?:[a-z0-9-]+\.)*firstshift-route\.pages\.dev$/, /^(?:[a-z0-9-]+\.)*firstshiftsailing\.com$/, /^localhost$/, /^127\.0\.0\.1$/];
export function hostOf(u) { try { return new URL(u).hostname.toLowerCase(); } catch (e) { return null; } }
export function own(h) { return !!h && OWN.some(function (re) { return re.test(h); }); }
export function verdict(origin, referer) {
  if (origin && origin !== 'null') return own(hostOf(origin)) ? 'ok' : 'no';
  if (referer) return own(hostOf(referer)) ? 'ok' : 'no';
  return 'ok';
}
export async function onRequest(ctx) {
  const req = ctx.request, origin = req.headers.get('Origin'), referer = req.headers.get('Referer');
  if (verdict(origin, referer) === 'no') return new Response('FirstShift data is for FirstShift tools only: https://www.firstshiftsailing.com/tools', { status: 403, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'vary': 'Origin, Referer' } });
  const res = await ctx.next();
  if (!origin || origin === 'null') return res;
  const out = new Response(res.body, res);   /* answer our own origins by name instead of to everyone */
  out.headers.set('Access-Control-Allow-Origin', origin); out.headers.set('Vary', 'Origin');
  return out;
}
