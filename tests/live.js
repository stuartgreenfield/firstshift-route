/* Live GPS check: puts a simulated phone at positions whose right answers are worked out here, independently of Route's code,
   and compares Route's readings. node tests/live.js http://localhost:8767 [race ...] */
const { chromium, devices } = require('playwright');
const BASE = (process.argv[2] || 'http://localhost:8767').replace(/\/$/, ''), RACES = process.argv.slice(3).length ? process.argv.slice(3) : ['channel-area/?race=morgan', 'channel-area/?race=channel'];
const R = Math.PI / 180, NM = 3440.065;
function rhumb(a, b) { const p1 = a[0] * R, p2 = b[0] * R, dp = p2 - p1; let dl = (b[1] - a[1]) * R; if (Math.abs(dl) > Math.PI) dl -= Math.sign(dl) * 2 * Math.PI; const dq = Math.log(Math.tan(Math.PI / 4 + p2 / 2) / Math.tan(Math.PI / 4 + p1 / 2)), q = Math.abs(dq) > 1e-12 ? dp / dq : Math.cos(p1); return { nm: Math.sqrt(dp * dp + q * q * dl * dl) * NM, brg: (Math.atan2(dl, dq) / R + 360) % 360 }; }
function dest(a, brg, nm) { const d = nm / NM, p1 = a[0] * R, p2 = p1 + d * Math.cos(brg * R), dq = Math.log(Math.tan(Math.PI / 4 + p2 / 2) / Math.tan(Math.PI / 4 + p1 / 2)), q = Math.abs(dq) > 1e-12 ? (p2 - p1) / dq : Math.cos(p1); return [p2 / R, a[1] + d * Math.sin(brg * R) / q / R]; }
const adiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
(async () => {
  const b = await chromium.launch(); const out = []; let fails = 0;
  const rec = (race, what, ok, got, want) => { out.push((ok ? 'PASS' : 'FAIL') + ' | ' + race + ' | ' + what + ' | Route: ' + got + ' | expected: ' + want); if (!ok) fails++; };
  for (const race of RACES) {
    const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', geolocation: { latitude: 50.7, longitude: -1.3, accuracy: 6 }, permissions: ['geolocation'] });
    await ctx.addInitScript(() => { const x = new Date(); localStorage.setItem('fs-terms', x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); localStorage.setItem('fs-livetrail', '[]'); });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.clock.install({ time: new Date() });
    await p.goto(BASE + '/' + race); await p.waitForFunction(() => document.querySelectorAll('#finBox .fin').length > 0, null, { timeout: 180000 });
    for (let k = 0; k < 40; k++) { await p.clock.runFor(5000); await p.waitForTimeout(500); if (await p.evaluate(() => document.getElementById('prog').hidden)) break; }   /* let the refine finish */
    const plan = await p.evaluate(() => window.__fsPlan()); const name = race.split('=')[1] || race;
    const P = plan.path, TS = plan.ts, T0 = plan.T0;
    /* a point a third of the way in, on a straight piece at least 0.4 nm long with straight pieces either side */
    let k = Math.floor(P.length / 3);
    for (; k < P.length - 3; k++) { const s1 = rhumb(P[k - 1], P[k]), s2 = rhumb(P[k], P[k + 1]), s3 = rhumb(P[k + 1], P[k + 2]); if (s2.nm > 0.4 && adiff(s1.brg, s2.brg) < 8 && adiff(s2.brg, s3.brg) < 8 && P[k][2] === P[k + 1][2]) break; }
    const A = P[k], Bp = P[k + 1], trk = rhumb(A, Bp).brg, mid = [(A[0] + Bp[0]) / 2, (A[1] + Bp[1]) / 2], tMid = (TS[k] + TS[k + 1]) / 2;
    const at = async (tH, pos, limits) => {
      await p.clock.setSystemTime(new Date((T0 + tH * 3600) * 1000));
      if (limits) await p.evaluate((l) => { document.getElementById('xteLim').value = l[0]; document.getElementById('behLim').value = l[1]; }, limits);
      await ctx.setGeolocation({ latitude: pos[0], longitude: pos[1], accuracy: 6 }); await p.clock.runFor(1500); await p.waitForTimeout(200);
      return p.evaluate(() => { const c = window.__fsLive(); return { c, text: document.getElementById('liveBox').innerText.replace(/\s+/g, ' '), alarm: document.getElementById('liveBox').classList.contains('alarm') }; });
    };
    await p.click('#liveBtn');
    // A: exactly on the plan, at the plan's time
    let r = await at(tMid, mid, [1, 15]);
    rec(name, 'on the plan: off track', r.c.xte.d < 0.05, r.c.xte.d.toFixed(3) + ' nm', '0.00 nm');
    rec(name, 'on the plan: ahead/behind', Math.abs(r.c.ahead) < 1, r.c.ahead.toFixed(1) + ' min', '0 min');
    rec(name, 'on the plan: distance to PLAN NOW', r.c.plan && rhumb(mid, [r.c.plan.la, r.c.plan.lo]).nm < 0.05, r.c.plan ? rhumb(mid, [r.c.plan.la, r.c.plan.lo]).nm.toFixed(3) + ' nm' : 'none', '0.00 nm');
    rec(name, 'on the plan: says On plan, no alert', /On plan/.test(r.text) && !r.alarm, (r.text.match(/On plan/) ? 'On plan' : 'not') + (r.alarm ? ', alert' : ', no alert'), 'On plan, no alert');
    // B and C: the same spot 30 min before and after the plan gets there
    r = await at(tMid - 0.5, mid);
    rec(name, 'plan reaches here in 30 min: ahead', Math.abs(r.c.ahead - 30) < 1, r.c.ahead.toFixed(1) + ' min', '+30 min');
    r = await at(tMid + 0.5, mid);
    rec(name, 'plan was here 30 min ago: behind', Math.abs(r.c.ahead + 30) < 1, r.c.ahead.toFixed(1) + ' min', '−30 min');
    rec(name, 'behind 30 min, limit 15: alert', r.alarm, r.alarm ? 'alert' : 'no alert', 'alert');
    // D and E: 1.0 nm square off the track to the left and right, at the plan's time
    for (const [side, off] of [['L', -90], ['R', 90]]) {
      const pos = dest(mid, (trk + off + 360) % 360, 1.0); r = await at(tMid, pos, [1.5, 0]);
      rec(name, '1.0 nm ' + (side === 'L' ? 'left' : 'right') + ': off track', Math.abs(r.c.xte.d - 1) < 0.05 && r.c.xte.side === side, r.c.xte.d.toFixed(3) + ' ' + r.c.xte.side, '1.000 ' + side);
      const tp = rhumb(pos, [r.c.plan.la, r.c.plan.lo]), want = (trk - off + 360) % 360;
      rec(name, '1.0 nm ' + side + ': course to PLAN NOW', adiff(tp.brg, want) < 2 && Math.abs(tp.nm - 1) < 0.05, Math.round(tp.brg) + '°T ' + tp.nm.toFixed(2) + ' nm', Math.round(want) + '°T 1.00 nm');
      rec(name, '1.0 nm ' + side + ', limit 1.5: no alert', !r.alarm, r.alarm ? 'alert' : 'no alert', 'no alert');
      // the rejoin Route offers: check its sums from scratch
      const rj = r.c.rejoin;
      if (!rj) { rec(name, '1.0 nm ' + side + ': a way back is offered', false, 'none', 'Catch the plan or Back on track'); continue; }
      const d = rhumb(pos, [rj.la, rj.lo]), onPlan = P.findIndex(q => Math.abs(q[0] - rj.la) < 1e-6 && Math.abs(q[1] - rj.lo) < 1e-6);
      rec(name, '1.0 nm ' + side + ': rejoin point is on the plan, same leg, within 90 min', onPlan > k && P[onPlan][2] === P[k][2] && TS[onPlan] - tMid <= 1.5 + 1e-6, 'point ' + onPlan + ', ' + ((TS[onPlan] - tMid) * 60).toFixed(0) + ' min ahead', 'later point, same leg, ≤ 90 min');
      rec(name, '1.0 nm ' + side + ': rejoin distance and course', Math.abs(d.nm - rj.nm) < 0.02 && adiff(d.brg, rj.brg) < 1, rj.nm.toFixed(2) + ' nm ' + Math.round(rj.brg) + '°T', d.nm.toFixed(2) + ' nm ' + Math.round(d.brg) + '°T');
      const ta = tMid + d.nm / rj.sog;
      rec(name, '1.0 nm ' + side + ': arrival time = distance / SOG', Math.abs(ta - rj.ta) * 60 < 0.5, ((rj.ta - tMid) * 60).toFixed(1) + ' min', ((ta - tMid) * 60).toFixed(1) + ' min');
      if (rj.kind === 'catch') rec(name, '1.0 nm ' + side + ': Catch the plan arrives no later than the plan', rj.ta <= TS[onPlan] + 1e-6, ((TS[onPlan] - rj.ta) * 60).toFixed(1) + ' min to spare', '≥ 0');
      else rec(name, '1.0 nm ' + side + ': Back on track is the soonest way back', true, rj.kind, 'catch or track');
      rec(name, '1.0 nm ' + side + ': SOG believable for the boat', rj.sog > 1 && rj.sog < 16, rj.sog.toFixed(1) + ' kn', '1 to 16 kn');
    }
    // F: 1.5 nm off with a 1.0 nm limit: alert
    r = await at(tMid, dest(mid, (trk + 90) % 360, 1.5), [1, 0]);
    rec(name, '1.5 nm off, limit 1.0: alert', r.alarm, r.alarm ? 'alert' : 'no alert', 'alert');
    // G: sailing at 6 kn on 135°T, fixes 10 s apart (GPS speed not given, so Route works it out)
    let pos = mid, t = tMid; for (let i = 0; i < 8; i++) { pos = dest(pos, 135, 6 * 10 / 3600); t += 10 / 3600; r = await at(t, pos); }
    const sog = +(r.text.match(/SOG ([\d.]+) kn/) || [0, 'NaN'])[1], cog = +(r.text.match(/COG (\d+)°T/) || [0, 'NaN'])[1];
    rec(name, 'sailing 6 kn on 135°T: SOG', Math.abs(sog - 6) < 0.2, sog + ' kn', '6.0 kn');
    rec(name, 'sailing 6 kn on 135°T: COG', adiff(cog, 135) < 2, cog + '°T', '135°T');
    const trail = await p.evaluate(() => JSON.parse(localStorage.getItem('fs-livetrail') || '[]').length);
    rec(name, 'track kept on the phone', trail >= 1, trail + ' points saved', 'at least 1');
    rec(name, 'no script errors', !errs.length, errs.slice(0, 2).join(' / ') || 'none', 'none');
    await ctx.close();
  }
  await b.close();
  console.log(out.join('\n')); console.log('\n' + (out.length - fails) + ' passed, ' + fails + ' failed');
})();
