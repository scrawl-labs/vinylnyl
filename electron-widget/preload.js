const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vinyl', {
  onNowPlaying: (cb) => {
    ipcRenderer.on('now-playing', (_event, data) => cb(data));
  },
  onConnectionStatus: (cb) => {
    ipcRenderer.on('connection-status', (_event, data) => cb(data));
  },
  sendControl: (action) => {
    ipcRenderer.send('control', action);
  },
  quit: () => {
    ipcRenderer.send('quit-app');
  }
});
