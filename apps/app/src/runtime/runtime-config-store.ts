import { useSyncExternalStore } from "react";
import { readNativeRuntimeConfig } from "./native-runtime";
import { detectAppPlatform } from "./platform";
import { normalizeAppRuntimeConfig, readInjectedRuntimeConfig, RUNTIME_CONFIG_STORAGE_KEY, type AppRuntimeConfig } from "./runtime-config";

const listeners = new Set<() => void>();
let nativeRuntimeHydrated = false;

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readPersistedRuntimeConfig() {
  const storage = getStorage();
  const rawValue = storage?.getItem(RUNTIME_CONFIG_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as Partial<AppRuntimeConfig>;
  } catch {
    return null;
  }
}

function createInitialRuntimeConfig() {
  const platform = detectAppPlatform();
  const injectedConfig = readInjectedRuntimeConfig();
  const persistedConfig = readPersistedRuntimeConfig();
  const initialConfig: Parameters<typeof normalizeAppRuntimeConfig>[0] = {
    ...persistedConfig,
    ...injectedConfig,
    apiBaseUrl: injectedConfig?.apiBaseUrl ?? persistedConfig?.apiBaseUrl ?? import.meta.env.VITE_CORE_API_BASE_URL,
    socketBaseUrl:
      injectedConfig?.socketBaseUrl ??
      persistedConfig?.socketBaseUrl ??
      import.meta.env.VITE_SOCKET_BASE_URL ??
      import.meta.env.VITE_CORE_API_BASE_URL,
    environment: injectedConfig?.environment ?? persistedConfig?.environment ?? import.meta.env.MODE,
    publicAppName: injectedConfig?.publicAppName ?? persistedConfig?.publicAppName ?? "Yinjie",
  };

  return normalizeAppRuntimeConfig(initialConfig, platform);
}

let runtimeConfig = createInitialRuntimeConfig();

function emitRuntimeConfigChange() {
  listeners.forEach((listener) => listener());
}

export function getAppRuntimeConfig() {
  return runtimeConfig;
}

export function setAppRuntimeConfig(nextConfig: Partial<AppRuntimeConfig>) {
  const previousApiBaseUrl = runtimeConfig.apiBaseUrl;
  const previousSocketBaseUrl = runtimeConfig.socketBaseUrl;
  runtimeConfig = normalizeAppRuntimeConfig(
    {
      ...runtimeConfig,
      ...nextConfig,
    },
    runtimeConfig.appPlatform,
  );

  getStorage()?.setItem(RUNTIME_CONFIG_STORAGE_KEY, JSON.stringify(runtimeConfig));
  if (previousApiBaseUrl !== runtimeConfig.apiBaseUrl || previousSocketBaseUrl !== runtimeConfig.socketBaseUrl) {
    void import("../lib/socket").then(({ disconnectChatSocket }) => {
      disconnectChatSocket();
    });
  }
  emitRuntimeConfigChange();
  return runtimeConfig;
}

export async function hydrateNativeRuntimeConfig() {
  if (nativeRuntimeHydrated) {
    return runtimeConfig;
  }

  nativeRuntimeHydrated = true;
  const nativeConfig = await readNativeRuntimeConfig();
  if (!nativeConfig) {
    return runtimeConfig;
  }

  runtimeConfig = normalizeAppRuntimeConfig(
    {
      ...nativeConfig,
      ...runtimeConfig,
      apiBaseUrl: runtimeConfig.apiBaseUrl ?? nativeConfig.apiBaseUrl,
      socketBaseUrl: runtimeConfig.socketBaseUrl ?? nativeConfig.socketBaseUrl ?? nativeConfig.apiBaseUrl,
      environment: runtimeConfig.environment ?? nativeConfig.environment,
      publicAppName: runtimeConfig.publicAppName || nativeConfig.publicAppName,
    },
    runtimeConfig.appPlatform,
  );

  emitRuntimeConfigChange();
  return runtimeConfig;
}

export function subscribeAppRuntimeConfig(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function useAppRuntimeConfig() {
  return useSyncExternalStore(subscribeAppRuntimeConfig, getAppRuntimeConfig, getAppRuntimeConfig);
}
