#!/usr/bin/env python3
"""Serves the Pocket Arcade static site on port 6969."""

import http.server
import json
import os
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 6969
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
MUSIC_DIR = os.path.join(DIRECTORY, "music")
AUDIO_EXTS = (".mp3", ".ogg", ".m4a", ".wav")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        if self.path == "/api/music":
            self.send_music_list()
            return
        super().do_GET()

    def send_music_list(self):
        files = []
        if os.path.isdir(MUSIC_DIR):
            for name in sorted(os.listdir(MUSIC_DIR)):
                if name.lower().endswith(AUDIO_EXTS):
                    files.append(name)

        body = json.dumps(files).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    with Server(("0.0.0.0", PORT), Handler) as httpd:
        print("Pocket Arcade running at http://0.0.0.0:%d/" % PORT)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            httpd.shutdown()
