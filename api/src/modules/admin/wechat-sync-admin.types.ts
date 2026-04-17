import type { CharacterEntity } from '../characters/character.entity';

export type WechatSyncMessageDirectionValue =
  | 'owner'
  | 'contact'
  | 'group_member'
  | 'system'
  | 'unknown';

export interface WechatSyncMessageSampleValue {
  timestamp: string;
  text: string;
  sender?: string | null;
  typeLabel?: string | null;
  direction?: WechatSyncMessageDirectionValue;
}

export interface WechatSyncMomentHighlightValue {
  postedAt?: string | null;
  text: string;
  location?: string | null;
  mediaHint?: string | null;
}

export interface WechatSyncContactBundleValue {
  username: string;
  displayName: string;
  nickname?: string | null;
  remarkName?: string | null;
  region?: string | null;
  source?: string | null;
  tags: string[];
  isGroup: boolean;
  messageCount: number;
  ownerMessageCount: number;
  contactMessageCount: number;
  latestMessageAt?: string | null;
  chatSummary?: string | null;
  topicKeywords: string[];
  sampleMessages: WechatSyncMessageSampleValue[];
  momentHighlights: WechatSyncMomentHighlightValue[];
}

export interface WechatSyncPreviewRequestValue {
  contacts: WechatSyncContactBundleValue[];
}

export interface WechatSyncPreviewItemValue {
  contact: WechatSyncContactBundleValue;
  draftCharacter: Partial<CharacterEntity>;
  warnings: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface WechatSyncPreviewResponseValue {
  items: WechatSyncPreviewItemValue[];
}

export interface WechatSyncImportItemValue {
  contact: WechatSyncContactBundleValue;
  draftCharacter: Partial<CharacterEntity>;
  autoAddFriend?: boolean;
  seedMoments?: boolean;
}

export interface WechatSyncImportRequestValue {
  items: WechatSyncImportItemValue[];
}

export interface WechatSyncImportedItemValue {
  contactUsername: string;
  displayName: string;
  status: 'created' | 'updated';
  friendshipCreated: boolean;
  seededMomentCount: number;
  character: CharacterEntity;
}

export interface WechatSyncSkippedItemValue {
  contactUsername: string;
  displayName: string;
  reason: string;
}

export interface WechatSyncImportResponseValue {
  importedCount: number;
  items: WechatSyncImportedItemValue[];
  skipped: WechatSyncSkippedItemValue[];
}
