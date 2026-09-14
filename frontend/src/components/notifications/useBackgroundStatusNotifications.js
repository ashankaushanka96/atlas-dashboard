import { useEffect, useRef } from "react";
import { subscribe } from "../../ws/ComponentWSClient";
import { useNotifications } from "../notifications/NotificationProvider";

// normalize helper
const norm = (v) =>
  String(v ?? "")
    .trim()
    .toLowerCase();

const formatStatusLabel = (value) => {
  const normalized = norm(value);
  if (!normalized) return "N/A";

  return normalized
    .split("_")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
};

export default function useBackgroundStatusNotifications() {
  const { notifyMany, enabled } = useNotifications();

  const prevMapRef = useRef(new Map()); // key -> { process, portStatus }
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    const unsub = subscribe((msg) => {
      if (!enabledRef.current) return;
      try {
        if (msg?.type !== "component_details" || !msg?.data) return;
        evaluateSnapshot(msg.data);
      } catch {
        /* noop */
      }
    });

    return () => {
      try {
        unsub?.();
      } catch {
        // ignore unsubscribe failures during teardown
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifyMany]);

  const evaluateSnapshot = (data) => {
    // Collected across the whole snapshot and fired as one batch, so a
    // snapshot with several changes doesn't fan out into several native OS
    // notifications that trickle in one-by-one behind the in-app toasts.
    const changes = [];

    for (const obj of Object.values(data)) {
      const ip = obj.ip ?? obj.server_ip ?? "";
      const name = obj.component ?? "";
      const region = obj.region ?? obj.config_meta?.region ?? "";

      const process = norm(obj.state);
      const portNum =
        Number(obj.listen ?? obj.listen_port ?? obj?.config_meta?.port ?? 0) || 0;
      const rawPortStatus = norm(obj.port_status);
      const portStatus = portNum === 0 ? "n/a" : rawPortStatus;

      const key = `${ip}:${name}`;
      const prev = prevMapRef.current.get(key);

      if (!prev) {
        prevMapRef.current.set(key, { process, portStatus });
        continue;
      }

      const changedProcess = process && process !== prev.process;
      const changedPort =
        portStatus !== prev.portStatus &&
        portStatus !== "n/a" &&
        prev.portStatus !== "n/a";

      if (changedProcess) {
        let tone = "grey";
        const from = prev.process;
        const to = process;

        if (from === "running" && to === "sleeping") {
          tone = "grey";
        } else if (from === "running" && to === "stopped") {
          tone = "red";
        } else if (
          (from === "sleeping" && to === "running") ||
          (from === "stopped" && to === "running")
        ) {
          tone = "green";
        }

        const title = name || `Process: ${formatStatusLabel(from)} -> ${formatStatusLabel(to)}`;
        const body = `Process: ${formatStatusLabel(from)} -> ${formatStatusLabel(to)}\n${region ? `${region} | ` : ""}${ip}`;
        changes.push({
          title,
          body,
          options: { tone, key, ip, name, region, kind: "process", from, to },
        });
      }

      if (changedPort) {
        let tone = "grey";
        const from = prev.portStatus;
        const to = portStatus;

        if (from === "not_listening" && to === "listening") {
          tone = "green";
        } else if (from === "listening" && to === "not_listening") {
          tone = "red";
        }

        const title = name || `Port: ${formatStatusLabel(from)} -> ${formatStatusLabel(to)}`;
        const body = `Port: ${formatStatusLabel(from)} -> ${formatStatusLabel(to)}\n${region ? `${region} | ` : ""}${ip}`;
        changes.push({
          title,
          body,
          options: { tone, key, ip, name, region, kind: "port", from, to },
        });
      }

      prevMapRef.current.set(key, { process, portStatus });
    }

    if (changes.length) {
      notifyMany(changes);
    }
  };
}
