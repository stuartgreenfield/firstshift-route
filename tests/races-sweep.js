/* Stuart 22 Nov 07:21 ("this should have been found ... check all races they work"): every race in the race menus, opened the way the crew
   does (menu, Open), must route or say plainly why not (course set on the day, beyond the forecasts, outside the forecast areas). Then the
   sequence that broke on 22 Nov: an inshore (Solent) race, back to an offshore race, Route, and it routes.
   Run: node tests/races-sweep.js http://localhost:8779 [page] */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779', PAGE = process.argv[3] || 'channel-area';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
const HONEST = /set on the day|beyond the forecasts|outside the forecast|Cannot route|forecasts end before|not published|Choose an earlier start|Route keeps your start/i;
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(p.url().replace(BASE, '') + ': ' + e.message)); await p.goto(BASE + '/' + PAGE + '/');
  const ready = () => p.waitForFunction(() => window.__navFc && window.__navFc().P && document.getElementById('raceMenu'), null, { timeout: 400000 });
  const st = () => p.evaluate(() => ({ url: location.pathname + location.search, name: (window.__fsCourseFull && (window.__fsCourseFull() || {}).name) || '', note: ((document.getElementById('runNote') || {}).textContent || '').slice(0, 160), fins: document.querySelectorAll('#finBox .fin').length, prog: !document.getElementById('prog').hidden, busy: (document.getElementById('busy') || {}).textContent || '', card: !!(document.getElementById('setupCard') && document.getElementById('setupCard').offsetParent) }));
  const settle = async (maxS) => { let s; for (let i = 0; i < maxS / 3; i++) { await p.waitForTimeout(3000); s = await st().catch(() => null); if (!s) continue; if ((s.fins && !s.prog) || HONEST.test(s.note + ' ' + s.busy)) return s; } return s; };
  await ready(); await settle(240);
  const races = await p.evaluate(() => { const out = []; ['rmRorc', 'rmJog', 'rmOther'].forEach(id => { const bt = document.getElementById(id); if (!bt) return; bt.click(); [].forEach.call(document.querySelectorAll('#raceList [data-race]'), x => { if (!out.some(o => o.id === x.dataset.race)) out.push({ id: x.dataset.race, menu: id, name: (x.closest('.ritem') && x.closest('.ritem').querySelector('b') || {}).textContent }); }); document.getElementById('races').hidden = true; }); return out; });
  console.log('races', races.length, races.map(r => r.name).join(' | '));
  let prevNote = null;
  for (const r of races) {
    if (process.env.ONLY && !new RegExp(process.env.ONLY, 'i').test(r.name)) continue;
    const before = p.url();
    await p.evaluate(r => { document.getElementById(r.menu).click(); const x = document.querySelector('#raceList [data-race="' + r.id + '"]'); x && x.click(); }, r);
    await p.waitForTimeout(2500); if (p.url() !== before) await ready().catch(() => {});
    await p.evaluate(() => { const s = document.querySelector('#setupCard [data-su="start"]'); }).catch(() => {});
    const s = await settle(300);
    const stale = !!s && s.fins > 0 && prevNote && s.note === prevNote;   /* 22 Nov: De Guingand kept the Myth's routes under its own name */
    const good = !!s && !stale && ((s.fins > 0 && !s.prog) || HONEST.test(s.note + ' ' + s.busy)); if (s) prevNote = s.note;
    ok(good, 'Race "' + r.name + '": routes, or says plainly why not (not the last race\'s routes)', s && { stale, url: s.url, name: s.name, fins: s.fins, note: (s.note || s.busy).slice(0, 110) });
  }
  /* the 22 Nov sequence: an inshore race, then back to an offshore race and Route */
  if (await p.evaluate(() => !!document.getElementById('rmSolent'))) {
    if (!/channel-area/.test(p.url())) { await p.goto(BASE + '/channel-area/'); await ready(); await settle(240); }
    await p.evaluate(() => document.getElementById('rmSolent').click()); await p.waitForTimeout(3000);
    await p.evaluate(() => { const x = document.getElementById('solCardX') || document.querySelector('#solCard .close'); x && x.click(); });
    const cerv = races.find(r => /Cervantes/i.test(r.name)) || races[0];
    await p.evaluate(r => { document.getElementById(r.menu).click(); const x = document.querySelector('#raceList [data-race="' + r.id + '"]'); x && x.click(); }, cerv); await p.waitForTimeout(3000);
    let s = await settle(300); const auto = s && s.fins > 0;
    await p.evaluate(() => { const b = document.getElementById('suRoute') || document.getElementById('run'); b && b.click(); }); await p.waitForTimeout(2000);
    const s2 = await st(); s = await settle(300);
    ok((auto || s2.prog || /under way/.test(s2.busy)) && s && s.fins > 0, 'Solent race, then back to ' + cerv.name + ' and Route: it routes', { auto, afterTap: s2, end: s && { fins: s.fins, note: s.note.slice(0, 80) } });
  }
  ok(!errs.length, 'No script errors anywhere', errs.slice(0, 3));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
