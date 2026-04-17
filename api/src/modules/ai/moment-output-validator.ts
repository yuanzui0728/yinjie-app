import type { MomentGenerationContext, PersonalityProfile } from './ai.types';
import { sanitizeAiText } from './ai-text-sanitizer';

export type MomentOutputValidationResult = {
  valid: boolean;
  normalizedText: string;
  reasons: string[];
};

const META_PATTERNS = [
  /作为AI/u,
  /语言模型/u,
  /^朋友圈[：:]/u,
  /^文案[：:]/u,
  /(以下|下面).{0,4}(朋友圈|文案)/u,
  /(只输出|不要解释|说明如下)/u,
];

const GENERIC_PATTERNS = [
  /生活碎片/u,
  /记录一下/u,
  /随手一发/u,
  /新的一天/u,
  /继续加油/u,
  /保持热爱/u,
  /慢慢来/u,
  /就是这样/u,
  /最近状态/u,
  /有时候/u,
  /碎碎念/u,
  /一切都会/u,
];

const STOPWORDS = new Set([
  '今天',
  '最近',
  '现在',
  '一下',
  '一个',
  '一些',
  '这个',
  '那个',
  '就是',
  '还是',
  '真的',
  '感觉',
  '状态',
  '因为',
  '所以',
  '继续',
  '生活',
  '自己',
  '大家',
]);

function normalizeText(value: string) {
  return sanitizeAiText(value)
    .replace(/\s+/g, ' ')
    .replace(/[“”"'`]/g, '')
    .trim();
}

function extractAnchorTokens(
  context: MomentGenerationContext | undefined,
  profile: PersonalityProfile,
) {
  const tokens = new Set<string>();
  const sourceValues = [
    context?.worldContext?.weather,
    context?.worldContext?.location,
    context?.worldContext?.holiday,
    ...(context?.relationshipContext?.recentTopics ?? []),
    ...(profile.realWorldContext?.signalTitles ?? []),
    profile.realWorldContext?.realityMomentBrief ?? undefined,
  ];

  for (const sourceValue of sourceValues) {
    const normalized = sourceValue?.trim();
    if (!normalized) {
      continue;
    }

    const parts = normalized
      .split(/[；;，,。！!？?\s/·|]+/u)
      .map((item) => item.trim())
      .filter(Boolean);
    for (const part of [normalized, ...parts]) {
      if (part.length < 2 || part.length > 18 || STOPWORDS.has(part)) {
        continue;
      }
      tokens.add(part);
    }
  }

  return [...tokens];
}

function hasConcreteSignal(text: string) {
  return (
    /\d/u.test(text) ||
    /(晴|雨|雪|风|云|雷|雾|降温|升温|堵|晚高峰|清晨|午后|夜里|凌晨|傍晚|周[一二三四五六日天])/u.test(
      text,
    ) ||
    /[·:：]/u.test(text)
  );
}

export function validateGeneratedMomentOutput(input: {
  text: string;
  context?: MomentGenerationContext;
  profile: PersonalityProfile;
}): MomentOutputValidationResult {
  const normalizedText = normalizeText(input.text);
  const reasons: string[] = [];

  if (!normalizedText) {
    return {
      valid: false,
      normalizedText,
      reasons: ['内容为空'],
    };
  }

  if (normalizedText.length < 5) {
    reasons.push('内容过短');
  }
  if (normalizedText.length > 160) {
    reasons.push('内容过长');
  }
  if (META_PATTERNS.some((pattern) => pattern.test(normalizedText))) {
    reasons.push('带有解释或 AI 口吻');
  }

  const anchorTokens = extractAnchorTokens(input.context, input.profile);
  const hasAnchorHit = anchorTokens.some((token) =>
    normalizedText.includes(token),
  );
  const hasGenericPattern = GENERIC_PATTERNS.some((pattern) =>
    pattern.test(normalizedText),
  );
  const concreteSignal = hasConcreteSignal(normalizedText);

  if (!hasAnchorHit && !concreteSignal && normalizedText.length < 14) {
    reasons.push('缺少具体锚点');
  }
  if (hasGenericPattern && !hasAnchorHit && !concreteSignal) {
    reasons.push('内容偏空泛');
  }

  return {
    valid: reasons.length === 0,
    normalizedText,
    reasons,
  };
}
