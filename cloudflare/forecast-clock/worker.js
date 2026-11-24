/* FirstShift forecast clock (Stuart 21 Nov 2026 10:39, docs/SERVER-RESILIENCE.md option B).
   GitHub's own schedule "can be delayed during periods of high loads ... some queued jobs may be dropped" (GitHub Docs); on 21 Nov the
   07:17 UTC run started at 08:19, and on 24 Nov the 08:17 run started at 12:29 and the 14:17 and 14:47 runs never started. This Worker,
   on Cloudflare's clock, starts the Forecasts workflow at the planned times, and starts it again if no run has begun ten minutes later.
   GitHub's own schedule stays as the back-up; the workflow's gate job and its single queue stop a second run from doing the work twice.
   Secrets (set by Stuart in Cloudflare, never in this file): GH_TOKEN, a fine-grained GitHub token for stuartgreenfield/firstshift-route
   with "Actions: Read and write" only.
   Cron Triggers (Cloudflare, UTC): 45 1,4,7,13,19 * * *  and  57 1,4,7,13,19 * * *  (the planned start, then the check); 23 Nov (Stuart
   20:17): moved from 20 and 32 past, which came 14 minutes before ECMWF's 00Z and 12Z reached the AWS copy (07:34 and 19:34 UTC). And,
   for the new-run watcher below, every 15 minutes: the cron written "*" "/15" with no space between, then "* * * *".

   New-run watcher (Stuart 24 Nov 2026 19:06, "Go"): every 15 minutes, ask each provider whether a model run newer than the one on the
   site is complete (the last hour the router needs is published), and if so start a Forecasts run. Variable WATCH: "log" (or unset)
   only records what it would have done, for a day beside the planned times; "start" lets it start runs. A KV namespace bound as LOG
   keeps the last checks; /watch shows a check made now and that log. */
const REPO = 'stuartgreenfield/firstshift-route', WF = 'forecast.yml', SITE = 'https://firstshift-route.pages.dev';
const gh = (env, path, init = {}) => fetch('https://api.github.com/repos/' + REPO + path, { ...init, headers: { authorization: 'Bearer ' + env.GH_TOKEN, accept: 'application/vnd.github+json', 'user-agent': 'firstshift-forecast-clock', 'x-github-api-version': '2022-11-28', ...(init.headers || {}) } });
async function recentRun(env, mins, orRunning) {
  const r = await gh(env, '/actions/workflows/' + WF + '/runs?branch=main&per_page=5'); if (!r.ok) throw new Error('runs ' + r.status);
  const j = await r.json(), since = Date.now() - mins * 60000;
  return (j.workflow_runs || []).find(x => (orRunning && x.status !== 'completed') || (Date.parse(x.created_at) > since && x.conclusion !== 'cancelled')) || null;
}
async function start(env, why) {
  const r = await gh(env, '/actions/workflows/' + WF + '/dispatches', { method: 'POST', body: JSON.stringify({ ref: 'main' }) });
  return r.status === 204 ? 'started a Forecasts run (' + why + ')' : 'could not start a run: GitHub said ' + r.status + ' ' + (await r.text()).slice(0, 200);
}
async function tick(env, why) {
  const run = await recentRun(env, why === 'check' ? 25 : 15);
  if (run) return 'a run already started at ' + run.created_at + ' (' + run.status + '): nothing to do';
  return start(env, why);
}

/* ---------- the new-run watcher ---------- */
const p2 = n => String(n).padStart(2, '0');
function cyc(hoursAgo) { const t = new Date(Date.now() - hoursAgo * 3600000); t.setUTCMinutes(0, 0, 0); t.setUTCHours(t.getUTCHours() - t.getUTCHours() % 6);
  return { d: t.getUTCFullYear() + p2(t.getUTCMonth() + 1) + p2(t.getUTCDate()), r: p2(t.getUTCHours()) }; }
const ecStream = c => (c.r === '00' || c.r === '12') ? 'oper' : 'scda';   // ECMWF open data: 00Z and 12Z are "oper", 06Z and 18Z "scda"
/* A late file of each run, at the same providers as scripts/fetch.py: when it is there, the run is complete enough for the build. */
const LAST = {
  gfs: c => `https://noaa-gfs-bdp-pds.s3.amazonaws.com/gfs.${c.d}/${c.r}/atmos/gfs.t${c.r}z.pgrb2.0p25.f120.idx`,
  ecmwf: c => `https://ecmwf-forecasts.s3.eu-central-1.amazonaws.com/${c.d}/${c.r}z/ifs/0p25/${ecStream(c)}/${c.d}${c.r}0000-90h-${ecStream(c)}-fc.index`,
  aifs: c => `https://ecmwf-forecasts.s3.eu-central-1.amazonaws.com/${c.d}/${c.r}z/aifs-single/0p25/oper/${c.d}${c.r}0000-90h-oper-fc.index`,
  icon: c => `https://opendata.dwd.de/weather/nwp/icon-eu/grib/${c.r}/u_10m/icon-eu_europe_regular-lat-lon_single-level_${c.d}${c.r}_078_U_10M.grib2.bz2`,
  arome: c => { const iso = `${c.d.slice(0, 4)}-${c.d.slice(4, 6)}-${c.d.slice(6)}T${c.r}:00:00Z`; return `https://meteofrance-pnt.s3.rbx.io.cloud.ovh.net/pnt/${iso}/arome/001/SP1/arome__001__SP1__48H__${iso}.grib2`; }
};
async function exists(u) { try { const r = await fetch(u, { method: 'HEAD', cf: { cacheTtl: 0 } }); return r.ok; } catch (e) { return false; } }
async function siteRuns() {   // the run each model has on the site now (status.json, written by every Forecasts run)
  const r = await fetch(SITE + '/status.json?w=' + Date.now(), { cf: { cacheTtl: 0 } }); if (!r.ok) throw new Error('site status ' + r.status);
  const j = await r.json(), out = {}; Object.keys(LAST).forEach(id => { const x = (j.received || {})[id]; if (x && x.run) out[id] = String(x.run); }); return out;
}
async function watch(env) {
  const have = await siteRuns(), newer = [];
  for (const id of Object.keys(LAST)) {
    for (let k = 0; k < 4; k++) {   // the newest of the last four runs whose late file is out
      const c = cyc(k * 6), run = c.d + c.r;
      if (have[id] && run <= have[id]) break;
      if (await exists(LAST[id](c))) { newer.push(id + ' ' + run + ' (site ' + (have[id] || 'none') + ')'); break; }
    }
  }
  let act = 'nothing newer than the site (' + Object.keys(have).map(k => k + ' ' + have[k]).join(', ') + ')';
  if (newer.length) {
    const busy = await recentRun(env, 40, true);
    if (busy) act = 'newer: ' + newer.join(', ') + '; a Forecasts run is under way or started at ' + busy.created_at;
    else act = env.WATCH === 'start' ? await start(env, 'new run: ' + newer.join(', ')) : 'WOULD START (log only): ' + newer.join(', ');
  }
  const line = new Date().toISOString().slice(0, 16) + 'Z ' + act;
  if (env.LOG) { const old = (await env.LOG.get('watch')) || ''; await env.LOG.put('watch', (line + '\n' + old).slice(0, 20000)); }
  return line;
}
export default {
  async scheduled(ev, env, ctx) {
    if (ev.cron && ev.cron.indexOf('/15') >= 0) { ctx.waitUntil(watch(env).then(m => console.log(m), e => console.log('watch error: ' + e.message))); return; }
    const why = new Date(ev.scheduledTime).getUTCMinutes() >= 50 ? 'check' : 'planned'; ctx.waitUntil(tick(env, why).then(m => console.log(m), e => console.log('error: ' + e.message))); },
  async fetch(req, env) { const u = new URL(req.url);
    if (u.pathname === '/watch') { try { const now = await watch(Object.assign({}, env, { WATCH: 'log', LOG: null })); const log = env.LOG ? (await env.LOG.get('watch')) || '' : '(no LOG store bound yet)'; return new Response('now: ' + now + '\n\n' + log + '\n', { headers: { 'content-type': 'text/plain' } }); } catch (e) { return new Response('error ' + e.message + '\n', { status: 500 }); } }
    if (u.pathname !== '/status') return new Response('FirstShift forecast clock\n', { headers: { 'content-type': 'text/plain' } });
    try { const run = await recentRun(env, 360); return new Response((run ? 'last run ' + run.created_at + ' ' + run.status + ' ' + (run.conclusion || '') : 'no run in the last 6 hours') + '\n', { headers: { 'content-type': 'text/plain' } }); } catch (e) { return new Response('error ' + e.message + '\n', { status: 500 }); } }
};
