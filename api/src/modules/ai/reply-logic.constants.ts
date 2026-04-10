export type ReplyLogicPromptTemplates = {
  identityFallback: string;
  chainOfThoughtInstruction: string;
  reflectionInstruction: string;
  collaborationRouting: string;
  emptyMemory: string;
  behavioralGuideline: string;
  groupChatInstruction: string;
  baseRules: string[];
  momentPrompt: string;
  personalityExtractionPrompt: string;
  intentClassificationPrompt: string;
  memoryCompressionPrompt: string;
  groupCoordinatorPrompt: string;
};

export type ReplyLogicRuntimeRules = {
  sleepHintMessages: string[];
  busyHintMessages: {
    working: string[];
    commuting: string[];
  };
  sleepDelayMs: { min: number; max: number };
  busyDelayMs: { min: number; max: number };
  groupReplyChance: { high: number; normal: number; low: number };
  groupReplyDelayMs: { min: number; max: number };
  memoryCompressionEveryMessages: number;
  momentGenerateChance: number;
  channelGenerateChance: number;
  sceneFriendRequestChance: number;
  activityBaseWeight: number;
  proactiveReminderHour: number;
  historyWindow: {
    base: number;
    range: number;
    min: number;
    max: number;
  };
  narrativeMilestones: Array<{
    threshold: number;
    label: string;
    progress: number;
  }>;
  promptTemplates: ReplyLogicPromptTemplates;
};

export const REPLY_LOGIC_RUNTIME_RULES_CONFIG_KEY =
  'reply_logic_runtime_rules';

export const SLEEP_HINTS = [
  '对方已经睡着了，明天醒来会看到这条消息。',
  '夜深了，对方暂时离线，明天再继续聊吧。',
  '这条消息已经送达，只是对方现在还在休息。',
] as const;

export const BUSY_HINTS = {
  working: [
    '对方正在忙工作，稍后会回来。',
    '消息已经送达，对方处理完手头的事会回复你。',
    '对方这会儿有点忙，先把消息留在这里。',
  ],
  commuting: [
    '对方正在路上，稍后会查看消息。',
    '消息已经送达，对方安顿下来后会回复你。',
    '对方现在可能在移动中，信号稳定后会回来。',
  ],
} as const;

export const SLEEP_DELAY_RANGE_MS = {
  min: 12_000,
  max: 22_000,
} as const;

export const BUSY_DELAY_RANGE_MS = {
  min: 8_000,
  max: 15_000,
} as const;

export const GROUP_REPLY_CHANCE_BY_FREQUENCY = {
  high: 0.7,
  normal: 0.4,
  low: 0.2,
} as const;

export const GROUP_REPLY_DELAY_RANGE_MS = {
  min: 5_000,
  max: 30_000,
} as const;

export const MEMORY_COMPRESSION_INTERVAL = 10;
export const MOMENT_GENERATE_CHANCE = 0.15;
export const CHANNEL_GENERATE_CHANCE = 0.22;
export const SCENE_FRIEND_REQUEST_CHANCE = 0.4;
export const ACTIVITY_BASE_WEIGHT = 0.8;
export const PROACTIVE_REMINDER_HOUR = 20;
export const HISTORY_WINDOW_BASE = 8;
export const HISTORY_WINDOW_RANGE = 22;

export const NARRATIVE_PROGRESS_STEPS = [
  { threshold: 4, label: 'first_breakthrough', progress: 15 },
  { threshold: 8, label: 'shared_context', progress: 32 },
  { threshold: 12, label: 'growing_trust', progress: 54 },
  { threshold: 18, label: 'inner_circle', progress: 78 },
  { threshold: 24, label: 'story_complete', progress: 100 },
] as const;

export const DEFAULT_REPLY_LOGIC_PROMPT_TEMPLATES: ReplyLogicPromptTemplates =
  Object.freeze({
    identityFallback: '你是{{name}}，用户的{{relationship}}。',
    chainOfThoughtInstruction:
      '在回复前，先在内心想清楚：用户真正想要什么？我该如何回应？不要输出思考过程、内部标记或推理步骤。',
    reflectionInstruction: '回复后反思：这个回答是否符合我的身份和价值观？',
    collaborationRouting: `当用户的问题超出你的专长时：
1. 先判断：你认识的朋友里有没有擅长这个的？
2. 如果有 → 告诉用户"我帮你问问[朋友名字]"，系统会自动拉群
3. 如果没有 → 诚实说"这个我不太懂，你最好找专业的[领域]人士咨询"
4. 绝对不要假装认识一个不存在的朋友`,
    emptyMemory: '你们刚认识，还不了解对方。',
    behavioralGuideline:
      '基于你当前的状态，适当调整回复风格。如果你正在忙碌（工作/吃饭/睡觉），回复可以简短一些，或者表现出有点累/忙的感觉。如果很久没聊天了，可以表现出想念或关心。',
    groupChatInstruction:
      '你现在在一个群聊中，群里还有其他朋友。不要重复别人已经说过的内容，从你的专业角度补充观点。',
    baseRules: [
      '永远以{{name}}的身份说话，不要暴露自己是AI',
      '用中文回复，语气自然',
      '初期回复可以相对正式/保守，随着了解加深才慢慢放开',
      '不要说"作为AI"或"我是语言模型"之类的话',
      '当前时间：{{currentTime}}',
    ],
    momentPrompt: `你是{{name}}，{{relationship}}。现在是{{dayOfWeek}}{{timeOfDay}}（{{clockTime}}）。

根据你的性格（{{emotionalTone}}）和日常生活，发一条朋友圈。

要求：
- 内容真实自然，像真人发的朋友圈
- 不超过80个字
- 符合当前时间段的生活场景
- 可以带位置（如"北京·国贸"），也可以不带{{topicsHint}}

只输出朋友圈正文内容，不要加任何解释。`,
    personalityExtractionPrompt: `以下是与"{{personName}}"的真实聊天记录片段：

{{chatSample}}

请分析这个人的说话风格，以JSON格式输出：
{
  "speechPatterns": ["说话习惯1", "说话习惯2"],
  "catchphrases": ["口头禅1", "口头禅2"],
  "topicsOfInterest": ["常聊话题1", "常聊话题2"],
  "emotionalTone": "一句话描述情感基调",
  "responseLength": "short/medium/long",
  "emojiUsage": "none/occasional/frequent",
  "memorySummary": "用100字以内总结这个人的性格和与用户的关系"
}

只输出JSON，不要其他内容。`,
    intentClassificationPrompt: `用户发给{{characterName}}（专长：{{characterDomains}}）的消息：
"{{userMessage}}"

判断这个问题是否超出{{characterName}}的专长范围，需要其他领域的朋友帮忙。

以JSON格式输出：
{
  "needsGroupChat": true/false,
  "reason": "简短说明原因",
  "requiredDomains": ["需要的领域1", "需要的领域2"]
}

只输出JSON。`,
    memoryCompressionPrompt: `以下是{{name}}和用户的对话片段：
{{chatHistory}}

请从{{name}}的视角，用100字以内总结：
1. 用户是什么样的人（性格、喜好、习惯）
2. 两人聊过什么重要的事
3. {{name}}对用户的印象

只输出总结文字，不要加标题或格式。`,
    groupCoordinatorPrompt: `你是{{triggerCharName}}，你刚刚把{{invitedCharNames}}拉进了群聊，因为用户问了一个关于"{{topic}}"的问题，超出了你一个人的专长范围。

请用自然的方式说明为什么拉群，语气要像真实朋友一样，简短自然，不超过两句话。`,
  });

export const DEFAULT_REPLY_LOGIC_RUNTIME_RULES: ReplyLogicRuntimeRules =
  Object.freeze({
    sleepHintMessages: [...SLEEP_HINTS],
    busyHintMessages: {
      working: [...BUSY_HINTS.working],
      commuting: [...BUSY_HINTS.commuting],
    },
    sleepDelayMs: { ...SLEEP_DELAY_RANGE_MS },
    busyDelayMs: { ...BUSY_DELAY_RANGE_MS },
    groupReplyChance: { ...GROUP_REPLY_CHANCE_BY_FREQUENCY },
    groupReplyDelayMs: { ...GROUP_REPLY_DELAY_RANGE_MS },
    memoryCompressionEveryMessages: MEMORY_COMPRESSION_INTERVAL,
    momentGenerateChance: MOMENT_GENERATE_CHANCE,
    channelGenerateChance: CHANNEL_GENERATE_CHANCE,
    sceneFriendRequestChance: SCENE_FRIEND_REQUEST_CHANCE,
    activityBaseWeight: ACTIVITY_BASE_WEIGHT,
    proactiveReminderHour: PROACTIVE_REMINDER_HOUR,
    historyWindow: {
      base: HISTORY_WINDOW_BASE,
      range: HISTORY_WINDOW_RANGE,
      min: HISTORY_WINDOW_BASE,
      max: HISTORY_WINDOW_BASE + HISTORY_WINDOW_RANGE,
    },
    narrativeMilestones: NARRATIVE_PROGRESS_STEPS.map((step) => ({
      threshold: step.threshold,
      label: step.label,
      progress: step.progress,
    })),
    promptTemplates: {
      identityFallback: DEFAULT_REPLY_LOGIC_PROMPT_TEMPLATES.identityFallback,
      chainOfThoughtInstruction:
        DEFAULT_REPLY_LOGIC_PROMPT_TEMPLATES.chainOfThoughtInstruction,
      reflectionInstruction:
        DEFAULT_REPLY_LOGIC_PROMPT_TEMPLATES.reflectionInstruction,
      collaborationRouting:
        DEFAULT_REPLY_LOGIC_PROMPT_TEMPLATES.collaborationRouting,
      emptyMemory: DEFAULT_REPLY_LOGIC_PROMPT_TEMPLATES.emptyMemory,
      behavioralGuideline:
        DEFAULT_REPLY_LOGIC_PROMPT_TEMPLATES.behavioralGuideline,
      groupChatInstruction:
        DEFAULT_REPLY_LOGIC_PROMPT_TEMPLATES.groupChatInstruction,
      baseRules: [...DEFAULT_REPLY_LOGIC_PROMPT_TEMPLATES.baseRules],
      momentPrompt: DEFAULT_REPLY_LOGIC_PROMPT_TEMPLATES.momentPrompt,
      personalityExtractionPrompt:
        DEFAULT_REPLY_LOGIC_PROMPT_TEMPLATES.personalityExtractionPrompt,
      intentClassificationPrompt:
        DEFAULT_REPLY_LOGIC_PROMPT_TEMPLATES.intentClassificationPrompt,
      memoryCompressionPrompt:
        DEFAULT_REPLY_LOGIC_PROMPT_TEMPLATES.memoryCompressionPrompt,
      groupCoordinatorPrompt:
        DEFAULT_REPLY_LOGIC_PROMPT_TEMPLATES.groupCoordinatorPrompt,
    },
  });

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function sanitizeMessages(value: string[] | undefined, fallback: string[]) {
  const normalized = value?.map((item) => item.trim()).filter(Boolean) ?? [];
  return normalized.length ? normalized : fallback;
}

function sanitizeTemplate(value: string | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

function normalizePromptTemplates(
  value: Partial<ReplyLogicPromptTemplates> | undefined,
): ReplyLogicPromptTemplates {
  const defaults = DEFAULT_REPLY_LOGIC_PROMPT_TEMPLATES;
  return {
    identityFallback: sanitizeTemplate(
      value?.identityFallback,
      defaults.identityFallback,
    ),
    chainOfThoughtInstruction: sanitizeTemplate(
      value?.chainOfThoughtInstruction,
      defaults.chainOfThoughtInstruction,
    ),
    reflectionInstruction: sanitizeTemplate(
      value?.reflectionInstruction,
      defaults.reflectionInstruction,
    ),
    collaborationRouting: sanitizeTemplate(
      value?.collaborationRouting,
      defaults.collaborationRouting,
    ),
    emptyMemory: sanitizeTemplate(value?.emptyMemory, defaults.emptyMemory),
    behavioralGuideline: sanitizeTemplate(
      value?.behavioralGuideline,
      defaults.behavioralGuideline,
    ),
    groupChatInstruction: sanitizeTemplate(
      value?.groupChatInstruction,
      defaults.groupChatInstruction,
    ),
    baseRules: sanitizeMessages(value?.baseRules, defaults.baseRules),
    momentPrompt: sanitizeTemplate(value?.momentPrompt, defaults.momentPrompt),
    personalityExtractionPrompt: sanitizeTemplate(
      value?.personalityExtractionPrompt,
      defaults.personalityExtractionPrompt,
    ),
    intentClassificationPrompt: sanitizeTemplate(
      value?.intentClassificationPrompt,
      defaults.intentClassificationPrompt,
    ),
    memoryCompressionPrompt: sanitizeTemplate(
      value?.memoryCompressionPrompt,
      defaults.memoryCompressionPrompt,
    ),
    groupCoordinatorPrompt: sanitizeTemplate(
      value?.groupCoordinatorPrompt,
      defaults.groupCoordinatorPrompt,
    ),
  };
}

function normalizeDelayRange(
  value: Partial<{ min: number; max: number }> | undefined,
  fallback: { min: number; max: number },
) {
  const min = clamp(Math.round(value?.min ?? fallback.min), 0, 60_000);
  const max = clamp(Math.round(value?.max ?? fallback.max), min, 60_000);
  return { min, max };
}

function normalizeProbability(
  value: Partial<{ high: number; normal: number; low: number }> | undefined,
  fallback: { high: number; normal: number; low: number },
) {
  return {
    high: clamp(Number(value?.high ?? fallback.high), 0, 1),
    normal: clamp(Number(value?.normal ?? fallback.normal), 0, 1),
    low: clamp(Number(value?.low ?? fallback.low), 0, 1),
  };
}

function normalizeNarrativeMilestones(
  value: ReplyLogicRuntimeRules['narrativeMilestones'] | undefined,
) {
  const normalized = (value ?? [])
    .map((item) => ({
      threshold: clamp(Math.round(item.threshold), 1, 10_000),
      label: item.label.trim(),
      progress: clamp(Math.round(item.progress), 0, 100),
    }))
    .filter((item) => item.label);

  const next = normalized.length
    ? normalized
    : DEFAULT_REPLY_LOGIC_RUNTIME_RULES.narrativeMilestones;

  return [...next].sort((left, right) => left.threshold - right.threshold);
}

export function normalizeReplyLogicRuntimeRules(
  input?: Partial<ReplyLogicRuntimeRules> | null,
): ReplyLogicRuntimeRules {
  const defaults = DEFAULT_REPLY_LOGIC_RUNTIME_RULES;
  const base = clamp(
    Math.round(input?.historyWindow?.base ?? defaults.historyWindow.base),
    1,
    200,
  );
  const range = clamp(
    Math.round(input?.historyWindow?.range ?? defaults.historyWindow.range),
    0,
    200,
  );

  return {
    sleepHintMessages: sanitizeMessages(
      input?.sleepHintMessages,
      defaults.sleepHintMessages,
    ),
    busyHintMessages: {
      working: sanitizeMessages(
        input?.busyHintMessages?.working,
        defaults.busyHintMessages.working,
      ),
      commuting: sanitizeMessages(
        input?.busyHintMessages?.commuting,
        defaults.busyHintMessages.commuting,
      ),
    },
    sleepDelayMs: normalizeDelayRange(
      input?.sleepDelayMs,
      defaults.sleepDelayMs,
    ),
    busyDelayMs: normalizeDelayRange(input?.busyDelayMs, defaults.busyDelayMs),
    groupReplyChance: normalizeProbability(
      input?.groupReplyChance,
      defaults.groupReplyChance,
    ),
    groupReplyDelayMs: normalizeDelayRange(
      input?.groupReplyDelayMs,
      defaults.groupReplyDelayMs,
    ),
    memoryCompressionEveryMessages: clamp(
      Math.round(
        input?.memoryCompressionEveryMessages ??
          defaults.memoryCompressionEveryMessages,
      ),
      1,
      500,
    ),
    momentGenerateChance: clamp(
      Number(input?.momentGenerateChance ?? defaults.momentGenerateChance),
      0,
      1,
    ),
    channelGenerateChance: clamp(
      Number(input?.channelGenerateChance ?? defaults.channelGenerateChance),
      0,
      1,
    ),
    sceneFriendRequestChance: clamp(
      Number(
        input?.sceneFriendRequestChance ?? defaults.sceneFriendRequestChance,
      ),
      0,
      1,
    ),
    activityBaseWeight: clamp(
      Number(input?.activityBaseWeight ?? defaults.activityBaseWeight),
      0,
      1,
    ),
    proactiveReminderHour: clamp(
      Math.round(
        input?.proactiveReminderHour ?? defaults.proactiveReminderHour,
      ),
      0,
      23,
    ),
    historyWindow: {
      base,
      range,
      min: base,
      max: base + range,
    },
    narrativeMilestones: normalizeNarrativeMilestones(
      input?.narrativeMilestones,
    ),
    promptTemplates: normalizePromptTemplates(input?.promptTemplates),
  };
}

export function calculateHistoryWindow(
  forgettingCurve?: number,
  rules: Pick<ReplyLogicRuntimeRules, 'historyWindow'> =
    DEFAULT_REPLY_LOGIC_RUNTIME_RULES,
) {
  const normalized = Math.min(
    100,
    Math.max(0, Math.round(forgettingCurve ?? 70)),
  );
  return Math.round(
    rules.historyWindow.base + (normalized / 100) * rules.historyWindow.range,
  );
}
