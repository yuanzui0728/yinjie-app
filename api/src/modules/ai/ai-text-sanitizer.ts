const THOUGHT_BLOCK_PATTERN = /<thought\b[^>]*>[\s\S]*?<\/thought>/gi;
const INTERNAL_REASONING_BLOCK_PATTERN =
  /<internal_reasoning\b[^>]*>[\s\S]*?<\/internal_reasoning>/gi;
const THOUGHT_TAG_PATTERN = /<\/?thought\b[^>]*>/gi;
const INTERNAL_REASONING_TAG_PATTERN = /<\/?internal_reasoning\b[^>]*>/gi;
const INTERNAL_SPEAKER_PREFIX_PATTERN = /^\[[^\]\n]{1,120}\]:\s*/gm;
const STAGE_DIRECTION_FRAGMENT =
  '(?:轻笑|笑了笑|笑|苦笑|叹气|叹了口气|沉默|停顿|顿了顿|停了停|想了想|看了看|看向|看着|低头|抬头|耸肩|皱眉|挑眉|扶额|点头|摇头|拍拍|抱抱|凑近|后退|清了清嗓|咳了一声|压低声音|轻声|无奈|认真)';
const LEADING_BRACKET_STAGE_DIRECTION_PATTERN = new RegExp(
  `^\\s*[（(][^\\n（）()]{0,12}${STAGE_DIRECTION_FRAGMENT}[^\\n（）()]{0,12}[)）](?:\\s*[，,。.!！?？:：-]*)\\s*`,
  'u',
);
const LEADING_STAR_STAGE_DIRECTION_PATTERN = new RegExp(
  `^\\s*[*＊][^\\n*＊]{0,12}${STAGE_DIRECTION_FRAGMENT}[^\\n*＊]{0,12}[*＊](?:\\s*[，,。.!！?？:：-]*)\\s*`,
  'u',
);
const STANDALONE_STAGE_DIRECTION_LINE_PATTERN = new RegExp(
  `^\\s*(?:[（(][^\\n（）()]{0,12}${STAGE_DIRECTION_FRAGMENT}[^\\n（）()]{0,12}[)）]|[*＊][^\\n*＊]{0,12}${STAGE_DIRECTION_FRAGMENT}[^\\n*＊]{0,12}[*＊])\\s*$`,
  'gmu',
);

function stripLeadingStageDirections(text: string) {
  let normalized = text;
  let previous = '';

  while (normalized !== previous) {
    previous = normalized;
    normalized = normalized
      .replace(LEADING_BRACKET_STAGE_DIRECTION_PATTERN, '')
      .replace(LEADING_STAR_STAGE_DIRECTION_PATTERN, '');
  }

  return normalized;
}

export function sanitizeAiText(text: string): string {
  const withoutInternalBlocks = text
    .replace(INTERNAL_REASONING_BLOCK_PATTERN, '')
    .replace(THOUGHT_BLOCK_PATTERN, '')
    .replace(INTERNAL_REASONING_TAG_PATTERN, '')
    .replace(THOUGHT_TAG_PATTERN, '')
    .replace(INTERNAL_SPEAKER_PREFIX_PATTERN, '')
    .replace(STANDALONE_STAGE_DIRECTION_LINE_PATTERN, '')
    .trimStart();

  return stripLeadingStageDirections(withoutInternalBlocks)
    .replace(STANDALONE_STAGE_DIRECTION_LINE_PATTERN, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
