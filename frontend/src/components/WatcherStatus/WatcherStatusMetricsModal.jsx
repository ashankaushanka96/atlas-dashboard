import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Alert,
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Typography,
  Tooltip,
} from "@mui/material";
import { keyframes } from "@mui/system";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import MonitorHeartRoundedIcon from "@mui/icons-material/MonitorHeartRounded";

import { API } from "../../services/auth";
import StatusChip from "../HostDetails/StatusChip";
import hexToRgb from "../shared/hexToRgb";
import MetricsLineChart from "./MetricsLineChart";

const METRICS_ACCENT = "#FF6B35";
const METRICS_ACCENT_RGB = hexToRgb(METRICS_ACCENT);

const tintedIconButtonSx = (color) => ({
  color,
  bgcolor: `rgba(${hexToRgb(color)}, 0.12)`,
  "&:hover": { bgcolor: `rgba(${hexToRgb(color)}, 0.24)` },
});

const periodSelectSx = {
  borderRadius: 999,
  color: "white",
  "& .MuiSelect-select": { paddingTop: "7px", paddingBottom: "7px" },
  "& .MuiOutlinedInput-notchedOutline": { borderRadius: 999, borderColor: "rgba(148, 163, 184, 0.32)" },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: `rgba(${METRICS_ACCENT_RGB}, 0.6)` },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: METRICS_ACCENT },
  "& .MuiSvgIcon-root": { color: "white" },
};

const periodMenuProps = {
  PaperProps: {
    sx: {
      mt: 1,
      borderRadius: "12px",
      border: "1px solid rgba(148, 163, 184, 0.16)",
      "& .MuiMenuItem-root": { borderRadius: "8px", mx: 0.75, my: 0.25, fontSize: 13 },
      "& .MuiMenuItem-root:hover": { bgcolor: `rgba(${METRICS_ACCENT_RGB}, 0.12)` },
      "& .MuiMenuItem-root.Mui-selected": {
        bgcolor: `rgba(${METRICS_ACCENT_RGB}, 0.16)`,
        color: METRICS_ACCENT,
        fontWeight: 600,
      },
      "& .MuiMenuItem-root.Mui-selected:hover": { bgcolor: `rgba(${METRICS_ACCENT_RGB}, 0.24)` },
    },
  },
};

const PERIOD_OPTIONS = [
  { label: "30 Minutes", value: 1800 },
  { label: "1 Hour", value: 3600 },
  { label: "3 Hours", value: 10800 },
  { label: "6 Hours", value: 21600 },
  { label: "12 Hours", value: 43200 },
  { label: "24 Hours", value: 86400 },
  { label: "3 Days", value: 259200 },
  { label: "1 Week", value: 604800 },
];
const AUTO_REFRESH_INTERVAL_MS = 30000;

const SERIES_METRICS = [
  {
    key: "cpu",
    endpoint: "/datadog-metrics/fetch-cpu-metric",
    title: "CPU Percent",
    color: "#FF6B35",
    unit: "%",
  },
  {
    key: "memoryUsed",
    endpoint: "/datadog-metrics/fetch-memory-used-metric",
    title: "Memory Used",
    color: "#22C55E",
    unit: "MB",
  },
  {
    key: "memoryPercent",
    endpoint: "/datadog-metrics/fetch-memory-percent-metric",
    title: "Memory Percent",
    color: "#0EA5E9",
    unit: "%",
  },
  {
    key: "logDirectorySize",
    endpoint: "/datadog-metrics/fetch-log-directory-size-metric",
    title: "Log Directory Size",
    color: "#F59E0B",
    unit: "MB",
  },
];

const LAST_VALUE_METRICS = [
  {
    key: "upTime",
    endpoint: "/datadog-metrics/fetch-up-time-metric",
    title: "Up Time",
  },
];

const STATUS_BAR_METRICS = [
  {
    key: "processStatus",
    endpoint: "/datadog-metrics/fetch-process-status-metric",
    title: "Process Status",
  },
  {
    key: "portStatus",
    endpoint: "/datadog-metrics/fetch-port-status-metric",
    title: "Port Status",
  },
];

const UPTIME_STATUS_METRIC = {
  key: "upTimeMaxExceeded",
  endpoint: "/datadog-metrics/fetch-up-time-max-exceeded-metric",
};

const DATADOG_STATUS_META = {
  0: {
    label: "OK",
    textColor: "#BBF7D0",
    background: "rgba(20,83,45,0.55)",
    borderColor: "rgba(74,222,128,0.4)",
  },
  1: {
    label: "WARN",
    textColor: "#FDE68A",
    background: "rgba(120,53,15,0.55)",
    borderColor: "rgba(251,191,36,0.4)",
  },
  2: {
    label: "CRITICAL",
    textColor: "#FECACA",
    background: "rgba(127,29,29,0.55)",
    borderColor: "rgba(248,113,113,0.45)",
  },
  3: {
    label: "NO DATA",
    textColor: "#CBD5E1",
    background: "rgba(51,65,85,0.55)",
    borderColor: "rgba(148,163,184,0.35)",
  },
};

const DATADOG_SERVICE_CHECK_META = {
  0: {
    label: "OK",
    textColor: "#BBF7D0",
    background: "rgba(20,83,45,0.55)",
    borderColor: "rgba(74,222,128,0.4)",
    accent: "#22C55E",
  },
  1: {
    label: "WARNING",
    textColor: "#FDE68A",
    background: "rgba(120,53,15,0.55)",
    borderColor: "rgba(251,191,36,0.4)",
    accent: "#F59E0B",
  },
  2: {
    label: "CRITICAL",
    textColor: "#FECACA",
    background: "rgba(127,29,29,0.55)",
    borderColor: "rgba(248,113,113,0.45)",
    accent: "#EF4444",
  },
  3: {
    label: "NO DATA",
    textColor: "#D1D5DB",
    background: "rgba(107,114,128,0.45)",
    borderColor: "rgba(156,163,175,0.35)",
    accent: "#9CA3AF",
  },
};

function formatLastTimestamp(timestampMs) {
  if (!timestampMs) return "No timestamp";
  return new Date(Number(timestampMs)).toLocaleString();
}

function formatLastValue(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDurationSeconds(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  const totalSeconds = Math.max(0, Math.floor(Number(value)));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(" ");
}

function formatDays(value) {
  if (value === null || value === undefined || value === "") return "N/A";
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return String(value);
  return `${numericValue} day${numericValue === 1 ? "" : "s"}`;
}

function getDetailedRollupSeconds(period) {
  if (period <= 3600) return 10;
  if (period <= 3 * 3600) return 15;
  if (period <= 6 * 3600) return 20;
  if (period <= 12 * 3600) return 30;
  if (period <= 24 * 3600) return 60;
  if (period <= 3 * 24 * 3600) return 300;
  return 600;
}

function getDatadogStatusAppearance(value) {
  const normalizedValue = Number(value);
  if (value === null || value === undefined || Number.isNaN(normalizedValue)) {
    return null;
  }

  return (
    DATADOG_STATUS_META[normalizedValue] || {
      label: `STATUS ${normalizedValue}`,
      textColor: "white",
      background: "rgba(15,23,42,0.72)",
      borderColor: "rgba(148,163,184,0.18)",
    }
  );
}

function getServiceCheckAppearance(value) {
  const normalizedValue = Number(value);
  if (value === null || value === undefined || Number.isNaN(normalizedValue)) {
    return null;
  }

  return (
    DATADOG_SERVICE_CHECK_META[normalizedValue] || {
      label: `STATUS ${normalizedValue}`,
      textColor: "white",
      background: "rgba(15,23,42,0.72)",
      borderColor: "rgba(148,163,184,0.18)",
      accent: "#94A3B8",
    }
  );
}

function formatTimelineTick(timestampMs) {
  if (!timestampMs) return "";
  return new Date(Number(timestampMs)).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimelineTooltip(timestampMs) {
  if (!timestampMs) return "N/A";
  return new Date(Number(timestampMs)).toLocaleString();
}

function formatSmartTimelineTick(timestampMs, totalRangeMs) {
  if (!timestampMs) return "";

  const date = new Date(Number(timestampMs));
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (totalRangeMs >= 5 * oneDayMs) {
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  }

  if (totalRangeMs >= oneDayMs) {
    return date.toLocaleDateString([], {
      weekday: "short",
      day: "numeric",
    });
  }

  return formatTimelineTick(timestampMs);
}

function buildTimelineTicks(fromTs, toTs, count = 6) {
  const startMs = Number(fromTs) * 1000;
  const endMs = Number(toTs) * 1000;
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
    return [];
  }

  if (count <= 1) {
    return [startMs];
  }

  const step = (endMs - startMs) / (count - 1);
  return Array.from({ length: count }, (_, index) => startMs + step * index);
}

function buildStatusSegments(points, fromTs, toTs) {
  if (!Array.isArray(points) || !points.length) {
    return [];
  }

  const startMs = Number(fromTs) * 1000;
  const endMs = Number(toTs) * 1000;
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
    return [];
  }

  const validPoints = points
    .filter((point) => Array.isArray(point) && point.length >= 2 && point[0] !== null)
    .map(([timestampMs, value]) => [Number(timestampMs), value])
    .filter(([timestampMs]) => !Number.isNaN(timestampMs))
    .sort((left, right) => left[0] - right[0]);

  if (!validPoints.length) {
    return [];
  }

  const segments = [];
  for (let index = 0; index < validPoints.length; index += 1) {
    const [timestampMs, value] = validPoints[index];
    const nextTimestampMs = validPoints[index + 1]?.[0] ?? endMs;
    const segmentStart = Math.max(timestampMs, startMs);
    const segmentEnd = Math.min(nextTimestampMs, endMs);

    if (segmentEnd <= segmentStart) {
      continue;
    }

    const appearance =
      value === null || value === undefined || Number.isNaN(Number(value))
        ? getServiceCheckAppearance(3)
        : getServiceCheckAppearance(value) || getServiceCheckAppearance(3);
    segments.push({
      startMs: segmentStart,
      endMs: segmentEnd,
      start: `${((segmentStart - startMs) / (endMs - startMs)) * 100}%`,
      width: `${((segmentEnd - segmentStart) / (endMs - startMs)) * 100}%`,
      appearance,
    });
  }

  return segments;
}

function StatusTimelineBar({ title, state, forceNoData = false }) {
  const points =
    state?.data?.series?.find((series) => Array.isArray(series?.pointlist) && series.pointlist.length > 0)
      ?.pointlist || [];
  const hasValuedPoints = points.some(
    (point) =>
      Array.isArray(point) &&
      point.length >= 2 &&
      point[0] !== null &&
      point[0] !== undefined &&
      point[1] !== null &&
      point[1] !== undefined &&
      !Number.isNaN(Number(point[1]))
  );
  const segments = forceNoData
    ? []
    : buildStatusSegments(points, state?.data?.from_ts, state?.data?.to_ts);
  const totalRangeMs =
    Number(state?.data?.to_ts ?? 0) * 1000 - Number(state?.data?.from_ts ?? 0) * 1000;
  const tickTimes = buildTimelineTicks(state?.data?.from_ts, state?.data?.to_ts, 6);

  return (
    <Paper
      sx={{
        p: 1.5,
        borderRadius: 2.5,
        bgcolor: "rgba(15,23,42,0.72)",
        border: "1px solid rgba(148,163,184,0.18)",
        minHeight: 116,
        color: "white",
      }}
    >
      <Typography variant="overline" sx={{ color: "#94A3B8", letterSpacing: 1.1 }}>
        {title}
      </Typography>
      {state?.loading ? (
        <Box sx={{ mt: 1.25 }}>
          <Box sx={{ height: 20, borderRadius: 999, bgcolor: "rgba(148,163,184,0.14)" }} />
        </Box>
      ) : state?.error ? (
        <Alert severity="error" sx={{ mt: 1 }}>
          {state.error}
        </Alert>
      ) : (
        <>
          <Box
            sx={{
              mt: 1.25,
              height: 22,
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.24)",
              background: "rgba(15,23,42,0.9)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {segments.length && hasValuedPoints ? (
              segments.map((segment, index) => (
                <Tooltip
                  key={`${title}-${index}`}
                  arrow
                  placement="top"
                  componentsProps={{
                    tooltip: {
                      sx: {
                        bgcolor: "rgba(15,23,42,0.96)",
                        color: "white",
                        border: `1px solid ${segment.appearance.borderColor}`,
                        borderRadius: 2,
                        px: 1.5,
                        py: 1.1,
                        boxShadow: "0 14px 38px rgba(2,6,23,0.42)",
                        backdropFilter: "blur(10px)",
                        minWidth: 180,
                      },
                    },
                    arrow: {
                      sx: {
                        color: "rgba(15,23,42,0.96)",
                        "&:before": {
                          border: `1px solid ${segment.appearance.borderColor}`,
                        },
                      },
                    },
                  }}
                  title={
                    <Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.85 }}>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            bgcolor: segment.appearance.accent,
                            boxShadow: `0 0 0 3px ${segment.appearance.background}`,
                            flexShrink: 0,
                          }}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 800, letterSpacing: 0.2 }}>
                          {segment.appearance.label}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "auto 1fr",
                          gap: 0.5,
                          alignItems: "center",
                        }}
                      >
                        <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700 }}>
                          From
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#E2E8F0" }}>
                          {formatTimelineTooltip(segment.startMs)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700 }}>
                          To
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#E2E8F0" }}>
                          {formatTimelineTooltip(segment.endMs)}
                        </Typography>
                      </Box>
                    </Box>
                  }
                >
                  <Box
                    sx={{
                      position: "absolute",
                      top: -3,
                      bottom: -3,
                      left: segment.start,
                      width: `max(${segment.width}, 10px)`,
                      bgcolor: segment.appearance.accent,
                      cursor: "pointer",
                      transition: "transform 120ms ease, box-shadow 120ms ease, filter 120ms ease",
                      transformOrigin: "center",
                      "&:hover": {
                        transform: "scaleY(1.35)",
                        filter: "brightness(1.08)",
                        boxShadow: `0 0 0 1px ${segment.appearance.accent}, 0 0 12px ${segment.appearance.accent}`,
                        zIndex: 2,
                      },
                    }}
                  />
                </Tooltip>
              ))
            ) : (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  bgcolor: DATADOG_SERVICE_CHECK_META[3].accent,
                }}
              />
            )}
          </Box>
          <Box sx={{ position: "relative", mt: 0.75, px: 0.25, height: 20 }}>
            {tickTimes.map((timestampMs, index) => {
              const left = tickTimes.length === 1 ? 0 : (index / (tickTimes.length - 1)) * 100;
              return (
                <Box
                  key={`${title}-tick-${index}`}
                  sx={{
                    position: "absolute",
                    left: `${left}%`,
                    transform:
                      index === 0
                        ? "translateX(0)"
                        : index === tickTimes.length - 1
                          ? "translateX(-100%)"
                          : "translateX(-50%)",
                    textAlign: "center",
                    minWidth: 44,
                  }}
                >
                  <Box
                    sx={{
                      width: 1,
                      height: 6,
                      mx: "auto",
                      mb: 0.35,
                      bgcolor: "rgba(148,163,184,0.45)",
                    }}
                  />
                  <Typography variant="caption" sx={{ color: "#CBD5E1", whiteSpace: "nowrap" }}>
                    {formatSmartTimelineTick(timestampMs, totalRangeMs)}
                  </Typography>
                </Box>
              );
            })}
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25, mt: 1 }}>
            {[0, 1, 2, 3].map((code) => (
              <Box key={`${title}-legend-${code}`} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: 0.5,
                    bgcolor: DATADOG_SERVICE_CHECK_META[code].accent,
                  }}
                />
                <Typography variant="caption" sx={{ color: "#CBD5E1" }}>
                  {DATADOG_SERVICE_CHECK_META[code].label}
                </Typography>
              </Box>
            ))}
          </Box>
        </>
      )}
    </Paper>
  );
}

// Latest (most recent) numeric value out of a Datadog service-check
// pointlist - used to read the *current* process/port status rather than
// the whole timeline, so it can be folded into the overall Up Time banner.
function getLatestPointValue(points) {
  const validPoints = (points || [])
    .filter(
      (point) =>
        Array.isArray(point) &&
        point.length >= 2 &&
        point[0] !== null &&
        point[0] !== undefined &&
        point[1] !== null &&
        point[1] !== undefined &&
        !Number.isNaN(Number(point[1]))
    )
    .map(([timestampMs, value]) => [Number(timestampMs), Number(value)])
    .sort((left, right) => left[0] - right[0]);

  if (!validPoints.length) return null;
  return validPoints[validPoints.length - 1][1];
}

function isPortStatusUnavailable(detail, item) {
  const detailListen = Number(detail?.listen ?? 0) || 0;
  const detailConfigPort = Number(detail?.config_meta?.port ?? 0) || 0;
  const detailPortStatus = String(detail?.port_status || "").toLowerCase();
  const itemPortStatusDisplay = String(item?.port_status_display || "").toLowerCase();
  const itemPort = Number(item?.port ?? 0) || 0;

  return (
    detailListen === 0 ||
    detailConfigPort === 0 ||
    !detailPortStatus ||
    detailPortStatus === "not_available" ||
    !itemPortStatusDisplay ||
    itemPortStatusDisplay === "not_available" ||
    itemPort === 0
  );
}

function WatcherStatusMetricsModal({ open, item, onClose }) {
  const theme = useTheme();
  const [period, setPeriod] = useState(10800);
  const [maximizedPeriod, setMaximizedPeriod] = useState(10800);
  const [seriesState, setSeriesState] = useState({});
  const [lastValueState, setLastValueState] = useState({});
  const [statusBarState, setStatusBarState] = useState({});
  const [componentDetailState, setComponentDetailState] = useState({ loading: false, error: "", data: null });
  const [upTimeStatusState, setUpTimeStatusState] = useState({ loading: false, error: "", data: null });
  const [maxUpDaysState, setMaxUpDaysState] = useState({ loading: false, error: "", data: null });
  const [refreshKey, setRefreshKey] = useState(0);
  const [maximizedMetricKey, setMaximizedMetricKey] = useState(null);
  const [maximizedMetricState, setMaximizedMetricState] = useState({
    loading: false,
    error: "",
    data: null,
  });
  const isLight = theme.palette.mode === "light";
  const shimmer = keyframes`
    0% { background-position: 200% 0; opacity: .72; }
    50% { opacity: 1; }
    100% { background-position: -200% 0; opacity: .72; }
  `;
  const skeletonBarBackground = isLight
    ? "linear-gradient(90deg, rgba(37,99,235,.10), rgba(148,163,184,.26), rgba(37,99,235,.10))"
    : "linear-gradient(90deg, rgba(96,165,250,.18), rgba(148,163,184,.38), rgba(96,165,250,.18))";
  const shimmerBlockSx = {
    borderRadius: 999,
    background: skeletonBarBackground,
    backgroundSize: "200% 100%",
    animation: `${shimmer} 1.4s linear infinite`,
  };

  useEffect(() => {
    if (!open) return;
    setPeriod(10800);
    setMaximizedPeriod(10800);
    setMaximizedMetricKey(null);
    setMaximizedMetricState({ loading: false, error: "", data: null });
    setRefreshKey(0);
    setSeriesState(
      Object.fromEntries(
        SERIES_METRICS.map((metric) => [
          metric.key,
          { loading: true, error: "", data: null },
        ])
      )
    );
    setLastValueState(
      Object.fromEntries(
        LAST_VALUE_METRICS.map((metric) => [
          metric.key,
          { loading: true, error: "", data: null },
        ])
      )
    );
    setStatusBarState(
      Object.fromEntries(
        STATUS_BAR_METRICS.map((metric) => [
          metric.key,
          { loading: true, error: "", data: null },
        ])
      )
    );
    setComponentDetailState({ loading: true, error: "", data: null });
    setUpTimeStatusState({ loading: true, error: "", data: null });
    setMaxUpDaysState({ loading: true, error: "", data: null });
  }, [open, item?.key]);

  useEffect(() => {
    if (!maximizedMetricKey) return;
    setMaximizedPeriod(period);
  }, [maximizedMetricKey, period]);

  useEffect(() => {
    if (!open) return undefined;

    const timer = setInterval(() => {
      setRefreshKey((value) => value + 1);
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (!open || !item?.ip || !item?.metricComponent) return;

    let cancelled = false;
    SERIES_METRICS.forEach((metric) => {
      const params = new URLSearchParams({
        host: item.ip,
        component: item.metricComponent,
        period: String(period),
      });

      API.get(`${metric.endpoint}?${params.toString()}`)
        .then((response) => {
          if (cancelled) return;
          setSeriesState((current) => ({
            ...current,
            [metric.key]: { loading: false, error: "", data: response.data },
          }));
        })
        .catch((error) => {
          if (cancelled) return;
          setSeriesState((current) => ({
            ...current,
            [metric.key]: {
              loading: false,
              error: error?.response?.data?.detail || error.message || "Failed to load metric",
              data: current?.[metric.key]?.data ?? null,
            },
          }));
        });
    });

    LAST_VALUE_METRICS.forEach((metric) => {
      const params = new URLSearchParams({
        host: item.ip,
        component: item.metricComponent,
      });

      API.get(`${metric.endpoint}?${params.toString()}`)
        .then((response) => {
          if (cancelled) return;
          setLastValueState((current) => ({
            ...current,
            [metric.key]: { loading: false, error: "", data: response.data },
          }));
        })
        .catch((error) => {
          if (cancelled) return;
          setLastValueState((current) => ({
            ...current,
            [metric.key]: {
              loading: false,
              error: error?.response?.data?.detail || error.message || "Failed to load metric",
              data: current?.[metric.key]?.data ?? null,
            },
          }));
        });
    });

    STATUS_BAR_METRICS.forEach((metric) => {
      const params = new URLSearchParams({
        host: item.ip,
        component: item.metricComponent,
        period: String(period),
        rollup_seconds: String(getDetailedRollupSeconds(period)),
      });

      API.get(`${metric.endpoint}?${params.toString()}`)
        .then((response) => {
          if (cancelled) return;
          setStatusBarState((current) => ({
            ...current,
            [metric.key]: { loading: false, error: "", data: response.data },
          }));
        })
        .catch((error) => {
          if (cancelled) return;
          setStatusBarState((current) => ({
            ...current,
            [metric.key]: {
              loading: false,
              error: error?.response?.data?.detail || error.message || "Failed to load metric",
              data: current?.[metric.key]?.data ?? null,
            },
          }));
        });
    });

    {
      const params = new URLSearchParams({
        ip: item.ip,
        component: item.name,
      });

      API.get(`/component/detail?${params.toString()}`)
        .then((response) => {
          if (cancelled) return;
          setComponentDetailState({ loading: false, error: "", data: response.data?.component ?? null });
        })
        .catch((error) => {
          if (cancelled) return;
          setComponentDetailState((current) => ({
            loading: false,
            error: error?.response?.data?.detail || error.message || "Failed to load component detail",
            data: current.data ?? null,
          }));
        });
    }

    {
      const params = new URLSearchParams({
        host: item.ip,
        component: item.metricComponent,
      });

      API.get(`${UPTIME_STATUS_METRIC.endpoint}?${params.toString()}`)
        .then((response) => {
          if (cancelled) return;
          setUpTimeStatusState({ loading: false, error: "", data: response.data });
        })
        .catch((error) => {
          if (cancelled) return;
          setUpTimeStatusState((current) => ({
            loading: false,
            error: error?.response?.data?.detail || error.message || "Failed to load metric",
            data: current.data ?? null,
          }));
        });
    }

    {
      const params = new URLSearchParams({
        ip: item.ip,
        component: item.name,
      });

      API.get(`/component/max-up-days?${params.toString()}`)
        .then((response) => {
          if (cancelled) return;
          setMaxUpDaysState({ loading: false, error: "", data: response.data });
        })
        .catch((error) => {
          if (cancelled) return;
          setMaxUpDaysState((current) => ({
            loading: false,
            error: error?.response?.data?.detail || error.message || "Failed to load max up days",
            data: current.data ?? null,
          }));
        });
    }

    return () => {
      cancelled = true;
    };
  }, [open, item?.ip, item?.metricComponent, item?.key, period, refreshKey]);

  useEffect(() => {
    if (!open || !maximizedMetricKey || !item?.ip || !item?.metricComponent) return;

    const metric = SERIES_METRICS.find((entry) => entry.key === maximizedMetricKey);
    if (!metric) return;

    let cancelled = false;
    setMaximizedMetricState((current) => ({
      loading: true,
      error: "",
      data: current.data ?? null,
    }));

    const params = new URLSearchParams({
      host: item.ip,
      component: item.metricComponent,
      period: String(maximizedPeriod),
      rollup_seconds: String(getDetailedRollupSeconds(maximizedPeriod)),
    });

    API.get(`${metric.endpoint}?${params.toString()}`)
      .then((response) => {
        if (cancelled) return;
        setMaximizedMetricState({
          loading: false,
          error: "",
          data: response.data,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setMaximizedMetricState((current) => ({
          loading: false,
          error: error?.response?.data?.detail || error.message || "Failed to load metric",
          data: current.data ?? null,
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [item?.ip, item?.metricComponent, maximizedMetricKey, maximizedPeriod, open]);

  const maximizedMetric = SERIES_METRICS.find((metric) => metric.key === maximizedMetricKey) || null;
  const maximizedState = maximizedMetric ? maximizedMetricState : null;
  const maximizedSeries = maximizedState?.data?.series?.find(
    (series) => Array.isArray(series?.pointlist) && series.pointlist.length > 0
  );

  // The Up Time card's status used to come solely from the "exceeded max
  // uptime" monitor, so it could read OK even while the Process/Port Status
  // bars right below it were showing WARNING/CRITICAL the whole period -
  // a contradictory, misleading signal. Fold the *current* process/port
  // status into the same banner so it reflects the worst of all three.
  const portStatusForcedNoData = isPortStatusUnavailable(componentDetailState?.data, item);
  const currentProcessStatusValue = getLatestPointValue(
    statusBarState.processStatus?.data?.series?.find(
      (series) => Array.isArray(series?.pointlist) && series.pointlist.length > 0
    )?.pointlist
  );
  const currentPortStatusValue = portStatusForcedNoData
    ? null
    : getLatestPointValue(
        statusBarState.portStatus?.data?.series?.find(
          (series) => Array.isArray(series?.pointlist) && series.pointlist.length > 0
        )?.pointlist
      );
  const rawUpTimeExceededValue = Number(upTimeStatusState?.data?.value);
  const upTimeExceededValue = Number.isNaN(rawUpTimeExceededValue) ? null : rawUpTimeExceededValue;
  const meaningfulStatusValues = [
    upTimeExceededValue,
    currentProcessStatusValue,
    currentPortStatusValue,
  ].filter((value) => value === 0 || value === 1 || value === 2);
  const overallUpTimeStatusValue = meaningfulStatusValues.length
    ? Math.max(...meaningfulStatusValues)
    : upTimeExceededValue;
  const statusBarsStillLoading =
    Boolean(statusBarState.processStatus?.loading) || Boolean(statusBarState.portStatus?.loading);
  const renderSummarySkeleton = () => (
    <Paper
      sx={{
        p: 1.5,
        borderRadius: 2.5,
        bgcolor: "rgba(15,23,42,0.72)",
        border: "1px solid rgba(148,163,184,0.18)",
        color: "white",
        minHeight: 104,
      }}
    >
      <Box sx={{ ...shimmerBlockSx, height: 11, width: 112, mb: 1.25 }} />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.2fr 1fr 0.8fr" },
          gap: 1.5,
          alignItems: "start",
          mt: 0.5,
        }}
      >
        {[36, 30, 24].map((height, index) => (
          <Box key={index}>
            <Box sx={{ ...shimmerBlockSx, height: 11, width: "52%", mb: 1 }} />
            <Box sx={{ ...shimmerBlockSx, height, width: index === 0 ? "82%" : "70%" }} />
          </Box>
        ))}
      </Box>
      <Box sx={{ ...shimmerBlockSx, height: 11, width: 180, mt: 1.5 }} />
    </Paper>
  );

  const renderChartSkeleton = (height = 190) => (
    <Paper
      sx={{
        p: 1.5,
        borderRadius: 2.5,
        bgcolor: "rgba(15,23,42,0.72)",
        border: "1px solid rgba(148,163,184,0.18)",
        minHeight: height + 44,
        color: "white",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
        <Box sx={{ width: "100%" }}>
          <Box sx={{ ...shimmerBlockSx, height: 14, width: "36%", mb: 1 }} />
          <Box sx={{ ...shimmerBlockSx, height: 12, width: "58%" }} />
        </Box>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            ...shimmerBlockSx,
            flexShrink: 0,
            ml: 1.5,
          }}
        />
      </Box>
      <Box
        sx={{
          height,
          borderRadius: 2,
          border: "1px solid rgba(148,163,184,0.14)",
          background:
            "linear-gradient(180deg, rgba(15,23,42,0.56) 0%, rgba(15,23,42,0.18) 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "repeating-linear-gradient(180deg, transparent 0, transparent 46px, rgba(148,163,184,0.08) 46px, rgba(148,163,184,0.08) 47px)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            left: 18,
            right: 18,
            bottom: 18,
            top: 18,
            ...shimmerBlockSx,
            borderRadius: 2,
            opacity: 0.65,
            clipPath: "polygon(0% 78%, 14% 66%, 28% 72%, 42% 48%, 56% 58%, 70% 34%, 84% 42%, 100% 18%, 100% 100%, 0% 100%)",
          }}
        />
      </Box>
    </Paper>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: "88vh",
          background:
            "linear-gradient(180deg, rgba(10,18,31,0.98) 0%, rgba(15,23,42,0.98) 100%)",
          color: "white",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          py: 1.25,
          borderBottom: "1px solid rgba(148,163,184,0.18)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
          <QueryStatsIcon sx={{ color: METRICS_ACCENT, fontSize: 20 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Watcher Status Metrics
          </Typography>
          {item?.name ? (
            <StatusChip label={item.name} color={METRICS_ACCENT} Icon={MonitorHeartRoundedIcon} />
          ) : null}
          {item?.ip ? (
            <Chip
              label={item.ip}
              size="small"
              sx={{
                bgcolor: "rgba(148, 163, 184, 0.16)",
                color: "#CBD5E1",
                fontFamily: "monospace",
                fontWeight: 600,
              }}
            />
          ) : null}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={period}
              onChange={(event) => setPeriod(Number(event.target.value))}
              MenuProps={periodMenuProps}
              sx={periodSelectSx}
              inputProps={{ "aria-label": "Period" }}
            >
              {PERIOD_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <IconButton size="small" onClick={onClose} sx={tintedIconButtonSx("#94A3B8")}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        <Box sx={{ mt: 1 }}>
          <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
            {LAST_VALUE_METRICS.map((metric) => {
              const state = lastValueState[metric.key];
              const isUpTime = metric.key === "upTime";
              const upTimeDisplay = formatDurationSeconds(state?.data?.value);
              const upTimeStatusAppearance = getDatadogStatusAppearance(overallUpTimeStatusValue);
              const maxUpDaysDisplay = formatDays(maxUpDaysState?.data?.max_up_days);
              const hasUpTimeStatus = Boolean(upTimeStatusAppearance);
              const isCritical = upTimeStatusAppearance?.label === "CRITICAL";
              return (
                <Grid item xs={12} key={metric.key}>
                  <Paper
                    sx={{
                      p: 1.5,
                      borderRadius: 2.5,
                      bgcolor:
                        isUpTime
                          ? hasUpTimeStatus
                            ? upTimeStatusAppearance.background
                            : "rgba(15,23,42,0.72)"
                          : "rgba(15,23,42,0.72)",
                      border:
                        isUpTime
                          ? hasUpTimeStatus
                            ? `1px solid ${upTimeStatusAppearance.borderColor}`
                            : "1px solid rgba(148,163,184,0.18)"
                          : "1px solid rgba(148,163,184,0.18)",
                      color: "white",
                      minHeight: 104,
                      animation:
                        isUpTime && hasUpTimeStatus && isCritical
                          ? "uptime-alert-siren 1.2s ease-in-out infinite"
                          : "none",
                      boxShadow:
                        isUpTime && hasUpTimeStatus && isCritical
                          ? "0 0 0 1px rgba(248,113,113,0.18), 0 0 24px rgba(239,68,68,0.16)"
                          : "none",
                    }}
                  >
                    <Typography variant="overline" sx={{ color: "#94A3B8", letterSpacing: 1.1 }}>
                      {metric.title}
                    </Typography>
                    {state?.loading ? (
                      renderSummarySkeleton()
                    ) : isUpTime &&
                      (upTimeStatusState?.loading || maxUpDaysState?.loading || statusBarsStillLoading) ? (
                      renderSummarySkeleton()
                    ) : state?.error ? (
                      <Alert severity="error" sx={{ mt: 1 }}>
                        {state.error}
                      </Alert>
                    ) : isUpTime && maxUpDaysState?.error ? (
                      <Alert severity="error" sx={{ mt: 1 }}>
                        {maxUpDaysState.error}
                      </Alert>
                    ) : isUpTime && upTimeStatusState?.error ? (
                      <Alert severity="error" sx={{ mt: 1 }}>
                        {upTimeStatusState.error}
                      </Alert>
                    ) : (
                      <>
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", md: "1.1fr 0.9fr 0.8fr" },
                            gap: 1.5,
                            alignItems: "start",
                            mt: 0.5,
                          }}
                        >
                          <Box>
                            <Typography variant="caption" sx={{ color: "#94A3B8", mb: 0.35 }}>
                              Current Up Time
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 800, color: "white" }}>
                              {upTimeDisplay}
                            </Typography>
                          </Box>

                          <Box>
                            <Typography variant="caption" sx={{ color: "#94A3B8", mb: 0.35 }}>
                              Max Up Days
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 800, color: "white" }}>
                              {maxUpDaysDisplay}
                            </Typography>
                          </Box>

                          <Box>
                            <Typography variant="caption" sx={{ color: "#94A3B8", mb: 0.35 }}>
                              Overall Status
                            </Typography>
                            <Typography
                              variant="h5"
                              sx={{
                                fontWeight: 800,
                                color: upTimeStatusAppearance?.textColor || "white",
                              }}
                            >
                              {upTimeStatusAppearance?.label || "N/A"}
                            </Typography>
                          </Box>
                        </Box>
                        <Typography variant="caption" sx={{ color: "#94A3B8", mt: 1, display: "block" }}>
                          {formatLastTimestamp(state?.data?.timestamp_ms)}
                        </Typography>
                      </>
                    )}
                  </Paper>
                </Grid>
              );
            })}
          </Grid>

          <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
            {STATUS_BAR_METRICS.map((metric) => {
              const state = statusBarState[metric.key];
              const forceNoData =
                metric.key === "portStatus" &&
                isPortStatusUnavailable(componentDetailState?.data, item);

              return (
                <Grid item xs={12} key={metric.key}>
                  <StatusTimelineBar title={metric.title} state={state} forceNoData={forceNoData} />
                </Grid>
              );
            })}
          </Grid>

          <Grid container spacing={1.5}>
            {SERIES_METRICS.map((metric) => {
              const state = seriesState[metric.key];
              const firstSeries = state?.data?.series?.find(
                (series) => Array.isArray(series?.pointlist) && series.pointlist.length > 0
              );

              return (
                <Grid item xs={12} md={6} key={metric.key}>
                  <Paper
                    sx={{
                      p: 1.5,
                      borderRadius: 2.5,
                      bgcolor: "rgba(15,23,42,0.72)",
                      border: "1px solid rgba(148,163,184,0.18)",
                      minHeight: 230,
                      color: "white",
                    }}
                  >
                    {state?.loading ? (
                      renderChartSkeleton(190)
                    ) : state?.error ? (
                      <Alert severity="error">{state.error}</Alert>
                    ) : (
                      <MetricsLineChart
                        title={metric.title}
                        subtitle={state?.data?.metric}
                        points={firstSeries?.pointlist || []}
                        color={metric.color}
                        unit={metric.unit}
                        height={190}
                        width={720}
                        headerRight={
                          <IconButton
                            onClick={() => setMaximizedMetricKey(metric.key)}
                            sx={tintedIconButtonSx("#94A3B8")}
                            title={`Maximize ${metric.title}`}
                          >
                            <OpenInFullIcon fontSize="small" />
                          </IconButton>
                        }
                      />
                    )}
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </DialogContent>

      <Dialog
        open={Boolean(maximizedMetric)}
        onClose={() => setMaximizedMetricKey(null)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background:
              "linear-gradient(180deg, rgba(10,18,31,0.99) 0%, rgba(15,23,42,0.99) 100%)",
            color: "white",
            maxWidth: "1400px",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            py: 1.25,
            borderBottom: "1px solid rgba(148,163,184,0.18)",
          }}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {maximizedMetric?.title || "Metric"}
            </Typography>
            <Typography variant="caption" sx={{ color: "#94A3B8" }}>
              {item?.ip || ""} {item?.metricComponent ? `| ${item.metricComponent}` : ""}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={maximizedPeriod}
                onChange={(event) => setMaximizedPeriod(Number(event.target.value))}
                MenuProps={periodMenuProps}
                sx={periodSelectSx}
                inputProps={{ "aria-label": "Period" }}
              >
                {PERIOD_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <IconButton
              size="small"
              onClick={() => setMaximizedMetricKey(null)}
              sx={tintedIconButtonSx("#94A3B8")}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Box sx={{ mt: 1 }}>
            {!maximizedMetric ? null : maximizedState?.loading && !maximizedState?.data ? (
              renderChartSkeleton(360)
            ) : maximizedState?.error && !maximizedState?.data ? (
              <Alert severity="error">{maximizedState.error}</Alert>
            ) : (
              <Paper
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: "rgba(15,23,42,0.72)",
                  border: "1px solid rgba(148,163,184,0.18)",
                }}
              >
                <MetricsLineChart
                  title={maximizedMetric.title}
                  subtitle={maximizedState?.data?.metric}
                  points={maximizedSeries?.pointlist || []}
                  color={maximizedMetric.color}
                  unit={maximizedMetric.unit}
                  height={360}
                  width={1200}
                />
              </Paper>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes uptime-alert-siren {
          0% {
            background-color: rgba(127,29,29,0.45);
            box-shadow: 0 0 0 1px rgba(248,113,113,0.18), 0 0 10px rgba(239,68,68,0.10);
          }
          50% {
            background-color: rgba(153,27,27,0.78);
            box-shadow: 0 0 0 1px rgba(252,165,165,0.28), 0 0 34px rgba(248,113,113,0.28);
          }
          100% {
            background-color: rgba(127,29,29,0.45);
            box-shadow: 0 0 0 1px rgba(248,113,113,0.18), 0 0 10px rgba(239,68,68,0.10);
          }
        }
      `}</style>
    </Dialog>
  );
}

WatcherStatusMetricsModal.propTypes = {
  open: PropTypes.bool.isRequired,
  item: PropTypes.shape({
    ip: PropTypes.string,
    key: PropTypes.string,
    metricComponent: PropTypes.string,
    name: PropTypes.string,
    port: PropTypes.number,
    port_status_display: PropTypes.string,
  }),
  onClose: PropTypes.func.isRequired,
};

WatcherStatusMetricsModal.defaultProps = {
  item: null,
};

export default WatcherStatusMetricsModal;
