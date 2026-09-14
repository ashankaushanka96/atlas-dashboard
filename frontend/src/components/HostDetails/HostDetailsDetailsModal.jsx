import React from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  IconButton,
  Link,
  Paper,
  Skeleton,
  Stack,
  Divider,
  Typography,
} from "@mui/material";
import {
  Close as CloseIcon,
  ContentCopy as ContentCopyIcon,
  Dns as DnsIcon,
  Schedule as ScheduleIcon,
  Security as SecurityIcon,
  RoomOutlined as RoomOutlinedIcon,
  Computer as ComputerIcon,
  Code as CodeIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  HomeOutlined as HomeOutlinedIcon,
  VisibilityOutlined as VisibilityOutlinedIcon,
  NewReleasesOutlined as NewReleasesOutlinedIcon,
  AppsOutlined as AppsOutlinedIcon,
  FolderOutlined as FolderOutlinedIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import StatusChip from "./StatusChip";
import hexToRgb from "../shared/hexToRgb";
import { getArchConfig, getCompliantStatusConfig, getOsConfig, getYesNoConfig } from "./statusConfig";

const MEMORY_ACCENT = "#34D399";
const COMPUTE_ACCENT = "#F59E0B";

const PYTHON_ACCENT = "#22D3EE";

const tintedIconButtonSx = (color) => ({
  color,
  bgcolor: `rgba(${hexToRgb(color)}, 0.12)`,
  "&:hover": { bgcolor: `rgba(${hexToRgb(color)}, 0.24)` },
});

const PLATFORM_COLORS = {
  java: "#F59E0B",
  "c++": "#60A5FA",
  cpp: "#60A5FA",
  python: "#34D399",
  "node.js": "#A78BFA",
  nodejs: "#A78BFA",
  go: "#22D3EE",
};

function getPlatformTint(platform) {
  return PLATFORM_COLORS[String(platform || "").toLowerCase()] || "#94A3B8";
}

// Fixed pill widths so chips in the same column line up regardless of
// label length (e.g. "Java" vs "Node.js", "Yes" vs "Unconfigured").
const CHIP_MIN_WIDTH = {
  os: 130,
  compliantStatus: 170,
  platform: 110,
  watcher: 90,
  pipeline: 90,
};

const chipSx = (column) => ({ minWidth: CHIP_MIN_WIDTH[column], justifyContent: "center" });

const sectionTitleSx = {
  mb: 1,
  display: "flex",
  alignItems: "center",
  gap: 1,
  fontWeight: 700,
  fontSize: "1rem",
};

const labelSx = { lineHeight: 1.2 };

const valueSx = {
  mt: 0.15,
  fontWeight: 500,
  lineHeight: 1.25,
  fontSize: "0.875rem",
};

function PathRow({ Icon, label, value }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1,
        p: 1,
        borderRadius: 1.5,
        bgcolor: "rgba(148, 163, 184, 0.06)",
        border: "1px solid rgba(148, 163, 184, 0.1)",
      }}
    >
      <Icon sx={{ fontSize: 16, color: "#94A3B8", mt: 0.2, flexShrink: 0 }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={labelSx}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ ...valueSx, fontFamily: "monospace", wordBreak: "break-all" }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

function formatStatusLabel(value) {
  if (!value) return "N/A";
  return String(value)
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTimestamp(value) {
  if (!value) return "N/A";
  const numericValue = Number(value);
  const normalizedValue =
    Number.isNaN(numericValue) ? value : numericValue < 1e12 ? numericValue * 1000 : numericValue;
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatMemoryGb(memoryMb) {
  if (memoryMb === null || memoryMb === undefined) return "N/A";
  const value = Number(memoryMb);
  if (Number.isNaN(value)) return String(memoryMb);
  return `${(value / 1024).toFixed(2)} GB`;
}

function renderValue(value) {
  if (value === null || value === undefined || value === "") return "N/A";
  return value;
}

function handleCopyValue(value) {
  if (!value) return;

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(value).catch(() => {});
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
}

function looksLikeCronExpression(value) {
  if (!value) return false;
  const trimmed = value.trim();
  const candidate = trimmed.startsWith("#") ? trimmed.slice(1).trimStart() : trimmed;
  const parts = candidate.split(/\s+/);
  if (parts.length < 6) return false;
  return parts.slice(0, 5).every((part) => /^[\d/*,\-]+$/.test(part));
}

function renderCronToken(token, keyPrefix) {
  return token.split("").map((char, index) => {
    let color = "#ff5f5f";
    if (char === "*") color = "#5fff87";
    if (char === ",") color = "#ff79c6";
    if (char === "/") color = "#ff79c6";
    if (char === "-") color = "#ff79c6";

    return (
      <Box
        key={`${keyPrefix}-${index}`}
        component="span"
        sx={{ color, fontFamily: "monospace" }}
      >
        {char}
      </Box>
    );
  });
}

function renderCronLine(cron, index) {
  const raw = String(cron || "");
  const trimmed = raw.trim();
  const isCronLike = looksLikeCronExpression(raw);

  if (!trimmed) {
    return (
      <Typography
        key={`cron-empty-${index}`}
        variant="body2"
        sx={{ color: "#f8f8f2", fontFamily: "monospace", whiteSpace: "pre-wrap" }}
      >
        {raw}
      </Typography>
    );
  }

  if (!isCronLike) {
    return (
      <Typography
        key={`cron-text-${index}`}
        variant="body2"
        sx={{
          color: "#25c6ff",
          fontFamily: "monospace",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {raw}
      </Typography>
    );
  }

  const hasLeadingComment = trimmed.startsWith("#");
  if (hasLeadingComment) {
    return (
      <Typography
        key={`cron-comment-${index}`}
        variant="body2"
        sx={{
          color: "#25c6ff",
          fontFamily: "monospace",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {raw}
      </Typography>
    );
  }

  const candidate = hasLeadingComment ? trimmed.slice(1).trimStart() : trimmed;
  const parts = candidate.split(/\s+/);
  const schedule = parts.slice(0, 5);
  const command = parts.slice(5).join(" ");

  return (
    <Typography
      key={`cron-structured-${index}`}
      variant="body2"
      component="div"
      sx={{
        fontFamily: "monospace",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        lineHeight: 1.4,
      }}
    >
      {schedule.map((token, tokenIndex) => (
        <Box key={`schedule-${index}-${tokenIndex}`} component="span">
          {renderCronToken(token, `token-${index}-${tokenIndex}`)}
          <Box component="span" sx={{ color: "#f8f8f2", fontFamily: "monospace" }}>
            {" "}
          </Box>
        </Box>
      ))}
      <Box component="span" sx={{ color: "#f1e05a", fontFamily: "monospace" }}>
        {command}
      </Box>
    </Typography>
  );
}

function HostDetailsDetailsModal({
  open,
  onClose,
  data,
  loading,
  inspectorFindingsRequested,
  inspectorFindingsLoading,
  onLoadInspectorFindings,
}) {
  const theme = useTheme();

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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: "90vh",
          bgcolor: "background.paper",
          backgroundImage: "none",
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <DnsIcon sx={{ color: "#60A5FA" }} />
          <Typography variant="h6" component="div">
            Host Details
          </Typography>
        </Box>
        <IconButton aria-label="close" onClick={onClose} sx={tintedIconButtonSx("#94A3B8")}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2, bgcolor: "background.paper" }}>
        {loading ? (
          <Grid container spacing={2} sx={{ mt: 0.2 }}>
            <Grid item xs={12}>
              <Paper elevation={0} sx={sectionSx}>
                <Typography variant="h6" sx={sectionTitleSx}>
                  <DnsIcon fontSize="small" />
                  Loading Host Details
                </Typography>
                <Grid container spacing={1.5}>
                  {[...Array(8)].map((_, index) => (
                    <Grid key={index} item xs={12} sm={3}>
                      <Skeleton variant="text" width="35%" height={18} sx={{ opacity: 0.45 }} />
                      <Skeleton variant="text" width="80%" height={30} />
                    </Grid>
                  ))}
                  <Grid item xs={12}>
                    <Skeleton variant="text" width="16%" height={18} sx={{ opacity: 0.45 }} />
                    <Skeleton variant="text" width="92%" height={30} />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6} sx={{ display: "flex" }}>
              <Paper elevation={0} sx={sectionSx}>
                <Typography variant="h6" sx={sectionTitleSx}>
                  <DnsIcon fontSize="small" />
                  System Details
                </Typography>
                <Grid container spacing={1.5}>
                  {[...Array(12)].map((_, index) => (
                    <Grid key={index} item xs={12} sm={6}>
                      <Skeleton variant="text" width="42%" height={18} sx={{ opacity: 0.45 }} />
                      <Skeleton variant="text" width="88%" height={28} />
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6} sx={{ display: "flex" }}>
              <Paper elevation={0} sx={sectionSx}>
                <Typography variant="h6" sx={sectionTitleSx}>
                  <FolderOutlinedIcon fontSize="small" />
                  Paths
                </Typography>
                <Stack spacing={1}>
                  {[...Array(3)].map((_, index) => (
                    <Box key={index}>
                      <Skeleton variant="text" width="34%" height={18} sx={{ opacity: 0.45 }} />
                      <Skeleton variant="text" width="92%" height={28} />
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} sx={{ display: "flex" }}>
              <Paper elevation={0} sx={sectionSx}>
                <Typography variant="h6" sx={sectionTitleSx}>
                  <ScheduleIcon fontSize="small" />
                  Crons
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 0,
                    overflow: "hidden",
                    borderRadius: 2,
                    bgcolor: "#1f1f1f",
                    borderColor: "rgba(255,255,255,0.12)",
                  }}
                >
                  <Box
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                      bgcolor: "rgba(255,255,255,0.02)",
                      display: "flex",
                      alignItems: "center",
                      gap: 0.75,
                    }}
                  >
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#f87171" }} />
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#fbbf24" }} />
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#34d399" }} />
                    <Typography variant="caption" sx={{ ml: 1, color: "#f8f8f2", fontFamily: "monospace" }}>
                      crontab
                    </Typography>
                  </Box>
                  <Box sx={{ px: 1.5, py: 1 }}>
                    {[...Array(5)].map((_, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "44px minmax(0, 1fr)",
                          gap: 1,
                          py: 0.5,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: "rgba(148,163,184,0.95)",
                            fontFamily: "monospace",
                            textAlign: "right",
                            pr: 1,
                            borderRight: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          {index + 1}
                        </Typography>
                        <Skeleton
                          variant="text"
                          width={`${78 - index * 6}%`}
                          height={26}
                          sx={{ bgcolor: "rgba(37,198,255,0.16)" }}
                        />
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper elevation={0} sx={sectionSx}>
                <Typography variant="h6" sx={sectionTitleSx}>
                  <SecurityIcon fontSize="small" />
                  Inspector Findings
                </Typography>
                <Stack spacing={1.1}>
                  {[...Array(2)].map((_, index) => (
                    <Paper key={index} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1 }}>
                        <Skeleton variant="text" width="48%" height={28} />
                        <Skeleton variant="rounded" width={92} height={28} />
                      </Box>
                      <Stack spacing={0.75}>
                        <Skeleton variant="text" width="96%" height={22} />
                        <Skeleton variant="text" width="82%" height={20} />
                        <Skeleton variant="text" width="74%" height={20} />
                        <Skeleton variant="text" width="62%" height={20} />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        ) : !data ? (
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              No server details available.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Paper elevation={0} sx={sectionSx}>
                <Typography variant="h6" sx={sectionTitleSx}>
                  <DnsIcon fontSize="small" />
                  Basic Information
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 1.5,
                    mb: 1.5,
                    pb: 1.5,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 700, lineHeight: 1.3, wordBreak: "break-word" }}
                  >
                    {data.hostname || "N/A"}
                  </Typography>
                  {(() => {
                    const { color, Icon } = getCompliantStatusConfig(data.compliant_status);
                    return (
                      <StatusChip
                        label={formatStatusLabel(data.compliant_status)}
                        color={color}
                        Icon={Icon}
                        sx={chipSx("compliantStatus")}
                      />
                    );
                  })()}
                </Box>

                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>
                      Region
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <StatusChip label={data.region || "N/A"} color="#60A5FA" Icon={RoomOutlinedIcon} />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>
                      IP Address
                    </Typography>
                    <Typography variant="body2" sx={{ ...valueSx, fontFamily: "monospace" }}>
                      {data.ip || "N/A"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>
                      FQDN
                    </Typography>
                    <Typography variant="body2" sx={valueSx}>
                      {renderValue(data.fqdn)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>
                      All IPs
                    </Typography>
                    <Typography variant="body2" sx={{ ...valueSx, fontFamily: "monospace" }}>
                      {data.all_ips?.length ? data.all_ips.join(", ") : "N/A"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>
                      Last Ingested
                    </Typography>
                    <Typography variant="body2" sx={valueSx}>
                      {formatTimestamp(data.last_ingested_at)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>
                      Timestamp
                    </Typography>
                    <Typography variant="body2" sx={valueSx}>
                      {formatTimestamp(data.ts)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>
                      Platform
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.15 }}>
                      <ComputerIcon sx={{ fontSize: 15, color: "text.secondary", flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ ...valueSx, mt: 0, wordBreak: "break-word" }}>
                        {renderValue(data.platform)}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6} sx={{ display: "flex" }}>
              <Paper elevation={0} sx={sectionSx}>
                <Typography variant="h6" sx={sectionTitleSx}>
                  <DnsIcon fontSize="small" />
                  System Details
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>OS</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {(() => {
                        const { color, Icon } = getOsConfig(data.os);
                        return (
                          <StatusChip
                            label={renderValue(data.os)}
                            color={color}
                            Icon={Icon}
                            sx={chipSx("os")}
                          />
                        );
                      })()}
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>Architecture</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {(() => {
                        const { color, Icon } = getArchConfig(data.architecture);
                        return <StatusChip label={renderValue(data.architecture)} color={color} Icon={Icon} />;
                      })()}
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>Python Version</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <StatusChip label={renderValue(data.python_version)} color={PYTHON_ACCENT} Icon={CodeIcon} />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>OS Version</Typography>
                    <Typography variant="body2" sx={valueSx}>{renderValue(data.os_version)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>OS Release</Typography>
                    <Typography variant="body2" sx={valueSx}>{renderValue(data.os_release)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>Current User</Typography>
                    <Typography variant="body2" sx={valueSx}>{renderValue(data.current_username)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>Kernel Version</Typography>
                    <Typography variant="body2" sx={valueSx}>{renderValue(data.kernel_version)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>Kernel Release</Typography>
                    <Typography variant="body2" sx={valueSx}>{renderValue(data.kernel_release)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>Compute</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <StatusChip
                        label={
                          data.vcpus || data.cores
                            ? `${renderValue(data.vcpus)} vCPUs · ${renderValue(data.cores)} cores`
                            : "N/A"
                        }
                        color={COMPUTE_ACCENT}
                        Icon={SpeedIcon}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>Memory</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <StatusChip
                        label={formatMemoryGb(data.total_memory_mb)}
                        color={MEMORY_ACCENT}
                        Icon={StorageIcon}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>Boot Time</Typography>
                    <Typography variant="body2" sx={valueSx}>{formatTimestamp(data.boot_time ? data.boot_time * 1000 : null)}</Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6} sx={{ display: "flex" }}>
              <Paper elevation={0} sx={sectionSx}>
                <Typography variant="h6" sx={sectionTitleSx}>
                  <FolderOutlinedIcon fontSize="small" />
                  Paths
                </Typography>
                <Stack spacing={0.75}>
                  <PathRow Icon={HomeOutlinedIcon} label="Home Directory" value={renderValue(data.home_directory)} />
                  <PathRow
                    Icon={VisibilityOutlinedIcon}
                    label="Watcher Directory"
                    value={renderValue(data.watcher_directory)}
                  />
                  <PathRow
                    Icon={NewReleasesOutlinedIcon}
                    label="Watcher Version"
                    value={renderValue(data.watcher_version)}
                  />
                  <PathRow Icon={AppsOutlinedIcon} label="Apps Directory" value={renderValue(data.apps_directory)} />
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} sx={{ display: "flex" }}>
              <Paper elevation={0} sx={sectionSx}>
                <Typography variant="h6" sx={sectionTitleSx}>
                  <ScheduleIcon fontSize="small" />
                  Crons
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 0,
                    overflowX: "auto",
                    overflowY: "hidden",
                    borderRadius: 2,
                    bgcolor: "#1f1f1f",
                    borderColor: "rgba(255,255,255,0.12)",
                  }}
                >
                  <Box
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                      bgcolor: "rgba(255,255,255,0.02)",
                      display: "flex",
                      alignItems: "center",
                      gap: 0.75,
                    }}
                  >
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#f87171" }} />
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#fbbf24" }} />
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#34d399" }} />
                    <Typography variant="caption" sx={{ ml: 1, color: "#f8f8f2", fontFamily: "monospace" }}>
                      crontab
                    </Typography>
                  </Box>
                  {data.crons?.length ? (
                    <Box sx={{ px: 0, py: 1, minWidth: "fit-content" }}>
                      {data.crons.map((cron, index) => (
                        <Box
                          key={`${cron}-${index}`}
                          sx={{
                            display: "grid",
                            gridTemplateColumns: "44px minmax(0, 1fr)",
                            gap: 1,
                            px: 1.5,
                            py: 0.5,
                            "&:hover": { bgcolor: "rgba(255,255,255,0.03)" },
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color: "rgba(148,163,184,0.95)",
                              fontFamily: "monospace",
                              textAlign: "right",
                              pr: 1,
                              borderRight: "1px solid rgba(255,255,255,0.08)",
                            }}
                          >
                            {index + 1}
                          </Typography>
                          <Box sx={{ whiteSpace: "nowrap" }}>{renderCronLine(cron, index)}</Box>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ px: 2, py: 2, color: "#25c6ff", fontFamily: "monospace" }}>
                      # No cron entries available
                    </Typography>
                  )}
                </Paper>
              </Paper>
            </Grid>

            <Grid item xs={12} sx={{ display: "flex" }}>
              <Paper elevation={0} sx={sectionSx}>
                <Typography variant="h6" sx={sectionTitleSx}>
                  <DnsIcon fontSize="small" />
                  Components
                </Typography>
                {data.components?.length ? (
                  <TableContainer
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1.5,
                      overflow: "hidden",
                    }}
                  >
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell align="center">Component Name</TableCell>
                            <TableCell align="center">Platform</TableCell>
                            <TableCell align="center">Watcher Status</TableCell>
                            <TableCell align="center">Pipeline Status</TableCell>
                            <TableCell align="center">Component Path</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                        {data.components.map((component, index) => (
                            <TableRow
                              key={`${component.component_name || "component"}-${component.ip || data.ip || index}-${index}`}
                              hover
                            >
                              <TableCell align="center">
                                <Typography variant="body2">
                                  {component.component_name
                                    ? String(component.component_name).toLowerCase()
                                    : "N/A"}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={component.platform || "N/A"}
                                  size="small"
                                  sx={{
                                    bgcolor: `rgba(${hexToRgb(getPlatformTint(component.platform))}, 0.16)`,
                                    color: getPlatformTint(component.platform),
                                    fontWeight: 600,
                                    ...chipSx("platform"),
                                  }}
                                />
                              </TableCell>
                              <TableCell align="center">
                                {(() => {
                                  const { color, Icon } = getYesNoConfig(component.watcher);
                                  return (
                                    <StatusChip
                                      label={component.watcher || "N/A"}
                                      color={color}
                                      Icon={Icon}
                                      sx={chipSx("watcher")}
                                    />
                                  );
                                })()}
                              </TableCell>
                              <TableCell align="center">
                                {(() => {
                                  const { color, Icon } = getYesNoConfig(component.pipeline);
                                  return (
                                    <StatusChip
                                      label={component.pipeline || "N/A"}
                                      color={color}
                                      Icon={Icon}
                                      sx={chipSx("pipeline")}
                                    />
                                  );
                                })()}
                              </TableCell>
                              <TableCell align="center">
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 1,
                                  }}
                                >
                                  <Typography
                                    variant="body2"
                                    sx={{ fontFamily: "monospace", wordBreak: "break-word" }}
                                  >
                                    {renderValue(component.comp_path)}
                                  </Typography>
                                  {component.comp_path ? (
                                    <IconButton
                                      size="small"
                                      onClick={() => handleCopyValue(component.comp_path)}
                                      sx={tintedIconButtonSx("#94A3B8")}
                                    >
                                      <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                  ) : null}
                                </Box>
                              </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No components available for this host.
                  </Typography>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} sx={{ display: "flex" }}>
              <Paper elevation={0} sx={sectionSx}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    mb: inspectorFindingsRequested ? 1.5 : 0,
                  }}
                >
                  <Typography variant="h6" sx={{ ...sectionTitleSx, mb: 0 }}>
                    <SecurityIcon fontSize="small" />
                    Inspector Findings
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={onLoadInspectorFindings}
                    disabled={inspectorFindingsLoading}
                    startIcon={
                      inspectorFindingsLoading ? <CircularProgress size={14} /> : <SecurityIcon fontSize="small" />
                    }
                    sx={{
                      borderRadius: 999,
                      borderColor: "rgba(167, 139, 250, 0.4)",
                      color: "#A78BFA",
                      "&:hover": { borderColor: "#A78BFA", bgcolor: "rgba(167, 139, 250, 0.08)" },
                    }}
                  >
                    {inspectorFindingsLoading
                      ? "Checking..."
                      : inspectorFindingsRequested
                      ? "Recheck"
                      : "Check Inspector Findings"}
                  </Button>
                </Box>
                {!inspectorFindingsRequested ? (
                  <Typography variant="body2" color="text.secondary">
                    Inspector findings are not loaded yet. Click Check Inspector Findings to fetch them from AWS.
                  </Typography>
                ) : inspectorFindingsLoading ? (
                  <Stack spacing={1.1}>
                    {[...Array(2)].map((_, index) => (
                      <Paper key={index} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1 }}>
                          <Skeleton variant="text" width="48%" height={28} />
                          <Skeleton variant="rounded" width={92} height={28} />
                        </Box>
                        <Stack spacing={0.75}>
                          <Skeleton variant="text" width="96%" height={22} />
                          <Skeleton variant="text" width="82%" height={20} />
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                ) : data.inspector_findings?.length ? (
                  <Stack spacing={1.1}>
                    {data.inspector_findings.map((finding, index) => (
                      <Paper
                        key={finding.finding_arn || `${finding.title}-${index}`}
                        variant="outlined"
                        sx={{ p: 1.5, borderRadius: 2 }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {finding.title || "Untitled finding"}
                          </Typography>
                          {(() => {
                            const isSevere = ["CRITICAL", "HIGH"].includes(
                              String(finding.severity || "").toUpperCase()
                            );
                            const severityColor = isSevere ? "#E24B4A" : "#F59E0B";
                            return (
                              <Chip
                                size="small"
                                label={finding.severity || "UNKNOWN"}
                                sx={{
                                  bgcolor: `rgba(${hexToRgb(severityColor)}, 0.16)`,
                                  color: severityColor,
                                  fontWeight: 600,
                                }}
                              />
                            );
                          })()}
                        </Box>
                        <Stack spacing={0.75}>
                          <Typography variant="body2" color="text.secondary">
                            {finding.description || "No description provided."}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Vulnerability: {finding.vulnerability_id || "N/A"} | Package: {finding.package_name || "N/A"} {finding.package_version ? `(${finding.package_version})` : ""}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Inspector Score: {finding.inspector_score ?? "N/A"} | First Observed: {formatTimestamp(finding.first_observed_at)} | Last Observed: {formatTimestamp(finding.last_observed_at)}
                          </Typography>
                          {finding.remediation ? (
                            <Typography variant="body2">
                              Remediation: {finding.remediation}
                            </Typography>
                          ) : null}
                          {finding.recommendation_url ? (
                            <Link href={finding.recommendation_url} target="_blank" rel="noopener noreferrer" underline="hover">
                              Recommendation
                            </Link>
                          ) : null}
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {["NON_COMPLIANT", "PARTIALLY_COMPLIANT"].includes(String(data.compliant_status || "").toUpperCase())
                      ? "No active Inspector findings were returned."
                      : "Inspector findings are shown only for AWS servers with Inspector-based compliance findings."}
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default HostDetailsDetailsModal;
