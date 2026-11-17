/* Screen pictures for Mark's Help topics (M50, Stuart 17 Nov 2026). Drives Mark (and Mark+) into each state and saves
   <out>/<topic slug>.png; tools/helpmedia_webp.py turns them into WebP in helpmedia/shots/.
   Run: node tools/markhelp_shots.js <out folder> [mark base] [markplus base] */
const { chromium } = require('playwright'); const fs = require('fs');
const OUT = process.argv[2] || '/tmp/claude-0/ui/markshots', MB = process.argv[3] || 'http://localhost:8779', PB = process.argv[4] || 'http://localhost:8778';
fs.mkdirSync(OUT, { recursive: true });
const VIEW = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, hasTouch: true, serviceWorkers: 'block', geolocation: { latitude: 50.7690, longitude: -1.2960, accuracy: 5 }, permissions: ['geolocation'] };
const done = [], miss = [];
async function open(b, base) {
  const c = await b.newContext(VIEW);
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); });
  const p = await c.newPage(); await p.goto(base + '/mark/');
  await p.waitForFunction(() => window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(3000);
  await tidy(p);
  return { c, p };
}
async function tidy(p) { await p.evaluate(() => { try { window.__fsPanelClose && window.__fsPanelClose(); } catch (e) {} try { window.__fsFitBox && window.__fsFitBox(50.738, 50.790, -1.42, -1.25); } catch (e) {} }); await p.waitForTimeout(600); }
async function shot(p, slug) { try { await p.waitForTimeout(500); await p.screenshot({ path: OUT + '/' + slug + '.png' }); done.push(slug); } catch (e) { miss.push(slug + ': ' + e.message.slice(0, 80)); } }
async function step(p, f, slug) { try { await f(); await shot(p, slug); } catch (e) { miss.push(slug + ': ' + e.message.slice(0, 100)); } }
const next = p => p.click('#solStep [data-k="next"]').then(() => p.waitForTimeout(500));
const tapAt = async (p, la, lo) => { const q = await p.evaluate(([a, o]) => window.__fsXY(a, o), [la, lo]); await p.mouse.click(q[0], q[1]); await p.waitForTimeout(400); };
const closeCard = p => p.evaluate(() => { const x = document.getElementById('solCardX'); if (x && x.offsetParent) x.click(); });
(async () => { const b = await chromium.launch();
  /* ---- Mark: the card, round the cans, the course card ---- */
  let { c, p } = await open(b, MB);
  await shot(p, 'start-new-race'); await shot(p, 'sec-mstart'); await shot(p, 'your-first-race');
  await step(p, async () => { await p.click('#solCardStored').catch(() => {}); await p.waitForTimeout(800); }, 'stored-races');
  await p.evaluate(() => { const r = document.getElementById('races'); if (r) r.hidden = true; if (window.FSSolent.start) FSSolent.start(); });
  await p.evaluate(() => { try { FSSolent.showList && 0; } catch (e) {} });
  await p.evaluate(() => { if (document.getElementById('solCardM')) document.getElementById('solCardM').click(); }); await p.waitForTimeout(800);
  await shot(p, 'route-this-race-or-not'); await shot(p, 'sec-mcourse');
  await step(p, async () => { await p.fill('#solTwd', '230').catch(() => {}); await p.press('#solTwd', 'Tab').catch(() => {}); }, 'the-wind');
  await next(p); await p.click('#solStep [data-k="lclr"]').catch(() => {});
  await step(p, async () => { await tapAt(p, 50.7700, -1.2950); }, 'set-the-start-line');
  await tapAt(p, 50.7700, -1.2895); await shot(p, 'sec-mline'); await shot(p, 'line-check');
  await next(p);
  for (const [id, sd] of [['3F', 'port'], ['2C', 'stbd']]) { await p.fill('#solCode', id).catch(() => {}); await p.click('#solStep [data-k="code"][data-v="' + sd + '"]').catch(() => {}); await p.waitForTimeout(300); }
  await shot(p, 'round-the-cans');
  for (let z = 0; z < 4; z++) { if (await p.evaluate(() => FSSolent.stepState && FSSolent.stepState().key) === 'check') break; await next(p); }
  await shot(p, 'check-the-course');
  await p.click('#solStep [data-k="go"]').catch(() => {}); await p.waitForTimeout(2500); await tidy(p);
  await shot(p, 'line-bias-and-the-favoured-end');
  await step(p, async () => { await p.evaluate(() => FSSolent.showList && FSSolent.showList()); await p.waitForTimeout(800); }, 'the-course-card');
  await shot(p, 'getting-up-to-speed'); await shot(p, 'a-series-of-starts');
  await p.evaluate(() => { const l = document.getElementById('solLegs'); if (l) l.hidden = true; });
  await c.close();
  /* ---- Mark: windward-leeward ---- */
  ({ c, p } = await open(b, MB));
  await p.evaluate(() => document.getElementById('solCardW').click()); await p.waitForTimeout(800);
  await shot(p, 'the-tide');
  await next(p); await shot(p, 'windward-leeward');
  await c.close();
  /* ---- Mark: test mode, the start, the race ---- */
  ({ c, p } = await open(b, MB));
  await closeCard(p);
  await p.evaluate(() => { FSSolent.set({ wind: { twd: 230, tws: 12, src: 'typed', at: Date.now() }, tide: { mode: 'hand', spd: 1.0, dir: 248 } }); FSSolent.test(true); }); await p.waitForTimeout(2500); await tidy(p);
  await shot(p, 'test-mode'); await shot(p, 'the-practice-race-with-emma'); await shot(p, 'what-mark-does');
  await p.evaluate(() => { FSSolent.set({ startAt: Math.round(Date.now() / 1000 + 100) }); if (window.__fsGun) window.__fsGun(FSSolent.state().startAt); FSSolent.showList(); }); await p.waitForTimeout(800); await p.click('[data-k="nxnow"]').catch(() => {}); await p.waitForTimeout(3000);
  await shot(p, 'the-start-screen'); await shot(p, 'sec-mgun'); await shot(p, 'time-to-line-and-time-to-burn'); await shot(p, 'the-ladder-rung');
  await p.evaluate(() => { const b = [...document.querySelectorAll('#solStartScr button')].find(x => x.textContent.trim() === 'Chart'); if (b) b.click(); }); await p.waitForTimeout(800);
  await shot(p, 'the-start-sequence'); await shot(p, 'sync-and-the-minute-buttons'); await shot(p, 'ping-the-ends');
  await p.evaluate(() => { FSSolent.set({ startAt: Math.round(Date.now() / 1000 + 3) }); if (window.__fsGun) window.__fsGun(FSSolent.state().startAt); }); await p.waitForTimeout(9000); await tidy(p);
  await shot(p, 'general-recall'); await shot(p, 'the-next-mark'); await shot(p, 'sec-mrace'); await shot(p, 'laylines-and-the-tide'); await shot(p, 'header-or-lift'); await shot(p, 'the-time-slider-folds-away');
  await step(p, async () => { await p.click('#solCC'); await p.waitForTimeout(900); }, 'course-change');
  await p.evaluate(() => { const l = document.getElementById('solLegs'); if (l) l.hidden = true; });
  await shot(p, 'the-finish'); await shot(p, 'sec-mfin');
  await step(p, async () => { await p.evaluate(() => FSSolent.start && FSSolent.start()); await p.waitForTimeout(800); }, 'stop-race-and-start-new-race');
  await c.close();
  /* ---- Mark: settings share ---- */
  ({ c, p } = await open(b, MB)); await closeCard(p);
  await step(p, async () => { await p.click('#setBtn').catch(() => {}); await p.waitForTimeout(900); }, 'the-crew-in-step');
  await c.close();
  /* ---- Mark+ ---- */
  try {
    ({ c, p } = await open(b, PB)); await closeCard(p);
    await shot(p, 'mark-and-mark');
    await p.evaluate(() => { FSSolent.set({ wind: { twd: 230, tws: 12, src: 'typed', at: Date.now() }, tide: { mode: 'hand', spd: 1.0, dir: 248 } }); FSSolent.test(true); }); await p.waitForTimeout(2000);
    await p.evaluate(() => { FSSolent.set({ startAt: Math.round(Date.now() / 1000 + 100) }); if (window.__fsGun) window.__fsGun(FSSolent.state().startAt); FSSolent.showList(); }); await p.waitForTimeout(800); await p.click('[data-k="nxnow"]').catch(() => {}); await p.waitForTimeout(5000);
    await shot(p, 'instruments-on-the-start-screen'); await shot(p, 'sec-mplus');
    await p.evaluate(() => { const b = [...document.querySelectorAll('#solStartScr button')].find(x => x.textContent.trim() === 'Chart'); if (b) b.click(); FSSolent.showList && FSSolent.showList(); }); await p.waitForTimeout(900);
    await shot(p, 'learning-your-boat');
    await c.close();
    ({ c, p } = await open(b, PB));
    await p.evaluate(() => document.getElementById('solCardW').click()); await p.waitForTimeout(800); await shot(p, 'wind-and-tide-from-the-boat');
    await c.close();
  } catch (e) { miss.push('markplus: ' + e.message.slice(0, 100)); }
  console.log(done.length + ' shots', JSON.stringify(miss)); await b.close(); })();
