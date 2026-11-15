/* Help: search and grouped topic chips at the top, topics folded (Stuart 15 Nov 17:59, 20:45). Run: node tests/help-find.js <base> */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8769';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/channel-area/'); await p.waitForFunction(() => window.FSHelpFind && document.getElementById('helpBtn'), null, { timeout: 300000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => document.getElementById('helpBtn').click()); await p.waitForTimeout(1200);
  const s0 = await p.evaluate(() => ({ bar: !!document.getElementById('hfQ') && !!document.getElementById('hfGo'), groups: [...document.querySelectorAll('.hfg b')].map(x => x.textContent), chips: document.querySelectorAll('.hfchip').length, topics: document.querySelectorAll('#help .htopic').length, folded: document.querySelectorAll('#help .htopic.hffold').length }));
  ok(s0.bar && s0.groups.length >= 4 && s0.chips === s0.topics, 'a search box with a Search button, and every topic as a chip in groups', JSON.stringify(s0));
  ok(s0.folded === s0.topics, 'every topic starts folded', s0.folded + ' of ' + s0.topics);
  await p.fill('#hfQ', 'polar'); await p.waitForTimeout(300);
  const s1 = await p.evaluate(() => ({ shown: [...document.querySelectorAll('#help .htopic:not(.hfout)')].length, open: [...document.querySelectorAll('#help .htopic:not(.hfout):not(.hffold)')].length, marks: document.querySelectorAll('#help mark.hfq').length, note: document.getElementById('hfNote').textContent }));
  ok(s1.shown > 0 && s1.shown < s0.topics && s1.open === s1.shown && s1.marks > 0, 'typing keeps only the topics that mention it, opens them and marks the word', JSON.stringify(s1));
  await p.fill('#hfQ', 'zzzqqq'); await p.click('#hfGo'); await p.waitForTimeout(200);
  ok(/No topic mentions zzzqqq/.test(await p.evaluate(() => document.getElementById('hfNote').textContent)), 'the Search button works too, and says when nothing matches');
  await p.fill('#hfQ', ''); await p.waitForTimeout(200);
  const ch = await p.evaluate(() => { const c = [...document.querySelectorAll('.hfchip')].find(x => /Not for navigation/.test(x.textContent)) || document.querySelectorAll('.hfchip')[3]; const i = c.dataset.hf; c.click(); const d = document.querySelector('#help .htopic[data-hfi="' + i + '"]'); return { name: c.textContent, open: !d.classList.contains('hffold') }; });
  ok(ch.open, 'a chip opens its topic', ch.name);
  const tap = await p.evaluate(() => { const d = document.querySelectorAll('#help .htopic')[1]; const h = d.querySelector('h3'); h.click(); const a = !d.classList.contains('hffold'); h.click(); return [a, d.classList.contains('hffold')]; });
  ok(tap[0] && tap[1], 'tapping a heading opens and folds the topic', JSON.stringify(tap));
  ok(errs.length === 0, 'no page errors', errs.slice(0, 3).join(' | '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
