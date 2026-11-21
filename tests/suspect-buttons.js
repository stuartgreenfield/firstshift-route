/* Follow-up to every-button.js (21 Nov): presses the buttons where the crawl saw no change on screen, one at a time from a set
   starting point, and records what each one did (text, panels, files, windows), with a picture before and after.
   Run: node tests/suspect-buttons.js <url> <phone|tablet> <name> */
const { chromium, devices } = require('playwright'); const fs = require('fs');
const URL0 = process.argv[2], DV = process.argv[3] || 'phone', NAME = process.argv[4] || 'suspect';
const OUT = '/tmp/claude-0/buttons/suspect-' + NAME; fs.mkdirSync(OUT, { recursive: true });
/* [button, what to open first] */
const CASES0 = [
  ['#fsTryTour', () => { const b = document.getElementById('helpBtn'); b && b.click(); }],
  ['#fsTryFilm', () => { const b = document.getElementById('helpBtn'); b && b.click(); }],
  ['#myBoat', () => { const b = document.getElementById('setBtn'); b && b.click(); }],
  ['#boatPick', () => { const b = document.getElementById('setBtn'); b && b.click(); }],
  ['#shareCopy', () => { const b = document.getElementById('shareBtn') || document.querySelector('[data-share]'); b && b.click(); }],
  ['#run', () => { const b = document.getElementById('setBtn'); b && b.click(); }],
  ['#ensRun', () => {}], ['#depRun', () => {}], ['#suRoute', () => {}],
  ['#askRow button[data-q=tack]', () => {}],
  ['#solRaceBtns button[data-rb=stop]', () => {}],
]; const CASES = CASES0.slice(+(process.env.FROM || 0));
(async () => { const b = await chromium.launch();
  const ctx = await b.newContext({ ...(DV === 'phone' ? devices['Pixel 7'] : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 }), serviceWorkers: 'block', permissions: ['geolocation', 'clipboard-read', 'clipboard-write'], geolocation: { latitude: 50.76, longitude: -1.29 } });
  await ctx.route(/open-meteo|googleapis|openseamap|wa\.me|claude\.ai|firstshiftsailing\.com/, r => r.fulfill({ status: 200, body: '' }));
  await ctx.addInitScript(() => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart', 'fs-coach-mute'].forEach(k => localStorage.setItem(k, '1')); });
  const out = [];
  for (const [sel, pre] of CASES) {
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); let pops = 0; const onPop = () => pops++; ctx.on('page', onPop); let dl = 0; p.on('download', () => dl++);
    await p.evaluate(() => sessionStorage.clear()).catch(() => {});
    await p.goto(URL0); await p.waitForFunction(() => window.__navFc && window.__navFc().P && window.__navFc().sel, null, { timeout: 600000 }).catch(() => null); await p.waitForTimeout(2500);
    await p.evaluate(() => { const n = document.getElementById('spTourNo'); if (n && n.offsetParent) n.click(); });
    await p.evaluate(pre); await p.waitForTimeout(1200);
    const has = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return 'not in page'; if (e.tagName === 'SELECT') return 'select with ' + e.options.length + ' choices'; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return r.width > 1 && !e.closest('[hidden]') ? 'visible' : 'hidden'; }, sel);
    if (has !== 'visible') { out.push({ sel, result: has }); ctx.off('page', onPop); await p.close(); continue; }
    const t0 = await p.evaluate(() => document.body.innerText.replace(/[0-9]/g, ''));
    await p.screenshot({ path: `${OUT}/${sel.replace(/[^a-z]/gi, '')}-1.jpg`, type: 'jpeg', quality: 60 });
    await p.click(sel, { timeout: 5000 }).catch(e => errs.push('click: ' + e.message.split('\n')[0]));
    await p.waitForTimeout(2500);
    const t1 = await p.evaluate(() => document.body.innerText.replace(/[0-9]/g, ''));
    const added = t1.split('\n').filter(l => l.trim() && !t0.includes(l)).slice(0, 4), gone = t0.split('\n').filter(l => l.trim() && !t1.includes(l)).slice(0, 3);
    const clip = await p.evaluate(() => navigator.clipboard.readText().catch(() => '')).catch(() => '');
    await p.screenshot({ path: `${OUT}/${sel.replace(/[^a-z]/gi, '')}-2.jpg`, type: 'jpeg', quality: 60 });
    out.push({ sel, added, gone, windows: pops, files: dl, clip: (clip || '').slice(0, 60), errs });
    console.log(JSON.stringify(out[out.length - 1]));
    ctx.off('page', onPop); await p.close();
  }
  fs.writeFileSync(OUT + '/result.json', JSON.stringify(out, null, 1)); await b.close(); })();
