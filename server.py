#!/usr/bin/env python3
"""Serves the Pocket Arcade static site on port 6969."""

import http.server
import json
import os
import random
import re
import socketserver
import sys
import urllib.error
import urllib.parse
import urllib.request

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 6969
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# --- Free API key for the Ask AI page ----------------------------------
# Free, no-credit-card key you create yourself: aistudio.google.com/apikey
# Leave blank and the page shows a friendly "not configured" message
# instead of crashing. The video player needs no key at all - see below.
GEMINI_API_KEY = ""
GEMINI_MODEL = "gemini-3-flash-preview"
HTTP_TIMEOUT = 15
STREAM_CHUNK = 65536

# Old WebKit caps out at TLS 1.0, which every modern HTTPS host (even fully
# keyless, no-auth ones like archive.org) now rejects - confirmed directly
# against archive.org's server, which sends back a protocol_version alert.
# So every internet-facing page here talks to this server over plain HTTP,
# and this server does the real HTTPS call on its behalf. That is true
# regardless of whether the upstream API needs a key.
ARCHIVE_ID_RE = re.compile(r"^[A-Za-z0-9_.-]+$")

WORDLE_PATH = "/games/wordle.html"
WORDLE_PLACEHOLDER = "__WORDLE_WORD__"
WORDLE_WORDS = [
    "ABOUT", "ABOVE", "ABUSE", "ACTOR", "ACUTE", "ADMIT", "ADOPT", "ADULT", "AFTER", "AGAIN",
    "AGENT", "AGREE", "AHEAD", "ALARM", "ALBUM", "ALERT", "ALIEN", "ALIGN", "ALIKE", "ALIVE",
    "ALLOW", "ALONE", "ALONG", "ALTER", "AMONG", "ANGER", "ANGLE", "ANGRY", "ANKLE", "APART",
    "APPLE", "APPLY", "ARENA", "ARGUE", "ARISE", "ARMOR", "ARRAY", "ARROW", "ASIDE", "ASSET",
    "AUDIO", "AUDIT", "AVOID", "AWAKE", "AWARD", "AWARE", "BADLY", "BAKER", "BASIC", "BASIS",
    "BEACH", "BEGAN", "BEGIN", "BEGUN", "BEING", "BELOW", "BENCH", "BIRTH", "BLACK", "BLADE",
    "BLAME", "BLANK", "BLAST", "BLEND", "BLESS", "BLIND", "BLOCK", "BLOOD", "BOARD", "BOAST",
    "BONUS", "BOOST", "BOUND", "BRAIN", "BRAND", "BRASS", "BRAVE", "BREAD", "BREAK", "BREED",
    "BRIEF", "BRING", "BROAD", "BROKE", "BROWN", "BRUSH", "BUILD", "BUILT", "BUYER", "CABIN",
    "CABLE", "CANDY", "CARGO", "CARRY", "CARVE", "CATCH", "CAUSE", "CHAIN", "CHAIR", "CHALK",
    "CHAOS", "CHARM", "CHART", "CHASE", "CHEAP", "CHECK", "CHEEK", "CHEER", "CHESS", "CHEST",
    "CHIEF", "CHILD", "CHILL", "CHOIR", "CHOSE", "CIVIC", "CIVIL", "CLAIM", "CLASS", "CLEAN",
    "CLEAR", "CLERK", "CLICK", "CLIFF", "CLIMB", "CLING", "CLOCK", "CLOSE", "CLOTH", "CLOUD",
    "CLOWN", "COACH", "COAST", "COVER", "CRACK", "CRAFT", "CRANE", "CRASH", "CRAZY", "CREAM",
    "CREEK", "CRIME", "CRISP", "CROSS", "CROWD", "CROWN", "CRUDE", "CRUSH", "CURVE", "CYCLE",
    "DAILY", "DAIRY", "DANCE", "DEATH", "DEBUT", "DELAY", "DEPTH", "DEVIL", "DIRTY", "DOUBT",
    "DOZEN", "DRAFT", "DRAIN", "DRAMA", "DRANK", "DRAWN", "DREAM", "DRESS", "DRIED", "DRIFT",
    "DRILL", "DRINK", "DRIVE", "DROVE", "DRUNK", "DYING", "EAGER", "EAGLE", "EARLY", "EARTH",
    "EIGHT", "ELDER", "ELECT", "ELITE", "EMPTY", "ENEMY", "ENJOY", "ENTER", "ENTRY", "EQUAL",
    "ERROR", "EVENT", "EVERY", "EXACT", "EXIST", "EXTRA", "FAITH", "FALSE", "FAULT", "FAVOR",
    "FENCE", "FEVER", "FIBER", "FIELD", "FIFTH", "FIFTY", "FIGHT", "FINAL", "FIRST", "FIXED",
    "FLAME", "FLASH", "FLEET", "FLESH", "FLOAT", "FLOOD", "FLOOR", "FLOUR", "FLUID", "FOCUS",
    "FORCE", "FORTH", "FORUM", "FOUND", "FRAME", "FRANK", "FRAUD", "FRESH", "FRONT", "FROST",
    "FRUIT", "FUNNY", "GHOST", "GIANT", "GIVEN", "GLASS", "GLOBE", "GLORY", "GRACE", "GRADE",
    "GRAIN", "GRAND", "GRANT", "GRASS", "GRAVE", "GREAT", "GREEN", "GREET", "GRIEF", "GRILL",
    "GRIND", "GROSS", "GROUP", "GROWN", "GUARD", "GUESS", "GUEST", "GUIDE", "HABIT", "HAPPY",
    "HARSH", "HASTE", "HEART", "HEAVY", "HELLO", "HENCE", "HONOR", "HORSE", "HOTEL", "HOUSE",
    "HUMAN", "HUMOR", "HURRY", "IDEAL", "IMAGE", "IMPLY", "INDEX", "INNER", "INPUT", "ISSUE",
    "IVORY", "JOINT", "JUDGE", "JUICE", "JUMBO", "KNIFE", "KNOCK", "KNOWN", "LABEL", "LABOR",
    "LARGE", "LASER", "LATER", "LAUGH", "LAYER", "LEARN", "LEASE", "LEAST", "LEAVE", "LEGAL",
    "LEMON", "LEVEL", "LIGHT", "LIMIT", "LOCAL", "LODGE", "LOGIC", "LOOSE", "LOWER", "LOYAL",
    "LUCKY", "LUNCH", "LYING", "MAGIC", "MAJOR", "MAKER", "MARCH", "MATCH", "MAYOR", "MEANT",
    "MEDAL", "MEDIA", "MERGE", "MERIT", "METAL", "METER", "MIGHT", "MINOR", "MINUS", "MIXED",
    "MODEL", "MONEY", "MONTH", "MORAL", "MOTOR", "MOUNT", "MOUSE", "MOUTH", "MOVIE", "MUSIC",
    "NAKED", "NEEDY", "NERVE", "NEVER", "NEWLY", "NIGHT", "NOBLE", "NOISE", "NORTH", "NOTED",
    "NOVEL", "NURSE", "OCCUR", "OCEAN", "OFFER", "OFTEN", "ORDER", "OTHER", "OUGHT", "OUTER",
    "OWNER", "PAINT", "PANEL", "PANIC", "PAPER", "PARTY", "PATCH", "PAUSE", "PEACE", "PHASE",
    "PHONE", "PHOTO", "PIANO", "PIECE", "PILOT", "PITCH", "PIZZA", "PLACE", "PLAIN", "PLANE",
    "PLANT", "PLATE", "POINT", "POUND", "POWER", "PRESS", "PRICE", "PRIDE", "PRIME", "PRINT",
    "PRIOR", "PRIZE", "PROOF", "PROUD", "PROVE", "QUEEN", "QUERY", "QUICK", "QUIET", "QUITE",
    "QUOTE", "RADIO", "RAISE", "RANGE", "RAPID", "RATIO", "REACH", "REACT", "READY", "REALM",
    "REBEL", "REFER", "RELAX", "REPLY", "RIDGE", "RIGHT", "RIVAL", "RIVER", "ROBOT", "ROUGH",
    "ROUND", "ROUTE", "ROYAL", "RURAL", "SAUCE", "SCALE", "SCARE", "SCENE", "SCOPE", "SCORE",
    "SCOUT", "SENSE", "SERVE", "SEVEN", "SHADE", "SHAKE", "SHALL", "SHAPE", "SHARE", "SHARP",
    "SHEEP", "SHEET", "SHELF", "SHELL", "SHIFT", "SHINE", "SHIRT", "SHOCK", "SHOOT", "SHORT",
    "SHOWN", "SIGHT", "SILLY", "SINCE", "SIXTH", "SIXTY", "SIZED", "SKILL", "SLEEP", "SLICE",
    "SLIDE", "SMALL", "SMART", "SMILE", "SMOKE", "SNAKE", "SOLAR", "SOLID", "SOLVE", "SORRY",
    "SOUND", "SOUTH", "SPACE", "SPARE", "SPARK", "SPEAK", "SPEED", "SPEND", "SPENT", "SPICE",
    "SPINE", "SPLIT", "SPOKE", "SPORT", "STAFF", "STAGE", "STAIR", "STAKE", "STAND", "START",
    "STATE", "STEAM", "STEEL", "STEEP", "STEER", "STICK", "STIFF", "STILL", "STOCK", "STONE",
    "STOOD", "STORE", "STORM", "STORY", "STOVE", "STUDY", "STUFF", "STYLE", "SUGAR", "SUPER",
    "SWEET", "SWIFT", "SWING", "TABLE", "TAKEN", "TASTE", "TEACH", "TERMS", "THANK", "THEME",
    "THERE", "THESE", "THICK", "THING", "THINK", "THIRD", "THOSE", "THREE", "THREW", "THROW",
    "THUMB", "TIGHT", "TIMER", "TITLE", "TODAY", "TOKEN", "TOTAL", "TOUCH", "TOUGH", "TOWER",
    "TRACE", "TRACK", "TRADE", "TRAIL", "TRAIN", "TREAT", "TREND", "TRIAL", "TRIBE", "TRICK",
    "TRIED", "TRUCK", "TRULY", "TRUNK", "TRUST", "TRUTH", "TWICE", "UNCLE", "UNDER", "UNDUE",
    "UNION", "UNITY", "UNTIL", "UPPER", "UPSET", "URBAN", "USAGE", "USUAL", "VALID", "VALUE",
    "VIDEO", "VIRUS", "VISIT", "VITAL", "VOCAL", "VOICE", "WASTE", "WATCH", "WATER", "WEIGH",
    "WEIRD", "WHEAT", "WHEEL", "WHERE", "WHICH", "WHILE", "WHITE", "WHOLE", "WHOSE", "WOMAN",
    "WOMEN", "WORLD", "WORRY", "WORSE", "WORST", "WORTH", "WOULD", "WOUND", "WRIST", "WRITE",
    "WRONG", "YIELD", "YOUNG", "YOUTH",
]


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        if self.path == WORDLE_PATH or self.path.startswith(WORDLE_PATH + "?"):
            self.serve_wordle()
            return
        if self.path.startswith("/api/archive/search"):
            self.archive_search()
            return
        if self.path.startswith("/api/archive/video"):
            self.archive_video()
            return
        super().do_GET()

    def do_POST(self):
        if self.path == "/api/ai/chat":
            self.ai_chat()
            return
        self.send_error(404)

    def serve_wordle(self):
        try:
            with open(os.path.join(DIRECTORY, "games", "wordle.html"), "rb") as f:
                template = f.read().decode("utf-8")
        except OSError:
            self.send_error(404)
            return
        word = random.choice(WORDLE_WORDS)
        body = template.replace(WORDLE_PLACEHOLDER, word).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    # --- shared helpers -------------------------------------------------

    def send_json(self, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def read_json_body(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
        except ValueError:
            length = 0
        raw = self.rfile.read(length) if length else b""
        try:
            return json.loads(raw.decode("utf-8")) if raw else {}
        except ValueError:
            return {}

    def fetch_json(self, url, data=None, headers=None):
        """GET (data=None) or POST (data=dict) a URL, return parsed JSON."""
        req_headers = {"Content-Type": "application/json"}
        if headers:
            req_headers.update(headers)
        body = json.dumps(data).encode("utf-8") if data is not None else None
        req = urllib.request.Request(url, data=body, headers=req_headers, method="POST" if body else "GET")
        with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as resp:
            return json.loads(resp.read().decode("utf-8"))

    # --- Video player (Internet Archive - free, keyless, direct MP4s) ---

    def archive_search(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        query = (params.get("q") or [""])[0].strip()
        if not query:
            self.send_json({"error": "bad_request", "message": "Missing search query."})
            return
        qs = urllib.parse.urlencode([
            ("q", query + " AND mediatype:movies"),
            ("fl[]", "identifier"),
            ("fl[]", "title"),
            ("fl[]", "description"),
            ("rows", "15"),
            ("page", "1"),
            ("output", "json"),
        ])
        try:
            data = self.fetch_json("https://archive.org/advancedsearch.php?" + qs)
        except urllib.error.HTTPError as e:
            self.send_json({"error": "upstream_failed", "message": "Archive.org error (%d)." % e.code})
            return
        except (urllib.error.URLError, ValueError, OSError):
            self.send_json({"error": "upstream_failed", "message": "Could not reach archive.org."})
            return

        docs = ((data.get("response") or {}).get("docs")) or []
        results = []
        for d in docs:
            identifier = d.get("identifier")
            if not identifier:
                continue
            desc = d.get("description", "")
            if isinstance(desc, list):
                desc = " ".join(desc)
            results.append({
                "id": identifier,
                "title": d.get("title") or identifier,
                "desc": (desc or "")[:160],
            })
        self.send_json({"results": results})

    def pick_video_file(self, files):
        candidates = []
        for f in files:
            name = f.get("name", "")
            fmt = (f.get("format") or "").lower()
            if name.lower().endswith(".mp4") or "mpeg4" in fmt or "h.264" in fmt:
                candidates.append(f)
        if not candidates:
            return None
        # Archive.org's classic small/compatible derivative - best odds on old hardware.
        for f in candidates:
            if "512kb" in (f.get("format") or "").lower() or "512kb" in f.get("name", "").lower():
                return f["name"]

        def size_of(f):
            try:
                return int(f.get("size", 0))
            except (TypeError, ValueError):
                return 1 << 62
        candidates.sort(key=size_of)
        return candidates[0]["name"]

    def archive_video(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        identifier = (params.get("id") or [""])[0].strip()
        if not identifier or not ARCHIVE_ID_RE.match(identifier):
            self.send_error(400, "Missing or invalid id")
            return
        try:
            meta = self.fetch_json("https://archive.org/metadata/" + urllib.parse.quote(identifier))
        except (urllib.error.HTTPError, urllib.error.URLError, ValueError, OSError):
            self.send_error(502, "Could not reach archive.org")
            return

        filename = self.pick_video_file(meta.get("files", []))
        if not filename:
            self.send_error(404, "No playable video file found for this item")
            return

        upstream_url = "https://archive.org/download/%s/%s" % (
            urllib.parse.quote(identifier), urllib.parse.quote(filename)
        )
        req_headers = {}
        rng = self.headers.get("Range")
        if rng:
            req_headers["Range"] = rng
        req = urllib.request.Request(upstream_url, headers=req_headers)
        try:
            upstream = urllib.request.urlopen(req, timeout=HTTP_TIMEOUT)
        except urllib.error.HTTPError as e:
            self.send_error(e.code, "Upstream error")
            return
        except (urllib.error.URLError, OSError):
            self.send_error(502, "Could not reach archive.org")
            return

        with upstream:
            status = getattr(upstream, "status", None) or upstream.getcode()
            self.send_response(206 if status == 206 else 200)
            self.send_header("Content-Type", "video/mp4")
            self.send_header("Accept-Ranges", "bytes")
            content_length = upstream.headers.get("Content-Length")
            if content_length:
                self.send_header("Content-Length", content_length)
            content_range = upstream.headers.get("Content-Range")
            if content_range:
                self.send_header("Content-Range", content_range)
            self.end_headers()
            while True:
                chunk = upstream.read(STREAM_CHUNK)
                if not chunk:
                    break
                try:
                    self.wfile.write(chunk)
                except (BrokenPipeError, ConnectionResetError):
                    break

    # --- Ask AI (Gemini free tier) ---------------------------------------

    def ai_chat(self):
        if not GEMINI_API_KEY:
            self.send_json({"error": "not_configured", "message": "No Gemini API key set in server.py yet."})
            return
        payload = self.read_json_body()
        message = str(payload.get("message", "")).strip()
        history = payload.get("history") or []
        if not message:
            self.send_json({"error": "bad_request", "message": "Empty message."})
            return

        contents = []
        for turn in history[-8:]:
            role = turn.get("role")
            text = str(turn.get("text", ""))
            if role in ("user", "model") and text:
                contents.append({"role": role, "parts": [{"text": text}]})
        contents.append({"role": "user", "parts": [{"text": message}]})

        url = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent" % GEMINI_MODEL
        try:
            data = self.fetch_json(url, data={"contents": contents}, headers={"x-goog-api-key": GEMINI_API_KEY})
        except urllib.error.HTTPError as e:
            self.send_json({"error": "upstream_failed", "message": "Gemini API error (%d)." % e.code})
            return
        except (urllib.error.URLError, ValueError, OSError):
            self.send_json({"error": "upstream_failed", "message": "Could not reach Gemini API."})
            return

        try:
            reply = data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, TypeError):
            self.send_json({"error": "upstream_failed", "message": "Gemini gave an empty reply."})
            return
        self.send_json({"reply": reply})


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
