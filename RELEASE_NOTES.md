## Vinylnyl 1.0.0

First release. A floating, always-on-top spinning vinyl widget for YouTube Music.

**macOS only** (macOS 12+, Apple Silicon & Intel). Windows and Linux are not supported yet.

### Features
- Detects YouTube Music playing in Safari, Chrome, Edge, Brave, Vivaldi and Opera
- Real spinning record with album art, title and artist
- Previous / play-pause / next controls
- Menu bar tray: show/hide, reset position, quit
- 100% local — no account, no cloud, no browser extension

### Install
1. Download `Vinylnyl.dmg`, open it and drag Vinylnyl to Applications.
2. The app is not notarized yet, so macOS will block the first launch. Open the app once, then go to
   **System Settings → Privacy & Security → "Open Anyway"**.
   (Or run `xattr -cr /Applications/Vinylnyl.app` in Terminal.)
3. In your browser, enable **"Allow JavaScript from Apple Events"**
   (Chrome: View → Developer, Safari: Develop menu, after enabling it in Settings → Advanced).
4. Allow the Automation prompt when macOS asks Vinylnyl to control your browser.
