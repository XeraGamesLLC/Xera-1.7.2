#!/usr/bin/env python3
"""Serves the Pocket Arcade static site on port 6969."""

import http.server
import os
import random
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 6969
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

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
        super().do_GET()

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
