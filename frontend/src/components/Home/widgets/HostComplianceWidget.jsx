import { useCallback } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import { API } from "../../../services/auth";
import { DonutChart } from "../HomeCharts";
import HomeWidgetShell from "../HomeWidgetShell";
import { getCompliantStatusConfig } from "../../HostDetails/statusConfig";
import {
  appendAssetCustodianParams,
  assetCustodianMatches,
  buildCounts,
  regionMatches,
  titleCase,
} from "../homeUtils";
import useWidgetData from "../useWidgetData";

export default function HostComplianceWidget({ selectedRegion = "", selectedAssetCustodians = [] }) {
  const navigate = useNavigate();

  const loadHostCompliance = useCallback(async ({ fresh = false } = {}) => {
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
        (host) => host.compliant_status || "Unknown",
        {
          formatLabel: (value) => titleCase(value),
          getColor: (value) => getCompliantStatusConfig(value).color,
          getIcon: (value) => getCompliantStatusConfig(value).Icon,
        }
      ),
    };
  }, [selectedRegion, selectedAssetCustodians]);

  const { loading, error, data, reload } = useWidgetData(loadHostCompliance);

  const handleComplianceClick = (segment) => {
    const params = new URLSearchParams();
    if (selectedRegion) {
      params.set("region", selectedRegion);
    }
    params.set("compliant_status", segment.rawValue);
    appendAssetCustodianParams(params, selectedAssetCustodians);
    navigate(`/server-details?${params.toString()}`);
  };

  return (
    <HomeWidgetShell
      title="Host Compliance Status"
      subtitle="Compliance view of hosts from Host Details."
      icon={<VerifiedUserRoundedIcon fontSize="small" />}
      loading={loading}
      error={error}
      onRefresh={reload}
    >
      {data && (
        <DonutChart
          segments={data.segments}
          centerLabel="Hosts"
          centerValue={data.total}
          onItemClick={handleComplianceClick}
        />
      )}
    </HomeWidgetShell>
  );
}

HostComplianceWidget.propTypes = {
  selectedRegion: PropTypes.string,
  selectedAssetCustodians: PropTypes.arrayOf(PropTypes.string),
};
