import { useEffect, useMemo, useState } from "react";
import { subscribe, refreshOnce as wsRefreshOnce, getLastPayload } from "../../ws/ComponentWSClient";

const CACHE_KEY = "component_status_ws_cache_v1";

/**
 * Returns:
 *  - data: object keyed by "ip:component"
 *  - connected: boolean (best-effort; true once we receive a message)
 *  - error: null | string (notified via message parse errors only)
 *  - refreshOnce(): forces reconnect
 *  - hasFirstPayload: prevents 'no data' flash on first render
 */
export default function useStatusWebSocket() {
  // warm start from cache (prevents blank/flicker on reload)
  const cached = useMemo(() => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);

  const [data, setData] = useState(() => {
    // prefer already-connected payload if present
    const last = getLastPayload();
    if (last?.type === "component_details" && last?.data) return last.data;
    return cached;
  });
  const [connected, setConnected] = useState(!!getLastPayload());
  const [error, setError] = useState(null);
  const [hasFirstPayload, setHasFirstPayload] = useState(
    !!Object.keys(data || {}).length
  );

  useEffect(() => {
    const unsub = subscribe((msg) => {
      try {
        if (msg?.type === "component_details" && msg?.data) {
          setData(msg.data);
          setConnected(true);
          setHasFirstPayload(true);
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(msg.data));
          } catch {}
        }
      } catch (e) {
        setError(String(e?.message || e));
      }
    });
    return unsub;
  }, []);

  const refreshOnce = () => wsRefreshOnce();

  return { data, connected, error, refreshOnce, hasFirstPayload };
}
