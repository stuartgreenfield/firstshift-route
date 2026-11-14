/* 14 Nov 2026: a page whose optional file is missing (pre-routes 404) must not take itself for offline and reload every 30 s.
   Run with a site copy that has no channel-area/pre/routes.json: node tests/missingfile.js http://localhost:8769 */
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8769';
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ serviceWorkers: 'block' });
  await ctx.route('**/*', r => { const u = r.request().url(); if (/^https?:\/\/(localhost|127\.0\.0\.1)/.test(u) || /^(data|blob):/.test(u)) return r.continue(); return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); });
  const p = await ctx.newPage(); let loads = 0, miss = 0; p.on('load', () => loads++); p.on('response', r => { if (r.status() === 404) miss++; });
  await p.goto(BASE + '/channel-area/'); await p.waitForTimeout(75000);
  const ok = miss > 0 && loads === 1;
  console.log((ok ? 'PASS' : 'FAIL') + ' a missing file does not make the page reload | ' + miss + ' missing, ' + loads + ' page loads in 75 s');
  console.log((ok ? 1 : 0) + ' passed, ' + (ok ? 0 : 1) + ' failed'); await b.close(); process.exit(ok ? 0 : 1);
})();
