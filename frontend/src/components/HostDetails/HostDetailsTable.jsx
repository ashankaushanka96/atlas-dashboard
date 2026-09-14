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
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import TuneIcon from "@mui/icons-material/Tune";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import ComponentCountsBadge from "./ComponentCountsBadge";
import StatusChip from "./StatusChip";
import hexToRgb from "../shared/hexToRgb";

const tintedIconButtonSx = (color) => ({
  color,
  bgcolor: `rgba(${hexToRgb(color)}, 0.12)`,
  "&:hover": { bgcolor: `rgba(${hexToRgb(color)}, 0.24)` },
  "&.Mui-disabled": { color: "text.disabled", bgcolor: "transparent" },
});

// Fixed pill widths per chip column so every row lines up regardless of
// label length (e.g. "Rocky Linux" vs "Ubuntu", "Compliant" vs "Partially
// Compliant").
const CHIP_MIN_WIDTH = {
  os: 130,
  uptime: 120,
  watcher_status: 130,
  compliant_status: 170,
};

const chipSx = (column) => ({ minWidth: CHIP_MIN_WIDTH[column], justifyContent: "center" });

const getSortLabelSx = (sortBy, column) => ({
  transition: "color 180ms ease",
  "& .MuiTableSortLabel-icon": {
    color: sortBy === column ? "#60A5FA !important" : "rgba(148, 163, 184, 0.75)",
    opacity: sortBy === column ? 1 : 0.72,
    transition: "color 180ms ease, opacity 180ms ease",
  },
  "&.Mui-active": {
    color: "inherit",
  },
  "&:hover .MuiTableSortLabel-icon": {
    color: "#93C5FD",
    opacity: 1,
  },
});

function buildColumnDefs({
  sortBy,
  sortDirection,
  onSort,
  formatStatusLabel,
  formatUptime,
  getCompliantStatusConfig,
  getOsConfig,
  getWatcherStatusConfig,
  onCopyToClipboard,
  onOpenDetails,
  onOpenMetrics,
  onWatcherActions,
  canManageWatcherActions,
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
      renderCell: (row) => (
        <TableCell key="region" align="center">
          <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
            {row.region || "N/A"}
          </Typography>
        </TableCell>
      ),
      renderSkeleton: () => (
        <TableCell key="region" align="center">
          <Box sx={{ ...shimmerBlockSx, height: 12, width: "56%", mx: "auto" }} />
        </TableCell>
      ),
    },
    hostname: {
      renderHeader: () => sortableHeader("hostname", "Hostname", "left"),
      renderCell: (row) => (
        <TableCell key="hostname" align="left">
          <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 600 }}>
            {row.hostname || "N/A"}
          </Typography>
        </TableCell>
      ),
      renderSkeleton: () => (
        <TableCell key="hostname" align="left">
          <Box sx={{ ...shimmerBlockSx, height: 12, width: "72%" }} />
        </TableCell>
      ),
    },
    ip: {
      renderHeader: () => sortableHeader("ip", "IP"),
      renderCell: (row) => (
        <TableCell key="ip" align="center">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                onCopyToClipboard(row.ip);
              }}
              sx={tintedIconButtonSx("#94A3B8")}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
            <Typography variant="body2" fontFamily="monospace">
              {row.ip || "N/A"}
            </Typography>
          </Box>
        </TableCell>
      ),
      renderSkeleton: () => (
        <TableCell key="ip" align="center">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
            <Box sx={{ width: 28, height: 28, borderRadius: "50%", ...shimmerBlockSx, flexShrink: 0 }} />
            <Box sx={{ ...shimmerBlockSx, height: 12, width: 112 }} />
          </Box>
        </TableCell>
      ),
    },
    os: {
      renderHeader: () => sortableHeader("os", "OS"),
      renderCell: (row) => {
        const { color, Icon } = getOsConfig(row.os);
        return (
          <TableCell key="os" align="center">
            <StatusChip label={row.os || "N/A"} color={color} Icon={Icon} sx={chipSx("os")} />
          </TableCell>
        );
      },
      renderSkeleton: () => (
        <TableCell key="os" align="center">
          <Box sx={{ ...shimmerBlockSx, height: 24, width: CHIP_MIN_WIDTH.os, mx: "auto", borderRadius: 999 }} />
        </TableCell>
      ),
    },
    uptime: {
      renderHeader: () => sortableHeader("uptime", "Uptime"),
      renderCell: (row) => {
        const label = formatUptime(row.boot_time);
        const stopped = label === "Stopped";
        return (
          <TableCell key="uptime" align="center">
            <StatusChip
              label={label}
              color={stopped ? "#E24B4A" : "#60A5FA"}
              Icon={stopped ? PowerSettingsNewIcon : AccessTimeIcon}
              sx={chipSx("uptime")}
            />
          </TableCell>
        );
      },
      renderSkeleton: () => (
        <TableCell key="uptime" align="center">
          <Box sx={{ ...shimmerBlockSx, height: 24, width: CHIP_MIN_WIDTH.uptime, mx: "auto", borderRadius: 999 }} />
        </TableCell>
      ),
    },
    watcher_status: {
      renderHeader: () => sortableHeader("watcher_status", "Watcher Status"),
      renderCell: (row) => {
        const { color, Icon } = getWatcherStatusConfig(row.watcher_status);
        return (
          <TableCell key="watcher_status" align="center">
            <StatusChip
              label={formatStatusLabel(row.watcher_status)}
              color={color}
              Icon={Icon}
              sx={chipSx("watcher_status")}
            />
          </TableCell>
        );
      },
      renderSkeleton: () => (
        <TableCell key="watcher_status" align="center">
          <Box sx={{ ...shimmerBlockSx, height: 24, width: CHIP_MIN_WIDTH.watcher_status, mx: "auto", borderRadius: 999 }} />
        </TableCell>
      ),
    },
    compliant_status: {
      renderHeader: () => sortableHeader("compliant_status", "Compliant Status"),
      renderCell: (row) => {
        const { color, Icon } = getCompliantStatusConfig(row.compliant_status);
        return (
          <TableCell key="compliant_status" align="center">
            <StatusChip
              label={formatStatusLabel(row.compliant_status)}
              color={color}
              Icon={Icon}
              sx={chipSx("compliant_status")}
            />
          </TableCell>
        );
      },
      renderSkeleton: () => (
        <TableCell key="compliant_status" align="center">
          <Box sx={{ ...shimmerBlockSx, height: 24, width: CHIP_MIN_WIDTH.compliant_status, mx: "auto", borderRadius: 999 }} />
        </TableCell>
      ),
    },
    components: {
      renderHeader: () => sortableHeader("watcher_configured_component_count", "Component Breakdown"),
      renderCell: (row) => (
        <TableCell key="components" align="center">
          <ComponentCountsBadge
            watcherConfigured={Number(row.watcher_configured_component_count ?? 0)}
            tool={Number(row.tool_component_count ?? 0)}
            job={Number(row.job_component_count ?? 0)}
            component={Number(row.component_category_count ?? 0)}
          />
        </TableCell>
      ),
      renderSkeleton: () => (
        <TableCell key="components" align="center">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75 }}>
            <Box sx={{ ...shimmerBlockSx, height: 20, width: 140, borderRadius: 999 }} />
          </Box>
        </TableCell>
      ),
    },
    actions: {
      renderHeader: () => (
        <TableCell key="actions" align="center">
          Actions
        </TableCell>
      ),
      renderCell: (row) => {
        const watcherConfigured = String(row.watcher_status || "").toLowerCase() === "configured";
        const watcherActionsDisabled = !watcherConfigured || !canManageWatcherActions;
        const watcherActionsTooltip = !watcherConfigured
          ? "Watcher is not configured on this host"
          : !canManageWatcherActions
          ? "You don't have permission to manage the watcher"
          : "Watcher actions";
        return (
          <TableCell key="actions" align="center">
            <Box sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
              <Tooltip title="View details">
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenDetails(row);
                  }}
                  sx={tintedIconButtonSx("#60A5FA")}
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="View metrics">
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenMetrics(row);
                  }}
                  sx={tintedIconButtonSx("#A78BFA")}
                >
                  <AssessmentOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={watcherActionsTooltip}>
                <span>
                  <IconButton
                    size="small"
                    disabled={watcherActionsDisabled}
                    onClick={(event) => {
                      event.stopPropagation();
                      onWatcherActions(row);
                    }}
                    sx={tintedIconButtonSx("#F59E0B")}
                  >
                    <TuneIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </TableCell>
        );
      },
      renderSkeleton: () => (
        <TableCell key="actions" align="center">
          <Box sx={{ width: 28, height: 28, borderRadius: "50%", ...shimmerBlockSx, mx: "auto" }} />
        </TableCell>
      ),
    },
  };
}

function HostDetailsTable({
  columnOrder,
  error,
  formatStatusLabel,
  formatUptime,
  getCompliantStatusConfig,
  getOsConfig,
  getWatcherStatusConfig,
  hasActiveFilters,
  loading,
  onChangePage,
  onChangeRowsPerPage,
  onCopyToClipboard,
  onOpenDetails,
  onOpenMetrics,
  onWatcherActions,
  canManageWatcherActions,
  onSort,
  page,
  paginatedRows,
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
    formatStatusLabel,
    formatUptime,
    getCompliantStatusConfig,
    getOsConfig,
    getWatcherStatusConfig,
    onCopyToClipboard,
    onOpenDetails,
    onOpenMetrics,
    onWatcherActions,
    canManageWatcherActions,
    shimmerBlockSx,
  });
  const buildTagColumnDef = (key) => {
    const tagKey = key.slice(4);
    return {
      renderHeader: () => (
        <TableCell key={key} align="center" sortDirection={sortBy === key ? sortDirection : false}>
          <TableSortLabel
            active={sortBy === key}
            direction={sortBy === key ? sortDirection : "asc"}
            onClick={() => onSort(key)}
            sx={getSortLabelSx(sortBy, key)}
          >
            {tagKey}
          </TableSortLabel>
        </TableCell>
      ),
      renderCell: (row) => (
        <TableCell key={key} align="center">
          <Typography variant="body2">{row.tags?.[tagKey] ?? "N/A"}</Typography>
        </TableCell>
      ),
      renderSkeleton: () => (
        <TableCell key={key} align="center">
          <Box sx={{ ...shimmerBlockSx, height: 12, width: "48%", mx: "auto" }} />
        </TableCell>
      ),
    };
  };

  const columns = columnOrder
    .map((key) => columnDefs[key] || (key.startsWith("tag:") ? buildTagColumnDef(key) : null))
    .filter(Boolean);
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
            ) : paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {hasActiveFilters
                      ? "No servers found matching your filters."
                      : "No server details available."}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((row, index) => (
                <TableRow
                  key={`${row.region}-${row.ip}-${index}`}
                  hover
                  sx={{
                    cursor: "default",
                    "&:hover": {
                      backgroundColor: "rgba(59,130,246,0.03)",
                    },
                  }}
                >
                  {columns.map((column) => column.renderCell(row))}
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

HostDetailsTable.propTypes = {
  columnOrder: PropTypes.arrayOf(PropTypes.string).isRequired,
  error: PropTypes.string,
  formatStatusLabel: PropTypes.func.isRequired,
  formatUptime: PropTypes.func.isRequired,
  getCompliantStatusConfig: PropTypes.func.isRequired,
  getOsConfig: PropTypes.func.isRequired,
  getWatcherStatusConfig: PropTypes.func.isRequired,
  hasActiveFilters: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
  onChangePage: PropTypes.func.isRequired,
  onChangeRowsPerPage: PropTypes.func.isRequired,
  onCopyToClipboard: PropTypes.func.isRequired,
  onOpenDetails: PropTypes.func.isRequired,
  onOpenMetrics: PropTypes.func.isRequired,
  onWatcherActions: PropTypes.func.isRequired,
  canManageWatcherActions: PropTypes.bool,
  onSort: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  paginatedRows: PropTypes.arrayOf(PropTypes.object).isRequired,
  rowsPerPage: PropTypes.number.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortDirection: PropTypes.oneOf(["asc", "desc"]).isRequired,
  totalCount: PropTypes.number.isRequired,
};

HostDetailsTable.defaultProps = {
  error: null,
  canManageWatcherActions: false,
};

export default HostDetailsTable;
