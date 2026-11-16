/* The phone's own keyboard (Stuart 16 Nov 22:29: "ensure on the new releases the devices driven menus don't over lay your menus").
   Chromium shows no keyboard, so the test stands in for one: the visible screen (visualViewport) shrinks by the iPhone keyboard and
   its bar (336 points upright, 209 sideways) while a field has focus. Every text field in a window placed over the chart must then
   sit in the visible part. Run: node tests/keyboard.js http://localhost:8779 [/channel-area/] */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779', PAGE = process.argv[3] || '/channel-area/';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
const sizes = [['Phone upright', devices['iPhone 13'], 336], ['Phone sideways', devices['iPhone 13 landscape'], 209], ['Small phone', devices['iPhone SE'], 260]];
(async () => { const b = await chromium.launch();
  for (const [name, dev, KB] of sizes) {
    const c = await b.newContext({ ...dev, serviceWorkers: 'block' });
    await c.addInitScript(KB => { const vv = new EventTarget(); let kb = 0; Object.defineProperties(vv, { width: { get: () => innerWidth }, height: { get: () => innerHeight - kb }, offsetTop: { get: () => 0 }, offsetLeft: { get: () => 0 }, pageTop: { get: () => scrollY }, pageLeft: { get: () => 0 }, scale: { get: () => 1 } });
      Object.defineProperty(window, 'visualViewport', { get: () => vv, configurable: true });
      const txt = e => e && /^(INPUT|TEXTAREA)$/.test(e.tagName) && !/^(checkbox|radio|range|button|file|color|submit)$/.test(e.type || '');
      document.addEventListener('focusin', e => { if (txt(e.target)) { kb = KB; vv.dispatchEvent(new Event('resize')); } }); document.addEventListener('focusout', () => { setTimeout(() => { if (!txt(document.activeElement)) { kb = 0; vv.dispatchEvent(new Event('resize')); } }, 0); });
      window.__kb = () => kb;
      document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); });
      if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); }, KB);
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + PAGE);
    await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 600000 }); await p.waitForTimeout(4000);
    const MARK = /mark/.test(PAGE);
    /* every window with text fields that a user can open: Settings, the course editor, Save, Share; on Mark, each panel */
    const opens = MARK ? [['Course, round the cans', 'FSMark.set({ tab: "course" }); FSSolent.set({ type: "marks" })'], ['Course, windward-leeward', 'FSSolent.set({ type: "wl", wl: Object.assign({}, FSSolent.state().wl, { wkind: "brg", lkind: "gate" }) }); FSMark.set({ tab: "course" })'], ['Course, tide as seen', 'FSMark.set({ tab: "course", tide: { mode: "steady" } })'], ['Start', 'FSMark.set({ tab: "start" })'], ['Settings', 'FSMark.set({ tab: "settings" })']]
      : [['Settings', '#setBtn, #settingsBtn, [aria-label="Settings"]'], ['Edit course', '#editFab'], ['Races', '#raceTitle']];
    for (const [w, sel] of opens) {
      await p.keyboard.press('Escape').catch(() => {}); await p.waitForTimeout(300);
      const hit = MARK ? await p.evaluate(sel => { (new Function(sel))(); return true; }, sel) : await p.evaluate(sel => { const e = [...document.querySelectorAll(sel)].find(x => x.getClientRects().length); if (e) { e.click(); return true; } return false; }, sel); if (!hit) { console.log('-- ' + name + ' | ' + w + ': no button on this screen'); continue; }
      await p.waitForTimeout(1200);
      const ids = await p.evaluate(() => [...document.querySelectorAll('input, textarea')].filter(e => !/^(checkbox|radio|range|button|file|color|submit|hidden)$/.test(e.type || '') && e.getClientRects().length && !e.closest('[hidden]') && getComputedStyle(e).visibility !== 'hidden').map((e, i) => { e.dataset.kbt = 'k' + i; return 'k' + i; }));
      let bad = [];
      for (const k of ids.slice(0, 12)) { const r = await p.evaluate(async k => { const e = document.querySelector('[data-kbt="' + k + '"]'); if (!e) return null; e.focus(); await new Promise(r => setTimeout(r, 700)); const q = e.getBoundingClientRect(), vh = visualViewport.height; const out = { id: e.id || e.name || e.placeholder || k, r: [q.top, q.bottom].map(Math.round), vh: Math.round(vh), kb: __kb() }; e.blur(); await new Promise(r => setTimeout(r, 400)); return out; }, k);
        if (r && r.kb && (r.r[1] > r.vh + 1 || r.r[0] < (MARK ? 0 : -1))) bad.push(r.id + ' ' + r.r.join('-') + ' visible to ' + r.vh); }
      ok(!bad.length, `${name} | ${w} | ${ids.length} text fields stay above the keyboard`, bad.join('; ') || null);
    }
    ok(!errs.length, `${name} | no page errors`, errs.join('; ') || null); await c.close(); }
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
