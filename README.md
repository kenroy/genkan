# Genkan (Obsidian plugin)

The Obsidian Homepage dashboard as a real plugin: clock, calendar, web clips, recent notes, tasks, quick note, vault search and quick links. It runs on **desktop, iPhone and iPad**, and needs no REST API, ports, API keys or Surfing.

It reads and writes your vault directly, so Obsidian Sync handles the rest:

| File (in the data folder, default `genkan/data/`) | Used for |
|---|---|
| `Tasks.md` | Tasks, as an Obsidian Tasks-style checklist: `- [ ] Buy milk ➕ 2026-10-10 ^id` |
| `Quick Note.md` | The quick note text |

These are the same files the web version wrote, so existing data carries over. Edits made on another device show up live; you can also edit `Tasks.md` by hand (tasks without a `^id` get one automatically).

## Install

1. In your vault, create `.obsidian/plugins/genkan/`.
2. Copy `manifest.json`, `main.js` and `styles.css` into it.
3. In Obsidian: Settings → Community plugins → reload, then enable **Genkan**.
4. Open it from the ribbon icon (home), or the command **Open homepage**.

### Other devices (including iPhone / iPad)

Either repeat the copy on each device, or in Settings → Sync turn on syncing of **installed community plugins** (and the plugin list) so Obsidian Sync installs it for you. Then enable the plugin on the device.

### Several vaults

Install the plugin in each vault. Settings and data are per vault, so there are no ports or keys to keep apart.

## Settings

Settings → Genkan: name, open on startup, appearance (follows Obsidian's theme by default), clock format, Web Clipper / daily notes / data folders, item counts, photo of the day (optional Unsplash key), and quick links.

Quick links are one per line: `icon | label | action`, where action is `command:<command id>`, `open:<note path>`, `daily`, `random` or an `https://` URL.

## Pebble ring notes

An optional **Ring Notes** card shows the latest voice notes from a Pebble Index ring. Turn it on in Settings → Genkan → **Pebble ring notes**, then pick **Where does the ring save notes?** to match the Obsidian setting in the Pebble app:

| Pebble app setting | Genkan setting | What Genkan reads |
|---|---|---|
| One main note | One main note | `Pebble Index.md`. Entries appended under headings like `## 2026-10-05 21:55` |
| An existing note | An existing note I choose | The note you pick (autocomplete). Same heading format; other sections in the note are ignored |
| A separate file for each note | A separate file for each note | Every note in the folder you pick (default `Pebble Index`, the Pebble app's default; use whatever subfolder you chose in the app). Each file's time comes from its frontmatter (`created: 2026-10-11T00:21`, also `date`, `timestamp`, …), else its file name (`2026-10-11 0021`, `2026-10-11 09-15`, `20261011_091530`, …), else when it was created |

Newest first; click an entry to open it (single-note modes scroll to the entry). The card updates live as the ring saves notes. "How many to show" is **Max ring notes**.

## Layout

Wide panes show three columns. Narrower panes (tablet, split view) move Tasks and Quick Note underneath, and phone-width panes use a single column with Tasks and Quick Note first.

## Development

`main.js` and `styles.css` are generated from `../homepage` (the web version) so the two stay visually identical:

```
python3 build.py
```

- `main.template.js` — plugin code (icons and quotes are injected from the web `app.js`)
- `styles.extra.css` — plugin-only CSS (container queries, mobile tweaks)
- the rest of `styles.css` is `../homepage/style.css` scoped under `.hp-root`

Don't edit `main.js` / `styles.css` directly.
