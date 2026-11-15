/* Tide by hand (Stuart 15 Nov 11:30): the router's tide turned by a set number of degrees, and on a Solent race a strength and
   turn for each leg, applied inside a box round the leg and fading to nothing 0.3 nm beyond it. Pure maths, no page.
   Run: node tests/tide-hand.js */
const path = require('path'); global.self = global; const FS = require(path.join(__dirname, '..', 'site', 'cervantes', 'router.js'));
const R = FS && FS.adjust ? FS : global.FSRouter;
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
const dirOf = C => (Math.atan2(C[0], C[1]) * 180 / Math.PI + 360) % 360, spd = C => Math.hypot(C[0], C[1]);
const base = () => ({ wind: () => [10, 270], tide: () => [0, 2] });   /* 2 kn flowing north */
let s = R.adjust(base(), { tdir: 30 }); let C = s.tide(50.75, -1.3, 1000);
ok(Math.abs(dirOf(C) - 30) < 0.01 && Math.abs(spd(C) - 2) < 1e-9, 'tide direction +30° turns a northgoing stream to 030°, same strength', dirOf(C).toFixed(2) + '° ' + spd(C).toFixed(3) + ' kn');
s = R.adjust(base(), { tdir: -60, tspd: 50 }); C = s.tide(50.75, -1.3, 1000);
ok(Math.abs(dirOf(C) - 300) < 0.01 && Math.abs(spd(C) - 3) < 1e-9, 'with -60° and +50% it runs 300° at 3 kn', dirOf(C).toFixed(2) + '° ' + spd(C).toFixed(3) + ' kn');
const leg = { box: { s: 50.76, n: 50.78, w: -1.32, e: -1.28 }, tspd: -50, tdir: 90 };
s = R.adjust(base(), { legs: [leg] });
C = s.tide(50.77, -1.30, 1000); ok(Math.abs(dirOf(C) - 90) < 0.01 && Math.abs(spd(C) - 1) < 1e-9, 'inside the leg box: the leg\'s change in full (090°, 1 kn)', dirOf(C).toFixed(1) + '° ' + spd(C).toFixed(2));
C = s.tide(50.7575, -1.30, 1000); const w = 1 - (0.0025 * 60) / 0.3; ok(w > 0 && Math.abs(spd(C) - 2 * (1 - 0.5 * w)) < 1e-6 && Math.abs(dirOf(C) - 90 * w) < 0.01, 'just outside it fades', dirOf(C).toFixed(1) + '° ' + spd(C).toFixed(3) + ' kn (weight ' + w.toFixed(2) + ')');
C = s.tide(50.70, -1.30, 1000); ok(Math.abs(dirOf(C) - 0) < 1e-6 && Math.abs(spd(C) - 2) < 1e-9, 'well away from the leg the forecast is untouched');
s = R.adjust(base(), { tspd: 20, legs: [leg] }); C = s.tide(50.77, -1.30, 1000);
ok(Math.abs(spd(C) - 2 * 1.2 * 0.5) < 1e-9 && Math.abs(dirOf(C) - 90) < 0.01, 'a leg change goes on top of the whole-race change', spd(C).toFixed(3) + ' kn');
s = R.adjust(base(), { legs: [{ box: leg.box, tspd: 0, tdir: 0 }] }); ok(s.tide(50.77, -1.3, 0)[1] === 2, 'a leg left at 0 changes nothing');
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
