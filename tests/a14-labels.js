/* Screen audit A14 (labels give way to each other), A5 (toasts on the start screen sit in the chart band) and A27 (the test boat
   approaches a downwind start from the pre-start side). 19 Nov 2026.
   Run: node tests/a14-labels.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
const LABEL = /favoured|no bias|^Wind \d|^Start|^Finish|°T ·|LAYLINE|HEADER|LIFT|^NEXT|layline|^Upwind TWA|^Downwind TWA/;
(async () => { const b = await chromium.launch();
  const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.addInitScript((src) => { const LABEL = new RegExp(src);
    const F = CanvasRenderingContext2D.prototype.fillText, FR = CanvasRenderingContext2D.prototype.fillRect; window.__lbRec = [];
    CanvasRenderingContext2D.prototype.fillRect = function (x, y, w, h) { if (this.canvas && this.canvas.id === 'map' && x === 0 && y === 0 && w * 2 >= this.canvas.clientWidth) window.__lbRec = []; return FR.call(this, x, y, w, h); };   /* the sea is filled at the start of each frame: keep one frame */
    CanvasRenderingContext2D.prototype.fillText = function (t, x, y, mw) { try { if (this.canvas && this.canvas.id === 'map' && LABEL.test(String(t))) { const m = this.measureText(t), px = parseFloat((/(\d+(?:\.\d+)?)px/.exec(this.font) || [0, 11])[1]), w = m.width, al = this.textAlign, bl = this.textBaseline, tr = this.getTransform();
      const x0 = al === 'center' ? x - w / 2 : al === 'right' || al === 'end' ? x - w : x, y0 = bl === 'middle' ? y - px / 2 : bl === 'bottom' || bl === 'alphabetic' ? y - px : y; window.__lbRec.push({ t: String(t), x: x0 + tr.e / tr.a, y: y0 + tr.f / tr.d, w, h: px }); } } catch (e) {} return mw == null ? F.call(this, t, x, y) : F.call(this, t, x, y, mw); };
    document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); }, LABEL.source);
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__navFc && window.__navFc().P && document.getElementById('solCardT'), null, { timeout: 300000 }); await p.waitForTimeout(1500);
  await p.click('#solCardT'); await p.waitForTimeout(4000);
  const frame = async () => p.evaluate(async () => { window.__lbRec = []; window.__fsRedraw(); await new Promise(r => setTimeout(r, 900)); const seen = {}; return window.__lbRec.filter(q => { const k = q.t + '|' + Math.round(q.x) + '|' + Math.round(q.y); if (seen[k]) return false; seen[k] = 1; return true; }); });
  const clash = L => { const out = []; for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], q = L[j]; if (a.x < q.x + q.w - 1 && a.x + a.w > q.x + 1 && a.y < q.y + q.h - 1 && a.y + a.h > q.y + 1) out.push(a.t + ' / ' + q.t); } return out; };
  let L = await frame();
  ok(L.some(q => /favoured|no bias/.test(q.t)) && L.some(q => /^Wind \d/.test(q.t)), 'Start screen: the bias and wind labels are drawn', L.map(q => q.t));
  ok(clash(L).length === 0, 'Start screen: no two chart labels overlap', clash(L));
  const ends = await p.evaluate(() => { const l = window.__fsLine(), cr = document.getElementById('map').getBoundingClientRect(); return [l.boat, l.pin].map(q => { const xy = window.__fsXY(q[0], q[1]); return [xy[0] - cr.left, xy[1] - cr.top]; }); });
  const onEnd = L.filter(q => ends.some(e => e[0] > q.x - 6 && e[0] < q.x + q.w + 6 && e[1] > q.y - 4 && e[1] < q.y + q.h + 14)).map(q => q.t);
  ok(onEnd.length === 0, 'Start screen: no label sits over the committee boat or the pin', { onEnd, ends });
  const sf = L.filter(q => /^Start|^Finish/.test(q.t)).map(q => q.t);
  ok(sf.length === 1 && /^Start and finish/.test(sf[0]), 'Start and finish on one line: one name, not two on top of each other', sf);
  /* A5: a toast on the start screen sits in the clear chart band */
  const tz = await p.evaluate(async () => { window.NavToast('Test mode: the gun is in two and a half minutes.'); await new Promise(r => setTimeout(r, 300)); const e = document.getElementById('navToast'), r = e.getBoundingClientRect(), cs = getComputedStyle(document.body); return { top: r.top, bottom: r.bottom, sst: parseFloat(cs.getPropertyValue('--sst')), ssb: parseFloat(cs.getPropertyValue('--ssb')), mob: (document.getElementById('mobBtn') || { getBoundingClientRect: () => ({ bottom: 0 }) }).getBoundingClientRect().bottom }; });
  ok(tz.top >= tz.sst && tz.bottom <= tz.ssb && tz.top >= tz.mob, 'Start screen: a toast sits in the chart band, below man overboard, not over the boxes', tz);
  /* A27: before the gun the test boat is on the pre-start side, close-hauled for a beat and on starboard gybe for a run */
  const side = () => p.evaluate(() => { const l = window.__fsLine(), e = FSSolent.em(), c = window.__navCourse(), m = c.marks[0], mid = [(l.boat[0] + l.pin[0]) / 2, (l.boat[1] + l.pin[1]) / 2], k = Math.cos(mid[0] * Math.PI / 180); return { dot: ((e.p.lat - mid[0]) * (m.lat - mid[0]) + (e.p.lon - mid[1]) * k * k * (m.lon - mid[1])) < 0, mode: e.mode }; });
  let s1 = await side(); ok(s1.dot && /starboard tack/.test(s1.mode), 'Upwind start: the test boat approaches from below the line, on starboard tack', s1);
  await p.evaluate(() => { FSSolent.em().shift = 180; }); await p.waitForTimeout(2500);
  let s2 = await side(); ok(s2.dot && /starboard gybe/.test(s2.mode), 'Downwind start (A27): the test boat approaches from above the line, away from the first mark, on starboard gybe', s2);
  /* after the gun: racing labels give way too */
  await p.evaluate(() => { FSSolent.em().shift = 0; const g = Math.round(Date.now() / 1000 + 2); window.__fsGun(g); FSSolent.set({ startAt: g }); }); await p.waitForTimeout(4000);
  await p.evaluate(() => { FSSolent.em().x = 20; }); await p.waitForTimeout(15000);
  L = await frame(); ok(clash(L).length === 0, 'Racing: no two chart labels overlap', { n: L.length, clash: clash(L) });
  ok(errs.length === 0, 'No script errors', errs.slice(0, 3));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
