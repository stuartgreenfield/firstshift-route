/* ZM1 and ZM2 (Stuart 28 Nov 17:51 "a way of zooming in on a window would be very useful use in difficult light conditions"; 19:03 "ZM1 + ZM2",
   chart box windows). A route card: the magnifier button makes it 1.5 times bigger and is remembered; Extra large in Map view makes it 1.8
   times; both together 2.7 times; at every size the card stays wholly on the chart. Phone upright, real taps.
   Run (through tools/probe/with78.sh): node tests/chart-box-zoom.js [base] [path] [dir for pictures] */
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8778', PATH = process.argv[3] || '/fastnet/', SHOTS = process.argv[4] || '';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); return c; };
(async () => { const b = await chromium.launch(); const errs = [];
  for (const W of (process.env.WIDTHS || '393,320,430').split(',').map(Number)) {
    const c = await b.newContext({ viewport: { width: W, height: 852 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block', timezoneId: 'Europe/London' });
    await c.route(/open-meteo|googleapis|gstatic|openseamap/, r => r.fulfill({ status: 200, body: '' }));
    await c.addInitScript(() => { const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); localStorage.setItem('fs-rdetail', 'quick'); localStorage.setItem('fs-clear-v2', JSON.stringify({ auto: 0, told: true })); });
    const p = await c.newPage(); p.on('pageerror', e => errs.push(W + ' ' + e.message));
    await p.goto(BASE + PATH); await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(2500);
    await p.evaluate(() => { const n = document.getElementById('spTourNo'); if (n && n.getClientRects().length) n.click(); }); await p.waitForTimeout(800);
    await p.waitForFunction(() => { const F = window.__navFc && window.__navFc(); const n = (document.getElementById('runNote') || {}).textContent || ''; return F && F.sel && F.sel.path && !F.running && !/Refining|Finer routes coming/.test(n); }, null, { timeout: 600000 }); await p.waitForTimeout(1500);
    await p.evaluate(() => { document.querySelectorAll('.sheet, .pop').forEach(e => { e.hidden = true; }); const x = document.getElementById('panelX'); if (x && x.getClientRects().length) x.click(); document.querySelectorAll('.cbanner .x').forEach(e => e.click()); }); await p.waitForTimeout(2500);
    const T = W + ' px: ';
    /* a point of the chosen route in the lower half of the chart, clear of the marks and of the other routes */
    const pick = other => p.evaluate(other => { const F = window.__navFc(), A = window.__fsRoutePaths(), m = document.getElementById('map').getBoundingClientRect(), nm = s => s === 'Combined' || !s ? 'Combined' : s;
      const selName = F.sel.name, marks = A.marks.map(k => window.__fsXY(k.lat, k.lon)); let best = null;
      A.routes.forEach((R, ri) => { const mine = R.name === selName; if (other ? mine : !mine) return; if (!other && best) return;
        R.path.forEach((q, k) => { if (k < 3 || k > R.path.length - 4) return; const a = window.__fsXY(q.la, q.lo); if (a[1] < m.top + (other ? 262 : 300) || a[1] > m.bottom - (other ? 110 : 150) || a[0] < (other ? 24 : 40) || a[0] > innerWidth - (other ? 24 : 40)) return;
          if (marks.some(k2 => a[0] > k2[0] - 30 && a[0] < k2[0] + 100 && a[1] > k2[1] - 40 && a[1] < k2[1] + 45)) return;   /* clear of the marks and of their PORT and STBD tags, which open course editing */ let clear = 1e9;
          A.routes.forEach((R2, rj) => { if (rj === ri) return; R2.path.forEach(q2 => { const a2 = window.__fsXY(q2.la, q2.lo); clear = Math.min(clear, Math.hypot(a2[0] - a[0], a2[1] - a[1])); }); });
          if (other ? (!best || clear > best.clear) : (!best || Math.abs(k - R.path.length / 2) < Math.abs(best.k - R.path.length / 2))) best = { ri, k, x: a[0], y: a[1], clear, name: R.name, la: q.la, lo: q.lo }; }); });
      return best; }, other);
    const card = () => p.evaluate(() => { const t = document.getElementById('tip'); if (!t || t.hidden) return { open: false }; const r = t.getBoundingClientRect(), g = (s, k) => { const e = t.querySelector(s); return e ? getComputedStyle(e)[k] : null; }, m = document.getElementById('map').getBoundingClientRect();
      const tiles = [...t.querySelectorAll('.cbt > div')].map(d => ({ k: d.querySelector('i').textContent, v: d.querySelector('b').textContent, u: d.querySelector('u').textContent.trim(), cut: d.querySelector('b').scrollWidth > d.querySelector('b').clientWidth + 1 }));
      const btn = [...t.querySelectorAll('.tipstep .btn, .cbch .btn')].filter(e => e.getClientRects().length).map(e => Math.round(e.getBoundingClientRect().height));
      const all = document.getElementById('tipAll'), F = window.__navFc();
      return { open: true, name: (t.querySelector('.cbh b') || {}).textContent, sub: (t.querySelector('.cbs') || {}).textContent, dot: g('.cbd', 'backgroundColor'), tiles, box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], inView: r.left >= 0 && r.right <= innerWidth + 0.5 && r.top >= 0 && r.bottom <= innerHeight + 0.5,
        fi: g('.cbt i', 'fontSize'), fb: g('.cbt b', 'fontSize'), fu: g('.cbt u', 'fontSize'), fs: g('.cbs', 'fontSize'), fh: g('.cbh b', 'fontSize'), btn, choose: !!(document.getElementById('tipChoose') && document.getElementById('tipChoose').getClientRects().length), allOpen: !!all && !all.hidden, allRows: all ? all.querySelectorAll('.r').length : 0, allBtn: (document.getElementById('tipAllBtn') || {}).textContent,
        sel: F.sel.name, clock: (document.querySelector('#clock .ckt') || {}).textContent || '', share: Math.round(100 * Math.max(0, Math.min(r.bottom, m.bottom) - Math.max(r.top, m.top)) / m.height), wide: document.documentElement.scrollWidth > innerWidth + 1 }; });
    const close = () => p.evaluate(() => { const x = document.getElementById('tipX'); if (x) x.click(); });
    const hm = s => (/(\d\d):(\d\d)/.exec(s || '') || []).slice(1).map(Number), mins = a => a[0] * 60 + a[1];

    const a = await pick(false); if (!ok(!!a, T + 'a clear point of the chosen route found on the chart', a)) { await c.close(); continue; }
    await p.touchscreen.tap(a.x, a.y); await p.waitForTimeout(1500); let k = await card();
    ok(k.open && !!k.name, T + 'a tap on the route opens its card', k.name);
    const geo = () => p.evaluate(() => { const t = document.getElementById('tip'), r = t.getBoundingClientRect(), m = document.getElementById('map').getBoundingClientRect(), zb = document.getElementById('cbZoomBtn'), zr = zb && !zb.hidden ? zb.getBoundingClientRect() : null, b = t.querySelector('.cbt b');
      const hit = zr ? document.elementFromPoint(zr.left + zr.width / 2, zr.top + zr.height / 2) : null;
      return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), w: Math.round(r.width), mw: Math.round(m.width), ml: Math.round(m.left), mr: Math.round(m.right), mt: Math.round(m.top), mb: Math.round(m.bottom), zoom: t.style.zoom || '1', zbtn: !!zr, zhit: !!(hit && zb.contains(hit)), fig: b ? Math.round(b.getBoundingClientRect().height) : 0, pressed: zb && zb.getAttribute('aria-pressed') }; });
    const g0 = await geo(); ok(g0.zbtn && g0.zhit && g0.zoom === '1', T + 'the card has a magnifier button that can be tapped; normal size to start', g0);
    if (SHOTS) await p.screenshot({ path: SHOTS + '/zoom-0-' + W + '.png' });
    await p.evaluate(() => document.getElementById('cbZoomBtn').click()); await p.waitForTimeout(900);
    const g1 = await geo(); ok(g1.zoom === '1.5' && g1.pressed === 'true', T + 'one tap: the card is 1.5 times bigger', g1);
    ok(g1.l >= g1.ml - 1 && g1.r <= g1.mr + 1 && g1.t >= g1.mt - 1 && g1.b <= g1.mb + 1, T + 'the bigger card stays wholly on the chart', g1);
    ok(g1.fig > g0.fig, T + 'the figures are bigger', [g0.fig, g1.fig]);
    if (SHOTS) await p.screenshot({ path: SHOTS + '/zoom-1-' + W + '.png' });
    await close(); await p.waitForTimeout(600); await p.touchscreen.tap(a.x, a.y); await p.waitForTimeout(1500);
    const g2 = await geo(); ok(g2.zoom === '1.5' && g2.w > 0, T + 'the next card opens big too (remembered)', [g2.zoom, g2.w]);
    await p.evaluate(() => { localStorage.setItem('fs-cbtext', 'xl'); document.getElementById('cbZoomBtn').click(); }); await p.waitForTimeout(900);
    const g3 = await geo(); ok(g3.zoom === '1.8' && g3.w > 0 && g3.l >= g3.ml - 1 && g3.r <= g3.mr + 1 && g3.b <= g3.mb + 1, T + 'Extra large in Settings with the magnifier off: 1.8 times, on the chart', g3);
    if (SHOTS) await p.screenshot({ path: SHOTS + '/zoom-xl-' + W + '.png' });
    await p.evaluate(() => document.getElementById('cbZoomBtn').click()); await p.waitForTimeout(900);
    const g4 = await geo(); ok(g4.zoom === '2.7' && g4.w > 0 && g4.l >= g4.ml - 1 && g4.r <= g4.mr + 1 && g4.b <= g4.mb + 1, T + 'Extra large and the magnifier: 2.7 times, still on the chart', g4);
    if (SHOTS) await p.screenshot({ path: SHOTS + '/zoom-xl15-' + W + '.png' });
    await p.evaluate(() => { localStorage.setItem('fs-cbtext', ''); localStorage.setItem('fs-cbzoom', ''); }); await close(); await p.waitForTimeout(600); await p.touchscreen.tap(a.x, a.y); await p.waitForTimeout(1500);
    const g5 = await geo();  ok((g5.zoom === '1' && Math.abs(g5.w - g0.w) <= 2) || ((g5.w === 0 && await p.evaluate(() => document.getElementById('tip').hidden && localStorage.getItem('fs-cbzoom') === '' && localStorage.getItem('fs-cbtext') === ''))), T + 'back to default: normal size again', [g0.w, g5.w]);   /* at 320 px the second tap can land on a course mark (Bishop Rock) and open the mark's editor in place of the card: then the check is that no card is open and both sizes are back to default */
    await c.close(); }
  ok(!errs.length, 'no script errors', errs.slice(0, 4));
  console.log('chart-box-zoom: ' + pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
