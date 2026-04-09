export interface StickerCatalogItem {
  id: string;
  src: string;
  width: number;
  height: number;
  label: string;
}

export interface StickerPack {
  id: string;
  title: string;
  coverStickerId: string;
  stickers: StickerCatalogItem[];
}

export interface StickerAttachment {
  kind: "sticker";
  packId: string;
  stickerId: string;
  url: string;
  width: number;
  height: number;
  label?: string;
}

export const STICKER_PACKS: StickerPack[] = [
  {
    id: "yinjie-mochi",
    title: "麻薯日常",
    coverStickerId: "ok",
    stickers: [
      { id: "ok", src: "/stickers/yinjie-mochi/ok.png", width: 160, height: 160, label: "赞同" },
      { id: "wave", src: "/stickers/yinjie-mochi/wave.png", width: 160, height: 160, label: "打招呼" },
      { id: "wow", src: "/stickers/yinjie-mochi/wow.png", width: 160, height: 160, label: "震惊" },
      { id: "hug", src: "/stickers/yinjie-mochi/hug.png", width: 160, height: 160, label: "抱抱" },
      { id: "sleep", src: "/stickers/yinjie-mochi/sleep.png", width: 160, height: 160, label: "困了" },
      { id: "angry", src: "/stickers/yinjie-mochi/angry.png", width: 160, height: 160, label: "生气" },
    ],
  },
  {
    id: "yinjie-bubble",
    title: "气泡对白",
    coverStickerId: "cheer",
    stickers: [
      { id: "cheer", src: "/stickers/yinjie-bubble/cheer.png", width: 180, height: 180, label: "冲呀" },
      { id: "goodnight", src: "/stickers/yinjie-bubble/goodnight.png", width: 180, height: 180, label: "晚安" },
      { id: "thanks", src: "/stickers/yinjie-bubble/thanks.png", width: 180, height: 180, label: "谢谢" },
      { id: "thinking", src: "/stickers/yinjie-bubble/thinking.png", width: 180, height: 180, label: "思考中" },
      { id: "approve", src: "/stickers/yinjie-bubble/approve.png", width: 180, height: 180, label: "收到" },
      { id: "laugh", src: "/stickers/yinjie-bubble/laugh.png", width: 180, height: 180, label: "笑出声" },
    ],
  },
];

export function getStickerPack(packId: string) {
  return STICKER_PACKS.find((item) => item.id === packId);
}

export function getStickerAttachment(packId: string, stickerId: string): StickerAttachment | null {
  const pack = getStickerPack(packId);
  const sticker = pack?.stickers.find((item) => item.id === stickerId);
  if (!pack || !sticker) {
    return null;
  }

  return {
    kind: "sticker",
    packId: pack.id,
    stickerId: sticker.id,
    url: sticker.src,
    width: sticker.width,
    height: sticker.height,
    label: sticker.label,
  };
}
