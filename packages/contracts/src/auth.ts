export interface AuthSession {
  token: string;
  userId: string;
  username: string;
  onboardingCompleted: boolean;
}

export interface AuthSessionSummary {
  sessionId: string;
  tokenLabel: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface InitUserRequest {
  username: string;
}

export interface UpdateUserRequest {
  username?: string;
  avatar?: string;
  signature?: string;
}

export interface SuccessResponse {
  success: boolean;
}
