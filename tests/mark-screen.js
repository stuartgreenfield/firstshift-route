/* FirstShift Mark screen test (Stuart 16 Nov 22:25 and 22:29; MARK-DESIGN-BRIEF rule 5): every panel and state of Mark's own screen at
   every size, with the phone's own bars, fails on anything off the screen, any window or button covering another, or anything under
   the notch, home bar or gesture bar. Built from tests/screen-rules.js.
   Screen rules (Stuart 16 Nov 2026, UI review step 1): at five screen sizes and in the everyday states, no window or button
   may cover another window or button, and none may sit off the screen. Reports the chart's share of the screen and the
   buttons smaller than 44 points. Run: node tests/screen-rules.js http://localhost:8779 [Route|Navigate] */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
/* The phone's own bars (Stuart 16 Nov 22:29: "ensure on the new releases the devices driven menus don't over lay your menus"):
   the notch and rounded corners, the home bar and the Android gesture bar take the safe-area insets below. Chromium has no notch, so
   the test serves the pages with env(safe-area-inset-*) set to the phone's values and fails on any button or box in those strips. */
const INS = { 'Phone upright': [47, 0, 34, 0], 'Phone sideways': [0, 47, 21, 47], 'Small phone': [20, 0, 0, 0], 'Android phone': [24, 0, 24, 0] };   /* top, right, bottom, left (iPhone 13; iPhone SE; Android gesture bar) */
const sizes = [['Phone upright', { ...devices['iPhone 13'] }], ['Phone sideways', { ...devices['iPhone 13 landscape'] }], ['Small phone', { ...devices['iPhone SE'] }], ['Android phone', { ...devices['Pixel 5'] }], ['Tablet upright', { viewport: { width: 800, height: 1280 }, hasTouch: true, isMobile: true }], ['iPad upright', { ...devices['iPad (gen 7)'] }], ['Tablet sideways', { viewport: { width: 1280, height: 800 }, hasTouch: true, isMobile: true }], ['PC', { viewport: { width: 1920, height: 1080 } }]];
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
/* everything placed over the page: absolute or fixed boxes that are not inside another fixed box */
const scan = () => { const W = innerWidth, H = innerHeight, out = [];
  const nm = e => e.id || (typeof e.className === 'string' && e.className.split(' ')[0]) || e.tagName;
  for (const e of document.querySelectorAll('body *')) { const cs = getComputedStyle(e); if (cs.position !== 'fixed' && cs.position !== 'absolute') continue;
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0 || e.closest('[hidden]')) continue;
    if (e.id === 'map' || e.tagName === 'CANVAS' || e.id === 'navToast') continue;   /* a passing message is not a window */
    let a = e.parentElement, inner = false; while (a && a !== document.body) { const s = getComputedStyle(a); if (s.position === 'fixed' || s.position === 'absolute') { inner = true; break; } a = a.parentElement; } if (inner) continue;
    const r = e.getBoundingClientRect(); if (r.width < 20 || r.height < 20) continue;
    out.push({ n: nm(e), r: [r.left, r.top, r.right, r.bottom].map(Math.round) }); }
  const lv = document.querySelector('#liveBox .lvpill, #liveBox > *'); if (lv && lv.getClientRects().length) { const r = lv.getBoundingClientRect(); if (r.right > W + 1 || r.left < -1) out.push({ n: 'GPS pill', r: [r.left, r.top, r.right, r.bottom].map(Math.round), inner: true }); }
  const off = out.filter(o => o.r[0] < -1 || o.r[1] < -1 || o.r[2] > W + 1 || o.r[3] > H + 1).map(o => o.n + ' ' + o.r.join(','));
  const lap = []; const outer = out.filter(o => !o.inner); for (let i = 0; i < outer.length; i++) for (let j = i + 1; j < outer.length; j++) { const a = outer[i].r, b = outer[j].r, w = Math.min(a[2], b[2]) - Math.max(a[0], b[0]), h = Math.min(a[3], b[3]) - Math.max(a[1], b[1]); if (w > 2 && h > 2) { const mob = [outer[i], outer[j]].find(o => o.n === 'mobBtn'); if (mob) { const t = document.elementFromPoint((mob.r[0] + mob.r[2]) / 2, (mob.r[1] + mob.r[3]) / 2); if (t && t.closest('#mobBtn')) continue; } lap.push(outer[i].n + ' × ' + outer[j].n); } }   /* man overboard may sit over a window, never under one */
  let map = 0, n = 0; for (let y = 4; y < H; y += 12) for (let x = 4; x < W; x += 12) { n++; const e = document.elementFromPoint(x, y); if (e && (e.id === 'map' || e.tagName === 'CANVAS')) map++; }
  const small = [...document.querySelectorAll('button, a, select, input, [role=button]')].filter(e => { if (e.closest('[hidden]')) return false; const r = e.getBoundingClientRect(); if (!r.width || !r.height || r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) return false; const t = document.elementFromPoint(Math.min(W - 1, Math.max(0, r.left + r.width / 2)), Math.min(H - 1, Math.max(0, r.top + r.height / 2))); if (!t || !(t === e || e.contains(t))) return false; return r.width < 44 || r.height < 44; }).length;
  const bt = [...document.querySelectorAll('button, select, a[href], [role=button], .chip')].filter(e => { if (e.closest('[hidden]')) return false; const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden') return false; const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < H && r.right > 0 && r.left < W; });
  const blap = []; for (let i = 0; i < bt.length; i++) for (let j = i + 1; j < bt.length; j++) { const A = bt[i], B = bt[j]; if (A.contains(B) || B.contains(A)) continue; const a = A.getBoundingClientRect(), b = B.getBoundingClientRect(), w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); const seen = E => { const r = E.getBoundingClientRect(), t = document.elementFromPoint(Math.min(W - 1, Math.max(0, r.left + r.width / 2)), Math.min(H - 1, Math.max(0, r.top + r.height / 2))); return t && (t === E || E.contains(t)); }; if (w > 4 && h > 4 && seen(A) && seen(B)) { const top = document.elementFromPoint((Math.max(a.left, b.left) + Math.min(a.right, b.right)) / 2, (Math.max(a.top, b.top) + Math.min(a.bottom, b.bottom)) / 2); if (top && (A.contains(top) || B.contains(top) || top === A || top === B)) blap.push(nm(A) + ' × ' + nm(B)); } }
  return { off, lap, blap: [...new Set(blap)], share: Math.round(map / n * 100), small, all: out.map(o => o.n) }; };
(async () => { const b = await chromium.launch(); const rep = [];
  for (const [name, opt] of sizes) {
    const c = await b.newContext({ ...opt, serviceWorkers: 'block', geolocation: { latitude: 50.70, longitude: -1.20 }, permissions: ['geolocation'] });
    await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
    const ins = INS[name]; if (ins) { const v = { top: ins[0], right: ins[1], bottom: ins[2], left: ins[3] };
      await c.route(/\.(html|css|js)(\?.*)?$|\/$/, async rt => { const u = rt.request().url(); if (!u.startsWith(BASE)) return rt.continue(); const r = await rt.fetch(); const t = (await r.text()).replace(/env\(\s*safe-area-inset-(top|bottom|left|right)\s*(?:,\s*[^()]*)?\)/g, (m, k) => v[k] + 'px'); await rt.fulfill({ response: r, body: t }); }); }
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/mark/');
    await p.waitForFunction(() => window.FSMark && window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__navFc && window.__navFc().P, null, { timeout: 600000 }).catch(() => {});
    await p.waitForTimeout(2500);
    const st = (o, fn) => async () => { await p.evaluate(([o, fn]) => { if (fn) (new Function(fn))(); FSMark.set(o); }, [o, fn || '']); await p.waitForTimeout(900); };
    const now = 'Date.now() / 1000';
    const states = [['Course, empty', st({ tab: 'course' })],
      ['Course, round the cans', st({ tab: 'course' }, "FSSolent.set({ type: 'marks', start: { code: null, name: 'Start point', lat: 50.772, lon: -1.300 }, marks: FSSolent.board('3F P 2C S 3E P').marks })")],
      ['Course, shown on the chart', async () => { await p.evaluate(() => { const b = document.querySelector('#mkBody [data-k=show]'); if (b) b.click(); }); await p.waitForTimeout(2500); }],
      ['Course, tapping buoys', async () => { await p.evaluate(() => { const b = document.querySelector('#mkBody [data-k=pick][data-v=port]'); if (b) b.click(); }); await p.waitForTimeout(600); }],
      ['Course, windward-leeward and wind', st({ tab: 'course', wind: { twd: 230, tws: 12 } }, "const pk = document.getElementById('mkPickX'); if (pk) pk.click(); FSSolent.set({ type: 'wl', wl: Object.assign({}, FSSolent.state().wl, { wkind: 'brg', brg: 230, dist: 1, lkind: 'gate', lcode: '2C', lcode2: '3E', laps: 2 }) })")],
      ['Course, route it', async () => { await p.evaluate(() => { FSMark.set({ routeIt: true, tab: 'course' }); }); await p.waitForTimeout(800); }],
      ['Start, 4 minutes to go', st({ tab: 'start', gun: Math.round(Date.now() / 1000 + 240) })],
      ['Start, tapping the line', async () => { await p.evaluate(() => { const b = document.querySelector('#mkBody [data-k=tapline]'); if (b) b.click(); }); await p.waitForTimeout(600); }],
      ['Race', st({ tab: 'race' }, "const pk = document.getElementById('mkPickX'); if (pk) pk.click();")],
      ['After', st({ tab: 'after', gun: Math.round(Date.now() / 1000 - 3000), finAt: Math.round(Date.now() / 1000) })],
      ['Settings', st({ tab: 'settings' })],
      ['Big buttons, course', st({ tab: 'course', big: true })],
      ['Big buttons, start', st({ tab: 'start', big: true, gun: Math.round(Date.now() / 1000 + 240), finAt: null })]];
    for (const [st, act] of states) { await act(); const r = await p.evaluate(scan);
      ok(!r.off.length, `${name} | ${st} | nothing off the screen`, r.off.join('; ') || null);
      ok(!r.lap.length, `${name} | ${st} | no window or button covers another`, r.lap.join('; ') || null);
      if (ins) { const bad = await p.evaluate(([t, rr, bo, l]) => { const W = innerWidth, H = innerHeight, out = [];
          for (const e of document.querySelectorAll('button, input, select, textarea, a[href], [role=button], .chip')) { if (e.closest('[hidden]')) continue; const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) continue; const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || r.bottom <= 0 || r.top >= H || r.right <= 0 || r.left >= W) continue;
            const h = document.elementFromPoint(Math.min(W - 1, Math.max(0, (r.left + r.right) / 2)), Math.min(H - 1, Math.max(0, (r.top + r.bottom) / 2))); if (!h || !(e === h || e.contains(h) || h.contains(e))) continue;
            if (r.top < t - 1 || r.bottom > H - bo + 1 || r.left < l - 1 || r.right > W - rr + 1) out.push((e.id || e.getAttribute('aria-label') || e.textContent.trim().slice(0, 18) || e.tagName) + ' ' + [r.left, r.top, r.right, r.bottom].map(Math.round).join(',')); }
          return out; }, ins);
        ok(!bad.length, `${name} | ${st} | nothing under the phone's own bars (notch, home or gesture bar)`, bad.slice(0, 8).join('; ') || null); }
      ok(!r.blap.length, `${name} | ${st} | no two buttons on top of each other`, r.blap.slice(0, 8).join('; ') || null);
      rep.push(`${name} | ${st} | chart ${r.share}% | buttons under 44: ${r.small}`);
      await p.screenshot({ path: `/tmp/claude-0/ui/mark-${name.replace(/ /g, '-')}-${st.replace(/ /g, '-')}.png` }); }
    ok(!errs.length, `${name} | no page errors`, errs.join('; ') || null); await c.close(); }
  console.log(rep.join('\n')); console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); })();
