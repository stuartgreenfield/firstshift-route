/* FirstShift Route and Route+: the demonstration sail (Stuart 17 Nov 2026 08:39, F14: "an emulator that sails the boat along the route
   showing user how it works", Route products only). A practice boat sails the chosen route about two minutes from start to finish,
   using the real screens: the GPS window, the plotter bar, the marks ticking off. A caption under the top bar says what each part
   shows as the boat reaches it; for a while the boat strays off the route so the cross-track error and the way back show. Nothing
   is sent anywhere, the GPS is not used, and Stop puts everything back. Started from Try it safely (landing page and Help). */
(function () {
  'use strict';
  if (window.FS_MARK) return;   /* Mark and Mark+ have their own test mode */
  var R = Math.PI / 180, D = { on: false, t0: 0, dur: 120000, i: -1, timer: null, plotWas: false };
  function $(id) { return document.getElementById(id); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function PL() { return window.__fsPlot || window.__navPlot || null; }
  function plus() { return !!window.NAV_VERSION; }
  function name() { return plus() ? 'Route+' : 'Route'; }
  /* what each part shows, said as the boat reaches it (fraction of the way along the route) */
  function STEPS() { return [
    [0.00, 'Demo: a practice boat sails your chosen route, about two minutes start to finish. Nothing is sent anywhere and the GPS is not used.'],
    [0.06, 'The GPS window: speed and course over the ground, and how the boat is doing against the plan. With a real boat this comes from the phone\'s GPS' + (plus() ? ' or the boat\'s instruments' : '') + '.'],
    [0.18, 'The plotter bar: bearing and distance to the next mark, ETA, VMC and cross-track error (XTE). MARK steers to the mark; ROUTE steers along the route.'],
    [0.32, 'Now the boat strays off the route. Watch XTE grow, and the dashed line show the way back to the plan.'],
    [0.50, 'Back on the route. Each mark ticks off as the boat rounds it, and the plotter moves on to the next.'],
    [0.68, 'Behind or ahead of the plan? The GPS window says so. If the wind is not as forecast, From here routes again from the boat.'],
    [0.86, 'Nearly there. At the finish, End race files the track with the result, and the track can be saved as GPX or a log.'],
    [0.99, 'That is ' + name() + '. Stop the demo, then choose your own race and boat, or open Help for more.']
  ]; }
  function css() {
    if ($('fsDemoCss')) return; var s = document.createElement('style'); s.id = 'fsDemoCss';
    s.textContent = '.fsdemo{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 70px);z-index:12;width:min(calc(100vw - 20px),460px);box-sizing:border-box;background:var(--panel,#0B1B30);color:var(--ink,#fff);border:2px solid #22c55e;border-radius:14px;padding:8px 10px;box-shadow:0 6px 18px rgba(0,0,0,.4);display:flex;flex-direction:column;gap:6px;font-size:14px}.fsdemo[hidden]{display:none}.fsdemo .dmhd{display:flex;align-items:center;gap:8px}.fsdemo .dmhd b{flex:1;font-size:12px;letter-spacing:.06em;color:#22c55e}.fsdemo .dmbar{height:4px;border-radius:6px;background:var(--line,#334);overflow:hidden}.fsdemo .dmbar i{display:block;height:100%;background:#22c55e;width:0}.fsdemo p{margin:0;line-height:1.35}.fsdemo .btn{min-height:34px;padding:0 10px}';
    document.head.appendChild(s);
  }
  function box() { var b = $('fsDemo'); if (b) return b; css(); b = document.createElement('div'); b.id = 'fsDemo'; b.className = 'fsdemo'; b.setAttribute('role', 'status'); document.body.appendChild(b);
    b.addEventListener('click', function (e) { var t = e.target.closest('[data-d]'); if (!t) return; if (t.dataset.d === 'stop') stop(); else if (t.dataset.d === 'again') { stop(true); start(); } }); return b; }
  function say(i, frac) { var st = STEPS(), b = box(); b.hidden = false; b.innerHTML = '<div class="dmhd"><b>DEMO · ' + esc(name()) + '</b><button class="btn" data-d="again">Again</button><button class="btn primary" data-d="stop">Stop</button></div><div class="dmbar"><i style="width:' + Math.round(frac * 100) + '%"></i></div><p>' + esc(st[i][1]) + '</p>'; }
  /* along the path by distance: position, course and the planned speed there */
  function prep(pl) { var p = pl.path, cum = [0]; for (var i = 1; i < p.length; i++) { var k = Math.cos(p[i][0] * R); cum.push(cum[i - 1] + Math.hypot((p[i][1] - p[i - 1][1]) * k * 60, (p[i][0] - p[i - 1][0]) * 60)); } return { p: p, cum: cum, tot: cum[cum.length - 1], ts: pl.ts || null }; }
  function at(P, f) { var d = f * P.tot, i = 1; while (i < P.cum.length - 1 && P.cum[i] < d) i++; var a = P.p[i - 1], b = P.p[i], seg = (P.cum[i] - P.cum[i - 1]) || 1e-9, u = Math.max(0, Math.min(1, (d - P.cum[i - 1]) / seg)), k = Math.cos(a[0] * R);
    var cog = (Math.atan2((b[1] - a[1]) * k, b[0] - a[0]) / R + 360) % 360, kn = 7; if (P.ts && P.ts[i] != null && P.ts[i - 1] != null && P.ts[i] > P.ts[i - 1]) { var dt = P.ts[i] - P.ts[i - 1], h = dt > 50 ? dt / 3600 : dt; kn = Math.max(1, Math.min(25, seg / h)); }   /* the route's times are hours from the forecast start */
    return { la: a[0] + (b[0] - a[0]) * u, lo: a[1] + (b[1] - a[1]) * u, cog: cog, kn: kn }; }
  function tick() {
    if (!D.on) return; var f = Math.min(1, (Date.now() - D.t0) / D.dur), q = at(D.P, f);
    /* 0.32 to 0.48: off the route to starboard by up to 0.3 nm, then back */
    if (f > 0.32 && f < 0.48) { var s = Math.sin((f - 0.32) / 0.16 * Math.PI) * 0.3, b = (q.cog + 90) * R; q.la += s * Math.cos(b) / 60; q.lo += s * Math.sin(b) / (60 * Math.cos(q.la * R)); }
    try { window.__fsSimFix(q.la, q.lo, q.kn, q.cog); } catch (e) {}
    var st = STEPS(), i = 0; for (var j = 0; j < st.length; j++) if (f >= st[j][0]) i = j; if (i !== D.i) D.i = i; say(D.i, f);
    if (f >= 1) { FSBeat.clear(D.timer); D.timer = null; }
  }
  function start() {
    if (D.on || !window.__fsSim || !window.__fsPlan) return false; var pl = window.__fsPlan();
    if (!pl || !pl.path || pl.path.length < 2) { var b0 = box(); b0.hidden = false; b0.innerHTML = '<div class="dmhd"><b>DEMO</b><button class="btn primary" data-d="stop">Close</button></div><p>The demo sails the chosen route: wait for the routes to finish (the bar at the foot of the chart), then tap Try it safely again.</p>'; return false; }
    D.P = prep(pl); D.on = true; D.t0 = Date.now(); D.i = -1;
    try { D.plotWas = !!(PL() && PL().C.on); window.__fsSim(true); var s0 = at(D.P, 0); window.__fsSimFix(s0.la, s0.lo, s0.kn, s0.cog); } catch (e) {}
    try { var pp = PL(); if (pp) { D.modeWas = pp.C.mode; pp.C.mode = 'route'; if (!pp.C.on) pp.toggle(true); } } catch (e) {}
    D.timer = FSBeat.set(tick, 500, true); tick(); return true;
  }
  function stop(quiet) { if (!D.on && !$('fsDemo')) return; D.on = false; FSBeat.clear(D.timer); D.timer = null; try { window.__fsSim(false); } catch (e) {} try { var pq = PL(); if (pq) { pq.C.mode = D.modeWas; if (pq.C.on && !D.plotWas) pq.toggle(false); } } catch (e) {} var b = $('fsDemo'); if (b) b.hidden = true; if (!quiet && window.NavToast) window.NavToast('Demo stopped. Everything is as it was.'); }
  window.FSDemo = { start: start, stop: stop, on: function () { return D.on; } };
  /* Try it safely (landing page and Help) starts the demo in Route; Route+ keeps its practice boat there and has the demo in Help */
  if (!plus()) window.FSTryPractice = function () { var n = 0, w = FSBeat.set(function () { n++; if (start() || n > 120) FSBeat.clear(w); }, 1000); };
})();
