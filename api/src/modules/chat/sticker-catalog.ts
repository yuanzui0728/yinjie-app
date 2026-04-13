import type { StickerAttachment } from './chat.types';

export interface StickerCatalogItem {
  id: string;
  src: string;
  width: number;
  height: number;
  label: string;
  keywords: string[];
  mimeType?: string;
}

export interface StickerPack {
  id: string;
  title: string;
  coverStickerId: string;
  stickers: StickerCatalogItem[];
}

const STICKER_PACKS: StickerPack[] = [
  {
    id: 'yinjie-mochi',
    title: '麻薯日常',
    coverStickerId: 'ok',
    stickers: [
      { id: 'ok', src: '/stickers/yinjie-mochi/ok.svg', width: 160, height: 160, label: '赞同', keywords: ['赞同', '收到', 'ok', '好'] },
      { id: 'wave', src: '/stickers/yinjie-mochi/wave.svg', width: 160, height: 160, label: '打招呼', keywords: ['招呼', '你好', '嗨', 'hi'] },
      { id: 'wow', src: '/stickers/yinjie-mochi/wow.svg', width: 160, height: 160, label: '震惊', keywords: ['震惊', '吃惊', '啊', '什么'] },
      { id: 'hug', src: '/stickers/yinjie-mochi/hug.svg', width: 160, height: 160, label: '抱抱', keywords: ['抱抱', '安慰', '贴贴'] },
      { id: 'sleep', src: '/stickers/yinjie-mochi/sleep.svg', width: 160, height: 160, label: '困了', keywords: ['困了', '睡觉', '晚安', '休息'] },
      { id: 'angry', src: '/stickers/yinjie-mochi/angry.svg', width: 160, height: 160, label: '生气', keywords: ['生气', '无语', '怒', '气'] },
    ],
  },
  {
    id: 'yinjie-status',
    title: '情绪现场',
    coverStickerId: 'happy',
    stickers: [
      { id: 'happy', src: '/stickers/yinjie-status/happy.svg', width: 160, height: 160, label: '开心', keywords: ['开心', '嘿嘿', '高兴', '快乐'] },
      { id: 'please', src: '/stickers/yinjie-status/please.svg', width: 160, height: 160, label: '拜托', keywords: ['拜托', '求求', '帮忙', '求你'] },
      { id: 'cry', src: '/stickers/yinjie-status/cry.svg', width: 160, height: 160, label: '委屈', keywords: ['委屈', '难过', '哭哭', '呜呜'] },
      { id: 'daze', src: '/stickers/yinjie-status/daze.svg', width: 160, height: 160, label: '发呆', keywords: ['发呆', '懵', '走神', '呆住'] },
      { id: 'clap', src: '/stickers/yinjie-status/clap.svg', width: 160, height: 160, label: '鼓掌', keywords: ['鼓掌', '厉害', '棒', '赞'] },
      { id: 'broken', src: '/stickers/yinjie-status/broken.svg', width: 160, height: 160, label: '破防', keywords: ['破防', '崩溃', '裂开', '顶不住'] },
    ],
  },
  {
    id: 'yinjie-bubble',
    title: '气泡对白',
    coverStickerId: 'cheer',
    stickers: [
      { id: 'cheer', src: '/stickers/yinjie-bubble/cheer.svg', width: 180, height: 180, label: '冲呀', keywords: ['冲呀', '加油', '开干'] },
      { id: 'goodnight', src: '/stickers/yinjie-bubble/goodnight.svg', width: 180, height: 180, label: '晚安', keywords: ['晚安', '休息', '睡了'] },
      { id: 'thanks', src: '/stickers/yinjie-bubble/thanks.svg', width: 180, height: 180, label: '谢谢', keywords: ['谢谢', '感谢', '辛苦了'] },
      { id: 'thinking', src: '/stickers/yinjie-bubble/thinking.svg', width: 180, height: 180, label: '思考中', keywords: ['思考', '等等', '让我想想'] },
      { id: 'approve', src: '/stickers/yinjie-bubble/approve.svg', width: 180, height: 180, label: '收到', keywords: ['收到', '明白', '行', 'ok'] },
      { id: 'laugh', src: '/stickers/yinjie-bubble/laugh.svg', width: 180, height: 180, label: '笑出声', keywords: ['笑', '哈哈', '乐', '开心'] },
    ],
  },
  {
    id: 'yinjie-office',
    title: '回复速递',
    coverStickerId: 'arriving',
    stickers: [
      { id: 'arriving', src: '/stickers/yinjie-office/arriving.svg', width: 180, height: 180, label: '在路上', keywords: ['在路上', '马上到', '快到了', '出发了'] },
      { id: 'later', src: '/stickers/yinjie-office/later.svg', width: 180, height: 180, label: '稍等', keywords: ['稍等', '等等', '等我', '马上'] },
      { id: 'review', src: '/stickers/yinjie-office/review.svg', width: 180, height: 180, label: '马上看', keywords: ['马上看', '我先看', '处理中', '安排'] },
      { id: 'done', src: '/stickers/yinjie-office/done.svg', width: 180, height: 180, label: '已安排', keywords: ['已安排', '搞定', '好了', '办了'] },
      { id: 'busy', src: '/stickers/yinjie-office/busy.svg', width: 180, height: 180, label: '先忙', keywords: ['先忙', '在忙', '晚点', '回你'] },
      { id: 'coming', src: '/stickers/yinjie-office/coming.svg', width: 180, height: 180, label: '这就来', keywords: ['这就来', '马上来', '到我了', '来了'] },
    ],
  },
];

const STICKERS: StickerAttachment[] = STICKER_PACKS.flatMap((pack) =>
  pack.stickers.map((sticker) => ({
    kind: 'sticker' as const,
    sourceType: 'builtin' as const,
    packId: pack.id,
    stickerId: sticker.id,
    url: sticker.src,
    mimeType: sticker.mimeType ?? inferStickerMimeType(sticker.src),
    width: sticker.width,
    height: sticker.height,
    label: sticker.label,
  })),
);

export function getStickerPackCatalog(): StickerPack[] {
  return STICKER_PACKS.map((pack) => ({
    ...pack,
    stickers: pack.stickers.map((sticker) => ({
      ...sticker,
      keywords: [...sticker.keywords],
    })),
  }));
}

export function findStickerAttachment(
  packId: string,
  stickerId: string,
): StickerAttachment | null {
  return (
    STICKERS.find(
      (item) => item.packId === packId && item.stickerId === stickerId,
    ) ?? null
  );
}

function inferStickerMimeType(url: string) {
  if (url.endsWith('.gif')) {
    return 'image/gif';
  }

  if (url.endsWith('.webp')) {
    return 'image/webp';
  }

  if (url.endsWith('.svg')) {
    return 'image/svg+xml';
  }

  return 'image/png';
}
