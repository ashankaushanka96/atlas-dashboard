import { useCallback } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { API } from "../../../services/auth";
import { DonutChart } from "../HomeCharts";
import HomeWidgetShell from "../HomeWidgetShell";
import { getWatcherStatusConfig } from "../../HostDetails/statusConfig";
import {
  appendAssetCustodianParams,
  assetCustodianMatches,
  buildCounts,
  regionMatches,
} from "../homeUtils";
import useWidgetData from "../useWidgetData";

export default function HostWatcherStatusWidget({ selectedRegion = "", selectedAssetCustodians = [] }) {
  const navigate = useNavigate();

  const loadHostWatcherStatus = useCallback(async ({ fresh = false } = {}) => {
    const resp = await API.get("/server-details/fetch-server-details", {
      params: { fresh: fresh ? "true" : "false" },
    });
    const hosts = (resp.data.server_details || []).filter(
      (host) => regionMatches(host, selectedRegion) && assetCustodianMatches(host, selectedAssetCustodians)
    );

    return {
      total: hosts.length,
      segments: buildCounts(
        hosts,
        (host) => host.watcher_status || "Unknown",
        {
          getColor: (value) => getWatcherStatusConfig(value).color,
          getIcon: (value) => getWatcherStatusConfig(value).Icon,
        }
      ),
    };
  }, [selectedRegion, selectedAssetCustodians]);

  const { loading, error, data, reload } = useWidgetData(loadHostWatcherStatus);

  const handleWatcherStatusClick = (segment) => {
    const params = new URLSearchParams();
    if (selectedRegion) {
      params.set("region", selectedRegion);
    }
    params.set("watcher_status", segment.rawValue);
    appendAssetCustodianParams(params, selectedAssetCustodians);
    navigate(`/server-details?${params.toString()}`);
  };

  return (
    <HomeWidgetShell
      title="Host Watcher Status"
      subtitle="Watcher configuration of hosts from Host Details."
      icon={<VisibilityIcon fontSize="small" />}
      loading={loading}
      error={error}
      onRefresh={reload}
    >
      {data && (
        <DonutChart
          segments={data.segments}
          centerLabel="Hosts"
          centerValue={data.total}
          onItemClick={handleWatcherStatusClick}
        />
      )}
    </HomeWidgetShell>
  );
}

HostWatcherStatusWidget.propTypes = {
  selectedRegion: PropTypes.string,
  selectedAssetCustodians: PropTypes.arrayOf(PropTypes.string),
};
