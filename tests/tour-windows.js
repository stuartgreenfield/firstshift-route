/* The tour (level 1) has the step on moving and putting away windows, and it points at something on the screen */
const { chromium, devices } = require('playwright');
(async () => { const b = await chromium.launch(); let fails = 0;
  for (const [base, path] of [['http://localhost:8779', '/mark/'], ['http://localhost:8779', '/channel-area/'], ['http://localhost:8778', '/mark/']]) {
    const c = await b.newContext({ ...devices['iPhone 14 Plus'], serviceWorkers: 'block' });
    await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); });
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(base + path);
    await p.waitForFunction(() => window.FSTour && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(3500);
    await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x && x.offsetParent) x.click(); });
    const lv = await p.evaluate(() => (window.FSTourLevels || [{ steps: [] }])[0]); 
    const res = await p.evaluate(() => { const L = (window.FSTourLevels && FSTourLevels[0]) ? FSTourLevels[0].steps : (window.FSTourRoute || []); const st = L.find(s => /put away any window/.test(s.t)); if (!st) return 'missing'; const el = typeof st.el === 'function' ? st.el() : document.querySelector(st.el); const alt = st.alt && document.querySelector(st.alt); return 'found; points at ' + ((el && (el.id || el.className)) || (alt && (alt.id || 'alt')) || 'nothing'); });
    console.log(base + path, res, errs.length ? errs[0] : 'no errors'); if (!/points at (?!nothing)/.test(res) || errs.length) fails++; await c.close(); }
  console.log(fails ? fails + ' failed' : 'all passed'); await b.close(); })();
