import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, MessagesSquare } from "lucide-react";
import { getBlockedCharacters, getConversations, getOrCreateConversation, getFriends } from "@yinjie/contracts";
import { AppHeader, AppPage, AppSection, Button, ErrorBlock, InlineNotice, LoadingBlock } from "@yinjie/ui";
import { AvatarChip } from "../components/avatar-chip";
import { EmptyState } from "../components/empty-state";
import { formatTimestamp } from "../lib/format";
import { useAppRuntimeConfig } from "../runtime/runtime-config-store";
import { useSessionStore } from "../store/session-store";

export function ChatListPage() {
  const navigate = useNavigate();
  const userId = useSessionStore((state) => state.userId);
  const runtimeConfig = useAppRuntimeConfig();
  const baseUrl = runtimeConfig.apiBaseUrl ?? "default";

  const conversationsQuery = useQuery({
    queryKey: ["app-conversations", baseUrl, userId],
    queryFn: () => getConversations(userId!),
    enabled: Boolean(userId),
  });

  const friendsQuery = useQuery({
    queryKey: ["app-friends-quick-start", baseUrl, userId],
    queryFn: () => getFriends(userId!),
    enabled: Boolean(userId),
  });
  const blockedQuery = useQuery({
    queryKey: ["app-chat-blocked-characters", baseUrl, userId],
    queryFn: () => getBlockedCharacters(userId!),
    enabled: Boolean(userId),
  });

  const startChatMutation = useMutation({
    mutationFn: async (characterId: string) => {
      if (!userId) {
        return;
      }
      return getOrCreateConversation({ userId, characterId });
    },
    onSuccess: (conversation) => {
      if (!conversation) {
        return;
      }
      navigate({ to: "/chat/$conversationId", params: { conversationId: conversation.id } });
    },
  });

  const blockedCharacterIds = new Set((blockedQuery.data ?? []).map((item) => item.characterId));
  const items = (conversationsQuery.data ?? []).filter(
    (conversation) => conversation.type !== "direct" || !conversation.participants.some((id) => blockedCharacterIds.has(id)),
  );
  const quickStart = (friendsQuery.data ?? [])
    .filter(({ character }) => !blockedCharacterIds.has(character.id))
    .slice(0, 3);
  const pendingCharacterId = startChatMutation.isPending ? startChatMutation.variables : null;

  useEffect(() => {
    startChatMutation.reset();
  }, [baseUrl, userId]);

  return (
    <AppPage>
      <AppHeader
        eyebrow="消息入口"
        title="有人会在这里等你"
        description="聊天、主动消息、协作升级群聊，都会沿着同一条会话流继续发生。"
        actions={
          <Link to="/friend-requests">
            <Button variant="secondary" className="rounded-full">
              查看新的朋友
              <ChevronRight size={16} />
            </Button>
          </Link>
        }
      />

      {quickStart.length > 0 ? (
        <AppSection className="space-y-4">
          <div>
            <div className="text-sm font-medium text-white">快速开始</div>
            <div className="mt-1 text-xs leading-6 text-[color:var(--text-muted)]">从最近认识的人里，直接打开一段新的对话。</div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {quickStart.map(({ character }) => (
              <button
                key={character.id}
                type="button"
                onClick={() => startChatMutation.mutate(character.id)}
                disabled={startChatMutation.isPending}
                className="rounded-[26px] border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.075),rgba(255,255,255,0.04))] p-3 text-left shadow-[var(--shadow-soft)] transition-[background-color,box-shadow,transform] duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.095),rgba(255,255,255,0.06))] hover:shadow-[var(--shadow-card)] disabled:opacity-60"
              >
                <AvatarChip name={character.name} src={character.avatar} />
                <div className="mt-3 line-clamp-1 text-sm font-medium text-white">{character.name}</div>
                <div className="mt-1 line-clamp-1 text-[11px] text-[color:var(--text-muted)]">
                  {pendingCharacterId === character.id ? "正在发起会话..." : character.relationship}
                </div>
              </button>
            ))}
          </div>
        </AppSection>
      ) : null}

      <AppSection className="space-y-4">
        <div>
          <div className="text-sm font-medium text-white">最近会话</div>
          <div className="mt-1 text-xs leading-6 text-[color:var(--text-muted)]">直接聊天和升级后的协作群聊都会沿着同一条流继续更新。</div>
        </div>
        {conversationsQuery.isLoading ? (
          <LoadingBlock label="正在读取会话列表..." />
        ) : null}

        {!conversationsQuery.isLoading && !conversationsQuery.isError && items.length > 0 ? (
          items.map((conversation) => (
            <Link
              key={conversation.id}
              to="/chat/$conversationId"
              params={{ conversationId: conversation.id }}
              className="flex items-center gap-3 rounded-[26px] border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.035))] px-4 py-4 shadow-[var(--shadow-soft)] transition-[background-color,box-shadow,transform] duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.05))] hover:shadow-[var(--shadow-card)]"
            >
              <AvatarChip name={conversation.title} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="truncate text-sm font-medium text-white">{conversation.title}</div>
                  <div className="text-[11px] text-[color:var(--text-muted)]">
                    {formatTimestamp(conversation.lastMessage?.createdAt ?? conversation.updatedAt)}
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <div className="truncate text-sm text-[color:var(--text-secondary)]">
                    {conversation.lastMessage?.text ?? "还没有消息"}
                  </div>
                  {conversation.unreadCount > 0 ? (
                    <div className="min-w-6 rounded-full bg-[linear-gradient(135deg,rgba(249,115,22,0.98),rgba(251,191,36,0.92))] px-2 py-0.5 text-center text-[11px] text-white shadow-[var(--shadow-soft)]">
                      {conversation.unreadCount}
                    </div>
                  ) : null}
                </div>
              </div>
            </Link>
          ))
        ) : !conversationsQuery.isLoading ? (
          <EmptyState
            title="还没有会话"
            description={
              conversationsQuery.error instanceof Error
                ? conversationsQuery.error.message
                : "先去通讯录认识一些人，或到发现页试试摇一摇。"
            }
            action={
              <Link
                to="/tabs/contacts"
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.11),rgba(255,255,255,0.05))] px-4 py-2 text-sm text-white shadow-[var(--shadow-soft)]"
              >
                <MessagesSquare size={16} />
                去通讯录
              </Link>
            }
          />
        ) : null}
        {!conversationsQuery.isLoading && items.length > 0 ? (
          <InlineNotice tone="muted">
            当前会话会按最后一次互动顺序继续延展。
          </InlineNotice>
        ) : null}
        {friendsQuery.isLoading ? <LoadingBlock className="px-4 py-3 text-left" label="正在准备快速开始列表..." /> : null}
        {friendsQuery.isError && friendsQuery.error instanceof Error ? (
          <ErrorBlock message={`快速开始列表加载失败：${friendsQuery.error.message}`} />
        ) : null}
        {startChatMutation.isError && startChatMutation.error instanceof Error ? (
          <ErrorBlock message={startChatMutation.error.message} />
        ) : null}
      </AppSection>
    </AppPage>
  );
}
