/* Probe (20 Nov 23:15, Stuart: "Test mode on + has unstable windows and jumping numbers"; Mark+, start screen, time to line and time to burn).
   Opens Mark+ test mode on a phone, then once a second records the start screen's figures and where each of its windows sits. */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8778';
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-rdetail', 'quick'); });
  const p = await c.newPage(); await p.goto(BASE + '/mark/'); await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(4000);
  await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x && x.offsetParent) x.click(); FSSolent.set({ wind: { twd: 230, tws: 12, src: 'typed', at: Date.now() }, tide: { mode: 'hand', spd: 1.0, dir: 248 } }); FSSolent.test(true); FSSolent.set({ startAt: Math.round(Date.now() / 1000 + 150) }); });
  await p.waitForTimeout(3000);
  const rows = [];
  for (let i = 0; i < 45; i++) {
    rows.push(await p.evaluate(() => {
      const ss = document.getElementById('solStartScr'), cells = {}; if (ss) ss.querySelectorAll('.sscell, .cell, [class*="cell"]').forEach(e => { const k = (e.querySelector('small, .k, .lab') || {}).textContent; if (k && /line|burn|SOG|Gun|Countdown/i.test(k)) cells[k.trim().slice(0, 14)] = e.innerText.replace(/\s+/g, ' ').slice(0, 40); });
      const box = id => { const e = document.getElementById(id); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); return r.width ? [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] : null; };
      return { t: Math.round(Date.now() / 1000) % 1000, cells, ss: box('solStartScr'), seq: box('solSeq'), rb: box('solRaceBtns'), live: box('liveBox'), txt: ss ? (ss.innerText.replace(/\s+/g, ' ').match(/TO THE LINE.{0,260}/) || [''])[0] : '', grid: ss ? [...ss.querySelectorAll('.sshd > *')].filter(e => e.getBoundingClientRect().width > 0).map(e => { const r = e.getBoundingClientRect(); return Math.round(r.x) + ',' + Math.round(r.y) + ',' + Math.round(r.width); }).join(' ') : '' };
    })); await p.waitForTimeout(1000);
  }
  rows.forEach(r => console.log(JSON.stringify(r))); await p.screenshot({ path: '/tmp/claude-0/assess/mpjit.png' }); await b.close();
})();
