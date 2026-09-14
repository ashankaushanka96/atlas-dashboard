import CodeIcon from "@mui/icons-material/Code";
import WidgetsIcon from "@mui/icons-material/Widgets";
import BuildIcon from "@mui/icons-material/Build";
import BoltIcon from "@mui/icons-material/Bolt";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

// Same visual language as HostDetails/statusConfig.js - a color+icon pairing
// per platform so the Component DB table, filter bar, and details modal all
// render the same tinted pill for a given platform.
const PLATFORM_COLORS = {
  java: "#F59E0B",
  "c++": "#60A5FA",
  cpp: "#60A5FA",
  opa: "#34D399",
  python: "#34D399",
  solr: "#34D399",
  redis: "#34D399",
  "node.js": "#A78BFA",
  nodejs: "#A78BFA",
  go: "#22D3EE",
  rust: "#94A3B8",
  "c#": "#A78BFA",
  csharp: "#A78BFA",
  php: "#94A3B8",
  dotnet: "#A78BFA",
  ruby: "#E24B4A",
  scala: "#F59E0B",
  kotlin: "#F59E0B",
  swift: "#F59E0B",
  dart: "#22D3EE",
};

export function getPlatformConfig(platform) {
  const key = String(platform || "").trim().toLowerCase();
  return { color: PLATFORM_COLORS[key] || "#94A3B8", Icon: CodeIcon };
}

// Same color+icon pairing as ComponentCountsBadge's category segments
// (Host Details table), so a category reads the same everywhere it appears.
const CATEGORY_CONFIG = {
  component: { color: "#60A5FA", Icon: WidgetsIcon },
  tool: { color: "#F59E0B", Icon: BuildIcon },
  job: { color: "#A78BFA", Icon: BoltIcon },
};

export function getCategoryConfig(category) {
  const key = String(category || "").trim().toLowerCase();
  return CATEGORY_CONFIG[key] || { color: "#94A3B8", Icon: HelpOutlineIcon };
}
