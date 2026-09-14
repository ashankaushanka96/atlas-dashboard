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
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloudIcon from "@mui/icons-material/Cloud";
import WidgetsIcon from "@mui/icons-material/Widgets";
import SearchIcon from "@mui/icons-material/Search";
import RoomOutlinedIcon from "@mui/icons-material/RoomOutlined";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import DevicesOtherIcon from "@mui/icons-material/DevicesOther";
import ModalFactory from "../modals/ModalFactory";
import { useLocalSearch } from "../utils/TabUtils";
import { useSearchParams, useLocation } from "react-router-dom";
import SectionFilterBar from "../../shared/SectionFilterBar";
import AdvancedSearchPanel from "../../shared/AdvancedSearchPanel";
import ColumnChooserButton from "../../shared/ColumnChooserButton";
import StatusChip from "../../HostDetails/StatusChip";
import hexToRgb from "../../shared/hexToRgb";
import { getInstanceStatusConfig } from "../ec2StatusConfig";
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

const EC2_DEFAULT_COLUMNS = [
  { key: "instance_name", label: "Instance Name" },
  { key: "instance_id", label: "Instance ID" },
  { key: "private_ip", label: "Private IP" },
  { key: "public_ip", label: "Public IP" },
  { key: "instance_type", label: "Instance Type" },
  { key: "region", label: "Region" },
  { key: "instance_status", label: "Status" },
  { key: "actions", label: "Actions", pinned: true },
];

const EC2Tab = ({ data, globalSearch, globalSearchResults, onRefresh }) => {
  const ADVANCED_SEARCH_PREFIX = "ec2";
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState("instance_name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [selectedInstance, setSelectedInstance] = useState(null);
  
  // URL state management
  const [searchParams, setSearchParams] = useSearchParams();
  const { search } = useLocation();
  
  // Initialize filters from URL
  const [selectedRegion, setSelectedRegion] = useState(searchParams.get("region") || '');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get("status") || '');
  const [selectedAssetCustodians, setSelectedAssetCustodians] = useState(
    searchParams.getAll("assetCustodian")
  );
  const initialAdvancedState = readAdvancedSearchState(searchParams, {
    defaultField: "instance_name",
    defaultOperator: "contains",
    prefix: ADVANCED_SEARCH_PREFIX,
  });
  const [advancedRules, setAdvancedRules] = useState(initialAdvancedState.rules);
  const [advancedJoin, setAdvancedJoin] = useState(initialAdvancedState.join);
  const [advancedField, setAdvancedField] = useState(initialAdvancedState.field);
  const [advancedOperator, setAdvancedOperator] = useState(initialAdvancedState.operator);
  const [advancedValue, setAdvancedValue] = useState(initialAdvancedState.value);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  
  const { localSearch, updateLocalSearch, clearLocalSearch } = useLocalSearch('ec2', globalSearch);

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

    const urlAssetCustodians = searchParams.getAll("assetCustodian");
    setSelectedAssetCustodians((currentValues) =>
      currentValues.length === urlAssetCustodians.length &&
      currentValues.every((value, index) => value === urlAssetCustodians[index])
        ? currentValues
        : urlAssetCustodians
    );

    const nextAdvancedState = readAdvancedSearchState(searchParams, {
      defaultField: "instance_name",
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
      nextParams.delete("assetCustodian");
      selectedAssetCustodians.forEach((value) => nextParams.append("assetCustodian", value));
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
  }, [advancedField, advancedJoin, advancedOperator, advancedRules, advancedValue, selectedAssetCustodians, selectedRegion, selectedStatus, setSearchParams]);

  // Combine global and local search
  const searchTerm = globalSearch || localSearch;
  const searchResults = globalSearch ? globalSearchResults : null;

  // Get unique regions and statuses for dropdowns
  const uniqueRegions = useMemo(() => {
    const regions = [...new Set(data.instances.map(instance => instance.region))].filter(Boolean).sort();
    return regions;
  }, [data.instances]);

  const uniqueStatuses = useMemo(() => {
    const statuses = [...new Set(data.instances.map(instance => instance.instance_status))].filter(Boolean).sort();
    return statuses;
  }, [data.instances]);

  const uniqueAssetCustodians = useMemo(() => {
    const values = [...new Set(data.instances.map((instance) => instance.asset_custodian))].filter(Boolean).sort();
    return values;
  }, [data.instances]);

  const uniqueInstanceTypes = useMemo(() => {
    const types = [...new Set(data.instances.map((instance) => instance.instance_type))].filter(Boolean).sort();
    return types;
  }, [data.instances]);

  const advancedFields = useMemo(
    () => [
      {
        value: "region",
        label: "Region",
        type: "enum",
        options: uniqueRegions.map((region) => ({ value: region, label: region })),
      },
      { value: "instance_name", label: "Instance Name", type: "text" },
      { value: "instance_id", label: "Instance ID", type: "text" },
      { value: "private_ip", label: "Private IP", type: "text" },
      { value: "public_ip", label: "Public IP", type: "text" },
      {
        value: "instance_type",
        label: "Instance Type",
        type: "enum",
        options: uniqueInstanceTypes.map((type) => ({ value: type, label: type })),
      },
      {
        value: "instance_status",
        label: "Status",
        type: "enum",
        options: uniqueStatuses.map((status) => ({ value: status, label: status })),
      },
    ],
    [uniqueInstanceTypes, uniqueRegions, uniqueStatuses]
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
  } = useTableColumns("aws_ec2", EC2_DEFAULT_COLUMNS);
  const columnOrder = useMemo(() => visibleColumns.map((column) => column.key), [visibleColumns]);

  // Filter instances based on search, region, and status
  const filteredInstances = useMemo(() => {
    let instances = data.instances;
    
    if (searchResults) {
      instances = searchResults;
    } else if (searchTerm) {
      const term = searchTerm.toLowerCase();
      instances = instances.filter(instance => 
        instance.instance_name?.toLowerCase().includes(term) ||
        instance.private_ip?.toLowerCase().includes(term) ||
        instance.public_ip?.toLowerCase().includes(term) ||
        instance.instance_id?.toLowerCase().includes(term) ||
        instance.instance_type?.toLowerCase().includes(term) ||
        instance.region?.toLowerCase().includes(term)
      );
    }

    // Apply region filter
    if (selectedRegion) {
      instances = instances.filter(instance => instance.region === selectedRegion);
    }

    // Apply status filter
    if (selectedStatus) {
      instances = instances.filter(instance => instance.instance_status === selectedStatus);
    }

    if (selectedAssetCustodians.length) {
      instances = instances.filter((instance) =>
        selectedAssetCustodians.includes(instance.asset_custodian)
      );
    }

    if (advancedRules.length) {
      instances = instances.filter((instance) =>
        applyAdvancedRules(instance, advancedRules, advancedFieldMap, (item, field) =>
          String(item[field] ?? "").trim()
        )
      );
    }

    return instances;
  }, [advancedFieldMap, advancedRules, data.instances, searchTerm, searchResults, selectedAssetCustodians, selectedRegion, selectedStatus]);

  const sortedInstances = useMemo(() => {
    const getComparableValue = (instance, column) => {
      switch (column) {
        case "instance_name":
          return instance.instance_name || "";
        case "instance_id":
          return instance.instance_id || "";
        case "private_ip":
          return instance.private_ip || "";
        case "public_ip":
          return instance.public_ip || "";
        case "instance_type":
          return instance.instance_type || "";
        case "region":
          return instance.region || "";
        case "instance_status":
          return instance.instance_status || "";
        default:
          return "";
      }
    };
    const multiplier = sortDirection === "asc" ? 1 : -1;
    return [...filteredInstances].sort((left, right) => {
      const result = String(getComparableValue(left, sortBy)).localeCompare(
        String(getComparableValue(right, sortBy)),
        undefined,
        { numeric: true, sensitivity: "base" }
      );
      if (result !== 0) return result * multiplier;
      return String(left.instance_id || "").localeCompare(String(right.instance_id || ""));
    });
  }, [filteredInstances, sortBy, sortDirection]);

  // Pagination
  const paginatedInstances = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return sortedInstances.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedInstances, page, rowsPerPage]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = (instance) => {
    setSelectedInstance(instance);
  };

  const handleCloseModal = () => {
    setSelectedInstance(null);
  };

  const handleRegionChange = (event) => {
    setSelectedRegion(event.target.value);
    setPage(0);
  };

  const handleStatusChange = (event) => {
    setSelectedStatus(event.target.value);
    setPage(0);
  };

  const handleAssetCustodianChange = (event) => {
    const { value } = event.target;
    const values = typeof value === "string" ? value.split(",") : value;
    setSelectedAssetCustodians(values.includes("") ? [] : values);
    setPage(0);
  };

  const clearFilters = () => {
    setSelectedRegion('');
    setSelectedStatus('');
    setSelectedAssetCustodians([]);
    setAdvancedRules([]);
    setAdvancedJoin("AND");
    setAdvancedField("instance_name");
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
    const fieldConfig = selectedAdvancedFieldConfig;
    if (!fieldConfig) return;

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
    instance_name: {
      renderHeader: () => sortableHeader("instance_name", "Instance Name"),
      renderCell: (instance) => (
        <TableCell key="instance_name">
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {instance.instance_name || "N/A"}
          </Typography>
        </TableCell>
      ),
    },
    instance_id: {
      renderHeader: () => sortableHeader("instance_id", "Instance ID"),
      renderCell: (instance) => (
        <TableCell key="instance_id">
          <Typography variant="body2" fontFamily="monospace">
            {instance.instance_id}
          </Typography>
        </TableCell>
      ),
    },
    private_ip: {
      renderHeader: () => sortableHeader("private_ip", "Private IP"),
      renderCell: (instance) => (
        <TableCell key="private_ip">
          <Typography variant="body2" fontFamily="monospace">
            {instance.private_ip || "N/A"}
          </Typography>
        </TableCell>
      ),
    },
    public_ip: {
      renderHeader: () => sortableHeader("public_ip", "Public IP"),
      renderCell: (instance) => (
        <TableCell key="public_ip">
          <Typography variant="body2" fontFamily="monospace">
            {instance.public_ip || "N/A"}
          </Typography>
        </TableCell>
      ),
    },
    instance_type: {
      renderHeader: () => sortableHeader("instance_type", "Instance Type"),
      renderCell: (instance) => (
        <TableCell key="instance_type">
          <StatusChip
            label={instance.instance_type || "N/A"}
            color="#A78BFA"
            Icon={DevicesOtherIcon}
          />
        </TableCell>
      ),
    },
    region: {
      renderHeader: () => sortableHeader("region", "Region"),
      renderCell: (instance) => (
        <TableCell key="region">
          <Typography variant="body2">{instance.region}</Typography>
        </TableCell>
      ),
    },
    instance_status: {
      renderHeader: () => sortableHeader("instance_status", "Status"),
      renderCell: (instance) => {
        const statusConfig = getInstanceStatusConfig(instance.instance_status);
        return (
          <TableCell key="instance_status">
            <StatusChip
              label={instance.instance_status || "Unknown"}
              color={statusConfig.color}
              Icon={statusConfig.Icon}
            />
          </TableCell>
        );
      },
    },
    actions: {
      renderHeader: () => <TableCell key="actions">Actions</TableCell>,
      renderCell: (instance) => (
        <TableCell key="actions">
          <Tooltip title="View details">
            <IconButton
              size="small"
              onClick={() => handleViewDetails(instance)}
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
          <CloudIcon sx={{ color: '#FF6B35' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            EC2 Instances
          </Typography>
        </Box>
        
        <StatusChip label={`${sortedInstances.length} instances`} color="#60A5FA" Icon={WidgetsIcon} />

        {globalSearch && (
          <StatusChip
            label={`${searchResults?.length || 0} from global search`}
            color="#A78BFA"
            Icon={SearchIcon}
          />
        )}
      </Box>

      <SectionFilterBar
        searchPlaceholder="Search instances..."
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
            id: "ec2-region-select-label",
            label: "Region",
            value: selectedRegion,
            onChange: handleRegionChange,
            allLabel: "All Regions",
            accentColor: "#60A5FA",
            icon: <RoomOutlinedIcon sx={selectIconSx("#60A5FA")} />,
            options: uniqueRegions.map((region) => ({ value: region, label: region })),
          },
          {
            id: "ec2-status-select-label",
            label: "Status",
            value: selectedStatus,
            onChange: handleStatusChange,
            allLabel: "All Statuses",
            accentColor: "#F59E0B",
            icon: <TaskAltIcon sx={selectIconSx("#F59E0B")} />,
            options: uniqueStatuses.map((status) => ({ value: status, label: status })),
          },
          {
            id: "ec2-asset-custodian-select-label",
            label: "Asset Custodian",
            value: selectedAssetCustodians,
            onChange: handleAssetCustodianChange,
            multiple: true,
            allLabel: "All Asset Custodians",
            accentColor: "#A78BFA",
            icon: <PersonOutlineIcon sx={selectIconSx("#A78BFA")} />,
            options: uniqueAssetCustodians.map((value) => ({ value, label: value })),
          },
        ]}
        showClearFilters={Boolean(
          selectedRegion || selectedStatus || selectedAssetCustodians.length || advancedRules.length
        )}
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
              ) : paginatedInstances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm || selectedRegion || selectedStatus ? 'No instances found matching your filters.' : 'No instances available.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedInstances.map((instance) => (
                  <TableRow key={instance.instance_id} hover>
                    {columns.map((column) => column.renderCell(instance))}
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
          count={sortedInstances.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Detail Modal */}
      <ModalFactory
        open={!!selectedInstance}
        onClose={handleCloseModal}
        data={selectedInstance}
        type="ec2"
        title={selectedInstance?.instance_name || selectedInstance?.instance_id || 'EC2 Instance Details'}
      />
    </Box>
  );
};

export default EC2Tab;
