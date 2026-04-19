type SearchNavigationTargetInput = {
  to: string;
  search?: string;
  hash?: string;
};

type SearchNavigationTarget = {
  to: string;
  search?: string;
  hash?: string;
};

const SEARCH_NAVIGATION_BASE_URL = "https://yinjie.local";

export function resolveSearchNavigationTarget(
  input: SearchNavigationTargetInput,
): SearchNavigationTarget {
  const normalizedTo = input.to.trim() || "/";
  const embeddedTarget = parseEmbeddedNavigationTarget(normalizedTo);

  return {
    to: embeddedTarget?.to ?? normalizedTo,
    search:
      normalizeSearchString(input.search) ??
      normalizeSearchString(embeddedTarget?.search),
    hash:
      normalizeHashString(input.hash) ??
      normalizeHashString(embeddedTarget?.hash),
  };
}

function parseEmbeddedNavigationTarget(path: string) {
  try {
    const url = new URL(path, SEARCH_NAVIGATION_BASE_URL);
    if (url.origin !== SEARCH_NAVIGATION_BASE_URL) {
      return null;
    }

    return {
      to: url.pathname || "/",
      search: url.search || undefined,
      hash: url.hash || undefined,
    };
  } catch {
    return null;
  }
}

function normalizeSearchString(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized || normalized === "?") {
    return undefined;
  }

  return normalized.startsWith("?") ? normalized : `?${normalized}`;
}

function normalizeHashString(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized || normalized === "#") {
    return undefined;
  }

  return normalized.startsWith("#") ? normalized.slice(1) || undefined : normalized;
}
