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
    /* Mark uses Route's own look (Stuart 17 Nov 05:11: "Icons like settings and rulers etc need to be the same as the Route product
       box and screen UI and styles need to be same as Route tools"): Route's logo box, race box, icon buttons (.ib), round buttons
       on the chart (ruler, north up), tabs (.tabs .tab), panel body (.sbody), rows, buttons (.btn), notes and headings. This sheet only
       places Mark's panel and adds what Route has no style for. */
    s.textContent =
      /* the parts of Route's offshore screen Mark does not use */
      'html.mk .top,html.mk #panel,html.mk .bar,html.mk #helpBtn,html.mk #editFab,html.mk #navClearBtn,html.mk #fromHere,html.mk #navStrip,html.mk #fsPlot,html.mk #astroLine,html.mk #updBar,html.mk .cbanner,html.mk .adjpill,html.mk .newdata,html.mk #boatWarn,html.mk .prog,html.mk #liveBox,' +
      'html.mk #solCard,html.mk #solStep,html.mk #solLegs,html.mk #solAfter,html.mk #solChain,html.mk #solPick,html.mk #solSheet,html.mk .solpop,html.mk .solpick,html.mk .solchain,html.mk .solstep,html.mk #wiz,html.mk #spFilm{display:none!important}' +
      'html.mktest .mkpick{top:calc(var(--mkTB,60px) + 64px)}.mktestbar{border-color:#F2B233}.mktestbar b{color:#F2B233}' +
      'html.mk body{overflow:hidden}html.mk body::after{background:#ff8a1f}' +
      /* the chart: the whole screen beside or above the panel; the top bar floats over it, as on Route */
      'html.mk .app{position:fixed;left:0;right:var(--mkW,0px);top:0;bottom:var(--mkH,0px);height:auto;grid-template-rows:minmax(0,1fr);grid-template-columns:minmax(0,1fr)}' +
      'html.mk .mobbtn.mobfab{bottom:var(--mkMob,12px)!important;left:max(12px,env(safe-area-inset-left,0px))!important;top:auto!important}' +
      /* the top bar: Route's logo box (with the colour line round it, Stuart 05:07), Route's race box and Route's icon buttons */
      '.mktop{position:fixed;left:0;right:var(--mkW,0px);top:0;z-index:20;display:flex;align-items:center;gap:6px;padding:calc(env(safe-area-inset-top,0px) + 8px) 10px 0 max(10px,env(safe-area-inset-left,0px));pointer-events:none;box-sizing:border-box}.mktop>*{pointer-events:auto}' +
      '.mktop .mkbrand{min-width:0;flex:0 1 auto;height:44px;box-sizing:border-box}.mkbrand b{font:600 14px var(--f-head);color:var(--brandnavy,var(--ink));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}.mkbrand .chip{max-width:none}.mkbrand .mkarea{color:#ff8a1f;font-weight:700}' +
      '.mktop .mksp{flex:1 1 0}.mktop .ib{flex:none}' +
      '.mklogo{position:relative;flex:none;display:block;width:62px;height:48px;border-radius:12px;overflow:hidden;padding:2px;box-sizing:border-box;text-decoration:none;isolation:isolate;--mk-navy:#042D5E;--mk-blue:#3574BA;--mk-ink:#042D5E;--mk-dot:#ff8a1f}' +
      '.mklogo::before{content:"";position:absolute;left:50%;top:50%;width:160%;height:220%;transform:translate(-50%,-50%) rotate(0deg);background:conic-gradient(#ff8a1f,#ff8a1f 18%,#8b5cf6 35%,#ff4fa3 55%,#3574BA 75%,#ff8a1f);animation:mkring 6s linear infinite;z-index:-1}' +
      '@keyframes mkring{to{transform:translate(-50%,-50%) rotate(360deg)}}@media (prefers-reduced-motion:reduce){.mklogo::before{animation:none}}' +
      '.mklg{display:grid;place-items:center;width:100%;height:100%;border-radius:10px;background:var(--panel);overflow:hidden}.mklg svg.mk-r{display:none}.mklg svg.mk-s{display:block;width:50px;height:auto}.mklg b{font:800 15px var(--f-head);color:var(--ink)}' +
      ':root[data-theme="dark"] .mklogo{--mk-navy:#FFFFFF;--mk-blue:#6FA9E0;--mk-ink:#FFFFFF}@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .mklogo{--mk-navy:#FFFFFF;--mk-blue:#6FA9E0;--mk-ink:#FFFFFF}}' +
      'html.mk #layers{left:76px!important;right:8px!important;width:auto!important;max-width:none!important}@media (min-width:600px){html.mk #layers{left:auto!important;width:360px!important}}' +   /* Route's Layers box keeps clear of man overboard */
      /* the panel: Route's panel look, one at a time at the foot of a phone, beside the chart on a pad */
      '.mkpanel{position:fixed;left:0;right:0;bottom:0;z-index:20;background:var(--panel);color:var(--ink);border-top:1px solid var(--line);display:flex;flex-direction:column;max-height:min(46%,520px);padding:0 env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);box-sizing:border-box}' +
      '.mkpanel .tab.mkwait{opacity:.55}.mkpanel .tabs{flex:none}.mkpanel .sbody{min-height:0;overscroll-behavior:contain;overflow-x:hidden}' +
      '.mkbody .row>*{max-width:100%;box-sizing:border-box}.mkbody .row>label:first-child{min-width:84px}.mkbody .btn[aria-pressed="true"]{background:var(--brand);border-color:var(--brand);color:#fff}.mkbody .btn.mkred{background:#dc2626;border-color:#dc2626;color:#fff}.mkbody .btn{white-space:normal;line-height:1.15}' +
      '.mkin{background:var(--soft);border:1px solid var(--line);border-radius:8px;padding:8px 9px;min-height:40px;color:var(--ink);font:14px var(--f-data);box-sizing:border-box;width:6.5em}.mkin.wide{flex:1 1 140px;min-width:0;width:auto}' +
      '.mkbig{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}' +
      '.mkbig>div{border:1px solid var(--line);border-radius:10px;background:var(--soft);padding:6px 10px;display:grid;align-content:start}.mkbig small{font:600 11px var(--f-head);color:var(--muted);text-transform:uppercase;letter-spacing:.04em}' +
      '.mkbig b{font:600 28px/1.1 var(--f-data);color:var(--ink)}.mkbig b.ok{color:#16a34a}.mkbig b.bad{color:#dc2626}.mkbig span{font:12px var(--f-body);color:var(--muted)}' +
      '.mklegs{width:100%;border-collapse:collapse;font:13px var(--f-data)}.mklegs td{padding:6px 4px;border-top:1px solid var(--line);vertical-align:top}.mklegs small{color:var(--muted);font-family:var(--f-body)}' +
      '.mkmk{display:flex;flex-wrap:wrap;gap:6px}.mkmk .mkchip{display:inline-flex;align-items:center;gap:2px;border:1px solid var(--line);border-radius:8px;background:var(--soft);padding:0 2px 0 10px;min-height:40px;font:600 14px var(--f-data)}' +
      '.mkchip button{min-width:40px;min-height:40px;border:0;background:none;color:var(--ink);font:600 13px var(--f-head);cursor:pointer;border-radius:8px}' +
      '.mkwarn{border:2px solid #dc2626;border-radius:10px;padding:8px 10px;font:600 15px var(--f-head);color:#dc2626}' +
      '.mkpick{position:fixed;left:calc((100% - var(--mkW,0px)) / 2);transform:translateX(-50%);top:calc(var(--mkTB,60px) + 8px);z-index:21;background:var(--panel);border:1px solid var(--brand);color:var(--ink);border-radius:12px;padding:6px 6px 6px 14px;display:flex;gap:10px;align-items:center;font:600 13.5px var(--f-body);max-width:calc(100% - var(--mkW,0px) - 24px);box-sizing:border-box;box-shadow:0 4px 18px rgba(0,0,0,.35)}' +
      /* a pad, or any wide screen, and a phone held sideways: the panel beside the chart, full height, as Route's results panel */
      '@media (min-width:900px){.mkpanel{left:auto;top:0;width:400px;max-height:none;border-top:0;border-left:1px solid var(--line);padding-top:env(safe-area-inset-top,0px);padding-left:0}}' +
      '@media (orientation:landscape) and (max-height:500px){.mkpanel{left:auto;top:0;width:min(46%,380px);max-height:none;border-top:0;border-left:1px solid var(--line);padding-left:0}}' +
      /* big buttons (Settings) and sunlight */
      'html.mkbigui .mkbody .btn,html.mkbigui .mkpanel .tab{min-height:56px;font-size:16px}html.mkbigui .mkin{min-height:56px;font-size:18px}html.mkbigui .mkbig b{font-size:36px}' +
      'html.mksun{--ink:#000;--muted:#222;--panel:#fff;--bg:#fff;--line:#000}html.mksun .mkbig b{font-weight:800}';
    document.head.appendChild(s);
  }
  var top, panel;
  function build() {
    css(); if ($('mkTop')) return;
    top = document.createElement('div'); top.id = 'mkTop'; top.className = 'mktop'; top.setAttribute('role', 'banner');
    /* the FirstShift sails logo, top left, with a colour line running round it (Stuart 17 Nov 05:07) */
    top.innerHTML = '<a class="mklogo" href="https://firstshiftsailing.com" target="_blank" rel="noopener" aria-label="FirstShift ' + (plus ? 'Mark+' : 'Mark') + '. Opens firstshiftsailing.com in a new window" title="FirstShift: Yacht Racing Intelligence"><span class="mklg" id="mkLogo"><b>' + (plus ? 'Mark+' : 'Mark') + '</b></span></a>' +
      '<div class="brand mkbrand"><b id="mkRace">No course yet</b><span class="chip"><span class="mkarea">' + esc(window.FS_AREA || 'Solent') + '</span> <span id="mkGun"></span></span></div><span class="mksp"></span>' +
      '<button class="ib" id="mkLayBtn" aria-expanded="false" title="What the chart shows" aria-label="What the chart shows: depth and layers"></button><button class="ib" id="mkSetBtn" title="Settings" aria-label="Settings"></button>';
    [['mkLayBtn', 'layersBtn'], ['mkSetBtn', 'setBtn']].forEach(function (q) { var src = document.getElementById(q[1]), dst = top.querySelector('#' + q[0]); if (src && dst) dst.innerHTML = src.querySelector('svg') ? src.querySelector('svg').outerHTML : src.innerHTML; });   /* Route's own icons */
    document.body.appendChild(top);
    fetch('../brand/' + (plus ? 'markplus' : 'mark') + '-mark.inc.html').then(function (r) { return r.ok ? r.text() : ''; }).then(function (h) { if (h && /<svg/.test(h) && $('mkLogo')) $('mkLogo').innerHTML = h; }).catch(function () {});
    panel = document.createElement('section'); panel.id = 'mkPanel'; panel.className = 'mkpanel'; panel.setAttribute('aria-label', 'Mark');
    panel.innerHTML = '<div class="tabs mktabs" role="tablist">' + ['course', 'start', 'race', 'after'].map(function (t) { return '<button class="tab" role="tab" data-tab="' + t + '" id="mkTab-' + t + '">' + t[0].toUpperCase() + t.slice(1) + '</button>'; }).join('') + '</div><div class="sbody mkbody" id="mkBody" role="tabpanel"></div>';
    document.body.appendChild(panel);
    panel.querySelector('.mktabs').onclick = function (e) { var b = e.target.closest('[data-tab]'); if (!b) return;
      /* the Racing view opens at the gun; before it, with a tap once the wind is known (Stuart 17 Nov 05:28) */
      if (b.dataset.tab === 'race' && stage() !== 'race' && stage() !== 'after' && !windKnown()) { M.tab = 'course'; save(); render(); toast('Racing opens at the gun. Before it, give the wind direction and speed first' + (plus ? ', or connect the boat' : '') + '.'); setTimeout(function () { var w = $('mkTwd'); if (w) { w.scrollIntoView({ block: 'center' }); w.focus(); } }, 300); return; } M.tab = b.dataset.tab; M.auto = false; M.autoAt = Date.now(); save(); render(); };
    /* Route's chart, the same in Mark (Stuart 17 Nov 05:08): its Layers box, with the No-go depth control that moves the depth contour */
    $('mkLayBtn').onclick = function () { var lb = $('layersBtn'); if (lb) lb.click(); var p = $('layers'); $('mkLayBtn').setAttribute('aria-expanded', String(!!(p && !p.hidden))); };
    $('mkSetBtn').onclick = function () { M.tab = M.tab === 'settings' ? (M.back || 'course') : (M.back = M.tab, 'settings'); save(); render(); };
    panel.addEventListener('click', act); panel.addEventListener('change', change);
    fitRO(); applyLook(); render(); setInterval(tick, 1000);
  }
  /* the chart fits exactly between the top bar and the panel, so nothing sits on top of it but the course, the boat and man overboard */
  function fitRO() { var f = function () { if (!panel || !top) return; var side = innerWidth >= 900 || (innerWidth > innerHeight && innerHeight <= 500), pr = panel.getBoundingClientRect(), tr = top.getBoundingClientRect(), ds = document.documentElement.style;
      ds.setProperty('--mkTB', Math.round(tr.bottom) + 'px');   /* the bottom of the floating top bar */
      ds.setProperty('--mkH', side ? '0px' : Math.round(innerHeight - pr.top) + 'px'); var ib = window.__fsInsets ? window.__fsInsets().b : 0; ds.setProperty('--mkMob', Math.round((side ? ib : innerHeight - pr.top) + 12) + 'px');   /* man overboard clear of the panel and of the home bar */ ds.setProperty('--mkW', side ? Math.round(innerWidth - pr.left) + 'px' : '0px');
      if (f.w !== innerWidth + 'x' + innerHeight + ':' + Math.round(pr.top) + ':' + Math.round(pr.left)) { f.w = innerWidth + 'x' + innerHeight + ':' + Math.round(pr.top) + ':' + Math.round(pr.left); try { window.dispatchEvent(new Event('resize')); } catch (e) {} } };
    if (window.ResizeObserver) { new ResizeObserver(function () { setTimeout(f, 0); }).observe(panel); new ResizeObserver(function () { setTimeout(f, 0); }).observe(top); }
    window.addEventListener('resize', function () { setTimeout(f, 50); }); f(); setTimeout(f, 300); }
  function applyLook() { var d = document.documentElement.classList; d.toggle('mkbigui', !!M.big); d.toggle('mksun', !!M.sun); }

  /* ---------- the race: course, gun and stage ---------- */
  function course() { try { return window.__navCourse && window.__navCourse(); } catch (e) { return null; } }
  function gunAt() { return M.gun || null; }
  function windKnown() { if (M.wind && M.wind.twd != null && M.wind.tws > 0) return true; try { var nw = plus && window.__navWind ? window.__navWind() : null; return !!(nw && nw[1] != null && nw[0] > 0); } catch (e) { return false; } }
  function stage() { var g = gunAt(), now = Date.now() / 1000; if (M.finAt) return 'after'; if (g && now >= g) return 'race'; if (g && g - now <= 600) return 'start'; return 'course'; }
  var lastStage = null;
  function tick() {
    var st = stage(); if (st !== lastStage) { if (lastStage && (st === 'race' || st === 'after' || M.auto !== false || Date.now() - (M.autoAt || 0) > 120000) && ['settings', 'help', 'share'].indexOf(M.tab) < 0) { M.tab = st; save(); render(); }   /* the gun always opens Racing (Stuart 05:28); other changes wait two minutes after a tab chosen by hand */ lastStage = st; }   /* the panel follows the race; a tab chosen by hand holds for two minutes */
    if (M.tab === 'start' || M.tab === 'race') live(); topBar(); sounds();
  }
  function topBar() { var c = course(), g = gunAt(); if ($('mkRace')) $('mkRace').textContent = c ? c.name.replace(/ \d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d\d:\d\d$/, '') : 'No course yet';
    if ($('mkGun')) { var now = Date.now() / 1000; $('mkGun').textContent = g ? (now < g ? 'Gun ' + mmss(g - now) : 'Race ' + mmss(now - g)) : ''; } }

  /* ---------- panels ---------- */
  function render() {
    if (!panel) return; [].forEach.call(panel.querySelectorAll('[data-tab]'), function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === M.tab)); if (b.dataset.tab === 'race') { var wait = stage() !== 'race' && stage() !== 'after' && !windKnown(); b.classList.toggle('mkwait', wait); b.title = wait ? 'Opens at the gun, or now once the wind is given' : ''; } });
    var h = M.tab === 'start' ? startHtml() : M.tab === 'race' ? raceHtml() : M.tab === 'after' ? afterHtml() : M.tab === 'settings' ? setHtml() : M.tab === 'help' ? helpHtml() : M.tab === 'share' ? shareHtml() : courseHtml();
    var b = $('mkBody'), y = b.scrollTop; b.innerHTML = h; b.scrollTop = y; topBar(); if (M.tab === 'start' || M.tab === 'race') live();
  }
  function seg(k, v, lab, on) { return '<button class="btn" data-k="' + k + '" data-v="' + v + '" aria-pressed="' + !!on + '">' + lab + '</button>'; }
  /* Course */
  function courseHtml() {
    var B = SOL() || { type: 'marks', marks: [], wl: {} }, w = B.wl || {}, h = '';
    h += '<div class="row"><button class="btn primary" data-k="new">New course</button>' + seg('type', 'marks', 'Round the cans', B.type !== 'wl') + seg('type', 'wl', 'Windward-leeward', B.type === 'wl') + '</div>';
    h += '<h3>Start</h3><div class="row">' + seg('startk', 'line', 'The start line', !!(B.start && B.start.line)) + seg('startk', 'tap', 'Tap a mark', !!(B.start && !B.start.line)) + '<span class="note">' + (B.start ? esc(B.start.name) : 'Not set') + '</span></div>';
    if (B.type !== 'wl') {
      h += '<h3>Marks</h3><div class="row"><input class="mkin wide" id="mkCodes" inputmode="text" autocapitalize="characters" placeholder="Codes or a pasted message: 3G P, 4F S" aria-label="Mark codes from the board or a pasted message"><button class="btn primary" data-k="codes">Add</button></div>';
      h += '<div class="row"><button class="btn" data-k="pick" data-v="port" aria-pressed="' + (PICK === 'mark-port') + '">Tap buoys: Port</button><button class="btn" data-k="pick" data-v="starboard" aria-pressed="' + (PICK === 'mark-starboard') + '">Tap buoys: Starboard</button></div>';
      h += '<div class="mkmk">' + ((B.marks || []).map(function (m, i) { return '<span class="mkchip">' + esc(m.code || m.name) + '<button data-k="side" data-v="' + i + '" aria-label="Rounding side">' + (m.side === 'starboard' ? 'S' : 'P') + '</button><button data-k="del" data-v="' + i + '" aria-label="Remove ' + esc(m.code || m.name) + '">×</button></span>'; }).join('') || '<span class="note">No marks yet.</span>') + '</div>';
      h += '<div class="row"><label>Finish</label>' + seg('fin', 'start', 'Start line', B.fin !== 'mark') + seg('fin', 'mark', 'Last mark', B.fin === 'mark') + '</div>';
    } else {
      h += '<h3>Windward mark</h3><div class="row">' + seg('wk', 'brg', 'Bearing and distance', w.wkind !== 'buoy' && w.wkind !== 'pt') + seg('wk', 'buoy', 'A buoy', w.wkind === 'buoy') + seg('wk', 'pt', 'Tap a point', w.wkind === 'pt') + '</div>';
      if (w.wkind === 'buoy') h += '<div class="row"><input class="mkin" id="mkWcode" value="' + esc(w.wcode || '') + '" placeholder="3G" aria-label="Windward buoy code" autocapitalize="characters"></div>';
      else if (w.wkind === 'pt') h += '<div class="row"><button class="btn" data-k="pickpt" data-v="wpt">Tap the windward mark</button><span class="note">' + (w.wpt ? 'Set' : 'Not set') + '</span></div>';
      else h += '<div class="row"><input class="mkin" id="mkWbrg" type="number" inputmode="numeric" min="0" max="360" value="' + (w.brg == null ? '' : w.brg) + '" placeholder="°T" aria-label="Windward mark bearing, degrees true"><input class="mkin" id="mkWdist" type="number" inputmode="decimal" step="0.1" min="0.1" value="' + (w.dist || '') + '" placeholder="nm" aria-label="Windward mark distance, nm"><button class="btn" data-k="wbrgwind">Into the wind</button></div>';
      h += '<h3>Leeward</h3><div class="row">' + seg('lk', 'start', 'Start line', !w.lkind || w.lkind === 'start') + seg('lk', 'buoy', 'A buoy', w.lkind === 'buoy') + seg('lk', 'gate', 'A gate', w.lkind === 'gate') + '</div>';
      if (w.lkind === 'buoy') h += '<div class="row"><input class="mkin" id="mkLcode" value="' + esc(w.lcode || '') + '" placeholder="2C" aria-label="Leeward buoy code" autocapitalize="characters"></div>';
      if (w.lkind === 'gate') h += '<div class="row"><input class="mkin" id="mkG1" value="' + esc(w.lcode || '') + '" placeholder="Code A" aria-label="Gate buoy A code" autocapitalize="characters"><input class="mkin" id="mkG2" value="' + esc(w.lcode2 || '') + '" placeholder="Code B" aria-label="Gate buoy B code" autocapitalize="characters"><button class="btn" data-k="pickpt" data-v="g1">Tap A</button><button class="btn" data-k="pickpt" data-v="g2">Tap B</button></div>';
      h += '<div class="row"><label>Laps</label>' + [1, 2, 3, 4].map(function (n) { return seg('laps', n, String(n), (w.laps || 2) === n); }).join('') + '</div>';
      h += '<div class="row"><label>Finish</label>' + seg('wfin', 'lee', 'Leeward', !w.fin || w.fin === 'lee') + seg('wfin', 'start', 'Start line', w.fin === 'start') + seg('wfin', 'wind', 'Windward', w.fin === 'wind') + '</div>';
      h += '<div class="row"><label>Rounding</label>' + seg('wside', 'port', 'Port', w.side !== 'starboard') + seg('wside', 'starboard', 'Starboard', w.side === 'starboard') + '</div>';
    }
    h += condHtml();
    h += legsHtml();
    h += '<div class="row"><button class="btn primary" data-k="show">Show the course</button><button class="btn" data-k="route" aria-pressed="' + !!M.routeIt + '">Route it</button></div>';
    if (M.routeIt) h += '<div class="row"><label>Forecasts</label>' + modelList().map(function (m) { return seg('model', m.id, esc(m.name), M.models.indexOf(m.id) >= 0); }).join('') + '</div><p class="note">Routes on each forecast ticked, and on the race wind as well when it is given.</p>';
    return h;
  }
  /* the wind and tide on the water: by hand on Mark, from the boat on Mark+ (Stuart 22:23) */
  function condHtml() {
    var w = M.wind || {}, t = M.tide || {}, nw = null; try { nw = plus && window.__navWind ? window.__navWind() : null; } catch (e) {}
    var h = '<h3>Wind and tide on the water</h3>';
    if (nw && nw[1] != null) h += '<p class="note">From the boat: ' + Math.round(nw[0] || 0) + ' kn from ' + p3(nw[1]) + '. Typed figures replace it.</p>';
    h += '<div class="row"><label>Wind</label><input class="mkin" id="mkTwd" type="number" inputmode="numeric" min="0" max="360" value="' + (w.twd == null ? '' : w.twd) + '" placeholder="from °T" aria-label="Wind from, degrees true"><input class="mkin" id="mkTws" type="number" inputmode="decimal" min="0" max="60" step="0.5" value="' + (w.tws == null ? '' : w.tws) + '" placeholder="kn" aria-label="Wind speed, knots"><button class="btn" data-k="hdw">Head to wind</button></div>';
    h += '<div class="row"><label>Tide</label>' + seg('tmode', 'model', 'Tide model', !t.mode || t.mode === 'model') + seg('tmode', 'steady', 'As I see it', t.mode === 'steady') + '</div>';
    if (t.mode === 'steady') h += '<div class="row"><label></label><input class="mkin" id="mkTspd" type="number" inputmode="decimal" min="0" max="8" step="0.1" value="' + (t.spd == null ? '' : t.spd) + '" placeholder="kn" aria-label="Tide, knots"><input class="mkin" id="mkTdir" type="number" inputmode="numeric" min="0" max="360" value="' + (t.dir == null ? '' : t.dir) + '" placeholder="to °T" aria-label="Tide runs towards, degrees true"></div>';
    return h;
  }
  function legsHtml() {
    var c = null; try { c = window.FSSolent && FSSolent.build ? FSSolent.build(true) : null; } catch (e) {} if (!c || !c.start || !c.marks || !c.marks.length) return '';
    var pts = [c.start].concat(c.marks, c.finish ? [c.finish] : []), tw = M.wind && M.wind.twd != null ? M.wind.twd : null, tot = 0, rows = '';
    for (var i = 1; i < pts.length; i++) { var r = rh(pts[i - 1], pts[i]); tot += r.nm; rows += '<tr><td>' + i + '</td><td>' + esc(String(pts[i].name || '').replace(/^(Start|Finish), /, '')) + (pts[i].side ? ' <small>' + (/^s/.test(pts[i].side) ? 'S' : 'P') + '</small>' : '') + (tw != null && FSSolent.legType ? '<br><small>' + FSSolent.legType(r.brg, tw) + '</small>' : '') + '</td><td><b>' + p3(r.brg) + 'T</b></td><td>' + dist(r.nm) + '</td></tr>'; }
    return '<h3>The course: ' + (pts.length - 1) + ' legs, ' + tot.toFixed(1) + ' nm' + (tw == null ? '' : '') + '</h3>' + (tw == null ? '<p class="note">Give the wind for beat, reach or run on each leg.</p>' : '') + '<table class="mklegs"><tbody>' + rows + '</tbody></table>';
  }
  function modelList() { var out = []; [].forEach.call(document.querySelectorAll('[data-m]'), function (c) { if (c.disabled) return; var id = c.getAttribute('data-m'); if (out.some(function (o) { return o.id === id; })) return; var l = c.closest('label'), t = l ? l.textContent.trim().split(/\s{2,}|\n|·|\(/)[0].trim() : id; out.push({ id: id, name: t.slice(0, 16) }); }); return out.slice(0, 6); }
  /* Start */
  function startHtml() {
    var g = gunAt(), d = g ? new Date(g * 1000) : null, l = window.__fsLine ? window.__fsLine() : {}, tr = !!l.transit, h = '';
    h += '<div class="mkbig" id="mkStartBig"></div>';
    h += '<div class="row"><label>Gun</label><input class="mkin" style="width:9em" id="mkGunT" type="time" step="60" value="' + (d ? ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) : '') + '" aria-label="Gun time for your class"><button class="btn primary" data-k="sync">Sync</button></div>';
    h += '<div class="row"><label>Sequence</label>' + seg('seq', 5, '5-4-1-0', M.seq !== 3) + seg('seq', 3, '3-2-1-0', M.seq === 3) + '<button class="btn" data-k="ap">Postpone (AP)</button><button class="btn" data-k="recall">General recall</button></div>';
    h += '<div class="row"><label>Flag</label>' + [['P', 'P'], ['I', 'I'], ['Z', 'Z'], ['U', 'U'], ['B', 'Black']].map(function (f) { return seg('flag', f[0], f[1], M.flag === f[0]); }).join('') + '</div><p class="note">' + flagText(M.flag) + '</p>';
    h += '<h3>Line</h3><div class="row">' + seg('lkind', 'cb', 'Committee boat and pin', !tr) + seg('lkind', 'tr', 'Shore transit', tr) + '</div>';
    h += '<div class="row"><button class="btn primary" data-k="ping" data-v="boat">' + (tr ? 'Ping inshore' : 'Ping boat') + (l.boat ? ' ✓' : '') + '</button><button class="btn primary" data-k="ping" data-v="pin">' + (tr ? 'Ping outer mark' : 'Ping pin') + (l.pin ? ' ✓' : '') + '</button><button class="btn" data-k="tapline">Tap the ends</button>' + (l.boat || l.pin ? '<button class="btn" data-k="clrline">Clear line</button>' : '') + '</div><p class="note">' + (tr ? 'Ping on the transit close inshore, then at the outer distance mark. Re-ping if the committee moves the line.' : 'Ping each end as you pass it. Re-ping if the committee moves the line.') + '</p>';
    return h;
  }
  function flagText(f) { return { P: 'P: the ordinary start.', I: 'I: in the last minute, a boat on the course side must sail round an end to start.', Z: 'Z: in the last minute, a boat in the triangle (the line ends and the first mark) takes a 20% scoring penalty.', U: 'U: in the last minute, a boat in the triangle is disqualified without a hearing, unless the race is restarted.', B: 'Black flag: in the last minute, a boat in the triangle is disqualified without a hearing, even if the race is restarted.' }[f] || ''; }
  /* Race */
  function raceHtml() { var rt = !!(window.__fsPlan && window.__fsPlan() && window.__fsPlan().path); return '<div class="row"><span class="rowlbl" id="mkFolL">Follow</span><div class="seg" role="group" aria-labelledby="mkFolL"><button type="button" data-k="follow" data-v="mark" aria-pressed="' + (M.follow !== 'route') + '">Rhumb line</button><button type="button" data-k="follow" data-v="route" aria-pressed="' + (M.follow === 'route') + '"' + (rt ? '' : ' title="Route it first, on the Course panel"') + '>Route</button></div></div><div class="mkbig" id="mkRaceBig"></div><div class="row"><button class="btn primary" data-k="rounded">Rounded</button><button class="btn" data-k="back">Back a mark</button><button class="btn mkred" data-k="finish">Finished</button></div>'; }
  /* After */
  function afterHtml() {
    var g = gunAt(), f = M.finAt, tcc = window.__fsTcc ? window.__fsTcc() : 1, h = '';
    if (g && f) { var el = f - g, ct = el * tcc; h += '<div class="mkbig"><div><small>Elapsed</small><b>' + hms(el) + '</b><span>gun ' + hhmm(g) + ', finish ' + hhmm(f) + '</span></div><div><small>Corrected (IRC)</small><b>' + hms(ct) + '</b><span>TCC ' + tcc.toFixed(3) + ', saved with the track</span></div></div>'; }
    else h += '<p class="note">The times show here after Finished.</p>';
    h += '<div class="row"><button class="btn primary" data-k="next">Next course</button></div><p class="note">Next course keeps the start line, the wind and the start sequence, and clears the marks and the gun time.</p>';
    return h;
  }
  function hms(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 3600) + ':' + ('0' + Math.floor(s % 3600 / 60)).slice(-2) + ':' + ('0' + s % 60).slice(-2); }
  /* Settings */
  function setHtml() {
    var h = '<h3>Settings</h3><div class="xrow"><button class="btn" data-k="help">Help</button><button class="btn" data-k="share">Share</button><button class="btn" data-k="tour">Show me round</button><button class="btn primary" data-k="test" id="mkTestBtn">' + (SIM.on ? 'Stop test mode' : 'Test mode') + '</button></div><div class="mkset">';
    h += '<div class="row"><label>Buttons</label>' + seg('big', 0, 'Standard', !M.big) + seg('big', 1, 'Big', !!M.big) + '</div>';
    h += '<div class="row"><label>Screen</label>' + seg('sun', 0, 'Normal', !M.sun) + seg('sun', 1, 'Sunlight', !!M.sun) + '</div>';
    h += '<div class="row"><label>Sounds</label>' + seg('snd', 1, 'On', !!M.snd) + seg('snd', 0, 'Off', !M.snd) + '</div>';
    h += '<div class="row"><label>Vibration</label>' + seg('vib', 1, 'On', !!M.vib) + seg('vib', 0, 'Off', !M.vib) + '</div>';
    h += '<div class="row"><label>IRC TCC</label><input class="mkin" id="mkTcc" type="number" inputmode="decimal" step="0.001" min="0.5" max="2" value="' + (window.__fsTcc ? window.__fsTcc().toFixed(3) : '') + '" aria-label="IRC time correction coefficient"></div>';
    h += '<h3>Window positions</h3><p class="note">Hold the small grip on a window, or hold a round button, to move it; drag it, then hold again to lock it there. It never covers another button: it slides to the nearest gap.</p><div class="xrow"><button class="btn" data-k="layoutreset">Reset to FirstShift layout</button></div>';
    var bc = SY.code();
    h += '<h3>Crew</h3>' + (bc ? '<p class="note">This device shares the course, the line, the gun, the flag and the wind with the crew under boat code <b>' + bc + '</b>. ' + esc(SY.msg || '') + '</p><div class="row"><button class="btn" data-k="bcsend">Send the code to crew</button><button class="btn" data-k="bcleave">Stop sharing</button></div>'
      : '<p class="note">One boat code keeps every crew phone and pad on the same course, line, gun and flag. No logins. The same code as Route and Route+.</p><div class="row"><button class="btn primary" data-k="bcmake">Make a boat code</button></div><div class="row"><input class="mkin" id="mkBcIn" maxlength="6" autocapitalize="characters" placeholder="ABC234" aria-label="Boat code to join"><button class="btn" data-k="bcjoin">Join</button></div>');
    h += '<div class="row"><button class="btn" data-k="done">Done</button></div></div>';
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
      /* the Racing window (Stuart 17 Nov 05:26): follow the rhumb line to the next mark, or follow the route, with the distance off
         it, the course and time to get back on it at the present speed, the course and speed made good; depth on Mark+.
         Uses Route's plotter (fsplot.js): its two modes are the rhumb line (MARK) and the route (ROUTE). */
      try { if (window.__fsPlot && window.__fsPlot.C) window.__fsPlot.C.mode = M.follow === 'route' ? 'route' : 'mark'; } catch (e) {}
      var pc = window.__fsPlot && window.__fsPlot.calc ? window.__fsPlot.calc() : null, cl = window.__fsCalc ? window.__fsCalc() : null, h2 = '';
      var rt = M.follow === 'route', noRt = rt && pc && pc.noRoute;
      if (pc && pc.ok) { h2 += '<div><small>Next mark</small><b>' + esc(String(pc.m.name || '').replace(/^(Start|Finish), /, '').slice(0, 14)) + '</b><span>' + (pc.m.side ? (/^s/.test(pc.m.side) ? 'starboard' : 'port') + ' · ' : '') + p3(pc.btw) + 'T · ' + dist(pc.dtw) + '</span></div>'; }
      else h2 += '<div><small>Next mark</small><b>--</b><span>' + esc(pc && pc.why || 'No course') + '</span></div>';
      if (noRt) h2 += '<div class="mkwarn" style="grid-column:1/-1;font-size:13px">No route yet: Route it on the Course panel. Showing the rhumb line.</div>';
      if (pc && pc.ok) {
        var x = pc.xte, sog = pc.sog, onWhat = rt && !noRt ? 'route' : 'line';
        if (rt && !noRt) h2 += '<div><small>Route heading</small><b>' + (x ? p3(x.leg) + 'T' : '--') + '</b><span>' + (pc.after != null ? 'then ' + p3(pc.after) + 'T at the next turn' : 'to the finish') + '</span></div>';
        if (x) {
          var off = x.d * 1852, a = Math.min(45, Math.max(10, Math.atan2(x.d, 0.15) / R)), back = (x.leg + (x.side === 'L' ? a : -a) + 360) % 360, tm = sog > 0.5 ? x.d / (sog * Math.sin(a * R)) * 60 : null;
          h2 += '<div><small>Off the ' + onWhat + '</small><b class="' + (off > 50 ? 'bad' : 'ok') + '">' + (off < 1000 ? Math.round(off) + ' m' : dist(x.d)) + '</b><span>' + (off < 5 ? 'on it' : x.side === 'L' ? 'left of it' : 'right of it') + ' · ' + onWhat + ' ' + p3(x.leg) + 'T</span></div>';
          h2 += '<div><small>Back on it</small><b>' + (off < 5 ? p3(x.leg) + 'T' : 'Steer ' + p3(back)) + '</b><span>' + (off < 5 ? 'hold the ' + onWhat : tm != null ? (tm < 1 ? 'under a minute' : Math.round(tm) + ' min') + ' at ' + sog.toFixed(1) + ' kn' : 'needs boat speed') + '</span></div>';
        }
        h2 += '<div><small>COG · SOG</small><b>' + (pc.cog != null ? p3(pc.cog) + 'T' : '--') + '</b><span>' + (sog != null ? sog.toFixed(1) + ' kn' : '') + (pc.vmc != null ? ' · VMC ' + pc.vmc.toFixed(1) + ' kn' : '') + '</span></div>';
      }
      if (plus) { var dp = sh('dpt'); h2 += '<div><small>Depth</small><b class="' + (dp != null && dp < 3 ? 'bad' : '') + '">' + (dp != null ? dp.toFixed(1) + ' m' : '--') + '</b><span>' + (dp != null ? 'from the boat' : 'no depth from the boat') + '</span></div>'; }
      var shf = cl && cl.shift; h2 += '<div><small>Header or lift</small><b class="' + (shf && shf.kind === 'header' ? 'bad' : shf && shf.kind === 'lift' ? 'ok' : '') + '">' + (shf && !shf.off ? (shf.kind === 'steady' ? 'Steady' : (shf.kind === 'lift' ? 'Lift ' : 'Header ') + shf.deg + '°') : '--') + '</b><span>' + (shf && !shf.off ? shf.tack + ' tack' : M.wind && M.wind.twd != null ? 'on a beat' : 'give the wind') + '</span></div>';
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
  function pickBar(t) { window.__fsMarkPicking = !!t; setTimeout(function () { try { window.__fsRedraw && window.__fsRedraw(); } catch (e) {} }, 0); var b = $('mkPick'); if (!t) { if (b) b.remove(); return; } if (!b) { b = document.createElement('div'); b.id = 'mkPick'; b.className = 'mkpick'; document.body.appendChild(b); } b.innerHTML = '<span>' + esc(t) + '</span><button class="btn" id="mkPickX">Done</button>'; $('mkPickX').onclick = function () { PICK = null; pickBar(null); render(); }; }
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
    else if (k === 'layoutreset') { if (window.NavDrag) NavDrag.resetAll(); toast('Windows back where FirstShift puts them.'); return; }
    else if (k === 'follow') { M.follow = v; save(); }
    else if (k === 'help') { M.tab = 'help'; save(); }
    else if (k === 'share') { M.tab = 'share'; save(); }
    else if (k === 'tour') { startTour(); return; }
    else if (k === 'test') { if (SIM.on) stopTest(); else startTest(); return; }
    else if (k === 'listen') { listen(+v); return; }
    else if (k === 'sharego') { var tx = shareText(); if (navigator.share) navigator.share({ title: 'FirstShift Mark', text: tx }).catch(function () {}); else window.open('https://wa.me/?text=' + encodeURIComponent(tx), '_blank', 'noopener'); return; }
    else if (k === 'sharewa') { window.open('https://wa.me/?text=' + encodeURIComponent(shareText()), '_blank', 'noopener'); return; }
    else if (k === 'sharecopy') { var t2 = shareText(), ta = $('mkShareTxt'); try { navigator.clipboard.writeText(t2).then(function () { toast('Copied.'); }, function () { if (ta) { ta.select(); } toast('Select the text and copy it.'); }); } catch (e) { if (ta) ta.select(); } return; }
    else if (k === 'bcmake') { SY.setCode(SY.newCode()); SY.push(true); }
    else if (k === 'bcjoin') { var cj = (($('mkBcIn') || {}).value || '').trim().toUpperCase(); if (!/^[A-HJ-NP-Z2-9]{6}$/.test(cj)) { toast('A boat code is six letters and numbers.'); return; } SY.setCode(cj); SY.sent = {}; SY.pull(true); }
    else if (k === 'bcleave') { SY.setCode(''); SY.msg = ''; }
    else if (k === 'bcsend') { var t = 'FirstShift Mark boat code ' + SY.code() + ': open ' + location.origin + location.pathname + '?boat=' + SY.code() + ' to share our course, line and gun.'; if (navigator.share) navigator.share({ title: 'FirstShift Mark boat code', text: t }).catch(function () {}); else window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank', 'noopener'); }
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
    if (!SY.applying) SY.shown = Date.now();   /* the crew's phones show it too */
  }
  function newCourse() {
    var B = SOL() || {}; try { if (window.__fsClearCourse) window.__fsClearCourse(); } catch (e) {}
    var w = Object.assign({}, B.wl, { wcode: '', wpt: null, lcode: '', lcode2: '', lpt: null, g1: null, g2: null }), l = window.__fsLine ? window.__fsLine() : {};
    solSet({ marks: [], finish: null, fin: 'start', legTide: [], startAt: null, wl: w, start: l.boat && l.pin ? { code: null, name: 'Start line', lat: (l.boat[0] + l.pin[0]) / 2, lon: (l.boat[1] + l.pin[1]) / 2, line: true } : null });
    M.finAt = null; M.gun = null; M.tab = 'course'; M.routeIt = false; save(); lastStage = 'course';   /* the next race has its own gun */ PICK = null; pickBar(null); render();
  }

  /* Laylines to the next mark when it is upwind, at the tacking angle: Mark+ on the boat's live wind; Mark on the typed race wind
     (Stuart 17 Nov 05:04: "From typed wind") */
  function laylines(ctx, X, Y) {
    if (M.tab !== 'race') return; var nw = null; try { nw = plus && window.__navWind ? window.__navWind() : null; } catch (e) {}
    if ((!nw || nw[1] == null) && M.wind && M.wind.twd != null) nw = [M.wind.tws || 0, M.wind.twd]; if (!nw || nw[1] == null) return;
    var pc = null; try { pc = window.__fsPlot && window.__fsPlot.calc ? window.__fsPlot.calc() : null; } catch (e) {} if (!pc || !pc.ok) return;
    var twa = sh('twa'), ba = twa != null && Math.abs(twa) < 60 ? Math.abs(twa) : (window.FSSolent && FSSolent.windRef && FSSolent.windRef() && FSSolent.windRef().ba) || 42, up = Math.abs(((pc.btw - nw[1] + 540) % 360) - 180) < 90; if (!up) return;
    var m = pc.m, L = Math.max(0.5, pc.dtw * 1.3);
    ctx.strokeStyle = '#ff8a1f'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
    [nw[1] + 180 - ba, nw[1] + 180 + ba].forEach(function (b) { var la = m.lat + L * Math.cos(b * R) / 60, lo = m.lon + L * Math.sin(b * R) / (60 * Math.cos(m.lat * R)); ctx.beginPath(); ctx.moveTo(X(m.lon), Y(m.lat)); ctx.lineTo(X(lo), Y(la)); ctx.stroke(); });
    ctx.setLineDash([]);
  }
  (window.__fsOverlays = window.__fsOverlays || []).push(laylines);
  /* ---------- Help, Share, the tour and test mode (Stuart 17 Nov 05:13: "Settings needs to include help and share as route need a
     guided tour and test mode - this all applies to mark and mark +") ---------- */
  var HELP = [
    ['What Mark does', 'Mark is for inshore racing: round the cans and windward-leeward, up to several races a day. It keeps the course, the start line, the gun and the next mark on your phone or pad, with the wind and tide, and keeps the crew in step by one boat code. A planning aid, not for navigation: keep a proper lookout and follow the sailing instructions.'],
    ['Setting the course', 'Course, then New course. Type the mark codes from the committee board, or paste the WhatsApp or text message (words are passed over; P or S after a code sets the rounding side). Or tap Tap buoys: Port or Starboard and tap each buoy on the chart in order. Tap P or S on a mark to change its side, or the cross to remove it. Choose the finish: the start line or the last mark.'],
    ['Windward-leeward', 'Choose Windward-leeward. Set the windward mark by bearing and distance from the start, by a buoy code, or by tapping a point; Into the wind takes the bearing from the race wind. The leeward end is the start line, a buoy, or a gate of two buoys. Choose the laps, where the finish is, and the rounding side.'],
    ['Wind and tide', 'Type the wind direction (where it blows from, degrees true) and speed, or tap Head to wind with the bow to the wind and the phone pointing ahead. Tide: the tide model, or As I see it with the speed and the direction it runs towards. They feed the routing, the line bias and the beat, reach or run of each leg.'],
    ['Show the course or route it', 'Show the course puts it on the chart with each leg\'s bearing and distance. Route it works out the fastest way round on the forecasts you tick, and on your typed race wind as well.'],
    ['The start', 'Start: set your class gun time, then Sync on the signal to round it to the whole minute. Choose 5-4-1-0 or 3-2-1-0. Postpone clears the gun; General recall starts a new sequence. Choose the preparatory flag (P, I, Z, U or black): Mark warns in the last minute if you are on the course side, by the flag in force. Sounds and vibration are on unless you turn them off in Settings.'],
    ['The line', 'Ping boat and Ping pin as you pass each end, or Tap the ends on the chart. For a shore transit, choose Shore transit and ping close inshore on the transit, then at the outer distance mark. Mark refuses a ping on land, and two ends in the same place. Re-ping when the committee moves the line. Big figures: the gun, the distance to the line, time to burn and the bias.'],
    ['Racing', 'At the gun the panel turns to Race: the next mark with its rounding side, bearing and distance; header or lift; the tide here. Rounded and Back a mark move along the course. Laylines to the next mark show on the chart when it is upwind, from the typed wind (from the boat on Mark+). Finished stops the clock.'],
    ['After the finish', 'After shows the elapsed time and the corrected time on your IRC TCC (set it in Settings). Next course keeps the line, the wind and the sequence, and clears the marks and the gun time.'],
    ['Crew and the boat code', 'Settings, Crew: Make a boat code, or join with the code a crew mate sends. Every phone and pad on the code shares the course, the line, the gun, the flag and the wind, within seconds when online. It is the same code as Route and Route+, and Mark keeps its own record, so it never changes your Route settings or races.'],
    ['The chart', 'The chart is Route\'s. The layers button at the top shows what the chart shows, with the No-go depth control: water shallower than it is shaded red. The round buttons on the chart: the ruler, and chart orientation (North up).'],
    ['Mark+', 'Mark+ is Mark connected to the boat, as Route+. The Race panel adds the true wind angle and speed, boat speed with the percentage of the polar target, and the shift trend; laylines use the live wind.'],
    ['Test mode', 'Settings, Test mode: a practice boat sails your course on the chart, so you can watch the start, the line figures, the next mark and the finish without going afloat. Nothing goes to the crew. Stop test mode puts your own course, line and gun back.']
  ];
  function helpHtml() {
    var h = '<h3>Help</h3><div class="xrow"><button class="btn primary" data-k="test">' + (SIM.on ? 'Stop test mode' : 'Try it safely: test mode') + '</button><button class="btn" data-k="tour">Show me round</button></div>';
    HELP.forEach(function (t, i) { h += '<div class="htopic"><h3>' + esc(t[0]) + ' <button class="btn" data-k="listen" data-v="' + i + '" aria-label="Listen to ' + esc(t[0]) + '">Listen</button></h3><p>' + esc(t[1]) + '</p></div>'; });
    return h + '<div class="xrow"><button class="btn" data-k="done">Done</button></div>';
  }
  function listen(i) { try { var sy = window.speechSynthesis; if (!sy) { toast('This device cannot read aloud.'); return; } sy.cancel(); var u = new SpeechSynthesisUtterance(HELP[i][0] + '. ' + HELP[i][1]); u.lang = 'en-GB'; sy.speak(u); } catch (e) {} }
  function shareText() {
    var B = SOL() || {}, c = null, l = (window.__fsLine && window.__fsLine()) || {}, t = 'FirstShift Mark · ' + (window.FS_AREA || 'Solent');
    try { c = FSSolent.build(true); } catch (e) {}
    if (M.gun) t += '\nGun ' + hhmm(M.gun) + ' (' + (M.seq === 3 ? '3-2-1-0' : '5-4-1-0') + ', flag ' + (M.flag === 'B' ? 'black' : M.flag) + ')';
    if (c && c.start && c.marks && c.marks.length) { t += '\nStart: ' + String(c.start.name || '').replace(/^Start, /, '') + '\nCourse: ' + c.marks.map(function (m) { return String(m.name || '').split(' ')[0] + ' ' + (/^s/.test(m.side || '') ? 'S' : 'P'); }).join(', ') + (c.finish ? '\nFinish: ' + String(c.finish.name || '').replace(/^Finish, /, '') : '');
      var pts = [c.start].concat(c.marks, c.finish ? [c.finish] : []), legs = []; for (var i = 1; i < pts.length; i++) { var r = rh(pts[i - 1], pts[i]); legs.push(i + ' ' + p3(r.brg) + 'T ' + dist(r.nm)); } t += '\nLegs: ' + legs.join(' · '); }
    else t += '\nNo course set yet.';
    if (l.boat && l.pin) t += '\nLine: ' + (l.transit ? 'shore transit' : 'committee boat and pin') + ', ' + Math.round(rh({ lat: l.boat[0], lon: l.boat[1] }, { lat: l.pin[0], lon: l.pin[1] }).nm * 1852) + ' m';
    if (M.wind && M.wind.twd != null) t += '\nWind ' + p3(M.wind.twd) + (M.wind.tws ? ' ' + M.wind.tws + ' kn' : '');
    if (SY.code()) t += '\nBoat code ' + SY.code() + ': ' + location.origin + location.pathname + '?boat=' + SY.code();
    return t + '\nPlanning aid, not for navigation.';
  }
  function shareHtml() { var t = shareText(); return '<h3>Share</h3><p class="note">The course, the gun and the line, ready to send to the crew or post in the class WhatsApp group.</p><textarea id="mkShareTxt" readonly rows="8" style="width:100%;box-sizing:border-box">' + esc(t) + '</textarea><div class="xrow"><button class="btn primary" data-k="sharego">Share…</button><button class="btn" data-k="sharewa">WhatsApp</button><button class="btn" data-k="sharecopy">Copy</button><button class="btn" data-k="done">Done</button></div>'; }
  /* the guided tour: Route's tour (fstour.js), walking round Mark's own screen */
  function tourSteps() {
    var tab = function (t) { return function () { FSMark.set({ tab: t }); }; };
    return [{ n: 1, name: 'Mark', note: 'Course, start, race and after', steps: [
      { el: '.mkbrand', t: 'Your race', x: 'The race, the area and the gun countdown.' },
      { el: '#mkTab-course', before: tab('course'), t: 'Course', x: 'Type the codes from the board, paste the WhatsApp message, or tap the buoys on the chart. Windward-leeward courses too.' },
      { el: '#mkTwd', before: tab('course'), t: 'Wind and tide', x: 'Type the wind, or Head to wind; the tide model or the tide as you see it. They feed the routing, the line bias and the leg types.' },
      { el: '#mkBody [data-k=show]', before: tab('course'), t: 'Show it, or route it', x: 'Show the course on the chart, or route it on the forecasts and your race wind.' },
      { el: '#mkTab-start', before: tab('start'), t: 'Start', x: 'Gun time, Sync, the sequence, postponement and recall, and the flag in force.' },
      { el: '#mkBody [data-k=ping]', before: tab('start'), t: 'The line', x: 'Ping each end as you pass it, or tap them on the chart. Distance to the line, time to burn and the bias.' },
      { el: '#mkTab-race', before: tab('race'), t: 'Race', x: 'The next mark, header or lift, and the tide here. Rounded, Back a mark and Finished.' },
      { el: '#mkTab-after', before: tab('after'), t: 'After', x: 'Elapsed and IRC corrected time, then Next course.' },
      { el: '#mkLayBtn', t: 'The chart', x: 'What the chart shows, with the No-go depth control.' },
      { el: '#fsRulerBtn', t: 'Ruler', x: 'Measure a bearing and distance on the chart.' },
      { el: '#mkTestBtn', before: tab('settings'), test: true, t: 'Try it safely first', x: 'Test mode: a practice boat sails your course on the chart. Nothing goes to the crew and nothing can go wrong.' },
      { el: '#mkSetBtn', before: tab('settings'), t: 'Settings', x: 'Help, Share, this tour, test mode, the boat code for the crew, big buttons, sunlight, sounds and your IRC TCC.' }
    ] }];
  }
  function tourSetup() { window.FSTourLevels = tourSteps(); window.FSTourPrepare = function () { var ly = $('layers'); if (ly && !ly.hidden && $('mkLayBtn')) $('mkLayBtn').click(); PICK = null; pickBar(null); };
    window.FSTourTry = '<p><b>Test mode</b>, in Settings: a practice boat sails your course on the chart, so you can watch the start, the line, the next mark and the finish. Nothing goes to the crew and nothing can go wrong.</p>'; window.FSTryPractice = startTest; }
  function startTour() { tourSetup(); try { if (window.FSTour) FSTour.level(1); } catch (e) { try { FSTour.start(); } catch (x) {} } }
  /* test mode: a practice boat (app.js __fsSim) */
  var SIM = { on: false, t: null, saved: null, i: 0 };
  function testBar(on) { var b = $('mkTestBar'); document.documentElement.classList.toggle('mktest', !!on); if (!on) { if (b) b.remove(); return; } if (!b) { b = document.createElement('div'); b.id = 'mkTestBar'; b.className = 'mkpick mktestbar'; document.body.appendChild(b); } b.innerHTML = '<span><b>Test mode.</b> A practice boat sails your course. Nothing goes to the crew.</span><button class="btn" id="mkTestX">Stop</button>'; $('mkTestX').onclick = stopTest; }
  function startTest() {
    if (SIM.on || !window.__fsSim) return; var B = SOL() || {};
    SIM.saved = { M: JSON.parse(JSON.stringify(M)), B: JSON.parse(JSON.stringify({ type: B.type, marks: B.marks, start: B.start, wl: B.wl, fin: B.fin })), line: JSON.parse(JSON.stringify((window.__fsLine && window.__fsLine()) || {})) };
    var c = null; try { c = FSSolent.build(); } catch (e) {}
    if (!c || c.err) { window.__fsSetLine('boat', 50.7700, -1.2950); window.__fsSetLine('pin', 50.7700, -1.2895); solSet({ type: 'marks', start: { code: null, name: 'Start line', lat: 50.7700, lon: -1.29225, line: true }, marks: FSSolent.board('3F P, 2C S').marks, fin: 'start' }); toast('Test mode: a sample course from the Cowes area.'); }
    var l = window.__fsLine(); if (!(l.boat && l.pin)) { var st = SOL().start; window.__fsSetLine('boat', st.lat, st.lon - 0.0028); window.__fsSetLine('pin', st.lat, st.lon + 0.0028); }
    if (!M.wind || M.wind.twd == null) M.wind = { twd: 230, tws: 12 };
    M.gun = Math.round(Date.now() / 1000 + 150); M.flag = 'P'; M.seq = 5; M.finAt = null; M.tab = 'start'; save(); SIM.on = true; useCourse(false); gunToEngine();
    window.__fsSim(true); SIM.i = 0; SIM.pos = null; testBar(true); render(); SIM.t = setInterval(simStep, 1000); simStep();
  }
  function simStep() {
    if (!SIM.on) return; var l = window.__fsLine(), c = window.__navCourse && window.__navCourse(); if (!l.boat || !l.pin || !c) return;
    var now = Date.now() / 1000, g = M.gun || now, mid = { lat: (l.boat[0] + l.pin[0]) / 2, lon: (l.boat[1] + l.pin[1]) / 2 }, pts = (c.marks || []).concat(c.finish ? [c.finish] : []), first = pts[0];
    var k = Math.cos(mid.lat * R), up = rh(mid, first).brg, pre = (up + 180) % 360, at = function (p, b, m) { return { lat: p.lat + m / 1852 * Math.cos(b * R) / 60, lon: p.lon + m / 1852 * Math.sin(b * R) / (60 * k) }; };
    var kn = 6, cog, p;
    if (now < g) { var d = Math.max(0, (g - now) * 2.2 - 15); p = at(mid, pre, d); cog = up; kn = 4.3; }   /* closing the line at about 4 knots, crossing just after the gun */
    else { if (!SIM.pos) SIM.pos = at(mid, up, 10); var tgt = pts[SIM.i]; if (!tgt) return; var r = rh(SIM.pos, tgt), step = 6 * 0.514 * 8;   /* 6 knots, eight times quicker than life */
      var wob = Math.sin(now / 25) * 7; cog = (r.brg + wob + 360) % 360;
      if (r.nm * 1852 <= step) { SIM.pos = { lat: tgt.lat, lon: tgt.lon }; SIM.i++; try { if (window.__fsPlot && window.__fsPlot.setMark) window.__fsPlot.setMark(Math.min(SIM.i, pts.length - 1)); } catch (e) {}
        if (SIM.i >= pts.length) { M.finAt = Math.round(now); M.tab = 'after'; save(); render(); toast('Test mode: finished. Stop test mode puts your own race back.'); clearInterval(SIM.t); } }
      else SIM.pos = at(SIM.pos, cog, step); p = SIM.pos; }
    window.__fsSimFix(p.lat, p.lon, kn, cog);
  }
  function stopTest() {
    if (!SIM.on) return; clearInterval(SIM.t); SIM.on = false; window.__fsSim(false); testBar(false); var sv0 = SIM.saved || {};
    ['tab', 'gun', 'flag', 'seq', 'finAt', 'wind', 'tide'].forEach(function (q) { if (sv0.M) M[q] = sv0.M[q]; }); if (M.tab === 'after' || M.tab === 'race') M.tab = 'course'; save();
    if (sv0.B) solSet(sv0.B); ['boat', 'pin'].forEach(function (e) { var a = sv0.line && sv0.line[e]; window.__fsSetLine(e, a ? a[0] : null, a ? a[1] : null); });
    try { if (window.__fsClearCourse) window.__fsClearCourse(); var c = FSSolent.build(); if (c && !c.err) useCourse(false); } catch (e) {} gunToEngine(); render(); toast('Test mode stopped: your own race is back.');
  }
  /* the landing page: Route's, in Mark's name */
  function splash() {
    var sp = $('splash'); if (!sp) return; var nm = plus ? 'Mark+' : 'Mark'; sp.setAttribute('aria-label', 'FirstShift ' + nm);
    var h1 = sp.querySelector('.sp-txt h1'); if (h1) h1.innerHTML = (plus ? 'Mark+' : 'Mark') + '<span>.</span><sup class="tm" aria-label="trade mark">™</sup>';   /* as Route. and Route+. (Stuart 17 Nov 05:22) */
    var p0 = sp.querySelector('.sp-txt > p'); if (p0) p0.textContent = 'Inshore racing for the ' + (window.FS_AREA || 'Solent') + ': round the cans and windward-leeward. The course, the start line, the gun and the next mark on your phone or pad, with the crew in step by one boat code.';
    var te = $('spTerms'); if (te) { te.setAttribute('aria-label', 'Before you use ' + nm); [].forEach.call(te.querySelectorAll('b,p'), function (e) { e.textContent = e.textContent.replace(/\bRoute\b/g, nm); }); }
    var tr = $('spTry'); if (tr) tr.title = 'Test mode first: nothing is sent anywhere';
    tourSetup();
  }

  /* ---------- crew sync by the boat code (brief 5; Stuart 17 Nov 05:04: "Crew sync") ----------
     Every crew phone and pad on the same boat code shares the course, the line, the gun, the sequence, the flag, the wind, the tide
     and the finish. It uses the boat code server (site/functions/api/boat/[code].js) under a record of its own, so it never touches
     Route's boat settings or races. Each part carries the time it was changed; the newest change of each part wins, so two crew
     changing different things at once both keep theirs. Changes go out at once and the others see them within about five seconds. */
  var SY = { sent: {}, parts: ld('fs-mark-sync', {}), msg: '', shown: 0, applying: false, busy: false, dirty: false };
  var A32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  SY.code = function () { try { return localStorage.getItem('fs-boatcode') || ''; } catch (e) { return ''; } };
  SY.setCode = function (c) { try { localStorage.setItem('fs-boatcode', c); localStorage.setItem('fs-boatcode-at', '0'); } catch (e) {} SY.parts = {}; SY.sent = {}; sv('fs-mark-sync', {}); };
  SY.newCode = function () { var r = new Uint32Array(6), c = ''; try { crypto.getRandomValues(r); } catch (e) { for (var i = 0; i < 6; i++) r[i] = Math.random() * 1e9; } for (var j = 0; j < 6; j++) c += A32[r[j] % 32]; return c; };
  function recCode(c) { return c.split('').map(function (ch) { return A32[(A32.indexOf(ch) + 11) % 32]; }).join(''); }   /* Mark's own record beside the boat's */
  var DEV = (function () { var d = ''; try { d = localStorage.getItem('fs-dev') || ''; if (!d) { d = SY.newCode() + SY.newCode(); localStorage.setItem('fs-dev', d); } } catch (e) {} return d; })();
  function r6(a) { return a ? [+(+a[0]).toFixed(6), +(+a[1]).toFixed(6)] : null; }
  function snap() {
    var B = SOL() || {}, l = (window.__fsLine && window.__fsLine()) || {};
    return { course: { type: B.type || 'marks', marks: B.marks || [], start: B.start || null, wl: B.wl || {}, fin: B.fin || 'start' }, line: { boat: r6(l.boat), pin: r6(l.pin), transit: !!l.transit },
      gun: { gun: M.gun || null, seq: M.seq, finAt: M.finAt || null }, flag: M.flag, wind: { wind: M.wind || null, tide: M.tide || null }, shown: SY.shown || 0 };
  }
  function noteLocal() { var sn = snap(), now = Date.now(); Object.keys(sn).forEach(function (k) { var js = JSON.stringify(sn[k]); if (SY.sent[k] == null) { SY.sent[k] = js; if (!SY.parts[k]) return; } if (js !== SY.sent[k]) { SY.sent[k] = js; SY.parts[k] = { at: now, v: sn[k], dev: DEV }; SY.dirty = true; } }); if (SY.dirty) sv('fs-mark-sync', SY.parts); }
  function applyPart(k, v) {
    SY.applying = true;
    try {
      if (k === 'course') solSet({ type: v.type, marks: v.marks, start: v.start, wl: v.wl, fin: v.fin });
      else if (k === 'line') { var cur = (window.__fsLine && window.__fsLine()) || {}; ['boat', 'pin'].forEach(function (e) { var a = v[e], b = r6(cur[e]); if (JSON.stringify(a) !== JSON.stringify(b)) window.__fsSetLine(e, a ? a[0] : null, a ? a[1] : null); }); if (!!cur.transit !== !!v.transit && window.__fsLineKind) window.__fsLineKind(!!v.transit); lineToStart(); }
      else if (k === 'gun') { M.gun = v.gun; M.seq = v.seq || M.seq; M.finAt = v.finAt; save(); gunToEngine(); }
      else if (k === 'flag') { M.flag = v; save(); }
      else if (k === 'wind') { M.wind = v.wind; M.tide = v.tide; save(); if (M.wind && M.wind.twd != null) solSet({ wind: { twd: M.wind.twd, src: 'crew', at: Date.now() } }); pushFix(); }
      else if (k === 'shown') { if (v > (SY.shown || 0)) { SY.shown = v; var c = window.FSSolent && FSSolent.build ? FSSolent.build() : null; if (c && !c.err) useCourse(false); } }
    } catch (e) {}
    SY.applying = false; SY.sent[k] = JSON.stringify(snap()[k]);
  }
  function merge(remote) { var got = [], push = false; remote = remote || {};
    Object.keys(remote).forEach(function (k) { var r = remote[k], m = SY.parts[k]; if (r && (!m || r.at > m.at)) { SY.parts[k] = r; if (r.dev !== DEV) got.push(k); applyPart(k, r.v); } });
    Object.keys(SY.parts).forEach(function (k) { var r = remote[k], m = SY.parts[k]; if (m && (!r || m.at > r.at)) push = true; });
    sv('fs-mark-sync', SY.parts); return { got: got, push: push }; }
  function url() { return '/api/boat/' + recCode(SY.code()); }
  SY.pull = function (force) { var c = SY.code(); if (!c || SIM.on || SY.busy || !navigator.onLine) return Promise.resolve(); SY.busy = true;
    return fetch(url(), { cache: 'no-store' }).then(function (r) { return r.json().then(function (j) { return { st: r.status, j: j }; }); }).then(function (o) {
      SY.busy = false; if (o.st === 404) { SY.msg = 'Waiting for the first change from a crew device.'; if (Object.keys(SY.parts).length) return SY.push(true); return; }
      if (o.j.error) { SY.msg = o.j.error; return; }
      var res = merge(o.j.data && o.j.data.parts); if (res.got.length) { render(); toast('Updated by the crew: ' + res.got.map(function (k) { return { course: 'course', line: 'line', gun: 'gun', flag: 'flag', wind: 'wind and tide', shown: 'course on the chart' }[k]; }).join(', ') + '.'); }
      SY.msg = 'In step ' + new Date().toTimeString().slice(0, 8) + '.'; if (res.push || SY.dirty) return SY.push(true);
    }).catch(function () { SY.busy = false; SY.msg = 'No connection: changes go when it is back.'; }); };
  SY.push = function () { var c = SY.code(); if (!c || SY.busy || !navigator.onLine) return Promise.resolve(); SY.busy = true;
    /* read, merge, write: the newest change of each part wins */
    return fetch(url(), { cache: 'no-store' }).then(function (r) { return r.status === 404 ? { data: null } : r.json(); }).then(function (j) {
      if (j && j.error) { SY.busy = false; SY.msg = j.error; return; }
      var res = merge(j && j.data && j.data.parts); if (res.got.length) render(); SY.dirty = false;
      return fetch(url(), { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: { kind: 'mark', parts: SY.parts } }) }).then(function (r) { return r.json(); }).then(function (o) { SY.busy = false; SY.msg = o.error ? o.error : 'Shared ' + new Date().toTimeString().slice(0, 8) + '.'; });
    }).catch(function () { SY.busy = false; SY.dirty = true; SY.msg = 'No connection: changes go when it is back.'; }); };
  function syncTick() { if (!SY.code() || SIM.on) return;   /* test mode: nothing goes to the crew */ noteLocal(); if (SY.dirty) SY.push(); }
  function syncInit() {
    try { var q = new URLSearchParams(location.search).get('boat'); if (q && /^[A-HJ-NP-Z2-9]{6}$/i.test(q) && q.toUpperCase() !== SY.code()) SY.setCode(q.toUpperCase()); } catch (e) {}
    setTimeout(function () { noteLocal(); SY.dirty = false; SY.pull(true); }, 2500);
    setInterval(syncTick, 1000); setInterval(function () { if (!document.hidden) SY.pull(false); }, 5000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) SY.pull(false); }); window.addEventListener('online', function () { SY.pull(false); });
  }
  window.__mkSync = SY;
  function boot() { if (!document.body) return setTimeout(boot, 50); splash(); build(); hook(); syncInit(); setTimeout(tourSetup, 1500); try { if (window.FSSolent && FSSolent.load) FSSolent.load(); if (window.FSSolent && FSSolent.on) FSSolent.on(true); } catch (e) {} }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.FSMark = { state: function () { return M; }, render: render, stage: stage, set: function (o) { Object.assign(M, o); save(); applyLook(); render(); } };
})();
