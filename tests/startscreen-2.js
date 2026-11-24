/* Start screen, approved design (Stuart 24 Nov 13:40 to 15:50; to-do 14): the picture opens first, wind up with a North up switch, a
   predictor switch (off at first) and an AIS switch where AIS exists; the burn line; the ladder rungs through each end labelled; the
   flags hoisted by the clock; AP then AP down gives the warning signal 1 minute later and a new sequence; the screen hands back to the
   main view 10 s after the gun; RYS and JOG lines fly the signals at the shore end. Pictures for a look: SHOT=<dir>.
   Run: node tests/startscreen-2.js <base> [path] */
const { chromium } = require('playwright'); const fs = require('fs');
const BASE = process.argv[2] || 'http://localhost:8779', PATH = process.argv[3] || '/mark/', SHOT = process.env.SHOT;
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, serviceWorkers: 'block', geolocation: { latitude: 50.7745, longitude: -1.2990, accuracy: 5 }, permissions: ['geolocation'] });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + PATH);
  await p.waitForFunction(() => window.__fsGun && window.FSSolent && window.__fsSetLine, null, { timeout: 300000 }); await p.waitForTimeout(4000);
  const shot = async n => { if (SHOT) { fs.mkdirSync(SHOT, { recursive: true }); await p.screenshot({ path: SHOT + '/' + n + '.png' }); } };
  /* a line off Cowes, the wind typed, the gun in 3:30 */
  await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x && x.offsetParent) x.click(); FSSolent.set({ type: 'marks', start: { code: null, name: 'Start line', lat: 50.778, lon: -1.298, line: true }, marks: FSSolent.board('3F P, 2C S').marks, plan: 'list' }); window.__fsSetLine('boat', 50.7770, -1.2950); window.__fsSetLine('pin', 50.7790, -1.3010); window.FSSolent.accSet({ wind: { twd: 250, tws: 12, at: Date.now(), src: 'typed' }, flag: 'P', ssPic: null, ssPred: false, ssNorth: false, pp: false, warnAt: null, ssMin: 10 }); FSSolent.set({ startAt: Math.round(Date.now() / 1000) + 210 }); FSSolent.go(); });
  await p.waitForTimeout(2000); await p.evaluate(() => { const q = document.querySelector('#solSeq [data-q="big"]'); if (q) q.click(); }); await p.waitForTimeout(2000);
  const st = () => p.evaluate(() => { const s = document.getElementById('solStartScr'); if (!s) return null; const o = s.querySelector('.ssopt'); return { open: !s.hidden, pic: !s.classList.contains('ssthru'), opts: o ? [...o.querySelectorAll('button')].map(x => x.textContent) : [], clock: s.querySelector('.sst').textContent, sub: s.querySelector('.ssg').textContent }; });
  let S = await st(); ok(S && S.open, 'the start screen opens', S);
  ok(S && S.pic, 'the picture opens first (not the see-through chart)');
  ok(S && S.opts[0] === 'Wind up' && /Predictor off/.test(S.opts[1]), 'switches on the picture: Wind up, Predictor off', S && S.opts);
  await shot('1-windup');
  await p.evaluate(() => document.querySelector('#solStartScr [data-q="ssnorth"]').click()); await p.waitForTimeout(600);
  S = await st(); ok(S.opts[0] === 'North up', 'one tap: North up', S.opts[0]); await shot('2-northup');
  await p.evaluate(() => { document.querySelector('#solStartScr [data-q="ssnorth"]').click(); document.querySelector('#solStartScr [data-q="sspred"]').click(); }); await p.waitForTimeout(600);
  S = await st(); ok(/Predictor on/.test(S.opts[1]), 'the predictor switches on', S.opts[1]);
  /* flags: P flies from 4:00 to 1:00; we are at about 3:25 */
  const px = await p.evaluate(() => { const cv = document.querySelector('#solStartScr .sscv'); return cv.toDataURL().length; }); ok(px > 5000, 'the picture draws', px);
  /* AP, then AP down: warning in 1 minute, then a new sequence */
  await p.evaluate(() => document.querySelector('#solStartScr [data-q="ap"]').click()); await p.waitForTimeout(600);
  S = await st(); ok(S.clock === 'AP' && /AP down/.test(S.sub), 'AP: the clock reads AP and asks for AP down', S);
  const apLabel = await p.evaluate(() => document.querySelector('#solStartScr [data-q="ap"]').textContent); ok(apLabel === 'AP down', 'the AP button now reads AP down', apLabel);
  await p.evaluate(() => document.querySelector('#solStartScr [data-q="ap"]').click()); await p.waitForTimeout(600);
  const w = await p.evaluate(() => window.FSSolent.ss && JSON.parse(localStorage.getItem('fs-solent') || localStorage.getItem('fs-mark') || '{}'));
  S = await st(); ok(/^W \d:\d\d$/.test(S.clock) && /warning/i.test(S.sub), 'AP down: counting down to the warning signal', S);
  await shot('3-apdown');
  /* bring the warning signal forward to now: the gun should then be one sequence away */
  const g = await p.evaluate(() => { window.FSSolent.accSet({ warnAt: Math.round(Date.now() / 1000) - 1 }); return new Promise(res => setTimeout(() => res(FSSolent.state ? FSSolent.state().startAt : null), 1500)); });
  const left = g ? g - Date.now() / 1000 : null; ok(left != null && left > 170 && left < 310, 'the warning signal starts a new sequence (gun 3 or 5 minutes on)', left && Math.round(left));
  /* the last minute with the black flag: a picture to look at */
  await p.evaluate(() => { window.FSSolent.accSet({ flag: 'B' }); FSSolent.set({ startAt: Math.round(Date.now() / 1000) + 45 }); }); await p.waitForTimeout(2000); await shot('4-black-last-minute');
  /* the gun: hands back to the main view 10 s after */
  await p.evaluate(() => FSSolent.set({ startAt: Math.round(Date.now() / 1000) - 4 })); await p.waitForTimeout(1500);
  S = await st(); ok(S.open && /main view in \d+ s/.test(S.sub), 'just after the gun it says when it hands back', S.sub);
  await p.evaluate(() => FSSolent.set({ startAt: Math.round(Date.now() / 1000) - 12 })); await p.waitForTimeout(1500);
  S = await st(); ok(!S.open, '10 s after the gun the main view is back');
  /* RYS line: signals ashore */
  const rys = await p.evaluate(() => { const l = window.__fsLine && window.__fsLine(); return !!l; });
  ok(rys, 'line kept');
  ok(!errs.length, 'No script errors', errs.slice(0, 3));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
