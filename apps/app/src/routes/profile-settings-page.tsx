import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
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
import { DesktopUtilityShell } from "../features/desktop/desktop-utility-shell";
import { useDesktopLayout } from "../features/shell/use-desktop-layout";
import { useAppRuntimeConfig } from "../runtime/runtime-config-store";
import { useWorldOwnerStore } from "../store/world-owner-store";

type SettingsTab = "profile" | "ai" | "legal";
type LegalTab = "privacy" | "terms" | "community";

const settingsTabs: Array<{ id: SettingsTab; label: string }> = [
  { id: "profile", label: "个人资料" },
  { id: "ai", label: "AI 设置" },
  { id: "legal", label: "协议与规范" },
];

const legalTabs: Array<{ id: LegalTab; label: string }> = [
  { id: "privacy", label: "隐私政策" },
  { id: "terms", label: "用户协议" },
  { id: "community", label: "社区规范" },
];

export function ProfileSettingsPage() {
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isDesktopLayout = useDesktopLayout();
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
  const aiSettingsBusy =
    saveApiKeyMutation.isPending || clearApiKeyMutation.isPending;
  const desktopSettingsRoute = pathname.startsWith("/desktop/settings");
  const desktopMode = isDesktopLayout;
  const backTo = desktopMode ? "/tabs/chat" : "/tabs/profile";
  const desktopBackTo = desktopSettingsRoute ? "/tabs/chat" : "/tabs/profile";
  const desktopBackLabel = desktopSettingsRoute ? "返回消息" : "返回资料";

  const content = (
    <>
      {desktopMode ? null : (
        <div className="flex gap-1 rounded-[12px] border border-black/6 bg-[#f7f7f7] p-1">
          {settingsTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 rounded-[10px] py-2 text-[13px] font-medium transition-all duration-[var(--motion-fast)]",
                activeTab === tab.id
                  ? "bg-white text-[color:var(--text-primary)] shadow-sm"
                  : "text-[color:var(--text-muted)] hover:bg-white/70",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === "profile" ? (
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
          {saveProfileMutation.isError &&
          saveProfileMutation.error instanceof Error ? (
            <ErrorBlock message={saveProfileMutation.error.message} />
          ) : null}
          {saveProfileMutation.isSuccess ? (
            <InlineNotice tone="success">资料已更新。</InlineNotice>
          ) : null}
        </AppSection>
      ) : null}

      {activeTab === "ai" ? (
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

          {ownerQuery.isLoading ? (
            <LoadingBlock className="px-0 py-0 text-left" label="读取配置..." />
          ) : null}
          {ownerQuery.isError && ownerQuery.error instanceof Error ? (
            <ErrorBlock message={ownerQuery.error.message} />
          ) : null}
          {saveApiKeyMutation.isError &&
          saveApiKeyMutation.error instanceof Error ? (
            <ErrorBlock message={saveApiKeyMutation.error.message} />
          ) : null}
          {clearApiKeyMutation.isError &&
          clearApiKeyMutation.error instanceof Error ? (
            <ErrorBlock message={clearApiKeyMutation.error.message} />
          ) : null}
          {saveApiKeyMutation.isSuccess ? (
            <InlineNotice tone="success">专属 API Key 已保存。</InlineNotice>
          ) : null}
          {clearApiKeyMutation.isSuccess ? (
            <InlineNotice tone="success">专属 API Key 已清除。</InlineNotice>
          ) : null}
          {ownerQuery.data ? (
            <InlineNotice
              tone={ownerQuery.data.hasCustomApiKey ? "success" : "muted"}
            >
              {ownerQuery.data.hasCustomApiKey
                ? `当前使用专属 API Key${ownerQuery.data.customApiBase ? `，Base URL：${ownerQuery.data.customApiBase}` : ""}。`
                : "当前使用实例级 Provider。"}
            </InlineNotice>
          ) : null}
        </AppSection>
      ) : null}

      {activeTab === "legal" ? (
        <AppSection className="space-y-4">
          <div className="flex gap-1 rounded-[12px] border border-black/6 bg-[#f7f7f7] p-1">
            {legalTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveLegalTab(tab.id)}
                className={cn(
                  "flex-1 rounded-[10px] py-2 text-[12px] font-medium transition-all duration-[var(--motion-fast)]",
                  activeLegalTab === tab.id
                    ? "bg-white text-[color:var(--text-primary)] shadow-sm"
                    : "text-[color:var(--text-muted)] hover:bg-white/70",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <Button
              variant="secondary"
              onClick={() =>
                void navigate({
                  to:
                    activeLegalTab === "privacy"
                      ? "/legal/privacy"
                      : activeLegalTab === "terms"
                        ? "/legal/terms"
                        : "/legal/community",
                })
              }
            >
              打开当前文档
            </Button>
            <InlineNotice tone="muted">
              {activeLegalTab === "privacy"
                ? "查看世界隐私政策和数据使用说明。"
                : activeLegalTab === "terms"
                  ? "查看世界服务使用协议。"
                  : "查看世界社区规范和反馈口径。"}
            </InlineNotice>
          </div>
        </AppSection>
      ) : null}
    </>
  );

  if (desktopMode) {
    return (
      <DesktopUtilityShell
        title={desktopSettingsRoute ? "设置" : "资料与设置"}
        subtitle={
          activeTab === "profile"
            ? "在桌面工作区里管理世界主人的资料与签名。"
            : activeTab === "ai"
              ? "管理专属 API Key 和兼容 Base URL。"
              : "查看当前世界相关的协议和社区规范。"
        }
        toolbar={
          <Button
            onClick={() => navigate({ to: desktopBackTo })}
            variant="secondary"
            className="rounded-[10px] border-[color:var(--border-faint)] bg-white shadow-none hover:bg-[#f5f7f7]"
          >
            {desktopBackLabel}
          </Button>
        }
        sidebar={
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-[color:var(--border-faint)] px-4 py-4">
              <div className="text-sm font-medium text-[color:var(--text-primary)]">
                设置分类
              </div>
              <div className="mt-1 text-xs text-[color:var(--text-muted)]">
                桌面端把资料、AI 配置和协议查看收口到同一个工作区。
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3">
              <div className="space-y-1">
                {settingsTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-[12px] px-3 py-2.5 text-left text-sm transition",
                      activeTab === tab.id
                        ? "bg-[rgba(7,193,96,0.10)] text-[color:var(--text-primary)]"
                        : "text-[color:var(--text-secondary)] hover:bg-white/80 hover:text-[color:var(--text-primary)]",
                    )}
                  >
                    <span>{tab.label}</span>
                    {activeTab === tab.id ? (
                      <span className="h-2 w-2 rounded-full bg-[color:var(--brand-primary)]" />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          </div>
        }
        aside={
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-[color:var(--border-faint)] px-5 py-4">
              <div className="text-sm font-medium text-[color:var(--text-primary)]">
                当前状态
              </div>
              <div className="mt-1 text-xs text-[color:var(--text-muted)]">
                右侧显示世界主人信息和当前配置摘要。
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-5">
              <div className="space-y-3">
                <DesktopStatCard
                  label="当前世界主人"
                  value={username ?? "世界主人"}
                />
                <DesktopStatCard
                  label="签名"
                  value={signature?.trim() || "暂无签名"}
                />
                <DesktopStatCard
                  label="配置状态"
                  value={
                    ownerQuery.data?.hasCustomApiKey
                      ? "已配置专属 API Key"
                      : "使用实例级 Provider"
                  }
                />
                {activeTab === "legal" ? (
                  <DesktopStatCard
                    label="当前文档"
                    value={
                      activeLegalTab === "privacy"
                        ? "隐私政策"
                        : activeLegalTab === "terms"
                          ? "用户协议"
                          : "社区规范"
                    }
                  />
                ) : null}
              </div>
            </div>
          </div>
        }
      >
        <div className="p-5">{content}</div>
      </DesktopUtilityShell>
    );
  }

  return (
    <AppPage className="space-y-4">
      <TabPageTopBar
        title="设置"
        titleAlign="center"
        leftActions={
          <Button
            onClick={() => navigate({ to: backTo })}
            variant="ghost"
            size="icon"
            className="border border-white/70 bg-white/82 text-[color:var(--text-primary)] shadow-[var(--shadow-soft)] hover:bg-white"
          >
            <ArrowLeft size={18} />
          </Button>
        }
      />
      {content}
    </AppPage>
  );
}

function DesktopStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-black/6 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
      <div className="text-xs text-[color:var(--text-muted)]">{label}</div>
      <div className="mt-2 text-sm font-medium text-[color:var(--text-primary)]">
        {value}
      </div>
    </div>
  );
}
