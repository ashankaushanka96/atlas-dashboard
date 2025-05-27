import React from "react";
import { Button, Typography, Chip } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { toast } from "react-toastify";
import PropTypes from "prop-types";

function HealthInfo({ record }) {
  const healthId = record.health_check_id;
  const awsConsoleLink = healthId
    ? `https://console.aws.amazon.com/route53/v2/healthchecks/${healthId}`
    : null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(healthId);
    toast.success("Copied to clipboard!", {
      position: "bottom-right",
      autoClose: 2000,
    });
  };

  const getStatusChip = (status) => {
    const color =
      status === "Healthy"
        ? "success"
        : status === "Unhealthy"
          ? "error"
          : "default";
    return <Chip label={status} color={color} variant="outlined" />;
  };

  return (
    <>
      <Typography component="div">
        <strong>Health Check ID:</strong>{" "}
        {healthId ? (
          <>
            <a href={awsConsoleLink} target="_blank" rel="noreferrer">
              {healthId}
            </a>
            <Button
              onClick={copyToClipboard}
              size="small"
              startIcon={<ContentCopyIcon />}
              sx={{ ml: 1 }}
            >
              Copy
            </Button>
          </>
        ) : (
          <i>Not associated</i>
        )}
      </Typography>

      <Typography component="div" sx={{ mt: 1 }}>
        <strong>Health Status:</strong> {getStatusChip(record.health_status)}
      </Typography>
    </>
  );
}

HealthInfo.propTypes = {
  // Add PropTypes
  record: PropTypes.shape({
    health_check_id: PropTypes.string.isRequired,
  }).isRequired,
};

export default HealthInfo;
