/* Pre-route each race on the server after a forecast build, so users with the standard settings see routes at once.
   Usage: node scripts/preroute.js <siteDir> <race> [<race> ...]   (serves siteDir on a local port; needs playwright)
   Writes <siteDir>/<race>/pre/routes.json: { built, at, r: { key: { routes, matrix } } } for the next HOURS start times. */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const site = path.resolve(process.argv[2]), races = process.argv.slice(3), HOURS = +(process.env.PRE_HOURS || 6);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm', '.css': 'text/css' };
const srv = http.createServer((q, s) => {
  let f = path.join(site, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(site)) { s.writeHead(403); return s.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  fs.readFile(f, (e, b) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); s.end(b); });
}).listen(0);
const round = (v) => typeof v === 'number' ? Math.round(v * 1e4) / 1e4 : Array.isArray(v) ? v.map(round) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, round(x)])) : v;

(async () => {
  const port = srv.address().port;
  let b; try { b = await chromium.launch(); } catch (e) { console.log('bundled browser failed, using the runner Chrome:', e.message.split('\n')[0]); b = await chromium.launch({ channel: 'chrome' }); }
  const OUTS = {};
  for (const arg of races) {
    /* "page" routes the page's own course; "page:race" routes one race held on that page (fewer start times) */
    const [race, rid] = arg.split(':'), hours = rid ? +(process.env.PRE_HOURS_RACE || 3) : HOURS;
    if (!OUTS[race]) fs.rmSync(path.join(site, race, 'pre'), { recursive: true, force: true });
    const meta = JSON.parse(fs.readFileSync(path.join(site, race, 'pack', 'pack.json')));
    const out = OUTS[race] || (OUTS[race] = { built: meta.built || meta.t0, at: Math.round(Date.now() / 1000), r: {}, log: [] }), log = out.log, t0 = Date.now();
    const p = await b.newPage(); p.on('pageerror', (e) => console.log(race, 'page error', e.message));
    await p.addInitScript(() => { try { localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); } catch (e) {} });
    await p.goto(`http://localhost:${port}/${race}/` + (rid ? '?race=' + rid : ''));
    const note = () => p.evaluate(() => document.getElementById('runNote').textContent);
    const waitDone = () => p.waitForFunction(() => { const t = document.getElementById('runNote').textContent; return /First answer|Routed on the server/.test(t) || (!/Quick route|Refining/.test(t) && /No route|Cannot|outside|No way|forecasts end/.test(t)); }, null, { timeout: +(process.env.PRE_WAIT_MS || 1500000) });
    try {
      await waitDone();   // the page routes the first start time by itself once the forecasts are in
      for (let h = 0; h < hours; h++) {
        if (h > 0) {
          const ok = await p.evaluate((h) => { const s = document.getElementById('startSel'); if (h >= s.options.length) return false; s.selectedIndex = h; s.dispatchEvent(new Event('change', { bubbles: true })); document.getElementById('runNote').textContent = ''; document.getElementById('run').click(); return true; }, h);
          if (!ok) break;
          await waitDone();
        }
        const d = await p.evaluate(() => window.__fsDump());
        const nt = (await note()).slice(0, 120); console.log(race, 'start', h, nt); log.push({ race: rid || race, h, s: Math.round((Date.now() - t0) / 1000), note: nt });
        if (d) out.r[d.key] = round({ routes: d.routes, matrix: d.matrix });
      }
    } catch (e) { console.log(race, 'pre-routing stopped:', e.message); log.push({ race: rid || race, stopped: e.message.slice(0, 200), s: Math.round((Date.now() - t0) / 1000) }); }
    await p.close();
    if (Object.keys(out.r).length) {
      fs.mkdirSync(path.join(site, race, 'pre'), { recursive: true });
      fs.writeFileSync(path.join(site, race, 'pre', 'routes.json'), JSON.stringify({ built: out.built, at: out.at, r: out.r }));
      fs.writeFileSync(path.join(site, race, 'pre', 'log.json'), JSON.stringify({ at: new Date().toISOString(), log }, null, 1));   // readable on the live site, as GitHub's log download is not always reachable
      console.log(race, 'wrote', Object.keys(out.r).length, 'start times', (fs.statSync(path.join(site, race, 'pre', 'routes.json')).size / 1e6).toFixed(2), 'MB');
    }
  }
  await b.close(); srv.close();
})();
