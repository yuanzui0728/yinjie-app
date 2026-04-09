export type ChatBackgroundSource = 'preset' | 'upload';
export type ConversationBackgroundMode = 'inherit' | 'custom';

export interface ChatBackgroundAsset {
  source: ChatBackgroundSource;
  assetId: string;
  url: string;
  thumbnailUrl?: string;
  label?: string;
  width?: number;
  height?: number;
}

export interface ConversationBackgroundSettings {
  mode: ConversationBackgroundMode;
  conversationBackground?: ChatBackgroundAsset | null;
  defaultBackground?: ChatBackgroundAsset | null;
  effectiveBackground?: ChatBackgroundAsset | null;
}
