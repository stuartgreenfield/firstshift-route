/* F102 (Stuart 21 Nov 07:33: "work out the power consumption of the app ... does not eat into phones or pads battery when not charging and will
   it idle when not used"): what the page does each minute: main-thread busy time, timers, network requests, and whether the screen is held on.
   Run: node tests/power-probe.js http://localhost:8779 [/channel-area/] */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779', PAGE = process.argv[3] || '/channel-area/';
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 14'], serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); }
    document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); });
    const fx = () => ({ coords: { latitude: 50.70, longitude: -1.45, accuracy: 6, speed: 3, heading: 240, altitude: null, altitudeAccuracy: null }, timestamp: Date.now() });
    const g = { getCurrentPosition: ok => setTimeout(() => ok(fx()), 50), watchPosition: ok => setInterval(() => ok(fx()), 1000), clearWatch: id => clearInterval(id) }; Object.defineProperty(navigator, 'geolocation', { get: () => g });
    window.__wl = 0; try { navigator.wakeLock = { request: () => { window.__wl++; return Promise.resolve({ release: () => { window.__wl--; return Promise.resolve(); }, addEventListener() {} }); } }; } catch (e) {}
    const si = window.setInterval; window.__iv = []; window.setInterval = function (f, ms) { window.__iv.push(ms); return si.apply(this, arguments); }; });
  const p = await c.newPage(); const cdp = await c.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await cdp.send('Performance.enable');
  let reqs = 0; p.on('request', () => reqs++);
  await p.goto(BASE + PAGE, { timeout: 120000 }); await p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); return f && !f.running && f.sel; }, null, { timeout: 400000 }).catch(() => null); await p.waitForTimeout(5000);
  const measure = async (label, ms) => { const m0 = await cdp.send('Performance.getMetrics'), r0 = reqs; await p.waitForTimeout(ms); const m1 = await cdp.send('Performance.getMetrics'); const g = (m, k) => (m.metrics.find(x => x.name === k) || {}).value || 0;
    const busy = g(m1, 'TaskDuration') - g(m0, 'TaskDuration'), script = g(m1, 'ScriptDuration') - g(m0, 'ScriptDuration'), layout = g(m1, 'LayoutDuration') - g(m0, 'LayoutDuration'), paint = g(m1, 'RecalcStyleDuration') - g(m0, 'RecalcStyleDuration');
    const wl = await p.evaluate(() => window.__wl); console.log(label + ': main thread busy ' + (busy / (ms / 1000) * 100).toFixed(1) + '% (script ' + script.toFixed(2) + ' s, layout ' + layout.toFixed(2) + ' s, style ' + paint.toFixed(2) + ' s in ' + ms / 1000 + ' s), ' + (reqs - r0) + ' network requests, screen held on: ' + (wl > 0 ? 'yes' : 'no')); };
  await measure('Idle on the chart, GPS off', 60000);
  await p.click('#liveBtn'); await p.waitForTimeout(3000);
  await measure('GPS on, chart following', 60000);
  console.log('timers set: ' + JSON.stringify((await p.evaluate(() => window.__iv)).reduce((a, x) => { a[x] = (a[x] || 0) + 1; return a; }, {})));
  await b.close(); })();
