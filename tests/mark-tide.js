/* Stuart 17 Nov 09:35: tide by hand ("crucial"), the course card's Next panel (start time, start line, tide, sequence 10-5-0 / 5-4-1-0 /
   3-2-1-0, start screen 10 / 5 / Off / now), the line by committee boat, direction and length. Run: node tests/mark-tide.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPad Mini'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(1000);
  await p.evaluate(() => FSSolent.start()); await p.waitForTimeout(500); await p.click('#solCardM').catch(() => {}); await p.waitForTimeout(800);
  const st = () => p.evaluate(() => { const e = document.getElementById('solStep'); return e && !e.hidden ? e.innerText.replace(/\s+/g, ' ') : ''; });
  let t = await st(); ok(/Tide/i.test(t) && /Forecast/.test(t) && /By hand/.test(t), 'step 1 has the tide: Forecast or By hand', t.slice(t.search(/tide/i), t.search(/tide/i) + 120));
  await p.click('#solStep button:has-text("By hand")'); await p.waitForTimeout(300);
  await p.fill('#solTdS', '1.8'); await p.dispatchEvent('#solTdS', 'change'); await p.fill('#solTdD', '95'); await p.dispatchEvent('#solTdD', 'change'); await p.waitForTimeout(400);
  const th = await p.evaluate(() => window.__fsTideHand()); ok(th.on && th.spd === 1.8 && th.dir === 95, 'tide by hand reaches every route', JSON.stringify(th));
  const pill = await p.evaluate(() => document.getElementById('adjPillTxt') && document.getElementById('adjPillTxt').textContent); ok(/tide by hand 1.8 kn to 095/.test(pill || ''), 'the chart says the tide is by hand', pill);
  /* the line by committee boat, direction and length */
  await p.evaluate(() => { FSSolent.set({ sk: 'line', lm: 'square', lbrg: 200, llen: 400 }); }); 
  const L = await p.evaluate(() => { const s = FSSolent.state(); return [s.lbrg, s.llen]; }); ok(L[0] === 200 && L[1] === 400, 'line direction and length kept', JSON.stringify(L));
  /* the course card's Next panel */
  await p.evaluate(() => { const x = document.getElementById('solStep'); if (x) x.hidden = true; FSSolent.set({ type: 'marks', start: { code: null, name: 'Start line', lat: 50.770, lon: -1.2925, line: true }, marks: FSSolent.board('3F P, 2C S').marks, plan: 'list' }); window.__fsSetLine('boat', 50.7700, -1.2950); window.__fsSetLine('pin', 50.7690, -1.2900); FSSolent.set({ startAt: Math.round(Date.now() / 1000 + 1500) }); FSSolent.go(); }); await p.waitForTimeout(1500);
  await p.evaluate(() => FSSolent.showList()); await p.waitForTimeout(500);
  const nx = await p.evaluate(() => { const e = document.querySelector('#solLegs .solnext'); return e ? e.innerText.replace(/\s+/g, ' ') : ''; });
  ok(/start/i.test(nx) && /in 2\d min/.test(nx) && /Start line set/i.test(nx) && /1.8 kn to 095/.test(nx) && /10-5-0/.test(nx) && /Show now/.test(nx), 'the course card says what is next: start time, line, tide, sequence, start screen', nx);
  await p.screenshot({ path: '/tmp/claude-0/ui/m2/next-panel.png' });
  await p.click('#solLegs [data-k=nxseq][data-v="10"]'); await p.waitForTimeout(300); ok(await p.evaluate(() => FSSolent.state().seq) === 10, '10-5-0 chosen');
  await p.click('#solLegs [data-k=nxnow]'); await p.waitForTimeout(800);
  const ss = await p.evaluate(() => { const e = document.getElementById('solStartScr'); return e && !e.hidden ? e.innerText.replace(/\s+/g, ' ') : ''; });
  ok(/10-5-0/.test(ss) && /TIDE/i.test(ss) && /1.8 kn/.test(ss), 'Show now opens the start screen 25 minutes out, with the tide', ss.slice(0, 220));
  await p.screenshot({ path: '/tmp/claude-0/ui/m2/start-screen-tide.png' });
  ok(!errs.length, 'no page errors', errs.join(' | ') || null);
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
