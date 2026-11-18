/* FirstShift Route and Route+: Solent race marks and the Solent race builder (Stuart 15 Nov 2026, job J).
   Stuart, 08:24: "add this to both tools route and navigate with an on off button in settings under charts so when racing in Solent it
   can be used. Have a racing in Solent button in charts which creates a Solent racing drop down that gives a build a Solent race tool
   that allows you to pick a start line point of mark on the chart then build the course using the marks inc port and starboard also give
   option for a windward leeward course with a windward mark either a buoy or a compass heading and distance. Once built the course can be
   routed as normal giving all relevant data as the normal routing software a box allowing min depth should also be relevant."
   08:26: "the Solent race took can use mark downloads or build on screen of course once the Solent marks have been switched on".
   The marks: JOG / SCRA "Solent Area Mark Codes 2026" (list dated 23 February 2026), in ../courses/solent-marks.json. */
(function () {
  /* FirstShift Solent only (Stuart 16 Nov 19:35): Route and Route+ have no Solent screens, marks or settings */
  /* F44 (Stuart 18 Nov 07:29 and 15:25): Route and Route+ now run Mark's start kit from this file (start sequence, start screen, race buttons,
     flags, start maths, coach), and nothing else: no Solent marks, course builder, cards or settings. ROUTE says which. */
  var ROUTE = !window.FS_SOLENT, KIT = !!window.FS_MARK || ROUTE;
  if (ROUTE) { window.FSSolent = { isOn: function () { return false; }, stepState: function () { return { on: false }; }, marks: function () { return null; }, on: function () {}, step: function () {}, start: function () {}, windRef: function () { return null; } }; }
  'use strict';
  var R = Math.PI / 180, KEY = ROUTE ? 'fs-route-solent-off' : 'fs-solent', BKEY = ROUTE ? 'fs-route-start' : 'fs-solent-b';
  function ld(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function INK() { var r = document.documentElement, cs = getComputedStyle(r); var v = (cs.getPropertyValue('--ink') || '').trim(); return v || '#0f172a'; }
  function sv(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function $(id) { return document.getElementById(id); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var C = ld(KEY, { on: false }), MK = null, BY = {}, SRC = null, NOTE = null, last = null, pick = null;
  var B = ld(BKEY, null) || { type: 'marks', name: 'Solent race', start: null, marks: [], fin: 'start', finish: null, wl: { wkind: 'brg', wcode: '', brg: null, dist: 1.5, laps: 2, lkind: 'start', lcode: '', side: 'port' } };
  var QUIET = false, PT = null;
  /* test mode left running when the app closed (Stuart 17 Nov 14:56): put the race back as it was before test mode, so the practice race is not
     kept as your own and the first card opens as usual */
  (function () { var ts = ld('fs-solent-testsave', null); if (!ts) return; try { localStorage.removeItem('fs-solent-testsave'); } catch (e) {} if (ts.B) { B = ts.B; sv(BKEY, B); }
    var put = function (n) { if (!window.__fsSetLine) { if (n < 40) setTimeout(function () { put(n + 1); }, 250); return; } ['boat', 'pin'].forEach(function (e) { var a = ts.line && ts.line[e]; window.__fsSetLine(e, a ? a[0] : null, a ? a[1] : null); }); }; put(0); })();
  function saveB() { if (!QUIET) B.at = Date.now(); sv(BKEY, B); if (!QUIET && window.__fsBcPush) { clearTimeout(PT); PT = setTimeout(function () { try { window.__fsBcPush(); } catch (e) {} }, 1500); } }   /* M3: every change goes to the crew on the boat code */
  function share() { var l = window.__fsLine ? window.__fsLine() : {}; return { at: B.at || 0, b: B, line: { boat: l.boat || null, pin: l.pin || null, transit: !!l.transit } }; }
  function applyRemote(o) { if (!o || !o.b || !(o.at > (B.at || 0))) return false; var prevShown = B.shown; QUIET = true; try { B = o.b; B.at = o.at; sv(BKEY, B);
      var L = o.line || {}; if (window.__fsSetLine) ['boat', 'pin'].forEach(function (k) { var q = L[k], cur = (window.__fsLine() || {})[k]; if (q && (!cur || cur[0] !== q[0] || cur[1] !== q[1])) window.__fsSetLine(k, q[0], q[1]); else if (!q && cur) window.__fsSetLine(k, null); });
      if (window.__fsLineKind) window.__fsLineKind(!!L.transit); if (o.b.shown && o.b.shown !== prevShown) { var keep = B.plan; B.plan = 'list'; go(true); B.plan = keep; sv(BKEY, B); }   /* the course the crew mate showed is shown here too (as a list; Route it stays one tap away) */
      if (WZ.on) wzRender(); if ($('solSheet') && !$('solSheet').hidden) render(); redraw(); } finally { QUIET = false; } toast('Updated by the crew on the boat code.'); return true; }
  function redraw() { try { if (window.__fsRedraw) window.__fsRedraw(); } catch (e) {} }
  function toast(t) { try { if (window.NavToast) return window.NavToast(t); } catch (e) {} var b = $('busy'); if (b) { b.textContent = t; b.hidden = false; setTimeout(function () { if (b.textContent === t) { b.textContent = ''; b.hidden = true; } }, 4000); } }

  /* ---- the marks ---- */
  function load() {
    if (MK || load.p) return load.p || Promise.resolve(MK);
    load.p = fetch('../courses/solent-marks.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
      MK = d.marks; SRC = d.source; NOTE = d.note; BY = {}; MK.forEach(function (m) { BY[m.id] = m; }); load.p = null; redraw(); return MK;
    }).catch(function () { load.p = null; return null; });
    return load.p;
  }
  function mark(code) { return BY[String(code || '').trim().toUpperCase()] || null; }
  var COLS = { Y: ['#facc15'], R: ['#dc2626'], G: ['#16a34a'], B: ['#111827'], RW: ['#dc2626', '#ffffff'], BY: ['#111827', '#facc15'], YB: ['#facc15', '#111827'], BYB: ['#111827', '#facc15', '#111827'], YBY: ['#facc15', '#111827', '#facc15'] };
  var COLN = { Y: 'yellow', R: 'red', G: 'green', B: 'black', RW: 'red and white', BY: 'black over yellow (north cardinal)', YB: 'yellow over black (south cardinal)', BYB: 'black, yellow, black (east cardinal)', YBY: 'yellow, black, yellow (west cardinal)' };
  function flagText(f) { return f === 'pass' ? 'For passing and keeping boats out of the channel, not for ordinary rounding.' : f === 'consent' ? 'Only with prior consent of KHM, sought in weekday office hours.' : f === 'sunday' ? 'Sundays: SBSC only, except Cowes Week.' : ''; }
  function dot(ctx, x, y, r, col) {
    var c = COLS[col] || ['#facc15'], n = c.length;
    for (var i = 0; i < n; i++) { ctx.beginPath(); ctx.fillStyle = c[i]; ctx.rect(x - r, y - r + 2 * r * i / n, 2 * r, 2 * r / n + 0.5); ctx.save(); ctx.clip(); ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill(); ctx.restore(); }
    ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.stroke();
  }
  function overlay(ctx, X, Y, editing) {
    last = { X: X, Y: Y };
    if (!C.on && !pick && !builderOpen()) return; if (!MK) { load(); return; }
    var pxnm = Math.abs(Y(50.8) - Y(50.8 + 1 / 60)); if (pxnm < 1.2) return;
    var r = pxnm > 40 ? 6 : pxnm > 12 ? 5 : 3.5, code = pxnm > 9, name = pxnm > 45, used = usedCodes();
    ctx.font = '400 10px system-ui, sans-serif'; ctx.textBaseline = 'middle';   /* Stuart 16 Nov 07:47: "Very faded buoy number and name very faint as you touch them": faint, small; the buoy touched, and the course's own, in full */
    var oncourse = {}; try { var cc = window.__navCourse && window.__navCourse(); if (cc) [cc.start].concat(cc.marks || []).concat([cc.finish]).forEach(function (q) { var k = /^(?:Start, |Finish, )?(\d[0-9A-Z]) /.exec((q && q.name) || ''); if (k) oncourse[k[1]] = 1; }); } catch (e) {}
    var dim = !!window.FS_MARK && Object.keys(oncourse).length > 0 && !pick && !builderOpen() && !window.__fsMarkPicking;   /* Mark (16 Nov 23:50): with a course on the chart, the other buoys step back */
    MK.forEach(function (m) {
      var x = X(m.lon), y = Y(m.lat), back = dim && !oncourse[m.id] && !used[m.id]; if (back) ctx.globalAlpha = 0.3; dot(ctx, x, y, used[m.id] ? r + 2 : back ? r * 0.7 : r, m.col); if (back) { ctx.globalAlpha = 1; return; }
      if (oncourse[m.id] && !used[m.id]) return;   /* the course already labels its own marks */
      if (used[m.id]) { ctx.beginPath(); ctx.arc(x, y, r + 5, 0, 2 * Math.PI); ctx.lineWidth = 2; ctx.strokeStyle = '#2563eb'; ctx.stroke(); }
      if (!code) return; var osm = !!(window.__fsChartOn && window.__fsChartOn('cmarks')), t = m.id + (name && (!osm || used[m.id] || m.id === HOT) ? ' ' + m.name : '');   /* M22 (Stuart 17 Nov 06:14 photo): with the OpenSeaMap buoys on, their names are already on the chart, so the Solent code sits on the left and the name only shows when tapped */
      ctx.fillStyle = INK(); ctx.globalAlpha = used[m.id] || m.id === HOT ? 1 : osm ? 0.75 : 0.3; if (osm && !(used[m.id] || m.id === HOT)) { ctx.textAlign = 'right'; ctx.fillText(t, x - r - 3, y); ctx.textAlign = 'left'; } else ctx.fillText(t, x + r + 3, y); ctx.globalAlpha = 1;   /* plain text, no halo (Stuart 15 Nov 17:52): white on the dark screen, dark on the light one, red at night */
    });
    if (HOT && BY[HOT]) { var hm = BY[HOT], hx = X(hm.lon), hy = Y(hm.lat); ctx.save(); ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hx, hy, r + 7, 0, 2 * Math.PI); ctx.stroke(); ctx.globalAlpha = 0.45; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx, hy, r + 13, 0, 2 * Math.PI); ctx.stroke(); ctx.restore(); }   /* M21 (Stuart 17 Nov 06:14): a picked buoy has a halo round it */
    if (builderOpen() || pick) drawPlan(ctx, X, Y);
    try { extras(ctx, X, Y); } catch (e) {}
  }
  function usedCodes() { var u = {}; if (!builderOpen() && !pick) return u; (B.marks || []).forEach(function (m) { if (m.code) u[m.code] = 1; }); if (B.start && B.start.code) u[B.start.code] = 1; if (B.wl.wcode) u[B.wl.wcode.toUpperCase()] = 1; return u; }
  function drawPlan(ctx, X, Y) {
    var c = build(true); if (!c || !c.start) return; var p = [c.start].concat(c.marks).concat(c.finish ? [c.finish] : []);
    ctx.beginPath(); p.forEach(function (q, i) { var x = X(q.lon), y = Y(q.lat); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.strokeStyle = '#2563eb'; ctx.stroke(); ctx.setLineDash([]);
    if (pick === 'chain' || (WZ.on && B.type !== 'wl')) { ctx.font = '700 12px system-ui, sans-serif'; ctx.textBaseline = 'middle'; c.marks.forEach(function (q, i) { var x = X(q.lon), y = Y(q.lat); ctx.fillStyle = '#2563eb'; ctx.beginPath(); ctx.arc(x - 12, y - 12, 9, 0, 2 * Math.PI); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), x - 12, y - 12); ctx.textAlign = 'left'; }); }   /* numbered while building on the map */
    var s = c.start; ctx.beginPath(); ctx.moveTo(X(s.lon) - 7, Y(s.lat) - 7); ctx.lineTo(X(s.lon) + 7, Y(s.lat) - 7); ctx.lineTo(X(s.lon), Y(s.lat) + 6); ctx.closePath(); ctx.fillStyle = '#2563eb'; ctx.fill();
  }
  function hit(x, y) {
    if (!MK || !last) return null; var best = null, bd = 22;
    MK.forEach(function (m) { var d = Math.hypot(last.X(m.lon) - x, last.Y(m.lat) - y); if (d < bd) { bd = d; best = m; } });
    return best;
  }
  var HOT = null;   /* the buoy last touched: its label shown in full until its card closes */
  function hot(id) { HOT = id; redraw(); }
  function showMark(m, tx, ty) {
    css(); hot(m.id);   /* css(): the card had no styles until the builder had been opened, so on a phone it sat below the screen */
    var p = $('solPop'); if (!p) { p = document.createElement('div'); p.id = 'solPop'; p.className = 'solpop'; p.setAttribute('role', 'dialog'); document.body.appendChild(p); }
    p.innerHTML = '<button class="close" aria-label="Close">×</button><b><span class="solsym" style="background:' + (COLS[m.col] || ['#facc15'])[0] + '"></span>' + esc(m.id) + ' ' + esc(m.name) + '</b><span>' + esc(COLN[m.col] || m.col) + ' · ' + m.zone + '</span><span>' + ddm(m.lat, 'N', 'S') + ' ' + ddm(m.lon, 'E', 'W') + '</span>' + (m.flag ? '<span class="soln">' + esc(flagText(m.flag)) + '</span>' : '') + '<span class="soln">JOG / SCRA Solent mark list 2026</span>';
    p.hidden = false; p.querySelector('.close').onclick = function () { p.hidden = true; hot(null); };
    if (tx != null) { p.classList.add('solnear'); var pw = p.offsetWidth || 260, ph = p.offsetHeight || 100, W = innerWidth, H = innerHeight, top = ty + 22; if (top + ph > H - 8) top = ty - 22 - ph; p.style.left = Math.max(8, Math.min(W - pw - 8, tx - pw / 2)) + 'px'; p.style.top = Math.max(60, top) + 'px'; } else { p.classList.remove('solnear'); p.style.left = ''; p.style.top = ''; }   /* M21: the name drops down beside the buoy tapped */
    clearTimeout(showMark.t); showMark.t = setTimeout(function () { p.hidden = true; hot(null); }, 9000);
  }
  function ddm(v, pos, neg) { var a = Math.abs(v), d = Math.floor(a), mn = (a - d) * 60; return (d < 10 && pos === 'E' ? '00' : d < 100 && pos === 'E' ? '0' : '') + d + '° ' + mn.toFixed(2) + "' " + (v >= 0 ? pos : neg); }
  function tapHook(la, lo, x, y, editing) {
    if (BV.on) { BV.on = false; if (BV.box) { BV.box = false; wzRender(); } redraw(); return true; }   /* the bias picture: a tap on the chart puts it away and brings the step box back */
    if (ROUTE) { try { return !!(window.__fsKitTap && window.__fsKitTap(la, lo)); } catch (e) { return false; } }   /* F44: in Route only the start line taps */
    if (CE.i != null) { var mce = hit(x, y); if (mce) sidePop(mce, x, y); else if (window.__fsOnLand && window.__fsOnLand(la, lo)) toast('That point is on land: tap in the water.'); else ceUse({ id: null, name: 'Waypoint ' + llTxt([la, lo]), lat: la, lon: lo, wp: true }, null); return true; }   /* Stuart 13:20: a waypoint anywhere, as well as buoys */   /* a course change in hand (13:12) */
    if (WZ.on && !editing) { var wr = wzTap(la, lo, x, y); if (wr) return true; }
    if (pick === 'chain') { var mc = hit(x, y); if (mc) sidePop(mc, x, y); else toast('Tap one of the Solent buoys.'); return true; }
    if (pick) { var m = hit(x, y); pickDone(m ? { code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon } : { code: null, name: 'Point ' + la.toFixed(4) + ', ' + lo.toFixed(4), lat: la, lon: lo }); return true; }
    if (editing || !C.on) return false;
    var m2 = hit(x, y); if (m2) { showMark(m2, x, y); return true; }
    return false;
  }

  /* ---- building the course ---- */
  function toPt(m, side) { if (side === 'stbd') side = 'starboard'; var o = { name: m.code ? m.code + ' ' + (BY[m.code] ? BY[m.code].name : '') : m.name, lat: m.lat, lon: m.lon }; if (side) o.side = side; if (m.gate) { o.gate = m.gate; o.name = m.name; } return o; }
  function fromCode(code, side) { var m = mark(code); return m ? { code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon, side: side || 'port' } : null; }
  function offset(p, brg, nm) { return { lat: p.lat + nm * Math.cos(brg * R) / 60, lon: p.lon + nm * Math.sin(brg * R) / (60 * Math.cos(p.lat * R)) }; }
  function windward() {
    var w = B.wl; if (w.wkind === 'buoy') { var m = mark(w.wcode); return m ? { code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon } : null; }
    if (w.wkind === 'pt') return w.wpt ? { code: w.wpt.code || null, name: w.wpt.name || 'Windward mark', lat: w.wpt.lat, lon: w.wpt.lon } : null;   /* a tapped or pinged point (18:40) */
    if (!B.start || !(w.brg >= 0 && w.brg <= 360) || !(w.dist > 0)) return null; var q = offset(B.start, w.brg, w.dist); return { code: null, name: 'Windward mark', lat: q.lat, lon: q.lon };   /* 21:33: the bearing and distance are in the course list, not in the name */
  }
  function gpt(i) { var w = B.wl, p = w['g' + i], m = mark(i === 1 ? w.lcode : w.lcode2); if (p) return { lat: p.lat, lon: p.lon, short: p.code || p.short || (i === 1 ? 'A' : 'B') }; return m ? { lat: m.lat, lon: m.lon, short: m.id } : null; }
  function leeward() { var w = B.wl;
    if (w.lkind === 'gate') { var g1 = gpt(1), g2 = gpt(2); if (!g1 || !g2) return null; return { code: null, name: 'Leeward gate ' + g1.short + ' and ' + g2.short, lat: (g1.lat + g2.lat) / 2, lon: (g1.lon + g2.lon) / 2, gate: { a: [g1.lat, g1.lon], b: [g2.lat, g2.lon] } }; }   /* J3: a gate of two buoys; round either. 18:40: or any two points, tapped or pinged */
    if (w.lkind === 'pt') return w.lpt ? { code: null, name: w.lpt.name || 'Leeward mark', lat: w.lpt.lat, lon: w.lpt.lon } : null;
    if (w.lkind === 'buoy') { var m = mark(w.lcode); return m ? { code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon } : null; } return B.start ? { code: B.start.code, name: 'Leeward mark (start line)', lat: B.start.lat, lon: B.start.lon } : null; }
  function build(soft) {
    if (!B.start) return soft ? null : { err: 'Choose the start: tap Start, then a mark or a point on the chart.' };
    var marks = [], fin;
    if (B.type === 'wl') {
      var W = windward(), L = leeward(); if (!W) return soft ? { start: B.start, marks: [] } : { err: B.wl.wkind === 'buoy' ? 'Type the code of the windward buoy (for example 3G).' : 'Give the windward mark a compass heading (0 to 360°T) and a distance in nm, or use the forecast wind.' };
      if (!L) return soft ? null : { err: B.wl.lkind === 'gate' ? 'Type the codes of both gate buoys.' : 'Type the code of the leeward buoy.' };
      var n = Math.max(1, Math.min(6, Math.round(B.wl.laps || 1)));
      var fk = B.wl.fin || 'lee';   /* J3: finish at the leeward mark or gate, at the start line, or at the windward mark */
      if (fk === 'wind') { for (var i = 0; i < n; i++) { if (i) marks.push(toPt(L, B.wl.side)); if (i < n - 1) marks.push(toPt(W, B.wl.side)); } fin = toPt(W); fin.name = 'Finish, ' + W.name; }
      else { for (var j = 0; j < n; j++) { marks.push(toPt(W, B.wl.side)); if (j < n - 1 || fk === 'start') marks.push(toPt(L, B.wl.side)); } if (fk === 'start') { fin = toPt(B.start); fin.name = 'Finish, start line'; } else { fin = toPt(L); fin.name = 'Finish, ' + L.name; delete fin.gate; } }
    } else {
      marks = (B.marks || []).map(function (m) { return toPt(m, m.side || 'port'); });
      if (!marks.length && !soft) return { err: 'Add at least one mark: type the codes from the course board, or tap Add mark and then the mark on the chart.' };
      fin = B.fin === 'mark' && B.finish ? toPt(B.finish) : toPt(B.start); fin.name = 'Finish, ' + (B.fin === 'mark' && B.finish ? B.finish.name : 'start line');
    }
    var st = toPt(B.start); st.name = 'Start, ' + B.start.name;
    return { name: (B.name || 'Solent race').slice(0, 60), start: st, marks: marks, finish: fin };
  }
  /* the course board: codes with p or s (or red/green), e.g. "3G p, 4F s, 2B" (port when not given) */
  function parseBoard(t) {
    var out = [], bad = [];
    String(t || '').toUpperCase().replace(/[,;\/]+/g, ' ').split(/\s+/).filter(Boolean).forEach(function (tok, i, all) {
      if (/^(P|S|PORT|STBD|STARBOARD|RED|GREEN|R|G|\(P\)|\(S\))$/.test(tok)) { var lastM = out[out.length - 1]; if (lastM) lastM.side = /^(S|STBD|STARBOARD|GREEN|G|\(S\))$/.test(tok) ? 'starboard' : 'port'; return; }
      var m = /^(\d[0-9A-Z])[-(.:]?(P|S)?\)?[.:]?$/.exec(tok); if (!m) return;   /* a pasted VHF, SMS or WhatsApp message: words are passed over, only mark codes count */
      var k = fromCode(m[1], m[2] === 'S' ? 'starboard' : 'port'); if (k) out.push(k); else bad.push(m[1]);
    });
    return { marks: out, bad: bad };
  }

  /* ---- the builder sheet ---- */
  function builderOpen() { var s = $('solSheet'), w = $('solStep'); return !!(s && !s.hidden) || !!(w && !w.hidden); }
  function css() {
    if ($('solCss')) return; var st = document.createElement('style'); st.id = 'solCss';
    st.textContent = '.solpop{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 90px);z-index:60;max-width:min(92vw,360px);background:var(--bg,#fff);color:var(--ink,#0f172a);border:1px solid var(--line,#cbd5e1);border-radius:12px;padding:10px 34px 10px 12px;box-shadow:0 4px 18px rgba(0,0,0,.3);display:flex;flex-direction:column;gap:2px;font-size:13px}.solpop[hidden]{display:none}.solpop .close{position:absolute;right:6px;top:4px}.solpop .soln{color:var(--muted,#64748b);font-size:12px}.solpop.solnear{transform:none;bottom:auto}.solpop .solsym{display:inline-block;width:12px;height:12px;border-radius:50%;border:1px solid rgba(0,0,0,.6);vertical-align:-1px;margin-right:6px}' +
      '.solpick{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 64px);z-index:61;background:#1d4ed8;color:#fff;border-radius:22px;padding:8px 8px 8px 16px;display:flex;gap:10px;align-items:center;font-size:14px;box-shadow:0 4px 14px rgba(0,0,0,.35);max-width:94vw}.solpick button{background:#fff;color:#1d4ed8;border:0;border-radius:16px;padding:6px 12px;font-weight:600}' +
      '.solrow{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:4px 0;border-bottom:1px solid var(--line,#e2e8f0)}.solrow b{min-width:0;flex:1 1 140px}.solrow select{max-width:130px}.solrow .btn{padding:4px 9px}.soltxt{width:100%;min-height:44px;font:inherit;box-sizing:border-box}.solerr{color:#b91c1c;font-weight:600}.soltab{border-collapse:collapse;width:100%;font-size:13px;font-variant-numeric:tabular-nums}.soltab th,.soltab td{text-align:left;padding:3px 6px;border-bottom:1px solid var(--line,#e2e8f0)}.soltab td:nth-child(3),.soltab td:nth-child(4){text-align:right}';
    st.textContent += '.solchain{position:fixed;left:max(8px,env(safe-area-inset-left,0px));right:max(8px,env(safe-area-inset-right,0px));bottom:calc(env(safe-area-inset-bottom,0px) + 8px);z-index:62;background:var(--panel,#fff);color:var(--ink,#000);border:2px solid #1d4ed8;border-radius:14px;padding:8px 10px;display:flex;flex-direction:column;gap:6px;box-shadow:0 4px 16px rgba(0,0,0,.35);max-width:720px;margin:0 auto}.solchain[hidden]{display:none}.solcl{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.solcn{margin-left:auto;font-size:12px;color:var(--muted,#667)}' +
      '.solchips{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px}.solchip{flex:none;min-height:34px;padding:0 10px;border-radius:17px;border:1px solid var(--line,#ccc);background:none;color:var(--ink,#000);font:700 13px var(--f-data,monospace)}.solchip.port{border-color:#dc2626;color:#dc2626}.solchip.stbd{border-color:#16a34a;color:#16a34a}' +
      '.solside{position:fixed;z-index:66;width:270px;background:var(--panel,#fff);color:var(--ink,#000);border:1px solid var(--line,#ccc);border-radius:12px;padding:8px 10px;box-shadow:0 4px 14px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:6px}.solside[hidden]{display:none}.solside .btn{min-height:42px}' +
      '.sollq{width:100%;min-height:44px;font-size:16px;padding:0 10px;border-radius:9px;border:1px solid var(--line,#ccc);background:var(--bg,#fff);color:var(--ink,#000)}.solla{margin:10px 0 4px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,#667)}.sollr{display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--line,#e2e8f0)}.sollr b{width:34px;font-family:var(--f-data,monospace)}.sollr span{flex:1;min-width:0;display:flex;flex-direction:column}.sollr small{color:var(--muted,#667)}.sollr .btn{min-height:38px}' +
      '.solstep{position:fixed;left:max(8px,env(safe-area-inset-left,0px));right:max(8px,env(safe-area-inset-right,0px));bottom:calc(env(safe-area-inset-bottom,0px) + 10px);margin:0 auto;max-width:440px;z-index:64;background:var(--panel,#fff);color:var(--ink,#000);border:2px solid #1d4ed8;border-radius:14px;padding:0 12px 10px;box-shadow:0 6px 20px rgba(0,0,0,.4);display:flex;flex-direction:column;gap:8px;font-size:14px;max-height:60vh;overflow-y:auto;box-sizing:border-box}.solstep[hidden]{display:none}.solgrip{height:20px;display:flex;align-items:center;justify-content:center;cursor:grab;touch-action:none;margin:0 -12px}.solgrip span{width:44px;height:5px;border-radius:3px;background:var(--muted,#889);opacity:.7}.solhd{display:flex;align-items:center;gap:8px}.solhd b{flex:1;font-size:16px}.solhd .close{font-size:22px;background:none;border:0;color:inherit;min-width:40px;min-height:40px}.solstepn{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted,#667);white-space:nowrap}.solgot{margin:0;font-size:13px;color:var(--muted,#667)}.solgot b{color:var(--ink,#000)}.solnav{display:flex;gap:8px;justify-content:space-between}.solnav .btn{min-height:42px;flex:1}.solnav .btn:disabled{opacity:.4;cursor:default}.solstep input{width:62px;min-height:34px;font-size:16px}.solstep .solname{flex:1;width:auto}.solstep .seg button{min-height:34px;white-space:nowrap}.solk{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted,#667)}' +
      '@media (min-width:1000px) and (min-height:600px){.solstep{right:16px;left:auto;bottom:auto;top:128px;margin:0;width:380px;max-height:calc(100vh - 210px)}}' +
      '.solmsg{margin:0;padding:6px 8px;border-radius:8px;background:rgba(245,158,11,.15);color:var(--ink,#000);font-size:13px}.solstep .solcode{width:120px;text-transform:uppercase}.solstep input[type=datetime-local]{width:auto;min-height:34px;font-size:15px}#solAfter{z-index:65}' +
      '.solcards{display:flex;flex-direction:column;gap:10px}.solcards .btn{display:flex;flex-direction:column;align-items:flex-start;text-align:left;padding:12px;min-height:64px;gap:2px}.solcards span{font-size:12px;opacity:.85;font-weight:400}';
    /* Stuart 18 Nov 19:44 and 19:48: the countdown keeps still (every digit one width) and is never under the buttons, which wrap below it on a phone */
    st.textContent += 'body.fsss #liveBox,body.fsss #liveBig,body.fsss .navgrip2{display:none!important}';
    st.textContent += '.sollegs table{width:100%;table-layout:fixed;border-collapse:collapse}.sollegs td{white-space:normal;overflow-wrap:anywhere;vertical-align:top;padding:4px 4px}.sollegs tr:not(.solcer) td:first-child{width:1.4em}.sollegs td:nth-child(2){text-align:left;font-family:var(--f-body,system-ui)}.sollegs tr:not(.solcer) td:nth-child(3),.sollegs tr:not(.solcer) td:nth-child(4){width:4.4em;text-align:right;white-space:nowrap}.sollegs .solce{display:flex;gap:6px;flex-wrap:wrap}';   /* Stuart's iPhone, 18 Nov: the course card was wider than the screen and the names were cut off */
    st.textContent += '.solss.ssthru{background:transparent!important;pointer-events:none}.solss.ssthru>*{pointer-events:auto}.solss.ssthru .sscv,.solss.ssthru .sszoom{display:none!important}.solss.ssthru .sshd{background:var(--panel,#0f2740);border-radius:12px;padding:4px 8px;box-shadow:0 4px 14px rgba(0,0,0,.35)}.solss.ssthru .ssnum{margin-top:auto}.solss.ssthru .ssov{background:var(--panel,#0f2740);border-radius:10px;padding:6px 10px}';
    st.textContent += '.soltest.intb{position:static;transform:none;left:auto;top:auto;width:auto;max-width:none;flex:none;box-shadow:none;margin:0}';
    st.textContent += '.sst,.sqt{font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1;white-space:nowrap}.sst{min-width:max-content!important}.ssmin{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--muted,#9aa)}.ssmin select{font:inherit;font-size:14px;padding:6px 4px;border-radius:8px;background:var(--panel,#0B1B30);color:var(--ink,#fff);border:1px solid var(--line,#334)}';
    st.textContent += '.solpop.sollegs{left:max(12px,env(safe-area-inset-left,0px));right:auto;transform:none;top:calc(env(safe-area-inset-top,0px) + 112px);bottom:auto;max-width:min(calc(100vw - 16px),460px);max-height:calc(100vh - 200px);overflow:auto;gap:6px;background:var(--panel,#fff)}.sollt{overflow-x:auto}.sollt table{border-collapse:collapse;width:100%;font-size:13px;font-variant-numeric:tabular-nums}.sollt td{padding:4px 6px;border-bottom:1px solid var(--line,#e2e8f0);vertical-align:top}.sollt td:nth-child(3),.sollt td:nth-child(4){white-space:nowrap;text-align:right}.sollt td:nth-child(2){min-width:0}.sollty{color:var(--muted,#667);font-size:12px}.sollegs .xrow{display:flex;gap:8px;flex-wrap:wrap}.sollegs .xrow .btn{min-height:44px}@media (max-width:600px),(max-height:500px){.solpop.sollegs{top:auto;left:calc(58px + env(safe-area-inset-left,0px));right:max(8px,env(safe-area-inset-right,0px));width:auto;max-width:none;bottom:calc(env(safe-area-inset-bottom,0px) + 8px);max-height:55vh}}.sollegs .solgrip{margin:-6px -34px 0 -12px}.sollegs.dragged{right:auto;bottom:auto;max-width:min(calc(100vw - 16px),460px)}';
    st.textContent += 'body.mkfold #time,body.mkfold #tzRow,body.mkfold #clock,body.mkfold #now{display:none!important}.mktime[hidden]{display:none}' +
      '.sollegs>*{flex-shrink:0}' +
      '.solce{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-start}.solcer td{padding-top:0!important;border-top:0!important}.solce .btn.sm{min-height:32px;min-width:32px;padding:0 9px;font-size:13px}.solceadd{margin-top:4px}' +
      '.solcc{background:#dc2626;color:#fff;border:2px solid #fecaca;border-radius:12px;font:800 13px system-ui,sans-serif;letter-spacing:.05em;padding:0 12px;min-height:44px;align-self:stretch;white-space:nowrap;cursor:pointer}.solcc.solccfx{position:fixed;left:8px;bottom:80px;z-index:12;padding:9px 14px;min-height:0;box-shadow:0 4px 14px rgba(0,0,0,.4)}.solcc[hidden]{display:none}' +
      '.solce-bar{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 90px);z-index:13;width:min(calc(100vw - 20px),440px);box-sizing:border-box;background:var(--panel,#0B1B30);color:var(--ink,#fff);border:2px solid #dc2626;border-radius:14px;padding:8px 10px;display:flex;flex-direction:column;gap:4px;box-shadow:0 6px 18px rgba(0,0,0,.4)}.solce-bar[hidden]{display:none}.solce-bar span{font-size:13px;opacity:.85}' +
      '.sszoom{position:relative;align-self:flex-end;margin-top:-50px;margin-right:8px;display:flex;gap:6px;z-index:1}.sszoom .btn{min-width:40px;min-height:40px;font-size:20px;font-weight:700;padding:0}' +
      '.sqser{margin:0;font-size:12px;opacity:.85}.ssov.ssinfo{background:rgba(59,130,246,.18)!important;color:inherit!important;border-color:#3b82f6!important}' +
      '.sheet.solmk{background:transparent;justify-content:flex-start;align-items:flex-start;padding:calc(env(safe-area-inset-top,0px) + 62px) 8px 8px}.sheet.solmk .in{height:auto;max-height:calc(100vh - 80px);width:min(440px,100%);border-radius:14px;border:1px solid var(--line,#334);box-shadow:0 10px 28px rgba(0,0,0,.45);padding-top:0;overflow:auto}' +
      '.solpics{display:grid;grid-template-columns:1fr 1fr;gap:8px}.solpic{display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 6px;min-height:0;text-align:center}.solpic svg{width:100%;max-width:150px;height:auto;overflow:visible}.solpic span{font-size:12px;opacity:.8;font-weight:400}' +
      '.solsaved{display:flex;flex-direction:column;gap:4px;margin-top:8px}.solsv{display:flex;flex-direction:column;align-items:flex-start;text-align:left;background:var(--glass,rgba(255,255,255,.05));color:inherit;border:1px solid var(--line,#334);border-radius:10px;padding:6px 10px;font:inherit;cursor:pointer}.solsv span{font-size:12px;opacity:.75}' +
      '.solnext{display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--line,#334);margin-top:6px;padding-top:6px}.solnext .solcl{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.solnext input[type=time]{min-height:36px}' +
      'body.sollist-on #solStep,body.sollist-on #solChain{display:none!important}' +
      '.solmenu{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:6px}.solmenu b{flex:1 1 100%;font-size:16px}.solmenu .btn{min-height:40px}' +
      '.solss{position:fixed;left:0;right:0;top:0;bottom:0;z-index:25;background:var(--bg,#081a2e);color:var(--ink,#fff);display:flex;flex-direction:column;gap:6px;padding:calc(env(safe-area-inset-top,0px) + 8px) max(10px,env(safe-area-inset-right,0px)) calc(env(safe-area-inset-bottom,0px) + 8px) max(10px,env(safe-area-inset-left,0px));box-sizing:border-box}.solss[hidden]{display:none}.solss.sqlast{box-shadow:inset 0 0 0 4px #ef4444}.sshd{display:flex;align-items:center;gap:10px;flex-wrap:wrap;min-width:0}.solss{overflow-x:hidden}.sst{min-width:0}@media (max-width:480px){.sshd{gap:6px}.sshd .sst{font-size:32px}.sshd .btn{padding:0 8px}.ssg{max-width:none;flex-basis:100%;order:9;text-align:center}}.ssflag{width:40px;height:28px;border-radius:3px;cursor:pointer}.sst{font:700 40px/1 var(--f-data,monospace);flex:1;text-align:center}.ssg{font-size:12px;color:var(--muted,#9aa);max-width:30%}.sshd .btn{min-height:38px;padding:0 10px}.sscv{flex:1 1 45%;min-height:160px;width:100%;border-radius:12px}.ssnum{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:6px}.ssc{background:var(--panel,#0f2740);border-radius:10px;padding:6px 8px;display:flex;flex-direction:column}.ssc span{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted,#9aa)}.ssc b{font:700 24px/1.15 var(--f-data,monospace)}.ssc i{font-style:normal;font-size:12px;color:var(--muted,#9aa)}.ssc.good b{color:#22c55e}.ssc.warn b{color:#f59e0b}.ssc.bad b{color:#ef4444}.ssov{margin:0;padding:8px;border-radius:8px;background:#7f1d1d;color:#fff;font-weight:700}.solss .sqrow .btn{min-height:42px}' +
      '.solseq{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 70px);z-index:12;width:min(calc(100vw - 20px),420px);box-sizing:border-box;background:var(--panel,#0B1B30);color:var(--ink,#fff);border:2px solid #f59e0b;border-radius:14px;padding:6px 10px 8px;box-shadow:0 6px 18px rgba(0,0,0,.4);display:flex;flex-direction:column;gap:6px}.solseq[hidden]{display:none}.solseq.sqlast{border-color:#ef4444}.sqhd{display:flex;align-items:center;gap:10px}.sqt{font:700 28px/1 var(--f-data,monospace);flex:1;text-align:center}.sqg{font-size:12px;color:var(--muted,#9aa)}.sqflag{min-width:44px;min-height:36px;border-radius:8px;border:1px solid var(--line,#456);background:#1d4ed8;color:#fff;font-weight:700}.sqx{background:none;border:0;color:inherit;font-size:22px;min-width:36px;min-height:36px}.sqrow{display:flex;gap:5px;flex-wrap:wrap}.sqrow .btn{min-height:36px;padding:0 7px;font-size:14px;flex:1 1 auto}.sqover{margin:0;padding:6px 8px;border-radius:8px;background:#7f1d1d;color:#fff;font-weight:600;font-size:13px}' +
      '.soltest{background:#b45309;padding:4px 4px 4px 10px;font-size:12px;gap:5px;flex-wrap:wrap;width:min(calc(100vw - 16px),560px);box-sizing:border-box;justify-content:flex-start}.soltest>span{flex:1 1 100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3}.solpick.soltest button{min-height:28px;padding:0 9px;font-size:12px}.soltest button{color:#b45309;padding:4px 10px}.solmulti{flex-wrap:wrap}.solstep .solll{flex:1;width:auto;min-width:0;font-family:var(--f-data,monospace)}.solbias{display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;padding:8px 10px;border-radius:10px;border:2px solid #22c55e;background:rgba(34,197,94,.12);color:var(--ink,#000);font:inherit;cursor:pointer}.solbias b{font-size:16px}.solbias span:last-child{font-size:12px;color:var(--muted,#667)}';
    document.head.appendChild(st);
  }
  function openBuilder() {
    css(); zoomMax(); load().then(render);
    var s = $('solSheet'); if (!s) { s = document.createElement('div'); s.className = 'sheet'; s.id = 'solSheet'; s.hidden = true;
      s.innerHTML = '<div class="in" role="dialog" aria-label="Solent race builder"><div class="shead"><h2>Solent race</h2><button class="close" id="solX" aria-label="Close the Solent race builder">×</button></div><div class="sbody" id="solBody"></div></div>';
      document.body.appendChild(s); $('solX').onclick = function () { s.hidden = true; redraw(); }; }
    try { var sh = $('sheet'); if (sh && !sh.hidden && $('sheetX')) $('sheetX').click(); } catch (e) {}
    s.hidden = false; render(); redraw();
  }
  function ptLabel(p) { return p ? esc(p.name) : '<i>not chosen</i>'; }
  function render() {
    var b = $('solBody'); if (!b) return;
    if (!MK) { b.innerHTML = '<p class="note">Loading the Solent mark list…</p>'; return; }
    var w = B.wl, h = '';
    h += '<p class="note">Marks from the JOG / SCRA <b>Solent Area Mark Codes 2026</b> list (23 February 2026). Check the course against the sailing instructions and the course board on the day: marks can move, and most yellow race marks are laid March to November only.</p>';
    h += '<div class="row"><label for="solName">Race name</label><input id="solName" maxlength="60" value="' + esc(B.name) + '"></div>';
    h += '<div class="row"><span class="rowlbl" id="solTypeL">Course</span><div class="seg" role="group" aria-labelledby="solTypeL"><button type="button" data-t="marks" aria-pressed="' + (B.type !== 'wl') + '">Round the marks</button><button type="button" data-t="wl" aria-pressed="' + (B.type === 'wl') + '">Windward-leeward</button></div></div>';
    h += '<h3>Start</h3><div class="solrow"><b>' + ptLabel(B.start) + '</b><button class="btn" data-pick="start">Pick on the chart</button><button class="btn" id="solHere">Here (GPS)</button></div><div class="row"><label for="solStartCode">or mark code</label><input id="solStartCode" size="4" maxlength="3" placeholder="3G"></div>';
    if (B.type === 'wl') {
      h += '<h3>Windward mark</h3><div class="row"><span class="rowlbl" id="solWkL">Windward mark is</span><div class="seg" role="group" aria-labelledby="solWkL"><button type="button" data-wk="brg" aria-pressed="' + (w.wkind !== 'buoy') + '">A heading and distance</button><button type="button" data-wk="buoy" aria-pressed="' + (w.wkind === 'buoy') + '">A buoy</button></div></div>';
      if (w.wkind === 'buoy') h += '<div class="row"><label for="solWcode">Buoy code</label><input id="solWcode" size="4" maxlength="3" value="' + esc(w.wcode) + '" placeholder="3G"><span class="note">' + (mark(w.wcode) ? esc(mark(w.wcode).name) : '') + '</span></div>';
      else h += '<div class="row"><label for="solBrg">Heading from the start</label><input id="solBrg" type="number" min="0" max="360" step="1" value="' + (w.brg == null ? '' : w.brg) + '" style="width:70px"> °T <button class="btn" id="solFc">Use the forecast wind</button></div><div class="row"><label for="solDist">Distance</label><input id="solDist" type="number" min="0.2" max="10" step="0.1" value="' + w.dist + '" style="width:70px"> nm</div><p class="note" id="solFcNote"></p>';
      h += '<h3>Leeward mark and laps</h3><div class="row"><span class="rowlbl" id="solLkL">Leeward mark is</span><div class="seg" role="group" aria-labelledby="solLkL"><button type="button" data-lk="start" aria-pressed="' + (w.lkind !== 'buoy') + '">The start line</button><button type="button" data-lk="buoy" aria-pressed="' + (w.lkind === 'buoy') + '">A buoy</button><button type="button" data-lk="gate" aria-pressed="' + (w.lkind === 'gate') + '">A gate</button></div></div>';
      if (w.lkind === 'gate') h += '<div class="row"><label for="solLcode">Gate buoys</label><input id="solLcode" size="4" maxlength="3" value="' + esc(w.lcode) + '" placeholder="2C"> and <input id="solLcode2" size="4" maxlength="3" value="' + esc(w.lcode2 || '') + '" placeholder="2D"></div><p class="note">Round either buoy of the gate; the routes cross the line between them.</p>';
      if (w.lkind === 'buoy') h += '<div class="row"><label for="solLcode">Buoy code</label><input id="solLcode" size="4" maxlength="3" value="' + esc(w.lcode) + '"><span class="note">' + (mark(w.lcode) ? esc(mark(w.lcode).name) : '') + '</span></div>';
      h += '<div class="row"><span class="rowlbl" id="solWfL">Finish at</span><div class="seg" role="group" aria-labelledby="solWfL"><button type="button" data-wf="lee" aria-pressed="' + ((w.fin || 'lee') === 'lee') + '">Leeward</button><button type="button" data-wf="start" aria-pressed="' + (w.fin === 'start') + '">Start line</button><button type="button" data-wf="wind" aria-pressed="' + (w.fin === 'wind') + '">Windward</button></div></div>';
      h += '<div class="row"><label for="solLaps">Laps (beats)</label><input id="solLaps" type="number" min="1" max="6" step="1" value="' + w.laps + '" style="width:60px"></div>';
      h += '<div class="row"><label for="solSide">Leave the marks to</label><select id="solSide"><option value="port"' + (w.side !== 'starboard' ? ' selected' : '') + '>port</option><option value="starboard"' + (w.side === 'starboard' ? ' selected' : '') + '>starboard</option></select></div><p class="note">Finish at the leeward mark after the last beat and run.</p>';
    } else {
      h += '<h3>Marks</h3><label for="solBoard" class="note">From the course board: mark codes in order, each with p (port) or s (starboard). For example <b>3G p 4F s 2B p</b>.</label><textarea id="solBoard" class="soltxt" placeholder="3G p 4F s 2B p"></textarea><div class="xrow"><button class="btn" id="solBoardGo">Set the marks from the board</button><button class="btn" data-pick="mark">Add a mark on the chart</button></div><p class="note" id="solBoardNote"></p>'; h = h.replace('<h3>Marks</h3>', '<h3>Marks</h3><div class="xrow"><button class="btn primary" id="solChainGo">Build on the chart</button><button class="btn" id="solListGo">All the buoys</button></div><p class="note">Build on the chart: tap each buoy, choose Port or Starboard, and carry on to the next; the course grows on the chart. All the buoys: a list to search, adding each with Port or Starboard.</p>');
      (B.marks || []).forEach(function (m, i) { h += '<div class="solrow" data-i="' + i + '"><b>' + (i + 1) + '. ' + esc(m.name) + '</b><select data-side="' + i + '" aria-label="Leave ' + esc(m.name) + ' to"><option value="port"' + (m.side !== 'starboard' ? ' selected' : '') + '>to port</option><option value="starboard"' + (m.side === 'starboard' ? ' selected' : '') + '>to starboard</option></select><button class="btn" data-up="' + i + '" aria-label="Move up">↑</button><button class="btn" data-del="' + i + '" aria-label="Remove">×</button></div>'; });
      h += '<h3>Finish</h3><div class="row"><span class="rowlbl" id="solFinL">Finish at</span><div class="seg" role="group" aria-labelledby="solFinL"><button type="button" data-fin="start" aria-pressed="' + (B.fin !== 'mark') + '">The start line</button><button type="button" data-fin="mark" aria-pressed="' + (B.fin === 'mark') + '">A mark or point</button></div></div>';
      if (B.fin === 'mark') h += '<div class="solrow"><b>' + ptLabel(B.finish) + '</b><button class="btn" data-pick="finish">Pick on the chart</button></div><div class="row"><label for="solFinCode">or mark code</label><input id="solFinCode" size="4" maxlength="3"></div>';
    }
    var d = window.__fsDepth ? window.__fsDepth() : 3;
    h += '<h3>Depth</h3><div class="row"><label for="solDepth">Keep out of water shallower than</label><input id="solDepth" type="number" min="0" max="20" step="0.5" value="' + d + '" style="width:70px"> m</div><p class="note">The same safety depth as in the Course tab: the routes keep out of shallower water. In the Solent at low water this matters: depths are below lowest astronomical tide, with no tide height added.</p>';
    var c = build(), shl = c.err ? [] : shallowMarks(c);
    if (shl.length) h += '<p class="note" id="solShallow"><b>Inshore marks.</b> The depth data reads shallower than ' + d + ' m at ' + esc(shl.join(', ')) + '. So the boat can reach them, within 0.4 nm of these marks the routes may use any water below chart datum (and leave a start the data shows as shore). Check the depth on the day.</p>';
    h += '<p class="note ' + (c.err ? 'solerr' : '') + '" id="solMsg">' + (c.err ? esc(c.err) : 'Ready: ' + (c.marks.length) + ' marks, about ' + nm(c) + ' nm.') + '</p>';
    if (!c.err) { var pp = [c.start].concat(c.marks).concat([c.finish]), lt = '<table class="soltab"><thead><tr><th>Leg</th><th>To</th><th>°T</th><th>nm</th><th title="Tide strength on this leg, against the forecast">Tide</th><th title="Turn the tide on this leg, + clockwise">Tide °</th></tr></thead><tbody>', LT = B.legTide || [];
      for (var li = 1; li < pp.length; li++) { var a0 = pp[li - 1], q0 = pp[li], dx = (q0.lon - a0.lon) * Math.cos((a0.lat + q0.lat) / 2 * R) * 60, dy = (q0.lat - a0.lat) * 60; lt += '<tr><td>' + li + '</td><td>' + esc(q0.name.replace(/^Finish, /, 'Finish: ')) + (q0.side ? ' <small>(' + q0.side + ')</small>' : '') + '</td><td>' + ('00' + Math.round((Math.atan2(dx, dy) / R + 360) % 360)).slice(-3) + '</td><td>' + Math.hypot(dx, dy).toFixed(1) + '</td><td>' + legSel(li, 'p', LT[li - 1]) + '</td><td>' + legSel(li, 'd', LT[li - 1]) + '</td></tr>'; }
      h += '<h3>Legs</h3><div style="overflow-x:auto">' + lt + '</tbody></table></div>'; }
    h += '<div class="xrow"><button class="btn primary" id="solGo"' + (c.err ? ' disabled' : '') + '>Route this race</button><button class="btn" id="solClear">Start again</button></div>';
    b.innerHTML = h; wire();
  }
  /* tide by hand for each leg (Stuart 15 Nov 11:30): strength against the forecast, and a turn of its direction, kept with the race */
  function legSel(li, k, q) { var v = q && q[k] || 0, opts = k === 'p' ? [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50] : [-60, -45, -30, -15, 0, 15, 30, 45, 60]; return '<select class="soltide" data-leg="' + li + '" data-k="' + k + '" aria-label="Leg ' + li + (k === 'p' ? ' tide strength' : ' tide direction') + '">' + opts.map(function (o) { return '<option value="' + o + '"' + (o === v ? ' selected' : '') + '>' + (o > 0 ? '+' : '') + o + (k === 'p' ? '%' : '°') + '</option>'; }).join('') + '</select>'; }
  function shallowMarks(c) {
    var D = null; try { D = window.__navFc && window.__navFc() && window.__navFc().P.depth; } catch (e) {} if (!D) return [];
    var safe = window.__fsDepth ? window.__fsDepth() : 3, out = [];
    [c.start].concat(c.marks).forEach(function (q) { var k = /^(?:Start, )?(\d[0-9A-Z]) /.exec(q.name || ''); if (!k) return; var z = null; try { z = D.nearest('z', q.lat, q.lon); } catch (e) {} if (!(z <= -safe) && out.indexOf(k[1]) < 0) out.push(k[1]); });
    return out;
  }
  function nm(c) { var p = [c.start].concat(c.marks).concat([c.finish]), d = 0; for (var i = 1; i < p.length; i++) { var a = p[i - 1], q = p[i], dx = (q.lon - a.lon) * Math.cos((a.lat + q.lat) / 2 * R) * 60, dy = (q.lat - a.lat) * 60; d += Math.hypot(dx, dy); } return d < 10 ? d.toFixed(1) : Math.round(d); }
  function wire() {
    var b = $('solBody'), q = function (s) { return b.querySelectorAll(s); }, on = function (id, ev, fn) { var e = $(id); if (e) e[ev] = fn; };
    on('solHere', 'onclick', function () { var f = null; try { f = window.__fsLiveFix && window.__fsLiveFix(); } catch (e) {} if (!f || f.dr || Date.now() - f.at > 30000) { toast('No GPS fix yet: turn on Live GPS (GPS button), then tap Here again.'); try { if (window.__navLiveOn) window.__navLiveOn(); } catch (e) {} return; } B.start = { code: null, name: 'Start, GPS ' + new Date().toUTCString().slice(17, 22) + ' UTC', lat: f.la, lon: f.lo }; saveB(); render(); redraw(); });
    on('solName', 'onchange', function () { B.name = this.value.trim() || 'Solent race'; saveB(); });
    [].forEach.call(q('[data-t]'), function (e) { e.onclick = function () { B.type = e.dataset.t; saveB(); render(); redraw(); }; });
    [].forEach.call(q('[data-wk]'), function (e) { e.onclick = function () { B.wl.wkind = e.dataset.wk; saveB(); render(); redraw(); }; });
    [].forEach.call(q('[data-lk]'), function (e) { e.onclick = function () { B.wl.lkind = e.dataset.lk; saveB(); render(); redraw(); }; });
    [].forEach.call(q('[data-fin]'), function (e) { e.onclick = function () { B.fin = e.dataset.fin; saveB(); render(); redraw(); }; });
    [].forEach.call(q('[data-pick]'), function (e) { e.onclick = function () { pickStart(e.dataset.pick); }; });
    [].forEach.call(q('[data-side]'), function (e) { e.onchange = function () { B.marks[+e.dataset.side].side = e.value; saveB(); }; });
    [].forEach.call(q('[data-up]'), function (e) { e.onclick = function () { var i = +e.dataset.up; if (i > 0) { var t = B.marks[i]; B.marks[i] = B.marks[i - 1]; B.marks[i - 1] = t; saveB(); render(); redraw(); } }; });
    [].forEach.call(q('[data-del]'), function (e) { e.onclick = function () { B.marks.splice(+e.dataset.del, 1); saveB(); render(); redraw(); }; });
    var code = function (id, set) { on(id, 'onchange', function () { var m = mark(this.value); if (!m) { this.setCustomValidity('No mark ' + this.value); this.reportValidity(); return; } set({ code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon }); saveB(); render(); redraw(); }); };
    code('solStartCode', function (p) { B.start = p; }); code('solFinCode', function (p) { B.finish = p; });
    on('solWcode', 'onchange', function () { B.wl.wcode = this.value.trim().toUpperCase(); saveB(); render(); redraw(); });
    on('solLcode', 'onchange', function () { B.wl.lcode = this.value.trim().toUpperCase(); saveB(); render(); redraw(); });
    on('solLcode2', 'onchange', function () { B.wl.lcode2 = this.value.trim().toUpperCase(); saveB(); render(); redraw(); });
    [].forEach.call(q('[data-wf]'), function (e) { e.onclick = function () { B.wl.fin = e.dataset.wf; saveB(); render(); redraw(); }; });
    on('solBrg', 'onchange', function () { var v = +this.value; B.wl.brg = this.value === '' ? null : ((v % 360) + 360) % 360; saveB(); render(); redraw(); });
    on('solDist', 'onchange', function () { B.wl.dist = Math.max(0.2, Math.min(10, +this.value || 1)); saveB(); render(); redraw(); });
    on('solLaps', 'onchange', function () { B.wl.laps = Math.max(1, Math.min(6, Math.round(+this.value || 1))); saveB(); render(); redraw(); });
    on('solSide', 'onchange', function () { B.wl.side = this.value; saveB(); });
    on('solDepth', 'onchange', function () { if (window.__fsDepth) window.__fsDepth(+this.value); });
    on('solFc', 'onclick', function () {
      var n = $('solFcNote'); if (!B.start) { n.textContent = 'Choose the start first.'; return; }
      var t = window.__fsStartAt ? window.__fsStartAt() : null, w = window.__fsWindAt ? window.__fsWindAt(B.start.lat, B.start.lon, t) : null;
      if (!w) { n.textContent = 'No forecast wind here at the start time: type the heading.'; return; }
      B.wl.brg = Math.round(w.twd) % 360; saveB(); render(); redraw();
      $('solFcNote').textContent = 'Forecast at the start' + (t ? ' (' + new Date(t * 1000).toUTCString().slice(17, 22) + ' UTC)' : '') + ': ' + w.tws.toFixed(0) + ' kn from ' + ('00' + Math.round(w.twd)).slice(-3) + '°T. Check the wind on the line before the start.';
    });
    on('solChainGo', 'onclick', function () { chain(true); });
    on('solListGo', 'onclick', function () { list(true); });
    on('solBoardGo', 'onclick', function () { var r = parseBoard($('solBoard').value), n = $('solBoardNote'); if (r.marks.length) { B.marks = r.marks; saveB(); render(); redraw(); n = $('solBoardNote'); } n.textContent = (r.marks.length ? r.marks.length + ' marks set.' : 'No mark codes found.') + (r.bad.length ? ' Not on the list: ' + r.bad.join(', ') + '.' : ''); });
    on('solClear', 'onclick', function () { B = { type: B.type, name: 'Solent race', start: null, marks: [], fin: 'start', finish: null, wl: { wkind: 'brg', wcode: '', brg: null, dist: 1.5, laps: 2, lkind: 'start', lcode: '', side: 'port' } }; saveB(); render(); redraw(); });
    [].forEach.call(document.querySelectorAll('#solSheet select.soltide'), function (el) { el.onchange = function () { var L = B.legTide = B.legTide || []; var i = +el.dataset.leg - 1; L[i] = L[i] || {}; L[i][el.dataset.k] = +el.value; sv(BKEY, B); }; });
    on('solGo', 'onclick', function () { B.plan = 'route'; saveB(); go(); });   /* the full Solent sheet's button says Route this race, so it routes */
  }
  function go(remote) { var c = build(); if (c.err) { toast(c.err); return false; } if (WZ.on && B.startAt) window.__fsPendingStart = B.startAt; zoomMax(); if (B.legTide && B.legTide.some(function (q) { return q && (q.p || q.d); })) c.legTide = B.legTide.slice();
    /* the date and time added to the name in Saved routes (Stuart 15 Nov J Q&A; 16 Nov "Solent race with date time stamp so it can be rerun after the event") */
    var t = WZ.on && B.startAt ? B.startAt : window.__fsStartAt ? window.__fsStartAt() : null, d = new Date(t ? t * 1000 : Date.now()), ds = d.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    c.name = (c.name.replace(/ \d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)( \d\d:\d\d)?$/, '') + ' ' + ds).slice(0, 70); c.solent = true; c.solPlan = { route: B.plan === 'route', model: B.model || 'ukv', models: (B.models && B.models.length ? B.models : [B.model || 'ukv']) };
    if (remote !== true) { B.shown = Date.now(); B.raced = null; saveB(); } if ($('solSheet')) $('solSheet').hidden = true; if (window.__fsUseCourse) window.__fsUseCourse(c); if (B.plan === 'route') setTimeout(startCardAfter, 600); return true; }
  /* After routing (Stuart 16 Nov 12:46): "a connection to the usual start sequence with count down distance from line": the GPS window has Gun in, Ping boat and Ping pin, distance to the line and time to burn */
  function startCardAfter() {
    css(); var c = $('solAfter'); if (!c) { c = document.createElement('div'); c.id = 'solAfter'; c.className = 'solpop'; c.setAttribute('role', 'dialog'); document.body.appendChild(c); }
    c.innerHTML = '<button class="close" aria-label="Close">×</button><b>Routed. Next, the start</b><span>The GPS window counts down to the gun and shows your distance to the line and time to burn. Ping the committee boat and the pin there.</span><div class="xrow"><button class="btn primary" data-k="gps">Open the start sequence</button></div>';
    c.hidden = false; c.querySelector('.close').onclick = function () { c.hidden = true; };
    c.querySelector('[data-k="gps"]').onclick = function () { c.hidden = true; if (window.__fsLiveOpen) window.__fsLiveOpen(); };
    clearTimeout(startCardAfter.t); startCardAfter.t = setTimeout(function () { c.hidden = true; }, 20000);
  }
  /* the course as a list (Stuart 16 Nov 18:30, decided 18:40): bearing, distance and leg type for each leg; Route it; New course */
  function legType(brg, twd) { var twa = Math.abs(((brg - twd + 540) % 360) - 180), t;
    if (twa < 50) { var s1 = Math.abs(((brg - (twd - 45) + 540) % 360) - 180), p1 = Math.abs(((brg - (twd + 45) + 540) % 360) - 180); t = 'beat, ' + (Math.abs(s1 - p1) < 6 ? 'square' : (s1 < p1 ? 'starboard' : 'port') + ' tack favoured'); }
    else if (twa < 80) t = 'close reach'; else if (twa < 110) t = 'beam reach'; else if (twa < 150) t = 'broad reach';
    else { var sg = Math.abs(((brg - (twd + 180 - 30) + 540) % 360) - 180), pg = Math.abs(((brg - (twd + 180 + 30) + 540) % 360) - 180); t = 'run, ' + (Math.abs(sg - pg) < 6 ? 'dead downwind' : (sg < pg ? 'starboard' : 'port') + ' gybe favoured'); }
    return t; }
  /* Stuart 17 Nov 13:12 (tablet photo): "In mark and mark+ need to show full list of race route with edit or change button along side -
     just as a check - need to be able to easier return to this place if the race committee alter the course - maybe a red course change
     button whilst the race is underway". Each leg of the course card has Change (tap the new buoy on the chart, or choose it from All the
     buoys), P/S to swap the side and × to take the mark out; + Add a mark puts one in before the finish. The course goes to Route at once
     (the race and the gun are kept) and to the crew by the boat code. While the race is under way a red COURSE CHANGE button on the
     chart opens this card. */
  var CE = { i: null, ins: false };
  function ceBtns(i, n) { var isMark = B.type !== 'wl' && i <= B.marks.length;
    if (isMark) { var mk = B.marks[i - 1] || {}, sb = mk.side === 'stbd' || mk.side === 'starboard'; return '<button class="btn sm" data-k="ce" data-i="' + i + '">Change</button>' + (mk.wp || !mk.code ? '' : '<button class="btn sm" data-k="ceside" data-i="' + i + '" title="Swap Port and Starboard">' + (sb ? 'Starboard' : 'Port') + ' ⇄</button>') + '<button class="btn sm" data-k="cedel" data-i="' + i + '" aria-label="Take this mark out">×</button>'; }
    return '<button class="btn sm" data-k="cefin">Change</button>'; }
  function ceGo(i, ins) { CE.i = i - 1; CE.ins = !!ins; var c = $('solLegs'); if (c) c.hidden = true; css();
    var bar = $('solCE'); if (!bar) { bar = document.createElement('div'); bar.id = 'solCE'; bar.className = 'solce-bar'; bar.setAttribute('role', 'status'); document.body.appendChild(bar);
      bar.addEventListener('click', function (e) { var t = e.target.closest('[data-c]'); if (!t) return; if (t.dataset.c === 'list') list(true); else { CE.i = null; bar.hidden = true; showList(); } }); }
    var old = !ins && B.marks[CE.i]; bar.innerHTML = '<b>' + (ins ? 'Add a mark before the finish' : 'Leg ' + i + ': instead of ' + esc(old ? (old.code || old.name) : 'this mark')) + '</b><span>Tap the new buoy on the chart, then Port or Starboard; or tap anywhere in the water for a waypoint.</span><div class="xrow"><button class="btn" data-c="list">All the buoys</button><button class="btn" data-c="x">Cancel</button></div>';
    bar.hidden = false; }
  function ceUse(m, side) { if (CE.i == null || !m) return false; var e = m.wp ? { code: null, name: m.name, lat: m.lat, lon: m.lon, side: 'port', wp: true } : { code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon, side: side || (B.marks[CE.i] && B.marks[CE.i].side) || 'port' };
    var was = !CE.ins && B.marks[CE.i]; if (CE.ins) B.marks.splice(CE.i, 0, e); else B.marks[CE.i] = e; var n = CE.i + 1, ins = CE.ins; CE.i = null; var bar = $('solCE'); if (bar) bar.hidden = true; var L = $('solList'); if (L) L.hidden = true;
    var nm0 = m.wp ? 'a waypoint' : m.id; ceDone(ins ? nm0 + ' added as mark ' + n + '.' : 'Leg ' + n + ': ' + nm0 + (was ? ' instead of ' + (was.code || was.name) : '') + '.'); return true; }
  function ceDone(msg) { B.edited = Date.now(); saveB(); go(true); redraw(); showList(); toast('Course changed. ' + msg + ' The crew have it by the boat code.'); }
  function raceOn() { var now = Date.now() / 1000; return !!(window.FS_MARK && B.shown && B.startAt && now >= B.startAt && now < B.startAt + 10 * 3600 && !(B.ended > B.startAt * 1000)); }
  function ccBtn() { var b = $('solCC'); if (!raceOn()) { if (b) b.hidden = true; return; } css();
    if (!b) { b = document.createElement('button'); b.id = 'solCC'; b.className = 'solcc'; b.type = 'button'; b.textContent = 'COURSE CHANGE'; b.title = 'The committee changed the course: open the course, leg by leg, to change it'; var g = $('bar') && $('bar').querySelector('.pgrp'); if (g) g.appendChild(b); else { b.classList.add('solccfx'); document.body.appendChild(b); } b.onclick = function () { showList(); }; }   /* Stuart 17 Nov 14:54: it floated over the nav window; now it sits in the bottom bar after TIME, where nothing floats */
    b.hidden = !!($('solLegs') && !$('solLegs').hidden) || !!($('solCE') && !$('solCE').hidden); }
  if (window.FS_MARK) setInterval(ccBtn, 1000);
  /* Stuart 17 Nov 14:19: "mark first action screen after landing page should open with the start new race box in view". Once the landing
     page has gone, the Start new race card shows, unless a race is under way, a course is being set or test mode is on */
  if (window.FS_MARK) (function () { var n = 0, t = setInterval(function () { n++; var sp = document.getElementById('splash'), up = !sp || sp.hidden || getComputedStyle(sp).display === 'none';
    if (n > 240) { clearInterval(t); return; } if (!up || !MK && n < 40) return; clearInterval(t); if (raceOn() || WZ.on || SIM.on || ($('solCard') && !$('solCard').hidden)) return; try { startCard(); } catch (e) {} }, 500); })();
  /* Stuart 17 Nov 13:27 (tablet photo): "What does the slider do in this set up. If it has no use when used in this senario can it disappear to
     give more screen space then come back when needed". The slider moves the chart's time through the forecast (wind and tide arrows, the
     boats on the routes) for planning. With the GPS live in a race the chart is at now, so on Mark and Mark+ the slider and the UTC and local
     time row fold away, and a small TIME button in the bar brings them back (and folds them again). */
  function timeFold() { var bar = $('bar'); if (!window.FS_MARK || !bar) return; var f = null; try { f = window.__fsLiveFix && window.__fsLiveFix(); } catch (e) {} var live = !!f; if (live) css();
    var tb = $('mkTimeBtn'); if (!tb) { var g = bar.querySelector('.pgrp'); if (!g) return; tb = document.createElement('button'); tb.id = 'mkTimeBtn'; tb.className = 'spd mktime'; tb.type = 'button'; tb.innerHTML = '<span class="sl">TIME</span><b>▴</b>'; tb.title = 'Show the time slider'; g.appendChild(tb);
      tb.onclick = function () { SQ.tshow = !SQ.tshow; timeFold(); setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 50); }; }
    var fold = live && !SQ.tshow, was = document.body.classList.contains('mkfold'); tb.hidden = !live; tb.querySelector('b').textContent = fold ? '▴' : '▾'; tb.title = fold ? 'Show the time slider' : 'Fold the time slider away';
    if (was !== fold) { document.body.classList.toggle('mkfold', fold); setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 50); } }
  if (window.FS_MARK) setInterval(timeFold, 1000);
  function showList() {
    css(); var cc = window.__navCourse && window.__navCourse(); if (!cc) return; var pts = [cc.start].concat(cc.marks || [], [cc.finish]), w = windRef(), tot = 0, rows = [];
    for (var i = 1; i < pts.length; i++) { var a = pts[i - 1], q = pts[i], k = Math.cos(a.lat * R), dx = (q.lon - a.lon) * k * 60, dy = (q.lat - a.lat) * 60, d = Math.hypot(dx, dy), br = (Math.atan2(dx, dy) / R + 360) % 360; tot += d;
      rows.push('<tr><td>' + i + '</td><td>' + esc(String(q.name || '').replace(/^(Start|Finish), /, '')) + (q.side ? ' <small>' + (q.side === 'starboard' || q.side === 'stbd' ? 'S' : 'P') + '</small>' : '') + (w && w.twd != null ? '<br><small class="sollty">' + legType(br, w.twd) + '</small>' : '') + '</td><td><b>' + ('00' + Math.round(br)).slice(-3) + '°T</b></td><td>' + d.toFixed(1) + ' nm</td></tr>' + (window.FS_MARK ? '<tr class="solcer"><td></td><td colspan="3"><div class="solce">' + ceBtns(i, pts.length - 1) + '</div></td></tr>' : '')); }
    var c = $('solLegs'); if (!c) { c = document.createElement('div'); c.id = 'solLegs'; c.className = 'solpop sollegs'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-label', 'The course, leg by leg'); document.body.appendChild(c); }
    c.innerHTML = '<div class="solgrip" title="Drag to move"><span></span></div><button class="close" aria-label="Close">×</button><b>' + esc(cc.name) + '</b><span class="soln">' + (pts.length - 1) + ' legs, ' + tot.toFixed(1) + ' nm' + (w && w.twd != null ? ' · wind from ' + ('00' + Math.round(w.twd)).slice(-3) + '°' : ' · give the wind for leg types') + (lineInfo() ? ' · ' + esc(lineInfo()) : '') + '</span><div class="sollt"><table><tbody>' + rows.join('') + '</tbody></table></div>' + (window.FS_MARK ? '<div class="xrow solceadd">' + (B.type !== 'wl' ? '<button class="btn" data-k="ceadd">+ Add a buoy or waypoint</button>' : '') + (raceOn() ? '' : '<button class="btn" data-k="cestart">Change the start</button>') + '</div>' : '') + (raceOn() ? '' : nextHtml()) + '<div class="xrow"><button class="btn" data-k="gps">GPS</button><button class="btn" data-k="route">Route it</button><button class="btn primary" data-k="new">New course</button></div>';
    try { if (window.FS_MARK && window.__fsPanelClose && innerWidth < 900) window.__fsPanelClose(); } catch (e) {}   /* M44 (Stuart 09:35 photo): the course card and Route's panel never both at once on a phone or small tablet */
    c.hidden = false; c.querySelector('.close').onclick = function () { c.hidden = true; }; legsDrag(c); legsPlace();
    /* 13:12: the card never runs off the screen: it starts on the screen and scrolls inside when long (a phone, with the Next part) */

    c.onclick = function (e) { var b = e.target.closest('[data-k]'); if (!b) return; var k = b.dataset.k;
      if (k === 'gps') { c.hidden = true; if (window.__fsLiveOpen) window.__fsLiveOpen(); }
      else if (k === 'route') { c.hidden = true; B.plan = 'route'; saveB(); if (window.__fsSolPlan) window.__fsSolPlan({ route: true, model: B.model || 'ukv', models: (B.models && B.models.length ? B.models : [B.model || 'ukv']) }); }
      else if (k === 'new') newCourse();
      else if (k === 'ce') ceGo(+b.dataset.i, false);
      else if (k === 'ceside') { var mi = +b.dataset.i - 1, mk0 = B.marks[mi]; if (mk0) { mk0.side = mk0.side === 'stbd' || mk0.side === 'starboard' ? 'port' : 'stbd'; ceDone('Leg ' + b.dataset.i + ': ' + (mk0.code || mk0.name) + ' now to ' + (mk0.side === 'stbd' ? 'starboard' : 'port') + '.'); } }
      else if (k === 'cedel') { if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Sure?'; return; } var md = B.marks.splice(+b.dataset.i - 1, 1)[0]; ceDone((md ? (md.code || md.name) : 'The mark') + ' taken out of the course.'); }
      else if (k === 'ceadd') ceGo(B.marks.length + 1, true);
      else if (k === 'cestart') { c.hidden = true; WZ.on = true; wzOpen(wzSteps().indexOf('start') + 1); }
      else if (k === 'cefin') { c.hidden = true; WZ.on = true; wzOpen(wzSteps().indexOf(B.type === 'wl' ? 'laps' : 'fin') + 1); }
      else if (k === 'nxline') { c.hidden = true; WZ.on = true; wzOpen(wzSteps().indexOf('start') + 1); }
      else if (k === 'nxtide') { c.hidden = true; WZ.on = true; wzOpen(1); }
      else if (k === 'nxseq') { B.seq = +b.dataset.v; saveB(); showList(); sqRender(); }
      else if (k === 'nxpos') { B.series = Object.assign({ iv: 5 }, B.series, { pos: +b.dataset.v }); saveB(); showList(); sqRender(); }
      else if (k === 'nxiv') { B.series = Object.assign({ pos: 1 }, B.series, { iv: +b.dataset.v }); saveB(); showList(); sqRender(); }
      else if (k === 'nxss') { B.ssMin = +b.dataset.v; saveB(); showList(); sqRender(); }
      else if (k === 'nxnow') { c.hidden = true; SQ.small = 0; SQ.force = B.startAt; SQ.hide = 0; sqRender(); } };
    var lo0 = $('solLoa'); if (lo0) lo0.onchange = function () { B.loa = lo0.value === '' ? null : Math.max(3, Math.min(40, +lo0.value)); saveB(); try { if (B.loa && window.__fsLoa) window.__fsLoa(B.loa); } catch (e) {} };   /* F55: one boat length for the ping too */
    var am0 = $('solAccM'); if (am0) am0.onchange = function () { B.accMode = am0.value; saveB(); showList(); };
    var as0 = $('solAccS'); if (as0) as0.onchange = function () { B.accSize = as0.value; saveB(); showList(); };
    try { bindTiming(c); } catch (e) {}
    var ac0 = $('solAcc'); if (ac0) ac0.onchange = function () { B.acc = ac0.value === '' ? null : Math.max(0, Math.min(60, Math.round(+ac0.value))); saveB(); };
    var ti = $('solNxT'); if (ti) ti.onchange = function () { var m = /^(\d\d):(\d\d)/.exec(ti.value); if (!m) return; var d = new Date(B.startAt ? B.startAt * 1000 : Date.now()); d.setHours(+m[1], +m[2], 0, 0); if (!B.startAt && d.getTime() < Date.now()) d.setDate(d.getDate() + 1); sqGun(d.getTime() / 1000); showList(); };
  }
  /* Stuart 17 Nov 09:35: once the course is built the card says what comes next: the start time, the start line (ping, or the committee
     boat with direction and length), the tide, the sequence (10-5-0, 5-4-1-0 or 3-2-1-0) and the start screen (10 or 5 minutes, off, or now) */
  function nextHtml() {
    var pad = function (v) { return ('0' + v).slice(-2); }, now = Date.now() / 1000, t = B.startAt ? new Date(B.startAt * 1000) : null, l = lineNow(), bi = biasNow(), tdz = tideRef();
    var inm = B.startAt ? Math.round((B.startAt - now) / 60) : null, sgb = function (k, v, cur, lab) { return '<button type="button" data-k="' + k + '" data-v="' + v + '" aria-pressed="' + (cur === v) + '">' + lab + '</button>'; };
    var seq = B.seq === 3 ? 3 : B.seq === 10 ? 10 : B.seq === 104 ? 104 : 5, ssm = B.ssMin == null ? 10 : B.ssMin;
    return '<div class="solnext"><b class="solk">Next</b>' +
      '<div class="solcl"><label class="solk" for="solNxT">Start</label><input id="solNxT" type="time" step="60" value="' + (t ? pad(t.getHours()) + ':' + pad(t.getMinutes()) : '') + '"><span class="soln">' + (inm == null ? 'set the gun time' : inm > 0 ? 'in ' + (inm >= 120 ? Math.floor(inm / 60) + ' h ' + (inm % 60) + ' min' : inm + ' min') : inm > -2 ? 'now' : 'started') + '</span></div>' +
      '<div class="solcl"><span class="solk">Start line</span><span class="soln">' + (l ? (bi ? (bi.m < 2 ? 'set · square to the wind' : 'set · ' + esc(bi.end) + ' end favoured by ' + bi.m + ' m') : 'set · ' + Math.round(lineLen()) + ' m') : 'not set') + '</span><button class="btn" data-k="nxline">' + (l ? 'Change' : 'Ping, or boat and direction') + '</button></div>' +
      '<div class="solcl"><span class="solk">Tide</span><span class="soln">' + esc(tideTxt(tdz)) + '</span><button class="btn" data-k="nxtide">Set</button></div>' +
      (l ? lineCheck().map(function (x) { return '<p class="solmsg">' + esc(x) + '</p>'; }).join('') : '') +
      '<div class="solcl"><span class="solk">Sequence</span><span class="seg">' + sgb('nxseq', 10, seq, '10-5-0') + sgb('nxseq', 104, seq, '10-4-1-0') + sgb('nxseq', 5, seq, '5-4-1-0') + sgb('nxseq', 3, seq, '3-2-1-0') + '</span></div>' +
      '<div class="solcl"><span class="solk">Our start</span><span class="seg">' + [1, 2, 3, 4, 5].map(function (n) { return sgb('nxpos', n, series().pos, n === 1 ? 'First' : n + (n === 2 ? 'nd' : n === 3 ? 'rd' : 'th')); }).join('') + '</span>' + (series().pos > 1 ? '<span class="seg">' + [3, 5, 10].map(function (n) { return sgb('nxiv', n, series().iv, 'every ' + n + ' min'); }).join('') + '</span>' : '') + '</div>' +
      (seriesTxt() ? '<p class="soln">' + esc(seriesTxt()) + '</p>' : '') +
      '<div class="solcl"><label class="solk" for="solLoa">Boat length</label><input id="solLoa" type="number" inputmode="decimal" min="3" max="40" step="0.1" value="' + (B.loa || '') + '" placeholder="m" aria-label="Boat length, metres"> m <label class="solk" for="solAccM">To full speed</label><select id="solAccM" aria-label="Where the time to full speed comes from">' + [['typed', 'Typed'], ['wind', 'By wind speed'], ['size', 'Boat size'], ['learn', window.__navBoat ? 'Learn from the log' : 'Learn from the GPS']].map(function (o) { return '<option value="' + o[0] + '"' + ((B.accMode || (window.__navBoat ? 'learn' : 'typed')) === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
        ((B.accMode || (window.__navBoat ? 'learn' : 'typed')) === 'size' ? '<select id="solAccS" aria-label="Boat size">' + ['Dinghy', 'Sportsboat', '30 ft keelboat', '40 ft keelboat'].map(function (z) { return '<option' + (B.accSize === z ? ' selected' : '') + '>' + z + '</option>'; }).join('') + '</select>' + (ACC_SIZE[B.accSize] > 0 ? '' : ' <span class="soln">figures for each size still to come; the typed seconds are used</span>') : '') +
        ((B.accMode || (window.__navBoat ? 'learn' : 'typed')) === 'learn' ? ' <span class="soln">' + (B.accLearn > 0 ? B.accLearn + ' s, from ' + B.accN + ' speed-ups' + (B.tackLearn > 0 ? '; tacks ' + B.tackLearn + ' s' : '') : 'nothing learnt yet: the typed seconds are used') + '</span>' : '') +
        ' <input id="solAcc" type="number" inputmode="numeric" min="0" max="60" value="' + (B.acc || '') + '" placeholder="s" aria-label="Seconds from stopped to full speed, typed"> s</div>' +
      timingHtml() +
      '<div class="solcl"><span class="solk">Start screen</span><span class="seg">' + sgb('nxss', 10, ssm, '10 min') + sgb('nxss', 5, ssm, '5 min') + sgb('nxss', 3, ssm, '3 min') + sgb('nxss', 0, ssm, 'Off') + '</span>' + (B.startAt && B.startAt > now ? '<button class="btn" data-k="nxnow">Show now</button>' : '') + '</div></div>';
  }
  /* 21:35 (Stuart, iPhone): the list fits the screen, sits above the GPS window, and drags by its grip (remembered), with no hidden menu */
  function legsPlace() { var c = $('solLegs'); if (!c || c.hidden) return; var pos = ld('fs-sollegs-pos', null);
    if (pos) { c.classList.add('dragged'); var w = c.offsetWidth || 300, h = c.offsetHeight || 200; c.style.left = Math.max(4, Math.min(innerWidth - w - 4, pos.x)) + 'px'; c.style.top = Math.max(4, Math.min(innerHeight - 60, pos.y)) + 'px'; c.style.bottom = 'auto'; return; }
    c.classList.remove('dragged'); c.style.left = ''; c.style.top = ''; var lb = $('liveBox'), phone = innerWidth <= 600 || innerHeight <= 500;
    if (phone && lb && !lb.hidden && !lb.classList.contains('mini') && lb.getClientRects().length) { var r = lb.getBoundingClientRect(); c.style.bottom = Math.round(innerHeight - r.top + 8) + 'px'; } else c.style.bottom = '';
    /* 13:12: the card never runs off the top of the screen: it starts on the screen and scrolls inside when long */
    c.style.overflowY = 'auto'; c.style.maxHeight = ''; var r0 = c.getBoundingClientRect(); if (r0.top < 8) { c.style.top = '8px'; c.style.maxHeight = 'none'; if (c.style.bottom === '' || c.style.bottom === 'auto') c.style.bottom = '8px'; } }
  function legsDrag(c) { if (c.dataset.dg) return; c.dataset.dg = '1'; var d = null;
    c.addEventListener('pointerdown', function (e) { if (!e.target.closest('.solgrip')) return; var r = c.getBoundingClientRect(); d = { dx: e.clientX - r.left, dy: e.clientY - r.top, id: e.pointerId }; try { c.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); });
    c.addEventListener('pointermove', function (e) { if (!d || e.pointerId !== d.id) return; c.classList.add('dragged'); c.style.left = (e.clientX - d.dx) + 'px'; c.style.top = (e.clientY - d.dy) + 'px'; c.style.bottom = 'auto'; });
    var end = function (e) { if (!d || e.pointerId !== d.id) return; d = null; var r = c.getBoundingClientRect(); sv('fs-sollegs-pos', { x: r.left, y: r.top }); legsPlace(); };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end); c.addEventListener('dblclick', function (e) { if (e.target.closest('.solgrip')) { try { localStorage.removeItem('fs-sollegs-pos'); } catch (x) {} legsPlace(); } }); }
  setInterval(legsPlace, 700); window.addEventListener('resize', legsPlace);
  /* clear down for the next race (18:40): the course stays in Saved races, the track is filed if one was sailed; the marks go, the start line and the wind stay */
  /* M30 (Stuart 17 Nov 09:18): Stop race ends the race and files its track; the course stays in Stored races */
  function stopRace() { SQ.hide = B.startAt; B.pp = false; ['solLegs', 'solAfter', 'solSeq', 'solStartScr'].forEach(function (id) { var e = $(id); if (e) e.hidden = true; }); B.ended = Date.now(); B.shown = null; saveB(); try { if (window.__fsEndRace) window.__fsEndRace(); else if (window.__fsClearCourse) window.__fsClearCourse(); } catch (e) {} try { var PL = window.__fsPlot || window.__navPlot; if (PL && PL.C.on) PL.toggle(false); } catch (e) {} toast('Race stopped. It is kept in Stored races.'); }
  function newCourse() { ['solLegs', 'solAfter'].forEach(function (id) { var e = $(id); if (e) e.hidden = true; });
    var sailed = false; try { var f = window.__fsLiveFix && window.__fsLiveFix(); sailed = !!f; } catch (e) {}
    if (sailed && window.__fsEndRace) window.__fsEndRace(); else if (window.__fsClearCourse) window.__fsClearCourse();
    B.marks = []; B.finish = null; B.fin = 'start'; B.legTide = []; B.startAt = null; B.wl.wcode = ''; B.wl.wpt = null; B.wl.lcode = ''; B.wl.lcode2 = ''; B.wl.lpt = null; B.wl.g1 = null; B.wl.g2 = null; B.wl.brg = null;
    B.start = B.sk === 'line' ? lineStart() : null; saveB(); startCard(); }
  function pickStart(what) {
    pickStart.back = pick === 'chain'; if ($('solChain')) $('solChain').hidden = true; pick = what; if ($('solSheet')) $('solSheet').hidden = true; var bar = $('solPick');
    if (!bar) { bar = document.createElement('div'); bar.id = 'solPick'; bar.className = 'solpick'; document.body.appendChild(bar); }
    bar.innerHTML = '<span>Tap ' + (what === 'start' ? 'the start (a mark or a point on the line)' : what === 'finish' ? 'the finish' : 'the next mark') + ' on the chart</span><button id="solPickX">Cancel</button>';
    bar.hidden = false; $('solPickX').onclick = function () { pickDone(null); }; redraw();
  }
  function pickDone(p) {
    var w = pick; pick = null; if ($('solPick')) $('solPick').hidden = true;
    if (p) { if (w === 'start') B.start = p; else if (w === 'finish') B.finish = p; else { if (!p.code) { toast('Tap one of the Solent marks to add it to the course.'); } else B.marks.push(Object.assign(p, { side: 'port' })); } saveB(); }
    if (pickStart.back) { pickStart.back = false; chain(true); return; }
    $('solSheet').hidden = false; render(); redraw();
  }

  /* ---- J3 (Stuart 15 Nov 17:32): build the course on the map, without going back to the drop down after every buoy ----
     "On screen you click on the buoy choose port or starboard and then click on add another or finish." A bar at the foot of the
     chart shows the course so far as chips, with Undo, All the buoys and Finish; tapping a buoy offers Port or Starboard beside it.
     All the buoys: the whole list, searched by code or name, each with Port and Starboard, staying open while the course is typed in. */
  function chainBar() {
    var bar = $('solChain'); if (!bar) { bar = document.createElement('div'); bar.id = 'solChain'; bar.className = 'solchain'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Course being built'); document.body.appendChild(bar);
      bar.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var k = b.dataset.k;
        if (k === 'undo') { B.marks.pop(); saveB(); chainBar(); redraw(); } else if (k === 'list') list(true); else if (k === 'done') chain(false); else if (k === 'start') { pickStart('start'); }
        else if (b.dataset.i != null) { var i = +b.dataset.i, m = B.marks[i]; m.side = m.side === 'port' ? 'stbd' : 'port'; saveB(); chainBar(); redraw(); } }); }
    var n = B.marks.length, sd = function (m) { return m.side === 'stbd' ? 'S' : 'P'; };
    bar.innerHTML = '<div class="solcl"><b>' + (B.start ? (n ? 'Tap the next buoy' : 'Tap a buoy, then Port or Starboard') : 'Start: ') + '</b>' + (B.start ? '' : '<button class="btn" data-k="start">Pick the start</button>') + '<span class="solcn">' + n + ' mark' + (n === 1 ? '' : 's') + (n ? ', about ' + nm(build(true).err ? { start: B.start || B.marks[0], marks: B.marks, finish: B.start || B.marks[n - 1] } : build(true)) + ' nm' : '') + '</span></div>' +
      '<div class="solchips">' + (B.marks.length ? B.marks.map(function (m, i) { return '<button class="solchip ' + (m.side === 'stbd' ? 'stbd' : 'port') + '" data-i="' + i + '" title="Tap to swap Port and Starboard">' + (i + 1) + '. ' + esc(m.code || m.name) + ' ' + sd(m) + '</button>'; }).join('') : '<span class="note">No marks yet.</span>') + '</div>' +
      '<div class="xrow"><button class="btn" data-k="undo"' + (n ? '' : ' disabled') + '>Undo</button><button class="btn" data-k="list">All the buoys</button><button class="btn primary" data-k="done">Finish</button></div>';
    bar.hidden = !pick || pick !== 'chain';
  }
  function chain(on) {
    css(); if (on) { pick = 'chain'; B.type = 'marks'; saveB(); var s = $('solSheet'); if (s) s.hidden = true; load().then(function () { chainBar(); redraw(); }); chainBar(); redraw(); }
    else { pick = null; var bar = $('solChain'); if (bar) bar.hidden = true; var sp = $('solSide'); if (sp) sp.hidden = true; var L = $('solList'); if (L) L.hidden = true; openBuilder(); }
  }
  function sidePop(m, x, y) {
    hot(m.id);
    var p = $('solSide'); if (!p) { p = document.createElement('div'); p.id = 'solSide'; p.className = 'solside'; p.setAttribute('role', 'dialog'); document.body.appendChild(p); }
    var inIdx = -1; B.marks.forEach(function (q, i) { if (q.code === m.id) inIdx = i; });
    p.innerHTML = '<b>' + esc(m.id) + ' ' + esc(m.name) + '</b><div class="xrow"><button class="btn primary" data-s="port">Port</button><button class="btn primary" data-s="stbd">Starboard</button>' + (inIdx >= 0 ? '<button class="btn" data-s="del">Remove</button>' : '') + '<button class="btn" data-s="x" aria-label="Close">×</button></div>' + (m.flag ? '<span class="soln">' + esc(flagText(m.flag)) + '</span>' : '');
    var W = innerWidth, H = innerHeight; p.style.left = Math.max(8, Math.min(W - 280, x - 130)) + 'px'; p.hidden = false; var ph = p.offsetHeight || 96, sb = $('solStep'), lim = H - 8; if (sb && !sb.hidden) { var sr = sb.getBoundingClientRect(); if (sr.left < x + 140 && sr.right > x - 140 && sr.top > y) lim = sr.top - 6; } var tp = y + 18; if (tp + ph > lim) tp = y - 18 - ph; p.style.top = Math.max(60, Math.min(H - ph - 8, tp)) + 'px';
    p.onclick = function (e) { var b = e.target.closest('[data-s]'); if (!b) return; var s2 = b.dataset.s; p.hidden = true; HOT = null;
      if ((s2 === 'port' || s2 === 'stbd') && CE.i != null) { ceUse(m, s2); return; }
      if (s2 === 'port' || s2 === 'stbd') { B.marks.push({ code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon, side: s2 }); saveB(); }
      else if (s2 === 'del') { B.marks.splice(inIdx, 1); saveB(); }
      chainBar(); wzRender(); redraw(); };
  }
  function list(on) {
    css(); var L = $('solList');
    if (!L) { L = document.createElement('div'); L.id = 'solList'; L.className = 'sheet'; L.hidden = true;
      L.innerHTML = '<div class="in" role="dialog" aria-label="All the Solent buoys"><div class="shead"><h2>All the buoys</h2><button class="close" id="solListX" aria-label="Close the list">×</button></div><div class="sbody"><input type="search" id="solListQ" placeholder="Code or name, for example 3G or Royal" aria-label="Find a buoy" class="sollq"><p class="note" id="solListN"></p><div id="solListB"></div></div></div>';
      document.body.appendChild(L);
      /* Stuart 17 Nov 09:25 (tablet photo): the step box sat over the list of buoys. While the list is open the step box steps aside; it comes back when the list closes */
      try { new MutationObserver(function () { document.body.classList.toggle('sollist-on', !L.hidden); setTimeout(kbFit, 50); }).observe(L, { attributes: true, attributeFilter: ['hidden'] }); } catch (e) {}
      $('solListX').onclick = function () { L.hidden = true; if (pick === 'chain') chainBar(); };
      $('solListQ').addEventListener('input', fill);
      $('solListB').addEventListener('click', function (e) { var o = e.target.closest('[data-one]'); if (o) { var mo = mark(o.dataset.one); if (mo) { L.hidden = true; wzUse(mo, mo.lat, mo.lon, null, innerWidth / 2, innerHeight / 3); hot(mo.id); } return; } var b = e.target.closest('[data-add]'); if (!b) return; var m = mark(b.dataset.add); if (!m) return; if (CE.i != null) { ceUse(m, b.dataset.side); return; } B.marks.push({ code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon, side: b.dataset.side }); saveB(); fill(); chainBar(); wzRender(); redraw(); });   /* the list's own line says what was added: no message over the course bar */
    }
    function one() { return CE.i == null && WZ.on && wzKey() !== 'marks'; }   /* M14 (Stuart 17 Nov 05:36): wherever it says tap a buoy, the list: one buoy for the step in hand */
    function fill() {
      if (!MK) { $('solListB').innerHTML = '<p class="note">Loading the Solent mark list…</p>'; return; }
      var q = $('solListQ').value.trim().toLowerCase(), rows = MK.filter(function (m) { return !q || m.id.toLowerCase().indexOf(q) === 0 || m.name.toLowerCase().indexOf(q) >= 0; });
      var area = {}; rows.forEach(function (m) { var a = /^\d/.test(m.id) ? 'Area ' + m.id[0] : 'Other'; (area[a] = area[a] || []).push(m); });
      $('solListN').textContent = one() ? rows.length + ' of ' + MK.length + ' buoys. Choose one for: ' + ({ start: 'the start', wind: 'the windward mark', lee: 'the leeward mark', fin: 'the finish' }[wzKey()] || 'this step') + '.' : rows.length + ' of ' + MK.length + ' buoys. Course so far: ' + (B.marks.length ? B.marks.map(function (m) { return (m.code || m.name) + (m.side === 'stbd' ? ' S' : ' P'); }).join(', ') : 'none') + '.';
      $('solListB').innerHTML = Object.keys(area).sort().map(function (a) { return '<h4 class="solla">' + a + '</h4>' + area[a].sort(function (x, y) { return x.id < y.id ? -1 : 1; }).map(function (m) { return '<div class="sollr"><b>' + esc(m.id) + '</b><span>' + esc(m.name) + '<small>' + esc(COLN[m.col] || m.col || '') + '</small></span>' + (one() ? '<button class="btn" data-one="' + esc(m.id) + '">Choose</button>' : '<button class="btn" data-add="' + esc(m.id) + '" data-side="port">Port</button><button class="btn" data-add="' + esc(m.id) + '" data-side="stbd">Stbd</button>') + '</div>'; }).join(''); }).join('');
    }
    if (on) { load().then(fill); fill(); L.hidden = false; setTimeout(function () { try { $('solListQ').focus(); } catch (e) {} }, 100); } else L.hidden = true;
  }
  /* from the race list: a two-button card, Round the cans or Windward-leeward (Stuart 15 Nov 17:32) */
  /* Stuart 17 Nov 09:42 (tablet photo): "This pull down on first entering the tool takes up all the space maybe it should be design with round
     the cans logo little bouts with flags in random pattern and windward leeward straight up and down. This first pull down window could also
     show list of previously saved races". On Mark the first card drops from the top left, takes only the room it needs, offers the two
     courses as pictures, and lists the latest stored races to open with one tap */
  var PIC_CANS = '<svg viewBox="0 0 96 64" aria-hidden="true"><path d="M14 50 C30 20 44 14 58 22 S84 40 80 52 S40 60 14 50" fill="none" stroke="#93c5fd" stroke-width="2" stroke-dasharray="4 4"/>' +
    [[14, 50, '#facc15', '#ef4444'], [44, 16, '#ef4444', '#facc15'], [80, 30, '#22c55e', '#3b82f6'], [62, 56, '#facc15', '#22c55e']].map(function (q) { return '<line x1="' + q[0] + '" y1="' + (q[1] - 2) + '" x2="' + q[0] + '" y2="' + (q[1] - 14) + '" stroke="#e2e8f0" stroke-width="1.5"/><path d="M' + q[0] + ' ' + (q[1] - 14) + 'l8 3l-8 3z" fill="' + q[3] + '"/><circle cx="' + q[0] + '" cy="' + q[1] + '" r="4.5" fill="' + q[2] + '" stroke="#0b1b30" stroke-width="1"/>'; }).join('') +
    '<path d="M30 36l5-9l5 9z" fill="#fff" stroke="#0b1b30" stroke-width="1"/></svg>';
  var PIC_WL = '<svg viewBox="0 0 96 64" aria-hidden="true"><path d="M44 12V52" stroke="#93c5fd" stroke-width="2" stroke-dasharray="4 4"/><path d="M52 52V12" stroke="#93c5fd" stroke-width="2" stroke-dasharray="4 4"/><path d="M40 18l4-7l4 7z M48 46l4 7l4-7z" fill="#93c5fd"/>' +
    '<line x1="48" y1="8" x2="48" y2="-4" stroke="#e2e8f0" stroke-width="1.5"/><path d="M48 -4l8 3l-8 3z" fill="#ef4444"/><circle cx="48" cy="9" r="5" fill="#facc15" stroke="#0b1b30"/>' +
    '<line x1="48" y1="56" x2="48" y2="44" stroke="#e2e8f0" stroke-width="1.5"/><path d="M48 44l8 3l-8 3z" fill="#3b82f6"/><circle cx="48" cy="57" r="5" fill="#facc15" stroke="#0b1b30"/><path d="M64 34l5-9l5 9z" fill="#fff" stroke="#0b1b30"/><text x="80" y="14" fill="#93c5fd" font-size="9" font-weight="700" font-family="system-ui">WIND</text><path d="M88 18v10l-3-4m3 4l3-4" stroke="#93c5fd" stroke-width="1.5" fill="none"/></svg>';
  function markCard(c) {
    c.className = 'sheet solmk'; var live = B.shown && window.__navCourse && window.__navCourse(), sv = window.__fsSavedList ? window.__fsSavedList(4) : [], has = !!B.start && (B.type === 'wl' || (B.marks || []).length);
    c.innerHTML = '<div class="in" role="dialog" aria-label="Start new race"><div class="shead"><h2>Start new race</h2><button class="close" id="solCardX" aria-label="Close">×</button></div><div class="sbody">' +
      '<div class="solpics"><button class="btn solpic" id="solCardM">' + PIC_CANS + '<b>Round the cans</b><span>Buoys, Port or Starboard</span></button><button class="btn solpic" id="solCardW">' + PIC_WL + '<b>Windward-leeward</b><span>Up and down, laps</span></button></div>' +
      '<div class="solmenu">' + (live ? '<button class="btn" id="solCardStop">Stop race</button>' : '') + (has ? '<button class="btn" id="solCardOld">Last course</button>' : '') + '<button class="btn" id="solCardStored">Stored races</button><button class="btn" id="solCardT">Test mode</button></div>' +
      (sv.length ? '<div class="solsaved"><b class="solk">Stored races</b>' + sv.map(function (x) { return '<button class="solsv" data-svk="' + esc(x.kind) + '" data-svid="' + esc(x.id) + '"><b>' + esc(x.name) + '</b><span>' + (x.at ? new Date(x.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '') + (x.sum ? ' · ' + esc(x.sum) : '') + '</span></button>'; }).join('') + '</div>' : '') + '</div></div>';
    c.onclick = function (e) { if (e.target === c) { c.hidden = true; return; } var q = e.target.closest('[data-svk]'); if (q && window.__fsOpenSaved) { c.hidden = true; window.__fsOpenSaved(q.dataset.svk, q.dataset.svid); } };
  }
  function startCard() {
    var ssx = $('solStartScr'); if (ssx && !ssx.hidden) { ssx.hidden = true; SQ.small = B.startAt; }   /* the race menu comes in front of the start screen */
    css(); var c = $('solCard'); if (!c) { c = document.createElement('div'); c.id = 'solCard'; c.className = 'sheet'; c.hidden = true; document.body.appendChild(c); }
    var prev = null, has = !!B.start && (B.type === 'wl' || (B.marks || []).length);
    c.innerHTML = '<div class="in" role="dialog" aria-label="Solent race"><div class="shead"><h2>Solent race</h2><button class="close" id="solCardX" aria-label="Close">×</button></div><div class="sbody">' + (window.FS_MARK ? '<div class="solmenu"><b>Start new race</b>' + (B.shown && window.__navCourse && window.__navCourse() ? '<button class="btn" id="solCardStop">Stop race</button>' : '') + '<button class="btn" id="solCardStored">Stored races</button></div>' : '') + '<p class="note">Marks from the JOG / SCRA Solent mark list 2026. The chart prompts you one step at a time.</p><div class="solcards"><button class="btn primary" id="solCardM"><b>Round the cans</b><span>Start, then tap each buoy with Port or Starboard, then the finish</span></button><button class="btn" id="solCardW"><b>Windward-leeward</b><span>Start, windward mark, leeward mark or gate, laps</span></button></div>' +
      (window.FS_MARK ? '<p class="note"><button class="linkbtn" id="solCardT">Test mode</button>: a practice boat sails a course on the chart, so you can watch the start, the line, the racing window and the finish ashore. Nothing goes to the crew.</p>' : '') +
      (has ? '<p class="note">Your last course: ' + esc(B.type === 'wl' ? 'windward-leeward' : B.marks.length + ' marks') + '. <button class="linkbtn" id="solCardOld">Open it</button></p>' : '') +
      (prev ? '<p class="note">' + esc(prev.name) + ' is kept with its routes. <button class="linkbtn" id="solCardOff">Back to ' + esc(prev.short || prev.name) + '</button></p>' : '') + '</div></div>';
    var now0 = Date.now() / 1000, run = window.FS_MARK && B.shown && B.startAt && now0 >= B.startAt && now0 < B.startAt + 10 * 3600 && !(B.ended > B.startAt * 1000);
    if (run) { var gd = new Date(B.startAt * 1000); c.innerHTML = '<div class="in" role="dialog" aria-label="Race under way"><div class="shead"><h2>Race under way</h2><button class="close" id="solCardX" aria-label="Close">×</button></div><div class="sbody"><p class="note">The gun went at ' + ('0' + gd.getHours()).slice(-2) + ':' + ('0' + gd.getMinutes()).slice(-2) + '. The course is locked: a tap on the chart cannot change it.</p><div class="solcards"><button class="btn" id="solCardE"><b>Edit course</b><span>Change the marks of this race (the committee shortened or changed the course)</span></button><button class="btn" id="solCardN"><b>Start new race</b><span>File this race\'s track, keep the line and the wind, then set the next course</span></button><button class="btn" id="solCardS"><b>Stop race</b><span>End this race now and file its track</span></button><button class="btn" id="solCardR"><b>Stored races</b><span>Earlier races and courses on this device</span></button></div></div></div>';
      c.hidden = false; $('solCardX').onclick = function () { c.hidden = true; }; $('solCardE').onclick = function () { c.hidden = true; showList(); }; $('solCardN').onclick = function () { c.hidden = true; B.ended = Date.now(); saveB(); newCourse(); }; $('solCardS').onclick = function () { c.hidden = true; stopRace(); }; $('solCardR').onclick = function () { c.hidden = true; if (window.__fsStoredRaces) window.__fsStoredRaces(); }; return; }   /* M15 (Stuart 17 Nov 05:41): after the start, the course changes only through Edit course */
    c.hidden = false; $('solCardX').onclick = function () { c.hidden = true; };
    if (!B.plan) B.plan = 'list';
    if (window.FS_MARK) markCard(c);
    $('solCardX').onclick = function () { c.hidden = true; };
    $('solCardM').onclick = function () { c.hidden = true; B.type = 'marks'; B.marks = []; B.legTide = []; B.fin = 'start'; B.finish = null; if (window.FS_MARK) B.sk = 'line'; saveB(); wzOpen(1); };   /* Mark: a start line by default, as most inshore races start */
    $('solCardW').onclick = function () { c.hidden = true; B.type = 'wl'; B.legTide = []; if (window.FS_MARK && !B.wl.wset) { B.wl.wkind = 'buoy'; B.wl.lkind = 'pt'; B.wl.wset = 1; } if (window.FS_MARK) B.sk = 'line'; saveB(); wzOpen(1); };   /* Mark (Stuart 05:49): tap a buoy, then a point anywhere, then the start line */
    if ($('solCardT')) $('solCardT').onclick = function () { c.hidden = true; testStart(); };
    if ($('solCardStop')) $('solCardStop').onclick = function () { c.hidden = true; stopRace(); };
    if ($('solCardStored')) $('solCardStored').onclick = function () { c.hidden = true; if (window.__fsStoredRaces) window.__fsStoredRaces(); };
    if ($('solCardOld')) $('solCardOld').onclick = function () { c.hidden = true; wzOpen(wzSteps().length); };
    if ($('solCardOff')) $('solCardOff').onclick = function () { c.hidden = true; wzOpen(0); if (window.__fsInshore) window.__fsInshore(false); };
  }

  /* ---- the course, one prompt at a time (Stuart 16 Nov 07:48 "Yes the first in the list maybe the box can be dragged around simply to
     put clear of phone windows"; 08:00 "Yes very good logic please build"). One small box: what to do now, what has been chosen, Back,
     Next and Cancel. Taps on the chart answer the step. It never sends you to the big Solent sheet. Drag it by its grip anywhere on the
     screen; it remembers where. Windward-leeward: 1 start, 2 windward mark, 3 leeward mark or gate, 4 laps and finish, 5 check and route.
     Round the cans: 1 start, 2 the buoys, 3 finish, 4 check and route. ---- */
  var WZ = { on: false, n: 1 };
  /* Simpler Solent racing (Stuart 16 Nov 18:30, decided 18:40): the first step asks Route or not (No routing first) and the wind;
     the start can be a line of two ends, tapped or pinged and kept for the next course; windward and leeward marks can be any point,
     tapped or pinged, and a gate any two points. Not routed, the course shows as a list of bearings, distances and leg types. */
  function wzSteps() { var rt = B.plan === 'route'; return B.type === 'wl' ? ['plan', 'wind', 'lee', 'start', 'laps'].concat(rt ? ['wt'] : [], ['check']) : ['plan', 'start', 'marks', 'fin'].concat(rt ? ['wt'] : [], ['check']); }
  function P(m, la, lo, label) { return m ? { code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon } : { code: null, name: label === 'A' || label === 'B' ? 'Gate ' + label : label + ' mark', short: label, lat: la, lon: lo }; }
  function lineNow() { var l = window.__fsLine ? window.__fsLine() : {}; return l && l.boat && l.pin ? l : null; }
  function lineStart() { var l = lineNow(); if (!l) return null; return { code: null, name: 'Start line', lat: (l.boat[0] + l.pin[0]) / 2, lon: (l.boat[1] + l.pin[1]) / 2, line: true }; }
  function lineInfo() { var l = lineNow(); if (!l) return ''; var a = { lat: l.boat[0], lon: l.boat[1] }, b = { lat: l.pin[0], lon: l.pin[1] }, k = Math.cos(a.lat * R), dx = (b.lon - a.lon) * k * 60, dy = (b.lat - a.lat) * 60, len = Math.hypot(dx, dy) * 1852, t = 'Line ' + Math.round(len) + ' m';
    var w = windRef(); if (w && w.twd != null) { var ux = Math.sin(w.twd * R), uy = Math.cos(w.twd * R), up = (dx * ux + dy * uy) * 1852; t += Math.abs(up) < 2 ? ', square to the wind' : ', ' + (up > 0 ? 'pin' : 'committee boat') + ' end favoured by ' + Math.round(Math.abs(up)) + ' m'; } return t + '.'; }
  function ping(fn) { var f = null; try { f = window.__fsLiveFix && window.__fsLiveFix(); } catch (e) {} if (!f || f.dr || Date.now() - f.at > 30000) { if (window.__fsLiveOpen) window.__fsLiveOpen(); WZ.msg = 'No GPS fix yet: the GPS is starting. Tap Ping again in a moment.'; wzRender(); return; } if (window.__fsOnLand && window.__fsOnLand(f.la, f.lo)) { WZ.msg = 'The GPS puts you on land, so nothing was pinged. Ping from the boat, or tap the point on the chart.'; wzRender(); return; } fn(f.la, f.lo); }
  /* the race's wind: typed, head to wind, or the boat's instruments (Route+); used for the leg list, line bias and header or lift */
  function windRef() { if (B.wind && B.wind.twd != null) return B.wind; var nw = null; try { nw = window.__navWind ? window.__navWind() : null; } catch (e) {} if (nw && nw[1] != null) { B.wind = { twd: Math.round(nw[1]), src: 'boat', at: Date.now() }; saveB(); return B.wind; }
    if (ROUTE && window.__fsWindAt) { var p0 = kitPos(), fw = p0 ? window.__fsWindAt(p0[0], p0[1], B.startAt || null) : null; if (fw && fw.twd != null) return { twd: Math.round(fw.twd), tws: Math.round(fw.tws), src: 'forecast' }; }   /* F44: Route has the forecast */
    return null; }
  function kitPos() { var l = lineNow(); if (l) return [(l.boat[0] + l.pin[0]) / 2, (l.boat[1] + l.pin[1]) / 2]; var f = null; try { f = window.__fsLiveFix && window.__fsLiveFix(); } catch (e) {} return f ? [f.la, f.lo] : null; }
  function headToWind() { var done = false, fin = function (h, src) { if (done) return; done = true; window.removeEventListener('deviceorientationabsolute', onO, true); window.removeEventListener('deviceorientation', onO, true); B.wind = { twd: Math.round(((h % 360) + 360) % 360), src: src, at: Date.now() }; saveB(); WZ.msg = 'Wind set from ' + src + ': ' + ('00' + B.wind.twd).slice(-3) + '°.'; wzRender(); };
    var dr = null; try { dr = window.__navDR && window.__navDR(); } catch (e) {} if (dr && dr.hdg != null) return fin(dr.hdg, 'the boat\'s heading');
    function onO(e) { var h = e.webkitCompassHeading != null ? e.webkitCompassHeading : (e.absolute && e.alpha != null ? 360 - e.alpha : null); if (h != null) fin(h, 'the phone\'s compass (magnetic, within a degree in the Solent)'); }
    var go2 = function () { window.addEventListener('deviceorientationabsolute', onO, true); window.addEventListener('deviceorientation', onO, true); setTimeout(function () { if (!done) { done = true; window.removeEventListener('deviceorientationabsolute', onO, true); window.removeEventListener('deviceorientation', onO, true); WZ.msg = 'No compass on this device: type the wind direction instead.'; wzRender(); } }, 3000); };
    try { if (window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) DeviceOrientationEvent.requestPermission().then(function (r) { if (r === 'granted') go2(); else { WZ.msg = 'Compass not allowed: type the wind direction instead.'; wzRender(); } }, function () { go2(); }); else go2(); } catch (e) { go2(); } }
  /* the wind from the two tacks (as Vakaros and Velocitek, research 16 Nov): close-hauled on each tack, tap; the wind is midway between the two headings and half the angle is the boat's own angle to the wind */
  function tackRef(side) { var h = null, src = ''; try { var dr = window.__navDR && window.__navDR(); if (dr && dr.hdg != null) { h = dr.hdg; src = 'heading'; } } catch (e) {} if (h == null) { try { h = window.__fsCog ? window.__fsCog() : null; src = 'course made good'; } catch (e) {} }
    if (h == null) { if (window.__fsLiveOpen) window.__fsLiveOpen(); WZ.msg = 'Needs the boat moving with GPS on (or the boat\'s compass): sail close-hauled for half a minute, then tap again.'; wzRender(); return; }
    B.tref = B.tref || {}; B.tref[side] = Math.round(h); var s1 = B.tref.stbd, p1 = B.tref.port;
    if (s1 != null && p1 != null) { var d = ((p1 - s1 + 540) % 360) - 180, mid = (s1 + d / 2 + 360) % 360, ba = Math.abs(d) / 2; if (ba < 25 || ba > 65) { WZ.msg = 'The two headings are ' + Math.round(Math.abs(d)) + '° apart, not a tack: record each tack again.'; B.tref = {}; } else { B.wind = { twd: Math.round(mid), ba: Math.round(ba), src: 'your two tacks (' + src + ')', at: Date.now() }; WZ.msg = 'Wind from ' + ('00' + B.wind.twd).slice(-3) + '°, tacking through ' + Math.round(Math.abs(d)) + '°.'; } }
    else WZ.msg = (side === 'stbd' ? 'Starboard' : 'Port') + ' tack recorded: ' + ('00' + Math.round(h)).slice(-3) + '°. Now the other tack.';
    saveB(); wzRender(); }
  function models() { return [].slice.call(document.querySelectorAll('[data-m]')).filter(function (c) { return !c.disabled; }).map(function (c) { var l = c.closest('label'), t = l ? l.textContent.trim().split(/\s{2,}|\n|·|\(/)[0].trim() : c.getAttribute('data-m'); return { id: c.getAttribute('data-m'), name: t.slice(0, 18) }; }); }
  /* the wind typed on the water (Stuart 16 Nov: "a neat way of adding wind direction speeds and tide on the non connected version") feeds Route's Fixed wind route */
  function fixWind() { try { var w = B.wind; if (window.__fsFix && w && w.twd != null && w.tws > 0) window.__fsFix.set({ on: true, tws: +w.tws, twd: +w.twd }); } catch (e) {} }
  function wzKey() { return wzSteps()[WZ.n - 1]; }
  function wzOk(k) { var w = B.wl;
    if (k === 'start') return B.sk === 'line' ? !!lineNow() : !!B.start; if (k === 'wind') return w.wkind === 'brg' || !w.wkind ? (w.brg >= 0 && w.brg <= 360 && w.dist > 0) : !!windward(); if (k === 'lee') return w.lkind === 'start' || !w.lkind || !!leeward(); if (k === 'marks') return (B.marks || []).length > 0;
    if (k === 'fin') return B.fin !== 'mark' || !!B.finish; return true; }
  function wzOpen(n) {
    css(); if (!n) { WZ.on = false; var b0 = $('solStep'); if (b0) b0.hidden = true; pick = null; redraw(); return; }
    pick = null; ['solChain', 'solSheet', 'solPick'].forEach(function (id) { var e = $(id); if (e) e.hidden = true; });
    if (window.__fsPanelClose) window.__fsPanelClose();   /* the most chart to tap on: the results panel folds away while building */
    if (!C.on) setOn(true); zoomMax(); WZ.on = true; WZ.n = Math.max(1, Math.min(n, wzSteps().length));
    load().then(function () { wzRender(); redraw(); }); wzBox(); wzRender(); redraw();
  }
  function wzBox() {
    var b = $('solStep'); if (b) return b;
    b = document.createElement('div'); b.id = 'solStep'; b.className = 'solstep'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Solent race, step by step'); document.body.appendChild(b);
    var pos = ld('fs-solstep-pos', null); if (pos) place(b, pos.x, pos.y);
    b.addEventListener('click', function (e) { var t = e.target.closest('button'); if (!t || !b.contains(t)) return; var k = t.dataset.k, v = t.dataset.v, w = B.wl;
      if (k === 'x') { wzOpen(0); return; } if (k === 'back' || k === 'next') WZ.msg = '';
      if (k === 'back') { WZ.n = Math.max(1, WZ.n - 1); } else if (k === 'next') { if (wzOk(wzKey())) WZ.n = Math.min(wzSteps().length, WZ.n + 1); }
      else if (k === 'go') { if (go()) wzOpen(0); return; }
      else if (k === 'wk') w.wkind = v; else if (k === 'lk') { w.lkind = v; if (v === 'gate') { w.lcode = ''; w.lcode2 = ''; w.g1 = null; w.g2 = null; } }
      else if (k === 'fc') { b.dataset.msg = fcWind(); } else if (k === 'lap') w.laps = Math.max(1, Math.min(6, (w.laps || 1) + (+v))); else if (k === 'wf') w.fin = v; else if (k === 'sd') w.side = v;
      else if (k === 'fin') { B.fin = v; if (v === 'start') B.finish = null; } else if (k === 'undo') B.marks.pop(); else if (k === 'list') { list(true); return; }
      else if (k === 'code') { wzCode(v); return; }
      else if (k === 'plan') { B.plan = v; } else if (k === 'tm') { B.tide = Object.assign({}, B.tide, { mode: v }); pushTide(); } else if (k === 'model') { B.model = v; }
      else if (k === 'models') { var cur = (B.models && B.models.length ? B.models : [B.model || 'ukv']).slice(), ix = cur.indexOf(v); if (ix >= 0) { if (cur.length > 1) cur.splice(ix, 1); } else cur.push(v); B.models = cur; B.model = cur[0]; }
      else if (k === 'tref') { tackRef(v); return; } else if (k === 'htw') { headToWind(); return; }
      else if (k === 'bw') { var nw = null; try { nw = window.__navWind && window.__navWind(); } catch (x) {} if (nw) { B.wind = { twd: Math.round(nw[1]), src: 'boat', at: Date.now() }; WZ.msg = ''; } else WZ.msg = 'No wind from the boat yet.'; }
      else if (k === 'lt') { if (window.__fsLineKind) window.__fsLineKind(v === 'tr'); }
      else if (k === 'lm') { B.lm = v; WZ.end = null; }
      else if (k === 'llset') { llSet(); return; }
      else if (k === 'bias') { biasView(); return; }
      else if (k === 'sk') { B.sk = v; WZ.end = null; B.start = v === 'line' ? lineStart() : (B.start && B.start.line ? null : B.start); }
      else if (k === 'lping') { ping(function (la, lo) { var lo0 = window.__fsLine ? window.__fsLine() : {}, other = lo0[v === 'boat' ? 'pin' : 'boat']; if (other && Math.hypot(la - other[0], (lo - other[1]) * Math.cos(la * R)) * 60 < 0.011) { WZ.msg = 'Both ends would be the same place (under 20 m apart): ping the other end as you pass it.'; wzRender(); return; } if (window.__fsSetLine) window.__fsSetLine(v, la, lo); B.start = lineStart(); saveB(); wzRender(); redraw(); }); return; }
      else if (k === 'lclr') { if (window.__fsSetLine) { window.__fsSetLine('boat', null); window.__fsSetLine('pin', null); } B.start = null; WZ.end = 'boat'; }
      else if (k === 'pping') { ping(function (la, lo) { if (v === 'w') w.wpt = P(null, la, lo, 'Windward'); else if (v === 'l') w.lpt = P(null, la, lo, 'Leeward'); else { var gp = P(null, la, lo, w.g1 && !w.g2 ? 'B' : 'A'); if (!w.g1 || w.g2) { w.g1 = gp; w.g2 = null; } else w.g2 = gp; } saveB(); wzRender(); redraw(); }); return; }
      else if (k === 'side') { var m = B.marks[+v]; m.side = m.side === 'stbd' || m.side === 'starboard' ? 'port' : 'stbd'; }
      saveB(); wzRender(); redraw(); });
    b.addEventListener('change', function (e) { var t = e.target, w = B.wl;
      if (t.id === 'solTwd') { var tv = +t.value, ks = B.wind && B.wind.tws; B.wind = t.value === '' ? null : { twd: ((tv % 360) + 360) % 360, tws: ks, src: 'typed', at: Date.now() }; fixWind(); } else if (t.id === 'solTws') { var sp0 = t.value === '' ? null : Math.max(0, Math.min(60, +t.value)); B.wind = Object.assign({}, B.wind || {}, { tws: sp0, at: Date.now() }); if (B.wind.twd == null) B.wind.src = 'typed'; fixWind(); } else if (t.id === 'solSbrg') { var v = +t.value; w.brg = t.value === '' ? null : ((v % 360) + 360) % 360; } else if (t.id === 'solSdist') w.dist = Math.round(Math.max(0.2, Math.min(10, +t.value || 1)) * 10) / 10; else if (t.id === 'solSname') B.name = t.value.trim() || 'Solent race'; else if (t.id === 'solStartT') { var tp = Date.parse(t.value); if (tp === tp) B.startAt = Math.round(tp / 1000); } else if (t.id === 'solCode' || t.id === 'solLLb' || t.id === 'solLLp') return; else if (t.id === 'solTdS' || t.id === 'solTdD') { B.tide = Object.assign({ mode: 'hand' }, B.tide); if (t.id === 'solTdS') B.tide.spd = t.value === '' ? null : Math.max(0, Math.min(8, +t.value)); else B.tide.dir = t.value === '' ? null : ((Math.round(+t.value) % 360) + 360) % 360; saveB(); pushTide(); }
      else if (t.id === 'solLen' || t.id === 'solBrg') { if (t.id === 'solLen') B.llen = Math.max(20, Math.min(3000, Math.round(+t.value || 300))); else B.lbrg = t.value === '' ? null : ((Math.round(+t.value) % 360) + 360) % 360; var lq = window.__fsLine ? window.__fsLine() : {}; if (B.lm === 'square' && lq.boat) squareFrom(lq.boat[0], lq.boat[1]); }
      saveB(); wzRender(); redraw(); });
    b.addEventListener('keydown', function (e) { if (e.target.id === 'solCode' && e.key === 'Enter') { e.preventDefault(); wzCode(wzKey() === 'marks' ? 'port' : null); } });
    /* drag by the grip */
    var drag = null;
    b.addEventListener('pointerdown', function (e) { if (!e.target.closest('.solgrip')) return; var r = b.getBoundingClientRect(); drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, id: e.pointerId }; try { b.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); });
    b.addEventListener('pointermove', function (e) { if (!drag || e.pointerId !== drag.id) return; place(b, e.clientX - drag.dx, e.clientY - drag.dy); });
    var end = function (e) { if (!drag || e.pointerId !== drag.id) return; drag = null; var r = b.getBoundingClientRect(); sv('fs-solstep-pos', { x: r.left, y: r.top }); };
    b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
    window.addEventListener('resize', function () { var r = b.getBoundingClientRect(); if (b.style.top) place(b, r.left, r.top); });
    return b;
  }
  /* Issue 1 (Stuart 16 Nov 21:29, iPhone photo): typing in the box, the keyboard and its bar covered it. While a field in the box has
     the keyboard, the box sits at the top of the visible screen, above the keyboard, and goes back when the keyboard closes. */
  function kbFit() { var b = $('solStep'), vv = window.visualViewport; if (!b || !vv) return; var f = document.activeElement, typing = !!(f && b.contains(f) && /^(INPUT|TEXTAREA|SELECT)$/.test(f.tagName)), kb = window.__fsKbUp ? window.__fsKbUp() : innerHeight - vv.height > 120, touch = (navigator.maxTouchPoints || 0) > 0 && f && /^(INPUT|TEXTAREA)$/.test(f.tagName) && f.type !== 'range';
    if (typing && (kb || touch)) {   /* 17 Nov (Stuart's iPhone photo): on a touch screen the box goes to the top as soon as a field takes the cursor, whatever Safari reports, so the keyboard cannot cover it */ if (!b.dataset.kb) b.dataset.kb = JSON.stringify({ t: b.style.top, l: b.style.left, r: b.style.right, bo: b.style.bottom, m: b.style.maxHeight, mg: b.style.margin }); b.style.top = Math.round(vv.offsetTop + 8) + 'px'; b.style.bottom = 'auto'; b.style.maxHeight = Math.round((kb ? vv.height : vv.height * 0.45) - 16) + 'px'; b.style.margin = '0 auto'; b.style.left = ''; b.style.right = ''; try { f.scrollIntoView({ block: 'nearest' }); } catch (e) {} }
    else if (b.dataset.kb) { var o = JSON.parse(b.dataset.kb); delete b.dataset.kb; b.style.top = o.t; b.style.left = o.l; b.style.right = o.r; b.style.bottom = o.bo; b.style.maxHeight = o.m; b.style.margin = o.mg; } }
  if (window.visualViewport) { visualViewport.addEventListener('resize', kbFit); visualViewport.addEventListener('scroll', kbFit); }
  document.addEventListener('focusin', function () { setTimeout(kbFit, 300); }); document.addEventListener('focusout', function () { setTimeout(kbFit, 300); });
  function place(b, x, y) { var w = b.offsetWidth || 300, h = b.offsetHeight || 160; x = Math.max(4, Math.min(innerWidth - w - 4, x)); y = Math.max(4, Math.min(innerHeight - Math.min(h, 120), y)); b.style.left = x + 'px'; b.style.top = y + 'px'; b.style.right = 'auto'; b.style.bottom = 'auto'; b.style.margin = '0'; }
  /* F17 (Stuart 16 Nov 12:46): a click that misses says so in the box, naming the nearest buoy; a buoy can also be typed by its code */
  function nearest(la, lo) { var best = null, bd = 1e9; (MK || []).forEach(function (m) { var dx = (m.lon - lo) * Math.cos(la * R) * 60, dy = (m.lat - la) * 60, d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = m; } }); return best ? { m: best, nm: bd } : null; }
  function miss(la, lo) { var n = nearest(la, lo); WZ.msg = 'No buoy there.' + (n ? ' Nearest: ' + n.m.id + ' ' + n.m.name + ', ' + (n.nm < 0.1 ? Math.round(n.nm * 1852) + ' m' : n.nm.toFixed(1) + ' nm') + ' away. Click on its dot, or type its code below.' : ''); wzRender(); return true; }
  function wzUse(m, la, lo, side, x, y) {   /* one buoy (or point) for the step in hand; m null = a point on the chart */
    var k = wzKey(), w = B.wl; WZ.msg = '';
    if (!m && window.__fsOnLand && window.__fsOnLand(la, lo) && ['start', 'wind', 'lee', 'fin'].indexOf(k) >= 0) { WZ.msg = 'That point is on land: tap in the water.'; wzRender(); return true; }   /* 21:33: no marks or line ends on land */
    if (k === 'start' && B.sk === 'line' && B.lm === 'square') { var q1 = m || { lat: la, lon: lo }; if (!squareFrom(q1.lat, q1.lon)) return true; }
    else if (k === 'start' && B.sk === 'line' && (B.lm === 'll' || B.lm === 'ping')) { WZ.msg = B.lm === 'll' ? 'Type the two ends above, or choose Tap the ends.' : 'Ping each end as you pass it, or choose Tap the ends.'; wzRender(); return true; }
    else if (k === 'start' && B.sk === 'line') { var l0 = window.__fsLine ? window.__fsLine() : {}, end = WZ.end || (l0.boat && !l0.pin ? 'pin' : 'boat'), q0 = m || { lat: la, lon: lo }; if (end === 'pin' && l0.boat && Math.hypot(q0.lat - l0.boat[0], (q0.lon - l0.boat[1]) * Math.cos(q0.lat * R)) * 60 < 0.011) { WZ.msg = 'That is the committee boat end: tap the pin end.'; wzRender(); return true; } if (window.__fsSetLine) window.__fsSetLine(end, q0.lat, q0.lon); WZ.end = end === 'boat' ? 'pin' : 'boat'; B.start = lineStart(); }
    else if (k === 'start') { B.start = m ? { code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon } : { code: null, name: 'Point ' + la.toFixed(4) + ', ' + lo.toFixed(4), lat: la, lon: lo }; }
    else if (k === 'wind' && w.wkind === 'buoy') { if (!m) return miss(la, lo); w.wcode = m.id; }
    else if (k === 'wind' && w.wkind === 'pt') { w.wpt = P(m, la, lo, 'Windward'); }
    else if (k === 'lee' && w.lkind === 'buoy') { if (!m) return miss(la, lo); w.lcode = m.id; }
    else if (k === 'lee' && w.lkind === 'pt') { w.lpt = P(m, la, lo, 'Leeward'); }
    else if (k === 'lee' && w.lkind === 'gate') { var gp = P(m, la, lo, w.g1 && !w.g2 ? 'B' : 'A'); if (!w.g1 || w.g2) { w.g1 = gp; w.g2 = null; } else if (Math.hypot(gp.lat - w.g1.lat, (gp.lon - w.g1.lon) * Math.cos(gp.lat * R)) * 60 < 0.01) { WZ.msg = 'That is the same mark as the first: tap the other end of the gate.'; wzRender(); return true; } else w.g2 = gp; w.lcode = ''; w.lcode2 = ''; }
    else if (k === 'marks') { if (!m) return miss(la, lo); if (side) { B.marks.push({ code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon, side: side }); } else { sidePop(m, x, y); wzRender(); return true; } }
    else if (k === 'fin' && B.fin === 'mark') { B.finish = m ? { code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon } : { code: null, name: 'Point ' + la.toFixed(4) + ', ' + lo.toFixed(4), lat: la, lon: lo }; }
    else return false;
    saveB(); wzRender(); redraw(); return true;
  }
  function wzTap(la, lo, x, y) { return wzUse(hit(x, y), la, lo, null, x, y); }
  function wzCode(side) { var e = $('solCode'), v = e ? e.value.trim().toUpperCase() : '', m = mark(v); if (!v) return; if (!m) { WZ.msg = 'No Solent mark ' + v + ' in the 2026 list. Check the code on the course board.'; wzRender(); return; } wzUse(m, m.lat, m.lon, side || null, innerWidth / 2, innerHeight / 3); }
  function codeRow(k) { var w = B.wl, need = (k === 'start' && B.sk !== 'line') || (k === 'wind' && w.wkind === 'buoy') || (k === 'lee' && (w.lkind === 'buoy' || w.lkind === 'gate')) || k === 'marks' || (k === 'fin' && B.fin === 'mark'); if (!need) return '';
    return '<div class="solcl"><input id="solCode" class="solcode" maxlength="3" autocomplete="off" autocapitalize="characters" placeholder="Code, e.g. 3G" aria-label="Mark code">' + (k === 'marks' ? '<button class="btn" data-k="code" data-v="port">Add, Port</button><button class="btn" data-k="code" data-v="stbd">Add, Starboard</button>' : '<button class="btn" data-k="code" data-v="">Use</button><button class="btn" data-k="list">List of buoys</button>') + '</div>'; }
  function wzRender() {
    var b = $('solStep'); if (!b || !WZ.on) return; var k = wzKey(), w = B.wl, N = wzSteps().length, ok = wzOk(k);
    var seg = function (key, cur, opts) { return '<span class="seg">' + opts.map(function (o) { return '<button type="button" data-k="' + key + '" data-v="' + o[0] + '" aria-pressed="' + (cur === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</span>'; };
    var got = function (t) { return '<p class="solgot">' + t + '</p>'; }, h = '', ask = '';
    if (k === 'plan') { ask = 'Route this race, or not?'; var mm = models(); if (B.plan === 'route' && (!B.model || !mm.some(function (q) { return q.id === B.model; }))) B.model = (mm.filter(function (q) { return q.id === 'ukv'; })[0] || mm[0] || {}).id;
      h = '<div class="solcl">' + seg('plan', B.plan === 'route' ? 'route' : 'list', [['list', 'No routing'], ['route', 'Route it']]) + '</div>' + got(B.plan === 'route' ? 'Routes on one forecast model, plus a Fixed wind route if you give the wind on the water.' : 'The course as a list: bearing, distance and leg type for each leg. Route is one tap away later.');
      if (B.plan === 'route' && mm.length) { var sel = (B.models && B.models.length ? B.models : [B.model || 'ukv']); h += '<div class="solcl"><span class="solk">Models</span><span class="seg solmulti">' + mm.map(function (q) { return '<button type="button" data-k="models" data-v="' + q.id + '" aria-pressed="' + (sel.indexOf(q.id) >= 0) + '">' + esc(q.name) + '</button>'; }).join('') + '</span></div>' + got('Tick 1 to ' + mm.length + ' models; each gives its own route. Finer models (UKV, AROME) see more of the Solent.'); }
      var wr = B.wind; h += '<div class="solcl"><label class="solk" for="solTwd">Wind from</label><input id="solTwd" type="number" inputmode="numeric" min="0" max="360" value="' + (wr && wr.twd != null ? wr.twd : '') + '" placeholder="°T" aria-label="Wind direction, degrees true">°T <input id="solTws" type="number" inputmode="decimal" min="0" max="60" step="0.5" value="' + (wr && wr.tws != null ? wr.tws : '') + '" placeholder="kn" aria-label="Wind speed, knots"> kn <button class="btn" data-k="htw" title="Point the bow into the wind, then tap">Head to wind</button><button class="btn" data-k="tref" data-v="stbd" title="Sailing close-hauled on starboard, tap to record the heading">Starboard tack' + (B.tref && B.tref.stbd != null ? ' ✓' : '') + '</button><button class="btn" data-k="tref" data-v="port" title="Sailing close-hauled on port, tap to record the heading">Port tack' + (B.tref && B.tref.port != null ? ' ✓' : '') + '</button>' + (window.__navWind ? '<button class="btn" data-k="bw">From the boat</button>' : '') + '</div>' + got(wr && wr.twd != null ? 'For leg types, line bias and header or lift' + (wr.src && wr.src !== 'typed' ? ' (from ' + esc(wr.src) + ')' : '') + '.' : 'Optional: for leg types, line bias and header or lift.');
      var tdm = (B.tide && B.tide.mode) || 'model', tz0 = tideRef(); h += '<div class="solcl"><span class="solk">Tide</span>' + seg('tm', tdm, [['model', 'Forecast'], ['hand', 'By hand']].concat(window.__navTide ? [['boat', 'From the boat']] : [])) + '</div>' +
        (tdm === 'hand' ? '<div class="solcl"><label class="solk" for="solTdS">Rate</label><input id="solTdS" type="number" inputmode="decimal" min="0" max="8" step="0.1" value="' + (B.tide.spd != null ? B.tide.spd : '') + '" placeholder="kn" aria-label="Tide rate, knots"> kn <label class="solk" for="solTdD">running to</label><input id="solTdD" type="number" inputmode="numeric" min="0" max="359" value="' + (B.tide.dir != null ? B.tide.dir : '') + '" placeholder="°T" aria-label="Direction the tide runs to, degrees true">°T</div>' : '') +
        got(tdm === 'hand' ? 'The tide you see at the start (a buoy or a moored boat): the rate and the direction it runs to. Used for the laylines on the start screen and for every route.' : tdm === 'boat' ? 'Set and drift from the instruments, or worked out from GPS against log and compass. ' + esc(tideTxt(tz0)) + '.' : 'Route\'s tidal streams at the line: ' + esc(tideTxt(tz0)) + '. Choose By hand if the water says otherwise.'); }
    else if (k === 'start') { var ln = B.sk === 'line', lm = B.lm || 'tap', l1 = window.__fsLine ? window.__fsLine() : {}, tr = !!l1.transit;
      ask = !ln ? 'Tap the start on the chart' : lm === 'square' ? (l1.boat && l1.pin ? 'Start line set' : 'Tap the committee boat') : lm === 'll' ? 'Type the two ends' : lm === 'ping' ? (lineNow() ? 'Start line set' : 'Ping each end as you pass it') : (WZ.end === 'pin' || (l1.boat && !l1.pin) ? 'Tap the pin end' : lineNow() ? 'Start line set' : 'Tap the committee boat end');
      h = '<div class="solcl">' + seg('sk', ln ? 'line' : 'buoy', [['line', 'A start line'], ['buoy', 'A buoy or point']]) + '</div>';
      if (ln) {
        h += '<div class="solcl solmulti">' + seg('lm', lm, [['tap', 'Tap the ends'], ['square', 'Boat, direction, length'], ['ll', 'Lat and long'], ['ping', 'Ping']]) + '</div>';
        if (lm === 'square') { var wq = windRef(); h += '<div class="solcl"><label class="solk" for="solBrg">Direction</label><input id="solBrg" type="number" inputmode="numeric" min="0" max="359" value="' + (B.lbrg != null ? B.lbrg : '') + '" placeholder="' + (wq && wq.twd != null ? 'square' : '°T') + '" aria-label="Line direction, committee boat to pin, degrees true">°T <label class="solk" for="solLen">Length</label><input id="solLen" type="number" inputmode="numeric" min="20" max="3000" step="10" value="' + (B.llen || 300) + '"> m</div>' + got(B.lbrg != null && B.lbrg !== '' ? 'Tap the committee boat: the pin is laid ' + (B.llen || 300) + ' m from it on ' + ('00' + B.lbrg).slice(-3) + '°T.' : wq && wq.twd != null ? 'Tap the committee boat: the pin is laid ' + (B.llen || 300) + ' m to port of it, square to the wind from ' + ('00' + Math.round(wq.twd)).slice(-3) + '°T.' : '<b>Give the wind first</b> (step 1, Wind from), so the line can be laid square to it.'); }
        else if (lm === 'll') h += '<div class="solcl"><label class="solk" for="solLLb">' + (tr ? 'Inshore' : 'Committee boat') + '</label><input id="solLLb" class="solll" autocomplete="off" placeholder="50 46.20N 1 17.70W" value="' + esc(l1.boat ? llTxt(l1.boat) : '') + '"></div><div class="solcl"><label class="solk" for="solLLp">' + (tr ? 'Outer mark' : 'Pin') + '</label><input id="solLLp" class="solll" autocomplete="off" placeholder="50.7700, -1.2900" value="' + esc(l1.pin ? llTxt(l1.pin) : '') + '"><button class="btn" data-k="llset">Set the line</button></div>' + got('Degrees and minutes (50 46.20N 1 17.70W) or decimal degrees (50.77, -1.295).');
        else if (lm === 'ping') h += '<div class="solcl">' + seg('lt', tr ? 'tr' : 'cb', [['cb', 'Committee boat and pin'], ['tr', 'Shore transit']]) + '</div><div class="solcl"><button class="btn" data-k="lping" data-v="boat">' + (tr ? 'Ping inshore' : 'Ping boat end') + '</button><button class="btn" data-k="lping" data-v="pin">' + (tr ? 'Ping outer mark' : 'Ping pin end') + '</button></div>' + got(tr ? 'Ping on the transit as close inshore as is safe, then at the outer distance mark.' : 'Ping each end as you pass it, with this phone\'s GPS. Re-ping if the committee moves the line.');
        else h += got('Tap the committee boat end on the chart, then the pin end.');
        h += got((tr ? 'Inshore: <b>' : 'Committee boat: <b>') + (l1.boat ? 'set' : '?') + '</b> · ' + (tr ? 'Outer mark: <b>' : 'Pin: <b>') + (l1.pin ? 'set' : '?') + '</b>.');
        var bi = biasNow(); if (bi) h += '<button class="solbias" data-k="bias" title="Zoom in to the line and draw the bias"><span class="solk">Bias · tap to see it</span><b>' + (bi.m < 2 ? 'Square to the wind: no bias' : esc(bi.end) + ' end favoured by ' + bi.m + ' m' + lengths(bi.m)) + '</b><span>' + bi.deg + '° off square · line ' + bi.len + ' m</span></button>';
        else if (lineNow()) h += got('Line ' + Math.round(lineLen()) + ' m. Give the wind (step 1) to see the bias.');
        if (l1.boat || l1.pin) h += '<div class="solcl"><button class="btn" data-k="lclr">Clear line</button></div>'; }
      else h += got(B.start ? 'Start: <b>' + esc(B.start.name) + '</b>. Tap again to change it.' : 'A buoy, or a point on the start line.'); }
    else if (k === 'wind') { var wk = w.wkind === 'buoy' || w.wkind === 'pt' ? w.wkind : 'brg'; ask = wk === 'buoy' ? 'Tap the windward buoy' : wk === 'pt' ? 'Tap or ping the windward mark' : 'Windward mark: heading and distance'; h = '<div class="solcl">' + seg('wk', wk, [['buoy', 'A buoy'], ['pt', 'A point'], ['brg', 'Heading']]) + '</div>';
      h += wk === 'buoy' ? got(mark(w.wcode) ? 'Windward: <b>' + esc(w.wcode + ' ' + mark(w.wcode).name) + '</b>' : 'Tap it on the chart.') : wk === 'pt' ? got(w.wpt ? 'Windward: <b>' + esc(w.wpt.name) + '</b>' : 'Tap it on the chart, or ping it as you pass.') + '<div class="solcl"><button class="btn" data-k="pping" data-v="w">Ping here</button></div>' : '<div class="solcl"><input id="solSbrg" type="number" inputmode="numeric" min="0" max="360" value="' + (w.brg == null ? (B.wind && B.wind.twd != null ? B.wind.twd : '') : w.brg) + '" aria-label="Heading from the start, degrees true" placeholder="°T">°T <input id="solSdist" type="number" inputmode="decimal" min="0.2" max="10" step="0.1" value="' + w.dist + '" aria-label="Distance, nautical miles"> nm <button class="btn" data-k="fc">Forecast wind</button></div>' + (b.dataset.msg ? got(esc(b.dataset.msg)) : ''); }
    else if (k === 'lee') { var lk = w.lkind || 'start', g1 = gpt(1), g2 = gpt(2); ask = lk === 'buoy' ? 'Tap the leeward buoy' : lk === 'pt' ? 'Tap or ping the leeward mark' : lk === 'gate' ? (g1 && g2 ? 'Leeward gate set' : g1 ? 'Tap or ping the second gate mark' : 'Tap or ping the two gate marks') : 'Leeward mark: the start line'; h = '<div class="solcl">' + seg('lk', lk, [['start', 'Start line'], ['buoy', 'A buoy'], ['pt', 'A point'], ['gate', 'A gate']]) + '</div>';
      h += got(lk === 'buoy' ? (mark(w.lcode) ? 'Leeward: <b>' + esc(w.lcode + ' ' + mark(w.lcode).name) + '</b>' : 'Tap it on the chart.') : lk === 'pt' ? (w.lpt ? 'Leeward: <b>' + esc(w.lpt.name) + '</b>' : 'Tap it on the chart, or ping it.') : lk === 'gate' ? 'Gate: <b>' + (g1 ? esc(g1.short) : '?') + '</b> and <b>' + (g2 ? esc(g2.short) : '?') + '</b>. Two buoys or any two points. Round either.' : 'The boats round the start line.') + (lk === 'pt' || lk === 'gate' ? '<div class="solcl"><button class="btn" data-k="pping" data-v="' + (lk === 'pt' ? 'l' : 'g') + '">Ping here</button></div>' : ''); }
    else if (k === 'laps') { ask = 'Laps and finish'; h = '<div class="solcl"><span class="solk">Laps</span><span class="seg"><button type="button" data-k="lap" data-v="-1" aria-label="One lap fewer">−</button><button type="button" aria-pressed="true" disabled>' + (w.laps || 1) + '</button><button type="button" data-k="lap" data-v="1" aria-label="One lap more">+</button></span></div><div class="solcl"><span class="solk">Finish at</span>' + seg('wf', w.fin || 'lee', [['lee', 'Leeward'], ['start', 'Start line'], ['wind', 'Windward']]) + '</div><div class="solcl"><span class="solk">Leave marks to</span>' + seg('sd', w.side === 'starboard' ? 'starboard' : 'port', [['port', 'Port'], ['starboard', 'Starboard']]) + '</div>'; }
    else if (k === 'marks') { var n = B.marks.length; ask = n ? 'Tap the next buoy' : 'Tap the first buoy'; h = got('Then choose Port or Starboard. Tap a chip below to swap sides.') + '<div class="solchips">' + (n ? B.marks.map(function (m, i) { var st = m.side === 'stbd' || m.side === 'starboard'; return '<button class="solchip ' + (st ? 'stbd' : 'port') + '" data-k="side" data-v="' + i + '">' + (i + 1) + '. ' + esc(m.code || m.name) + ' ' + (st ? 'S' : 'P') + '</button>'; }).join('') : '<span class="soln">No buoys yet.</span>') + '</div><div class="solcl"><button class="btn" data-k="undo"' + (n ? '' : ' disabled') + '>Undo</button><button class="btn" data-k="list">All the buoys</button></div>'; }
    else if (k === 'fin') { ask = B.fin === 'mark' ? 'Tap the finish on the chart' : 'Finish at the start line'; h = '<div class="solcl">' + seg('fin', B.fin === 'mark' ? 'mark' : 'start', [['start', 'Start line'], ['mark', 'A buoy or point']]) + '</div>' + (B.fin === 'mark' ? got(B.finish ? 'Finish: <b>' + esc(B.finish.name) + '</b>' : 'Tap it on the chart.') : ''); }
    else if (k === 'wt') { ask = 'Wind and tide on the water'; h = got('Optional. Give the wind you see and Route adds a Fixed wind route beside the forecast routes. Leave it off to use the forecasts only.') + '<div class="fixbox" id="solFix">' + (window.__fsFix ? window.__fsFix.html() : '') + '</div>'; }
    else { var c = build(); ask = c.err ? 'Something is missing' : 'Check the course'; h = c.err ? got(esc(c.err)) : got('<b>' + c.marks.length + ' marks, about ' + nm(c) + ' nm.</b> ' + esc([c.start].concat(c.marks).concat([c.finish]).map(function (q) { return (q.gate ? 'Gate' : (q.name || '').replace(/^(Start|Finish), /, '').split(' ')[0]) + (q.side ? (q.side === 'starboard' ? ' S' : ' P') : ''); }).join(' → '))) + '<div class="solcl"><label class="solk" for="solSname">Name</label><input id="solSname" class="solname" maxlength="60" value="' + esc(B.name || 'Solent race') + '"></div>'; ok = !c.err; }
    h += codeRow(k);
    if (WZ.msg) h = '<p class="solmsg" role="status">' + esc(WZ.msg) + '</p>' + h;
    if (k === 'check') { var sn = window.__fsStartNow ? window.__fsStartNow() : null, now = Date.now() / 1000, ep = B.startAt && B.startAt > now - 600 ? B.startAt : (sn && sn.chosen && sn.ep > now ? sn.ep : Math.ceil((now + 1800) / 300) * 300);
      B.startAt = ep; var d = new Date(ep * 1000), pad = function (v) { return ('0' + v).slice(-2); }, loc = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
      var rg = sn && sn.range, outR = rg && (ep < rg[0] - 3600 || ep > rg[1]);
      h += '<div class="solcl"><label class="solk" for="solStartT">Start</label><input id="solStartT" type="datetime-local" step="60" value="' + loc + '"><span class="soln">' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ' UTC</span></div>' + (outR ? '<p class="solmsg">That start is outside the forecasts on board. Choose a time within the next few days.</p>' : '');
      if (outR) ok = false; }
    var last = WZ.n === N;
    b.innerHTML = '<div class="solgrip" title="Drag to move"><span></span></div><div class="solhd"><span class="solstepn">Step ' + WZ.n + ' of ' + N + '</span><b>' + ask + '</b><button class="close" data-k="x" aria-label="Cancel">×</button></div>' + h +
      '<div class="solnav"><button class="btn" data-k="back"' + (WZ.n > 1 ? '' : ' disabled') + '>Back</button>' + (last ? '<button class="btn primary" data-k="go"' + (ok ? '' : ' disabled') + '>' + (B.plan === 'route' ? 'Route this race' : 'Show the course') + '</button>' : '<button class="btn primary" data-k="next"' + (ok ? '' : ' disabled') + '>Next</button>') + '</div>';
    b.hidden = false; if (b.style.top) { var r = b.getBoundingClientRect(); place(b, r.left, r.top); }
    if (k === 'wt' && window.__fsFix) window.__fsFix.bind($('solFix'));
  }
  /* ---- Mark (Stuart 17 Nov 05:49): the start line laid square to the wind, or typed in lat and long; the bias at once, without GPS,
     from the line and the wind given; tap it and the chart zooms into the line and draws the bias ---- */
  function llTxt(a) { var f = function (v, p, n) { var A = Math.abs(v), d = Math.floor(A), mm = (A - d) * 60; return d + ' ' + mm.toFixed(2) + (v >= 0 ? p : n); }; return f(a[0], 'N', 'S') + ' ' + f(a[1], 'E', 'W'); }
  function llParse(t) { t = String(t || '').trim().toUpperCase().replace(/[°'′]/g, ' ');
    var m = t.match(/^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/); if (m) { var a = +m[1], b = +m[2]; return Math.abs(a) <= 90 && Math.abs(b) <= 180 ? [a, b] : null; }
    m = t.match(/^(\d+)\s+(\d+(?:\.\d+)?)\s*([NS])[\s,]+(\d+)\s+(\d+(?:\.\d+)?)\s*([EW])$/); if (m) { var la = (+m[1] + m[2] / 60) * (m[3] === 'S' ? -1 : 1), lo = (+m[4] + m[5] / 60) * (m[6] === 'W' ? -1 : 1); return Math.abs(la) <= 90 && Math.abs(lo) <= 180 ? [la, lo] : null; }
    return null; }
  function llSet() { var a = llParse(($('solLLb') || {}).value), b = llParse(($('solLLp') || {}).value);
    if (!a || !b) { WZ.msg = 'Could not read ' + (!a ? 'the committee boat' : 'the pin') + ': type 50 46.20N 1 17.70W or 50.77, -1.295.'; wzRender(); return; }
    if (Math.hypot(a[0] - b[0], (a[1] - b[1]) * Math.cos(a[0] * R)) * 60 < 0.005) { WZ.msg = 'The two ends are the same place.'; wzRender(); return; }
    if (window.__fsSetLine) { window.__fsSetLine('boat', a[0], a[1]); window.__fsSetLine('pin', b[0], b[1]); } B.start = lineStart(); WZ.msg = ''; saveB(); wzRender(); redraw(); }
  /* Stuart 17 Nov 09:35: "position of start boat plus direction and length". With a line direction typed (°T, committee boat to pin) the pin is laid on it; without one, square to the wind */
  function squareFrom(la, lo) { var w = windRef(); if (B.lbrg != null && B.lbrg !== '') { var qb = offset({ lat: la, lon: lo }, +B.lbrg, (B.llen || 300) / 1852); if (window.__fsSetLine) { window.__fsSetLine('boat', la, lo); window.__fsSetLine('pin', qb.lat, qb.lon); } B.start = lineStart(); WZ.msg = ''; saveB(); return true; }
    if (!w || w.twd == null) { WZ.msg = 'Give the line direction (committee boat to pin, °T), or the wind (step 1) to lay it square to the wind.'; wzRender(); return false; }
    var L = (B.llen || 300) / 1852, b = ((w.twd - 90) % 360 + 360) % 360, q = offset({ lat: la, lon: lo }, b, L);   /* the pin to port of the committee boat, looking up the wind */
    if (window.__fsSetLine) { window.__fsSetLine('boat', la, lo); window.__fsSetLine('pin', q.lat, q.lon); } B.start = lineStart(); WZ.msg = ''; saveB(); return true; }
  function lineLen() { var l = lineNow(); if (!l) return 0; return Math.hypot((l.pin[1] - l.boat[1]) * Math.cos(l.boat[0] * R) * 60, (l.pin[0] - l.boat[0]) * 60) * 1852; }
  function biasNow() { var l = lineNow(), w = windRef(); if (!l || !w || w.twd == null) return null; var k = Math.cos(l.boat[0] * R) * 60, P = [(l.pin[1] - l.boat[1]) * k, (l.pin[0] - l.boat[0]) * 60], wx = Math.sin(w.twd * R), wy = Math.cos(w.twd * R), up = P[0] * wx + P[1] * wy, ang = Math.atan2(P[0], P[1]) / R, d = Math.abs(90 - Math.abs(((ang - w.twd + 540) % 360) - 180));
    return { end: up > 0 ? (l.transit ? 'Outer' : 'Pin') : (l.transit ? 'Inshore' : 'Committee boat'), m: Math.round(Math.abs(up) * 1852), deg: Math.round(d), len: Math.round(lineLen()), twd: w.twd }; }
  var BV = { on: false };
  function biasView(quiet, gap) { var l = lineNow(); if (!l) return; BV.on = true; var s0 = Math.min(l.boat[0], l.pin[0]), n0 = Math.max(l.boat[0], l.pin[0]), w0 = Math.min(l.boat[1], l.pin[1]), e0 = Math.max(l.boat[1], l.pin[1]), pad = Math.max(n0 - s0, (e0 - w0) * Math.cos(n0 * R), 0.002) * 0.6;
    var sb = $('solStep'); if (sb && !sb.hidden) { sb.hidden = true; BV.box = true; }   /* the whole screen for the picture; the step box comes back with the next tap */
    if (window.__fsFitBox) window.__fsFitBox(s0 - pad, n0 + pad, w0 - pad / Math.cos(n0 * R), e0 + pad / Math.cos(n0 * R), gap); redraw(); if (!quiet) toast('The line and its bias. Tap the chart to carry on.'); }
  /* Stuart 18 Nov 19:44 ("maybe start view should show the map under to give contexts", chose: chart under, see-through, north up): the start
     screen shows the chart through it, north up, fitted to the line in the gap between the header and the figures; Picture swaps back */
  function ssFit() { var e = $('solStartScr'); if (!e || e.hidden || !e.classList.contains('ssthru')) return; var t = 0, b = innerHeight;
    [].forEach.call(e.querySelectorAll('.sshd,.soltest.intb'), function (x) { t = Math.max(t, x.getBoundingClientRect().bottom); }); var nm = e.querySelector('.ssnum'); if (nm) b = nm.getBoundingClientRect().top;
    biasView(true, { t: t, b: b }); }
  function biasDraw(ctx, X, Y) {
    var l = lineNow(), bi = biasNow(); if (!l || !bi) return; var tw = bi.twd;
    var A = [X(l.boat[1]), Y(l.boat[0])], P = [X(l.pin[1]), Y(l.pin[0])], mla = (l.boat[0] + l.pin[0]) / 2, mlo = (l.boat[1] + l.pin[1]) / 2, ula = mla + 0.2 / 60 * Math.cos(tw * R), ulo = mlo + 0.2 / 60 * Math.sin(tw * R) / Math.cos(mla * R);
    var ux = X(ulo) - X(mlo), uy = Y(ula) - Y(mla), un = Math.hypot(ux, uy) || 1, wx = ux / un, wy = uy / un;   /* up the wind on the screen, whichever way the chart is turned */
    var up = function (q) { return q[0] * wx + q[1] * wy; }, F = up(P) > up(A) ? P : A, U = F === P ? A : P, px = -wy, py = wx, Lpx = Math.hypot(P[0] - A[0], P[1] - A[1]) || 1;
    var t = (F[0] - U[0]) * px + (F[1] - U[1]) * py, S = [U[0] + t * px, U[1] + t * py], sl = Math.hypot(S[0] - U[0], S[1] - U[1]) || 1;   /* the square line through the end further down the wind, and the gap to the favoured end */
    ctx.save(); ctx.lineCap = 'round';
    ctx.fillStyle = 'rgba(34,197,94,.22)'; ctx.beginPath(); ctx.moveTo(U[0], U[1]); ctx.lineTo(F[0], F[1]); ctx.lineTo(S[0], S[1]); ctx.closePath(); ctx.fill();
    ctx.setLineDash([8, 6]); ctx.strokeStyle = '#F2B233'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(U[0] - (S[0] - U[0]) / sl * 20, U[1] - (S[1] - U[1]) / sl * 20); ctx.lineTo(S[0] + (S[0] - U[0]) / sl * 20, S[1] + (S[1] - U[1]) / sl * 20); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(S[0], S[1]); ctx.lineTo(F[0], F[1]); ctx.stroke();
    var M0 = [(A[0] + P[0]) / 2, (A[1] + P[1]) / 2], aw = Math.max(40, Lpx * 0.35); ctx.strokeStyle = '#6FA9E0'; ctx.fillStyle = '#6FA9E0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(M0[0] + wx * aw * 1.6, M0[1] + wy * aw * 1.6); ctx.lineTo(M0[0] + wx * aw * 0.5, M0[1] + wy * aw * 0.5); ctx.stroke();
    var tip = [M0[0] + wx * aw * 0.5, M0[1] + wy * aw * 0.5]; ctx.beginPath(); ctx.moveTo(tip[0], tip[1]); ctx.lineTo(tip[0] + wx * 12 + px * 7, tip[1] + wy * 12 + py * 7); ctx.lineTo(tip[0] + wx * 12 - px * 7, tip[1] + wy * 12 - py * 7); ctx.closePath(); ctx.fill();
    ctx.font = '700 14px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.fillStyle = '#fff';
    var lab = bi.m < 2 ? 'Square to the wind: no bias' : bi.end + ' end favoured · ' + bi.m + ' m · ' + bi.deg + '°'; ctx.strokeText(lab, F[0], F[1] - 26); ctx.fillText(lab, F[0], F[1] - 26);
    var wl = 'Wind ' + ('00' + Math.round(tw)).slice(-3) + '°'; ctx.strokeText(wl, M0[0] + wx * aw * 1.7, M0[1] + wy * aw * 1.7); ctx.fillText(wl, M0[0] + wx * aw * 1.7, M0[1] + wy * aw * 1.7); ctx.restore(); }
  /* M8 (Stuart 17 Nov 05:13): test mode. A practice boat sails the course (or a sample course off Cowes) on the chart, eight times
     quicker than life after a two-and-a-half-minute start sequence; nothing goes to the crew; Stop puts your own race back. */
  var SIM = { on: false };
  function rh(a, b) { var k = Math.cos(a.lat * R), dx = (b.lon - a.lon) * k * 60, dy = (b.lat - a.lat) * 60; return { nm: Math.hypot(dx, dy), brg: (Math.atan2(dx, dy) / R + 360) % 360 }; }
  /* Stuart's iPhone 18 Nov 19:51: the orange test bar sat on top of the start box and the start screen's header. It now has its own
     place: a row inside the start screen while that is open, otherwise just below the start box (or where it was, if there is none) */
  function tbPlace() { var b = $('solTestBar'); if (!b) return; var ss = $('solStartScr'), hd = ss && !ss.hidden && ss.querySelector('.sshd');
    if (hd) { if (b.parentNode !== ss || b.previousElementSibling !== hd) hd.insertAdjacentElement('afterend', b); b.classList.add('intb'); b.style.top = ''; return; }
    if (b.parentNode !== document.body) document.body.appendChild(b); b.classList.remove('intb');
    var sq = $('solSeq'), top = null; if (sq && !sq.hidden && sq.getClientRects().length && !document.body.classList.contains('fsdeck')) top = Math.round(sq.getBoundingClientRect().bottom + 6);
    var v = top == null ? '' : top + 'px'; if (b.style.top !== v) b.style.top = v; }
  function testBar(on) { var b = $('solTestBar'); if (!on) { if (b) b.remove(); return; } if (!b) { b = document.createElement('div'); b.id = 'solTestBar'; b.className = 'solpick soltest'; document.body.appendChild(b);
      b.addEventListener('click', function (e) { var t = e.target.closest('[data-em]'); if (!t) return; var k = t.dataset.em; if (k === 'x') testStop(); else if (k === 'spd') { EM.x = EM.x === 1 ? 5 : EM.x === 5 ? 20 : EM.x === 20 ? 60 : 1; testBar(true); } else if (k === 'sh+') { EM.shift += 10; toast('Test mode: the wind veers 10°.'); } else if (k === 'sh-') { EM.shift -= 10; toast('Test mode: the wind backs 10°.'); } else if (k === 'cc') emCourseChange(); else if (k === 'ocs') { EM.early = !EM.early; toast(EM.early ? 'Test mode: the boat will cross 20 seconds early.' : 'Test mode: back to a start on time.'); testBar(true); } }); }
    var W = emWind(), c = window.__navCourse && window.__navCourse(), n = c ? (c.marks || []).length + 1 : 0;
    b.innerHTML = '<span title="An emulated boat sails the course. Nothing goes to the crew."><b>TEST MODE</b> ' + esc(EM.mode || '') + (n ? ' · leg ' + Math.min((EM.i || 0) + 1, n) + ' of ' + n : '') + ' · wind ' + ('00' + Math.round(W.twd)).slice(-3) + '° ' + W.tws.toFixed(0) + ' kn</span>' +
      '<button data-em="spd">x' + EM.x + '</button><button data-em="sh-">Wind −10°</button><button data-em="sh+">Wind +10°</button><button data-em="cc">Course change</button><button data-em="ocs"' + (EM.early ? ' aria-pressed="true"' : '') + '>Early start</button><button data-em="x">Stop</button>'; tbPlace(); }
  function testStart() {
    if (SIM.on || !window.__fsSim) return; css(); var lq = window.__fsLine ? window.__fsLine() : {};
    SIM.saved = { B: JSON.parse(JSON.stringify(B)), line: JSON.parse(JSON.stringify(lq)) }; sv('fs-solent-testsave', SIM.saved); SIM.push = window.__fsBcPush; window.__fsBcPush = function () {};
    QUIET = true; try {
      var c = build(); if (!c || c.err) { B.type = 'marks'; B.marks = parseBoard('3F P, 2C S').marks; B.fin = 'start'; B.finish = null; }
      if (!windRef()) B.wind = { twd: 230, src: 'typed', at: Date.now() };
      var l = window.__fsLine(); if (!(l.boat && l.pin)) { window.__fsSetLine('boat', 50.7700, -1.2950); window.__fsSetLine('pin', 50.7700, -1.2895); }
      B.sk = 'line'; B.start = lineStart(); B.plan = 'list'; B.startAt = Math.round(Date.now() / 1000 + 150); saveB(); go(true); B.shown = Date.now(); B.raced = null; saveB();
    } finally { QUIET = false; }
    try { if (window.__fsGun) window.__fsGun(B.startAt); } catch (e) {}
    var lg = $('solLegs'); if (lg) lg.hidden = true; EM = { t: 0, x: 1, shift: 0, log: [], i: 0 }; try { if (window.__navPracticeOn && window.__navPracticeOn()) window.__navPractice(false); } catch (e) {} window.__fsSim(true); SIM.on = true; SIM.i = 0; SIM.pos = null; testBar(true); SIM.t = setInterval(simStep, 1000); simStep(); toast('Test mode: the gun is in two and a half minutes.');
  }
  /* ---- The race emulator (Stuart 17 Nov 13:31, Mark+ photo: "why is boat sailing away from mark. Can we build a tool to test mark and
     mark+ in test mode please"). The old test boat went straight at each mark, even dead upwind, and on Mark+ Route+'s own practice boat
     fed the instruments at the same time, sailing its own route: two boats on one screen. Now one emulated boat sails the course as a
     boat would: close-hauled at 42° true on a beat and tacking on the layline, gybing downwind at 150°, reaching straight at the mark,
     with the wind and tide given (or 230° 12 kn and no tide), speed from a simple test polar. It feeds the phone's GPS position and, on
     Mark+, the instruments too (RMC, VHW, HDT, MWV, DPT, VDR), so everything on the screen comes from the one boat; Route+'s practice
     boat is stopped while it runs. The test bar has the speed (x1, x5, x20 after the gun) and events: the wind shifts 10° either way,
     the committee changes the course (the next mark is swapped, and COURSE CHANGE shows how to put it right), and an early start. ---- */
  var EM = { t: 0, x: 1, shift: 0, log: [] };
  function n180(a) { return ((a % 360) + 540) % 360 - 180; }
  function n360(a) { return ((a % 360) + 360) % 360; }
  function emWind() { var w = windRef() || {}, base = w.twd != null ? +w.twd : 230, tws = w.tws > 0 ? +w.tws : 12; return { twd: n360(base + EM.shift + 4 * Math.sin(EM.t / 240)), tws: tws * (1 + 0.08 * Math.sin(EM.t / 97)) }; }
  function emPolar(twa, tws) { var a = Math.abs(twa), k = Math.min(1, tws / 12), pts = [[0, 0], [38, 4.2], [42, 5.6], [60, 6.4], [90, 6.9], [120, 7.0], [150, 6.4], [180, 5.4]]; for (var i = 1; i < pts.length; i++) if (a <= pts[i][0]) { var f = (a - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]); return (pts[i - 1][1] + f * (pts[i][1] - pts[i - 1][1])) * (0.55 + 0.45 * k); } return 5.4 * k; }   /* a test polar for a 30-foot cruiser-racer, not a real boat's */
  function emTide() { var z = tideRef(); return z && !z.need ? [z.spd * Math.sin(z.dir * R), z.spd * Math.cos(z.dir * R)] : [0, 0]; }
  function emCog(hdg, bsp) { var T = emTide(), gx = bsp * Math.sin(hdg * R) + T[0], gy = bsp * Math.cos(hdg * R) + T[1]; return { cog: n360(Math.atan2(gx, gy) / R), sog: Math.hypot(gx, gy) }; }
  /* the heading to make good a ground track along brg through the tide, at boat speed v */
  function emHdgFor(brg, v) { var T = emTide(), cross = T[0] * Math.cos(brg * R) - T[1] * Math.sin(brg * R), s = Math.max(-0.9, Math.min(0.9, cross / Math.max(v, 0.5))); return n360(brg - Math.asin(s) / R); }
  function emSteer(tgt) { var W = emWind(), r = rh(EM.p, tgt), twaD = n180(r.brg - W.twd), up = Math.abs(twaD) < 45, dn = Math.abs(twaD) > 155;
    if (!up && !dn) { var v0 = emPolar(twaD, W.tws), h0 = emHdgFor(r.brg, v0); EM.mode = Math.abs(twaD) < 75 ? 'close reach' : Math.abs(twaD) < 120 ? 'reach' : 'broad reach'; EM.tk = null; return { hdg: h0, twa: n180(W.twd - h0) }; }
    var A = up ? 42 : 150; if (EM.tk == null || EM.tkFor !== EM.i + (up ? 'u' : 'd')) { EM.tk = twaD >= 0 ? 1 : -1; EM.tkFor = EM.i + (up ? 'u' : 'd'); EM.tkAt = EM.t; }   /* the tack (or gybe) nearer the mark first */
    var hd = function (tk) { return n360(W.twd + tk * A); }, v = emPolar(A, W.tws), cNow = emCog(hd(EM.tk), v).cog, cOther = emCog(hd(-EM.tk), v).cog;
    /* on the layline: the mark now bears as far round as the other tack's track over the ground (with the tide), so tack or gybe */
    var dTgt = n180(r.brg - cNow), dOth = n180(cOther - cNow); if (Math.sign(dTgt) === Math.sign(dOth) && Math.abs(dTgt) >= Math.abs(dOth) - 1 && EM.t - (EM.tkAt || 0) > 20) { EM.tk = -EM.tk; EM.tkAt = EM.t; EM.tacks = (EM.tacks || 0) + 1; }
    EM.mode = (up ? 'beat, ' : 'run, ') + (EM.tk > 0 ? 'port' : 'starboard') + (up ? ' tack' : ' gybe'); return { hdg: hd(EM.tk), twa: n180(W.twd - hd(EM.tk)) }; }
  function emFeed(lat, lon, hdg, bsp, sog, cog, twa) { try { window.__fsSimFix(lat, lon, sog, cog); } catch (e) {}
    if (!window.__navFeed) return; var W = emWind(), tr = twa * R, ax = W.tws * Math.cos(tr) + bsp, ay = W.tws * Math.sin(tr), aws = Math.hypot(ax, ay), awa = n360(Math.atan2(ay, ax) / R), T = emTide(), set = n360(Math.atan2(T[0], T[1]) / R), drift = Math.hypot(T[0], T[1]);
    var dm = function (v, isLat) { var a = Math.abs(v), d = Math.floor(a), m = (a - d) * 60; return (isLat ? ('0' + d).slice(-2) : ('00' + d).slice(-3)) + ('0' + m.toFixed(4)).slice(-7) + ',' + (isLat ? (v >= 0 ? 'N' : 'S') : (v >= 0 ? 'E' : 'W')); };
    var cs = function (b) { var c = 0; for (var i = 0; i < b.length; i++) c ^= b.charCodeAt(i); return '$' + b + '*' + ('0' + c.toString(16).toUpperCase()).slice(-2); };
    var t = new Date(), hh = ('0' + t.getUTCHours()).slice(-2) + ('0' + t.getUTCMinutes()).slice(-2) + ('0' + t.getUTCSeconds()).slice(-2), dd = ('0' + t.getUTCDate()).slice(-2) + ('0' + (t.getUTCMonth() + 1)).slice(-2) + String(t.getUTCFullYear()).slice(-2);
    try { window.__navFeed([cs('GPRMC,' + hh + ',A,' + dm(lat, true) + ',' + dm(lon, false) + ',' + sog.toFixed(2) + ',' + cog.toFixed(1) + ',' + dd + ',,'), cs('IIVHW,' + hdg.toFixed(1) + ',T,,M,' + bsp.toFixed(2) + ',N,,K'), cs('IIHDT,' + hdg.toFixed(1) + ',T'), cs('IIMWV,' + awa.toFixed(1) + ',R,' + aws.toFixed(2) + ',N,A'), cs('SDDPT,12.0,0.5'), cs('IIVDR,' + set.toFixed(1) + ',T,,M,' + drift.toFixed(2) + ',N')]); } catch (e) {} }
  function simStep() {
    if (!SIM.on) return; var l = lineNow(), c = window.__navCourse && window.__navCourse(); if (!l || !c) return;
    var now = Date.now() / 1000, g = B.startAt || now, mid = { lat: (l.boat[0] + l.pin[0]) / 2, lon: (l.boat[1] + l.pin[1]) / 2 }, pts = (c.marks || []).concat(c.finish ? [c.finish] : []); SIM.i = EM.i || 0; if (!pts[0]) return;
    var W = emWind(), k = Math.cos(mid.lat * R), at = function (p, b, m) { return { lat: p.lat + m / 1852 * Math.cos(b * R) / 60, lon: p.lon + m / 1852 * Math.sin(b * R) / (60 * k) }; };
    if (now < g + (EM.early ? -20 : 0)) {   /* before the gun: close-hauled on starboard, timed to reach the middle of the line at the gun (20 s early when OCS is asked for) */
      var h = n360(W.twd - 42), v = 4.5, cg = emCog(h, v), back = (g + (EM.early ? -20 : 0) - now) * cg.sog * 0.514; EM.p = at(mid, n360(cg.cog + 180), Math.max(0, back - 5)); EM.mode = 'starting, starboard tack'; emFeed(EM.p.lat, EM.p.lon, h, v, cg.sog, cg.cog, n180(W.twd - h)); return; }
    if (!EM.p) EM.p = { lat: mid.lat, lon: mid.lon }; var x = now >= g ? EM.x : 1, dt = x;   /* one step a second, x times the time after the gun */
    var tgt = pts[EM.i]; if (!tgt) return; EM.t += dt;
    var st = emSteer(tgt), bsp = emPolar(st.twa, W.tws), gr = emCog(st.hdg, bsp), d = gr.sog * 0.514 * dt, r = rh(EM.p, tgt);
    if (r.nm * 1852 <= Math.max(25, d)) { EM.p = { lat: tgt.lat, lon: tgt.lon }; EM.i++; SIM.i = EM.i; EM.log.push(['round', EM.i, Math.round(EM.t)]); try { var PL2 = window.__fsPlot || window.__navPlot; if (PL2 && PL2.setMark) PL2.setMark(Math.min(EM.i, pts.length - 1)); } catch (e) {} if (EM.i >= pts.length) { clearInterval(SIM.t); toast('Test mode: finished. Stop test mode puts your own race back.'); } }
    else EM.p = at(EM.p, gr.cog, d);
    EM.log.push(['p', Math.round(EM.t), EM.i, Math.round(r.nm * 1852), Math.round(st.hdg), Math.round(gr.cog), +bsp.toFixed(1)]); if (EM.log.length > 4000) EM.log.splice(0, 1000);
    emFeed(EM.p.lat, EM.p.lon, st.hdg, bsp, gr.sog, gr.cog, st.twa); testBar(true);
  }
  /* the committee changes the course: the next mark becomes another buoy near it, so COURSE CHANGE can be tried */
  function emCourseChange() { var c = window.__navCourse && window.__navCourse(); if (!c || B.type === 'wl') { toast('Test mode: a course change works on a round the cans course.'); return; } var i = Math.min(EM.i || 0, B.marks.length - 1); if (i < 0 || !MK) return; var m0 = B.marks[i];
    var cand = MK.filter(function (m) { return m.id !== m0.code && rh(m0, m).nm < 2 && rh(m0, m).nm > 0.3; }).sort(function (a, b) { return rh(m0, a).nm - rh(m0, b).nm; })[0]; if (!cand) return;
    B.marks[i] = { code: cand.id, name: cand.id + ' ' + cand.name, lat: cand.lat, lon: cand.lon, side: m0.side }; saveB(); go(true); redraw(); toast('Test mode: the committee has changed the course. Mark ' + (i + 1) + ' is now ' + cand.id + ' instead of ' + (m0.code || m0.name) + '. Tap COURSE CHANGE to see it, or to put it back.'); }
  function testStop() {
    if (!SIM.on) return; clearInterval(SIM.t); SIM.on = false; try { localStorage.removeItem('fs-solent-testsave'); } catch (e) {} window.__fsSim(false); testBar(false); var sv0 = SIM.saved || {};
    QUIET = true; try { if (sv0.B) { B = sv0.B; sv(BKEY, B); } ['boat', 'pin'].forEach(function (e) { var a = sv0.line && sv0.line[e]; window.__fsSetLine(e, a ? a[0] : null, a ? a[1] : null); }); if (window.__fsClearCourse) window.__fsClearCourse(); var c0 = build(); if (B.shown && c0 && !c0.err) go(true); } catch (e) {} finally { QUIET = false; }
    if (SIM.push) window.__fsBcPush = SIM.push; try { var PL3 = window.__fsPlot || window.__navPlot; if (PL3 && PL3.C.on) PL3.toggle(false); } catch (e) {} redraw(); toast('Test mode stopped: your own race is back.'); }
  /* ---- The start sequence (Stuart 16 Nov 12:46 "the usual start sequence with count down"; 17 Nov 05:04 sounds and vibration on).
     A box under the top bar from 15 minutes before the gun: the countdown, Sync at a signal (to the whole minute), one minute more or
     less, 5-4-1-0 or 3-2-1-0, the flag (P, I, Z, U, black), Postpone (AP) and General recall. A long sound at each signal and short
     ones in the last ten seconds; the phone vibrates with them. The gun goes to Route's start and to the crew on the boat code. ---- */
  var SQ = { shown: false, last: null, ac: null, hide: 0 };
  var FLAGS = { P: 'P: the ordinary start.', I: 'I: in the last minute, a boat on the course side must sail round an end to start.', Z: 'Z: in the last minute, a boat in the triangle (the line ends and the first mark) takes a 20% penalty.', U: 'U: in the last minute, a boat in the triangle is disqualified.', B: 'Black flag: in the last minute, a boat in the triangle is disqualified.' };
  /* Stuart 17 Nov 09:35: "5,4,1 or 3,2,1 or 10,5 go" */
  function sqSignals() { return B.seq === 3 ? [180, 120, 60, 0] : B.seq === 10 ? [600, 300, 0] : B.seq === 104 ? [600, 240, 60, 0] : [300, 240, 60, 0]; }   /* 104: 10-4-1-0, the Fastnet's (RFR 2025 SIs 13) */
  function seqName() { return B.seq === 3 ? '3-2-1-0' : B.seq === 10 ? '10-5-0' : B.seq === 104 ? '10-4-1-0' : '5-4-1-0'; }
  function seqLen() { return B.seq === 3 ? 3 : B.seq === 10 || B.seq === 104 ? 10 : 5; }
  function sqTone(long) { try { SQ.ac = SQ.ac || new (window.AudioContext || window.webkitAudioContext)(); var a = SQ.ac, o = a.createOscillator(), g = a.createGain(); o.frequency.value = long ? 880 : 1200; g.gain.value = 0.25; o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + (long ? 0.9 : 0.15)); } catch (e) {} try { if (navigator.vibrate) navigator.vibrate(long ? [500] : [80]); } catch (e) {} }
  function sqGun(t) { SQ.setAt = Date.now(); B.startAt = Math.round(t); B.raced = null; saveB(); try { if (window.__fsGun) window.__fsGun(B.startAt); } catch (e) {} sqRender(); }
  function sqOn() { var now = Date.now() / 1000; if (SQ.hide && SQ.hide === B.startAt) return false; if (B.pp) return true; if (SQ.force && SQ.force === B.startAt && now < B.startAt + 60) return true; var q0 = series(); return !!(B.startAt && now > B.startAt - 900 - (q0.pos - 1) * q0.iv * 60 && now < B.startAt + 60); }
  function sqRender() {
    var b = $('solSeq'), on = KIT && sqOn() && !($('solCard') && !$('solCard').hidden), ss = $('solStartScr');   /* the race menu sheet comes first */ if (!on) { if (b) b.hidden = true; if (ss) ss.hidden = true; return; } css();
    var rem0 = B.startAt ? B.startAt - Date.now() / 1000 : null, mins = B.ssMin == null ? 10 : B.ssMin, big = !B.pp && rem0 != null && rem0 > -5 && (SQ.force === B.startAt || (mins > 0 && rem0 <= mins * 60 && !(SQ.small && Math.abs(SQ.small - B.startAt) < 900) && !document.body.classList.contains('fsdeck')));   /* F44: the start screen does not open by itself over the deck screen the crew chose */
    if (big) { if (b) b.hidden = true; if (!SQ.gps) { SQ.gps = 1; try { if (window.__fsLiveOpen && !(window.__fsLiveFix && window.__fsLiveFix())) window.__fsLiveOpen(); } catch (x) {} } ssRender(rem0); return; }   /* M28: the start screen */
    if (ss) ss.hidden = true;
    if (!b) { b = document.createElement('div'); b.id = 'solSeq'; b.className = 'solseq'; b.setAttribute('role', 'timer'); document.body.appendChild(b);
      b.addEventListener('click', sqClick); }
    sqPaint(b); }
  function sqClick(e) { var b = $('solSeq'); var t = e.target.closest('[data-q]'); if (!t) return; var q = t.dataset.q, now = Date.now() / 1000; try { SQ.ac = SQ.ac || new (window.AudioContext || window.webkitAudioContext)(); if (SQ.ac.resume) SQ.ac.resume(); } catch (x) {}
        if (q === 'sync') { var rem = B.startAt - now; sqGun(now + Math.round(rem / 60) * 60); toast('Synced: gun at ' + clk(B.startAt) + '.'); }
        else if (q === 'm1') sqGun(B.startAt - 60); else if (q === 'p1') sqGun(B.startAt + 60);
        else if (q === 'seq') { B.seq = B.seq === 3 ? 10 : B.seq === 10 ? 104 : B.seq === 104 ? 5 : 3; saveB(); sqRender(); }
        else if (q === 'flag') { var o = ['P', 'I', 'Z', 'U', 'B'], i = o.indexOf(B.flag || 'P'); B.flag = o[(i + 1) % o.length]; saveB(); sqRender(); toast(FLAGS[B.flag]); }
        else if (q === 'ap') { B.pp = true; saveB(); sqRender(); toast('Postponed. Tap Warning when the warning signal goes.'); }
        else if (q === 'warn') { B.pp = false; sqGun(now + seqLen() * 60); }
        else if (q === 'ssview') { B.ssPic = !B.ssPic; saveB(); sqRender(); setTimeout(ssFit, 80); } else if (q === 'pingb' || q === 'pingp') { if (window.__fsPing) window.__fsPing(q === 'pingp' ? 'pin' : 'boat'); sqRender(); }   /* the GPS window gives way to the start screen, so its pings are here too */
        else if (q === 'recall') { sqGun(now + seqLen() * 60); toast('General recall: a new sequence, gun at ' + clk(B.startAt) + '. Sync at the next signal.'); }
        else if (q === 'x') { SQ.hide = B.startAt; if (b) b.hidden = true; }
        else if (q === 'small') { SQ.small = B.startAt; SQ.force = 0; var ss = $('solStartScr'); if (ss) ss.hidden = true; sqRender(); }
        else if (q === 'big') { SQ.small = 0; SQ.force = B.startAt; sqRender(); }
        else if (q === 'ssmin') { B.ssMin = B.ssMin === 5 ? 0 : B.ssMin === 0 ? 10 : 5; saveB(); sqRender(); toast(B.ssMin ? 'The start screen opens by itself ' + B.ssMin + ' minutes before the gun.' : 'The start screen no longer opens by itself: tap Start screen in the start box.'); } }
  function sqPaint(b) {
    var now = Date.now() / 1000, rem = B.startAt ? B.startAt - now : null, mm = function (v) { var a = Math.max(0, Math.round(Math.abs(v))); return (v < 0 ? '+' : '') + Math.floor(a / 60) + ':' + ('0' + a % 60).slice(-2); };
    var over = ''; try { var lc = window.__fsLineCalc ? window.__fsLineCalc(B.startAt) : null; if (lc && lc.over && rem != null && rem <= 60 && rem > -5) over = (B.flag && B.flag !== 'P' ? FLAGS[B.flag].replace(/^[^:]*: /, '') : 'On the course side: go back before the gun.'); } catch (e) {}
    b.innerHTML = '<div class="sqhd"><button class="sqflag" data-q="flag" title="The preparatory flag. Tap to change"><img alt="' + (B.flag === 'B' ? 'Black' : (B.flag || 'P')) + ' flag" src="' + flagUrl(B.flag || 'P') + '" width="30" height="21"></button><b class="sqt">' + (B.pp ? 'AP' : rem > 0 ? mm(rem) : 'GUN ' + mm(rem)) + '</b><span class="sqg">' + (B.pp ? 'Postponed' : 'Gun ' + clk(B.startAt)) + '</span><button class="sqx" data-q="x" aria-label="Hide the start sequence" title="Hide the start sequence">' + (window.FS_HIDE || 'Hide') + '</button></div>' +
      (over ? '<p class="sqover">' + esc(over) + '</p>' : '') + (seriesTxt() ? '<p class="sqser">' + esc(seriesTxt()) + '</p>' : '') +
      '<div class="sqrow">' + (B.pp ? '<button class="btn primary" data-q="warn">Warning signal now</button>' : rem != null && rem <= 0 ? '<button class="btn" data-q="recall" title="General recall: a new sequence from now">General recall</button>' : '<button class="btn primary" data-q="sync">Sync</button><button class="btn" data-q="m1">−1 min</button><button class="btn" data-q="p1">+1 min</button><button class="btn" data-q="seq">' + seqName() + '</button><button class="btn" data-q="ap">AP</button><button class="btn" data-q="recall">Recall</button><button class="btn" data-q="big">Start screen</button>') + '</div>';
    b.hidden = false; b.classList.toggle('sqlast', rem != null && rem <= 60 && rem > 0); }
  /* ---- M28 (Stuart 17 Nov 09:15): the start screen. From 10 minutes before the gun (or 5, or off: B.ssMin) a split screen: the line
     drawn with the wind at the top, the favoured end and the bias, laylines from both ends, the boat from GPS with its last minute of
     track and a predictor to where it will be at the gun (green on time, amber with time to burn, red late); below, the countdown,
     distance and time to the line, time to burn, bias and speed, with Sync and the rest. M29 (09:17): the flag in force drawn as a
     small flag, also flown on the committee boat. Research and logic tree: docs/MARK-START-DESIGN.md. ---- */
  var SS = { trail: [], gps: 0, sp: [], wl: [] };
  /* ---- the start maths (peer review 17 Nov 09:52, MARK-START-DESIGN.md section 5) ----
     M45 (G10, Stuart 10:39 "yes"): our place in a series of starts, B.series = { pos: 1 for the first start, iv: minutes between starts }.
     M36 (G4): time to the line at the boat's own good speed, the 90th percentile of the last two minutes' SOG (as the Signal K racing plugin
     does with VMG, "so luffing doesn't change it"), not the speed of the moment.
     M35 (G3): plus the time lost accelerating to that speed from the present speed, given the seconds the boat takes from stopped to full
     speed (B.acc, typed): accelerating evenly, the time lost is acc x (V - s)^2 / (2 V^2).
     M37 (G5): the wind's trend over the last 10 minutes, from each wind given (typed, head to wind, tacks) and on Mark+ the instruments.
     M38 (G6): the bias in boat lengths, given the length (B.loa, metres). M39 (G7): the line check. M40, M41 (G8, G9): the first mark. */
  function series() { var q = B.series || {}; return { pos: Math.max(1, Math.min(9, +q.pos || 1)), iv: +q.iv === 10 ? 10 : +q.iv === 3 ? 3 : 5 }; }
  function seriesGuns() { var q = series(), out = []; if (!B.startAt) return out; for (var i = 1; i <= q.pos; i++) out.push(B.startAt - (q.pos - i) * q.iv * 60); return out; }
  function seriesTxt() { var q = series(); if (q.pos < 2 || !B.startAt) return ''; var g = seriesGuns(), now = Date.now() / 1000, nx = g.filter(function (t) { return t > now - 1; })[0];
    return 'Start ' + q.pos + ' of the series, every ' + q.iv + ' min: ' + g.map(function (t, i) { return (i === g.length - 1 ? 'ours ' : '') + clk(t); }).join(', ') + (nx && nx < B.startAt ? '. Next gun ' + clk(nx) + ' (start ' + (g.indexOf(nx) + 1) + ')' : '') + '.'; }
  function spdNote(f) { var t = Date.now(); if (f && f.sog != null && (!SS.sp.length || t - SS.sp[SS.sp.length - 1][0] > 900)) { SS.sp.push([t, f.sog]); } SS.sp = SS.sp.filter(function (q) { return t - q[0] < 120000; }); }
  function vGood() { if (SS.sp.length < 5) return null; var a = SS.sp.map(function (q) { return q[1]; }).sort(function (x, y) { return x - y; }), v = a[Math.min(a.length - 1, Math.floor(a.length * 0.9))]; return v >= 1.5 ? v : null; }
  /* M53 (Stuart 14:10 "all three in a drop down"): where the seconds to full speed come from: typed, the boat's size, or learnt from the
     GPS (Mark) or the log (Mark+, automatically). Boat sizes need Stuart's figures: none are made up, so until he gives them that choice
     falls back to the typed figure */
  var ACC_SIZE = {};   /* Stuart to give: seconds from stopped to full speed for each size */
  /* F45 (Stuart 18 Nov 07:40, Q&A): seconds to full speed by wind speed, typed as a table (as Expedition does), for 8, 12, 16 and 20 kn */
  var ACCW_KN = [8, 12, 16, 20];
  /* F45: the boat's timing for the start, shared by Mark's Next panel and Route's start line box: seconds to full speed by wind speed,
     and tack and gybe seconds (typed until learnt) */
  function timingHtml() { var a = B.accW || []; return '<div class="solcl"><span class="solk">To full speed by wind</span>' + ACCW_KN.map(function (k, i) { return '<label class="soln">' + k + ' kn <input class="kitAccW" data-i="' + i + '" type="number" inputmode="numeric" min="0" max="90" value="' + (a[i] || '') + '" placeholder="s" style="width:4em"></label>'; }).join(' ') + '</div>' +
      '<div class="solcl"><label class="solk" for="kitTk">Tack</label><input id="kitTk" type="number" inputmode="numeric" min="0" max="60" value="' + (B.tackS || '') + '" placeholder="s" style="width:4em"> s <label class="solk" for="kitGy">Gybe</label><input id="kitGy" type="number" inputmode="numeric" min="0" max="60" value="' + (B.gybeS || '') + '" placeholder="s" style="width:4em"> s <span class="soln">' + (B.tackLearn > 0 || B.gybeLearn > 0 ? 'learnt: ' + [B.tackLearn > 0 ? 'tack ' + B.tackLearn + ' s' : '', B.gybeLearn > 0 ? 'gybe ' + B.gybeLearn + ' s' : ''].filter(Boolean).join(', ') + ' (used before the typed)' : 'typed until learnt from your own turns') + '</span></div>' + (B.loa > 3 ? '<p class="soln">With nothing typed or learnt: a tack loses one boat length, a gybe a quarter (' + B.loa + ' m): ' + [4, 6, 8].map(function (v) { return v + ' kn tack ' + lenSecs('tack', v) + ' s, gybe ' + lenSecs('gybe', v) + ' s'; }).join('; ') + '.</p>' : '<p class="soln">Give the boat length (Settings, Boat) and, with nothing typed or learnt, a tack counts as one boat length lost and a gybe a quarter.</p>'); }
  function bindTiming(root) { [].forEach.call(root.querySelectorAll('.kitAccW'), function (e) { e.onchange = function () { var a = (B.accW || []).slice(); a[+e.dataset.i] = e.value === '' ? null : Math.max(0, Math.min(90, Math.round(+e.value))); B.accW = a; saveB(); }; });
    var tk = root.querySelector('#kitTk'), gy = root.querySelector('#kitGy'); if (tk) tk.onchange = function () { B.tackS = tk.value === '' ? null : Math.max(0, Math.min(60, Math.round(+tk.value))); saveB(); }; if (gy) gy.onchange = function () { B.gybeS = gy.value === '' ? null : Math.max(0, Math.min(60, Math.round(+gy.value))); saveB(); }; }
  function accWind() { var a = B.accW || [], w = windRef(), tws = w && w.tws > 0 ? +w.tws : null, pts = []; ACCW_KN.forEach(function (k, i) { if (+a[i] > 0) pts.push([k, +a[i]]); }); if (!pts.length) return null; if (tws == null) return { s: pts[Math.floor(pts.length / 2)][1], src: 'your table (no wind speed)' };
    if (tws <= pts[0][0]) return { s: pts[0][1], src: 'your table at ' + Math.round(tws) + ' kn' }; for (var i = 0; i < pts.length - 1; i++) if (tws <= pts[i + 1][0]) { var f = (tws - pts[i][0]) / (pts[i + 1][0] - pts[i][0]); return { s: Math.round(pts[i][1] + f * (pts[i + 1][1] - pts[i][1])), src: 'your table at ' + Math.round(tws) + ' kn' }; } return { s: pts[pts.length - 1][1], src: 'your table at ' + Math.round(tws) + ' kn' }; }
  function accNow() { var md = B.accMode || (window.__navBoat ? 'learn' : 'typed'); if (md === 'learn' && B.accLearn > 0) return { s: B.accLearn, src: 'learnt from ' + (B.accN || 0) + ' speed-ups' }; if (md === 'wind' || md === 'learn') { var aw = accWind(); if (aw) return aw; } if (md === 'size' && ACC_SIZE[B.accSize] > 0) return { s: ACC_SIZE[B.accSize], src: B.accSize }; return B.acc > 0 ? { s: B.acc, src: 'typed' } : null; }
  /* learning: a speed-up from under half the good speed to nine tenths of it; linear, so stopped to full = that time / 0.4. Mark+ uses
     the log (BSP) when the boat sends it, so the tide does not enter it; Mark uses the GPS (SOG). The last ten are kept, the median used.
     Tacks (Mark+): a heading change of 60° or more inside 20 s with the log above 2 kn; the time to the new heading is kept the same way */
  var LRN = { lowAt: null, h: [] };
  function learnTick(f) { var nb = null; try { nb = window.__navBoat ? window.__navBoat() : null; } catch (e) {} var useLog = nb && nb.age && nb.age.bsp != null && nb.age.bsp < 5000, v = useLog ? nb.bsp : f && f.sog, V = vGood(), t = Date.now(); if (v == null || !V) return;
    if (v < V * 0.5) LRN.lowAt = t; else if (LRN.lowAt && v >= V * 0.9) { var dt = (t - LRN.lowAt) / 1000; if (dt > 1 && dt < 60) { var a = (B.accL || []).concat([Math.round(dt / 0.4)]).slice(-10), so = a.slice().sort(function (x, y) { return x - y; }); B.accL = a; B.accLearn = so[Math.floor(so.length / 2)]; B.accN = a.length; saveB(); } LRN.lowAt = null; }
    var hd = useLog && nb.hdg != null ? nb.hdg : f && f.sog > 2 && f.cog != null ? f.cog : null; if (hd != null && v > 2) {   /* F45: the GPS course too, so Mark and Route learn turns */ LRN.h.push([t, hd]); LRN.h = LRN.h.filter(function (q) { return t - q[0] < 20000; }); var h0 = LRN.h[0]; if (h0 && Math.abs(n180(hd - h0[1])) >= 60 && (!LRN.tkAt || t - LRN.tkAt > 30000)) { var k = 1; while (k < LRN.h.length && Math.abs(n180(LRN.h[k][1] - h0[1])) < 10) k++; var ts = (t - LRN.h[Math.min(k, LRN.h.length - 1)][0]) / 1000; if (ts > 1) { var wq = windRef(), gy = !!(wq && wq.twd != null && Math.abs(n180(h0[1] - wq.twd)) >= 90), kL = gy ? 'gyL' : 'tkL', b2 = (B[kL] || []).concat([Math.round(ts)]).slice(-10), s2 = b2.slice().sort(function (x, y) { return x - y; }); B[kL] = b2; B[gy ? 'gybeLearn' : 'tackLearn'] = s2[Math.floor(s2.length / 2)]; saveB(); }   /* F45: tacks and gybes kept apart */ LRN.tkAt = t; LRN.h = []; } } }
  /* F45 (Stuart 18 Nov 07:40, Q&A): time to the line allows for the turn the boat must make to reach it (tack or gybe seconds typed, then
     learnt) and, when the line is upwind, for beating to it at the angle the polar gives for the speed being done (a slow boat points
     worse: the beat angle of the polar at the wind speed where its upwind boat speed is the speed now). */
  function lineBrg(f) { var l = lineNow(); if (!l || !f) return null; var k = Math.cos(f.la * R) * 60, P = [(l.pin[1] - l.boat[1]) * k, (l.pin[0] - l.boat[0]) * 60], F = [(f.lo - l.boat[1]) * k, (f.la - l.boat[0]) * 60], LL = P[0] * P[0] + P[1] * P[1] || 1e-12, u = Math.max(0, Math.min(1, (F[0] * P[0] + F[1] * P[1]) / LL)), Q = [P[0] * u - F[0], P[1] * u - F[1]]; return Math.hypot(Q[0], Q[1]) < 1e-6 ? null : n360(Math.atan2(Q[0], Q[1]) / R); }
  function beatAt(sp, tws, s0, V) { var bv = window.FSRouter && sp ? FSRouter.bestVmg(sp, tws, true) : null, a = bv && bv[0] ? bv[0] : 42, slow = false;
    if (sp && s0 != null && V && s0 < V * 0.8 && bv && bv[1] > 0) { for (var w = tws; w > 2; w -= 0.5) { var b2 = FSRouter.bestVmg(sp, w, true); if (b2[1] <= s0 || w <= 2.5) { if (b2[0]) { a = Math.max(a, b2[0]); slow = true; } break; } } }
    return { a: a, slow: slow }; }
  /* Stuart 18 Nov 16:55: "the min you loose is one boat length ... Gybing you loose 0.25 boat length": with no learnt or typed time, a tack
     costs the time to sail one boat length at the good speed, a gybe a quarter of a length */
  function lenSecs(kind, V) { var L = B.loa > 3 ? +B.loa : null; if (!L || !(V > 0.5)) return null; return Math.round((kind === 'tack' ? 1 : 0.25) * L / (V * 1852 / 3600) * 10) / 10; }
  function turnSecs(kind, V) { var ls = lenSecs(kind, V); return kind === 'tack' ? (B.tackLearn > 0 ? { s: B.tackLearn, src: 'learnt' } : B.tackS > 0 ? { s: +B.tackS, src: 'typed' } : ls ? { s: ls, src: 'one boat length' } : null) : (B.gybeLearn > 0 ? { s: B.gybeLearn, src: 'learnt' } : B.gybeS > 0 ? { s: +B.gybeS, src: 'typed' } : ls ? { s: ls, src: 'a quarter of a boat length' } : null); }
  function approach(f, V) { var w = windRef(), brg = lineBrg(f); if (!w || w.twd == null || brg == null) return null; var sp = null; try { sp = window.__fsSpeed ? window.__fsSpeed() : null; } catch (e) {}
    var tws = w.tws > 0 ? +w.tws : 12, s0 = f && f.sog != null ? f.sog : null, bt = beatAt(sp, tws, s0, V), th = Math.abs(n180(brg - w.twd)), k = 1, o = { beat: bt.a, slow: bt.slow, up: th < bt.a };
    if (o.up) k = Math.cos(bt.a * R) / Math.max(0.2, Math.cos(th * R));   /* tacking up to a point inside the no-go zone */
    var cog = f && f.sog > 1 && f.cog != null ? f.cog : null; if (cog != null) { var a0 = n180(cog - w.twd), a1 = n180(brg - w.twd); if (o.up && Math.abs(a0) < 90) a1 = a0; if (a0 * a1 < 0) { o.turn = Math.abs(a0) < 90 ? 'tack' : 'gybe'; o.ts = turnSecs(o.turn, V); } }
    o.k = k; return o; }
  function startMaths(lc, f, rem) { spdNote(f); var V = vGood(), d = lc && lc.d != null ? lc.d : null, s0 = f && f.sog != null ? f.sog : 0; SS.ml = null; if (d == null || !V) return { V: V };
    var ap = null; try { ap = approach(f, V); } catch (e) {} var kk = ap && ap.k > 0 ? ap.k : 1, tsec = ap && ap.ts ? ap.ts.s : 0;
    var ac = accNow(), ttl = d / (V * kk) * 3600 + tsec, lost = ac ? ac.s * Math.pow(Math.max(0, V - s0), 2) / (2 * V * V) : 0, burn = rem != null ? rem - ttl - lost : null;
    if (rem != null && rem > 0) { var Dm = Math.max(0, (rem - lost) * V * 0.514); SS.ml = { D: Dm, burn: burn, early: burn != null && burn > 0 }; }
    return { V: V, ttl: ttl + lost, lost: lost, burn: burn, ac: ac, ap: ap }; }
  function windNote() { var t = Date.now(), nw = null; try { nw = window.__navWind ? window.__navWind() : null; } catch (e) {} if (nw && nw[1] != null && (!SS.wl.length || t - SS.wl[SS.wl.length - 1][0] > 30000)) SS.wl.push([t, nw[1]]);
    var w = B.wind; if (w && w.twd != null && w.at && !SS.wl.some(function (q) { return q[0] === w.at; })) SS.wl.push([w.at, w.twd]); SS.wl.sort(function (a, b) { return a[0] - b[0]; }); SS.wl = SS.wl.filter(function (q) { return t - q[0] < 600000; }); }
  function windTrend() { windNote(); if (SS.wl.length < 2) return null; var a = SS.wl[0], b = SS.wl[SS.wl.length - 1], d = ((b[1] - a[1] + 540) % 360) - 180, m = Math.round((b[0] - a[0]) / 60000); return m < 1 ? null : { d: Math.round(d), m: m }; }
  function lengths(m) { return B.loa > 3 ? ' (' + (m / B.loa).toFixed(1) + ' lengths)' : ''; }
  function lineCheck() { var l = lineNow(), out = []; if (!l) return out; var now = Date.now(), len = lineLen(), w = windRef();
    ['boat', 'pin'].forEach(function (k) { var t = l[k][2]; if (t && now - t > 20 * 60000) out.push((k === 'boat' ? 'Committee boat end' : 'Pin end') + ' set ' + Math.round((now - t) / 60000) + ' min ago: ping again if the committee has moved it.'); });
    if (len < 30) out.push('The line is only ' + Math.round(len) + ' m long: check the two ends.'); else if (len > 2000) out.push('The line is ' + (len / 1852).toFixed(1) + ' nm long: check the two ends.');
    if (w && w.twd != null) { var k0 = Math.cos(l.boat[0] * R), P = [(l.pin[1] - l.boat[1]) * k0, l.pin[0] - l.boat[0]], ux = Math.sin(w.twd * R), uy = Math.cos(w.twd * R), right = ux * P[1] - uy * P[0]; if (right < 0) out.push('Looking up the wind the pin is to starboard of the committee boat: most lines have the committee boat at the starboard end. Check the ends are not swapped.'); }
    return out; }
  /* the first mark, from the middle of the line: its bearing and leg type; on a reach or run the end nearer to it gains (M40, M41) */
  function firstLeg() { var l = lineNow(), cc = window.__navCourse && window.__navCourse(), w = windRef(); if (!l || !cc) return null; var m = (cc.marks || [])[0] || cc.finish; if (!m) return null;
    var mla = (l.boat[0] + l.pin[0]) / 2, mlo = (l.boat[1] + l.pin[1]) / 2, k = Math.cos(mla * R), br = (Math.atan2((m.lon - mlo) * k, m.lat - mla) / R + 360) % 360, dd = function (a) { return Math.hypot((m.lon - a[1]) * k * 60, (m.lat - a[0]) * 60) * 1852; };
    var db = dd(l.boat), dp = dd(l.pin), lt = w && w.twd != null ? legType(br, w.twd) : '', up = /beat/i.test(lt);
    return { name: String(m.name || '').replace(/^(Start|Finish), /, ''), br: br, lt: lt, up: up, near: db < dp ? 'Boat' : 'Pin', gain: Math.round(Math.abs(db - dp)) }; }
  function flagPic(ctx, x, y, f, w) { var h = w * 0.7; ctx.save(); ctx.translate(x, y); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1;
    if (f === 'I') { ctx.fillStyle = '#facc15'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(w / 2, h / 2, h * 0.28, 0, 2 * Math.PI); ctx.fill(); }
    else if (f === 'Z') { var c = [['#facc15', [0, 0, w / 2, h / 2, 0, h]], ['#111', [0, 0, w, 0, w / 2, h / 2]], ['#2563eb', [w, 0, w, h, w / 2, h / 2]], ['#dc2626', [0, h, w / 2, h / 2, w, h]]]; c.forEach(function (q) { var t = q[1]; ctx.fillStyle = q[0]; ctx.beginPath(); ctx.moveTo(t[0], t[1]); ctx.lineTo(t[2], t[3]); ctx.lineTo(t[4], t[5]); ctx.closePath(); ctx.fill(); }); }
    else if (f === 'U') { for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) { ctx.fillStyle = (i + j) % 2 ? '#fff' : '#dc2626'; ctx.fillRect(i * w / 2, j * h / 2, w / 2, h / 2); } }
    else if (f === 'B') { ctx.fillStyle = '#111'; ctx.fillRect(0, 0, w, h); }
    else { ctx.fillStyle = '#1d4ed8'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#fff'; ctx.fillRect(w * 0.3, h * 0.27, w * 0.4, h * 0.46); }
    ctx.strokeRect(0, 0, w, h); ctx.restore(); }
  function flagUrl(f) { var c = document.createElement('canvas'); c.width = 40; c.height = 28; flagPic(c.getContext('2d'), 0, 0, f || 'P', 40); return c.toDataURL(); }
  /* a layline over the ground: the boat sails heading h (= d + 180) at its speed; the tide adds to that, so the line it can lay to the end
     turns down-tide. Corrected only with the boat moving (SOG 2 kn or more), as the speed sets how much the tide matters */
  function layDir(d, f) { var tz = tideRef(), V = f && f.sog >= 2 ? f.sog : 0; if (!tz || !(tz.spd > 0.05) || !V) return d; var h = (d + 180) * R, gx = V * Math.sin(h) + tz.spd * Math.sin(tz.dir * R), gy = V * Math.cos(h) + tz.spd * Math.cos(tz.dir * R); return (Math.atan2(-gx, -gy) / R + 360) % 360; }
  /* the tide at the line (Stuart 17 Nov 09:35: "YOU HAVE MISSED OUT SETTING BY HAND THE TIDE WHICH IS CRUCIAL. Tide can also be found on the NMEA interface if on Mark+"):
     By hand (rate and direction it runs to), From the boat (Mark+: the instruments' set and drift, or GPS against log and compass), or Forecast (Route's tidal streams) */
  function tideRef() { var t = B.tide || {}, md = t.mode || 'model';
    if (md === 'hand') return t.spd >= 0 && t.dir != null && t.dir !== '' ? { spd: +t.spd, dir: +t.dir, src: 'by hand', mode: md } : { mode: md, need: true };
    if (md === 'boat') { var nt = null; try { nt = window.__navTide ? window.__navTide() : null; } catch (e) {} return nt ? { spd: nt.spd, dir: nt.dir, src: nt.src || 'the boat', mode: md } : { mode: md, need: true }; }
    var l = lineNow(), at = l ? [(l.boat[0] + l.pin[0]) / 2, (l.boat[1] + l.pin[1]) / 2] : B.start ? [B.start.lat, B.start.lon] : ROUTE ? kitPos() : null, v = null; if (!at) return { mode: md, need: true };
    try { v = window.__fsTideAt ? window.__fsTideAt(at[0], at[1]) : null; } catch (e) {} if (!v) return { mode: md, need: true }; return { spd: Math.hypot(v[0], v[1]), dir: (Math.atan2(v[0], v[1]) / R + 360) % 360, src: 'forecast', mode: md }; }
  function tideTxt(z) { if (!z || z.need) return z && z.mode === 'hand' ? 'by hand: give the rate and direction' : z && z.mode === 'boat' ? 'from the boat: no set and drift yet' : 'forecast: none at the line yet'; return z.spd.toFixed(1) + ' kn to ' + ('00' + Math.round(z.dir)).slice(-3) + '°T (' + z.src + ')'; }
  function pushTide() { try { var t = B.tide || {}, z = tideRef(); if (window.__fsTideHand) window.__fsTideHand(t.mode === 'hand' || t.mode === 'boat' ? (z && !z.need ? { on: true, spd: +z.spd.toFixed(2), dir: Math.round(z.dir), src: z.src } : { on: false }) : { on: false }); } catch (e) {} }
  function ssDraw(cv, lc, rem) {
    var dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return; if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#0b2a45'; ctx.fillRect(0, 0, W, H);
    var l = lineNow(); if (!l) { ctx.fillStyle = '#cbd5e1'; ctx.font = '600 15px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Set the start line to see it here', W / 2, H / 2); return; }
    var w = windRef(), nw = null; try { nw = window.__navWind ? window.__navWind() : null; } catch (e) {} var twd = nw && nw[1] != null ? nw[1] : w && w.twd != null ? w.twd : null;
    var mla = (l.boat[0] + l.pin[0]) / 2, mlo = (l.boat[1] + l.pin[1]) / 2, k = Math.cos(mla * R) * 1852 * 60, toM = function (la, lo) { return [(lo - mlo) * k, (la - mla) * 1852 * 60]; };   /* metres east and north of the middle of the line */
    var A = toM(l.boat[0], l.boat[1]), P = toM(l.pin[0], l.pin[1]), up = twd != null ? twd : ((Math.atan2(P[0] - A[0], P[1] - A[1]) / R) - 90 + 360) % 360, rot = up * R;   /* (17 Nov 15:00: the sign was wrong, so the line and laylines were turned the wrong way while the wind arrow and the boat were right) the wind at the top; without it the line lies across */
    var f = null; try { f = window.__fsLiveFix && window.__fsLiveFix(); } catch (e) {} var Bm = f ? toM(f.la, f.lo) : null;
    var span = Math.max(Math.hypot(P[0] - A[0], P[1] - A[1]) * 1.5, 250, Bm ? Math.hypot(Bm[0], Bm[1]) * 2.3 : 0), sc = Math.min(W, H) * 0.92 / span * (SS.zoom || 1), cx = W / 2, cy = H * 0.52;
    var X = function (m) { var x = m[0] * Math.cos(rot) - m[1] * Math.sin(rot), y = m[0] * Math.sin(rot) + m[1] * Math.cos(rot); return [cx + x * sc, cy - y * sc]; };
    var a = X(A), p = X(P), bi = biasNow();
    /* laylines from both ends, down the wind */
    if (twd != null) { var ba = (w && w.ba) || 42; ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = 'rgba(255,138,31,.85)'; ctx.lineWidth = 2; [[A, twd + 180 - ba], [P, twd + 180 + ba], [A, twd + 180 + ba], [P, twd + 180 - ba]].forEach(function (q, i) { if (i > 1) return; var dd = layDir(q[1], f), e = [q[0][0] + Math.sin(dd * R) * span, q[0][1] + Math.cos(dd * R) * span], s0 = X(q[0]), s1 = X(e); ctx.beginPath(); ctx.moveTo(s0[0], s0[1]); ctx.lineTo(s1[0], s1[1]); ctx.stroke(); }); ctx.restore(); }
    /* M53 (Stuart 13:46, 14:10 "Line parallel to start"): the moving line. Parallel to the start line on the pre-start side, at the
       distance the boat can still cover before the gun at its good speed, less the time to speed up. It moves up to the start line as
       the clock runs. Boat behind it: late (blue), time to make up; between it and the start line: early (red), time to burn */
    var ml = SS.ml; if (ml && ml.D > 0 && rem > 0) { var ux0 = P[0] - A[0], uy0 = P[1] - A[1], L0 = Math.hypot(ux0, uy0) || 1, nx = -uy0 / L0, ny = ux0 / L0, sd = (Bm ? (nx * (Bm[0] - A[0]) + ny * (Bm[1] - A[1])) : 0) <= 0 ? -1 : 1;
      var off = Math.min(ml.D, span * 1.2), q1 = X([A[0] + nx * off * sd - ux0 / L0 * 120, A[1] + ny * off * sd - uy0 / L0 * 120]), q2 = X([P[0] + nx * off * sd + ux0 / L0 * 120, P[1] + ny * off * sd + uy0 / L0 * 120]);
      ctx.save(); ctx.strokeStyle = ml.early ? '#ef4444' : '#60a5fa'; ctx.lineWidth = 3; ctx.setLineDash([12, 6]); ctx.beginPath(); ctx.moveTo(q1[0], q1[1]); ctx.lineTo(q2[0], q2[1]); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = ctx.strokeStyle; ctx.font = '700 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(ml.D > span * 1.2 ? 'ON TIME LINE ' + Math.round(ml.D) + ' m back' : (ml.early ? 'EARLY: ' : 'LATE: ') + Math.abs(Math.round(ml.burn)) + ' s', (q1[0] + q2[0]) / 2, (q1[1] + q2[1]) / 2 - 8); ctx.restore(); }
    /* the line, the favoured end and the bias */
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#4CC38A'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); ctx.restore();
    /* M38 (peer review G6, from DashT's ladder rungs): a ladder rung through the favoured end, square to the wind; the other end sits
       behind it by the bias, so the gap between them is what starting at the wrong end costs */
    if (bi && bi.m >= 2 && twd != null) { var FE = /Pin|Outer/.test(bi.end) ? P : A, rx = Math.sin((twd + 90) * R) * span, ry = Math.cos((twd + 90) * R) * span, r1 = X([FE[0] - rx, FE[1] - ry]), r2 = X([FE[0] + rx, FE[1] + ry]); ctx.save(); ctx.strokeStyle = 'rgba(76,195,138,.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([2, 6]); ctx.beginPath(); ctx.moveTo(r1[0], r1[1]); ctx.lineTo(r2[0], r2[1]); ctx.stroke(); ctx.restore(); }
    if (bi && bi.m >= 2) { var fe = /Pin|Outer/.test(bi.end) ? p : a; ctx.save(); ctx.fillStyle = 'rgba(76,195,138,.25)'; ctx.beginPath(); ctx.arc(fe[0], fe[1], 22, 0, 2 * Math.PI); ctx.fill(); ctx.fillStyle = '#4CC38A'; ctx.font = '700 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('FAVOURED +' + bi.m + ' m', fe[0], fe[1] + 38); ctx.restore(); }
    /* the way to the first mark, from the middle of the line (M40) */
    var fm = firstLeg(); if (fm) { var e0 = X([0, 0]), e1 = X([Math.sin(fm.br * R) * span * 0.45, Math.cos(fm.br * R) * span * 0.45]); ctx.save(); ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(250,204,21,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e0[0], e0[1]); ctx.lineTo(e1[0], e1[1]); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#facc15'; ctx.font = '700 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('TO ' + fm.name.toUpperCase().slice(0, 14), e1[0], e1[1] - 6); ctx.restore(); }
    boatSym(ctx, a[0], a[1]); flagPic(ctx, a[0] + 3, a[1] - 33, B.flag || 'P', 14); pinSym(ctx, p[0], p[1]);
    /* the tide arrow, bottom left (Stuart 09:35: the tide is crucial) */
    var tz = tideRef(); if (tz && tz.spd > 0.05) { var ta = tz.dir * R - rot, tx = 34, ty = H - 40, tl = Math.min(26, 10 + tz.spd * 8); ctx.save(); ctx.strokeStyle = '#38bdf8'; ctx.fillStyle = '#38bdf8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx - Math.sin(ta) * tl, ty + Math.cos(ta) * tl); ctx.lineTo(tx + Math.sin(ta) * tl, ty - Math.cos(ta) * tl); ctx.stroke(); ctx.beginPath(); ctx.moveTo(tx + Math.sin(ta) * (tl + 6), ty - Math.cos(ta) * (tl + 6)); ctx.lineTo(tx + Math.sin(ta + 2.6) * 8 + Math.sin(ta) * tl, ty - Math.cos(ta + 2.6) * 8 - Math.cos(ta) * tl); ctx.lineTo(tx + Math.sin(ta - 2.6) * 8 + Math.sin(ta) * tl, ty - Math.cos(ta - 2.6) * 8 - Math.cos(ta) * tl); ctx.fill(); ctx.font = '700 11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('TIDE ' + tz.spd.toFixed(1) + ' kn', 8, H - 6); ctx.restore(); }
    /* the wind arrow at the top */
    ctx.save(); ctx.fillStyle = '#93c5fd'; ctx.font = '700 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(twd != null ? 'WIND ' + ('00' + Math.round(twd)).slice(-3) + '°' : 'GIVE THE WIND FOR THE BIAS', W / 2, 16); if (twd != null) { ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W / 2, 22); ctx.lineTo(W / 2, 46); ctx.stroke(); ctx.beginPath(); ctx.moveTo(W / 2 - 6, 40); ctx.lineTo(W / 2, 48); ctx.lineTo(W / 2 + 6, 40); ctx.stroke(); } ctx.restore();
    /* the boat, its last minute and where it will be at the gun */
    if (Bm) { var now = Date.now(); SS.trail.push([f.la, f.lo, now]); SS.trail = SS.trail.filter(function (q) { return now - q[2] < 60000; });
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); SS.trail.forEach(function (q, i) { var s1 = X(toM(q[0], q[1])); if (i) ctx.lineTo(s1[0], s1[1]); else ctx.moveTo(s1[0], s1[1]); }); ctx.stroke(); ctx.restore();
      var b = X(Bm), cog = f.cog != null ? f.cog : up, sog = f.sog || 0;
      if (rem > 0 && sog > 0.3) { var dm = Math.min(sog * 0.5144 * rem, span), e2 = X([Bm[0] + Math.sin(cog * R) * dm, Bm[1] + Math.cos(cog * R) * dm]), burn = lc && lc.burn, col = burn == null ? '#e2e8f0' : burn < -3 ? '#ef4444' : burn > 8 ? '#f59e0b' : '#22c55e'; ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(e2[0], e2[1]); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(e2[0], e2[1], 4, 0, 2 * Math.PI); ctx.fill(); ctx.restore(); }
      ctx.save(); ctx.translate(b[0], b[1]); ctx.rotate((cog - up) * R); ctx.fillStyle = lc && lc.over ? '#ef4444' : '#f8fafc'; ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(7, 9); ctx.lineTo(-7, 9); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
    else { ctx.fillStyle = '#cbd5e1'; ctx.font = '600 13px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Waiting for GPS to show the boat', W / 2, H - 12); }
  }
  function ssRender(rem) {
    if (!$('solStartScr') || $('solStartScr').hidden) ['solLegs', 'solAfter'].forEach(function (id) { var x = $(id); if (x) x.hidden = true; });   /* the start screen comes first: the leg list closes when it opens */
    var e = $('solStartScr'); if (!e) { e = document.createElement('div'); e.id = 'solStartScr'; e.className = 'solss'; e.setAttribute('role', 'region'); e.setAttribute('aria-label', 'Start screen'); document.body.appendChild(e);
      e.innerHTML = '<div class="sshd"><img class="ssflag" alt="" data-q="flag"><b class="sst"></b><span class="ssg"></span><label class="ssmin"><span>Opens</span><select data-ssmin="1" aria-label="When the start screen opens by itself"><option value="10">10 min before</option><option value="5">5 min before</option><option value="3">3 min before</option><option value="0">Off: by hand</option></select></label><button class="btn" data-q="ssview">Picture</button><button class="btn" data-q="small" aria-label="Back to the chart">Chart</button></div><canvas class="sscv" aria-label="The start line, the wind and your boat"></canvas><div class="ssnum"></div><div class="sqrow"><button class="btn primary" data-q="sync">Sync</button><button class="btn" data-q="m1">−1 min</button><button class="btn" data-q="p1">+1 min</button><button class="btn" data-q="ap">AP</button><button class="btn" data-q="recall">Recall</button></div><div class="sqrow ssping"><button class="btn" data-q="pingb">Ping boat end</button><button class="btn" data-q="pingp">Ping pin end</button></div><p class="ssov" hidden></p>';
      e.addEventListener('click', sqClick);
      /* M54 (Stuart 13:46): the picture zooms: + and − buttons, a pinch, or the mouse wheel; double tap back to the whole line */
      var cvz = e.querySelector('.sscv'), zb = document.createElement('div'); zb.className = 'sszoom'; zb.innerHTML = '<button class="btn" data-z="in" aria-label="Zoom in">+</button><button class="btn" data-z="out" aria-label="Zoom out">−</button>'; cvz.insertAdjacentElement('afterend', zb);
      zb.addEventListener('click', function (ev) { var t = ev.target.closest('[data-z]'); if (!t) return; ev.stopPropagation(); SS.zoom = Math.max(0.5, Math.min(8, (SS.zoom || 1) * (t.dataset.z === 'in' ? 1.5 : 1 / 1.5))); sqRender(); });
      var pz = {}; cvz.addEventListener('pointerdown', function (ev) { pz[ev.pointerId] = [ev.clientX, ev.clientY]; }); cvz.addEventListener('pointerup', function (ev) { delete pz[ev.pointerId]; pz.d = null; }); cvz.addEventListener('pointercancel', function (ev) { delete pz[ev.pointerId]; pz.d = null; });
      cvz.addEventListener('pointermove', function (ev) { if (!pz[ev.pointerId]) return; pz[ev.pointerId] = [ev.clientX, ev.clientY]; var ks = Object.keys(pz).filter(function (k) { return k !== 'd'; }); if (ks.length !== 2) return; var a = pz[ks[0]], b = pz[ks[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pz.d) { SS.zoom = Math.max(0.5, Math.min(8, (SS.zoom || 1) * d / pz.d)); sqRender(); } pz.d = d; });
      cvz.addEventListener('wheel', function (ev) { ev.preventDefault(); SS.zoom = Math.max(0.5, Math.min(8, (SS.zoom || 1) * (ev.deltaY < 0 ? 1.15 : 1 / 1.15))); sqRender(); }, { passive: false });
      cvz.addEventListener('dblclick', function () { SS.zoom = 1; sqRender(); }); cvz.style.touchAction = 'none'; }
    var lc = null; try { lc = window.__fsLineCalc ? window.__fsLineCalc(B.startAt) : null; } catch (x) {} var bi = biasNow(), f = null; try { f = window.__fsLiveFix && window.__fsLiveFix(); } catch (x) {}
    var mm = function (v) { var a0 = Math.max(0, Math.round(Math.abs(v))); return (v < 0 ? '−' : '') + Math.floor(a0 / 60) + ':' + ('0' + a0 % 60).slice(-2); };
    e.querySelector('.sst').textContent = B.pp ? 'AP' : mm(rem); e.querySelector('.ssg').textContent = B.pp ? 'Postponed' : 'Gun ' + clk(B.startAt) + ' · ' + seqName();
    var fl = e.querySelector('.ssflag'), fu = B.flag || 'P'; if (fl.dataset.f !== fu) { fl.src = flagUrl(fu); fl.dataset.f = fu; fl.title = FLAGS[fu] + ' Tap to change.'; }
    var smS = e.querySelector('[data-ssmin]'); if (smS && document.activeElement !== smS) smS.value = String(B.ssMin == null ? 10 : B.ssMin);
    if (smS && !smS.__b) { smS.__b = 1; smS.addEventListener('change', function () { B.ssMin = +smS.value; saveB(); sqRender(); toast(B.ssMin ? 'The start screen opens by itself ' + B.ssMin + ' minutes before the gun.' : 'The start screen no longer opens by itself: tap Start screen in the start box.'); }); }   /* Stuart 18 Nov 19:44: a menu, not a button that steps round */
    var cell = function (k, v, sub, cls) { return '<div class="ssc' + (cls ? ' ' + cls : '') + '"><span>' + k + '</span><b>' + v + '</b><i>' + (sub || '&nbsp;') + '</i></div>'; };
    var sm = startMaths(lc, f, rem), burn = sm.burn != null ? Math.round(sm.burn) : lc && lc.burn != null ? Math.round(lc.burn) : null, tr = windTrend(), fl1 = firstLeg(), chk = lineCheck();
    e.querySelector('.ssnum').innerHTML = cell('To the line', lc && lc.d != null ? (lc.d < 0.1 ? Math.round(lc.d * 1852) + ' m' : lc.d.toFixed(2) + ' nm') : '--', lc && lc.over ? 'course side' : '', lc && lc.over ? 'bad' : '') +
      cell('Time to line', sm.ttl != null ? mm(sm.ttl) : lc && lc.ttl != null ? mm(lc.ttl) : '--', sm.ttl != null ? 'at ' + sm.V.toFixed(1) + ' kn, your best of 2 min' + (sm.lost > 1 ? ' +' + Math.round(sm.lost) + ' s to speed up (' + esc(sm.ac.src) + ')' : '') + (sm.ap && sm.ap.up ? ' · beating at ' + Math.round(sm.ap.beat) + '°' + (sm.ap.slow ? ' (slow: wider)' : '') : '') + (sm.ap && sm.ap.turn ? (sm.ap.ts ? ' +' + sm.ap.ts.s + ' s to ' + sm.ap.turn + (sm.ap.ts.src !== 'learnt' && sm.ap.ts.src !== 'typed' ? ' (' + sm.ap.ts.src + ')' : '') : ' · a ' + sm.ap.turn + ' needed: give its seconds') : '') : lc && lc.ttl != null ? 'at this speed' : 'needs the boat moving') +
      cell('Time to burn', burn != null ? (burn > 0 ? '+' : '') + burn + ' s' : '--', burn == null ? '' : burn > 8 ? 'early: burn it' : burn < -3 ? 'late: go' : 'on time', burn == null ? '' : burn > 8 ? 'warn' : burn < -3 ? 'bad' : 'good') +
      cell('Bias', bi ? (bi.m < 2 ? 'Square' : (/Pin|Outer/.test(bi.end) ? 'Pin' : 'Boat') + ' +' + bi.m + ' m') : '--', bi ? (bi.m >= 2 && B.loa > 3 ? (bi.m / B.loa).toFixed(1) + ' lengths · ' : '') + bi.deg + '° off square' + (tr && Math.abs(tr.d) >= 3 ? ' · wind ' + (tr.d > 0 ? 'veered ' : 'backed ') + Math.abs(tr.d) + '° in ' + tr.m + ' min' : '') : 'give the wind') +
      (fl1 ? cell('First mark', esc(fl1.name) + ' ' + ('00' + Math.round(fl1.br)).slice(-3) + '°', (fl1.lt ? esc(fl1.lt) : 'give the wind for the leg') + (fl1.lt && !fl1.up && fl1.gain >= 5 ? ' · ' + fl1.near + ' end ' + fl1.gain + ' m nearer' : '')) : '') +
      cell('SOG · COG', f && f.sog != null ? f.sog.toFixed(1) + ' · ' + (f.cog != null ? ('00' + Math.round(f.cog)).slice(-3) + '°' : '--') : '--', f ? 'phone GPS' : 'GPS starting') +
      (function () { var nb = null; try { nb = window.__navBoat ? window.__navBoat() : null; } catch (e) {} var fr = function (k) { return nb && nb.age && nb.age[k] != null && nb.age[k] < 8000 && nb[k] != null; }, h = '';   /* M56 (Stuart 13:46): Mark+ shows what the boat sends; Mark the typed wind */
        if (nb && (fr('twa') || fr('awa') || fr('bsp'))) { h += cell('BSP', fr('bsp') ? (+nb.bsp).toFixed(1) + ' kn' : '--', 'log') + cell('TWA', fr('twa') ? Math.abs(Math.round(nb.twa)) + '° ' + (nb.twa < 0 ? 'port' : 'stbd') : '--', fr('tws') ? (+nb.tws).toFixed(1) + ' kn true' : '') + cell('AWA', fr('awa') ? Math.abs(Math.round(nb.awa)) + '° ' + (nb.awa < 0 ? 'port' : 'stbd') : '--', fr('aws') ? (+nb.aws).toFixed(1) + ' kn apparent' : ''); if (fr('heel')) h += cell('Heel', Math.abs(Math.round(nb.heel)) + '°', nb.heel < 0 ? 'to port' : 'to starboard'); }
        else { var wq = windRef(); h += cell('Wind', wq && wq.twd != null ? ('00' + Math.round(wq.twd)).slice(-3) + '°' : '--', wq ? (wq.tws > 0 ? wq.tws + ' kn · ' : '') + (wq.src === 'typed' || !wq.src ? 'typed' : esc(wq.src)) : 'give the wind'); }
        return h; })() +
      (function () { var tz = tideRef(); return cell('Tide', tz && !tz.need ? tz.spd.toFixed(1) + ' kn' : '--', tz && !tz.need ? 'to ' + ('00' + Math.round(tz.dir)).slice(-3) + '° · ' + tz.src : ROUTE ? 'no forecast tide here' : 'set it: Next, Tide'); })();
    var ov = e.querySelector('.ssov'), ot = ''; if (lc && lc.over && rem <= 60 && rem > -5) ot = B.flag && B.flag !== 'P' ? FLAGS[B.flag].replace(/^[^:]*: /, '') : 'On the course side: go back before the gun.'; else if (seriesTxt() && rem > 60) ot = seriesTxt(); else if (chk.length && rem > 120) ot = chk[0]; ov.hidden = !ot; ov.textContent = ot; ov.classList.toggle('ssinfo', !(lc && lc.over && rem <= 60));
    e.hidden = false; e.classList.toggle('sqlast', rem <= 60 && rem > 0); ssDraw(e.querySelector('.sscv'), lc, rem);
  }
  function clk(t) { var d = new Date(t * 1000); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + (d.getSeconds() ? ':' + ('0' + d.getSeconds()).slice(-2) : ''); }
  if (KIT) setInterval(function () { try { var sl = window.__fsLoa && window.__fsLoa(); if (sl > 3 && sl !== B.loa) { B.loa = sl; saveB(); } } catch (e) {} }, 2000);   /* F55: the boat length from Settings */
  if (KIT) setInterval(function () { var tn = Date.now(); if (!SS.lastNote || tn - SS.lastNote > 1000) { SS.lastNote = tn; try { var fq = window.__fsLiveFix && window.__fsLiveFix(); if (fq && (!SS.sp.length || SS.sp[SS.sp.length - 1][0] < tn - 900)) spdNote(fq); learnTick(fq); } catch (e) {} }   /* M36: speeds kept all the time, not only while the start screen shows */
    sqRender(); var ssv = $('solStartScr'); var ssOn = !!(ssv && !ssv.hidden); document.body.classList.toggle('fsss', ssOn); tbPlace();
    if (ssv) { ssv.classList.toggle('ssthru', !B.ssPic); var vb = ssv.querySelector('[data-q="ssview"]'); if (vb) vb.textContent = B.ssPic ? 'See chart' : 'Picture'; }
    window.__fsNorthHold = ssOn && !B.ssPic; if (ssOn && !SS.wasOn && !B.ssPic) setTimeout(ssFit, 120); SS.wasOn = ssOn;   /* Stuart's iPhone 18 Nov 19:44: the GPS window lay over the start screen; the screen has the same figures */
    if (!B.startAt || B.pp) return; var rem = Math.round(B.startAt - Date.now() / 1000); if (rem === SQ.last) return; SQ.last = rem; if (sqSignals().indexOf(rem) >= 0) sqTone(true); else if (rem > 0 && rem <= 10) sqTone(false); }, 250);
  /* M2 (Stuart 17 Nov 05:04): laylines to the next mark when it is upwind, from the typed wind (Mark) or the boat's wind (Mark+) */
  function laylines(ctx, X, Y) {
    var w = windRef(), nw = null; try { nw = window.__navWind ? window.__navWind() : null; } catch (e) {} var twd = nw && nw[1] != null ? nw[1] : w && w.twd != null ? w.twd : null; if (twd == null) return;
    var pc = null; try { pc = window.__fsPlot && window.__fsPlot.C && window.__fsPlot.C.on && window.__fsPlot.calc ? window.__fsPlot.calc() : null; } catch (e) {}
    var m = null, from = null; if (pc && pc.ok && !pc.m.route) { m = pc.m; from = pc.f ? { lat: pc.f.la, lon: pc.f.lo } : null; }
    else { var cc = window.__navCourse && window.__navCourse(); if (!cc || !cc.marks || !cc.marks.length) return; var pts = [cc.start].concat(cc.marks); for (var i = 1; i < pts.length; i++) { var a = pts[i - 1], q = pts[i], br = (Math.atan2((q.lon - a.lon) * Math.cos(a.lat * R), q.lat - a.lat) / R + 360) % 360; if (Math.abs(((br - twd + 540) % 360) - 180) < 50) { m = q; from = a; break; } } }
    if (!m) return; if (from) { var b2 = (Math.atan2((m.lon - from.lon) * Math.cos(from.lat * R), m.lat - from.lat) / R + 360) % 360; if (Math.abs(((b2 - twd + 540) % 360) - 180) >= 60) return; }
    var ba = (w && w.ba) || 42, Lnm = from ? Math.max(0.3, Math.hypot((m.lon - from.lon) * Math.cos(m.lat * R), m.lat - from.lat) * 60 * 1.1) : 1;
    ctx.save(); ctx.strokeStyle = '#ff8a1f'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.font = '700 10px Inter, sans-serif'; ctx.fillStyle = '#ff8a1f';
    [[twd + 180 - ba, 'PORT LAYLINE'], [twd + 180 + ba, 'STBD LAYLINE']].forEach(function (q) { var b = q[0], la = m.lat + Lnm * Math.cos(b * R) / 60, lo = m.lon + Lnm * Math.sin(b * R) / (60 * Math.cos(m.lat * R)); ctx.beginPath(); ctx.moveTo(X(m.lon), Y(m.lat)); ctx.lineTo(X(lo), Y(la)); ctx.stroke(); ctx.fillText(q[1], X(lo) + 4, Y(la)); });
    ctx.restore(); }
  /* M21 (Stuart 17 Nov 06:14): the start line is a committee boat and a yellow buoy with a flag on top; a point that is not a buoy is a target in a colour */
  function boatSym(ctx, x, y) { ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#f8fafc'; ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-11, -2); ctx.lineTo(11, -2); ctx.lineTo(7, 5); ctx.lineTo(-8, 5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillRect(-5, -7, 8, 5); ctx.strokeRect(-5, -7, 8, 5); ctx.beginPath(); ctx.moveTo(2, -7); ctx.lineTo(2, -19); ctx.stroke(); ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(2, -19); ctx.lineTo(11, -16); ctx.lineTo(2, -13); ctx.closePath(); ctx.fill(); ctx.restore(); }
  function pinSym(ctx, x, y) { ctx.save(); ctx.translate(x, y); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, -18); ctx.stroke(); ctx.fillStyle = '#2563eb'; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(9, -15); ctx.lineTo(0, -12); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); ctx.restore(); }
  function target(ctx, x, y, col) { ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 10, 0, 2 * Math.PI); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 5, 0, 2 * Math.PI); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 2 * Math.PI); ctx.fill(); [[0, -14, 0, -10], [0, 10, 0, 14], [-14, 0, -10, 0], [10, 0, 14, 0]].forEach(function (q) { ctx.beginPath(); ctx.moveTo(x + q[0], y + q[1]); ctx.lineTo(x + q[2], y + q[3]); ctx.stroke(); }); ctx.restore(); }
  function extras(ctx, X, Y) {
    var l = window.__fsLine ? window.__fsLine() : {};
    if (KIT && BV.on) biasDraw(ctx, X, Y);
    if (window.FS_MARK && l.boat && l.pin) { ctx.save(); ctx.strokeStyle = '#4CC38A'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(l.boat[1]), Y(l.boat[0])); ctx.lineTo(X(l.pin[1]), Y(l.pin[0])); ctx.stroke(); var bi = biasNow(); if (bi && !BV.on && bi.m >= 2) { var fe = /Pin|Outer/.test(bi.end) ? l.pin : l.boat; ctx.font = '700 10px Inter, sans-serif'; ctx.fillStyle = '#4CC38A'; ctx.fillText('FAVOURED ' + bi.m + ' m', X(fe[1]) + 12, Y(fe[0]) + 12); } ctx.restore(); }
    if (window.FS_MARK) { if (l.boat) boatSym(ctx, X(l.boat[1]), Y(l.boat[0])); if (l.pin) pinSym(ctx, X(l.pin[1]), Y(l.pin[0])); }
    if (window.FS_MARK && !window.__navPlot) laylines(ctx, X, Y);   /* Mark+ draws its own laylines, with the tide, in Route+'s plotter */
    if (!window.FS_MARK) return; var w = B.wl, pts = [];
    if (B.type === 'wl') { if (w.wkind === 'pt' && w.wpt && !w.wpt.code) pts.push([w.wpt, '#d946ef']); if (w.lkind === 'pt' && w.lpt && !w.lpt.code) pts.push([w.lpt, '#f97316']); if (w.lkind === 'gate') [w.g1, w.g2].forEach(function (g) { if (g && !g.code) pts.push([g, '#f97316']); }); if (w.wkind === 'brg') { var W0 = windward(); if (W0) pts.push([W0, '#d946ef']); } }
    if (B.start && !B.start.code && !B.start.line) pts.push([B.start, '#22c55e']); if (B.fin === 'mark' && B.finish && !B.finish.code) pts.push([B.finish, '#ef4444']);
    pts.forEach(function (q) { target(ctx, X(q[0].lon), Y(q[0].lat), q[1]); });
  }
  /* ---- Settings, Charts: the switch and the button ---- */
  /* Stuart 15 Nov 11:26: "on solent race zoom should be set to allow the max": the Closest zoom slider (Settings, Chart) goes to 6 times */
  function zoomMax() { var z = $('zoomMax'); if (!z || +z.value >= +z.max) return; z.value = z.max; z.dispatchEvent(new Event('input', { bubbles: true })); z.dispatchEvent(new Event('change', { bubbles: true })); }
  function setOn(v) { C.on = !!v; sv(KEY, C); if (C.on) { load(); zoomMax(); } redraw(); var e = $('solentOn'); if (e) e.checked = C.on; }
  function hookSettings() {
    var e = $('solentOn'); if (e) { e.checked = !!C.on; e.onchange = function () { setOn(e.checked); }; }
    var bt = $('solentBuild'); if (bt) bt.onclick = function () { if (!C.on) setOn(true); openBuilder(); };
  }
  /* M12 (Stuart 17 Nov 05:30): at the gun the racing window opens by itself: the plotter, steering to the next mark (rhumb line) or along the route */
  if (window.FS_MARK) setInterval(function () { var now = Date.now() / 1000; if (!B.shown || !B.startAt || B.raced === B.startAt || now < B.startAt || now > B.startAt + 600) return; B.raced = B.startAt; saveB(); try { var PL = window.__fsPlot || window.__navPlot; if (PL && !PL.C.on) PL.toggle(true); toast('The gun: the racing window is open. Tap MARK or ROUTE in it to steer to the next mark or along the route.'); } catch (e) {} }, 1000);
  (window.__fsOverlays = window.__fsOverlays || []).push(overlay);
  window.__fsTapHook = tapHook;
  /* M71 (Stuart 18 Nov 05:58: "a button on mark and mark+ easy to see that says stop race and a button that says show start sequence
     screen ... work out a logic tree to be sure exactly where they should go"). Logic tree (docs/MARK-RACE-BUTTONS.md):
       no race set, or the race stopped .......................... neither button
       gun set, more than a minute to go, or postponed ........... START SEQUENCE (unless the start screen is already up) and STOP RACE
       start screen up ........................................... neither (it has its own controls; its × or Small gives them back)
       race under way (after the gun, up to 10 hours) ............ STOP RACE only
       a menu, Settings, Big numbers or HELM in front, or Clear screen  neither, so they never sit on top of another screen
     They sit together in the middle of the bottom edge of the chart, above the race panel or the menu bar, where the eye is. STOP RACE asks for a second tap within 4 seconds, so a knock never ends a race. */
  var RB = { el: null, arm: 0, key: '' };
  function rbState() {
    if (!KIT || !B.shown || !B.startAt || B.ended > B.startAt * 1000) return '';
    var now = Date.now() / 1000; if (now > B.startAt + 10 * 3600) return '';
    if (ROUTE && now > B.startAt + 300) return '';   /* Stuart 18 Nov 17:55: offshore, the start buttons go 5 minutes after the gun (Mark keeps STOP RACE for the inshore race) */
    if (['solCard', 'sheet', 'liveBig', 'navHelm', 'solStartScr', 'help', 'fsTour', 'races'].some(function (id) { var e = $(id); return e && !e.hidden && e.getClientRects().length; })) return '';
    if (document.body.classList.contains('navclear')) return '';
    return now < B.startAt - 60 || B.pp ? 'pre' : now < B.startAt ? 'last' : 'run';
  }
  function rbRender() {
    var st = rbState(), armed = RB.arm && Date.now() - RB.arm < 4000; if (!armed) RB.arm = 0;
    var key = st + (armed ? 'a' : '');
    if (!RB.el) { if (!st) return; css(); var e = document.createElement('div'); e.id = 'solRaceBtns'; e.className = 'solrb'; e.setAttribute('role', 'group'); e.setAttribute('aria-label', 'Race controls'); document.body.appendChild(e); RB.el = e;
      e.addEventListener('click', function (ev) { var t = ev.target.closest('[data-rb]'); if (!t) return; ev.stopPropagation();
        if (t.dataset.rb === 'seq') { var c = $('solCard'); if (c) c.hidden = true; SQ.hide = 0; SQ.small = 0; SQ.force = B.startAt; sqRender(); rbRender(); return; }
        if (t.dataset.rb === 'stop') { if (!(RB.arm && Date.now() - RB.arm < 4000)) { RB.arm = Date.now(); rbRender(); setTimeout(rbRender, 4100); return; } RB.arm = 0; stopRace(); rbRender(); } }); }
    if (key !== RB.key) { RB.key = key;
      RB.el.innerHTML = (st === 'pre' || st === 'last' ? '<button class="btn solrbseq" type="button" data-rb="seq">START SEQUENCE</button>' : '') +
        (st ? '<button class="btn solrbstop' + (armed ? ' armed' : '') + '" type="button" data-rb="stop">' + (armed ? 'TAP AGAIN TO STOP' : 'STOP RACE') + '</button>' : ''); }
    RB.el.hidden = !st; if (!st) return;
    var bar = document.querySelector('.bar'), br = bar && bar.getClientRects().length ? bar.getBoundingClientRect() : null, h = RB.el.offsetHeight || 40, top;
    var ins = { t: 0, b: 0 }; try { ins = (window.__fsInsets && window.__fsInsets()) || ins; } catch (e) {}
    var chv = document.querySelector('.chart'), cr = chv && chv.getClientRects().length ? chv.getBoundingClientRect() : null;
    if (cr && cr.bottom - cr.top > 200) top = Math.min(cr.bottom, br && br.top > innerHeight / 2 ? br.top : innerHeight) - h - 14;   /* the bottom edge of the chart, in the middle: above the race panel or the menu bar, wherever the chart ends (18 Nov 06:15) */
    else if (br && br.top > innerHeight / 2) top = br.top - h - 10;   /* the bar along the bottom: just above it */
    else { top = Math.max(br ? br.bottom + 8 : 8, (ins.t || 0) + 8); var sq = $('solSeq'); if (sq && !sq.hidden && sq.getClientRects().length) top = Math.max(top, sq.getBoundingClientRect().bottom + 8); var tb = $('solTestBar'); if (tb && !tb.classList.contains('intb') && tb.getClientRects().length) top = Math.max(top, tb.getBoundingClientRect().bottom + 8); }   /* the bar along the top: below it, and below the small start box */
    top = Math.max(8, Math.min(innerHeight - (ins.b || 0) - h - 8, top));
    RB.el.style.top = Math.round(top) + 'px';
  }
  setInterval(rbRender, 1000);
  (function () { var st = document.createElement('style'); st.textContent = 'body.fsdeck #solSeq{display:none}' /* F44: the deck screen has its own GUN box; the bar covered its MENU button */ + '.solrb{position:fixed;z-index:56;left:50%;translate:-50% 0;display:flex;gap:8px;pointer-events:none}.solrb .btn{pointer-events:auto;font:800 13px/1 var(--f-body,system-ui);letter-spacing:.06em;padding:11px 16px;border-radius:10px;box-shadow:0 4px 14px rgba(0,0,0,.35);white-space:nowrap}.solrb .solrbseq{background:#6FA9E0;color:#042D5E;border:1px solid #042D5E}.solrb .solrbstop{background:#C8372D;color:#fff;border:1px solid #7a1c16}.solrb .solrbstop.armed{background:#fff;color:#C8372D;border:2px solid #C8372D}'; document.head.appendChild(st); })();
  window.FSSolent = { ss: function () { return SS; }, ssHold: function (on) { if (on) { SQ.small = B.startAt; SQ.force = 0; var s0 = $('solStartScr'); if (s0) s0.hidden = true; } else SQ.small = 0; sqRender(); }, em: function () { return EM; }, tideReset: function () { B.tide = { mode: 'model' }; saveB(); try { wzRender(); } catch (e) {} var lg = $('solLegs'); if (lg && !lg.hidden) showList(); }, test: function (on) { if (on === false) testStop(); else testStart(); }, testing: function () { return SIM.on; }, share: share, applyRemote: applyRemote, showList: showList, newCourse: newCourse, windRef: windRef, legType: legType, start: startCard, chain: chain, step: wzOpen, stepState: function () { return { on: WZ.on, n: WZ.n, key: WZ.on ? wzKey() : null }; }, go: go, list: list, on: setOn, isOn: function () { return !!C.on; }, open: openBuilder, marks: function () { return MK; }, startNow: function () { if (!B.startAt || B.pp) return null; var rem = B.startAt - Date.now() / 1000, lc = null, f = null, sm = null; try { lc = window.__fsLineCalc ? window.__fsLineCalc(B.startAt) : null; } catch (e) {} try { f = window.__fsLiveFix && window.__fsLiveFix(); } catch (e) {} try { sm = startMaths(lc, f, rem); } catch (e) {} return { rem: rem, burn: sm && sm.burn != null ? sm.burn : lc && lc.burn != null ? lc.burn : null, d: lc && lc.d != null ? lc.d * 1852 : null, over: !!(lc && lc.over), sog: f && f.sog != null ? f.sog : null }; }, load: load, board: parseBoard, build: build, state: function () { return B; }, set: function (o) { Object.assign(B, o); saveB(); render(); redraw(); }, tap: tapHook };
  if (ROUTE) {   /* F44: Route and Route+ keep only the start kit's face; the gun is Route's class start, both ways */
    var full = window.FSSolent; window.FSSolent = { kit: true, isOn: function () { return false; }, stepState: function () { return { on: false }; }, marks: function () { return null; }, on: function () {}, step: function () {}, start: function () {}, windRef: function () { return null; }, ss: full.ss, state: full.state, startNow: full.startNow };
    B.shown = B.shown || 1; B.type = 'route'; C.on = false;
    var gunSync = function () { var g = null; try { g = window.__fsGunAt ? window.__fsGunAt() : null; } catch (e) {} if (!g) { if (B.startAt && !(SQ.setAt && Date.now() - SQ.setAt < 3000)) { B.startAt = null; saveB(); } return; } if (Math.abs(g - (B.startAt || 0)) > 1 && !(SQ.setAt && Date.now() - SQ.setAt < 3000)) { B.startAt = g; B.ended = null; SQ.hide = 0; saveB(); } };
    gunSync(); setInterval(gunSync, 1000);
    /* F44 (Stuart 18 Nov 15:25): the start line five ways in Route: ping (the GPS window), shore transit (the GPS window), typed latitude and
       longitude from the sailing instructions, bearing and length from one end, or two taps on the chart; and the RYS line preset. */
    var RYS = { boat: [50.766733, -1.300917], brg: 346, m: 2290 };   /* Rolex Fastnet Race 2025 SIs 14.1 to 14.2; RYS SIs give the transit as about 346 T */
    var LP = 0;   /* taps still wanted on the chart: 2 boat then pin, 1 pin */
    var putLine = function (bq, pq, why) { window.__fsSetLine('boat', bq[0], bq[1]); window.__fsSetLine('pin', pq[0], pq[1]); if (window.__fsLineKind) window.__fsLineKind(false); toast('Start line set: ' + why + '. Check it against the sailing instructions for this race.'); redraw(); };
    window.__fsLineSet = function () {
      var c = $('kitLine'); if (!c) { css(); c = document.createElement('div'); c.id = 'kitLine'; c.className = 'solpop sollegs kitline'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-label', 'Set the start line'); document.body.appendChild(c); }
      var l = lineNow(), v = function (q) { return q ? llTxt(q) : ''; };
      c.innerHTML = '<div class="shead"><h2>Start line</h2><button class="close" id="klX" aria-label="Close">×</button></div>' +
        '<p class="note">Ping each end in the GPS window, or set the line here. Boat end is the committee boat (or the shore end of a transit).</p>' +
        '<div class="solcl"><button class="btn" id="klRYS">RYS line, Cowes</button><span class="soln">Flagstaff on 346°T to abeam the Williams Shipping Buoy</span></div>' +
        '<div class="solcl"><label class="solk" for="klB">Boat end</label><input id="klB" placeholder="50 46.004N 001 18.055W" value="' + v(l && l.boat) + '"></div>' +
        '<div class="solcl"><label class="solk" for="klP">Pin end</label><input id="klP" placeholder="lat, long" value="' + v(l && l.pin) + '"></div>' +
        '<div class="solcl"><span class="solk">or</span><input id="klBr" type="number" inputmode="decimal" placeholder="bearing °T" style="width:7em"><input id="klLen" type="number" inputmode="decimal" placeholder="length m" style="width:7em"><span class="soln">from the boat end</span></div>' +
        '<div class="solcl"><button class="btn" id="klSet">Set the line</button><button class="btn" id="klTap">Touch the chart</button></div><p class="solmsg" id="klMsg" hidden></p>' +
        '<h3 style="margin:8px 0 2px;font-size:14px">Your boat at the start</h3>' + timingHtml();
      c.hidden = false;
      var msg = function (m) { var e = $('klMsg'); e.textContent = m; e.hidden = !m; }; bindTiming(c);
      $('klX').onclick = function () { c.hidden = true; LP = 0; };
      $('klRYS').onclick = function () { var q = offset({ lat: RYS.boat[0], lon: RYS.boat[1] }, RYS.brg, RYS.m / 1852); putLine(RYS.boat, [q.lat, q.lon], 'the RYS line'); c.hidden = true; };
      $('klTap').onclick = function () { LP = 2; c.hidden = true; SQ.small = B.startAt; SQ.force = 0; var ssh = $('solStartScr'); if (ssh) ssh.hidden = true; sqRender(); toast('Tap the chart at the boat end, then at the pin end.'); };
      $('klSet').onclick = function () { var bq = llParse($('klB').value), pq = llParse($('klP').value), br = $('klBr').value, ln = +$('klLen').value;
        if (!bq) return msg('Give the boat end, for example 50 46.004N 001 18.055W.');
        if (!pq && br !== '' && ln > 0) { var q = offset({ lat: bq[0], lon: bq[1] }, +br, ln / 1852); pq = [q.lat, q.lon]; }
        if (!pq) return msg('Give the pin end, or a bearing and length from the boat end.');
        var dm = Math.hypot((pq[1] - bq[1]) * Math.cos(bq[0] * R) * 60, (pq[0] - bq[0]) * 60) * 1852; if (dm < 20) return msg('The ends are only ' + Math.round(dm) + ' m apart.');
        putLine(bq, pq, 'typed'); c.hidden = true; };
    };
    window.__fsKitTap = function (la, lo) { if (!LP) return false; if (LP === 2) { window.__fsSetLine('boat', la, lo); LP = 1; toast('Boat end set. Now tap the pin end.'); redraw(); return true; } LP = 0; var l = lineNow() || {}, b0 = (window.__fsLine() || {}).boat; if (b0) { var dm = Math.hypot((lo - b0[1]) * Math.cos(la * R) * 60, (la - b0[0]) * 60) * 1852; if (dm < 20) { LP = 1; toast('Only ' + Math.round(dm) + ' m from the boat end: tap the pin end.'); return true; } } window.__fsSetLine('pin', la, lo); toast('Start line set from the chart. Check it against the sailing instructions.'); redraw(); return true; };
    window.__fsStartScreen = function () { gunSync(); if (!B.startAt) { toast('Choose your class start first: Routes, Start.'); return; } SQ.hide = 0; SQ.small = 0; SQ.force = B.startAt; sqRender(); rbRender(); };
    return;
  }
  if (C.on) load();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hookSettings); else hookSettings();
})();
