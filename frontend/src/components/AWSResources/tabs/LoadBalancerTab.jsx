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
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import WidgetsIcon from "@mui/icons-material/Widgets";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import RoomOutlinedIcon from "@mui/icons-material/RoomOutlined";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import RouteOutlinedIcon from "@mui/icons-material/RouteOutlined";
import LanIcon from "@mui/icons-material/Lan";
import PublicIcon from "@mui/icons-material/Public";
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

const getLoadBalancerStateConfig = (state) => {
  const normalized = String(state || "").toLowerCase();
  if (normalized === "active") return { color: "#34D399", Icon: CheckCircleIcon };
  if (normalized === "provisioning") return { color: "#F59E0B", Icon: HourglassEmptyIcon };
  if (["active_impaired", "failed"].includes(normalized)) {
    return { color: "#E24B4A", Icon: CancelIcon };
  }
  return { color: "#94A3B8", Icon: HelpOutlineIcon };
};

const getLoadBalancerTypeConfig = (type) => {
  const normalized = String(type || "").toLowerCase();
  if (normalized === "application") return { color: "#A78BFA", Icon: CategoryOutlinedIcon };
  if (normalized === "network") return { color: "#22D3EE", Icon: RouteOutlinedIcon };
  return { color: "#94A3B8", Icon: CategoryOutlinedIcon };
};

const getLoadBalancerSchemeConfig = (scheme) => {
  const normalized = String(scheme || "").toLowerCase();
  if (normalized === "internet-facing") return { color: "#60A5FA", Icon: PublicIcon };
  if (normalized === "internal") return { color: "#A78BFA", Icon: LanIcon };
  return { color: "#94A3B8", Icon: LanIcon };
};

const LOAD_BALANCER_DEFAULT_COLUMNS = [
  { key: "load_balancer_name", label: "Load Balancer Name" },
  { key: "load_balancer_type", label: "Type" },
  { key: "state", label: "State" },
  { key: "region", label: "Region" },
  { key: "scheme", label: "Scheme" },
  { key: "private_ips", label: "Private IPs" },
  { key: "public_ips", label: "Public IPs" },
  { key: "load_balancer_arn", label: "Load Balancer ARN", hiddenByDefault: true },
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

const LoadBalancerTab = ({ data, globalSearch, globalSearchResults, onRefresh }) => {
  const ADVANCED_SEARCH_PREFIX = "loadbalancer";
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState("load_balancer_name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [selectedLoadBalancer, setSelectedLoadBalancer] = useState(null);
  
  // URL state management
  const [searchParams, setSearchParams] = useSearchParams();
  const { search } = useLocation();
  
  // Initialize filters from URL
  const [selectedRegion, setSelectedRegion] = useState(searchParams.get("region") || '');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get("status") || '');
  const [selectedType, setSelectedType] = useState(searchParams.get("type") || '');
  const [selectedScheme, setSelectedScheme] = useState(searchParams.get("scheme") || '');
  const initialAdvancedState = readAdvancedSearchState(searchParams, {
    defaultField: "load_balancer_name",
    defaultOperator: "contains",
    prefix: ADVANCED_SEARCH_PREFIX,
  });
  const [advancedRules, setAdvancedRules] = useState(initialAdvancedState.rules);
  const [advancedJoin, setAdvancedJoin] = useState(initialAdvancedState.join);
  const [advancedField, setAdvancedField] = useState(initialAdvancedState.field);
  const [advancedOperator, setAdvancedOperator] = useState(initialAdvancedState.operator);
  const [advancedValue, setAdvancedValue] = useState(initialAdvancedState.value);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  
  const { localSearch, updateLocalSearch, clearLocalSearch } = useLocalSearch('loadbalancer', globalSearch);

  // Sync URL changes to local state
  useEffect(() => {
    const urlRegion = searchParams.get("region") || '';
    const urlStatus = searchParams.get("status") || '';
    const urlType = searchParams.get("type") || '';
    const urlScheme = searchParams.get("scheme") || '';
    
    if (urlRegion !== selectedRegion) {
      setSelectedRegion(urlRegion);
    }
    if (urlStatus !== selectedStatus) {
      setSelectedStatus(urlStatus);
    }
    if (urlType !== selectedType) {
      setSelectedType(urlType);
    }
    if (urlScheme !== selectedScheme) {
      setSelectedScheme(urlScheme);
    }

    const nextAdvancedState = readAdvancedSearchState(searchParams, {
      defaultField: "load_balancer_name",
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
      if (selectedType) nextParams.set("type", selectedType);
      else nextParams.delete("type");
      if (selectedScheme) nextParams.set("scheme", selectedScheme);
      else nextParams.delete("scheme");
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
  }, [advancedField, advancedJoin, advancedOperator, advancedRules, advancedValue, selectedRegion, selectedScheme, selectedStatus, selectedType, setSearchParams]);

  // Combine global and local search
  const searchTerm = globalSearch || localSearch;
  const searchResults = globalSearch ? globalSearchResults : null;

  // Get unique values for dropdowns
  const uniqueRegions = useMemo(() => {
    const regions = [...new Set(data.loadBalancers.map(lb => lb.region))].filter(Boolean).sort();
    return regions;
  }, [data.loadBalancers]);

  const uniqueStatuses = useMemo(() => {
    const statuses = [...new Set(data.loadBalancers.map(lb => lb.state))].filter(Boolean).sort();
    return statuses;
  }, [data.loadBalancers]);

  const uniqueTypes = useMemo(() => {
    const types = [...new Set(data.loadBalancers.map(lb => lb.load_balancer_type))].filter(Boolean).sort();
    return types;
  }, [data.loadBalancers]);

  const uniqueSchemes = useMemo(() => {
    const schemes = [...new Set(data.loadBalancers.map(lb => lb.scheme))].filter(Boolean).sort();
    return schemes;
  }, [data.loadBalancers]);

  const advancedFields = useMemo(
    () => [
      {
        value: "region",
        label: "Region",
        type: "enum",
        options: uniqueRegions.map((region) => ({ value: region, label: region })),
      },
      {
        value: "state",
        label: "Status",
        type: "enum",
        options: uniqueStatuses.map((status) => ({ value: status, label: status })),
      },
      {
        value: "load_balancer_type",
        label: "Type",
        type: "enum",
        options: uniqueTypes.map((type) => ({ value: type, label: type })),
      },
      {
        value: "scheme",
        label: "Scheme",
        type: "enum",
        options: uniqueSchemes.map((scheme) => ({ value: scheme, label: scheme })),
      },
      { value: "load_balancer_name", label: "Load Balancer Name", type: "text" },
      { value: "load_balancer_arn", label: "Load Balancer ARN", type: "text" },
      { value: "private_ips", label: "Private IPs", type: "text" },
      { value: "public_ips", label: "Public IPs", type: "text" },
    ],
    [uniqueRegions, uniqueSchemes, uniqueStatuses, uniqueTypes]
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
  } = useTableColumns("aws_loadbalancer", LOAD_BALANCER_DEFAULT_COLUMNS);
  const columnOrder = useMemo(() => visibleColumns.map((column) => column.key), [visibleColumns]);

  // Filter load balancers based on search, region, status, type, and scheme
  const filteredLoadBalancers = useMemo(() => {
    let loadBalancers = data.loadBalancers;
    
    if (searchResults) {
      loadBalancers = searchResults;
    } else if (searchTerm) {
      const term = searchTerm.toLowerCase();
      loadBalancers = loadBalancers.filter(lb => 
        lb.load_balancer_name?.toLowerCase().includes(term) ||
        lb.load_balancer_arn?.toLowerCase().includes(term) ||
        lb.load_balancer_type?.toLowerCase().includes(term) ||
        lb.state?.toLowerCase().includes(term) ||
        lb.region?.toLowerCase().includes(term) ||
        lb.scheme?.toLowerCase().includes(term) ||
        lb.private_ips?.some(ip => ip.toLowerCase().includes(term)) ||
        lb.public_ips?.some(ip => ip.toLowerCase().includes(term))
      );
    }

    // Apply region filter
    if (selectedRegion) {
      loadBalancers = loadBalancers.filter(lb => lb.region === selectedRegion);
    }

    // Apply status filter
    if (selectedStatus) {
      loadBalancers = loadBalancers.filter(lb => lb.state === selectedStatus);
    }

    // Apply type filter
    if (selectedType) {
      loadBalancers = loadBalancers.filter(lb => lb.load_balancer_type === selectedType);
    }

    // Apply scheme filter
    if (selectedScheme) {
      loadBalancers = loadBalancers.filter(lb => lb.scheme === selectedScheme);
    }

    if (advancedRules.length) {
      loadBalancers = loadBalancers.filter((lb) =>
        applyAdvancedRules(lb, advancedRules, advancedFieldMap, (item, field) => {
          if (field === "private_ips" || field === "public_ips") {
            return (item[field] || []).join(", ");
          }
          return String(item[field] ?? "").trim();
        })
      );
    }

    return loadBalancers;
  }, [advancedFieldMap, advancedRules, data.loadBalancers, searchTerm, searchResults, selectedRegion, selectedScheme, selectedStatus, selectedType]);

  const sortedLoadBalancers = useMemo(() => {
    const getComparableValue = (lb, column) => {
      switch (column) {
        case "load_balancer_name":
          return lb.load_balancer_name || "";
        case "load_balancer_type":
          return lb.load_balancer_type || "";
        case "load_balancer_arn":
          return lb.load_balancer_arn || "";
        case "state":
          return lb.state || "";
        case "region":
          return lb.region || "";
        case "scheme":
          return lb.scheme || "";
        case "private_ips":
          return (lb.private_ips || []).join(", ");
        case "public_ips":
          return (lb.public_ips || []).join(", ");
        default:
          return "";
      }
    };
    const multiplier = sortDirection === "asc" ? 1 : -1;
    return [...filteredLoadBalancers].sort((left, right) => {
      const result = String(getComparableValue(left, sortBy)).localeCompare(
        String(getComparableValue(right, sortBy)),
        undefined,
        { numeric: true, sensitivity: "base" }
      );
      if (result !== 0) return result * multiplier;
      return String(left.load_balancer_arn || "").localeCompare(String(right.load_balancer_arn || ""));
    });
  }, [filteredLoadBalancers, sortBy, sortDirection]);

  // Pagination
  const paginatedLoadBalancers = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return sortedLoadBalancers.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedLoadBalancers, page, rowsPerPage]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = (loadBalancer) => {
    setSelectedLoadBalancer(loadBalancer);
  };

  const handleCloseModal = () => {
    setSelectedLoadBalancer(null);
  };

  const handleRegionChange = (event) => {
    setSelectedRegion(event.target.value);
    setPage(0);
  };

  const handleStatusChange = (event) => {
    setSelectedStatus(event.target.value);
    setPage(0);
  };

  const handleTypeChange = (event) => {
    setSelectedType(event.target.value);
    setPage(0);
  };

  const handleSchemeChange = (event) => {
    setSelectedScheme(event.target.value);
    setPage(0);
  };

  const clearFilters = () => {
    setSelectedRegion('');
    setSelectedStatus('');
    setSelectedType('');
    setSelectedScheme('');
    setAdvancedRules([]);
    setAdvancedJoin("AND");
    setAdvancedField("load_balancer_name");
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
    load_balancer_name: {
      renderHeader: () => sortableHeader("load_balancer_name", "Load Balancer Name"),
      renderCell: (loadBalancer) => (
        <TableCell key="load_balancer_name">
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {loadBalancer.load_balancer_name}
          </Typography>
        </TableCell>
      ),
    },
    load_balancer_type: {
      renderHeader: () => sortableHeader("load_balancer_type", "Type"),
      renderCell: (loadBalancer) => {
        const typeConfig = getLoadBalancerTypeConfig(loadBalancer.load_balancer_type);
        return (
          <TableCell key="load_balancer_type">
            <StatusChip
              label={loadBalancer.load_balancer_type || "N/A"}
              color={typeConfig.color}
              Icon={typeConfig.Icon}
            />
          </TableCell>
        );
      },
    },
    state: {
      renderHeader: () => sortableHeader("state", "State"),
      renderCell: (loadBalancer) => {
        const stateConfig = getLoadBalancerStateConfig(loadBalancer.state);
        return (
          <TableCell key="state">
            <StatusChip label={loadBalancer.state || "Unknown"} color={stateConfig.color} Icon={stateConfig.Icon} />
          </TableCell>
        );
      },
    },
    region: {
      renderHeader: () => sortableHeader("region", "Region"),
      renderCell: (loadBalancer) => (
        <TableCell key="region">
          <Typography variant="body2">{loadBalancer.region}</Typography>
        </TableCell>
      ),
    },
    scheme: {
      renderHeader: () => sortableHeader("scheme", "Scheme"),
      renderCell: (loadBalancer) => {
        const schemeConfig = getLoadBalancerSchemeConfig(loadBalancer.scheme);
        return (
          <TableCell key="scheme">
            <StatusChip label={loadBalancer.scheme || "N/A"} color={schemeConfig.color} Icon={schemeConfig.Icon} />
          </TableCell>
        );
      },
    },
    private_ips: {
      renderHeader: () => sortableHeader("private_ips", "Private IPs"),
      renderCell: (loadBalancer) => (
        <TableCell key="private_ips">{renderIpList(loadBalancer.private_ips)}</TableCell>
      ),
    },
    public_ips: {
      renderHeader: () => sortableHeader("public_ips", "Public IPs"),
      renderCell: (loadBalancer) => (
        <TableCell key="public_ips">{renderIpList(loadBalancer.public_ips)}</TableCell>
      ),
    },
    load_balancer_arn: {
      renderHeader: () => sortableHeader("load_balancer_arn", "Load Balancer ARN"),
      renderCell: (loadBalancer) => (
        <TableCell key="load_balancer_arn">
          <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: "0.75rem" }}>
            {loadBalancer.load_balancer_arn}
          </Typography>
        </TableCell>
      ),
    },
    actions: {
      renderHeader: () => <TableCell key="actions">Actions</TableCell>,
      renderCell: (loadBalancer) => (
        <TableCell key="actions">
          <Tooltip title="View details">
            <IconButton
              size="small"
              onClick={() => handleViewDetails(loadBalancer)}
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
          <AccountBalanceIcon sx={{ color: '#98D8C8' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Load Balancers
          </Typography>
        </Box>
        
        <StatusChip
          label={`${sortedLoadBalancers.length} load balancers`}
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

      <SectionFilterBar
        searchPlaceholder="Search load balancers..."
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
        flexWrap="wrap"
        selects={[
          {
            id: "load-balancer-region-select-label",
            label: "Region",
            value: selectedRegion,
            onChange: handleRegionChange,
            allLabel: "All Regions",
            accentColor: "#60A5FA",
            icon: <RoomOutlinedIcon sx={selectIconSx("#60A5FA")} />,
            options: uniqueRegions.map((region) => ({ value: region, label: region })),
          },
          {
            id: "load-balancer-status-select-label",
            label: "Status",
            value: selectedStatus,
            onChange: handleStatusChange,
            allLabel: "All Statuses",
            accentColor: "#F59E0B",
            icon: <TaskAltIcon sx={selectIconSx("#F59E0B")} />,
            options: uniqueStatuses.map((status) => ({ value: status, label: status })),
          },
          {
            id: "load-balancer-type-select-label",
            label: "Type",
            value: selectedType,
            onChange: handleTypeChange,
            allLabel: "All Types",
            accentColor: "#A78BFA",
            icon: <CategoryOutlinedIcon sx={selectIconSx("#A78BFA")} />,
            options: uniqueTypes.map((type) => ({ value: type, label: type })),
          },
          {
            id: "load-balancer-scheme-select-label",
            label: "Scheme",
            value: selectedScheme,
            onChange: handleSchemeChange,
            allLabel: "All Schemes",
            accentColor: "#22D3EE",
            icon: <LanIcon sx={selectIconSx("#22D3EE")} />,
            options: uniqueSchemes.map((scheme) => ({ value: scheme, label: scheme })),
          },
        ]}
        showClearFilters={Boolean(selectedRegion || selectedStatus || selectedType || selectedScheme || advancedRules.length)}
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
              ) : paginatedLoadBalancers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm || selectedRegion || selectedStatus || selectedType || selectedScheme ? 'No load balancers found matching your filters.' : 'No load balancers available.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLoadBalancers.map((loadBalancer) => (
                  <TableRow key={loadBalancer.load_balancer_arn} hover>
                    {columns.map((column) => column.renderCell(loadBalancer))}
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
          count={sortedLoadBalancers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Detail Modal */}
      <ModalFactory
        open={!!selectedLoadBalancer}
        onClose={handleCloseModal}
        data={selectedLoadBalancer}
        type="loadbalancer"
        title={selectedLoadBalancer?.load_balancer_name || 'Load Balancer Details'}
      />
    </Box>
  );
};

export default LoadBalancerTab;
