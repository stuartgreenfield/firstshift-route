/* The routing log (Stuart 28 Nov 20:12: "We need a time log for all previous routings and re-routings so a user can look back and re-launch
   previous routes if they don't like the newest one. These would need to be labelled with a time stamp when they are loaded from the log list
   and easily over written if they then opted for a new routing"). Design: Records/ROUTING-LOG-DESIGN-2026-11-28.md.
   Two routings of the same race with a different start; the log lists both, newest first, with time stamps; Show on the older one puts its
   routes back (its start and its fastest finish), labelled FROM THE LOG with its time, on the panel and on the chart; Route afresh replaces
   it, the label goes, and the log holds three; a reload keeps the log. Phone upright, real taps.
   Run through tools/probe/with78.sh: node tests/routing-log.js http://localhost:8779 [path]   (Route+: http://localhost:8778) */
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8779', PATH = process.argv[3] || '/fastnet/';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); return c; };
(async () => { const b = await chromium.launch(); const errs = [];
  const c = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block', timezoneId: 'Europe/London' });
  await c.route(/open-meteo|googleapis|gstatic|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); localStorage.setItem('fs-rdetail', 'quick'); });
  const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
  const settled = async () => { await p.waitForFunction(() => { const F = window.__navFc && window.__navFc(); const n = (document.getElementById('runNote') || {}).textContent || ''; return F && F.sel && !F.running && !/Refining|Finer routes coming/.test(n); }, null, { timeout: 600000 }); await p.waitForTimeout(2500); };
  const log = () => p.evaluate(() => FSRLog.all().then(a => a.map(o => ({ id: o.id, at: o.at, how: o.how, start: o.startVal, fast: o.fast, n: o.n }))));
  const tapEl = async (sel) => { const r = await p.evaluate(s => { const e = document.querySelector(s); if (!e || !e.getClientRects().length) return null; e.scrollIntoView({ block: 'center' }); const q = e.getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2]; }, sel); if (!r) return false; await p.touchscreen.tap(r[0], r[1]); return true; };
  try {
    await p.goto(BASE + PATH); await p.waitForFunction(() => window.__navFc && window.__navFc().P && window.FSRLog, null, { timeout: 300000 });
    await p.evaluate(() => { const n = document.getElementById('spTourNo'); if (n && n.getClientRects().length) n.click(); });
    await settled(); await p.waitForTimeout(1500);
    let L = await log(); ok(L.length >= 1, 'the first routing is in the log', L.length);
    const first = L[0];
    /* a second routing with another start */
    const st2 = await p.evaluate(() => { const s = document.getElementById('startSel'); if (s.selectedIndex + 1 < s.options.length) s.selectedIndex += 1; else s.selectedIndex -= 1; s.dispatchEvent(new Event('change', { bubbles: true })); return s.value; });
    await p.waitForTimeout(1500); await p.evaluate(() => { const F = window.__navFc(); if (!F.running) document.getElementById('run').click(); }); await p.waitForTimeout(3000); await settled(); await p.waitForTimeout(1500);
    L = await log(); ok(L.length >= 2 && L[0].start === st2 && L[0].at > first.at, 'the second routing is in the log, newest first, with its own start', L.map(x => [x.start, x.at]));
    /* the log list */
    await p.evaluate(() => { const t = document.querySelector('.tabs .tab[data-tab="decision"]'), pn = document.getElementById('panel'); if (t && !(t.getAttribute('aria-selected') === 'true' && !pn.classList.contains('collapsed'))) t.click(); }); await p.waitForTimeout(800);   /* the Routes tab open (a tap on it when it is already open folds the panel) */
    ok(await tapEl('#rlBtn'), 'the Routing log button is there beside Route again', await p.evaluate(() => (document.getElementById('rlBtn') || {}).textContent));
    await p.waitForTimeout(1500);
    const rows = await p.evaluate(() => [...document.querySelectorAll('#rlBody .rlr')].map(r => ({ stamp: r.querySelector('.rlt b').textContent, cur: r.classList.contains('cur'), show: !!r.querySelector('[data-rl]'), id: (r.querySelector('[data-rl]') || {}).getAttribute ? r.querySelector('[data-rl]').getAttribute('data-rl') : null })));
    ok(rows.length >= 2 && rows[0].cur && !rows[0].show && rows[1].show && /\d\d:\d\d/.test(rows[0].stamp), 'the list: newest first, marked On the chart, each with a time stamp; the older has Show', rows);
    await p.screenshot({ path: '/tmp/claude-0/probe/rlog-list.png' });
    /* Show the older routing */
    const older = L[1];
    await tapEl('#rlBody [data-rl="' + older.id + '"]'); await p.waitForTimeout(4000);
    const shown = await p.evaluate(() => { const F = window.__navFc(), t = document.getElementById('rlTag'), pill = document.getElementById('rlPill'); return { st: FSRLog.state(), start: document.getElementById('startSel').value, tag: t && !t.hidden ? t.textContent : null, pill: pill && pill.getClientRects().length ? pill.textContent : null, pillOver: (() => { if (!pill || !pill.getClientRects().length) return null; const q = pill.getBoundingClientRect(); return [...document.querySelectorAll('.cbanner, button, .tip, #panel, .top')].filter(e => e !== pill && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').filter(e => { const r = e.getBoundingClientRect(); return r.left < q.right && r.right > q.left && r.top < q.bottom && r.bottom > q.top; }).map(e => e.id || e.className).join(','); })(), note: document.getElementById('runNote').textContent, n: F.routes ? F.routes.length : null }; });
    ok(shown.st.shown && shown.st.shown.id === older.id, 'Show brings that routing back', shown.st);
    ok(shown.start === older.start, 'its start is back as it was', [shown.start, older.start]);
    ok(!!shown.tag && /FROM THE LOG/.test(shown.tag) && /\d\d:\d\d/.test(shown.tag), 'it is labelled FROM THE LOG with its time on the panel', shown.tag);
    if (!shown.pill) {   /* a crowded phone (Route+ with the boat strip, the plotter and the course note): with the panel open there may be no clear strip of chart for the label, and it is then on the panel only; with the panel folded it must show on the chart */
      await p.evaluate(() => { const pn = document.getElementById('panel'); const t = document.querySelector('.tabs .tab[aria-selected="true"]'); if (t && !pn.classList.contains('collapsed')) t.click(); }); await p.waitForTimeout(2500);
      Object.assign(shown, await p.evaluate(() => { const pill = document.getElementById('rlPill'); if (!pill || !pill.getClientRects().length) return { pill: null }; const q = pill.getBoundingClientRect(); return { pill: pill.textContent, pillOver: [...document.querySelectorAll('.cbanner, button, .tip, #panel, .top')].filter(e => e !== pill && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').filter(e => { const r = e.getBoundingClientRect(); return r.left < q.right && r.right > q.left && r.top < q.bottom && r.bottom > q.top; }).map(e => e.id || e.className).join(',') }; })); }
    ok(!!shown.pill && /FROM THE LOG/.test(shown.pill) && !shown.pillOver, 'and on the chart, on nothing else', [shown.pill, shown.pillOver]);
    ok(/From the routing log: routed/.test(shown.note), 'the note under the routes says so', shown.note.slice(0, 120));
    L = await log(); ok(L.length === 2 || L[0].id !== older.id, 'showing it does not log it again', L.length);
    await p.screenshot({ path: '/tmp/claude-0/probe/rlog-shown.png' });
    /* Route afresh replaces it */
    await p.evaluate(() => { const t = document.querySelector('.tabs .tab[data-tab="decision"]'), pn = document.getElementById('panel'); if (t && !(t.getAttribute('aria-selected') === 'true' && !pn.classList.contains('collapsed'))) t.click(); }); await p.waitForTimeout(1200);
    const nBefore = L.length; await tapEl('#rlFresh'); await p.waitForTimeout(3000); await settled(); await p.waitForTimeout(1500);
    const after = await p.evaluate(() => { const t = document.getElementById('rlTag'), pill = document.getElementById('rlPill'); return { st: FSRLog.state(), tag: !!(t && !t.hidden), pill: !!(pill && pill.getClientRects().length) }; });
    L = await log(); ok(!after.st.shown && !after.tag && !after.pill && L.length === nBefore + 1, 'Route afresh replaces it: the label goes and the new routing tops the log', { after, n: L.length });
    /* a reload keeps the log */
    await p.reload(); await p.waitForFunction(() => window.FSRLog && document.getElementById('rlBtn'), null, { timeout: 300000 }); await p.waitForTimeout(4000);
    const txt = await p.evaluate(() => document.getElementById('rlBtn').textContent);
    ok(/\(\d+\)/.test(txt) && +txt.match(/\((\d+)\)/)[1] >= 3, 'after a reload the log is still there', txt);
  } catch (e) { fail++; console.log('FAIL STOPPED ' + e.message.slice(0, 300)); }
  ok(!errs.length, 'no script errors', errs.slice(0, 3));
  console.log('routing-log: ' + pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
