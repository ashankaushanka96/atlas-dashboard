import { useCallback } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { Box, Stack, Typography } from "@mui/material";
import CloudIcon from "@mui/icons-material/Cloud";
import { API } from "../../../services/auth";
import { DonutChart, HorizontalBars } from "../HomeCharts";
import HomeWidgetShell from "../HomeWidgetShell";
import { getInstanceStatusConfig } from "../../AWSResources/ec2StatusConfig";
import { appendAssetCustodianParams, assetCustodianMatches, buildCounts, regionMatches } from "../homeUtils";
import useWidgetData from "../useWidgetData";

export default function EC2StatusWidget({ selectedRegion = "", selectedAssetCustodians = [] }) {
  const navigate = useNavigate();

  const loadEc2Status = useCallback(async ({ fresh = false } = {}) => {
    const resp = await API.get("/ec2-details/fetch-instance-summary", {
      params: { fresh: fresh ? "true" : "false" },
    });
    const instances = (resp.data.instances || []).filter(
      (instance) =>
        regionMatches(instance, selectedRegion) && assetCustodianMatches(instance, selectedAssetCustodians)
    );
    return {
      total: instances.length,
      segments: buildCounts(
        instances,
        (instance) => instance.instance_status || "unknown",
        {
          getColor: (value) => getInstanceStatusConfig(value).color,
          getIcon: (value) => getInstanceStatusConfig(value).Icon,
        }
      ),
      regions: buildCounts(
        instances,
        (instance) => instance.region || "unknown",
        { formatLabel: (value) => String(value) }
      ),
    };
  }, [selectedRegion, selectedAssetCustodians]);

  const { loading, error, data, reload } = useWidgetData(loadEc2Status);

  const handleStatusClick = (segment) => {
    const params = new URLSearchParams();
    params.set("tab", "0");
    params.set("status", segment.label.toLowerCase());
    if (selectedRegion) {
      params.set("region", selectedRegion);
    }
    appendAssetCustodianParams(params, selectedAssetCustodians);
    navigate(`/infrastructure-details?${params.toString()}`);
  };

  const handleRegionClick = (item) => {
    const params = new URLSearchParams();
    params.set("tab", "0");
    params.set("region", item.rawValue);
    appendAssetCustodianParams(params, selectedAssetCustodians);
    navigate(`/infrastructure-details?${params.toString()}`);
  };

  return (
    <HomeWidgetShell
      title="EC2 Resource Status"
      subtitle="Instance status distribution from infrastructure summary."
      icon={<CloudIcon fontSize="small" />}
      loading={loading}
      error={error}
      onRefresh={reload}
    >
      {data && (
        <Stack spacing={3}>
          <DonutChart
            segments={data.segments}
            centerLabel="Instances"
            centerValue={data.total}
            onItemClick={handleStatusClick}
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

EC2StatusWidget.propTypes = {
  selectedRegion: PropTypes.string,
  selectedAssetCustodians: PropTypes.arrayOf(PropTypes.string),
};
