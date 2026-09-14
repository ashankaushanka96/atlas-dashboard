import { useCallback } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { Box, Stack, Typography } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { API } from "../../../services/auth";
import { DonutChart, HorizontalBars } from "../HomeCharts";
import HomeWidgetShell from "../HomeWidgetShell";
import { getWatcherStatusConfig } from "../../HostDetails/statusConfig";
import {
  appendAssetCustodianParams,
  appendComponentCategoryParams,
  assetCustodianMatches,
  buildCounts,
  isComponentCategory,
  regionMatches,
} from "../homeUtils";
import useWidgetData from "../useWidgetData";

export default function WatcherWidget({ selectedRegion = "", selectedAssetCustodians = [] }) {
  const navigate = useNavigate();

  const loadWatcherStatus = useCallback(async ({ fresh = false } = {}) => {
    const resp = await API.get("/components/fetch-components", {
      params: { fresh: fresh ? "true" : "false" },
    });
    const components = (resp.data.components || []).filter(
      (component) =>
        regionMatches(component, selectedRegion) &&
        assetCustodianMatches(component, selectedAssetCustodians) &&
        isComponentCategory(component)
    );
    return {
      total: components.length,
      segments: buildCounts(components, (component) => component.watcher || "Unknown", {
        getColor: (value) => getWatcherStatusConfig(value).color,
        getIcon: (value) => getWatcherStatusConfig(value).Icon,
      }),
      regions: buildCounts(
        components,
        (component) => component.region || "unknown",
        { formatLabel: (value) => String(value) }
      ),
    };
  }, [selectedRegion, selectedAssetCustodians]);

  const { loading, error, data, reload } = useWidgetData(loadWatcherStatus);

  const handleCoverageClick = (segment) => {
    const params = new URLSearchParams();
    if (selectedRegion) {
      params.set("region", selectedRegion);
    }
    params.set("watcher", segment.rawValue);
    appendComponentCategoryParams(params);
    appendAssetCustodianParams(params, selectedAssetCustodians);
    navigate(`/component-db?${params.toString()}`);
  };

  const handleRegionClick = (item) => {
    const params = new URLSearchParams();
    params.set("region", item.rawValue);
    appendAssetCustodianParams(params, selectedAssetCustodians);
    navigate(`/component-watcher?${params.toString()}`);
  };

  return (
    <HomeWidgetShell
      title="Watcher Coverage"
      subtitle="How many components are watcher-configured."
      icon={<VisibilityIcon fontSize="small" />}
      loading={loading}
      error={error}
      onRefresh={reload}
    >
      {data && (
        <Stack spacing={3}>
          <DonutChart
            segments={data.segments}
            centerLabel="Components"
            centerValue={data.total}
            onItemClick={handleCoverageClick}
          />

          {!selectedRegion ? (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>
                Region Counts
              </Typography>
              <HorizontalBars items={data.regions} onItemClick={handleRegionClick} />
            </Box>
          ) : null}
        </Stack>
      )}
    </HomeWidgetShell>
  );
}

WatcherWidget.propTypes = {
  selectedRegion: PropTypes.string,
  selectedAssetCustodians: PropTypes.arrayOf(PropTypes.string),
};
