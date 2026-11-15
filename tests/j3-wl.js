/* J3 windward-leeward (Stuart 15 Nov 17:32): the leeward mark can be a gate of two buoys, the finish can be at the leeward mark or
   gate, the start line or the windward mark; the routes cross the gate line. Run: node tests/j3-wl.js <base> */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/channel-area/'); await p.waitForFunction(() => window.FSSolent && window.__fsUseCourse, null, { timeout: 300000 }); await p.waitForTimeout(2000);
  const r = await p.evaluate(async () => { await FSSolent.load(); const M = id => FSSolent.marks().find(x => x.id === id); const st = M('3G');
    FSSolent.set({ type: 'wl', start: { code: '3G', name: '3G ' + st.name, lat: st.lat, lon: st.lon }, wl: { wkind: 'brg', brg: 250, dist: 1.2, laps: 2, lkind: 'gate', lcode: '3G', lcode2: '3E', side: 'port', fin: 'lee' } });
    const a = FSSolent.build(); FSSolent.set({ wl: Object.assign({}, FSSolent.state().wl, { fin: 'start' }) }); const s2 = FSSolent.build(); FSSolent.set({ wl: Object.assign({}, FSSolent.state().wl, { fin: 'wind' }) }); const w = FSSolent.build();
    FSSolent.set({ wl: Object.assign({}, FSSolent.state().wl, { fin: 'lee' }) });
    return { lee: { n: a.marks.length, gate: a.marks.filter(m => m.gate).length, fin: a.finish.name, err: a.err }, start: { n: s2.marks.length, fin: s2.finish.name }, wind: { n: w.marks.length, fin: w.finish.name, last: w.marks.slice(-1)[0].name } }; });
  ok(r.lee.n === 3 && r.lee.gate === 1 && /Leeward gate 3G and 3E/.test(r.lee.fin), '2 laps finishing at the leeward gate: windward, gate, windward, finish at the gate', JSON.stringify(r.lee));
  ok(r.start.n === 4 && /start line/.test(r.start.fin), 'finish at the start line: windward, gate, windward, gate, start line', JSON.stringify(r.start));
  ok(r.wind.n === 2 && /Windward/.test(r.wind.fin) && /gate/.test(r.wind.last), 'finish at windward: windward, gate, finish at windward', JSON.stringify(r.wind));
  await p.evaluate(() => { FSSolent.open(); }); await p.waitForTimeout(500);
  const ui = await p.evaluate(() => ({ gate: !!document.querySelector('#solSheet [data-lk="gate"]'), fin: document.querySelectorAll('#solSheet [data-wf]').length, two: !!document.getElementById('solLcode2') }));
  ok(ui.gate && ui.fin === 3 && ui.two, 'the builder offers A gate with two buoy codes, and Finish at: Leeward, Start line, Windward', JSON.stringify(ui));
  await p.evaluate(() => { document.querySelectorAll('.sheet').forEach(s => s.hidden = true); window.__fsUseCourse(FSSolent.build()); });
  await p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); return f && f.sel && f.sel.path && f.sel.path.length > 5 && !f.running; }, null, { timeout: 600000 }).catch(() => {});
  const x = await p.evaluate(() => { const c = FSSolent.build(), g = c.marks.find(m => m.gate), P = window.__navFc().sel.path; if (!g || !P) return { g: !!g, P: !!P };
    const cr = (p1, p2, a, b) => { const d = (x1, y1, x2, y2, x3, y3) => (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1); const A = [p1.lo, p1.la], B = [p2.lo, p2.la], C = [a[1], a[0]], D = [b[1], b[0]]; return d(...A, ...B, ...C) * d(...A, ...B, ...D) <= 0 && d(...C, ...D, ...A) * d(...C, ...D, ...B) <= 0; };
    let n = 0; for (let i = 1; i < P.length; i++) if (cr(P[i - 1], P[i], g.gate.a, g.gate.b)) n++; return { crossings: n, pts: P.length }; });
  ok(x.crossings >= 1, 'the route crosses the gate line', JSON.stringify(x));
  ok(errs.length === 0, 'no page errors', errs.slice(0, 3).join(' | '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
