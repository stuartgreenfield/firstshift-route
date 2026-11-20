/* F59 (19 Nov 2026): a plan that passes the same water twice must match the boat to the pass nearest in time.
   The 20:04 check on 18 Nov put the boat 1 nm off the Fastnet plan and Route matched it to the return pass 65 hours later
   (off track 0.77 nm on the wrong side, rejoin 3907 min ahead). This test takes the matching code out of app.js as it stands
   and runs it on a made-up out-and-back plan whose two passes are 1.8 nm apart. node tests/f59-twopass.js [path/to/app.js] */
const fs = require('fs');
const src = fs.readFileSync((process.argv[2] && !/^https?:/.test(process.argv[2]) ? process.argv[2] : __dirname + '/../site/cervantes/app.js'), 'utf8');
const a = src.indexOf('var p = s.r.path, ts = tsOf(p)', src.indexOf('function liveCalc(f)')), b = src.indexOf('o.xte = best;', a);
if (a < 0 || b < 0) { console.log('FAIL | could not find the matching code in app.js'); process.exit(1); }
const body = src.slice(a, b) + 'return best;';
const R = Math.PI / 180;
const match = new Function('s', 'f', 'nowH', 'tsOf', 'R', 'o', body.replace(/return o;/g, 'return null;'));
/* out along 50.000 N to the east at 6 kn for 10 h, round a mark, back along 50.030 N (1.8 nm north) */
const path = [], T = [];
for (let k = 0; k <= 60; k++) { path.push({ la: 50.0, lo: -5 + k * 0.0155 }); T.push(k / 6); }
for (let k = 60; k >= 0; k--) { path.push({ la: 50.03, lo: -5 + k * 0.0155 }); T.push(10.5 + (60 - k) / 6); }
const tsOf = () => T, s = { r: { path } };
let fails = 0;
const rec = (what, ok, got, want) => { console.log((ok ? 'PASS' : 'FAIL') + ' | ' + what + ' | Route: ' + got + ' | expected: ' + want); if (!ok) fails++; };
/* boat 1.0 nm north of the outbound pass at hour 3: nearer the return pass (0.8 nm) than the outbound one (1.0 nm) */
const lo3 = -5 + 18 * 0.0155;
let r = match(s, { la: 50.0 + 1.0 / 60, lo: lo3 }, 3, tsOf, R, {});
rec('1.0 nm off the outbound pass, plan time 3 h: matched to the outbound pass', r && Math.abs(r.t - 3) < 0.5, r ? r.t.toFixed(2) + ' h, ' + r.d.toFixed(2) + ' nm ' + r.side : 'none', '3.00 h, 1.00 nm');
/* the same spot during the return pass (hour 17.5) must match the return pass */
r = match(s, { la: 50.0 + 1.0 / 60, lo: lo3 }, 17.5, tsOf, R, {});
rec('same spot at plan time 17.5 h: matched to the return pass', r && Math.abs(r.t - 17.5) < 0.5, r ? r.t.toFixed(2) + ' h, ' + r.d.toFixed(2) + ' nm ' + r.side : 'none', '17.50 h, 0.80 nm');
/* a boat genuinely 4 h behind on the outbound pass still matches the outbound pass */
r = match(s, { la: 50.0, lo: -5 + 12 * 0.0155 }, 6, tsOf, R, {});
rec('on the outbound track, 4 h behind: outbound pass, exact', r && Math.abs(r.t - 2) < 0.01 && r.d < 0.01, r ? r.t.toFixed(2) + ' h, ' + r.d.toFixed(3) + ' nm' : 'none', '2.00 h, 0.000 nm');
/* on a single-pass plan the point is the plain nearest one */
r = match(s, { la: 50.0 - 0.5 / 60, lo: -5 + 30 * 0.0155 }, 5, tsOf, R, {});
rec('0.5 nm south of the outbound track: plain nearest point', r && Math.abs(r.d - 0.5) < 0.01 && Math.abs(r.t - 5) < 0.01, r ? r.t.toFixed(2) + ' h, ' + r.d.toFixed(3) + ' nm ' + r.side : 'none', '5.00 h, 0.500 nm');
console.log('\n' + (4 - fails) + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
