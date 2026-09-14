import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  useTheme,
  Tooltip,
  CircularProgress,
  Divider,
} from "@mui/material";
import DnsRoundedIcon from "@mui/icons-material/DnsRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import RadarRoundedIcon from "@mui/icons-material/RadarRounded";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import StopCircleIcon from "@mui/icons-material/StopCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { motion } from "framer-motion";
import PropTypes from "prop-types";
import StatusChip from "../HostDetails/StatusChip";
import hexToRgb from "../shared/hexToRgb";

const tintedButtonSx = (color) => ({
  minWidth: 128,
  fontWeight: 800,
  borderRadius: 999,
  boxShadow: "none",
  flexShrink: 0,
  color,
  bgcolor: `rgba(${hexToRgb(color)}, 0.14)`,
  border: `1px solid rgba(${hexToRgb(color)}, 0.4)`,
  "&:hover": {
    bgcolor: `rgba(${hexToRgb(color)}, 0.24)`,
    borderColor: color,
    boxShadow: "none",
  },
  "&.Mui-disabled": {
    color: "text.disabled",
    bgcolor: "rgba(148, 163, 184, 0.08)",
    borderColor: "rgba(148, 163, 184, 0.24)",
  },
});

function getInstanceStatusConfig(status) {
  const normalizedStatus = String(status || "").toLowerCase();
  if (normalizedStatus === "running") return { color: "#34D399", Icon: PlayCircleIcon, label: "RUNNING" };
  if (normalizedStatus === "stopped") return { color: "#94A3B8", Icon: StopCircleIcon, label: "STOPPED" };
  if (normalizedStatus === "starting") return { color: "#60A5FA", Icon: HourglassEmptyIcon, label: "STARTING" };
  if (normalizedStatus === "stopping") return { color: "#F59E0B", Icon: HourglassEmptyIcon, label: "STOPPING" };
  return { color: "#94A3B8", Icon: HelpOutlineIcon, label: String(status || "UNKNOWN").toUpperCase() };
}

function MetadataRow({ icon, label, value, monospace = false, tooltip = null }) {
  const content = (
    <Typography
      variant="body2"
      fontFamily={monospace ? "monospace" : "inherit"}
      sx={{
        fontWeight: 600,
        lineHeight: 1.25,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {value}
    </Typography>
  );

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "16px 72px minmax(0, 1fr)",
        gap: 1,
        alignItems: "center",
      }}
    >
      <Box sx={{ color: "text.secondary", display: "flex", alignItems: "center" }}>{icon}</Box>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </Typography>
      {tooltip ? (
        <Tooltip title={tooltip} arrow>
          <Box sx={{ minWidth: 0 }}>{content}</Box>
        </Tooltip>
      ) : (
        <Box sx={{ minWidth: 0 }}>{content}</Box>
      )}
    </Box>
  );
}

MetadataRow.propTypes = {
  icon: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  monospace: PropTypes.bool,
  tooltip: PropTypes.string,
  value: PropTypes.string.isRequired,
};

MetadataRow.defaultProps = {
  monospace: false,
  tooltip: null,
};

function ServerCard({ instance, onToggle, canControl }) {
  const theme = useTheme();

  const chipProps = instance.status_loading
    ? { color: "#94A3B8", Icon: HelpOutlineIcon, label: "CHECKING" }
    : getInstanceStatusConfig(instance.instance_status);

  const isPending =
    instance.instance_status === "starting" || instance.instance_status === "stopping";
  const isButtonDisabled = isPending || instance.status_loading || !canControl;
  const buttonColor = instance.status_loading || isPending
    ? "#94A3B8"
    : instance.instance_status === "running"
      ? "#E24B4A"
      : "#34D399";
  const ButtonIcon = instance.status_loading || isPending
    ? HourglassEmptyIcon
    : instance.instance_status === "running"
      ? StopCircleIcon
      : PlayCircleIcon;

  let toggleText = "Toggle";
  if (instance.status_loading) toggleText = "Syncing Status";
  else if (instance.instance_status === "starting") toggleText = "Starting";
  else if (instance.instance_status === "stopping") toggleText = "Stopping";
  else if (instance.instance_status === "running") toggleText = "Stop Instance";
  else if (instance.instance_status === "stopped") toggleText = "Start Instance";

  const stateNote = instance.status_loading
    ? "Fetching live AWS status"
    : isPending
      ? "Applying instance state change"
      : instance.instance_status === "running"
        ? "Instance is live and can be stopped"
        : "Instance is idle and can be started";

  return (
    <Card
      elevation={0}
      component={motion.div}
      initial={{ opacity: 0.96, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor:
          instance.instance_status === "running"
            ? "rgba(34, 197, 94, 0.34)"
            : "divider",
        background:
          theme.palette.mode === "light"
            ? "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)"
            : "linear-gradient(180deg, #111827 0%, #162132 100%)",
        boxShadow:
          theme.palette.mode === "light"
            ? "0 10px 28px rgba(15, 23, 42, 0.08)"
            : "0 14px 32px rgba(2, 6, 23, 0.32)",
      }}
    >
      <CardContent sx={{ p: 0 }}>
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            borderBottom: "1px solid",
            borderColor: "divider",
            background:
              theme.palette.mode === "light"
                ? "linear-gradient(90deg, rgba(15,23,42,0.03), rgba(59,130,246,0.06))"
                : "linear-gradient(90deg, rgba(255,255,255,0.02), rgba(96,165,250,0.08))",
          }}
        >
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1.25,
              display: "grid",
              placeItems: "center",
              bgcolor:
                theme.palette.mode === "light"
                  ? "rgba(37, 99, 235, 0.08)"
                  : "rgba(96, 165, 250, 0.14)",
              color: "primary.main",
              border: "1px solid",
              borderColor: "divider",
              flexShrink: 0,
            }}
          >
            <DnsRoundedIcon sx={{ fontSize: 18 }} />
          </Box>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 800,
                lineHeight: 1.1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {instance.instance_name || "Unnamed Instance"}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              EC2 Control Node
            </Typography>
          </Box>

          <StatusChip label={chipProps.label} color={chipProps.color} Icon={chipProps.Icon} />
        </Box>

        <Box sx={{ px: 2, py: 1.5 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 1,
            }}
          >
            <MetadataRow
              icon={<PublicRoundedIcon sx={{ fontSize: 15 }} />}
              label="Region"
              value={instance.region}
            />
            <MetadataRow
              icon={<PublicRoundedIcon sx={{ fontSize: 15 }} />}
              label="Private IP"
              value={instance.private_ip || "N/A"}
              monospace
            />
            <MetadataRow
              icon={<KeyRoundedIcon sx={{ fontSize: 15 }} />}
              label="Instance"
              value={instance.instance_id}
              monospace
              tooltip={instance.instance_id}
            />
          </Box>
        </Box>

        <Divider />

        <Box
          sx={{
            px: 2,
            py: 1.25,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
            {instance.status_loading ? (
              <CircularProgress size={15} />
            ) : (
              <RadarRoundedIcon
                sx={{
                  fontSize: 16,
                  color:
                    instance.instance_status === "running"
                      ? "success.main"
                      : "text.secondary",
                }}
              />
            )}
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 600,
                letterSpacing: "0.02em",
              }}
            >
              {stateNote}
            </Typography>
          </Box>

          <Tooltip
            title={!canControl ? "You don't have permission to handle this server" : ""}
            arrow
          >
            <span>
              <Button
                variant="outlined"
                startIcon={<ButtonIcon fontSize="small" />}
                onClick={() => onToggle(instance.instance_id, instance.region, instance.instance_status)}
                disabled={isButtonDisabled}
                component={motion.button}
                whileTap={{ scale: 0.985 }}
                sx={tintedButtonSx(buttonColor)}
              >
                {toggleText}
              </Button>
            </span>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );
}

ServerCard.propTypes = {
  instance: PropTypes.shape({
    instance_id: PropTypes.string.isRequired,
    instance_name: PropTypes.string,
    private_ip: PropTypes.string,
    region: PropTypes.string.isRequired,
    instance_status: PropTypes.string,
    status_loading: PropTypes.bool,
  }).isRequired,
  canControl: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default ServerCard;
