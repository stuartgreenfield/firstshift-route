/* The simple log as a PDF (Route catch-up stage 2): from a filed track, an entry each hour with time, position, course and speed made
   good, distance run and the forecast wind; a header for the boat and crew. The PDF is checked by qpdf and read back by pdftotext.
   Run: node tests/log-pdf.js <base> */
const { chromium } = require('playwright'); const fs = require('fs'); const { execSync } = require('child_process'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block', acceptDownloads: true });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/channel-area/'); await p.waitForFunction(() => window.FSLogPdf && window.FSTracks && window.__fsWindAt, null, { timeout: 300000 }); await p.waitForTimeout(2000);
  /* 5 h 20 min sailing west from the Needles at about 11 kn, a point every 30 s, a 20-minute GPS gap in the third hour */
  const r = await p.evaluate(() => { const t0 = Date.UTC(2026, 10, 16, 6, 40), pts = []; for (let i = 0; i <= 640; i++) { const t = t0 + i * 30000; if (i > 300 && i < 340) continue; pts.push([50.66 - i * 0.00005, -1.60 - i * 0.0024, t, 6]); }
    const nmT = pts.reduce((a, q, i) => i ? a + Math.hypot((q[0] - pts[i - 1][0]) * 60, (q[1] - pts[i - 1][1]) * 60 * Math.cos(50.6 * Math.PI / 180)) : 0, 0);
    const t = { id: 'x', name: 'Test race', at: pts[0][2], end: pts[pts.length - 1][2], nm: nmT, pts }; const E = FSLogPdf.entries(t.pts); const u = FSLogPdf.build(t); let s = ''; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return { b64: btoa(s), E: E.map(e => ({ t: new Date(e.t).toISOString().slice(11, 16), cmg: e.cmg, smg: e.smg && +e.smg.toFixed(2), run: +e.run.toFixed(2), wind: !!e.wind, rem: e.rem })), nm: nmT }; });
  ok(r.E.length === 7 && r.E[0].t === '06:40' && r.E[1].t === '07:00' && r.E[6].t === '12:00', 'an entry at the start, each whole hour and the end', r.E.map(e => e.t).join(' '));
  ok(r.E.slice(2).every(e => e.cmg >= 260 && e.cmg <= 275) && r.E.slice(2, 6).every(e => e.smg > 10 && e.smg < 12), 'course and speed made good over each hour', JSON.stringify(r.E.slice(1, 4).map(e => [e.cmg, e.smg])));
  ok(Math.abs(r.E[6].run - r.nm) < 0.05, 'distance run adds up to the track', r.E[6].run + ' of ' + r.nm.toFixed(2) + ' nm');
  ok(r.E.some(e => /GPS gap 20 min/.test(e.rem)) && /Log starts/.test(r.E[0].rem) && /Log ends/.test(r.E[6].rem), 'remarks: start, end, the GPS gap', JSON.stringify(r.E.map(e => e.rem).filter(Boolean)));
  ok(r.E.some(e => e.wind), 'the forecast wind where there is forecast', r.E.filter(e => e.wind).length + ' of ' + r.E.length);
  const f = '/tmp/claude-0/log-test.pdf'; fs.writeFileSync(f, Buffer.from(r.b64, 'base64'));
  let q = ''; try { q = execSync('qpdf --check ' + f + ' 2>&1').toString(); } catch (e) { q = String(e.stdout || e.message); }
  ok(/No syntax or stream encoding errors/.test(q), 'the PDF is sound (qpdf)', q.split('\n').slice(-3).join(' '));
  const txt = execSync('pdftotext -layout ' + f + ' -').toString();
  ok(/Log: Test race/.test(txt) && /Yacht:/.test(txt) && /Skipper:/.test(txt) && /Course made/.test(txt) && /0700/.test(txt) && /50°39\.\d\d'N/.test(txt), 'it reads back: title, the header for boat and crew, the columns, times, positions', txt.split('\n').filter(l => /0700/.test(l))[0]);
  await p.evaluate(() => { FSTracks.file(window.__fsTrail ? [[50.7, -1.3, Date.now() - 600000, 5], [50.71, -1.31, Date.now(), 5]] : [], 'Card test'); }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !!document.querySelector('#trkCard [data-k="log"]') && !!document.querySelector('#trkList [data-k="log"]')), 'Log (PDF) on the filed-track card and in My tracks');
  ok(errs.length === 0, 'no page errors', errs.slice(0, 3).join(' | '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
