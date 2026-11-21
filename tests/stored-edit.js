/* F101 (Stuart 21 Nov 07:31, 07:37 "go for your recommendation on the stored courses and do the edit"): an Edit button beside every
   stored race; an edit is your version of that race and opens whenever the race is chosen again (it used to come back as the stored
   course); Back to the published course unlinks it and keeps it under My races. Also the corrected Cowes Dinard St Malo course:
   Casquets, the whole of Guernsey and the whole of the Minquiers to port.
   Run: node tests/stored-edit.js http://localhost:8779 */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + d : '')); };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1200, height: 900 }, serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); }
    document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const settle = async () => { await p.waitForTimeout(1500); await p.evaluate(() => { ['spTourNo', 'wizX'].forEach(id => { const n = document.getElementById(id); if (n && n.offsetParent) n.click(); }); }); };
  await p.goto(BASE + '/channel-area/', { waitUntil: 'domcontentloaded', timeout: 120000 }); await p.waitForTimeout(9000); await settle();
  const pick = async id => { await p.evaluate(id => { const s = document.getElementById('raceSel'); s.value = id; s.dispatchEvent(new Event('change')); }, id); await p.waitForTimeout(2500); };
  const course = () => p.evaluate(() => { const c = window.__navCourse(); return c && { name: c.name, marks: c.marks.map(m => m.name + ' ' + m.lat.toFixed(4) + ' ' + m.side) }; });
  await pick('dinard'); const pub = await course();
  ok(pub && pub.marks.length === 4 && /Casquets.*port/.test(pub.marks[1]) && /Hanois.*port/.test(pub.marks[2]) && /Minquiers.*port/.test(pub.marks[3]), 'St Malo: Needles Fairway, then Casquets, Les Hanois (Guernsey) and the W Minquiers, all to port', pub && pub.marks.join(' / '));
  /* the RORC list: an Edit button beside every race */
  await p.evaluate(() => document.getElementById('raceBtn').click()); await p.waitForTimeout(300); await p.evaluate(() => document.getElementById('rmRorc').click()); await p.waitForTimeout(500);
  const ed = await p.evaluate(() => ({ races: document.querySelectorAll('#raceList [data-race]').length, edits: document.querySelectorAll('#raceList [data-redit]').length, malo: !!document.querySelector('#raceList [data-redit="dinard"]') }));
  ok(ed.edits > 0 && ed.edits === ed.races && ed.malo, 'An Edit button beside every stored race', ed.edits + ' of ' + ed.races);
  await p.click('#raceList [data-redit="dinard"]'); await p.waitForTimeout(800);
  ok(await p.evaluate(() => !document.getElementById('editBar').hidden), 'Edit opens the course on the chart for editing');
  /* the crew moves the Les Hanois mark a little west, in the list of marks, and saves */
  await p.click('#edDone'); await p.waitForTimeout(600);
  const laId = await p.evaluate(() => { const ins = [...document.querySelectorAll('#raceList input[id^="edLa"]')]; const i = ins.findIndex(x => Math.abs(parseFloat(x.value) - 49.435) < 0.01 || /49.?26/.test(x.value)); return ins[i] ? ins[i].id : null; });
  const loId = laId && laId.replace('edLa', 'edLo');
  const loV = loId && await p.evaluate(id => document.getElementById(id).value, loId);
  ok(!!loId, 'The mark list shows Les Hanois', laId + ' ' + loV);
  if (loId) { await p.evaluate(([id, v]) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }, [loId, /°/.test(loV) ? '002°45.00\'W' : '-2.75']); }
  await p.click('#edSave'); await p.waitForTimeout(3000);
  const rec = await p.evaluate(() => JSON.parse(localStorage.getItem('fs-myraces') || '[]').filter(x => x.raceId === 'dinard').map(x => ({ id: x.id, name: x.name, lo: x.course.marks[2] && x.course.marks[2].lon })));
  ok(rec.length === 1 && Math.abs(rec[0].lo + 2.75) < 0.01, 'The edit is kept as your version of the St Malo race', JSON.stringify(rec));
  /* another race, then St Malo again: your version opens, not the stored course */
  const other = await p.evaluate(async () => { const j = await (await fetch('../courses/rorc.json')).json(); const ids = j.races.filter(r => r.page === 'channel-area' && r.id !== 'dinard').map(r => r.id); return [...document.getElementById('raceSel').options].map(o => o.value).filter(v => ids.includes(v))[0]; });   /* a race on this same page */
  await pick(other); await pick('dinard'); let now = await course();
  const lonNow = await p.evaluate(() => window.__navCourse().marks[2].lon); ok(Math.abs(lonNow + 2.75) < 0.01, 'Choosing St Malo again opens your version', lonNow);
  ok(await p.evaluate(() => /Your course, edited/.test(document.getElementById('courseNote').textContent) && !!document.getElementById('yourPub')), 'It says it is your course, with Back to the published course');
  await p.evaluate(() => document.getElementById('raceBtn').click()); await p.waitForTimeout(300); await p.evaluate(() => document.getElementById('rmRorc').click()); await p.waitForTimeout(500);
  ok(await p.evaluate(() => { const b = document.querySelector('#raceList [data-race="dinard"]'); return !!b && /your course/i.test(b.closest('.ritem').textContent); }), 'The RORC list marks St Malo as your course');
  await p.evaluate(() => { document.getElementById('races').hidden = true; });
  /* a reload keeps your version */
  await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(9000); await settle();
  ok(await p.evaluate(() => { const c = window.__navCourse(); return !!c && Math.abs(c.marks[2].lon + 2.75) < 0.01; }), 'After a Reload it is still your version');
  /* back to the published course */
  await p.evaluate(() => { const b = document.getElementById('yourPub'); if (b) b.click(); }); await p.waitForTimeout(2500);
  const back = await p.evaluate(() => ({ lon: window.__navCourse().marks[2].lon, mine: JSON.parse(localStorage.getItem('fs-myraces') || '[]').map(x => ({ n: x.name, r: x.raceId })) }));
  ok(Math.abs(back.lon + 2.70233) < 0.001, 'Back to the published course puts the stored course back', back.lon);
  ok(back.mine.length === 1 && back.mine[0].r == null && /your version/.test(back.mine[0].n), 'Your version is kept under My races, no longer opened for the race', JSON.stringify(back.mine));
  await pick(other); await pick('dinard');
  ok(await p.evaluate(() => Math.abs(window.__navCourse().marks[2].lon + 2.70233) < 0.001), 'Choosing St Malo again now opens the published course');
  ok(!!other, 'Another race on the same page to switch to', other);
  ok(errs.length === 0, 'No script errors', errs.slice(0, 3).join(' ; '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
