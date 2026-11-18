/* Mark: race set-up, rebuilt from scratch (Stuart 18 Nov 2026).
   20:00 "the tapping should highlight a buoy or point then the next should create a blue line and we build a course ... we need to
   test this better and get the logic right". 20:03 "click on each part of the menu enter the correct tick it and move on to the next
   create the course and the start line on screen and in a list". Decided 20:08: start line first, then the course; the course from
   the committee board codes, taps on the chart, VHF typed in, or the sailing instructions; each line end by ping, tap, a buoy or
   latitude and longitude. Research: B&G race mode, Garmin start line, SailGrib RS (docs/MARK-SETUP-REBUILD.md).
   Rules: one state (the race in FSSolent and the line in Route), one render, no timers. While it is open nothing else moves on the
   chart and every tap on the chart comes here: a buoy gets a ring and a number at once, and the blue line joins it to the last. */
(function () {
  'use strict';
  if (!window.FS_MARK) return;
  var R = Math.PI / 180, U = { on: false, open: 'line', end: 'boat', lm: 'tap', cm: 'tap', wpick: 'w', fpick: false, msg: '', hot: null, P: null, clr: 0 };
  var ROWS = [['line', 'Start line'], ['course', 'Course'], ['finish', 'Finish'], ['wind', 'Wind'], ['gun', 'Gun and sequence']];
  var SEQ = [[5, '5-4-1-0'], [10, '10-5-0'], [104, '10-4-1-0'], [3, '3-2-1-0']];
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[<>&"]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]; }); }
  function Sol() { return window.FSSolent; }
  function B() { try { return Sol().state() || {}; } catch (e) { return {}; } }
  function setB(o) { try { Sol().set(o); } catch (e) {} }
  function MK() { try { return Sol().marks() || []; } catch (e) { return []; } }
  function byCode(c) { c = String(c || '').trim().toUpperCase(); var m = null; MK().forEach(function (q) { if (q.id === c) m = q; }); return m; }
  function line() { try { return (window.__fsLine && window.__fsLine()) || {}; } catch (e) { return {}; } }
  function lineOk() { var l = line(); return !!(l.boat && l.pin); }
  function redraw() { try { if (window.__fsRedraw) window.__fsRedraw(); } catch (e) {} }
  function toast(t) { try { if (window.NavToast) return window.NavToast(t); } catch (e) {} var b = $('busy'); if (b) { b.textContent = t; b.hidden = false; setTimeout(function () { if (b.textContent === t) { b.textContent = ''; b.hidden = true; } }, 4000); } }
  function nm(a, b) { var k = Math.cos((a[0] + b[0]) / 2 * R); return Math.hypot((b[1] - a[1]) * k, b[0] - a[0]) * 60; }
  function brg(a, b) { var k = Math.cos((a[0] + b[0]) / 2 * R); return (Math.atan2((b[1] - a[1]) * k, b[0] - a[0]) / R + 360) % 360; }
  function off(p, b, d) { var la = p[0] + d / 60 * Math.cos(b * R); return [la, p[1] + d / 60 * Math.sin(b * R) / Math.cos((p[0] + la) / 2 * R)]; }
  function d3(v) { return ('00' + Math.round(v) % 360).slice(-3); }
  function ddm(v, pos, neg) { var a = Math.abs(v), d = Math.floor(a), mn = (a - d) * 60; if (mn >= 59.9995) { d++; mn = 0; } return (pos === 'E' ? ('00' + d).slice(-3) : d) + '°' + mn.toFixed(3) + "'" + (v >= 0 ? pos : neg); }
  function llTxt(p) { return ddm(p[0], 'N', 'S') + ' ' + ddm(p[1], 'E', 'W'); }
  function mid() { var l = line(); return l.boat && l.pin ? [(l.boat[0] + l.pin[0]) / 2, (l.boat[1] + l.pin[1]) / 2] : null; }
  function startPt() { var m = mid(); return m ? { code: null, name: 'Start line', lat: m[0], lon: m[1], line: true } : null; }
  /* latitude or longitude typed as in the sailing instructions: 50 46.004 N, 50°46.004'N, 50.7667, 001 18.055 W, -1.3009 */
  function parseLL(s, isLat) { s = String(s || '').trim().toUpperCase(); if (!s) return null; var neg = /[SW]/.test(s) || /^-/.test(s); var n = s.replace(/[NSEW°'"′″-]/g, ' ').trim().split(/[\s,]+/).filter(Boolean).map(Number); if (!n.length || n.some(isNaN)) return null;
    var v = n[0] + (n[1] || 0) / 60 + (n[2] || 0) / 3600; if (neg) v = -v; if (isLat ? Math.abs(v) > 90 : Math.abs(v) > 180) return null; return v; }

  /* ---- the state of each row: done when ticked and still true ---- */
  function su() { return B().su || {}; }
  function setSu(k, v) { var o = Object.assign({}, su()); if (v) o[k] = 1; else delete o[k]; setB({ su: o }); }
  function wl() { return B().wl || {}; }
  function wlW() { var w = wl(); if (w.wkind === 'buoy') { var m = byCode(w.wcode); return m ? [m.lat, m.lon, m.id] : null; } var c = mid(); return c && w.brg >= 0 && w.brg <= 360 && w.dist > 0 ? off(c, w.brg, w.dist).concat(['W']) : null; }
  function wlL() { var w = wl(); if (w.lkind === 'buoy') { var m = byCode(w.lcode); return m ? [m.lat, m.lon, m.id] : null; } if (w.lkind === 'gate') { var a = byCode(w.lcode), b = byCode(w.lcode2); return a && b ? [(a.lat + b.lat) / 2, (a.lon + b.lon) / 2, a.id + '/' + b.id] : null; } var c = mid(); return c ? c.concat(['Start']) : null; }
  function valid(k) { var b = B();
    if (k === 'line') return lineOk();
    if (k === 'course') return b.type === 'wl' ? !!(wlW() && wlL()) : (b.marks || []).length > 0;
    if (k === 'finish') return b.type === 'wl' ? true : b.fin !== 'mark' || !!b.finish;
    if (k === 'wind') return true;
    if (k === 'gun') return !!(b.startAt && b.startAt > Date.now() / 1000 - 3600); return false; }
  function done(k) { return !!su()[k] && valid(k); }
  function allDone() { return ROWS.every(function (r) { return done(r[0]); }); }
  function why(k) { var b = B(), l = line();
    if (k === 'line') return !l.boat && !l.pin ? 'Set both ends of the line.' : !l.boat ? 'Set the committee boat end.' : 'Set the pin end.';
    if (k === 'course') return b.type === 'wl' ? (!wlW() ? 'Set the windward mark.' : 'Set the leeward mark.') : 'Add at least one buoy.';
    if (k === 'finish') return 'Tap the finish buoy, or choose the start line.';
    if (k === 'gun') return 'Set the time of the gun.'; return ''; }
  function summary(k) { var b = B(), l = line();
    if (k === 'line') { if (!lineOk()) return l.boat ? 'Committee boat end set; pin end to do' : l.pin ? 'Pin end set; committee boat end to do' : 'Not set'; var len = nm(l.boat, l.pin) * 1852, t = 'Line ' + Math.round(len) + ' m, ' + d3(brg(l.boat, l.pin)) + '°T to the pin'; var w = b.wind; if (w && w.twd != null) { var up = Math.cos((brg(l.boat, l.pin) - w.twd) * R) * len; t += Math.abs(up) < 3 ? ', square' : ', ' + (up > 0 ? 'pin' : 'boat') + ' end favoured ' + Math.round(Math.abs(up)) + ' m'; } return t; }
    if (k === 'course') { if (b.type === 'wl') { var W = wlW(), L = wlL(), w2 = wl(); return W && L ? 'Windward ' + W[2] + ', leeward ' + L[2] + ', ' + (w2.laps || 2) + ' laps, ' + (w2.side === 'starboard' || w2.side === 'stbd' ? 'starboard' : 'port') : 'Windward-leeward: not set'; }
      var ms = b.marks || []; if (!ms.length) return 'Round the cans: no buoys yet'; var pts = [mid()].concat(ms.map(function (m) { return [m.lat, m.lon]; })).filter(Boolean), d = 0; for (var i = 1; i < pts.length; i++) d += nm(pts[i - 1], pts[i]);
      return ms.map(function (m) { return (m.code || m.name) + ' ' + (m.side === 'starboard' || m.side === 'stbd' ? 'S' : 'P'); }).join(', ') + ' · ' + d.toFixed(1) + ' nm'; }
    if (k === 'finish') { if (b.type === 'wl') { var f = wl().fin || 'lee'; return f === 'start' ? 'At the start line' : f === 'wind' ? 'At the windward mark' : 'At the leeward mark'; } return b.fin === 'mark' && b.finish ? 'At ' + (b.finish.code || b.finish.name) : 'At the start line'; }
    if (k === 'wind') { var w3 = b.wind; return w3 && w3.twd != null ? d3(w3.twd) + '°T' + (w3.tws ? ' ' + w3.tws + ' kn' : '') + ' (' + (w3.src === 'typed' ? 'typed' : w3.src || 'set') + ')' : 'From the forecast'; }
    if (k === 'gun') { if (!b.startAt) return 'Not set'; var g = new Date(b.startAt * 1000); return 'Gun ' + ('0' + g.getHours()).slice(-2) + ':' + ('0' + g.getMinutes()).slice(-2) + ', ' + (SEQ.filter(function (q) { return q[0] === (b.seq || 5); })[0] || SEQ[0])[1]; } return ''; }

  /* ---- the chart: what the set-up draws, and where it looks ---- */
  function css() { if ($('msuCss')) return; var st = document.createElement('style'); st.id = 'msuCss';
    st.textContent = '.msu{position:fixed;left:0;right:0;bottom:0;z-index:70;margin:0 auto;max-width:620px;max-height:46vh;display:flex;flex-direction:column;background:var(--panel,#0f2235);color:var(--ink,#fff);border:2px solid #3b82f6;border-bottom:0;border-radius:16px 16px 0 0;box-shadow:0 -6px 24px rgba(0,0,0,.4);font:400 15px/1.4 var(--f-body,system-ui,sans-serif)}.msu[hidden]{display:none}' +
      '.msu-hd{display:flex;align-items:center;gap:8px;padding:10px 12px 8px max(12px,env(safe-area-inset-left,0px));border-bottom:1px solid var(--line,#334155)}.msu-hd h2{margin:0;flex:1;font:700 17px/1.2 var(--f-head,system-ui)}.msu-hd .btn{min-height:40px}' +
      '.msu-bd{overflow-y:auto;-webkit-overflow-scrolling:touch;padding:6px max(12px,env(safe-area-inset-right,0px)) calc(env(safe-area-inset-bottom,0px) + 12px) max(12px,env(safe-area-inset-left,0px))}' +
      '.msu-row{border-bottom:1px solid var(--line,#334155)}.msu-rh{display:flex;align-items:center;gap:10px;width:100%;min-height:52px;padding:6px 2px;background:none;border:0;color:inherit;font:inherit;text-align:left;cursor:pointer}' +
      '.msu-tk{flex:none;width:28px;height:28px;border-radius:50%;border:2px solid var(--muted,#94a3b8);display:grid;place-items:center;font:700 15px/1 system-ui;color:transparent}.msu-row.ok .msu-tk{background:#22c55e;border-color:#22c55e;color:#04210f}' +
      '.msu-rt{flex:1;min-width:0;display:grid}.msu-rt b{font-weight:700}.msu-rt span{font-size:13px;color:var(--muted,#94a3b8);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.msu-row.open .msu-rt span{white-space:normal}.msu-chev{flex:none;color:var(--muted,#94a3b8)}' +
      '.msu-body{padding:2px 0 12px 38px;display:grid;gap:10px}.msu-seg{display:flex;flex-wrap:wrap;gap:6px}.msu-seg button{min-height:40px;padding:0 12px;border-radius:20px;border:1px solid var(--line,#475569);background:none;color:inherit;font:600 14px var(--f-body,system-ui);cursor:pointer}.msu-seg button[aria-pressed="true"]{background:#3b82f6;border-color:#3b82f6;color:#fff}' +
      '.msu-say{margin:0;font-size:14px}.msu-msg{margin:0;padding:8px 10px;border-radius:10px;background:rgba(245,158,11,.15);border:1px solid #f59e0b;font-size:14px}.msu-msg.good{background:rgba(34,197,94,.12);border-color:#22c55e}' +
      '.msu-in{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.msu-in input,.msu-in select,.msu-in textarea{min-height:42px;font:inherit;font-size:16px;padding:0 10px;border-radius:10px;border:1px solid var(--line,#475569);background:var(--bg,#081a2e);color:inherit;box-sizing:border-box}.msu-in textarea{width:100%;min-height:64px;padding:8px 10px}.msu-in input{width:9em}.msu-in input.sm{width:5.5em}.msu-in label{font-size:13px;color:var(--muted,#94a3b8)}' +
      '.msu-list{margin:0;padding:0;list-style:none;display:grid;gap:4px}.msu-list li{display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:10px;background:rgba(59,130,246,.10)}.msu-list li b{min-width:1.6em;color:#93c5fd}.msu-list li span{flex:1;min-width:0;font-size:14px}.msu-list li small{display:block;color:var(--muted,#94a3b8);font-size:12px}' +
      '.msu-ps{min-height:36px;min-width:44px;border-radius:18px;border:2px solid #dc2626;background:none;color:#f87171;font:800 13px system-ui;cursor:pointer}.msu-ps.s{border-color:#16a34a;color:#4ade80}.msu-x{min-height:36px;min-width:36px;border-radius:18px;border:1px solid var(--line,#475569);background:none;color:inherit;cursor:pointer}' +
      '.msu-ft{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding-top:10px}.msu-ft .btn{min-height:44px}.msu-ft .msu-go{flex:1 1 auto}.msu-ends{display:grid;gap:4px;font-size:14px}.msu-ends span{color:var(--muted,#94a3b8)}' +
      'body.msu-on #liveBox,body.msu-on #liveBig,body.msu-on #fsPlot,body.msu-on #solSeq,body.msu-on .solrb,body.msu-on .navgrip2,body.msu-on .fswtab,body.msu-on #solPop,body.msu-on #solSide,body.msu-on #solStep,body.msu-on #solLegs,body.msu-on #solAfter,body.msu-on #solStartScr,body.msu-on .solchain,body.msu-on #solTestBar,body.msu-on #solCard,body.msu-on #solList,body.msu-on .fabhelp,body.msu-on #busy{display:none!important}' +
      '.mkfirst{display:none!important}';
    document.head.appendChild(st); }
  function overlay(ctx, X, Y) {
    U.P = { X: X, Y: Y }; if (!U.on) return; var b = B(), l = line(), dpr = 1;
    var dot = function (la, lo, r, fill, stroke, lw) { ctx.beginPath(); ctx.arc(X(lo), Y(la), r, 0, 7); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.lineWidth = lw || 3; ctx.strokeStyle = stroke; ctx.stroke(); } };
    var label = function (x, y, t, col) { ctx.font = '800 13px system-ui,sans-serif'; var w = ctx.measureText(t).width + 10; ctx.fillStyle = 'rgba(8,26,46,.9)'; ctx.fillRect(x, y - 10, w, 20); ctx.fillStyle = col || '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(t, x + 5, y); };
    /* the start line: orange, committee boat end a square, pin end a circle */
    if (l.boat && l.pin) { ctx.beginPath(); ctx.moveTo(X(l.boat[1]), Y(l.boat[0])); ctx.lineTo(X(l.pin[1]), Y(l.pin[0])); ctx.lineWidth = 4 * dpr; ctx.strokeStyle = '#f59e0b'; ctx.stroke(); }
    if (l.boat) { var bx = X(l.boat[1]), by = Y(l.boat[0]); ctx.fillStyle = '#f59e0b'; ctx.fillRect(bx - 7, by - 7, 14, 14); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.strokeRect(bx - 7, by - 7, 14, 14); label(bx + 10, by - 12, 'Committee boat'); }
    if (l.pin) { dot(l.pin[0], l.pin[1], 7, '#f59e0b', '#fff', 2); ctx.font = '800 13px system-ui,sans-serif'; label(X(l.pin[1]) - 10 - ctx.measureText('Pin').width - 10, Y(l.pin[0]) + 14, 'Pin'); }
    /* the course: a blue line from the middle of the start line through each mark, each mark ringed and numbered */
    var pts = [], m0 = mid(); if (m0) pts.push([m0[0], m0[1], null]);
    if (b.type === 'wl') { var W = wlW(), L = wlL(); if (W) pts.push([W[0], W[1], 'W ' + W[2], wl().side]); if (L && wl().lkind && wl().lkind !== 'start') pts.push([L[0], L[1], 'L ' + L[2], wl().side]); }
    else (b.marks || []).forEach(function (m, i) { pts.push([m.lat, m.lon, (i + 1) + ' ' + (m.code || m.name), m.side]); });
    if (b.type !== 'wl' && b.fin === 'mark' && b.finish) pts.push([b.finish.lat, b.finish.lon, 'Finish ' + (b.finish.code || '')]); else if (b.type !== 'wl' && m0 && (b.marks || []).length) pts.push([m0[0], m0[1], null]);
    if (pts.length > 1) { ctx.beginPath(); pts.forEach(function (p, i) { if (i) ctx.lineTo(X(p[1]), Y(p[0])); else ctx.moveTo(X(p[1]), Y(p[0])); }); ctx.lineWidth = 3; ctx.strokeStyle = '#3b82f6'; ctx.setLineDash([]); ctx.stroke(); }
    pts.forEach(function (p) { if (!p[2]) return; var st = p[3] === 'starboard' || p[3] === 'stbd'; dot(p[0], p[1], 13, null, '#fff', 5); dot(p[0], p[1], 13, null, st ? '#16a34a' : '#3b82f6', 3); label(X(p[1]) + 16, Y(p[0]), p[2] + (p[3] ? (st ? ' S' : ' P') : ''), st ? '#4ade80' : '#93c5fd'); });
    if (b.type === 'wl' && wl().lkind === 'gate') ['lcode', 'lcode2'].forEach(function (k) { var g = byCode(wl()[k]); if (g) { dot(g.lat, g.lon, 13, null, '#3b82f6', 3); label(X(g.lon) + 16, Y(g.lat), 'Gate ' + g.id, '#93c5fd'); } });
    if (U.hot) { var h = U.hot; dot(h[0], h[1], 19, null, '#facc15', 3); }
  }
  /* the chart fits the job in the strip between the top bar and the set-up sheet, close enough that the buoys stand apart */
  function gap() { var t = 0, top = document.querySelector('.top') || $('mkTop'); if (top && top.getClientRects().length) t = top.getBoundingClientRect().bottom; var s = $('msu'), b = s && !s.hidden ? s.getBoundingClientRect().top : innerHeight; return { t: t + 4, b: b - 4 }; }
  function fit(pts) { if (!window.__fsFitBox) return; pts = pts.filter(Boolean); var c;
    if (!pts.length) { var f = null; try { f = window.__fsLiveFix && window.__fsLiveFix(); } catch (e) {} c = f && f.la > 50.5 && f.la < 50.95 && f.lo > -1.75 && f.lo < -0.9 ? [f.la, f.lo] : [50.775, -1.29]; pts = [[c[0] - 0.011, c[1] - 0.018], [c[0] + 0.011, c[1] + 0.018]]; }   /* about 2.5 km across: the buoys stand apart and a tap finds the right one */
    var s = Math.min.apply(null, pts.map(function (p) { return p[0]; })), n = Math.max.apply(null, pts.map(function (p) { return p[0]; })), w = Math.min.apply(null, pts.map(function (p) { return p[1]; })), e = Math.max.apply(null, pts.map(function (p) { return p[1]; }));
    var padLa = Math.max(0.006, (n - s) * 0.18), padLo = Math.max(0.009, (e - w) * 0.18); try { window.__fsFitBox(s - padLa, n + padLa, w - padLo, e + padLo, gap()); } catch (x) {} redraw(); }
  function fitNow(k) { var b = B(), l = line(), pts = [l.boat, l.pin];
    if (k === 'course' || k === 'finish') { if (b.type === 'wl') { pts.push(wlW(), wlL()); } else (b.marks || []).forEach(function (m) { pts.push([m.lat, m.lon]); }); if (!(b.marks || []).length && b.type !== 'wl' && mid()) { var m0 = mid(); pts.push([m0[0] - 0.018, m0[1] - 0.028], [m0[0] + 0.018, m0[1] + 0.028]); } }
    fit(pts.filter(Boolean).map(function (p) { return [p[0], p[1]]; })); }

  /* ---- taps on the chart while the set-up is open ---- */
  /* the buoys under a tap: the nearest within 26 px, and any others within 10 px of it, so two buoys close together are never guessed */
  function near(x, y) { if (!U.P) return []; var c = MK().map(function (m) { return [Math.hypot(U.P.X(m.lon) - x, U.P.Y(m.lat) - y), m]; }).filter(function (q) { return q[0] < 26; }).sort(function (a, b) { return a[0] - b[0]; }); return c.filter(function (q) { return q[0] - c[0][0] < 10; }).slice(0, 4).map(function (q) { return q[1]; }); }
  function onLand(la, lo) { try { return !!(window.__fsOnLand && window.__fsOnLand(la, lo)); } catch (e) { return false; } }
  function setEnd(end, la, lo, how) { var l = line(), oth = l[end === 'pin' ? 'boat' : 'pin'];
    if (oth && nm(oth, [la, lo]) * 1852 < 20) { U.msg = 'That is only ' + Math.round(nm(oth, [la, lo]) * 1852) + ' m from the other end, so it was not used. Set the ' + (end === 'pin' ? 'pin' : 'committee boat') + ' end where it is.'; return false; }
    window.__fsSetLine(end, la, lo); var sp = startPt(); if (sp) setB({ sk: 'line', start: sp });
    U.msg = (end === 'pin' ? 'Pin end' : 'Committee boat end') + ' set' + (how ? ' ' + how : '') + ': ' + llTxt([la, lo]) + '.'; U.good = true;
    if (!line()[end === 'pin' ? 'boat' : 'pin']) U.end = end === 'pin' ? 'boat' : 'pin'; return true; }
  function useBuoy(m) { var k = U.open, b = B(); U.choose = null; U.hot = [m.lat, m.lon]; U.good = true;
    if (k === 'line') { setEnd(U.end, m.lat, m.lon, 'at buoy ' + m.id); return; }
    if (k === 'course') {
      if (b.type === 'wl') { var w = Object.assign({}, wl()); if (U.wpick === 'w') { w.wkind = 'buoy'; w.wcode = m.id; U.msg = 'Windward mark: ' + m.id + ' ' + m.name + '. Now the leeward mark.'; U.wpick = 'l'; } else if (U.wpick === 'l') { w.lkind = 'buoy'; w.lcode = m.id; U.msg = 'Leeward mark: ' + m.id + ' ' + m.name + '.'; } else if (U.wpick === 'g1') { w.lkind = 'gate'; w.lcode = m.id; U.wpick = 'g2'; U.msg = 'Gate, first buoy: ' + m.id + '. Now tap the other.'; } else { w.lkind = 'gate'; w.lcode2 = m.id; U.wpick = 'g1'; U.msg = 'Gate: ' + (w.lcode || '?') + ' and ' + m.id + '.'; } setB({ wl: w }); return; }
      var ms = (B().marks || []).slice(); ms.push({ code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon, side: 'port' }); setB({ marks: ms }); U.msg = ms.length + ': ' + m.id + ' ' + m.name + ', Port. Tap P in the list to make it Starboard.'; return; }
    if (k === 'finish') { setB({ fin: 'mark', finish: { code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon } }); U.msg = 'Finish at ' + m.id + ' ' + m.name + '.'; } }
  function onTap(la, lo, x, y) {
    var k = U.open, b = B(), hits = near(x, y); U.msg = ''; U.good = false; U.choose = null;
    var wantBuoy = (k === 'line' && U.lm === 'buoy') || k === 'course' || (k === 'finish' && b.type !== 'wl' && b.fin === 'mark');
    if (k === 'line' && U.lm === 'tap') { if (onLand(la, lo)) U.msg = 'That point is on land. Tap in the water.'; else { setEnd(U.end, la, lo, 'where you tapped'); U.hot = null; } }
    else if (wantBuoy) { if (!hits.length) U.msg = 'No buoy there. Tap on a buoy, zoom in with two fingers, or type its code.'; else if (hits.length > 1) { U.choose = hits; U.msg = 'Buoys close together here. Which one?'; } else useBuoy(hits[0]); }
    else if (k === 'line') U.msg = U.lm === 'ping' ? 'Ping sets each end from the GPS. To use the chart, choose Tap the chart or A buoy.' : 'Type the latitude and longitude, or choose Tap the chart.';
    else if (k === 'finish' && b.type !== 'wl') U.msg = 'To finish at a buoy, choose A buoy first.';
    else U.msg = 'The chart is not needed for this step.';
    render(); redraw(); return true; }

  /* ---- the sheet ---- */
  function seg(key, cur, opts) { return '<div class="msu-seg" role="group">' + opts.map(function (o) { return '<button type="button" data-a="' + key + '" data-v="' + o[0] + '" aria-pressed="' + (String(cur) === String(o[0])) + '">' + o[1] + '</button>'; }).join('') + '</div>'; }
  function msg() { return (U.msg ? '<p class="msu-msg' + (U.good ? ' good' : '') + '" role="status">' + esc(U.msg) + '</p>' : '') + (U.choose ? '<div class="msu-seg">' + U.choose.map(function (m) { return '<button type="button" data-a="pick" data-v="' + esc(m.id) + '">' + esc(m.id + ' ' + m.name) + '</button>'; }).join('') + '</div>' : ''); }
  function doneBtn(k) { return '<div class="msu-ft">' + (valid(k) ? '<button class="btn primary msu-go" data-a="done" data-v="' + k + '">Done: tick it and go on</button>' : '<p class="msu-say">' + esc(why(k)) + '</p>') + '</div>'; }
  function bodyLine() { var l = line(), e = U.end;
    var h = seg('lm', U.lm, [['tap', 'Tap the chart'], ['ping', 'Ping'], ['buoy', 'A buoy'], ['ll', 'Lat and long'], ['rys', 'RYS line']]);
    if (U.lm !== 'rys' && U.lm !== 'ping') h += seg('end', e, [['boat', (l.boat ? '✓ ' : '') + 'Committee boat end'], ['pin', (l.pin ? '✓ ' : '') + 'Pin end']]);
    if (U.lm === 'tap') h += '<p class="msu-say">Tap the chart where the <b>' + (e === 'pin' ? 'pin end' : 'committee boat') + '</b> is.</p>';
    if (U.lm === 'buoy') h += '<p class="msu-say">Tap the buoy at the <b>' + (e === 'pin' ? 'pin end' : 'committee boat end') + '</b>, or type its code.</p><div class="msu-in"><input id="msuCode" placeholder="Code, e.g. 4M" autocapitalize="characters" aria-label="Buoy code"><button class="btn" data-a="lcode">Use</button></div>';
    if (U.lm === 'ping') h += '<p class="msu-say">With the bow on the line at each end, tap its button.</p><div class="msu-in"><button class="btn" data-a="ping" data-v="boat">' + (l.boat ? '✓ ' : '') + 'Ping committee boat end</button><button class="btn" data-a="ping" data-v="pin">' + (l.pin ? '✓ ' : '') + 'Ping pin end</button></div>';
    if (U.lm === 'll') h += '<p class="msu-say">From the sailing instructions, for the <b>' + (e === 'pin' ? 'pin end' : 'committee boat end') + '</b>.</p><div class="msu-in"><input id="msuLat" placeholder="50 46.004 N" aria-label="Latitude"><input id="msuLon" placeholder="001 18.055 W" aria-label="Longitude"><button class="btn" data-a="ll">Use</button></div>';
    if (U.lm === 'rys') h += '<p class="msu-say">The Royal Yacht Squadron line at Cowes: the flagstaff on 346°T to abeam the Williams Shipping Buoy (Rolex Fastnet Race 2025 sailing instructions 14.1 and 14.2). Check the sailing instructions for your race.</p><div class="msu-in"><button class="btn" data-a="rys">Use the RYS line</button></div>';
    h += msg() + '<div class="msu-ends"><div>Committee boat: <span>' + (l.boat ? llTxt(l.boat) : 'not set') + '</span></div><div>Pin: <span>' + (l.pin ? llTxt(l.pin) : 'not set') + '</span></div></div>';
    if (l.boat || l.pin) h += '<div class="msu-in">' + (lineOk() ? '<button class="btn" data-a="swap">Swap ends</button>' : '') + '<button class="btn" data-a="lclear">Clear line</button></div>';
    return h + doneBtn('line'); }
  function bodyCourse() { var b = B(), h = seg('type', b.type === 'wl' ? 'wl' : 'marks', [['marks', 'Round the cans'], ['wl', 'Windward-leeward']]);
    if (b.type === 'wl') { var w = wl();
      h += seg('wpick', U.wpick, [['w', 'Windward mark'], ['l', 'Leeward mark'], ['g1', 'Leeward gate']]);
      if (U.wpick === 'w') h += '<p class="msu-say">Tap the windward buoy, type its code, or give a bearing and distance from the line.</p><div class="msu-in"><input id="msuCode" placeholder="Code, e.g. 4M" autocapitalize="characters" aria-label="Windward buoy code"><button class="btn" data-a="wcode">Use</button></div><div class="msu-in"><input class="sm" id="msuBrg" type="number" inputmode="numeric" min="0" max="360" placeholder="°T" value="' + (w.wkind !== 'buoy' && w.brg != null ? w.brg : '') + '" aria-label="Bearing to the windward mark"><label>°T</label><input class="sm" id="msuDist" type="number" inputmode="decimal" step="0.1" min="0.1" placeholder="nm" value="' + (w.wkind !== 'buoy' && w.dist ? w.dist : '') + '" aria-label="Distance in nautical miles"><label>nm</label><button class="btn" data-a="wbrg">Use</button></div>';
      else if (U.wpick === 'l') h += '<p class="msu-say">Tap the leeward buoy or type its code. Or the start line is the leeward mark:</p><div class="msu-in"><input id="msuCode" placeholder="Code" autocapitalize="characters" aria-label="Leeward buoy code"><button class="btn" data-a="lcode2">Use</button><button class="btn" data-a="lstart">The start line</button></div>';
      else h += '<p class="msu-say">Tap the two gate buoys, one after the other.</p>';
      h += '<div class="msu-in"><label for="msuLaps">Laps</label><input class="sm" id="msuLaps" type="number" inputmode="numeric" min="1" max="6" value="' + (w.laps || 2) + '"><button class="btn" data-a="laps">Set</button></div>' + seg('side', w.side === 'starboard' || w.side === 'stbd' ? 'starboard' : 'port', [['port', 'Leave to port'], ['starboard', 'Leave to starboard']]);
    } else {
      h += seg('cm', U.cm, [['tap', 'Tap buoys'], ['codes', 'Type codes']]);
      if (U.cm === 'tap') h += '<p class="msu-say">Tap each buoy in order. It is ringed, numbered and joined by the blue line. Each goes in as Port: tap P to change it.</p>';
      else h += '<p class="msu-say">From the committee board, the VHF or the sailing instructions: codes with P or S, for example <b>4M P, 4V S, 40 P</b>.</p><div class="msu-in"><textarea id="msuBoard" placeholder="4M P, 4V S, 40 P" autocapitalize="characters" aria-label="Course codes"></textarea><button class="btn" data-a="board" data-v="add">Add to the course</button><button class="btn" data-a="board" data-v="new">Replace the course</button></div>';
      var ms = b.marks || [], prev = mid();
      if (ms.length) h += '<ol class="msu-list">' + ms.map(function (m, i) { var p = [m.lat, m.lon], leg = prev ? d3(brg(prev, p)) + '°T ' + nm(prev, p).toFixed(2) + ' nm' : ''; prev = p; var st = m.side === 'starboard' || m.side === 'stbd'; return '<li><b>' + (i + 1) + '</b><span>' + esc(m.name) + '<small>' + leg + '</small></span><button class="msu-ps' + (st ? ' s' : '') + '" data-a="ps" data-v="' + i + '" aria-label="Rounding side, tap to change">' + (st ? 'S' : 'P') + '</button><button class="msu-x" data-a="rm" data-v="' + i + '" aria-label="Remove ' + esc(m.code || m.name) + '">×</button></li>'; }).join('') + '</ol><div class="msu-in"><button class="btn" data-a="undo">Undo last</button><button class="btn" data-a="cclear">Clear course</button></div>';
    }
    return h + msg() + doneBtn('course'); }
  function bodyFinish() { var b = B(), h;
    if (b.type === 'wl') h = seg('wfin', wl().fin || 'lee', [['lee', 'Leeward mark'], ['start', 'Start line'], ['wind', 'Windward mark']]);
    else h = seg('fin', b.fin === 'mark' ? 'mark' : 'start', [['start', 'The start line'], ['mark', 'A buoy']]) + (b.fin === 'mark' ? '<p class="msu-say">Tap the finish buoy, or type its code.</p><div class="msu-in"><input id="msuCode" placeholder="Code" autocapitalize="characters" aria-label="Finish buoy code"><button class="btn" data-a="fcode">Use</button></div>' : '');
    return h + msg() + doneBtn('finish'); }
  function bodyWind() { var w = B().wind || {};
    return '<p class="msu-say">The wind at the start, for the line bias and the leg types. Leave it to use the forecast.</p><div class="msu-in"><input class="sm" id="msuTwd" type="number" inputmode="numeric" min="0" max="360" placeholder="°T" value="' + (w.src === 'typed' && w.twd != null ? w.twd : '') + '" aria-label="Wind direction, degrees true"><label>°T</label><input class="sm" id="msuTws" type="number" inputmode="decimal" min="0" max="60" placeholder="kn" value="' + (w.src === 'typed' && w.tws ? w.tws : '') + '" aria-label="Wind speed, knots"><label>kn</label><button class="btn" data-a="wind">Use</button><button class="btn" data-a="windfc">Use the forecast</button></div>' + msg() + doneBtn('wind'); }
  function bodyGun() { var b = B(), g = b.startAt ? new Date(b.startAt * 1000) : new Date(Date.now() + 15 * 60000), t = ('0' + g.getHours()).slice(-2) + ':' + ('0' + g.getMinutes()).slice(-2);
    return '<div class="msu-in"><label for="msuGun">Gun (this phone’s time)</label><input id="msuGun" type="time" value="' + t + '"><button class="btn" data-a="gun">Set</button></div>' + seg('seq', b.seq || 5, SEQ) + msg() + doneBtn('gun'); }
  function render() { var s = $('msu'); if (!s) return;
    var rows = ROWS.map(function (r) { var k = r[0], ok = done(k), open = U.open === k;
      return '<div class="msu-row' + (ok ? ' ok' : '') + (open ? ' open' : '') + '"><button class="msu-rh" data-a="open" data-v="' + k + '" aria-expanded="' + open + '"><span class="msu-tk" aria-hidden="true">✓</span><span class="msu-rt"><b>' + r[1] + '</b><span>' + esc(summary(k)) + '</span></span><span class="msu-chev" aria-hidden="true">' + (open ? '▾' : '▸') + '</span></button>' +
        (open ? '<div class="msu-body">' + ({ line: bodyLine, course: bodyCourse, finish: bodyFinish, wind: bodyWind, gun: bodyGun }[k])() + '</div>' : '') + '</div>'; }).join('');
    var n = ROWS.filter(function (r) { return done(r[0]); }).length;
    s.querySelector('.msu-hd h2').textContent = 'Race set-up · ' + n + ' of ' + ROWS.length;
    s.querySelector('.msu-bd').innerHTML = rows + '<div class="msu-ft">' + (allDone() ? '<button class="btn primary msu-go" data-a="race">Show the race</button>' : '') + '<button class="btn" data-a="again">' + (U.clr ? 'Tap again to clear everything' : 'Start again') + '</button></div>'; }
  function next(k) { var i = ROWS.map(function (r) { return r[0]; }).indexOf(k); for (var j = 1; j <= ROWS.length; j++) { var q = ROWS[(i + j) % ROWS.length][0]; if (!done(q)) return q; } return null; }
  function openRow(k) { U.open = k; U.msg = ''; U.hot = null; if (k === 'line') { var l = line(); U.end = !l.boat ? 'boat' : !l.pin ? 'pin' : U.end; } render(); var bd = document.querySelector('#msu .msu-bd'); if (bd) bd.scrollTop = 0; fitNow(k); }
  function act(a, v) { var b = B(), l = line(), val = function (id) { var e = $(id); return e ? e.value.trim() : ''; }; U.msg = ''; U.good = false; if (a !== 'again') U.clr = 0;
    if (a === 'open') { openRow(U.open === v ? null : v); return; }
    if (a !== 'pick') U.choose = null;
    if (a === 'pick') { var pm = byCode(v); if (pm) useBuoy(pm); }
    else if (a === 'lm') U.lm = v; else if (a === 'end') U.end = v; else if (a === 'cm') U.cm = v; else if (a === 'wpick') U.wpick = v;
    else if (a === 'done') { setSu(v, 1); var nx = next(v); openRow(nx); if (!nx) { U.msg = ''; } redraw(); return; }
    else if (a === 'lcode') { var m = byCode(val('msuCode')); if (!m) U.msg = 'No buoy with the code ' + (val('msuCode') || '(none)') + '.'; else { setEnd(U.end, m.lat, m.lon, 'at buoy ' + m.id); U.hot = [m.lat, m.lon]; fitNow('line'); } }
    else if (a === 'll') { var la = parseLL(val('msuLat'), true), lo = parseLL(val('msuLon'), false); if (la == null || lo == null) U.msg = 'Type the latitude and longitude, for example 50 46.004 N and 001 18.055 W.'; else { setEnd(U.end, la, lo, 'from the figures typed'); fitNow('line'); } }
    else if (a === 'ping') { try { window.__fsPing && window.__fsPing(v); } catch (e) {} setTimeout(function () { var l2 = line(); if (l2[v]) { var sp = startPt(); if (sp) setB({ sk: 'line', start: sp }); U.msg = (v === 'pin' ? 'Pin end' : 'Committee boat end') + ' pinged.'; U.good = true; } else U.msg = 'No GPS position yet, so nothing was saved. Wait for the GPS, then ping again.'; render(); redraw(); fitNow('line'); }, 400); return; }
    else if (a === 'rys') { var fb = [50.766733, -1.300917], q = off(fb, 346, 2290 / 1852); window.__fsSetLine('boat', fb[0], fb[1]); window.__fsSetLine('pin', q[0], q[1]); var sp = startPt(); setB({ sk: 'line', start: sp }); U.msg = 'RYS line set. Check it against the sailing instructions for your race.'; U.good = true; fitNow('line'); }
    else if (a === 'swap') { if (lineOk()) { var o = { boat: l.boat, pin: l.pin }; window.__fsSetLine('boat', o.pin[0], o.pin[1]); window.__fsSetLine('pin', o.boat[0], o.boat[1]); U.msg = 'Ends swapped.'; U.good = true; } }
    else if (a === 'lclear') { window.__fsSetLine('boat'); window.__fsSetLine('pin'); setSu('line', 0); U.end = 'boat'; U.msg = 'Line cleared.'; }
    else if (a === 'type') { setB({ type: v === 'wl' ? 'wl' : 'marks' }); setSu('course', 0); fitNow('course'); }
    else if (a === 'ps') { var ms = (b.marks || []).slice(), i = +v; if (ms[i]) { ms[i] = Object.assign({}, ms[i], { side: ms[i].side === 'starboard' || ms[i].side === 'stbd' ? 'port' : 'starboard' }); setB({ marks: ms }); } }
    else if (a === 'rm') { var ms2 = (b.marks || []).slice(); ms2.splice(+v, 1); setB({ marks: ms2 }); U.hot = null; }
    else if (a === 'undo') { var ms3 = (b.marks || []).slice(); var gone = ms3.pop(); setB({ marks: ms3 }); U.hot = null; if (gone) U.msg = 'Removed ' + (gone.code || gone.name) + '.'; }
    else if (a === 'cclear') { setB({ marks: [] }); setSu('course', 0); U.hot = null; U.msg = 'Course cleared.'; }
    else if (a === 'board') { var t = val('msuBoard'), r = null; try { r = Sol().board(t); } catch (e) {} if (!r || !r.marks.length) U.msg = 'No buoy codes found. Type them like 4M P, 4V S.' + (r && r.bad.length ? ' Not known: ' + r.bad.join(', ') + '.' : ''); else { var add = r.marks.map(function (m) { return { code: m.code, name: m.name, lat: m.lat, lon: m.lon, side: m.side === 'starboard' ? 'starboard' : 'port' }; }); setB({ marks: v === 'new' ? add : (b.marks || []).concat(add) }); U.msg = 'Added ' + add.map(function (m) { return m.code + (m.side === 'starboard' ? ' S' : ' P'); }).join(', ') + '.' + (r.bad.length ? ' Not known: ' + r.bad.join(', ') + '.' : ''); U.good = !r.bad.length; fitNow('course'); } }
    else if (a === 'wcode') { var wm = byCode(val('msuCode')); if (!wm) U.msg = 'No buoy with that code.'; else { setB({ wl: Object.assign({}, wl(), { wkind: 'buoy', wcode: wm.id }) }); U.wpick = 'l'; U.msg = 'Windward mark: ' + wm.id + ' ' + wm.name + '.'; U.good = true; fitNow('course'); } }
    else if (a === 'wbrg') { var bg = +val('msuBrg'), ds = +val('msuDist'); if (!(bg >= 0 && bg <= 360 && ds > 0)) U.msg = 'Give a bearing from 0 to 360°T and a distance in nm.'; else if (!lineOk()) U.msg = 'Set the start line first: the bearing is from its middle.'; else { setB({ wl: Object.assign({}, wl(), { wkind: 'brg', brg: bg, dist: ds }) }); U.wpick = 'l'; U.msg = 'Windward mark ' + d3(bg) + '°T ' + ds + ' nm from the line.'; U.good = true; fitNow('course'); } }
    else if (a === 'lcode2') { var lm = byCode(val('msuCode')); if (!lm) U.msg = 'No buoy with that code.'; else { setB({ wl: Object.assign({}, wl(), { lkind: 'buoy', lcode: lm.id }) }); U.msg = 'Leeward mark: ' + lm.id + ' ' + lm.name + '.'; U.good = true; fitNow('course'); } }
    else if (a === 'lstart') { setB({ wl: Object.assign({}, wl(), { lkind: 'start' }) }); U.msg = 'The start line is the leeward mark.'; U.good = true; }
    else if (a === 'laps') { var lp = Math.max(1, Math.min(6, Math.round(+val('msuLaps') || 2))); setB({ wl: Object.assign({}, wl(), { laps: lp }) }); U.msg = lp + ' laps.'; U.good = true; }
    else if (a === 'side') setB({ wl: Object.assign({}, wl(), { side: v }) });
    else if (a === 'wfin') setB({ wl: Object.assign({}, wl(), { fin: v }) });
    else if (a === 'fin') { setB(v === 'start' ? { fin: 'start', finish: null } : { fin: 'mark' }); }
    else if (a === 'fcode') { var fm = byCode(val('msuCode')); if (!fm) U.msg = 'No buoy with that code.'; else { setB({ fin: 'mark', finish: { code: fm.id, name: fm.id + ' ' + fm.name, lat: fm.lat, lon: fm.lon } }); U.msg = 'Finish at ' + fm.id + ' ' + fm.name + '.'; U.good = true; } }
    else if (a === 'wind') { var twd = +val('msuTwd'), tws = val('msuTws') === '' ? null : +val('msuTws'); if (!(twd >= 0 && twd <= 360)) U.msg = 'Type the wind direction, 0 to 360°T.'; else { setB({ wind: { twd: Math.round(twd) % 360, tws: tws > 0 ? tws : null, src: 'typed', at: Date.now() } }); U.msg = 'Wind ' + d3(twd) + '°T' + (tws > 0 ? ' ' + tws + ' kn' : '') + '.'; U.good = true; } }
    else if (a === 'windfc') { setB({ wind: null }); U.msg = 'The forecast wind will be used.'; U.good = true; }
    else if (a === 'gun') { var gv = val('msuGun').split(':'); if (gv.length < 2) U.msg = 'Choose the time of the gun.'; else { var d = new Date(); d.setHours(+gv[0], +gv[1], 0, 0); if (d.getTime() < Date.now() - 60000) d.setDate(d.getDate() + 1); var ep = Math.round(d.getTime() / 1000); setB({ startAt: ep, seq: b.seq || 5, pp: false, ended: null }); try { window.__fsGun && window.__fsGun(ep); } catch (e) {} U.msg = 'Gun at ' + val('msuGun') + (d.getDate() !== new Date().getDate() ? ' tomorrow' : '') + '.'; U.good = true; } }
    else if (a === 'seq') setB({ seq: +v });
    else if (a === 'race') { var sp2 = startPt(); if (sp2) setB({ sk: 'line', start: sp2 }); close(); toast('Putting the race on the chart…'); setTimeout(function () { var ok = false; try { ok = Sol().go(); } catch (e) { ok = false; } if (ok !== false) toast('The race is on the chart. The start box counts down to the gun.'); else { open(); U.msg = 'The course could not be shown: check each row.'; render(); } }, 30); return; }   /* the sheet goes at once; the course and its routes follow */
    else if (a === 'again') { if (!U.clr) { U.clr = 1; render(); setTimeout(function () { U.clr = 0; if (U.on) render(); }, 4000); return; } U.clr = 0; try { if (window.__fsClearCourse) window.__fsClearCourse(); } catch (e) {} window.__fsSetLine('boat'); window.__fsSetLine('pin'); setB({ su: {}, marks: [], fin: 'start', finish: null, start: null, wl: Object.assign({}, wl(), { wkind: 'brg', wcode: '', brg: null, lkind: 'start', lcode: '', lcode2: '' }) }); U.msg = 'Cleared. Start with the line.'; openRow('line'); return; }
    render(); redraw(); }

  function open(type) { css(); var s = $('msu');
    if (!s) { s = document.createElement('section'); s.id = 'msu'; s.className = 'msu'; s.setAttribute('role', 'dialog'); s.setAttribute('aria-label', 'Race set-up'); s.innerHTML = '<div class="msu-hd"><h2>Race set-up</h2><button class="btn" data-a="close" aria-label="Close the set-up">Close</button></div><div class="msu-bd"></div>'; document.body.appendChild(s);
      s.addEventListener('click', function (e) { var t = e.target.closest('[data-a]'); if (!t) return; e.preventDefault(); if (t.dataset.a === 'close') { close(); return; } act(t.dataset.a, t.dataset.v); });
      s.addEventListener('keydown', function (e) { if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA') return; var f = e.target.closest('.msu-in'), bt = f && f.querySelector('button[data-a]'); if (bt) { e.preventDefault(); bt.click(); } }); }
    if (type) setB({ type: type === 'wl' ? 'wl' : 'marks' });
    var c = $('solCard'); if (c) c.hidden = true; try { var w = window.FSSolent.stepState(); if (w && w.on) { var sb = $('solStep'); if (sb) sb.hidden = true; } } catch (e) {}
    U.on = true; s.hidden = false; document.body.classList.add('msu-on'); var k = ROWS.map(function (r) { return r[0]; }).filter(function (q) { return !done(q); })[0] || 'line'; openRow(k); }
  function close() { U.on = false; U.hot = null; var s = $('msu'); if (s) s.hidden = true; document.body.classList.remove('msu-on'); redraw(); }

  /* every chart tap comes here first while the set-up is open: no buoy cards, no other builder */
  function hook() { var prev = window.__fsTapHook; if (!prev || prev.__msu) return !!prev; var h = function (la, lo, x, y, ed) { if (U.on) return onTap(la, lo, x, y); return prev.apply(this, arguments); }; h.__msu = 1; window.__fsTapHook = h; return true; }
  (window.__fsOverlays = window.__fsOverlays || []).push(overlay);
  if (document.head) css(); else document.addEventListener('DOMContentLoaded', css);   /* from the start: the old first-race list gives way to the set-up list */
  /* the two course pictures on the Start new race card open this set-up instead of the old step-by-step builder */
  document.addEventListener('click', function (e) { var t = e.target.closest && e.target.closest('#solCardM,#solCardW'); if (!t) return; e.preventDefault(); e.stopImmediatePropagation(); open(t.id === 'solCardW' ? 'wl' : 'marks'); }, true);
  var tries = 0, hk = setInterval(function () { if (hook() || ++tries > 40) clearInterval(hk); }, 250);   /* once, at start-up: solent.js sets the tap hook as it loads */
  window.FSMarkSetup = { open: open, close: close, on: function () { return U.on; }, state: function () { return { open: U.open, end: U.end, msg: U.msg, done: ROWS.map(function (r) { return [r[0], done(r[0])]; }) }; } };
})();
