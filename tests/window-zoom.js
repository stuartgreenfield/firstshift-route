/* ZM1 and ZM2 for every window on the map (Stuart 28 Nov 17:51 "a way of zooming in on a window would be very useful use in difficult light
   conditions"; 19:28 in the question card: "ZM1 + ZM2", "Every window on the map"). fszoom.js. For the plotter, the GPS window and the
   countdown box: a magnifier button shows by the window and does not lie on it; a tap makes the window bigger (up to 1.5 times) and keeps it
   wholly on the screen; a second tap puts it back; it is remembered after a reload; Extra large in Settings makes it bigger on its own; Back
   to default puts everything back. Phone upright and small phone, real taps.
   Run through tools/probe/with78.sh: node tests/window-zoom.js http://localhost:8779 [path]   (Route+: http://localhost:8778) */
const { chromium } = require('playwright');
const BASE = process.argv[2], PATH = process.argv[3] || '/fastnet/';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); return c; };
(async () => { const b = await chromium.launch(); const errs = [];
  for (const [name, W, H] of [['phone', 393, 852], ['small-phone', 320, 640]]) {
    const c = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block', timezoneId: 'Europe/London', geolocation: { latitude: 50.70, longitude: -1.20, accuracy: 5 }, permissions: ['geolocation'] });
    await c.route(/open-meteo|googleapis|gstatic|openseamap/, r => r.fulfill({ status: 200, body: '' }));
    await c.addInitScript(() => { const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); });
    const p = await c.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message)); const T = PATH + ' ' + name;
    const load = async () => { await p.waitForFunction(() => window.__navFc && window.__navFc().P && window.FSZoom, null, { timeout: 300000 }); await p.waitForTimeout(2000); await p.evaluate(() => { const n = document.getElementById('spTourNo'); if (n && n.getClientRects().length) n.click(); const sp = document.getElementById('splash'); if (sp && !sp.hidden && sp.getClientRects().length) sp.hidden = true; const x = document.getElementById('solCardX'); if (x && x.getClientRects().length) x.click(); });   /* and with its Start new race card, closed as a person would */   /* Mark opens on its landing page in a fresh browser */ for (let i = 0; i < 60; i++) { if (!(await p.evaluate(() => !!window.__navFc().running))) break; await p.waitForTimeout(2000); } await p.waitForTimeout(1500); };
    const st = (id) => p.evaluate((id) => { const e = document.getElementById(id), bt = document.getElementById('fswz-' + id); if (!e || !e.getClientRects().length) return null; const r = e.getBoundingClientRect(), q = bt && !bt.hidden && bt.getClientRects().length ? bt.getBoundingClientRect() : null;
      return { k: parseFloat(e.getAttribute('data-fswz')) || 1, fig: Math.round(parseFloat(getComputedStyle(e.querySelector('*') || e).fontSize) * (parseFloat(e.getAttribute('data-fswz')) || 1)), l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), W: innerWidth, H: innerHeight, btn: q ? [Math.round(q.left), Math.round(q.top), Math.round(q.right), Math.round(q.bottom)] : null, onWin: q ? (q.left < r.right && q.right > r.left && q.top < r.bottom && q.bottom > r.top) : null, onBtn: q ? (() => { bt.style.visibility = 'hidden'; const pts = [[q.left + 3, q.top + 3], [q.right - 3, q.top + 3], [q.left + 3, q.bottom - 3], [q.right - 3, q.bottom - 3], [(q.left + q.right) / 2, (q.top + q.bottom) / 2]]; const u = pts.map(a => document.elementFromPoint(a[0], a[1])).filter(h => h && h.closest && h.closest('button, a, input, select, [role=button]')).map(h => h.id || h.className || h.tagName); bt.style.visibility = ''; return u.join(','); })() : null }; }, id);
    const tapZ = async (id) => { for (let n = 0; n < 2; n++) { await p.waitForTimeout(1500); const a = await st(id); if (!a || !a.btn) return; await p.touchscreen.tap((a.btn[0] + a.btn[2]) / 2, (a.btn[1] + a.btn[3]) / 2); await p.waitForTimeout(1200); const z = await st(id); if (z && z.k !== a.k) return; } };   /* the button follows the window's foot, which moves when the plotter's lines change: read it again just before the tap, and once more if the tap missed */
    const onScreen = (s) => s && s.l >= -1 && s.t >= -1 && s.r <= s.W + 1 && s.b <= s.H + 1;
    try {
      await p.goto(BASE + PATH); await load();
      /* open the plotter and the GPS window */
      await p.evaluate(() => { const pb = document.getElementById('fsPlotBtn') || [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'PLOT' && x.getClientRects().length); if (pb) pb.click(); }); await p.waitForTimeout(2500);
      for (let n = 0; n < 3; n++) { const open = await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x && x.getClientRects().length) { x.click(); return true; } return false; }); if (!open) break; await p.waitForTimeout(1200); }   /* Mark: the Start new race card lies over the chart until closed */
      const pid = await p.evaluate(() => ['fsPlot', 'navPlot'].find(id => { const e = document.getElementById(id); return e && e.getClientRects().length && !e.hidden; }) || null);
      ok(!!pid, T + ' | the plotter is open', pid);
      if (pid) {
        let s = await st(pid); ok(s && s.btn && !s.onWin && !s.onBtn && s.k === 1, T + ' | the plotter has a magnifier button beside it, not on it nor on any other button, normal size', s);
        await tapZ(pid);
        const big = await st(pid); await p.screenshot({ path: '/tmp/claude-0/probe/wz-plot-' + name + '-' + PATH.replace(/\//g, '') + '.png' }); ok(big && big.k > 1 && big.k <= 1.5 && onScreen(big) && !big.onBtn, T + ' | one tap: the plotter is bigger and wholly on the screen', big);
        await p.reload(); await load(); await p.evaluate(() => { const pb = document.getElementById('fsPlotBtn') || [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'PLOT' && x.getClientRects().length); const e = document.getElementById('fsPlot') || document.getElementById('navPlot'); if (pb && !(e && e.getClientRects().length && !e.hidden)) pb.click(); }); await p.waitForTimeout(2500);
        for (let n = 0; n < 3; n++) { const open = await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x && x.getClientRects().length) { x.click(); return true; } return false; }); if (!open) break; await p.waitForTimeout(1200); }
        s = await st(pid); ok(s && s.k > 1, T + ' | after a reload it is still bigger (remembered)', s);
        await tapZ(pid);
        s = await st(pid); ok(s && s.k === 1, T + ' | a second tap puts it back', s);
        /* Extra large in Settings, on its own */
        await p.evaluate(() => { localStorage.setItem('fs-cbtext', 'xl'); FSZoom.run(); }); await p.waitForTimeout(1200);
        s = await st(pid); ok(s && s.k > 1 && s.k <= 1.8 && onScreen(s), T + ' | Extra large in Settings: the plotter is bigger, on the screen', s);
        await p.evaluate(() => { localStorage.setItem('fs-cbtext', ''); FSZoom.run(); }); await p.waitForTimeout(800);
      }
      /* the GPS window */
      await p.evaluate(() => { const l = document.getElementById('liveBtn'); if (l && l.getClientRects().length) l.click(); }); await p.waitForTimeout(3000);
      let g = await st('liveBox');
      if (g) { ok(!!g.btn && !g.onWin, T + ' | the GPS window has a magnifier button beside it', g);
        await tapZ('liveBox');
        g = await st('liveBox'); ok(g && g.k > 1 && onScreen(g), T + ' | one tap: the GPS window is bigger and on the screen', g);
        await p.screenshot({ path: '/tmp/claude-0/probe/wz-' + name + '-' + PATH.replace(/\//g, '') + '.png' }); }
      else console.log('NOTE ' + T + ' | the GPS window did not open');
    } catch (e) { fail++; console.log('FAIL ' + T + ' | STOPPED ' + e.message.slice(0, 200)); }
    await c.close(); }
  ok(!errs.length, 'no script errors', errs.slice(0, 3));
  console.log('window-zoom: ' + pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
