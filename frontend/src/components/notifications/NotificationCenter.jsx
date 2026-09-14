import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  alpha,
  Box,
  IconButton,
  Paper,
  Typography,
  useTheme,
} from "@mui/material";
import { keyframes } from "@mui/system";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import SettingsEthernetRoundedIcon from "@mui/icons-material/SettingsEthernetRounded";
import MemoryRoundedIcon from "@mui/icons-material/MemoryRounded";
import StatusChip from "../HostDetails/StatusChip";
import {
  formatStatusLabel,
  getPortStatusConfig,
  getProcessStatusConfig,
} from "../WatcherStatus/statusChipUtils";
import { toneStyles } from "./toneStyles";
import MetaPill from "./MetaPill";

const KIND_META = {
  port: { label: "Port", color: "#60A5FA", Icon: SettingsEthernetRoundedIcon },
  process: { label: "Process", color: "#A78BFA", Icon: MemoryRoundedIcon },
};

const getKindMeta = (kind) => KIND_META[kind] || { label: "Watcher", color: "#94A3B8", Icon: NotificationsActiveRoundedIcon };

const getStatusConfig = (kind, status) =>
  kind === "port" ? getPortStatusConfig(status) : getProcessStatusConfig(status);

export default function NotificationCenter({
  enabled,
  toasts,
  onClose,
  onClick,
  durationMs = 10000,
}) {
  return (
    <Box
      sx={{
        position: "fixed",
        top: 16,
        right: 16,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 1.25,
        zIndex: 9999,
        pointerEvents: "none",
      }}
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast, index) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onCloseToast={onClose}
          onClickToast={onClick}
          style={{
            transform: `translateY(${index * 4}px)`,
          }}
          enabled={enabled}
          durationMs={durationMs}
        />
      ))}
    </Box>
  );
}

NotificationCenter.propTypes = {
  enabled: PropTypes.bool.isRequired,
  toasts: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onClick: PropTypes.func,
  durationMs: PropTypes.number,
};

const shrinkKeyframes = keyframes`
  from { width: 100%; }
  to { width: 0%; }
`;

function ToastItem({ toast, onCloseToast, onClickToast, style, enabled, durationMs }) {
  const theme = useTheme();
  const AUTO = Math.max(1000, durationMs);

  const [hovered, setHovered] = useState(false);

  const onClose = useCallback(() => onCloseToast(toast.id), [onCloseToast, toast.id]);
  const onClick = useCallback(() => onClickToast?.(toast), [onClickToast, toast]);

  // Remaining time is tracked in a ref (not React state) so hover/leave can
  // pause and resume the dismiss timer without driving a per-frame re-render;
  // the visual bar itself is a CSS animation, paused/resumed the same way,
  // so it always keeps shrinking on the compositor thread regardless of
  // React's render timing.
  const remainingRef = useRef(AUTO);
  const startRef = useRef(Date.now());
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;

    remainingRef.current = AUTO;
    startRef.current = Date.now();
    timeoutRef.current = setTimeout(onClose, AUTO);

    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id, AUTO, enabled]);

  const onEnter = () => {
    if (hovered) return;
    setHovered(true);
    clearTimeout(timeoutRef.current);
    remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startRef.current));
  };

  const onLeave = () => {
    if (!hovered) return;
    setHovered(false);
    startRef.current = Date.now();
    timeoutRef.current = setTimeout(onClose, remainingRef.current);
  };

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const tone = toneStyles[toast.tone] || toneStyles.default;
  const kindMeta = getKindMeta(toast.kind);
  const fromConfig = getStatusConfig(toast.kind, toast.from);
  const toConfig = getStatusConfig(toast.kind, toast.to);
  const isLight = theme.palette.mode === "light";
  const borderColor = alpha(tone.accent, isLight ? 0.35 : 0.7);
  const backgroundColor = isLight ? alpha(theme.palette.background.paper, 0.98) : "#111827";
  const backgroundImage = isLight
    ? `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.98)}, ${alpha(
        theme.palette.grey[50],
        0.97
      )})`
    : "linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(17, 24, 39, 0.97))";
  const closeButtonBg = isLight
    ? alpha(theme.palette.common.black, 0.04)
    : "rgba(255, 255, 255, 0.06)";
  const closeButtonHoverBg = isLight
    ? alpha(theme.palette.common.black, 0.08)
    : "rgba(255, 255, 255, 0.12)";
  const progressTrackBg = isLight
    ? alpha(theme.palette.common.black, 0.08)
    : "rgba(255, 255, 255, 0.08)";
  const shadowColor = isLight ? "rgba(15,23,42,.14)" : "rgba(0,0,0,.24)";

  return (
    <Paper
      elevation={0}
      role="status"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={(event) => {
        if (event.target.closest("[data-dismiss='true']")) return;
        onClick?.();
      }}
      sx={{
        pointerEvents: "auto",
        minWidth: 360,
        maxWidth: 480,
        px: 1.75,
        py: 1.5,
        borderRadius: 3,
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
        userSelect: "none",
        border: "1px solid",
        borderColor,
        color: "text.primary",
        bgcolor: backgroundColor,
        backgroundColor,
        backgroundImage,
        boxShadow: `0 18px 45px ${tone.glow}, 0 10px 24px ${shadowColor}`,
        backdropFilter: "blur(14px)",
        backgroundClip: "padding-box",
        transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
        "&:hover": {
          transform: "translateY(2px)",
          boxShadow: `0 22px 54px ${tone.glow}, 0 14px 28px ${isLight ? "rgba(15,23,42,.18)" : "rgba(0,0,0,.28)"}`,
        },
        ...style,
      }}
      title="Click to open and focus the component"
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: isLight
            ? `radial-gradient(circle at top right, ${alpha(tone.accent, 0.18)}, transparent 52%)`
            : `radial-gradient(circle at top right, ${alpha(tone.accent, 0.14)}, transparent 48%)`,
        }}
      />

      <Box sx={{ position: "relative", display: "flex", alignItems: "flex-start", gap: 1.25 }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: "12px",
            display: "grid",
            placeItems: "center",
            color: alpha("#ffffff", 0.96),
            background: `linear-gradient(135deg, ${tone.accent}, ${alpha(tone.accent, 0.68)})`,
            boxShadow: `0 10px 22px ${alpha(tone.accent, 0.28)}`,
            flexShrink: 0,
          }}
        >
          <NotificationsActiveRoundedIcon sx={{ fontSize: 18 }} />
        </Box>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          {/* Lead with what/who this is about, then the chips explain the
              actual change - reads as "<component>: <kind> went from A to B"
              instead of forcing the reader to infer it purely from chips. */}
          {toast.name || (!(toast.from && toast.to) && toast.title) ? (
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 800, letterSpacing: 0.1, pr: 4 }}
            >
              {toast.name || toast.title}
            </Typography>
          ) : null}

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              pr: 4,
              flexWrap: "wrap",
              mt: toast.name ? 0.6 : 0,
            }}
          >
            <StatusChip
              label={kindMeta.label}
              color={kindMeta.color}
              Icon={kindMeta.Icon}
              sx={{ height: 24 }}
            />
            {toast.from ? (
              <StatusChip
                label={formatStatusLabel(toast.from)}
                color={fromConfig.color}
                Icon={fromConfig.Icon}
                sx={{ height: 24 }}
              />
            ) : null}
            {toast.from && toast.to ? (
              <ArrowForwardRoundedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            ) : null}
            {toast.to ? (
              <StatusChip
                label={formatStatusLabel(toast.to)}
                color={toConfig.color}
                Icon={toConfig.Icon}
                sx={{ height: 24 }}
              />
            ) : null}
          </Box>

          {toast.region || toast.ip ? (
            <Box sx={{ mt: 0.75 }}>
              <MetaPill region={toast.region} ip={toast.ip} />
            </Box>
          ) : toast.body ? (
            <Typography
              variant="body2"
              sx={{
                mt: 0.75,
                color: "text.secondary",
                lineHeight: 1.45,
                wordBreak: "break-word",
              }}
            >
              {toast.body}
            </Typography>
          ) : null}
        </Box>

        <IconButton
          data-dismiss="true"
          size="small"
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            color: "text.secondary",
            backgroundColor: closeButtonBg,
            "&:hover": {
              backgroundColor: closeButtonHoverBg,
              color: "text.primary",
            },
          }}
          title="Dismiss notification"
        >
          <CloseRoundedIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      <Box
        sx={{
          mt: 1.4,
          height: 4,
          borderRadius: 999,
          overflow: "hidden",
          backgroundColor: progressTrackBg,
        }}
      >
        <Box
          sx={{
            height: "100%",
            width: "100%",
            background: `linear-gradient(90deg, ${tone.accent}, ${alpha(tone.accent, 0.68)})`,
            borderRadius: 999,
            transformOrigin: "left",
            animation: enabled ? `${shrinkKeyframes} ${AUTO}ms linear forwards` : "none",
            animationPlayState: hovered ? "paused" : "running",
          }}
        />
      </Box>
    </Paper>
  );
}

ToastItem.propTypes = {
  toast: PropTypes.object.isRequired,
  onCloseToast: PropTypes.func.isRequired,
  onClickToast: PropTypes.func,
  style: PropTypes.object,
  enabled: PropTypes.bool,
  durationMs: PropTypes.number,
};
