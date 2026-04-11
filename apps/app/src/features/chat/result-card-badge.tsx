import { resolveChatCardBadgeClassName, type ChatCardBadgeTone } from "./chat-card-badge";

export function ResultCardBadge({
  label,
  tone,
}: {
  label: string;
  tone: ChatCardBadgeTone;
}) {
  return <div className={resolveChatCardBadgeClassName(tone)}>{label}</div>;
}
