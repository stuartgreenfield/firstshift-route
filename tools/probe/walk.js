const { chromium } = require('playwright'); const BASE = process.argv[2];
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 412, height: 840 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block', geolocation: { latitude: 50.77, longitude: -1.30, accuracy: 8 }, permissions: ['geolocation'] });
  await c.addInitScript(() => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x','1'); localStorage.clear(); const d=new Date(); localStorage.setItem('fs-terms', d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()); });
  const p = await c.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto(BASE + '/mark/'); await p.waitForFunction(() => window.FSSolent && window.__navFc && window.__navFc().P, null, { timeout: 200000 }); await p.waitForTimeout(2500);
  await p.click('#spTourNo'); await p.waitForTimeout(1500); await p.click('#solCardM'); await p.waitForTimeout(800);
  const has = async s => !!(await p.$('#solStep ' + s)); const picks = ['3F','3G','3H','3J','3K','3L','3M']; let pi = 0;
  for (let i = 0; i < 14; i++) { if (!(await p.evaluate(() => { const b = document.getElementById('solStep'); return b && !b.hidden; }))) break;
    if (await has('[data-k=plan][data-v=route]')) await p.click('#solStep [data-k=plan][data-v=route]');
    if (await has('[data-k=sk][data-v=buoy]')) { await p.click('#solStep [data-k=sk][data-v=buoy]'); await p.waitForTimeout(300); }
    if (await has('[data-k=list]')) { await p.click('#solStep [data-k=list]'); await p.waitForTimeout(600);
      const kind = await p.evaluate(() => document.querySelector('#solListB [data-add]') ? 'add' : document.querySelector('#solListB [data-one]') ? 'one' : 'none');
      if (kind === 'add') { for (const q of ['3F','3G','3H','2C']) { await p.evaluate(q => { const e = document.querySelector('#solListB [data-add="' + q + '"][data-side="port"]'); if (e) e.click(); }, q); await p.waitForTimeout(400); } }
      else if (kind === 'one') { await p.fill('#solListQ', picks[pi++ % picks.length]); await p.waitForTimeout(300); await p.evaluate(() => document.querySelector('#solListB [data-one]').click()); await p.waitForTimeout(400); }
      await p.evaluate(() => { const l = document.getElementById('solList'); if (l && !l.hidden) { const x = l.querySelector('.close,[data-k=x],#solListX'); if (x) x.click(); } }); await p.waitForTimeout(400); }
    if (await has('#solBtcc')) { await p.fill('#solBtcc', '1.012'); await p.dispatchEvent('#solBtcc', 'change'); await p.waitForTimeout(400); }
    if (await has('[data-k=go]:not([disabled])')) { await p.click('#solStep [data-k=go]'); break; }
    if (await has('[data-k=next]:not([disabled])')) await p.click('#solStep [data-k=next]'); else break;
    await p.waitForTimeout(600); }
  await p.waitForTimeout(12000);
  await p.evaluate(() => { document.querySelectorAll('.close,[aria-label=Close]').forEach(e => { if (e.getClientRects().length && e.closest('.tourtip,.fstip,[class*=tip]')) e.click(); }); }); await p.waitForTimeout(500);
  const vis = () => p.evaluate(() => { const v = e => e && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && +getComputedStyle(e).opacity > 0; const st = [...document.querySelectorAll('.fssteps button')].map(e => e.textContent.trim() + (e.classList.contains('on') || e.getAttribute('aria-pressed') === 'true' || e.getAttribute('aria-current') ? '*' : '')).join(' '); const ids = ['solSeq', 'solCard', 'solStep', 'solStartScr', 'panel', 'navPlot', 'navStrip', 'navHelm', 'lhPop', 'solTestBar', 'solGun', 'wiz', 'solChain']; return 'steps[' + st + '] shown: ' + ids.filter(i => v(document.getElementById(i))).map(i => { const r = document.getElementById(i).getBoundingClientRect(); return i + '@' + Math.round(r.top) + '-' + Math.round(r.bottom); }).join(' ') + ' | ' + [...document.querySelectorAll('.solrb button,[data-rb]')].filter(v).map(e => e.innerText.trim()).join('/'); });
  const shot = async n => { await p.screenshot({ path: '/tmp/claude-0/probe/walk-' + n + '.png' }); };
  const tapStep = async k => { const r = await p.evaluate(k => { const e = document.querySelector('.fssteps [data-s="' + k + '"]'); if (!e || !e.getClientRects().length) return null; const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }, k); if (!r) { console.log('   no step button', k); return; } await p.touchscreen.tap(r[0], r[1]); await p.waitForTimeout(2200); };
  const samp = async (secs, tag) => { const L = await p.evaluate(async secs => { const ids = ['navPlot', 'lhPop', 'navStrip', 'solSeq', 'solGun', 'navPracTag', 'cbanner'], log = {}, t0 = performance.now(); for (let i = 0; i < secs * 10; i++) { ids.forEach(id => { const e = document.getElementById(id); const k = !e || !e.getClientRects().length ? 'hidden' : (function () { const r = e.getBoundingClientRect(); return Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height); })(); const A = log[id] = log[id] || []; if (!A.length || A[A.length - 1][1] !== k) A.push([Math.round((performance.now() - t0) / 100) / 10, k]); }); await new Promise(r => setTimeout(r, 100)); } return log; }, secs); for (const k in L) if (L[k].length > 1 || L[k][0][1] !== 'hidden') console.log('   ' + tag + ' ' + k + ': ' + (L[k].length - 1) + ' moves: ' + L[k].slice(0, 16).map(x => x[0] + 's ' + x[1]).join(' | ')); };
  console.log('1 course set, gun 11 min off:', await vis()); await shot('1-course-set');
  await p.evaluate(() => { try { window.FSSolent.test(true); } catch (e) { console.log('test', e.message); } }); await p.waitForTimeout(6000); console.log('2 test mode on:', await vis()); await shot('2-testmode');
  await tapStep('race'); console.log('3 RACE tapped before the gun:', await vis()); await shot('3-race-before-gun'); console.log('   toast:', await p.evaluate(() => [...document.querySelectorAll('#navToast')].filter(e => e.getClientRects().length).map(e => e.innerText.slice(0, 140)).join('|')));
  await tapStep('start'); console.log('4 START tapped:', await vis()); await shot('4-start');
  await tapStep('race'); console.log('5 RACE tapped again:', await vis()); await shot('5-race-again');
  await p.evaluate(() => window.FSSolent.accSet({ startAt: Math.round(Date.now() / 1000 - 45) })); await p.waitForTimeout(5000); console.log('6 45 s after the gun:', await vis()); await shot('6-after-gun');
  await samp(25, 'racing');
  await tapStep('course'); console.log('7 COURSE tapped while racing:', await vis()); await shot('7-course-while-racing');
  await tapStep('race'); console.log('8 RACE tapped to get back:', await vis()); await shot('8-back-to-race');
  await samp(15, 'back');
  /* end the race from the race card, then look for the lift box */
  await p.evaluate(() => window.FSSolent.start()); await p.waitForTimeout(1000); const er = await p.evaluate(() => { const b = [...document.querySelectorAll('#solCard button, #solCard [role=button], #solCard .btn')].find(x => /^End race/.test(x.innerText.trim())); if (!b) return 'no End race in card: ' + (document.getElementById('solCard') || {}).innerText; b.click(); return 'End race clicked'; }); console.log('9', er.slice(0, 200)); await p.waitForTimeout(800);
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /tap again|end race|yes/i.test(x.innerText) && x.getClientRects().length && x.closest('#solCard,.solask,[role=dialog]')); if (b) b.click(); }); await p.waitForTimeout(4000); console.log('10 after End race:', await vis()); await shot('10-after-end'); await samp(8, 'ended');
  await b.close(); })();
