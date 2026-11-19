/* M28 to M30 (Stuart 17 Nov 09:15 to 09:18): the start screen inside 10 minutes, the 10/5/Off choice, Chart back to the small box, and the race menu (Start new race, Stop race, Stored races). Run: node tests/mark-startscr.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', geolocation: { latitude: 50.765, longitude: -1.295, accuracy: 5 }, permissions: ['geolocation'] });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + String(e.stack || '').split('\n')[1])); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(1000);
  await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x) x.click(); FSSolent.set({ type: 'marks', start: { code: null, name: 'Start line', lat: 50.770, lon: -1.2925, line: true }, marks: FSSolent.board('3F P, 2C S').marks, plan: 'list' }); window.__fsSetLine('boat', 50.7700, -1.2950); window.__fsSetLine('pin', 50.7700, -1.2895); FSSolent.go(); const s = FSSolent.state(); s.startAt = Math.round(Date.now() / 1000 + 287); FSSolent.set({ startAt: s.startAt }); });
  await p.waitForTimeout(1500);
  const ss = () => p.evaluate(() => { const e = document.getElementById('solStartScr'); return e && !e.hidden ? e.innerText.replace(/\s+/g, ' ') : null; });
  let s = await ss(); ok(s && /To the line/i.test(s) && /burn/i.test(s) && /Bias/i.test(s), 'inside 10 minutes the start screen opens with line, burn and bias', s && s.slice(0, 160));
  const cv = await p.evaluate(() => { const c = document.querySelector('#solStartScr canvas'); return c && c.width > 50 && c.height > 50; }); ok(cv, 'the line picture is drawn');
  await p.screenshot({ path: '/tmp/claude-0/ui/m2/start-screen.png' });
  await p.selectOption('#solStartScr select[data-ssmin]', '5'); await p.waitForTimeout(300); ok(await p.evaluate(() => FSSolent.state().ssMin) === 5, 'Opens: 10 min before changed to 5 min before (the list replaced the cycling button, M80)');
  await p.click('#solStartScr [data-q=small]'); await p.waitForTimeout(400); s = await ss(); const sm = await p.evaluate(() => { const e = document.getElementById('solSeq'); return e && !e.hidden; });
  ok(!s && sm, 'Chart takes it back to the small box');
  await p.click('#solSeq [data-q=big]').catch(() => {}); await p.waitForTimeout(400); ok(!!(await ss()), 'Start screen on the small box opens it again');
  /* M30 race menu */
  await p.evaluate(() => FSSolent.start()); await p.waitForTimeout(600);
  const m = await p.evaluate(() => { const c = document.querySelector('.solmenu, #solCardS'); const t = document.body.innerText; return { start: /Start new race/.test(t), stop: /Stop race/.test(t), stored: /Stored races/.test(t) }; });
  ok(m.start && m.stop && m.stored, 'the race button offers Start new race, Stop race and Stored races', JSON.stringify(m));
  await p.screenshot({ path: '/tmp/claude-0/ui/m2/race-menu.png' });
  const stopB = await p.$('#solCardS, #solCardStop'); if (stopB) { await stopB.click(); await p.waitForTimeout(600); }
  ok(stopB && !(await ss()) && await p.evaluate(() => { const e = document.getElementById('solSeq'); return !e || e.hidden; }), 'Stop race closes the start screen and the box');
  await p.evaluate(() => FSSolent.start()); await p.waitForTimeout(500); const sb = await p.$('#solCardStored, #solCardR'); if (sb) { await sb.click(); await p.waitForTimeout(600); }
  ok(await p.evaluate(() => { const r = document.getElementById('races'); return r && !r.hidden; }), 'Stored races opens the stored races sheet');
  ok(!errs.length, 'no page errors', errs.join(' | ') || null);
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
