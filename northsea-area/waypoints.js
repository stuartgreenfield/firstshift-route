/* FirstShift Route and Navigate: the waypoint store and the measuring tool (Stuart 15 Nov 2026, job K; Q&A 13:40).
   08:33: "a store for waypoints on both tools that can be used to build courses and a tool which allows a cursor on screen to measure
   heading and distance between two places and what the wind angles speed VMC would be based on the current gribs for your boat".
   Q&A: grow My marks (one place for every point); add by a tap on the chart, typed position, Here (GPS), or GPX or CSV import, and export
   GPX; measure with a ruler button, then drag; the line shows bearing and distance, wind, polar speed, VMC and time, the tide along it
   with the course and speed over the ground, fetch, beat or run, the sail, shallow water, and on a beat or run the time with tacks. */
(function () {
  'use strict';
  var R = Math.PI / 180, SHOW = 'fs-wptshow';
  function $(id) { return document.getElementById(id); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function get() { try { return (window.__fsMarksGet ? window.__fsMarksGet() : []) || []; } catch (e) { return []; } }
  function put(a) { try { if (window.__fsMarksSet) window.__fsMarksSet(a); } catch (e) {} redraw(); }
  function redraw() { try { if (window.__fsRedraw) window.__fsRedraw(); } catch (e) {} }
  function toast(t) { try { if (window.NavToast) return window.NavToast(t); } catch (e) {} var b = $('busy'); if (b) { b.textContent = t; b.hidden = false; setTimeout(function () { if (b.textContent === t) { b.textContent = ''; b.hidden = true; } }, 3500); } }
  function show() { try { return localStorage.getItem(SHOW) !== '0'; } catch (e) { return true; } }
  var TYPES = [['mark', 'Mark'], ['waypoint', 'Waypoint'], ['start', 'Start or finish end'], ['danger', 'Keep clear']];
  function ddm(v, pos, neg) { var a = Math.abs(v), d = Math.floor(a), m = (a - d) * 60; if (m >= 59.995) { d++; m = 0; } return (pos === 'E' && d < 100 ? (d < 10 ? '00' : '0') : '') + d + '°' + (m < 10 ? '0' : '') + m.toFixed(2) + "'" + (v >= 0 ? pos : neg); }
  function fmt(la, lo) { return ddm(la, 'N', 'S') + ' ' + ddm(lo, 'E', 'W'); }
  /* typed positions: 50 46.58N 001 21.46W, 50°46.58'N 1°21.46'W, 50.7763 -1.3577, 50 46 35N 1 21 28W */
  function parseOne(t, isLat) {
    t = String(t || '').trim().toUpperCase().replace(/[°º'′"″,]/g, ' ').replace(/\s+/g, ' ').trim(); if (!t) return null;
    var h = /([NSEW])$/.exec(t) || /^([NSEW])/.exec(t), sign = 1; if (h) { if (h[1] === 'S' || h[1] === 'W') sign = -1; t = t.replace(/[NSEW]/g, '').trim(); }
    var p = t.split(' ').map(Number); if (p.some(function (x) { return x !== x; }) || !p.length || p.length > 3) return null;
    var v = Math.abs(p[0]) + (p[1] || 0) / 60 + (p[2] || 0) / 3600; if (p[0] < 0) sign = -1; v *= sign;
    if (isLat ? Math.abs(v) > 90 : Math.abs(v) > 180) return null; return v;
  }
  function parsePos(t) {
    var s = String(t || '').trim().toUpperCase(); if (!s) return null;
    var m = /^(.*?[NS])\s*,?\s*(.*[EW])$/.exec(s.replace(/([NS])(?=\s*\d)/, '$1 '));
    if (m) { var a = parseOne(m[1], true), b = parseOne(m[2], false); return a == null || b == null ? null : { lat: a, lon: b }; }
    var q = s.split(/[\s,;]+/).filter(Boolean); if (q.length === 2) { var x = parseOne(q[0], true), y = parseOne(q[1], false); return x == null || y == null ? null : { lat: x, lon: y }; }
    return null;
  }
  function add(p) {
    var a = get(), nm = String(p.name || '').trim() || ('WP' + (a.length + 1)); a = a.filter(function (m) { return m.name.toLowerCase() !== nm.toLowerCase(); });
    a.unshift({ name: nm.slice(0, 40), lat: +(+p.lat).toFixed(5), lon: +(+p.lon).toFixed(5), type: p.type || 'waypoint', notes: (p.notes || '').slice(0, 200), at: Date.now() }); put(a); return a[0];
  }

  /* ---- on the chart ---- */
  var last = null, M = null;   /* M: the measuring line */
  function overlay(ctx, X, Y, editing) {
    last = { X: X, Y: Y };
    if (show() && !editing) {
      var a = get(), px = Math.abs(Y(50) - Y(50 + 1 / 60)); if (px > 0.8 && a.length) {
        ctx.font = '600 11px system-ui, sans-serif'; ctx.textBaseline = 'middle';
        a.forEach(function (m) { var x = X(m.lon), y = Y(m.lat); ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 6); ctx.lineTo(x - 6, y); ctx.closePath(); ctx.fillStyle = m.type === 'danger' ? '#dc2626' : '#ffffff'; ctx.fill(); ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2; ctx.stroke();
          if (px > 6) { ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.strokeText(m.name, x + 9, y); ctx.fillStyle = '#4c1d95'; ctx.fillText(m.name, x + 9, y); } });
      }
    }
    if (M && M.b) {
      var x0 = X(M.a.lo), y0 = Y(M.a.la), x1 = X(M.b.lo), y1 = Y(M.b.la);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.stroke(); ctx.lineWidth = 2.5; ctx.setLineDash([8, 5]); ctx.strokeStyle = M.r && M.r.shallow ? '#dc2626' : '#7c3aed'; ctx.stroke(); ctx.setLineDash([]);
      [[x0, y0], [x1, y1]].forEach(function (q) { ctx.beginPath(); ctx.arc(q[0], q[1], 5, 0, 2 * Math.PI); ctx.fillStyle = '#7c3aed'; ctx.fill(); });
      /* bearing and distance on the chart by the moving end, updated as the finger moves (Stuart 15 Nov 20:26) */
      if (M.r && M.r.nm != null) {
        var txt = ('00' + Math.round(M.r.brg) % 360).slice(-3) + '°T  ' + (M.r.nm < 0.1 ? Math.round(M.r.nm * 1852) + ' m' : M.r.nm < 10 ? M.r.nm.toFixed(2) + ' nm' : M.r.nm.toFixed(1) + ' nm');
        ctx.font = '700 14px Inter, system-ui, sans-serif'; var tw = ctx.measureText(txt).width, lx = Math.min(x1 + 14, (ctx.canvas.width / (window.devicePixelRatio || 1)) - tw - 16), ly = Math.max(y1 - 14, 22);
        ctx.fillStyle = 'rgba(17,24,39,.82)'; ctx.fillRect(lx - 6, ly - 16, tw + 12, 22); ctx.fillStyle = M.r.shallow ? '#fca5a5' : '#fff'; ctx.fillText(txt, lx, ly);
      }
    } else if (M && M.a) { var xa = X(M.a.lo), ya = Y(M.a.la); ctx.beginPath(); ctx.arc(xa, ya, 6, 0, 2 * Math.PI); ctx.fillStyle = '#7c3aed'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); }   /* the first point, before the drag */
  }
  /* the tap box: save this point, or measure from it */
  function tipExtra(body, la, lo) {
    var d = document.createElement('div'); d.className = 'xrow'; d.style.margin = '6px 0';
    d.innerHTML = '<button class="btn" type="button" data-w="save">Save as waypoint</button><button class="btn" type="button" data-w="ruler">Measure from here</button>';
    body.appendChild(d);
    d.querySelector('[data-w="save"]').onclick = function (e) { e.stopPropagation(); var t = $('tip'); if (t) t.hidden = true; openSheet({ edit: { lat: la, lon: lo, name: '', type: 'waypoint', notes: '' } }); };
    d.querySelector('[data-w="ruler"]').onclick = function (e) { e.stopPropagation(); var t = $('tip'); if (t) t.hidden = true; ruler(true); M = { a: { la: la, lo: lo }, b: null }; toast('Now drag or tap to where you want to measure to.'); };
  }

  /* ---- the measuring tool ---- */
  var RU = false;
  function boatPos() { try { var b = window.__navBoat && window.__navBoat(); if (b && b.age && b.age.lat < 6000) return { la: b.lat, lo: b.lon, what: 'the boat' }; } catch (e) {} try { var f = window.__fsLiveFix && window.__fsLiveFix(); if (f) return { la: f.la, lo: f.lo, what: 'the boat' }; } catch (e) {} return null; }
  function snap(cx, cy) {
    var p = window.__fsLL(cx, cy), best = null, bd = 26; if (!last) return { la: p.la, lo: p.lo };
    var cands = get().map(function (m) { return { la: m.lat, lo: m.lon, what: m.name }; }); var bp = boatPos(); if (bp) cands.unshift(bp);
    try { (window.FSSolent && window.FSSolent.isOn() && window.FSSolent.marks() || []).forEach(function (m) { cands.push({ la: m.lat, lo: m.lon, what: m.id + ' ' + m.name }); }); } catch (e) {}
    try { var c = window.__navCourse && window.__navCourse(); if (c) [c.start].concat(c.marks || []).concat([c.finish]).forEach(function (m) { if (m) cands.push({ la: m.lat, lo: m.lon, what: m.name }); }); } catch (e) {}
    cands.forEach(function (q) { var d = Math.hypot(last.X(q.lo) - p.x, last.Y(q.la) - p.y); if (d < bd) { bd = d; best = q; } });
    return best || { la: p.la, lo: p.lo };
  }
  function ruler(v) {
    RU = v == null ? !RU : !!v; var b = $('fsRulerBtn'); if (b) b.setAttribute('aria-pressed', String(RU));
    document.body.classList.toggle('fsruler', RU); if (!RU) { M = null; var bx = $('fsMeas'); if (bx) bx.hidden = true; } redraw();
  }
  function hookChart() {
    var cv = $('map'); if (!cv || cv.__fsRu) return; cv.__fsRu = 1; var down = null;
    var stop = function (e) { e.stopImmediatePropagation(); e.preventDefault(); };
    cv.addEventListener('pointerdown', function (e) { if (!RU || !e.isPrimary) return; stop(e); var p = snap(e.clientX, e.clientY); down = { id: e.pointerId, x: e.clientX, y: e.clientY }; if (M && M.a && !M.b && M.tapFirst) { M.b = p; M.tapFirst = false; calc(); return; } M = { a: p, b: null }; try { cv.setPointerCapture(e.pointerId); } catch (x) {} }, true);
    cv.addEventListener('pointermove', function (e) { if (!RU || !down || e.pointerId !== down.id) return; stop(e); if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6) return; M.b = snap(e.clientX, e.clientY); calc(); }, true);
    cv.addEventListener('pointerup', function (e) { if (!RU || !down || e.pointerId !== down.id) return; stop(e); var moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) >= 6; down = null; if (!moved && M && !M.b) { M.tapFirst = true; toast('From here: now tap where to measure to.'); } else calc(); }, true);
    ['click', 'dblclick'].forEach(function (k) { cv.addEventListener(k, function (e) { if (RU) stop(e); }, true); });
  }
  /* tacks or gybes on a beat or run: about one every 15 minutes, at least one, each costing the Course tab's tack or gybe loss */
  function turns(r) { if (!r || !r.tack || r.hours == null) return r; var sec = +(document.getElementById(r.kind === 'beat' ? 'tackS' : 'gybeS') || {}).value; if (!(sec >= 0)) sec = r.kind === 'beat' ? 60 : 40; r.turnS = sec; r.nTurns = Math.max(1, Math.round(r.hours * 4)); r.hoursAll = r.hours + r.nTurns * sec / 3600; return r; }
  function hm(h) { if (h == null || h !== h) return '--'; var m = Math.round(h * 60); return Math.floor(m / 60) + 'h ' + ('0' + m % 60).slice(-2); }
  function d3(v) { return ('00' + Math.round((v % 360 + 360) % 360)).slice(-3) + '°'; }
  function calc() {
    if (!M || !M.b || !window.__fsMeasure) return; var r = M.r = turns(window.__fsMeasure(M.a.la, M.a.lo, M.b.la, M.b.lo)); redraw();
    /* the same leg later: +1, +2 and +3 hours from the time on the slider (Stuart 15 Nov K Q&A), so the turn of the tide shows */
    var later = [1, 2, 3].map(function (k) { try { return turns(window.__fsMeasure(M.a.la, M.a.lo, M.b.la, M.b.lo, r.t + k)); } catch (e) { return null; } });
    var bx = $('fsMeas'); if (!bx) { bx = document.createElement('div'); bx.id = 'fsMeas'; bx.className = 'fsmeas'; bx.setAttribute('role', 'status'); (document.querySelector('.app>.chart') || document.body).appendChild(bx); }
    var t = new Date(r.at * 1000), rows = [];
    rows.push('<b>' + d3(r.brg) + 'T · ' + (r.nm < 10 ? r.nm.toFixed(2) : r.nm.toFixed(1)) + ' nm</b>' + (M.a.what ? ' from ' + esc(M.a.what) : '') + (M.b.what ? ' to ' + esc(M.b.what) : ''));
    if (r.tws != null) {
      rows.push('Wind ' + r.tws.toFixed(0) + ' kn from ' + d3(r.twd) + ' at ' + ('0' + t.getUTCHours()).slice(-2) + ':' + ('0' + t.getUTCMinutes()).slice(-2) + ' UTC (time on the slider)');
      if (r.hdg != null) {
        var kindTxt = r.kind === 'beat' ? 'BEAT' : r.kind === 'run' && r.tack ? 'RUN (gybing)' : r.kind === 'fetch' ? 'FETCH' : r.kind === 'reach' ? 'REACH' : 'RUN';
        rows.push('<b>' + kindTxt + '</b>: ' + (r.tack ? 'best VMG on ' + d3(r.hdg) + ' and ' + d3(r.other) + ', TWA ' + Math.abs(Math.round(r.twa)) + '°' : 'steer ' + d3(r.hdg) + ', TWA ' + Math.abs(Math.round(r.twa)) + '° ' + (r.twa < 0 ? 'port' : 'stbd')));
        rows.push('Boat speed ' + (r.bsp != null ? r.bsp.toFixed(1) : '--') + ' kn (polar) · VMC ' + (r.sog != null ? r.sog.toFixed(1) : '--') + ' kn · time ' + hm(r.tack && r.hoursAll != null ? r.hoursAll : r.hours));
        if (r.tack && r.nTurns) rows.push('Includes ' + r.nTurns + ' ' + (r.kind === 'beat' ? 'tack' : 'gybe') + (r.nTurns > 1 ? 's' : '') + ' at ' + r.turnS + ' s each (about one every 15 minutes; the loss is set in the Course tab)');
        if (r.sail) rows.push('Sail: ' + esc(r.sail));
      }
    } else rows.push('No forecast wind here at this time.');
    if (r.tide != null) rows.push('Tide ' + r.tide.toFixed(1) + ' kn to ' + d3(r.tideTo) + ': ' + (Math.abs(r.tideAlong) < 0.1 ? 'across the line' : (r.tideAlong > 0 ? '+' : '') + r.tideAlong.toFixed(1) + ' kn along it') + (r.sog != null ? ' (in the VMC above)' : ''));
    if (r.shallow) rows.push('<b class="fsmwarn">Crosses water shallower than your safety depth.</b>');
    if (later.some(function (x) { return x && x.tws != null; })) rows.push('<table class="fsmlater"><tr><th>Later</th><th>Wind</th><th>Tide along</th><th>VMC</th><th>Time</th></tr>' + later.map(function (x, k) { if (!x) return ''; var tt = new Date(x.at * 1000); return '<tr><td>+' + (k + 1) + ' h ' + ('0' + tt.getUTCHours()).slice(-2) + ':' + ('0' + tt.getUTCMinutes()).slice(-2) + '</td><td>' + (x.tws != null ? x.tws.toFixed(0) + ' kn ' + d3(x.twd) : '--') + '</td><td>' + (x.tideAlong != null ? (x.tideAlong > 0 ? '+' : '') + x.tideAlong.toFixed(1) + ' kn' : '--') + '</td><td>' + (x.sog != null ? x.sog.toFixed(1) + ' kn' : '--') + '</td><td>' + hm(x.tack && x.hoursAll != null ? x.hoursAll : x.hours) + '</td></tr>'; }).join('') + '</table>');
    /* compact by default (Stuart 15 Nov 20:30: "the info box for the ruler does dominate a bit"): one line, More for the rest; the choice is kept */
    var full = false; try { full = localStorage.getItem('fs-measfull') === '1'; } catch (e) {}
    var one = d3(r.brg) + 'T · ' + (r.nm < 10 ? r.nm.toFixed(2) : r.nm.toFixed(1)) + ' nm' + (r.hdg != null ? ' · ' + (r.kind === 'beat' ? 'beat' : r.kind === 'fetch' ? 'fetch' : r.kind === 'reach' ? 'reach' : 'run') + ' · ' + hm(r.tack && r.hoursAll != null ? r.hoursAll : r.hours) : '') + (r.shallow ? ' · <b class="fsmwarn">shallow</b>' : '');
    bx.classList.toggle('full', full);
    bx.innerHTML = '<button class="close" type="button" aria-label="Close the measurement">×</button>' + (full ? rows.map(function (h) { return '<div>' + h + '</div>'; }).join('') + '<div class="xrow"><button class="btn" type="button" data-m="save">Save the end as a waypoint</button><button class="btn" type="button" data-m="off">Ruler off</button><button class="btn" type="button" data-m="less">Less</button></div>' : '<div class="fsmone"><b>' + one + '</b><button class="btn fsmmore" type="button" data-m="more">More</button></div>');
    bx.hidden = false; bx.querySelector('.close').onclick = function () { ruler(false); };   /* the × ends measuring too, so taps give the boat and weather card again (F15, Stuart 15 Nov 21:15: "× turns ruler off") */
    var setFull = function (v) { try { localStorage.setItem('fs-measfull', v ? '1' : '0'); } catch (e) {} calc(); };
    if (full) { bx.querySelector('[data-m="off"]').onclick = function () { ruler(false); }; bx.querySelector('[data-m="save"]').onclick = function () { openSheet({ edit: { lat: M.b.la, lon: M.b.lo, name: '', type: 'waypoint', notes: '' } }); }; bx.querySelector('[data-m="less"]').onclick = function () { setFull(false); }; }
    else bx.querySelector('[data-m="more"]').onclick = function () { setFull(true); };
  }

  /* ---- the waypoint sheet ---- */
  var sel = [];   /* a course being built: indexes into the list, with sides */
  function css() {
    if ($('wptCss')) return; var s = document.createElement('style'); s.id = 'wptCss';
    s.textContent = '.fsmeas{position:absolute;left:50%;transform:translateX(-50%);bottom:12px;z-index:6;width:auto;max-width:min(calc(100% - 24px),360px);background:var(--glass,var(--panel));color:var(--ink);border:1px solid #7c3aed;border-radius:10px;padding:6px 30px 6px 10px;font-size:12px;display:flex;flex-direction:column;gap:3px;box-shadow:0 2px 8px rgba(0,0,0,.25)}.fsmeas.full{max-width:min(calc(100% - 24px),480px)}.fsmone{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.fsmmore{min-height:30px;padding:0 10px;font-size:12px}.fsmeas[hidden]{display:none}.fsmeas .close{position:absolute;right:6px;top:4px}.fsmwarn{color:#dc2626}.fsmlater{border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums;margin-top:4px}.fsmlater th,.fsmlater td{padding:1px 8px 1px 0;text-align:left}.fsmlater th{color:var(--muted);font-weight:600}' +
      '.fsrulerb{right:max(64px,calc(env(safe-area-inset-right,0px) + 52px))!important;bottom:104px!important}.fsrulerb[aria-pressed="true"]{background:#7c3aed!important;color:#fff!important;border-color:#7c3aed!important}body.fsruler #map{cursor:crosshair}' +
      '.wptrow{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:6px 0;border-bottom:1px solid var(--line)}.wptrow b{flex:1 1 160px;min-width:0}.wptrow small{color:var(--muted);flex-basis:100%}.wptform{display:grid;gap:6px;padding:8px;border:1px solid var(--line);border-radius:10px;margin:8px 0}.wptform input,.wptform select,.wptform textarea{width:100%;box-sizing:border-box;font:inherit}.wptcourse{background:var(--bg);border-radius:10px;padding:8px;margin:8px 0}';
    document.head.appendChild(s);
  }
  function openSheet(o) {
    css(); var s = $('wptSheet');
    if (!s) { s = document.createElement('div'); s.className = 'sheet'; s.id = 'wptSheet'; s.hidden = true; s.innerHTML = '<div class="in" role="dialog" aria-label="Waypoints"><div class="shead"><h2>Waypoints</h2><button class="close" id="wptX" aria-label="Close waypoints">×</button></div><div class="sbody" id="wptBody"></div></div>'; document.body.appendChild(s); $('wptX').onclick = function () { s.hidden = true; }; }
    try { var sh = $('sheet'); if (sh && !sh.hidden && $('sheetX')) $('sheetX').click(); } catch (e) {}
    s.hidden = false; render(o || {});
  }
  function render(o) {
    var b = $('wptBody'); if (!b) return; var a = get(), q = (o.q || '').toLowerCase(), h = '';
    h += '<p class="note">Your own points, kept on this device (up to 200), for building courses. Positions as degrees and minutes; you can also type 50.7763, -1.3577.</p>';
    h += '<div class="xrow"><button class="btn primary" data-a="new">Add a waypoint</button><button class="btn" data-a="gps">Here (GPS)</button><button class="btn" data-a="imp">Import GPX or CSV</button><button class="btn" data-a="exp"' + (a.length ? '' : ' disabled') + '>Export GPX</button><input type="file" id="wptFile" accept=".gpx,.csv,.txt,application/gpx+xml,text/csv" hidden></div>';
    h += '<label class="chk"><input type="checkbox" id="wptShow"' + (show() ? ' checked' : '') + '><span>Show my waypoints on the chart</span></label>';
    if (o.edit) {
      var e = o.edit; h += '<div class="wptform" id="wptForm"><label>Name<input id="wpN" maxlength="40" value="' + esc(e.name) + '" placeholder="e.g. Lymington spit"></label><label>Position<input id="wpP" value="' + (e.lat != null ? esc(fmt(e.lat, e.lon)) : '') + '" placeholder="50 46.58N 001 21.46W"></label><label>Type<select id="wpT">' + TYPES.map(function (t) { return '<option value="' + t[0] + '"' + (e.type === t[0] ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select></label><label>Notes<textarea id="wpNo" rows="2" maxlength="200">' + esc(e.notes) + '</textarea></label><p class="note" id="wpMsg"></p><div class="xrow"><button class="btn primary" data-a="save">Save</button><button class="btn" data-a="cancel">Cancel</button></div></div>';
    }
    if (sel.length) h += '<div class="wptcourse"><b>Course from waypoints</b> (first is the start, last the finish)<ol>' + sel.map(function (c, i) { var m = a[c.i]; if (!m) return ''; return '<li>' + esc(m.name) + (i > 0 && i < sel.length - 1 ? ' <select data-cs="' + i + '"><option value="port"' + (c.side !== 'starboard' ? ' selected' : '') + '>to port</option><option value="starboard"' + (c.side === 'starboard' ? ' selected' : '') + '>to starboard</option></select>' : i === 0 ? ' (start)' : ' (finish)') + '</li>'; }).join('') + '</ol><div class="xrow"><button class="btn primary" data-a="route"' + (sel.length >= 2 ? '' : ' disabled') + '>Route this course</button><button class="btn" data-a="clr">Clear</button></div></div>';
    h += '<input id="wptQ" placeholder="Search" value="' + esc(o.q || '') + '" style="width:100%;margin:8px 0">';
    var n = 0; a.forEach(function (m, i) { if (q && (m.name + ' ' + (m.notes || '')).toLowerCase().indexOf(q) < 0) return; n++;
      h += '<div class="wptrow"><b>' + esc(m.name) + '</b><button class="btn" data-c="' + i + '" aria-label="Add ' + esc(m.name) + ' to the course">+ Course</button><button class="btn" data-e="' + i + '">Edit</button><button class="btn" data-d="' + i + '" aria-label="Delete ' + esc(m.name) + '">×</button><small>' + fmt(m.lat, m.lon) + ' · ' + (TYPES.filter(function (t) { return t[0] === (m.type || 'mark'); })[0] || TYPES[0])[1] + (m.notes ? ' · ' + esc(m.notes) : '') + '</small></div>'; });
    if (!n) h += '<p class="note">' + (a.length ? 'None match.' : 'No waypoints yet. Tap the chart and choose Save as waypoint, or add one here.') + '</p>';
    b.innerHTML = h; wire(o);
  }
  function wire(o) {
    var b = $('wptBody'), q = function (s) { return b.querySelectorAll(s); }, act = function (k, f) { var e = b.querySelector('[data-a="' + k + '"]'); if (e) e.onclick = f; };
    $('wptShow').onchange = function () { try { localStorage.setItem(SHOW, this.checked ? '1' : '0'); } catch (e) {} redraw(); };
    $('wptQ').oninput = function () { var v = this.value; render(Object.assign({}, o, { q: v })); var e = $('wptQ'); e.focus(); e.setSelectionRange(v.length, v.length); };
    act('new', function () { render({ edit: { name: '', type: 'waypoint', notes: '' } }); });
    act('gps', function () { var p = boatPos(); if (!p) { toast('No GPS position yet: turn on Live GPS (or connect the boat), then tap Here again.'); try { if (window.__navLiveOn) window.__navLiveOn(); } catch (e) {} return; } render({ edit: { lat: p.la, lon: p.lo, name: '', type: 'waypoint', notes: 'GPS ' + new Date().toUTCString().slice(5, 22) + ' UTC' } }); });
    act('cancel', function () { render({}); });
    act('save', function () { var p = parsePos($('wpP').value), nm = $('wpN').value.trim(); if (!p) { $('wpMsg').textContent = 'That position was not understood. Type it like 50 46.58N 001 21.46W, or 50.7763 -1.3577.'; return; } if (!nm) { $('wpMsg').textContent = 'Give it a name.'; return; } var old = o.edit.orig; if (old != null) { var a = get(); a.splice(old, 1); put(a); } add({ name: nm, lat: p.lat, lon: p.lon, type: $('wpT').value, notes: $('wpNo').value }); toast('Saved: ' + nm); render({}); });
    act('exp', exportGpx);
    act('imp', function () { $('wptFile').click(); });
    $('wptFile').onchange = function () { var f = this.files && this.files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { var n = importText(String(r.result || ''), f.name); toast(n ? n + ' waypoints imported from ' + f.name : 'No waypoints found in ' + f.name); render({}); }; r.readAsText(f); };
    act('clr', function () { sel = []; render(o); });
    act('route', function () { var a = get(), pts = sel.map(function (c) { return Object.assign({}, a[c.i], { side: c.side }); }).filter(function (m) { return m.lat != null; }); if (pts.length < 2 || !window.__fsUseCourse) return; var c = { name: pts[0].name + ' to ' + pts[pts.length - 1].name, start: { name: 'Start, ' + pts[0].name, lat: pts[0].lat, lon: pts[0].lon }, marks: pts.slice(1, -1).map(function (m) { return { name: m.name, lat: m.lat, lon: m.lon, side: m.side || 'port' }; }), finish: { name: 'Finish, ' + pts[pts.length - 1].name, lat: pts[pts.length - 1].lat, lon: pts[pts.length - 1].lon } }; sel = []; $('wptSheet').hidden = true; window.__fsUseCourse(c); });
    [].forEach.call(q('[data-c]'), function (e) { e.onclick = function () { sel.push({ i: +e.dataset.c, side: 'port' }); render(o); }; });
    [].forEach.call(q('[data-cs]'), function (e) { e.onchange = function () { sel[+e.dataset.cs].side = e.value; }; });
    [].forEach.call(q('[data-e]'), function (e) { e.onclick = function () { var m = get()[+e.dataset.e]; render({ edit: { orig: +e.dataset.e, name: m.name, lat: m.lat, lon: m.lon, type: m.type || 'mark', notes: m.notes || '' } }); }; });
    [].forEach.call(q('[data-d]'), function (e) { e.onclick = function () { var i = +e.dataset.d, a = get(), m = a[i]; if (e.dataset.sure !== '1') { e.dataset.sure = '1'; e.textContent = 'Delete?'; return; } a.splice(i, 1); put(a); sel = sel.filter(function (c) { return c.i !== i; }).map(function (c) { return { i: c.i > i ? c.i - 1 : c.i, side: c.side }; }); toast('Deleted ' + m.name); render(o); }; });
  }
  function importText(t, name) {
    var pts = [];
    if (/<gpx|<wpt|<rtept/i.test(t)) {
      var re = /<(wpt|rtept)\b([^>]*)>([\s\S]*?)<\/\1>/gi, m; while ((m = re.exec(t))) { var la = /lat="([-\d.]+)"/.exec(m[2]), lo = /lon="([-\d.]+)"/.exec(m[2]), nm = /<name>([\s\S]*?)<\/name>/i.exec(m[3]), de = /<desc>([\s\S]*?)<\/desc>/i.exec(m[3]); if (la && lo) pts.push({ name: nm ? nm[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '', lat: +la[1], lon: +lo[1], notes: de ? de[1].trim() : '' }); }
    } else {
      t.split(/\r?\n/).forEach(function (line, i) { var c = line.split(/[,;\t]/).map(function (x) { return x.trim().replace(/^"|"$/g, ''); }); if (c.length < 2) return; if (i === 0 && /lat|name/i.test(line)) return;
        var p = c.length >= 3 ? parsePos(c[1] + ' ' + c[2]) : null, nm = c[0]; if (!p && c.length >= 2) { p = parsePos(c[0] + ' ' + c[1]); nm = c[2] || ''; } if (p) pts.push({ name: nm, lat: p.lat, lon: p.lon, notes: c[3] || '' }); });
    }
    pts.filter(function (p) { return Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180; }).slice(0, 200).reverse().forEach(function (p) { add({ name: p.name, lat: p.lat, lon: p.lon, type: 'waypoint', notes: p.notes }); });
    return pts.length;
  }
  function exportGpx() {
    var a = get(), x = function (s) { return String(s).replace(/[<>&"]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]; }); };
    var g = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="FirstShift" xmlns="http://www.topografix.com/GPX/1/1">\n' + a.map(function (m) { return '<wpt lat="' + m.lat.toFixed(6) + '" lon="' + m.lon.toFixed(6) + '"><name>' + x(m.name) + '</name>' + (m.notes ? '<desc>' + x(m.notes) + '</desc>' : '') + '<type>' + x(m.type || 'mark') + '</type></wpt>'; }).join('\n') + '\n</gpx>\n';
    var el = document.createElement('a'); el.href = URL.createObjectURL(new Blob([g], { type: 'application/gpx+xml' })); el.download = 'firstshift-waypoints.gpx'; document.body.appendChild(el); el.click(); setTimeout(function () { URL.revokeObjectURL(el.href); el.remove(); }, 1000); toast('Saved firstshift-waypoints.gpx (' + a.length + ' waypoints)');
  }

  function buttons() {
    css(); var help = $('helpBtn'); if (help && !$('fsRulerBtn')) { var b = document.createElement('button'); b.type = 'button'; b.id = 'fsRulerBtn'; b.className = 'fabhelp fsrulerb'; b.title = 'Measure: drag from one point to another'; b.setAttribute('aria-label', 'Measuring tool'); b.setAttribute('aria-pressed', 'false');
      b.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 17 17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/></svg>'; b.onclick = function () { ruler(); if (RU) toast('Measure: drag on the chart from one point to another. It snaps to the boat, marks and waypoints.'); }; help.parentNode.insertBefore(b, help); }
    var c = $('wptOpen'); if (c) c.onclick = function () { openSheet({}); };
    hookChart();
  }
  (window.__fsOverlays = window.__fsOverlays || []).push(overlay);
  window.__fsTipExtra = tipExtra;
  window.FSWpt = { open: openSheet, add: add, list: get, parse: parsePos, importText: importText, ruler: ruler, measure: function (a, b) { M = { a: a, b: b }; calc(); return M.r; }, state: function () { return { ruler: RU, m: M }; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buttons); else buttons();
  setTimeout(buttons, 2000);
})();
