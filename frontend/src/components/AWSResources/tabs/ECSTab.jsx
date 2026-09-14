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
  Tabs,
  Tab,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import StorageIcon from "@mui/icons-material/Storage";
import WidgetsIcon from "@mui/icons-material/Widgets";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import RoomOutlinedIcon from "@mui/icons-material/RoomOutlined";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import NumbersIcon from "@mui/icons-material/Numbers";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
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

const getEcsStatusConfig = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "active") return { color: "#34D399", Icon: CheckCircleIcon };
  if (normalized === "inactive") return { color: "#E24B4A", Icon: CancelIcon };
  if (normalized === "draining" || normalized === "pending") {
    return { color: "#F59E0B", Icon: HourglassEmptyIcon };
  }
  return { color: "#94A3B8", Icon: HelpOutlineIcon };
};

const ECS_CLUSTERS_DEFAULT_COLUMNS = [
  { key: "cluster_name", label: "Cluster Name" },
  { key: "status", label: "Status" },
  { key: "region", label: "Region" },
  { key: "active_services_count", label: "Active Services" },
  { key: "running_tasks_count", label: "Running Tasks" },
  { key: "private_ips", label: "Private IPs" },
  { key: "public_ips", label: "Public IPs" },
  { key: "cluster_arn", label: "Cluster ARN", hiddenByDefault: true },
  { key: "actions", label: "Actions", pinned: true },
];

const ECS_SERVICES_DEFAULT_COLUMNS = [
  { key: "service_name", label: "Service Name" },
  { key: "cluster_name", label: "Cluster Name" },
  { key: "status", label: "Status" },
  { key: "region", label: "Region" },
  { key: "desired_count", label: "Desired Count" },
  { key: "running_count", label: "Running Count" },
  { key: "private_ips", label: "Private IPs" },
  { key: "public_ips", label: "Public IPs" },
  { key: "service_arn", label: "Service ARN", hiddenByDefault: true },
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

const ECSTab = ({ data, globalSearch, globalSearchResults, onRefresh }) => {
  const ADVANCED_SEARCH_PREFIX = "ecs";
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState("cluster_name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [activeView, setActiveView] = useState(0); // 0: Clusters, 1: Services
  const [selectedItem, setSelectedItem] = useState(null);
  
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
  
  const { localSearch, updateLocalSearch, clearLocalSearch } = useLocalSearch('ecs', globalSearch);

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
      defaultField: activeView === 0 ? "cluster_name" : "service_name",
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
    const items = activeView === 0 ? data.clusters : data.services;
    const regions = [...new Set(items.map(item => item.region))].filter(Boolean).sort();
    return regions;
  }, [data.clusters, data.services, activeView]);

  const uniqueStatuses = useMemo(() => {
    const items = activeView === 0 ? data.clusters : data.services;
    const statuses = [...new Set(items.map(item => item.status))].filter(Boolean).sort();
    return statuses;
  }, [data.clusters, data.services, activeView]);

  const advancedFields = useMemo(() => {
    const commonRegionField = {
      value: "region",
      label: "Region",
      type: "enum",
      options: uniqueRegions.map((region) => ({ value: region, label: region })),
    };

    const commonStatusField = {
      value: "status",
      label: "Status",
      type: "enum",
      options: uniqueStatuses.map((status) => ({ value: status, label: status })),
    };

    if (activeView === 0) {
      return [
        commonRegionField,
        commonStatusField,
        { value: "cluster_name", label: "Cluster Name", type: "text" },
        { value: "cluster_arn", label: "Cluster ARN", type: "text" },
        { value: "private_ips", label: "Private IPs", type: "text" },
        { value: "public_ips", label: "Public IPs", type: "text" },
        { value: "active_services_count", label: "Active Services", type: "number" },
        { value: "running_tasks_count", label: "Running Tasks", type: "number" },
      ];
    }

    return [
      commonRegionField,
      commonStatusField,
      { value: "service_name", label: "Service Name", type: "text" },
      { value: "cluster_name", label: "Cluster Name", type: "text" },
      { value: "service_arn", label: "Service ARN", type: "text" },
      { value: "private_ips", label: "Private IPs", type: "text" },
      { value: "public_ips", label: "Public IPs", type: "text" },
      { value: "desired_count", label: "Desired Count", type: "number" },
      { value: "running_count", label: "Running Count", type: "number" },
    ];
  }, [activeView, uniqueRegions, uniqueStatuses]);

  const advancedFieldMap = useMemo(() => buildAdvancedFieldMap(advancedFields), [advancedFields]);
  const selectedAdvancedFieldConfig =
    advancedFieldMap[advancedField] || advancedFields[0] || null;
  const selectedAdvancedOperatorOptions = getAdvancedOperatorOptions(selectedAdvancedFieldConfig);

  const clustersColumns = useTableColumns("aws_ecs_clusters", ECS_CLUSTERS_DEFAULT_COLUMNS);
  const servicesColumns = useTableColumns("aws_ecs_services", ECS_SERVICES_DEFAULT_COLUMNS);
  const activeColumnsState = activeView === 0 ? clustersColumns : servicesColumns;
  const clustersColumnOrder = useMemo(
    () => clustersColumns.visibleColumns.map((column) => column.key),
    [clustersColumns.visibleColumns]
  );
  const servicesColumnOrder = useMemo(
    () => servicesColumns.visibleColumns.map((column) => column.key),
    [servicesColumns.visibleColumns]
  );

  useEffect(() => {
    const defaultField = activeView === 0 ? "cluster_name" : "service_name";
    setAdvancedRules([]);
    setAdvancedJoin("AND");
    setAdvancedField(defaultField);
    setAdvancedOperator("contains");
    setAdvancedValue("");
    setAdvancedOpen(false);
  }, [activeView]);

  // Filter data based on search, region, status and active view
  const filteredData = useMemo(() => {
    let items = [];
    
    if (activeView === 0) {
      // Clusters view
      items = data.clusters;
      if (searchResults) {
        items = searchResults.filter(item => item.cluster_name); // Filter clusters from search results
      } else if (searchTerm) {
        const term = searchTerm.toLowerCase();
        items = items.filter(cluster => 
          cluster.cluster_name?.toLowerCase().includes(term) ||
          cluster.cluster_arn?.toLowerCase().includes(term) ||
          cluster.status?.toLowerCase().includes(term) ||
          cluster.region?.toLowerCase().includes(term) ||
          cluster.private_ips?.some(ip => ip.toLowerCase().includes(term)) ||
          cluster.public_ips?.some(ip => ip.toLowerCase().includes(term))
        );
      }
    } else {
      // Services view
      items = data.services;
      if (searchResults) {
        items = searchResults.filter(item => item.service_name); // Filter services from search results
      } else if (searchTerm) {
        const term = searchTerm.toLowerCase();
        items = items.filter(service => 
          service.service_name?.toLowerCase().includes(term) ||
          service.cluster_name?.toLowerCase().includes(term) ||
          service.service_arn?.toLowerCase().includes(term) ||
          service.status?.toLowerCase().includes(term) ||
          service.region?.toLowerCase().includes(term) ||
          service.private_ips?.some(ip => ip.toLowerCase().includes(term)) ||
          service.public_ips?.some(ip => ip.toLowerCase().includes(term))
        );
      }
    }

    // Apply region filter
    if (selectedRegion) {
      items = items.filter(item => item.region === selectedRegion);
    }

    // Apply status filter
    if (selectedStatus) {
      items = items.filter(item => item.status === selectedStatus);
    }

    if (advancedRules.length) {
      items = items.filter((item) =>
        applyAdvancedRules(item, advancedRules, advancedFieldMap, (entry, field) => {
          if (
            field === "active_services_count" ||
            field === "running_tasks_count" ||
            field === "desired_count" ||
            field === "running_count"
          ) {
            return Number(entry[field] ?? 0);
          }
          if (field === "private_ips" || field === "public_ips") {
            return (entry[field] || []).join(", ");
          }
          return String(entry[field] ?? "").trim();
        })
      );
    }

    return items;
  }, [
    activeView,
    advancedFieldMap,
    advancedRules,
    data.clusters,
    data.services,
    searchResults,
    searchTerm,
    selectedRegion,
    selectedStatus,
  ]);

  const sortedData = useMemo(() => {
    const getComparableValue = (item, column) => {
      switch (column) {
        case "cluster_name":
          return item.cluster_name || "";
        case "service_name":
          return item.service_name || "";
        case "status":
          return item.status || "";
        case "region":
          return item.region || "";
        case "active_services_count":
          return Number(item.active_services_count || 0);
        case "running_tasks_count":
          return Number(item.running_tasks_count || 0);
        case "desired_count":
          return Number(item.desired_count || 0);
        case "running_count":
          return Number(item.running_count || 0);
        case "private_ips":
          return (item.private_ips || []).join(", ");
        case "public_ips":
          return (item.public_ips || []).join(", ");
        case "cluster_arn":
          return item.cluster_arn || "";
        case "service_arn":
          return item.service_arn || "";
        default:
          return "";
      }
    };

    const multiplier = sortDirection === "asc" ? 1 : -1;
    return [...filteredData].sort((left, right) => {
      const leftValue = getComparableValue(left, sortBy);
      const rightValue = getComparableValue(right, sortBy);
      if (typeof leftValue === "number" || typeof rightValue === "number") {
        const result = Number(leftValue) - Number(rightValue);
        if (result !== 0) return result * multiplier;
      } else {
        const result = String(leftValue).localeCompare(String(rightValue), undefined, {
          numeric: true,
          sensitivity: "base",
        });
        if (result !== 0) return result * multiplier;
      }
      return String(left.cluster_arn || left.service_arn || "").localeCompare(
        String(right.cluster_arn || right.service_arn || "")
      );
    });
  }, [filteredData, sortBy, sortDirection]);

  // Pagination
  const paginatedData = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return sortedData.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedData, page, rowsPerPage]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewChange = (event, newValue) => {
    setActiveView(newValue);
    setPage(0);
    setSortBy(newValue === 0 ? "cluster_name" : "service_name");
    setSortDirection("asc");
  };

  const handleViewDetails = (item) => {
    setSelectedItem(item);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
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
    setAdvancedField(activeView === 0 ? "cluster_name" : "service_name");
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
        id: `${activeView}-${advancedField}-${advancedOperator}-${Date.now()}`,
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

  const clusterColumnDefs = {
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
    status: {
      renderHeader: () => sortableHeader("status", "Status"),
      renderCell: (cluster) => {
        const statusConfig = getEcsStatusConfig(cluster.status);
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
    active_services_count: {
      renderHeader: () => sortableHeader("active_services_count", "Active Services"),
      renderCell: (cluster) => (
        <TableCell key="active_services_count">
          <StatusChip
            label={String(cluster.active_services_count || 0)}
            color="#60A5FA"
            Icon={NumbersIcon}
          />
        </TableCell>
      ),
    },
    running_tasks_count: {
      renderHeader: () => sortableHeader("running_tasks_count", "Running Tasks"),
      renderCell: (cluster) => (
        <TableCell key="running_tasks_count">
          <StatusChip
            label={String(cluster.running_tasks_count || 0)}
            color="#34D399"
            Icon={PlayCircleOutlineIcon}
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

  const serviceColumnDefs = {
    service_name: {
      renderHeader: () => sortableHeader("service_name", "Service Name"),
      renderCell: (service) => (
        <TableCell key="service_name">
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {service.service_name}
          </Typography>
        </TableCell>
      ),
    },
    cluster_name: {
      renderHeader: () => sortableHeader("cluster_name", "Cluster Name"),
      renderCell: (service) => (
        <TableCell key="cluster_name">
          <Typography variant="body2">{service.cluster_name}</Typography>
        </TableCell>
      ),
    },
    status: {
      renderHeader: () => sortableHeader("status", "Status"),
      renderCell: (service) => {
        const statusConfig = getEcsStatusConfig(service.status);
        return (
          <TableCell key="status">
            <StatusChip label={service.status || "Unknown"} color={statusConfig.color} Icon={statusConfig.Icon} />
          </TableCell>
        );
      },
    },
    region: {
      renderHeader: () => sortableHeader("region", "Region"),
      renderCell: (service) => (
        <TableCell key="region">
          <Typography variant="body2">{service.region}</Typography>
        </TableCell>
      ),
    },
    desired_count: {
      renderHeader: () => sortableHeader("desired_count", "Desired Count"),
      renderCell: (service) => (
        <TableCell key="desired_count">
          <StatusChip label={String(service.desired_count || 0)} color="#60A5FA" Icon={NumbersIcon} />
        </TableCell>
      ),
    },
    running_count: {
      renderHeader: () => sortableHeader("running_count", "Running Count"),
      renderCell: (service) => (
        <TableCell key="running_count">
          <StatusChip
            label={String(service.running_count || 0)}
            color="#34D399"
            Icon={PlayCircleOutlineIcon}
          />
        </TableCell>
      ),
    },
    private_ips: {
      renderHeader: () => sortableHeader("private_ips", "Private IPs"),
      renderCell: (service) => (
        <TableCell key="private_ips">{renderIpList(service.private_ips)}</TableCell>
      ),
    },
    public_ips: {
      renderHeader: () => sortableHeader("public_ips", "Public IPs"),
      renderCell: (service) => (
        <TableCell key="public_ips">{renderIpList(service.public_ips)}</TableCell>
      ),
    },
    service_arn: {
      renderHeader: () => sortableHeader("service_arn", "Service ARN"),
      renderCell: (service) => (
        <TableCell key="service_arn">
          <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: "0.75rem" }}>
            {service.service_arn}
          </Typography>
        </TableCell>
      ),
    },
    actions: {
      renderHeader: () => <TableCell key="actions">Actions</TableCell>,
      renderCell: (service) => (
        <TableCell key="actions">
          <Tooltip title="View details">
            <IconButton
              size="small"
              onClick={() => handleViewDetails(service)}
              sx={tintedIconButtonSx("#60A5FA")}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </TableCell>
      ),
    },
  };

  const clusterColumns = clustersColumnOrder.map((key) => clusterColumnDefs[key]).filter(Boolean);
  const clusterColCount = clusterColumns.length || 1;
  const serviceColumns = servicesColumnOrder.map((key) => serviceColumnDefs[key]).filter(Boolean);
  const serviceColCount = serviceColumns.length || 1;

  if (data.error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {data.error}
      </Alert>
    );
  }

  const renderClustersTable = () => (
    <Table stickyHeader>
      <TableHead>
        <TableRow>{clusterColumns.map((column) => column.renderHeader())}</TableRow>
      </TableHead>
      <TableBody>
        {data.loading ? (
          <LoadingTableRows colCount={clusterColCount} rowsPerPage={rowsPerPage} />
        ) : paginatedData.length === 0 ? (
          <TableRow>
            <TableCell colSpan={clusterColCount} align="center" sx={{ py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                {searchTerm || selectedRegion || selectedStatus ? 'No clusters found matching your filters.' : 'No clusters available.'}
              </Typography>
            </TableCell>
          </TableRow>
        ) : (
          paginatedData.map((cluster) => (
            <TableRow key={cluster.cluster_arn} hover>
              {clusterColumns.map((column) => column.renderCell(cluster))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const renderServicesTable = () => (
    <Table stickyHeader>
      <TableHead>
        <TableRow>{serviceColumns.map((column) => column.renderHeader())}</TableRow>
      </TableHead>
      <TableBody>
        {data.loading ? (
          <LoadingTableRows colCount={serviceColCount} rowsPerPage={rowsPerPage} />
        ) : paginatedData.length === 0 ? (
          <TableRow>
            <TableCell colSpan={serviceColCount} align="center" sx={{ py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                {searchTerm || selectedRegion || selectedStatus ? 'No services found matching your filters.' : 'No services available.'}
              </Typography>
            </TableCell>
          </TableRow>
        ) : (
          paginatedData.map((service) => (
            <TableRow key={service.service_arn} hover>
              {serviceColumns.map((column) => column.renderCell(service))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StorageIcon sx={{ color: '#4ECDC4' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            ECS Services
          </Typography>
        </Box>
        
        <StatusChip
          label={`${sortedData.length} ${activeView === 0 ? 'clusters' : 'services'}`}
          color="#60A5FA"
          Icon={WidgetsIcon}
        />

        {globalSearch && (
          <StatusChip
            label={`${searchResults?.length || 0} from global search`}
            color="#A78BFA"
            Icon={SearchIcon}
          />
        )}
      </Box>

      {/* View Tabs */}
      <Tabs value={activeView} onChange={handleViewChange} sx={{ mb: 2 }}>
        <Tab label={`Clusters (${data.clusters.length})`} />
        <Tab label={`Services (${data.services.length})`} />
      </Tabs>

      <SectionFilterBar
        searchPlaceholder={`Search ${activeView === 0 ? "clusters" : "services"}...`}
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
            id: "ecs-region-select-label",
            label: "Region",
            value: selectedRegion,
            onChange: handleRegionChange,
            allLabel: "All Regions",
            accentColor: "#60A5FA",
            icon: <RoomOutlinedIcon sx={selectIconSx("#60A5FA")} />,
            options: uniqueRegions.map((region) => ({ value: region, label: region })),
          },
          {
            id: "ecs-status-select-label",
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
              columns={activeColumnsState.chooserColumns}
              onToggle={activeColumnsState.toggleColumn}
              onReorder={activeColumnsState.reorderColumns}
              onReset={activeColumnsState.resetToDefault}
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
          {activeView === 0 ? renderClustersTable() : renderServicesTable()}
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          sx={{ flexShrink: 0 }}
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={sortedData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Detail Modal */}
      <ModalFactory
        open={!!selectedItem}
        onClose={handleCloseModal}
        data={selectedItem}
        type="ecs"
        title={selectedItem?.service_name || selectedItem?.cluster_name || 'ECS Details'}
      />
    </Box>
  );
};

export default ECSTab;
