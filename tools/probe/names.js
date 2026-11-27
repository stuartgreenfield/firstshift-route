const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const out = {};
  for (const [name, url] of [['Route', 'http://127.0.0.1:8779/fastnet/'], ['Mark', 'http://127.0.0.1:8779/mark/'], ['Route+', 'http://127.0.0.1:8778/fastnet/'], ['Mark+', 'http://127.0.0.1:8778/mark/']]) {
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const p = await c.newPage(); await p.goto(url); await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(40000);
    /* open Help and the tour list so their text is built too */
    await p.evaluate(() => { ['helpBtn', 'setBtn'].forEach(i => { const e = document.getElementById(i); if (e) try { e.click(); } catch (x) {} }); }); await p.waitForTimeout(3000);
    out[name] = await p.evaluate(() => { const res = [], seen = {}; const RE = /\b(Route\+|Mark\+|Route|Mark|Navigate|Solent)(?![a-z])/g;
      function add(where, txt) { txt = txt.replace(/\s+/g, ' '); let m; RE.lastIndex = 0; while ((m = RE.exec(txt))) { const s = txt.slice(Math.max(0, m.index - 45), m.index + 55).trim(); const k = m[1] + '|' + s; if (seen[k]) continue; seen[k] = 1; res.push({ w: m[1], ctx: s, where: where }); } }
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; const done = new Set();
      while ((n = tw.nextNode())) { let pe = n.parentElement; if (!pe || /^(SCRIPT|STYLE)$/.test(pe.tagName)) continue; while (pe.parentElement && /^(SPAN|B|I|A|EM|STRONG|SUP|SUB|U)$/.test(pe.tagName)) pe = pe.parentElement; if (done.has(pe)) continue; done.add(pe); const host = pe.closest('[id]'); let own = ''; pe.childNodes.forEach(c => { if (c.nodeType === 3) own += c.textContent; else if (c.nodeType === 1 && /^(SPAN|B|I|A|EM|STRONG|SUP|SUB|U)$/.test(c.tagName)) own += c.textContent; else own += ' | '; }); add(host ? host.id : '?', own); }
      document.querySelectorAll('[placeholder],[title],[aria-label],[alt]').forEach(e => ['placeholder', 'title', 'aria-label', 'alt'].forEach(a => { const v = e.getAttribute(a); if (v) add('attr ' + a + ' #' + ((e.closest('[id]') || {}).id || '?'), v); }));
      add('page title', document.title); return res; });
    await c.close(); }
  fs.writeFileSync('/tmp/claude-0/probe/names.json', JSON.stringify(out, null, 1));
  for (const k in out) { const cnt = {}; out[k].forEach(r => cnt[r.w] = (cnt[r.w] || 0) + 1); console.log(k, JSON.stringify(cnt)); } await b.close(); })();
