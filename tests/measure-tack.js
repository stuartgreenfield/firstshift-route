/* The measuring tool names the tack (Stuart 28 Nov 17:17: "Prove and fix"; found by the reviewer of the lift and header fix).
   On a line sailed on one heading the box says "steer HHH, TWA NN° port" or "stbd". The side must be the side the wind is on:
   wind direction minus the heading to steer, turned into -180 to 180: above 0 the wind is on the starboard side (starboard tack).
   The box's own wind line gives the direction, so the rule is worked out here from what the box shows, apart from the code.
   Run: node tests/measure-tack.js [base] */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); return c; };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|gstatic|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/channel-area/'); await p.waitForFunction(() => window.FSWpt && document.getElementById('fsRulerBtn') && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(2500);
  const n180 = a => ((a % 360) + 540) % 360 - 180; const out = [];
  for (let brg = 0; brg < 360; brg += 20) { const a = { la: 50.2, lo: -2.0 }, R = Math.PI / 180, d = 0.25, z = { la: a.la + d * Math.cos(brg * R), lo: a.lo + d * Math.sin(brg * R) / Math.cos(a.la * R) };
    const t = await p.evaluate(([a, z]) => { FSWpt.ruler(true); FSWpt.measure(a, z); const bx = document.getElementById('fsMeas'); const more = bx && [...bx.querySelectorAll('button, a, summary, [role=button]')].find(e => /^More/.test(e.textContent.trim())); if (more) more.click(); return bx && !bx.hidden ? bx.innerText.replace(/\s+/g, ' ') : ''; }, [a, z]);
    const st = /steer (\d{3})°?, TWA (\d+)° (port|stbd)/.exec(t), w = /from (\d{3})°/.exec(t); out.push({ brg, steer: st && +st[1], twa: st && +st[2], said: st && st[3], twd: w && +w[1], txt: st ? '' : t.slice(0, 160) }); }
  const one = out.filter(o => o.said && o.twd != null); console.log('lines on one heading:', one.length, 'of', out.length, '| a box text without one:', (out.find(o => !o.said) || {}).txt || 'none');
  ok(one.length >= 6, 'enough measured lines are sailed on one heading to judge (reaches and runs)', one.length);
  const wrong = one.filter(o => { const side = n180(o.twd - o.steer) > 0 ? 'stbd' : 'port'; return Math.abs(Math.abs(n180(o.twd - o.steer)) - o.twa) > 12 || (o.twa > 4 && o.twa < 176 && side !== o.said); });
  ok(wrong.length === 0, 'on every such line the tack named is the side the wind is on', wrong.slice(0, 5).concat(wrong.length ? ['wrong in ' + wrong.length + ' of ' + one.length] : []));
  ok(!errs.length, 'no script errors', errs.slice(0, 3)); console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
