## Vinylnyl 1.1.0

Vinylnyl now shows **whatever is playing** — YouTube, YouTube Music, Spotify and more — and on Windows and Linux it
needs **no browser extension** any more.

### What's new
- **Windows:** reads the system media controls directly. Install the app and it just works.
- **Linux:** reads MPRIS through `playerctl` (install it with your package manager). *Not tested on a real Linux desktop yet.*
- **macOS:** unchanged — Safari and Chrome-based browsers via Apple Events.
- The browser extension is now **optional** (Firefox, sharper track info) and also understands regular YouTube pages.
- The widget is no longer YouTube-Music-only: new wording, and it shows any player that reports to the OS.
- Controls (previous / play-pause / next) go to the source that is currently playing, so nothing fires twice.

### Downloads
| | |
|---|---|
| macOS 12+ (Apple Silicon & Intel) | `Vinylnyl.dmg` |
| Windows 10+ | `Vinylnyl-Setup.exe` |
| Linux | `Vinylnyl.AppImage` |
| Optional extension (Chrome, Edge, Brave, Opera, Vivaldi) | `vinylnyl-extension.zip` |
| Optional extension (Firefox) | `vinylnyl-extension-firefox.zip` |

### Install
1. Install the app for your OS and play something.
2. macOS: enable **Allow JavaScript from Apple Events** in your browser (Chrome: View → Developer; Safari: Develop menu).
   Linux: `sudo apt install playerctl` (or your distro's equivalent).

The app is not code-signed yet, so the first launch is blocked by the OS:
- **macOS:** open the app once, then System Settings → Privacy & Security → **Open Anyway** (or `xattr -cr /Applications/Vinylnyl.app`).
- **Windows:** SmartScreen → **More info → Run anyway**.

### Known limitations
- On Windows/Linux the system does not say *which site* is playing, so any media in any app can show up.
- The optional extension is installed manually for now (not on the Chrome Web Store / Firefox Add-ons yet).
