import { Box, Button, Typography, Stack, useTheme } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import BoltIcon from "@mui/icons-material/Bolt";
import { toast } from "react-toastify";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import StatusChip from "../HostDetails/StatusChip";

function getHealthStatusConfig(status) {
  if (status === "Healthy") return { color: "#34D399", Icon: CheckCircleIcon };
  if (status === "Unhealthy") return { color: "#E24B4A", Icon: CancelIcon };
  return { color: "#F59E0B", Icon: HelpOutlineIcon };
}

function HealthInfo({ record, active, label }) {
  const theme = useTheme();
  const healthId = record?.health_check_id;
  const status = record?.health_status || "Unknown";
  const awsConsoleLink = healthId
    ? `https://console.aws.amazon.com/route53/v2/healthchecks/${healthId}`
    : null;

  const copyToClipboard = () => {
    if (!healthId) return;
    navigator.clipboard.writeText(healthId);
    toast.success("Copied Health Check ID!", {
      position: "bottom-right",
      autoClose: 1600,
    });
  };

  const getStatusChip = (s) => {
    const { color, Icon } = getHealthStatusConfig(s);
    return (
      <StatusChip
        label={s}
        color={color}
        Icon={Icon}
        sx={{ display: "inline-flex" }}
      />
    );
  };

  const pulseColor = theme.palette.mode === "light" ? "#00acc1" : "#4dd0e1";

  return (
    <Box
      sx={{
        position: "relative",
        p: 1.25,
        borderRadius: 2,
        border: "1px dashed",
        borderColor: theme.palette.divider,
        background:
          theme.palette.mode === "light"
            ? "rgba(25,118,210,0.04)"
            : "rgba(144,202,249,0.06)",
        overflow: "hidden",
      }}
    >
      {active && (
        <Box
          component={motion.div}
          initial={{ opacity: 0.6, scale: 0.98 }}
          animate={{ opacity: [0.45, 0.8, 0.45], scale: [0.98, 1, 0.98] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          sx={{
            position: "absolute",
            inset: 0,
            borderRadius: 2,
            boxShadow: `0 0 0 2px ${pulseColor}44 inset, 0 0 16px ${pulseColor}33 inset`,
            pointerEvents: "none",
          }}
        />
      )}

      <Typography component="div" sx={{ fontWeight: 700, mb: 0.5 }}>
        {label} Health
      </Typography>

      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{
          flexWrap: "nowrap",
          whiteSpace: "nowrap",
          overflowX: "auto",
          overflowY: "hidden",
          pb: 0.25,
          "&::-webkit-scrollbar": { height: 4 },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(148,163,184,0.35)",
            borderRadius: 999,
          },
        }}
      >
        <Typography component="div" sx={{ fontWeight: 700, flexShrink: 0 }}>
          Health Check ID:
        </Typography>
        {healthId ? (
          <>
            <Typography
              component="a"
              href={awsConsoleLink}
              target="_blank"
              rel="noreferrer"
              sx={{
                flexShrink: 0,
                whiteSpace: "nowrap",
                textDecoration: "none",
                color: "primary.main",
              }}
            >
              {healthId}
            </Typography>
            <Button
              onClick={copyToClipboard}
              size="small"
              startIcon={<ContentCopyIcon />}
              aria-label="Copy health check ID"
              sx={{
                minWidth: "auto",
                flexShrink: 0,
                whiteSpace: "nowrap",
                px: 0.5,
                "& .MuiButton-startIcon": {
                  margin: 0,
                },
              }}
            >
              
            </Button>
          </>
        ) : (
          <Typography component="i" sx={{ flexShrink: 0 }}>
            Not associated
          </Typography>
        )}
      </Stack>

      <Typography component="div" sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1 }}>
        <strong>Status:</strong> {getStatusChip(status)}
        {active && (
          <StatusChip
            label="Active"
            color="#60A5FA"
            Icon={BoltIcon}
            component={motion.div}
            initial={{ scale: 0.9, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25 }}
          />
        )}
      </Typography>
    </Box>
  );
}

HealthInfo.propTypes = {
  record: PropTypes.shape({
    health_check_id: PropTypes.string,
    health_status: PropTypes.string,
  }).isRequired,
  active: PropTypes.bool,
  label: PropTypes.string, // "Primary" | "Secondary"
};

export default HealthInfo;
