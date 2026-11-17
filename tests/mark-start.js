/* Mark's start sequence (Stuart 16 Nov 12:46; 17 Nov 05:04 sounds and vibration on): the box under the top bar from 15 minutes
   before the gun, Sync to the whole minute, one minute more or less, 5-4-1-0 or 3-2-1-0, the flag, Postpone and General recall;
   the gun goes to Route's start; the box stacks clear of the plotter and the GPS window. Run: node tests/mark-start.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', geolocation: { latitude: 50.765, longitude: -1.295, accuracy: 5 }, permissions: ['geolocation'] });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + String(e.stack || '').split('\n')[1])); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(1000);
  await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x) x.click(); FSSolent.set({ type: 'marks', start: { code: null, name: 'Start line', lat: 50.770, lon: -1.2925, line: true }, marks: FSSolent.board('3F P, 2C S').marks, plan: 'list' }); window.__fsSetLine('boat', 50.7700, -1.2950); window.__fsSetLine('pin', 50.7700, -1.2895); FSSolent.go(); const s = FSSolent.state(); s.startAt = Math.round(Date.now() / 1000 + 287); FSSolent.set({ startAt: s.startAt }); });
  await p.waitForTimeout(1500);
  const box = () => p.evaluate(() => { const e = document.getElementById('solSeq'); return e && !e.hidden ? e.innerText.replace(/\s+/g, ' ') : null; });
  let t = await box(); ok(t && /4:4\d/.test(t) && /Sync/.test(t), 'the start sequence shows with the countdown', t && t.slice(0, 80));
  await p.click('#solSeq [data-q=sync]'); await p.waitForTimeout(400);
  const rem = await p.evaluate(() => FSSolent.state().startAt - Date.now() / 1000); ok(Math.abs(rem - 300) < 2, 'Sync rounds to the whole minute (5:00 at the signal)', Math.round(rem));
  ok(await p.evaluate(() => Math.abs(+document.getElementById('startSel').value - FSSolent.state().startAt) < 2), "and the gun becomes Route's start");
  await p.click('#solSeq [data-q=m1]'); await p.waitForTimeout(300); const rem2 = await p.evaluate(() => FSSolent.state().startAt - Date.now() / 1000); ok(Math.abs(rem2 - 240) < 3, '−1 min', Math.round(rem2));
  await p.click('#solSeq [data-q=flag]'); await p.waitForTimeout(200); ok(await p.evaluate(() => FSSolent.state().flag) === 'I', 'the flag changes P to I');
  await p.click('#solSeq [data-q=seq]'); await p.waitForTimeout(200); ok(await p.evaluate(() => FSSolent.state().seq) === 3, '3-2-1-0 sequence');
  await p.click('#solSeq [data-q=recall]'); await p.waitForTimeout(300); const rem3 = await p.evaluate(() => FSSolent.state().startAt - Date.now() / 1000); ok(Math.abs(rem3 - 180) < 3, 'General recall: a new sequence', Math.round(rem3));
  await p.click('#solSeq [data-q=ap]'); await p.waitForTimeout(300); t = await box(); ok(/AP/.test(t) && /Warning signal now/.test(t), 'Postpone shows AP with Warning signal now');
  await p.click('#solSeq [data-q=warn]'); await p.waitForTimeout(300); t = await box(); ok(t && /2:5\d|3:00/.test(t), 'Warning signal now starts the sequence', t && t.slice(0, 40));
  /* stacking with the plotter */
  await p.evaluate(() => { if (window.__fsPlot) window.__fsPlot.toggle(true); }); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const g = id => { const e = document.getElementById(id); if (!e || !e.getClientRects().length || e.hidden) return null; const q = e.getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom].map(Math.round); }; return { seq: g('solSeq'), plot: g('fsPlot'), top: document.querySelector('.top').getBoundingClientRect().bottom }; });
  const lap = (a, q) => a && q && a[0] < q[2] - 2 && a[2] > q[0] + 2 && a[1] < q[3] - 2 && a[3] > q[1] + 2;
  ok(r.seq && !lap(r.seq, r.plot) && r.seq[1] >= r.top, 'the box sits under the top bar, clear of the plotter', JSON.stringify(r));
  await p.screenshot({ path: '/tmp/claude-0/ui/m2/start-seq.png' });
  ok(!errs.length, 'no page errors', errs.join(' | ') || null);
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
