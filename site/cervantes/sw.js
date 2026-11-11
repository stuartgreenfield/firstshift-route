/* FirstShift Route offline mode. Every file the page loads is kept on the device. With a signal, the newest copy is used
   (a quick "has it changed?" check, so unchanged forecasts are not downloaded again); with no signal, or a signal too weak
   to answer within a few seconds, the kept copy is used, so Route opens and routes at sea. */
var CACHE = 'fs-route-v1';
var WAIT_MS = 5000;

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

function keyOf(req) { var u = new URL(req.url); u.search = ''; return u.toString(); }   // ?v= and cache-busting stamps share one copy

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var u = new URL(req.url);
  if (u.origin !== location.origin && !/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) return;
  e.respondWith(caches.open(CACHE).then(function (c) {
    var key = keyOf(req);
    var net = fetch(req).then(function (r) { if (r && (r.ok || r.type === 'opaque')) c.put(key, r.clone()); return r; });
    var slow = new Promise(function (ok) { setTimeout(ok, WAIT_MS); }).then(function () { return c.match(key); });
    return Promise.race([net.catch(function () { return c.match(key); }), slow.then(function (r) { return r || net; })])
      .then(function (r) { return r || net; })
      .catch(function () { return c.match(key).then(function (r) { return r || new Response('Offline and not saved on this device yet.', { status: 503 }); }); });
  }));
});
