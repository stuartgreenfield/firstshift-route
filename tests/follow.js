/* Share with family and friends (Stuart 20 Nov 05:47): a crew phone with a boat code and the box ticked sends the boat's GPS position and the
   chosen route; the follow link opens a map with the track, the route, the boat name and the finish time. Uses the test server's stand-in
   for /api/track. Run: node tests/follow.js http://localhost:8779 [/cervantes/] */
const { chromium, devices } = require('playwright'); const fs = require('fs'); const BASE = process.argv[2] || 'http://localhost:8779', PG = process.argv[3] || '/cervantes/';
const LF = '/tmp/claude-0/lf/node_modules/leaflet/dist/';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const CODE = 'TEST23';
  const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', geolocation: { latitude: 50.7700, longitude: -1.3000 }, permissions: ['geolocation'] });
  await c.addInitScript((CODE) => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); localStorage.setItem('fs-boatcode', CODE); }, CODE);
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); const posts = []; p.on('request', r => { if (/\/api\/track\//.test(r.url()) && r.method() === 'POST') posts.push(JSON.parse(r.postData() || '{}')); });
  await p.goto(BASE + PG); await p.waitForFunction(() => document.querySelectorAll('#finBox .fin').length > 0, null, { timeout: 300000 });
  await p.evaluate(() => { document.getElementById('boatName').value = 'Morning After'; const cb = document.getElementById('shareTrack'); cb.checked = true; cb.dispatchEvent(new Event('change')); }); await p.waitForTimeout(4000);
  const pos = posts.find(q => q.pos), rt = posts.find(q => q.route);
  ok(pos && Math.abs(pos.pos[1] - 50.77) < 1e-4 && Math.abs(pos.pos[2] + 1.3) < 1e-4 && pos.name === 'Morning After', 'ticking the box sends the GPS position and the boat name', pos);
  ok(rt && rt.route.path.length > 10 && rt.route.finish > 0, 'and the chosen route with its finish time', rt && { pts: rt.route.path.length, name: rt.route.name, finish: rt.route.finish });
  const j = await (await p.request.get(BASE + '/api/track/' + CODE)).json();
  ok(j.name === 'Morning After' && j.track.length === 1 && j.route && j.route.path.length > 10, 'the server holds the name, one position and the route', { name: j.name, track: j.track.length });
  /* the follow link the crew send */
  let shared = null; await p.evaluate(() => { navigator.share = (o) => { window.__shared = o; return Promise.resolve(); }; document.getElementById('shareLink').click(); }); shared = await p.evaluate(() => window.__shared);
  const link = shared && (shared.text.match(/https?:\/\/\S+/) || [])[0];
  ok(shared && /Follow Morning After on FirstShift Route/.test(shared.text) && /\/follow\/\?boat=TEST23$/.test(link || ''), 'Send the follow link: "Follow <boat> ..." with the link', shared && shared.text);
  /* unticked: nothing more is sent */
  const n0 = posts.length; await p.evaluate(() => { const cb = document.getElementById('shareTrack'); cb.checked = false; cb.dispatchEvent(new Event('change')); }); await p.waitForTimeout(1500);
  ok(posts.length === n0, 'unticked: nothing is sent');
  /* family: the follow page (Leaflet served from a local copy, map tiles left out) */
  const f = await b.newContext({ ...devices['iPhone 13'] }); const fp = await f.newPage(); const ferr = []; fp.on('pageerror', e => ferr.push(e.message));
  await fp.route(/unpkg\.com\/leaflet@1\.9\.4\/dist\/(leaflet\.(js|css))/, (r) => { const m = r.request().url().match(/(leaflet\.(js|css))$/); r.fulfill({ body: fs.readFileSync(LF + m[1]), contentType: m[2] === 'js' ? 'application/javascript' : 'text/css' }); });
  await fp.route(/\/follow\/\?boat=/, r => r.fulfill({ body: fs.readFileSync(__dirname + '/../site/follow/index.html'), contentType: 'text/html' }));   /* the follow page as it will be released */
  await fp.route(/tile\.openstreetmap\.org|fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await fp.goto(BASE + '/follow/?boat=' + CODE); await fp.waitForTimeout(3000);
  const v = await fp.evaluate(() => ({ title: document.getElementById('title').textContent, sub: document.getElementById('sub').textContent, at: document.getElementById('iAt').textContent, fin: document.getElementById('iFin').textContent, lines: document.querySelectorAll('.leaflet-overlay-pane path').length }));
  ok(await fp.evaluate(() => getComputedStyle(document.getElementById('ask')).display === 'none'), 'follow link: the code box stays hidden, the map has the screen');
  ok(v.title === 'Morning After' && /updates every two minutes/.test(v.sub), 'follow page: the boat name, updating every two minutes', v);
  ok(v.lines >= 2 && /min ago|just now/.test(v.at) && v.fin !== '-', 'follow page: the track and the planned route drawn, last position and finish shown', v);
  await fp.screenshot({ path: (process.env.OUT || '/tmp') + '/follow.png' });
  const bad = await (await fp.request.get(BASE + '/api/track/ZZZZZZ')).json(); ok(/Nothing shared/.test(bad.error || ''), 'a code with nothing shared says so');
  /* what the follow link gives away: the same code joins the crew's boat settings */
  const g = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' }); const gp = await g.newPage(); await gp.goto(BASE + PG + '?boat=' + CODE); await gp.waitForTimeout(4000);
  const joined = await gp.evaluate(() => localStorage.getItem('fs-boatcode'));
  console.log('NOTE the follow code also opens the crew\'s boat code in Route: a phone that opens ' + PG + '?boat=' + CODE + ' is joined to ' + joined);
  ok(!errs.length && !ferr.length, 'no script errors', errs.concat(ferr).slice(0, 3));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
