import React, { useState } from "react";
import {
  alpha,
  Badge,
  Box,
  Button,
  IconButton,
  Popover,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { formatDistanceToNowStrict } from "date-fns";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import DeleteSweepRoundedIcon from "@mui/icons-material/DeleteSweepRounded";
import NotificationsOffRoundedIcon from "@mui/icons-material/NotificationsOffRounded";
import StatusChip from "../HostDetails/StatusChip";
import {
  formatStatusLabel,
  getPortStatusConfig,
  getProcessStatusConfig,
} from "../WatcherStatus/statusChipUtils";
import { toneStyles } from "./toneStyles";
import { useNotifications } from "./NotificationProvider";
import MetaPill from "./MetaPill";

const KIND_META = {
  port: { label: "Port", color: "#60A5FA" },
  process: { label: "Process", color: "#A78BFA" },
};

const getStatusConfig = (kind, status) =>
  kind === "port" ? getPortStatusConfig(status) : getProcessStatusConfig(status);

const formatWhen = (ts) => {
  try {
    return `${formatDistanceToNowStrict(ts)} ago`;
  } catch {
    return "";
  }
};

export default function NotificationHistoryButton() {
  const theme = useTheme();
  const { history, clearHistory, openNotificationTarget } = useNotifications();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const isLight = theme.palette.mode === "light";

  return (
    <>
      <IconButton
        onClick={(event) => setAnchorEl(event.currentTarget)}
        title="Notification history"
        sx={{
          color: "text.secondary",
          bgcolor: isLight ? alpha(theme.palette.common.black, 0.04) : "rgba(255,255,255,0.06)",
          "&:hover": {
            bgcolor: isLight ? alpha(theme.palette.common.black, 0.08) : "rgba(255,255,255,0.12)",
          },
        }}
      >
        <Badge
          badgeContent={history.length}
          max={99}
          color="primary"
          sx={{ "& .MuiBadge-badge": { fontSize: 10, fontWeight: 700 } }}
        >
          <HistoryRoundedIcon fontSize="small" />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { mt: 1, width: 400, maxWidth: "92vw", borderRadius: 3 } } }}
      >
        <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Notification history
          </Typography>
          {history.length ? (
            <Button
              size="small"
              startIcon={<DeleteSweepRoundedIcon sx={{ fontSize: 16 }} />}
              onClick={clearHistory}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Clear all
            </Button>
          ) : null}
        </Box>

        <Box sx={{ maxHeight: 420, overflowY: "auto", px: 1, pb: 1 }}>
          {history.length === 0 ? (
            <Stack alignItems="center" spacing={1} sx={{ py: 5, color: "text.secondary" }}>
              <NotificationsOffRoundedIcon sx={{ fontSize: 28, opacity: 0.6 }} />
              <Typography variant="body2">No notifications yet</Typography>
            </Stack>
          ) : (
            <Stack spacing={1}>
              {history.map((item) => {
                const tone = toneStyles[item.tone] || toneStyles.default;
                const kindMeta = KIND_META[item.kind] || { label: "Watcher", color: "#94A3B8" };
                const fromConfig = getStatusConfig(item.kind, item.from);
                const toConfig = getStatusConfig(item.kind, item.to);

                return (
                  <Box
                    key={item.id}
                    onClick={() => {
                      openNotificationTarget(item);
                      setAnchorEl(null);
                    }}
                    sx={{
                      p: 1.25,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      background: isLight
                        ? alpha(tone.accent, 0.05)
                        : alpha(tone.accent, 0.08),
                      cursor: "pointer",
                      transition: "background-color 120ms ease",
                      "&:hover": {
                        background: isLight ? alpha(tone.accent, 0.1) : alpha(tone.accent, 0.14),
                      },
                    }}
                    title="Click to open and focus the component"
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                      {/* Lead with what/who this is about; the chips below
                          explain the actual change. */}
                      {item.name || (!(item.from && item.to) && item.title) ? (
                        <Typography variant="body2" sx={{ fontWeight: 800, minWidth: 0 }} noWrap>
                          {item.name || item.title}
                        </Typography>
                      ) : (
                        <Box />
                      )}
                      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                        {formatWhen(item.createdAt)}
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.6 }}>
                      <Box
                        component="span"
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: kindMeta.color,
                          bgcolor: alpha(kindMeta.color, 0.16),
                          borderRadius: 999,
                          px: 1,
                          py: 0.25,
                        }}
                      >
                        {kindMeta.label}
                      </Box>
                      {item.from ? (
                        <StatusChip
                          label={formatStatusLabel(item.from)}
                          color={fromConfig.color}
                          Icon={fromConfig.Icon}
                          sx={{ height: 22, fontSize: 11 }}
                        />
                      ) : null}
                      {item.from && item.to ? (
                        <ArrowForwardRoundedIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                      ) : null}
                      {item.to ? (
                        <StatusChip
                          label={formatStatusLabel(item.to)}
                          color={toConfig.color}
                          Icon={toConfig.Icon}
                          sx={{ height: 22, fontSize: 11 }}
                        />
                      ) : null}
                    </Stack>

                    {item.region || item.ip ? (
                      <Box sx={{ mt: 0.6 }}>
                        <MetaPill region={item.region} ip={item.ip} size="small" />
                      </Box>
                    ) : null}
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>
      </Popover>
    </>
  );
}
