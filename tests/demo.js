/* The demonstration sail (Stuart 17 Nov 08:39, F14, Route and Route+ only): a practice boat sails the chosen route with the real
   screens and a caption saying what each part shows; it strays off the route for a while; Stop puts everything back.
   Run: node tests/demo.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + String(e.stack || '').split('\n')[1])); await p.goto(BASE + '/channel-area/');
  await p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); return f && f.sel && !f.running && window.__fsPlan && window.__fsPlan(); }, null, { timeout: 300000 }); await p.waitForTimeout(1000);
  ok(await p.evaluate(() => !!document.getElementById('demoGo')), 'Help has Watch the demo sail');
  await p.evaluate(() => { document.getElementById('demoGo').click(); }); await p.waitForTimeout(2500);
  const cap = () => p.evaluate(() => { const e = document.getElementById('fsDemo'); return e && !e.hidden ? e.innerText.replace(/\s+/g, ' ') : ''; });
  let t = await cap(); ok(/DEMO/.test(t) && /practice boat|GPS window/.test(t), 'the demo starts with its caption', t.slice(0, 110));
  const f1 = await p.evaluate(() => { const f = window.__fsLiveFix && window.__fsLiveFix(); return f && [f.la, f.lo, f.sog]; });
  ok(f1 && f1[2] > 0.5, 'the practice boat is sailing (Live GPS from the demo)', JSON.stringify(f1));
  ok(await p.evaluate(() => { const P = window.__fsPlot || window.__navPlot; return !!(P && P.C.on); }), 'the plotter bar is open');
  await p.evaluate(() => { const d = window.FSDemo; }); await p.waitForTimeout(40000);
  t = await cap(); const x = await p.evaluate(() => { const o = window.__fsPlot && window.__fsPlot.calc ? window.__fsPlot.calc() : null; return o && o.xte ? o.xte.d : null; });
  ok(/strays off|XTE/.test(t) || x > 0.05, 'part way: the boat strays off the route and XTE shows it', t.slice(0, 90) + ' | xte ' + x);
  await p.screenshot({ path: '/tmp/claude-0/ui/m2/demo.png' });
  await p.click('#fsDemo [data-d=stop]'); await p.waitForTimeout(800);
  ok(await p.evaluate(() => !window.FSDemo.on() && document.getElementById('fsDemo').hidden), 'Stop ends the demo and puts it away');
  ok(!errs.length, 'no page errors', errs.join(' | ') || null);
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
