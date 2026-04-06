import type { AppPlatform } from "./platform";

export type AppRuntimeEnvironment = "development" | "staging" | "production";

export type AppRuntimeConfig = {
  apiBaseUrl?: string;
  socketBaseUrl?: string;
  environment: AppRuntimeEnvironment;
  appPlatform: AppPlatform;
  publicAppName: string;
  applicationId?: string;
  appVersionName?: string;
  appVersionCode?: number;
};

type AppRuntimeConfigInput = Partial<Omit<AppRuntimeConfig, "environment">> & {
  environment?: string | null;
};

export const RUNTIME_CONFIG_STORAGE_KEY = "yinjie-app-runtime-config";

type RuntimeConfigWindow = Window & {
  __YINJIE_RUNTIME_CONFIG__?: Partial<AppRuntimeConfig>;
};

function normalizeBaseUrl(value?: string | null) {
  const normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }

  return normalized.replace(/\/+$/, "");
}

function normalizeEnvironment(value?: string | null): AppRuntimeEnvironment {
  if (value === "production" || value === "staging") {
    return value;
  }

  return "development";
}

function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function normalizeVersionCode(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1) {
    return undefined;
  }

  return Math.trunc(value);
}

export function normalizeAppRuntimeConfig(config: AppRuntimeConfigInput, platform: AppPlatform): AppRuntimeConfig {
  return {
    apiBaseUrl: normalizeBaseUrl(config.apiBaseUrl),
    socketBaseUrl: normalizeBaseUrl(config.socketBaseUrl ?? config.apiBaseUrl),
    environment: normalizeEnvironment(config.environment),
    appPlatform: platform,
    publicAppName: config.publicAppName?.trim() || "Yinjie",
    applicationId: normalizeOptionalText(config.applicationId),
    appVersionName: normalizeOptionalText(config.appVersionName),
    appVersionCode: normalizeVersionCode(config.appVersionCode),
  };
}

export function readInjectedRuntimeConfig() {
  if (typeof window === "undefined") {
    return null;
  }

  return ((window as RuntimeConfigWindow).__YINJIE_RUNTIME_CONFIG__ ?? null) as Partial<AppRuntimeConfig> | null;
}
