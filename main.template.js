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
  Scope,
  Menu,
} = obsidian;

const VIEW_TYPE = "genkan-view";
const RING_MAIN_NOTE = "Pebble Index.md"; // the ring app's "one main note" target

/*__ICONS__*/

/*__QUOTES__*/

/*__I18N__*/

const DEFAULT_QUICK_LINKS = [
  { icon: "📝", label: "New Note", action: "command:file-explorer:new-file" },
  { icon: "📅", label: "Today's Note", action: "daily" },
  { icon: "🔍", label: "Search Vault", action: "command:global-search:open" },
  { icon: "🕸️", label: "Graph View", action: "command:graph:open" },
  { icon: "🎲", label: "Random Note", action: "random" },
];

// ─── Language and locale ──────────────────────────────────────────────────────
// The interface language follows Obsidian's own language setting (or the plugin's Language
// setting). Dates, times and the first day of the week follow the matching region from the
// device. English spelling is British unless the region is American ("favourites" -> "favorites").

const LANGUAGES = { en: "English", fr: "Français", es: "Español", de: "Deutsch", ja: "日本語" };

let LANG = "en";
let LOCALE = "en-US";
let US_DETECTED = false; // an unknown or invalid locale keeps British spelling
let spellingChoice = "auto"; // auto | us | uk (the setting)

function obsidianLanguage() {
  try {
    if (typeof obsidian.getLanguage === "function") return obsidian.getLanguage();
  } catch {
    // older Obsidian
  }
  try {
    return moment.locale();
  } catch {
    return "en";
  }
}

// Obsidian's Electron shell reports en-US in navigator.language for any English region it has
// no translation for (Canada, say) and lists the OS preferences after it in navigator.languages.
function deviceLocaleFor(lang) {
  const list = [...(navigator.languages || []), navigator.language].filter(Boolean);
  const first = navigator.language || "";
  if (lang === "en") {
    if (/^en-US$/i.test(first)) {
      const other = list.find((l) => /^en-[A-Za-z]{2}$/.test(l) && !/^en-US$/i.test(l));
      if (other) return other;
    }
    return list.find((l) => /^en(-|$)/i.test(l)) || "en";
  }
  return list.find((l) => new RegExp(`^${lang}-`, "i").test(l)) || lang;
}

function applyLanguage(choice) {
  const wanted = !choice || choice === "auto" ? obsidianLanguage() : choice;
  const base = String(wanted || "en").toLowerCase().split(/[-_]/)[0];
  LANG = LANGUAGES[base] ? base : "en";
  LOCALE = "en-US";
  US_DETECTED = false;
  try {
    const l = deviceLocaleFor(LANG);
    new Intl.DateTimeFormat(l);
    LOCALE = l;
    US_DETECTED = LANG === "en" && /^en-(US|PR|GU|VI|AS|MP)\b/i.test(l);
  } catch {
    // keep the defaults
  }
}

// Source strings are written in British English; this converts them for American English
function S(text) {
  const us = spellingChoice === "us" || (spellingChoice === "auto" && US_DETECTED);
  return us ? text.replace(/favourite/g, "favorite").replace(/Favourite/g, "Favorite").replace(/centre/g, "center").replace(/Centre/g, "Center").replace(/colour/g, "color").replace(/Colour/g, "Color") : text;
}

// Translate a source string. Tables are keyed by the English text; {name} marks a value.
function T(key, vars) {
  let out = (LANG !== "en" && I18N[LANG]?.[key]) || I18N.en?.[key] || key;
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return LANG === "en" ? S(out) : out;
}

// Fill {name} slots in a translated sentence with DOM nodes (links), keeping the word order
function appendTemplate(parent, template, nodes) {
  for (const part of template.split(/(\{\w+\})/)) {
    const key = part.slice(1, -1);
    if (part.startsWith("{") && nodes[key]) parent.append(nodes[key]);
    else if (part) parent.append(part);
  }
}

// AM/PM in the current language ("午前" in Japanese); English keeps AM and PM
function dayPeriod(date) {
  if (LANG === "en") return date.getHours() < 12 ? "AM" : "PM";
  const part = new Intl.DateTimeFormat(LOCALE, { hour: "numeric", hour12: true })
    .formatToParts(date)
    .find((p) => p.type === "dayPeriod");
  return part ? part.value : date.getHours() < 12 ? "AM" : "PM";
}

function locale12h() {
  return !!new Intl.DateTimeFormat(LOCALE, { hour: "numeric" }).resolvedOptions().hour12;
}

// Regions whose week starts on Sunday, for engines without Intl.Locale week info
const SUNDAY_REGIONS = new Set(["US", "CA", "MX", "BR", "JP", "IL", "KR", "PH", "TW", "TH", "ZA", "IN", "PR", "SG", "HK"]);

// 0 = Sunday ... 6 = Saturday
function localeWeekStart() {
  try {
    const loc = new Intl.Locale(LOCALE);
    const info = typeof loc.getWeekInfo === "function" ? loc.getWeekInfo() : loc.weekInfo;
    if (info && info.firstDay) return info.firstDay % 7;
    const region = loc.maximize().region;
    return SUNDAY_REGIONS.has(region) ? 0 : 1;
  } catch {
    return 0;
  }
}

function fmtNum(n) {
  return Number(n).toLocaleString(LOCALE);
}

const DEFAULT_SETTINGS = {
  userName: "",
  sharedLayout: null, // a card layout pushed to all devices: { layout, version } (see "Use on all my devices")
  clipsFolder: "Clippings",
  dailyNotesFolder: "", // blank = use the Daily Notes / Periodic Notes setting
  dataFolder: "genkan/data", // where Tasks.md and Quick Note.md live
  maxClips: 12,
  maxRecent: 8,
  theme: "system", // system | dark | light
  language: "auto", // auto (follow Obsidian) | en | fr | es | de | ja
  spelling: "auto", // auto | us | uk
  weekStart: "auto", // auto | 0 (Sunday) | 1 (Monday) | 6 (Saturday)
  clockFont: "default", // see CLOCK_FONTS
  clockFontCustom: "", // font name(s) typed in settings when clockFont is "custom"
  showHero: true,
  showQuote: true, // a daily quote
  quoteSource: undefined, // zenquotes | echoes | bundled (unset: ZenQuotes in English, else bundled)
  showFavicons: true, // site icons on web clips (Google's favicon service)
  showRingNotes: false, // Pebble Index ring notes card (off unless enabled)
  showOnThisDay: false, // notes from this date a week, a month and a year ago (off unless enabled)
  showTimerStatus: true, // the running timer in the status bar (desktop; needs the Time tracker)
  showTimeTracker: false, // projects, tasks and timers (off unless enabled); the time lives in its own note
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
    LOCALE,
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

// ─── Quick note formatting ────────────────────────────────────────────────────
// Pure text edits for the toolbar and shortcuts. formatEdit(text, start, end, action) says
// what to replace ({ from, to, insert }) and where the selection goes afterwards.
// Underline has no markdown form, so it is written as <u>…</u>, which Obsidian renders.

const WRAPS = { bold: ["**", "**"], italic: ["*", "*"], underline: ["<u>", "</u>"], strike: ["~~", "~~"] };
const WORD_CHAR = /[\p{L}\p{N}_]/u;

function formatEdit(text, start, end, action) {
  if (WRAPS[action]) return wrapEdit(text, start, end, WRAPS[action][0], WRAPS[action][1]);
  if (action === "link") return linkEdit(text, start, end);
  if (action === "bullet" || action === "numbered" || action === "heading") return lineEdit(text, start, end, action);
  return null;
}

// A lone * is italic; ** belongs to bold, so italic must not treat it as its own marker
function isSingleStar(open, text, a, b) {
  return open !== "*" || (text[a - 2] !== "*" && text[b + 1] !== "*");
}

function wrapEdit(text, s, e, open, close) {
  if (s === e) {
    // No selection: format the word at the caret
    while (s > 0 && WORD_CHAR.test(text[s - 1])) s--;
    while (e < text.length && WORD_CHAR.test(text[e])) e++;
    if (s === e) {
      const at = s;
      return { from: at, to: at, insert: open + close, selStart: at + open.length, selEnd: at + open.length };
    }
  }
  const sel = text.slice(s, e);
  if (sel.includes("\n")) {
    // Markers cannot span lines in markdown, so format each line on its own
    const lines = sel.split("\n");
    const filled = lines.filter((l) => l.trim());
    const wrapped = (l) => l.trim().startsWith(open) && l.trim().endsWith(close) && l.trim().length > open.length + close.length;
    const allWrapped = filled.length > 0 && filled.every(wrapped);
    const out = lines.map((l) => {
      if (!l.trim()) return l;
      const lead = l.length - l.trimStart().length;
      const trail = l.length - l.trimEnd().length;
      const core = l.trim();
      const next = allWrapped ? core.slice(open.length, core.length - close.length) : wrapped(core) ? core : open + core + close;
      return l.slice(0, lead) + next + l.slice(l.length - trail);
    });
    const insert = out.join("\n");
    return { from: s, to: e, insert, selStart: s, selEnd: s + insert.length };
  }
  // Keep leading/trailing spaces outside the markers (markdown needs the marker beside the text)
  const lead = sel.length - sel.trimStart().length;
  const trail = sel.length - sel.trimEnd().length;
  const a = s + lead;
  const b = e - trail;
  if (a >= b) return { from: s, to: e, insert: open + sel + close, selStart: s + open.length, selEnd: s + open.length + sel.length };
  const inner = text.slice(a, b);
  // Markers just outside the selection: remove them
  if (text.slice(a - open.length, a) === open && text.slice(b, b + close.length) === close && isSingleStar(open, text, a, b)) {
    const from = a - open.length;
    return { from, to: b + close.length, insert: inner, selStart: from, selEnd: from + inner.length };
  }
  // Markers inside the selection: remove them
  if (
    inner.length >= open.length + close.length &&
    inner.startsWith(open) &&
    inner.endsWith(close) &&
    (open !== "*" || (inner[1] !== "*" && inner[inner.length - 2] !== "*"))
  ) {
    const plain = inner.slice(open.length, inner.length - close.length);
    return { from: a, to: b, insert: plain, selStart: a, selEnd: a + plain.length };
  }
  const selStart = a + open.length;
  return { from: a, to: b, insert: open + inner + close, selStart, selEnd: selStart + inner.length };
}

function linkEdit(text, s, e) {
  const sel = text.slice(s, e);
  if (/^https?:\/\/\S+$/.test(sel)) {
    // A pasted address: leave the cursor in the brackets to type the label
    return { from: s, to: e, insert: `[](${sel})`, selStart: s + 1, selEnd: s + 1 };
  }
  if (!sel) return { from: s, to: e, insert: "[](url)", selStart: s + 1, selEnd: s + 1 };
  const urlStart = s + sel.length + 3;
  return { from: s, to: e, insert: `[${sel}](url)`, selStart: urlStart, selEnd: urlStart + 3 };
}

// Bullets, numbering and headings apply to every line the selection touches
function lineEdit(text, s, e, action) {
  const from = s === 0 ? 0 : text.lastIndexOf("\n", s - 1) + 1;
  const last = e > s && text[e - 1] === "\n" ? e - 1 : e;
  const nl = text.indexOf("\n", last);
  const to = nl === -1 ? text.length : nl;
  const lines = text.slice(from, to).split("\n");
  // Blank lines and horizontal rules (---) are left alone
  let on = lines.map((l) => l.trim() !== "" && l !== "---");
  if (!on.some(Boolean)) {
    if (lines.length !== 1 || lines[0].trim() !== "") return null; // only rules: nothing to do
    on = [true]; // a lone blank line still gets its marker
  }
  const indent = (l) => l.match(/^\s*/)[0];
  const stripList = (l) => l.replace(/^(\s*)(?:[-*+]|\d+\.)\s+/, "$1");
  const stripHead = (l) => l.replace(/^(\s*)#{1,6}\s+/, "$1");
  let out;
  if (action === "bullet") {
    const all = lines.every((l, i) => !on[i] || /^\s*[-*+]\s+/.test(l));
    out = lines.map((l, i) => (!on[i] ? l : all ? stripList(l) : `${indent(l)}- ${stripList(stripHead(l)).trimStart()}`));
  } else if (action === "numbered") {
    const all = lines.every((l, i) => !on[i] || /^\s*\d+\.\s+/.test(l));
    let n = 0;
    out = lines.map((l, i) => (!on[i] ? l : all ? stripList(l) : `${indent(l)}${++n}. ${stripList(stripHead(l)).trimStart()}`));
  } else {
    // heading: none -> # -> ## -> ### -> none, based on the first line
    const m = lines[on.indexOf(true)].match(/^\s*(#{1,6})\s/);
    const level = m ? m[1].length : 0;
    const next = level >= 3 ? 0 : level + 1;
    out = lines.map((l, i) => (!on[i] ? l : `${indent(l)}${next ? "#".repeat(next) + " " : ""}${stripHead(l).trimStart()}`));
  }
  const insert = out.join("\n");
  if (s !== e) return { from, to, insert, selStart: from, selEnd: from + insert.length };
  const caret = Math.min(from + out[0].length, Math.max(from, s + (out[0].length - lines[0].length)));
  return { from, to, insert, selStart: caret, selEnd: caret };
}

// ─── Quick note rich editor ───────────────────────────────────────────────────
// The note file stays plain markdown. These convert between markdown and the editor's DOM for
// the subset the toolbar writes: **bold**, *italic*, <u>underline</u>, ~~strike~~, [links](url),
// "# " headings, "- " bullets and "1. " numbering. Every other line is kept as literal text, and
// noteRoundTrips() lets the editor refuse any note it could not write back unchanged.

const SAFE_HREF = /^(https?:\/\/|mailto:|obsidian:\/\/)\S+$/i;
const NOT_SPACE = (ch) => ch !== undefined && !/\s/.test(ch);

function markdownToInline(s) {
  const frag = document.createDocumentFragment();
  let buf = "";
  const flush = () => {
    if (buf) {
      frag.append(buf);
      buf = "";
    }
  };
  const wrap = (tag, inner, attrs) => {
    flush();
    const el = document.createElement(tag);
    if (attrs) for (const k of Object.keys(attrs)) el.setAttribute(k, attrs[k]);
    el.append(markdownToInline(inner));
    frag.append(el);
  };
  let i = 0;
  while (i < s.length) {
    const two = s.substr(i, 2);
    if (two === "**" || two === "~~") {
      const j = s.indexOf(two, i + 2);
      if (j > i + 2 && NOT_SPACE(s[i + 2]) && NOT_SPACE(s[j - 1])) {
        wrap(two === "**" ? "strong" : "s", s.slice(i + 2, j));
        i = j + 2;
        continue;
      }
    } else if (s[i] === "*" && NOT_SPACE(s[i + 1]) && s[i + 1] !== "*") {
      let j = i + 1;
      while ((j = s.indexOf("*", j)) !== -1) {
        if (s[j + 1] === "*") {
          j += 2;
          continue;
        }
        if (NOT_SPACE(s[j - 1])) break;
        j++;
      }
      if (j !== -1) {
        wrap("em", s.slice(i + 1, j));
        i = j + 1;
        continue;
      }
    } else if (s.startsWith("<u>", i)) {
      const j = s.indexOf("</u>", i + 3);
      if (j > i + 3) {
        wrap("u", s.slice(i + 3, j));
        i = j + 4;
        continue;
      }
    } else if (s[i] === "[") {
      const m = /^\[([^\]\n]+)\]\(([^)\s]+)\)/.exec(s.slice(i));
      if (m && SAFE_HREF.test(m[2])) {
        wrap("a", m[1], { href: m[2] });
        i += m[0].length;
        continue;
      }
    }
    buf += s[i++];
  }
  flush();
  return frag;
}

// One block per line, so the editor and the file always agree on where lines are
function markdownToBlocks(md) {
  const frag = document.createDocumentFragment();
  let list = null; // the open <ul>/<ol>
  let n = 0; // last number in the open <ol>
  const line = (tag, text) => {
    const el = document.createElement(tag);
    el.append(markdownToInline(text));
    if (!text) el.append(document.createElement("br"));
    return el;
  };
  for (const raw of md.split("\n")) {
    if (raw === "---") {
      list = null;
      frag.append(document.createElement("hr"));
      continue;
    }
    let m = /^(#{1,6}) (.*)$/.exec(raw);
    if (m) {
      list = null;
      const heading = line(`h${m[1].length}`, m[2]);
      // Inside a card whose title is an h2, a note's own headings start at level 3
      heading.setAttribute("aria-level", String(Math.min(6, m[1].length + 2)));
      frag.append(heading);
      continue;
    }
    m = /^- (.*)$/.exec(raw);
    if (m) {
      if (!list || list.kind !== "ul") {
        list = { kind: "ul", el: document.createElement("ul") };
        frag.append(list.el);
      }
      list.el.append(line("li", m[1]));
      continue;
    }
    m = /^(\d+)\. (.*)$/.exec(raw);
    if (m) {
      // Only a list that counts 1, 2, 3 is rebuilt as one; anything else stays literal text
      const expected = list && list.kind === "ol" ? n + 1 : 1;
      if (m[1] === String(expected)) {
        if (!list || list.kind !== "ol") {
          list = { kind: "ol", el: document.createElement("ol") };
          frag.append(list.el);
        }
        n = expected;
        list.el.append(line("li", m[2]));
        continue;
      }
    }
    list = null;
    frag.append(line("div", raw));
  }
  return frag;
}

const BLOCK_TAGS = new Set(["DIV", "P", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "LI", "BLOCKQUOTE", "PRE", "HR"]);

// Wrap an element's text in the markdown for its styling (b, i, u, s, links, styled spans)
function styledToMarkdown(el, inner) {
  const tag = el.tagName;
  let bold = tag === "B" || tag === "STRONG";
  let italic = tag === "I" || tag === "EM";
  let under = tag === "U";
  let strike = tag === "S" || tag === "STRIKE" || tag === "DEL";
  if (tag === "SPAN" || tag === "FONT") {
    const st = el.style;
    bold = st.fontWeight === "bold" || Number(st.fontWeight) >= 600;
    italic = st.fontStyle === "italic";
    const deco = st.textDecorationLine || st.textDecoration || "";
    under = deco.includes("underline");
    strike = deco.includes("line-through");
  }
  let out = inner;
  // Markers go against the text, with any spaces outside them, and never span a line break
  const mark = (open, close) =>
    out
      .split("\n")
      .map((l) => {
        const core = l.trim();
        if (!core) return l;
        return l.slice(0, l.length - l.trimStart().length) + open + core + close + l.slice(l.trimEnd().length);
      })
      .join("\n");
  if (strike) out = mark("~~", "~~");
  if (under) out = mark("<u>", "</u>");
  if (italic) out = mark("*", "*");
  if (bold) out = mark("**", "**");
  if (tag === "A") {
    const href = el.getAttribute("href");
    if (href && out.trim()) out = `[${out}](${href})`;
  }
  return out;
}

function inlineToMarkdown(nodes) {
  let out = "";
  for (const c of nodes) {
    if (c.nodeType === 3) {
      out += c.nodeValue.replace(/ /g, " ").replace(/​/g, "");
    } else if (c.nodeType === 1) {
      out += c.tagName === "BR" ? "\n" : styledToMarkdown(c, inlineToMarkdown(c.childNodes));
    }
  }
  return out;
}

// Read the editor back into markdown, whatever structure the browser built while typing
function noteToMarkdown(root) {
  const lines = [];
  const pushLines = (text) => {
    for (const l of text.split("\n")) lines.push(l);
  };
  // A trailing <br> is the browser's placeholder for an empty line, not a line break. It can sit
  // inside styling too: Enter after bold text leaves <div><b><br></b></div>.
  const textOf = (nodes) => {
    const list = Array.from(nodes);
    const t = inlineToMarkdown(list);
    let leaf = list[list.length - 1];
    while (leaf && leaf.lastChild) leaf = leaf.lastChild;
    return leaf && leaf.nodeName === "BR" && t.endsWith("\n") ? t.slice(0, -1) : t;
  };
  const listItem = (li, marker, indent) => {
    const inline = [];
    const nested = [];
    for (const ch of li.childNodes) (ch.nodeType === 1 && (ch.tagName === "UL" || ch.tagName === "OL") ? nested : inline).push(ch);
    lines.push(indent + marker + textOf(inline).replace(/\n/g, " "));
    for (const sub of nested) {
      let k = 0;
      for (const subLi of sub.children) listItem(subLi, sub.tagName === "OL" ? `${++k}. ` : "- ", indent + "  ");
    }
  };
  let run = [];
  const flushRun = () => {
    if (run.length) pushLines(textOf(run));
    run = [];
  };
  const block = (el) => {
    const tag = el.tagName;
    if (tag === "HR") {
      lines.push("---");
    } else if (/^H[1-6]$/.test(tag)) {
      lines.push(`${"#".repeat(Number(tag[1]))} ${textOf(el.childNodes).replace(/\n/g, " ")}`);
    } else if (tag === "UL" || tag === "OL") {
      let k = 0;
      for (const li of el.children) listItem(li, tag === "OL" ? `${++k}. ` : "- ", "");
    } else if (tag === "LI") {
      listItem(el, "- ", "");
    } else if (Array.from(el.children).some((ch) => BLOCK_TAGS.has(ch.tagName))) {
      walk(el);
    } else {
      pushLines(textOf(el.childNodes));
    }
  };
  const walk = (parent) => {
    for (const c of parent.childNodes) {
      if (c.nodeType === 1 && BLOCK_TAGS.has(c.tagName)) {
        flushRun();
        block(c);
      } else {
        run.push(c);
      }
    }
    flushRun();
  };
  walk(root);
  return lines.join("\n");
}

// True when the editor can show this note and write it back byte for byte
function noteRoundTrips(md) {
  const probe = document.createElement("div");
  probe.append(markdownToBlocks(md));
  return noteToMarkdown(probe) === md;
}

// ─── Quick notes: seven of them, like Tot ─────────────────────────────────────
// Note 1 is the original "Quick Note.md"; the rest are "Quick Note 2.md" … "Quick Note 7.md".

const NOTE_COUNT = 7;

// Plain text of a note's markdown, for the footer counts
function notePlainText(md) {
  return md
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => {
      if (line === "---") return "";
      return line
        .replace(/^#{1,6} /, "")
        .replace(/^- /, "")
        .replace(/^\d+\. /, "")
        .replace(/\[([^\]\n]+)\]\([^)\s]+\)/g, "$1")
        .replace(/<\/?u>/g, "")
        .replace(/\*\*|~~/g, "")
        .replace(/\*(\S(?:[^*]*\S)?)\*/g, "$1");
    })
    .join("\n");
}

function noteStats(md) {
  const text = notePlainText(md);
  const lines = text === "" ? 0 : text.replace(/\n$/, "").split("\n").length;
  const chars = text.replace(/\n/g, "").length;
  let words = 0;
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    for (const part of new Intl.Segmenter(LOCALE, { granularity: "word" }).segment(text)) if (part.isWordLike) words++;
  } else {
    words = (text.match(/\S+/g) || []).length;
  }
  return { lines, words, chars };
}

function plural(n, one, other) {
  try {
    return T(new Intl.PluralRules(LOCALE).select(n) === "one" ? one : other, { n: fmtNum(n) });
  } catch {
    return T(n === 1 ? one : other, { n: fmtNum(n) });
  }
}

// "Just now", "5 min. ago", "yesterday", then a date
function savedAgo(ms) {
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 1) return T("Just now");
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto", style: "short" });
  if (mins < 60) return rtf.format(-mins, "minute");
  const hours = Math.floor(mins / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 30) return rtf.format(-days, "day");
  return fmtDate(new Date(ms), { month: "short", day: "numeric", year: "numeric" });
}

// ─── On this day ──────────────────────────────────────────────────────────────
// Notes from today's date a week, a month and a year ago. A note belongs to a day by its
// created/clipped/date property, else by a date in its name (daily notes), else by the file's
// own created time, which is ignored on days when a flood of files share it (an import or a
// first sync stamps hundreds of notes with one day).

const FLOOD = 20;
const DAY_RE = /(\d{4})-(\d{2})-(\d{2})/;
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function onThisDayDates(today) {
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  // a 31st or 29 February lands on the last day that exists in the earlier month or year
  const clamp = (yy, mm) => new Date(yy, mm, Math.min(d, new Date(yy, mm + 1, 0).getDate()));
  return [
    { key: "week", date: new Date(y, m, d - 7) },
    { key: "month", date: clamp(m === 0 ? y - 1 : y, (m + 11) % 12) },
    { key: "year", date: clamp(y - 1, m) },
  ];
}

function noteDay(file, fm) {
  for (const k of ["created", "clipped", "date"]) {
    const m = fm && fmString(fm[k]).match(DAY_RE);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  const m = file.basename.match(DAY_RE);
  return m ? m[0] : null;
}

// The first line of text, without markdown markers, for a one-line preview (a first line that
// only repeats the note's title is skipped)
function noteExcerpt(text, title) {
  for (const raw of text.slice(bodyStart(text)).split("\n")) {
    const line = raw
      .replace(/^#{1,6}\s+/, "")
      .replace(/^\s*(?:[-*+]|\d+\.)\s+(?:\[[ xX]\]\s+)?/, "")
      .replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/<\/?u>|[*_~`]/g, "")
      .trim();
    if (line && line !== "---" && line.toLowerCase() !== (title || "").toLowerCase()) return line.slice(0, 160);
  }
  return "";
}

// A safe file name for an exported note: its first line of text, or "Quick Note N"
// Save a file: the browser's save dialog where it works (it remembers the folder you used last), else
// the share sheet, else a copy in the vault. Node's file and shell access are deliberately not used.
// Returns quietly when you close the dialog; throws only when nothing worked.
async function saveExportFile(app, name, data, mime, label) {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const ext = name.slice(name.lastIndexOf(".") + 1);
  if (typeof window.showSaveFilePicker === "function") {
    try {
      const handle = await window.showSaveFilePicker({ id: "genkan-export", suggestedName: name, types: [{ description: label, accept: { [mime]: [`.${ext}`] } }] });
      const out = await handle.createWritable();
      await out.write(bytes);
      await out.close();
      new Notice(T("Exported to {path}", { path: handle.name }));
      return;
    } catch (err) {
      if (err && err.name === "AbortError") return; // the dialog was closed
      console.warn("Genkan: the save dialog is not available here, trying another way", err);
    }
  }
  // Phones and tablets: the share sheet lets you pick Files, Mail and so on
  try {
    const file = new File([bytes], name, { type: mime });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] });
      return;
    }
  } catch (err) {
    if (err && err.name === "AbortError") return; // the share sheet was closed
  }
  // Last resort: a copy in the vault, under a name that is not taken
  let target = name;
  for (let n = 2; app.vault.getAbstractFileByPath(normalizePath(target)); n++) target = name.replace(/(\.\w+)$/, ` ${n}$1`);
  await app.vault.createBinary(normalizePath(target), bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  new Notice(T("Saved a copy in your vault as {name}", { name: target }));
}

function exportFileName(md, index) {
  const title = noteExcerpt(md, "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .slice(0, 60)
    .trim();
  return `${title || `Quick Note ${index === 1 ? "" : index}`.trim()}.md`;
}

// ─── Arranging cards ──────────────────────────────────────────────────────────
// The dashboard's cards live in four zones: a full-width row on top and three columns. A layout is
// the list of card ids in each zone; it is saved per device and always repaired against this list.
const ARRANGE_ZONES = ["top", "left", "center", "right"];
const DEFAULT_LAYOUT = {
  top: ["favs-card"],
  left: ["calendar-card", "links-card"],
  center: ["ring-card", "clips-card", "recent-card", "otd-card", "tt-card"],
  right: ["tasks-card", "note-card"],
};
const CARD_NAMES = {
  "favs-card": "Favourites",
  "calendar-card": "Calendar",
  "links-card": "Quick links",
  "ring-card": "Ring notes",
  "clips-card": "Web clips",
  "recent-card": "Recent notes",
  "otd-card": "On this day",
  "tt-card": "Time tracker",
  "tasks-card": "Tasks",
  "note-card": "Quick notes",
};

// Drop unknown, duplicate and malformed entries, and put missing cards back in their default zone
function normaliseLayout(saved) {
  const known = new Set(Object.values(DEFAULT_LAYOUT).flat());
  const out = { top: [], left: [], center: [], right: [] };
  const seen = new Set();
  if (saved && typeof saved === "object") {
    for (const z of ARRANGE_ZONES) {
      if (!Array.isArray(saved[z])) continue;
      for (const id of saved[z]) {
        if (known.has(id) && !seen.has(id)) {
          seen.add(id);
          out[z].push(id);
        }
      }
    }
  }
  for (const z of ARRANGE_ZONES) {
    for (const id of DEFAULT_LAYOUT[z]) {
      if (!seen.has(id)) {
        seen.add(id);
        out[z].push(id);
      }
    }
  }
  return out;
}

function layoutsEqual(a, b) {
  return ARRANGE_ZONES.every((z) => (a[z] || []).join("|") === (b[z] || []).join("|"));
}

// One step for a card: up/down within its zone (past the end it crosses to the top row or the
// first column), left/right between the columns. Returns a new layout, or null when it can't move.
// Hidden cards (a switched-off card) are skipped over so a step always shows.
function moveInLayout(layout, id, dir, isVisible = () => true) {
  const next = {};
  for (const z of ARRANGE_ZONES) next[z] = layout[z].slice();
  const zone = ARRANGE_ZONES.find((z) => next[z].includes(id));
  if (!zone) return null;
  const list = next[zone];
  const i = list.indexOf(id);
  if (dir === "up") {
    let j = i - 1;
    while (j >= 0 && !isVisible(list[j])) j--;
    if (j >= 0) {
      list.splice(i, 1);
      list.splice(j, 0, id);
      return next;
    }
    if (zone === "top") return null;
    list.splice(i, 1);
    next.top.push(id);
    return next;
  }
  if (dir === "down") {
    let j = i + 1;
    while (j < list.length && !isVisible(list[j])) j++;
    if (j < list.length) {
      list.splice(i, 1);
      list.splice(j, 0, id);
      return next;
    }
    if (zone !== "top") return null;
    list.splice(i, 1);
    next.left.unshift(id);
    return next;
  }
  const cols = ["left", "center", "right"];
  const k = cols.indexOf(zone);
  const to = k < 0 ? null : cols[k + (dir === "left" ? -1 : 1)];
  if (!to) return null;
  list.splice(i, 1);
  next[to].splice(Math.min(i, next[to].length), 0, id);
  return next;
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
    this.setPlaceholder(T("Add a note to your homepage favourites…"));
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
  // The centre cards fold away: a -/+ button sits left of the title (see initCards)
  const cardTitle = (cardId, bodyId, label) =>
    h(
      "div",
      { cls: "card-title" },
      h("button", { type: "button", cls: "card-toggle", "data-card": cardId, "data-body": bodyId, "data-label": label, "aria-controls": bodyId, "aria-expanded": "true" }),
      h("h2", { cls: "card-label", id: `${cardId}-title`, text: label }),
    );
  const countRow = (countId, ...extra) =>
    h("div", { cls: "card-header-right" }, h("span", { cls: "badge", id: countId, text: "0" }), ...extra);

  const header = h(
    "header",
    { cls: "header" },
    h(
      "div",
      { cls: "header-top" },
      h("h1", { cls: "greeting", id: "greeting", text: "Hello" }),
      h(
        "div",
        { cls: "header-controls" },
        h("button", { cls: "icon-btn", id: "page-refresh", title: T("Refresh"), "aria-label": T("Refresh") }),
        h("button", { cls: "icon-btn", id: "theme-toggle", title: T("Toggle theme"), "aria-label": T("Toggle theme") }),
        h("button", { cls: "icon-btn", id: "arrange-btn", title: T("Arrange cards"), "aria-label": T("Arrange cards"), "aria-pressed": "false" }),
        h("button", { cls: "icon-btn", id: "settings-btn", title: T("Settings"), "aria-label": T("Open settings") }),
      ),
    ),
    h(
      "div",
      { cls: "clock-wrap" },
      h(
        "div",
        { cls: "clock", id: "clock" },
        h("span", { id: "clock-main", "aria-hidden": "true", text: "12:00" }),
        h("span", { id: "clock-sec", "aria-hidden": "true", text: ":00" }),
        " ",
        h("span", { id: "clock-ampm", "aria-hidden": "true", text: "AM" }),
        h("span", { cls: "sr-only", id: "clock-sr" }),
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
        h("input", { type: "search", id: "search-input", placeholder: T("Search your vault…"), spellcheck: "false", "aria-label": T("Search your vault") }),
        h("button", { type: "button", cls: "search-clear hidden", id: "search-clear", title: T("Clear search"), "aria-label": T("Clear search") }, iconNode("clear")),
        h("kbd", { cls: "search-kbd", id: "search-kbd", "aria-hidden": "true", text: "/" }),
      ),
      h("div", { cls: "search-results hidden", id: "search-results" }),
      h("div", { cls: "sr-only", id: "search-live", role: "status", "aria-live": "polite" }),
    ),
  );

  const hero = h(
    "div",
    { cls: "hero", id: "hero", role: "img", "aria-label": T("Photo of the day") },
    h("img", { cls: "hero-img", id: "hero-img", alt: T("Photo of the day") }),
    h("div", { cls: "hero-overlay", "aria-hidden": "true" }),
    h(
      "div",
      { cls: "hero-footer" },
      h("span", { cls: "hero-credit", id: "hero-credit" }),
      h("button", { cls: "icon-btn", id: "hero-refresh", title: T("Load a new photo"), "aria-label": T("Load new photo") }),
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
    // ZenQuotes' free API requires a visible credit linking back to zenquotes.io (built in displayQuote)
    h("div", { cls: "quote-credit hidden", id: "quote-credit" }),
  );

  const favs = h("section", { cls: "card favs-card", id: "favs-card", "aria-labelledby": "favs-card-title" },
    h("div", { cls: "card-header" }, h("h2", { cls: "card-label", id: "favs-card-title", text: T("Favourites") })),
    h("div", { cls: "favs-list", id: "favs-list" }),
  );

  const left = h(
    "div",
    { cls: "col col-left zone", "data-zone": "left" },
    h("section", { cls: "card", id: "calendar-card", "aria-labelledby": "calendar-card-title" },
      h(
        "div",
        { cls: "card-header" },
        h("h2", { cls: "card-label", id: "calendar-card-title", text: T("Calendar") }),
        h(
          "div",
          { cls: "cal-nav" },
          h("button", { cls: "cal-btn", id: "cal-prev", title: T("Previous month"), "aria-label": T("Previous month"), text: "‹" }),
          h("span", { id: "cal-month-label" }),
          h("button", { cls: "cal-btn", id: "cal-next", title: T("Next month"), "aria-label": T("Next month"), text: "›" }),
        ),
      ),
      h("div", { cls: "cal-grid", id: "cal-grid", role: "grid", "aria-label": T("Calendar"), "aria-describedby": "cal-hint" }),
      h("span", { cls: "sr-only", id: "cal-hint", text: T("Use the arrow keys to move between days.") }),
      h("button", { cls: "today-btn", id: "cal-today", text: T("Today") }),
    ),
    h("section", { cls: "card", id: "links-card", "aria-labelledby": "links-card-title" },
      h("div", { cls: "card-header" }, h("h2", { cls: "card-label", id: "links-card-title", text: T("Quick links") })),
      h("nav", { id: "quick-links", "aria-label": T("Quick links") }),
    ),
  );

  const center = h(
    "div",
    { cls: "col col-center zone", "data-zone": "center" },
    h("section", { cls: "card hidden", id: "ring-card", "aria-labelledby": "ring-card-title" },
      h(
        "div",
        { cls: "card-header" },
        cardTitle("ring-card", "ring-body", T("Ring notes")),
        countRow("ring-count", h("a", { cls: "card-link", id: "ring-open", href: "#", title: T("Open the notes file"), text: T("Open") })),
      ),
      h("div", { id: "ring-body" }),
    ),
    h("section", { cls: "card", id: "clips-card", "aria-labelledby": "clips-card-title" },
      h(
        "div",
        { cls: "card-header" },
        cardTitle("clips-card", "clips-body", T("Web clips")),
        countRow("clips-count", refreshBtn("refresh-clips", T("Refresh clips"), T("Refresh web clips"))),
      ),
      h("div", { id: "clips-body" }),
    ),
    h("section", { cls: "card", id: "recent-card", "aria-labelledby": "recent-card-title" },
      h(
        "div",
        { cls: "card-header" },
        cardTitle("recent-card", "recent-body", T("Recent notes")),
        countRow("recent-count", refreshBtn("refresh-recent", T("Refresh recent notes"), T("Refresh recent notes"))),
      ),
      h("div", { id: "recent-body" }),
    ),
    h("section", { cls: "card hidden", id: "otd-card", "aria-labelledby": "otd-card-title" },
      h("div", { cls: "card-header" }, cardTitle("otd-card", "otd-body", T("On this day")), countRow("otd-count")),
      h("div", { id: "otd-body" }),
    ),
    h("section", { cls: "card hidden", id: "tt-card", "aria-labelledby": "tt-card-title" },
      h("div", { cls: "card-header" }, cardTitle("tt-card", "tt-body", T("Time tracker"))),
      h("div", { id: "tt-body" }),
      h("div", { cls: "sr-only", id: "tt-live", role: "status", "aria-live": "polite" }),
    ),
  );

  // Formatting toolbar for the quick note (inserts markdown; see formatEdit)
  const modKey = Platform.isMacOS ? "⌘" : "Ctrl+";
  const shiftKey = Platform.isMacOS ? "⇧" : "Shift+";
  const fmtBtn = (action, label, shortcut, content) =>
    h(
      "button",
      {
        type: "button",
        cls: `fmt-btn fmt-${action}`,
        "data-fmt": action,
        title: shortcut ? `${label} (${modKey}${shortcut})` : label,
        "aria-label": label,
      },
      content,
    );
  const glyph = (t) => h("span", { cls: "fmt-glyph", text: t });
  const noteToolbar = h(
    "div",
    { cls: "note-toolbar", role: "toolbar", "aria-label": T("Formatting") },
    fmtBtn("bold", T("Bold"), "B", glyph("B")),
    fmtBtn("italic", T("Italic"), "I", glyph("I")),
    fmtBtn("underline", T("Underline"), "U", glyph("U")),
    fmtBtn("strike", T("Strikethrough"), `${shiftKey}X`, glyph("S")),
    fmtBtn("heading", T("Heading"), "", glyph("H")),
    fmtBtn("bullet", T("Bulleted list"), "", iconNode("list")),
    fmtBtn("numbered", T("Numbered list"), "", iconNode("list-ordered")),
    fmtBtn("link", T("Link"), "K", iconNode("link")),
    h("button", { type: "button", cls: "fmt-btn fmt-export", "data-export": "1", title: T("Export note as Markdown…"), "aria-label": T("Export note as Markdown…") }, iconNode("export")),
  );

  const tab = (filter, label, active) =>
    h("button", { cls: active ? "tab active" : "tab", "data-filter": filter, role: "tab", "aria-selected": active ? "true" : "false", text: label });
  const right = h(
    "div",
    { cls: "col col-right zone", "data-zone": "right" },
    h("section", { cls: "card", id: "tasks-card", "aria-labelledby": "tasks-card-title" },
      h(
        "div",
        { cls: "card-header" },
        h("h2", { cls: "card-label", id: "tasks-card-title", text: T("Tasks") }),
        h("span", { cls: "tasks-stats", id: "tasks-stats", "aria-live": "polite", text: "0 / 0" }),
      ),
      h("input", { type: "text", cls: "task-input", id: "task-input", placeholder: T("Add a task and press Enter…"), "aria-label": T("New task") }),
      h(
        "div",
        { cls: "tab-row", role: "tablist", "aria-label": T("Filter tasks") },
        tab("all", T("All"), true),
        tab("active", T("Active"), false),
        tab("done", T("Done"), false),
      ),
      h("div", { id: "tasks-list", role: "list" }),
      h("button", { cls: "clear-btn", id: "clear-done", text: T("Clear completed") }),
    ),
    h("section", { cls: "card", id: "note-card", "aria-labelledby": "note-card-title" },
      h(
        "div",
        { cls: "card-header" },
        h("h2", { cls: "card-label", id: "note-card-title", text: T("Quick notes") }),
        h("span", { cls: "autosave-dot", id: "autosave-dot", title: T("Saved"), "aria-label": T("Saved") }),
      ),
      h(
        "div",
        { cls: "note-tabs", id: "note-tabs", role: "tablist", "aria-label": T("Quick notes") },
        ...Array.from({ length: NOTE_COUNT }, (_, i) =>
          h(
            "button",
            {
              type: "button",
              cls: "note-dot",
              id: `note-tab-${i + 1}`,
              role: "tab",
              "data-note": String(i + 1),
              "aria-label": T("Note {n}, empty", { n: i + 1 }),
              "aria-controls": "note-panel",
              "aria-selected": "false",
              tabindex: "-1",
            },
            h("span", { cls: "note-dot-num", text: String(i + 1) }),
          ),
        ),
      ),
      h(
        "div",
        { id: "note-panel", role: "tabpanel", "aria-labelledby": "note-tab-1" },
        noteToolbar,
        h(
          "div",
          { cls: "note-link-row hidden" },
          h("input", { type: "text", id: "note-link-input", inputmode: "url", placeholder: "https://…", "aria-label": T("Link address"), autocomplete: "off", spellcheck: "false" }),
          h("button", { type: "button", cls: "fmt-text-btn", id: "note-link-apply", text: T("Apply") }),
          h("button", { type: "button", cls: "fmt-text-btn", id: "note-link-cancel", text: T("Cancel") }),
        ),
        h("div", {
          id: "quick-note-rich",
          cls: "note-editor is-empty",
          contenteditable: "true",
          role: "textbox",
          "aria-multiline": "true",
          "aria-label": T("Quick note {n}", { n: 1 }),
          "data-placeholder": T("Jot something down…"),
          spellcheck: "true",
        }),
        h("textarea", { id: "quick-note", cls: "hidden", placeholder: T("Jot something down…"), spellcheck: "true", "aria-label": T("Quick note {n}", { n: 1 }) }),
        h("div", { cls: "note-hint hidden", id: "note-hint", text: T("This note has formatting the editor can't show, so it appears as plain text.") }),
        h("div", { cls: "note-footer" }, h("span", { cls: "note-stats", id: "note-stats" }), h("span", { cls: "note-saved", id: "note-saved" })),
        h("div", { cls: "sr-only", id: "note-live", role: "status", "aria-live": "polite" }),
      ),
    ),
  );

  const banner = h(
    "div",
    { cls: "arrange-banner", id: "arrange-banner", hidden: "" },
    h(
      "div",
      { cls: "arrange-text" },
      h("span", { cls: "arrange-help", text: T("Drag a card by its handle, or use the arrow buttons. Press Done when you are finished.") }),
      h("span", { cls: "arrange-status", id: "arrange-status", role: "status", "aria-live": "polite" }),
    ),
    h("div", { cls: "arrange-actions" }, h("button", { type: "button", cls: "btn-secondary", id: "arrange-use-shared", hidden: "", text: T("Use the shared layout") }), h("button", { type: "button", cls: "btn-secondary", id: "arrange-push", text: T("Use on all my devices") }), h("button", { type: "button", cls: "btn-secondary", id: "arrange-reset", text: T("Reset layout") }), h("button", { type: "button", cls: "btn-secondary", id: "arrange-done", text: T("Done") })),
  );
  const topZone = h("div", { cls: "zone zone-top", "data-zone": "top" }, favs);
  // On phones and tablets there is no status bar, so a running timer shows here instead
  const running = h("div", { cls: "tt-running hidden", id: "tt-running", role: "region", "aria-label": T("Running timer") });
  return [h("div", { cls: "bg-glow" }), h("div", { id: "app" }, header, running, hero, quote, banner, topZone, h("main", { cls: "grid" }, left, center, right)), h("div", { cls: "sr-only", id: "arrange-live", role: "status", "aria-live": "polite" })];
}

/*__TIMETRACKER__*/

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
    this.noteIndex = 1; // which of the seven notes is showing
    this.noteHasText = Array(NOTE_COUNT).fill(false);
    this.noteMode = "rich"; // "plain" when the note holds markdown the rich editor cannot reproduce
    this.noteComposing = false; // an IME (Japanese, say) is mid-composition
    this.fixingIds = false;
    this.timers = {};
  }

  getViewType() {
    return VIEW_TYPE;
  }
  getDisplayText() {
    return T("Homepage");
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
  notePathFor(i) {
    return joinPath(this.settings.dataFolder, i === 1 ? "Quick Note.md" : `Quick Note ${i}.md`);
  }
  get notePath() {
    return this.notePathFor(this.noteIndex);
  }
  noteIndexOfPath(path) {
    for (let i = 1; i <= NOTE_COUNT; i++) if (path === this.notePathFor(i)) return i;
    return 0;
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

  // Builds the dashboard DOM and wires its elements. Called again when the language changes,
  // so nothing here may register listeners outside this.root.
  buildUi() {
    this.root?.remove();
    // The id lets our control resets win over Obsidian's button/input styles without !important
    this.root = this.contentEl.createDiv({ cls: "hp-root", attr: { id: "genkan-root", lang: LANG } });
    this.root.append(...buildDashboard());
    if (Platform.isMobile) this.$("search-kbd").classList.add("hidden");

    setIconSvg(this.$("settings-btn"), "settings");
    setIconSvg(this.$("arrange-btn"), "arrange");
    setIconSvg(this.$("page-refresh"), "refresh");
    setIconSvg(this.$("refresh-clips"), "refresh");
    setIconSvg(this.$("refresh-recent"), "refresh");
    setIconSvg(this.$("hero-refresh"), "refresh");

    this.$("settings-btn").addEventListener("click", () => {
      this.app.setting.open();
      this.app.setting.openTabById(this.plugin.manifest.id);
    });
    this.$("page-refresh").addEventListener("click", () => {
      this.plugin.time?.reload();
      this.refreshAll(true);
      this.syncSharedLayout(true);
    });
    this.$("refresh-clips").addEventListener("click", () => this.renderClips());
    this.$("refresh-recent").addEventListener("click", () => this.renderRecent());
    this.$("hero-refresh").addEventListener("click", () => this.loadHero(true));
    // The cards already update live, so a refresh changes nothing you can see: spin the icon instead
    for (const id of ["page-refresh", "refresh-clips", "refresh-recent", "hero-refresh"]) {
      const btn = this.$(id);
      btn.addEventListener("click", () => {
        btn.classList.remove("spinning");
        void btn.offsetWidth; // restart the animation on a quick second click
        btn.classList.add("spinning");
        window.setTimeout(() => btn.classList.remove("spinning"), 700);
      });
    }

    this.initTheme();
    this.initCalendar();
    this.initTasks();
    this.initNote();
    this.initLinks();
    this.initSearch();
    this.initCards();
    this.initArrange();
    this.tt?.destroy();
    this.tt = new TimeTrackerUI(this);
  }

  // Labels are built once, so a language change rebuilds the dashboard in place
  rebuild() {
    this.greetKey = null;
    this.buildUi();
    this.applyClockFont();
    this.refreshAll(false);
  }

  async onOpen() {
    this.contentEl.addClass("hp-view");
    this.buildUi();

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
      this.$("search-input")?.focus();
    });

    this.registerDomEvent(document, "selectionchange", () => this.updateFormatState());
    // Coming back to Obsidian is when a layout pushed from another device has usually just synced
    this.registerDomEvent(window, "focus", () => this.syncSharedLayout(true));

    // Obsidian claims Cmd/Ctrl+B, I and K (and Shift+X) for its own editor before a page element
    // sees them. A view's scope sits ahead of those global hotkeys while this tab is active, so
    // register the note's shortcuts there. They only act while the note itself has focus.
    const inNote = () => {
      const a = document.activeElement;
      return !!a && (a.id === "quick-note-rich" || a.id === "quick-note");
    };
    // (a view only gets a scope if it makes one; Obsidian's own editor views do)
    if (!this.scope && Scope) this.scope = new Scope(this.app.scope);
    // Cmd/Ctrl+1 to 7 jump between the seven notes (Obsidian uses these for tabs, so only in the note)
    for (let n = 1; n <= NOTE_COUNT; n++) {
      this.scope?.register(["Mod"], String(n), () => {
        if (!inNote()) return true;
        this.switchNote(n, true);
        return false;
      });
    }
    for (const [modifiers, key, action] of [
      [["Mod"], "b", "bold"],
      [["Mod"], "i", "italic"],
      [["Mod"], "u", "underline"],
      [["Mod"], "k", "link"],
      [["Mod", "Shift"], "x", "strike"],
    ]) {
      this.scope?.register(modifiers, key, () => {
        if (!inNote()) return true; // not ours: let Obsidian handle it
        this.formatNote(action);
        return false;
      });
    }

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
        this.renderOnThisDay();
        this.loadHero(false);
        this.loadQuote();
        this.syncSharedLayout(true);
      }, 5 * 60 * 1000), // both loaders return early when switched off in settings
    );

    this.refreshAll(false);
  }

  async onClose() {
    this.tt?.destroy();
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
    this.renderOnThisDay();
    this.tt?.render();
    this.$("hero").classList.toggle("hidden", !this.settings.showHero);
    if (this.settings.showHero) this.loadHero(false);
    this.loadQuote();
  }

  onFileChange(f) {
    const path = f.path;
    if (path === this.tasksPath) this.later("tasks", 150, () => this.loadTasks());
    else if (this.noteIndexOfPath(path)) {
      if (path === this.notePath) this.later("note", 150, () => this.loadNote());
      else this.later("noteTabs", 300, () => this.refreshNoteTexts());
    }
    else if (path === this.favPath) this.later("favs", 150, () => this.renderFavourites());
    else if (this.isRingFile(path)) this.later("ring", 150, () => this.renderRingNotes());
    else this.scheduleLists();
  }

  // ── On this day ──

  async renderOnThisDay() {
    const card = this.$("otd-card");
    const enabled = !!this.settings.showOnThisDay;
    card.classList.toggle("hidden", !enabled);
    if (!enabled) return;

    const body = this.$("otd-body");
    const token = (this.otdToken = (this.otdToken || 0) + 1);
    const periods = onThisDayDates(new Date());
    const wanted = new Set(periods.map((p) => isoDay(p.date)));
    const dated = new Map(); // day -> notes dated by a property or their name
    const undated = new Map(); // day -> notes known only by the file's created time
    const undatedPerDay = new Map();
    const push = (map, key, file) => (map.has(key) ? map.get(key).push(file) : map.set(key, [file]));
    for (const f of this.app.vault.getMarkdownFiles()) {
      if (this.isDataFile(f)) continue;
      const day = noteDay(f, this.app.metadataCache.getFileCache(f)?.frontmatter);
      if (day) {
        if (wanted.has(day)) push(dated, day, f);
        continue;
      }
      const created = isoDay(new Date(f.stat.ctime));
      undatedPerDay.set(created, (undatedPerDay.get(created) || 0) + 1);
      if (wanted.has(created)) push(undated, created, f);
    }

    const max = 3;
    const sections = [];
    let total = 0;
    for (const { key, date } of periods) {
      const day = isoDay(date);
      let list = dated.get(day) ?? [];
      if ((undatedPerDay.get(day) || 0) < FLOOD) list = list.concat(undated.get(day) ?? []);
      // daily notes (named for the day) first, then the rest in the order they were made
      list.sort((a, b) => Number(b.basename.includes(day)) - Number(a.basename.includes(day)) || a.stat.ctime - b.stat.ctime);
      total += list.length;
      sections.push({ key, date, list });
    }
    this.$("otd-count").textContent = fmtNum(total);
    // Read only the few notes that will show, for their one-line previews
    for (const s of sections) {
      s.shown = await Promise.all(s.list.slice(0, max).map(async (f) => ({ f, text: noteExcerpt(await this.app.vault.cachedRead(f), f.basename) })));
    }
    if (token !== this.otdToken) return; // a newer render has started

    const now = new Date();
    const label = { week: "A week ago", month: "A month ago", year: "A year ago" };
    body.empty();
    sections.forEach((s, i) => {
      const withYear = s.key === "year" || s.date.getFullYear() !== now.getFullYear();
      const when = fmtDate(s.date, { weekday: "short", month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}) });
      body.append(h("div", { cls: i ? "otd-when" : "otd-when first" }, h("h3", { cls: "otd-period", text: T(label[s.key]) }), h("span", { cls: "otd-date", text: when })));
      if (!s.list.length) {
        body.append(h("div", { cls: "otd-none", text: T("Nothing from this date") }));
        return;
      }
      const list = body.createDiv({ cls: "notes-list" });
      for (const { f, text } of s.shown) {
        const folder = f.parent && f.parent.path !== "/" ? f.parent.path : "";
        list.append(
          h(
            "a",
            { cls: "note-item", href: "#", "data-open": f.path },
            h("span", { cls: "note-icon", "aria-hidden": "true", text: "📄" }),
            h("div", { cls: "note-info" }, h("div", { cls: "note-title-row" }, h("span", { cls: "note-title", text: f.basename })), h("span", { cls: "note-path", text: text || folder })),
          ),
        );
      }
      if (s.list.length > max) body.append(h("div", { cls: "otd-more", text: T("+ {n} more", { n: fmtNum(s.list.length - max) }) }));
    });
  }

  scheduleLists() {
    this.later("lists", 1500, () => {
      if (this.ringMode === "files") this.renderRingNotes(); // frontmatter may have changed
      this.renderFavourites();
      this.renderClips();
      this.renderRecent();
      this.renderOnThisDay();
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
      new Notice(T("Note not found: {path}", { path }));
      return;
    }
    const mod = evt ? Keymap.isModEvent(evt) : false;
    this.app.workspace.getLeaf(mod || "tab").openFile(f);
  }

  // ── Theme ──

  applyTheme() {
    if (this.scrubNoteStyles) this.scrubNoteStyles();
    const t = this.settings.theme;
    const dark =
      t === "system" ? document.body.classList.contains("theme-dark") : t === "dark";
    this.root.setAttribute("data-theme", dark ? "dark" : "light");
    const btn = this.$("theme-toggle");
    setIconSvg(btn, t === "system" ? "monitor" : dark ? "moon" : "sun");
    const mode = dark ? T("Dark") : T("Light");
    const label = t === "system" ? T("System ({mode})", { mode }) : mode;
    btn.title = T("Appearance: {label} — click to change", { label });
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
    this.tt?.tickRunning();
    const now = new Date();
    const hour = now.getHours();
    const pad = (n) => String(n).padStart(2, "0");

    const phrase =
      hour < 12 ? T("Good morning") : hour < 17 ? T("Good afternoon") : hour < 21 ? T("Good evening") : T("Good night");
    const name = this.settings.userName;
    // Rebuild only when the words change (this runs every second)
    const greetKey = `${phrase}|${name}`;
    if (this.greetKey !== greetKey) {
      this.greetKey = greetKey;
      const greeting = this.$("greeting");
      greeting.empty();
      greeting.append(name ? T("{greeting}, ", { greeting: phrase }) : phrase);
      if (name) {
        greeting.append(h("span", { cls: "gname", text: name }));
        const suffix = T("name suffix");
        if (suffix !== "name suffix") greeting.append(suffix);
      }
    }

    const main = this.$("clock-main");
    const ampm = this.$("clock-ampm");
    if (this.settings.clockFormat === "12h") {
      main.textContent = `${hour % 12 || 12}:${pad(now.getMinutes())}`;
      ampm.textContent = dayPeriod(now);
      ampm.classList.remove("hidden");
    } else {
      main.textContent = `${pad(hour)}:${pad(now.getMinutes())}`;
      ampm.classList.add("hidden");
    }
    this.$("clock-sec").textContent = `:${pad(now.getSeconds())}`;
    // The visible digits are hidden from screen readers; they get the time once a minute instead
    const spoken = ampm.classList.contains("hidden") ? main.textContent : `${main.textContent} ${ampm.textContent}`;
    const sr = this.$("clock-sr");
    if (sr.textContent !== spoken) sr.textContent = spoken;

    if (now.getSeconds() === 0 && this.noteIndex) this.updateNoteSaved();
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
        new Notice(T("Could not create daily note: {error}", { error: err.message }));
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
    this.$("cal-grid").addEventListener("keydown", (e) => {
      const btn = e.target.closest?.("button.cal-day");
      if (!btn || e.altKey || e.ctrlKey || e.metaKey) return;
      const days = [...this.$("cal-grid").querySelectorAll("button.cal-day")];
      const i = days.indexOf(btn);
      const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      const to = e.key === "Home" ? 0 : e.key === "End" ? days.length - 1 : step == null ? null : Math.max(0, Math.min(days.length - 1, i + step));
      if (to == null) return;
      e.preventDefault();
      days.forEach((b, n) => (b.tabIndex = n === to ? 0 : -1));
      days[to].focus();
    });
    this.$("cal-grid").addEventListener("focusin", (e) => {
      const btn = e.target.closest?.("button.cal-day");
      if (!btn) return;
      for (const b of this.$("cal-grid").querySelectorAll("button.cal-day")) b.tabIndex = b === btn ? 0 : -1;
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
    // Spanish writes "octubre de 2026"; the short form fits the narrow card
    const monthLabel = fmtDate(new Date(year, month, 1), { month: "long", year: "numeric" });
    this.$("cal-month-label").textContent = LANG === "es" ? monthLabel.replace(" de ", " ") : monthLabel;

    const ws = this.settings.weekStart === "auto" ? localeWeekStart() : Number(this.settings.weekStart);
    const grid = this.$("cal-grid");
    // Keep keyboard focus on the same day across a redraw (opening a new daily note redraws)
    const focusedDay = grid.contains(document.activeElement) ? document.activeElement.dataset.day : null;
    grid.empty();
    grid.setAttribute("aria-label", this.$("cal-month-label").textContent);
    const full = (date) => fmtDate(date, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    let current = null;
    const header = grid.appendChild(h("div", { cls: "cal-row", role: "row" }));
    for (let i = 0; i < 7; i++) {
      const dow = new Date(2023, 0, 1 + ((ws + i) % 7)); // 1 Jan 2023 was a Sunday
      header.appendChild(h("div", { cls: "cal-dow", role: "columnheader", "aria-label": fmtDate(dow, { weekday: "long" }), text: fmtDate(dow, { weekday: "short" }).slice(0, 2) }));
    }

    const today = new Date();
    const first = (new Date(year, month, 1).getDay() - ws + 7) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();

    let placed = 0;
    const place = (el) => {
      if (placed++ % 7 === 0) current = grid.appendChild(h("div", { cls: "cal-row", role: "row" }));
      current.appendChild(el);
    };
    // Days outside the month are shown for context but are not controls
    const filler = (n, date) => place(h("div", { cls: "cal-day other-month", role: "gridcell", "aria-label": full(date), text: String(n) }));
    for (let i = first - 1; i >= 0; i--) filler(prevDays - i, new Date(year, month - 1, prevDays - i));

    const buttons = [];
    for (let d = 1; d <= days; d++) {
      const date = new Date(year, month, d);
      const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      const hasNote = !!this.app.vault.getAbstractFileByPath(this.dailyPath(date));
      const cell = h("button", {
        type: "button",
        cls: `cal-day${isToday ? " today" : ""}${hasNote ? " has-note" : ""}`,
        "data-day": String(d),
        "aria-label": hasNote ? T("{date}, has a note", { date: full(date) }) : full(date),
        tabindex: "-1",
        text: String(d),
      });
      if (isToday) cell.setAttribute("aria-current", "date");
      cell.addEventListener("click", (e) => this.openDailyNote(date, e));
      buttons.push(cell);
      place(h("div", { role: "gridcell", cls: "cal-cell" }, cell));
    }

    const filled = first + days;
    const remaining = filled % 7 === 0 ? 0 : 7 - (filled % 7);
    for (let d = 1; d <= remaining; d++) filler(d, new Date(year, month + 1, d));

    // One Tab stop for the whole month (today, or the 1st); the arrow keys move between days
    const isThisMonth = month === today.getMonth() && year === today.getFullYear();
    const stop = buttons[focusedDay ? Number(focusedDay) - 1 : isThisMonth ? today.getDate() - 1 : 0] || buttons[0];
    stop.tabIndex = 0;
    if (focusedDay) stop.focus();
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
      new Notice(T("Could not update tasks: {error}", { error: err.message }));
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
    this.$("tasks-stats").textContent = `${fmtNum(done)} / ${fmtNum(tasks.length)}`;

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
          ? T("No completed tasks yet.")
          : this.taskFilter === "active"
            ? T("Nothing left to do!")
            : T("No tasks yet — add one above.");
      this.showEmpty(list, msg);
      return;
    }

    list.empty();
    for (const task of filtered) {
      const check = h("button", {
        type: "button",
        cls: task.done ? "task-check checked" : "task-check",
        role: "checkbox",
        "aria-checked": String(!!task.done),
        "aria-label": task.text,
        title: task.done ? T("Mark incomplete") : T("Mark complete"),
      });
      setIconSvg(check, task.done ? "check" : null);
      check.addEventListener("click", () => this.toggleTask(task.id));

      const del = h("button", { cls: "task-del", title: T("Delete"), "aria-label": T("Delete: {task}", { task: task.text }) });
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

  // ── Arranging cards ──

  cardName(id) {
    return T(CARD_NAMES[id]);
  }

  isCardShown(id) {
    const el = this.$(id);
    return !!el && !el.classList.contains("hidden");
  }

  zoneName(zone) {
    return T({ top: "Top row", left: "Left column", center: "Centre column", right: "Right column" }[zone]);
  }

  // Remembered per device where Obsidian allows it: a phone and a laptop want different layouts
  restoreLayout() {
    let v = null;
    try {
      if (typeof this.app.loadLocalStorage === "function") v = this.app.loadLocalStorage("genkan-layout");
    } catch {
      // fall through to the plugin data
    }
    if (!v || typeof v !== "object") v = this.plugin.settings.cache?.layout;
    return normaliseLayout(v);
  }

  rememberLayout(layout) {
    try {
      if (typeof this.app.saveLocalStorage === "function") return this.app.saveLocalStorage("genkan-layout", layout);
    } catch {
      // fall through to the plugin data
    }
    const st = this.plugin.settings;
    st.cache = { ...(st.cache ?? {}), layout };
    this.plugin.saveSettings().catch(() => {});
  }

  // Which pushed layout this device last took, so a layout is only adopted once and a device
  // can be rearranged afterwards
  restoreSharedVersion() {
    let v = NaN;
    try {
      if (typeof this.app.loadLocalStorage === "function") v = Number(this.app.loadLocalStorage("genkan-layout-version"));
    } catch {
      // fall through to the plugin data
    }
    if (!Number.isFinite(v)) v = Number(this.plugin.settings.cache?.layoutVersion);
    return Number.isFinite(v) ? v : 0;
  }

  rememberSharedVersion(version) {
    try {
      if (typeof this.app.saveLocalStorage === "function") return this.app.saveLocalStorage("genkan-layout-version", version);
    } catch {
      // fall through to the plugin data
    }
    const st = this.plugin.settings;
    st.cache = { ...(st.cache ?? {}), layoutVersion: version };
    this.plugin.saveSettings().catch(() => {});
  }

  // Adopt a layout another device has pushed. Never moves cards while you are arranging them.
  async syncSharedLayout(notify) {
    try {
      this.plugin.adoptSharedLayout((await this.plugin.loadData())?.sharedLayout);
    } catch {
      // the file can't be read: use what is loaded
    }
    const shared = this.plugin.settings.sharedLayout;
    this.updateLayoutStatus();
    if (!shared || shared.version <= this.restoreSharedVersion()) return;
    if (this.arranging || this.drag || this.pick) return;
    const layout = normaliseLayout(shared.layout);
    this.applyLayout(layout);
    this.rememberLayout(layout);
    this.rememberSharedVersion(shared.version);
    if (notify) new Notice(T("Layout updated from another device."));
  }

  // Save the current layout as the shared one; other devices take it the next time they look
  async pushLayout() {
    const st = this.plugin.settings;
    const version = Math.max(Date.now(), (st.sharedLayout?.version || 0) + 1);
    st.sharedLayout = { layout: this.layout, version };
    try {
      await this.plugin.saveSettings();
      this.rememberSharedVersion(version);
      this.updateLayoutStatus();
      const msg = T("Layout saved for all your devices. Other devices pick it up when they next sync.");
      new Notice(msg);
      this.announce(msg);
    } catch {
      new Notice(T("Could not save the layout for your other devices."));
    }
  }

  // Put each card in its zone, touching only the cards that are out of place (moving a node
  // restarts its animation and drops focus)
  applyLayout(layout) {
    this.layout = layout;
    this.updateLayoutStatus();
    for (const z of ARRANGE_ZONES) {
      const zone = this.root.querySelector(`.zone[data-zone="${z}"]`);
      layout[z].forEach((id, i) => {
        const el = this.$(id);
        if (el && zone.children[i] !== el) zone.insertBefore(el, zone.children[i] || null);
      });
    }
  }

  // Say whether this device is on the shared layout or has one of its own
  updateLayoutStatus() {
    const status = this.$("arrange-status");
    const useShared = this.$("arrange-use-shared");
    if (!status || !useShared) return;
    const shared = this.plugin.settings.sharedLayout;
    let text;
    let differs = false;
    if (!shared) text = T("Local layout: only on this device. Use on all my devices shares it.");
    else if (layoutsEqual(this.layout, normaliseLayout(shared.layout))) text = T("Synced layout: the same on all your devices.");
    else {
      text = T("Local layout: this device differs from the shared layout.");
      differs = true;
    }
    status.textContent = text;
    useShared.hidden = !differs;
  }

  adoptShared() {
    const shared = this.plugin.settings.sharedLayout;
    if (!shared) return;
    const layout = normaliseLayout(shared.layout);
    this.applyLayout(layout);
    this.rememberLayout(layout);
    this.rememberSharedVersion(shared.version);
    this.announce(T("Switched to the shared layout."));
  }

  announce(msg, id = "arrange-live") {
    const el = this.$(id);
    if (!el) return;
    el.textContent = "";
    window.setTimeout(() => (el.textContent = msg), 30);
  }

  positionText(id) {
    const zone = ARRANGE_ZONES.find((z) => this.layout[z].includes(id));
    const shown = this.layout[zone].filter((x) => this.isCardShown(x));
    return T("{name}: {zone}, position {n} of {total}", { name: this.cardName(id), zone: this.zoneName(zone), n: shown.indexOf(id) + 1, total: shown.length });
  }

  initArrange() {
    this.arranging = false;
    this.pick = null;
    this.drag = null;
    for (const id of Object.keys(CARD_NAMES)) {
      const card = this.$(id);
      if (!card) continue;
      const name = this.cardName(id);
      const move = (dir, icon, key) => {
        const label = T(key, { name });
        return h("button", { type: "button", cls: "arrange-move", "data-move": dir, title: label, "aria-label": label }, iconNode(icon));
      };
      const handleLabel = T("Move {name}", { name });
      card.prepend(
        h(
          "div",
          { cls: "arrange-bar", hidden: "" },
          h("button", { type: "button", cls: "arrange-handle", "data-id": id, title: handleLabel, "aria-label": handleLabel, "aria-pressed": "false" }, iconNode("grip")),
          h("span", { cls: "arrange-name", text: name }),
          h("div", { cls: "arrange-moves" }, move("up", "arrow-up", "Move {name} up"), move("down", "arrow-down", "Move {name} down"), move("left", "arrow-left", "Move {name} left"), move("right", "arrow-right", "Move {name} right")),
        ),
      );
    }
    this.applyLayout(this.restoreLayout());
    this.syncSharedLayout(false);

    this.$("arrange-btn").addEventListener("click", () => this.setArranging(!this.arranging));
    this.$("arrange-done").addEventListener("click", () => this.setArranging(false));
    this.$("arrange-reset").addEventListener("click", () => this.resetLayout());
    this.$("arrange-push").addEventListener("click", () => this.pushLayout());
    this.$("arrange-use-shared").addEventListener("click", () => this.adoptShared());

    this.root.addEventListener("click", (e) => {
      const btn = e.target.closest?.(".arrange-move");
      if (btn) this.moveCard(btn.closest(".card").id, btn.dataset.move, btn);
    });
    this.root.addEventListener("keydown", (e) => this.arrangeKey(e));
    this.root.addEventListener("focusout", (e) => {
      // Tabbing away from a picked-up card drops it where it is
      if (this.pick && !this.moving && e.target.classList?.contains("arrange-handle") && e.target.dataset.id === this.pick.id) this.dropPick(e.target, true);
    });
    this.root.addEventListener("pointerdown", (e) => this.dragDown(e));
    this.root.addEventListener("pointermove", (e) => this.dragMove(e));
    this.root.addEventListener("pointerup", (e) => this.dragUp(e, false));
    this.root.addEventListener("pointercancel", (e) => this.dragUp(e, true));
  }

  setArranging(on) {
    this.cancelDrag();
    this.pick = null;
    this.arranging = on;
    this.root.classList.toggle("arranging", on);
    this.$("arrange-btn").setAttribute("aria-pressed", String(on));
    this.$("arrange-banner").hidden = !on;
    for (const id of Object.keys(CARD_NAMES)) {
      const card = this.$(id);
      if (!card) continue;
      for (const child of card.children) {
        if (child.classList.contains("arrange-bar")) child.hidden = !on;
        else child.inert = on;
      }
    }
    this.announce(T(on ? "Arranging cards" : "Done arranging"));
    if (on) {
      const first = Array.from(this.root.querySelectorAll(".arrange-handle")).find((b) => this.isCardShown(b.dataset.id));
      first?.focus();
    } else {
      this.$("arrange-btn").focus();
    }
  }

  resetLayout() {
    this.applyLayout(normaliseLayout(null));
    this.rememberLayout(null);
    this.announce(T("Layout reset."));
  }

  moveCard(id, dir, focusEl) {
    const next = moveInLayout(this.layout, id, dir, (x) => this.isCardShown(x));
    if (!next) {
      this.announce(T("{name} can't move any further that way.", { name: this.cardName(id) }));
      return false;
    }
    this.moving = true; // moving the node blurs it; refocus without treating that as a drop
    this.applyLayout(next);
    this.rememberLayout(next);
    focusEl?.focus();
    this.moving = false;
    this.announce(this.positionText(id));
    return true;
  }

  // Keyboard: Space or Enter picks a card up, the arrow keys move it, Space drops it, Escape cancels
  arrangeKey(e) {
    if (e.key === "Escape" && this.drag) {
      e.preventDefault();
      this.cancelDrag();
      return;
    }
    const handle = e.target.closest?.(".arrange-handle");
    if (!handle || e.isComposing || e.metaKey || e.ctrlKey || e.altKey) return;
    const id = handle.dataset.id;
    const arrows = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
    const holding = this.pick && this.pick.id === id;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (holding) this.dropPick(handle);
      else {
        this.pick = { id, before: this.layout };
        handle.setAttribute("aria-pressed", "true");
        this.announce(T("{name} picked up. Use the arrow keys to move it, Space to drop it and Escape to cancel.", { name: this.cardName(id) }));
      }
    } else if (holding && arrows[e.key]) {
      e.preventDefault();
      this.moveCard(id, arrows[e.key], handle);
    } else if (holding && e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      this.moving = true;
      this.applyLayout(this.pick.before);
      this.rememberLayout(this.pick.before);
      handle.focus();
      this.moving = false;
      handle.setAttribute("aria-pressed", "false");
      this.pick = null;
      this.announce(T("Move cancelled."));
    }
  }

  dropPick(handle, quiet) {
    handle.setAttribute("aria-pressed", "false");
    const id = this.pick.id;
    this.pick = null;
    if (!quiet) this.announce(T("Dropped. {position}", { position: this.positionText(id) }));
  }

  // Pointer dragging, by the handle. A small ghost follows the pointer, a slot shows where the card
  // will land, and the page scrolls itself near its top and bottom edges.
  dragDown(e) {
    const handle = e.target.closest?.(".arrange-handle");
    if (!handle || !this.arranging || (e.pointerType === "mouse" && e.button !== 0)) return;
    const card = handle.closest(".card");
    this.drag = { id: card.id, card, handle, pointerId: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, started: false };
    try {
      handle.setPointerCapture(e.pointerId);
    } catch {
      // the drag still works without capture
    }
    e.preventDefault();
  }

  dragMove(e) {
    const d = this.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    d.x = e.clientX;
    d.y = e.clientY;
    if (!d.started) {
      if (Math.hypot(d.x - d.x0, d.y - d.y0) < 5) return;
      d.started = true;
      const rect = d.card.getBoundingClientRect();
      d.slot = h("div", { cls: "drop-slot", "aria-hidden": "true" });
      d.slot.style.height = `${rect.height}px`;
      d.card.before(d.slot);
      d.card.classList.add("is-dragging");
      d.ghost = h("div", { cls: "drag-ghost", text: this.cardName(d.id) });
      this.root.append(d.ghost);
      this.root.classList.add("is-dragging-card");
      this.dragFrame();
    }
    this.dragUpdate();
  }

  dragUpdate() {
    const d = this.drag;
    if (!d || !d.started) return;
    const root = this.root.getBoundingClientRect();
    d.ghost.style.left = `${d.x - root.left + this.root.scrollLeft}px`;
    d.ghost.style.top = `${d.y - root.top + this.root.scrollTop}px`;
    // the zone under the pointer, or the nearest one
    let best = null;
    let bestDist = Infinity;
    for (const zone of this.root.querySelectorAll(".zone")) {
      if (getComputedStyle(zone).display === "none") continue;
      const r = zone.getBoundingClientRect();
      const dx = Math.max(r.left - d.x, 0, d.x - r.right);
      const dy = Math.max(r.top - d.y, 0, d.y - r.bottom);
      const dist = Math.hypot(dx, dy);
      if (dist < bestDist) {
        bestDist = dist;
        best = zone;
      }
    }
    if (!best) return;
    const row = getComputedStyle(best).flexDirection === "row";
    const kids = Array.from(best.children).filter((c) => c !== d.card && c !== d.slot && !c.classList.contains("hidden"));
    let before = null;
    for (const c of kids) {
      const r = c.getBoundingClientRect();
      if (d.y < r.top || (d.y <= r.bottom && (row ? d.x < r.left + r.width / 2 : d.y < r.top + r.height / 2))) {
        before = c;
        break;
      }
    }
    if (before) {
      if (d.slot.nextSibling !== before) best.insertBefore(d.slot, before);
    } else if (best.lastChild !== d.slot) best.append(d.slot);
  }

  dragFrame() {
    const d = this.drag;
    if (!d || !d.started) return;
    const r = this.root.getBoundingClientRect();
    const edge = 56;
    const dy = d.y < r.top + edge ? -(r.top + edge - d.y) : d.y > r.bottom - edge ? d.y - (r.bottom - edge) : 0;
    if (dy) {
      this.root.scrollTop += Math.max(-18, Math.min(18, dy / 3));
      this.dragUpdate();
    }
    window.requestAnimationFrame(() => this.dragFrame());
  }

  dragUp(e, cancelled) {
    const d = this.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    if (!d.started) {
      this.drag = null;
      return;
    }
    if (cancelled) return this.cancelDrag();
    // The new order is whatever the zones now hold, with the slot standing for the card
    const next = { top: [], left: [], center: [], right: [] };
    for (const z of ARRANGE_ZONES) {
      const zone = this.root.querySelector(`.zone[data-zone="${z}"]`);
      next[z] = Array.from(zone.children)
        .map((c) => (c === d.slot ? d.id : c === d.card ? null : c.id))
        .filter(Boolean);
    }
    const { card, handle, id } = d;
    this.endDrag();
    const layout = normaliseLayout(next);
    this.moving = true;
    this.applyLayout(layout);
    this.rememberLayout(layout);
    handle.focus();
    this.moving = false;
    this.announce(T("Dropped. {position}", { position: this.positionText(id) }));
    card.classList.remove("is-dragging");
  }

  cancelDrag() {
    if (!this.drag) return;
    const wasStarted = this.drag.started;
    const handle = this.drag.handle;
    this.endDrag();
    if (wasStarted) {
      handle.focus();
      this.announce(T("Move cancelled."));
    }
  }

  endDrag() {
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    d.slot?.remove();
    d.ghost?.remove();
    d.card.classList.remove("is-dragging");
    this.root.classList.remove("is-dragging-card");
    try {
      d.handle.releasePointerCapture(d.pointerId);
    } catch {
      // already released
    }
  }

  // ── Collapsible cards ──

  restoreCollapsed() {
    let v = null;
    try {
      if (typeof this.app.loadLocalStorage === "function") v = this.app.loadLocalStorage("genkan-collapsed");
    } catch {
      // fall through to the plugin data
    }
    if (!Array.isArray(v)) v = this.plugin.settings.cache?.collapsed;
    return Array.isArray(v) ? v.filter((id) => typeof id === "string") : [];
  }

  // Remembered per device where Obsidian allows it: a phone and a laptop want different layouts
  rememberCollapsed() {
    const ids = Array.from(this.root.querySelectorAll(".card-toggle"))
      .filter((b) => b.getAttribute("aria-expanded") === "false")
      .map((b) => b.dataset.card);
    try {
      if (typeof this.app.saveLocalStorage === "function") return this.app.saveLocalStorage("genkan-collapsed", ids);
    } catch {
      // fall through to the plugin data
    }
    const s = this.plugin.settings;
    s.cache = { ...(s.cache ?? {}), collapsed: ids };
    this.plugin.saveSettings().catch(() => {});
  }

  setCollapsed(btn, collapsed) {
    this.$(btn.dataset.card).classList.toggle("is-collapsed", collapsed);
    this.$(btn.dataset.body).classList.toggle("hidden", collapsed);
    const label = T(collapsed ? "Expand {name}" : "Collapse {name}", { name: btn.dataset.label });
    btn.setAttribute("aria-expanded", String(!collapsed));
    btn.setAttribute("aria-label", label);
    btn.title = label;
    setIconSvg(btn, collapsed ? "plus" : "minus");
  }

  initCards() {
    const saved = this.restoreCollapsed();
    for (const btn of this.root.querySelectorAll(".card-toggle")) {
      this.setCollapsed(btn, saved.includes(btn.dataset.card));
      btn.addEventListener("click", () => {
        this.setCollapsed(btn, btn.getAttribute("aria-expanded") === "true");
        this.rememberCollapsed();
      });
    }
  }

  // ── Quick Note ──

  initNote() {
    const textarea = this.$("quick-note");
    const rich = this.$("quick-note-rich");
    this.setNoteMd(""); // builds the editor's first (empty) line

    this.noteIndex = this.restoreNoteIndex();
    this.renderNoteTabs();
    const tabs = this.$("note-tabs");
    tabs.addEventListener("mousedown", (e) => e.preventDefault()); // keep the cursor in the note
    tabs.addEventListener("click", (e) => {
      const dot = e.target.closest("[data-note]");
      if (dot) this.switchNote(Number(dot.dataset.note), !Platform.isMobile);
    });
    tabs.addEventListener("keydown", (e) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      const to = e.key === "Home" ? 1 : e.key === "End" ? NOTE_COUNT : step ? ((this.noteIndex - 1 + step + NOTE_COUNT) % NOTE_COUNT) + 1 : 0;
      if (!to) return;
      e.preventDefault();
      this.switchNote(to).then(() => this.root.querySelector(`.note-dot[data-note="${to}"]`)?.focus());
    });

    // Joining or splitting lines makes the browser copy the current text colour onto the text as
    // an inline style; it would stay put after a light/dark switch, so strip it as it appears
    const scrubStyles = () => {
      for (const el of rich.querySelectorAll("[style]")) el.removeAttribute("style");
      for (const el of rich.querySelectorAll("font")) el.replaceWith(...el.childNodes);
    };
    this.scrubNoteStyles = scrubStyles;
    rich.addEventListener("input", scrubStyles);

    const changed = () => {
      this.noteDirty = true;
      this.setSaveState(false);
      this.syncNoteEmpty();
      this.later("noteStats", 150, () => this.updateNoteStats());
      this.later("noteSave", 800, () => this.saveNote());
    };
    // Flush on blur so switching tabs right after typing never loses text
    const flush = () => {
      if (this.noteDirty && !this.noteComposing) this.saveNote().then(() => this.announce(T("Saved"), "note-live"));
    };
    for (const el of [textarea, rich]) {
      el.addEventListener("input", changed);
      el.addEventListener("blur", flush);
    }
    this.initNoteLinks(rich);
    rich.addEventListener("compositionstart", () => (this.noteComposing = true));
    rich.addEventListener("compositionend", () => (this.noteComposing = false));
    // Paste and drop as plain text, so no foreign styling ever enters the note
    const insertPlain = (text) => {
      if (text) document.execCommand("insertText", false, text);
    };
    rich.addEventListener("paste", (e) => {
      e.preventDefault();
      insertPlain((e.clipboardData || window.clipboardData).getData("text/plain"));
    });
    rich.addEventListener("drop", (e) => {
      e.preventDefault();
      insertPlain(e.dataTransfer && e.dataTransfer.getData("text/plain"));
    });
    // "---" then Enter becomes a horizontal rule, as in markdown
    rich.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount || !sel.isCollapsed) return;
      let block = sel.anchorNode;
      while (block && block.parentNode !== rich) block = block.parentNode;
      if (!block || block.tagName !== "DIV" || block.textContent !== "---") return;
      e.preventDefault();
      const next = document.createElement("div");
      next.append(document.createElement("br"));
      block.replaceWith(document.createElement("hr"), next);
      const caret = document.createRange();
      caret.setStart(next, 0);
      caret.collapse(true);
      sel.removeAllRanges();
      sel.addRange(caret);
      rich.dispatchEvent(new Event("input", { bubbles: true }));
    });
    // Links are plain text to click in; Cmd/Ctrl-click follows one
    rich.addEventListener("click", (e) => {
      const a = e.target.closest && e.target.closest("a[href]");
      if (a && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        window.open(a.getAttribute("href"));
      }
    });

    // Formatting toolbar. mousedown is cancelled so the click does not take focus (and the
    // selection) away from the note.
    const bar = this.root.querySelector(".note-toolbar");
    const barButtons = () => Array.from(bar.querySelectorAll("button"));
    const rove = (btn) => barButtons().forEach((b) => (b.tabIndex = b === btn ? 0 : -1));
    rove(barButtons()[0]);
    bar.addEventListener("focusin", (e) => {
      const b = e.target.closest("button");
      if (b) rove(b);
    });
    bar.addEventListener("keydown", (e) => {
      const list = barButtons();
      const i = list.indexOf(document.activeElement);
      if (i < 0 || e.altKey || e.ctrlKey || e.metaKey) return;
      const to = e.key === "ArrowRight" ? (i + 1) % list.length : e.key === "ArrowLeft" ? (i - 1 + list.length) % list.length : e.key === "Home" ? 0 : e.key === "End" ? list.length - 1 : null;
      if (to == null) return;
      e.preventDefault();
      list[to].focus();
    });
    bar.addEventListener("mousedown", (e) => e.preventDefault());
    bar.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-fmt]");
      if (btn) this.formatNote(btn.dataset.fmt);
      else if (e.target.closest("[data-export]")) this.exportNote();
    });
    const shortcuts = (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.isComposing) return;
      const k = e.key.toLowerCase();
      const action = e.shiftKey ? (k === "x" ? "strike" : null) : { b: "bold", i: "italic", u: "underline", k: "link" }[k];
      if (!action) return;
      e.preventDefault();
      this.formatNote(action);
    };
    textarea.addEventListener("keydown", shortcuts);
    rich.addEventListener("keydown", shortcuts);

    // The link address row
    const input = this.$("note-link-input");
    this.$("note-link-apply").addEventListener("click", () => this.applyLink());
    this.$("note-link-cancel").addEventListener("click", () => this.closeLinkRow());
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.applyLink();
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.closeLinkRow();
      }
    });
    this.setSaveState(true);
  }

  async saveNote() {
    clearTimeout(this.timers.noteSave);
    const value = this.getNoteMd();
    const index = this.noteIndex;
    try {
      const file = await this.ensureFile(this.notePathFor(index));
      await this.app.vault.process(file, () => value);
      if (index === this.noteIndex && this.getNoteMd() === value) {
        this.noteDirty = false;
        this.setSaveState(true);
      }
    } catch (err) {
      new Notice(T("Could not save quick note: {error}", { error: err.message }));
    }
  }

  // The note as markdown, whichever editor is showing
  // Save the open note as a Markdown file wherever the user chooses, starting in the vault's folder
  async exportNote() {
    if (this.noteDirty && !this.noteComposing) await this.saveNote();
    const md = this.getNoteMd();
    if (!md.trim()) {
      new Notice(T("This note is empty, so there is nothing to export."));
      return;
    }
    const name = exportFileName(md, this.noteIndex);
    try {
      await saveExportFile(this.app, name, md, "text/markdown", "Markdown");
    } catch (err) {
      console.error("Genkan: export failed", err);
      new Notice(T("Could not export the note."));
    }
  }

  getNoteMd() {
    return this.noteMode === "rich" ? noteToMarkdown(this.$("quick-note-rich")) : this.$("quick-note").value;
  }

  // Show markdown in the rich editor, unless it could not be written back unchanged
  setNoteMd(md) {
    const textarea = this.$("quick-note");
    const rich = this.$("quick-note-rich");
    const ok = noteRoundTrips(md);
    this.noteMode = ok ? "rich" : "plain";
    rich.classList.toggle("hidden", !ok);
    textarea.classList.toggle("hidden", ok);
    this.$("note-hint").classList.toggle("hidden", ok);
    if (ok) rich.replaceChildren(markdownToBlocks(md));
    else textarea.value = md;
    this.syncNoteEmpty();
    this.updateFormatState();
  }

  // The placeholder shows while the note is empty (a contenteditable has none of its own)
  syncNoteEmpty() {
    const rich = this.$("quick-note-rich");
    rich.classList.toggle("is-empty", this.noteMode === "rich" && noteToMarkdown(rich) === "");
  }

  currentHeadingLevel() {
    const rich = this.$("quick-note-rich");
    let n = window.getSelection() && window.getSelection().anchorNode;
    while (n && n !== rich) {
      if (n.nodeType === 1 && /^H[1-6]$/.test(n.tagName)) return Number(n.tagName[1]);
      n = n.parentNode;
    }
    return 0;
  }

  // Light the toolbar buttons that match the text under the cursor
  updateFormatState() {
    if (!this.root) return;
    const rich = this.$("quick-note-rich");
    const sel = window.getSelection();
    const inside = this.noteMode === "rich" && sel && sel.anchorNode && rich.contains(sel.anchorNode);
    const q = (c) => {
      try {
        return document.queryCommandState(c);
      } catch {
        return false;
      }
    };
    const states = inside
      ? {
          bold: q("bold"),
          italic: q("italic"),
          underline: q("underline"),
          strike: q("strikeThrough"),
          bullet: q("insertUnorderedList"),
          numbered: q("insertOrderedList"),
          heading: this.currentHeadingLevel() > 0,
        }
      : {};
    for (const btn of this.root.querySelectorAll(".note-toolbar [data-fmt]")) {
      const on = !!states[btn.dataset.fmt];
      btn.classList.toggle("is-active", on);
      if (btn.dataset.fmt !== "link") btn.setAttribute("aria-pressed", String(on));
    }
  }

  // ── Link address row (rich editor) ──
  openLinkRow() {
    const rich = this.$("quick-note-rich");
    const sel = window.getSelection();
    this.noteRange = sel && sel.rangeCount && rich.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null;
    let node = sel && sel.anchorNode;
    while (node && node !== rich && !(node.nodeType === 1 && node.tagName === "A")) node = node.parentNode;
    const existing = node && node !== rich ? node.getAttribute("href") : "";
    const selected = this.noteRange ? this.noteRange.toString() : "";
    const input = this.$("note-link-input");
    input.value = existing || (/^https?:\/\/\S+$/.test(selected) ? selected : "https://");
    this.root.querySelector(".note-link-row").classList.remove("hidden");
    input.focus();
    input.select();
  }

  closeLinkRow() {
    this.root.querySelector(".note-link-row").classList.add("hidden");
    const rich = this.$("quick-note-rich");
    rich.focus();
    const sel = window.getSelection();
    if (this.noteRange && sel) {
      sel.removeAllRanges();
      sel.addRange(this.noteRange);
    }
  }

  applyLink() {
    let url = this.$("note-link-input").value.trim();
    this.closeLinkRow();
    const rich = this.$("quick-note-rich");
    const sel = window.getSelection();
    if (!url || url === "https://") {
      document.execCommand("unlink");
      return;
    }
    if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = `https://${url}`;
    if (!SAFE_HREF.test(url)) {
      new Notice(T("That kind of link isn't supported."));
      return;
    }
    const range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
    if (range && range.collapsed) {
      const a = document.createElement("a");
      a.setAttribute("href", url);
      a.textContent = url;
      range.insertNode(a);
      range.setStartAfter(a);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      rich.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      document.execCommand("createLink", false, url);
    }
  }

  // ── Links in the quick note ──
  // A link in an editable area does nothing when clicked, so Genkan opens it: in Surfing when that
  // plugin is on, otherwise in the default browser. Right-click offers other places to open it.

  initNoteLinks(rich) {
    const linkAt = (target) => {
      const a = target instanceof Element ? target.closest("a[href]") : null;
      const href = a && a.getAttribute("href");
      return href && SAFE_HREF.test(href) ? href : null;
    };
    rich.addEventListener("click", (e) => {
      const href = linkAt(e.target);
      const sel = window.getSelection();
      if (!href || e.button !== 0 || (sel && !sel.isCollapsed)) return; // dragging a selection over a link is editing
      e.preventDefault();
      this.openNoteLink(href);
    });
    rich.addEventListener("contextmenu", (e) => {
      const href = linkAt(e.target);
      if (!href) return;
      e.preventDefault();
      this.noteLinkMenu(href).showAtMouseEvent(e);
    });
    // From the keyboard: Ctrl/Cmd+Enter opens the link the cursor is in
    rich.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey) || e.isComposing) return;
      const sel = window.getSelection();
      const href = sel && sel.anchorNode ? linkAt(sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement) : null;
      if (!href) return;
      e.preventDefault();
      this.openNoteLink(href);
    });
  }

  surfingOn() {
    return !!this.app.plugins?.plugins?.surfing;
  }

  async openInSurfing(url) {
    try {
      const leaf = this.app.workspace.getLeaf("tab");
      await leaf.setViewState({ type: "surfing-view", active: true, state: { url } });
      this.app.workspace.revealLeaf(leaf);
    } catch {
      this.openExternally(url);
    }
  }

  // The system's default browser (the "external" hint stops Surfing taking it over)
  openExternally(url) {
    window.open(url, "_blank", "external");
  }

  openNoteLink(url) {
    if (/^https?:/i.test(url) && this.surfingOn() && !Platform.isMobile) this.openInSurfing(url);
    else this.openExternally(url);
  }

  noteLinkMenu(url) {
    const menu = new Menu();
    const web = /^https?:/i.test(url);
    if (web && this.surfingOn() && !Platform.isMobile) menu.addItem((i) => i.setTitle(T("Open in Obsidian (Surfing)")).setIcon("globe").onClick(() => this.openInSurfing(url)));
    menu.addItem((i) => i.setTitle(T("Open in the default browser")).setIcon("external-link").onClick(() => this.openExternally(url)));
    menu.addSeparator();
    menu.addItem((i) =>
      i.setTitle(T("Copy link")).setIcon("copy").onClick(async () => {
        try {
          await navigator.clipboard.writeText(url);
          new Notice(T("Link copied."));
        } catch {
          new Notice(T("Could not copy the link."));
        }
      }),
    );
    return menu;
  }

  // Which line (counting like the markdown does) a point in the editor falls on, and how far
  // into that line's text it is. Works whatever structure the browser built while typing.
  noteLineAt(node, offset) {
    const rich = this.$("quick-note-rich");
    const r = document.createRange();
    r.setStart(rich, 0);
    r.setEnd(node, offset);
    const holder = document.createElement("div");
    holder.append(r.cloneContents());
    const lines = noteToMarkdown(holder).split("\n");
    // The text typed on this line so far, without its markers
    const plain = document.createElement("div");
    plain.append(r.cloneContents());
    const last = Array.from(plain.querySelectorAll("div, p, li, h1, h2, h3, h4, h5, h6")).pop() || plain;
    return { line: lines.length - 1, offset: last.textContent.length };
  }

  // The editor's lines as separate blocks (list items count individually), once it has been
  // redrawn from markdown
  noteLines() {
    const lines = [];
    for (const c of this.$("quick-note-rich").children) {
      if (c.tagName === "UL" || c.tagName === "OL") lines.push(...c.children);
      else lines.push(c);
    }
    return lines;
  }

  // Headings and lists change whole lines, which Chrome's own commands do unreliably (they merge
  // lines and drop the selection). Edit the markdown lines instead, redraw, and reselect them.
  formatNoteLines(action) {
    const rich = this.$("quick-note-rich");
    const sel = window.getSelection();
    let range = sel && sel.rangeCount && rich.contains(sel.anchorNode) ? sel.getRangeAt(0) : null;
    if (!range) {
      range = document.createRange();
      range.selectNodeContents(rich);
      range.collapse(false);
    }
    // A Range is live and collapses when its nodes are replaced below, so read it first
    const wasCollapsed = range.collapsed;
    const startPoint = this.noteLineAt(range.startContainer, range.startOffset);
    let endPoint = wasCollapsed ? startPoint : this.noteLineAt(range.endContainer, range.endOffset);
    // A selection that ends at the very start of a line does not include that line
    if (endPoint.line > startPoint.line && endPoint.offset === 0) endPoint = { line: endPoint.line - 1, offset: Infinity };
    const md = this.getNoteMd();
    const lines = md.split("\n");
    const first = Math.min(startPoint.line, lines.length - 1);
    const last = Math.min(Math.max(endPoint.line, first), lines.length - 1);
    const from = lines.slice(0, first).join("\n").length + (first > 0 ? 1 : 0);
    const to = from + lines.slice(first, last + 1).join("\n").length;
    const edit = formatEdit(md, from, to, action);
    if (!edit) return;
    const next = md.slice(0, edit.from) + edit.insert + md.slice(edit.to);
    rich.replaceChildren(markdownToBlocks(next));
    rich.dispatchEvent(new Event("input", { bubbles: true }));

    // Put the cursor (or the selected lines) back
    const blocks = this.noteLines();
    const textEnd = (block) => {
      if (block.tagName === "HR") return [block.parentNode, Array.from(block.parentNode.childNodes).indexOf(block) + 1];
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      let node = null;
      let t;
      while ((t = walker.nextNode())) node = t;
      return node ? [node, node.nodeValue.length] : [block, 0];
    };
    const textAt = (block, offset) => {
      if (block.tagName === "HR") return textEnd(block);
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      let left = offset;
      let t;
      while ((t = walker.nextNode())) {
        if (left <= t.nodeValue.length) return [t, left];
        left -= t.nodeValue.length;
      }
      return textEnd(block);
    };
    const out = document.createRange();
    if (wasCollapsed) {
      const [n, o] = textAt(blocks[first], startPoint.offset);
      out.setStart(n, o);
      out.collapse(true);
    } else {
      if (blocks[first].tagName === "HR") out.setStartBefore(blocks[first]);
      else out.setStart(blocks[first], 0);
      const [n, o] = textEnd(blocks[last]);
      out.setEnd(n, o);
    }
    rich.focus();
    sel.removeAllRanges();
    sel.addRange(out);
    this.updateFormatState();
  }

  formatRich(action) {
    if (action === "link") return this.openLinkRow();
    if (action === "heading" || action === "bullet" || action === "numbered") return this.formatNoteLines(action);
    const rich = this.$("quick-note-rich");
    rich.focus();
    document.execCommand("styleWithCSS", false, false);
    document.execCommand({ bold: "bold", italic: "italic", underline: "underline", strike: "strikeThrough" }[action]);
    this.updateFormatState();
  }

  // Apply a toolbar action to the quick note, through the browser's own text insertion where
  // possible so undo (Cmd/Ctrl+Z) still steps back through it
  formatNote(action) {
    if (this.noteMode === "rich") return this.formatRich(action);
    const ta = this.$("quick-note");
    const r = formatEdit(ta.value, ta.selectionStart, ta.selectionEnd, action);
    if (!r || !r.insert) return;
    const expected = ta.value.slice(0, r.from) + r.insert + ta.value.slice(r.to);
    ta.focus();
    ta.setSelectionRange(r.from, r.to);
    let done = false;
    try {
      done = document.execCommand("insertText", false, r.insert);
    } catch {
      done = false;
    }
    if (!done || ta.value !== expected) {
      ta.value = expected;
      ta.dispatchEvent(new Event("input", { bubbles: true }));
    }
    ta.setSelectionRange(r.selStart, r.selEnd);
  }

  async loadNote() {
    // Never replace text the user is in the middle of editing
    if (this.noteDirty || this.noteComposing) return;
    const f = this.app.vault.getAbstractFileByPath(this.notePath);
    const text = f instanceof TFile ? await this.app.vault.read(f) : "";
    if (!this.noteDirty && !this.noteComposing && this.getNoteMd() !== text) this.setNoteMd(text);
    this.updateNoteMeta();
  }

  // ── The seven notes ──

  restoreNoteIndex() {
    let v = NaN;
    try {
      if (typeof this.app.loadLocalStorage === "function") v = Number(this.app.loadLocalStorage("genkan-note-index"));
    } catch {
      // fall through to the plugin data
    }
    if (!Number.isInteger(v)) v = Number(this.plugin.settings.cache?.noteIndex);
    return v >= 1 && v <= NOTE_COUNT ? v : 1;
  }

  // Remembered per device where Obsidian allows it, so your phone and laptop can each keep their place
  rememberNoteIndex() {
    try {
      if (typeof this.app.saveLocalStorage === "function") return this.app.saveLocalStorage("genkan-note-index", this.noteIndex);
    } catch {
      // fall through to the plugin data
    }
    const s = this.plugin.settings;
    s.cache = { ...(s.cache ?? {}), noteIndex: this.noteIndex };
    this.plugin.saveSettings().catch(() => {});
  }

  focusNote() {
    if (this.noteMode === "rich") {
      const rich = this.$("quick-note-rich");
      rich.focus();
      const r = document.createRange();
      r.selectNodeContents(rich);
      r.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
    } else {
      const ta = this.$("quick-note");
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    }
  }

  async switchNote(i, focus = false) {
    if (i < 1 || i > NOTE_COUNT) return;
    if (i === this.noteIndex) {
      if (focus) this.focusNote();
      return;
    }
    if (this.noteDirty && !this.noteComposing) await this.saveNote(); // keep what you typed in the note you are leaving
    this.noteIndex = i;
    this.rememberNoteIndex();
    this.noteDirty = false;
    this.setSaveState(true);
    this.root.querySelector(".note-link-row")?.classList.add("hidden");
    this.renderNoteTabs();
    await this.loadNote();
    if (focus) {
      this.focusNote();
      // Focus is already in the editor when the shortcut is used, so say which note it now holds
      this.announce(this.noteDotLabel(i, !!this.getNoteMd().trim()), "note-live");
    }
  }

  // The dot beside the title: green when saved, amber while there are unsaved changes. Its label
  // follows, so a screen reader hears the real state.
  setSaveState(saved) {
    const dot = this.$("autosave-dot");
    const label = saved ? T("Saved") : T("Unsaved changes");
    dot.className = saved ? "autosave-dot saved" : "autosave-dot unsaved";
    dot.title = label;
    dot.setAttribute("aria-label", label);
  }

  noteDotLabel(i, hasText) {
    return T(hasText ? "Note {n}, has text" : "Note {n}, empty", { n: i });
  }

  // The dots: the open note is filled and numbered, notes with text have a small centre dot
  renderNoteTabs() {
    const card = this.$("note-card");
    card.setAttribute("data-note", String(this.noteIndex));
    for (const dot of this.root.querySelectorAll(".note-dot")) {
      const i = Number(dot.dataset.note);
      const on = i === this.noteIndex;
      dot.setAttribute("aria-selected", String(on));
      dot.setAttribute("tabindex", on ? "0" : "-1");
      dot.classList.toggle("has-text", !!this.noteHasText[i - 1]);
      dot.setAttribute("aria-label", this.noteDotLabel(i, !!this.noteHasText[i - 1]));
    }
    // The panel and the editor are named for the open note
    this.$("note-panel").setAttribute("aria-labelledby", `note-tab-${this.noteIndex}`);
    const name = T("Quick note {n}", { n: this.noteIndex });
    this.$("quick-note-rich").setAttribute("aria-label", name);
    this.$("quick-note").setAttribute("aria-label", name);
  }

  async refreshNoteTexts() {
    for (let i = 1; i <= NOTE_COUNT; i++) {
      if (i === this.noteIndex) continue;
      const f = this.app.vault.getAbstractFileByPath(this.notePathFor(i));
      this.noteHasText[i - 1] = f instanceof TFile ? (await this.app.vault.cachedRead(f)).trim() !== "" : false;
    }
    this.renderNoteTabs();
  }

  // Footer: counts for the open note and when it was last saved
  updateNoteStats() {
    const md = this.getNoteMd();
    const { lines, words, chars } = noteStats(md);
    this.noteHasText[this.noteIndex - 1] = md.trim() !== "";
    this.$("note-stats").textContent = [plural(lines, "{n} line", "{n} lines"), plural(words, "{n} word", "{n} words"), plural(chars, "{n} character", "{n} characters")].join(" · ");
    const dot = this.root.querySelector(`.note-dot[data-note="${this.noteIndex}"]`);
    dot?.classList.toggle("has-text", this.noteHasText[this.noteIndex - 1]);
    dot?.setAttribute("aria-label", this.noteDotLabel(this.noteIndex, this.noteHasText[this.noteIndex - 1]));
  }

  updateNoteSaved() {
    const f = this.app.vault.getAbstractFileByPath(this.notePath);
    this.$("note-saved").textContent = f instanceof TFile ? savedAgo(f.stat.mtime) : "";
  }

  updateNoteMeta() {
    this.updateNoteStats();
    this.updateNoteSaved();
    this.refreshNoteTexts();
  }

  // ── Quick Links ──

  renderLinks() {
    const nav = this.$("quick-links");
    const links = this.settings.quickLinks ?? [];
    nav.empty();
    if (!links.length) {
      nav.createSpan({ cls: "hp-empty", text: T("No quick links configured.") });
      return;
    }
    links.forEach((l, i) =>
      nav.append(
        h(
          "a",
          { cls: "quick-link", href: "#", "data-ql": String(i) },
          h("span", { cls: "ql-icon", "aria-hidden": "true", text: l.icon ?? "" }),
          h("span", { text: quickLinkLabel(l) }),
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
      if (e.target.closest("[data-ring-all]")) {
        e.preventDefault();
        this.openRingFolder();
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
      if (!this.app.commands.executeCommandById(id)) new Notice(T("Command not found: {id}", { id }));
      return;
    }
    if (a.startsWith("open:")) return this.openFile(normalizePath(a.slice(5)), evt);
    if (/^(https?|obsidian):\/\//.test(a)) return window.open(a);
    new Notice(T("Unknown quick link action: {action}", { action: a }));
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
        ? T("Today")
        : dayDiff === 1
          ? T("Yesterday")
          : fmtDate(d, { month: "short", day: "numeric", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
    if (!e.hasTime) return day;
    const time = d.toLocaleTimeString(LOCALE, {
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
        this.showEmpty(body, T("Choose the folder your ring saves notes to in Genkan's settings."));
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
        this.showEmpty(body, T("No notes found in “{folder}”.", { folder }));
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
        this.showEmpty(body, T("No ring notes yet. Looking for “{path}”.", { path }));
        return;
      }
      const parsed = parseRingNotes(await this.app.vault.read(f));
      total = parsed.length;
      if (!total) {
        count.textContent = "0";
        this.showEmpty(body, T("No timestamped entries found in “{path}”.", { path }));
        return;
      }
      entries = parsed.slice(0, max).map((e) => ({ ...e, path }));
    }

    count.textContent = entries.length;
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
    if (total > entries.length) {
      const more = h("a", { cls: "ring-more", href: "#", text: T("View all {n} notes", { n: fmtNum(total) }) });
      if (this.ringMode === "files") more.dataset.ringAll = "1";
      else more.dataset.open = this.ringPath;
      body.append(more);
    }
  }

  // Show the ring's notes folder in the file explorer, so the notes beyond the few listed are reachable
  async openRingFolder() {
    const folder = this.app.vault.getAbstractFileByPath(this.ringFolder);
    if (!folder) return;
    try {
      const ws = this.app.workspace;
      let leaf = ws.getLeavesOfType("file-explorer")[0];
      if (!leaf) {
        leaf = ws.getLeftLeaf(false);
        await leaf.setViewState({ type: "file-explorer" });
      }
      ws.revealLeaf(leaf);
      const view = leaf.view;
      if (typeof view?.revealInFolder !== "function") throw new Error("no file explorer");
      // Revealing a note inside the folder opens the folder; revealing the folder alone only
      // highlights it. Then make sure it is expanded.
      const inside = (folder.children || []).find((c) => c instanceof TFile);
      view.revealInFolder(inside || folder);
      view.fileItems?.[folder.path]?.setCollapsed?.(false);
    } catch {
      new Notice(T("Open the file explorer and look in “{folder}”.", { folder: this.ringFolder }));
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
          },
          h(
            "button",
            { type: "button", cls: "fav-open", title: file ? file.path : T("Not found — click to create") },
            h("span", { cls: "fav-star", "aria-hidden": "true", text: "★" }),
            h("span", { cls: "fav-name", text: label }),
          ),
          h("button", {
            type: "button",
            cls: "fav-x",
            "data-fav-remove": f.target,
            title: T("Remove from favourites"),
            "aria-label": T("Remove {label} from favourites", { label }),
            text: "×",
          }),
        ),
      );
    }
    list.append(h("button", { cls: "fav-add", id: "fav-add", title: T("Add a favourite"), text: T("+ Add") }));
    if (!favs.length) {
      list.append(
        h("span", {
          cls: "hp-empty fav-hint",
          text: T("Pin the notes you open most. You can also right-click any note → “Add to homepage favourites”."),
        }),
      );
    }
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

    this.$("clips-count").textContent = fmtNum(clips.length);
    if (!clips.length) {
      this.showEmpty(body, T("No clips found in “{folder}”.", { folder: folder || T("(no folder set)") }));
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

    this.$("recent-count").textContent = fmtNum(notes.length);
    if (!notes.length) {
      this.showEmpty(body, T("No notes found."));
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
      list.append(h("a", { cls: "note-item", href: "#", "data-open": f.path }, h("span", { cls: "note-icon", "aria-hidden": "true", text: "📄" }), info));
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
  }

  closeSearch() {
    this.searchToken++;
    clearTimeout(this.timers.search);
    const results = this.$("search-results");
    results.classList.add("hidden");
    results.empty();
    this.$("search-live").textContent = "";
  }

  async runSearch(query) {
    const token = ++this.searchToken;
    const results = this.$("search-results");
    results.classList.remove("hidden");
    results.empty();
    results.createDiv({ cls: "search-status", text: T("↻ Searching…") });

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
      results.createDiv({ cls: "search-status", text: T("No results for “{query}”", { query }) });
      this.$("search-live").textContent = T("No results for “{query}”", { query });
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
          h("span", { cls: "search-result-icon", "aria-hidden": "true", text: "📄" }),
          body,
        ),
      );
    }
    this.$("search-live").textContent = plural(hits.length, "{n} result", "{n} results");
  }

  // ── Hero photo & quote ──

  // Today's photo and quote are cached in the plugin's data file, not browser storage
  cacheGet(key) {
    return this.plugin.settings.cache?.[key] ?? null;
  }
  cacheSet(key, value) {
    const s = this.plugin.settings;
    s.cache = { ...(s.cache ?? {}), [key]: value };
    this.plugin.saveSettings().catch(() => {});
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
          alt: data.alt_description || data.description || T("Nature photo"),
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
      alt: T("Landscape photo of the day"),
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
    img.alt = photo.alt || T("Photo of the day");
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
      appendTemplate(credit, T("Photo by {photographer} on {site}"), {
        photographer: h("a", { href: safeUrl(photo.photographerUrl), text: photo.photographer }),
        site: h("a", { href: safeUrl(photo.photoUrl), text: "Unsplash" }),
      });
    } else {
      appendTemplate(credit, T("Photo from {site}"), {
        site: h("a", { href: safeUrl(photo.photoUrl), text: "Picsum Photos" }),
      });
    }
  }

  fallbackQuote() {
    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86_400_000);
    const list = QUOTES_I18N[LANG] ?? QUOTES;
    return list[dayOfYear % list.length];
  }

  // ZenQuotes needs a credit; Echoes is credited too. Bundled quotes need none.
  displayQuote({ q, a, src }) {
    this.$("quote-text").textContent = q;
    this.$("quote-author").textContent = `— ${a}`;
    const credit = this.$("quote-credit");
    const site = { zenquotes: ["https://zenquotes.io/", "ZenQuotes API"], echoes: ["https://echoes.soferity.com/", "Echoes API"] }[src];
    credit.classList.toggle("hidden", !site);
    credit.empty();
    if (site) credit.append(T("Inspirational quotes provided by") + " ", h("a", { href: site[0], text: site[1] }));
  }

  // Existing English installs keep ZenQuotes; other languages start on the bundled list
  get quoteSource() {
    const v = this.settings.quoteSource;
    return ["zenquotes", "echoes", "bundled"].includes(v) ? v : LANG === "en" ? "zenquotes" : "bundled";
  }

  async fetchZenQuotes() {
    const res = await requestUrl({ url: "https://zenquotes.io/api/today" });
    const d = res.json?.[0];
    return d?.q ? { q: d.q, a: d.a, src: "zenquotes" } : null;
  }

  async fetchEchoes() {
    const res = await requestUrl({ url: `https://echoes.soferity.com/api/quotes/random?lang=${LANG}` });
    const raw = res.json?.data ?? res.json;
    const d = Array.isArray(raw) ? raw[0] : raw;
    const q = d?.quote ?? d?.content;
    return q && d.author ? { q: String(q), a: String(d.author), src: "echoes" } : null;
  }

  async loadQuote() {
    const bar = this.$("quote-bar");
    bar.classList.toggle("hidden", !this.settings.showQuote);
    if (!this.settings.showQuote) return; // no quote, no network request

    const source = this.quoteSource;
    if (source === "bundled") return this.displayQuote({ ...this.fallbackQuote(), src: "builtin" }); // no request

    const today = new Date().toISOString().slice(0, 10);
    const cached = this.cacheGet("quote");
    if (cached?.date === today && cached.source === source && cached.lang === LANG && cached.src) {
      return this.displayQuote(cached);
    }

    this.displayQuote({ ...this.fallbackQuote(), src: "builtin" });
    try {
      const fetched = source === "echoes" ? await this.fetchEchoes() : await this.fetchZenQuotes();
      if (fetched) {
        const quote = { date: today, source, lang: LANG, ...fetched };
        this.cacheSet("quote", quote);
        return this.displayQuote(quote);
      }
    } catch {
      /* use the built-in quote */
    }
    this.cacheSet("quote", { date: today, source, lang: LANG, ...this.fallbackQuote(), src: "builtin" });
  }
}

// ─── Settings tab ─────────────────────────────────────────────────────────────

// The built-in links are stored in English; show them in the current language
function quickLinkLabel(l) {
  const builtin = DEFAULT_QUICK_LINKS.find((d) => d.action === l.action && d.label === l.label);
  return builtin ? T(builtin.label) : l.label;
}

const quickLinksToText = (links) =>
  (links ?? []).map((l) => `${l.icon ?? ""} | ${quickLinkLabel(l)} | ${l.action}`).join("\n");

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

    // Obsidian 1.11+ draws each SettingGroup as one card; older versions get a flat list
    const Group = obsidian.SettingGroup;
    let group = null;
    const startGroup = (heading) => {
      group = null;
      if (Group) {
        group = new Group(containerEl);
        if (heading) group.setHeading(heading);
      } else if (heading) {
        new Setting(containerEl).setName(heading).setHeading();
      }
    };
    const add = () => {
      if (!group) return new Setting(containerEl);
      let created;
      group.addSetting((st) => {
        created = st;
      });
      return created;
    };
    startGroup();

    const save = async (key, value) => {
      s[key] = value;
      await this.plugin.saveSettings();
      this.plugin.refreshViews();
    };
    const text = (name, desc, key, opts = {}) =>
      add()
        .setName(name)
        .setDesc(desc)
        .addText((t) => {
          t.setPlaceholder(opts.placeholder ?? "")
            .setValue(String(s[key] ?? ""))
            .onChange((v) => save(key, opts.number ? Math.max(1, Number(v) || 1) : v.trim()));
          if (opts.password) t.inputEl.type = "password";
          if (opts.suggest && PathSuggest) new PathSuggest(this.app, t.inputEl, opts.suggest);
        });

    text(T("Your name"), T("Shown in the greeting."), "userName", { placeholder: T("e.g. Alex") });

    add()
      .setName(T("Open on startup"))
      .setDesc(T("Open the homepage when Obsidian starts."))
      .addToggle((t) => t.setValue(s.openOnStartup).onChange((v) => save("openOnStartup", v)));

    add()
      .setName(T("Appearance"))
      .setDesc(T("System follows Obsidian's light/dark theme."))
      .addDropdown((d) =>
        d
          .addOptions({ system: T("System"), dark: T("Dark"), light: T("Light") })
          .setValue(s.theme)
          .onChange((v) => save("theme", v)),
      );

    add()
      .setName(T("Clock format"))
      .addDropdown((d) =>
        d
          .addOptions({ "12h": T("12-hour (AM/PM)"), "24h": T("24-hour") })
          .setValue(s.clockFormat)
          .onChange((v) => save("clockFormat", v)),
      );

    add()
      .setName(T("Language"))
      .setDesc(T("Automatic follows Obsidian's language setting."))
      .addDropdown((d) =>
        d
          .addOptions({ auto: T("Automatic"), ...LANGUAGES })
          .setValue(s.language)
          .onChange(async (v) => {
            s.language = v;
            applyLanguage(v);
            await this.plugin.saveSettings();
            this.display();
            try {
              this.plugin.rebuildViews();
            } catch (err) {
              console.error("Genkan: could not rebuild the dashboard", err);
            }
          }),
      );

    add()
      .setName(T("Spelling"))
      .setDesc(T("Automatic follows your device's region. Command names change after you restart Obsidian."))
      .addDropdown((d) =>
        d
          .addOptions({ auto: T("Automatic"), us: T("American (favorite)"), uk: T("British (favourite)") })
          .setValue(s.spelling)
          .onChange((v) => {
            spellingChoice = v;
            save("spelling", v);
          }),
      );

    add()
      .setName(T("First day of the week"))
      .setDesc(T("Automatic follows your device's region."))
      .addDropdown((d) =>
        d
          .addOptions({ auto: T("Automatic"), "0": T("Sunday"), "1": T("Monday"), "6": T("Saturday") })
          .setValue(String(s.weekStart))
          .onChange((v) => save("weekStart", v)),
      );

    const customFont = text(
      T("Custom clock font"), T("The name of a font installed on this device, such as Courier New or Avenir Next. A device without it uses the dashboard font."),
      "clockFontCustom",
      { placeholder: T("Font name") },
    );
    // The custom-font row is last in its card, so take it out of the page when unused
    // (a merely hidden last row would leave the card without its bottom edge)
    const showCustomFont = () => {
      if (s.clockFont === "custom") fontSetting.settingEl.after(customFont.settingEl);
      else customFont.settingEl.remove();
    };
    const fontSetting = add()
      .setName(T("Clock font"))
      .setDesc(T("Uses fonts already on your device. Your Obsidian theme's fonts are available too."))
      .addDropdown((d) =>
        d
          .addOptions(Object.fromEntries(Object.entries(CLOCK_FONTS).map(([k, v]) => [k, T(v)])))
          .setValue(Object.keys(CLOCK_FONTS).includes(s.clockFont) ? s.clockFont : "default")
          .onChange(async (v) => {
            s.clockFont = v;
            await save("clockFont", v);
            showCustomFont();
          }),
      );
    showCustomFont();

    startGroup(T("Folders"));
    text(T("Web Clipper folder"), T("Where the Web Clipper saves notes."), "clipsFolder", {
      placeholder: "Clippings",
    });
    text(
      T("Daily notes folder"), T("Leave blank to use your Daily Notes / Periodic Notes settings."),
      "dailyNotesFolder",
    );
    text(
      T("Data folder"), T("Tasks.md and Quick Note.md are stored here, so Obsidian Sync shares them across devices."),
      "dataFolder",
      { placeholder: "genkan/data" },
    );

    startGroup(T("Content"));
    text(T("Max web clips"), "", "maxClips", { number: true });
    text(T("Max recent notes"), "", "maxRecent", { number: true });

    add()
      .setName(T("On this day"))
      .setDesc(T("Shows notes from this date a week, a month and a year ago, found from their created date. Nothing leaves your device."))
      .addToggle((t) => t.setValue(s.showOnThisDay).onChange((v) => save("showOnThisDay", v)));

    add()
      .setName(T("Time tracker"))
      .setDesc(T("Track time on projects and tasks with timers, set time allocations, see a weekly summary and export reports as CSV, Excel or PDF. Stored in its own note, Time Tracking.md, in the Genkan data folder."))
      .addToggle((t) => t.setValue(s.showTimeTracker).onChange((v) => save("showTimeTracker", v)));

    add()
      .setName(T("Running timer display"))
      .setDesc(T("Show the running timer where you can always see it: in Obsidian's status bar on desktop, or at the top of the dashboard on phones and tablets. Click it to open the task. Needs the Time tracker."))
      .addToggle((t) => t.setValue(s.showTimerStatus).onChange((v) => save("showTimerStatus", v)));

    add()
      .setName(T("Pebble ring notes"))
      .setDesc(T("Show the latest voice notes from your Pebble Index ring."))
      .addToggle((t) => t.setValue(s.showRingNotes).onChange((v) => save("showRingNotes", v)));

    // These mirror the three Obsidian choices in the Pebble app
    const noteSetting = text(
      T("Ring note"), T("The note the ring adds your voice notes to, with entries under headings like “## 2026-10-05 21:55”."),
      "ringNotesFile",
      { placeholder: "Pebble Index.md", suggest: "file" },
    );
    const folderSetting = text(
      T("Ring notes folder"), T("The folder the ring saves each voice note into, one file per note."),
      "ringNotesFolder",
      { placeholder: "Pebble Index", suggest: "folder" },
    );
    const showRingFields = () => {
      noteSetting.settingEl.toggleClass("genkan-hidden", s.ringMode !== "chosen");
      folderSetting.settingEl.toggleClass("genkan-hidden", s.ringMode !== "files");
    };
    const modeSetting = add()
      .setName(T("Where does the ring save notes?"))
      .setDesc(T("Match the Obsidian setting in the Pebble app."))
      .addDropdown((d) =>
        d
          .addOptions({
            main: T("One main note (Pebble Index.md)"),
            chosen: T("An existing note I choose"),
            files: T("A separate file for each note"),
          })
          .setValue(["chosen", "files"].includes(s.ringMode) ? s.ringMode : "main")
          .onChange(async (v) => {
            s.ringMode = v;
            await save("ringMode", v);
            showRingFields();
          }),
      );
    // Keep the mode picker above the field it controls
    noteSetting.settingEl.before(modeSetting.settingEl);
    showRingFields();
    text(T("Max ring notes"), "", "maxRingNotes", { number: true });

    add()
      .setName(T("Photo of the day"))
      .setDesc(T("Shows a landscape photo from Picsum, or from Unsplash if you add a key below. Off means no photo is requested."))
      .addToggle((t) => t.setValue(s.showHero).onChange((v) => save("showHero", v)));
    text(
      T("Unsplash access key"), T("Optional. Enables nature photos from Unsplash with attribution. The key is stored in this plugin's settings file in your vault."),
      "unsplashKey",
      { password: true },
    );
    add()
      .setName(T("Daily quote"))
      .setDesc(T("Shows a quote each day. Off means no quote is shown and none is requested."))
      .addToggle((t) => t.setValue(s.showQuote).onChange((v) => save("showQuote", v)));
    add()
      .setName(T("Quote source"))
      .setDesc(T("ZenQuotes and Echoes are fetched once a day over the network, and ZenQuotes is English only. The bundled list works offline."))
      .addDropdown((d) =>
        d
          .addOptions({
            zenquotes: T("ZenQuotes (English)"),
            echoes: T("Echoes (your language)"),
            bundled: T("Bundled list (your language)"),
          })
          .setValue(["zenquotes", "echoes", "bundled"].includes(s.quoteSource) ? s.quoteSource : LANG === "en" ? "zenquotes" : "bundled")
          .onChange((v) => save("quoteSource", v)),
      );
    add()
      .setName(T("Site icons on web clips"))
      .setDesc(T("Uses Google's favicon service, which receives the domain of each clipped page. Off means no icon requests."))
      .addToggle((t) => t.setValue(s.showFavicons).onChange((v) => save("showFavicons", v)));

    add()
      .setName(T("Quick links"))
      .setDesc(T("One per line: icon | label | action. Actions: command:<command id>, open:<note path>, daily, random, or an https:// URL."))
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
    this.time = new TimeStore(this);
    // The time data is read once the vault is ready; a minute's beat catches a computer that slept
    this.app.workspace.onLayoutReady(() => this.time.load());
    this.registerInterval(window.setInterval(() => this.time.beat(), 60 * 1000));
    const onTime = (f) => {
      if (f.path !== this.time.path) return;
      clearTimeout(this.timeLoadTimer);
      this.timeLoadTimer = setTimeout(() => this.time.load(), 300); // another device saved it
    };
    this.registerEvent(this.app.vault.on("modify", onTime));
    this.registerEvent(this.app.vault.on("create", onTime));
    this.registerView(VIEW_TYPE, (leaf) => new HomepageView(leaf, this));
    this.addRibbonIcon("home", T("Open homepage"), () => this.activateView());
    this.addCommand({
      id: "open-homepage",
      name: T("Open homepage"),
      callback: () => this.activateView(),
    });
    this.addSettingTab(new HomepageSettingTab(this.app, this));
    this.initTimerStatus();

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
      name: T("Add or remove current note from homepage favourites"),
      checkCallback: (checking) => {
        const f = this.app.workspace.getActiveFile();
        if (!f || f.extension !== "md" || this.isDataFile(f)) return false;
        if (!checking) this.toggleFavourite(f);
        return true;
      },
    });
    this.addCommand({
      id: "add-favourite",
      name: T("Add a note to homepage favourites…"),
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
        .setTitle(fav ? T("Remove from homepage favourites") : T("Add to homepage favourites"))
        .setIcon("star")
        .onClick(() => this.toggleFavourite(file)),
    );
  }

  // A ★ button in each note's header: toggles the favourite, lit when it is one
  decorateLeaf(leaf) {
    const view = leaf?.view;
    if (!(view instanceof MarkdownView) || this.stars.has(view)) return;
    const el = view.addAction("star", T("Add or remove from homepage favourites"), () => {
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
      el.setAttribute("aria-label", on ? T("Remove from homepage favourites") : T("Add to homepage favourites"));
    }
  }

  onunload() {
    this.time?.flush();
    for (const el of this.stars?.values() ?? []) el.remove();
    this.stars?.clear();
    clearTimeout(this.favCacheTimer);
  }

  async loadSettings() {
    const saved = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
    spellingChoice = this.settings.spelling;
    applyLanguage(this.settings.language);
    // New installs follow the region's 12/24-hour preference
    if (!saved?.clockFormat) this.settings.clockFormat = locale12h() ? "12h" : "24h";
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
        new Notice(T("{name} is already a favourite", { name: file.basename }));
        return;
      }
      const link = this.app.metadataCache.fileToLinktext(file, "", true);
      const f = await ensureFileIn(this.app, this.favPath);
      await this.app.vault.process(f, (t) => `${t}${t && !t.endsWith("\n") ? "\n" : ""}- [[${link}]]\n`);
      new Notice(T("Added {name} to favourites", { name: file.basename }));
    } catch (err) {
      new Notice(T("Could not add favourite: {error}", { error: err.message }));
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
    new Notice(T("Removed {name} from favourites", { name: file.basename }));
  }

  async saveSettings() {
    // Another device may have pushed a newer shared layout since this one loaded its settings;
    // keep it rather than writing over it
    try {
      const disk = await this.loadData();
      this.adoptSharedLayout(disk && disk.sharedLayout);
    } catch {
      // the file can't be read: save as we are
    }
    await this.saveData(this.settings);
  }

  // Take a shared layout if it is newer than the one held; true when it was
  adoptSharedLayout(incoming) {
    if (!incoming || typeof incoming.version !== "number" || !incoming.layout || typeof incoming.layout !== "object") return false;
    const cur = this.settings.sharedLayout;
    if (cur && incoming.version <= cur.version) return false;
    this.settings.sharedLayout = { layout: normaliseLayout(incoming.layout), version: incoming.version };
    return true;
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

  // Labels are built once per view, so a language change rebuilds each open dashboard
  rebuildViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) leaf.view.rebuild?.();
  }

  // ── The running timer in the status bar ──

  initTimerStatus() {
    this.addCommand({ id: "toggle-timer", name: T("Pause or resume the time tracker timer"), callback: () => this.toggleTimer() });
    this.addCommand({ id: "stop-timer", name: T("Stop the time tracker timer"), callback: () => this.stopTimer() });
    // Phones and tablets have no status bar
    if (Platform.isMobile) return;
    const el = this.addStatusBarItem();
    el.addClass("genkan-status-timer");
    el.setAttribute("role", "button");
    el.tabIndex = 0;
    this.statusDot = el.createSpan({ cls: "genkan-status-dot", attr: { "aria-hidden": "true" } });
    this.statusName = el.createSpan({ cls: "genkan-status-name" });
    this.statusTime = el.createSpan({ cls: "genkan-status-time", attr: { "aria-hidden": "true" } });
    el.addEventListener("click", () => this.openRunningTask());
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.openRunningTask();
      }
    });
    this.statusEl = el;
    this.time.subscribe(() => this.updateTimerStatus());
    this.registerInterval(window.setInterval(() => this.updateTimerStatus(), 1000));
    this.updateTimerStatus();
  }

  updateTimerStatus() {
    const el = this.statusEl;
    if (!el) return;
    const task = this.settings.showTimeTracker && this.settings.showTimerStatus ? this.time.runningTask() : null;
    el.style.display = task ? "" : "none";
    if (!task) return;
    if (this.statusTask !== task.name) {
      this.statusTask = task.name;
      this.statusName.textContent = task.name;
      const label = T("Timer running: {task}. Open it in the time tracker.", { task: task.name });
      el.setAttribute("aria-label", label);
      el.setAttribute("title", label);
    }
    this.statusTime.textContent = ttClock(this.time.taskSecs(task.id));
  }

  async openRunningTask() {
    const task = this.time.runningTask();
    await this.activateView();
    const view = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0]?.view;
    if (!view) return;
    if (task) view.tt?.go({ name: "task", pid: task.pid, tid: task.id });
    view.$("tt-card")?.scrollIntoView?.({ block: "nearest" });
  }

  // For a hotkey: pause what is running, or resume what was paused last
  toggleTimer() {
    const st = this.time;
    const run = st.runningTask();
    if (run) {
      const secs = st.taskSecs(run.id);
      st.pause(run.id, null);
      new Notice(T("Paused {task} at {time}", { task: run.name, time: ttClock(secs) }));
      return;
    }
    const back = st.lastPaused();
    if (!back) {
      new Notice(T("No timer to resume. Start one from the Time tracker card."));
      return;
    }
    st.start(back.id, null);
    new Notice(T("Started the timer for {task}", { task: back.name }));
  }

  stopTimer() {
    const st = this.time;
    const run = st.runningTask() || st.lastPaused();
    if (!run) {
      new Notice(T("No timer is running."));
      return;
    }
    const secs = st.taskSecs(run.id);
    st.stop(run.id, null);
    new Notice(T("Stopped {task} at {time}", { task: run.name, time: ttClock(secs) }));
  }

  refreshViews() {
    this.updateTimerStatus();
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      leaf.view.refreshAll?.(false);
    }
  }
};
