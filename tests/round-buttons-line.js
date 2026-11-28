/* AP: the round chart buttons are in ONE line. Stuart 27 Nov 23:00: "These icons must line up vertically along the edge of the screen or
   horizontally across the bottom of map". 28 Nov 06:35: "2.one column" (Route, buttons showing), "3. Fit buttons" (Route+, all seven in the row).
   For each tool and screen: opened, routed; then three states: the panel open as it comes, the panel closed, the button row cleared.
   In each state the round buttons that show must be either one column on the right-hand edge or one row on the bottom of the map:
   in line to the pixel, none on another, none off the screen, none above the things under the top bar.
   Run through tools/probe/with78.sh: node tests/round-buttons-line.js http://localhost:8779 route   (or mark; http://localhost:8778 routeplus, markplus)
   Pictures in /tmp/claude-0/probe/fabline. */
const { chromium } = require('playwright'); const fs = require('fs');
const BASE = process.argv[2], TOOL = process.argv[3] || 'route', ONLY = process.argv[4] || '', OUT = '/tmp/claude-0/probe/fabline'; fs.mkdirSync(OUT, { recursive: true });
const PATH = /mark/.test(TOOL) ? '/mark/' : '/fastnet/';
const SCREENS = [['phone', 393, 852, true], ['small-phone', 360, 740, true], ['phone-sideways', 852, 393, true], ['pad', 820, 1180, true], ['pad-sideways', 1180, 820, true], ['mac', 1440, 900, false]].filter(s => !ONLY || ONLY.split(',').includes(s[0]));
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch();
  for (const [name, w, h, touch] of SCREENS) {
    const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: touch ? 2 : 1, hasTouch: touch, isMobile: touch && w < 900, serviceWorkers: 'block', timezoneId: 'Europe/London' });
    await c.route(/open-meteo|googleapis|gstatic|openseamap/, r => r.fulfill({ status: 200, body: '' }));
    await c.addInitScript(() => { if (!localStorage.getItem('fs-terms')) { const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); } });
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    const T = TOOL + ' ' + name + ' ' + w + 'x' + h;
    try {
      await p.goto(BASE + PATH); await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(2500);
      await p.evaluate(() => { const n = document.getElementById('spTourNo'); if (n && n.getClientRects().length) n.click(); }); await p.waitForTimeout(800);
      for (let i = 0; i < 60; i++) { const s = await p.evaluate(() => { const f = window.__navFc(); return { fins: document.querySelectorAll('#finBox .fin').length, run: !!f.running }; }); if (!s.run) break; await p.waitForTimeout(2000); }
      const read = () => p.evaluate(() => { const v = [...document.querySelectorAll('.fabhelp')].filter(f => f.getClientRects().length && getComputedStyle(f).visibility !== 'hidden' && !f.style.translate); if (!v.length) return null;
        const host = v[0].offsetParent, hr = host.getBoundingClientRect(); let ut = 0; ['.top', '#mkTop', '#fsBadge', '#editBar', '#navStrip', '#fsPlot', '#navPlot', '#solSeq', '#fsDemo', '#astroLine', '#errBox'].forEach(q => { const e = document.querySelector(q); if (e && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden') ut = Math.max(ut, e.getBoundingClientRect().bottom); });
        const R = v.map(f => { const r = f.getBoundingClientRect(); return { id: f.id, l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), fr: f.dataset.fr || '' }; });
        const on = []; for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const a = R[i], q = R[j]; if (Math.min(a.r, q.r) - Math.max(a.l, q.l) > 0 && Math.min(a.b, q.b) - Math.max(a.t, q.t) > 0) on.push(a.id + ' on ' + q.id); }
        return { n: R.length, lefts: [...new Set(R.map(x => x.l))], tops: [...new Set(R.map(x => x.t))], on, off: R.filter(x => x.l < 0 || x.r > innerWidth || x.t < 0 || x.b > innerHeight).map(x => x.id), high: R.filter(x => x.t < ut - 1 && x.t >= hr.top).map(x => x.id + ' top ' + x.t + ' above ' + Math.round(ut)), rightGap: Math.round(hr.right - Math.max(...R.map(x => x.r))), footGap: Math.round(hr.bottom - Math.max(...R.map(x => x.b))), clear: document.body.classList.contains('navclear'), ids: R.map(x => x.id).join(',') }; });
      const check = async (state) => { await p.waitForTimeout(3600); const f = await read(); const S = T + ' | ' + state;
        if (!f) { console.log('NOTE ' + S + ' | no round button showing'); return; }
        const col = f.lefts.length === 1, row = f.tops.length === 1;
        ok(col || row, S + ' | one line', (col && f.n > 1 ? 'column of ' : row ? 'row of ' : 'NOT IN LINE ') + f.n + (col || row ? '' : ' lefts ' + f.lefts.join(',') + ' tops ' + f.tops.join(',')) + ' (' + f.ids + ')');
        if (col && f.n > 1) ok(f.rightGap >= 8 && f.rightGap <= 40, S + ' | the column is on the right-hand edge', f.rightGap + ' px from it');
        else if (row) ok(f.footGap >= 0 && f.footGap <= 70, S + ' | the row is on the bottom of the map', f.footGap + ' px above it');
        ok(!f.on.length, S + ' | none on another', f.on.join('; ')); ok(!f.off.length, S + ' | none off the screen', f.off.join(',')); ok(!f.high.length, S + ' | none above the things under the top bar', f.high.join('; '));
        await p.screenshot({ path: OUT + '/' + TOOL + '-' + name + '-' + state.replace(/\s+/g, '-') + '.png' }); };
      await check('panel as it comes');
      await p.evaluate(() => { const x = document.getElementById('panelX'); if (x && x.getClientRects().length) x.click(); else { const pn = document.getElementById('panel'); if (pn) pn.classList.add('collapsed'); } window.dispatchEvent(new Event('resize')); });
      await check('panel closed');
      const cl = await p.evaluate(() => { const x = document.getElementById('navClearBtn'); if (x && x.getClientRects().length) { x.click(); return true; } return false; });
      if (cl) { await check('buttons cleared'); await p.evaluate(() => { const m = document.getElementById('navMenuBtn'); if (m && m.getClientRects().length) m.click(); }); await check('buttons back'); }
      else console.log('NOTE ' + T + ' | no CLEAR button showing, Clear state not tried');
      ok(!errs.length, T + ' | no script errors', errs.join(' ; ').slice(0, 200));
    } catch (e) { fail++; console.log('FAIL ' + T + ' | STOPPED ' + e.message.slice(0, 200)); }
    await c.close(); }
  console.log('round-buttons-line ' + TOOL + ': ' + pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
