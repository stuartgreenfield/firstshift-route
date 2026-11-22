/* Solent race marks in the Layers menu (Stuart 22 Nov 22:46 "it should be in the main layers menu"; 22:50 "Auto, On or Off").
   node tests/solent-layer.js [base]   Route and Route+: Auto, On, Off; Mark and Mark+: On, Off, the same switch as Settings. */
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else { fail++; console.log('FAIL ' + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); } };
async function layers(p) { if (await p.evaluate(() => document.getElementById('layers').hidden)) await p.click('#layersBtn'); await p.waitForSelector('#layers:not([hidden]) .lsol', { timeout: 10000 });
  return p.evaluate(() => [].map.call(document.querySelectorAll('#layers [data-sol]'), b => [b.dataset.sol, b.textContent, b.getAttribute('aria-pressed')])); }
async function pick(p, m) { await p.click('#layers [data-sol="' + m + '"]'); await p.waitForTimeout(300); return p.evaluate(() => ({ mode: window.__fsSolentLayer.get(), shown: window.__fsSolentLayer.shown(), pressed: (document.querySelector('#layers [data-sol][aria-pressed="true"]') || {}).dataset })); }
(async () => {
  const b = await chromium.launch(), errs = [];
  for (const [tool, path] of [['Route', '/cervantes/'], ['Mark', '/mark/']]) {
    const c = await b.newContext({ viewport: { width: 1200, height: 900 }, serviceWorkers: 'block' }); await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
    await c.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); localStorage.setItem('fs-finesec', '0'); } document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); });
    const p = await c.newPage(); p.on('pageerror', e => errs.push(tool + ': ' + e.message));
    await p.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 120000 }); await p.waitForFunction(() => window.__fsSolentLayer && document.getElementById('layersBtn'), null, { timeout: 60000 }); await p.waitForTimeout(2000);
    await p.evaluate(() => { document.querySelectorAll('.pop:not(#layers), .sheet, #setupCard, #solStep, #solSheet, #splash').forEach(e => { if (e.id !== 'layers') e.hidden = true; }); });
    const row = await layers(p);
    if (tool === 'Route') {
      ok(row.map(r => r[1]).join(' ') === 'Auto On Off', 'Route: Layers has Solent race marks Auto, On, Off', row);
      ok(row[0][2] === 'true', 'Route: Auto to start with', row);
      const on = await pick(p, 'on'); ok(on.mode === 'on' && on.shown && on.pressed.sol === 'on', 'Route: On shows the marks anywhere', on);
      const off = await pick(p, 'off'); ok(off.mode === 'off' && !off.shown, 'Route: Off hides them', off);
      const au = await pick(p, 'auto'); ok(au.mode === 'auto' && !au.shown, 'Route: Auto with no GPS fix in the Solent: not shown', au);
      await pick(p, 'on'); await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.__fsSolentLayer, null, { timeout: 60000 });
      ok(await p.evaluate(() => window.__fsSolentLayer.get()) === 'on', 'Route: the choice is kept after a reload');
      ok(await p.evaluate(() => !!(document.querySelector('.solsettings') && getComputedStyle(document.querySelector('.solsettings')).display === 'none')), 'Route: no Solent settings section (Layers is the only switch)');
    } else {
      ok(row.map(r => r[1]).join(' ') === 'On Off', 'Mark: Layers has Solent race marks On, Off', row);
      const off = await pick(p, 'off'); ok(off.mode === 'off' && !off.shown, 'Mark: Off hides them', off);
      ok(await p.evaluate(() => document.getElementById('solentOn').checked) === false, 'Mark: Settings tick follows Layers (off)');
      const on = await pick(p, 'on'); ok(on.mode === 'on' && on.shown, 'Mark: On shows them', on);
      ok(await p.evaluate(() => document.getElementById('solentOn').checked) === true, 'Mark: Settings tick follows Layers (on)');
      await p.evaluate(() => { const e = document.getElementById('solentOn'); e.checked = false; e.dispatchEvent(new Event('change')); });
      const row2 = await layers(p);
      ok(row2.find(r => r[0] === 'off')[2] === 'true', 'Mark: Layers follows the Settings tick', row2);
      const shot = process.env.SHOT; if (shot) await p.screenshot({ path: shot, clip: await p.evaluate(() => { const r = document.getElementById('layers').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: Math.min(r.height, 700) }; }) });
    }
    const st = await p.evaluate(() => ({ hid: document.getElementById('layers').hidden, err: window.__lastErr })); await layers(p);
    const w = await p.evaluate(() => { const r = document.querySelector('#layers .lsol').getBoundingClientRect(), L = document.getElementById('layers').getBoundingClientRect(); return [r.right <= L.right + 1, r.height]; });
    ok(w[0], tool + ': the row fits the Layers panel', w);
    await c.close();
  }
  ok(!errs.length, 'no script errors', errs);
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
