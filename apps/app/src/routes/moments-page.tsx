import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, Pencil } from "lucide-react";
import { addMomentComment, createUserMoment, getBlockedCharacters, getMoments, toggleMomentLike } from "@yinjie/contracts";
import { AppHeader, AppPage, AppSection, Button, ErrorBlock, InlineNotice, LoadingBlock, TextAreaField, TextField } from "@yinjie/ui";
import { AvatarChip } from "../components/avatar-chip";
import { EmptyState } from "../components/empty-state";
import { MomentPostCard } from "../components/moment-post-card";
import { SocialPostCard } from "../components/social-post-card";
import { useDesktopLayout } from "../features/shell/use-desktop-layout";
import { formatTimestamp } from "../lib/format";
import { useAppRuntimeConfig } from "../runtime/runtime-config-store";
import { useWorldOwnerStore } from "../store/world-owner-store";

export function MomentsPage() {
  const isDesktopLayout = useDesktopLayout();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const queryClient = useQueryClient();
  const ownerId = useWorldOwnerStore((state) => state.id);
  const runtimeConfig = useAppRuntimeConfig();
  const baseUrl = runtimeConfig.apiBaseUrl;
  const ownerUsername = useWorldOwnerStore((state) => state.username);
  const ownerAvatar = useWorldOwnerStore((state) => state.avatar);
  const [text, setText] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [successNotice, setSuccessNotice] = useState("");
  const [showCompose, setShowCompose] = useState(false);

  const momentsQuery = useQuery({
    queryKey: ["app-moments", baseUrl],
    queryFn: () => getMoments(baseUrl),
  });
  const blockedQuery = useQuery({
    queryKey: ["app-moments-blocked-characters", baseUrl],
    queryFn: () => getBlockedCharacters(baseUrl),
    enabled: Boolean(ownerId),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createUserMoment({
        text: text.trim(),
      }, baseUrl),
    onSuccess: async () => {
      setText("");
      setShowCompose(false);
      setSuccessNotice("朋友圈已发布。");
      await queryClient.invalidateQueries({ queryKey: ["app-moments", baseUrl] });
    },
  });

  const likeMutation = useMutation({
    mutationFn: (momentId: string) =>
      toggleMomentLike(momentId, baseUrl),
    onSuccess: async () => {
      setSuccessNotice("朋友圈互动已更新。");
      await queryClient.invalidateQueries({ queryKey: ["app-moments", baseUrl] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (momentId: string) =>
      addMomentComment(momentId, {
        text: commentDrafts[momentId].trim(),
      }, baseUrl),
    onSuccess: async (_, momentId) => {
      setCommentDrafts((current) => ({ ...current, [momentId]: "" }));
      setSuccessNotice("朋友圈互动已更新。");
      await queryClient.invalidateQueries({ queryKey: ["app-moments", baseUrl] });
    },
  });
  const pendingLikeMomentId = likeMutation.isPending ? likeMutation.variables : null;
  const pendingCommentMomentId = commentMutation.isPending ? commentMutation.variables : null;
  const blockedCharacterIds = new Set((blockedQuery.data ?? []).map((item) => item.characterId));
  const visibleMoments = (momentsQuery.data ?? []).filter(
    (moment) => moment.authorType !== "character" || !blockedCharacterIds.has(moment.authorId),
  );
  const isDiscoverSubPage = pathname === "/discover/moments";

  useEffect(() => {
    setText("");
    setCommentDrafts({});
    setSuccessNotice("");
    setShowCompose(false);
  }, [baseUrl]);

  useEffect(() => {
    if (!successNotice) {
      return;
    }

    const timer = window.setTimeout(() => setSuccessNotice(""), 2400);
    return () => window.clearTimeout(timer);
  }, [successNotice]);

  if (isDesktopLayout) {
    return (
      <AppPage className="space-y-5 px-6 py-6">
        <AppHeader eyebrow="朋友圈" title="把这一刻留在桌面视野里" description="发布入口固定在左侧，动态流在右侧保持连续滚动，更适合桌面端的阅读节奏。" />
        <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
          <AppSection className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <div>
              <div className="text-sm font-medium text-[color:var(--text-primary)]">发一条朋友圈</div>
              <div className="mt-1 text-xs leading-6 text-[color:var(--text-muted)]">桌面端把发布区单独留下，方便边看边写。</div>
            </div>
            <TextAreaField
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="这一刻的想法..."
              className="min-h-40 resize-none"
            />
            <Button
              disabled={!text.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              variant="primary"
            >
              {createMutation.isPending ? "正在发布..." : "发布"}
            </Button>
            {createMutation.isError && createMutation.error instanceof Error ? <ErrorBlock message={createMutation.error.message} /> : null}
            <InlineNotice tone="muted">朋友圈更偏生活感内容，桌面端会保留更宽的正文阅读区域。</InlineNotice>
          </AppSection>

          <AppSection className="space-y-4">
            <div>
              <div className="text-sm font-medium text-[color:var(--text-primary)]">最近动态</div>
              <div className="mt-1 text-xs leading-6 text-[color:var(--text-muted)]">正文优先，互动控件退到辅助位置，不抢阅读注意力。</div>
            </div>
            {successNotice ? <InlineNotice tone="success">{successNotice}</InlineNotice> : null}
            {momentsQuery.isLoading ? <LoadingBlock label="正在读取朋友圈..." /> : null}
            {momentsQuery.isError && momentsQuery.error instanceof Error ? <ErrorBlock message={momentsQuery.error.message} /> : null}
            {visibleMoments.map((moment) => (
              <SocialPostCard
                key={moment.id}
                authorName={moment.authorName}
                authorAvatar={moment.authorAvatar}
                meta={formatTimestamp(moment.postedAt)}
                body={moment.text}
                summary={`${moment.likeCount} 赞 · ${moment.commentCount} 评论`}
                actions={
                  <Button disabled={likeMutation.isPending} onClick={() => likeMutation.mutate(moment.id)} variant="secondary" size="sm">
                    {pendingLikeMomentId === moment.id ? "处理中..." : "点赞"}
                  </Button>
                }
                secondary={
                  moment.comments.length > 0 ? (
                    <div className="space-y-2 rounded-[22px] bg-[color:var(--surface-soft)] p-3">
                      {moment.comments.slice(-3).map((comment) => (
                        <div key={comment.id} className="text-xs leading-6 text-[color:var(--text-secondary)]">
                          <span className="text-[color:var(--text-primary)]">{comment.authorName}</span>
                          {`：${comment.text}`}
                        </div>
                      ))}
                    </div>
                  ) : null
                }
                composer={
                  <>
                    <TextField
                      value={commentDrafts[moment.id] ?? ""}
                      onChange={(event) =>
                        setCommentDrafts((current) => ({
                          ...current,
                          [moment.id]: event.target.value,
                        }))
                      }
                      placeholder="写评论..."
                      className="min-w-0 flex-1 rounded-full py-2 text-xs"
                    />
                    <Button
                      disabled={!(commentDrafts[moment.id] ?? "").trim() || commentMutation.isPending}
                      onClick={() => commentMutation.mutate(moment.id)}
                      variant="primary"
                      size="sm"
                    >
                      {pendingCommentMomentId === moment.id ? "发送中..." : "发送"}
                    </Button>
                  </>
                }
              />
            ))}
            {likeMutation.isError && likeMutation.error instanceof Error ? <ErrorBlock message={likeMutation.error.message} /> : null}
            {commentMutation.isError && commentMutation.error instanceof Error ? <ErrorBlock message={commentMutation.error.message} /> : null}
            {!momentsQuery.isLoading && !momentsQuery.isError && !visibleMoments.length ? (
              <EmptyState title="朋友圈还很安静" description="你先发一条，或者等世界里的其他人先开口。" />
            ) : null}
          </AppSection>
        </div>
      </AppPage>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#f7f7f7]">
      {/* Sticky nav bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[rgba(0,0,0,0.08)] bg-white/95 px-4 py-3 backdrop-blur-sm">
        {isDiscoverSubPage ? (
          <button
            type="button"
            onClick={() => navigate({ to: "/tabs/discover" })}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--text-primary)] transition-colors hover:bg-[rgba(0,0,0,0.05)]"
          >
            <ChevronLeft size={22} />
          </button>
        ) : (
          <div className="w-9" />
        )}
        <span className="text-[17px] font-semibold text-[color:var(--text-primary)]">朋友圈</span>
        <button
          type="button"
          onClick={() => setShowCompose(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--text-primary)] transition-colors hover:bg-[rgba(0,0,0,0.05)]"
        >
          <Pencil size={20} />
        </button>
      </div>

      {/* Cover photo area */}
      <div className="relative h-[190px] overflow-hidden bg-[linear-gradient(160deg,rgba(251,191,36,0.92),rgba(249,115,22,0.88),rgba(16,185,129,0.70))]">
        <div className="absolute inset-0 bg-[rgba(0,0,0,0.12)]" />
        <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
          <span className="text-[13px] font-medium text-white drop-shadow-sm">
            {ownerUsername ?? "我"}
          </span>
          <AvatarChip name={ownerUsername} src={ownerAvatar || null} size="lg" />
        </div>
      </div>

      {/* Feed */}
      <div className="mt-2 bg-white">
        {successNotice ? (
          <div className="px-4 pt-3">
            <InlineNotice tone="success">{successNotice}</InlineNotice>
          </div>
        ) : null}

        {momentsQuery.isLoading ? (
          <div className="py-8">
            <LoadingBlock label="正在读取朋友圈..." />
          </div>
        ) : null}

        {momentsQuery.isError && momentsQuery.error instanceof Error ? (
          <div className="px-4 py-4">
            <ErrorBlock message={momentsQuery.error.message} />
          </div>
        ) : null}

        {likeMutation.isError && likeMutation.error instanceof Error ? (
          <div className="px-4 py-2">
            <ErrorBlock message={likeMutation.error.message} />
          </div>
        ) : null}

        {commentMutation.isError && commentMutation.error instanceof Error ? (
          <div className="px-4 py-2">
            <ErrorBlock message={commentMutation.error.message} />
          </div>
        ) : null}

        {visibleMoments.map((moment) => (
          <MomentPostCard
            key={moment.id}
            authorName={moment.authorName}
            authorAvatar={moment.authorAvatar}
            text={moment.text}
            location={moment.location}
            postedAt={moment.postedAt}
            likes={moment.likes}
            comments={moment.comments}
            onLike={() => likeMutation.mutate(moment.id)}
            likeLoading={pendingLikeMomentId === moment.id}
            commentDraft={commentDrafts[moment.id] ?? ""}
            onCommentChange={(v) =>
              setCommentDrafts((current) => ({ ...current, [moment.id]: v }))
            }
            onCommentSubmit={() => commentMutation.mutate(moment.id)}
            commentLoading={pendingCommentMomentId === moment.id}
          />
        ))}

        {!momentsQuery.isLoading && !momentsQuery.isError && !visibleMoments.length ? (
          <div className="px-4 py-8">
            <EmptyState title="朋友圈还很安静" description="你先发一条，或者等世界里的其他人先开口。" />
          </div>
        ) : null}
      </div>

      {/* Compose overlay */}
      {showCompose ? (
        <div
          className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.45)]"
          onClick={() => setShowCompose(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-[20px] bg-white px-5 pb-10 pt-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowCompose(false)}
                className="text-[15px] text-[color:var(--text-muted)]"
              >
                取消
              </button>
              <span className="text-[16px] font-semibold text-[color:var(--text-primary)]">发朋友圈</span>
              <Button
                disabled={!text.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
                variant="primary"
                size="sm"
              >
                {createMutation.isPending ? "发布中..." : "发布"}
              </Button>
            </div>
            <TextAreaField
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="这一刻的想法..."
              className="min-h-[120px] resize-none"
              autoFocus
            />
            {createMutation.isError && createMutation.error instanceof Error ? (
              <div className="mt-3">
                <ErrorBlock message={createMutation.error.message} />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
