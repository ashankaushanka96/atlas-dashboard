import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import { Box, Chip, Menu, MenuItem, Typography } from "@mui/material";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import ComponentActionsModal from "./ComponentActionsModal";
import ComponentDetailsModal from "./ComponentDetailsModal";
import ComponentFilterBar from "./ComponentFilterBar";
import ComponentTable from "./ComponentTable";
import { COMPONENT_TABLE_DEFAULT_COLUMNS } from "./componentTableColumns";
import { getPipelineDisplayLabel } from "./componentDisplayUtils";
import WatcherActionsModal from "../HostDetails/WatcherActionsModal";
import useTableColumns from "../../hooks/useTableColumns";
import { API } from "../../services/auth";
import ErrorModal from "../../modals/ErrorModal";
import { useNavigate, useSearchParams } from "react-router-dom";
import hexToRgb from "../shared/hexToRgb";

const HEADER_ACCENT = "#FF6B35";

const COMPONENT_EXPORT_VALUE_GETTERS = {
  region: (component) => component.region || "N/A",
  ip: (component) => component.ip || "N/A",
  component_name: (component) => component.component_name || "N/A",
  platform: (component) => component.platform || "N/A",
  comp_version: (component) => component.comp_version || "N/A",
  pipeline: (component) => getPipelineDisplayLabel(component),
  watcher: (component) => component.watcher || "N/A",
  release_date: (component) =>
    component.release_date ? new Date(component.release_date).toLocaleDateString() : "N/A",
  comp_path: (component) => component.comp_path || "N/A",
  category: (component) => component.category || "N/A",
};
import authService from "../../services/auth";
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

function ComponentDB() {
  const wrapperRef = useRef(null);
  const navigate = useNavigate();
  const permissions = authService.getPermissions();

  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [openErrorModal, setOpenErrorModal] = useState(false);
  const [cautionOpen, setCautionOpen] = useState(false);
  const [cautionMessage, setCautionMessage] = useState("");
  const [selectedComponentDetails, setSelectedComponentDetails] = useState(null);
  const [componentDetailsOpen, setComponentDetailsOpen] = useState(false);
  const [watcherActionsOpen, setWatcherActionsOpen] = useState(false);
  const [watcherActionsTarget, setWatcherActionsTarget] = useState(null);
  const [watcherActionsSuggestion, setWatcherActionsSuggestion] = useState(null);
  const [componentActionsOpen, setComponentActionsOpen] = useState(false);
  const [componentActionsTarget, setComponentActionsTarget] = useState(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState("region");
  const [sortDirection, setSortDirection] = useState("asc");

  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedRegion, setSelectedRegion] = useState(searchParams.get("region") || "");
  const [selectedPlatform, setSelectedPlatform] = useState(searchParams.get("platform") || "");
  const [selectedPipeline, setSelectedPipeline] = useState(searchParams.get("pipeline") || "");
  const [selectedWatcher, setSelectedWatcher] = useState(searchParams.get("watcher") || "");
  const [selectedAssetCustodians, setSelectedAssetCustodians] = useState(
    searchParams.getAll("assetCustodian")
  );
  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");
  const initialAdvancedState = readAdvancedSearchState(searchParams, {
    defaultField: "component_name",
    defaultOperator: "contains",
  });
  const [advancedRules, setAdvancedRules] = useState(initialAdvancedState.rules);
  const [advancedJoin, setAdvancedJoin] = useState(initialAdvancedState.join);
  const [advancedField, setAdvancedField] = useState(initialAdvancedState.field);
  const [advancedOperator, setAdvancedOperator] = useState(initialAdvancedState.operator);
  const [advancedValue, setAdvancedValue] = useState(initialAdvancedState.value);
  const [startDate, setStartDate] = useState(
    searchParams.get("startDate") ? new Date(searchParams.get("startDate")) : null
  );
  const [endDate, setEndDate] = useState(
    searchParams.get("endDate") ? new Date(searchParams.get("endDate")) : null
  );

  useEffect(() => {
    const urlRegion = searchParams.get("region") || "";
    const urlPlatform = searchParams.get("platform") || "";
    const urlPipeline = searchParams.get("pipeline") || "";
    const urlWatcher = searchParams.get("watcher") || "";
    const urlAssetCustodians = searchParams.getAll("assetCustodian");
    const urlSearch = searchParams.get("search") || "";
    const urlName = searchParams.get("name") || "";
    const urlIp = searchParams.get("ip") || "";
    const urlStartDate = searchParams.get("startDate");
    const urlEndDate = searchParams.get("endDate");

    setSelectedRegion((currentRegion) => (currentRegion === urlRegion ? currentRegion : urlRegion));
    setSelectedPlatform((currentPlatform) =>
      currentPlatform === urlPlatform ? currentPlatform : urlPlatform
    );
    setSelectedPipeline((currentPipeline) =>
      currentPipeline === urlPipeline ? currentPipeline : urlPipeline
    );
    setSelectedWatcher((currentWatcher) =>
      currentWatcher === urlWatcher ? currentWatcher : urlWatcher
    );
    setSelectedAssetCustodians((currentValues) =>
      currentValues.length === urlAssetCustodians.length &&
      currentValues.every((value, index) => value === urlAssetCustodians[index])
        ? currentValues
        : urlAssetCustodians
    );
    // Deep links from Watcher Status ("Open in Component DB") pass ip/name
    // directly rather than the free-text search box - route those through
    // the advanced filter as precise per-field rules instead of the old
    // behaviour of cramming both values into the plain search box, now that
    // advanced search can filter by IP and Component Name individually.
    const urlHasDeepLinkFilter = Boolean(urlName || urlIp);
    if (urlHasDeepLinkFilter) {
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
          id: `component_name-equals-${nextRules.length}`,
          join: "AND",
          field: "component_name",
          operator: "equals",
          value: urlName,
        });
      }

      setSearchValue((currentSearchValue) => (currentSearchValue === "" ? currentSearchValue : ""));
      setAdvancedRules((currentRules) =>
        areAdvancedRulesEqual(currentRules, nextRules) ? currentRules : nextRules
      );
    } else {
      setSearchValue((currentSearchValue) =>
        currentSearchValue === urlSearch ? currentSearchValue : urlSearch
      );
    }

    const nextStartDate = urlStartDate ? new Date(urlStartDate) : null;
    const nextEndDate = urlEndDate ? new Date(urlEndDate) : null;

    setStartDate((currentStartDate) =>
      (currentStartDate?.getTime() || null) === (nextStartDate?.getTime() || null)
        ? currentStartDate
        : nextStartDate
    );
    setEndDate((currentEndDate) =>
      (currentEndDate?.getTime() || null) === (nextEndDate?.getTime() || null)
        ? currentEndDate
        : nextEndDate
    );

    // Skip the generic adv_rules URL sync when we just derived rules from
    // the ip/name deep-link above - there's no adv_rules param in that
    // case, so this would otherwise immediately wipe them back out.
    if (urlHasDeepLinkFilter) {
      return;
    }

    const nextAdvancedState = readAdvancedSearchState(searchParams, {
      defaultField: "component_name",
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
        if (selectedPlatform) nextParams.set("platform", selectedPlatform);
        else nextParams.delete("platform");
        if (selectedPipeline) nextParams.set("pipeline", selectedPipeline);
        else nextParams.delete("pipeline");
        if (selectedWatcher) nextParams.set("watcher", selectedWatcher);
        else nextParams.delete("watcher");
        nextParams.delete("assetCustodian");
        selectedAssetCustodians.forEach((value) => nextParams.append("assetCustodian", value));
        if (searchValue) nextParams.set("search", searchValue);
        else nextParams.delete("search");
        nextParams.delete("name");
        nextParams.delete("ip");
        if (startDate) nextParams.set("startDate", startDate.toISOString().split("T")[0]);
        else nextParams.delete("startDate");
        if (endDate) nextParams.set("endDate", endDate.toISOString().split("T")[0]);
        else nextParams.delete("endDate");
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
      endDate,
      searchValue,
      selectedAssetCustodians,
      selectedPipeline,
      selectedPlatform,
      selectedRegion,
      selectedWatcher,
      startDate,
      setSearchParams,
    ]);

  const showErrorModal = (message) => {
    setError(message);
    setOpenErrorModal(true);
  };

  const fetchComponents = useCallback(async (fresh = false) => {
    setLoading(true);
    try {
      const response = await API.get("/components/fetch-components", {
        params: { fresh: fresh ? "true" : "false" },
      });
      setComponents(response.data.components);
    } catch (err) {
      showErrorModal(err.response?.data?.error_message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  const handleDeleteSelectedComponent = async () => {
    if (!selectedComponent) return;

    setContextMenu(null);
    setLoading(true);

    try {
      await API.delete("/components/delete-component", {
        data: selectedComponent,
      });
    } catch (err) {
      showErrorModal(err.response?.data?.error_message || "An unexpected error occurred");
    } finally {
      setContextMenu(null);
      setSelectedComponent(null);
      fetchComponents(true);
    }
  };

  const uniqueRegions = useMemo(
    () => [...new Set(components.map((component) => component.region))].filter(Boolean).sort(),
    [components]
  );

  const uniquePlatforms = useMemo(
    () => [...new Set(components.map((component) => component.platform))].filter(Boolean).sort(),
    [components]
  );

  const uniquePipelines = useMemo(
    () => [...new Set(components.map((component) => component.pipeline))].filter(Boolean).sort(),
    [components]
  );

  const uniqueWatchers = useMemo(
    () => [...new Set(components.map((component) => component.watcher))].filter(Boolean).sort(),
    [components]
  );

  const uniqueIps = useMemo(
    () => [...new Set(components.map((component) => component.ip))].filter(Boolean).sort(),
    [components]
  );

  const uniqueAssetCustodians = useMemo(
    () => [...new Set(components.map((component) => component.asset_custodian))].filter(Boolean).sort(),
    [components]
  );

  const uniqueCategories = useMemo(
    () => [...new Set(components.map((component) => component.category))].filter(Boolean).sort(),
    [components]
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
        type: "enum",
        options: uniqueIps.map((ip) => ({ value: ip, label: ip })),
      },
      { value: "component_name", label: "Component Name", type: "text" },
      {
        value: "platform",
        label: "Platform",
        type: "enum",
        options: uniquePlatforms.map((platform) => ({ value: platform, label: platform })),
      },
      {
        value: "pipeline",
        label: "Pipeline",
        type: "enum",
        options: uniquePipelines.map((pipeline) => ({ value: pipeline, label: pipeline })),
      },
      {
        value: "watcher",
        label: "Watcher",
        type: "enum",
        options: uniqueWatchers.map((watcher) => ({ value: watcher, label: watcher })),
      },
      { value: "comp_path", label: "Component Path", type: "text" },
      { value: "comp_version", label: "Version", type: "text" },
      { value: "release_date", label: "Release Date", type: "text" },
      {
        value: "category",
        label: "Category",
        type: "enum",
        options: uniqueCategories.map((category) => ({ value: category, label: category })),
      },
    ],
    [uniqueCategories, uniqueIps, uniquePipelines, uniquePlatforms, uniqueRegions, uniqueWatchers]
  );

  const advancedFieldMap = useMemo(() => buildAdvancedFieldMap(advancedFields), [advancedFields]);
  const selectedAdvancedFieldConfig =
    advancedFieldMap[advancedField] || advancedFields[0] || null;

  const {
    chooserColumns,
    visibleColumns,
    toggleColumn,
    reorderColumns,
    resetToDefault,
  } = useTableColumns("component_db", COMPONENT_TABLE_DEFAULT_COLUMNS);
  const columnOrder = useMemo(() => visibleColumns.map((column) => column.key), [visibleColumns]);
  const selectedAdvancedOperatorOptions = getAdvancedOperatorOptions(selectedAdvancedFieldConfig);

  const filteredComponents = useMemo(() => {
    let filtered = components;

    if (searchValue) {
      const searchLower = searchValue.toLowerCase();
      const searchTerms = searchLower.split(" ").filter((term) => term.length > 0);
      filtered = filtered.filter(
        (component) => {
          const matchesTerm = (term) =>
            component.component_name?.toLowerCase().includes(term) ||
            component.ip?.toLowerCase().includes(term) ||
            component.comp_path?.toLowerCase().includes(term) ||
            component.comp_version?.toLowerCase().includes(term) ||
            component.region?.toLowerCase().includes(term) ||
            component.platform?.toLowerCase().includes(term) ||
            component.pipeline?.toLowerCase().includes(term) ||
            component.watcher?.toLowerCase().includes(term);

          if (searchTerms.length > 1) {
            return searchTerms.every(matchesTerm);
          }

          return matchesTerm(searchLower);
        }
      );
    }

    if (selectedRegion) {
      filtered = filtered.filter(
        (component) => component.region?.toLowerCase() === selectedRegion.toLowerCase()
      );
    }

    if (selectedPlatform) {
      filtered = filtered.filter(
        (component) => component.platform?.toLowerCase() === selectedPlatform.toLowerCase()
      );
    }

    if (selectedPipeline) {
      filtered = filtered.filter((component) => {
        const pipelineValue = String(component.pipeline || "").toLowerCase();
        return pipelineValue === selectedPipeline.toLowerCase();
      });
    }

    if (selectedWatcher) {
      filtered = filtered.filter((component) => {
        const watcherValue = String(component.watcher || "").toLowerCase();
        const selectedValue = selectedWatcher.toLowerCase();

        if (selectedValue === "unknown") {
          return !watcherValue || watcherValue === "n/a" || watcherValue === "unknown";
        }

        return watcherValue === selectedValue;
      });
    }

    if (selectedAssetCustodians.length) {
      filtered = filtered.filter((component) =>
        selectedAssetCustodians.includes(component.asset_custodian)
      );
    }

    if (startDate || endDate) {
      filtered = filtered.filter((component) => {
        if (!component.release_date) return false;

        const releaseDate = new Date(component.release_date);

        if (startDate && endDate) {
          return releaseDate >= startDate && releaseDate <= endDate;
        }
        if (startDate) {
          return releaseDate >= startDate;
        }
        if (endDate) {
          return releaseDate <= endDate;
        }

        return true;
      });
    }

    if (advancedRules.length) {
      filtered = filtered.filter((component) =>
        applyAdvancedRules(component, advancedRules, advancedFieldMap, (item, field) =>
          String(item[field] ?? "").trim()
        )
      );
    }

    return filtered;
  }, [
    advancedFieldMap,
    advancedRules,
    components,
    searchValue,
    selectedAssetCustodians,
    selectedRegion,
    selectedPlatform,
    selectedPipeline,
    selectedWatcher,
    startDate,
    endDate,
  ]);

  const sortedComponents = useMemo(() => {
    const getComparableValue = (component, column) => {
      switch (column) {
        case "region":
          return component.region || "";
        case "ip":
          return component.ip || "";
        case "component_name":
          return component.component_name || "";
        case "platform":
          return component.platform || "";
        case "comp_version":
          return component.comp_version || "";
        case "pipeline":
          return component.pipeline || "";
        case "watcher":
          return component.watcher || "";
        case "comp_path":
          return component.comp_path || "";
        case "category":
          return component.category || "";
        case "release_date": {
          const dateValue = component.release_date
            ? new Date(component.release_date).getTime()
            : null;
          return Number.isNaN(dateValue) ? null : dateValue;
        }
        default:
          return "";
      }
    };

    const multiplier = sortDirection === "asc" ? 1 : -1;

    return [...filteredComponents].sort((left, right) => {
      const leftValue = getComparableValue(left, sortBy);
      const rightValue = getComparableValue(right, sortBy);

      if (typeof leftValue === "number" || typeof rightValue === "number") {
        if (leftValue === null && rightValue === null) return 0;
        if (leftValue === null) return 1;
        if (rightValue === null) return -1;
        if (leftValue !== rightValue) return (leftValue - rightValue) * multiplier;
      } else {
        const result = String(leftValue).localeCompare(String(rightValue), undefined, {
          numeric: true,
          sensitivity: "base",
        });
        if (result !== 0) return result * multiplier;
      }

      return String(left.ip || "").localeCompare(String(right.ip || ""));
    });
  }, [filteredComponents, sortBy, sortDirection]);

  const paginatedComponents = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return sortedComponents.slice(startIndex, startIndex + rowsPerPage);
  }, [page, rowsPerPage, sortedComponents]);

  const hasActiveFilters = Boolean(
    selectedRegion ||
      selectedPlatform ||
      selectedPipeline ||
      selectedWatcher ||
      selectedAssetCustodians.length ||
      searchValue ||
      advancedRules.length ||
      startDate ||
      endDate
  );

  const handleChangePage = (_event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection((currentDirection) => (currentDirection === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(column);
    setSortDirection("asc");
  };

  const handleCopyToClipboard = (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch((copyError) => {
        console.error("Failed to copy:", copyError);
      });
      return;
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
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

  const handleOpenWatcherStatus = (component) => {
    const nextParams = new URLSearchParams();

    if (component?.region) {
      nextParams.set("region", component.region);
    }

    if (component?.ip) {
      nextParams.set("ip", component.ip);
    }

    if (component?.component_name) {
      nextParams.set("name", component.component_name);
    }

    navigate(`/component-watcher?${nextParams.toString()}`);
  };

  const handleConfigureWatcher = (component) => {
    if (!permissions.configure_watcher) {
      openCaution("You don't have access to configure the watcher");
      return;
    }

    if (!component?.region || !component?.ip) {
      showErrorModal("This component is missing a region/IP, so its watcher can't be configured from here.");
      return;
    }

    let discoveredMeta = null;
    if (component.config_meta) {
      try {
        discoveredMeta =
          typeof component.config_meta === "string"
            ? JSON.parse(component.config_meta)
            : component.config_meta;
      } catch {
        discoveredMeta = null;
      }
    }

    setWatcherActionsTarget({ region: component.region, ip: component.ip });
    setWatcherActionsSuggestion({
      component_name: component.component_name,
      comp_path: component.comp_path,
      platform: component.platform,
      tag: discoveredMeta?.tag || "",
      port: discoveredMeta?.port ?? "",
    });
    setWatcherActionsOpen(true);
  };

  const handleWatcherActionsApplied = () => {
    fetchComponents(true);
  };

  const handleComponentActions = (component) => {
    if (!permissions.restart_component && !permissions.view_component_logs) {
      openCaution("You don't have access to component actions or logs");
      return;
    }

    if (!component?.region || !component?.ip) {
      showErrorModal("This component is missing a region/IP, so it can't be controlled from here.");
      return;
    }

    let discoveredMeta = null;
    if (component.config_meta) {
      try {
        discoveredMeta =
          typeof component.config_meta === "string"
            ? JSON.parse(component.config_meta)
            : component.config_meta;
      } catch {
        discoveredMeta = null;
      }
    }

    if (!discoveredMeta?.tag) {
      showErrorModal(
        "This component's watcher tag isn't known yet - refresh components (or wait for the collector to run again) and try again."
      );
      return;
    }

    setComponentActionsTarget({
      region: component.region,
      ip: component.ip,
      tag: discoveredMeta.tag,
      componentName: component.component_name,
    });
    setComponentActionsOpen(true);
  };

  const handleViewDetails = async (component) => {
    setComponentDetailsOpen(true);
    setSelectedComponentDetails(null);

    try {
      const [detailResponse, watcherResponse] = await Promise.allSettled([
        API.get("/components/fetch-component-detail", {
          params: {
            region: component.region,
            ip: component.ip,
            component_name: component.component_name,
            platform: component.platform,
            comp_path: component.comp_path,
          },
        }),
        API.get("/component/detail", {
          params: {
            ip: component.ip,
            component: component.component_name,
          },
        }),
      ]);

      if (detailResponse.status === "rejected") {
        throw detailResponse.reason;
      }

      const componentData = detailResponse.value.data.component || null;
      const liveConfigMeta =
        watcherResponse.status === "fulfilled"
          ? watcherResponse.value.data?.component?.config_meta || null
          : null;

      let configMeta = liveConfigMeta;
      if (!configMeta && componentData?.config_meta) {
        try {
          configMeta =
            typeof componentData.config_meta === "string"
              ? JSON.parse(componentData.config_meta)
              : componentData.config_meta;
        } catch {
          configMeta = null;
        }
      }

      setSelectedComponentDetails(
        componentData ? { ...componentData, config_meta: configMeta } : null
      );
    } catch (err) {
      setComponentDetailsOpen(false);
      showErrorModal(
        err.response?.data?.error_message ||
          err.response?.data?.detail ||
          "An unexpected error occurred"
      );
    }
  };

  const handleRegionChange = (event) => {
    setSelectedRegion(event.target.value);
    setPage(0);
  };

  const handlePlatformChange = (event) => {
    setSelectedPlatform(event.target.value);
    setPage(0);
  };

  const handlePipelineChange = (event) => {
    setSelectedPipeline(event.target.value);
    setPage(0);
  };

  const handleWatcherChange = (event) => {
    setSelectedWatcher(event.target.value);
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

  const handleStartDateChange = (date) => {
    setStartDate(date);
    setPage(0);
  };

  const handleEndDateChange = (date) => {
    setEndDate(date);
    setPage(0);
  };

  const clearFilters = () => {
    setSelectedRegion("");
    setSelectedPlatform("");
    setSelectedPipeline("");
    setSelectedWatcher("");
    setSelectedAssetCustodians([]);
    setSearchValue("");
    setAdvancedRules([]);
    setAdvancedJoin("AND");
    setAdvancedField("component_name");
    setAdvancedOperator("contains");
    setAdvancedValue("");
    setStartDate(null);
    setEndDate(null);
    setPage(0);
  };

  const openCaution = (message) => {
    setCautionMessage(message);
    setCautionOpen(true);
  };

  const closeCaution = () => {
    setCautionOpen(false);
    setCautionMessage("");
  };

  const exportToExcel = () => {
    const columnsToExport = visibleColumns.filter((column) => column.key !== "actions");
    const dataToExport = sortedComponents.map((component) => {
      const row = {};
      columnsToExport.forEach((column) => {
        const getValue = COMPONENT_EXPORT_VALUE_GETTERS[column.key];
        row[column.label] = getValue ? getValue(component) : "";
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Components");
    XLSX.writeFile(workbook, "components.xlsx");
  };

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
          <StorageRoundedIcon sx={{ color: HEADER_ACCENT }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Component DB
          </Typography>
        </Box>

        <Chip
          label={`${sortedComponents.length} components`}
          size="small"
          sx={{
            bgcolor: `rgba(${hexToRgb(HEADER_ACCENT)}, 0.14)`,
            color: HEADER_ACCENT,
            fontWeight: 600,
            borderRadius: 999,
          }}
        />
      </Box>

      <ComponentFilterBar
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
        selectedRegion={selectedRegion}
        selectedPlatform={selectedPlatform}
        selectedPipeline={selectedPipeline}
        selectedWatcher={selectedWatcher}
        selectedAssetCustodians={selectedAssetCustodians}
        startDate={startDate}
        endDate={endDate}
        uniqueRegions={uniqueRegions}
        uniquePlatforms={uniquePlatforms}
        uniquePipelines={uniquePipelines}
        uniqueWatchers={uniqueWatchers}
        uniqueAssetCustodians={uniqueAssetCustodians}
        hasActiveFilters={hasActiveFilters}
        loading={loading}
        onAddAdvancedRule={handleAddAdvancedRule}
        onAdvancedFieldChange={handleAdvancedFieldChange}
        onAdvancedJoinChange={(event) => setAdvancedJoin(event.target.value)}
        onAdvancedOperatorChange={(event) => setAdvancedOperator(event.target.value)}
        onAdvancedValueChange={(event) => setAdvancedValue(event.target.value)}
        onSearchChange={handleSearchChange}
        onRegionChange={handleRegionChange}
        onPlatformChange={handlePlatformChange}
        onPipelineChange={handlePipelineChange}
        onWatcherChange={handleWatcherChange}
        onAssetCustodianChange={handleAssetCustodianChange}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        onClearFilters={clearFilters}
        onRemoveAdvancedRule={handleRemoveAdvancedRule}
        onExportToExcel={exportToExcel}
        onRefresh={() => fetchComponents(true)}
      />

      <ComponentTable
        columnOrder={columnOrder}
        error={error}
        hasActiveFilters={hasActiveFilters}
        loading={loading}
        onChangePage={handleChangePage}
        onChangeRowsPerPage={handleChangeRowsPerPage}
        onComponentActions={handleComponentActions}
        canManageComponentActions={Boolean(permissions.restart_component)}
        canViewComponentLogs={Boolean(permissions.view_component_logs)}
        onConfigureWatcher={handleConfigureWatcher}
        onCopyToClipboard={handleCopyToClipboard}
        onOpenHostDetails={handleOpenHostDetails}
        onOpenWatcherStatus={handleOpenWatcherStatus}
        onSort={handleSort}
        onViewDetails={handleViewDetails}
        page={page}
        paginatedComponents={paginatedComponents}
        rowsPerPage={rowsPerPage}
        sortBy={sortBy}
        sortDirection={sortDirection}
        totalCount={sortedComponents.length}
      />

      <Menu
        open={Boolean(contextMenu)}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined
        }
      >
        <MenuItem onClick={handleDeleteSelectedComponent}>Delete</MenuItem>
      </Menu>

      <WatcherActionsModal
        open={watcherActionsOpen}
        row={watcherActionsTarget}
        initialSuggestion={watcherActionsSuggestion}
        onClose={() => {
          setWatcherActionsOpen(false);
          setWatcherActionsTarget(null);
          setWatcherActionsSuggestion(null);
        }}
        onApplied={handleWatcherActionsApplied}
      />

      <ComponentActionsModal
        open={componentActionsOpen}
        target={componentActionsTarget}
        canManageLifecycle={Boolean(permissions.restart_component)}
        canViewLogs={Boolean(permissions.view_component_logs)}
        canDownloadLogs={Boolean(permissions.download_component_logs)}
        onClose={() => {
          setComponentActionsOpen(false);
          setComponentActionsTarget(null);
        }}
      />

      <ComponentDetailsModal
        open={componentDetailsOpen}
        onClose={() => {
          setComponentDetailsOpen(false);
          setSelectedComponentDetails(null);
        }}
        data={selectedComponentDetails}
      />

      <ErrorModal
        wrapperRef={wrapperRef}
        open={openErrorModal}
        error={error}
        onClose={() => setOpenErrorModal(false)}
      />

      <ErrorModal
        wrapperRef={wrapperRef}
        open={cautionOpen}
        error={cautionMessage}
        onClose={closeCaution}
        title="Caution"
      />
    </Box>
  );
}

export default ComponentDB;
