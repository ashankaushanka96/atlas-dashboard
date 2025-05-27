import { TableRow, TableCell, useTheme, Box, Tooltip } from "@mui/material";
import PropTypes from "prop-types";

const SchedulerTableRowItem = ({ event, now }) => {
  const theme = useTheme();
  // Helper: format countdown.
  const formatCountdown = (scheduledTime, now) => {
    const diff = new Date(scheduledTime) - now;
    if (diff <= 0) return "Executed";
    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Determine dynamic executed status.
  const dynamicExecuted = new Date(event.scheduled_time) <= now;

  // Determine box background color.
  const getActionBoxColor = (theme, action) => {
    if (action) {
      const lower = action.toLowerCase();
      if (lower === "start") return theme.palette.success.main;
      if (lower === "stop") return theme.palette.error.main;
    }
    return theme.palette.grey[500];
  };

  const getScheduleEnabledBoxColor = (theme, enabled) => {
    return enabled ? theme.palette.success.main : theme.palette.error.main;
  };

  const getCountdownBoxColor = (theme) => {
    return dynamicExecuted
      ? theme.palette.primary.main
      : theme.palette.success.main;
  };

  const scheduledDate = new Date(event.scheduled_time);
  // Format GMT time using UTC timezone.
  const gmtTime = scheduledDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  // Format local time.
  const localTime = scheduledDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <TableRow
        hover
        sx={{
          backgroundColor: theme.palette.mode === "dark" ? "#1E1E1E" : "#fff",
          boxShadow: 1,
          transition: "transform 0.2s, filter 0.2s",
          "& > *:first-of-type": {
            borderTopLeftRadius: "8px",
            borderBottomLeftRadius: "8px",
          },
          "& > *:last-of-type": {
            borderTopRightRadius: "8px",
            borderBottomRightRadius: "8px",
          },
        }}
      >
        <TableCell align="left">{event.region}</TableCell>
        <TableCell align="center">{event.private_ip}</TableCell>
        <TableCell align="left">{event.instance_name}</TableCell>
        <TableCell align="center">
          <Box
            sx={{
              backgroundColor: getActionBoxColor(theme, event.action),
              padding: "4px 8px",
              borderRadius: "4px",
              display: "inline-block",
            }}
          >
            {event.action || "N/A"}
          </Box>
        </TableCell>
        <TableCell align="center">
          <Box
            sx={{
              color: getScheduleEnabledBoxColor(theme, event.schedule_enabled),
              padding: "4px 8px",
              borderRadius: "4px",
              display: "inline-block",
            }}
          >
            {event.schedule_enabled ? "Yes" : "No"}
          </Box>
        </TableCell>
        <TableCell align="center">
          <Tooltip title={`Local Time: ${localTime}`}>
            <span style={{ cursor: "pointer" }}>{gmtTime}</span>
          </Tooltip>
        </TableCell>
        <TableCell align="center">
          <Box
            sx={{
              color: getCountdownBoxColor(theme),
              padding: "4px 8px",
              borderRadius: "4px",
              display: "inline-block",
            }}
          >
            {formatCountdown(event.scheduled_time, now)}
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={7} sx={{ padding: 0 }}></TableCell>
      </TableRow>
    </>
  );
};

SchedulerTableRowItem.propTypes = {
  event: PropTypes.object.isRequired,
  now: PropTypes.object.isRequired,
};

export default SchedulerTableRowItem;
