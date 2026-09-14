import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Grid,
  Paper,
  Stack,
  Link,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  Close as CloseIcon,
  Apps as AppsIcon,
  Computer as ComputerIcon,
  Storage as StorageIcon,
  Link as LinkIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { getPipelineDisplayLabel, isToolCategory } from "./componentDisplayUtils";
import { getPlatformConfig } from "./componentStatusConfig";
import { getYesNoConfig, getWatcherStatusConfig } from "../HostDetails/statusConfig";
import StatusChip from "../HostDetails/StatusChip";
import hexToRgb from "../shared/hexToRgb";

const tintedIconButtonSx = (color) => ({
  color,
  bgcolor: `rgba(${hexToRgb(color)}, 0.12)`,
  "&:hover": { bgcolor: `rgba(${hexToRgb(color)}, 0.24)` },
});

// Same fixed pill widths as ComponentTable's chip columns, so a given
// field's chip is the same size wherever it's shown.
const CHIP_MIN_WIDTH = { platform: 110, pipeline: 140, watcher: 130 };
const chipSx = (column) => ({ minWidth: CHIP_MIN_WIDTH[column], justifyContent: "center" });

const formatBooleanLabel = (value) => {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return "Yes";
    if (normalized === "false") return "No";
  }
  return value ? "Yes" : "No";
};

const formatDays = (value) => {
  if (value === null || value === undefined || value === "") return "N/A";
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return String(value);
  return `${numericValue} day${numericValue === 1 ? "" : "s"}`;
};

const formatScheduleTime = (value, useLocalTime) => {
  if (!value) return "N/A";
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return String(value);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] || 0);
  if (
    Number.isNaN(hours) || Number.isNaN(minutes) || Number.isNaN(seconds) ||
    hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59
  ) return String(value);
  if (!useLocalTime) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  const utcDate = new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds));
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(utcDate);
};

const getCurrentEffectiveDay = (useLocalTime) => {
  const now = new Date();
  const dayIndex = useLocalTime ? now.getDay() : now.getUTCDay();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[dayIndex] || "";
};

const ComponentDetailsModal = ({ open, onClose, data }) => {
  const theme = useTheme();
  const [showLocalScheduleTime, setShowLocalScheduleTime] = useState(false);
  const meta = data?.config_meta || {};
  const schedules = Array.isArray(meta.schedules) ? meta.schedules : [];
  const localTimeZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Local Time",
    []
  );
  const currentEffectiveDay = getCurrentEffectiveDay(showLocalScheduleTime);

  const sectionSx = {
    p: 1.5,
    height: "100%",
    width: "100%",
    borderRadius: 2,
    border: "1px solid",
    borderColor: theme.palette.divider,
    background:
      theme.palette.mode === "light"
        ? "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(243,247,255,0.98))"
        : "linear-gradient(180deg, rgba(18,26,43,0.96), rgba(20,32,52,0.98))",
  };

  const labelSx = { lineHeight: 1.2 };

  const valueSx = {
    mt: 0.15,
    fontWeight: 500,
    lineHeight: 1.25,
    fontSize: "0.875rem",
  };

  const sectionTitleSx = {
    mb: 1,
    display: "flex",
    alignItems: "center",
    gap: 1,
    fontWeight: 700,
    fontSize: "1rem",
  };

  const renderLoadingState = () => (
    <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
      <Grid item xs={12}>
        <Paper elevation={0} sx={sectionSx}>
          <Typography variant="h6" sx={sectionTitleSx}>
            <ComputerIcon fontSize="small" />
            Basic Information
          </Typography>
          <Grid container spacing={1.5}>
            {Array.from({ length: 7 }, (_, index) => (
              <Grid item xs={12} sm={6} md={index === 6 ? 12 : 4} key={index}>
                <Skeleton variant="text" width="34%" height={16} sx={{ opacity: 0.45 }} />
                <Skeleton variant="text" width={index === 6 ? "92%" : "74%"} height={24} />
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6} sx={{ display: "flex" }}>
        <Paper elevation={0} sx={sectionSx}>
          <Typography variant="h6" sx={sectionTitleSx}>
            <StorageIcon fontSize="small" />
            Version Information
          </Typography>
          <Stack spacing={1.1} sx={{ width: "100%" }}>
            {[0, 1, 2, 3].map((item) => (
              <Box key={item}>
                <Skeleton variant="text" width="38%" height={16} sx={{ opacity: 0.45 }} />
                <Skeleton variant="text" width="68%" height={24} />
              </Box>
            ))}
          </Stack>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6} sx={{ display: "flex" }}>
        <Paper elevation={0} sx={sectionSx}>
          <Typography variant="h6" sx={sectionTitleSx}>
            <LinkIcon fontSize="small" />
            Repository URLs
          </Typography>
          <Stack spacing={1.1} sx={{ width: "100%" }}>
            {[0, 1, 2].map((item) => (
              <Box key={item}>
                <Skeleton variant="text" width="42%" height={16} sx={{ opacity: 0.45 }} />
                <Skeleton variant="text" width="88%" height={24} />
              </Box>
            ))}
          </Stack>
        </Paper>
      </Grid>

      <Grid item xs={12}>
        <Paper elevation={0} sx={sectionSx}>
          <Typography variant="h6" sx={sectionTitleSx}>
            <SettingsIcon fontSize="small" />
            Watcher Configuration
          </Typography>
          <Stack spacing={1.1}>
            {[0, 1, 2, 3].map((item) => (
              <Box key={item}>
                <Skeleton variant="text" width="38%" height={16} sx={{ opacity: 0.45 }} />
                <Skeleton variant="text" width="68%" height={24} />
              </Box>
            ))}
          </Stack>
        </Paper>
      </Grid>

      <Grid item xs={12}>
        <Paper elevation={0} sx={sectionSx}>
          <Typography variant="h6" sx={sectionTitleSx}>
            <DescriptionIcon fontSize="small" />
            Description
          </Typography>
          <Skeleton variant="text" width="98%" height={20} />
          <Skeleton variant="text" width="92%" height={20} />
          <Skeleton variant="text" width="84%" height={20} />
        </Paper>
      </Grid>
    </Grid>
  );

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh',
          bgcolor: 'background.paper',
          backgroundImage: 'none',
        }
      }}
    >
      <DialogTitle sx={{
        m: 0,
        p: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AppsIcon sx={{ color: "#60A5FA" }} />
          <Typography variant="h6" component="div">
            Component DB Details
          </Typography>
        </Box>
        <IconButton aria-label="close" onClick={onClose} sx={tintedIconButtonSx("#94A3B8")}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2, bgcolor: 'background.paper' }}>
        {!data ? renderLoadingState() : (
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Paper elevation={0} sx={sectionSx}>
              <Typography variant="h6" sx={sectionTitleSx}>
                <ComputerIcon fontSize="small" />
                Basic Information
              </Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6} md={4}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>Component Name</Typography>
                    <Typography variant="body2" sx={valueSx}>
                      {data.component_name || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>IP Address</Typography>
                    <Typography variant="body2" sx={{ ...valueSx, fontFamily: "monospace" }}>
                      {data.ip || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>Region</Typography>
                    <Typography variant="body2" sx={valueSx}>
                      {data.region || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>Platform</Typography>
                    <Box sx={{ mt: 0.35 }}>
                      {(() => {
                        const { color, Icon } = getPlatformConfig(data.platform);
                        return (
                          <StatusChip
                            label={data.platform || 'N/A'}
                            color={color}
                            Icon={Icon}
                            sx={chipSx("platform")}
                          />
                        );
                      })()}
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>Version</Typography>
                    <Typography variant="body2" sx={valueSx}>
                      {data.comp_version || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>Pipeline</Typography>
                    <Box sx={{ mt: 0.35 }}>
                      {(() => {
                        const { color, Icon } = isToolCategory(data)
                          ? { color: "#94A3B8", Icon: getYesNoConfig(data.pipeline).Icon }
                          : getYesNoConfig(data.pipeline);
                        return (
                          <StatusChip
                            label={getPipelineDisplayLabel(data)}
                            color={color}
                            Icon={Icon}
                            sx={chipSx("pipeline")}
                          />
                        );
                      })()}
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>Watcher</Typography>
                    <Box sx={{ mt: 0.35 }}>
                      {(() => {
                        const { color, Icon } = getWatcherStatusConfig(data.watcher);
                        return (
                          <StatusChip
                            label={data.watcher || 'N/A'}
                            color={color}
                            Icon={Icon}
                            sx={chipSx("watcher")}
                          />
                        );
                      })()}
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>Component Path</Typography>
                    <Typography variant="body2" sx={{ ...valueSx, fontFamily: "monospace" }}>
                      {data.comp_path || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Version Information */}
          <Grid item xs={12} md={6} sx={{ display: "flex" }}>
            <Paper elevation={0} sx={sectionSx}>
              <Typography variant="h6" sx={sectionTitleSx}>
                <StorageIcon fontSize="small" />
                Version Information
              </Typography>
              <Stack spacing={1.1}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={labelSx}>Previous Tag</Typography>
                  <Typography variant="body2" sx={valueSx}>
                    {data.previous_tag && data.previous_tag !== "Unknown" ? data.previous_tag : 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={labelSx}>Release Date</Typography>
                  <Typography variant="body2" sx={valueSx}>
                    {data.release_date || 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={labelSx}>Last Run Time</Typography>
                  <Typography variant="body2" sx={valueSx}>
                    {data.last_run_time || 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={labelSx}>Last Update Time</Typography>
                  <Typography variant="body2" sx={valueSx}>
                    {data.last_update_time || 'N/A'}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {/* Repository URLs */}
          <Grid item xs={12} md={6} sx={{ display: "flex" }}>
            <Paper elevation={0} sx={sectionSx}>
              <Typography variant="h6" sx={sectionTitleSx}>
                <LinkIcon fontSize="small" />
                Repository URLs
              </Typography>
              <Stack spacing={1.1}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={labelSx}>Code Repository</Typography>
                  <Typography variant="body2" sx={valueSx}>
                    {data.code_repo_url && data.code_repo_url !== "Unknown" ? (
                      <Link
                        href={data.code_repo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        sx={{ fontSize: "0.875rem", lineHeight: 1.25 }}
                      >
                        {data.code_repo_url}
                      </Link>
                    ) : 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={labelSx}>Config Repository</Typography>
                  <Typography variant="body2" sx={valueSx}>
                    {data.config_repo_url && data.config_repo_url !== "Unknown" ? (
                      <Link
                        href={data.config_repo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        sx={{ fontSize: "0.875rem", lineHeight: 1.25 }}
                      >
                        {data.config_repo_url}
                      </Link>
                    ) : 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={labelSx}>Script Repository</Typography>
                  <Typography variant="body2" sx={valueSx}>
                    {data.script_repo_url && data.script_repo_url !== "Unknown" ? (
                      <Link
                        href={data.script_repo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        sx={{ fontSize: "0.875rem", lineHeight: 1.25 }}
                      >
                        {data.script_repo_url}
                      </Link>
                    ) : 'N/A'}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {/* Watcher Configuration */}
          <Grid item xs={12}>
            <Paper elevation={0} sx={sectionSx}>
              <Typography variant="h6" sx={sectionTitleSx}>
                <SettingsIcon fontSize="small" />
                Watcher Configuration
              </Typography>
              <Stack spacing={1.1}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={labelSx}>Tag</Typography>
                  <Typography variant="body2" sx={valueSx}>{meta.tag ?? "N/A"}</Typography>
                </Box>

                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: { xs: "flex-start", sm: "center" },
                      justifyContent: "space-between",
                      gap: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">Schedules</Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setShowLocalScheduleTime((current) => !current)}
                      sx={{ minWidth: 0, px: 1.25, height: 28, fontSize: "0.75rem" }}
                    >
                      {showLocalScheduleTime ? "Show GMT" : "Convert To Local Time"}
                    </Button>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                    {showLocalScheduleTime
                      ? `Displaying times in local timezone: ${localTimeZone}`
                      : "Displaying schedule times in GMT"}
                  </Typography>
                  {schedules.length ? (
                    <TableContainer
                      sx={{
                        mt: 0.5,
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1.5,
                        overflow: "hidden",
                      }}
                    >
                      <Table
                        size="small"
                        sx={{
                          "& .MuiTableCell-root": { py: 0.4, px: 1.25, fontSize: "0.78rem", lineHeight: 1.2 },
                          "& .MuiTableHead-root .MuiTableCell-root": { fontWeight: 700 },
                        }}
                      >
                        <TableHead>
                          <TableRow>
                            <TableCell>Effective Day</TableCell>
                            <TableCell>
                              {showLocalScheduleTime ? `Start Time (${localTimeZone})` : "Start Time (GMT)"}
                            </TableCell>
                            <TableCell>
                              {showLocalScheduleTime ? `End Time (${localTimeZone})` : "End Time (GMT)"}
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {schedules.map((schedule, index) => {
                            const isToday =
                              String(schedule?.effective_day || "").toLowerCase() ===
                              currentEffectiveDay.toLowerCase();
                            return (
                              <TableRow
                                key={`${schedule?.effective_day || "schedule"}-${schedule?.start_time || index}-${schedule?.end_time || index}`}
                                sx={{
                                  backgroundColor: isToday ? "rgba(96, 165, 250, 0.12)" : "transparent",
                                  boxShadow: isToday ? "inset 3px 0 0 rgba(96, 165, 250, 0.9)" : "none",
                                  "& .MuiTableCell-root": { fontWeight: isToday ? 700 : 500 },
                                }}
                              >
                                <TableCell>{schedule?.effective_day || "N/A"}</TableCell>
                                <TableCell>{formatScheduleTime(schedule?.start_time, showLocalScheduleTime)}</TableCell>
                                <TableCell>{formatScheduleTime(schedule?.end_time, showLocalScheduleTime)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography variant="body2" sx={{ mt: 0.35, fontWeight: 500 }}>N/A</Typography>
                  )}
                </Box>

                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={labelSx}>Max Up Days</Typography>
                      <Typography variant="body2" sx={valueSx}>{formatDays(meta.max_up_days)}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={labelSx}>Need To Up</Typography>
                      <Typography variant="body2" sx={valueSx}>{formatBooleanLabel(meta.need_to_up)}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={labelSx}>Need To Send Mail</Typography>
                      <Typography variant="body2" sx={valueSx}>{formatBooleanLabel(meta.need_to_send_mail)}</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Stack>
            </Paper>
          </Grid>

          {/* Description */}
          {data.description && data.description !== "Unknown" && (
            <Grid item xs={12}>
              <Paper elevation={0} sx={sectionSx}>
                <Typography variant="h6" sx={sectionTitleSx}>
                  <DescriptionIcon fontSize="small" />
                  Description
                </Typography>
                <Typography variant="body2" sx={valueSx}>
                  {data.description}
                </Typography>
              </Paper>
            </Grid>
          )}
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
};

ComponentDetailsModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  data: PropTypes.shape({
    code_repo_url: PropTypes.string,
    comp_path: PropTypes.string,
    comp_version: PropTypes.string,
    component_name: PropTypes.string,
    config_meta: PropTypes.shape({
      tag: PropTypes.string,
      schedules: PropTypes.arrayOf(
        PropTypes.shape({
          effective_day: PropTypes.string,
          start_time: PropTypes.string,
          end_time: PropTypes.string,
        })
      ),
      max_up_days: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      need_to_up: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
      need_to_send_mail: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
    }),
    category: PropTypes.string,
    config_repo_url: PropTypes.string,
    description: PropTypes.string,
    ip: PropTypes.string,
    last_run_time: PropTypes.string,
    last_update_time: PropTypes.string,
    pipeline: PropTypes.string,
    platform: PropTypes.string,
    previous_tag: PropTypes.string,
    region: PropTypes.string,
    release_date: PropTypes.string,
    script_repo_url: PropTypes.string,
    watcher: PropTypes.string,
  }),
};

ComponentDetailsModal.defaultProps = {
  data: null,
};

export default ComponentDetailsModal;
