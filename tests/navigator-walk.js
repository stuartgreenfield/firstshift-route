/* 22 Nov (Stuart 09:49): a navigator's walk through Route on a phone: in harbour with signal, then at sea with none (GPS only).
   Saves a picture at each step and the facts seen. Run: node tests/navigator-walk.js http://localhost:8779 <outdir> */
const { chromium, devices } = require('playwright'); const fs = require('fs'); const BASE = process.argv[2] || 'http://localhost:8779', OUT = process.argv[3] || '/tmp';
const notes = []; const note = (k, v) => { notes.push([k, v]); console.log(k, '|', JSON.stringify(v).slice(0, 300)); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], permissions: ['geolocation'], geolocation: { latitude: 50.62, longitude: -1.60, accuracy: 8 } });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 503, body: '' }));
  await c.addInitScript(() => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); const shot = async n => p.screenshot({ path: OUT + '/' + n + '.jpg', type: 'jpeg', quality: 70 });
  await p.goto(BASE + '/channel-area/?race=cervantes'); await p.waitForTimeout(6000); await shot('01-first-open');
  note('first open: what is on screen', await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 300)));
  await p.evaluate(() => { const n = document.getElementById('spTourNo'); if (n && n.offsetParent) n.click(); }); await p.waitForTimeout(1500); await shot('02-after-tour-question');
  for (let i = 0; i < 120 && !(await p.evaluate(() => document.querySelectorAll('#finBox .fin').length && document.getElementById('prog').hidden)); i++) { await p.waitForTimeout(3000); if (i === 2) { await shot('03-setup'); note('set-up card', await p.evaluate(() => (document.getElementById('setupCard') || {}).innerText)); const st = await p.evaluate(() => { const b = document.querySelector('[data-su="start"]'); return !!b; }); if (st) { await p.evaluate(() => { const b = document.querySelector('[data-su="start"]'); b.click(); }); await p.waitForTimeout(1500); await shot('04-start-step'); await p.evaluate(() => { const n = document.getElementById('wizNext'); n && n.click(); }); } } }
  await p.waitForTimeout(1500); await shot('05-routed');
  note('route cards', await p.evaluate(() => [...document.querySelectorAll('#finBox .fin')].map(d => d.innerText.replace(/\s+/g, ' '))));
  note('checks', await p.evaluate(() => (document.getElementById('checks') || {}).innerText));
  note('plan strip', await p.evaluate(() => document.getElementById('now').innerText.replace(/\s+/g, ' ')));
  /* at sea: no signal, GPS on */
  await c.setOffline(true); await p.evaluate(() => window.dispatchEvent(new Event('offline'))); await p.waitForTimeout(1500);
  await p.evaluate(() => document.getElementById('liveBtn').click()); await p.waitForTimeout(5000); await shot('06-at-sea-gps');
  note('at sea: strip lines', await p.evaluate(() => ({ top: document.getElementById('now').innerText.replace(/\s+/g, ' '), plan: (document.getElementById('now2') || {}).hidden ? null : (document.getElementById('now2') || {}).innerText.replace(/\s+/g, ' ') })));
  note('at sea: offline badge', await p.evaluate(() => { const o = document.getElementById('offBadge'); return o ? { shown: !o.hidden, text: o.innerText } : null; }));
  note('at sea: Get newest buttons', await p.evaluate(() => document.querySelectorAll('.navgn').length));
  await p.evaluate(() => { const b = document.getElementById('fsPlotBtn'); b && b.click(); }); await p.waitForTimeout(2500); await shot('07-plotter');
  note('plotter bar', await p.evaluate(() => { const e = document.getElementById('fsPlot'); return e ? e.innerText.replace(/\s+/g, ' ').slice(0, 300) : null; }));
  await p.evaluate(() => { const b = document.getElementById('fsDeckBtn'); b && b.click(); }); await p.waitForTimeout(2000); await shot('08-twenty');
  note('20/20 boxes', await p.evaluate(() => [...document.querySelectorAll('.dkbox')].map(x => x.innerText.replace(/\s+/g, ' '))));
  await p.evaluate(() => { const x = document.getElementById('dkExit'); x && x.click(); }); await p.waitForTimeout(800);
  await p.evaluate(() => document.getElementById('run').click()); await p.waitForTimeout(3000); note('at sea: Route again with no signal', await p.evaluate(() => ({ note: document.getElementById('runNote').textContent.slice(0, 160), busy: (document.getElementById('busy') || {}).textContent, prog: !document.getElementById('prog').hidden })));
  for (let i = 0; i < 60 && await p.evaluate(() => !document.getElementById('prog').hidden); i++) await p.waitForTimeout(3000);
  note('at sea: after re-route', await p.evaluate(() => ({ fins: document.querySelectorAll('#finBox .fin').length, note: document.getElementById('runNote').textContent.slice(0, 200) })));
  await shot('09-rerouted-offline');
  /* back in signal */
  await c.setOffline(false); await p.evaluate(() => window.dispatchEvent(new Event('online'))); await p.waitForTimeout(4000); await shot('10-signal-back');
  note('signal back: Get newest buttons', await p.evaluate(() => document.querySelectorAll('.navgn').length));
  note('script errors', errs.slice(0, 5));
  fs.writeFileSync(OUT + '/notes.json', JSON.stringify(notes, null, 1)); await b.close(); })();
