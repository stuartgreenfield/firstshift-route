/* FirstShift Mark: its own screen (Stuart 16 Nov 2026 22:25: "Start from the beginning and build mark and mark+ over night").
   Built to MARK-DESIGN-BRIEF-2026-11-16.md, approved in Stuart's answers 21:58 to 22:29:
   - one panel at a time at the foot of a phone (Course, Start, Race, After), the chart always above it; beside the chart on a pad;
   - one thumb: every action at the foot, nothing smaller than 48 points; big buttons as an option; sunlight mode;
   - nothing covers anything else, the phone's own bars and keyboard included (tests/mark-screen.js);
   - Mark's own thin top bar: Mark · Solent, the race, the gun, Settings. No offshore top bar, results panel or Plotter bar;
   - the engine underneath (chart, tide, wind, router, GPS) is Route's; the Solent marks and course builder are solent.js;
   - the plain Mark takes the wind and tide by hand (22:23); Mark+ reads them from the boat (Route+).
   Corrected time: IRC for now (22:23). Sounds and vibration: the user turns them on or off in Settings (22:23, "Managed"). */
(function () {
  if (!window.FS_MARK) return;
  'use strict';
  var R = Math.PI / 180, KEY = 'fs-mark';
  function $(id) { return document.getElementById(id); }
  function ld(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function sv(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function p3(b) { return ('00' + Math.round(((b % 360) + 360) % 360) % 360).slice(-3) + '°'; }
  function dist(nm) { return nm < 0.1 ? Math.round(nm * 1852) + ' m' : nm.toFixed(nm < 10 ? 2 : 1) + ' nm'; }
  function mmss(t) { var a = Math.abs(Math.round(t)); return (t < 0 ? '−' : '') + Math.floor(a / 60) + ':' + ('0' + a % 60).slice(-2); }
  function hhmm(ep) { var d = new Date(ep * 1000); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function rh(a, b) { var k = Math.cos(a.lat * R), dx = (b.lon - a.lon) * k * 60, dy = (b.lat - a.lat) * 60; return { nm: Math.hypot(dx, dy), brg: (Math.atan2(dx, dy) / R + 360) % 360 }; }
  var plus = !!window.__navWind;   /* Mark+: the boat's instruments (Route+ engine) */
  var M = ld(KEY, null) || {};
  M = Object.assign({ tab: 'course', seq: 5, flag: 'P', gun: null, big: false, snd: true, vib: true, sun: false, wind: null, tide: null, routeIt: false, models: ['ukv'], finAt: null, cls: '' }, M);
  function save() { sv(KEY, M); }
  function SOL() { return window.FSSolent && FSSolent.state ? FSSolent.state() : null; }
  function solSet(o) { if (window.FSSolent && FSSolent.set) FSSolent.set(o); }
  function toast(t) { try { if (window.NavToast) return window.NavToast(t); } catch (e) {} }
  function fix() { try { var f = window.__fsLiveFix && window.__fsLiveFix(); return f && !f.dr && Date.now() - f.at < 30000 ? f : null; } catch (e) { return null; } }
  function anyFix() { try { var f = window.__fsLiveFix && window.__fsLiveFix(); return f && Date.now() - f.at < 120000 ? f : null; } catch (e) { return null; } }   /* for figures shown, not for pings: a fix up to two minutes old, or dead reckoning */
  function onLand(la, lo) { try { return !!(window.__fsOnLand && window.__fsOnLand(la, lo)); } catch (e) { return false; } }
  document.documentElement.classList.add('mk');

  /* ---------- the screen ---------- */
  function css() {
    if ($('mkCss')) return; var s = document.createElement('style'); s.id = 'mkCss';
    s.textContent =
      /* Route's offshore screen is not used on Mark */
      'html.mk .top,html.mk #panel,html.mk .bar,html.mk .fabhelp,html.mk #navStrip,html.mk #fsPlot,html.mk #astroLine,html.mk #updBar,html.mk .cbanner,html.mk .adjpill,html.mk .newdata,html.mk #boatWarn,html.mk .prog,html.mk #liveBox,html.mk .chartcredit,' +
      'html.mk #solCard,html.mk #solStep,html.mk #solLegs,html.mk #solAfter,html.mk #solChain,html.mk #solPick,html.mk #solSheet,html.mk .solpop,html.mk .solpick,html.mk .solchain,html.mk .solstep,html.mk #wiz,html.mk .splash{display:none!important}' +
      'html.mk body{overflow:hidden}' +
      'html.mk .app{position:fixed;left:0;right:var(--mkW,0px);top:calc(env(safe-area-inset-top,0px) + var(--mkT,52px));bottom:var(--mkH,0px);height:auto;grid-template-rows:minmax(0,1fr);grid-template-columns:minmax(0,1fr)}' +
      'html.mk .mobbtn.mobfab{bottom:var(--mkMob,12px)!important;left:max(12px,env(safe-area-inset-left,0px))!important;top:auto!important;width:52px;height:52px;font-size:12px}' +
      /* the thin top bar */
      '.mktop{position:fixed;left:0;right:0;top:0;z-index:20;display:flex;align-items:center;gap:8px;padding:calc(env(safe-area-inset-top,0px) + 4px) max(10px,env(safe-area-inset-right,0px)) 4px max(10px,env(safe-area-inset-left,0px));min-height:52px;box-sizing:border-box;background:var(--panel);border-bottom:1px solid var(--line);color:var(--ink)}' +
      '.mktop .mkn{display:flex;align-items:baseline;gap:6px;font:700 17px var(--f-head);white-space:nowrap;flex:none}.mktop .mkn small{font:600 12px var(--f-head);color:#ff8a1f}' +
      '.mktop .mkr{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:600 13px var(--f-body);color:var(--muted)}' +
      '.mktop .mkg{flex:none;font:700 15px var(--f-data);color:var(--ink)}' +
      '.mkib{flex:none;min-width:48px;height:44px;border-radius:10px;border:1px solid var(--line);background:var(--soft,transparent);color:var(--ink);font:600 13px var(--f-head);display:grid;place-items:center;cursor:pointer}' +
      /* the panel */
      '.mkpanel{position:fixed;left:0;right:0;bottom:0;z-index:20;background:var(--panel);color:var(--ink);border-top:1px solid var(--line);display:flex;flex-direction:column;max-height:min(46%,520px);padding:0 max(10px,env(safe-area-inset-right,0px)) env(safe-area-inset-bottom,0px) max(10px,env(safe-area-inset-left,0px));box-shadow:0 -6px 20px rgba(0,0,0,.25)}' +
      '.mkbody{overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;padding:10px 2px 10px;display:grid;grid-template-columns:minmax(0,1fr);gap:10px;min-height:0}' +
      '.mktabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;padding:6px 0 4px;border-bottom:1px solid var(--line)}' +
      '.mktabs button{min-width:0;padding:0 2px;overflow:hidden;text-overflow:ellipsis;min-height:48px;border-radius:10px;border:1px solid transparent;background:none;color:var(--muted);font:700 14px var(--f-head);cursor:pointer}' +
      '.mktabs button[aria-selected="true"]{background:var(--soft,rgba(127,127,127,.15));color:var(--ink);border-color:var(--line)}' +
      '.mkrow{display:flex;flex-wrap:wrap;gap:8px;align-items:center;min-width:0}.mkrow>*{max-width:100%;box-sizing:border-box}.mkrow>label{font:600 13px var(--f-head);color:var(--muted);min-width:72px}' +
      '.mkb{min-height:48px;min-width:48px;padding:4px 14px;white-space:normal;line-height:1.15;border-radius:10px;border:1px solid var(--line);background:var(--soft,transparent);color:var(--ink);font:700 14px var(--f-head);cursor:pointer}' +
      '.mkb.pri{background:#ff8a1f;border-color:#ff8a1f;color:#111}.mkb[aria-pressed="true"]{background:var(--ink);color:var(--panel);border-color:var(--ink)}.mkb.warn{background:#dc2626;border-color:#dc2626;color:#fff}' +
      '.mkb:disabled{opacity:.45}' +
      '.mkin{min-height:48px;box-sizing:border-box;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font:600 16px var(--f-data);padding:0 10px;width:6.5em}' +
      '.mkin.wide{flex:1;min-width:10em;width:auto}' +
      '.mkh{font:700 15px var(--f-head);margin:2px 0 0}.mknote{font:13px/1.45 var(--f-body);color:var(--muted);margin:0}' +
      '.mkbig{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}' +
      '.mkbig>div{border:1px solid var(--line);border-radius:12px;padding:6px 10px;display:grid;align-content:start}.mkbig small{font:600 12px var(--f-head);color:var(--muted);text-transform:uppercase;letter-spacing:.04em}' +
      '.mkbig b{font:700 30px/1.1 var(--f-data);color:var(--ink)}.mkbig b.ok{color:#16a34a}.mkbig b.bad{color:#dc2626}.mkbig span{font:13px var(--f-body);color:var(--muted)}' +
      '.mklegs{width:100%;border-collapse:collapse;font:14px var(--f-data)}.mklegs td{padding:6px 4px;border-top:1px solid var(--line);vertical-align:top}.mklegs small{color:var(--muted);font-family:var(--f-body)}' +
      '.mkmk{display:flex;flex-wrap:wrap;gap:6px}.mkmk .mkchip{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--line);border-radius:10px;padding:0 4px 0 10px;min-height:48px;font:700 15px var(--f-data)}' +
      '.mkchip button{min-width:44px;min-height:44px;border:0;background:none;color:var(--ink);font:700 14px var(--f-head);cursor:pointer;border-radius:8px}' +
      '.mkwarn{border:2px solid #dc2626;border-radius:12px;padding:8px 10px;font:700 16px var(--f-head);color:#dc2626}' +
      '.mkpick{position:fixed;left:calc((100% - var(--mkW,0px)) / 2);transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + var(--mkT,52px) + 8px);z-index:21;background:#ff8a1f;color:#111;border-radius:12px;padding:6px 6px 6px 14px;display:flex;gap:10px;align-items:center;font:700 14px var(--f-head);max-width:calc(100% - var(--mkW,0px) - 24px);box-sizing:border-box}' +
      '.mkset{display:grid;gap:8px}' +
      /* a pad, or any wide screen: the panel beside the chart */
      '@media (min-width:900px){.mkpanel{left:auto;padding-left:12px;top:calc(env(safe-area-inset-top,0px) + var(--mkT,52px));width:400px;max-height:none;border-top:0;border-left:1px solid var(--line);box-shadow:none}}' +
      /* phone held sideways: the panel beside the chart too, narrower */
      '@media (orientation:landscape) and (max-height:500px){.mkpanel{left:auto;padding-left:10px;top:calc(env(safe-area-inset-top,0px) + var(--mkT,44px));width:min(46%,380px);max-height:none;border-top:0;border-left:1px solid var(--line)}.mktop{min-height:44px}.mkbig b{font-size:24px}.mktabs button{min-height:44px}}' +
      /* big buttons (Settings) and sunlight */
      'html.mkbigui .mkb,html.mkbigui .mktabs button{min-height:60px;font-size:17px}html.mkbigui .mkin{min-height:60px;font-size:19px}html.mkbigui .mkbig b{font-size:38px}' +
      'html.mksun{--ink:#000;--muted:#222;--panel:#fff;--bg:#fff;--line:#000}html.mksun .mkbig b{font-weight:800}';
    document.head.appendChild(s);
  }
  var top, panel;
  function build() {
    css(); if ($('mkTop')) return;
    top = document.createElement('div'); top.id = 'mkTop'; top.className = 'mktop'; top.setAttribute('role', 'banner');
    top.innerHTML = '<span class="mkn">Mark<small>· ' + esc(window.FS_AREA || 'Solent') + '</small></span><span class="mkr" id="mkRace"></span><span class="mkg" id="mkGun"></span><button class="mkib" id="mkSetBtn" aria-label="Settings">Settings</button>';
    document.body.appendChild(top);
    panel = document.createElement('section'); panel.id = 'mkPanel'; panel.className = 'mkpanel'; panel.setAttribute('aria-label', 'Mark');
    panel.innerHTML = '<div class="mktabs" role="tablist">' + ['course', 'start', 'race', 'after'].map(function (t) { return '<button role="tab" data-tab="' + t + '" id="mkTab-' + t + '">' + t[0].toUpperCase() + t.slice(1) + '</button>'; }).join('') + '</div><div class="mkbody" id="mkBody" role="tabpanel"></div>';
    document.body.appendChild(panel);
    panel.querySelector('.mktabs').onclick = function (e) { var b = e.target.closest('[data-tab]'); if (!b) return; M.tab = b.dataset.tab; M.auto = false; M.autoAt = Date.now(); save(); render(); };
    $('mkSetBtn').onclick = function () { M.tab = M.tab === 'settings' ? (M.back || 'course') : (M.back = M.tab, 'settings'); save(); render(); };
    panel.addEventListener('click', act); panel.addEventListener('change', change);
    fitRO(); applyLook(); render(); setInterval(tick, 1000);
  }
  /* the chart fits exactly between the top bar and the panel, so nothing sits on top of it but the course, the boat and man overboard */
  function fitRO() { var f = function () { if (!panel || !top) return; var side = innerWidth >= 900 || (innerWidth > innerHeight && innerHeight <= 500), pr = panel.getBoundingClientRect(), tr = top.getBoundingClientRect(), ds = document.documentElement.style;
      ds.setProperty('--mkT', Math.round(tr.height - (parseFloat(getComputedStyle(top).paddingTop) - 4)) + 'px');
      ds.setProperty('--mkH', side ? '0px' : Math.round(innerHeight - pr.top) + 'px'); var ib = window.__fsInsets ? window.__fsInsets().b : 0; ds.setProperty('--mkMob', Math.round((side ? ib : innerHeight - pr.top) + 12) + 'px');   /* man overboard clear of the panel and of the home bar */ ds.setProperty('--mkW', side ? Math.round(innerWidth - pr.left) + 'px' : '0px');
      if (f.w !== innerWidth + 'x' + innerHeight + ':' + Math.round(pr.top) + ':' + Math.round(pr.left)) { f.w = innerWidth + 'x' + innerHeight + ':' + Math.round(pr.top) + ':' + Math.round(pr.left); try { window.dispatchEvent(new Event('resize')); } catch (e) {} } };
    if (window.ResizeObserver) { new ResizeObserver(function () { setTimeout(f, 0); }).observe(panel); new ResizeObserver(function () { setTimeout(f, 0); }).observe(top); }
    window.addEventListener('resize', function () { setTimeout(f, 50); }); f(); setTimeout(f, 300); }
  function applyLook() { var d = document.documentElement.classList; d.toggle('mkbigui', !!M.big); d.toggle('mksun', !!M.sun); }

  /* ---------- the race: course, gun and stage ---------- */
  function course() { try { return window.__navCourse && window.__navCourse(); } catch (e) { return null; } }
  function gunAt() { return M.gun || null; }
  function stage() { var g = gunAt(), now = Date.now() / 1000; if (M.finAt) return 'after'; if (g && now >= g) return 'race'; if (g && g - now <= 600) return 'start'; return 'course'; }
  var lastStage = null;
  function tick() {
    var st = stage(); if (st !== lastStage) { if (lastStage && (M.auto !== false || Date.now() - (M.autoAt || 0) > 120000) && M.tab !== 'settings') { M.tab = st; save(); render(); } lastStage = st; }   /* the panel follows the race; a tab chosen by hand holds for two minutes */
    if (M.tab === 'start' || M.tab === 'race') live(); topBar(); sounds();
  }
  function topBar() { var c = course(), g = gunAt(); if ($('mkRace')) $('mkRace').textContent = c ? c.name.replace(/ \d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d\d:\d\d$/, '') : 'No course yet';
    if ($('mkGun')) { var now = Date.now() / 1000; $('mkGun').textContent = g ? (now < g ? 'Gun ' + mmss(g - now) : 'Race ' + mmss(now - g)) : ''; } }

  /* ---------- panels ---------- */
  function render() {
    if (!panel) return; [].forEach.call(panel.querySelectorAll('[data-tab]'), function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === M.tab)); });
    var h = M.tab === 'start' ? startHtml() : M.tab === 'race' ? raceHtml() : M.tab === 'after' ? afterHtml() : M.tab === 'settings' ? setHtml() : courseHtml();
    var b = $('mkBody'), y = b.scrollTop; b.innerHTML = h; b.scrollTop = y; topBar(); if (M.tab === 'start' || M.tab === 'race') live();
  }
  function seg(k, v, lab, on) { return '<button class="mkb" data-k="' + k + '" data-v="' + v + '" aria-pressed="' + !!on + '">' + lab + '</button>'; }
  /* Course */
  function courseHtml() {
    var B = SOL() || { type: 'marks', marks: [], wl: {} }, w = B.wl || {}, h = '';
    h += '<div class="mkrow"><button class="mkb pri" data-k="new">New course</button>' + seg('type', 'marks', 'Round the cans', B.type !== 'wl') + seg('type', 'wl', 'Windward-leeward', B.type === 'wl') + '</div>';
    h += '<p class="mkh">Start</p><div class="mkrow">' + seg('startk', 'line', 'The start line', !!(B.start && B.start.line)) + seg('startk', 'tap', 'Tap a mark', !!(B.start && !B.start.line)) + '<span class="mknote">' + (B.start ? esc(B.start.name) : 'Not set') + '</span></div>';
    if (B.type !== 'wl') {
      h += '<p class="mkh">Marks</p><div class="mkrow"><input class="mkin wide" id="mkCodes" inputmode="text" autocapitalize="characters" placeholder="Codes or a pasted message: 3G P, 4F S" aria-label="Mark codes from the board or a pasted message"><button class="mkb pri" data-k="codes">Add</button></div>';
      h += '<div class="mkrow"><button class="mkb" data-k="pick" data-v="port" aria-pressed="' + (PICK === 'mark-port') + '">Tap buoys: Port</button><button class="mkb" data-k="pick" data-v="starboard" aria-pressed="' + (PICK === 'mark-starboard') + '">Tap buoys: Starboard</button></div>';
      h += '<div class="mkmk">' + ((B.marks || []).map(function (m, i) { return '<span class="mkchip">' + esc(m.code || m.name) + '<button data-k="side" data-v="' + i + '" aria-label="Rounding side">' + (m.side === 'starboard' ? 'S' : 'P') + '</button><button data-k="del" data-v="' + i + '" aria-label="Remove ' + esc(m.code || m.name) + '">×</button></span>'; }).join('') || '<span class="mknote">No marks yet.</span>') + '</div>';
      h += '<div class="mkrow"><label>Finish</label>' + seg('fin', 'start', 'Start line', B.fin !== 'mark') + seg('fin', 'mark', 'Last mark', B.fin === 'mark') + '</div>';
    } else {
      h += '<p class="mkh">Windward mark</p><div class="mkrow">' + seg('wk', 'brg', 'Bearing and distance', w.wkind !== 'buoy' && w.wkind !== 'pt') + seg('wk', 'buoy', 'A buoy', w.wkind === 'buoy') + seg('wk', 'pt', 'Tap a point', w.wkind === 'pt') + '</div>';
      if (w.wkind === 'buoy') h += '<div class="mkrow"><input class="mkin" id="mkWcode" value="' + esc(w.wcode || '') + '" placeholder="3G" aria-label="Windward buoy code" autocapitalize="characters"></div>';
      else if (w.wkind === 'pt') h += '<div class="mkrow"><button class="mkb" data-k="pickpt" data-v="wpt">Tap the windward mark</button><span class="mknote">' + (w.wpt ? 'Set' : 'Not set') + '</span></div>';
      else h += '<div class="mkrow"><input class="mkin" id="mkWbrg" type="number" inputmode="numeric" min="0" max="360" value="' + (w.brg == null ? '' : w.brg) + '" placeholder="°T" aria-label="Windward mark bearing, degrees true"><input class="mkin" id="mkWdist" type="number" inputmode="decimal" step="0.1" min="0.1" value="' + (w.dist || '') + '" placeholder="nm" aria-label="Windward mark distance, nm"><button class="mkb" data-k="wbrgwind">Into the wind</button></div>';
      h += '<p class="mkh">Leeward</p><div class="mkrow">' + seg('lk', 'start', 'Start line', !w.lkind || w.lkind === 'start') + seg('lk', 'buoy', 'A buoy', w.lkind === 'buoy') + seg('lk', 'gate', 'A gate', w.lkind === 'gate') + '</div>';
      if (w.lkind === 'buoy') h += '<div class="mkrow"><input class="mkin" id="mkLcode" value="' + esc(w.lcode || '') + '" placeholder="2C" aria-label="Leeward buoy code" autocapitalize="characters"></div>';
      if (w.lkind === 'gate') h += '<div class="mkrow"><input class="mkin" id="mkG1" value="' + esc(w.lcode || '') + '" placeholder="Code A" aria-label="Gate buoy A code" autocapitalize="characters"><input class="mkin" id="mkG2" value="' + esc(w.lcode2 || '') + '" placeholder="Code B" aria-label="Gate buoy B code" autocapitalize="characters"><button class="mkb" data-k="pickpt" data-v="g1">Tap A</button><button class="mkb" data-k="pickpt" data-v="g2">Tap B</button></div>';
      h += '<div class="mkrow"><label>Laps</label>' + [1, 2, 3, 4].map(function (n) { return seg('laps', n, String(n), (w.laps || 2) === n); }).join('') + '</div>';
      h += '<div class="mkrow"><label>Finish</label>' + seg('wfin', 'lee', 'Leeward', !w.fin || w.fin === 'lee') + seg('wfin', 'start', 'Start line', w.fin === 'start') + seg('wfin', 'wind', 'Windward', w.fin === 'wind') + '</div>';
      h += '<div class="mkrow"><label>Rounding</label>' + seg('wside', 'port', 'Port', w.side !== 'starboard') + seg('wside', 'starboard', 'Starboard', w.side === 'starboard') + '</div>';
    }
    h += condHtml();
    h += legsHtml();
    h += '<div class="mkrow"><button class="mkb pri" data-k="show">Show the course</button><button class="mkb" data-k="route" aria-pressed="' + !!M.routeIt + '">Route it</button></div>';
    if (M.routeIt) h += '<div class="mkrow"><label>Forecasts</label>' + modelList().map(function (m) { return seg('model', m.id, esc(m.name), M.models.indexOf(m.id) >= 0); }).join('') + '</div><p class="mknote">Routes on each forecast ticked, and on the race wind as well when it is given.</p>';
    return h;
  }
  /* the wind and tide on the water: by hand on Mark, from the boat on Mark+ (Stuart 22:23) */
  function condHtml() {
    var w = M.wind || {}, t = M.tide || {}, nw = null; try { nw = plus && window.__navWind ? window.__navWind() : null; } catch (e) {}
    var h = '<p class="mkh">Wind and tide on the water</p>';
    if (nw && nw[1] != null) h += '<p class="mknote">From the boat: ' + Math.round(nw[0] || 0) + ' kn from ' + p3(nw[1]) + '. Typed figures replace it.</p>';
    h += '<div class="mkrow"><label>Wind</label><input class="mkin" id="mkTwd" type="number" inputmode="numeric" min="0" max="360" value="' + (w.twd == null ? '' : w.twd) + '" placeholder="from °T" aria-label="Wind from, degrees true"><input class="mkin" id="mkTws" type="number" inputmode="decimal" min="0" max="60" step="0.5" value="' + (w.tws == null ? '' : w.tws) + '" placeholder="kn" aria-label="Wind speed, knots"><button class="mkb" data-k="hdw">Head to wind</button></div>';
    h += '<div class="mkrow"><label>Tide</label>' + seg('tmode', 'model', 'Tide model', !t.mode || t.mode === 'model') + seg('tmode', 'steady', 'As I see it', t.mode === 'steady') + '</div>';
    if (t.mode === 'steady') h += '<div class="mkrow"><label></label><input class="mkin" id="mkTspd" type="number" inputmode="decimal" min="0" max="8" step="0.1" value="' + (t.spd == null ? '' : t.spd) + '" placeholder="kn" aria-label="Tide, knots"><input class="mkin" id="mkTdir" type="number" inputmode="numeric" min="0" max="360" value="' + (t.dir == null ? '' : t.dir) + '" placeholder="to °T" aria-label="Tide runs towards, degrees true"></div>';
    return h;
  }
  function legsHtml() {
    var c = null; try { c = window.FSSolent && FSSolent.build ? FSSolent.build(true) : null; } catch (e) {} if (!c || !c.start || !c.marks || !c.marks.length) return '';
    var pts = [c.start].concat(c.marks, c.finish ? [c.finish] : []), tw = M.wind && M.wind.twd != null ? M.wind.twd : null, tot = 0, rows = '';
    for (var i = 1; i < pts.length; i++) { var r = rh(pts[i - 1], pts[i]); tot += r.nm; rows += '<tr><td>' + i + '</td><td>' + esc(String(pts[i].name || '').replace(/^(Start|Finish), /, '')) + (pts[i].side ? ' <small>' + (/^s/.test(pts[i].side) ? 'S' : 'P') + '</small>' : '') + (tw != null && FSSolent.legType ? '<br><small>' + FSSolent.legType(r.brg, tw) + '</small>' : '') + '</td><td><b>' + p3(r.brg) + 'T</b></td><td>' + dist(r.nm) + '</td></tr>'; }
    return '<p class="mkh">The course: ' + (pts.length - 1) + ' legs, ' + tot.toFixed(1) + ' nm' + (tw == null ? '' : '') + '</p>' + (tw == null ? '<p class="mknote">Give the wind for beat, reach or run on each leg.</p>' : '') + '<table class="mklegs"><tbody>' + rows + '</tbody></table>';
  }
  function modelList() { var out = []; [].forEach.call(document.querySelectorAll('[data-m]'), function (c) { if (c.disabled) return; var id = c.getAttribute('data-m'); if (out.some(function (o) { return o.id === id; })) return; var l = c.closest('label'), t = l ? l.textContent.trim().split(/\s{2,}|\n|·|\(/)[0].trim() : id; out.push({ id: id, name: t.slice(0, 16) }); }); return out.slice(0, 6); }
  /* Start */
  function startHtml() {
    var g = gunAt(), d = g ? new Date(g * 1000) : null, l = window.__fsLine ? window.__fsLine() : {}, tr = !!l.transit, h = '';
    h += '<div class="mkbig" id="mkStartBig"></div>';
    h += '<div class="mkrow"><label>Gun</label><input class="mkin" style="width:9em" id="mkGunT" type="time" step="60" value="' + (d ? ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) : '') + '" aria-label="Gun time for your class"><button class="mkb pri" data-k="sync">Sync</button></div>';
    h += '<div class="mkrow"><label>Sequence</label>' + seg('seq', 5, '5-4-1-0', M.seq !== 3) + seg('seq', 3, '3-2-1-0', M.seq === 3) + '<button class="mkb" data-k="ap">Postpone (AP)</button><button class="mkb" data-k="recall">General recall</button></div>';
    h += '<div class="mkrow"><label>Flag</label>' + [['P', 'P'], ['I', 'I'], ['Z', 'Z'], ['U', 'U'], ['B', 'Black']].map(function (f) { return seg('flag', f[0], f[1], M.flag === f[0]); }).join('') + '</div><p class="mknote">' + flagText(M.flag) + '</p>';
    h += '<p class="mkh">Line</p><div class="mkrow">' + seg('lkind', 'cb', 'Committee boat and pin', !tr) + seg('lkind', 'tr', 'Shore transit', tr) + '</div>';
    h += '<div class="mkrow"><button class="mkb pri" data-k="ping" data-v="boat">' + (tr ? 'Ping inshore' : 'Ping boat') + (l.boat ? ' ✓' : '') + '</button><button class="mkb pri" data-k="ping" data-v="pin">' + (tr ? 'Ping outer mark' : 'Ping pin') + (l.pin ? ' ✓' : '') + '</button><button class="mkb" data-k="tapline">Tap the ends</button>' + (l.boat || l.pin ? '<button class="mkb" data-k="clrline">Clear line</button>' : '') + '</div><p class="mknote">' + (tr ? 'Ping on the transit close inshore, then at the outer distance mark. Re-ping if the committee moves the line.' : 'Ping each end as you pass it. Re-ping if the committee moves the line.') + '</p>';
    return h;
  }
  function flagText(f) { return { P: 'P: the ordinary start.', I: 'I: in the last minute, a boat on the course side must sail round an end to start.', Z: 'Z: in the last minute, a boat in the triangle (the line ends and the first mark) takes a 20% scoring penalty.', U: 'U: in the last minute, a boat in the triangle is disqualified without a hearing, unless the race is restarted.', B: 'Black flag: in the last minute, a boat in the triangle is disqualified without a hearing, even if the race is restarted.' }[f] || ''; }
  /* Race */
  function raceHtml() { return '<div class="mkbig" id="mkRaceBig"></div><div class="mkrow"><button class="mkb pri" data-k="rounded">Rounded</button><button class="mkb" data-k="back">Back a mark</button><button class="mkb warn" data-k="finish">Finished</button></div>'; }
  /* After */
  function afterHtml() {
    var g = gunAt(), f = M.finAt, tcc = window.__fsTcc ? window.__fsTcc() : 1, h = '';
    if (g && f) { var el = f - g, ct = el * tcc; h += '<div class="mkbig"><div><small>Elapsed</small><b>' + hms(el) + '</b><span>gun ' + hhmm(g) + ', finish ' + hhmm(f) + '</span></div><div><small>Corrected (IRC)</small><b>' + hms(ct) + '</b><span>TCC ' + tcc.toFixed(3) + ', saved with the track</span></div></div>'; }
    else h += '<p class="mknote">The times show here after Finished.</p>';
    h += '<div class="mkrow"><button class="mkb pri" data-k="next">Next course</button></div><p class="mknote">Next course keeps the start line, the wind and the start sequence, and clears the marks and the gun time.</p>';
    return h;
  }
  function hms(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 3600) + ':' + ('0' + Math.floor(s % 3600 / 60)).slice(-2) + ':' + ('0' + s % 60).slice(-2); }
  /* Settings */
  function setHtml() {
    var h = '<p class="mkh">Settings</p><div class="mkset">';
    h += '<div class="mkrow"><label>Buttons</label>' + seg('big', 0, 'Standard', !M.big) + seg('big', 1, 'Big', !!M.big) + '</div>';
    h += '<div class="mkrow"><label>Screen</label>' + seg('sun', 0, 'Normal', !M.sun) + seg('sun', 1, 'Sunlight', !!M.sun) + '</div>';
    h += '<div class="mkrow"><label>Sounds</label>' + seg('snd', 1, 'On', !!M.snd) + seg('snd', 0, 'Off', !M.snd) + '</div>';
    h += '<div class="mkrow"><label>Vibration</label>' + seg('vib', 1, 'On', !!M.vib) + seg('vib', 0, 'Off', !M.vib) + '</div>';
    h += '<div class="mkrow"><label>IRC TCC</label><input class="mkin" id="mkTcc" type="number" inputmode="decimal" step="0.001" min="0.5" max="2" value="' + (window.__fsTcc ? window.__fsTcc().toFixed(3) : '') + '" aria-label="IRC time correction coefficient"></div>';
    h += '<div class="mkrow"><button class="mkb" data-k="done">Done</button></div></div>';
    return h;
  }

  /* ---------- live figures ---------- */
  function live() {
    var f = anyFix(), now = Date.now() / 1000, g = gunAt();
    if (M.tab === 'start' && $('mkStartBig')) {
      var lc = window.__fsLineCalc ? window.__fsLineCalc(g) : null, h = '';
      h += '<div><small>Gun</small><b>' + (g ? (now < g ? mmss(g - now) : '+' + mmss(now - g)) : '--') + '</b><span>' + (g ? hhmm(g) : 'set the gun time') + '</span></div>';
      if (lc && lc.d != null) {
        h += '<div><small>To the line</small><b class="' + (lc.over ? 'bad' : '') + '">' + (lc.over ? 'OVER ' : '') + dist(lc.d) + '</b><span>line ' + Math.round(lc.len * 1852) + ' m</span></div>';
        h += '<div><small>Time to burn</small><b class="' + (lc.burn != null && lc.burn < 0 ? 'bad' : 'ok') + '">' + (lc.burn != null ? mmss(lc.burn) : '--') + '</b><span>' + (lc.ttl != null ? mmss(lc.ttl) + ' to the line at this speed' : 'not closing the line') + '</span></div>';
        var bw = M.wind && M.wind.twd != null ? M.wind.twd : lc.wind ? lc.wind[1] : null;
        if (bw != null) { var b = bias(lc, bw); h += '<div><small>Bias</small><b>' + b.end + ' ' + b.m + ' m</b><span>' + b.deg + '° for wind ' + p3(bw) + '</span></div>'; }
        var warn = earlyWarn(lc, g, now); if (warn) h = '<div class="mkwarn" style="grid-column:1/-1">' + warn + '</div>' + h;
      } else h += '<div><small>Line</small><b>--</b><span>' + (f ? 'ping both ends' : 'waiting for the GPS') + '</span></div>';
      $('mkStartBig').innerHTML = h;
    }
    if (M.tab === 'race' && $('mkRaceBig')) {
      var pc = window.__fsPlot && window.__fsPlot.calc ? window.__fsPlot.calc() : null, cl = window.__fsCalc ? window.__fsCalc() : null, h2 = '';
      if (pc && pc.ok) { h2 += '<div><small>Next mark</small><b>' + esc(String(pc.m.name || '').replace(/^(Start|Finish), /, '').slice(0, 14)) + '</b><span>' + (pc.m.side ? (/^s/.test(pc.m.side) ? 'starboard' : 'port') + ' · ' : '') + p3(pc.btw) + 'T · ' + dist(pc.dtw) + '</span></div>'; }
      else h2 += '<div><small>Next mark</small><b>--</b><span>' + esc(pc && pc.why || 'No course') + '</span></div>';
      var sh = cl && cl.shift; h2 += '<div><small>Header or lift</small><b class="' + (sh && sh.kind === 'header' ? 'bad' : sh && sh.kind === 'lift' ? 'ok' : '') + '">' + (sh && !sh.off ? (sh.kind === 'steady' ? 'Steady' : (sh.kind === 'lift' ? 'Lift ' : 'Header ') + sh.deg + '°') : '--') + '</b><span>' + (sh && !sh.off ? sh.tack + ' tack' : M.wind && M.wind.twd != null ? 'on a beat' : 'give the wind') + '</span></div>';
      var td = f && window.__fsTideAt ? window.__fsTideAt(f.la, f.lo) : null; if (!td && M.tide && M.tide.mode === 'steady' && M.tide.spd != null) td = [+M.tide.spd, +M.tide.dir];
      h2 += '<div><small>Tide here</small><b>' + (td ? (+td[0]).toFixed(1) + ' kn' : '--') + '</b><span>' + (td ? 'to ' + p3(td[1]) : f ? 'no tide model here' : 'waiting for the GPS') + '</span></div>';
      if (plus) h2 += plusHtml();
      $('mkRaceBig').innerHTML = h2;
    }
  }
  /* Mark+ (brief 7): the boat's instruments through Route+: TWA, TWS, boat speed, % of the polar target, and the shift trend */
  var TWD = [];
  function sh(k) { try { var v = window.__navShown ? window.__navShown(k) : null; return v == null || v !== v ? null : +v; } catch (e) { return null; } }
  function plusHtml() {
    var twa = sh('twa'), tws = sh('tws'), bsp = sh('bsp'), tg = null, nw = null, h = '';
    try { tg = window.__navTarget ? window.__navTarget() : null; } catch (e) {} try { nw = window.__navWind ? window.__navWind() : null; } catch (e) {}
    if (nw && nw[1] != null) { var now = Date.now(); if (!TWD.length || now - TWD[TWD.length - 1][0] > 4000) TWD.push([now, nw[1]]); TWD = TWD.filter(function (q) { return now - q[0] < 600000; }); }
    h += '<div><small>TWA · TWS</small><b>' + (twa != null ? Math.round(Math.abs(twa)) + '°' + (twa < 0 ? 'P' : 'S') : '--') + '</b><span>' + (tws != null ? tws.toFixed(1) + ' kn true wind' : 'no wind from the boat') + '</span></div>';
    h += '<div><small>Boat speed</small><b>' + (bsp != null ? bsp.toFixed(1) : '--') + '</b><span>' + (bsp != null && tg ? Math.round(bsp / tg * 100) + '% of target ' + tg.toFixed(1) + ' kn' : 'polar target when sailing') + '</span></div>';
    var tr = trend(); h += '<div><small>Shift trend</small><b>' + (tr == null ? '--' : Math.abs(tr) < 2 ? 'Steady' : (tr > 0 ? 'Veering ' : 'Backing ') + Math.round(Math.abs(tr)) + '°') + '</b><span>' + (tr == null ? 'needs 3 minutes of wind' : 'last 10 minutes, ' + (nw ? 'now ' + p3(nw[1]) : '')) + '</span></div>';
    return h;
  }
  function trend() { if (TWD.length < 4 || TWD[TWD.length - 1][0] - TWD[0][0] < 180000) return null; var a = TWD.slice(0, Math.ceil(TWD.length / 3)), b = TWD.slice(-Math.ceil(TWD.length / 3)), m = function (arr) { var x = 0, y = 0; arr.forEach(function (q) { x += Math.sin(q[1] * R); y += Math.cos(q[1] * R); }); return Math.atan2(x, y) / R; }; return ((m(b) - m(a) + 540) % 360) - 180; }   /* mean direction, last third against first third */
  function bias(lc, twd) { var bx = lc.pin, bo = lc.boat, k = Math.cos(bo[0] * R) * 60, P = [(bx[1] - bo[1]) * k, (bx[0] - bo[0]) * 60], wx = Math.sin(twd * R), wy = Math.cos(twd * R), up = P[0] * wx + P[1] * wy, ang = Math.atan2(P[0], P[1]) / R, d = Math.abs(90 - Math.abs(((ang - twd + 540) % 360) - 180));
    return { end: up > 0 ? (lc.boat && window.__fsLine && window.__fsLine().transit ? 'Outer' : 'Pin') : (window.__fsLine && window.__fsLine().transit ? 'Inshore' : 'Boat'), m: Math.round(Math.abs(up) * 1852), deg: Math.round(d) }; }
  /* the last minute: the flag in force decides what being on the course side means (World Sailing RRS 29, 30) */
  function earlyWarn(lc, g, now) { if (!g || now > g + 5 || g - now > 60 || !lc.over) return ''; var f = M.flag;
    if (f === 'I') return 'Over in the last minute (I flag): sail round an end to start.'; if (f === 'Z') return 'Over in the last minute (Z flag): 20% penalty if in the triangle.'; if (f === 'U') return 'Over in the last minute (U flag): disqualified if in the triangle.'; if (f === 'B') return 'Over in the last minute (black flag): disqualified if in the triangle.';
    return g - now < 10 ? 'Over the line: go back before the gun.' : 'On the course side.'; }

  /* ---------- sounds and vibration (Settings) ---------- */
  var AC = null, lastBeep = -1;
  function beep(n, long) { if (M.snd) { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); for (var i = 0; i < n; i++) { var o = AC.createOscillator(), gn = AC.createGain(), t0 = AC.currentTime + i * 0.35; o.frequency.value = 880; gn.gain.setValueAtTime(0.25, t0); gn.gain.setValueAtTime(0, t0 + (long ? 0.8 : 0.18)); o.connect(gn); gn.connect(AC.destination); o.start(t0); o.stop(t0 + (long ? 0.85 : 0.2)); } } catch (e) {} }
    if (M.vib && navigator.vibrate) try { navigator.vibrate(long ? 600 : Array(n).fill(150).join(',').split(',').map(Number)); } catch (e) {} }
  function sounds() { var g = gunAt(); if (!g) return; var s = Math.round(g - Date.now() / 1000); if (s === lastBeep) return; lastBeep = s;
    var seq = M.seq === 3 ? [180, 120, 60] : [300, 240, 60]; if (seq.indexOf(s) >= 0) beep(1, true); else if (s === 30 || s === 20) beep(2); else if (s <= 10 && s >= 1) beep(1); else if (s === 0) beep(1, true); }

  /* ---------- taps on the chart ---------- */
  var PICK = null, orig = null;
  function pickBar(t) { window.__fsMarkPicking = !!t; setTimeout(function () { try { window.__fsRedraw && window.__fsRedraw(); } catch (e) {} }, 0); var b = $('mkPick'); if (!t) { if (b) b.remove(); return; } if (!b) { b = document.createElement('div'); b.id = 'mkPick'; b.className = 'mkpick'; document.body.appendChild(b); } b.innerHTML = '<span>' + esc(t) + '</span><button class="mkb" id="mkPickX">Done</button>'; $('mkPickX').onclick = function () { PICK = null; pickBar(null); render(); }; }
  function nearestMark(la, lo, x, y) { var mk = window.FSSolent && FSSolent.marks ? FSSolent.marks() : null, best = null; if (!mk || !window.__fsXY) return null; mk.forEach(function (m) { var q = window.__fsXY(m.lat, m.lon), d = Math.hypot(q[0] - x, q[1] - y); if (d < 28 && (!best || d < best.d)) best = { d: d, m: m }; }); return best && best.m; }
  function hook() {
    if (orig !== null || !window.__fsTapHook) { if (!window.__fsTapHook) setTimeout(hook, 300); return; } orig = window.__fsTapHook;
    window.__fsTapHook = function (la, lo, x, y, editing) {
      if (!PICK) return orig(la, lo, x, y, editing); var B = SOL(); if (!B) return true; var m = nearestMark(la, lo, x, y);
      if (/^mark-/.test(PICK)) { if (!m) { toast('Tap one of the Solent marks.'); return true; } var a = (B.marks || []).slice(); a.push({ code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon, side: PICK === 'mark-starboard' ? 'starboard' : 'port' }); solSet({ marks: a }); render(); return true; }
      if (PICK === 'start') { if (m) solSet({ start: { code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon } }); else if (onLand(la, lo)) { toast('That point is on land.'); return true; } else solSet({ start: { code: null, name: 'Start point', lat: la, lon: lo } }); PICK = null; pickBar(null); render(); return true; }
      if (PICK === 'wpt' || PICK === 'g1' || PICK === 'g2') { if (!m && onLand(la, lo)) { toast('That point is on land.'); return true; } var w = Object.assign({}, B.wl), p = m ? { lat: m.lat, lon: m.lon, code: m.id, name: m.id + ' ' + m.name } : { lat: la, lon: lo }; w[PICK] = p; if (PICK === 'wpt') w.wkind = 'pt'; solSet({ wl: w }); PICK = null; pickBar(null); render(); return true; }
      if (PICK === 'line-boat' || PICK === 'line-pin') { if (onLand(la, lo) && !(window.__fsLine && window.__fsLine().transit)) { toast('That point is on land.'); return true; } var end = PICK === 'line-boat' ? 'boat' : 'pin', o = window.__fsLine ? window.__fsLine() : {}, other = o[end === 'boat' ? 'pin' : 'boat']; if (other && rh({ lat: other[0], lon: other[1] }, { lat: la, lon: lo }).nm * 1852 < 20) { toast('Both ends in the same place: tap the other end.'); return true; } window.__fsSetLine(end, la, lo); if (end === 'boat') { PICK = 'line-pin'; pickBar('Tap the ' + ((window.__fsLine().transit) ? 'outer distance mark' : 'pin end')); } else { PICK = null; pickBar(null); lineToStart(); } render(); return true; }
      return orig(la, lo, x, y, editing);
    };
  }
  function lineToStart() { var l = window.__fsLine ? window.__fsLine() : {}; if (l.boat && l.pin) { var B = SOL(); if (B && (!B.start || B.start.line)) solSet({ start: { code: null, name: 'Start line', lat: (l.boat[0] + l.pin[0]) / 2, lon: (l.boat[1] + l.pin[1]) / 2, line: true }, sk: 'line' }); } }

  /* ---------- actions ---------- */
  function act(e) {
    var b = e.target.closest('[data-k]'); if (!b || b.tagName === 'INPUT') return; var k = b.dataset.k, v = b.dataset.v, B = SOL() || {};
    if (k === 'new') return newCourse();
    if (k === 'type') solSet({ type: v });
    else if (k === 'startk') { if (v === 'line') { lineToStart(); if (!(window.__fsLine && window.__fsLine().boat && window.__fsLine().pin)) { M.tab = 'start'; save(); toast('Ping or tap both ends of the line first.'); } } else { PICK = 'start'; pickBar('Tap the start mark or point'); } }
    else if (k === 'codes') { var t = ($('mkCodes') || {}).value || '', r = FSSolent.board ? FSSolent.board(t) : { marks: [], bad: [] }; if (!r.marks.length) toast(r.bad.length ? 'Not Solent marks: ' + r.bad.join(', ') : 'No mark codes found.'); else { solSet({ marks: (B.marks || []).concat(r.marks) }); if (r.bad.length) toast('Left out (not Solent marks): ' + r.bad.join(', ')); } }
    else if (k === 'pick') { PICK = PICK === 'mark-' + v ? null : 'mark-' + v; pickBar(PICK ? 'Tap each buoy in order, rounding to ' + v : null); }
    else if (k === 'side') { var a = (B.marks || []).slice(), i = +v; a[i] = Object.assign({}, a[i], { side: a[i].side === 'starboard' ? 'port' : 'starboard' }); solSet({ marks: a }); }
    else if (k === 'del') { var a2 = (B.marks || []).slice(); a2.splice(+v, 1); solSet({ marks: a2 }); }
    else if (k === 'fin') solSet({ fin: v });
    else if (k === 'wk' || k === 'lk' || k === 'laps' || k === 'wfin' || k === 'wside') { var w = Object.assign({}, B.wl); if (k === 'wk') w.wkind = v; if (k === 'lk') w.lkind = v; if (k === 'laps') w.laps = +v; if (k === 'wfin') w.fin = v; if (k === 'wside') w.side = v; solSet({ wl: w }); }
    else if (k === 'wbrgwind') { if (!M.wind || M.wind.twd == null) { toast('Give the wind first, under Wind and tide.'); return; } var w2 = Object.assign({}, B.wl, { brg: Math.round(M.wind.twd), wkind: 'brg' }); if (!(w2.dist > 0)) w2.dist = 1; solSet({ wl: w2 }); }
    else if (k === 'pickpt') { PICK = v; pickBar(v === 'wpt' ? 'Tap the windward mark' : 'Tap gate buoy ' + (v === 'g1' ? 'A' : 'B')); }
    else if (k === 'tmode') { M.tide = Object.assign({}, M.tide, { mode: v }); save(); pushFix(); }
    else if (k === 'hdw') return headToWind();
    else if (k === 'show') return useCourse(false);
    else if (k === 'route') { M.routeIt = !M.routeIt; save(); if (M.routeIt) return useCourse(true); }
    else if (k === 'model') { var ms = M.models.slice(), j = ms.indexOf(v); if (j >= 0) { if (ms.length > 1) ms.splice(j, 1); } else if (ms.length < 6) ms.push(v); M.models = ms; save(); }
    else if (k === 'sync') { var g = gunAt(), now = Date.now() / 1000; if (!g || g < now) { toast('Set the gun time first.'); return; } var left = g - now, mins = Math.round(left / 60); M.gun = Math.round(now + mins * 60); save(); gunToEngine(); toast('Synced: gun at ' + hhmm(M.gun)); }
    else if (k === 'seq') { M.seq = +v; save(); }
    else if (k === 'ap') { if (gunAt()) { M.gun = null; save(); toast('Postponed: set the new gun time when the sequence restarts.'); } }
    else if (k === 'recall') { var now2 = Date.now() / 1000; M.gun = Math.round(now2 + (M.seq === 3 ? 180 : 300) + 60); M.finAt = null; save(); gunToEngine(); M.tab = 'start'; toast('General recall: new sequence, gun at ' + hhmm(M.gun)); }
    else if (k === 'flag') { M.flag = v; save(); }
    else if (k === 'lkind') { if (window.__fsLineKind) window.__fsLineKind(v === 'tr'); }
    else if (k === 'ping') { var f = fix(); if (!f) { if (window.__fsLiveOpen) window.__fsLiveOpen(); toast('GPS starting: tap Ping again in a moment.'); return; } if (onLand(f.la, f.lo) && !(window.__fsLine && window.__fsLine().transit)) { toast('The GPS puts you on land, so nothing was pinged.'); return; } var o = window.__fsLine ? window.__fsLine() : {}, other = o[v === 'boat' ? 'pin' : 'boat']; if (other && rh({ lat: other[0], lon: other[1] }, { lat: f.la, lon: f.lo }).nm * 1852 < 20) { toast('That is where the other end is: ping this end when you pass it.'); return; } window.__fsSetLine(v, f.la, f.lo); lineToStart(); toast((v === 'boat' ? 'Boat end' : 'Pin end') + ' pinged.'); }
    else if (k === 'tapline') { PICK = 'line-boat'; pickBar('Tap the ' + (window.__fsLine && window.__fsLine().transit ? 'inshore end of the transit' : 'committee boat end')); }
    else if (k === 'clrline') { window.__fsSetLine('boat', null); window.__fsSetLine('pin', null); }
    else if (k === 'rounded' || k === 'back') { try { var pc = window.__fsPlot.calc(); if (pc && pc.ok) window.__fsPlot.setMark(Math.max(0, Math.min(pc.n - 1, pc.i + (k === 'rounded' ? 1 : -1)))); } catch (x) {} }
    else if (k === 'finish') { M.finAt = Math.round(Date.now() / 1000); M.tab = 'after'; save(); try { if (window.__fsEndRace) window.__fsEndRace(); } catch (x) {} }
    else if (k === 'next') return newCourse();
    else if (k === 'big' || k === 'sun' || k === 'snd' || k === 'vib') { M[k] = v === '1'; save(); applyLook(); }
    else if (k === 'done') { M.tab = M.back || 'course'; save(); }
    render();
  }
  function change(e) {
    var t = e.target, id = t.id, B = SOL() || {}, n = t.value === '' ? null : +t.value;
    if (id === 'mkTwd' || id === 'mkTws') { M.wind = Object.assign({}, M.wind, id === 'mkTwd' ? { twd: n == null ? null : ((n % 360) + 360) % 360 } : { tws: n }); save(); if (M.wind.twd != null) solSet({ wind: { twd: M.wind.twd, src: 'typed', at: Date.now() } }); pushFix(); render(); }
    else if (id === 'mkTspd' || id === 'mkTdir') { M.tide = Object.assign({}, M.tide, id === 'mkTspd' ? { spd: n } : { dir: n }); save(); pushFix(); }
    else if (id === 'mkWbrg' || id === 'mkWdist') { var w = Object.assign({}, B.wl); if (id === 'mkWbrg') w.brg = n; else w.dist = n; w.wkind = 'brg'; solSet({ wl: w }); render(); }
    else if (id === 'mkWcode' || id === 'mkLcode' || id === 'mkG1' || id === 'mkG2') { var w2 = Object.assign({}, B.wl), v = t.value.trim().toUpperCase(); if (id === 'mkWcode') w2.wcode = v; if (id === 'mkLcode') w2.lcode = v; if (id === 'mkG1') { w2.lcode = v; w2.g1 = null; } if (id === 'mkG2') { w2.lcode2 = v; w2.g2 = null; } solSet({ wl: w2 }); render(); }
    else if (id === 'mkGunT') { var p = t.value.split(':'); if (p.length >= 2) { var d = new Date(); d.setHours(+p[0], +p[1], 0, 0); if (d.getTime() < Date.now() - 6 * 3600e3) d.setDate(d.getDate() + 1); M.gun = Math.round(d.getTime() / 1000); M.finAt = null; save(); gunToEngine(); render(); } }
    else if (id === 'mkTcc') { var tc = $('tcc'); if (tc && n > 0) { tc.value = n; tc.dispatchEvent(new Event('change', { bubbles: true })); } }
  }
  function gunToEngine() { try { if (window.__fsGun && M.gun) window.__fsGun(M.gun); } catch (e) {} }
  /* the race wind and tide feed the router's Fixed wind route (app.js FIX): Route it routes on them beside the forecasts */
  function pushFix() { var w = M.wind || {}, t = M.tide || {}; if (!window.__fsFix) return; window.__fsFix({ on: w.tws > 0 && w.twd != null, tws: w.tws, twd: w.twd, tmode: t.mode === 'steady' ? 'steady' : 'model', tspd: t.spd, tdir: t.dir }); }
  function headToWind() {
    var done = false, fin = function (h) { if (done) return; done = true; window.removeEventListener('deviceorientationabsolute', on, true); window.removeEventListener('deviceorientation', on, true); M.wind = Object.assign({}, M.wind, { twd: Math.round(((h % 360) + 360) % 360) }); save(); solSet({ wind: { twd: M.wind.twd, src: 'head to wind', at: Date.now() } }); pushFix(); render(); toast('Wind from ' + p3(M.wind.twd)); };
    var on = function (e) { var h = e.webkitCompassHeading != null ? e.webkitCompassHeading : e.absolute && e.alpha != null ? 360 - e.alpha : null; if (h != null) fin(h); };
    var go = function () { window.addEventListener('deviceorientationabsolute', on, true); window.addEventListener('deviceorientation', on, true); setTimeout(function () { if (!done) { done = true; window.removeEventListener('deviceorientationabsolute', on, true); window.removeEventListener('deviceorientation', on, true); var f = fix(); if (f && f.cog != null && f.sog > 0.5) { fin(f.cog); } else toast('No compass on this device: type the wind direction.'); } }, 2500); };
    try { if (window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) DeviceOrientationEvent.requestPermission().then(go, go); else go(); } catch (e) { go(); }
  }
  function useCourse(route) {
    var c = window.FSSolent && FSSolent.build ? FSSolent.build() : { err: 'The course is not ready.' }; if (c.err) { toast(c.err); return; }
    solSet({ plan: route ? 'route' : 'list', models: M.models.slice(), model: M.models[0] }); pushFix(); gunToEngine();
    if (window.FSSolent.go) FSSolent.go(); PICK = null; pickBar(null); render(); setTimeout(function () { if (window.__fsFit) window.__fsFit(); }, 900);
  }
  function newCourse() {
    var B = SOL() || {}; try { if (window.__fsClearCourse) window.__fsClearCourse(); } catch (e) {}
    var w = Object.assign({}, B.wl, { wcode: '', wpt: null, lcode: '', lcode2: '', lpt: null, g1: null, g2: null }), l = window.__fsLine ? window.__fsLine() : {};
    solSet({ marks: [], finish: null, fin: 'start', legTide: [], startAt: null, wl: w, start: l.boat && l.pin ? { code: null, name: 'Start line', lat: (l.boat[0] + l.pin[0]) / 2, lon: (l.boat[1] + l.pin[1]) / 2, line: true } : null });
    M.finAt = null; M.gun = null; M.tab = 'course'; M.routeIt = false; save(); lastStage = 'course';   /* the next race has its own gun */ PICK = null; pickBar(null); render();
  }

  /* Mark+ laylines (brief 7): from the next mark, when it is upwind, the two tacks at the boat's tacking angle on the live wind */
  function laylines(ctx, X, Y) {
    if (!plus || M.tab !== 'race') return; var nw = null; try { nw = window.__navWind ? window.__navWind() : null; } catch (e) {} if (!nw || nw[1] == null) return;
    var pc = null; try { pc = window.__fsPlot && window.__fsPlot.calc ? window.__fsPlot.calc() : null; } catch (e) {} if (!pc || !pc.ok) return;
    var twa = sh('twa'), ba = twa != null && Math.abs(twa) < 60 ? Math.abs(twa) : (window.FSSolent && FSSolent.windRef && FSSolent.windRef() && FSSolent.windRef().ba) || 42, up = Math.abs(((pc.btw - nw[1] + 540) % 360) - 180) < 90; if (!up) return;
    var m = pc.m, L = Math.max(0.5, pc.dtw * 1.3);
    ctx.strokeStyle = '#ff8a1f'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
    [nw[1] + 180 - ba, nw[1] + 180 + ba].forEach(function (b) { var la = m.lat + L * Math.cos(b * R) / 60, lo = m.lon + L * Math.sin(b * R) / (60 * Math.cos(m.lat * R)); ctx.beginPath(); ctx.moveTo(X(m.lon), Y(m.lat)); ctx.lineTo(X(lo), Y(la)); ctx.stroke(); });
    ctx.setLineDash([]);
  }
  (window.__fsOverlays = window.__fsOverlays || []).push(laylines);
  function boot() { if (!document.body) return setTimeout(boot, 50); build(); hook(); try { if (window.FSSolent && FSSolent.load) FSSolent.load(); if (window.FSSolent && FSSolent.on) FSSolent.on(true); } catch (e) {} }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.FSMark = { state: function () { return M; }, render: render, stage: stage, set: function (o) { Object.assign(M, o); save(); applyLook(); render(); } };
})();
