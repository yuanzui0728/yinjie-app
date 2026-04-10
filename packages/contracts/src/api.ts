export const LEGACY_API_PREFIX = "/api";

export const LEGACY_HTTP_SURFACE = [
  "/api/characters/*",
  "/api/conversations/*",
  "/api/groups/*",
  "/api/moments/*",
  "/api/feed/*",
  "/api/official-accounts/*",
  "/api/social/*",
  "/api/config/*",
  "/api/world/*",
] as const;

export const LEGACY_MIGRATED_MODULES = ["config", "characters", "world", "social", "chat", "moments", "feed", "official-accounts"] as const;

export type LegacyMigratedModule = (typeof LEGACY_MIGRATED_MODULES)[number];
