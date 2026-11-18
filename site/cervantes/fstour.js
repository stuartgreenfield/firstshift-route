/* FirstShift tour: a walk round the real screen, one button at a time (Stuart 14 Nov 2026).
   Decided 14:14: "a yes no on the landing page" (asked every time), "highlight each button on screen with a more button
   which takes them to help or more detailed explanation", Route Level 1 only, Route+ all three levels. 13:52: show new
   users how to use the test modes so they get a feel for the tools, highlighted in the tour and at the top of Help.
   Route+ adds its levels by setting window.FSTourLevels (see navtour.js); Route has Level 1 only. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function q(s) { try { return document.querySelector(s); } catch (e) { return null; } }
  function shown(el) { if (!el) return false; var r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return false; var st = getComputedStyle(el); if (st.visibility === 'hidden' || st.display === 'none') return false; for (var p = el; p; p = p.parentElement) if (p.hidden) return false; return true; }
  function openSheet(tab) { var t0 = q('.tab[data-tab="decision"]'); if (t0 && t0.getAttribute('aria-selected') !== 'true') t0.click(); if (!shown($('finBox')) && $('panelBtn')) $('panelBtn').click(); if (tab) { var t = q('.tab[data-tab="' + tab + '"]'); if (t && t.getAttribute('aria-selected') !== 'true') t.click(); } }   /* opens the results panel only when it is closed: on a phone the button folds it */

  /* Route, Level 1: get going the basic way (race, forecast, route, plotter) */
  var ROUTE = [
    { el: '#raceBtn', t: 'Your race', x: 'Tap the race name to choose a RORC or JOG race, open a route you saved, or draw a course of your own on the chart.', help: 'Setting up a race' },
    { el: '#startChip', t: 'The start', x: 'When your class starts. Every route begins here. Change it and Route works the race out again for every forecast.', help: 'Setting up a race' },
    { el: '#setBtn', t: 'Settings', x: 'Your boat, sails and reefs, the forecast models, the safety depth and your units. Set your boat once and Route remembers it on this device.', help: 'Your boat' },
    { el: '#finBox', before: function () { openSheet('decision'); }, alt: '#panelBtn', t: 'The routes', x: 'One route for each forecast model, each with its finish time. The fastest is marked. Where the models agree, you can trust the route more. Tap one to show it on the chart.', help: 'Routes' },
    { el: '.tab[data-tab="plan"]', before: function () { openSheet(); }, alt: '#panelBtn', t: 'The plan', x: 'The race leg by leg: headings, sails, tacks and gybes, ready to send to the crew.', help: 'Plan' },
    { el: '#play', test: true, t: 'Try it safely first', x: 'Press Play and watch the boat sail the route on the chart, with the wind, the tide and the figures at every moment. Nothing is sent anywhere and nothing can go wrong: it is the best way to get a feel for Route before race day.', help: 'Play the race' },
    { el: '#time', t: 'Any moment of the race', x: 'Drag the slider to any time in the race. The chart, the boat and the bar of figures below follow it.', help: 'Play the race' },
    { el: '#fsPlotBtn', t: 'Plotter', x: 'While racing: the next mark from this phone’s own GPS, with bearing, distance, VMC, ETA and cross-track error. Not for navigation.', help: 'plot' },
    { el: '#liveBtn', t: 'Live GPS', x: 'While racing: shows the boat from this phone’s GPS against the plan, and routes again from where you really are.', help: 'Live GPS while racing' },
{ el: function () { return [].filter.call(document.querySelectorAll('.navgrip2'), function (g) { return !g.hidden && g.getClientRects().length; })[0] || null; }, alt: '#fsPlotBtn,#navPlotBtn,#liveBtn', t: 'Move or put away any window', x: 'Drag the small dots on any window over the chart, such as the plotter bar or the GPS window, to move it anywhere; let go and it stays. Drag it off the left or right side and it tucks away to a light blue tab on that edge, clearing the screen for the chart; tap the tab to bring it back. Settings, Display, Window positions: Lock layout, and the dots on the left, middle or right.' },
    { el: '#layersBtn', t: 'Layers', x: 'Choose what the chart shows: wind, tide, waves, depth and marks.', help: 'charts' },
    { el: '#helpBtn', t: 'Help', x: 'Everything is explained in Help, with a Listen button on each topic. Try it safely first is at the top, and you can take this tour again from there.' }
  ];
  /* Route's own preparation (F14 photo, 15 Nov 19:51: "Nothing to point at" with the menus hidden): bring the menus back from Clear
     screen and the deck screen's MENU before the tour looks for its buttons. Route+ sets its own (navtour.js). */
  function prepRoute() {
    try { if (window.NavClear && window.NavClear.on()) window.NavClear.set(false); } catch (e) {}
    try { if (document.body.classList.contains('fsdeck') && !document.body.classList.contains('fsdeckmenu')) document.body.classList.add('fsdeckmenu'); } catch (e) {}
  }
  function prep() { try { if (window.FSTourPrepare) window.FSTourPrepare(); else prepRoute(); } catch (e) {} }
  function levels() { var L = window.FSTourLevels; return L && L.length ? L : [{ n: 1, name: 'Get going', note: 'Race, forecast, route and plotter', steps: ROUTE }]; }
  window.FSTourRoute = ROUTE;
  function tryText() { return window.FSTourTry || '<p><b>Press Play</b> under the chart and watch the boat sail the route, with the wind, the tide and the figures at every moment. Nothing is sent anywhere and nothing can go wrong. Drag the slider to any moment of the race.</p>'; }

  var css = '.fst{position:fixed;inset:0;z-index:300;pointer-events:none}.fst[hidden]{display:none}.fst-card{pointer-events:auto}.fst-blk{position:fixed;pointer-events:auto;background:transparent}' +
    '.fst-hole{position:fixed;border-radius:12px;box-shadow:0 0 0 9999px rgba(2,12,24,.62);outline:3px solid #6FA9E0;outline-offset:2px;transition:all .25s ease;pointer-events:none}' +
    '.fst-hole.test{outline-color:#F2B233;box-shadow:0 0 0 9999px rgba(2,12,24,.62),0 0 0 8px rgba(242,178,51,.35)}' +
    '.fst-card{position:fixed;width:min(340px,calc(100vw - 24px));background:var(--panel,#fff);color:var(--ink,#13202A);border-radius:14px;padding:14px 16px 12px;box-shadow:0 10px 32px rgba(0,0,0,.35);font:400 15px/1.45 var(--f-body,system-ui,sans-serif)}' +
    '.fst-card h4{margin:0 0 6px;font:700 17px/1.2 var(--f-head,system-ui,sans-serif)}.fst-card p{margin:0 0 10px}.fst-n{font-size:12px;color:var(--muted,#5A6A75);letter-spacing:.04em;text-transform:uppercase;margin-bottom:4px}' +
    '.fst-card.test h4{color:#B26A00}.fst-tag{display:inline-block;font:700 11px/1 var(--f-body,system-ui);letter-spacing:.08em;text-transform:uppercase;background:#F2B233;color:#13202A;border-radius:4px;padding:3px 6px;margin-left:6px;vertical-align:2px}' +
    '.fst-b{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.fst-b .btn{min-height:40px}.fst-end{margin-left:auto;background:none;border:0;color:var(--muted,#5A6A75);text-decoration:underline;font:inherit;font-size:13px;padding:8px 2px;cursor:pointer}' +
    '.fst-lv{display:grid;gap:8px;margin:6px 0 10px}.fst-lv button{text-align:left;padding:10px 12px;border-radius:10px;border:1px solid var(--line,#D3DCE2);background:var(--soft,#F2F6F8);color:inherit;font:inherit;cursor:pointer}.fst-lv b{display:block}.fst-lv span{font-size:13px;color:var(--muted,#5A6A75)}' +
    '.fst-flash{animation:fstf 1.6s ease 2}@keyframes fstf{50%{background:rgba(242,178,51,.28)}}' +
    '.fst-try{border:2px solid #F2B233;border-radius:12px;padding:12px 14px;margin:0 0 14px;background:rgba(242,178,51,.10)}.fst-try h3{margin:0 0 6px}.fst-try p{margin:0 0 8px}' +
    '.sp-tour .sp-try{border-color:#4CC38A!important;color:#4CC38A!important}.sp-tour{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:14px;font:400 15px/1.4 var(--f-body,system-ui)}.sp-tour b{font-weight:600;margin-right:4px}.sp-tour .btn{min-height:42px}.sp-tour .btn.ghost{background:transparent;border:1px solid #6FA9E0;color:#fff}' +
    '.sp-terms .sp-tb2{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}' +
    '.sp-film{display:flex;gap:12px;align-items:center;margin-top:14px;padding:6px 14px 6px 6px;background:rgba(255,255,255,.08);border:1px solid rgba(111,169,224,.55);border-radius:12px;color:#fff;cursor:pointer;text-align:left;font:inherit;max-width:100%}.sp-film img{width:120px;height:68px;object-fit:cover;border-radius:8px;flex:none;background:#000}.sp-film span{display:grid;gap:2px;min-width:0}.sp-film b{font:600 15px/1.25 var(--f-head,system-ui)}.sp-film i{font-style:normal;font-size:13px;color:#B9CFE6}.sp-film img+span::before{content:"";}' +
    '.fsfilm{position:fixed;inset:0;z-index:400;background:rgba(2,10,20,.86);display:flex;align-items:center;justify-content:center;padding:max(12px,env(safe-area-inset-top,0px)) max(12px,env(safe-area-inset-right,0px)) max(12px,env(safe-area-inset-bottom,0px)) max(12px,env(safe-area-inset-left,0px))}.fsfilm[hidden]{display:none}' +
    '.fsfilm-in{width:min(960px,100%);display:grid;gap:10px}.fsfilm video{width:100%;max-height:calc(100vh - 120px);background:#000;border-radius:12px}.fsfilm-b{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}.fsfilm-b .btn{min-height:44px}.fsfilm h3{margin:0;color:#fff;font:600 17px/1.3 var(--f-head,system-ui)}.fsfilm p{margin:0;color:#B9CFE6;font-size:13px}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var T = { on: false, lv: null, i: 0, root: null, paused: false };
  function build() {
    if (T.root) return T.root;
    var r = document.createElement('div'); r.className = 'fst'; r.id = 'fsTour'; r.hidden = true; r.setAttribute('role', 'dialog'); r.setAttribute('aria-label', 'Tour');
    r.innerHTML = '<div class="fst-blk"></div><div class="fst-blk"></div><div class="fst-blk"></div><div class="fst-blk"></div><div class="fst-hole"></div><div class="fst-card" role="document"></div>';
    document.body.appendChild(r); T.root = r;
    r.addEventListener('click', function (e) {
      var b = e.target.closest('[data-fst]'); if (!b) return; var a = b.dataset.fst;
      if (a === 'next') go(T.i + 1, 1); else if (a === 'back') go(T.i - 1, -1); else if (a === 'end') end(); else if (a === 'more') more(); else if (a === 'snd' && window.FSTourSound) { var on = FSTourSound.toggle(); b.textContent = on ? 'Voice off' : 'Voice on'; b.setAttribute('aria-pressed', on ? 'true' : 'false'); } else if (a.indexOf('lv') === 0) startLevel(+a.slice(2));
    });
    addEventListener('resize', function () { if (T.on && !T.paused) place(); });
    document.addEventListener('keydown', function (e) { if (!T.on || T.paused) return; if (e.key === 'Escape') end(); else if (e.key === 'ArrowRight') go(T.i + 1, 1); else if (e.key === 'ArrowLeft') go(T.i - 1, -1); });
    return r;
  }
  function steps() { return T.lv ? T.lv.steps : []; }
  /* on top: the button is the thing a finger would touch at its middle, not something lying over it (Stuart's iPhone 18 Nov 21:02: the tour
     pointed at Settings while the race menu covered it) */
  function onTop(el) { if (!shown(el)) return false; var r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2; if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return true;
    var rt = T.root, was = rt && rt.style.display; if (rt) rt.style.display = 'none'; var h = document.elementFromPoint(x, y); if (rt) rt.style.display = was || '';
    return !h || h === el || el.contains(h) || h.contains(el); }
  function target(s) { var el = typeof s.el === 'function' ? s.el() : q(s.el); if (onTop(el)) return el; var a = s.alt && q(s.alt); return onTop(a) ? a : null; }
  function go(i, dir) {   /* a step that opens a panel first gets a moment for it to appear; one that still cannot be seen is skipped */
    var S = steps(); dir = dir || (i >= T.i ? 1 : -1);
    if (i < 0) { i = 0; dir = 1; }
    if (i >= S.length) { finish(); return; }
    var s = S[i]; try { if (s.before) s.before(); } catch (e) {}
    setTimeout(function () { if (target(s)) { T.i = i; place(); } else go(i + dir, dir); }, s.wait || (s.before ? 350 : 30));   /* wait: a step whose button takes longer to appear (Mark's practice race) */
  }
  /* Stuart's iPhone 18 Nov 19:51 ("very difficult to control and the windows jump everywhere"): the highlighted button can now be
     tapped (the dim area round it still blocks), and the highlight and the card follow the button if it moves, instead of
     pointing at where it used to be */
  function blocks(l, t, w, h) { var B = T.root.querySelectorAll('.fst-blk'), W = innerWidth, H = innerHeight, r = l + w, b = t + h;
    var set = function (e, x, y, ww, hh) { e.style.left = x + 'px'; e.style.top = y + 'px'; e.style.width = Math.max(0, ww) + 'px'; e.style.height = Math.max(0, hh) + 'px'; };
    set(B[0], 0, 0, W, t); set(B[1], 0, b, W, H - b); set(B[2], 0, t, l, h); set(B[3], r, t, W - r, h); }
  function holeAt(b) { var pad = 6, hole = T.root.querySelector('.fst-hole'), l = b.left - pad, t = b.top - pad, w = b.width + pad * 2, h = b.height + pad * 2;
    hole.style.left = l + 'px'; hole.style.top = t + 'px'; hole.style.width = w + 'px'; hole.style.height = h + 'px'; blocks(l, t, w, h); T.at = [b.left, b.top, b.width, b.height]; }
  function safeTop() { return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('padding-top')) || 0; }
  function cardAt(b) { var card = T.root.querySelector('.fst-card'), cw = card.offsetWidth, ch = card.offsetHeight, gap = 14, x, y;
    if (innerWidth < 600) { var top0 = 12 + safeTop(), low = innerHeight - ch - 12, below = innerHeight - b.bottom, above = b.top;   /* the side with room, so the card never covers what it points at */
      y = below >= ch + 24 ? low : above >= ch + 24 + safeTop() ? top0 : (below > above ? low : top0); x = (innerWidth - cw) / 2; }
    else { x = Math.min(Math.max(12, b.left + b.width / 2 - cw / 2), innerWidth - cw - 12);
      if (b.bottom + gap + ch < innerHeight - 8) y = b.bottom + gap; else if (b.top - gap - ch > 8) y = b.top - gap - ch; else { y = Math.max(8, Math.min(innerHeight - ch - 8, b.top)); x = b.right + gap + cw < innerWidth ? b.right + gap : Math.max(12, b.left - gap - cw); } }
    card.style.left = x + 'px'; card.style.top = y + 'px'; }
  function centre() { var card = T.root.querySelector('.fst-card'); blocks(innerWidth / 2, innerHeight / 2, 0, 0); T.at = null; card.style.left = Math.max(12, (innerWidth - card.offsetWidth) / 2) + 'px'; card.style.top = Math.max(12, (innerHeight - card.offsetHeight) / 2) + 'px'; }
  setInterval(function () { if (!T.on || T.paused || !T.at || !T.lv) return; var s = steps()[T.i]; if (!s) return; var el = target(s); if (!el) return; var b = el.getBoundingClientRect();
    if (Math.abs(b.left - T.at[0]) + Math.abs(b.top - T.at[1]) + Math.abs(b.width - T.at[2]) + Math.abs(b.height - T.at[3]) > 4) { holeAt(b); cardAt(b); } }, 400);
  function place() {
    var s = steps()[T.i]; if (!s) return; var el = target(s), r = T.root, hole = r.querySelector('.fst-hole'), card = r.querySelector('.fst-card');
    if (!el) { go(T.i + 1, 1); return; }
    try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {}
    var b = el.getBoundingClientRect(); holeAt(b);
    hole.classList.toggle('test', !!s.test); card.classList.toggle('test', !!s.test);
    T.shown = (T.shown || 0) + 1;
    var n = steps().length, last = T.i === n - 1;
    card.innerHTML = '<div class="fst-n">' + (T.lv.name ? 'Level ' + T.lv.n + ': ' + T.lv.name + ' · ' : '') + (T.i + 1) + ' of ' + n + '</div><h4>' + s.t + (s.test ? '<span class="fst-tag">Test mode</span>' : '') + '</h4><p>' + s.x + '</p>' +
      '<div class="fst-b">' + (T.i ? '<button class="btn" data-fst="back">Back</button>' : '') + (s.help ? '<button class="btn" data-fst="more">More</button>' : '') + (T.lv.voice && window.FSTourSound ? '<button class="btn" data-fst="snd" aria-pressed="' + (FSTourSound.on() ? 'true' : 'false') + '">' + (FSTourSound.on() ? 'Voice off' : 'Voice on') + '</button>' : '') + '<button class="btn primary" data-fst="next">' + (last ? 'Finish' : 'Next') + '</button><button class="fst-end" data-fst="end">End tour</button></div>';
    cardAt(b);
    var nb = card.querySelector('[data-fst="next"]'); if (nb) try { nb.focus({ preventScroll: true }); } catch (e) {}
  }
  function chooser() {
    var L = levels(); build(); T.on = true; T.paused = false; T.root.hidden = false;
    if (L.length === 1) { startLevel(L[0].n); return; }
    var hole = T.root.querySelector('.fst-hole'), card = T.root.querySelector('.fst-card');
    hole.style.width = hole.style.height = '0px'; hole.style.left = innerWidth / 2 + 'px'; hole.style.top = innerHeight / 2 + 'px'; hole.classList.remove('test'); card.classList.remove('test');
    card.innerHTML = '<h4>Show me round</h4><p>Choose where to start. Each level takes a couple of minutes.</p><div class="fst-lv">' + L.map(function (l) { return '<button data-fst="lv' + l.n + '"><b>Level ' + l.n + ': ' + l.name + '</b><span>' + (l.note || '') + '</span></button>'; }).join('') + '</div><div class="fst-b"><button class="fst-end" data-fst="end">Not now</button></div>';
    centre();
  }
  function startLevel(n) { T.lv = levels().filter(function (l) { return l.n === n; })[0] || levels()[0]; T.i = 0; T.on = true; T.paused = false; T.shown = 0; T.retried = false; T.waits = 0; build().hidden = false; prep();   /* Route+: leave Clear screen first, or every button is hidden (Stuart 14 Nov 18:11) */ try { if (T.lv.before) T.lv.before(); } catch (e) {} T.i = -1; go(0, 1); }
  function end() { T.on = false; T.paused = false; if (T.root) T.root.hidden = true; try { if (T.lv && T.lv.after) T.lv.after(); } catch (e) {} }
  function finish() {
    var L = levels(), nx = L.filter(function (l) { return T.lv && l.n === T.lv.n + 1; })[0];
    var hole = T.root.querySelector('.fst-hole'), card = T.root.querySelector('.fst-card');
    hole.style.width = hole.style.height = '0px'; hole.classList.remove('test'); card.classList.remove('test');
    /* F7 (Stuart 15 Nov: "Nothing to point at" on first opening Route): on a first opening the routes are still being worked out and the
       buttons are not all there yet. Wait for the first routes (up to a minute), saying so, then try three times before giving up. */
    if (!T.shown && window.__fsPlan && !window.__fsPlan() && (T.waits || 0) < 40) { T.waits = (T.waits || 0) + 1; card.innerHTML = '<h4>Getting ready</h4><p>Route is working out the first routes. The tour starts as soon as they are on the chart.</p>'; centre(); setTimeout(function () { if (T.on) { T.i = -1; go(0, 1); } }, 1500); return; }
    if (!T.shown && (T.retried || 0) < 3) { T.retried = (T.retried || 0) + 1; prep(); setTimeout(function () { T.i = -1; go(0, 1); }, 700 + 800 * T.retried); return; }   /* a slow phone may still be setting up its screen: bring the menus back and try once more */
    if (!T.shown) { card.innerHTML = '<h4>Nothing to point at</h4><p>The buttons this part of the tour shows are hidden on this screen just now. Close any open panels, or tap MENU to bring the menus back, then try again.</p><div class="fst-b"><button class="btn primary" data-fst="lv' + T.lv.n + '">Try again</button><button class="btn" data-fst="end">Done</button></div>'; centre(); return; }
    card.innerHTML = '<h4>That’s the tour</h4><p>' + (nx ? 'Level ' + nx.n + ', ' + nx.name.toLowerCase() + ', is next when you are ready.' : 'Try it safely first: everything is in Help, and you can take the tour again from the top of Help.') + '</p><div class="fst-b">' + (nx ? '<button class="btn primary" data-fst="lv' + nx.n + '">Level ' + nx.n + '</button>' : '') + '<button class="btn' + (nx ? '' : ' primary') + '" data-fst="end">Done</button></div>';
    centre();
  }
  /* More: Help opens at the matching topic; closing Help brings the tour back at the same step */
  function helpTopic(key) {
    var hits = [].slice.call(document.querySelectorAll('#help .htopic')).filter(function (d) { var h = d.querySelector('h3'); return d.dataset.k === key || (h && h.firstChild && String(h.firstChild.textContent).trim() === key); });
    if (window.FSHelpFind && FSHelpFind.open) { var el = FSHelpFind.open(key); if (el) return null; }   /* Help as pages: open the topic's page (Stuart 15 Nov 21:50) */
    return hits[0] || null;
  }
  function more() {
    var s = steps()[T.i]; if (!s || !s.help) return;
    T.paused = true; T.root.hidden = true;
    try { if (window.FSTourSound && T.lv.voice) FSTourSound.stop(); } catch (e) {}
    if (s.more) { try { s.more(); } catch (e) {} }
    else { var hb = $('helpBtn'); if (hb) hb.click(); setTimeout(function () { var d = helpTopic(s.help); if (d) { d.scrollIntoView({ block: 'start' }); d.classList.remove('fst-flash'); void d.offsetWidth; d.classList.add('fst-flash'); } }, 250); }
    var w = setInterval(function () { var open = s.moreOpen ? s.moreOpen() : $('help') && !$('help').hidden; if (!open) { clearInterval(w); if (T.on && T.paused) { T.paused = false; T.root.hidden = false; place(); } } }, 400);
  }
  window.FSTour = { start: chooser, level: startLevel, end: end, levels: levels };


  /* the how-to film (Stuart 14 Nov 19:11): a thumbnail on the landing page opens a larger player with Go to the tool and End;
     also a Watch button in Help. Route+ sets window.FSFilmCfg in navtour.js. */
  function filmCfg() { return window.FSFilmCfg || { tool: 'Route', srcs: ['https://video.wixstatic.com/video/d74d0c_b0d924a6b582446198770eb18f032e10/720p/mp4/file.mp4', '../films/route-how-to.mp4'], poster: '../films/route-how-to.jpg', len: '1 min 39 s' }; }   /* Wix streams on iPhones (it answers range requests); the copy on this site is the fallback */
  /* in the Route+ app the film plays in Android's own player inside the app, with End and Go to the tool: the page's player did
     nothing when tapped there (Stuart 15 Nov 22:27), and the phone's separate video player lost the way back (22:40) */
  function filmApp() { return !!(window.NativeLink && window.NativeLink.playFilm); }
  function filmOpen() {
    if (filmApp()) { var c0 = filmCfg(); try { window.NativeLink.playFilm((c0.srcs || [c0.src]).join('|'), 'How to use ' + c0.tool); return; } catch (e) {} }
    var c = filmCfg(), f = $('fsFilm');
    if (!f) { f = document.createElement('div'); f.id = 'fsFilm'; f.className = 'fsfilm'; f.setAttribute('role', 'dialog'); f.setAttribute('aria-label', 'How to use ' + c.tool); document.body.appendChild(f); }
    f.innerHTML = '<div class="fsfilm-in"><h3>How to use ' + c.tool + '</h3><video id="fsFilmV" controls playsinline preload="metadata" poster="' + c.poster + '">' + (c.srcs || [c.src]).map(function (u) { return '<source src="' + u + '" type="video/mp4">'; }).join('') + '</video><p>' + c.len + ', with sound. Needs an internet connection.</p><div class="fsfilm-b"><button class="btn" type="button" data-film="end">End</button><button class="btn primary" type="button" data-film="go">Go to ' + c.tool + '</button></div></div>';
    f.hidden = false; f.onclick = function (e) { e.stopPropagation(); var b = e.target.closest('[data-film]'); if (!b) { if (e.target === f) filmEnd(); return; } if (b.dataset.film === 'end') filmEnd(); else filmGo(); };
    var v = $('fsFilmV'); try { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {}
  }
  function filmEnd() { var f = $('fsFilm'), v = $('fsFilmV'); if (v) try { v.pause(); } catch (e) {} if (f) f.hidden = true; }
  function filmGo() { filmEnd(); var sp = $('splash'); if (sp && !sp.hidden && !sp.classList.contains('terms')) { var n = $('spTourNo'); if (n) n.click(); } var h = $('help'); if (h && !h.hidden) h.hidden = true; }
  window.FSFilm = { open: filmOpen, end: filmEnd, go: filmGo };
  /* first-time guide (Stuart 14 Nov 13:52): the practice modes highlighted on the landing page. Try it safely closes the landing page
     and starts the practice: Route plays the race on the chart; Route+ starts its practice boat (FSTryPractice, set by Route+). */
  function tryWire() { var b = $('spTry'); if (!b || b.__on) return; b.__on = 1; b.addEventListener('click', function (e) { e.stopPropagation(); var n = $('spTourNo'); if (n) n.click(); setTimeout(function () { try { if (window.FSTryPractice) window.FSTryPractice(); else { var pl = $('play'); if (pl && pl.getAttribute('aria-label') !== 'Pause') pl.click(); } } catch (x) {} }, 900); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(tryWire, 0); }); else setTimeout(tryWire, 0);
  function filmWire() { var b = $('spFilm'); if (!b) return; var c = filmCfg();
 b.addEventListener('click', function (e) { e.stopPropagation(); filmOpen(); }); if (filmApp()) b.addEventListener('touchend', function (e) { e.preventDefault(); e.stopPropagation(); filmOpen(); });   /* in the app a tap opens the film straight away, whatever happens to the click */ var im = b.querySelector('img'); if (im) im.src = c.poster; var t = b.querySelector('b'); if (t) t.textContent = 'Watch: how to use ' + c.tool; b.setAttribute('aria-label', 'Watch the two-minute film: how to use ' + c.tool); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(filmWire, 0); }); else setTimeout(filmWire, 0);
  /* Help: "Try it safely first" highlighted at the very top, with the tour button */
  function tryBox() {
    var h = $('help'), list = $('helpList'); if (!h || !list || $('fsTry')) return !!$('fsTry');
    var d = document.createElement('section'); d.id = 'fsTry'; d.className = 'fst-try';
    d.innerHTML = '<h3>Try it safely first</h3>' + tryText() + '<div class="xrow" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" type="button" id="fsTryTour">Show me round</button><button class="btn" type="button" id="fsTryFilm">Watch the 2-minute film</button></div>';
    var anchor = $('navHelp') || list; anchor.parentNode.insertBefore(d, anchor);
    $('fsTryTour').onclick = function () { $('help').hidden = true; chooser(); };
    $('fsTryFilm').onclick = function () { filmOpen(); };
    return true;
  }
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#helpBtn,[data-help]')) setTimeout(function () { tryBox(); var d = $('fsTry'); if (d && $('navHelp') && d.nextElementSibling !== $('navHelp')) $('navHelp').parentNode.insertBefore(d, $('navHelp')); }, 80); }, true);

  /* the landing page: Show me round? Yes or No, every time (the splash waits for the answer) */
  var want = false;
  function answer(yes) { want = yes; try { sessionStorage.setItem('fs-tour', yes ? '1' : ''); } catch (e) {} }
  function wire() {
    var y = $('spTourYes'), n = $('spTourNo'), ty = $('spAgreeTour');
    if (y) y.addEventListener('click', function () { answer(true); }, true);
    if (n) n.addEventListener('click', function () { answer(false); }, true);
    if (ty) ty.addEventListener('click', function () { answer(true); var a = $('spAgree'); if (a) a.click(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
  /* start once the splash, the set-up and any race list are out of the way */
  var tries = 0, wt = setInterval(function () {
    if (++tries > 600) { clearInterval(wt); return; }
    if (!want) return;
    /* F7 (Stuart 15 Nov: "Nothing to point at" on first opening Route): also wait for the first routes (up to 60 s), whose panels move the
       buttons about while they arrive; and try three times before saying there is nothing to point at */
    var sp = $('splash'), busy = (sp && !sp.hidden) || ['wiz', 'races', 'errBox'].some(function (id) { var e = $(id); return e && !e.hidden; });
    if (busy) return;
    clearInterval(wt); want = false; setTimeout(chooser, 400);
  }, 500);
})();
