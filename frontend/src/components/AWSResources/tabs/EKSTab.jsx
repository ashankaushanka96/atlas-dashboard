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
  Stack,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import HubIcon from "@mui/icons-material/Hub";
import WidgetsIcon from "@mui/icons-material/Widgets";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import RoomOutlinedIcon from "@mui/icons-material/RoomOutlined";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import NewReleasesOutlinedIcon from "@mui/icons-material/NewReleasesOutlined";
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

const getEksStatusConfig = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "active") return { color: "#34D399", Icon: CheckCircleIcon };
  if (normalized === "creating" || normalized === "updating") {
    return { color: "#F59E0B", Icon: HourglassEmptyIcon };
  }
  if (normalized === "deleting") return { color: "#E24B4A", Icon: CancelIcon };
  if (normalized === "failed") return { color: "#E24B4A", Icon: ErrorOutlineIcon };
  return { color: "#94A3B8", Icon: HelpOutlineIcon };
};

const EKS_DEFAULT_COLUMNS = [
  { key: "cluster_name", label: "Cluster Name" },
  { key: "cluster_arn", label: "Cluster ARN" },
  { key: "status", label: "Status" },
  { key: "region", label: "Region" },
  { key: "version", label: "Kubernetes Version" },
  { key: "private_ips", label: "Private IPs" },
  { key: "public_ips", label: "Public IPs" },
  { key: "actions", label: "Actions", pinned: true },
];

function renderIpList(ips) {
  if (ips && ips.length > 0) {
    return (
      <Stack spacing={0.5}>
        {ips.slice(0, 3).map((ip, idx) => (
          <Typography key={idx} variant="caption" fontFamily="monospace">
            {ip}
          </Typography>
        ))}
        {ips.length > 3 && (
          <Typography variant="caption" color="text.secondary">
            +{ips.length - 3} more
          </Typography>
        )}
      </Stack>
    );
  }
  return (
    <Typography variant="body2" color="text.secondary">
      -
    </Typography>
  );
}

const EKSTab = ({ data, globalSearch, globalSearchResults, onRefresh }) => {
  const ADVANCED_SEARCH_PREFIX = "eks";
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState("cluster_name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [selectedCluster, setSelectedCluster] = useState(null);
  
  // URL state management
  const [searchParams, setSearchParams] = useSearchParams();
  const { search } = useLocation();
  
  // Initialize filters from URL
  const [selectedRegion, setSelectedRegion] = useState(searchParams.get("region") || '');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get("status") || '');
  const initialAdvancedState = readAdvancedSearchState(searchParams, {
    defaultField: "cluster_name",
    defaultOperator: "contains",
    prefix: ADVANCED_SEARCH_PREFIX,
  });
  const [advancedRules, setAdvancedRules] = useState(initialAdvancedState.rules);
  const [advancedJoin, setAdvancedJoin] = useState(initialAdvancedState.join);
  const [advancedField, setAdvancedField] = useState(initialAdvancedState.field);
  const [advancedOperator, setAdvancedOperator] = useState(initialAdvancedState.operator);
  const [advancedValue, setAdvancedValue] = useState(initialAdvancedState.value);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  
  const { localSearch, updateLocalSearch, clearLocalSearch } = useLocalSearch('eks', globalSearch);

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
      defaultField: "cluster_name",
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
      { value: "cluster_name", label: "Cluster Name", type: "text" },
      { value: "cluster_arn", label: "Cluster ARN", type: "text" },
      { value: "version", label: "Kubernetes Version", type: "text" },
      { value: "private_ips", label: "Private IPs", type: "text" },
      { value: "public_ips", label: "Public IPs", type: "text" },
    ],
    [uniqueRegions, uniqueStatuses]
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
  } = useTableColumns("aws_eks", EKS_DEFAULT_COLUMNS);
  const columnOrder = useMemo(() => visibleColumns.map((column) => column.key), [visibleColumns]);

  // Filter clusters based on search, region, and status
  const filteredClusters = useMemo(() => {
    let clusters = data.clusters;
    
    if (searchResults) {
      clusters = searchResults;
    } else if (searchTerm) {
      const term = searchTerm.toLowerCase();
      clusters = clusters.filter(cluster => 
        cluster.cluster_name?.toLowerCase().includes(term) ||
        cluster.cluster_arn?.toLowerCase().includes(term) ||
        cluster.status?.toLowerCase().includes(term) ||
        cluster.region?.toLowerCase().includes(term) ||
        cluster.version?.toLowerCase().includes(term) ||
        cluster.private_ips?.some(ip => ip.toLowerCase().includes(term)) ||
        cluster.public_ips?.some(ip => ip.toLowerCase().includes(term))
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
        applyAdvancedRules(cluster, advancedRules, advancedFieldMap, (item, field) => {
          if (field === "private_ips" || field === "public_ips") {
            return (item[field] || []).join(", ");
          }
          return String(item[field] ?? "").trim();
        })
      );
    }

    return clusters;
  }, [advancedFieldMap, advancedRules, data.clusters, searchTerm, searchResults, selectedRegion, selectedStatus]);

  const sortedClusters = useMemo(() => {
    const getComparableValue = (cluster, column) => {
      switch (column) {
        case "cluster_name":
          return cluster.cluster_name || "";
        case "cluster_arn":
          return cluster.cluster_arn || "";
        case "status":
          return cluster.status || "";
        case "region":
          return cluster.region || "";
        case "version":
          return cluster.version || "";
        case "private_ips":
          return (cluster.private_ips || []).join(", ");
        case "public_ips":
          return (cluster.public_ips || []).join(", ");
        default:
          return "";
      }
    };
    const multiplier = sortDirection === "asc" ? 1 : -1;
    return [...filteredClusters].sort((left, right) => {
      const result = String(getComparableValue(left, sortBy)).localeCompare(
        String(getComparableValue(right, sortBy)),
        undefined,
        { numeric: true, sensitivity: "base" }
      );
      if (result !== 0) return result * multiplier;
      return String(left.cluster_arn || "").localeCompare(String(right.cluster_arn || ""));
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
    setAdvancedField("cluster_name");
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
    cluster_name: {
      renderHeader: () => sortableHeader("cluster_name", "Cluster Name"),
      renderCell: (cluster) => (
        <TableCell key="cluster_name">
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {cluster.cluster_name}
          </Typography>
        </TableCell>
      ),
    },
    cluster_arn: {
      renderHeader: () => sortableHeader("cluster_arn", "Cluster ARN"),
      renderCell: (cluster) => (
        <TableCell key="cluster_arn">
          <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: "0.75rem" }}>
            {cluster.cluster_arn}
          </Typography>
        </TableCell>
      ),
    },
    status: {
      renderHeader: () => sortableHeader("status", "Status"),
      renderCell: (cluster) => {
        const statusConfig = getEksStatusConfig(cluster.status);
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
    version: {
      renderHeader: () => sortableHeader("version", "Kubernetes Version"),
      renderCell: (cluster) => (
        <TableCell key="version">
          <StatusChip
            label={cluster.version || "N/A"}
            color="#A78BFA"
            Icon={NewReleasesOutlinedIcon}
          />
        </TableCell>
      ),
    },
    private_ips: {
      renderHeader: () => sortableHeader("private_ips", "Private IPs"),
      renderCell: (cluster) => (
        <TableCell key="private_ips">{renderIpList(cluster.private_ips)}</TableCell>
      ),
    },
    public_ips: {
      renderHeader: () => sortableHeader("public_ips", "Public IPs"),
      renderCell: (cluster) => (
        <TableCell key="public_ips">{renderIpList(cluster.public_ips)}</TableCell>
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
          <HubIcon sx={{ color: '#45B7D1' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            EKS Clusters
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
            id: "eks-region-select-label",
            label: "Region",
            value: selectedRegion,
            onChange: handleRegionChange,
            allLabel: "All Regions",
            accentColor: "#60A5FA",
            icon: <RoomOutlinedIcon sx={selectIconSx("#60A5FA")} />,
            options: uniqueRegions.map((region) => ({ value: region, label: region })),
          },
          {
            id: "eks-status-select-label",
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
      <Paper sx={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
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
                  <TableRow key={cluster.cluster_arn} hover>
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
        type="eks"
        title={selectedCluster?.cluster_name || 'EKS Cluster Details'}
      />
    </Box>
  );
};

export default EKSTab;
