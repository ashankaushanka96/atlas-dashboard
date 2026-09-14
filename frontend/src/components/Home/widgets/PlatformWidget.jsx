import { useCallback } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import AppsIcon from "@mui/icons-material/Apps";
import { API } from "../../../services/auth";
import { DonutChart } from "../HomeCharts";
import HomeWidgetShell from "../HomeWidgetShell";
import { getPlatformConfig } from "../../ComponentDB/componentStatusConfig";
import {
  appendAssetCustodianParams,
  appendExcludeToolCategoryParams,
  assetCustodianMatches,
  buildCounts,
  isToolCategory,
  regionMatches,
} from "../homeUtils";
import useWidgetData from "../useWidgetData";

export default function PlatformWidget({ selectedRegion = "", selectedAssetCustodians = [] }) {
  const navigate = useNavigate();

  const loadPlatforms = useCallback(async ({ fresh = false } = {}) => {
    const resp = await API.get("/components/fetch-components", {
      params: { fresh: fresh ? "true" : "false" },
    });
    const components = (resp.data.components || []).filter(
      (component) =>
        regionMatches(component, selectedRegion) &&
        assetCustodianMatches(component, selectedAssetCustodians) &&
        !isToolCategory(component)
    );
    return {
      total: components.length,
      segments: buildCounts(components, (component) => component.platform, {
        getColor: (value) => getPlatformConfig(value).color,
        getIcon: (value) => getPlatformConfig(value).Icon,
      }),
    };
  }, [selectedRegion, selectedAssetCustodians]);

  const { loading, error, data, reload } = useWidgetData(loadPlatforms);

  const handlePlatformClick = (segment) => {
    const params = new URLSearchParams();
    if (selectedRegion) {
      params.set("region", selectedRegion);
    }
    params.set("platform", segment.label);
    appendExcludeToolCategoryParams(params);
    appendAssetCustodianParams(params, selectedAssetCustodians);
    navigate(`/component-db?${params.toString()}`);
  };

  return (
    <HomeWidgetShell
      title="Platform Distribution"
      subtitle="Component inventory split by platform."
      icon={<AppsIcon fontSize="small" />}
      loading={loading}
      error={error}
      onRefresh={reload}
    >
      {data && (
        <DonutChart
          segments={data.segments}
          centerLabel="Components"
          centerValue={data.total}
          onItemClick={handlePlatformClick}
        />
      )}
    </HomeWidgetShell>
  );
}

PlatformWidget.propTypes = {
  selectedRegion: PropTypes.string,
  selectedAssetCustodians: PropTypes.arrayOf(PropTypes.string),
};
