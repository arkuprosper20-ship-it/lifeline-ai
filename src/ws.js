// LIFELINE AI — WebSocket real-time sync
// Replaces polling with bidirectional WebSocket connection for
// live coordination dashboard updates and incident synchronization.

const WS_URL = (typeof location !== "undefined" && location.protocol === "https:")
  ? "wss://lifeline-ai-ws.vercel.app"
  : "ws://localhost:8081";

let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT = 10;
const RECONNECT_DELAY = 2000;
let messageQueue = [];
let subscribers = new Set();
let status = "disconnected";

export function getWebSocketStatus() {
  return status;
}

export function isWebSocketConnected() {
  return ws !== null && ws.readyState === WebSocket.OPEN;
}

export function connectWebSocket(token) {
  if (typeof WebSocket === "undefined") return null;

  const url = token ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL;
  ws = new WebSocket(url);

  ws.onopen = () => {
    console.log("[LIFELINE] WebSocket connected");
    status = "connected";
    reconnectAttempts = 0;
    flushQueue();
    notifySubscribers({ type: "ws_status", status: "connected" });
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    } catch (e) {
      console.warn("[LIFELINE] WebSocket message parse failed:", e);
    }
  };

  ws.onclose = (event) => {
    console.log("[LIFELINE] WebSocket closed:", event.code, event.reason);
    status = "disconnected";
    notifySubscribers({ type: "ws_status", status: "disconnected" });
    scheduleReconnect(token);
  };

  ws.onerror = (error) => {
    console.warn("[LIFELINE] WebSocket error:", error);
    status = "error";
    notifySubscribers({ type: "ws_status", status: "error" });
  };

  return ws;
}

function handleWebSocketMessage(data) {
  switch (data.type) {
    case "incident_update":
      notifySubscribers({ type: "incident_update", incident: data.incident });
      break;
    case "incident_created":
      notifySubscribers({ type: "incident_created", incident: data.incident });
      break;
    case "user_joined":
      notifySubscribers({ type: "user_joined", user: data.user });
      break;
    case "user_left":
      notifySubscribers({ type: "user_left", user: data.user });
      break;
    case "sync_response":
      notifySubscribers({ type: "sync_response", data: data.data });
      break;
    case "ping":
      send({ type: "pong" });
      break;
    default:
      notifySubscribers({ type: "unknown", data });
  }
}

function scheduleReconnect(token) {
  if (reconnectAttempts >= MAX_RECONNECT) {
    console.log("[LIFELINE] Max WebSocket reconnect attempts reached");
    return;
  }
  reconnectAttempts++;
  const delay = Math.min(RECONNECT_DELAY * Math.pow(2, reconnectAttempts), 30000);
  setTimeout(() => {
    if (status === "disconnected") {
      connectWebSocket(token);
    }
  }, delay);
}

function flushQueue() {
  while (messageQueue.length > 0 && isWebSocketConnected()) {
    const msg = messageQueue.shift();
    ws.send(JSON.stringify(msg));
  }
}

function notifySubscribers(message) {
  for (const subscriber of subscribers) {
    try {
      subscriber(message);
    } catch (e) {
      console.warn("[LIFELINE] Subscriber error:", e);
    }
  }
}

export function send(message) {
  if (isWebSocketConnected()) {
    ws.send(JSON.stringify(message));
    return true;
  }
  messageQueue.push(message);
  return false;
}

export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function disconnectWebSocket() {
  if (ws) {
    ws.onclose = null;
    ws.close();
    ws = null;
  }
  status = "disconnected";
  notifySubscribers({ type: "ws_status", status: "disconnected" });
}

export function requestSync() {
  send({ type: "sync_request", timestamp: Date.now() });
}

export function notifyIncidentUpdate(incidentId, update) {
  send({ type: "incident_update", incidentId, update, timestamp: Date.now() });
}

export function notifyUserPresence(user) {
  send({ type: "user_presence", user, timestamp: Date.now() });
}

export function getQueueLength() {
  return messageQueue.length;
}

export function clearQueue() {
  messageQueue = [];
}

export function getReconnectAttempts() {
  return reconnectAttempts;
}

export function resetReconnect() {
  reconnectAttempts = 0;
}