/* Astro (Stuart 15 Nov 11:45, 11:47): an Astro button with sunrise, sunset, twilight, moonrise, moonset and how much of the moon is lit,
   as text and a drawing, at the boat or the start, for the day on the time slider; a line on the chart that can be shown or hidden.
   Checked against SunCalc's own figures for the same place and day. Run: node tests/astro.js <base> [width height] */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779', W = +process.argv[3] || 412, H = +process.argv[4] || 915;
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: W, height: H }, isMobile: W < 900, hasTouch: true, serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/channel-area/'); await p.waitForFunction(() => window.FSAstro && document.getElementById('astroBtn') && window.__fsAstroCtx && window.__fsAstroCtx().lat != null, null, { timeout: 300000 }); await p.waitForTimeout(1000);
  const vis = await p.evaluate(() => { const e = document.getElementById('astroBtn'), q = e.getBoundingClientRect(), t = document.elementFromPoint(q.x + q.width / 2, q.y + q.height / 2); return { w: q.width, inView: q.right <= innerWidth && q.left >= 0, top: e.contains(t) }; });
  if (W >= 561) { ok(vis.w > 20 && vis.inView && vis.top, 'the Astro button is in the top bar and can be pressed', JSON.stringify(vis)); await p.click('#astroBtn'); }
  else { await p.evaluate(() => document.getElementById('layersBtn').click()); await p.waitForTimeout(400); const lay = await p.evaluate(() => !!document.getElementById('astroLay')); ok(lay && vis.w === 0, 'on a phone Astro sits at the top of Layers (the top bar is full)', JSON.stringify(vis)); await p.click('#astroLay'); }
  await p.waitForTimeout(500);
  const r = await p.evaluate(() => { const c = window.__fsAstroCtx(), o = FSAstro.day(c.at, c.lat, c.lon), hm = d => d && !isNaN(d) ? ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) : '--'; const t = document.getElementById('astroPop').textContent; return { open: !document.getElementById('astroPop').hidden, text: t, rise: hm(o.t.sunrise), set: hm(o.t.sunset), mr: o.m.rise ? hm(o.m.rise) : null, lit: Math.round(o.il.fraction * 100), svg: document.querySelectorAll('#astroPop svg').length, where: c.where }; });
  ok(r.open && r.text.indexOf('Sunrise' + r.rise) >= 0 && r.text.indexOf('Sunset' + r.set) >= 0, 'it gives sunrise and sunset for the day on the slider, at ' + r.where, r.rise + ' / ' + r.set);
  ok(new RegExp(r.lit + '% lit').test(r.text) && /First light/.test(r.text) && /Moonrise/.test(r.text), 'and the moon: how much is lit, rise and set, first and last light', r.lit + '% lit');
  ok(r.svg >= 2, 'with the moon drawn and the day and night band', r.svg + ' drawings');
  await p.click('#astroShow'); await p.waitForTimeout(300);
  const l = await p.evaluate(() => { const e = document.getElementById('astroLine'); return e && !e.hidden ? e.textContent : null; });
  ok(l && /☀ \d\d:\d\d to \d\d:\d\d/.test(l) && /☾ \d+%/.test(l), 'the sun and moon line shows on the chart when ticked', l);
  await p.click('#astroX'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.getElementById('astroPop').hidden && !document.getElementById('astroLine').hidden), 'closing Astro keeps the line on the chart');
  await p.reload(); await p.waitForFunction(() => window.FSAstro && document.getElementById('astroBtn'), null, { timeout: 300000 }); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => { const e = document.getElementById('astroLine'); return !!e && !e.hidden; }), 'the line choice is kept');
  await p.evaluate(() => document.getElementById('astroLine').click()); await p.waitForTimeout(300); await p.evaluate(() => document.getElementById('astroShow').click()); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.getElementById('astroLine').hidden), 'and untick hides it');
  const known = await p.evaluate(() => { const o = FSAstro.day(Date.UTC(2026, 10, 16, 12), 50.90, -1.40); return [o.t.sunrise.getUTCHours() * 60 + o.t.sunrise.getUTCMinutes(), o.t.sunset.getUTCHours() * 60 + o.t.sunset.getUTCMinutes()]; });
  ok(Math.abs(known[0] - (7 * 60 + 23)) <= 3 && Math.abs(known[1] - (16 * 60 + 16)) <= 3, 'Southampton 16 Nov 2026 agrees with a published table (07:23, 16:16) within 3 minutes (SunCalc 07:24, 16:19; NOAA method 07:22, 16:17)', known.map(m => Math.floor(m / 60) + ':' + ('0' + m % 60).slice(-2)).join(' '));
  ok(errs.length === 0, 'no page errors', errs.slice(0, 3).join(' | '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
