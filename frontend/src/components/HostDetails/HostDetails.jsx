import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { Alert, Box, Chip, Snackbar, Typography } from "@mui/material";
import ComputerRoundedIcon from "@mui/icons-material/ComputerRounded";
import { useSearchParams } from "react-router-dom";

import authService, { API } from "../../services/auth";
import ErrorModal from "../../modals/ErrorModal";
import HostDetailsDetailsModal from "./HostDetailsDetailsModal";
import HostDetailsFilterBar from "./HostDetailsFilterBar";
import HostDetailsMetricsModal from "./HostDetailsMetricsModal";
import HostDetailsTable from "./HostDetailsTable";
import { HOST_DETAILS_DEFAULT_COLUMNS } from "./hostDetailsColumns";
import WatcherActionsModal from "./WatcherActionsModal";
import { getCompliantStatusConfig, getOsConfig, getWatcherStatusConfig } from "./statusConfig";
import useTableColumns from "../../hooks/useTableColumns";
import hexToRgb from "../shared/hexToRgb";

const HEADER_ACCENT = "#FF6B35";
import {
  ADVANCED_OPERATORS,
  ADVANCED_RULE_JOIN_OPTIONS,
  applyAdvancedRules,
  areAdvancedRulesEqual,
  buildAdvancedFieldMap,
  getAdvancedOperatorOptions,
  readAdvancedSearchState,
  writeAdvancedSearchParams,
} from "../shared/advancedSearchUtils";

function HostDetails() {
  const wrapperRef = useRef(null);
  const permissions = authService.getPermissions();
  const canManageWatcherActions = Boolean(permissions.configure_watcher || permissions.restart_watcher);

  const [rows, setRows] = useState([]);
  const [selectedServerDetails, setSelectedServerDetails] = useState(null);
  const [selectedMetricsServer, setSelectedMetricsServer] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [inspectorFindingsRequested, setInspectorFindingsRequested] = useState(false);
  const [inspectorFindingsLoading, setInspectorFindingsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openErrorModal, setOpenErrorModal] = useState(false);

  const [watcherActionsTarget, setWatcherActionsTarget] = useState(null);
  const [watcherActionsOpen, setWatcherActionsOpen] = useState(false);
  const [actionSnackbar, setActionSnackbar] = useState(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState("region");
  const [sortDirection, setSortDirection] = useState("asc");

  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedRegion, setSelectedRegion] = useState(searchParams.get("region") || "");
  const [selectedOs, setSelectedOs] = useState(searchParams.get("os") || "");
  const [selectedWatcherStatus, setSelectedWatcherStatus] = useState(
    searchParams.get("watcher_status") || ""
  );
  const [selectedCompliantStatus, setSelectedCompliantStatus] = useState(
    searchParams.get("compliant_status") || ""
  );
  const [selectedAssetCustodians, setSelectedAssetCustodians] = useState(
    searchParams.getAll("assetCustodian")
  );
  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");
  const initialAdvancedState = readAdvancedSearchState(searchParams, {
    defaultField: "hostname",
    defaultOperator: "contains",
  });
  const [advancedRules, setAdvancedRules] = useState(initialAdvancedState.rules);
  const [advancedJoin, setAdvancedJoin] = useState(initialAdvancedState.join);
  const [advancedField, setAdvancedField] = useState(initialAdvancedState.field);
  const [advancedOperator, setAdvancedOperator] = useState(initialAdvancedState.operator);
  const [advancedValue, setAdvancedValue] = useState(initialAdvancedState.value);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const urlRegion = searchParams.get("region") || "";
    const urlOs = searchParams.get("os") || "";
    const urlWatcherStatus = searchParams.get("watcher_status") || "";
    const urlCompliantStatus = searchParams.get("compliant_status") || "";
    const urlAssetCustodians = searchParams.getAll("assetCustodian");
    const urlSearchValue = searchParams.get("search") || "";

    setSelectedRegion((currentRegion) => (currentRegion === urlRegion ? currentRegion : urlRegion));
    setSelectedOs((currentOs) => (currentOs === urlOs ? currentOs : urlOs));
    setSelectedWatcherStatus((currentWatcherStatus) =>
      currentWatcherStatus === urlWatcherStatus ? currentWatcherStatus : urlWatcherStatus
    );
    setSelectedCompliantStatus((currentCompliantStatus) =>
      currentCompliantStatus === urlCompliantStatus ? currentCompliantStatus : urlCompliantStatus
    );
    setSelectedAssetCustodians((currentValues) =>
      currentValues.length === urlAssetCustodians.length &&
      currentValues.every((value, index) => value === urlAssetCustodians[index])
        ? currentValues
        : urlAssetCustodians
    );
    setSearchValue((currentSearchValue) =>
      currentSearchValue === urlSearchValue ? currentSearchValue : urlSearchValue
    );

    const nextAdvancedState = readAdvancedSearchState(searchParams, {
      defaultField: "hostname",
      defaultOperator: "contains",
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
  }, [searchParams]);

  useEffect(() => {
    setSearchParams(
      (currentParams) => {
        const nextParams = new URLSearchParams(currentParams);
        if (selectedRegion) nextParams.set("region", selectedRegion);
        else nextParams.delete("region");
        if (selectedOs) nextParams.set("os", selectedOs);
        else nextParams.delete("os");
        if (selectedWatcherStatus) nextParams.set("watcher_status", selectedWatcherStatus);
        else nextParams.delete("watcher_status");
        if (selectedCompliantStatus) nextParams.set("compliant_status", selectedCompliantStatus);
        else nextParams.delete("compliant_status");
        nextParams.delete("assetCustodian");
        selectedAssetCustodians.forEach((value) => nextParams.append("assetCustodian", value));
        if (searchValue) nextParams.set("search", searchValue);
        else nextParams.delete("search");
        writeAdvancedSearchParams(nextParams, {
          rules: advancedRules,
          join: advancedJoin,
          field: advancedField,
          operator: advancedOperator,
          value: advancedValue,
        });
        return nextParams.toString() === currentParams.toString() ? currentParams : nextParams;
      },
      { replace: true }
    );
  }, [
    advancedField,
      advancedJoin,
      advancedOperator,
      advancedRules,
      advancedValue,
      searchValue,
      selectedAssetCustodians,
      selectedCompliantStatus,
      selectedOs,
      selectedRegion,
      selectedWatcherStatus,
      setSearchParams,
    ]);

  const showErrorModal = (message) => {
    setError(message);
    setOpenErrorModal(true);
  };

  const fetchServerDetails = useCallback(async ({ fresh = false, refresh = false } = {}) => {
    setLoading(true);
    try {
      const response = await API.get("/server-details/fetch-server-details", {
        params: {
          fresh: fresh ? "true" : "false",
          refresh: refresh ? "true" : "false",
        },
      });
      setRows(response.data.server_details || []);
    } catch (err) {
      showErrorModal(err.response?.data?.error_message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServerDetails();
  }, [fetchServerDetails]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const fetchServerDetail = async (row) => {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setSelectedServerDetails(null);
    setInspectorFindingsRequested(false);
    setInspectorFindingsLoading(false);

    try {
      const [detailResponse, componentsResponse] = await Promise.all([
        API.get("/server-details/fetch-server-detail", {
          params: {
            region: row.region,
            ip: row.ip,
          },
        }),
        API.get("/components/fetch-components-by-ip", {
          params: {
            region: row.region,
            ip: row.ip,
          },
        }),
      ]);

      setSelectedServerDetails({
        ...(detailResponse.data.server_detail || {}),
        components: componentsResponse.data.components || [],
      });
    } catch (err) {
      setDetailsOpen(false);
      showErrorModal(
        err.response?.data?.error_message ||
          err.response?.data?.detail ||
          "An unexpected error occurred"
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const loadInspectorFindings = async () => {
    if (!selectedServerDetails || inspectorFindingsLoading) return;

    setInspectorFindingsRequested(true);
    setInspectorFindingsLoading(true);
    try {
      const response = await API.get("/server-details/fetch-inspector-findings", {
        params: {
          region: selectedServerDetails.region,
          ip: selectedServerDetails.ip,
        },
      });
      setSelectedServerDetails((current) =>
        current
          ? { ...current, inspector_findings: response.data.inspector_findings || [] }
          : current
      );
    } catch (err) {
      setInspectorFindingsRequested(false);
      showErrorModal(
        err.response?.data?.error_message ||
          err.response?.data?.detail ||
          "An unexpected error occurred"
      );
    } finally {
      setInspectorFindingsLoading(false);
    }
  };

  const openServerMetrics = (row) => {
    setSelectedMetricsServer(row);
    setMetricsOpen(true);
  };

  const handleOpenWatcherActions = (row) => {
    if (!canManageWatcherActions) {
      showErrorModal("You don't have access to manage the watcher");
      return;
    }
    setWatcherActionsTarget(row);
    setWatcherActionsOpen(true);
  };

  const handleCloseWatcherActions = () => {
    setWatcherActionsOpen(false);
  };

  const handleWatcherConfigured = () => {
    setActionSnackbar({ severity: "success", message: "Watcher configuration applied." });
    fetchServerDetails({ fresh: true });
  };

  const uniqueRegions = useMemo(
    () => [...new Set(rows.map((row) => row.region))].filter(Boolean).sort(),
    [rows]
  );

  const uniqueOsValues = useMemo(
    () => [...new Set(rows.map((row) => row.os))].filter(Boolean).sort(),
    [rows]
  );

  const uniqueWatcherStatuses = useMemo(
    () => [...new Set(rows.map((row) => row.watcher_status))].filter(Boolean).sort(),
    [rows]
  );

  const uniqueCompliantStatuses = useMemo(
    () => [...new Set(rows.map((row) => row.compliant_status))].filter(Boolean).sort(),
    [rows]
  );

  const uniqueAssetCustodians = useMemo(
    () => [...new Set(rows.map((row) => row.asset_custodian))].filter(Boolean).sort(),
    [rows]
  );

  const tagValuesByKey = useMemo(() => {
    const valuesByKey = {};
    rows.forEach((row) => {
      Object.entries(row.tags || {}).forEach(([key, value]) => {
        if (!key || !value) return;
        if (!valuesByKey[key]) valuesByKey[key] = new Set();
        valuesByKey[key].add(value);
      });
    });
    return valuesByKey;
  }, [rows]);

  const uniqueTagKeys = useMemo(
    () => Object.keys(tagValuesByKey).sort(),
    [tagValuesByKey]
  );

  const formatStatusLabel = (value) => {
    if (!value) return "N/A";
    return String(value)
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  const getUptimeSeconds = useCallback(
    (bootTime) => {
      if (Number(bootTime) === 0 || !bootTime) return null;

      const bootMs = Number(bootTime) * 1000;
      if (Number.isNaN(bootMs)) return null;

      return Math.max(0, Math.floor((nowMs - bootMs) / 1000));
    },
    [nowMs]
  );

  const advancedFields = useMemo(
    () => [
      {
        value: "region",
        label: "Region",
        type: "enum",
        options: uniqueRegions.map((region) => ({ value: region, label: region })),
      },
      { value: "hostname", label: "Hostname", type: "text" },
      { value: "ip", label: "IP Address", type: "text" },
      {
        value: "os",
        label: "OS",
        type: "enum",
        options: uniqueOsValues.map((osValue) => ({ value: osValue, label: osValue })),
      },
      {
        value: "watcher_status",
        label: "Watcher Status",
        type: "enum",
        options: uniqueWatcherStatuses.map((status) => ({
          value: status,
          label: formatStatusLabel(status),
        })),
      },
      {
        value: "compliant_status",
        label: "Compliant Status",
        type: "enum",
        options: uniqueCompliantStatuses.map((status) => ({
          value: status,
          label: formatStatusLabel(status),
        })),
      },
      {
        value: "uptime",
        label: "Uptime",
        type: "number",
      },
      ...uniqueTagKeys.map((tagKey) => ({
        value: `tag:${tagKey}`,
        label: tagKey,
        type: "enum",
        group: "Tags",
        options: [...(tagValuesByKey[tagKey] || [])]
          .sort()
          .map((tagValue) => ({ value: tagValue, label: tagValue })),
      })),
    ],
    [
      tagValuesByKey,
      uniqueCompliantStatuses,
      uniqueOsValues,
      uniqueRegions,
      uniqueTagKeys,
      uniqueWatcherStatuses,
    ]
  );

  const advancedFieldMap = useMemo(() => buildAdvancedFieldMap(advancedFields), [advancedFields]);
  const selectedAdvancedFieldConfig =
    advancedFieldMap[advancedField] || advancedFields[0] || null;
  const selectedAdvancedOperatorOptions = getAdvancedOperatorOptions(selectedAdvancedFieldConfig);

  const hostDetailsColumns = useMemo(() => {
    const actionsColumn = HOST_DETAILS_DEFAULT_COLUMNS.find((column) => column.key === "actions");
    const baseColumns = HOST_DETAILS_DEFAULT_COLUMNS.filter((column) => column.key !== "actions");
    const tagColumns = uniqueTagKeys.map((tagKey) => ({
      key: `tag:${tagKey}`,
      label: tagKey,
      hiddenByDefault: true,
    }));
    return [...baseColumns, ...tagColumns, actionsColumn];
  }, [uniqueTagKeys]);

  const {
    chooserColumns,
    visibleColumns,
    toggleColumn,
    reorderColumns,
    resetToDefault,
  } = useTableColumns("host_details", hostDetailsColumns);
  const columnOrder = useMemo(() => visibleColumns.map((column) => column.key), [visibleColumns]);

  const filteredRows = useMemo(() => {
    let filtered = rows;

    if (searchValue) {
      const term = searchValue.toLowerCase();
      filtered = filtered.filter(
        (row) =>
          row.region?.toLowerCase().includes(term) ||
          row.hostname?.toLowerCase().includes(term) ||
          row.ip?.toLowerCase().includes(term) ||
          row.os?.toLowerCase().includes(term) ||
          row.watcher_status?.toLowerCase().includes(term) ||
          row.compliant_status?.toLowerCase().includes(term)
      );
    }

    if (selectedRegion) {
      filtered = filtered.filter(
        (row) => row.region?.toLowerCase() === selectedRegion.toLowerCase()
      );
    }

    if (selectedOs) {
      filtered = filtered.filter((row) => row.os?.toLowerCase() === selectedOs.toLowerCase());
    }

    if (selectedWatcherStatus) {
      filtered = filtered.filter(
        (row) =>
          String(row.watcher_status || "").toLowerCase() ===
          selectedWatcherStatus.toLowerCase()
      );
    }

    if (selectedCompliantStatus) {
      filtered = filtered.filter(
        (row) =>
          String(row.compliant_status || "").toLowerCase() ===
          selectedCompliantStatus.toLowerCase()
      );
    }

    if (selectedAssetCustodians.length) {
      filtered = filtered.filter((row) => selectedAssetCustodians.includes(row.asset_custodian));
    }

    if (advancedRules.length) {
      filtered = filtered.filter((row) =>
        applyAdvancedRules(row, advancedRules, advancedFieldMap, (item, field) => {
          if (field.startsWith("tag:")) {
            return item.tags?.[field.slice(4)] ?? "";
          }
          switch (field) {
            case "uptime":
              return getUptimeSeconds(item.boot_time);
            default:
              return String(item[field] ?? "").trim();
          }
        })
      );
    }

    return filtered;
  }, [
    advancedFieldMap,
    advancedRules,
    getUptimeSeconds,
    rows,
    searchValue,
    selectedAssetCustodians,
    selectedCompliantStatus,
    selectedOs,
    selectedRegion,
    selectedWatcherStatus,
  ]);

  const sortedRows = useMemo(() => {
    const getComparableValue = (row, column) => {
      switch (column) {
        case "region":
          return row.region || "";
        case "hostname":
          return row.hostname || "";
        case "ip":
          return row.ip || "";
        case "os":
          return row.os || "";
        case "watcher_status":
          return formatStatusLabel(row.watcher_status);
        case "compliant_status":
          return formatStatusLabel(row.compliant_status);
        case "watcher_configured_component_count":
          return Number(row.watcher_configured_component_count ?? 0);
        case "tool_component_count":
          return Number(row.tool_component_count ?? 0);
        case "job_component_count":
          return Number(row.job_component_count ?? 0);
        case "component_category_count":
          return Number(row.component_category_count ?? 0);
        case "total_component_count":
          return Number(row.total_component_count ?? 0);
        default:
          if (column.startsWith("tag:")) {
            return row.tags?.[column.slice(4)] ?? "";
          }
          return "";
      }
    };

    const compareRows = (leftRow, rightRow) => {
      if (sortBy === "uptime") {
        const leftBootTime = Number(leftRow.boot_time);
        const rightBootTime = Number(rightRow.boot_time);

        const leftDuration =
          leftBootTime > 0 && !Number.isNaN(leftBootTime) ? nowMs - leftBootTime * 1000 : null;
        const rightDuration =
          rightBootTime > 0 && !Number.isNaN(rightBootTime) ? nowMs - rightBootTime * 1000 : null;

        if (leftDuration === null && rightDuration === null) return 0;
        if (leftDuration === null) return 1;
        if (rightDuration === null) return -1;

        return leftDuration - rightDuration;
      }

      if (
        sortBy === "watcher_configured_component_count" ||
        sortBy === "tool_component_count" ||
        sortBy === "job_component_count" ||
        sortBy === "component_category_count" ||
        sortBy === "total_component_count"
      ) {
        return getComparableValue(leftRow, sortBy) - getComparableValue(rightRow, sortBy);
      }

      const leftValue = String(getComparableValue(leftRow, sortBy)).toLowerCase();
      const rightValue = String(getComparableValue(rightRow, sortBy)).toLowerCase();
      return leftValue.localeCompare(rightValue, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    };

    const multiplier = sortDirection === "asc" ? 1 : -1;

    return [...filteredRows].sort((leftRow, rightRow) => {
      const result = compareRows(leftRow, rightRow);
      if (result !== 0) {
        return result * multiplier;
      }

      return String(leftRow.ip || "").localeCompare(String(rightRow.ip || ""));
    });
  }, [filteredRows, nowMs, sortBy, sortDirection]);

  const paginatedRows = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return sortedRows.slice(startIndex, startIndex + rowsPerPage);
  }, [page, rowsPerPage, sortedRows]);

  const handleChangePage = (_event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRegionChange = (event) => {
    setSelectedRegion(event.target.value);
    setPage(0);
  };

  const handleOsChange = (event) => {
    setSelectedOs(event.target.value);
    setPage(0);
  };

  const handleWatcherStatusChange = (event) => {
    setSelectedWatcherStatus(event.target.value);
    setPage(0);
  };

  const handleCompliantStatusChange = (event) => {
    setSelectedCompliantStatus(event.target.value);
    setPage(0);
  };

  const handleAssetCustodianChange = (event) => {
    const { value } = event.target;
    const values = typeof value === "string" ? value.split(",") : value;
    setSelectedAssetCustodians(values.includes("") ? [] : values);
    setPage(0);
  };

  const handleSearchChange = (event) => {
    setSearchValue(event.target.value);
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
    if (!fieldConfig) {
      return;
    }

    const operatorNeedsValue = !["is_empty", "is_not_empty"].includes(advancedOperator);
    const trimmedValue = String(overrideValue || "").trim();

    if (operatorNeedsValue && !trimmedValue) {
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

  const clearFilters = () => {
    setSelectedRegion("");
    setSelectedOs("");
    setSelectedWatcherStatus("");
    setSelectedCompliantStatus("");
    setSelectedAssetCustodians([]);
    setSearchValue("");
    setAdvancedRules([]);
    setAdvancedJoin("AND");
    setAdvancedField("hostname");
    setAdvancedOperator("contains");
    setAdvancedValue("");
    setPage(0);
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc"
      );
      return;
    }

    setSortBy(column);
    setSortDirection("asc");
  };

  const copyToClipboard = (text) => {
    if (!text) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
      return;
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
  };

  const formatUptime = (bootTime) => {
    if (Number(bootTime) === 0) return "Stopped";
    if (!bootTime) return "N/A";
    const bootMs = Number(bootTime) * 1000;
    if (Number.isNaN(bootMs)) return "N/A";

    const diffMs = Math.max(0, nowMs - bootMs);
    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const hostDetailsExportValueGetters = {
    region: (row) => row.region || "N/A",
    hostname: (row) => row.hostname || "N/A",
    ip: (row) => row.ip || "N/A",
    os: (row) => row.os || "N/A",
    uptime: (row) => formatUptime(row.boot_time),
    watcher_status: (row) => formatStatusLabel(row.watcher_status),
    compliant_status: (row) => formatStatusLabel(row.compliant_status),
    components: (row) =>
      `Watcher: ${Number(row.watcher_configured_component_count ?? 0)}, ` +
      `Tools: ${Number(row.tool_component_count ?? 0)}, ` +
      `Jobs: ${Number(row.job_component_count ?? 0)}, ` +
      `Components: ${Number(row.component_category_count ?? 0)}`,
  };

  const exportToExcel = () => {
    const columnsToExport = visibleColumns.filter((column) => column.key !== "actions");
    const dataToExport = sortedRows.map((row) => {
      const exportRow = {};
      columnsToExport.forEach((column) => {
        if (column.key.startsWith("tag:")) {
          exportRow[column.label] = row.tags?.[column.key.slice(4)] ?? "N/A";
          return;
        }
        const getValue = hostDetailsExportValueGetters[column.key];
        exportRow[column.label] = getValue ? getValue(row) : "";
      });
      return exportRow;
    });
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Server Details");
    XLSX.writeFile(workbook, "server-details.xlsx");
  };

  const hasActiveFilters = Boolean(
    selectedRegion ||
      selectedOs ||
      selectedWatcherStatus ||
      selectedCompliantStatus ||
      selectedAssetCustodians.length ||
      searchValue ||
      advancedRules.length
  );

  return (
    <Box
      ref={wrapperRef}
      sx={{
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        p: 2,
        position: "relative",
      }}
    >
      <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ComputerRoundedIcon sx={{ color: HEADER_ACCENT }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Host Details
          </Typography>
        </Box>

        <Chip
          label={`${filteredRows.length} servers`}
          size="small"
          sx={{
            bgcolor: `rgba(${hexToRgb(HEADER_ACCENT)}, 0.14)`,
            color: HEADER_ACCENT,
            fontWeight: 600,
            borderRadius: 999,
          }}
        />
      </Box>

      <HostDetailsFilterBar
        advancedField={advancedField}
        advancedFields={advancedFields}
        advancedJoin={advancedJoin}
        advancedOperator={advancedOperator}
        advancedOperatorOptions={selectedAdvancedOperatorOptions}
        advancedRuleJoinOptions={ADVANCED_RULE_JOIN_OPTIONS}
        advancedRules={advancedRules}
        advancedValue={advancedValue}
        columnChooserColumns={chooserColumns}
        onToggleColumn={toggleColumn}
        onReorderColumns={reorderColumns}
        onResetColumns={resetToDefault}
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        onAddAdvancedRule={handleAddAdvancedRule}
        onAdvancedFieldChange={handleAdvancedFieldChange}
        onAdvancedJoinChange={(event) => setAdvancedJoin(event.target.value)}
        onAdvancedOperatorChange={(event) => setAdvancedOperator(event.target.value)}
        onAdvancedValueChange={(event) => setAdvancedValue(event.target.value)}
        selectedRegion={selectedRegion}
        selectedOs={selectedOs}
        selectedWatcherStatus={selectedWatcherStatus}
        selectedCompliantStatus={selectedCompliantStatus}
        selectedAssetCustodians={selectedAssetCustodians}
        uniqueRegions={uniqueRegions}
        uniqueOsValues={uniqueOsValues}
        uniqueWatcherStatuses={uniqueWatcherStatuses}
        uniqueCompliantStatuses={uniqueCompliantStatuses}
        uniqueAssetCustodians={uniqueAssetCustodians}
        onRegionChange={handleRegionChange}
        onOsChange={handleOsChange}
        onWatcherStatusChange={handleWatcherStatusChange}
        onCompliantStatusChange={handleCompliantStatusChange}
        onAssetCustodianChange={handleAssetCustodianChange}
        showClearFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        onRemoveAdvancedRule={handleRemoveAdvancedRule}
        onExportToExcel={exportToExcel}
        onRefreshFromDb={() => fetchServerDetails({ fresh: true })}
        onRefreshFromAws={() => fetchServerDetails({ fresh: true, refresh: true })}
        loading={loading}
        formatStatusLabel={formatStatusLabel}
      />

      <HostDetailsTable
        columnOrder={columnOrder}
        error={error}
        formatStatusLabel={formatStatusLabel}
        formatUptime={formatUptime}
        getCompliantStatusConfig={getCompliantStatusConfig}
        getOsConfig={getOsConfig}
        getWatcherStatusConfig={getWatcherStatusConfig}
        hasActiveFilters={hasActiveFilters}
        loading={loading}
        onChangePage={handleChangePage}
        onChangeRowsPerPage={handleChangeRowsPerPage}
        onCopyToClipboard={copyToClipboard}
        onOpenDetails={fetchServerDetail}
        onOpenMetrics={openServerMetrics}
        onWatcherActions={handleOpenWatcherActions}
        canManageWatcherActions={canManageWatcherActions}
        onSort={handleSort}
        page={page}
        paginatedRows={paginatedRows}
        rowsPerPage={rowsPerPage}
        sortBy={sortBy}
        sortDirection={sortDirection}
        totalCount={sortedRows.length}
      />

      <ErrorModal
        wrapperRef={wrapperRef}
        open={openErrorModal}
        error={error}
        onClose={() => setOpenErrorModal(false)}
      />

      <HostDetailsDetailsModal
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedServerDetails(null);
        }}
        data={selectedServerDetails}
        loading={detailsLoading}
        inspectorFindingsRequested={inspectorFindingsRequested}
        inspectorFindingsLoading={inspectorFindingsLoading}
        onLoadInspectorFindings={loadInspectorFindings}
      />

      <HostDetailsMetricsModal
        open={metricsOpen}
        row={selectedMetricsServer}
        onClose={() => {
          setMetricsOpen(false);
          setSelectedMetricsServer(null);
        }}
      />

      <WatcherActionsModal
        open={watcherActionsOpen}
        row={watcherActionsTarget}
        onClose={handleCloseWatcherActions}
        onApplied={handleWatcherConfigured}
      />

      <Snackbar
        open={Boolean(actionSnackbar)}
        autoHideDuration={5000}
        onClose={() => setActionSnackbar(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {actionSnackbar ? (
          <Alert severity={actionSnackbar.severity} onClose={() => setActionSnackbar(null)} variant="filled">
            {actionSnackbar.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}

export default HostDetails;
