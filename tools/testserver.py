"""FirstShift test server (19 Nov 2026, full check: the test set-up kept in the repository, not only in a session's scratch space).
Serves one tool's own app files for each area page, the forecast data from a copy of the live site branch, that tool's own Help media,
and stands in for the boat code server (/api/boat/<code>, as site/functions/api/boat/[code].js), in memory, with the same answers.
Route and Mark:   python3 tools/testserver.py --web site/cervantes --media site --port 8779
Route+ and Mark+: python3 tools/testserver.py --web <navigate>/web --media <navigate>/web --port 8778
--site is a checkout of the live site branch (the forecasts), default /tmp/claude-0/sitebr."""
import http.server, os, posixpath, json, re, time, threading, argparse
a = argparse.ArgumentParser(); a.add_argument('--web', required=True); a.add_argument('--media', required=True); a.add_argument('--port', type=int, required=True); a.add_argument('--site', default='/tmp/claude-0/sitebr')
A = a.parse_args(); WEB = os.path.abspath(A.web); MEDIA = os.path.abspath(A.media); SITE = os.path.abspath(A.site)
AREAS = {'cervantes', 'fastnet', 'channel-area', 'mark', 'northsea-area', 'irishsea-area', 'biscay-area', 'celtic-area'}
KV = {}; LOCK = threading.Lock(); OK = re.compile(r'^[A-HJ-NP-Z2-9]{6}$')
class H(http.server.SimpleHTTPRequestHandler):
    def _json(self, o, st=200):
        b = json.dumps(o).encode(); self.send_response(st); self.send_header('content-type', 'application/json'); self.send_header('content-length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def _api(self):
        m = re.match(r'^/api/boat/([^/?#]+)', self.path)
        if not m: return False
        code = m.group(1).upper()
        if not OK.match(code): self._json({'error': 'A boat code is six letters and numbers.'}, 400); return True
        if self.command == 'GET':
            with LOCK: v = KV.get(code)
            self._json({'code': code, 'at': v['at'], 'data': v['data']} if v else {'error': 'No boat with that code yet.'}, 200 if v else 404); return True
        if self.command == 'PUT':
            n = int(self.headers.get('content-length') or 0); body = self.rfile.read(n).decode()
            try: d = json.loads(body)['data']
            except Exception: self._json({'error': 'Not readable.'}, 400); return True
            at = int(time.time() * 1000)
            with LOCK: KV[code] = {'at': at, 'data': d}
            self._json({'code': code, 'at': at}); return True
        return False
    def do_GET(self):
        if self.path.startswith('/api/boat/') and self._api(): return
        super().do_GET()
    def do_PUT(self):
        if not self._api(): self._json({'error': 'GET or PUT only.'}, 405)
    def translate_path(self, path):
        p = path.split('?', 1)[0].split('#', 1)[0]; parts = p.strip('/').split('/')
        if len(parts) <= 2 and parts[0] in AREAS:
            f = (parts[1] if len(parts) == 2 else '') or 'index.html'
            if os.path.isfile(os.path.join(WEB, f)): return os.path.join(WEB, f)
        if parts[0] in ('helpmedia', 'brand') and os.path.exists(os.path.join(MEDIA, *parts)): return os.path.join(MEDIA, *parts)
        return os.path.join(SITE, posixpath.normpath(p).lstrip('/'))
    def end_headers(self): self.send_header('Cache-Control', 'no-store'); super().end_headers()
    def log_message(self, *x): pass
http.server.ThreadingHTTPServer(('', A.port), H).serve_forever()
