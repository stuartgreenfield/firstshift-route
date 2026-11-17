const { chromium, devices } = require('playwright');
(async () => { const b = await chromium.launch(); for (const [dev, nm] of [['iPhone 13', 'ph'], [null, 'pc']]) { const c = await b.newContext(dev ? { ...devices[dev], serviceWorkers: 'block' } : { viewport: { width: 1440, height: 860 }, serviceWorkers: 'block' });
  await c.addInitScript(() => { localStorage.clear(); });
  for (const pg of ['mark', 'channel-area']) { const p = await c.newPage(); await p.goto(process.argv[2] + '/' + pg + '/'); await p.waitForTimeout(3500); await p.screenshot({ path: '/tmp/claude-0/ui/sp-' + pg + '-' + nm + '.png' }); await p.close(); } await c.close(); }
  await b.close(); })();
