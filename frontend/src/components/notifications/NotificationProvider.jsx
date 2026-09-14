import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Checkbox,
  Divider,
  FormControlLabel,
  IconButton,
  Popover,
  Typography,
} from "@mui/material";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import NotificationCenter from "./NotificationCenter";
import { formatStatusLabel } from "../WatcherStatus/statusChipUtils";

const Ctx = createContext(null);
const ENABLED_KEY = "notif_enabled_v1";
const SYS_ALLOWED_KEY = "notif_system_permission";
const HISTORY_KEY = "notif_history_v1";
const HISTORY_LIMIT = 50;
const SOUND_SRC = "/sounds/notify.mp3"; // optional short ding (backup in-page sound)

// Which alert severities (toast tones) the user wants to be notified about.
// Selecting all three is equivalent to "All alerts"; the "default" tone
// (e.g. the dev test button) always shows regardless of this filter.
const TONE_FILTER_KEY = "notif_tone_filter_v1";
const TONE_OPTIONS = [
  { value: "red", label: "Critical", color: "#ef4444" },
  { value: "grey", label: "Warning", color: "#94a3b8" },
  { value: "green", label: "Recovery", color: "#22c55e" },
];
const ALL_TONES = TONE_OPTIONS.map((option) => option.value);

export function NotificationProvider({ children }) {
  const navigate = useNavigate();

  const [enabled, setEnabledState] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(ENABLED_KEY) || "false");
    } catch {
      return false;
    }
  });
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const [sysPerm, setSysPerm] = useState(() => {
    try {
      return localStorage.getItem(SYS_ALLOWED_KEY) || "default";
    } catch {
      return "default";
    }
  });

  const [toneFilter, setToneFilterState] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(TONE_FILTER_KEY) || "null");
      if (Array.isArray(saved)) {
        return saved.filter((tone) => ALL_TONES.includes(tone));
      }
    } catch {}
    return ALL_TONES;
  });
  const toneFilterRef = useRef(toneFilter);
  useEffect(() => {
    toneFilterRef.current = toneFilter;
  }, [toneFilter]);
  useEffect(() => {
    try {
      localStorage.setItem(TONE_FILTER_KEY, JSON.stringify(toneFilter));
    } catch {}
  }, [toneFilter]);
  const setToneFilter = useCallback((tones) => setToneFilterState(tones), []);

  const isToneAllowed = useCallback((tone) => {
    const value = tone || "default";
    if (value === "default") return true;
    return toneFilterRef.current.includes(value);
  }, []);

  // Stacked in-app notifications (newest first)
  // item = { id, title, body, tone, key, ip, name, kind, from, to, createdAt }
  const [toasts, setToasts] = useState([]);
  const idSeq = useRef(0);

  // Full notification history (newest first), independent of toast lifetime
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, HISTORY_LIMIT)));
    } catch {}
  }, [history]);

  const clearHistory = useCallback(() => setHistory([]), []);

  // Track active native notifications so we can close them when disabling
  const activeNativeRef = useRef(new Set());

  // Optional backup sound (browser may block until first user interaction)
  const audioRef = useRef(null);
  useEffect(() => {
    const audio = new Audio(SOUND_SRC);
    audio.preload = "auto";
    audioRef.current = audio;
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(ENABLED_KEY, JSON.stringify(enabled));
    } catch {}
  }, [enabled]);

  const ensureSystemPermission = useCallback(async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      try {
        const res = await Notification.requestPermission();
        setSysPerm(res);
        try {
          localStorage.setItem(SYS_ALLOWED_KEY, res);
        } catch {}
      } catch {}
    } else {
      setSysPerm(Notification.permission);
      try {
        localStorage.setItem(SYS_ALLOWED_KEY, Notification.permission);
      } catch {}
    }
  }, []);

  const saveEnabled = (v) => {
    setEnabledState(v);
    if (v) {
      ensureSystemPermission();
    } else {
      // Close native notifications
      try {
        activeNativeRef.current.forEach((n) => {
          try {
            n.close();
          } catch {}
        });
        activeNativeRef.current.clear();
      } catch {}
      // Clear in-app stack
      setToasts([]);
    }
  };

  const addToastEntry = useCallback((title, body, options = {}) => {
    const { tone = "default", key, ip, name, region = null, kind = null, from = null, to = null } = options;
    const id = `t_${Date.now()}_${idSeq.current++}`;
    const item = { id, title, body, tone, key, ip, name, region, kind, from, to, createdAt: Date.now() };
    setToasts((prev) => [item, ...prev]);
    setHistory((prev) => [item, ...prev].slice(0, HISTORY_LIMIT));
  }, []);

  const playSound = useCallback(() => {
    try {
      audioRef.current?.play?.().catch?.(() => {});
    } catch {}
  }, []);

  // ---- Native OS notification (Windows) with sound
  const fireNative = useCallback(
    (title, body, options = {}) => {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      const { key, ip, name } = options;
      try {
        const n = new Notification(title, {
          body,
          icon: "/images/logo.png",
          silent: false, // let Windows play its default sound ✅
          tag: key || title,
          renotify: true,
          requireInteraction: false,
        });
        activeNativeRef.current.add(n);
        const cleanup = () => {
          try {
            activeNativeRef.current.delete(n);
          } catch {}
        };
        n.onclose = cleanup;
        n.onerror = cleanup;
        n.onclick = () => {
          try {
            window.focus();
          } catch {}
          const params = new URLSearchParams();
          if (key) params.set("focus", key);
          if (name) params.set("name", name);
          if (ip) params.set("ip", ip);
          const qs = params.toString();
          navigate(`/component-watcher${qs ? `?${qs}` : ""}`, {
            replace: false,
          });
          try {
            n.close();
          } catch {}
        };
      } catch {}
    },
    [navigate]
  );

  /**
   * notify(title, body, {
   *   tone?: 'green'|'red'|'grey'|'default',
   *   key?: '<ip>:<component>',
   *   ip?: string,
   *   name?: string,
   *   region?: string
   * })
   */
  const notify = useCallback(
    (title, body, options = {}) => {
      if (!enabled || !enabledRef.current) return;
      if (!isToneAllowed(options.tone)) return;
      // Fire the native OS notification first - it's the one with real
      // hand-off latency to the browser/OS, so dispatch it before spending
      // any time on in-app state updates or sound playback.
      fireNative(title, body, options);
      addToastEntry(title, body, options);
      playSound();
    },
    [enabled, isToneAllowed, addToastEntry, playSound, fireNative]
  );

  /**
   * notifyMany([{ title, body, options }, ...])
   *
   * For a batch of changes detected in one websocket snapshot. Every change
   * still gets its own in-app toast (those stack instantly), but only ONE
   * native OS notification is fired for the whole batch - creating several
   * native Notification()s back-to-back gets queued and trickled out
   * one-by-one by the browser/OS, which is what shows up as a lag behind
   * the in-app toasts. Collapsing to a single native notification removes
   * that lag entirely.
   */
  const notifyMany = useCallback(
    (items) => {
      if (!enabled || !enabledRef.current || !items?.length) return;

      const allowed = items.filter((item) => isToneAllowed(item.options?.tone));
      if (!allowed.length) return;

      // Same ordering as notify(): dispatch the native notification first,
      // then do the (cheaper, purely in-page) toast/history/sound work.
      if (allowed.length === 1) {
        const { title, body, options } = allowed[0];
        fireNative(title, body, options);
      } else {
        const summaryTitle = `${allowed.length} status changes`;
        const shown = allowed.slice(0, 5).map((item) => item.title);
        const summaryBody =
          shown.join(", ") + (allowed.length > shown.length ? `, +${allowed.length - shown.length} more` : "");
        fireNative(summaryTitle, summaryBody, { key: `batch:${Date.now()}` });
      }

      allowed.forEach(({ title, body, options }) => addToastEntry(title, body, options));
      playSound();
    },
    [enabled, isToneAllowed, addToastEntry, playSound, fireNative]
  );

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Shared by toast clicks and notification-history row clicks so both
  // land on the same alert focus in Component Watcher.
  const openNotificationTarget = useCallback(
    (item) => {
      const { key, ip, name } = item || {};
      const params = new URLSearchParams();
      if (key) params.set("focus", key);
      if (name) params.set("name", name);
      if (ip) params.set("ip", ip);
      const qs = params.toString();

      navigate(`/component-watcher${qs ? `?${qs}` : ""}`, { replace: false });
    },
    [navigate]
  );

  // Dev-only helper to fire a synthetic notification for visual testing.
  // import.meta.env.DEV is statically replaced at build time, so this whole
  // branch (and the button that calls it) is dead-code-eliminated in prod.
  const sendTestNotification = useCallback(() => {
    if (!import.meta.env.DEV) return;
    const samples = [
      { kind: "port", from: "sleeping", to: "warning", tone: "grey" },
      { kind: "process", from: "running", to: "stopped", tone: "red" },
      { kind: "port", from: "not_listening", to: "listening", tone: "green" },
    ];
    const sample = samples[Math.floor(Math.random() * samples.length)];
    const label = sample.kind === "port" ? "Port" : "Process";
    const name = "Analyzer_demo";
    notify(
      name,
      `${label}: ${formatStatusLabel(sample.from)} -> ${formatStatusLabel(sample.to)}\nus-east-1 | 10.0.0.24`,
      {
        tone: sample.tone,
        kind: sample.kind,
        from: sample.from,
        to: sample.to,
        ip: "10.0.0.24",
        name,
        region: "us-east-1",
        key: `test:${Date.now()}`,
      }
    );
  }, [notify]);

  const api = useMemo(
    () => ({
      enabled,
      setEnabled: saveEnabled,
      notify,
      notifyMany,
      history,
      clearHistory,
      sendTestNotification,
      openNotificationTarget,
      toneFilter,
      setToneFilter,
    }),
    [
      enabled,
      notify,
      notifyMany,
      history,
      clearHistory,
      sendTestNotification,
      openNotificationTarget,
      toneFilter,
      setToneFilter,
    ]
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      {/* Stacked, interactive in-app notifications (10s, hover to pause) */}
      <NotificationCenter
        enabled={enabled}
        toasts={toasts}
        onClose={removeToast}
        onClick={openNotificationTarget}
        durationMs={10000} // ← 10 seconds
      />
    </Ctx.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(Ctx);
  return (
    ctx || {
      enabled: false,
      setEnabled: () => {},
      notify: () => {},
      notifyMany: () => {},
      history: [],
      clearHistory: () => {},
      sendTestNotification: () => {},
      openNotificationTarget: () => {},
      toneFilter: ALL_TONES,
      setToneFilter: () => {},
    }
  );
}

/** Keep your existing MUI bell if you prefer — kept minimal here */
export function BellButton() {
  const { enabled, setEnabled, toneFilter, setToneFilter } = useNotifications();
  const accent = enabled ? "#34D399" : "#94A3B8";
  const [accentR, accentG, accentB] = [
    parseInt(accent.slice(1, 3), 16),
    parseInt(accent.slice(3, 5), 16),
    parseInt(accent.slice(5, 7), 16),
  ];
  const accentRgb = `${accentR}, ${accentG}, ${accentB}`;

  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);
  const allSelected = toneFilter.length === TONE_OPTIONS.length;
  const noneSelected = toneFilter.length === 0;

  const toggleTone = (value) => {
    setToneFilter(
      toneFilter.includes(value) ? toneFilter.filter((tone) => tone !== value) : [...toneFilter, value]
    );
  };

  const toggleAll = () => {
    setToneFilter(allSelected ? [] : ALL_TONES);
  };

  return (
    <Box sx={{ display: "inline-flex", alignItems: "stretch" }}>
      <button
        type="button"
        onClick={() => setEnabled(!enabled)}
        title={enabled ? "Disable notifications" : "Enable notifications"}
        style={{
          background: `rgba(${accentRgb}, 0.12)`,
          border: "none",
          cursor: "pointer",
          padding: "7px 12px",
          borderRadius: "999px 0 0 999px",
          transition: "background-color 180ms ease",
          display: "inline-flex",
          alignItems: "center",
          color: accent,
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.backgroundColor = `rgba(${accentRgb}, 0.22)`;
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.backgroundColor = `rgba(${accentRgb}, 0.12)`;
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
            style={{ opacity: 1, color: accent }}
          >
            <path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Zm6-6V11a6 6 0 1 0-12 0v5L4 18v1h16v-1l-2-2Z" />
          </svg>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.2,
              color: accent,
            }}
          >
            {enabled ? "On" : "Off"}
          </span>
        </span>
      </button>

      <IconButton
        size="small"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        title="Choose which alerts to notify for"
        sx={{
          ml: "1px",
          borderRadius: "0 999px 999px 0",
          color: accent,
          bgcolor: `rgba(${accentRgb}, 0.12)`,
          "&:hover": { bgcolor: `rgba(${accentRgb}, 0.22)` },
        }}
      >
        <KeyboardArrowDownRoundedIcon fontSize="small" />
      </IconButton>

      <Popover
        open={menuOpen}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { mt: 1, p: 1.5, width: 220, borderRadius: 3 } } }}
      >
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, color: "text.secondary", display: "block", px: 0.5, mb: 0.5 }}
        >
          Notify me for
        </Typography>

        <FormControlLabel
          sx={{ ml: 0, width: "100%" }}
          control={
            <Checkbox
              size="small"
              checked={allSelected}
              indeterminate={!allSelected && !noneSelected}
              onChange={toggleAll}
            />
          }
          label={
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              All alerts
            </Typography>
          }
        />

        <Divider sx={{ my: 0.5 }} />

        {TONE_OPTIONS.map((option) => (
          <FormControlLabel
            key={option.value}
            sx={{ ml: 0, width: "100%" }}
            control={
              <Checkbox
                size="small"
                checked={toneFilter.includes(option.value)}
                onChange={() => toggleTone(option.value)}
                sx={{ color: option.color, "&.Mui-checked": { color: option.color } }}
              />
            }
            label={<Typography variant="body2">{option.label}</Typography>}
          />
        ))}
      </Popover>
    </Box>
  );
}
