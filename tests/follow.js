/* Share with family and friends (Stuart 20 Nov 05:47; decided 06:25: a separate view-only follow code, positions kept with no signal and
   sent later, every 15 minutes, the viewer's own time with the zone named). A crew phone with a boat code and the box ticked sends the boat's
   GPS position and the chosen route; the follow link carries the follow code, never the boat code; the follow page shows the track, the route,
   the boat name and the finish. Uses the test server's stand-ins for /api/track and /api/follow.
   Run: node tests/follow.js http://localhost:8779 [/cervantes/] */
const { chromium, devices } = require('playwright'); const fs = require('fs'); const BASE = process.argv[2] || 'http://localhost:8779', PG = process.argv[3] || '/cervantes/';
const LF = '/tmp/claude-0/lf/node_modules/leaflet/dist/';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const CODE = 'TEST' + 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)] + '3';
  const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', geolocation: { latitude: 50.7700, longitude: -1.3000 }, permissions: ['geolocation'] });
  await c.addInitScript((CODE) => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); localStorage.setItem('fs-boatcode', CODE); }, CODE);
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); const posts = []; p.on('request', r => { if (/\/api\/track\//.test(r.url()) && r.method() === 'POST') posts.push(JSON.parse(r.postData() || '{}')); });
  await p.goto(BASE + PG); await p.waitForFunction(() => document.querySelectorAll('#finBox .fin').length > 0, null, { timeout: 300000 });
  await p.evaluate(() => { document.getElementById('boatName').value = 'Morning After'; const cb = document.getElementById('shareTrack'); cb.checked = true; cb.dispatchEvent(new Event('change')); }); await p.waitForTimeout(4000);
  const pos = posts.find(q => q.pts && q.pts.length), rt = posts.find(q => q.route);
  ok(pos && Math.abs(pos.pts[0][1] - 50.77) < 1e-4 && Math.abs(pos.pts[0][2] + 1.3) < 1e-4 && pos.name === 'Morning After', 'ticking the box sends the GPS position and the boat name', pos);
  ok(rt && rt.route.path.length > 10 && rt.route.finish > 0, 'and the chosen route with its finish time', rt && { pts: rt.route.path.length, name: rt.route.name });
  ok(await p.evaluate(() => window.__fsTrackQ()) === 0, 'sent positions leave the phone\'s queue');
  ok(/every 15 minutes/.test(await p.evaluate(() => document.getElementById('shareNote').textContent)), 'Settings says every 15 minutes');
  /* no signal: kept, then sent when the signal returns */
  await c.setOffline(true); await p.evaluate(() => window.dispatchEvent(new Event('offline')));
  await c.setGeolocation({ latitude: 50.70, longitude: -1.50 }); await p.evaluate(() => window.__fsTrackSend()); await p.waitForTimeout(1500);
  await c.setGeolocation({ latitude: 50.65, longitude: -1.70 }); await p.evaluate(() => window.__fsTrackSend()); await p.waitForTimeout(1500);
  const held = await p.evaluate(() => window.__fsTrackQ()); const nPosts = posts.length;
  await c.setOffline(false); await p.evaluate(() => window.dispatchEvent(new Event('online'))); await p.waitForTimeout(2500);
  const batch = posts.slice(nPosts).find(q => q.pts && q.pts.length >= 2);
  ok(held === 2 && batch && await p.evaluate(() => window.__fsTrackQ()) === 0, 'no signal: two positions kept on the phone, then sent together when the signal returns', { held, sent: batch && batch.pts.length });
  /* the follow link the crew send */
  let shared = null; await p.evaluate(() => { navigator.share = (o) => { window.__shared = o; return Promise.resolve(); }; document.getElementById('shareLink').click(); }); await p.waitForTimeout(1500); shared = await p.evaluate(() => window.__shared);
  const link = shared && (shared.text.match(/https?:\/\/\S+/) || [])[0], F = link && (link.match(/[?&]f=([A-Z2-9]{8})$/) || [])[1];
  ok(shared && /Follow Morning After on FirstShift Route/.test(shared.text) && F && link.indexOf(CODE) < 0, 'Send the follow link: an eight-character follow code, not the crew\'s boat code', shared && shared.text);
  /* the follow code can only watch */
  const w = await p.request.post(BASE + '/api/follow/' + F, { data: { pos: [Date.now() / 1000, 50, -2, 5] } }); ok(w.status() === 405, 'the follow code cannot post a position', w.status());
  const fj = await (await p.request.get(BASE + '/api/follow/' + F)).json(); ok(fj.name === 'Morning After' && fj.track.length >= 1 && !JSON.stringify(fj).includes(CODE), 'the follow code reads the boat, and its answer never holds the boat code', { name: fj.name, track: fj.track.length });
  /* unticked: nothing more is sent */
  const n0 = posts.length; await p.evaluate(() => { const cb = document.getElementById('shareTrack'); cb.checked = false; cb.dispatchEvent(new Event('change')); window.__fsTrackSend(); }); await p.waitForTimeout(1500);
  ok(posts.length === n0, 'unticked: nothing is sent');
  /* family: the follow page as it will be released (Leaflet from a local copy, map tiles left out), in London time */
  const f = await b.newContext({ ...devices['iPhone 13'], timezoneId: 'Europe/London' }); const fp = await f.newPage(); const ferr = []; fp.on('pageerror', e => ferr.push(e.message));
  await fp.route(/\/follow\/\?/, r => r.fulfill({ body: fs.readFileSync(__dirname + '/../site/follow/index.html'), contentType: 'text/html' }));
  await fp.route(/unpkg\.com\/leaflet@1\.9\.4\/dist\/(leaflet\.(js|css))/, (r) => { const m = r.request().url().match(/(leaflet\.(js|css))$/); r.fulfill({ body: fs.readFileSync(LF + m[1]), contentType: m[2] === 'js' ? 'application/javascript' : 'text/css' }); });
  await fp.route(/tile\.openstreetmap\.org|fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await fp.goto(BASE + '/follow/?f=' + F); await fp.waitForTimeout(3000);
  const v = await fp.evaluate(() => ({ title: document.getElementById('title').textContent, sub: document.getElementById('sub').textContent, at: document.getElementById('iAt').textContent, fin: document.getElementById('iFin').textContent, lines: document.querySelectorAll('.leaflet-overlay-pane path').length, ask: getComputedStyle(document.getElementById('ask')).display }));
  ok(v.ask === 'none', 'follow link: the code box stays hidden, the map has the screen');
  ok(v.title === 'Morning After' && /every 15 minutes/.test(v.sub), 'follow page: the boat name, reports every 15 minutes', v);
  ok(v.lines >= 2 && /GMT|BST/.test(v.at) && /GMT|BST/.test(v.fin), 'follow page: track and route drawn; last position and finish in the viewer\'s time with the zone named', { at: v.at, fin: v.fin });
  await fp.screenshot({ path: (process.env.OUT || '/tmp') + '/follow.png' });
  await fp.goto(BASE + '/follow/?boat=' + CODE); await fp.waitForTimeout(2500); ok(await fp.evaluate(() => document.getElementById('title').textContent) === 'Morning After', 'a link sent before today (?boat=) still opens');
  const bad = await (await fp.request.get(BASE + '/api/follow/ZZZZZZZZ')).json(); ok(/No boat/.test(bad.error || ''), 'an unknown follow code says so');
  ok(!errs.length && !ferr.length, 'no script errors', errs.concat(ferr).slice(0, 3));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
