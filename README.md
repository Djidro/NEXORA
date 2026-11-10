# Productivity Hub — Telegram Mini App

Tasks, notes, money (OMR), habits, planner, focus timer, calculator, QR generator and settings in one static app.
Vanilla HTML/CSS/JS. No backend, no database, no login. Data lives in the browser's LocalStorage.

## Files
| File | Purpose |
|---|---|
| index.html | App shell, loads Telegram SDK and QR library |
| style.css | Design system, dark/light themes, safe areas |
| app.js | All modules, router, Telegram integration |
| storage.js | Validated LocalStorage layer, backup/restore |
| manifest.json | Web app manifest |

## 1. Upload to GitHub
1. Create a GitHub account and click **New repository** (name it e.g. `productivity-hub`, set Public).
2. Click **uploading an existing file**, drag in all 6 files (unzipped, at the repo root), then **Commit changes**.

## 2. Enable GitHub Pages
1. Repo → **Settings → Pages**.
2. Source: **Deploy from a branch**, Branch: **main**, folder **/ (root)** → **Save**.
3. After ~1 minute your URL appears: `https://YOUR-USERNAME.github.io/productivity-hub/`
   (must be HTTPS — Telegram requires it).

## 3. Create the bot and connect the Mini App
1. In Telegram open **@BotFather** → `/newbot` → choose a name and a username ending in `bot`.
2. Send `/newapp`, pick your bot, then enter: title `Productivity Hub`, a short description, skip the photo/GIF (or send `/empty`), and paste your GitHub Pages URL. Choose a short name, e.g. `hub`.
   You get a link like `https://t.me/YourBot/hub`.
3. Optional menu button: `/mybots` → your bot → **Bot Settings → Menu Button → Configure menu button** → paste the URL.
4. Open the link on iOS or Android and the app launches inside Telegram.

## Notes
- Data is stored per device/Telegram client. Use **Settings → Export backup / Copy JSON** to move data between devices and **Import** to restore.
- Outside Telegram the app still works in a normal browser, but Telegram features (theme sync, back button, haptics, user name) only activate inside Telegram.
- The QR generator uses the small `qrcode-generator` library from cdnjs. To make the app fully self-hosted, download `qrcode.min.js` into the repo and change the `<script>` tag in `index.html` to `src="qrcode.min.js"`.
- Downloads can be restricted in some Telegram webviews: use **Copy JSON** for backups and press-and-hold the QR image to save it.
- After pushing updates, Telegram may cache the page; close and reopen the Mini App.
