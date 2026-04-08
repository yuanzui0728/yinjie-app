import { isDesktopRuntimeAvailable } from "@yinjie/ui";
import type { AppRuntimeCapabilities } from "../platform";

export function isDesktopPlatform() {
  return isDesktopRuntimeAvailable();
}

export function getDesktopRuntimeCapabilities(): AppRuntimeCapabilities {
  return {
    canManageLocalCoreApi: false,
    canResolveLocalRuntimeData: false,
    canConfigureProviderLocally: false,
    canUseSecureStorage: false,
    canReceivePush: false,
    canPickImages: false,
    canConfigureRemoteService: true,
    canExportDiagnostics: true,
    canManageProvider: false,
    canScanBootstrapCode: false,
    canOpenExternalLinks: true,
  };
}
