// Singleton WS client for component status feed.
// Browser connects to SAME-ORIGIN WSS and Nginx proxies to :8000 backend.
//
// Fan-outs parsed JSON messages to all subscribers.
// Reconnects with capped exponential backoff.
import { wsBackend } from "../config/config.js";
import authService from "../services/auth";

let ws = null;
let listeners = new Set();
let retry = 0;
let reconnectTimer = null;
let lastPayload = null;

const WS_PATH = "/component/ws-component-details";

function buildUrl() {
  const token = authService.getAccessToken();
  if (!token) {
    return `${wsBackend}${WS_PATH}`;
  }

  return `${wsBackend}${WS_PATH}?token=${encodeURIComponent(token)}`;
}

function safeParse(data) {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function notifyAll(msg) {
  for (const fn of Array.from(listeners)) {
    try {
      fn(msg);
    } catch {}
  }
}

function connect() {
  clearTimeout(reconnectTimer);
  const url = buildUrl();
  try {
    ws = new WebSocket(url);

    ws.onopen = () => {
      retry = 0;
      // no-op; backend pushes every ~20s
    };

    ws.onmessage = (evt) => {
      const msg = safeParse(evt.data);
      if (!msg) return;
      lastPayload = msg;
      notifyAll(msg);
    };

    ws.onerror = () => {
      // let onclose handle reconnect
    };

    ws.onclose = () => {
      const delay = Math.min(10000, 500 * Math.pow(2, retry++));
      reconnectTimer = setTimeout(connect, delay);
    };
  } catch {
    const delay = Math.min(10000, 500 * Math.pow(2, retry++));
    reconnectTimer = setTimeout(connect, delay);
  }
}

// Public API

export function subscribe(listener) {
  if (typeof listener !== "function") return () => {};
  listeners.add(listener);
  if (
    !ws ||
    ws.readyState === WebSocket.CLOSED ||
    ws.readyState === WebSocket.CLOSING
  ) {
    connect();
  }
  // Send last known payload immediately (if any)
  if (lastPayload) {
    try {
      listener(lastPayload);
    } catch {}
  }
  return () => {
    listeners.delete(listener);
    // Optionally auto-close when no listeners:
    // if (listeners.size === 0) { try { ws?.close(); } catch {} }
  };
}

export function refreshOnce() {
  try {
    ws?.close();
  } catch {}
}

export function getLastPayload() {
  return lastPayload;
}
