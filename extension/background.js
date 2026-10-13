const api = globalThis.browser || chrome;
const WS_URL = 'ws://127.0.0.1:17420';
const RETRY_MIN_MS = 2000;
const RETRY_MAX_MS = 15000;

let ws = null;
let retryTimer = null;
let retryMs = RETRY_MIN_MS;
let lastAttempt = 0;
// tabId -> { data, at }. A tab is dropped when it closes or stops reporting.
const tabs = new Map();

function connect(force) {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  // Tab messages arrive every second; don't turn each one into a connection attempt
  // while the widget app isn't running.
  if (!force && Date.now() - lastAttempt < retryMs) return;
  lastAttempt = Date.now();
  try {
    ws = new WebSocket(WS_URL);
  } catch (e) {
    return scheduleRetry();
  }
  ws.onopen = () => { retryMs = RETRY_MIN_MS; };
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
  retryTimer = setTimeout(() => connect(true), retryMs);
  retryMs = Math.min(retryMs * 2, RETRY_MAX_MS);
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
