const { WebSocketServer } = require('ws');

const PORT = Number(process.env.VINYLNYL_PORT) || 17420;
const HOST = '127.0.0.1';

// Only the Vinylnyl browser extension may talk to the widget. Ordinary web
// pages always send an http(s) Origin, so rejecting those keeps a random site
// from feeding fake track data or sending playback commands.
const ALLOWED_ORIGIN = /^(chrome-extension|moz-extension|safari-web-extension):\/\//;

function createBridge({ onState, onClientChange, port = PORT }) {
  const wss = new WebSocketServer({
    host: HOST,
    port,
    maxPayload: 64 * 1024,
    verifyClient: ({ origin }) => ALLOWED_ORIGIN.test(origin || '')
  });

  wss.on('error', (err) => {
    console.warn('[bridge]', err.code === 'EADDRINUSE'
      ? `포트 ${port}가 이미 사용 중이라 브라우저 확장 연결을 건너뜁니다.`
      : err.message);
  });

  wss.on('connection', (ws) => {
    if (onClientChange) onClientChange(wss.clients.size);
    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch (e) { return; }
      if (msg && msg.type === 'nowPlaying') onState(msg);
    });
    ws.on('close', () => { if (onClientChange) onClientChange(wss.clients.size); });
    ws.on('error', () => {});
  });

  return {
    sendControl(action) {
      const payload = JSON.stringify({ type: 'control', action });
      for (const ws of wss.clients) {
        if (ws.readyState === ws.OPEN) ws.send(payload);
      }
    },
    close() { wss.close(); }
  };
}

module.exports = { createBridge, PORT };
