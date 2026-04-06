import { getAndroidRuntimeCapabilities, isAndroidPlatform } from "./adapters/android";
import { getDesktopRuntimeCapabilities, isDesktopPlatform } from "./adapters/desktop";
import { getIosRuntimeCapabilities, isIosPlatform } from "./adapters/ios";
import { getWebRuntimeCapabilities } from "./adapters/web";

export type AppPlatform = "web" | "desktop" | "android" | "ios";

export type AppRuntimeCapabilities = {
  canManageLocalCoreApi: boolean;
  canResolveLocalRuntimeData: boolean;
  canConfigureProviderLocally: boolean;
  canUseSecureStorage: boolean;
  canReceivePush: boolean;
  canPickImages: boolean;
};

export function detectAppPlatform(): AppPlatform {
  if (isDesktopPlatform()) {
    return "desktop";
  }

  if (isAndroidPlatform()) {
    return "android";
  }

  if (isIosPlatform()) {
    return "ios";
  }

  return "web";
}

export function getAppRuntimeCapabilities(platform = detectAppPlatform()): AppRuntimeCapabilities {
  switch (platform) {
    case "desktop":
      return getDesktopRuntimeCapabilities();
    case "android":
      return getAndroidRuntimeCapabilities();
    case "ios":
      return getIosRuntimeCapabilities();
    default:
      return getWebRuntimeCapabilities();
  }
}
