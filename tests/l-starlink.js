/* L, internet and Starlink chip (Stuart 15 Nov): with the dish reachable, the chip shows Starlink, its state and speed, and the
   details (latency, sky blocked, alerts); obstructed shows amber; with no dish it shows the phone's own connection; Off hides it.
   The dish reply is built here as the dish sends it (gRPC-Web frame, protobuf). Run: node tests/l-starlink.js <base> */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8778';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
function vint(n) { const o = []; while (n > 127) { o.push((n & 127) | 128); n = Math.floor(n / 128); } o.push(n); return o; }
function f32(f, v) { const b = Buffer.alloc(4); b.writeFloatLE(v); return [...vint(f * 8 + 5), ...b]; }
function vi(f, v) { return [...vint(f * 8), ...vint(v)]; }
function msg(f, bytes) { return [...vint(f * 8 + 2), ...vint(bytes.length), ...bytes]; }
function reply(o) { const st = [...f32(1007, o.down), ...f32(1008, o.up), ...f32(1009, o.lat), ...f32(1003, o.drop), ...msg(1004, [...f32(1, o.obs), ...vi(5, o.cur ? 1 : 0)]), ...msg(1005, o.heat ? vi(2, 1) : [])]; const body = msg(2004, st); const fr = Buffer.from([0, 0, 0, 0, 0, ...body]); fr.writeUInt32BE(body.length, 1); return fr.toString('base64'); }
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
  const good = reply({ down: 85.4e6, up: 12.1e6, lat: 38.5, drop: 0, obs: 0.021, cur: false }), blocked = reply({ down: 2e6, up: 1e6, lat: 90, drop: 0.2, obs: 0.31, cur: true, heat: true });
  await c.addInitScript(a => { window.__dish = a.good; window.NativeLink = { starlinkAsk: () => setTimeout(() => window.__navStarlink && window.__navStarlink(window.__dish), 50) }; document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); }, { good });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/channel-area/'); await p.waitForFunction(() => window.NavNet && document.getElementById('navNetChip'), null, { timeout: 300000 }); await p.evaluate(() => NavNet.refresh()); await p.waitForTimeout(800);
  let r = await p.evaluate(() => ({ t: document.getElementById('navNetChip').textContent, st: document.getElementById('navNetChip').dataset.st, n: NavNet.now() }));
  ok(/STARLINK 85 Mb\/s/.test(r.t) && r.st === 'ok', 'with the dish reachable the chip shows Starlink and its speed, green', r.t);
  ok(Math.round(r.n.d.lat) === 39 || Math.round(r.n.d.lat * 10) === 385, 'it reads the latency', r.n.d.lat);
  await p.evaluate(() => document.getElementById('navNetChip').click()); await p.waitForTimeout(800);
  const det = await p.evaluate(() => (document.getElementById('navNetBody') || {}).textContent || '');
  ok(/Download85 Mb\/s/.test(det) && /Upload12/.test(det) && /Sky blocked2\.1%/.test(det) && /AlertsNone/.test(det), 'tapping it opens the details in Settings, Instruments', det.slice(0, 160));
  await p.evaluate(b2 => { window.__dish = b2; NavNet.refresh(); }, blocked); await p.waitForTimeout(500);
  r = await p.evaluate(() => ({ t: document.getElementById('navNetChip').textContent, st: document.getElementById('navNetChip').dataset.st, body: document.getElementById('navNetBody').textContent }));
  ok(/Obstructed/.test(r.t) && r.st === 'warn' && /Overheated/.test(r.body), 'obstructed shows amber with the alert', r.t + ' / ' + r.body.slice(0, 200));
  await p.evaluate(() => { window.__dish = ''; NavNet.refresh(); }); await p.waitForTimeout(500);
  await p.evaluate(() => { window.__navStarlink(''); }); await p.waitForTimeout(300);
  r = await p.evaluate(() => ({ t: document.getElementById('navNetChip').textContent, body: document.getElementById('navNetBody').textContent }));
  ok(/^NET /.test(r.t.trim()) && /Not reached/.test(r.body), 'with no dish it shows the phone\'s own connection and says why', r.t + ' / ' + r.body.slice(0, 120));
  await p.selectOption('#navNetSrc', 'off'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById('navNetChip').hidden), 'Off hides the chip');
  await p.selectOption('#navNetSrc', 'auto');
  ok(errs.length === 0, 'no page errors', errs.slice(0, 3).join(' | '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
