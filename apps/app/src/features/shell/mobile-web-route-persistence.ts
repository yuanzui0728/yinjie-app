const MOBILE_WEB_LAST_ROUTE_STORAGE_KEY = "yinjie-mobile-web-last-route";
const MAX_ROUTE_AGE_MS = 1000 * 60 * 60 * 24 * 7;
const EXCLUDED_PATHNAMES = new Set(["/", "/welcome", "/setup", "/onboarding"]);

type PersistedMobileWebRoute = {
  path: string;
  updatedAt: number;
};

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

function resolvePathname(path: string) {
  const [pathname] = path.split(/[?#]/, 1);
  return pathname || "/";
}

function isPersistablePath(path: string) {
  if (!path.startsWith("/")) {
    return false;
  }

  return !EXCLUDED_PATHNAMES.has(resolvePathname(path));
}

export function persistMobileWebRoute(path: string) {
  if (!isPersistablePath(path)) {
    return;
  }

  const storage = getStorage();
  if (!storage) {
    return;
  }

  const payload: PersistedMobileWebRoute = {
    path,
    updatedAt: Date.now(),
  };
  storage.setItem(MOBILE_WEB_LAST_ROUTE_STORAGE_KEY, JSON.stringify(payload));
}

export function readPersistedMobileWebRoute() {
  const storage = getStorage();
  const rawValue = storage?.getItem(MOBILE_WEB_LAST_ROUTE_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const payload = JSON.parse(rawValue) as Partial<PersistedMobileWebRoute>;
    if (
      typeof payload.path !== "string" ||
      typeof payload.updatedAt !== "number" ||
      !isPersistablePath(payload.path)
    ) {
      storage?.removeItem(MOBILE_WEB_LAST_ROUTE_STORAGE_KEY);
      return null;
    }

    if (Date.now() - payload.updatedAt > MAX_ROUTE_AGE_MS) {
      storage?.removeItem(MOBILE_WEB_LAST_ROUTE_STORAGE_KEY);
      return null;
    }

    return payload.path;
  } catch {
    storage?.removeItem(MOBILE_WEB_LAST_ROUTE_STORAGE_KEY);
    return null;
  }
}
