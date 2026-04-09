import type { LocationCardAttachment } from "@yinjie/contracts";

export const CHAT_LOCATION_SCENES: Array<{
  id: string;
  title: string;
  subtitle: string;
}> = [
  {
    id: "coffee_shop",
    title: "咖啡馆",
    subtitle: "窗边有热咖啡和低声播放的爵士乐。",
  },
  {
    id: "library",
    title: "图书馆",
    subtitle: "安静的阅读区里，翻页声比说话声更清楚。",
  },
  {
    id: "park",
    title: "公园",
    subtitle: "树荫、长椅和慢下来的傍晚风。",
  },
  {
    id: "gym",
    title: "健身房",
    subtitle: "器械区和跑步机旁都有人来来往往。",
  },
];

export function buildLocationCardAttachment(
  sceneId: string,
): LocationCardAttachment | null {
  const scene = CHAT_LOCATION_SCENES.find((item) => item.id === sceneId);
  if (!scene) {
    return null;
  }

  return {
    kind: "location_card",
    sceneId: scene.id,
    title: scene.title,
    subtitle: scene.subtitle,
  };
}
