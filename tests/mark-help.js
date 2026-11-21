/* Every Mark help topic has its picture and its voice recording. Run: node tests/mark-help.js [base] */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['Galaxy Tab S4'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSHelpFind && document.getElementById('helpBtn'), null, { timeout: 300000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x && x.offsetParent) x.click(); document.getElementById('helpBtn').click(); }); await p.waitForTimeout(1500);
  const man = await p.evaluate(() => fetch('../helpmedia/voice/voice.json').then(r => r.json()));
  const r = await p.evaluate(async (FM) => { const out = { bad: [], novoice: [] }; for (const t of FSHelpFind.topics().filter(x => FM.includes(x.t))) { const ok = await new Promise(res => { const im = new Image(); im.onload = () => res(im.naturalWidth > 0); im.onerror = () => res(false); im.src = '../helpmedia/shots/' + t.s + '.webp'; }); if (!ok) out.bad.push(t.s); } return out; }, await p.evaluate(() => window.FSMarkHelp));
  const tops = await p.evaluate(() => FSHelpFind.topics().filter(x => window.FSMarkHelp.includes(x.t)).map(x => x.s + '-' + FSHelpFind.hash(x.t + '. ' + x.text)));
  r.novoice = tops.filter(k => !man[k]);
  await p.evaluate(() => FSHelpFind.open('the-start-screen')); await p.waitForTimeout(1200); require('fs').mkdirSync('/tmp/claude-0/ui', { recursive: true }); await p.screenshot({ path: '/tmp/claude-0/ui/mhelp-topic.png' });
  ok(tops.length > 0, 'Mark has help topics', tops.length); ok(!r.bad.length, 'Every Mark topic has its picture', r.bad); ok(!r.novoice.length, 'Every Mark topic has its voice recording', r.novoice); ok(errs.length === 0, 'No script errors', errs.slice(0, 3));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
