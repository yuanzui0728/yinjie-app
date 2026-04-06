import { detectAppPlatform, getAppRuntimeCapabilities, type AppPlatform as RuntimePlatform } from "../runtime/platform";

export type AppPlatform = RuntimePlatform | "ios";
export type AppRuntimeMode = "self-hosted" | "remote";

export type PlatformCapabilities = {
  platform: AppPlatform;
  runtimeMode: AppRuntimeMode;
  hasDesktopRuntimeControl: boolean;
  hasNativeShell: boolean;
  hasSafeAreaInsets: boolean;
  storageMode: "web-storage" | "secure-storage";
  requiresEnvironmentSetup: boolean;
};

function normalizePlatform(value: string | undefined): AppPlatform | null {
  if (value === "desktop" || value === "web" || value === "android" || value === "ios") {
    return value;
  }

  return null;
}

function detectBrowserPlatform(): AppPlatform {
  if (typeof navigator === "undefined") {
    return "web";
  }

  const userAgent = navigator.userAgent.toLowerCase();
  if (/(iphone|ipad|ipod)/.test(userAgent)) {
    return "ios";
  }
  if (/android/.test(userAgent)) {
    return "android";
  }

  return "web";
}

export function getPlatformCapabilities(): PlatformCapabilities {
  const envPlatform = normalizePlatform(import.meta.env.VITE_APP_PLATFORM);
  const detectedPlatform = detectAppPlatform();
  const platform = envPlatform ?? (detectedPlatform === "web" ? detectBrowserPlatform() : detectedPlatform);
  const runtimeCapabilities = getAppRuntimeCapabilities(platform === "ios" ? "web" : platform);
  const runtimeMode: AppRuntimeMode = runtimeCapabilities.canManageLocalCoreApi ? "self-hosted" : "remote";

  return {
    platform,
    runtimeMode,
    hasDesktopRuntimeControl: runtimeCapabilities.canManageLocalCoreApi,
    hasNativeShell: platform === "desktop" || platform === "ios" || platform === "android",
    hasSafeAreaInsets: platform === "ios" || platform === "android",
    storageMode: platform === "ios" || runtimeCapabilities.canUseSecureStorage ? "secure-storage" : "web-storage",
    requiresEnvironmentSetup: runtimeCapabilities.canManageLocalCoreApi,
  };
}
