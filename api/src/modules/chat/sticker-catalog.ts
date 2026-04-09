import type { StickerAttachment } from './chat.types';

const STICKERS: StickerAttachment[] = [
  { kind: 'sticker', packId: 'yinjie-mochi', stickerId: 'ok', url: '/stickers/yinjie-mochi/ok.png', width: 160, height: 160, label: '赞同' },
  { kind: 'sticker', packId: 'yinjie-mochi', stickerId: 'wave', url: '/stickers/yinjie-mochi/wave.png', width: 160, height: 160, label: '打招呼' },
  { kind: 'sticker', packId: 'yinjie-mochi', stickerId: 'wow', url: '/stickers/yinjie-mochi/wow.png', width: 160, height: 160, label: '震惊' },
  { kind: 'sticker', packId: 'yinjie-mochi', stickerId: 'hug', url: '/stickers/yinjie-mochi/hug.png', width: 160, height: 160, label: '抱抱' },
  { kind: 'sticker', packId: 'yinjie-mochi', stickerId: 'sleep', url: '/stickers/yinjie-mochi/sleep.png', width: 160, height: 160, label: '困了' },
  { kind: 'sticker', packId: 'yinjie-mochi', stickerId: 'angry', url: '/stickers/yinjie-mochi/angry.png', width: 160, height: 160, label: '生气' },
  { kind: 'sticker', packId: 'yinjie-bubble', stickerId: 'cheer', url: '/stickers/yinjie-bubble/cheer.png', width: 180, height: 180, label: '冲呀' },
  { kind: 'sticker', packId: 'yinjie-bubble', stickerId: 'goodnight', url: '/stickers/yinjie-bubble/goodnight.png', width: 180, height: 180, label: '晚安' },
  { kind: 'sticker', packId: 'yinjie-bubble', stickerId: 'thanks', url: '/stickers/yinjie-bubble/thanks.png', width: 180, height: 180, label: '谢谢' },
  { kind: 'sticker', packId: 'yinjie-bubble', stickerId: 'thinking', url: '/stickers/yinjie-bubble/thinking.png', width: 180, height: 180, label: '思考中' },
  { kind: 'sticker', packId: 'yinjie-bubble', stickerId: 'approve', url: '/stickers/yinjie-bubble/approve.png', width: 180, height: 180, label: '收到' },
  { kind: 'sticker', packId: 'yinjie-bubble', stickerId: 'laugh', url: '/stickers/yinjie-bubble/laugh.png', width: 180, height: 180, label: '笑出声' },
];

export function findStickerAttachment(packId: string, stickerId: string): StickerAttachment | null {
  return STICKERS.find((item) => item.packId === packId && item.stickerId === stickerId) ?? null;
}
