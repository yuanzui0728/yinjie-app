import type { ProviderTestRequest, ProviderTestResult, SystemStatus } from "./system";

export const DEFAULT_CORE_API_BASE_URL = "http://127.0.0.1:39091";

export function resolveCoreApiBaseUrl(override?: string) {
  return override || DEFAULT_CORE_API_BASE_URL;
}

async function request<T>(path: string, init?: RequestInit, baseUrl?: string): Promise<T> {
  const response = await fetch(`${resolveCoreApiBaseUrl(baseUrl)}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getSystemStatus(baseUrl?: string) {
  return request<SystemStatus>("/system/status", undefined, baseUrl);
}

export function testProviderConnection(payload: ProviderTestRequest, baseUrl?: string) {
  return request<ProviderTestResult>(
    "/system/provider/test",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    baseUrl,
  );
}
