// Singleton WS client for component status feed.
// Browser connects to SAME-ORIGIN WSS and Nginx proxies to :8000 backend.
//
// Fan-outs parsed JSON messages to all subscribers.
// Reconnects with capped exponential backoff.
import { wsBackend, demoMode } from "../config/config.js";
import authService from "../services/auth";
import { buildComponentStatusPayload } from "../mocks/demoFixtures.js";

let ws = null;
let listeners = new Set();
let retry = 0;
let reconnectTimer = null;
let lastPayload = null;
let demoInterval = null;

const WS_PATH = "/component/ws-component-details";

// Demo mode: no real backend to connect to, so simulate the same message
// shape the aggregator would push, including small periodic changes so the
// "live" status views aren't static screenshots.
function connectDemo() {
  lastPayload = buildComponentStatusPayload();
  notifyAll(lastPayload);

  if (demoInterval) return;
  demoInterval = setInterval(() => {
    const payload = buildComponentStatusPayload();
    const keys = Object.keys(payload.data);
    if (keys.length) {
      const flickerKey = keys[Math.floor(Math.random() * keys.length)];
      const entry = payload.data[flickerKey];
      const flickering = Math.random() < 0.15;
      entry.port_status = flickering ? "not_listening" : "listening";
      entry.state = flickering ? "down" : "up";
    }
    lastPayload = payload;
    notifyAll(payload);
  }, 20000);
}

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
  if (demoMode) {
    connectDemo();
    return;
  }

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
  if (demoMode) {
    lastPayload = buildComponentStatusPayload();
    notifyAll(lastPayload);
    return;
  }

  try {
    ws?.close();
  } catch {}
}

export function getLastPayload() {
  return lastPayload;
}
