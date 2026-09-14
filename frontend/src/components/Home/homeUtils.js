import { writeAdvancedSearchParams } from "../shared/advancedSearchUtils";

export const CHART_COLORS = [
  "#60A5FA",
  "#34D399",
  "#F59E0B",
  "#F87171",
  "#A78BFA",
  "#22D3EE",
  "#F472B6",
  "#FACC15",
];

export function titleCase(value) {
  const text = String(value || "")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  if (!text) return "Unknown";
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function buildCounts(items, getKey, options = {}) {
  const {
    formatLabel = (value) => titleCase(value),
    getColor,
    getIcon,
  } = options;
  const counts = new Map();
  items.forEach((item) => {
    const rawKey = getKey(item);
    const key =
      rawKey === undefined || rawKey === null || rawKey === ""
        ? "Unknown"
        : String(rawKey);
    const displayLabel = formatLabel(key);
    const existing = counts.get(displayLabel);
    if (existing) {
      existing.value += 1;
    } else {
      counts.set(displayLabel, {
        label: displayLabel,
        rawValue: key,
        value: 1,
      });
    }
  });

  return Array.from(counts.values())
    .map((entry, index) => ({
      ...entry,
      color: getColor?.(entry.rawValue, entry.label) || CHART_COLORS[index % CHART_COLORS.length],
      Icon: getIcon?.(entry.rawValue, entry.label) || null,
    }))
    .sort((a, b) => b.value - a.value);
}

export function normalizeToggle(
  value,
  trueLabel = "Enabled",
  falseLabel = "Disabled"
) {
  if (typeof value === "boolean") {
    return value ? trueLabel : falseLabel;
  }

  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized || normalized === "n/a" || normalized === "unknown") {
    return "Unknown";
  }
  if (
    ["yes", "true", "enabled", "enable", "on", "running", "open"].includes(
      normalized
    )
  ) {
    return trueLabel;
  }
  if (
    ["no", "false", "disabled", "disable", "off", "stopped", "closed"].includes(
      normalized
    )
  ) {
    return falseLabel;
  }

  return titleCase(normalized);
}

export function formatError(error, fallback) {
  return error?.response?.data?.error_message || error?.message || fallback;
}

// Watcher coverage only applies to category=component - job-category
// components aren't watcher-monitored, so they're excluded (unlike
// Pipeline/Platform widgets, which include jobs and only exclude tools).
export function isComponentCategory(item) {
  return String(item?.category || "").trim().toLowerCase() === "component";
}

// Carries the "category=component" filter through to the Component DB
// advanced search when drilling through from the Watcher widget, which
// already restricts to that category, so the destination table stays
// consistent.
export function appendComponentCategoryParams(params) {
  writeAdvancedSearchParams(params, {
    rules: [{ field: "category", operator: "equals", value: "component" }],
  });
  return params;
}

export function isToolCategory(item) {
  return String(item?.category || "").trim().toLowerCase() === "tool";
}

// Carries the "exclude tool-category components" filter through to the
// Component DB advanced search when drilling through from a summary widget
// that already excludes them, so the destination table stays consistent.
export function appendExcludeToolCategoryParams(params) {
  writeAdvancedSearchParams(params, {
    rules: [{ field: "category", operator: "not_equals", value: "tool" }],
  });
  return params;
}

// asset_custodian is a flat field on every summary item the Home widgets
// fetch (EC2 instances, hosts, and components - components inherit theirs
// from the host they run on, joined server-side by ip/region). An empty
// selection means "All Asset Custodians" - no filtering.
export function assetCustodianMatches(item, selectedAssetCustodians) {
  if (!selectedAssetCustodians || selectedAssetCustodians.length === 0) return true;
  return selectedAssetCustodians.includes(item?.asset_custodian);
}

// Repeated ?assetCustodian=a&assetCustodian=b params (read via
// searchParams.getAll("assetCustodian") on the destination page), so a
// multi-select carries through a drill-through link the same way a single
// region value does.
export function appendAssetCustodianParams(params, selectedAssetCustodians) {
  (selectedAssetCustodians || []).forEach((value) => {
    if (value) params.append("assetCustodian", value);
  });
  return params;
}

export function regionMatches(item, selectedRegion) {
  if (!selectedRegion) return true;
  const normalizedSelected = String(selectedRegion).trim().toLowerCase();

  const directCandidates = [
    item?.region,
    item?.aws_region,
    item?.region_name,
    item?.Region,
  ];

  for (const candidate of directCandidates) {
    if (String(candidate || "").trim().toLowerCase() === normalizedSelected) {
      return true;
    }
  }

  const zoneCandidates = [
    item?.availability_zone,
    item?.availabilityZone,
    item?.AvailabilityZone,
  ];

  for (const zone of zoneCandidates) {
    const normalizedZone = String(zone || "").trim().toLowerCase();
    if (
      normalizedZone &&
      normalizedZone.length > 1 &&
      normalizedZone.slice(0, -1) === normalizedSelected
    ) {
      return true;
    }
  }

  return false;
}
