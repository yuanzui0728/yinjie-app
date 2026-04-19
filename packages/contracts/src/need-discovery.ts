export type NeedDiscoveryCadenceType = "short_interval" | "daily";
export type NeedDiscoveryRunStatus = "success" | "skipped" | "failed";
export type NeedDiscoveryCandidateStatus =
  | "draft"
  | "friend_request_pending"
  | "accepted"
  | "declined"
  | "expired"
  | "deleted"
  | "generation_failed";
export type NeedDiscoveryExecutionMode = "dry_run" | "auto_send";

export interface NeedDiscoveryCadenceConfig {
  enabled: boolean;
  executionMode: NeedDiscoveryExecutionMode;
  maxCandidatesPerRun: number;
  minConfidenceScore: number;
  promptTemplate: string;
}

export interface NeedDiscoveryShortCadenceConfig
  extends NeedDiscoveryCadenceConfig {
  intervalMinutes: number;
  lookbackHours: number;
  skipIfNoNewSignals: boolean;
}

export interface NeedDiscoveryDailyCadenceConfig
  extends NeedDiscoveryCadenceConfig {
  runAtHour: number;
  runAtMinute: number;
  lookbackDays: number;
}

export interface NeedDiscoverySharedConfig {
  pendingCandidateLimit: number;
  dailyCreationLimit: number;
  expiryDays: number;
  shortSuppressionDays: number;
  dailySuppressionDays: number;
  coverageDomainOverlapThreshold: number;
  allowMedical: boolean;
  allowLegal: boolean;
  allowFinance: boolean;
  roleGenerationPrompt: string;
}

export interface NeedDiscoveryConfig {
  shortInterval: NeedDiscoveryShortCadenceConfig;
  daily: NeedDiscoveryDailyCadenceConfig;
  shared: NeedDiscoverySharedConfig;
}

export interface NeedDiscoveryRunRecord {
  id: string;
  cadenceType: NeedDiscoveryCadenceType;
  status: NeedDiscoveryRunStatus;
  startedAt: string;
  finishedAt?: string | null;
  windowStartedAt?: string | null;
  windowEndedAt?: string | null;
  signalCount: number;
  latestSignalAt?: string | null;
  summary?: string | null;
  selectedNeedKeys: string[];
  skipReason?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

export interface NeedDiscoveryCandidateRecord {
  id: string;
  runId?: string | null;
  cadenceType: NeedDiscoveryCadenceType;
  status: NeedDiscoveryCandidateStatus;
  needKey: string;
  needCategory: string;
  priorityScore: number;
  confidenceScore: number;
  coverageGapSummary?: string | null;
  evidenceHighlights: string[];
  characterId?: string | null;
  characterName?: string | null;
  friendRequestId?: string | null;
  friendRequestGreeting?: string | null;
  expiresAt?: string | null;
  acceptedAt?: string | null;
  declinedAt?: string | null;
  deletedAt?: string | null;
  suppressedUntil?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NeedDiscoveryStats {
  pendingCandidates: number;
  acceptedCandidates: number;
  declinedCandidates: number;
  expiredCandidates: number;
  deletedCandidates: number;
  dormantCharacters: number;
}

export interface NeedDiscoveryOverview {
  config: NeedDiscoveryConfig;
  stats: NeedDiscoveryStats;
  recentRuns: NeedDiscoveryRunRecord[];
  activeCandidates: NeedDiscoveryCandidateRecord[];
  recentCandidates: NeedDiscoveryCandidateRecord[];
}
