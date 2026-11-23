/* All the buoys: a tap on Port or Stbd says so where you are looking (Stuart 23 Nov 07:20, iPhone photo: "When you tap port or starboard
   there is no acknowledgement on the screen although the mark is added"). node tests/list-ack.js [base] */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else { fail++; console.log('FAIL ' + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); } };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 14 Plus'], serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/mark/'); await p.waitForFunction(() => window.FSSolent && FSSolent.start && window.__fsRedraw, null, { timeout: 300000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => { const s = document.getElementById('solCard'); if (s) s.hidden = true; FSSolent.chain(true); }); await p.waitForTimeout(1200);
  await p.evaluate(() => document.querySelector('#solChain [data-k="list"]').click()); await p.waitForFunction(() => document.querySelectorAll('#solListB [data-add]').length > 20, null, { timeout: 60000 });
  const before = await p.evaluate(() => FSSolent.state().marks.length);
  // scroll well down, as Stuart had, then tap Port on 3D Salt Mead
  await p.evaluate(() => document.querySelector('#solListB [data-add="3D"]').scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
  await p.tap('#solListB [data-add="3D"][data-side="port"]'); await p.waitForTimeout(500);
  const r = await p.evaluate(() => { const row = document.querySelector('#solListB [data-add="3D"]').closest('.sollr'), R = row.getBoundingClientRect(), n = document.getElementById('solListN').getBoundingClientRect(), pb = row.querySelector('[data-side="port"]');
    return { marks: FSSolent.state().marks.length, lit: row.classList.contains('solladd'), txt: row.innerText.replace(/\s+/g, ' '), inView: R.top >= 0 && R.bottom <= innerHeight, pressed: pb.getAttribute('aria-pressed'), btn: pb.innerText, head: document.getElementById('solListN').innerText, headView: n.top >= 0 && n.bottom <= innerHeight && n.height > 0 }; });
  ok(r.marks === before + 1, 'the mark is added', [before, r.marks]);
  ok(r.lit && r.inView, 'the tapped row lights up, still in view (the list does not jump)', r);
  ok(/Added: mark \d+, Port/.test(r.txt), 'the row says it went in: Added: mark N, Port', r.txt);
  ok(r.pressed === 'true' && /✓/.test(r.btn), 'the Port button shows a tick', r.btn);
  ok(r.headView && /3D P/.test(r.head), 'the course line stays pinned in sight and includes 3D P', r.head);
  await p.tap('#solListB [data-add="3G"][data-side="stbd"]').catch(async () => { await p.evaluate(() => document.querySelector('#solListB [data-add="3G"][data-side="stbd"]').click()); }); await p.waitForTimeout(500);
  const r2 = await p.evaluate(() => ({ d: document.querySelector('#solListB [data-add="3D"]').closest('.sollr').innerText.replace(/\s+/g, ' '), g: document.querySelector('#solListB [data-add="3G"]').closest('.sollr').className }));
  ok(/In the course: mark \d+, Port/.test(r2.d) && /solladd/.test(r2.g), 'the next tap moves the highlight; 3D still says it is in the course', r2);
  await p.evaluate(() => document.querySelector('#solChain [data-k="undo"]') && document.querySelector('#solChain [data-k="undo"]').click()); await p.waitForTimeout(400);
  const r3 = await p.evaluate(() => ({ g: document.querySelector('#solListB [data-add="3G"]').closest('.sollr').innerText.replace(/\s+/g, ' '), n: FSSolent.state().marks.length }));
  ok(!/In the course|Added/.test(r3.g), 'Undo takes 3G off and the list follows', r3);
  if (process.env.SHOT) { await p.evaluate(() => document.querySelector('#solListB [data-add="3D"]').scrollIntoView({ block: 'center' })); await p.screenshot({ path: process.env.SHOT }); }
  ok(!errs.length, 'no script errors', errs);
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
