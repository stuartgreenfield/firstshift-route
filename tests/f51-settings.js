/* F51 (Stuart 18 Nov 17:20, docs/SETTINGS-REVIEW.md): the eight Settings answers. Run: node tests/f51-settings.js <base> <path> */
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8779', PATH = process.argv[3] || '/channel-area/';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
const init = () => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); const x = new Date(); localStorage.setItem('fs-terms', x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' }); await ctx.addInitScript(init);
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(BASE + PATH, { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.FSSetOrder, null, { timeout: 60000 }); await p.waitForTimeout(6000);
  await p.evaluate(() => document.getElementById('setBtn').click()); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const $ = i => document.getElementById(i), inP = (id, pane) => { const e = $(id), pn = $(pane); return !!(e && pn && pn.contains(e)); }, lab = id => (document.querySelector('label[for="' + id + '"]') || {}).textContent;
    const ais = [...document.querySelectorAll('h3')].find(h => h.textContent.trim() === 'AIS');
    return { mark: !!window.FS_MARK, plus: !!window.__navBoat, fixSetHidden: !!($('fixSet') && $('fixSet').hidden), fixCourse: !!$('fixCourse'), depth2Hidden: !!($('depth2') && $('depth2').closest('.row').hidden), depthInCourse: inP('depth', 's-course'),
      drHidden: !!($('drOn') && $('drOn').closest('.row').hidden), aisPane: ais ? ais.closest('.sbody').id : null, shareInMine: inP('shareTrack', 's-mine'), shareLinkInMine: inP('shareLink', 's-mine'),
      more: !!document.querySelector('details.f51more #tssNogo'), tackLab: lab('tackS'), gybeLab: lab('gybeS'), startTk: !!$('startTk'), startGy: !!$('startGy') }; });
  ok(r.fixSetHidden && r.fixCourse, '1: Fixed wind route in Course only', r);
  ok(r.depth2Hidden && r.depthInCourse, '2: one safety depth, in Course');
  if (r.plus) { ok(r.drHidden, '3: dead reckoning only in Instruments (+ tools)'); ok(r.aisPane === 's-inst', '5: AIS with the alarms in Instruments (+ tools)', r.aisPane); }
  else ok(r.aisPane === 's-display', '5: AIS stays in Display in Route and Mark', r.aisPane);
  ok(r.shareInMine && r.shareLinkInMine, '6: Follow the boat in My set-up');
  if (r.mark) ok(r.more, '7: Mark: keep-out areas and traffic lanes behind More');
  ok(r.tackLab === 'Tack loss (routing)' && r.gybeLab === 'Gybe loss (routing)' && r.startTk && r.startGy, '8: turn loss and turn time side by side');
  await p.fill('#startTk', '11'); await p.dispatchEvent('#startTk', 'change');
  ok(await p.evaluate(() => window.FSSolent && FSSolent.state && FSSolent.state().tackS === 11), '8: the start tack time reaches the start kit');
  ok(!p.errs.length, 'no script errors', p.errs.slice(0, 3)); await b.close(); console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
