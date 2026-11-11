/* FirstShift Route full check. Drives every part of the app in a real browser at phone, tablet and computer sizes and
   writes a report (report.json, report.md) and screenshots. Usage: node tests/check.js <baseUrl> <outDir> [quick]
   e.g. node tests/check.js https://firstshift-route.pages.dev out   or   node tests/check.js http://localhost:8766 out */
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
const BASE = (process.argv[2] || 'http://localhost:8766').replace(/\/$/, ''), OUT = process.argv[3] || 'check-out', QUICK = process.argv[4] === 'quick';
fs.mkdirSync(OUT, { recursive: true });
const R = []; let shot = 0;
const DEV = [
  ['iPhone 13', devices['iPhone 13']], ['iPhone SE', devices['iPhone SE']], ['iPhone 13 on its side', devices['iPhone 13 landscape']],
  ['Pixel 7', devices['Pixel 7']], ['Pixel 7 on its side', devices['Pixel 7 landscape']], ['iPad', devices['iPad (gen 7)']], ['iPad on its side', devices['iPad (gen 7) landscape']],
  ['Galaxy Tab S4', devices['Galaxy Tab S4']], ['Computer', { viewport: { width: 1440, height: 860 } }], ['Small laptop', { viewport: { width: 1280, height: 720 } }]
].filter(d => d[1]);
const DONE = () => { localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); };
function rec(dev, area, name, ok, note, img) { R.push({ dev, area, name, ok: !!ok, note: note || '', img: img || '' }); console.log((ok ? 'PASS ' : 'FAIL ') + dev + ' | ' + area + ' | ' + name + (note ? ' | ' + note : '')); }
async function snap(p, dev, what) { const f = (++shot).toString().padStart(3, '0') + '-' + (dev + '-' + what).replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.png'; await p.screenshot({ path: path.join(OUT, f) }); return f; }
async function layout(p) {
  return p.evaluate(() => {
    const box = s => { const e = document.querySelector(s); if (!e || e.hidden || !e.offsetParent && getComputedStyle(e).position !== 'fixed') return null; const b = e.getBoundingClientRect(); return b.width ? b : null; };
    const vw = innerWidth, vh = innerHeight, head = box('.lead'), bar = box('.bar'), map = box('#map'), clock = box('#clock');
    const off = [...document.querySelectorAll('.bar *, .lead *, .tools *')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > vw + 1 || b.left < -1 || b.top < -1); }).map(e => e.id || e.className).slice(0, 5);
    const ov = [...document.querySelectorAll('.bar, .tools, .lead')].map(e => e.getBoundingClientRect());
    let mapVis = map ? map.height : 0; ov.forEach(b => { /* nothing */ });
    return { vw, vh, sw: document.documentElement.scrollWidth, sy: scrollY, headTop: head ? head.top : null, barBottom: bar ? bar.bottom : null, mapH: map ? Math.round(map.height) : 0, off };
  });
}
async function waitRoutes(p, ms) {
  try { await p.waitForFunction(() => { const t = (document.getElementById('runNote') || {}).textContent || ''; return document.querySelectorAll('#finBox .fin').length > 0 || /forecasts end|Cannot route|No way/.test(t); }, null, { timeout: ms }); } catch (e) { return { ok: false, note: 'no routes after ' + ms / 1000 + ' s' }; }
  return p.evaluate(() => ({ ok: document.querySelectorAll('#finBox .fin').length > 0, n: document.querySelectorAll('#finBox .fin').length, note: (document.getElementById('runNote') || {}).textContent.slice(0, 140) }));
}
(async () => {
  const b = await chromium.launch();
  const t0 = Date.now();
  /* 1. every page, every device: loads, routes, fits the screen */
  const pages = [['English Channel (Myth)', '/channel-area/?race=myth'], ['Fastnet', '/fastnet/'], ['North Sea', '/northsea-area/'], ['Cervantes', '/cervantes/']];
  for (const [dn, d] of DEV) {
    for (const [pn, url] of (QUICK && dn !== 'iPhone 13' && dn !== 'Computer' ? pages.slice(0, 1) : pages)) {
      const ctx = await b.newContext({ ...d }); await ctx.addInitScript(DONE); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      const ts = Date.now(); await p.goto(BASE + url);
      const r = await waitRoutes(p, 240000), secs = ((Date.now() - ts) / 1000).toFixed(1);
      const L = await layout(p), img = await snap(p, dn, pn);
      rec(dn, pn, 'opens and routes', r.ok, (r.n ? r.n + ' routes in ' + secs + ' s' : r.note), img);
      rec(dn, pn, 'no script errors', !errs.length, errs.slice(0, 2).join(' / '));
      rec(dn, pn, 'fits the screen', L.sw <= L.vw + 1 && L.sy === 0 && L.headTop >= 0 && L.barBottom <= L.vh + 1 && !L.off.length, 'width ' + L.sw + '/' + L.vw + (L.off.length ? ', off screen: ' + L.off.join(', ') : '') + (L.headTop < 0 ? ', top cut off' : '') + (L.barBottom > L.vh + 1 ? ', bottom bar cut off' : ''));
      rec(dn, pn, 'chart big enough to use', L.mapH >= L.vh * 0.35, 'chart ' + L.mapH + ' of ' + L.vh + ' px high');
      await ctx.close();
    }
  }
  /* 2. every control, phone and computer */
  for (const [dn, d] of DEV.filter(x => ['iPhone 13', 'Computer', 'iPhone 13 on its side'].includes(x[0]))) {
    const ctx = await b.newContext({ ...d }); await ctx.addInitScript(DONE); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(BASE + '/channel-area/?race=myth'); await waitRoutes(p, 240000);
    const tryIt = async (area, name, fn) => { try { const v = await fn(); rec(dn, area, name, v === undefined ? true : !!(v && v.ok !== false), v && v.note); } catch (e) { rec(dn, area, name, false, e.message.split('\n')[0].slice(0, 160)); } };
    await tryIt('Results', 'tabs open with content', async () => { const out = []; for (const t of ['decision', 'plan', 'fleet', 'data']) { await p.evaluate(t => { const b = document.querySelector('.tab[data-tab="' + t + '"]'); if (document.getElementById('panel').hidden) document.getElementById('panelBtn').click(); b.click(); }, t); await p.waitForTimeout(250); const len = await p.evaluate(t => document.getElementById('t-' + t).innerText.trim().length, t); out.push(t + ' ' + len); if (len < 40) return { ok: false, note: out.join(', ') }; } return { ok: true, note: out.join(', ') }; });
    await tryIt('Plan', 'Ask Route answers', async () => { await p.evaluate(() => { document.querySelector('.tab[data-tab="plan"]').click(); document.querySelector('#askRow [data-q="next"]').click(); }); await p.waitForTimeout(300); const t = await p.evaluate(() => document.getElementById('askTxt').textContent); return { ok: t.length > 20, note: t.slice(0, 80) }; });
    await tryIt('Plan', 'crew message has a link', async () => { const t = await p.evaluate(() => { const d = document.getElementById('crewPre').parentElement; d.open = true; d.dispatchEvent(new Event('toggle')); return document.getElementById('crewPre').textContent; }); return { ok: /https?:\/\//.test(t), note: t.split('\n')[0] }; });
    await tryIt('Plan', 'GPX save runs', async () => { const dl = p.waitForEvent('download', { timeout: 5000 }).catch(() => null); await p.evaluate(() => document.getElementById('xGpx').click()); const f = await dl; return { ok: !!f, note: f ? f.suggestedFilename() : 'no file' }; });
    await tryIt('Time', 'slider moves the boat', async () => { const a = await p.evaluate(() => document.getElementById('clock').textContent); await p.evaluate(() => { const t = document.getElementById('time'); t.value = 500; t.dispatchEvent(new Event('input', { bubbles: true })); }); const c = await p.evaluate(() => document.getElementById('clock').textContent); return { ok: a !== c, note: c }; });
    await tryIt('Time', 'play and pause', async () => { await p.evaluate(() => document.getElementById('play').click()); await p.waitForTimeout(1200); const v = await p.evaluate(() => document.getElementById('time').value); await p.evaluate(() => document.getElementById('play').click()); return { ok: +v > 500, note: 'slider ' + v }; });
    await tryIt('Time', 'speed menu', async () => { await p.evaluate(() => document.getElementById('spdBtn').click()); const n = await p.evaluate(() => document.querySelectorAll('#spdMenu button').length); await p.evaluate(() => document.querySelector('#spdMenu button[data-v="3"]').click()); return { ok: n >= 4, note: n + ' speeds' }; });
    await tryIt('Chart', 'layers: just the route, show all', async () => { await p.evaluate(() => document.getElementById('layersBtn').click()); await p.waitForTimeout(200); await p.evaluate(() => document.getElementById('lRoute').click()); const w = await p.evaluate(() => document.querySelector('#layers [data-l="wind"]').checked); await p.evaluate(() => document.getElementById('lAll').click()); const w2 = await p.evaluate(() => document.querySelector('#layers [data-l="wind"]').checked); await p.evaluate(() => document.getElementById('layersX') && document.getElementById('layersX').click()); return { ok: !w && w2 }; });
    await tryIt('Chart', 'screen modes', async () => { await p.evaluate(() => document.getElementById('nightBtn').click()); const n = await p.evaluate(() => document.querySelectorAll('#modeMenu button').length); await p.evaluate(() => document.querySelector('#modeMenu [data-m="dark"]').click()); return { ok: n >= 3 }; });
    await tryIt('Settings', 'every tab opens', async () => { await p.evaluate(() => document.getElementById('setBtn').click()); const out = []; for (const s of ['boat', 'fc', 'course', 'sails', 'display']) { await p.evaluate(s => document.querySelector('.stabs .tab[data-s="' + s + '"]').click(), s); const len = await p.evaluate(s => document.getElementById('s-' + s).innerText.trim().length, s); out.push(s + ' ' + len); if (len < 30) return { ok: false, note: out.join(', ') }; } await p.evaluate(() => document.getElementById('sheetX').click()); return { ok: true, note: out.join(', ') }; });
    await tryIt('Help', 'help opens with topics', async () => { await p.evaluate(() => document.getElementById('helpBtn').click()); await p.waitForTimeout(200); const n = await p.evaluate(() => document.getElementById('helpList') ? document.getElementById('helpList').innerText.length : 0); await p.keyboard.press('Escape'); await p.evaluate(() => { const x = document.querySelector('#help .close, #helpX'); if (x) x.click(); }); return { ok: n > 200, note: n + ' characters' }; });
    await tryIt('AIS', 'test fleet shows targets', async () => { await p.evaluate(() => { const s = document.getElementById('aisSrc'); s.value = 'test'; s.dispatchEvent(new Event('change')); const t = document.getElementById('time'); t.value = 300; t.dispatchEvent(new Event('input', { bubbles: true })); }); await p.waitForTimeout(800); const n = await p.evaluate(() => document.querySelectorAll('#aisTable tr[data-mmsi]').length); await p.evaluate(() => { const s = document.getElementById('aisSrc'); s.value = 'off'; s.dispatchEvent(new Event('change')); }); return { ok: n > 0, note: n + ' targets' }; });
    await tryIt('Fleet', 'add a boat', async () => { await p.evaluate(() => { document.querySelector('.tab[data-tab="fleet"]').click(); document.getElementById('mfName').value = 'Test Boat'; document.getElementById('mfTcc').value = '1.010'; document.getElementById('mfAdd').click(); }); await p.waitForTimeout(1500); const t = await p.evaluate(() => document.getElementById('fleet').innerText); return { ok: /Test Boat/.test(t) }; });
    await tryIt('Races', 'race list opens', async () => { await p.evaluate(() => document.getElementById('raceBtn').click()); await p.waitForTimeout(300); const n = await p.evaluate(() => document.querySelectorAll('#raceList .ritem').length); const img = await snap(p, dn, 'races'); await p.evaluate(() => { const x = document.getElementById('racesX'); x.click(); const w = document.getElementById('wizX'); if (!document.getElementById('wiz').hidden) w.click(); }); return { ok: n >= 5, note: n + ' races, ' + img }; });
    await tryIt('Sails', 'crossover chart draws', async () => { await p.evaluate(() => { document.getElementById('setBtn').click(); document.querySelector('.stabs .tab[data-s="sails"]').click(); }); await p.waitForTimeout(400); const ok = await p.evaluate(() => { const c = document.getElementById('slChart'); return c.width > 100 && document.querySelectorAll('.sl-r').length > 0; }); await p.evaluate(() => document.getElementById('sheetX').click()); return { ok }; });
    await tryIt('Offline', 'offline label shows', async () => { await ctx.setOffline(true); await p.evaluate(() => window.dispatchEvent(new Event('offline'))); const v = await p.evaluate(() => !document.getElementById('offBadge').hidden && document.getElementById('offBadge').getBoundingClientRect().width > 0); await ctx.setOffline(false); await p.evaluate(() => window.dispatchEvent(new Event('online'))); return { ok: v }; });
    await tryIt('Course', 'new course: draw, start time, save, route', async () => {
      await p.evaluate(() => { document.getElementById('raceBtn').click(); }); await p.waitForTimeout(300);
      await p.evaluate(() => [...document.querySelectorAll('#races button')].find(x => x.textContent.trim() === 'New course').click()); await p.waitForTimeout(400);
      const pts = await p.evaluate(() => { const r = document.getElementById('map').getBoundingClientRect(); return [[0.45, 0.62], [0.6, 0.68], [0.75, 0.6]].map(f => [r.left + r.width * f[0], r.top + r.height * f[1]]); });
      for (const [x, y] of pts) { await p.mouse.click(x, y); await p.waitForTimeout(250); }
      const n = await p.evaluate(() => (document.getElementById('edTxt').textContent || ''));
      await p.evaluate(() => document.getElementById('edDone').click()); await p.waitForTimeout(400);
      const hasWhen = await p.evaluate(() => !!document.getElementById('edDay'));
      await p.evaluate(() => { document.getElementById('edName').value = 'Check course'; document.getElementById('edSave').click(); });
      const img = await snap(p, dn, 'new-course-after-save');
      const wiz = await p.evaluate(() => !document.getElementById('wiz').hidden);
      if (wiz) { await p.evaluate(() => { for (let i = 0; i < 3; i++) document.getElementById('wizNext').click(); }); }
      const r = await waitRoutes(p, 180000);
      return { ok: hasWhen && r.ok, note: (hasWhen ? 'asked for the start; ' : 'did not ask for the start; ') + (r.ok ? r.n + ' routes' : r.note) + '; ' + img };
    });
    await tryIt('Course', 'reload reopens the last course', async () => { await p.reload(); await waitRoutes(p, 180000); const t = await p.evaluate(() => document.getElementById('raceTitle').textContent); return { ok: /Check course/.test(t), note: t }; });
    rec(dn, 'All', 'no script errors during the controls', !errs.length, errs.slice(0, 3).join(' / '));
    await ctx.close();
  }
  /* 3. first-time user: the guided set-up */
  for (const [dn, d] of DEV.filter(x => ['iPhone 13', 'Computer'].includes(x[0]))) {
    const ctx = await b.newContext({ ...d }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(BASE + '/channel-area/');
    try {
      await p.waitForSelector('#wiz:not([hidden])', { timeout: 60000 });
      const i1 = await snap(p, dn, 'setup-1');
      await p.fill('#wzName', 'Check Boat'); await p.fill('#wzTcc', '1.050'); await p.click('#wizNext');
      await p.waitForTimeout(300); const s2 = await p.evaluate(() => !document.getElementById('races').hidden);
      await p.evaluate(() => document.querySelector('[data-race="myth"]').click()); await p.waitForTimeout(600);
      const s3 = await p.evaluate(() => document.getElementById('wizH').textContent); await p.click('#wizNext'); await p.click('#wizNext');
      const i5 = await snap(p, dn, 'setup-5-check');
      const blocked = await p.evaluate(() => document.getElementById('wizNext').disabled);
      await p.click('#wizNext'); const r = await waitRoutes(p, 240000);
      rec(dn, 'Set-up', 'first-time guided set-up to routes', s2 && /3 of 5/.test(s3) && !blocked && r.ok, (r.ok ? r.n + ' routes' : r.note) + '; ' + i1 + ', ' + i5);
    } catch (e) { rec(dn, 'Set-up', 'first-time guided set-up to routes', false, e.message.split('\n')[0]); }
    rec(dn, 'Set-up', 'no script errors', !errs.length, errs.slice(0, 2).join(' / '));
    await ctx.close();
  }
  /* 4. server side: forecasts fresh, functions answer */
  const ctx = await b.newContext(); const p = await ctx.newPage(); await p.goto(BASE + '/');
  const st = await p.evaluate(async () => { const o = {}; for (const pg of ['channel-area', 'fastnet', 'northsea-area']) { try { const m = await fetch('/' + pg + '/pack/pack.json', { cache: 'no-store' }).then(r => r.json()); const pre = await fetch('/' + pg + '/pre/routes.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null); o[pg] = { ageH: Math.round((Date.now() / 1000 - m.built) / 3600), winds: m.layers.filter(l => l.kind === 'wind').map(l => l.id), pre: pre ? Object.keys(pre.r).length : 0 }; } catch (e) { o[pg] = { err: String(e) }; } }
    o.ais = await fetch('/api/ais?s=50.5&n=50.9&w=-1.6&e=-1.0').then(r => r.status).catch(() => 0); o.boat = await fetch('/api/boat/TESTAB').then(r => r.status).catch(() => 0); return o; });
  for (const pg of ['channel-area', 'fastnet', 'northsea-area']) { const s = st[pg]; rec('Server', pg, 'forecast fresh (under 9 h)', s && s.ageH <= 9, s && (s.err || s.ageH + ' h old, ' + s.winds.length + ' wind models')); rec('Server', pg, 'pre-routes for instant start', s && s.pre >= 4, s && (s.pre + ' start times')); }
  rec('Server', 'functions', 'live AIS relay answers', st.ais === 200, 'HTTP ' + st.ais); rec('Server', 'functions', 'boat code store answers', st.boat === 200, 'HTTP ' + st.boat);
  await b.close();
  const fails = R.filter(x => !x.ok), mins = ((Date.now() - t0) / 60000).toFixed(1);
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ base: BASE, at: new Date().toISOString(), mins, pass: R.length - fails.length, fail: fails.length, results: R }, null, 1));
  const md = ['# FirstShift Route check', '', `${BASE} · ${new Date().toUTCString()} · ${mins} min`, '', `**${R.length - fails.length} passed, ${fails.length} failed**`, '', '## Failures', '', ...(fails.length ? fails.map(x => `- ${x.dev} · ${x.area} · ${x.name}: ${x.note}`) : ['None.']), '', '## Everything', '', '| Device | Area | Check | Result | Note |', '|---|---|---|---|---|', ...R.map(x => `| ${x.dev} | ${x.area} | ${x.name} | ${x.ok ? 'pass' : '**FAIL**'} | ${x.note.replace(/\|/g, '/')} |`)];
  fs.writeFileSync(path.join(OUT, 'report.md'), md.join('\n'));
  console.log(`\n${R.length - fails.length} passed, ${fails.length} failed in ${mins} min`);
})();
