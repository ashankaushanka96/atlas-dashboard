import { useState } from "react";
import PropTypes from "prop-types";
import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import TuneIcon from "@mui/icons-material/Tune";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import RoomOutlinedIcon from "@mui/icons-material/RoomOutlined";
import CodeIcon from "@mui/icons-material/Code";
import NewReleasesOutlinedIcon from "@mui/icons-material/NewReleasesOutlined";

import AdvancedSearchPanel from "../shared/AdvancedSearchPanel";
import SectionFilterBar from "../shared/SectionFilterBar";
import hexToRgb from "../shared/hexToRgb";
import { formatRepoTitle } from "./pipelinesUtils";

const tintedIconButtonSx = (color) => ({
  color,
  bgcolor: `rgba(${hexToRgb(color)}, 0.12)`,
  "&:hover": { bgcolor: `rgba(${hexToRgb(color)}, 0.24)` },
  "&.Mui-disabled": { color: "text.disabled", bgcolor: "transparent" },
});

const selectIconSx = (color) => ({ fontSize: 16, color });

function PipelinesFilterBar({
  advancedField,
  advancedFields,
  advancedJoin,
  advancedOperator,
  advancedOperatorOptions,
  advancedRuleJoinOptions,
  advancedRules,
  advancedValue,
  loading,
  onAddAdvancedRule,
  onAdvancedFieldChange,
  onAdvancedJoinChange,
  onAdvancedOperatorChange,
  onAdvancedValueChange,
  onClearFilters,
  onRefresh,
  onRemoveAdvancedRule,
  onSearchChange,
  onSelectedPlatformChange,
  onSelectedRegionChange,
  onSelectedRepositoryChange,
  onSelectedVersionChange,
  searchValue,
  selectedPlatform,
  selectedRegion,
  selectedRepository,
  selectedVersion,
  showClearFilters,
  uniquePlatforms,
  uniqueRegions,
  uniqueRepositories,
  uniqueVersions,
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <>
      <SectionFilterBar
        searchPlaceholder="Search repositories, components, IPs..."
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        onSearchClear={() => onSearchChange({ target: { value: "" } })}
        searchSx={{ flex: "1 1 260px", minWidth: 220, maxWidth: 420 }}
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
            id: "pipelines-repository-select-label",
            label: "Repository",
            value: selectedRepository,
            onChange: onSelectedRepositoryChange,
            minWidth: 220,
            allLabel: "All Repositories",
            accentColor: "#22D3EE",
            icon: <AccountTreeOutlinedIcon sx={selectIconSx("#22D3EE")} />,
            options: uniqueRepositories.map((repo) => ({
              value: repo,
              label: formatRepoTitle(repo),
            })),
          },
          {
            id: "pipelines-region-select-label",
            label: "Region",
            value: selectedRegion,
            onChange: onSelectedRegionChange,
            allLabel: "All Regions",
            accentColor: "#60A5FA",
            icon: <RoomOutlinedIcon sx={selectIconSx("#60A5FA")} />,
            options: uniqueRegions.map((region) => ({ value: region, label: region })),
          },
          {
            id: "pipelines-platform-select-label",
            label: "Platform",
            value: selectedPlatform,
            onChange: onSelectedPlatformChange,
            allLabel: "All Platforms",
            accentColor: "#F59E0B",
            icon: <CodeIcon sx={selectIconSx("#F59E0B")} />,
            options: uniquePlatforms.map((platform) => ({ value: platform, label: platform })),
          },
          {
            id: "pipelines-version-select-label",
            label: "Current Version",
            value: selectedVersion,
            onChange: onSelectedVersionChange,
            minWidth: 180,
            allLabel: "All Versions",
            accentColor: "#A78BFA",
            icon: <NewReleasesOutlinedIcon sx={selectIconSx("#A78BFA")} />,
            options: uniqueVersions.map((version) => ({ value: version, label: version })),
          },
        ]}
        showClearFilters={showClearFilters}
        onClearFilters={onClearFilters}
        actions={
          <Tooltip title="Refresh pipelines">
            <span>
              <IconButton onClick={onRefresh} disabled={loading} sx={tintedIconButtonSx("#60A5FA")}>
                {loading ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
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
          return optionLabel || rule.value;
        }}
      />
    </>
  );
}

PipelinesFilterBar.propTypes = {
  advancedField: PropTypes.string.isRequired,
  advancedFields: PropTypes.arrayOf(PropTypes.object).isRequired,
  advancedJoin: PropTypes.string.isRequired,
  advancedOperator: PropTypes.string.isRequired,
  advancedOperatorOptions: PropTypes.arrayOf(PropTypes.object).isRequired,
  advancedRuleJoinOptions: PropTypes.arrayOf(PropTypes.object).isRequired,
  advancedRules: PropTypes.arrayOf(PropTypes.object).isRequired,
  advancedValue: PropTypes.string.isRequired,
  loading: PropTypes.bool.isRequired,
  onAddAdvancedRule: PropTypes.func.isRequired,
  onAdvancedFieldChange: PropTypes.func.isRequired,
  onAdvancedJoinChange: PropTypes.func.isRequired,
  onAdvancedOperatorChange: PropTypes.func.isRequired,
  onAdvancedValueChange: PropTypes.func.isRequired,
  onClearFilters: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onRemoveAdvancedRule: PropTypes.func.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onSelectedPlatformChange: PropTypes.func.isRequired,
  onSelectedRegionChange: PropTypes.func.isRequired,
  onSelectedRepositoryChange: PropTypes.func.isRequired,
  onSelectedVersionChange: PropTypes.func.isRequired,
  searchValue: PropTypes.string.isRequired,
  selectedPlatform: PropTypes.string.isRequired,
  selectedRegion: PropTypes.string.isRequired,
  selectedRepository: PropTypes.string.isRequired,
  selectedVersion: PropTypes.string.isRequired,
  showClearFilters: PropTypes.bool.isRequired,
  uniquePlatforms: PropTypes.arrayOf(PropTypes.string).isRequired,
  uniqueRegions: PropTypes.arrayOf(PropTypes.string).isRequired,
  uniqueRepositories: PropTypes.arrayOf(PropTypes.string).isRequired,
  uniqueVersions: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default PipelinesFilterBar;
