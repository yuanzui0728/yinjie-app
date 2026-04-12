import type { ConversationType } from "@yinjie/contracts";

export function isPersistedGroupConversation(input: {
  id?: string;
  type: ConversationType;
}) {
  return input.type === "group";
}
