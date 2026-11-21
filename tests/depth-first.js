/* F111 (Stuart 21 Nov 12:22, slow connection, depth contours late): on a slow line the depth file comes first and the wind files after it.
   Run: node tests/depth-first.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 14'], serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); } });
  const p = await c.newPage(); const cdp = await c.newCDPSession(p); await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 2e6 / 8, uploadThroughput: 5e5 / 8 });   /* a slow 2 Mbit/s line */
  const t0 = Date.now(), ev = []; p.on('request', r => { if (/\/pack\//.test(r.url())) ev.push(['start', r.url().split('/pack/')[1], Date.now() - t0]); }); p.on('requestfinished', r => { if (/\/pack\//.test(r.url())) ev.push(['end', r.url().split('/pack/')[1], Date.now() - t0]); });
  await p.goto(BASE + '/channel-area/', { timeout: 120000 }); await p.waitForTimeout(60000);
  const meta = await p.evaluate(async () => (await (await fetch('pack/pack.json')).json()).layers.map(L => [L.kind, (L.lite || {}).file, (L.full || {}).file]));
  const depthFiles = new Set(meta.filter(m => m[0] === 'depth').flatMap(m => m.slice(1)).filter(Boolean)), windFiles = new Set(meta.filter(m => m[0] === 'wind').flatMap(m => m.slice(1)).filter(Boolean));
  const dEnd = ev.filter(e => e[0] === 'end' && depthFiles.has(e[1])).map(e => e[2])[0], wStart = ev.filter(e => e[0] === 'start' && windFiles.has(e[1])).map(e => e[2]), wEnd = ev.filter(e => e[0] === 'end' && windFiles.has(e[1])).map(e => e[2]);
  ok(dEnd != null, 'The depth file downloaded', dEnd + ' ms');
  ok(dEnd != null && wStart.length && Math.min(...wStart) >= dEnd - 50, 'The wind files start after the depth is in', 'depth in at ' + dEnd + ' ms, first wind file asked at ' + Math.min(...wStart) + ' ms');
  ok(wEnd.length && dEnd < Math.max(...wEnd), 'The depth is in well before the forecasts finish', 'last wind file in at ' + (wEnd.length ? Math.max(...wEnd) : '?') + ' ms');
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
