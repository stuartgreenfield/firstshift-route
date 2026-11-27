const { chromium } = require('playwright'); const fs = require('fs');
const setup = fs.readFileSync('/tmp/claude-0/probe/dd.js', 'utf8'); const a = setup.indexOf("  await p.click('#spTourNo')"), b2 = setup.indexOf("  await p.waitForTimeout(20000);"); const STEPS = setup.slice(a, b2);
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch();
  for (const [nm, base, w, h] of [['Mark+ phone', 'http://127.0.0.1:8778', 412, 840], ['Mark phone', 'http://127.0.0.1:8779', 390, 760]]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
    await c.addInitScript(() => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate());
      /* a start line pinged 6886 minutes ago by an earlier race, as in his photo */
      const t = Date.now() - 6886 * 60000; localStorage.setItem('fs-line-solent', JSON.stringify({ boat: [50.7700, -1.3100, t], pin: [50.7715, -1.3160, t] })); });
    const p = await c.newPage(); p.on('pageerror', e => console.log(nm, 'ERR', e.message)); const BASE = base;
    await p.goto(BASE + '/mark/'); await p.waitForFunction(() => window.FSSolent && window.__navFc && window.__navFc().P, null, { timeout: 200000 }); await p.waitForTimeout(2500);
    await eval('(async () => {' + STEPS + '})()'); await p.waitForTimeout(8000);
    const state = () => p.evaluate(() => { const l = window.__fsLine ? window.__fsLine() : null; const v = i => { const e = document.getElementById(i); return !!(e && e.getClientRects().length); }; const gun = [...document.querySelectorAll('#now .nowc, #now div, .now div')].map(e => e.innerText.replace(/\s+/g, ' ')).filter(t => /^GUN/.test(t))[0] || ''; return { line: !!(l && (l.boat || l.pin)), lineRaw: JSON.stringify(l).slice(0, 80), course: !!(window.__navCourse && window.__navCourse()), startNow: JSON.stringify(window.FSSolent.startNow ? window.FSSolent.startNow() : null), seq: v('solSeq'), ss: v('solStartScr'), lift: v('lhPop'), rb: [...document.querySelectorAll('[data-rb]')].filter(e => e.getClientRects().length).length, gun: gun, saved: (localStorage.getItem('fs-line-solent') || '').slice(0, 40) }; });
    const s0 = await state(); console.log(nm, 'before:', JSON.stringify(s0)); ok(s0.line, nm + ': the old start line is there before (as in his photo)');
    /* the age note in hours and minutes: The start window lists it */
    await p.evaluate(() => { try { window.FSSolent.chain(true); } catch (e) {} const l = document.getElementById('solLegs'); if (l) l.hidden = false; }); await p.waitForTimeout(1500);
    const note = await p.evaluate(() => [6886, 59, 60, 135, 1440, 2 * 60000 / 60000].map(m => window.FSSolent.lineAge(m * 60000)).join(' | ')); ok(/^4 days 18 h \| 59 min \| 1 h 00 min \| 2 h 15 min \| 24 h 00 min/.test(note), nm + ': ages read in hours and minutes, days and hours when older', note);
    await p.evaluate(() => { const x = document.getElementById('wizX'); if (x) x.click(); }); await p.waitForTimeout(600);
    await p.evaluate(() => window.FSSolent.start()); await p.waitForTimeout(900); await p.evaluate(() => { const n = document.getElementById('solCardN'); if (n) n.click(); }); await p.waitForTimeout(1200);
    const btn = await p.evaluate(() => { const e = document.getElementById('solCardWipe'); return e ? e.innerText.trim() : null; }); ok(btn === 'Delete last race', nm + ': the race card offers Delete last race', btn); await p.screenshot({ path: '/tmp/claude-0/probe/wipe-' + nm.replace(/\W+/g, '') + '-1card.png' });
    await p.click('#solCardWipe'); await p.waitForTimeout(300); const sure = await p.evaluate(() => document.getElementById('solCardWipe').innerText.trim()); ok(sure === 'Tap again to delete', nm + ': one tap asks for a second', sure);
    const s1 = await state(); ok(s1.line, nm + ': nothing is deleted by the first tap');
    await p.click('#solCardWipe'); await p.waitForTimeout(2500); const s2 = await state(); console.log(nm, 'after:', JSON.stringify(s2));
    ok(!s2.line && !s2.saved.includes('boat'), nm + ': the start line and both ends are gone', s2.lineRaw + ' ' + s2.saved);
    ok(!s2.seq && !s2.ss && !s2.rb && !s2.lift, nm + ': no sequence card, start screen, race buttons or lift box left', JSON.stringify([s2.seq, s2.ss, s2.rb, s2.lift]));
    ok(!/GUN \d/.test(s2.gun), nm + ': no gun countdown left', s2.gun);
    const card = await p.evaluate(() => { const c = document.getElementById('solCard'); return c && !c.hidden ? c.innerText.replace(/\s+/g, ' ').slice(0, 200) : 'closed'; }); ok(/Round the cans/.test(card) && !/Delete last race/.test(card), nm + ': the card is back, clean, with nothing more to delete', card.slice(0, 120));
    await p.screenshot({ path: '/tmp/claude-0/probe/wipe-' + nm.replace(/\W+/g, '') + '-2after.png' });
    /* and it stays clean after a reload */
    await p.reload(); await p.waitForFunction(() => window.FSSolent && window.__navFc && window.__navFc().P, null, { timeout: 200000 }); await p.waitForTimeout(4000); const s3 = await state(); ok(!s3.line && !/GUN \d/.test(s3.gun), nm + ': still clean after closing and opening again', JSON.stringify({ line: s3.line, gun: s3.gun }));
    await c.close(); }
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); })();
