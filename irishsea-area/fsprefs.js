/* FirstShift Route: My defaults (Stuart 13 Nov 2026).
   Save my set-up, back to my defaults, named set-ups for different crew or watches, export and import to a file,
   and how long the menus stay up in clear screen. A set-up is every setting kept on this device,
   but never the race, its marks, the recordings or MOB: loading a set-up must
   never lose data. Loading reloads the screen, which then carries on where it left off. */
(function () {
  'use strict';
  var KEY = 'nav-setups', VER = 1;
  /* data, not settings: never saved in a set-up, never overwritten by one */
  var SKIP = ['fs-terms', 'fs-lastpage', 'fs-oldroutes', 'fs-mob', 'fs-moment-seen', 'fs-myraces', 'fs-mymarks', 'fs-race', 'fs-boatcode', 'fs-boatcode-at',
    'fs-wiz', 'fs-wizdone', 'fs-dev', 'nav-resume', 'nav-offline-at', 'fs-resume', 'fs-offline-at', 'nav-log', 'nav-log-cur', 'nav-store', 'nav-store-prac', 'nav-route', 'nav-route-last',
    'nav-start', 'nav-polars', 'nav-plot-mk', 'nav-adj-until', KEY];
  var SKIPPRE = ['fs-sess-', 'fs-last-', 'fs-fleet-', 'fs-future-', 'fs-line-'];
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ld() { try { var v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && v.named) return v; } catch (e) {} return { def: null, named: {} }; }
  function sv(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function setting(k) { return /^(fs|nav)-/.test(k) && SKIP.indexOf(k) < 0 && !SKIPPRE.some(function (p) { return k.indexOf(p) === 0; }); }
  function snap() {
    var d = {};
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (setting(k)) d[k] = localStorage.getItem(k); } } catch (e) {}
    return { at: Date.now(), ver: VER, data: d };
  }
  /* write a set-up: its settings replace the current ones; settings it does not have go back to Route's own defaults */
  function apply(s) {
    if (!s || !s.data) return false;
    try {
      var drop = [];
      for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (setting(k) && !(k in s.data)) drop.push(k); }
      drop.forEach(function (k) { localStorage.removeItem(k); });
      Object.keys(s.data).forEach(function (k) { if (setting(k)) localStorage.setItem(k, s.data[k]); });
      return true;
    } catch (e) { return false; }
  }
  function reload(msg) {
    try { if (window.__navResume) window.__navResume.save(); } catch (e) {}
    try { sessionStorage.setItem('nav-prefs-msg', msg); } catch (e) {}
    location.reload();
  }
  function when(t) { var d = new Date(t); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
  function count(s) { return s && s.data ? Object.keys(s.data).length : 0; }

  /* ---------- the card in Settings ---------- */
  var ask = null;
  function note(t) { var n = $('npNote'); if (n) n.textContent = t || ''; }
  function confirmRow(text, yes, go) {
    var r = $('npAsk'); if (!r) return;
    r.innerHTML = '<p>' + esc(text) + '</p><div class="xrow"><button class="btn primary" id="npYes" type="button">' + esc(yes) + '</button><button class="btn" id="npNo" type="button">Cancel</button></div>';
    r.hidden = false; ask = go;
    $('npYes').onclick = function () { r.hidden = true; var g = ask; ask = null; if (g) g(); };
    $('npNo').onclick = function () { r.hidden = true; ask = null; };
  }
  function render() {
    var st = ld(), sel = $('npList'), names = Object.keys(st.named).sort(function (a, b) { return a.localeCompare(b); });
    $('npDefSt').textContent = st.def ? 'Saved ' + when(st.def.at) + '.' : 'Not saved yet: set Route up the way you like it, then Save.';
    $('npBack').disabled = !st.def;
    sel.innerHTML = names.length ? names.map(function (n) { return '<option value="' + esc(n) + '">' + esc(n) + ' (' + when(st.named[n].at) + ')</option>'; }).join('') : '<option value="">No named set-ups yet</option>';
    sel.disabled = !names.length; $('npLoad').disabled = $('npDel').disabled = !names.length;
    var h = window.__navHide ? window.__navHide() : 1; $('npHide').value = String(h == null ? 1 : h);
  }
  function build() {
    var link = $('s-mine'); if (!link || $('navPrefs')) return !!$('navPrefs');
    var d = document.createElement('details'); d.className = 'navprefs'; d.id = 'navPrefs';
    d.innerHTML = '<summary><b>My defaults</b><small>Save your set-up, named set-ups for each crew, export to a file</small></summary>' +
      '<div class="npbody">' +
      '<h4>My defaults</h4><p class="note" id="npDefSt"></p>' +
      '<div class="xrow"><button class="btn primary" id="npSave" type="button">Save as my defaults</button><button class="btn" id="npBack" type="button">Back to my defaults</button></div>' +
      '<h4>Named set-ups</h4><p class="note">For each crew, watch or boat: for example Night watch, Deliveries, Training.</p>' +
      '<div class="xrow"><select id="npList" aria-label="Named set-ups"></select><button class="btn" id="npLoad" type="button">Load</button><button class="btn" id="npDel" type="button">Delete</button></div>' +
      '<div class="xrow"><input id="npName" type="text" maxlength="40" placeholder="Name, for example Night watch" aria-label="Name for this set-up"><button class="btn" id="npSaveAs" type="button">Save as</button></div>' +
      '<h4>Copy to another device</h4><div class="xrow"><button class="btn" id="npExport" type="button">Export to a file</button><button class="btn" id="npImport" type="button">Import a file</button><input type="file" id="npFile" accept=".json,application/json" hidden></div>' +
      '<h4>Clear screen</h4><label class="nprow">Hide the menus again after <select id="npHide" aria-label="Hide the menus again after"><option value="0">Off: leave them up</option><option value="1">1 minute</option><option value="3">3 minutes</option><option value="5">5 minutes</option></select></label>' +
      '<div class="npask" id="npAsk" hidden></div><p class="note" id="npNote" role="status"></p>' +
      '<p class="note">A set-up holds your settings: boat, sails, display, night mode, Deck and Nav views and clear screen. It never holds the race, its marks or recordings, so loading one cannot lose them.</p>' +
      '</div>';
    link.appendChild(d);
    d.addEventListener('toggle', function () { if (d.open) render(); });
    $('npSave').onclick = function () {
      var st = ld(), go = function () { st.def = snap(); note(sv(st) ? 'Saved as your defaults: ' + count(st.def) + ' settings.' : 'Could not save on this device.'); render(); };
      if (st.def) confirmRow('Replace your defaults saved ' + when(st.def.at) + ' with the set-up you have now?', 'Replace', go); else go();
    };
    $('npBack').onclick = function () {
      var st = ld(); if (!st.def) return;
      confirmRow('Go back to your defaults saved ' + when(st.def.at) + '? The screen reloads; your race and marks stay as they are.', 'Go back', function () { if (apply(st.def)) reload('Back to your defaults.'); else note('Could not load on this device.'); });
    };
    $('npSaveAs').onclick = function () {
      var n = ($('npName').value || '').trim().replace(/\s+/g, ' '); if (!n) { note('Type a name first.'); $('npName').focus(); return; }
      var st = ld(), go = function () { st.named[n] = snap(); note(sv(st) ? 'Saved "' + n + '".' : 'Could not save on this device.'); $('npName').value = ''; render(); $('npList').value = n; };
      if (st.named[n]) confirmRow('Replace the set-up "' + n + '"?', 'Replace', go); else go();
    };
    $('npLoad').onclick = function () {
      var n = $('npList').value, st = ld(); if (!st.named[n]) return;
      confirmRow('Load "' + n + '"? The screen reloads; your race and marks stay as they are.', 'Load', function () { if (apply(st.named[n])) reload('Loaded "' + n + '".'); else note('Could not load on this device.'); });
    };
    $('npDel').onclick = function () {
      var n = $('npList').value, st = ld(); if (!st.named[n]) return;
      confirmRow('Delete the set-up "' + n + '"? This cannot be undone.', 'Delete', function () { delete st.named[n]; sv(st); note('Deleted "' + n + '".'); render(); });
    };
    $('npExport').onclick = function () {
      var st = ld(), out = { app: 'FirstShift Route', kind: 'set-ups', ver: VER, at: new Date().toISOString(), now: snap(), def: st.def, named: st.named };
      var name = 'route-setups-' + new Date().toISOString().slice(0, 10) + '.json', text = JSON.stringify(out, null, 1);
      try {
        var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000); note('Saved ' + name + ': your set-up now, your defaults and ' + Object.keys(st.named).length + ' named set-ups.');
      } catch (e) { note('Could not save the file here.'); }
      window.__navPrefsLast = text;
    };
    $('npImport').onclick = function () { $('npFile').value = ''; $('npFile').click(); };
    $('npFile').onchange = function () {
      var f = this.files && this.files[0]; if (!f) return;
      var r = new FileReader(); r.onload = function () { importText(String(r.result)); }; r.readAsText(f);
    };
    $('npHide').onchange = function () { if (window.__navHide) window.__navHide(+this.value); note(+this.value ? 'Menus hide again after ' + this.value + ' minute' + (+this.value > 1 ? 's' : '') + ' without a tap.' : 'Menus stay up until you clear the screen.'); };
    render();
    return true;
  }
  function importText(text) {
    var o; try { o = JSON.parse(text); } catch (e) { note('That file is not a set-up file.'); return; }
    if (!o || o.kind !== 'set-ups' || !o.named) { note('That file is not a set-up file.'); return; }
    var st = ld(), n = 0;
    Object.keys(o.named).forEach(function (k) { if (o.named[k] && o.named[k].data) { st.named[st.named[k] ? k + ' (imported)' : k] = o.named[k]; n++; } });
    if (o.now && o.now.data) { st.named['Imported ' + (o.at || '').slice(0, 10)] = o.now; n++; }
    var hasDef = !!(o.def && o.def.data);
    sv(st); render();
    if (hasDef) confirmRow('Added ' + n + ' set-ups from the file. Also use the file\'s defaults as yours, and load them now?', 'Use them', function () { st.def = o.def; sv(st); if (apply(o.def)) reload('Loaded the defaults from the file.'); });
    else note('Added ' + n + ' set-ups from the file. Pick one and Load.');
  }
  var tries = 0, t = setInterval(function () { if (build() || ++tries > 60) clearInterval(t); }, 500);
  try { var m = sessionStorage.getItem('nav-prefs-msg'); if (m) { sessionStorage.removeItem('nav-prefs-msg'); setTimeout(function () { if (window.NavToast) window.NavToast(m); else { var x = document.createElement('div'); x.className = 'navtoast'; x.setAttribute('role', 'status'); x.textContent = m; document.body.appendChild(x); setTimeout(function () { x.remove(); }, 6000); } }, 2500); } } catch (e) {}
  /* for the automatic tests */
  window.__navPrefs = { snap: snap, apply: apply, load: ld, save: sv, importText: importText, setting: setting, render: function () { if ($('navPrefs')) render(); } };
})();
