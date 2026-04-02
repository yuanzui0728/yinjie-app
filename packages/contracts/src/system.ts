export interface ServiceHealth {
  name: string;
  healthy: boolean;
  version: string;
  message?: string;
}

export interface DatabaseStatus {
  path: string;
  walEnabled: boolean;
  connected: boolean;
}

export interface InferenceStatus {
  healthy: boolean;
  activeProvider?: string;
  queueDepth: number;
  maxConcurrency: number;
}

export interface SystemStatus {
  coreApi: ServiceHealth;
  desktopShell: ServiceHealth;
  database: DatabaseStatus;
  inferenceGateway: InferenceStatus;
  appMode: "development" | "desktop" | "production";
}

export interface ProviderTestRequest {
  endpoint: string;
  model: string;
  apiKey?: string;
}

export interface ProviderTestResult {
  success: boolean;
  message: string;
  normalizedEndpoint?: string;
}
