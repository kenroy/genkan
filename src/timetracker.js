// ─── Time tracker ─────────────────────────────────────────────────────────────
// Projects hold tasks, and a task's time is a list of sessions (start, end). Everything is derived
// from the sessions, so a total can never drift from them. The data lives in its own file,
// `Time Tracking.json` in the Genkan data folder, apart from the plugin settings; each record carries
// an `u` (updated) stamp and is deleted with a flag, so two devices merge by record instead of one
// overwriting the other.

const TT_COLOURS = ["#7c3aed", "#2563eb", "#0891b2", "#16a34a", "#ca8a04", "#ea580c", "#dc2626", "#db2777"];
const TT_PRIORITIES = ["None", "Low", "Medium", "High"];
const TT_WARN = 0.8; // from here a budget turns amber
const TT_STALE_MS = 15 * 60 * 1000; // a running timer unseen for this long is taken as stopped
const TT_BEAT_SAVE_MS = 5 * 60 * 1000;
const TT_TOMBSTONE_MS = 90 * 24 * 3600 * 1000;

function ttEmpty() {
  return { projects: [], tasks: [], sessions: [], hb: 0 };
}

// The file's text as data; anything unreadable counts as empty
function ttParse(text) {
  try {
    return ttNormalise(JSON.parse(text));
  } catch {
    return ttEmpty();
  }
}

// Accept anything from disk, keep only well-formed records
function ttNormalise(raw) {
  const out = ttEmpty();
  if (!raw || typeof raw !== "object") return out;
  const str = (v, n) => String(v == null ? "" : v).slice(0, n);
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const int = (v, max) => Math.min(max, Math.max(0, Math.round(num(v))));
  const list = (v) => (Array.isArray(v) ? v : []);
  const seen = { projects: new Set(), tasks: new Set(), sessions: new Set() };
  const ok = (kind, r) => {
    if (!r || typeof r.id !== "string" || !r.id || seen[kind].has(r.id)) return false;
    seen[kind].add(r.id);
    return true;
  };
  for (const p of list(raw.projects)) {
    if (!ok("projects", p)) continue;
    out.projects.push({ id: p.id, name: str(p.name, 120), color: TT_COLOURS.includes(p.color) ? p.color : TT_COLOURS[0], alloc: int(p.alloc, 600000), u: num(p.u), del: p.del ? 1 : 0 });
  }
  for (const t of list(raw.tasks)) {
    if (!ok("tasks", t) || typeof t.pid !== "string") continue;
    out.tasks.push({ id: t.id, pid: t.pid, name: str(t.name, 200), notes: str(t.notes, 4000), pri: int(t.pri, 3), alloc: int(t.alloc, 600000), done: !!t.done, paused: !!t.paused, u: num(t.u), del: t.del ? 1 : 0 });
  }
  for (const s of list(raw.sessions)) {
    if (!ok("sessions", s) || typeof s.tid !== "string" || !Number.isFinite(Number(s.s))) continue;
    out.sessions.push({ id: s.id, tid: s.tid, s: Number(s.s), e: s.e == null ? null : num(s.e), u: num(s.u), del: s.del ? 1 : 0 });
  }
  out.hb = num(raw.hb);
  return out;
}

// Union by id; the newer record wins (ties go to `mine`). Old deletions are dropped.
function ttMerge(disk, mine, now = Date.now()) {
  const a = ttNormalise(disk);
  const b = ttNormalise(mine);
  const out = ttEmpty();
  for (const kind of ["projects", "tasks", "sessions"]) {
    const byId = new Map(a[kind].map((r) => [r.id, r]));
    for (const r of b[kind]) {
      const other = byId.get(r.id);
      if (!other || r.u >= other.u) byId.set(r.id, r);
    }
    out[kind] = [...byId.values()].filter((r) => !(r.del && r.u < now - TT_TOMBSTONE_MS));
  }
  out.hb = Math.max(a.hb, b.hb);
  return out;
}

// ─── Time arithmetic ──────────────────────────────────────────────────────────

const ttDayStart = (ms) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};
const ttAddDays = (ms, n) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime();
};
const ttWeekStart = (ms, firstDay) => {
  const day = new Date(ms).getDay();
  return ttAddDays(ttDayStart(ms), -((day - firstDay + 7) % 7));
};
// "2026-10-25" -> local midnight, or null
function ttParseDay(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || "");
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime() : null;
}
const ttIso = (ms) => isoDay(new Date(ms));

// Seconds of a session that fall inside [from, to)
function ttOverlap(s, from, to, now) {
  const a = Math.max(s.s, from);
  const b = Math.min(s.e == null ? now : s.e, to);
  return b > a ? (b - a) / 1000 : 0;
}

const ttPad = (n) => String(n).padStart(2, "0");
function ttClock(secs) {
  const t = Math.max(0, Math.floor(secs));
  return `${Math.floor(t / 3600)}:${ttPad(Math.floor((t % 3600) / 60))}:${ttPad(t % 60)}`;
}
// "2h 05m", "45m", "<1m"
function ttHM(secs) {
  const t = Math.max(0, Math.round(secs / 60));
  if (!t) return secs > 0 ? "<1m" : "0m";
  const h = Math.floor(t / 60);
  return h ? `${h}h ${ttPad(t % 60)}m` : `${t}m`;
}
const ttHours = (secs) => Math.round((secs / 3600) * 100) / 100;
const ttHoursText = (secs) => fmtNum(ttHours(secs));
const ttClockOfDay = (ms) => `${ttPad(new Date(ms).getHours())}:${ttPad(new Date(ms).getMinutes())}`;

// Where a budget stands: used and allocated (minutes). null when nothing is allocated.
function ttBudget(usedSecs, allocMin) {
  if (!allocMin) return null;
  const total = allocMin * 60;
  const pct = usedSecs / total;
  return { pct, left: total - usedSecs, state: pct > 1 ? "over" : pct >= TT_WARN ? "warn" : "ok" };
}

function ttBudgetText(b) {
  return b.left >= 0 ? T("{time} left", { time: ttHM(b.left) }) : T("{time} over", { time: ttHM(-b.left) });
}

// ─── Data and operations ──────────────────────────────────────────────────────

class TimeStore {
  constructor(plugin) {
    this.plugin = plugin;
    this.data = ttEmpty();
    this.loaded = false;
    this.listeners = new Set();
    this.lastBeat = Date.now();
    this.saveTimer = null;
    this.writing = Promise.resolve();
  }

  // The time data has a file of its own in the Genkan data folder, apart from the plugin settings
  get path() {
    return joinPath(this.plugin.settings.dataFolder, "Time Tracking.json");
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify(origin) {
    for (const fn of [...this.listeners]) fn(origin);
  }

  // Changed in this window: tell the other views, and save soon
  commit(origin) {
    this.notify(origin);
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.save(), 400);
  }

  // Write now if a change is waiting
  flush() {
    if (this.saveTimer) return this.save();
  }

  // Merge into whatever is in the file (it may have been changed by another device) and write it
  // back in one step, so nothing another device saved is overwritten
  save() {
    clearTimeout(this.saveTimer);
    this.saveTimer = null;
    this.writing = this.writing.then(async () => {
      try {
        const file = await ensureFileIn(this.plugin.app, this.path);
        let merged = this.data;
        await this.plugin.app.vault.process(file, (text) => {
          merged = ttMerge(ttParse(text), this.data);
          return JSON.stringify(merged);
        });
        this.take(merged);
      } catch (err) {
        console.error("Genkan: could not save time tracking", err);
        if (!this.warned) new Notice(T("Could not save the time tracker's data."));
        this.warned = true;
      }
    });
    return this.writing;
  }

  // Use merged data, telling the views only when it differs from what they show
  take(merged) {
    if (JSON.stringify(merged) === JSON.stringify(this.data)) return false;
    this.data = merged;
    this.notify(null);
    return true;
  }

  // Take in what is in the file (on start, and when it changes from another device)
  async load() {
    try {
      const file = this.plugin.app.vault.getAbstractFileByPath(this.path);
      if (file instanceof TFile) this.take(ttMerge(ttParse(await this.plugin.app.vault.read(file)), this.data));
    } catch (err) {
      console.error("Genkan: could not read time tracking", err);
    }
    if (!this.loaded) {
      this.loaded = true;
      this.recover();
    }
    this.notify(null);
  }

  reload() {
    return this.load();
  }

  stamp(rec) {
    rec.u = Math.max(Date.now(), (rec.u || 0) + 1);
    return rec;
  }

  // ── Reading ──
  projects() {
    return this.data.projects.filter((p) => !p.del);
  }
  project(id) {
    return this.data.projects.find((p) => p.id === id && !p.del) || null;
  }
  tasks(pid) {
    return this.data.tasks.filter((t) => t.pid === pid && !t.del);
  }
  task(id) {
    return this.data.tasks.find((t) => t.id === id && !t.del) || null;
  }
  sessions(tid) {
    return this.data.sessions.filter((s) => s.tid === tid && !s.del);
  }
  running() {
    return this.data.sessions.find((s) => s.e == null && !s.del && this.task(s.tid)) || null;
  }
  runningTask() {
    const s = this.running();
    return s ? this.task(s.tid) : null;
  }

  // The task paused most recently, for a "resume" shortcut
  lastPaused() {
    let best = null;
    let at = -1;
    for (const task of this.data.tasks) {
      if (task.del || !task.paused || task.done) continue;
      const end = this.sessions(task.id).reduce((n, x) => Math.max(n, x.e || 0), 0);
      if (end > at) {
        at = end;
        best = task;
      }
    }
    return best;
  }

  // Seconds per task id in [from, to)
  secsByTask(from = 0, to = Infinity, now = Date.now()) {
    const live = new Set(this.data.tasks.filter((t) => !t.del).map((t) => t.id));
    const map = new Map();
    for (const s of this.data.sessions) {
      if (s.del || !live.has(s.tid)) continue;
      const secs = ttOverlap(s, from, to, now);
      if (secs) map.set(s.tid, (map.get(s.tid) || 0) + secs);
    }
    return map;
  }

  taskSecs(tid, from = 0, to = Infinity, now = Date.now()) {
    let t = 0;
    for (const s of this.sessions(tid)) t += ttOverlap(s, from, to, now);
    return t;
  }

  projectSecs(pid, from = 0, to = Infinity, now = Date.now()) {
    const map = this.secsByTask(from, to, now);
    let t = 0;
    for (const task of this.tasks(pid)) t += map.get(task.id) || 0;
    return t;
  }

  // A project's own allocation, or failing that the tasks' allocations added up
  projectAlloc(p) {
    if (p.alloc) return p.alloc;
    return this.tasks(p.id).reduce((n, t) => n + (t.alloc || 0), 0);
  }

  // ── Changing ──
  addProject(name, origin) {
    const p = this.stamp({ id: newId(), name: name.trim().slice(0, 120), color: TT_COLOURS[this.data.projects.length % TT_COLOURS.length], alloc: 0, u: 0, del: 0 });
    this.data.projects.push(p);
    this.commit(origin);
    return p;
  }

  addTask(pid, name, origin) {
    const t = this.stamp({ id: newId(), pid, name: name.trim().slice(0, 200), notes: "", pri: 0, alloc: 0, done: false, paused: false, u: 0, del: 0 });
    this.data.tasks.push(t);
    this.commit(origin);
    return t;
  }

  update(rec, fields, origin) {
    Object.assign(rec, fields);
    this.stamp(rec);
    this.commit(origin);
  }

  removeProject(id, origin) {
    const p = this.project(id);
    if (!p) return;
    for (const t of this.tasks(id)) this.removeTask(t.id, origin, true);
    p.del = 1;
    this.stamp(p);
    this.commit(origin);
  }

  removeTask(id, origin, quiet) {
    const t = this.task(id);
    if (!t) return;
    for (const s of this.sessions(id)) {
      if (s.e == null) s.e = Date.now();
      s.del = 1;
      this.stamp(s);
    }
    t.del = 1;
    this.stamp(t);
    if (!quiet) this.commit(origin);
  }

  removeSession(id, origin) {
    const s = this.data.sessions.find((x) => x.id === id && !x.del);
    if (!s) return;
    if (s.e == null) s.e = Date.now();
    s.del = 1;
    this.stamp(s);
    this.commit(origin);
  }

  // Time entered by hand for a timer that was never started
  addSession(tid, from, to, origin) {
    const t = this.task(tid);
    if (!t || !(to > from)) return null;
    const s = this.stamp({ id: newId(), tid, s: from, e: to, u: 0, del: 0 });
    this.data.sessions.push(s);
    this.commit(origin);
    return s;
  }

  closeSession(s, at) {
    s.e = Math.max(s.s, at);
    this.stamp(s);
  }

  // Only one timer runs at a time: starting one pauses the other
  start(tid, origin) {
    const t = this.task(tid);
    if (!t) return;
    const run = this.running();
    if (run && run.tid === tid) return;
    if (run) this.pause(run.tid, origin, true);
    const now = Date.now();
    this.data.sessions.push(this.stamp({ id: newId(), tid, s: now, e: null, u: 0, del: 0 }));
    t.paused = false;
    this.stamp(t);
    this.data.hb = now;
    this.lastBeat = now;
    this.commit(origin);
  }

  pause(tid, origin, quiet) {
    const t = this.task(tid);
    if (!t) return;
    for (const s of this.sessions(tid)) if (s.e == null) this.closeSession(s, Date.now());
    t.paused = true;
    this.stamp(t);
    if (!quiet) this.commit(origin);
  }

  stop(tid, origin) {
    const t = this.task(tid);
    if (!t) return;
    for (const s of this.sessions(tid)) if (s.e == null) this.closeSession(s, Date.now());
    t.paused = false;
    this.stamp(t);
    this.commit(origin);
  }

  // A timer left running while Obsidian was closed or the computer slept would count the whole
  // gap. Close it at the last moment we know it was running, and say so.
  recover(now = Date.now()) {
    const run = this.running();
    if (!run) return;
    const seen = Math.max(this.data.hb || 0, run.s, this.localBeat(run.id), this.lastBeat < now - TT_STALE_MS ? this.lastBeat : 0);
    if (now - seen <= TT_STALE_MS) return;
    const task = this.task(run.tid);
    this.closeSession(run, seen);
    if (task) {
      task.paused = true;
      this.stamp(task);
      new Notice(T("Paused {task}: Obsidian was closed or the computer was asleep. The timer stopped at {time}.", { task: task.name, time: ttClockOfDay(seen) }), 10000);
    }
    this.commit(null);
  }

  // The last minute this device saw the session running (kept on this device only, so it costs no sync)
  localBeat(sid, set) {
    const app = this.plugin.app;
    try {
      if (set) app.saveLocalStorage("genkan-beat", { sid, t: set });
      else {
        const v = app.loadLocalStorage("genkan-beat");
        return v && v.sid === sid ? Number(v.t) || 0 : 0;
      }
    } catch {
      // no local storage here
    }
    return 0;
  }

  // Once a minute from the plugin, whether or not a dashboard is open
  beat(now = Date.now()) {
    const run = this.running();
    if (run) {
      if (now - this.lastBeat > TT_STALE_MS) {
        // The clock jumped: the computer slept. Count up to the last beat, not the whole gap.
        this.recover(now);
        this.lastBeat = now;
        return;
      }
      this.localBeat(run.id, now);
      if (now - (this.data.hb || 0) >= TT_BEAT_SAVE_MS) {
        this.data.hb = now;
        this.save();
      }
    }
    this.lastBeat = now;
  }
}

// ─── Reports and files ────────────────────────────────────────────────────────

// Time per project and task in [from, to), and the sessions behind it split at midnight
function ttReport(store, { pid = "", from, to, now = Date.now() }) {
  const inRange = store.secsByTask(from, to, now);
  const all = store.secsByTask(0, Infinity, now);
  const projects = [];
  for (const p of store.projects()) {
    if (pid && p.id !== pid) continue;
    const tasks = store
      .tasks(p.id)
      .map((t) => ({ t, secs: inRange.get(t.id) || 0, usedAll: all.get(t.id) || 0 }))
      .filter((x) => x.secs > 0);
    const secs = tasks.reduce((n, x) => n + x.secs, 0);
    if (!pid && !secs) continue;
    projects.push({ p, tasks, secs, alloc: store.projectAlloc(p), usedAll: store.projectSecs(p.id, 0, Infinity, now) });
  }
  const names = new Map();
  for (const x of projects) for (const y of x.tasks) names.set(y.t.id, { p: x.p, t: y.t });
  const rows = [];
  for (const s of store.data.sessions) {
    const own = names.get(s.tid);
    if (s.del || !own) continue;
    let a = Math.max(s.s, from);
    const b = Math.min(s.e == null ? now : s.e, to);
    while (a < b) {
      const next = Math.min(b, ttAddDays(a, 1));
      rows.push({ p: own.p, t: own.t, day: ttDayStart(a), s: a, e: next, secs: (next - a) / 1000 });
      a = next;
    }
  }
  rows.sort((x, y) => x.s - y.s);
  return { from, to, projects, rows, total: projects.reduce((n, x) => n + x.secs, 0) };
}

const ttFileLabel = (rep, pid, store) => {
  const who = pid ? store.project(pid)?.name || "" : T("All projects");
  const last = ttIso(rep.to - 1);
  return `${T("Time report")} - ${who} - ${ttIso(rep.from)} ${T("to")} ${last}`.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim().slice(0, 120);
};

// A cell that opens in a spreadsheet as a formula would run; the apostrophe keeps it text
function csvCell(v) {
  if (typeof v === "number") return String(v);
  let s = String(v == null ? "" : v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function ttCsv(rep) {
  const head = [T("Project"), T("Task"), T("Date"), T("Start"), T("End"), T("Duration"), T("Hours")];
  const lines = [head.map(csvCell).join(",")];
  for (const r of rep.rows) {
    lines.push([r.p.name, r.t.name, ttIso(r.day), ttClockOfDay(r.s), r.e >= ttAddDays(r.day, 1) ? "24:00" : ttClockOfDay(r.e), ttClock(r.secs), ttHours(r.secs)].map(csvCell).join(","));
  }
  lines.push(["", T("Total"), "", "", "", ttClock(rep.total), ttHours(rep.total)].map(csvCell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`; // the BOM makes Excel read it as UTF-8
}

// ── ZIP (stored, no compression) and the .xlsx written on top of it ──

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zipStore(files, when = new Date()) {
  const enc = new TextEncoder();
  const time = (when.getHours() << 11) | (when.getMinutes() << 5) | (when.getSeconds() >> 1);
  const date = ((Math.max(1980, when.getFullYear()) - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate();
  const parts = [];
  const central = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = typeof f.data === "string" ? enc.encode(f.data) : f.data;
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // names are UTF-8
    local.setUint16(8, 0, true); // stored
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);
    parts.push(new Uint8Array(local.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true);
    c.setUint16(12, time, true);
    c.setUint16(14, date, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, data.length, true);
    c.setUint32(24, data.length, true);
    c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const cdSize = central.reduce((n, p) => n + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of all) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

const xmlEsc = (s) =>
  String(s == null ? "" : s)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const xlsxCol = (i) => {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

// Cell styles: 0 plain, 1 bold header, 2 [h]:mm:ss, 3 0.00, 4 date, 5 bold 0.00, 6 bold
// A cell is a string, a number, or { v, s } to pick a style; null leaves it empty.
function xlsxSheet(rows, widths) {
  const out = [`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>`];
  widths.forEach((w, i) => out.push(`<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`));
  out.push("</cols><sheetData>");
  rows.forEach((row, r) => {
    out.push(`<row r="${r + 1}">`);
    row.forEach((cell, c) => {
      if (cell == null || cell === "") return;
      const ref = `${xlsxCol(c)}${r + 1}`;
      const v = typeof cell === "object" ? cell.v : cell;
      const s = typeof cell === "object" && cell.s ? ` s="${cell.s}"` : "";
      if (typeof v === "number") out.push(`<c r="${ref}"${s}><v>${v}</v></c>`);
      else out.push(`<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`);
    });
    out.push("</row>");
  });
  out.push("</sheetData></worksheet>");
  return out.join("");
}

const xlsxSerial = (ms) => {
  const d = new Date(ms);
  return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / 86400000);
};

function ttXlsx(rep) {
  const H = (v) => ({ v, s: 1 });
  const sessions = [[H(T("Project")), H(T("Task")), H(T("Date")), H(T("Start")), H(T("End")), H(T("Duration")), H(T("Hours"))]];
  for (const r of rep.rows) {
    sessions.push([r.p.name, r.t.name, { v: xlsxSerial(r.day), s: 4 }, ttClockOfDay(r.s), r.e >= ttAddDays(r.day, 1) ? "24:00" : ttClockOfDay(r.e), { v: r.secs / 86400, s: 2 }, { v: ttHours(r.secs), s: 3 }]);
  }
  sessions.push([null, { v: T("Total"), s: 6 }, null, null, null, { v: rep.total / 86400, s: 7 }, { v: ttHours(rep.total), s: 5 }]);

  const summary = [[H(T("Project")), H(T("Task")), H(T("Allocated (hours)")), H(T("Tracked in range (hours)")), H(T("Tracked all time (hours)")), H(T("Remaining (hours)"))]];
  for (const x of rep.projects) {
    const left = x.alloc ? ttHours(x.alloc * 60 - x.usedAll) : null;
    summary.push([{ v: x.p.name, s: 6 }, null, x.alloc ? { v: ttHours(x.alloc * 60), s: 5 } : null, { v: ttHours(x.secs), s: 5 }, { v: ttHours(x.usedAll), s: 5 }, left == null ? null : { v: left, s: 5 }]);
    for (const y of x.tasks) {
      const tl = y.t.alloc ? ttHours(y.t.alloc * 60 - y.usedAll) : null;
      summary.push([null, y.t.name, y.t.alloc ? { v: ttHours(y.t.alloc * 60), s: 3 } : null, { v: ttHours(y.secs), s: 3 }, { v: ttHours(y.usedAll), s: 3 }, tl == null ? null : { v: tl, s: 3 }]);
    }
  }
  summary.push([{ v: T("Total"), s: 6 }, null, null, { v: ttHours(rep.total), s: 5 }]);

  const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
  const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const sheetNames = [T("Sessions"), T("Summary")].map((n) => n.replace(/[\\/?*[\]:]/g, "").slice(0, 31) || "Sheet");
  if (sheetNames[0] === sheetNames[1]) sheetNames[1] += " 2";
  const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  return zipStore([
    { name: "[Content_Types].xml", data: `${xml}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
    { name: "_rels/.rels", data: `${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", data: `${xml}<workbook ${NS} xmlns:r="${REL}"><sheets><sheet name="${xmlEsc(sheetNames[0])}" sheetId="1" r:id="rId1"/><sheet name="${xmlEsc(sheetNames[1])}" sheetId="2" r:id="rId2"/></sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", data: `${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${REL}/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="${REL}/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/styles.xml", data: `${xml}<styleSheet ${NS}><numFmts count="1"><numFmt numFmtId="164" formatCode="[h]:mm:ss"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="8"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="2" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>` },
    { name: "xl/worksheets/sheet1.xml", data: xlsxSheet(sessions, [24, 30, 12, 8, 8, 12, 9]) },
    { name: "xl/worksheets/sheet2.xml", data: xlsxSheet(summary, [24, 30, 16, 22, 22, 18]) },
  ]);
}

// ── PDF: Helvetica from the standard set, so nothing is embedded ──

// Widths of the printable ASCII characters (32..126) in Helvetica, per 1000 units
const PDF_W = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
// Typographic characters that exist in the PDF's WinAnsi encoding but are not Latin-1
const PDF_WIN = { "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "–": 0x96, "—": 0x97, "•": 0x95, "›": 0x9b, "…": 0x85, "€": 0x80 };

// Each character as one byte (a "binary string"); what the font can't show becomes "?"
function pdfBytes(s) {
  let out = "";
  for (const ch of String(s)) {
    const c = ch.codePointAt(0);
    if (c >= 32 && c < 127) out += ch;
    else if (c >= 160 && c <= 255) out += ch;
    else if (PDF_WIN[ch]) out += String.fromCharCode(PDF_WIN[ch]);
    else out += "?";
  }
  return out;
}
const pdfEsc = (s) => pdfBytes(s).replace(/[\\()]/g, (c) => `\\${c}`);
const pdfWidth = (s, size, bold) => {
  let w = 0;
  for (const ch of pdfBytes(s)) {
    const c = ch.charCodeAt(0);
    w += c >= 32 && c < 127 ? PDF_W[c - 32] : 556;
  }
  return ((w * size) / 1000) * (bold ? 1.06 : 1);
};
function pdfFit(s, size, max, bold) {
  s = String(s);
  if (pdfWidth(s, size, bold) <= max) return s;
  while (s.length > 1 && pdfWidth(`${s}…`, size, bold) > max) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}
const pdfRgb = (hex) => [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3)).join(" ");

function ttPdf(rep, store, pid) {
  const letter = /^(US|CA|MX)$/.test(String(LOCALE).split(/[-_]/)[1] || "");
  const W = letter ? 612 : 595;
  const Hgt = letter ? 792 : 842;
  const M = 48;
  const pages = [];
  let ops = [];
  let y = 0;
  const newPage = () => {
    if (ops.length) pages.push(ops.join("\n"));
    ops = [];
    y = Hgt - M;
  };
  const text = (s, x, size, { bold = false, grey = false, right = false, width = 0 } = {}) => {
    let str = width ? pdfFit(s, size, width, bold) : String(s);
    const px = right ? x - pdfWidth(str, size, bold) : x;
    ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${grey ? "0.35 0.35 0.4" : "0 0 0"} rg ${px.toFixed(1)} ${y.toFixed(1)} Td (${pdfEsc(str)}) Tj ET`);
  };
  const rect = (x, yy, w, hh, rgb) => ops.push(`${rgb} rg ${x.toFixed(1)} ${yy.toFixed(1)} ${w.toFixed(1)} ${hh.toFixed(1)} re f`);
  const rule = () => ops.push(`0.8 0.8 0.84 RG 0.5 w ${M} ${(y - 4).toFixed(1)} m ${W - M} ${(y - 4).toFixed(1)} l S`);
  const room = (n) => {
    if (y - n < M) newPage();
  };

  newPage();
  const who = pid ? store.project(pid)?.name || "" : T("All projects");
  text(T("Time report"), M, 20, { bold: true });
  y -= 22;
  text(who, M, 12, { bold: true, width: W - 2 * M });
  y -= 15;
  text(`${fmtDate(new Date(rep.from))} – ${fmtDate(new Date(rep.to - 1))}`, M, 10, { grey: true });
  y -= 13;
  text(T("Generated {date}", { date: fmtDate(new Date()) }), M, 9, { grey: true });
  y -= 26;

  // Summary: each project with its budget bar, then its tasks
  const cols = { alloc: W - M - 230, used: W - M - 150, left: W - M };
  text(T("Summary"), M, 13, { bold: true });
  y -= 18;
  text(T("Project / task"), M, 9, { bold: true, grey: true });
  text(T("Allocated"), cols.alloc, 9, { bold: true, grey: true, right: true });
  text(T("Tracked"), cols.used, 9, { bold: true, grey: true, right: true });
  text(T("Remaining"), cols.left, 9, { bold: true, grey: true, right: true });
  rule();
  y -= 16;
  if (!rep.projects.length) {
    text(T("No time was tracked in this period."), M, 10, { grey: true });
    y -= 16;
  }
  for (const x of rep.projects) {
    room(48 + x.tasks.length * 14);
    const b = ttBudget(x.usedAll, x.alloc);
    rect(M, y - 1, 8, 8, pdfRgb(x.p.color));
    text(x.p.name, M + 14, 11, { bold: true, width: cols.alloc - M - 90 });
    text(x.alloc ? ttHM(x.alloc * 60) : "–", cols.alloc, 10, { right: true });
    text(ttHM(x.secs), cols.used, 10, { right: true, bold: true });
    text(b ? (b.left >= 0 ? ttHM(b.left) : `-${ttHM(-b.left)}`) : "–", cols.left, 10, { right: true });
    y -= 14;
    if (b) {
      const bw = W - 2 * M - 14;
      rect(M + 14, y, bw, 5, "0.88 0.88 0.9");
      rect(M + 14, y, Math.max(1, Math.min(1, b.pct) * bw), 5, b.state === "over" ? "0.86 0.15 0.15" : b.state === "warn" ? "0.85 0.55 0.05" : "0.13 0.65 0.30");
      y -= 11;
      text(`${Math.round(b.pct * 100)}%  ${ttBudgetText(b)}`, M + 14, 8, { grey: true });
      y -= 14;
    }
    for (const t of x.tasks) {
      room(14);
      const tb = ttBudget(t.usedAll, t.t.alloc);
      text(t.t.name, M + 14, 10, { width: cols.alloc - M - 90 });
      text(t.t.alloc ? ttHM(t.t.alloc * 60) : "–", cols.alloc, 10, { right: true });
      text(ttHM(t.secs), cols.used, 10, { right: true });
      text(tb ? (tb.left >= 0 ? ttHM(tb.left) : `-${ttHM(-tb.left)}`) : "–", cols.left, 10, { right: true });
      y -= 14;
    }
    y -= 6;
  }
  room(24);
  rule();
  y -= 14;
  text(T("Total"), M, 11, { bold: true });
  text(ttHM(rep.total), cols.used, 11, { bold: true, right: true });
  text(`${ttHoursText(rep.total)} ${T("hours")}`, cols.left, 10, { right: true, grey: true });
  y -= 30;

  // Sessions
  if (rep.rows.length) {
    room(60);
    text(T("Sessions"), M, 13, { bold: true });
    y -= 18;
    const head = () => {
      text(T("Date"), M, 9, { bold: true, grey: true });
      text(T("Project / task"), M + 80, 9, { bold: true, grey: true });
      text(T("Time"), W - M - 70, 9, { bold: true, grey: true, right: true });
      text(T("Duration"), W - M, 9, { bold: true, grey: true, right: true });
      rule();
      y -= 15;
    };
    head();
    for (const r of rep.rows) {
      if (y - 14 < M) {
        newPage();
        head();
      }
      text(ttIso(r.day), M, 9);
      text(`${r.p.name} › ${r.t.name}`, M + 80, 9, { width: W - 2 * M - 80 - 150 });
      text(`${ttClockOfDay(r.s)}–${r.e >= ttAddDays(r.day, 1) ? "24:00" : ttClockOfDay(r.e)}`, W - M - 70, 9, { right: true });
      text(ttClock(r.secs), W - M, 9, { right: true });
      y -= 13;
    }
  }
  pages.push(ops.join("\n"));

  // Assemble the objects: 1 catalog, 2 page tree, 3 and 4 fonts, 5 info, then a page and its stream each
  const objs = [];
  const kids = [];
  pages.forEach((_, i) => kids.push(`${6 + i * 2} 0 R`));
  objs[1] = "<< /Type /Catalog /Pages 2 0 R /Lang (en) >>";
  objs[2] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`;
  objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  const d = new Date();
  const stamp = `D:${d.getFullYear()}${ttPad(d.getMonth() + 1)}${ttPad(d.getDate())}${ttPad(d.getHours())}${ttPad(d.getMinutes())}${ttPad(d.getSeconds())}`;
  objs[5] = `<< /Title (${pdfEsc(`${T("Time report")} - ${who}`)}) /Producer (Genkan) /CreationDate (${stamp}) >>`;
  pages.forEach((content, i) => {
    const n = 6 + i * 2;
    objs[n] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${Hgt}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${n + 1} 0 R >>`;
    objs[n + 1] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  });
  let out = "%PDF-1.4\n";
  const offsets = [];
  for (let i = 1; i < objs.length; i++) {
    offsets[i] = out.length;
    out += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xref = out.length;
  out += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objs.length; i++) out += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
  return bytes;
}

// Save a file the way the note export does: the system's save dialog where there is one
async function ttSaveFile(app, name, data, mime, label) {
  const ext = name.slice(name.lastIndexOf(".") + 1);
  const adapter = app.vault.adapter;
  const base = adapter && typeof adapter.getBasePath === "function" ? adapter.getBasePath() : "";
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  try {
    const req = typeof window.require === "function" ? window.require : null;
    let dialog = null;
    try {
      dialog = req && req("electron").remote && req("electron").remote.dialog;
    } catch {
      // the dialog is not available in this build
    }
    if (dialog && base) {
      const res = await dialog.showSaveDialog({
        title: T("Export time report…"),
        defaultPath: req("path").join(base, name),
        filters: [{ name: label, extensions: [ext] }],
        properties: ["createDirectory", "showOverwriteConfirmation"],
      });
      if (res.canceled || !res.filePath) return;
      req("fs").writeFileSync(res.filePath, bytes);
      new Notice(T("Exported to {path}", { path: res.filePath }));
      return;
    }
    if (typeof window.showSaveFilePicker === "function") {
      const handle = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: label, accept: { [mime]: [`.${ext}`] } }] });
      const out = await handle.createWritable();
      await out.write(bytes);
      await out.close();
      new Notice(T("Exported to {path}", { path: handle.name }));
      return;
    }
    const file = new File([bytes], name, { type: mime });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] });
      return;
    }
    let target = name;
    for (let n = 2; app.vault.getAbstractFileByPath(normalizePath(target)); n++) target = name.replace(/(\.\w+)$/, ` ${n}$1`);
    await app.vault.createBinary(normalizePath(target), bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    new Notice(T("Saved a copy in your vault as {name}", { name: target }));
  } catch (err) {
    if (err && err.name === "AbortError") return;
    console.error("Genkan: time report export failed", err);
    new Notice(T("Could not export the time report."));
  }
}

// ─── The card ─────────────────────────────────────────────────────────────────

class TimeTrackerUI {
  constructor(view) {
    this.view = view;
    this.store = view.plugin.time;
    this.screen = { name: "projects" };
    this.live = [];
    this.report = { pid: "", preset: "week", from: "", to: "" };
    this.weekOffset = 0;
    this.unsub = this.store.subscribe((origin) => {
      if (origin !== this) this.render();
    });
  }

  destroy() {
    this.unsub?.();
  }

  get body() {
    return this.view.$("tt-body");
  }

  get firstDay() {
    const s = this.view.settings.weekStart;
    return s === "auto" ? localeWeekStart() : Number(s);
  }

  now() {
    return Date.now();
  }

  go(screen, focus = true) {
    this.screen = screen;
    this.manualOpen = false;
    this.focusHeading = focus;
    this.render();
  }

  say(msg) {
    this.view.announce(msg, "tt-live");
  }

  // Run a change, redraw, and put the focus back on the control that caused it
  act(key, fn) {
    fn();
    this.refocus = key;
    this.render();
  }

  tick() {
    for (const fn of this.live) fn();
  }

  refreshLive() {
    this.tick();
  }

  // Called every second by the dashboard; only a running timer changes anything
  tickRunning() {
    if (this.store.running()) this.tick();
  }

  render() {
    const card = this.view.$("tt-card");
    if (!card) return;
    const enabled = !!this.view.settings.showTimeTracker;
    card.classList.toggle("hidden", !enabled);
    const body = this.body;
    if (!enabled || !body) return;
    const s = this.screen;
    // A screen whose project or task has gone (deleted here or on another device) steps back
    if ((s.name === "project" || s.name === "edit-project") && !this.store.project(s.pid)) this.screen = { name: "projects" };
    if (s.name === "task" && !this.store.task(s.tid)) this.screen = this.store.project(s.pid) ? { name: "project", pid: s.pid } : { name: "projects" };
    const keep = body.contains(document.activeElement) ? document.activeElement.dataset?.k : null;
    const typing = document.activeElement && document.activeElement.matches?.("input, textarea, select") && body.contains(document.activeElement);
    if (typing && !this.refocus && !this.focusHeading) return; // a remote change must not pull the text out from under the cursor
    this.live = [];
    body.empty();
    const name = this.screen.name;
    const draw = { projects: this.drawProjects, project: this.drawProject, task: this.drawTask, "edit-project": this.drawEditProject, week: this.drawWeek, report: this.drawReport }[name];
    draw.call(this, body);
    this.tick();
    const want = this.refocus || keep;
    this.refocus = null;
    if (this.focusHeading) {
      this.focusHeading = false;
      body.querySelector(".tt-title")?.focus();
    } else if (want) {
      body.querySelector(`[data-k="${want}"]`)?.focus();
    }
  }

  // ── Pieces ──

  btn(label, key, fn, { cls = "tt-btn", icon, title, pressed } = {}) {
    const b = h("button", { type: "button", cls, "data-k": key, title: title || label, "aria-label": title || label });
    if (icon) {
      b.append(iconNode(icon));
      if (cls.includes("tt-text")) b.append(h("span", { text: label }));
    } else b.textContent = label;
    if (pressed != null) b.setAttribute("aria-pressed", String(pressed));
    b.addEventListener("click", fn);
    return b;
  }

  // Heading row: back button, title, and anything on the right
  head(title, back, ...right) {
    return h(
      "div",
      { cls: "tt-head" },
      back ? this.btn(T("Back"), "back", back, { cls: "tt-icon", icon: "arrow-left" }) : h("span"),
      h("h3", { cls: "tt-title", tabindex: "-1", text: title }),
      h("div", { cls: "tt-head-right" }, ...right),
    );
  }

  // A budget bar and the words that say the same thing (colour is never the only cue)
  budget(used, alloc, { label = true } = {}) {
    const wrap = h("span", { cls: "tt-budget" });
    const bar = h("span", { cls: "tt-bar-track", "aria-hidden": "true" }, h("span", { cls: "tt-bar-fill" }));
    const txt = h("span", { cls: "tt-budget-text" }, h("span", { cls: "tt-used" }), h("span", { cls: "tt-left" }));
    const set = () => {
      const u = typeof used === "function" ? used() : used;
      const a = typeof alloc === "function" ? alloc() : alloc;
      const b = ttBudget(u, a);
      wrap.dataset.state = b ? b.state : "none";
      wrap.classList.toggle("is-empty", !b);
      bar.firstChild.style.width = `${b ? Math.min(100, Math.round(b.pct * 100)) : 0}%`;
      txt.firstChild.textContent = b ? T("{used} of {total}", { used: ttHM(u), total: ttHM(a * 60) }) : ttHM(u);
      txt.lastChild.textContent = b ? ttBudgetText(b) : T("No time limit");
    };
    wrap.append(bar);
    if (label) wrap.append(txt);
    this.live.push(set);
    return wrap;
  }

  // Today and this week, for the footer (a project, or everything when pid is empty)
  footer(pid) {
    const el = h("div", { cls: "tt-foot" });
    this.live.push(() => {
      const now = this.now();
      const day = ttDayStart(now);
      const week = ttWeekStart(now, this.firstDay);
      const sum = (from) => {
        const map = this.store.secsByTask(from, Infinity, now);
        let t = 0;
        for (const task of this.store.data.tasks) if (!task.del && (!pid || task.pid === pid)) t += map.get(task.id) || 0;
        return t;
      };
      el.textContent = T("{today} today · {week} this week", { today: ttHM(sum(day)), week: ttHM(sum(week)) });
    });
    return el;
  }

  addBox(placeholder, label, onAdd) {
    const input = h("input", { type: "text", cls: "tt-input", placeholder, "aria-label": label, "data-k": "add", maxlength: "200", autocomplete: "off" });
    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.isComposing) return;
      const v = input.value.replace(/\s+/g, " ").trim();
      if (!v) return;
      input.value = "";
      onAdd(v);
    });
    return h("div", { cls: "tt-add" }, input);
  }

  nav(active) {
    const link = (key, label, fn) => this.btn(label, key, fn, { cls: "tt-chip", pressed: active === key });
    return h(
      "div",
      { cls: "tt-nav", role: "group", "aria-label": T("Time tracker views") },
      link("projects", T("Projects"), () => this.go({ name: "projects" })),
      link("week", T("Week"), () => this.go({ name: "week" })),
      link("report", T("Report"), () => this.go({ name: "report" })),
    );
  }

  // ── Projects ──

  drawProjects(body) {
    const st = this.store;
    body.append(this.nav("projects"));
    body.append(h("h3", { cls: "tt-title", tabindex: "-1", text: T("Projects") }));
    body.append(this.addBox(T("New project or company…"), T("New project or company"), (name) => {
      const p = st.addProject(name, this);
      this.say(T("Added project {name}", { name: p.name }));
      this.act("add", () => {});
    }));
    const projects = st.projects().sort((a, b) => a.name.localeCompare(b.name, LOCALE));
    const list = h("div", { cls: "tt-list", role: "list", "aria-label": T("Projects") });
    if (!projects.length) {
      list.append(h("div", { cls: "hp-empty", text: T("No projects yet. Add a client or project to start tracking time.") }));
    }
    for (const p of projects) {
      const run = () => st.runningTask();
      const row = h("button", { type: "button", cls: "tt-row", "data-k": `p-${p.id}` });
      row.style.setProperty("--tt-c", p.color);
      const sub = h("span", { cls: "tt-sub" });
      const total = h("span", { cls: "tt-time" });
      this.live.push(() => {
        const n = st.tasks(p.id).length;
        const r = run();
        const running = r && r.pid === p.id;
        sub.textContent = running ? T("Running: {task}", { task: r.name }) : plural(n, "{n} task", "{n} tasks");
        sub.classList.toggle("is-running", !!running);
        total.textContent = ttHM(st.projectSecs(p.id, 0, Infinity, this.now()));
      });
      row.append(
        h("span", { cls: "tt-swatch", "aria-hidden": "true" }),
        h("span", { cls: "tt-main" }, h("span", { cls: "tt-name", text: p.name || T("Untitled project") }), sub),
        total,
        iconNode("chevron"),
      );
      row.append(this.budget(() => st.projectSecs(p.id, 0, Infinity, this.now()), () => st.projectAlloc(p)));
      row.addEventListener("click", () => this.go({ name: "project", pid: p.id }));
      list.append(h("div", { role: "listitem" }, row));
    }
    body.append(list, this.footer(""));
  }

  // ── One project ──

  drawProject(body) {
    const st = this.store;
    const p = st.project(this.screen.pid);
    body.append(
      this.head(p.name || T("Untitled project"), () => this.go({ name: "projects" }), this.btn(T("Edit project"), "edit", () => this.go({ name: "edit-project", pid: p.id }), { cls: "tt-icon", icon: "settings" })),
    );
    const summary = h("div", { cls: "tt-summary" });
    summary.append(this.budget(() => st.projectSecs(p.id, 0, Infinity, this.now()), () => st.projectAlloc(p)));
    body.append(summary);
    body.append(this.addBox(T("Add a task and press Enter"), T("New task"), (name) => {
      const t = st.addTask(p.id, name, this);
      this.say(T("Added task {name}", { name: t.name }));
      this.act("add", () => {});
    }));
    const tasks = st.tasks(p.id).sort((a, b) => Number(a.done) - Number(b.done) || b.pri - a.pri || a.name.localeCompare(b.name, LOCALE));
    const list = h("div", { cls: "tt-list", role: "list", "aria-label": T("Tasks") });
    if (!tasks.length) list.append(h("div", { cls: "hp-empty", text: T("No tasks yet. Add one above.") }));
    for (const t of tasks) list.append(this.taskRow(t));
    body.append(list, this.footer(p.id));
  }

  taskRow(t) {
    const st = this.store;
    const row = h("div", { cls: t.done ? "tt-task done" : "tt-task", role: "listitem" });
    if (t.pri) row.dataset.pri = String(t.pri);
    const check = h("button", { type: "button", cls: t.done ? "task-check checked" : "task-check", role: "checkbox", "aria-checked": String(t.done), "aria-label": t.name, title: t.done ? T("Mark incomplete") : T("Mark complete"), "data-k": `c-${t.id}` });
    setIconSvg(check, t.done ? "check" : null);
    check.addEventListener("click", () => {
      if (!t.done && st.running()?.tid === t.id) st.stop(t.id, this);
      this.act(`c-${t.id}`, () => st.update(t, { done: !t.done }, this));
    });
    const sub = h("span", { cls: "tt-sub" });
    const open = h("button", { type: "button", cls: "tt-open", "data-k": `t-${t.id}` }, h("span", { cls: "tt-name", text: t.name }), sub);
    open.addEventListener("click", () => this.go({ name: "task", pid: t.pid, tid: t.id }));
    const time = h("span", { cls: "tt-badge" });
    const controls = h("span", { cls: "tt-controls" });
    const paint = () => {
      const running = st.running()?.tid === t.id;
      const secs = st.taskSecs(t.id, 0, Infinity, this.now());
      time.textContent = ttClock(secs);
      time.classList.toggle("is-running", running);
      const pri = t.pri ? `${T(TT_PRIORITIES[t.pri])} ${T("priority")} · ` : "";
      const n = st.sessions(t.id).length;
      sub.textContent = pri + (running ? T("Running") : t.paused ? T("Paused") : n ? plural(n, "{n} session", "{n} sessions") : T("No sessions"));
    };
    this.live.push(paint);
    const running = st.running()?.tid === t.id;
    if (!t.done) {
      if (running) {
        controls.append(this.btn(T("Pause timer: {task}", { task: t.name }), `pause-${t.id}`, () => this.pauseTask(t), { cls: "tt-ctl", icon: "pause" }));
        controls.append(this.btn(T("Stop timer: {task}", { task: t.name }), `stop-${t.id}`, () => this.stopTask(t), { cls: "tt-ctl", icon: "stop" }));
      } else {
        controls.append(this.btn(t.paused ? T("Resume timer: {task}", { task: t.name }) : T("Start timer: {task}", { task: t.name }), `play-${t.id}`, () => this.startTask(t), { cls: "tt-ctl", icon: "play" }));
        if (t.paused) controls.append(this.btn(T("Stop timer: {task}", { task: t.name }), `stop-${t.id}`, () => this.stopTask(t), { cls: "tt-ctl", icon: "stop" }));
      }
    }
    row.append(check, open, time, controls);
    return row;
  }

  startTask(t) {
    this.act(`pause-${t.id}`, () => this.store.start(t.id, this));
    this.say(T("Started the timer for {task}", { task: t.name }));
  }
  pauseTask(t) {
    const secs = this.store.taskSecs(t.id, 0, Infinity, this.now());
    this.act(`play-${t.id}`, () => this.store.pause(t.id, this));
    this.say(T("Paused {task} at {time}", { task: t.name, time: ttClock(secs) }));
  }
  stopTask(t) {
    const secs = this.store.taskSecs(t.id, 0, Infinity, this.now());
    this.act(`play-${t.id}`, () => this.store.stop(t.id, this));
    this.say(T("Stopped {task} at {time}", { task: t.name, time: ttClock(secs) }));
  }

  // ── One task ──

  drawTask(body) {
    const st = this.store;
    const t = st.task(this.screen.tid);
    const p = st.project(t.pid);
    body.append(this.head(t.name, () => this.go({ name: "project", pid: t.pid })));
    body.append(h("div", { cls: "tt-crumb", text: p ? p.name : "" }));

    const clock = h("div", { cls: "tt-clock", role: "timer", "aria-label": T("Total time on this task") });
    const session = h("div", { cls: "tt-session" });
    const stats = h("div", { cls: "tt-stats" });
    const stat = (label) => {
      const v = h("span", { cls: "tt-stat-v" });
      stats.append(h("div", { cls: "tt-stat" }, h("span", { cls: "tt-stat-l", text: label }), v));
      return v;
    };
    const today = stat(T("Today"));
    const total = stat(T("Total"));
    const all = stat(T("All today"));
    this.live.push(() => {
      const now = this.now();
      const day = ttDayStart(now);
      clock.textContent = ttClock(st.taskSecs(t.id, 0, Infinity, now));
      const run = st.running();
      session.textContent = run && run.tid === t.id ? T("This session {time}", { time: ttClock((now - run.s) / 1000) }) : t.paused ? T("Paused") : "";
      today.textContent = ttHM(st.taskSecs(t.id, day, Infinity, now));
      total.textContent = ttHM(st.taskSecs(t.id, 0, Infinity, now));
      let a = 0;
      for (const v of st.secsByTask(day, Infinity, now).values()) a += v;
      all.textContent = ttHM(a);
    });
    body.append(h("div", { cls: "tt-clock-box" }, clock, session), stats);

    const running = st.running()?.tid === t.id;
    const ctl = h("div", { cls: "tt-big-controls" });
    if (!t.done) {
      if (running) ctl.append(this.btn(T("Pause"), `pause-${t.id}`, () => this.pauseTask(t), { cls: "tt-btn tt-text", icon: "pause" }));
      else ctl.append(this.btn(t.paused ? T("Resume") : T("Start"), `play-${t.id}`, () => this.startTask(t), { cls: "tt-btn tt-text tt-primary", icon: "play" }));
      if (running || t.paused) ctl.append(this.btn(T("Stop"), `stop-${t.id}`, () => this.stopTask(t), { cls: "tt-btn tt-text", icon: "stop" }));
    } else ctl.append(h("span", { cls: "tt-sub", text: T("Marked done") }));
    body.append(ctl);
    body.append(this.budget(() => st.taskSecs(t.id, 0, Infinity, this.now()), () => t.alloc));

    // Details
    const field = (label, control, id) => h("div", { cls: "tt-field" }, h("label", { for: id, text: label }), control);
    const name = h("input", { type: "text", cls: "tt-input", id: "tt-name", maxlength: "200", "data-k": "name" });
    name.value = t.name;
    name.addEventListener("change", () => {
      const v = name.value.trim();
      if (v) st.update(t, { name: v.slice(0, 200) }, this);
      else name.value = t.name;
    });
    const notes = h("textarea", { cls: "tt-input tt-notes", id: "tt-notes", rows: "3", maxlength: "4000", "data-k": "notes" });
    notes.value = t.notes;
    notes.addEventListener("change", () => st.update(t, { notes: notes.value }, this));
    const pri = h("select", { cls: "tt-input", id: "tt-pri", "data-k": "pri" }, TT_PRIORITIES.map((n, i) => h("option", { value: String(i), text: T(n) })));
    pri.value = String(t.pri);
    pri.addEventListener("change", () => st.update(t, { pri: Number(pri.value) }, this));
    body.append(
      h("div", { cls: "tt-form" }, field(T("Name"), name, "tt-name"), field(T("Notes"), notes, "tt-notes"), field(T("Priority"), pri, "tt-pri"), this.allocField(T("Allocated time"), t.alloc, (mins) => {
        st.update(t, { alloc: mins }, this);
        this.refreshLive();
      })),
    );

    // Sessions
    const sessions = st.sessions(t.id).sort((a, b) => b.s - a.s);
    body.append(h("h4", { cls: "tt-sub-head", text: T("Sessions") }), this.manualForm(t));
    const list = h("div", { cls: "tt-list", role: "list", "aria-label": T("Sessions") });
    if (!sessions.length) list.append(h("div", { cls: "hp-empty", text: T("No sessions") }));
    for (const s of sessions.slice(0, 50)) {
      const short = { month: "short", day: "numeric" };
      const end = s.e == null ? T("now") : ttDayStart(s.e) === ttDayStart(s.s) ? ttClockOfDay(s.e) : `${fmtDate(new Date(s.e), short)}, ${ttClockOfDay(s.e)}`; // a session past midnight names its end day
      const when = `${fmtDate(new Date(s.s), short)}, ${ttClockOfDay(s.s)}–${end}`;
      const dur = h("span", { cls: "tt-time" });
      this.live.push(() => (dur.textContent = ttClock(((s.e == null ? this.now() : s.e) - s.s) / 1000)));
      const del = this.confirmButton(T("Delete session {when}", { when }), `del-${s.id}`, () => {
        this.act("back", () => st.removeSession(s.id, this));
        this.say(T("Deleted the session {when}", { when }));
      });
      list.append(h("div", { cls: "tt-session-row", role: "listitem" }, h("span", { cls: "tt-name", text: when }), dur, del));
    }
    if (sessions.length > 50) list.append(h("div", { cls: "tt-sub", text: T("+ {n} more", { n: fmtNum(sessions.length - 50) }) }));
    body.append(list);
    body.append(h("div", { cls: "tt-danger" }, this.confirmButton(T("Delete task"), "delete", () => {
      st.removeTask(t.id, this);
      this.say(T("Deleted task {name}", { name: t.name }));
      this.go({ name: "project", pid: t.pid });
    }, true)));
  }

  // For a forgotten timer: a day, a start and an end
  manualForm(t) {
    const day = ttIso(this.now());
    const input = (type, id, k, extra = {}) => h("input", { type, cls: "tt-input", id, "data-k": k, ...extra });
    const fromDate = input("date", "tt-msd", "msd", { max: day });
    const fromTime = input("time", "tt-mst", "mst");
    const toDate = input("date", "tt-med", "med", { max: day });
    const toTime = input("time", "tt-met", "met");
    fromDate.value = toDate.value = day;
    let endTouched = false; // until you pick an end date it follows the start date
    const msg = h("div", { cls: "tt-sub tt-msg", role: "alert" });
    const total = h("div", { cls: "tt-sub", "aria-live": "polite" });
    const when = (d, v) => {
      const base = ttParseDay(d);
      const m = /^(\d{2}):(\d{2})$/.exec(v || "");
      if (base == null || !m) return null;
      const b = new Date(base);
      return new Date(b.getFullYear(), b.getMonth(), b.getDate(), Number(m[1]), Number(m[2])).getTime();
    };
    const range = () => [when(fromDate.value, fromTime.value), when(toDate.value, toTime.value)];
    const preview = () => {
      const [a, b] = range();
      total.textContent = a != null && b != null && b > a ? T("This adds {time}", { time: ttHM((b - a) / 1000) }) : "";
    };
    fromDate.addEventListener("change", () => {
      if (!endTouched) toDate.value = fromDate.value;
    });
    toDate.addEventListener("change", () => (endTouched = true));
    for (const el of [fromDate, fromTime, toDate, toTime]) el.addEventListener("input", preview);
    for (const el of [fromDate, fromTime, toDate, toTime]) el.addEventListener("change", preview);
    const add = this.btn(T("Add time"), "madd", () => {
      const [a, b] = range();
      msg.textContent = "";
      if (a == null || b == null) msg.textContent = T("Choose a start and an end, each with a day and a time.");
      else if (b <= a) msg.textContent = T("The end must be after the start. Check the end date.");
      else if (b > this.now()) msg.textContent = T("That time is in the future.");
      else {
        this.store.addSession(t.id, a, b, this);
        this.say(T("Added {time} to {task}", { time: ttHM((b - a) / 1000), task: t.name }));
        this.act("madd", () => {});
      }
    }, { cls: "tt-btn tt-text" });
    const field = (label, control, id) => h("div", { cls: "tt-field" }, h("label", { for: id, text: label }), control);
    const box = h(
      "details",
      { cls: "tt-manual" },
      h("summary", { text: T("Add time manually") }),
      h("div", { cls: "tt-manual-body" },
        h("div", { cls: "tt-dates" }, field(T("Start date"), fromDate, "tt-msd"), field(T("Start time"), fromTime, "tt-mst")),
        h("div", { cls: "tt-dates" }, field(T("End date"), toDate, "tt-med"), field(T("End time"), toTime, "tt-met")),
        total, msg, add),
    );
    box.open = !!this.manualOpen; // stays open while you add several
    box.addEventListener("toggle", () => (this.manualOpen = box.open));
    return box;
  }

  // A button that asks once more before it acts
  confirmButton(label, key, fn, text = false) {
    const b = h("button", { type: "button", cls: text ? "tt-btn tt-text tt-warn" : "tt-icon tt-warn", "data-k": key, title: label, "aria-label": label });
    const reset = () => {
      b.classList.remove("armed");
      if (text) b.textContent = label;
      else setIconSvg(b, "trash");
      b.setAttribute("aria-label", label);
    };
    reset();
    let timer = null;
    b.addEventListener("click", () => {
      if (b.classList.contains("armed")) {
        clearTimeout(timer);
        fn();
        return;
      }
      b.classList.add("armed");
      const sure = T("Confirm: {action}", { action: label });
      if (text) b.textContent = T("Click again to confirm");
      b.setAttribute("aria-label", sure);
      this.say(sure);
      timer = setTimeout(reset, 4000);
    });
    return b;
  }

  // Hours and minutes boxes holding a number of minutes
  allocField(label, minutes, onChange) {
    const hrs = h("input", { type: "number", cls: "tt-input tt-num", min: "0", max: "9999", step: "1", id: "tt-ah", "aria-label": T("Allocated hours"), "data-k": "ah", inputmode: "numeric" });
    const mins = h("input", { type: "number", cls: "tt-input tt-num", min: "0", max: "59", step: "1", id: "tt-am", "aria-label": T("Allocated minutes"), "data-k": "am", inputmode: "numeric" });
    if (minutes) {
      hrs.value = String(Math.floor(minutes / 60));
      mins.value = String(minutes % 60);
    }
    const commit = () => {
      const total = Math.min(600000, Math.max(0, Math.floor(Number(hrs.value) || 0)) * 60 + Math.min(59, Math.max(0, Math.floor(Number(mins.value) || 0))));
      onChange(total);
    };
    hrs.addEventListener("change", commit);
    mins.addEventListener("change", commit);
    return h("div", { cls: "tt-field" }, h("span", { cls: "tt-label", id: "tt-alloc-l", text: label }), h("div", { cls: "tt-alloc", role: "group", "aria-labelledby": "tt-alloc-l" }, hrs, h("span", { cls: "tt-unit", "aria-hidden": "true", text: "h" }), mins, h("span", { cls: "tt-unit", "aria-hidden": "true", text: "m" })));
  }

  // ── Editing a project ──

  drawEditProject(body) {
    const st = this.store;
    const p = st.project(this.screen.pid);
    body.append(this.head(T("Edit project"), () => this.go({ name: "project", pid: p.id })));
    const name = h("input", { type: "text", cls: "tt-input", id: "tt-pname", maxlength: "120", "data-k": "pname" });
    name.value = p.name;
    name.addEventListener("change", () => {
      const v = name.value.trim();
      if (v) st.update(p, { name: v.slice(0, 120) }, this);
      else name.value = p.name;
    });
    const swatches = h("div", { cls: "tt-swatches", role: "radiogroup", "aria-label": T("Colour") });
    const names = [T("Violet"), T("Blue"), T("Teal"), T("Green"), T("Gold"), T("Orange"), T("Red"), T("Pink")];
    TT_COLOURS.forEach((c, i) => {
      const b = h("button", { type: "button", cls: "tt-swatch-btn", role: "radio", "aria-checked": String(p.color === c), "aria-label": names[i], title: names[i], "data-k": `col-${i}` });
      b.style.setProperty("--tt-c", c);
      b.addEventListener("click", () => {
        st.update(p, { color: c }, this);
        swatches.querySelectorAll("[role=radio]").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
      });
      swatches.append(b);
    });
    body.append(
      h("div", { cls: "tt-form" }, h("div", { cls: "tt-field" }, h("label", { for: "tt-pname", text: T("Name") }), name), h("div", { cls: "tt-field" }, h("span", { cls: "tt-label", text: T("Colour") }), swatches), this.allocField(T("Allocated time for the whole project"), p.alloc, (mins) => {
        st.update(p, { alloc: mins }, this);
        this.refreshLive();
      })),
      h("p", { cls: "tt-sub", text: T("Leave this blank to add up the time allocated to each task instead.") }),
      this.budget(() => st.projectSecs(p.id, 0, Infinity, this.now()), () => st.projectAlloc(p)),
      h("div", { cls: "tt-danger" }, this.confirmButton(T("Delete project and its tasks"), "delete", () => {
        st.removeProject(p.id, this);
        this.say(T("Deleted project {name}", { name: p.name }));
        this.go({ name: "projects" });
      }, true)),
    );
  }

  // ── Weekly summary ──

  drawWeek(body) {
    const st = this.store;
    body.append(this.nav("week"));
    const start = ttAddDays(ttWeekStart(this.now(), this.firstDay), this.weekOffset * 7);
    const end = ttAddDays(start, 7);
    const label = `${fmtDate(new Date(start), { month: "short", day: "numeric" })} – ${fmtDate(new Date(end - 1), { month: "short", day: "numeric", year: "numeric" })}`;
    const move = (n) => {
      this.weekOffset = n === 0 ? 0 : this.weekOffset + n;
      this.refocus = n === 0 ? "this" : n < 0 ? "prev" : "next";
      this.render();
    };
    body.append(
      h("h3", { cls: "tt-title", tabindex: "-1", text: T("Weekly summary") }),
      h("div", { cls: "tt-range" },
        this.btn(T("Previous week"), "prev", () => move(-1), { cls: "tt-icon", icon: "arrow-left" }),
        h("span", { cls: "tt-range-label", "aria-live": "polite", text: label }),
        this.btn(T("Next week"), "next", () => move(1), { cls: "tt-icon", icon: "arrow-right" }),
      ),
    );
    if (this.weekOffset) body.append(this.btn(T("This week"), "this", () => move(0), { cls: "tt-chip" }));

    const days = Array.from({ length: 7 }, (_, i) => ttAddDays(start, i));
    const rep = ttReport(st, { from: start, to: end, now: this.now() });
    const perDay = days.map((d) => rep.rows.filter((r) => r.day === d).reduce((n, r) => n + r.secs, 0));
    const max = Math.max(...perDay, 1);
    const chart = h("div", { cls: "tt-week", role: "img", "aria-label": days.map((d, i) => `${fmtDate(new Date(d), { weekday: "long" })} ${ttHM(perDay[i])}`).join(", ") });
    days.forEach((d, i) => {
      const bar = h("div", { cls: "tt-day-bar" });
      bar.style.height = `${Math.max(perDay[i] ? 4 : 0, Math.round((perDay[i] / max) * 100))}%`;
      chart.append(h("div", { cls: "tt-day" }, h("span", { cls: "tt-day-v", text: perDay[i] ? ttHM(perDay[i]) : "" }), h("div", { cls: "tt-day-col" }, bar), h("span", { cls: "tt-day-l", text: fmtDate(new Date(d), { weekday: "short" }) })));
    });
    body.append(chart);

    const list = h("div", { cls: "tt-list", role: "list", "aria-label": T("Time by project") });
    if (!rep.projects.length) list.append(h("div", { cls: "hp-empty", text: T("No time was tracked this week.") }));
    for (const x of rep.projects.sort((a, b) => b.secs - a.secs)) {
      const share = rep.total ? Math.round((x.secs / rep.total) * 100) : 0;
      const row = h("div", { cls: "tt-week-row", role: "listitem" });
      row.style.setProperty("--tt-c", x.p.color);
      const bar = h("div", { cls: "tt-bar-track", "aria-hidden": "true" }, h("div", { cls: "tt-bar-fill" }));
      bar.firstChild.style.width = `${share}%`;
      row.append(h("span", { cls: "tt-swatch", "aria-hidden": "true" }), h("span", { cls: "tt-name", text: x.p.name }), h("span", { cls: "tt-time", text: ttHM(x.secs) }), h("span", { cls: "tt-share", text: `${share}%` }), bar);
      list.append(row);
    }
    body.append(list);
    body.append(h("div", { cls: "tt-total" }, h("span", { text: T("Total") }), h("strong", { text: `${ttHM(rep.total)} (${ttHoursText(rep.total)} ${T("hours")})` })));
    body.append(this.footer(""));
  }

  // ── Report and export ──

  rangeFor(preset) {
    const now = this.now();
    const wk = ttWeekStart(now, this.firstDay);
    const d = new Date(now);
    if (preset === "week") return [wk, ttAddDays(wk, 7)];
    if (preset === "lastweek") return [ttAddDays(wk, -7), wk];
    if (preset === "month") return [new Date(d.getFullYear(), d.getMonth(), 1).getTime(), new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()];
    if (preset === "lastmonth") return [new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime(), new Date(d.getFullYear(), d.getMonth(), 1).getTime()];
    const a = ttParseDay(this.report.from);
    const b = ttParseDay(this.report.to);
    if (a == null || b == null || b < a) return null;
    return [a, ttAddDays(b, 1)];
  }

  currentReport() {
    const r = this.report;
    const range = this.rangeFor(r.preset);
    if (!range) return null;
    return ttReport(this.store, { pid: r.pid, from: range[0], to: range[1], now: this.now() });
  }

  drawReport(body) {
    const st = this.store;
    const r = this.report;
    body.append(this.nav("report"));
    body.append(h("h3", { cls: "tt-title", tabindex: "-1", text: T("Time report") }));
    if (r.pid && !st.project(r.pid)) r.pid = "";
    if (!r.from) {
      const [a, b] = this.rangeFor("week");
      r.from = ttIso(a);
      r.to = ttIso(b - 1);
    }
    const proj = h("select", { cls: "tt-input", id: "tt-rp", "data-k": "rp" }, h("option", { value: "", text: T("All projects") }), st.projects().sort((a, b) => a.name.localeCompare(b.name, LOCALE)).map((p) => h("option", { value: p.id, text: p.name })));
    proj.value = r.pid;
    const presets = { week: T("This week"), lastweek: T("Last week"), month: T("This month"), lastmonth: T("Last month"), custom: T("Custom range") };
    const pre = h("select", { cls: "tt-input", id: "tt-rr", "data-k": "rr" }, Object.entries(presets).map(([k, v]) => h("option", { value: k, text: v })));
    pre.value = r.preset;
    const from = h("input", { type: "date", cls: "tt-input", id: "tt-rf", "data-k": "rf" });
    const to = h("input", { type: "date", cls: "tt-input", id: "tt-rt", "data-k": "rt" });
    from.value = r.from;
    to.value = r.to;
    const dates = h("div", { cls: "tt-dates" }, h("div", { cls: "tt-field" }, h("label", { for: "tt-rf", text: T("From") }), from), h("div", { cls: "tt-field" }, h("label", { for: "tt-rt", text: T("To") }), to));
    dates.classList.toggle("hidden", r.preset !== "custom");
    const result = h("div", { cls: "tt-result", "aria-live": "polite" });
    const exports = h("div", { cls: "tt-exports", role: "group", "aria-label": T("Export") });

    const foot = this.footer("");
    const base = this.live.length;
    const paint = () => {
      this.live.length = base; // the budgets of the last result are gone
      result.empty();
      const rep = this.currentReport();
      for (const b of exports.querySelectorAll("button")) b.disabled = !rep || !rep.rows.length;
      if (!rep) {
        result.append(h("div", { cls: "tt-sub", text: T("Choose a start date that is not after the end date.") }));
        return;
      }
      result.append(h("div", { cls: "tt-total" }, h("span", { text: `${fmtDate(new Date(rep.from))} – ${fmtDate(new Date(rep.to - 1))}` }), h("strong", { text: `${ttHM(rep.total)} (${ttHoursText(rep.total)} ${T("hours")})` })));
      if (!rep.projects.length) result.append(h("div", { cls: "hp-empty", text: T("No time was tracked in this period.") }));
      for (const x of rep.projects) {
        const block = h("div", { cls: "tt-rep-proj" });
        block.style.setProperty("--tt-c", x.p.color);
        block.append(h("div", { cls: "tt-week-row" }, h("span", { cls: "tt-swatch", "aria-hidden": "true" }), h("span", { cls: "tt-name", text: x.p.name }), h("span", { cls: "tt-time", text: ttHM(x.secs) })));
        if (x.alloc) block.append(h("div", { cls: "tt-sub tt-cap", text: T("Budget, all time") }), this.budget(x.usedAll, x.alloc));
        for (const y of x.tasks) block.append(h("div", { cls: "tt-rep-task" }, h("span", { cls: "tt-name", text: y.t.name }), h("span", { cls: "tt-time", text: ttHM(y.secs) })));
        result.append(block);
      }
      this.tick();
    };
    const changed = () => {
      r.pid = proj.value;
      r.preset = pre.value;
      r.from = from.value;
      r.to = to.value;
      dates.classList.toggle("hidden", r.preset !== "custom");
      paint();
    };
    for (const el of [proj, pre, from, to]) el.addEventListener("change", changed);

    const files = [
      ["csv", "CSV", "text/csv"],
      ["xlsx", "Excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
      ["pdf", "PDF", "application/pdf"],
    ];
    for (const [kind, label, mime] of files) {
      exports.append(this.btn(T("Export {format}", { format: label }), `x-${kind}`, () => this.exportReport(kind, mime, label), { cls: "tt-btn tt-text", icon: "export" }));
    }
    body.append(h("div", { cls: "tt-form" }, h("div", { cls: "tt-field" }, h("label", { for: "tt-rp", text: T("Project") }), proj), h("div", { cls: "tt-field" }, h("label", { for: "tt-rr", text: T("Period") }), pre), dates), result, exports);
    paint();
    body.append(foot);
  }

  async exportReport(kind, mime, label) {
    const rep = this.currentReport();
    if (!rep || !rep.rows.length) {
      new Notice(T("There is no tracked time in this period to export."));
      return;
    }
    const base = ttFileLabel(rep, this.report.pid, this.store);
    const data = kind === "csv" ? ttCsv(rep) : kind === "xlsx" ? ttXlsx(rep) : ttPdf(rep, this.store, this.report.pid);
    await ttSaveFile(this.view.app, `${base}.${kind}`, data, mime, label);
  }
}
