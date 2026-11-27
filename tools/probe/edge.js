/* Off-the-edge check (Stuart 27 Nov 2026 08:33): nothing may run off the side of the screen. For each tool, width and state it lists every visible
   element with text or a control whose box crosses the left or right edge and that the user cannot scroll to (no sideways-scrolling parent). */
const { chromium } = require('playwright'); const fs = require('fs');
const WIDTHS = (process.env.WIDTHS || '320,360,375,390,393,414,430').split(',').map(Number);
const TOOLS = [['Route', 'http://127.0.0.1:8779/fastnet/'], ['Mark', 'http://127.0.0.1:8779/mark/'], ['Route+', 'http://127.0.0.1:8778/fastnet/'], ['Mark+', 'http://127.0.0.1:8778/mark/']].filter(t => !process.env.ONLY || process.env.ONLY.split(',').includes(t[0]));
const scan = () => { const W = document.documentElement.clientWidth, out = [];
  const vis = e => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight; };
  const scrolls = e => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowX) && p.scrollWidth > p.clientWidth + 1) return true; } return false; };
  const cut = e => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (/(hidden|clip)/.test(s.overflowX)) { const r = p.getBoundingClientRect(); return r; } } return null; };
  document.querySelectorAll('body *').forEach(e => { if (!vis(e)) return; if (/^(CANVAS|SVG|PATH|G|HTML|BODY)$/i.test(e.tagName) || e.closest('svg') || e.closest('.maplibregl-canvas-container,.leaflet-pane,#map canvas')) return;
    const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0) || /^(BUTTON|INPUT|SELECT|A)$/.test(e.tagName); if (!own) return;
    const r = e.getBoundingClientRect(); let over = Math.max(r.right - W, -r.left); const c = cut(e); if (c && over <= 1) { over = Math.max(r.right - Math.min(c.right, W), Math.max(c.left, 0) - r.left); }
    if (over > 1.5 && !scrolls(e)) { if (e.closest('#map') && !e.closest('button,[role=button],.solrb,#solStrip')) return; out.push({ el: (e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '')) + ' in #' + ((e.parentElement.closest('[id]') || {}).id || '?'), text: (e.innerText || e.value || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').slice(0, 40), by: Math.round(over), box: Math.round(r.left) + ' to ' + Math.round(r.right) + ' of ' + W }); } });
  return out; };
(async () => { const b = await chromium.launch(); const all = [];
  for (const [tool, url] of TOOLS) for (const w of WIDTHS) { const c = await b.newContext({ viewport: { width: w, height: 800 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block', geolocation: { latitude: 50.77, longitude: -1.30, accuracy: 8 }, permissions: ['geolocation'] });
    await c.addInitScript(() => { const x = new Date(); localStorage.setItem('fs-terms', x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate()); });
    const p = await c.newPage(); const add = async state => { const r = await p.evaluate(scan); r.forEach(x => all.push(Object.assign({ tool, w, state }, x))); if (process.env.SHOTS && r.length) await p.screenshot({ path: '/tmp/claude-0/probe/edge-' + tool.replace('+', 'plus') + '-' + w + '-' + state.replace(/\W+/g, '_') + '.png' }); };
    try { await p.goto(url); await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 200000 }); await p.waitForTimeout(2500); await add('landing');
      const has = async s => !!(await p.$('#solStep ' + s)); const picks = ['3F','3G','3H','3J','3K','3L','3M']; let pi = 0;
      await p.evaluate(() => { const n = document.getElementById('spTourNo'); if (n) n.click(); }); await p.waitForTimeout(2500); await add('first screen');
      const closeTips = () => p.evaluate(() => { document.querySelectorAll('.close,[aria-label=Close]').forEach(x => { if (x.getClientRects().length && x.closest('.tourtip,.fstip,.navtip,[class*=tip]')) x.click(); }); });
      const slide = v => p.evaluate(v => { const t = document.getElementById('time'); if (!t) return; t.value = v === 'min' ? t.min : v === 'max' ? t.max : Math.max(+t.min, +t.value - 120); t.dispatchEvent(new Event('input', { bubbles: true })); }, v);
      if (/mark/.test(url)) {   /* Mark: a course by the steps, the gun in 11 minutes, GPS on, TIME open, the time before the start: his photo of 27 Nov 08:33 */
  await p.click('#solCardM'); await p.waitForTimeout(800);
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
        await p.waitForTimeout(12000); await p.evaluate(() => window.FSSolent.accSet({ startAt: Math.round(Date.now() / 1000 + 655) })); await p.waitForTimeout(2000); await closeTips(); await p.waitForTimeout(300); await add('race set, gun in 11 min');
        await p.evaluate(() => { const g = document.getElementById('liveBtn'); if (g) g.click(); }); await p.waitForTimeout(5000); await add('race, GPS on');
        await p.evaluate(() => { const t = document.getElementById('mkTimeBtn'); if (t) t.click(); }); await p.waitForTimeout(1000); await add('race, GPS on, TIME open');
        await slide('back'); await p.waitForTimeout(800); await add('race, time before the start');
      } else { await closeTips(); await p.evaluate(() => { const g = document.getElementById('liveBtn'); if (g) g.click(); }); await p.waitForTimeout(4000); await add('GPS on');
        await slide('min'); await p.waitForTimeout(700); await add('time at the beginning'); await slide('max'); await p.waitForTimeout(700); await add('time at the end'); }
      /* the longest text each changing readout can show (27 Nov: the clock fault only showed with one label) */
      for (const [st, tz, lab] of [['long start time', 'Start 14h 31', 'before start'], ['very long start time', 'Start 2d 14h 31', '<span class="ckl">102h 05 since start</span><span class="cks">+102h 05</span>']]) { await p.evaluate(a => { const e = document.getElementById('tzRace'); if (e && e.textContent.trim()) e.innerHTML = a[0].replace(/ (.*)/, ' <b>$1</b>'); const s = document.querySelector('#clock small'); if (s) s.innerHTML = a[1]; }, [tz, lab]); await p.waitForTimeout(150); await add(st); }
      await p.evaluate(() => { const pn = document.querySelector('#panel,.panel'); const t = document.querySelector('[data-tab=routes],#tabRoutes'); if (t) t.click(); }); await p.waitForTimeout(800); await add('chart and panel');
      for (const tab of ['plan', 'fleet', 'data']) { const ok = await p.evaluate(t => { const e = document.querySelector('.tabs [data-t="' + t + '"],.tabs [data-s="' + t + '"],#t-' + t + '-btn') || [...document.querySelectorAll('.tabs button,[role=tab]')].find(x => x.textContent.trim().toLowerCase() === t); if (e) { e.click(); return true; } return false; }, tab); if (ok) { await p.waitForTimeout(600); await add('panel ' + tab); } }
      const tabs = await p.evaluate(() => { const s = document.getElementById('setBtn'); if (s) s.click(); return [...document.querySelectorAll('#sheet .stabs button')].map(e => e.dataset.s || e.textContent.trim()); }); await p.waitForTimeout(900); await add('settings');
      for (const t of tabs) { await p.evaluate(t => { const e = [...document.querySelectorAll('#sheet .stabs button')].find(x => (x.dataset.s || x.textContent.trim()) === t); if (e) e.click(); }, t); await p.waitForTimeout(400); await add('settings ' + t); }
      await p.evaluate(() => { const x = document.querySelector('#sheet .close,#sheetClose,#sheet [aria-label=Close]'); if (x) x.click(); const h = document.getElementById('helpBtn'); if (h) h.click(); }); await p.waitForTimeout(1200); await add('help');
    } catch (e) { all.push({ tool, w, state: 'ERROR', el: '', text: String(e.message).slice(0, 80), by: 0, box: '' }); }
    await c.close(); }
  fs.writeFileSync(process.env.OUT || '/tmp/claude-0/probe/edge.json', JSON.stringify(all, null, 1));
  const key = {}; all.forEach(x => { const k = x.tool + ' | ' + x.state + ' | ' + x.el + ' | "' + x.text + '"'; (key[k] = key[k] || []).push(x.w + ':' + x.by); });
  Object.keys(key).sort().forEach(k => console.log(k + ' | widths:px over ' + key[k].join(' '))); console.log('TOTAL', all.length, 'in', Object.keys(key).length, 'places'); await b.close(); })();
