import { useState, useMemo, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import MemoryIcon from "@mui/icons-material/Memory";
import WidgetsIcon from "@mui/icons-material/Widgets";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import RoomOutlinedIcon from "@mui/icons-material/RoomOutlined";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import StorageIcon from "@mui/icons-material/Storage";
import NumbersIcon from "@mui/icons-material/Numbers";
import ModalFactory from "../modals/ModalFactory";
import { useLocalSearch } from "../utils/TabUtils";
import { useSearchParams, useLocation } from "react-router-dom";
import SectionFilterBar from "../../shared/SectionFilterBar";
import AdvancedSearchPanel from "../../shared/AdvancedSearchPanel";
import ColumnChooserButton from "../../shared/ColumnChooserButton";
import StatusChip from "../../HostDetails/StatusChip";
import hexToRgb from "../../shared/hexToRgb";
import TuneIcon from "@mui/icons-material/Tune";
import {
  ADVANCED_OPERATORS,
  ADVANCED_RULE_JOIN_OPTIONS,
  applyAdvancedRules,
  areAdvancedRulesEqual,
  buildAdvancedFieldMap,
  getAdvancedOperatorOptions,
  readAdvancedSearchState,
  writeAdvancedSearchParams,
} from "../../shared/advancedSearchUtils";
import LoadingTableRows from "./LoadingTableRows";
import useTableColumns from "../../../hooks/useTableColumns";

const tintedIconButtonSx = (color) => ({
  color,
  bgcolor: `rgba(${hexToRgb(color)}, 0.12)`,
  "&:hover": { bgcolor: `rgba(${hexToRgb(color)}, 0.24)` },
  "&.Mui-disabled": { color: "text.disabled", bgcolor: "transparent" },
});

const selectIconSx = (color) => ({ fontSize: 16, color });

const getRedisStatusConfig = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "available") return { color: "#34D399", Icon: CheckCircleIcon };
  if (["creating", "modifying"].includes(normalized)) {
    return { color: "#F59E0B", Icon: HourglassEmptyIcon };
  }
  if (["deleting", "failed"].includes(normalized)) {
    return { color: "#E24B4A", Icon: CancelIcon };
  }
  return { color: "#94A3B8", Icon: HelpOutlineIcon };
};

const REDIS_DEFAULT_COLUMNS = [
  { key: "replication_group_id", label: "Replication Group ID" },
  { key: "description", label: "Description" },
  { key: "status", label: "Status" },
  { key: "region", label: "Region" },
  { key: "engine", label: "Engine" },
  { key: "node_type", label: "Node Type" },
  { key: "num_cache_nodes", label: "Nodes" },
  { key: "actions", label: "Actions", pinned: true },
];

const RedisTab = ({ data, globalSearch, globalSearchResults, onRefresh }) => {
  const ADVANCED_SEARCH_PREFIX = "redis";
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState("replication_group_id");
  const [sortDirection, setSortDirection] = useState("asc");
  const [selectedCluster, setSelectedCluster] = useState(null);
  
  // URL state management
  const [searchParams, setSearchParams] = useSearchParams();
  const { search } = useLocation();
  
  // Initialize filters from URL
  const [selectedRegion, setSelectedRegion] = useState(searchParams.get("region") || '');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get("status") || '');
  const initialAdvancedState = readAdvancedSearchState(searchParams, {
    defaultField: "replication_group_id",
    defaultOperator: "contains",
    prefix: ADVANCED_SEARCH_PREFIX,
  });
  const [advancedRules, setAdvancedRules] = useState(initialAdvancedState.rules);
  const [advancedJoin, setAdvancedJoin] = useState(initialAdvancedState.join);
  const [advancedField, setAdvancedField] = useState(initialAdvancedState.field);
  const [advancedOperator, setAdvancedOperator] = useState(initialAdvancedState.operator);
  const [advancedValue, setAdvancedValue] = useState(initialAdvancedState.value);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  
  const { localSearch, updateLocalSearch, clearLocalSearch } = useLocalSearch('redis', globalSearch);

  // Sync URL changes to local state
  useEffect(() => {
    const urlRegion = searchParams.get("region") || '';
    const urlStatus = searchParams.get("status") || '';
    
    if (urlRegion !== selectedRegion) {
      setSelectedRegion(urlRegion);
    }
    if (urlStatus !== selectedStatus) {
      setSelectedStatus(urlStatus);
    }

    const nextAdvancedState = readAdvancedSearchState(searchParams, {
      defaultField: "replication_group_id",
      defaultOperator: "contains",
      prefix: ADVANCED_SEARCH_PREFIX,
    });
    setAdvancedRules((currentRules) =>
      areAdvancedRulesEqual(currentRules, nextAdvancedState.rules)
        ? currentRules
        : nextAdvancedState.rules
    );
    setAdvancedJoin((currentJoin) =>
      currentJoin === nextAdvancedState.join ? currentJoin : nextAdvancedState.join
    );
    setAdvancedField((currentField) =>
      currentField === nextAdvancedState.field ? currentField : nextAdvancedState.field
    );
    setAdvancedOperator((currentOperator) =>
      currentOperator === nextAdvancedState.operator
        ? currentOperator
        : nextAdvancedState.operator
    );
    setAdvancedValue((currentValue) =>
      currentValue === nextAdvancedState.value ? currentValue : nextAdvancedState.value
    );
  }, [search]);

  useEffect(() => {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      if (selectedRegion) nextParams.set("region", selectedRegion);
      else nextParams.delete("region");
      if (selectedStatus) nextParams.set("status", selectedStatus);
      else nextParams.delete("status");
      writeAdvancedSearchParams(nextParams, {
        rules: advancedRules,
        join: advancedJoin,
        field: advancedField,
        operator: advancedOperator,
        value: advancedValue,
        prefix: ADVANCED_SEARCH_PREFIX,
      });
      return nextParams.toString() === currentParams.toString() ? currentParams : nextParams;
    }, { replace: true });
  }, [advancedField, advancedJoin, advancedOperator, advancedRules, advancedValue, selectedRegion, selectedStatus, setSearchParams]);

  // Combine global and local search
  const searchTerm = globalSearch || localSearch;
  const searchResults = globalSearch ? globalSearchResults : null;

  // Get unique regions and statuses for dropdowns
  const uniqueRegions = useMemo(() => {
    const regions = [...new Set(data.clusters.map(cluster => cluster.region))].filter(Boolean).sort();
    return regions;
  }, [data.clusters]);

  const uniqueStatuses = useMemo(() => {
    const statuses = [...new Set(data.clusters.map(cluster => cluster.status))].filter(Boolean).sort();
    return statuses;
  }, [data.clusters]);

  const uniqueEngines = useMemo(() => {
    const engines = [...new Set(data.clusters.map((cluster) => cluster.engine))].filter(Boolean).sort();
    return engines;
  }, [data.clusters]);

  const advancedFields = useMemo(
    () => [
      {
        value: "region",
        label: "Region",
        type: "enum",
        options: uniqueRegions.map((region) => ({ value: region, label: region })),
      },
      {
        value: "status",
        label: "Status",
        type: "enum",
        options: uniqueStatuses.map((status) => ({ value: status, label: status })),
      },
      { value: "replication_group_id", label: "Replication Group ID", type: "text" },
      { value: "description", label: "Description", type: "text" },
      {
        value: "engine",
        label: "Engine",
        type: "enum",
        options: uniqueEngines.map((engine) => ({ value: engine, label: engine })),
      },
      { value: "node_type", label: "Node Type", type: "text" },
      { value: "num_cache_nodes", label: "Nodes", type: "number" },
    ],
    [uniqueEngines, uniqueRegions, uniqueStatuses]
  );

  const advancedFieldMap = useMemo(() => buildAdvancedFieldMap(advancedFields), [advancedFields]);
  const selectedAdvancedFieldConfig =
    advancedFieldMap[advancedField] || advancedFields[0] || null;
  const selectedAdvancedOperatorOptions = getAdvancedOperatorOptions(selectedAdvancedFieldConfig);

  const {
    chooserColumns,
    visibleColumns,
    toggleColumn,
    reorderColumns,
    resetToDefault,
  } = useTableColumns("aws_redis", REDIS_DEFAULT_COLUMNS);
  const columnOrder = useMemo(() => visibleColumns.map((column) => column.key), [visibleColumns]);

  // Filter clusters based on search, region, and status
  const filteredClusters = useMemo(() => {
    let clusters = data.clusters;
    
    if (searchResults) {
      clusters = searchResults;
    } else if (searchTerm) {
      const term = searchTerm.toLowerCase();
      clusters = clusters.filter(cluster => 
        cluster.replication_group_id?.toLowerCase().includes(term) ||
        cluster.description?.toLowerCase().includes(term) ||
        cluster.status?.toLowerCase().includes(term) ||
        cluster.region?.toLowerCase().includes(term) ||
        cluster.engine?.toLowerCase().includes(term)
      );
    }

    // Apply region filter
    if (selectedRegion) {
      clusters = clusters.filter(cluster => cluster.region === selectedRegion);
    }

    // Apply status filter
    if (selectedStatus) {
      clusters = clusters.filter(cluster => cluster.status === selectedStatus);
    }

    if (advancedRules.length) {
      clusters = clusters.filter((cluster) =>
        applyAdvancedRules(cluster, advancedRules, advancedFieldMap, (item, field) =>
          field === "num_cache_nodes"
            ? Number(item[field] ?? 0)
            : String(item[field] ?? "").trim()
        )
      );
    }

    return clusters;
  }, [advancedFieldMap, advancedRules, data.clusters, searchTerm, searchResults, selectedRegion, selectedStatus]);

  const sortedClusters = useMemo(() => {
    const getComparableValue = (cluster, column) => {
      switch (column) {
        case "replication_group_id":
          return cluster.replication_group_id || "";
        case "description":
          return cluster.description || "";
        case "status":
          return cluster.status || "";
        case "region":
          return cluster.region || "";
        case "engine":
          return cluster.engine || "";
        case "node_type":
          return cluster.node_type || "";
        case "num_cache_nodes":
          return Number(cluster.num_cache_nodes || 0);
        default:
          return "";
      }
    };
    const multiplier = sortDirection === "asc" ? 1 : -1;
    return [...filteredClusters].sort((left, right) => {
      const leftValue = getComparableValue(left, sortBy);
      const rightValue = getComparableValue(right, sortBy);
      if (typeof leftValue === "number" || typeof rightValue === "number") {
        const result = Number(leftValue) - Number(rightValue);
        if (result !== 0) return result * multiplier;
      } else {
        const result = String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: "base" });
        if (result !== 0) return result * multiplier;
      }
      return String(left.replication_group_id || "").localeCompare(String(right.replication_group_id || ""));
    });
  }, [filteredClusters, sortBy, sortDirection]);

  // Pagination
  const paginatedClusters = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return sortedClusters.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedClusters, page, rowsPerPage]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = (cluster) => {
    setSelectedCluster(cluster);
  };

  const handleCloseModal = () => {
    setSelectedCluster(null);
  };

  const handleRegionChange = (event) => {
    setSelectedRegion(event.target.value);
    setPage(0);
  };

  const handleStatusChange = (event) => {
    setSelectedStatus(event.target.value);
    setPage(0);
  };

  const clearFilters = () => {
    setSelectedRegion('');
    setSelectedStatus('');
    setAdvancedRules([]);
    setAdvancedJoin("AND");
    setAdvancedField("replication_group_id");
    setAdvancedOperator("contains");
    setAdvancedValue("");
    setPage(0);
  };

  const handleAdvancedFieldChange = (event) => {
    const nextField = event.target.value;
    const nextFieldConfig = advancedFields.find((field) => field.value === nextField);
    const nextOperator =
      ADVANCED_OPERATORS[nextFieldConfig?.type || "text"][0]?.value || "contains";
    setAdvancedField(nextField);
    setAdvancedOperator(nextOperator);
    setAdvancedValue("");
  };

  const handleAddAdvancedRule = (overrideValue = advancedValue) => {
    const operatorNeedsValue = !["is_empty", "is_not_empty"].includes(advancedOperator);
    const trimmedValue = String(overrideValue || "").trim();
    if (operatorNeedsValue && !trimmedValue) return;
    if (
      selectedAdvancedFieldConfig?.type === "number" &&
      operatorNeedsValue &&
      Number.isNaN(Number(trimmedValue))
    ) {
      return;
    }

    setAdvancedRules((currentRules) => [
      ...currentRules,
      {
        id: `${advancedField}-${advancedOperator}-${Date.now()}`,
        join: currentRules.length === 0 ? "AND" : advancedJoin,
        field: advancedField,
        operator: advancedOperator,
        value: operatorNeedsValue ? trimmedValue : "",
      },
    ]);
    setAdvancedValue("");
    setPage(0);
  };

  const handleRemoveAdvancedRule = (ruleId) => {
    setAdvancedRules((currentRules) => currentRules.filter((rule) => rule.id !== ruleId));
    setPage(0);
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortDirection("asc");
  };

  const getSortLabelSx = (column) => ({
    transition: "color 180ms ease",
    "& .MuiTableSortLabel-icon": {
      color: sortBy === column ? "#60A5FA !important" : "rgba(148, 163, 184, 0.75)",
      opacity: sortBy === column ? 1 : 0.72,
      transition: "color 180ms ease, opacity 180ms ease",
    },
    "&.Mui-active": { color: "inherit" },
    "&:hover .MuiTableSortLabel-icon": { color: "#93C5FD", opacity: 1 },
  });

  const sortableHeader = (key, label) => (
    <TableCell key={key} sortDirection={sortBy === key ? sortDirection : false}>
      <TableSortLabel
        active={sortBy === key}
        direction={sortBy === key ? sortDirection : "asc"}
        onClick={() => handleSort(key)}
        sx={getSortLabelSx(key)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );

  const columnDefs = {
    replication_group_id: {
      renderHeader: () => sortableHeader("replication_group_id", "Replication Group ID"),
      renderCell: (cluster) => (
        <TableCell key="replication_group_id">
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {cluster.replication_group_id}
          </Typography>
        </TableCell>
      ),
    },
    description: {
      renderHeader: () => sortableHeader("description", "Description"),
      renderCell: (cluster) => (
        <TableCell key="description">
          <Typography variant="body2">{cluster.description || "N/A"}</Typography>
        </TableCell>
      ),
    },
    status: {
      renderHeader: () => sortableHeader("status", "Status"),
      renderCell: (cluster) => {
        const statusConfig = getRedisStatusConfig(cluster.status);
        return (
          <TableCell key="status">
            <StatusChip label={cluster.status || "Unknown"} color={statusConfig.color} Icon={statusConfig.Icon} />
          </TableCell>
        );
      },
    },
    region: {
      renderHeader: () => sortableHeader("region", "Region"),
      renderCell: (cluster) => (
        <TableCell key="region">
          <Typography variant="body2">{cluster.region}</Typography>
        </TableCell>
      ),
    },
    engine: {
      renderHeader: () => sortableHeader("engine", "Engine"),
      renderCell: (cluster) => (
        <TableCell key="engine">
          <StatusChip label={cluster.engine || "redis"} color="#22D3EE" Icon={StorageIcon} />
        </TableCell>
      ),
    },
    node_type: {
      renderHeader: () => sortableHeader("node_type", "Node Type"),
      renderCell: (cluster) => (
        <TableCell key="node_type">
          <Typography variant="body2">{cluster.node_type || "N/A"}</Typography>
        </TableCell>
      ),
    },
    num_cache_nodes: {
      renderHeader: () => sortableHeader("num_cache_nodes", "Nodes"),
      renderCell: (cluster) => (
        <TableCell key="num_cache_nodes">
          <StatusChip label={String(cluster.num_cache_nodes || 0)} color="#60A5FA" Icon={NumbersIcon} />
        </TableCell>
      ),
    },
    actions: {
      renderHeader: () => <TableCell key="actions">Actions</TableCell>,
      renderCell: (cluster) => (
        <TableCell key="actions">
          <Tooltip title="View details">
            <IconButton
              size="small"
              onClick={() => handleViewDetails(cluster)}
              sx={tintedIconButtonSx("#60A5FA")}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </TableCell>
      ),
    },
  };
  const columns = columnOrder.map((key) => columnDefs[key]).filter(Boolean);
  const colCount = columns.length || 1;

  if (data.error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {data.error}
      </Alert>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MemoryIcon sx={{ color: '#FFEAA7' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Redis Clusters
          </Typography>
        </Box>
        
        <StatusChip label={`${sortedClusters.length} clusters`} color="#60A5FA" Icon={WidgetsIcon} />

        {globalSearch && (
          <StatusChip
            label={`${searchResults?.length || 0} from global search`}
            color="#A78BFA"
            Icon={SearchIcon}
          />
        )}
      </Box>

      <SectionFilterBar
        searchPlaceholder="Search clusters..."
        searchValue={localSearch}
        onSearchChange={(e) => updateLocalSearch(e.target.value)}
        onSearchClear={clearLocalSearch}
        searchDisabled={Boolean(globalSearch)}
        searchSx={{ flexGrow: 1, maxWidth: 300 }}
        searchEndAdornment={
          <Tooltip title="Advanced Search">
            <IconButton
              size="small"
              onClick={() => setAdvancedOpen((current) => !current)}
              sx={tintedIconButtonSx(advancedOpen ? "#A78BFA" : "#94A3B8")}
            >
              <TuneIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        }
        selects={[
          {
            id: "redis-region-select-label",
            label: "Region",
            value: selectedRegion,
            onChange: handleRegionChange,
            allLabel: "All Regions",
            accentColor: "#60A5FA",
            icon: <RoomOutlinedIcon sx={selectIconSx("#60A5FA")} />,
            options: uniqueRegions.map((region) => ({ value: region, label: region })),
          },
          {
            id: "redis-status-select-label",
            label: "Status",
            value: selectedStatus,
            onChange: handleStatusChange,
            allLabel: "All Statuses",
            accentColor: "#F59E0B",
            icon: <TaskAltIcon sx={selectIconSx("#F59E0B")} />,
            options: uniqueStatuses.map((status) => ({ value: status, label: status })),
          },
        ]}
        showClearFilters={Boolean(selectedRegion || selectedStatus || advancedRules.length)}
        onClearFilters={clearFilters}
        actions={
          <>
            <ColumnChooserButton
              columns={chooserColumns}
              onToggle={toggleColumn}
              onReorder={reorderColumns}
              onReset={resetToDefault}
            />
            <Tooltip title="Refresh data">
              <span>
                <IconButton onClick={onRefresh} disabled={data.loading} sx={tintedIconButtonSx("#60A5FA")}>
                  {data.loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
          </>
        }
      />

      <AdvancedSearchPanel
        advancedOpen={advancedOpen}
        advancedField={advancedField}
        advancedFields={advancedFields}
        advancedJoin={advancedJoin}
        advancedOperator={advancedOperator}
        advancedOperatorOptions={selectedAdvancedOperatorOptions}
        advancedRuleJoinOptions={ADVANCED_RULE_JOIN_OPTIONS}
        advancedRules={advancedRules}
        advancedValue={advancedValue}
        onAddAdvancedRule={handleAddAdvancedRule}
        onAdvancedFieldChange={handleAdvancedFieldChange}
        onAdvancedJoinChange={(event) => setAdvancedJoin(event.target.value)}
        onAdvancedOperatorChange={(event) => setAdvancedOperator(event.target.value)}
        onAdvancedValueChange={(event) => setAdvancedValue(event.target.value)}
        onRemoveAdvancedRule={handleRemoveAdvancedRule}
      />

      {/* Table */}
      <Paper sx={{ flex: '1 1 0', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <TableContainer sx={{ flex: '1 1 0', minHeight: 0, overflow: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>{columns.map((column) => column.renderHeader())}</TableRow>
            </TableHead>
            <TableBody>
              {data.loading ? (
                <LoadingTableRows colCount={colCount} rowsPerPage={rowsPerPage} />
              ) : paginatedClusters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm || selectedRegion || selectedStatus ? 'No clusters found matching your filters.' : 'No clusters available.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedClusters.map((cluster) => (
                  <TableRow key={cluster.replication_group_id} hover>
                    {columns.map((column) => column.renderCell(cluster))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          sx={{ flexShrink: 0 }}
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={sortedClusters.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Detail Modal */}
      <ModalFactory
        open={!!selectedCluster}
        onClose={handleCloseModal}
        data={selectedCluster}
        type="redis"
        title={selectedCluster?.replication_group_id || 'Redis Cluster Details'}
      />
    </Box>
  );
};

export default RedisTab;
