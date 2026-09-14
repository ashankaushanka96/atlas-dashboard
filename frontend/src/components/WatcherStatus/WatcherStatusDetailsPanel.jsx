import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { keyframes } from "@mui/system";
import PropTypes from "prop-types";
import StatusChip from "../HostDetails/StatusChip";
import { formatStatusLabel, getPortStatusConfig, getProcessStatusConfig } from "./statusChipUtils";

const SectionBox = ({ title, loading, error, children }) => {
  const theme = useTheme();
  const shimmer = keyframes`
    0% { background-position: 200% 0; opacity: .72; }
    50% { opacity: 1; }
    100% { background-position: -200% 0; opacity: .72; }
  `;
  const isLight = theme.palette.mode === "light";
  const skeletonBarBackground = isLight
    ? "linear-gradient(90deg, rgba(37,99,235,.10), rgba(148,163,184,.26), rgba(37,99,235,.10))"
    : "linear-gradient(90deg, rgba(96,165,250,.18), rgba(148,163,184,.38), rgba(96,165,250,.18))";
  const shimmerBlockSx = {
    borderRadius: 999,
    background: skeletonBarBackground,
    backgroundSize: "200% 100%",
    animation: `${shimmer} 1.4s linear infinite`,
  };

  return (
    <Box
      sx={{
        p: 1.5,
        height: "100%",
        width: "100%",
        borderRadius: 2,
        border: "1px solid",
        borderColor: theme.palette.divider,
        background:
          theme.palette.mode === "light"
            ? "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(243,247,255,0.98))"
            : "linear-gradient(180deg, rgba(18,26,43,0.96), rgba(20,32,52,0.98))",
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, fontSize: "0.9rem" }}>
        {title}
      </Typography>
      {loading ? (
        <Stack spacing={1}>
          <Box sx={{ ...shimmerBlockSx, height: 16, width: "42%" }} />
          <Box sx={{ ...shimmerBlockSx, height: 11, width: "74%" }} />
          <Box sx={{ ...shimmerBlockSx, height: 11, width: "58%" }} />
        </Stack>
      ) : error ? (
        <Alert severity="error">{String(error)}</Alert>
      ) : (
        children
      )}
    </Box>
  );
};

const DetailItem = ({ label, value, monospace = false }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
      {label}
    </Typography>
    <Typography
      variant="body2"
      sx={{
        mt: 0.35,
        fontWeight: 500,
        fontFamily: monospace ? "monospace" : "inherit",
        lineHeight: 1.25,
      }}
    >
      {value}
    </Typography>
  </Box>
);

const formatBooleanLabel = (value) => {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return "Yes";
    }
    if (normalized === "false") {
      return "No";
    }
  }

  return value ? "Yes" : "No";
};

const formatTimestamp = (value) => {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  const numericValue = Number(value);
  const date = new Date(Number.isNaN(numericValue) ? value : numericValue * 1000);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
};

const formatUptime = (value) => {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  const totalSeconds = Number(value);
  if (Number.isNaN(totalSeconds) || totalSeconds < 0) {
    return String(value);
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
};

const formatDays = (value) => {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return String(value);
  }

  return `${numericValue} day${numericValue === 1 ? "" : "s"}`;
};

const formatScheduleTime = (value, useLocalTime) => {
  if (!value) {
    return "N/A";
  }

  const match = String(value)
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);

  if (!match) {
    return String(value);
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] || 0);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    Number.isNaN(seconds) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    return String(value);
  }

  if (!useLocalTime) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;
  }

  const utcDate = new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds));

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(utcDate);
};

const getCurrentEffectiveDay = (useLocalTime) => {
  const now = new Date();
  const dayIndex = useLocalTime ? now.getDay() : now.getUTCDay();
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return days[dayIndex] || "";
};

function WatcherStatusDetailsPanel({ comp, loading, error }) {
  const [showLocalScheduleTime, setShowLocalScheduleTime] = useState(false);
  const meta = comp?.meta || {};
  const schedules = Array.isArray(meta.schedules) ? meta.schedules : [];
  const localTimeZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Local Time",
    []
  );
  const currentEffectiveDay = getCurrentEffectiveDay(showLocalScheduleTime);

  return (
    <Stack spacing={1.5}>
      <SectionBox title="Basic Information" loading={loading} error={error}>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} md={4}>
            <DetailItem label="Component Name" value={comp?.name || "N/A"} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DetailItem label="IP Address" value={comp?.ip || "N/A"} monospace />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DetailItem label="Region" value={comp?.region || "N/A"} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DetailItem label="Port" value={comp?.port ?? "N/A"} monospace />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DetailItem
              label="Needs To Run"
              value={formatBooleanLabel(comp?.needs_to_run)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DetailItem label="Timestamp" value={formatTimestamp(comp?.ts)} />
          </Grid>
        </Grid>
      </SectionBox>

      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: { xs: "1fr", md: "minmax(0, 5fr) minmax(0, 7fr)" },
          alignItems: "stretch",
        }}
      >
        <Box sx={{ minWidth: 0, display: "flex" }}>
          <SectionBox title="Status Information" loading={loading} error={error}>
            <Stack spacing={1.25}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Process Status
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {(() => {
                    const { color, Icon } = getProcessStatusConfig(comp?.process_status);
                    return (
                      <StatusChip
                        label={formatStatusLabel(comp?.process_status)}
                        color={color}
                        Icon={Icon}
                      />
                    );
                  })()}
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Port Status
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {(() => {
                    const { color, Icon } = getPortStatusConfig(comp?.port_status_display);
                    return (
                      <StatusChip
                        label={formatStatusLabel(comp?.port_status_display)}
                        color={color}
                        Icon={Icon}
                      />
                    );
                  })()}
                </Box>
              </Box>
              <DetailItem label="Uptime" value={formatUptime(comp?.uptime_seconds)} monospace />
            </Stack>
          </SectionBox>
        </Box>

        <Box sx={{ minWidth: 0, display: "flex" }}>
          <SectionBox title="Watcher Configuration" loading={loading} error={error}>
            <Stack spacing={1.25}>
              <DetailItem label="Tag" value={meta.tag ?? "N/A"} />

              <Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: { xs: "flex-start", sm: "center" },
                    justifyContent: "space-between",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Schedules
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setShowLocalScheduleTime((current) => !current)}
                    sx={{ minWidth: 0, px: 1.25 }}
                  >
                    {showLocalScheduleTime ? "Show GMT" : "Convert To Local Time"}
                  </Button>
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.5 }}
                >
                  {showLocalScheduleTime
                    ? `Displaying times in local timezone: ${localTimeZone}`
                    : "Displaying schedule times in GMT"}
                </Typography>
                {schedules.length ? (
                  <TableContainer
                    sx={{
                      mt: 0.5,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1.5,
                      overflow: "hidden",
                    }}
                  >
                    <Table
                      size="small"
                      sx={{
                        "& .MuiTableCell-root": {
                          py: 0.35,
                          px: 1,
                          fontSize: "0.75rem",
                          lineHeight: 1.2,
                        },
                        "& .MuiTableHead-root .MuiTableCell-root": {
                          fontWeight: 700,
                        },
                      }}
                    >
                      <TableHead>
                        <TableRow>
                          <TableCell>Effective Day</TableCell>
                          <TableCell>
                            {showLocalScheduleTime
                              ? `Start Time (${localTimeZone})`
                              : "Start Time (GMT)"}
                          </TableCell>
                          <TableCell>
                            {showLocalScheduleTime
                              ? `End Time (${localTimeZone})`
                              : "End Time (GMT)"}
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {schedules.map((schedule, index) => {
                          const isToday =
                            String(schedule?.effective_day || "").toLowerCase() ===
                            currentEffectiveDay.toLowerCase();

                          return (
                            <TableRow
                              key={`${schedule?.effective_day || "schedule"}-${schedule?.start_time || index}-${schedule?.end_time || index}`}
                              sx={{
                                backgroundColor: isToday
                                  ? "rgba(96, 165, 250, 0.12)"
                                  : "transparent",
                                boxShadow: isToday
                                  ? "inset 3px 0 0 rgba(96, 165, 250, 0.9)"
                                  : "none",
                                "& .MuiTableCell-root": {
                                  fontWeight: isToday ? 700 : 500,
                                },
                              }}
                            >
                              <TableCell>{schedule?.effective_day || "N/A"}</TableCell>
                              <TableCell>
                                {formatScheduleTime(schedule?.start_time, showLocalScheduleTime)}
                              </TableCell>
                              <TableCell>
                                {formatScheduleTime(schedule?.end_time, showLocalScheduleTime)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" sx={{ mt: 0.35, fontWeight: 500 }}>
                    N/A
                  </Typography>
                )}
              </Box>

              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <DetailItem
                    label="Max Up Days"
                    value={formatDays(meta.max_up_days)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailItem
                    label="Need To Up"
                    value={formatBooleanLabel(meta.need_to_up)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailItem
                    label="Need To Send Mail"
                    value={formatBooleanLabel(meta.need_to_send_mail)}
                  />
                </Grid>
              </Grid>
            </Stack>
          </SectionBox>
        </Box>
      </Box>
    </Stack>
  );
}

SectionBox.propTypes = {
  title: PropTypes.string.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.any,
  children: PropTypes.node,
};

DetailItem.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  monospace: PropTypes.bool,
};

WatcherStatusDetailsPanel.propTypes = {
  comp: PropTypes.object,
  loading: PropTypes.bool,
  error: PropTypes.any,
};

WatcherStatusDetailsPanel.defaultProps = {
  comp: null,
  loading: false,
  error: null,
};

export default WatcherStatusDetailsPanel;
