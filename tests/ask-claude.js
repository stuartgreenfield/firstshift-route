/* Ask Claude in Help on all four tools (Stuart 17 Nov 07:33): a link to Claude with a built-in prompt naming the tool, its version and
   where the user is. Run: node tests/ask-claude.js http://localhost:8779 [/channel-area/,/mark/] */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779', PAGES = (process.argv[3] || '/channel-area/,/mark/').split(',');
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch();
  for (const pg of PAGES) { const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
    await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + pg);
    await p.waitForFunction(() => window.__navFc && window.__navFc().P && document.getElementById('askClaude'), null, { timeout: 300000 }); await p.waitForTimeout(800);
    const r = await p.evaluate(() => { const a = document.getElementById('askClaude'); a.dispatchEvent(new Event('focus')); const u = new URL(a.href); return { host: u.host + u.pathname, txt: a.textContent, q: u.searchParams.get('q') }; });
    const want = (pg.includes('mark') ? 'Mark' : 'Route') + (await p.evaluate(() => !!window.NAV_VERSION) ? '+' : '');
    ok(r.host === 'claude.ai/new' && r.txt === 'Ask Claude about ' + want, pg + ': Help has Ask Claude about ' + want, r.txt);
    ok(new RegExp('FirstShift ' + want.replace('+', '\\+') + ' v\\d').test(r.q) && /name the exact buttons/.test(r.q) && /My question: $/.test(r.q) && /British English/.test(r.q), pg + ': the built-in prompt names the tool, its version and how to answer', r.q.slice(0, 120));
    ok(!errs.length, pg + ': no page errors', errs.join(' | ') || null); await c.close(); }
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
