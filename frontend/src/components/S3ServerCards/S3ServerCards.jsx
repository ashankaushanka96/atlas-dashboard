import { useState, useEffect } from "react";
import { Grid, Box, Typography, CircularProgress } from "@mui/material";
import ServerCard from "./ServerCard";
import { backendDomain } from "../../Config";
import axios from "axios";

function S3ServerCards() {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchServerDetails = async () => {
    const url = `${backendDomain}/server-start-stop/fetch-start-stop-instances`;
    try {
      const response = await axios.get(url);
      setInstances(response.data.instances);
    } catch (err) {
      setError(
        err.response?.data?.error_message || "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServerDetails();
  }, []);

  const serverStartStop = async (
    instance_id,
    region,
    action,
    currentStatus
  ) => {
    const url = `${backendDomain}/server-start-stop/start-stop-instance`;
    try {
      await axios.post(url, {
        instance_id: instance_id,
        region: region,
        action: action,
      });
      setInstances((prev) =>
        prev.map((inst) =>
          inst.instance_id === instance_id
            ? {
                ...inst,
                instance_status: action === "start" ? "running" : "stopped",
              }
            : inst
        )
      );
    } catch (err) {
      setError(
        err.response?.data?.error_message || "An unexpected error occurred"
      );
      setInstances((prev) =>
        prev.map((inst) =>
          inst.instance_id === instance_id
            ? { ...inst, instance_status: currentStatus }
            : inst
        )
      );
    }
  };

  const handleToggle = async (instanceId, region, currentStatus) => {
    if (currentStatus === "starting" || currentStatus === "stopping") return;
    const action = currentStatus === "running" ? "stop" : "start";
    const pendingStatus = action === "start" ? "starting" : "stopping";

    setInstances((prev) =>
      prev.map((inst) =>
        inst.instance_id === instanceId
          ? { ...inst, instance_status: pendingStatus }
          : inst
      )
    );
    await serverStartStop(instanceId, region, action, currentStatus);
  };

  return (
    <Box sx={{ flexGrow: 1, padding: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6">Log Servers Start/Stop</Typography>
      </Box>
      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 200,
          }}
        >
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error" sx={{ textAlign: "center" }}>
          Error: {error}
        </Typography>
      ) : instances.length > 0 ? (
        <Grid container spacing={2}>
          {instances.map((inst) => (
            <Grid item xs={12} sm={6} md={4} key={inst.instance_id}>
              <ServerCard instance={inst} onToggle={handleToggle} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Typography color="error" sx={{ textAlign: "center" }}>
          No Servers Found
        </Typography>
      )}
    </Box>
  );
}

export default S3ServerCards;
