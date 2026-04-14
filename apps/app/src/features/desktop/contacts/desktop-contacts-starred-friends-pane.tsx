import { useEffect, useMemo, useState } from "react";
import { Search, Star } from "lucide-react";
import type { FriendListItem } from "@yinjie/contracts";
import { ErrorBlock, InlineNotice, LoadingBlock, cn } from "@yinjie/ui";
import { AvatarChip } from "../../../components/avatar-chip";
import { EmptyState } from "../../../components/empty-state";
import { ContactDetailPane } from "../../contacts/contact-detail-pane";
import {
  getFriendDisplayName,
  matchesFriendSearch,
} from "../../contacts/contact-utils";

type DesktopContactsStarredFriendsPaneProps = {
  friends: FriendListItem[];
  selectedCharacterId: string | null;
  loading: boolean;
  error?: string | null;
  actionError?: string | null;
  notice?: string | null;
  startChatPendingId?: string | null;
  starPendingId?: string | null;
  onSelectCharacter: (characterId: string | null) => void;
  onStartChat: (characterId: string) => void;
  onToggleStarred: (characterId: string, starred: boolean) => void;
  onOpenProfile: (characterId: string) => void;
  onOpenMoments: (characterId: string) => void;
};

export function DesktopContactsStarredFriendsPane({
  friends,
  selectedCharacterId,
  loading,
  error = null,
  actionError = null,
  notice = null,
  startChatPendingId = null,
  starPendingId = null,
  onSelectCharacter,
  onStartChat,
  onToggleStarred,
  onOpenProfile,
  onOpenMoments,
}: DesktopContactsStarredFriendsPaneProps) {
  const [searchText, setSearchText] = useState("");
  const normalizedSearchText = searchText.trim().toLowerCase();
  const filteredFriends = useMemo(() => {
    if (!normalizedSearchText) {
      return friends;
    }

    return friends.filter((item) =>
      matchesFriendSearch(item, normalizedSearchText),
    );
  }, [friends, normalizedSearchText]);
  const selectedFriend =
    filteredFriends.find((item) => item.character.id === selectedCharacterId) ??
    friends.find((item) => item.character.id === selectedCharacterId) ??
    null;

  useEffect(() => {
    if (
      selectedCharacterId &&
      filteredFriends.some((item) => item.character.id === selectedCharacterId)
    ) {
      return;
    }

    onSelectCharacter(filteredFriends[0]?.character.id ?? null);
  }, [filteredFriends, onSelectCharacter, selectedCharacterId]);

  return (
    <div className="flex h-full min-h-0">
      <section className="flex w-[320px] shrink-0 flex-col border-r border-[color:var(--border-faint)] bg-[rgba(247,250,250,0.88)]">
        <div className="border-b border-[color:var(--border-faint)] bg-white/78 px-4 py-4 backdrop-blur-xl">
          <div className="text-base font-medium text-[color:var(--text-primary)]">
            星标朋友
          </div>
          <div className="mt-1 text-xs text-[color:var(--text-muted)]">
            {friends.length} 位联系人
          </div>

          <label className="mt-3 flex items-center gap-2 rounded-[16px] border border-[color:var(--border-faint)] bg-white px-3 py-2.5 text-sm text-[color:var(--text-dim)] shadow-none">
            <Search size={15} className="shrink-0" />
            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="搜索星标朋友"
              className="min-w-0 flex-1 bg-transparent text-sm text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-dim)]"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-[rgba(242,246,245,0.76)] pb-4">
          {notice ? (
            <div className="px-3 pt-3">
              <InlineNotice tone="success">{notice}</InlineNotice>
            </div>
          ) : null}

          {actionError ? (
            <div className="px-3 pt-3">
              <ErrorBlock message={actionError} />
            </div>
          ) : null}

          {loading ? (
            <LoadingBlock
              className="px-4 py-6 text-left"
              label="正在读取星标朋友..."
            />
          ) : error ? (
            <div className="px-3 pt-3">
              <ErrorBlock message={error} />
            </div>
          ) : !filteredFriends.length ? (
            <div className="px-3 pt-3">
              <EmptyState
                title={
                  normalizedSearchText
                    ? "没有找到匹配的星标朋友"
                    : "还没有星标朋友"
                }
                description={
                  normalizedSearchText
                    ? "换个关键词再试试。"
                    : "去联系人资料页把常联系的好友设为星标朋友。"
                }
              />
            </div>
          ) : (
            <section className="mx-3 mt-3 overflow-hidden rounded-[18px] border border-[color:var(--border-faint)] bg-white shadow-[var(--shadow-section)]">
              {filteredFriends.map((item, index) => (
                <button
                  key={item.character.id}
                  type="button"
                  onClick={() => onSelectCharacter(item.character.id)}
                  onDoubleClick={() => onStartChat(item.character.id)}
                  className={cn(
                    "flex w-full items-center gap-3 bg-white px-4 py-3.5 text-left transition-colors hover:bg-[color:var(--surface-console)]",
                    index > 0
                      ? "border-t border-[color:var(--border-faint)]"
                      : undefined,
                    selectedCharacterId === item.character.id
                      ? "bg-[rgba(7,193,96,0.07)] shadow-[inset_3px_0_0_0_var(--brand-primary)]"
                      : undefined,
                  )}
                >
                  <AvatarChip
                    name={getFriendDisplayName(item)}
                    src={item.character.avatar}
                    size="wechat"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[16px] text-[color:var(--text-primary)]">
                      {getFriendDisplayName(item)}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-[color:var(--text-muted)]">
                      {startChatPendingId === item.character.id
                        ? "正在打开会话..."
                        : getFriendDisplayName(item) !== item.character.name
                          ? `昵称：${item.character.name}`
                          : item.character.currentStatus?.trim() ||
                            item.character.relationship ||
                            "保持联系"}
                    </div>
                  </div>
                  <Star
                    size={16}
                    className="shrink-0 text-[#d4a72c]"
                    fill="currentColor"
                  />
                </button>
              ))}
            </section>
          )}
        </div>
      </section>

      <section className="min-w-0 flex-1">
        <ContactDetailPane
          character={selectedFriend?.character ?? null}
          friendship={selectedFriend?.friendship ?? null}
          onStartChat={
            selectedFriend
              ? () => onStartChat(selectedFriend.character.id)
              : undefined
          }
          chatPending={startChatPendingId === selectedFriend?.character.id}
          isStarred={selectedFriend?.friendship.isStarred ?? false}
          starPending={starPendingId === selectedFriend?.character.id}
          onToggleStarred={
            selectedFriend
              ? () =>
                  onToggleStarred(
                    selectedFriend.character.id,
                    !selectedFriend.friendship.isStarred,
                  )
              : undefined
          }
          onOpenProfile={() => {
            if (!selectedFriend) {
              return;
            }

            onOpenProfile(selectedFriend.character.id);
          }}
          onOpenMoments={
            selectedFriend
              ? () => {
                  onOpenMoments(selectedFriend.character.id);
                }
              : undefined
          }
        />
      </section>
    </div>
  );
}
