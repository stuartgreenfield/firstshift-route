/* M53 to M56 (Stuart 17 Nov 13:46, answers 14:10): the moving line, zoom, the boxes from the boat or the typed wind, the time to full speed
   from a drop-down. Was: peer review items (17 Nov 10:39): M45 our place in a series of starts, M38 bias in boat lengths, M39 line check, M40 first mark,
   M36 time to line at the boat's best speed of 2 minutes, M35 time to speed up, M44 the course card closes Route's panel. Was: tide by hand ("crucial"), the course card's Next panel (start time, start line, tide, sequence 10-5-0 / 5-4-1-0 /
   3-2-1-0, start screen 10 / 5 / Off / now), the line by committee boat, direction and length. Run: node tests/mark-tide.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPad Mini'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(1000);
  await p.evaluate(() => FSSolent.start()); await p.waitForTimeout(500); await p.click('#solCardM').catch(() => {}); await p.waitForTimeout(800);
  const plus = await p.evaluate(() => !!window.__navBoat);
  if (plus) await p.evaluate(() => { try { window.__navPractice(true); } catch (e) {} });
  await p.evaluate(() => { const x = document.getElementById('solStep'); if (x) x.hidden = true; FSSolent.set({ type: 'marks', start: { code: null, name: 'Start line', lat: 50.770, lon: -1.2925, line: true }, marks: FSSolent.board('3F P, 2C S').marks, plan: 'list', wind: { twd: 250, tws: 12, src: 'typed', at: Date.now() } }); window.__fsSetLine('boat', 50.7700, -1.2950); window.__fsSetLine('pin', 50.7690, -1.2900); FSSolent.set({ startAt: Math.round(Date.now() / 1000 + 400), acc: 12, accMode: 'typed' }); FSSolent.go(); }); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__fsSim(true); }); let la = 50.755;
  for (let i = 0; i < 10; i++) { await p.evaluate(([a, sp]) => window.__fsSimFix(a, -1.2925, sp, 0), [la, i < 8 ? 5 : 2]); la += 0.0002; await p.waitForTimeout(1100); }
  await p.evaluate(() => FSSolent.showList()); await p.waitForTimeout(400);
  const nx = await p.evaluate(() => { const s = document.getElementById('solAccM'); return s && [...s.options].map(o => o.text).join(','); }); ok(/Typed/.test(nx || '') && /Boat size/.test(nx || '') && /Learn from/.test(nx || ''), 'To full speed: Typed, Boat size, Learn in a drop-down', nx);
  await p.click('#solLegs [data-k=nxnow]'); await p.waitForTimeout(1500);
  const ml = await p.evaluate(() => FSSolent.ss().ml); ok(ml && ml.D > 0 && ml.burn != null, 'the moving line is worked out (distance back, seconds early or late)', JSON.stringify(ml && { D: Math.round(ml.D), burn: Math.round(ml.burn), early: ml.early }));
  const ss = await p.evaluate(() => document.getElementById('solStartScr').innerText.replace(/\s+/g, ' '));
  ok(/to speed up \(typed\)/.test(ss), 'time to line says where the speed-up time came from', ss.slice(ss.indexOf('TIME TO LINE'), ss.indexOf('TIME TO LINE') + 90));
  if (plus) ok(/BSP/.test(ss) && /TWA/.test(ss) && /AWA/.test(ss), 'Mark+: BSP, TWA and AWA from the boat on the start screen', ss.slice(ss.indexOf('BSP'), ss.indexOf('BSP') + 80));
  else ok(/WIND 250°/i.test(ss), 'Mark: the typed wind on the start screen', ss.slice(ss.search(/WIND/i), ss.search(/WIND/i) + 40));
  const z0 = await p.evaluate(() => FSSolent.ss().zoom || 1); await p.click('#solStartScr .sszoom [data-z=in]'); await p.waitForTimeout(300); const z1 = await p.evaluate(() => FSSolent.ss().zoom);
  ok(z1 > z0, 'the picture zooms in with +', z0 + ' -> ' + z1);
  await p.screenshot({ path: '/tmp/claude-0/ui/m2/start-m53' + (plus ? '-plus' : '') + '.png' });
  ok(!errs.length, 'no page errors', errs.join(' | ') || null);
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
