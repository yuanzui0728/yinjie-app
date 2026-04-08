export interface WorldContext {
  id: string;
  localTime: string;
  weather?: string;
  location?: string;
  season?: string;
  holiday?: string;
  recentEvents?: string[];
  timestamp: string;
}

export interface WorldOwner {
  id: string;
  username: string;
  onboardingCompleted: boolean;
  avatar?: string;
  signature?: string;
  hasCustomApiKey: boolean;
  customApiBase?: string | null;
  createdAt: string;
}

export interface UpdateWorldOwnerRequest {
  username?: string;
  avatar?: string;
  signature?: string;
  onboardingCompleted?: boolean;
}

export interface UpdateWorldOwnerApiKeyRequest {
  apiKey: string;
  apiBase?: string;
}
