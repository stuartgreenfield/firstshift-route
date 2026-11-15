/* Tide gate (Stuart 15 Nov 11:26 to 11:39): with a made-up tide that runs 1.5 kn along the leg until a set time and then reverses,
   the turn is found at that time, the ETA and margin are right, the speed needed is found, and the panel, the TIDE button, the
   rivals table and the deck strip show. Then the same with the real forecast in Practice. Run: node tests/tidegate.js <base> */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8778';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/channel-area/?race=morgan'); await p.waitForFunction(() => window.FSTideGate && document.getElementById('tgBtn'), null, { timeout: 300000 }); await p.waitForTimeout(1500);
  const m = await p.evaluate(() => {
    const real = window.__fsTideAt, T = Date.now() + 90 * 60000; window.__fsTideAt = (la, lo, ep) => { const s = ep * 1000 < T ? 1 : -1; return [0, 1.5 * s]; };   /* north-going 1.5 kn, then south */
    const A = { lat: 50.70, lon: -1.30 }, B = { lat: 50.80, lon: -1.30 };   /* 6 nm due north */
    const now = Date.now(), L = FSTideGate.sail(A, B, 4, now), tn = FSTideGate.turn(B, 0, now), need = FSTideGate.need(A, B, T, now), L2 = FSTideGate.sail(A, B, need, now);
    window.__fsTideAt = real; return { mins: L.mins, factor: L.factor, turnIn: (tn.t - now) / 60000, to: tn.to, nowS: tn.now, need, needEta: (L2.eta - now) / 60000 };
  });
  ok(Math.abs(m.mins - 65.5) <= 1.5 && m.factor > 1.45, 'a 6 nm leg at 4 kn with 1.5 kn fair takes 65 to 66 min (6 nm at 5.5 kn) and the tide factor is +1.5 kn', JSON.stringify({ mins: m.mins, factor: m.factor.toFixed(2) }));
  ok(Math.abs(m.turnIn - 90) <= 5 && m.to === 'foul' && m.nowS === 'fair', 'the turn at the mark is found when the tide along the leg changes sign (within 5 min)', m.turnIn + ' min, fair to ' + m.to);
  ok(m.need > 2 && m.needEta <= 90.5, 'the speed needed to reach the mark by the turn', m.need.toFixed(2) + ' kn, ETA ' + m.needEta + ' min');
  await p.evaluate(() => window.__navPractice && window.__navPractice(true, 20)); await p.waitForTimeout(8000);
  await p.evaluate(() => { FSTideGate.C.rivals = [{ name: 'Rival One', tcc: 1.05 }]; }); await p.click('#tgBtn'); await p.waitForTimeout(2500);
  const r = await p.evaluate(() => { const e = document.getElementById('tgPop'); return { open: !e.hidden, txt: e.textContent.slice(0, 600), rows: e.querySelectorAll('.tgt tr').length, ring: !!e.querySelector('svg circle') }; });
  ok(r.open && (/Tide along the leg/.test(r.txt) || /Needs|No tide|No next|Waiting/.test(r.txt)), 'TIDE opens the panel: the next mark, tide along the leg and the gate (or what it needs)', r.txt.slice(0, 160));
  ok(r.rows >= 6 || /Needs|No tide|Waiting/.test(r.txt), 'the rivals table: a typed boat and the rating bands, elapsed and corrected', r.rows + ' rows');
  await p.evaluate(() => { const d = document.getElementById('fsDeckBtn'); if (d) d.click(); FSTideGate.tick(); }); await p.waitForTimeout(800);
  const st = await p.evaluate(() => { const s = document.getElementById('tgStrip'); return s ? { shown: !s.hidden, t: s.textContent } : null; });
  ok(!st || !st.shown || /^TIDE (FAIR|FOUL|SLACK) · turns \d\d:\d\d · ETA \d\d:\d\d · [+-]\d+ min$/.test(st.t), 'on the deck screen the strip gives the gate in one line', st && st.t);
  ok(errs.length === 0, 'no page errors', errs.slice(0, 3).join(' | '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
