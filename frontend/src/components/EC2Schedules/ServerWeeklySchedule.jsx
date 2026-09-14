import PropTypes from "prop-types";
import { Box, Stack, Tooltip, Typography, useTheme } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import StatusChip from "../HostDetails/StatusChip";
import { DAY_LABELS, eventsForDay } from "./weeklyScheduleUtils";

const START_COLOR = "#34D399";
const STOP_COLOR = "#E24B4A";

function getEventConfig(action) {
  return String(action || "").toLowerCase() === "stop"
    ? { color: STOP_COLOR, Icon: StopIcon }
    : { color: START_COLOR, Icon: PlayArrowIcon };
}

function DayColumn({ dayIndex, label, events, isToday }) {
  const dayEvents = eventsForDay(events, dayIndex);
  return (
    <Box
      sx={{
        flex: "1 1 0",
        minWidth: 92,
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: isToday ? "rgba(96, 165, 250, 0.4)" : "rgba(148, 163, 184, 0.14)",
        bgcolor: isToday ? "rgba(96, 165, 250, 0.06)" : "transparent",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          px: 1,
          py: 0.5,
          textAlign: "center",
          borderBottom: "1px solid",
          borderColor: isToday ? "rgba(96, 165, 250, 0.3)" : "rgba(148, 163, 184, 0.14)",
          bgcolor: isToday ? "rgba(96, 165, 250, 0.12)" : "rgba(148, 163, 184, 0.06)",
        }}
      >
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, color: isToday ? "#60A5FA" : "text.secondary" }}
        >
          {label}
        </Typography>
      </Box>
      <Stack spacing={0.5} sx={{ p: 0.75, minHeight: 40 }}>
        {dayEvents.length === 0 ? (
          <Typography variant="caption" sx={{ color: "text.disabled", textAlign: "center", py: 0.5 }}>
            —
          </Typography>
        ) : (
          dayEvents.map((event) => {
            const { color, Icon } = getEventConfig(event.action);
            return (
              <Tooltip
                key={`${event.id}-${dayIndex}`}
                title={`${event.action || "N/A"} · ${event.cronExpression}${
                  event.scheduleEnabled ? "" : " (schedule disabled)"
                }`}
                arrow
              >
                <Box sx={{ opacity: event.scheduleEnabled ? 1 : 0.45 }}>
                  <StatusChip
                    label={event.timeLabel}
                    color={color}
                    Icon={Icon}
                    sx={{ width: "100%", fontSize: 12, py: 0.35 }}
                  />
                </Box>
              </Tooltip>
            );
          })
        )}
      </Stack>
    </Box>
  );
}

DayColumn.propTypes = {
  dayIndex: PropTypes.number.isRequired,
  label: PropTypes.string.isRequired,
  events: PropTypes.array.isRequired,
  isToday: PropTypes.bool.isRequired,
};

function ServerWeeklySchedule({ events, unplaced }) {
  const theme = useTheme();
  const todayIndex = new Date().getDay();

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          gap: 0.75,
          overflowX: "auto",
          pb: unplaced.length ? 1 : 0,
        }}
      >
        {DAY_LABELS.map((label, dayIndex) => (
          <DayColumn
            key={label}
            dayIndex={dayIndex}
            label={label}
            events={events}
            isToday={dayIndex === todayIndex}
          />
        ))}
      </Box>

      {unplaced.length > 0 ? (
        <Box
          sx={{
            mt: 1,
            p: 1,
            borderRadius: 1.5,
            bgcolor:
              theme.palette.mode === "light" ? "rgba(245, 158, 11, 0.06)" : "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
          }}
        >
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
            <HelpOutlineIcon sx={{ fontSize: 15, color: "#F59E0B" }} />
            <Typography variant="caption" sx={{ color: "#F59E0B", fontWeight: 600 }}>
              Couldn&apos;t place on the grid — irregular cron expression
            </Typography>
          </Stack>
          <Stack spacing={0.4}>
            {unplaced.map((row) => (
              <Typography
                key={row.tag_key}
                variant="caption"
                sx={{ color: "text.secondary", fontFamily: "monospace", display: "block" }}
              >
                {row.tag_key}: {row.cron_expression || "N/A"}
              </Typography>
            ))}
          </Stack>
        </Box>
      ) : null}
    </Box>
  );
}

ServerWeeklySchedule.propTypes = {
  events: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      action: PropTypes.string,
      scheduleEnabled: PropTypes.bool,
      tagKey: PropTypes.string,
      cronExpression: PropTypes.string,
      timeLabel: PropTypes.string.isRequired,
      minutesOfDay: PropTypes.number.isRequired,
      dayIndices: PropTypes.arrayOf(PropTypes.number).isRequired,
    })
  ).isRequired,
  unplaced: PropTypes.array,
};

ServerWeeklySchedule.defaultProps = {
  unplaced: [],
};

export default ServerWeeklySchedule;
