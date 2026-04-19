export type DesktopChatHistoryRouteState = {
  conversationId?: string;
};

export function parseDesktopChatHistoryRouteState(
  hash: string,
): DesktopChatHistoryRouteState {
  const normalizedHash = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!normalizedHash) {
    return {};
  }

  const params = new URLSearchParams(normalizedHash);
  const conversationId = params.get("conversation")?.trim();

  return conversationId ? { conversationId } : {};
}

export function buildDesktopChatHistoryRouteHash(
  conversationId?: string | null,
) {
  if (!conversationId) {
    return undefined;
  }

  const params = new URLSearchParams();
  params.set("conversation", conversationId);
  return params.toString();
}
