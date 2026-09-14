import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import GppGoodIcon from "@mui/icons-material/GppGood";
import GppMaybeIcon from "@mui/icons-material/GppMaybe";
import GppBadIcon from "@mui/icons-material/GppBad";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import CloudIcon from "@mui/icons-material/Cloud";
import DnsIcon from "@mui/icons-material/Dns";
import TerminalIcon from "@mui/icons-material/Terminal";
import DesktopWindowsIcon from "@mui/icons-material/DesktopWindows";
import ComputerIcon from "@mui/icons-material/Computer";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import StopCircleIcon from "@mui/icons-material/StopCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import MemoryIcon from "@mui/icons-material/Memory";

// Single source of truth for the color+icon pairing behind every status/OS
// chip across Host Details (table, details modal, metrics modal, watcher
// actions modal), so they always read as the same visual language.
export function getWatcherStatusConfig(status) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "CONFIGURED") return { color: "#34D399", Icon: VisibilityIcon };
  if (normalized === "UNCONFIGURED") return { color: "#F59E0B", Icon: VisibilityOffIcon };
  return { color: "#94A3B8", Icon: HelpOutlineIcon };
}

export function getCompliantStatusConfig(status) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "COMPLIANT") return { color: "#34D399", Icon: GppGoodIcon };
  if (normalized === "PARTIALLY_COMPLIANT") return { color: "#F59E0B", Icon: GppMaybeIcon };
  if (normalized === "NON_COMPLIANT") return { color: "#E24B4A", Icon: GppBadIcon };
  if (normalized === "PENDING") return { color: "#94A3B8", Icon: HourglassEmptyIcon };
  return { color: "#94A3B8", Icon: HelpOutlineIcon };
}

export function getOsConfig(osValue) {
  const normalized = String(osValue || "").trim().toLowerCase();
  if (normalized.includes("amazon linux")) return { color: "#34D399", Icon: CloudIcon };
  if (normalized.includes("rocky")) return { color: "#60A5FA", Icon: DnsIcon };
  if (normalized.includes("ubuntu")) return { color: "#F87171", Icon: TerminalIcon };
  if (normalized.includes("windows")) return { color: "#22D3EE", Icon: DesktopWindowsIcon };
  if (!normalized || normalized === "unknown" || normalized === "n/a") {
    return { color: "#94A3B8", Icon: HelpOutlineIcon };
  }
  return { color: "#A78BFA", Icon: ComputerIcon };
}

// The watcher process's running/stopped lifecycle state (distinct from
// watcher-configured status above), used in the Metrics and Watcher Actions
// modal headers.
export function getWatcherRunningConfig({ apiUnreachable, running, loading }) {
  if (loading) return { label: "Checking…", color: "#94A3B8", Icon: HelpOutlineIcon };
  if (apiUnreachable) return { label: "Unreachable", color: "#E24B4A", Icon: ErrorOutlineIcon };
  if (running === null || running === undefined) return { label: "Unknown", color: "#94A3B8", Icon: HelpOutlineIcon };
  if (running) return { label: "Running", color: "#34D399", Icon: PlayCircleIcon };
  return { label: "Stopped", color: "#E24B4A", Icon: StopCircleIcon };
}

// Generic yes/no-ish component field (watcher/pipeline configured status
// inside the host details table of components).
export function getYesNoConfig(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "yes" || normalized === "configured") {
    return { color: "#34D399", Icon: CheckCircleIcon };
  }
  if (normalized === "no" || normalized === "unconfigured") {
    return { color: "#E24B4A", Icon: CancelIcon };
  }
  return { color: "#94A3B8", Icon: HelpOutlineIcon };
}

// CPU architecture chip (Host Details modal's System Details section).
export function getArchConfig(arch) {
  const normalized = String(arch || "").trim().toLowerCase();
  if (normalized.includes("arm") || normalized.includes("aarch64")) {
    return { color: "#A78BFA", Icon: MemoryIcon };
  }
  if (normalized.includes("x86") || normalized.includes("amd64")) {
    return { color: "#60A5FA", Icon: MemoryIcon };
  }
  return { color: "#94A3B8", Icon: MemoryIcon };
}
