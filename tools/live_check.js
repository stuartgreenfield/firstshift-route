/* Live check (Stuart 20 Nov 22:28: "we must put an auto check in place - crucial").
   On 20 Nov the release went to the live site at 20:15, but main still held the old code, and the 20:52 forecast run rebuilt
   the live site from main: old Route, Mark, Route+ and Mark+ were back within 40 minutes and nothing said so.
   This compares the live site with this checkout (main): Route's and Mark's version, and the Route+ and Mark+ downloads byte for byte.
   Run: node tools/live_check.js [base] [--wait minutes]   (exit 1 on any difference; the forecast job runs it after every publish) */
const fs = require('fs'), crypto = require('crypto'), path = require('path');
const args = process.argv.slice(2), wi = args.indexOf('--wait');
const WAIT = wi >= 0 ? +args[wi + 1] : 0; if (wi >= 0) args.splice(wi, 2);
const BASE = (args[0] || 'https://firstshift-route.pages.dev').replace(/\/$/, '');
const ROOT = path.join(__dirname, '..');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const ver = t => (String(t).match(/Route v0\.\d+\.\d+/) || [])[0] || null;
const want = {
  route: ver(fs.readFileSync(path.join(ROOT, 'site/cervantes/app.js'), 'utf8')),
  routePlus: sha(fs.readFileSync(path.join(ROOT, 'site/android/navigate.apk'))),
  markPlus: sha(fs.readFileSync(path.join(ROOT, 'site/android/markplus.apk')))
};
const get = async u => { const r = await fetch(BASE + u + '?live_check=' + Date.now(), { cache: 'no-store' }); if (!r.ok) throw new Error(u + ' HTTP ' + r.status); return Buffer.from(await r.arrayBuffer()); };
async function once() {
  const bad = [];
  for (const [name, u] of [['Route', '/channel-area/app.js'], ['Mark', '/mark/app.js']]) {
    try { const v = ver(await get(u)); if (v !== want.route) bad.push(name + ': live ' + v + ', main ' + want.route); } catch (e) { bad.push(name + ': ' + e.message); }
  }
  for (const [name, u, w] of [['Route+ download', '/android/navigate.apk', want.routePlus], ['Mark+ download', '/android/markplus.apk', want.markPlus]]) {
    try { const h = sha(await get(u)); if (h !== w) bad.push(name + ': live ' + h.slice(0, 12) + ', main ' + w.slice(0, 12)); } catch (e) { bad.push(name + ': ' + e.message); }
  }
  return bad;
}
(async () => {
  const until = Date.now() + WAIT * 60000; let bad;
  for (;;) { bad = await once(); if (!bad.length || Date.now() > until) break; await new Promise(r => setTimeout(r, 30000)); }   /* Cloudflare takes a minute or two to publish */
  if (bad.length) { console.log('LIVE CHECK FAILED (' + BASE + ')\n- ' + bad.join('\n- ')); process.exit(1); }
  console.log('Live check passed (' + BASE + '): Route and Mark ' + want.route + ', Route+ and Mark+ downloads match main');
})();
