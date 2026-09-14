import PropTypes from "prop-types";
import {
  Alert,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { keyframes } from "@mui/system";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import ToggleOnOutlinedIcon from "@mui/icons-material/ToggleOnOutlined";
import ToggleOffOutlinedIcon from "@mui/icons-material/ToggleOffOutlined";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RoomOutlinedIcon from "@mui/icons-material/RoomOutlined";
import CalendarViewWeekOutlinedIcon from "@mui/icons-material/CalendarViewWeekOutlined";
import StatusChip from "../HostDetails/StatusChip";

// Fixed pill widths so chips in the same column line up regardless of label
// length (e.g. "Start" vs "Stop", "Enabled" vs "Disabled").
const CHIP_MIN_WIDTH = {
  action: 90,
  schedule_enabled: 110,
  countdown: 110,
};

const chipSx = (column) => ({ minWidth: CHIP_MIN_WIDTH[column], justifyContent: "center" });

function getActionConfig(action) {
  const normalized = String(action || "").toLowerCase();
  if (normalized === "start") return { color: "#34D399", Icon: PlayArrowIcon };
  if (normalized === "stop") return { color: "#E24B4A", Icon: StopIcon };
  return { color: "#94A3B8", Icon: PlayArrowIcon };
}

function getScheduleEnabledConfig(enabled) {
  return enabled
    ? { color: "#34D399", Icon: ToggleOnOutlinedIcon }
    : { color: "#E24B4A", Icon: ToggleOffOutlinedIcon };
}

function getCountdownConfig(countdown) {
  return countdown === "Executed"
    ? { color: "#34D399", Icon: CheckCircleOutlineIcon }
    : { color: "#60A5FA", Icon: AccessTimeIcon };
}

// Backend sends "days" as either a comma-separated list of day names
// ("Mon, Tue, Wed"), a sentinel like "Every day" / "N/A", or (if the cron's
// day-of-week field didn't parse) the raw field verbatim - only the first
// case renders as more than one chip.
function splitDays(days) {
  if (!days) return [];
  const parts = String(days)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : [String(days)];
}

const getSortLabelSx = (sortBy, column) => ({
  transition: "color 180ms ease",
  "& .MuiTableSortLabel-icon": {
    color: sortBy === column ? "#60A5FA !important" : "rgba(148, 163, 184, 0.75)",
    opacity: sortBy === column ? 1 : 0.72,
    transition: "color 180ms ease, opacity 180ms ease",
  },
  "&.Mui-active": { color: "inherit" },
  "&:hover .MuiTableSortLabel-icon": { color: "#93C5FD", opacity: 1 },
});

export const EC2_SCHEDULES_DEFAULT_COLUMNS = [
  { key: "region", label: "Region" },
  { key: "private_ip", label: "IP" },
  { key: "instance_name", label: "Instance Name" },
  { key: "action", label: "Action" },
  { key: "schedule_enabled", label: "Schedule Enabled" },
  { key: "scheduled_time", label: "Scheduled Time (GMT)" },
  { key: "countdown", label: "Countdown" },
];

// Same columns as today's events minus the countdown (these recur, so there's
// nothing to count down to), plus the cron and the days it covers -- without
// those you can't tell a Monday start from a Friday stop.
export const EC2_INSTANCE_SCHEDULES_DEFAULT_COLUMNS = [
  { key: "region", label: "Region" },
  { key: "private_ip", label: "IP" },
  { key: "instance_name", label: "Instance Name" },
  { key: "action", label: "Action" },
  { key: "schedule_enabled", label: "Schedule Enabled" },
  { key: "scheduled_time", label: "Next Run (GMT)" },
  { key: "days", label: "Days" },
  { key: "cron_expression", label: "Cron" },
  { key: "tag_key", label: "Tag", hiddenByDefault: true },
];

function buildColumnDefs({
  sortBy,
  sortDirection,
  onSort,
  formatScheduledTime,
  formatTimeRemaining,
  getLocalTimeTooltip,
  shimmerBlockSx,
  scheduledTimeLabel,
}) {
  const sortableHeader = (key, label, align = "center") => (
    <TableCell key={key} align={align} sortDirection={sortBy === key ? sortDirection : false}>
      <TableSortLabel
        active={sortBy === key}
        direction={sortBy === key ? sortDirection : "asc"}
        onClick={() => onSort(key)}
        sx={getSortLabelSx(sortBy, key)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );

  return {
    region: {
      renderHeader: () => sortableHeader("region", "Region"),
      renderCell: (event) => (
        <TableCell key="region" align="center">
          <StatusChip label={event.region || "N/A"} color="#60A5FA" Icon={RoomOutlinedIcon} />
        </TableCell>
      ),
      renderSkeleton: () => (
        <TableCell key="region" align="center">
          <Box sx={{ ...shimmerBlockSx, height: 24, width: 100, mx: "auto", borderRadius: 999 }} />
        </TableCell>
      ),
    },
    private_ip: {
      renderHeader: () => sortableHeader("private_ip", "IP", "left"),
      renderCell: (event) => (
        <TableCell key="private_ip" align="left">
          <Typography variant="body2" fontFamily="monospace">
            {event.private_ip || "N/A"}
          </Typography>
        </TableCell>
      ),
      renderSkeleton: () => (
        <TableCell key="private_ip" align="left">
          <Box sx={{ ...shimmerBlockSx, height: 12, width: "48%" }} />
        </TableCell>
      ),
    },
    instance_name: {
      renderHeader: () => sortableHeader("instance_name", "Instance Name", "left"),
      renderCell: (event) => (
        <TableCell key="instance_name" align="left">
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {event.instance_name || "N/A"}
          </Typography>
        </TableCell>
      ),
      renderSkeleton: () => (
        <TableCell key="instance_name" align="left">
          <Box sx={{ ...shimmerBlockSx, height: 12, width: "72%" }} />
        </TableCell>
      ),
    },
    action: {
      renderHeader: () => sortableHeader("action", "Action"),
      renderCell: (event) => {
        const { color, Icon } = getActionConfig(event.action);
        return (
          <TableCell key="action" align="center">
            <StatusChip label={event.action || "N/A"} color={color} Icon={Icon} sx={chipSx("action")} />
          </TableCell>
        );
      },
      renderSkeleton: () => (
        <TableCell key="action" align="center">
          <Box sx={{ ...shimmerBlockSx, height: 24, width: CHIP_MIN_WIDTH.action, mx: "auto", borderRadius: 999 }} />
        </TableCell>
      ),
    },
    schedule_enabled: {
      renderHeader: () => sortableHeader("schedule_enabled", "Schedule Enabled"),
      renderCell: (event) => {
        const { color, Icon } = getScheduleEnabledConfig(event.schedule_enabled);
        return (
          <TableCell key="schedule_enabled" align="center">
            <StatusChip
              label={event.schedule_enabled ? "Enabled" : "Disabled"}
              color={color}
              Icon={Icon}
              sx={chipSx("schedule_enabled")}
            />
          </TableCell>
        );
      },
      renderSkeleton: () => (
        <TableCell key="schedule_enabled" align="center">
          <Box
            sx={{ ...shimmerBlockSx, height: 24, width: CHIP_MIN_WIDTH.schedule_enabled, mx: "auto", borderRadius: 999 }}
          />
        </TableCell>
      ),
    },
    scheduled_time: {
      renderHeader: () => sortableHeader("scheduled_time", scheduledTimeLabel),
      renderCell: (event) => (
        <TableCell key="scheduled_time" align="center">
          <Tooltip title={getLocalTimeTooltip(event.scheduled_time)} arrow>
            <Typography variant="body2" fontFamily="monospace">
              {formatScheduledTime(event.scheduled_time)}
            </Typography>
          </Tooltip>
        </TableCell>
      ),
      renderSkeleton: () => (
        <TableCell key="scheduled_time" align="center">
          <Box sx={{ ...shimmerBlockSx, height: 12, width: "54%", mx: "auto" }} />
        </TableCell>
      ),
    },
    days: {
      renderHeader: () => sortableHeader("days", "Days"),
      renderCell: (event) => {
        const dayLabels = splitDays(event.days);
        return (
          <TableCell key="days" align="center">
            {dayLabels.length ? (
              <Box sx={{ display: "inline-flex", flexWrap: "wrap", gap: 0.5, justifyContent: "center" }}>
                {dayLabels.map((day, index) => (
                  <StatusChip
                    key={`${day}-${index}`}
                    label={day}
                    color="#34D399"
                    Icon={CalendarViewWeekOutlinedIcon}
                  />
                ))}
              </Box>
            ) : (
              <Typography variant="body2">N/A</Typography>
            )}
          </TableCell>
        );
      },
      renderSkeleton: () => (
        <TableCell key="days" align="center">
          <Box sx={{ ...shimmerBlockSx, height: 24, width: "70%", mx: "auto", borderRadius: 999 }} />
        </TableCell>
      ),
    },
    cron_expression: {
      renderHeader: () => sortableHeader("cron_expression", "Cron"),
      renderCell: (event) => (
        <TableCell key="cron_expression" align="center" sx={{ py: "12px !important" }}>
          <Typography
            variant="body2"
            fontFamily="monospace"
            sx={{ letterSpacing: "0.04em", lineHeight: 1.8 }}
          >
            {event.cron_expression || "N/A"}
          </Typography>
        </TableCell>
      ),
      renderSkeleton: () => (
        <TableCell key="cron_expression" align="center">
          <Box sx={{ ...shimmerBlockSx, height: 12, width: "60%", mx: "auto" }} />
        </TableCell>
      ),
    },
    tag_key: {
      renderHeader: () => sortableHeader("tag_key", "Tag"),
      renderCell: (event) => (
        <TableCell key="tag_key" align="center">
          <Typography variant="body2" fontFamily="monospace">
            {event.tag_key || "N/A"}
          </Typography>
        </TableCell>
      ),
      renderSkeleton: () => (
        <TableCell key="tag_key" align="center">
          <Box sx={{ ...shimmerBlockSx, height: 12, width: "60%", mx: "auto" }} />
        </TableCell>
      ),
    },
    countdown: {
      renderHeader: () => sortableHeader("countdown", "Countdown"),
      renderCell: (event) => {
        const countdown = formatTimeRemaining(event.scheduled_time);
        const { color, Icon } = getCountdownConfig(countdown);
        return (
          <TableCell key="countdown" align="center">
            <StatusChip label={countdown} color={color} Icon={Icon} sx={chipSx("countdown")} />
          </TableCell>
        );
      },
      renderSkeleton: () => (
        <TableCell key="countdown" align="center">
          <Box sx={{ ...shimmerBlockSx, height: 24, width: CHIP_MIN_WIDTH.countdown, mx: "auto", borderRadius: 999 }} />
        </TableCell>
      ),
    },
  };
}

function EC2SchedulesTable({
  columnOrder,
  error,
  hasActiveFilters,
  loading,
  onChangePage,
  onChangeRowsPerPage,
  onSort,
  page,
  paginatedEvents,
  rowsPerPage,
  sortBy,
  sortDirection,
  totalCount,
  formatScheduledTime,
  formatTimeRemaining,
  getLocalTimeTooltip,
  scheduledTimeLabel = "Scheduled Time (GMT)",
  emptyLabel = "events",
}) {
  const theme = useTheme();
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
  const loadingPlaceholderCount = Math.max(12, Math.min(rowsPerPage, 16));
  const loadingPlaceholders = Array.from(
    { length: loadingPlaceholderCount },
    (_, index) => index
  );

  const columnDefs = buildColumnDefs({
    sortBy,
    sortDirection,
    onSort,
    formatScheduledTime,
    formatTimeRemaining,
    getLocalTimeTooltip,
    shimmerBlockSx,
    scheduledTimeLabel,
  });
  const columns = columnOrder.map((key) => columnDefs[key]).filter(Boolean);
  const colCount = columns.length || 1;

  return (
    <Paper
      sx={{
        flex: "1 1 0",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <TableContainer sx={{ flex: "1 1 0", minHeight: 0, overflow: "auto" }}>
        <Table
          stickyHeader
          sx={{
            "& .MuiTableCell-root": {
              whiteSpace: "nowrap",
              py: 1,
            },
          }}
        >
          <TableHead>
            <TableRow>{columns.map((column) => column.renderHeader())}</TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              loadingPlaceholders.map((placeholder) => (
                <TableRow key={placeholder}>
                  {columns.map((column) => column.renderSkeleton())}
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={colCount} align="center" sx={{ py: 4 }}>
                  <Alert severity="error" sx={{ maxWidth: 600, mx: "auto" }}>
                    {error}
                  </Alert>
                </TableCell>
              </TableRow>
            ) : paginatedEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {hasActiveFilters
                      ? `No ${emptyLabel} found matching your filters.`
                      : `No ${emptyLabel} available.`}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedEvents.map((event, index) => (
                <TableRow
                  key={`${event.private_ip || event.ip || index}-${index}`}
                  hover
                  sx={{
                    cursor: "default",
                    "&:hover": {
                      backgroundColor: "rgba(59,130,246,0.03)",
                    },
                  }}
                >
                  {columns.map((column) => column.renderCell(event))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100, 200]}
        component="div"
        count={totalCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={onChangePage}
        onRowsPerPageChange={onChangeRowsPerPage}
        sx={{
          flexShrink: 0,
          borderTop: "1px solid",
          borderColor: "divider",
          "& .MuiTablePagination-toolbar": {
            minHeight: "48px",
          },
        }}
      />
    </Paper>
  );
}

EC2SchedulesTable.propTypes = {
  columnOrder: PropTypes.arrayOf(PropTypes.string).isRequired,
  emptyLabel: PropTypes.string,
  scheduledTimeLabel: PropTypes.string,
  error: PropTypes.string,
  formatScheduledTime: PropTypes.func.isRequired,
  formatTimeRemaining: PropTypes.func.isRequired,
  getLocalTimeTooltip: PropTypes.func.isRequired,
  hasActiveFilters: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
  onChangePage: PropTypes.func.isRequired,
  onChangeRowsPerPage: PropTypes.func.isRequired,
  onSort: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  paginatedEvents: PropTypes.arrayOf(PropTypes.object).isRequired,
  rowsPerPage: PropTypes.number.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortDirection: PropTypes.oneOf(["asc", "desc"]).isRequired,
  totalCount: PropTypes.number.isRequired,
};

EC2SchedulesTable.defaultProps = {
  error: null,
};

export default EC2SchedulesTable;
