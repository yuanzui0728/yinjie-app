import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  clearUserApiKey,
  deleteUser,
  getBlockedCharacters,
  getCurrentUser,
  listCharacters,
  listModerationReports,
  logoutCurrentSession,
  setUserApiKey,
  unblockCharacter,
  updateUser,
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
import { AvatarChip } from "../components/avatar-chip";
import { DesktopRuntimePanel } from "../features/profile/desktop-runtime-panel";
import { useDesktopLayout } from "../features/shell/use-desktop-layout";
import { disconnectChatSocket } from "../lib/socket";
import { resolveAppRuntimeContext } from "../runtime/platform";
import { useAppRuntimeConfig } from "../runtime/runtime-config-store";
import { useSessionStore } from "../store/session-store";

export function ProfilePage() {
  const isDesktopLayout = useDesktopLayout();
  const navigate = useNavigate();
  const token = useSessionStore((state) => state.token);
  const userId = useSessionStore((state) => state.userId);
  const username = useSessionStore((state) => state.username);
  const avatar = useSessionStore((state) => state.avatar);
  const signature = useSessionStore((state) => state.signature);
  const updateProfile = useSessionStore((state) => state.updateProfile);
  const logout = useSessionStore((state) => state.logout);
  const queryClient = useQueryClient();
  const runtimeConfig = useAppRuntimeConfig();
  const runtimeContext = resolveAppRuntimeContext(runtimeConfig.appPlatform);
  const baseUrl = runtimeConfig.apiBaseUrl ?? "default";

  const [draftName, setDraftName] = useState(username ?? "");
  const [draftSignature, setDraftSignature] = useState(signature);
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [apiBaseDraft, setApiBaseDraft] = useState("");
  const canSaveProfile = draftName.trim().length > 0;
  const softListCardClassName =
    "rounded-2xl border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.03))] px-4 py-3 shadow-[var(--shadow-soft)]";

  useEffect(() => {
    setDraftName(username ?? "");
  }, [username]);

  useEffect(() => {
    setDraftSignature(signature);
  }, [signature]);

  const currentUserQuery = useQuery({
    queryKey: ["current-user", baseUrl, userId, token],
    queryFn: () => getCurrentUser(),
    enabled: Boolean(userId && token),
  });

  useEffect(() => {
    if (!currentUserQuery.data) {
      return;
    }

    updateProfile({
      username: currentUserQuery.data.username,
      avatar: currentUserQuery.data.avatar,
      signature: currentUserQuery.data.signature,
    });
    setApiBaseDraft(currentUserQuery.data.customApiBase ?? "");
  }, [currentUserQuery.data, updateProfile]);

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (!userId) {
        return;
      }

      await updateUser(userId, {
        username: draftName.trim(),
        signature: draftSignature.trim(),
      });
      updateProfile({
        username: draftName.trim(),
        signature: draftSignature.trim(),
      });
    },
  });

  const saveApiKeyMutation = useMutation({
    mutationFn: async () => {
      if (!userId) {
        throw new Error("missing user session");
      }

      await setUserApiKey(userId, {
        apiKey: apiKeyDraft.trim(),
        apiBase: apiBaseDraft.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setApiKeyDraft("");
      await currentUserQuery.refetch();
    },
  });

  const clearApiKeyMutation = useMutation({
    mutationFn: async () => {
      if (!userId) {
        throw new Error("missing user session");
      }

      await clearUserApiKey(userId);
    },
    onSuccess: async () => {
      setApiKeyDraft("");
      setApiBaseDraft("");
      await currentUserQuery.refetch();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await logoutCurrentSession();
    },
    onSettled: () => {
      disconnectChatSocket();
      logout();
      void navigate({ to: "/onboarding", replace: true });
    },
  });

  const blockedCharactersQuery = useQuery({
    queryKey: ["blocked-characters", baseUrl, userId, token],
    queryFn: () => getBlockedCharacters(userId!),
    enabled: Boolean(userId && token),
  });

  const charactersQuery = useQuery({
    queryKey: ["profile-characters", baseUrl],
    queryFn: () => listCharacters(),
  });

  const reportsQuery = useQuery({
    queryKey: ["moderation-reports", baseUrl, userId, token],
    queryFn: () => listModerationReports(userId!),
    enabled: Boolean(userId && token),
  });

  const unblockMutation = useMutation({
    mutationFn: async (characterId: string) => {
      if (!userId) {
        throw new Error("missing user session");
      }

      await unblockCharacter({ userId, characterId });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["blocked-characters", baseUrl, userId, token] }),
        queryClient.invalidateQueries({ queryKey: ["app-blocked-characters", baseUrl, userId] }),
        queryClient.invalidateQueries({ queryKey: ["app-chat-blocked-characters", baseUrl, userId] }),
        queryClient.invalidateQueries({ queryKey: ["app-discover-blocked-characters", baseUrl, userId] }),
        queryClient.invalidateQueries({ queryKey: ["app-moments-blocked-characters", baseUrl, userId] }),
        queryClient.invalidateQueries({ queryKey: ["app-characters", baseUrl, userId] }),
        queryClient.invalidateQueries({ queryKey: ["app-conversations", baseUrl, userId] }),
        queryClient.invalidateQueries({ queryKey: ["app-friends", baseUrl, userId] }),
        queryClient.invalidateQueries({ queryKey: ["app-friends-quick-start", baseUrl, userId] }),
        queryClient.invalidateQueries({ queryKey: ["app-group-friends", baseUrl, userId] }),
      ]);
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      if (!userId) {
        throw new Error("missing user session");
      }

      await deleteUser(userId);
    },
    onSuccess: () => {
      disconnectChatSocket();
      logout();
      void navigate({ to: "/onboarding", replace: true });
    },
  });

  const accountMutationBusy =
    logoutMutation.isPending || deleteAccountMutation.isPending || unblockMutation.isPending;
  const aiSettingsBusy = saveApiKeyMutation.isPending || clearApiKeyMutation.isPending;

  useEffect(() => {
    setDraftName(username ?? "");
    setDraftSignature(signature);
    saveProfileMutation.reset();
    saveApiKeyMutation.reset();
    clearApiKeyMutation.reset();
    unblockMutation.reset();
    deleteAccountMutation.reset();
  }, [baseUrl, signature, username]);

  function handleDeleteAccount() {
    if (!userId) {
      return;
    }

    const confirmed = window.confirm(
      "Deleting this account will immediately sign out the current device. Continue?",
    );
    if (!confirmed) {
      return;
    }

    deleteAccountMutation.mutate();
  }

  if (isDesktopLayout) {
    return (
      <AppPage className="space-y-5 px-6 py-6">
        <AppHeader
          eyebrow="My Profile"
          title={username ?? "Guest"}
          description="桌面端把资料、AI 设置、安全记录和运行时信息拆成多面板，不再压成一条长页。"
        />

        <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-5">
            <AppSection className="space-y-5 p-6">
              <div className="flex items-center gap-4">
                <AvatarChip name={draftName} src={avatar} size="lg" />
                <div>
                  <div className="text-xl font-semibold text-white">{username ?? "Guest"}</div>
                  <div className="mt-1 text-sm text-[color:var(--text-secondary)]">
                    Edit your identity and personal AI settings here.
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <TextField value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="Display name" />
                <TextAreaField
                  value={draftSignature}
                  onChange={(event) => setDraftSignature(event.target.value)}
                  className="min-h-24 resize-none"
                  placeholder="Signature"
                />
              </div>
              <Button onClick={() => saveProfileMutation.mutate()} disabled={!canSaveProfile || saveProfileMutation.isPending} variant="primary">
                {saveProfileMutation.isPending ? "Saving..." : "Save profile"}
              </Button>
              {saveProfileMutation.isError && saveProfileMutation.error instanceof Error ? <ErrorBlock message={saveProfileMutation.error.message} /> : null}
              {saveProfileMutation.isSuccess ? <InlineNotice tone="success">Profile updated.</InlineNotice> : null}
            </AppSection>

            <AppSection className="space-y-4 p-5">
              <div>
                <div className="text-sm font-medium text-white">My AI Settings</div>
                <div className="mt-1 text-xs leading-6 text-[color:var(--text-muted)]">
                  By default, your requests use the instance provider. You can optionally override only your own inference requests with a personal API Key.
                </div>
              </div>
              <div className="space-y-3">
                <TextField
                  type="password"
                  value={apiKeyDraft}
                  onChange={(event) => setApiKeyDraft(event.target.value)}
                  placeholder={
                    currentUserQuery.data?.hasCustomApiKey
                      ? "A personal API Key is already saved. Enter a new one to replace it."
                      : "Enter your own API Key"
                  }
                />
                <TextField
                  value={apiBaseDraft}
                  onChange={(event) => setApiBaseDraft(event.target.value)}
                  placeholder="Optional compatible base URL, e.g. https://api.openai.com/v1"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => saveApiKeyMutation.mutate()} disabled={aiSettingsBusy || !apiKeyDraft.trim()} variant="primary">
                  {saveApiKeyMutation.isPending ? "Saving..." : "Save personal API Key"}
                </Button>
                <Button onClick={() => clearApiKeyMutation.mutate()} disabled={aiSettingsBusy || !currentUserQuery.data?.hasCustomApiKey} variant="secondary">
                  {clearApiKeyMutation.isPending ? "Clearing..." : "Clear personal API Key"}
                </Button>
              </div>
              {currentUserQuery.isLoading ? <LoadingBlock className="px-0 py-0 text-left" label="Loading AI settings..." /> : null}
              {currentUserQuery.isError && currentUserQuery.error instanceof Error ? <ErrorBlock message={currentUserQuery.error.message} /> : null}
              {saveApiKeyMutation.isError && saveApiKeyMutation.error instanceof Error ? <ErrorBlock message={saveApiKeyMutation.error.message} /> : null}
              {clearApiKeyMutation.isError && clearApiKeyMutation.error instanceof Error ? <ErrorBlock message={clearApiKeyMutation.error.message} /> : null}
              {saveApiKeyMutation.isSuccess ? <InlineNotice tone="success">Personal API Key saved. Future inference requests from this account will use it.</InlineNotice> : null}
              {clearApiKeyMutation.isSuccess ? <InlineNotice tone="success">Personal API Key cleared. This account now falls back to the instance provider.</InlineNotice> : null}
              {currentUserQuery.data ? (
                <InlineNotice tone={currentUserQuery.data.hasCustomApiKey ? "success" : "muted"}>
                  {currentUserQuery.data.hasCustomApiKey
                    ? `A personal API Key is active for this account${
                        currentUserQuery.data.customApiBase ? ` with base URL ${currentUserQuery.data.customApiBase}` : ""
                      }.`
                    : "No personal API Key is configured. This account is using the instance provider."}
                </InlineNotice>
              ) : null}
            </AppSection>
          </div>

          <div className="space-y-5">
            <AppSection className="space-y-4 p-5">
              <div>
                <div className="text-sm font-medium text-white">Safety</div>
                <div className="mt-1 text-xs leading-6 text-[color:var(--text-muted)]">
                  Your blocked characters and moderation records are listed here.
                </div>
              </div>
              <div className="space-y-3">
                {(blockedCharactersQuery.data ?? []).map((item) => {
                  const character = charactersQuery.data?.find((entry) => entry.id === item.characterId);

                  return (
                    <div key={item.id} className={softListCardClassName}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm text-white">{character?.name ?? item.characterId}</div>
                          <div className="mt-2 text-xs leading-6 text-[color:var(--text-secondary)]">Blocked at: {formatSessionTime(item.createdAt)}</div>
                          <div className="text-xs leading-6 text-[color:var(--text-muted)]">Reason: {item.reason?.trim() || "Not provided"}</div>
                        </div>
                        <Button onClick={() => unblockMutation.mutate(item.characterId)} disabled={accountMutationBusy} variant="secondary" size="sm">
                          {unblockMutation.isPending && unblockMutation.variables === item.characterId ? "Unblocking..." : "Unblock"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {blockedCharactersQuery.isLoading ? <LoadingBlock className="px-4 py-3 text-left" label="Loading blocked list..." /> : null}
                {blockedCharactersQuery.isError && blockedCharactersQuery.error instanceof Error ? <ErrorBlock message={blockedCharactersQuery.error.message} /> : null}
                {unblockMutation.isError && unblockMutation.error instanceof Error ? <ErrorBlock message={unblockMutation.error.message} /> : null}
                {!blockedCharactersQuery.isLoading && !blockedCharactersQuery.isError && !blockedCharactersQuery.data?.length ? <InlineNotice tone="muted">No blocked characters.</InlineNotice> : null}
              </div>

              <div className="space-y-3 border-t border-[color:var(--border-faint)] pt-4">
                {(reportsQuery.data ?? []).slice(0, 6).map((report) => (
                  <div key={report.id} className={softListCardClassName}>
                    <div className="text-sm text-white">
                      {report.targetType} - {report.reason}
                    </div>
                    <div className="mt-2 text-xs leading-6 text-[color:var(--text-secondary)]">Submitted at: {formatSessionTime(report.createdAt)}</div>
                    <div className="text-xs leading-6 text-[color:var(--text-muted)]">Status: {report.status}</div>
                  </div>
                ))}
                {reportsQuery.isLoading ? <LoadingBlock className="px-4 py-3 text-left" label="Loading moderation reports..." /> : null}
                {reportsQuery.isError && reportsQuery.error instanceof Error ? <ErrorBlock message={reportsQuery.error.message} /> : null}
                {!reportsQuery.isLoading && !reportsQuery.isError && !reportsQuery.data?.length ? <InlineNotice tone="muted">No moderation reports yet.</InlineNotice> : null}
              </div>
            </AppSection>

            <AppSection className="space-y-4 p-5">
              <div>
                <div className="text-sm font-medium text-white">Shortcuts</div>
                <div className="mt-1 text-xs leading-6 text-[color:var(--text-muted)]">
                  Common pages and account actions are grouped here.
                </div>
              </div>
              <div className="space-y-3 text-sm text-[color:var(--text-secondary)]">
                <Link to="/friend-requests" className="block">
                  <Button variant="secondary" size="lg" className="w-full justify-start rounded-2xl">Friend requests</Button>
                </Link>
                <Link to="/legal/privacy" className="block">
                  <Button variant="secondary" size="lg" className="w-full justify-start rounded-2xl">Privacy policy</Button>
                </Link>
                <Link to="/legal/terms" className="block">
                  <Button variant="secondary" size="lg" className="w-full justify-start rounded-2xl">Terms of service</Button>
                </Link>
                <Link to="/legal/community" className="block">
                  <Button variant="secondary" size="lg" className="w-full justify-start rounded-2xl">Community rules</Button>
                </Link>
                <Button onClick={() => logoutMutation.mutate()} disabled={accountMutationBusy} variant="danger" size="lg" className="w-full justify-start rounded-2xl">
                  {logoutMutation.isPending ? "Signing out..." : "Sign out"}
                </Button>
                <Button onClick={handleDeleteAccount} disabled={accountMutationBusy} variant="danger" size="lg" className="w-full justify-start rounded-2xl">
                  {deleteAccountMutation.isPending ? "Deleting account..." : "Delete account"}
                </Button>
              </div>
              {deleteAccountMutation.isError && deleteAccountMutation.error instanceof Error ? <ErrorBlock className="mt-3" message={deleteAccountMutation.error.message} /> : null}
              <InlineNotice className="mt-3" tone="warning">
                Deleting the account will immediately remove the current login session. Conversation cleanup is still being tightened in follow-up work.
              </InlineNotice>
            </AppSection>

            {runtimeContext.hostRole === "host" ? (
              <AppSection className="space-y-4 p-5">
                <DesktopRuntimePanel />
              </AppSection>
            ) : null}
          </div>
        </div>
      </AppPage>
    );
  }

  return (
    <AppPage>
      <AppHeader
        eyebrow="My Profile"
        title={username ?? "Guest"}
        description="This world belongs only to you."
      />

      <AppSection className="space-y-5 p-6">
        <div className="flex items-center gap-4">
          <AvatarChip name={draftName} src={avatar} size="lg" />
          <div>
            <div className="text-xl font-semibold text-white">{username ?? "Guest"}</div>
            <div className="mt-1 text-sm text-[color:var(--text-secondary)]">
              Edit your identity and personal AI settings here.
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <TextField
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            placeholder="Display name"
          />
          <TextAreaField
            value={draftSignature}
            onChange={(event) => setDraftSignature(event.target.value)}
            className="min-h-24 resize-none"
            placeholder="Signature"
          />
        </div>

        <Button
          onClick={() => saveProfileMutation.mutate()}
          disabled={!canSaveProfile || saveProfileMutation.isPending}
          variant="primary"
        >
          {saveProfileMutation.isPending ? "Saving..." : "Save profile"}
        </Button>
        {saveProfileMutation.isError && saveProfileMutation.error instanceof Error ? (
          <ErrorBlock message={saveProfileMutation.error.message} />
        ) : null}
        {saveProfileMutation.isSuccess ? (
          <InlineNotice tone="success">Profile updated.</InlineNotice>
        ) : null}
      </AppSection>

      <AppSection className="space-y-4 p-5">
        <div>
          <div className="text-sm font-medium text-white">My AI Settings</div>
          <div className="mt-1 text-xs leading-6 text-[color:var(--text-muted)]">
            By default, your requests use the instance provider. You can optionally override only your
            own inference requests with a personal API Key.
          </div>
        </div>

        <div className="space-y-3">
          <TextField
            type="password"
            value={apiKeyDraft}
            onChange={(event) => setApiKeyDraft(event.target.value)}
            placeholder={
              currentUserQuery.data?.hasCustomApiKey
                ? "A personal API Key is already saved. Enter a new one to replace it."
                : "Enter your own API Key"
            }
          />
          <TextField
            value={apiBaseDraft}
            onChange={(event) => setApiBaseDraft(event.target.value)}
            placeholder="Optional compatible base URL, e.g. https://api.openai.com/v1"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => saveApiKeyMutation.mutate()}
            disabled={aiSettingsBusy || !apiKeyDraft.trim()}
            variant="primary"
          >
            {saveApiKeyMutation.isPending ? "Saving..." : "Save personal API Key"}
          </Button>
          <Button
            onClick={() => clearApiKeyMutation.mutate()}
            disabled={aiSettingsBusy || !currentUserQuery.data?.hasCustomApiKey}
            variant="secondary"
          >
            {clearApiKeyMutation.isPending ? "Clearing..." : "Clear personal API Key"}
          </Button>
        </div>

        {currentUserQuery.isLoading ? (
          <LoadingBlock className="px-0 py-0 text-left" label="Loading AI settings..." />
        ) : null}
        {currentUserQuery.isError && currentUserQuery.error instanceof Error ? (
          <ErrorBlock message={currentUserQuery.error.message} />
        ) : null}
        {saveApiKeyMutation.isError && saveApiKeyMutation.error instanceof Error ? (
          <ErrorBlock message={saveApiKeyMutation.error.message} />
        ) : null}
        {clearApiKeyMutation.isError && clearApiKeyMutation.error instanceof Error ? (
          <ErrorBlock message={clearApiKeyMutation.error.message} />
        ) : null}
        {saveApiKeyMutation.isSuccess ? (
          <InlineNotice tone="success">
            Personal API Key saved. Future inference requests from this account will use it.
          </InlineNotice>
        ) : null}
        {clearApiKeyMutation.isSuccess ? (
          <InlineNotice tone="success">
            Personal API Key cleared. This account now falls back to the instance provider.
          </InlineNotice>
        ) : null}
        {currentUserQuery.data ? (
          <InlineNotice tone={currentUserQuery.data.hasCustomApiKey ? "success" : "muted"}>
            {currentUserQuery.data.hasCustomApiKey
              ? `A personal API Key is active for this account${
                  currentUserQuery.data.customApiBase
                    ? ` with base URL ${currentUserQuery.data.customApiBase}`
                    : ""
                }.`
              : "No personal API Key is configured. This account is using the instance provider."}
          </InlineNotice>
        ) : null}
      </AppSection>

      <AppSection className="space-y-4 p-5">
        <div>
          <div className="text-sm font-medium text-white">Safety</div>
          <div className="mt-1 text-xs leading-6 text-[color:var(--text-muted)]">
            Your blocked characters and moderation records are listed here.
          </div>
        </div>
        <div className="space-y-3">
          {(blockedCharactersQuery.data ?? []).map((item) => {
            const character = charactersQuery.data?.find((entry) => entry.id === item.characterId);

            return (
              <div key={item.id} className={softListCardClassName}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-white">{character?.name ?? item.characterId}</div>
                    <div className="mt-2 text-xs leading-6 text-[color:var(--text-secondary)]">
                      Blocked at: {formatSessionTime(item.createdAt)}
                    </div>
                    <div className="text-xs leading-6 text-[color:var(--text-muted)]">
                      Reason: {item.reason?.trim() || "Not provided"}
                    </div>
                  </div>
                  <Button
                    onClick={() => unblockMutation.mutate(item.characterId)}
                    disabled={accountMutationBusy}
                    variant="secondary"
                    size="sm"
                  >
                    {unblockMutation.isPending && unblockMutation.variables === item.characterId
                      ? "Unblocking..."
                      : "Unblock"}
                  </Button>
                </div>
              </div>
            );
          })}
          {blockedCharactersQuery.isLoading ? (
            <LoadingBlock className="px-4 py-3 text-left" label="Loading blocked list..." />
          ) : null}
          {blockedCharactersQuery.isError && blockedCharactersQuery.error instanceof Error ? (
            <ErrorBlock message={blockedCharactersQuery.error.message} />
          ) : null}
          {unblockMutation.isError && unblockMutation.error instanceof Error ? (
            <ErrorBlock message={unblockMutation.error.message} />
          ) : null}
          {!blockedCharactersQuery.isLoading &&
          !blockedCharactersQuery.isError &&
          !blockedCharactersQuery.data?.length ? (
            <InlineNotice tone="muted">No blocked characters.</InlineNotice>
          ) : null}
        </div>

        <div className="space-y-3 border-t border-[color:var(--border-faint)] pt-4">
          {(reportsQuery.data ?? []).slice(0, 6).map((report) => (
            <div key={report.id} className={softListCardClassName}>
              <div className="text-sm text-white">
                {report.targetType} - {report.reason}
              </div>
              <div className="mt-2 text-xs leading-6 text-[color:var(--text-secondary)]">
                Submitted at: {formatSessionTime(report.createdAt)}
              </div>
              <div className="text-xs leading-6 text-[color:var(--text-muted)]">
                Status: {report.status}
              </div>
            </div>
          ))}
          {reportsQuery.isLoading ? (
            <LoadingBlock className="px-4 py-3 text-left" label="Loading moderation reports..." />
          ) : null}
          {reportsQuery.isError && reportsQuery.error instanceof Error ? (
            <ErrorBlock message={reportsQuery.error.message} />
          ) : null}
          {!reportsQuery.isLoading && !reportsQuery.isError && !reportsQuery.data?.length ? (
            <InlineNotice tone="muted">No moderation reports yet.</InlineNotice>
          ) : null}
        </div>
      </AppSection>

      <AppSection className="space-y-4 p-5">
        <div>
          <div className="text-sm font-medium text-white">Shortcuts</div>
          <div className="mt-1 text-xs leading-6 text-[color:var(--text-muted)]">
            Common pages and account actions are grouped here.
          </div>
        </div>
        <div className="space-y-3 text-sm text-[color:var(--text-secondary)]">
          <Link to="/friend-requests" className="block">
            <Button variant="secondary" size="lg" className="w-full justify-start rounded-2xl">
              Friend requests
            </Button>
          </Link>
          <Link to="/legal/privacy" className="block">
            <Button variant="secondary" size="lg" className="w-full justify-start rounded-2xl">
              Privacy policy
            </Button>
          </Link>
          <Link to="/legal/terms" className="block">
            <Button variant="secondary" size="lg" className="w-full justify-start rounded-2xl">
              Terms of service
            </Button>
          </Link>
          <Link to="/legal/community" className="block">
            <Button variant="secondary" size="lg" className="w-full justify-start rounded-2xl">
              Community rules
            </Button>
          </Link>
          <Button
            onClick={() => logoutMutation.mutate()}
            disabled={accountMutationBusy}
            variant="danger"
            size="lg"
            className="w-full justify-start rounded-2xl"
          >
            {logoutMutation.isPending ? "Signing out..." : "Sign out"}
          </Button>
          <Button
            onClick={handleDeleteAccount}
            disabled={accountMutationBusy}
            variant="danger"
            size="lg"
            className="w-full justify-start rounded-2xl"
          >
            {deleteAccountMutation.isPending ? "Deleting account..." : "Delete account"}
          </Button>
        </div>
        {deleteAccountMutation.isError && deleteAccountMutation.error instanceof Error ? (
          <ErrorBlock className="mt-3" message={deleteAccountMutation.error.message} />
        ) : null}
        <InlineNotice className="mt-3" tone="warning">
          Deleting the account will immediately remove the current login session. Conversation cleanup is
          still being tightened in follow-up work.
        </InlineNotice>
      </AppSection>

      {runtimeContext.hostRole === "host" ? (
        <AppSection className="space-y-4 p-5">
          <DesktopRuntimePanel />
        </AppSection>
      ) : null}
    </AppPage>
  );
}

function formatSessionTime(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "Unknown";
  }

  return new Date(parsed).toLocaleString("zh-CN", {
    hour12: false,
  });
}
