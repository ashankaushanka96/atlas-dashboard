import { useState } from "react";
import PropTypes from "prop-types";
import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import TuneIcon from "@mui/icons-material/Tune";
import RoomOutlinedIcon from "@mui/icons-material/RoomOutlined";
import ComputerOutlinedIcon from "@mui/icons-material/ComputerOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import GppGoodOutlinedIcon from "@mui/icons-material/GppGoodOutlined";
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

function HostDetailsFilterBar({
  advancedField,
  advancedFields,
  advancedJoin,
  advancedOperator,
  advancedOperatorOptions,
  advancedRuleJoinOptions,
  advancedRules,
  advancedValue,
  columnChooserColumns,
  onAddAdvancedRule,
  onAdvancedFieldChange,
  onAdvancedJoinChange,
  onAdvancedOperatorChange,
  onAdvancedValueChange,
  loading,
  onClearFilters,
  onAssetCustodianChange,
  onCompliantStatusChange,
  onExportToExcel,
  onOsChange,
  onRefreshFromAws,
  onRefreshFromDb,
  onRegionChange,
  onSearchChange,
  onWatcherStatusChange,
  onRemoveAdvancedRule,
  onToggleColumn,
  onReorderColumns,
  onResetColumns,
  searchValue,
  selectedAssetCustodians,
  selectedCompliantStatus,
  selectedOs,
  selectedRegion,
  selectedWatcherStatus,
  showClearFilters,
  uniqueAssetCustodians,
  uniqueCompliantStatuses,
  uniqueOsValues,
  uniqueRegions,
  uniqueWatcherStatuses,
  formatStatusLabel,
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <>
      <SectionFilterBar
        searchPlaceholder="Search server details..."
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        onSearchClear={() => onSearchChange({ target: { value: "" } })}
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
            id: "server-details-region-select-label",
            label: "Region",
            value: selectedRegion,
            onChange: onRegionChange,
            allLabel: "All Regions",
            accentColor: "#60A5FA",
            icon: <RoomOutlinedIcon sx={selectIconSx("#60A5FA")} />,
            options: uniqueRegions.map((region) => ({ value: region, label: region })),
          },
          {
            id: "server-details-os-select-label",
            label: "OS",
            value: selectedOs,
            onChange: onOsChange,
            allLabel: "All OS",
            accentColor: "#34D399",
            icon: <ComputerOutlinedIcon sx={selectIconSx("#34D399")} />,
            options: uniqueOsValues.map((osValue) => ({ value: osValue, label: osValue })),
          },
          {
            id: "server-details-watcher-select-label",
            label: "Watcher Status",
            value: selectedWatcherStatus,
            onChange: onWatcherStatusChange,
            minWidth: 140,
            allLabel: "All Watchers",
            accentColor: "#34D399",
            icon: <VisibilityOutlinedIcon sx={selectIconSx("#34D399")} />,
            options: uniqueWatcherStatuses.map((status) => ({
              value: status,
              label: formatStatusLabel(status),
            })),
          },
          {
            id: "server-details-compliant-select-label",
            label: "Compliant Status",
            value: selectedCompliantStatus,
            onChange: onCompliantStatusChange,
            minWidth: 150,
            allLabel: "All Statuses",
            accentColor: "#F59E0B",
            icon: <GppGoodOutlinedIcon sx={selectIconSx("#F59E0B")} />,
            options: uniqueCompliantStatuses.map((status) => ({
              value: status,
              label: formatStatusLabel(status),
            })),
          },
          {
            id: "server-details-asset-custodian-select-label",
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

            <Tooltip title="Refresh from DB and update cache">
              <span>
                <IconButton
                  size="small"
                  onClick={onRefreshFromDb}
                  disabled={loading}
                  sx={tintedIconButtonSx("#60A5FA")}
                >
                  {loading ? <CircularProgress size={18} /> : <StorageRoundedIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Full refresh from AWS">
              <span>
                <IconButton
                  size="small"
                  onClick={onRefreshFromAws}
                  disabled={loading}
                  sx={tintedIconButtonSx("#F59E0B")}
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
          return optionLabel || (fieldConfig?.type === "enum" ? formatStatusLabel(rule.value) : rule.value);
        }}
      />
    </>
  );
}

HostDetailsFilterBar.propTypes = {
  advancedField: PropTypes.string.isRequired,
  advancedFields: PropTypes.arrayOf(PropTypes.object).isRequired,
  advancedJoin: PropTypes.string.isRequired,
  advancedOperator: PropTypes.string.isRequired,
  advancedOperatorOptions: PropTypes.arrayOf(PropTypes.object).isRequired,
  advancedRuleJoinOptions: PropTypes.arrayOf(PropTypes.object).isRequired,
  advancedRules: PropTypes.arrayOf(PropTypes.object).isRequired,
  advancedValue: PropTypes.string.isRequired,
  columnChooserColumns: PropTypes.arrayOf(PropTypes.object).isRequired,
  formatStatusLabel: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  onAddAdvancedRule: PropTypes.func.isRequired,
  onAdvancedFieldChange: PropTypes.func.isRequired,
  onAdvancedJoinChange: PropTypes.func.isRequired,
  onAdvancedOperatorChange: PropTypes.func.isRequired,
  onAdvancedValueChange: PropTypes.func.isRequired,
  onAssetCustodianChange: PropTypes.func.isRequired,
  onClearFilters: PropTypes.func.isRequired,
  onCompliantStatusChange: PropTypes.func.isRequired,
  onExportToExcel: PropTypes.func.isRequired,
  onOsChange: PropTypes.func.isRequired,
  onRefreshFromAws: PropTypes.func.isRequired,
  onRefreshFromDb: PropTypes.func.isRequired,
  onRegionChange: PropTypes.func.isRequired,
  onRemoveAdvancedRule: PropTypes.func.isRequired,
  onReorderColumns: PropTypes.func.isRequired,
  onResetColumns: PropTypes.func.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onToggleColumn: PropTypes.func.isRequired,
  onWatcherStatusChange: PropTypes.func.isRequired,
  searchValue: PropTypes.string.isRequired,
  selectedAssetCustodians: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedCompliantStatus: PropTypes.string.isRequired,
  selectedOs: PropTypes.string.isRequired,
  selectedRegion: PropTypes.string.isRequired,
  selectedWatcherStatus: PropTypes.string.isRequired,
  showClearFilters: PropTypes.bool.isRequired,
  uniqueAssetCustodians: PropTypes.arrayOf(PropTypes.string).isRequired,
  uniqueCompliantStatuses: PropTypes.arrayOf(PropTypes.string).isRequired,
  uniqueOsValues: PropTypes.arrayOf(PropTypes.string).isRequired,
  uniqueRegions: PropTypes.arrayOf(PropTypes.string).isRequired,
  uniqueWatcherStatuses: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default HostDetailsFilterBar;
