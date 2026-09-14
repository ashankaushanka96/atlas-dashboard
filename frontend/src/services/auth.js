import axios from "axios";
import { PublicClientApplication } from "@azure/msal-browser";

import { apiBackend, entra, demoMode } from "../config/config.js";
import demoAdapter from "../mocks/demoAdapter.js";
import { DEMO_USER } from "../mocks/demoFixtures.js";

const API = axios.create({ baseURL: apiBackend });
if (demoMode) {
  API.defaults.adapter = demoAdapter;
}

let accessToken = null;
let permissions = {};
let msalInstance = null;
let refreshTimer = null;
const oidcScopes = ["openid", "profile", "email"];
const TOKEN_REFRESH_LEAD_MS = 5 * 60 * 1000;

const loginRequest = {
  scopes: entra.apiScope ? [...oidcScopes, entra.apiScope] : oidcScopes,
  prompt: "select_account",
};

const exchangeEntraAccessToken = async (entraAccessToken) => {
  const {
    data: { access_token },
  } = await API.post("/auth/entra/access/token", {
    access_token: entraAccessToken,
  });

  return access_token;
};

const clearRefreshTimer = () => {
  if (refreshTimer) {
    window.clearTimeout(refreshTimer);
    refreshTimer = null;
  }
};

const decodeJwtPayload = (token) => {
  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
};

const scheduleTokenRefresh = (token) => {
  clearRefreshTimer();

  const payload = decodeJwtPayload(token);
  const expiryMs = (payload?.exp || 0) * 1000;
  if (!expiryMs) {
    return;
  }

  const delayMs = Math.max(expiryMs - Date.now() - TOKEN_REFRESH_LEAD_MS, 0);
  refreshTimer = window.setTimeout(async () => {
    try {
      if (entra.enabled) {
        await authService.initialize();
      } else {
        await refreshLocalAccessToken();
      }
    } catch {
      clearAuthenticatedState();
    }
  }, delayMs);
};

const ensureMsal = async () => {
  if (!entra.enabled) {
    throw new Error("Microsoft Entra authentication is not enabled.");
  }

  if (!entra.clientId || !entra.authority) {
    throw new Error("Microsoft Entra configuration is incomplete.");
  }

  if (!entra.apiScope || !entra.apiAudience) {
    throw new Error("Microsoft Entra API scope is not configured.");
  }

  if (!msalInstance) {
    msalInstance = new PublicClientApplication({
      auth: {
        clientId: entra.clientId,
        authority: entra.authority,
        redirectUri: window.location.origin,
        postLogoutRedirectUri: `${window.location.origin}/signin`,
      },
      cache: {
        cacheLocation: "localStorage",
        storeAuthStateInCookie: false,
      },
    });
    await msalInstance.initialize();
  }

  return msalInstance;
};

const setAuthenticatedState = async (token) => {
  accessToken = token || null;
  if (!accessToken) {
    throw new Error("Authentication did not return an application access token.");
  }

  scheduleTokenRefresh(accessToken);

  const { data } = await API.get("/auth/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  permissions = data?.role?.permissions || {};
  return { permissions, user: data };
};

const clearAuthenticatedState = () => {
  clearRefreshTimer();
  accessToken = null;
  permissions = {};
};

const acquireApiAccessToken = async (client, account) => {
  const result = await client.acquireTokenSilent({
    scopes: [entra.apiScope],
    account,
  });
  return result?.accessToken || null;
};

const exchangeEntraSession = async (client, account) => {
  const entraAccessToken = await acquireApiAccessToken(client, account);
  const appAccessToken = await exchangeEntraAccessToken(entraAccessToken);
  return setAuthenticatedState(appAccessToken);
};

const refreshLocalAccessToken = async () => {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) {
    throw new Error("No refresh token available.");
  }

  const {
    data: { access_token },
  } = await API.post("/auth/access/token", {
    refresh_token: refreshToken,
  });
  return setAuthenticatedState(access_token);
};

API.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

API.interceptors.response.use(
  (resp) => resp,
  async (err) => {
    const originalRequest = err.config;
    if (err.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      try {
        if (entra.enabled) {
          await authService.initialize();
        } else {
          await refreshLocalAccessToken();
        }
        if (accessToken) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return API(originalRequest);
        }
      } catch {
        clearAuthenticatedState();
      }
    }
    return Promise.reject(err);
  },
);

const authService = {
  login: async ({ username, password } = {}) => {
    if (!entra.enabled) {
      const {
        data: { refresh_token },
      } = await API.post("/auth/refresh/token", { username, password });
      localStorage.setItem("refreshToken", refresh_token);
      return refreshLocalAccessToken();
    }

    const client = await ensureMsal();
    await client.loginRedirect(loginRequest);
    return { redirecting: true };
  },

  register: async ({ username, password, autoLogin = true } = {}) => {
    if (entra.enabled) {
      throw new Error("Microsoft Entra authentication is enabled.");
    }

    await API.post("/auth/register", { username, password });

    if (!autoLogin) {
      return { registered: true };
    }

    return authService.login({ username, password });
  },

  logout: async () => {
    clearAuthenticatedState();

    if (!entra.enabled) {
      localStorage.removeItem("refreshToken");
      window.location.replace(`${import.meta.env.BASE_URL}signin`);
      return;
    }

    const client = await ensureMsal();
    const account = client.getActiveAccount() || client.getAllAccounts()[0] || undefined;
    await client.clearCache(account ? { account } : undefined);
    client.setActiveAccount(null);
    window.location.replace(`${import.meta.env.BASE_URL}signin`);
  },

  getPermissions: () => permissions,
  getAccessToken: () => accessToken,
  isAuthenticated: () => Boolean(accessToken),

  initialize: async () => {
    if (demoMode) {
      accessToken = "demo-mode-token";
      permissions = DEMO_USER.role.permissions;
      return true;
    }

    if (!entra.enabled) {
      try {
        await refreshLocalAccessToken();
        return true;
      } catch {
        localStorage.removeItem("refreshToken");
        clearAuthenticatedState();
        return false;
      }
    }

    const client = await ensureMsal();
    const redirectResult = await client.handleRedirectPromise();
    if (redirectResult?.account) {
      client.setActiveAccount(redirectResult.account);
      await exchangeEntraSession(client, redirectResult.account);
      return true;
    }

    const account = client.getActiveAccount() || client.getAllAccounts()[0];
    if (!account) {
      clearAuthenticatedState();
      return false;
    }

    client.setActiveAccount(account);
    try {
      await exchangeEntraSession(client, account);
      return true;
    } catch {
      clearAuthenticatedState();
      return false;
    }
  },
};

export default authService;
export { API };
