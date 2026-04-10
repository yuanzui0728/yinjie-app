import { z } from "zod";

const providerApiStyleSchema = z.enum(["openai-chat-completions", "openai-responses"]);

export const providerConfigSchema = z.object({
  endpoint: z.string().url(),
  model: z.string().min(1),
  apiKey: z.string().optional(),
  mode: z.enum(["cloud", "local-compatible"]).default("cloud"),
  apiStyle: providerApiStyleSchema.default("openai-chat-completions"),
  transcriptionEndpoint: z.union([z.string().url(), z.literal("")]).optional(),
  transcriptionModel: z.string().optional(),
  transcriptionApiKey: z.string().optional(),
});

export const storageConfigSchema = z.object({
  databaseFileName: z.string().default("yinjie.sqlite"),
  logsDirName: z.string().default("logs"),
  backupsDirName: z.string().default("backups"),
});

export const runtimeConfigSchema = z.object({
  appMode: z.enum(["development", "desktop", "production"]).default("development"),
  coreApiPort: z.number().int().min(1024).max(65535).default(3000),
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
export const defaultProviderConfig: ProviderConfig = providerConfigSchema.parse({
  endpoint: "https://api.deepseek.com",
  model: "deepseek-chat",
  apiKey: "",
  mode: "cloud",
  apiStyle: "openai-chat-completions",
  transcriptionEndpoint: "",
  transcriptionModel: "",
  transcriptionApiKey: "",
});

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
  transcriptionEndpoint?: string;
  transcriptionModel?: string;
  transcriptionApiKey?: string;
}): ProviderConfig {
  return {
    endpoint: normalizeProviderEndpoint(values.endpoint),
    model: values.model,
    mode: values.mode === "cloud" ? "cloud" : "local-compatible",
    apiKey: values.apiKey ?? "",
    apiStyle: values.apiStyle === "openai-responses" ? "openai-responses" : "openai-chat-completions",
    transcriptionEndpoint: values.transcriptionEndpoint
      ? normalizeProviderEndpoint(values.transcriptionEndpoint)
      : "",
    transcriptionModel: values.transcriptionModel ?? "",
    transcriptionApiKey: values.transcriptionApiKey ?? "",
  };
}

export function buildProviderConfigPayload(values: ProviderConfig): ProviderConfig {
  return {
    endpoint: normalizeProviderEndpoint(values.endpoint),
    model: values.model.trim(),
    mode: values.mode,
    apiKey: values.apiKey?.trim() ? values.apiKey.trim() : undefined,
    apiStyle: values.apiStyle,
    transcriptionEndpoint: values.transcriptionEndpoint?.trim()
      ? normalizeProviderEndpoint(values.transcriptionEndpoint)
      : undefined,
    transcriptionModel: values.transcriptionModel?.trim()
      ? values.transcriptionModel.trim()
      : undefined,
    transcriptionApiKey: values.transcriptionApiKey?.trim()
      ? values.transcriptionApiKey.trim()
      : undefined,
  };
}

export function validateProviderConfig(values: ProviderConfig) {
  return providerConfigSchema.safeParse(values);
}
