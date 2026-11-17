/* Stuart 17 Nov 06:17 (iPhone): "Could not load the forecasts: undefined is not an object (evaluating '$('speed').options[$('speed').selectedIndex].textContent')".
   With nothing chosen in the Play speed list, the forecasts still load, no error box, and the speed shows 1h/s.
   Also: a fault in any one extra does not stop the forecasts. Run: node tests/speed-blank.js http://localhost:8779 */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch();
  for (const kind of ['blank speed', 'broken extra']) {
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await c.addInitScript(k => { const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1');
      document.addEventListener('DOMContentLoaded', () => { if (k === 'blank speed') document.getElementById('speed').selectedIndex = -1; else { const b = document.getElementById('spdMenu'); b.remove(); } }); }, kind);
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/channel-area/');
    const got = await p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); return f && f.sel && !f.running; }, null, { timeout: 240000 }).then(() => true).catch(() => false);
    const st = await p.evaluate(() => ({ chip: document.getElementById('dataChip').textContent, err: [...document.querySelectorAll('body *')].some(e => e.offsetParent && e.children.length === 0 && /Could not load the forecasts/.test(e.textContent)), spd: document.getElementById('spdBtn').textContent }));
    ok(got && !st.err && !/Could not/.test(st.chip), kind + ': the forecasts load and route, no error box', st.chip.slice(0, 80));
    if (kind === 'blank speed') ok(/1h\/s/.test(st.spd), 'the speed button shows 1h/s', st.spd);
    ok(!errs.length, kind + ': no page errors', errs.join(' | ') || null); await c.close(); }
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
