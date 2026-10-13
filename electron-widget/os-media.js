// Reads "now playing" from the operating system's media session, so any player that
// registers with the OS (browsers, Spotify, ...) shows up without a browser extension.
//   Windows: System Media Transport Controls, through win/media.ps1
//   Linux:   MPRIS, through the `playerctl` CLI (must be installed)
//   macOS:   no public API; Safari/Chrome are read via AppleScript in main.js instead.
const { spawn, execFile } = require('child_process');
const path = require('path');

const PS_ARGS = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File'];

function createWindowsMedia({ onState }) {
  const poller = path.join(__dirname, 'win', 'media.ps1');
  const controller = path.join(__dirname, 'win', 'control.ps1');
  let child = null;
  let closed = false;
  let buf = '';
  // The poller only sends the (large) thumbnail when the track changes, so remember it.
  let key = '';
  let thumb = '';

  function handleLine(line) {
    let d;
    try { d = JSON.parse(line); } catch (e) { return; }
    if (!d || d.type !== 'nowPlaying') return;
    if (d.key !== key) { key = d.key; thumb = d.thumbnail || ''; }
    else if (d.thumbnail) thumb = d.thumbnail;
    d.thumbnail = thumb;
    onState(d);
  }

  function start() {
    child = spawn('powershell.exe', [...PS_ARGS, poller], { windowsHide: true });
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      buf += chunk;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (line) handleLine(line);
      }
    });
    child.on('error', () => {});
    child.on('exit', () => {
      child = null;
      buf = '';
      if (!closed) setTimeout(start, 3000);
    });
  }
  start();

  return {
    control(action) {
      execFile('powershell.exe', [...PS_ARGS, controller, action], { windowsHide: true, timeout: 8000 }, () => {});
    },
    close() {
      closed = true;
      if (child) child.kill();
    }
  };
}

function createLinuxMedia({ onState }) {
  const FIELDS = ['playerName', 'status', 'title', 'artist', 'mpris:artUrl', 'position', 'mpris:length'];
  const FORMAT = FIELDS.map((f) => `{{${f}}}`).join('\t');
  let player = '';

  function poll() {
    execFile('playerctl', ['-a', 'metadata', '--format', FORMAT], { timeout: 3000 }, (err, stdout) => {
      if (err || !stdout) return;
      const rows = stdout.split('\n').filter(Boolean).map((l) => l.split('\t'));
      const row = rows.find((r) => r[1] === 'Playing') || rows[0];
      if (!row || !row[2]) return;
      const [name, status, title, artist, art, pos, len] = row;
      player = name;
      onState({
        type: 'nowPlaying',
        title,
        artist,
        thumbnail: art || '',
        isPlaying: status === 'Playing',
        duration: (Number(len) || 0) / 1e6,
        currentTime: (Number(pos) || 0) / 1e6
      });
    });
  }

  const timer = setInterval(poll, 1000);
  const COMMANDS = { playPause: 'play-pause', next: 'next', prev: 'previous' };

  return {
    control(action) {
      const cmd = COMMANDS[action];
      if (!cmd) return;
      execFile('playerctl', player ? ['--player=' + player, cmd] : [cmd], { timeout: 3000 }, () => {});
    },
    close() { clearInterval(timer); }
  };
}

function createOsMedia(opts) {
  if (process.platform === 'win32') return createWindowsMedia(opts);
  if (process.platform === 'linux') return createLinuxMedia(opts);
  return null;
}

module.exports = { createOsMedia };
