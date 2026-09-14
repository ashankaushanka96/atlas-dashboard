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
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RoomOutlinedIcon from "@mui/icons-material/RoomOutlined";
import MonitorHeartRoundedIcon from "@mui/icons-material/MonitorHeartRounded";
import TuneIcon from "@mui/icons-material/Tune";
import { getPipelineDisplayLabel, isToolCategory } from "./componentDisplayUtils";
import { getPlatformConfig, getCategoryConfig } from "./componentStatusConfig";
import { getYesNoConfig, getWatcherStatusConfig } from "../HostDetails/statusConfig";
import StatusChip from "../HostDetails/StatusChip";
import hexToRgb from "../shared/hexToRgb";

const tintedIconButtonSx = (color) => ({
  color,
  bgcolor: `rgba(${hexToRgb(color)}, 0.12)`,
  "&:hover": { bgcolor: `rgba(${hexToRgb(color)}, 0.24)` },
  "&.Mui-disabled": { color: "text.disabled", bgcolor: "transparent" },
});

// Fixed pill widths per chip column so every row lines up regardless of
// label length (e.g. "tool" vs "component", "Configured" vs "Unconfigured").
const CHIP_MIN_WIDTH = {
  region: 168,
  platform: 110,
  pipeline: 140,
  watcher: 130,
  category: 112,
};

const chipSx = (column, extra) => ({
  minWidth: CHIP_MIN_WIDTH[column],
  justifyContent: "center",
  ...extra,
});

// Plain clickable text (not a pill) for IP / Component Name - stays the
// same neutral color as every other plain cell so it doesn't compete with
// the actual status chips' colors; a small muted icon plus underline-on-
// hover mark it as a link, and it never truncates.
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

// Watcher-configured component names get a light blue tint (text + icon) so
// they read as clickable at a glance, without shouting over the rest of the
// row's neutral palette.
const CONFIGURED_LINK_COLOR = "#60A5FA";
const configuredLinkTextSx = { ...linkTextSx, color: CONFIGURED_LINK_COLOR };
const configuredLinkIconSx = { ...linkIconSx, color: CONFIGURED_LINK_COLOR };

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

function buildColumnDefs({
  sortBy,
  sortDirection,
  onSort,
  onComponentActions,
  canManageComponentActions,
  canViewComponentLogs,
  onCopyToClipboard,
  onConfigureWatcher,
  onOpenHostDetails,
  onOpenWatcherStatus,
  onViewDetails,
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
      renderHeader: () => sortableHeader("region", "Region", "left"),
      renderCell: (component) => (
        <TableCell key="region" align="left">
          {component.region ? (
            <StatusChip
              label={component.region}
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
        <TableCell key="region" align="left">
          <Box sx={{ ...shimmerBlockSx, height: 24, width: CHIP_MIN_WIDTH.region, borderRadius: 999 }} />
        </TableCell>
      ),
    },
    ip: {
      renderHeader: () => sortableHeader("ip", "IP", "left"),
      renderCell: (component) => (
        <TableCell key="ip" align="left">
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={() => onCopyToClipboard(component.ip)}
              sx={tintedIconButtonSx("#94A3B8")}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
            {component.ip ? (
              <Tooltip title="Open in Host Details">
                <Box
                  component="span"
                  onClick={() => onOpenHostDetails(component)}
                  sx={{ ...linkTextSx, fontFamily: "monospace" }}
                >
                  <RoomOutlinedIcon sx={linkIconSx} />
                  {component.ip}
                </Box>
              </Tooltip>
            ) : (
              <Typography variant="body2" fontFamily="monospace">
                N/A
              </Typography>
            )}
          </Box>
        </TableCell>
      ),
      renderSkeleton: () => (
        <TableCell key="ip" align="left">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 28, height: 28, borderRadius: "50%", ...shimmerBlockSx, flexShrink: 0 }} />
            <Box sx={{ ...shimmerBlockSx, height: 12, width: 112 }} />
          </Box>
        </TableCell>
      ),
    },
    component_name: {
      renderHeader: () => sortableHeader("component_name", "Component Name", "left"),
      renderCell: (component) => {
        const isWatcherConfigured = String(component.watcher || "").toLowerCase() === "configured";
        const label = component.component_name ? String(component.component_name).toLowerCase() : "N/A";
        const content = (
          <Box
            component="span"
            onClick={isWatcherConfigured ? () => onOpenWatcherStatus(component) : undefined}
            sx={
              isWatcherConfigured
                ? configuredLinkTextSx
                : { ...linkTextSx, cursor: "default", "&:hover": {} }
            }
          >
            <MonitorHeartRoundedIcon sx={isWatcherConfigured ? configuredLinkIconSx : linkIconSx} />
            {label}
          </Box>
        );
        return (
          <TableCell key="component_name" align="left">
            {isWatcherConfigured ? <Tooltip title="Open in Watcher Status">{content}</Tooltip> : content}
          </TableCell>
        );
      },
      renderSkeleton: () => (
        <TableCell key="component_name" align="left">
          <Box sx={{ ...shimmerBlockSx, height: 12, width: "74%" }} />
        </TableCell>
      ),
    },
    platform: {
      renderHeader: () => sortableHeader("platform", "Platform"),
      renderCell: (component) => {
        const { color, Icon } = getPlatformConfig(component.platform);
        return (
          <TableCell key="platform" align="center">
            <StatusChip
              label={component.platform || "N/A"}
              color={color}
              Icon={Icon}
              sx={chipSx("platform")}
            />
          </TableCell>
        );
      },
      renderSkeleton: () => (
        <TableCell key="platform" align="center">
          <Box sx={{ ...shimmerBlockSx, height: 24, width: CHIP_MIN_WIDTH.platform, mx: "auto", borderRadius: 999 }} />
        </TableCell>
      ),
    },
    comp_version: {
      renderHeader: () => sortableHeader("comp_version", "Version"),
      renderCell: (component) => (
        <TableCell key="comp_version" align="center">
          <Typography variant="body2">{component.comp_version || "N/A"}</Typography>
        </TableCell>
      ),
      renderSkeleton: () => (
        <TableCell key="comp_version" align="center">
          <Box sx={{ ...shimmerBlockSx, height: 12, width: "48%", mx: "auto" }} />
        </TableCell>
      ),
    },
    pipeline: {
      renderHeader: () => sortableHeader("pipeline", "Pipeline"),
      renderCell: (component) => {
        const { color, Icon } = isToolCategory(component)
          ? { color: "#94A3B8", Icon: getYesNoConfig(component.pipeline).Icon }
          : getYesNoConfig(component.pipeline);
        return (
          <TableCell key="pipeline" align="center">
            <StatusChip
              label={getPipelineDisplayLabel(component)}
              color={color}
              Icon={Icon}
              sx={chipSx("pipeline")}
            />
          </TableCell>
        );
      },
      renderSkeleton: () => (
        <TableCell key="pipeline" align="center">
          <Box sx={{ ...shimmerBlockSx, height: 24, width: CHIP_MIN_WIDTH.pipeline, mx: "auto", borderRadius: 999 }} />
        </TableCell>
      ),
    },
    watcher: {
      renderHeader: () => sortableHeader("watcher", "Watcher"),
      renderCell: (component) => {
        const isUnconfigured = String(component.watcher || "").toLowerCase() === "unconfigured";
        const { color, Icon } = getWatcherStatusConfig(component.watcher);
        const chip = (
          <StatusChip
            label={component.watcher || "N/A"}
            color={color}
            Icon={Icon}
            onClick={isUnconfigured ? () => onConfigureWatcher(component) : undefined}
            sx={chipSx("watcher", isUnconfigured ? { cursor: "pointer" } : undefined)}
          />
        );
        return (
          <TableCell key="watcher" align="center">
            {isUnconfigured ? <Tooltip title="Configure this component in the watcher">{chip}</Tooltip> : chip}
          </TableCell>
        );
      },
      renderSkeleton: () => (
        <TableCell key="watcher" align="center">
          <Box sx={{ ...shimmerBlockSx, height: 24, width: CHIP_MIN_WIDTH.watcher, mx: "auto", borderRadius: 999 }} />
        </TableCell>
      ),
    },
    release_date: {
      renderHeader: () => sortableHeader("release_date", "Release Date"),
      renderCell: (component) => (
        <TableCell key="release_date" align="center">
          <Typography variant="body2">
            {component.release_date ? new Date(component.release_date).toLocaleDateString() : "N/A"}
          </Typography>
        </TableCell>
      ),
      renderSkeleton: () => (
        <TableCell key="release_date" align="center">
          <Box sx={{ ...shimmerBlockSx, height: 12, width: "52%", mx: "auto" }} />
        </TableCell>
      ),
    },
    comp_path: {
      renderHeader: () => sortableHeader("comp_path", "Component Path"),
      renderCell: (component) => (
        <TableCell key="comp_path">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton
              size="small"
              onClick={() => onCopyToClipboard(component.comp_path)}
              sx={tintedIconButtonSx("#94A3B8")}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
            <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: "0.875rem", flex: 1 }}>
              {component.comp_path || "N/A"}
            </Typography>
          </Box>
        </TableCell>
      ),
      renderSkeleton: () => (
        <TableCell key="comp_path">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 28, height: 28, borderRadius: "50%", ...shimmerBlockSx, flexShrink: 0 }} />
            <Box sx={{ ...shimmerBlockSx, height: 12, width: "88%" }} />
          </Box>
        </TableCell>
      ),
    },
    category: {
      renderHeader: () => sortableHeader("category", "Category"),
      renderCell: (component) => {
        const { color, Icon } = getCategoryConfig(component.category);
        return (
          <TableCell key="category" align="center">
            <StatusChip
              label={component.category || "N/A"}
              color={color}
              Icon={Icon}
              sx={chipSx("category")}
            />
          </TableCell>
        );
      },
      renderSkeleton: () => (
        <TableCell key="category" align="center">
          <Box sx={{ ...shimmerBlockSx, height: 24, width: CHIP_MIN_WIDTH.category, mx: "auto", borderRadius: 999 }} />
        </TableCell>
      ),
    },
    actions: {
      renderHeader: () => (
        <TableCell key="actions" align="center">
          Actions
        </TableCell>
      ),
      renderCell: (component) => {
        const isConfigured = String(component.watcher || "").toLowerCase() === "configured";
        const hasAnyComponentAccess = canManageComponentActions || canViewComponentLogs;
        const componentActionsDisabled = !isConfigured || !hasAnyComponentAccess;
        const componentActionsTooltip = !isConfigured
          ? "Configure this component in the watcher first"
          : !hasAnyComponentAccess
          ? "You don't have permission to manage this component"
          : "Component actions";
        return (
          <TableCell key="actions" align="center" sx={{ whiteSpace: "nowrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
              <Tooltip title="View details">
                <IconButton
                  size="small"
                  onClick={() => onViewDetails(component)}
                  sx={tintedIconButtonSx("#60A5FA")}
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={componentActionsTooltip}>
                <span>
                  <IconButton
                    size="small"
                    disabled={componentActionsDisabled}
                    onClick={() => onComponentActions(component)}
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

function ComponentTable({
  columnOrder,
  error,
  hasActiveFilters,
  loading,
  onChangePage,
  onChangeRowsPerPage,
  onComponentActions,
  canManageComponentActions,
  canViewComponentLogs,
  onConfigureWatcher,
  onCopyToClipboard,
  onOpenHostDetails,
  onOpenWatcherStatus,
  onSort,
  onViewDetails,
  page,
  paginatedComponents,
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
    onComponentActions,
    canManageComponentActions,
    canViewComponentLogs,
    onConfigureWatcher,
    onCopyToClipboard,
    onOpenHostDetails,
    onOpenWatcherStatus,
    onViewDetails,
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
            ) : paginatedComponents.length === 0 ? (
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
              paginatedComponents.map((component, index) => (
                <TableRow
                  key={`${component.component_name}-${component.ip}-${index}`}
                  hover
                  sx={{
                    cursor: "default",
                    "&:hover": {
                      backgroundColor: "rgba(59,130,246,0.03)",
                    },
                  }}
                >
                  {columns.map((column) => column.renderCell(component))}
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

ComponentTable.propTypes = {
  columnOrder: PropTypes.arrayOf(PropTypes.string).isRequired,
  error: PropTypes.string,
  hasActiveFilters: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
  onChangePage: PropTypes.func.isRequired,
  onChangeRowsPerPage: PropTypes.func.isRequired,
  onComponentActions: PropTypes.func.isRequired,
  canManageComponentActions: PropTypes.bool,
  canViewComponentLogs: PropTypes.bool,
  onConfigureWatcher: PropTypes.func.isRequired,
  onCopyToClipboard: PropTypes.func.isRequired,
  onOpenHostDetails: PropTypes.func.isRequired,
  onOpenWatcherStatus: PropTypes.func.isRequired,
  onSort: PropTypes.func.isRequired,
  onViewDetails: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  paginatedComponents: PropTypes.arrayOf(PropTypes.object).isRequired,
  rowsPerPage: PropTypes.number.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortDirection: PropTypes.oneOf(["asc", "desc"]).isRequired,
  totalCount: PropTypes.number.isRequired,
};

ComponentTable.defaultProps = {
  error: null,
  canManageComponentActions: false,
  canViewComponentLogs: false,
};

export default ComponentTable;
