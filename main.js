"use strict";

const obsidian = require("obsidian");
const {
  Plugin,
  ItemView,
  PluginSettingTab,
  Setting,
  TFile,
  Notice,
  Platform,
  Keymap,
  MarkdownView,
  FuzzySuggestModal,
  AbstractInputSuggest,
  TFolder,
  normalizePath,
  requestUrl,
  moment,
} = obsidian;

const VIEW_TYPE = "genkan-view";
const RING_MAIN_NOTE = "Pebble Index.md"; // the ring app's "one main note" target

// Icons for the dashboard (fixed SVG source, parsed once at runtime).
const ICONS = {
  clear: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  moon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`,
  sun: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  settings: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
  refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>`,
  check: `<svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 3.5 6.5 9 1"/></svg>`,
  trash: `<svg width="12" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
  monitor: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
};

// Built-in daily quotes, used when the ZenQuotes request is off or fails.
const QUOTES = [
  {
    q: "The only way to do great work is to love what you do.",
    a: "Steve Jobs",
  },
  {
    q: "In the middle of every difficulty lies opportunity.",
    a: "Albert Einstein",
  },
  {
    q: "It does not matter how slowly you go as long as you do not stop.",
    a: "Confucius",
  },
  {
    q: "Life is what happens when you’re busy making other plans.",
    a: "John Lennon",
  },
  {
    q: "The future belongs to those who believe in the beauty of their dreams.",
    a: "Eleanor Roosevelt",
  },
  {
    q: "The best time to plant a tree was 20 years ago. The second best time is now.",
    a: "Chinese Proverb",
  },
  { q: "An unexamined life is not worth living.", a: "Socrates" },
  {
    q: "Spread love everywhere you go. Let no one ever come to you without leaving happier.",
    a: "Mother Teresa",
  },
  {
    q: "When you reach the end of your rope, tie a knot in it and hang on.",
    a: "Franklin D. Roosevelt",
  },
  {
    q: "Don’t judge each day by the harvest you reap but by the seeds that you plant.",
    a: "Robert Louis Stevenson",
  },
  {
    q: "The only impossible journey is the one you never begin.",
    a: "Tony Robbins",
  },
  {
    q: "It is during our darkest moments that we must focus to see the light.",
    a: "Aristotle",
  },
  {
    q: "Do not go where the path may lead; go instead where there is no path and leave a trail.",
    a: "Ralph Waldo Emerson",
  },
  {
    q: "The greatest glory in living lies not in never falling, but in rising every time we fall.",
    a: "Nelson Mandela",
  },
  {
    q: "In the end, it’s not the years in your life that count. It’s the life in your years.",
    a: "Abraham Lincoln",
  },
  {
    q: "Life is either a daring adventure or nothing at all.",
    a: "Helen Keller",
  },
  {
    q: "Your time is limited, so don’t waste it living someone else’s life.",
    a: "Steve Jobs",
  },
  {
    q: "The happiness of your life depends upon the quality of your thoughts.",
    a: "Marcus Aurelius",
  },
  {
    q: "Nothing is impossible — the word itself says ‘I’m possible’.",
    a: "Audrey Hepburn",
  },
  {
    q: "Keep your face always toward the sunshine, and shadows will fall behind you.",
    a: "Walt Whitman",
  },
  {
    q: "Whether you think you can or think you can’t, you’re right.",
    a: "Henry Ford",
  },
  {
    q: "The only person you are destined to become is the person you decide to be.",
    a: "Ralph Waldo Emerson",
  },
  {
    q: "Go confidently in the direction of your dreams. Live the life you have imagined.",
    a: "Henry David Thoreau",
  },
  { q: "Believe you can and you’re halfway there.", a: "Theodore Roosevelt" },
  {
    q: "Everything you’ve ever wanted is on the other side of fear.",
    a: "George Addair",
  },
  {
    q: "I am not a product of my circumstances. I am a product of my decisions.",
    a: "Stephen Covey",
  },
  {
    q: "Live in the sunshine, swim the sea, drink the wild air.",
    a: "Ralph Waldo Emerson",
  },
  {
    q: "Not how long, but how well you have lived is the main thing.",
    a: "Seneca",
  },
  {
    q: "It is never too late to be what you might have been.",
    a: "George Eliot",
  },
  {
    q: "We generate fears while we sit. We overcome them by action.",
    a: "Dr. Henry Link",
  },
  { q: "Turn your wounds into wisdom.", a: "Oprah Winfrey" },
  {
    q: "I would rather die of passion than of boredom.",
    a: "Vincent van Gogh",
  },
  { q: "You become what you believe.", a: "Oprah Winfrey" },
  { q: "Dream big and dare to fail.", a: "Norman Vaughan" },
  {
    q: "Knowing is not enough; we must apply. Willing is not enough; we must do.",
    a: "Goethe",
  },
  {
    q: "Security is mostly a superstition. Life is either a daring adventure or nothing.",
    a: "Helen Keller",
  },
  {
    q: "The whole secret of a successful life is to find out what is one’s destiny to do, and then do it.",
    a: "Henry Ford",
  },
  {
    q: "You will face many defeats in life, but never let yourself be defeated.",
    a: "Maya Angelou",
  },
  {
    q: "We know what we are, but know not what we may be.",
    a: "William Shakespeare",
  },
  {
    q: "What you do speaks so loudly that I cannot hear what you say.",
    a: "Ralph Waldo Emerson",
  },
  {
    q: "You have to be where you are to get where you need to go.",
    a: "Amy Poehler",
  },
  {
    q: "If you want to live a happy life, tie it to a goal, not to people or things.",
    a: "Albert Einstein",
  },
  { q: "Simplicity is the ultimate sophistication.", a: "Leonardo da Vinci" },
  { q: "The mind is everything. What you think you become.", a: "Buddha" },
  {
    q: "Strive not to be a success, but rather to be of value.",
    a: "Albert Einstein",
  },
  {
    q: "Two roads diverged in a wood, and I — I took the one less traveled by.",
    a: "Robert Frost",
  },
  {
    q: "I have not failed. I’ve just found 10,000 ways that won’t work.",
    a: "Thomas Edison",
  },
  {
    q: "A person who never made a mistake never tried anything new.",
    a: "Albert Einstein",
  },
  { q: "The secret of getting ahead is getting started.", a: "Mark Twain" },
  { q: "It always seems impossible until it is done.", a: "Nelson Mandela" },
  {
    q: "Act as if what you do makes a difference. It does.",
    a: "William James",
  },
  {
    q: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    a: "Winston Churchill",
  },
  {
    q: "Happiness is not something ready-made. It comes from your own actions.",
    a: "Dalai Lama",
  },
  { q: "If you’re going through hell, keep going.", a: "Winston Churchill" },
  {
    q: "We must accept finite disappointment, but never lose infinite hope.",
    a: "Martin Luther King Jr.",
  },
  {
    q: "Do what you can, with what you have, where you are.",
    a: "Theodore Roosevelt",
  },
  {
    q: "Start where you are. Use what you have. Do what you can.",
    a: "Arthur Ashe",
  },
  { q: "When one door of happiness closes, another opens.", a: "Helen Keller" },
  {
    q: "The only way out of the labyrinth of suffering is to forgive.",
    a: "John Green",
  },
  {
    q: "Give every day the chance to become the most beautiful day of your life.",
    a: "Mark Twain",
  },
  {
    q: "If you tell the truth, you don’t have to remember anything.",
    a: "Mark Twain",
  },
  {
    q: "A friend is someone who knows all about you and still loves you.",
    a: "Elbert Hubbard",
  },
  {
    q: "To the world you may be one person, but to one person you may be the world.",
    a: "Dr. Seuss",
  },
  {
    q: "In three words I can sum up everything I’ve learned about life: it goes on.",
    a: "Robert Frost",
  },
  {
    q: "If you want to go fast, go alone. If you want to go far, go together.",
    a: "African Proverb",
  },
  {
    q: "Darkness cannot drive out darkness; only light can do that.",
    a: "Martin Luther King Jr.",
  },
  {
    q: "Learn as if you will live forever, live like you will die tomorrow.",
    a: "Mahatma Gandhi",
  },
  { q: "Be the change you wish to see in the world.", a: "Mahatma Gandhi" },
  {
    q: "Spread love everywhere you go; let no one ever come to you without leaving happier.",
    a: "Mother Teresa",
  },
  { q: "You miss 100% of the shots you don’t take.", a: "Wayne Gretzky" },
  { q: "Every moment is a fresh beginning.", a: "T.S. Eliot" },
  { q: "Never regret anything that made you smile.", a: "Mark Twain" },
  { q: "Die with memories, not dreams.", a: "Unknown" },
  { q: "Aspire to inspire before we expire.", a: "Unknown" },
  { q: "Be yourself; everyone else is already taken.", a: "Oscar Wilde" },
  {
    q: "You only live once, but if you do it right, once is enough.",
    a: "Mae West",
  },
  {
    q: "In the beginning was the Word, and the Word was with God, and the Word was God.",
    a: "John 1:1",
  },
  {
    q: "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.",
    a: "Ralph Waldo Emerson",
  },
];

const DEFAULT_QUICK_LINKS = [
  { icon: "📝", label: "New Note", action: "command:file-explorer:new-file" },
  { icon: "📅", label: "Today's Note", action: "daily" },
  { icon: "🔍", label: "Search Vault", action: "command:global-search:open" },
  { icon: "🕸️", label: "Graph View", action: "command:graph:open" },
  { icon: "🎲", label: "Random Note", action: "random" },
];

const DEFAULT_SETTINGS = {
  userName: "",
  clipsFolder: "Clippings",
  dailyNotesFolder: "", // blank = use the Daily Notes / Periodic Notes setting
  dataFolder: "genkan/data", // where Tasks.md and Quick Note.md live
  maxClips: 12,
  maxRecent: 8,
  theme: "system", // system | dark | light
  clockFormat: "12h",
  clockFont: "default", // see CLOCK_FONTS
  clockFontCustom: "", // font name(s) typed in settings when clockFont is "custom"
  showHero: true,
  showQuote: true, // daily quote from ZenQuotes (one request a day)
  showFavicons: true, // site icons on web clips (Google's favicon service)
  showRingNotes: false, // Pebble Index ring notes card (off unless enabled)
  // Where the ring saves notes: "main" = Pebble Index.md, "chosen" = a note you pick,
  // "files" = a separate file per note in a folder
  ringMode: "main",
  ringNotesFile: "Pebble Index.md", // used in "chosen" mode
  ringNotesFolder: "Pebble Index", // used in "files" mode (the Pebble app's default folder)
  maxRingNotes: 5,
  unsplashKey: "",
  openOnStartup: false,
  quickLinks: DEFAULT_QUICK_LINKS,
};

const HERO_TOPICS = "nature,landscape,mountains,forest,ocean,wilderness";

// ─── Utilities ────────────────────────────────────────────────────────────────

function newId() {
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function joinPath(folder, name) {
  const f = (folder || "").replace(/^\/+|\/+$/g, "");
  return normalizePath(f ? `${f}/${name}` : name);
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function fmtDate(d, opts) {
  return d.toLocaleDateString(
    "en-US",
    opts ?? { month: "short", day: "numeric", year: "numeric" },
  );
}

function dateFromFilename(title) {
  const m = title.match(/(\d{4}-\d{2}-\d{2})/);
  if (!m) return null;
  const d = new Date(`${m[1]}T00:00:00`);
  return isNaN(d.getTime()) ? null : fmtDate(d);
}

// Frontmatter values may be strings, arrays or Dates — reduce to one string
function fmString(v) {
  if (Array.isArray(v)) v = v[0];
  if (v == null) return "";
  return String(v);
}

// ─── DOM helpers ──────────────────────────────────────────────────────────────
// Everything on the dashboard is built with DOM calls, never HTML strings, so note
// titles, task text and other vault content can't be interpreted as markup.

// h("div", { cls: "card", id: "x" }, child, "text", ...) -> element
function h(tag, props = {}, ...children) {
  const { cls, text, ...attr } = props;
  const classes = typeof cls === "string" ? cls.split(/\s+/).filter(Boolean) : cls;
  const el = createEl(tag, { cls: classes, text, attr });
  for (const c of children.flat()) if (c != null && c !== false) el.append(c);
  return el;
}

const SEARCH_ICON =
  '<svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';

// Icons are fixed SVG source defined in this file; parse once, clone per use
const iconCache = {};
function iconNode(name) {
  if (!iconCache[name]) {
    const src = name === "search" ? SEARCH_ICON : ICONS[name];
    // Parsed as HTML so <svg> gets its SVG namespace without needing an xmlns attribute
    iconCache[name] = new DOMParser().parseFromString(src, "text/html").body.firstElementChild;
  }
  return iconCache[name].cloneNode(true);
}

// Put an icon (or nothing, if name is falsy) inside an element
function setIconSvg(el, name) {
  el.empty();
  if (name) el.append(iconNode(name));
}

// Only ever link to https URLs returned by remote services
const safeUrl = (u) => (/^https:\/\//.test(u || "") ? u : "");

// Fonts the clock can use. All come from the device (no web fonts, so no network
// request); the CSS for each lives in styles.extra.css under [data-clock-font].
const CLOCK_FONTS = {
  default: "Dashboard default",
  interface: "Obsidian interface font",
  text: "Obsidian text font",
  monospace: "Obsidian monospace font",
  serif: "System serif",
  custom: "Custom (a font installed on this device)",
};

// Turn what someone typed ("Courier New, Avenir Next") into a safe CSS font-family
// list. Only plain font names are kept; anything with other characters is dropped.
function cssFontFamily(input) {
  const generic = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded"]);
  return String(input ?? "")
    .split(",")
    .map((n) => n.trim().replace(/^["']+|["']+$/g, "").trim())
    .filter((n) => /^[\p{L}\p{N} .&+-]{1,60}$/u.test(n))
    .map((n) => (generic.has(n.toLowerCase()) ? n.toLowerCase() : `"${n}"`))
    .join(", ");
}

function formatClipDate(str) {
  if (!str) return "";
  const d = new Date(str.length === 10 ? `${str}T00:00:00` : str);
  if (isNaN(d.getTime())) return str;
  return fmtDate(d, { month: "long", day: "numeric", year: "numeric" });
}

// ─── Tasks.md format ──────────────────────────────────────────────────────────
//   - [ ] text ➕ 2026-10-10 ^block-id
// Compatible with the Obsidian Tasks plugin; the ^id is a native block id.

const TASK_RE =
  /^(\s*)[-*+] \[([ xX])\]\s+(.*?)(?:\s+➕ (\d{4}-\d{2}-\d{2}))?(?:\s+\^([A-Za-z0-9-]+))?\s*$/;

function parseTasks(markdown) {
  const tasks = [];
  for (const line of (markdown || "").split("\n")) {
    const m = line.match(TASK_RE);
    if (!m || !m[3]) continue;
    tasks.push({
      id: m[5] || null,
      text: m[3],
      done: m[2] !== " ",
    });
  }
  return tasks;
}

// First line after any YAML frontmatter
function bodyStart(text) {
  if (text.startsWith("---\n")) {
    const end = text.indexOf("\n---", 3);
    if (end !== -1) {
      const nl = text.indexOf("\n", end + 1);
      return nl === -1 ? text.length : nl + 1;
    }
  }
  return 0;
}

function mapTaskLines(text, fn) {
  return text
    .split("\n")
    .map((line) => {
      const m = line.match(TASK_RE);
      return m && m[3] ? fn(line, m) : line;
    })
    .filter((line) => line !== null)
    .join("\n");
}

// ─── View ─────────────────────────────────────────────────────────────────────

// Create a file (and its folders) if missing; tolerate a racing create from Sync
async function ensureFileIn(app, path, initial = "") {
  const vault = app.vault;
  let f = vault.getAbstractFileByPath(path);
  if (f instanceof TFile) return f;
  let folder = "";
  for (const part of path.split("/").slice(0, -1)) {
    folder = folder ? `${folder}/${part}` : part;
    if (vault.getAbstractFileByPath(folder)) continue;
    try {
      await vault.createFolder(folder);
    } catch {
      /* created by Sync or another view in the meantime */
    }
  }
  try {
    return await vault.create(path, initial);
  } catch (err) {
    f = vault.getAbstractFileByPath(path);
    if (f instanceof TFile) return f;
    throw err;
  }
}

// ─── Favourites.md format ─────────────────────────────────────────────────────
//   - [[Note name]]            (optionally [[Note#Heading|Label]])
// Plain wikilinks, so Obsidian keeps them correct when notes are renamed.

const FAV_RE = /^\s*[-*+]\s*\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/;

function parseFavourites(text) {
  const out = [];
  for (const line of (text || "").split("\n")) {
    const m = line.match(FAV_RE);
    if (m) out.push({ target: m[1].trim(), alias: (m[2] || "").trim() });
  }
  return out;
}

// ─── Ring notes (Pebble Index) ────────────────────────────────────────────────
// The ring's app appends entries to a note under timestamp headings:
//   ## 2026-10-05 21:55
//   Take note: ...

const RING_HEADING_RE = /^#{1,6}\s+(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?\s*$/;
const ANY_HEADING_RE = /^#{1,6}\s/;

function parseRingNotes(markdown) {
  const lines = (markdown || "").split("\n");
  const entries = [];
  let cur = null;
  lines.forEach((line, i) => {
    const m = line.match(RING_HEADING_RE);
    if (m) {
      const hasTime = m[4] !== undefined;
      cur = {
        line: i,
        hasTime,
        when: new Date(+m[1], +m[2] - 1, +m[3], hasTime ? +m[4] : 0, hasTime ? +m[5] : 0),
        body: [],
      };
      entries.push(cur);
    } else if (ANY_HEADING_RE.test(line)) {
      cur = null; // some other section — not ring content
    } else if (cur) {
      cur.body.push(line);
    }
  });
  entries.forEach((e) => (e.text = e.body.join("\n").trim()));
  // Newest first; entries that share a timestamp keep "later in the file = newer"
  return entries
    .filter((e) => e.text)
    .reverse()
    .sort((a, b) => b.when - a.when);
}

// ── "A separate file for each note" mode ──
// One file per voice note. Pebble's exact file format isn't documented, so be
// tolerant: timestamp from frontmatter, else the file name, else creation time.

const RING_FM_KEYS = ["created", "date", "timestamp", "time", "datetime", "recorded", "recorded_at", "created_at", "createdat"];
const RING_NAME_RES = [
  // 2026-10-11 0021 / 2026-10-11 002130 — the style the Pebble app uses (date, then HHmm)
  /(\d{4})-(\d{2})-(\d{2})[ T_-]+(\d{2})(\d{2})(\d{2})?(?!\d)/,
  // 2026-10-11 09-15 / 2026-10-11T09:15:30 / 2026-10-11_09.15 / 2026-10-11 (date only)
  /(\d{4})-(\d{2})-(\d{2})(?:[ T_.-]+(\d{1,2})[.:h-](\d{2})(?:[.:-](\d{2}))?)?/,
  // 20261011-0915 / 20261011_091530
  /(\d{4})(\d{2})(\d{2})[ T_-](\d{2})(\d{2})(\d{2})?/,
];

function ringDate(y, mo, d, hr, mi, sec) {
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null;
  const hasTime = hr !== undefined && hr <= 23 && mi <= 59;
  return {
    hasTime,
    when: new Date(y, mo - 1, d, hasTime ? hr : 0, hasTime ? mi : 0, hasTime && sec ? sec : 0),
  };
}

function ringDateFromString(str) {
  for (const re of RING_NAME_RES) {
    const m = String(str).match(re);
    if (!m) continue;
    const r = ringDate(+m[1], +m[2], +m[3], m[4] === undefined ? undefined : +m[4], m[5] === undefined ? undefined : +m[5], m[6] === undefined ? 0 : +m[6]);
    if (r) return r;
  }
  return null;
}

function ringFileTimestamp(file, frontmatter) {
  const fm = {};
  for (const [k, v] of Object.entries(frontmatter || {})) fm[k.toLowerCase()] = v;
  for (const key of RING_FM_KEYS) {
    if (fm[key] == null) continue;
    const r = ringDateFromString(fmString(fm[key]));
    if (r) return r;
    const d = new Date(fmString(fm[key]));
    if (!isNaN(d.getTime())) return { when: d, hasTime: true };
  }
  const fromName = ringDateFromString(file.basename);
  if (fromName) return fromName;
  return { when: new Date(file.stat.ctime), hasTime: true };
}

// The note's text: body without frontmatter, minus a leading heading that is just a timestamp
function ringFileText(raw) {
  const body = (raw || "").replace(/^---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n?/, "");
  const lines = body.split("\n");
  while (lines.length && !lines[0].trim()) lines.shift();
  if (lines.length && /^#{1,6}\s/.test(lines[0])) {
    const title = lines[0].replace(/^#{1,6}\s+/, "").trim();
    if (/^\d{4}-\d{2}-\d{2}([ T_.-]+\d{1,2}[.:h-]\d{2}([.:-]\d{2})?)?$/.test(title)) lines.shift();
    else lines[0] = title;
  }
  return lines.join("\n").trim();
}

// Autocomplete for the note / folder fields in settings (Obsidian 1.4.10+)
const PathSuggest = AbstractInputSuggest
  ? class extends AbstractInputSuggest {
      constructor(app, inputEl, kind) {
        super(app, inputEl);
        this.kind = kind;
        this.field = inputEl;
      }
      getSuggestions(query) {
        const q = (query || "").toLowerCase();
        const items =
          this.kind === "folder"
            ? this.app.vault.getAllLoadedFiles().filter((f) => f instanceof TFolder && f.path !== "/")
            : this.app.vault.getMarkdownFiles();
        return items.filter((f) => f.path.toLowerCase().includes(q)).slice(0, 50);
      }
      renderSuggestion(item, el) {
        el.setText(item.path);
      }
      selectSuggestion(item) {
        this.field.value = item.path;
        this.field.dispatchEvent(new Event("input"));
        this.close();
      }
    }
  : null;

class FavouritePicker extends FuzzySuggestModal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.setPlaceholder("Add a note to your homepage favourites…");
  }
  getItems() {
    return this.app.vault
      .getMarkdownFiles()
      .filter((f) => !this.plugin.isDataFile(f))
      .sort((a, b) => b.stat.mtime - a.stat.mtime);
  }
  getItemText(f) {
    return f.path.replace(/\.md$/, "");
  }
  onChooseItem(f) {
    this.plugin.addFavourite(f);
  }
}

// The dashboard markup (ids are how the rest of the code finds things)
function buildDashboard() {
  const refreshBtn = (id, title, aria) => h("button", { cls: "icon-btn sm", id, title, "aria-label": aria });
  const countRow = (countId, ...extra) =>
    h("div", { cls: "card-header-right" }, h("span", { cls: "badge", id: countId, text: "0" }), ...extra);

  const header = h(
    "header",
    { cls: "header" },
    h(
      "div",
      { cls: "header-top" },
      h("p", { cls: "greeting", id: "greeting", text: "Hello" }),
      h(
        "div",
        { cls: "header-controls" },
        h("button", { cls: "icon-btn", id: "page-refresh", title: "Refresh", "aria-label": "Refresh" }),
        h("button", { cls: "icon-btn", id: "theme-toggle", title: "Toggle theme", "aria-label": "Toggle theme" }),
        h("button", { cls: "icon-btn", id: "settings-btn", title: "Settings", "aria-label": "Open settings" }),
      ),
    ),
    h(
      "div",
      { cls: "clock-wrap" },
      h(
        "div",
        { cls: "clock", id: "clock" },
        h("span", { id: "clock-main", text: "12:00" }),
        h("span", { id: "clock-sec", text: ":00" }),
        " ",
        h("span", { id: "clock-ampm", text: "AM" }),
      ),
      h("div", { cls: "clock-date", id: "clock-date" }),
    ),
    h(
      "div",
      { cls: "search-container" },
      h(
        "form",
        { cls: "search-wrap", id: "search-form", role: "search", autocomplete: "off" },
        iconNode("search"),
        h("input", { type: "search", id: "search-input", placeholder: "Search your vault…", spellcheck: "false", "aria-label": "Search your vault" }),
        h("button", { type: "button", cls: "search-clear hidden", id: "search-clear", title: "Clear search", "aria-label": "Clear search" }, iconNode("clear")),
        h("kbd", { cls: "search-kbd", id: "search-kbd", text: "/" }),
      ),
      h("div", { cls: "search-results hidden", id: "search-results", role: "listbox", "aria-label": "Search results" }),
    ),
  );

  const hero = h(
    "div",
    { cls: "hero", id: "hero", role: "img", "aria-label": "Photo of the day" },
    h("img", { cls: "hero-img", id: "hero-img", alt: "Photo of the day" }),
    h("div", { cls: "hero-overlay", "aria-hidden": "true" }),
    h(
      "div",
      { cls: "hero-footer" },
      h("span", { cls: "hero-credit", id: "hero-credit" }),
      h("button", { cls: "icon-btn", id: "hero-refresh", title: "Load a new photo", "aria-label": "Load new photo" }),
    ),
  );

  const quote = h(
    "div",
    { cls: "quote-bar", id: "quote-bar" },
    h(
      "blockquote",
      { cls: "quote-content" },
      h("p", { cls: "quote-text", id: "quote-text" }),
      h("footer", { cls: "quote-author", id: "quote-author" }),
    ),
    // ZenQuotes' free API requires a visible credit linking back to zenquotes.io
    h(
      "div",
      { cls: "quote-credit hidden", id: "quote-credit" },
      "Inspirational quotes provided by ",
      h("a", { href: "https://zenquotes.io/", text: "ZenQuotes API" }),
    ),
  );

  const favs = h(
    "div",
    { cls: "card favs-card", id: "favs-card" },
    h("div", { cls: "card-header" }, h("span", { cls: "card-label", text: "Favourites" })),
    h("div", { cls: "favs-list", id: "favs-list" }),
  );

  const left = h(
    "aside",
    { cls: "col col-left" },
    h(
      "div",
      { cls: "card", id: "calendar-card" },
      h(
        "div",
        { cls: "card-header" },
        h("span", { cls: "card-label", text: "Calendar" }),
        h(
          "div",
          { cls: "cal-nav" },
          h("button", { cls: "cal-btn", id: "cal-prev", title: "Previous month", "aria-label": "Previous month", text: "‹" }),
          h("span", { id: "cal-month-label" }),
          h("button", { cls: "cal-btn", id: "cal-next", title: "Next month", "aria-label": "Next month", text: "›" }),
        ),
      ),
      h("div", { cls: "cal-grid", id: "cal-grid", role: "grid", "aria-label": "Calendar" }),
      h("button", { cls: "today-btn", id: "cal-today", text: "Today" }),
    ),
    h(
      "div",
      { cls: "card", id: "links-card" },
      h("div", { cls: "card-header" }, h("span", { cls: "card-label", text: "Quick links" })),
      h("nav", { id: "quick-links", "aria-label": "Quick links" }),
    ),
  );

  const center = h(
    "main",
    { cls: "col col-center" },
    h(
      "div",
      { cls: "card hidden", id: "ring-card" },
      h(
        "div",
        { cls: "card-header" },
        h("span", { cls: "card-label", text: "Ring notes" }),
        countRow("ring-count", h("a", { cls: "card-link", id: "ring-open", href: "#", title: "Open the notes file", text: "Open" })),
      ),
      h("div", { id: "ring-body" }),
    ),
    h(
      "div",
      { cls: "card", id: "clips-card" },
      h(
        "div",
        { cls: "card-header" },
        h("span", { cls: "card-label", text: "Web clips" }),
        countRow("clips-count", refreshBtn("refresh-clips", "Refresh clips", "Refresh web clips")),
      ),
      h("div", { id: "clips-body" }),
    ),
    h(
      "div",
      { cls: "card", id: "recent-card" },
      h(
        "div",
        { cls: "card-header" },
        h("span", { cls: "card-label", text: "Recent notes" }),
        countRow("recent-count", refreshBtn("refresh-recent", "Refresh recent notes", "Refresh recent notes")),
      ),
      h("div", { id: "recent-body" }),
    ),
  );

  const tab = (filter, label, active) =>
    h("button", { cls: active ? "tab active" : "tab", "data-filter": filter, role: "tab", "aria-selected": active ? "true" : "false", text: label });
  const right = h(
    "aside",
    { cls: "col col-right" },
    h(
      "div",
      { cls: "card", id: "tasks-card" },
      h(
        "div",
        { cls: "card-header" },
        h("span", { cls: "card-label", text: "Tasks" }),
        h("span", { cls: "tasks-stats", id: "tasks-stats", "aria-live": "polite", text: "0 / 0" }),
      ),
      h("input", { type: "text", cls: "task-input", id: "task-input", placeholder: "Add a task and press Enter…", "aria-label": "New task" }),
      h(
        "div",
        { cls: "tab-row", role: "tablist", "aria-label": "Filter tasks" },
        tab("all", "All", true),
        tab("active", "Active", false),
        tab("done", "Done", false),
      ),
      h("div", { id: "tasks-list", role: "list" }),
      h("button", { cls: "clear-btn", id: "clear-done", text: "Clear completed" }),
    ),
    h(
      "div",
      { cls: "card", id: "note-card" },
      h(
        "div",
        { cls: "card-header" },
        h("span", { cls: "card-label", text: "Quick note" }),
        h("span", { cls: "autosave-dot", id: "autosave-dot", title: "Saved", "aria-label": "Saved" }),
      ),
      h("textarea", { id: "quick-note", placeholder: "Jot something down…", spellcheck: "true", "aria-label": "Quick note" }),
    ),
  );

  return [h("div", { cls: "bg-glow" }), h("div", { id: "app" }, header, hero, quote, favs, h("div", { cls: "grid" }, left, center, right))];
}

class HomepageView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.tasks = [];
    this.taskFilter = "all";
    this.calYear = new Date().getFullYear();
    this.calMonth = new Date().getMonth();
    this.searchToken = 0;
    this.noteDirty = false;
    this.fixingIds = false;
    this.timers = {};
  }

  getViewType() {
    return VIEW_TYPE;
  }
  getDisplayText() {
    return "Homepage";
  }
  getIcon() {
    return "home";
  }

  get settings() {
    return this.plugin.settings;
  }
  $(id) {
    return this.root.querySelector(`#${id}`);
  }
  get tasksPath() {
    return joinPath(this.settings.dataFolder, "Tasks.md");
  }
  get notePath() {
    return joinPath(this.settings.dataFolder, "Quick Note.md");
  }
  get favPath() {
    return this.plugin.favPath;
  }
  get ringMode() {
    const m = this.settings.ringMode;
    return m === "chosen" || m === "files" ? m : "main";
  }
  // The note read in "main" / "chosen" mode
  get ringPath() {
    if (this.ringMode !== "chosen") return RING_MAIN_NOTE;
    const p = normalizePath(this.settings.ringNotesFile || RING_MAIN_NOTE);
    return /\.md$/i.test(p) ? p : `${p}.md`;
  }
  // The folder read in "files" mode
  get ringFolder() {
    return (this.settings.ringNotesFolder || "").replace(/^\/+|\/+$/g, "");
  }
  isRingFile(path) {
    if (this.ringMode === "files") return !!this.ringFolder && path.startsWith(`${this.ringFolder}/`);
    return path === this.ringPath;
  }
  // Run fn after ms; later calls with the same key replace the pending one
  later(key, ms, fn) {
    clearTimeout(this.timers[key]);
    this.timers[key] = setTimeout(fn, ms);
  }

  async onOpen() {
    this.contentEl.addClass("hp-view");
    // The id lets our control resets win over Obsidian's button/input styles without !important
    this.root = this.contentEl.createDiv({ cls: "hp-root", attr: { id: "genkan-root" } });
    this.root.append(...buildDashboard());
    if (Platform.isMobile) this.$("search-kbd").classList.add("hidden");

    setIconSvg(this.$("settings-btn"), "settings");
    setIconSvg(this.$("page-refresh"), "refresh");
    setIconSvg(this.$("refresh-clips"), "refresh");
    setIconSvg(this.$("refresh-recent"), "refresh");
    setIconSvg(this.$("hero-refresh"), "refresh");

    this.$("settings-btn").addEventListener("click", () => {
      this.app.setting.open();
      this.app.setting.openTabById(this.plugin.manifest.id);
    });
    this.$("page-refresh").addEventListener("click", () => this.refreshAll(true));
    this.$("refresh-clips").addEventListener("click", () => this.renderClips());
    this.$("refresh-recent").addEventListener("click", () => this.renderRecent());
    this.$("hero-refresh").addEventListener("click", () => this.loadHero(true));

    this.initTheme();
    this.initCalendar();
    this.initTasks();
    this.initNote();
    this.initLinks();
    this.initSearch();

    // Live updates: Obsidian Sync writes land here as vault events
    const v = this.app.vault;
    const onFile = (f) => this.onFileChange(f);
    this.registerEvent(v.on("modify", onFile));
    this.registerEvent(v.on("create", onFile));
    this.registerEvent(v.on("delete", onFile));
    this.registerEvent(v.on("rename", onFile));
    this.registerEvent(
      this.app.metadataCache.on("resolved", () => this.scheduleLists()),
    );
    this.registerEvent(
      this.app.metadataCache.on("changed", () => this.scheduleLists()),
    );
    this.registerEvent(this.app.workspace.on("css-change", () => this.applyTheme()));

    this.registerInterval(window.setInterval(() => this.tickClock(), 1000));
    // Day rollover: refresh date-dependent content every 5 minutes
    this.registerInterval(
      window.setInterval(() => {
        this.renderCalendar();
        this.loadHero(false);
        this.loadQuote();
      }, 5 * 60 * 1000), // both loaders return early when switched off in settings
    );

    this.refreshAll(false);
  }

  async onClose() {
    Object.values(this.timers).forEach(clearTimeout);
    this.searchToken++;
  }

  // Re-render everything (also called after settings change)
  applyClockFont() {
    const mode = Object.keys(CLOCK_FONTS).includes(this.settings.clockFont) ? this.settings.clockFont : "default";
    this.root.setAttribute("data-clock-font", mode);
    const family = mode === "custom" ? cssFontFamily(this.settings.clockFontCustom) : "";
    if (family) this.root.style.setProperty("--clock-font-custom", family);
    else this.root.style.removeProperty("--clock-font-custom");
  }

  refreshAll(force) {
    this.applyClockFont();
    this.tickClock(true);
    this.applyTheme();
    this.renderCalendar();
    this.renderLinks();
    this.renderFavourites();
    this.renderRingNotes();
    this.loadTasks();
    this.loadNote();
    this.renderClips();
    this.renderRecent();
    this.$("hero").classList.toggle("hidden", !this.settings.showHero);
    if (this.settings.showHero) this.loadHero(false);
    this.loadQuote();
  }

  onFileChange(f) {
    const path = f.path;
    if (path === this.tasksPath) this.later("tasks", 150, () => this.loadTasks());
    else if (path === this.notePath) this.later("note", 150, () => this.loadNote());
    else if (path === this.favPath) this.later("favs", 150, () => this.renderFavourites());
    else if (this.isRingFile(path)) this.later("ring", 150, () => this.renderRingNotes());
    else this.scheduleLists();
  }

  scheduleLists() {
    this.later("lists", 1500, () => {
      if (this.ringMode === "files") this.renderRingNotes(); // frontmatter may have changed
      this.renderFavourites();
      this.renderClips();
      this.renderRecent();
      this.renderCalendar();
    });
  }

  // ── Files ──

  ensureFile(path, initial = "") {
    return ensureFileIn(this.app, path, initial);
  }

  openFile(path, evt) {
    const f = this.app.vault.getAbstractFileByPath(path);
    if (!(f instanceof TFile)) {
      new Notice(`Note not found: ${path}`);
      return;
    }
    const mod = evt ? Keymap.isModEvent(evt) : false;
    this.app.workspace.getLeaf(mod || "tab").openFile(f);
  }

  // ── Theme ──

  applyTheme() {
    const t = this.settings.theme;
    const dark =
      t === "system" ? document.body.classList.contains("theme-dark") : t === "dark";
    this.root.setAttribute("data-theme", dark ? "dark" : "light");
    const btn = this.$("theme-toggle");
    setIconSvg(btn, t === "system" ? "monitor" : dark ? "moon" : "sun");
    const label = t === "system" ? `System (${dark ? "Dark" : "Light"})` : dark ? "Dark" : "Light";
    btn.title = `Appearance: ${label} — click to change`;
  }

  initTheme() {
    const cycle = { system: "dark", dark: "light", light: "system" };
    this.$("theme-toggle").addEventListener("click", async () => {
      this.settings.theme = cycle[this.settings.theme] ?? "system";
      await this.plugin.saveSettings();
      this.applyTheme();
    });
  }

  // ── Clock ──

  tickClock(force) {
    const now = new Date();
    const hour = now.getHours();
    const pad = (n) => String(n).padStart(2, "0");

    const phrase =
      hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : hour < 21 ? "Good evening" : "Good night";
    const name = this.settings.userName;
    // Rebuild only when the words change (this runs every second)
    const greetKey = `${phrase}|${name}`;
    if (this.greetKey !== greetKey) {
      this.greetKey = greetKey;
      const greeting = this.$("greeting");
      greeting.empty();
      greeting.append(name ? `${phrase}, ` : phrase);
      if (name) greeting.append(h("span", { cls: "gname", text: name }));
    }

    const main = this.$("clock-main");
    const ampm = this.$("clock-ampm");
    if (this.settings.clockFormat === "12h") {
      main.textContent = `${hour % 12 || 12}:${pad(now.getMinutes())}`;
      ampm.textContent = hour < 12 ? "AM" : "PM";
      ampm.classList.remove("hidden");
    } else {
      main.textContent = `${pad(hour)}:${pad(now.getMinutes())}`;
      ampm.classList.add("hidden");
    }
    this.$("clock-sec").textContent = `:${pad(now.getSeconds())}`;

    if (force || now.getSeconds() === 0 || !this.$("clock-date").textContent) {
      this.$("clock-date").textContent = fmtDate(now, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  }

  // ── Calendar ──

  dailyNoteConfig() {
    const dn = this.app.internalPlugins?.getPluginById?.("daily-notes")?.instance?.options ?? {};
    const pn = this.app.plugins?.plugins?.["periodic-notes"]?.settings?.daily;
    const periodic = pn?.enabled ? pn : null;
    let folder = this.settings.dailyNotesFolder || periodic?.folder || dn.folder || "";
    // An auto-detected folder that doesn't exist (stale core setting) would make
    // clicks create notes in a bogus place — fall back to the vault root instead
    if (
      !this.settings.dailyNotesFolder &&
      folder &&
      !this.app.vault.getAbstractFileByPath(normalizePath(folder))
    ) {
      folder = "";
    }
    return {
      format: periodic?.format || dn.format || "YYYY-MM-DD",
      folder,
      template: periodic?.template || dn.template || "",
    };
  }

  dailyPath(date) {
    const { format, folder } = this.dailyNoteConfig();
    return joinPath(folder, `${moment(date).format(format)}.md`);
  }

  async openDailyNote(date, evt) {
    const path = this.dailyPath(date);
    let f = this.app.vault.getAbstractFileByPath(path);
    if (!(f instanceof TFile)) {
      let content = "";
      const { template } = this.dailyNoteConfig();
      if (template) {
        const tf = this.app.vault.getAbstractFileByPath(normalizePath(`${template.replace(/\.md$/, "")}.md`));
        if (tf instanceof TFile) content = await this.app.vault.cachedRead(tf);
      }
      try {
        f = await this.ensureFile(path, content);
      } catch (err) {
        new Notice(`Could not create daily note: ${err.message}`);
        return;
      }
    }
    this.app.workspace.getLeaf((evt && Keymap.isModEvent(evt)) || "tab").openFile(f);
  }

  initCalendar() {
    this.$("cal-prev").addEventListener("click", () => {
      if (--this.calMonth < 0) {
        this.calMonth = 11;
        this.calYear--;
      }
      this.renderCalendar();
    });
    this.$("cal-next").addEventListener("click", () => {
      if (++this.calMonth > 11) {
        this.calMonth = 0;
        this.calYear++;
      }
      this.renderCalendar();
    });
    this.$("cal-today").addEventListener("click", () => {
      const now = new Date();
      this.calYear = now.getFullYear();
      this.calMonth = now.getMonth();
      this.renderCalendar();
    });
  }

  renderCalendar() {
    const year = this.calYear;
    const month = this.calMonth;
    const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    this.$("cal-month-label").textContent = `${MONTHS[month]} ${year}`;

    const grid = this.$("cal-grid");
    grid.empty();
    ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].forEach((label) => {
      const cell = document.createElement("div");
      cell.className = "cal-dow";
      cell.textContent = label;
      grid.appendChild(cell);
    });

    const today = new Date();
    const first = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();

    const filler = (n) => {
      const cell = document.createElement("div");
      cell.className = "cal-day other-month";
      cell.textContent = n;
      grid.appendChild(cell);
    };
    for (let i = first - 1; i >= 0; i--) filler(prevDays - i);

    for (let d = 1; d <= days; d++) {
      const cell = document.createElement("div");
      cell.className = "cal-day";
      const date = new Date(year, month, d);
      if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
        cell.classList.add("today");
      }
      if (this.app.vault.getAbstractFileByPath(this.dailyPath(date))) {
        cell.classList.add("has-note");
      }
      cell.textContent = d;
      cell.addEventListener("click", (e) => this.openDailyNote(date, e));
      grid.appendChild(cell);
    }

    const filled = first + days;
    const remaining = filled % 7 === 0 ? 0 : 7 - (filled % 7);
    for (let d = 1; d <= remaining; d++) filler(d);
  }

  // ── Tasks ──

  initTasks() {
    this.$("task-input").addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const val = e.currentTarget.value.replace(/\s*\n\s*/g, " ").trim();
      if (!val) return;
      e.currentTarget.value = "";
      this.addTask(val);
    });

    this.root.querySelectorAll(".tab[data-filter]").forEach((tab) => {
      tab.addEventListener("click", () => {
        this.taskFilter = tab.dataset.filter;
        this.root.querySelectorAll(".tab[data-filter]").forEach((t) => {
          t.classList.toggle("active", t === tab);
          t.setAttribute("aria-selected", String(t === tab));
        });
        this.renderTasks();
      });
    });

    this.$("clear-done").addEventListener("click", () =>
      this.mutateTasks((text) =>
        mapTaskLines(text, (line, m) => (m[2] !== " " ? null : line)),
      ),
    );
  }

  // Read-modify-write on the file itself, so edits made on another device (or
  // by hand in Obsidian) are never overwritten by a stale in-memory list.
  async mutateTasks(fn) {
    try {
      const file = await this.ensureFile(this.tasksPath);
      await this.app.vault.process(file, fn);
    } catch (err) {
      new Notice(`Could not update tasks: ${err.message}`);
    }
    await this.loadTasks();
  }

  addTask(text) {
    const line = `- [ ] ${text} ➕ ${moment().format("YYYY-MM-DD")} ^${newId()}`;
    return this.mutateTasks((t) => {
      const i = bodyStart(t);
      const lead = i === t.length && t && !t.endsWith("\n") ? "\n" : "";
      return `${t.slice(0, i)}${lead}${line}\n${t.slice(i)}`;
    });
  }

  toggleTask(id) {
    return this.mutateTasks((text) =>
      mapTaskLines(text, (line, m) =>
        m[5] === id
          ? line.replace(/\[([ xX])\]/, m[2] === " " ? "[x]" : "[ ]")
          : line,
      ),
    );
  }

  deleteTask(id) {
    return this.mutateTasks((text) =>
      mapTaskLines(text, (line, m) => (m[5] === id ? null : line)),
    );
  }

  async loadTasks() {
    const f = this.app.vault.getAbstractFileByPath(this.tasksPath);
    if (!(f instanceof TFile)) {
      this.tasks = [];
      this.renderTasks();
      return;
    }
    const text = await this.app.vault.read(f);
    this.tasks = parseTasks(text);
    this.renderTasks();

    // Tasks typed by hand in Obsidian have no ^id yet — add one so they can be toggled
    if (this.tasks.some((t) => !t.id) && !this.fixingIds) {
      this.fixingIds = true;
      try {
        await this.app.vault.process(f, (t) =>
          mapTaskLines(t, (line, m) => (m[5] ? line : `${line.trimEnd()} ^${newId()}`)),
        );
      } finally {
        this.fixingIds = false;
      }
    }
  }

  renderTasks() {
    const tasks = this.tasks.filter((t) => t.id);
    const done = tasks.filter((t) => t.done).length;
    this.$("tasks-stats").textContent = `${done} / ${tasks.length}`;

    const filtered =
      this.taskFilter === "active"
        ? tasks.filter((t) => !t.done)
        : this.taskFilter === "done"
          ? tasks.filter((t) => t.done)
          : tasks;

    const list = this.$("tasks-list");
    if (!filtered.length) {
      const msg =
        this.taskFilter === "done"
          ? "No completed tasks yet."
          : this.taskFilter === "active"
            ? "Nothing left to do!"
            : "No tasks yet — add one above.";
      this.showEmpty(list, msg);
      return;
    }

    list.empty();
    for (const task of filtered) {
      const check = h("button", {
        cls: task.done ? "task-check checked" : "task-check",
        "aria-label": task.done ? "Mark incomplete" : "Mark complete",
      });
      setIconSvg(check, task.done ? "check" : null);
      check.addEventListener("click", () => this.toggleTask(task.id));

      const del = h("button", { cls: "task-del", title: "Delete", "aria-label": `Delete: ${task.text}` });
      setIconSvg(del, "trash");
      del.addEventListener("click", () => this.deleteTask(task.id));

      list.append(
        h(
          "div",
          { cls: task.done ? "task-item done" : "task-item", role: "listitem" },
          check,
          h("span", { cls: "task-text", text: task.text }),
          del,
        ),
      );
    }
  }

  // ── Quick Note ──

  initNote() {
    const textarea = this.$("quick-note");
    textarea.addEventListener("input", () => {
      this.noteDirty = true;
      this.$("autosave-dot").className = "autosave-dot unsaved";
      this.later("noteSave", 800, () => this.saveNote());
    });
    // Flush on blur so switching tabs right after typing never loses text
    textarea.addEventListener("blur", () => {
      if (this.noteDirty) this.saveNote();
    });
    this.$("autosave-dot").className = "autosave-dot saved";
  }

  async saveNote() {
    clearTimeout(this.timers.noteSave);
    const textarea = this.$("quick-note");
    const value = textarea.value;
    try {
      const file = await this.ensureFile(this.notePath);
      await this.app.vault.process(file, () => value);
      if (textarea.value === value) {
        this.noteDirty = false;
        this.$("autosave-dot").className = "autosave-dot saved";
      }
    } catch (err) {
      new Notice(`Could not save quick note: ${err.message}`);
    }
  }

  async loadNote() {
    // Never replace text the user is in the middle of editing
    if (this.noteDirty) return;
    const f = this.app.vault.getAbstractFileByPath(this.notePath);
    const text = f instanceof TFile ? await this.app.vault.read(f) : "";
    const textarea = this.$("quick-note");
    if (!this.noteDirty && textarea.value !== text) textarea.value = text;
  }

  // ── Quick Links ──

  renderLinks() {
    const nav = this.$("quick-links");
    const links = this.settings.quickLinks ?? [];
    nav.empty();
    if (!links.length) {
      nav.createSpan({ cls: "hp-empty", text: "No quick links configured." });
      return;
    }
    links.forEach((l, i) =>
      nav.append(
        h(
          "a",
          { cls: "quick-link", href: "#", "data-ql": String(i) },
          h("span", { cls: "ql-icon", text: l.icon ?? "" }),
          h("span", { text: l.label }),
        ),
      ),
    );
  }

  initLinks() {
    // One delegated handler covers quick links, clip cards, notes and search results
    this.root.addEventListener("click", (e) => {
      const rm = e.target.closest("[data-fav-remove]");
      if (rm) {
        e.preventDefault();
        e.stopPropagation();
        this.plugin.removeFavourite(rm.dataset.favRemove);
        return;
      }
      if (e.target.closest("#fav-add")) {
        e.preventDefault();
        new FavouritePicker(this.app, this.plugin).open();
        return;
      }
      const ring = e.target.closest("[data-ring-line]");
      if (ring) {
        e.preventDefault();
        this.openRingNote(ring.dataset.ringPath, Number(ring.dataset.ringLine), e);
        return;
      }
      const fav = e.target.closest("[data-fav]");
      if (fav) {
        e.preventDefault();
        this.app.workspace.openLinkText(fav.dataset.fav, "", Keymap.isModEvent(e) || "tab");
        return;
      }
      const el = e.target.closest("[data-ql], [data-open]");
      if (!el) return;
      e.preventDefault();
      if (el.dataset.open != null) {
        this.openFile(el.dataset.open, e);
        return;
      }
      const link = this.settings.quickLinks?.[Number(el.dataset.ql)];
      if (link) this.runAction(link.action, e);
    });
  }

  async runAction(action, evt) {
    const a = (action || "").trim();
    if (a === "daily") return this.openDailyNote(new Date(), evt);
    if (a === "random") {
      const files = this.app.vault.getMarkdownFiles();
      if (!files.length) return;
      const f = files[Math.floor(Math.random() * files.length)];
      return this.openFile(f.path, evt);
    }
    if (a.startsWith("command:")) {
      const id = a.slice(8);
      if (!this.app.commands.executeCommandById(id)) new Notice(`Command not found: ${id}`);
      return;
    }
    if (a.startsWith("open:")) return this.openFile(normalizePath(a.slice(5)), evt);
    if (/^(https?|obsidian):\/\//.test(a)) return window.open(a);
    new Notice(`Unknown quick link action: ${a}`);
  }

  // ── Ring notes ──

  formatRingWhen(e) {
    const d = e.when;
    const now = new Date();
    const dayDiff = Math.round(
      (new Date(now.getFullYear(), now.getMonth(), now.getDate()) -
        new Date(d.getFullYear(), d.getMonth(), d.getDate())) /
        86_400_000,
    );
    const day =
      dayDiff === 0
        ? "Today"
        : dayDiff === 1
          ? "Yesterday"
          : fmtDate(d, { month: "short", day: "numeric", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
    if (!e.hasTime) return day;
    const time = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: this.settings.clockFormat === "12h",
    });
    return `${day} · ${time}`;
  }

  async renderRingNotes() {
    const card = this.$("ring-card");
    const enabled = !!this.settings.showRingNotes;
    card.classList.toggle("hidden", !enabled);
    if (!enabled) return;

    const body = this.$("ring-body");
    const count = this.$("ring-count");
    const openLink = this.$("ring-open");
    const max = this.settings.maxRingNotes;
    let entries;
    let total;

    if (this.ringMode === "files") {
      // A separate file per note: newest first by timestamp, then read only the ones shown
      openLink.classList.add("hidden");
      const folder = this.ringFolder;
      if (!folder) {
        count.textContent = "0";
        this.showEmpty(body, "Choose the folder your ring saves notes to in Genkan's settings.");
        return;
      }
      const stamped = this.app.vault
        .getMarkdownFiles()
        .filter((f) => f.path.startsWith(`${folder}/`) && !this.isDataFile(f))
        .map((f) => ({ f, ...ringFileTimestamp(f, this.app.metadataCache.getFileCache(f)?.frontmatter) }))
        .sort((a, b) => b.when - a.when);
      total = stamped.length;
      if (!total) {
        count.textContent = "0";
        this.showEmpty(body, `No notes found in “${folder}”.`);
        return;
      }
      entries = await Promise.all(
        stamped.slice(0, max).map(async ({ f, when, hasTime }) => ({
          when,
          hasTime,
          path: f.path,
          line: 0,
          text: ringFileText(await this.readText(f)) || f.basename,
        })),
      );
    } else {
      // One note with timestamped entries appended under headings
      const path = this.ringPath;
      openLink.classList.remove("hidden");
      openLink.dataset.open = path;
      const f = this.app.vault.getAbstractFileByPath(path);
      if (!(f instanceof TFile)) {
        count.textContent = "0";
        this.showEmpty(body, `No ring notes yet. Looking for “${path}”.`);
        return;
      }
      const parsed = parseRingNotes(await this.app.vault.read(f));
      total = parsed.length;
      if (!total) {
        count.textContent = "0";
        this.showEmpty(body, `No timestamped entries found in “${path}”.`);
        return;
      }
      entries = parsed.slice(0, max).map((e) => ({ ...e, path }));
    }

    count.textContent = total;
    body.empty();
    const list = body.createDiv({ cls: "ring-list" });
    for (const e of entries) {
      list.append(
        h(
          "a",
          { cls: "ring-item", href: "#", "data-ring-path": e.path, "data-ring-line": String(e.line) },
          h("span", { cls: "ring-when", text: this.formatRingWhen(e) }),
          h("span", { cls: "ring-text", text: e.text }),
        ),
      );
    }
  }

  // Open the note (scrolled to the entry's heading when it's one of many in a note)
  openRingNote(path, line, evt) {
    const f = this.app.vault.getAbstractFileByPath(path);
    if (!(f instanceof TFile)) return;
    const mod = evt ? Keymap.isModEvent(evt) : false;
    this.app.workspace.getLeaf(mod || "tab").openFile(f, line ? { eState: { line } } : undefined);
  }

  // ── Favourites ──

  async renderFavourites() {
    const list = this.$("favs-list");
    const favs = await this.plugin.readFavourites();
    list.empty();
    for (const f of favs) {
      const file = this.app.metadataCache.getFirstLinkpathDest(f.target.split("#")[0], "");
      const label = f.alias || (file ? file.basename : f.target);
      list.append(
        h(
          "span",
          {
            cls: file ? "fav-chip" : "fav-chip missing",
            "data-fav": f.target,
            title: file ? file.path : "Not found — click to create",
            role: "button",
            tabindex: "0",
          },
          h("span", { cls: "fav-star", text: "★" }),
          h("span", { cls: "fav-name", text: label }),
          h("button", {
            cls: "fav-x",
            "data-fav-remove": f.target,
            title: "Remove from favourites",
            "aria-label": `Remove ${label} from favourites`,
            text: "×",
          }),
        ),
      );
    }
    list.append(h("button", { cls: "fav-add", id: "fav-add", title: "Add a favourite", text: "+ Add" }));
    if (!favs.length) {
      list.append(
        h("span", {
          cls: "hp-empty fav-hint",
          text: "Pin the notes you open most. You can also right-click any note → “Add to homepage favourites”.",
        }),
      );
    }
    // Keyboard: Enter/Space activate a chip
    list.querySelectorAll(".fav-chip").forEach((chip) =>
      chip.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          chip.click();
        }
      }),
    );
  }

  // ── Web Clips & Recent Notes ──

  // Cached read that treats an unreadable file as empty instead of failing the whole list
  async readText(file) {
    try {
      return await this.app.vault.cachedRead(file);
    } catch {
      return "";
    }
  }

  // Replace an area's contents with a dim one-line message
  showEmpty(el, text) {
    el.empty();
    el.createDiv({ cls: "hp-empty", text });
  }

  isDataFile(f) {
    const dir = (this.settings.dataFolder || "").replace(/^\/+|\/+$/g, "");
    return !!dir && f.path.startsWith(`${dir}/`);
  }

  renderClips() {
    const folder = (this.settings.clipsFolder || "").replace(/^\/+|\/+$/g, "");
    const body = this.$("clips-body");
    const clips = this.app.vault
      .getMarkdownFiles()
      .filter((f) => folder && f.path.startsWith(`${folder}/`))
      .map((f) => {
        const fm = this.app.metadataCache.getFileCache(f)?.frontmatter ?? {};
        return {
          path: f.path,
          title: fmString(fm.title) || f.basename,
          source: fmString(fm.source || fm.url),
          date: fmString(fm.clipped || fm.created || fm.date),
          mtime: f.stat.mtime,
        };
      })
      .sort((a, b) => {
        const ta = a.date ? new Date(a.date).getTime() || a.mtime : a.mtime;
        const tb = b.date ? new Date(b.date).getTime() || b.mtime : b.mtime;
        return tb - ta;
      })
      .slice(0, this.settings.maxClips);

    this.$("clips-count").textContent = clips.length;
    if (!clips.length) {
      this.showEmpty(body, `No clips found in “${folder || "(no folder set)"}”.`);
      return;
    }
    body.empty();
    const grid = body.createDiv({ cls: "clips-grid" });
    for (const c of clips) {
      const domain = c.source ? getDomain(c.source) : "";
      const header = h("div", { cls: "clip-header" });
      if (domain && this.settings.showFavicons) {
        const icon = h("img", {
          cls: "clip-favicon",
          src: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`,
          alt: "",
        });
        icon.addEventListener("error", () => icon.addClass("hidden"));
        header.append(icon);
      }
      header.append(h("span", { cls: "clip-domain", text: domain }));
      grid.append(
        h(
          "a",
          { cls: "clip-card", href: "#", "data-open": c.path },
          header,
          h("div", { cls: "clip-title", text: c.title }),
          h("div", { cls: "clip-date", text: formatClipDate(c.date) }),
        ),
      );
    }
  }

  renderRecent() {
    const body = this.$("recent-body");
    const notes = this.app.vault
      .getMarkdownFiles()
      .filter((f) => !this.isDataFile(f))
      .sort((a, b) => b.stat.mtime - a.stat.mtime)
      .slice(0, this.settings.maxRecent);

    this.$("recent-count").textContent = notes.length;
    if (!notes.length) {
      this.showEmpty(body, "No notes found.");
      return;
    }
    body.empty();
    const list = body.createDiv({ cls: "notes-list" });
    for (const f of notes) {
      const date = dateFromFilename(f.basename) ?? fmtDate(new Date(f.stat.mtime));
      const folder = f.parent && f.parent.path !== "/" ? f.parent.path : "";
      const info = h(
        "div",
        { cls: "note-info" },
        h("div", { cls: "note-title-row" }, h("span", { cls: "note-title", text: f.basename }), h("span", { cls: "note-date", text: date })),
      );
      if (folder) info.append(h("span", { cls: "note-path", text: folder }));
      list.append(h("a", { cls: "note-item", href: "#", "data-open": f.path }, h("span", { cls: "note-icon", text: "📄" }), info));
    }
  }

  // ── Search ──

  initSearch() {
    const input = this.$("search-input");
    const form = this.$("search-form");
    const results = this.$("search-results");

    // Hide the "/" hint while the box is focused or has text (CSS: .kbd-hidden)
    input.addEventListener("focus", () => form.addClass("kbd-hidden"));
    input.addEventListener("blur", () => {
      if (!input.value) form.removeClass("kbd-hidden");
    });
    const clear = this.$("search-clear");
    const syncClear = () => clear.classList.toggle("hidden", !input.value);
    // Bring the dropdown back when you return to a box that still has a query
    const reopen = () => {
      const q = input.value.trim();
      if (q && results.classList.contains("hidden")) this.runSearch(q);
    };
    input.addEventListener("focus", reopen);
    input.addEventListener("click", reopen);
    input.addEventListener("input", () => {
      syncClear();
      const q = input.value.trim();
      if (!q) return this.closeSearch();
      this.later("search", 300, () => this.runSearch(q));
    });
    clear.addEventListener("click", () => {
      input.value = "";
      syncClear();
      form.removeClass("kbd-hidden");
      this.closeSearch();
      input.focus();
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (q) this.runSearch(q);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeSearch();
        input.blur();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        results.querySelector(".search-result-item")?.focus();
      }
    });
    results.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeSearch();
        input.focus();
        return;
      }
      const items = [...results.querySelectorAll(".search-result-item")];
      const idx = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown" && idx < items.length - 1) {
        e.preventDefault();
        items[idx + 1].focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        idx > 0 ? items[idx - 1].focus() : input.focus();
      } else if (e.key === "Enter" && idx >= 0) {
        e.preventDefault();
        this.openFile(items[idx].dataset.open, e);
        this.closeSearch();
      }
    });
    this.root.addEventListener("click", (e) => {
      if (!e.target.closest(".search-container")) this.closeSearch();
      else if (e.target.closest(".search-result-item")) this.closeSearch();
    });
    // "/" focuses search while this view is the active tab, unless you are typing somewhere
    this.registerDomEvent(document, "keydown", (e) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
      if (this.app.workspace.getActiveViewOfType(HomepageView) !== this) return;
      const t = e.target;
      if (t instanceof HTMLElement) {
        if (t.closest("input, textarea, select, [contenteditable='true']")) return;
        if (t.closest(".modal-container, .menu, .suggestion-container")) return;
      }
      e.preventDefault();
      input.focus();
    });
  }

  closeSearch() {
    this.searchToken++;
    clearTimeout(this.timers.search);
    const results = this.$("search-results");
    results.classList.add("hidden");
    results.empty();
  }

  async runSearch(query) {
    const token = ++this.searchToken;
    const results = this.$("search-results");
    results.classList.remove("hidden");
    results.empty();
    results.createDiv({ cls: "search-status", text: "↻ Searching…" });

    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const files = this.app.vault
      .getMarkdownFiles()
      .filter((f) => !this.isDataFile(f))
      .sort((a, b) => b.stat.mtime - a.stat.mtime)
      .slice(0, 4000);

    const hits = [];
    const LIMIT = 15;
    for (let i = 0; i < files.length && hits.length < LIMIT; i += 30) {
      const chunk = files.slice(i, i + 30);
      const texts = await Promise.all(chunk.map((f) => this.readText(f)));
      if (token !== this.searchToken) return; // superseded or closed
      chunk.forEach((f, j) => {
        if (hits.length >= LIMIT) return;
        const text = texts[j];
        const lower = text.toLowerCase();
        const hay = `${f.path.toLowerCase()}\n${lower}`;
        if (!words.every((w) => hay.includes(w))) return;
        const titleHit = words.every((w) => f.path.toLowerCase().includes(w));
        const at = lower.indexOf(words[0]);
        let snippet = null;
        if (at >= 0) {
          const s = Math.max(0, at - 40);
          const raw = text.slice(s, at + words[0].length + 80).replace(/\s+/g, " ");
          // Whitespace was just collapsed, so find the match again rather than
          // reusing its offset in the original text
          const rel = Math.max(0, raw.toLowerCase().indexOf(words[0]));
          snippet = {
            before: raw.slice(0, rel),
            match: raw.slice(rel, rel + words[0].length),
            after: raw.slice(rel + words[0].length),
          };
        }
        hits.push({ f, snippet, titleHit });
      });
      await new Promise((r) => setTimeout(r, 0)); // keep the UI responsive
    }
    if (token !== this.searchToken) return;

    if (!hits.length) {
      results.empty();
      results.createDiv({ cls: "search-status", text: `No results for “${query}”` });
      return;
    }
    hits.sort((a, b) => Number(b.titleHit) - Number(a.titleHit));
    results.empty();
    for (const { f, snippet } of hits) {
      const folder = f.parent && f.parent.path !== "/" ? f.parent.path : "";
      const body = h("div", { cls: "search-result-body" }, h("div", { cls: "search-result-title", text: f.basename }));
      if (folder) body.append(h("div", { cls: "search-result-path", text: folder }));
      if (snippet) {
        body.append(
          h("div", { cls: "search-result-snippet" }, snippet.before, h("mark", { text: snippet.match }), snippet.after),
        );
      }
      results.append(
        h(
          "a",
          { cls: "search-result-item", href: "#", "data-open": f.path, tabindex: "0" },
          h("span", { cls: "search-result-icon", text: "📄" }),
          body,
        ),
      );
    }
  }

  // ── Hero photo & quote ──

  cacheGet(key) {
    try {
      return JSON.parse(window.localStorage.getItem(`hp-${this.app.vault.getName()}-${key}`));
    } catch {
      return null;
    }
  }
  cacheSet(key, value) {
    try {
      window.localStorage.setItem(`hp-${this.app.vault.getName()}-${key}`, JSON.stringify(value));
    } catch {
      /* storage unavailable */
    }
  }

  async loadHero(forceNew) {
    if (!this.settings.showHero) return; // hidden: no photo, no network request
    const today = new Date().toISOString().slice(0, 10);
    if (!forceNew) {
      const cached = this.cacheGet("hero");
      if (cached?.date === today) return this.displayHero(cached);
    }
    const key = this.settings.unsplashKey;
    if (key) {
      try {
        const res = await requestUrl({
          url: `https://api.unsplash.com/photos/random?query=${HERO_TOPICS}&orientation=landscape&client_id=${encodeURIComponent(key)}`,
        });
        const data = res.json;
        const photo = {
          date: today,
          src: data.urls.regular,
          alt: data.alt_description || data.description || "Nature photo",
          photographer: data.user.name,
          photographerUrl: `${data.user.links.html}?utm_source=genkan&utm_medium=referral`,
          photoUrl: `${data.links.html}?utm_source=genkan&utm_medium=referral`,
        };
        this.cacheSet("hero", photo);
        return this.displayHero(photo);
      } catch {
        /* fall through to Picsum */
      }
    }
    const photo = {
      date: today,
      src: `https://picsum.photos/seed/${today}/1600/500`,
      alt: "Landscape photo of the day",
      photographer: null,
      photoUrl: "https://picsum.photos",
    };
    this.cacheSet("hero", photo);
    this.displayHero(photo);
  }

  displayHero(photo) {
    const hero = this.$("hero");
    const img = this.$("hero-img");
    const credit = this.$("hero-credit");
    img.alt = photo.alt || "Photo of the day";
    img.classList.remove("visible");
    img.onload = () => {
      img.classList.add("visible");
      hero.classList.add("loaded");
    };
    img.onerror = () => {
      hero.classList.add("loaded");
      credit.textContent = "";
    };
    img.src = photo.src;
    credit.empty();
    if (photo.photographer) {
      credit.append(
        "Photo by ",
        h("a", { href: safeUrl(photo.photographerUrl), text: photo.photographer }),
        " on ",
        h("a", { href: safeUrl(photo.photoUrl), text: "Unsplash" }),
      );
    } else {
      credit.append("Photo from ", h("a", { href: safeUrl(photo.photoUrl), text: "Picsum Photos" }));
    }
  }

  fallbackQuote() {
    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86_400_000);
    return QUOTES[dayOfYear % QUOTES.length];
  }

  displayQuote({ q, a, src }) {
    this.$("quote-text").textContent = q;
    this.$("quote-author").textContent = `— ${a}`;
    this.$("quote-credit").classList.toggle("hidden", src !== "zenquotes");
  }

  async loadQuote() {
    const bar = this.$("quote-bar");
    bar.classList.toggle("hidden", !this.settings.showQuote);
    if (!this.settings.showQuote) return; // no quote, no network request

    const today = new Date().toISOString().slice(0, 10);
    const cached = this.cacheGet("quote");
    // Quotes cached before the source was recorded have no credit info: fetch those again once
    if (cached?.date === today && cached.src) return this.displayQuote(cached);

    this.displayQuote({ ...this.fallbackQuote(), src: "builtin" });
    try {
      const res = await requestUrl({ url: "https://zenquotes.io/api/today" });
      const d = res.json?.[0];
      if (d?.q) {
        const quote = { date: today, q: d.q, a: d.a, src: "zenquotes" };
        this.cacheSet("quote", quote);
        return this.displayQuote(quote);
      }
    } catch {
      /* use the built-in quote */
    }
    this.cacheSet("quote", { date: today, ...this.fallbackQuote(), src: "builtin" });
  }
}

// ─── Settings tab ─────────────────────────────────────────────────────────────

const quickLinksToText = (links) =>
  (links ?? []).map((l) => `${l.icon ?? ""} | ${l.label} | ${l.action}`).join("\n");

function textToQuickLinks(text) {
  return text
    .split("\n")
    .map((line) => line.split("|").map((s) => s.trim()))
    .filter((p) => p.length >= 3 && p[1] && p[2])
    .map(([icon, label, ...rest]) => ({ icon, label, action: rest.join("|") }));
}

class HomepageSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    const s = this.plugin.settings;
    containerEl.empty();

    const save = async (key, value) => {
      s[key] = value;
      await this.plugin.saveSettings();
      this.plugin.refreshViews();
    };
    const text = (name, desc, key, opts = {}) =>
      new Setting(containerEl)
        .setName(name)
        .setDesc(desc)
        .addText((t) => {
          t.setPlaceholder(opts.placeholder ?? "")
            .setValue(String(s[key] ?? ""))
            .onChange((v) => save(key, opts.number ? Math.max(1, Number(v) || 1) : v.trim()));
          if (opts.password) t.inputEl.type = "password";
          if (opts.suggest && PathSuggest) new PathSuggest(this.app, t.inputEl, opts.suggest);
        });

    text("Your name", "Shown in the greeting.", "userName", { placeholder: "e.g. Alex" });

    new Setting(containerEl)
      .setName("Open on startup")
      .setDesc("Open the homepage when Obsidian starts.")
      .addToggle((t) => t.setValue(s.openOnStartup).onChange((v) => save("openOnStartup", v)));

    new Setting(containerEl)
      .setName("Appearance")
      .setDesc("System follows Obsidian's light/dark theme.")
      .addDropdown((d) =>
        d
          .addOptions({ system: "System", dark: "Dark", light: "Light" })
          .setValue(s.theme)
          .onChange((v) => save("theme", v)),
      );

    new Setting(containerEl)
      .setName("Clock format")
      .addDropdown((d) =>
        d
          .addOptions({ "12h": "12-hour (AM/PM)", "24h": "24-hour" })
          .setValue(s.clockFormat)
          .onChange((v) => save("clockFormat", v)),
      );

    const customFont = text(
      "Custom clock font",
      "The name of a font installed on this device, such as Courier New or Avenir Next. A device without it uses the dashboard font.",
      "clockFontCustom",
      { placeholder: "Font name" },
    );
    const showCustomFont = () => customFont.settingEl.toggleClass("genkan-hidden", s.clockFont !== "custom");
    const fontSetting = new Setting(containerEl)
      .setName("Clock font")
      .setDesc("Uses fonts already on your device. Your Obsidian theme's fonts are available too.")
      .addDropdown((d) =>
        d
          .addOptions(CLOCK_FONTS)
          .setValue(Object.keys(CLOCK_FONTS).includes(s.clockFont) ? s.clockFont : "default")
          .onChange(async (v) => {
            s.clockFont = v;
            await save("clockFont", v);
            showCustomFont();
          }),
      );
    containerEl.insertBefore(fontSetting.settingEl, customFont.settingEl); // picker above its custom field
    showCustomFont();

    new Setting(containerEl)
      .setName("Folders")
      .setHeading();
    text("Web Clipper folder", "Where the Web Clipper saves notes.", "clipsFolder", {
      placeholder: "Clippings",
    });
    text(
      "Daily notes folder",
      "Leave blank to use your Daily Notes / Periodic Notes settings.",
      "dailyNotesFolder",
    );
    text(
      "Data folder",
      "Tasks.md and Quick Note.md are stored here, so Obsidian Sync shares them across devices.",
      "dataFolder",
      { placeholder: "genkan/data" },
    );

    new Setting(containerEl).setName("Content").setHeading();
    text("Max web clips", "", "maxClips", { number: true });
    text("Max recent notes", "", "maxRecent", { number: true });

    new Setting(containerEl)
      .setName("Pebble ring notes")
      .setDesc("Show the latest voice notes from your Pebble Index ring.")
      .addToggle((t) => t.setValue(s.showRingNotes).onChange((v) => save("showRingNotes", v)));

    // These mirror the three Obsidian choices in the Pebble app
    const noteSetting = text(
      "Ring note",
      "The note the ring adds your voice notes to, with entries under headings like “## 2026-10-05 21:55”.",
      "ringNotesFile",
      { placeholder: "Pebble Index.md", suggest: "file" },
    );
    const folderSetting = text(
      "Ring notes folder",
      "The folder the ring saves each voice note into, one file per note.",
      "ringNotesFolder",
      { placeholder: "Pebble Index", suggest: "folder" },
    );
    const showRingFields = () => {
      noteSetting.settingEl.toggleClass("genkan-hidden", s.ringMode !== "chosen");
      folderSetting.settingEl.toggleClass("genkan-hidden", s.ringMode !== "files");
    };
    const modeSetting = new Setting(containerEl)
      .setName("Where does the ring save notes?")
      .setDesc("Match the Obsidian setting in the Pebble app.")
      .addDropdown((d) =>
        d
          .addOptions({
            main: "One main note (Pebble Index.md)",
            chosen: "An existing note I choose",
            files: "A separate file for each note",
          })
          .setValue(["chosen", "files"].includes(s.ringMode) ? s.ringMode : "main")
          .onChange(async (v) => {
            s.ringMode = v;
            await save("ringMode", v);
            showRingFields();
          }),
      );
    // Keep the mode picker above the field it controls
    containerEl.insertBefore(modeSetting.settingEl, noteSetting.settingEl);
    showRingFields();
    text("Max ring notes", "", "maxRingNotes", { number: true });

    new Setting(containerEl)
      .setName("Photo of the day")
      .setDesc("Shows a landscape photo from Picsum, or from Unsplash if you add a key below. Off means no photo is requested.")
      .addToggle((t) => t.setValue(s.showHero).onChange((v) => save("showHero", v)));
    text(
      "Unsplash access key",
      "Optional. Enables nature photos from Unsplash with attribution. The key is stored in this plugin's settings file in your vault.",
      "unsplashKey",
      { password: true },
    );
    new Setting(containerEl)
      .setName("Daily quote")
      .setDesc("Shows a quote from ZenQuotes, fetched once a day. Off means no quote is requested.")
      .addToggle((t) => t.setValue(s.showQuote).onChange((v) => save("showQuote", v)));
    new Setting(containerEl)
      .setName("Site icons on web clips")
      .setDesc("Uses Google's favicon service, which receives the domain of each clipped page. Off means no icon requests.")
      .addToggle((t) => t.setValue(s.showFavicons).onChange((v) => save("showFavicons", v)));

    new Setting(containerEl)
      .setName("Quick links")
      .setDesc(
        "One per line: icon | label | action. Actions: command:<command id>, open:<note path>, daily, random, or an https:// URL.",
      )
      .addTextArea((t) => {
        t.setValue(quickLinksToText(s.quickLinks)).onChange((v) =>
          save("quickLinks", textToQuickLinks(v)),
        );
        t.inputEl.rows = 7;
        t.inputEl.addClass("genkan-wide-input");
      });
  }
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

module.exports = class HomepagePlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.registerView(VIEW_TYPE, (leaf) => new HomepageView(leaf, this));
    this.addRibbonIcon("home", "Open homepage", () => this.activateView());
    this.addCommand({
      id: "open-homepage",
      name: "Open homepage",
      callback: () => this.activateView(),
    });
    this.addSettingTab(new HomepageSettingTab(this.app, this));

    this.favPaths = new Set();
    const onVault = (f) => {
      if (f.path === this.favPath) this.scheduleFavCache();
    };
    this.registerEvent(this.app.vault.on("modify", onVault));
    this.registerEvent(this.app.vault.on("create", onVault));
    this.registerEvent(this.app.vault.on("delete", onVault));
    this.registerEvent(this.app.vault.on("rename", onVault));
    this.registerEvent(this.app.metadataCache.on("resolved", () => this.scheduleFavCache()));
    this.app.workspace.onLayoutReady(() => this.refreshFavCache());

    this.addCommand({
      id: "toggle-favourite",
      name: "Add or remove current note from homepage favourites",
      checkCallback: (checking) => {
        const f = this.app.workspace.getActiveFile();
        if (!f || f.extension !== "md" || this.isDataFile(f)) return false;
        if (!checking) this.toggleFavourite(f);
        return true;
      },
    });
    this.addCommand({
      id: "add-favourite",
      name: "Add a note to homepage favourites…",
      callback: () => new FavouritePicker(this.app, this).open(),
    });
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => this.addFavouriteMenuItem(menu, file)),
    );
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, view) =>
        this.addFavouriteMenuItem(menu, view?.file),
      ),
    );

    this.stars = new Map();
    this.registerEvent(this.app.workspace.on("active-leaf-change", (leaf) => this.decorateLeaf(leaf)));
    this.registerEvent(
      this.app.workspace.on("file-open", () => {
        this.app.workspace.iterateAllLeaves((l) => this.decorateLeaf(l));
        this.updateStars();
      }),
    );
    this.app.workspace.onLayoutReady(() => {
      this.app.workspace.iterateAllLeaves((l) => this.decorateLeaf(l));
    });

    this.app.workspace.onLayoutReady(() => {
      if (
        this.settings.openOnStartup &&
        !this.app.workspace.getLeavesOfType(VIEW_TYPE).length
      ) {
        this.activateView();
      }
    });
  }

  // Add/remove entry for Obsidian's own menus (tab, ⋮ menu, editor right-click)
  addFavouriteMenuItem(menu, file) {
    if (!(file instanceof TFile) || file.extension !== "md" || this.isDataFile(file)) return;
    // The menu is built synchronously, so read the cached set
    const fav = this.favPaths.has(file.path);
    menu.addItem((item) =>
      item
        .setTitle(fav ? "Remove from homepage favourites" : "Add to homepage favourites")
        .setIcon("star")
        .onClick(() => this.toggleFavourite(file)),
    );
  }

  // A ★ button in each note's header: toggles the favourite, lit when it is one
  decorateLeaf(leaf) {
    const view = leaf?.view;
    if (!(view instanceof MarkdownView) || this.stars.has(view)) return;
    const el = view.addAction("star", "Add or remove from homepage favourites", () => {
      if (view.file && !this.isDataFile(view.file)) this.toggleFavourite(view.file);
    });
    el.addClass("hp-fav-star");
    this.stars.set(view, el);
    this.updateStars();
  }

  updateStars() {
    for (const [view, el] of this.stars ?? []) {
      if (!view.containerEl?.isConnected) {
        el.remove();
        this.stars.delete(view);
        continue;
      }
      const f = view.file;
      const on = !!f && this.favPaths.has(f.path);
      el.toggleClass("is-active", on);
      el.setAttribute("aria-label", on ? "Remove from homepage favourites" : "Add to homepage favourites");
    }
  }

  onunload() {
    for (const el of this.stars?.values() ?? []) el.remove();
    this.stars?.clear();
    clearTimeout(this.favCacheTimer);
  }

  async loadSettings() {
    const saved = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
    // Before ring modes existed, a custom note path meant "a note I choose"
    if (!saved?.ringMode) {
      const custom = saved?.ringNotesFile && saved.ringNotesFile !== RING_MAIN_NOTE;
      this.settings.ringMode = custom ? "chosen" : "main";
    }
  }

  // ── Favourites (stored in <dataFolder>/Favourites.md) ──

  get favPath() {
    return joinPath(this.settings.dataFolder, "Favourites.md");
  }

  isDataFile(f) {
    const dir = (this.settings.dataFolder || "").replace(/^\/+|\/+$/g, "");
    return !!dir && f.path.startsWith(`${dir}/`);
  }

  async readFavourites() {
    const f = this.app.vault.getAbstractFileByPath(this.favPath);
    if (!(f instanceof TFile)) return [];
    return parseFavourites(await this.app.vault.read(f));
  }

  favouriteFile(fav) {
    return this.app.metadataCache.getFirstLinkpathDest(fav.target.split("#")[0], "");
  }

  // Cached set of favourite file paths, for the synchronous right-click menu
  async refreshFavCache() {
    const favs = await this.readFavourites();
    this.favPaths = new Set(favs.map((f) => this.favouriteFile(f)?.path).filter(Boolean));
    this.updateStars();
  }

  scheduleFavCache() {
    clearTimeout(this.favCacheTimer);
    this.favCacheTimer = setTimeout(() => this.refreshFavCache(), 300);
  }

  async isFavourite(file) {
    return (await this.readFavourites()).some((f) => this.favouriteFile(f)?.path === file.path);
  }

  async addFavourite(file) {
    try {
      if (await this.isFavourite(file)) {
        new Notice(`${file.basename} is already a favourite`);
        return;
      }
      const link = this.app.metadataCache.fileToLinktext(file, "", true);
      const f = await ensureFileIn(this.app, this.favPath);
      await this.app.vault.process(f, (t) => `${t}${t && !t.endsWith("\n") ? "\n" : ""}- [[${link}]]\n`);
      new Notice(`Added ${file.basename} to favourites`);
    } catch (err) {
      new Notice(`Could not add favourite: ${err.message}`);
    }
  }

  async removeFavourite(target) {
    const f = this.app.vault.getAbstractFileByPath(this.favPath);
    if (!(f instanceof TFile)) return;
    let removed = false;
    await this.app.vault.process(f, (text) =>
      text
        .split("\n")
        .filter((line) => {
          const m = !removed && line.match(FAV_RE);
          if (m && m[1].trim() === target) {
            removed = true;
            return false;
          }
          return true;
        })
        .join("\n"),
    );
  }

  async toggleFavourite(file) {
    if (!(await this.isFavourite(file))) return this.addFavourite(file);
    const fav = (await this.readFavourites()).find((x) => this.favouriteFile(x)?.path === file.path);
    await this.removeFavourite(fav.target);
    new Notice(`Removed ${file.basename} from favourites`);
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = workspace.getLeaf("tab");
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    workspace.revealLeaf(leaf);
  }

  refreshViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      leaf.view.refreshAll?.(false);
    }
  }
};
