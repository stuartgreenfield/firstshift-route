/* Stuart 22 Nov 06:28 screenshot: on the start screen the gun time ran under the Opens label. Checks no two pieces of the top line overlap
   on phone and tablet widths. Run: node tests/ss-topline.js http://localhost:8779 [path] */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779', PATH = process.argv[3] || '/mark/';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch();
  for (const [dn, d] of [['iPhone 13', devices['iPhone 13']], ['iPhone SE', devices['iPhone SE']], ['Pixel 7', devices['Pixel 7']], ['Tablet', { viewport: { width: 820, height: 1180 } }]]) {
    const c = await b.newContext({ ...d, serviceWorkers: 'block' }); await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
    await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-coach-mute'].forEach(k => localStorage.setItem(k, '1')); });
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + PATH);
    await p.waitForFunction(() => window.FSSolent && window.__navFc && window.__navFc().P && document.getElementById('solCardT'), null, { timeout: 300000 }); await p.waitForTimeout(1500);
    await p.evaluate(() => document.getElementById('solCardT').click()); await p.waitForFunction(() => { const s = document.getElementById('solStartScr'); return s && !s.hidden && s.querySelector('.ssg').textContent; }, null, { timeout: 200000 }); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => { const hd = document.querySelector('#solStartScr .sshd'); const kids = [...hd.children].filter(x => x.offsetParent && x.getBoundingClientRect().width > 0); const g = hd.querySelector('.ssg');
      const rng = document.createRange(); rng.selectNodeContents(g); const gr = rng.getBoundingClientRect(); const bad = [];
      const rs = kids.map(x => ({ n: x.className || x.tagName, r: x === g ? gr : x.getBoundingClientRect() }));
      for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const a = rs[i].r, q = rs[j].r; if (a.left < q.right - 1 && q.left < a.right - 1 && a.top < q.bottom - 1 && q.top < a.bottom - 1) bad.push(rs[i].n + ' / ' + rs[j].n); }
      return { bad, gun: g.textContent, inside: gr.right <= hd.getBoundingClientRect().right + 1 }; });
    ok(!r.bad.length && r.inside, dn + ': start screen top line, nothing overlaps and the gun time fits', r);
    await p.screenshot({ path: '/tmp/claude-0/-home-claude/abeaea36-9130-5b0e-8b05-be1641b6b08c/scratchpad/ss-top-' + dn.replace(/ /g, '') + '.jpg', type: 'jpeg', quality: 70 });
    ok(!errs.length, dn + ': no script errors', errs.slice(0, 2)); await c.close(); }
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
