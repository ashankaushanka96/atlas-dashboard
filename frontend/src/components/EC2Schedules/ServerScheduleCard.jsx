import PropTypes from "prop-types";
import { Box, Paper, Stack, Typography, useTheme } from "@mui/material";
import DnsOutlinedIcon from "@mui/icons-material/DnsOutlined";
import RoomOutlinedIcon from "@mui/icons-material/RoomOutlined";
import ToggleOnOutlinedIcon from "@mui/icons-material/ToggleOnOutlined";
import ToggleOffOutlinedIcon from "@mui/icons-material/ToggleOffOutlined";
import StatusChip from "../HostDetails/StatusChip";
import ServerWeeklySchedule from "./ServerWeeklySchedule";

function ServerScheduleCard({ server }) {
  const theme = useTheme();

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        borderRadius: 2,
        borderColor: theme.palette.divider,
        background:
          theme.palette.mode === "light"
            ? "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(243,247,255,0.98))"
            : "linear-gradient(180deg, rgba(18,26,43,0.96), rgba(20,32,52,0.98))",
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
        sx={{ mb: 1.25 }}
      >
        <DnsOutlinedIcon sx={{ color: "#60A5FA", fontSize: 20 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {server.instanceName || "N/A"}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", fontFamily: "monospace" }}>
          {server.privateIp}
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        <StatusChip label={server.region || "N/A"} color="#60A5FA" Icon={RoomOutlinedIcon} />
        <StatusChip
          label={server.scheduleEnabled ? "Enabled" : "Disabled"}
          color={server.scheduleEnabled ? "#34D399" : "#E24B4A"}
          Icon={server.scheduleEnabled ? ToggleOnOutlinedIcon : ToggleOffOutlinedIcon}
        />
      </Stack>

      <ServerWeeklySchedule events={server.events} unplaced={server.unplaced} />
    </Paper>
  );
}

ServerScheduleCard.propTypes = {
  server: PropTypes.shape({
    key: PropTypes.string.isRequired,
    instanceName: PropTypes.string,
    privateIp: PropTypes.string,
    region: PropTypes.string,
    scheduleEnabled: PropTypes.bool,
    events: PropTypes.array.isRequired,
    unplaced: PropTypes.array.isRequired,
  }).isRequired,
};

export default ServerScheduleCard;
