/* FirstShift Route and Route+: the tide gate, "beat the tide to the mark" (Stuart 15 Nov 11:26 to 11:39; research and his answers
   in docs/TIDE-GATE-RESEARCH-2026-11-15.md). Built overnight 15 to 16 Nov, first version.
   For the next mark and the leg after it:
   - the tide along the leg (knots, and as a share of boat speed: the tide factor), from the chosen tide model along the boat's own
     progress, minute by minute;
   - the turn: the next time the tide along the leg changes sign at the mark (slack under 0.3 kn);
   - will we make it: ETA at the present speed made good, against the turn; minutes in hand or short;
   - if not: the speed needed to make it, and what a late arrival costs (the leg 30 minutes later);
   - rivals: boats you add by name and TCC, and AIS boats you give a TCC, side by side (their AIS speed, and our polar speed scaled
     by their TCC): when each reaches the mark, whether they make the gate, and the gain or loss on us, elapsed and corrected;
   - an alarm 15 minutes before the gate closes while we would miss it (on or off);
   - a strip on the deck screen, a bar along the leg and a clock ring.
   Speed made good: Route+'s VMC from the instruments, else the GPS speed towards the mark, else 5 kn, which the crew can override. */
(function () {
  'use strict';
  var KEY = 'fs-tidegate', R = Math.PI / 180, SLACK = 0.3;
  var C = (function () { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } })(); C.rivals = C.rivals || []; C.ais = C.ais || {}; if (C.alarm == null) C.alarm = true;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(C)); } catch (e) {} }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[<>&"]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]; }); }
  function dist(a, b) { var dy = (b.lat - a.lat) * 60, dx = (b.lon - a.lon) * 60 * Math.cos((a.lat + b.lat) / 2 * R); return Math.hypot(dx, dy); }
  function brg(a, b) { var dy = (b.lat - a.lat) * 60, dx = (b.lon - a.lon) * 60 * Math.cos((a.lat + b.lat) / 2 * R); return (Math.atan2(dx, dy) / R + 360) % 360; }
  function along(td, b) { return td ? td[0] * Math.sin(b * R) + td[1] * Math.cos(b * R) : 0; }   /* [east, north] knots onto the leg */
  function hm(t) { var d = new Date(t); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function mins(m) { m = Math.round(m); var a = Math.abs(m); return (a >= 60 ? Math.floor(a / 60) + ' h ' + ('0' + a % 60).slice(-2) : a) + ' min'; }
  function tideAt(la, lo, t) { return window.__fsTideAt ? window.__fsTideAt(la, lo, t / 1000) : null; }
  /* sail a leg from A towards B at speed s (kn through the water along the leg) starting at t0 (ms): minute steps, the tide along the leg added */
  function sail(A, B, s, t0) {
    var D = dist(A, B), b = brg(A, B), done = 0, t = t0, sumA = 0, n = 0, cap = t0 + 24 * 3600000, gotTide = false;
    while (done < D && t < cap) { var f = done / D, la = A.lat + (B.lat - A.lat) * f, lo = A.lon + (B.lon - A.lon) * f, td = tideAt(la, lo, t); if (td) gotTide = true; var a = along(td, b); sumA += a; n++; done += Math.max(0.5, s + a) / 60; t += 60000; }
    return { eta: t, mins: (t - t0) / 60000, factor: n ? sumA / n : 0, pct: n && s > 0 ? 100 * (sumA / n) / s : 0, nm: D, brg: b, tide: gotTide };
  }
  /* the next time the tide along the leg changes sign at the mark, within 12 h: [time, 'fair'|'foul' after it] */
  function turn(M, b, t0) {
    var a0 = along(tideAt(M.lat, M.lon, t0), b), sign = Math.abs(a0) < SLACK ? 0 : a0 > 0 ? 1 : -1;
    for (var t = t0 + 300000; t < t0 + 12 * 3600000; t += 300000) { var a = along(tideAt(M.lat, M.lon, t), b), s2 = Math.abs(a) < SLACK ? 0 : a > 0 ? 1 : -1; if (s2 !== sign && s2 !== 0) { if (sign === 0 && s2 === 1 && a0 >= 0) { sign = 1; continue; } return { t: t, to: s2 > 0 ? 'fair' : 'foul', now: sign > 0 ? 'fair' : sign < 0 ? 'foul' : 'slack', a0: a0 }; } if (s2 === 0 && sign !== 0) return { t: t, to: 'slack', now: sign > 0 ? 'fair' : 'foul', a0: a0 }; }
    return { t: null, now: sign > 0 ? 'fair' : sign < 0 ? 'foul' : 'slack', a0: a0 };
  }
  function need(A, B, T, t0) { var lo = 0.5, hi = 25; if (sail(A, B, hi, t0).eta > T) return null; for (var i = 0; i < 18; i++) { var m = (lo + hi) / 2; if (sail(A, B, m, t0).eta <= T) hi = m; else lo = m; } return hi; }
  function calcNow() { try { return (window.__navPlot && window.__navPlot.calc()) || (window.__fsPlot && window.__fsPlot.calc()) || null; } catch (e) { return null; } }
  function speed(o) { if (C.spd > 0) return { s: C.spd, src: 'set by hand' }; if (o && o.vmc > 0.5) return { s: o.vmc, src: 'VMC' }; if (o && o.sog > 0.5) return { s: o.sog, src: 'SOG' }; return { s: 5, src: 'assumed' }; }
  function pts(o) { var c = o.c, P = c ? c.marks.concat([c.finish]) : []; return { m1: P[o.i] || o.m, m2: P[o.i + 1] || null }; }
  /* everything for the panel */
  function work() {
    var o = calcNow(); if (!o || !o.ok || !o.f) return { why: (o && o.why) || 'Needs a position and a course: Live GPS (Route) or the boat link (Route+), and a race.' };
    var here = { lat: o.f.la != null ? o.f.la : o.f.lat, lon: o.f.lo != null ? o.f.lo : o.f.lon }, now = Date.now(), sp = speed(o), P = pts(o);
    if (!P.m1) return { why: 'No next mark.' };
    var L1 = sail(here, P.m1, sp.s, now); if (!L1.tide) return { why: 'No tide model here: choose one in Settings, Forecasts (Tide).' };
    var T1 = turn(P.m1, L1.brg, now), r = { here: here, sp: sp, m1: P.m1, m2: P.m2, L1: L1, T1: T1, now: now };
    if (T1.t) { r.margin = (T1.t - L1.eta) / 60000; if (T1.now === 'fair' && r.margin < 0) r.need = need(here, P.m1, T1.t, now); }
    var late = sail(here, P.m1, sp.s, now + 30 * 60000); r.late = late.mins - L1.mins;
    /* the course to steer to hold the line to the mark across the tide here and now (research step 7): the boat's water track
       plus the tide must lie along the leg, so sin(H - B) = -cross / s, the cross-tide positive to starboard of the line */
    var tdN = tideAt(here.lat, here.lon, now); if (tdN) { var bb = L1.brg * R, cross = tdN[0] * Math.cos(bb) - tdN[1] * Math.sin(bb); if (Math.abs(cross) < sp.s * 0.95) r.cts = { h: (L1.brg - Math.asin(cross / sp.s) / R + 360) % 360, cross: cross }; }
    if (P.m2) { r.L2 = sail(P.m1, P.m2, sp.s, L1.eta); r.T2 = turn(P.m2, r.L2.brg, L1.eta); }
    r.rivals = rivals(r, o);
    return r;
  }
  function rivals(r, o) {
    var tcc = window.__fsTcc ? window.__fsTcc() : 1, st = window.__fsStartAt ? window.__fsStartAt() : null, start = st ? st * 1000 : null, out = [];
    var corr = function (eta, t) { return start ? (eta - start) / 60000 * t : null; }, ours = { eta: r.L1.eta, c: corr(r.L1.eta, tcc) };
    var row = function (name, t, pos, sogVmc, src) {
      var sPol = r.sp.s * t / tcc, a = sail(pos, r.m1, sPol, r.now), b = sogVmc > 0.3 ? sail(pos, r.m1, sogVmc, r.now) : null;
      var use = b || a, made = r.T1.t ? (use.eta <= r.T1.t ? r.T1.now : r.T1.to) : r.T1.now;   /* the tide along the leg at the mark when they get there */
      out.push({ name: name, tcc: t, src: src, etaPol: a.eta, etaAis: b ? b.eta : null, made: made, el: (use.eta - ours.eta) / 60000, co: start && ours.c != null ? corr(use.eta, t) - ours.c : null });
    };
    C.rivals.forEach(function (q) { if (q.tcc > 0) row(q.name, q.tcc, r.here, 0, 'here, our polar × TCC'); });
    var ais = window.__fsAisList ? window.__fsAisList() : [];
    ais.forEach(function (x) { var t = C.ais[x.mmsi]; if (!(t > 0)) return; var bb = brg({ lat: x.lat, lon: x.lon }, r.m1), v = x.sog != null && x.cog != null ? x.sog * Math.cos((x.cog - bb) * R) : 0; row(x.name || ('MMSI ' + x.mmsi), t, { lat: x.lat, lon: x.lon }, v, 'AIS'); });
    [-0.05, -0.02, 0.02, 0.05].forEach(function (d) { row('Rated ' + (d > 0 ? '+' : '') + d.toFixed(2), +(tcc + d).toFixed(3), r.here, 0, 'band, here'); });
    return out;
  }
  /* ---- drawing ---- */
  function atEta(r) { return !r.T1.t || r.L1.eta <= r.T1.t ? r.T1.now : r.T1.to; }   /* the tide at the mark when we get there */
  function ring(r) {
    if (!r.T1 || !r.T1.t) return ''; var tot = Math.max(r.T1.t, r.L1.eta) - r.now, f1 = (r.L1.eta - r.now) / tot, f2 = (r.T1.t - r.now) / tot, arc = function (f, rad) { var a = f * 2 * Math.PI - Math.PI / 2; return (50 + rad * Math.cos(a)).toFixed(1) + ' ' + (50 + rad * Math.sin(a)).toFixed(1); };
    return '<svg viewBox="0 0 100 100" width="96" height="96" aria-hidden="true"><circle cx="50" cy="50" r="40" fill="none" stroke="var(--line)" stroke-width="8"/><path d="M50 10 A40 40 0 ' + (f2 > 0.5 ? 1 : 0) + ' 1 ' + arc(Math.min(f2, 0.999), 40) + '" fill="none" stroke="' + (atEta(r) === 'foul' ? '#dc2626' : '#16a34a') + '" stroke-width="8"/><circle cx="' + arc(f1, 40).split(' ')[0] + '" cy="' + arc(f1, 40).split(' ')[1] + '" r="6" fill="var(--ink)"/><text x="50" y="47" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor">' + (r.margin >= 0 ? '+' : '') + Math.round(r.margin) + '</text><text x="50" y="61" text-anchor="middle" font-size="9" fill="currentColor">min</text></svg>';
  }
  function bar(r) {
    if (!r.T1 || !r.T1.t) return ''; var D = r.L1.nm, at = Math.min(1, Math.max(0, (r.T1.t - r.now) / (r.L1.eta - r.now)));
    return '<svg viewBox="0 0 300 30" width="100%" height="30" aria-label="The leg: the boat, where she will be when the tide turns, and the mark"><line x1="10" x2="290" y1="15" y2="15" stroke="var(--line)" stroke-width="6" stroke-linecap="round"/><line x1="10" x2="' + (10 + 280 * at) + '" y1="15" y2="15" stroke="' + (r.T1.now === 'fair' ? '#16a34a' : '#dc2626') + '" stroke-width="6" stroke-linecap="round"/><circle cx="10" cy="15" r="6" fill="var(--ink)"/><line x1="' + (10 + 280 * at) + '" x2="' + (10 + 280 * at) + '" y1="3" y2="27" stroke="#f59e0b" stroke-width="3"/><path d="M286 5 L296 15 L286 25z" fill="var(--ink)"/></svg><small>' + (at < 1 ? 'The tide turns ' + (D * at).toFixed(1) + ' nm along, ' + (D * (1 - at)).toFixed(1) + ' nm short of the mark.' : 'The boat reaches the mark before the tide turns.') + '</small>';
  }
  function verdict(r) {
    if (!r.T1.t) return 'Tide along the leg ' + r.T1.now + ', no turn in the next 12 hours.';
    var foulNow = r.T1.now === 'foul';
    if (foulNow) return 'Foul now; it turns fair at ' + hm(r.T1.t) + ' (in ' + mins((r.T1.t - r.now) / 60000) + '). ETA ' + hm(r.L1.eta) + ': ' + (r.margin < 0 ? 'the tide will have turned before you arrive.' : 'still foul when you arrive.');
    return r.margin >= 0 ? 'Gate: the tide at the mark turns ' + r.T1.to + ' at ' + hm(r.T1.t) + '. ETA ' + hm(r.L1.eta) + ': ' + mins(r.margin) + ' in hand.' : 'Gate: the tide at the mark turns ' + r.T1.to + ' at ' + hm(r.T1.t) + '. ETA ' + hm(r.L1.eta) + ': ' + mins(-r.margin) + ' short.';
  }
  function render() {
    var p = $('tgPop'); if (!p || p.hidden) return; var r = work();
    if (r.why) { p.querySelector('.tgb').innerHTML = '<p>' + esc(r.why) + '</p>'; return; }
    var L1 = r.L1, h = '<div class="tgtop">' + ring(r) + '<div><b>' + esc(r.m1.name || 'Next mark') + '</b><span>' + L1.nm.toFixed(1) + ' nm, ' + ('00' + Math.round(L1.brg)).slice(-3) + '°T, ' + mins(L1.mins) + ' at ' + r.sp.s.toFixed(1) + ' kn (' + r.sp.src + ')</span><span>Tide along the leg: ' + (L1.factor >= 0 ? '+' : '') + L1.factor.toFixed(1) + ' kn, ' + (L1.pct >= 0 ? '+' : '') + Math.round(L1.pct) + '% of boat speed</span></div></div>' +
      '<p class="tgv ' + (r.margin >= 0 || r.T1.now === 'foul' ? 'ok' : 'bad') + '">' + verdict(r) + '</p>' + bar(r);
    if (r.cts && Math.abs(r.cts.cross) >= 0.1) h += '<p class="tgn"><b>Steer ' + ('00' + Math.round(r.cts.h)).slice(-3) + '°T</b> to hold the line to the mark: the tide here sets ' + Math.abs(r.cts.cross).toFixed(1) + ' kn to ' + (r.cts.cross > 0 ? 'starboard' : 'port') + ' of it. On a beat or a run, take the tack or gybe that keeps you in the fairer tide.</p>';
    if (r.need) h += '<p class="tgv bad">To make it: ' + r.need.toFixed(1) + ' kn speed made good, now ' + r.sp.s.toFixed(1) + ': ' + (r.need - r.sp.s).toFixed(1) + ' kn more.</p>';
    else if (r.margin < 0 && r.T1.now === 'fair') h += '<p class="tgv bad">Not reachable before the turn at any speed.</p>';
    h += '<p class="tgn">Arriving 30 minutes later would take ' + (r.late >= 0 ? mins(r.late) + ' longer' : mins(-r.late) + ' less') + ' on this leg.</p>';
    if (r.L2) h += '<h4>Next leg: ' + esc(r.m2.name || 'mark') + '</h4><p class="tgn">' + r.L2.nm.toFixed(1) + ' nm, ' + mins(r.L2.mins) + ', tide along ' + (r.L2.factor >= 0 ? '+' : '') + r.L2.factor.toFixed(1) + ' kn (' + Math.round(r.L2.pct) + '%). ' + (r.T2 && r.T2.t ? 'At that mark the tide turns ' + r.T2.to + ' at ' + hm(r.T2.t) + ', ETA ' + hm(r.L2.eta) + ' (' + mins(Math.abs(r.T2.t - r.L2.eta) / 60000) + (r.T2.t >= r.L2.eta ? ' in hand' : ' after the turn') + ').' : 'No turn there in the next 12 hours.') + '</p>';
    h += '<h4>Rivals at the mark</h4><div class="tgtw"><table class="tgt"><tr><th>Boat</th><th>TCC</th><th>ETA</th><th>Tide there</th><th>Elapsed</th><th>Corrected</th></tr>' + r.rivals.map(function (q) { return '<tr><td>' + esc(q.name) + '<small>' + esc(q.src) + '</small></td><td>' + q.tcc.toFixed(3) + '</td><td>' + hm(q.etaAis || q.etaPol) + (q.etaAis ? '<small>polar ' + hm(q.etaPol) + '</small>' : '') + '</td><td>' + esc(q.made || '--') + '</td><td>' + (q.el >= 0 ? '+' : '') + Math.round(q.el) + ' min</td><td>' + (q.co == null ? '--' : (q.co >= 0 ? '+' : '') + Math.round(q.co) + ' min') + '</td></tr>'; }).join('') + '</table></div><p class="tgn">+ means they reach the mark after us (we gain); corrected uses the start time and each TCC. Bands and typed boats are placed where we are now.</p>' +
      '<div class="tgadd"><input id="tgName" placeholder="Boat name" maxlength="30"><input id="tgTcc" type="number" step="0.001" min="0.8" max="1.8" placeholder="TCC"><button class="btn" id="tgAdd">Add</button></div><details class="tgn"><summary>Paste an entry list</summary><textarea id="tgList" rows="4" style="width:100%;margin-top:4px" placeholder="One boat a line with its TCC, for example: Jolly Jack 1.012 (copied from the published entry list)"></textarea><button class="btn" id="tgListGo">Add these boats</button><span id="tgListN"></span></details>' + (C.rivals.length ? '<p class="tgn">' + C.rivals.map(function (q, i) { return esc(q.name) + ' ' + q.tcc.toFixed(3) + ' <button class="linkbtn" data-rm="' + i + '">remove</button>'; }).join(' · ') + '</p>' : '') + aisRows() +
      '<div class="tgset"><label>Our speed made good <input id="tgSpd" type="number" step="0.1" min="0" max="30" value="' + (C.spd || '') + '" placeholder="' + r.sp.s.toFixed(1) + '" style="width:70px"> kn (blank: VMC or SOG)</label><label><input type="checkbox" id="tgAlarm"' + (C.alarm ? ' checked' : '') + '> Alarm 15 minutes before the gate closes while we would miss it</label></div>';
    p.querySelector('.tgb').innerHTML = h; wire(p);
  }
  function aisRows() { var a = window.__fsAisList ? window.__fsAisList().slice(0, 12) : []; if (!a.length) return ''; return '<p class="tgn">AIS boats: give one a TCC to put it in the table.</p>' + a.map(function (x) { return '<div class="tgadd"><span>' + esc(x.name || 'MMSI ' + x.mmsi) + '</span><input type="number" step="0.001" min="0.8" max="1.8" data-ais="' + x.mmsi + '" value="' + (C.ais[x.mmsi] || '') + '" placeholder="TCC"></div>'; }).join(''); }
  /* a pasted entry list: each line with a TCC (0.800 to 1.800); the name is the rest of the line, sail numbers and classes kept as written */
  function parseList(t) { var out = []; String(t || '').split(/\r?\n/).forEach(function (l) { var m = l.match(/(^|[\s,;\t])([01]\.\d{3})(?=$|[\s,;\t])/); if (!m) return; var v = +m[2]; if (!(v >= 0.8 && v <= 1.8)) return; var n = (l.slice(0, m.index) + ' ' + l.slice(m.index + m[0].length)).replace(/[\t,;]+/g, ' ').replace(/\s+/g, ' ').trim(); if (n) out.push({ name: n.slice(0, 40), tcc: v }); }); return out; }
  function wire(p) {
    var lg = $('tgListGo'); if (lg) lg.onclick = function () { var a = parseList($('tgList').value), have = {}; C.rivals.forEach(function (q) { have[q.name.toLowerCase()] = 1; }); var n = 0; a.forEach(function (q) { if (have[q.name.toLowerCase()]) return; C.rivals.push(q); n++; }); save(); render(); var e = $('tgListN'); if (e) e.textContent = ' ' + n + ' added.'; };
    var a = $('tgAdd'); if (a) a.onclick = function () { var n = $('tgName').value.trim(), t = +$('tgTcc').value; if (!n || !(t > 0.5)) return; C.rivals.push({ name: n, tcc: t }); save(); render(); };
    [].forEach.call(p.querySelectorAll('[data-rm]'), function (b) { b.onclick = function () { C.rivals.splice(+b.dataset.rm, 1); save(); render(); }; });
    [].forEach.call(p.querySelectorAll('[data-ais]'), function (i) { i.onchange = function () { var v = +i.value; if (v > 0) C.ais[i.dataset.ais] = v; else delete C.ais[i.dataset.ais]; save(); render(); }; });
    var s = $('tgSpd'); if (s) s.onchange = function () { C.spd = +s.value > 0 ? +s.value : 0; save(); render(); };
    var al = $('tgAlarm'); if (al) al.onchange = function () { C.alarm = al.checked; save(); };
  }
  function css() { if ($('tgCss')) return; var s = document.createElement('style'); s.id = 'tgCss';
    s.textContent = '.tgpop{position:absolute;left:max(8px,env(safe-area-inset-left,0px));top:calc(env(safe-area-inset-top,0px) + 58px);z-index:9;width:min(calc(100% - 16px),440px);max-height:calc(100% - 130px);overflow:auto;background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:12px;padding:12px 14px;box-shadow:0 4px 16px rgba(0,0,0,.35);font-size:13px}.tgpop[hidden]{display:none}.tgpop h3{margin:0 0 6px;font-size:16px}.tgpop h4{margin:10px 0 4px;font-size:13px}.tgpop .close{position:absolute;right:8px;top:6px}' +
      '.tgtop{display:flex;gap:12px;align-items:center}.tgtop div{display:flex;flex-direction:column;gap:2px}.tgtop span{font-size:12px;color:var(--muted)}.tgv{margin:8px 0 4px;font-weight:600}.tgv.ok{color:#16a34a}.tgv.bad{color:#dc2626}.tgn{margin:4px 0;font-size:12px;color:var(--muted)}' +
      '.tgtw{overflow-x:auto}.tgt{border-collapse:collapse;width:100%;font-size:12px;font-variant-numeric:tabular-nums}.tgt th{text-align:left;color:var(--muted);font-weight:600;padding:2px 6px 2px 0}.tgt td{padding:3px 6px 3px 0;border-top:1px solid var(--line);vertical-align:top}.tgt small{display:block;color:var(--muted);font-size:10px}' +
      '.tgadd{display:flex;gap:6px;align-items:center;margin:4px 0}.tgadd input{min-height:36px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink);padding:0 8px;min-width:0}.tgadd input:first-child{flex:1}.tgadd span{flex:1}.tgset{display:flex;flex-direction:column;gap:6px;margin-top:8px;font-size:12px}' +
      '.tgstrip{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 70px);z-index:6;background:var(--glass,var(--panel));color:var(--ink);border:1px solid var(--line);border-radius:16px;padding:4px 12px;font:700 12px var(--f-data);white-space:nowrap;cursor:pointer}.tgstrip[hidden]{display:none}.tgstrip.bad{border-color:#dc2626;color:#dc2626}.tgstrip.ok{border-color:#16a34a}';
    document.head.appendChild(s); }
  function open(show) {
    css(); var p = $('tgPop'); if (!p) { p = document.createElement('div'); p.id = 'tgPop'; p.className = 'tgpop'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Tide gate'); p.innerHTML = '<button class="close" type="button" aria-label="Close the tide gate">×</button><h3>Tide gate</h3><div class="tgb"></div>'; (document.querySelector('.app>.chart') || document.body).appendChild(p); p.querySelector('.close').onclick = function () { open(false); }; p.hidden = true; }
    var on = show == null ? p.hidden : !!show; p.hidden = !on; var b = $('tgBtn'); if (b) b.setAttribute('aria-pressed', String(on)); if (on) render();
  }
  /* the strip on the deck screen, and the alarm */
  var beeped = 0;
  function tick() {
    var deck = document.body.classList.contains('fsdeck'), st = $('tgStrip'); render();
    if (!deck && !C.alarm) { if (st) st.hidden = true; return; }
    var r = work(); if (r.why || !r.T1 || !r.T1.t) { if (st) st.hidden = true; return; }
    if (deck) { css(); if (!st) { st = document.createElement('div'); st.id = 'tgStrip'; st.className = 'tgstrip'; st.onclick = function () { open(true); }; (document.querySelector('.app>.chart') || document.body).appendChild(st); }
      st.hidden = false; var miss = r.T1.now === 'fair' && r.margin < 0; st.className = 'tgstrip ' + (miss || atEta(r) === 'foul' ? 'bad' : 'ok');
      st.textContent = 'TIDE ' + r.T1.now.toUpperCase() + ' · turns ' + hm(r.T1.t) + ' · ETA ' + hm(r.L1.eta) + ' · ' + (r.margin >= 0 ? '+' : '') + Math.round(r.margin) + ' min';
      /* F116 (Stuart's 16:45 photo, 21 Nov): the Routing box sat on the tide line; the line moves up clear of it while it shows */
      clearProg(); }
    else if (st) st.hidden = true;
    var closesIn = (r.T1.t - Date.now()) / 60000;
    if (C.alarm && r.T1.now === 'fair' && r.margin < 0 && closesIn <= 15 && closesIn > 0 && Date.now() - beeped > 600000) { beeped = Date.now(); alarm('Tide gate closes in ' + Math.round(closesIn) + ' min: at this speed we miss it by ' + Math.round(-r.margin) + ' min.' + (r.need ? ' Need ' + r.need.toFixed(1) + ' kn.' : '')); }
  }
  function alarm(t) {
    try { if (window.NavToast) window.NavToast(t); else { var b = $('busy'); if (b) { b.textContent = t; b.hidden = false; setTimeout(function () { if (b.textContent === t) { b.textContent = ''; b.hidden = true; } }, 8000); } } } catch (e) {}
    try { var A = window.AudioContext || window.webkitAudioContext; if (A) { var ac = new A(), o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 880; o.connect(g); g.connect(ac.destination); g.gain.value = 0.2; o.start(); setTimeout(function () { o.stop(); ac.close(); }, 600); } } catch (e) {}
    try { if (navigator.vibrate) navigator.vibrate([300, 150, 300]); } catch (e) {}
  }
  function button() {
    if ($('tgBtn')) return true; var plotB = $('fsPlotBtn') || [].filter.call(document.querySelectorAll('button'), function (b) { return b.textContent.trim() === 'PLOT' && !b.closest('#deckNums'); })[0]; if (!plotB) return false;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'tgBtn'; b.className = plotB.className.replace(/\brplotb\b/, '') + ' tgb'; b.textContent = 'TIDE'; b.title = 'Tide gate: will we beat the tide to the mark?'; b.setAttribute('aria-pressed', 'false'); b.onclick = function () { open(); };
    var after = $('fsDeckBtn') || plotB; after.parentNode.insertBefore(b, after.nextSibling); return true;
  }
  function clearProg() { var st = $('tgStrip'); if (!st || st.hidden) return; st.style.bottom = ''; var pg = $('prog'); if (pg && !pg.hidden && pg.getClientRects().length) { var a = pg.getBoundingClientRect(), b = st.getBoundingClientRect(); if (a.width && !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom)) st.style.bottom = Math.round((parseFloat(getComputedStyle(st).bottom) || 0) + b.bottom - a.top + 6) + 'px'; } }   /* raised by the overlap, in the strip's own frame */
  function init() { if (!button()) return setTimeout(init, 1000); setInterval(tick, 30000); setInterval(clearProg, 2000); }
  window.FSTideGate = { parseList: parseList, open: open, work: work, sail: sail, turn: turn, need: need, C: C, tick: tick, along: along };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else setTimeout(init, 500);
})();
