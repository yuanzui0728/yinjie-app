import {
  DEFAULT_CORE_API_BASE_URL,
  resolveCoreApiBaseUrl,
  setCoreApiBaseUrlProvider,
} from "@yinjie/contracts";
import { getAppRuntimeConfig } from "../runtime/runtime-config-store";

function trimEnvValue(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function fallbackBrowserBaseUrl() {
  if (typeof window === "undefined") {
    return null;
  }

  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    return window.location.origin;
  }

  return null;
}

export function resolveAppCoreApiBaseUrl() {
  const runtimeConfig = getAppRuntimeConfig();
  if (runtimeConfig.apiBaseUrl) {
    return runtimeConfig.apiBaseUrl;
  }

  if (runtimeConfig.appPlatform === "desktop") {
    return DEFAULT_CORE_API_BASE_URL;
  }

  return fallbackBrowserBaseUrl() ?? DEFAULT_CORE_API_BASE_URL;
}

export function resolveAppSocketBaseUrl() {
  const runtimeConfig = getAppRuntimeConfig();
  return runtimeConfig.socketBaseUrl ?? trimEnvValue(import.meta.env.VITE_SOCKET_BASE_URL) ?? resolveAppCoreApiBaseUrl();
}

export function configureContractsRuntime() {
  setCoreApiBaseUrlProvider(() => resolveAppCoreApiBaseUrl());
}

export function resolveConfiguredCoreApiBaseUrl() {
  return resolveCoreApiBaseUrl();
}

export function requiresRemoteServiceConfiguration() {
  const runtimeConfig = getAppRuntimeConfig();
  return !runtimeConfig.apiBaseUrl && !fallbackBrowserBaseUrl();
}
