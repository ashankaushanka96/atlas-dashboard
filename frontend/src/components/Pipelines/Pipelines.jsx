import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import AltRouteRoundedIcon from "@mui/icons-material/AltRouteRounded";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import WidgetsIcon from "@mui/icons-material/Widgets";
import { useNavigate } from "react-router-dom";

import { API } from "../../services/auth";
import ErrorModal from "../../modals/ErrorModal";
import StatusChip from "../HostDetails/StatusChip";
import {
  ADVANCED_OPERATORS,
  ADVANCED_RULE_JOIN_OPTIONS,
  applyAdvancedRules,
  buildAdvancedFieldMap,
  getAdvancedOperatorOptions,
} from "../shared/advancedSearchUtils";
import PipelinesFilterBar from "./PipelinesFilterBar";
import PipelinesTable from "./PipelinesTable";
import { formatRepoTitle, normalizeRepoKey } from "./pipelinesUtils";

const HEADER_ACCENT = "#FF6B35";

function Pipelines() {
  const navigate = useNavigate();
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openErrorModal, setOpenErrorModal] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedRepository, setSelectedRepository] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [selectedVersion, setSelectedVersion] = useState("");
  const [advancedRules, setAdvancedRules] = useState([]);
  const [advancedJoin, setAdvancedJoin] = useState("AND");
  const [advancedField, setAdvancedField] = useState("code_repo_url");
  const [advancedOperator, setAdvancedOperator] = useState("contains");
  const [advancedValue, setAdvancedValue] = useState("");

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
      setComponents(response.data.components || []);
    } catch (err) {
      showErrorModal(err.response?.data?.error_message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  const pipelineConfiguredComponents = useMemo(
    () =>
      components.filter(
        (component) => String(component.pipeline || "").toLowerCase() === "configured"
      ),
    [components]
  );

  const uniqueRepositories = useMemo(
    () =>
      [...new Set(pipelineConfiguredComponents.map((component) => String(component.code_repo_url || "").trim()))]
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" })),
    [pipelineConfiguredComponents]
  );

  const uniqueRegions = useMemo(
    () =>
      [...new Set(pipelineConfiguredComponents.map((component) => component.region))]
        .filter(Boolean)
        .sort(),
    [pipelineConfiguredComponents]
  );

  const uniquePlatforms = useMemo(
    () =>
      [...new Set(pipelineConfiguredComponents.map((component) => component.platform))]
        .filter(Boolean)
        .sort(),
    [pipelineConfiguredComponents]
  );

  const uniqueVersions = useMemo(
    () =>
      [...new Set(pipelineConfiguredComponents.map((component) => component.comp_version))]
        .filter(Boolean)
        .sort((left, right) => String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" })),
    [pipelineConfiguredComponents]
  );

  const advancedFields = useMemo(
    () => [
      {
        value: "code_repo_url",
        label: "Repository URL",
        type: "enum",
        options: uniqueRepositories.map((repo) => ({ value: repo, label: formatRepoTitle(repo) })),
      },
      {
        value: "repo_title",
        label: "Repository",
        type: "text",
      },
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
        value: "component_name",
        label: "Component Name",
        type: "text",
      },
      {
        value: "platform",
        label: "Platform",
        type: "enum",
        options: uniquePlatforms.map((platform) => ({ value: platform, label: platform })),
      },
      {
        value: "comp_version",
        label: "Current Version",
        type: "enum",
        options: uniqueVersions.map((version) => ({ value: version, label: version })),
      },
      {
        value: "comp_path",
        label: "Component Path",
        type: "text",
      },
    ],
    [uniquePlatforms, uniqueRegions, uniqueRepositories, uniqueVersions]
  );

  const advancedFieldMap = useMemo(() => buildAdvancedFieldMap(advancedFields), [advancedFields]);
  const selectedAdvancedFieldConfig =
    advancedFieldMap[advancedField] || advancedFields[0] || null;
  const selectedAdvancedOperatorOptions = getAdvancedOperatorOptions(selectedAdvancedFieldConfig);

  const filteredComponents = useMemo(() => {
    let filtered = pipelineConfiguredComponents;

    if (searchValue) {
      const term = searchValue.toLowerCase();
      filtered = filtered.filter((component) => {
        const repo = String(component.code_repo_url || "");
        return (
          String(component.component_name || "").toLowerCase().includes(term) ||
          String(component.region || "").toLowerCase().includes(term) ||
          String(component.ip || "").toLowerCase().includes(term) ||
          String(component.platform || "").toLowerCase().includes(term) ||
          String(component.comp_path || "").toLowerCase().includes(term) ||
          String(component.comp_version || "").toLowerCase().includes(term) ||
          repo.toLowerCase().includes(term) ||
          formatRepoTitle(repo).toLowerCase().includes(term)
        );
      });
    }

    if (selectedRepository) {
      filtered = filtered.filter(
        (component) => String(component.code_repo_url || "").trim() === selectedRepository
      );
    }

    if (selectedRegion) {
      filtered = filtered.filter(
        (component) => String(component.region || "").toLowerCase() === selectedRegion.toLowerCase()
      );
    }

    if (selectedPlatform) {
      filtered = filtered.filter(
        (component) => String(component.platform || "").toLowerCase() === selectedPlatform.toLowerCase()
      );
    }

    if (selectedVersion) {
      filtered = filtered.filter(
        (component) => String(component.comp_version || "") === selectedVersion
      );
    }

    if (advancedRules.length) {
      filtered = filtered.filter((component) =>
        applyAdvancedRules(component, advancedRules, advancedFieldMap, (item, field) => {
          if (field === "repo_title") {
            return formatRepoTitle(item.code_repo_url);
          }
          return String(item[field] ?? "").trim();
        })
      );
    }

    return filtered;
  }, [
    advancedFieldMap,
    advancedRules,
    pipelineConfiguredComponents,
    searchValue,
    selectedPlatform,
    selectedRegion,
    selectedRepository,
    selectedVersion,
  ]);

  const groupedPipelines = useMemo(() => {
    const groups = new Map();

    filteredComponents.forEach((component) => {
      const key = normalizeRepoKey(component.code_repo_url);
      const currentGroup = groups.get(key) || {
        key,
        codeRepoUrl: String(component.code_repo_url || "").trim(),
        components: [],
      };
      currentGroup.components.push(component);
      groups.set(key, currentGroup);
    });

    return [...groups.values()]
      .map((group) => ({
        ...group,
        components: group.components.sort((left, right) =>
          String(left.component_name || "").localeCompare(String(right.component_name || ""), undefined, {
            numeric: true,
            sensitivity: "base",
          })
        ),
      }))
      .sort((left, right) => {
        if (!left.codeRepoUrl && !right.codeRepoUrl) return 0;
        if (!left.codeRepoUrl) return 1;
        if (!right.codeRepoUrl) return -1;
        return left.codeRepoUrl.localeCompare(right.codeRepoUrl, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });
  }, [filteredComponents]);

  const handleCopyToClipboard = (text) => {
    if (!text) return;

    if (navigator.clipboard?.writeText) {
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

  const handleOpenComponentDb = (component) => {
    const nextParams = new URLSearchParams();
    if (component.region) nextParams.set("region", component.region);
    if (component.ip && component.component_name) {
      nextParams.set("search", `${component.ip} ${component.component_name}`);
    } else if (component.component_name) {
      nextParams.set("search", component.component_name);
    }
    navigate(`/component-db?${nextParams.toString()}`);
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
    if (!fieldConfig) return;

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
  };

  const handleRemoveAdvancedRule = (ruleId) => {
    setAdvancedRules((currentRules) => currentRules.filter((rule) => rule.id !== ruleId));
  };

  const hasActiveFilters = Boolean(
    searchValue ||
      selectedRepository ||
      selectedRegion ||
      selectedPlatform ||
      selectedVersion ||
      advancedRules.length
  );

  const clearFilters = () => {
    setSearchValue("");
    setSelectedRepository("");
    setSelectedRegion("");
    setSelectedPlatform("");
    setSelectedVersion("");
    setAdvancedRules([]);
    setAdvancedJoin("AND");
    setAdvancedField("code_repo_url");
    setAdvancedOperator("contains");
    setAdvancedValue("");
  };

  return (
    <Box
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
      <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AltRouteRoundedIcon sx={{ color: HEADER_ACCENT }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Pipelines
          </Typography>
        </Box>

        <StatusChip
          label={`${groupedPipelines.length} repositories`}
          color="#22D3EE"
          Icon={AccountTreeOutlinedIcon}
        />

        <StatusChip
          label={`${filteredComponents.length} pipeline configured components`}
          color="#34D399"
          Icon={WidgetsIcon}
        />
      </Box>

      <PipelinesFilterBar
        advancedField={advancedField}
        advancedFields={advancedFields}
        advancedJoin={advancedJoin}
        advancedOperator={advancedOperator}
        advancedOperatorOptions={selectedAdvancedOperatorOptions}
        advancedRuleJoinOptions={ADVANCED_RULE_JOIN_OPTIONS}
        advancedRules={advancedRules}
        advancedValue={advancedValue}
        onAddAdvancedRule={handleAddAdvancedRule}
        onAdvancedFieldChange={handleAdvancedFieldChange}
        onAdvancedJoinChange={(event) => setAdvancedJoin(event.target.value)}
        onAdvancedOperatorChange={(event) => setAdvancedOperator(event.target.value)}
        onAdvancedValueChange={(event) => setAdvancedValue(event.target.value)}
        loading={loading}
        onClearFilters={clearFilters}
        onRefresh={() => fetchComponents(true)}
        onRemoveAdvancedRule={handleRemoveAdvancedRule}
        onSearchChange={(event) => setSearchValue(event.target.value)}
        onSelectedPlatformChange={(event) => setSelectedPlatform(event.target.value)}
        onSelectedRegionChange={(event) => setSelectedRegion(event.target.value)}
        onSelectedRepositoryChange={(event) => setSelectedRepository(event.target.value)}
        onSelectedVersionChange={(event) => setSelectedVersion(event.target.value)}
        searchValue={searchValue}
        selectedPlatform={selectedPlatform}
        selectedRegion={selectedRegion}
        selectedRepository={selectedRepository}
        selectedVersion={selectedVersion}
        showClearFilters={hasActiveFilters}
        uniquePlatforms={uniquePlatforms}
        uniqueRegions={uniqueRegions}
        uniqueRepositories={uniqueRepositories}
        uniqueVersions={uniqueVersions}
      />

      <Box sx={{ flex: "1 1 0", minHeight: 0, overflow: "auto" }}>
        <PipelinesTable
          error={error}
          groupedPipelines={groupedPipelines}
          hasActiveFilters={hasActiveFilters}
          loading={loading}
          onCopyToClipboard={handleCopyToClipboard}
          onOpenComponentDb={handleOpenComponentDb}
        />
      </Box>

      <ErrorModal
        wrapperRef={{ current: document.body }}
        open={openErrorModal}
        error={error}
        onClose={() => setOpenErrorModal(false)}
      />
    </Box>
  );
}

export default Pipelines;
