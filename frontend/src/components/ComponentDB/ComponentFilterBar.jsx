import { useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { subDays, subWeeks, subMonths } from "date-fns";
import RefreshIcon from "@mui/icons-material/Refresh";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TuneIcon from "@mui/icons-material/Tune";
import RoomOutlinedIcon from "@mui/icons-material/RoomOutlined";
import CodeIcon from "@mui/icons-material/Code";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";

import AdvancedSearchPanel from "../shared/AdvancedSearchPanel";
import ColumnChooserButton from "../shared/ColumnChooserButton";
import SectionFilterBar from "../shared/SectionFilterBar";
import hexToRgb from "../shared/hexToRgb";

const tintedIconButtonSx = (color) => ({
  color,
  bgcolor: `rgba(${hexToRgb(color)}, 0.12)`,
  "&:hover": { bgcolor: `rgba(${hexToRgb(color)}, 0.24)` },
  "&.Mui-disabled": { color: "text.disabled", bgcolor: "transparent" },
});

const selectIconSx = (color) => ({ fontSize: 16, color });

const DATE_RANGE_ACCENT = "#F59E0B";

function ComponentFilterBar({
  advancedField,
  advancedFields,
  advancedJoin,
  advancedOperator,
  advancedOperatorOptions,
  advancedRuleJoinOptions,
  advancedRules,
  advancedValue,
  columnChooserColumns,
  onToggleColumn,
  onReorderColumns,
  onResetColumns,
  searchValue,
  selectedRegion,
  selectedPlatform,
  selectedPipeline,
  selectedWatcher,
  selectedAssetCustodians,
  startDate,
  endDate,
  uniqueRegions,
  uniquePlatforms,
  uniquePipelines,
  uniqueWatchers,
  uniqueAssetCustodians,
  hasActiveFilters,
  loading,
  onAddAdvancedRule,
  onAdvancedFieldChange,
  onAdvancedJoinChange,
  onAdvancedOperatorChange,
  onAdvancedValueChange,
  onSearchChange,
  onRegionChange,
  onPlatformChange,
  onPipelineChange,
  onWatcherChange,
  onAssetCustodianChange,
  onStartDateChange,
  onEndDateChange,
  onClearFilters,
  onRemoveAdvancedRule,
  onExportToExcel,
  onRefresh,
}) {
  const [dateRangeMenuAnchor, setDateRangeMenuAnchor] = useState(null);
  const [isCustomRangeDialogOpen, setIsCustomRangeDialogOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const dateRangeActive = Boolean(startDate || endDate);
  const dateRangeAccentRgb = hexToRgb(DATE_RANGE_ACCENT);
  const datePickerFieldSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 999,
      "& fieldset": { borderColor: "rgba(148, 163, 184, 0.32)" },
      "&:hover fieldset": { borderColor: `rgba(${dateRangeAccentRgb}, 0.6)` },
      "&.Mui-focused fieldset": { borderColor: DATE_RANGE_ACCENT },
    },
    "& .MuiSvgIcon-root": { color: DATE_RANGE_ACCENT },
  };

  const getDateRangeDisplayText = () => {
    if (!startDate && !endDate) return "Release Date";
    if (startDate && endDate) {
      return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    }
    if (startDate) return `From ${startDate.toLocaleDateString()}`;
    if (endDate) return `Until ${endDate.toLocaleDateString()}`;
    return "Release Date";
  };

  const applyQuickDateRange = (range) => {
    const now = new Date();
    let nextStartDate = null;
    let nextEndDate = null;

    switch (range) {
      case "1day":
        nextStartDate = subDays(now, 1);
        nextEndDate = now;
        break;
      case "2days":
        nextStartDate = subDays(now, 2);
        nextEndDate = now;
        break;
      case "3days":
        nextStartDate = subDays(now, 3);
        nextEndDate = now;
        break;
      case "1week":
        nextStartDate = subWeeks(now, 1);
        nextEndDate = now;
        break;
      case "1month":
        nextStartDate = subMonths(now, 1);
        nextEndDate = now;
        break;
      case "custom":
        setIsCustomRangeDialogOpen(true);
        setDateRangeMenuAnchor(null);
        return;
      default:
        return;
    }

    onStartDateChange(nextStartDate);
    onEndDateChange(nextEndDate);
    setDateRangeMenuAnchor(null);
  };

  return (
    <>
      <SectionFilterBar
        searchPlaceholder="Search components..."
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        onSearchClear={() => onSearchChange({ target: { value: "" } })}
        searchSx={{ flex: "1 1 220px", minWidth: 200, maxWidth: 320 }}
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
            id: "component-db-region-select-label",
            label: "Region",
            value: selectedRegion,
            onChange: onRegionChange,
            allLabel: "All Regions",
            accentColor: "#60A5FA",
            icon: <RoomOutlinedIcon sx={selectIconSx("#60A5FA")} />,
            options: uniqueRegions.map((region) => ({ value: region, label: region })),
          },
          {
            id: "component-db-platform-select-label",
            label: "Platform",
            value: selectedPlatform,
            onChange: onPlatformChange,
            allLabel: "All Platforms",
            accentColor: "#F59E0B",
            icon: <CodeIcon sx={selectIconSx("#F59E0B")} />,
            options: uniquePlatforms.map((platform) => ({ value: platform, label: platform })),
          },
          {
            id: "component-db-pipeline-select-label",
            label: "Pipeline",
            value: selectedPipeline,
            onChange: onPipelineChange,
            minWidth: 140,
            allLabel: "All Pipelines",
            accentColor: "#22D3EE",
            icon: <AccountTreeOutlinedIcon sx={selectIconSx("#22D3EE")} />,
            options: uniquePipelines.map((pipeline) => ({ value: pipeline, label: pipeline })),
          },
          {
            id: "component-db-watcher-select-label",
            label: "Watcher",
            value: selectedWatcher,
            onChange: onWatcherChange,
            allLabel: "All Watchers",
            accentColor: "#34D399",
            icon: <VisibilityOutlinedIcon sx={selectIconSx("#34D399")} />,
            options: uniqueWatchers.map((watcher) => ({ value: watcher, label: watcher })),
          },
          {
            id: "component-db-asset-custodian-select-label",
            label: "Asset Custodian",
            value: selectedAssetCustodians,
            onChange: onAssetCustodianChange,
            minWidth: 150,
            multiple: true,
            allLabel: "All Custodians",
            accentColor: "#A78BFA",
            icon: <Groups2OutlinedIcon sx={selectIconSx("#A78BFA")} />,
            options: uniqueAssetCustodians.map((value) => ({ value, label: value })),
          },
        ]}
        extraFilters={
          <Box>
            <Button
              variant="outlined"
              size="small"
              onClick={(event) => setDateRangeMenuAnchor(event.currentTarget)}
              sx={{
                minWidth: 190,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                px: 1.5,
                borderRadius: 999,
                textTransform: "none",
                fontWeight: dateRangeActive ? 600 : 400,
                color: dateRangeActive ? "text.primary" : "text.secondary",
                borderColor: dateRangeActive
                  ? `rgba(${dateRangeAccentRgb}, 0.5)`
                  : "rgba(148, 163, 184, 0.32)",
                "&:hover": {
                  borderColor: `rgba(${dateRangeAccentRgb}, 0.7)`,
                  bgcolor: `rgba(${dateRangeAccentRgb}, 0.06)`,
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
                <CalendarTodayOutlinedIcon sx={selectIconSx(DATE_RANGE_ACCENT)} />
                <Typography
                  variant="body2"
                  noWrap
                  sx={{ fontWeight: "inherit", color: "inherit" }}
                >
                  {getDateRangeDisplayText()}
                </Typography>
              </Box>
              <ExpandMoreIcon fontSize="small" sx={{ flexShrink: 0, color: "text.secondary" }} />
            </Button>

            <Menu
              anchorEl={dateRangeMenuAnchor}
              open={Boolean(dateRangeMenuAnchor)}
              onClose={() => setDateRangeMenuAnchor(null)}
              PaperProps={{
                sx: {
                  mt: 1,
                  minWidth: 200,
                  borderRadius: "12px",
                  border: "1px solid rgba(148, 163, 184, 0.16)",
                  "& .MuiMenuItem-root": { borderRadius: "8px", mx: 0.75, my: 0.25, fontSize: 13 },
                  "& .MuiMenuItem-root:hover": { bgcolor: `rgba(${dateRangeAccentRgb}, 0.12)` },
                },
              }}
            >
              <MenuItem onClick={() => applyQuickDateRange("1day")}>Past 1 Day</MenuItem>
              <MenuItem onClick={() => applyQuickDateRange("2days")}>Past 2 Days</MenuItem>
              <MenuItem onClick={() => applyQuickDateRange("3days")}>Past 3 Days</MenuItem>
              <MenuItem onClick={() => applyQuickDateRange("1week")}>Past 1 Week</MenuItem>
              <MenuItem onClick={() => applyQuickDateRange("1month")}>Past 1 Month</MenuItem>
              <Divider />
              <MenuItem onClick={() => applyQuickDateRange("custom")}>Custom Range</MenuItem>
            </Menu>
          </Box>
        }
        showClearFilters={hasActiveFilters}
        onClearFilters={onClearFilters}
        actions={
          <>
            <ColumnChooserButton
              columns={columnChooserColumns}
              onToggle={onToggleColumn}
              onReorder={onReorderColumns}
              onReset={onResetColumns}
              triggerSx={tintedIconButtonSx("#A78BFA")}
            />

            <Tooltip title="Export to Excel">
              <IconButton size="small" onClick={onExportToExcel} sx={tintedIconButtonSx("#34D399")}>
                <FileDownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Refresh data">
              <span>
                <IconButton
                  size="small"
                  onClick={onRefresh}
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

      <AdvancedSearchPanel
        advancedOpen={advancedOpen}
        advancedField={advancedField}
        advancedFields={advancedFields}
        advancedJoin={advancedJoin}
        advancedOperator={advancedOperator}
        advancedOperatorOptions={advancedOperatorOptions}
        advancedRuleJoinOptions={advancedRuleJoinOptions}
        advancedRules={advancedRules}
        advancedValue={advancedValue}
        onAddAdvancedRule={onAddAdvancedRule}
        onAdvancedFieldChange={onAdvancedFieldChange}
        onAdvancedJoinChange={onAdvancedJoinChange}
        onAdvancedOperatorChange={onAdvancedOperatorChange}
        onAdvancedValueChange={onAdvancedValueChange}
        onRemoveAdvancedRule={onRemoveAdvancedRule}
      />

      <Dialog
        open={isCustomRangeDialogOpen}
        onClose={() => setIsCustomRangeDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            bgcolor: "background.paper",
            backgroundImage: "none",
          },
        }}
      >
        <DialogTitle
          sx={{
            m: 0,
            display: "flex",
            alignItems: "center",
            gap: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <CalendarTodayOutlinedIcon sx={selectIconSx(DATE_RANGE_ACCENT)} />
          <Typography variant="h6" sx={{ fontSize: "1.05rem", fontWeight: 700 }}>
            Select Release Date Range
          </Typography>
        </DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
              <DatePicker
                label="Release Start Date"
                value={startDate}
                onChange={onStartDateChange}
                slotProps={{ textField: { fullWidth: true, sx: datePickerFieldSx } }}
              />
              <DatePicker
                label="Release End Date"
                value={endDate}
                onChange={onEndDateChange}
                slotProps={{ textField: { fullWidth: true, sx: datePickerFieldSx } }}
              />
            </Box>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setIsCustomRangeDialogOpen(false)}
            sx={{ borderRadius: 999, textTransform: "none", color: "text.secondary" }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => setIsCustomRangeDialogOpen(false)}
            variant="contained"
            sx={{
              borderRadius: 999,
              textTransform: "none",
              bgcolor: DATE_RANGE_ACCENT,
              boxShadow: "none",
              "&:hover": { bgcolor: DATE_RANGE_ACCENT, filter: "brightness(0.92)", boxShadow: "none" },
            }}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

ComponentFilterBar.propTypes = {
  advancedField: PropTypes.string.isRequired,
  advancedFields: PropTypes.arrayOf(PropTypes.object).isRequired,
  advancedJoin: PropTypes.string.isRequired,
  advancedOperator: PropTypes.string.isRequired,
  advancedOperatorOptions: PropTypes.arrayOf(PropTypes.object).isRequired,
  advancedRuleJoinOptions: PropTypes.arrayOf(PropTypes.object).isRequired,
  advancedRules: PropTypes.arrayOf(PropTypes.object).isRequired,
  advancedValue: PropTypes.string.isRequired,
  columnChooserColumns: PropTypes.arrayOf(PropTypes.object).isRequired,
  endDate: PropTypes.instanceOf(Date),
  hasActiveFilters: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
  onAddAdvancedRule: PropTypes.func.isRequired,
  onAdvancedFieldChange: PropTypes.func.isRequired,
  onAdvancedJoinChange: PropTypes.func.isRequired,
  onAdvancedOperatorChange: PropTypes.func.isRequired,
  onAdvancedValueChange: PropTypes.func.isRequired,
  onAssetCustodianChange: PropTypes.func.isRequired,
  onClearFilters: PropTypes.func.isRequired,
  onEndDateChange: PropTypes.func.isRequired,
  onExportToExcel: PropTypes.func.isRequired,
  onPipelineChange: PropTypes.func.isRequired,
  onPlatformChange: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onRegionChange: PropTypes.func.isRequired,
  onRemoveAdvancedRule: PropTypes.func.isRequired,
  onReorderColumns: PropTypes.func.isRequired,
  onResetColumns: PropTypes.func.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onToggleColumn: PropTypes.func.isRequired,
  onStartDateChange: PropTypes.func.isRequired,
  onWatcherChange: PropTypes.func.isRequired,
  searchValue: PropTypes.string.isRequired,
  selectedPipeline: PropTypes.string.isRequired,
  selectedPlatform: PropTypes.string.isRequired,
  selectedRegion: PropTypes.string.isRequired,
  selectedWatcher: PropTypes.string.isRequired,
  selectedAssetCustodians: PropTypes.arrayOf(PropTypes.string).isRequired,
  startDate: PropTypes.instanceOf(Date),
  uniquePipelines: PropTypes.arrayOf(PropTypes.string).isRequired,
  uniquePlatforms: PropTypes.arrayOf(PropTypes.string).isRequired,
  uniqueRegions: PropTypes.arrayOf(PropTypes.string).isRequired,
  uniqueWatchers: PropTypes.arrayOf(PropTypes.string).isRequired,
  uniqueAssetCustodians: PropTypes.arrayOf(PropTypes.string).isRequired,
};

ComponentFilterBar.defaultProps = {
  endDate: null,
  startDate: null,
};

export default ComponentFilterBar;
