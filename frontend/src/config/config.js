// Centralized runtime config sourced ONLY from window.__APP_CONFIG__ (config.json)

export const API_BASE = "/api/v1";

const cfg = (typeof window !== "undefined" && window.__APP_CONFIG__) || {};

export const getConfigVar = (key, defaultValue) => {
  const v = cfg[key];
  return v === undefined ? defaultValue : v;
};

// Backend host (hostname[:port])
const rawApiHost = getConfigVar("VITE_API_BACKEND_HOST", "127.0.0.1");
const isLocal = rawApiHost === "127.0.0.1" || rawApiHost === "localhost";
const httpProtocol = isLocal ? "http" : "https";
const wsProtocol = isLocal ? "ws" : "wss";
const resolvedApiHost = isLocal ? "127.0.0.1:8080" : rawApiHost;
const defaultEntraApiAudience = getConfigVar("VITE_ENTRA_CLIENT_ID", "")
  ? `api://${getConfigVar("VITE_ENTRA_CLIENT_ID", "")}`
  : "";

export const apiBackend = `${httpProtocol}://${resolvedApiHost}${API_BASE}`;
export const wsBackend = `${wsProtocol}://${resolvedApiHost}${API_BASE}`;

export const entra = {
  enabled: getConfigVar("VITE_ENTRA_ENABLED", "false") === "true",
  tenantId: getConfigVar("VITE_ENTRA_TENANT_ID", ""),
  clientId: getConfigVar("VITE_ENTRA_CLIENT_ID", ""),
  apiAudience: getConfigVar("VITE_ENTRA_API_AUDIENCE", "") || defaultEntraApiAudience,
  apiScopeName: getConfigVar("VITE_ENTRA_API_SCOPE_NAME", "access_as_user"),
  apiScope:
    getConfigVar("VITE_ENTRA_API_SCOPE", "") ||
    (getConfigVar("VITE_ENTRA_API_AUDIENCE", "") || defaultEntraApiAudience
      ? `${getConfigVar("VITE_ENTRA_API_AUDIENCE", "") || defaultEntraApiAudience}/${getConfigVar("VITE_ENTRA_API_SCOPE_NAME", "access_as_user")}`
      : ""),
  authority:
    getConfigVar("VITE_ENTRA_AUTHORITY", "") ||
    (getConfigVar("VITE_ENTRA_TENANT_ID", "")
      ? `https://login.microsoftonline.com/${getConfigVar("VITE_ENTRA_TENANT_ID", "")}`
      : ""),
};

// Feature flags (strings "true"/"false" in config.json)
export const flags = {
  componentDb: getConfigVar("VITE_ENABLE_COMPONENT_DB", "false") === "true",
  pipelines: getConfigVar("VITE_ENABLE_PIPELINES", "false") === "true",
  serverDetails: getConfigVar("VITE_ENABLE_SERVER_DETAILS", "false") === "true",
  componentWatcher: getConfigVar("VITE_ENABLE_COMPONENT_WATCHER", "false") === "true",
  componentMap: getConfigVar("VITE_ENABLE_COMPONENT_MAP", "false") === "true",
  ec2Schedules: getConfigVar("VITE_ENABLE_EC2_SCHEDULES", "false") === "true",
  ec2Details: getConfigVar("VITE_ENABLE_INFRASTRUCTURE_DETAILS", "false") === "true",
  route53Status: getConfigVar("VITE_ENABLE_ROUTE53_STATUS", "false") === "true",
  serverHandler: getConfigVar("VITE_ENABLE_SERVER_HANDLER", "false") === "true",
};

export const getSectionVisibility = () => ({ ...flags });
