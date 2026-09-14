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
import FunctionsIcon from "@mui/icons-material/Functions";
import WidgetsIcon from "@mui/icons-material/Widgets";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import RoomOutlinedIcon from "@mui/icons-material/RoomOutlined";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import CodeIcon from "@mui/icons-material/Code";
import MemoryIcon from "@mui/icons-material/Memory";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
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

const getLambdaStateConfig = (state) => {
  const normalized = String(state || "").toLowerCase();
  if (normalized === "active") return { color: "#34D399", Icon: CheckCircleIcon };
  if (["pending", "creating", "updating"].includes(normalized)) {
    return { color: "#F59E0B", Icon: HourglassEmptyIcon };
  }
  if (["inactive", "failed", "deleting"].includes(normalized)) {
    return { color: "#E24B4A", Icon: CancelIcon };
  }
  return { color: "#94A3B8", Icon: HelpOutlineIcon };
};

const LAMBDA_DEFAULT_COLUMNS = [
  { key: "function_name", label: "Function Name" },
  { key: "runtime", label: "Runtime" },
  { key: "region", label: "Region" },
  { key: "state", label: "Status" },
  { key: "memory_size", label: "Memory (MB)" },
  { key: "timeout", label: "Timeout (s)" },
  { key: "function_arn", label: "Function ARN", hiddenByDefault: true },
  { key: "actions", label: "Actions", pinned: true },
];

const LambdaTab = ({ data, globalSearch, globalSearchResults, onRefresh }) => {
  const ADVANCED_SEARCH_PREFIX = "lambda";
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState("function_name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [selectedFunction, setSelectedFunction] = useState(null);
  
  // URL state management
  const [searchParams, setSearchParams] = useSearchParams();
  const { search } = useLocation();
  
  // Initialize filters from URL
  const [selectedRegion, setSelectedRegion] = useState(searchParams.get("region") || '');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get("status") || '');
  const initialAdvancedState = readAdvancedSearchState(searchParams, {
    defaultField: "function_name",
    defaultOperator: "contains",
    prefix: ADVANCED_SEARCH_PREFIX,
  });
  const [advancedRules, setAdvancedRules] = useState(initialAdvancedState.rules);
  const [advancedJoin, setAdvancedJoin] = useState(initialAdvancedState.join);
  const [advancedField, setAdvancedField] = useState(initialAdvancedState.field);
  const [advancedOperator, setAdvancedOperator] = useState(initialAdvancedState.operator);
  const [advancedValue, setAdvancedValue] = useState(initialAdvancedState.value);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  
  const { localSearch, updateLocalSearch, clearLocalSearch } = useLocalSearch('lambda', globalSearch);

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
      defaultField: "function_name",
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
    const regions = [...new Set(data.functions.map(func => func.region))].filter(Boolean).sort();
    return regions;
  }, [data.functions]);

  const uniqueStatuses = useMemo(() => {
    const statuses = [...new Set(data.functions.map(func => func.state || 'Active'))].filter(Boolean).sort();
    return statuses;
  }, [data.functions]);

  const uniqueRuntimes = useMemo(() => {
    const runtimes = [...new Set(data.functions.map((func) => func.runtime))].filter(Boolean).sort();
    return runtimes;
  }, [data.functions]);

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
      { value: "function_name", label: "Function Name", type: "text" },
      { value: "function_arn", label: "Function ARN", type: "text" },
      {
        value: "runtime",
        label: "Runtime",
        type: "enum",
        options: uniqueRuntimes.map((runtime) => ({ value: runtime, label: runtime })),
      },
      { value: "description", label: "Description", type: "text" },
      { value: "memory_size", label: "Memory (MB)", type: "number" },
      { value: "timeout", label: "Timeout (s)", type: "number" },
    ],
    [uniqueRegions, uniqueRuntimes, uniqueStatuses]
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
  } = useTableColumns("aws_lambda", LAMBDA_DEFAULT_COLUMNS);
  const columnOrder = useMemo(() => visibleColumns.map((column) => column.key), [visibleColumns]);

  // Filter functions based on search, region, and status
  const filteredFunctions = useMemo(() => {
    let functions = data.functions;
    
    if (searchResults) {
      functions = searchResults;
    } else if (searchTerm) {
      const term = searchTerm.toLowerCase();
      functions = functions.filter(func => 
        func.function_name?.toLowerCase().includes(term) ||
        func.function_arn?.toLowerCase().includes(term) ||
        func.runtime?.toLowerCase().includes(term) ||
        func.region?.toLowerCase().includes(term) ||
        func.description?.toLowerCase().includes(term)
      );
    }

    // Apply region filter
    if (selectedRegion) {
      functions = functions.filter(func => func.region === selectedRegion);
    }

    // Apply status filter
    if (selectedStatus) {
      functions = functions.filter(func => (func.state || 'Active') === selectedStatus);
    }

    if (advancedRules.length) {
      functions = functions.filter((func) =>
        applyAdvancedRules(func, advancedRules, advancedFieldMap, (item, field) =>
          field === "memory_size" || field === "timeout"
            ? Number(item[field] ?? 0)
            : String(item[field] ?? "").trim()
        )
      );
    }

    return functions;
  }, [advancedFieldMap, advancedRules, data.functions, searchTerm, searchResults, selectedRegion, selectedStatus]);

  const sortedFunctions = useMemo(() => {
    const getComparableValue = (func, column) => {
      switch (column) {
        case "function_name":
          return func.function_name || "";
        case "runtime":
          return func.runtime || "";
        case "function_arn":
          return func.function_arn || "";
        case "region":
          return func.region || "";
        case "state":
          return func.state || "Active";
        case "memory_size":
          return Number(func.memory_size || 0);
        case "timeout":
          return Number(func.timeout || 0);
        default:
          return "";
      }
    };
    const multiplier = sortDirection === "asc" ? 1 : -1;
    return [...filteredFunctions].sort((left, right) => {
      const leftValue = getComparableValue(left, sortBy);
      const rightValue = getComparableValue(right, sortBy);
      if (typeof leftValue === "number" || typeof rightValue === "number") {
        const result = Number(leftValue) - Number(rightValue);
        if (result !== 0) return result * multiplier;
      } else {
        const result = String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: "base" });
        if (result !== 0) return result * multiplier;
      }
      return String(left.function_arn || "").localeCompare(String(right.function_arn || ""));
    });
  }, [filteredFunctions, sortBy, sortDirection]);

  // Pagination
  const paginatedFunctions = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return sortedFunctions.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedFunctions, page, rowsPerPage]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = (func) => {
    setSelectedFunction(func);
  };

  const handleCloseModal = () => {
    setSelectedFunction(null);
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
    setAdvancedField("function_name");
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
    function_name: {
      renderHeader: () => sortableHeader("function_name", "Function Name"),
      renderCell: (func) => (
        <TableCell key="function_name">
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {func.function_name}
          </Typography>
          {func.description && (
            <Typography variant="caption" color="text.secondary" display="block">
              {func.description}
            </Typography>
          )}
        </TableCell>
      ),
    },
    runtime: {
      renderHeader: () => sortableHeader("runtime", "Runtime"),
      renderCell: (func) => (
        <TableCell key="runtime">
          <StatusChip label={func.runtime || "N/A"} color="#A78BFA" Icon={CodeIcon} />
        </TableCell>
      ),
    },
    region: {
      renderHeader: () => sortableHeader("region", "Region"),
      renderCell: (func) => (
        <TableCell key="region">
          <Typography variant="body2">{func.region}</Typography>
        </TableCell>
      ),
    },
    state: {
      renderHeader: () => sortableHeader("state", "Status"),
      renderCell: (func) => {
        const stateConfig = getLambdaStateConfig(func.state || "Active");
        return (
          <TableCell key="state">
            <StatusChip label={func.state || "Active"} color={stateConfig.color} Icon={stateConfig.Icon} />
          </TableCell>
        );
      },
    },
    memory_size: {
      renderHeader: () => sortableHeader("memory_size", "Memory (MB)"),
      renderCell: (func) => (
        <TableCell key="memory_size">
          <StatusChip label={func.memory_size ? `${func.memory_size} MB` : "N/A"} color="#60A5FA" Icon={MemoryIcon} />
        </TableCell>
      ),
    },
    timeout: {
      renderHeader: () => sortableHeader("timeout", "Timeout (s)"),
      renderCell: (func) => (
        <TableCell key="timeout">
          <StatusChip label={func.timeout ? `${func.timeout}s` : "N/A"} color="#F59E0B" Icon={TimerOutlinedIcon} />
        </TableCell>
      ),
    },
    function_arn: {
      renderHeader: () => sortableHeader("function_arn", "Function ARN"),
      renderCell: (func) => (
        <TableCell key="function_arn">
          <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: "0.75rem" }}>
            {func.function_arn}
          </Typography>
        </TableCell>
      ),
    },
    actions: {
      renderHeader: () => <TableCell key="actions">Actions</TableCell>,
      renderCell: (func) => (
        <TableCell key="actions">
          <Tooltip title="View details">
            <IconButton
              size="small"
              onClick={() => handleViewDetails(func)}
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
          <FunctionsIcon sx={{ color: '#96CEB4' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Lambda Functions
          </Typography>
        </Box>
        
        <StatusChip label={`${sortedFunctions.length} functions`} color="#60A5FA" Icon={WidgetsIcon} />

        {globalSearch && (
          <StatusChip
            label={`${searchResults?.length || 0} from global search`}
            color="#A78BFA"
            Icon={SearchIcon}
          />
        )}
      </Box>

      <SectionFilterBar
        searchPlaceholder="Search functions..."
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
            id: "lambda-region-select-label",
            label: "Region",
            value: selectedRegion,
            onChange: handleRegionChange,
            allLabel: "All Regions",
            accentColor: "#60A5FA",
            icon: <RoomOutlinedIcon sx={selectIconSx("#60A5FA")} />,
            options: uniqueRegions.map((region) => ({ value: region, label: region })),
          },
          {
            id: "lambda-status-select-label",
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
              ) : paginatedFunctions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm || selectedRegion || selectedStatus ? 'No functions found matching your filters.' : 'No functions available.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedFunctions.map((func) => (
                  <TableRow key={func.function_arn} hover>
                    {columns.map((column) => column.renderCell(func))}
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
          count={sortedFunctions.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Detail Modal */}
      <ModalFactory
        open={!!selectedFunction}
        onClose={handleCloseModal}
        data={selectedFunction}
        type="lambda"
        title={selectedFunction?.function_name || 'Lambda Function Details'}
      />
    </Box>
  );
};

export default LambdaTab;
