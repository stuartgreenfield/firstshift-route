/* Stuart 17 Nov 13:12: the course card lists every leg with Change, P/S and ×, and + Add a mark; while the race is under way a red
   COURSE CHANGE button opens it. The race and the gun are kept. Was: tide by hand ("crucial"), the course card's Next panel (start time, start line, tide, sequence 10-5-0 / 5-4-1-0 /
   3-2-1-0, start screen 10 / 5 / Off / now), the line by committee boat, direction and length. Run: node tests/mark-tide.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(1000);
  await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x && x.offsetParent) x.click(); FSSolent.set({ type: 'marks', start: { code: null, name: 'Start line', lat: 50.770, lon: -1.2925, line: true }, marks: FSSolent.board('3F P, 2C S').marks, plan: 'list', fin: 'start' }); window.__fsSetLine('boat', 50.7700, -1.2950); window.__fsSetLine('pin', 50.7690, -1.2900); FSSolent.go(); }); await p.waitForTimeout(1200);
  await p.evaluate(() => { FSSolent.set({ startAt: Math.round(Date.now() / 1000 - 120), shown: Date.now() - 600000, ended: null }); document.getElementById('solLegs') && (document.getElementById('solLegs').hidden = true); }); await p.waitForTimeout(2500);
  const cc = await p.evaluate(() => { const b = document.getElementById('solCC'); return b && !b.hidden && b.textContent; }); ok(cc === 'COURSE CHANGE', 'race under way: the red COURSE CHANGE button shows', cc);
  await p.screenshot({ path: '/tmp/claude-0/ui/m2/cc-button.png' });
  await p.click('#solCC'); await p.waitForTimeout(600);
  const rows = await p.evaluate(() => [...document.querySelectorAll('#solLegs tr.solcer')].map(r => r.innerText.replace(/\s+/g, ' ')));
  ok(rows.filter(r => /Change/.test(r)).length === 3, 'it opens the course, every leg with Change', JSON.stringify(rows));
  await p.screenshot({ path: '/tmp/claude-0/ui/m2/cc-card.png' });
  const gun0 = await p.evaluate(() => FSSolent.state().startAt), other = await p.evaluate(() => FSSolent.marks().map(m => m.id).filter(id => !/^(3F|2C)$/.test(id))[3]);
  await p.click('#solLegs [data-k=ce][data-i="1"]'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => { const b = document.getElementById('solCE'); return b && !b.hidden && /instead of 3F/.test(b.innerText); }), 'Change on leg 1 asks for the new buoy instead of 3F');
  await p.click('#solCE [data-c=list]'); await p.waitForTimeout(800); await p.fill('#solListQ', other); await p.dispatchEvent('#solListQ', 'input'); await p.waitForTimeout(400);
  await p.click('#solListB [data-add="' + other + '"][data-side="stbd"]'); await p.waitForTimeout(800);
  const st = await p.evaluate(() => { const s = FSSolent.state(); return { m: s.marks.map(m => m.code + ':' + m.side), gun: s.startAt, shown: !!s.shown }; });
  ok(st.m[0] === other + ':stbd' && /^2C:(stbd|starboard)$/.test(st.m[1]) && st.gun === gun0 && st.shown, 'leg 1 is now the new buoy to starboard; the race and the gun are kept', JSON.stringify(st));
  const cn = await p.evaluate(() => { const c = window.__navCourse && window.__navCourse(); return c && c.marks && c.marks[0] && c.marks[0].name; }); ok(new RegExp(other).test(cn || ''), 'and Route has the changed course', cn);
  await p.click('#solLegs [data-k=ceside][data-i="2"]'); await p.waitForTimeout(500); ok(await p.evaluate(() => FSSolent.state().marks[1].side) === 'port', 'Port/Starboard swaps the side of leg 2');
  await p.click('#solLegs [data-k=cedel][data-i="2"]'); await p.waitForTimeout(200); await p.click('#solLegs [data-k=cedel][data-i="2"]'); await p.waitForTimeout(600); ok(await p.evaluate(() => FSSolent.state().marks.length) === 1, '× twice takes the mark out');
  await p.click('#solLegs [data-k=ceadd]'); await p.waitForTimeout(400); await p.click('#solCE [data-c=list]'); await p.waitForTimeout(600); await p.fill('#solListQ', '2C'); await p.dispatchEvent('#solListQ', 'input'); await p.waitForTimeout(300);
  await p.click('#solListB [data-add="2C"][data-side="port"]'); await p.waitForTimeout(600); ok(JSON.stringify(await p.evaluate(() => FSSolent.state().marks.map(m => m.code))) === JSON.stringify([other, '2C']), '+ Add a mark puts 2C back before the finish');
  /* a waypoint: + Add, then a tap in open water */
  await p.click('#solLegs [data-k=ceadd]'); await p.waitForTimeout(400); await p.click('#solCE .btn[data-c=x]').catch(() => {}); await p.waitForTimeout(300);
  await p.click('#solLegs [data-k=ceadd]'); await p.waitForTimeout(500);
  const tw = await p.evaluate(() => { const q = window.__fsXY(50.53, -1.20); let r; try { r = window.__fsTapHook(50.53, -1.20, q[0], q[1], false); } catch (e) { r = 'ERR ' + e.message; } return [r, (document.getElementById('solSide') || {}).hidden, document.getElementById('solCE') && !document.getElementById('solCE').hidden, window.__fsOnLand && window.__fsOnLand(50.53, -1.20)]; }); console.log('TW', JSON.stringify(tw)); await p.waitForTimeout(800);
  const wps = await p.evaluate(() => FSSolent.state().marks.map(m => (m.wp ? 'WP' : m.code))); ok(wps.length === 3 && wps[2] === 'WP', 'a tap in the water adds a waypoint', JSON.stringify(wps));
  const fit = await p.evaluate(() => { const c = document.getElementById('solLegs'); return c.scrollWidth <= c.clientWidth + 2 && c.getBoundingClientRect().right <= innerWidth; }); ok(fit, 'the card fits the screen with the buttons');
  ok(!errs.length, 'no page errors', errs.join(' | ') || null);
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
