/* CLEAR button row (Stuart 25 Nov 2026, BRIEF-CLEAR-BUTTON-ROW): run node tests/clear-row.js http://localhost:8779 /fastnet/ route */
/* CLEAR button row test (Stuart 25 Nov brief): node clear-test.js base path tag */
const { chromium } = require('playwright');
const [BASE, PATH, TAG] = process.argv.slice(2);
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + TAG + ' ' + m + (d !== undefined ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch();
  for (const [dev, w, h] of [['phone upright', 390, 664], ['phone on its side', 844, 390]]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
    await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
    await c.addInitScript(() => { const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); });
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(BASE + PATH, { waitUntil: 'domcontentloaded', timeout: 120000 }); await p.waitForTimeout(14000);
    await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x && x.offsetParent) x.click(); const s = document.getElementById('sheet'); if (s && !s.hidden) { const sx = document.getElementById('sheetX'); if (sx) sx.click(); } const pn = document.getElementById('panel'); if (pn) pn.classList.add('collapsed'); if (document.activeElement) document.activeElement.blur(); });
    const vis = id => p.evaluate(id => { const e = document.getElementById(id) || document.querySelector(id); if (!e) return false; const r = e.getBoundingClientRect(); return !e.hidden && r.width > 0 && r.height > 0 && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden'; }, id);
    ok(!(await p.evaluate(() => document.body.classList.contains('navclear'))), dev + ': opens with the buttons showing');
    await p.evaluate(() => { const b = document.getElementById('navClearBtn'); b && b.click(); }); await p.waitForTimeout(800);
    ok(await p.evaluate(() => document.body.classList.contains('navclear')), dev + ': CLEAR clears');
    const play = await vis('#play'), gps = await vis('#gpsBtn') || await vis('#liveBtn'), slider = await vis('#time'), now = await vis('#now'), mob = await vis('#mobBtn'), menu = await vis('#navMenuBtn'), top = await vis('.top');
    ok(!play, dev + ': play button gone'); ok(slider, dev + ': slider stays'); ok(await p.evaluate(() => { const e = document.getElementById("now"); return !!e && getComputedStyle(e).display !== "none"; }), dev + ": LIVE line not hidden", "visible: " + now); ok(mob, dev + ': MOB stays'); ok(menu, dev + ': MENU shows'); ok(top, dev + ': top band stays');
    await p.screenshot({ path: `/tmp/claude-0/mock/clear-${TAG}-${w}.png` });
    await p.click('#navMenuBtn'); await p.waitForTimeout(600);
    ok(!(await p.evaluate(() => document.body.classList.contains('navclear'))) && await vis('#play'), dev + ': MENU brings the buttons back');
    /* auto-clear after the set time (30 s for the test) */
    await p.evaluate(() => window.FSClear.auto(30)); await p.waitForTimeout(32000);
    ok(await p.evaluate(() => document.body.classList.contains('navclear')), dev + ': clears by itself after 30 s untouched');
    /* swipe up on the bar restores, swipe down clears */
    const bb = await p.evaluate(() => { const r = document.getElementById('bar').getBoundingClientRect(); return [r.left + r.width / 2, r.top + 10]; });
    const swipe = (y1, y2) => p.evaluate(([x, y1, y2]) => { const bar = document.getElementById('bar'), mk = (t, y) => new Touch({ identifier: 1, target: bar, clientX: x, clientY: y }); bar.dispatchEvent(new TouchEvent('touchstart', { touches: [mk(0, y1)], changedTouches: [mk(0, y1)], bubbles: true })); bar.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [mk(0, y2)], bubbles: true })); }, [bb[0], y1, y2]);
    await swipe(bb[1] + 30, bb[1] - 40); await p.waitForTimeout(400);
    ok(!(await p.evaluate(() => document.body.classList.contains('navclear'))), dev + ': swipe up brings the buttons back');
    await p.evaluate(() => window.FSClear.auto(60));
    const bb2 = await p.evaluate(() => { const r = document.getElementById('bar').getBoundingClientRect(); return [r.left + r.width / 2, r.top + 10]; });
    await p.evaluate(([x, y]) => { const bar = document.getElementById('bar'), mk = y => new Touch({ identifier: 2, target: bar, clientX: x, clientY: y }); bar.dispatchEvent(new TouchEvent('touchstart', { touches: [mk(y)], changedTouches: [mk(y)], bubbles: true })); bar.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [mk(y + 60)], bubbles: true })); }, bb2); await p.waitForTimeout(400);
    ok(await p.evaluate(() => document.body.classList.contains('navclear')), dev + ': swipe down clears');
    /* an alarm brings them back: show the MOB window */
    await p.evaluate(() => { const m = document.getElementById('mob'); if (m) m.hidden = false; }); await p.waitForTimeout(1600);
    ok(!(await p.evaluate(() => document.body.classList.contains('navclear'))), dev + ': an alarm (man overboard window) brings the buttons back');
    await p.evaluate(() => { const m = document.getElementById('mob'); if (m) m.hidden = true; });
    /* never by itself while Settings is open */
    await p.evaluate(() => window.FSClear.auto(30)); await p.evaluate(() => { const s = document.getElementById('setBtn') || document.querySelector('[aria-label="Settings"]'); s && s.click(); }); await p.waitForTimeout(32000);
    const sheetOpen = await vis('#sheet');
    ok(!sheetOpen || !(await p.evaluate(() => document.body.classList.contains('navclear'))), dev + ': not cleared by itself while Settings is open', 'settings open: ' + sheetOpen);
    ok(!errs.length, dev + ': no script errors', errs.join(' ; ').slice(0, 200));
    await c.close(); }
  console.log(TAG + ': ' + pass + ' passed, ' + fail + ' failed'); await b.close(); })();
