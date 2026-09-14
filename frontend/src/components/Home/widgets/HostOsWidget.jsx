import { useCallback } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import ComputerRoundedIcon from "@mui/icons-material/ComputerRounded";
import { API } from "../../../services/auth";
import { DonutChart } from "../HomeCharts";
import HomeWidgetShell from "../HomeWidgetShell";
import { getOsConfig } from "../../HostDetails/statusConfig";
import { appendAssetCustodianParams, assetCustodianMatches, buildCounts, regionMatches } from "../homeUtils";
import useWidgetData from "../useWidgetData";

export default function HostOsWidget({ selectedRegion = "", selectedAssetCustodians = [] }) {
  const navigate = useNavigate();

  const loadHostOs = useCallback(async ({ fresh = false } = {}) => {
    const resp = await API.get("/server-details/fetch-server-details", {
      params: { fresh: fresh ? "true" : "false" },
    });
    const hosts = (resp.data.server_details || []).filter(
      (host) => regionMatches(host, selectedRegion) && assetCustodianMatches(host, selectedAssetCustodians)
    );

    return {
      total: hosts.length,
      segments: buildCounts(hosts, (host) => host.os || "Unknown", {
        getColor: (value) => getOsConfig(value).color,
        getIcon: (value) => getOsConfig(value).Icon,
      }),
    };
  }, [selectedRegion, selectedAssetCustodians]);

  const { loading, error, data, reload } = useWidgetData(loadHostOs);

  const handleOsClick = (segment) => {
    const params = new URLSearchParams();
    if (selectedRegion) {
      params.set("region", selectedRegion);
    }
    params.set("os", segment.rawValue);
    appendAssetCustodianParams(params, selectedAssetCustodians);
    navigate(`/server-details?${params.toString()}`);
  };

  return (
    <HomeWidgetShell
      title="Host OS Distribution"
      subtitle="Host Details split by operating system."
      icon={<ComputerRoundedIcon fontSize="small" />}
      loading={loading}
      error={error}
      onRefresh={reload}
    >
      {data && (
        <DonutChart
          segments={data.segments}
          centerLabel="Hosts"
          centerValue={data.total}
          onItemClick={handleOsClick}
        />
      )}
    </HomeWidgetShell>
  );
}

HostOsWidget.propTypes = {
  selectedRegion: PropTypes.string,
  selectedAssetCustodians: PropTypes.arrayOf(PropTypes.string),
};
