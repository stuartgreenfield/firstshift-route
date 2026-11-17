/* Peer review items (17 Nov 10:39): M45 our place in a series of starts, M38 bias in boat lengths, M39 line check, M40 first mark,
   M36 time to line at the boat's best speed of 2 minutes, M35 time to speed up, M44 the course card closes Route's panel. Was: tide by hand ("crucial"), the course card's Next panel (start time, start line, tide, sequence 10-5-0 / 5-4-1-0 /
   3-2-1-0, start screen 10 / 5 / Off / now), the line by committee boat, direction and length. Run: node tests/mark-tide.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPad Mini'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(1000);
  await p.evaluate(() => FSSolent.start()); await p.waitForTimeout(500); await p.click('#solCardM').catch(() => {}); await p.waitForTimeout(800);
  await p.evaluate(() => { const x = document.getElementById('solStep'); if (x) x.hidden = true; FSSolent.set({ type: 'marks', start: { code: null, name: 'Start line', lat: 50.770, lon: -1.2925, line: true }, marks: FSSolent.board('3F P, 2C S').marks, plan: 'list', wind: { twd: 250, tws: 12, src: 'typed', at: Date.now() - 300000 } }); window.__fsSetLine('pin', 50.7700, -1.2950); window.__fsSetLine('boat', 50.7690, -1.2900); FSSolent.set({ startAt: Math.round(Date.now() / 1000 + 1500), series: { pos: 3, iv: 5 }, loa: 10, acc: 20 }); FSSolent.go(); }); await p.waitForTimeout(1500);
  await p.evaluate(() => FSSolent.showList()); await p.waitForTimeout(500);
  const nx = await p.evaluate(() => document.querySelector('#solLegs .solnext').innerText.replace(/\s+/g, ' '));
  ok(/Start 3 of the series, every 5 min/.test(nx) && /ours/.test(nx), 'our start, third of the series, guns listed', nx.slice(nx.indexOf('Start 3'), nx.indexOf('Start 3') + 90));
  ok(/swapped/i.test(nx), 'the line check sees the ends swapped (pin to starboard looking up the wind)');
  const sq = await p.evaluate(() => { const g = FSSolent.state().startAt; return true; });
  /* the boat sails towards the line at 6 kn, then luffs at 2 kn: time to line keeps the good speed */
  await p.evaluate(() => { window.__fsSim(true); }); let la = 50.760;
  for (let i = 0; i < 12; i++) { await p.evaluate(([a, s]) => window.__fsSimFix(a, -1.2925, s, 0), [la, i < 9 ? 6 : 2]); la += 0.0003; await p.waitForTimeout(1100); }
  await p.click('#solLegs [data-k=nxnow]'); await p.waitForTimeout(1500);
  const ss = await p.evaluate(() => document.getElementById('solStartScr').innerText.replace(/\s+/g, ' '));
  ok(/at 6\.0 kn, your best of 2 min/.test(ss), 'time to line uses the best speed, not the luff', ss.slice(ss.indexOf('TIME TO LINE'), ss.indexOf('TIME TO LINE') + 80));
  ok(/to speed up/.test(ss), 'and adds the time to speed up from 2 kn');
  ok(/lengths/.test(ss), 'bias in boat lengths', ss.slice(ss.indexOf('BIAS'), ss.indexOf('BIAS') + 60));
  ok(/FIRST MARK/i.test(ss) && /3F|West Lepe|Lepe/i.test(ss), 'the first mark with its bearing', ss.slice(ss.search(/FIRST MARK/i), ss.search(/FIRST MARK/i) + 60));
  ok(/Start 3 of the series/.test(ss), 'the start screen says where we are in the series');
  await p.screenshot({ path: '/tmp/claude-0/ui/m2/start-review.png' });
  ok(!errs.length, 'no page errors', errs.join(' | ') || null);
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
