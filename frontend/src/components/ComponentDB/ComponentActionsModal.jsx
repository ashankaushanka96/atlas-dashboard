import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import TuneIcon from "@mui/icons-material/Tune";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";

import { API } from "../../services/auth";
import ComponentLogViewer from "./ComponentLogViewer";
import hexToRgb from "../shared/hexToRgb";

const tintedIconButtonSx = (color) => ({
  color,
  bgcolor: `rgba(${hexToRgb(color)}, 0.12)`,
  "&:hover": { bgcolor: `rgba(${hexToRgb(color)}, 0.24)` },
});

const LIFECYCLE_LABELS = { start: "Start", stop: "Stop", restart: "Restart" };

// 502/504 from the backend specifically means it couldn't reach the watcher's
// own control API at all (connection refused / timed out) - a different
// situation from "watcher API is up but rejected the request".
const isUnreachableStatus = (status) => status === 502 || status === 504;

function ComponentActionsModal({ open, target, canManageLifecycle, canViewLogs, canDownloadLogs, onClose }) {
  const theme = useTheme();

  const [loading, setLoading] = useState(false);
  const [apiUnreachable, setApiUnreachable] = useState(false);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(null);
  const [lifecycleAction, setLifecycleAction] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState("actions");
  const [fullScreen, setFullScreen] = useState(false);

  const loadStatus = () => {
    if (!target) return;
    setLoading(true);
    setError(null);
    setApiUnreachable(false);
    setMessage(null);
    setConfirmAction(null);

    API.get("/watcher-control/component/status", {
      params: { region: target.region, ip: target.ip, tag: target.tag },
    })
      .then((response) => setRunning(Boolean(response.data.running)))
      .catch((err) => {
        if (isUnreachableStatus(err.response?.status)) setApiUnreachable(true);
        setRunning(null);
        setError(
          err.response?.data?.detail || err.response?.data?.error_message || "Failed to load component status."
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open || !target) return;
    // Only fetch a running/stopped status when it can actually drive
    // something on screen - a log-only viewer has no lifecycle buttons to
    // enable/disable, so skip the call rather than surface an unrelated
    // permission error in a tab they may never open.
    if (canManageLifecycle) {
      loadStatus();
    } else {
      setRunning(null);
    }
    // Land on whichever tab the user can actually use.
    setActiveTab(canManageLifecycle ? "actions" : "logs");
    setFullScreen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target, canManageLifecycle]);

  if (!target) return null;

  const runLifecycleAction = (action) => {
    setConfirmAction(null);
    setLifecycleAction(action);
    setError(null);
    setMessage(null);

    API.post(`/watcher-control/component/${action}`, {
      region: target.region,
      ip: target.ip,
      tag: target.tag,
    })
      .then((response) => {
        setRunning(Boolean(response.data.running));
        setMessage(response.data.message || `${LIFECYCLE_LABELS[action]} completed.`);
      })
      .catch((err) => {
        if (isUnreachableStatus(err.response?.status)) setApiUnreachable(true);
        setError(err.response?.data?.detail || err.response?.data?.error_message || `Failed to ${action} component.`);
      })
      .finally(() => setLifecycleAction(null));
  };

  const handleLifecycleClick = (action) => {
    if (!canManageLifecycle) return;
    if (action === "start") {
      runLifecycleAction("start");
      return;
    }
    if (confirmAction === action) {
      runLifecycleAction(action);
      return;
    }
    setConfirmAction(action);
  };

  const busy = Boolean(lifecycleAction);
  const statusLabel = apiUnreachable ? "Unreachable" : running === null ? "Unknown" : running ? "Running" : "Stopped";
  const statusColor = apiUnreachable ? "error" : running === null ? "default" : running ? "success" : "error";

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth={fullScreen ? false : activeTab === "logs" ? "md" : "sm"}
      fullWidth={!fullScreen}
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          background: "linear-gradient(180deg, rgba(10,18,31,0.98) 0%, rgba(15,23,42,0.98) 100%)",
          color: "white",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <TuneIcon sx={{ color: "#FF6B35" }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Component Actions
          </Typography>
          {target.componentName ? <Chip label={target.componentName} size="small" sx={{ color: "white" }} /> : null}
          <Chip label={target.tag} size="small" variant="outlined" sx={{ color: "white", fontFamily: "monospace" }} />
          <Chip label={target.ip} size="small" variant="outlined" sx={{ color: "white" }} />
          {canManageLifecycle ? (
            <Chip label={loading ? "Checking…" : statusLabel} size="small" color={loading ? "default" : statusColor} />
          ) : null}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <IconButton
            onClick={() => setFullScreen((current) => !current)}
            title={fullScreen ? "Exit full screen" : "Full screen"}
            sx={tintedIconButtonSx("#A78BFA")}
          >
            {fullScreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
          <IconButton onClick={busy ? undefined : onClose} sx={tintedIconButtonSx("#94A3B8")}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Tabs
        value={activeTab}
        onChange={(_event, value) => {
          // Tab isn't actually `disabled` (see the comment below) so it
          // still fires onChange - block the switch here instead.
          if (value === "logs" && !canViewLogs) return;
          setActiveTab(value);
        }}
        sx={{
          borderBottom: `1px solid ${theme.palette.divider}`,
          minHeight: 40,
          "& .MuiTab-root": { minHeight: 40, color: "rgba(255,255,255,0.6)" },
          "& .Mui-selected": { color: "white !important" },
        }}
      >
        <Tab value="actions" label="Actions" />
        {/* `disabled` must NOT be used here: Tabs clones onChange/selected
            onto its immediate children, and wrapping this Tab in a
            Tooltip/span for the disabled+tooltip pattern (as used
            elsewhere in this modal) would make those land on the Tooltip
            instead, breaking clicks on this tab - which is exactly the
            "can't switch back to Logs" bug this replaced. */}
        <Tab
          value="logs"
          sx={!canViewLogs ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
          label={
            canViewLogs ? (
              "Logs"
            ) : (
              <Tooltip title="You don't have permission to view logs">
                <span>Logs</span>
              </Tooltip>
            )
          }
        />
      </Tabs>

      <DialogContent
        sx={
          activeTab === "logs"
            ? { p: 3, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }
            : { p: 3 }
        }
      >
        {activeTab === "logs" ? (
          <ComponentLogViewer
            key={`${target.region}-${target.ip}-${target.tag}`}
            target={target}
            canDownload={canDownloadLogs}
          />
        ) : (
          <>
        {!canManageLifecycle ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            You have read-only access here — start/stop/restart is disabled. You can still view this
            component&apos;s logs.
          </Alert>
        ) : null}
        {apiUnreachable ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            Could not reach the watcher API on {target.ip}. Make sure it&apos;s running (./run_api.sh or ./run.sh on
            the host), then close and reopen this to retry.
          </Alert>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        {message ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            {message}
          </Alert>
        ) : null}

        <Paper
          variant="outlined"
          sx={{ p: 2, mt: 3, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}
        >
          {confirmAction ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Typography variant="body2">
                {confirmAction === "stop"
                  ? `Stop component '${target.tag}' now?`
                  : `Restart component '${target.tag}' now?`}
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button size="small" onClick={() => setConfirmAction(null)} sx={{ color: "rgba(255,255,255,0.8)" }}>
                  Cancel
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color={confirmAction === "stop" ? "error" : "warning"}
                  onClick={() => runLifecycleAction(confirmAction)}
                >
                  Confirm {LIFECYCLE_LABELS[confirmAction]}
                </Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              <Tooltip title={canManageLifecycle ? "" : "You don't have permission to start/stop/restart components"}>
                <span>
                  <Button
                    variant="outlined"
                    color="success"
                    startIcon={
                      lifecycleAction === "start" ? <CircularProgress size={14} color="inherit" /> : <PlayArrowIcon />
                    }
                    disabled={!canManageLifecycle || busy || running === true}
                    onClick={() => handleLifecycleClick("start")}
                  >
                    Start
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title={canManageLifecycle ? "" : "You don't have permission to start/stop/restart components"}>
                <span>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={lifecycleAction === "stop" ? <CircularProgress size={14} color="inherit" /> : <StopIcon />}
                    disabled={!canManageLifecycle || busy || running === false}
                    onClick={() => handleLifecycleClick("stop")}
                  >
                    Stop
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title={canManageLifecycle ? "" : "You don't have permission to start/stop/restart components"}>
                <span>
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={
                      lifecycleAction === "restart" ? (
                        <CircularProgress size={14} color="inherit" />
                      ) : (
                        <RestartAltIcon />
                      )
                    }
                    disabled={!canManageLifecycle || busy}
                    onClick={() => handleLifecycleClick("restart")}
                  >
                    Restart
                  </Button>
                </span>
              </Tooltip>
            </Box>
          )}
        </Paper>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ py: 0.75, px: 2, borderTop: `1px solid ${theme.palette.divider}`, flexShrink: 0 }}>
        <Button size="small" onClick={onClose} disabled={busy} sx={{ color: "white" }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

ComponentActionsModal.propTypes = {
  open: PropTypes.bool.isRequired,
  target: PropTypes.shape({
    region: PropTypes.string,
    ip: PropTypes.string,
    tag: PropTypes.string,
    componentName: PropTypes.string,
  }),
  canManageLifecycle: PropTypes.bool,
  canViewLogs: PropTypes.bool,
  canDownloadLogs: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
};

ComponentActionsModal.defaultProps = {
  target: null,
  canManageLifecycle: false,
  canViewLogs: false,
  canDownloadLogs: false,
};

export default ComponentActionsModal;
