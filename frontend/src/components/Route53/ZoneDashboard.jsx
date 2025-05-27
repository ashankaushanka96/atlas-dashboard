import { useEffect, useState } from "react";
import axios from "axios";
import ZoneCard from "./ZoneCard";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Box,
  Typography,
} from "@mui/material";

import { backendDomain } from "../../Config";

function ZoneDashboard() {
  const [zones, setZones] = useState([]);
  const [hostedZoneOptions, setHostedZoneOptions] = useState([]);
  const [error, setError] = useState(null);
  const [selectedZone, setSelectedZone] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchZoneOptions();
    // fetchZoneData(selectedZone);
  }, []);

  // useEffect(() => {
  //   fetchZoneData(selectedZone);
  // }, [selectedZone]);

  const selectedZoneFetch = async (zone) => {
    setSelectedZone(zone);
    fetchZoneData(zone);
  };

  const fetchZoneOptions = async () => {
    const url = `${backendDomain}/route53/fetch-zone-names`;
    try {
      const response = await axios.get(url);
      const options = [
        { label: "All Zones", value: "all" },
        ...response.data.map((name) => ({ label: name, value: name })),
      ];
      setHostedZoneOptions(options);
      fetchZoneData("all");
    } catch (err) {
      setError(
        err.response?.data?.error_message || "An unexpected error occurred"
      );
      setHostedZoneOptions([{ label: "All Zones", value: "all" }]);
      fetchZoneData("all");
    }
  };

  const fetchZoneData = async (zone) => {
    console.log("Zone to fetch:", zone);
    setLoading(true);
    let url = "";

    if (zone === "all") {
      url = `${backendDomain}/route53/fetch-zones`;
    } else {
      url = `${backendDomain}/route53/fetch-zone-detail?zone_name=${zone}`;
    }

    try {
      const response = await axios.get(url);
      setZones(
        zone === "all"
          ? response.data.route53_details
          : [response.data.zone_detail]
      );
    } catch (err) {
      setError(
        err.response?.data?.error_message || "An unexpected error occurred"
      );
      setZones([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* <ToastContainer /> */}
      <Box sx={{ padding: 3 }} overflow="auto">
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6">Route 53 Primary/Failover Status</Typography>
        </Box>
        <Box display="flex" justifyContent="left" mb={2}>
          <FormControl variant="outlined" sx={{ minWidth: 300 }}>
            <InputLabel>Hosted Zone</InputLabel>
            <Select
              label="Hosted Zone"
              value={selectedZone}
              onChange={(e) => selectedZoneFetch(e.target.value)}
            >
              {hostedZoneOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center">
            <CircularProgress />
          </Box>
        ) : (
          zones.map((zone, idx) => <ZoneCard key={idx} zone={zone} />)
        )}
      </Box>
    </>
  );
}

export default ZoneDashboard;
