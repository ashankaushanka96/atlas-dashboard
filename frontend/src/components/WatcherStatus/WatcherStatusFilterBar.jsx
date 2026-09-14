import { useState } from "react";
import PropTypes from "prop-types";
import { Box, CircularProgress, IconButton, Tooltip } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import TuneIcon from "@mui/icons-material/Tune";
import RoomOutlinedIcon from "@mui/icons-material/RoomOutlined";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import SettingsEthernetIcon from "@mui/icons-material/SettingsEthernet";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";

import AdvancedSearchPanel from "../shared/AdvancedSearchPanel";
import ColumnChooserButton from "../shared/ColumnChooserButton";
import SectionFilterBar from "../shared/SectionFilterBar";
import hexToRgb from "../shared/hexToRgb";
import { formatStatusLabel } from "./statusChipUtils";

const tintedIconButtonSx = (color) => ({
  color,
  bgcolor: `rgba(${hexToRgb(color)}, 0.12)`,
  "&:hover": { bgcolor: `rgba(${hexToRgb(color)}, 0.24)` },
  "&.Mui-disabled": { color: "text.disabled", bgcolor: "transparent" },
});

const selectIconSx = (color) => ({ fontSize: 16, color });

function WatcherStatusFilterBar({
  advancedField,
  advancedFields,
  advancedJoin,
  advancedOperator,
  advancedOperatorOptions,
  advancedRuleJoinOptions,
  advancedRules,
  advancedValue,
  columnChooserColumns,
  loading,
  onAddAdvancedRule,
  onAdvancedFieldChange,
  onAdvancedJoinChange,
  onAdvancedOperatorChange,
  onAdvancedValueChange,
  onAssetCustodianChange,
  onClearFilters,
  onExportToExcel,
  onPortStatusChange,
  onProcessStatusChange,
  onRefresh,
  onRegionChange,
  onRemoveAdvancedRule,
  onReorderColumns,
  onResetColumns,
  onSearchChange,
  onToggleColumn,
  searchValue,
  selectedAssetCustodians,
  selectedPortStatus,
  selectedProcessStatus,
  selectedRegion,
  showClearFilters,
  uniqueAssetCustodians,
  uniquePortStatuses,
  uniqueProcessStatuses,
  uniqueRegions,
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <Box sx={{ mb: 2 }}>
      <SectionFilterBar
        searchPlaceholder="Search components..."
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        onSearchClear={() => onSearchChange({ target: { value: "" } })}
        searchSx={{ flex: "1 1 220px", minWidth: 180, maxWidth: 300 }}
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
            id: "watcher-status-region-select-label",
            label: "Region",
            value: selectedRegion,
            onChange: onRegionChange,
            allLabel: "All Regions",
            accentColor: "#60A5FA",
            icon: <RoomOutlinedIcon sx={selectIconSx("#60A5FA")} />,
            options: uniqueRegions.map((region) => ({ value: region, label: region })),
          },
          {
            id: "watcher-status-process-select-label",
            label: "Process Status",
            value: selectedProcessStatus,
            onChange: onProcessStatusChange,
            minWidth: 150,
            allLabel: "All Statuses",
            accentColor: "#34D399",
            icon: <PlayCircleOutlineIcon sx={selectIconSx("#34D399")} />,
            options: uniqueProcessStatuses.map((status) => ({
              value: status,
              label: formatStatusLabel(status),
            })),
          },
          {
            id: "watcher-status-port-select-label",
            label: "Port Status",
            value: selectedPortStatus,
            onChange: onPortStatusChange,
            minWidth: 150,
            allLabel: "All Port Statuses",
            accentColor: "#22D3EE",
            icon: <SettingsEthernetIcon sx={selectIconSx("#22D3EE")} />,
            options: uniquePortStatuses.map((status) => ({
              value: status,
              label: formatStatusLabel(status),
            })),
          },
          {
            id: "watcher-status-asset-custodian-select-label",
            label: "Asset Custodian",
            value: selectedAssetCustodians,
            onChange: onAssetCustodianChange,
            minWidth: 150,
            multiple: true,
            allLabel: "All Asset Custodians",
            accentColor: "#A78BFA",
            icon: <Groups2OutlinedIcon sx={selectIconSx("#A78BFA")} />,
            options: uniqueAssetCustodians.map((value) => ({ value, label: value })),
          },
        ]}
        showClearFilters={showClearFilters}
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
        renderValueLabel={(rule, fieldConfig) => {
          const optionLabel =
            fieldConfig?.options?.find((option) => option.value === rule.value)?.label || null;
          return (
            optionLabel ||
            (fieldConfig?.type === "number" ? rule.value : formatStatusLabel(rule.value))
          );
        }}
      />
    </Box>
  );
}

WatcherStatusFilterBar.propTypes = {
  advancedField: PropTypes.string.isRequired,
  advancedFields: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
      options: PropTypes.arrayOf(
        PropTypes.shape({
          label: PropTypes.string.isRequired,
          value: PropTypes.string.isRequired,
        })
      ),
    })
  ).isRequired,
  advancedJoin: PropTypes.string.isRequired,
  advancedOperator: PropTypes.string.isRequired,
  advancedOperatorOptions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    })
  ).isRequired,
  advancedRuleJoinOptions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    })
  ).isRequired,
  advancedRules: PropTypes.arrayOf(
    PropTypes.shape({
      field: PropTypes.string.isRequired,
      id: PropTypes.string.isRequired,
      join: PropTypes.string.isRequired,
      operator: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    })
  ).isRequired,
  advancedValue: PropTypes.string.isRequired,
  columnChooserColumns: PropTypes.arrayOf(PropTypes.object).isRequired,
  loading: PropTypes.bool.isRequired,
  onAddAdvancedRule: PropTypes.func.isRequired,
  onAdvancedFieldChange: PropTypes.func.isRequired,
  onAdvancedJoinChange: PropTypes.func.isRequired,
  onAdvancedOperatorChange: PropTypes.func.isRequired,
  onAdvancedValueChange: PropTypes.func.isRequired,
  onAssetCustodianChange: PropTypes.func.isRequired,
  onClearFilters: PropTypes.func.isRequired,
  onExportToExcel: PropTypes.func.isRequired,
  onPortStatusChange: PropTypes.func.isRequired,
  onProcessStatusChange: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onRegionChange: PropTypes.func.isRequired,
  onRemoveAdvancedRule: PropTypes.func.isRequired,
  onReorderColumns: PropTypes.func.isRequired,
  onResetColumns: PropTypes.func.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onToggleColumn: PropTypes.func.isRequired,
  searchValue: PropTypes.string.isRequired,
  selectedAssetCustodians: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedPortStatus: PropTypes.string.isRequired,
  selectedProcessStatus: PropTypes.string.isRequired,
  selectedRegion: PropTypes.string.isRequired,
  showClearFilters: PropTypes.bool.isRequired,
  uniqueAssetCustodians: PropTypes.arrayOf(PropTypes.string).isRequired,
  uniquePortStatuses: PropTypes.arrayOf(PropTypes.string).isRequired,
  uniqueProcessStatuses: PropTypes.arrayOf(PropTypes.string).isRequired,
  uniqueRegions: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default WatcherStatusFilterBar;
