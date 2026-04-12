import type { ConversationType } from "@yinjie/contracts";

export type ConversationThreadRef = {
  id?: string;
  type: ConversationType;
  source?: "conversation" | "group";
};

export function isPersistedGroupConversation(input: ConversationThreadRef) {
  if (input.source) {
    return input.source === "group";
  }

  return input.type === "group";
}

export function getConversationThreadType(
  input: ConversationThreadRef,
): ConversationType {
  return isPersistedGroupConversation(input) ? "group" : "direct";
}

export function getConversationThreadLabel(input: ConversationThreadRef) {
  return isPersistedGroupConversation(input) ? "群聊" : "单聊";
}

export function getConversationThreadPath(
  input: ConversationThreadRef & { id: string },
) {
  return isPersistedGroupConversation(input)
    ? `/group/${input.id}`
    : `/chat/${input.id}`;
}
