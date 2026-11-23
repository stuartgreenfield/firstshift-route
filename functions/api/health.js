/* Forecast health (Stuart 20 Nov 17:27: "my main concern is the downloading and management of the grib/weather files. This is the
   critical path ... We need a plan to ensure we know when forecasts have been missed"; docs/FORECAST-MONITORING-PLAN.md step 1).
   GET /api/health  ->  200 "FRESH ..." or 503 "STALE: <area> <model> <age> h ...", one line, for an outside monitor to watch
   (UptimeRobot keyword FRESH). GET /api/health?json for the details.
   For each area it reads the published pack (pack.json): the age of every wind model's run, counted from the run time the forecast
   maker gives it, and when the pack was built. Limits, from the timetables (20 Nov): the server takes each model's 00, 06, 12 or 18Z
   run about 7 h after its time and the job takes up to about 2 h 30 min, so just before the next run lands a global model is normally
   up to about 16 h old; the job runs every 6 h. STALE when a global model is over 20 h, UKV, AROME or MOGREPS over 18 h, or a pack was
   built over 9 h ago. The phone fetches a model itself past 18 h (app.js omFallback), so STALE means crews are already on their own. */
const AREAS = ['channel-area', 'solent-area', 'cervantes', 'fastnet', 'northsea-area', 'irishsea-area', 'biscay-area', 'celtic-area'];   // tasman-area (Sydney Hobart, 21 Nov) left out: it can be switched off (config/areas.json), and an area switched off would show as stale
const REGIONAL = { ukv: 1, arome: 1, mog: 1 };
const LIMIT = { global: 20, regional: 18, built: 9, ecmwf: 22 };   /* ECMWF (23 Nov, Stuart 20:17): only its 00Z and 12Z runs reach the ten days Sydney Hobart needs, so it is taken twice a day, at 07:45 and 19:45; with the 50-minute build it is up to about 21 h old before the next lands */

export function judge(packs, now) {   /* packs: { area: pack.json or null }; now: seconds */
  const bad = [], areas = {};
  for (const a of Object.keys(packs)) {
    const p = packs[a]; if (!p) { bad.push(a + ' pack missing'); areas[a] = { missing: true }; continue; }
    const built = p.built ? (now - p.built) / 3600 : null, models = {};
    if (built == null || built > LIMIT.built) bad.push(a + ' built ' + (built == null ? '?' : built.toFixed(1)) + ' h ago');
    for (const L of p.layers || []) {
      if (L.kind !== 'wind' || !L.run_t0) continue;
      const age = (now - L.run_t0) / 3600, lim = REGIONAL[L.id] ? LIMIT.regional : L.id === 'ecmwf' ? LIMIT.ecmwf : LIMIT.global;
      models[L.id] = { age: Math.round(age * 10) / 10, limit: lim, older: L.latest === false };
      if (age > lim) bad.push(a + ' ' + L.id + ' ' + age.toFixed(1) + ' h');
    }
    areas[a] = { built_h: built == null ? null : Math.round(built * 10) / 10, models };
  }
  return { ok: !bad.length, bad, areas, at: Math.round(now) };
}

export async function onRequestGet({ request, env }) {
  const base = new URL(request.url), packs = {};
  await Promise.all(AREAS.map(async a => {
    try { const r = await env.ASSETS.fetch(new Request(new URL('/' + a + '/pack/pack.json', base))); packs[a] = r.ok ? await r.json() : null; } catch (e) { packs[a] = null; }
  }));
  const j = judge(packs, Date.now() / 1000), head = { 'cache-control': 'no-store', 'access-control-allow-origin': '*' };
  if (base.searchParams.has('json')) return new Response(JSON.stringify(j, null, 1), { status: j.ok ? 200 : 503, headers: { ...head, 'content-type': 'application/json' } });
  const line = j.ok ? 'FRESH: ' + Object.keys(j.areas).length + ' areas, every model within its limit' : 'STALE: ' + j.bad.join('; ');
  return new Response(line + '\n', { status: j.ok ? 200 : 503, headers: { ...head, 'content-type': 'text/plain; charset=utf-8' } });
}
