/* Differential check for the GPS window refactor (22 Nov 2026, Stuart 18:18 "begin the code untangling"): the old liveShow0 (tools/livewin_old.js,
   complexity 154) against the GPS window functions now in site/cervantes/app.js, in about 45,000 states (fix kinds, before the start with
   every line state, racing on and off track, mini, big, info, alarm) and every button's action. Run: node tools/livewin_diff.js */
const fs = require('fs'), vm = require('vm');
function mkEnv() {
  const log = [], els = {};
  const el = id => els[id] || (els[id] = { id, innerHTML: '', hidden: false, value: '', cls: new Set(), onclick: null, classList: null });
  const $ = id => { const e = el(id); if (!e.classList) e.classList = { remove: c => e.cls.delete(c), add: c => e.cls.add(c), toggle: (c, f) => { if (f === undefined ? !e.cls.has(c) : f) e.cls.add(c); else e.cls.delete(c); }, contains: c => e.cls.has(c) }; return e; };
  const g = { $, log, els, Math, String, Object, JSON, Number,
    LIVE: {}, S: { sel: null, inshore: false }, meta: { course: { name: 'Race', start: { lat: 50, lon: -1 } } }, T0: 1795000000,
    window: { FS_HIDE: undefined, FSSolent: null, FSTracks: { file: () => (log.push('file'), true) } },
    FSTracks: { file: () => (log.push('file'), true) }, FSSolent: null,
    liveStop: () => log.push('liveStop'), liveShow: () => log.push('liveShow'), followBoat: () => log.push('follow'), draw: () => log.push('draw'), store: (k, v) => log.push('store ' + k + '=' + v),
    liveInfo: () => '<div id="lvInfoX">INFO</div>', lineGet: () => g.__line || {}, wizEsc: s => String(s).replace(/</g, '&lt;'), tsOf: p => p.map(q => q.t), clockAbs: e => 'Sun 22 Nov ' + new Date(e * 1000).toISOString().slice(11, 16), tzS1: () => 'UTC',
    linePing: w => log.push('ping ' + w), lineKey: () => 'fs-line', liveCalc: () => ({ recalc: 1 }), busy: t => log.push('busy ' + t), run: () => log.push('run'), liveBeep: () => log.push('beep'), liveReroute: () => log.push('reroute') };
  g.window.__fsLineSet = () => log.push('lineset'); g.window.__fsStartScreen = () => log.push('startscreen');
  return g;
}
function load(file) { return fs.readFileSync(file, 'utf8'); }
function runOne(code, st) {
  const g = mkEnv(); Object.assign(g.LIVE, JSON.parse(JSON.stringify(st.LIVE))); g.S.sel = st.sel ? { r: { path: [{ t: 3 }, { t: 9 }] } } : null; g.S.inshore = !!st.inshore; g.__line = st.lineGet;
  if (st.kit) { g.window.FSSolent = { kit: 1 }; g.FSSolent = g.window.FSSolent; } if (st.hide) g.window.FS_HIDE = st.hide; if (st.noMeta) g.meta = null;
  g.$('xteLim').value = st.xl; g.$('behLim').value = st.bl; g.$('startSel').value = '1795003600';
  vm.createContext(g); vm.runInContext(code + '\nliveShow0();', g);
  const snap = () => JSON.stringify({ box: [g.els.liveBox && g.els.liveBox.innerHTML, g.els.liveBox && [...g.els.liveBox.cls].sort()], big: g.els.liveBig && [g.els.liveBig.innerHTML, g.els.liveBig.hidden, [...g.els.liveBig.cls].sort()], live: Object.fromEntries(Object.entries(g.LIVE).map(([k, v]) => [k, k === 'alarm' ? !!v : v])), log: g.log });
  const out = [snap()];
  const ids = Object.keys(g.els).filter(k => g.els[k].onclick).sort();
  for (const id of ids) { const L0 = JSON.stringify(g.LIVE); g.log.length = 0; try { g.els[id].onclick(); } catch (e) { g.log.push('ERR ' + e.message); } out.push(id + ' ' + JSON.stringify(g.log) + ' ' + JSON.stringify(Object.assign({}, g.LIVE, { alarm: !!g.LIVE.alarm })) + ' ' + JSON.stringify(g.meta)); Object.assign(g.LIVE, JSON.parse(L0)); }
  return out.join('\n');
}
const path = require('path'), A = load(path.join(__dirname, 'livewin_old.js')), app = load(path.join(__dirname, '../site/cervantes/app.js')), B = app.slice(app.indexOf('/* The GPS window'), app.indexOf('  function liveReroute('));
const fixes = [{ acc: 5, sog: 6.24, cog: 237.6, la: 50, lo: -1 }, { acc: 12, sog: 0.3, cog: 10 }, { acc: 8, sog: null, cog: null }, { acc: 300 }, { acc: 4000 }, { acc: 20, sog: 12.4, cog: 359.8, dr: true, rad: 0.05 }, { acc: 20, sog: 4, cog: 90, dr: true, rad: 0.32 }];
const lines = [undefined, {}, { boat: [50, -1] }, { pin: [50.01, -1] }, { boat: [50, -1], pin: [50.01, -1.01], d: 0.05, over: true, ttl: -20, ttlBy: 'good', ttlV: 6.21, burn: -35, fav: 'pin', favM: 12.4, favDeg: 4.6, windSrc: 'race', wind: [10, 225], len: 0.21 }, { boat: [50, -1], pin: [50.01, -1.01], d: 0.6, over: false, ttl: 245, burn: 70, fav: 'boat', favM: 3, favDeg: 1, windSrc: 'fc', wind: [8, 18], len: 0.3 }, { d: 0.3, over: false, ttl: null, burn: null, len: 0.2 }];
const pres = [900, 300, 120, -15, 5000, 90000].flatMap(secs => lines.map(line => ({ secs, line, name: 'Cowes <RYS>', to: { brg: 123.4, nm: 2.34 } })));
const races = [];
const xtes = [null, { d: 0.01, side: 'L' }, { d: 0.07, side: 'R' }, { d: 0.6, side: 'L' }, { d: 12.3, side: 'R' }];
const rjs = [null, { kind: 'catch', steer: 245, brg: 250, sog: 6.2, nm: 1.3, ta: 5.5, lost: 0, tack: false }, { kind: 'back', steer: 3, brg: 359, sog: 4.1, nm: 12.6, ta: 7.25, lost: 0.4, tack: true }];
for (const xte of xtes) for (const ahead of [0.4, 12.6, -75.2, -3]) for (const rejoin of rjs) for (const toPlan of [null, { brg: 12, nm: 0.42 }]) races.push({ xte, ahead, rejoin, toPlan, nowH: 2 });
const lives = [{}, { mini: true }, { big: true }, { info: true }, { big: true, info: true }, { mini: true, big: true }, { alarm: true }, { cmp: 'Routing from the boat…' }];
let n = 0, bad = 0;
function check(st) { n++; const a = runOne(A, st), b = runOne(B, st); if (a !== b) { bad++; if (bad <= 3) { const al = a.split('\n'), bl = b.split('\n'); for (let i = 0; i < Math.max(al.length, bl.length); i++) if (al[i] !== bl[i]) { console.log('DIFF', JSON.stringify(st).slice(0, 300)); console.log(' old:', (al[i] || '').slice(0, 1500)); console.log(' new:', (bl[i] || '').slice(0, 1500)); break; } } } }
for (const fix of fixes) for (const L of lives) {
  check({ LIVE: Object.assign({ fix, calc: null }, L), xl: '', bl: '' });
  for (const pre of pres) for (const kit of [0, 1]) check({ LIVE: Object.assign({ fix, calc: { pre }, trail: [[1, 2]] }, L), xl: '0.5', bl: '10', kit, sel: 1, lineGet: { transit: kit, boat: pre.line && pre.line.boat, pin: pre.line && pre.line.pin }, inshore: kit });
  for (const r of races) for (const sel of [0, 1]) for (const [xl, bl] of [['0.5', '10'], ['', ''], ['0', '0']]) check({ LIVE: Object.assign({ fix, calc: r, trail: [] }, L), xl, bl, sel, hide: sel ? 'Fold' : undefined });
}
check({ LIVE: { fix: null } }); check({ LIVE: { fix: fixes[0], calc: { pre: pres[4] } }, noMeta: 1, xl: '', bl: '' });
console.log(n + ' states, ' + bad + ' differ'); process.exit(bad ? 1 : 0);
