import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import { Box, Chip, Paper, Tab, Tabs, Typography } from "@mui/material";
import ScheduleIcon from "@mui/icons-material/Schedule";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import EventRepeatIcon from "@mui/icons-material/EventRepeat";
import SchedulerAddTagsModal from "./SchedulerAddTagsModal";
import SchedulerLambdaModal from "./SchedulerLambdaModal";
import SchedulerFilterBar from "./SchedulerFilterBar";
import AllSchedulesTab from "./AllSchedulesTab";
import EC2SchedulesTable, { EC2_SCHEDULES_DEFAULT_COLUMNS } from "./EC2SchedulesTable";
import ErrorModal from "../../modals/ErrorModal";
import { API } from "../../services/auth";
import useTableColumns from "../../hooks/useTableColumns";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import hexToRgb from "../shared/hexToRgb";
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

const SCHEDULE_TABS = [
  {
    id: "events",
    label: "Today's Events",
    countLabel: "events",
    color: "#F59E0B",
    icon: <EventAvailableIcon />,
  },
  {
    id: "all",
    label: "All Schedules",
    countLabel: "schedules",
    color: "#60A5FA",
    icon: <EventRepeatIcon />,
  },
];

// Route param values for each tab (see the /ec2-schedules/:tab route in
// Dashboard.jsx), in tab-index order.
const TAB_IDS = SCHEDULE_TABS.map((tab) => tab.id);

const EC2Schedules = () => {
  const wrapperRef = useRef(null);
  const navigate = useNavigate();
  const { tab: tabParam } = useParams();

  const [events, setEvents] = useState([]);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openErrorModal, setOpenErrorModal] = useState(false);
  const [isAddTagsModalOpen, setIsAddTagsModalOpen] = useState(false);
  const [isLambdaModalOpen, setIsLambdaModalOpen] = useState(false);
  // Driven by the :tab route param rather than local state, so each tab has
  // its own URL (/ec2-schedules/events, /ec2-schedules/all) and is
  // bookmarkable / back-button friendly. Falls back to the first tab for an
  // unrecognized param.
  const activeTab = Math.max(0, TAB_IDS.indexOf(tabParam));
  const [allSchedulesCount, setAllSchedulesCount] = useState(0);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState("scheduled_time");
  const [sortDirection, setSortDirection] = useState("asc");

  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedRegion, setSelectedRegion] = useState(searchParams.get("region") || "");
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get("status") || "");
  const [selectedAction, setSelectedAction] = useState(searchParams.get("action") || "");
  const [selectedScheduleEnabled, setSelectedScheduleEnabled] = useState(
    searchParams.get("scheduleEnabled") || ""
  );
  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");
  const initialAdvancedState = readAdvancedSearchState(searchParams, {
    defaultField: "instance_name",
    defaultOperator: "contains",
  });
  const [advancedRules, setAdvancedRules] = useState(initialAdvancedState.rules);
  const [advancedJoin, setAdvancedJoin] = useState(initialAdvancedState.join);
  const [advancedField, setAdvancedField] = useState(initialAdvancedState.field);
  const [advancedOperator, setAdvancedOperator] = useState(initialAdvancedState.operator);
  const [advancedValue, setAdvancedValue] = useState(initialAdvancedState.value);

  // Memoised: AllSchedulesTab takes this as a useCallback dependency, so an
  // unstable identity here would re-trigger its fetch on every render.
  const showErrorModal = useCallback((message) => {
    setError(message);
    setOpenErrorModal(true);
  }, []);

  const fetchEvents = useCallback(async (fresh = false) => {
    setLoading(true);
    try {
      const response = await API.get("/schedules/fetch-schedules", {
        params: { fresh: fresh ? "true" : "false" },
      });
      setEvents(response.data.schedules);
    } catch (err) {
      showErrorModal(err.response?.data?.error_message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }, [showErrorModal]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // The "All Schedules" tab count would otherwise stay at 0 until that tab
  // is actually opened, since AllSchedulesTab (and its onCountChange call)
  // only mounts once activeTab switches to it. The backend already caches
  // this list from a startup background task, so fetch it here too - fast,
  // since it just reads that cache - to have the real count ready up front.
  useEffect(() => {
    let cancelled = false;
    API.get("/schedules/fetch-instance-schedules")
      .then((response) => {
        if (!cancelled) {
          setAllSchedulesCount((response.data.schedules || []).length);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const urlRegion = searchParams.get("region") || "";
    const urlStatus = searchParams.get("status") || "";
    const urlAction = searchParams.get("action") || "";
    const urlScheduleEnabled = searchParams.get("scheduleEnabled") || "";
    const urlSearchValue = searchParams.get("search") || "";

    setSelectedRegion((currentRegion) => (currentRegion === urlRegion ? currentRegion : urlRegion));
    setSelectedStatus((currentStatus) => (currentStatus === urlStatus ? currentStatus : urlStatus));
    setSelectedAction((currentAction) => (currentAction === urlAction ? currentAction : urlAction));
    setSelectedScheduleEnabled((currentScheduleEnabled) =>
      currentScheduleEnabled === urlScheduleEnabled ? currentScheduleEnabled : urlScheduleEnabled
    );
    setSearchValue((currentSearchValue) =>
      currentSearchValue === urlSearchValue ? currentSearchValue : urlSearchValue
    );

    const nextAdvancedState = readAdvancedSearchState(searchParams, {
      defaultField: "instance_name",
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
        if (selectedStatus) nextParams.set("status", selectedStatus);
        else nextParams.delete("status");
        if (selectedAction) nextParams.set("action", selectedAction);
        else nextParams.delete("action");
        if (selectedScheduleEnabled) nextParams.set("scheduleEnabled", selectedScheduleEnabled);
        else nextParams.delete("scheduleEnabled");
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
      selectedAction,
      selectedRegion,
      selectedScheduleEnabled,
      selectedStatus,
      setSearchParams,
    ]);

  const uniqueRegions = useMemo(
    () => [...new Set(events.map((event) => event.region))].filter(Boolean).sort(),
    [events]
  );

  const uniqueStatuses = useMemo(() => {
    const statuses = events.map((event) =>
      new Date(event.scheduled_time) <= now ? "executed" : "not_executed"
    );
    return [...new Set(statuses)].sort();
  }, [events, now]);

  const uniqueActions = useMemo(
    () => [...new Set(events.map((event) => event.action))].filter(Boolean).sort(),
    [events]
  );

  const uniqueScheduleEnabled = useMemo(
    () =>
      [...new Set(events.map((event) => (event.schedule_enabled ? "enabled" : "disabled")))].sort(),
    [events]
  );

  const advancedFields = useMemo(
    () => [
      {
        value: "region",
        label: "Region",
        type: "enum",
        options: uniqueRegions.map((region) => ({ value: region, label: region })),
      },
      { value: "private_ip", label: "Private IP", type: "text" },
      { value: "instance_name", label: "Instance Name", type: "text" },
      {
        value: "action",
        label: "Action",
        type: "enum",
        options: uniqueActions.map((action) => ({ value: action, label: action })),
      },
      {
        value: "derived_status",
        label: "Status",
        type: "enum",
        options: uniqueStatuses.map((status) => ({
          value: status,
          label: status === "executed" ? "Executed" : "Not Executed",
        })),
      },
      {
        value: "derived_schedule_enabled",
        label: "Schedule Enabled",
        type: "enum",
        options: uniqueScheduleEnabled.map((enabled) => ({
          value: enabled,
          label: enabled === "enabled" ? "Enabled" : "Disabled",
        })),
      },
      { value: "scheduled_time", label: "Scheduled Time", type: "text" },
    ],
    [uniqueActions, uniqueRegions, uniqueScheduleEnabled, uniqueStatuses]
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
  } = useTableColumns("ec2_schedules", EC2_SCHEDULES_DEFAULT_COLUMNS);
  const columnOrder = useMemo(() => visibleColumns.map((column) => column.key), [visibleColumns]);

  const filteredEvents = useMemo(() => {
    let filtered = events;

    if (searchValue) {
      const term = searchValue.toLowerCase();
      filtered = filtered.filter(
        (event) =>
          event.private_ip?.toLowerCase().includes(term) ||
          event.instance_name?.toLowerCase().includes(term) ||
          event.action?.toLowerCase().includes(term) ||
          event.region?.toLowerCase().includes(term)
      );
    }

    if (selectedRegion) {
      filtered = filtered.filter((event) => event.region === selectedRegion);
    }

    if (selectedStatus) {
      filtered = filtered.filter((event) => {
        const status = new Date(event.scheduled_time) <= now ? "executed" : "not_executed";
        return status === selectedStatus;
      });
    }

    if (selectedAction) {
      filtered = filtered.filter((event) => event.action === selectedAction);
    }

    if (selectedScheduleEnabled) {
      filtered = filtered.filter((event) => {
        const scheduleEnabled = event.schedule_enabled ? "enabled" : "disabled";
        return scheduleEnabled === selectedScheduleEnabled;
      });
    }

    if (advancedRules.length) {
      filtered = filtered.filter((event) =>
        applyAdvancedRules(event, advancedRules, advancedFieldMap, (item, field) => {
          if (field === "derived_status") {
            return new Date(item.scheduled_time) <= now ? "executed" : "not_executed";
          }

          if (field === "derived_schedule_enabled") {
            return item.schedule_enabled ? "enabled" : "disabled";
          }

          return String(item[field] ?? "").trim();
        })
      );
    }

    return filtered;
  }, [
    advancedFieldMap,
    advancedRules,
    events,
    now,
    searchValue,
    selectedAction,
    selectedRegion,
    selectedScheduleEnabled,
    selectedStatus,
  ]);

  const sortedEvents = useMemo(() => {
    const getComparableValue = (event, column) => {
      switch (column) {
        case "region":
          return event.region || "";
        case "private_ip":
          return event.private_ip || "";
        case "instance_name":
          return event.instance_name || "";
        case "action":
          return event.action || "";
        case "schedule_enabled":
          return event.schedule_enabled ? "enabled" : "disabled";
        case "scheduled_time": {
          const value = event.scheduled_time ? new Date(event.scheduled_time).getTime() : null;
          return Number.isNaN(value) ? null : value;
        }
        case "countdown": {
          const value = event.scheduled_time
            ? new Date(event.scheduled_time).getTime() - now.getTime()
            : null;
          return value === null ? null : value;
        }
        default:
          return "";
      }
    };

    const multiplier = sortDirection === "asc" ? 1 : -1;

    return [...filteredEvents].sort((left, right) => {
      const leftValue = getComparableValue(left, sortBy);
      const rightValue = getComparableValue(right, sortBy);

      if (typeof leftValue === "number" || typeof rightValue === "number") {
        if (leftValue === null && rightValue === null) return 0;
        if (leftValue === null) return 1;
        if (rightValue === null) return -1;
        const result = leftValue - rightValue;
        if (result !== 0) return result * multiplier;
      } else {
        const result = String(leftValue).localeCompare(String(rightValue), undefined, {
          numeric: true,
          sensitivity: "base",
        });
        if (result !== 0) return result * multiplier;
      }

      return String(left.private_ip || "").localeCompare(String(right.private_ip || ""));
    });
  }, [filteredEvents, now, sortBy, sortDirection]);

  const paginatedEvents = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return sortedEvents.slice(startIndex, startIndex + rowsPerPage);
  }, [page, rowsPerPage, sortedEvents]);

  const hasActiveFilters = Boolean(
    searchValue ||
      selectedRegion ||
      selectedStatus ||
      selectedAction ||
      selectedScheduleEnabled ||
      advancedRules.length
  );

  const tabCounts = {
    events: sortedEvents.length,
    all: allSchedulesCount,
  };

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

  const handleStatusChange = (event) => {
    setSelectedStatus(event.target.value);
    setPage(0);
  };

  const handleActionChange = (event) => {
    setSelectedAction(event.target.value);
    setPage(0);
  };

  const handleScheduleEnabledChange = (event) => {
    setSelectedScheduleEnabled(event.target.value);
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
    setSelectedStatus("");
    setSelectedAction("");
    setSelectedScheduleEnabled("");
    setSearchValue("");
    setAdvancedRules([]);
    setAdvancedJoin("AND");
    setAdvancedField("instance_name");
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

  const ec2SchedulesExportValueGetters = {
    region: (event) => event.region,
    private_ip: (event) => event.private_ip,
    instance_name: (event) => event.instance_name,
    action: (event) => event.action,
    schedule_enabled: (event) => (event.schedule_enabled ? "Enabled" : "Disabled"),
    scheduled_time: (event) => event.scheduled_time,
    countdown: (event) =>
      new Date(event.scheduled_time) <= now ? "Executed" : formatTimeRemaining(event.scheduled_time),
  };

  const exportToExcel = () => {
    const columnsToExport = visibleColumns.filter((column) => column.key !== "actions");
    const dataToExport = sortedEvents.map((event) => {
      const row = {};
      columnsToExport.forEach((column) => {
        const getValue = ec2SchedulesExportValueGetters[column.key];
        row[column.label] = getValue ? getValue(event) : "";
      });
      return row;
    });
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Scheduled Events");
    XLSX.writeFile(workbook, "scheduled_events.xlsx");
  };

  const formatTimeRemaining = (scheduledTime) => {
    const scheduledDate = new Date(scheduledTime);
    const diff = scheduledDate - now;

    if (diff <= 0) {
      return "Executed";
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const formatScheduledTime = (scheduledTime) => {
    if (!scheduledTime) return "N/A";
    const date = new Date(scheduledTime);
    return date.toLocaleString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "UTC",
    });
  };

  const getLocalTimeTooltip = (scheduledTime) => {
    if (!scheduledTime) return "N/A";
    const date = new Date(scheduledTime);

    return `Local Time: ${date.toLocaleString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })}`;
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
          <ScheduleIcon sx={{ color: "#FF6B35" }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            EC2 Schedules
          </Typography>
        </Box>

        <Chip
          label={
            activeTab === 0
              ? `${sortedEvents.length} events today`
              : `${allSchedulesCount} schedules`
          }
          size="small"
          sx={{
            bgcolor: `rgba(${hexToRgb("#FF6B35")}, 0.14)`,
            color: "#FF6B35",
            fontWeight: 600,
            borderRadius: 999,
          }}
        />
      </Box>

      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          // Each tab owns its own filters; switching tabs should start clean
          // rather than carrying the previous tab's query params along.
          onChange={(_event, nextTab) => navigate(`/ec2-schedules/${TAB_IDS[nextTab]}`)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            "& .MuiTab-root": {
              alignItems: "center",
              textAlign: "center",
              minHeight: 64,
              padding: "12px 16px",
              "&.Mui-selected": {
                backgroundColor: "action.selected",
              },
            },
          }}
        >
          {SCHEDULE_TABS.map((tab) => (
            <Tab
              key={tab.id}
              label={
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <Box sx={{ color: tab.color }}>{tab.icon}</Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {tab.label}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      {tabCounts[tab.id]} {tab.countLabel}
                    </Typography>
                  </Box>
                </Box>
              }
              sx={{
                "&.Mui-selected": {
                  backgroundColor: "action.selected",
                  borderBottom: 2,
                  borderColor: tab.color,
                },
              }}
            />
          ))}
        </Tabs>
      </Paper>

      <Box
        sx={{
          flexGrow: 1,
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {activeTab === 0 ? (
          <>
            <SchedulerFilterBar
              wrapperRef={wrapperRef}
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
              selectedRegion={selectedRegion}
              selectedStatus={selectedStatus}
              selectedAction={selectedAction}
              selectedScheduleEnabled={selectedScheduleEnabled}
              localSearch={searchValue}
              uniqueRegions={uniqueRegions}
              uniqueStatuses={uniqueStatuses}
              uniqueActions={uniqueActions}
              uniqueScheduleEnabled={uniqueScheduleEnabled}
              handleAddAdvancedRule={handleAddAdvancedRule}
              handleAdvancedFieldChange={handleAdvancedFieldChange}
              handleAdvancedJoinChange={(event) => setAdvancedJoin(event.target.value)}
              handleAdvancedOperatorChange={(event) => setAdvancedOperator(event.target.value)}
              handleAdvancedValueChange={(event) => setAdvancedValue(event.target.value)}
              handleRegionChange={handleRegionChange}
              handleStatusChange={handleStatusChange}
              handleActionChange={handleActionChange}
              handleScheduleEnabledChange={handleScheduleEnabledChange}
              handleSearchChange={handleSearchChange}
              clearFilters={clearFilters}
              handleRemoveAdvancedRule={handleRemoveAdvancedRule}
              exportToExcel={exportToExcel}
              onRefresh={() => fetchEvents(true)}
              loading={loading}
              onOpenModal={() => setIsAddTagsModalOpen(true)}
              onOpenLambda={() => setIsLambdaModalOpen(true)}
            />

            <EC2SchedulesTable
              columnOrder={columnOrder}
              error={error}
              hasActiveFilters={hasActiveFilters}
              loading={loading}
              onChangePage={handleChangePage}
              onChangeRowsPerPage={handleChangeRowsPerPage}
              onSort={handleSort}
              page={page}
              paginatedEvents={paginatedEvents}
              rowsPerPage={rowsPerPage}
              sortBy={sortBy}
              sortDirection={sortDirection}
              totalCount={sortedEvents.length}
              formatScheduledTime={formatScheduledTime}
              formatTimeRemaining={formatTimeRemaining}
              getLocalTimeTooltip={getLocalTimeTooltip}
            />
          </>
        ) : (
          <AllSchedulesTab onError={showErrorModal} onCountChange={setAllSchedulesCount} />
        )}
      </Box>

      <SchedulerAddTagsModal
        open={isAddTagsModalOpen}
        onClose={() => setIsAddTagsModalOpen(false)}
      />

      <SchedulerLambdaModal
        open={isLambdaModalOpen}
        onClose={() => setIsLambdaModalOpen(false)}
      />

      <ErrorModal
        wrapperRef={wrapperRef}
        open={openErrorModal}
        error={error}
        onClose={() => setOpenErrorModal(false)}
      />
    </Box>
  );
};

export default EC2Schedules;
