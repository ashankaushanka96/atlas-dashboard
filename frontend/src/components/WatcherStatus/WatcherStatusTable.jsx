import PropTypes from "prop-types";
import {
  Alert,
  Box,
  IconButton,
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
import VisibilityIcon from "@mui/icons-material/Visibility";
import RoomOutlinedIcon from "@mui/icons-material/RoomOutlined";
import WidgetsOutlinedIcon from "@mui/icons-material/WidgetsOutlined";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";

import { formatStatusLabel, getPortStatusConfig, getProcessStatusConfig } from "./statusChipUtils";
import StatusChip from "../HostDetails/StatusChip";
import hexToRgb from "../shared/hexToRgb";

const tintedIconButtonSx = (color) => ({
  color,
  bgcolor: `rgba(${hexToRgb(color)}, 0.12)`,
  "&:hover": { bgcolor: `rgba(${hexToRgb(color)}, 0.24)` },
});

const CHIP_WIDTH = {
  region: 168,
  process_status: 120,
  port_status_display: 130,
};

const chipSx = (column) => ({ width: CHIP_WIDTH[column], justifyContent: "center" });

// Plain clickable text (not a pill) for IP / Component Name - a fixed-width
// chip either clipped these unreadably (IPs especially) or stretched rows
// out of alignment. Text stays the same neutral color as every other plain
// cell (Region, Uptime) so it doesn't compete with the actual status chips'
// colors - only a small muted icon plus an underline-on-hover mark it as a
// link, never truncates.
const linkTextSx = {
  display: "inline-flex",
  alignItems: "center",
  gap: 0.5,
  color: "text.primary",
  fontWeight: 500,
  cursor: "pointer",
  "&:hover": { textDecoration: "underline" },
};

const linkIconSx = { fontSize: 15, color: "#94A3B8" };

const getSortLabelSx = (sortBy, column) => ({
  transition: "color 180ms ease",
  "& .MuiTableSortLabel-icon": {
    color: sortBy === column ? "#60A5FA !important" : "rgba(148, 163, 184, 0.75)",
    opacity: sortBy === column ? 1 : 0.72,
    transition: "color 180ms ease, opacity 180ms ease",
  },
  "&.Mui-active": { color: "inherit" },
  "&:hover .MuiTableSortLabel-icon": {
    color: "#93C5FD",
    opacity: 1,
  },
});

export const WATCHER_STATUS_DEFAULT_COLUMNS = [
  { key: "region", label: "Region" },
  { key: "ip", label: "IP" },
  { key: "name", label: "Component Name" },
  { key: "process_status", label: "Process Status" },
  { key: "port_status_display", label: "Port Status" },
  { key: "uptime_seconds", label: "Uptime" },
  { key: "actions", label: "Actions", pinned: true },
];

function buildColumnDefs({
  sortBy,
  sortDirection,
  onSort,
  formatUptime,
  onOpenComponentDb,
  onOpenDetails,
  onOpenHostDetails,
  onOpenMetrics,
  shimmerBlockSx,
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
      renderCell: (item) => (
        <TableCell key="region" align="center">
          {item.region ? (
            <StatusChip
              label={item.region}
              color="#60A5FA"
              Icon={RoomOutlinedIcon}
              sx={chipSx("region")}
            />
          ) : (
            <Typography variant="body2">N/A</Typography>
          )}
        </TableCell>
      ),
      renderSkeleton: () => (
        <TableCell key="region" align="center">
          <Box sx={{ ...shimmerBlockSx, height: 24, width: CHIP_WIDTH.region, mx: "auto", borderRadius: 999 }} />
        </TableCell>
      ),
    },
    ip: {
      renderHeader: () => sortableHeader("ip", "IP", "left"),
      renderCell: (item) => (
        <TableCell key="ip" align="left">
          {item.ip ? (
            <Tooltip title="Open in Host Details">
              <Box
                component="span"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenHostDetails(item);
                }}
                sx={{ ...linkTextSx, fontFamily: "monospace" }}
              >
                <RoomOutlinedIcon sx={linkIconSx} />
                {item.ip}
              </Box>
            </Tooltip>
          ) : (
            <Typography variant="body2" fontFamily="monospace">
              N/A
            </Typography>
          )}
        </TableCell>
      ),
      renderSkeleton: () => (
        <TableCell key="ip" align="left">
          <Box sx={{ ...shimmerBlockSx, height: 12, width: "48%" }} />
        </TableCell>
      ),
    },
    name: {
      renderHeader: () => sortableHeader("name", "Component Name", "left"),
      renderCell: (item) => (
        <TableCell key="name" align="left">
          {item.name ? (
            <Tooltip title="Open in Component DB">
              <Box
                component="span"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenComponentDb(item);
                }}
                sx={linkTextSx}
              >
                <WidgetsOutlinedIcon sx={linkIconSx} />
                {String(item.name).toLowerCase()}
              </Box>
            </Tooltip>
          ) : (
            <Typography variant="body2">N/A</Typography>
          )}
        </TableCell>
      ),
      renderSkeleton: () => (
        <TableCell key="name" align="left">
          <Box sx={{ ...shimmerBlockSx, height: 12, width: "72%" }} />
        </TableCell>
      ),
    },
    process_status: {
      renderHeader: () => sortableHeader("process_status", "Process Status"),
      renderCell: (item) => {
        const { color, Icon } = getProcessStatusConfig(item.process_status);
        return (
          <TableCell key="process_status" align="center">
            <StatusChip
              label={formatStatusLabel(item.process_status)}
              color={color}
              Icon={Icon}
              sx={chipSx("process_status")}
            />
          </TableCell>
        );
      },
      renderSkeleton: () => (
        <TableCell key="process_status" align="center">
          <Box sx={{ ...shimmerBlockSx, height: 24, width: CHIP_WIDTH.process_status, mx: "auto", borderRadius: 999 }} />
        </TableCell>
      ),
    },
    port_status_display: {
      renderHeader: () => sortableHeader("port_status_display", "Port Status"),
      renderCell: (item) => {
        const { color, Icon } = getPortStatusConfig(item.port_status_display);
        return (
          <TableCell key="port_status_display" align="center">
            <StatusChip
              label={formatStatusLabel(item.port_status_display)}
              color={color}
              Icon={Icon}
              sx={chipSx("port_status_display")}
            />
          </TableCell>
        );
      },
      renderSkeleton: () => (
        <TableCell key="port_status_display" align="center">
          <Box sx={{ ...shimmerBlockSx, height: 24, width: CHIP_WIDTH.port_status_display, mx: "auto", borderRadius: 999 }} />
        </TableCell>
      ),
    },
    uptime_seconds: {
      renderHeader: () => sortableHeader("uptime_seconds", "Uptime"),
      renderCell: (item) => (
        <TableCell key="uptime_seconds" align="center">
          <Typography variant="body2" fontFamily="monospace">
            {formatUptime(item.uptime_seconds)}
          </Typography>
        </TableCell>
      ),
      renderSkeleton: () => (
        <TableCell key="uptime_seconds" align="center">
          <Box sx={{ ...shimmerBlockSx, height: 12, width: "42%", mx: "auto" }} />
        </TableCell>
      ),
    },
    actions: {
      renderHeader: () => (
        <TableCell key="actions" align="center">
          Actions
        </TableCell>
      ),
      renderCell: (item) => (
        <TableCell key="actions" align="center">
          <Box sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
            <Tooltip title="View Details">
              <IconButton
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenDetails(item);
                }}
                sx={tintedIconButtonSx("#60A5FA")}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="View Metrics">
              <IconButton
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenMetrics(item);
                }}
                sx={tintedIconButtonSx("#A78BFA")}
              >
                <AssessmentOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </TableCell>
      ),
      renderSkeleton: () => (
        <TableCell key="actions" align="center">
          <Box sx={{ width: 28, height: 28, borderRadius: "50%", ...shimmerBlockSx, mx: "auto" }} />
        </TableCell>
      ),
    },
  };
}

function WatcherStatusTable({
  columnOrder,
  debouncedLoading,
  error,
  formatUptime,
  hasActiveFilters,
  onChangePage,
  onChangeRowsPerPage,
  onOpenComponentDb,
  onOpenDetails,
  onOpenHostDetails,
  onOpenMetrics,
  onSort,
  page,
  paginatedItems,
  rowsPerPage,
  sortBy,
  sortDirection,
  totalCount,
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
    formatUptime,
    onOpenComponentDb,
    onOpenDetails,
    onOpenHostDetails,
    onOpenMetrics,
    shimmerBlockSx,
  });
  const columns = columnOrder.map((key) => columnDefs[key]).filter(Boolean);
  const colCount = columns.length || 1;

  return (
    <Paper
      sx={{
        flex: "1 1 0",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minHeight: 0,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <TableContainer sx={{ flex: "1 1 0", minHeight: 0, overflow: "auto" }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>{columns.map((column) => column.renderHeader())}</TableRow>
          </TableHead>
          <TableBody>
            {debouncedLoading ? (
              loadingPlaceholders.map((placeholder) => (
                <TableRow key={placeholder}>
                  {columns.map((column) => column.renderSkeleton())}
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={colCount} align="center" sx={{ py: 4 }}>
                  <Alert severity="error">{String(error)}</Alert>
                </TableCell>
              </TableRow>
            ) : paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {hasActiveFilters
                      ? "No components found matching your filters."
                      : "No components available."}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((item) => (
                <TableRow
                  key={item.key}
                  id={item.domId}
                  hover
                  sx={{
                    cursor: "default",
                    "&:hover": {
                      backgroundColor: "rgba(59,130,246,0.03)",
                    },
                  }}
                >
                  {columns.map((column) => column.renderCell(item))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={onChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={onChangeRowsPerPage}
        rowsPerPageOptions={[10, 25, 50, 100]}
        sx={{ flexShrink: 0 }}
      />
    </Paper>
  );
}

WatcherStatusTable.propTypes = {
  columnOrder: PropTypes.arrayOf(PropTypes.string).isRequired,
  debouncedLoading: PropTypes.bool.isRequired,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  formatUptime: PropTypes.func.isRequired,
  hasActiveFilters: PropTypes.bool.isRequired,
  onChangePage: PropTypes.func.isRequired,
  onChangeRowsPerPage: PropTypes.func.isRequired,
  onOpenComponentDb: PropTypes.func.isRequired,
  onOpenDetails: PropTypes.func.isRequired,
  onOpenHostDetails: PropTypes.func.isRequired,
  onOpenMetrics: PropTypes.func.isRequired,
  onSort: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  paginatedItems: PropTypes.arrayOf(PropTypes.object).isRequired,
  rowsPerPage: PropTypes.number.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortDirection: PropTypes.oneOf(["asc", "desc"]).isRequired,
  totalCount: PropTypes.number.isRequired,
};

WatcherStatusTable.defaultProps = {
  error: null,
};

export default WatcherStatusTable;
