const api = globalThis.browser || chrome;
const WS_URL = 'ws://127.0.0.1:17420';
const RETRY_MS = 3000;

let ws = null;
let retryTimer = null;
// tabId -> { data, at }. A tab is dropped when it closes or stops reporting.
const tabs = new Map();

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  try {
    ws = new WebSocket(WS_URL);
  } catch (e) {
    return scheduleRetry();
  }
  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch (e) { return; }
    if (msg && msg.type === 'control') control(msg.action);
  };
  ws.onclose = () => { ws = null; scheduleRetry(); };
  ws.onerror = () => {};
}

function scheduleRetry() {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(connect, RETRY_MS);
}

// Prefer the tab that is actually playing, otherwise the most recently active one.
function pickTab() {
  let best = null;
  for (const [id, t] of tabs) {
    if (Date.now() - t.at > 5000) { tabs.delete(id); continue; }
    if (!best || (t.data.isPlaying && !best.t.data.isPlaying) ||
        (t.data.isPlaying === best.t.data.isPlaying && t.at > best.t.at)) {
      best = { id, t };
    }
  }
  return best;
}

function control(action) {
  const best = pickTab();
  if (best) api.tabs.sendMessage(best.id, { type: 'control', action }).catch(() => {});
}

api.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.type !== 'state' || !sender.tab) return;
  tabs.set(sender.tab.id, { data: msg.data, at: Date.now() });
  connect();
  const best = pickTab();
  if (best && ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(best.t.data));
});

api.tabs.onRemoved.addListener((id) => tabs.delete(id));

api.runtime.onStartup.addListener(connect);
api.runtime.onInstalled.addListener(connect);
connect();
