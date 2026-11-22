/* Stuart 22 Nov 06:55: do named set-ups make a list kept on this device, and does it survive closing and opening Route again?
   Saves two set-ups with different settings, closes the browser completely, reopens, checks the list, loads each and checks the
   settings came back, then deletes one. Run: node tests/named-setups.js http://localhost:8779 [path] */
const { chromium, devices } = require('playwright'); const fs = require('fs');
const BASE = process.argv[2] || 'http://localhost:8779', PATH = process.argv[3] || '/channel-area/', DIR = '/tmp/claude-0/np-profile';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
const open = async (first) => { const c = await chromium.launchPersistentContext(DIR, { ...devices['iPhone 13'], serviceWorkers: 'block' });
  if (first) await c.addInitScript(() => { if (localStorage.getItem('np-test')) return; localStorage.clear(); localStorage.setItem('np-test', '1'); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); });
  await c.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }));
  const p = c.pages()[0] || await c.newPage(); p.__errs = []; p.on('pageerror', e => p.__errs.push(e.message)); await p.goto(BASE + PATH);
  await p.waitForFunction(() => document.getElementById('setBtn') && document.getElementById('keepOn'), null, { timeout: 300000 }); await p.waitForTimeout(1500); return { c, p }; };
const mine = async (p) => { await p.evaluate(() => { document.getElementById('setBtn').click(); }); await p.waitForTimeout(500); await p.evaluate(() => { const t = [...document.querySelectorAll('[data-tab], .stab, button')].find(b => /^My set-up$/.test(b.textContent.trim())); t && t.click(); const d = document.getElementById('navPrefs'); if (d) d.open = true; }); await p.waitForSelector('#npSaveAs', { state: 'attached', timeout: 20000 }); await p.waitForTimeout(400); };
const setKeep = (p, v) => p.evaluate(v => { const s = document.getElementById('keepOn'); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); }, v);
const saveAs = async (p, n) => { await p.fill('#npName', n); await p.evaluate(() => document.getElementById('npSaveAs').click()); await p.waitForTimeout(400); const y = await p.$('#npYes'); if (y && await y.isVisible()) await y.click(); await p.waitForTimeout(300); return p.evaluate(() => { const n = document.getElementById('npNote'); return n.offsetParent ? n.textContent : 'NOT ON SCREEN: ' + n.textContent; }); };   /* the message must be seen where Save as was pressed (22 Nov: it had moved to Display with Clear screen) */
const list = p => p.evaluate(() => [...document.getElementById('npList').options].map(o => o.textContent));
const keep = p => p.evaluate(() => ({ store: localStorage.getItem('fs-keepon'), ui: document.getElementById('keepOn').value }));
(async () => { fs.rmSync(DIR, { recursive: true, force: true });
  let { c, p } = await open(true); await mine(p);
  let l = await list(p); ok(l.length === 1 && /No named set-ups yet/.test(l[0]), 'A new phone: no named set-ups yet', l);
  await setKeep(p, 'always'); let n1 = await saveAs(p, 'Night watch'); ok(/Saved "Night watch"/.test(n1), 'Save as Night watch (screen kept on Always)', n1);
  await setKeep(p, 'off'); let n2 = await saveAs(p, 'Deliveries'); ok(/Saved "Deliveries"/.test(n2), 'Save as Deliveries (screen Off: the phone decides)', n2);
  l = await list(p); ok(l.length === 2 && /^Deliveries/.test(l[0]) && /^Night watch/.test(l[1]), 'The list shows both, by name, with the time saved', l);
  ok(!p.__errs.length, 'No script errors so far', p.__errs.slice(0, 2)); await c.close();
  /* close Route and the browser completely, then open it again */
  ({ c, p } = await open(false)); await mine(p); l = await list(p);
  ok(l.length === 2 && l.some(x => /^Night watch/.test(x)) && l.some(x => /^Deliveries/.test(x)), 'After closing and reopening: both set-ups still listed', l);
  for (const [name, want] of [['Night watch', 'always'], ['Deliveries', 'off'], ['Night watch', 'always']]) {
    await p.selectOption('#npList', name); await p.evaluate(() => document.getElementById('npLoad').click()); await p.waitForTimeout(300);
    await Promise.all([p.waitForEvent('load', { timeout: 120000 }), p.click('#npYes')]);
    await p.waitForFunction(() => document.getElementById('keepOn'), null, { timeout: 300000 }); await p.waitForTimeout(2000);
    const k = await keep(p); ok(k.store === want && k.ui === want, 'Load "' + name + '": Keep the screen on comes back as ' + want, k); await mine(p); }
  await c.close(); ({ c, p } = await open(false)); await mine(p);
  const k = await keep(p); ok(k.ui === 'always', 'Closed and reopened again: the loaded set-up is still in use', k);
  await p.selectOption('#npList', 'Deliveries'); await p.evaluate(() => document.getElementById('npDel').click()); await p.waitForTimeout(300); await p.click('#npYes'); await p.waitForTimeout(400);
  l = await list(p); ok(l.length === 1 && /^Night watch/.test(l[0]), 'Delete Deliveries: Night watch is left', l);
  await c.close(); ({ c, p } = await open(false)); await mine(p); l = await list(p); ok(l.length === 1 && /^Night watch/.test(l[0]), 'The delete holds after closing and reopening', l);
  ok(!p.__errs.length, 'No script errors', p.__errs.slice(0, 2)); await c.close();
  console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0); })();
