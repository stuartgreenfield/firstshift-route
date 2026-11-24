/* Offline check (release check, Stuart 24 Nov 15:24: "everything must work without any signal except GPS"): open the tool once with a
   signal so it is kept on the device, then cut the signal and open it again: the page, the forecasts it had, the fonts and Help must all
   be there, with no script errors. Run: node tests/offline.js <base> [path] */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779', PATH = process.argv[3] || '/channel-area/';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 } });   /* the service worker on, as on a phone */
  await c.route(/open-meteo|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + PATH);
  await p.waitForFunction(() => window.__navFc && window.__navFc().P && navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 300000 }).catch(() => {});
  await p.reload(); await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(8000);   /* a second visit so everything it loads is kept */
  ok(await p.evaluate(() => !!(navigator.serviceWorker && navigator.serviceWorker.controller)), 'kept on the device (offline mode running)');
  await c.setOffline(true); await p.reload().catch(() => {}); await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 120000 }).catch(() => {});
  const s = await p.evaluate(async () => { await document.fonts.ready; const P = window.__navFc && window.__navFc().P; return { app: !!P, wind: P ? Object.keys(P.wind || {}).length : 0, tide: P ? Object.keys(P.tide || {}).length : 0, font: document.fonts.check('600 14px Inter'), help: !!document.getElementById('helpBtn'), online: navigator.onLine }; });
  ok(!s.online && s.app, 'with no signal the tool opens', s);
  ok(s.wind > 0, 'the forecasts it had are there', s.wind);
  ok(s.font, 'the fonts are there');
  ok(s.help, 'Help is there');
  ok(!errs.length, 'no script errors', errs.slice(0, 3));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
