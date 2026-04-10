import type { DesktopChatCallKind } from "./desktop-chat-header-actions";

export type DesktopMobileCallHandoffState = {
  kind: DesktopChatCallKind;
  conversationId: string;
  conversationType: "direct" | "group";
  title?: string;
};

export function buildDesktopMobileCallHandoffHash(
  input: DesktopMobileCallHandoffState,
) {
  const params = new URLSearchParams();
  params.set("handoff", "call");
  params.set("kind", input.kind);
  params.set("conversationId", input.conversationId);
  params.set("conversationType", input.conversationType);

  if (input.title?.trim()) {
    params.set("title", input.title.trim());
  }

  return params.toString();
}

export function parseDesktopMobileCallHandoffHash(hash: string) {
  const normalizedHash = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!normalizedHash) {
    return null;
  }

  const params = new URLSearchParams(normalizedHash);
  if (params.get("handoff") !== "call") {
    return null;
  }

  const kind = params.get("kind");
  const conversationId = params.get("conversationId");
  const conversationType = params.get("conversationType");
  if (
    (kind !== "voice" && kind !== "video") ||
    !conversationId ||
    (conversationType !== "direct" && conversationType !== "group")
  ) {
    return null;
  }

  const title = params.get("title")?.trim();
  return {
    kind,
    conversationId,
    conversationType,
    title: title || undefined,
  } satisfies DesktopMobileCallHandoffState;
}
