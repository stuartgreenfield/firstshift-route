/* Follow a chosen model (Stuart 24 Nov 2026 10:34 to 10:40). Checks: the default stays the quickest; Follow on a card makes that route the
   chosen one (the line, PLOT, HELM, ETA and gun bar all read S.sel); the choice is kept per race through a re-route and a reload; when newer
   forecast runs arrive and the followed route is not the quickest the strip asks, and each answer does what it says; long tap on a chip
   follows; the cross goes back to the quickest. Run: node tests/follow-model.js [base] [path] */
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8779', PATH = process.argv[3] || '/channel-area/';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); return c; };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); localStorage.setItem('fs-rdetail', 'quick'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const routed = () => p.waitForFunction(() => { const F = window.__navFc && window.__navFc(); const n = (document.getElementById('runNote') || {}).textContent || ''; return F && F.sel && F.sel.path && !F.running && !/Refining|Finer routes coming/.test(n) && document.querySelectorAll('#finBox .fin[data-id]').length > 1; }, null, { timeout: 600000 });
  const st = () => p.evaluate(() => { const F = window.__navFc(), best = (document.querySelector('#finBox .fin.fast') || {}).dataset; const fol = JSON.parse(localStorage.getItem('fs-followroute') || '{}'); const k = Object.keys(fol)[0];
    const strip = document.getElementById('folStrip'); return { sel: F.sel.id, ids: F.routes.map(r => r.id), fol: k ? fol[k].id : null, pill: (strip.querySelector('.folpill') || {}).textContent || null, ask: !!strip.querySelector('.folask'), stripShown: !strip.hidden, tag: (document.querySelector('#finBox .fin.fol') || { dataset: {} }).dataset.id || null }; });
  const rerun = async () => { await p.evaluate(() => document.querySelectorAll('.sheet, .pop').forEach(e => { e.hidden = true; })); await p.evaluate(() => { const F = window.__navFc(); window.__folGen = Date.now(); }); await p.evaluate(() => document.getElementById('run').click()); await p.waitForTimeout(800); await routed(); };
  await p.goto(BASE + PATH); await routed(); await p.waitForTimeout(500);
  let s = await st(); const best = await p.evaluate(() => { const r = [...document.querySelectorAll('#finBox .fin[data-id]')]; const F = window.__navFc(); return F.sel.id; });
  ok(!s.fol && s.stripShown && !s.pill, 'default: nothing followed, the strip shows the routes', s);
  const other = s.ids.find(id => id !== best && id !== 'fixed');
  ok(!!other, 'a second route to follow', s.ids); if (!other) { await b.close(); process.exit(1); }
  await p.evaluate(id => { document.getElementById('panel') && (document.getElementById('panel').hidden = false); document.querySelector('#finBox .fin[data-id="' + id + '"] .folb').click(); }, other); await p.waitForTimeout(800);
  s = await st(); ok(s.sel === other && s.fol === other && /Following/.test(s.pill || '') && s.tag === other, 'Follow on a card: that route is the chosen one, stored, pill and tag shown', s);
  const btn = await p.evaluate(id => document.querySelector('#finBox .fin[data-id="' + id + '"] .folb').textContent, other); ok(/Following/.test(btn), 'the card button reads Following', btn);
  await rerun(); s = await st(); ok(s.sel === other && !s.ask, 're-route on the same forecasts: still following, no question', s);
  await p.evaluate(() => { const a = JSON.parse(localStorage.getItem('fs-followroute')); Object.keys(a).forEach(k => a[k].runs = 'older'); localStorage.setItem('fs-followroute', JSON.stringify(a)); });
  await rerun(); s = await st(); ok(s.sel === other && s.ask, 'newer runs, followed route not the quickest: asks, and keeps following until answered', s);
  const askTxt = await p.evaluate(() => document.querySelector('.folask').textContent); ok(/Keep following/.test(askTxt) && /Follow the quickest/.test(askTxt), 'the question offers both answers with times', askTxt);
  await p.evaluate(() => document.querySelector('.folask [data-fk="keep"]').click()); await p.waitForTimeout(400); s = await st(); ok(s.sel === other && s.fol === other && !s.ask, 'Keep following: choice kept, question gone', s);
  await p.evaluate(() => { const a = JSON.parse(localStorage.getItem('fs-followroute')); Object.keys(a).forEach(k => a[k].runs = 'older'); localStorage.setItem('fs-followroute', JSON.stringify(a)); });
  await rerun(); await p.evaluate(() => document.querySelector('.folask [data-fk="best"]').click()); await p.waitForTimeout(800); s = await st(); ok(s.sel === best && !s.fol && !s.ask, 'Follow the quickest: back to the quickest, choice cleared', s);
  await p.evaluate(() => document.querySelectorAll('.sheet, .pop, #panel, .sp-shade').forEach(e => { e.hidden = true; e.style.display = 'none'; }));
  const chip = await p.$('#folStrip [data-fc="' + other + '"]'); const bb = await chip.boundingBox(); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.waitForTimeout(900); await p.mouse.up(); await p.waitForTimeout(800);
  s = await st(); ok(s.sel === other && s.fol === other, 'long tap on a chip on the map: follows', s);
  await p.reload(); await routed(); await p.waitForTimeout(500); s = await st(); ok(s.sel === other && s.fol === other && !s.ask, 'after a reload and re-route: still following', s);
  await p.evaluate(() => document.querySelector('#folStrip .folpill').click()); await p.waitForTimeout(800); s = await st(); ok(s.sel === best && !s.fol && !s.pill, 'the cross: back to the quickest', s);
  await p.evaluate(id => document.querySelector('#folStrip [data-fc="' + id + '"]').click(), other); await p.waitForTimeout(800); s = await st(); ok(s.sel === other && !s.fol, 'a plain tap on a chip shows the route without following it', s);
  await p.screenshot({ path: process.env.SHOT || '/tmp/follow.png' });
  ok(!errs.length, 'no script errors', errs.slice(0, 3));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
