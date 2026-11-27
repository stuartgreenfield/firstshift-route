const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await c.addInitScript(() => { const x = new Date(); localStorage.setItem('fs-terms', x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1');
});
  await c.route('**/fsbeat.js*', async r => { const fs = require('fs'); let t = fs.readFileSync('/tmp/claude-0/navnight/web/fsbeat.js', 'utf8'); const k = 'try { j.fn(); }'; if (!t.includes(k)) throw new Error('hook'); t = t.replace(k, "try { var __k = (j.always ? 'ALWAYS ' : 'normal ') + j.ms + ' ' + String(j.fn).replace(/\\s+/g, ' ').slice(0, 70); (window.__runs = window.__runs || {})[__k] = (window.__runs[__k] || 0) + 1; j.fn(); }"); await r.fulfill({ body: t, contentType: 'application/javascript' }); });
  for (const [name, path] of [['Route+', '/fastnet/'], ['Mark+', '/mark/']]) { const p = await c.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
    await p.goto(process.argv[2] + path); try { await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 90000 }); } catch (e) { console.log(name, 'NOT READY', await p.evaluate(() => [!!window.FSBeat, !!window.__navFc, document.title, (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 200)].join(' | '))); } await p.waitForTimeout(3000);
    await p.evaluate(() => { const n = document.querySelector('#spTourNo'); if (n) n.click(); }); await p.waitForTimeout(1500);
    const L = await p.evaluate(() => window.FSBeat.list()); console.log(name, 'jobs', L.length, 'always', L.filter(j => j.always).length);
    await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); window.__runs = {}; }); await p.waitForTimeout(12000);
    const r = await p.evaluate(() => window.__runs); const ks = Object.keys(r);
    console.log(name, 'HIDDEN 12 s: normal jobs that ran:', ks.filter(k => k.startsWith('normal')).length, '| always jobs that ran:', ks.filter(k => k.startsWith('ALWAYS')).length);
    ks.forEach(k => console.log('   ', r[k], k)); await p.close(); }
  await b.close(); })();
