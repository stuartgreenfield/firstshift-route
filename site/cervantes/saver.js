/* F31 (Stuart 17 Nov 2026 23:43): "heart Brest should be in settings as a battery save mode or an older processor mode if this can
   be done so the option is available under the relevant setting section". Settings, Display, Screen: Battery saver. When on:
   the moving lines round the logo stand still, the chart is redrawn at most twice a second while nobody is touching it (app.js),
   and the window dots are checked half as often (fsdrag.js). The start countdown, the coach and the alarms are not changed.
   The full heartbeat (one timer in place of about 40) is the next step, SWOT in REPLIES 17 Nov 23:40. */
(function () {
  'use strict';
  var KEY = 'fs-saver';
  function on() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function apply() { var v = on(); window.__fsSaver = v; document.documentElement.classList.toggle('fssaver', v); var cb = document.getElementById('fsSaver'); if (cb) cb.checked = v; }
  var st = document.createElement('style');
  st.textContent = '.fssaver .mkdisc::before,.fssaver #fsBadge>.mkdisc::before,.fssaver .logobox.navring.live::after{animation:none!important}';
  (document.head || document.documentElement).appendChild(st); apply();
  function mount() {
    if (document.getElementById('fsSaver')) return true; var seg = document.getElementById('modeSeg'); if (!seg) return false;
    var anchor = seg.nextElementSibling && seg.nextElementSibling.matches('p.note') ? seg.nextElementSibling : seg;
    var w = document.createElement('div'); w.className = 'row'; w.innerHTML = '<label for="fsSaver" style="flex:1"><input type="checkbox" id="fsSaver"> Battery saver: for older tablets and long races</label>';
    var n = document.createElement('p'); n.className = 'note'; n.textContent = 'Stills the moving lines round the logo and redraws the chart at most twice a second while you are not touching it. The start countdown, the coach and the alarms are not changed.';
    anchor.insertAdjacentElement('afterend', w); w.insertAdjacentElement('afterend', n);
    document.getElementById('fsSaver').addEventListener('change', function () { try { localStorage.setItem(KEY, this.checked ? '1' : '0'); } catch (e) {} apply(); });
    apply(); return true;
  }
  var k = 0, t = setInterval(function () { if (mount() || ++k > 60) clearInterval(t); }, 500);
  window.FSSaver = { on: on, set: function (v) { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {} apply(); } };
})();
