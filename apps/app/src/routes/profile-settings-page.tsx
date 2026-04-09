import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import {
  clearWorldOwnerApiKey,
  getWorldOwner,
  setWorldOwnerApiKey,
  updateWorldOwner,
} from "@yinjie/contracts";
import {
  AppPage,
  AppSection,
  Button,
  ErrorBlock,
  InlineNotice,
  LoadingBlock,
  TextAreaField,
  TextField,
  cn,
} from "@yinjie/ui";
import { TabPageTopBar } from "../components/tab-page-top-bar";
import { useAppRuntimeConfig } from "../runtime/runtime-config-store";
import { useWorldOwnerStore } from "../store/world-owner-store";

type SettingsTab = "profile" | "ai" | "legal";
type LegalTab = "privacy" | "terms" | "community";

export function ProfileSettingsPage() {
  const navigate = useNavigate();
  const runtimeConfig = useAppRuntimeConfig();
  const baseUrl = runtimeConfig.apiBaseUrl;
  const username = useWorldOwnerStore((state) => state.username);
  const signature = useWorldOwnerStore((state) => state.signature);
  const updateOwnerStore = useWorldOwnerStore((state) => state.updateOwner);
  const hydrateOwner = useWorldOwnerStore((state) => state.hydrateOwner);

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [activeLegalTab, setActiveLegalTab] = useState<LegalTab>("privacy");

  const [draftName, setDraftName] = useState(username ?? "");
  const [draftSignature, setDraftSignature] = useState(signature);
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [apiBaseDraft, setApiBaseDraft] = useState("");

  useEffect(() => {
    setDraftName(username ?? "");
  }, [username]);

  useEffect(() => {
    setDraftSignature(signature);
  }, [signature]);

  const ownerQuery = useQuery({
    queryKey: ["world-owner", baseUrl],
    queryFn: () => getWorldOwner(baseUrl),
  });

  useEffect(() => {
    if (!ownerQuery.data) {
      return;
    }

    hydrateOwner(ownerQuery.data);
    setApiBaseDraft(ownerQuery.data.customApiBase ?? "");
  }, [hydrateOwner, ownerQuery.data]);

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      const owner = await updateWorldOwner(
        {
          username: draftName.trim(),
          signature: draftSignature.trim(),
        },
        baseUrl,
      );
      hydrateOwner(owner);
      updateOwnerStore({
        username: owner.username,
        signature: owner.signature,
      });
    },
  });

  const saveApiKeyMutation = useMutation({
    mutationFn: async () => {
      const owner = await setWorldOwnerApiKey(
        {
          apiKey: apiKeyDraft.trim(),
          apiBase: apiBaseDraft.trim() || undefined,
        },
        baseUrl,
      );
      hydrateOwner(owner);
    },
    onSuccess: () => {
      setApiKeyDraft("");
    },
  });

  const clearApiKeyMutation = useMutation({
    mutationFn: async () => {
      const owner = await clearWorldOwnerApiKey(baseUrl);
      hydrateOwner(owner);
      setApiKeyDraft("");
      setApiBaseDraft(owner.customApiBase ?? "");
    },
  });

  const canSaveProfile = draftName.trim().length > 0;
  const aiSettingsBusy = saveApiKeyMutation.isPending || clearApiKeyMutation.isPending;

  return (
    <AppPage className="space-y-4">
      <TabPageTopBar
        title="设置"
        titleAlign="center"
        leftActions={
          <Button
            onClick={() => navigate({ to: "/tabs/profile" })}
            variant="ghost"
            size="icon"
            className="border border-white/70 bg-white/82 text-[color:var(--text-primary)] shadow-[var(--shadow-soft)] hover:bg-white"
          >
            <ArrowLeft size={18} />
          </Button>
        }
      />

      {/* 主 Tab 切换 */}
      <div className="flex gap-1 rounded-[20px] bg-black/5 p-1">
        {(
          [
            { id: "profile", label: "个人资料" },
            { id: "ai", label: "AI 设置" },
            { id: "legal", label: "协议与规范" },
          ] as { id: SettingsTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 rounded-[16px] py-2 text-[13px] font-medium transition-all duration-[var(--motion-fast)]",
              activeTab === tab.id
                ? "bg-white text-[color:var(--text-primary)] shadow-sm"
                : "text-[color:var(--text-muted)]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 个人资料 Tab */}
      {activeTab === "profile" && (
        <AppSection className="space-y-4">
          <div className="space-y-3">
            <TextField
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="显示名称"
            />
            <TextAreaField
              value={draftSignature}
              onChange={(event) => setDraftSignature(event.target.value)}
              className="min-h-24 resize-none"
              placeholder="签名"
            />
          </div>

          <Button
            onClick={() => saveProfileMutation.mutate()}
            disabled={!canSaveProfile || saveProfileMutation.isPending}
            variant="primary"
          >
            {saveProfileMutation.isPending ? "保存中..." : "保存资料"}
          </Button>
          {saveProfileMutation.isError && saveProfileMutation.error instanceof Error ? (
            <ErrorBlock message={saveProfileMutation.error.message} />
          ) : null}
          {saveProfileMutation.isSuccess ? <InlineNotice tone="success">资料已更新。</InlineNotice> : null}
        </AppSection>
      )}

      {/* AI 设置 Tab */}
      {activeTab === "ai" && (
        <AppSection className="space-y-4">
          <div className="space-y-3">
            <TextField
              type="password"
              value={apiKeyDraft}
              onChange={(event) => setApiKeyDraft(event.target.value)}
              placeholder={
                ownerQuery.data?.hasCustomApiKey
                  ? "已保存专属 API Key，输入新的值可替换"
                  : "输入你的专属 API Key"
              }
            />
            <TextField
              value={apiBaseDraft}
              onChange={(event) => setApiBaseDraft(event.target.value)}
              placeholder="可选兼容 Base URL，例如 https://api.openai.com/v1"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => saveApiKeyMutation.mutate()}
              disabled={aiSettingsBusy || !apiKeyDraft.trim()}
              variant="primary"
            >
              {saveApiKeyMutation.isPending ? "保存中..." : "保存专属 API Key"}
            </Button>
            <Button
              onClick={() => clearApiKeyMutation.mutate()}
              disabled={aiSettingsBusy || !ownerQuery.data?.hasCustomApiKey}
              variant="secondary"
            >
              {clearApiKeyMutation.isPending ? "清除中..." : "清除专属 API Key"}
            </Button>
          </div>

          {ownerQuery.isLoading ? <LoadingBlock className="px-0 py-0 text-left" label="读取配置..." /> : null}
          {ownerQuery.isError && ownerQuery.error instanceof Error ? <ErrorBlock message={ownerQuery.error.message} /> : null}
          {saveApiKeyMutation.isError && saveApiKeyMutation.error instanceof Error ? (
            <ErrorBlock message={saveApiKeyMutation.error.message} />
          ) : null}
          {clearApiKeyMutation.isError && clearApiKeyMutation.error instanceof Error ? (
            <ErrorBlock message={clearApiKeyMutation.error.message} />
          ) : null}
          {saveApiKeyMutation.isSuccess ? <InlineNotice tone="success">专属 API Key 已保存。</InlineNotice> : null}
          {clearApiKeyMutation.isSuccess ? <InlineNotice tone="success">专属 API Key 已清除。</InlineNotice> : null}
          {ownerQuery.data ? (
            <InlineNotice tone={ownerQuery.data.hasCustomApiKey ? "success" : "muted"}>
              {ownerQuery.data.hasCustomApiKey
                ? `当前使用专属 API Key${ownerQuery.data.customApiBase ? `，Base URL：${ownerQuery.data.customApiBase}` : ""}。`
                : "当前使用实例级 Provider。"}
            </InlineNotice>
          ) : null}
        </AppSection>
      )}

      {/* 协议与规范 Tab */}
      {activeTab === "legal" && (
        <AppSection className="space-y-4">
          {/* 子 Tab */}
          <div className="flex gap-1 rounded-[16px] bg-black/5 p-1">
            {(
              [
                { id: "privacy", label: "隐私政策" },
                { id: "terms", label: "用户协议" },
                { id: "community", label: "社区规范" },
              ] as { id: LegalTab; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveLegalTab(tab.id)}
                className={cn(
                  "flex-1 rounded-[12px] py-1.5 text-[12px] font-medium transition-all duration-[var(--motion-fast)]",
                  activeLegalTab === tab.id
                    ? "bg-white text-[color:var(--text-primary)] shadow-sm"
                    : "text-[color:var(--text-muted)]",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeLegalTab === "privacy" && (
            <div className="space-y-3">
              <p className="text-sm leading-7 text-[color:var(--text-secondary)]">
                隐界会保存你的账号资料、聊天行为、动态内容和必要的运行日志，用于维持世界状态、会话同步和安全审计。
              </p>
              <p className="text-sm leading-7 text-[color:var(--text-secondary)]">
                远程模式下，数据会发送到 Core API 与推理网关；桌面自托管模式下，数据主要保存在本地运行目录。你可以在资料页退出会话、删除账号，并通过安全入口举报或屏蔽角色。
              </p>
            </div>
          )}

          {activeLegalTab === "terms" && (
            <div className="space-y-3">
              <p className="text-sm leading-7 text-[color:var(--text-secondary)]">
                你需要对自己发布的文字、评论、动态和举报内容负责，不得利用隐界发布违法、骚扰、仇恨、侵权或误导性内容。
              </p>
              <p className="text-sm leading-7 text-[color:var(--text-secondary)]">
                平台保留对违规内容做降级、限制互动、封禁角色关系和保留审计记录的权利。若你删除账号，当前会话会立即失效。
              </p>
            </div>
          )}

          {activeLegalTab === "community" && (
            <div className="space-y-3">
              <p className="text-sm leading-7 text-[color:var(--text-secondary)]">
                如果你遇到骚扰、不适、误导或越界内容，可以在角色详情页、聊天页和资料页发起举报，也可以直接屏蔽角色。
              </p>
              <p className="text-sm leading-7 text-[color:var(--text-secondary)]">
                屏蔽后，对应角色将不再出现在新的好友申请和发现路径中；举报会保留在安全记录里，供后续审核与处理。
              </p>
            </div>
          )}
        </AppSection>
      )}
    </AppPage>
  );
}
