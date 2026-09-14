import { useState, useMemo, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { Box, Chip, Typography } from "@mui/material";
import MonitorHeartRoundedIcon from "@mui/icons-material/MonitorHeartRounded";
import { useNavigate, useSearchParams } from "react-router-dom";

import ErrorModal from "../../modals/ErrorModal";
import { API } from "../../services/auth";
import useStatusWebSocket from "./useStatusWebSocket";
import { formatStatusLabel } from "./statusChipUtils";
import WatcherStatusDetailsModal from "./WatcherStatusDetailsModal";
import WatcherStatusFilterBar from "./WatcherStatusFilterBar";
import WatcherStatusMetricsModal from "./WatcherStatusMetricsModal";
import WatcherStatusTable, { WATCHER_STATUS_DEFAULT_COLUMNS } from "./WatcherStatusTable";
import useTableColumns from "../../hooks/useTableColumns";
import hexToRgb from "../shared/hexToRgb";
import {
  areAdvancedRulesEqual,
  readAdvancedSearchState,
  writeAdvancedSearchParams,
} from "../shared/advancedSearchUtils";

const HEADER_ACCENT = "#FF6B35";

function sanitizeId(key) {
  return `comp-row-${encodeURIComponent(key).replace(/%/g, "")}`;
}

function normalizeMetricComponentName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

const ADVANCED_OPERATORS = {
  text: [
    { value: "contains", label: "Contains" },
    { value: "equals", label: "Equals" },
    { value: "starts_with", label: "Starts With" },
    { value: "ends_with", label: "Ends With" },
    { value: "not_contains", label: "Does Not Contain" },
    { value: "not_equals", label: "Does Not Equal" },
    { value: "is_empty", label: "Is Empty" },
    { value: "is_not_empty", label: "Is Not Empty" },
  ],
  enum: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Does Not Equal" },
    { value: "contains", label: "Contains" },
  ],
  number: [
    { value: "equals", label: "Equals" },
    { value: "gt", label: "Greater Than" },
    { value: "gte", label: "Greater Than or Equal" },
    { value: "lt", label: "Less Than" },
    { value: "lte", label: "Less Than or Equal" },
    { value: "is_empty", label: "Is Empty" },
    { value: "is_not_empty", label: "Is Not Empty" },
  ],
};

const ADVANCED_RULE_JOIN_OPTIONS = [
  { value: "AND", label: "AND" },
  { value: "OR", label: "OR" },
  { value: "NOT", label: "NOT" },
];

function WatcherStatus() {
  const wrapperRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data, error, refreshOnce, hasFirstPayload } = useStatusWebSocket();
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [selectedComponentDetails, setSelectedComponentDetails] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [metricsModalOpen, setMetricsModalOpen] = useState(false);
  const [metricsComponent, setMetricsComponent] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [modalErrorOpen, setModalErrorOpen] = useState(false);

  const [debouncedLoading, setDebouncedLoading] = useState(!hasFirstPayload && !error);
  useEffect(() => {
    const target = !hasFirstPayload && !error;
    const timer = setTimeout(() => setDebouncedLoading(target), target ? 0 : 150);
    return () => clearTimeout(timer);
  }, [hasFirstPayload, error]);

  // The WebSocket payload has no asset_custodian, so it's cross-referenced
  // client-side against the component list, which already inherits it from
  // the host (joined server-side by region/ip).
  const [assetCustodianByKey, setAssetCustodianByKey] = useState({});
  useEffect(() => {
    let cancelled = false;
    API.get("/components/fetch-components")
      .then((response) => {
        if (cancelled) return;
        const map = {};
        (response.data.components || []).forEach((component) => {
          if (!component.region || !component.ip) return;
          map[`${component.region}:${component.ip}`] = component.asset_custodian || null;
        });
        setAssetCustodianByKey(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const [selectedRegion, setSelectedRegion] = useState(searchParams.get("region") || "");
  const [selectedProcessStatus, setSelectedProcessStatus] = useState(
    searchParams.get("processStatus") || ""
  );
  const [selectedPortStatus, setSelectedPortStatus] = useState(
    searchParams.get("portStatus") || ""
  );
  const [selectedAssetCustodians, setSelectedAssetCustodians] = useState(
    searchParams.getAll("assetCustodian")
  );
  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");
  const initialAdvancedState = readAdvancedSearchState(searchParams, {
    defaultField: "name",
    defaultOperator: "contains",
  });
  const [advancedRules, setAdvancedRules] = useState(initialAdvancedState.rules);
  const [advancedJoin, setAdvancedJoin] = useState(initialAdvancedState.join);
  const [advancedField, setAdvancedField] = useState(initialAdvancedState.field);
  const [advancedOperator, setAdvancedOperator] = useState(initialAdvancedState.operator);
  const [advancedValue, setAdvancedValue] = useState(initialAdvancedState.value);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState("uptime_seconds");
  const [sortDirection, setSortDirection] = useState("asc");

  const items = useMemo(() => {
    const list = Object.values(data || {});
    return list.map((item) => {
      const port =
        Number(item.listen ?? item.listen_port ?? item?.config_meta?.port ?? 0) || 0;
      const processStatus = String(item.state || "").toLowerCase();
      const portStatusRaw = String(item.port_status || "").toLowerCase();
      const portStatusDisplay = port === 0 ? "not_available" : portStatusRaw;

      const key = `${item.ip ?? item.server_ip}:${item.component}`;
      const region = item.region || "";
      const ip = item.ip ?? item.server_ip ?? "";
      return {
        key,
        domId: sanitizeId(key),
        region,
        ip,
        name: item.component || "",
        metricComponent: normalizeMetricComponentName(item.component || ""),
        process_status: processStatus,
        port_status: portStatusRaw,
        port_status_display: portStatusDisplay,
        port,
        uptime_seconds: Number(item.uptime_seconds ?? 0),
        asset_custodian: assetCustodianByKey[`${region}:${ip}`] || null,
      };
    });
  }, [data, assetCustodianByKey]);

  const showModalError = (message) => {
    setModalError(message);
    setModalErrorOpen(true);
  };

  const uniqueRegions = useMemo(
    () => [...new Set(items.map((item) => item.region))].filter(Boolean).sort(),
    [items]
  );

  const uniqueProcessStatuses = useMemo(
    () => [...new Set(items.map((item) => item.process_status))].filter(Boolean).sort(),
    [items]
  );

  const uniquePortStatuses = useMemo(
    () => [...new Set(items.map((item) => item.port_status_display))].filter(Boolean).sort(),
    [items]
  );

  const uniqueAssetCustodians = useMemo(
    () => [...new Set(items.map((item) => item.asset_custodian))].filter(Boolean).sort(),
    [items]
  );

  const advancedFields = useMemo(
    () => [
      {
        value: "region",
        label: "Region",
        type: "enum",
        options: uniqueRegions.map((region) => ({ value: region, label: region })),
      },
      {
        value: "ip",
        label: "IP Address",
        type: "text",
      },
      {
        value: "name",
        label: "Component Name",
        type: "text",
      },
      {
        value: "process_status",
        label: "Process Status",
        type: "enum",
        options: uniqueProcessStatuses.map((status) => ({
          value: status,
          label: formatStatusLabel(status),
        })),
      },
      {
        value: "port_status_display",
        label: "Port Status",
        type: "enum",
        options: uniquePortStatuses.map((status) => ({
          value: status,
          label: formatStatusLabel(status),
        })),
      },
      {
        value: "uptime_seconds",
        label: "Uptime Seconds",
        type: "number",
      },
    ],
    [uniquePortStatuses, uniqueProcessStatuses, uniqueRegions]
  );

  const advancedFieldMap = useMemo(
    () =>
      advancedFields.reduce((accumulator, field) => {
        accumulator[field.value] = field;
        return accumulator;
      }, {}),
    [advancedFields]
  );

  const selectedAdvancedFieldConfig =
    advancedFieldMap[advancedField] || advancedFields[0] || null;

  const selectedAdvancedOperatorOptions = selectedAdvancedFieldConfig
    ? ADVANCED_OPERATORS[selectedAdvancedFieldConfig.type] || ADVANCED_OPERATORS.text
    : ADVANCED_OPERATORS.text;

  const {
    chooserColumns,
    visibleColumns,
    toggleColumn,
    reorderColumns,
    resetToDefault,
  } = useTableColumns("watcher_status", WATCHER_STATUS_DEFAULT_COLUMNS);
  const columnOrder = useMemo(() => visibleColumns.map((column) => column.key), [visibleColumns]);

  useEffect(() => {
    const urlRegion = searchParams.get("region") || "";
    const urlProcessStatus = searchParams.get("processStatus") || "";
    const urlPortStatus = searchParams.get("portStatus") || "";
    const urlAssetCustodians = searchParams.getAll("assetCustodian");
    const urlSearchValue = searchParams.get("search") || "";
    const urlName = searchParams.get("name") || "";
    const urlIp = searchParams.get("ip") || "";

    setSelectedRegion((currentRegion) => (currentRegion === urlRegion ? currentRegion : urlRegion));
    setSelectedProcessStatus((currentProcessStatus) =>
      currentProcessStatus === urlProcessStatus ? currentProcessStatus : urlProcessStatus
    );
    setSelectedPortStatus((currentPortStatus) =>
      currentPortStatus === urlPortStatus ? currentPortStatus : urlPortStatus
    );
    setSelectedAssetCustodians((currentValues) =>
      currentValues.length === urlAssetCustodians.length &&
      currentValues.every((value, index) => value === urlAssetCustodians[index])
        ? currentValues
        : urlAssetCustodians
    );

    // Deep links from Component DB ("Open in Watcher Status") pass ip/name
    // directly rather than the free-text search box - route those through
    // the advanced filter as precise per-field rules instead of the old
    // behaviour of cramming both values into the plain search box, now that
    // advanced search can filter by IP and name individually.
    if (urlName || urlIp) {
      const nextRules = [];
      if (urlIp) {
        nextRules.push({
          id: `ip-equals-${nextRules.length}`,
          join: "AND",
          field: "ip",
          operator: "equals",
          value: urlIp,
        });
      }
      if (urlName) {
        nextRules.push({
          id: `name-equals-${nextRules.length}`,
          join: "AND",
          field: "name",
          operator: "equals",
          value: urlName,
        });
      }

      setSearchValue((currentSearchValue) => (currentSearchValue === "" ? currentSearchValue : ""));
      setAdvancedRules((currentRules) =>
        areAdvancedRulesEqual(currentRules, nextRules) ? currentRules : nextRules
      );
      return;
    }

    setSearchValue((currentSearchValue) =>
      currentSearchValue === urlSearchValue ? currentSearchValue : urlSearchValue
    );

    const nextAdvancedState = readAdvancedSearchState(searchParams, {
      defaultField: "name",
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
        if (selectedProcessStatus) nextParams.set("processStatus", selectedProcessStatus);
        else nextParams.delete("processStatus");
        if (selectedPortStatus) nextParams.set("portStatus", selectedPortStatus);
        else nextParams.delete("portStatus");
        nextParams.delete("assetCustodian");
        selectedAssetCustodians.forEach((value) => nextParams.append("assetCustodian", value));
        if (searchValue) nextParams.set("search", searchValue);
        else nextParams.delete("search");
        nextParams.delete("name");
        nextParams.delete("ip");
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
      selectedPortStatus,
      selectedProcessStatus,
      selectedRegion,
      setSearchParams,
    ]);

  const getWatcherFieldValue = (item, field) => {
    if (field === "uptime_seconds") {
      return Number(item.uptime_seconds ?? 0);
    }

    return String(item[field] ?? "").trim();
  };

  const doesWatcherRuleMatch = (item, rule) => {
    const fieldConfig = advancedFieldMap[rule.field];
    if (!fieldConfig) {
      return true;
    }

    const rawValue = getWatcherFieldValue(item, rule.field);
    const normalizedRuleValue = String(rule.value ?? "").trim().toLowerCase();

    if (fieldConfig.type === "number") {
      if (rule.operator === "is_empty") {
        return rawValue === null || rawValue === undefined || Number.isNaN(Number(rawValue));
      }
      if (rule.operator === "is_not_empty") {
        return rawValue !== null && rawValue !== undefined && !Number.isNaN(Number(rawValue));
      }

      const numericFieldValue = Number(rawValue);
      const numericRuleValue = Number(rule.value);
      if (Number.isNaN(numericFieldValue) || Number.isNaN(numericRuleValue)) {
        return false;
      }

      switch (rule.operator) {
        case "equals":
          return numericFieldValue === numericRuleValue;
        case "gt":
          return numericFieldValue > numericRuleValue;
        case "gte":
          return numericFieldValue >= numericRuleValue;
        case "lt":
          return numericFieldValue < numericRuleValue;
        case "lte":
          return numericFieldValue <= numericRuleValue;
        default:
          return false;
      }
    }

    const normalizedFieldValue = String(rawValue).toLowerCase();

    switch (rule.operator) {
      case "contains":
        return normalizedFieldValue.includes(normalizedRuleValue);
      case "equals":
        return normalizedFieldValue === normalizedRuleValue;
      case "starts_with":
        return normalizedFieldValue.startsWith(normalizedRuleValue);
      case "ends_with":
        return normalizedFieldValue.endsWith(normalizedRuleValue);
      case "not_contains":
        return !normalizedFieldValue.includes(normalizedRuleValue);
      case "not_equals":
        return normalizedFieldValue !== normalizedRuleValue;
      case "is_empty":
        return normalizedFieldValue.length === 0;
      case "is_not_empty":
        return normalizedFieldValue.length > 0;
      default:
        return false;
    }
  };

  const applyAdvancedRules = (item) => {
    if (!advancedRules.length) {
      return true;
    }

    return advancedRules.reduce((result, rule, index) => {
      const nextResult = doesWatcherRuleMatch(item, rule);

      if (index === 0) {
        return nextResult;
      }

      switch (rule.join) {
        case "OR":
          return result || nextResult;
        case "NOT":
          return result && !nextResult;
        case "AND":
        default:
          return result && nextResult;
      }
    }, true);
  };

  const filteredItems = useMemo(() => {
    let filtered = [...items];

    if (searchValue) {
      const searchLower = searchValue.toLowerCase();
      const searchTerms = searchLower.split(" ").filter((term) => term.length > 0);

      filtered = filtered.filter((item) => {
        if (searchTerms.length > 1) {
          return searchTerms.every(
            (term) =>
              item.region.toLowerCase().includes(term) ||
              item.ip.toLowerCase().includes(term) ||
              item.name.toLowerCase().includes(term) ||
              item.process_status.toLowerCase().includes(term) ||
              item.port_status_display.toLowerCase().includes(term)
          );
        }

        return (
          item.region.toLowerCase().includes(searchLower) ||
          item.ip.toLowerCase().includes(searchLower) ||
          item.name.toLowerCase().includes(searchLower) ||
          item.process_status.toLowerCase().includes(searchLower) ||
          item.port_status_display.toLowerCase().includes(searchLower)
        );
      });
    }

    if (selectedRegion) {
      filtered = filtered.filter((item) => item.region === selectedRegion);
    }

    if (selectedProcessStatus) {
      filtered = filtered.filter((item) => item.process_status === selectedProcessStatus);
    }

    if (selectedPortStatus) {
      filtered = filtered.filter((item) => item.port_status_display === selectedPortStatus);
    }

    if (selectedAssetCustodians.length) {
      filtered = filtered.filter((item) => selectedAssetCustodians.includes(item.asset_custodian));
    }

    if (advancedRules.length) {
      filtered = filtered.filter(applyAdvancedRules);
    }

    return filtered;
  }, [
    advancedRules,
    items,
    searchValue,
    selectedAssetCustodians,
    selectedPortStatus,
    selectedProcessStatus,
    selectedRegion,
  ]);

  const sortedItems = useMemo(() => {
    const getComparableValue = (item, column) => {
      switch (column) {
        case "region":
          return item.region || "";
        case "ip":
          return item.ip || "";
        case "name":
          return item.name || "";
        case "process_status":
          return item.process_status || "";
        case "port_status_display":
          return item.port_status_display || "";
        case "uptime_seconds":
          return Number(item.uptime_seconds || 0);
        default:
          return "";
      }
    };

    const getStatusPriority = (item) => {
      const processStatus = String(item.process_status || "").toLowerCase();
      const portStatus = String(item.port_status_display || "").toLowerCase();
      const hasWarnLikeStatus =
        processStatus === "warning" ||
        processStatus === "stopped" ||
        portStatus === "warning" ||
        portStatus === "not_listening";
      const isSleeping = processStatus === "sleeping" || portStatus === "sleeping";

      if (hasWarnLikeStatus) {
        return 0;
      }

      if (isSleeping) {
        return 2;
      }

      return 1;
    };

    const multiplier = sortDirection === "asc" ? 1 : -1;
    return [...filteredItems].sort((leftItem, rightItem) => {
      const priorityResult = getStatusPriority(leftItem) - getStatusPriority(rightItem);
      if (priorityResult !== 0) {
        return priorityResult;
      }

      const left = getComparableValue(leftItem, sortBy);
      const right = getComparableValue(rightItem, sortBy);
      if (typeof left === "number" || typeof right === "number") {
        const result = Number(left) - Number(right);
        if (result !== 0) return result * multiplier;
      } else {
        const result = String(left).localeCompare(String(right), undefined, {
          numeric: true,
          sensitivity: "base",
        });
        if (result !== 0) return result * multiplier;
      }
      return String(leftItem.ip || "").localeCompare(String(rightItem.ip || ""));
    });
  }, [filteredItems, sortBy, sortDirection]);

  const paginatedItems = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return sortedItems.slice(startIndex, startIndex + rowsPerPage);
  }, [page, rowsPerPage, sortedItems]);

  useEffect(() => {
    const focusKey = searchParams.get("focus");
    if (!focusKey) return;

    const id = sanitizeId(focusKey);
    const timer = setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("row-focus");
        setTimeout(() => element.classList.remove("row-focus"), 2000);
      }
    }, 100);

    const next = new URLSearchParams(searchParams);
    next.delete("focus");
    setSearchParams(next, { replace: true });
    return () => clearTimeout(timer);
  }, [searchParams, setSearchParams, sortedItems]);

  const handleChangePage = (_event, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRegionChange = (event) => {
    setSelectedRegion(event.target.value);
    setPage(0);
  };

  const handleProcessStatusChange = (event) => {
    setSelectedProcessStatus(event.target.value);
    setPage(0);
  };

  const handlePortStatusChange = (event) => {
    setSelectedPortStatus(event.target.value);
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
    const nextOperator = ADVANCED_OPERATORS[nextFieldConfig?.type || "text"][0]?.value || "contains";

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

    if (fieldConfig.type === "number" && operatorNeedsValue && Number.isNaN(Number(trimmedValue))) {
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
    setSelectedProcessStatus("");
    setSelectedPortStatus("");
    setSelectedAssetCustodians([]);
    setSearchValue("");
    setAdvancedRules([]);
    setAdvancedJoin("AND");
    setAdvancedField("name");
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

  const formatUptime = (seconds) => {
    if (!seconds || seconds === 0) return "0s";

    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    const secs = seconds % 60;

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const handleViewDetails = async (component) => {
    setSelectedComponent(component);
    setDetailsModalOpen(true);
    setSelectedComponentDetails(null);
    setDetailsError(null);
    setDetailsLoading(true);

    try {
      const response = await API.get("/component/detail", {
        params: {
          ip: component.ip,
          component: component.name,
        },
      });
      const detail = response.data.component;
      const port = Number(detail.listen ?? detail.listen_port ?? detail?.config_meta?.port ?? 0) || 0;
      const processStatus = String(detail.state || "").toLowerCase();
      const portStatusRaw = String(detail.port_status || "").toLowerCase();
      const portStatusDisplay = port === 0 ? "not_available" : portStatusRaw;

      setSelectedComponentDetails({
        region: detail.region || "",
        ip: detail.ip || "",
        name: detail.component || component.name || "",
        process_status: processStatus,
        port_status_display: portStatusDisplay,
        port,
        uptime_seconds: Number(detail.uptime_seconds ?? 0),
        ts: detail.ts,
        needs_to_run: !!detail.needs_to_run,
        meta: detail.config_meta || {},
      });
    } catch (err) {
      const message =
        err.response?.data?.error_message ||
        err.response?.data?.detail ||
        "An unexpected error occurred";
      setDetailsError(message);
      showModalError(message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseDetailsModal = () => {
    setDetailsModalOpen(false);
    setSelectedComponent(null);
    setSelectedComponentDetails(null);
    setDetailsError(null);
    setDetailsLoading(false);
  };

  const handleOpenMetricsModal = (component) => {
    setMetricsComponent(component);
    setMetricsModalOpen(true);
  };

  const handleOpenHostDetails = (component) => {
    const nextParams = new URLSearchParams();

    if (component?.region) {
      nextParams.set("region", component.region);
    }

    if (component?.ip) {
      nextParams.set("search", component.ip);
    }

    navigate(`/server-details?${nextParams.toString()}`);
  };

  const handleOpenComponentDb = (component) => {
    const nextParams = new URLSearchParams();

    if (component?.region) {
      nextParams.set("region", component.region);
    }

    if (component?.ip) {
      nextParams.set("ip", component.ip);
    }

    if (component?.name) {
      nextParams.set("name", component.name);
    }

    navigate(`/component-db?${nextParams.toString()}`);
  };

  const handleCloseMetricsModal = () => {
    setMetricsModalOpen(false);
    setMetricsComponent(null);
  };

  const watcherStatusExportValueGetters = {
    region: (item) => item.region,
    ip: (item) => item.ip,
    name: (item) => item.name,
    process_status: (item) => item.process_status,
    port_status_display: (item) => item.port_status_display,
    uptime_seconds: (item) => item.uptime_seconds,
  };

  const exportToExcel = () => {
    const columnsToExport = visibleColumns.filter((column) => column.key !== "actions");
    const rows = sortedItems.map((item) => {
      const row = {};
      columnsToExport.forEach((column) => {
        const getValue = watcherStatusExportValueGetters[column.key];
        row[column.label] = getValue ? getValue(item) : "";
      });
      return row;
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ComponentStatus");
    XLSX.writeFile(workbook, "component_status.xlsx");
  };

  const hasActiveFilters = Boolean(
    selectedRegion ||
      selectedProcessStatus ||
      selectedPortStatus ||
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
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <MonitorHeartRoundedIcon sx={{ color: HEADER_ACCENT }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Watcher Status
          </Typography>
        </Box>

        <Chip
          label={`${sortedItems.length} components`}
          size="small"
          sx={{
            bgcolor: `rgba(${hexToRgb(HEADER_ACCENT)}, 0.14)`,
            color: HEADER_ACCENT,
            fontWeight: 600,
            borderRadius: 999,
          }}
        />
      </Box>

      <WatcherStatusFilterBar
        advancedField={advancedField}
        advancedFields={advancedFields}
        advancedJoin={advancedJoin}
        advancedOperator={advancedOperator}
        advancedOperatorOptions={selectedAdvancedOperatorOptions}
        advancedRuleJoinOptions={ADVANCED_RULE_JOIN_OPTIONS}
        advancedRules={advancedRules}
        advancedValue={advancedValue}
        columnChooserColumns={chooserColumns}
        loading={debouncedLoading}
        onAddAdvancedRule={handleAddAdvancedRule}
        onAdvancedFieldChange={handleAdvancedFieldChange}
        onAdvancedJoinChange={(event) => setAdvancedJoin(event.target.value)}
        onAdvancedOperatorChange={(event) => setAdvancedOperator(event.target.value)}
        onAdvancedValueChange={(event) => setAdvancedValue(event.target.value)}
        onAssetCustodianChange={handleAssetCustodianChange}
        onClearFilters={clearFilters}
        onExportToExcel={exportToExcel}
        onPortStatusChange={handlePortStatusChange}
        onProcessStatusChange={handleProcessStatusChange}
        onRemoveAdvancedRule={handleRemoveAdvancedRule}
        onReorderColumns={reorderColumns}
        onResetColumns={resetToDefault}
        onRefresh={refreshOnce}
        onRegionChange={handleRegionChange}
        onSearchChange={handleSearchChange}
        onToggleColumn={toggleColumn}
        searchValue={searchValue}
        selectedAssetCustodians={selectedAssetCustodians}
        selectedPortStatus={selectedPortStatus}
        selectedProcessStatus={selectedProcessStatus}
        selectedRegion={selectedRegion}
        showClearFilters={hasActiveFilters}
        uniqueAssetCustodians={uniqueAssetCustodians}
        uniquePortStatuses={uniquePortStatuses}
        uniqueProcessStatuses={uniqueProcessStatuses}
        uniqueRegions={uniqueRegions}
      />

      <WatcherStatusTable
        columnOrder={columnOrder}
        debouncedLoading={debouncedLoading}
        error={error}
        formatUptime={formatUptime}
        hasActiveFilters={hasActiveFilters}
        onChangePage={handleChangePage}
        onChangeRowsPerPage={handleChangeRowsPerPage}
        onOpenDetails={handleViewDetails}
        onOpenComponentDb={handleOpenComponentDb}
        onOpenHostDetails={handleOpenHostDetails}
        onOpenMetrics={handleOpenMetricsModal}
        onSort={handleSort}
        page={page}
        paginatedItems={paginatedItems}
        rowsPerPage={rowsPerPage}
        sortBy={sortBy}
        sortDirection={sortDirection}
        totalCount={sortedItems.length}
      />

      <WatcherStatusDetailsModal
        component={selectedComponentDetails}
        componentLabel={selectedComponent?.name || ""}
        loading={detailsLoading}
        error={detailsError}
        open={detailsModalOpen}
        onClose={handleCloseDetailsModal}
      />

      <WatcherStatusMetricsModal
        open={metricsModalOpen}
        item={metricsComponent}
        onClose={handleCloseMetricsModal}
      />

      <ErrorModal
        wrapperRef={wrapperRef}
        open={modalErrorOpen}
        error={modalError}
        onClose={() => setModalErrorOpen(false)}
      />

      <style>{`
        .row-focus {
          box-shadow: 0 0 0 3px rgba(99,102,241,.6) inset, 0 0 0 1px rgba(99,102,241,1);
          transition: box-shadow .2s ease;
          border-radius: 12px;
        }
      `}</style>
    </Box>
  );
}

export default WatcherStatus;
