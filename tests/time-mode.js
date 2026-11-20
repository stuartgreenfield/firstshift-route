/* Local or UTC (Stuart 20 Nov 16:01, 16:03): one setting, in Settings, Display and in the Start window, for every time shown and every start typed.
   Run: node tests/time-mode.js http://localhost:8779   (the browser runs at UTC+1, as Stuart's phone in Amsterdam) */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 14'], serviceWorkers: 'block', timezoneId: 'Europe/Amsterdam' }); await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/channel-area/?race=dinard', { waitUntil: 'domcontentloaded', timeout: 120000 }); await p.waitForTimeout(9000);
  await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x && x.offsetParent) x.click(); });
  /* UTC: type 14:30 */
  await p.click('#startChip'); await p.waitForTimeout(700); ok(/UTC/.test(await p.textContent('label[for=wzTime]')), 'the time label says UTC by default', await p.textContent('label[for=wzTime]'));
  const day = await p.evaluate(() => document.getElementById('wzDay').value); const t = new Date(Date.now() + 2 * 3600e3), hh = String(t.getUTCHours()).padStart(2, '0'), mm = String(t.getUTCMinutes()).padStart(2, '0');
  await p.fill('#wzTime', hh + ':' + mm); await p.click('#wizNext'); await p.waitForTimeout(2000);
  const g = await p.evaluate(() => window.__fsGunAt()); const want = +day + (+hh) * 3600 + (+mm) * 60; ok(g === want || g === want + 86400 || g === want - 86400, 'UTC entry gives the same moment', g + ' vs ' + want);
  const chipU = await p.textContent('#startChip'); ok(/UTC/.test(chipU) && chipU.includes(hh + ':' + mm), 'START chip in UTC', chipU);
  /* switch to Local in the Start window: same moment, shown an hour later (Amsterdam, winter) */
  await p.click('#startChip'); await p.waitForTimeout(700); await p.click('[data-tz=local]'); await p.waitForTimeout(500);
  const lt = await p.evaluate(() => document.getElementById('wzTime').value); const lh = String((+hh + 1) % 24).padStart(2, '0'); ok(lt === lh + ':' + mm, 'Local switch shows the same start in local time', lt + ' vs ' + lh + ':' + mm);
  ok(/local/.test(await p.textContent('label[for=wzTime]')), 'the time label says local', await p.textContent('label[for=wzTime]'));
  await p.click('#wizNext'); await p.waitForTimeout(2000); ok(await p.evaluate(() => window.__fsGunAt()) === g, 'Done keeps the same gun', String(await p.evaluate(() => window.__fsGunAt())));
  const chipL = await p.textContent('#startChip'); ok(/LOCAL/.test(chipL) && chipL.includes(lh + ':' + mm), 'START chip in local time', chipL);
  ok(await p.evaluate(() => document.getElementById('timeMode').value) === 'local', 'Settings, Display follows the switch');
  /* typing a local time: 1 hour before the UTC figure */
  await p.click('#startChip'); await p.waitForTimeout(700); await p.fill('#wzTime', lh + ':' + mm); await p.click('#wizNext'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => window.__fsGunAt()) === g, 'a local time typed gives the right UTC moment');
  /* back to UTC from Settings */
  await p.evaluate(() => { const s = document.getElementById('timeMode'); s.value = 'utc'; s.dispatchEvent(new Event('change')); }); await p.waitForTimeout(500); ok(/UTC/.test(await p.textContent('#startChip')), 'Settings back to UTC: START chip in UTC');
  ok(!errs.length, 'no script errors', JSON.stringify(errs).slice(0, 200)); console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); })();
