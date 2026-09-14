import { useCallback, useEffect, useState } from "react";
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
} from "@mui/material";
import { keyframes } from "@mui/system";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import RoomOutlinedIcon from "@mui/icons-material/RoomOutlined";

import { API } from "../../services/auth";
import MetricsLineChart from "../WatcherStatus/MetricsLineChart";
import StatusChip from "./StatusChip";
import hexToRgb from "../shared/hexToRgb";
import { getOsConfig } from "./statusConfig";

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
    key: "cpuUser",
    endpoint: "/datadog-metrics/fetch-server-cpu-metric",
    title: "CPU User",
    color: "#FF6B35",
    unit: "%",
  },
  {
    key: "memoryUsed",
    endpoint: "/datadog-metrics/fetch-server-memory-used-metric",
    title: "Memory Used",
    color: "#22C55E",
    unit: "bytes",
  },
  {
    key: "memoryUsablePercent",
    endpoint: "/datadog-metrics/fetch-server-memory-usable-percent-metric",
    title: "Memory Usable",
    color: "#0EA5E9",
    unit: "%",
  },
  {
    key: "load1",
    endpoint: "/datadog-metrics/fetch-server-load1-metric",
    title: "Load Average (1m)",
    color: "#F59E0B",
    unit: "",
  },
];

const LAST_VALUE_METRICS = [
  {
    key: "uptime",
    endpoint: "/datadog-metrics/fetch-server-uptime-metric",
    title: "System Uptime",
  },
];

function scaleMetricSeries(metricKey, payload) {
  if (!payload || metricKey !== "memoryUsablePercent") {
    return payload;
  }

  return {
    ...payload,
    series: (payload.series || []).map((series) => ({
      ...series,
      pointlist: (series.pointlist || []).map((point) => {
        if (!Array.isArray(point) || point.length < 2 || point[1] === null || point[1] === undefined) {
          return point;
        }
        return [point[0], Number(point[1]) * 100];
      }),
    })),
  };
}

function formatLastTimestamp(timestampMs) {
  if (!timestampMs) return "No timestamp";
  return new Date(Number(timestampMs)).toLocaleString();
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

function getDetailedRollupSeconds(period) {
  if (period <= 3600) return 10;
  if (period <= 3 * 3600) return 15;
  if (period <= 6 * 3600) return 20;
  if (period <= 12 * 3600) return 30;
  if (period <= 24 * 3600) return 60;
  if (period <= 3 * 24 * 3600) return 300;
  return 600;
}

function HostDetailsMetricsModal({ open, row, onClose }) {
  const theme = useTheme();
  const [period, setPeriod] = useState(10800);
  const [maximizedPeriod, setMaximizedPeriod] = useState(10800);
  const [seriesState, setSeriesState] = useState({});
  const [lastValueState, setLastValueState] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [maximizedMetricKey, setMaximizedMetricKey] = useState(null);
  const [maximizedMetricState, setMaximizedMetricState] = useState({
    loading: false,
    error: "",
    data: null,
  });
  const [resolvedHost, setResolvedHost] = useState(null);
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

  const hasSeriesData = (payload) =>
    Boolean(
      payload?.series?.some((series) =>
        Array.isArray(series?.pointlist) &&
        series.pointlist.some(
          (point) =>
            Array.isArray(point) &&
            point.length >= 2 &&
            point[0] !== null &&
            point[1] !== null
        )
      )
    );

  const hasLastValueData = (payload) =>
    payload?.value !== null &&
    payload?.value !== undefined &&
    payload?.timestamp_ms !== null &&
    payload?.timestamp_ms !== undefined;

  const fetchMetricWithFallback = useCallback(async ({ endpoint, params, fallbackHost, isLastValue }) => {
    const primaryResponse = await API.get(`${endpoint}?${params.toString()}`);
    const primaryData = primaryResponse.data;
    const hasPrimaryData = isLastValue ? hasLastValueData(primaryData) : hasSeriesData(primaryData);

    if (hasPrimaryData || !fallbackHost || fallbackHost === params.get("host")) {
      return { data: primaryData, hostUsed: params.get("host") };
    }

    const fallbackParams = new URLSearchParams(params);
    fallbackParams.set("host", fallbackHost);
    const fallbackResponse = await API.get(`${endpoint}?${fallbackParams.toString()}`);
    const fallbackData = fallbackResponse.data;
    const hasFallbackData = isLastValue ? hasLastValueData(fallbackData) : hasSeriesData(fallbackData);

    if (hasFallbackData) {
      return { data: fallbackData, hostUsed: fallbackHost };
    }

    return { data: primaryData, hostUsed: params.get("host") };
  }, []);

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
    setResolvedHost(row?.ip || null);
  }, [open, row?.region, row?.ip]);

  useEffect(() => {
    if (!open) return undefined;

    const timer = window.setInterval(() => {
      setRefreshKey((value) => value + 1);
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (!open || !row?.ip) return;

    let cancelled = false;

    SERIES_METRICS.forEach((metric) => {
      setSeriesState((current) => ({
        ...current,
        [metric.key]: {
          loading: current?.[metric.key]?.data == null,
          error: "",
          data: current?.[metric.key]?.data ?? null,
        },
      }));

      const params = new URLSearchParams({
        host: resolvedHost || row.ip,
        period: String(period),
      });

      fetchMetricWithFallback({
        endpoint: metric.endpoint,
        params,
        fallbackHost: row.instance_id,
        isLastValue: false,
      })
        .then(({ data, hostUsed }) => {
          if (cancelled) return;
          if (hostUsed && hostUsed !== resolvedHost) {
            setResolvedHost(hostUsed);
          }
          setSeriesState((current) => ({
            ...current,
            [metric.key]: { loading: false, error: "", data: scaleMetricSeries(metric.key, data) },
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
      setLastValueState((current) => ({
        ...current,
        [metric.key]: {
          loading: current?.[metric.key]?.data == null,
          error: "",
          data: current?.[metric.key]?.data ?? null,
        },
      }));

      const params = new URLSearchParams({
        host: resolvedHost || row.ip,
      });

      fetchMetricWithFallback({
        endpoint: metric.endpoint,
        params,
        fallbackHost: row.instance_id,
        isLastValue: true,
      })
        .then(({ data, hostUsed }) => {
          if (cancelled) return;
          if (hostUsed && hostUsed !== resolvedHost) {
            setResolvedHost(hostUsed);
          }
          setLastValueState((current) => ({
            ...current,
            [metric.key]: { loading: false, error: "", data },
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

    return () => {
      cancelled = true;
    };
  }, [fetchMetricWithFallback, open, row?.ip, row?.instance_id, period, refreshKey, resolvedHost]);

  useEffect(() => {
    if (!maximizedMetricKey) return;
    setMaximizedPeriod(period);
  }, [maximizedMetricKey, period]);

  useEffect(() => {
    if (!open || !maximizedMetricKey || !row?.ip) return;

    const metric = SERIES_METRICS.find((entry) => entry.key === maximizedMetricKey);
    if (!metric) return;

    let cancelled = false;
    setMaximizedMetricState((current) => ({
      loading: true,
      error: "",
      data: current.data ?? null,
    }));

    const params = new URLSearchParams({
      host: resolvedHost || row.ip,
      period: String(maximizedPeriod),
      rollup_seconds: String(getDetailedRollupSeconds(maximizedPeriod)),
    });

    fetchMetricWithFallback({
      endpoint: metric.endpoint,
      params,
      fallbackHost: row.instance_id,
      isLastValue: false,
    })
      .then(({ data, hostUsed }) => {
        if (cancelled) return;
        if (hostUsed && hostUsed !== resolvedHost) {
          setResolvedHost(hostUsed);
        }
        setMaximizedMetricState({
          loading: false,
          error: "",
          data: scaleMetricSeries(metric.key, data),
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setMaximizedMetricState({
          loading: false,
          error: error?.response?.data?.detail || error.message || "Failed to load metric",
          data: null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    fetchMetricWithFallback,
    maximizedMetricKey,
    maximizedPeriod,
    open,
    resolvedHost,
    row?.instance_id,
    row?.ip,
  ]);

  const maximizedMetric = SERIES_METRICS.find((metric) => metric.key === maximizedMetricKey) || null;
  const maximizedState = maximizedMetric ? maximizedMetricState : null;
  const maximizedSeries = maximizedState?.data?.series?.find(
    (series) => Array.isArray(series?.pointlist) && series.pointlist.length > 0
  );
  const renderSummarySkeleton = () => (
    <Paper
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: "rgba(15,23,42,0.72)",
        border: "1px solid rgba(148,163,184,0.18)",
        color: "white",
        minHeight: 68,
        display: "flex",
        alignItems: "center",
        gap: 3,
      }}
    >
      <Box sx={{ ...shimmerBlockSx, height: 12, width: 118 }} />
      <Box sx={{ ...shimmerBlockSx, height: 24, width: 96 }} />
      <Box sx={{ ...shimmerBlockSx, height: 12, width: 160 }} />
    </Paper>
  );

  const renderChartSkeleton = (height = 210) => (
    <Paper
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: "rgba(15,23,42,0.72)",
        border: "1px solid rgba(148,163,184,0.18)",
        minHeight: height + 40,
        color: "white",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
        <Box sx={{ width: "100%" }}>
          <Box sx={{ ...shimmerBlockSx, height: 14, width: "38%", mb: 1 }} />
          <Box sx={{ ...shimmerBlockSx, height: 12, width: "54%" }} />
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
            clipPath: "polygon(0% 72%, 16% 58%, 31% 64%, 48% 42%, 63% 50%, 79% 24%, 100% 34%, 100% 100%, 0% 100%)",
          }}
        />
      </Box>
    </Paper>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: "92vh",
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
          borderBottom: "1px solid rgba(148,163,184,0.18)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <MonitorHeartIcon sx={{ color: "#FF6B35" }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Host Details Metrics
          </Typography>
          {row?.region ? (
            <StatusChip label={row.region} color="#60A5FA" Icon={RoomOutlinedIcon} />
          ) : null}
          {row?.ip ? (
            <Chip
              label={row.ip}
              size="small"
              sx={{
                bgcolor: "rgba(148, 163, 184, 0.16)",
                color: "#CBD5E1",
                fontFamily: "monospace",
                fontWeight: 600,
              }}
            />
          ) : null}
          {row?.os
            ? (() => {
                const { color, Icon } = getOsConfig(row.os);
                return <StatusChip label={row.os} color={color} Icon={Icon} />;
              })()
            : null}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
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

          <IconButton onClick={onClose} sx={tintedIconButtonSx("#94A3B8")}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        <Box sx={{ mt: 1 }}>
          <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
            {LAST_VALUE_METRICS.map((metric) => {
              const state = lastValueState[metric.key];
              return (
                <Grid item xs={12} key={metric.key}>
                  {state?.loading ? (
                    renderSummarySkeleton()
                  ) : (
                    <Paper
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: "rgba(15,23,42,0.72)",
                        border: "1px solid rgba(148,163,184,0.18)",
                        color: "white",
                        minHeight: 68,
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        flexWrap: "wrap",
                      }}
                    >
                      <Typography
                        variant="overline"
                        sx={{ color: "#94A3B8", letterSpacing: 1.1, whiteSpace: "nowrap" }}
                      >
                        {metric.title}
                      </Typography>
                      {state?.error ? (
                        <Alert severity="error" sx={{ py: 0, flex: 1 }}>
                          {state.error}
                        </Alert>
                      ) : (
                        <>
                          <Typography variant="h5" sx={{ fontWeight: 800 }}>
                            {formatDurationSeconds(state?.data?.value)}
                          </Typography>
                          <Typography variant="body2" sx={{ color: "#94A3B8" }}>
                            {formatLastTimestamp(state?.data?.timestamp_ms)}
                          </Typography>
                        </>
                      )}
                    </Paper>
                  )}
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
                      borderRadius: 2,
                      bgcolor: "rgba(15,23,42,0.72)",
                      border: "1px solid rgba(148,163,184,0.18)",
                      minHeight: 250,
                      color: "white",
                    }}
                  >
                    {state?.loading ? (
                      renderChartSkeleton(210)
                    ) : state?.error ? (
                      <Alert severity="error">{state.error}</Alert>
                    ) : (
                      <MetricsLineChart
                        title={metric.title}
                        subtitle={state?.data?.metric}
                        points={firstSeries?.pointlist || []}
                        color={metric.color}
                        unit={metric.unit || undefined}
                        height={210}
                        width={640}
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
            borderBottom: "1px solid rgba(148,163,184,0.18)",
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {maximizedMetric?.title || "Metric"}
            </Typography>
            <Typography variant="caption" sx={{ color: "#94A3B8" }}>
              {row?.ip || ""} {row?.region ? `| ${row.region}` : ""}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
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

            <IconButton onClick={() => setMaximizedMetricKey(null)} sx={tintedIconButtonSx("#94A3B8")}>
              <CloseIcon />
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
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "rgba(15,23,42,0.72)",
                  border: "1px solid rgba(148,163,184,0.18)",
                }}
              >
                <MetricsLineChart
                  title={maximizedMetric.title}
                  subtitle={maximizedState?.data?.metric}
                  points={maximizedSeries?.pointlist || []}
                  color={maximizedMetric.color}
                  unit={maximizedMetric.unit || undefined}
                  height={360}
                  width={1200}
                />
              </Paper>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

HostDetailsMetricsModal.propTypes = {
  open: PropTypes.bool.isRequired,
  row: PropTypes.shape({
    instance_id: PropTypes.string,
    ip: PropTypes.string,
    os: PropTypes.string,
    region: PropTypes.string,
  }),
  onClose: PropTypes.func.isRequired,
};

HostDetailsMetricsModal.defaultProps = {
  row: null,
};

export default HostDetailsMetricsModal;
