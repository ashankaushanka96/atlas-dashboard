/* SchedulerFilterBar.jsx */
import { useState } from "react";
import authService from "../../services/auth";
import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CloudQueueIcon from "@mui/icons-material/CloudQueue";
import TuneIcon from "@mui/icons-material/Tune";
import RoomOutlinedIcon from "@mui/icons-material/RoomOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import ToggleOnOutlinedIcon from "@mui/icons-material/ToggleOnOutlined";
import PropTypes from "prop-types";
import ErrorModal from "../../modals/ErrorModal";
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

function SchedulerFilterBar({
  wrapperRef,
  advancedField,
  advancedFields,
  advancedJoin,
  advancedOperator,
  advancedOperatorOptions,
  advancedRuleJoinOptions,
  advancedRules,
  advancedValue,
  columnChooserColumns,
  selectedRegion,
  selectedStatus,
  selectedAction,
  selectedScheduleEnabled,
  localSearch,
  uniqueRegions,
  uniqueStatuses,
  uniqueActions,
  uniqueScheduleEnabled,
  handleAddAdvancedRule,
  handleAdvancedFieldChange,
  handleAdvancedJoinChange,
  handleAdvancedOperatorChange,
  handleAdvancedValueChange,
  handleRegionChange,
  handleStatusChange,
  handleActionChange,
  handleScheduleEnabledChange,
  handleSearchChange,
  handleRemoveAdvancedRule,
  clearFilters,
  exportToExcel,
  onRefresh,
  onToggleColumn,
  onReorderColumns,
  onResetColumns,
  loading,
  onOpenModal,
  onOpenLambda,
}) {
  const permissions = authService.getPermissions();
  const [cautionOpen, setCautionOpen] = useState(false);
  const [cautionMessage, setCautionMessage] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const openCaution = (msg) => {
    setCautionMessage(msg);
    setCautionOpen(true);
  };
  const closeCaution = () => {
    setCautionOpen(false);
    setCautionMessage("");
  };

  const handleLambdaClick = () => {
    permissions.run_lambda
      ? onOpenLambda()
      : openCaution("You don't have access to run Lambda");
  };
  const handleAddTagsClick = () => {
    permissions.add_schedules
      ? onOpenModal()
      : openCaution("You don't have access to add tags");
  };

  const hasActiveFilters = Boolean(
    selectedRegion ||
      selectedStatus ||
      selectedAction ||
      selectedScheduleEnabled ||
      localSearch ||
      advancedRules.length
  );

  return (
    <>
      <SectionFilterBar
        searchPlaceholder="Search events..."
        searchValue={localSearch}
        onSearchChange={handleSearchChange}
        onSearchClear={() => handleSearchChange({ target: { value: "" } })}
        searchSx={{ flex: "1 1 200px", minWidth: 180, maxWidth: 280 }}
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
            id: "scheduler-region-select-label",
            label: "Region",
            value: selectedRegion,
            onChange: handleRegionChange,
            allLabel: "All Regions",
            accentColor: "#60A5FA",
            icon: <RoomOutlinedIcon sx={selectIconSx("#60A5FA")} />,
            options: uniqueRegions.map((region) => ({ value: region, label: region })),
          },
          {
            id: "scheduler-status-select-label",
            label: "Status",
            value: selectedStatus,
            onChange: handleStatusChange,
            allLabel: "All Statuses",
            accentColor: "#34D399",
            icon: <EventAvailableOutlinedIcon sx={selectIconSx("#34D399")} />,
            options: uniqueStatuses.map((status) => ({
              value: status,
              label: status === "executed" ? "Executed" : "Not Executed",
            })),
          },
          {
            id: "scheduler-action-select-label",
            label: "Action",
            value: selectedAction,
            onChange: handleActionChange,
            allLabel: "All Actions",
            accentColor: "#F59E0B",
            icon: <BoltOutlinedIcon sx={selectIconSx("#F59E0B")} />,
            options: uniqueActions.map((action) => ({ value: action, label: action })),
          },
          {
            id: "scheduler-schedule-enabled-select-label",
            label: "Schedule Enabled",
            value: selectedScheduleEnabled,
            onChange: handleScheduleEnabledChange,
            minWidth: 170,
            allLabel: "All",
            accentColor: "#A78BFA",
            icon: <ToggleOnOutlinedIcon sx={selectIconSx("#A78BFA")} />,
            options: uniqueScheduleEnabled.map((enabled) => ({
              value: enabled,
              label: enabled === "enabled" ? "Enabled" : "Disabled",
            })),
          },
        ]}
        showClearFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        actions={
          <>
            <ColumnChooserButton
              columns={columnChooserColumns}
              onToggle={onToggleColumn}
              onReorder={onReorderColumns}
              onReset={onResetColumns}
              triggerSx={tintedIconButtonSx("#A78BFA")}
            />

            <Tooltip title="Add / Modify Schedules">
              <IconButton size="small" onClick={handleAddTagsClick} sx={tintedIconButtonSx("#34D399")}>
                <AddCircleOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Run Lambda">
              <IconButton size="small" onClick={handleLambdaClick} sx={tintedIconButtonSx("#F59E0B")}>
                <CloudQueueIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Export to Excel">
              <IconButton size="small" onClick={exportToExcel} sx={tintedIconButtonSx("#22D3EE")}>
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

      <ErrorModal
        wrapperRef={wrapperRef}
        open={cautionOpen}
        error={cautionMessage}
        onClose={closeCaution}
        title="Caution"
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
        onAddAdvancedRule={handleAddAdvancedRule}
        onAdvancedFieldChange={handleAdvancedFieldChange}
        onAdvancedJoinChange={handleAdvancedJoinChange}
        onAdvancedOperatorChange={handleAdvancedOperatorChange}
        onAdvancedValueChange={handleAdvancedValueChange}
        onRemoveAdvancedRule={handleRemoveAdvancedRule}
        renderValueLabel={(rule, fieldConfig) => {
          const optionLabel =
            fieldConfig?.options?.find((option) => option.value === rule.value)?.label || null;
          return optionLabel || rule.value;
        }}
      />
    </>
  );
}

SchedulerFilterBar.propTypes = {
  wrapperRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }).isRequired,
  advancedField: PropTypes.string.isRequired,
  advancedFields: PropTypes.arrayOf(PropTypes.object).isRequired,
  advancedJoin: PropTypes.string.isRequired,
  advancedOperator: PropTypes.string.isRequired,
  advancedOperatorOptions: PropTypes.arrayOf(PropTypes.object).isRequired,
  advancedRuleJoinOptions: PropTypes.arrayOf(PropTypes.object).isRequired,
  advancedRules: PropTypes.arrayOf(PropTypes.object).isRequired,
  advancedValue: PropTypes.string.isRequired,
  columnChooserColumns: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedRegion: PropTypes.string.isRequired,
  selectedStatus: PropTypes.string.isRequired,
  selectedAction: PropTypes.string.isRequired,
  selectedScheduleEnabled: PropTypes.string.isRequired,
  localSearch: PropTypes.string.isRequired,
  uniqueRegions: PropTypes.array.isRequired,
  uniqueStatuses: PropTypes.array.isRequired,
  uniqueActions: PropTypes.array.isRequired,
  uniqueScheduleEnabled: PropTypes.array.isRequired,
  handleAddAdvancedRule: PropTypes.func.isRequired,
  handleAdvancedFieldChange: PropTypes.func.isRequired,
  handleAdvancedJoinChange: PropTypes.func.isRequired,
  handleAdvancedOperatorChange: PropTypes.func.isRequired,
  handleAdvancedValueChange: PropTypes.func.isRequired,
  handleRegionChange: PropTypes.func.isRequired,
  handleStatusChange: PropTypes.func.isRequired,
  handleActionChange: PropTypes.func.isRequired,
  handleScheduleEnabledChange: PropTypes.func.isRequired,
  handleSearchChange: PropTypes.func.isRequired,
  handleRemoveAdvancedRule: PropTypes.func.isRequired,
  clearFilters: PropTypes.func.isRequired,
  exportToExcel: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onToggleColumn: PropTypes.func.isRequired,
  onReorderColumns: PropTypes.func.isRequired,
  onResetColumns: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  onOpenModal: PropTypes.func.isRequired,
  onOpenLambda: PropTypes.func.isRequired,
};

export default SchedulerFilterBar;
