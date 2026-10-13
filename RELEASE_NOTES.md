## Vinylnyl 1.0.0

First release. A floating, always-on-top spinning vinyl widget for YouTube Music — on **macOS, Windows and Linux**.

### Downloads
| | |
|---|---|
| macOS 12+ (Apple Silicon & Intel) | `Vinylnyl.dmg` |
| Windows 10+ | `Vinylnyl-Setup.exe` |
| Linux | `Vinylnyl.AppImage` |
| Browser extension (Chrome, Edge, Brave, Opera, Vivaldi) | `vinylnyl-extension.zip` |
| Browser extension (Firefox) | `vinylnyl-extension-firefox.zip` |

### Features
- Real spinning record with album art, title and artist
- Previous / play-pause / next controls
- Tray / menu bar: show/hide, reset position, quit
- Works with Chrome, Edge, Brave, Opera, Vivaldi and Firefox via a small extension
- Safari on macOS works without the extension (Apple Events)
- 100% local — no account, no cloud. The extension only talks to the app on `127.0.0.1`

### Install
1. Install the app for your OS.
2. Unzip `vinylnyl-extension.zip`, open your browser's extensions page, enable **Developer mode** and **Load unpacked**
   (Firefox: use the Firefox zip, then `about:debugging` → Load Temporary Add-on → `manifest.json`).
3. Play something on music.youtube.com.

The app is not code-signed yet, so the first launch is blocked by the OS:
- **macOS:** open the app once, then System Settings → Privacy & Security → **Open Anyway** (or `xattr -cr /Applications/Vinylnyl.app`).
- **Windows:** SmartScreen → **More info → Run anyway**.

### Known limitations
- The extension is installed manually for now (not on the Chrome Web Store / Firefox Add-ons yet). Firefox only keeps temporary add-ons until restart.
- Linux: the widget needs a compositing window manager for transparency.
