# Local demo server: serves this folder and saves rendered files to out/ via POST /save/<name>.
import http.server
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "out")


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".mjs": "text/javascript"}

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        # Always serve the current code while testing.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        m = re.fullmatch(r"/save/([\w.-]+)", self.path)
        if not m:
            self.send_error(404)
            return
        body = self.rfile.read(int(self.headers["Content-Length"]))
        with open(os.path.join(OUT, m.group(1)), "wb") as f:
            f.write(body)
        self.send_response(204)
        self.end_headers()


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    http.server.ThreadingHTTPServer(("127.0.0.1", 8770), Handler).serve_forever()
