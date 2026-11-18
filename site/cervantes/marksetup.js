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
  var R = Math.PI / 180, U = { more: {}, area: 'near', choose: null, on: false, open: 'line', end: 'boat', lm: 'tap', cm: 'tap', wpick: 'w', fpick: false, msg: '', hot: null, P: null, clr: 0 };
  var ROWS = [['line', 'Start line'], ['course', 'Course'], ['finish', 'Finish'], ['wind', 'Wind, tide and routing'], ['gun', 'Gun and sequence']];
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
  function running() { try { return !!Sol().raceRun(); } catch (e) { return false; } }
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
    if (k === 'wind') { var w3 = b.wind, td = b.tide || {}; return (w3 && w3.twd != null ? 'Wind ' + d3(w3.twd) + '°T' + (w3.tws ? ' ' + w3.tws + ' kn' : '') + ' (' + (w3.src === 'typed' ? 'typed' : w3.src || 'set') + ')' : 'Wind from the forecast') + ' · tide ' + (td.mode === 'hand' ? (td.spd != null && td.dir != null ? td.spd + ' kn to ' + d3(td.dir) + '°T' : 'by hand, not given') : td.mode === 'boat' ? 'from the boat' : 'from the forecast') + ' · ' + (b.plan === 'route' ? 'routed (' + ((b.models && b.models.length ? b.models : [b.model || 'ukv']).join(', ')) + ')' : 'not routed'); }
    if (k === 'gun') { if (!b.startAt) return 'Not set'; var g = new Date(b.startAt * 1000); return 'Gun ' + ('0' + g.getHours()).slice(-2) + ':' + ('0' + g.getMinutes()).slice(-2) + ', ' + (SEQ.filter(function (q) { return q[0] === (b.seq || 5); })[0] || SEQ[0])[1]; } return ''; }

  /* ---- the chart: what the set-up draws, and where it looks ---- */
  function css() { if ($('msuCss')) return; var st = document.createElement('style'); st.id = 'msuCss';
    st.textContent = '.msu{position:fixed;left:0;right:0;bottom:0;z-index:70;margin:0 auto;max-width:620px;max-height:58vh;display:flex;flex-direction:column;background:var(--panel,#0f2235);color:var(--ink,#fff);border:2px solid #3b82f6;border-bottom:0;border-radius:16px 16px 0 0;box-shadow:0 -6px 24px rgba(0,0,0,.4);font:400 15px/1.4 var(--f-body,system-ui,sans-serif)}.msu[hidden]{display:none}' +
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
      'body.msu-on #liveBox,body.msu-on #liveBig,body.msu-on #fsPlot,body.msu-on #solSeq,body.msu-on .solrb,body.msu-on .navgrip2,body.msu-on .fswtab,body.msu-on #solPop,body.msu-on #solSide,body.msu-on #solStep,body.msu-on #solLegs,body.msu-on #solAfter,body.msu-on #solStartScr,body.msu-on .solchain,body.msu-on #solTestBar,body.msu-on #solCard,body.msu-on #solList,body.msu-on .fabhelp,body.msu-on #navStrip,body.msu-on #navPanel{display:none!important}body.msu-on #navToast,body.msu-on #busy{top:calc(env(safe-area-inset-top,0px) + 64px)!important;bottom:auto!important;max-height:30vh;overflow:hidden}' +
      '.mkfirst{display:none!important}' +
      /* the back of the boat (Stuart 21:20): every button at least 1 cm (64 px on an iPhone), the main one about 2 cm, 2 mm apart, text 18 px (Raymarine MFD practice; NN/g; Schildbach and Rukzio 2010) */
      '.msu{font-size:18px}.msu .btn{min-height:64px;font-size:18px;padding:0 16px}.msu-seg{gap:10px}.msu-seg button{min-height:56px;font-size:17px;padding:0 16px}.msu-rh{min-height:64px}.msu-rt b{font-size:19px}.msu-say{font-size:17px}' +
      '.msu-bigs{display:grid;gap:12px}.msu .msu-big{min-height:110px;width:100%;font:800 22px/1.15 var(--f-body,system-ui);letter-spacing:.02em;border-radius:16px;background:#1d4ed8;color:#fff;border:0}.msu .msu-big.set{background:#166534}' +
      '.msu-areas{display:flex;gap:10px;overflow-x:auto;padding-bottom:4px}.msu-areas button{flex:none;min-height:56px;min-width:76px;padding:0 14px;border-radius:28px;border:2px solid var(--line,#475569);background:none;color:inherit;font:700 17px var(--f-body,system-ui)}.msu-areas button[aria-pressed="true"]{background:#3b82f6;border-color:#3b82f6;color:#fff}' +
      '.msu-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.msu-grid button{min-height:72px;text-align:left;padding:8px 12px;border-radius:12px;border:2px solid var(--line,#475569);background:rgba(59,130,246,.10);color:inherit;display:grid;gap:2px;cursor:pointer}.msu-grid b{font:800 22px/1 var(--f-data,ui-monospace,monospace);color:#93c5fd}.msu-grid span{font-size:14px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}' +
      '.msu-gun{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.msu-num{font:800 30px/1 var(--f-data,ui-monospace,monospace);min-width:3.2em;text-align:center}.msu .msu-ps{min-height:56px;min-width:76px;font-size:16px}.msu .msu-x{min-height:56px;min-width:56px;font-size:22px}.msu-list li{padding:6px 8px}.msu-list li span{font-size:16px}.msu .msu-more{width:100%;background:none;border:1px dashed var(--line,#475569)}';
    document.head.appendChild(st); }
  function overlay(ctx, X, Y) {
    U.P = { X: X, Y: Y }; if (!U.on) return; var b = B(), l = line(), dpr = 1;
    var dot = function (la, lo, r, fill, stroke, lw) { ctx.beginPath(); ctx.arc(X(lo), Y(la), r, 0, 7); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.lineWidth = lw || 3; ctx.strokeStyle = stroke; ctx.stroke(); } };
    var label = function (x, y, t, col) { ctx.font = '800 13px system-ui,sans-serif'; var w = ctx.measureText(t).width + 10; ctx.fillStyle = 'rgba(8,26,46,.9)'; ctx.fillRect(x, y - 10, w, 20); ctx.fillStyle = col || '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(t, x + 5, y); };
    /* the start line: orange, committee boat end a square, pin end a circle */
    if (l.boat && l.pin) { ctx.beginPath(); ctx.moveTo(X(l.boat[1]), Y(l.boat[0])); ctx.lineTo(X(l.pin[1]), Y(l.pin[0])); ctx.lineWidth = 4 * dpr; ctx.strokeStyle = '#f59e0b'; ctx.stroke(); }
    /* each label on the outer side of its end, away from the other end, so the two never sit on each other */
    var outer = function (p, q, t, y0) { ctx.font = '800 13px system-ui,sans-serif'; var w = ctx.measureText(t).width + 10, px = X(p[1]), qx = q ? X(q[1]) : px + 1; return [qx >= px ? px - 12 - w : px + 12, Y(p[0]) + y0]; };
    if (l.boat) { var bx = X(l.boat[1]), by = Y(l.boat[0]); ctx.fillStyle = '#f59e0b'; ctx.fillRect(bx - 7, by - 7, 14, 14); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.strokeRect(bx - 7, by - 7, 14, 14); var lb = outer(l.boat, l.pin, 'Committee boat', -12); label(lb[0], lb[1], 'Committee boat'); }
    if (l.pin) { dot(l.pin[0], l.pin[1], 7, '#f59e0b', '#fff', 2); var lp = outer(l.pin, l.boat, 'Pin', 14); label(lp[0], lp[1], 'Pin'); }
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
    if (!pts.length) { var f = null; try { f = window.__fsLiveFix && window.__fsLiveFix(); } catch (e) {} c = f && f.la > 50.5 && f.la < 50.95 && f.lo > -1.75 && f.lo < -0.9 ? [f.la, f.lo] : [50.775, -1.29]; pts = [[c[0] - 0.008, c[1] - 0.013], [c[0] + 0.008, c[1] + 0.013]]; }   /* about 2.5 km across: the buoys stand apart and a tap finds the right one */
    var s = Math.min.apply(null, pts.map(function (p) { return p[0]; })), n = Math.max.apply(null, pts.map(function (p) { return p[0]; })), w = Math.min.apply(null, pts.map(function (p) { return p[1]; })), e = Math.max.apply(null, pts.map(function (p) { return p[1]; }));
    var padLa = Math.max(0.003, (n - s) * 0.18), padLo = Math.max(0.005, (e - w) * 0.18); try { window.__fsFitBox(s - padLa, n + padLa, w - padLo, e + padLo, gap()); } catch (x) {} redraw(); }
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
  function fixWind() { try { var w = B().wind; if (window.__fsFix && w && w.twd != null && w.tws > 0) window.__fsFix.set({ on: true, tws: +w.tws, twd: +w.twd }); } catch (e) {} }   /* the typed wind feeds Route's Fixed wind route, as before */
  function pushTide() { try { var t = B().tide || {}, z = null; if (t.mode === 'hand' && t.spd >= 0 && t.dir != null) z = { spd: +t.spd, dir: +t.dir, src: 'by hand' }; else if (t.mode === 'boat' && window.__navTide) { var nt = window.__navTide(); if (nt) z = { spd: nt.spd, dir: nt.dir, src: nt.src || 'the boat' }; } if (window.__fsTideHand) window.__fsTideHand(z ? { on: true, spd: +(+z.spd).toFixed(2), dir: Math.round(z.dir), src: z.src } : { on: false }); } catch (e) {} }
  /* the wind from the compass, bow to wind (the boat's own heading first), and from the two tacks (as Vakaros and Velocitek): the wind is midway */
  function headToWind() { var fin = function (h, src) { setB({ wind: { twd: Math.round(((h % 360) + 360) % 360), tws: (B().wind || {}).tws || null, src: src, at: Date.now() } }); U.msg = 'Wind from ' + d3(h) + '°T (' + src + ').'; U.good = true; render(); redraw(); };
    var dr = null; try { dr = window.__navDR && window.__navDR(); } catch (e) {} if (dr && dr.hdg != null) return fin(dr.hdg, 'the boat\'s heading');
    var got = false, onO = function (e) { var h = e.webkitCompassHeading != null ? e.webkitCompassHeading : (e.absolute && e.alpha != null ? 360 - e.alpha : null); if (h == null || got) return; got = true; off2(); fin(h, 'the phone\'s compass, magnetic'); };
    var off2 = function () { removeEventListener('deviceorientationabsolute', onO, true); removeEventListener('deviceorientation', onO, true); };
    var go = function () { addEventListener('deviceorientationabsolute', onO, true); addEventListener('deviceorientation', onO, true); setTimeout(function () { if (!got) { got = true; off2(); U.msg = 'No compass on this device: type the wind direction.'; render(); } }, 4000); };
    U.msg = 'Point the bow, and the top of the phone, into the wind.'; render();
    try { if (window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) DeviceOrientationEvent.requestPermission().then(function (r) { if (r === 'granted') go(); else { U.msg = 'Compass not allowed: type the wind direction.'; render(); } }, go); else go(); } catch (e) { go(); } }
  function tackRef(side) { var h = null, src = ''; try { var dr = window.__navDR && window.__navDR(); if (dr && dr.hdg != null) { h = dr.hdg; src = 'heading'; } } catch (e) {} if (h == null) { try { h = window.__fsCog ? window.__fsCog() : null; src = 'course over the ground'; } catch (e) {} }
    if (h == null) { U.msg = 'Needs the boat moving with the GPS on: sail close-hauled for half a minute, then tap again.'; return; }
    U.tref = U.tref || {}; U.tref[side] = Math.round(h); var s1 = U.tref.stbd, p1 = U.tref.port;
    if (s1 != null && p1 != null) { var d = ((p1 - s1 + 540) % 360) - 180, md = (s1 + d / 2 + 360) % 360; if (Math.abs(d) / 2 < 25 || Math.abs(d) / 2 > 65) { U.msg = 'The two headings are ' + Math.round(Math.abs(d)) + '° apart, not a tack: record each tack again.'; U.tref = {}; } else { setB({ wind: { twd: Math.round(md), tws: (B().wind || {}).tws || null, src: 'your two tacks (' + src + ')', at: Date.now() } }); U.msg = 'Wind from ' + d3(md) + '°T, from your two tacks.'; U.good = true; U.tref = {}; } }
    else U.msg = (side === 'stbd' ? 'Starboard' : 'Port') + ' tack: ' + d3(h) + '°. Now the other tack.'; }
  function layPin() { var b = B(), l = line(), w = b.wind; if (!l.boat) return false; var br = b.lbrg != null && b.lbrg !== '' ? +b.lbrg : w && w.twd != null ? ((w.twd - 90) % 360 + 360) % 360 : null;   /* square to the wind: the pin to port of the committee boat, looking up the wind */
    if (br == null) { U.msg = 'Give the line bearing, or the wind (in Wind, tide and routing), to lay it square to the wind.'; return false; }
    var q = off(l.boat, br, (b.llen || 300) / 1852); window.__fsSetLine('pin', q[0], q[1]); var sp = startPt(); if (sp) setB({ sk: 'line', start: sp }); U.layAfter = false; U.msg = 'Pin laid ' + (b.llen || 300) + ' m from the committee boat on ' + d3(br) + '°T' + (b.lbrg == null || b.lbrg === '' ? ', square to the wind' : '') + '.'; U.good = true; fitNow('line'); return true; }
  function useBuoy(m) { var k = U.open, b = B(); U.choose = null; U.hot = [m.lat, m.lon]; U.good = true;
    if (k === 'line') { setEnd(U.end, m.lat, m.lon, 'at buoy ' + m.id); return; }
    if (k === 'course') {
      if (b.type === 'wl') { var w = Object.assign({}, wl()); if (U.wpick === 'w') { w.wkind = 'buoy'; w.wcode = m.id; U.msg = 'Windward mark: ' + m.id + ' ' + m.name + '. Now the leeward mark.'; U.wpick = 'l'; } else if (U.wpick === 'l') { w.lkind = 'buoy'; w.lcode = m.id; U.msg = 'Leeward mark: ' + m.id + ' ' + m.name + '.'; } else if (U.wpick === 'g1') { w.lkind = 'gate'; w.lcode = m.id; U.wpick = 'g2'; U.msg = 'Gate, first buoy: ' + m.id + '. Now tap the other.'; } else { w.lkind = 'gate'; w.lcode2 = m.id; U.wpick = 'g1'; U.msg = 'Gate: ' + (w.lcode || '?') + ' and ' + m.id + '.'; } setB({ wl: w }); return; }
      var ms = (B().marks || []).slice(); ms.push({ code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon, side: 'port' }); setB({ marks: ms }); U.msg = ms.length + ': ' + m.id + ' ' + m.name + ', Port. Tap P in the list to make it Starboard.'; return; }
    if (k === 'finish') { setB({ fin: 'mark', finish: { code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon } }); U.msg = 'Finish at ' + m.id + ' ' + m.name + '.'; } }
  function onTap(la, lo, x, y) {
    var k = U.open, b = B(), hits = near(x, y); U.msg = ''; U.good = false; U.choose = null;
    var wantBuoy = (k === 'line' && U.lm === 'buoy') || k === 'course' || (k === 'finish' && b.type !== 'wl' && b.fin === 'mark');
    if (k === 'line' && !U.more.line) U.msg = 'Use the PING buttons, or open Other ways to set the line on the chart.';
    else if (k === 'line' && (U.lm === 'tap' || U.lm === 'brg')) { var tr0 = !!line().transit; if (onLand(la, lo) && !(tr0 && U.end === 'boat')) U.msg = 'That point is on land. Tap in the water.'; else { var e0 = U.lm === 'brg' ? 'boat' : U.end; if (setEnd(e0, la, lo, 'where you tapped') && U.lm === 'brg') layPin(); U.hot = null; } }
    else if (wantBuoy) { if (!hits.length) U.msg = 'No buoy there. Tap on a buoy, zoom in with two fingers, or type its code.'; else if (hits.length > 1) { U.choose = hits; U.msg = 'Buoys close together here. Which one?'; } else useBuoy(hits[0]); }
    else if (k === 'line') U.msg = U.lm === 'ping' ? 'Ping sets each end from the GPS. To use the chart, choose Tap the chart or A buoy.' : 'Type the latitude and longitude, or choose Tap the chart.';
    else if (k === 'finish' && b.type !== 'wl') U.msg = 'To finish at a buoy, choose A buoy first.';
    else U.msg = 'The chart is not needed for this step.';
    render(); redraw(); return true; }

  /* ---- the sheet ---- */
  function seg(key, cur, opts) { return '<div class="msu-seg" role="group">' + opts.map(function (o) { return '<button type="button" data-a="' + key + '" data-v="' + o[0] + '" aria-pressed="' + (String(cur) === String(o[0])) + '">' + o[1] + '</button>'; }).join('') + '</div>'; }
  function msg() { return (U.msg ? '<p class="msu-msg' + (U.good ? ' good' : '') + '" role="status">' + esc(U.msg) + '</p>' : '') + (U.choose ? '<div class="msu-seg">' + U.choose.map(function (m) { return '<button type="button" data-a="pick" data-v="' + esc(m.id) + '">' + esc(m.id + ' ' + m.name) + '</button>'; }).join('') + '</div>' : ''); }
  function doneBtn(k) { return '<div class="msu-ft">' + (valid(k) ? '<button class="btn primary msu-go" data-a="done" data-v="' + k + '">Done: tick it and go on</button>' : '<p class="msu-say">' + esc(why(k)) + '</p>') + '</div>'; }
  /* big buttons for the back of the boat (Stuart 21:20): one obvious way for each job, the rest behind Other ways */
  function more(k, label) { return '<button class="btn msu-more" data-a="more" data-v="' + k + '" aria-expanded="' + !!U.more[k] + '">' + (U.more[k] ? 'Fewer ways ▴' : (label || 'Other ways') + ' ▾') + '</button>'; }
  /* the buoy picker: no keyboard. The nearest buoys first, or an area, then the buoys as big buttons with their names */
  function areas() { var a = {}; MK().forEach(function (m) { a[/^\d/.test(m.id) ? m.id[0] : '•'] = 1; }); return Object.keys(a).sort(); }
  function nearList() { var c = mid(); if (!c) { try { var f = window.__fsLiveFix && window.__fsLiveFix(); if (f) c = [f.la, f.lo]; } catch (e) {} } var ms = B().marks || []; if (ms.length) c = [ms[ms.length - 1].lat, ms[ms.length - 1].lon]; if (!c) c = [50.775, -1.29];
    return MK().map(function (m) { return [nm(c, [m.lat, m.lon]), m]; }).sort(function (a, b) { return a[0] - b[0]; }).slice(0, 12).map(function (q) { return q[1]; }); }
  function picker(say) { var ar = U.area || 'near', list = ar === 'near' ? nearList() : MK().filter(function (m) { return (/^\d/.test(m.id) ? m.id[0] : '•') === ar; }).sort(function (a, b) { return a.id < b.id ? -1 : 1; });
    return '<p class="msu-say">' + say + '</p><div class="msu-areas">' + [['near', 'Nearest']].concat(areas().map(function (a) { return [a, a === '•' ? 'Other' : 'Area ' + a]; })).map(function (a) { return '<button type="button" data-a="area" data-v="' + a[0] + '" aria-pressed="' + (ar === a[0]) + '">' + a[1] + '</button>'; }).join('') + '</div>' +
      '<div class="msu-grid">' + list.map(function (m) { return '<button type="button" data-a="pick" data-v="' + esc(m.id) + '"><b>' + esc(m.id) + '</b><span>' + esc(m.name) + '</span></button>'; }).join('') + '</div>'; }
  function bodyLine() { var l = line(), e = U.end;
    var tr = !!l.transit, nB = tr ? 'inshore end' : 'committee boat end', nP = tr ? 'outer mark' : 'pin end';
    var h = '<p class="msu-say">Bow on the line at each end, then press. Approach slowly on your starting course; ping again before every start.</p><div class="msu-bigs"><button class="btn msu-big' + (l.boat ? ' set' : '') + '" data-a="ping" data-v="boat">' + (l.boat ? '✓ ' : '') + 'PING ' + (tr ? 'INSHORE END' : 'COMMITTEE BOAT') + '</button><button class="btn msu-big' + (l.pin ? ' set' : '') + '" data-a="ping" data-v="pin">' + (l.pin ? '✓ ' : '') + 'PING ' + (tr ? 'OUTER MARK' : 'PIN') + '</button></div>';
    h += msg() + '<div class="msu-ends"><div>' + (tr ? 'Inshore end' : 'Committee boat') + ': <span>' + (l.boat ? llTxt(l.boat) : 'not set') + '</span></div><div>' + (tr ? 'Outer mark' : 'Pin') + ': <span>' + (l.pin ? llTxt(l.pin) : 'not set') + '</span></div></div>';
    if (l.boat || l.pin) h += '<div class="msu-in">' + (lineOk() ? '<button class="btn" data-a="swap">Swap ends</button>' : '') + '<button class="btn" data-a="lclear">Clear line</button></div>';
    h += doneBtn('line') + more('line');
    if (U.more.line) {
      h += seg('kind', tr ? 'tr' : 'cb', [['cb', 'Committee boat and pin'], ['tr', 'Shore transit']]) + seg('lm', U.lm, [['tap', 'Tap the chart'], ['buoy', 'A buoy'], ['ll', 'Lat and long'], ['brg', 'Bearing and length'], ['rys', 'RYS line']]);
      if (U.lm === 'tap' || U.lm === 'buoy' || U.lm === 'll') h += seg('end', e, [['boat', (l.boat ? '✓ ' : '') + nB.charAt(0).toUpperCase() + nB.slice(1)], ['pin', (l.pin ? '✓ ' : '') + nP.charAt(0).toUpperCase() + nP.slice(1)]]);
      if (U.lm === 'tap') h += '<p class="msu-say">Tap the chart at the <b>' + (e === 'pin' ? nP : nB) + '</b>.' + (tr ? ' On a shore transit, set the inshore end on the transit as close inshore as is safe.' : '') + '</p>';
      if (U.lm === 'buoy') h += picker('Choose the buoy at the <b>' + (e === 'pin' ? nP : nB) + '</b>, or tap it on the chart.');
      if (U.lm === 'll') h += '<p class="msu-say">From the sailing instructions, for the <b>' + (e === 'pin' ? nP : nB) + '</b>.</p><div class="msu-in"><input id="msuLat" placeholder="50 46.004 N" aria-label="Latitude"><input id="msuLon" placeholder="001 18.055 W" aria-label="Longitude"><button class="btn" data-a="ll">Use</button></div>';
      if (U.lm === 'brg') { var wq = B().wind; h += '<p class="msu-say">The pin is laid from the committee boat end on this bearing and at this length. Leave the bearing empty to lay it square to the wind.</p><div class="msu-in"><input class="sm" id="msuLBrg" type="number" inputmode="numeric" min="0" max="359" placeholder="' + (wq && wq.twd != null ? 'square' : '°T') + '" value="' + (B().lbrg != null ? B().lbrg : '') + '" aria-label="Line bearing, committee boat to pin, degrees true"><label>°T</label><input class="sm" id="msuLLen" type="number" inputmode="numeric" min="20" max="3000" step="10" value="' + (B().llen || 300) + '" aria-label="Line length, metres"><label>m</label><button class="btn" data-a="brgset">' + (l.boat ? 'Lay the pin from the committee boat end' : 'Use, then tap the committee boat') + '</button></div>'; }
      if (U.lm === 'rys') h += '<p class="msu-say">The Royal Yacht Squadron line at Cowes: the flagstaff on 346°T to abeam the Williams Shipping Buoy (Rolex Fastnet Race 2025 sailing instructions 14.1 and 14.2). Check the sailing instructions for your race.</p><div class="msu-in"><button class="btn" data-a="rys">Use the RYS line</button></div>';
    }
    return h; }
  function bodyCourse() { var b = B(), h = seg('type', b.type === 'wl' ? 'wl' : 'marks', [['marks', 'Round the cans'], ['wl', 'Windward-leeward']]);
    if (b.type === 'wl') { var w = wl(), W = wlW(), L = wlL();
      h += seg('wpick', U.wpick, [['w', (W ? '✓ ' : '') + 'Windward mark'], ['l', (w.lkind && w.lkind !== 'start' && L ? '✓ ' : '') + 'Leeward mark'], ['g1', 'Leeward gate']]);
      if (U.wpick === 'l') h += '<div class="msu-in"><button class="btn" data-a="lstart">' + (w.lkind === 'start' || !w.lkind ? '✓ ' : '') + 'The start line is the leeward mark</button></div>';
      h += picker(U.wpick === 'w' ? 'Choose the windward buoy.' : U.wpick === 'l' ? 'Or choose the leeward buoy.' : 'Choose the two gate buoys, one after the other.');
      h += '<div class="msu-in"><label>Laps</label><button class="btn" data-a="lapsd" aria-label="One lap fewer">−</button><b class="msu-num">' + (w.laps || 2) + '</b><button class="btn" data-a="lapsu" aria-label="One lap more">+</button></div>' + seg('side', w.side === 'starboard' || w.side === 'stbd' ? 'starboard' : 'port', [['port', 'Leave to port'], ['starboard', 'Leave to starboard']]);
      h += msg() + doneBtn('course') + more('course');
      if (U.more.course) h += '<p class="msu-say">Windward mark by bearing and distance from the middle of the line, or tap buoys on the chart.</p><div class="msu-in"><input class="sm" id="msuBrg" type="number" inputmode="numeric" min="0" max="360" placeholder="°T" value="' + (w.wkind !== 'buoy' && w.brg != null ? w.brg : '') + '" aria-label="Bearing to the windward mark"><label>°T</label><input class="sm" id="msuDist" type="number" inputmode="decimal" step="0.1" min="0.1" placeholder="nm" value="' + (w.wkind !== 'buoy' && w.dist ? w.dist : '') + '" aria-label="Distance in nautical miles"><label>nm</label><button class="btn" data-a="wbrg">Use</button></div>';
      return h; }
    var ms = b.marks || [], prev = mid();
    if (ms.length) h += '<ol class="msu-list">' + ms.map(function (m, i) { var p = [m.lat, m.lon], leg = prev ? d3(brg(prev, p)) + '°T ' + nm(prev, p).toFixed(2) + ' nm' : ''; prev = p; var st = m.side === 'starboard' || m.side === 'stbd'; return '<li><b>' + (i + 1) + '</b><span>' + esc(m.name) + '<small>' + leg + '</small></span><button class="msu-ps' + (st ? ' s' : '') + '" data-a="ps" data-v="' + i + '" aria-label="Rounding side, tap to change">' + (st ? 'STBD' : 'PORT') + '</button><button class="msu-x" data-a="rm" data-v="' + i + '" aria-label="Remove ' + esc(m.code || m.name) + '">×</button></li>'; }).join('') + '</ol><div class="msu-in"><button class="btn" data-a="undo">Undo last</button><button class="btn" data-a="cclear">Clear course</button></div>';
    h += msg() + doneBtn('course');
    h += picker(ms.length ? 'Next buoy: each goes in as PORT; tap PORT in the list to change it.' : 'Choose the first buoy. Each goes in as PORT; tap PORT in the list to change it.');
    h += more('course', 'Type, paste or tap on the chart');
    if (U.more.course) h += '<p class="msu-say">From the committee board, the VHF or a message: codes with P or S, for example <b>4M P, 4V S, 40 P</b>. Or tap the buoys on the chart.</p><div class="msu-in"><textarea id="msuBoard" placeholder="4M P, 4V S, 40 P" autocapitalize="characters" aria-label="Course codes"></textarea><button class="btn" data-a="board" data-v="add">Add to the course</button><button class="btn" data-a="board" data-v="new">Replace the course</button></div>';
    return h; }
  function bodyFinish() { var b = B(), h;
    if (b.type === 'wl') h = seg('wfin', wl().fin || 'lee', [['lee', 'Leeward mark'], ['start', 'Start line'], ['wind', 'Windward mark']]);
    else h = seg('fin', b.fin === 'mark' ? 'mark' : 'start', [['start', 'The start line'], ['mark', 'A buoy']]) + (b.fin === 'mark' ? picker('Choose the finish buoy, or tap it on the chart.') : '');
    return h + msg() + doneBtn('finish'); }
  function models() { return [].slice.call(document.querySelectorAll('[data-m]')).filter(function (c) { return !c.disabled; }).map(function (c) { var l = c.closest('label'), t = l ? l.textContent.trim().split(/\s{2,}|\n|·|\(/)[0].trim() : c.getAttribute('data-m'); return { id: c.getAttribute('data-m'), name: t.slice(0, 18) }; }); }
  function bodyWind() { var b = B(), w = b.wind || {}, td = b.tide || {}, tm = td.mode || 'model', rt = b.plan === 'route', sel = b.models && b.models.length ? b.models : [b.model || 'ukv'];
    var h = '<p class="msu-say">The wind at the start, for the bias and the laylines. Point the bow into the wind and press, or leave it to the forecast.</p><div class="msu-bigs"><button class="btn msu-big" data-a="h2w">HEAD TO WIND: COMPASS</button></div>' +
      '<div class="msu-in"><input class="sm" id="msuTwd" type="number" inputmode="numeric" min="0" max="360" placeholder="°T" value="' + (w.src === 'typed' && w.twd != null ? w.twd : '') + '" aria-label="Wind direction, degrees true"><label>°T</label><input class="sm" id="msuTws" type="number" inputmode="decimal" min="0" max="60" placeholder="kn" value="' + (w.src === 'typed' && w.tws ? w.tws : '') + '" aria-label="Wind speed, knots"><label>kn</label><button class="btn" data-a="wind">Use</button></div>';
    h += msg() + doneBtn('wind') + more('wind', 'Tide, routing and the two tacks');
    if (U.more.wind) {
      h += '<div class="msu-in"><button class="btn" data-a="tack" data-v="stbd">On starboard tack now</button><button class="btn" data-a="tack" data-v="port">On port tack now</button><button class="btn" data-a="windfc">Use the forecast wind</button></div>' +
        '<p class="msu-say"><b>Tide</b> at the line.</p>' + seg('tm', tm, [['model', 'Forecast'], ['hand', 'By hand']].concat(window.__navTide ? [['boat', 'From the boat']] : []));
      if (tm === 'hand') h += '<div class="msu-in"><input class="sm" id="msuTdS" type="number" inputmode="decimal" min="0" max="8" step="0.1" placeholder="kn" value="' + (td.spd != null ? td.spd : '') + '" aria-label="Tide rate, knots"><label>kn, running to</label><input class="sm" id="msuTdD" type="number" inputmode="numeric" min="0" max="359" placeholder="°T" value="' + (td.dir != null ? td.dir : '') + '" aria-label="Direction the tide runs to, degrees true"><label>°T</label><button class="btn" data-a="tide">Use</button></div>';
      h += '<p class="msu-say"><b>Routing</b>: the course as a list of legs, or routed on the forecast.</p>' + seg('plan', rt ? 'route' : 'list', [['list', 'No routing'], ['route', 'Route it']]);
      if (rt) { var mm = models(); h += mm.length ? '<div class="msu-seg">' + mm.map(function (q) { return '<button type="button" data-a="model" data-v="' + esc(q.id) + '" aria-pressed="' + (sel.indexOf(q.id) >= 0) + '">' + esc(q.name) + '</button>'; }).join('') + '</div>' : '<p class="msu-say">The forecast models are still loading.</p>'; } }
    return h; }
  function bodyGun() { var b = B(), g = b.startAt ? new Date(b.startAt * 1000) : null, t = g ? ('0' + g.getHours()).slice(-2) + ':' + ('0' + g.getMinutes()).slice(-2) : '--:--';
    var h = '<p class="msu-say">The time of the gun, by this phone’s clock. Sync it to the signals in the start box.</p><div class="msu-gun"><button class="btn" data-a="gunadd" data-v="-5">−5</button><button class="btn" data-a="gunadd" data-v="-1">−1</button><b class="msu-num">' + t + '</b><button class="btn" data-a="gunadd" data-v="1">+1</button><button class="btn" data-a="gunadd" data-v="5">+5</button></div>' +
      '<div class="msu-in"><button class="btn" data-a="gunin" data-v="5">Gun in 5 min</button><button class="btn" data-a="gunin" data-v="10">Gun in 10 min</button></div>' + seg('seq', b.seq || 5, SEQ) + msg() + doneBtn('gun') + more('gun', 'Exact time');
    if (U.more.gun) h += '<div class="msu-in"><input id="msuGun" type="time" value="' + (g ? t : '') + '" aria-label="Time of the gun"><button class="btn" data-a="gun">Set</button></div>';
    return h; }
  function render() { var s = $('msu'); if (!s) return;
    if (running()) { var b0 = B(), g0 = new Date(b0.startAt * 1000);
      s.querySelector('.msu-hd h2').textContent = 'Race under way';
      s.querySelector('.msu-bd').innerHTML = '<p class="msu-say">The gun went at ' + ('0' + g0.getHours()).slice(-2) + ':' + ('0' + g0.getMinutes()).slice(-2) + '. The course is locked while you race, so a tap on the chart cannot change it.</p>' +
        ROWS.map(function (r) { return '<div class="msu-row' + (done(r[0]) ? ' ok' : '') + '"><div class="msu-rh"><span class="msu-tk" aria-hidden="true">✓</span><span class="msu-rt"><b>' + r[1] + '</b><span>' + esc(summary(r[0])) + '</span></span></div></div>'; }).join('') +
        '<div class="msu-ft"><button class="btn" data-a="edit">Edit course</button><button class="btn primary" data-a="newrace">Start new race</button><button class="btn" data-a="stop">' + (U.stopArm ? 'Tap again to stop the race' : 'Stop race') + '</button></div>' + msg() +
        '<div class="msu-ft"><button class="btn" data-a="stored">Stored races</button></div>'; return; }
    var rows = ROWS.map(function (r) { var k = r[0], ok = done(k), open = U.open === k;
      return '<div class="msu-row' + (ok ? ' ok' : '') + (open ? ' open' : '') + '"><button class="msu-rh" data-a="open" data-v="' + k + '" aria-expanded="' + open + '"><span class="msu-tk" aria-hidden="true">✓</span><span class="msu-rt"><b>' + r[1] + '</b><span>' + esc(summary(k)) + '</span></span><span class="msu-chev" aria-hidden="true">' + (open ? '▾' : '▸') + '</span></button>' +
        (open ? '<div class="msu-body">' + ({ line: bodyLine, course: bodyCourse, finish: bodyFinish, wind: bodyWind, gun: bodyGun }[k])() + '</div>' : '') + '</div>'; }).join('');
    var n = ROWS.filter(function (r) { return done(r[0]); }).length;
    s.querySelector('.msu-hd h2').textContent = 'Race set-up · ' + n + ' of ' + ROWS.length;
    s.querySelector('.msu-bd').innerHTML = rows + '<div class="msu-ft">' + (allDone() ? '<button class="btn primary msu-go" data-a="race">Show the race</button>' : '') + '<button class="btn" data-a="again">' + (U.clr ? 'Tap again to clear everything' : 'Start again') + '</button></div><div class="msu-ft"><button class="btn" data-a="stored">Stored races</button><button class="btn" data-a="test">Test mode</button></div>'; }
  function next(k) { var i = ROWS.map(function (r) { return r[0]; }).indexOf(k); for (var j = 1; j <= ROWS.length; j++) { var q = ROWS[(i + j) % ROWS.length][0]; if (!done(q)) return q; } return null; }
  function openRow(k) { U.open = k; U.msg = ''; U.hot = null; if (k === 'line') { var l = line(); U.end = !l.boat ? 'boat' : !l.pin ? 'pin' : U.end; } render(); var bd = document.querySelector('#msu .msu-bd'); if (bd) bd.scrollTop = 0; fitNow(k); }
  function act(a, v) { var b = B(), l = line(), val = function (id) { var e = $(id); return e ? e.value.trim() : ''; }; U.msg = ''; U.good = false; if (a !== 'again') U.clr = 0;
    if (a === 'open') { openRow(U.open === v ? null : v); return; }
    if (a !== 'stop') U.stopArm = 0;
    if (a === 'more') { U.more[v] = !U.more[v]; if (v === 'line' && U.more.line && U.lm === 'ping') U.lm = 'tap'; render(); return; }
    if (a === 'area') { U.area = v; render(); return; }
    if (a === 'lapsd' || a === 'lapsu') { var lp0 = Math.max(1, Math.min(6, (wl().laps || 2) + (a === 'lapsu' ? 1 : -1))); setB({ wl: Object.assign({}, wl(), { laps: lp0 }) }); U.msg = lp0 + ' laps.'; U.good = true; render(); redraw(); return; }
    if (a === 'gunadd' || a === 'gunin') { var base = a === 'gunin' || !B().startAt ? Math.ceil(Date.now() / 60000) * 60 : B().startAt, ep0 = a === 'gunin' ? base + (+v) * 60 : base + (+v) * 60; if (!B().startAt && a === 'gunadd') ep0 = Math.ceil(Date.now() / 60000) * 60 + Math.max(1, 10 + (+v)) * 60; if (ep0 < Date.now() / 1000 + 30) ep0 = Math.ceil(Date.now() / 60000) * 60 + 60; setB({ startAt: ep0, seq: B().seq || 5, pp: false, ended: null }); try { window.__fsGun && window.__fsGun(ep0); } catch (e) {} var gq = new Date(ep0 * 1000); U.msg = 'Gun at ' + ('0' + gq.getHours()).slice(-2) + ':' + ('0' + gq.getMinutes()).slice(-2) + '.'; U.good = true; render(); redraw(); return; }
    if (a === 'edit') { close(); try { Sol().showList(); } catch (e) {} return; }
    if (a === 'newrace') { try { Sol().newRace(); } catch (e) {} U.msg = 'The last race is filed. Set up the next one: the line and the wind are kept.'; U.good = true; render(); redraw(); return; }
    if (a === 'stop') { if (!U.stopArm) { U.stopArm = 1; render(); setTimeout(function () { U.stopArm = 0; if (U.on) render(); }, 4000); return; } U.stopArm = 0; close(); try { Sol().stopRace(); } catch (e) {} return; }
    if (a === 'stored') { close(); try { if (window.__fsStoredRaces) window.__fsStoredRaces(); } catch (e) {} return; }
    if (a === 'test') { close(); try { Sol().test(true); } catch (e) {} return; }
    if (a !== 'pick') U.choose = null;
    if (a === 'pick') { var pm = byCode(v); if (pm) useBuoy(pm); }
    else if (a === 'lm') U.lm = v; else if (a === 'end') U.end = v; else if (a === 'cm') U.cm = v; else if (a === 'wpick') U.wpick = v;
    else if (a === 'done') { setSu(v, 1); var nx = next(v); openRow(nx); if (!nx) { U.msg = ''; } redraw(); return; }
    else if (a === 'lcode') { var m = byCode(val('msuCode')); if (!m) U.msg = 'No buoy with the code ' + (val('msuCode') || '(none)') + '.'; else { setEnd(U.end, m.lat, m.lon, 'at buoy ' + m.id); U.hot = [m.lat, m.lon]; fitNow('line'); } }
    else if (a === 'll') { var la = parseLL(val('msuLat'), true), lo = parseLL(val('msuLon'), false); if (la == null || lo == null) U.msg = 'Type the latitude and longitude, for example 50 46.004 N and 001 18.055 W.'; else { setEnd(U.end, la, lo, 'from the figures typed'); fitNow('line'); } }
    else if (a === 'ping') { try { window.__fsPing && window.__fsPing(v); } catch (e) {} setTimeout(function () { var l2 = line(); if (l2[v]) { var sp = startPt(); if (sp) setB({ sk: 'line', start: sp }); U.msg = (v === 'pin' ? 'Pin end' : 'Committee boat end') + ' pinged.'; U.good = true; } else U.msg = 'No GPS position yet, so nothing was saved. Wait for the GPS, then ping again.'; render(); redraw(); fitNow('line'); }, 400); return; }
    else if (a === 'rys') { var fb = [50.766733, -1.300917], q = off(fb, 346, 2290 / 1852); window.__fsSetLine('boat', fb[0], fb[1]); window.__fsSetLine('pin', q[0], q[1]); var sp = startPt(); setB({ sk: 'line', start: sp }); U.msg = 'RYS line set. Check it against the sailing instructions for your race.'; U.good = true; fitNow('line'); }
    else if (a === 'kind') { try { window.__fsLineKind && window.__fsLineKind(v === 'tr'); } catch (e) {} U.msg = v === 'tr' ? 'Shore transit: the inshore end is on the transit ashore or close inshore, the outer end is the outer distance mark.' : 'Committee boat and pin.'; U.good = true; }
    else if (a === 'brgset') { var lb = val('msuLBrg'), ll = Math.max(20, Math.min(3000, Math.round(+val('msuLLen') || 300))); setB({ lbrg: lb === '' ? null : ((Math.round(+lb) % 360) + 360) % 360, llen: ll }); if (line().boat) layPin(); else { U.lm = 'brg'; U.end = 'boat'; U.layAfter = true; U.msg = 'Now tap the chart at the committee boat end; the pin is laid from it.'; } }
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
    else if (a === 'wind') { var twd = +val('msuTwd'), tws = val('msuTws') === '' ? null : +val('msuTws'); if (!(twd >= 0 && twd <= 360)) U.msg = 'Type the wind direction, 0 to 360°T.'; else { setB({ wind: { twd: Math.round(twd) % 360, tws: tws > 0 ? tws : null, src: 'typed', at: Date.now() } }); fixWind(); U.msg = 'Wind ' + d3(twd) + '°T' + (tws > 0 ? ' ' + tws + ' kn' : '') + '.'; U.good = true; } }
    else if (a === 'h2w') { headToWind(); return; }
    else if (a === 'tack') { tackRef(v); }
    else if (a === 'tm') { setB({ tide: Object.assign({}, b.tide, { mode: v }) }); pushTide(); }
    else if (a === 'tide') { var sp = +val('msuTdS'), dr = +val('msuTdD'); if (!(sp >= 0 && sp <= 8) || !(dr >= 0 && dr < 360) || val('msuTdS') === '' || val('msuTdD') === '') U.msg = 'Give the rate in knots and the direction it runs to, 0 to 359°T.'; else { setB({ tide: { mode: 'hand', spd: sp, dir: Math.round(dr) } }); pushTide(); U.msg = 'Tide ' + sp + ' kn running to ' + d3(dr) + '°T.'; U.good = true; } }
    else if (a === 'plan') setB({ plan: v === 'route' ? 'route' : 'list' });
    else if (a === 'model') { var cur = (b.models && b.models.length ? b.models : [b.model || 'ukv']).slice(), ix = cur.indexOf(v); if (ix >= 0) { if (cur.length > 1) cur.splice(ix, 1); } else cur.push(v); setB({ models: cur, model: cur[0] }); }
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
    if (!U.on) { try { U.follow = window.__navFollow ? window.__navFollow() : null; if (U.follow) window.__navFollow(false); } catch (e) {} }   /* the chart holds still while the crew sets up: following the boat stops, and comes back on Close */
    U.on = true; s.hidden = false; document.body.classList.add('msu-on'); var k = ROWS.map(function (r) { return r[0]; }).filter(function (q) { return !done(q); })[0] || 'line'; openRow(k); }
  function close() { if (U.on && U.follow) { try { window.__navFollow(true); } catch (e) {} U.follow = null; } U.on = false; U.hot = null; var s = $('msu'); if (s) s.hidden = true; document.body.classList.remove('msu-on'); redraw(); }

  /* every chart tap comes here first while the set-up is open: no buoy cards, no other builder */
  function hook() { var prev = window.__fsTapHook; if (!prev || prev.__msu) return !!prev; var h = function (la, lo, x, y, ed) { if (U.on && !running()) return onTap(la, lo, x, y); return prev.apply(this, arguments); }; h.__msu = 1; window.__fsTapHook = h; return true; }
  (window.__fsOverlays = window.__fsOverlays || []).push(overlay);
  if (document.head) css(); else document.addEventListener('DOMContentLoaded', css);   /* from the start: the old first-race list gives way to the set-up list */
  /* the two course pictures on the Start new race card open this set-up instead of the old step-by-step builder */
  document.addEventListener('click', function (e) { var t = e.target.closest && e.target.closest('#solCardM,#solCardW'); if (!t) return; e.preventDefault(); e.stopImmediatePropagation(); open(t.id === 'solCardW' ? 'wl' : 'marks'); }, true);
  var tries = 0, hk = setInterval(function () { if (hook() || ++tries > 40) clearInterval(hk); }, 250);   /* once, at start-up: solent.js sets the tap hook as it loads */
  window.FSMarkSetup = { open: open, close: close, on: function () { return U.on; }, state: function () { return { open: U.open, end: U.end, msg: U.msg, done: ROWS.map(function (r) { return [r[0], done(r[0])]; }) }; } };
})();
