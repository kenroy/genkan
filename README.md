# Genkan

Genkan (玄関) is the entryway of a Japanese home: the place you step in. This plugin is the entryway to your vault, a dashboard homepage for Obsidian that works on desktop, iPhone and iPad.

- **Clock, greeting and date**, with 12 or 24 hour time
- **Search** your whole vault from the homepage (press `/` to focus it)
- **Favourites**: one-click chips for the notes you open most
- **Tasks** and **seven quick notes** (like Tot) that sync with the rest of your vault
- **Calendar** that opens (or creates) your daily notes
- **Web clips** from the Obsidian Web Clipper and your **recent notes**
- **Quick links** to commands, notes or web pages
- **On this day**: an optional card with notes from this date a week, a month and a year ago
- **Ring notes**: an optional card for voice notes from a Pebble Index ring
- A photo of the day and a daily quote (both optional)

It reads and writes your vault directly through Obsidian's own API. There is no server, no account and no API key required.

## Screenshots

Dark and light themes (the dashboard follows Obsidian's theme by default):

![Genkan dashboard in the dark theme](docs/screenshots/dashboard-dark.png)

![Genkan dashboard in the light theme](docs/screenshots/dashboard-light.png)

On a phone it becomes a single column with tasks and the quick notes first:

<img src="docs/screenshots/dashboard-phone.png" alt="Genkan on a phone" width="390">

The quick notes card, in light and dark: seven notes, one per colored dot, with formatting as you type and a footer of counts and the last-saved time.

![The Genkan quick notes card in the light and dark themes](docs/screenshots/quick-notes.png)

The screenshots use sample data.

## Install

**With BRAT:** install the BRAT plugin, choose "Add beta plugin", and enter `kenroy/genkan`.

**Manually:**

1. Download `main.js`, `manifest.json` and `styles.css` from the latest [release](https://github.com/kenroy/genkan/releases).
2. Put them in `<your vault>/.obsidian/plugins/genkan/` (create the folder).
3. In Obsidian, open Settings → Community plugins, reload, and turn on **Genkan**.

Open it from the home icon in the ribbon, or run **Genkan: Open homepage** from the command palette. Turn on **Open on startup** in the settings to make it your landing page.

On iPhone and iPad the plugins folder is hidden. The easy route is to install on a computer and let Obsidian Sync carry the plugin across (Settings → Sync → installed community plugins).

## Using Genkan

### Favourites
Click **+ Add** and pick a note, click the star in any note's header, right-click inside a note, or run **Genkan: Add or remove current note from homepage favourites**. Click the × on a chip to remove it. Favourites are plain `[[wikilinks]]` in `Favourites.md`, so Obsidian keeps them correct when you rename a note, and you can reorder them by editing the file.

### Tasks and the quick note
Tasks are a checklist in `Tasks.md`, written like `- [ ] Buy milk ➕ 2026-10-10 ^id` (compatible with the Tasks plugin). There are seven quick notes, shown as colored dots across the top of the card. The open one is filled and numbered, and a small center dot marks a note that has something in it. The first is `Quick Note.md`, and the rest are `Quick Note 2.md` to `Quick Note 7.md`, created when you first type in them. Click a dot, use the arrow keys on the dots, or press Cmd/Ctrl+1 to 7 while the note has focus to switch. The footer shows the lines, words and characters in the open note and when it was last saved. Each device remembers which note you had open. Because they are normal notes, they sync with the rest of your vault, and changes made on another device appear live. You can edit them by hand; tasks typed without an id get one automatically.

The quick note is a small rich-text editor: the toolbar (and Cmd/Ctrl+B, I, U, K and Shift+X) makes text bold, italic, underlined or struck through, turns lines into headings, bullets or numbered lists, and adds links, and you see the styling as you type. Type `---` and press Enter for a horizontal line. The file is still plain markdown: `**bold**`, `*italic*`, `~~strike~~`, `[links](url)`, `#` headings, `-` and `1.` lists, `---` rules, and `<u>underline</u>` (markdown has no underline). Anything else in the note is kept as typed. If a note holds something the editor could not write back unchanged, it opens as plain text with a short notice instead, so nothing is ever altered behind your back.

By default these live in `genkan/data/`. Change the **Data folder** setting to put them elsewhere.

### Collapsing cards
Click the − beside **Ring notes**, **Web clips**, **Recent notes** or **On this day** to fold a card down to its title (the count stays visible), and the + to open it again. Each device remembers what you collapsed.

### Calendar and daily notes
Click a day to open that day's note, creating it if it does not exist. Genkan uses your Daily Notes or Periodic Notes settings for the folder, date format and template, or the **Daily notes folder** setting if you set one. A dot marks days that have a note.

### Quick links
Edit them in settings, one per line: `icon | label | action`, where the action is `command:<command id>`, `open:<note path>`, `daily`, `random` or an `https://` address.

### On this day
Off by default. Turn on **On this day** in settings to add a card that looks back at this date a week, a month and a year ago, with a section for each (a section with nothing shows "Nothing from this date"). Each shows up to three notes with a one-line preview, then "+ N more". Click one to open it.

A note's date comes from its `created`, `clipped` or `date` property, then from a date in its file name (like `2026-10-11`), then from when the file was created. If more than 20 notes without a date property were created on the same day, as happens after an import or a first sync, that day is ignored so it does not flood the card. Genkan's own data folder is left out. A month ago uses the same day of the previous month (or its last day), and a year ago the same date last year.

### Ring notes (Pebble Index)
Turn on **Pebble ring notes**, then set **Where does the ring save notes?** to match the Obsidian setting in the Pebble app:

| Pebble app setting | Genkan setting | What Genkan reads |
|---|---|---|
| One main note | One main note | `Pebble Index.md`, with entries appended under headings like `## 2026-10-05 21:55` |
| An existing note | An existing note I choose | The note you pick (with autocomplete). Same heading format; other sections of the note are ignored |
| A separate file for each note | A separate file for each note | Every note in the folder you pick (default `Pebble Index`; use the subfolder you chose in the app). Each note's time comes from its frontmatter (`created: 2026-10-11T00:21`, also `date`, `timestamp`, …), else its file name (`2026-10-11 0021`, `2026-10-11 09-15`, …), else when it was created |

Newest first. Click an entry to open it. The card updates live as the ring saves notes, and **Max ring notes** sets how many are shown.

## Languages and regions

Genkan is available in English, French, Spanish, German and Japanese. By default it follows Obsidian's own language setting (Settings → General → Language); the **Language** setting in Genkan overrides it. Other Obsidian languages fall back to English.

- Dates, times, number formatting and the first day of the week follow your device's region as well, so a French device set to Canada gets Canadian French formats. The 12/24-hour clock and the first day of the week can be set explicitly.
- English spelling follows the region: American on US devices ("favorites"), British elsewhere ("favourites"). The **Spelling** setting overrides it.
- Daily quotes: the **Quote source** setting chooses between ZenQuotes (English only), the Echoes API (quotes in your language) and a bundled list in each language that works offline. Existing English installs keep ZenQuotes; other languages start on the bundled list.
- The bundled quotes and proverbs were also written with AI assistance, from memory, so attributions should be checked.
- The translations were written with AI assistance and have not been reviewed by native speakers. Corrections are welcome as issues or pull requests: the text lives in `src/i18n.js`, keyed by the English wording.

## Network use and privacy

Genkan does not collect analytics or telemetry, does not require an account, shows no ads, does not download or run code, and never reads files outside your vault. The contents of your notes are never sent anywhere. The only network requests are below, and each can be turned off.

| Service | When | What it receives | How to turn it off |
|---|---|---|---|
| [ZenQuotes](https://zenquotes.io/) (`zenquotes.io/api/today`) | Once a day, only when **Quote source** is ZenQuotes | Nothing from your vault; the server sees your IP address, as for any web request | Settings → **Daily quote**, or choose another **Quote source** |
| [Echoes API](https://echoes.soferity.com/) (`echoes.soferity.com/api/quotes/random`) | Once a day, only when **Quote source** is Echoes | The language code (such as `fr`); nothing from your vault. The server sees your IP address | Settings → **Daily quote**, or choose another **Quote source** |
| [Unsplash](https://unsplash.com/) (`api.unsplash.com`) | At most once a day (and when you press the photo's refresh button), only if you enter an Unsplash access key | Your access key and fixed nature search terms. The photo itself loads from Unsplash's image servers whenever the dashboard opens, with credit links back to the photographer and Unsplash | Remove the key, or turn off **Photo of the day** |
| [Picsum Photos](https://picsum.photos/) | Whenever the dashboard opens, for the photo, when you have no Unsplash key | An image address seeded with today's date; nothing from your vault | Settings → **Photo of the day** |
| Google favicon service (`www.google.com/s2/favicons`) | When web clips are shown | The **domain** (not the full address, title or contents) of each clipped page, to fetch a small site icon | Settings → **Site icons on web clips** |

Notes:

- The Unsplash key is optional. It is stored in this plugin's settings file (`.obsidian/plugins/genkan/data.json`) in your vault. If you use Obsidian Sync with plugin settings, the key syncs with it, so keep your vault private.
- Quotes from ZenQuotes are credited in the interface, as their free API requires: "Inspirational quotes provided by ZenQuotes API". Echoes quotes are credited the same way. The bundled quotes make no request. If a request fails, a bundled quote is shown.
- To search, list recent notes, offer the favourites picker and match daily notes, Genkan reads the list of note names and paths in your vault through Obsidian's API. It reads a note's contents only for search snippets, ring notes, web clips and the previews on the On this day card, and none of it leaves your device.
- Today's photo and quote are cached in the plugin's own settings file, not in browser storage.
- Links you click (photographer credits, the ZenQuotes and Echoes links, any `https://` quick link) open in your browser.

## Settings

Settings → Genkan: your name, open on startup, appearance (follows Obsidian's light or dark theme by default), clock format and clock font (your Obsidian theme's interface, text or monospace font, the system serif, or the name of any font installed on the device; it never downloads fonts), Web Clipper, daily notes and data folders, how many clips and recent notes to show, On this day, the Pebble ring options, photo of the day and Unsplash key, daily quote, site icons, and quick links.

## Development

The repo has no dependencies besides Python 3 for the build step.

```
python3 build.py
```

- `main.template.js`: the plugin source
- `src/icons.js`, `src/quotes.js`, `src/i18n.js`: the icon, built-in quote and translation data
- `src/base.css` and `styles.extra.css`: the styles. `build.py` scopes `src/base.css` under `.hp-root`, adds `styles.extra.css`, and writes `styles.css`
- `main.js` and `styles.css` are generated; edit the sources above instead

To release, set `version` in `manifest.json` (and add it to `versions.json`), run the build, commit and push, then push a tag that matches the version exactly (for example `git tag 0.1.5 && git push origin 0.1.5`, with no "v"). The `Release` workflow in `.github/workflows/` rebuilds `main.js` and `styles.css`, checks they match what is committed, attests their provenance, and publishes the release with `main.js`, `manifest.json` and `styles.css` attached. To verify a downloaded file: `gh attestation verify main.js --repo kenroy/genkan`.

## Credits and licence

Genkan is released under the [MIT licence](LICENSE).

Quotes by [ZenQuotes](https://zenquotes.io/) and the [Echoes API](https://echoes.soferity.com/). Photos from [Unsplash](https://unsplash.com/) and [Picsum Photos](https://picsum.photos/). Site icons from Google's favicon service.

Genkan is an independent project. It is not affiliated with or endorsed by Obsidian, Pebble or Core Devices. "Pebble" and "Pebble Index" belong to their owners and are used only to describe compatibility.
