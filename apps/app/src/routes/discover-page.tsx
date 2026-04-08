import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addFeedComment,
  createFeedPost,
  getFeed,
  likeFeedPost,
  sendFriendRequest,
  shake,
  triggerSceneFriendRequest,
} from "@yinjie/contracts";
import {
  AppHeader,
  AppPage,
  AppSection,
  Button,
  ErrorBlock,
  InlineNotice,
  LoadingBlock,
  TextAreaField,
  TextField,
} from "@yinjie/ui";
import { EmptyState } from "../components/empty-state";
import { SocialPostCard } from "../components/social-post-card";
import { useAppRuntimeConfig } from "../runtime/runtime-config-store";

const scenes = [
  { id: "coffee_shop", label: "咖啡馆" },
  { id: "gym", label: "健身房" },
  { id: "library", label: "图书馆" },
  { id: "park", label: "公园" },
];

export function DiscoverPage() {
  const queryClient = useQueryClient();
  const runtimeConfig = useAppRuntimeConfig();
  const baseUrl = runtimeConfig.apiBaseUrl ?? "default";
  const [text, setText] = useState("");
  const [shakeMessage, setShakeMessage] = useState("");
  const [sceneMessage, setSceneMessage] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [successNotice, setSuccessNotice] = useState("");

  const feedQuery = useQuery({
    queryKey: ["app-feed", baseUrl],
    queryFn: () => getFeed(1, 20, baseUrl),
  });

  const createPostMutation = useMutation({
    mutationFn: () => createFeedPost({ text: text.trim() }, baseUrl),
    onSuccess: async () => {
      setText("");
      setSuccessNotice("发现页动态已发布。");
      await queryClient.invalidateQueries({ queryKey: ["app-feed", baseUrl] });
    },
  });

  const shakeMutation = useMutation({
    mutationFn: async () => {
      const result = await shake(baseUrl);
      if (!result) {
        return null;
      }

      await sendFriendRequest(
        {
          characterId: result.character.id,
          greeting: result.greeting,
        },
        baseUrl,
      );

      return result;
    },
    onSuccess: (result) => {
      if (!result) {
        setShakeMessage("附近暂时没有新的相遇。");
        return;
      }

      setSuccessNotice("新的好友请求已发送。");
      setShakeMessage(`${result.character.name} 向你发来了一句问候：${result.greeting}`);
      void queryClient.invalidateQueries({ queryKey: ["app-friend-requests", baseUrl] });
    },
  });

  const sceneMutation = useMutation({
    mutationFn: async (scene: string) => {
      const request = await triggerSceneFriendRequest({ scene }, baseUrl);
      return { request, scene };
    },
    onSuccess: ({ request, scene }) => {
      const sceneLabel = scenes.find((item) => item.id === scene)?.label ?? scene;

      if (!request) {
        setSceneMessage(`${sceneLabel} 里暂时没有新的相遇。`);
        return;
      }

      setSuccessNotice("场景相遇已写入好友请求列表。");
      setSceneMessage(
        `${request.characterName} 在${sceneLabel}里注意到了你：${request.greeting ?? "想和你认识一下。"}`
      );
      void queryClient.invalidateQueries({ queryKey: ["app-friend-requests", baseUrl] });
    },
  });

  const likeMutation = useMutation({
    mutationFn: (postId: string) => likeFeedPost(postId, baseUrl),
    onSuccess: async () => {
      setSuccessNotice("发现页互动已更新。");
      await queryClient.invalidateQueries({ queryKey: ["app-feed", baseUrl] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (postId: string) =>
      addFeedComment(
        postId,
        {
          text: commentDrafts[postId].trim(),
        },
        baseUrl,
      ),
    onSuccess: async (_, postId) => {
      setCommentDrafts((current) => ({ ...current, [postId]: "" }));
      setSuccessNotice("发现页互动已更新。");
      await queryClient.invalidateQueries({ queryKey: ["app-feed", baseUrl] });
    },
  });

  useEffect(() => {
    setText("");
    setShakeMessage("");
    setSceneMessage("");
    setCommentDrafts({});
    setSuccessNotice("");
  }, [baseUrl]);

  useEffect(() => {
    if (!successNotice) {
      return;
    }

    const timer = window.setTimeout(() => setSuccessNotice(""), 2400);
    return () => window.clearTimeout(timer);
  }, [successNotice]);

  const pendingLikePostId = likeMutation.isPending ? likeMutation.variables : null;
  const pendingCommentPostId = commentMutation.isPending ? commentMutation.variables : null;
  const visiblePosts = feedQuery.data?.posts ?? [];

  return (
    <AppPage>
      <AppHeader
        eyebrow="发现"
        title="试着摇一摇"
        description="这个世界不会把所有人直接摆在你面前，相遇需要一点偶然。"
      />

      <AppSection className="space-y-4 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(249,115,22,0.16),rgba(255,255,255,0.035))]">
        <div>
          <div className="text-sm font-medium text-white">随机相遇</div>
          <div className="mt-1 text-xs leading-6 text-[color:var(--text-muted)]">
            轻轻推动世界一次，看看今天会从哪里有人靠近你。
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => shakeMutation.mutate()} disabled={shakeMutation.isPending} variant="primary">
            {shakeMutation.isPending ? "正在寻找..." : "摇一摇"}
          </Button>
          <div className="text-xs text-[color:var(--text-muted)]">随机相遇会从不同场景里发生。</div>
        </div>
        {shakeMessage ? <InlineNotice className="mt-3" tone="success">{shakeMessage}</InlineNotice> : null}
        {shakeMutation.isError && shakeMutation.error instanceof Error ? (
          <ErrorBlock className="mt-3" message={shakeMutation.error.message} />
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {scenes.map((scene) => (
            <Button
              key={scene.id}
              onClick={() => sceneMutation.mutate(scene.id)}
              disabled={sceneMutation.isPending}
              variant="secondary"
              size="sm"
            >
              {sceneMutation.isPending && sceneMutation.variables === scene.id
                ? `正在前往${scene.label}...`
                : scene.label}
            </Button>
          ))}
        </div>
        {sceneMessage ? <InlineNotice className="mt-3" tone="info">{sceneMessage}</InlineNotice> : null}
        {sceneMutation.isError && sceneMutation.error instanceof Error ? (
          <ErrorBlock className="mt-3" message={sceneMutation.error.message} />
        ) : null}
      </AppSection>

      <AppSection className="space-y-4">
        <div>
          <div className="text-sm font-medium text-white">发一条发现页动态</div>
          <div className="mt-1 text-xs leading-6 text-[color:var(--text-muted)]">
            这里更像公共广场，内容会等待熟人和角色来回应。
          </div>
        </div>
        <TextAreaField
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="分享你的想法..."
          className="min-h-28 resize-none"
        />
        <Button
          disabled={!text.trim() || createPostMutation.isPending}
          onClick={() => createPostMutation.mutate()}
          variant="primary"
        >
          {createPostMutation.isPending ? "正在发布..." : "发布"}
        </Button>
        {createPostMutation.isError && createPostMutation.error instanceof Error ? (
          <ErrorBlock message={createPostMutation.error.message} />
        ) : null}
      </AppSection>

      <AppSection className="space-y-4">
        <div>
          <div className="text-sm font-medium text-white">广场动态</div>
          <div className="mt-1 text-xs leading-6 text-[color:var(--text-muted)]">
            先看内容，再做互动，避免控件把注意力从正文上抢走。
          </div>
        </div>
        {successNotice ? <InlineNotice tone="success">{successNotice}</InlineNotice> : null}
        {feedQuery.isLoading ? <LoadingBlock label="正在读取发现页动态..." /> : null}
        {feedQuery.isError && feedQuery.error instanceof Error ? <ErrorBlock message={feedQuery.error.message} /> : null}

        {visiblePosts.map((post) => (
          <SocialPostCard
            key={post.id}
            authorName={post.authorName}
            authorAvatar={post.authorAvatar}
            meta={post.aiReacted ? "AI 已响应" : "等待 AI 互动"}
            body={post.text}
            summary={`${post.likeCount} 赞 · ${post.commentCount} 评论`}
            actions={
              <Button
                disabled={likeMutation.isPending}
                onClick={() => likeMutation.mutate(post.id)}
                variant="secondary"
                size="sm"
              >
                {pendingLikePostId === post.id ? "处理中..." : "点赞"}
              </Button>
            }
            composer={
              <>
                <TextField
                  value={commentDrafts[post.id] ?? ""}
                  onChange={(event) =>
                    setCommentDrafts((current) => ({
                      ...current,
                      [post.id]: event.target.value,
                    }))
                  }
                  placeholder="写评论..."
                  className="min-w-0 flex-1 rounded-full py-2 text-xs"
                />
                <Button
                  disabled={!(commentDrafts[post.id] ?? "").trim() || commentMutation.isPending}
                  onClick={() => commentMutation.mutate(post.id)}
                  variant="primary"
                  size="sm"
                >
                  {pendingCommentPostId === post.id ? "发送中..." : "发送"}
                </Button>
              </>
            }
          />
        ))}

        {likeMutation.isError && likeMutation.error instanceof Error ? <ErrorBlock message={likeMutation.error.message} /> : null}
        {commentMutation.isError && commentMutation.error instanceof Error ? <ErrorBlock message={commentMutation.error.message} /> : null}

        {!feedQuery.isLoading && !feedQuery.isError && !visiblePosts.length ? (
          <EmptyState title="发现页还没有新动态" description="你先发一条，或者再摇一摇看看会遇到谁。" />
        ) : null}
      </AppSection>
    </AppPage>
  );
}
