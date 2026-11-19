/* Button sweep (Stuart 19 Nov 18:06: "a full logic and button press check across all 4 tools"): on a fresh phone and a tablet, press every
   visible button on the main screen, then every tab and button inside Settings, one at a time. After each press: no script error, the
   page still answers, and a press that changes nothing on the screen is listed. Downloads, links out, sending, sharing, deleting and
   resetting are left alone. Run: node tests/button-sweep.js http://localhost:8779 /mark/ [phone|tablet] */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779', PATH = process.argv[3] || '/mark/', SIZE = process.argv[4] || 'phone';
const SKIP = /man overboard|mobBtn|delete|remove|forget|reset|clear all|erase|stop race|sign out|log out|share|send|whatsapp|e-?mail|download|install|\.apk|buy|pay|subscribe|record|film|camera|microphone|connect boat|boat wifi|bluetooth|copy link|print/i;
(async () => { const b = await chromium.launch();
  const c = await b.newContext({ ...(SIZE === 'tablet' ? devices['iPad Mini'] : devices['iPhone 13']), serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); window.open = () => null; window.alert = () => {}; window.confirm = () => false; window.prompt = () => null; });
  const p = await c.newPage(); let errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160))); p.on('dialog', d => d.dismiss().catch(() => {}));
  await p.route(/\.apk$|wa\.me|mailto:/, r => r.abort());
  await p.goto(BASE + PATH); await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 300000 }).catch(() => {}); await p.waitForTimeout(4000);
  const errs0 = errs.splice(0);
  /* every visible, enabled button on top at its centre, named by id or text */
  const list = () => p.evaluate((skip) => { const S = new RegExp(skip, 'i'), out = [], seen = {};
    [...document.querySelectorAll('button, [role=button], a.btn, summary')].forEach((e, i) => { const r = e.getBoundingClientRect(); if (!r.width || !r.height || e.disabled || e.closest('[hidden]')) return; const cx = r.left + r.width / 2, cy = r.top + r.height / 2; if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) return;
      const top = document.elementFromPoint(cx, cy); if (!top || !(e === top || e.contains(top))) return; const name = (e.id ? '#' + e.id : '') + ' ' + (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40); if (S.test(name) || (e.tagName === 'A' && /^http/.test(e.getAttribute('href') || '') && !e.getAttribute('href').startsWith(location.origin))) return; if (seen[name]) return; seen[name] = 1;
      e.setAttribute('data-sweep', i); out.push({ k: String(i), name: name.trim() }); }); return out; }, SKIP.source);
  const sig = () => p.evaluate(() => { const v = [...document.querySelectorAll('body *')].filter(e => e.getClientRects().length).length; const c = document.getElementById('map'); return v + ':' + document.body.className + ':' + (document.querySelector('[aria-pressed="true"]') ? document.querySelectorAll('[aria-pressed="true"]').length : 0) + ':' + [...document.querySelectorAll('input,select')].map(x => x.type === 'checkbox' ? x.checked : x.value).join('').length; });
  const alive = () => p.evaluate(() => new Promise(r => { const t = setTimeout(() => r(false), 3000); requestAnimationFrame(() => { clearTimeout(t); r(!!document.getElementById('map')); }); })).catch(() => false);
  const closeAll = async () => { for (let k = 0; k < 4; k++) { const did = await p.evaluate(() => { const x = [...document.querySelectorAll('button')].filter(e => e.getClientRects().length && /^(×|✕|x|close|done|back|cancel|not now|no thanks|skip)$/i.test((e.textContent || '').trim()) || /^close/i.test(e.getAttribute('aria-label') || '')); const t = x.find(e => { const r = e.getBoundingClientRect(), q = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return q && (e === q || e.contains(q)); }); if (t) { t.click(); return true; } return false; }); if (!did) break; await p.waitForTimeout(250); }
    await p.evaluate(() => { const m = document.getElementById('navMenuBtn'); if (m && m.getClientRects().length && !m.hidden) m.click(); }); await p.waitForTimeout(250); };   /* back out of Clear screen so the bars are there */
  const res = { tool: PATH, size: SIZE, startErrors: errs0, pressed: 0, errors: [], dead: [], nothing: [] };
  /* each press finds its button afresh (the screen redraws after every press), by name, and presses it at its centre */
  const press = async (name) => { const L = await list(), q = L.find(x => x.name === name); if (!q) return 'gone'; const xy = await p.evaluate(k => { const e = document.querySelector('[data-sweep="' + k + '"]'), r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, q.k); await p.mouse.click(xy[0], xy[1]); return 'ok'; };
  const fresh = async () => { await p.reload(); await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 300000 }).catch(() => {}); await p.waitForTimeout(3000); await closeAll(); };
  const sweep = async (tag) => { await closeAll(); const L = await list(); let first = true; for (const q of L) { if (!first) await fresh(); first = false; const before = await sig(); errs = [];   /* every press from a clean screen: a reload in between, keeping the race */
      let st; try { st = await press(q.name); } catch (e) { st = 'err ' + e.message.split('\n')[0].slice(0, 60); } if (st !== 'ok') { res.nothing.push(tag + q.name + ' (' + (st === 'gone' ? 'not on screen after closing windows' : st) + ')'); continue; }
      res.pressed++; await p.waitForTimeout(600); if (errs.length) res.errors.push(tag + q.name + ': ' + errs.join(' | '));
      if (!(await alive())) { res.dead.push(tag + q.name); await p.reload(); await p.waitForTimeout(5000); continue; }
      const after = await sig(); if (after === before) res.nothing.push(tag + q.name);
      await closeAll(); } };
  await sweep('');
  /* inside Settings: each tab, and the buttons on it */
  const sb = await p.$('#setBtn'); if (sb) { await closeAll(); await sb.click().catch(() => {}); await p.waitForTimeout(800);
    const tabs = await p.evaluate(() => [...document.querySelectorAll('[data-s]')].filter(e => e.getClientRects().length).map(e => e.dataset.s));
    for (const t of tabs) { await p.evaluate(t => { const e = document.querySelector('[data-s="' + t + '"]'); if (e) e.click(); }, t); await p.waitForTimeout(500); errs = [];
      const L = await list(); for (const q of L.filter(q => !/setBtn|^#s-|data-s/.test(q.name))) { errs = []; try { if ((await press(q.name)) !== 'ok') continue; res.pressed++; } catch (e) { continue; } await p.waitForTimeout(400); if (errs.length) res.errors.push('Settings ' + t + ': ' + q.name + ': ' + errs.join(' | ')); if (!(await alive())) { res.dead.push('Settings ' + t + ': ' + q.name); await p.reload(); await p.waitForTimeout(5000); break; }
        if (!(await p.evaluate(() => { const s = document.getElementById('sheet'); return s && !s.hidden; }))) { await closeAll(); await p.evaluate(() => { const b = document.getElementById('setBtn'); if (b) b.click(); }); await p.waitForTimeout(500); await p.evaluate(t => { const e = document.querySelector('[data-s="' + t + '"]'); if (e) e.click(); }, t); await p.waitForTimeout(300); } } } }
  console.log(JSON.stringify(res));
  console.log((res.errors.length + res.dead.length ? 'FAIL' : 'PASS') + ' ' + PATH + ' ' + SIZE + ': ' + res.pressed + ' presses, ' + res.errors.length + ' with script errors, ' + res.dead.length + ' froze, ' + res.nothing.length + ' changed nothing on screen');
  await b.close(); process.exit(res.errors.length + res.dead.length ? 1 : 0); })();
