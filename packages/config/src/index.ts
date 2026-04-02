import { z } from "zod";

export const providerConfigSchema = z.object({
  endpoint: z.string().url(),
  model: z.string().min(1),
  apiKey: z.string().optional(),
  mode: z.enum(["cloud", "local-compatible"]).default("cloud"),
});

export const storageConfigSchema = z.object({
  databaseFileName: z.string().default("yinjie.sqlite"),
  logsDirName: z.string().default("logs"),
  backupsDirName: z.string().default("backups"),
});

export const runtimeConfigSchema = z.object({
  appMode: z.enum(["development", "desktop", "production"]).default("development"),
  coreApiPort: z.number().int().min(1024).max(65535).default(39091),
  adminPath: z.string().default("/admin"),
});

export const appConfigSchema = z.object({
  provider: providerConfigSchema,
  storage: storageConfigSchema.default(storageConfigSchema.parse({})),
  runtime: runtimeConfigSchema.default(runtimeConfigSchema.parse({})),
});

export type ProviderConfig = z.infer<typeof providerConfigSchema>;
export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;
export type StorageConfig = z.infer<typeof storageConfigSchema>;
export type AppConfig = z.infer<typeof appConfigSchema>;

export const defaultRuntimeConfig = runtimeConfigSchema.parse({});
