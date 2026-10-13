const { app, BrowserWindow, ipcMain, Tray, nativeImage, screen, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { createBridge } = require('./bridge');
const { createOsMedia } = require('./os-media');

const POS_FILE = path.join(app.getPath('userData'), 'widget-pos.json');
const MAC_DIR = path.join(__dirname, 'mac');

const BROWSERS = [
  { name: 'safari', read: path.join(MAC_DIR, 'read-safari.applescript'), control: path.join(MAC_DIR, 'control-safari.applescript') },
  { name: 'chrome', read: path.join(MAC_DIR, 'read-chrome.applescript'), control: path.join(MAC_DIR, 'control-chrome.applescript') },
  { name: 'edge', read: path.join(MAC_DIR, 'read-edge.applescript'), control: path.join(MAC_DIR, 'control-edge.applescript') },
  { name: 'brave', read: path.join(MAC_DIR, 'read-brave.applescript'), control: path.join(MAC_DIR, 'control-brave.applescript') },
  { name: 'vivaldi', read: path.join(MAC_DIR, 'read-vivaldi.applescript'), control: path.join(MAC_DIR, 'control-vivaldi.applescript') },
  { name: 'opera', read: path.join(MAC_DIR, 'read-opera.applescript'), control: path.join(MAC_DIR, 'control-opera.applescript') }
];

let mainWindow = null;
let tray = null;
let lastDataAt = 0;
let isConnected = false;
let pollTimer = null;
let watchdogTimer = null;

function loadPosition() {
  try {
    const raw = fs.readFileSync(POS_FILE, 'utf8');
    const pos = JSON.parse(raw);
    if (typeof pos.x === 'number' && typeof pos.y === 'number') return pos;
  } catch (e) {}
  return null;
}

function savePosition() {
  if (!mainWindow) return;
  const [x, y] = mainWindow.getPosition();
  try {
    fs.writeFileSync(POS_FILE, JSON.stringify({ x, y }));
  } catch (e) {}
}

const WIDGET_WIDTH = 250;
const WIDGET_HEIGHT = 320;
const EDGE_MARGIN = 24; // keep at least this many px of the widget on-screen

function clampToWorkArea(x, y) {
  const display = screen.getDisplayMatching({ x, y, width: WIDGET_WIDTH, height: WIDGET_HEIGHT });
  const wa = display.workArea;
  const minX = wa.x - WIDGET_WIDTH + EDGE_MARGIN;
  const maxX = wa.x + wa.width - EDGE_MARGIN;
  const minY = wa.y; // never let the top go above the menu bar / screen top
  const maxY = wa.y + wa.height - EDGE_MARGIN;
  return {
    x: Math.min(Math.max(x, minX), maxX),
    y: Math.min(Math.max(y, minY), maxY)
  };
}

function createWindow() {
  const saved = loadPosition();
  const primary = screen.getPrimaryDisplay();
  const defaultX = Math.round(primary.workArea.x + primary.workArea.width - WIDGET_WIDTH - 40);
  const defaultY = Math.round(primary.workArea.y + 60);

  const initial = saved ? clampToWorkArea(saved.x, saved.y) : { x: defaultX, y: defaultY };

  mainWindow = new BrowserWindow({
    width: WIDGET_WIDTH,
    height: WIDGET_HEIGHT,
    x: initial.x,
    y: initial.y,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setAlwaysOnTop(true, 'floating');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  let saveTimer = null;
  let clamping = false;
  mainWindow.on('move', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (!mainWindow || clamping) return;
      const [x, y] = mainWindow.getPosition();
      const clamped = clampToWorkArea(x, y);
      if (clamped.x !== x || clamped.y !== y) {
        clamping = true;
        mainWindow.setPosition(clamped.x, clamped.y, true);
        clamping = false;
      }
      savePosition();
    }, 350);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  let icon;
  if (process.platform === 'darwin') {
    icon = nativeImage.createFromPath(path.join(__dirname, 'tray', 'iconTemplate.png'));
    icon.setTemplateImage(true);
  } else {
    // Template (monochrome) icons are a macOS thing; use the full-colour app icon elsewhere.
    icon = nativeImage.createFromPath(path.join(__dirname, 'tray', 'icon.png')).resize({ width: 32, height: 32 });
  }
  tray = new Tray(icon);
  tray.setToolTip('Vinylnyl — 지금 재생 중인 음악 위젯');
  const menu = Menu.buildFromTemplate([
    {
      label: '위젯 보이기/숨기기',
      click: () => {
        if (!mainWindow) return;
        if (mainWindow.isVisible()) mainWindow.hide();
        else mainWindow.show();
      }
    },
    {
      label: '위젯 위치 초기화',
      click: () => {
        try { fs.unlinkSync(POS_FILE); } catch (e) {}
        if (mainWindow) mainWindow.close();
        createWindow();
      }
    },
    { type: 'separator' },
    { label: '종료', click: () => app.quit() }
  ]);
  tray.setContextMenu(menu);
}

function broadcastToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

function markConnected(data) {
  lastDataAt = Date.now();
  if (!isConnected) {
    isConnected = true;
    broadcastToRenderer('connection-status', { connected: true });
  }
  broadcastToRenderer('now-playing', data);
}

function startWatchdog() {
  watchdogTimer = setInterval(() => {
    if (isConnected && Date.now() - lastDataAt > 4000) {
      isConnected = false;
      broadcastToRenderer('connection-status', { connected: false });
    }
  }, 1500);
}

// --- Sources ---
// Now-playing state can come from three places; the widget shows the freshest one and prefers
// a source that is actually playing. Controls go only to that source so they never fire twice.
//   extension: browser extension over the local WebSocket (all OSes)
//   mac:       AppleScript into Safari / Chromium browsers (macOS only, no extension needed)
//   os:        the OS media session (Windows / Linux, no extension needed)
const FRESH_MS = 3500;
const SOURCE_PRIORITY = ['extension', 'mac', 'os'];
const latest = {};
let activeSource = null;
let bridge = null;
let osMedia = null;

function sourceFresh(name) {
  return !!latest[name] && Date.now() - latest[name].at < FRESH_MS;
}

function report(source, data) {
  latest[source] = { data, at: Date.now() };
  let best = null;
  for (const name of SOURCE_PRIORITY) {
    if (!sourceFresh(name)) continue;
    if (!best || (latest[name].data.isPlaying && !latest[best].data.isPlaying)) best = name;
  }
  activeSource = best;
  markConnected(latest[best].data);
}

// --- macOS AppleScript ("Allow JavaScript from Apple Events") ---
// Works without the extension, and is the only way to reach Safari.
function appleScriptBrowsers() {
  if (process.platform !== 'darwin') return [];
  return sourceFresh('extension') ? BROWSERS.filter((b) => b.name === 'safari') : BROWSERS;
}

function pollBrowsers() {
  for (const b of appleScriptBrowsers()) {
    execFile('osascript', [b.read], { timeout: 4000 }, (err, stdout) => {
      if (err) return;
      const out = (stdout || '').trim();
      if (!out || out === 'null') return;
      let data;
      try { data = JSON.parse(out); } catch (e) { return; }
      if (data && data.type === 'nowPlaying') report('mac', data);
    });
  }
}

function startPolling() {
  if (process.platform !== 'darwin') return;
  pollTimer = setInterval(pollBrowsers, 1000);
}

function sendControl(action) {
  if (activeSource === 'extension' && bridge) {
    bridge.sendControl(action);
  } else if (activeSource === 'mac') {
    for (const b of appleScriptBrowsers()) {
      execFile('osascript', [b.control, action], { timeout: 4000 }, () => {});
    }
  } else if (activeSource === 'os' && osMedia) {
    osMedia.control(action);
  }
}

ipcMain.on('control', (event, action) => {
  sendControl(action);
  // Poll again shortly after so the widget reflects the change quickly,
  // instead of waiting for the next scheduled 1s tick.
  setTimeout(pollBrowsers, 250);
  setTimeout(pollBrowsers, 600);
  setTimeout(pollBrowsers, 1100);
});

ipcMain.on('quit-app', () => {
  app.quit();
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // A second launch (e.g. double-clicking the app again) should bring the widget back
  // instead of silently doing nothing.
  app.on('second-instance', () => {
    if (!mainWindow) createWindow();
    else mainWindow.show();
  });
  app.whenReady().then(() => {
    createWindow();
    createTray();
    bridge = createBridge({ onState: (data) => report('extension', data) });
    osMedia = createOsMedia({ onState: (data) => report('os', data) });
    startPolling();
    startWatchdog();
  });
}

app.on('window-all-closed', () => {
  // Keep the app (and tray) alive even if the widget window is closed.
});

app.on('before-quit', () => {
  if (pollTimer) clearInterval(pollTimer);
  if (watchdogTimer) clearInterval(watchdogTimer);
  if (bridge) bridge.close();
  if (osMedia) osMedia.close();
});
