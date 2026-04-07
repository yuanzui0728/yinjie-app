import { z } from "zod";
import providerDefaults from "../../../config/provider-defaults.json";

const providerApiStyleSchema = z.enum(["openai-chat-completions", "openai-responses"]);

export const providerConfigSchema = z.object({
  endpoint: z.string().url(),
  model: z.string().min(1),
  apiKey: z.string().optional(),
  mode: z.enum(["cloud", "local-compatible"]).default("cloud"),
  apiStyle: providerApiStyleSchema.default("openai-chat-completions"),
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
export type ProviderApiStyle = z.infer<typeof providerApiStyleSchema>;

export const defaultRuntimeConfig = runtimeConfigSchema.parse({});

export const defaultProviderConfig: ProviderConfig = providerConfigSchema.parse(providerDefaults);

function normalizeProviderEndpoint(value: string) {
  const normalized = value.trim().replace(/\/+$/, "");
  if (normalized.endsWith("/chat/completions")) {
    return normalized.slice(0, -"/chat/completions".length);
  }
  if (normalized.endsWith("/responses")) {
    return normalized.slice(0, -"/responses".length);
  }

  return normalized;
}

export function normalizeProviderConfig(values: {
  endpoint: string;
  model: string;
  mode: string;
  apiKey?: string;
  apiStyle?: string;
}): ProviderConfig {
  return {
    endpoint: normalizeProviderEndpoint(values.endpoint),
    model: values.model,
    mode: values.mode === "cloud" ? "cloud" : "local-compatible",
    apiKey: values.apiKey ?? "",
    apiStyle: values.apiStyle === "openai-responses" ? "openai-responses" : "openai-chat-completions",
  };
}

export function buildProviderConfigPayload(values: ProviderConfig): ProviderConfig {
  return {
    endpoint: normalizeProviderEndpoint(values.endpoint),
    model: values.model.trim(),
    mode: values.mode,
    apiKey: values.apiKey?.trim() ? values.apiKey.trim() : undefined,
    apiStyle: values.apiStyle,
  };
}

export function validateProviderConfig(values: ProviderConfig) {
  return providerConfigSchema.safeParse(values);
}
