import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import StopCircleIcon from "@mui/icons-material/StopCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

// Single source of truth for the EC2 instance-status color+icon pairing, so
// the EC2 tab table and the Home dashboard's EC2 widget render the same
// tinted pill for a given status.
export function getInstanceStatusConfig(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "running") return { color: "#34D399", Icon: PlayCircleIcon };
  if (normalized === "stopped") return { color: "#E24B4A", Icon: StopCircleIcon };
  if (normalized === "terminated") return { color: "#94A3B8", Icon: CancelIcon };
  if (["pending", "stopping", "shutting-down"].includes(normalized)) {
    return { color: "#F59E0B", Icon: HourglassEmptyIcon };
  }
  return { color: "#94A3B8", Icon: HelpOutlineIcon };
}
