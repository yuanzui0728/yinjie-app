type CapacitorWindow = Window & {
  Capacitor?: {
    getPlatform?: () => string;
    isNativePlatform?: () => boolean;
  };
};

type RuntimeConfigWindow = Window & {
  __YINJIE_RUNTIME_CONFIG__?: {
    apiBaseUrl?: string;
    socketBaseUrl?: string;
    environment?: string;
    publicAppName?: string;
  };
};

export function isNativeShell() {
  const capacitorWindow = window as CapacitorWindow;
  return Boolean(capacitorWindow.Capacitor?.isNativePlatform?.());
}

export function getNativeShellPlatform() {
  const capacitorWindow = window as CapacitorWindow;
  return capacitorWindow.Capacitor?.getPlatform?.() ?? null;
}

export function applyNativeRuntimeConfig(input: {
  apiBaseUrl?: string;
  socketBaseUrl?: string;
  environment?: string;
  publicAppName?: string;
}) {
  if (typeof window === "undefined") {
    return;
  }

  const runtimeWindow = window as RuntimeConfigWindow;
  runtimeWindow.__YINJIE_RUNTIME_CONFIG__ = {
    ...runtimeWindow.__YINJIE_RUNTIME_CONFIG__,
    ...input,
  };
}
