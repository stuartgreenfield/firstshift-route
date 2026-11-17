/* Stuart 17 Nov 12:31 (iPhone, live 0.12.36, Fastnet, panel open, plotter on): "The gps orange pill is jumping around". The GPS pill
   must hold still while nothing about the screen changes. Run: node tests/pill-jump.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', geolocation: { latitude: 50.62, longitude: -1.75, accuracy: 5 }, permissions: ['geolocation'] });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + (process.argv[3] || '/fastnet/'));
  await p.waitForFunction(() => window.__navFc && window.__navFc().P && window.__fsSim, null, { timeout: 300000 }); await p.waitForTimeout(3000);
  await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x && x.offsetParent) x.click(); }); await p.waitForTimeout(400); await p.click('#liveBtn').catch(() => {}); await p.waitForTimeout(1500); await p.evaluate(() => { window.__fsSim(true); window.__fsSimFix(50.62, -1.75, 7.3, 303); }); await p.waitForTimeout(800);
  await p.evaluate(() => { if (window.__fsPlot && !window.__fsPlot.C.on) window.__fsPlot.toggle(true); }); await p.waitForTimeout(800);
  const mini = await p.evaluate(() => { const l = document.getElementById('liveBox'); return l && l.className; }); console.log('liveBox class', mini, await p.evaluate(() => { const e = document.getElementById('liveBox'); const r = e.getBoundingClientRect(); return [e.hidden, getComputedStyle(e).display, r.top, r.left, r.width, e.innerText.slice(0,60)]; }));
  /* the boat moves on, a fix a second, as at sea */
  const pos = []; let la = 50.62, lo = -1.75;
  for (let i = 0; i < 24; i++) { la += 0.0004; lo -= 0.0007; await p.evaluate(([a, o]) => window.__fsSimFix(a, o, 7.3, 303), [la, lo]);
    for (let k = 0; k < 4; k++) { await p.waitForTimeout(250); pos.push(await p.evaluate(() => { const e = document.getElementById('liveBox'); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(), pr = e.offsetParent ? e.offsetParent.getBoundingClientRect() : {}; window.__pj = window.__pj || []; const st = [e.getAttribute('style'), document.body.className, e.className, Math.round(pr.top), Math.round(pr.height)].join(' | '); if (window.__pj[window.__pj.length - 1] !== st) window.__pj.push(st); return [Math.round(r.left), Math.round(r.top), Math.round(r.width)]; })); } }
  console.log(await p.evaluate(() => (window.__pj || ['no pill seen']).join('\n')));
  console.log('SEQ1', pos.map(q => q ? q[1] : 'x').join(','));
  const tops = new Set(pos.filter(Boolean).map(q => q[1])), lefts = new Set(pos.filter(Boolean).map(q => q[0]));
  ok(tops.size <= 3 && lefts.size <= 2, 'panel closed (one move allowed when the plotter bar arrives): the GPS pill holds still while the boat sails', JSON.stringify([...tops]) + ' ' + JSON.stringify([...lefts]));
  /* the panel open, as in the photo */
  await p.evaluate(() => { const b = document.querySelector('[data-rp=routes], #rpRoutes, .rpnav button'); if (b) b.click(); }); await p.waitForTimeout(1200);
  const pos2 = [];
  for (let i = 0; i < 24; i++) { la += 0.0004; lo -= 0.0007; await p.evaluate(([a, o]) => window.__fsSimFix(a, o, 7.3, 303), [la, lo]);
    for (let k = 0; k < 4; k++) { await p.waitForTimeout(250); pos2.push(await p.evaluate(() => { const e = document.getElementById('liveBox'); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width)]; })); } }
  console.log('SEQ2', pos2.map(q => q ? q[1] : 'x').join(','));
  const t2 = new Set(pos2.filter(Boolean).map(q => q[1])), l2 = new Set(pos2.filter(Boolean).map(q => q[0]));
  ok(t2.size <= 1 && l2.size <= 2, 'panel open: the GPS pill holds still while the boat sails', JSON.stringify([...t2]) + ' ' + JSON.stringify([...l2]));
  /* Safari's bars coming and going as the page is touched: the window height changes by about 80 px, again and again */
  const vp = p.viewportSize(); const seq3 = [];
  await p.evaluate(() => { const pn = document.getElementById('panel'); if (pn) pn.classList.add('collapsed'); window.dispatchEvent(new Event('resize')); }); await p.waitForTimeout(800);
  const room = await p.evaluate(() => { const f = document.querySelector('.fabhelp'); const host = f && f.offsetParent; const tops = ['.top', '#fsPlot', '#navStrip', '#errBox'].map(q => document.querySelector(q)).filter(e => e && e.getClientRects().length).map(e => e.getBoundingClientRect().bottom); return host ? host.clientHeight - Math.max(0, Math.max(...tops) - host.getBoundingClientRect().top) : null; });
  const base = Math.round(vp.height - (room - 310)); console.log('room', room, 'base height', base);
  for (let i = 0; i < 16; i++) { await p.setViewportSize({ width: vp.width, height: base + (i % 2 ? 25 : -25) }); await p.waitForTimeout(450); seq3.push(await p.evaluate(() => { const e = document.getElementById('liveBox'); const r = e.getBoundingClientRect(); return e.style.bottom === 'auto' ? 'top' : 'foot'; })); }
  await p.setViewportSize(vp); let flips = 0; for (let i = 1; i < seq3.length; i++) if (seq3[i] !== seq3[i - 1]) flips++;
  ok(flips <= 1, 'the window height going up and down does not flip the pill between the top and the foot', seq3.join(','));
  await p.screenshot({ path: '/tmp/claude-0/ui/m2/pill.png' });
  ok(!errs.length, 'no page errors', errs.join(' | ') || null);
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
