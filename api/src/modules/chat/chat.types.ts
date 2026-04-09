export interface StickerAttachment {
  kind: 'sticker';
  packId: string;
  stickerId: string;
  url: string;
  width: number;
  height: number;
  label?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: 'user' | 'character' | 'system';
  senderId: string;
  senderName: string;
  type: 'text' | 'system' | 'proactive' | 'sticker';
  text: string;
  attachment?: StickerAttachment;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  title: string;
  participants: string[]; // character ids
  messages: Message[];
  isPinned: boolean;
  pinnedAt?: Date;
  lastReadAt?: Date;
  lastClearedAt?: Date;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
