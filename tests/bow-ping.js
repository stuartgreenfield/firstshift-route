/* J3 start line (Stuart 15 Nov): pinging an end puts it at the bow, the GPS position moved forward by the bow offset along the
   heading; with both ends pinged, Start from the line moves the course start to the middle of the line. Run: node tests/bow-ping.js <base> */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, serviceWorkers: 'block', geolocation: { latitude: 50.7660, longitude: -1.3000 }, permissions: ['geolocation'] });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/channel-area/'); await p.waitForFunction(() => document.getElementById('bowOff') && document.getElementById('liveBtn') && window.__fsRedraw, null, { timeout: 300000 }); await p.waitForTimeout(2000);
  await p.evaluate(() => { document.getElementById('bowOff').value = 10; window.__navHdg = () => 90; document.getElementById('liveBtn').click(); }); await p.waitForTimeout(3500);
  const has = await p.evaluate(() => !!document.getElementById('lnBoat'));
  if (has) { await p.evaluate(() => document.getElementById('lnBoat').click()); await p.waitForTimeout(300); }
  const l1 = await p.evaluate(() => { const k = Object.keys(localStorage).find(k => /^fs-line/.test(k)); return k ? JSON.parse(localStorage.getItem(k) || '{}') : null; });
  const dE = l1 && l1.boat ? (l1.boat[1] - (-1.3)) * 60 * 1852 * Math.cos(50.766 * Math.PI / 180) : null, dN = l1 && l1.boat ? (l1.boat[0] - 50.766) * 60 * 1852 : null;
  ok(has && dE != null && Math.abs(dE - 10) < 0.5 && Math.abs(dN) < 0.5, 'Ping boat with a 10 m bow offset, heading 090°, sits 10 m east of the GPS', dE == null ? JSON.stringify(l1) : dE.toFixed(2) + ' m east, ' + dN.toFixed(2) + ' m north');
  await c.setGeolocation({ latitude: 50.76573, longitude: -1.3, accuracy: 5 }); await p.waitForTimeout(3000);   /* the pin end 30 m south: ends under 20 m apart are refused (F44, 18 Nov) */
  await p.evaluate(() => { window.__navHdg = () => null; document.getElementById('lnPin').click(); }); await p.waitForTimeout(300);
  const l2 = await p.evaluate(() => { const k = Object.keys(localStorage).find(k => /^fs-line/.test(k)); return JSON.parse(localStorage.getItem(k) || '{}'); });
  ok(l2.pin && Math.abs(l2.pin[1] + 1.3) < 1e-6 && (Math.abs(l2.pin[0] - 50.76573) < 1e-6 || Math.abs(l2.pin[0] - (50.76573 - 10 / 111120)) < 2e-6), 'with no compass heading: the GPS position, or the bow offset along the course made good once the boat has moved (here south, 10 m)', JSON.stringify(l2.pin));
  /* move the pin so the line has length, then Start from the line */
  await p.evaluate(() => { const k = Object.keys(localStorage).find(k => /^fs-line/.test(k)); const l = JSON.parse(localStorage.getItem(k)); l.pin = [50.7680, -1.3040, Date.now(), 3]; localStorage.setItem(k, JSON.stringify(l)); document.getElementById('lnClr') && 0; }); 
  await p.evaluate(() => { const b = document.getElementById('lnBoat'); if (b) b.click(); }); await p.waitForTimeout(500);
  const use = await p.evaluate(() => { const u = document.getElementById('lnUse'); if (!u) return null; u.click(); return true; }); await p.waitForTimeout(800);
  const st = await p.evaluate(() => { const c = window.__navCourse && window.__navCourse(); return c && c.start ? { lat: c.start.lat, lon: c.start.lon } : null; });
  ok(use && st && Math.abs(st.lat - (50.766 + 50.768) / 2) < 0.0003, 'Start from the line moves the course start to the middle of the line', JSON.stringify(st));
  ok(errs.length === 0, 'no page errors', errs.slice(0, 3).join(' | '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
