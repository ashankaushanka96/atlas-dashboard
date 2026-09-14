import { useCallback } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import LinkIcon from "@mui/icons-material/Link";
import { API } from "../../../services/auth";
import { DonutChart } from "../HomeCharts";
import HomeWidgetShell from "../HomeWidgetShell";
import { getYesNoConfig } from "../../HostDetails/statusConfig";
import {
  appendAssetCustodianParams,
  appendExcludeToolCategoryParams,
  assetCustodianMatches,
  buildCounts,
  isToolCategory,
  regionMatches,
} from "../homeUtils";
import useWidgetData from "../useWidgetData";

export default function PipelineWidget({ selectedRegion = "", selectedAssetCustodians = [] }) {
  const navigate = useNavigate();

  const loadPipelineStatus = useCallback(async ({ fresh = false } = {}) => {
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
      segments: buildCounts(components, (component) => component.pipeline || "Unknown", {
        getColor: (value) => getYesNoConfig(value).color,
        getIcon: (value) => getYesNoConfig(value).Icon,
      }),
    };
  }, [selectedRegion, selectedAssetCustodians]);

  const { loading, error, data, reload } = useWidgetData(loadPipelineStatus);

  const handlePipelineClick = (segment) => {
    const params = new URLSearchParams();
    if (selectedRegion) {
      params.set("region", selectedRegion);
    }
    params.set("pipeline", segment.rawValue);
    appendExcludeToolCategoryParams(params);
    appendAssetCustodianParams(params, selectedAssetCustodians);
    navigate(`/component-db?${params.toString()}`);
  };

  return (
    <HomeWidgetShell
      title="Pipeline Coverage"
      subtitle="Pipeline-configured versus unconfigured components."
      icon={<LinkIcon fontSize="small" />}
      loading={loading}
      error={error}
      onRefresh={reload}
    >
      {data && (
        <DonutChart
          segments={data.segments}
          centerLabel="Components"
          centerValue={data.total}
          onItemClick={handlePipelineClick}
        />
      )}
    </HomeWidgetShell>
  );
}

PipelineWidget.propTypes = {
  selectedRegion: PropTypes.string,
  selectedAssetCustodians: PropTypes.arrayOf(PropTypes.string),
};
