import type {
  RealWorldRuntimeContextValue as AiRealWorldRuntimeContextValue,
  ScenePrompts,
} from '../ai/ai.types';

export type RealityLinkApplyModeValue = 'disabled' | 'shadow' | 'live';
export type RealityLinkSubjectTypeValue =
  | 'living_public_figure'
  | 'organization_proxy'
  | 'historical_snapshot'
  | 'fictional_or_private';
export type RealityMomentPolicyValue =
  | 'disabled'
  | 'optional'
  | 'force_one_daily';
export type RealWorldSyncProviderModeValue = 'mock';
export type RealWorldSignalStatusValue =
  | 'accepted'
  | 'filtered_low_confidence'
  | 'filtered_identity_mismatch'
  | 'filtered_duplicate'
  | 'manual_excluded';
export type RealWorldSignalTypeValue =
  | 'news_article'
  | 'official_post'
  | 'interview'
  | 'public_appearance'
  | 'product_release'
  | 'other';
export type RealWorldDigestStatusValue =
  | 'draft'
  | 'active'
  | 'superseded'
  | 'failed';
export type RealWorldDigestApplyModeValue = 'shadow' | 'live' | 'manual';
export type RealWorldSyncRunTypeValue =
  | 'signal_collect'
  | 'digest_generate'
  | 'manual_resync';
export type RealWorldSyncRunStatusValue =
  | 'running'
  | 'success'
  | 'failed'
  | 'partial';

export type RealityLinkConfigValue = {
  enabled: boolean;
  applyMode: RealityLinkApplyModeValue;
  subjectType: RealityLinkSubjectTypeValue;
  subjectName: string;
  aliases: string[];
  locale: string;
  queryTemplate: string;
  sourceAllowlist: string[];
  sourceBlocklist: string[];
  recencyHours: number;
  maxSignalsPerRun: number;
  minimumConfidence: number;
  chatWeight: number;
  contentWeight: number;
  realityMomentPolicy: RealityMomentPolicyValue;
  manualSteeringNotes: string;
  dailyDigestPrompt: string;
  scenePatchPrompt: string;
  realityMomentPrompt: string;
};

export type RealWorldSyncPromptTemplatesValue = {
  signalNormalizationPrompt: string;
  dailyDigestPrompt: string;
  scenePatchPrompt: string;
  realityMomentPrompt: string;
};

export type RealWorldSyncRulesValue = {
  providerMode: RealWorldSyncProviderModeValue;
  defaultLocale: string;
  defaultSourceAllowlist: string[];
  defaultSourceBlocklist: string[];
  defaultRecencyHours: number;
  defaultMaxSignalsPerRun: number;
  defaultMinimumConfidence: number;
  promptTemplates: RealWorldSyncPromptTemplatesValue;
};

export type RealWorldScenePatchPayloadValue = ScenePrompts;
export type RealWorldRuntimeContextValue = AiRealWorldRuntimeContextValue;
