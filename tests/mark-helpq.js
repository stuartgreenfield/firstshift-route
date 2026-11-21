/* The ? buttons on Mark's card, line step, start screen and countdown bar each open their own help topic. Run: node tests/mark-helpq.js [base] */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['Galaxy Tab S4'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && window.FSHelpFind && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(3000);
  const view = () => p.evaluate(() => { const v = FSHelpFind.view(); const h = document.querySelector('#hfView h2'); return (h && h.textContent) + ' | help open ' + !document.getElementById('help').hidden; });
  const r = {};
  r.cardQ = await p.evaluate(() => { const q = document.querySelector('#solCard .mkq'); return q && q.dataset.mkq; });
  await p.click('#solCard .mkq'); await p.waitForTimeout(1200); r.afterCard = await view();
  await p.evaluate(() => { document.getElementById('help').hidden = true; FSSolent.start(); }); await p.waitForTimeout(600);
  await p.click('#solCardM'); await p.waitForTimeout(1500); r.stepQ = await p.evaluate(() => { const q = document.querySelector('#solStep .mkq'); return q && q.dataset.mkq; });
  await p.evaluate(() => { document.querySelector('#solStep .close') && document.querySelector('#solStep .close').click(); FSSolent.set({ wind: { twd: 230, tws: 12, src: 'typed', at: Date.now() } }); FSSolent.test(true); }); await p.waitForTimeout(2000);
  await p.evaluate(() => { FSSolent.set({ startAt: Math.round(Date.now() / 1000 + 100) }); window.__fsGun(FSSolent.state().startAt); FSSolent.showList(); }); await p.waitForTimeout(800); await p.click('[data-k="nxnow"]'); await p.waitForTimeout(2500);
  r.ssQ = await p.evaluate(() => { const q = document.querySelector('#solStartScr .mkq'); return q && q.dataset.mkq; });
  require('fs').mkdirSync('/tmp/claude-0/ui', { recursive: true }); await p.screenshot({ path: '/tmp/claude-0/ui/q-ss.png' });
  await p.click('#solStartScr .mkq'); await p.waitForTimeout(1500); r.afterSS = await view();
  /* the countdown bar is hidden while the start screen is open; make the start screen small, as the crew does, then look */
  await p.evaluate(() => { document.getElementById('help').hidden = true; const s = document.querySelector('#solStartScr [data-q="small"]'); s && s.click(); }); await p.waitForTimeout(1500);
  r.seqQ = await p.evaluate(() => { const q = document.querySelector('#solSeq .mkq'); return q && q.dataset.mkq; });
  console.log(JSON.stringify(r)); ok(!!r.cardQ, 'The course card has a ? button', r.cardQ); ok(/help open true/.test(r.afterCard), 'Its ? opens help', r.afterCard); ok(!!r.stepQ, 'The line step has a ? button', r.stepQ); ok(!!r.ssQ, 'The start screen has a ? button', r.ssQ); ok(!!r.seqQ, 'The countdown bar has a ? button', r.seqQ); ok(/help open true/.test(r.afterSS), 'The start screen ? opens help', r.afterSS); ok(errs.length === 0, 'No script errors', errs.slice(0, 3));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
