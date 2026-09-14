import React from "react";
import { Button } from "@mui/material";
import BugReportRoundedIcon from "@mui/icons-material/BugReportRounded";
import hexToRgb from "../shared/hexToRgb";
import { useNotifications } from "./NotificationProvider";

const ACCENT = "#F59E0B";

// Dev-only: import.meta.env.DEV is statically replaced at build time, so
// this component renders nothing (and is dead-code-eliminated) in prod.
export default function TestNotificationButton() {
  const { sendTestNotification, enabled } = useNotifications();

  if (!import.meta.env.DEV) return null;

  return (
    <Button
      size="small"
      onClick={sendTestNotification}
      startIcon={<BugReportRoundedIcon sx={{ fontSize: 16 }} />}
      title={enabled ? "Send a test notification" : "Enable notifications first"}
      sx={{
        textTransform: "none",
        fontWeight: 700,
        color: ACCENT,
        bgcolor: `rgba(${hexToRgb(ACCENT)}, 0.12)`,
        borderRadius: 999,
        px: 1.5,
        "&:hover": { bgcolor: `rgba(${hexToRgb(ACCENT)}, 0.22)` },
      }}
    >
      Test notification
    </Button>
  );
}
