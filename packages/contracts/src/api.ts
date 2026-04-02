export const LEGACY_API_PREFIX = "/api";

export const LEGACY_HTTP_SURFACE = [
  "/api/auth/*",
  "/api/characters/*",
  "/api/conversations/*",
  "/api/groups/*",
  "/api/moments/*",
  "/api/feed/*",
  "/api/social/*",
  "/api/config/*",
  "/api/world/*",
] as const;
