const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const out = {};
  for (const [name, url] of [['Route+', 'http://127.0.0.1:8778/fastnet/'], ['Mark+', 'http://127.0.0.1:8778/mark/'], ['Route', 'http://127.0.0.1:8779/fastnet/'], ['Mark', 'http://127.0.0.1:8779/mark/']]) {
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await c.addInitScript(() => { const x = new Date(); localStorage.setItem('fs-terms', x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); });
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(url); await p.waitForFunction(() => window.__navFc && window.__navFc().P && window.NavSet && document.getElementById('setFind'), null, { timeout: 300000 }); await p.waitForTimeout(36000);
    out[name] = await p.evaluate(async () => { const $ = i => document.getElementById(i), o = {};
      o.tabs = [...document.querySelectorAll('#sheet .stabs button, #sheet .stabs [role=tab]')].map(e => e.textContent.trim() + (e.hidden ? ' (hidden)' : ''));
      o.sums = [...document.querySelectorAll('#sheet .tabsum')].map(e => (e.parentNode.id || '?') + ': ' + e.textContent);
      o.placeholder = $('setFind').placeholder; o.prefsIn = $('navPrefs') && $('navPrefs').parentNode.id; o.offIn = $('navOff') && $('navOff').parentNode.id; o.hold = !!$('navInstHold');
      const l = $('navSetLink'); o.link = l ? [l.hidden, l.style.display, l.parentNode.tagName].join(',') : 'none';
      o.find = {}; ['depth', 'dpt', 'sounder', 'shallow', 'alarm', 'alert', 'warning', 'chart', 'tide', 'stream', 'offline', 'signal', 'polar', 'target', 'ais', 'cpa', 'night', 'red', 'wind', 'tws', 'gps', 'boat', 'instrument', 'defaults', 'navigation', 'forecast', 'reef', 'route'].forEach(q => { o.find[q] = window.NavSet.find(q).map(r => r.tab + '|' + r.t); });
      const pn = $('navPanel'); if (pn) { const sb = $('setBtn'); if (sb) sb.click(); await new Promise(r => setTimeout(r, 600)); window.NavSet.open('inst'); await new Promise(r => setTimeout(r, 900)); o.intabOpen = pn.classList.contains('intab') + ',' + (pn.parentNode.id || pn.parentNode.tagName); window.NavSet.open('boat'); await new Promise(r => setTimeout(r, 900)); o.intabAway = pn.classList.contains('intab') + ',' + (pn.parentNode.id || pn.parentNode.tagName) + ',' + pn.hidden; }
      return o; });
    out[name].errors = errs; await c.close(); }
  fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1)); console.log('written', Object.keys(out).map(k => k + ' tabs ' + out[k].tabs.length + ' sums ' + out[k].sums.length + ' errs ' + out[k].errors.length).join('; ')); await b.close(); })();
