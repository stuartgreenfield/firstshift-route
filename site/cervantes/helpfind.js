/* FirstShift Route and Route+: Help as pages, one thing on the screen at a time (Stuart 15 Nov 2026, 21:50: "Cards, list, topic page";
   "Emma, as the films"; "Play and Stop"; "Sections and every topic"). Research: docs/HELP-REDESIGN-RESEARCH-2026-11-15.md.
   Help home: a search box (part of the page, never over the text) and a card for each main section with its screenshot.
   A section: its screenshot and its topics, each with a one-line summary. A topic: its screenshot, the text, Play (Stop while it
   speaks) in Emma's voice, the films' voice, recorded with the app; Previous and Next. Search lists the topics that match every word,
   with the matching line. The topics themselves are still written once, in Help as before; this file only shows them as pages. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  var MEDIA = window.FS_HELPMEDIA || '../helpmedia/';
  /* the main sections, by topic title; a title not listed goes by its words, else to "More" */
  var SECTIONS = [
    { id: 'start', name: 'Getting started', blurb: 'What it does, your boat, a first race', titles: ['What Route does', 'Try it safely first', 'Setting up a race', 'Your boat', 'Your sails and reefs', 'My set-up', 'Find a setting', 'Plan', 'Play the race'], re: /try it|getting|setting up|first|my set-up|find a setting/i },
    { id: 'boat', name: 'The boat and instruments', blurb: 'Connecting, the strip, data and alarms', titles: ['Connect to the boat', 'The instrument strip', 'Settings: Instruments', 'Data sources and GPS', 'Alarms', 'Depth smoothing', 'Wind check and wind by hand', 'Internet and Starlink'], re: /instrument|gateway|nmea|data source|alarm|connect/i },
    { id: 'race', name: 'Racing', blurb: 'Live GPS, rerouting, the plotter, MOB', titles: ['Live GPS while racing', 'Routing while racing', 'Route from where you are', 'Route from any point', 'Route to any point', 'Basic plotter', 'The plotter', 'Steer to stay on the route', 'Helm view', 'The boat is here', 'Follow the boat', 'Fleet', 'AIS', 'Man overboard', 'Send to the crew', 'Family and friends', 'Tide gate', 'Tactician', 'Solent races on the chart', 'Start line and bow offset'], re: /racing|live gps|plotter|mob|overboard|fleet|follow|helm|crew/i },
    { id: 'wx', name: 'Forecasts and routing', blurb: 'Routes, isochrones, models, wind by hand', titles: ['Routes', 'Isochrones', 'New forecasts', 'How old is each forecast', 'Forecast models: ages and blending', 'Forecast models and resolution', 'If you think the forecast is wrong', 'Tide by hand', 'Wind by hand', 'Ask Route'], re: /forecast|model|routing|route|wind|tide|isochron/i },
    { id: 'chart', name: 'Chart and screen', blurb: 'Charts, marks, waypoints, moving things', titles: ['Charts', 'Real charts', 'Chart orientation', 'Waypoints on the course', 'Clear screen', 'Move the GPS window', 'Move the panels', 'My tracks', 'Astro'], re: /chart|mark|depth|waypoint|screen|move/i },
    { id: 'polar', name: 'Polars and the log', blurb: 'Learning polars, sails, the race log', titles: ['Polars', 'Log and debrief'], re: /polar|log\b|debrief/i },
    { id: 'more', name: 'More', blurb: 'Everything else', titles: [], re: /$^/ }
  ];
  /* help logic trees (first-time guide, Stuart 14 Nov): "What do you want to do?", each a path of topics in order */
  var PATHS = [
    { id: 'p1', name: 'Plan a race', steps: ['What Route does', 'Try it safely first', 'Setting up a race', 'Your boat', 'Your sails and reefs', 'New forecasts', 'Routes', 'Play the race', 'Plan', 'Send to the crew'] },
    { id: 'p2', name: 'Race with this phone', steps: ['Live GPS while racing', 'Basic plotter', 'Routing while racing', 'Route from where you are', 'Clear screen', 'Man overboard'] },
    { id: 'p3', name: 'Connect to the boat', steps: ['Connect to the boat', 'Data sources and GPS', 'The instrument strip', 'Settings: Instruments', 'Helm view', 'The plotter', 'Alarms'] },
    { id: 'p4', name: 'Sail faster', steps: ['Polars', 'Your sails and reefs', 'Steer to stay on the route', 'Log and debrief'] },
    { id: 'p5', name: 'The forecast looks wrong', steps: ['If you think the forecast is wrong', 'Wind by hand', 'Wind check and wind by hand', 'Forecast models: ages and blending', 'How old is each forecast'] }
  ];
  var V = { view: 'home', sec: null, i: -1, q: '', list: [] }, playing = null, built = false;
  function title(d) { var h = d.querySelector('h3'); return h && h.firstChild ? String(h.firstChild.textContent).trim() : ''; }
  function slug(t) { return String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function esc(s) { return String(s).replace(/[<>&"]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]; }); }
  function textOf(d) { var c = d.cloneNode(true); [].forEach.call(c.querySelectorAll('h3,button,img,script,style'), function (x) { x.remove(); }); return c.textContent.replace(/\s+/g, ' ').trim(); }
  function first(s) { var m = s.match(/^.{20,140}?[.!?](\s|$)/); return m ? m[0].trim() : s.slice(0, 120) + (s.length > 120 ? '…' : ''); }
  /* every topic once (two topics had the same title), in the order Help gives them */
  function topics() {
    var seen = {}, out = [];
    [].forEach.call(document.querySelectorAll('#help .htopic'), function (d) { var t = title(d); if (!t || seen[t]) return; seen[t] = 1; out.push({ el: d, t: t, s: slug(t), text: textOf(d) }); });
    var tr = $('fsTry'); if (tr && !seen['Try it safely first']) { var h = tr.querySelector('h3,h2'); out.unshift({ el: tr, t: 'Try it safely first', s: 'try-it-safely-first', text: textOf(tr), alt: h }); }
    return out;
  }
  function secOf(tp) { for (var i = 0; i < SECTIONS.length; i++) if (SECTIONS[i].titles.indexOf(tp.t) >= 0) return SECTIONS[i]; for (i = 0; i < SECTIONS.length; i++) if (SECTIONS[i].re.test(tp.t)) return SECTIONS[i]; return SECTIONS[SECTIONS.length - 1]; }
  function grouped() { var all = topics(); SECTIONS.forEach(function (s) { s.items = []; }); all.forEach(function (tp) { var s = secOf(tp); tp.sec = s; s.items.push(tp); }); SECTIONS.forEach(function (s) { s.items.sort(function (a, b) { var i = s.titles.indexOf(a.t), j = s.titles.indexOf(b.t); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j); }); }); return all; }
  /* pictures: the topic's own screen picture if it has one, else the screenshot made for it; a section uses its own */
  function picOf(tp) { var im = tp.el.querySelector('img.hpic,img[data-pic]'); if (im && im.getAttribute('src')) return im.getAttribute('src'); return MEDIA + 'shots/' + tp.s + '.webp'; }
  function secPic(s) { return MEDIA + 'shots/sec-' + s.id + '.webp'; }
  function img(src, alt, cls) { return '<img class="' + cls + '" loading="lazy" alt="' + esc(alt) + '" src="' + esc(src) + '" onerror="this.hidden=true">'; }
  function css() {
    if ($('hfCss')) return; var s = document.createElement('style'); s.id = 'hfCss';
    s.textContent = '#help.hfon .sbody>:not(#hfView){display:none!important}#hfView{display:flex;flex-direction:column;gap:12px;padding-bottom:16px}' +
      '.hfsearch{display:flex;gap:8px}.hfsearch input{flex:1;min-width:0;min-height:44px;font-size:16px;padding:0 12px;border-radius:10px;border:1px solid var(--line,#ccc);background:var(--bg,#fff);color:var(--ink,#000)}' +
      '.hfcards{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}.hfcard{display:flex;flex-direction:column;text-align:left;padding:0;border:1px solid var(--line,#ccc);border-radius:12px;overflow:hidden;background:var(--panel,#fff);color:var(--ink,#000);cursor:pointer;font:inherit}' +
      '.hfcard .hfth{width:100%;aspect-ratio:16/10;object-fit:cover;object-position:top;display:block;background:var(--line,#ccc)}.hfcard b{display:block;padding:8px 10px 0;font-size:15px}.hfcard span{display:block;padding:2px 10px 10px;font-size:12px;color:var(--muted,#667)}' +
      '.hfnav{display:flex;align-items:center;gap:8px}.hfnav .btn{min-height:40px}.hfcrumb{font-size:12px;color:var(--muted,#667);letter-spacing:.04em;text-transform:uppercase}' +
      '.hfhero{width:100%;max-height:42vh;object-fit:contain;border-radius:10px;border:1px solid var(--line,#ccc);background:var(--bg,#000)}' +
      '.hflist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}.hflist button{width:100%;text-align:left;display:flex;gap:10px;align-items:center;padding:8px;border:1px solid var(--line,#ccc);border-radius:10px;background:var(--panel,#fff);color:var(--ink,#000);font:inherit;cursor:pointer;min-height:56px}' +
      '.hflist .hfmini{width:72px;height:48px;object-fit:cover;object-position:top;border-radius:6px;flex:none;background:var(--line,#ccc)}.hflist b{display:block;font-size:14px}.hflist span{display:block;font-size:12px;color:var(--muted,#667);margin-top:2px}' +
      '.hftopic h2{margin:0;font-size:20px}.hftext{font-size:15px;line-height:1.55}.hftext p{margin:0 0 10px}.hftext img{display:none}.hfplay{min-height:44px;min-width:110px;font-weight:700}.hfplay[aria-pressed=true]{background:#dc2626!important;border-color:#dc2626!important;color:#fff!important}' +
      '.hfpn{display:flex;justify-content:space-between;gap:8px}.hfpn .btn{min-height:44px;max-width:48%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hfpaths{display:flex;flex-direction:column;gap:6px}.hfpaths>div{display:flex;flex-wrap:wrap;gap:6px}.hfpath{min-height:40px;padding:0 14px;border-radius:20px;border:1px solid var(--brand,#3b82f6);background:none;color:var(--ink,#000);font-weight:600;font-size:13px;cursor:pointer}.hfnote{font-size:12px;color:var(--muted,#667);margin:0}#help mark.hfq{background:#fde68a;color:#111;border-radius:2px}';
    document.head.appendChild(s);
  }
  /* ---- read aloud: Emma's recording when there is one for this exact text, else the phone's own female British voice ---- */
  var MAN = null, audio = null;
  function manifest(cb) { if (MAN) return cb(MAN); try { fetch(MEDIA + 'voice/voice.json').then(function (r) { return r.ok ? r.json() : {}; }).then(function (j) { MAN = j || {}; cb(MAN); }, function () { MAN = {}; cb(MAN); }); } catch (e) { MAN = {}; cb(MAN); } }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); }
  function stop() { if (audio) { try { audio.pause(); } catch (e) {} audio = null; } try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {} playing = null; var b = $('hfPlay'); if (b) { b.setAttribute('aria-pressed', 'false'); b.textContent = '▶ Play'; } }
  function femaleVoice() { var vs = []; try { vs = speechSynthesis.getVoices(); } catch (e) {} var gb = vs.filter(function (v) { return /en[-_]GB/i.test(v.lang); }); var f = gb.filter(function (v) { return /female|woman|emma|serena|kate|libby|sonia|hazel|susan|martha|fiona|stephanie|amy/i.test(v.name); }); return f[0] || gb[0] || null; }
  function play(tp) {
    if (playing === tp.s) return stop(); stop(); playing = tp.s; var b = $('hfPlay'); if (b) { b.setAttribute('aria-pressed', 'true'); b.textContent = '■ Stop'; }
    var words = tp.t + '. ' + tp.text;
    manifest(function (m) {
      if (playing !== tp.s) return;
      var e = m[tp.s + '-' + hash(words)];   /* a recording only for this exact text: a changed topic falls back to the phone's voice until it is recorded again */
      if (e) { audio = new Audio(MEDIA + 'voice/' + e.f); audio.onended = function () { if (playing === tp.s) stop(); }; audio.onerror = function () { if (playing === tp.s) { audio = null; speak(); } }; audio.play().catch(function () { if (playing === tp.s) { audio = null; speak(); } }); }
      else speak();
    });
    function speak() { if (!window.speechSynthesis) return stop(); var u = new SpeechSynthesisUtterance(words); u.lang = 'en-GB'; var v = femaleVoice(); if (v) u.voice = v; u.onend = function () { if (playing === tp.s) stop(); }; speechSynthesis.speak(u); }
  }
  /* ---- the views ---- */
  function render() {
    var vw = $('hfView'); if (!vw) return; stop(); var all = grouped(), h = '';
    if (V.view === 'home') {
      h = '<div class="hfsearch"><input type="search" id="hfQ" placeholder="Search Help, for example polar, tide, MOB" aria-label="Search Help" enterkeyhint="search" value="' + esc(V.q) + '"><button class="btn primary" type="button" id="hfGo">Search</button></div>' +
        paths() + '<div class="hfcards">' + SECTIONS.filter(function (s) { return s.items.length; }).map(function (s) { return '<button class="hfcard" type="button" data-sec="' + s.id + '">' + img(secPic(s), s.name, 'hfth') + '<b>' + esc(s.name) + '</b><span>' + esc(s.blurb) + ' · ' + s.items.length + ' topic' + (s.items.length === 1 ? '' : 's') + '</span></button>'; }).join('') + '</div>' +
        ($('tourListen') || document.querySelector('#help [data-tour]') ? '' : '');
    } else if (V.view === 'path') {
      var pa = PATHS.filter(function (x) { return x.id === V.path; })[0], items = pa ? pa.steps.map(function (t) { return all.filter(function (x) { return x.t === t; })[0]; }).filter(Boolean) : [];
      V.list = items.map(function (x) { return x.s; });
      h = '<div class="hfnav"><button class="btn" type="button" data-go="home">‹ Help</button><span class="hfcrumb">' + esc(pa ? pa.name : '') + '</span></div><p class="hfnote">Step by step, in this order.</p>' +
        '<ul class="hflist">' + items.map(function (tp, i) { return '<li><button type="button" data-t="' + tp.s + '">' + img(picOf(tp), '', 'hfmini') + '<div><b>' + (i + 1) + '. ' + esc(tp.t) + '</b><span>' + esc(first(tp.text)) + '</span></div></button></li>'; }).join('') + '</ul>';
    } else if (V.view === 'sec') {
      var s = SECTIONS.filter(function (x) { return x.id === V.sec; })[0];
      h = '<div class="hfnav"><button class="btn" type="button" data-go="home">‹ Help</button><span class="hfcrumb">' + esc(s.name) + '</span></div>' + img(secPic(s), s.name, 'hfhero') +
        '<ul class="hflist">' + s.items.map(function (tp) { return '<li><button type="button" data-t="' + tp.s + '">' + img(picOf(tp), '', 'hfmini') + '<div><b>' + esc(tp.t) + '</b><span>' + esc(first(tp.text)) + '</span></div></button></li>'; }).join('') + '</ul>';
    } else if (V.view === 'find') {
      var words = V.q.toLowerCase().split(/\s+/).filter(function (x) { return x.length > 1; });
      var hits = all.filter(function (tp) { var t = (tp.t + ' ' + tp.text).toLowerCase(); return words.every(function (w) { return t.indexOf(w) >= 0; }); });
      V.list = hits.map(function (tp) { return tp.s; });
      var re = new RegExp('(' + words.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'gi');
      var line = function (tp) { var ss = tp.text.match(/[^.!?]+[.!?]*/g) || [tp.text], f = ss.filter(function (x) { re.lastIndex = 0; return re.test(x); })[0] || ss[0]; re.lastIndex = 0; return esc(f).replace(re, '<mark class="hfq">$1</mark>'); };
      h = '<div class="hfsearch"><input type="search" id="hfQ" aria-label="Search Help" enterkeyhint="search" value="' + esc(V.q) + '"><button class="btn primary" type="button" id="hfGo">Search</button></div>' +
        '<div class="hfnav"><button class="btn" type="button" data-go="home">‹ Help</button><p class="hfnote" id="hfNote">' + (hits.length ? hits.length + ' topic' + (hits.length === 1 ? '' : 's') + ' mention ' + esc(V.q.trim()) + '.' : 'No topic mentions ' + esc(V.q.trim()) + '. Try fewer or other words.') + '</p></div>' +
        '<ul class="hflist">' + hits.map(function (tp) { return '<li><button type="button" data-t="' + tp.s + '">' + img(picOf(tp), '', 'hfmini') + '<div><b>' + esc(tp.t).replace(re, '<mark class="hfq">$1</mark>') + '</b><span>' + line(tp) + '</span></div></button></li>'; }).join('') + '</ul>';
    } else {
      var tp = all.filter(function (x) { return x.s === V.t; })[0]; if (!tp) { V.view = 'home'; return render(); }
      var list = V.from === 'find' || V.from === 'path' ? V.list : tp.sec.items.map(function (x) { return x.s; }), k = list.indexOf(tp.s), pv = all.filter(function (x) { return x.s === list[k - 1]; })[0], nx = all.filter(function (x) { return x.s === list[k + 1]; })[0];
      var body = tp.el.cloneNode(true); [].forEach.call(body.querySelectorAll('h3,h2,button.say,[data-nsay],img.hpic,img[data-pic]'), function (x) { x.remove(); });
      h = '<div class="hfnav"><button class="btn" type="button" data-go="' + (V.from === 'find' ? 'find' : V.from === 'path' ? 'path' : 'sec') + '">‹ ' + (V.from === 'find' ? 'Results' : V.from === 'path' ? esc((PATHS.filter(function (x) { return x.id === V.path; })[0] || {}).name || 'Back') : esc(tp.sec.name)) + '</button></div>' +
        '<article class="hftopic"><h2>' + esc(tp.t) + '</h2></article>' + img(picOf(tp), 'Screen picture: ' + tp.t, 'hfhero') +
        '<div><button class="btn hfplay" type="button" id="hfPlay" aria-pressed="false">▶ Play</button></div><div class="hftext" id="hfText"></div>' +
        '<div class="hfpn">' + (pv ? '<button class="btn" type="button" data-t="' + pv.s + '">‹ ' + esc(pv.t) + '</button>' : '<span></span>') + (nx ? '<button class="btn" type="button" data-t="' + nx.s + '">' + esc(nx.t) + ' ›</button>' : '') + '</div>';
      vw.innerHTML = h; $('hfText').appendChild(body); $('hfPlay').onclick = function () { play(tp); }; vw.parentNode.scrollTop = 0; vw.scrollIntoView({ block: 'start' }); return;
    }
    vw.innerHTML = h; var sb = vw.parentNode; if (sb) sb.scrollTop = 0;
    var q = $('hfQ'); if (q) { q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); find(q.value); } }); q.addEventListener('input', function () { clearTimeout(q.__t); var v = q.value; q.__t = setTimeout(function () { find(v, true); }, 350); }); if (V.view === 'find') { q.focus(); try { q.setSelectionRange(q.value.length, q.value.length); } catch (e) {} } }
    var g = $('hfGo'); if (g) g.onclick = function () { find($('hfQ').value); };
  }
  function paths() { var all = topics().map(function (x) { return x.t; }); var ok = PATHS.filter(function (pa) { return pa.steps.filter(function (t) { return all.indexOf(t) >= 0; }).length >= 3; }); if (!ok.length) return ''; return '<div class="hfpaths"><b>What do you want to do?</b><div>' + ok.map(function (pa) { return '<button class="hfpath" type="button" data-path="' + pa.id + '">' + esc(pa.name) + '</button>'; }).join('') + '</div></div>'; }
  function find(q, typing) { V.q = q || ''; if (!V.q.trim() || V.q.trim().length < 2) { if (V.view !== 'home') { V.view = 'home'; render(); } return; } V.view = 'find'; render(); if (!typing) { var x = $('hfQ'); if (x) x.blur(); } }
  function go(view, extra) { for (var k in extra) V[k] = extra[k]; V.view = view; render(); }
  function build() {
    var help = $('help'), body = help && help.querySelector('.sbody'); if (!body || !document.querySelector('#help .htopic')) return;
    css(); help.classList.add('hfon');
    var vw = $('hfView'); if (!vw) { vw = document.createElement('div'); vw.id = 'hfView'; body.insertBefore(vw, body.firstChild);
      vw.addEventListener('click', function (e) {
        var c = e.target.closest('[data-sec],[data-t],[data-go],[data-path]'); if (!c) return;
        if (c.dataset.path) { go('path', { path: c.dataset.path }); return; }
        if (c.dataset.sec) go('sec', { sec: c.dataset.sec });
        else if (c.dataset.t) go('topic', { t: c.dataset.t, from: V.view === 'find' ? 'find' : V.view === 'path' ? 'path' : V.view === 'topic' ? V.from : 'sec' });
        else if (c.dataset.go === 'sec') { var tp = grouped().filter(function (x) { return x.s === V.t; })[0]; go('sec', { sec: tp ? tp.sec.id : V.sec }); }
        else go(c.dataset.go, {});
      });
    }
    if (!built) { built = true; V.view = 'home'; V.q = ''; }
    render();
  }
  /* open a topic by its title or key (the tour's More, Help links) */
  function open(key) {
    build(); var all = grouped(), tp = all.filter(function (x) { return x.t === key || x.s === key || x.el.dataset.k === key; })[0];
    if (!tp) return null; go('topic', { t: tp.s, from: 'sec', sec: tp.sec.id }); return tp.el;
  }
  /* Help is filled when it is first opened (and Route+ adds its own topics): build each time it opens, back to Help home */
  function watch() { var h = $('help'); if (!h) return setTimeout(watch, 500); new MutationObserver(function () { if (!h.hidden) setTimeout(function () { if (!V.keep) { built = false; } V.keep = false; build(); }, 60); else stop(); }).observe(h, { attributes: true, attributeFilter: ['hidden'] }); if (!h.hidden) build(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
  window.FSHelpFind = { build: build, open: function (k) { V.keep = true; return open(k); }, search: function (q) { build(); find(q); return V.list.length; }, home: function () { go('home', {}); }, view: function () { return { view: V.view, sec: V.sec, t: V.t, q: V.q, n: V.list.length, playing: playing }; }, topics: function () { return grouped().map(function (x) { return { t: x.t, s: x.s, sec: x.sec.id, text: x.text }; }); }, sections: function () { grouped(); return SECTIONS.map(function (s) { return { id: s.id, name: s.name, n: s.items.length }; }); }, stop: stop, hash: hash };
})();
