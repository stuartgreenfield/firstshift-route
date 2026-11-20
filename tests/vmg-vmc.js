/* VMG and VMC (Stuart 20 Nov 09:25, 09:30; docs/VMG-VMC-REVIEW.md). In test mode, after the gun, the plotter bar shows VMC (towards the mark,
   over the ground) and VMG that says what it is measured against (towards or away from the wind, or "reaching"), with the polar target;
   on Route+ and Mark+ also the target speed. The deck offers VMG to wind and target VMG. Run: node tests/vmg-vmc.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x && x.offsetParent) x.click(); FSSolent.set({ wind: { twd: 230, tws: 12, src: 'typed', at: Date.now() }, tide: { mode: 'hand', spd: 1.0, dir: 248 } }); FSSolent.test(true); });
  const plus = await p.evaluate(() => !!document.getElementById('navPlot'));
  let txt = '', seen = [];
  for (let i = 0; i < 70; i++) { await p.waitForTimeout(3000);
    txt = await p.evaluate(() => { const pl = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'PLOT'); const bar = document.getElementById('navPlot') || document.getElementById('fsPlot'); if (pl && !(bar && bar.offsetParent)) pl.click(); if (bar && bar.classList.contains('mini')) { const mm = bar.querySelector('[data-k=mini]'); if (mm) mm.click(); } return bar ? bar.innerText.replace(/\s+/g, ' ') : ''; });
    const m = txt.match(/VMG ([\d.]+|--) (GPS · )?(to|from) wind( \d+%)?|VMG -- reaching: see VMC/); if (m) { seen.push(m[0]); if (seen.length >= 4) break; } }
  if (!seen.length) console.log('BAR', txt.slice(0, 600));
  if (process.env.SHOT) { await p.evaluate(() => ['solTestBar', 'mkTestBar', 'solStartScr', 'solSeq'].forEach(id => { const e = document.getElementById(id); if (e) e.style.display = 'none'; })); await p.waitForTimeout(800); const bar = await p.$('#navPlot') || await p.$('#fsPlot'); if (bar) await bar.screenshot({ path: process.env.SHOT }); }
  ok(seen.length > 0, 'plotter bar: VMG says towards or away from the wind, or reaching', seen.slice(0, 4));
  ok(seen.length > 0 && (seen.some(s => /\d+%/.test(s)) || seen.every(s => /reaching/.test(s))), 'with the polar target VMG beside it', seen.slice(0, 2));
  ok(/VMC [\d.-]+ kn to the mark/.test(txt), 'VMC says towards the mark, over the ground', (txt.match(/VMC[^·]{0,60}/) || [''])[0]);
  if (plus) ok(/Target [\d.]+ (boat \d+% of it|kn polar)/i.test(txt) || /Target -- needs/i.test(txt), 'Mark+: the target speed in the plotter bar', (txt.match(/Target[^·]{0,60}/i) || [''])[0]);
  if (plus) console.log('INST', JSON.stringify(await p.evaluate(() => ({ bsp: window.__navShown('bsp'), twa: window.__navShown('twa'), tws: window.__navShown('tws'), tgt: window.__navTarget && window.__navTarget(), fix: window.__fsLiveFix && (({ sog, cog }) => ({ sog, cog }))(window.__fsLiveFix() || {}) }))));
  ok(!errs.length, 'no script errors', errs.slice(0, 2));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
