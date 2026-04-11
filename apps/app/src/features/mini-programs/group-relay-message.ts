const GROUP_RELAY_MESSAGE_PREFIX = "[群接龙]";

export function buildGroupRelaySummaryMessage(sourceGroupName: string) {
  return [
    `${GROUP_RELAY_MESSAGE_PREFIX} ${sourceGroupName}`,
    "状态 待继续",
    "1. 已从桌面端群聊打开群接龙工作台。",
    "2. 当前正在整理接龙名单和未确认成员。",
    "3. 请按顺序继续接龙，或直接在群里补充结果。",
  ].join("\n");
}

export function parseGroupRelaySummaryMessage(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const header = lines[0];

  if (!header?.startsWith(`${GROUP_RELAY_MESSAGE_PREFIX} `)) {
    return null;
  }

  const sourceGroupName =
    header.slice(GROUP_RELAY_MESSAGE_PREFIX.length).trim() || "当前群聊";
  const statusLabel = parseGroupRelayStatusLabel(lines[1]);
  const summaryLines = lines
    .slice(1 + Number(Boolean(statusLabel)))
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);

  return {
    sourceGroupName,
    statusLabel,
    summaryLines,
  };
}

function parseGroupRelayStatusLabel(line: string | undefined) {
  if (!line || !line.startsWith("状态 ")) {
    return null;
  }

  return line.replace(/^状态\s+/, "").trim() || null;
}
