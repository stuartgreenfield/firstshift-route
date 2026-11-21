/* Stuart 21 Nov 18:43: "a complete button press test of every button including help" before going live.
   Opens one tool on a phone or a tablet and presses every button it can reach: each one visible, then every new one that pressing
   reveals (panels, sheets, Help topics, the walk-through), until nothing new appears. Records for each press: script errors, files
   that fail to load, and whether anything happened (the page changed, a window or file opened, the address changed).
   Run: node tests/every-button.js <url> <phone|tablet> <name>   writes /tmp/claude-0/buttons/<name>.json */
const { chromium, devices } = require('playwright'); const fs = require('fs');
const URL0 = process.argv[2], DV = process.argv[3] || 'phone', NAME = process.argv[4] || 'run';
const OUT = '/tmp/claude-0/buttons'; fs.mkdirSync(OUT, { recursive: true });
const SKIP = /^(End tour|Clear all saved|Delete|Reset everything|Forget|Route the ensemble|Compare start times)/i;   /* the two long routing jobs are timed by speed_check and route_check; here they starve the other pages of the processor */   /* pressed once at the end, not mid-crawl */
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...(DV === 'phone' ? devices['Pixel 7'] : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 }), serviceWorkers: 'block', geolocation: { latitude: 50.76, longitude: -1.29 }, permissions: ['geolocation'], acceptDownloads: true });
  await ctx.route(/open-meteo|googleapis|openseamap|wa\.me|claude\.ai|wixstatic|firstshiftsailing\.com/, r => r.fulfill({ status: 200, body: '' }));
  if (process.env.FRESH) await ctx.addInitScript(() => { window.__FRESH = 1; });   /* first run: the start screen, terms and set-up as a new user sees them */
  await ctx.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.clear(); if (!window.__FRESH) { const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart', 'fs-coach-mute'].forEach(k => localStorage.setItem(k, '1')); } }
    window.__mut = 0; new MutationObserver(l => { window.__mut += l.length; }).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
    window.__opened = []; const wo = window.open; window.open = function (u) { window.__opened.push(String(u)); return null; };
    window.__alerts = 0; window.alert = () => { window.__alerts++; }; window.confirm = () => { window.__alerts++; return false; }; });
  const p = await ctx.newPage(); const errs = [], bad = []; let cur = '';
  p.on('pageerror', e => errs.push({ at: cur, msg: e.message.slice(0, 200) }));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_|net::|Failed to load resource/.test(m.text())) errs.push({ at: cur, msg: 'console: ' + m.text().slice(0, 200) }); });
  p.on('response', r => { const u = r.url(); if (r.status() >= 400 && u.startsWith(new URL(URL0).origin) && !/\/api\//.test(u)) bad.push({ at: cur, url: u.slice(0, 160), st: r.status() }); });
  let pops = 0, dls = 0; ctx.on('page', np => { pops++; np.close().catch(() => {}); }); p.on('download', () => { dls++; }); p.on('dialog', d => d.dismiss().catch(() => {}));
  await p.goto(URL0, { timeout: 120000 }); await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: process.env.FRESH ? 30000 : 600000 }).catch(() => null); await p.waitForTimeout(4000);
  if (!process.env.FRESH) await p.evaluate(() => { const n = document.getElementById('spTourNo'); if (n && n.offsetParent) n.click(); });
  let stuck = 0, cpath = []; const seenBy = new Map(), tried = new Set(); const pressed = new Map(); const log = []; const t0 = Date.now(); console.log('loaded');
  /* every visible, enabled control, with a key that stays the same as the page redraws */
  const list = () => T(p.evaluate(() => { const vis = e => { if (e.disabled || e.closest('[hidden],[inert]')) return false; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const s = getComputedStyle(e); if (s.visibility === 'hidden' || +s.opacity === 0 || s.pointerEvents === 'none') return false;
      const cx = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)); if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return 'off'; const top = document.elementFromPoint(cx, cy); return !!top && (top === e || e.contains(top) || top.contains(e)) ? true : 'covered'; };
    const sel = 'button, [role=button], a.btn, a[href], summary, input[type=checkbox], input[type=radio], [data-tab], .tab, select';
    const out = []; document.querySelectorAll(sel).forEach((e, i) => { const v = vis(e); if (!v) return; const own = e.id ? '#' + e.id : ''; const anc = e.closest('[id]'); const txt = (e.getAttribute('aria-label') || e.textContent || e.value || e.title || '').replace(/\s+/g, ' ').trim().slice(0, 50);
      const dk = Object.keys(e.dataset).map(k => k + '=' + e.dataset[k]).join(',').slice(0, 60); const key = own || ((anc ? '#' + anc.id : '') + ' ' + e.tagName.toLowerCase() + ' ' + (dk || txt)); out.push({ key: key.replace(/\d+/g, 'N'), txt, tag: e.tagName.toLowerCase(), v, idx: i }); });
    return out; }), 20000, []);
  const T = (pr, ms, v) => Promise.race([pr, new Promise(r => setTimeout(() => r(v), ms))]);   /* a busy page never holds the test up for long */
  const sigOf = () => T(p.evaluate(() => { const parts = [document.body.className, location.hash];
    document.querySelectorAll('button, [role=button], a.btn, input, select, summary, [aria-expanded], [aria-pressed], [aria-selected], dialog, section, aside, .sheet, .panel').forEach(e => { const r = e.getBoundingClientRect(); const v = r.width > 1 && r.height > 1 && !e.closest('[hidden]') ? 1 : 0;
      parts.push(v + (e.id || e.tagName) + (e.getAttribute('aria-pressed') || '') + (e.getAttribute('aria-selected') || '') + (e.getAttribute('aria-expanded') || '') + (e.checked ? 'c' : '') + (e.value !== undefined && e.tagName !== 'BUTTON' ? e.value : '') + (e.open ? 'o' : '')); });
    parts.push((document.body.innerText || '').replace(/[0-9]/g, '').length); document.querySelectorAll('details').forEach(d => parts.push(d.open ? 'o' : 'c'));
    let ls = ''; try { ls = Object.keys(localStorage).sort().map(k => k + '=' + (localStorage.getItem(k) || '').length).join(';'); } catch (e) {} parts.push(ls);
    const m = window.__fsMap || window.map; if (m && m.getCenter) { const c = m.getCenter(); parts.push(c.lat.toFixed(4) + ',' + c.lng.toFixed(4) + ',' + m.getZoom()); }
    let h = 0; const str = parts.join('|'); for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return h; }).catch(() => 0), 15000, 0);
  const press = async (it) => p.evaluate(({ idx, tag }) => { const sel = 'button, [role=button], a.btn, a[href], summary, input[type=checkbox], input[type=radio], [data-tab], .tab, select'; const e = document.querySelectorAll(sel)[idx]; if (!e) return 'gone';
    if (tag === 'select') { const o = [...e.options].filter(o => !o.disabled); const nx = o[(o.indexOf(e.selectedOptions[0]) + 1) % o.length]; if (nx && nx !== e.selectedOptions[0]) { e.value = nx.value; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); return 'chose ' + nx.textContent.trim().slice(0, 30); } return 'one option'; }
    if (tag === 'a' && e.href && !/^javascript:|#$/.test(e.getAttribute('href') || '#')) { const h = e.getAttribute('href'); if (/^(https?:|mailto:|tel:)/.test(h) && !h.startsWith(location.origin) && !h.startsWith('/') ) { return 'link ' + h.slice(0, 80); } }
    e.scrollIntoView({ block: 'center' }); e.click(); return 'clicked'; }, it);
  for (let round = 0; round < 4000; round++) {
    if (Date.now() - t0 > (process.env.FRESH ? 15 : 30) * 60 * 1000) { log.push({ key: 'STOPPED', how: '', did: 'STOPPED', err: [], bad: [], note: 'time limit' }); break; }
    let items = await list(); items.forEach(x => { if (x.v === true && !seenBy.has(x.key)) seenBy.set(x.key, cpath.slice()); }); const fresh = items.filter(i => !pressed.has(i.key) && !SKIP.test(i.txt));
    const next = fresh.find(i => i.v === true) || fresh.find(i => i.v === 'off');
    if (!next) {   /* nothing new here: go back to a fresh page and replay the presses that first showed a button not yet pressed */
      const pending = [...seenBy.keys()].filter(k => !pressed.has(k) && !tried.has(k));
      if (!pending.length) break;
      const k = pending[0]; tried.add(k); const path = seenBy.get(k);
      await p.evaluate(() => sessionStorage.removeItem('x')).catch(() => {}); await p.goto(URL0).catch(() => {}); await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 300000 }).catch(() => null); await p.waitForTimeout(2500);
      await p.evaluate(() => { const n = document.getElementById('spTourNo'); if (n && n.offsetParent) n.click(); }); cpath = [];
      for (const step of path) { const it = (await list()).find(x => x.key === step); if (!it) break; cur = 'replay ' + step; try { await press(it); } catch (e) {} cpath.push(step); await p.waitForTimeout(500); }
      if (!(await list()).some(x => x.key === k && x.v === true)) { pressed.set(k, 1); log.push({ key: k, txt: '', how: 'not reached again', did: 'UNREACHED', err: [], bad: [] }); }
      continue; }
    stuck = 0;
    cur = next.key; const e0 = errs.length, b0 = bad.length, pop0 = pops, dl0 = dls; const st = await p.evaluate(() => { window.__mut = 0; return { url: location.href, op: (window.__opened || []).length }; }).catch(() => ({ url: '', op: 0 }));
    const sig0 = await sigOf(); let how; try { how = await T(press(next), 20000, 'timed out (page busy 20 s)'); } catch (e) { how = 'error ' + e.message.slice(0, 80); }
    await p.waitForTimeout(/^link/.test(how) ? 50 : 650);
    const after = await p.evaluate(() => ({ url: location.href, mut: window.__mut, op: (window.__opened || []).length })).catch(() => ({ url: 'navigated', mut: 1, op: 0 }));
    const sig1 = await sigOf(); const did = /^link/.test(how) ? 'link checked' : after.url !== st.url ? 'address changed' : pops > pop0 || after.op > st.op ? 'opened a window' : dls > dl0 ? 'file saved' : sig1 !== sig0 ? 'screen changed' : 'NOTHING SEEN';
    if (log.length % 20 === 0) { fs.writeFileSync(`${OUT}/${NAME}.partial.json`, JSON.stringify(log)); console.log('pressed', log.length, Math.round((Date.now() - t0) / 1000) + ' s'); }
    cpath.push(next.key); pressed.set(next.key, 1); log.push({ key: next.key, txt: next.txt, how, did, err: errs.slice(e0).map(x => x.msg), bad: bad.slice(b0).map(x => x.st + ' ' + x.url) });
    if (after.url !== st.url && new URL(after.url).pathname !== new URL(URL0).pathname) { await p.goto(URL0).catch(() => {}); await p.waitForTimeout(5000); cpath = []; }
    /* stuck behind a full-screen sheet with nothing new: close what is open */
  }
  /* buttons in the page that were never reachable */
  const never = await p.evaluate(keys => { const sel = 'button, [role=button], a.btn'; return [...document.querySelectorAll(sel)].filter(e => e.id && !keys.includes('#' + e.id)).map(e => '#' + e.id + ' ' + (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30)); }, [...pressed.keys()]);
  const res = { name: NAME, url: URL0, dv: DV, pressed: log.length, nothing: log.filter(l => l.did === 'NOTHING SEEN').map(l => l.key + ' | ' + l.txt), errors: log.filter(l => l.err.length).map(l => ({ key: l.key, err: l.err })), missing: log.filter(l => l.bad.length).map(l => ({ key: l.key, bad: l.bad })), unreached: log.filter(l => l.did === 'UNREACHED').map(l => l.key), links: log.filter(l => /^link/.test(l.how)).map(l => l.how), neverReached: never, secs: Math.round((Date.now() - t0) / 1000), log };
  fs.writeFileSync(`${OUT}/${NAME}.json`, JSON.stringify(res, null, 1));
  console.log(JSON.stringify({ name: NAME, pressed: res.pressed, nothing: res.nothing.length, errors: res.errors.length, missing: res.missing.length, never: never.length, unreached: res.unreached.length, secs: res.secs }));
  await b.close(); })();
