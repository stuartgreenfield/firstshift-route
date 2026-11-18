/* F37b (Stuart 18 Nov 2026, "hard testing first"; "Route repo now, Route+ later"): Route's GPS scenarios with the boat simulator.
   The simulated boat (tools/nmea-sim/sim.js) sails off Cowes; its position is given to the page as the phone's GPS each second, with the
   page's own clock run forward in step. Each scenario has its expected result written beside it, worked out from the simulator's own
   figures, never from Route's code. Run: node tests/sim-route.js <baseUrl> [scenario names...]
   e.g. node tests/sim-route.js https://firstshift-route.pages.dev */
const { chromium } = require('playwright');
const Sim = require('../tools/nmea-sim/sim.js');
const BASE = (process.argv[2] || 'http://localhost:8766').replace(/\/$/, ''), ONLY = process.argv.slice(3);
let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
const nm = (a, b) => Math.hypot((a[0] - b[0]) * 60, (a[1] - b[1]) * 60 * Math.cos(a[0] * Math.PI / 180));
const init = () => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); const x = new Date(); localStorage.setItem('fs-terms', x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); };

async function open(b, opt) {
  const sim = new Sim(Object.assign({ seed: 41, start: Date.now() }, opt || {}));
  const g = () => ({ latitude: sim.truth.lat, longitude: sim.truth.lon, accuracy: 5 });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block', geolocation: g(), permissions: ['geolocation'] }); await ctx.addInitScript(init);
  await ctx.clock.install({ time: sim.b.t });
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  /* the phone's GPS through Chrome's own override, with speed and heading as a phone sends them (Playwright's setGeolocation has neither) */
  const cdp = await ctx.newCDPSession(p), T = sim.truth;
  const put = () => cdp.send('Emulation.setGeolocationOverride', { latitude: sim.truth.lat, longitude: sim.truth.lon, accuracy: 5, speed: sim.truth.sog * 1852 / 3600, heading: sim.truth.cog });
  await put();
  await p.goto(BASE + '/channel-area/?race=morgan', { waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 240; i++) { if (await p.evaluate(() => !!(window.__navCourse && window.__navCourse() && window.__fsDR))) break; await ctx.clock.runFor(500); await new Promise(r => setTimeout(r, 50)); }
  const S = { p, ctx, sim, t: 0, gps: true,
    /* each second: four simulator steps, the phone's GPS moved to the boat (unless the GPS is "lost"), the page's clock a second on */
    async sail(secs, each) { for (let i = 0; i < secs; i++) { for (let k = 0; k < 4; k++) sim.tick(); if (S.gps) await put(); await ctx.clock.runFor(1000); S.t++; if (each) { const r = await each(S); if (r === false) break; } } },
    ev: (f, a) => p.evaluate(f, a), close: () => ctx.close() };
  await p.click('#liveBtn'); await S.sail(5); return S;
}

const SCEN = {
  /* Expected: Live GPS puts the boat where the simulator is (within 10 m) and its speed over the ground within 0.3 kn after 30 s. */
  async follow(b) {
    const S = await open(b); await S.sail(40);
    const f = await S.ev(() => window.__fsLiveFix()), T = S.sim.truth, d = f ? nm([f.la, f.lo], [T.lat, T.lon]) * 1852 : null;
    ok(d != null && d < 10, 'Live GPS: the boat is where the GPS says', d != null ? d.toFixed(1) + ' m' : 'no fix');
    ok(f && f.sog != null && Math.abs(f.sog - T.sog) < 0.3, 'Live GPS: speed over the ground', f && f.sog != null ? f.sog.toFixed(2) + ' kn against ' + T.sog.toFixed(2) : 'none');
    ok(!S.p.errs.length, 'Live GPS: no script errors', S.p.errs.slice(0, 2).join(' / ')); await S.close();
  },
  /* GPS lost for 2 minutes. Expected: dead reckoning takes over; after 2 min it is within a fifth of the distance sailed of the true
     position (Route reckons from the last course and speed made good, so a tack or a wind shift in the gap adds error); GPS back in 5 s. */
  async gpsloss(b) {
    const S = await open(b); await S.sail(60);
    const a = [S.sim.truth.lat, S.sim.truth.lon]; S.gps = false; const t1 = S.t; let on = null, run = 0, last = a;
    await S.sail(120, async s => { const T = s.sim.truth; run += nm(last, [T.lat, T.lon]); last = [T.lat, T.lon]; if (on == null && await s.ev(() => window.__fsDR().active)) on = s.t; });
    const dr = await S.ev(() => window.__fsDR()), T = S.sim.truth, err = dr.fix ? nm([dr.fix.la, dr.fix.lo], [T.lat, T.lon]) : null;
    ok(on != null, 'GPS lost: dead reckoning starts', on != null ? 'after ' + (on - t1) + ' s' : 'never');
    ok(err != null && err < run * 0.2 + 0.02, 'GPS lost: after 2 min the reckoning is within a fifth of the distance sailed', err != null ? (err * 1852).toFixed(0) + ' m off after ' + (run * 1852).toFixed(0) + ' m sailed' : 'no fix');
    S.gps = true; const t2 = S.t; let back = null;
    await S.sail(20, async s => { if (!(await s.ev(() => window.__fsDR().active))) { back = s.t; return false; } });
    ok(back != null && back - t2 <= 5, 'GPS lost: the GPS takes back over when it returns', back != null ? (back - t2) + ' s' : 'still reckoning');
    ok(!S.p.errs.length, 'GPS lost: no script errors', S.p.errs.slice(0, 2).join(' / ')); await S.close();
  },
  /* Expected: MOB marks where the boat was (within 15 m) and the panel gives the way back. */
  async mob(b) {
    const S = await open(b); await S.sail(30); const T0 = Object.assign({}, S.sim.truth);
    { const bb = await S.p.locator('#mobBtn').boundingBox(); await S.p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await S.p.mouse.down(); await S.ctx.clock.runFor(1300); await S.p.mouse.up(); }   /* MOB is a one-second press and hold */ await S.sail(3);
    const m = await S.ev(() => JSON.parse(localStorage.getItem('fs-mob') || 'null')), off = m ? nm([m.lat, m.lon], [T0.lat, T0.lon]) * 1852 : null;
    ok(off != null && off < 15, 'MOB: marked where the boat was', off != null ? off.toFixed(1) + ' m' : 'no mark');
    await S.sail(30); const txt = await S.ev(() => { const e = document.getElementById('mob'); return e && !e.hidden ? e.textContent.replace(/\s+/g, ' ') : ''; });
    ok(/\d+\s*m/.test(txt), 'MOB: the way back is shown', txt.slice(0, 100));
    ok(!S.p.errs.length, 'MOB: no script errors', S.p.errs.slice(0, 2).join(' / ')); await S.close();
  },
  /* Gun in 5 min, both ends of a line square to the boat's course 0.5 nm ahead. Expected: time to burn = countdown less the distance to the
     line over the speed made good towards it, within 15 s (Route's speed comes from GPS fixes, so it lags a little). */
  async start(b) {
    const S = await open(b); await S.sail(40);
    const T = Object.assign({}, S.sim.truth), gun = Math.round(S.sim.b.t / 1000) + 300;
    const ends = [Sim.dest(T.lat, T.lon, T.cog - 70, 0.3), Sim.dest(T.lat, T.lon, T.cog + 70, 0.3)].map(q => Sim.dest(q[0], q[1], T.cog, 0.4));
    await S.ev(a => { window.__fsGun(a.gun); window.__fsSetLine('boat', a.e[0][0], a.e[0][1]); window.__fsSetLine('pin', a.e[1][0], a.e[1][1]); }, { gun, e: ends });
    let shown = 0; await S.sail(45, async s => { if (await s.ev(() => window.__fsBurn() != null)) shown++; });
    const burn = await S.ev(() => window.__fsBurn()), T2 = S.sim.truth, now = S.sim.b.t / 1000, mid = [(ends[0][0] + ends[1][0]) / 2, (ends[0][1] + ends[1][1]) / 2], r = Sim.rhumb([T2.lat, T2.lon], mid);
    const d = r.nm * Math.cos((r.brg - T.cog) * Math.PI / 180), vmg = T2.sog * Math.cos((T2.cog - T.cog) * Math.PI / 180), want = gun - now - d / vmg * 3600;
    ok(shown > 30, 'Start: time to burn shows while sailing at the line', shown + ' of 45 s');
    ok(burn != null && Math.abs(burn - want) < 15, 'Start: time to burn = countdown less distance over speed towards the line', burn != null ? Math.round(burn) + ' s shown, ' + Math.round(want) + ' s worked out' : 'none');
    ok(!S.p.errs.length, 'Start: no script errors', S.p.errs.slice(0, 2).join(' / ')); await S.close();
  },
  /* The boat reaches across to the Morgan Cup's first mark (Needles Fairway, to port) and rounds it. Expected: the mark ticks off and
     the plotter moves on to the finish. */
  async rounding(b) {
    const NF = [50.63733, -1.64967], start = Sim.dest(NF[0], NF[1], 75, 0.8);
    const S = await open(b, { pos: start, twd: 345, shift: 3, drift: 0.3 });
    S.sim.marks.ww = NF; S.sim.target = 'ww';
    await S.ev(g => window.__fsGun(g), Math.round(S.sim.b.t / 1000) - 900);   /* the race started 15 minutes ago */
    let done = null, first = null;
    await S.sail(900, async s => { const m = await s.ev(() => { const c = window.__fsCalc(); return c && c.mark ? { n: c.mark.n, name: c.mark.name, last: c.mark.last && c.mark.last.name } : null; }); if (m && first == null) first = m; if (m && /Needles/i.test(m.last || '')) { done = m; return false; } });
    ok(first && /Needles/i.test(first.name), 'Rounding: the plotter points at Needles Fairway first', first ? first.name : 'no mark shown');
    ok(done != null, 'Rounding: Needles Fairway ticks off as the boat rounds it', done ? 'next: ' + done.name + ' after ' + S.t + ' s' : 'not ticked off in 15 min');
    ok(!S.p.errs.length, 'Rounding: no script errors', S.p.errs.slice(0, 2).join(' / ')); await S.close();
  }
};

(async () => {
  const b = await chromium.launch();
  for (const k of Object.keys(SCEN)) { if (ONLY.length && !ONLY.includes(k)) continue; const t = Date.now(); try { await SCEN[k](b); } catch (e) { ok(false, k + ': ran to the end', e.message.split('\n')[0]); } console.log('  (' + k + ': ' + Math.round((Date.now() - t) / 1000) + ' s)'); }
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
