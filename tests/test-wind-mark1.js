/* Stuart 22 Nov 06:31: in test mode, with a course of the crew's own, the wind blows from the first mark so the start is a beat;
   with no course of their own the race's wind (forecast or typed) is kept. Run: node tests/test-wind-mark1.js http://localhost:8779 [path] */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779', PATH = process.argv[3] || '/mark/';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
const R = Math.PI / 180, brg = (a, b) => { const k = Math.cos(a.lat * R); return (Math.atan2((b.lon - a.lon) * k, b.lat - a.lat) / R + 360) % 360; }, adiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
(async () => { const b = await chromium.launch();
  for (const [name, setup, want] of [
    ['own course, first mark to the west, wind 058 typed', { type: 'marks', marks: [{ code: null, name: 'West test', lat: 50.7700, lon: -1.4000, side: 'port' }, { code: null, name: 'East test', lat: 50.7850, lon: -1.2500, side: 'port' }], fin: 'start', finish: null, wind: { twd: 58, tws: 20, src: 'hand' } }, 'mark1'],
    ['no course of its own, wind 058 typed', { type: 'marks', marks: [], wind: { twd: 58, tws: 20, src: 'hand' } }, 58]]) {
    const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
    await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
    await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-coach-mute'].forEach(k => localStorage.setItem(k, '1')); });
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + PATH);
    await p.waitForFunction(() => window.FSSolent && FSSolent.accSet && window.__navFc && window.__navFc().P && document.getElementById('solCardT'), null, { timeout: 300000 }); await p.waitForTimeout(1500);
    await p.evaluate(o => FSSolent.accSet(o), setup); await p.evaluate(() => document.getElementById('solCardT').click()); await p.waitForTimeout(3000);
    const r = await p.evaluate(() => { const l = window.__fsLine(); const bar = (document.querySelector('#solTestBar, .soltest') || {}).innerText || ''; const m = (bar.match(/(\d{3})°\s+\d+\s*kn/) || [])[1]; return { line: l, bar: bar.replace(/\s+/g, ' ').slice(0, 80), tw: m ? +m : null }; });
    const mid = r.line && r.line.boat ? { lat: (r.line.boat[0] + r.line.pin[0]) / 2, lon: (r.line.boat[1] + r.line.pin[1]) / 2 } : null;
    const exp = want === 'mark1' ? brg(mid, setup.marks[0]) : want;
    ok(r.tw != null && adiff(r.tw, exp) <= 6, name + ': test wind ' + (want === 'mark1' ? 'from the first mark' : 'kept') + ' (shifts up to a few degrees allowed)', { got: r.tw, want: Math.round(exp), bar: r.bar });
    if (mid) { const ld = brg({ lat: r.line.pin[0], lon: r.line.pin[1] }, { lat: r.line.boat[0], lon: r.line.boat[1] }); ok(adiff(adiff(ld, exp), 90) <= 8, name + ': line about square to that wind', { line: Math.round(ld), wind: Math.round(exp) }); }
    ok(!errs.length, name + ': no script errors', errs.slice(0, 2)); await c.close(); }
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
