export function getPlatformColor(platform) {
  switch (String(platform || "").toLowerCase()) {
    case "java":
      return "primary";
    case "c++":
    case "cpp":
      return "secondary";
    case "python":
      return "success";
    case "node.js":
    case "nodejs":
      return "info";
    case "go":
      return "warning";
    default:
      return "default";
  }
}

export function getLatestVersion(components) {
  let latest = null;
  components.forEach((component) => {
    if (!component.release_date) return;
    const time = new Date(component.release_date).getTime();
    if (Number.isNaN(time)) return;

    if (!latest || time > latest.time) {
      latest = { time, version: component.comp_version || "" };
    }
  });
  return latest ? latest.version : null;
}

export function isLatestComponentVersion(component, latestVersion) {
  if (latestVersion === null || latestVersion === undefined) return false;

  return (component.comp_version || "") === latestVersion;
}

// Same tinted-pill color language as HostDetails/statusConfig.js - green
// for the latest release, red for anything behind it.
export function getVersionStatusColor(isLatest) {
  return isLatest ? "#34D399" : "#E24B4A";
}

export function normalizeRepoKey(value) {
  const trimmed = String(value || "").trim();
  return trimmed || "__NO_CODE_REPO__";
}

export function formatRepoTitle(codeRepoUrl) {
  const rawValue = String(codeRepoUrl || "").trim();
  if (!rawValue) return "NO CODE REPOSITORY";

  const prefix = "https://gitlab.com/<your-org>/market-backend/";
  const withoutPrefix = rawValue.startsWith(prefix) ? rawValue.slice(prefix.length) : rawValue;

  return withoutPrefix.replaceAll("-", " ").replaceAll("/", " / ").toUpperCase();
}
