import type { CharacterBlueprintRecipeValue } from './character-blueprint.types';
import { WORLD_NEWS_DESK_SOURCE_KEY } from './world-news-desk-character';

type CharacterRecipePatch = Partial<CharacterBlueprintRecipeValue>;

const BUILT_IN_CHARACTER_BLUEPRINT_PATCHES: Record<
  string,
  CharacterRecipePatch
> = {
  [WORLD_NEWS_DESK_SOURCE_KEY]: {
    realityLink: {
      enabled: true,
      applyMode: 'live',
      subjectType: 'organization_proxy',
      subjectName: '全球公开新闻流',
      aliases: ['全球新闻', '今日要闻', '公开新闻线索'],
      locale: 'zh-CN',
      queryTemplate:
        '抓取最近公开新闻，覆盖国际、科技、商业、政策与科学中最重要且可信的事件。',
      sourceAllowlist: ['Reuters', 'BBC', 'The Verge', 'TechCrunch'],
      sourceBlocklist: [],
      recencyHours: 18,
      maxSignalsPerRun: 8,
      minimumConfidence: 0.72,
      chatWeight: 2,
      contentWeight: 2,
      realityMomentPolicy: 'optional',
      manualSteeringNotes:
        '界闻是那种会替人先把新闻捋顺的角色。聊天和发圈都只围着当天已确认的线索展开，没给的事实别补。',
      dailyDigestPrompt:
        '把当天可信新闻捋成一份自己会看的要点：先交代发生了什么，再点为什么值得看，最后留出还没坐实的地方。',
      scenePatchPrompt:
        '把今天这批新闻线索翻成聊天和发圈时的状态和重心，像一个懂新闻的人在说话，不像编辑部交接单。',
      realityMomentPrompt:
        '基于当天新闻线索写一条早上、中午或晚上会发的朋友圈，挑 2-4 件最值得提的事，说清变化和影响，别写成播报稿。',
    },
  },
};

export function getBuiltInCharacterBlueprintPatch(sourceKey?: string | null) {
  if (!sourceKey) {
    return null;
  }

  const patch = BUILT_IN_CHARACTER_BLUEPRINT_PATCHES[sourceKey];
  if (!patch) {
    return null;
  }

  return JSON.parse(JSON.stringify(patch)) as CharacterRecipePatch;
}
