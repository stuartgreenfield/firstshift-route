/* M68 and F30: the spoken start coach (Stuart 17 Nov 2026 17:21, "a voice system that says how long to start burn time go faster go
   slower"; 18:34, "You can set this with a slider", "Metres"). Research and proposal: docs/START-COACH-M68.md.
   Emma speaks only what the helm and the bow need without looking. The slider (on the start screen, the speaker button) sets how much:
     0 Off · 1 Countdown · 2 + time to burn · 3 + the line in metres · 4 + speed up or ease off.
   One voice at a time and the countdown first. Clips are recorded phrases (helpmedia/startcoach/, start.json), so they work offline
   and Stuart's own voice can replace Emma's by recording the same list (tools/coach_voice.py with the list in docs/START-COACH-M68.md). */
(function () {
  if (!window.FS_MARK && window.FS_SOLENT) return;   /* F44: Mark, Route and Route+ (in Route off until chosen, Stuart 18 Nov 15:25) */
  var KEY = window.FS_SOLENT ? 'fs-coach-level' : 'fs-coach-level-route', MEDIA = (window.FS_HELPMEDIA || '../helpmedia/') + 'startcoach/', MAN = null, A = null, busyTo = 0;
  var NAMES = ['Off', 'Countdown', 'Countdown and time to burn', 'Countdown, time to burn and the line', 'Everything: countdown, burn, line and speed'];
  var SHORT = ['Off', 'Count', 'Burn', 'Line', 'All'];
  function lvl() { try { var v = localStorage.getItem(KEY); return v == null ? (window.FS_SOLENT ? 2 : 0) : Math.max(0, Math.min(4, +v)); } catch (e) { return window.FS_SOLENT ? 2 : 0; } }   /* Route: off by default (Stuart 18 Nov 15:25) */
  function setLvl(v) { try { localStorage.setItem(KEY, String(v)); } catch (e) {} if (v === 0) stop(); paint(); }
  function load() { if (MAN) return; MAN = {}; fetch(MEDIA + 'start.json').then(function (r) { return r.json(); }).then(function (j) { MAN = j; }).catch(function () {}); }
  function stop() { if (A) { try { A.pause(); } catch (e) {} A = null; } busyTo = 0; }
  /* say(key, first): first = the countdown, which stops anything else; anything else waits its turn or is dropped */
  function say(k, first) {
    if (!MAN || !MAN[k]) return false; var now = Date.now();
    if (!first && now < busyTo) return false;
    stop(); A = new Audio(MEDIA + MAN[k]); busyTo = now + 2500;
    A.addEventListener('ended', function () { busyTo = 0; }); A.play().catch(function () { busyTo = 0; }); window.__fsCoachLast = k; return true; }
  var C = { at: null, said: {}, band: null, bandAt: 0, cand: null, candAt: 0, hist: [], overAt: 0, spdAt: 0, t0: 0 };
  function reset(at) { C.at = at; C.said = {}; C.band = null; C.bandAt = 0; C.cand = null; C.candAt = 0; C.hist = []; C.overAt = 0; C.spdAt = 0; C.t0 = Date.now(); }
  function countKey(r) {
    if (r % 60 === 0 && r >= 60 && r <= 300) return 'm' + r / 60;
    if (r === 50 || r === 40 || r === 30 || r === 20) return 's' + r;
    if (r >= 1 && r <= 10) return 'n' + r;
    if (r === 0) return 'gun';
    return null; }
  function burnKey(b) { if (b < -3) return 'late'; if (b <= 3) return 'ontime'; var s = [5, 10, 15, 20, 25, 30, 40, 50, 60]; for (var i = 0; i < s.length; i++) if (b < s[i] + (s[i] < 30 ? 2.5 : 5)) return 'e' + s[i]; return 'e60'; }
  function lineKey(d) { var s = [10, 20, 30, 40, 50, 75, 100]; for (var i = 0; i < s.length; i++) if (d <= s[i]) return 'd' + s[i]; return null; }
  function tick() {
    var L = lvl(), S = window.FSSolent, st = S && S.state && S.state(); if (!L || !st || !st.startAt || st.pp) { if (st && C.at !== st.startAt) reset(st.startAt); return; }
    if (C.at !== st.startAt) reset(st.startAt); load();
    var r = Math.round(st.startAt - Date.now() / 1000); if (r < -3 || r > 305) return;
    var ck = countKey(r); if (ck && !C.said[r]) { C.said[r] = 1; say(ck, true); return; }
    if (L < 2 || r <= 10) return;   /* the last ten seconds are the count only */
    if (Date.now() - C.t0 < 4000) return;   /* let the numbers settle after the gun time is set */
    if (r <= 62 && [60, 50, 40, 30, 20].some(function (m) { return r - m >= 0 && r - m < 2; })) return;   /* keep clear of the next call of the count */
    var n = S.startNow ? S.startNow() : null; if (!n) return; var t = Date.now();
    if (L >= 3 && n.over && r <= 60 && t - C.overAt > 8000) { if (say('over')) C.overAt = t; return; }
    if (n.burn != null && r <= 120 && r > 3) {
      C.hist.push([t, n.burn]); C.hist = C.hist.filter(function (q) { return t - q[0] < 8000; });
      var k = burnKey(n.burn); if (k !== C.cand) { C.cand = k; C.candAt = t; }   /* a new band must hold for 1.5 s, so a reading on the edge does not flick between two calls */
      if ((k !== C.band && t - C.candAt >= 1500 && t - C.bandAt > 5000) || t - C.bandAt > 20000) { if (say(k)) { C.band = k; C.bandAt = t; } return; }
      if (L >= 4 && C.hist.length > 4 && t - C.spdAt > 12000) { var dB = n.burn - C.hist[0][1];   /* burn falling while late: speed up; rising while early: ease off */
        if (n.burn < -3 && dB < -2) { if (say('up')) C.spdAt = t; return; }
        if (n.burn > 8 && dB > 2) { if (say('ease')) C.spdAt = t; return; } }
    }
    if (L >= 3 && n.d != null && !n.over && r <= 45) { var lk = lineKey(n.d); if (lk && !C.said[lk]) { if (say(lk)) { C.said[lk] = 1; var s = [10, 20, 30, 40, 50, 75, 100]; s.forEach(function (x) { if (x > +lk.slice(1)) C.said['d' + x] = 1; }); } } }
  }
  setInterval(tick, 250);
  /* the speaker button on the start screen, and its slider */
  var ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M16 9.5a3.5 3.5 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10"/></svg>';
  var ICOFF = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4z"/><path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M16 9l5 6M21 9l-5 6"/></svg>';
  function css() { if (document.getElementById('sccss')) return; var s = document.createElement('style'); s.id = 'sccss';
    s.textContent = '.sscoach{display:inline-flex;align-items:center;gap:4px}.sccard{position:absolute;right:8px;top:48px;z-index:30;background:var(--panel,#0f1b2d);color:var(--fg,#e2e8f0);border:1px solid rgba(148,163,184,.35);border-radius:10px;padding:10px 12px;width:min(320px,calc(100vw - 32px));box-shadow:0 8px 24px rgba(0,0,0,.35)}.sccard b{display:block;margin-bottom:6px}.sccard input{width:100%}.sccard .scl{display:flex;justify-content:space-between;font-size:11px;opacity:.8}.sccard p{margin:6px 0 0;font-size:13px}.sccard .xrow{display:flex;gap:8px;margin-top:8px}';
    document.head.appendChild(s); }
  function paint() { var b = document.querySelector('#solStartScr .sscoach'); if (!b) return; var L = lvl(); b.innerHTML = (L ? ICON : ICOFF) + '<span>' + SHORT[L] + '</span>'; b.setAttribute('aria-pressed', L ? 'true' : 'false'); b.title = 'Start coach: ' + NAMES[L];
    var c = document.querySelector('#solStartScr .sccard'); if (c) { c.querySelector('input').value = L; c.querySelector('p').textContent = NAMES[L]; } }
  function card() { var e = document.getElementById('solStartScr'), c = e && e.querySelector('.sccard'); if (!e) return; if (c) { c.remove(); return; }
    c = document.createElement('div'); c.className = 'sccard'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-label', 'Start coach');
    c.innerHTML = '<b>Start coach: how much Emma says</b><input type="range" min="0" max="4" step="1" aria-label="How much the coach says"><div class="scl"><span>Off</span><span>Count</span><span>Burn</span><span>Line</span><span>All</span></div><p></p><div class="xrow"><button class="btn" type="button" data-sc="try">Hear a sample</button><button class="btn" type="button" data-sc="x">Done</button></div>';
    e.appendChild(c); c.addEventListener('click', function (ev) { ev.stopPropagation(); var t = ev.target.closest('[data-sc]'); if (!t) return; if (t.dataset.sc === 'x') c.remove(); else { load(); setTimeout(function () { say('e10', true); }, MAN && MAN.e10 ? 0 : 600); } });
    c.querySelector('input').addEventListener('input', function (ev) { setLvl(+ev.target.value); }); paint(); }
  setInterval(function () { var e = document.getElementById('solStartScr'), hd = e && e.querySelector('.sshd'); if (!hd || hd.querySelector('.sscoach')) return; css();
    var b = document.createElement('button'); b.className = 'btn sscoach'; b.type = 'button'; b.addEventListener('click', function (ev) { ev.stopPropagation(); card(); });
    var ch = hd.querySelector('[data-q=small]'); hd.insertBefore(b, ch || null); paint(); }, 500);
  window.FSStartCoach = { level: lvl, set: setLvl, say: say, keys: function () { return MAN; } };
})();
