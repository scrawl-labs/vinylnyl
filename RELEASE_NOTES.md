## Vinylnyl 1.1.1

### Fixes
- No more broken-image icon on the record label when a track's cover art fails to load. The label now stays empty instead.

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
