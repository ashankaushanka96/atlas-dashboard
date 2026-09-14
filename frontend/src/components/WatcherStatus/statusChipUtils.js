import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import StopCircleIcon from "@mui/icons-material/StopCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import NightsStayIcon from "@mui/icons-material/NightsStay";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import SettingsEthernetIcon from "@mui/icons-material/SettingsEthernet";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";

// Same color+icon pairing convention as HostDetails/statusConfig.js, so a
// status reads the same tinted-pill way across the whole app.
export function getProcessStatusConfig(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "running") return { color: "#34D399", Icon: PlayCircleIcon };
  if (normalized === "warning") return { color: "#F59E0B", Icon: WarningAmberIcon };
  if (normalized === "stopped") return { color: "#E24B4A", Icon: StopCircleIcon };
  if (normalized === "sleeping") return { color: "#94A3B8", Icon: NightsStayIcon };
  return { color: "#94A3B8", Icon: HelpOutlineIcon };
}

export function getPortStatusConfig(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "listening") return { color: "#34D399", Icon: SettingsEthernetIcon };
  if (normalized === "warning") return { color: "#F59E0B", Icon: WarningAmberIcon };
  if (normalized === "not_listening") return { color: "#E24B4A", Icon: LinkOffIcon };
  if (normalized === "sleeping") return { color: "#94A3B8", Icon: NightsStayIcon };
  if (normalized === "not_available") return { color: "#94A3B8", Icon: RemoveCircleOutlineIcon };
  return { color: "#94A3B8", Icon: HelpOutlineIcon };
}

export function getProcessStatusColor(status) {
  switch (String(status || "").toLowerCase()) {
    case "running":
      return "success";
    case "warning":
      return "warning";
    case "stopped":
      return "error";
    case "sleeping":
      return "default";
    default:
      return "default";
  }
}

export function getPortStatusColor(status) {
  switch (String(status || "").toLowerCase()) {
    case "listening":
      return "success";
    case "warning":
      return "warning";
    case "not_listening":
      return "error";
    case "sleeping":
      return "default";
    default:
      return "default";
  }
}

export function formatStatusLabel(status) {
  const normalizedStatus = String(status || "").trim();

  if (!normalizedStatus) {
    return "N/A";
  }

  return normalizedStatus
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
