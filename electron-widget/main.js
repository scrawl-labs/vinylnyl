const { app, BrowserWindow, ipcMain, Tray, nativeImage, screen, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

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
  const icon = nativeImage.createFromPath(path.join(__dirname, 'tray', 'iconTemplate.png'));
  icon.setTemplateImage(true);
  tray = new Tray(icon);
  tray.setToolTip('Vinylnyl — YouTube Music 위젯');
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

// --- macOS Safari / Chrome support via AppleScript ("Allow JavaScript from Apple Events") ---
function pollBrowsers() {
  if (process.platform !== 'darwin') return;
  for (const b of BROWSERS) {
    execFile('osascript', [b.read], { timeout: 4000 }, (err, stdout) => {
      if (err) return;
      const out = (stdout || '').trim();
      if (!out || out === 'null') return;
      let data;
      try { data = JSON.parse(out); } catch (e) { return; }
      if (data && data.type === 'nowPlaying') markConnected(data);
    });
  }
}

function startPolling() {
  if (process.platform !== 'darwin') {
    console.warn('이 위젯의 Safari/Chrome 연동은 현재 macOS에서만 동작합니다.');
    return;
  }
  pollTimer = setInterval(pollBrowsers, 1000);
}

function sendControlToBrowsers(action) {
  if (process.platform !== 'darwin') return;
  for (const b of BROWSERS) {
    execFile('osascript', [b.control, action], { timeout: 4000 }, () => {});
  }
}

ipcMain.on('control', (event, action) => {
  sendControlToBrowsers(action);
  // Poll again shortly after so the widget reflects the change quickly,
  // instead of waiting for the next scheduled 1s tick.
  setTimeout(pollBrowsers, 250);
  setTimeout(pollBrowsers, 600);
  setTimeout(pollBrowsers, 1100);
});

ipcMain.on('quit-app', () => {
  app.quit();
});

app.whenReady().then(() => {
  createWindow();
  createTray();
  startPolling();
  startWatchdog();
});

app.on('window-all-closed', () => {
  // Keep the app (and tray) alive even if the widget window is closed.
});

app.on('before-quit', () => {
  if (pollTimer) clearInterval(pollTimer);
  if (watchdogTimer) clearInterval(watchdogTimer);
});
