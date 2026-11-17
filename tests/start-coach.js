/* M68: the start coach speaks the countdown, time to burn and the line in test mode; the slider sets how much */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const c = await b.newContext({ ...devices['Galaxy Tab S4'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-coach-level', '4');
    const P = HTMLMediaElement.prototype.play; window.__played = []; HTMLMediaElement.prototype.play = function () { window.__played.push(Math.round((window.FSSolent && FSSolent.state().startAt ? FSSolent.state().startAt - Date.now() / 1000 : 0)) + ':' + this.src.split('/').pop().split('-')[0]); return P.call(this).catch(() => {}); }; });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && window.FSStartCoach && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(3000);
  await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x && x.offsetParent) x.click(); FSSolent.set({ wind: { twd: 230, tws: 12, src: 'typed', at: Date.now() }, tide: { mode: 'hand', spd: 1.0, dir: 248 } }); FSSolent.test(true); });
  await p.waitForTimeout(2500);
  await p.evaluate(() => { FSSolent.set({ startAt: Math.round(Date.now() / 1000 + 75) }); if (window.__fsGun) window.__fsGun(FSSolent.state().startAt); });
  await p.waitForTimeout(6000);
  const btn = await p.evaluate(() => { const b = document.querySelector('#solStartScr .sscoach'); return b ? b.textContent + ' | ' + b.title : null; }); console.log('button', btn);
  await p.click('#solStartScr .sscoach'); await p.waitForTimeout(400); await p.screenshot({ path: '/tmp/claude-0/ui/startcoach-card.png' });
  console.log('card', await p.evaluate(() => { const c = document.querySelector('.sccard'); return c && c.innerText.replace(/\n/g, ' | '); }));
  await p.click('.sccard [data-sc="x"]');
  await p.waitForTimeout(76000);
  console.log('played', JSON.stringify(await p.evaluate(() => window.__played))); console.log('errors', errs); await b.close(); })();
