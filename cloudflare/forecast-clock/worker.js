/* FirstShift forecast clock (Stuart 21 Nov 2026 10:39, docs/SERVER-RESILIENCE.md option B).
   GitHub's own schedule "can be delayed during periods of high loads ... some queued jobs may be dropped" (GitHub Docs); on 21 Nov the
   07:17 UTC run started at 08:19. This Worker, on Cloudflare's clock, starts the Forecasts workflow at the planned times, and starts it
   again if no run has begun ten minutes later. GitHub's own schedule stays as the back-up; the workflow's gate job and its single queue
   stop a second run from doing the work twice.
   Secrets (set by Stuart in Cloudflare, never in this file): GH_TOKEN, a fine-grained GitHub token for stuartgreenfield/firstshift-route
   with "Actions: Read and write" only.
   Cron Triggers (Cloudflare, UTC): 20 1,7,13,19 * * *  and  32 1,7,13,19 * * *   (the planned start, then the ten-minute check). */
const REPO = 'stuartgreenfield/firstshift-route', WF = 'forecast.yml';
const gh = (env, path, init = {}) => fetch('https://api.github.com/repos/' + REPO + path, { ...init, headers: { authorization: 'Bearer ' + env.GH_TOKEN, accept: 'application/vnd.github+json', 'user-agent': 'firstshift-forecast-clock', 'x-github-api-version': '2022-11-28', ...(init.headers || {}) } });
async function recentRun(env, mins) {
  const r = await gh(env, '/actions/workflows/' + WF + '/runs?branch=main&per_page=5'); if (!r.ok) throw new Error('runs ' + r.status);
  const j = await r.json(), since = Date.now() - mins * 60000;
  return (j.workflow_runs || []).find(x => Date.parse(x.created_at) > since && x.conclusion !== 'cancelled') || null;
}
async function tick(env, why) {
  const run = await recentRun(env, why === 'check' ? 25 : 15);
  if (run) return 'a run already started at ' + run.created_at + ' (' + run.status + '): nothing to do';
  const r = await gh(env, '/actions/workflows/' + WF + '/dispatches', { method: 'POST', body: JSON.stringify({ ref: 'main' }) });
  return r.status === 204 ? 'started a Forecasts run (' + why + ')' : 'could not start a run: GitHub said ' + r.status + ' ' + (await r.text()).slice(0, 200);
}
export default {
  async scheduled(ev, env, ctx) { const why = new Date(ev.scheduledTime).getUTCMinutes() >= 30 ? 'check' : 'planned'; ctx.waitUntil(tick(env, why).then(m => console.log(m), e => console.log('error: ' + e.message))); },
  async fetch(req, env) { const u = new URL(req.url); if (u.pathname !== '/status') return new Response('FirstShift forecast clock\n', { headers: { 'content-type': 'text/plain' } });
    try { const run = await recentRun(env, 360); return new Response((run ? 'last run ' + run.created_at + ' ' + run.status + ' ' + (run.conclusion || '') : 'no run in the last 6 hours') + '\n', { headers: { 'content-type': 'text/plain' } }); } catch (e) { return new Response('error ' + e.message + '\n', { status: 500 }); } }
};
