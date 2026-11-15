/* Screenshots for the Help topics added overnight 15 to 16 Nov (tracks, Astro, tide gate, Solent on the chart, tide by hand, bow
   offset; Navigate: tactician, internet and Starlink). Tablet-sized. Run: node tools/helpmedia_shots_new.js <out png folder> <route base> <navigate base> */
const { chromium } = require('playwright'); const OUT = process.argv[2];
const W = 1280, H = 800, FULL = { x: 0, y: 0, width: W, height: H };
async function open(b, base, nav) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, serviceWorkers: 'block', geolocation: { latitude: 50.7665, longitude: -1.3000 }, permissions: ['geolocation'] });
  await ctx.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('t')) return; sessionStorage.setItem('t', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); localStorage.setItem('fs-panel', 'closed');
    const t0 = Date.now() - 3 * 3600000, tr = []; for (let i = 0; i < 360; i++) tr.push([+(50.70 - i * 0.0003).toFixed(5), +(-1.35 - i * 0.004).toFixed(5), t0 + i * 30000, 6.5]); localStorage.setItem('fs-livetrail', JSON.stringify(tr)); });
  const p = await ctx.newPage(); p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto(base + '/channel-area/?race=morgan');
  await p.waitForFunction(() => document.querySelectorAll('#finBox *').length > 2, null, { timeout: 300000 }).catch(() => {});
  await p.waitForFunction(() => ![...document.querySelectorAll('body *')].some(e => e.children.length === 0 && e.offsetParent && /Working out|refining the routes|Loading forecasts/i.test(e.textContent)), null, { timeout: 400000, polling: 2000 }).catch(() => {});
  await p.waitForTimeout(2500);
  await p.evaluate(() => { const e = [...document.querySelectorAll('div')].filter(d => /^Check against the sailing instructions/.test(d.textContent.trim())).pop(); if (e) e.style.display = 'none'; });
  return p;
}
(async () => {
  const b = await chromium.launch();
  let p = await open(b, process.argv[3]);
  const shot = async (name, clip) => { await p.waitForTimeout(900); await p.screenshot({ path: OUT + '/' + name + '.png', clip: clip || FULL }); console.log('shot', name); };
  const rect = (sel, pad) => p.evaluate(a => { const e = document.querySelector(a[0]); if (!e) return null; const r = e.getBoundingClientRect(), d = a[1] == null ? 8 : a[1]; const x = Math.max(0, r.left - d), y = Math.max(0, r.top - d); return { x, y, width: Math.min(innerWidth - x, r.width + 2 * d), height: Math.min(innerHeight - y, r.height + 2 * d) }; }, [sel, pad]);
  const closeAll = () => p.evaluate(() => { document.querySelectorAll('.sheet,#tip,#shareBox,#astroPop,#tgPop,#trkCard').forEach(e => { e.hidden = true; }); });
  const settings = async (tab, scrollTo) => { await closeAll(); await p.evaluate(() => document.getElementById('setBtn').click()); await p.waitForTimeout(600); await p.click('#sheet .stabs .tab[data-s="' + tab + '"]'); await p.waitForTimeout(1200); if (scrollTo) await p.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'start' }); }, scrollTo); await p.waitForTimeout(400); return rect('#sheet .in', 0); };
  /* Live GPS with the trail, then File track: the card, and My tracks */
  await p.evaluate(() => document.getElementById('liveBtn').click()); await p.waitForTimeout(3000);
  await shot('start-line-and-bow-offset');
  await p.evaluate(() => { const f = document.getElementById('lvFile'); if (f) f.click(); }); await p.waitForTimeout(800);
  let r = await settings('charts', '#trkList'); await p.evaluate(() => { const i = document.querySelector('#trkList input[data-k="show"]'); if (i && !i.checked) i.click(); }); await shot('my-tracks', r);
  await p.evaluate(() => document.getElementById('liveBtn').click()); await p.waitForTimeout(600);
  r = await settings('boat', '#adjTdir'); await p.evaluate(() => { const e = document.getElementById('adjTdir'); e.value = 30; e.oninput(); const t = document.getElementById('adjTspd'); t.value = 20; t.oninput(); }); await p.evaluate(() => document.getElementById('adjWdir').closest('.row').scrollIntoView({ block: 'start' })); await shot('tide-by-hand', r);
  await p.evaluate(() => document.getElementById('adjReset').click());
  await closeAll(); await p.evaluate(() => FSAstro.open(true)); await p.waitForTimeout(800); r = await rect('#astroPop', 6); await shot('astro', r);
  await closeAll(); await p.evaluate(async () => { await FSSolent.load(); FSSolent.on(true); const M = id => FSSolent.marks().find(x => x.id === id); const s = M('3G'); FSSolent.set({ type: 'marks', start: { code: '3G', name: '3G ' + s.name, lat: s.lat, lon: s.lon }, marks: ['2C', '3F', '2L'].map((id, i) => { const m = M(id); return { code: id, name: id + ' ' + m.name, lat: m.lat, lon: m.lon, side: i % 2 ? 'stbd' : 'port' }; }) }); window.__navViewSet({ la: 50.765, lo: -1.33, s: 4200, follow: false }); FSSolent.chain(true); });
  await p.waitForTimeout(1500); await shot('solent-races-on-the-chart');
  await p.evaluate(() => { const bar = document.getElementById('solChain'); if (bar) bar.hidden = true; FSSolent.on(false); }); await p.context().close();
  /* Navigate: tide gate, tactician, internet chip */
  p = await open(b, process.argv[4]);
  await p.evaluate(() => window.__navPractice && window.__navPractice(true, 20)); await p.waitForTimeout(8000);
  await p.evaluate(() => { window.FSTideGate.C.rivals = [{ name: 'Rival One', tcc: 1.05 }]; FSTideGate.open(true); }); await p.waitForTimeout(2500); r = await rect('#tgPop', 6); await shot('tide-gate', r);
  await closeAll(); await p.evaluate(() => { NavTact.clear(); const t = Date.now(); for (let i = 200; i > 1; i--) NavTact.push({ t: t - i * 5000, d: 220 + Math.sin(i / 11) * 4, s: 12, a: 40 }); NavTact.push({ t: t - 3000, d: 229, s: 12, a: 40 }); if (window.FSSolent) FSSolent.on(true); document.getElementById('fsDeckBtn').click(); }); await p.waitForTimeout(1200);
  await p.evaluate(() => { if (!document.getElementById('tcView') || document.getElementById('tcView').hidden) { for (let i = 0; i < 6 && !/Tactician/.test(document.getElementById('dkView').textContent); i++) document.getElementById('dkView').click(); } }); await p.waitForTimeout(1500); await shot('tactician');
  await p.evaluate(() => { document.getElementById('fsDeckBtn').click(); if (window.FSSolent) FSSolent.on(false); }); await p.waitForTimeout(500);
  await p.evaluate(() => document.getElementById('navBoatBtn').click()); await p.waitForTimeout(2200); await p.evaluate(() => { const s = document.getElementById('navNetSec'); if (s) s.scrollIntoView({ block: 'start' }); }); await p.waitForTimeout(400);
  r = await rect('#navPanel', 0) || await rect('.navpanel', 0) || FULL; await shot('internet-and-starlink', r);
  console.log('done'); await b.close();
})().catch(e => { console.error(e); process.exit(2); });
