import { type ChatRenderableMessage } from "../../components/chat-message-list";
import { parseTimestamp } from "../../lib/format";

export function buildChatUnreadMarkerDomId(
  threadContext?:
    | {
        id: string;
        type: "direct" | "group";
      }
    | undefined,
) {
  return `chat-unread-marker-${threadContext?.type ?? "thread"}-${threadContext?.id ?? "default"}`;
}

export function findFirstUnreadMessageId(
  messages: ChatRenderableMessage[],
  cutoff: string | null,
  enabled: boolean,
) {
  if (!enabled) {
    return null;
  }

  const cutoffTimestamp = cutoff ? parseTimestamp(cutoff) : null;
  const match = messages.find((message) => {
    if (message.senderType !== "character") {
      return false;
    }

    if (cutoffTimestamp === null) {
      return true;
    }

    const createdAt = parseTimestamp(message.createdAt);
    return createdAt !== null && createdAt > cutoffTimestamp;
  });

  return match?.id ?? null;
}

export function hasLoadedReadBoundary(
  messages: ChatRenderableMessage[],
  cutoff: string | null,
) {
  if (!cutoff) {
    return true;
  }

  const cutoffTimestamp = parseTimestamp(cutoff);
  if (cutoffTimestamp === null) {
    return true;
  }

  return messages.some((message) => {
    const createdAt = parseTimestamp(message.createdAt);
    return createdAt !== null && createdAt <= cutoffTimestamp;
  });
}
