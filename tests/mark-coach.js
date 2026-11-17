const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const c = await b.newContext({ ...devices['Galaxy Tab S4'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate());
    const P = HTMLMediaElement.prototype.play; window.__played = []; HTMLMediaElement.prototype.play = function () { window.__played.push(this.src.split('/').pop()); return P.call(this).catch(() => {}); }; });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && window.FSTour && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(4000);
  console.log('card button', await p.evaluate(() => !!document.getElementById('mkCoachBtn')), 'levels', await p.evaluate(() => FSTour.levels().map(l => l.n + ' ' + l.name)));
  await p.click('#mkCoachBtn'); await p.waitForTimeout(2500); const out = [];
  for (let i = 0; i < 12; i++) { const s = await p.evaluate(() => { const h = document.querySelector('.fst-hole'), r = h && h.getBoundingClientRect(), f = document.querySelector('.fst'); return { hole: r ? Math.round(r.width) + 'x' + Math.round(r.height) : null, txt: f ? f.innerText.split('\n').slice(0, 2).join(' / ').slice(0, 60) : '' }; }); out.push(s);
    if (i === 4) await p.screenshot({ path: '/tmp/claude-0/ui/coach5.png' }); if (i === 7) await p.screenshot({ path: '/tmp/claude-0/ui/coach8.png' });
    const nx = await p.$('[data-fst="next"]'); if (!nx) break; const last = await nx.textContent(); await nx.click(); await p.waitForTimeout(3200); if (/Finish/.test(last)) break; }
  console.log(out.map(o => o.hole + ' ' + o.txt).join('\n')); console.log('played', await p.evaluate(() => window.__played)); console.log(errs); await b.close(); })();
