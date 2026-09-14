import { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import * as XLSX from "xlsx";
import {
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TablePagination,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { keyframes } from "@mui/system";
import { useSearchParams } from "react-router-dom";
import RefreshIcon from "@mui/icons-material/Refresh";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import RoomOutlinedIcon from "@mui/icons-material/RoomOutlined";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import ToggleOnOutlinedIcon from "@mui/icons-material/ToggleOnOutlined";

import SectionFilterBar from "../shared/SectionFilterBar";
import ServerScheduleCard from "./ServerScheduleCard";
import { groupSchedulesByServer } from "./weeklyScheduleUtils";
import { API } from "../../services/auth";
import hexToRgb from "../shared/hexToRgb";

const tintedIconButtonSx = (color) => ({
  color,
  bgcolor: `rgba(${hexToRgb(color)}, 0.12)`,
  "&:hover": { bgcolor: `rgba(${hexToRgb(color)}, 0.24)` },
  "&.Mui-disabled": { color: "text.disabled", bgcolor: "transparent" },
});

const selectIconSx = (color) => ({ fontSize: 16, color });

const EXPORT_VALUE_GETTERS = {
  region: (row) => row.region,
  private_ip: (row) => row.private_ip,
  instance_name: (row) => row.instance_name,
  action: (row) => row.action,
  schedule_enabled: (row) => (row.schedule_enabled ? "Enabled" : "Disabled"),
  days: (row) => row.days,
  cron_expression: (row) => row.cron_expression,
  tag_key: (row) => row.tag_key,
};

const EXPORT_COLUMNS = [
  { key: "region", label: "Region" },
  { key: "private_ip", label: "IP" },
  { key: "instance_name", label: "Instance Name" },
  { key: "action", label: "Action" },
  { key: "schedule_enabled", label: "Schedule Enabled" },
  { key: "days", label: "Days" },
  { key: "cron_expression", label: "Cron" },
  { key: "tag_key", label: "Tag" },
];

// Query param names for this tab's filters, kept distinct from the "Today's
// Events" tab's (region/status/action/scheduleEnabled/search) since both
// tabs are rendered by the same EC2Schedules component and share one URL -
// switching tabs doesn't unmount either side, so reusing a name would let
// one tab's filter effect clobber the other's.
const PARAM_SEARCH = "allSearch";
const PARAM_REGION = "allRegion";
const PARAM_ACTION = "allAction";
const PARAM_ENABLED = "allEnabled";

function AllSchedulesTab({ onError, onCountChange }) {
  const theme = useTheme();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(0);
  const [serversPerPage, setServersPerPage] = useState(10);

  const [searchParams, setSearchParams] = useSearchParams();

  const [searchValue, setSearchValue] = useState(searchParams.get(PARAM_SEARCH) || "");
  const [selectedRegion, setSelectedRegion] = useState(searchParams.get(PARAM_REGION) || "");
  const [selectedAction, setSelectedAction] = useState(searchParams.get(PARAM_ACTION) || "");
  const [selectedScheduleEnabled, setSelectedScheduleEnabled] = useState(
    searchParams.get(PARAM_ENABLED) || ""
  );

  useEffect(() => {
    const urlSearchValue = searchParams.get(PARAM_SEARCH) || "";
    const urlRegion = searchParams.get(PARAM_REGION) || "";
    const urlAction = searchParams.get(PARAM_ACTION) || "";
    const urlScheduleEnabled = searchParams.get(PARAM_ENABLED) || "";

    setSearchValue((current) => (current === urlSearchValue ? current : urlSearchValue));
    setSelectedRegion((current) => (current === urlRegion ? current : urlRegion));
    setSelectedAction((current) => (current === urlAction ? current : urlAction));
    setSelectedScheduleEnabled((current) =>
      current === urlScheduleEnabled ? current : urlScheduleEnabled
    );
  }, [searchParams]);

  useEffect(() => {
    setSearchParams(
      (currentParams) => {
        const nextParams = new URLSearchParams(currentParams);
        if (searchValue) nextParams.set(PARAM_SEARCH, searchValue);
        else nextParams.delete(PARAM_SEARCH);
        if (selectedRegion) nextParams.set(PARAM_REGION, selectedRegion);
        else nextParams.delete(PARAM_REGION);
        if (selectedAction) nextParams.set(PARAM_ACTION, selectedAction);
        else nextParams.delete(PARAM_ACTION);
        if (selectedScheduleEnabled) nextParams.set(PARAM_ENABLED, selectedScheduleEnabled);
        else nextParams.delete(PARAM_ENABLED);
        return nextParams.toString() === currentParams.toString() ? currentParams : nextParams;
      },
      { replace: true }
    );
  }, [searchValue, selectedRegion, selectedAction, selectedScheduleEnabled, setSearchParams]);

  const fetchSchedules = useCallback(
    async (fresh = false) => {
      setLoading(true);
      try {
        const response = await API.get("/schedules/fetch-instance-schedules", {
          params: { fresh: fresh ? "true" : "false" },
        });
        setSchedules(response.data.schedules || []);
      } catch (err) {
        onError(err.response?.data?.error_message || "Unexpected error");
      } finally {
        setLoading(false);
      }
    },
    [onError]
  );

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const uniqueRegions = useMemo(
    () => [...new Set(schedules.map((row) => row.region))].filter(Boolean).sort(),
    [schedules]
  );

  const uniqueActions = useMemo(
    () => [...new Set(schedules.map((row) => row.action))].filter(Boolean).sort(),
    [schedules]
  );

  const filteredSchedules = useMemo(() => {
    let filtered = schedules;

    if (searchValue) {
      const term = searchValue.toLowerCase();
      filtered = filtered.filter(
        (row) =>
          row.instance_name?.toLowerCase().includes(term) ||
          row.private_ip?.toLowerCase().includes(term) ||
          row.instance_id?.toLowerCase().includes(term) ||
          row.region?.toLowerCase().includes(term) ||
          row.cron_expression?.toLowerCase().includes(term) ||
          row.days?.toLowerCase().includes(term) ||
          row.tag_key?.toLowerCase().includes(term)
      );
    }

    if (selectedRegion) {
      filtered = filtered.filter((row) => row.region === selectedRegion);
    }

    if (selectedAction) {
      filtered = filtered.filter((row) => row.action === selectedAction);
    }

    if (selectedScheduleEnabled) {
      filtered = filtered.filter(
        (row) => (row.schedule_enabled ? "enabled" : "disabled") === selectedScheduleEnabled
      );
    }

    return filtered;
  }, [schedules, searchValue, selectedRegion, selectedAction, selectedScheduleEnabled]);

  // One card per server, each holding that server's events sorted by time
  // within every day of the week (see eventsForDay in weeklyScheduleUtils).
  const servers = useMemo(() => groupSchedulesByServer(filteredSchedules), [filteredSchedules]);

  useEffect(() => {
    onCountChange(filteredSchedules.length);
  }, [filteredSchedules.length, onCountChange]);

  useEffect(() => {
    setPage(0);
  }, [searchValue, selectedRegion, selectedAction, selectedScheduleEnabled]);

  const paginatedServers = useMemo(() => {
    const startIndex = page * serversPerPage;
    return servers.slice(startIndex, startIndex + serversPerPage);
  }, [page, serversPerPage, servers]);

  const hasActiveFilters = Boolean(
    searchValue || selectedRegion || selectedAction || selectedScheduleEnabled
  );

  const clearFilters = () => {
    setSearchValue("");
    setSelectedRegion("");
    setSelectedAction("");
    setSelectedScheduleEnabled("");
    setPage(0);
  };

  const exportToExcel = () => {
    const rows = filteredSchedules.map((row) => {
      const exportRow = {};
      EXPORT_COLUMNS.forEach((column) => {
        const getValue = EXPORT_VALUE_GETTERS[column.key];
        exportRow[column.label] = getValue ? getValue(row) : "";
      });
      return exportRow;
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "All Schedules");
    XLSX.writeFile(workbook, "instance_schedules.xlsx");
  };

  const withPageReset = (setter) => (event) => {
    setter(event.target.value);
    setPage(0);
  };

  const shimmer = keyframes`
    0% { background-position: 200% 0; opacity: .72; }
    50% { opacity: 1; }
    100% { background-position: -200% 0; opacity: .72; }
  `;
  const isLight = theme.palette.mode === "light";
  const shimmerSx = {
    borderRadius: 1.5,
    background: isLight
      ? "linear-gradient(90deg, rgba(37,99,235,.10), rgba(148,163,184,.26), rgba(37,99,235,.10))"
      : "linear-gradient(90deg, rgba(96,165,250,.18), rgba(148,163,184,.38), rgba(96,165,250,.18))",
    backgroundSize: "200% 100%",
    animation: `${shimmer} 1.4s linear infinite`,
  };

  return (
    <>
      <SectionFilterBar
        searchPlaceholder="Search schedules..."
        searchValue={searchValue}
        onSearchChange={withPageReset(setSearchValue)}
        onSearchClear={() => {
          setSearchValue("");
          setPage(0);
        }}
        searchSx={{ flex: "1 1 260px", minWidth: 220, maxWidth: 360 }}
        flexWrap="wrap"
        selects={[
          {
            id: "instance-schedules-region-select-label",
            label: "Region",
            value: selectedRegion,
            onChange: withPageReset(setSelectedRegion),
            allLabel: "All Regions",
            accentColor: "#60A5FA",
            icon: <RoomOutlinedIcon sx={selectIconSx("#60A5FA")} />,
            options: uniqueRegions.map((region) => ({ value: region, label: region })),
          },
          {
            id: "instance-schedules-action-select-label",
            label: "Action",
            value: selectedAction,
            onChange: withPageReset(setSelectedAction),
            allLabel: "All Actions",
            accentColor: "#F59E0B",
            icon: <BoltOutlinedIcon sx={selectIconSx("#F59E0B")} />,
            options: uniqueActions.map((action) => ({ value: action, label: action })),
          },
          {
            id: "instance-schedules-enabled-select-label",
            label: "Schedule Enabled",
            value: selectedScheduleEnabled,
            onChange: withPageReset(setSelectedScheduleEnabled),
            minWidth: 170,
            allLabel: "All",
            accentColor: "#A78BFA",
            icon: <ToggleOnOutlinedIcon sx={selectIconSx("#A78BFA")} />,
            options: [
              { value: "enabled", label: "Enabled" },
              { value: "disabled", label: "Disabled" },
            ],
          },
        ]}
        showClearFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        actions={
          <>
            <Tooltip title="Export to Excel">
              <IconButton size="small" onClick={exportToExcel} sx={tintedIconButtonSx("#22D3EE")}>
                <FileDownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Refresh from AWS tags">
              <span>
                <IconButton
                  size="small"
                  onClick={() => fetchSchedules(true)}
                  disabled={loading}
                  sx={tintedIconButtonSx("#60A5FA")}
                >
                  {loading ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
          </>
        }
      />

      <Paper
        sx={{
          flex: "1 1 0",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <Box sx={{ flex: "1 1 0", minHeight: 0, overflow: "auto", p: 1.5 }}>
          {loading ? (
            <Stack spacing={1.5}>
              {Array.from({ length: 4 }).map((_, index) => (
                <Box key={index} sx={{ p: 1.5, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                  <Box sx={{ ...shimmerSx, height: 20, width: "28%", mb: 1.5 }} />
                  <Box sx={{ display: "flex", gap: 0.75 }}>
                    {Array.from({ length: 7 }).map((__, dayIndex) => (
                      <Box key={dayIndex} sx={{ ...shimmerSx, height: 64, flex: "1 1 0" }} />
                    ))}
                  </Box>
                </Box>
              ))}
            </Stack>
          ) : paginatedServers.length === 0 ? (
            <Box sx={{ py: 6, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                {hasActiveFilters
                  ? "No schedules found matching your filters."
                  : "No schedules available."}
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {paginatedServers.map((server) => (
                <ServerScheduleCard key={server.key} server={server} />
              ))}
            </Stack>
          )}
        </Box>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={servers.length}
          rowsPerPage={serversPerPage}
          page={page}
          labelRowsPerPage="Servers per page"
          onPageChange={(_event, nextPage) => setPage(nextPage)}
          onRowsPerPageChange={(event) => {
            setServersPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          sx={{
            flexShrink: 0,
            borderTop: "1px solid",
            borderColor: "divider",
            "& .MuiTablePagination-toolbar": {
              minHeight: "48px",
            },
          }}
        />
      </Paper>
    </>
  );
}

AllSchedulesTab.propTypes = {
  onError: PropTypes.func.isRequired,
  onCountChange: PropTypes.func.isRequired,
};

export default AllSchedulesTab;
