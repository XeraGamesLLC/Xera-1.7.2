import twemoji from "twemoji";

/**
 * Twitter's emoji set ("Twemoji") — the same one Discord itself renders
 * emoji with, instead of leaving it to whatever font the OS/browser
 * happens to ship (so emoji look identical for every user regardless of
 * platform). Twitter archived the original repo; jdecked/twemoji is the
 * actively-maintained continuation the wider community moved to, served
 * here via jsDelivr's GitHub CDN.
 */
// twemoji builds the final URL as `base + folder + "/" + codepoint + ext` —
// base stops at /assets/ (not /assets/svg/) since `folder` supplies that
// path segment itself.
const TWEMOJI_BASE = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/";
const TWEMOJI_OPTIONS = { base: TWEMOJI_BASE, folder: "svg", ext: ".svg", className: "emoji" };

/**
 * Walks a DOM node's text and replaces emoji characters in place with
 * <img class="emoji"> tags pointing at the CDN above. Call this in a
 * useEffect against a ref, after the node's text/HTML has already been set
 * — twemoji.parse mutates the live DOM rather than returning a new string.
 */
export function twemojify(node: HTMLElement): void {
  twemoji.parse(node, TWEMOJI_OPTIONS);
}

/** String-in, HTML-string-out variant for contexts that don't have a DOM node to mutate (e.g. building a picker button's innerHTML). */
export function twemojifyText(text: string): string {
  return twemoji.parse(text, TWEMOJI_OPTIONS);
}

const ZERO_WIDTH_JOINER = "‍";
const VARIATION_SELECTOR_16 = /️/g;

/**
 * Direct emoji-character -> CDN image URL, for plain <img> tags (picker
 * buttons, reaction pills) instead of round-tripping through
 * dangerouslySetInnerHTML. Mirrors twemoji's own internal codepoint
 * normalization: the U+FE0F "render as emoji" variation selector is
 * dropped from simple emoji (Twemoji's filenames omit it, e.g. "2764.svg"
 * not "2764-fe0f.svg") but kept for ZWJ sequences (combined emoji like
 * family/profession emoji), where it's sometimes structurally significant.
 */
export function twemojiUrl(emoji: string): string {
  const normalized = emoji.includes(ZERO_WIDTH_JOINER) ? emoji : emoji.replace(VARIATION_SELECTOR_16, "");
  const codepoint = twemoji.convert.toCodePoint(normalized);
  return `${TWEMOJI_BASE}svg/${codepoint}.svg`;
}
