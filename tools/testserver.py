"""FirstShift test server (19 Nov 2026, full check: the test set-up kept in the repository, not only in a session's scratch space).
Serves one tool's own app files for each area page, the forecast data from a copy of the live site branch, that tool's own Help media,
and stands in for the boat code server (/api/boat/<code>, as site/functions/api/boat/[code].js), in memory, with the same answers.
Route and Mark:   python3 tools/testserver.py --web site/cervantes --media site --port 8779
Route+ and Mark+: python3 tools/testserver.py --web <navigate>/web --media <navigate>/web --port 8778
--site is a checkout of the live site branch (the forecasts), default /tmp/claude-0/sitebr."""
import http.server, os, posixpath, json, re, time, threading, argparse
a = argparse.ArgumentParser(); a.add_argument('--web', required=True); a.add_argument('--media', required=True); a.add_argument('--port', type=int, required=True); a.add_argument('--site', default='/tmp/claude-0/sitebr')
A = a.parse_args(); WEB = os.path.abspath(A.web); MEDIA = os.path.abspath(A.media); SITE = os.path.abspath(A.site)
AREAS = {'cervantes', 'fastnet', 'channel-area', 'mark', 'northsea-area', 'irishsea-area', 'biscay-area', 'celtic-area', 'tasman-area'}
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
    def _track(self):
        # stands in for site/functions/api/track/[code].js (friends and family), in memory, with the same answers (20 Nov)
        m = re.match(r'^/api/track/([^/?#]+)', self.path)
        if not m: return False
        code = m.group(1).upper()
        if not OK.match(code): self._json({'error': 'A boat code is six letters and numbers.'}, 400); return True
        k = 'track:' + code
        with LOCK: cur = KV.get(k) or {'track': []}
        def follow():
            with LOCK:
                f = KV.get('followof:' + code)
                if not f:
                    import secrets; f = ''.join(secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZ23456789') for _ in range(8)); KV['followof:' + code] = f; KV['follow:' + f] = code
            return f
        if self.command == 'GET':
            self._json({'code': code, 'follow': follow(), 'name': cur.get('name', ''), 'at': cur['at'], 'track': cur.get('track', []), 'route': cur.get('route')} if cur.get('at') else {'error': 'Nothing shared under that code yet.'}, 200 if cur.get('at') else 404); return True
        n = int(self.headers.get('content-length') or 0); body = self.rfile.read(n).decode()
        if len(body) > 120 * 1024: self._json({'error': 'Too much in one go.'}, 413); return True
        try: d = json.loads(body)
        except Exception: self._json({'error': 'Not readable.'}, 400); return True
        now = int(time.time() * 1000); ok = lambda x, lo, hi: isinstance(x, (int, float)) and not isinstance(x, bool) and lo <= x <= hi
        tr = cur.get('track', [])
        def add(q):
            if not isinstance(q, list): return False
            t, la, lo, sog = (list(q) + [None] * 4)[:4]
            if not (ok(t, now / 1000 - 7 * 86400, now / 1000 + 600) and ok(la, -90, 90) and ok(lo, -180, 180)): return False
            if not tr or t - tr[-1][0] >= 60: tr.append([round(t), round(la, 5), round(lo, 5), round(sog, 1) if ok(sog, 0, 60) else None])
            return True
        if d.get('pos') and not add(d['pos']): self._json({'error': 'Not a position.'}, 400); return True
        if isinstance(d.get('pts'), list):
            for q in sorted([q for q in d['pts'][:2000] if isinstance(q, list) and q], key=lambda q: q[0] if isinstance(q[0], (int, float)) else 0): add(q)
        cur['track'] = tr[-3000:]
        if isinstance(d.get('route'), dict) and isinstance(d['route'].get('path'), list):
            path = [[round(q[0], 4), round(q[1], 4)] for q in d['route']['path'] if isinstance(q, list) and len(q) > 1 and ok(q[0], -90, 90) and ok(q[1], -180, 180)][:1500]
            cur['route'] = {'at': now, 'name': str(d['route'].get('name') or '')[:80], 'path': path, 'finish': d['route'].get('finish') if ok(d['route'].get('finish'), 0, 9e9) else None}
        if isinstance(d.get('name'), str): cur['name'] = d['name'][:60]
        cur['at'] = now
        with LOCK: KV[k] = cur
        self._json({'code': code, 'follow': follow(), 'at': now, 'points': len(cur.get('track', []))}); return True
    def _follow(self):
        # stands in for site/functions/api/follow/[code].js: the family's view-only follow code (20 Nov)
        m = re.match(r'^/api/follow/([^/?#]+)', self.path)
        if not m: return False
        if self.command != 'GET': self._json({'error': 'GET only.'}, 405); return True
        f = m.group(1).upper()
        if not re.match(r'^[A-HJ-NP-Z2-9]{8}$', f): self._json({'error': 'A follow code is eight letters and numbers.'}, 400); return True
        with LOCK: code = KV.get('follow:' + f); cur = KV.get('track:' + code) if code else None
        if not code: self._json({'error': 'No boat with that follow code.'}, 404); return True
        if not cur or not cur.get('at'): self._json({'error': 'Nothing shared yet.'}, 404); return True
        self._json({'name': cur.get('name', ''), 'at': cur['at'], 'track': cur.get('track', []), 'route': cur.get('route')}); return True
    def do_POST(self):
        if self.path.startswith('/api/track/') and self._track(): return
        if self.path.startswith('/api/follow/') and self._follow(): return
        self._json({'error': 'GET or POST only.'}, 405)
    def do_GET(self):
        if self.path.startswith('/api/boat/') and self._api(): return
        if self.path.startswith('/api/track/') and self._track(): return
        if self.path.startswith('/api/follow/') and self._follow(): return
        super().do_GET()
    def do_PUT(self):
        if not self._api(): self._json({'error': 'GET or PUT only.'}, 405)
    def translate_path(self, path):
        p = path.split('?', 1)[0].split('#', 1)[0]; parts = p.strip('/').split('/')
        if len(parts) <= 2 and parts[0] in AREAS:
            f = (parts[1] if len(parts) == 2 else '') or 'index.html'
            if os.path.isfile(os.path.join(WEB, f)): return os.path.join(WEB, f)
        if len(parts) > 2 and parts[0] in AREAS and parts[1] in ('helpmedia', 'brand'): parts = parts[1:]   # Route+ asks for helpmedia/ beside its page (the app's own folder layout)
        if parts[0] in ('helpmedia', 'brand') and os.path.exists(os.path.join(MEDIA, *parts)): return os.path.join(MEDIA, *parts)
        return os.path.join(SITE, posixpath.normpath(p).lstrip('/'))
    def end_headers(self): self.send_header('Cache-Control', 'no-store'); super().end_headers()
    def log_message(self, *x): pass
http.server.ThreadingHTTPServer(('', A.port), H).serve_forever()
